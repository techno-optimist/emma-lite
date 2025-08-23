/**
 * Emma Vault Bridge - Content Script
 * Injected into Emma Web App pages to enable real-time vault synchronization
 * Dedicated to Debbe - preserving memories with love
 */

console.log('Emma Vault Bridge: Content script loaded');

// Configuration
const EMMA_VAULT_CHANNEL = 'emma-vault-bridge';
const SYNC_DEBOUNCE_MS = 500; // Debounce rapid changes

// Track sync state
let syncEnabled = false;
let syncDebounceTimer = null;
let lastSyncHash = null;

/**
 * WEBAPP-FIRST: Handle extension popup vault status requests
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkVaultStatus') {
    console.log('🔐 Content Script: Checking webapp vault status');
    
    // Check if webapp vault is unlocked by looking for vault indicators
    const vaultStatus = getWebappVaultStatus();
    console.log('🔐 Content Script: Vault status:', vaultStatus);
    
    sendResponse(vaultStatus);
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'getVaultStats') {
    console.log('🎯 Content Script: *** PROCESSING getVaultStats REQUEST ***');
    console.log('🎯 Content Script: Request received from popup extension');
    console.log('🎯 Content Script: About to call getWebappVaultStats()...');
    
    // Get detailed vault statistics from webapp
    const vaultStats = getWebappVaultStats();
    console.log('🎯 Content Script: *** VAULT STATS RESULT ***:', vaultStats);
    console.log('🎯 Content Script: Sending response back to popup');
    
    sendResponse(vaultStats);
    return true; // Keep message channel open for async response
  }
});

/**
 * Get current webapp vault status by checking DOM/localStorage
 */
function getWebappVaultStatus() {
  try {
    // Method 1: Check sessionStorage for vault status (CORRECT KEYS!)
    const sessionVaultActive = sessionStorage.getItem('emmaVaultActive') === 'true';
    const sessionVaultName = sessionStorage.getItem('emmaVaultName');
    
    if (sessionVaultActive && sessionVaultName) {
      console.log('🔐 Content Script: Found active vault in sessionStorage:', sessionVaultName);
      return {
        isUnlocked: true,
        vaultName: sessionVaultName,
        source: 'sessionStorage'
      };
    }
    
    // Method 2: Check localStorage for vault state (CORRECT KEYS!)
    const localVaultActive = localStorage.getItem('emmaVaultActive') === 'true';
    const localVaultName = localStorage.getItem('emmaVaultName');
    
    if (localVaultActive && localVaultName) {
      console.log('🔐 Content Script: Found active vault in localStorage:', localVaultName);
      return {
        isUnlocked: true,
        vaultName: localVaultName,
        source: 'localStorage'
      };
    }
    
    // Method 3: Check global vault status object
    if (window.currentVaultStatus && window.currentVaultStatus.isUnlocked) {
      console.log('🔐 Content Script: Found vault status in window.currentVaultStatus:', window.currentVaultStatus.name);
      return {
        isUnlocked: true,
        vaultName: window.currentVaultStatus.name || 'Emma Vault',
        source: 'currentVaultStatus'
      };
    }
    
    // Method 4: Check for Emma web vault object
    if (window.emmaWebVault && window.emmaWebVault.isOpen) {
      console.log('🔐 Content Script: Found open vault in window.emmaWebVault');
      return {
        isUnlocked: true,
        vaultName: window.emmaWebVault.vaultData?.metadata?.name || 'Emma Vault',
        source: 'webVaultObject'
      };
    }
    
    // Default: vault is locked
    console.log('🔐 Content Script: No vault indicators found - vault is locked');
    return {
      isUnlocked: false,
      source: 'default'
    };
    
  } catch (error) {
    console.error('🔐 Content Script: Error checking vault status:', error);
    return {
      isUnlocked: false,
      error: error.message,
      source: 'error'
    };
  }
}

/**
 * Get detailed vault statistics from webapp
 */
function getWebappVaultStats() {
  try {
    console.log('📊 Content Script: Extracting vault statistics from webapp');
    
    // Method 1: Get stats from EmmaWebVault object
    console.log('📊 Content Script: Checking EmmaWebVault:', {
      exists: !!window.emmaWebVault,
      isOpen: window.emmaWebVault?.isOpen,
      hasVaultData: !!window.emmaWebVault?.vaultData,
      vaultDataKeys: window.emmaWebVault?.vaultData ? Object.keys(window.emmaWebVault.vaultData) : 'none'
    });
    
    if (window.emmaWebVault && window.emmaWebVault.isOpen && window.emmaWebVault.vaultData) {
      const vaultData = window.emmaWebVault.vaultData;
      console.log('📊 Content Script: Vault data structure:', {
        hasContent: !!vaultData.content,
        contentKeys: vaultData.content ? Object.keys(vaultData.content) : 'none',
        memoriesType: typeof vaultData.content?.memories,
        memoriesKeys: vaultData.content?.memories ? Object.keys(vaultData.content.memories) : 'none',
        peopleType: typeof vaultData.content?.people,
        peopleKeys: vaultData.content?.people ? Object.keys(vaultData.content.people) : 'none'
      });
      
      const memories = vaultData.content?.memories || {};
      const people = vaultData.content?.people || {};
      
      // Calculate vault size (rough estimate)
      const vaultSizeBytes = JSON.stringify(vaultData).length;
      const vaultSizeKB = Math.round(vaultSizeBytes / 1024);
      
      const stats = {
        success: true,
        memoryCount: Object.keys(memories).length,
        peopleCount: Object.keys(people).length,
        vaultSize: `${vaultSizeKB} KB`,
        vaultName: vaultData.metadata?.name || window.emmaWebVault.currentVault?.name || 'Emma Vault',
        lastSync: 'Live',
        source: 'emmaWebVault'
      };
      
      console.log('📊 Content Script: Stats from EmmaWebVault:', stats);
      console.log('📊 Content Script: Raw memories object:', memories);
      console.log('📊 Content Script: Raw people object:', people);
      return stats;
    }
    
    // Method 2: Get basic stats from session/localStorage
    const vaultName = sessionStorage.getItem('emmaVaultName') || 
                     localStorage.getItem('emmaVaultName') || 
                     'Emma Vault';
    
    const isUnlocked = sessionStorage.getItem('emmaVaultActive') === 'true' || 
                      localStorage.getItem('emmaVaultActive') === 'true';
    
    if (isUnlocked) {
      // Try to get stats from DOM or global objects
      let memoryCount = 0;
      let peopleCount = 0;
      
      // Check if dashboard constellation shows memory count
      const constellationMemories = document.querySelectorAll('.memory-node, .constellation-memory');
      if (constellationMemories.length > 0) {
        memoryCount = constellationMemories.length;
      }
      
      // Check for any people indicators
      const peopleElements = document.querySelectorAll('.people-avatar, .person-node');
      if (peopleElements.length > 0) {
        peopleCount = peopleElements.length;
      }
      
      const stats = {
        success: true,
        memoryCount: memoryCount,
        peopleCount: peopleCount,
        vaultSize: '? KB',
        vaultName: vaultName,
        lastSync: 'Live',
        source: 'sessionStorage'
      };
      
      console.log('📊 Content Script: Stats from sessionStorage/DOM:', stats);
      return stats;
    }
    
    // Method 3: Default fallback
    console.log('📊 Content Script: No vault data found, returning defaults');
    return {
      success: false,
      memoryCount: 0,
      peopleCount: 0,
      vaultSize: '0 KB',
      vaultName: 'No Vault',
      lastSync: 'Never',
      source: 'default'
    };
    
  } catch (error) {
    console.error('📊 Content Script: Error getting vault stats:', error);
    return {
      success: false,
      error: error.message,
      memoryCount: 0,
      peopleCount: 0,
      vaultSize: '0 KB',
      vaultName: 'Error',
      lastSync: 'Never',
      source: 'error'
    };
  }
}

/**
 * Initialize connection with Emma Web App
 */
function initializeEmmaConnection() {
  // Check if we're on an Emma Web App page
  if (!isEmmaWebApp()) {
    console.log('Not an Emma Web App page, extension inactive');
    return;
  }
  
  console.log('Emma Web App detected - initializing vault bridge');
  
  // Inject our presence marker
  injectExtensionMarker();
  
  // Set up message listeners
  setupMessageListeners();
  
  // If the web app exposes current vault content (initial sync), accept it into background memory
  try {
    if (window.__EMMA_CURRENT_VAULT__) {
      chrome.runtime.sendMessage({ action: 'VAULT_LOAD', data: window.__EMMA_CURRENT_VAULT__ });
    }
  } catch {}
  
  // Check initial sync status
  checkSyncStatus();
  
  // Notify Emma Web App that extension is available
  notifyEmmaWebApp();
}

/**
 * Check if current page is Emma Web App
 */
function isEmmaWebApp() {
  // Check for Emma-specific elements or patterns
  const indicators = [
    document.querySelector('.emma-logo'),
    document.querySelector('#emma-vault-modal'),
    document.querySelector('[data-emma-app]'),
    window.location.pathname.includes('emma'),
    document.title.toLowerCase().includes('emma')
  ];
  
  return indicators.some(indicator => !!indicator);
}

/**
 * Inject extension presence marker
 */
function injectExtensionMarker() {
  // Create a marker that Emma Web App can detect
  const marker = document.createElement('div');
  marker.id = 'emma-vault-extension-marker';
  marker.dataset.version = chrome.runtime.getManifest().version;
  marker.dataset.enabled = 'true';
  marker.style.display = 'none';
  document.documentElement.appendChild(marker);
  
  // Also set a window property for easy detection
  window.EmmaVaultExtension = {
    version: chrome.runtime.getManifest().version,
    enabled: true,
    sync: syncVaultData,
    checkStatus: checkSyncStatus,
    enableSync: enableSync,
    disableSync: disableSync
  };
}

/**
 * Set up message listeners
 */
function setupMessageListeners() {
  // Listen for messages from Emma Web App
  window.addEventListener('message', (event) => {
    // Validate origin
    if (!isValidOrigin(event.origin)) return;
    
    // Check if it's an Emma Vault message
    if (event.data?.channel !== EMMA_VAULT_CHANNEL) return;
    
    handleEmmaMessage(event.data);
  });
  
  // Listen for storage events (cross-tab sync)
  window.addEventListener('storage', (event) => {
    if (event.key?.startsWith('emma-vault-')) {
      handleStorageSync(event);
    }
  });
}

/**
 * Handle messages from Emma Web App
 */
function handleEmmaMessage(message) {
  console.log('Received Emma message:', message.type);
  
  switch (message.type) {
    case 'SET_LLM_KEY':
      // Forward to background for secure, encrypted storage
      chrome.runtime.sendMessage({ action: 'SET_LLM_KEY', key: message.key }, (response) => {
        postToEmma({
          channel: EMMA_VAULT_CHANNEL,
          type: 'EMMA_RESPONSE',
          messageId: message.messageId,
          success: response?.success || false,
          error: response?.error
        });
      });
      break;
    case 'VAULT_UPDATE':
      handleVaultUpdate(message.data);
      break;
      
    case 'REQUEST_SYNC_STATUS':
      sendSyncStatus();
      break;
      
    case 'REQUEST_VAULT_DATA':
      sendVaultData();
      break;
      
    case 'EMMA_DELETE_MEMORY':
      handleDeleteMemory(message);
      break;
      
    case 'REQUEST_VAULT_STATUS':
      sendVaultStatus();
      break;
      
    case 'REQUEST_PEOPLE_DATA':
      sendPeopleData();
      break;
      
    case 'REQUEST_MEMORIES_DATA':
      sendMemoriesData();
      break;
      
    case 'REQUEST_VAULT_DATA_FOR_VECTORLESS':
      sendVaultDataForVectorless();
      break;
      
    case 'ENABLE_SYNC':
      enableSync();
      break;
      
    case 'DISABLE_SYNC':
      disableSync();
      break;
      
    case 'SAVE_MEMORY':
      handleSaveMemory(message.data);
      break;
      
    case 'UPDATE_MEMORY':
      handleUpdateMemory(message.data);
      break;
      
    case 'SAVE_PERSON':
      handleSavePerson(message.data);
      break;
      
    case 'UPDATE_PERSON':
      handleUpdatePerson(message.data);
      break;
      
    case 'SAVE_MEDIA':
      handleSaveMedia(message.data);
      break;
      
    case 'EXTENSION_READY':
      console.log('✅ Extension ready message received');
      sendSyncStatus();
      break;
      
    case 'SYNC_STATUS':
      console.log('📊 Sync status message received');
      // Extension already knows its own status, just acknowledge
      break;
      
    case 'MEMORY_SAVED':
    case 'MEMORY_SAVE_ERROR':
    case 'PERSON_SAVED':
    case 'PERSON_SAVE_ERROR':
    case 'MEDIA_SAVED':
    case 'MEDIA_SAVE_ERROR':
      console.log('📨 Save response received:', message.type);
      // These are responses from extension to web app, just log
      break;
      
    case 'VAULT_STATUS':
      console.log('📊 Vault status response - forwarding to web app');
      // This is a response from background to web app, just pass through
      break;
      
    case 'PEOPLE_DATA':
    case 'MEMORIES_DATA':
      console.log('📊 Data response - forwarding to web app:', message.type);
      // These are responses from extension to web app, just pass through
      break;
      
    default:
      console.warn('Unknown message type:', message.type);
  }
}

/**
 * Handle vault update from Emma Web App
 */
function handleVaultUpdate(vaultData) {
  if (!syncEnabled) {
    console.log('Sync disabled, ignoring vault update');
    return;
  }
  
  // Debounce rapid updates
  clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    syncVaultData(vaultData);
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Sync vault data to local file
 */
async function syncVaultData(vaultData) {
  try {
    // Generate hash to check if data actually changed
    const currentHash = await generateHash(JSON.stringify(vaultData));
    if (currentHash === lastSyncHash) {
      console.log('Vault data unchanged, skipping sync');
      return;
    }
    
    // Show sync indicator
    showSyncIndicator('syncing');
    
    // Send to background script
    const response = await chrome.runtime.sendMessage({
      action: 'VAULT_UPDATE',
      data: vaultData
    });
    
    if (response.success) {
      lastSyncHash = currentHash;
      showSyncIndicator('success');
      console.log('Vault synced successfully:', response.bytesWritten, 'bytes');
      
      // Notify Emma Web App of successful sync
      postToEmma({
        channel: EMMA_VAULT_CHANNEL,
        type: 'SYNC_COMPLETE',
        data: {
          bytesWritten: response.bytesWritten,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      showSyncIndicator('error');
      console.error('Vault sync failed:', response.error);
      
      // Notify Emma Web App of sync failure
      postToEmma({
        channel: EMMA_VAULT_CHANNEL,
        type: 'SYNC_ERROR',
        error: response.error
      });
    }
  } catch (error) {
    showSyncIndicator('error');
    console.error('Sync error:', error);
  }
}

/**
 * Check sync status with background script
 */
async function checkSyncStatus() {
  try {
    const status = await chrome.runtime.sendMessage({
      action: 'CHECK_STATUS'
    });
    
    syncEnabled = status.syncEnabled;
    sendSyncStatus(status);
    
    return status;
  } catch (error) {
    console.error('Status check error:', error);
    return { connected: false, error: error.message };
  }
}

/**
 * Enable synchronization
 */
async function enableSync() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'ENABLE_SYNC'
    });
    
    if (response.success) {
      syncEnabled = true;
      sendSyncStatus({ syncEnabled: true });
      showSyncIndicator('ready');
    }
    
    return response;
  } catch (error) {
    console.error('Enable sync error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Disable synchronization
 */
async function disableSync() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'DISABLE_SYNC'
    });
    
    syncEnabled = false;
    sendSyncStatus({ syncEnabled: false });
    showSyncIndicator('disabled');
    
    return response;
  } catch (error) {
    console.error('Disable sync error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send sync status to Emma Web App
 */
function sendSyncStatus(status = {}) {
  postToEmma({
    channel: EMMA_VAULT_CHANNEL,
    type: 'SYNC_STATUS',
    data: {
      extensionVersion: chrome.runtime.getManifest().version,
      syncEnabled: syncEnabled,
      ...status
    }
  });
}

/**
 * Send vault data to Emma Web App (extension manages vault, not web app)
 */
function sendVaultData() {
  console.log('📦 Web app requesting vault data - extension manages vault, not web app');
  
  // Tell web app that extension manages the vault
  postToEmma({
    channel: EMMA_VAULT_CHANNEL,
    type: 'EXTENSION_MANAGES_VAULT',
    data: {
      message: 'Extension manages vault - web app should route all saves through extension',
      extensionVersion: chrome.runtime.getManifest().version
    }
  });
}

/**
 * Send vault status to web app
 */
async function sendVaultStatus() {
  console.log('📊 Checking vault status in extension...');
  
  // CRITICAL FIX: Check web app localStorage as source of truth
  const webAppVaultActive = localStorage.getItem('emmaVaultActive') === 'true';
  const webAppVaultName = localStorage.getItem('emmaVaultName');
  
  // Also check extension internal state using new FSM
  const response = await chrome.runtime.sendMessage({ action: 'CHECK_STATE' });
  
  // Use web app state as primary source of truth (it's more persistent)
  const vaultOpen = webAppVaultActive || (response?.state === 'unlocked');
  const vaultName = webAppVaultName || response?.fileName || null;
  
  console.log('📊 EXTENSION: Vault status determined:', {
    webAppActive: webAppVaultActive,
    extensionReady: response?.vaultReady,
    finalStatus: vaultOpen,
    vaultName: vaultName
  });
  
  postToEmma({
    channel: EMMA_VAULT_CHANNEL,
    type: 'VAULT_STATUS',
    data: {
      vaultOpen: vaultOpen,
      vaultName: vaultName,
      extensionVersion: chrome.runtime.getManifest().version
    }
  });
}

/**
 * Send people data to web app
 */
async function sendPeopleData() {
  console.log('👥 Sending people data from extension storage...');
  
  // Get people data from extension storage
  const response = await chrome.runtime.sendMessage({ action: 'GET_PEOPLE_DATA' });
  
  postToEmma({
    channel: EMMA_VAULT_CHANNEL,
    type: 'PEOPLE_DATA',
    data: response?.people || []
  });
}

/**
 * Send memories data to web app
 */
async function sendMemoriesData() {
  console.log('📝 Sending memories data from extension storage...');
  
  // Get memories data from extension storage
  const response = await chrome.runtime.sendMessage({ action: 'GET_MEMORIES_DATA' });
  
  postToEmma({
    channel: EMMA_VAULT_CHANNEL,
    type: 'MEMORIES_DATA',
    data: response?.memories || []
  });
}

/**
 * Send vault data for vectorless AI processing
 */
async function sendVaultDataForVectorless() {
  console.log('🧠 Sending vault data for vectorless AI processing...');
  
  try {
    // Get full vault data from background script
    const response = await chrome.runtime.sendMessage({ action: 'GET_VAULT_DATA_FOR_VECTORLESS' });
    
    if (response?.success) {
      console.log('🧠 VECTORLESS: Vault data retrieved, sending to web app');
      
      postToEmma({
        channel: EMMA_VAULT_CHANNEL,
        type: 'VAULT_DATA_FOR_VECTORLESS',
        data: response.vaultData
      });
    } else {
      console.warn('🧠 VECTORLESS: No vault data available:', response?.error);
      
      postToEmma({
        channel: EMMA_VAULT_CHANNEL,
        type: 'VAULT_DATA_FOR_VECTORLESS',
        data: null,
        error: response?.error || 'No vault data available'
      });
    }
  } catch (error) {
    console.error('🧠 VECTORLESS: Failed to get vault data:', error);
    
    postToEmma({
      channel: EMMA_VAULT_CHANNEL,
      type: 'VAULT_DATA_FOR_VECTORLESS',
      data: null,
      error: error.message
    });
  }
}

/**
 * Handle memory deletion request from web app
 */
async function handleDeleteMemory(message) {
  console.log('🗑️ CONTENT SCRIPT: Handling delete memory request:', message.memoryId);
  
  try {
    // Forward delete request to background script
    const response = await chrome.runtime.sendMessage({ 
      action: 'DELETE_MEMORY', 
      memoryId: message.memoryId 
    });
    
    // Send response back to web app
    postToEmma({
      channel: EMMA_VAULT_CHANNEL,
      type: 'EMMA_RESPONSE',
      messageId: message.messageId,
      success: response?.success || false,
      error: response?.error
    });
    
    console.log('🗑️ CONTENT SCRIPT: Delete response sent to web app');
    
  } catch (error) {
    console.error('🗑️ CONTENT SCRIPT: Delete failed:', error);
    
    // Send error response back to web app
    postToEmma({
      channel: EMMA_VAULT_CHANNEL,
      type: 'EMMA_RESPONSE',
      messageId: message.messageId,
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle memory save from web app
 */
function handleSaveMemory(memoryData) {
  console.log('💾 Extension: Handling memory save from web app:', memoryData);
  
  // Forward to background script for actual vault saving
  chrome.runtime.sendMessage({
    action: 'SAVE_MEMORY_TO_VAULT',
    data: memoryData
  }, (response) => {
    if (response && response.success) {
      console.log('✅ Memory saved to vault successfully');
      // Notify web app of success
      postToEmma({
        channel: EMMA_VAULT_CHANNEL,
        type: 'MEMORY_SAVED',
        data: { success: true, id: response.id }
      });
    } else {
      console.error('❌ Failed to save memory to vault:', response?.error);
      // Notify web app of failure
      postToEmma({
        channel: EMMA_VAULT_CHANNEL,
        type: 'MEMORY_SAVE_ERROR',
        data: { success: false, error: response?.error || 'Unknown error' }
      });
    }
  });
}

/**
 * Handle person save from web app
 */
function handleSavePerson(personData) {
  console.log('👥 Extension: Handling person save from web app:', personData);
  
  // Forward to background script for actual vault saving
  chrome.runtime.sendMessage({
    action: 'SAVE_PERSON_TO_VAULT',
    data: personData
  }, (response) => {
    if (response && response.success) {
      console.log('✅ Person saved to vault successfully');
      // Notify web app of success
      postToEmma({
        channel: EMMA_VAULT_CHANNEL,
        type: 'PERSON_SAVED',
        data: { success: true, id: response.id }
      });
    } else {
      console.error('❌ Failed to save person to vault:', response?.error);
      // Notify web app of failure
      postToEmma({
        channel: EMMA_VAULT_CHANNEL,
        type: 'PERSON_SAVE_ERROR',
        data: { success: false, error: response?.error || 'Unknown error' }
      });
    }
  });
}

/**
 * Handle memory update from web app
 */
function handleUpdateMemory(memoryData) {
  console.log('💾 Extension: Handling memory update from web app:', memoryData);
  
  // Forward to background script for actual vault updating
  chrome.runtime.sendMessage({
    action: 'UPDATE_MEMORY_IN_VAULT',
    data: memoryData
  }, (response) => {
    if (response && response.success) {
      console.log('✅ Memory updated in vault successfully');
      // Notify web app of success
      postToEmma({
        channel: EMMA_VAULT_CHANNEL,
        type: 'MEMORY_UPDATED',
        data: { success: true, id: response.id }
      });
    } else {
      console.error('❌ Failed to update memory in vault:', response?.error);
      // Notify web app of failure
      postToEmma({
        channel: EMMA_VAULT_CHANNEL,
        type: 'MEMORY_UPDATE_ERROR',
        data: { success: false, error: response?.error || 'Unknown error' }
      });
    }
  });
}

/**
 * Handle person update from web app
 */
function handleUpdatePerson(personData) {
  console.log('👥 Extension: Handling person update from web app:', personData);
  
  // Forward to background script for actual vault updating
  chrome.runtime.sendMessage({
    action: 'UPDATE_PERSON_IN_VAULT',
    data: personData
  }, (response) => {
    if (response && response.success) {
      console.log('✅ Person updated in vault successfully');
      // Notify web app of success
      postToEmma({
        channel: EMMA_VAULT_CHANNEL,
        type: 'PERSON_UPDATED',
        data: { success: true, id: response.id }
      });
    } else {
      console.error('❌ Failed to update person in vault:', response?.error);
      // Notify web app of failure
      postToEmma({
        channel: EMMA_VAULT_CHANNEL,
        type: 'PERSON_UPDATE_ERROR',
        data: { success: false, error: response?.error || 'Unknown error' }
      });
    }
  });
}

/**
 * Handle media save from web app
 */
function handleSaveMedia(mediaData) {
  console.log('📷 Extension: Handling media save from web app:', mediaData);
  
  // Forward to background script for actual vault saving
  chrome.runtime.sendMessage({
    action: 'SAVE_MEDIA_TO_VAULT',
    data: mediaData
  }, (response) => {
    if (response && response.success) {
      console.log('✅ Media saved to vault successfully');
      // Notify web app of success
      postToEmma({
        channel: EMMA_VAULT_CHANNEL,
        type: 'MEDIA_SAVED',
        data: { success: true, id: response.id }
      });
    } else {
      console.error('❌ Failed to save media to vault:', response?.error);
      // Notify web app of failure
      postToEmma({
        channel: EMMA_VAULT_CHANNEL,
        type: 'MEDIA_SAVE_ERROR',
        data: { success: false, error: response?.error || 'Unknown error' }
      });
    }
  });
}

/**
 * Post message to Emma Web App
 */
function postToEmma(message) {
  window.postMessage(message, window.location.origin);
}

/**
 * Notify Emma Web App that extension is available
 */
function notifyEmmaWebApp() {
  // Initial notification
  postToEmma({
    channel: EMMA_VAULT_CHANNEL,
    type: 'EXTENSION_READY',
    data: {
      version: chrome.runtime.getManifest().version,
      capabilities: ['file-sync', 'real-time', 'auto-backup']
    }
  });
  
  // Also dispatch a custom event
  window.dispatchEvent(new CustomEvent('emma-vault-extension-ready', {
    detail: {
      version: chrome.runtime.getManifest().version
    }
  }));
}

/**
 * Show sync indicator overlay with progress support
 */
function showSyncIndicator(status, progress = null, details = null) {
  // Remove existing indicator
  const existing = document.getElementById('emma-sync-indicator');
  if (existing) existing.remove();
  
  // Create indicator
  const indicator = document.createElement('div');
  indicator.id = 'emma-sync-indicator';
  indicator.className = `emma-sync-indicator emma-sync-${status}`;
  
  const icons = {
    syncing: '↻',
    success: '✓',
    error: '✗',
    ready: '●',
    disabled: '○'
  };
  
  // Build indicator content
  let content = `
    <span class="emma-sync-icon">${icons[status] || ''}</span>
    <span class="emma-sync-text">${getSyncStatusText(status, details)}</span>
  `;
  
  // Add progress bar for syncing status
  if (status === 'syncing' && progress !== null) {
    content += `
      <div class="emma-sync-progress">
        <div class="emma-sync-progress-bar" style="width: ${progress}%"></div>
      </div>
    `;
  }
  
  indicator.innerHTML = content;
  
  // Style the indicator
  indicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 12px 20px;
    border-radius: 24px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 999999;
    animation: emma-fade-in 0.3s ease;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    max-width: 300px;
  `;
  
  document.body.appendChild(indicator);
  
  // Auto-hide success indicator
  if (status === 'success') {
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.style.animation = 'emma-fade-out 0.3s ease';
        setTimeout(() => indicator.remove(), 300);
      }
    }, 2500);
  }
  
  // Auto-hide error indicator after longer delay
  if (status === 'error') {
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.style.animation = 'emma-fade-out 0.3s ease';
        setTimeout(() => indicator.remove(), 300);
      }
    }, 5000);
  }
}

/**
 * Get sync status text
 */
function getSyncStatusText(status, details = null) {
  const texts = {
    syncing: details || 'Saving to vault...',
    success: details || 'Vault saved',
    error: details || 'Sync failed',
    ready: details || 'Vault sync ready',
    disabled: 'Sync disabled'
  };
  
  return texts[status] || '';
}

/**
 * Validate message origin
 */
function isValidOrigin(origin) {
  const validOrigins = [
    'http://localhost',
    'http://127.0.0.1',
    'https://emma-hjjc.onrender.com'
  ];
  return validOrigins.includes(origin);
}

/**
 * Generate hash for change detection
 */
async function generateHash(data) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Handle cross-tab storage sync
 */
function handleStorageSync(event) {
  // Implement cross-tab synchronization if needed
  console.log('Storage sync event:', event.key);
}

/**
 * Add animation styles
 */
function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes emma-fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes emma-fade-out {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(10px); }
    }
    
    .emma-sync-indicator {
      transition: all 0.3s ease;
    }
    
    .emma-sync-syncing .emma-sync-icon {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .emma-sync-success { 
      background: linear-gradient(135deg, rgba(76, 175, 80, 0.95), rgba(56, 142, 60, 0.95)) !important; 
    }
    
    .emma-sync-error { 
      background: linear-gradient(135deg, rgba(244, 67, 54, 0.95), rgba(211, 47, 47, 0.95)) !important; 
    }
    
    .emma-sync-progress {
      width: 60px;
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      overflow: hidden;
    }
    
    .emma-sync-progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #8B5CF6, #EC4899);
      border-radius: 2px;
      transition: width 0.3s ease;
    }
    
    .emma-sync-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `;
  
  document.head.appendChild(style);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    initializeEmmaConnection();
  });
} else {
  injectStyles();
  initializeEmmaConnection();
}
