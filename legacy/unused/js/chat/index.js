/**
 * 🏗️ EMMA CHAT SYSTEM - Modular Architecture Index
 * Loads all chat modules in correct order with clean interfaces
 * 
 * CTO ARCHITECTURE: Clean module loading and initialization
 */

// Load modules in dependency order
console.log('🏗️ EMMA CHAT: Loading modular architecture...');

// 1. Intent Classifier (no dependencies)
if (!window.EmmaIntentClassifier) {
  console.log('🧠 Loading Intent Classifier...');
  // Will be loaded by script tag
}

// 2. Memory Operations (depends on vault)
if (!window.EmmaMemoryOperations) {
  console.log('💝 Loading Memory Operations...');
  // Will be loaded by script tag  
}

// 3. Person Handler (depends on vault)
if (!window.EmmaPersonHandler) {
  console.log('👤 Loading Person Handler...');
  // Will be loaded by script tag
}

// 4. Photo Manager (depends on core)
if (!window.EmmaPhotoManager) {
  console.log('📷 Loading Photo Manager...');
  // Will be loaded by script tag
}

// 5. Dementia Companion (depends on core)
if (!window.EmmaDementiaCompanion) {
  console.log('💜 Loading Dementia Companion...');
  // Will be loaded by script tag
}

// 6. Core Chat (depends on all modules)
if (!window.EmmaChatCore) {
  console.log('💜 Loading Chat Core...');
  // Will be loaded by script tag
}

/**
 * 🚀 INITIALIZE CLEAN CHAT SYSTEM
 */
function initializeEmmaChatSystem() {
  // Verify all modules loaded
  const requiredModules = [
    'EmmaIntentClassifier',
    'EmmaMemoryOperations', 
    'EmmaPersonHandler',
    'EmmaPhotoManager',
    'EmmaDementiaCompanion',
    'EmmaChatCore'
  ];
  
  const missingModules = requiredModules.filter(module => !window[module]);
  
  if (missingModules.length > 0) {
    console.error('🚨 CHAT: Missing modules:', missingModules);
    return null;
  }
  
  console.log('✅ CHAT: All modules loaded successfully');
  
  // Create clean chat system
  const chatSystem = {
    core: EmmaChatCore,
    intentClassifier: EmmaIntentClassifier,
    memoryOperations: EmmaMemoryOperations,
    personHandler: EmmaPersonHandler,
    photoManager: EmmaPhotoManager,
    dementiaCompanion: EmmaDementiaCompanion
  };
  
  // Expose globally for compatibility
  window.EmmaChatExperience = EmmaChatCore; // Backward compatibility
  window.EmmaChatSystem = chatSystem;
  
  console.log('🎉 EMMA CHAT: Modular system ready!');
  return chatSystem;
}

// Auto-initialize when all modules are ready
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure all scripts loaded
  setTimeout(initializeEmmaChatSystem, 100);
});

console.log('🏗️ Emma Chat Index: Module loader ready');
