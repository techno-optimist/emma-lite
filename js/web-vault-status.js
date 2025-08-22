// 🔐 Emma Web Vault Status Manager
// Unified vault status management for web app

class WebVaultStatus {
  constructor() {
    this.status = {
      isUnlocked: false,
      hasVault: false,
      name: null
    };
    
    this.initialize();
  }

  initialize() {
    // CRITICAL FIX: Check both sessionStorage AND localStorage for vault status
    // localStorage survives tab close/reopen, sessionStorage doesn't
    const sessionVaultActive = sessionStorage.getItem('emmaVaultActive') === 'true';
    const sessionVaultName = sessionStorage.getItem('emmaVaultName');
    
    const localVaultActive = localStorage.getItem('emmaVaultActive') === 'true';
    const localVaultName = localStorage.getItem('emmaVaultName');
    
    // Use sessionStorage first, fallback to localStorage
    const vaultActive = sessionVaultActive || localVaultActive;
    const vaultName = sessionVaultName || localVaultName;
    
    // If localStorage has vault but sessionStorage doesn't, restore sessionStorage
    if (localVaultActive && !sessionVaultActive) {
      console.log('🔧 WebVaultStatus: Restoring sessionStorage from localStorage backup');
      sessionStorage.setItem('emmaVaultActive', 'true');
      sessionStorage.setItem('emmaVaultName', localVaultName || 'Extension Vault');
    }
    
    if (vaultActive && vaultName) {
      // CRITICAL FIX: Remove session expiry check - vault stays unlocked until user locks it
      // Sessions now persist indefinitely until user manually locks vault
      
      this.status = {
        isUnlocked: true, // Always unlocked if vault is active
        hasVault: true,
        name: vaultName
      };
      
      console.log('✅ WebVaultStatus: Vault is active and unlocked (no expiry - user controlled):', vaultName);
    } else {
      this.status = {
        isUnlocked: false,
        hasVault: false,
        name: null
      };
      console.log('🔒 WebVaultStatus: No active vault - will check for extension communication');
    }
    
    // Set global status for compatibility
    window.currentVaultStatus = this.status;
    
    // EMERGENCY LOGGING
    this.logVaultState('initialize');
    
    // CRITICAL FIX: Listen for extension vault status updates
    this.setupExtensionListener();
    
    // CRITICAL FIX: Periodic sync check to ensure consistency
    this.setupPeriodicSync();
  }
  
  // Listen for extension vault ready events
  setupExtensionListener() {
    // Listen for extension-vault-ready event
    window.addEventListener('extension-vault-ready', (event) => {
      console.log('🔗 WebVaultStatus: Extension vault ready event received:', event.detail);
      
      // Update status to unlocked
      this.status = {
        isUnlocked: true,
        hasVault: true,
        name: event.detail.vaultName || 'Extension Vault'
      };
      
      // Update global status
      window.currentVaultStatus = this.status;
      
      console.log('✅ WebVaultStatus: Updated to UNLOCKED based on extension communication');
      
      // Trigger any vault status change listeners
      this.notifyStatusChange();
    });
    
    // Also listen for direct sessionStorage changes (for manual vault operations)
    window.addEventListener('storage', (e) => {
      if (e.key === 'emmaVaultActive' || e.key === 'emmaVaultName') {
        console.log('🔄 WebVaultStatus: SessionStorage changed, reinitializing...');
        this.logVaultState('storage-event');
        this.initialize();
      }
    });
    
    // Monitor browser focus/blur events for vault security
    window.addEventListener('focus', () => {
      console.log('🔍 FOCUS EVENT: Browser tab gained focus');
      this.logVaultState('window-focus');
    });
    
    window.addEventListener('blur', () => {
      console.log('🔍 BLUR EVENT: Browser tab lost focus');
      this.logVaultState('window-blur');
    });
    
    // Also log visibility changes
    document.addEventListener('visibilitychange', () => {
      console.log('🔍 VISIBILITY CHANGE:', document.visibilityState);
      this.logVaultState(`visibility-${document.visibilityState}`);
    });
  }
  
  // Notify components of status changes
  notifyStatusChange() {
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('vault-status-changed', {
      detail: this.status
    }));
  }
  
  // EMERGENCY DEBUGGING: Log all vault state changes
  logVaultState(context) {
    const sessionActive = sessionStorage.getItem('emmaVaultActive');
    const sessionName = sessionStorage.getItem('emmaVaultName');
    const localActive = localStorage.getItem('emmaVaultActive');
    const localName = localStorage.getItem('emmaVaultName');
    
    console.log(`🔍 VAULT STATE DEBUG [${context}]:`, {
      timestamp: new Date().toISOString(),
      sessionStorage: { active: sessionActive, name: sessionName },
      localStorage: { active: localActive, name: localName },
      webVaultStatus: this.status,
      currentVaultStatus: window.currentVaultStatus,
      emmaWebVault: window.emmaWebVault ? {
        isOpen: window.emmaWebVault.isOpen,
        extensionAvailable: window.emmaWebVault.extensionAvailable
      } : 'not available'
    });
  }

  // SIMPLIFIED: Check vault status only when needed (no polling)
  setupPeriodicSync() {
    console.log('✅ VAULT: Periodic sync disabled - using event-driven updates only');
    
    // Only check status on focus/blur events, not continuously
    this.checkStatusOnDemand();
  }
  
  // Check vault status on demand (no continuous polling)
  checkStatusOnDemand() {
    const sessionActive = sessionStorage.getItem('emmaVaultActive') === 'true';
    const sessionName = sessionStorage.getItem('emmaVaultName');
    
    const localActive = localStorage.getItem('emmaVaultActive') === 'true';
    const localName = localStorage.getItem('emmaVaultName');
    
    // Use either storage as source of truth
    const currentActive = sessionActive || localActive;
    const currentName = sessionName || localName;
    
    // SIMPLIFIED: If vault is active, set status accordingly
    if (currentActive) {
      console.log('✅ VAULT: Vault is active - setting unlocked status');
      
      this.status = {
        isUnlocked: true,
        hasVault: true,
        name: currentName || 'My Vault'
      };
      
      window.currentVaultStatus = this.status;
    } else {
      this.status = {
        isUnlocked: false,
        hasVault: false,
        name: null
      };
      window.currentVaultStatus = this.status;
    }
  }
  
  // Attempt to restore vault data when status is unlocked but data is missing
  attemptDataRestoration() {
    // Try multiple restoration methods
    
    // Method 1: Restore from IndexedDB
    if (window.emmaWebVault && window.emmaWebVault.restoreVaultState) {
      console.log('🔧 DATA RESTORE: Attempting IndexedDB restoration...');
      window.emmaWebVault.restoreVaultState().then(result => {
        if (result && result.vaultData) {
          console.log('✅ DATA RESTORE: Successfully restored vault data from IndexedDB');
        } else {
          console.log('⚠️ DATA RESTORE: IndexedDB restoration failed, trying extension request...');
          this.requestDataFromExtension();
        }
      }).catch(error => {
        console.error('❌ DATA RESTORE: IndexedDB restoration error:', error);
        this.requestDataFromExtension();
      });
    } else {
      this.requestDataFromExtension();
    }
  }
  
  // Request vault data from extension
  requestDataFromExtension() {
    console.log('🔧 DATA RESTORE: Requesting vault data from extension...');
    
    // Send message to extension to get current vault data
    window.postMessage({
      channel: 'emma-vault-bridge',
      type: 'REQUEST_VAULT_DATA'
    }, window.location.origin);
    
    // Set up timeout fallback
    setTimeout(() => {
      if (window.emmaWebVault && !window.emmaWebVault.vaultData) {
        console.log('⚠️ DATA RESTORE: Extension data request timeout - creating minimal data');
        this.createMinimalVaultData();
      }
    }, 3000);
  }
  
  // Create minimal vault data structure as last resort
  createMinimalVaultData() {
    if (window.emmaWebVault) {
      window.emmaWebVault.vaultData = {
        content: { memories: {}, people: {}, media: {} },
        stats: { memoryCount: 0, peopleCount: 0, mediaCount: 0 },
        metadata: { name: localStorage.getItem('emmaVaultName') || 'Extension Vault' }
      };
      console.log('🔧 DATA RESTORE: Created minimal vault data structure');
    }
  }

  isUnlocked() {
    // CRITICAL FIX: Don't override status - just return current state
    // The status is already set correctly by initialize() and other methods
    
    return this.status.isUnlocked;
  }

  hasVault() {
    return this.status.hasVault;
  }

  getName() {
    return this.status.name;
  }

  getStatus() {
    return { ...this.status };
  }

  unlock(vaultName = null) {
    this.status.isUnlocked = true;
    this.status.hasVault = true;
    if (vaultName) this.status.name = vaultName;
    
    // Update global status
    window.currentVaultStatus = this.status;
    
    // Update session storage
    sessionStorage.setItem('emmaVaultActive', 'true');
    if (vaultName) sessionStorage.setItem('emmaVaultName', vaultName);
    
    console.log('🔓 WebVaultStatus: Vault unlocked:', this.status);
    
    // Trigger visual updates
    this.notifyStatusChange();
  }

  lock() {
    this.status.isUnlocked = false;
    
    // Update global status
    window.currentVaultStatus = this.status;
    
    console.log('🔒 WebVaultStatus: Vault locked');
    
    // Trigger visual updates
    this.notifyStatusChange();
  }

  notifyStatusChange() {
    // Trigger vault icon updates
    const event = new CustomEvent('vaultStatusChanged', { 
      detail: this.status 
    });
    document.dispatchEvent(event);
  }
}

// Initialize global vault status manager
// CRITICAL FIX: Only create if doesn't exist (preserve vault state across navigation)
if (!window.webVaultStatus) {
  window.webVaultStatus = new WebVaultStatus();
  console.log('🌟 WebVaultStatus created for first time');
} else {
  console.log('✅ VAULT: Preserving existing WebVaultStatus instance - no reset');
}

console.log('🔐 WebVaultStatus: Initialized');
