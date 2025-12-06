// js/background-with-storage.js - Background script with actual memory storage

console.log('Emma Background Script with Storage starting...');

// Simple in-memory storage (we'll use IndexedDB for real storage)
let memoryStorage = [];
let settingsStorage = {
  useMTAP: true,
  autoCapture: true
};

// Initialize IndexedDB
let db = null;

async function initDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('EmmaLiteDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      console.log('Emma Database initialized');
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // Create memories store
      if (!database.objectStoreNames.contains('memories')) {
        const memoryStore = database.createObjectStore('memories', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        memoryStore.createIndex('timestamp', 'timestamp', { unique: false });
        memoryStore.createIndex('source', 'source', { unique: false });
        memoryStore.createIndex('type', 'type', { unique: false });
      }
      
      // Create settings store
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }
      
      console.log('Emma Database schema created');
    };
  });
}

// Add memory to IndexedDB
async function addMemoryToDB(memoryData) {
  if (!db) await initDatabase();
  
  const memory = {
    ...memoryData,
    id: Date.now() + Math.random(), // Simple ID
    timestamp: Date.now(),
    searchText: memoryData.content.toLowerCase()
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['memories'], 'readwrite');
    const store = transaction.objectStore('memories');
    const request = store.add(memory);
    
    request.onsuccess = () => {
      console.log('Memory saved to DB:', memory.id);
      resolve(memory.id);
    };
    
    request.onerror = () => {
      console.error('Failed to save memory:', request.error);
      reject(request.error);
    };
  });
}

// Get all memories from IndexedDB
async function getAllMemoriesFromDB() {
  if (!db) await initDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['memories'], 'readonly');
    const store = transaction.objectStore('memories');
    const request = store.getAll();
    
    request.onsuccess = () => {
      console.log('Retrieved memories:', request.result.length);
      resolve(request.result);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Get recent memories
async function getRecentMemories(limit = 5) {
  const allMemories = await getAllMemoriesFromDB();
  return allMemories
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
    .map(memory => ({
      id: memory.id,
      content: memory.content,
      source: memory.source,
      timestamp: memory.timestamp,
      preview: memory.content.substring(0, 100) + '...',
      messageCount: 1
    }));
}

// Search memories
async function searchMemoriesInDB(query) {
  const allMemories = await getAllMemoriesFromDB();
  const lowerQuery = query.toLowerCase();
  
  return allMemories
    .filter(memory => memory.searchText.includes(lowerQuery))
    .map(memory => ({
      id: memory.id,
      content: memory.content,
      source: memory.source,
      timestamp: memory.timestamp,
      preview: memory.content.substring(0, 100) + '...',
      relevance: 0.8 // Simple relevance score
    }));
}

// Get stats
async function getStats() {
  const allMemories = await getAllMemoriesFromDB();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayMemories = allMemories.filter(m => m.timestamp >= today.getTime());
  const lastMemory = allMemories.sort((a, b) => b.timestamp - a.timestamp)[0];
  
  return {
    totalMemories: allMemories.length,
    todayCount: todayMemories.length,
    storageUsed: JSON.stringify(allMemories).length, // Approximate
    lastCapture: lastMemory ? lastMemory.timestamp : null
  };
}

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Emma Lite installed:', details.reason);
  
  // Initialize database
  await initDatabase();
  
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
  
  // Handle async operations
  const handleAsync = async () => {
    try {
      switch (request.action) {
        case 'saveMemory':
          console.log('Saving memory:', request.data);
          const memoryId = await addMemoryToDB(request.data);
          await updateBadge();
          return { success: true, id: memoryId };
          
        case 'getMTAPStatus':
          return { enabled: settingsStorage.useMTAP, version: '1.0', federation: false };
          
        case 'toggleMTAP':
          console.log('MTAP toggle:', request.enabled);
          settingsStorage.useMTAP = request.enabled;
          return { success: true };
          
        case 'getStats':
          return await getStats();
          
        case 'getRecentMemories':
          const recentMemories = await getRecentMemories(request.limit || 5);
          return { memories: recentMemories };
          
        case 'searchMemories':
          const searchResults = await searchMemoriesInDB(request.query);
          return { results: searchResults };
          
        case 'getAllMemories':
          const allMemories = await getAllMemoriesFromDB();
          return { memories: allMemories };
          
        case 'exportData':
          const exportMemories = await getAllMemoriesFromDB();
          return { 
            data: { 
              memories: exportMemories, 
              exported: new Date().toISOString(),
              version: '1.0'
            } 
          };
          
        case 'importData':
          // TODO: Implement import
          return { success: true, count: 0 };
          
        case 'deleteMemory':
          // TODO: Implement delete
          return { success: true };
          
        default:
          console.log('Unknown action:', request.action);
          return { error: 'Unknown action' };
      }
    } catch (error) {
      console.error('Message handler error:', error);
      return { error: error.message };
    }
  };
  
  // Execute async handler
  handleAsync().then(sendResponse).catch(error => {
    console.error('Async handler error:', error);
    sendResponse({ error: error.message });
  });
  
  return true; // Keep message channel open for async responses
});

// Context menu handlers (check if API is available)
if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    console.log('Context menu clicked:', info.menuItemId);
    
    if (info.menuItemId === 'save-selection') {
      console.log('Save selection:', info.selectionText);
      await addMemoryToDB({
        content: info.selectionText,
        role: 'user',
        source: 'selection',
        url: tab.url,
        type: 'text_selection',
        metadata: {
          pageTitle: tab.title
        }
      });
    } else if (info.menuItemId === 'search-memories') {
      // Open memories page
      chrome.tabs.create({
        url: chrome.runtime.getURL('memories.html')
      });
    }
  });
}

// Update badge with memory count
async function updateBadge() {
  try {
    const stats = await getStats();
    const count = stats.totalMemories;
    
    if (count > 0) {
      chrome.action.setBadgeText({ text: count.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#9333ea' }); // Emma purple
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (error) {
    console.error('Badge update error:', error);
  }
}

// Initialize database when script loads
initDatabase().then(() => {
  console.log('Emma Background Script with Storage loaded');
  updateBadge();
});