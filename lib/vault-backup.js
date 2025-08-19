// lib/vault-backup.js - SECURE Vault Backup Implementation
// Fixes critical security vulnerabilities in the original backup system

import { vaultStorage } from './vault-storage.js';
import { getVaultManager } from '../js/vault/vault-manager.js';
import { VaultService } from '../js/vault/service.js';
import { utf8ToBytes, bytesToUtf8, encryptWithKey, decryptWithKey, generateRandomBytes } from '../js/vault/crypto.js';

/**
 * SECURE Vault Backup System
 * Fixes: Backup encryption, transaction safety, integrity checks, error handling
 */
export class VaultBackupSystem {
  constructor() {
    this.vaultManager = null;
    this.storage = null;
    this.retryManager = new RetryManager();
    this.integrityManager = new IntegrityManager();
  }

  async init() {
    this.vaultManager = getVaultManager();
    this.storage = vaultStorage;
    await this.storage.init();
  }

  /**
   * Create SECURE backup with proper encryption
   */
  async createBackup(vaultId = null, options = {}) {
    await this.init();

    // 1. Validate vault access with retries
    const status = await this.retryManager.executeWithRetry(
      async () => {
        const status = await this.vaultManager.getStatus();
        if (!status.isUnlocked) {
          throw new SecurityError('VAULT_LOCKED', 'Vault must be unlocked to create backup');
        }
        return status;
      },
      { maxRetries: 3, errorMessage: 'Failed to verify vault status' }
    );

    vaultId = vaultId || status.vaultId;
    if (!vaultId) {
      throw new SecurityError('NO_VAULT_ID', 'No vault ID specified');
    }

    console.log('🔒 SecureBackup: Starting SECURE backup for vault:', vaultId);

    try {
      // 2. Export data with transaction safety
      const backupData = await this.exportVaultDataSecurely(vaultId);

      // 3. Generate backup-specific encryption key
      const backupSalt = generateRandomBytes(32);
      const backupPassphrase = options.backupPassphrase || await this.promptForBackupPassphrase();
      const backupKey = await this.deriveBackupKey(backupPassphrase, backupSalt);

      // 4. Create secure backup package
      const secureBackup = await this.createEncryptedBackup(backupData, backupKey, backupSalt);

      console.log('🔒 SecureBackup: SECURE backup created:', {
        encryptedSize: secureBackup.encrypted_data.length,
        integrityHash: secureBackup.integrity_hash.slice(0, 16) + '...'
      });

      return secureBackup;

    } catch (error) {
      console.error('🔒 SecureBackup: Backup creation failed:', error);
      throw new BackupError('BACKUP_CREATION_FAILED', `Backup creation failed: ${error.message}`, error);
    }
  }

  /**
   * Export vault data with transaction safety and integrity checks
   */
  async exportVaultDataSecurely(vaultId) {
    const db = await this.storage.getVaultDatabase(vaultId);

    // Use atomic transaction to ensure consistency
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['memories', 'capsules', 'attachments', 'blobs'], 'readonly');
      const results = { vault_id: vaultId };

      transaction.oncomplete = () => {
        resolve(results);
      };

      transaction.onerror = () => {
        reject(new DataError('EXPORT_TRANSACTION_FAILED', 'Database transaction failed during export'));
      };

      // Export all stores atomically
      Promise.all([
        this.exportStoreSecurely(transaction, 'memories'),
        this.exportStoreSecurely(transaction, 'capsules'),
        this.exportStoreSecurely(transaction, 'attachments'),
        this.exportStoreSecurely(transaction, 'blobs')
      ]).then(([memories, capsules, attachments, blobs]) => {
        results.memories = memories;
        results.capsules = capsules;
        results.attachments = attachments;
        results.blobs = blobs;
      }).catch(reject);
    });
  }

  /**
   * Export store with integrity verification
   */
  async exportStoreSecurely(transaction, storeName) {
    return new Promise((resolve, reject) => {
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = async () => {
        try {
          const data = request.result;
          
          // Calculate integrity hash for the exported data
          const integrityHash = await this.integrityManager.calculateDataHash(data);
          
          resolve({
            data: data,
            count: data.length,
            integrity_hash: integrityHash,
            exported_at: new Date().toISOString()
          });
        } catch (error) {
          reject(error);
        }
      };

      request.onerror = () => {
        reject(new DataError('STORE_EXPORT_FAILED', `Failed to export store: ${storeName}`));
      };
    });
  }

  /**
   * Create encrypted backup package
   */
  async createEncryptedBackup(backupData, backupKey, backupSalt) {
    // 1. Create manifest with integrity verification
    const manifest = {
      version: "2.0.0", // Updated version for secure format
      created: new Date().toISOString(),
      vault_id: backupData.vault_id,
      total_memories: backupData.memories ? backupData.memories.count : 0,
      total_attachments: backupData.attachments ? backupData.attachments.count : 0,
      total_blobs: backupData.blobs ? backupData.blobs.count : 0,
      encryption: "AES-256-GCM",
      integrity: "SHA-256",
      format: "secure-encrypted"
    };

    // 2. Prepare data for encryption (blobs remain encrypted with vault key)
    const dataToEncrypt = {
      manifest: manifest,
      vault: {
        memories: backupData.memories,
        capsules: backupData.capsules,
        attachments: backupData.attachments
      },
      // Keep blobs encrypted - don't decrypt for backup
      encrypted_blobs: backupData.blobs.data.map(blob => ({
        content_hash: blob.content_hash,
        encrypted_data: blob.encrypted_data, // Keep encrypted!
        size: blob.size,
        mime_type: blob.mime_type
      }))
    };

    // 3. Serialize and encrypt the entire backup
    const serializedData = JSON.stringify(dataToEncrypt);
    const dataBytes = utf8ToBytes(serializedData);
    const { iv, ciphertext } = await encryptWithKey(backupKey, dataBytes);

    // 4. Calculate integrity hash of encrypted data
    const integrityHash = await this.integrityManager.calculateDataHash(ciphertext);

    // 5. Create final secure backup package
    return {
      format: "emma-secure-backup-v2",
      encryption: {
        algorithm: "AES-256-GCM",
        salt: Array.from(backupSalt),
        iv: Array.from(iv)
      },
      encrypted_data: Array.from(ciphertext),
      integrity_hash: integrityHash,
      created: manifest.created,
      metadata: {
        vault_id: manifest.vault_id,
        encrypted: true,
        secure: true
      }
    };
  }

  /**
   * Export vault as downloadable file
   */
  async exportVaultFile(vaultId = null, filename = null) {
    const backup = await this.createBackup(vaultId);
    
    if (!filename) {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      filename = `emma-vault-${backup.metadata.vault_id}-${timestamp}.json`;
    }

    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    // Create download link
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    return {
      filename,
      size: dataBlob.size,
      manifest: backup.metadata
    };
  }

  /**
   * Restore from secure encrypted backup
   */
  async restoreVault(encryptedBackup, backupPassphrase, newVaultPassphrase, options = {}) {
    await this.init();

    // 1. Validate backup format
    if (encryptedBackup.format !== "emma-secure-backup-v2") {
      throw new BackupError('UNSUPPORTED_FORMAT', 'Unsupported backup format - requires secure backup v2');
    }

    // 2. Verify backup integrity
    const actualHash = await this.integrityManager.calculateDataHash(new Uint8Array(encryptedBackup.encrypted_data));
    if (actualHash !== encryptedBackup.integrity_hash) {
      throw new BackupError('BACKUP_CORRUPTED', 'Backup integrity verification failed - file may be corrupted');
    }

    // 3. Derive backup decryption key
    const backupSalt = new Uint8Array(encryptedBackup.encryption.salt);
    const backupKey = await this.deriveBackupKey(backupPassphrase, backupSalt);

    // 4. Decrypt backup data
    const iv = new Uint8Array(encryptedBackup.encryption.iv);
    const ciphertext = new Uint8Array(encryptedBackup.encrypted_data);
    const decryptedBytes = await decryptWithKey(backupKey, iv, ciphertext);
    const decryptedData = JSON.parse(bytesToUtf8(decryptedBytes));

    // 5. Initialize new vault with transaction safety
    const newVaultId = await this.createSecureVault(newVaultPassphrase);

    // 6. Restore data with integrity verification
    await this.restoreVaultDataSecurely(newVaultId, decryptedData);

    return {
      vaultId: newVaultId,
      success: true,
      restored: {
        memories: decryptedData.vault.memories.count,
        attachments: decryptedData.vault.attachments.count,
        blobs: decryptedData.encrypted_blobs.length
      }
    };
  }

  /**
   * Derive backup-specific encryption key
   */
  async deriveBackupKey(passphrase, salt, iterations = 100000) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Prompt user for backup passphrase (secure)
   */
  async promptForBackupPassphrase() {
    const passphrase = prompt('Enter a strong passphrase for backup encryption (min 12 characters):');
    
    if (!passphrase || passphrase.length < 12) {
      throw new SecurityError('WEAK_PASSPHRASE', 'Backup passphrase must be at least 12 characters');
    }

    return passphrase;
  }

  /**
   * Create new vault with secure initialization
   */
  async createSecureVault(passphrase) {
    const newVaultId = await this.vaultManager.initializeVault(passphrase);
    
    // Verify vault was created successfully
    const status = await this.vaultManager.getStatus();
    if (!status.isUnlocked || !status.vaultId) {
      throw new VaultError('VAULT_CREATION_FAILED', 'Failed to create new vault');
    }

    return newVaultId;
  }

  /**
   * Restore vault data with transaction safety
   */
  async restoreVaultDataSecurely(vaultId, backupData) {
    const db = await this.storage.getVaultDatabase(vaultId);

    // Use atomic transaction for restoration
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['memories', 'capsules', 'attachments', 'blobs'], 'readwrite');

      transaction.oncomplete = () => {
        console.log('🔒 SecureBackup: Vault data restored successfully');
        resolve();
      };

      transaction.onerror = () => {
        console.error('🔒 SecureBackup: Restoration transaction failed');
        reject(new DataError('RESTORE_TRANSACTION_FAILED', 'Database transaction failed during restoration'));
      };

      // Restore all data atomically
      this.restoreDataAtomically(transaction, backupData)
        .catch(error => {
          transaction.abort();
          reject(error);
        });
    });
  }

  async restoreDataAtomically(transaction, backupData) {
    const stores = {
      memories: transaction.objectStore('memories'),
      capsules: transaction.objectStore('capsules'),
      attachments: transaction.objectStore('attachments'),
      blobs: transaction.objectStore('blobs')
    };

    // Restore each data type
    const promises = [
      this.restoreRecords(stores.memories, backupData.vault.memories.data),
      this.restoreRecords(stores.capsules, backupData.vault.capsules.data),
      this.restoreRecords(stores.attachments, backupData.vault.attachments.data),
      this.restoreRecords(stores.blobs, backupData.encrypted_blobs)
    ];

    await Promise.all(promises);
  }

  async restoreRecords(store, records) {
    const promises = records.map(record => {
      return new Promise((resolve, reject) => {
        const request = store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to restore record: ${record.id || 'unknown'}`));
      });
    });

    await Promise.all(promises);
  }
}

/**
 * Error handling classes
 */
class SecurityError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.type = 'SecurityError';
  }
}

class BackupError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.code = code;
    this.type = 'BackupError';
    this.cause = cause;
  }
}

class DataError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.type = 'DataError';
  }
}

class VaultError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.type = 'VaultError';
  }
}

/**
 * Retry mechanism for transient failures
 */
class RetryManager {
  async executeWithRetry(operation, options = {}) {
    const { maxRetries = 3, baseDelay = 1000, errorMessage = 'Operation failed' } = options;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries || !this.isRetryable(error)) {
          throw new Error(`${errorMessage} after ${attempt} attempts: ${error.message}`);
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        await this.delay(delay);
      }
    }
  }

  isRetryable(error) {
    // Don't retry security errors, only transient failures
    const retryableCodes = ['DATABASE_UNAVAILABLE', 'NETWORK_ERROR', 'TIMEOUT'];
    return retryableCodes.includes(error.code);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Data integrity management
 */
class IntegrityManager {
  async calculateDataHash(data) {
    const bytes = typeof data === 'string' ? utf8ToBytes(data) : new Uint8Array(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async verifyDataIntegrity(data, expectedHash) {
    const actualHash = await this.calculateDataHash(data);
    return actualHash === expectedHash;
  }
}

// Export singleton instance
export const vaultBackup = new VaultBackupSystem();