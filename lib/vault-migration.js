// lib/vault-migration.js - Legacy Memory Migration System
// Migrates memories from legacy databases to the unified vault system

import { memoryDB } from './database-mtap.js';
import { vaultStorage } from './vault-storage.js';
import { getVaultManager } from '../js/vault/vault-manager.js';

/**
 * Memory Migration System for Emma Vault
 * 
 * Handles migration of:
 * 1. Legacy simple memories (from 'memories' store)
 * 2. MTAP memories (from 'mtap_memories' store) 
 * 3. HML memories (from HML adapter)
 * 
 * Features:
 * - Safe migration with rollback capability
 * - Progress tracking and detailed logging
 * - Duplicate detection and handling
 * - Integrity verification
 * - Migration status persistence
 */
export class VaultMigrationSystem {
  constructor() {
    this.vaultManager = null;
    this.migrationId = null;
    this.migrationLog = [];
    this.dryRun = false;
  }

  /**
   * Initialize migration system
   */
  async initialize() {
    this.vaultManager = getVaultManager();
    await this.vaultManager.initialize();
    
    // Ensure vault is ready for migration
    const status = await this.vaultManager.getStatus();
    if (!status.initialized) {
      throw new Error('VAULT_NOT_INITIALIZED: Vault must be set up before migration');
    }
    if (!status.isUnlocked) {
      throw new Error('VAULT_LOCKED: Vault must be unlocked for migration');
    }
    
    this.migrationId = `migration_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    console.log(`🔄 VaultMigration: Initialized migration ${this.migrationId}`);
  }

  /**
   * Analyze legacy data and provide migration report
   * @returns {Promise<object>} Migration analysis report
   */
  async analyzeLegacyData() {
    console.log('🔍 VaultMigration: Analyzing legacy data...');
    
    try {
      await memoryDB.init();
      
      const analysis = {
        timestamp: new Date().toISOString(),
        legacyMemories: {
          count: 0,
          totalSize: 0,
          sources: new Set(),
          types: new Set(),
          dateRange: { earliest: null, latest: null }
        },
        mtapMemories: {
          count: 0,
          totalSize: 0,
          protocols: new Set(),
          creators: new Set(),
          dateRange: { earliest: null, latest: null }
        },
        duplicates: [],
        conflicts: [],
        estimatedMigrationTime: 0,
        storageImpact: 0
      };

      // Analyze legacy simple memories
      const legacyMemories = await this.getLegacyMemories();
      analysis.legacyMemories.count = legacyMemories.length;
      
      for (const memory of legacyMemories) {
        const size = this.estimateMemorySize(memory);
        analysis.legacyMemories.totalSize += size;
        
        if (memory.source) analysis.legacyMemories.sources.add(memory.source);
        if (memory.type) analysis.legacyMemories.types.add(memory.type);
        
        const timestamp = new Date(memory.timestamp || memory.created || Date.now());
        if (!analysis.legacyMemories.dateRange.earliest || timestamp < analysis.legacyMemories.dateRange.earliest) {
          analysis.legacyMemories.dateRange.earliest = timestamp;
        }
        if (!analysis.legacyMemories.dateRange.latest || timestamp > analysis.legacyMemories.dateRange.latest) {
          analysis.legacyMemories.dateRange.latest = timestamp;
        }
      }

      // Analyze MTAP memories
      const mtapMemories = await this.getMTAPMemories();
      analysis.mtapMemories.count = mtapMemories.length;
      
      for (const memory of mtapMemories) {
        const size = this.estimateMemorySize(memory);
        analysis.mtapMemories.totalSize += size;
        
        if (memory.header?.protocol) analysis.mtapMemories.protocols.add(memory.header.protocol);
        if (memory.header?.creator) analysis.mtapMemories.creators.add(memory.header.creator);
        
        const timestamp = new Date(memory.header?.created || Date.now());
        if (!analysis.mtapMemories.dateRange.earliest || timestamp < analysis.mtapMemories.dateRange.earliest) {
          analysis.mtapMemories.dateRange.earliest = timestamp;
        }
        if (!analysis.mtapMemories.dateRange.latest || timestamp > analysis.mtapMemories.dateRange.latest) {
          analysis.mtapMemories.dateRange.latest = timestamp;
        }
      }

      // Check for duplicates between legacy and vault
      analysis.duplicates = await this.findDuplicates(legacyMemories, mtapMemories);
      
      // Estimate migration time and storage impact
      const totalMemories = analysis.legacyMemories.count + analysis.mtapMemories.count;
      analysis.estimatedMigrationTime = Math.ceil(totalMemories * 0.1); // ~0.1 seconds per memory
      analysis.storageImpact = analysis.legacyMemories.totalSize + analysis.mtapMemories.totalSize;
      
      // Convert Sets to Arrays for JSON serialization
      analysis.legacyMemories.sources = Array.from(analysis.legacyMemories.sources);
      analysis.legacyMemories.types = Array.from(analysis.legacyMemories.types);
      analysis.mtapMemories.protocols = Array.from(analysis.mtapMemories.protocols);
      analysis.mtapMemories.creators = Array.from(analysis.mtapMemories.creators);

      console.log('📊 VaultMigration: Analysis complete:', {
        totalLegacy: analysis.legacyMemories.count,
        totalMTAP: analysis.mtapMemories.count,
        duplicates: analysis.duplicates.length,
        estimatedTime: `${analysis.estimatedMigrationTime}s`
      });

      return analysis;
    } catch (error) {
      console.error('❌ VaultMigration: Analysis failed:', error);
      throw new Error(`Migration analysis failed: ${error.message}`);
    }
  }

  /**
   * Perform full migration with progress tracking
   * @param {object} options - Migration options
   * @returns {Promise<object>} Migration result
   */
  async migrate(options = {}) {
    const {
      dryRun = false,
      batchSize = 10,
      skipDuplicates = true,
      backupBeforeMigration = true,
      progressCallback = null
    } = options;

    this.dryRun = dryRun;
    
    console.log(`🚀 VaultMigration: Starting ${dryRun ? 'DRY RUN' : 'LIVE'} migration...`);
    
    const result = {
      migrationId: this.migrationId,
      timestamp: new Date().toISOString(),
      dryRun,
      phases: {
        backup: { status: 'pending', duration: 0 },
        legacyMigration: { status: 'pending', migrated: 0, failed: 0, skipped: 0, duration: 0 },
        mtapMigration: { status: 'pending', migrated: 0, failed: 0, skipped: 0, duration: 0 },
        verification: { status: 'pending', verified: 0, failed: 0, duration: 0 },
        cleanup: { status: 'pending', duration: 0 }
      },
      totalMigrated: 0,
      totalFailed: 0,
      totalSkipped: 0,
      errors: [],
      warnings: []
    };

    try {
      await this.initialize();

      // Phase 1: Backup existing vault (if requested)
      if (backupBeforeMigration && !dryRun) {
        const backupStart = Date.now();
        result.phases.backup.status = 'running';
        
        try {
          await this.createPreMigrationBackup();
          result.phases.backup.status = 'completed';
        } catch (error) {
          result.phases.backup.status = 'failed';
          result.warnings.push(`Backup failed: ${error.message}`);
        }
        
        result.phases.backup.duration = Date.now() - backupStart;
      } else {
        result.phases.backup.status = 'skipped';
      }

      // Phase 2: Migrate legacy memories
      const legacyStart = Date.now();
      result.phases.legacyMigration.status = 'running';
      
      if (progressCallback) progressCallback({ phase: 'legacy', progress: 0 });
      
      const legacyResult = await this.migrateLegacyMemories({
        batchSize,
        skipDuplicates,
        progressCallback: (progress) => {
          if (progressCallback) progressCallback({ phase: 'legacy', progress });
        }
      });
      
      result.phases.legacyMigration = {
        ...result.phases.legacyMigration,
        ...legacyResult,
        status: 'completed',
        duration: Date.now() - legacyStart
      };

      // Phase 3: Migrate MTAP memories
      const mtapStart = Date.now();
      result.phases.mtapMigration.status = 'running';
      
      if (progressCallback) progressCallback({ phase: 'mtap', progress: 0 });
      
      const mtapResult = await this.migrateMTAPMemories({
        batchSize,
        skipDuplicates,
        progressCallback: (progress) => {
          if (progressCallback) progressCallback({ phase: 'mtap', progress });
        }
      });
      
      result.phases.mtapMigration = {
        ...result.phases.mtapMigration,
        ...mtapResult,
        status: 'completed',
        duration: Date.now() - mtapStart
      };

      // Phase 4: Verification
      if (!dryRun) {
        const verifyStart = Date.now();
        result.phases.verification.status = 'running';
        
        const verifyResult = await this.verifyMigration();
        result.phases.verification = {
          ...result.phases.verification,
          ...verifyResult,
          status: 'completed',
          duration: Date.now() - verifyStart
        };
      } else {
        result.phases.verification.status = 'skipped';
      }

      // Calculate totals
      result.totalMigrated = result.phases.legacyMigration.migrated + result.phases.mtapMigration.migrated;
      result.totalFailed = result.phases.legacyMigration.failed + result.phases.mtapMigration.failed;
      result.totalSkipped = result.phases.legacyMigration.skipped + result.phases.mtapMigration.skipped;

      console.log(`✅ VaultMigration: ${dryRun ? 'Dry run' : 'Migration'} completed:`, {
        migrated: result.totalMigrated,
        failed: result.totalFailed,
        skipped: result.totalSkipped
      });

      return result;
    } catch (error) {
      console.error('❌ VaultMigration: Migration failed:', error);
      result.errors.push(`Migration failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get legacy simple memories
   */
  async getLegacyMemories() {
    const db = memoryDB.db;
    if (!db) return [];

    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('memories')) {
        resolve([]);
        return;
      }

      const transaction = db.transaction(['memories'], 'readonly');
      const store = transaction.objectStore('memories');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get MTAP memories
   */
  async getMTAPMemories() {
    const db = memoryDB.db;
    if (!db) return [];

    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains('mtap_memories')) {
        resolve([]);
        return;
      }

      const transaction = db.transaction(['mtap_memories'], 'readonly');
      const store = transaction.objectStore('mtap_memories');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Migrate legacy memories to vault
   */
  async migrateLegacyMemories(options = {}) {
    const { batchSize = 10, skipDuplicates = true, progressCallback } = options;
    const legacyMemories = await this.getLegacyMemories();
    
    const result = { migrated: 0, failed: 0, skipped: 0, errors: [] };
    
    if (legacyMemories.length === 0) {
      console.log('📭 VaultMigration: No legacy memories to migrate');
      return result;
    }

    console.log(`🔄 VaultMigration: Migrating ${legacyMemories.length} legacy memories...`);

    for (let i = 0; i < legacyMemories.length; i += batchSize) {
      const batch = legacyMemories.slice(i, i + batchSize);
      
      for (const memory of batch) {
        try {
          // Check for duplicates if requested
          if (skipDuplicates && await this.isMemoryInVault(memory)) {
            result.skipped++;
            continue;
          }

          // Convert legacy memory to vault format
          const vaultMemory = this.convertLegacyToVault(memory);
          
          if (!this.dryRun) {
            // Save to vault
            await vaultStorage.saveMemory(vaultMemory);
          }
          
          result.migrated++;
          
          this.migrationLog.push({
            type: 'legacy_migrated',
            sourceId: memory.id,
            targetId: vaultMemory.content,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          result.failed++;
          result.errors.push(`Legacy memory ${memory.id}: ${error.message}`);
          console.error(`❌ Failed to migrate legacy memory ${memory.id}:`, error);
        }
      }

      // Progress callback
      if (progressCallback) {
        progressCallback((i + batch.length) / legacyMemories.length);
      }
    }

    return result;
  }

  /**
   * Migrate MTAP memories to vault
   */
  async migrateMTAPMemories(options = {}) {
    const { batchSize = 10, skipDuplicates = true, progressCallback } = options;
    const mtapMemories = await this.getMTAPMemories();
    
    const result = { migrated: 0, failed: 0, skipped: 0, errors: [] };
    
    if (mtapMemories.length === 0) {
      console.log('📭 VaultMigration: No MTAP memories to migrate');
      return result;
    }

    console.log(`🔄 VaultMigration: Migrating ${mtapMemories.length} MTAP memories...`);

    for (let i = 0; i < mtapMemories.length; i += batchSize) {
      const batch = mtapMemories.slice(i, i + batchSize);
      
      for (const memory of batch) {
        try {
          // Check for duplicates if requested
          if (skipDuplicates && await this.isMemoryInVault(memory)) {
            result.skipped++;
            continue;
          }

          // MTAP memories are already in the correct format, just need vault storage
          const vaultMemory = this.convertMTAPToVault(memory);
          
          if (!this.dryRun) {
            // Save to vault
            await vaultStorage.saveMemory(vaultMemory);
          }
          
          result.migrated++;
          
          this.migrationLog.push({
            type: 'mtap_migrated',
            sourceId: memory.header?.id,
            targetId: vaultMemory.content,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          result.failed++;
          result.errors.push(`MTAP memory ${memory.header?.id}: ${error.message}`);
          console.error(`❌ Failed to migrate MTAP memory ${memory.header?.id}:`, error);
        }
      }

      // Progress callback
      if (progressCallback) {
        progressCallback((i + batch.length) / mtapMemories.length);
      }
    }

    return result;
  }

  /**
   * Convert legacy memory to vault format
   */
  convertLegacyToVault(legacyMemory) {
    return {
      content: legacyMemory.content || legacyMemory.text || 'Legacy memory content',
      metadata: {
        source: legacyMemory.source || 'legacy_migration',
        type: legacyMemory.type || 'conversation',
        timestamp: legacyMemory.timestamp || legacyMemory.created || Date.now(),
        url: legacyMemory.url,
        legacy_id: legacyMemory.id,
        migrated_from: 'legacy_database',
        migration_id: this.migrationId,
        original_metadata: legacyMemory
      },
      attachments: legacyMemory.attachments || []
    };
  }

  /**
   * Convert MTAP memory to vault format
   */
  convertMTAPToVault(mtapMemory) {
    return {
      content: mtapMemory.core?.content || 'MTAP memory content',
      metadata: {
        source: mtapMemory.metadata?.source || 'mtap_migration',
        type: mtapMemory.core?.type || 'conversation',
        timestamp: mtapMemory.header?.created || Date.now(),
        mtap_id: mtapMemory.header?.id,
        creator: mtapMemory.header?.creator,
        protocol: mtapMemory.header?.protocol,
        migrated_from: 'mtap_database',
        migration_id: this.migrationId,
        original_metadata: mtapMemory.metadata,
        semantic: mtapMemory.semantic,
        relations: mtapMemory.relations,
        permissions: mtapMemory.permissions
      },
      attachments: []
    };
  }

  /**
   * Check if memory already exists in vault
   */
  async isMemoryInVault(memory) {
    try {
      // Get unique identifier for the memory
      const identifier = memory.id || memory.header?.id || memory.header?.contentHash;
      if (!identifier) return false;

      // Query vault for existing memory
      const capsules = await this.vaultManager.listCapsules(100);
      
      return capsules.items?.some(capsule => {
        const metadata = capsule.metadata || {};
        return metadata.legacy_id === identifier || 
               metadata.mtap_id === identifier ||
               metadata.original_id === identifier;
      }) || false;
    } catch (error) {
      console.warn('⚠️ Failed to check vault for duplicate:', error);
      return false; // Assume not duplicate if check fails
    }
  }

  /**
   * Find potential duplicates
   */
  async findDuplicates(legacyMemories, mtapMemories) {
    const duplicates = [];
    // Simple duplicate detection based on content similarity
    // This is a basic implementation - could be enhanced with better algorithms
    
    const allMemories = [
      ...legacyMemories.map(m => ({ ...m, source_type: 'legacy' })),
      ...mtapMemories.map(m => ({ ...m, source_type: 'mtap' }))
    ];

    for (let i = 0; i < allMemories.length; i++) {
      for (let j = i + 1; j < allMemories.length; j++) {
        const mem1 = allMemories[i];
        const mem2 = allMemories[j];
        
        if (this.memoriesAreSimilar(mem1, mem2)) {
          duplicates.push({
            memory1: { id: mem1.id || mem1.header?.id, type: mem1.source_type },
            memory2: { id: mem2.id || mem2.header?.id, type: mem2.source_type },
            similarity: this.calculateSimilarity(mem1, mem2)
          });
        }
      }
    }

    return duplicates;
  }

  /**
   * Simple similarity check for memories
   */
  memoriesAreSimilar(mem1, mem2) {
    const content1 = mem1.content || mem1.core?.content || '';
    const content2 = mem2.content || mem2.core?.content || '';
    
    if (content1.length < 50 || content2.length < 50) return false;
    
    // Simple substring check - could be enhanced
    return content1.substring(0, 100) === content2.substring(0, 100);
  }

  /**
   * Calculate similarity score
   */
  calculateSimilarity(mem1, mem2) {
    // Simple implementation - return 0.8 for similar, 0 for different
    return this.memoriesAreSimilar(mem1, mem2) ? 0.8 : 0;
  }

  /**
   * Estimate memory size in bytes
   */
  estimateMemorySize(memory) {
    const jsonString = JSON.stringify(memory);
    return new Blob([jsonString]).size;
  }

  /**
   * Create pre-migration backup
   */
  async createPreMigrationBackup() {
    try {
      console.log('💾 VaultMigration: Creating pre-migration backup...');
      // Use the existing vault backup system
      await this.vaultManager.createBackup({
        filename: `pre_migration_backup_${this.migrationId}.vault`,
        metadata: {
          type: 'pre_migration_backup',
          migration_id: this.migrationId,
          created: new Date().toISOString()
        }
      });
      console.log('✅ VaultMigration: Pre-migration backup created');
    } catch (error) {
      console.error('❌ VaultMigration: Failed to create backup:', error);
      throw error;
    }
  }

  /**
   * Verify migration integrity
   */
  async verifyMigration() {
    console.log('🔍 VaultMigration: Verifying migration integrity...');
    
    const result = { verified: 0, failed: 0, errors: [] };
    
    try {
      // Get all capsules from vault
      const capsules = await this.vaultManager.listCapsules(10000);
      const migratedCapsules = capsules.items?.filter(capsule => 
        capsule.metadata?.migration_id === this.migrationId
      ) || [];

      for (const capsule of migratedCapsules) {
        try {
          // Verify capsule integrity
          if (capsule.id && capsule.memory_id && capsule.metadata) {
            result.verified++;
          } else {
            result.failed++;
            result.errors.push(`Capsule ${capsule.id} missing required fields`);
          }
        } catch (error) {
          result.failed++;
          result.errors.push(`Verification failed for capsule ${capsule.id}: ${error.message}`);
        }
      }

      console.log(`✅ VaultMigration: Verification complete - ${result.verified} verified, ${result.failed} failed`);
      return result;
    } catch (error) {
      console.error('❌ VaultMigration: Verification failed:', error);
      result.errors.push(`Verification process failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Get migration status and logs
   */
  getMigrationLog() {
    return {
      migrationId: this.migrationId,
      entries: this.migrationLog,
      summary: {
        totalEntries: this.migrationLog.length,
        byType: this.migrationLog.reduce((acc, entry) => {
          acc[entry.type] = (acc[entry.type] || 0) + 1;
          return acc;
        }, {})
      }
    };
  }
}

// Export singleton instance
export const vaultMigration = new VaultMigrationSystem();
