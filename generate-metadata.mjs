import "dotenv/config";
import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const EXPORT_DIR = path.join(ROOT, "figma-export");
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

function parseMetadata(description = "") {
  const meta = {
    category: { id: "uncategorized", label: "Uncategorized" },
    tags: [],
    aliases: []
  };
  
  if (!description) return meta;
  
  const lines = String(description).split(/\n|;/).map(s => s.trim());
  
  for (const line of lines) {
    if (line.startsWith("category:")) {
      const val = line.replace(/^category:\s*/i, "").trim();
      const slug = val.toLowerCase().replace(/\s+/g, "-").replace(/[&]/g, "");
      meta.category = { id: slug, label: val };
    } else if (line.startsWith("tags:")) {
      const val = line.replace(/^tags:\s*/i, "").trim();
      meta.tags = val.split(/,\s*/).filter(Boolean);
    } else if (line.startsWith("aliases:")) {
      const val = line.replace(/^aliases:\s*/i, "").trim();
      meta.aliases = val.split(/,\s*/).filter(Boolean);
    }
  }
  
  return meta;
}

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
        tags: [iconName],
        aliases: []
      });
    }
    
    const icon = icons.get(iconName);
    icon.styles.add(style);
    icon.sizes.add(size);
  }
  
  // Fetch metadata from Figma
  console.log("Fetching metadata from Figma...");
  try {
    const fileKey = env("FIGMA_FILE_KEY");
    const compUrl = `https://api.figma.com/v1/files/${fileKey}/components`;
    const compData = await figmaFetch(compUrl);
    const allComps = compData?.meta?.components || [];
    
    // Map component names to metadata
    for (const comp of allComps) {
      if (!comp.name.startsWith("icon-")) continue;
      
      const match = comp.name.match(/^icon-(.+?)-(fill|filled|outline|line)-(\d+)/i);
      if (!match) continue;
      
      const iconName = match[1];
      if (icons.has(iconName)) {
        const parsed = parseMetadata(comp.description);
        icons.get(iconName).category = parsed.category;
        icons.get(iconName).tags = parsed.tags.length ? parsed.tags : [iconName];
        icons.get(iconName).aliases = parsed.aliases;
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
      tags: Array.from(icon.tags).filter(Boolean),
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
