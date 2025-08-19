// Debug script - copy/paste this into any console to test basic functionality

console.log('🚀 Debug Console Test Starting...');

// Test 1: Basic DOM manipulation
console.log('1. Testing DOM...');
const testDiv = document.createElement('div');
testDiv.innerHTML = 'TEST';
document.body.appendChild(testDiv);
console.log('✅ DOM manipulation works');

// Test 2: Event listeners
console.log('2. Testing events...');
testDiv.addEventListener('click', () => console.log('✅ Event listener works'));
testDiv.click();

// Test 3: Chrome APIs
console.log('3. Testing Chrome APIs...');
console.log('chrome available:', typeof chrome !== 'undefined');
console.log('chrome.runtime:', typeof chrome?.runtime);
console.log('chrome.tabs:', typeof chrome?.tabs);

if (typeof chrome !== 'undefined' && chrome.runtime) {
  console.log('✅ Chrome APIs available');
  
  // Test runtime messaging
  try {
    chrome.runtime.sendMessage({action: 'test'}, (response) => {
      console.log('Runtime message response:', response);
    });
  } catch (e) {
    console.log('Runtime message error:', e);
  }
} else {
  console.log('❌ Chrome APIs not available');
}

// Test 4: Create and test a button
console.log('4. Testing button creation...');
const testBtn = document.createElement('button');
testBtn.textContent = 'Test Button';
testBtn.style.cssText = 'position:fixed; top:10px; right:10px; z-index:9999; background:red; color:white; padding:10px;';

let clickCount = 0;
testBtn.onclick = () => {
  clickCount++;
  console.log(`✅ Button clicked ${clickCount} times`);
  testBtn.textContent = `Clicked ${clickCount}`;
};

document.body.appendChild(testBtn);
console.log('✅ Test button created - look for red button in top-right');

// Test 5: Check for blocking elements
console.log('5. Testing element blocking...');
setTimeout(() => {
  const rect = testBtn.getBoundingClientRect();
  const elementAtPoint = document.elementFromPoint(rect.left + rect.width/2, rect.top + rect.height/2);
  console.log('Element at button center:', elementAtPoint === testBtn ? '✅ Not blocked' : '❌ Blocked by', elementAtPoint);
}, 500);

console.log('🎯 Debug test complete. Check for red test button and try clicking it.');