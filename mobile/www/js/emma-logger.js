/**
 * Emma Production-Safe Logger
 * Prevents sensitive information leakage in production
 */

(function() {
  'use strict';

  class EmmaLogger {
    constructor() {
      this.isProduction = window.EMMA_ENV === 'production';
      this.debugEnabled = window.EMMA_DEBUG === true;
      this.logLevel = this.isProduction ? 'warn' : 'debug';
    }

    // Always log errors
    error(message, ...args) {
      console.error(`[ERR] ${message}`, ...args);
    }

    // Warnings (enabled in dev and prod)
    warn(message, ...args) {
      console.warn(`[WARN] ${message}`, ...args);
    }

    // Info (disabled in production)
    info(message, ...args) {
      if (!this.isProduction) {
        console.log(`[INFO] ${message}`, ...args);
      }
    }

    // Debug (only if explicitly enabled)
    debug(message, ...args) {
      if (this.debugEnabled) {
        console.log(`[DEBUG] ${message}`, ...args);
      }
    }

    // Security-sensitive logs (never detailed in production)
    security(message, ...args) {
      if (!this.isProduction) {
        console.log(`[SECURITY] ${message}`, ...args);
      } else {
        console.warn('🔒 Security event logged (details suppressed in production)');
      }
    }

    // Vault operations (privacy-sensitive)
    vault(message, ...args) {
      if (!this.isProduction) {
        console.log(`[VAULT] ${message}`, ...args);
      }
    }

    // User data processing (highly sensitive)
    userData(message, ...args) {
      if (!this.isProduction) {
        console.log(`[USER] ${message}`, ...args);
      }
    }

    // Production-safe status logging
    status(message, ...args) {
      if (this.isProduction) {
        const sanitized = String(message).replace(/passphrase|password|key|token/gi, '[REDACTED]');
        console.log(`[STATUS] ${sanitized}`);
      } else {
        console.log(`[STATUS] ${message}`, ...args);
      }
    }

    // Optional: wrap console for backwards compatibility
    static wrapConsole() {
      if (window.EMMA_ENV === 'production') {
        const originalLog = console.log;
        const originalInfo = console.info;
        console.log = function(...args) {
          if (args[0] && typeof args[0] === 'string' && args[0].includes('[PROD-SAFE]')) {
            originalLog.apply(console, args);
          }
        };
        console.info = function(..._args) {
          // Suppress info logs in production
        };
        console.warn('🔒 Console logging suppressed in production mode');
      }
    }
  }

  // Create global logger instance
  window.EmmaLogger = new EmmaLogger();

  if (window.EMMA_ENV === 'production') {
    EmmaLogger.wrapConsole();
  }
})();

