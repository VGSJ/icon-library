import "dotenv/config";

async function figmaFetch(url) {
  const res = await fetch(url, {
    headers: { "X-Figma-Token": process.env.FIGMA_TOKEN }
  });
  return res.json();
}

async function test() {
  const fileKey = process.env.FIGMA_FILE_KEY;
  const compSetsUrl = `https://api.figma.com/v1/files/${fileKey}/component_sets`;
  const data = await figmaFetch(compSetsUrl);
  const sets = data?.meta?.component_sets || [];
  
  // Show structure of first 3 icon component sets
  sets.filter(cs => cs.name.startsWith("icon-")).slice(0, 3).forEach(cs => {
    console.log("\nComponent Set:");
    console.log(`  name: ${cs.name}`);
    console.log(`  description: ${cs.description || "none"}`);
    console.log(`  node_id: ${cs.node_id}`);
  });
}

test();
