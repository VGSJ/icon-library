import "dotenv/config";

function env(name) {
  return process.env[name];
}

async function figmaFetch(url) {
  const token = env("FIGMA_TOKEN");
  if (!token) throw new Error("FIGMA_TOKEN not set");
  
  const res = await fetch(url, {
    headers: { "X-Figma-Token": token }
  });
  if (!res.ok) throw new Error(`Figma API ${res.status}: ${res.statusText}`);
  return res.json();
}

async function listCategory(categoryName) {
  const fileKey = env("FIGMA_FILE_KEY");
  
  console.log(`🔍 Fetching Figma metadata for category: ${categoryName}...`);
  
  try {
    const compsetsUrl = `https://api.figma.com/v1/files/${fileKey}/component_sets`;
    const compsetsData = await figmaFetch(compsetsUrl);
    
    const componentSets = compsetsData.meta?.component_sets || [];
    console.log(`✅ Found ${componentSets.length} total component sets`);
    
    // Filter by category
    const filtered = componentSets.filter(cs => {
      if (!cs.name?.startsWith("icon-")) return false;
      const desc = cs.description || "";
      return desc.toLowerCase().includes(`category: ${categoryName.toLowerCase()}`);
    });
    
    console.log(`\n📦 Found ${filtered.length} icons in "${categoryName}" category:\n`);
    
    filtered.forEach(cs => {
      const name = cs.name.substring(5); // Remove "icon-" prefix
      console.log(`  - ${name}`);
    });
    
    console.log(`\n✅ Ready to sync ${filtered.length} icons from "${categoryName}"`);
    
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}

const category = process.argv[2] || "housekeeping";
listCategory(category).catch(e => {
  console.error("Error:", e.message);
  process.exit(1);
});
