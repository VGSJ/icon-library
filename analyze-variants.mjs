import "dotenv/config";
import fs from "fs/promises";

function env(name) {
  return process.env[name];
}

async function figmaFetch(url) {
  const token = env("FIGMA_TOKEN");
  if (!token) throw new Error("FIGMA_TOKEN not set");
  
  const res = await fetch(url, {
    headers: { "X-Figma-Token": token }
  });
  if (!res.ok) throw new Error(`Figma API ${res.status}`);
  return res.json();
}

async function analyzeVariants() {
  const fileKey = env("FIGMA_FILE_KEY");
  
  console.log("📊 Analyzing Figma variant properties...\n");
  
  // Get component sets which contain variants
  const compSetsUrl = `https://api.figma.com/v1/files/${fileKey}/component_sets`;
  const compSetsData = await figmaFetch(compSetsUrl);
  const compSets = compSetsData?.meta?.component_sets || [];
  
  const iconSets = compSets.filter(cs => cs.name.startsWith("icon-"));
  console.log(`Found ${iconSets.length} icon component sets\n`);
  
  const variantKeys = new Map(); // key -> Set of values
  const examples = {}; // key -> example value
  
  for (const set of iconSets) {
    if (set.containing_frame?.name) {
      // Parse variant string: "size=16; type=outline"
      const variants = set.containing_frame.name.split(/;\s*/);
      for (const variant of variants) {
        const [key, val] = variant.split(/\s*=\s*/);
        if (!key || !val) continue;
        
        if (!variantKeys.has(key)) {
          variantKeys.set(key, new Set());
        }
        variantKeys.get(key).add(val);
        
        if (!examples[key]) {
          examples[key] = val;
        }
      }
    }
  }
  
  console.log("📋 All variant properties found:\n");
  for (const [key, values] of variantKeys) {
    console.log(`  ${key}: ${Array.from(values).sort().join(", ")}`);
  }
  
  console.log("\n💾 Analysis saved to variant-analysis.json");
  await fs.writeFile(
    "variant-analysis.json",
    JSON.stringify(
      {
        totalComponentSets: iconSets.length,
        variantProperties: Object.fromEntries(
          Array.from(variantKeys).map(([k, v]) => [k, Array.from(v).sort()])
        ),
        examples
      },
      null,
      2
    )
  );
}

analyzeVariants().catch(e => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});
