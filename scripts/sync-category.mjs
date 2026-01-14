import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";

const ROOT = process.cwd();

function env(name) {
  return process.env[name];
}

async function figmaFetch(url) {
  const token = env("FIGMA_TOKEN");
  if (!token) throw new Error("FIGMA_TOKEN not set");
  
  const res = await fetch(url, {
    headers: { "X-Figma-Token": token }
  });
  if (!res.ok) throw new Error(`Figma API ${res.status}: ${res.statusText}`);
  return res.json();
}

async function cleanupCategory(categoryName) {
  // Before syncing, remove old SVGs for this category to ensure clean update
  // This ensures renamed/deleted icons in Figma are removed locally
  const icons = new Map();
  const RAW_SVG_DIR = path.join(ROOT, "raw-svg");
  
  try {
    // Scan current SVGs
    const styles = await fs.readdir(RAW_SVG_DIR);
    for (const style of styles) {
      const stylePath = path.join(RAW_SVG_DIR, style);
      const stat = await fs.stat(stylePath);
      if (!stat.isDirectory()) continue;
      
      const sizes = await fs.readdir(stylePath);
      for (const size of sizes) {
        const sizePath = path.join(stylePath, size);
        const sstat = await fs.stat(sizePath);
        if (!sstat.isDirectory()) continue;
        
        const files = await fs.readdir(sizePath);
        for (const file of files) {
          if (!file.endsWith(".svg")) continue;
          const match = file.match(/^icon-(.+?)-(outline|outlined|filled|fill)-(\d+)(?:px)?\.svg$/);
          if (!match) continue;
          
          const iconName = match[1];
          if (!icons.has(iconName)) icons.set(iconName, []);
          icons.get(iconName).push(path.join(stylePath, size, file));
        }
      }
    }
    
    // Fetch Figma metadata for this category
    const fileKey = env("FIGMA_FILE_KEY");
    const compsetsUrl = `https://api.figma.com/v1/files/${fileKey}/component_sets`;
    const compsetsData = await figmaFetch(compsetsUrl);
    const componentSets = compsetsData.meta?.component_sets || [];
    
    const figmaIcons = new Set();
    for (const comp of componentSets) {
      if (!comp.name?.startsWith("icon-")) continue;
      let baseName = comp.name.substring(5);
      if (baseName.includes(",")) baseName = baseName.split(",")[0].trim();
      
      // Check if this icon is in the target category
      const desc = comp.description || "";
      if (desc.toLowerCase().includes(`category: ${categoryName.toLowerCase()}`)) {
        figmaIcons.add(baseName);
      }
    }
    
    // Delete local SVGs for icons no longer in this category in Figma
    let deletedCount = 0;
    for (const [iconName, files] of icons) {
      if (!figmaIcons.has(iconName)) {
        for (const file of files) {
          try {
            await fs.unlink(file);
            deletedCount++;
          } catch (e) {
            // File might already be deleted
          }
        }
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🗑️  Cleaned up ${deletedCount} SVGs no longer in '${categoryName}' category`);
    }
  } catch (e) {
    // Cleanup is optional - don't fail if it errors
    console.log(`⚠️  Cleanup warning: ${e.message}`);
  }
}

async function downloadSvg(url, filePath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = await res.arrayBuffer();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, Buffer.from(buffer));
}

async function syncCategoryFromFigma(category) {
  const fileKey = env("FIGMA_FILE_KEY");
  
  // Clean up old SVGs for this category before syncing
  await cleanupCategory(category);
  
  console.log(`🔍 Fetching component sets for "${category}" category...`);
  
  try {
    const compsetsUrl = `https://api.figma.com/v1/files/${fileKey}/component_sets`;
    const compsetsData = await figmaFetch(compsetsUrl);
    
    const componentSets = compsetsData.meta?.component_sets || [];
    
    // Find all icons in this category
    const categoryIcons = componentSets.filter(cs => {
      if (!cs.name?.startsWith("icon-")) return false;
      const desc = cs.description || "";
      return desc.toLowerCase().includes(`category: ${category.toLowerCase()}`);
    });
    
    console.log(`✅ Found ${categoryIcons.length} icons in "${category}"`);
    
    // Get file data to find variants
    const fileUrl = `https://api.figma.com/v1/files/${fileKey}`;
    const fileData = await figmaFetch(fileUrl);
    
    const variants = [];
    
    function traverse(node) {
      if (node.type === "COMPONENT_SET") {
        // Check if this component set matches any of our category icons
        const matches = categoryIcons.find(ci => ci.name === node.name);
        if (matches && node.children && node.children.length > 0) {
          const iconName = node.name.substring(5);
          variants.push(...node.children.map(child => ({
            ...child,
            setName: iconName
          })));
        }
      }
      if (node.children) {
        for (const child of node.children) traverse(child);
      }
    }
    
    traverse(fileData.document);
    
    console.log(`📥 Found ${variants.length} variants to download`);
    
    // Download SVGs in batches
    const batchSize = 50;
    let downloaded = 0;
    let failed = 0;
    
    console.log(`\n⏳ Downloading in batches of ${batchSize}...`);
    
    for (let i = 0; i < variants.length; i += batchSize) {
      const batch = variants.slice(i, i + batchSize);
      const nodeIds = batch.map(v => v.id).join(",");
      
      try {
        const imagesUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${nodeIds}&format=svg`;
        const imagesData = await figmaFetch(imagesUrl);
        
        if (!imagesData.images) {
          console.warn(`⚠️ No images in batch ${Math.floor(i / batchSize) + 1}`);
          failed += batch.length;
          continue;
        }
        
        for (const variant of batch) {
          const url = imagesData.images[variant.id];
          if (!url) {
            failed++;
            continue;
          }
          
          try {
            // Parse variant name: "type=filled, size=16"
            const parts = variant.name.split(", ").reduce((acc, part) => {
              const [key, val] = part.split("=");
              acc[key?.trim()] = val?.trim();
              return acc;
            }, {});
            
            let style = parts.type || "outline";
            let size = parts.size || "16";
            
            // Normalize style
            if (style === "fill") style = "filled";
            if (style === "outlined") style = "outline";
            
            // Generate filename
            const filename = `icon-${variant.setName}-${style}-${size}.svg`;
            const filePath = path.join("raw-svg", style, String(size), filename);
            
            await downloadSvg(url, filePath);
            downloaded++;
            
            if (downloaded % 20 === 0) {
              console.log(`  ✅ Downloaded ${downloaded} SVGs...`);
            }
          } catch (e) {
            failed++;
          }
        }
        
        const batchNum = Math.floor(i / batchSize) + 1;
        const successful = batch.length - batch.filter(v => !imagesData.images[v.id]).length;
        console.log(`  Batch ${batchNum}: ${successful}/${batch.length} downloaded`);
        
      } catch (e) {
        console.error(`❌ Batch failed: ${e.message}`);
        failed += batch.length;
      }
    }
    
    console.log(`\n✅ Downloaded ${downloaded} SVGs`);
    if (failed > 0) console.log(`⚠️ Failed or skipped: ${failed}`);
    
    // Regenerate metadata
    console.log("\n📝 Generating metadata...");
    try {
      execSync("node generate-metadata.mjs", { cwd: process.cwd(), stdio: "inherit" });
    } catch (e) {
      console.error("❌ Metadata generation failed:", e.message);
    }
    
    console.log("\n🎉 Sync complete!");
    
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}

const category = process.argv[2] || "housekeeping";
syncCategoryFromFigma(category).catch(e => {
  console.error("Error:", e.message);
  process.exit(1);
});
