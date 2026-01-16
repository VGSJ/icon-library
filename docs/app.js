const els = {
  grid: document.getElementById("grid"),
  status: document.getElementById("status"),
  search: document.getElementById("search"),
  clearSearchBtn: document.getElementById("clearSearchBtn"),
  style: document.getElementById("style"),
  categories: document.getElementById("categories"),
  detailsPanel: document.getElementById("detailsPanel"),
  iconName: document.getElementById("iconName"),
  previewBox: document.getElementById("previewBox"),
  copyBtn: document.getElementById("copyBtn"),
  downloadBtn: document.getElementById("downloadBtn"),
  sizeButtons: document.getElementById("sizeButtons"),
};

let selectedCategory = null; // Track selected category filter
let selectedIcon = null; // Track selected icon in details panel
let detailsFormat = localStorage.getItem("detailsFormat") || "svg"; // Track selected format
let detailsSize = parseInt(localStorage.getItem("detailsSize") || "32"); // Track selected size for details preview
const ICON_SIZE = 32; // Fixed icon size for grid

/* --------------------------------------------------
   Details Panel
-------------------------------------------------- */
function openDetailsPanel(icon, previewElement) {
  if (!icon || !previewElement) return; // Guard against null/undefined
  
  // Remove selected state from previously selected preview
  document.querySelectorAll(".preview.selected").forEach(p => p.classList.remove("selected"));
  
  selectedIcon = icon;
  // Keep the user's previously selected format (from localStorage)
  // detailsFormat is already loaded from localStorage on init
  // Set size to 24, or first available size, or use saved size if available
  if (icon.sizes && icon.sizes.includes(detailsSize)) {
    // Keep the saved size if it's available for this icon
  } else {
    detailsSize = (icon.sizes?.includes(24)) ? 24 : (icon.sizes?.length > 0) ? icon.sizes[0] : 32;
  }
  
  els.iconName.textContent = icon.name;
  
  // Mark the clicked preview as selected
  previewElement.classList.add("selected");
  
  updateDetailsPreview();
  updateDetailsButtons();
}

function updateDetailsPreview() {
  if (!selectedIcon) return;
  
  els.previewBox.innerHTML = "…";
  
  const style = els.style.value || "outline";
  
  fetchSvg(selectedIcon.name, style, detailsSize)
    .then((svg) => {
      const container = document.createElement("div");
      container.innerHTML = svg;
      els.previewBox.innerHTML = "";
      els.previewBox.appendChild(container.firstElementChild || container);
    })
    .catch(() => {
      els.previewBox.innerHTML = "SVG not found";
    });
}

function updateDetailsButtons() {
  // Update format buttons
  document.querySelectorAll(".format-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.format === detailsFormat);
  });
  
  // Generate size buttons from icon's available sizes
  if (selectedIcon && selectedIcon.sizes) {
    els.sizeButtons.innerHTML = "";
    selectedIcon.sizes.forEach(size => {
      const btn = document.createElement("button");
      btn.className = "size-btn";
      btn.textContent = `${size}`;
      btn.dataset.size = size;
      if (size === detailsSize) {
        btn.classList.add("active");
      }
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        detailsSize = size;
        localStorage.setItem("detailsSize", detailsSize);
        updateDetailsButtons();
        updateDetailsPreview();
      });
      els.sizeButtons.appendChild(btn);
    });
  }
}

// Convert SVG to PNG using canvas with higher resolution for better quality
async function svgToPng(svgText, size) {
  return new Promise((resolve, reject) => {
    // Render at 3x resolution for better quality, then export at requested size
    const scale = 3;
    const canvas = document.createElement("canvas");
    canvas.width = size * scale;
    canvas.height = size * scale;
    const ctx = canvas.getContext("2d");
    
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size * scale, size * scale);
      canvas.toBlob(resolve, "image/png");
    };
    img.onerror = () => reject(new Error("Failed to convert SVG to PNG"));
    
    // Convert SVG to data URL
    const blob = new Blob([svgText], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    img.src = url;
  });
}

// Format button listeners
document.querySelectorAll(".format-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    detailsFormat = btn.dataset.format;
    localStorage.setItem("detailsFormat", detailsFormat);
    updateDetailsButtons();
    updateDetailsPreview();
  });
});

// Copy button listener
els.copyBtn?.addEventListener("click", async () => {
  if (!selectedIcon) return;
  
  try {
    const style = els.style.value || "outline";
    const svg = await fetchSvg(selectedIcon.name, style, detailsSize);
    
    if (detailsFormat === "png") {
      const pngBlob = await svgToPng(svg, detailsSize);
      const pngData = await pngBlob.arrayBuffer();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob })
      ]);
      showToast(`Copied PNG: ${selectedIcon.name}`);
    } else {
      const ok = await copyText(svg);
      if (ok) {
        showToast(`Copied: ${selectedIcon.name}`);
      } else {
        openManualCopy(svg);
      }
    }
  } catch (e) {
    showToast(`Error: ${e.message}`);
  }
});

// Download button listener
els.downloadBtn?.addEventListener("click", async () => {
  if (!selectedIcon) return;
  
  try {
    const style = els.style.value || "outline";
    const svg = await fetchSvg(selectedIcon.name, style, detailsSize);
    const filename = `${selectedIcon.name}-${style}-${detailsSize}.${detailsFormat}`;
    
    let blob;
    if (detailsFormat === "png") {
      blob = await svgToPng(svg, detailsSize);
    } else {
      blob = new Blob([svg], { type: "image/svg+xml" });
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`Downloaded: ${filename}`);
  } catch (e) {
    showToast(`Error: ${e.message}`);
  }
});

/* --------------------------------------------------
   Toast
-------------------------------------------------- */
const toast = document.createElement("div");
toast.className = "toast";
document.body.appendChild(toast);
let toastTimeout;

function showToast(msg) {
  clearTimeout(toastTimeout);
  toast.textContent = msg;
  toast.classList.add("show");
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 1400);
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

function capitalizeCategory(cat) {
  // Category display name overrides
  const displayNames = {
    'heating ventilation air conditioning': 'HVAC'
  };
  
  if (displayNames[cat]) {
    return displayNames[cat];
  }
  
  // Known abbreviations that should be ALL CAPS
  const abbreviations = new Set(['ai', 'vr', 'led', 'hvac', 'aed', 'cctv', 'gps', 'qr', 'ahu', 'pv']);
  
  return cat
    .split(' ')
    .map(word => {
      if (abbreviations.has(word.toLowerCase())) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function getCategoryLabel(icon) {
  // Supports both old format (string) and new format ({id,label})
  if (!icon || !icon.category) return "uncategorized";
  if (typeof icon.category === "string") return icon.category;
  return icon.category.label || "uncategorized";
}

function normalizeStyle(style) {
  if (style === "fill") return "filled";
  if (style === "outlined") return "outline";
  return style;
}

async function fetchSvg(name, style, size) {
  const normalizedStyle = normalizeStyle(style);
  
  // Try multiple path patterns in order
  const paths = [
    `./raw-svg/${normalizedStyle}/${size}/icon-${name}-${normalizedStyle}-${size}.svg`,
    `./raw-svg/${normalizedStyle}/${size}/icon-${name}-${normalizedStyle}-${size}px.svg`,
    `./raw-svg/${normalizedStyle}/${size}px/icon-${name}-${normalizedStyle}-${size}px.svg`
  ];
  
  for (const path of paths) {
    const res = await fetch(path);
    if (res.ok) return res.text();
  }
  
  throw new Error(`Missing SVG for ${name} (${style}/${size})`);
}

function iconMatches(icon, query) {
  if (!icon || !query) return !query; // No query = match all; no icon = no match
  const q = normalize(query);

  const categoryLabel = getCategoryLabel(icon);

  const hay = [
    icon.name || "",
    categoryLabel || "",
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
  const preview = document.createElement("button");
  preview.type = "button";
  preview.className = "preview";
  preview.title = "Click to view details";
  preview.innerHTML = "…";

  // Add click listener before fetching SVG
  preview.addEventListener("click", async () => {
    openDetailsPanel(icon, preview);
  });

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

  return preview;
}

/* --------------------------------------------------
   App state
-------------------------------------------------- */
let allIcons = [];

function populateCategories() {
  // Calculate category counts based on current search filter
  const query = els.search?.value || "";
  const filteredBySearch = allIcons.filter((icon) => iconMatches(icon, query));
  
  const categoryCounts = {};
  filteredBySearch.forEach(icon => {
    const cat = getCategoryLabel(icon);
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  // Sort alphabetically by name
  const sorted = Object.entries(categoryCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));

  // Add "All icons" at the top
  const allItem = { name: "All icons", count: filteredBySearch.length };

  els.categories.innerHTML = "";

  // Create "All icons" button
  const allBtn = document.createElement("button");
  allBtn.className = "category-btn" + (selectedCategory === null ? " active" : "");
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
    btn.className = "category-btn" + (selectedCategory === name ? " active" : "");
    const displayName = capitalizeCategory(name);
    btn.innerHTML = `${displayName} <span class="category-count">${count}</span>`;
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

  let filtered = allIcons.filter((icon) => iconMatches(icon, query));
  
  // Update category counts based on current search
  populateCategories();
  
  // Show/hide clear button based on search input
  if (els.clearSearchBtn) {
    els.clearSearchBtn.style.display = query ? "flex" : "none";
  }
  
  // Filter by selected category if one is chosen
  if (selectedCategory) {
    filtered = filtered.filter(icon => getCategoryLabel(icon) === selectedCategory);
  }

  els.grid.innerHTML = "";

  if (filtered.length === 0) {
    els.status.textContent = "No matching icons.";
    selectedIcon = null;
    return;
  }

  els.status.textContent = "Select an icon to copy the SVG.";

  // For each icon, render with selected style or first available style
  for (const icon of filtered) {
    const iconStyle = (icon.styles?.includes(style)) ? style : (icon.styles?.length > 0 ? icon.styles[0] : style);
    els.grid.appendChild(renderCard(icon, iconStyle, ICON_SIZE));
  }
  
  // Select the first icon by default after rerender
  setTimeout(() => {
    const firstPreview = document.querySelector(".preview");
    if (firstPreview && filtered.length > 0) {
      openDetailsPanel(filtered[0], firstPreview);
    }
  }, 0);
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
    populateCategories();
    rerender();  // Auto-selects first icon via rerender()
  } catch (e) {
    els.status.textContent = `Error: ${e.message}`;
  }
}

/* --------------------------------------------------
   Events
-------------------------------------------------- */
els.search?.addEventListener("input", rerender);
els.style?.addEventListener("change", rerender);

// Clear search button
els.clearSearchBtn?.addEventListener("click", () => {
  els.search.value = "";
  rerender();
});

// Ensure all DOM elements exist before trying to use them
Object.entries(els).forEach(([key, el]) => {
  if (!el) console.warn(`Missing DOM element: #${key}`);
});

main();
