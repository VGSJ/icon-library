import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";

console.log("🎨 RUNNING figma-sync.mjs (Direct Figma API)");

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

async function downloadSvg(url, filePath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = await res.arrayBuffer();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, Buffer.from(buffer));
}

async function syncIconsFromFigma() {
  const fileKey = env("FIGMA_FILE_KEY");
  
  console.log("🔍 Fetching Figma file structure...");
  const fileUrl = `https://api.figma.com/v1/files/${fileKey}`;
  const fileData = await figmaFetch(fileUrl);
  
  // Find all icon COMPONENT_SET nodes and collect their children (variants)
  const variants = [];
  
  function traverse(node) {
    if (node.type === "COMPONENT_SET" && node.name?.startsWith("icon-")) {
      // Only care about children of component sets
      if (node.children && node.children.length > 0) {
        variants.push(...node.children.map(child => ({
          ...child,
          setName: node.name.substring(5) // Remove "icon-" prefix
        })));
      }
    }
    if (node.children) {
      for (const child of node.children) traverse(child);
    }
  }
  
  traverse(fileData.document);
  
  if (variants.length === 0) {
    console.log("❌ No icon component set variants found");
    return;
  }
  
  console.log(`✅ Found ${variants.length} icon component variants`);
  
  // Get export URLs in batches
  const batchSize = 50;
  let downloaded = 0;
  let failed = 0;
  
  console.log(`\n📥 Downloading SVGs in batches of ${batchSize}...`);
  
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
      
      // Download each variant in the batch
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
          
          if (downloaded % 100 === 0) {
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
}

syncIconsFromFigma().catch(e => {
  console.error("Error:", e.message);
  process.exit(1);
});
