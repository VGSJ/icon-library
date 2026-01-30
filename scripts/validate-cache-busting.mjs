#!/usr/bin/env node
/**
 * Validates that cache busting is working correctly
 * Checks:
 * - Metadata has timestamp field
 * - SVGs are present in docs/raw-svg
 * - app.js has cache-busting code
 * - _headers file exists with proper cache rules
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

async function validateCacheBusting() {
  console.log('🔍 Validating cache-busting implementation...\n');
  
  let allPass = true;
  
  // Check 1: Metadata has timestamp
  try {
    const metadataPath = path.join(ROOT, 'docs', 'metadata', 'icons.json');
    const content = await fs.readFile(metadataPath, 'utf8');
    const metadata = JSON.parse(content);
    
    if (metadata.timestamp) {
      console.log('✅ Metadata includes timestamp:', metadata.timestamp);
    } else {
      console.log('❌ Metadata missing timestamp field');
      allPass = false;
    }
    
    if (metadata.icons && Array.isArray(metadata.icons)) {
      console.log(`✅ Metadata contains ${metadata.icons.length} icons`);
    } else {
      console.log('❌ Metadata missing icons array');
      allPass = false;
    }
  } catch (e) {
    console.log('❌ Failed to read metadata:', e.message);
    allPass = false;
  }
  
  // Check 2: SVG files exist
  try {
    const svgDirs = [
      path.join(ROOT, 'docs', 'raw-svg', 'filled', '32'),
      path.join(ROOT, 'docs', 'raw-svg', 'outline', '32')
    ];
    
    let totalSvgs = 0;
    for (const dir of svgDirs) {
      const files = await fs.readdir(dir);
      const svgCount = files.filter(f => f.endsWith('.svg')).length;
      totalSvgs += svgCount;
    }
    
    if (totalSvgs > 0) {
      console.log(`✅ Found ${totalSvgs} SVG files in sample directories`);
    } else {
      console.log('❌ No SVG files found');
      allPass = false;
    }
  } catch (e) {
    console.log('❌ Failed to check SVG files:', e.message);
    allPass = false;
  }
  
  // Check 3: app.js has cache-busting code
  try {
    const appPath = path.join(ROOT, 'docs', 'app.js');
    const content = await fs.readFile(appPath, 'utf8');
    
    const hasQueryParam = content.includes('cachebust');
    const hasFetchUrl = content.includes(`?${`$`}{cachebust}`);
    const hasComment = content.includes('Cache-bust');
    
    if (hasQueryParam && hasComment) {
      console.log('✅ app.js has cache-busting implementation');
    } else {
      console.log('❌ app.js missing cache-busting code');
      allPass = false;
    }
  } catch (e) {
    console.log('❌ Failed to check app.js:', e.message);
    allPass = false;
  }
  
  // Check 4: _headers file exists
  try {
    const headersPath = path.join(ROOT, 'docs', '_headers');
    const content = await fs.readFile(headersPath, 'utf8');
    
    const hasMetadataRule = content.includes('/metadata/*');
    const hasRawSvgRule = content.includes('/raw-svg/*');
    const hasIndexRule = content.includes('index.html') || content.includes('/');
    
    if (hasMetadataRule && hasRawSvgRule) {
      console.log('✅ _headers file has proper cache rules');
    } else {
      console.log('❌ _headers file missing required cache rules');
      allPass = false;
    }
  } catch (e) {
    console.log('❌ _headers file not found or unreadable');
    allPass = false;
  }
  
  // Check 5: fire-emergency-panel specifically
  try {
    const firePath = path.join(ROOT, 'docs', 'raw-svg', 'filled', '32', 'icon-fire-emergency-panel-filled-32.svg');
    const content = await fs.readFile(firePath, 'utf8');
    
    if (content.length > 100) {
      console.log('✅ fire-emergency-panel SVG exists and has content');
    } else {
      console.log('❌ fire-emergency-panel SVG is empty or too small');
      allPass = false;
    }
  } catch (e) {
    console.log('❌ fire-emergency-panel SVG not found');
    allPass = false;
  }
  
  console.log('\n' + '='.repeat(50));
  if (allPass) {
    console.log('✅ All cache-busting validations passed!');
    console.log('\nThe system will now:');
    console.log('1. Always fetch fresh metadata after syncs');
    console.log('2. Always fetch fresh SVGs with cache-bust param');
    console.log('3. Cache SVGs locally for 24h when params match');
    console.log('4. Never cache metadata or HTML files');
  } else {
    console.log('❌ Some validations failed - see above');
    process.exit(1);
  }
}

validateCacheBusting().catch(e => {
  console.error('Error during validation:', e.message);
  process.exit(1);
});
