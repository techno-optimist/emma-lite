// Test popup JavaScript - External file to avoid CSP violations
console.log('🔧 TEST POPUP: Script loading...');

// Test basic functionality
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔧 TEST POPUP: DOM Content Loaded');
  
  const debugDiv = document.getElementById('debug');
  const testBtn = document.getElementById('test-btn');
  const captureBtn = document.getElementById('capture-btn');
  const debugBtn = document.getElementById('debug-console');
  
  debugDiv.innerHTML = 'Script loaded successfully!';
  
  // Test button
  if (testBtn) {
    testBtn.addEventListener('click', function() {
      console.log('🔧 TEST: Test button clicked!');
      debugDiv.innerHTML = 'Test button works! ✅';
    });
    console.log('🔧 TEST: Test button listener attached');
  }
  
  // Capture button
  if (captureBtn) {
    captureBtn.addEventListener('click', function() {
      console.log('🔧 TEST: Capture button clicked!');
      debugDiv.innerHTML = 'Capture button works! ✅';
      
      // Test chrome API
      if (chrome && chrome.tabs) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          debugDiv.innerHTML = 'Chrome API works! Current tab: ' + tabs[0].title;
        });
      } else {
        debugDiv.innerHTML = 'Chrome API not available ❌';
      }
    });
    console.log('🔧 TEST: Capture button listener attached');
  }
  
  // Debug console
  if (debugBtn) {
    debugBtn.addEventListener('click', function() {
      console.log('🔧 TEST: Debug button clicked!');
      console.log('Available elements:', {
        testBtn: !!testBtn,
        captureBtn: !!captureBtn,
        debugBtn: !!debugBtn,
        chrome: !!chrome,
        chromeRuntime: !!(chrome && chrome.runtime),
        chromeTabs: !!(chrome && chrome.tabs)
      });
      debugDiv.innerHTML = 'Check console for debug info! 🔍';
    });
    console.log('🔧 TEST: Debug button listener attached');
  }
  
  console.log('🔧 TEST POPUP: All listeners attached successfully');
});

console.log('🔧 TEST POPUP: Script end reached');