# Testing Emma on Claude - Step by Step

## 🔍 What to Look For in Console

**Good Emma Logs (what you SHOULD see):**
```
Emma Lite: Claude content script loaded
Emma Lite: Initializing Claude integration
Emma Lite: Started observing Claude conversations
```

**Bad Logs (what you should NOT see anymore):**
```
❌ Uncaught SyntaxError: Identifier 'CONFIG' has already been declared
```

## 🧪 Test Steps:

### 1. **Check Current Console State**
- Press `F12` to open Developer Tools
- Go to `Console` tab
- Clear the console (`Ctrl+L` or click the 🚫 button)
- **Ignore all Statsig/anthropic.com errors** - those are from Claude's analytics, not Emma

### 2. **Test Emma Extension**
- Click the Emma extension icon (purple brain icon in Chrome toolbar)
- You should see the Emma popup with memory count
- Click **"Capture Current Page"**
- Watch the console for Emma-specific messages

### 3. **Expected Emma Console Output:**
```
🔍 Supported site detected, attempting to capture...
🔍 Content script is already active: {success: true, message: "Claude content script is active"}
🔍 Sending captureNow message...
Emma Lite: Captured X messages
```

### 4. **Check Memory Creation:**
- Look at the Emma extension badge (should show a number)
- Click Emma icon → "View All Memories" 
- Or open: `chrome-extension://[YOUR-ID]/memories.html`

## 🐛 If Still Having Issues:

### **Copy and paste this into Claude's console:**
```javascript
// Test Emma functionality directly
console.log('🔍 Testing Emma on Claude...');

// Check if Emma content script is loaded
if (window.emmaClaudeInjected) {
  console.log('✅ Emma content script is loaded');
} else {
  console.log('❌ Emma content script NOT loaded');
}

// Test message to background
chrome.runtime.sendMessage({action: 'ping'}).then(response => {
  console.log('✅ Background script responding:', response);
}).catch(error => {
  console.log('❌ Background script error:', error);
});

// Test memory creation
chrome.runtime.sendMessage({
  action: 'saveMemory',
  data: {
    content: 'Test memory from Claude console - ' + new Date().toISOString(),
    source: 'claude',
    role: 'user',
    type: 'test'
  }
}).then(response => {
  console.log('✅ Memory save test:', response);
}).catch(error => {
  console.log('❌ Memory save error:', error);
});
```

## 🎯 Success Indicators:

1. **No syntax errors about CONFIG**
2. **Emma content script loads properly**
3. **Memory counter increases when you capture**
4. **Memories appear in the gallery**

## 📞 Report Back:

Tell me:
1. Do you see the good Emma logs?
2. Does the test console script work?
3. Do memories appear in the Emma gallery?
4. Any Emma-specific errors (ignore Statsig errors)?
