/**
 * Unified Logger Module
 * Provides consistent logging across app and scripts
 * Debug levels: info, warn, error
 */

class Logger {
  constructor(namespace = "icon-library") {
    this.namespace = namespace;
    this.isDev = true; // Set to false in production
  }

  /**
   * Info level logging
   * @param {string} message - Log message
   * @param {*} data - Optional data to log
   */
  info(message, data = null) {
    const timestamp = new Date().toISOString();
    if (data) {
      console.log(`[${timestamp}] ℹ️  ${this.namespace}: ${message}`, data);
    } else {
      console.log(`[${timestamp}] ℹ️  ${this.namespace}: ${message}`);
    }
  }

  /**
   * Warning level logging
   * @param {string} message - Log message
   * @param {*} data - Optional data to log
   */
  warn(message, data = null) {
    const timestamp = new Date().toISOString();
    if (data) {
      console.warn(`[${timestamp}] ⚠️  ${this.namespace}: ${message}`, data);
    } else {
      console.warn(`[${timestamp}] ⚠️  ${this.namespace}: ${message}`);
    }
  }

  /**
   * Error level logging
   * @param {string} message - Log message
   * @param {Error|*} error - Error object or data
   */
  error(message, error = null) {
    const timestamp = new Date().toISOString();
    if (error instanceof Error) {
      console.error(`[${timestamp}] ❌ ${this.namespace}: ${message}`, error.message, error.stack);
    } else if (error) {
      console.error(`[${timestamp}] ❌ ${this.namespace}: ${message}`, error);
    } else {
      console.error(`[${timestamp}] ❌ ${this.namespace}: ${message}`);
    }
  }

  /**
   * Debug level logging (only in dev mode)
   * @param {string} message - Log message
   * @param {*} data - Data to log
   */
  debug(message, data = null) {
    if (!this.isDev) return;
    const timestamp = new Date().toISOString();
    if (data) {
      console.log(`[${timestamp}] 🔍 ${this.namespace}: ${message}`, data);
    } else {
      console.log(`[${timestamp}] 🔍 ${this.namespace}: ${message}`);
    }
  }

  /**
   * Performance timing helper
   * @param {string} label - Label for timing
   * @returns {Function} Call to stop timing
   */
  time(label) {
    const start = performance.now();
    return () => {
      const duration = (performance.now() - start).toFixed(2);
      this.debug(`${label} took ${duration}ms`);
      return parseFloat(duration);
    };
  }
}

// Export singleton instance
export default new Logger("icon-library");
