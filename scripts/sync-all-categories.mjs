#!/usr/bin/env node

/**
 * Sync all icon categories from Figma with consolidated reporting
 * This script syncs all 28 categories and provides a summary of all changes
 * Includes deduplication to avoid syncing the same icon multiple times
 */

import { execSync } from 'child_process';
import { validateEnvironment } from './utils.mjs';

const categories = [
  "heating ventilation air conditioning",
  "actions & general interface",
  "arrows",
  "power & electrical",
  "nature & landscaping",
  "building & construction",
  "system & technology",
  "document & statistics",
  "editor",
  "media & entertainment",
  "security",
  "transport",
  "furniture & things",
  "light",
  "communication",
  "layout & grid",
  "health & safety",
  "people",
  "geometry",
  "housekeeping",
  "fire",
  "brickschema relationships",
  "time & date",
  "payment & rewards",
  "wayfinding",
  "ai & vr",
  "vertical transport",
  "flags"
];

const results = {
  totalNew: 0,
  totalUpdated: 0,
  totalCurrent: 0,
  categoryResults: [],
  totalTime: 0
};

console.log(`\n🔄 Starting sync of all ${categories.length} categories...\n`);

// Validate environment before starting
try {
  validateEnvironment();
} catch (e) {
  console.error(`❌ Error: ${e.message}`);
  process.exit(1);
}

const startTime = Date.now();

for (let i = 0; i < categories.length; i++) {
  const category = categories[i];
  const progress = `[${i + 1}/${categories.length}]`;
  
  try {
    console.log(`${progress} Syncing "${category}"...`);
    
    // Run sync-category.mjs and capture output
    const output = execSync(`node scripts/sync-category.mjs "${category}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Parse change summary from output
    const newMatch = output.match(/🆕 New SVGs: (\d+)/);
    const updatedMatch = output.match(/♻️\s+Updated SVGs: (\d+)/);
    const currentMatch = output.match(/✅ Current SVGs: (\d+)/);
    
    const newCount = newMatch ? parseInt(newMatch[1]) : 0;
    const updatedCount = updatedMatch ? parseInt(updatedMatch[1]) : 0;
    const currentCount = currentMatch ? parseInt(currentMatch[1]) : 0;
    
    results.totalNew += newCount;
    results.totalUpdated += updatedCount;
    results.totalCurrent += currentCount;
    
    results.categoryResults.push({
      category,
      new: newCount,
      updated: updatedCount,
      current: currentCount
    });
    
    if (newCount > 0 || updatedCount > 0) {
      console.log(`   ✅ ${newCount} new, ${updatedCount} updated`);
    } else {
      console.log(`   ✅ All current`);
    }
    
  } catch (error) {
    console.log(`   ⚠️  Warning: Failed to sync "${category}"`);
    results.categoryResults.push({
      category,
      new: 0,
      updated: 0,
      current: 0,
      error: true
    });
  }
}

// Calculate execution time
results.totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

// Print summary
console.log(`\n${'='.repeat(60)}`);
console.log(`📊 SYNC COMPLETE - ALL CATEGORIES SUMMARY`);
console.log(`${'='.repeat(60)}\n`);

console.log(`📈 Overall Changes:`);
console.log(`   🆕 Total New SVGs: ${results.totalNew}`);
console.log(`   ♻️  Total Updated SVGs: ${results.totalUpdated}`);
console.log(`   ✅ Total Current SVGs: ${results.totalCurrent}`);

const hasChanges = results.totalNew > 0 || results.totalUpdated > 0;

if (hasChanges) {
  console.log(`\n📋 Categories with Changes:\n`);
  
  const changedCategories = results.categoryResults.filter(r => r.new > 0 || r.updated > 0);
  changedCategories.forEach(r => {
    console.log(`   ${r.category}`);
    if (r.new > 0) console.log(`     🆕 ${r.new} new`);
    if (r.updated > 0) console.log(`     ♻️  ${r.updated} updated`);
  });
} else {
  console.log(`\n✅ All SVGs are current - no changes needed`);
}

const errorCategories = results.categoryResults.filter(r => r.error);
if (errorCategories.length > 0) {
  console.log(`\n⚠️  Failed Categories (${errorCategories.length}):`);
  errorCategories.forEach(r => {
    console.log(`   • ${r.category}`);
  });
}

console.log(`\n⏱️  Execution time: ${results.totalTime}s`);
console.log(`${'='.repeat(60)}\n`);
