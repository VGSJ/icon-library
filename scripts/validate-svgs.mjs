#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const metaFile = path.join(ROOT, "docs", "metadata", "icons.json");
const rawSvgDir = path.join(ROOT, "docs", "raw-svg");

async function validateSVGs() {
  try {
    const metaData = JSON.parse(await fs.readFile(metaFile, "utf8"));
    const icons = metaData.icons || [];

    console.log(`🔍 Validating ${icons.length} icons...`);

    let totalVariants = 0;
    let presentVariants = 0;
    const incompleteIcons = {};

    for (const icon of icons) {
      const { name, sizes, styles, category } = icon;

      // Skip uncategorized icons
      if (!category || category.id === "uncategorized") {
        continue;
      }

      let iconMissing = 0;
      let iconTotal = 0;

      for (const style of styles || ["outline"]) {
        for (const size of sizes || []) {
          iconTotal++;
          totalVariants++;
          
          const filename = `icon-${name}-${style}-${size}.svg`;
          const filepath = path.join(rawSvgDir, style, String(size), filename);

          try {
            await fs.access(filepath);
            presentVariants++;
          } catch {
            iconMissing++;
          }
        }
      }

      if (iconMissing > 0) {
        incompleteIcons[name] = {
          category: category?.label || "unknown",
          missing: iconMissing,
          total: iconTotal
        };
      }
    }

    console.log(`\n📊 SVG Completeness:`);
    console.log(`  ✅ Present: ${presentVariants}/${totalVariants} variants`);

    if (Object.keys(incompleteIcons).length > 0) {
      console.error(`\n❌ Found ${Object.keys(incompleteIcons).length} icons with missing SVG variants:\n`);
      Object.entries(incompleteIcons).forEach(([name, info]) => {
        console.error(
          `  - ${name} (${info.category}): ${info.missing}/${info.total} variants missing`
        );
      });
      console.error(`\nAll categorized icons MUST have complete SVG files before deployment.`);
      console.error(`Sync the remaining categories or remove incomplete icons from metadata.\n`);
      process.exit(1);
    }

    console.log(`\n✅ Validation passed: all ${totalVariants} icon variants present and ready for deployment`);
  } catch (e) {
    console.error("❌ Validation error:", e.message);
    process.exit(1);
  }
}

validateSVGs();
