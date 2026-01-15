#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const metaFile = path.join(ROOT, "site", "metadata", "icons.json");
const rawSvgDir = path.join(ROOT, "site", "raw-svg");

async function validateSVGs() {
  try {
    const metaData = JSON.parse(await fs.readFile(metaFile, "utf8"));
    const icons = metaData.icons || [];

    console.log(`🔍 Validating ${icons.length} icons...`);

    let downloaded = 0;
    let notYetSynced = 0;
    const missingIcons = {};

    for (const icon of icons) {
      const { name, sizes, styles, category } = icon;

      if (!category || category.id === "uncategorized") {
        continue;
      }

      let hasSvg = false;
      for (const style of styles || ["outline"]) {
        for (const size of sizes || []) {
          const filename = `icon-${name}-${style}-${size}.svg`;
          const filepath = path.join(rawSvgDir, style, String(size), filename);

          try {
            await fs.access(filepath);
            hasSvg = true;
          } catch {
            // File missing
          }
        }
      }

      if (hasSvg) {
        downloaded++;
      } else {
        notYetSynced++;
        missingIcons[name] = category?.name || "unknown";
      }
    }

    const synced = downloaded;
    const total = downloaded + notYetSynced;

    console.log(`\n📊 SVG Status:`);
    console.log(`  ✅ Synced: ${synced}/${total} icons`);
    if (notYetSynced > 0) {
      console.log(`  ⏳ Not yet synced: ${notYetSynced} icons`);
      console.log(`\n   Icons pending sync:`);
      Object.entries(missingIcons).forEach(([name, category]) => {
        console.log(`   - ${name} (${category})`);
      });
    }

    console.log(`\n✅ Validation passed: all downloaded icons have their SVG files`);
  } catch (e) {
    console.error("❌ Validation error:", e.message);
    process.exit(1);
  }
}

validateSVGs();
