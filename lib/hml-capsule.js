/**
 * HML v1.0 Memory Capsule Implementation
 * Implements the complete HML capsule schema per specification §1.1
 * 
 * This replaces Emma's MTAP implementation with full HML compliance
 */

import { HMLCanonicalizer } from './hml-canonicalizer.js';
import { HMLCryptography } from './hml-crypto.js';

export class HMLCapsule {
  
  /**
   * Create a new HML-compliant memory capsule
   * @param {string|object} content - Memory content
   * @param {object} metadata - Capsule metadata
   * @returns {Promise<object>} - Complete HML capsule
   */
  static async create(content, metadata = {}) {
    try {
      // Validate input
      if (!content) {
        throw new Error('Content is required for HML capsule creation');
      }
      
      // Generate unique subject for this capsule
      const subject = metadata.subject || await this.generateSubjectDID();
      
      // Create content envelope with encryption
      const contentEnvelope = await this.createContentEnvelope(content, metadata);
      
      // Create provenance tracking
      const provenance = await this.createProvenance(metadata);
      
      // Standardize labels
      const labels = this.standardizeLabels(metadata.labels || {});
      
      // Build complete HML capsule structure
      const capsule = {
        $schema: "https://hml.dev/schemas/v1.0/capsule.json",
        version: "1.0.0",
        capsule: {
          id: null, // Will be set after content hash calculation
          subject,
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          provenance,
          content: contentEnvelope,
          labels,
          extensions: metadata.extensions || {}
        }
      };
      
      // Calculate content-addressable ID
      capsule.capsule.id = await this.generateCapsuleURN(capsule);
      
      // Validate the complete capsule
      this.validateCapsule(capsule);
      
      return capsule;
      
    } catch (error) {
      console.error('HML capsule creation failed:', error);
      throw new Error(`Failed to create HML capsule: ${error.message}`);
    }
  }
  
  /**
   * Generate HML-compliant capsule URN
   * @param {object} capsule - Capsule object (without ID)
   * @returns {Promise<string>} - URN in format "urn:hml:capsule:sha256:hash"
   */
  static async generateCapsuleURN(capsule) {
    // Create a copy without the ID field for hashing
    const capsuleForHashing = JSON.parse(JSON.stringify(capsule));
    delete capsuleForHashing.capsule.id;
    
    const contentHash = await HMLCanonicalizer.calculateContentHash(capsuleForHashing);
    const hashValue = contentHash.split(':')[1]; // Remove 'sha256:' prefix
    
    return `urn:hml:capsule:sha256:${hashValue}`;
  }
  
  /**
   * Create encrypted content envelope per HML specification §5
   * @param {string|object} content - Raw content
   * @param {object} metadata - Content metadata
   * @returns {Promise<object>} - HML content envelope
   */
  static async createContentEnvelope(content, metadata = {}) {
    const contentString = typeof content === 'string' ? content : JSON.stringify(content);
    const contentType = this.detectContentType(content, metadata);
    
    // Calculate content hash before encryption
    const contentHash = await HMLCanonicalizer.calculateContentHash(contentString);
    
    // Generate cryptographic nonce
    const nonce = crypto.getRandomValues(new Uint8Array(24)); // 192 bits for XChaCha20
    
    // Encrypt content using HML-compliant encryption
    const encryptedData = await HMLCryptography.encryptContent(
      contentString,
      metadata.capsuleId || 'temp-id',
      '1.0.0',
      metadata.labels || {}
    );
    
    return {
      type: contentType,
      encoding: "utf-8",
      data: encryptedData.ciphertext,
      contentHash,
      nonce: encryptedData.nonce,
      aad: encryptedData.aad_hash
    };
  }
  
  /**
   * Create provenance tracking for capsule
   * @param {object} metadata - Metadata containing provenance info
   * @returns {Promise<object>} - Provenance object
   */
  static async createProvenance(metadata = {}) {
    const creator = metadata.creator || await this.getDefaultCreatorDID();
    
    return {
      creator,
      signature: null, // Will be set after complete capsule is created
      parentEvent: metadata.parentEvent || null,
      eventLog: metadata.eventLog || await this.generateEventLogURN()
    };
  }
  
  /**
   * Standardize labels according to HML specification
   * @param {object} labels - Raw labels
   * @returns {object} - Standardized labels
   */
  static standardizeLabels(labels) {
    const standardized = {
      sensitivity: "personal", // personal|medical|financial|public
      retention: "permanent",  // 7d|30d|1y|permanent
      sharing: "none"         // none|trusted|medical|public
    };
    
    // Map common label values to HML standard
    if (labels.sensitivity) {
      const sensitivityMap = {
        'private': 'personal',
        'confidential': 'personal',
        'health': 'medical',
        'medical': 'medical',
        'finance': 'financial',
        'financial': 'financial',
        'public': 'public',
        'open': 'public'
      };
      standardized.sensitivity = sensitivityMap[labels.sensitivity] || 'personal';
    }
    
    if (labels.retention) {
      const retentionMap = {
        'week': '7d',
        '7days': '7d',
        'month': '30d',
        '30days': '30d',
        'year': '1y',
        '365days': '1y',
        'forever': 'permanent',
        'permanent': 'permanent'
      };
      standardized.retention = retentionMap[labels.retention] || 'permanent';
    }
    
    if (labels.sharing) {
      const sharingMap = {
        'private': 'none',
        'none': 'none',
        'friends': 'trusted',
        'trusted': 'trusted',
        'healthcare': 'medical',
        'medical': 'medical',
        'public': 'public',
        'open': 'public'
      };
      standardized.sharing = sharingMap[labels.sharing] || 'none';
    }
    
    return standardized;
  }
  
  /**
   * Detect content type from content and metadata
   * @param {any} content - Content to analyze
   * @param {object} metadata - Content metadata
   * @returns {string} - MIME type
   */
  static detectContentType(content, metadata) {
    // Check explicit type in metadata
    if (metadata.type) {
      return metadata.type;
    }
    
    // Detect from content structure
    if (typeof content === 'string') {
      // Check for common formats
      if (content.startsWith('<html') || content.includes('<div')) {
        return 'text/html';
      }
      if (content.startsWith('{') || content.startsWith('[')) {
        try {
          JSON.parse(content);
          return 'application/json';
        } catch {
          return 'text/plain';
        }
      }
      return 'text/plain';
    }
    
    if (typeof content === 'object') {
      if (content.type === 'conversation' || content.messages) {
        return 'application/vnd.hml.conversation+json';
      }
      if (content.type === 'media' || content.attachments) {
        return 'application/vnd.hml.media+json';
      }
      return 'application/json';
    }
    
    return 'application/octet-stream';
  }
  
  /**
   * Generate subject DID for capsule
   * @returns {Promise<string>} - DID identifier
   */
  static async generateSubjectDID() {
    // Use user's DID if available, otherwise generate one
    try {
      const userDID = await this.getUserDID();
      if (userDID) return userDID;
    } catch (error) {
      console.warn('Could not get user DID, generating new one:', error);
    }
    
    // Generate new DID:key based on current user
    const keyId = crypto.getRandomValues(new Uint8Array(16));
    const keyHex = Array.from(keyId).map(b => b.toString(16).padStart(2, '0')).join('');
    return `did:key:z6Mk${keyHex}`;
  }
  
  /**
   * Get default creator DID
   * @returns {Promise<string>} - Creator DID
   */
  static async getDefaultCreatorDID() {
    // Try to get from vault manager or storage
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['emma_creator_did']);
        if (result.emma_creator_did) {
          return result.emma_creator_did;
        }
      }
    } catch (error) {
      console.warn('Could not get creator DID from storage:', error);
    }
    
    // Generate and store new creator DID
    const creatorDID = `did:emma:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ emma_creator_did: creatorDID });
      }
    } catch (error) {
      console.warn('Could not store creator DID:', error);
    }
    
    return creatorDID;
  }
  
  /**
   * Get user DID from storage or vault
   * @returns {Promise<string|null>} - User DID or null
   */
  static async getUserDID() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['emma_user_did']);
        return result.emma_user_did || null;
      }
    } catch (error) {
      console.warn('Could not get user DID:', error);
    }
    return null;
  }
  
  /**
   * Generate event log URN
   * @returns {Promise<string>} - Event log URN
   */
  static async generateEventLogURN() {
    const today = new Date().toISOString().split('T')[0];
    const logId = crypto.getRandomValues(new Uint8Array(8));
    const logHex = Array.from(logId).map(b => b.toString(16).padStart(2, '0')).join('');
    return `urn:hml:log:sha256:${today}_${logHex}`;
  }
  
  /**
   * Validate HML capsule structure
   * @param {object} capsule - Capsule to validate
   * @throws {Error} - If validation fails
   */
  static validateCapsule(capsule) {
    const required = [
      '$schema',
      'version', 
      'capsule',
      'capsule.id',
      'capsule.subject',
      'capsule.created',
      'capsule.modified',
      'capsule.provenance',
      'capsule.content',
      'capsule.labels'
    ];
    
    for (const field of required) {
      if (!this.getNestedProperty(capsule, field)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Validate URN formats
    if (!capsule.capsule.id.startsWith('urn:hml:capsule:')) {
      throw new Error(`Invalid capsule ID format: ${capsule.capsule.id}`);
    }
    
    // Validate timestamp formats
    const timestamps = [capsule.capsule.created, capsule.capsule.modified];
    for (const timestamp of timestamps) {
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(timestamp)) {
        throw new Error(`Invalid timestamp format: ${timestamp}`);
      }
    }
    
    // Validate content structure
    const content = capsule.capsule.content;
    const contentRequired = ['type', 'encoding', 'data', 'contentHash', 'nonce'];
    for (const field of contentRequired) {
      if (content[field] === undefined) {
        throw new Error(`Missing content field: ${field}`);
      }
    }
    
    // Validate labels
    const labels = capsule.capsule.labels;
    const validSensitivity = ['personal', 'medical', 'financial', 'public'];
    const validRetention = ['7d', '30d', '1y', 'permanent'];
    const validSharing = ['none', 'trusted', 'medical', 'public'];
    
    if (!validSensitivity.includes(labels.sensitivity)) {
      throw new Error(`Invalid sensitivity label: ${labels.sensitivity}`);
    }
    if (!validRetention.includes(labels.retention)) {
      throw new Error(`Invalid retention label: ${labels.retention}`);
    }
    if (!validSharing.includes(labels.sharing)) {
      throw new Error(`Invalid sharing label: ${labels.sharing}`);
    }
  }
  
  /**
   * Get nested property safely
   * @param {object} obj - Object to traverse
   * @param {string} path - Dot-separated path
   * @returns {any} - Property value or undefined
   */
  static getNestedProperty(obj, path) {
    return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
  }
  
  /**
   * Convert MTAP memory to HML capsule
   * @param {object} mtapMemory - MTAP format memory
   * @returns {Promise<object>} - HML capsule
   */
  static async convertFromMTAP(mtapMemory) {
    const metadata = {
      subject: mtapMemory.header?.creator || await this.generateSubjectDID(),
      creator: mtapMemory.header?.creator || await this.getDefaultCreatorDID(),
      labels: {
        sensitivity: 'personal',
        retention: 'permanent',
        sharing: 'none'
      },
      extensions: {
        mtap_migration: {
          original_id: mtapMemory.header?.id,
          migrated_at: new Date().toISOString(),
          mtap_version: mtapMemory.header?.version || '1.0.0'
        },
        ...mtapMemory.metadata
      }
    };
    
    return await this.create(mtapMemory.core?.content || mtapMemory.content, metadata);
  }
}

/**
 * HML Capsule utilities for testing and validation
 */
export class HMLCapsuleUtils {
  
  /**
   * Create test capsule with known content for validation
   * @returns {Promise<object>} - Test capsule
   */
  static async createTestCapsule() {
    const testContent = "This is test content for HML validation";
    const testMetadata = {
      labels: {
        sensitivity: 'personal',
        retention: '30d',
        sharing: 'none'
      },
      extensions: {
        test: true,
        created_by: 'HMLCapsuleUtils'
      }
    };
    
    return await HMLCapsule.create(testContent, testMetadata);
  }
  
  /**
   * Validate capsule against HML schema
   * @param {object} capsule - Capsule to validate
   * @returns {object} - Validation results
   */
  static validateAgainstSchema(capsule) {
    try {
      HMLCapsule.validateCapsule(capsule);
      return {
        valid: true,
        errors: []
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error.message]
      };
    }
  }
}

export const HML_CAPSULE_VERSION = "1.0.0";
export const HML_SCHEMA_URL = "https://hml.dev/schemas/v1.0/capsule.json";







