import "dotenv/config";
import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const RAW_SVG_DIR = path.join(ROOT, "raw-svg");
const META_DIR = path.join(ROOT, "metadata");
const META_FILE = path.join(META_DIR, "icons.json");

function env(name) {
  return process.env[name];
}

async function figmaFetch(url) {
  const token = env("FIGMA_TOKEN");
  if (!token) throw new Error("FIGMA_TOKEN not set");
  
  const res = await fetch(url, {
    headers: { "X-Figma-Token": token }
  });
  if (!res.ok) throw new Error(`Figma API: ${res.status}`);
  return res.json();
}

async function generateMetadata() {
  const icons = new Map();
  
  // Scan raw-svg directory structure
  console.log("📂 Scanning raw-svg directory...");
  
  const styles = await fs.readdir(RAW_SVG_DIR);
  
  for (const style of styles) {
    const stylePath = path.join(RAW_SVG_DIR, style);
    const styleStat = await fs.stat(stylePath);
    if (!styleStat.isDirectory()) continue;
    
    const sizes = await fs.readdir(stylePath);
    for (const size of sizes) {
      const sizePath = path.join(stylePath, size);
      const sizeStat = await fs.stat(sizePath);
      if (!sizeStat.isDirectory()) continue;
      
      const files = await fs.readdir(sizePath);
      for (const file of files) {
        if (!file.endsWith(".svg")) continue;
        
        // Parse filename: icon-{name}-{style}-{size}.svg or icon-{name}-{style}-{size}px.svg
        // Style can be: outline, outlined, filled, fill
        const match = file.match(/^icon-(.+?)-(outline|outlined|filled|fill)-(\d+)(?:px)?\.svg$/);
        if (!match) {
          console.warn(`⚠️ Unexpected filename: ${file}`);
          continue;
        }
        
        const [, iconName, fileStyle, sizeNum] = match;
        
        // Normalize style names: fill->filled, outlined->outline
        let normalizedStyle = fileStyle;
        if (normalizedStyle === 'fill') normalizedStyle = 'filled';
        if (normalizedStyle === 'outlined') normalizedStyle = 'outline';
        if (!icons.has(iconName)) {
          icons.set(iconName, {
            name: iconName,
            styles: new Set(),
            sizes: new Set(),
            category: { id: "uncategorized", label: "Uncategorized" },
            tags: new Set(),
            aliases: new Set()
          });
        }
        
        const icon = icons.get(iconName);
        icon.styles.add(normalizedStyle);
        icon.sizes.add(parseInt(sizeNum));
      }
    }
  }
  
  console.log(`✅ Found ${icons.size} unique icons from SVG files`);
  
  // Fetch metadata from Figma component_sets endpoint
  console.log("🔍 Fetching Figma metadata for categories/tags...");
  try {
    const fileKey = env("FIGMA_FILE_KEY");
    
    // Use component_sets endpoint which includes descriptions
    const compsetsUrl = `https://api.figma.com/v1/files/${fileKey}/component_sets`;
    const compsetsData = await figmaFetch(compsetsUrl);
    
    const componentSets = compsetsData.meta?.component_sets || [];
    console.log(`✅ Found ${componentSets.length} component sets with metadata`);
    
    // Merge Figma metadata into icons
    for (const comp of componentSets) {
      if (!comp.name?.startsWith("icon-")) continue;
      
      const baseName = comp.name.substring(5); // Remove "icon-" prefix
      if (!icons.has(baseName)) continue;
      
      const desc = comp.description || "";
      const lines = desc.split("\n");
      
      for (const line of lines) {
        if (line.startsWith("category:")) {
          const val = line.substring(9).trim();
          const id = val.toLowerCase().replace(/\s+/g, "-").replace(/[&]/g, "");
          icons.get(baseName).category = { id, label: val };
        } else if (line.startsWith("tags:")) {
          const tags = line.substring(5).trim().split(",").map(t => t.trim()).filter(t => t);
          if (tags.length > 0) {
            tags.forEach(t => icons.get(baseName).tags.add(t));
          }
        } else if (line.startsWith("aliases:")) {
          const aliases = line.substring(8).trim().split(",").map(a => a.trim()).filter(a => a);
          if (aliases.length > 0) {
            aliases.forEach(a => icons.get(baseName).aliases.add(a));
          }
        }
      }
    }
  } catch (e) {
    console.warn(`⚠️ Could not fetch Figma metadata: ${e.message}`);
  }
  
  // Convert to proper format
  const iconList = Array.from(icons.values())
    .map(icon => ({
      name: icon.name,
      category: icon.category,
      // Use icon name as tag for searchability if no tags are set
      tags: icon.tags.size > 0 ? Array.from(icon.tags).filter(Boolean) : [icon.name],
      aliases: Array.from(icon.aliases || []),
      styles: Array.from(icon.styles).sort(),
      sizes: Array.from(icon.sizes).sort((a, b) => a - b)
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  
  // Write metadata
  await fs.mkdir(META_DIR, { recursive: true });
  await fs.writeFile(
    META_FILE,
    JSON.stringify({ icons: iconList }, null, 2)
  );
  
  console.log(`✅ Generated metadata for ${iconList.length} icons with Figma categories`);
}

generateMetadata().catch(e => {
  console.error("Error:", e.message);
  process.exit(1);
});
