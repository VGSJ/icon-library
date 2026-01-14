import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";

console.log("🎨 RUNNING figma-sync.mjs (Direct Figma API)");

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "raw-svg");

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
  
  // Find all icon component sets
  const componentSets = {};
  function traverse(node) {
    if (node.type === "COMPONENT_SET" && node.name?.startsWith("icon-")) {
      const baseName = node.name.substring(5); // Remove "icon-" prefix
      componentSets[baseName] = node;
    }
    if (node.children) {
      for (const child of node.children) traverse(child);
    }
  }
  
  traverse(fileData.document);
  
  console.log(`✅ Found ${Object.keys(componentSets).length} icon component sets`);
  
  // Get export settings for all components
  const nodeIds = Object.values(componentSets)
    .flatMap(set => (set.children || []).map(c => c.id))
    .join(",");
  
  if (!nodeIds) {
    console.log("❌ No component variants found");
    return;
  }
  
  console.log(`\n📥 Fetching export URLs for ${nodeIds.split(",").length} variants...`);
  
  // Get export URLs in batches (API limit ~100 nodes per request)
  const nodeArray = nodeIds.split(",");
  const batchSize = 100;
  const allImages = {};
  
  for (let i = 0; i < nodeArray.length; i += batchSize) {
    const batch = nodeArray.slice(i, i + batchSize).join(",");
    const exportsUrl = `https://api.figma.com/v1/files/${fileKey}/export?ids=${batch}&format=svg`;
    const exportsData = await figmaFetch(exportsUrl);
    
    if (exportsData.images) {
      Object.assign(allImages, exportsData.images);
    }
  }
  
  let downloaded = 0;
  let failed = 0;
  
  // Download each variant
  for (const [baseName, set] of Object.entries(componentSets)) {
    for (const child of (set.children || [])) {
      const nodeId = child.id;
      const url = allImages[nodeId];
      
      if (!url) {
        console.warn(`⚠️ No URL for ${baseName} variant ${child.name}`);
        failed++;
        continue;
      }
      
      try {
        // Parse variant properties from component name
        // Example: "type=outline, size=16"
        const parts = child.name.split(", ").reduce((acc, part) => {
          const [key, val] = part.split("=");
          acc[key?.trim()] = val?.trim();
          return acc;
        }, {});
        
        let style = parts.type || "outline";
        const size = parts.size || "16";
        
        // Normalize style names (fill -> filled, outlined -> outline)
        if (style === "fill") style = "filled";
        if (style === "outlined") style = "outline";
        
        // Generate filename
        // Some files use px suffix, some don't - detect from pattern
        const hasPx = ["escalator", "single-signboard", "vr-"].some(str => baseName.includes(str));
        const suffix = hasPx ? "px" : "";
        const filename = `icon-${baseName}-${style}-${size}${suffix}.svg`;
        
        const filePath = path.join("raw-svg", style, size, filename);
        
        await downloadSvg(url, filePath);
        downloaded++;
        
        if (downloaded % 50 === 0) {
          console.log(`  📦 Downloaded ${downloaded} SVGs...`);
        }
      } catch (e) {
        console.error(`❌ Failed to download ${baseName}: ${e.message}`);
        failed++;
      }
    }
  }
  
  console.log(`\n✅ Downloaded ${downloaded} SVGs`);
  if (failed > 0) {
    console.log(`⚠️ Failed: ${failed}`);
  }
  
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
