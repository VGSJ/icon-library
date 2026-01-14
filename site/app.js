const els = {
  grid: document.getElementById("grid"),
  status: document.getElementById("status"),
  search: document.getElementById("search"),
  style: document.getElementById("style"),
  size: document.getElementById("size"),
  categories: document.getElementById("categories"),
};

let selectedCategory = null; // Track selected category filter

/* --------------------------------------------------
   Toast
-------------------------------------------------- */
const toast = document.createElement("div");
toast.className = "toast";
document.body.appendChild(toast);

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1400);
}

/* --------------------------------------------------
   Clipboard (Safari-safe)
-------------------------------------------------- */
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "0";
    ta.style.top = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
}

/* --------------------------------------------------
   Manual copy modal (guaranteed fallback)
-------------------------------------------------- */
function openManualCopy(svg) {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.45)";
  overlay.style.display = "grid";
  overlay.style.placeItems = "center";
  overlay.style.zIndex = "9999";

  const box = document.createElement("div");
  box.style.background = "var(--bg)";
  box.style.color = "var(--fg)";
  box.style.width = "min(90vw, 720px)";
  box.style.borderRadius = "16px";
  box.style.padding = "16px";
  box.style.boxShadow = "0 20px 40px rgba(0,0,0,0.35)";

  const title = document.createElement("div");
  title.textContent = "Press ⌘ + C to copy SVG";
  title.style.fontWeight = "600";
  title.style.marginBottom = "8px";

  const hint = document.createElement("div");
  hint.textContent = "Safari blocked automatic copy. This always works.";
  hint.style.fontSize = "12px";
  hint.style.opacity = "0.7";
  hint.style.marginBottom = "8px";

  const ta = document.createElement("textarea");
  ta.value = svg;
  ta.style.width = "100%";
  ta.style.height = "260px";
  ta.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, monospace";
  ta.style.fontSize = "12px";
  ta.style.borderRadius = "10px";
  ta.style.padding = "10px";

  const close = document.createElement("button");
  close.textContent = "Close";
  close.style.marginTop = "12px";

  close.onclick = () => overlay.remove();
  overlay.onclick = (e) => e.target === overlay && overlay.remove();

  box.appendChild(title);
  box.appendChild(hint);
  box.appendChild(ta);
  box.appendChild(close);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  ta.focus();
  ta.select();
}

/* --------------------------------------------------
   Utilities
-------------------------------------------------- */
function normalize(s = "") {
  return s.toLowerCase().trim();
}

function getCategoryLabel(icon) {
  // Supports both old format (string) and new format ({id,label})
  if (!icon || !icon.category) return "uncategorized";
  if (typeof icon.category === "string") return icon.category;
  return icon.category.label || "uncategorized";
}

function svgPath(name, style, size) {
  // Convert name to filename: ai-2-stars → icon-ai-2-stars-filled-16.svg
  // Normalize style names (fill -> filled, outlined -> outline)
  let normalizedStyle = style;
  if (normalizedStyle === "fill") normalizedStyle = "filled";
  if (normalizedStyle === "outlined") normalizedStyle = "outline";
  return `./raw-svg/${normalizedStyle}/${size}/icon-${name}-${normalizedStyle}-${size}.svg`;
}

async function fetchSvg(name, style, size) {
  // Normalize style name
  let normalizedStyle = style;
  if (normalizedStyle === "fill") normalizedStyle = "filled";
  if (normalizedStyle === "outlined") normalizedStyle = "outline";
  
  // Try primary path first
  let path = svgPath(name, style, size);
  let res = await fetch(path);
  
  // If not found, try with 'px' suffix in filename (same folder)
  if (!res.ok) {
    const sizeWithPx = `${size}px`;
    path = `./raw-svg/${normalizedStyle}/${size}/icon-${name}-${normalizedStyle}-${sizeWithPx}.svg`;
    res = await fetch(path);
  }
  
  // If still not found, try with 'px' in both folder and filename
  if (!res.ok) {
    const sizeWithPx = `${size}px`;
    path = `./raw-svg/${normalizedStyle}/${sizeWithPx}/icon-${name}-${normalizedStyle}-${sizeWithPx}.svg`;
    res = await fetch(path);
  }
  
  if (!res.ok) throw new Error(`Missing SVG for ${name} (${style}/${size})`);
  return res.text();
}

function iconMatches(icon, query) {
  if (!query) return true;
  const q = normalize(query);

  const categoryLabel = getCategoryLabel(icon);

  const hay = [
    icon.name,
    categoryLabel,
    ...(icon.tags || []),
  ]
    .map(normalize)
    .join(" ");

  return hay.includes(q);
}

/* --------------------------------------------------
   Rendering
-------------------------------------------------- */
function renderCard(icon, style, size) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "card";
  card.title = "Click to copy SVG";

  const preview = document.createElement("div");
  preview.className = "preview";
  preview.innerHTML = "…";
  
  // Set preview size dynamically: icon size + 20px padding (10px on each side)
  const previewSize = size + 20;
  preview.style.width = `${previewSize}px`;
  preview.style.height = `${previewSize}px`;

  const info = document.createElement("div");

  const name = document.createElement("div");
  name.className = "name";
  name.textContent = icon.name;

  info.appendChild(name);

  card.appendChild(preview);
  card.appendChild(info);

  fetchSvg(icon.name, style, size)
    .then((svg) => {
      // Create container for SVG to avoid innerHTML issues in Safari
      const container = document.createElement("div");
      container.innerHTML = svg;
      preview.innerHTML = "";
      preview.appendChild(container.firstElementChild || container);
    })
    .catch(() => {
      // Don't show error - just leave empty
      // This handles cases where a style doesn't exist for this icon
    });

  card.addEventListener("click", async () => {
    const path = svgPath(icon.name, style, size);
    try {
      const svg = await fetchSvg(icon.name, style, size);
      const ok = await copyText(svg);
      if (ok) {
        showToast(`Copied SVG: ${icon.name} (${style} ${size})`);
      } else {
        openManualCopy(svg);
      }
    } catch (_) {
      showToast(`Missing: ${path}`);
    }
  });

  return card;
}

/* --------------------------------------------------
   App state
-------------------------------------------------- */
let allIcons = [];

function populateCategories() {
  // Get unique categories and their counts
  const categoryCounts = {};
  allIcons.forEach(icon => {
    const cat = getCategoryLabel(icon);
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  // Sort by count descending
  const sorted = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // Add "All icons" at the top
  const allItem = { name: "All icons", count: allIcons.length };

  els.categories.innerHTML = "";

  // Create "All icons" button
  const allBtn = document.createElement("button");
  allBtn.className = "category-btn active";
  allBtn.innerHTML = `${allItem.name} <span class="category-count">${allItem.count}</span>`;
  allBtn.addEventListener("click", () => {
    selectedCategory = null;
    document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
    allBtn.classList.add("active");
    rerender();
  });
  els.categories.appendChild(allBtn);

  // Create category buttons
  sorted.forEach(({ name, count }) => {
    const btn = document.createElement("button");
    btn.className = "category-btn";
    btn.innerHTML = `${name} <span class="category-count">${count}</span>`;
    btn.addEventListener("click", () => {
      selectedCategory = name;
      document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      rerender();
    });
    els.categories.appendChild(btn);
  });
}

function rerender() {
  const query = els.search.value;
  const style = els.style.value;
  const size = Number(els.size.value);

  let filtered = allIcons.filter((icon) => iconMatches(icon, query));
  
  // Filter by selected category if one is chosen
  if (selectedCategory) {
    filtered = filtered.filter(icon => getCategoryLabel(icon) === selectedCategory);
  }

  els.grid.innerHTML = "";

  if (filtered.length === 0) {
    els.status.textContent = "No matching icons.";
    return;
  }

  els.status.textContent = `${filtered.length} icon(s)`;

  // For each icon, check which styles are available and only render those
  for (const icon of filtered) {
    // Check if this icon has the selected style
    if (icon.styles && !icon.styles.includes(style)) {
      // Skip this icon for the selected style (don't show error)
      // Find the first available style for this icon
      if (icon.styles && icon.styles.length > 0) {
        els.grid.appendChild(renderCard(icon, icon.styles[0], size));
      }
    } else {
      els.grid.appendChild(renderCard(icon, style, size));
    }
  }
}

/* --------------------------------------------------
   Init
-------------------------------------------------- */
async function loadIconsJson() {
  const res = await fetch("./metadata/icons.json");
  if (!res.ok) throw new Error("Failed to load icons.json");
  return res.json();
}

async function main() {
  try {
    const data = await loadIconsJson();
    allIcons = data.icons || [];
    els.status.textContent = `Loaded ${allIcons.length} icon(s).`;
    populateCategories();
    rerender();
  } catch (e) {
    els.status.textContent = `Error: ${e.message}`;
  }
}

/* --------------------------------------------------
   Events
-------------------------------------------------- */
els.search.addEventListener("input", rerender);
els.style.addEventListener("change", rerender);
els.size.addEventListener("change", rerender);

main();
