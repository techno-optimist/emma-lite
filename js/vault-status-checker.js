/**
 * Emma Vault Status Checker for Extension Popup
 * WEBAPP-FIRST ARCHITECTURE: Check if webapp vault is unlocked
 */

class VaultStatusChecker {
  constructor() {
    this.isVaultUnlocked = false;
    this.vaultName = null;
    this.checkInterval = null;
    this.listeners = [];
    
    console.log('🔐 VaultStatusChecker: Initialized for webapp-first architecture');
  }

  /**
   * Start monitoring vault status from webapp
   */
  startMonitoring() {
    // Initial check
    this.checkVaultStatus();
    
    // Check every 2 seconds for vault status changes
    this.checkInterval = setInterval(() => {
      this.checkVaultStatus();
    }, 2000);
    
    console.log('🔐 VaultStatusChecker: Started monitoring webapp vault status');
  }

  /**
   * Stop monitoring vault status
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('🔐 VaultStatusChecker: Stopped monitoring');
  }

  /**
   * Check if webapp vault is unlocked
   */
  async checkVaultStatus() {
    try {
      // Method 1: Check localStorage for vault state (webapp sets this)
      const webappVaultActive = localStorage.getItem('emmaVaultActive') === 'true';
      const webappVaultName = localStorage.getItem('emmaVaultName');
      
      // Method 2: Try to communicate with webapp directly
      let webappResponse = null;
      try {
        // Check if webapp is available and has vault unlocked
        if (typeof window !== 'undefined' && window.emmaWebVault) {
          webappResponse = {
            isOpen: window.emmaWebVault.isOpen,
            vaultName: window.emmaWebVault.currentVault?.name,
            hasVaultData: !!window.emmaWebVault.vaultData
          };
        }
      } catch (e) {
        // Webapp not available or accessible
        console.log('🔐 VaultStatusChecker: Webapp not accessible from extension');
      }

      // Determine final vault status
      const newStatus = webappVaultActive || (webappResponse?.isOpen && webappResponse?.hasVaultData);
      const newVaultName = webappVaultName || webappResponse?.vaultName || null;

      // Check if status changed
      if (newStatus !== this.isVaultUnlocked || newVaultName !== this.vaultName) {
        const oldStatus = this.isVaultUnlocked;
        this.isVaultUnlocked = newStatus;
        this.vaultName = newVaultName;

        console.log('🔐 VaultStatusChecker: Status changed', {
          from: oldStatus,
          to: newStatus,
          vaultName: newVaultName
        });

        // Notify listeners
        this.notifyListeners({
          isUnlocked: this.isVaultUnlocked,
          vaultName: this.vaultName,
          statusChanged: true
        });
      }

    } catch (error) {
      console.error('🔐 VaultStatusChecker: Error checking vault status:', error);
      
      // Default to locked state on error
      if (this.isVaultUnlocked !== false) {
        this.isVaultUnlocked = false;
        this.vaultName = null;
        this.notifyListeners({
          isUnlocked: false,
          vaultName: null,
          statusChanged: true,
          error: error.message
        });
      }
    }
  }

  /**
   * Add listener for vault status changes
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove listener
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  /**
   * Notify all listeners of status change
   */
  notifyListeners(status) {
    this.listeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('🔐 VaultStatusChecker: Listener error:', error);
      }
    });
  }

  /**
   * Get current vault status
   */
  getStatus() {
    return {
      isUnlocked: this.isVaultUnlocked,
      vaultName: this.vaultName
    };
  }

  /**
   * Open webapp to unlock vault
   */
  openWebappToUnlock() {
    const webappUrl = window.location.origin.includes('localhost') 
      ? 'http://localhost:3000'
      : 'https://emma-lite-extension.onrender.com';
    
    // Try to open in same tab first, fallback to new tab
    try {
      window.open(webappUrl, '_blank');
    } catch (error) {
      // Fallback: Use chrome.tabs if available (extension context)
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: webappUrl });
      } else {
        console.error('🔐 VaultStatusChecker: Cannot open webapp:', error);
      }
    }
  }
}

// Global instance
window.vaultStatusChecker = new VaultStatusChecker();
