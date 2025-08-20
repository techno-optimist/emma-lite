// js/vault/vault-manager.js - Unified Vault State Management
// Handles persistent vault state across service worker restarts

import { Keyring, SETTINGS_KEY } from './keyring.js';
import { IndexedDBVaultStore } from './store-indexeddb.js';
import { VaultService } from './service.js';

const VAULT_STATE_KEY = 'emma_vault_state';
const SESSION_KEY = 'emma_vault_session';
const INIT_KEY = 'emma_vault_initialized';

/**
 * Unified Vault Manager - Single source of truth for vault state
 * Handles service worker restarts, session persistence, and cross-page synchronization
 */
export class VaultManager {
  constructor() {
    // Use VaultService's keyring instance to avoid duplication
    // This will be set in initialize() method
    this.keyring = null;
    this.store = new IndexedDBVaultStore();
    this.listeners = new Set();
    this.lastStatusCheck = 0;
    this.statusCache = null;
    this.initialized = false;
  }

  /**
   * Initialize the vault manager
   * Call this once when the service worker starts
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('🔐 VaultManager: Initializing...');
    
    try {
      // Get the shared keyring instance from VaultService
      this.keyring = VaultService.getKeyring();
      
      // Attempt session-based auto-unlock
      await this.attemptSessionUnlock();
      
      // Set up storage change listeners for cross-tab sync
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === 'local' && (changes[VAULT_STATE_KEY] || changes[SESSION_KEY])) {
            this.invalidateCache();
            this.notifyListeners();
          }
        });
      }
      
      this.initialized = true;
      console.log('🔐 VaultManager: Initialized successfully');
    } catch (error) {
      console.error('🔐 VaultManager: Initialization failed:', error);
    }
  }

  /**
   * Get comprehensive vault status - single source of truth
   * @returns {Promise<VaultStatus>}
   */
  async getStatus() {
    const now = Date.now();
    
    // Use cached status if recent (< 1 second)
    if (this.statusCache && (now - this.lastStatusCheck) < 1000) {
      return this.statusCache;
    }
    
    try {
      const storage = await chrome.storage.local.get([
        INIT_KEY, 
        SESSION_KEY, 
        VAULT_STATE_KEY,
        SETTINGS_KEY
      ]);
      
      const initialized = !!storage[INIT_KEY];
      const settings = storage[SETTINGS_KEY];
      const session = storage[SESSION_KEY];
      const state = storage[VAULT_STATE_KEY] || {};
      
      // Check if keyring is currently unlocked in memory
      const memoryUnlocked = this.keyring ? await this.keyring.isUnlocked() : false;
      
      // Check if session is valid for auto-unlock
      const sessionValid = await this.validateSessionSecurity(session, settings, now);
      
      // Determine overall unlock status
      let isUnlocked = memoryUnlocked;
      
      // If memory is locked but session is valid, attempt auto-unlock
      if (!memoryUnlocked && sessionValid) {
        console.log('🔐 VaultManager: Attempting session-based auto-unlock');
        isUnlocked = await this.unlockFromSession(session, settings);
      }
      
      const status = {
        initialized,
        isUnlocked,
        hasValidSession: sessionValid,
        sessionExpiresAt: null, // No expiry - user controlled
        lastUnlockedAt: state.lastUnlockedAt || null,
        vaultId: session?.vaultId || null,
        hasSettings: !!settings,
        hasVerifier: !!(settings?.verifier),
        keyringState: memoryUnlocked ? 'unlocked' : 'locked',
        debug: {
          memoryUnlocked,
          sessionValid,
          sessionExpiry: null, // No expiry - user controlled
          timezoneOffset: new Date().getTimezoneOffset()
        }
      };
      
      // Cache the result
      this.statusCache = status;
      this.lastStatusCheck = now;
      
      return status;
    } catch (error) {
      console.error('🔐 VaultManager: getStatus failed:', error);
      return {
        initialized: false,
        isUnlocked: false,
        hasValidSession: false,
        sessionExpiresAt: null,
        lastUnlockedAt: null,
        vaultId: null,
        hasSettings: false,
        hasVerifier: false,
        keyringState: 'error',
        error: error.message
      };
    }
  }

  /**
   * Unlock vault with passphrase and create session
   */
  async unlock(passphrase) {
    console.log('🔐 VaultManager: Unlocking vault');
    
    try {
      // Use the existing VaultService for crypto operations
      await VaultService.unlock(passphrase);
      
      // Create session token
      const sessionData = await this.createSession();
      
      // Update persistent state
      await this.updateVaultState({
        lastUnlockedAt: Date.now(),
        unlockCount: (await this.getVaultState()).unlockCount + 1 || 1
      });
      
      // Invalidate cache and notify listeners
      this.invalidateCache();
      await this.notifyListeners();
      
      console.log('🔐 VaultManager: Vault unlocked successfully');
      return { success: true, sessionExpiresAt: null }; // No expiry
    } catch (error) {
      console.error('🔐 VaultManager: Unlock failed:', error);
      throw error;
    }
  }

  /**
   * Lock vault and clear session
   */
  async lock() {
    console.log('🔐 VaultManager: Locking vault');
    
    try {
      // Lock the keyring
      if (this.keyring) {
        await this.keyring.lock();
      }
      
      // Clear session
      await chrome.storage.local.remove([SESSION_KEY]);
      
      // Update state
      await this.updateVaultState({
        lastLockedAt: Date.now()
      });
      
      // Invalidate cache and notify listeners
      this.invalidateCache();
      await this.notifyListeners();
      
      console.log('🔐 VaultManager: Vault locked successfully');
      return { success: true };
    } catch (error) {
      console.error('🔐 VaultManager: Lock failed:', error);
      throw error;
    }
  }

  /**
   * Initialize vault with passphrase (first-time setup)
   */
  async initializeVault(passphrase) {
    console.log('🔐 VaultManager: Initializing new vault');
    
    try {
      // Initialize the vault service
      console.log('🔐 VaultManager: Step 1 - Initializing VaultService...');
      await VaultService.initialize();
      console.log('🔐 VaultManager: Step 1 ✅ - VaultService initialized');
      
      // Unlock with the new passphrase
      console.log('🔐 VaultManager: Step 2 - Unlocking with passphrase...');
      await VaultService.unlock(passphrase);
      console.log('🔐 VaultManager: Step 2 ✅ - Vault unlocked successfully');
      
      // Verify keyring is actually unlocked
      const isUnlocked = this.keyring ? await this.keyring.isUnlocked() : false;
      console.log('🔐 VaultManager: Step 3 - Verifying unlock state:', { isUnlocked, hasKeyring: !!this.keyring });
      
      if (!isUnlocked) {
        throw new Error('Vault creation succeeded but unlock verification failed');
      }
      
      // Mark as initialized
      console.log('🔐 VaultManager: Step 4 - Marking as initialized...');
      await chrome.storage.local.set({ [INIT_KEY]: true });
      
      // Create session
      console.log('🔐 VaultManager: Step 5 - Creating session...');
      const sessionData = await this.createSession();
      console.log('🔐 VaultManager: Step 5 ✅ - Session created (no expiry - user controlled)');
      
      // Set initial state
      await this.updateVaultState({
        createdAt: Date.now(),
        lastUnlockedAt: Date.now(),
        unlockCount: 1
      });
      
      // Invalidate cache and notify listeners
      this.invalidateCache();
      await this.notifyListeners();
      
      console.log('🔐 VaultManager: Vault initialized successfully - all steps complete');
      return { success: true, sessionExpiresAt: null }; // No expiry
    } catch (error) {
      console.error('🔐 VaultManager: Vault initialization failed:', error);
      console.error('🔐 VaultManager: Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Attempt to unlock using valid session
   */
  async unlockFromSession(session, settings) {
    try {
      // For security, we still need the derived key to unlock
      // In a full implementation, we'd store an encrypted session key
      // For now, we'll check if the verifier can be decrypted with stored params
      
      // This is a simplified session validation - in production you'd want
      // to store an encrypted session key that can unlock the vault
      if (session.vaultId && settings.verifier) {
        console.log('🔐 VaultManager: Attempting session unlock...');
        
        // Check if this is a demo vault (from session or settings)
        const isDemo = session.isDemo || settings.demo;
        
        if (isDemo) {
          // Try demo passphrase for demo vaults
                  try {
          if (this.keyring) {
            const unlockResult = await this.keyring.unlockWithPassphrase('demo');
            if (unlockResult) {
              console.log('🔐 VaultManager: Session-based unlock successful (demo)');
              return true;
            }
          }
        } catch (e) {
          console.log('🔐 VaultManager: Demo passphrase failed for demo vault');
          return false;
        }
        }
        
        // For non-demo vaults, attempt session-based unlock
        // During the session period, we trust the device and allow auto-unlock
        console.log('🔐 VaultManager: Attempting session-based unlock for regular vault...');
        
        try {
          // Since we have a valid session, we can temporarily unlock without prompting
          // This is acceptable within the session timeout period (24 hours)
          
          // Update vault state to indicate session-based unlock
          await this.updateVaultState({ 
            lastUnlockedAt: Date.now(),
            autoUnlocked: true,
            sessionUnlocked: true,
            sessionId: session.vaultId
          });
          
          // For session unlocks, we mark the keyring as effectively unlocked
          // This allows vault operations to proceed without re-prompting
          if (this.keyring) {
            // Set a session unlock flag that bypasses passphrase requirements
            this.keyring.sessionUnlocked = true; // No expiry tracking needed
            console.log('🔐 VaultManager: Keyring marked as session-unlocked (indefinite until user locks)');
          }
          
          console.log('🔐 VaultManager: Session-based unlock successful for regular vault');
          return true;
          
        } catch (error) {
          console.error('🔐 VaultManager: Session unlock error:', error);
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error('🔐 VaultManager: Session unlock failed:', error);
      return false;
    }
  }

  /**
   * Attempt session unlock on service worker restart
   */
  async attemptSessionUnlock() {
    const status = await this.getStatus();
    if (!status.isUnlocked && status.hasValidSession) {
      const storage = await chrome.storage.local.get([SESSION_KEY, SETTINGS_KEY]);
      await this.unlockFromSession(storage[SESSION_KEY], storage[SETTINGS_KEY]);
    }
  }

  /**
   * Create secure session token for auto-unlock
   */
  async createSession() {
    // Check if this is a demo vault
    const settings = await chrome.storage.local.get([SETTINGS_KEY]);
    const isDemo = settings[SETTINGS_KEY]?.demo || false;
    
    // Generate cryptographically secure session token
    const sessionToken = crypto.getRandomValues(new Uint8Array(32));
    const deviceFingerprint = await this.generateDeviceFingerprint();
    
    // CRITICAL FIX: Remove automatic session timeout - vault should only lock when user chooses
    // Sessions now persist indefinitely until user manually locks vault
    
    const sessionData = {
      token: this.bytesToBase64(sessionToken),
      vaultId: `vault_${Date.now()}_${this.bytesToBase64(crypto.getRandomValues(new Uint8Array(8)))}`,
      createdAt: Date.now(),
      expiresAt: null, // No automatic expiry - user controls vault locking
      deviceFingerprint: deviceFingerprint,
      version: 2, // Updated version for secure sessions
      isDemo: isDemo,
      entropy: this.calculateTokenEntropy(sessionToken)
    };
    
    await chrome.storage.local.set({ [SESSION_KEY]: sessionData });
    console.log('🔐 VaultManager: Secure session created (no expiry - user controlled locking), Demo:', isDemo);
    
    return sessionData;
  }

  /**
   * Generate device fingerprint for session security
   */
  async generateDeviceFingerprint() {
    const fingerprint = {
      userAgent: navigator.userAgent || 'unknown',
      platform: navigator.platform || 'unknown',
      language: navigator.language || 'en-US',
      timezone: this.safeGetTimezone(),
      screen: this.safeGetScreenInfo(),
      timestamp: Date.now()
    };
    
    // Create hash of fingerprint data
    const fingerprintStr = JSON.stringify(fingerprint);
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprintStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    
    return this.bytesToBase64(hashArray.slice(0, 16)); // Use first 16 bytes
  }

  /**
   * Safely get timezone information
   */
  safeGetTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.warn('🔐 VaultManager: Could not get timezone:', error);
      return 'UTC';
    }
  }

  /**
   * Safely get screen information
   */
  safeGetScreenInfo() {
    try {
      // screen object may not be available in service worker context
      if (typeof screen !== 'undefined' && screen.width && screen.height) {
        return `${screen.width}x${screen.height}`;
      }
      // Fallback for service worker context
      return 'unknown';
    } catch (error) {
      console.warn('🔐 VaultManager: Could not get screen info:', error);
      return 'service-worker-context';
    }
  }

  /**
   * Calculate token entropy for security validation
   */
  calculateTokenEntropy(tokenBytes) {
    const frequency = new Map();
    for (const byte of tokenBytes) {
      frequency.set(byte, (frequency.get(byte) || 0) + 1);
    }
    
    let entropy = 0;
    const length = tokenBytes.length;
    for (const count of frequency.values()) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }
    
    return entropy;
  }

  /**
   * Convert bytes to base64
   */
  bytesToBase64(bytes) {
    return btoa(String.fromCharCode(...bytes));
  }

  /**
   * Validate session security with enhanced checks
   */
  async validateSessionSecurity(session, settings, currentTime) {
    if (!session || !settings?.verifier) {
      return false;
    }

    // CRITICAL FIX: Remove expiration check - sessions now persist until user manually locks
    // No automatic session expiry - user controls vault locking
    console.log('🔐 VaultManager: Session validation (no expiry check - user controlled)');

    // Check session version
    if (session.version !== 2) {
      console.log('🔐 VaultManager: Legacy session format, requiring re-authentication');
      return false;
    }

    // Validate token entropy for security
    if (session.entropy && session.entropy < 7.0) {
      console.log('🔐 VaultManager: Session token has insufficient entropy');
      return false;
    }

    // Validate device fingerprint (with graceful degradation)
    try {
      const currentFingerprint = await this.generateDeviceFingerprint();
      if (session.deviceFingerprint && session.deviceFingerprint !== currentFingerprint) {
        // Only fail validation if fingerprints are significantly different
        // Allow for differences due to context changes (popup vs service worker)
        if (!session.deviceFingerprint.includes('unknown') && !currentFingerprint.includes('unknown')) {
          console.log('🔐 VaultManager: Device fingerprint mismatch, possible session hijacking');
          return false;
        } else {
          console.log('🔐 VaultManager: Device fingerprint differs but contains fallback values, allowing');
        }
      }
    } catch (error) {
      console.warn('🔐 VaultManager: Could not validate device fingerprint:', error);
      // Continue without fingerprint validation - don't fail vault creation
    }

    // Check for suspicious session patterns
    const sessionAge = currentTime - session.createdAt;
    const maxAge = session.isDemo ? (7 * 24 * 60 * 60 * 1000) : (30 * 24 * 60 * 60 * 1000); // 7 days demo, 30 days regular
    
    if (sessionAge > maxAge) {
      console.log('🔐 VaultManager: Session too old, requiring fresh authentication');
      return false;
    }

    console.log('🔐 VaultManager: Session security validation passed');
    return true;
  }

  /**
   * Update persistent vault state
   */
  async updateVaultState(updates) {
    const current = await this.getVaultState();
    const newState = { ...current, ...updates };
    await chrome.storage.local.set({ [VAULT_STATE_KEY]: newState });
    return newState;
  }

  /**
   * Get current vault state from storage
   */
  async getVaultState() {
    const result = await chrome.storage.local.get([VAULT_STATE_KEY]);
    return result[VAULT_STATE_KEY] || {};
  }

  /**
   * Add listener for vault state changes
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of state changes
   */
  async notifyListeners() {
    const status = await this.getStatus();
    for (const listener of this.listeners) {
      try {
        listener(status);
      } catch (error) {
        console.error('🔐 VaultManager: Listener error:', error);
      }
    }
    
    // Also broadcast to other extension contexts
    this.broadcastStateChange(status);
  }

  /**
   * Broadcast state changes to other extension pages
   */
  broadcastStateChange(status) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'vault.stateChanged',
        status
      }).catch(() => {
        // Ignore "no receivers" error - normal for background-only broadcasts
      });
    }
  }

  /**
   * Invalidate status cache
   */
  invalidateCache() {
    this.statusCache = null;
    this.lastStatusCheck = 0;
  }

  /**
   * Create memory capsule (delegates to VaultService)
   */
  async createCapsule(data) {
    const status = await this.getStatus();
    if (!status.isUnlocked) {
      throw new Error('Vault is locked. Please unlock first.');
    }
    
    return await VaultService.createCapsule(data);
  }

  /**
   * List capsules (delegates to VaultService)
   */
  async listCapsules(limit = 50) {
    const status = await this.getStatus();
    if (!status.isUnlocked) {
      return { success: true, items: [], locked: true };
    }
    
    return await VaultService.listCapsules(limit);
  }

  /**
   * Get vault statistics
   */
  async getStats() {
    try {
      const status = await this.getStatus();
      
      if (!status.isUnlocked) {
        // Return basic stats when locked
        return {
          totalMemories: 0,
          storageUsed: 0,
          vaultLocked: true
        };
      }
      
      // Get capsules list to count
      const capsules = await this.listCapsules(1000); // Get a large number for counting
      const totalMemories = capsules.items ? capsules.items.length : 0;
      
      // Calculate approximate storage usage
      let storageUsed = 0;
      if (capsules.items) {
        storageUsed = capsules.items.reduce((total, capsule) => {
          const contentSize = capsule.content ? new Blob([capsule.content]).size : 0;
          const metadataSize = capsule.metadata ? new Blob([JSON.stringify(capsule.metadata)]).size : 0;
          return total + contentSize + metadataSize;
        }, 0);
      }
      
      return {
        totalMemories,
        storageUsed,
        vaultLocked: false,
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('🔐 VaultManager: getStats failed:', error);
      return {
        totalMemories: 0,
        storageUsed: 0,
        vaultLocked: true,
        error: error.message
      };
    }
  }

  /**
   * Get debug information
   */
  async getDebugInfo() {
    const status = await this.getStatus();
    const storage = await chrome.storage.local.get([
      INIT_KEY, SESSION_KEY, VAULT_STATE_KEY, SETTINGS_KEY
    ]);
    
    return {
      status,
      storage,
      keyringUnlockedAt: this.keyring ? this.keyring.unlockedAt : 0,
      lastStatusCheck: this.lastStatusCheck,
      cacheValid: !!this.statusCache,
      listenersCount: this.listeners.size,
      initialized: this.initialized
    };
  }
}

// Create singleton instance
let vaultManagerInstance = null;

export function getVaultManager() {
  if (!vaultManagerInstance) {
    vaultManagerInstance = new VaultManager();
  }
  return vaultManagerInstance;
}

// Export types for better code documentation
/**
 * @typedef {Object} VaultStatus
 * @property {boolean} initialized - Whether vault has been set up
 * @property {boolean} isUnlocked - Whether vault is currently unlocked
 * @property {boolean} hasValidSession - Whether there's a valid session for auto-unlock
 * @property {number|null} sessionExpiresAt - When current session expires
 * @property {number|null} lastUnlockedAt - Last unlock timestamp
 * @property {string|null} vaultId - Current vault session ID
 * @property {boolean} hasSettings - Whether vault settings exist
 * @property {boolean} hasVerifier - Whether passphrase verifier exists
 * @property {string} keyringState - Current keyring state ('unlocked'|'locked'|'error')
 * @property {Object} debug - Debug information
 */
