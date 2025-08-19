# Emma Extension Testing Guide

## Quick Test Instructions

### 1. Reload the Extension
1. Go to `chrome://extensions/`
2. Find "Emma Lite - MTAP Memory Layer"
3. Click the refresh icon
4. Make sure "Developer mode" is ON

### 2. Test Basic Functionality
1. Get your extension ID from `chrome://extensions/`
2. Open the test page using ONE of these methods:
   - **Method A**: Type in address bar: `chrome-extension://[YOUR_EXTENSION_ID]/simple-test.html`
   - **Method B**: Click the Emma extension icon → Right-click → Inspect → In console type:
     ```javascript
     chrome.tabs.create({url: chrome.runtime.getURL('simple-test.html')});
     ```
   - **Method C**: Create a bookmark with the chrome-extension:// URL
2. Run through each test button to verify functionality

### 3. Test Capture on ChatGPT
1. Go to https://chat.openai.com or https://chatgpt.com
2. Open a conversation with some messages
3. Click the Emma extension icon
4. Click "Capture Current Page"
5. Check the browser console (F12) for debug messages
6. Look for the notification that shows capture status

### 4. Test Capture on Claude
1. Go to https://claude.ai
2. Open a conversation
3. Follow same steps as ChatGPT

### 5. Debug if Not Working

#### Option A: Check Console Logs
1. Right-click on the extension popup
2. Select "Inspect"
3. Look at the Console tab for errors
4. Also check the main page console (F12)

#### Option B: Use Debug Script
1. Open ChatGPT or Claude
2. Open browser console (F12)
3. Copy and paste the contents of `debug-capture.js`
4. Look at the output to see what's missing

#### Option C: Manual Content Script Injection
If content scripts aren't loading:
1. Open browser console on ChatGPT/Claude
2. Run this command:
```javascript
chrome.runtime.sendMessage(chrome.runtime.id, {action: 'ping'}, response => {
  console.log('Extension response:', response);
});
```

### Common Issues and Solutions

1. **"Cannot read properties of undefined"**
   - Extension needs to be reloaded
   - Permissions might be missing

2. **"No content script found"**
   - Refresh the ChatGPT/Claude page
   - Make sure the URL matches the manifest patterns

3. **"Failed to send message"**
   - Extension might be disabled
   - Check if extension ID is correct

4. **Nothing happens when clicking capture**
   - Check popup console for errors
   - Check main page console for content script errors
   - Try the test page first

### What Should Happen When Working

1. Click "Capture Current Page"
2. See "Capturing conversation..." notification
3. Messages appear in "Recent Memories" section
4. Memory count increases
5. Can view all memories by clicking "View All Memories"

### Advanced Debugging

To see what's happening inside the extension:

1. **Background Script Logs:**
   - Go to chrome://extensions/
   - Click "Inspect views: service worker"
   - Check console for background script logs

2. **Content Script Logs:**
   - Open DevTools on ChatGPT/Claude page
   - Look for logs starting with "Emma Lite:"

3. **Storage Inspection:**
   - In DevTools, go to Application tab
   - Look under Storage > IndexedDB > emma_memories
   - Check if memories are being stored