// Copy/paste this into the popup console to debug specific buttons

console.log('=== BUTTON-SPECIFIC DEBUG ===');

// Test settings button specifically
const settingsBtn = document.getElementById('settings-btn');
console.log('Settings button found:', !!settingsBtn);
if (settingsBtn) {
  console.log('Settings button details:', {
    id: settingsBtn.id,
    className: settingsBtn.className,
    innerHTML: settingsBtn.innerHTML,
    disabled: settingsBtn.disabled,
    style: settingsBtn.style.cssText
  });
  
  // Check if it's clickable
  const rect = settingsBtn.getBoundingClientRect();
  console.log('Settings button position:', rect);
  
  // Check what's at that position
  const elementAtCenter = document.elementFromPoint(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2
  );
  console.log('Element at settings button center:', elementAtCenter === settingsBtn ? 'BUTTON (GOOD)' : 'BLOCKED BY', elementAtCenter);
  
  // Add manual listener
  settingsBtn.addEventListener('click', function() {
    console.log('MANUAL SETTINGS CLICK WORKED!');
    alert('Manual settings click!');
  });
  console.log('Manual settings listener added');
}

// Test search button
const searchBtn = document.getElementById('search-btn');
console.log('Search button found:', !!searchBtn);
if (searchBtn) {
  console.log('Search button details:', {
    id: searchBtn.id,
    className: searchBtn.className,
    innerHTML: searchBtn.innerHTML,
    disabled: searchBtn.disabled,
    style: searchBtn.style.cssText
  });
  
  // Check if it's clickable
  const rect = searchBtn.getBoundingClientRect();
  console.log('Search button position:', rect);
  
  // Check what's at that position
  const elementAtCenter = document.elementFromPoint(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2
  );
  console.log('Element at search button center:', elementAtCenter === searchBtn ? 'BUTTON (GOOD)' : 'BLOCKED BY', elementAtCenter);
  
  // Add manual listener
  searchBtn.addEventListener('click', function() {
    console.log('MANUAL SEARCH CLICK WORKED!');
    alert('Manual search click!');
  });
  console.log('Manual search listener added');
}

// Test MTAP toggle (working one)
const mtapToggle = document.getElementById('mtap-toggle');
console.log('MTAP toggle found:', !!mtapToggle);
if (mtapToggle) {
  console.log('MTAP toggle details:', {
    id: mtapToggle.id,
    type: mtapToggle.type,
    checked: mtapToggle.checked,
    disabled: mtapToggle.disabled
  });
}

// Check if popup-fixed.js functions exist
console.log('Functions available:');
console.log('- openSettings:', typeof openSettings);
console.log('- searchMemories:', typeof searchMemories);
console.log('- window.emmaDebug:', typeof window.emmaDebug);

// Test manual function calls
if (typeof openSettings !== 'undefined') {
  console.log('Testing openSettings function manually...');
  try {
    openSettings();
    console.log('openSettings() executed successfully');
  } catch (e) {
    console.log('openSettings() error:', e);
  }
}

console.log('=== END BUTTON DEBUG ===');
console.log('Try clicking the settings gear and search buttons now');