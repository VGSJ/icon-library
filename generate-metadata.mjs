import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const EXPORT_DIR = path.join(ROOT, "figma-export");
const META_DIR = path.join(ROOT, "metadata");
const META_FILE = path.join(META_DIR, "icons.json");

async function generateMetadata() {
  const files = await fs.readdir(EXPORT_DIR);
  const svgFiles = files.filter(f => f.endsWith('.svg'));
  
  const icons = new Map();
  
  // Parse all SVG files to extract icon names and available styles/sizes
  for (const file of svgFiles) {
    const match = file.match(/^icon-(.+?)-(fill|filled|outline|line)-(\d+)(?:px)?\.svg$/i);
    if (!match) continue;
    
    const [, iconName, typeRaw, sizeRaw] = match;
    const style = typeRaw === 'fill' ? 'filled' : typeRaw === 'line' ? 'outline' : typeRaw;
    const size = parseInt(sizeRaw);
    
    if (!icons.has(iconName)) {
      icons.set(iconName, {
        name: iconName,
        styles: new Set(),
        sizes: new Set(),
        category: { id: "uncategorized", label: "Uncategorized" },
        tags: [iconName]
      });
    }
    
    const icon = icons.get(iconName);
    icon.styles.add(style);
    icon.sizes.add(size);
  }
  
  // Convert to proper format
  const iconList = Array.from(icons.values())
    .map(icon => ({
      name: icon.name,
      category: icon.category,
      tags: Array.from(icon.tags),
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
  
  console.log(`✅ Generated metadata for ${iconList.length} icons`);
}

generateMetadata().catch(e => {
  console.error("Error:", e.message);
  process.exit(1);
});
