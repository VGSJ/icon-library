/**
 * Utility Functions Module
 * Common helper functions used throughout the app
 */

import logger from "../logger.mjs";

/**
 * Normalize category name
 * @param {string} category - Raw category name
 * @returns {string} Normalized category name
 */
export function normalizeCategory(category) {
  return category
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[&]/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Normalize style name
 * @param {string} style - Raw style name
 * @returns {string} Normalized style name
 */
export function normalizeStyle(style) {
  return (style || "filled").toLowerCase().trim();
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      logger.info("Text copied to clipboard");
      return true;
    }
  } catch {}

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    logger.info("Text copied to clipboard (fallback)");
    return ok;
  } catch {
    logger.error("Failed to copy text to clipboard");
    return false;
  }
}

/**
 * Debounce function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function
 * @param {Function} fn - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(fn, delay = 300) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
}

/**
 * Generate cache buster query parameter
 * @returns {string} Cache buster value
 */
export function getCacheBuster() {
  return `v=${Date.now()}`;
}

/**
 * Build SVG file path
 * @param {string} name - Icon name
 * @param {string} style - Icon style (filled/outline)
 * @param {number} size - Icon size
 * @returns {string} Full SVG path
 */
export function getSvgPath(name, style = "filled", size = 32) {
  const normalizedStyle = normalizeStyle(style);
  return `./raw-svg/${normalizedStyle}/${size}/icon-${name}-${normalizedStyle}-${size}.svg`;
}

/**
 * Check if element is in viewport
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if visible
 */
export function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Deep clone object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map((item) => deepClone(item));
  if (obj instanceof Object) {
    const cloned = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
}

export default {
  normalizeCategory,
  normalizeStyle,
  copyText,
  debounce,
  throttle,
  getCacheBuster,
  getSvgPath,
  isInViewport,
  formatFileSize,
  deepClone,
};
