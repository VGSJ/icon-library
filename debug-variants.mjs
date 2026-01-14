import "dotenv/config";
import fs from "fs/promises";

async function figmaFetch(url) {
  const res = await fetch(url, {
    headers: { "X-Figma-Token": process.env.FIGMA_TOKEN }
  });
  return res.json();
}

async function test() {
  const fileKey = process.env.FIGMA_FILE_KEY;
  
  // Get file data
  const fileUrl = `https://api.figma.com/v1/files/${fileKey}`;
  console.log("Fetching file structure...");
  const fileData = await figmaFetch(fileUrl);
  
  // Find icon component sets
  let comps = [];
  
  function traverse(node) {
    if (node.type === "COMPONENT_SET" && node.name?.startsWith("icon-")) {
      comps.push(node);
    }
    if (node.children && node.children.length < 100) {
      for (const child of node.children) traverse(child);
    }
  }
  
  traverse(fileData.document);
  
  console.log(`Found ${comps.length} icon component sets`);
  
  // Save first component set for inspection
  if (comps.length > 0) {
    const first = comps[0];
    console.log(`\nFirst component set: ${first.name}`);
    console.log(`Children count: ${(first.children || []).length}`);
    
    // Check for variant properties
    console.log(`Has variantGroupProperties: ${'variantGroupProperties' in first}`);
    
    // Save sample child components
    if (first.children && first.children.length > 0) {
      const samples = first.children.slice(0, 3);
      console.log(`\nSample children:`);
      samples.forEach((child, i) => {
        console.log(`  ${i}: ${child.name}`);
        // List all keys that might contain variant info
        const keys = Object.keys(child);
        const relevantKeys = keys.filter(k => k.toLowerCase().includes('variant') || k.toLowerCase().includes('property'));
        if (relevantKeys.length > 0) {
          console.log(`     Variant keys: ${relevantKeys}`);
          relevantKeys.forEach(k => {
            console.log(`       ${k}: ${JSON.stringify(child[k]).substring(0, 80)}`);
          });
        }
      });
      
      await fs.writeFile('component-set-sample.json', JSON.stringify(first, null, 2));
      console.log('\nFull first component set saved to component-set-sample.json');
    }
  }
}

test().catch(console.error);
