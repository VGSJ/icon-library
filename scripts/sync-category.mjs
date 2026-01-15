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
  // ONLY delete icons that belong to THIS category, not other categories
  
  const RAW_SVG_DIR = path.join(ROOT, "raw-svg");
  
  try {
    // First, read current metadata to see which icons are in this category
    const metaFile = path.join(ROOT, "metadata", "icons.json");
    let currentMetadata = { icons: [] };
    try {
      const data = await fs.readFile(metaFile, "utf8");
      currentMetadata = JSON.parse(data);
    } catch {
      // Metadata might not exist yet
    }
    
    // Get icons currently marked as belonging to this category
    const normalizedCategory = categoryName.toLowerCase().trim();
    const categoryId = normalizedCategory.replace(/\s+/g, "-").replace(/&/g, "-").replace(/-+/g, "-");
    
    const iconsInThisCategory = new Set();
    for (const icon of currentMetadata.icons || []) {
      if (icon.category?.id === categoryId) {
        iconsInThisCategory.add(icon.name);
      }
    }
    
    // Fetch Figma metadata for this category NOW
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
      if (desc.toLowerCase().includes(`category: ${normalizedCategory}`)) {
        figmaIcons.add(baseName);
      }
    }
    
    // Delete SVGs ONLY for icons that are:
    // 1. Currently in this category locally
    // 2. NO LONGER in this category in Figma
    let deletedCount = 0;
    for (const iconName of iconsInThisCategory) {
      if (!figmaIcons.has(iconName)) {
        // Icon was in this category but is now gone from Figma
        // Delete all its SVG files
        const styles = ["filled", "outline"];
        for (const style of styles) {
          const sizes = [16, 24, 32, 40, 48, 64, 72];
          for (const size of sizes) {
            const filePath = path.join(RAW_SVG_DIR, style, String(size), `icon-${iconName}-${style}-${size}.svg`);
            try {
              await fs.unlink(filePath);
              deletedCount++;
            } catch (e) {
              // File might not exist (different style, size, or naming)
            }
          }
        }
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🗑️  Cleaned up ${deletedCount} SVGs for icons removed from '${categoryName}' category`);
    }
  } catch (e) {
    // Cleanup is optional - don't fail if it errors
    console.log(`⚠️  Cleanup warning: ${e.message}`);
  }
}

async function cleanupOrphanedUncategorized() {
  // Check for uncategorized icons that don't exist in Figma and delete them
  try {
    const fileKey = env("FIGMA_FILE_KEY");
    const compsetsUrl = `https://api.figma.com/v1/files/${fileKey}/component_sets`;
    const compsetsData = await figmaFetch(compsetsUrl);
    const componentSets = compsetsData.meta?.component_sets || [];
    
    // Build set of all icons in Figma
    const figmaIcons = new Set();
    for (const comp of componentSets) {
      if (!comp.name?.startsWith("icon-")) continue;
      let baseName = comp.name.substring(5);
      if (baseName.includes(",")) baseName = baseName.split(",")[0].trim();
      figmaIcons.add(baseName);
    }
    
    // Read current metadata
    const metaFile = path.join(ROOT, "metadata", "icons.json");
    let metadata = { icons: [] };
    try {
      const data = await fs.readFile(metaFile, "utf8");
      metadata = JSON.parse(data);
    } catch {
      return; // No metadata yet
    }
    
    // Find uncategorized icons
    const uncategorizedIcons = (metadata.icons || []).filter(icon => 
      icon.category?.id === "uncategorized"
    );
    
    if (uncategorizedIcons.length === 0) {
      return; // No uncategorized icons
    }
    
    // Check each uncategorized icon against Figma
    const RAW_SVG_DIR = path.join(ROOT, "raw-svg");
    let deletedCount = 0;
    
    for (const icon of uncategorizedIcons) {
      if (!figmaIcons.has(icon.name)) {
        // Icon doesn't exist in Figma - delete it
        const styles = ["filled", "outline"];
        const sizes = [16, 24, 32, 40, 48, 64, 72];
        
        for (const style of styles) {
          for (const size of sizes) {
            const filePath = path.join(RAW_SVG_DIR, style, String(size), `icon-${icon.name}-${style}-${size}.svg`);
            try {
              await fs.unlink(filePath);
              deletedCount++;
            } catch (e) {
              // File might not exist
            }
          }
        }
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🗑️  Cleaned up ${deletedCount} SVGs for uncategorized icons not in Figma`);
    }
  } catch (e) {
    console.log(`⚠️  Orphan cleanup warning: ${e.message}`);
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
  // Normalize category name for consistent matching
  const normalizedCategory = category.toLowerCase().trim();
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
      return desc.toLowerCase().includes(`category: ${normalizedCategory}`);
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
    
    // Filter to only variants that need downloading (don't exist in site/raw-svg)
    const variantsToDownload = [];
    let skipped = 0;
    
    for (const variant of variants) {
      const parts = variant.name.split(", ").reduce((acc, part) => {
        const [key, val] = part.split("=");
        acc[key?.trim()] = val?.trim();
        return acc;
      }, {});
      
      let style = parts.type || "outline";
      let size = parts.size || "16";
      if (style === "fill") style = "filled";
      if (style === "outlined") style = "outline";
      
      const filename = `icon-${variant.setName}-${style}-${size}.svg`;
      const siteFilePath = path.join("site", "raw-svg", style, String(size), filename);
      
      try {
        await fs.stat(siteFilePath);
        skipped++;
      } catch {
        variantsToDownload.push(variant);
      }
    }
    
    if (skipped > 0) {
      console.log(`⏭️  Skipping ${skipped} existing SVGs`);
    }
    console.log(`📥 Downloading ${variantsToDownload.length} new/updated SVGs`);
    
    // Download SVGs in batches
    const batchSize = 50;
    let downloaded = 0;
    let failed = 0;
    
    if (variantsToDownload.length === 0) {
      console.log(`✅ All SVGs up-to-date`);
    } else {
      console.log(`\n⏳ Downloading in batches of ${batchSize}...`);
    }
    
    for (let i = 0; i < variantsToDownload.length; i += batchSize) {
      const batch = variantsToDownload.slice(i, i + batchSize);
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
            const siteFilePath = path.join("site", "raw-svg", style, String(size), filename);
            const rawFilePath = path.join("raw-svg", style, String(size), filename);
            
            // Skip if file already exists in site (optimization for incremental syncs)
            try {
              await fs.stat(siteFilePath);
              // File exists, skip download
              downloaded++;
              continue;
            } catch {
              // File doesn't exist, proceed with download
            }
            
            await downloadSvg(url, siteFilePath);
            await downloadSvg(url, rawFilePath);
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
    
    // Clean up any orphaned uncategorized icons
    console.log("\n🧹 Checking for orphaned uncategorized icons...");
    await cleanupOrphanedUncategorized();
    
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
