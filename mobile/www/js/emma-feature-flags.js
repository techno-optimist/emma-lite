/**
 * Emma Feature Flags System
 * Safe architectural migration with instant rollback
 * 
 * CTO SAFETY PROTOCOL: Feature flags for zero-risk deployment
 * - Enable/disable new architecture instantly
 * - A/B testing capabilities
 * - Emergency rollback in seconds
 * 
 * FOR DEBBE: Safe innovation that never breaks ❤️
 */

class EmmaFeatureFlags {
  constructor() {
    this.flags = {
      // PHASE 2: Web App Primary Architecture
      USE_WEBAPP_PRIMARY: false, // Default to legacy for safety
      
      // Future features
      ENHANCED_CRYPTO: false,
      ADVANCED_INDEXEDDB: false,
      MULTI_VAULT_SUPPORT: false,
      
      // Debug features
      VERBOSE_LOGGING: false,
      DEVELOPMENT_MODE: false
    };
    
    // Load flags from localStorage
    this.loadFlags();
    
    console.log('🚩 Emma Feature Flags initialized:', this.flags);
  }

  /**
   * Load flags from localStorage
   */
  loadFlags() {
    try {
      const stored = localStorage.getItem('emma_feature_flags');
      if (stored) {
        const storedFlags = JSON.parse(stored);
        this.flags = { ...this.flags, ...storedFlags };
      }
      
      // Also check individual flag keys for backward compatibility
      Object.keys(this.flags).forEach(flag => {
        const individualValue = localStorage.getItem(flag);
        if (individualValue !== null) {
          this.flags[flag] = individualValue === 'true';
        }
      });
      
    } catch (error) {
      console.warn('⚠️ Failed to load feature flags:', error);
    }
  }

  /**
   * Save flags to localStorage
   */
  saveFlags() {
    try {
      localStorage.setItem('emma_feature_flags', JSON.stringify(this.flags));
      
      // Also save individual keys for easy access
      Object.entries(this.flags).forEach(([flag, value]) => {
        localStorage.setItem(flag, value.toString());
      });
      
      console.log('💾 Feature flags saved:', this.flags);
    } catch (error) {
      console.error('❌ Failed to save feature flags:', error);
    }
  }

  /**
   * Enable a feature flag
   */
  enable(flagName) {
    if (this.flags.hasOwnProperty(flagName)) {
      this.flags[flagName] = true;
      this.saveFlags();
      console.log(`🚩 Feature flag ENABLED: ${flagName}`);
      return true;
    } else {
      console.error(`❌ Unknown feature flag: ${flagName}`);
      return false;
    }
  }

  /**
   * Disable a feature flag
   */
  disable(flagName) {
    if (this.flags.hasOwnProperty(flagName)) {
      this.flags[flagName] = false;
      this.saveFlags();
      console.log(`🚩 Feature flag DISABLED: ${flagName}`);
      return true;
    } else {
      console.error(`❌ Unknown feature flag: ${flagName}`);
      return false;
    }
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(flagName) {
    return this.flags[flagName] === true;
  }

  /**
   * Get all flags
   */
  getAll() {
    return { ...this.flags };
  }

  /**
   * Reset all flags to defaults
   */
  reset() {
    this.flags = {
      USE_WEBAPP_PRIMARY: false,
      ENHANCED_CRYPTO: false,
      ADVANCED_INDEXEDDB: false,
      MULTI_VAULT_SUPPORT: false,
      VERBOSE_LOGGING: false,
      DEVELOPMENT_MODE: false
    };
    this.saveFlags();
    console.log('🔄 Feature flags reset to defaults');
  }

  /**
   * Emergency rollback: Disable all experimental features
   */
  emergencyRollback() {
    console.log('🚨 EMERGENCY ROLLBACK: Disabling all experimental features');
    
    this.flags.USE_WEBAPP_PRIMARY = false;
    this.flags.ENHANCED_CRYPTO = false;
    this.flags.ADVANCED_INDEXEDDB = false;
    this.flags.MULTI_VAULT_SUPPORT = false;
    
    this.saveFlags();
    
    // Force page reload to apply changes
    setTimeout(() => {
      console.log('🔄 EMERGENCY ROLLBACK: Reloading page to apply safe defaults');
      window.location.reload();
    }, 1000);
  }

  /**
   * CTO Testing: Enable Web App Primary architecture
   */
  enableWebAppPrimary() {
    console.log('🚀 CTO: Enabling Web App Primary Architecture');
    this.enable('USE_WEBAPP_PRIMARY');
    
    // Notify user
    if (window.showNotification) {
      window.showNotification('🚀 Web App Primary Architecture ENABLED', 'info');
    }
    
    return true;
  }

  /**
   * CTO Safety: Disable Web App Primary architecture (rollback)
   */
  disableWebAppPrimary() {
    console.log('🛡️ CTO: Disabling Web App Primary Architecture (rollback to legacy)');
    this.disable('USE_WEBAPP_PRIMARY');
    
    // Notify user
    if (window.showNotification) {
      window.showNotification('🛡️ Rolled back to Legacy Architecture', 'warning');
    }
    
    return true;
  }
}

// Create global instance
if (!window.emmaFeatureFlags) {
  window.emmaFeatureFlags = new EmmaFeatureFlags();
  console.log('🚩 Emma Feature Flags system ready');
} else {
  console.log('✅ Using existing Emma Feature Flags instance');
}

// CTO Console Commands for easy testing
window.enableWebAppPrimary = () => window.emmaFeatureFlags.enableWebAppPrimary();
window.disableWebAppPrimary = () => window.emmaFeatureFlags.disableWebAppPrimary();
window.emergencyRollback = () => window.emmaFeatureFlags.emergencyRollback();
window.getFeatureFlags = () => window.emmaFeatureFlags.getAll();

console.log('🚩 CTO COMMANDS READY:');
console.log('  enableWebAppPrimary() - Enable new architecture');
console.log('  disableWebAppPrimary() - Rollback to legacy');
console.log('  emergencyRollback() - Emergency safety rollback');
console.log('  getFeatureFlags() - View all flags');
