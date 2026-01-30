/**
 * State Management Module
 * Centralized state for the icon library application
 */

import logger from "../logger.mjs";

class AppState {
  constructor() {
    this.selectedCategory = null;
    this.selectedIcon = null;
    this.detailsFormat = "svg";
    this.detailsSize = "32";
    this.searchQuery = "";
    this.allIcons = [];
    this.filteredIcons = [];
    this.categories = [];

    // Listeners for state changes
    this.listeners = {
      categoryChanged: [],
      iconSelected: [],
      formatChanged: [],
      sizeChanged: [],
      searchChanged: [],
      iconsLoaded: [],
    };

    this.restoreFromStorage();
  }

  /**
   * Subscribe to state changes
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    } else {
      logger.warn(`Unknown event: ${event}`);
    }
  }

  /**
   * Unsubscribe from state changes
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    }
  }

  /**
   * Emit state change event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Set selected category
   * @param {string} category - Category name
   */
  setCategory(category) {
    if (this.selectedCategory !== category) {
      this.selectedCategory = category;
      this.saveToStorage("selectedCategory", category);
      this.emit("categoryChanged", category);
      logger.debug(`Category changed to: ${category}`);
    }
  }

  /**
   * Set selected icon
   * @param {Object} icon - Icon object
   */
  setIcon(icon) {
    if (this.selectedIcon !== icon) {
      this.selectedIcon = icon;
      this.emit("iconSelected", icon);
      logger.debug(`Icon selected: ${icon?.name || "none"}`);
    }
  }

  /**
   * Set export format
   * @param {string} format - Format (svg, png, jsx, vue, etc.)
   */
  setFormat(format) {
    if (this.detailsFormat !== format) {
      this.detailsFormat = format;
      this.saveToStorage("detailsFormat", format);
      this.emit("formatChanged", format);
      logger.debug(`Format changed to: ${format}`);
    }
  }

  /**
   * Set icon size
   * @param {string} size - Size (16, 24, 32, 40, 48, etc.)
   */
  setSize(size) {
    if (this.detailsSize !== size) {
      this.detailsSize = size;
      this.saveToStorage("detailsSize", size);
      this.emit("sizeChanged", size);
      logger.debug(`Size changed to: ${size}`);
    }
  }

  /**
   * Set search query and filter icons
   * @param {string} query - Search query
   */
  setSearchQuery(query) {
    this.searchQuery = query;
    this.filterIcons();
    this.emit("searchChanged", query);
    logger.debug(`Search query: ${query}`);
  }

  /**
   * Set all icons data
   * @param {Array} icons - Array of icon objects
   */
  setAllIcons(icons) {
    this.allIcons = icons;
    this.categories = [...new Set(icons.map((icon) => icon.category.id))];
    this.filterIcons();
    this.emit("iconsLoaded", { icons, categories: this.categories });
    logger.info(`Loaded ${icons.length} icons from ${this.categories.length} categories`);
  }

  /**
   * Filter icons based on category and search query
   */
  filterIcons() {
    let filtered = this.allIcons;

    // Filter by category if selected
    if (this.selectedCategory) {
      filtered = filtered.filter((icon) => icon.category.id === this.selectedCategory);
    }

    // Filter by search query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter((icon) => {
        const name = icon.name.toLowerCase();
        const tags = (icon.tags || []).join(" ").toLowerCase();
        const aliases = (icon.aliases || []).join(" ").toLowerCase();
        return name.includes(query) || tags.includes(query) || aliases.includes(query);
      });
    }

    this.filteredIcons = filtered;
    return filtered;
  }

  /**
   * Save state to localStorage
   * @param {string} key - State key
   * @param {*} value - State value
   */
  saveToStorage(key, value) {
    try {
      localStorage.setItem(`iconlib-${key}`, JSON.stringify(value));
    } catch (error) {
      logger.warn(`Failed to save ${key} to localStorage:`, error);
    }
  }

  /**
   * Restore state from localStorage
   */
  restoreFromStorage() {
    try {
      const category = localStorage.getItem("iconlib-selectedCategory");
      if (category) this.selectedCategory = JSON.parse(category);

      const format = localStorage.getItem("iconlib-detailsFormat");
      if (format) this.detailsFormat = JSON.parse(format);

      const size = localStorage.getItem("iconlib-detailsSize");
      if (size) this.detailsSize = JSON.parse(size);

      logger.debug("State restored from localStorage");
    } catch (error) {
      logger.warn("Failed to restore state from localStorage:", error);
    }
  }

  /**
   * Get current state as object
   */
  getState() {
    return {
      selectedCategory: this.selectedCategory,
      selectedIcon: this.selectedIcon,
      detailsFormat: this.detailsFormat,
      detailsSize: this.detailsSize,
      searchQuery: this.searchQuery,
      filteredIcons: this.filteredIcons,
      allIcons: this.allIcons,
      categories: this.categories,
    };
  }
}

// Export singleton instance
export default new AppState();
