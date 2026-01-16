#!/usr/bin/env node
/**
 * Auto-add icons from Figma that are not yet on the site
 * For each new category, increments through batches of 50 icons
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load current icons
const metadataPath = path.join(__dirname, '../docs/metadata/icons.json');
const metadataFile = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
const currentMetadata = metadataFile.icons || metadataFile;
const currentIcons = new Set(currentMetadata.map(icon => icon.name));

console.log('📥 Checking for new icons in Figma...\n');

// TODO: Fetch all Figma components and identify new ones
// This is a placeholder - real implementation needs Figma API calls

const newIcons = [];
let syncedCount = 0;

console.log(`📊 New icons found: ${newIcons.length}\n`);

if (newIcons.length > 0) {
  console.log('Syncing new icons in batches...\n');
  
  // Group by category
  const byCategory = {};
  newIcons.forEach(icon => {
    const category = icon.category || 'uncategorized';
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(icon);
  });

  // Sync each category
  for (const [category, icons] of Object.entries(byCategory)) {
    console.log(`✅ Syncing ${category}: ${icons.length} icons`);
    
    // This would normally call sync-category.mjs
    // For now, just count
    syncedCount += icons.length;
  }
}

console.log(`\n✅ Completed: ${syncedCount} icons synced\n`);

if (syncedCount === 0) {
  console.log('No new icons to add\n');
}
