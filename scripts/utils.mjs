/**
 * Shared utilities for all Figma sync scripts
 * Centralizes common functions to reduce duplication
 */

import "dotenv/config";

/**
 * Get environment variable with validation
 * @param {string} name - Environment variable name
 * @param {boolean} required - Whether variable is required (default: true)
 * @returns {string} Environment variable value
 * @throws {Error} If required variable is missing
 */
export function env(name, required = true) {
  const value = process.env[name];
  if (!value && required) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || "";
}

/**
 * Validate all required environment variables before starting
 * @throws {Error} If any required variables are missing
 */
export function validateEnvironment() {
  const required = ["FIGMA_TOKEN", "FIGMA_FILE_KEY"];
  const missing = required.filter(name => !process.env[name]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

/**
 * Fetch from Figma API with error handling
 * @param {string} url - API endpoint URL
 * @returns {Promise<object>} Parsed JSON response
 * @throws {Error} On API failure or network error
 */
export async function figmaFetch(url) {
  const token = env("FIGMA_TOKEN");
  if (!token) throw new Error("FIGMA_TOKEN not set");
  
  let attempt = 0;
  const maxAttempts = 3;
  const baseDelay = 1000; // 1 second
  
  while (attempt < maxAttempts) {
    try {
      const res = await fetch(url, {
        headers: { "X-Figma-Token": token }
      });
      
      // Check rate limiting headers
      const rateLimitRemaining = res.headers.get("X-RateLimit-Remaining");
      const rateLimitReset = res.headers.get("X-RateLimit-Reset");
      
      if (!res.ok) {
        // Handle rate limiting specially
        if (res.status === 429) {
          const retryAfter = parseInt(rateLimitReset || baseDelay * Math.pow(2, attempt));
          const waitTime = Math.min(retryAfter, 60000); // Cap at 60 seconds
          
          console.warn(
            `⚠️  Rate limited by Figma API. Waiting ${Math.ceil(waitTime / 1000)}s before retry...`
          );
          
          await new Promise(resolve => setTimeout(resolve, waitTime));
          attempt++;
          continue;
        }
        
        throw new Error(`Figma API ${res.status}: ${res.statusText}`);
      }
      
      // Log rate limit status periodically
      if (rateLimitRemaining && parseInt(rateLimitRemaining) < 10) {
        console.warn(`⚠️  Figma API rate limit warning: ${rateLimitRemaining} requests remaining`);
      }
      
      return await res.json();
    } catch (error) {
      attempt++;
      if (attempt >= maxAttempts) {
        throw error;
      }
      
      // Exponential backoff for network errors
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`⚠️  API request failed, retrying in ${Math.ceil(delay / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error("Max API retries exceeded");
}

/**
 * Parse date and validate format
 * @param {string} dateStr - ISO date string
 * @returns {number} Milliseconds since epoch
 * @throws {Error} If date format is invalid
 */
export function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  
  const time = new Date(dateStr).getTime();
  if (isNaN(time)) {
    throw new Error(`Failed to parse date: ${dateStr}`);
  }
  
  return time;
}

/**
 * Normalize category name for consistent matching
 * @param {string} name - Category name
 * @returns {string} Normalized category name
 */
export function normalizeCategory(name) {
  return name.toLowerCase().trim();
}

/**
 * Generate category ID from category label
 * @param {string} label - Category label
 * @returns {string} Category ID
 */
export function getCategoryId(label) {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/&/g, "-")
    .replace(/-+/g, "-");
}
