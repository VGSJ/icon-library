#!/usr/bin/env node
/**
 * Detects what changed in Figma vs current icon library
 * Outputs a report for the sync workflow
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// Load current metadata
const metadataFile = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../docs/metadata/icons.json'), 'utf-8')
);
const currentMetadata = metadataFile.icons || metadataFile;

// Create a map of current icons
const currentIcons = new Map(currentMetadata.map(icon => [icon.name, icon]));

const changes = {
  added: [],
  removed: [],
  metadataChanged: [],
  newCategories: []
};

async function detectChanges() {
  try {
    const fileKey = env("FIGMA_FILE_KEY");
    
    // Fetch Figma component sets with metadata
    const compsetsUrl = `https://api.figma.com/v1/files/${fileKey}/component_sets`;
    const compsetsData = await figmaFetch(compsetsUrl);
    const componentSets = compsetsData.meta?.component_sets || [];
    
    // Build map of Figma icons with their metadata
    const figmaIcons = new Map();
    
    for (const comp of componentSets) {
      if (!comp.name?.startsWith("icon-")) continue;
      
      let baseName = comp.name.substring(5);
      if (baseName.includes(",")) baseName = baseName.split(",")[0].trim();
      
      const desc = comp.description || "";
      const lines = desc.split("\n");
      
      let category = { id: "uncategorized", label: "Uncategorized" };
      const tags = new Set();
      const aliases = new Set();
      
      for (const line of lines) {
        if (line.startsWith("category:")) {
          const val = line.substring(9).trim();
          const id = val.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "-").replace(/-+/g, "-");
          category = { id, label: val.toLowerCase() };
        } else if (line.startsWith("tags:")) {
          line.substring(5).trim().split(",").map(t => t.trim()).filter(t => t).forEach(t => tags.add(t));
        } else if (line.startsWith("aliases:")) {
          line.substring(8).trim().split(",").map(a => a.trim()).filter(a => a).forEach(a => aliases.add(a));
        }
      }
      
      figmaIcons.set(baseName, {
        name: baseName,
        category,
        tags: Array.from(tags),
        aliases: Array.from(aliases)
      });
    }
    
    // Compare: find added and removed
    for (const [name, figmaIcon] of figmaIcons) {
      if (!currentIcons.has(name)) {
        changes.added.push(name);
      } else {
        // Check if metadata changed
        const current = currentIcons.get(name);
        const metadataChanged = 
          JSON.stringify(current.category) !== JSON.stringify(figmaIcon.category) ||
          JSON.stringify(current.tags.sort()) !== JSON.stringify(figmaIcon.tags.sort()) ||
          JSON.stringify(current.aliases.sort()) !== JSON.stringify(figmaIcon.aliases.sort());
        
        if (metadataChanged) {
          changes.metadataChanged.push({
            name,
            current: { category: current.category, tags: current.tags, aliases: current.aliases },
            figma: figmaIcon
          });
        }
      }
    }
    
    // Check for removed icons
    for (const [name] of currentIcons) {
      if (!figmaIcons.has(name)) {
        changes.removed.push(name);
      }
    }
    
    // Detect new categories
    const currentCategories = new Set(currentMetadata.map(i => i.category?.id).filter(Boolean));
    const figmaCategories = new Map();
    
    for (const [_, figmaIcon] of figmaIcons) {
      if (!currentCategories.has(figmaIcon.category.id)) {
        if (!figmaCategories.has(figmaIcon.category.id)) {
          figmaCategories.set(figmaIcon.category.id, { name: figmaIcon.category.label, count: 0 });
        }
        figmaCategories.get(figmaIcon.category.id).count++;
      }
    }
    
    for (const [_, cat] of figmaCategories) {
      changes.newCategories.push({ name: cat.name, iconCount: cat.count });
    }
    
  } catch (e) {
    console.error("Error fetching Figma data:", e.message);
    console.log("(Continuing with placeholder data)");
  }
}

await detectChanges();

console.log('# Icon Sync Detection Report\n');
console.log(`**Scan Time:** ${new Date().toISOString()}\n`);
console.log(`**Current Icons in Library:** ${currentIcons.size}\n`);

// Output summary
console.log('## Summary\n');
console.log(`- ✅ Added: ${changes.added.length}\n`);
console.log(`- ❌ Removed: ${changes.removed.length}\n`);
console.log(`- 📝 Metadata Changed: ${changes.metadataChanged.length}\n`);
console.log(`- ⚠️ New Categories: ${changes.newCategories.length}\n`);

if (changes.newCategories.length > 0) {
  console.log('## ⚠️ New Categories (Manual Review Required)\n');
  changes.newCategories.forEach(cat => {
    console.log(`- **${cat.name}** (${cat.iconCount} icons)\n`);
  });
  console.log('new_categories_found\n');
}

if (changes.added.length > 0) {
  console.log('## Added Icons\n');
  changes.added.slice(0, 20).forEach(icon => {
    console.log(`- ${icon}\n`);
  });
  if (changes.added.length > 20) {
    console.log(`- ... and ${changes.added.length - 20} more\n`);
  }
}

if (changes.removed.length > 0) {
  console.log('## Removed Icons\n');
  changes.removed.slice(0, 20).forEach(icon => {
    console.log(`- ${icon}\n`);
  });
  if (changes.removed.length > 20) {
    console.log(`- ... and ${changes.removed.length - 20} more\n`);
  }
}

if (changes.metadataChanged.length > 0) {
  console.log('## Metadata Changed\n');
  changes.metadataChanged.slice(0, 20).forEach(item => {
    console.log(`- **${item.name}**\n`);
    if (JSON.stringify(item.current.category) !== JSON.stringify(item.figma.category)) {
      console.log(`  - Category: ${item.current.category.label} → ${item.figma.category.label}\n`);
    }
    if (JSON.stringify(item.current.tags.sort()) !== JSON.stringify(item.figma.tags.sort())) {
      console.log(`  - Tags: ${item.current.tags.join(', ')} → ${item.figma.tags.join(', ')}\n`);
    }
    if (JSON.stringify(item.current.aliases.sort()) !== JSON.stringify(item.figma.aliases.sort())) {
      console.log(`  - Aliases: ${item.current.aliases.join(', ')} → ${item.figma.aliases.join(', ')}\n`);
    }
  });
  if (changes.metadataChanged.length > 20) {
    console.log(`- ... and ${changes.metadataChanged.length - 20} more\n`);
  }
}

console.log('\n---\n');
console.log('**Next Steps:**\n');
console.log('1. Auto-sync will remove deleted icons and add new icons\n');
if (changes.metadataChanged.length > 0) {
  console.log('2. Metadata will be refreshed from Figma\n');
  console.log('3. If new categories found, a draft PR will be created for manual review\n');
} else {
  console.log('2. If new categories found, a draft PR will be created for manual review\n');
}
