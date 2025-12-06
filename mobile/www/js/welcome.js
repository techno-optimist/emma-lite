// Welcome page functionality
console.log('Emma Welcome: Loading...');

// Password strength checker
function checkPasswordStrength(password) {
  const strength = document.getElementById('password-strength');
  if (!strength) {
    console.warn('Password strength element not found');
    return password.length >= 8; // Fallback strength check
  }
  
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (password.length === 0) {
    strength.textContent = '';
    strength.className = 'password-strength';
  } else if (score < 3) {
    strength.textContent = 'Weak password';
    strength.className = 'password-strength strength-weak';
  } else if (score < 5) {
    strength.textContent = 'Medium strength';
    strength.className = 'password-strength strength-medium';
  } else {
    strength.textContent = 'Strong password';
    strength.className = 'password-strength strength-strong';
  }

  return score >= 3;
}

// Initialize page
async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash;
  
  // Check if we should show vault setup
  if (hash === '#vault-setup' || urlParams.get('setup') === 'true') {
    document.getElementById('vault-setup-section').classList.remove('hidden');
  } else {
    // Check vault status
    try {
      // Try Electron vault API first
      if (window.emmaAPI && window.emmaAPI.vault) {
        const status = await window.emmaAPI.vault.status();
        
        if (!status.initialized) {
          document.getElementById('vault-setup-section').classList.remove('hidden');
        } else if (!status.isUnlocked) {
          // Redirect to dashboard which will handle vault unlock
          window.location.href = '../dashboard.html';
        } else {
          // Vault exists and is unlocked, redirect to dashboard
          window.location.href = '../dashboard.html';
        }
      } else {
        // Fallback to Chrome extension API
        const result = await chrome.storage.local.get(['emma_vault_initialized']);
        if (!result.emma_vault_initialized) {
          document.getElementById('vault-setup-section').classList.remove('hidden');
        }
      }
    } catch (e) {
      document.getElementById('vault-setup-section').classList.remove('hidden');
    }
  }

  // Setup event listeners
  setupEventListeners();
}

function setupEventListeners() {
  const passphraseInput = document.getElementById('vault-passphrase');
  const confirmInput = document.getElementById('vault-confirm');
  const createBtn = document.getElementById('create-vault-btn');

  if (!passphraseInput || !confirmInput || !createBtn) {
    console.warn('Vault form elements not found');
    return;
  }

  // Password strength checking
  passphraseInput.addEventListener('input', (e) => {
    const isStrong = checkPasswordStrength(e.target.value);
    updateCreateButton();
  });

  confirmInput.addEventListener('input', updateCreateButton);

  // Create vault button
  createBtn.addEventListener('click', createVault);

  function updateCreateButton() {
    if (!passphraseInput || !confirmInput || !createBtn) {
      console.warn('Form elements not found for update');
      return;
    }
    
    const passphrase = passphraseInput.value;
    const confirm = confirmInput.value;
    const isStrong = checkPasswordStrength(passphrase);
    const isMatching = passphrase === confirm && passphrase.length > 0;

    createBtn.disabled = !isStrong || !isMatching;
  }
}

// Show status message with compact styling
function showStatus(message, type = 'info') {
  const statusDiv = document.getElementById('vault-status');
  if (statusDiv) {
    statusDiv.textContent = message;
    statusDiv.className = `vault-status-compact ${type}`;
    statusDiv.classList.remove('hidden');
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        statusDiv.classList.add('hidden');
      }, 3000);
    }
  }
}

async function createVault() {
  const passphraseInput = document.getElementById('vault-passphrase');
  const confirmInput = document.getElementById('vault-confirm');
  const createBtn = document.getElementById('create-vault-btn');
  const statusDiv = document.getElementById('vault-status');
  const successDiv = document.getElementById('vault-success');
  
  if (!passphraseInput || !confirmInput || !createBtn) {
    console.error('Required form elements not found');
    return;
  }
  
  const passphrase = passphraseInput.value;
  const confirm = confirmInput.value;

  if (passphrase !== confirm) {
    showStatus('Passphrases do not match', 'error');
    return;
  }

  if (!checkPasswordStrength(passphrase)) {
    showStatus('Please choose a stronger passphrase', 'error');
    return;
  }

  try {
    // Update button state
    createBtn.disabled = true;
    createBtn.innerHTML = 'Creating Vault...';
    showStatus('Creating your memory vault...', 'loading');
    
    // Send vault creation message
    let response;
    const isAndroid = window.Capacitor?.getPlatform?.() === 'android';

    if (isAndroid && window.emmaWebVault) {
      const vaultName = 'Mobile Vault';
      window.emmaWebVault.vaultData = {
        content: { memories: {}, people: {}, media: {} },
        stats: { memoryCount: 0, peopleCount: 0, mediaCount: 0 },
        metadata: { name: vaultName, createdAt: new Date().toISOString() }
      };
      window.emmaWebVault.isOpen = true;
      window.emmaWebVault.cacheSessionPassphrase(passphrase);
      try {
        localStorage.setItem('emmaVaultActive', 'true');
        localStorage.setItem('emmaVaultName', vaultName);
        sessionStorage.setItem('emmaVaultName', vaultName);
      } catch (_) {}
      await window.emmaWebVault.saveToIndexedDB();
      if (typeof window.emmaWebVault.saveToMobileFile === 'function') {
        await window.emmaWebVault.saveToMobileFile('initial-create');
      }
      response = { success: true };
    } else if (window.emmaAPI && window.emmaAPI.vault) {
      response = await window.emmaAPI.vault.initialize({ 
        passphrase: passphrase,
        name: 'My Emma Vault'
      });
      response = { success: response.success || response.initialized };
    } else {
      response = await chrome.runtime.sendMessage({
        action: 'initializeVault',
        passphrase: passphrase
      });
    }

    if (response.success) {
      statusDiv.classList.add('hidden');
      successDiv.classList.remove('hidden');
      
      setTimeout(() => {
        window.location.href = '../dashboard.html';
      }, 2000);
    } else {
      showStatus(response.error || 'Failed to create vault', 'error');
      createBtn.disabled = false;
      createBtn.innerHTML = 'Create Vault';
    }
  } catch (error) {
    console.error('Vault creation error:', error);
    showStatus('Failed to create vault. Please try again.', 'error');
    createBtn.disabled = false;
    createBtn.innerHTML = 'Create Vault';
  }
}

// Utility functions
window.showInstallGuide = function() {
  chrome.tabs.create({ url: chrome.runtime.getURL('INSTALL.html') });
};

window.openTestPage = function() {
  chrome.tabs.create({ url: chrome.runtime.getURL('test.html') });
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init();
  });
} else {
  init();
}
