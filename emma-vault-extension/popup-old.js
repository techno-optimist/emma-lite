/**
 * Emma Vault Bridge - Popup Script
 * Handles user interactions and sync management
 * For Debbe - making memory preservation simple and beautiful
 */

// DOM Elements
const elements = {
  statusIcon: document.getElementById('statusIcon'),
  statusText: document.getElementById('statusText'),
  statusDetails: document.getElementById('statusDetails'),
  lastSyncTime: document.getElementById('lastSyncTime'),
  vaultSize: document.getElementById('vaultSize'),
  syncToggle: document.getElementById('syncToggle'),
  fileSelection: document.getElementById('fileSelection'),
  selectFile: document.getElementById('selectFile'),
  selectedFile: document.getElementById('selectedFile'),
  fileName: document.getElementById('fileName'),
  downloadVault: document.getElementById('downloadVault'),
  openDashboard: document.getElementById('openDashboard'),
  showHelp: document.getElementById('showHelp'),
  helpSection: document.getElementById('helpSection'),
  errorMessage: document.getElementById('errorMessage'),
  errorText: document.getElementById('errorText'),
  version: document.getElementById('version')
};

// State
let syncEnabled = false;
let currentFileHandle = null;
let isConnectedToEmma = false;

/**
 * Initialize popup
 */
async function init() {
  console.log('Emma Vault Bridge popup initializing...');
  
  // Set version
  const manifest = chrome.runtime.getManifest();
  elements.version.textContent = manifest.version;
  
  // Load current state
  await loadState();
  
  // Set up event listeners
  setupEventListeners();
  
  // Check connection to Emma Web App
  await checkEmmaConnection();
  
  // Update UI based on state
  updateUI();
}

/**
 * Load state from storage
 */
async function loadState() {
  try {
    const storage = await chrome.storage.local.get([
      'syncEnabled',
      'fileHandleId',
      'lastSync',
      'syncStats',
      'selectedFileName'
    ]);
    
    syncEnabled = storage.syncEnabled || false;
    
    if (storage.selectedFileName) {
      elements.fileName.textContent = storage.selectedFileName;
      elements.selectedFile.classList.remove('hidden');
    }
    
    if (storage.lastSync) {
      updateLastSyncTime(storage.lastSync);
    }
    
    if (storage.syncStats?.lastSyncSize) {
      elements.vaultSize.textContent = formatBytes(storage.syncStats.lastSyncSize);
    }
    
  } catch (error) {
    console.error('Error loading state:', error);
    showError('Failed to load extension state');
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Sync toggle
  elements.syncToggle.addEventListener('click', handleSyncToggle);
  
  // File selection
  elements.selectFile.addEventListener('click', handleFileSelect);
  
  // Action buttons
  elements.downloadVault.addEventListener('click', handleDownload);
  elements.openDashboard.addEventListener('click', handleOpenDashboard);
  elements.showHelp.addEventListener('click', handleShowHelp);
  
  // Listen for updates from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SYNC_UPDATE') {
      updateSyncStatus(message.data);
    }
  });
}

/**
 * Check connection to Emma Web App
 */
async function checkEmmaConnection() {
  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      updateConnectionStatus(false, 'No active tab');
      return;
    }
    
    // Check if it's an Emma Web App tab
    const isEmmaTab = 
      tab.url?.includes('localhost') ||
      tab.url?.includes('127.0.0.1') ||
      tab.url?.includes('emma') ||
      tab.url?.includes('render.com');
    
    if (!isEmmaTab) {
      updateConnectionStatus(false, 'Not on Emma Web App');
      return;
    }
    
    // Try to communicate with content script
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'CHECK_CONNECTION'
      });
      
      updateConnectionStatus(true, 'Connected to Emma');
    } catch (error) {
      // Content script might not be injected yet
      updateConnectionStatus(false, 'Emma Web App not ready');
    }
    
  } catch (error) {
    console.error('Connection check error:', error);
    updateConnectionStatus(false, 'Connection check failed');
  }
}

/**
 * Update connection status
 */
function updateConnectionStatus(connected, message) {
  isConnectedToEmma = connected;
  
  elements.statusIcon.className = connected ? 'status-icon connected' : 'status-icon disconnected';
  elements.statusText.textContent = message;
  
  // Enable/disable sync toggle based on connection
  elements.syncToggle.disabled = !connected;
  
  if (!connected && syncEnabled) {
    // Show warning if sync is enabled but not connected
    showError('Sync enabled but not connected to Emma Web App');
  }
}

/**
 * Handle sync toggle
 */
async function handleSyncToggle() {
  try {
    if (!syncEnabled) {
      // Enable sync
      if (!currentFileHandle) {
        // Need to select file first
        elements.fileSelection.classList.remove('hidden');
        elements.syncToggle.textContent = 'Waiting for file...';
        elements.syncToggle.disabled = true;
        return;
      }
      
      await enableSync();
    } else {
      // Disable sync
      await disableSync();
    }
  } catch (error) {
    console.error('Sync toggle error:', error);
    showError(error.message);
  }
}

/**
 * Handle file selection
 */
async function handleFileSelect() {
  try {
    // Check if File System Access API is supported
    if (!window.showSaveFilePicker) {
      showError('File System Access API not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    
    // Show file picker
    const options = {
      types: [
        {
          description: 'Emma Vault Files',
          accept: {
            'application/emma': ['.emma'],
            'application/json': ['.emma']
          }
        }
      ],
      suggestedName: 'debbe-memories.emma',
      startIn: 'documents'
    };
    
    // Request file access
    const handle = await window.showSaveFilePicker(options);
    currentFileHandle = handle;
    
    // Test write access immediately
    try {
      const testData = JSON.stringify({
        version: '1.0',
        created: new Date().toISOString(),
        name: 'Test Vault',
        test: true
      });
      
      const writable = await handle.createWritable();
      await writable.write(testData);
      await writable.close();
      
      console.log('✅ File write test successful');
    } catch (writeError) {
      console.error('❌ File write test failed:', writeError);
      showError('Cannot write to selected file. Please choose a different location.');
      return;
    }
    
    // Save file info
    const fileName = handle.name;
    await chrome.storage.local.set({ 
      selectedFileName: fileName,
      fileHandleId: handle.name, // Can't persist handle directly
      fileSelected: true,
      lastFileTest: new Date().toISOString()
    });
    
    // Send file handle to background script
    await chrome.runtime.sendMessage({
      action: 'SET_FILE_HANDLE',
      handle: handle
    });
    
    // Update UI
    elements.fileName.textContent = fileName;
    elements.selectedFile.classList.remove('hidden');
    elements.syncToggle.disabled = false;
    elements.syncToggle.textContent = 'Enable Sync';
    
    // Auto-enable sync after file selection
    await enableSync();
    
  } catch (error) {
    if (error.name === 'AbortError') {
      // User cancelled - this is normal
      console.log('File selection cancelled by user');
      return;
    }
    
    console.error('File selection error:', error);
    
    // Provide specific error messages
    if (error.name === 'SecurityError') {
      showError('Security error: Please try selecting a file in your Documents folder');
    } else if (error.name === 'NotAllowedError') {
      showError('Permission denied: Please allow file access when prompted');
    } else {
      showError('Failed to select file: ' + error.message);
    }
  }
}

/**
 * Enable sync
 */
async function enableSync() {
  try {
    // Send message to background
    const response = await chrome.runtime.sendMessage({
      action: 'ENABLE_SYNC',
      fileHandle: currentFileHandle
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to enable sync');
    }
    
    // Update state
    syncEnabled = true;
    await chrome.storage.local.set({ syncEnabled: true });
    
    // Update UI
    updateUI();
    
    // Notify user
    showSuccess('Sync enabled! Your vault will auto-save.');
    
  } catch (error) {
    console.error('Enable sync error:', error);
    showError(error.message);
  }
}

/**
 * Disable sync
 */
async function disableSync() {
  try {
    // Send message to background
    await chrome.runtime.sendMessage({ action: 'DISABLE_SYNC' });
    
    // Update state
    syncEnabled = false;
    await chrome.storage.local.set({ syncEnabled: false });
    
    // Update UI
    updateUI();
    
    // Notify user
    showSuccess('Sync disabled');
    
  } catch (error) {
    console.error('Disable sync error:', error);
    showError(error.message);
  }
}

/**
 * Update UI based on current state
 */
function updateUI() {
  if (syncEnabled) {
    elements.syncToggle.textContent = 'Disable Sync';
    elements.syncToggle.classList.add('active');
    elements.fileSelection.classList.add('hidden');
    elements.statusIcon.classList.add('connected');
  } else {
    elements.syncToggle.textContent = 'Enable Sync';
    elements.syncToggle.classList.remove('active');
    elements.statusIcon.classList.remove('connected');
  }
}

/**
 * Handle download button
 */
async function handleDownload() {
  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      showError('No active tab');
      return;
    }
    
    // Send message to content script to trigger download
    await chrome.tabs.sendMessage(tab.id, {
      action: 'DOWNLOAD_VAULT'
    });
    
    showSuccess('Download started');
    
  } catch (error) {
    console.error('Download error:', error);
    showError('Failed to start download');
  }
}

/**
 * Handle open dashboard
 */
async function handleOpenDashboard() {
  try {
    // Open Emma Web App dashboard
    await chrome.tabs.create({
      url: 'https://emma-vault.onrender.com/dashboard'
    });
    
    window.close();
    
  } catch (error) {
    console.error('Open dashboard error:', error);
    showError('Failed to open dashboard');
  }
}

/**
 * Handle show help
 */
function handleShowHelp() {
  const isHidden = elements.helpSection.classList.contains('hidden');
  elements.helpSection.classList.toggle('hidden');
  
  // Update button text
  elements.showHelp.querySelector('span:last-child').textContent = 
    isHidden ? 'Close' : 'Help';
}

/**
 * Update sync status from background
 */
function updateSyncStatus(data) {
  if (data.syncing) {
    elements.statusIcon.classList.add('syncing');
    elements.statusText.textContent = 'Syncing...';
  } else if (data.success) {
    elements.statusIcon.classList.remove('syncing');
    elements.statusText.textContent = 'Synced';
    updateLastSyncTime(new Date().toISOString());
    
    if (data.bytesWritten) {
      elements.vaultSize.textContent = formatBytes(data.bytesWritten);
    }
  } else if (data.error) {
    elements.statusIcon.classList.remove('syncing');
    showError(data.error);
  }
}

/**
 * Update last sync time
 */
function updateLastSyncTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  let timeStr;
  if (diff < 60000) { // Less than 1 minute
    timeStr = 'Just now';
  } else if (diff < 3600000) { // Less than 1 hour
    const minutes = Math.floor(diff / 60000);
    timeStr = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diff < 86400000) { // Less than 1 day
    const hours = Math.floor(diff / 3600000);
    timeStr = `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    timeStr = date.toLocaleDateString();
  }
  
  elements.lastSyncTime.textContent = timeStr;
}

/**
 * Show error message
 */
function showError(message) {
  elements.errorText.textContent = message;
  elements.errorMessage.classList.remove('hidden');
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    elements.errorMessage.classList.add('hidden');
  }, 5000);
}

/**
 * Show success message (reuse error display with different styling)
 */
function showSuccess(message) {
  elements.errorText.textContent = message;
  elements.errorMessage.classList.remove('hidden');
  elements.errorMessage.style.background = '#D1FAE5';
  elements.errorMessage.style.borderColor = '#A7F3D0';
  elements.errorMessage.style.color = '#065F46';
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    elements.errorMessage.classList.add('hidden');
    // Reset styles
    elements.errorMessage.style = '';
  }, 3000);
}

/**
 * Format bytes for display
 */
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
