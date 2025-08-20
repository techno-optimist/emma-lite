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
    // Check if vault is active from session storage
    const vaultActive = sessionStorage.getItem('emmaVaultActive') === 'true';
    const vaultName = sessionStorage.getItem('emmaVaultName');
    
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
        this.initialize();
      }
    });
  }
  
  // Notify components of status changes
  notifyStatusChange() {
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('vault-status-changed', {
      detail: this.status
    }));
  }
  
  // Periodic sync to ensure vault status stays consistent
  setupPeriodicSync() {
    // Check vault status every 2 seconds to catch any inconsistencies
    setInterval(() => {
      const currentActive = sessionStorage.getItem('emmaVaultActive') === 'true';
      const currentName = sessionStorage.getItem('emmaVaultName');
      
      // Check if status is out of sync
      if (currentActive && !this.status.isUnlocked) {
        console.log('🔧 WebVaultStatus: Detected vault should be unlocked - fixing status');
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
    }, 2000);
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
