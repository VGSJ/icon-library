/**
 * API Module
 * Handles all data fetching and API interactions
 */

import logger from "../logger.mjs";
import { getCacheBuster } from "./utils.js";

/**
 * Fetch icons metadata
 * @returns {Promise<Object>} Icons metadata object
 */
export async function fetchIconsMetadata() {
  try {
    const cachebust = getCacheBuster();
    const response = await fetch(`./metadata/icons.json?${cachebust}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status}`);
    }
    const data = await response.json();
    logger.info("Icons metadata loaded successfully");
    return data;
  } catch (error) {
    logger.error("Failed to fetch icons metadata:", error);
    throw error;
  }
}

/**
 * Fetch SVG content
 * @param {string} path - SVG file path
 * @returns {Promise<string>} SVG content
 */
export async function fetchSvg(path) {
  try {
    const cachebust = getCacheBuster();
    const response = await fetch(`${path}?${cachebust}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch SVG: ${response.status}`);
    }
    const content = await response.text();
    logger.debug(`SVG loaded: ${path}`);
    return content;
  } catch (error) {
    logger.error(`Failed to fetch SVG ${path}:`, error);
    throw error;
  }
}

/**
 * Convert SVG to PNG
 * @param {string} svgContent - SVG content as string
 * @param {number} size - Canvas size
 * @returns {Promise<Blob>} PNG blob
 */
export async function svgToPng(svgContent, size = 32) {
  return new Promise((resolve, reject) => {
    try {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
      const _svgElement = svgDoc.documentElement;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const scale = window.devicePixelRatio || 1;

      canvas.width = size * scale;
      canvas.height = size * scale;
      ctx.scale(scale, scale);

      const img = new Image();
      const svgBlob = new Blob([svgContent], { type: "image/svg+xml" });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => {
          if (blob) {
            logger.debug(`Converted SVG to PNG (${size}px)`);
            resolve(blob);
          } else {
            reject(new Error("Failed to convert canvas to blob"));
          }
        }, "image/png");
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load SVG image"));
      };

      img.src = url;
    } catch (error) {
      logger.error("Failed to convert SVG to PNG:", error);
      reject(error);
    }
  });
}

/**
 * Generate JSX code for icon
 * @param {Object} icon - Icon object
 * @param {string} size - Icon size
 * @param {string} style - Icon style
 * @returns {string} JSX code
 */
export function generateJsxCode(icon, size = "32", style = "filled") {
  const iconPath = `./raw-svg/${style}/${size}/icon-${icon.name}-${style}-${size}.svg`;
  return `import React from 'react';

export const ${icon.name.replace(/-/g, "")} = (props) => (
  <img
    src="${iconPath}"
    alt="${icon.name}"
    width="${size}"
    height="${size}"
    {...props}
  />
);`;
}

/**
 * Generate Vue component code for icon
 * @param {Object} icon - Icon object
 * @param {string} size - Icon size
 * @param {string} style - Icon style
 * @returns {string} Vue component code
 */
export function generateVueCode(icon, size = "32", style = "filled") {
  const iconPath = `./raw-svg/${style}/${size}/icon-${icon.name}-${style}-${size}.svg`;
  return `<template>
  <img
    :src="'${iconPath}'"
    :alt="'${icon.name}'"
    :width="size"
    :height="size"
    v-bind="$attrs"
  />
</template>

<script>
export default {
  name: '${icon.name}',
  props: {
    size: {
      type: String,
      default: '${size}'
    }
  }
};
</script>`;
}

/**
 * Generate CSS code for icon as background
 * @param {Object} icon - Icon object
 * @param {string} size - Icon size
 * @param {string} style - Icon style
 * @returns {string} CSS code
 */
export function generateCssCode(icon, size = "32", style = "filled") {
  const className = icon.name.replace(/-/g, "-");
  return `.icon-${className} {
  background-image: url('./raw-svg/${style}/${size}/icon-${icon.name}-${style}-${size}.svg');
  background-size: contain;
  background-repeat: no-repeat;
  width: ${size}px;
  height: ${size}px;
  display: inline-block;
}`;
}

export default {
  fetchIconsMetadata,
  fetchSvg,
  svgToPng,
  generateJsxCode,
  generateVueCode,
  generateCssCode,
};
