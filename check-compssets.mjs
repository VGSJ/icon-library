import "dotenv/config";

async function figmaFetch(url) {
  const res = await fetch(url, {
    headers: { "X-Figma-Token": process.env.FIGMA_TOKEN }
  });
  return res.json();
}

async function test() {
  const fileKey = process.env.FIGMA_FILE_KEY;
  
  // Try component_sets endpoint
  const url = `https://api.figma.com/v1/files/${fileKey}/component_sets`;
  const data = await figmaFetch(url);
  
  console.log("Response keys:", Object.keys(data));
  console.log("Component sets count:", data.meta?.component_sets?.length);
  
  if (data.meta?.component_sets) {
    const target = data.meta.component_sets.find(cs => cs.name === "icon-target-aim");
    if (target) {
      console.log("\nicon-target-aim:");
      console.log("  Keys:", Object.keys(target));
      console.log("  Description:", target.description);
    }
  }
}

test().catch(console.error);
