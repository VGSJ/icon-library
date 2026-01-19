import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const ROOT = process.cwd();
const RAW_SVG_DIR = path.join(ROOT, "docs", "raw-svg");

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

async function calculateHash(content) {
  return crypto.createHash("md5").update(content).digest("hex");
}

async function detectSVGChanges() {
  console.log("🔍 Detecting SVG content changes from Figma...\n");
  
  const fileKey = env("FIGMA_FILE_KEY");
  
  const compsetsUrl = `https://api.figma.com/v1/files/${fileKey}/component_sets`;
  const compsetsData = await figmaFetch(compsetsUrl);
  const componentSets = compsetsData.meta?.component_sets || [];
  
  console.log(`📊 Scanning ${componentSets.length} component sets...\n`);
  
  const fileUrl = `https://api.figma.com/v1/files/${fileKey}`;
  const fileData = await figmaFetch(fileUrl);
  
  const allVariants = [];
  
  function traverse(node) {
    if (node.type === "COMPONENT_SET" && node.children) {
      const setName = node.name.substring(5);
      allVariants.push(...node.children.map(child => ({
        ...child,
        setName: setName
      })));
    }
    if (node.children) {
      for (const child of node.children) traverse(child);
    }
  }
  
  traverse(fileData.document);
  
  console.log(`📥 Found ${allVariants.length} total variants\n`);
  
  let changed = 0;
  let unchanged = 0;
  const changedIcons = [];
  
  const batchSize = 50;
  
  for (let i = 0; i < allVariants.length; i += batchSize) {
    const batch = allVariants.slice(i, i + batchSize);
    const nodeIds = batch.map(v => v.id).join(",");
    
    try {
      const imagesUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${nodeIds}&format=svg`;
      const imagesData = await figmaFetch(imagesUrl);
      
      for (const variant of batch) {
        const url = imagesData.images[variant.id];
        if (!url) continue;
        
        try {
          const parts = variant.name.split(", ").reduce((acc, part) => {
            const [key, val] = part.split("=");
            acc[key?.trim().toLowerCase()] = val?.trim();
            return acc;
          }, {});
          
          let style = parts.type || "outline";
          let size = parts.size || "16";
          if (style === "fill") style = "filled";
          if (style === "outlined") style = "outline";
          
          const filename = `icon-${variant.setName}-${style}-${size}.svg`;
          const localPath = path.join(RAW_SVG_DIR, style, String(size), filename);
          
          try {
            const localContent = await fs.readFile(localPath, "utf-8");
            const localHash = await calculateHash(localContent);
            
            const res = await fetch(url);
            const remoteContent = await res.text();
            const remoteHash = await calculateHash(remoteContent);
            
            if (localHash === remoteHash) {
              unchanged++;
            } else {
              changed++;
              changedIcons.push({
                name: variant.setName,
                style,
                size,
                filename
              });
            }
          } catch (e) {
            unchanged++;
          }
        } catch (e) {
          // Skip
        }
      }
      
      const batchNum = Math.floor(i / batchSize) + 1;
      console.log(`✓ Batch ${batchNum} processed (${i + batch.length}/${allVariants.length})`);
      
    } catch (e) {
      console.error(`Error in batch: ${e.message}`);
    }
  }
  
  console.log(`\n📊 Results:`);
  console.log(`  ✅ Unchanged: ${unchanged}`);
  console.log(`  🔄 Changed: ${changed}`);
  console.log(`  📈 Change Rate: ${((changed / (changed + unchanged)) * 100).toFixed(2)}%`);
  
  if (changed > 0) {
    console.log(`\n🔄 Changed Icons:`);
    const groupedByIcon = {};
    changedIcons.forEach(icon => {
      if (!groupedByIcon[icon.name]) {
        groupedByIcon[icon.name] = [];
      }
      groupedByIcon[icon.name].push(`${icon.style}-${icon.size}`);
    });
    
    Object.entries(groupedByIcon).slice(0, 20).forEach(([name, variants]) => {
      console.log(`  - ${name}: ${variants.join(", ")}`);
    });
    
    if (Object.keys(groupedByIcon).length > 20) {
      console.log(`  ... and ${Object.keys(groupedByIcon).length - 20} more icons`);
    }
  }
}

detectSVGChanges().catch(e => {
  console.error("Error:", e.message);
  process.exit(1);
});
