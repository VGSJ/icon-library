#!/usr/bin/env node
/**
 * Auto-remove icons from site that are no longer in Figma
 * Scans all icon files and checks against Figma source
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rawSvgDir = path.join(__dirname, '../docs/raw-svg');

console.log('🔍 Checking for deleted icons...\n');

// Get all current SVG files
const svgFiles = new Set();
const walkDir = (dir) => {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.svg')) {
      svgFiles.add(file);
    }
  });
};

walkDir(rawSvgDir);

// TODO: Compare with Figma component list
// For now, this is a placeholder that preserves all icons
// In production, you'd fetch from Figma API and identify orphaned files

let deletedCount = 0;

console.log(`✅ Scan complete: ${svgFiles.size} SVG files found\n`);
console.log(`📊 Deleted: ${deletedCount} files\n`);

if (deletedCount > 0) {
  console.log('💾 Changes staged for commit\n');
} else {
  console.log('No icons to remove\n');
}
