# 🔍 ChatGPT Capture Debug Guide

## Issue:
ChatGPT capture says "captured 1" but doesn't show in counter or gallery.

## Possible Causes:

1. **Content Script Not Injecting** - ChatGPT selectors may have changed
2. **Background Communication Failing** - Message not reaching background script
3. **Database Save Failing** - Memory saves but badge doesn't update
4. **Badge Update Issue** - Save works but counter doesn't refresh

## Debug Steps:

### Step 1: Test ChatGPT Page
1. **Go to ChatGPT** (chat.openai.com)
2. **Open browser console** (F12)
3. **Copy/paste entire contents of `chatgpt-debug.js`**
4. **Review all test results**

### Step 2: Expected Debug Output
```
🔍 ChatGPT Capture Debug Starting...
1. Content script check: LOADED
2. Chrome APIs: {runtime: "object", sendMessage: "function"}
3. Testing background communication...
   ✅ Background response: {totalMemories: 3, todayCount: 3, ...}
4. Testing manual memory save...
   ✅ Save response: {success: true, id: "..."}
   📊 Stats after save: {totalMemories: 4, todayCount: 4, ...}
5. Checking ChatGPT selectors...
   messages: 10 found
   userMessage: 5 found
   assistantMessage: 5 found
6. Testing capture function...
   ✅ captureNow executed
7. Checking IndexedDB directly...
   📁 Database contents: 4 memories
   🤖 ChatGPT memories: 1
```

### Step 3: Manual Test
After running debug script:
1. **Check Emma badge** - Should show updated count
2. **Open Memory Gallery** - Should see new ChatGPT memory
3. **Try capture again** - Click Emma → "Capture Current Page"

### Step 4: Common Issues & Fixes

#### Issue: Content Script Not Loading
```
1. Content script check: NOT LOADED
```
**Fix**: Reload extension, refresh ChatGPT page

#### Issue: Background Communication Failing
```
❌ Background error: Could not establish connection
```
**Fix**: Background script crashed, reload extension

#### Issue: Selectors Not Working
```
messages: 0 found
userMessage: 0 found
```
**Fix**: ChatGPT changed their HTML structure, selectors need updating

#### Issue: Save Success but No Counter Update
```
✅ Save response: {success: true}
Badge still shows old count
```
**Fix**: Badge update function not working properly

## Quick Fixes:

### Force Badge Update
```javascript
// In popup console
chrome.runtime.sendMessage({action: 'getStats'}, (stats) => {
  console.log('Current stats:', stats);
  // Badge should update
});
```

### Manual ChatGPT Capture Test
```javascript
// In ChatGPT console
chrome.runtime.sendMessage({
  action: 'saveMemory',
  data: {
    content: 'Manual test from ChatGPT',
    role: 'user',
    source: 'chatgpt',
    url: window.location.href,
    type: 'test'
  }
}, (response) => {
  console.log('Manual save result:', response);
});
```

**Run the debug script and let me know what output you get!** 🎯