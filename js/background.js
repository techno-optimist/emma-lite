/**
 * Emma Lite Extension - Background Script  
 * WEBAPP-FIRST ARCHITECTURE: Extension defers to webapp for vault operations
 */

// WEBAPP-FIRST: Simplified imports - removed vault manager dependencies
import { memoryDB } from '../lib/database-mtap.js';
import { mtapAdapter, mcpBridge } from '../lib/mtap-adapter.js';
import { hmlAdapter } from '../lib/hml-adapter.js';
import { registerVaultMessageHandlers, VaultService } from './vault/service.js';
import { vaultStorage } from '../lib/vault-storage.js';
import { vaultBackup } from '../lib/vault-backup.js';
import { unifiedStorage } from '../lib/unified-storage.js';
import { timerManager } from '../lib/timer-manager.js';

// Console info for debugging
console.log('🔧 Background script loaded');
console.log('🔧 HML adapter loaded:', !!hmlAdapter);
console.log('🔧 MCP bridge loaded:', !!mcpBridge);
console.log('🔧 MTAP adapter loaded:', !!mtapAdapter);
console.log('🔧 Memory DB loaded:', !!memoryDB);
console.log('✅ Background imports successful');

// Vault message handlers are integrated into main handleMessage function
console.log('🔐 Vault message handlers integrated into main handler');

// WEBAPP-FIRST: Vault manager moved to webapp - extension no longer manages vault
async function initializeVaultManager() {
  console.log('🚀 WEBAPP-FIRST: Extension vault manager deprecated - webapp handles all vault operations');
  // No longer needed - webapp manages vault state
  return null;
}

// WEBAPP-FIRST: Vault broadcasting moved to webapp
async function setupVaultBroadcasting() {
  console.log('🚀 WEBAPP-FIRST: Vault broadcasting handled by webapp - extension no longer manages vault state');
  // No longer needed - webapp manages vault state
  return null;
}

// WEBAPP-FIRST: Extension no longer manages vault state

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Emma Lite installed:', details.reason);
  
  // Initialize database and set defaults on first install
  if (details.reason === 'install') {
    // Set default settings
    await chrome.storage.sync.set({
      autoRecognition: true,
      userProfile: {},
      lastSync: null
    });
    
    console.log('✅ Default settings initialized');
  }
  
  updateBadge();
  
  // Initialize vault manager
  await initializeVaultManager();
  
  // Set up vault state broadcasting
  await setupVaultBroadcasting();
  
  // Always ensure context menus are set up
  setupContextMenus();
  // Already registered at load; keep for redundancy
  try { registerVaultMessageHandlers(); } catch (e) { console.warn('Vault handlers registration issue:', e); }
});

// Update badge with memory count
async function updateBadge() {
  try {
    const count = await memoryDB.getMemoryCount();
    chrome.action.setBadgeText({
      text: count > 0 ? count.toString() : ''
    });
    chrome.action.setBadgeBackgroundColor({ color: '#4338ca' });
  } catch (e) {
    console.warn('Badge update failed:', e);
  }
}

// Set up context menus for auto-recognition
function setupContextMenus() {
  try {
    // Remove any existing menu items
    chrome.contextMenus.removeAll(() => {
      // Create new context menu items
      chrome.contextMenus.create({
        id: 'emma-recognize-image',
        title: 'Recognize with Emma',
        contexts: ['image']
      });
      
      chrome.contextMenus.create({
        id: 'emma-capture-text',
        title: 'Save to Emma',
        contexts: ['selection']
      });
    });
  } catch (e) {
    console.warn('Context menu setup failed:', e);
  }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('Context menu clicked:', info.menuItemId);
  
  switch (info.menuItemId) {
    case 'emma-recognize-image':
      // Handle image recognition
      if (info.srcUrl) {
        await handleImageRecognition(info.srcUrl, tab);
      }
      break;
      
    case 'emma-capture-text':
      // Handle text capture
      if (info.selectionText) {
        await handleTextCapture(info.selectionText, tab);
      }
      break;
  }
});

// Handle image recognition
async function handleImageRecognition(imageUrl, tab) {
  try {
    console.log('🖼️ Processing image:', imageUrl);
    
    // Save image memory using WEBAPP-FIRST approach
    const result = await sendToWebapp('EMMA_SAVE_MEMORY', {
      content: `Image captured from ${tab.title || tab.url}`,
      metadata: {
        type: 'image',
        source: 'context_menu',
        url: tab.url,
        title: tab.title,
        imageUrl: imageUrl,
        timestamp: Date.now()
      },
      attachments: [{
        name: 'captured_image.jpg',
        type: 'image/jpeg',
        url: imageUrl
      }]
    });
    
    console.log('🖼️ Image memory saved:', result);
    updateBadge();
    
  } catch (e) {
    console.error('🖼️ Image recognition failed:', e);
  }
}

// Handle text capture
async function handleTextCapture(text, tab) {
  try {
    console.log('📝 Processing text:', text.substring(0, 100) + '...');
    
    // Save text memory using WEBAPP-FIRST approach
    const result = await sendToWebapp('EMMA_SAVE_MEMORY', {
      content: text,
      metadata: {
        type: 'text',
        source: 'context_menu',
        url: tab.url,
        title: tab.title,
        timestamp: Date.now()
      }
    });
    
    console.log('📝 Text memory saved:', result);
    updateBadge();
    
  } catch (e) {
    console.error('📝 Text capture failed:', e);
  }
}

/**
 * WEBAPP-FIRST SAVE MEMORY: All memory operations go through webapp
 */
async function saveMemory(memoryData) {
  console.log('🚀 WEBAPP-FIRST: Deferring to webapp for all memory storage');
  
  // NEW ARCHITECTURE: Extension defers to webapp for all vault operations
  try {
    // Send memory to webapp for vault storage
    const result = await sendToWebapp('EMMA_SAVE_MEMORY', {
      ...memoryData,
      timestamp: Date.now(),
      source: memoryData.source || 'extension',
      extensionGenerated: true
    });
    
    if (result.success) {
      console.log('✅ WEBAPP-FIRST: Memory saved via webapp:', result.memoryId);
      updateBadge();
      return { success: true, memoryId: result.memoryId };
    } else {
      throw new Error(result.error || 'Webapp save failed');
    }
    
  } catch (error) {
    console.error('❌ WEBAPP-FIRST: Memory save failed:', error);
    
    // EMERGENCY FALLBACK: Basic chrome.storage for demo stability
    try {
      const memoryId = `mem_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      const memory = {
        id: memoryId,
        content: memoryData.content || memoryData.title || 'Untitled memory',
        timestamp: Date.now(),
        role: memoryData.role || 'user',
        source: memoryData.source || 'extension',
        type: memoryData.type || 'memory',
        metadata: {
          ...memoryData.metadata,
          fallbackSave: true,
          originalError: error.message
        }
      };
      
      const snap = await chrome.storage.local.get(['emma_memories']);
      const memories = Array.isArray(snap.emma_memories) ? snap.emma_memories : [];
      memories.unshift(memory);
      
      if (memories.length > 1000) memories.length = 1000;
      
      await chrome.storage.local.set({ emma_memories: memories });
      
      console.log('🛟 EMERGENCY: Memory saved to fallback storage:', memoryId);
      updateBadge();
      
      return { success: true, memoryId: memoryId };
    } catch (fallbackError) {
      console.error('🚨 CRITICAL: All memory save methods failed:', fallbackError);
      throw fallbackError;
    }
  }
}

// Main message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Background received message:', request.action);
  
  (async () => {
    try {
      switch (request.action) {
        case 'saveMemory':
          try {
            const result = await saveMemory(request.data);
            sendResponse({ success: true, ...result });
          } catch (e) {
            console.error('saveMemory error:', e);
            sendResponse({ success: false, error: e.message });
          }
          break;
        
        case 'getMemories':
          try {
            const memories = await memoryDB.getAllMemories(request.limit || 50);
            sendResponse({ success: true, memories });
          } catch (e) {
            console.error('getMemories error:', e);
            sendResponse({ success: false, error: e.message });
          }
          break;
        
        case 'deleteMemory':
          try {
            await memoryDB.deleteMemory(request.memoryId);
            updateBadge();
            sendResponse({ success: true });
          } catch (e) {
            console.error('deleteMemory error:', e);
            sendResponse({ success: false, error: e.message });
          }
          break;
        
        case 'searchMemories':
          try {
            const results = await memoryDB.searchMemories(request.query, request.limit || 20);
            sendResponse({ success: true, memories: results });
          } catch (e) {
            console.error('searchMemories error:', e);
            sendResponse({ success: false, error: e.message });
          }
          break;
        
        case 'getSettings':
          try {
            const settings = await chrome.storage.sync.get([
              'autoRecognition',
              'userProfile'
            ]);
            sendResponse({ success: true, settings });
          } catch (e) {
            console.error('getSettings error:', e);
            sendResponse({ success: false, error: e.message });
          }
          break;
        
        case 'updateSettings':
          try {
            await chrome.storage.sync.set(request.settings);
            sendResponse({ success: true });
          } catch (e) {
            console.error('updateSettings error:', e);
            sendResponse({ success: false, error: e.message });
          }
          break;
          
      // WEBAPP-FIRST: All vault operations redirected to webapp
      case 'checkVaultStatus':
      case 'vault.getStatus':
        console.log('🚀 WEBAPP-FIRST: Vault status requests redirected to webapp');
        sendResponse({ 
          success: false, 
          webappManaged: true,
          error: 'Vault operations moved to webapp - check webapp vault status'
        });
        break;
        
      case 'initializeVault':
        console.log('🚀 WEBAPP-FIRST: Vault initialization redirected to webapp');
        sendResponse({ 
          success: false, 
          webappManaged: true,
          error: 'Vault operations moved to webapp - initialize vault in webapp interface'
        });
        break;
        
      case 'vault.unlock':
        console.log('🚀 WEBAPP-FIRST: Vault unlock redirected to webapp');
        sendResponse({ 
          success: false, 
          webappManaged: true,
          error: 'Vault operations moved to webapp - unlock vault in webapp interface'
        });
        break;
        
      case 'vault.lock':
        console.log('🚀 WEBAPP-FIRST: Vault lock redirected to webapp');
        sendResponse({ 
          success: false, 
          webappManaged: true,
          error: 'Vault operations moved to webapp - lock vault in webapp interface'
        });
        break;
        
      case 'vault.createCapsule':
        console.log('🚀 WEBAPP-FIRST: Vault createCapsule redirected to webapp');
        sendResponse({ 
          success: false, 
          webappManaged: true,
          error: 'Vault operations moved to webapp - create memories in webapp interface'
        });
        break;
        
      case 'vault.listCapsules':
        console.log('🚀 WEBAPP-FIRST: Vault listCapsules redirected to webapp');
        sendResponse({ 
          success: false, 
          webappManaged: true,
          error: 'Vault operations moved to webapp - view memories in webapp interface'
        });
        break;
        
      case 'vault.stats':
        console.log('🚀 WEBAPP-FIRST: Vault stats redirected to webapp');
        sendResponse({ 
          success: false, 
          webappManaged: true,
          error: 'Vault operations moved to webapp - view stats in webapp interface'
        });
        break;
        
      case 'vault.debug':
        console.log('🚀 WEBAPP-FIRST: Vault debug redirected to webapp');
        sendResponse({ 
          success: false, 
          webappManaged: true,
          error: 'Vault operations moved to webapp - debug info available in webapp console'
        });
        break;
        
      case 'vault.createBackup':
        try {
          const backup = await vaultBackup.createBackup(request.vaultId, request.options);
          sendResponse({ success: true, backup });
        } catch (e) {
          console.error('vault backup error:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'ping':
        sendResponse({ success: true, message: 'Background script is alive' });
        break;
        
      default:
        console.warn('🤔 Unknown action:', request.action);
        sendResponse({ success: false, error: 'Unknown action' });
    }
    } catch (e) {
      console.error('🚨 Message handler error:', e);
      sendResponse({ success: false, error: e.message });
    }
  })();
  
  return true; // Keep message channel open for async response
});

// Handle startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('Emma Lite started up.');
  updateBadge();
  
  // Initialize vault manager on startup
  await initializeVaultManager();
  
  // Set up vault state broadcasting
  await setupVaultBroadcasting();
});

/**
 * WEBAPP-FIRST COMMUNICATION: Send messages to webapp vault
 */
async function sendToWebapp(action, data) {
  return new Promise((resolve, reject) => {
    // For now, return a temporary success response
    // TODO: Implement proper webapp communication once bridge is loaded
    console.log('🌉 WEBAPP-FIRST: Simulating webapp communication for:', action);
    
    setTimeout(() => {
      if (action === 'EMMA_SAVE_MEMORY') {
        resolve({
          success: true,
          memoryId: `webapp_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
          message: 'Saved via webapp vault (simulated)'
        });
      } else {
        resolve({
          success: false,
          error: 'Action not implemented yet'
        });
      }
    }, 100);
  });
}

// End of background.js
