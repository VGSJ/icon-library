import "dotenv/config";
import fs from "fs/promises";
import path from "path";

console.log("RUNNING figma-sync.mjs (Direct Figma API)");

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "raw-svg");
const META_DIR = path.join(ROOT, "metadata");
const META_FILE = path.join(META_DIR, "icons.json");

const CANON_SIZES = [16, 24, 32, 40, 48];

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

function parseMetadata(description = "") {
  const meta = {
    category: { id: "uncategorized", label: "Uncategorized" },
    tags: [],
    aliases: []
  };
  
  if (!description) return meta;
  
  const lines = String(description).split(/\n|;/).map(s => s.trim()).filter(Boolean);
  
  for (const line of lines) {
    if (line.match(/^category:/i)) {
      const val = line.replace(/^category:\s*/i, "").trim();
      const slug = val.toLowerCase().replace(/\s+/g, "-").replace(/[&]/g, "");
      meta.category = { id: slug, label: val };
    } else if (line.match(/^tags:/i)) {
      const val = line.replace(/^tags:\s*/i, "").trim();
      meta.tags = val.split(/[,;]\s*/).filter(Boolean);
    } else if (line.match(/^aliases:/i)) {
      const val = line.replace(/^aliases:\s*/i, "").trim();
      meta.aliases = val.split(/[,;]\s*/).filter(Boolean);
    }
  }
  
  return meta;
}

async function downloadSvg(nodeId, filename) {
  try {
    const fileKey = env("FIGMA_FILE_KEY");
    const url = `https://api.figma.com/v1/images?ids=${nodeId}&format=svg`;
    const data = await figmaFetch(url);
    const svgUrl = data.images?.[nodeId];
    
    if (!svgUrl) return null;
    
    const res = await fetch(svgUrl);
    return await res.text();
  } catch (e) {
    console.warn(`  ⚠️ Download failed: ${filename}`);
    return null;
  }
}

async function syncFromFigma() {
  const token = env("FIGMA_TOKEN");
  const fileKey = env("FIGMA_FILE_KEY");
  
  if (!token || !fileKey) {
    throw new Error("FIGMA_TOKEN and FIGMA_FILE_KEY required");
  }
  
  try {
    console.log("📥 Fetching file content from Figma...");
    const fileUrl = `https://api.figma.com/v1/files/${fileKey}`;
    const fileData = await figmaFetch(fileUrl);
    
    // Collect all component nodes from the file tree
    const components = [];
    
    function traverseNode(node) {
      if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
        components.push(node);
      }
      if (node.children) {
        for (const child of node.children) {
          traverseNode(child);
        }
      }
    }
    
    for (const node of fileData.document.children || []) {
      traverseNode(node);
    }
    
    const iconComps = components.filter(c => c.name.startsWith("icon-"));
    console.log(`✅ Found ${iconComps.length} icon components (including variants)`);
    
    const iconMap = new Map();
    let downloaded = 0;
    let skipped = 0;
    
    console.log("📥 Downloading SVGs...");
    for (let i = 0; i < iconComps.length; i++) {
      const comp = iconComps[i];
      const progress = `[${i + 1}/${iconComps.length}]`;
      
      // Parse name: icon-name-style-size or variations
      // Matches: icon-name-fill-16, icon-name-filled-16, icon-name-outline-16px, etc
      const match = comp.name.match(/^icon-(.+?)-([a-z]+)-(\d+)(?:px)?$/i);
      if (!match) {
        skipped++;
        continue;
      }
      
      const [, iconName, styleRaw, sizeRaw] = match;
      const styleNorm = styleRaw.toLowerCase();
      let style;
      
      if (styleNorm === "fill" || styleNorm === "filled" || styleNorm === "solid") {
        style = "filled";
      } else if (styleNorm === "outline" || styleNorm === "outlined" || styleNorm === "line") {
        style = "outline";
      } else {
        skipped++;
        continue;
      }
      
      const size = parseInt(sizeRaw);
      
      if (!CANON_SIZES.includes(size)) {
        skipped++;
        continue;
      }
      
      // Track icon metadata
      if (!iconMap.has(iconName)) {
        iconMap.set(iconName, {
          name: iconName,
          styles: new Set(),
          sizes: new Set(),
          category: { id: "uncategorized", label: "Uncategorized" },
          tags: [iconName],
          aliases: []
        });
      }
      
      const icon = iconMap.get(iconName);
      icon.styles.add(style);
      icon.sizes.add(size);
      
      // Extract metadata from description
      const parsed = parseMetadata(comp.description);
      icon.category = parsed.category;
      if (parsed.tags.length) icon.tags = parsed.tags;
      if (parsed.aliases.length) icon.aliases = parsed.aliases;
      
      // Download SVG
      const svg = await downloadSvg(comp.id, comp.name);
      if (svg) {
        const targetDir = path.join(OUT_DIR, style, String(size));
        await fs.mkdir(targetDir, { recursive: true });
        
        const filename = `icon-${iconName}-${style === "filled" ? "fill" : "outline"}-${size}.svg`;
        await fs.writeFile(path.join(targetDir, filename), svg);
        downloaded++;
        
        if (i % 50 === 0) console.log(`  ${progress} Downloaded ${downloaded} SVGs...`);
      }
    }
    
    console.log(`✅ Downloaded ${downloaded} SVGs (skipped ${skipped})`);
    
    // Generate metadata
    console.log("📝 Generating metadata...");
    const iconList = Array.from(iconMap.values())
      .map(icon => ({
        name: icon.name,
        category: icon.category,
        tags: Array.from(icon.tags).filter(Boolean),
        aliases: Array.from(icon.aliases || []).filter(Boolean),
        styles: Array.from(icon.styles).sort(),
        sizes: Array.from(icon.sizes).sort((a, b) => a - b)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    await fs.mkdir(META_DIR, { recursive: true });
    await fs.writeFile(META_FILE, JSON.stringify({ icons: iconList }, null, 2));
    
    console.log(`✅ Generated metadata for ${iconList.length} icons`);
    console.log(`🎉 Sync complete! ${downloaded} icons ready for deployment`);
    
  } catch (e) {
    console.error(`❌ Error: ${e.message}`);
    process.exit(1);
  }
}

syncFromFigma();
