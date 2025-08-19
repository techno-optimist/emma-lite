// Copy and paste this ENTIRE block into the popup console to test

console.log('=== MANUAL CONSOLE TEST ===');

// Test 1: Basic JavaScript
console.log('1. JavaScript execution: WORKS');

// Test 2: DOM access
const testDiv = document.createElement('div');
testDiv.textContent = 'MANUAL TEST DIV';
testDiv.style.cssText = 'background:red;color:white;padding:10px;position:fixed;top:10px;right:10px;z-index:9999;';
document.body.appendChild(testDiv);
console.log('2. DOM manipulation: WORKS - Red div should appear');

// Test 3: Find existing buttons
const buttons = document.querySelectorAll('button');
console.log('3. Found buttons:', buttons.length);
buttons.forEach((btn, i) => {
  console.log(`   Button ${i}:`, btn.id || btn.textContent?.substring(0, 30));
});

// Test 4: Test settings button specifically
const settingsBtn = document.getElementById('settings-btn');
console.log('4. Settings button:', settingsBtn ? 'FOUND' : 'NOT FOUND');

if (settingsBtn) {
  console.log('   Settings button details:', {
    tagName: settingsBtn.tagName,
    id: settingsBtn.id,
    className: settingsBtn.className,
    innerHTML: settingsBtn.innerHTML
  });
  
  // Test 5: Add manual click handler
  settingsBtn.addEventListener('click', function() {
    console.log('5. MANUAL CLICK HANDLER WORKED!');
    alert('Manual click handler works!');
  });
  console.log('5. Manual click handler added');
  
  // Test 6: Programmatic click
  setTimeout(() => {
    console.log('6. Triggering programmatic click...');
    settingsBtn.click();
  }, 2000);
}

// Test 7: Check for overlapping elements
if (settingsBtn) {
  const rect = settingsBtn.getBoundingClientRect();
  const elementAtCenter = document.elementFromPoint(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2
  );
  console.log('7. Element at button center:', elementAtCenter === settingsBtn ? 'BUTTON (GOOD)' : 'BLOCKED BY', elementAtCenter);
}

// Test 8: Chrome APIs
console.log('8. Chrome APIs:');
console.log('   chrome:', typeof chrome);
console.log('   chrome.runtime:', typeof chrome?.runtime);
console.log('   chrome.tabs:', typeof chrome?.tabs);

if (typeof chrome !== 'undefined' && chrome.runtime) {
  console.log('   Chrome APIs available - testing openOptionsPage...');
  try {
    chrome.runtime.openOptionsPage();
    console.log('   ✅ Chrome.runtime.openOptionsPage() works');
  } catch (e) {
    console.log('   ❌ Chrome API error:', e);
  }
}

console.log('=== END MANUAL TEST ===');
console.log('After running this, try clicking the red test div and the settings button');

// Remove test div after 5 seconds
setTimeout(() => {
  testDiv.remove();
  console.log('Test div removed');
}, 5000);