# 🔍 Memory Storage Debug Guide

## Issue Found:
The simplified background script was returning **hardcoded empty responses** instead of using the database!

## Fix Applied:
Created `js/background-with-storage.js` that:
- ✅ Actually stores memories in IndexedDB
- ✅ Handles `saveMemory` actions from content scripts
- ✅ Returns real memory data
- ✅ Updates badge count
- ✅ Provides search and stats

## Test Now:

### 1. Reload Extension
```
chrome://extensions/ → Emma → Refresh
```

### 2. Test Memory Capture
1. **Go to Claude.ai**
2. **Have a conversation**
3. **Click Emma icon** → Click "Capture Current Page"
4. **Check the badge** → Should show memory count

### 3. Check Database Contents
**Paste this in popup console:**
```javascript
// Check IndexedDB directly
const request = indexedDB.open('EmmaLiteDB', 1);
request.onsuccess = (event) => {
  const db = event.target.result;
  const transaction = db.transaction(['memories'], 'readonly');
  const store = transaction.objectStore('memories');
  const getAllRequest = store.getAll();
  
  getAllRequest.onsuccess = () => {
    console.log('Direct DB contents:', getAllRequest.result);
    console.log('Memory count:', getAllRequest.result.length);
  };
};
```

### 4. Test Memory Retrieval
**Paste this in popup console:**
```javascript
// Test background script communication
chrome.runtime.sendMessage({action: 'getStats'}, (response) => {
  console.log('Stats:', response);
});

chrome.runtime.sendMessage({action: 'getAllMemories'}, (response) => {
  console.log('All memories:', response);
});

chrome.runtime.sendMessage({action: 'getRecentMemories'}, (response) => {
  console.log('Recent memories:', response);
});
```

### 5. Expected Results:
- **Badge shows memory count** (e.g., "3")
- **Console shows actual memories** with content
- **Memories page displays** captured conversations
- **Stats show real numbers**

## Debug Console Commands:

### Check Background Script
```javascript
// Check if background script is working
chrome.runtime.sendMessage({action: 'getStats'}, console.log);
```

### Force Memory Save Test
```javascript
// Test manual memory save
chrome.runtime.sendMessage({
  action: 'saveMemory',
  data: {
    content: 'Test memory content',
    role: 'user',
    source: 'test',
    url: window.location.href,
    type: 'test'
  }
}, console.log);
```

**The new background script should now actually store and retrieve memories!** 🎯