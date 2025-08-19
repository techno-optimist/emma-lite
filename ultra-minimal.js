// Ultra minimal external JavaScript - CSP compliant

console.log('🚀 Ultra minimal external script starting...');

// Test 1: Immediate execution
console.log('Test 1: Script execution - PASS');

// Test 2: DOM manipulation
document.getElementById('status').innerHTML = 'External script loaded ✅';
console.log('Test 2: DOM manipulation - PASS');

// Test 3: Event listeners
const inlineTestBtn = document.getElementById('inline-test');
if (inlineTestBtn) {
  inlineTestBtn.addEventListener('click', function() {
    console.log('Test 3: Alert button - PASS');
    alert('External JavaScript works! 🎉');
    document.getElementById('status').innerHTML = 'Alert button clicked! ✅';
  });
  console.log('Test 3: Alert button listener attached - PASS');
}

const jsBtn = document.getElementById('js-btn');
if (jsBtn) {
  jsBtn.addEventListener('click', function() {
    console.log('Test 4: JS button - PASS');
    document.getElementById('status').innerHTML = 'JS Button clicked! ✅';
    
    // Test Chrome APIs
    if (typeof chrome !== 'undefined') {
      console.log('Chrome APIs available');
      try {
        chrome.runtime.openOptionsPage();
        console.log('Chrome API call successful');
        document.getElementById('status').innerHTML += '<br>Settings opened! ✅';
      } catch (e) {
        console.log('Chrome API error:', e);
        document.getElementById('status').innerHTML += '<br>Chrome API error: ' + e.message;
      }
    } else {
      console.log('Chrome APIs not available');
      document.getElementById('status').innerHTML += '<br>❌ Chrome APIs not available';
    }
  });
  console.log('Test 4: JS button listener attached - PASS');
}

console.log('🎯 Ultra minimal external script complete - ALL SYSTEMS GO!');