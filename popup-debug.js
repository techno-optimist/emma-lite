// popup-debug.js - External JavaScript for CSP compliance

// Immediate console logs
console.log('🚀 DEBUG: External script started');
console.log('🚀 DEBUG: Document ready state:', document.readyState);
console.log('🚀 DEBUG: Chrome available:', typeof chrome);

function log(message) {
  const logDiv = document.getElementById('log');
  if (logDiv) {
    const timestamp = new Date().toLocaleTimeString();
    logDiv.innerHTML += `[${timestamp}] ${message}<br>`;
    logDiv.scrollTop = logDiv.scrollHeight;
  }
  console.log('DEBUG:', message);
}

// Test function
function runTests() {
  log('External script execution started ✅');
  log('DOM ready state: ' + document.readyState);
  log('Chrome APIs: ' + (typeof chrome !== 'undefined' ? 'Available ✅' : 'Not available ❌'));
  
  // Test 1: Basic click
  const test1 = document.getElementById('test1');
  if (test1) {
    log('Test1 button found ✅');
    test1.addEventListener('click', function() {
      log('TEST 1 CLICKED! ✅');
      console.log('TEST 1 CLICKED!');
      
      // Test if we can find the settings button from original popup
      const settingsBtn = document.getElementById('settings-btn');
      if (settingsBtn) {
        log('Found settings button from original popup! ✅');
      } else {
        log('Settings button not found (expected in debug popup) ✅');
      }
    });
    log('Test1 click handler attached ✅');
  } else {
    log('Test1 button NOT found ❌');
  }
  
  // Test 2: Chrome APIs
  const test2 = document.getElementById('test2');
  if (test2) {
    log('Test2 button found ✅');
    test2.addEventListener('click', function() {
      log('TEST 2 CLICKED! ✅');
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        log('Chrome APIs work ✅');
        try {
          chrome.runtime.openOptionsPage();
          log('Options page opened ✅');
        } catch (e) {
          log('Options error: ' + e.message);
        }
      } else {
        log('Chrome APIs not available ❌');
      }
    });
    log('Test2 click handler attached ✅');
  }
  
  // Test 3: Alert test
  const test3 = document.getElementById('test3');
  if (test3) {
    log('Test3 button found ✅');
    test3.addEventListener('click', function() {
      log('TEST 3 CLICKED! ✅');
      alert('Test 3 clicked - JavaScript is working!');
    });
    log('Test3 click handler attached ✅');
  }
  
  log('All event listeners attached ✅');
  log('=== DEBUG SETUP COMPLETE ===');
  log('Try clicking the buttons above!');
}

// Run tests when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  log('DOMContentLoaded fired ✅');
  runTests();
});

// Also try immediate execution if DOM is already ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  console.log('DOM already loaded, setting up immediately...');
  setTimeout(runTests, 100); // Small delay to ensure elements exist
}

console.log('🚀 DEBUG: External script setup complete');