/**
 * Emma Popup Vault Integration - WEBAPP-FIRST Architecture
 * Handles vault status checking and overlay management for extension popup
 */

/**
 * Initialize vault status checker for popup
 */
async function initializeVaultStatusChecker() {
  // Make functions available to popup.js
  window.initializeVaultStatusChecker = initializeVaultStatusChecker;
  try {
    // Initialize the global vault status checker
    if (window.vaultStatusChecker) {
      vaultStatusChecker = window.vaultStatusChecker;
      
      // Add listener for vault status changes
      vaultStatusChecker.addListener(handleVaultStatusChange);
      
      // Start monitoring vault status
      vaultStatusChecker.startMonitoring();
      
      // Set up overlay button event listeners
      setupVaultOverlayEventListeners();
      
      console.log('🔐 Popup: Vault status checker initialized');
    } else {
      console.error('🔐 Popup: VaultStatusChecker not available');
      // Show locked state by default if checker not available
      showVaultLockedOverlay();
    }
  } catch (error) {
    console.error('🔐 Popup: Failed to initialize vault status checker:', error);
    showVaultLockedOverlay();
  }
}

/**
 * Handle vault status changes
 */
function handleVaultStatusChange(status) {
  console.log('🔐 Popup: Vault status changed:', status);
  
  isVaultUnlocked = status.isUnlocked;
  
  if (status.isUnlocked) {
    hideVaultLockedOverlay();
    updateVaultStatusIndicator('unlocked', `Vault "${status.vaultName}" is unlocked`);
    
    // Re-initialize popup features now that vault is unlocked
    if (window.reinitializePopupAfterUnlock) {
      setTimeout(() => window.reinitializePopupAfterUnlock(), 500);
    }
  } else {
    showVaultLockedOverlay();
    updateVaultStatusIndicator('locked', 'Vault is locked - open webapp to unlock');
  }
}

/**
 * Show the vault locked overlay
 */
function showVaultLockedOverlay() {
  if (elements.vaultLockedOverlay) {
    elements.vaultLockedOverlay.classList.remove('hidden');
    console.log('🔐 Popup: Showing vault locked overlay');
  }
}

/**
 * Hide the vault locked overlay
 */
function hideVaultLockedOverlay() {
  if (elements.vaultLockedOverlay) {
    elements.vaultLockedOverlay.classList.add('hidden');
    console.log('🔐 Popup: Hiding vault locked overlay');
  }
}

/**
 * Update vault status indicator
 */
function updateVaultStatusIndicator(status, message) {
  if (elements.vaultStatusIndicator) {
    const indicator = elements.vaultStatusIndicator;
    
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
}

/**
 * Set up event listeners for vault overlay buttons
 */
function setupVaultOverlayEventListeners() {
  // Unlock webapp button
  if (elements.unlockWebappBtn) {
    elements.unlockWebappBtn.addEventListener('click', () => {
      console.log('🔐 Popup: Opening webapp to unlock vault');
      
      // Update status to show we're redirecting
      updateVaultStatusIndicator('checking', 'Opening webapp...');
      
      // Open webapp
      if (vaultStatusChecker) {
        vaultStatusChecker.openWebappToUnlock();
      } else {
        // Fallback: open webapp directly
        const webappUrl = 'https://emma-lite-extension.onrender.com';
        try {
          window.open(webappUrl, '_blank');
        } catch (error) {
          console.error('🔐 Popup: Failed to open webapp:', error);
        }
      }
    });
  }
  
  // Help button
  if (elements.vaultHelpBtn) {
    elements.vaultHelpBtn.addEventListener('click', () => {
      console.log('🔐 Popup: Showing vault help');
      showVaultHelpModal();
    });
  }
}

/**
 * Show vault help modal
 */
function showVaultHelpModal() {
  const helpMessage = `
Emma uses a secure vault system to protect your memories:

🔒 **Vault Security**: All memories are encrypted and stored securely
🌐 **Webapp Control**: The webapp manages vault unlocking for security
🔑 **Extension Access**: The extension can only access memories when vault is unlocked
💾 **Local Storage**: Your data stays on your device and in your control

To unlock your vault:
1. Click "Open Webapp to Unlock"
2. Enter your vault passphrase in the webapp
3. Return to the extension to access features

This design keeps your memories safe while providing seamless access.
  `.trim();
  
  alert(helpMessage); // Simple alert for now, could be enhanced with a proper modal
}

/**
 * Check if extension features should be available
 */
function areExtensionFeaturesAvailable() {
  return isVaultUnlocked;
}

/**
 * Get vault status for other popup functions
 */
function getVaultStatus() {
  return {
    isUnlocked: isVaultUnlocked,
    vaultName: vaultStatusChecker?.vaultName || null
  };
}

// Export functions for use in main popup.js
window.popupVaultIntegration = {
  initializeVaultStatusChecker,
  handleVaultStatusChange,
  showVaultLockedOverlay,
  hideVaultLockedOverlay,
  updateVaultStatusIndicator,
  areExtensionFeaturesAvailable,
  getVaultStatus
};
