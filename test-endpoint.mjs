import "dotenv/config";

async function figmaFetch(url) {
  const res = await fetch(url, {
    headers: { "X-Figma-Token": process.env.FIGMA_TOKEN }
  });
  return res.json();
}

async function test() {
  const fileKey = process.env.FIGMA_FILE_KEY;
  
  // Get file data and look for COMPONENT_SET
  const fileUrl = `https://api.figma.com/v1/files/${fileKey}`;
  const fileData = await figmaFetch(fileUrl);
  
  let componentSets = [];
  let components = [];
  
  function traverse(node) {
    if (node.type === "COMPONENT_SET" && node.name?.startsWith("icon-")) {
      componentSets.push(node);
    }
    if (node.type === "COMPONENT" && node.name?.startsWith("icon-")) {
      components.push(node);
    }
    if (node.children && node.children.length < 1000) {
      for (const child of node.children) traverse(child);
    }
  }
  
  traverse(fileData.document);
  
  console.log(`COMPONENT_SETs found: ${componentSets.length}`);
  console.log(`COMMONENTs found: ${components.length}`);
  console.log();
  
  // Show structure of a component set
  if (componentSets.length > 0) {
    const set = componentSets[0];
    console.log(`Sample COMPONENT_SET: ${set.name}`);
    console.log(`  Children: ${(set.children || []).length}`);
    if (set.children && set.children.length > 0) {
      console.log(`  First 3 children:`);
      set.children.slice(0, 3).forEach((child, i) => {
        console.log(`    ${i+1}. ${child.name} (${child.type})`);
      });
    }
  }
}

test().catch(console.error);
