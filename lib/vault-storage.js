// lib/vault-storage.js - Unified Vault-Based Storage System
// Integrates MTAP protocol with vault-based file organization

import { mtapAdapter } from './mtap-adapter.js';
import { getVaultManager } from '../js/vault/vault-manager.js';
import { VaultService } from '../js/vault/service.js';
import { utf8ToBytes, bytesToUtf8, encryptWithKey, decryptWithKey, generateRandomBytes } from '../js/vault/crypto.js';

/**
 * Vault-specific error class
 */
class VaultError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.type = 'VaultError';
  }
}

/**
 * Unified Vault Storage - manages all memory and attachment storage within vault context
 * Replaces the dual system of MTAP + Vault with a single, integrated approach
 */
export class VaultStorage {
  constructor() {
    this.vaultManager = null;
    this.databases = new Map(); // Cache of vault-specific databases
    this.initPromise = null;
  }

  async init() {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = (async () => {
      this.vaultManager = getVaultManager();
      await this.vaultManager.initialize();
      console.log('🗄️ VaultStorage: Initialized');
    })();
    
    return this.initPromise;
  }

  /**
   * Get vault-specific database
   * Creates vault-isolated IndexedDB for memories, attachments, etc.
   */
  async getVaultDatabase(vaultId) {
    if (!vaultId) {
      const status = await this.vaultManager.getStatus();
      if (!status.vaultId) {
        throw new Error('No active vault - please unlock a vault first');
      }
      vaultId = status.vaultId;
    }

    if (this.databases.has(vaultId)) {
      return this.databases.get(vaultId);
    }

    const dbName = `EmmaVault_${vaultId}`;
    const db = await this.openVaultDatabase(dbName);
    this.databases.set(vaultId, db);
    return db;
  }

  /**
   * Open vault-specific IndexedDB with proper schema
   */
  async openVaultDatabase(dbName) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Memories store (MTAP-compliant)
        if (!db.objectStoreNames.contains('memories')) {
          const memoryStore = db.createObjectStore('memories', { 
            keyPath: 'header.id'
          });
          memoryStore.createIndex('created', 'header.created', { unique: false });
          memoryStore.createIndex('type', 'core.type', { unique: false });
          memoryStore.createIndex('source', 'metadata.source', { unique: false });
          memoryStore.createIndex('vault_id', 'header.vault_id', { unique: false });
        }

        // Capsules store (encrypted vault entries)
        if (!db.objectStoreNames.contains('capsules')) {
          const capsuleStore = db.createObjectStore('capsules', { 
            keyPath: 'id'
          });
          capsuleStore.createIndex('memory_id', 'memory_id', { unique: false });
          capsuleStore.createIndex('created', 'created', { unique: false });
          capsuleStore.createIndex('vault_id', 'vault_id', { unique: false });
        }

        // Attachments store
        if (!db.objectStoreNames.contains('attachments')) {
          const attachmentStore = db.createObjectStore('attachments', { 
            keyPath: 'id'
          });
          attachmentStore.createIndex('memory_id', 'memory_id', { unique: false });
          attachmentStore.createIndex('content_hash', 'content_hash', { unique: false });
          attachmentStore.createIndex('type', 'type', { unique: false });
        }

        // Encrypted blobs store
        if (!db.objectStoreNames.contains('blobs')) {
          const blobStore = db.createObjectStore('blobs', { 
            keyPath: 'content_hash'
          });
          blobStore.createIndex('created', 'created', { unique: false });
        }

        console.log('🗄️ VaultStorage: Created vault database schema:', dbName);
      };
    });
  }

  /**
   * Save memory with MTAP compliance and vault integration
   * Replaces both saveMemory() and vault.createCapsule() flows
   */
  async saveMemory(memoryData, options = {}) {
    await this.init();
    
    // 1. Ensure vault is unlocked
    const status = await this.vaultManager.getStatus();
    if (!status.isUnlocked) {
      throw new Error('Vault is locked - please unlock to save memories');
    }

    const vaultId = options.vaultId || status.vaultId;
    if (!vaultId) {
      throw new Error('No vault ID available');
    }

    // 2. Create MTAP-compliant memory structure
    const mtapMemory = await mtapAdapter.createMemory(memoryData.content, {
      ...memoryData.metadata,
      vault_id: vaultId,
      source: memoryData.source || 'unknown',
      application: 'emma-lite'
    });

    // 3. Add integrity checksum to memory
    mtapMemory.integrity = {
      content_checksum: await this.calculateChecksum(mtapMemory.core.content),
      header_checksum: await this.calculateChecksum(JSON.stringify(mtapMemory.header)),
      created_at: new Date().toISOString()
    };

    // 3. Get vault database
    const db = await this.getVaultDatabase(vaultId);
    
    // 4. Encrypt memory content for vault storage
    const keyring = VaultService.getKeyring();
    if (!keyring || !keyring.masterKey) {
      throw new VaultError('VAULT_LOCKED', 'Vault must be unlocked before storing data - no master key available');
    }
    
    const contentBytes = utf8ToBytes(mtapMemory.core.content);
    const { iv, ciphertext } = await encryptWithKey(keyring.masterKey, contentBytes);
    
    // 5. Create vault capsule
    const capsuleId = `cap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const capsule = {
      id: capsuleId,
      memory_id: mtapMemory.header.id,
      vault_id: vaultId,
      created: mtapMemory.header.created,
      encrypted_content: {
        iv: Array.from(iv),
        data: Array.from(ciphertext)
      },
      metadata: {
        type: mtapMemory.core.type,
        source: mtapMemory.metadata.source,
        size: contentBytes.length
      }
    };

    // 6. Store data atomically using transaction
    await this.storeMemoryAtomically(db, {
      memory: mtapMemory,
      capsule: capsule,
      attachments: memoryData.attachments || []
    }, mtapMemory.header.id, vaultId);

    console.log('🗄️ VaultStorage: Saved memory atomically', {
      memoryId: mtapMemory.header.id,
      capsuleId,
      vaultId,
      type: mtapMemory.core.type,
      attachmentCount: memoryData.attachments ? memoryData.attachments.length : 0
    });

    // 8. Broadcast events for UI updates
    this.broadcastMemoryEvent('memory.created', {
      memoryId: mtapMemory.header.id,
      capsuleId,
      vaultId
    });

    return mtapMemory.header.id;
  }

  /**
   * Save attachments to vault with encryption and deduplication
   */
  async saveAttachments(attachments, memoryId, vaultId, db) {
    const keyring = VaultService.getKeyring();
    if (!keyring || !keyring.masterKey) {
      throw new VaultError('VAULT_LOCKED', 'Vault must be unlocked before saving attachments - no master key available');
    }
    
    const savedAttachments = [];

    for (const attachment of attachments) {
      try {
        // 1. Generate content hash for deduplication
        const contentHash = await this.generateContentHash(attachment.data);
        
        // 2. Check if blob already exists
        const existingBlob = await this.getFromDB(db, 'blobs', contentHash);
        
        // 3. Encrypt and store blob if new
        if (!existingBlob) {
          const contentBytes = typeof attachment.data === 'string' 
            ? this.dataURLToBytes(attachment.data)
            : new Uint8Array(attachment.data);
          
          const { iv, ciphertext } = await encryptWithKey(keyring.masterKey, contentBytes);
          
          const blob = {
            content_hash: contentHash,
            encrypted_data: {
              iv: Array.from(iv),
              data: Array.from(ciphertext)
            },
            created: new Date().toISOString(),
            size: contentBytes.length,
            mime_type: attachment.mimeType || this.detectMimeType(attachment.filename)
          };
          
          await this.storeInDB(db, 'blobs', blob);
        }

        // 4. Create attachment record
        const attachmentId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const attachmentRecord = {
          id: attachmentId,
          memory_id: memoryId,
          vault_id: vaultId,
          content_hash: contentHash,
          filename: attachment.filename || `attachment_${attachmentId}`,
          mime_type: attachment.mimeType || this.detectMimeType(attachment.filename),
          size: attachment.size || 0,
          caption: attachment.caption || '',
          created: new Date().toISOString(),
          metadata: attachment.metadata || {}
        };

        await this.storeInDB(db, 'attachments', attachmentRecord);
        savedAttachments.push(attachmentRecord);

        console.log('🗄️ VaultStorage: Saved attachment', {
          attachmentId,
          contentHash,
          filename: attachmentRecord.filename,
          size: attachmentRecord.size
        });

      } catch (error) {
        console.error('🗄️ VaultStorage: Failed to save attachment:', error);
      }
    }

    return savedAttachments;
  }

  /**
   * List memories from current vault
   */
  async listMemories(limit = 50, vaultId = null) {
    await this.init();
    
    const status = await this.vaultManager.getStatus();
    if (!status.isUnlocked) {
      return { success: true, items: [], locked: true };
    }

    vaultId = vaultId || status.vaultId;
    const db = await this.getVaultDatabase(vaultId);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['memories'], 'readonly');
      const store = transaction.objectStore('memories');
      const index = store.index('created');
      const request = index.openCursor(null, 'prev'); // Newest first
      
      const memories = [];
      let count = 0;
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && count < limit) {
          memories.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve({ success: true, items: memories });
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get memory content (decrypted)
   */
  async getMemory(memoryId, vaultId = null) {
    await this.init();
    
    const status = await this.vaultManager.getStatus();
    if (!status.isUnlocked) {
      throw new Error('Vault is locked');
    }

    vaultId = vaultId || status.vaultId;
    const db = await this.getVaultDatabase(vaultId);
    
    // 1. Get MTAP memory record
    const memory = await this.getFromDB(db, 'memories', memoryId);
    if (!memory) {
      throw new Error('Memory not found');
    }

    // 2. Get encrypted capsule
    const capsules = await this.queryDB(db, 'capsules', 'memory_id', memoryId);
    if (capsules.length === 0) {
      throw new Error('Memory capsule not found');
    }
    
    const capsule = capsules[0];

    // 3. Decrypt content
    const keyring = VaultService.getKeyring();
    if (!keyring || !keyring.masterKey) {
      throw new VaultError('VAULT_LOCKED', 'Vault must be unlocked before retrieving memory content - no master key available');
    }
    
    const iv = new Uint8Array(capsule.encrypted_content.iv);
    const ciphertext = new Uint8Array(capsule.encrypted_content.data);
    const decryptedBytes = await decryptWithKey(keyring.masterKey, iv, ciphertext);
    const decryptedContent = bytesToUtf8(decryptedBytes);

    // 4. Validate integrity before returning
    if (memory.integrity) {
      await this.validateMemoryIntegrity(memory, decryptedContent);
    } else {
      console.warn('🗄️ VaultStorage: Memory has no integrity checksum:', memoryId);
    }

    // 5. Reconstruct complete memory
    return {
      ...memory,
      core: {
        ...memory.core,
        content: decryptedContent
      },
      vault: {
        capsule_id: capsule.id,
        vault_id: vaultId
      }
    };
  }

  /**
   * Store memory data atomically using a single transaction
   */
  async storeMemoryAtomically(db, data, memoryId, vaultId) {
    const { memory, capsule, attachments } = data;
    
    return new Promise(async (resolve, reject) => {
      // Determine required stores based on data
      const storeNames = ['memories', 'capsules'];
      if (attachments && attachments.length > 0) {
        storeNames.push('attachments', 'blobs');
      }
      
      const transaction = db.transaction(storeNames, 'readwrite');
      
      transaction.oncomplete = () => {
        console.log('🗄️ VaultStorage: Atomic transaction completed successfully');
        resolve();
      };
      
      transaction.onerror = () => {
        console.error('🗄️ VaultStorage: Atomic transaction failed:', transaction.error);
        reject(new VaultError('TRANSACTION_FAILED', `Failed to store memory atomically: ${transaction.error.message}`));
      };
      
      transaction.onabort = () => {
        console.error('🗄️ VaultStorage: Atomic transaction aborted');
        reject(new VaultError('TRANSACTION_ABORTED', 'Memory storage transaction was aborted'));
      };
      
      try {
        // Store memory and capsule
        const memoryStore = transaction.objectStore('memories');
        const capsuleStore = transaction.objectStore('capsules');
        
        memoryStore.put(memory);
        capsuleStore.put(capsule);
        
        // Process attachments if any
        if (attachments && attachments.length > 0) {
          await this.processAttachmentsInTransaction(transaction, attachments, memoryId, vaultId);
        }
        
      } catch (error) {
        console.error('🗄️ VaultStorage: Error during atomic operation:', error);
        transaction.abort();
        reject(error);
      }
    });
  }

  /**
   * Process attachments within an existing transaction
   */
  async processAttachmentsInTransaction(transaction, attachments, memoryId, vaultId) {
    const attachmentStore = transaction.objectStore('attachments');
    const blobStore = transaction.objectStore('blobs');
    
    const keyring = VaultService.getKeyring();
    if (!keyring || !keyring.masterKey) {
      throw new VaultError('VAULT_LOCKED', 'Vault must be unlocked before processing attachments');
    }
    
    for (const attachment of attachments) {
      try {
        // Generate content hash for deduplication
        const contentHash = await this.generateContentHash(attachment.data);
        
        // Check if blob already exists (simple check - in production would query first)
        const contentBytes = typeof attachment.data === 'string' 
          ? this.dataURLToBytes(attachment.data)
          : new Uint8Array(attachment.data);
        
        const { iv, ciphertext } = await encryptWithKey(keyring.masterKey, contentBytes);
        
        const blob = {
          content_hash: contentHash,
          encrypted_data: {
            iv: Array.from(iv),
            data: Array.from(ciphertext)
          },
          created: new Date().toISOString(),
          size: contentBytes.length,
          mime_type: attachment.mimeType || this.detectMimeType(attachment.filename)
        };
        
        // Store blob
        blobStore.put(blob);
        
        // Create attachment record
        const attachmentId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const attachmentRecord = {
          id: attachmentId,
          memory_id: memoryId,
          vault_id: vaultId,
          content_hash: contentHash,
          filename: attachment.filename || `attachment_${attachmentId}`,
          mime_type: attachment.mimeType || this.detectMimeType(attachment.filename),
          size: attachment.size || contentBytes.length,
          caption: attachment.caption || '',
          created: new Date().toISOString(),
          metadata: attachment.metadata || {}
        };
        
        // Store attachment record
        attachmentStore.put(attachmentRecord);
        
      } catch (error) {
        console.error('🗄️ VaultStorage: Failed to process attachment in transaction:', error);
        throw error; // Will cause transaction to abort
      }
    }
  }

  /**
   * Helper: Store data in IndexedDB
   */
  async storeInDB(db, storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Helper: Get data from IndexedDB
   */
  async getFromDB(db, storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Helper: Query data from IndexedDB by index
   */
  async queryDB(db, storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generate content hash for deduplication
   */
  async generateContentHash(data) {
    const bytes = typeof data === 'string' ? this.dataURLToBytes(data) : new Uint8Array(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Convert data URL to bytes
   */
  dataURLToBytes(dataURL) {
    const [header, data] = dataURL.split(',');
    const isBase64 = header.includes('base64');
    
    if (isBase64) {
      const binaryString = atob(data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } else {
      return utf8ToBytes(decodeURIComponent(data));
    }
  }

  /**
   * Detect MIME type from filename
   */
  detectMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'txt': 'text/plain',
      'json': 'application/json'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Broadcast memory events for UI updates
   */
  broadcastMemoryEvent(eventType, data) {
    try {
      chrome.runtime.sendMessage({
        action: eventType,
        ...data
      });
    } catch (e) {
      // Ignore if no listeners
    }
  }

  /**
   * Get vault statistics
   */
  async getVaultStats(vaultId = null) {
    await this.init();
    
    const status = await this.vaultManager.getStatus();
    if (!status.isUnlocked) {
      return { totalMemories: 0, totalAttachments: 0, storageUsed: 0, vaultLocked: true };
    }

    vaultId = vaultId || status.vaultId;
    const db = await this.getVaultDatabase(vaultId);
    
    // Count memories
    const memories = await this.getAllFromStore(db, 'memories');
    const attachments = await this.getAllFromStore(db, 'attachments');
    const blobs = await this.getAllFromStore(db, 'blobs');
    
    // Calculate storage usage
    const storageUsed = blobs.reduce((total, blob) => total + (blob.size || 0), 0);
    
    return {
      totalMemories: memories.length,
      totalAttachments: attachments.length,
      storageUsed,
      vaultLocked: false,
      vaultId
    };
  }

  /**
   * Helper: Get all records from a store
   */
  async getAllFromStore(db, storeName) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Calculate SHA-256 checksum for data integrity
   */
  async calculateChecksum(data) {
    const encoder = new TextEncoder();
    const bytes = typeof data === 'string' ? encoder.encode(data) : new Uint8Array(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Validate memory integrity using checksums
   */
  async validateMemoryIntegrity(memory, decryptedContent) {
    try {
      // Validate content checksum
      const currentContentChecksum = await this.calculateChecksum(decryptedContent);
      if (currentContentChecksum !== memory.integrity.content_checksum) {
        throw new DataIntegrityError(
          'CONTENT_CORRUPTED',
          `Memory content corrupted - checksum mismatch for ${memory.header.id}`,
          {
            expected: memory.integrity.content_checksum,
            actual: currentContentChecksum,
            memoryId: memory.header.id
          }
        );
      }

      // Validate header checksum
      const currentHeaderChecksum = await this.calculateChecksum(JSON.stringify(memory.header));
      if (currentHeaderChecksum !== memory.integrity.header_checksum) {
        throw new DataIntegrityError(
          'HEADER_CORRUPTED',
          `Memory header corrupted - checksum mismatch for ${memory.header.id}`,
          {
            expected: memory.integrity.header_checksum,
            actual: currentHeaderChecksum,
            memoryId: memory.header.id
          }
        );
      }

      console.log('🗄️ VaultStorage: Memory integrity validation passed for', memory.header.id);

    } catch (error) {
      if (error instanceof DataIntegrityError) {
        console.error('🗄️ VaultStorage: Data integrity validation failed:', error);
        // Log corruption event for monitoring
        this.logCorruptionEvent(error);
        throw error;
      } else {
        console.error('🗄️ VaultStorage: Integrity validation error:', error);
        throw new DataIntegrityError(
          'VALIDATION_ERROR',
          `Failed to validate memory integrity: ${error.message}`,
          { memoryId: memory.header.id, originalError: error.message }
        );
      }
    }
  }

  /**
   * Log corruption events for monitoring and alerting
   */
  logCorruptionEvent(error) {
    const corruptionEvent = {
      type: 'DATA_CORRUPTION',
      code: error.code,
      message: error.message,
      context: error.context,
      timestamp: new Date().toISOString(),
      severity: 'CRITICAL'
    };

    // Log to console for immediate visibility
    console.error('🚨 CRITICAL: Data corruption detected:', corruptionEvent);

    // Store corruption event for analysis
    try {
      chrome.storage.local.get(['emma_corruption_events']).then(result => {
        const events = result.emma_corruption_events || [];
        events.push(corruptionEvent);
        
        // Keep only last 100 corruption events
        if (events.length > 100) {
          events.splice(0, events.length - 100);
        }
        
        chrome.storage.local.set({ emma_corruption_events: events });
      });
    } catch (storageError) {
      console.error('Failed to store corruption event:', storageError);
    }

    // TODO: In production, send to monitoring service
    // this.sendToMonitoringService(corruptionEvent);
  }
}

/**
 * Data integrity error class
 */
class DataIntegrityError extends Error {
  constructor(code, message, context = {}) {
    super(message);
    this.code = code;
    this.type = 'DataIntegrityError';
    this.context = context;
  }
}

// Create singleton instance
export const vaultStorage = new VaultStorage();
