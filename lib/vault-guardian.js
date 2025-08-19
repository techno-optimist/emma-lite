/**
 * VaultGuardian - The Single Source of Truth
 * 
 * Eliminates storage chaos by providing a unified interface
 * to the encrypted vault system. NO FALLBACKS. NO BYPASSES.
 * 
 * Core Principles:
 * 1. Vault is the only storage system
 * 2. Event-driven updates (no polling)
 * 3. Graceful failure when vault locked
 * 4. All settings encrypted in vault
 */

class VaultGuardian {
  constructor() {
    this.vaultService = null;
    this.isElectron = typeof window !== 'undefined' && window.emma && window.emma.vault;
    this.status = { 
      locked: true, 
      vaultId: null, 
      initialized: false 
    };
    this.subscribers = new Map(); // Event-driven updates
    this.cache = new Map(); // Performance optimization
    this.statusCache = null;
    this.initPromise = null;
    
    console.log('🛡️ VaultGuardian: Initializing single source of truth');
  }

  /**
   * Initialize the vault guardian
   * This replaces all the scattered vault initialization logic
   */
  async initialize() {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  async _doInitialize() {
    try {
      if (this.isElectron) {
        // Use Electron IPC API
        this.vaultService = window.emma.vault;
        console.log('🛡️ VaultGuardian: Using Electron vault API');
      } else {
        // Import VaultService for extension context
        const { VaultService } = await import('../js/vault/service.js');
        this.vaultService = VaultService;
        await this.vaultService.initialize();
        console.log('🛡️ VaultGuardian: Using extension vault service');
      }
      
      // Get initial status without polling
      this.status = await this._getStatusDirect();
      
      console.log('🛡️ VaultGuardian: Initialized', this.status);
      this.notifySubscribers('guardian-ready', this.status);
      
    } catch (error) {
      console.error('🛡️ VaultGuardian: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get vault status with intelligent caching
   * NO MORE EXCESSIVE POLLING - Uses 1-second cache
   */
  async getStatus() {
    // Use cache if recent (1 second)
    if (this.statusCache && Date.now() - this.statusCache.timestamp < 1000) {
      return this.statusCache.data;
    }
    
    const status = await this._getStatusDirect();
    this.statusCache = { 
      data: status, 
      timestamp: Date.now() 
    };
    
    return status;
  }

  async _getStatusDirect() {
    try {
      if (!this.vaultService) {
        await this.initialize();
      }
      
      let status;
      if (this.isElectron) {
        // Electron API
        status = await this.vaultService.status();
        // Map Electron response to standard format
        status = {
          unlocked: status.isUnlocked,
          vaultId: status.vaultId,
          initialized: status.initialized
        };
      } else {
        // Extension API
        status = await this.vaultService.getStatus();
      }
      
      // Update internal status and notify if changed
      const oldLocked = this.status.locked;
      this.status = {
        locked: !status.unlocked,
        vaultId: status.vaultId,
        initialized: status.initialized
      };
      
      // Notify if vault lock state changed
      if (oldLocked !== this.status.locked) {
        this.notifySubscribers(
          this.status.locked ? 'vault-locked' : 'vault-unlocked', 
          this.status
        );
      }
      
      return this.status;
      
    } catch (error) {
      console.error('🛡️ VaultGuardian: Status check failed:', error);
      return {
        locked: true,
        vaultId: null,
        initialized: false,
        error: error.message
      };
    }
  }

  /**
   * Get setting from encrypted vault
   * NO FALLBACKS - vault only
   */
  async getSetting(key) {
    try {
      if (this.status.locked) {
        console.warn('🛡️ VaultGuardian: Vault locked, cannot get setting:', key);
        return null;
      }

      // Check cache first
      const cacheKey = `setting:${key}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < 30000) { // 30-second cache
          return cached.value;
        }
      }

      let value;
      if (this.isElectron) {
        value = await this.vaultService.getSetting(key);
      } else {
        value = await this.vaultService.getSetting(key);
      }
      
      // Cache the result
      this.cache.set(cacheKey, {
        value,
        timestamp: Date.now()
      });
      
      return value;
      
    } catch (error) {
      console.error('🛡️ VaultGuardian: Get setting failed:', key, error);
      return null;
    }
  }

  /**
   * Set setting in encrypted vault
   * Invalidates cache and notifies subscribers
   */
  async setSetting(key, value) {
    try {
      if (this.status.locked) {
        throw new Error('Vault is locked - cannot set setting');
      }

      if (this.isElectron) {
        await this.vaultService.setSetting(key, value);
      } else {
        await this.vaultService.setSetting(key, value);
      }
      
      // Invalidate cache
      this.cache.delete(`setting:${key}`);
      
      // Notify subscribers
      this.notifySubscribers('setting-changed', { key, value });
      
      console.log('🛡️ VaultGuardian: Setting saved:', key);
      
    } catch (error) {
      console.error('🛡️ VaultGuardian: Set setting failed:', key, error);
      throw error;
    }
  }

  /**
   * Get multiple settings efficiently
   */
  async getSettings(keys) {
    const results = {};
    
    for (const key of keys) {
      results[key] = await this.getSetting(key);
    }
    
    return results;
  }

  /**
   * Check if vault is unlocked
   */
  isUnlocked() {
    return !this.status.locked && this.status.initialized;
  }

  /**
   * Wait for vault to be unlocked
   * Used by components that require vault access
   */
  async waitForUnlock(timeout = 30000) {
    if (this.isUnlocked()) {
      return this.status;
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.unsubscribe('vault-unlocked', onUnlock);
        reject(new Error('Timeout waiting for vault unlock'));
      }, timeout);

      const onUnlock = (status) => {
        clearTimeout(timeoutId);
        this.unsubscribe('vault-unlocked', onUnlock);
        resolve(status);
      };

      this.subscribe('vault-unlocked', onUnlock);
    });
  }

  /**
   * Unlock vault with passphrase
   */
  async unlock(passphrase, vaultId = null) {
    try {
      const result = await this.vaultService.unlock(passphrase, vaultId);
      
      // Force status refresh
      this.statusCache = null;
      await this.getStatus();
      
      return result;
      
    } catch (error) {
      console.error('🛡️ VaultGuardian: Unlock failed:', error);
      throw error;
    }
  }

  /**
   * Lock vault
   */
  async lock() {
    try {
      await this.vaultService.lock();
      
      // Clear all caches
      this.cache.clear();
      this.statusCache = null;
      
      // Update status
      this.status.locked = true;
      this.notifySubscribers('vault-locked', this.status);
      
    } catch (error) {
      console.error('🛡️ VaultGuardian: Lock failed:', error);
      throw error;
    }
  }

  /**
   * Event subscription system - NO MORE POLLING
   */
  subscribe(event, callback) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event).add(callback);
    
    console.log(`🛡️ VaultGuardian: Subscribed to ${event}`);
  }

  unsubscribe(event, callback) {
    if (this.subscribers.has(event)) {
      this.subscribers.get(event).delete(callback);
    }
  }

  notifySubscribers(event, data) {
    if (this.subscribers.has(event)) {
      for (const callback of this.subscribers.get(event)) {
        try {
          callback(data);
        } catch (error) {
          console.error(`🛡️ VaultGuardian: Subscriber error for ${event}:`, error);
        }
      }
    }
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.cache.clear();
    this.statusCache = null;
    console.log('🛡️ VaultGuardian: Cache cleared');
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats() {
    return {
      settingsCache: this.cache.size,
      statusCacheAge: this.statusCache ? Date.now() - this.statusCache.timestamp : null,
      subscribers: Array.from(this.subscribers.keys()).map(key => ({
        event: key,
        count: this.subscribers.get(key).size
      }))
    };
  }
}

// Create singleton instance
const vaultGuardian = new VaultGuardian();

// Global access
if (typeof window !== 'undefined') {
  window.VaultGuardian = vaultGuardian;
}

export default vaultGuardian;
