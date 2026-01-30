import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { env, validateEnvironment, figmaFetch, parseDate, normalizeCategory } from "./utils.mjs";

const ROOT = process.cwd();
const RAW_SVG_DIR = path.join(ROOT, "docs", "raw-svg"); // Single source of truth

// List of all valid categories
const VALID_CATEGORIES = [
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
  "flags",
];

async function getComponentTimestamps(fileKey) {
  try {
    const compsetsUrl = `https://api.figma.com/v1/files/${fileKey}/component_sets`;
    const compsetsData = await figmaFetch(compsetsUrl);
    const componentSets = compsetsData.meta?.component_sets || [];

    const timestamps = {};
    for (const comp of componentSets) {
      if (comp.name?.startsWith("icon-")) {
        let baseName = comp.name.substring(5);
        if (baseName.includes(",")) baseName = baseName.split(",")[0].trim();

        timestamps[baseName] = {
          modifiedAt: comp.updated_at,
          name: comp.name,
        };
      }
    }

    return timestamps;
  } catch (e) {
    console.warn(`⚠️ Could not fetch component timestamps: ${e.message}`);
    return {};
  }
}

async function cleanupCategory(categoryName) {
  // Before syncing, remove old SVGs for this category to ensure clean update
  // This ensures renamed/deleted icons in Figma are removed locally
  // ONLY delete icons that belong to THIS category, not other categories

  try {
    // First, read current metadata to see which icons are in this category
    const metaFile = path.join(ROOT, "docs", "metadata", "icons.json");
    let currentMetadata = { icons: [] };
    try {
      const data = await fs.readFile(metaFile, "utf8");
      currentMetadata = JSON.parse(data);
    } catch {
      // Metadata might not exist yet
    }

    // Get icons currently marked as belonging to this category
    const normalizedCategory = categoryName.toLowerCase().trim();
    const categoryId = normalizedCategory
      .replace(/\s+/g, "-")
      .replace(/&/g, "-")
      .replace(/-+/g, "-");

    const iconsInThisCategory = new Set();
    for (const icon of currentMetadata.icons || []) {
      if (icon.category?.id === categoryId) {
        iconsInThisCategory.add(icon.name);
      }
    }

    // Fetch Figma metadata for this category NOW
    const fileKey = env("FIGMA_FILE_KEY");
    const compsetsUrl = `https://api.figma.com/v1/files/${fileKey}/component_sets`;
    const compsetsData = await figmaFetch(compsetsUrl);
    const componentSets = compsetsData.meta?.component_sets || [];

    const figmaIcons = new Set();
    for (const comp of componentSets) {
      if (!comp.name?.startsWith("icon-")) continue;
      let baseName = comp.name.substring(5);
      if (baseName.includes(",")) baseName = baseName.split(",")[0].trim();

      // Check if this icon is in the target category
      const desc = comp.description || "";
      if (desc.toLowerCase().includes(`category: ${normalizedCategory}`)) {
        figmaIcons.add(baseName);
      }
    }

    // Delete SVGs ONLY for icons that are:
    // 1. Currently in this category locally
    // 2. NO LONGER in this category in Figma
    let deletedCount = 0;
    for (const iconName of iconsInThisCategory) {
      if (!figmaIcons.has(iconName)) {
        // Icon was in this category but is now gone from Figma
        // Delete all its SVG files
        const styles = ["filled", "outline"];
        for (const style of styles) {
          const sizes = [16, 24, 32, 40, 48, 64, 72];
          for (const size of sizes) {
            const filePath = path.join(
              RAW_SVG_DIR,
              style,
              String(size),
              `icon-${iconName}-${style}-${size}.svg`
            );
            try {
              await fs.unlink(filePath);
              deletedCount++;
            } catch {
              // File might not exist (different style, size, or naming)
            }
          }
        }
      }
    }

    if (deletedCount > 0) {
      console.log(
        `🗑️  Cleaned up ${deletedCount} SVGs for icons removed from '${categoryName}' category`
      );
    }
  } catch {
    // Cleanup is optional - don't fail if it errors
  }
}

async function cleanupOrphanedUncategorized() {
  // Check for uncategorized icons that don't exist in Figma and delete them
  try {
    const fileKey = env("FIGMA_FILE_KEY");
    const compsetsUrl = `https://api.figma.com/v1/files/${fileKey}/component_sets`;
    const compsetsData = await figmaFetch(compsetsUrl);
    const componentSets = compsetsData.meta?.component_sets || [];

    // Build set of all icons in Figma
    const figmaIcons = new Set();
    for (const comp of componentSets) {
      if (!comp.name?.startsWith("icon-")) continue;
      let baseName = comp.name.substring(5);
      if (baseName.includes(",")) baseName = baseName.split(",")[0].trim();
      figmaIcons.add(baseName);
    }

    // Read current metadata
    const metaFile = path.join(ROOT, "metadata", "icons.json");
    let metadata = { icons: [] };
    try {
      const data = await fs.readFile(metaFile, "utf8");
      metadata = JSON.parse(data);
    } catch {
      return; // No metadata yet
    }

    // Find uncategorized icons
    const uncategorizedIcons = (metadata.icons || []).filter(
      (icon) => icon.category?.id === "uncategorized"
    );

    if (uncategorizedIcons.length === 0) {
      return; // No uncategorized icons
    }

    // Check each uncategorized icon against Figma
    let deletedCount = 0;

    for (const icon of uncategorizedIcons) {
      if (!figmaIcons.has(icon.name)) {
        // Icon doesn't exist in Figma - delete it
        const styles = ["filled", "outline"];
        const sizes = [16, 24, 32, 40, 48, 64, 72];

        for (const style of styles) {
          for (const size of sizes) {
            const filePath = path.join(
              RAW_SVG_DIR,
              style,
              String(size),
              `icon-${icon.name}-${style}-${size}.svg`
            );
            try {
              await fs.unlink(filePath);
              deletedCount++;
            } catch {
              // File might not exist
            }
          }
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`🗑️  Cleaned up ${deletedCount} SVGs for uncategorized icons not in Figma`);
    }
  } catch (e) {
    console.log(`⚠️  Orphan cleanup warning: ${e.message}`);
  }
}

async function syncCategoryFromFigma(category) {
  // Validate environment variables first, before any work
  validateEnvironment();

  // Validate category parameter
  const normalizedCategory = normalizeCategory(category);
  const validCategories = VALID_CATEGORIES.map((c) => normalizeCategory(c));

  if (!validCategories.includes(normalizedCategory)) {
    console.error(`❌ Invalid category: "${category}"`);
    console.error("\nValid categories are:");
    VALID_CATEGORIES.forEach((c) => console.error(`  • ${c}`));
    process.exit(1);
  }

  // Find the actual category name (preserves original casing)
  const actualCategory = VALID_CATEGORIES.find((c) => normalizeCategory(c) === normalizedCategory);

  const fileKey = env("FIGMA_FILE_KEY");

  // Clean up old SVGs for this category before syncing
  await cleanupCategory(actualCategory);

  console.log(`🔍 Fetching component sets for "${actualCategory}" category...`);

  try {
    const compsetsUrl = `https://api.figma.com/v1/files/${fileKey}/component_sets`;
    const compsetsData = await figmaFetch(compsetsUrl);

    const componentSets = compsetsData.meta?.component_sets || [];

    // Get timestamps for all components
    console.log("⏰ Fetching component timestamps from Figma...");
    const componentTimestamps = await getComponentTimestamps(fileKey);

    // Find all icons in this category
    const categoryIcons = componentSets.filter((cs) => {
      if (!cs.name?.startsWith("icon-")) return false;
      const desc = cs.description || "";
      return desc.toLowerCase().includes(`category: ${normalizedCategory}`);
    });

    console.log(`✅ Found ${categoryIcons.length} icons in "${category}"`);

    // Get file data to find variants
    const fileUrl = `https://api.figma.com/v1/files/${fileKey}`;
    const fileData = await figmaFetch(fileUrl);

    const variants = [];

    function traverse(node) {
      if (node.type === "COMPONENT_SET") {
        // Check if this component set matches any of our category icons
        const matches = categoryIcons.find((ci) => ci.name === node.name);
        if (matches && node.children && node.children.length > 0) {
          const iconName = node.name.substring(5);
          variants.push(
            ...node.children.map((child) => ({
              ...child,
              setName: iconName,
            }))
          );
        }
      }
      if (node.children) {
        for (const child of node.children) traverse(child);
      }
    }

    traverse(fileData.document);

    console.log(`📥 Found ${variants.length} variants to process`);

    // Detect changes by comparing Figma timestamps with local files
    console.log("\n📊 Detecting SVG changes...\n");
    const variantsToDownload = [];
    const variantsUpdated = [];
    let skipped = 0;

    for (const variant of variants) {
      const parts = variant.name.split(", ").reduce((acc, part) => {
        const [key, val] = part.split("=");
        acc[key?.trim().toLowerCase()] = val?.trim();
        return acc;
      }, {});

      let style = parts.type || "outline";
      const size = parts.size || "16";
      if (style === "fill") style = "filled";
      if (style === "outlined") style = "outline";

      const filename = `icon-${variant.setName}-${style}-${size}.svg`;
      const siteFilePath = path.join("docs", "raw-svg", style, String(size), filename);

      variant.style = style;
      variant.size = size;

      // Check if file exists and compare timestamps
      try {
        const stat = await fs.stat(siteFilePath);
        const localMtime = stat.mtimeMs;

        // Get Figma component timestamp
        const componentTimestamp = componentTimestamps[variant.setName];
        if (componentTimestamp) {
          try {
            const figmaModTime = parseDate(componentTimestamp.modifiedAt);

            if (figmaModTime > localMtime) {
              // SVG was updated in Figma since we downloaded it
              variantsUpdated.push({
                ...variant,
                figmaTime: componentTimestamp.modifiedAt,
                localTime: new Date(localMtime).toISOString(),
              });
              variantsToDownload.push(variant);
              console.log(`   ♻️  Updated: ${filename}`);
            } else {
              // File is current
              skipped++;
            }
          } catch {
            // Invalid timestamp, treat as potentially updated (safer)
            console.warn(`   ⚠️  Invalid timestamp for ${filename}, treating as updated`);
            variantsToDownload.push(variant);
          }
        } else {
          // No timestamp found, skip
          skipped++;
        }
      } catch {
        // File doesn't exist - this is a new SVG
        variantsToDownload.push(variant);
        console.log(`   🆕 New: ${filename}`);
      }
    }

    console.log("\n📈 Change Summary:");
    console.log(`   🆕 New SVGs: ${variantsToDownload.length - variantsUpdated.length}`);
    console.log(`   ♻️  Updated SVGs: ${variantsUpdated.length}`);
    console.log(`   ✅ Current SVGs: ${skipped}`);

    if (variantsUpdated.length > 0) {
      console.log("\n📝 Details of Updated SVGs:");
      variantsUpdated.slice(0, 10).forEach((v) => {
        const figmaDate = new Date(v.figmaTime).toLocaleString("en-US", {
          timeZone: "Asia/Singapore",
        });
        const localDate = new Date(v.localTime).toLocaleString("en-US", {
          timeZone: "Asia/Singapore",
        });
        console.log(`   • icon-${v.setName}-${v.style}-${v.size}`);
        console.log(`     Figma: ${figmaDate} | Local: ${localDate}`);
      });
      if (variantsUpdated.length > 10) {
        console.log(`   ... and ${variantsUpdated.length - 10} more`);
      }
    }

    console.log(`\n⏳ Downloading ${variantsToDownload.length} SVGs...`);

    // Download SVGs in batches with retry logic
    const batchSize = 50;
    const maxRetries = 2;
    let downloaded = 0;
    let failed = 0;

    if (variantsToDownload.length === 0) {
      console.log("✅ All SVGs up-to-date");
    } else {
      console.log(`\n⏳ Downloading in batches of ${batchSize}...`);
    }

    let variantsForDownload = [...variantsToDownload];
    let retryAttempt = 0;

    while (variantsForDownload.length > 0 && retryAttempt <= maxRetries) {
      if (retryAttempt > 0) {
        console.log(
          `\n🔄 Retry attempt ${retryAttempt}/${maxRetries} for ${variantsForDownload.length} failed downloads...`
        );
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryAttempt), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const stillFailing = [];

      for (let i = 0; i < variantsForDownload.length; i += batchSize) {
        const batch = variantsForDownload.slice(i, i + batchSize);
        const nodeIds = batch.map((v) => v.id).join(",");

        try {
          const imagesUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${nodeIds}&format=svg`;
          const imagesData = await figmaFetch(imagesUrl);

          if (!imagesData.images) {
            console.warn(`⚠️ No images in batch ${Math.floor(i / batchSize) + 1}`);
            stillFailing.push(...batch);
            failed += batch.length;
            continue;
          }

          for (const variant of batch) {
            const url = imagesData.images[variant.id];
            if (!url) {
              stillFailing.push(variant);
              failed++;
              continue;
            }

            try {
              // Download SVG content with timeout
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

              const res = await fetch(url, { signal: controller.signal });
              clearTimeout(timeout);

              if (!res.ok) {
                stillFailing.push(variant);
                failed++;
                continue;
              }

              const buffer = await res.arrayBuffer();

              // Write file
              const filename = `icon-${variant.setName}-${variant.style}-${variant.size}.svg`;
              const siteFilePath = path.join(
                "docs",
                "raw-svg",
                variant.style,
                String(variant.size),
                filename
              );
              await fs.mkdir(path.dirname(siteFilePath), { recursive: true });
              await fs.writeFile(siteFilePath, Buffer.from(buffer));
              downloaded++;

              if (downloaded % 20 === 0) {
                console.log(`  ✅ Downloaded ${downloaded} SVGs...`);
              }
            } catch {
              stillFailing.push(variant);
              failed++;
            }
          }

          const batchNum = Math.floor(i / batchSize) + 1;
          const successful = batch.length - batch.filter((v) => stillFailing.includes(v)).length;
          console.log(`  Batch ${batchNum}: ${successful}/${batch.length} downloaded`);
        } catch (e) {
          console.error(`❌ Batch failed: ${e.message}`);
          stillFailing.push(...batch);
          failed += batch.length;
        }
      }

      variantsForDownload = stillFailing;
      retryAttempt++;
    }

    console.log(`\n✅ Downloaded ${downloaded} SVGs`);
    if (failed > 0) {
      console.log(`⚠️ Failed or skipped: ${failed} (after ${maxRetries} retries)`);
    }

    // Regenerate metadata
    console.log("\n📝 Generating metadata...");
    try {
      execSync("node generate-metadata.mjs", {
        cwd: process.cwd(),
        stdio: "inherit",
        timeout: 120000, // 2 minute timeout
      });
    } catch (e) {
      console.error("❌ Metadata generation failed:", e.message);
      if (e.killed) {
        console.error("❌ Metadata generation timed out after 120 seconds");
      }
      throw e;
    }

    // Clean up any orphaned uncategorized icons
    console.log("\n🧹 Checking for orphaned uncategorized icons...");
    await cleanupOrphanedUncategorized();

    console.log("\n🎉 Sync complete!");
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}

const category = process.argv[2] || "housekeeping";
syncCategoryFromFigma(category).catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
