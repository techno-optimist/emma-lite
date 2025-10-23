/**
 * Universal Emma Orb Injection Script
 * Loads the universal orb system on any page
 */

(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.universalOrbInjected) return;
  window.universalOrbInjected = true;
  
  console.log('🌍 Universal Orb Injection: Starting injection...');
  
  // List of required scripts for the universal orb
  const requiredScripts = [
    'emma-orb.js',
    'settings-service.js', 
    'orb-experience-manager.js',
    'experience-popup-base.js',
    'assistant-experience-popup.js',
    'dementia-experience-popup.js',
    'mirror-experience-popup.js',
    'universal-emma-orb.js'
  ];
  
  // Function to load a script
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // Check if script already exists
      if (document.querySelector(`script[src*="${src}"]`)) {
        console.log('🌍 Script already loaded:', src);
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = getScriptPath(src);
      script.onload = () => {
        console.log('🌍 Loaded script:', src);
        resolve();
      };
      script.onerror = () => {
        console.warn('🌍 Failed to load script:', src);
        resolve(); // Don't reject, continue with other scripts
      };
      document.head.appendChild(script);
    });
  }
  
  // Get the correct path for scripts based on current page location
  function getScriptPath(filename) {
    const currentPath = window.location.pathname;
    const currentOrigin = window.location.origin;
    
    console.log('🌍 Script path resolution:', { currentPath, currentOrigin, filename });
    
    // Chrome extension pages (chrome-extension:// protocol)
    if (currentOrigin.includes('chrome-extension://')) {
      if (currentPath.includes('/pages/')) {
        console.log('🌍 Extension page in /pages/, using ../js/');
        return `../js/${filename}`;
      }
      console.log('🌍 Extension page at root, using js/');
      return `js/${filename}`;
    }
    
    // Web pages - try to use extension URLs if available
    if (window.chrome && chrome.runtime && chrome.runtime.getURL) {
      try {
        const url = chrome.runtime.getURL(`js/${filename}`);
        console.log('🌍 Web page, using chrome.runtime.getURL:', url);
        return url;
      } catch (error) {
        console.warn('🌍 chrome.runtime.getURL failed:', error);
      }
    }
    
    // Fallback for other contexts
    console.log('🌍 Fallback path for:', filename);
    return `js/${filename}`;
  }
  
  // Load all required scripts sequentially
  async function loadAllScripts() {
    try {
      console.log('🌍 Universal Orb Injection: Loading required scripts...');
      
      for (const script of requiredScripts) {
        await loadScript(script);
      }
      
      console.log('🌍 Universal Orb Injection: All scripts loaded successfully');
      
      // Initialize the universal orb after a small delay
      setTimeout(() => {
        if (window.UniversalEmmaOrb) {
          window.UniversalEmmaOrb.initialize();
          console.log('🌍 Universal Orb Injection: Universal orb initialized');
        } else {
          console.warn('🌍 Universal Orb Injection: UniversalEmmaOrb class not found');
        }
      }, 200);
      
    } catch (error) {
      console.error('🌍 Universal Orb Injection: Failed to load scripts:', error);
    }
  }
  
  // Start loading when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAllScripts);
  } else {
    loadAllScripts();
  }
  
})();
