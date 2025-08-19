// js/options.js - Settings page logic

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await updateStats();
  attachEventListeners();
});

// Load current settings
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
    
    if (response.success) {
      const settings = response.settings;
      
      document.getElementById('auto-capture').checked = settings.autoCapture !== false;
      document.getElementById('capture-user').checked = settings.captureUser !== false;
      document.getElementById('capture-ai').checked = settings.captureAI !== false;
      document.getElementById('analytics').checked = settings.analytics === true;
      document.getElementById('debug-mode').checked = settings.debugMode === true;
      document.getElementById('max-memories').value = settings.maxMemories || 10000;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Update statistics
async function updateStats() {
  try {
    console.log('📊 Options: Updating stats...');
    const response = await chrome.runtime.sendMessage({ action: 'getStats' });
    console.log('📊 Options: getStats response:', response);
    
    if (response && response.success) {
      const stats = response.stats;
      
      document.getElementById('total-memories').textContent = formatNumber(stats.totalMemories || 0);
      document.getElementById('storage-used').textContent = formatBytes(stats.storageUsed || 0);
      
      // Get oldest memory if we have any memories
      if (stats.totalMemories > 0) {
        console.log('📊 Options: Getting oldest memory...');
        const memoriesResponse = await chrome.runtime.sendMessage({
          action: 'getAllMemories',
          limit: 1,
          offset: stats.totalMemories - 1
        });
        console.log('📊 Options: getAllMemories response:', memoriesResponse);
        
        if (memoriesResponse && memoriesResponse.success && memoriesResponse.memories.length > 0) {
          const oldest = memoriesResponse.memories[0];
          const date = new Date(oldest.timestamp);
          document.getElementById('oldest-memory').textContent = date.toLocaleDateString();
        } else {
          document.getElementById('oldest-memory').textContent = '-';
        }
      } else {
        document.getElementById('oldest-memory').textContent = '-';
      }
      
      console.log('📊 Options: Stats updated successfully');
    } else {
      console.warn('📊 Options: getStats failed:', response);
      // Set fallback values
      document.getElementById('total-memories').textContent = '0';
      document.getElementById('storage-used').textContent = '0 B';
      document.getElementById('oldest-memory').textContent = '-';
    }
  } catch (error) {
    console.error('📊 Options: Failed to update stats:', error);
    // Set fallback values on error
    document.getElementById('total-memories').textContent = '0';
    document.getElementById('storage-used').textContent = '0 B';
    document.getElementById('oldest-memory').textContent = '-';
  }
}

// Save settings
async function saveSettings() {
  const settings = {
    autoCapture: document.getElementById('auto-capture').checked,
    captureUser: document.getElementById('capture-user').checked,
    captureAI: document.getElementById('capture-ai').checked,
    analytics: document.getElementById('analytics').checked,
    debugMode: document.getElementById('debug-mode').checked,
    maxMemories: parseInt(document.getElementById('max-memories').value) || 0
  };
  
  try {
    // Save each setting
    for (const [key, value] of Object.entries(settings)) {
      await chrome.runtime.sendMessage({
        action: 'setSetting',
        key,
        value
      });
    }
    
    showNotification('Settings saved successfully!');
  } catch (error) {
    console.error('Failed to save settings:', error);
    showNotification('Failed to save settings', 'error');
  }
}

// Reset to defaults
async function resetSettings() {
  if (!confirm('Reset all settings to defaults?')) return;
  
  const defaults = {
    autoCapture: true,
    captureUser: true,
    captureAI: true,
    analytics: false,
    debugMode: false,
    maxMemories: 10000
  };
  
  try {
    for (const [key, value] of Object.entries(defaults)) {
      await chrome.runtime.sendMessage({
        action: 'setSetting',
        key,
        value
      });
    }
    
    await loadSettings();
    showNotification('Settings reset to defaults');
  } catch (error) {
    console.error('Failed to reset settings:', error);
  }
}

// Export data
async function exportData() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'exportData' });
    
    if (response.success) {
      const data = response.data;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `emma-memories-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      showNotification('Data exported successfully');
    }
  } catch (error) {
    console.error('Export failed:', error);
    showNotification('Export failed', 'error');
  }
}

// Import data
async function importData() {
  document.getElementById('import-file').click();
}

async function handleImport(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    const response = await chrome.runtime.sendMessage({
      action: 'importData',
      data
    });
    
    if (response.success) {
      showNotification(`Imported ${response.result.imported} memories`);
      await updateStats();
    }
  } catch (error) {
    console.error('Import failed:', error);
    showNotification('Import failed', 'error');
  }
}

// Clear all memories
async function clearAllMemories() {
  const confirmText = prompt('Type "DELETE ALL" to confirm clearing all memories:');
  
  if (confirmText !== 'DELETE ALL') {
    showNotification('Cancelled - memories not deleted');
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'clearMemories', confirmToken: 'CONFIRM_DELETE_ALL', origin: 'options_page' });
    
    if (response.success) {
      showNotification('All memories cleared');
      await updateStats();
    } else if (response.error === 'confirmation_required') {
      showNotification('Deletion blocked: confirmation token missing', 'error');
    }
  } catch (error) {
    console.error('Failed to clear memories:', error);
    showNotification('Failed to clear memories', 'error');
  }
}

// Show notification
function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = 'notification show';
  
  if (type === 'error') {
    notification.style.background = '#ef4444';
  } else {
    notification.style.background = '#10b981';
  }
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Utility functions
function formatNumber(num) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// Event listeners
function attachEventListeners() {
  document.getElementById('save-btn').addEventListener('click', saveSettings);
  document.getElementById('reset-btn').addEventListener('click', resetSettings);
  document.getElementById('export-btn').addEventListener('click', exportData);
  document.getElementById('import-btn').addEventListener('click', importData);
  document.getElementById('clear-btn').addEventListener('click', clearAllMemories);
  
  document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleImport(file);
    e.target.value = '';
  });
  
  // Auto-save on toggle change
  const toggles = document.querySelectorAll('input[type="checkbox"]');
  toggles.forEach(toggle => {
    toggle.addEventListener('change', () => {
      // Don't auto-save for disabled inputs
      if (!toggle.disabled) {
        saveSettings();
      }
    });
  });
  
  // Auto-save on number input change
  document.getElementById('max-memories').addEventListener('change', saveSettings);
  
  // Vault Backup & Restore
  setupVaultBackupRestore();
}

// Vault Backup & Restore functionality
function setupVaultBackupRestore() {
  const exportVaultBtn = document.getElementById('export-vault');
  const importVaultBtn = document.getElementById('import-vault');
  const importVaultFile = document.getElementById('import-vault-file');
  const importStatus = document.getElementById('import-status');
  
  // Export vault
  exportVaultBtn.addEventListener('click', async () => {
    try {
      exportVaultBtn.disabled = true;
      exportVaultBtn.innerHTML = '<span>⏳</span> Exporting...';
      
      const backupPassphrase = prompt('Enter a strong passphrase to encrypt the backup (min 12 chars):');
      if (!backupPassphrase || backupPassphrase.length < 12) {
        showImportStatus('error', 'Export cancelled: passphrase too short');
        return;
      }
      const response = await chrome.runtime.sendMessage({
        action: 'vault.exportFile',
        backupPassphrase
      });
      
      if (response.success) {
        // UI triggers download
        const dataStr = JSON.stringify(response.backup, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.filename;
        a.click();
        URL.revokeObjectURL(url);
        
        showImportStatus('success', `Vault exported successfully! File: ${response.filename} (${formatBytes(response.size)})`);
        updateLastBackupTime();
      } else {
        throw new Error(response.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      showImportStatus('error', `Export failed: ${error.message}`);
    } finally {
      exportVaultBtn.disabled = false;
      exportVaultBtn.innerHTML = '<span>📤</span> Export Vault';
    }
  });
  
  // Import vault file picker
  importVaultBtn.addEventListener('click', () => {
    importVaultFile.click();
  });
  
  // Import vault file handler
  importVaultFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      // Ask for passphrases
      const backupPassphrase = prompt('Enter the passphrase used to encrypt this backup:');
      if (!backupPassphrase) {
        showImportStatus('error', 'Import cancelled - backup passphrase required');
        return;
      }
      const newPassphrase = prompt('Enter a new passphrase for the restored vault:');
      if (!newPassphrase) {
        showImportStatus('error', 'Import cancelled - passphrase required');
        return;
      }
      
      if (newPassphrase.length < 8) {
        showImportStatus('error', 'Passphrase must be at least 8 characters');
        return;
      }
      
      showImportStatus('info', 'Reading backup file...');
      
      // Read file
      const fileContent = await readFile(file);
      const backupData = JSON.parse(fileContent);
      
      showImportStatus('info', `Restoring vault backup...`);
      
      // Restore vault
      const response = await chrome.runtime.sendMessage({
        action: 'vault.restoreBackup',
        backupData,
        backupPassphrase,
        newPassphrase: newPassphrase,
        options: { generateNewId: true }
      });
      
      if (response.success) {
        showImportStatus('success', `Vault restored successfully! New vault ID: ${response.vaultId.slice(0, 8)}... (${response.stats.totalMemories} memories)`);
        await loadVaultInfo();
      } else {
        throw new Error(response.error || 'Restore failed');
      }
      
    } catch (error) {
      console.error('Import error:', error);
      showImportStatus('error', `Import failed: ${error.message}`);
    } finally {
      e.target.value = '';
    }
  });
  
  // Load vault info on page load
  loadVaultInfo();
}

function showImportStatus(type, message) {
  const status = document.getElementById('import-status');
  status.className = `import-status ${type}`;
  status.textContent = message;
  
  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      status.style.display = 'none';
    }, 10000);
  }
}

async function loadVaultInfo() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });
    
    if (response.success && response.status) {
      const status = response.status;
      
      document.getElementById('vault-id').textContent = 
        status.vaultId ? status.vaultId.slice(0, 12) + '...' : 'Not available';
      
      document.getElementById('vault-created').textContent = 
        status.lastUnlockedAt ? new Date(status.lastUnlockedAt).toLocaleDateString() : 'Unknown';
      
      // Load last backup time from storage
      const result = await chrome.storage.local.get(['emma_last_backup']);
      document.getElementById('last-backup').textContent = 
        result.emma_last_backup ? new Date(result.emma_last_backup).toLocaleDateString() : 'Never';
    }
  } catch (error) {
    console.error('Failed to load vault info:', error);
  }
}

function updateLastBackupTime() {
  const now = Date.now();
  chrome.storage.local.set({ emma_last_backup: now });
  document.getElementById('last-backup').textContent = new Date(now).toLocaleDateString();
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}