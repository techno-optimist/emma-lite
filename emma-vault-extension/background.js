/**
 * Emma Vault Bridge - Background Service Worker
 * Enables real-time synchronization between Emma Web App and local .emma files
 * Built with love for Debbe
 */

// Track active vault connections
const vaultConnections = new Map();

// File System Access API handle storage
let fileHandle = null;
let lastSyncTime = null;

/**
 * Initialize extension on install
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Emma Vault Extension installed - Ready to preserve memories');
  
  // Set initial badge
  chrome.action.setBadgeBackgroundColor({ color: '#8B5CF6' });
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

/**
 * Handle messages from content script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request.action);
  
  switch (request.action) {
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
      
    case 'SET_FILE_HANDLE':
      setFileHandle(request.handle)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'SAVE_MEMORY_TO_VAULT':
      handleSaveMemoryToVault(request.data)
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
      
    case 'CHECK_VAULT_STATUS':
      checkVaultStatus()
        .then(status => sendResponse(status))
        .catch(error => sendResponse({ vaultReady: false, error: error.message }));
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
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

/**
 * Normalize incoming media data to base64-only string
 */
function toBase64Payload(data) {
  if (!data) return '';
  // If already a data URL, strip the header and keep only base64 payload
  if (typeof data === 'string' && data.startsWith('data:')) {
    const commaIndex = data.indexOf(',');
    return commaIndex !== -1 ? data.substring(commaIndex + 1) : data;
  }
  // Otherwise, assume it's already base64 payload
  return data;
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
    
    // Write to file system
    const result = await writeToEmmaFile(vaultData);
    
    // Update statistics
    await updateSyncStats(vaultData.content.length);
    
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
    const emmaFileContent = prepareEmmaFileContent(vaultData);
    
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
 * Handle saving memory to vault file
 */
async function handleSaveMemoryToVault(memoryData) {
  try {
    console.log('💾 Background: Saving memory directly to vault storage');
    
    // Get current vault data from storage
    const { vaultData, vaultReady } = await chrome.storage.local.get(['vaultData', 'vaultReady']);
    if (!vaultReady || !vaultData) {
      throw new Error('No vault is open. Please open a vault first in the extension popup.');
    }
    
    const currentData = { ...vaultData };
    
    // Generate memory ID
    const memoryId = 'memory_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Process attachments and save media files
    const processedAttachments = [];
    for (const attachment of memoryData.attachments || []) {
      // Save each attachment as media
      const mediaId = 'media_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      const media = {
        id: mediaId,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        name: attachment.name,
        type: attachment.type,
        size: attachment.size || 0,
        // Always store base64 payload only (strip data URL prefix if present)
        data: toBase64Payload(attachment.data)
      };
      
      // Add to vault media
      if (!currentData.content.media) {
        currentData.content.media = {};
      }
      currentData.content.media[mediaId] = media;
      
      // Create attachment reference for memory
      processedAttachments.push({
        id: mediaId,
        type: attachment.type,
        name: attachment.name,
        size: attachment.size || 0
      });
    }
    
    // Create memory object
    const memory = {
      id: memoryId,
      created: memoryData.created || new Date().toISOString(),
      updated: new Date().toISOString(),
      content: memoryData.content,
      metadata: memoryData.metadata || {},
      attachments: processedAttachments
    };
    
    // Add to vault
    if (!currentData.content.memories) {
      currentData.content.memories = {};
    }
    currentData.content.memories[memoryId] = memory;
    
    // Update stats
    if (!currentData.stats) {
      currentData.stats = { memoryCount: 0, peopleCount: 0, totalSize: 0 };
    }
    currentData.stats.memoryCount = Object.keys(currentData.content.memories).length;
    currentData.stats.totalSize += JSON.stringify(memory).length;
    
    // Save updated vault data back to storage
    await chrome.storage.local.set({
      vaultData: currentData,
      lastSaved: new Date().toISOString()
    });
    
    console.log('✅ Memory saved to vault storage successfully');
    return { success: true, id: memoryId };
    
  } catch (error) {
    console.error('❌ Failed to save memory to vault:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle saving person to vault file
 */
async function handleSavePersonToVault(personData) {
  try {
    console.log('👥 Background: Saving person directly to vault storage');
    
    // Get current vault data from storage
    const { vaultData, vaultReady } = await chrome.storage.local.get(['vaultData', 'vaultReady']);
    if (!vaultReady || !vaultData) {
      throw new Error('No vault is open. Please open a vault first in the extension popup.');
    }
    
    const currentData = { ...vaultData };
    
    // Generate person ID
    const personId = 'person_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Create person object
    const person = {
      id: personId,
      created: personData.created || new Date().toISOString(),
      updated: new Date().toISOString(),
      name: personData.name,
      relation: personData.relation || '',
      contact: personData.contact || '',
      avatar: personData.avatar || null
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
    await chrome.storage.local.set({
      vaultData: currentData,
      lastSaved: new Date().toISOString()
    });
    
    console.log('✅ Person saved to vault storage successfully');
    console.log('👥 DEBUG: Updated vault data people count:', Object.keys(currentData.content.people).length);
    console.log('👥 DEBUG: People in storage:', Object.keys(currentData.content.people));
    
    return { success: true, id: personId };
    
  } catch (error) {
    console.error('❌ Failed to save person to vault:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle updating person in vault file
 */
async function handleUpdatePersonInVault(personData) {
  try {
    console.log('👥 Background: Updating person in vault storage');
    
    // Get current vault data from storage
    const { vaultData, vaultReady } = await chrome.storage.local.get(['vaultData', 'vaultReady']);
    if (!vaultReady || !vaultData) {
      throw new Error('No vault is open. Please open a vault first in the extension popup.');
    }
    
    const currentData = { ...vaultData };
    
    // Find existing person
    if (!currentData.content.people) {
      throw new Error('No people found in vault');
    }
    
    const existingPerson = currentData.content.people[personData.id];
    if (!existingPerson) {
      throw new Error('Person not found in vault');
    }
    
    // Update person data
    const updatedPerson = {
      ...existingPerson,
      name: personData.name,
      relation: personData.relation || '',
      contact: personData.contact || '',
      avatar: personData.avatar || existingPerson.avatar,
      avatarId: personData.avatarId || existingPerson.avatarId,
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
    await chrome.storage.local.set({
      vaultData: currentData,
      lastSaved: new Date().toISOString()
    });
    
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
    
    // Get current vault data from storage
    const { vaultData, vaultReady } = await chrome.storage.local.get(['vaultData', 'vaultReady']);
    if (!vaultReady || !vaultData) {
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
    const { vaultReady, vaultFileName, vaultData } = await chrome.storage.local.get(['vaultReady', 'vaultFileName', 'vaultData']);
    
    return {
      vaultReady: vaultReady || false,
      vaultFileName: vaultFileName || null,
      memoryCount: vaultData?.content?.memories ? Object.keys(vaultData.content.memories).length : 0,
      peopleCount: vaultData?.content?.people ? Object.keys(vaultData.content.people).length : 0
    };
  } catch (error) {
    console.error('❌ Failed to check vault status:', error);
    return { vaultReady: false, error: error.message };
  }
}

/**
 * Get people data from storage
 */
async function getPeopleData() {
  try {
    console.log('👥 DEBUG: Getting people data from storage...');
    const { vaultData } = await chrome.storage.local.get(['vaultData']);
    console.log('👥 DEBUG: Retrieved vault data:', vaultData);
    console.log('👥 DEBUG: People object:', vaultData?.content?.people);
    
    const people = vaultData?.content?.people || {};
    const media = vaultData?.content?.media || {};
    
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
    const { vaultData } = await chrome.storage.local.get(['vaultData']);
    const memories = vaultData?.content?.memories || {};
    const media = vaultData?.content?.media || {};
    
    // Reconstruct memories with media URLs
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
      
      return {
        ...memory,
        attachments
      };
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

console.log('Emma Vault Bridge background service initialized');
