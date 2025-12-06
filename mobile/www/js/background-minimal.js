// Minimal working background script to restore staging functionality
console.log('🚀 Emma Background: Starting minimal background script...');

// Import unifiedStorage for staging
import { unifiedStorage } from '../lib/unified-storage.js';

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🔍 Background: Message received:', request.action);
  handleMessage(request, sender, sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(request, sender, sendResponse) {
  console.log('🔍 Background: handleMessage called with action:', request.action);
  try {
    switch (request.action) {
      case 'ping':
        sendResponse({ success: true, message: 'Background script is working' });
        break;
        
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
        } catch (e) { 
          sendResponse({ success: false, error: e.message }); 
        }
        break;
        
      case 'ephemeral.delete':
        try { 
          await unifiedStorage.deleteFromStaging(request.id); 
          sendResponse({ success: true }); 
        } catch (e) { 
          sendResponse({ success: false, error: e.message }); 
        }
        break;
        
      case 'ephemeral.commit':
        try {
          console.log('🎯 Background: COMMIT HANDLER ENTERED for ID:', request.id);
          
          // Get the staging item
          const snap = await chrome.storage.local.get(['emma_ephemeral']);
          const list = Array.isArray(snap.emma_ephemeral) ? snap.emma_ephemeral : [];
          console.log(`📋 Background: Found ${list.length} staging items total`);
          
          const item = list.find(i => i.id === request.id);
          console.log('🔍 Background: Searching for item:', request.id);
          console.log('🔍 Background: Available IDs:', list.map(i => i.id));
          
          if (!item) {
            console.error('❌ Background: Staging item not found!');
            console.error('❌ Background: Requested ID:', request.id);
            console.error('❌ Background: Available items:', list.map(i => ({ id: i.id, content: i.data?.content?.substring(0, 50) })));
            throw new Error('Staging item not found');
          }
          
          console.log('✅ Background: Found staging item successfully');
          
          console.log('🚀 Background: Committing staging item to simple storage:', request.id);
          console.log('🔍 Background: Staging item data:', {
            hasAttachments: !!item.data.attachments,
            attachmentCount: item.data.attachments?.length || 0,
            attachments: item.data.attachments,
            allKeys: Object.keys(item.data)
          });
          
          // Save to simple storage, preserving all data including attachments
          const memoryId = `mem_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
          const memory = {
            // Start with all original data
            ...item.data,
            // Override with required fields
            id: memoryId,
            timestamp: Date.now(),
            content: item.data.content || item.data.title || 'Untitled memory',
            role: item.data.role || 'user',
            source: item.data.source || 'unknown',
            type: item.data.type || 'memory',
            metadata: item.data.metadata || {},
            attachments: item.data.attachments || []  // Ensure attachments are preserved
          };
          
          console.log(`📎 Background: Memory created with ${memory.attachments.length} attachments`);
          console.log('🔍 Background: Final memory attachments:', memory.attachments);
          
          // Save to emma_memories
          const memoriesSnap = await chrome.storage.local.get(['emma_memories']);
          const memories = Array.isArray(memoriesSnap.emma_memories) ? memoriesSnap.emma_memories : [];
          memories.unshift(memory);
          
          // Keep bounded list
          if (memories.length > 1000) memories.length = 1000;
          
          await chrome.storage.local.set({ emma_memories: memories });
          
          // Remove from staging
          const newList = list.filter(i => i.id !== request.id);
          await chrome.storage.local.set({ emma_ephemeral: newList });
          
          console.log('✅ Background: Successfully committed to memories:', memoryId);
          
          // Update badge after addition
          updateBadgeCount(memories.length);
          
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
        
      case 'getAllMemories':
        try {
          const snap = await chrome.storage.local.get(['emma_memories']);
          const memories = Array.isArray(snap.emma_memories) ? snap.emma_memories : [];
          
          // Apply pagination
          const limit = request.limit || 50;
          const offset = request.offset || 0;
          const paginatedMemories = memories.slice(offset, offset + limit);
          
          sendResponse({ success: true, memories: paginatedMemories });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'vault.getStatus':
        try {
          // Check if vault data exists (backward compatibility)
          const vaultCheck = await chrome.storage.local.get([
            'emma_vault_initialized', 
            'emma_vault_settings',
            'vaultKey',
            'emma_vault_keyring'
          ]);
          
          const hasVaultData = !!(
            vaultCheck.emma_vault_initialized || 
            vaultCheck.emma_vault_settings || 
            vaultCheck.vaultKey ||
            vaultCheck.emma_vault_keyring
          );
          
          console.log('🔐 Background: Vault status check:', {
            hasVaultData,
            keys: Object.keys(vaultCheck)
          });
          
          if (hasVaultData) {
            // Vault exists but we're in minimal mode - treat as locked
            sendResponse({ 
              success: true, 
              initialized: true, 
              isUnlocked: false, 
              hasValidSession: false,
              message: 'Vault detected but in simplified mode (memories will be stored unencrypted)'
            });
          } else {
            // No vault data found
            sendResponse({ 
              success: true, 
              initialized: false, 
              isUnlocked: false, 
              hasValidSession: false,
              message: 'No vault found - using simplified storage'
            });
          }
        } catch (e) {
          console.error('❌ Background: Vault status check failed:', e);
          sendResponse({ 
            success: false, 
            error: e.message,
            initialized: false, 
            isUnlocked: false
          });
        }
        break;
        
      case 'searchMemories':
        try {
          const { query, limit = 50 } = request;
          
          // Input validation
          if (!query || typeof query !== 'string') {
            throw new Error('Invalid search query: must be non-empty string');
          }
          
          if (query.length > 1000) {
            throw new Error('Search query too long: maximum 1000 characters');
          }
          
          console.log(`🔍 Background: Searching memories for: "${query}"`);
          const startTime = performance.now();
          
          // Get all memories
          const snap = await chrome.storage.local.get(['emma_memories']);
          const memories = Array.isArray(snap.emma_memories) ? snap.emma_memories : [];
          
          // Perform case-insensitive search
          const queryLower = query.toLowerCase().trim();
          const results = memories.filter(memory => {
            if (!memory || typeof memory !== 'object') return false;
            
            const searchableText = [
              memory.content || '',
              memory.metadata?.title || '',
              memory.metadata?.platform || '',
              memory.source || ''
            ].join(' ').toLowerCase();
            
            return searchableText.includes(queryLower);
          }).slice(0, limit); // Apply limit
          
          const duration = performance.now() - startTime;
          console.log(`✅ Background: Search completed in ${duration.toFixed(2)}ms, found ${results.length} results`);
          
          sendResponse({ 
            success: true, 
            memories: results,
            query,
            totalResults: results.length,
            searchTime: Math.round(duration)
          });
        } catch (e) {
          console.error('❌ Background: Search failed:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'deleteMemory':
        try {
          const { memoryId } = request;
          
          // Input validation
          if (!memoryId || typeof memoryId !== 'string') {
            throw new Error('Invalid memory ID: must be non-empty string');
          }
          
          console.log(`🗑️ Background: Deleting memory: ${memoryId}`);
          
          // Get current memories
          const snap = await chrome.storage.local.get(['emma_memories']);
          const memories = Array.isArray(snap.emma_memories) ? snap.emma_memories : [];
          
          // Find memory to delete
          const memoryIndex = memories.findIndex(m => m && m.id === memoryId);
          if (memoryIndex === -1) {
            throw new Error(`Memory not found: ${memoryId}`);
          }
          
          // Store backup for potential rollback
          const deletedMemory = memories[memoryIndex];
          
          // Remove memory (atomic operation)
          const updatedMemories = [...memories];
          updatedMemories.splice(memoryIndex, 1);
          
          // Save updated list
          await chrome.storage.local.set({ emma_memories: updatedMemories });
          
          console.log(`✅ Background: Memory deleted successfully: ${memoryId}`);
          
          // Update badge after deletion
          updateBadgeCount(updatedMemories.length);
          
          // Notify UI
          try {
            chrome.runtime.sendMessage({ 
              action: 'memory.deleted', 
              memoryId,
              remainingCount: updatedMemories.length 
            });
          } catch {} // Silent fail for UI notification
          
          sendResponse({ 
            success: true, 
            memoryId,
            remainingCount: updatedMemories.length,
            deletedMemory: {
              id: deletedMemory.id,
              content: deletedMemory.content?.substring(0, 100) + '...'
            }
          });
        } catch (e) {
          console.error('❌ Background: Delete memory failed:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'getSettings':
        try {
          console.log('⚙️ Background: Getting settings');
          
          const snap = await chrome.storage.local.get(['emma_settings']);
          const settings = snap.emma_settings || {};
          
          // Apply default values for missing settings
          const defaultSettings = {
            theme: 'auto',
            autoCapture: true,
            stagingRetentionDays: 7,
            enableNotifications: true,
            maxMemories: 1000
          };
          
          const mergedSettings = { ...defaultSettings, ...settings };
          
          console.log('✅ Background: Settings retrieved');
          sendResponse({ success: true, settings: mergedSettings });
        } catch (e) {
          console.error('❌ Background: Get settings failed:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'setSetting':
        try {
          const { key, value } = request;
          
          // Input validation
          if (!key || typeof key !== 'string') {
            throw new Error('Invalid setting key: must be non-empty string');
          }
          
          // Validate specific settings
          const validSettings = {
            theme: ['auto', 'light', 'dark'],
            autoCapture: 'boolean',
            stagingRetentionDays: 'number',
            enableNotifications: 'boolean',
            maxMemories: 'number'
          };
          
          if (!validSettings.hasOwnProperty(key)) {
            throw new Error(`Unknown setting: ${key}`);
          }
          
          const expectedType = validSettings[key];
          if (Array.isArray(expectedType)) {
            if (!expectedType.includes(value)) {
              throw new Error(`Invalid value for ${key}: must be one of ${expectedType.join(', ')}`);
            }
          } else if (typeof value !== expectedType) {
            throw new Error(`Invalid value type for ${key}: expected ${expectedType}`);
          }
          
          // Additional validation for numeric settings
          if (key === 'stagingRetentionDays' && (value < 1 || value > 30)) {
            throw new Error('stagingRetentionDays must be between 1 and 30');
          }
          
          if (key === 'maxMemories' && (value < 100 || value > 10000)) {
            throw new Error('maxMemories must be between 100 and 10000');
          }
          
          console.log(`⚙️ Background: Setting ${key} = ${value}`);
          
          // Get current settings
          const snap = await chrome.storage.local.get(['emma_settings']);
          const settings = snap.emma_settings || {};
          
          // Update setting
          settings[key] = value;
          
          // Save updated settings
          await chrome.storage.local.set({ emma_settings: settings });
          
          console.log(`✅ Background: Setting saved: ${key}`);
          
          // Notify UI of setting change
          try {
            chrome.runtime.sendMessage({ 
              action: 'setting.changed', 
              key, 
              value 
            });
          } catch {} // Silent fail for UI notification
          
          sendResponse({ success: true, key, value });
        } catch (e) {
          console.error('❌ Background: Set setting failed:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      // Media capture functionality
      case 'captureVisibleTab':
        try {
          const { format = 'png', quality = 95 } = request;
          
          console.log('📸 Background: Capturing visible tab');
          
          // Capture the visible area of the currently active tab
          const dataUrl = await chrome.tabs.captureVisibleTab(null, {
            format: format,
            quality: format === 'jpeg' ? quality : undefined
          });
          
          if (!dataUrl) {
            throw new Error('Failed to capture screenshot');
          }
          
          console.log('✅ Background: Screenshot captured successfully');
          
          sendResponse({ 
            success: true, 
            dataUrl,
            format,
            timestamp: Date.now()
          });
        } catch (e) {
          console.error('❌ Background: Screenshot capture failed:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'media.captureElement':
        try {
          const { rect, dpr = 1, pageUrl, elementSelector } = request;
          
          if (!rect || typeof rect !== 'object') {
            throw new Error('Invalid rect parameter for element capture');
          }
          
          console.log('📸 Background: Capturing element screenshot');
          
          // Capture full page first
          const fullScreenshot = await chrome.tabs.captureVisibleTab(null, {
            format: 'png'
          });
          
          if (!fullScreenshot) {
            throw new Error('Failed to capture full screenshot');
          }
          
          // Process the screenshot to extract the element area
          const processedImage = await processElementCapture(fullScreenshot, rect, dpr);
          
          // Save to staging automatically
          const stagingId = await unifiedStorage.save({
            content: `Element captured from ${pageUrl || 'page'}`,
            type: 'media',
            source: 'element-capture',
            metadata: {
              url: pageUrl || '',
              elementSelector: elementSelector || '',
              captureMethod: 'element',
              rect: rect
            }
          }, 'staging');
          
          console.log('✅ Background: Element capture completed, saved to staging:', stagingId);
          
          sendResponse({ 
            success: true, 
            dataUrl: processedImage,
            stagingId,
            rect
          });
        } catch (e) {
          console.error('❌ Background: Element capture failed:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'media.importFromUrl':
        try {
          const { url, pageUrl, mediaType = 'image', capsuleId } = request;
          
          if (!url || typeof url !== 'string') {
            throw new Error('Invalid URL for media import');
          }
          
          console.log(`📥 Background: Importing media from URL: ${url.substring(0, 100)}...`);
          
          // Simple media import (for now, just save the URL)
          const memory = {
            content: `Media imported: ${url}`,
            type: 'media',
            source: 'url-import',
            metadata: {
              originalUrl: url,
              pageUrl: pageUrl || '',
              mediaType: mediaType,
              importMethod: 'url'
            }
          };
          
          let memoryId;
          if (capsuleId) {
            // Add to existing collection in staging
            console.log('🔄 Background: Adding to existing collection:', capsuleId);
            
            // Create attachment record
            const attachment = {
              id: `att_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
              url: url,
              type: mediaType || 'image',
              alt: '',
              width: 0,
              height: 0,
              timestamp: Date.now(),
              source: 'url-import'
            };
            
            // Add to staging collection
            const snap = await chrome.storage.local.get(['emma_ephemeral']);
            const list = Array.isArray(snap.emma_ephemeral) ? snap.emma_ephemeral : [];
            const item = list.find(i => i.id === capsuleId);
            
            if (item) {
              if (!item.data.attachments) item.data.attachments = [];
              item.data.attachments.push(attachment);
              
              // Update collection content to reflect count
              const count = item.data.attachments.length;
              item.data.content = `Media collection from ${item.data.metadata?.title || 'page'} - ${count} item${count !== 1 ? 's' : ''}`;
              
              await chrome.storage.local.set({ emma_ephemeral: list });
              console.log(`✅ Added media to collection. Total: ${count} items`);
              
              sendResponse({ 
                success: true, 
                attachmentId: attachment.id,
                totalItems: count,
                method: 'collection'
              });
              return;
            } else {
              throw new Error('Collection not found in staging');
            }
          } else {
            // Save to staging
            memoryId = await unifiedStorage.save(memory, 'staging');
          }
          
          console.log('✅ Background: Media import completed:', memoryId);
          
          sendResponse({ 
            success: true, 
            memoryId,
            url,
            method: 'staged'
          });
        } catch (e) {
          console.error('❌ Background: Media import failed:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'media.batchImport':
        try {
          const { pageUrl, capsuleId, mediaSelector, elements, qualityThreshold = 0.3, maxElements = 50 } = request;
          
          console.log('📥 Background: Batch import request:', {
            pageUrl,
            capsuleId,
            elementsProvided: !!elements,
            elementsLength: elements?.length,
            elementTypes: Array.isArray(elements) ? elements.map(e => e.type).slice(0,5) : 'not array'
          });
          
          if (!elements || !Array.isArray(elements)) {
            throw new Error(`Invalid elements array for batch import. Got: ${typeof elements}, isArray: ${Array.isArray(elements)}`);
          }
          
          if (elements.length === 0) {
            throw new Error('No elements provided for batch import');
          }
          
          console.log(`📥 Background: Processing ${elements.length} media elements`);
          
          let processedCount = 0;
          let skippedCount = 0;
          let attachments = [];
          
          for (const element of elements.slice(0, maxElements)) {
            try {
              if (!element.url || !element.url.startsWith('http')) {
                console.log(`⏭️ Background: Skipping element - invalid URL: ${element.url}`);
                skippedCount++;
                continue;
              }
              
              // Create attachment record with proper URLs
              const attachment = {
                id: `att_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
                sourceUrl: element.url, // Primary URL for preview
                url: element.url, // Backup URL
                type: element.type || 'image',
                alt: element.alt || '',
                width: element.width || 0,
                height: element.height || 0,
                capsuleId: capsuleId || 'staging',
                timestamp: Date.now(),
                source: 'batch-import'
              };
              
              attachments.push(attachment);
              processedCount++;
              
              console.log(`✅ Background: Processed media ${processedCount}: ${element.url.slice(0,50)}...`);
              
            } catch (e) {
              console.warn('❌ Background: Failed to process media element:', e.message);
              skippedCount++;
            }
          }
          
          console.log(`📊 Background: Batch processing complete - processed: ${processedCount}, skipped: ${skippedCount}`);
          
          if (processedCount === 0) {
            throw new Error('No valid media elements could be processed');
          }
          
          // Always create a new staging collection for batch imports
          const memory = {
            content: `Media collection from ${pageUrl || 'page'} - ${attachments.length} items`,
            type: 'media-collection',
            source: 'batch-import',
            attachments: attachments,
            metadata: {
              url: pageUrl || '',
              title: document.title || 'Media Collection',
              totalElements: elements.length,
              processedElements: processedCount,
              skippedElements: skippedCount,
              importMethod: 'batch',
              created: Date.now()
            }
          };
          
          const memoryId = await unifiedStorage.save(memory, 'staging');
          console.log(`✅ Background: Created new batch import memory with ${attachments.length} attachments:`, memoryId);
          
          sendResponse({ 
            success: true, 
            processed: processedCount,
            count: processedCount, // For backward compatibility
            attachments: attachments.length,
            capsuleId: capsuleId || 'new'
          });
        } catch (e) {
          console.error('❌ Background: Batch media import failed:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'attachment.add':
        try {
          const { capsuleId, attachment } = request;
          
          if (!capsuleId || !attachment) {
            throw new Error('Missing capsuleId or attachment data');
          }
          
          console.log(`📎 Background: Adding attachment to capsule: ${capsuleId}`);
          
          // Add to staging or memory
          if (capsuleId.startsWith('e_')) {
            // Add to staging item
            const snap = await chrome.storage.local.get(['emma_ephemeral']);
            const list = Array.isArray(snap.emma_ephemeral) ? snap.emma_ephemeral : [];
            const item = list.find(i => i.id === capsuleId);
            
            if (item) {
              if (!item.data.attachments) item.data.attachments = [];
              item.data.attachments.push(attachment);
              await chrome.storage.local.set({ emma_ephemeral: list });
              console.log('✅ Attachment added to staging item');
            }
          } else {
            // Add to memory
            const snap = await chrome.storage.local.get(['emma_memories']);
            const memories = Array.isArray(snap.emma_memories) ? snap.emma_memories : [];
            const memory = memories.find(m => m.id === capsuleId);
            
            if (memory) {
              if (!memory.attachments) memory.attachments = [];
              memory.attachments.push(attachment);
              await chrome.storage.local.set({ emma_memories: memories });
              console.log('✅ Attachment added to memory');
            }
          }
          
          sendResponse({ success: true, attachmentId: attachment.id });
        } catch (e) {
          console.error('❌ Background: Add attachment failed:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'attachment.list':
        try {
          const { capsuleId } = request;
          
          if (!capsuleId) {
            throw new Error('Missing capsuleId for attachment list');
          }
          
          let attachments = [];
          
          if (capsuleId.startsWith('e_')) {
            // Get from staging
            const snap = await chrome.storage.local.get(['emma_ephemeral']);
            const list = Array.isArray(snap.emma_ephemeral) ? snap.emma_ephemeral : [];
            const item = list.find(i => i.id === capsuleId);
            if (item && item.data.attachments) {
              attachments = item.data.attachments;
            }
          } else {
            // Get from memory
            const snap = await chrome.storage.local.get(['emma_memories']);
            const memories = Array.isArray(snap.emma_memories) ? snap.emma_memories : [];
            const memory = memories.find(m => m.id === capsuleId);
            if (memory && memory.attachments) {
              attachments = memory.attachments;
            }
          }
          
          sendResponse({ success: true, attachments });
        } catch (e) {
          console.error('❌ Background: List attachments failed:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'attachment.get':
        try {
          const { id } = request;
          console.log('📎 Background: attachment.get request:', { id, hasId: !!id, idType: typeof id });
          
          if (!id) {
            throw new Error(`Missing attachment id. Request: ${JSON.stringify(request)}`);
          }
          
          console.log('📎 Background: Getting attachment data for:', id);
          
          // Find attachment in staging or memories
          let attachment = null;
          
          // Check staging first
          const stagingSnap = await chrome.storage.local.get(['emma_ephemeral']);
          const stagingList = Array.isArray(stagingSnap.emma_ephemeral) ? stagingSnap.emma_ephemeral : [];
          
          for (const item of stagingList) {
            if (item.data.attachments) {
              const found = item.data.attachments.find(att => att.id === id);
              if (found) {
                attachment = found;
                break;
              }
            }
          }
          
          // Check memories if not found in staging
          if (!attachment) {
            const memoriesSnap = await chrome.storage.local.get(['emma_memories']);
            const memories = Array.isArray(memoriesSnap.emma_memories) ? memoriesSnap.emma_memories : [];
            
            for (const memory of memories) {
              if (memory.attachments) {
                const found = memory.attachments.find(att => att.id === id);
                if (found) {
                  attachment = found;
                  break;
                }
              }
            }
          }
          
          if (!attachment) {
            throw new Error('Attachment not found');
          }
          
          // For media collections with URLs, return the source URL as dataUrl
          if (attachment.sourceUrl || attachment.url) {
            const sourceUrl = attachment.sourceUrl || attachment.url;
            console.log('📎 Background: Returning source URL for preview:', sourceUrl);
            
            sendResponse({ 
              success: true, 
              dataUrl: sourceUrl,
              attachment: attachment
            });
          } else {
            throw new Error('No data available for attachment');
          }
          
        } catch (e) {
          console.error('❌ Background: Get attachment failed:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      // Media collection system
      case 'collection.create':
        try {
          const { pageUrl, pageTitle } = request;
          console.log(`📂 Background: Creating collection for ${pageTitle || pageUrl}`);
          
          // Create new staging collection
          const collection = {
            content: `Media collection from ${pageTitle || pageUrl || 'page'}`,
            type: 'media-collection',
            source: 'collection',
            attachments: [],
            metadata: {
              url: pageUrl || '',
              title: pageTitle || '',
              created: Date.now(),
              collectionType: 'media'
            }
          };
          
          const memoryId = await unifiedStorage.save(collection, 'staging');
          console.log(`📂 Background: Created media collection with ID: ${memoryId}`);
          
          // Verify it was actually saved
          const verification = await chrome.storage.local.get(['emma_ephemeral']);
          const list = Array.isArray(verification.emma_ephemeral) ? verification.emma_ephemeral : [];
          const savedItem = list.find(i => i.id === memoryId);
          
          if (!savedItem) {
            throw new Error('Collection was not properly saved to staging');
          }
          
          console.log(`✅ Background: Collection verified in staging: ${memoryId}`);
          
          sendResponse({ 
            success: true, 
            collectionId: memoryId
          });
        } catch (e) {
          console.error('❌ Background: Collection creation failed:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'collection.addMedia':
        try {
          const { collectionId, url, pageUrl, mediaType, alt, width, height } = request;
          
          if (!collectionId || !url) {
            throw new Error('Missing collectionId or media URL');
          }
          
          console.log(`📎 Background: Adding media to collection: ${collectionId}, URL: ${url.substring(0, 50)}...`);
          
          // Get current staging items
          const snap = await chrome.storage.local.get(['emma_ephemeral']);
          const list = Array.isArray(snap.emma_ephemeral) ? snap.emma_ephemeral : [];
          console.log(`📦 Background: Found ${list.length} staging items`);
          
          const item = list.find(i => i.id === collectionId);
          
          if (!item) {
            console.error(`❌ Background: Collection ${collectionId} not found. Available IDs:`, list.map(i => i.id));
            console.error(`❌ Background: Available items:`, list.map(i => ({ id: i.id, source: i.data?.source, content: i.data?.content?.substring(0, 50) })));
            throw new Error(`Collection not found in staging. ID: ${collectionId}`);
          }
          
          console.log(`📂 Background: Found collection:`, item.data.content);
          
          // Create attachment record
          const attachment = {
            id: `att_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
            url: url,
            type: mediaType || 'image',
            alt: alt || '',
            width: width || 0,
            height: height || 0,
            timestamp: Date.now(),
            source: 'collection'
          };
          
          // Add to staging collection
          if (!item.data.attachments) item.data.attachments = [];
          item.data.attachments.push(attachment);
          
          // Update collection content to reflect count
          const count = item.data.attachments.length;
          item.data.content = `Media collection from ${item.data.metadata?.title || 'page'} - ${count} item${count !== 1 ? 's' : ''}`;
          
          await chrome.storage.local.set({ emma_ephemeral: list });
          console.log(`✅ Background: Added media to collection. Total: ${count} items`);
          
          sendResponse({ 
            success: true, 
            attachmentId: attachment.id,
            totalItems: count
          });
        } catch (e) {
          console.error('❌ Background: Add media to collection failed:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      // Data export/import functionality
      case 'exportData':
        try {
          const { format = 'json', includeSettings = true } = request;
          
          console.log('📤 Background: Exporting data');
          
          // Get all data
          const storageData = await chrome.storage.local.get([
            'emma_memories', 
            'emma_ephemeral',
            'emma_settings'
          ]);
          
          const exportData = {
            version: '2.0-minimal',
            timestamp: new Date().toISOString(),
            memories: storageData.emma_memories || [],
            staging: storageData.emma_ephemeral || [],
            settings: includeSettings ? storageData.emma_settings || {} : {},
            metadata: {
              totalMemories: (storageData.emma_memories || []).length,
              stagingItems: (storageData.emma_ephemeral || []).length,
              exportMethod: 'minimal-mode'
            }
          };
          
          let outputData;
          if (format === 'json') {
            outputData = JSON.stringify(exportData, null, 2);
          } else {
            throw new Error(`Unsupported export format: ${format}`);
          }
          
          console.log(`✅ Background: Data exported, ${exportData.metadata.totalMemories} memories`);
          
          sendResponse({ 
            success: true, 
            data: outputData,
            filename: `emma-export-${new Date().toISOString().split('T')[0]}.json`,
            format,
            metadata: exportData.metadata
          });
        } catch (e) {
          console.error('❌ Background: Data export failed:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'importData':
        try {
          const { data, mergeMode = false, validateOnly = false } = request;
          
          if (!data || typeof data !== 'string') {
            throw new Error('Invalid import data: must be JSON string');
          }
          
          console.log('📥 Background: Importing data');
          
          // Parse and validate import data
          let importData;
          try {
            importData = JSON.parse(data);
          } catch (e) {
            throw new Error('Invalid JSON format');
          }
          
          if (!importData.memories || !Array.isArray(importData.memories)) {
            throw new Error('Invalid import format: missing or invalid memories array');
          }
          
          if (validateOnly) {
            sendResponse({ 
              success: true, 
              valid: true,
              metadata: {
                memoriesCount: importData.memories.length,
                hasSettings: !!importData.settings,
                version: importData.version || 'unknown'
              }
            });
            return;
          }
          
          // Get current data
          const currentData = await chrome.storage.local.get(['emma_memories', 'emma_settings']);
          const currentMemories = currentData.emma_memories || [];
          
          let newMemories;
          if (mergeMode) {
            // Merge: avoid duplicates by ID
            const existingIds = new Set(currentMemories.map(m => m.id).filter(Boolean));
            const newItems = importData.memories.filter(m => m.id && !existingIds.has(m.id));
            newMemories = [...currentMemories, ...newItems];
            console.log(`📥 Merge mode: Added ${newItems.length} new memories`);
          } else {
            // Replace mode
            newMemories = importData.memories;
            console.log(`📥 Replace mode: Imported ${newMemories.length} memories`);
          }
          
          // Save imported data
          const updates = { emma_memories: newMemories };
          if (importData.settings && Object.keys(importData.settings).length > 0) {
            updates.emma_settings = { ...(currentData.emma_settings || {}), ...importData.settings };
          }
          
          await chrome.storage.local.set(updates);
          
          // Update badge
          updateBadgeCount(newMemories.length);
          
          console.log('✅ Background: Data import completed');
          
          // Notify UI
          try {
            chrome.runtime.sendMessage({ action: 'data.imported', count: newMemories.length });
          } catch {}
          
          sendResponse({ 
            success: true, 
            imported: {
              memories: newMemories.length,
              settings: importData.settings ? Object.keys(importData.settings).length : 0
            },
            mode: mergeMode ? 'merge' : 'replace'
          });
        } catch (e) {
          console.error('❌ Background: Data import failed:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      case 'getStats':
        try {
          console.log('📊 Background: Getting statistics');
          
          const storageData = await chrome.storage.local.get([
            'emma_memories', 
            'emma_ephemeral',
            'emma_settings'
          ]);
          
          const memories = storageData.emma_memories || [];
          const staging = storageData.emma_ephemeral || [];
          
          // Calculate basic statistics
          const stats = {
            totalMemories: memories.length,
            stagingItems: staging.length,
            sources: {},
            types: {},
            recentActivity: {},
            settings: Object.keys(storageData.emma_settings || {}).length
          };
          
          // Analyze memory sources and types
          memories.forEach(memory => {
            if (memory.source) {
              stats.sources[memory.source] = (stats.sources[memory.source] || 0) + 1;
            }
            if (memory.type) {
              stats.types[memory.type] = (stats.types[memory.type] || 0) + 1;
            }
          });
          
          // Recent activity (last 7 days)
          const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
          stats.recentActivity = {
            last7Days: memories.filter(m => m.timestamp && m.timestamp > weekAgo).length,
            last24Hours: memories.filter(m => m.timestamp && m.timestamp > Date.now() - (24 * 60 * 60 * 1000)).length
          };
          
          console.log('✅ Background: Statistics calculated');
          
          sendResponse({ success: true, stats });
        } catch (e) {
          console.error('❌ Background: Get statistics failed:', e);
          sendResponse({ success: false, error: e.message });
        }
        break;
        
      // Vault actions (minimal implementation for compatibility)
      case 'vault.stats':
        sendResponse({ 
          success: true, 
          stats: { message: 'Vault stats not available in minimal mode' }
        });
        break;
        
      case 'checkAutomationStatus':
        sendResponse({ 
          success: true, 
          connected: false, 
          message: 'Automation service not available in minimal mode' 
        });
        break;
        
      case 'vault.listCapsules':
        // Return empty list since we're using simple storage
        sendResponse({ 
          success: true, 
          items: [],
          message: 'Vault capsules not available in minimal mode - using simple storage'
        });
        break;
        
      case 'vault.create':
      case 'vault.setup':
        // Vault creation not supported in minimal mode
        sendResponse({ 
          success: false, 
          error: 'Vault creation not available in minimal mode. Extension is using simplified storage.' 
        });
        break;
        
      case 'vault.unlock':
        // Vault unlock not supported in minimal mode
        sendResponse({ 
          success: false, 
          error: 'Vault unlock not available in minimal mode. Extension is using simplified storage.' 
        });
        break;
        
      default:
        console.log('🔍 Background: Unknown action:', request.action);
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Helper function for processing element captures
async function processElementCapture(dataUrl, rect, devicePixelRatio = 1) {
  try {
    console.log('🔧 Processing element capture with rect:', rect);
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = new OffscreenCanvas(
            Math.round(rect.width * devicePixelRatio),
            Math.round(rect.height * devicePixelRatio)
          );
          const ctx = canvas.getContext('2d');
          
          // Extract the specific element area
          ctx.drawImage(
            img,
            Math.round(rect.x * devicePixelRatio),
            Math.round(rect.y * devicePixelRatio),
            Math.round(rect.width * devicePixelRatio),
            Math.round(rect.height * devicePixelRatio),
            0,
            0,
            Math.round(rect.width * devicePixelRatio),
            Math.round(rect.height * devicePixelRatio)
          );
          
          canvas.convertToBlob({ type: 'image/png' }).then(blob => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to convert blob to data URL'));
            reader.readAsDataURL(blob);
          }).catch(reject);
          
        } catch (e) {
          reject(new Error(`Canvas processing failed: ${e.message}`));
        }
      };
      img.onerror = () => reject(new Error('Failed to load screenshot image'));
      img.src = dataUrl;
    });
  } catch (error) {
    console.error('Element capture processing failed:', error);
    throw error;
  }
}

// Helper function for badge updates
function updateBadgeCount(count) {
  try {
    if (typeof count !== 'number' || count < 0) {
      console.warn('Invalid badge count:', count);
      return;
    }
    
    const text = count > 999 ? '999+' : count > 0 ? count.toString() : '';
    const color = count > 0 ? '#4CAF50' : '#9E9E9E';
    
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color });
    
    console.log(`🔔 Badge updated: ${text || '(empty)'}`);
  } catch (e) {
    console.warn('Badge update failed (non-fatal):', e.message);
  }
}

// Initialize badge on startup
async function initializeBadge() {
  try {
    const snap = await chrome.storage.local.get(['emma_memories']);
    const memories = Array.isArray(snap.emma_memories) ? snap.emma_memories : [];
    updateBadgeCount(memories.length);
    console.log('🔔 Badge initialized with count:', memories.length);
  } catch (e) {
    console.warn('Badge initialization failed (non-fatal):', e.message);
  }
}

// Context menu setup
function setupContextMenus() {
  try {
    if (!chrome.contextMenus) {
      console.log('📋 Context menus not available');
      return;
    }
    
    // Clear existing menus
    chrome.contextMenus.removeAll(() => {
      // Create context menu items
      chrome.contextMenus.create({
        id: 'emma-save-selection',
        title: 'Save to Emma',
        contexts: ['selection'],
        documentUrlPatterns: ['http://*/*', 'https://*/*']
      });
      
      chrome.contextMenus.create({
        id: 'emma-save-page',
        title: 'Save Page to Emma',
        contexts: ['page'],
        documentUrlPatterns: ['http://*/*', 'https://*/*']
      });
      
      chrome.contextMenus.create({
        id: 'emma-save-image',
        title: 'Save Image to Emma',
        contexts: ['image'],
        documentUrlPatterns: ['http://*/*', 'https://*/*']
      });
      
      console.log('📋 Context menus created');
    });
    
    // Handle context menu clicks
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      try {
        console.log('📋 Context menu clicked:', info.menuItemId);
        
        switch (info.menuItemId) {
          case 'emma-save-selection':
            if (info.selectionText) {
              const stagingId = await unifiedStorage.save({
                content: info.selectionText,
                type: 'text',
                source: 'context-menu',
                metadata: {
                  url: info.pageUrl || '',
                  method: 'text-selection',
                  timestamp: Date.now()
                }
              }, 'staging');
              
              // Show notification
              chrome.notifications.create({
                type: 'basic',
                iconUrl: '/icons/icon-128.png',
                title: 'Emma - Selection Saved',
                message: `"${info.selectionText.substring(0, 50)}..." saved to staging`
              });
              
              console.log('✅ Selection saved to staging:', stagingId);
            }
            break;
            
          case 'emma-save-page':
            // Trigger page capture via content script
            try {
              await chrome.tabs.sendMessage(tab.id, { action: 'captureNow' });
              
              chrome.notifications.create({
                type: 'basic',
                iconUrl: '/icons/icon-128.png',
                title: 'Emma - Page Capture',
                message: 'Page capture initiated'
              });
            } catch (e) {
              console.error('Page capture failed:', e);
            }
            break;
            
          case 'emma-save-image':
            if (info.srcUrl) {
              const stagingId = await unifiedStorage.save({
                content: `Image: ${info.srcUrl}`,
                type: 'media',
                source: 'context-menu',
                metadata: {
                  url: info.pageUrl || '',
                  imageUrl: info.srcUrl,
                  method: 'image-context',
                  timestamp: Date.now()
                }
              }, 'staging');
              
              chrome.notifications.create({
                type: 'basic',
                iconUrl: '/icons/icon-128.png',
                title: 'Emma - Image Saved',
                message: 'Image saved to staging'
              });
              
              console.log('✅ Image saved to staging:', stagingId);
            }
            break;
        }
      } catch (error) {
        console.error('❌ Context menu action failed:', error);
      }
    });
    
  } catch (error) {
    console.warn('Context menu setup failed (non-fatal):', error.message);
  }
}

// Initialize on script load
initializeBadge();
setupContextMenus();

console.log('✅ Emma Background: Minimal background script loaded successfully');
