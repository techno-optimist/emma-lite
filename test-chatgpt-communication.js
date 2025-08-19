// Test script for ChatGPT background communication
// Copy/paste this in ChatGPT console

console.log('🧪 Testing ChatGPT → Background Communication...');

// Test 1: Basic ping
console.log('1. Testing basic ping...');
chrome.runtime.sendMessage({action: 'ping'}, (response) => {
  console.log('   Ping response:', response);
});

// Test 2: Get current stats
console.log('2. Getting current stats...');
chrome.runtime.sendMessage({action: 'getStats'}, (response) => {
  console.log('   Stats response:', response);
  if (response && response.totalMemories) {
    console.log(`   📊 Total memories: ${response.totalMemories}`);
    console.log(`   📅 Today: ${response.todayCount}`);
  }
});

// Test 3: Save a test memory
console.log('3. Saving test memory...');
const testMemory = {
  content: 'Test memory from ChatGPT - ' + new Date().toISOString(),
  role: 'user',
  source: 'chatgpt',
  url: window.location.href,
  type: 'test',
  metadata: {
    messageId: 'test-' + Date.now(),
    conversationTitle: document.title || 'ChatGPT Test'
  }
};

chrome.runtime.sendMessage({
  action: 'saveMemory',
  data: testMemory
}, (response) => {
  console.log('   Save response:', response);
  
  if (response && response.success) {
    console.log('   ✅ Memory saved successfully!');
    console.log('   💾 Memory ID:', response.id);
    
    // Test 4: Get updated stats
    console.log('4. Getting updated stats...');
    chrome.runtime.sendMessage({action: 'getStats'}, (updatedStats) => {
      console.log('   Updated stats:', updatedStats);
      if (updatedStats) {
        console.log(`   📊 New total: ${updatedStats.totalMemories}`);
        console.log(`   📈 Today: ${updatedStats.todayCount}`);
      }
    });
    
  } else {
    console.log('   ❌ Memory save failed:', response);
  }
});

// Test 5: Check if content script functions exist
console.log('5. Checking content script functions...');
console.log('   captureMessage:', typeof captureMessage);
console.log('   captureNow:', typeof captureNow);
console.log('   showNotification:', typeof showNotification);

// Test 6: Check Emma badge manually
console.log('6. Checking Emma extension badge...');
setTimeout(() => {
  console.log('   💡 Now check the Emma extension badge - it should show the updated count!');
  console.log('   🎯 Also open the memory gallery to see if the test memory appears.');
}, 2000);