// js/background-simple.js - Simplified service worker without modules

console.log('Emma Background Script starting...');

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Emma Lite installed:', details.reason);
  
  // Open welcome page on first install
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
  }
});

// Create context menu items (check if API is available)
if (chrome.contextMenus) {
  try {
    chrome.contextMenus.create({
      id: 'save-selection',
      title: 'Save to Emma Memory',
      contexts: ['selection']
    });
    
    chrome.contextMenus.create({
      id: 'search-memories',
      title: 'Search Emma Memories',
      contexts: ['page']
    });
    console.log('Context menus created');
  } catch (error) {
    console.log('Context menu creation failed:', error);
  }
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  switch (request.action) {
    case 'getMTAPStatus':
      sendResponse({ enabled: true, version: '1.0', federation: false });
      break;
      
    case 'toggleMTAP':
      console.log('MTAP toggle:', request.enabled);
      sendResponse({ success: true });
      break;
      
    case 'getStats':
      sendResponse({
        totalMemories: 0,
        todayCount: 0,
        storageUsed: 0,
        lastCapture: null
      });
      break;
      
    case 'getRecentMemories':
      sendResponse({ memories: [] });
      break;
      
    case 'searchMemories':
      sendResponse({ results: [] });
      break;
      
    case 'exportData':
      sendResponse({ data: { memories: [], exported: new Date().toISOString() } });
      break;
      
    case 'importData':
      sendResponse({ success: true, count: 0 });
      break;
      
    default:
      console.log('Unknown action:', request.action);
      sendResponse({ error: 'Unknown action' });
  }
  
  return true; // Keep message channel open for async responses
});

// Context menu handlers (check if API is available)
if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    console.log('Context menu clicked:', info.menuItemId);
    
    if (info.menuItemId === 'save-selection') {
      console.log('Save selection:', info.selectionText);
      // TODO: Implement save selection
    } else if (info.menuItemId === 'search-memories') {
      // Open popup or search interface
      chrome.tabs.create({
        url: chrome.runtime.getURL('memories.html')
      });
    }
  });
}

// Update badge
function updateBadge(count = 0) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

console.log('Emma Background Script loaded');