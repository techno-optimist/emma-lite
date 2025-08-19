// ULTRA DIAGNOSTIC SCRIPT FOR EMMA STORAGE ISSUES
// Run this in console on ChatGPT page after capture

console.log('🔬 EMMA ULTRA DIAGNOSTIC STARTING...');

async function ultraDiagnostic() {
  console.log('\n1️⃣ TESTING CHROME.STORAGE.LOCAL ACCESS...');
  
  try {
    // Test basic chrome.storage.local access
    await chrome.storage.local.set({ test_key: 'test_value' });
    const testResult = await chrome.storage.local.get(['test_key']);
    console.log('✅ chrome.storage.local basic test:', testResult);
    
    // Clean up test
    await chrome.storage.local.remove(['test_key']);
  } catch (error) {
    console.error('❌ chrome.storage.local FAILED:', error);
    return;
  }
  
  console.log('\n2️⃣ CHECKING EMMA MEMORIES IN CHROME.STORAGE.LOCAL...');
  
  try {
    const result = await chrome.storage.local.get(['emma_memories']);
    const chromeMemories = result.emma_memories || [];
    console.log(`📦 Chrome Storage: ${chromeMemories.length} memories found`);
    
    if (chromeMemories.length > 0) {
      console.log('🔍 First memory:', chromeMemories[0]);
      console.log('🔍 Last memory:', chromeMemories[chromeMemories.length - 1]);
    }
  } catch (error) {
    console.error('❌ Chrome storage read failed:', error);
  }
  
  console.log('\n3️⃣ CHECKING LOCAL STORAGE (DOMAIN-SPECIFIC)...');
  
  try {
    const localMemories = localStorage.getItem('emma_memories');
    if (localMemories) {
      const parsed = JSON.parse(localMemories);
      console.log(`💾 Local Storage: ${parsed.length} memories found`);
      
      if (parsed.length > 0) {
        console.log('🔍 First local memory:', parsed[0]);
      }
    } else {
      console.log('💾 Local Storage: No memories found');
    }
  } catch (error) {
    console.error('❌ Local storage read failed:', error);
  }
  
  console.log('\n4️⃣ TESTING CONTENT SCRIPT FUNCTIONALITY...');
  
  try {
    // Test if content script is responding
    const pingResponse = await chrome.runtime.sendMessage({ action: 'ping' });
    console.log('📡 Content script ping:', pingResponse);
  } catch (error) {
    console.error('❌ Content script ping failed:', error);
  }
  
  console.log('\n5️⃣ TESTING BACKGROUND SCRIPT CONNECTION...');
  
  try {
    const bgResponse = await Promise.race([
      chrome.runtime.sendMessage({ action: 'getStats' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Background timeout')), 3000))
    ]);
    console.log('🏢 Background script response:', bgResponse);
  } catch (error) {
    console.error('❌ Background script failed:', error);
  }
  
  console.log('\n6️⃣ RUNNING MANUAL CAPTURE TEST...');
  
  try {
    // Create a test memory manually
    const testMemory = {
      id: `test_${Date.now()}`,
      content: 'DIAGNOSTIC TEST MEMORY',
      type: 'test',
      source: 'diagnostic',
      savedAt: new Date().toISOString()
    };
    
    // Save to chrome.storage.local
    const existing = await chrome.storage.local.get(['emma_memories']);
    const memories = existing.emma_memories || [];
    memories.push(testMemory);
    
    await chrome.storage.local.set({ emma_memories: memories });
    
    // Verify save
    const verification = await chrome.storage.local.get(['emma_memories']);
    const savedMemories = verification.emma_memories || [];
    
    console.log(`✅ Manual save test: ${savedMemories.length} total memories`);
    console.log('🔍 Test memory saved:', savedMemories.find(m => m.id === testMemory.id));
    
  } catch (error) {
    console.error('❌ Manual save test failed:', error);
  }
  
  console.log('\n🔬 DIAGNOSTIC COMPLETE!');
  
  // Summary
  console.log('\n📊 SUMMARY:');
  console.log('- Check each step above for ❌ errors');
  console.log('- Look for memory count discrepancies');
  console.log('- Verify chrome.storage.local is working');
  console.log('- Check if content script is responding');
}

// Run the diagnostic
ultraDiagnostic().catch(console.error);
