/**
 * DOM Module
 * Handles all DOM manipulation and rendering
 */

import logger from "../logger.mjs";

/**
 * Render icon grid
 * @param {Array} icons - Array of icon objects
 * @param {HTMLElement} container - Container element
 * @param {Function} onIconClick - Click handler
 */
export function renderIconGrid(icons, container, onIconClick) {
  logger.debug(`Rendering ${icons.length} icons`);

  container.innerHTML = "";

  if (icons.length === 0) {
    container.innerHTML = '<p class="no-results">No icons found</p>';
    return;
  }

  const grid = document.createElement("div");
  grid.className = "icon-grid";

  icons.forEach((icon) => {
    const card = createIconCard(icon, onIconClick);
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

/**
 * Create icon card element
 * @param {Object} icon - Icon object
 * @param {Function} onIconClick - Click handler
 * @returns {HTMLElement} Card element
 */
function createIconCard(icon, onIconClick) {
  const card = document.createElement("div");
  card.className = "icon-card";
  card.setAttribute("data-icon-name", icon.name);

  const filledPath = `./raw-svg/filled/32/icon-${icon.name}-filled-32.svg?v=${Date.now()}`;

  card.innerHTML = `
    <img src="${filledPath}" alt="${icon.name}" loading="lazy">
    <div class="icon-info">
      <h4>${icon.name}</h4>
      <p class="category">${icon.category.label}</p>
    </div>
  `;

  card.addEventListener("click", () => onIconClick(icon));

  return card;
}

/**
 * Render category list
 * @param {Array} categories - Array of category IDs
 * @param {string} selected - Selected category
 * @param {Function} onCategorySelect - Selection handler
 * @returns {HTMLElement} Category list element
 */
export function renderCategoryList(categories, selected, onCategorySelect) {
  logger.debug(`Rendering ${categories.length} categories`);

  const list = document.createElement("div");
  list.className = "category-list";

  // Add "All" option
  const allButton = document.createElement("button");
  allButton.textContent = "All";
  allButton.className = selected === null ? "active" : "";
  allButton.addEventListener("click", () => onCategorySelect(null));
  list.appendChild(allButton);

  // Add category buttons
  categories.forEach((catId) => {
    const button = document.createElement("button");
    button.textContent = catId.replace(/-/g, " ");
    button.className = selected === catId ? "active" : "";
    button.addEventListener("click", () => onCategorySelect(catId));
    list.appendChild(button);
  });

  return list;
}

/**
 * Create icon details panel
 * @param {Object} icon - Icon object
 * @param {string} format - Export format
 * @param {string} size - Icon size
 * @param {Function} handlers - Handler functions
 * @returns {HTMLElement} Details panel element
 */
export function createDetailsPanel(icon, format, size, handlers) {
  const panel = document.createElement("div");
  panel.className = "details-panel";
  panel.id = "details-modal";

  let content = `
    <div class="modal-content">
      <button class="close-btn" aria-label="Close">&times;</button>
      <h2>${icon.name}</h2>
      <p class="category-tag">${icon.category.label}</p>
  `;

  if (icon.tags && icon.tags.length > 0) {
    content += `<div class="tags">${icon.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>`;
  }

  content += `
      <div class="preview-container">
        <div id="preview" class="preview"></div>
      </div>
      
      <div class="export-options">
        <div class="format-selector">
          <label>Format:</label>
          <select id="export-format">
            <option value="svg">SVG</option>
            <option value="png">PNG</option>
            <option value="jsx">JSX</option>
            <option value="vue">Vue</option>
            <option value="css">CSS</option>
          </select>
        </div>
        
        <div class="size-selector">
          <label>Size:</label>
          <select id="export-size">
            <option value="16">16px</option>
            <option value="24">24px</option>
            <option value="32" selected>32px</option>
            <option value="40">40px</option>
            <option value="48">48px</option>
          </select>
        </div>
      </div>
      
      <div class="code-display">
        <pre id="code-preview"><code></code></pre>
      </div>
      
      <div class="actions">
        <button id="copy-code" class="btn-primary">Copy Code</button>
        <button id="download-svg" class="btn-secondary">Download SVG</button>
      </div>
    </div>
  `;

  panel.innerHTML = content;

  // Attach handlers
  const closeBtn = panel.querySelector(".close-btn");
  const copyBtn = panel.querySelector("#copy-code");
  const downloadBtn = panel.querySelector("#download-svg");
  const formatSelect = panel.querySelector("#export-format");
  const sizeSelect = panel.querySelector("#export-size");

  closeBtn.addEventListener("click", handlers.onClose);
  copyBtn.addEventListener("click", handlers.onCopyCode);
  downloadBtn.addEventListener("click", handlers.onDownloadSvg);
  formatSelect.addEventListener("change", handlers.onFormatChange);
  sizeSelect.addEventListener("change", handlers.onSizeChange);

  panel.addEventListener("click", (e) => {
    if (e.target === panel) handlers.onClose();
  });

  return panel;
}

/**
 * Update preview display
 * @param {HTMLElement} previewElement - Preview container
 * @param {string} svgContent - SVG content
 * @param {string} format - Display format
 */
export function updatePreview(previewElement, svgContent, format = "svg") {
  logger.debug(`Updating preview as ${format}`);

  if (format === "svg") {
    previewElement.innerHTML = svgContent;
  } else if (format === "png") {
    const img = document.createElement("img");
    img.src = svgContent;
    previewElement.innerHTML = "";
    previewElement.appendChild(img);
  } else {
    previewElement.innerHTML = `<p>Preview not available for ${format}</p>`;
  }
}

/**
 * Show notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, info)
 * @param {number} duration - Duration in milliseconds
 */
export function showNotification(message, type = "info", duration = 3000) {
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.setAttribute("role", "alert");

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("fade-out");
    setTimeout(() => notification.remove(), 300);
  }, duration);

  logger.info(`Notification (${type}): ${message}`);
}

/**
 * Show loading indicator
 * @param {HTMLElement} container - Container element
 */
export function showLoading(container) {
  container.innerHTML = '<div class="loading"><p>Loading icons...</p></div>';
}

/**
 * Hide loading indicator
 * @param {HTMLElement} container - Container element
 */
export function hideLoading(container) {
  const loading = container.querySelector(".loading");
  if (loading) loading.remove();
}

export default {
  renderIconGrid,
  renderCategoryList,
  createDetailsPanel,
  updatePreview,
  showNotification,
  showLoading,
  hideLoading,
};
