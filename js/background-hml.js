// js/background-hml.js - HML-enhanced background script for Emma Lite
console.log('🚀 HML Background script loading...');

// Import existing Emma components
import { memoryDB } from '../lib/database-mtap.js';
import { mtapAdapter } from '../lib/mtap-adapter.js';
import { registerVaultMessageHandlers, VaultService } from './vault/service.js';
import { getVaultManager } from './vault/vault-manager.js';
import { vaultStorage } from '../lib/vault-storage.js';
import { vaultBackup } from '../lib/vault-backup.js';

// Import new HML components
import { hmlAdapter, initializeHMLAdapter } from '../lib/hml-adapter.js';
import { HMLCapsule } from '../lib/hml-capsule.js';
import { HMLCanonicalizer } from '../lib/hml-canonicalizer.js';
import { HMLCryptography } from '../lib/hml-crypto.js';

console.log('✅ HML Background imports successful');

// Global state for HML migration
let hmlInitialized = false;
let migrationMode = true;
let migrationStats = null;

// Initialize HML adapter on service worker start
async function initializeHML() {
  try {
    if (hmlInitialized) {
      console.log('🔧 HML already initialized');
      return;
    }
    
    console.log('🔧 Initializing HML Protocol Adapter...');
    
    // Initialize HML adapter
    await initializeHMLAdapter();
    
    // Check migration status
    migrationStats = await hmlAdapter.getMigrationStats();
    console.log('📊 HML Migration Status:', migrationStats);
    
    // Determine if we need migration mode
    migrationMode = migrationStats.mtap_compatible > 0 || migrationStats.fallback_records > 0;
    
    if (migrationMode) {
      console.log('🔄 HML: Running in migration mode for backward compatibility');
    } else {
      console.log('✅ HML: Running in full compliance mode');
    }
    
    hmlInitialized = true;
    console.log('🎉 HML Protocol Adapter initialized successfully');
    
  } catch (error) {
    console.error('❌ HML initialization failed:', error);
    // Don't throw - allow Emma to continue with MTAP fallback
    hmlInitialized = false;
  }
}

// Enhanced memory save with HML compliance
async function saveMemoryWithHML(memoryData, options = {}) {
  try {
    console.log('💾 HML: Saving memory with HML compliance...', {
      contentLength: memoryData.content?.length || 0,
      source: memoryData.source,
      type: memoryData.type
    });
    
    // Ensure HML is initialized
    if (!hmlInitialized) {
      await initializeHML();
    }
    
    // Try HML-compliant storage first
    if (hmlInitialized) {
      try {
        const hmlCapsule = await hmlAdapter.createMemory(memoryData.content, {
          source: memoryData.source,
          role: memoryData.role,
          type: memoryData.type,
          url: memoryData.url,
          timestamp: memoryData.timestamp,
          ...memoryData.metadata
        });
        
        const memoryId = await hmlAdapter.store(hmlCapsule);
        
        console.log('✅ HML: Memory saved with HML compliance', {
          memoryId,
          capsuleId: hmlCapsule.capsule.id,
          contentHash: hmlCapsule.capsule.content.contentHash
        });
        
        // Update migration stats
        await updateMigrationProgress();
        
        return memoryId;
        
      } catch (hmlError) {
        console.error('⚠️ HML: HML storage failed, falling back to MTAP:', hmlError);
        
        // Fall back to MTAP during migration period
        if (migrationMode) {
          return await saveMemoryMTAP(memoryData, options);
        } else {
          throw hmlError;
        }
      }
    } else {
      // HML not available, use MTAP fallback
      return await saveMemoryMTAP(memoryData, options);
    }
    
  } catch (error) {
    console.error('❌ Memory save failed completely:', error);
    throw error;
  }
}

// MTAP fallback function
async function saveMemoryMTAP(memoryData, options = {}) {
  console.log('🔄 Using MTAP fallback for memory storage...');
  
  try {
    // SECURITY FIX: Route to staging instead of legacy unencrypted database
    const response = await chrome.runtime.sendMessage({ 
      action: 'ephemeral.add', 
      data: memoryData 
    });
    const memoryId = response?.success ? response.id : null;
    
    console.log('✅ MTAP: Memory saved via fallback', { memoryId });
    
    // Mark for future HML migration
    await markForHMLMigration(memoryId, memoryData);
    
    return memoryId;
    
  } catch (error) {
    console.error('❌ MTAP fallback failed:', error);
    throw error;
  }
}

// Mark memory for future HML migration
async function markForHMLMigration(memoryId, memoryData) {
  try {
    const migrationRecord = {
      memoryId,
      needsHMLMigration: true,
      createdAt: Date.now(),
      source: memoryData.source,
      type: memoryData.type
    };
    
    await chrome.storage.local.set({
      [`migration_${memoryId}`]: migrationRecord
    });
    
  } catch (error) {
    console.warn('Failed to mark for HML migration:', error);
    // Non-critical error
  }
}

// Update migration progress tracking
async function updateMigrationProgress() {
  try {
    migrationStats = await hmlAdapter.getMigrationStats();
    
    // Broadcast migration progress to UI
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'HML_MIGRATION_PROGRESS',
          stats: migrationStats
        });
      } catch (error) {
        // Tab might not have content script, ignore
      }
    }
    
  } catch (error) {
    console.warn('Failed to update migration progress:', error);
  }
}

// Enhanced message handler with HML support
async function handleMessage(message, sender, sendResponse) {
  try {
    console.log('📨 HML Background: Received message:', message.action);
    
    switch (message.action) {
      
      case 'saveMemory':
        try {
          const memoryId = await saveMemoryWithHML(message.data, message.options);
          sendResponse({ success: true, memoryId });
        } catch (error) {
          console.error('Save memory failed:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'getHMLStatus':
        try {
          const status = {
            initialized: hmlInitialized,
            migrationMode,
            migrationStats: migrationStats || await hmlAdapter.getMigrationStats(),
            compliance: hmlInitialized ? 'hml-v1.0' : 'mtap-fallback'
          };
          sendResponse({ success: true, status });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'migrateToHML':
        try {
          const result = await migrateExistingMemories();
          sendResponse({ success: true, result });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'validateHMLCompliance':
        try {
          const validation = await validateHMLCompliance();
          sendResponse({ success: true, validation });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'testHMLVectors':
        try {
          const results = await runHMLTestVectors();
          sendResponse({ success: true, results });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      // Handle existing Emma actions with HML enhancement
      case 'getAllMemories':
        try {
          const memories = await getAllMemoriesHML(message.limit, message.offset);
          sendResponse({ success: true, memories });
        } catch (error) {
          console.error('Get memories failed:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'searchMemories':
        try {
          const results = await searchMemoriesHML(message.query, message.limit);
          sendResponse({ success: true, memories: results });
        } catch (error) {
          console.error('Search memories failed:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'getStats':
        try {
          const stats = await getStatsHML();
          sendResponse({ success: true, stats });
        } catch (error) {
          console.error('Get stats failed:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      default:
        // Pass through to original background script logic
        return await handleOriginalMessage(message, sender, sendResponse);
    }
    
  } catch (error) {
    console.error('Message handler error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Get all memories with HML format support
async function getAllMemoriesHML(limit = 100, offset = 0) {
  try {
    // Get memories from both HML and MTAP sources during migration
    const memories = [];
    
    if (hmlInitialized) {
      // Get HML memories
      try {
        const hmlMemories = await getHMLMemories(limit, offset);
        memories.push(...hmlMemories);
      } catch (error) {
        console.warn('Failed to get HML memories:', error);
      }
    }
    
    // Get MTAP memories if in migration mode
    if (migrationMode) {
      try {
        const mtapMemories = await memoryDB.getAllMemories(limit, offset);
        const converted = mtapMemories.map(m => ({
          ...m,
          _format: 'mtap',
          _needsHMLMigration: true
        }));
        memories.push(...converted);
      } catch (error) {
        console.warn('Failed to get MTAP memories:', error);
      }
    }
    
    // Sort by timestamp and limit
    return memories
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, limit);
      
  } catch (error) {
    console.error('Failed to get all memories:', error);
    throw error;
  }
}

// Get HML memories
async function getHMLMemories(limit, offset) {
  // TODO: Implement proper HML memory retrieval
  // For now, return empty array
  return [];
}

// Search memories with HML support
async function searchMemoriesHML(query, limit = 20) {
  const results = [];
  
  if (hmlInitialized) {
    // TODO: Implement HML-aware search
  }
  
  if (migrationMode) {
    // Search MTAP memories
    const mtapResults = await memoryDB.searchMemories(query, limit);
    results.push(...mtapResults.map(m => ({ ...m, _format: 'mtap' })));
  }
  
  return results.slice(0, limit);
}

// Get stats with HML information
async function getStatsHML() {
  const baseStats = await memoryDB.getStats();
  
  const hmlStats = hmlInitialized ? await hmlAdapter.getMigrationStats() : {
    hml_compliant: 0,
    mtap_compatible: 0,
    fallback_records: 0,
    migration_progress: 0
  };
  
  return {
    ...baseStats,
    hml: {
      initialized: hmlInitialized,
      compliance: hmlInitialized ? 'v1.0' : 'none',
      migration: hmlStats,
      mode: migrationMode ? 'migration' : 'full'
    }
  };
}

// Migrate existing memories to HML format
async function migrateExistingMemories() {
  try {
    console.log('🔄 Starting HML migration of existing memories...');
    
    if (!hmlInitialized) {
      throw new Error('HML not initialized');
    }
    
    // Get all MTAP memories
    const mtapMemories = await memoryDB.getAllMemories(10000); // Large limit
    
    let migrated = 0;
    let failed = 0;
    const errors = [];
    
    for (const mtapMemory of mtapMemories) {
      try {
        // Convert to HML format
        const hmlCapsule = await HMLCapsule.convertFromMTAP(mtapMemory);
        
        // Store HML capsule
        await hmlAdapter.store(hmlCapsule);
        
        migrated++;
        
        // Remove migration marker
        await chrome.storage.local.remove([`migration_${mtapMemory.id}`]);
        
      } catch (error) {
        console.error(`Failed to migrate memory ${mtapMemory.id}:`, error);
        failed++;
        errors.push({
          memoryId: mtapMemory.id,
          error: error.message
        });
      }
    }
    
    // Update migration stats
    await updateMigrationProgress();
    
    console.log(`✅ HML Migration completed: ${migrated} migrated, ${failed} failed`);
    
    return {
      migrated,
      failed,
      errors: errors.slice(0, 10), // Limit error details
      total: mtapMemories.length
    };
    
  } catch (error) {
    console.error('❌ HML Migration failed:', error);
    throw error;
  }
}

// Validate HML compliance
async function validateHMLCompliance() {
  try {
    const results = {
      canonicalization: false,
      encryption: false,
      capsuleSchema: false,
      testVectors: false,
      overall: false
    };
    
    if (!hmlInitialized) {
      return results;
    }
    
    // Test canonicalization
    try {
      const testData = { test: "data", nested: { prop: 123 } };
      const canonical = HMLCanonicalizer.canonicalize(testData);
      const hash = await HMLCanonicalizer.calculateContentHash(testData);
      results.canonicalization = canonical && hash && hash.startsWith('sha256:');
    } catch (error) {
      console.error('Canonicalization test failed:', error);
    }
    
    // Test encryption
    try {
      const testResult = await HMLCryptography.encryptContent(
        "test content", "test-capsule", "1.0.0", { sensitivity: "personal" }
      );
      results.encryption = testResult && testResult.algorithm === "XChaCha20-Poly1305";
    } catch (error) {
      console.error('Encryption test failed:', error);
    }
    
    // Test capsule schema
    try {
      const testCapsule = await HMLCapsule.create("test content", {
        labels: { sensitivity: "personal", retention: "30d", sharing: "none" }
      });
      results.capsuleSchema = testCapsule && testCapsule.capsule && testCapsule.capsule.id;
    } catch (error) {
      console.error('Capsule schema test failed:', error);
    }
    
    // Overall compliance
    results.overall = results.canonicalization && results.encryption && results.capsuleSchema;
    
    return results;
    
  } catch (error) {
    console.error('HML compliance validation failed:', error);
    throw error;
  }
}

// Run HML test vectors
async function runHMLTestVectors() {
  try {
    const results = [];
    
    if (!hmlInitialized) {
      return { error: 'HML not initialized' };
    }
    
    // Import test utilities
    const { HMLCanonicalTestUtils } = await import('../lib/hml-canonicalizer.js');
    
    // Run TV-1.1: Canonicalization
    try {
      const tv11Result = await HMLCanonicalTestUtils.runTestVector_TV_1_1();
      results.push(tv11Result);
    } catch (error) {
      results.push({
        testVector: 'TV-1.1',
        passed: false,
        error: error.message
      });
    }
    
    return {
      results,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      total: results.length
    };
    
  } catch (error) {
    console.error('Test vector execution failed:', error);
    throw error;
  }
}

// Fallback to original message handling
async function handleOriginalMessage(message, sender, sendResponse) {
  // This would contain the original background.js message handling logic
  // For now, return not implemented
  console.warn('Original message handler not implemented for:', message.action);
  sendResponse({ success: false, error: 'Not implemented in HML background' });
}

// Set up message listeners
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep message channel open for async response
});

// Initialize on service worker start
console.log('🔧 Setting up HML initialization...');
initializeHML().catch(error => {
  console.error('❌ Failed to initialize HML on startup:', error);
});

// Also ensure vault handlers are registered
try {
  registerVaultMessageHandlers();
  console.log('🔐 Vault message handlers registered');
} catch (e) {
  console.warn('Vault handlers registration error:', e);
}

console.log('✅ HML Background script setup complete');

export { 
  hmlAdapter, 
  initializeHML, 
  saveMemoryWithHML, 
  validateHMLCompliance, 
  migrateExistingMemories 
};






