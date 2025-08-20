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
    
    // EMERGENCY DEBUGGING: Log browser focus/blur events
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

  // Periodic sync to ensure vault status stays consistent
  setupPeriodicSync() {
    // CRITICAL FIX: More frequent checks to catch service worker restarts
    setInterval(() => {
      this.logVaultState('periodic-sync'); // EMERGENCY LOGGING
      const sessionActive = sessionStorage.getItem('emmaVaultActive') === 'true';
      const sessionName = sessionStorage.getItem('emmaVaultName');
      
      const localActive = localStorage.getItem('emmaVaultActive') === 'true';
      const localName = localStorage.getItem('emmaVaultName');
      
      // Use either storage as source of truth
      const currentActive = sessionActive || localActive;
      const currentName = sessionName || localName;
      
      // NUCLEAR OPTION: If localStorage says vault is active, FORCE everything to unlocked state
      if (localActive) {
        console.log('🚨 NUCLEAR OPTION: localStorage indicates vault active - FORCING all systems to unlocked');
        
        // Force sessionStorage
        sessionStorage.setItem('emmaVaultActive', 'true');
        sessionStorage.setItem('emmaVaultName', localName || 'Extension Vault');
        
        // Force EmmaWebVault state
        if (window.emmaWebVault) {
          window.emmaWebVault.isOpen = true;
          window.emmaWebVault.extensionAvailable = true;
          console.log('🚨 NUCLEAR: Forced EmmaWebVault.isOpen = true');
        }
        
        // Force WebVaultStatus
        this.status = {
          isUnlocked: true,
          hasVault: true,
          name: localName || 'Extension Vault'
        };
        
        // Force global status
        window.currentVaultStatus = this.status;
        
        console.log('🚨 NUCLEAR: All vault systems forced to UNLOCKED based on localStorage');
      }
      
      // Check if status is out of sync
      if (currentActive && !this.status.isUnlocked) {
        console.log('🔧 WebVaultStatus: Detected vault should be unlocked - fixing status (likely service worker restart)');
        this.status = {
          isUnlocked: true,
          hasVault: true,
          name: currentName || 'Extension Vault'
        };
        window.currentVaultStatus = this.status;
        this.notifyStatusChange();
      } else if (!currentActive && this.status.isUnlocked) {
        console.log('🔒 WebVaultStatus: Detected vault should be locked - fixing status');
        this.status = {
          isUnlocked: false,
          hasVault: false,
          name: null
        };
        window.currentVaultStatus = this.status;
        this.notifyStatusChange();
      }
    }, 1000); // More frequent checks (every 1 second) to catch service worker restarts faster
  }

  isUnlocked() {
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
  
  isUnlocked() {
    // CRITICAL FIX: Remove session expiry check - vault stays unlocked until user locks it
    // Sessions now persist indefinitely until user manually locks vault
    
    this.status.isUnlocked = this.status.hasVault; // Unlocked if vault exists
    window.currentVaultStatus = this.status;
    
    return this.status.isUnlocked;
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
window.webVaultStatus = new WebVaultStatus();

console.log('🔐 WebVaultStatus: Initialized');
