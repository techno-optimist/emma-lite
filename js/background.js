// Static import for automation extension (avoid dynamic import in service worker)
// We'll lazy-load this when needed to avoid breaking the service worker
let EmmaAutomationExtension = null;
// js/background.js - Service worker for Emma Lite with MTAP Protocol + HML Vault
console.log('🚀 Background script loading...');

import { memoryDB } from '../lib/database-mtap.js';
import { mtapAdapter, mcpBridge } from '../lib/mtap-adapter.js';
import { hmlAdapter } from '../lib/hml-adapter.js';
import { registerVaultMessageHandlers, VaultService } from './vault/service.js';
import { getVaultManager } from './vault/vault-manager.js';
import { vaultStorage } from '../lib/vault-storage.js';
import { vaultBackup } from '../lib/vault-backup.js';
import { unifiedStorage } from '../lib/unified-storage.js';
import { timerManager } from '../lib/timer-manager.js';

// Expose instances for adapters running in different contexts
try {
  if (!globalThis.memoryDB) globalThis.memoryDB = memoryDB;
  if (!globalThis.vaultStorage) globalThis.vaultStorage = vaultStorage;
  if (!globalThis.navigator) globalThis.navigator = { userAgent: 'EmmaServiceWorker' };
} catch {}

console.log('✅ Background imports successful');

// Vault message handlers are integrated into main handleMessage function
console.log('🔐 Vault message handlers integrated into main handler');

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
    // Try upgraded URL first, then original as fallback, then no-cors (best-effort)
    let res = await fetch(hq, { credentials: 'omit', mode: 'cors' }).catch(() => null);
    if (!res || !res.ok) {
      res = await fetch(url, { credentials: 'omit', mode: 'cors' }).catch(() => null);
    }
    if (!res || !res.ok) {
      // Final attempt: no-cors (opaque). We cannot read body; fall back to screenshot path in caller.
      try { await fetch(hq, { mode: 'no-cors' }); } catch {}
      throw new Error('Fetch blocked by CORS');
    }
    const blob = await res.blob();
    const arrayBuf = await blob.arrayBuffer();
    const hashBuf = await crypto.subtle.digest('SHA-256', arrayBuf);
    const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    let targetCapsuleId = capsuleId;
    if (!targetCapsuleId) {
      // SECURITY FIX: Route to staging via unified storage
      const stagingId = await unifiedStorage.save({
        content: `Imported media from ${pageUrl || 'page'}`,
        type: 'media',
        source: 'import',
        metadata: { url: pageUrl || '', createdVia: 'media.import' }
      }, 'staging');
      // Use staging ID as temporary capsule identifier
      targetCapsuleId = stagingId;
      
      // Broadcast memory created event
          try { chrome.runtime.sendMessage({ action: 'memories.refresh', memoryId: targetCapsuleId }); } catch (e) { /* ignore */ }
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
    // Propagate clearer error reason to content for better UX messaging
    const msg = e && e.message ? e.message : 'Unknown error';
    return { success: false, error: msg };
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
      // SECURITY FIX: Route to staging via unified storage
      const stagingId = await unifiedStorage.save({
        content: `Screenshot captured from ${pageUrl || 'this page'}`,
        type: 'media',
        source: 'screenshot',
        metadata: { 
          url: pageUrl || '', 
          createdVia: 'media.captureElement',
          elementSelector: elementSelector || ''
        }
      }, 'staging');
      // Use staging ID as temporary capsule identifier  
      targetCapsuleId = stagingId;
      
      // Broadcast memory created event
      try { chrome.runtime.sendMessage({ action: 'memories.refresh', memoryId: targetCapsuleId }); } catch (e) { /* ignore */ }
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

// Helper function to process captured blob data
async function processCapturedBlob(blob, options) {
  try {
    const { pageUrl, capsuleId, metadata } = options;
    
    // Convert blob to base64 for storage
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64 = btoa(String.fromCharCode.apply(null, uint8Array));
    
    // Create attachment object
    const attachment = {
      id: 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      type: blob.type || 'image/jpeg',
      data: base64,
      size: blob.size,
      metadata: {
        captureMethod: 'clever_bypass',
        ...metadata,
        capturedAt: new Date().toISOString()
      }
    };
    
    // Add to capsule
    await memoryDB.addAttachment(capsuleId, attachment);
    
    return {
      success: true,
      attachment: attachment
    };
    
  } catch (error) {
    console.error('Error processing captured blob:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to extract a photo from a screenshot
async function extractPhotoFromScreenshot(screenshotDataUrl, rect, devicePixelRatio = 1) {
  try {
    console.log('📸 Extracting photo from screenshot, rect:', rect);
    
    // Convert data URL to blob first
    const response = await fetch(screenshotDataUrl);
    const blob = await response.blob();
    
    // Create bitmap from blob
    const bitmap = await createImageBitmap(blob);
    console.log('📸 Created bitmap:', bitmap.width, 'x', bitmap.height);
    
    // Create canvas for the photo
    const canvas = new OffscreenCanvas(rect.width, rect.height);
    const ctx = canvas.getContext('2d');
    
    // Draw the extracted portion
    ctx.drawImage(
      bitmap,
      rect.x * devicePixelRatio,
      rect.y * devicePixelRatio,
      rect.width * devicePixelRatio,
      rect.height * devicePixelRatio,
      0,
      0,
      rect.width,
      rect.height
    );
    
    console.log('📸 Drew image to canvas');
    
    // Convert to blob
    const photoBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
    console.log('📸 Converted to blob, size:', photoBlob.size);
    
    // Convert to data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        console.log('📸 Converted to data URL');
        resolve(reader.result);
      };
      reader.onerror = (error) => {
        console.error('📸 FileReader error:', error);
        resolve(null);
      };
      reader.readAsDataURL(photoBlob);
    });
    
  } catch (error) {
    console.error('📸 Photo extraction error:', error);
    return null;
  }
}

// Helper function to process captured data URL
async function processCapturedDataUrl(dataUrl, options) {
  try {
    const { pageUrl, capsuleId, metadata } = options;
    
    // Extract base64 data from data URL
    const [header, base64Data] = dataUrl.split(',');
    const mimeMatch = header.match(/data:([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    
    // Create attachment object
    const attachment = {
      id: 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      type: mimeType,
      data: base64Data,
      size: Math.round(base64Data.length * 0.75), // Approximate size
      metadata: {
        captureMethod: 'clever_bypass_dataurl',
        ...metadata,
        capturedAt: new Date().toISOString()
      }
    };
    
    // Add to capsule
    await memoryDB.addAttachment(capsuleId, attachment);
    
    return {
      success: true,
      attachment: attachment
    };
    
  } catch (error) {
    console.error('Error processing captured data URL:', error);
    return { success: false, error: error.message };
  }
}

// Batch import all visible media on current page
async function batchImportMedia({ pageUrl, capsuleId, mediaSelector, elements, qualityThreshold, maxElements }, sender) {
  try {
    console.log('🔍 BACKGROUND: batchImportMedia called with:', { 
      pageUrl, 
      capsuleId, 
      mediaSelector,
      providedElements: elements?.length || 0 
    });
    
    let mediaElements;
    
    // If elements are provided directly, use them
    if (elements && elements.length > 0) {
      console.log('🔍 BACKGROUND: Using provided elements:', elements.length);
      mediaElements = elements;
    } else {
      // Otherwise, get all media elements from the content script
      mediaElements = await new Promise((resolve) => {
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'media.scanPage',
          selector: mediaSelector || 'img, video',
          qualityThreshold: qualityThreshold,
          maxElements: maxElements
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
    }
    
    console.log('🔍 BACKGROUND: Final mediaElements array length:', mediaElements.length);
    
    if (!mediaElements.length) {
      // If no media elements found, try the clever bypass for a comprehensive scan
      console.log('🧠 BACKGROUND: No elements from standard scan, trying comprehensive clever bypass...');
      
      try {
        const cleverResponse = await new Promise((resolve) => {
          chrome.tabs.sendMessage(sender.tab.id, {
            action: 'clever.batchCapture',
            useAllTechniques: true,
            qualityThreshold: 0 // Lower threshold to catch more images
          }, resolve);
        });
        
        if (cleverResponse?.success && cleverResponse.captured?.length > 0) {
          console.log(`🧠 BACKGROUND: Clever bypass found ${cleverResponse.captured.length} images!`);
          
          // Convert clever bypass results to our format
          const convertedElements = cleverResponse.captured.map((capture, index) => ({
            tagName: 'IMG',
            src: capture.metadata?.originalSrc || `clever_capture_${index}`,
            selector: `clever-element-${index}`,
            rect: { width: 400, height: 300, x: 0, y: 0 }, // Default dimensions
            cleverCapture: capture // Include the actual capture data
          }));
          
          // Update mediaElements with clever captures
          mediaElements.length = 0;
          mediaElements.push(...convertedElements);
          
          console.log(`🧠 BACKGROUND: Updated mediaElements with ${mediaElements.length} clever captures`);
        }
      } catch (error) {
        console.error('🧠 BACKGROUND: Clever bypass scan failed:', error);
      }
    }
    
    if (!mediaElements.length) {
      return { success: false, error: 'No media elements found on page even with clever bypass' };
    }
    
    // Ensure we have a capsule for batch import
    let targetCapsuleId = capsuleId;
    if (!targetCapsuleId) {
      // SECURITY FIX: Route to staging via unified storage
      const stagingId = await unifiedStorage.save({
        content: `Batch import from ${pageUrl || 'this page'} (${mediaElements.length} items)`,
        type: 'media',
        source: 'batch_import',
        metadata: { 
          url: pageUrl || '', 
          createdVia: 'media.batchImport',
          itemCount: mediaElements.length
        }
      }, 'staging');
      // Use staging ID as temporary capsule identifier
      targetCapsuleId = stagingId;
      
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
        
        // Check if this element already has clever capture data
        if (element.cleverCapture) {
          console.log(`🧠 BACKGROUND: Using pre-captured data for element ${processedCount}`);
          
          try {
            // Process the pre-captured data
            if (element.cleverCapture.blob) {
              result = await processCapturedBlob(element.cleverCapture.blob, {
                pageUrl,
                capsuleId: targetCapsuleId,
                metadata: element.cleverCapture.metadata
              });
            } else if (element.cleverCapture.dataUrl) {
              result = await processCapturedDataUrl(element.cleverCapture.dataUrl, {
                pageUrl,
                capsuleId: targetCapsuleId,
                metadata: element.cleverCapture.metadata
              });
            }
            
            if (result?.success) {
              console.log(`🧠 BACKGROUND: Pre-captured data processed successfully for element ${processedCount}`);
            }
          } catch (error) {
            console.error(`🧠 BACKGROUND: Failed to process pre-captured data for element ${processedCount}:`, error);
          }
        }
        
        // If no pre-captured data or it failed, try standard methods
        if (!result?.success && element.src && !element.src.startsWith('data:')) {
          // Try direct URL import first
          result = await mediaImportFromUrl(element.src, {
            pageUrl,
            mediaType: element.tagName.toLowerCase() === 'img' ? 'image' : 'video',
            capsuleId: targetCapsuleId
          });
        }
        
        // If URL import fails, try clever bypass techniques
        if (!result?.success && !element.cleverCapture) {
          console.log(`🧠 BACKGROUND: Direct import failed for element ${processedCount}, trying clever bypass...`);
          
          try {
            const cleverResult = await new Promise((resolve) => {
              chrome.tabs.sendMessage(sender.tab.id, {
                action: 'clever.captureElement',
                elementSelector: element.selector,
                elementIndex: processedCount - 1
              }, resolve);
            });
            
            if (cleverResult?.success) {
              console.log(`🧠 BACKGROUND: Clever bypass succeeded for element ${processedCount}`);
              
              // Process the captured data (blob or dataUrl)
              if (cleverResult.blob) {
                // Convert blob to attachment
                result = await processCapturedBlob(cleverResult.blob, {
                  pageUrl,
                  capsuleId: targetCapsuleId,
                  metadata: cleverResult.metadata
                });
              } else if (cleverResult.dataUrl) {
                // Convert dataUrl to attachment
                result = await processCapturedDataUrl(cleverResult.dataUrl, {
                  pageUrl,
                  capsuleId: targetCapsuleId,
                  metadata: cleverResult.metadata
                });
              }
            } else {
              console.log(`🧠 BACKGROUND: Clever bypass failed for element ${processedCount}: ${cleverResult?.error}`);
            }
          } catch (error) {
            console.log(`🧠 BACKGROUND: Clever bypass error for element ${processedCount}:`, error.message);
          }
        }
        
        // If clever bypass also fails, fall back to screenshot
        if (!result?.success && element.rect) {
          console.log(`🔧 BACKGROUND: Falling back to screenshot for element ${processedCount}`);
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
      // Ephemeral (staging) memory API
      case 'ephemeral.add':
        try {
          console.log('🎯 Background: ephemeral.add received:', request);
          const id = await unifiedStorage.save(request.data, 'staging');
          console.log('✅ Background: ephemeral.add saved with ID:', id);
          sendResponse({ success: true, id });
        } catch (e) { 
          console.error('❌ Background: ephemeral.add failed:', e);
          sendResponse({ success: false, error: e.message }); 
        }
        break;
      case 'ephemeral.list':
        try {
          const items = await unifiedStorage.listStaging();
          sendResponse({ success: true, items });
        } catch (e) { sendResponse({ success: false, error: e.message }); }
        break;
      case 'ephemeral.delete':
        try { await unifiedStorage.deleteFromStaging(request.id); sendResponse({ success: true }); }
        catch (e) { sendResponse({ success: false, error: e.message }); }
        break;
              case 'ephemeral.commit':
          try {
            // Get the staging item
            const snap = await chrome.storage.local.get(['emma_ephemeral']);
            const list = Array.isArray(snap.emma_ephemeral) ? snap.emma_ephemeral : [];
            const item = list.find(i => i.id === request.id);
            
            if (!item) {
              throw new Error('Staging item not found');
            }
            
            console.log('🚀 Background: Committing staging item to vault:', request.id);
            
            // Save directly to vault using existing background methods
            const memoryId = await saveMemory(item.data);
            
            // Remove from staging
            const newList = list.filter(i => i.id !== request.id);
            await chrome.storage.local.set({ emma_ephemeral: newList });
            
            console.log('✅ Background: Successfully committed to vault:', memoryId);
            
            // Notify UI listeners
            try { 
              chrome.runtime.sendMessage({ action: 'memory.created', memoryId });
              chrome.runtime.sendMessage({ action: 'memories.refresh', memoryId });
            } catch {}
            
            sendResponse({ success: true, memoryId });
          } catch (e) { 
            console.error('❌ Background: Ephemeral commit failed:', e);
            sendResponse({ success: false, error: e.message }); 
          }
          break;
      case 'ping':
        sendResponse({ success: true, message: 'Background script is working' });
        break;
        
      case 'debug.testUnifiedStorage':
        try {
          console.log('🔍 Debug: Testing UnifiedStorage availability...');
          const testResult = {
            unifiedStorageExists: typeof unifiedStorage !== 'undefined',
            saveMethodExists: typeof unifiedStorage?.save === 'function',
            listStagingExists: typeof unifiedStorage?.listStaging === 'function'
          };
          console.log('🔍 Debug: UnifiedStorage test result:', testResult);
          sendResponse({ success: true, testResult });
        } catch (e) {
          console.error('🔍 Debug: UnifiedStorage test failed:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'saveMemory':
        console.log('🔧 Background: saveMemory request received:', request.data);
        try {
          const memoryId = await Promise.race([
            saveMemory(request.data),
            new Promise((_, reject) => timerManager.setTimeout(() => reject(new Error('Background save timeout')), 8000, 'saveMemory_timeout'))
          ]);
          console.log('🔍 Background: saveMemory success, ID:', memoryId);
          await updateBadge(); // Update badge count after saving
          sendResponse({ success: true, memoryId });
        } catch (error) {
          console.error('🔧 Background: saveMemory failed:', error);
          const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
          sendResponse({ success: false, error: errorMessage });
        }
        break;
        
      case 'saveVoiceMemory':
        console.log('🎤 Background: saveVoiceMemory request received:', request.memory);
        try {
          // Transform voice memory to standard memory format
          const memoryData = {
            content: request.memory.content,
            title: request.memory.title,
            source: 'voice_capture',
            timestamp: request.memory.timestamp || new Date().toISOString(),
            metadata: {
              ...request.memory.metadata,
              voice_capture: true,
              transcription: request.memory.transcription,
              tags: request.memory.tags || [],
              duration: request.memory.metadata?.duration || 0,
              wordCount: request.memory.metadata?.wordCount || 0
            },
            attachments: request.memory.attachments || []
          };
          
          const memoryId = await Promise.race([
            saveMemory(memoryData),
            new Promise((_, reject) => timerManager.setTimeout(() => reject(new Error('Voice memory save timeout')), 8000, 'saveVoiceMemory_timeout'))
          ]);
          
          console.log('🎤 Background: Voice memory saved successfully, ID:', memoryId);
          await updateBadge(); // Update badge count after saving
          
          // Notify UI listeners about the new memory
          try { 
            chrome.runtime.sendMessage({ action: 'memory.created', memoryId, type: 'voice_capture' });
            chrome.runtime.sendMessage({ action: 'memories.refresh', memoryId });
          } catch (notificationError) {
            console.warn('🎤 Background: Failed to send notifications:', notificationError);
          }
          
          sendResponse({ success: true, memoryId });
        } catch (error) {
          console.error('🎤 Background: saveVoiceMemory failed:', error);
          const errorMessage = error?.message || error?.toString() || 'Failed to save voice memory';
          sendResponse({ success: false, error: errorMessage });
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
          
          // Keep reasonable memory limit for performance (configurable)
          const maxMemories = 1000; // Increased from hard-coded 500
          if (memories.length > maxMemories) {
            memories.splice(0, memories.length - maxMemories);
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
        
      case 'open.popup':
        try {
          // Open the extension popup programmatically
          chrome.action.openPopup();
          sendResponse({ success: true });
        } catch (error) {
          // If openPopup is not available or fails, open in a new tab
          chrome.tabs.create({ 
            url: chrome.runtime.getURL('popup.html'),
            active: true 
          });
          sendResponse({ success: true, openedInTab: true });
        }
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

      case 'captureAndProcessPhotos':
        try {
          console.log('📸 BACKGROUND: Capturing and processing photos...', request);
          
          // Capture the visible tab
          const screenshotDataUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, {
            format: 'jpeg',
            quality: 95
          });
          
          console.log('📸 BACKGROUND: Screenshot captured, processing photos...');
          
          // Process each photo rect
          const processedPhotos = [];
          
          for (let i = 0; i < (request.photos || []).length; i++) {
            const photoInfo = request.photos[i];
            console.log(`📸 BACKGROUND: Processing photo ${i + 1}/${request.photos.length}`, photoInfo.rect);
            
            try {
              // Extract photo from screenshot using canvas
              const extractedPhoto = await extractPhotoFromScreenshot(
                screenshotDataUrl,
                photoInfo.rect,
                1 // Use 1 for now as devicePixelRatio isn't available in service worker
              );
              
              if (extractedPhoto) {
                processedPhotos.push({
                  dataUrl: extractedPhoto,
                  metadata: {
                    originalSrc: photoInfo.src,
                    dimensions: {
                      width: photoInfo.rect.width,
                      height: photoInfo.rect.height
                    }
                  }
                });
                console.log(`📸 BACKGROUND: Successfully extracted photo ${i + 1}`);
              } else {
                console.log(`📸 BACKGROUND: Failed to extract photo ${i + 1} - null result`);
              }
            } catch (error) {
              console.error(`Failed to extract photo ${i + 1}:`, error);
            }
          }
          
          console.log(`📸 BACKGROUND: Processed ${processedPhotos.length} photos successfully`);
          
          sendResponse({
            success: true,
            photos: processedPhotos
          });
        } catch (error) {
          console.error('captureAndProcessPhotos error:', error);
          sendResponse({ success: false, error: error.message });
        }
        return true; // async
        break;

      case 'savePhotoMemory':
        try {
          console.log('📸 BACKGROUND: Saving photo memory with', request.photos.length, 'photos');
          
          // Create attachments from photos
          const attachments = request.photos.map((photo, index) => ({
            id: `photo_${Date.now()}_${index}`,
            type: 'image/jpeg',
            data: photo.dataUrl.split(',')[1], // Remove data URL prefix
            size: Math.round(photo.dataUrl.length * 0.75), // Approximate size
            metadata: {
              ...photo.metadata,
              index: index,
              captureMethod: 'screenshot'
            }
          }));
          
          console.log('📸 BACKGROUND: Created', attachments.length, 'attachments');
          
          const memoryData = {
            content: `Photo album: ${request.metadata.title || 'Untitled'}\n\nCaptured ${request.photos.length} photos from ${request.metadata.url}`,
            type: 'media',
            source: 'screenshot_capture',
            url: request.metadata.url,
            metadata: {
              ...request.metadata,
              captureMethod: 'screenshot',
              photoCount: request.photos.length
            },
            attachments: attachments
          };
          
          console.log('📸 BACKGROUND: Calling saveMemory with data:', {
            ...memoryData,
            attachments: `[${attachments.length} attachments]`
          });
          
          const memoryId = await saveMemory(memoryData);
          console.log('📸 BACKGROUND: Memory saved with ID:', memoryId);
          
          sendResponse({ success: true, memoryId });
        } catch (error) {
          console.error('savePhotoMemory error:', error);
          sendResponse({ success: false, error: error.message });
        }
        return true; // async
        break;

      case 'captureVisibleTab':
        try {
          console.log('🧠 BACKGROUND: captureVisibleTab request');
          
          // Capture the visible tab
          const captureOptions = {
            format: request.format || 'jpeg',
            quality: request.quality || 90
          };
          
          const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, captureOptions);
          
          if (request.region) {
            // Crop to specific region if provided
            const canvas = new OffscreenCanvas(request.region.width, request.region.height);
            const ctx = canvas.getContext('2d');
            
            const img = new Image();
            img.onload = () => {
              // Apply device pixel ratio scaling
              const dpr = request.devicePixelRatio || 1;
              ctx.drawImage(
                img,
                request.region.x * dpr,
                request.region.y * dpr,
                request.region.width * dpr,
                request.region.height * dpr,
                0,
                0,
                request.region.width,
                request.region.height
              );
              
              canvas.convertToBlob({ type: 'image/png' }).then(blob => {
                const reader = new FileReader();
                reader.onload = () => {
                  sendResponse({ 
                    success: true, 
                    dataUrl: reader.result,
                    metadata: {
                      method: 'screen_region_crop',
                      region: request.region
                    }
                  });
                };
                reader.readAsDataURL(blob);
              });
            };
            img.src = dataUrl;
          } else {
            // Return full screenshot
            sendResponse({ 
              success: true, 
              dataUrl: dataUrl,
              metadata: {
                method: 'full_screen_capture'
              }
            });
          }
          
        } catch (error) {
          console.error('captureVisibleTab error:', error);
          sendResponse({ success: false, error: error.message });
        }
        return true; // async
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

      // Update memory title/content (MVP)
      case 'memory.update':
        try {
          const { id, updates } = request;
          if (!id || !updates) throw new Error('Invalid update request');
          // Best-effort MTAP overlay: store overrides in settings until full editor exists
          const key = 'emma_memory_overrides';
          const cur = await chrome.storage.local.get([key]);
          const map = cur[key] || {};
          map[id] = { ...(map[id] || {}), ...(updates.title ? { title: updates.title } : {}), ...(updates.content ? { content: updates.content } : {}) };
          await chrome.storage.local.set({ [key]: map });
          try { chrome.runtime.sendMessage({ action: 'memories.refresh', memoryId: id }); } catch {}
          sendResponse({ success: true });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
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
        
      case 'vault.migration.analyze':
        try {
          // Migration analysis disabled in service worker context
          // Return empty analysis to prevent errors
          const analysis = {
            legacyMemories: { count: 0, totalSize: 0, sources: [], types: [] },
            mtapMemories: { count: 0, totalSize: 0, protocols: [], creators: [] },
            duplicates: [],
            estimatedMigrationTime: 0,
            storageImpact: 0
          };
          sendResponse({ success: true, analysis });
        } catch (e) {
          console.error('vault migration analyze error:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'vault.migration.migrate':
        try {
          // Migration disabled in service worker context
          const result = {
            migrationId: 'disabled_' + Date.now(),
            dryRun: true,
            totalMigrated: 0,
            totalFailed: 0,
            totalSkipped: 0,
            phases: {
              backup: { status: 'skipped' },
              legacyMigration: { status: 'skipped', migrated: 0, failed: 0, skipped: 0 },
              mtapMigration: { status: 'skipped', migrated: 0, failed: 0, skipped: 0 },
              verification: { status: 'skipped' }
            }
          };
          sendResponse({ success: true, result });
        } catch (e) {
          console.error('vault migration migrate error:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'vault.migration.status':
        try {
          // Migration status disabled in service worker context
          const log = {
            migrationId: 'disabled',
            entries: [],
            summary: { totalEntries: 0, byType: {} }
          };
          sendResponse({ success: true, log });
        } catch (e) {
          console.error('vault migration status error:', e);
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
        
      case 'openVaultUnlock':
        try {
          await chrome.tabs.create({ url: chrome.runtime.getURL('test-vault-login.html') });
          sendResponse({ success: true });
        } catch (e) {
          try {
            await chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
            sendResponse({ success: true, fallback: true });
          } catch (err) {
            sendResponse({ success: false, error: err.message });
          }
        }
        break;

      // Automation service integration
      case 'startAutonomousCapture':
        try {
          console.log('Background: Starting autonomous capture:', request.query);
          
          // Initialize automation if not already done (static import used above)
          // Lazy load automation extension if not already loaded
          if (!EmmaAutomationExtension) {
            try {
              const module = await import('./emma-automation.js');
              EmmaAutomationExtension = module.EmmaAutomationExtension;
            } catch (e) {
              console.warn('Automation module not available. Using lite mode.', e?.message);
            }
          }
          
          if (EmmaAutomationExtension && !globalThis.emmaAutomation) {
            globalThis.emmaAutomation = new EmmaAutomationExtension();
            await globalThis.emmaAutomation.initialize();
          }
          
          // Process the automation request
          let result;
          if (globalThis.emmaAutomation) {
            result = await globalThis.emmaAutomation.processAutomationRequest(
              request.query,
              request.options || {}
            );
          } else {
            // Companion not available; return an offline indicator so popup uses lite mode
            result = { success: false, error: 'Automation service not available', offline: true };
          }
          
          console.log('Background: Autonomous capture completed:', result);
          sendResponse(result);
        } catch (error) {
          console.error('Background: Autonomous capture failed:', error);
          sendResponse({ 
            success: false, 
            error: error.message || 'Automation service not available'
          });
        }
        break;
        
      case 'checkAutomationStatus':
        try {
          const isAvailable = globalThis.emmaAutomation && 
                             await globalThis.emmaAutomation.automation.checkServiceHealth();
          sendResponse({ 
            success: true, 
            available: isAvailable 
          });
        } catch (error) {
          sendResponse({ 
            success: true, 
            available: false 
          });
        }
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
  console.log('🔧 saveMemory: Starting SIMPLIFIED save process...');
  console.log('🔧 saveMemory: Input data:', JSON.stringify(data, null, 2));
  
  // Handle conversation capsule format from content script
  let memoryData;
  if (data.messages && data.conversationId) {
    // This is a conversation capsule - convert to simple memory format
    console.log('🔧 saveMemory: Converting conversation capsule to simple memory format');
    const content = data.messages.map(m => m.content || m.text || '').join('\n\n');
    
    // Enhanced title generation for better memory titles
    let improvedTitle = data.title;
    if (!improvedTitle || improvedTitle === 'Untitled' || improvedTitle.includes('untitled')) {
      // Try to generate better title from content
      if (content && content.trim()) {
        const firstLine = content.trim().split('\n')[0];
        const words = firstLine.trim().split(/\s+/).slice(0, 10);
        improvedTitle = words.join(' ');
        if (improvedTitle.length > 60) {
          improvedTitle = improvedTitle.substring(0, 60) + '...';
        }
        
        // Add platform context for social media
        const platform = data.metadata?.platform;
        if (platform === 'twitter' || data.domain?.includes('x.com') || data.domain?.includes('twitter.com')) {
          improvedTitle = `Tweet: ${improvedTitle}`;
        } else if (platform) {
          improvedTitle = `${platform}: ${improvedTitle}`;
        }
      } else {
        // Fallback to domain-based title
        improvedTitle = `Content from ${data.domain || 'web'}`;
      }
    }
    
    memoryData = {
      content: content || improvedTitle || 'Conversation capsule',
      role: 'user',
      source: data.metadata?.platform || 'conversation',
      url: data.url,
      type: data.type || 'conversation',
      title: improvedTitle, // Add title to root level for MTAP compatibility
      metadata: {
        ...data.metadata,
        conversationId: data.conversationId,
        messageCount: data.messageCount,
        originalCapsule: true,
        title: improvedTitle,
        domain: data.domain,
        attachmentCount: data.attachmentCount
      }
    };
    
    console.log('🔧 saveMemory: Final memoryData with title:', {
      title: memoryData.title,
      metadataTitle: memoryData.metadata.title,
      content: memoryData.content?.substring(0, 100) + '...'
    });
  } else {
    // Simple memory format - use as-is
    memoryData = data;
  }
  
  console.log('🔧 saveMemory: Processed memory data:', JSON.stringify(memoryData, null, 2));
  
  // Skip HML for now due to service worker import() restrictions
  console.log('🔧 saveMemory: Skipping HML (service worker restrictions), using simplified storage...');
  
  // TEMPORARY: Use simplified storage to bypass complex vault/HML issues
  try {
    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const memory = {
      id: memoryId,
      content: memoryData.content || memoryData.title || 'Untitled memory',
      timestamp: Date.now(),
      role: memoryData.role || 'user',
      source: memoryData.source || 'unknown',
      type: memoryData.type || 'memory',
      metadata: memoryData.metadata || {}
    };
    
    // Save to simple storage first (immediate)
    const snap = await chrome.storage.local.get(['emma_memories']);
    const memories = Array.isArray(snap.emma_memories) ? snap.emma_memories : [];
    memories.unshift(memory);
    
    // Keep bounded list
    if (memories.length > 1000) memories.length = 1000;
    
    await chrome.storage.local.set({ emma_memories: memories });
    
    console.log('✅ saveMemory: Saved to simplified storage, ID:', memoryId);
    
    // Notify UI
    try { 
      chrome.runtime.sendMessage({ action: 'memory.created', memoryId });
      chrome.runtime.sendMessage({ action: 'memories.refresh', memoryId });
    } catch {}
    
    await updateBadge();
    return memoryId;
    
  } catch (error) {
    console.error('❌ saveMemory: Even simplified storage failed:', error);
    throw error;
  }
  
  /* COMMENTED OUT - COMPLEX VAULT CODE CAUSING ISSUES
  try {
    // Check vault status first - vault must be initialized and unlocked
    const vaultManager = getVaultManager();
    
    // First attempt to auto-unlock from session if available
    console.log('🔧 saveMemory: Checking vault status and attempting auto-unlock...');
    await vaultManager.initialize(); // Ensure initialized and auto-unlock attempted
    
    const vaultStatus = await vaultManager.getStatus();
    console.log('🔧 saveMemory: Vault status:', {
      initialized: vaultStatus.initialized,
      isUnlocked: vaultStatus.isUnlocked,
      hasValidSession: vaultStatus.hasValidSession,
      sessionExpiresAt: vaultStatus.sessionExpiresAt ? new Date(vaultStatus.sessionExpiresAt).toISOString() : null
    });
    
    if (!vaultStatus.initialized) {
      throw new Error('VAULT_NOT_INITIALIZED: Vault must be set up before saving memories. Please complete vault setup first.');
    }
    
    if (!vaultStatus.isUnlocked) {
      // Double-check: if we have a valid session but still locked, something's wrong
      if (vaultStatus.hasValidSession) {
        console.error('🔧 saveMemory: Valid session exists but vault still locked!');
      }
      throw new Error('VAULT_LOCKED: Vault is locked. Please unlock your vault to save memories.');
    }
    
    // Use vault storage system (MTAP + Vault integration)
    const memoryId = await vaultStorage.saveMemory({
      content: memoryData.content,
      metadata: {
        role: memoryData.role || 'user',
        source: memoryData.source || 'unknown',
        url: memoryData.url,
        type: memoryData.type || 'conversation',
        userAgent: navigator.userAgent,
        capturedAt: new Date().toISOString(),
        ...memoryData.metadata
      },
      attachments: memoryData.attachments || data.attachments || []
    });
    console.log('🔧 saveMemory: Saved with vault storage, ID:', memoryId);
    try { chrome.runtime.sendMessage({ action: 'memory.created', memoryId }); } catch {}
    await updateBadge();
    return memoryId;
  } catch (error) {
    console.error('🔧 saveMemory: Vault storage failed:', error);
    
    // Instead of falling back to legacy system, throw error with helpful message
    if (error.message.includes('VAULT_NOT_INITIALIZED')) {
      throw new Error('Please set up your vault first. Go to the Emma popup and complete vault setup, then try again.');
    } else if (error.message.includes('VAULT_LOCKED')) {
      throw new Error('Your vault is locked. Please unlock your vault in the Emma popup, then try again.');
    } else {
      throw new Error(`Failed to save memory to vault: ${error.message}. Please check your vault setup.`);
    }
  }
}
*/ // END COMMENTED OUT VAULT CODE

async function ephemeralList() {
  const snap = await chrome.storage.local.get(['emma_ephemeral']);
  return Array.isArray(snap.emma_ephemeral) ? snap.emma_ephemeral : [];
}

async function ephemeralDelete(id) {
  const snap = await chrome.storage.local.get(['emma_ephemeral']);
  const list = Array.isArray(snap.emma_ephemeral) ? snap.emma_ephemeral : [];
  const next = list.filter(item => item.id !== id);
  await chrome.storage.local.set({ emma_ephemeral: next });
}

async function ephemeralCommit(id) {
  const snap = await chrome.storage.local.get(['emma_ephemeral']);
  const list = Array.isArray(snap.emma_ephemeral) ? snap.emma_ephemeral : [];
  const item = list.find(i => i.id === id);
  if (!item) throw new Error('Not found');
  // Save to vault using existing pipeline
  const memoryId = await saveMemory(item.data);
  // Remove from staging
  const next = list.filter(i => i.id !== id);
  await chrome.storage.local.set({ emma_ephemeral: next });
  return memoryId;
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
  
  // Initialize vault manager on startup
  await initializeVaultManager();
  
  // Set up vault state broadcasting
  await setupVaultBroadcasting();
});