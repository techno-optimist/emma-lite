/**
 * Emma Universal Content Script
 * Injects the universal Emma orb into all web pages
 */

(function() {
  'use strict';
  
  // Only inject on actual web pages, not extension pages
  if (window.location.protocol === 'chrome-extension:') {
    return;
  }
  
  console.log('🌍 Emma Content Script: Injecting universal orb...');
  
  // Inject the universal orb injection script
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('js/universal-orb-injection.js');
  script.onload = function() {
    console.log('🌍 Emma Content Script: Universal orb injection script loaded');
    this.remove(); // Clean up
  };
  script.onerror = function() {
    console.warn('🌍 Emma Content Script: Failed to load universal orb injection script');
    this.remove();
  };
  
  // Inject into the page
  (document.head || document.documentElement).appendChild(script);
  
})();
