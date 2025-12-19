import "dotenv/config";
import fs from "fs/promises";
import path from "path";

console.log("RUNNING icons-sync.mjs (FILE TREE + /nodes + fallback /components/:key)");

const ROOT = process.cwd();
const EXPORT_DIR = path.join(ROOT, "figma-export");
const OUT_DIR = path.join(ROOT, "raw-svg");
const META_DIR = path.join(ROOT, "metadata");
const META_FILE = path.join(META_DIR, "icons.json");

const ICON_PREFIX = "icon-";

// Canonical forms used by the website
const CANON_TYPES = new Set(["filled", "outline"]);
const CANON_SIZES = new Set([16, 24, 32, 40, 48]);

// Acceptable synonyms from exports
const TYPE_SYNONYMS = new Map([
  ["filled", "filled"],
  ["fill", "filled"],
  ["solid", "filled"],

  ["outline", "outline"],
  ["outlined", "outline"],
  ["line", "outline"],
]);

// Debug
const DEBUG = true;
const DEBUG_ICON = "escalator-up";

function env(name) {
  return process.env[name];
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function normalizeId(s = "") {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[,]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function stripIconPrefix(s = "") {
  const t = String(s).toLowerCase().trim();
  return t.startsWith(ICON_PREFIX) ? t.slice(ICON_PREFIX.length) : t;
}

// Turn "AI & VR" -> "ai-vr"
function slugify(s = "") {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function inferCategoryLabel(iconName) {
  const parts = iconName.split("-").filter(Boolean);
  return parts.length > 1 ? parts[0] : "uncategorized";
}

function normalizeType(raw = "") {
  const t = String(raw).toLowerCase().trim();
  return TYPE_SYNONYMS.get(t) || null;
}

function normalizeSize(raw = "") {
  const s = String(raw).toLowerCase().trim().replace(/px$/, "");
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return CANON_SIZES.has(n) ? n : null;
}

/**
 * Accepts exported names like:
 * - icon-escalator-up-fill-24px.svg
 * - icon-escalator-up-filled-24.svg
 * - icon-escalator-up-outlined-24.svg
 * - escalator-up-outline-24.svg
 */
function parseFilename(filename) {
  if (!filename.toLowerCase().endsWith(".svg")) return null;

  const base = filename.replace(/\.svg$/i, "");
  const m = base.match(/^(.*)-([a-zA-Z]+)-(\d+)(px)?$/);
  if (!m) return null;

  let [, rawIconName, rawType, rawSize] = m;

  const type = normalizeType(rawType);
  const sizeNum = normalizeSize(rawSize);

  if (!type || !sizeNum) return null;

  const iconName = normalizeId(stripIconPrefix(rawIconName));
  if (!iconName) return null;

  return { iconName, type, size: String(sizeNum) };
}

/**
 * Parses BOTH multiline and one-line descriptions:
 * - multiline:
 *   category: x\n tags: a,b\n aliases: y
 * - one-line:s
 *   category: x tags: a,b aliases: y
 */
function parseDescription(desc = "") {
  const out = { category: null, tags: [], aliases: [] };
  const text = String(desc || "").trim();
  if (!text) return out;

  const re = /\b(category|tags|aliases)\s*:\s*([\s\S]*?)(?=\b(category|tags|aliases)\s*:|$)/gi;

  let m;
  while ((m = re.exec(text)) !== null) {
    const key = m[1].toLowerCase();
    const rawVal = (m[2] || "").trim();

    if (key === "category") {
      out.category = rawVal;
      continue;
    }

    const list = rawVal
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (key === "tags") out.tags = list;
    if (key === "aliases") out.aliases = list;
  }

  return out;
}

async function figmaFetchJson(url) {
  const token = env("FIGMA_TOKEN");
  const res = await fetch(url, { headers: { "X-Figma-Token": token } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} :: ${text.slice(0, 300)}`);
  }
  return res.json();
}

function findFirstComponentNodeId(node) {
  let found = null;
  walk(node, (n) => {
    if (found) return;
    if (n?.type === "COMPONENT") found = String(n.id);
  });
  return found;
}

function previewText(s, max = 140) {
  const t = String(s ?? "");
  return t.length > max ? t.slice(0, max) + "…" : t;
}

function walk(node, fn) {
  fn(node);
  const kids = node?.children;
  if (Array.isArray(kids)) {
    for (const child of kids) walk(child, fn);
  }
}

function scoreMeta(m) {
  return (m?.category ? 10 : 0) + (m?.tags?.length ? 2 : 0) + (m?.aliases?.length ? 1 : 0);
}

/**
 * Load metadata for exported icons:
 * 1) Find icon- COMPONENT_SET nodes by scanning file tree
 * 2) Fetch those nodes via /files/:key/nodes
 * 3) If set.description is missing, fallback:
 *    - find first child COMPONENT id
 *    - map node_id -> component key using /files/:key/components
 *    - fetch /components/:key to read description reliably
 */
async function loadFigmaMetadataForExportedIcons(neededIconNames) {
  const token = env("FIGMA_TOKEN");
  const fileKey = env("FIGMA_FILE_KEY");

  if (!token || !fileKey) {
    console.warn("⚠️ FIGMA_TOKEN / FIGMA_FILE_KEY not set. Falling back to inferred categories.");
    return new Map();
  }

  const metaMap = new Map();

  function safeSet(key, meta) {
    if (!key) return false;
    const existing = metaMap.get(key);
    if (!existing || scoreMeta(meta) > scoreMeta(existing)) {
      metaMap.set(key, meta);
      return true;
    }
    return false;
  }

  // Build node_id -> component_key map for fallback description reads
  const nodeIdToComponentKey = new Map();
  const nodeIdToComponentSetKey = new Map();
  try {
    const compListUrl = `https://api.figma.com/v1/files/${fileKey}/components`;
    const compListData = await figmaFetchJson(compListUrl);
    const comps = compListData?.meta?.components || [];
    for (const c of comps) {
      if (c?.node_id && c?.key) nodeIdToComponentKey.set(String(c.node_id), String(c.key));
    }
    if (DEBUG) console.log(`✅ Loaded Figma components index for fallback: ${comps.length}`);
  } catch (e) {
    console.warn("⚠️ Could not load /components index for fallback. Continuing without it.");
  }

  try {
    const compSetsUrl = `https://api.figma.com/v1/files/${fileKey}/component_sets`;
    const compSetsData = await figmaFetchJson(compSetsUrl);
    const compSets = compSetsData?.meta?.component_sets || [];
    for (const cs of compSets) {
      if (cs?.node_id && cs?.key) nodeIdToComponentSetKey.set(String(cs.node_id), String(cs.key));
    }
    if (DEBUG) console.log(`✅ Loaded Figma component sets index: ${compSets.length}`);
  } catch (e) {
    console.warn("⚠️ Could not load /component_sets index. Continuing without it.");
  }

  // 1) File tree scan for COMPONENT_SET ids
  const fileUrl = `https://api.figma.com/v1/files/${fileKey}`;
  const fileData = await figmaFetchJson(fileUrl);
  const document = fileData?.document;

  if (!document) {
    console.warn("⚠️ Could not read Figma file document tree.");
    return metaMap;
  }

  const pages = Array.isArray(document.children) ? document.children : [];
  const iconPages = pages.filter((p) => String(p.name || "").toLowerCase().includes("icons"));
  const rootsToScan = iconPages.length ? iconPages : pages;

  if (DEBUG) {
    console.log(`✅ Need metadata for exported icons: ${neededIconNames.size}`);
    console.log(`✅ Scanning ${rootsToScan.length} page(s) (${iconPages.length ? "Icons pages only" : "all pages"})`);
  }

  const foundSets = []; // { id, baseId }
  let foundIconSets = 0;

  for (const root of rootsToScan) {
    walk(root, (node) => {
      if (node?.type !== "COMPONENT_SET") return;

      const rawName = String(node.name || "");
      if (!rawName.toLowerCase().startsWith(ICON_PREFIX)) return;

      foundIconSets++;
      const baseId = normalizeId(stripIconPrefix(rawName));
      foundSets.push({ id: String(node.id), baseId });
    });
  }

  if (DEBUG) console.log(`✅ Found icon- COMPONENT_SET nodes: ${foundIconSets}`);
  if (foundSets.length === 0) return metaMap;

  // 2) Fetch node details via /nodes
  const CHUNK = 200;
  const nodeById = new Map();

  for (let i = 0; i < foundSets.length; i += CHUNK) {
    const ids = foundSets.slice(i, i + CHUNK).map((s) => s.id).join(",");
    const nodesUrl = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(ids)}`;
    const nodesData = await figmaFetchJson(nodesUrl);

    const nodesObj = nodesData?.nodes || {};
    for (const [id, payload] of Object.entries(nodesObj)) {
      if (payload?.document) nodeById.set(String(id), payload.document);
    }
  }

  // 3) Index by baseId and aliases
  let matchedExports = 0;

  for (const s of foundSets) {
    const setNode = nodeById.get(s.id);
    if (!setNode) continue;

    let desc = "";

    // Try to get description from component set API using the set node ID
    const setKey = nodeIdToComponentSetKey.get(s.id);
    if (setKey && !desc) {
      try {
        const compSetUrl = `https://api.figma.com/v1/component_sets/${setKey}`;
        const compSetData = await figmaFetchJson(compSetUrl);
        desc = compSetData?.meta?.description ?? "";
      } catch {
        // ignore fallback failure
      }
    }

    // If missing, try first child COMPONENT's description
    if (!desc && Array.isArray(setNode.children) && setNode.children.length > 0) {
      desc = setNode.children[0]?.description ?? "";
    }

    // If STILL missing, fallback to /components/:key using first child COMPONENT node_id
    if (!desc && Array.isArray(setNode.children) && setNode.children.length > 0) {
      const childId = findFirstComponentNodeId(setNode) || "";
      const compKey = childId ? nodeIdToComponentKey.get(childId) : null;

      if (compKey) {
        try {
          const compUrl = `https://api.figma.com/v1/components/${compKey}`;
          const compData = await figmaFetchJson(compUrl);
          const compDesc = compData?.meta?.component?.description ?? "";
          if (compDesc) desc = compDesc;
        } catch {
          // ignore fallback failure
        }
      }
    }

    const parsed = parseDescription(desc);

    safeSet(s.baseId, parsed);

    const aliasIds = (parsed.aliases || [])
      .map((a) => normalizeId(stripIconPrefix(a)))
      .filter(Boolean);

    for (const aId of aliasIds) safeSet(aId, parsed);

    const matchesThis =
      neededIconNames.has(s.baseId) || aliasIds.some((a) => neededIconNames.has(a));

    if (matchesThis) matchedExports++;
  }

  if (DEBUG) {
    console.log(`✅ Matched exported icons to COMPONENT_SET nodes: ${matchedExports}`);
    console.log(`✅ Loaded Figma metadata keys (export names + aliases): ${metaMap.size}`);
  }

  return metaMap;
}

async function main() {
  await ensureDir(OUT_DIR);
  await ensureDir(META_DIR);

  if (!(await pathExists(EXPORT_DIR))) {
    console.error(`❌ Missing folder: ${EXPORT_DIR}`);
    process.exit(1);
  }

  const entries = await fs.readdir(EXPORT_DIR, { withFileTypes: true });
  const svgFiles = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".svg"));
  if (svgFiles.length === 0) {
    console.error(`❌ No SVGs found in ${EXPORT_DIR}`);
    process.exit(1);
  }

  // Determine needed icons from exports
  const neededIconNames = new Set();
  for (const f of svgFiles) {
    const p = parseFilename(f.name);
    if (p) neededIconNames.add(p.iconName);
  }

  if (DEBUG) console.log("DEBUG needed icons:", Array.from(neededIconNames).slice(0, 100));

  const figmaMeta = await loadFigmaMetadataForExportedIcons(neededIconNames);

  // Copy/normalize SVGs + build availability
  const byIcon = new Map();
  let processed = 0;
  let skipped = 0;

  for (const file of svgFiles) {
    const parsed = parseFilename(file.name);
    if (!parsed) {
      skipped++;
      continue;
    }

    const { iconName, type, size } = parsed;
    const src = path.join(EXPORT_DIR, file.name);

    const destDir = path.join(OUT_DIR, type, size);
    await ensureDir(destDir);

    const dest = path.join(destDir, `${iconName}.svg`);
    const svg = await fs.readFile(src, "utf8");
    await fs.writeFile(dest, svg, "utf8");

    if (!byIcon.has(iconName)) byIcon.set(iconName, { filled: {}, outline: {} });
    byIcon.get(iconName)[type][size] = `raw-svg/${type}/${size}/${iconName}.svg`;

    processed++;
  }

  // Build icons.json
  const icons = Array.from(byIcon.entries()).map(([name, availability]) => {
    const styles = [];
    if (Object.keys(availability.outline).length) styles.push("outline");
    if (Object.keys(availability.filled).length) styles.push("filled");
    
    // Default to outline if no styles found
    if (styles.length === 0) styles.push("outline");

    const sizes = Array.from(
      new Set([...Object.keys(availability.outline), ...Object.keys(availability.filled)].map(Number))
    ).sort((a, b) => a - b);

    const fig = figmaMeta.get(name) || {};

    if (DEBUG && name === DEBUG_ICON) {
      console.log(`DEBUG ${DEBUG_ICON} meta:`, fig);
    }

    const categoryLabel = (fig.category || inferCategoryLabel(name)).trim();
    const categoryId = slugify(categoryLabel);

    const baseTags = name.split("-").filter(Boolean);
    const tags = Array.from(new Set([...(baseTags || []), ...(fig.tags || []), ...(fig.aliases || [])]));

    return {
      name,
      category: { id: categoryId, label: categoryLabel },
      tags,
      styles,
      sizes,
    };
  });

  icons.sort((a, b) => a.name.localeCompare(b.name));

  await fs.writeFile(META_FILE, JSON.stringify({ icons }, null, 2), "utf8");

  console.log(`✅ Processed ${processed} SVG(s)`);
  console.log(`⚠️  Skipped   ${skipped} file(s)`);
  console.log(`✅ Icons     ${icons.length}`);
  console.log(`✅ Updated   metadata/icons.json`);
}

main().catch((err) => {
  console.error("❌ icons-sync failed:", err);
  process.exit(1);
});
