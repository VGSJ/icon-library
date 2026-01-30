/**
 * App Initialization Module
 * Main entry point for the icon library application
 */

import logger from "../logger.mjs";
import state from "./state.js";
import { fetchIconsMetadata, fetchSvg } from "./api.js";
import { copyText, debounce, normalizeStyle } from "./utils.js";
import {
  renderIconGrid,
  renderCategoryList,
  createDetailsPanel,
  updatePreview,
  showNotification,
} from "./dom.js";

/**
 * Initialize the application
 */
export async function initializeApp() {
  logger.info("Initializing icon library application");

  try {
    // Load DOM elements
    const iconGridContainer = document.getElementById("icon-grid");
    const categoryContainer = document.getElementById("categories");
    const searchInput = document.getElementById("search");

    if (!iconGridContainer || !categoryContainer || !searchInput) {
      throw new Error("Required DOM elements not found");
    }

    // Load icons metadata
    logger.info("Loading icons metadata...");
    const metadata = await fetchIconsMetadata();
    const icons = metadata.icons || [];

    // Initialize state with icons
    state.setAllIcons(icons);

    // Render initial categories
    const categories = state.categories;
    const categoryList = renderCategoryList(categories, null, handleCategorySelect);
    categoryContainer.appendChild(categoryList);

    // Render initial icon grid
    renderIconGrid(state.filteredIcons, iconGridContainer, handleIconClick);

    // Setup search with debounce
    const debouncedSearch = debounce((query) => {
      state.setSearchQuery(query);
      renderIconGrid(state.filteredIcons, iconGridContainer, handleIconClick);
    }, 300);

    searchInput.addEventListener("input", (e) => {
      debouncedSearch(e.target.value);
    });

    // Setup state change listeners
    state.on("categoryChanged", () => {
      renderIconGrid(state.filteredIcons, iconGridContainer, handleIconClick);
    });

    logger.info("Application initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize application:", error);
    showNotification("Failed to load icons", "error");
  }
}

/**
 * Handle category selection
 * @param {string} category - Selected category ID
 */
function handleCategorySelect(category) {
  state.setCategory(category);
}

/**
 * Handle icon click
 * @param {Object} icon - Selected icon
 */
async function handleIconClick(icon) {
  logger.debug(`Icon clicked: ${icon.name}`);
  state.setIcon(icon);
  showDetailsPanel(icon);
}

/**
 * Show details panel for icon
 * @param {Object} icon - Icon object
 */
async function showDetailsPanel(icon) {
  try {
    // Get SVG content
    const style = normalizeStyle("filled");
    const svgPath = `./raw-svg/${style}/32/icon-${icon.name}-${style}-32.svg`;
    const svgContent = await fetchSvg(svgPath);

    // Create and show panel
    const panel = createDetailsPanel(icon, state.detailsFormat, state.detailsSize, {
      onClose: closeDetailsPanel,
      onCopyCode: handleCopyCode,
      onDownloadSvg: handleDownloadSvg,
      onFormatChange: handleFormatChange,
      onSizeChange: handleSizeChange,
    });

    document.body.appendChild(panel);

    // Update preview
    const preview = panel.querySelector("#preview");
    updatePreview(preview, svgContent, "svg");

    // Set initial format
    const _formatSelect = panel.querySelector("#export-format");
    const _codePreview = panel.querySelector("#code-preview code");
    updateCodeDisplay(icon, state.detailsFormat, state.detailsSize);
  } catch (error) {
    logger.error("Failed to show details panel:", error);
    showNotification("Failed to load icon details", "error");
  }
}

/**
 * Close details panel
 */
function closeDetailsPanel() {
  const panel = document.getElementById("details-modal");
  if (panel) {
    panel.classList.add("fade-out");
    setTimeout(() => panel.remove(), 300);
  }
  state.setIcon(null);
}

/**
 * Handle code copy action
 */
async function handleCopyCode() {
  const codePreview = document.querySelector("#code-preview code");
  const code = codePreview.textContent;

  const success = await copyText(code);
  if (success) {
    showNotification("Code copied to clipboard!", "success");
  } else {
    showNotification("Failed to copy code", "error");
  }
}

/**
 * Handle SVG download action
 */
async function handleDownloadSvg() {
  const icon = state.selectedIcon;
  if (!icon) return;

  try {
    const style = normalizeStyle("filled");
    const svgPath = `./raw-svg/${style}/32/icon-${icon.name}-${style}-32.svg`;
    const svgContent = await fetchSvg(svgPath);

    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${icon.name}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification("SVG downloaded!", "success");
  } catch (error) {
    logger.error("Failed to download SVG:", error);
    showNotification("Failed to download SVG", "error");
  }
}

/**
 * Handle format change
 * @param {Event} e - Change event
 */
function handleFormatChange(e) {
  const format = e.target.value;
  state.setFormat(format);
  updateCodeDisplay(state.selectedIcon, format, state.detailsSize);
}

/**
 * Handle size change
 * @param {Event} e - Change event
 */
function handleSizeChange(e) {
  const size = e.target.value;
  state.setSize(size);
  updateCodeDisplay(state.selectedIcon, state.detailsFormat, size);
}

/**
 * Update code display
 * @param {object} _icon - Icon object
 * @param {string} _format - Format type
 * @param {string} _size - Icon size
 */
function updateCodeDisplay(_icon, _format, _size) {
  const codePreview = document.querySelector("#code-preview code");
  if (!codePreview || !_icon) return;

  const code = "";
  // Code generation will be handled by api module
  codePreview.textContent = code;
}

export default {
  initializeApp,
  handleCategorySelect,
  handleIconClick,
  showDetailsPanel,
  closeDetailsPanel,
};
