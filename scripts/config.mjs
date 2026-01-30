/**
 * Centralized configuration for all icon-library scripts
 * Single source of truth for constants and paths
 *
 * Import with: import { CONFIG, PATHS } from './config.mjs';
 */

export const CONFIG = {
  // Application metadata
  app: {
    name: "DTUX Icon Library",
    version: "1.0.0",
    description: "Comprehensive icon library with Figma sync",
  },

  // Cache configuration
  cache: {
    svgTTL: 86400, // SVG cache TTL in seconds (24 hours)
    metadataTTL: 3600, // Metadata cache TTL in seconds (1 hour)
    enableCaching: true,
  },

  // Figma sync configuration
  sync: {
    batchSize: 3, // Number of concurrent requests to Figma
    timeout: 30000, // Request timeout in milliseconds
    retries: 3, // Number of retry attempts on failure
    baseDelay: 1000, // Base delay for exponential backoff (ms)
  },

  // Icon configuration
  icons: {
    sizes: [16, 24, 32, 40, 48], // Available icon sizes in pixels
    styles: ["filled", "outline"], // Available icon styles
    defaultSize: 32,
    defaultStyle: "outline",
  },

  // All 28 icon categories
  categories: [
    "heating ventilation air conditioning",
    "actions & general interface",
    "arrows",
    "power & electrical",
    "nature & landscaping",
    "building & construction",
    "system & technology",
    "document & statistics",
    "editor",
    "media & entertainment",
    "security",
    "transport",
    "furniture & things",
    "light",
    "communication",
    "layout & grid",
    "health & safety",
    "people",
    "geometry",
    "housekeeping",
    "fire",
    "brickschema relationships",
    "time & date",
    "payment & rewards",
    "wayfinding",
    "ai & vr",
    "vertical transport",
    "flags",
  ],

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || "info", // info, warn, error, debug
    format: "detailed", // simple, detailed, json
    timestamps: true,
  },

  // Development configuration
  dev: {
    debug: process.env.DEBUG === "true",
    verbose: process.env.VERBOSE === "true",
    port: 8080,
  },
};

export const PATHS = {
  // Root directory
  root: process.cwd(),

  // Documentation directories
  docs: "docs",
  docsInternals: "docs/internals",

  // SVG storage
  rawSvg: "docs/raw-svg",

  // Metadata
  metadata: "docs/metadata/icons.json",
  metadataDir: "docs/metadata",

  // Configuration files
  corrections: "metadata-corrections.json",
  env: ".env",
  envExample: ".env.example",

  // Scripts
  scripts: "scripts",

  // Website
  website: "docs",
  index: "docs/index.html",
  appJs: "docs/app.js",
  stylesCss: "docs/styles.css",
};

/**
 * Validate configuration at startup
 */
export function validateConfig() {
  const required = ["FIGMA_TOKEN", "FIGMA_FILE_KEY"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        "Copy .env.example to .env and fill in your Figma credentials."
    );
  }

  return true;
}

/**
 * Get a category ID from category name
 * Example: "heating ventilation air conditioning" → "heating-ventilation-air-conditioning"
 */
export function getCategoryId(categoryName) {
  return categoryName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/&/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/**
 * Check if a category is valid
 */
export function isValidCategory(categoryName) {
  return CONFIG.categories.includes(categoryName);
}

/**
 * Check if a size is valid
 */
export function isValidSize(size) {
  return CONFIG.icons.sizes.includes(parseInt(size));
}

/**
 * Check if a style is valid
 */
export function isValidStyle(style) {
  return CONFIG.icons.styles.includes(style);
}

/**
 * Normalize style name (fill → filled, outlined → outline)
 */
export function normalizeStyle(style) {
  if (style === "fill") return "filled";
  if (style === "outlined") return "outline";
  return style;
}
