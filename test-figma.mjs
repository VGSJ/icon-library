import "dotenv/config";

async function figmaFetch(url) {
  const res = await fetch(url, {
    headers: { "X-Figma-Token": process.env.FIGMA_TOKEN }
  });
  return res.json();
}

async function test() {
  const fileKey = process.env.FIGMA_FILE_KEY;
  const fileUrl = `https://api.figma.com/v1/files/${fileKey}`;
  
  console.log("Fetching file...");
  const fileData = await figmaFetch(fileUrl);
  
  let sampleComps = [];
  
  function traverse(node) {
    if (node.type === "COMPONENT_SET" && node.name?.startsWith("icon-") && sampleComps.length < 3) {
      sampleComps.push(node);
    }
    if (node.children) {
      for (const child of node.children) traverse(child);
    }
  }
  
  traverse(fileData.document);
  
  console.log(`Found ${sampleComps.length} sample components\n`);
  
  sampleComps.forEach(comp => {
    console.log(`\nComponent Set: ${comp.name}`);
    console.log(`  Description: "${comp.description || ""}"`);
    console.log(`  Children: ${(comp.children || []).length}`);
    
    if (comp.children && comp.children.length > 0) {
      const firstChild = comp.children[0];
      console.log(`  \nFirst child: ${firstChild.name}`);
      console.log(`    Type: ${firstChild.type}`);
      console.log(`    Description: "${firstChild.description || ""}"`);
      
      // Check component properties
      const variantProps = ['componentPropertyDefinitions', 'componentPropertyDefinition', 'variantGroupProperties'];
      variantProps.forEach(prop => {
        if (prop in firstChild) {
          console.log(`    ${prop}: ${JSON.stringify(firstChild[prop]).substring(0, 100)}`);
        }
      });
    }
  });
}

test().catch(console.error);
