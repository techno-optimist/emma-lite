// Copy/paste this to check if popup-fixed.js is initializing properly

console.log('=== INITIALIZATION CHECK ===');

// Check if popup-fixed.js loaded at all
console.log('popup-fixed.js loaded?', document.querySelector('script[src="js/popup-fixed.js"]') !== null);

// Check if main functions exist
console.log('Functions exist:');
console.log('- init:', typeof init);
console.log('- attachEventListeners:', typeof attachEventListeners);
console.log('- openSettings:', typeof openSettings);
console.log('- searchMemories:', typeof searchMemories);

// Check if elements object exists
console.log('elements object:', typeof elements);

// Check if emmaDebug was created
console.log('window.emmaDebug:', typeof window.emmaDebug);

// Try to manually trigger initialization
if (typeof init !== 'undefined') {
  console.log('Trying to manually call init()...');
  try {
    init();
    console.log('Manual init() completed');
  } catch (e) {
    console.log('Manual init() error:', e);
  }
} else {
  console.log('init function not found - popup-fixed.js may not be loading');
}

console.log('=== END INITIALIZATION CHECK ===');