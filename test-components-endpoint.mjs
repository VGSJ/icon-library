import "dotenv/config";

async function figmaFetch(url) {
  const res = await fetch(url, {
    headers: { "X-Figma-Token": process.env.FIGMA_TOKEN }
  });
  return res.json();
}

async function test() {
  const fileKey = process.env.FIGMA_FILE_KEY;
  
  // Use the components endpoint which may have better metadata
  const compsUrl = `https://api.figma.com/v1/files/${fileKey}/components`;
  console.log("Fetching components endpoint...");
  
  const data = await figmaFetch(compsUrl);
  const components = data?.meta?.components || [];
  
  // Find icon component sets
  const iconComps = components.filter(c => c.name?.startsWith("icon-")).slice(0, 5);
  
  console.log(`Found ${iconComps.length} sample icon components\n`);
  
  iconComps.forEach(comp => {
    console.log(`Name: ${comp.name}`);
    console.log(`Description: "${comp.description || ""}"`);
    console.log(`Keys: ${Object.keys(comp).join(", ")}`);
    console.log();
  });
}

test().catch(console.error);
