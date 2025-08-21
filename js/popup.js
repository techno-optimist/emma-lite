/**
 * Updated popup.js for Universal Emma Content Script
 * This replaces the old site-specific injection logic
 */

// Desktop shim: prefer Electron bridge (chromeShim) over any ambient window.chrome
// eslint-disable-next-line no-unused-vars
const chrome = (typeof window !== 'undefined' && (window.chromeShim || window.chrome)) || undefined;

// Make functions available globally for debugging
window.emmaDebug = {};

// DOM Elements - will be populated after DOM loads
let elements = {};
let hmlSync = {
  initialized: false,
  manager: null,
  pollHandle: null
};

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
    
    // Automation elements
    automationStatus: document.getElementById('automation-status'),
    automationStatusDot: document.getElementById('automation-status-dot'),
    automationStatusText: document.getElementById('automation-status-text'),
    autoCaptureQuery: document.getElementById('auto-capture-query'),
    startAutoCaptureBtn: document.getElementById('start-auto-capture'),
    autoCaptureProgress: document.getElementById('auto-capture-progress'),
    autoCaptureResults: document.getElementById('auto-capture-results'),
    stagingList: document.getElementById('staging-list'),
    stagingContainer: document.getElementById('staging-container'),
    
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

  // Always attach event listeners, even if initialization had issues
  try {
    attachEventListeners();
    console.log('✅ Event listeners attached');
  } catch (e) {
    console.error('❌ Failed to attach event listeners:', e);
  }

  // Universal orb system handles all orb display

  // Initialize HML Sync indicator in header (cloud icon)
  try {
    await initializeHmlSyncIndicator();
  } catch (e) {
    console.warn('HML Sync indicator init failed (non-fatal):', e);
  }
}

// Check vault status using unified API
async function checkAndAutoUnlockVault() {
  try {
    console.log('🔐 Popup: Checking vault status...');
    let response;
    try {
      response = await window.emma.vault.status();
      response.success = true;
    } catch {
      response = { success: false };
    }
    
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
        // Navigate locally in desktop
        try { window.location.href = 'welcome.html#vault-setup'; } catch {}
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
  try { chrome && chrome.runtime && chrome.runtime.sendMessage && chrome.runtime.sendMessage({ action: isUnlocked ? 'vault.unlocked' : 'vault.locked' }); } catch {}
}

// Attach event listeners
function attachEventListeners() {
  console.log('🔧 POPUP: Attaching event listeners...');
  
  // Listen for staging refresh messages from background
  if (chrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'staging.refresh') {
        console.log('📬 Popup: Received staging refresh signal');
        renderStaging();
      }
    });
  }
  
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
    elements.settingsBtn.addEventListener('click', () => {
      try { openSettings(); } catch { try { window.location.href = 'options.html'; } catch {} }
    });
  }

  // Memory Management Buttons
  if (elements.createMemoryBtn) {
    elements.createMemoryBtn.addEventListener('click', () => {
      try { openCreateMemory(); } catch { try { window.location.href = 'memories.html?create=true'; } catch {} }
    });
  }
  
  if (elements.peopleBtn) {
    elements.peopleBtn.addEventListener('click', () => { try { openPeople(); } catch { try { window.location.href='people.html'; } catch {} } });
  }
  
  if (elements.relationshipsBtn) {
    elements.relationshipsBtn.addEventListener('click', () => { try { openRelationships(); } catch { try { window.location.href='relationships.html'; } catch {} } });
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
  
  // Automation handlers
  if (elements.startAutoCaptureBtn) {
    elements.startAutoCaptureBtn.addEventListener('click', startAutonomousCapture);
  }
  
  // Check automation service status on load
  checkAutomationStatus();

  // Load staging on popup open (non-blocking)
  renderStaging().catch(e => console.warn('Staging render failed:', e));
  
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
    elements.headerCloudBtn.addEventListener('click', openHmlModal);
  }

  // Header settings button
  if (elements.headerSettingsBtn) {
    elements.headerSettingsBtn.addEventListener('click', openSettings);
  }

  // Header vault button (lock/unlock)
  if (elements.headerVaultBtn) {
    const refreshVaultIcon = async () => {
      try {
        const st = window.emma?.vault ? await window.emma.vault.status() : await chrome.runtime.sendMessage({ action: 'vault.status' });
        if (st) {
          elements.headerVaultBtn.textContent = st.isUnlocked ? '🔓' : '🔒';
          elements.headerVaultBtn.title = st.isUnlocked ? 'Lock Vault' : 'Unlock Vault';
        }
      } catch { /* ignore */ }
    };
    refreshVaultIcon();
    elements.headerVaultBtn.addEventListener('click', async () => {
      try {
        const st = window.emma?.vault ? await window.emma.vault.status() : await chrome.runtime.sendMessage({ action: 'vault.status' });
        if (!st || !st.success) return;
        if (st.isUnlocked) {
          // CRITICAL: Ask for passphrase to encrypt vault before locking
          try {
            const passphrase = await showSimplePasswordPrompt('🔐 Enter passphrase to encrypt and lock vault');
            if (!passphrase) return;
            
            const r = window.emma?.vault ? 
              await window.emma.vault.lock({ passphrase }) : 
              await chrome.runtime.sendMessage({ action: 'vault.lock', passphrase });
              
            if (r && r.success) {
              showNotification('✅ Vault locked and encrypted successfully', 'success');
              await updateStats();
              await refreshVaultIcon();
            } else {
              showNotification('❌ Failed to lock vault', 'error');
            }
          } catch (error) {
            console.error('❌ POPUP: Lock failed:', error);
            showNotification('❌ Failed to lock vault: ' + error.message, 'error');
          }
        } else {
          // Use the existing password modal UX
          try {
            const pass = await showPasswordModal('Unlock Vault');
            let r;
            if (window.emma?.vault) {
              // pass vaultId if available
              const st2 = await window.emma.vault.status();
              r = await window.emma.vault.unlock(st2?.vaultId ? { passphrase: pass, vaultId: st2.vaultId } : { passphrase: pass });
            } else {
              r = await chrome.runtime.sendMessage({ action: 'vault.unlock', passphrase: pass });
            }
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
    elements.memoriesGalleryBtn.addEventListener('click', () => { try { viewMemoriesGallery(); } catch { try { window.location.href='memory-gallery-new.html'; } catch {} } });
  }
  
  if (elements.searchQuickBtn) {
    elements.searchQuickBtn.addEventListener('click', toggleSearch);
  }

  // Proactive suggestion will now be handled directly by content script
  
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
  
  // Dashboard stat items - navigate to memories page
  const statItems = document.querySelectorAll('.stat-clickable');
  statItems.forEach(item => {
    item.addEventListener('click', () => {
      try {
        // Check if we're in Electron or browser extension
        if (window.emmaAPI) {
          // Electron environment - navigate directly
          window.location.href = 'memory-gallery-new.html';
        } else if (chrome.tabs && chrome.tabs.create) {
          // Browser extension environment
          chrome.tabs.create({ url: chrome.runtime.getURL('memory-gallery-new.html') });
        } else {
          // Fallback - try direct navigation
          window.location.href = 'memory-gallery-new.html';
        }
      } catch (error) {
        console.error('Failed to open memories page:', error);
        showNotification('Could not open memories page', 'error');
        // Final fallback
        try {
          window.location.href = 'memory-gallery-new.html';
        } catch (e) {
          console.error('All navigation methods failed:', e);
        }
      }
    });
  });
}

// --- HML Sync (P2P) Indicator Logic ---
async function initializeHmlSyncIndicator() {
  if (hmlSync.initialized) return;
  try {
    // Load P2P manager dynamically to respect CSP and avoid blocking
  const mod = await import('./p2p/p2p-manager.js');
    const p2pManager = mod.p2pManager || new mod.P2PManager();

    // Prefer GitHub signaling by default in production, fallback to mock
    try {
      if (p2pManager?.bulletinBoard?.setMode) {
        p2pManager.bulletinBoard.setMode('both');
      }
    } catch {}

    // Load identity if available
    const myIdentity = await getMyIdentityForHml();
    if (!myIdentity) {
      updateCloudIcon(false, 'HML Sync (setup required)');
      return;
    }

    // Initialize the manager (safe to call multiple times across pages)
    try { await p2pManager.initialize(myIdentity); } catch {}

    hmlSync.manager = p2pManager;
    hmlSync.initialized = true;

    // Listen to key events to refresh indicator promptly
    const refresh = () => safeUpdateCloudIconFromManager();
    p2pManager.addEventListener('shareconnected', refresh);
    p2pManager.addEventListener('shareaccepted', refresh);
    p2pManager.addEventListener('invitationreceived', (e) => {
      appendIncomingInvite(e.detail);
    });
    p2pManager.addEventListener('syncstarted', refresh);
    p2pManager.addEventListener('syncstopped', refresh);
    p2pManager.addEventListener('error', refresh);

    // EMERGENCY DISABLE: Stop HML polling storm
    console.log('🚨 POPUP: HML polling setInterval DISABLED to stop vault.status polling storm');
    if (hmlSync.pollHandle) clearInterval(hmlSync.pollHandle);
    // hmlSync.pollHandle = setInterval(refresh, 5000); // DISABLED

    // Initial paint
    refresh();
  } catch (error) {
    // If anything fails, leave icon in disconnected state
    updateCloudIcon(false);
    throw error;
  }
}

async function getMyIdentityForHml() {
  try {
    const res = await chrome.storage.local.get(['emma_my_identity']);
    return res.emma_my_identity || null;
  } catch {
    return null;
  }
}

function safeUpdateCloudIconFromManager() {
  try {
    if (!hmlSync.manager) {
      updateCloudIcon(false);
      return;
    }
    const stats = hmlSync.manager.connectionManager?.getStats?.() || { connected: 0, total: 0 };
    const hasConnections = (stats.connected || 0) > 0;
    updateCloudIcon(hasConnections);
  } catch (e) {
    updateCloudIcon(false);
  }
}

function updateCloudIcon(connected, tooltipOverride) {
  const btn = elements.headerCloudBtn || document.getElementById('header-cloud-btn');
  if (!btn) return;
  // Toggle classes
  btn.classList.remove('cloud-connected', 'cloud-disconnected');
  btn.classList.add(connected ? 'cloud-connected' : 'cloud-disconnected');
  // Update accessible title
  const title = connected
    ? 'HML Sync: Connected (peer-to-peer)'
    : 'HML Sync: Not connected (will sync when peers are online)';
  btn.title = tooltipOverride || title + ' · Emma Cloud is optional (tiered pricing).';
}

// DEPRECATED: Show suggestion popup above the orb in bottom right
// This is now handled directly by the content script
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

// DEPRECATED: Ask the active tab for a capture suggestion and show it above the orb
// This is now handled directly by the content script
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
    // No longer require vault unlock - captures go to staging first
    console.log('🎯 Capturing to staging area - vault unlock not required');
    
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
  // For Electron environment, navigate directly
  if (window.emmaAPI) {
    window.location.href = 'memory-gallery-new.html';
    return;
  }
  
  // For browser extension environment
  chrome.tabs.create({
    url: chrome.runtime.getURL('memory-gallery-new.html')
  });
}

function viewMemoriesGallery() {
  // For Electron environment, navigate directly
  if (window.emmaAPI) {
    window.location.href = 'memory-gallery-new.html';
    return;
  }
  
  // For browser extension environment
  chrome.tabs.create({
    url: chrome.runtime.getURL('memory-gallery-new.html')
  });
}

// Memory Management Navigation
function openCreateMemory() {
  try {
    if (chrome && chrome.tabs && chrome.runtime) {
      chrome.tabs.create({ url: chrome.runtime.getURL('memories.html?create=true') });
      return;
    }
  } catch {}
  try { window.location.href = 'memories.html?create=true'; } catch {}
}

function openPeople() {
  try {
    if (chrome && chrome.tabs && chrome.runtime) {
      chrome.tabs.create({ url: chrome.runtime.getURL('people.html') });
      return;
    }
  } catch {}
  try { window.location.href = 'people.html'; } catch {}
}

function openRelationships() {
  try {
    if (chrome && chrome.tabs && chrome.runtime) {
      chrome.tabs.create({ url: chrome.runtime.getURL('relationships.html') });
      return;
    }
  } catch {}
  try { window.location.href = 'relationships.html'; } catch {}
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
  try {
    if (chrome && chrome.tabs && chrome.runtime) {
      chrome.tabs.create({ url: chrome.runtime.getURL('memories.html?view=constellation') });
      return;
    }
  } catch {}
  try { window.location.href = 'memories.html?view=constellation'; } catch {}
}

function openExport() {
  try {
    if (chrome && chrome.tabs && chrome.runtime) {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html?tab=export') });
      return;
    }
  } catch {}
  try { window.location.href = 'options.html?tab=export'; } catch {}
}

function openImport() {
  try {
    if (chrome && chrome.tabs && chrome.runtime) {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html?tab=import') });
      return;
    }
  } catch {}
  try { window.location.href = 'options.html?tab=import'; } catch {}
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

// HML Modal controls
function openHmlModal() {
  const overlay = document.getElementById('hml-modal-overlay');
  const closeBtn = document.getElementById('hml-close');
  if (!overlay || !closeBtn) return openEmmaCloud();
  overlay.style.display = 'flex';
  
  // Initialize tabs - load enhanced functions
  import('./hml-modal-enhanced.js').then(module => {
    // Pass the HML manager reference to the enhanced module
    module.setHmlManager(window.hmlSync);
    module.initializeTabs();
    module.updateSyncStats();
  }).catch(err => {
    console.error('Failed to load HML modal enhancements:', err);
  });
  
  const onClose = () => { overlay.style.display = 'none'; cleanup(); };
  function onKey(e){ if (e.key === 'Escape') onClose(); }
  function onOverlay(e){ if (e.target === overlay) onClose(); }
  function cleanup(){
    closeBtn.removeEventListener('click', onClose);
    document.removeEventListener('keydown', onKey);
    overlay.removeEventListener('click', onOverlay);
  }
  closeBtn.addEventListener('click', onClose);
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', onOverlay);
  
  // Wire modal actions
  const cloudBtn = document.getElementById('hml-cloud-btn');
  if (cloudBtn) cloudBtn.onclick = openEmmaCloud;
  const refreshBtn = document.getElementById('hml-refresh');
  if (refreshBtn) refreshBtn.onclick = () => {
    safeUpdateCloudIconFromManager();
    // Update sync stats if module is loaded
    import('./hml-modal-enhanced.js').then(module => {
      module.setHmlManager(window.hmlSync);
      module.updateSyncStats();
    }).catch(() => {});
  };
  const copyBtn = document.getElementById('hml-copy-fp');
  if (copyBtn) copyBtn.onclick = async () => {
    const fp = document.getElementById('hml-fingerprint')?.textContent || '';
    if (fp) { try { await navigator.clipboard.writeText(fp); showNotification('Fingerprint copied', 'success'); } catch {} }
  };
  const createIdBtn = document.getElementById('hml-create-id');
  if (createIdBtn) createIdBtn.onclick = async () => {
    try {
      const mod = await import('./vault/identity-crypto.js');
      const identity = await mod.generateIdentity();
      await chrome.storage.local.set({ emma_my_identity: identity });
      showNotification('HML identity created', 'success');
      // Re-init HML manager with new identity
      hmlSync.initialized = false;
      await initializeHmlSyncIndicator();
      renderHmlPanel();
    } catch (e) {
      showNotification('Failed to create identity: ' + e.message, 'error');
    }
  };
  const monitorBtn = document.getElementById('hml-monitor-btn');
  if (monitorBtn) monitorBtn.onclick = async () => {
    try {
      const input = document.getElementById('hml-monitor-input');
      const fp = input?.value.trim();
      if (!fp) return;
      if (hmlSync.manager?.addPeerToMonitor) await hmlSync.manager.addPeerToMonitor(fp);
      showNotification('Peer added to monitor list', 'success');
      renderHmlPanel();
    } catch (e) { showNotification('Failed to monitor peer', 'error'); }
  };
  const checkRendezvousBtn = document.getElementById('hml-check-rendezvous');
  if (checkRendezvousBtn) checkRendezvousBtn.onclick = async () => {
    try {
      const input = document.getElementById('hml-monitor-input');
      const fp = input?.value.trim();
      const me = await getMyIdentityForHml();
      if (!fp || !me) return;
      
      appendHmlBoardLog('=== Connection Diagnostics ===');
      
      // Check rendezvous channel
      const mod = await import('./vault/crypto-utils.js');
      const channel = await mod.calculateRendezvousId(me.fingerprint, fp);
      appendHmlBoardLog('Rendezvous channel: ' + channel);
      
      // Check messages
      const msgs = await hmlSync.manager?.bulletinBoard?.get?.(channel, { limit: 10 });
      appendHmlBoardLog(`Channel has ${msgs?.length || 0} recent messages`);
      
      // Show message types
      if (msgs && msgs.length > 0) {
        const types = msgs.map(m => m.data?.type || 'unknown');
        appendHmlBoardLog('Message types: ' + [...new Set(types)].join(', '));
        
        // Show ICE candidates
        const iceCandidates = msgs.filter(m => m.data?.type === 'ice-candidate');
        if (iceCandidates.length > 0) {
          appendHmlBoardLog(`Found ${iceCandidates.length} ICE candidates`);
        }
      }
      
      // Check peer connection status
      const conn = hmlSync.manager?.connectionManager?.getConnection?.(fp);
      if (conn) {
        appendHmlBoardLog(`Connection state: ${conn.state}`);
        appendHmlBoardLog(`ICE state: ${conn.pc?.iceConnectionState || 'no pc'}`);
        appendHmlBoardLog(`DC state: ${conn.dataChannel?.readyState || 'no dc'}`);
        
        // Get ICE gathering state
        if (conn.pc) {
          appendHmlBoardLog(`ICE gathering: ${conn.pc.iceGatheringState}`);
          
          // Get connection stats
          try {
            const stats = await conn.pc.getStats();
            let candidatePairs = 0;
            stats.forEach(report => {
              if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                candidatePairs++;
              }
            });
            appendHmlBoardLog(`Active candidate pairs: ${candidatePairs}`);
          } catch (e) {
            appendHmlBoardLog('Could not get stats: ' + e.message);
          }
        }
      } else {
        appendHmlBoardLog('No active connection to peer');
      }
      
      // Check TURN servers
      const iceServers = await chrome.storage.local.get(['emma_ice_servers']);
      const turnServers = (iceServers.emma_ice_servers || []).filter(s => s.urls?.includes('turn:'));
      appendHmlBoardLog(`TURN servers configured: ${turnServers.length}`);
      
    } catch (e) { 
      appendHmlBoardLog('Diagnostic check failed: ' + e.message); 
    }
  };
  const inviteBtn = document.getElementById('hml-invite-btn');
  if (inviteBtn) inviteBtn.onclick = async () => {
    try {
      const input = document.getElementById('hml-monitor-input');
      const fp = input?.value.trim();
      if (!fp) return;
      // Attempt a minimal share to open a connection (viewer permissions)
      const { getVaultManager } = await import('./vault/vault-manager.js');
      const vm = getVaultManager();
      const st = await vm.getStatus();
      const vaultId = st?.vaultId || 'default';
      const perms = { read: true, write: false, delete: false, share: false, admin: false };
      await hmlSync.manager.shareVault(vaultId, fp, perms);
      showNotification('Invitation posted. Peer can accept when online.', 'success');
    } catch (e) { showNotification('Invite failed: ' + e.message, 'error'); }
  };

  // Toggle: auto-accept viewer invites
  const autoAccept = document.getElementById('hml-auto-accept-viewer');
  if (autoAccept) {
    (async () => {
      try {
        const s = await chrome.storage.local.get(['emma_hml_auto_accept_viewer']);
        autoAccept.checked = !!s.emma_hml_auto_accept_viewer;
      } catch {}
    })();
    autoAccept.onchange = async (e) => {
      await chrome.storage.local.set({ emma_hml_auto_accept_viewer: !!e.target.checked });
      showNotification('Auto‑accept setting updated', 'success');
    };
  }

  // Signaling provider select
  const providerSelect = document.getElementById('hml-provider');
  if (providerSelect) {
    // load saved
    (async () => {
      try {
        const s = await chrome.storage.local.get(['emma_hml_provider']);
        const val = s.emma_hml_provider || 'both';
        providerSelect.value = val;
        if (hmlSync.manager?.bulletinBoard?.setMode) {
          hmlSync.manager.bulletinBoard.setMode(val);
        }
      } catch {}
    })();
    providerSelect.onchange = async (e) => {
      const mode = e.target.value;
      await chrome.storage.local.set({ emma_hml_provider: mode });
      try { hmlSync.manager?.bulletinBoard?.setMode?.(mode); } catch {}
      showNotification('Signaling provider set to ' + mode, 'success');
    };
  }
  
  // TURN server management
  const turnContainer = document.getElementById('hml-turn-servers');
  const addTurnBtn = document.getElementById('hml-add-turn');
  
  async function loadTurnServers() {
    if (!turnContainer) return;
    
    try {
      const result = await chrome.storage.local.get(['emma_ice_servers']);
      const servers = result.emma_ice_servers || [];
      
      turnContainer.innerHTML = '';
      
      // Show only TURN servers
      const turnServers = servers.filter(s => s.urls && s.urls.includes('turn:'));
      
      if (turnServers.length === 0) {
        turnContainer.innerHTML = '<div style="color: rgba(255,255,255,0.4); font-size: 11px;">No TURN servers configured</div>';
      } else {
        turnServers.forEach((server, index) => {
          const item = document.createElement('div');
          item.className = 'hml-turn-item';
          
          const urlInput = document.createElement('input');
          urlInput.type = 'text';
          urlInput.value = server.urls;
          urlInput.placeholder = 'turn:example.com:3478';
          urlInput.disabled = true;
          
          const removeBtn = document.createElement('button');
          removeBtn.className = 'remove-turn';
          removeBtn.innerHTML = '×';
          removeBtn.onclick = () => removeTurnServer(index);
          
          item.appendChild(urlInput);
          if (server.username) {
            const userSpan = document.createElement('span');
            userSpan.style.fontSize = '10px';
            userSpan.style.color = 'rgba(255,255,255,0.5)';
            userSpan.textContent = `@${server.username}`;
            item.appendChild(userSpan);
          }
          item.appendChild(removeBtn);
          
          turnContainer.appendChild(item);
        });
      }
    } catch (e) {
      console.error('Failed to load TURN servers:', e);
    }
  }
  
  async function removeTurnServer(index) {
    try {
      const result = await chrome.storage.local.get(['emma_ice_servers']);
      const servers = result.emma_ice_servers || [];
      const turnServers = servers.filter(s => s.urls && s.urls.includes('turn:'));
      
      if (index >= 0 && index < turnServers.length) {
        const turnUrl = turnServers[index].urls;
        const newServers = servers.filter(s => s.urls !== turnUrl);
        await chrome.storage.local.set({ emma_ice_servers: newServers });
        await loadTurnServers();
        showNotification('TURN server removed', 'success');
      }
    } catch (e) {
      console.error('Failed to remove TURN server:', e);
      showNotification('Failed to remove TURN server', 'error');
    }
  }
  
  if (addTurnBtn) {
    addTurnBtn.onclick = async () => {
      const url = prompt('Enter TURN server URL:\n(e.g., turn:example.com:3478)');
      if (!url || !url.startsWith('turn:')) {
        if (url) showNotification('Invalid TURN URL format', 'error');
        return;
      }
      
      const username = prompt('Username (optional):');
      const credential = username ? prompt('Password:') : null;
      
      try {
        const result = await chrome.storage.local.get(['emma_ice_servers']);
        const servers = result.emma_ice_servers || [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun.cloudflare.com:3478' },
          { urls: 'stun:stun.services.mozilla.com' },
          { urls: 'stun:stun.stunprotocol.org:3478' }
        ];
        
        const newServer = { urls: url };
        if (username) {
          newServer.username = username;
          newServer.credential = credential;
        }
        
        servers.push(newServer);
        await chrome.storage.local.set({ emma_ice_servers: servers });
        await loadTurnServers();
        showNotification('TURN server added', 'success');
      } catch (e) {
        console.error('Failed to add TURN server:', e);
        showNotification('Failed to add TURN server', 'error');
      }
    };
  }
  
  // Load TURN servers when modal opens
  loadTurnServers();
  
  const testPost = document.getElementById('hml-test-post');
  const testCheck = document.getElementById('hml-test-check');
  if (testPost) testPost.onclick = async () => {
    try {
      const res = await hmlSync.manager?.bulletinBoard?.post?.('hml-test', { type: 'test', ts: Date.now() });
      appendHmlBoardLog(`Posted test message: ${res?.id || 'ok'}`);
    } catch (e) { appendHmlBoardLog('Post failed: ' + e.message); }
  };
  if (testCheck) testCheck.onclick = async () => {
    try {
      const msgs = await hmlSync.manager?.bulletinBoard?.get?.('hml-test', { limit: 5 });
      appendHmlBoardLog(`Found ${msgs?.length || 0} messages`);
    } catch (e) { appendHmlBoardLog('Check failed: ' + e.message); }
  };
  // Connect Now (ping) – send a trivial message to all active peers
  const connectNow = document.getElementById('hml-connect-now');
  if (connectNow) connectNow.onclick = async () => {
    try {
      const active = hmlSync.manager?.connectionManager?.getActiveConnections?.() || [];
      if (!active.length) return showNotification('No active peers to ping', 'warning');
      const count = await hmlSync.manager.connectionManager.broadcast({ type: 'hml-ping', ts: Date.now() });
      showNotification(`Ping sent to ${count} peer(s)`, 'success');
    } catch (e) { showNotification('Ping failed: ' + e.message, 'error'); }
  };
  renderHmlPanel();
}

function appendHmlBoardLog(line) {
  const el = document.getElementById('hml-board-log');
  if (!el) return;
  const d = document.createElement('div');
  d.textContent = `[${new Date().toLocaleTimeString()}] ${line}`;
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
}

async function renderHmlPanel() {
  try {
    // fingerprint
    const fpEl = document.getElementById('hml-fingerprint');
    const id = await getMyIdentityForHml();
    if (fpEl) fpEl.textContent = id?.fingerprint || '—';
    // Identity hint + create button
    const hint = document.getElementById('hml-identity-hint');
    const createBtn = document.getElementById('hml-create-id');
    if (!id) {
      if (hint) hint.style.display = 'block';
      if (createBtn) createBtn.style.display = 'inline-flex';
    } else {
      if (hint) hint.style.display = 'none';
      if (createBtn) createBtn.style.display = 'none';
    }
    // pill
    const pill = document.getElementById('hml-connection-pill');
    const stats = hmlSync.manager?.connectionManager?.getStats?.() || { connected: 0, total: 0 };
    const connected = (stats.connected || 0) > 0;
    if (pill) {
      pill.classList.remove('connected','disconnected');
      pill.classList.add(connected ? 'connected' : 'disconnected');
      pill.textContent = connected ? `Connected • ${stats.connected} peer(s)` : 'Not connected';
    }
    // peers list with detailed connection states
    const peersEl = document.getElementById('hml-peers');
    const active = hmlSync.manager?.connectionManager?.getActiveConnections?.() || [];
    if (peersEl) {
      if (!active.length) {
        peersEl.textContent = 'No active peers';
      } else {
        peersEl.innerHTML = active.map(p => {
          const stateClass = p.state?.toLowerCase() || 'disconnected';
          const iceState = p.pc?.iceConnectionState || 'unknown';
          const dcState = p.dataChannel?.readyState || 'closed';
          const stats = p.stats || {};
          
          return `
            <div class="hml-peer-item">
              <div class="hml-peer-header">
                <span class="hml-peer-fingerprint">${(p.peerFingerprint||'').slice(0,32)}…</span>
                <span class="hml-peer-state ${stateClass}">${p.state}</span>
              </div>
              <div class="hml-peer-details">
                <div class="hml-peer-detail">
                  <span class="hml-peer-detail-label">ICE:</span>
                  <span>${iceState}</span>
                </div>
                <div class="hml-peer-detail">
                  <span class="hml-peer-detail-label">DC:</span>
                  <span>${dcState}</span>
                </div>
                ${stats.messagesSent ? `
                  <div class="hml-peer-detail">
                    <span class="hml-peer-detail-label">Msgs:</span>
                    <span>↑${stats.messagesSent} ↓${stats.messagesReceived || 0}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Render pending invites if present
    const list = document.getElementById('hml-invites');
    if (list) {
      const invites = hmlSync.__invites || [];
      if (!invites.length) list.textContent = 'No pending invitations';
      else list.innerHTML = invites.map(inv => `
        <div class="hml-invite-item">
          <div>
            <div style="font-size:12px;color:#b3a6ff">${(inv.issuerFingerprint||'').slice(0,24)}…</div>
            <div style="font-size:12px;opacity:.8">Vault: ${inv.vaultName || inv.vaultId || ''}</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn tiny" data-accept="${inv.shareId}">Accept</button>
            <button class="btn tiny" data-decline="${inv.shareId}">Decline</button>
          </div>
        </div>`).join('');
      list.querySelectorAll('[data-accept]').forEach(btn => {
        btn.addEventListener('click', async (ev) => {
          const idAttr = ev.currentTarget.getAttribute('data-accept');
          const inv = (hmlSync.__invites || []).find(i => i.shareId === idAttr);
          if (!inv) return;
          try { await hmlSync.manager.acceptShare(inv); showNotification('Invite accepted', 'success'); hmlSync.__invites = (hmlSync.__invites || []).filter(i => i.shareId !== idAttr); renderHmlPanel(); } catch (e) { showNotification('Accept failed: ' + e.message, 'error'); }
        });
      });
      list.querySelectorAll('[data-decline]').forEach(btn => {
        btn.addEventListener('click', (ev) => {
          const idAttr = ev.currentTarget.getAttribute('data-decline');
          hmlSync.__invites = (hmlSync.__invites || []).filter(i => i.shareId !== idAttr);
          renderHmlPanel();
        });
      });
    }
  } catch {}
}

function appendIncomingInvite(invitation) {
  hmlSync.__invites = hmlSync.__invites || [];
  if (!hmlSync.__invites.find(i => i.shareId === invitation.shareId)) {
    hmlSync.__invites.push(invitation);
    appendHmlBoardLog('Incoming invite from ' + (invitation.issuerFingerprint || '').slice(0, 18) + '…');
    renderHmlPanel();
  }
}

function openSettings() {
  try {
    if (chrome && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
      return;
    }
  } catch {}
  try { window.location.href = 'options.html'; } catch (e) {
    console.error('Failed to open settings:', e);
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

// Automation Functions
async function checkAutomationStatus() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'checkAutomationStatus'
    });
    
    if (response.success && response.available) {
      updateAutomationStatus('connected', 'Service connected');
    } else {
      updateAutomationStatus('disconnected', 'Service not available');
    }
  } catch (error) {
    updateAutomationStatus('disconnected', 'Service not available');
  }
}

function updateAutomationStatus(status, message) {
  if (elements.automationStatus) {
    elements.automationStatus.className = `automation-status ${status}`;
  }
  if (elements.automationStatusText) {
    elements.automationStatusText.textContent = message;
  }
}

async function startAutonomousCapture() {
  const query = elements.autoCaptureQuery?.value?.trim();
  
  if (!query) {
    showNotification('Please enter a capture query', 'error');
    return;
  }
  
  if (query.length < 10) {
    showNotification('Please provide a more detailed query', 'error');
    return;
  }
  
  // Disable button and show progress
  if (elements.startAutoCaptureBtn) {
    elements.startAutoCaptureBtn.disabled = true;
    elements.startAutoCaptureBtn.textContent = 'Starting...';
  }
  
  if (elements.autoCaptureProgress) {
    elements.autoCaptureProgress.classList.remove('hidden');
    updateProgress('Initializing autonomous capture...', 10);
  }
  
  try {
    const result = await chrome.runtime.sendMessage({
      action: 'startAutonomousCapture',
      query: query,
      options: {
        headless: false // Show browser for demo
      }
    });
    
    if (result.success) {
      updateProgress(`Captured ${result.count} memories!`, 100);
      showNotification(`✅ Successfully captured ${result.count} memories from ${result.platform}`, 'success', 5000);
      renderAutoCaptureResults(result);
      
      // Clear the query input
      if (elements.autoCaptureQuery) {
        elements.autoCaptureQuery.value = '';
      }
      
      // Hide progress after delay
      setTimeout(() => {
        if (elements.autoCaptureProgress) {
          elements.autoCaptureProgress.classList.add('hidden');
        }
      }, 3000);
    } else {
      throw new Error(result.error || 'Capture failed');
    }
  } catch (error) {
    console.error('Autonomous capture error:', error);
    showNotification(`❌ Error: ${error.message}`, 'error', 5000);
    updateProgress('Capture failed', 0);
  } finally {
    // Re-enable button
    if (elements.startAutoCaptureBtn) {
      elements.startAutoCaptureBtn.disabled = false;
      elements.startAutoCaptureBtn.textContent = 'Start Autonomous Capture';
    }
  }
}

function updateProgress(message, percentage) {
  const progressMessage = elements.autoCaptureProgress?.querySelector('.progress-message');
  const progressFill = elements.autoCaptureProgress?.querySelector('.progress-fill');
  
  if (progressMessage) {
    progressMessage.textContent = message;
  }
  
  if (progressFill) {
    progressFill.style.width = `${percentage}%`;
  }
}

function renderAutoCaptureResults(result) {
  if (!elements.autoCaptureResults) return;
  const list = Array.isArray(result.memories) ? result.memories : [];
  if (!list.length) { elements.autoCaptureResults.innerHTML = ''; return; }
  const cards = list.slice(0, 5).map(m => {
    const title = (m.title || m.content || '').toString().slice(0, 80) + ((m.title||m.content||'').length>80?'…':'');
    return `<div class="auto-result-card"><div class="auto-result-title">${escapeHtml(title)}</div><button class="auto-result-link" data-memory-id="${m.id || ''}">Open</button></div>`;
  }).join('');
  elements.autoCaptureResults.innerHTML = cards;
  elements.autoCaptureResults.querySelectorAll('.auto-result-link').forEach(btn => {
    btn.addEventListener('click', () => openMemoryFromPopup(btn.getAttribute('data-memory-id')));
  });
}

function escapeHtml(s) {
  return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}

async function openMemoryFromPopup(memoryId) {
  try {
    const url = 'memories.html' + (memoryId ? `#${encodeURIComponent(memoryId)}` : '');
    window.location.href = url;
  } catch (e) {
    console.error('Failed to open memory:', e);
  }
}

// ---------- Staging (Ephemeral) ----------
async function renderStaging() {
  console.log('📋 Popup: renderStaging called');
  if (!elements.stagingList) {
    console.log('❌ Popup: stagingList element not found');
    return;
  }
  console.log('📡 Popup: Requesting ephemeral.list...');
  const resp = { success: true, items: [] }; // Desktop: staging disabled for now
  console.log('📦 Popup: ephemeral.list response:', resp);
  const list = (resp && resp.success && Array.isArray(resp.items)) ? resp.items : [];
  console.log('📋 Popup: staging list items:', list.length);
  if (!list.length) {
    console.log('📭 Popup: No staging items, showing empty state');
    const empty = document.getElementById('staging-empty');
    if (empty) empty.style.display = 'block';
    elements.stagingList.innerHTML = '';
    return;
  }
  const empty = document.getElementById('staging-empty');
  if (empty) empty.style.display = 'none';
  elements.stagingList.innerHTML = list.map(item => {
    const title = sanitize((item.data?.title || item.data?.content || 'Untitled').toString().slice(0, 120));
    const platform = sanitize(item.data?.platform || item.data?.metadata?.platform || 'web');
    const t = new Date(item.createdAt || Date.now()).toLocaleString();
    return `<div class="staging-card">
      <div>
        <div class="title">${title}</div>
        <div class="meta">${platform} • ${t}</div>
      </div>
      <div class="staging-actions">
        <button class="btn-approve" data-id="${item.id}">Approve</button>
        <button class="btn-reject" data-id="${item.id}">Dismiss</button>
      </div>
    </div>`;
  }).join('');
  // Attach event listeners with debugging
  const approveButtons = elements.stagingList.querySelectorAll('.btn-approve');
  const rejectButtons = elements.stagingList.querySelectorAll('.btn-reject');
  
  console.log(`🔧 Popup: Attaching listeners to ${approveButtons.length} approve buttons and ${rejectButtons.length} reject buttons`);
  
  approveButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      console.log('✅ Approve button clicked for ID:', btn.getAttribute('data-id'));
      approveStaged(btn.getAttribute('data-id'));
    });
  });
  
  rejectButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      console.log('🗑️ Reject button clicked for ID:', btn.getAttribute('data-id'));
      rejectStaged(btn.getAttribute('data-id'));
    });
  });
}

async function approveStaged(id) {
  try {
    const res = { success: false, error: 'Staging not available in desktop yet' };
    if (res?.success) {
      showNotification('✅ Saved to Vault', 'success', 2000);
      await renderStaging();
    } else {
      throw new Error(res?.error || 'Commit failed');
    }
  } catch (e) {
    showNotification('❌ ' + e.message, 'error', 3000);
  }
}

async function rejectStaged(id) {
  console.log('🗑️ Popup: Dismiss clicked for ID:', id);
  try {
    const res = { success: false, error: 'Staging not available in desktop yet' };
    console.log('🗑️ Popup: Delete response:', res);
    if (res?.success) {
      showNotification('✅ Dismissed', 'success', 1500);
      await renderStaging();
    } else {
      throw new Error(res?.error || 'Delete failed');
    }
  } catch (e) {
    console.error('🗑️ Popup: Delete error:', e);
    
    // Handle extension context invalidated error
    if (e.message?.includes('Extension context invalidated') || e.message?.includes('message port closed')) {
      showNotification('🔄 Extension reloaded - please refresh the page', 'warning', 5000);
    } else {
      showNotification('❌ ' + (e.message || 'Delete failed'), 'error', 3000);
    }
  }
}

function sanitize(s) { return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }

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
    // Prefer real backend status
    if (window.emma?.vault) {
      const st = await window.emma.vault.status();
      return { initialized: !!st.initialized };
    }
    // Fallback: storage flag (legacy)
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
    let res;
    if (window.emma?.vault) {
      res = await window.emma.vault.initialize({ passphrase, name: 'My Vault' });
    } else if (chrome?.runtime?.sendMessage) {
      res = await chrome.runtime.sendMessage({ action: 'vault.initialize', passphrase, name: 'My Vault' });
    }
    if (!res || !res.success) throw new Error(res?.error || 'Initialize failed');
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
    let result;
    if (window.emma?.vault) {
      const st = await window.emma.vault.status();
      result = await window.emma.vault.unlock(st?.vaultId ? { passphrase, vaultId: st.vaultId } : { passphrase });
    } else if (chrome?.runtime?.sendMessage) {
      result = await chrome.runtime.sendMessage({ action: 'vault.unlock', passphrase });
    }
    
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
    // CRITICAL: Ask for passphrase to encrypt vault before locking
    const passphrase = await showPasswordModal('🔐 Enter passphrase to encrypt and lock vault');
    if (!passphrase) return;
    
    showNotification('Locking vault...', 'info');
    
    // Use web vault system for locking
    if (window.emmaWebVault) {
      await window.emmaWebVault.lockVault();
      console.log('✅ VAULT: Locked and encrypted successfully');
      showNotification('Vault locked successfully', 'success');
      // Refresh page to show locked state
      setTimeout(() => window.location.reload(), 1000);
    } else {
      // Fallback to extension if available
      const result = await chrome.runtime.sendMessage({
        action: 'LOCK'
      });
      if (result && result.success) {
        showNotification('Vault locked successfully', 'success');
        setTimeout(() => window.location.reload(), 1000);
      }
    }
    
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
    
    const result = window.emma?.vault ? await window.emma.vault.status() : await chrome.runtime.sendMessage({ action: 'vault.status' });
    
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
    const result = window.emma?.vault ? await window.emma.vault.status() : await chrome.runtime.sendMessage({ action: 'vault.status' });
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

// LEGACY ORB CODE REMOVED - Universal Emma Orb System handles all orb display
// All orb initialization is now handled by the universal system

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
    const vaultStatus = window.emma?.vault ? await window.emma.vault.status() : await chrome.runtime.sendMessage({ action: 'vault.status' });
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
    initializeUniversalOrbSystem();
  });
} else {
  init();
  initializeUniversalOrbSystem();
}

// Universal orb system handles orb initialization
function initializeUniversalOrbSystem() {
  console.log('🎯 Popup: Universal orb system will handle orb display');
  // The universal orb injection script handles everything now
}






