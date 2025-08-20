// js/popup.js - Popup interface logic

// Make functions available globally for debugging
window.emmaDebug = {};

// DOM Elements
const elements = {
  mtapToggle: document.getElementById('mtap-toggle'),
  mtapIndicator: document.getElementById('mtap-indicator'),
  totalMemories: document.getElementById('total-memories'),
  storageUsed: document.getElementById('storage-used'),
  todayCount: document.getElementById('today-count'),
  
  // Dashboard elements
  captureBtn: document.getElementById('capture-btn'),
  searchQuickBtn: document.getElementById('search-quick-btn'),
  
  // Memory Management
  viewAllBtn: document.getElementById('view-all-btn'),
  memoriesGalleryBtn: document.getElementById('memories-gallery-btn'),
  createMemoryBtn: document.getElementById('create-memory-btn'),
  constellationBtn: document.getElementById('constellation-btn'),
  
  // People & Relationships
  peopleBtn: document.getElementById('people-btn'),
  addPersonBtn: document.getElementById('add-person-btn'),
  relationshipsBtn: document.getElementById('relationships-btn'),
  shareMemoriesBtn: document.getElementById('share-memories-btn'),
  
  // Data Management
  exportBtn: document.getElementById('export-btn'),
  importBtn: document.getElementById('import-btn'),
  importPageBtn: document.getElementById('import-page-btn'),
  backupBtn: document.getElementById('backup-btn'),
  
  // Tools & Settings
  settingsBtn: document.getElementById('settings-btn'),
  testBtn: document.getElementById('test-btn'),
  welcomeBtn: document.getElementById('welcome-btn'),
  installBtn: document.getElementById('install-btn'),
  privacyBtn: document.getElementById('privacy-btn'),
  helpBtn: document.getElementById('help-btn'),
  aboutBtn: document.getElementById('about-btn'),
  
  // Search panel
  searchPanel: document.getElementById('search-panel'),
  searchInput: document.getElementById('search-input'),
  searchBtn: document.getElementById('search-btn'),
  closeSearch: document.getElementById('close-search'),
  searchResults: document.getElementById('search-results'),
  
  // File input
  importFile: document.getElementById('import-file'),
  
  // Footer
  mtapStatusFooter: document.getElementById('mtap-status-footer')
};

// Initialize popup
async function init() {
  console.log('🔧 POPUP INIT: Starting initialization...');
  console.log('🔧 POPUP INIT: Document ready state:', document.readyState);
  console.log('🔧 POPUP INIT: Chrome APIs available:', {
    chrome: !!chrome,
    runtime: !!(chrome && chrome.runtime),
    tabs: !!(chrome && chrome.tabs)
  });
  
  // Re-query elements in case they weren't ready before
  const elementIds = {
    mtapToggle: 'mtap-toggle',
    mtapIndicator: 'mtap-indicator',
    totalMemories: 'total-memories',
    storageUsed: 'storage-used',
    todayCount: 'today-count',
    captureBtn: 'capture-btn',
    searchQuickBtn: 'search-quick-btn',
    viewAllBtn: 'view-all-btn',
    memoriesGalleryBtn: 'memories-gallery-btn',
    createMemoryBtn: 'create-memory-btn',
    constellationBtn: 'constellation-btn',
    peopleBtn: 'people-btn',
    addPersonBtn: 'add-person-btn',
    relationshipsBtn: 'relationships-btn',
    shareMemoriesBtn: 'share-memories-btn',
    exportBtn: 'export-btn',
    importBtn: 'import-btn',
    importPageBtn: 'import-page-btn',
    backupBtn: 'backup-btn',
    settingsBtn: 'settings-btn',
    headerSettingsBtn: 'header-settings-btn',
    testBtn: 'test-btn',
    welcomeBtn: 'welcome-btn',
    installBtn: 'install-btn',
    privacyBtn: 'privacy-btn',
    helpBtn: 'help-btn',
    aboutBtn: 'about-btn',
    searchPanel: 'search-panel',
    searchInput: 'search-input',
    searchBtn: 'search-btn',
    closeSearch: 'close-search',
    searchResults: 'search-results',
    mtapInfo: 'mtap-info',
    recentMemories: 'recent-memories',
    galleryMemoryCount: 'gallery-memory-count'
  };
  
  Object.keys(elementIds).forEach(key => {
    const id = elementIds[key];
    const element = document.getElementById(id);
    elements[key] = element;
    console.log(`🎯 Element ${key} (${id}):`, element ? 'found' : 'NOT FOUND');
  });
  
  try {
    console.log('🔧 POPUP INIT: Step 1 - Initializing Emma Orb');
    initializeEmmaOrb();
    
    console.log('🔧 POPUP INIT: Step 2 - Attaching event listeners FIRST (critical!)');
    attachEventListeners();
    
    console.log('🔧 POPUP INIT: Step 3 - Updating stats');
    try {
      await Promise.race([
        updateStats(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Stats timeout')), 10000))
      ]);
    } catch (error) {
      console.warn('🔧 POPUP INIT: Stats update failed:', error);
      // Try to set default values
      if (elements.totalMemories) elements.totalMemories.textContent = '0';
      if (elements.todayCount) elements.todayCount.textContent = '0';
      if (elements.storageUsed) elements.storageUsed.textContent = '0 KB';
    }
    
    console.log('🔧 POPUP INIT: Step 4 - Checking MTAP status');
    try {
      await Promise.race([
        checkMTAPStatus(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('MTAP timeout')), 3000))
      ]);
    } catch (error) {
      console.warn('🔧 POPUP INIT: MTAP check failed:', error);
    }
    
    console.log('🔧 POPUP INIT: Step 5 - Loading recent memories');
    try {
      await Promise.race([
        loadRecentMemories(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Memories timeout')), 3000))
      ]);
    } catch (error) {
      console.warn('🔧 POPUP INIT: Recent memories failed:', error);
    }
    
    console.log('Emma Popup: Initialization complete');
    
    // Export functions for debugging
    window.emmaDebug = {
      elements,
      openSettings,
      captureCurrentPage,
      viewAllMemories,
      exportData,
      importData,
      openTestPage,
      testAllButtons: () => {
        console.log('🎯 Testing all buttons...');
        Object.keys(elements).forEach(key => {
          if (key.includes('Btn') && elements[key]) {
            console.log(`🎯 ${key}:`, elements[key]);
            console.log(`🎯 ${key} listeners:`, getEventListeners(elements[key]));
          }
        });
      },
      testCapture: () => {
        console.log('🎯 Testing capture function...');
        captureCurrentPage();
      },
      testViewAll: () => {
        console.log('🎯 Testing view all function...');
        viewAllMemories();
      },
      testButtonClicks: () => {
        console.log('🎯 Testing button click detection...');
        ['captureBtn', 'viewAllBtn', 'settingsBtn', 'mtapToggle'].forEach(btnKey => {
          const btn = elements[btnKey];
          if (btn) {
            console.log(`🎯 Testing ${btnKey}:`, btn);
            btn.click();
          } else {
            console.error(`🎯 ${btnKey} not found!`);
          }
        });
      },
      forceAttachListeners: () => {
        console.log('🎯 Force re-attaching listeners...');
        attachEventListeners();
      }
    };
    console.log('Debug functions exposed at window.emmaDebug');
  } catch (error) {
    console.error('Emma Popup: Initialization error:', error);
  }
}

// Check MTAP status
async function checkMTAPStatus() {
  try {
    // MTAP mode is always enabled
    elements.mtapToggle.checked = true;
    updateMTAPDisplay(true);
    
    // Still check background for consistency
    const response = await chrome.runtime.sendMessage({ action: 'getMTAPStatus' });
    console.log('🔧 MTAP status from background:', response?.mtapMode);
  } catch (error) {
    console.error('Failed to check MTAP status:', error);
    // Always default to MTAP enabled
    elements.mtapToggle.checked = true;
    updateMTAPDisplay(true);
  }
}

// Update MTAP display
function updateMTAPDisplay(enabled) {
  if (enabled) {
    elements.mtapIndicator.classList.add('active');
    elements.mtapInfo.innerHTML = '<small>✅ MTAP Protocol Active - Memories are stored with federation support</small>';
  } else {
    elements.mtapIndicator.classList.remove('active');
    elements.mtapInfo.innerHTML = '<small>⚠️ MTAP Disabled - Using simple local storage</small>';
  }
}

// MTAP mode is always enabled - toggle function kept for compatibility
async function toggleMTAP() {
  const enabled = true; // Always enabled
  
  try {
    // Force MTAP mode regardless of toggle state
    elements.mtapToggle.checked = true;
    
    const response = await chrome.runtime.sendMessage({
      action: 'toggleMTAP',
      enabled: true
    });
    
    if (response.success) {
      updateMTAPDisplay(true);
      showNotification('MTAP Protocol is always enabled', 'info');
      await updateStats();
    }
  } catch (error) {
    console.error('MTAP toggle failed:', error);
    // Always keep MTAP enabled
    elements.mtapToggle.checked = true;
  }
}

// Update statistics
async function updateStats() {
  console.log('🎯 Emma Dashboard: Updating stats...');
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStats' });
    console.log('🎯 Stats response:', response);
    
    if (response && response.success && response.stats) {
      const stats = response.stats;
      const mtapMode = stats.mtapMode ? ' (MTAP)' : '';
      
      console.log('🎯 Updating dashboard counters:', {
        totalMemories: stats.totalMemories,
        storageUsed: stats.storageUsed,
        mtapMode: stats.mtapMode,
        localStorage_mtap: localStorage.getItem('emma_use_mtap')
      });
      
      // Update dashboard counters
      if (elements.totalMemories) {
        elements.totalMemories.textContent = formatNumber(stats.totalMemories || 0) + mtapMode;
      }
      if (elements.storageUsed) {
        elements.storageUsed.textContent = formatBytes(stats.storageUsed || 0);
      }
      if (elements.galleryMemoryCount) {
        elements.galleryMemoryCount.textContent = formatNumber(stats.totalMemories || 0);
      }
      
      // Get today's count
      const todayResponse = await chrome.runtime.sendMessage({
        action: 'getAllMemories',
        limit: 1000
      });
      
      if (todayResponse && todayResponse.success && todayResponse.memories) {
        const today = new Date().setHours(0, 0, 0, 0);
        const todayMemories = todayResponse.memories.filter(m => 
          new Date(m.timestamp).setHours(0, 0, 0, 0) === today
        );
        
        console.log('🎯 Today memories:', todayMemories.length);
        
        if (elements.todayCount) {
          elements.todayCount.textContent = todayMemories.length;
        }
      } else {
        console.log('🎯 No memories found for today calculation');
        if (elements.todayCount) {
          elements.todayCount.textContent = '0';
        }
      }
      
      console.log('🎯 Dashboard stats updated successfully');
    } else {
      console.error('🎯 Invalid stats response:', response);
      // Set default values if response is invalid
      if (elements.totalMemories) elements.totalMemories.textContent = '0';
      if (elements.todayCount) elements.todayCount.textContent = '0';
      if (elements.storageUsed) elements.storageUsed.textContent = '0 KB';
      if (elements.galleryMemoryCount) elements.galleryMemoryCount.textContent = '0';
    }
  } catch (error) {
    console.error('🎯 Failed to update stats:', error);
    // Set error state
    if (elements.totalMemories) elements.totalMemories.textContent = 'Error';
    if (elements.todayCount) elements.todayCount.textContent = 'Error';
    if (elements.storageUsed) elements.storageUsed.textContent = 'Error';
    if (elements.galleryMemoryCount) elements.galleryMemoryCount.textContent = 'Error';
  }
}

// Load recent memories
async function loadRecentMemories() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getAllMemories',
      limit: 5,
      offset: 0
    });
    
    if (response.success && response.memories.length > 0) {
      displayMemories(response.memories, elements.recentMemories);
    } else {
      elements.recentMemories.innerHTML = `
        <div class="empty-state">
          <p>No memories yet</p>
          <small>Start browsing ChatGPT or Claude to capture memories</small>
        </div>
      `;
    }
  } catch (error) {
    console.error('Failed to load recent memories:', error);
  }
}

// Display memories
function displayMemories(memories, container) {
  container.innerHTML = memories.map(memory => `
    <div class="memory-item" data-id="${memory.id}">
      <div class="memory-content">
        ${escapeHtml(truncate(memory.content, 150))}
      </div>
      <div class="memory-meta">
        <span class="memory-source ${memory.source}">${memory.source || 'unknown'}</span>
        <span class="memory-role">${memory.role || 'user'}</span>
        <span class="memory-time">${formatTime(memory.timestamp)}</span>
        <button class="delete-btn" data-id="${memory.id}" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');
  
  // Add delete handlers
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteMemory(btn.dataset.id);
    });
  });
  
  // Add click to expand
  container.querySelectorAll('.memory-item').forEach(item => {
    item.addEventListener('click', () => {
      item.classList.toggle('expanded');
    });
  });
}

// Search memories
async function searchMemories() {
  const query = elements.searchInput.value.trim();
  
  if (!query) {
    hideSearchResults();
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'searchMemories',
      query
    });
    
    if (response.success) {
      if (response.results.length > 0) {
        displayMemories(response.results, elements.resultsContainer);
        showSearchResults();
      } else {
        elements.resultsContainer.innerHTML = `
          <div class="empty-state">
            <p>No memories found for "${escapeHtml(query)}"</p>
          </div>
        `;
        showSearchResults();
      }
    }
  } catch (error) {
    console.error('Search failed:', error);
  }
}

// Show/hide search results
function showSearchResults() {
  elements.searchResults.classList.remove('hidden');
}

function hideSearchResults() {
  elements.searchResults.classList.add('hidden');
  elements.searchInput.value = '';
}

// Capture current page using Universal Content Script
async function captureCurrentPage() {
  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      showNotification('No active tab found', 'error');
      return;
    }
    
    console.log('🎯 Universal Capture: Starting capture for:', tab.url);
    
    // With the hybrid engine, we support ALL sites now
    const isValidUrl = tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'));
    
    if (!isValidUrl) {
      showNotification('Cannot capture from this type of page', 'error');
      return;
    }

    // Test if our universal content script is active
    try {
      console.log('🔍 Testing universal content script...');
      const pingResponse = await Promise.race([
        chrome.tabs.sendMessage(tab.id, { action: 'ping' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 2000))
      ]);
      
      console.log('✅ Universal content script active:', pingResponse);
      
      // Content script is active, send capture request
      showNotification('Analyzing page content...', 'info');
      
      const captureResponse = await Promise.race([
        chrome.tabs.sendMessage(tab.id, { action: 'captureNow' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Capture timeout')), 10000))
      ]);
      
      console.log('📸 Capture response:', captureResponse);
      
      if (captureResponse && captureResponse.success) {
        const count = captureResponse.count || 'some';
        showNotification(`✅ Captured ${count} memories from this page!`, 'success');
      } else {
        showNotification(`⚠️ ${captureResponse?.message || 'Capture completed with no content'}`, 'warning');
      }
      
    } catch (pingError) {
      console.log('⚠️ Universal content script not responding, will inject...', pingError.message);
      
      // Content script not active, need to inject it
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['js/content-universal.js']
        });
        
        console.log('💉 Universal content script injected');
        showNotification('Initializing Emma on this page...', 'info');
        
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
          const finalCaptureResponse = await Promise.race([
            chrome.tabs.sendMessage(tab.id, { action: 'captureNow' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Final capture timeout')), 10000))
          ]);
          
          console.log('🎯 Final capture response:', finalCaptureResponse);
          
          if (finalCaptureResponse && finalCaptureResponse.success) {
            const count = finalCaptureResponse.count || 'some';
            showNotification(`✅ Captured ${count} memories from this page!`, 'success');
          } else {
            showNotification(`⚠️ ${finalCaptureResponse?.message || 'No content found to capture'}`, 'warning');
          }
        } else {
          showNotification('❌ Failed to initialize Emma on this page', 'error');
        }
        
      } catch (injectionError) {
        console.error('💥 Failed to inject universal content script:', injectionError);
        showNotification('❌ Failed to inject Emma: ' + injectionError.message, 'error');
      }
    }
    
    // Refresh stats after capture attempt
    setTimeout(async () => {
      try {
        await updateStats();
        await loadRecentMemories();
      } catch (updateError) {
        console.log('📊 Stats update after capture failed:', updateError);
      }
    }, 1000);
      console.log('Supported site detected, attempting to capture...');
      
      // First, check if content script is injected (with longer timeout for Claude)
      try {
        console.log('Testing if content script is already active...');
        const pingResponse = await Promise.race([
          chrome.tabs.sendMessage(tab.id, { action: 'ping' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 3000))
        ]);
        console.log('Content script is already active:', pingResponse);
      } catch (e) {
        console.log('Content script not responding, attempting to inject...', e.message);
        
        // Determine which script to inject based on URL
        let scriptFile;
        let cssFile = 'css/content.css';
        
        if (tab.url.includes('claude.ai')) {
          scriptFile = 'js/content-claude.js';
        } else if (tab.url.includes('chat.openai.com') || tab.url.includes('chatgpt.com')) {
          scriptFile = 'js/content-chatgpt.js';
        } else {
          scriptFile = 'js/content-chatgpt.js'; // Default fallback
        }
        
        try {
          console.log(`Attempting to inject ${scriptFile} into tab ${tab.id}`);
          
          // For Claude, use direct injection without reload
          if (tab.url.includes('claude.ai')) {
            console.log('Claude detected - using direct injection');
            
            try {
              // Inject the content script directly
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: [scriptFile]
              });
              
              console.log('Content script injected, waiting for initialization...');
              showNotification('Initializing Emma on Claude...', 'info');
              
              // Wait longer for Claude's SPA to be ready
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              // Try to ping with multiple attempts
              let pingSuccess = false;
              for (let i = 0; i < 5; i++) {
                try {
                  const pingTest = await Promise.race([
                    chrome.tabs.sendMessage(tab.id, { action: 'ping' }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 2000))
                  ]);
                  
                  console.log('Content script responding:', pingTest);
                  pingSuccess = true;
                  showNotification('Emma ready on Claude!', 'success');
                  break;
                } catch (pingError) {
                  console.log(`Ping attempt ${i + 1} failed, retrying...`);
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              }
              
              if (!pingSuccess) {
                console.warn('Content script not responding after injection');
                showNotification('Emma may need page refresh - try again', 'warning');
              }
              
            } catch (injectionError) {
              console.error('Claude injection failed:', injectionError);
              showNotification('Failed to inject Emma on Claude', 'error');
              return;
            }
          } else {
            // For other sites, use standard injection
            console.log('Standard injection for non-Claude site');
            
            // Inject CSS first (this won't error if already injected)
            try {
              await chrome.scripting.insertCSS({
                target: { tabId: tab.id },
                files: [cssFile]
              });
            } catch (cssError) {
              console.log('CSS injection skipped:', cssError.message);
            }
            
            // Then inject JS
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: [scriptFile]
            });
            
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          console.log('Content script injection process completed');
          
        } catch (injectionError) {
          console.error('Failed to inject content script:', injectionError);
          showNotification('Failed to initialize Emma: ' + injectionError.message, 'error');
          return;
        }
      }
      
      // Now send the capture message with retries
      try {
        console.log('Sending captureNow message...');
        
        let captureSuccess = false;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (!captureSuccess && attempts < maxAttempts) {
          attempts++;
          console.log(`Capture attempt ${attempts}/${maxAttempts}`);
          
          try {
            const response = await Promise.race([
              chrome.tabs.sendMessage(tab.id, { action: 'captureNow' }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Capture timeout')), 10000))
            ]);
            
            console.log('Capture response:', response);
            
            if (response && response.success) {
              showNotification('Conversation captured successfully!');
              captureSuccess = true;
            } else {
              showNotification('Capture completed (no response confirmation)');
              captureSuccess = true; // Assume success even without confirmation
            }
          } catch (attemptError) {
            console.log(`Capture attempt ${attempts} failed:`, attemptError);
            
            if (attempts < maxAttempts) {
              console.log('Waiting before retry...');
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        if (!captureSuccess) {
          throw new Error(`Failed after ${maxAttempts} attempts`);
        }
        
        // Refresh stats after successful capture
        setTimeout(async () => {
          try {
            await updateStats();
            await loadRecentMemories();
          } catch (updateError) {
            console.log('Stats update after capture failed:', updateError);
          }
        }, 2000);
        
      } catch (captureError) {
        console.error('All capture attempts failed:', captureError);
        showNotification('Failed to capture conversation: ' + captureError.message, 'error');
      }
    } else {
      console.log('Not a supported site, creating bookmark...');
      
      // Capture page title and URL as a bookmark
      const response = await chrome.runtime.sendMessage({
        action: 'saveMemory',
        data: {
          content: `Bookmarked: ${tab.title}`,
          source: 'bookmark',
          url: tab.url,
          type: 'bookmark',
          metadata: {
            pageTitle: tab.title,
            favicon: tab.favIconUrl
          }
        }
      });
      
      if (response.success) {
        showNotification('Page bookmarked to memory');
        await updateStats();
        await loadRecentMemories();
      }
    }
  } catch (error) {
    console.error('Capture failed:', error);
    showNotification('Failed to capture: ' + error.message, 'error');
  }
}

// View all memories
async function viewAllMemories() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('memories.html')
  });
}

// View memories gallery
async function viewMemoriesGallery() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('memories-gallery.html')
  });
}

// Open welcome page
function openWelcome() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('welcome.html')
  });
}

// Open install guide
function openInstallGuide() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('INSTALL.html')
  });
}

// Open privacy policy
function openPrivacy() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('privacy.html')
  });
}

// Open help/documentation
function openHelp() {
  chrome.tabs.create({
    url: 'https://github.com/emma-hml/docs'
  });
}

// Open about page
function openAbout() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('about.html')
  });
}

// Memory creation functions
function openCreateMemory() {
  // For now, redirect to memories page with create flag
  chrome.tabs.create({
    url: chrome.runtime.getURL('memories.html?create=true')
  });
}

function openConstellation() {
  // Future: constellation visualization page
  showNotification('Constellation view coming soon!', 'info');
}

// People management functions
function openPeople() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('people.html')
  });
}

function openAddPerson() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('add-person.html')
  });
}

function openRelationships() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('relationships.html')
  });
}

function openShareMemories() {
  showNotification('Memory sharing feature coming soon!', 'info');
}

// Data management functions
function openImportPage() {
  showNotification('Import wizard coming soon!', 'info');
}

function openBackup() {
  showNotification('Backup feature coming soon!', 'info');
}

// Show search panel
function showSearchPanel() {
  const searchPanel = elements.searchPanel;
  if (searchPanel) {
    searchPanel.classList.remove('hidden');
    // Focus search input after animation
    setTimeout(() => {
      if (elements.searchInput) {
        elements.searchInput.focus();
      }
    }, 300);
  }
}

// Hide search panel
function hideSearchPanel() {
  const searchPanel = elements.searchPanel;
  if (searchPanel) {
    searchPanel.classList.add('hidden');
    // Clear search results
    if (elements.searchResults) {
      elements.searchResults.innerHTML = '';
    }
    // Clear search input
    if (elements.searchInput) {
      elements.searchInput.value = '';
    }
  }
}

// Export data
async function exportData() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'exportData' });
    
    if (response.success) {
      const data = response.data;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `emma-memories-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      showNotification('Data exported successfully');
    }
  } catch (error) {
    console.error('Export failed:', error);
    showNotification('Export failed', 'error');
  }
}

// Import data
async function importData() {
  elements.importFile.click();
}

async function handleImport(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    const response = await chrome.runtime.sendMessage({
      action: 'importData',
      data
    });
    
    if (response.success) {
      showNotification(`Imported ${response.result.imported} memories`);
      await updateStats();
      await loadRecentMemories();
    }
  } catch (error) {
    console.error('Import failed:', error);
    showNotification('Import failed', 'error');
  }
}

// Delete memory
async function deleteMemory(id) {
  if (!confirm('Delete this memory?')) return;
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'deleteMemory',
      id
    });
    
    if (response.success) {
      showNotification('Memory deleted');
      await updateStats();
      await loadRecentMemories();
    }
  } catch (error) {
    console.error('Delete failed:', error);
  }
}

// Open settings
function openSettings() {
  console.log('Emma Popup: Opening settings page...');
  try {
    chrome.runtime.openOptionsPage();
  } catch (error) {
    console.error('Emma Popup: Failed to open settings:', error);
    // Fallback: open in new tab
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
  }
}

// Open test page
function openTestPage() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('simple-test.html')
  });
}

// Show notification
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Utility functions
function formatNumber(num) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
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
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Attach event listeners
function attachEventListeners() {
  console.log('🔧 POPUP: Attaching event listeners...');
  console.log('🔧 POPUP: Elements available:', Object.keys(elements).length);
  
  // Debug: Check which elements exist
  const missingElements = [];
  Object.keys(elements).forEach(key => {
    if (!elements[key]) {
      missingElements.push(key);
    }
  });
  
  if (missingElements.length > 0) {
    console.warn('🎯 Missing elements:', missingElements);
  }
  
  console.log('🎯 Key elements check:');
  console.log('- Settings button:', !!elements.settingsBtn);
  console.log('- Capture button:', !!elements.captureBtn);
  console.log('- View all button:', !!elements.viewAllBtn);
  console.log('- MTAP toggle:', !!elements.mtapToggle);
  
  // MTAP toggle
  if (elements.mtapToggle) {
    elements.mtapToggle.addEventListener('change', toggleMTAP);
    console.log('🎯 MTAP toggle listener attached');
  }
  
  // Primary action buttons
  if (elements.captureBtn) {
    console.log('🎯 Attaching capture button listener');
    
    elements.captureBtn.addEventListener('click', (e) => {
      console.log('🎯 Capture button CLICKED!', e);
      e.preventDefault();
      e.stopPropagation();
      captureCurrentPage();
    });
  } else {
    console.error('🎯 Capture button not found!');
  }
  
  if (elements.searchQuickBtn) {
    elements.searchQuickBtn.addEventListener('click', showSearchPanel);
    console.log('🎯 Search quick button listener attached');
  }

  if (elements.viewAllBtn) {
    console.log('🎯 Attaching view all button listener');
    
    elements.viewAllBtn.addEventListener('click', (e) => {
      console.log('🎯 View all button CLICKED!', e);
      e.preventDefault();
      e.stopPropagation();
      viewAllMemories();
    });
  } else {
    console.error('🎯 View all button not found!');
  }
  
  if (elements.memoriesGalleryBtn) {
    console.log('🎯 Attaching memories gallery button listener');
    
    elements.memoriesGalleryBtn.addEventListener('click', (e) => {
      console.log('🎯 Memories gallery button CLICKED!', e);
      e.preventDefault();
      e.stopPropagation();
      viewMemoriesGallery();
    });
    
    elements.memoriesGalleryBtn.addEventListener('mousedown', (e) => {
      console.log('🎯 Memories gallery button MOUSEDOWN!', e);
    });
    
    // Test if element is clickable
    console.log('🎯 Memories gallery button properties:', {
      display: window.getComputedStyle(elements.memoriesGalleryBtn).display,
      pointerEvents: window.getComputedStyle(elements.memoriesGalleryBtn).pointerEvents,
      zIndex: window.getComputedStyle(elements.memoriesGalleryBtn).zIndex,
      position: window.getComputedStyle(elements.memoriesGalleryBtn).position
    });
  } else {
    console.error('🎯 Memories gallery button not found!');
  }
  
  // Memory management buttons
  if (elements.createMemoryBtn) {
    elements.createMemoryBtn.addEventListener('click', openCreateMemory);
    console.log('🎯 Create memory button listener attached');
  }
  
  if (elements.constellationBtn) {
    elements.constellationBtn.addEventListener('click', openConstellation);
    console.log('🎯 Constellation button listener attached');
  }

  // People & Relationships buttons
  if (elements.peopleBtn) {
    elements.peopleBtn.addEventListener('click', openPeople);
    console.log('🎯 People button listener attached');
  }
  
  if (elements.addPersonBtn) {
    elements.addPersonBtn.addEventListener('click', openAddPerson);
    console.log('🎯 Add person button listener attached');
  }
  
  if (elements.relationshipsBtn) {
    elements.relationshipsBtn.addEventListener('click', openRelationships);
    console.log('🎯 Relationships button listener attached');
  }
  
  if (elements.shareMemoriesBtn) {
    elements.shareMemoriesBtn.addEventListener('click', openShareMemories);
    console.log('🎯 Share memories button listener attached');
  }

  // Data management buttons
  if (elements.exportBtn) {
    elements.exportBtn.addEventListener('click', exportData);
    console.log('🎯 Export button listener attached');
  }
  
  if (elements.importBtn) {
    elements.importBtn.addEventListener('click', () => {
      if (elements.importFile) elements.importFile.click();
    });
    console.log('🎯 Import button listener attached');
  }
  
  if (elements.importPageBtn) {
    elements.importPageBtn.addEventListener('click', openImportPage);
    console.log('🎯 Import page button listener attached');
  }
  
  if (elements.backupBtn) {
    elements.backupBtn.addEventListener('click', openBackup);
    console.log('🎯 Backup button listener attached');
  }

  // Tools & settings buttons
  if (elements.settingsBtn) {
    elements.settingsBtn.addEventListener('click', openSettings);
    console.log('🎯 Settings button listener attached');
  }
  if (elements.headerSettingsBtn) {
    elements.headerSettingsBtn.addEventListener('click', openSettings);
    console.log('🎯 Header settings button listener attached');
  }
  
  if (elements.testBtn) {
    elements.testBtn.addEventListener('click', openTestPage);
    console.log('🎯 Test button listener attached');
  }
  
  if (elements.welcomeBtn) {
    elements.welcomeBtn.addEventListener('click', openWelcome);
    console.log('🎯 Welcome button listener attached');
  }
  
  if (elements.installBtn) {
    elements.installBtn.addEventListener('click', openInstallGuide);
    console.log('🎯 Install button listener attached');
  }

  // Information buttons
  if (elements.privacyBtn) {
    elements.privacyBtn.addEventListener('click', openPrivacy);
    console.log('🎯 Privacy button listener attached');
  }
  
  if (elements.helpBtn) {
    elements.helpBtn.addEventListener('click', openHelp);
    console.log('🎯 Help button listener attached');
  }
  
  if (elements.aboutBtn) {
    elements.aboutBtn.addEventListener('click', openAbout);
    console.log('🎯 About button listener attached');
  }

  // Search panel functionality
  if (elements.searchBtn) {
    elements.searchBtn.addEventListener('click', searchMemories);
  }
  
  if (elements.searchInput) {
    elements.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') searchMemories();
    });
  }
  
  if (elements.closeSearch) {
    elements.closeSearch.addEventListener('click', hideSearchPanel);
  }
  
  // Duplicate event listeners removed - already handled above
  
  // Import file
  if (elements.importFile) {
    elements.importFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleImport(file);
      e.target.value = ''; // Reset
    });
  }
  
  // Footer links
  if (elements.helpLink) {
    elements.helpLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com/emma-hml/docs' });
    });
  }
  
  if (elements.privacyLink) {
    elements.privacyLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('privacy.html') });
    });
  }
  
  if (elements.aboutLink) {
    elements.aboutLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('about.html') });
    });
  }
  
  console.log('🔧 POPUP: All event listeners attached successfully! ✅');
}

// Emma Orb WebGL Implementation for Popup
function initializeEmmaOrb() {
  console.log('Initializing Emma Orb...');
  
  const canvas = document.getElementById('emma-orb-canvas');
  const fallback = document.getElementById('emma-orb-fallback');
  
  if (!canvas) {
    console.log('Emma Orb canvas not found');
    return;
  }
  
  try {
    new EmmaOrbPopup(canvas, fallback);
  } catch (error) {
    console.error('Failed to initialize Emma Orb:', error);
    if (fallback) {
      fallback.style.display = 'flex';
    }
  }
}

class EmmaOrbPopup {
  constructor(canvas, fallback) {
    this.canvas = canvas;
    this.fallback = fallback;
    this.textOverlay = document.querySelector('.emma-orb-text-overlay');
    this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    this.program = null;
    this.startTime = Date.now();
    this.animationId = null;
    
    if (this.gl) {
      try {
        this.init();
        console.log('Emma Orb: WebGL initialized successfully');
        if (this.fallback) {
          this.fallback.style.display = 'none';
        }
        // Keep text overlay visible for WebGL (WebGL only renders the orb background)
        if (this.textOverlay) {
          this.textOverlay.style.display = 'block';
        }
      } catch (error) {
        console.error('Emma Orb: WebGL initialization failed:', error);
        this.fallbackToCSS();
      }
    } else {
      console.log('WebGL not supported, using CSS fallback');
      this.fallbackToCSS();
    }
  }
  
  fallbackToCSS() {
    this.canvas.style.display = 'none';
    if (this.fallback) {
      this.fallback.style.display = 'flex';
      console.log('Emma Orb: CSS fallback activated');
    }
    // Show text overlay for CSS fallback
    if (this.textOverlay) {
      this.textOverlay.style.display = 'block';
    }
  }
  
  init() {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, this.vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, this.fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) {
      throw new Error('Failed to compile shaders');
    }
    
    this.program = this.createProgram(vertexShader, fragmentShader);
    if (!this.program) {
      throw new Error('Failed to create shader program');
    }
    
    this.setupGeometry();
    this.render();
  }
  
  createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }
  
  createProgram(vertexShader, fragmentShader) {
    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Program linking error:', this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      return null;
    }
    
    return program;
  }
  
  setupGeometry() {
    const vertices = new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      1, 1
    ]);
    
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    
    const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
  }
  
  render() {
    const gl = this.gl;
    const time = (Date.now() - this.startTime) / 1000;
    
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.useProgram(this.program);
    
    // Set uniforms
    const timeLocation = gl.getUniformLocation(this.program, 'u_time');
    const resolutionLocation = gl.getUniformLocation(this.program, 'u_resolution');
    const hueLocation = gl.getUniformLocation(this.program, 'u_hue');
    
    gl.uniform1f(timeLocation, time);
    gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);
    gl.uniform1f(hueLocation, 250.0); // Emma's purple hue
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    this.animationId = requestAnimationFrame(() => this.render());
  }
  
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
  
  get vertexShaderSource() {
    return `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
  }
  
  get fragmentShaderSource() {
    return `
      precision mediump float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_hue;
      
      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(uv, center);
        
        // Create orb shape
        float circle = 1.0 - smoothstep(0.35, 0.5, dist);
        
        // Add flowing colors with more subtle animation
        float hue = u_hue / 360.0 + sin(u_time * 0.3 + dist * 8.0) * 0.05;
        float sat = 0.9 + sin(u_time * 0.5 + uv.x * 4.0) * 0.1;
        float val = 0.95 + sin(u_time * 0.2 + uv.y * 6.0) * 0.05;
        
        vec3 color = hsv2rgb(vec3(hue, sat, val));
        
        // Add gentle glow effect
        float glow = exp(-dist * 2.5) * 0.3;
        color += glow * vec3(0.4, 0.15, 0.8);
        
        // Add subtle inner light
        float inner = exp(-dist * 1.5) * 0.2;
        color += inner * vec3(1.0, 1.0, 1.0);
        
        gl_FragColor = vec4(color * circle, circle);
      }
    `;
  }
}

// Debug logging before everything
console.log('🔧 POPUP.JS: Script loading started');
console.log('🔧 POPUP.JS: Document ready state:', document.readyState);

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);

// Also try immediate initialization if DOM is already ready
if (document.readyState === 'loading') {
  console.log('🔧 POPUP.JS: DOM still loading, waiting for DOMContentLoaded');
} else {
  console.log('🔧 POPUP.JS: DOM already ready, initializing immediately');
  setTimeout(init, 100); // Small delay to ensure everything is ready
}

console.log('🔧 POPUP.JS: Script end reached');