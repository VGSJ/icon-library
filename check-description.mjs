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
  const fileData = await figmaFetch(fileUrl);
  
  // Find target-aim component set
  let found = null;
  
  function traverse(node) {
    if (node.type === "COMPONENT_SET" && node.name === "icon-target-aim") {
      found = node;
    }
    if (node.children) {
      for (const child of node.children) traverse(child);
    }
  }
  
  traverse(fileData.document);
  
  if (found) {
    console.log("Found icon-target-aim:");
    console.log("  name:", found.name);
    console.log("  description:", found.description);
    console.log("  description length:", (found.description || "").length);
    console.log("  has description field:", 'description' in found);
  } else {
    console.log("icon-target-aim not found");
  }
}

test().catch(console.error);
