/**
 * Dementia Companion Initialization Script
 * Safely initializes the Dementia Companion after all dependencies are loaded
 */

// Mount Dementia Companion on legacy UI if enabled for current vault
function initializeDementiaCompanion() {
  console.log('🧠 Initializing Dementia Companion...');
  try {
    console.log('🧠 Checking if EmmaDementiaCompanion class is available:', !!window.EmmaDementiaCompanion);
    console.log('🧠 Checking if EmmaOrb class is available:', !!window.EmmaOrb);
    
    // Hide any existing Emma assistants and orbs to prevent overlap
    const existingElements = document.querySelectorAll(`
      .emma-assistant-panel, .assistant-container, .emma-panel,
      .emma-orb-container:not(.emma-dementia-orb),
      .emma-assistant, .assistant-orb, .memory-assistant
    `);
    
    if (existingElements.length > 0) {
      console.log('🧠 Hiding', existingElements.length, 'existing Emma elements to prevent overlap');
      existingElements.forEach(el => {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
      });
    }
    
    // Also try to disable any Emma assistant initialization
    const functionsToDisable = [
      'createMemoryAssistant', 'initializeEmmaAssistant', 'createEmmaOrb', 
      'mountEmmaWizard', 'initializeMemoryWizard', 'createAssistant'
    ];
    
    functionsToDisable.forEach(funcName => {
      if (window[funcName]) {
        console.log('🧠 Disabling', funcName, 'to prevent conflicts');
        window[funcName] = () => console.log('🧠 Blocked', funcName, 'creation');
      }
    });
    
    // More aggressive - check for any orbs that might be created after us
    setTimeout(() => {
      const allOrbs = document.querySelectorAll('.emma-orb-container, .assistant-orb, .emma-assistant');
      if (allOrbs.length > 1) {
        console.log('🧠 Found', allOrbs.length, 'orbs, hiding all except dementia orb');
        allOrbs.forEach(orb => {
          if (!orb.classList.contains('emma-dementia-orb')) {
            orb.style.display = 'none';
            orb.style.visibility = 'hidden';
          }
        });
      }
    }, 1000);
    
    const container = document.createElement('div');
    container.className = 'emma-orb-container emma-dementia-orb';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.width = '72px';
    container.style.height = '72px';
    container.style.zIndex = '10000';
    document.body.appendChild(container);
    console.log('🧠 Orb container created and added to DOM');

    // Instantiate companion; it will load per-vault settings and only fully activate if enabled
    if (window.EmmaDementiaCompanion) {
      console.log('🧠 Creating EmmaDementiaCompanion instance...');
      window._emmaDementia = new EmmaDementiaCompanion(container, { userName: 'dear' });
      console.log('🧠 EmmaDementiaCompanion instance created successfully');
      
      // Force a settings check after a short delay
      setTimeout(() => {
        console.log('🧠 Forcing settings refresh...');
        window._emmaDementia.refreshOrbState();
      }, 500);
      
      // Also add a global function to manually refresh (for debugging)
      window.refreshDementiaOrb = () => {
        console.log('🧠 Manual dementia orb refresh triggered');
        if (window._emmaDementia) {
          window._emmaDementia.refreshOrbState();
        }
      };
      
      // Debug function to force enable dementia mode
      window.forceDementiaMode = () => {
        console.log('🧠 Forcing dementia mode for testing');
        if (window._emmaDementia) {
          window._emmaDementia.isEnabledForVault = true;
          window._emmaDementia.initializeUIBasedOnSettings();
        }
      };
      
      // Debug function to check current settings
      window.checkDementiaSettings = async () => {
        console.log('🧠 Checking current dementia settings...');
        if (window._emmaDementia) {
          await window._emmaDementia.loadSettings();
          console.log('🧠 Current enabled state:', window._emmaDementia.isEnabledForVault);
        }
      };
      
      // Listen for postMessage events from settings page
      window.addEventListener('message', (event) => {
        if (event.data.type === 'DEMENTIA_SETTINGS_CHANGED') {
          console.log('🧠 Received settings changed message from settings page');
          setTimeout(() => {
            if (window._emmaDementia) {
              window._emmaDementia.refreshOrbState();
            }
          }, 100);
        }
      });
      
      // Listen for chrome runtime messages
      if (window.chrome && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          if (message.action === 'refreshDementiaCompanion') {
            console.log('🧠 Received refresh message from settings');
            if (window._emmaDementia) {
              window._emmaDementia.refreshOrbState();
            }
          }
        });
      }
    } else {
      console.error('🧠 EmmaDementiaCompanion class not found - script may not have loaded');
    }
  } catch (e) { 
    console.error('🧠 Dementia companion failed to mount:', e?.message, e); 
  }
}

// Wait for DOM and all scripts to load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDementiaCompanion);
} else {
  // DOM already loaded, run after a short delay to ensure scripts are loaded
  setTimeout(initializeDementiaCompanion, 100);
}
