import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const EXPORT_DIR = path.join(ROOT, "figma-export");
const OUT_DIR = path.join(ROOT, "raw-svg");

async function quickSync() {
  const files = await fs.readdir(EXPORT_DIR);
  const svgFiles = files.filter(f => f.endsWith('.svg'));
  
  console.log(`Found ${svgFiles.length} SVG files`);
  
  let copied = 0;
  for (const file of svgFiles) {
    const match = file.match(/^icon-(.+?)-(fill|filled|outline|line)-(\d+)(?:px)?\.svg$/i);
    if (!match) {
      console.log(`⚠️ Skipping ${file} (naming doesn't match pattern)`);
      continue;
    }
    
    const [, iconName, typeRaw, sizeRaw] = match;
    const type = typeRaw === 'fill' ? 'filled' : typeRaw === 'line' ? 'outline' : typeRaw;
    const size = sizeRaw;
    
    const targetDir = path.join(OUT_DIR, type, size);
    await fs.mkdir(targetDir, { recursive: true });
    
    const sourcePath = path.join(EXPORT_DIR, file);
    const targetPath = path.join(targetDir, file);
    
    await fs.copyFile(sourcePath, targetPath);
    copied++;
  }
  
  console.log(`✅ Copied ${copied} files!`);
}

quickSync().catch(e => {
  console.error("Error:", e.message);
  process.exit(1);
});
