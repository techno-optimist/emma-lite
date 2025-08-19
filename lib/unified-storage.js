// lib/unified-storage.js - Unified Memory Storage Manager
// Consolidates 4 competing storage systems into single interface

// Using message handlers instead of direct imports to avoid dependency issues

/**
 * Unified Memory Storage - Single interface for all memory operations
 * Replaces chaotic 4-system architecture with clean, predictable flow
 */
export class UnifiedMemoryStorage {
  constructor() {
    this.initialized = false;
    this.initPromise = null;
  }

  async init() {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._initialize();
    return this.initPromise;
  }

  async _initialize() {
    try {
      // Check if background services are available
      const vaultStatus = await this.getVaultStatus();
      this.initialized = true;
      console.log('✅ UnifiedMemoryStorage: Initialized successfully', vaultStatus);
    } catch (error) {
      console.error('❌ UnifiedMemoryStorage: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Save memory to appropriate storage location
   * @param {Object} memoryData - Memory data to save
   * @param {string} location - Storage location: 'staging', 'vault'
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Memory ID
   */
  async save(memoryData, location = 'staging', options = {}) {
    await this.init();

    try {
      switch (location) {
        case 'staging':
          return await this.saveToStaging(memoryData);
          
        case 'vault':
          throw new Error('Vault saves should be handled by background script directly');
          
        default:
          throw new Error(`Invalid storage location: ${location}`);
      }
    } catch (error) {
      console.error('❌ UnifiedMemoryStorage: Save failed:', error);
      throw error;
    }
  }

  /**
   * Save memory to staging area (ephemeral storage)
   * @private
   */
  async saveToStaging(memoryData) {
    console.log('🎯 UnifiedMemoryStorage: saveToStaging called with:', memoryData);
    const snap = await chrome.storage.local.get(['emma_ephemeral']);
    console.log('📦 UnifiedMemoryStorage: Current staging storage:', snap);
    const list = Array.isArray(snap.emma_ephemeral) ? snap.emma_ephemeral : [];
    const id = `e_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    
    const stagingItem = { id, createdAt: Date.now(), data: memoryData };
    list.unshift(stagingItem);
    console.log('📝 UnifiedMemoryStorage: Adding item to staging:', stagingItem);
    
    // Keep bounded list
    if (list.length > 200) list.length = 200;
    
    await chrome.storage.local.set({ emma_ephemeral: list });
    console.log('💾 UnifiedMemoryStorage: Saved to storage, new list length:', list.length);
    
    // Notify UI
    try {
      chrome.runtime.sendMessage({ action: 'staging.refresh', stagingId: id });
      console.log('📡 UnifiedMemoryStorage: Sent staging.refresh message');
    } catch (e) {
      console.log('📡 UnifiedMemoryStorage: staging.refresh message failed (UI not open):', e.message);
    }
    
    console.log('✅ UnifiedMemoryStorage: Saved to staging:', id);
    return id;
  }

  // Vault save method removed - should be handled by background script directly

  /**
   * Move memory from staging to vault
   * @param {string} stagingId - Staging memory ID
   * @returns {Promise<string>} Vault memory ID
   */
  async commitFromStaging(stagingId) {
    // NOTE: This method is deprecated - staging commits should be handled by background script
    throw new Error('commitFromStaging should be handled by background script via ephemeral.commit message');
  }

  /**
   * List staging memories
   * @returns {Promise<Array>} List of staging memories
   */
  async listStaging() {
    const snap = await chrome.storage.local.get(['emma_ephemeral']);
    return Array.isArray(snap.emma_ephemeral) ? snap.emma_ephemeral : [];
  }

  /**
   * Delete from staging
   * @param {string} stagingId - Staging memory ID
   */
  async deleteFromStaging(stagingId) {
    const snap = await chrome.storage.local.get(['emma_ephemeral']);
    const list = Array.isArray(snap.emma_ephemeral) ? snap.emma_ephemeral : [];
    const newList = list.filter(i => i.id !== stagingId);
    await chrome.storage.local.set({ emma_ephemeral: newList });
    
    console.log('🗑️ UnifiedMemoryStorage: Deleted from staging:', stagingId);
  }

  /**
   * Get vault status
   * @returns {Promise<Object>} Vault status
   */
  async getVaultStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });
      return response || { initialized: false, isUnlocked: false };
    } catch (error) {
      console.warn('⚠️ UnifiedMemoryStorage: Could not get vault status:', error);
      return { initialized: false, isUnlocked: false };
    }
  }

  /**
   * Get memories with pagination support
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of memories to return (default: 50)
   * @param {number} options.offset - Number of memories to skip (default: 0)
   * @param {string} options.source - Filter by source (optional)
   * @returns {Promise<Array>} List of memories
   */
  async getMemories(options = {}) {
    const { limit = 50, offset = 0, source = null } = options;
    
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'getAllMemories',
        limit: Math.min(limit, 100), // Cap at 100 for performance
        offset,
        source
      });
      
      if (response?.success) {
        console.log(`📖 UnifiedMemoryStorage: Retrieved ${response.memories.length} memories`);
        return response.memories;
      } else {
        console.warn('⚠️ UnifiedMemoryStorage: Failed to get memories:', response?.error);
        return [];
      }
    } catch (error) {
      console.error('❌ UnifiedMemoryStorage: Error getting memories:', error);
      return [];
    }
  }
}

// Export singleton instance
export const unifiedStorage = new UnifiedMemoryStorage();
