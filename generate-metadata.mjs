import "dotenv/config";
import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const RAW_SVG_DIR = path.join(ROOT, "docs", "raw-svg");  // Single source of truth

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

// Heuristic categorization based on keywords in icon name and tags
function inferCategoryFromKeywords(iconName, tags = []) {
  const text = `${iconName} ${tags.join(" ")}`.toLowerCase();
  
  const categoryKeywords = {
    "wayfinding": ["map", "pin", "location", "route", "navigate", "direction", "compass", "gps"],
    "light": ["light", "lamp", "bulb", "brightness", "illumin"],
    "fire": ["fire", "flame", "burn", "extinguish", "alarm", "hydrant", "sprinkle"],
    "security": ["lock", "shield", "key", "secure", "password", "scan", "fingerprint", "face-id", "secure"],
    "communication": ["message", "chat", "call", "email", "conversation", "talk", "phone"],
    "document & statistics": ["document", "file", "chart", "graph", "stats", "report", "pdf", "spreadsheet"],
    "health & safety": ["medical", "hospital", "health", "heart", "medicine", "doctor", "clinic", "aed"],
    "housekeeping": ["clean", "broom", "trash", "trash-bin", "waste", "dust", "mop"],
    "vertical transport": ["lift", "elevator", "escalator", "stairs", "ramp", "wheelchair"],
    "arrows": ["arrow", "chevron", "direction"],
    "actions & general interface": ["check", "close", "menu", "settings", "refresh", "edit", "add", "delete", "copy", "paste"]
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => text.includes(kw))) {
      const id = category.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "-").replace(/-+/g, "-");
      return { id, label: category };
    }
  }
  
  return null;
}

async function applyCorrections(iconList) {
  const correctionsFile = path.join(ROOT, "metadata-corrections.json");
  try {
    const data = JSON.parse(await fs.readFile(correctionsFile, "utf8"));
    console.log(`🔧 Applying ${data.corrections.length} metadata corrections...`);
    
    data.corrections.forEach(correction => {
      const icon = iconList.find(i => i.name === correction.name);
      if (icon) {
        icon.category = correction.category;
        console.log(`  ✓ Fixed ${correction.name} → ${correction.category.label}`);
      }
    });
  } catch (e) {
    // Corrections file not found or invalid - that's okay
  }
  
  // Apply keyword-based heuristics for uncategorized icons
  let heuristicMatches = 0;
  iconList.forEach(icon => {
    if (icon.category.id === "uncategorized" || icon.category.label === "Uncategorized") {
      const inferredCategory = inferCategoryFromKeywords(icon.name, icon.tags);
      if (inferredCategory) {
        icon.category = inferredCategory;
        heuristicMatches++;
      }
    }
  });
  
  if (heuristicMatches > 0) {
    console.log(`🧠 Applied keyword heuristics to ${heuristicMatches} icons`);
  }
  
  return iconList;
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
    // Build a map of icon names -> sizes from component names
    const figmaSizes = new Map();
    
    let matched = 0;
    for (const comp of componentSets) {
      if (!comp.name?.startsWith("icon-")) continue;
      
      // Extract base icon name - component names can have variants info, so parse carefully
      let baseName = comp.name.substring(5); // Remove "icon-" prefix
      
      // If the name has comma-separated variants info, take just the base name
      if (baseName.includes(",")) {
        baseName = baseName.split(",")[0].trim();
      }
      
      // Extract size from component name: "emoji-neutral/16", "emoji-neutral/24", etc.
      // Format: icon-{name}/{style}/{size} or icon-{name}/{size}
      const componentName = comp.name;
      const sizeMatch = componentName.match(/\/(\d+)(?:px)?$/);
      if (sizeMatch) {
        const size = parseInt(sizeMatch[1]);
        if (!figmaSizes.has(baseName)) {
          figmaSizes.set(baseName, new Set());
        }
        figmaSizes.get(baseName).add(size);
      }
      
      // Try to find matching icon in our map
      if (!icons.has(baseName)) {
        // Try to find a close match
        const possibleMatch = Array.from(icons.keys()).find(key => {
          // Check if this SVG icon name starts with the component base name
          return key.startsWith(baseName) || baseName.startsWith(key);
        });
        if (possibleMatch) {
          baseName = possibleMatch;
        } else {
          continue;
        }
      }
      
      const desc = comp.description || "";
      const lines = desc.split("\n");
      
      let hasCategoryLine = false;
      for (const line of lines) {
        if (line.startsWith("category:")) {
          const val = line.substring(9).trim();
          const id = val.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "-").replace(/-+/g, "-");
          icons.get(baseName).category = { id, label: val.toLowerCase() };
          matched++;
          hasCategoryLine = true;
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
    
    // Merge Figma sizes into icon sizes
    for (const [iconName, figmaSizesSet] of figmaSizes) {
      if (icons.has(iconName)) {
        figmaSizesSet.forEach(size => icons.get(iconName).sizes.add(size));
      }
    }
    
    console.log(`✅ Matched ${matched} icons with Figma metadata`);
  } catch (e) {
    console.warn(`⚠️ Could not fetch Figma metadata: ${e.message}`);
  }
  
  // Convert to proper format
  // Include ALL icons that have SVG files (not just ones with Figma categories)
  let iconList = Array.from(icons.values())
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
  
  // Normalize category IDs: map "document-statistics" to "document & statistics"
  iconList = iconList.map(icon => {
    if (icon.category.id === "document-statistics") {
      return {
        ...icon,
        category: { id: "document--statistics", label: "document & statistics" }
      };
    }
    return icon;
  });
  
  // Apply corrections from metadata-corrections.json
  iconList = await applyCorrections(iconList);
  
  // Debug: show how many of each category
  const byCat = {};
  iconList.forEach(icon => {
    const cat = icon.category.label;
    byCat[cat] = (byCat[cat] || 0) + 1;
  });
  console.log(`📊 Icons by category:`);
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });
  
  // Write metadata to docs/metadata (GitHub Pages source)
  const metaDir = path.join(ROOT, "docs", "metadata");
  await fs.mkdir(metaDir, { recursive: true });
  await fs.writeFile(
    path.join(metaDir, "icons.json"),
    JSON.stringify({ icons: iconList }, null, 2)
  );
  
  console.log(`✅ Generated metadata for ${iconList.length} icons with Figma categories`);
}

generateMetadata().catch(e => {
  console.error("Error:", e.message);
  process.exit(1);
});
