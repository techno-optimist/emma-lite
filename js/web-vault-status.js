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
      console.log('🔒 WebVaultStatus: No active vault');
    }
    
    // Set global status for compatibility
    window.currentVaultStatus = this.status;
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
