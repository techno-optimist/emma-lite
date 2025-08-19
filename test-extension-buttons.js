// Test script to debug extension button issues
// Run this in the popup console

console.log('🔍 EMMA EXTENSION BUTTON DEBUGGING SCRIPT');
console.log('=========================================');

// Test 1: Check if elements exist
console.log('\n1. CHECKING DOM ELEMENTS:');
const expectedElements = [
  'mtap-toggle', 'capture-btn', 'search-quick-btn', 'view-all-btn',
  'memories-gallery-btn', 'create-memory-btn', 'constellation-btn',
  'people-btn', 'add-person-btn', 'relationships-btn', 'share-memories-btn',
  'export-btn', 'import-btn', 'import-page-btn', 'backup-btn',
  'settings-btn', 'header-settings-btn', 'test-btn', 'welcome-btn',
  'install-btn', 'privacy-btn', 'help-btn', 'about-btn'
];

expectedElements.forEach(id => {
  const element = document.getElementById(id);
  console.log(`${element ? '✅' : '❌'} ${id}:`, element);
});

// Test 2: Check event listeners
console.log('\n2. CHECKING EVENT LISTENERS:');
expectedElements.forEach(id => {
  const element = document.getElementById(id);
  if (element) {
    const listeners = getEventListeners ? getEventListeners(element) : 'getEventListeners not available';
    console.log(`🎯 ${id} listeners:`, listeners);
  }
});

// Test 3: Check window.emmaDebug
console.log('\n3. CHECKING DEBUG FUNCTIONS:');
console.log('emmaDebug available:', !!window.emmaDebug);
if (window.emmaDebug) {
  console.log('emmaDebug keys:', Object.keys(window.emmaDebug));
}

// Test 4: Check chrome APIs
console.log('\n4. CHECKING CHROME APIS:');
console.log('chrome.tabs:', !!chrome.tabs);
console.log('chrome.runtime:', !!chrome.runtime);
console.log('chrome.runtime.getURL:', !!chrome.runtime.getURL);

// Test 5: Manual button click test
console.log('\n5. MANUAL BUTTON TESTS:');
window.testButton = function(buttonId) {
  console.log(`🎯 Testing button: ${buttonId}`);
  const button = document.getElementById(buttonId);
  if (button) {
    console.log('Button found:', button);
    button.click();
    console.log('Click dispatched');
  } else {
    console.error(`Button ${buttonId} not found!`);
  }
};

console.log('Use: testButton("capture-btn") to test specific buttons');

// Test 6: Background script communication
console.log('\n6. TESTING BACKGROUND COMMUNICATION:');
chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
  console.log('Background response:', response);
});

console.log('\n🎯 DEBUGGING COMPLETE! Check the results above.');