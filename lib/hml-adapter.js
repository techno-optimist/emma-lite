/**
 * HML Protocol Adapter for Emma Lite
 * Bridges Emma's existing MTAP system with HML v1.0 compliance
 * 
 * This provides a compatibility layer while migrating to full HML compliance
 */

import { HMLCapsule } from './hml-capsule.js';
import { HMLCanonicalizer } from './hml-canonicalizer.js';
import { HMLCryptography } from './hml-crypto.js';

export class HMLAdapter {
  
  constructor() {
    this.version = '1.0.0';
    this.protocol = 'HML/1.0';
    this.migrationMode = true; // Enable MTAP compatibility during transition
  }
  
  /**
   * Create HML-compliant memory from Emma's input format
   * @param {string|object} content - Memory content
   * @param {object} metadata - Memory metadata from Emma
   * @returns {Promise<object>} - HML capsule
   */
  async createMemory(content, metadata = {}) {
    try {
      console.log('🔧 HML: Creating memory with HML compliance...', { 
        contentType: typeof content,
        hasMetadata: !!metadata 
      });
      
      // Prepare HML-compliant metadata
      const hmlMetadata = this.adaptEmmaMetadata(metadata);
      
      // Create HML capsule
      const capsule = await HMLCapsule.create(content, hmlMetadata);
      
      console.log('✅ HML: Memory created successfully', {
        capsuleId: capsule.capsule.id,
        contentHash: capsule.capsule.content.contentHash
      });
      
      return capsule;
      
    } catch (error) {
      console.error('❌ HML: Memory creation failed:', error);
      
      // Fallback to MTAP format during migration
      if (this.migrationMode) {
        console.warn('🔄 HML: Falling back to MTAP format...');
        return this.createMTAPFallback(content, metadata);
      }
      
      throw error;
    }
  }
  
  /**
   * Adapt Emma's metadata format to HML requirements
   * @param {object} metadata - Emma metadata
   * @returns {object} - HML-compliant metadata
   */
  adaptEmmaMetadata(metadata) {
    const hmlMetadata = {
      labels: this.adaptLabels(metadata),
      extensions: {
        emma: {
          version: '2.0.0',
          migrated_from: 'mtap',
          migration_time: new Date().toISOString()
        }
      }
    };
    
    // Map Emma-specific fields
    if (metadata.source) {
      hmlMetadata.extensions.emma.source = metadata.source;
    }
    
    if (metadata.role) {
      hmlMetadata.extensions.emma.role = metadata.role;
    }
    
    if (metadata.type) {
      hmlMetadata.extensions.emma.type = metadata.type;
    }
    
    if (metadata.url) {
      hmlMetadata.extensions.emma.url = metadata.url;
    }
    
    if (metadata.timestamp) {
      hmlMetadata.extensions.emma.original_timestamp = metadata.timestamp;
    }
    
    // Include original metadata for reference
    hmlMetadata.extensions.original_metadata = metadata;
    
    return hmlMetadata;
  }
  
  /**
   * Adapt Emma's labels to HML standard labels
   * @param {object} metadata - Emma metadata
   * @returns {object} - HML labels
   */
  adaptLabels(metadata) {
    const labels = {
      sensitivity: 'personal',
      retention: 'permanent',
      sharing: 'none'
    };
    
    // Map based on source
    if (metadata.source) {
      const source = metadata.source.toLowerCase();
      
      if (source.includes('medical') || source.includes('health')) {
        labels.sensitivity = 'medical';
        labels.sharing = 'medical';
      } else if (source.includes('finance') || source.includes('bank')) {
        labels.sensitivity = 'financial';
        labels.sharing = 'none';
      } else if (source.includes('public') || source.includes('blog')) {
        labels.sensitivity = 'public';
        labels.sharing = 'public';
      }
    }
    
    // Map based on content type
    if (metadata.type) {
      const type = metadata.type.toLowerCase();
      
      if (type.includes('conversation') || type.includes('chat')) {
        labels.retention = '1y'; // Keep conversations for a year
      } else if (type.includes('document') || type.includes('file')) {
        labels.retention = 'permanent';
      }
    }
    
    return labels;
  }
  
  /**
   * Store HML memory in Emma's vault system
   * @param {object} hmlCapsule - HML capsule
   * @returns {Promise<string>} - Memory ID
   */
  async store(hmlCapsule) {
    try {
      // Validate HML structure
      this.validateHMLCapsule(hmlCapsule);
      
      // Store in Emma's vault system
      const memoryId = await this.storeInVault(hmlCapsule);
      
      // Create compatibility record for MTAP queries
      if (this.migrationMode) {
        await this.createMTAPCompatibilityRecord(hmlCapsule, memoryId);
      }
      
      return memoryId;
      
    } catch (error) {
      console.error('HML storage failed:', error);
      throw new Error(`Failed to store HML memory: ${error.message}`);
    }
  }
  
  /**
   * Retrieve HML memory with optional format conversion
   * @param {string} memoryId - Memory ID
   * @param {string} format - Output format ('hml', 'mtap', 'emma')
   * @returns {Promise<object>} - Memory in requested format
   */
  async retrieve(memoryId, format = 'hml') {
    try {
      const hmlCapsule = await this.getFromVault(memoryId);
      
      if (!hmlCapsule) {
        return null;
      }
      
      switch (format) {
        case 'hml':
          return hmlCapsule;
          
        case 'mtap':
          return this.convertHMLToMTAP(hmlCapsule);
          
        case 'emma':
          return this.convertHMLToEmma(hmlCapsule);
          
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
      
    } catch (error) {
      console.error('HML retrieval failed:', error);
      throw new Error(`Failed to retrieve HML memory: ${error.message}`);
    }
  }
  
  /**
   * Convert HML capsule to Emma's internal format
   * @param {object} hmlCapsule - HML capsule
   * @returns {object} - Emma format memory
   */
  convertHMLToEmma(hmlCapsule) {
    const emma = hmlCapsule.capsule.extensions?.emma || {};
    
    return {
      id: hmlCapsule.capsule.id,
      content: hmlCapsule.capsule.content.data, // Note: This is encrypted
      role: emma.role || 'user',
      source: emma.source || 'unknown',
      type: emma.type || 'conversation',
      timestamp: new Date(hmlCapsule.capsule.created).getTime(),
      url: emma.url,
      metadata: {
        ...emma.original_metadata,
        hml_compliant: true,
        content_hash: hmlCapsule.capsule.content.contentHash,
        sensitivity: hmlCapsule.capsule.labels.sensitivity,
        retention: hmlCapsule.capsule.labels.retention
      },
      _hmlCapsule: hmlCapsule // Include full HML capsule for advanced operations
    };
  }
  
  /**
   * Convert HML capsule to MTAP format for compatibility
   * @param {object} hmlCapsule - HML capsule
   * @returns {object} - MTAP format memory
   */
  convertHMLToMTAP(hmlCapsule) {
    const emma = hmlCapsule.capsule.extensions?.emma || {};
    
    return {
      header: {
        id: hmlCapsule.capsule.id.replace('urn:hml:capsule:', 'mem_hml_'),
        version: '1.0.0',
        created: hmlCapsule.capsule.created,
        creator: hmlCapsule.capsule.provenance.creator,
        protocol: 'MTAP/1.0-HML-COMPAT',
        contentHash: hmlCapsule.capsule.content.contentHash
      },
      core: {
        type: emma.type || 'conversation',
        content: hmlCapsule.capsule.content.data, // Note: Encrypted
        encoding: hmlCapsule.capsule.content.encoding,
        encrypted: true
      },
      semantic: {
        summary: this.generateSummary(hmlCapsule),
        keywords: this.extractKeywords(hmlCapsule),
        entities: [],
        emotions: []
      },
      relations: {
        previous: null,
        next: null,
        related: [],
        references: []
      },
      permissions: {
        owner: hmlCapsule.capsule.provenance.creator,
        public: hmlCapsule.capsule.labels.sharing !== 'none',
        shared: [],
        agents: []
      },
      metadata: {
        ...emma.original_metadata,
        hml_source: true,
        hml_id: hmlCapsule.capsule.id
      }
    };
  }
  
  /**
   * Generate summary from HML capsule
   * @param {object} hmlCapsule - HML capsule
   * @returns {string} - Summary text
   */
  generateSummary(hmlCapsule) {
    const emma = hmlCapsule.capsule.extensions?.emma || {};
    
    let summary = `HML memory from ${emma.source || 'unknown source'}`;
    
    if (emma.type) {
      summary += ` (${emma.type})`;
    }
    
    summary += ` - ${hmlCapsule.capsule.labels.sensitivity} sensitivity`;
    
    return summary;
  }
  
  /**
   * Extract keywords from HML capsule metadata
   * @param {object} hmlCapsule - HML capsule
   * @returns {Array<string>} - Keywords
   */
  extractKeywords(hmlCapsule) {
    const keywords = [];
    const emma = hmlCapsule.capsule.extensions?.emma || {};
    
    if (emma.source) keywords.push(emma.source);
    if (emma.type) keywords.push(emma.type);
    keywords.push(hmlCapsule.capsule.labels.sensitivity);
    keywords.push('hml-compliant');
    
    return keywords;
  }
  
  /**
   * Validate HML capsule structure
   * @param {object} hmlCapsule - HML capsule to validate
   * @throws {Error} - If validation fails
   */
  validateHMLCapsule(hmlCapsule) {
    if (!hmlCapsule || !hmlCapsule.capsule) {
      throw new Error('Invalid HML capsule: missing capsule structure');
    }
    
    if (!hmlCapsule.capsule.id || !hmlCapsule.capsule.id.startsWith('urn:hml:capsule:')) {
      throw new Error('Invalid HML capsule: missing or invalid ID');
    }
    
    if (!hmlCapsule.capsule.content || !hmlCapsule.capsule.content.contentHash) {
      throw new Error('Invalid HML capsule: missing content or content hash');
    }
    
    if (!hmlCapsule.capsule.labels) {
      throw new Error('Invalid HML capsule: missing labels');
    }
  }
  
  /**
   * Store HML capsule in Emma's vault system
   * @param {object} hmlCapsule - HML capsule
   * @returns {Promise<string>} - Memory ID
   */
  async storeInVault(hmlCapsule) {
    try {
      // Try to get vault storage
      if (typeof window !== 'undefined' && window.vaultStorage) {
        return await window.vaultStorage.saveHMLMemory(hmlCapsule);
      }
      
      // Fallback to database storage
      if (typeof globalThis !== 'undefined' && globalThis.memoryDB) {
        const emmaFormat = this.convertHMLToEmma(hmlCapsule);
        return await globalThis.memoryDB.addMemory(emmaFormat);
      }
      
      // Chrome storage fallback
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const storageKey = `hml_memory_${hmlCapsule.capsule.id}`;
        await chrome.storage.local.set({ [storageKey]: hmlCapsule });
        return hmlCapsule.capsule.id;
      }
      
      throw new Error('No storage system available');
      
    } catch (error) {
      console.error('Vault storage failed:', error);
      throw error;
    }
  }
  
  /**
   * Retrieve HML capsule from vault
   * @param {string} memoryId - Memory ID
   * @returns {Promise<object|null>} - HML capsule or null
   */
  async getFromVault(memoryId) {
    try {
      // Try vault storage first
      if (typeof window !== 'undefined' && window.vaultStorage) {
        return await window.vaultStorage.getHMLMemory(memoryId);
      }
      
      // Try Chrome storage
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const storageKey = `hml_memory_${memoryId}`;
        const result = await chrome.storage.local.get([storageKey]);
        return result[storageKey] || null;
      }
      
      return null;
      
    } catch (error) {
      console.error('Vault retrieval failed:', error);
      return null;
    }
  }
  
  /**
   * Create MTAP compatibility record for migration period
   * @param {object} hmlCapsule - HML capsule
   * @param {string} memoryId - Memory ID
   */
  async createMTAPCompatibilityRecord(hmlCapsule, memoryId) {
    try {
      const mtapFormat = this.convertHMLToMTAP(hmlCapsule);
      
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const compatKey = `mtap_compat_${memoryId}`;
        await chrome.storage.local.set({ [compatKey]: mtapFormat });
      }
      
    } catch (error) {
      console.warn('Failed to create MTAP compatibility record:', error);
      // Non-critical error, don't throw
    }
  }
  
  /**
   * Create MTAP fallback memory during migration
   * @param {string|object} content - Content
   * @param {object} metadata - Metadata
   * @returns {object} - MTAP format memory
   */
  createMTAPFallback(content, metadata) {
    console.warn('🔄 Creating MTAP fallback memory (non-HML compliant)');
    
    return {
      header: {
        id: `mem_fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        version: '1.0.0',
        created: new Date().toISOString(),
        creator: 'emma-lite-fallback',
        protocol: 'MTAP/1.0-FALLBACK'
      },
      core: {
        type: metadata.type || 'conversation',
        content: content,
        encoding: 'UTF-8',
        encrypted: false
      },
      semantic: {
        summary: typeof content === 'string' ? content.substring(0, 200) : 'Generated memory',
        keywords: [],
        entities: [],
        emotions: []
      },
      relations: {
        previous: null,
        next: null,
        related: [],
        references: []
      },
      permissions: {
        owner: 'emma-lite',
        public: false,
        shared: [],
        agents: []
      },
      metadata: {
        ...metadata,
        fallback: true,
        needs_hml_migration: true
      }
    };
  }
  
  /**
   * Get migration statistics
   * @returns {Promise<object>} - Migration stats
   */
  async getMigrationStats() {
    try {
      let hmlCount = 0;
      let mtapCount = 0;
      let fallbackCount = 0;
      
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const allData = await chrome.storage.local.get(null);
        
        for (const [key, value] of Object.entries(allData)) {
          if (key.startsWith('hml_memory_')) {
            hmlCount++;
          } else if (key.startsWith('mtap_compat_')) {
            mtapCount++;
          } else if (value && value.metadata && value.metadata.fallback) {
            fallbackCount++;
          }
        }
      }
      
      return {
        hml_compliant: hmlCount,
        mtap_compatible: mtapCount,
        fallback_records: fallbackCount,
        migration_progress: hmlCount / (hmlCount + mtapCount + fallbackCount) || 0
      };
      
    } catch (error) {
      console.error('Failed to get migration stats:', error);
      return {
        hml_compliant: 0,
        mtap_compatible: 0,
        fallback_records: 0,
        migration_progress: 0
      };
    }
  }
}

/**
 * Global HML adapter instance
 */
export const hmlAdapter = new HMLAdapter();

/**
 * Initialize HML adapter with Emma's existing systems
 */
export async function initializeHMLAdapter() {
  try {
    console.log('🚀 Initializing HML Adapter for Emma Lite...');
    
    // Check migration status
    const stats = await hmlAdapter.getMigrationStats();
    console.log('📊 HML Migration Status:', stats);
    
    // Enable/disable migration mode based on existing data
    if (stats.mtap_compatible > 0 || stats.fallback_records > 0) {
      hmlAdapter.migrationMode = true;
      console.log('🔄 Migration mode enabled for backward compatibility');
    } else {
      hmlAdapter.migrationMode = false;
      console.log('✅ Full HML mode enabled');
    }
    
    return hmlAdapter;
    
  } catch (error) {
    console.error('❌ HML Adapter initialization failed:', error);
    throw error;
  }
}

export const HML_ADAPTER_VERSION = "1.0.0";

