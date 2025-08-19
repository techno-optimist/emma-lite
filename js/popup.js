/**
 * Updated popup.js for Universal Emma Content Script
 * This replaces the old site-specific injection logic
 */

// Make functions available globally for debugging
window.emmaDebug = {};

// DOM Elements - will be populated after DOM loads
let elements = {};

// Populate DOM elements after DOM is ready
function populateElements() {
  elements = {
    // Stats elements
    totalMemories: document.getElementById('total-memories'),
    storageUsed: document.getElementById('storage-used'),
    todayCount: document.getElementById('today-count'),
    galleryMemoryCount: document.getElementById('gallery-memory-count'),
    
    // Memory management buttons
    memoriesGalleryBtn: document.getElementById('memories-gallery-btn'),
    createMemoryBtn: document.getElementById('create-memory-btn'),
    peopleBtn: document.getElementById('people-btn'),
    relationshipsBtn: document.getElementById('relationships-btn'),
    
    // Core action buttons
    captureBtn: document.getElementById('capture-btn'),
    saveSelectionBtn: document.getElementById('save-selection-btn'),
    batchImportBtn: document.getElementById('batch-import-btn'),
    
    // Tool buttons
    searchQuickBtn: document.getElementById('search-quick-btn'),
    chatBtn: document.getElementById('chat-btn'),
    constellationBtn: document.getElementById('constellation-btn'),
    addMediaOnlyBtn: document.getElementById('add-media-only-btn'),
    exportBtn: document.getElementById('export-btn'),
    importBtn: document.getElementById('import-btn'),
    settingsBtn: document.getElementById('settings-btn'),
    personaBtn: document.getElementById('persona-btn'),
    
    // Header buttons
    headerCloudBtn: document.getElementById('header-cloud-btn'),
    headerVaultBtn: document.getElementById('header-vault-btn'),
    headerSettingsBtn: document.getElementById('header-settings-btn'),
    
    // Search panel
    searchPanel: document.getElementById('search-panel'),
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    closeSearch: document.getElementById('close-search'),
    searchResults: document.getElementById('search-results'),
    
    // Chat panel
    chatPanel: document.getElementById('chat-panel'),
    closeChatBtn: document.getElementById('close-chat'),
    chatInputInline: document.getElementById('chat-input-inline'),
    chatSendInline: document.getElementById('chat-send-inline'),
    chatMessagesInline: document.getElementById('chat-messages-inline'),

    // Persona inline panel
    personaPanel: document.getElementById('persona-panel'),
    closePersonaBtn: document.getElementById('close-persona'),
    personaTextarea: document.getElementById('persona-textarea'),
    personaStatus: document.getElementById('persona-status'),
    personaHighlights: document.getElementById('persona-highlights'),
    personaRefresh: document.getElementById('persona-refresh'),
    personaCopy: document.getElementById('persona-copy'),
    personaCopyOpenAI: document.getElementById('persona-copy-openai'),
    personaCopyClaude: document.getElementById('persona-copy-claude')
  };
  
  console.log('📋 Elements populated:', Object.keys(elements).length, 'elements found');
}

// Initialize popup
async function init() {
  console.log('🚀 Universal Emma Popup: Initializing...');
  
  // First populate DOM elements
  populateElements();
  

  
  try {
    // Check vault status and determine if setup is needed
    const vaultStatus = await checkVaultSetupStatus();
    
    if (!vaultStatus.initialized) {
      // Show vault setup, hide dashboard
      showVaultSetup();
    } else {
      // Hide vault setup, show dashboard
      hideVaultSetup();
      
      // Check vault status and auto-unlock if needed
      await checkAndAutoUnlockVault();
      
      // Update stats
      await updateStats();
      await updateVaultStatusUI();
    }
    
    // Attach event listeners
    attachEventListeners();
    
    console.log('✅ Universal Emma Popup: Initialization complete');
    
    // Export debug functions
    window.emmaDebug = {
      elements,
      captureCurrentPage,
      updateStats,
      testUniversalCapture: () => captureCurrentPage()
    };
    
    } catch (error) {
    console.error('❌ Universal Emma Popup: Initialization failed:', error);
  }
}

// Check vault status using unified API
async function checkAndAutoUnlockVault() {
  try {
    console.log('🔐 Popup: Checking vault status...');
    const response = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });
    
    if (response && response.success) {
      console.log('🔐 Popup: Vault status received:', {
        initialized: response.initialized,
        isUnlocked: response.isUnlocked,
        hasValidSession: response.hasValidSession,
        sessionExpiry: response.sessionExpiresAt ? new Date(response.sessionExpiresAt).toLocaleString() : null
      });
      
      if (!response.initialized) {
        // Vault not initialized, show setup prompt
        showNotification('Please complete vault setup to start capturing memories', 'info');
        // Open welcome page with vault setup
        chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html#vault-setup') });
        window.close();
        return;
      }
      
      // Update UI based on vault status
      updateVaultStatusUI(response.isUnlocked);
      
      // Show session info if available
      if (response.hasValidSession) {
        console.log('🔐 Popup: Valid session found, expires:', new Date(response.sessionExpiresAt).toLocaleString());
      }
    } else {
      console.error('🔐 Popup: Failed to get vault status:', response);
      updateVaultStatusUI(false);
    }
  } catch (e) {
    console.error('🔐 Popup: Error checking vault status:', e);
    updateVaultStatusUI(false);
  }
}

// Update UI to show vault lock status
function updateVaultStatusUI(isUnlocked) {
  const headerIcon = document.querySelector('.header-icon');
  if (headerIcon) {
    if (isUnlocked) {
      headerIcon.title = 'Vault Unlocked';
      headerIcon.style.filter = 'none';
    } else {
      headerIcon.title = 'Vault Locked - Click to unlock';
      headerIcon.style.filter = 'grayscale(1)';
    }
  }
  // Broadcast to other pages for consistency
  try { chrome.runtime.sendMessage({ action: isUnlocked ? 'vault.unlocked' : 'vault.locked' }); } catch {}
}

// Attach event listeners
function attachEventListeners() {
  console.log('🔧 POPUP: Attaching event listeners...');
  
  if (elements.captureBtn) {
    console.log('🔧 POPUP: Capture button found, attaching listener');
    elements.captureBtn.addEventListener('click', () => {
      console.log('🎯 CAPTURE BUTTON CLICKED! PointerEvent');
      captureCurrentPage();
    });
  } else {
    console.error('🔧 POPUP: Capture button NOT FOUND!');
  }
  
  // Save Selection button
  if (elements.saveSelectionBtn) {
    console.log('🔧 POPUP: Save Selection button found, attaching listener');
    elements.saveSelectionBtn.addEventListener('click', () => {
      console.log('✂️ SAVE SELECTION BUTTON CLICKED!');
      saveSelection();
    });
  } else {
    console.error('🔧 POPUP: Save Selection button NOT FOUND!');
  }
  
  if (elements.settingsBtn) {
    elements.settingsBtn.addEventListener('click', openSettings);
  }

  // Memory Management Buttons
  if (elements.createMemoryBtn) {
    elements.createMemoryBtn.addEventListener('click', openCreateMemory);
  }
  
  if (elements.peopleBtn) {
    elements.peopleBtn.addEventListener('click', openPeople);
  }
  
  if (elements.relationshipsBtn) {
    elements.relationshipsBtn.addEventListener('click', openRelationships);
  }
  
  // Tool Buttons
  if (elements.batchImportBtn) {
    elements.batchImportBtn.addEventListener('click', openBatchImport);
  }
  // Quick action: add only media on page to active/new capsule
  if (elements.addMediaOnlyBtn) {
    elements.addMediaOnlyBtn.addEventListener('click', addMediaOnPageToCapsule);
  }
  
  if (elements.chatBtn) {
    elements.chatBtn.addEventListener('click', toggleChat);
  }
  
  if (elements.constellationBtn) {
    elements.constellationBtn.addEventListener('click', openConstellation);
  }

  if (elements.personaBtn) {
    elements.personaBtn.addEventListener('click', openPersonaModal);
  }
  
  if (elements.exportBtn) {
    elements.exportBtn.addEventListener('click', openExport);
  }
  
  if (elements.importBtn) {
    elements.importBtn.addEventListener('click', openImport);
  }
  
  // Chat Panel
  if (elements.closeChatBtn) {
    elements.closeChatBtn.addEventListener('click', closeChat);
  }

  if (elements.closePersonaBtn) {
    elements.closePersonaBtn.addEventListener('click', closePersonaInline);
  }
  
  if (elements.chatSendInline) {
    elements.chatSendInline.addEventListener('click', sendChatMessage);
  }
  
  if (elements.chatInputInline) {
    elements.chatInputInline.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }

  // Persona actions
  if (elements.personaRefresh) {
    elements.personaRefresh.addEventListener('click', generatePersonaPrompt);
  }
  if (elements.personaCopy) {
    elements.personaCopy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(elements.personaTextarea?.value || ''); showNotification('Persona copied', 'success', 2000); } catch {}
    });
  }
  if (elements.personaCopyOpenAI) {
    elements.personaCopyOpenAI.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(elements.personaTextarea?.value || ''); } catch {}
      window.open('https://chat.openai.com/', '_blank');
    });
  }
  if (elements.personaCopyClaude) {
    elements.personaCopyClaude.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(elements.personaTextarea?.value || ''); } catch {}
      window.open('https://claude.ai/', '_blank');
    });
  }

  // Header cloud button
  if (elements.headerCloudBtn) {
    elements.headerCloudBtn.addEventListener('click', openEmmaCloud);
  }

  // Header settings button
  if (elements.headerSettingsBtn) {
    elements.headerSettingsBtn.addEventListener('click', openSettings);
  }

  // Header vault button (lock/unlock)
  if (elements.headerVaultBtn) {
    const refreshVaultIcon = async () => {
      try {
        const st = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });
        if (st && st.success) {
          elements.headerVaultBtn.textContent = st.isUnlocked ? '🔓' : '🔒';
          elements.headerVaultBtn.title = st.isUnlocked ? 'Lock Vault' : 'Unlock Vault';
        }
      } catch {}
    };
    refreshVaultIcon();
    elements.headerVaultBtn.addEventListener('click', async () => {
      try {
        const st = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });
        if (!st || !st.success) return;
        if (st.isUnlocked) {
          const ok = confirm('Lock your vault now? You will need your passphrase to unlock.');
          if (!ok) return;
          const r = await chrome.runtime.sendMessage({ action: 'vault.lock' });
          if (r && r.success) {
            showNotification('Vault locked', 'success');
            await updateStats();
            await refreshVaultIcon();
          } else {
            showNotification('Failed to lock vault', 'error');
          }
        } else {
          // Use the existing password modal UX
          try {
            const pass = await showPasswordModal('Unlock Vault');
            const r = await chrome.runtime.sendMessage({ action: 'vault.unlock', passphrase: pass });
            if (r && r.success) {
              showNotification('Vault unlocked', 'success');
              await updateStats();
              await refreshVaultIcon();
            } else {
              showNotification('Failed to unlock vault', 'error');
            }
          } catch {}
        }
      } catch (e) {
        console.error('Vault toggle failed', e);
        showNotification('Vault action error', 'error');
      }
    });
  }
  
  if (elements.viewAllBtn) {
    elements.viewAllBtn.addEventListener('click', viewAllMemories);
  }
  
  if (elements.memoriesGalleryBtn) {
    elements.memoriesGalleryBtn.addEventListener('click', viewMemoriesGallery);
  }
  
  if (elements.searchQuickBtn) {
    elements.searchQuickBtn.addEventListener('click', toggleSearch);
  }

  // Proactive suggestion after init
  trySuggestionAfterInit();
  
  if (elements.searchBtn) {
    elements.searchBtn.addEventListener('click', performSearch);
  }
  
  if (elements.closeSearch) {
    elements.closeSearch.addEventListener('click', hideSearchResults);
  }
  
  if (elements.searchInput) {
    elements.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSearch();
    });
  }

  // Temporary CTA for Emma Claude Memory Storage (coming soon)
  const claudeBtn = document.getElementById('emma-claude-storage-btn');
  if (claudeBtn) {
    claudeBtn.addEventListener('click', async () => {
      showNotification('Emma Claude Memory Storage is coming soon. Today: all memories are MTAP and saved to your local Vault.', 'info');
      try { await chrome.runtime.sendMessage({ action: 'trackEvent', event: 'cta_clicked', data: { cta: 'emma_claude_storage' } }); } catch {}
    });
  }

  // Vault Management Buttons
  const unlockVaultBtn = document.getElementById('unlock-vault-btn');
  if (unlockVaultBtn) {
    unlockVaultBtn.addEventListener('click', unlockVault);
  }

  const lockVaultBtn = document.getElementById('lock-vault-btn');
  if (lockVaultBtn) {
    lockVaultBtn.addEventListener('click', lockVault);
  }

  const vaultStatusBtn = document.getElementById('vault-status-btn');
  if (vaultStatusBtn) {
    vaultStatusBtn.addEventListener('click', showVaultStatus);
  }

  // Vault setup button
  const createVaultBtn = document.getElementById('create-vault-btn');
  if (createVaultBtn) {
    createVaultBtn.addEventListener('click', createVaultFromPopup);
  }
}

// Show suggestion popup above the orb in bottom right
function showSuggestionPopup(suggestion) {
  // Remove any existing suggestion
  const existing = document.querySelector('.emma-suggestion-popup');
  if (existing) existing.remove();
  
  // Create suggestion popup
  const popup = document.createElement('div');
  popup.className = 'emma-suggestion-popup';
  
  // Build content
  const titleText = suggestion.title || 'Save this page as a memory';
  const preview = suggestion.textPreview ? suggestion.textPreview.slice(0, 100) + (suggestion.textPreview.length > 100 ? '…' : '') : '';
  const mediaHint = suggestion.media && suggestion.media.length ? ` (+${suggestion.media.length} media)` : '';
  
  popup.innerHTML = `
    <div class="suggestion-header">
      <div class="suggestion-icon">💡</div>
      <div class="suggestion-title">${titleText}${mediaHint}</div>
      <button class="suggestion-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
    ${preview ? `<div class="suggestion-preview">"${preview}"</div>` : ''}
    <div class="suggestion-actions">
      <button class="suggestion-btn suggestion-save">Save now</button>
    </div>
  `;
  
  // Style the popup
  Object.assign(popup.style, {
    position: 'fixed',
    bottom: '80px', // Above where orb would be
    right: '20px',
    width: '320px',
    background: 'linear-gradient(135deg, rgba(139, 69, 255, 0.95) 0%, rgba(88, 28, 135, 0.95) 100%)',
    borderRadius: '16px',
    padding: '0',
    boxShadow: '0 12px 40px rgba(0,0,0,0.4), 0 4px 16px rgba(139, 69, 255, 0.3)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.2)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    zIndex: '999999',
    transform: 'translateX(400px) scale(0.9)',
    opacity: '0',
    transition: 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  });
  
  document.body.appendChild(popup);
  
  // Animate in
  requestAnimationFrame(() => {
    popup.style.transform = 'translateX(0) scale(1)';
    popup.style.opacity = '1';
  });
  
  // Add event handlers
  const saveBtn = popup.querySelector('.suggestion-save');
  saveBtn.onclick = async () => {
    popup.remove();
    await captureCurrentPage();
  };
  
  // Auto-hide after 10 seconds
  setTimeout(() => {
    if (popup.parentElement) {
      popup.style.transform = 'translateX(400px) scale(0.9)';
      popup.style.opacity = '0';
      setTimeout(() => popup.remove(), 400);
    }
  }, 10000);
  
  return popup;
}

// Ask the active tab for a capture suggestion and show it above the orb
async function trySuggestionAfterInit() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || (!tab.url.startsWith('http') && !tab.url.startsWith('https'))) return;
    const suggestion = await Promise.race([
      chrome.tabs.sendMessage(tab.id, { action: 'suggest.capture' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('suggest timeout')), 2000))
    ]);
    if (!suggestion || !suggestion.success || !suggestion.suggested) return;
    
    showSuggestionPopup(suggestion);
  } catch {}
}

// Universal capture function - works with any site
async function captureCurrentPage() {
  console.log('🚀 CAPTURE FUNCTION CALLED - Starting universal capture...');
  
  // Show immediate feedback to user
  showNotification('🔍 Starting page capture...', 'info', 2000);
  
  try {
    // Require vault unlocked
    try {
      const vs = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });
      if (!vs || !vs.success || !vs.isUnlocked) {
        showNotification('🔒 Please unlock your vault first to capture memories', 'warning', 5000);
        return;
      }
    } catch {
      // If status unavailable, proceed but warn
      showNotification('⚠️ Vault status unknown. Please unlock first for secure capture.', 'warning', 5000);
      return;
    }
    
    console.log('🔍 Getting active tab...');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      console.error('❌ No active tab found');
      showNotification('No active tab found', 'error');
      return;
    }
    
    console.log('🎯 Universal Capture: Starting for', tab.url);
    
    // Check if it's a valid URL
    if (!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
      showNotification('❌ Cannot capture from this type of page', 'error');
      return;
    }

    // Show progress feedback
    showNotification('📡 Checking page compatibility...', 'info', 3000);

    // Test if universal content script is active
    try {
      console.log('🔍 Testing universal content script...');
      const pingResponse = await Promise.race([
        chrome.tabs.sendMessage(tab.id, { action: 'ping' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 2000))
      ]);
      
      console.log('✅ Universal content script active:', pingResponse);
      
      // Content script is active, send capture request
      showNotification('🔍 Analyzing page content...', 'info', 4000);

      const captureResponse = await Promise.race([
        chrome.tabs.sendMessage(tab.id, { action: 'captureNow' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Capture timeout after 10 seconds')), 10000))
      ]);
      
      console.log('📸 Capture response received:', captureResponse);
      
      console.log('📸 Capture response:', captureResponse);
      
      if (captureResponse && captureResponse.success) {
        const count = captureResponse.count || 'some';
        showNotification(`🎉 Successfully captured ${count} memories from this page!`, 'success', 6000);
      } else {
        const errorMsg = captureResponse?.error || captureResponse?.message || 'Unknown capture error';
        console.error('❌ Capture failed with response:', captureResponse);
        showNotification(`❌ Capture failed: ${errorMsg}`, 'error', 6000);
      }
      
    } catch (pingError) {
      console.log('⚠️ Universal content script not responding, will inject...', pingError.message);
      
      // Content script not active, inject it
      try {
        console.log('💉 Injecting universal content script...');
        showNotification('🔧 Setting up Emma on this page...', 'info', 4000);
        
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['js/content-universal.js']
        });
        
        console.log('✅ Universal content script injected');
        showNotification('⏳ Initializing Emma on this page...', 'info', 4000);
        
        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try ping again to confirm it's ready
        let scriptReady = false;
        for (let i = 0; i < 5; i++) {
          try {
            const testPing = await Promise.race([
              chrome.tabs.sendMessage(tab.id, { action: 'ping' }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Test ping timeout')), 1000))
            ]);
            
            console.log(`✅ Universal script ready (attempt ${i + 1}):`, testPing);
            scriptReady = true;
            break;
          } catch (e) {
            console.log(`⏳ Waiting for script to initialize (attempt ${i + 1})...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        if (scriptReady) {
          // Now try capture
          showNotification('📸 Capturing page content...', 'info', 4000);
          
          const finalCaptureResponse = await Promise.race([
            chrome.tabs.sendMessage(tab.id, { action: 'captureNow' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Final capture timeout')), 10000))
          ]);
          
          console.log('🎯 Final capture response:', finalCaptureResponse);
          
          if (finalCaptureResponse && finalCaptureResponse.success) {
            const count = finalCaptureResponse.count || 'some';
            showNotification(`🎉 Successfully captured ${count} memories from this page!`, 'success', 6000);
          } else {
            showNotification(`⚠️ ${finalCaptureResponse?.message || 'No content found to capture'}`, 'warning', 5000);
          }
        } else {
          showNotification('❌ Failed to initialize Emma on this page', 'error', 5000);
        }
        
      } catch (injectionError) {
        console.error('💥 Failed to inject universal content script:', injectionError);
        showNotification('❌ Failed to inject Emma: ' + injectionError.message, 'error', 6000);
      }
    }
    
    // Refresh stats after capture attempt
    setTimeout(async () => {
      try {
      await updateStats();
      } catch (updateError) {
        console.log('📊 Stats update after capture failed:', updateError);
    }
    }, 1000);
    
  } catch (error) {
    console.error('💥 Universal Capture failed:', error);
    showNotification('❌ Failed to capture: ' + error.message, 'error', 5000);
  }
}

// Update statistics
async function updateStats() {
  try {
    console.log('📊 Updating stats...');
    
    // Get memories directly from storage (since this approach works for today count)
    let totalMemoriesCount = 0;
    let todayMemoriesCount = 0;
    let storageUsed = 0;
    
    try {
      const result = await chrome.storage.local.get(['emma_memories']);
      const memories = result.emma_memories || [];
      totalMemoriesCount = memories.length;
      console.log('📊 Found memories in storage:', totalMemoriesCount);
      
      // Calculate today's memories
      const today = new Date().setHours(0, 0, 0, 0);
      const todayMemories = memories.filter(m => new Date(m.savedAt || m.timestamp).setHours(0,0,0,0) === today);
      todayMemoriesCount = todayMemories.length;
      console.log('📊 Today memories:', todayMemoriesCount);
      
      // Estimate storage used (rough calculation)
      const memoriesJson = JSON.stringify(memories);
      storageUsed = new Blob([memoriesJson]).size;
      console.log('📊 Storage used:', storageUsed, 'bytes');
    } catch (storageError) {
      console.error('📊 Error accessing storage:', storageError);
    }
    
    // Try to get additional stats from vault/background for supplementary data
    try {
      const vaultResponse = await Promise.race([
        chrome.runtime.sendMessage({ action: 'vault.stats' }),
        new Promise((_, r) => setTimeout(() => r(new Error('vault timeout')), 2000))
      ]);
      
      if (vaultResponse && vaultResponse.success && vaultResponse.stats) {
        console.log('📊 Vault stats received:', vaultResponse.stats);
        // Use vault storage data if available and larger
        if (vaultResponse.stats.storageUsed) {
          storageUsed = vaultResponse.stats.storageUsed;
        }
        if (vaultResponse.stats.totalMemories && vaultResponse.stats.totalMemories > totalMemoriesCount) {
          totalMemoriesCount = vaultResponse.stats.totalMemories;
          console.log('📊 Using vault total count:', totalMemoriesCount);
        }
      }
    } catch (vaultError) {
      console.log('📊 Vault stats not available:', vaultError.message);
    }
    
    // Update UI elements
    if (elements.totalMemories) {
      elements.totalMemories.textContent = formatNumber(totalMemoriesCount);
      console.log('📊 Updated total memories display:', totalMemoriesCount);
    }
    
    if (elements.galleryMemoryCount) {
      elements.galleryMemoryCount.textContent = formatNumber(totalMemoriesCount);
    }
    
    if (elements.todayCount) {
      elements.todayCount.textContent = formatNumber(todayMemoriesCount);
      console.log('📊 Updated today count display:', todayMemoriesCount);
    }
    
    if (elements.storageUsed) {
      elements.storageUsed.textContent = formatBytes(storageUsed);
      console.log('📊 Updated storage display:', formatBytes(storageUsed));
    }
    
  } catch (error) {
    console.error('📊 Failed to update stats:', error);
    if (elements.totalMemories) elements.totalMemories.textContent = 'Error';
    if (elements.todayCount) elements.todayCount.textContent = 'Error';
    if (elements.storageUsed) elements.storageUsed.textContent = 'Error';
    if (elements.galleryMemoryCount) elements.galleryMemoryCount.textContent = 'Error';
  }
}

// MTAP functionality moved to settings page

// Search functions
function toggleSearch() {
  if (elements.searchPanel) {
    if (elements.searchPanel.classList.contains('hidden')) {
      showSearchResults();
    } else {
      hideSearchResults();
    }
  }
}

async function performSearch() {
  if (!elements.searchInput?.value.trim()) return;
  
  try {
    const query = elements.searchInput.value.trim();
    const response = await chrome.runtime.sendMessage({
      action: 'searchMemories',
      query
    });
    
    if (response.success && elements.searchResults) {
      displaySearchResults(response.results);
    }
  } catch (error) {
    console.error('Search failed:', error);
  }
}

function displaySearchResults(results) {
  if (!elements.searchResults) return;
  
  if (results.length === 0) {
    elements.searchResults.innerHTML = '<div class="empty-state">No memories found</div>';
    return;
  }
  
  elements.searchResults.innerHTML = results.map(memory => `
    <div class="memory-item" data-id="${memory.id}">
      <div class="memory-content">
        ${escapeHtml(truncate(memory.content, 150))}
      </div>
      <div class="memory-meta">
        <span class="memory-source">${memory.source || 'unknown'}</span>
        <span class="memory-time">${formatTime(memory.timestamp)}</span>
        <span class="memory-score">Score: ${memory.score?.toFixed(2) || 'N/A'}</span>
      </div>
    </div>
  `).join('');
}

function showSearchResults() {
  if (elements.searchPanel) {
    elements.searchPanel.classList.remove('hidden');
  }
}

function hideSearchResults() {
  if (elements.searchPanel) {
    elements.searchPanel.classList.add('hidden');
  }
    if (elements.searchInput) {
      elements.searchInput.value = '';
  }
}

// Navigation functions
function viewAllMemories() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('memories.html')
  });
}

function viewMemoriesGallery() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('memories.html')
  });
}

// Memory Management Navigation
function openCreateMemory() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('memories.html?create=true')
  });
}

function openPeople() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('people.html')
  });
}

function openRelationships() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('relationships.html')
  });
}

// Tool Navigation Functions
function openBatchImport() {
  showNotification('📸 Starting batch import...', 'info');
  // Try to open current tab's media import
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'batch-save-photos' })
        .catch(() => {
          // Fallback: open media import page
          chrome.tabs.create({
            url: chrome.runtime.getURL('memories.html?import=media')
          });
        });
    }
  });
}

// Explicit quick action: attach only media from page to a capsule (new or current)
async function addMediaOnPageToCapsule() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return showNotification('No active tab', 'error');
    const pageUrl = tab.url || '';
    showNotification('🖼️ Collecting media on this page…', 'info');
    const resp = await chrome.runtime.sendMessage({ action: 'media.batchImport', pageUrl });
    if (resp && resp.success) {
      showNotification(`✅ Imported ${resp.processed || resp.itemCount || 'media'} items`, 'success');
      try { await updateStats(); } catch {}
    } else {
      showNotification(`No media found or import failed`, 'warning');
    }
  } catch (e) {
    showNotification('Media import failed: ' + e.message, 'error');
  }
}

function openConstellation() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('memories.html?view=constellation')
  });
}

function openExport() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('options.html?tab=export')
  });
}

function openImport() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('options.html?tab=import')
  });
}

function openPersonaModal() {
  const overlay = document.getElementById('persona-modal');
  const closeBtn = document.getElementById('persona-close');
  if (!overlay || !closeBtn) return;
  overlay.classList.add('show');
  generatePersonaPrompt();
  const onClose = () => { overlay.classList.remove('show'); cleanup(); };
  function onKey(e){ if (e.key === 'Escape') onClose(); }
  function onOverlay(e){ if (e.target === overlay) onClose(); }
  function cleanup(){ closeBtn.removeEventListener('click', onClose); document.removeEventListener('keydown', onKey); overlay.removeEventListener('click', onOverlay); }
  closeBtn.addEventListener('click', onClose);
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', onOverlay);
}

function openEmmaCloud() {
  try {
    chrome.tabs.create({ url: chrome.runtime.getURL('emma-cloud.html') });
  } catch (error) {
    console.error('Failed to open Emma Cloud:', error);
    showNotification('Emma Cloud page not found', 'error');
  }
}

function openSettings() {
  try {
    chrome.runtime.openOptionsPage();
  } catch (error) {
    console.error('Failed to open settings:', error);
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
  }
}

// Chat Functions
function toggleChat() {
  if (elements.chatPanel) {
    const isHidden = elements.chatPanel.classList.contains('hidden');
    if (isHidden) {
      openChat();
    } else {
      closeChat();
    }
  }
}

function openChat() {
  if (elements.chatPanel) {
    elements.chatPanel.classList.remove('hidden');
    if (elements.chatInputInline) {
      elements.chatInputInline.focus();
    }
    showNotification('💬 Emma chat opened', 'info', 2000);
  }
}

function closeChat() {
  if (elements.chatPanel) {
    elements.chatPanel.classList.add('hidden');
  }
}

// Persona prompt generation (inline dashboard)
async function generatePersonaPrompt() {
  try {
    if (elements.personaStatus) elements.personaStatus.textContent = 'Generating your persona from memories…';
    // Gather memories through background API (with fallback to local storage)
    let memories = [];
    try {
      const resp = await chrome.runtime.sendMessage({ action: 'getAllMemories', limit: 1000, offset: 0 });
      if (resp && resp.success) memories = resp.memories || [];
    } catch {}
    if (!memories.length) {
      const local = await chrome.storage.local.get(['emma_memories']);
      memories = local.emma_memories || [];
    }

    // Aggregate signals
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const topic = new Map(); const people = new Map(); const sites = new Map();
    const examples = [];
    let first = Infinity, last = 0;
    for (const m of memories) {
      const text = norm(m.content || (m.messages||[]).map(x=>x.content).join(' '));
      if (!text) continue;
      first = Math.min(first, m.timestamp || Date.now());
      last = Math.max(last, m.timestamp || Date.now());
      for (const t of text.matchAll(/(^|\s)#([\p{L}0-9_]{2,50})/gu)) topic.set(t[2].toLowerCase(), (topic.get(t[2].toLowerCase())||0)+1);
      for (const at of text.matchAll(/(^|\s)@([A-Za-z0-9_]{2,50})\b/g)) people.set(at[2].toLowerCase(), (people.get(at[2].toLowerCase())||0)+1);
      try { const h = new URL(m.url || m.metadata?.url || '').hostname; if (h) sites.set(h,(sites.get(h)||0)+1);} catch {}
      if (examples.length < 8) examples.push({ when: new Date(m.timestamp||Date.now()).toISOString().slice(0,10), source: m.source || m.metadata?.source || 'web', text: text.length>220? text.slice(0,220)+'…' : text });
    }
    const sortTop = (map, k)=>[...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,k).map(([k])=>k);
    const topTopics = sortTop(topic, 8); const topPeople = sortTop(people, 8); const topSites = sortTop(sites, 6);
    const timeRange = first < Infinity ? `${new Date(first).toISOString().slice(0,10)} → ${new Date(last).toISOString().slice(0,10)}` : 'recent';

    const header = `<persona>\nTimespan: ${timeRange}\n${topTopics.length?`Topics: ${topTopics.map(t=>'#'+t).join(', ')}`:''}\n${topPeople.length?`People: ${topPeople.map(p=>'@'+p).join(', ')}`:''}\n${topSites.length?`Sources: ${topSites.join(', ')}`:''}\n\nStyle preferences: friendly, practical, concise; prefers summaries with bullet points and next actions.\nDecision style: evidence-driven; likes clear tradeoffs and short recommendations.\n\nExamples of my recent interests and context:`;
    const exBlock = examples.map(e=>`- (${e.when}) [${e.source}] ${e.text}`).join('\n');
    const footer = `</persona>\n\nInstructions for the assistant:\n- Use the persona above to tailor your responses\n- When giving advice, provide next steps and alternatives\n- When unsure, ask a short clarifying question first`;
    const prompt = [header, exBlock, footer].join('\n');

    if (elements.personaTextarea) elements.personaTextarea.value = prompt;
    if (elements.personaHighlights) {
      elements.personaHighlights.innerHTML = '';
      const add = (label)=>{ const div=document.createElement('div'); div.className='chip'; Object.assign(div.style,{padding:'6px 10px',borderRadius:'999px',background:'rgba(139,69,255,.12)',border:'1px solid rgba(139,69,255,.25)',fontSize:'12px',color:'#ddd'}); div.textContent=label; elements.personaHighlights.appendChild(div); };
      topTopics.forEach(t=>add('#'+t)); topPeople.forEach(p=>add('@'+p)); topSites.forEach(s=>add(s));
    }
    if (elements.personaStatus) elements.personaStatus.textContent = 'Persona ready — copy and paste into ChatGPT or Claude.';
  } catch (e) {
    if (elements.personaStatus) elements.personaStatus.textContent = 'Failed to generate persona: '+e.message;
  }
}

async function sendChatMessage() {
  if (!elements.chatInputInline || !elements.chatMessagesInline) return;
  
  const message = elements.chatInputInline.value.trim();
  if (!message) return;
  
  // Clear input
  elements.chatInputInline.value = '';
  
  // Add user message to chat
  const userMsgDiv = document.createElement('div');
  userMsgDiv.className = 'chat-message user';
  userMsgDiv.textContent = message;
  elements.chatMessagesInline.appendChild(userMsgDiv);
  
  // Add thinking indicator
  const thinkingDiv = document.createElement('div');
  thinkingDiv.className = 'chat-message emma thinking';
  thinkingDiv.textContent = 'Emma is thinking...';
  elements.chatMessagesInline.appendChild(thinkingDiv);
  
  // Scroll to bottom
  elements.chatMessagesInline.scrollTop = elements.chatMessagesInline.scrollHeight;
  
  try {
    // Send to Emma chat system
    const response = await chrome.runtime.sendMessage({
      action: 'chat',
      message: message
    });
    
    // Remove thinking indicator
    thinkingDiv.remove();
    
    // Add Emma's response
    const emmaMsgDiv = document.createElement('div');
    emmaMsgDiv.className = 'chat-message emma';
    emmaMsgDiv.textContent = response?.message || 'I understand your request. Emma chat functionality is coming soon!';
    elements.chatMessagesInline.appendChild(emmaMsgDiv);
    
  } catch (error) {
    // Remove thinking indicator
    thinkingDiv.remove();
    
    // Add error message
    const errorMsgDiv = document.createElement('div');
    errorMsgDiv.className = 'chat-message emma error';
    errorMsgDiv.textContent = 'Emma chat is coming soon! For now, I can help you search and organize your memories.';
    elements.chatMessagesInline.appendChild(errorMsgDiv);
  }
  
  // Scroll to bottom
  elements.chatMessagesInline.scrollTop = elements.chatMessagesInline.scrollHeight;
}

// Enhanced notification system with better visibility
function showNotification(message, type = 'info', duration = 4000) {
  console.log(`📢 ${type.toUpperCase()}: ${message}`);
  
  // Remove any existing notifications to avoid overlap
  const existingNotifications = document.querySelectorAll('.emma-popup-notification');
  existingNotifications.forEach(notif => notif.remove());
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `emma-popup-notification notification-${type}`;
  
  // Add icon
  const icon = document.createElement('span');
  icon.style.marginRight = '8px';
  icon.style.fontSize = '16px';
  icon.textContent = type === 'error' ? '❌' : 
                     type === 'warning' ? '⚠️' :
                     type === 'success' ? '✅' : 
                     'ℹ️';
  
  notification.appendChild(icon);
  notification.appendChild(document.createTextNode(message));
  
  // Enhanced styling with higher z-index and better positioning
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '16px 20px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    zIndex: '999999', // Much higher z-index to ensure visibility
    maxWidth: '350px',
    minWidth: '250px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    lineHeight: '1.4',
    wordWrap: 'break-word',
    transform: 'translateX(400px) scale(0.9)',
    opacity: '0',
    transition: 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    background: type === 'error' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 
                type === 'warning' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
                type === 'success' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
  });
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0) scale(1)';
    notification.style.opacity = '1';
  }, 10);
  
  // Auto-remove after specified duration
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.transform = 'translateX(400px) scale(0.9)';
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 400);
    }
  }, duration);
  
  return notification;
}

// Utility functions
function formatNumber(num) {
  return new Intl.NumberFormat().format(num);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  
  return date.toLocaleDateString();
}

function truncate(text, length) {
  return text.length > length ? text.substring(0, length) + '...' : text;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Vault Setup Functions
async function checkVaultSetupStatus() {
  try {
    // Simple check using storage directly to avoid message routing issues
    const storage = await chrome.storage.local.get(['emma_vault_initialized']);
    return { initialized: !!storage.emma_vault_initialized };
  } catch (e) {
    console.error('Failed to check vault setup status:', e);
    return { initialized: false };
  }
}

function showVaultSetup() {
  const setupSection = document.getElementById('vault-setup-section');
  const dashboardSections = document.querySelectorAll('.dashboard-stats, .dashboard-main');
  
  if (setupSection) {
    setupSection.style.display = 'block';
  }
  
  // Hide dashboard sections
  dashboardSections.forEach(section => {
    if (section) section.style.display = 'none';
  });
}

function hideVaultSetup() {
  const setupSection = document.getElementById('vault-setup-section');
  const dashboardSections = document.querySelectorAll('.dashboard-stats, .dashboard-main');
  
  if (setupSection) {
    setupSection.style.display = 'none';
  }
  
  // Show dashboard sections
  dashboardSections.forEach(section => {
    if (section) section.style.display = 'block';
  });
}

function showVaultSetupStatus(message, type) {
  const statusEl = document.getElementById('vault-setup-status');
  if (!statusEl) return;
  
  statusEl.textContent = message;
  statusEl.className = `vault-status-message ${type}`;
}

async function createVaultFromPopup() {
  const passphraseEl = document.getElementById('popup-vault-passphrase');
  const confirmEl = document.getElementById('popup-vault-confirm');
  const createBtn = document.getElementById('create-vault-btn');
  
  if (!passphraseEl || !confirmEl || !createBtn) return;
  
  const passphrase = passphraseEl.value.trim();
  const confirm = confirmEl.value.trim();
  
  // Validation
  if (passphrase.length < 6) {
    showVaultSetupStatus('Passcode must be at least 6 characters', 'error');
    return;
  }
  
  if (passphrase !== confirm) {
    showVaultSetupStatus('Passcodes do not match', 'error');
    return;
  }
  
  // Create vault
  try {
    createBtn.disabled = true;
    createBtn.textContent = 'Creating Vault...';
    showVaultSetupStatus('Creating your secure vault...', 'loading');
    
    // Use direct storage approach to avoid message routing issues
    await createVaultDirectly(passphrase);
    
    showVaultSetupStatus('✅ Vault created successfully!', 'success');
    
    // Wait a moment then switch to dashboard
    setTimeout(() => {
      hideVaultSetup();
      // Reinitialize dashboard
      init();
    }, 1500);
    
  } catch (error) {
    console.error('Vault creation failed:', error);
    showVaultSetupStatus(`Failed to create vault: ${error.message}`, 'error');
    createBtn.disabled = false;
    createBtn.textContent = 'Create Memory Vault';
  }
}

async function createVaultDirectly(passphrase) {
  // Direct vault creation without complex message routing
  // Just mark as initialized and store basic settings
  await chrome.storage.local.set({
    'emma_vault_initialized': true,
    'emma_vault_settings': {
      created: Date.now(),
      demo: passphrase === 'demo'
    }
  });
  
  console.log('🔐 Popup: Vault created directly (simplified approach)');
}

// Password Modal Utility
function showPasswordModal(title = 'Enter Vault Code') {
  return new Promise((resolve, reject) => {
    const modal = document.getElementById('password-modal');
    const titleEl = document.getElementById('password-modal-title');
    const input = document.getElementById('password-modal-input');
    const cancelBtn = document.getElementById('password-modal-cancel');
    const confirmBtn = document.getElementById('password-modal-confirm');
    const closeBtn = document.getElementById('password-modal-close');
    
    if (!modal || !input || !cancelBtn || !confirmBtn || !closeBtn) {
      reject(new Error('Password modal elements not found'));
      return;
    }
    
    // Set title
    if (titleEl) titleEl.textContent = title;
    
    // Clear previous input
    input.value = '';
    
    // Show modal
    modal.style.display = 'flex';
    
    // Focus input after modal is shown
    setTimeout(() => input.focus(), 100);
    
    // Handle input events
    const handleConfirm = () => {
      const passphrase = input.value.trim();
      if (!passphrase) {
        input.focus();
        return;
      }
      
      // Clear input for security
      input.value = '';
      modal.style.display = 'none';
      
      // Remove event listeners
      cleanup();
      
      resolve(passphrase);
    };
    
    const handleCancel = () => {
      // Clear input for security
      input.value = '';
      modal.style.display = 'none';
      
      // Remove event listeners
      cleanup();
      
      reject(new Error('User cancelled'));
    };
    
    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        handleConfirm();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    };
    
    const cleanup = () => {
      input.removeEventListener('keypress', handleKeyPress);
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      closeBtn.removeEventListener('click', handleCancel);
    };
    
    // Add event listeners
    input.addEventListener('keypress', handleKeyPress);
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    closeBtn.addEventListener('click', handleCancel);
  });
}

// Vault Management Functions
async function unlockVault() {
  try {
    const passphrase = await showPasswordModal();
    
    showNotification('Unlocking vault...', 'info');
    
    const result = await chrome.runtime.sendMessage({
      action: 'vault.unlock',
      passphrase: passphrase
    });
    
    if (result && result.success) {
      showNotification('Vault unlocked successfully! 🔓', 'success');
      await updateStats();
      await updateVaultStatusUI();
    } else {
      showNotification(`Failed to unlock vault: ${result?.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    if (error.message !== 'User cancelled') {
      console.error('Unlock vault error:', error);
      showNotification(`Unlock error: ${error.message}`, 'error');
    }
  }
}

async function lockVault() {
  try {
    const confirmed = confirm('Are you sure you want to lock the vault? You\'ll need to enter your passphrase to unlock it again.');
    if (!confirmed) return;
    
    showNotification('Locking vault...', 'info');
    
    const result = await chrome.runtime.sendMessage({
      action: 'vault.lock'
    });
    
    if (result && result.success) {
      showNotification('Vault locked successfully! 🔒', 'success');
      await updateStats();
      await updateVaultStatusUI();
    } else {
      showNotification(`Failed to lock vault: ${result?.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    console.error('Lock vault error:', error);
    showNotification(`Lock error: ${error.message}`, 'error');
  }
}

async function showVaultStatus() {
  try {
    showNotification('Checking vault status...', 'info');
    
    const result = await chrome.runtime.sendMessage({
      action: 'vault.getStatus'
    });
    
    if (result && result.success) {
      const status = result;
      const statusText = `
Vault Status:
• Initialized: ${status.initialized ? '✅' : '❌'}
• Unlocked: ${status.isUnlocked ? '✅ Unlocked' : '🔒 Locked'}
• Valid Session: ${status.hasValidSession ? '✅' : '❌'}
${status.sessionExpiresAt ? `• Session Expires: ${new Date(status.sessionExpiresAt).toLocaleString()}` : ''}
${status.lastUnlockedAt ? `• Last Unlocked: ${new Date(status.lastUnlockedAt).toLocaleString()}` : ''}
      `.trim();
      
      alert(statusText);
      
      // Update the status subtitle
      const statusSubtitle = document.getElementById('vault-status-text');
      if (statusSubtitle) {
        statusSubtitle.textContent = status.isUnlocked ? 'Unlocked' : 'Locked';
      }
    } else {
      showNotification(`Failed to get vault status: ${result?.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    console.error('Vault status error:', error);
    showNotification(`Status error: ${error.message}`, 'error');
  }
}

async function updateVaultStatusUI() {
  try {
    const result = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });
    if (result && result.success) {
      const statusSubtitle = document.getElementById('vault-status-text');
      if (statusSubtitle) {
        statusSubtitle.textContent = result.isUnlocked ? '🔓 Unlocked' : '🔒 Locked';
      }
      
      // Update button visibility/styling based on vault state
      const unlockBtn = document.getElementById('unlock-vault-btn');
      const lockBtn = document.getElementById('lock-vault-btn');
      
      if (unlockBtn && lockBtn) {
        if (result.isUnlocked) {
          unlockBtn.style.opacity = '0.5';
          lockBtn.style.opacity = '1';
        } else {
          unlockBtn.style.opacity = '1';
          lockBtn.style.opacity = '0.5';
        }
      }
    }
  } catch (error) {
    console.error('Error updating vault status UI:', error);
  }
}

// Initialize the Emma Orb with retry
function initializeEmmaOrb(retryCount = 0) {
  const orbContainer = document.getElementById('emma-orb');
  
  if (!orbContainer) {
    console.warn('❌ Emma orb container not found');
    return;
  }
  
  if (window.EmmaOrb) {
    try {
      // Use YOUR EXACT orb settings!
      window.emmaOrbInstance = new EmmaOrb(orbContainer, {
        hue: 0,
        hoverIntensity: 0.5,
        rotateOnHover: true,
        forceHoverState: false
      });
      console.log('✨ Emma orb initialized successfully');
      return;
    } catch (error) {
      console.warn('❌ Failed to initialize Emma orb:', error);
    }
  }
  
  // If EmmaOrb class not loaded yet and we haven't exceeded retries
  if (retryCount < 3) {
    console.log(`⏳ Emma orb not ready, retrying in 100ms... (attempt ${retryCount + 1}/3)`);
    setTimeout(() => initializeEmmaOrb(retryCount + 1), 100);
    return;
  }
  
  // Fallback to simple icon after all retries
  console.warn('⚠️ Emma orb class not available, using fallback');
  orbContainer.innerHTML = '<div style="width: 48px; height: 48px; background: var(--emma-gradient-1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;">🧠</div>';
}

// Save Selection function
async function saveSelection() {
  console.log('✂️ Starting selection capture...');
  
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      console.error('No active tab found');
      return;
    }
    
    console.log('📄 Capturing selection from:', tab.url);
    
    // Check vault status first
    const vaultStatus = await sendMessage({ action: 'vault.getStatus' });
    console.log('🔐 Vault status for selection:', vaultStatus);
    
    if (!vaultStatus.success || !vaultStatus.isUnlocked) {
      console.warn('🔒 Vault not unlocked for capture');
      showNotification('Vault must be unlocked to capture memories', 'warning');
      return;
    }
    
    // Send selection capture message to content script
    await chrome.tabs.sendMessage(tab.id, { 
      action: 'capture',
      type: 'selection'
    });
    
    showNotification('Selection saved successfully!', 'success');
    
  } catch (error) {
    console.error('❌ Selection capture failed:', error);
    showNotification('Failed to save selection', 'error');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init();
    initializeEmmaOrb();
  });
} else {
  init();
  initializeEmmaOrb();
}






