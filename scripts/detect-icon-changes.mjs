#!/usr/bin/env node
/**
 * Detects what changed in Figma vs current icon library
 * Outputs a report for the sync workflow
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load current metadata
const metadataFile = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../docs/metadata/icons.json'), 'utf-8')
);
const currentMetadata = metadataFile.icons || metadataFile;

// Create a map of current icons
const currentIcons = new Map(currentMetadata.map(icon => [icon.name, icon]));

// TODO: Fetch Figma metadata (requires FIGMA_TOKEN)
// For now, we'll create a placeholder that the main sync scripts will populate

const changes = {
  added: [],
  removed: [],
  metadataChanged: [],
  newCategories: []
};

console.log('# Icon Sync Detection Report\n');
console.log(`**Scan Time:** ${new Date().toISOString()}\n`);
console.log(`**Current Icons in Library:** ${currentIcons.size}\n`);

// Placeholder - actual comparison happens in sync scripts
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

console.log('\n---\n');
console.log('**Next Steps:**\n');
console.log('1. Auto-sync will remove deleted icons and add new icons\n');
console.log('2. If new categories found, a draft PR will be created for manual review\n');
console.log('3. Approve PR to add new categories\n');
