/**
 * Emma Vault Extension Demo & Test Script
 * Run this in the browser console on Emma Web App to test extension functionality
 * For Debbe - testing with love 💜
 */

console.log('🧪 Emma Vault Extension Demo Script Loaded');

// Demo configuration
const DEMO_CONFIG = {
  testVaultName: 'Demo Vault for Debbe',
  testMemories: [
    {
      content: 'Had a wonderful coffee with Sarah this morning. She told me about her new garden.',
      metadata: { emotion: 'happy', importance: 8, tags: ['coffee', 'friends', 'garden'] }
    },
    {
      content: 'Watched the sunset from the back porch. The colors were absolutely breathtaking.',
      metadata: { emotion: 'peaceful', importance: 9, tags: ['sunset', 'nature', 'porch'] }
    },
    {
      content: 'Found old photo albums in the attic. So many precious memories from the past.',
      metadata: { emotion: 'nostalgic', importance: 10, tags: ['photos', 'memories', 'family'] }
    }
  ]
};

/**
 * Main demo function
 */
async function runEmmaExtensionDemo() {
  console.log('🚀 Starting Emma Vault Extension Demo...');
  
  try {
    // Step 1: Check if extension is available
    const extensionStatus = await checkExtensionStatus();
    console.log('📊 Extension Status:', extensionStatus);
    
    if (!extensionStatus.available) {
      console.error('❌ Extension not detected! Please install and refresh the page.');
      return;
    }
    
    // Step 2: Check if Emma Web Vault is available
    if (!window.emmaWebVault) {
      console.error('❌ Emma Web Vault not found! Are you on the Emma Web App?');
      return;
    }
    
    // Step 3: Create or open a test vault
    console.log('🔐 Setting up test vault...');
    await setupTestVault();
    
    // Step 4: Test sync with small memory
    console.log('📝 Testing sync with small memory...');
    await testSmallMemorySync();
    
    // Wait a moment
    await sleep(2000);
    
    // Step 5: Test sync with multiple memories
    console.log('📚 Testing sync with multiple memories...');
    await testMultipleMemoriesSync();
    
    // Wait a moment
    await sleep(2000);
    
    // Step 6: Test extension communication
    console.log('💬 Testing extension communication...');
    await testExtensionCommunication();
    
    console.log('✅ Demo completed successfully!');
    console.log('💜 Your memories are now syncing to your local .emma file');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

/**
 * Check extension status
 */
async function checkExtensionStatus() {
  return new Promise((resolve) => {
    const marker = document.getElementById('emma-vault-extension-marker');
    const windowExtension = window.EmmaVaultExtension;
    
    resolve({
      available: !!(marker || windowExtension),
      version: windowExtension?.version || 'unknown',
      marker: !!marker,
      windowObject: !!windowExtension
    });
  });
}

/**
 * Setup test vault
 */
async function setupTestVault() {
  try {
    // Check if vault is already open
    if (window.emmaWebVault.isOpen) {
      console.log('📂 Vault already open, using existing vault');
      return;
    }
    
    // Try to create a new vault
    const result = await window.emmaWebVault.createVaultFile(
      DEMO_CONFIG.testVaultName,
      'demo123' // Simple password for demo
    );
    
    console.log('🎉 Test vault created:', result);
    
  } catch (error) {
    console.error('❌ Vault setup failed:', error);
    throw error;
  }
}

/**
 * Test syncing a small memory
 */
async function testSmallMemorySync() {
  try {
    const testMemory = DEMO_CONFIG.testMemories[0];
    
    console.log('📝 Adding test memory:', testMemory.content.substring(0, 50) + '...');
    
    const result = await window.emmaWebVault.addMemory(testMemory);
    console.log('✅ Memory added:', result);
    
    // Trigger sync manually
    if (window.emmaWebVault.extensionAvailable) {
      await window.emmaWebVault.syncToExtension();
      console.log('🔄 Sync triggered');
    }
    
  } catch (error) {
    console.error('❌ Small memory sync failed:', error);
    throw error;
  }
}

/**
 * Test syncing multiple memories
 */
async function testMultipleMemoriesSync() {
  try {
    console.log('📚 Adding multiple memories...');
    
    for (let i = 1; i < DEMO_CONFIG.testMemories.length; i++) {
      const memory = DEMO_CONFIG.testMemories[i];
      console.log(`📝 Adding memory ${i + 1}:`, memory.content.substring(0, 40) + '...');
      
      await window.emmaWebVault.addMemory(memory);
      await sleep(500); // Small delay between adds
    }
    
    console.log('✅ Multiple memories added successfully');
    
  } catch (error) {
    console.error('❌ Multiple memory sync failed:', error);
    throw error;
  }
}

/**
 * Test extension communication
 */
async function testExtensionCommunication() {
  return new Promise((resolve, reject) => {
    console.log('💬 Testing extension communication...');
    
    let responseReceived = false;
    
    // Listen for response
    const messageHandler = (event) => {
      if (event.data?.channel === 'emma-vault-bridge') {
        console.log('📨 Received extension response:', event.data);
        responseReceived = true;
        window.removeEventListener('message', messageHandler);
        resolve(event.data);
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // Send test message
    window.postMessage({
      channel: 'emma-vault-bridge',
      type: 'REQUEST_SYNC_STATUS'
    }, window.location.origin);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      if (!responseReceived) {
        window.removeEventListener('message', messageHandler);
        reject(new Error('Extension communication timeout'));
      }
    }, 5000);
  });
}

/**
 * Utility: Sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Quick status check
 */
function quickStatusCheck() {
  console.log('🔍 Emma Extension Quick Status Check:');
  console.log('Extension Marker:', !!document.getElementById('emma-vault-extension-marker'));
  console.log('Window Object:', !!window.EmmaVaultExtension);
  console.log('Emma Web Vault:', !!window.emmaWebVault);
  console.log('Vault Open:', window.emmaWebVault?.isOpen);
  console.log('Extension Available:', window.emmaWebVault?.extensionAvailable);
  console.log('Sync Enabled:', window.emmaWebVault?.extensionSyncEnabled);
}

/**
 * Force sync test
 */
async function forceSyncTest() {
  console.log('🔄 Force sync test...');
  
  if (!window.emmaWebVault?.extensionAvailable) {
    console.error('❌ Extension not available');
    return;
  }
  
  try {
    await window.emmaWebVault.syncToExtension();
    console.log('✅ Force sync completed');
  } catch (error) {
    console.error('❌ Force sync failed:', error);
  }
}

// Export functions to window for easy access
window.emmaExtensionDemo = {
  runDemo: runEmmaExtensionDemo,
  quickCheck: quickStatusCheck,
  forceSync: forceSyncTest,
  testMemories: DEMO_CONFIG.testMemories
};

console.log('🎯 Demo functions available:');
console.log('- emmaExtensionDemo.runDemo() - Full demo');
console.log('- emmaExtensionDemo.quickCheck() - Quick status');
console.log('- emmaExtensionDemo.forceSync() - Force sync test');
console.log('');
console.log('💜 Ready to test Emma Vault Extension for Debbe!');
