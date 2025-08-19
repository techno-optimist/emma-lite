// EMERGENCY FIX - Paste this in the popup console if buttons still don't work

console.log('🚨 Running Emergency Fix...');

// Force re-initialization
const fixButtons = () => {
  // Settings button
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.onclick = () => {
      console.log('Settings clicked!');
      chrome.runtime.openOptionsPage();
    };
    console.log('✅ Settings button fixed');
  }
  
  // Capture button  
  const captureBtn = document.getElementById('capture-btn');
  if (captureBtn) {
    captureBtn.onclick = async () => {
      console.log('Capture clicked!');
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'captureNow' });
      }
    };
    console.log('✅ Capture button fixed');
  }
  
  // View All button
  const viewAllBtn = document.getElementById('view-all-btn');
  if (viewAllBtn) {
    viewAllBtn.onclick = () => {
      console.log('View All clicked!');
      chrome.tabs.create({ url: chrome.runtime.getURL('memories.html') });
    };
    console.log('✅ View All button fixed');
  }
  
  // Export button
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.onclick = async () => {
      console.log('Export clicked!');
      const response = await chrome.runtime.sendMessage({ action: 'exportData' });
      if (response?.data) {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `emma-memories-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
      }
    };
    console.log('✅ Export button fixed');
  }
  
  // Test button
  const testBtn = document.getElementById('test-btn');
  if (testBtn) {
    testBtn.onclick = () => {
      console.log('Test clicked!');
      chrome.tabs.create({ url: chrome.runtime.getURL('simple-test.html') });
    };
    console.log('✅ Test button fixed');
  }
  
  console.log('🎉 Emergency fix complete! All buttons should work now.');
};

fixButtons();