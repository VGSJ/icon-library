import "dotenv/config";

const token = process.env.FIGMA_TOKEN;
const fileKey = process.env.FIGMA_FILE_KEY;

async function checkIcons() {
  const url = `https://api.figma.com/v1/files/${fileKey}/component_sets`;
  const res = await fetch(url, {
    headers: { "X-Figma-Token": token }
  });
  const data = await res.json();
  const comps = data.meta?.component_sets || [];
  
  const targetIcons = ['resize-big', 'resize-small', 'undock'];
  
  console.log("🔍 Checking Figma descriptions for uncategorized icons:\n");
  
  targetIcons.forEach(target => {
    const comp = comps.find(c => c.name?.includes(target) && c.name?.startsWith('icon-'));
    if (comp) {
      console.log(`📌 ${comp.name}`);
      console.log(`   Description: ${comp.description || '(none)'}\n`);
    } else {
      console.log(`❌ ${target} not found in Figma\n`);
    }
  });
}

checkIcons().catch(console.error);
