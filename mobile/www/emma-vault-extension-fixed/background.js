/**
 * Emma Vault Bridge - Background Service Worker
 * WEBAPP-FIRST: Enables secure communication between Emma Web App and extension
 * Built with love for Debbe
 */

console.log('🔗 Extension Background: WEBAPP-FIRST Service Worker starting');

// WEBAPP-FIRST: Simplified state tracking
const vaultConnections = new Map();
let webappTabId = null;

// File System Access API handle storage
let fileHandle = null;
let lastSyncTime = null;
// Hybrid vault state: encrypted persistence + in-memory cache
let currentVaultData = null;
let vaultPassphrase = null; // Temporarily store passphrase for auto-recovery

// Vault State Machine Helpers (single source of truth)
const VAULT_STATE_KEY = 'vaultState';

async function getVaultState() {
  const { vaultState, vaultFileName, resumeToken } = await chrome.storage.local.get([
    VAULT_STATE_KEY,
    'vaultFileName',
    'resumeToken',
  ]);
  return {
    state: vaultState || 'locked',
    fileName: vaultFileName || null,
    resumeToken: resumeToken || null,
  };
}

async function setVaultState(newState, extras = {}) {
  await chrome.storage.local.set({ [VAULT_STATE_KEY]: newState, ...extras });
}

async function clearEncryptedBackup() {
  try {
    const dbRequest = indexedDB.open('EmmaVaultPersistence', 1);
    await new Promise((resolve) => {
      dbRequest.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('encryptedVaults')) {
          db.createObjectStore('encryptedVaults');
        }
      };
      dbRequest.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['encryptedVaults'], 'readwrite');
        const store = transaction.objectStore('encryptedVaults');
        store.delete('current');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve();
      };
      dbRequest.onerror = () => resolve();
    });
  } catch (e) {
    // Non-fatal
    console.warn('⚠️ Failed to clear encrypted backup:', e);
  }
}

/**
 * Initialize extension on install
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Emma Vault Extension installed - Ready to preserve memories');
  
  // Set initial badge
  chrome.action.setBadgeBackgroundColor({ color: '#6F63D9' });
  chrome.action.setBadgeText({ text: '' });
  
  // Initialize storage
  chrome.storage.local.set({
    vaultPath: null,
    syncEnabled: false,
    lastSync: null,
    syncStats: {
      totalSyncs: 0,
      lastSyncSize: 0,
      errors: 0
    }
  });
  
  // Skip welcome page - users just click extension icon
  if (details.reason === 'install') {
    console.log('🎉 Emma Vault Extension installed - click the extension icon to get started!');
    // No welcome page needed - popup is the interface
  }
});

// CRITICAL: Auto-restore vault state when service worker starts
chrome.runtime.onStartup.addListener(async () => {
  console.log('🔄 EXTENSION: Service worker starting - checking for vault state to restore');

  try {
    const { state } = await getVaultState();
    if (state === 'unlocked') {
      // Try session-scoped passphrase for seamless resume
      const session = await chrome.storage.session.get(['vaultPassphrase']);
      const sessionPassphrase = session?.vaultPassphrase;
      if (sessionPassphrase) {
        const recovered = await recoverVaultFromBackup(sessionPassphrase);
        if (recovered) {
          currentVaultData = recovered;
          vaultPassphrase = sessionPassphrase;
          console.log('✅ EXTENSION: Vault auto-recovered on service worker startup');
          return;
        }
      }
      // CRITICAL FIX: Force unlock prompt when data is lost
      console.error('🚨 EXTENSION: Auto-recovery failed - vault data lost! Forcing re-unlock...');
      // Reset to locked state to force user to re-unlock and restore data
      await setVaultState('locked', { vaultReady: false, vaultFileName: null, resumeToken: null });
      console.log('🔒 EXTENSION: Vault state reset to locked - user must re-unlock to restore data');
    }
  } catch (error) {
    console.warn('⚠️ EXTENSION: Failed to auto-recover on startup:', error);
  }
});

/**
 * Handle messages from content script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🎯 BACKGROUND: *** MESSAGE RECEIVED ***', request.action);
  console.log('🎯 BACKGROUND: Full request:', request);
  console.log('🎯 BACKGROUND: Sender info:', sender);
  
  switch (request.action) {
    case 'SET_LLM_KEY':
      (async () => {
        try {
          // Only accept from trusted origins
          const ok = await isTrustedSender(sender);
          if (!ok) throw new Error('Untrusted sender');
          await storeEncryptedLLMKey(request.key);
          sendResponse({ success: true });
        } catch (e) {
          sendResponse({ success: false, error: e?.message || String(e) });
        }
      })();
      return true;

    case 'LLM_SCORE_REQUEST':
      (async () => {
        try {
          const ok = await isTrustedSender(sender);
          if (!ok) throw new Error('Untrusted sender');
          const { content, context } = request;
          const result = await scoreMemoryWorthinessWithLLM(content, context || '');
          sendResponse({ success: true, ...result });
        } catch (e) {
          console.warn('⚠️ LLM_SCORE_REQUEST failed, returning heuristic fallback:', e);
          sendResponse({ success: false, error: e?.message || String(e) });
        }
      })();
      return true;

    case 'CHECK_STATE':
      (async () => {
        const { state, fileName } = await getVaultState();
        sendResponse({
          success: true,
          state,
          fileName,
          hasData: !!currentVaultData,
          memoryCount: currentVaultData?.content?.memories ? Object.keys(currentVaultData.content.memories).length : 0,
          peopleCount: currentVaultData?.content?.people ? Object.keys(currentVaultData.content.people).length : 0,
        });
      })();
      return true;

    case 'LOCK':
      (async () => {
        try {
          currentVaultData = null;
          vaultPassphrase = null;
          await chrome.storage.session.remove('vaultPassphrase');
          await clearEncryptedBackup();
          await setVaultState('locked', { vaultReady: false, vaultFileName: null, resumeToken: null });
          sendResponse({ success: true });
        } catch (e) {
          sendResponse({ success: false, error: e?.message || String(e) });
        }
      })();
      return true;

    case 'DEBUG_DUMP_STATE':
      (async () => {
        const { state, fileName, resumeToken } = await getVaultState();
        const sess = await chrome.storage.session.get(['vaultPassphrase']);
        sendResponse({
          success: true,
          state,
          fileName,
          resumeTokenPresent: !!resumeToken,
          hasData: !!currentVaultData,
          passphraseInSession: !!sess?.vaultPassphrase,
        });
      })();
      return true;
    case 'VAULT_LOAD':
      console.log('🚨 BACKGROUND DEBUG: Received VAULT_LOAD message');
      console.log('🚨 BACKGROUND DEBUG: Request data keys:', Object.keys(request.data || {}));
      loadVaultData(request.data)
        .then(() => {
          console.log('🚨 BACKGROUND DEBUG: VAULT_LOAD successful, currentVaultData set');
          console.log('🚨 BACKGROUND DEBUG: Memory count now:', Object.keys(currentVaultData?.content?.memories || {}).length);
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('🚨 BACKGROUND DEBUG: VAULT_LOAD failed:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
      
    case 'VAULT_UPDATE':
      handleVaultUpdate(request.data, sender.tab.id)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response
      
    case 'CHECK_STATUS':
      checkExtensionStatus()
        .then(status => sendResponse(status))
        .catch(error => sendResponse({ connected: false, error: error.message }));
      return true;
      
    case 'ENABLE_SYNC':
      enableSync()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'DISABLE_SYNC':
      disableSync()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'DELETE_MEMORY':
      deleteMemory(request.memoryId)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'SET_FILE_HANDLE':
      setFileHandle(request.handle)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'SAVE_MEMORY_TO_VAULT':
      // WEBAPP-FIRST: Redirect to webapp instead of local vault
      console.log('🎯 BACKGROUND: Received SAVE_MEMORY_TO_VAULT request');
      sendToWebapp('EMMA_SAVE_MEMORY', request.data)
        .then(result => {
          console.log('🎯 BACKGROUND: sendToWebapp resolved with:', result);
          sendResponse(result);
        })
        .catch(error => {
          console.error('🎯 BACKGROUND: sendToWebapp failed:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
      
    case 'RELAY_SAVE_TO_WEBAPP':
      // UNIVERSAL SCRIPT RELAY: Handle save from any website via universal script
      console.log('🎯 BACKGROUND: Received RELAY_SAVE_TO_WEBAPP from:', request.fromPage);
      sendToWebapp('EMMA_SAVE_MEMORY', request.originalData)
        .then(result => {
          console.log('🎯 BACKGROUND: RELAY sendToWebapp resolved with:', result);
          sendResponse(result);
        })
        .catch(error => {
          console.error('🎯 BACKGROUND: RELAY sendToWebapp failed:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
      
    case 'UPDATE_MEMORY_IN_VAULT':
      handleUpdateMemoryInVault(request.data)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'SAVE_PERSON_TO_VAULT':
      handleSavePersonToVault(request.data)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'UPDATE_PERSON_IN_VAULT':
      handleUpdatePersonInVault(request.data)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'SAVE_MEDIA_TO_VAULT':
      handleSaveMediaToVault(request.data)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'DOWNLOAD_VAULT':
      downloadCurrentVault()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'DOWNLOAD_ENCRYPTED_VAULT':
      downloadEncryptedVault(request.passphrase, request.vaultName)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'CHECK_VAULT_STATUS':
      checkVaultStatus()
        .then(status => sendResponse(status))
        .catch(error => sendResponse({ vaultReady: false, error: error.message }));
      return true;
      
    case 'UNLOCK_VAULT':
      unlockVaultWithPassphrase(request.passphrase)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'STORE_PASSPHRASE':
      vaultPassphrase = request.passphrase;
      console.log('🔑 BACKGROUND: Passphrase stored for auto-recovery');
      sendResponse({ success: true });
      return true;
      
    case 'RECOVER_VAULT':
      recoverVaultFromBackup(request.passphrase)
        .then(vaultData => {
          if (vaultData) {
            currentVaultData = vaultData;
            vaultPassphrase = request.passphrase;
            sendResponse({ success: true, vaultData });
          } else {
            sendResponse({ success: false, error: 'No backup found or decryption failed' });
          }
        })
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'GET_PEOPLE_DATA':
      getPeopleData()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ people: [], error: error.message }));
      return true;
      
    case 'GET_MEMORIES_DATA':
      getMemoriesData()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ memories: [], error: error.message }));
      return true;
      
         case 'GET_VAULT_DATA_FOR_VECTORLESS':
       // Provide vault data for vectorless AI processing
       (async () => {
         try {
           if (!currentVaultData) {
             sendResponse({ success: false, error: 'No vault data available' });
             return;
           }
           
           console.log('🧠 VECTORLESS: Providing vault data for AI processing');
           
           // Return the full vault data for vectorless processing
           sendResponse({ 
             success: true, 
             vaultData: currentVaultData,
             memoryCount: currentVaultData?.content?.memories ? Object.keys(currentVaultData.content.memories).length : 0,
             peopleCount: currentVaultData?.content?.people ? Object.keys(currentVaultData.content.people).length : 0
           });
         } catch (error) {
           console.error('❌ Failed to get vault data for vectorless:', error);
           sendResponse({ success: false, error: error.message });
         }
       })();
       return true;
       
     case 'ENCRYPT_VAULT_DATA':
       // PHASE 2.3: Pure encryption service for Web App Primary
       (async () => {
         try {
           const result = await handleEncryptVaultData(request.vaultData, request.passphrase);
           sendResponse(result);
         } catch (error) {
           sendResponse({ success: false, error: error.message });
         }
       })();
       return true;
       
     case 'DECRYPT_VAULT_DATA':
       // PHASE 2.3: Pure decryption service for Web App Primary
       (async () => {
         try {
           const result = await handleDecryptVaultData(request.encryptedData, request.passphrase);
           sendResponse(result);
         } catch (error) {
           sendResponse({ success: false, error: error.message });
         }
       })();
       return true;
       
     case 'GENERATE_ENCRYPTION_SALT':
       // PHASE 2.3: Generate encryption salt for new vaults
       try {
         const result = handleGenerateEncryptionSalt();
         sendResponse(result);
       } catch (error) {
         sendResponse({ success: false, error: error.message });
       }
       return true;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

/**
 * Normalize incoming media data to base64-only string
 */
function toBase64Payload(data) {
  if (!data) return '';
  
  let base64Payload = '';
  
  // If already a data URL, strip the header and keep only base64 payload
  if (typeof data === 'string' && data.startsWith('data:')) {
    const commaIndex = data.indexOf(',');
    base64Payload = commaIndex !== -1 ? data.substring(commaIndex + 1) : data;
  } else {
    // Otherwise, assume it's already base64 payload
    base64Payload = data;
  }
  
  // SECURITY FIX: Validate base64 format for data integrity
  if (base64Payload && typeof base64Payload === 'string') {
    // Basic base64 format validation
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(base64Payload)) {
      console.warn('⚠️ BASE64 VALIDATION: Invalid base64 format detected, rejecting data');
      throw new Error('Invalid base64 format in attachment data');
    }
    
    // Check for reasonable size limits (prevent massive data)
    if (base64Payload.length > 50 * 1024 * 1024) { // 50MB limit
      console.warn('⚠️ BASE64 VALIDATION: Attachment too large, rejecting');
      throw new Error('Attachment size exceeds 50MB limit');
    }
    
    console.log(`✅ BASE64 VALIDATION: Valid base64 payload (${base64Payload.length} chars)`);
  }
  
  return base64Payload;
}

/**
 * Handle vault update from Emma Web App
 */
async function handleVaultUpdate(vaultData, tabId) {
  try {
    // Check if sync is enabled
    const { syncEnabled } = await chrome.storage.local.get('syncEnabled');
    if (!syncEnabled) {
      return { success: false, error: 'Sync not enabled' };
    }
    
    // Validate vault data
    if (!vaultData || !vaultData.id || !vaultData.content) {
      throw new Error('Invalid vault data');
    }
    
    // Update sync status badge
    await updateBadge('syncing');
    
    // Update in-memory state and write to file system
    currentVaultData = vaultData;
    const result = await writeToEmmaFile(currentVaultData);
    
    // Update statistics
    const size = JSON.stringify(currentVaultData?.content || {}).length;
    await updateSyncStats(size);
    
    // Update badge to show success
    await updateBadge('synced');
    
    // Notify user of successful sync (optional)
    if (result.bytesWritten > 1024 * 100) { // Only notify for significant updates > 100KB
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'Emma Vault Synced',
        message: `Successfully saved ${formatBytes(result.bytesWritten)} to your vault`
      });
    }
    
    return { success: true, bytesWritten: result.bytesWritten };
    
  } catch (error) {
    console.error('Vault update error:', error);
    await updateBadge('error');
    return { success: false, error: error.message };
  }
}

/**
 * Write data to .emma file using File System Access API
 */
async function writeToEmmaFile(vaultData) {
  if (!fileHandle) {
    // File handle expired or not set - user needs to re-enable sync
    throw new Error('File access expired - please click the extension icon and re-enable sync');
  }
  
  try {
    // Verify file handle is still valid
    const permission = await fileHandle.queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      // Try to request permission again
      const newPermission = await fileHandle.requestPermission({ mode: 'readwrite' });
      if (newPermission !== 'granted') {
        throw new Error('File access permission denied - please re-enable sync');
      }
    }
    
    // Create a writable stream
    const writable = await fileHandle.createWritable();
    
    // Prepare vault data for .emma format
    const emmaFileContent = prepareEmmaFileContent(vaultData || currentVaultData || {});
    
    // Write the data atomically
    await writable.write(emmaFileContent);
    await writable.close();
    
    lastSyncTime = new Date();
    
    return {
      success: true,
      bytesWritten: emmaFileContent.byteLength,
      timestamp: lastSyncTime,
      fileName: fileHandle.name
    };
    
  } catch (error) {
    console.error('File write error:', error);
    
    // Handle specific error cases
    if (error.name === 'NotAllowedError') {
      throw new Error('File access denied - please re-enable sync');
    } else if (error.name === 'InvalidStateError') {
      throw new Error('File is busy - please try again in a moment');
    } else if (error.name === 'NotFoundError') {
      throw new Error('File not found - it may have been moved or deleted');
    } else {
      throw new Error(`File write failed: ${error.message}`);
    }
  }
}

/**
 * Prepare vault data for .emma file format
 */
function prepareEmmaFileContent(vaultData) {
  // Structure according to .emma format specification
  const emmaFormat = {
    version: '1.0',
    vault: {
      id: vaultData.id,
      name: vaultData.name || 'My Memories',
      created: vaultData.created || new Date().toISOString(),
      lastModified: new Date().toISOString()
    },
    memories: vaultData.content.memories || [],
    people: vaultData.content.people || [],
    settings: vaultData.content.settings || {}
  };
  
  // Convert to JSON and then to Uint8Array
  const jsonString = JSON.stringify(emmaFormat, null, 2);
  return new TextEncoder().encode(jsonString);
}

/**
 * Enable sync by requesting file access
 */
async function enableSync() {
  try {
    // Note: File System Access API must be triggered by user gesture
    // This will be called from the popup or content script with user interaction
    
    // For now, store sync enabled state
    await chrome.storage.local.set({ syncEnabled: true });
    await updateBadge('ready');
    
    return { 
      success: true, 
      message: 'Sync enabled - Click extension icon to select vault file' 
    };
    
  } catch (error) {
    console.error('Enable sync error:', error);
    throw error;
  }
}

/**
 * Disable sync
 */
async function disableSync() {
  fileHandle = null;
  await chrome.storage.local.set({ 
    syncEnabled: false,
    fileHandleId: null 
  });
  await updateBadge('');
  
  // Clear any active connections
  vaultConnections.clear();
}

/**
 * Set file handle from popup
 */
async function setFileHandle(handle) {
  try {
    fileHandle = handle;
    console.log('File handle set:', handle.name);
    
    // Store basic info (can't store handle directly)
    await chrome.storage.local.set({
      fileHandleId: handle.name,
      fileSelected: true,
      lastFileSet: new Date().toISOString()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error setting file handle:', error);
    throw error;
  }
}

/**
 * Accept vault content from trusted UI (popup/content script) into memory + encrypted persistence
 */
async function loadVaultData(vaultData) {
  console.log('🚨 LOAD DEBUG: Validating vault data:', Object.keys(vaultData || {}));
  console.log('🚨 LOAD DEBUG: Has content?', !!vaultData?.content);
  console.log('🚨 LOAD DEBUG: Has name?', !!vaultData?.name);
  console.log('🚨 LOAD DEBUG: Content keys:', Object.keys(vaultData?.content || {}));
  
  // Fix validation - Emma vaults have 'name' and 'content', not necessarily 'id'
  if (!vaultData || !vaultData.content) {
    console.error('🚨 LOAD DEBUG: Invalid vault data - missing content');
    throw new Error('Invalid vault data - missing content structure');
  }
  
  if (!vaultData.content.memories && !vaultData.content.people && !vaultData.content.media) {
    console.error('🚨 LOAD DEBUG: Invalid vault data - content missing required sections');
    throw new Error('Invalid vault data - content missing memories/people/media sections');
  }
  
  console.log('🚨 LOAD DEBUG: Vault data validation passed, setting currentVaultData');
  currentVaultData = vaultData;
  
  // Mark state as unlocked and persist snapshot for resume
  await setVaultState('unlocked', {
    vaultReady: true, // temporary compatibility for older checks
    vaultFileName: vaultData.name || 'Unknown Vault',
    resumeToken: 'current',
  });
  console.log('🚨 LOAD DEBUG: State set to unlocked with resume token');
  
  // INNOVATION: Store encrypted backup in IndexedDB for auto-recovery
  if (vaultPassphrase) {
    try {
      await storeEncryptedVaultBackup(vaultData, vaultPassphrase);
      console.log('✅ PERSISTENCE: Encrypted vault backup stored for auto-recovery');
    } catch (error) {
      console.warn('⚠️ PERSISTENCE: Failed to store encrypted backup:', error);
    }
  }
  
  console.log('🚨 LOAD DEBUG: currentVaultData now has memory count:', Object.keys(currentVaultData?.content?.memories || {}).length);
}

/**
 * INNOVATION: Store encrypted vault backup in IndexedDB for auto-recovery
 */
async function storeEncryptedVaultBackup(vaultData, passphrase) {
  try {
    // Encrypt vault data with passphrase
    const jsonData = JSON.stringify(vaultData);
    const data = new TextEncoder().encode(jsonData);
    
    // Generate salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Derive key
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 250000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );
    
    // Store in IndexedDB
    const dbRequest = indexedDB.open('EmmaVaultPersistence', 1);
    
    return new Promise((resolve, reject) => {
      dbRequest.onerror = () => reject(dbRequest.error);
      
      dbRequest.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('encryptedVaults')) {
          db.createObjectStore('encryptedVaults');
        }
      };
      
      dbRequest.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['encryptedVaults'], 'readwrite');
        const store = transaction.objectStore('encryptedVaults');
        
        const backupData = {
          salt: Array.from(salt),
          iv: Array.from(iv),
          encrypted: Array.from(new Uint8Array(encrypted)),
          timestamp: Date.now(),
          vaultName: vaultData.name || 'Unknown'
        };
        
        store.put(backupData, 'current');
        
        transaction.oncomplete = () => {
          console.log('✅ PERSISTENCE: Encrypted vault backup stored');
          resolve();
        };
        
        transaction.onerror = () => reject(transaction.error);
      };
    });
    
  } catch (error) {
    console.error('❌ PERSISTENCE: Failed to store encrypted backup:', error);
    throw error;
  }
}

/**
 * Check extension status
 */
async function checkExtensionStatus() {
  const storage = await chrome.storage.local.get([
    'syncEnabled', 
    'lastSync',
    'syncStats'
  ]);
  
  return {
    connected: true,
    syncEnabled: storage.syncEnabled || false,
    lastSync: storage.lastSync,
    stats: storage.syncStats || {},
    version: chrome.runtime.getManifest().version
  };
}

/**
 * Update badge to show sync status
 */
async function updateBadge(status) {
  const badges = {
    'syncing': { text: '↻', color: '#2196F3' },
    'synced': { text: '✓', color: '#4CAF50' },
    'error': { text: '!', color: '#F44336' },
    'ready': { text: '●', color: '#4CAF50' },
    '': { text: '', color: '#757575' }
  };
  
  const badge = badges[status] || badges[''];
  
  await chrome.action.setBadgeText({ text: badge.text });
  await chrome.action.setBadgeBackgroundColor({ color: badge.color });
  
  // Auto-clear success badge after 3 seconds
  if (status === 'synced') {
    setTimeout(() => updateBadge('ready'), 3000);
  }
}

/**
 * Update sync statistics
 */
async function updateSyncStats(bytesWritten) {
  const { syncStats } = await chrome.storage.local.get('syncStats');
  const stats = syncStats || { totalSyncs: 0, lastSyncSize: 0, errors: 0 };
  
  stats.totalSyncs++;
  stats.lastSyncSize = bytesWritten;
  stats.lastSyncTime = new Date().toISOString();
  
  await chrome.storage.local.set({ 
    syncStats: stats,
    lastSync: stats.lastSyncTime
  });
}

/**
 * Format bytes for display
 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Handle extension icon click - open popup
 */
chrome.action.onClicked.addListener((tab) => {
  // The popup will handle file selection UI
  console.log('Extension icon clicked');
});

/**
 * WEBAPP-FIRST: Send memory data to webapp vault
 */
async function sendToWebapp(action, data) {
  return new Promise((resolve, reject) => {
    console.log('🌉 WEBAPP-FIRST: REAL webapp communication for:', action);
    console.log('🌉 WEBAPP-FIRST: Data size:', JSON.stringify(data).length, 'characters');
    
    // Find Emma webapp tab
    chrome.tabs.query({}, (tabs) => {
      const emmaTabs = tabs.filter(tab => 
        tab.url && (
          tab.url.includes('emma-lite-extension.onrender.com') ||
          tab.url.includes('emma-hjjc.onrender.com') ||
          tab.url.includes('localhost') ||
          tab.url.includes('127.0.0.1')
        )
      );
      
      if (emmaTabs.length === 0) {
        console.log('❌ WEBAPP-FIRST: No Emma webapp tabs found');
        resolve({ success: false, error: 'No Emma webapp found' });
        return;
      }
      
      const emmaTab = emmaTabs[0];
      console.log('📡 WEBAPP-FIRST: Sending to webapp tab:', emmaTab.url);
      
      // Send real message to webapp content script
      chrome.tabs.sendMessage(emmaTab.id, {
        action: 'SAVE_MEMORY_TO_WEBAPP_VAULT',
        memoryData: data
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('❌ WEBAPP-FIRST: Communication failed:', chrome.runtime.lastError);
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('✅ WEBAPP-FIRST: Real save response:', response);
          resolve(response || { success: false, error: 'No response' });
        }
      });
    });
  });
}

/**
 * DEPRECATED: Handle saving memory to vault file
 * NOW REDIRECTS TO WEBAPP-FIRST APPROACH
 */
async function handleSaveMemoryToVault(memoryData) {
  console.log('🔄 BACKGROUND: DEPRECATED function called - redirecting to webapp');
  return await sendToWebapp('EMMA_SAVE_MEMORY', memoryData);
}

/**
 * Handle saving person to vault file
 */
async function handleSavePersonToVault(personData) {
  try {
    console.log('👥 Background: Saving person directly to vault storage');
    
    const { state } = await getVaultState();
    if (state !== 'unlocked') {
      throw new Error('No vault is open. Please open a vault first in the extension popup.');
    }
    
    const currentData = currentVaultData ? { ...currentVaultData } : null;
    if (!currentData) throw new Error('Vault content unavailable in memory. Please reopen the vault.');
    
    // Generate person ID
    const personId = 'person_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Handle avatar like memory attachments - save as media
    let avatarId = null;
    if (personData.avatar && personData.avatar.startsWith('data:')) {
      console.log('📷 BACKGROUND: Saving person avatar as media (same as memory attachments)...');
      
      // Generate media ID for avatar
      const avatarMediaId = 'media_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      // Extract type and base64 data from data URL
      const [header, base64Data] = personData.avatar.split(',');
      const mimeMatch = header.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      
      const avatarMedia = {
        id: avatarMediaId,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        name: `${personData.name}-avatar`,
        type: mimeType,
        size: base64Data.length,
        data: toBase64Payload(personData.avatar) // Use same logic as memory attachments
      };
      
      // Add to vault media (same as memory attachments)
      if (!currentData.content.media) {
        currentData.content.media = {};
      }
      currentData.content.media[avatarMediaId] = avatarMedia;
      
      avatarId = avatarMediaId;
      console.log('📷 BACKGROUND: Avatar saved as media with ID:', avatarMediaId);
    }
    
    // Create person object (same structure as memories with attachments)
    const person = {
      id: personId,
      created: personData.created || new Date().toISOString(),
      updated: new Date().toISOString(),
      name: personData.name,
      relation: personData.relation || '',
      contact: personData.contact || '',
      avatarId: avatarId // Store media ID like memory attachments
    };
    
    // Add to vault
    if (!currentData.content.people) {
      currentData.content.people = {};
    }
    currentData.content.people[personId] = person;
    
    // Update stats
    if (!currentData.stats) {
      currentData.stats = { memoryCount: 0, peopleCount: 0, totalSize: 0 };
    }
    currentData.stats.peopleCount = Object.keys(currentData.content.people).length;
    currentData.stats.totalSize += JSON.stringify(person).length;
    
    // Save updated vault data back to storage
    currentVaultData = currentData;
    
    // CRITICAL FIX: Write to .emma file immediately after person save
    try {
      await writeToEmmaFile(currentData);
      console.log('✅ Person saved to vault storage AND .emma file successfully');
      console.log('👥 DEBUG: Updated vault data people count:', Object.keys(currentData.content.people).length);
      console.log('👥 DEBUG: People in storage:', Object.keys(currentData.content.people));
    } catch (fileError) {
      console.error('❌ Failed to write person to .emma file:', fileError);
      // Still return success for memory save, but log file save failure
    }
    
    return { success: true, id: personId };
    
  } catch (error) {
    console.error('❌ Failed to save person to vault:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete memory from vault
 */
async function deleteMemory(memoryId) {
  try {
    console.log('🗑️ BACKGROUND: Deleting memory:', memoryId);
    
    const { state } = await getVaultState();
    if (state !== 'unlocked') {
      throw new Error('No vault is open. Please open a vault first in the extension popup.');
    }
    
    // Get current vault data from memory
    const currentData = currentVaultData ? { ...currentVaultData } : null;
    if (!currentData) {
      throw new Error('Vault content unavailable in memory. Please reopen the vault.');
    }
    
    // Check if memory exists
    if (!currentData.content.memories || !currentData.content.memories[memoryId]) {
      return { success: false, error: 'Memory not found' };
    }
    
    // Delete the memory
    delete currentData.content.memories[memoryId];
    
    // Update stats
    if (currentData.stats && currentData.stats.memoryCount > 0) {
      currentData.stats.memoryCount--;
    }
    
    // Update in-memory vault data
    currentVaultData = currentData;
    
    // Write to .emma file if we have file handle
    if (fileHandle) {
      try {
        await writeToEmmaFile(currentData);
        console.log('🗑️ BACKGROUND: Memory deleted and vault file updated');
      } catch (writeError) {
        console.error('🗑️ BACKGROUND: Failed to write vault file after delete:', writeError);
        // Memory is deleted from memory but file write failed
        return { success: false, error: 'Memory deleted but failed to save vault file' };
      }
    }
    
    console.log('✅ BACKGROUND: Memory deleted successfully');
    return { success: true };
    
  } catch (error) {
    console.error('❌ BACKGROUND: Failed to delete memory:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle updating memory in vault file
 */
async function handleUpdateMemoryInVault(memoryData) {
  try {
    console.log('💾 Background: Updating memory in vault storage');
    
    const { state } = await getVaultState();
    if (state !== 'unlocked') {
      throw new Error('No vault is open. Please open a vault first in the extension popup.');
    }
    
    const currentData = currentVaultData ? { ...currentVaultData } : null;
    if (!currentData) throw new Error('Vault content unavailable in memory. Please reopen the vault.');
    
    // Find existing memory
    if (!currentData.content.memories) {
      throw new Error('No memories found in vault');
    }
    
    const existingMemory = currentData.content.memories[memoryData.id];
    if (!existingMemory) {
      throw new Error('Memory not found in vault');
    }
    
    // Update memory data (preserve existing data, update only provided fields)
    const updatedMemory = {
      ...existingMemory,
      metadata: {
        ...existingMemory.metadata,
        ...memoryData.metadata
      },
      updated: new Date().toISOString()
    };
    
    // Save updated memory back to vault
    currentData.content.memories[memoryData.id] = updatedMemory;
    
    // Save updated vault data back to storage
    currentVaultData = currentData;
    
    // CRITICAL FIX: Write to .emma file immediately after memory update
    try {
      await writeToEmmaFile(currentData);
      console.log('✅ Memory updated in vault storage AND .emma file successfully');
    } catch (fileError) {
      console.error('❌ Failed to write memory update to .emma file:', fileError);
      // Still return success for memory update, but log file save failure
    }
    
    return { success: true, id: memoryData.id };
    
  } catch (error) {
    console.error('❌ Failed to update memory in vault:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle updating person in vault file
 */
async function handleUpdatePersonInVault(personData) {
  try {
    console.log('👥 Background: Updating person in vault storage');
    
    const { state } = await getVaultState();
    if (state !== 'unlocked') {
      throw new Error('No vault is open. Please open a vault first in the extension popup.');
    }
    
    const currentData = currentVaultData ? { ...currentVaultData } : null;
    if (!currentData) throw new Error('Vault content unavailable in memory. Please reopen the vault.');
    
    // Find existing person
    if (!currentData.content.people) {
      throw new Error('No people found in vault');
    }
    
    const existingPerson = currentData.content.people[personData.id];
    if (!existingPerson) {
      throw new Error('Person not found in vault');
    }
    
    // Handle avatar update if provided
    let finalAvatarId = personData.avatarId || existingPerson.avatarId;
    
    // If new avatar data is provided, save it as media
    if (personData.avatar && personData.avatar.startsWith('data:')) {
      console.log('📷 BACKGROUND: New avatar data provided, saving as media...');
      
      // Generate new media ID for avatar
      const avatarMediaId = 'media_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      // Extract type and base64 data from data URL
      const [header, base64Data] = personData.avatar.split(',');
      const mimeMatch = header.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      
      const avatarMedia = {
        id: avatarMediaId,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        name: `${personData.name}-avatar`,
        type: mimeType,
        size: base64Data.length,
        data: base64Data // Store base64 payload only
      };
      
      // Add to vault media
      if (!currentData.content.media) {
        currentData.content.media = {};
      }
      currentData.content.media[avatarMediaId] = avatarMedia;
      
      // Update avatar ID to point to new media
      finalAvatarId = avatarMediaId;
      console.log('📷 BACKGROUND: Avatar saved as media with ID:', avatarMediaId);
    }

    // Update person data
    const updatedPerson = {
      ...existingPerson,
      name: personData.name,
      relation: personData.relation || '',
      contact: personData.contact || '',
      avatar: personData.avatar || existingPerson.avatar,
      avatarId: finalAvatarId,
      updated: new Date().toISOString()
    };
    
    // Save updated person back to vault
    currentData.content.people[personData.id] = updatedPerson;
    
    // Update stats
    if (!currentData.stats) {
      currentData.stats = { memoryCount: 0, peopleCount: 0, totalSize: 0 };
    }
    currentData.stats.peopleCount = Object.keys(currentData.content.people).length;
    
    // Save updated vault data back to storage
    currentVaultData = currentData;
    
    console.log('✅ Person updated in vault storage successfully');
    return { success: true, id: personData.id };
    
  } catch (error) {
    console.error('❌ Failed to update person in vault:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle saving media to vault file
 */
async function handleSaveMediaToVault(mediaData) {
  try {
    console.log('📷 Background: Saving media directly to vault storage');
    
    const { state } = await getVaultState();
    const { vaultData } = await chrome.storage.local.get(['vaultData']);
    if (state !== 'unlocked' || !vaultData) {
      throw new Error('No vault is open. Please open a vault first in the extension popup.');
    }
    
    const currentData = { ...vaultData };
    
    // Generate media ID
    const mediaId = 'media_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Create media object
    const media = {
      id: mediaId,
      created: mediaData.created || new Date().toISOString(),
      updated: new Date().toISOString(),
      name: mediaData.name,
      type: mediaData.type,
      size: mediaData.size || 0,
      // Always store base64 payload only (strip data URL prefix if present)
      data: toBase64Payload(mediaData.data)
    };
    
    // Add to vault
    if (!currentData.content.media) {
      currentData.content.media = {};
    }
    currentData.content.media[mediaId] = media;
    
    // Update stats
    if (!currentData.stats) {
      currentData.stats = { memoryCount: 0, peopleCount: 0, totalSize: 0 };
    }
    currentData.stats.totalSize += JSON.stringify(media).length;
    
    // Save updated vault data back to storage
    await chrome.storage.local.set({
      vaultData: currentData,
      lastSaved: new Date().toISOString()
    });
    
    console.log('✅ Media saved to vault storage successfully');
    return { success: true, id: mediaId };
    
  } catch (error) {
    console.error('❌ Failed to save media to vault:', error);
    return { success: false, error: error.message };
  }
}



/**
 * Check vault status
 */
async function checkVaultStatus() {
  try {
    const { state, fileName } = await getVaultState();
    
    // Auto-recovery when marked unlocked but data missing and passphrase available
    if (state === 'unlocked' && !currentVaultData && vaultPassphrase) {
      console.log('🔄 AUTO-RECOVERY: Attempting to restore vault from encrypted backup');
      try {
        const recovered = await recoverVaultFromBackup(vaultPassphrase);
        if (recovered) {
          currentVaultData = recovered;
          console.log('✅ AUTO-RECOVERY: Vault data restored successfully');
        }
      } catch (error) {
        console.warn('⚠️ AUTO-RECOVERY: Failed to restore vault:', error);
      }
    }
    
    const actuallyReady = state === 'unlocked' && currentVaultData && currentVaultData.content;
    
    return {
      vaultReady: actuallyReady,
      vaultFileName: fileName || null,
      memoryCount: currentVaultData?.content?.memories ? Object.keys(currentVaultData.content.memories).length : 0,
      peopleCount: currentVaultData?.content?.people ? Object.keys(currentVaultData.content.people).length : 0,
      dataLost: state === 'unlocked' && !currentVaultData // Flag indicating data was lost
    };
  } catch (error) {
    console.error('❌ Failed to check vault status:', error);
    return { vaultReady: false, error: error.message };
  }
}

/**
 * Unlock vault with passphrase - decrypt the vault content
 */
async function unlockVaultWithPassphrase(passphrase) {
  try {
    console.log('🔓 BACKGROUND: Attempting to unlock vault with passphrase');
    
    if (!fileHandle) {
      console.log('🔓 BACKGROUND: File handle lost - attempting recovery');
      // Try to get file handle from popup if available
      throw new Error('File handle lost due to service worker restart. Please click "Open Existing Vault" to reselect your vault file.');
    }
    
    // Read the encrypted vault file
    const file = await fileHandle.getFile();
    const data = new Uint8Array(await file.arrayBuffer());
    
    console.log('🔓 BACKGROUND: Read vault file, size:', data.length);
    
    // Try to decrypt the vault data
    let vaultData;
    
    if (data[0] === 0x7B) {
      // JSON vault - try to parse directly
      const content = new TextDecoder().decode(data);
      vaultData = JSON.parse(content);
      console.log('🔓 BACKGROUND: Loaded unencrypted JSON vault');
    } else {
      // Encrypted vault - decrypt with passphrase
      console.log('🔓 BACKGROUND: Decrypting vault with passphrase...');
      
      const decryptedData = await decryptVaultData(data, passphrase);
      const jsonString = new TextDecoder().decode(decryptedData);
      vaultData = JSON.parse(jsonString);
      
      console.log('🔓 BACKGROUND: Successfully decrypted vault');
    }
    
    // Validate vault structure
    if (!vaultData.content) {
      throw new Error('Invalid vault structure - missing content');
    }
    
    // Store decrypted data in memory
    currentVaultData = vaultData;
    
    // INNOVATION: Store passphrase for auto-recovery (in memory only)
    vaultPassphrase = passphrase;
    // Persist passphrase for the browser session only (not disk)
    try {
      await chrome.storage.session.set({ vaultPassphrase: passphrase });
    } catch (e) {
      console.warn('⚠️ Unable to persist passphrase in session storage:', e);
    }
    
    // Store encrypted backup for persistence
    try {
      await storeEncryptedVaultBackup(vaultData, passphrase);
      console.log('✅ PERSISTENCE: Encrypted backup stored for auto-recovery');
    } catch (error) {
      console.warn('⚠️ PERSISTENCE: Failed to store backup:', error);
    }
    
    console.log('🔓 BACKGROUND: Vault unlocked successfully:', {
      memoryCount: Object.keys(vaultData.content.memories || {}).length,
      peopleCount: Object.keys(vaultData.content.people || {}).length
    });
    
    await setVaultState('unlocked', {
      vaultReady: true,
      vaultFileName: vaultData.name || 'Unknown Vault',
      resumeToken: 'current',
    });

    return {
      success: true,
      vaultData: vaultData
    };
    
  } catch (error) {
    console.error('🔓 BACKGROUND: Unlock failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Decrypt vault data using Web Crypto API
 */
async function decryptVaultData(encryptedData, passphrase) {
  try {
    console.log('🔓 BACKGROUND: Starting vault decryption...');
    
    // Parse .emma file format: EMMA + version + salt + iv + encrypted data
    const data = new Uint8Array(encryptedData);
    
    // Check magic bytes
    const magic = new TextDecoder().decode(data.slice(0, 4));
    if (magic !== 'EMMA') {
      throw new Error('Invalid .emma file format');
    }
    
    // Extract components
    const version = data.slice(4, 6);
    const salt = data.slice(6, 38); // 32 bytes
    const iv = data.slice(38, 50); // 12 bytes
    const encrypted = data.slice(50);
    
    console.log('🔓 BACKGROUND: Extracted vault components:', {
      magic,
      version: Array.from(version),
      saltLength: salt.length,
      ivLength: iv.length,
      encryptedLength: encrypted.length
    });
    
    // Derive key from passphrase using PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 250000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encrypted
    );
    
    console.log('🔓 BACKGROUND: Vault decrypted successfully');
    return decrypted;
    
  } catch (error) {
    console.error('🔓 BACKGROUND: Decryption failed:', error);
    throw new Error('Failed to decrypt vault: ' + error.message);
  }
}

/**
 * INNOVATION: Recover vault from encrypted IndexedDB backup
 */
async function recoverVaultFromBackup(passphrase) {
  try {
    console.log('🔄 RECOVERY: Attempting to recover vault from encrypted backup');
    
    const dbRequest = indexedDB.open('EmmaVaultPersistence', 1);
    
    return new Promise((resolve, reject) => {
      dbRequest.onerror = () => reject(dbRequest.error);
      
      dbRequest.onsuccess = async (event) => {
        try {
          const db = event.target.result;
          const transaction = db.transaction(['encryptedVaults'], 'readonly');
          const store = transaction.objectStore('encryptedVaults');
          const request = store.get('current');
          
          request.onsuccess = async () => {
            try {
              const backupData = request.result;
              if (!backupData) {
                console.log('🔄 RECOVERY: No encrypted backup found');
                resolve(null);
                return;
              }
              
              console.log('🔄 RECOVERY: Found encrypted backup, attempting decrypt');
              
              // Restore arrays
              const salt = new Uint8Array(backupData.salt);
              const iv = new Uint8Array(backupData.iv);
              const encrypted = new Uint8Array(backupData.encrypted);
              
              // Derive key
              const keyMaterial = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(passphrase),
                'PBKDF2',
                false,
                ['deriveKey']
              );
              
              const key = await crypto.subtle.deriveKey(
                {
                  name: 'PBKDF2',
                  salt: salt,
                  iterations: 250000,
                  hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['decrypt']
              );
              
              // Decrypt
              const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encrypted
              );
              
              const jsonString = new TextDecoder().decode(decrypted);
              const vaultData = JSON.parse(jsonString);
              
              console.log('✅ RECOVERY: Vault data recovered from encrypted backup');
              resolve(vaultData);
              
            } catch (decryptError) {
              console.error('❌ RECOVERY: Failed to decrypt backup:', decryptError);
              resolve(null);
            }
          };
          
          request.onerror = () => {
            console.error('❌ RECOVERY: Failed to read backup');
            resolve(null);
          };
          
        } catch (error) {
          console.error('❌ RECOVERY: Database operation failed:', error);
          resolve(null);
        }
      };
    });
    
  } catch (error) {
    console.error('❌ RECOVERY: Recovery attempt failed:', error);
    return null;
  }
}

/**
 * Get people data from storage
 */
async function getPeopleData() {
  try {
    console.log('👥 DEBUG: Getting people data from memory...');
    console.log('👥 DEBUG: currentVaultData exists?', !!currentVaultData);
    console.log('👥 DEBUG: People object:', currentVaultData?.content?.people);
    
    const people = currentVaultData?.content?.people || {};
    const media = currentVaultData?.content?.media || {};
    
    // Reconstruct people with avatar URLs
    const peopleWithAvatars = Object.values(people).map(person => {
      let avatarUrl = person.avatarUrl;
      
      // If person has avatarId but no avatarUrl, reconstruct from media
      if (!avatarUrl && person.avatarId && media[person.avatarId]) {
        const mediaItem = media[person.avatarId];
        if (mediaItem && mediaItem.data) {
          // If stored data is already a data URL, use as-is; otherwise construct one
          avatarUrl = mediaItem.data.startsWith('data:')
            ? mediaItem.data
            : `data:${mediaItem.type};base64,${mediaItem.data}`;
          console.log(`👥 AVATAR: Reconstructed avatar URL for ${person.name}`);
        }
      }
      
      return {
        ...person,
        avatarUrl
      };
    });
    
    console.log('👥 DEBUG: People array with avatars:', peopleWithAvatars.length);
    return { people: peopleWithAvatars };
  } catch (error) {
    console.error('❌ Failed to get people data:', error);
    return { people: [], error: error.message };
  }
}

/**
 * Get memories data from storage
 */
async function getMemoriesData() {
  try {
    console.log('📝 DEBUG: Getting memories data from memory...');
    console.log('📝 DEBUG: currentVaultData exists?', !!currentVaultData);
    console.log('📝 DEBUG: Memories object:', currentVaultData?.content?.memories);
    
    // CRITICAL FIX: Detect data loss scenario
    const { state } = await getVaultState();
    if (state === 'unlocked' && !currentVaultData) {
      console.error('🚨 DATA LOSS DETECTED: Vault marked unlocked but currentVaultData is null!');
      console.error('🚨 This indicates service worker restart with failed recovery');
      // Force re-lock to trigger proper unlock flow
      await setVaultState('locked', { vaultReady: false, vaultFileName: null, resumeToken: null });
      throw new Error('Vault data lost due to service worker restart. Please unlock again.');
    }
    
    const memories = currentVaultData?.content?.memories || {};
    const media = currentVaultData?.content?.media || {};
    
    // CRITICAL FIX: Apply memory overrides from chrome.storage.local
    let memoryOverrides = {};
    try {
      const overrideStorage = await chrome.storage.local.get(['emma_memory_overrides']);
      memoryOverrides = overrideStorage.emma_memory_overrides || {};
      console.log('📝 DEBUG: Found memory overrides:', Object.keys(memoryOverrides).length);
    } catch (error) {
      console.warn('⚠️ Failed to load memory overrides:', error);
    }
    
    // Reconstruct memories with media URLs AND apply overrides
    const memoriesWithMedia = Object.values(memories).map(memory => {
      // Process attachments to include data URLs
      const attachments = (memory.attachments || []).map(attachment => {
        const mediaItem = media[attachment.id];
        if (mediaItem && mediaItem.data) {
          // Create data URL from stored base64 data
          return {
            ...attachment,
            url: mediaItem.data.startsWith('data:')
              ? mediaItem.data
              : `data:${mediaItem.type};base64,${mediaItem.data}`,
            dataUrl: mediaItem.data.startsWith('data:')
              ? mediaItem.data
              : `data:${mediaItem.type};base64,${mediaItem.data}`,
            isPersisted: true,
            vaultId: attachment.id
          };
        }
        return attachment;
      });
      
      // Apply overrides if they exist for this memory
      const override = memoryOverrides[memory.id];
      const finalMemory = {
        ...memory,
        attachments
      };
      
      if (override) {
        console.log(`📝 DEBUG: Applying overrides to memory ${memory.id}:`, override);
        // Apply title override
        if (override.title) {
          finalMemory.metadata = finalMemory.metadata || {};
          finalMemory.metadata.title = override.title;
          finalMemory.title = override.title; // Also set top-level title
        }
        // Apply content override
        if (override.content) {
          finalMemory.content = override.content;
        }
      }
      
      return finalMemory;
    });
    
    console.log(`📝 Returning ${memoriesWithMedia.length} memories with reconstructed media URLs`);
    return { memories: memoriesWithMedia };
  } catch (error) {
    console.error('❌ Failed to get memories data:', error);
    return { memories: [], error: error.message };
  }
}

/**
 * Download current vault as .emma file
 */
async function downloadCurrentVault() {
  try {
    console.log('📥 Downloading current vault...');
    
    // Get current vault data from storage
    const { vaultData, vaultFileName } = await chrome.storage.local.get(['vaultData', 'vaultFileName']);
    if (!vaultData) {
      throw new Error('No vault data available to download');
    }
    
    // Create download
    const vaultJson = JSON.stringify(vaultData, null, 2);
    const blob = new Blob([vaultJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Trigger download
    await chrome.downloads.download({
      url: url,
      filename: vaultFileName || 'my-memories.emma',
      saveAs: true
    });
    
    console.log('✅ Vault download initiated');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Failed to download vault:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Download current vault as encrypted .emma file
 */
async function downloadEncryptedVault(passphrase, vaultName) {
  try {
    console.log('📥 Downloading encrypted vault...');
    
    // Get current vault data from memory
    if (!currentVaultData) {
      throw new Error('No vault data available in memory. Please reopen the vault.');
    }
    
    if (!passphrase) {
      throw new Error('Passphrase required for encryption');
    }
    
    console.log('🔐 Encrypting vault data with passphrase...');
    
    // Convert vault data to JSON
    const jsonData = JSON.stringify(currentVaultData);
    const encoder = new TextEncoder();
    const data = encoder.encode(jsonData);
    
    // Generate salt for encryption
    const salt = crypto.getRandomValues(new Uint8Array(32));
    
    // Derive key from passphrase using PBKDF2 with 250k iterations
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 250000, // Consistent with our security standards
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // Generate IV for AES-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );
    
    // Create .emma file format: EMMA + version + salt + iv + encrypted data
    const header = encoder.encode('EMMA'); // Magic bytes (4 bytes)
    const version = new Uint8Array([1, 0]); // Version 1.0 (2 bytes)
    
    // Combine all parts
    const totalSize = header.length + version.length + salt.length + iv.length + encryptedData.byteLength;
    const result = new Uint8Array(totalSize);
    let offset = 0;
    
    result.set(header, offset);
    offset += header.length;
    result.set(version, offset);
    offset += version.length;
    result.set(salt, offset);
    offset += salt.length;
    result.set(iv, offset);
    offset += iv.length;
    result.set(new Uint8Array(encryptedData), offset);
    
    // Create blob and download using data URL (compatible with service workers)
    const blob = new Blob([result], { type: 'application/octet-stream' });
    
    // Convert blob to data URL for service worker compatibility
    const reader = new FileReader();
    const dataUrl = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    
    // Trigger download using data URL
    await chrome.downloads.download({
      url: dataUrl,
      filename: `${vaultName}-backup.emma`,
      saveAs: true
    });
    
    console.log('✅ Encrypted vault download initiated');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Failed to download encrypted vault:', error);
    return { success: false, error: error.message };
  }
}

/**
 * PHASE 2.3: Pure Crypto Service Functions for Web App Primary Architecture
 */

/**
 * ENCRYPT_VAULT_DATA: Pure encryption service (no data storage)
 */
async function handleEncryptVaultData(vaultData, passphrase) {
  try {
    console.log('🔒 CRYPTO SERVICE: Encrypting vault data...');
    
    // Generate salt for encryption
    const salt = crypto.getRandomValues(new Uint8Array(32));
    
    // Convert vault data to JSON string
    const jsonString = JSON.stringify(vaultData);
    const dataToEncrypt = new TextEncoder().encode(jsonString);
    
    // Derive encryption key
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 250000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // Generate IV for encryption
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the data
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      dataToEncrypt
    );
    
    // Create .emma file format
    const magicBytes = new TextEncoder().encode('EMMA');
    const saltBytes = salt;
    const ivBytes = iv;
    const encryptedBytes = new Uint8Array(encrypted);
    
    // Combine all parts
    const totalLength = 4 + 32 + 12 + encryptedBytes.length;
    const fileData = new Uint8Array(totalLength);
    
    let offset = 0;
    fileData.set(magicBytes, offset); offset += 4;
    fileData.set(saltBytes, offset); offset += 32;
    fileData.set(ivBytes, offset); offset += 12;
    fileData.set(encryptedBytes, offset);
    
    console.log('✅ CRYPTO SERVICE: Vault encrypted successfully, size:', fileData.length);
    
    return {
      success: true,
      encryptedData: Array.from(fileData), // Convert for message passing
      salt: Array.from(salt),
      iv: Array.from(iv)
    };
    
  } catch (error) {
    console.error('❌ CRYPTO SERVICE: Encryption failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * DECRYPT_VAULT_DATA: Pure decryption service (no data storage)
 */
async function handleDecryptVaultData(encryptedData, passphrase) {
  try {
    console.log('🔓 CRYPTO SERVICE: Decrypting vault data...');
    
    // Convert array back to Uint8Array
    const fileData = new Uint8Array(encryptedData);
    
    // Verify .emma file format
    const magicBytes = fileData.slice(0, 4);
    const magicString = new TextDecoder().decode(magicBytes);
    
    if (magicString !== 'EMMA') {
      throw new Error('Invalid .emma file format');
    }
    
    // Extract components
    const salt = fileData.slice(4, 36);
    const iv = fileData.slice(36, 48);
    const encrypted = fileData.slice(48);
    
    console.log('🔓 CRYPTO SERVICE: File format verified, extracting data...');
    
    // Derive decryption key
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 250000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encrypted
    );
    
    // Parse JSON
    const jsonString = new TextDecoder().decode(decrypted);
    const vaultData = JSON.parse(jsonString);
    
    console.log('✅ CRYPTO SERVICE: Vault decrypted successfully, memories:', 
      Object.keys(vaultData.content?.memories || {}).length);
    
    return {
      success: true,
      vaultData: vaultData
    };
    
  } catch (error) {
    console.error('❌ CRYPTO SERVICE: Decryption failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * GENERATE_ENCRYPTION_SALT: Generate new salt for vault creation
 */
function handleGenerateEncryptionSalt() {
  try {
    const salt = crypto.getRandomValues(new Uint8Array(32));
    console.log('🧂 CRYPTO SERVICE: Generated new encryption salt');
    
    return {
      success: true,
      salt: Array.from(salt)
    };
  } catch (error) {
    console.error('❌ CRYPTO SERVICE: Failed to generate salt:', error);
    return { success: false, error: error.message };
  }
}

console.log('Emma Vault Bridge background service initialized');
console.log('🔐 CRYPTO SERVICE: Pure crypto functions ready for Web App Primary architecture');

/**
 * SECURITY: Trusted sender check (restrict to our web origins)
 */
async function isTrustedSender(sender) {
  try {
    const url = new URL(sender?.url || sender?.origin || '');
    const trusted = [
      'emma-hjjc.onrender.com',
      'localhost',
      '127.0.0.1'
    ];
    return trusted.includes(url.hostname);
  } catch {
    return false;
  }
}

/**
 * SECURITY: Store LLM key encrypted in chrome.storage.local
 */
async function storeEncryptedLLMKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') throw new Error('Invalid key');
  // Derive a storage key using a random salt kept in storage
  const { llm_salt } = await chrome.storage.local.get(['llm_salt']);
  const salt = llm_salt ? new Uint8Array(llm_salt) : crypto.getRandomValues(new Uint8Array(32));
  if (!llm_salt) await chrome.storage.local.set({ llm_salt: Array.from(salt) });

  const enc = new TextEncoder();
  const material = await crypto.subtle.importKey('raw', enc.encode('emma-extension-key'), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(apiKey));
  await chrome.storage.local.set({ llm_key: Array.from(new Uint8Array(cipher)), llm_iv: Array.from(iv) });
}

async function loadDecryptedLLMKey() {
  const { llm_key, llm_iv, llm_salt } = await chrome.storage.local.get(['llm_key', 'llm_iv', 'llm_salt']);
  if (!llm_key || !llm_iv || !llm_salt) throw new Error('No LLM key stored');
  const enc = new TextEncoder();
  const material = await crypto.subtle.importKey('raw', enc.encode('emma-extension-key'), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: new Uint8Array(llm_salt), iterations: 200000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(llm_iv) }, key, new Uint8Array(llm_key));
  return new TextDecoder().decode(plain);
}

/**
 * LLM scoring call (uses fetch to OpenAI with stored key). Returns normalized score and rationale only.
 */
async function scoreMemoryWorthinessWithLLM(content, context) {
  // Disable network LLM in production; provide stable local default
  try {
    const env = (typeof self !== 'undefined' && self.location && (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1')) ? 'development' : 'production';
    const llmEnabled = (await chrome.storage.local.get('llm_enabled'))?.llm_enabled === true;
    if (env !== 'development' || !llmEnabled) {
      return { score0to10: 5, rationale: 'local default (offline)' };
    }
  } catch(e) {
    // On error, return safe default
    return { score0to10: 5, rationale: 'local default (offline)' };
  }

  const apiKey = await loadDecryptedLLMKey();
  // Safety: trim content size
  const maxLen = 800;
  const input = (content || '').slice(0, maxLen);
  const ctx = (context || '').slice(0, 1000);

  const prompt = `Rate from 0 to 10 how memory-worthy this user message is for a personal memory journal. Use reasoning but reply as JSON {"score":number,"rationale":string}. Consider: first-person experience, past-tense/eventness, emotional salience, people involved, specificity, review value. Message: "${input}". Context(last messages): "${ctx}"`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 120
    })
  });

  if (!res.ok) throw new Error('LLM request failed');
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';
  let json;
  try { json = JSON.parse(text); } catch { json = { score: 5, rationale: 'default' }; }
  const score0to10 = typeof json.score === 'number' ? json.score : 5;
  return { score0to10, rationale: json.rationale || 'n/a' };
}
