/**
 * Main Application Entry Point
 * Loads and initializes all modular components
 */

import logger from "../src/logger.mjs";
import state from "../src/components/state.js";
import {
  fetchIconsMetadata,
  fetchSvg,
  generateJsxCode,
  generateVueCode,
  generateCssCode,
} from "../src/components/api.js";
import { copyText, debounce, normalizeStyle, getCacheBuster } from "../src/components/utils.js";
import {
  renderIconGrid,
  renderCategoryList,
  showNotification,
  updatePreview,
  showLoading,
  hideLoading,
} from "../src/components/dom.js";

// DOM Elements
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

// Search debounce
const debouncedSearch = debounce(handleSearch, 300);

/**
 * Initialize Application
 */
async function initializeApp() {
  logger.info("Initializing icon library application");

  try {
    // Load icons metadata
    showLoading(els.grid);
    const icons = await fetchIconsMetadata();

    if (!icons || icons.length === 0) {
      throw new Error("No icons found");
    }

    state.setAllIcons(icons);
    hideLoading(els.grid);

    // Render initial UI
    renderCategoryList(icons, els.categories, handleCategorySelect);
    renderIconGrid(icons, els.grid, handleIconClick);

    // Setup event listeners
    setupEventListeners();

    logger.info(`Loaded ${icons.length} icons successfully`);
    showNotification("Icon library loaded successfully", "success");
  } catch (error) {
    logger.error("Failed to initialize app:", error);
    hideLoading(els.grid);
    els.grid.innerHTML = `<p class="error">Failed to load icons: ${error.message}</p>`;
    showNotification("Failed to load icon library", "error");
  }
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  // Search
  els.search.addEventListener("input", (e) => {
    state.setSearchQuery(e.target.value);
    debouncedSearch();

    // Show/hide clear button
    els.clearSearchBtn.style.display = e.target.value ? "block" : "none";
  });

  els.clearSearchBtn.addEventListener("click", () => {
    els.search.value = "";
    state.setSearchQuery("");
    els.clearSearchBtn.style.display = "none";
    renderIconGrid(state.allIcons, els.grid, handleIconClick);
  });

  // Style filter
  els.style.addEventListener("change", (_e) => {
    // Re-render icons with new style
    renderIconGrid(state.filteredIcons, els.grid, handleIconClick);
  });

  // Format selection in details panel
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("format-btn")) {
      document.querySelectorAll(".format-btn").forEach((btn) => {
        btn.classList.remove("active");
      });
      e.target.classList.add("active");
      state.setFormat(e.target.dataset.format);
      updateDetailsDisplay();
    }
  });

  // Size selection in details panel
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("size-btn")) {
      document.querySelectorAll(".size-btn").forEach((btn) => {
        btn.classList.remove("active");
      });
      e.target.classList.add("active");
      state.setSize(parseInt(e.target.dataset.size));
      updateDetailsDisplay();
    }
  });

  // Copy button
  els.copyBtn.addEventListener("click", handleCopyCode);

  // Download button
  els.downloadBtn.addEventListener("click", handleDownloadIcon);

  // Listen to state changes
  state.on("categoryChanged", () => {
    handleCategorySelect();
  });

  state.on("iconSelected", () => {
    showDetailsPanel();
  });

  state.on("formatChanged", () => {
    updateDetailsDisplay();
  });

  state.on("sizeChanged", () => {
    updateDetailsDisplay();
  });

  state.on("searchChanged", () => {
    debouncedSearch();
  });
}

/**
 * Handle Category Selection
 */
function handleCategorySelect(event) {
  if (event) {
    const categoryName = event.target.dataset.category;
    state.setCategory(categoryName);

    // Update UI
    document.querySelectorAll(".category-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    event.target.classList.add("active");
  }

  // Filter and render
  state.filterIcons();
  renderIconGrid(state.filteredIcons, els.grid, handleIconClick);
}

/**
 * Handle Icon Click
 */
function handleIconClick(icon) {
  state.setIcon(icon);
  showDetailsPanel();
}

/**
 * Show Details Panel
 */
async function showDetailsPanel() {
  const icon = state.selectedIcon;
  if (!icon) return;

  try {
    // Get SVG content
    const style = normalizeStyle(els.style.value || "outline");
    const svgPath = `./raw-svg/${style}/32/icon-${icon.name}-${style}-32.svg${getCacheBuster()}`;
    const svgContent = await fetchSvg(svgPath);

    // Update icon name
    els.iconName.textContent = icon.name;

    // Update preview
    updatePreview(els.previewBox, svgContent, "svg");

    // Update format buttons
    document.querySelectorAll(".format-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.format === state.detailsFormat);
    });

    // Update size buttons
    updateSizeButtons(icon);

    // Show panel
    els.detailsPanel.classList.add("active");

    // Update code display
    updateDetailsDisplay();

    logger.info(`Displayed details for icon: ${icon.name}`);
  } catch (error) {
    logger.error("Failed to show details panel:", error);
    showNotification("Failed to load icon details", "error");
  }
}

/**
 * Update Size Buttons
 */
function updateSizeButtons(icon) {
  if (!icon.sizes || icon.sizes.length === 0) {
    els.sizeButtons.innerHTML = "";
    return;
  }

  els.sizeButtons.innerHTML = icon.sizes
    .map(
      (size) => `
    <button class="size-btn ${size === state.detailsSize ? "active" : ""}" data-size="${size}">
      ${size}px
    </button>
  `
    )
    .join("");
}

/**
 * Update Details Display
 */
async function updateDetailsDisplay() {
  const icon = state.selectedIcon;
  if (!icon) return;

  try {
    let code = "";

    if (state.detailsFormat === "jsx") {
      code = generateJsxCode(icon.name, state.detailsSize);
    } else if (state.detailsFormat === "vue") {
      code = generateVueCode(icon.name, state.detailsSize);
    } else if (state.detailsFormat === "css") {
      code = generateCssCode(icon.name, state.detailsSize);
    } else {
      code = `SVG: ${icon.name}-${normalizeStyle(els.style.value || "outline")}-${state.detailsSize}.svg`;
    }

    // Update code preview if it exists
    const codePreview = document.querySelector("#code-preview code");
    if (codePreview) {
      codePreview.textContent = code;
    }

    logger.debug(`Updated details display for format: ${state.detailsFormat}`);
  } catch (error) {
    logger.error("Failed to update details display:", error);
  }
}

/**
 * Handle Search
 */
function handleSearch() {
  const query = state.searchQuery.toLowerCase();

  if (query === "") {
    state.setAllIcons(state.allIcons);
    renderIconGrid(state.allIcons, els.grid, handleIconClick);
  } else {
    const results = state.allIcons.filter(
      (icon) =>
        icon.name.toLowerCase().includes(query) ||
        icon.keywords?.some((kw) => kw.toLowerCase().includes(query))
    );

    renderIconGrid(results, els.grid, handleIconClick);
    logger.debug(`Search found ${results.length} icons for "${query}"`);
  }
}

/**
 * Handle Copy Code
 */
async function handleCopyCode() {
  const icon = state.selectedIcon;
  if (!icon) return;

  try {
    let code = "";

    if (state.detailsFormat === "jsx") {
      code = generateJsxCode(icon.name, state.detailsSize);
    } else if (state.detailsFormat === "vue") {
      code = generateVueCode(icon.name, state.detailsSize);
    } else if (state.detailsFormat === "css") {
      code = generateCssCode(icon.name, state.detailsSize);
    }

    if (code) {
      await copyText(code);
      showNotification(`Copied ${state.detailsFormat} code to clipboard`, "success");
      logger.info(`Copied ${state.detailsFormat} code for ${icon.name}`);
    }
  } catch (error) {
    logger.error("Failed to copy code:", error);
    showNotification("Failed to copy code", "error");
  }
}

/**
 * Handle Download Icon
 */
async function handleDownloadIcon() {
  const icon = state.selectedIcon;
  if (!icon) return;

  try {
    const style = normalizeStyle(els.style.value || "outline");
    const svgPath = `./raw-svg/${style}/${state.detailsSize}/icon-${icon.name}-${style}-${state.detailsSize}.svg${getCacheBuster()}`;
    const svgContent = await fetchSvg(svgPath);

    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `icon-${icon.name}-${style}-${state.detailsSize}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification(`Downloaded ${icon.name}.svg`, "success");
    logger.info(`Downloaded icon: ${icon.name}`);
  } catch (error) {
    logger.error("Failed to download icon:", error);
    showNotification("Failed to download icon", "error");
  }
}

// Initialize app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
