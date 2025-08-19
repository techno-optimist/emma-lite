// Debug script for ChatGPT capture issues
// Copy/paste this in ChatGPT page console to debug

console.log('🔍 ChatGPT Capture Debug Starting...');

// Check if content script is loaded
console.log('1. Content script check:', typeof captureMessage !== 'undefined' ? 'LOADED' : 'NOT LOADED');

// Check Chrome APIs
console.log('2. Chrome APIs:', {
  runtime: typeof chrome?.runtime,
  sendMessage: typeof chrome?.runtime?.sendMessage
});

// Test background communication
async function testBackgroundComm() {
  console.log('3. Testing background communication...');
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getStats'
    });
    console.log('   ✅ Background response:', response);
  } catch (error) {
    console.log('   ❌ Background error:', error);
  }
}

// Test manual memory save
async function testManualSave() {
  console.log('4. Testing manual memory save...');
  
  try {
    const testMemory = {
      content: 'Test memory from ChatGPT debug',
      role: 'user',
      source: 'chatgpt',
      url: window.location.href,
      type: 'test',
      metadata: {
        messageId: 'debug-' + Date.now(),
        conversationTitle: 'Debug Test'
      }
    };
    
    const response = await chrome.runtime.sendMessage({
      action: 'saveMemory',
      data: testMemory
    });
    
    console.log('   ✅ Save response:', response);
    
    // Check stats after save
    const stats = await chrome.runtime.sendMessage({ action: 'getStats' });
    console.log('   📊 Stats after save:', stats);
    
  } catch (error) {
    console.log('   ❌ Save error:', error);
  }
}

// Check message selectors
function checkSelectors() {
  console.log('5. Checking ChatGPT selectors...');
  
  const selectors = {
    messages: '[data-testid^="conversation-turn-"]',
    userMessage: '[data-message-author-role="user"]',
    assistantMessage: '[data-message-author-role="assistant"]',
    textContent: '.whitespace-pre-wrap'
  };
  
  Object.entries(selectors).forEach(([name, selector]) => {
    const elements = document.querySelectorAll(selector);
    console.log(`   ${name}: ${elements.length} found`);
    if (elements.length > 0) {
      console.log(`     Sample:`, elements[0]);
    }
  });
}

// Test content script capture
async function testCaptureFunction() {
  console.log('6. Testing capture function...');
  
  // Check if capture functions exist
  console.log('   captureMessage function:', typeof captureMessage);
  console.log('   captureNow function:', typeof captureNow);
  
  if (typeof captureNow !== 'undefined') {
    try {
      await captureNow();
      console.log('   ✅ captureNow executed');
    } catch (error) {
      console.log('   ❌ captureNow error:', error);
    }
  }
}

// Check database directly
async function checkDatabase() {
  console.log('7. Checking IndexedDB directly...');
  
  try {
    const request = indexedDB.open('EmmaLiteDB', 1);
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['memories'], 'readonly');
      const store = transaction.objectStore('memories');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        const memories = getAllRequest.result;
        console.log('   📁 Database contents:', memories.length, 'memories');
        
        const chatgptMemories = memories.filter(m => m.source === 'chatgpt');
        console.log('   🤖 ChatGPT memories:', chatgptMemories.length);
        
        if (chatgptMemories.length > 0) {
          console.log('   Latest ChatGPT memory:', chatgptMemories[chatgptMemories.length - 1]);
        }
      };
    };
  } catch (error) {
    console.log('   ❌ Database error:', error);
  }
}

// Run all tests
async function runAllTests() {
  await testBackgroundComm();
  await testManualSave();
  checkSelectors();
  await testCaptureFunction();
  checkDatabase();
  
  console.log('🎯 Debug complete! Check results above.');
}

// Start debugging
runAllTests();