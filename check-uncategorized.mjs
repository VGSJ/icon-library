import "dotenv/config";

const fileKey = process.env.FIGMA_FILE_KEY;
const token = process.env.FIGMA_TOKEN;

const url = `https://api.figma.com/v1/files/${fileKey}/component_sets`;
const res = await fetch(url, { headers: { "X-Figma-Token": token } });
const data = await res.json();
const comps = data.meta?.component_sets || [];

const uncategorized = comps.filter(c => {
  if (!c.name?.startsWith("icon-")) return false;
  const desc = c.description || "";
  return !desc.toLowerCase().includes("category:") || desc.toLowerCase().includes("category: uncategorized");
});

console.log("Uncategorized icons:");
uncategorized.forEach(c => {
  let name = c.name.substring(5);
  if (name.includes(",")) name = name.split(",")[0].trim();
  console.log("  -", name);
});
