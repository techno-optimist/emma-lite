// HML-DEMO-TEST.js - Complete Emma HML System Test
// Run this in the browser console to validate the Human Memory Layer is working

console.log('🌟 EMMA HML (Human Memory Layer) - Demo Validation Test');
console.log('🔬 Testing the complete memory orchestration system...');

async function runHMLDemoTest() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: {},
    summary: { passed: 0, failed: 0, total: 0 }
  };

  // Test 1: Basic Memory Creation
  console.log('\n🧪 Test 1: Basic Memory Creation');
  try {
    const testMemory = {
      content: 'Emma is the memory orchestrator for the Human Memory Layer (HML) - Demo Test ' + Date.now(),
      source: 'hml-demo',
      role: 'user',
      type: 'conversation',
      metadata: {
        demo: true,
        platform: 'emma-lite'
      }
    };

    const response = await chrome.runtime.sendMessage({
      action: 'saveMemory',
      data: testMemory
    });

    console.log('✅ Memory creation response:', response);
    
    if (response.success && response.memoryId) {
      results.tests.memoryCreation = { 
        status: 'PASSED', 
        memoryId: response.memoryId,
        message: 'Memory created successfully with MTAP protocol'
      };
      results.summary.passed++;
    } else {
      throw new Error(response.error || 'No memory ID returned');
    }
  } catch (error) {
    console.error('❌ Memory creation failed:', error);
    results.tests.memoryCreation = { 
      status: 'FAILED', 
      error: error.message 
    };
    results.summary.failed++;
  }
  results.summary.total++;

  // Test 2: Multi-Platform Memory Capture
  console.log('\n🧪 Test 2: Multi-Platform Memory Capture');
  try {
    const platforms = [
      { source: 'chatgpt', content: 'ChatGPT: How does the HML work?', role: 'user' },
      { source: 'claude', content: 'Claude: The HML orchestrates memories across platforms', role: 'assistant' },
      { source: 'web-browse', content: 'Web: Emma captures from any AI interaction', role: 'user' }
    ];

    let savedCount = 0;
    for (const platform of platforms) {
      const response = await chrome.runtime.sendMessage({
        action: 'saveMemory',
        data: {
          ...platform,
          type: 'conversation',
          metadata: { demo: true, timestamp: Date.now() }
        }
      });

      if (response.success) {
        savedCount++;
        console.log(`✅ Saved ${platform.source} memory:`, response.memoryId);
      } else {
        console.error(`❌ Failed to save ${platform.source}:`, response.error);
      }

      // Small delay between saves
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (savedCount === platforms.length) {
      results.tests.multiPlatform = { 
        status: 'PASSED',
        savedCount,
        message: 'All platform memories saved successfully'
      };
      results.summary.passed++;
    } else {
      throw new Error(`Only ${savedCount}/${platforms.length} memories saved`);
    }
  } catch (error) {
    console.error('❌ Multi-platform test failed:', error);
    results.tests.multiPlatform = { 
      status: 'FAILED', 
      error: error.message 
    };
    results.summary.failed++;
  }
  results.summary.total++;

  // Test 3: Memory Retrieval and Count
  console.log('\n🧪 Test 3: Memory Retrieval and Count');
  try {
    const [statsResponse, memoriesResponse] = await Promise.all([
      chrome.runtime.sendMessage({ action: 'getStats' }),
      chrome.runtime.sendMessage({ action: 'getAllMemories', limit: 20 })
    ]);

    console.log('📊 Stats:', statsResponse);
    console.log('📚 Memories:', memoriesResponse);

    if (statsResponse.success && memoriesResponse.success) {
      const memoryCount = statsResponse.stats.totalMemories;
      const retrievedCount = memoriesResponse.memories.length;

      if (memoryCount > 0 && retrievedCount > 0) {
        results.tests.retrieval = {
          status: 'PASSED',
          totalMemories: memoryCount,
          retrievedMemories: retrievedCount,
          mtapMode: statsResponse.stats.mtapMode,
          message: `Retrieved ${retrievedCount} memories, total count: ${memoryCount}`
        };
        results.summary.passed++;
      } else {
        throw new Error(`No memories found - count: ${memoryCount}, retrieved: ${retrievedCount}`);
      }
    } else {
      throw new Error('Failed to get stats or memories');
    }
  } catch (error) {
    console.error('❌ Retrieval test failed:', error);
    results.tests.retrieval = { 
      status: 'FAILED', 
      error: error.message 
    };
    results.summary.failed++;
  }
  results.summary.total++;

  // Test 4: MTAP Protocol Validation
  console.log('\n🧪 Test 4: MTAP Protocol Validation');
  try {
    const mtapResponse = await chrome.runtime.sendMessage({ action: 'getMTAPStatus' });
    
    if (mtapResponse.success && mtapResponse.mtapMode === true) {
      results.tests.mtap = {
        status: 'PASSED',
        mtapEnabled: true,
        message: 'MTAP protocol active - memories are federation-ready'
      };
      results.summary.passed++;
    } else {
      throw new Error('MTAP mode not enabled');
    }
  } catch (error) {
    console.error('❌ MTAP validation failed:', error);
    results.tests.mtap = { 
      status: 'FAILED', 
      error: error.message 
    };
    results.summary.failed++;
  }
  results.summary.total++;

  // Test 5: Memory Search
  console.log('\n🧪 Test 5: Memory Search');
  try {
    const searchResponse = await chrome.runtime.sendMessage({
      action: 'searchMemories',
      query: 'HML'
    });

    console.log('🔍 Search results:', searchResponse);

    if (searchResponse.success && searchResponse.results.length > 0) {
      results.tests.search = {
        status: 'PASSED',
        resultsCount: searchResponse.results.length,
        message: `Found ${searchResponse.results.length} memories matching 'HML'`
      };
      results.summary.passed++;
    } else {
      throw new Error('No search results found');
    }
  } catch (error) {
    console.error('❌ Search test failed:', error);
    results.tests.search = { 
      status: 'FAILED', 
      error: error.message 
    };
    results.summary.failed++;
  }
  results.summary.total++;

  // Final Summary
  console.log('\n🏁 HML DEMO TEST RESULTS');
  console.log('='.repeat(50));
  
  Object.entries(results.tests).forEach(([testName, result]) => {
    const status = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${status} ${testName}: ${result.status}`);
    if (result.message) console.log(`   ${result.message}`);
    if (result.error) console.log(`   Error: ${result.error}`);
  });

  console.log('\n📋 SUMMARY:');
  console.log(`   Passed: ${results.summary.passed}/${results.summary.total}`);
  console.log(`   Failed: ${results.summary.failed}/${results.summary.total}`);
  
  const successRate = (results.summary.passed / results.summary.total) * 100;
  console.log(`   Success Rate: ${successRate.toFixed(1)}%`);

  if (successRate >= 80) {
    console.log('\n🎉 DEMO READY! Emma HML is functioning correctly.');
    console.log('🌟 The Human Memory Layer is operational and ready for beta!');
  } else {
    console.log('\n⚠️  DEMO NOT READY - Some tests failed.');
    console.log('🔧 Please review failed tests before demo.');
  }

  return results;
}

// Auto-run the test
console.log('🚀 Starting HML Demo Test in 2 seconds...');
setTimeout(runHMLDemoTest, 2000);

// Export for manual testing
window.hmlDemoTest = runHMLDemoTest;
