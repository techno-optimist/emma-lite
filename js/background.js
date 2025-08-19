// js/background.js - Service worker for Emma Lite with MTAP Protocol + HML Vault
console.log('🚀 Background script loading...');

import { memoryDB } from '../lib/database-mtap.js';
import { mtapAdapter, mcpBridge } from '../lib/mtap-adapter.js';
import { hmlAdapter } from '../lib/hml-adapter.js';
import { registerVaultMessageHandlers, VaultService } from './vault/service.js';
import { getVaultManager } from './vault/vault-manager.js';
import { vaultStorage } from '../lib/vault-storage.js';
import { vaultBackup } from '../lib/vault-backup.js';

// Expose instances for adapters running in different contexts
try {
  if (!globalThis.memoryDB) globalThis.memoryDB = memoryDB;
  if (!globalThis.vaultStorage) globalThis.vaultStorage = vaultStorage;
  if (!globalThis.navigator) globalThis.navigator = { userAgent: 'EmmaServiceWorker' };
} catch {}

console.log('✅ Background imports successful');

// Ensure Vault handlers are always registered when the service worker loads
try {
  registerVaultMessageHandlers();
  console.log('🔐 Vault message handlers registered');
} catch (e) {
  console.warn('Vault handlers registration error at load:', e);
}

// Initialize vault manager on service worker start
async function initializeVaultManager() {
  try {
    console.log('🔐 Background: Initializing VaultManager...');
    const vaultManager = getVaultManager();
    await vaultManager.initialize();
    
    // Log initial status for debugging
    const status = await vaultManager.getStatus();
    console.log('🔐 Background: Initial vault status:', {
      initialized: status.initialized,
      isUnlocked: status.isUnlocked,
      hasValidSession: status.hasValidSession,
      sessionExpiry: status.sessionExpiresAt ? new Date(status.sessionExpiresAt).toLocaleString() : null
    });
    
    return vaultManager;
  } catch (e) {
    console.error('🔐 Background: VaultManager initialization failed:', e);
    throw e;
  }
}

// Set up vault state change broadcasting
async function setupVaultBroadcasting() {
  try {
    const vaultManager = getVaultManager();
    
    // Listen for vault state changes and broadcast to all extension contexts
    vaultManager.addListener((status) => {
      console.log('🔐 Background: Broadcasting vault state change:', {
        initialized: status.initialized,
        isUnlocked: status.isUnlocked,
        hasValidSession: status.hasValidSession
      });
      
      // Broadcast to all extension pages
      chrome.runtime.sendMessage({
        action: 'vault.stateChanged',
        status
      }).catch(() => {
        // Ignore "no receivers" errors - normal when no pages are open
      });
    });
    
    console.log('🔐 Background: Vault broadcasting set up');
  } catch (e) {
    console.error('🔐 Background: Failed to set up vault broadcasting:', e);
  }
}

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Emma Lite installed:', details.reason);
  
  // Initialize database and set defaults on first install
  if (details.reason === 'install') {
    await memoryDB.init();
    await memoryDB.setSetting('autoCapture', true);
    await memoryDB.setSetting('captureUser', true);
    await memoryDB.setSetting('captureAI', true);
    await memoryDB.setSetting('maxMemories', 10000);
    await memoryDB.setSetting('theme', 'light');
    await memoryDB.setSetting('useMTAP', true);
    
    console.log('🔧 Background: Default settings applied on install.');
    
    // Track installation
    await memoryDB.trackEvent('extension_installed', {
      version: chrome.runtime.getManifest().version
    });
    
    // Check if vault has been initialized
    const vaultStatus = await chrome.storage.local.get(['emma_vault_initialized']);
    
    // Open welcome page with vault setup if needed
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html' + (!vaultStatus.emma_vault_initialized ? '#vault-setup' : ''))
    });
  }
  
  // Initialize vault manager
  await initializeVaultManager();
  
  // Set up vault state broadcasting
  await setupVaultBroadcasting();
  
  // Always ensure context menus are set up
  setupContextMenus();
  // Already registered at load; keep for redundancy
  try { registerVaultMessageHandlers(); } catch (e) { console.warn('Vault handlers registration issue:', e); }
});

function setupContextMenus() {
  if (chrome.contextMenus) {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'save-selection',
        title: 'Save to Emma Memory',
        contexts: ['selection']
      });
      
      chrome.contextMenus.create({ id: 'search-memories', title: 'Search Emma Memories', contexts: ['page'] });

      // Universal media importer entries
      try {
        chrome.contextMenus.create({ id: 'emma-add-image', title: 'Add image to Emma', contexts: ['image'] });
        chrome.contextMenus.create({ id: 'emma-add-video', title: 'Add video to Emma', contexts: ['video'] });
      } catch (e) {
        console.warn('Context menu media items failed:', e);
      }
    });
  }
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🔍 Background: Message received:', request.action, request);
  handleMessage(request, sender, sendResponse);
  return true; // Keep channel open for async response
});

// Context menu handler for universal media import
try {
  chrome.contextMenus && chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    try {
      if (info.menuItemId === 'emma-add-image' || info.menuItemId === 'emma-add-video') {
        const srcUrl = info.srcUrl || info.linkUrl;
        const pageUrl = info.pageUrl;
        const mediaType = info.menuItemId === 'emma-add-image' ? 'image' : 'video';
        const attachment = await mediaImportFromUrl(srcUrl, { pageUrl, mediaType });
        if (attachment && attachment.success) {
          sendToast('Media added to Emma');
        } else {
          sendToast('Failed to add media', 'error');
        }
      }
    } catch (e) {
      console.error('Context menu media import failed:', e);
      sendToast('Media import error', 'error');
    }
  });
} catch {}

async function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    } catch (e) { reject(e); }
  });
}

// --- Media import helpers ---
function upgradeGooglePhotosUrl(url) {
  try {
    if (!url) return url;
    const u = new URL(url, location.href);
    const host = u.hostname || '';
    if (!/googleusercontent\.com|photos\.google\.com|lh\d+\.googleusercontent\.com/.test(host)) return url;
    let s = url;
    // Replace simple size token =sNNN with a large size
    s = s.replace(/=s(\d+)(?=[^0-9]|$)/g, '=s4096');
    // Upgrade w-h tokens
    s = s.replace(/w\d+-h\d+/g, 'w4096-h4096');
    s = s.replace(/=w\d+-h\d+-no/g, '=w4096-h4096-no');
    return s;
  } catch {
    return url;
  }
}

function getHighestQualityUrl(url) {
  if (!url) return url;
  let out = url;
  out = upgradeGooglePhotosUrl(out);
  return out;
}
async function mediaImportFromUrl(url, { pageUrl, mediaType, capsuleId } = {}) {
  try {
    if (!url) throw new Error('Missing media URL');
    const hq = getHighestQualityUrl(url);
    // Try upgraded URL first, then original as fallback
    let res = await fetch(hq, { credentials: 'omit', mode: 'cors' }).catch(() => null);
    if (!res || !res.ok) {
      res = await fetch(url, { credentials: 'omit', mode: 'cors' }).catch(() => null);
    }
    if (!res || !res.ok) throw new Error('Fetch blocked');
    const blob = await res.blob();
    const arrayBuf = await blob.arrayBuffer();
    const hashBuf = await crypto.subtle.digest('SHA-256', arrayBuf);
    const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    let targetCapsuleId = capsuleId;
    if (!targetCapsuleId) {
      targetCapsuleId = await memoryDB.addMemory({
        content: `Imported media from ${pageUrl || 'page'}`,
        type: 'media',
        source: 'import',
        metadata: { url: pageUrl || '', createdVia: 'media.import' }
      });
      
      // Broadcast memory created event
      try {
        chrome.runtime.sendMessage({ action: 'memory.created', memoryId: targetCapsuleId });
      } catch (e) { /* ignore */ }
    }
    const attachment = {
      id: `att_${hashHex.slice(0, 16)}`,
      mime: blob.type || (mediaType === 'image' ? 'image/*' : 'video/*'),
      size: blob.size,
      hash: hashHex,
      type: mediaType,
      sourceUrl: url,
      pageUrl,
      capturedAt: new Date().toISOString(),
      capsuleId: targetCapsuleId
    };
    await memoryDB.addAttachment(attachment, blob);
    return { success: true, attachment, capsuleId: targetCapsuleId };
  } catch (e) {
    console.error('mediaImportFromUrl error:', e);
    return { success: false, error: e.message };
  }
}

// Capture element screenshot with precise cropping for CORS-blocked sources
async function captureElementScreenshot({ rect, dpr, pageUrl, capsuleId, elementSelector }, sender) {
  try {
    if (!rect || !rect.width || !rect.height) {
      throw new Error('Invalid element rect provided');
    }
    
    // Capture the visible tab
    const pngDataUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' });
    const response = await fetch(pngDataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    
    // Calculate crop coordinates with device pixel ratio
    const devicePixelRatio = dpr || 1;
    const sx = Math.max(0, Math.round(rect.x * devicePixelRatio));
    const sy = Math.max(0, Math.round(rect.y * devicePixelRatio));
    const sw = Math.min(bitmap.width - sx, Math.round(rect.width * devicePixelRatio));
    const sh = Math.min(bitmap.height - sy, Math.round(rect.height * devicePixelRatio));
    
    // Create cropped canvas
    const canvas = new OffscreenCanvas(sw, sh);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
    const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });
    
    // Generate hash and metadata
    const arrayBuffer = await croppedBlob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Ensure we have a capsule to attach to
    let targetCapsuleId = capsuleId;
    if (!targetCapsuleId) {
      targetCapsuleId = await memoryDB.addMemory({
        content: `Screenshot captured from ${pageUrl || 'this page'}`,
        type: 'media',
        source: 'screenshot',
        metadata: { 
          url: pageUrl || '', 
          createdVia: 'media.captureElement',
          elementSelector: elementSelector || ''
        }
      });
      
      // Broadcast memory created event
      try {
        chrome.runtime.sendMessage({ action: 'memory.created', memoryId: targetCapsuleId });
      } catch (e) { /* ignore */ }
    }
    
    // Build attachment metadata
    const attachment = {
      id: `att_${hashHex.slice(0, 16)}`,
      mime: 'image/png',
      size: croppedBlob.size,
      hash: hashHex,
      type: 'image',
      width: sw,
      height: sh,
      sourceUrl: pageUrl,
      pageUrl,
      capturedAt: new Date().toISOString(),
      captureMethod: 'element_screenshot',
      elementSelector: elementSelector || '',
      capsuleId: targetCapsuleId
    };
    
    // Store the attachment
    await memoryDB.addAttachment(attachment, croppedBlob);
    
    return { success: true, attachment, capsuleId: targetCapsuleId };
  } catch (error) {
    console.error('captureElementScreenshot error:', error);
    return { success: false, error: error.message };
  }
}

// Batch import all visible media on current page
async function batchImportMedia({ pageUrl, capsuleId, mediaSelector }, sender) {
  try {
    console.log('🔍 BACKGROUND: batchImportMedia called with:', { pageUrl, capsuleId, mediaSelector });
    
    // Get all media elements from the content script
    const mediaElements = await new Promise((resolve) => {
      chrome.tabs.sendMessage(sender.tab.id, {
        action: 'media.scanPage',
        selector: mediaSelector || 'img, video'
      }, (response) => {
        console.log('🔍 BACKGROUND: Content script response:', response);
        console.log('🔍 BACKGROUND: Elements received:', response?.elements?.length || 0);
        if (response?.elements) {
          console.log('🔍 BACKGROUND: First 3 elements:', response.elements.slice(0, 3));
          console.log('🔍 BACKGROUND: All element sources:', response.elements.map(e => e.src?.substring(0, 100)));
        }
        resolve(response?.elements || []);
      });
    });
    
    console.log('🔍 BACKGROUND: Final mediaElements array length:', mediaElements.length);
    
    if (!mediaElements.length) {
      return { success: false, error: 'No media elements found on page' };
    }
    
    // Ensure we have a capsule for batch import
    let targetCapsuleId = capsuleId;
    if (!targetCapsuleId) {
      targetCapsuleId = await memoryDB.addMemory({
        content: `Batch import from ${pageUrl || 'this page'} (${mediaElements.length} items)`,
        type: 'media',
        source: 'batch_import',
        metadata: { 
          url: pageUrl || '', 
          createdVia: 'media.batchImport',
          itemCount: mediaElements.length
        }
      });
      
      // Broadcast memory created event
      try {
        chrome.runtime.sendMessage({ action: 'memory.created', memoryId: targetCapsuleId });
      } catch (e) { /* ignore */ }
    }
    
    const results = [];
    const errors = [];
    
    // Process each media element
    console.log('🔍 BACKGROUND: Starting to process', mediaElements.length, 'media elements');
    let processedCount = 0;
    
    for (const element of mediaElements) {
      try {
        processedCount++;
        console.log(`🔍 BACKGROUND: Processing element ${processedCount}/${mediaElements.length}:`, {
          src: element.src?.substring(0, 100),
          tagName: element.tagName,
          rect: element.rect
        });
        
        // Safety: ignore anything not likely from current album domain when provided
        if (pageUrl) {
          try {
            const pHost = new URL(pageUrl).hostname;
            if (element.src) {
              const eHost = new URL(element.src, pageUrl).hostname;
              if (!/googleusercontent\.com|photos\.google\.com/.test(eHost)) {
                // Skip non-photos hosts to avoid UI elements or ads
                console.log(`🔍 BACKGROUND: Skipping element ${processedCount} - wrong host:`, eHost);
                continue;
              }
            }
          } catch {}
        }
        let result;
        
        if (element.src && !element.src.startsWith('data:')) {
          // Try direct URL import first
          result = await mediaImportFromUrl(element.src, {
            pageUrl,
            mediaType: element.tagName.toLowerCase() === 'img' ? 'image' : 'video',
            capsuleId: targetCapsuleId
          });
        }
        
        // If URL import fails or no src, fall back to screenshot
        if (!result?.success && element.rect) {
          result = await captureElementScreenshot({
            rect: element.rect,
            dpr: element.dpr || 1,
            pageUrl,
            capsuleId: targetCapsuleId,
            elementSelector: element.selector
          }, sender);
        }
        
        if (result?.success) {
          results.push(result.attachment);
          console.log(`🔍 BACKGROUND: Successfully processed element ${processedCount} - total successes: ${results.length}`);
        } else {
          errors.push(`Failed to capture ${element.selector}: ${result?.error || 'Unknown error'}`);
          console.log(`🔍 BACKGROUND: Failed to process element ${processedCount}:`, result?.error);
        }
      } catch (error) {
        errors.push(`Error processing ${element.selector}: ${error.message}`);
        console.log(`🔍 BACKGROUND: Exception processing element ${processedCount}:`, error.message);
      }
    }
    
    console.log('🔍 BACKGROUND: Batch import complete:', {
      totalElements: mediaElements.length,
      successfulImports: results.length,
      errors: errors.length,
      firstFewErrors: errors.slice(0, 3)
    });
    
    return {
      success: true,
      capsuleId: targetCapsuleId,
      imported: results.length,
      total: mediaElements.length,
      errors: errors.length > 0 ? errors : undefined,
      attachments: results
    };
  } catch (error) {
    console.error('batchImportMedia error:', error);
    return { success: false, error: error.message };
  }
}

async function handleMessage(request, sender, sendResponse) {
  console.log('🔍 Background: handleMessage called with action:', request.action);
  try {
    switch (request.action) {
      case 'ping':
        sendResponse({ success: true, message: 'Background script is working' });
        break;
        
      case 'saveMemory':
        console.log('🔧 Background: saveMemory request received:', request.data);
        try {
          const memoryId = await Promise.race([
            saveMemory(request.data),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Background save timeout')), 8000))
          ]);
          console.log('🔍 Background: saveMemory success, ID:', memoryId);
          await updateBadge(); // Update badge count after saving
          sendResponse({ success: true, memoryId });
        } catch (error) {
          console.error('🔧 Background: saveMemory failed:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'saveToStorage':
        console.log('🔧 Background: saveToStorage request received:', request.data);
        try {
          // Save to chrome.storage.local as fallback
          const memoryId = `emma_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const enrichedMemory = {
            id: memoryId,
            ...request.data,
            savedAt: new Date().toISOString(),
            source: 'chrome_storage_fallback'
          };
          
          // Get existing memories
          const result = await chrome.storage.local.get(['emma_memories']);
          const memories = result.emma_memories || [];
          
          // Add new memory
          memories.push(enrichedMemory);
          
          // Keep only last 500 memories
          if (memories.length > 500) {
            memories.splice(0, memories.length - 500);
          }
          
          // Save back
          await chrome.storage.local.set({ emma_memories: memories });
          
          console.log('🔍 Background: saveToStorage success, total:', memories.length);
          sendResponse({ success: true, memoryId, total: memories.length });
        } catch (error) {
          console.error('🔧 Background: saveToStorage failed:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'searchMemories':
        const results = await searchMemories(request.query);
        sendResponse({ success: true, results });
        break;
        
      case 'getStats':
        console.log('🔍 Background: getStats request');
        console.log('🔍 MTAP mode for stats:', memoryDB.useMTAP);
        
        const stats = await memoryDB.getStats();
        
        const response = {
          success: true,
          stats: {
            totalMemories: stats.totalMemories || 0,
            storageUsed: stats.storageUsed || 0,
            storageQuota: stats.storageQuota || 0,
            mtapMode: stats.mtapMode || true
          }
        };
        
        console.log('🔍 Background: getStats result:', response);
        sendResponse(response);
        break;
        
      case 'getSettings':
        const settings = await memoryDB.getAllSettings();
        sendResponse({ success: true, settings });
        break;
        
      case 'setSetting':
        await memoryDB.setSetting(request.key, request.value);
        sendResponse({ success: true });
        break;
        
      case 'exportData':
        const data = await memoryDB.exportData();
        sendResponse({ success: true, data });
        break;
        
      case 'importData':
        const result = await memoryDB.importData(request.data);
        sendResponse({ success: true, result });
        break;
        
      case 'clearMemories':
        // Require explicit confirmation token to avoid accidental wipes
        if (request?.confirmToken !== 'CONFIRM_DELETE_ALL') {
          sendResponse({ success: false, error: 'confirmation_required' });
          break;
        }
        await memoryDB.clearAllMemories();
        try { await memoryDB.trackEvent('memories_cleared', { origin: request?.origin || 'unknown' }); } catch {}
        sendResponse({ success: true });
        
        // Broadcast memories cleared event to update UI counters
        try {
          chrome.runtime.sendMessage({ action: 'memories.cleared' });
        } catch (e) {
          // Ignore if no listeners
        }
        break;
        
      case 'deleteMemory':
        await memoryDB.deleteMemory(request.id);
        sendResponse({ success: true });
        
        // Broadcast memory deleted event to update UI counters
        try {
          chrome.runtime.sendMessage({ action: 'memory.deleted', memoryId: request.id });
        } catch (e) {
          // Ignore if no listeners
        }
        break;
        
      case 'getAllMemories':
        console.log('🔍 Background: getAllMemories request:', { limit: request.limit, offset: request.offset });
        console.log('🔍 MTAP mode:', memoryDB.useMTAP);
        
        let memories;
        try {
          memories = await memoryDB.getAllMemories(
            request.limit || 100,
            request.offset || 0
          );
        } catch (e) {
          console.warn('getAllMemories failed, retrying once:', e);
          memories = await memoryDB.getAllMemories(
            request.limit || 100,
            request.offset || 0
          );
        }
        
        console.log('🔍 Background: getAllMemories result:', {
          count: memories.length,
          memories: memories.slice(0, 3).map(m => ({ id: m.id, content: m.content?.substring(0, 50) + '...', timestamp: m.timestamp }))
        });
        
        sendResponse({ success: true, memories });
        break;

      // Media importer endpoints (MVP wiring)
      case 'media.importFromUrl':
        try {
          const out = await mediaImportFromUrl(request.url, { pageUrl: request.pageUrl, mediaType: request.mediaType, capsuleId: request.capsuleId });
          sendResponse(out);
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;

      case 'media.captureElement':
        try {
          const out = await captureElementScreenshot(request, sender);
          sendResponse(out);
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;

      case 'media.batchImport':
        try {
          const out = await batchImportMedia(request, sender);
          sendResponse(out);
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;

      case 'trackEvent':
        try {
          await memoryDB.trackEvent(request.event || 'unknown', request.data || {});
          sendResponse({ success: true });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;

      // Attachment APIs
      case 'attachment.add':
        try {
          // Expect: { meta, blob } — blob transferred via dataURL for MV3 simplicity
          const meta = request.meta;
          let blob;
          if (request.dataUrl) {
            const res = await fetch(request.dataUrl);
            blob = await res.blob();
          }
          await memoryDB.addAttachment(meta, blob);
          sendResponse({ success: true, id: meta.id });
        } catch (e) { sendResponse({ success: false, error: e.message }); }
        break;
      case 'attachment.list':
        try {
          const items = await memoryDB.listAttachments(request.capsuleId);
          // Strip blobs for listing
          const meta = items.map(({ blob, ...rest }) => rest);
          sendResponse({ success: true, items: meta });
        } catch (e) { sendResponse({ success: false, error: e.message }); }
        break;
      case 'attachment.get':
        try {
          const item = await memoryDB.getAttachment(request.id);
          if (!item) return sendResponse({ success: false, error: 'not_found' });
          const dataUrl = await blobToDataURL(item.blob);
          const { blob, ...rest } = item;
          sendResponse({ success: true, item: rest, dataUrl });
        } catch (e) { sendResponse({ success: false, error: e.message }); }
        break;
      case 'attachment.delete':
        try { await memoryDB.deleteAttachment(request.id); sendResponse({ success: true }); }
        catch (e) { sendResponse({ success: false, error: e.message }); }
        break;
      case 'attachment.update':
        try {
          await memoryDB.updateAttachment(request.id, request.updates);
          sendResponse({ success: true });
        } catch (e) { sendResponse({ success: false, error: e.message }); }
        break;
        
      case 'checkVaultStatus':
      case 'vault.getStatus':
        try {
          const vaultManager = getVaultManager();
          const status = await vaultManager.getStatus();
          
          sendResponse({ 
            success: true, 
            ...status
          });
        } catch (e) {
          console.error('vault status error:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'initializeVault':
        try {
          if (!request.passphrase) {
            throw new Error('Passphrase required');
          }
          
          const vaultManager = getVaultManager();
          const result = await vaultManager.initializeVault(request.passphrase);
          
          sendResponse({ success: true, ...result });
        } catch (e) {
          console.error('initializeVault error:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'vault.unlock':
        try {
          if (!request.passphrase) {
            throw new Error('Passphrase required');
          }
          
          const vaultManager = getVaultManager();
          const result = await vaultManager.unlock(request.passphrase);
          
          sendResponse({ success: true, ...result });
        } catch (e) {
          console.error('vault unlock error:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'vault.lock':
        try {
          const vaultManager = getVaultManager();
          const result = await vaultManager.lock();
          
          sendResponse({ success: true, ...result });
        } catch (e) {
          console.error('vault lock error:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'vault.createCapsule':
        try {
          const vaultManager = getVaultManager();
          const result = await vaultManager.createCapsule(request.data);
          
          sendResponse({ success: true, ...result });
        } catch (e) {
          console.error('vault createCapsule error:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'vault.listCapsules':
        try {
          const vaultManager = getVaultManager();
          const result = await vaultManager.listCapsules(request.limit);
          
          sendResponse({ success: true, ...result });
        } catch (e) {
          console.error('vault listCapsules error:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'vault.stats':
        try {
          const vaultManager = getVaultManager();
          const stats = await vaultManager.getStats();
          
          sendResponse({ success: true, stats });
        } catch (e) {
          console.error('vault stats error:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'vault.debug':
        try {
          const vaultManager = getVaultManager();
          const debug = await vaultManager.getDebugInfo();
          
          sendResponse({ success: true, debug });
        } catch (e) {
          console.error('vault debug error:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'vault.createBackup':
        try {
          const backup = await vaultBackup.createBackup(request.vaultId, request.options);
          sendResponse({ success: true, backup });
        } catch (e) {
          console.error('vault createBackup error:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'vault.exportFile':
        try {
          // Create backup object in background and return to UI for download handling
          const backup = await vaultBackup.createBackup(request.vaultId, { backupPassphrase: request.backupPassphrase });
          const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
          const vaultId = backup?.metadata?.vault_id || 'vault';
          const filename = request.filename || `emma-vault-${vaultId}-${timestamp}.json`;
          const size = new Blob([JSON.stringify(backup)]).size;
          sendResponse({ success: true, filename, size, backup });
        } catch (e) {
          console.error('vault exportFile error:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'vault.restoreBackup':
        try {
          const result = await vaultBackup.restoreVault(
            request.backupData,
            request.backupPassphrase,
            request.newPassphrase,
            request.options
          );
          sendResponse({ success: true, ...result });
        } catch (e) {
          console.error('vault restoreBackup error:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'toggleMTAP':
        await memoryDB.toggleMTAPMode(request.enabled);
        sendResponse({ success: true, mtapMode: request.enabled });
        break;
        
      case 'getMTAPStatus':
        const mtapMode = memoryDB.getMTAPMode();
        sendResponse({ success: true, mtapMode });
        break;
        
      case 'getMCPContext':
        const context = await mcpBridge.getContext(request.query, request.options);
        sendResponse({ success: true, context });
        break;
        
      default:
        console.log('🔍 Background: Unknown action reached:', request.action);
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function saveMemory(data) {
  console.log('🔧 saveMemory: Starting save process with HML first...');
  
  try {
    // Attempt to store via HML adapter (preferred)
    const hmlCapsule = await hmlAdapter.createMemory(data.content, {
      role: data.role || 'user',
      source: data.source || 'unknown',
      url: data.url,
      type: data.type || 'conversation',
      userAgent: navigator.userAgent,
      capturedAt: new Date().toISOString(),
      ...data.metadata
    });

    const memoryId = await hmlAdapter.store(hmlCapsule);
    console.log('🔧 saveMemory: Saved via HML adapter, ID:', memoryId);

    try { chrome.runtime.sendMessage({ action: 'memory.created', memoryId }); } catch {}
    await updateBadge();
    return memoryId;
  } catch (hmlError) {
    console.warn('🔧 saveMemory: HML path failed, falling back to vaultStorage/MTAP:', hmlError.message);
  }
  
  try {
    // Use existing vault storage system (MTAP + Vault integration)
    const memoryId = await vaultStorage.saveMemory({
      content: data.content,
      metadata: {
        role: data.role || 'user',
        source: data.source || 'unknown',
        url: data.url,
        type: data.type || 'conversation',
        userAgent: navigator.userAgent,
        capturedAt: new Date().toISOString(),
        ...data.metadata
      },
      attachments: data.attachments || []
    });
    console.log('🔧 saveMemory: Saved with vault storage, ID:', memoryId);
    try { chrome.runtime.sendMessage({ action: 'memory.created', memoryId }); } catch {}
    await updateBadge();
    return memoryId;
  } catch (error) {
    console.error('🔧 saveMemory: Failed with vault storage, falling back to legacy system:', error);

    const memory = {
      content: data.content,
      role: data.role || 'user',
      source: data.source || 'unknown',
      url: data.url,
      type: data.type || 'conversation',
      metadata: {
        ...data.metadata,
        capturedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        protocol: 'MTAP/1.0'
      }
    };
    const memoryId = await memoryDB.addMemory(memory);
    console.log('🔧 saveMemory: Fallback save complete, ID:', memoryId);
    await memoryDB.trackEvent('memory_saved_fallback', { source: memory.source, role: memory.role, length: memory.content.length });
    await updateBadge();
    return memoryId;
  }
}

async function searchMemories(query) {
  const results = await memoryDB.searchMemories(query);
  
  // Track search
  await memoryDB.trackEvent('memory_searched', {
    query,
    resultsCount: results.length
  });
  
  return results;
}

async function updateBadge() {
  const stats = await memoryDB.getStats();
  
  // Show memory count on extension icon
  if (stats.totalMemories > 0) {
    const text = stats.totalMemories > 999 
      ? '999+' 
      : stats.totalMemories.toString();
    
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Context menu handlers (check if API is available)
if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'save-selection') {
      const memory = {
        content: info.selectionText,
        source: 'context-menu',
        url: tab.url,
        type: 'snippet',
        metadata: {
          pageTitle: tab.title
        }
      };
    
    await saveMemory(memory);
    
    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icons/icon-128.png',
      title: 'Memory Saved',
      message: `Saved: "${info.selectionText.substring(0, 50)}..."`
    });
    } else if (info.menuItemId === 'search-memories') {
    // Open popup with search focused
    chrome.action.openPopup();
  }
  });
}

// Handle extension icon click (when popup is not set)
chrome.action.onClicked.addListener(async (tab) => {
  // This only fires if no popup is set
  // Could be used for quick capture
});

// Periodic tasks
chrome.alarms.create('updateBadge', { periodInMinutes: 1 });
chrome.alarms.create('cleanup', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'updateBadge') {
    await updateBadge();
  } else if (alarm.name === 'cleanup') {
    // Clean up old analytics
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    // Implementation would go here
  }
});

// Listen for startup to re-initialize alarms and badge
chrome.runtime.onStartup.addListener(async () => {
  console.log('Emma Lite started up.');
  updateBadge();
  try { registerVaultMessageHandlers(); } catch {}
  
  // Initialize vault manager on startup
  await initializeVaultManager();
  
  // Set up vault state broadcasting
  await setupVaultBroadcasting();
});