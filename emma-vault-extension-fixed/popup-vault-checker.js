/**
 * Emma Extension Popup - WEBAPP-FIRST Vault Checker
 * Checks webapp vault status and manages extension popup states
 */

class ExtensionVaultChecker {
  constructor() {
    this.isVaultUnlocked = false;
    this.vaultName = null;
    this.checkInterval = null;
    this.webappUrl = 'https://emma-lite-extension.onrender.com';
    
    console.log('🔐 Extension: VaultChecker initialized');
  }

  /**
   * Initialize vault checking when popup opens
   */
  async initialize() {
    console.log('🔐 Extension: Starting vault status check');
    
    // Set up UI event listeners
    this.setupEventListeners();
    
    // Initial check
    await this.checkVaultStatus();
    
    // Start periodic checking
    this.startPeriodicCheck();
  }

  /**
   * Set up event listeners for vault overlay
   */
  setupEventListeners() {
    // Open webapp button
    const unlockBtn = document.getElementById('unlock-webapp-btn');
    if (unlockBtn) {
      unlockBtn.addEventListener('click', () => {
        this.openWebappToUnlock();
      });
    }

    // Help button
    const helpBtn = document.getElementById('vault-help-btn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        this.showHelpInfo();
      });
    }
  }

  /**
   * Check vault status by communicating with webapp via content script
   */
  async checkVaultStatus() {
    try {
      console.log('🔐 Extension: Checking vault status...');
      
      // Method 1: Try to get vault status from active webapp tab
      const vaultStatus = await this.getVaultStatusFromWebapp();
      
      if (vaultStatus && vaultStatus.isUnlocked) {
        this.handleVaultUnlocked(vaultStatus.vaultName);
      } else {
        this.handleVaultLocked();
      }
      
    } catch (error) {
      console.error('🔐 Extension: Vault status check failed:', error);
      this.handleVaultLocked();
    }
  }

  /**
   * Get vault status from webapp via content script
   */
  async getVaultStatusFromWebapp() {
    return new Promise((resolve) => {
      // Query all tabs to find Emma webapp
      chrome.tabs.query({}, (tabs) => {
        console.log('🔐 Extension: Checking all tabs for Emma webapp...');
        console.log('🔐 Extension: Total tabs found:', tabs.length);
        
        // Debug: log all tab URLs to see what we're working with
        tabs.forEach((tab, index) => {
          if (tab.url) {
            console.log(`🔐 Extension: Tab ${index}: ${tab.url}`);
          }
        });
        
        const emmaTabs = tabs.filter(tab => 
          tab.url?.includes('emma-lite-extension.onrender.com') ||
          tab.url?.includes('emma-hjjc.onrender.com') ||
          tab.url?.includes('localhost')
        );

        console.log('🔐 Extension: Emma tabs found:', emmaTabs.length);
        emmaTabs.forEach((tab, index) => {
          console.log(`🔐 Extension: Emma tab ${index}: ${tab.url}`);
        });

        if (emmaTabs.length === 0) {
          console.log('🔐 Extension: No Emma webapp tabs found - vault appears locked');
          resolve({ isUnlocked: false });
          return;
        }

        // Send message to first Emma tab
        const emmaTab = emmaTabs[0];
        console.log('🔐 Extension: Sending message to Emma tab:', emmaTab.url);
        
        chrome.tabs.sendMessage(emmaTab.id, {
          action: 'checkVaultStatus'
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('🔐 Extension: Content script communication failed:', chrome.runtime.lastError.message);
            console.log('🔐 Extension: This usually means content script not injected or tab not ready');
            resolve({ isUnlocked: false });
          } else {
            console.log('🔐 Extension: SUCCESS! Vault status received from webapp:', response);
            resolve(response || { isUnlocked: false });
          }
        });
      });
    });
  }

  /**
   * Handle vault unlocked state
   */
  handleVaultUnlocked(vaultName) {
    console.log('🔓 Extension: Vault is unlocked:', vaultName);
    
    this.isVaultUnlocked = true;
    this.vaultName = vaultName;
    
    // Hide vault locked overlay
    const overlay = document.getElementById('vault-locked-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
    
    // Show extension features
    const mainInterface = document.getElementById('mainInterface');
    if (mainInterface) {
      mainInterface.style.display = 'block';
    }
    
    this.updateStatusIndicator('unlocked', `Vault "${vaultName}" is unlocked`);
  }

  /**
   * Handle vault locked state
   */
  handleVaultLocked() {
    console.log('🔒 Extension: Vault is locked');
    
    this.isVaultUnlocked = false;
    this.vaultName = null;
    
    // Show vault locked overlay
    const overlay = document.getElementById('vault-locked-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
    }
    
    // Hide extension features
    const mainInterface = document.getElementById('mainInterface');
    if (mainInterface) {
      mainInterface.style.display = 'none';
    }
    
    this.updateStatusIndicator('locked', 'Vault is locked - open webapp to unlock');
  }

  /**
   * Update status indicator
   */
  updateStatusIndicator(status, message) {
    const indicator = document.getElementById('vault-status-indicator');
    if (!indicator) return;

    // Remove existing status classes
    indicator.classList.remove('checking', 'locked', 'unlocked');
    
    // Add new status class
    indicator.classList.add(status);

    // Update content
    if (status === 'checking') {
      indicator.innerHTML = `
        <span class="vault-checking-spinner"></span>
        <span>${message}</span>
      `;
    } else if (status === 'unlocked') {
      indicator.innerHTML = `
        <span>✅</span>
        <span>${message}</span>
      `;
    } else {
      indicator.innerHTML = `
        <span>🔒</span>
        <span>${message}</span>
      `;
    }
  }

  /**
   * Open webapp to unlock vault
   */
  openWebappToUnlock() {
    console.log('🌐 Extension: Opening webapp to unlock vault');
    
    this.updateStatusIndicator('checking', 'Opening webapp...');
    
    // Open Emma webapp in new tab
    chrome.tabs.create({ 
      url: this.webappUrl,
      active: true 
    });

    // Start more frequent checking since user is unlocking
    this.startUnlockMonitoring();
  }

  /**
   * Start more frequent checking when user is unlocking
   */
  startUnlockMonitoring() {
    // Clear existing interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Check every 2 seconds during unlock process
    this.checkInterval = setInterval(() => {
      this.checkVaultStatus();
    }, 2000);

    // After 30 seconds, go back to normal interval
    setTimeout(() => {
      this.startPeriodicCheck();
    }, 30000);
  }

  /**
   * Start periodic vault status checking
   */
  startPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Check every 10 seconds normally
    this.checkInterval = setInterval(() => {
      this.checkVaultStatus();
    }, 10000);
  }

  /**
   * Show help information
   */
  showHelpInfo() {
    const helpMessage = `Emma Extension - WEBAPP-FIRST Architecture

🔐 SECURITY: Your vault is managed by the Emma webapp for maximum security
🌐 UNLOCK: Open the webapp to unlock your vault with your passphrase  
🔓 ACCESS: Once unlocked, the extension can capture memories and images
⚡ SYNC: All data syncs between webapp and extension automatically

This design keeps your memories safe while providing seamless capture tools.`;

    alert(helpMessage);
  }

  /**
   * Cleanup when popup closes
   */
  cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

// Global instance
window.extensionVaultChecker = new ExtensionVaultChecker();
