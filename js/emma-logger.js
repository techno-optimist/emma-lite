/**
 * Emma Production-Safe Logger
 * Prevents sensitive information leakage in production
 */

(function() {
  'use strict';

  class EmmaLogger {
    constructor() {
      // Use existing environment detection or fallback
      this.isProduction = window.EMMA_ENV === 'production';
      this.debugEnabled = window.EMMA_DEBUG === true;
      
      // Log levels: error, warn, info, debug
      this.logLevel = this.isProduction ? 'warn' : 'debug';
      
      console.log(`🔒 Emma Logger initialized: ${this.isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
    }

    /**
     * Only logs errors (always enabled)
     */
    error(message, ...args) {
      console.error(`❌ ${message}`, ...args);
    }

    /**
     * Logs warnings (enabled in dev and prod)
     */
    warn(message, ...args) {
      console.warn(`⚠️ ${message}`, ...args);
    }

    /**
     * Logs info (disabled in production)
     */
    info(message, ...args) {
      if (!this.isProduction) {
        console.log(`ℹ️ ${message}`, ...args);
      }
    }

    /**
     * Debug logs (only in development with debug flag)
     */
    debug(message, ...args) {
      if (this.debugEnabled) {
        console.log(`🐛 ${message}`, ...args);
      }
    }

    /**
     * Security-sensitive logs (never in production)
     */
    security(message, ...args) {
      if (!this.isProduction) {
        console.log(`🔒 SECURITY: ${message}`, ...args);
      } else {
        // In production, only log that a security event occurred
        console.warn('🔒 Security event logged (details suppressed in production)');
      }
    }

    /**
     * Memory/vault operations (privacy-sensitive)
     */
    vault(message, ...args) {
      if (!this.isProduction) {
        console.log(`🗃️ VAULT: ${message}`, ...args);
      }
    }

    /**
     * User data processing (highly sensitive)
     */
    userData(message, ...args) {
      if (!this.isProduction) {
        console.log(`👤 USER: ${message}`, ...args);
      }
    }

    /**
     * Production-safe status logging
     */
    status(message, ...args) {
      // Always log status but sanitize in production
      if (this.isProduction) {
        // Remove potentially sensitive details in production
        const sanitized = message.replace(/passphrase|password|key|token/gi, '[REDACTED]');
        console.log(`📊 ${sanitized}`);
      } else {
        console.log(`📊 ${message}`, ...args);
      }
    }

    /**
     * Wrap existing console methods for backwards compatibility
     */
    static wrapConsole() {
      if (window.EMMA_ENV === 'production') {
        const originalLog = console.log;
        const originalInfo = console.info;
        
        // In production, suppress console.log and console.info
        console.log = function(...args) {
          // Only allow if explicitly marked as production-safe
          if (args[0] && typeof args[0] === 'string' && args[0].includes('[PROD-SAFE]')) {
            originalLog.apply(console, args);
          }
        };
        
        console.info = function(...args) {
          // Suppress info logs in production
        };
        
        console.warn('🔒 Console logging suppressed in production mode');
      }
    }
  }

  // Create global logger instance
  window.EmmaLogger = new EmmaLogger();

  // Optionally wrap console for backwards compatibility
  if (window.EMMA_ENV === 'production') {
    EmmaLogger.wrapConsole();
  }

})();
