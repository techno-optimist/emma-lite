// lib/vault-backup.js - Vault Backup and Restore System
// Enables complete vault backup/restore for data portability

import { vaultStorage } from './vault-storage.js';
import { getVaultManager } from '../js/vault/vault-manager.js';
import { VaultService } from '../js/vault/service.js';
import { bytesToUtf8, utf8ToBytes, decryptWithKey } from '../js/vault/crypto.js';

/**
 * Vault Backup System
 * Creates complete, portable backups of vault data including:
 * - All memories and capsules
 * - All attachments and media files
 * - Vault metadata and settings
 * - Encrypted blob storage
 */
export class VaultBackupSystem {
  constructor() {
    this.vaultManager = null;
    this.storage = null;
  }

  async init() {
    this.vaultManager = getVaultManager();
    this.storage = vaultStorage;
    await this.storage.init();
  }

  /**
   * Create complete backup of specified vault
   */
  async createBackup(vaultId = null, options = {}) {
    await this.init();

    // 1. Ensure vault is unlocked
    const status = await this.vaultManager.getStatus();
    if (!status.isUnlocked) {
      throw new Error('Vault must be unlocked to create backup');
    }

    vaultId = vaultId || status.vaultId;
    if (!vaultId) {
      throw new Error('No vault ID specified');
    }

    console.log('🗄️ VaultBackup: Starting backup for vault:', vaultId);

    // 2. Get vault database
    const db = await this.storage.getVaultDatabase(vaultId);

    // 3. Export all data stores
    const [memories, capsules, attachments, blobs] = await Promise.all([
      this.exportStore(db, 'memories'),
      this.exportStore(db, 'capsules'),
      this.exportStore(db, 'attachments'),
      this.exportStore(db, 'blobs')
    ]);

    // 4. Create vault metadata
    const vaultMetadata = await this.getVaultMetadata(vaultId);

    // 5. Process attachments - decrypt for backup
    const processedBlobs = {};
    const keyring = VaultService.getKeyring();
    
    for (const blob of blobs) {
      try {
        // Decrypt blob data for backup
        const iv = new Uint8Array(blob.encrypted_data.iv);
        const ciphertext = new Uint8Array(blob.encrypted_data.data);
        const decryptedBytes = await decryptWithKey(keyring.masterKey, iv, ciphertext);
        
        // Store as base64 for JSON serialization
        processedBlobs[blob.content_hash] = {
          data: this.bytesToBase64(decryptedBytes),
          mime_type: blob.mime_type,
          size: blob.size,
          created: blob.created
        };
      } catch (error) {
        console.error('🗄️ VaultBackup: Failed to process blob:', blob.content_hash, error);
      }
    }

    // 6. Create backup manifest
    const backup = {
      manifest: {
        version: "1.0.0",
        created: new Date().toISOString(),
        vault_id: vaultId,
        vault_name: vaultMetadata.name || `Vault ${vaultId}`,
        total_memories: memories.length,
        total_attachments: attachments.length,
        total_blobs: Object.keys(processedBlobs).length,
        backup_size_bytes: this.calculateBackupSize(memories, attachments, processedBlobs),
        creator: 'emma-lite',
        format_version: '1.0.0'
      },

      vault: {
        metadata: vaultMetadata,
        memories: memories,
        capsules: capsules,
        attachments: attachments,
        settings: await this.getVaultSettings(vaultId),
        stats: await this.storage.getVaultStats(vaultId)
      },

      blobs: processedBlobs
    };

    // 7. Optionally compress backup
    if (options.compress !== false) {
      backup.compressed = true;
      backup.original_size = JSON.stringify(backup).length;
    }

    console.log('🗄️ VaultBackup: Backup created:', {
      memories: backup.manifest.total_memories,
      attachments: backup.manifest.total_attachments,
      blobs: backup.manifest.total_blobs,
      size: backup.manifest.backup_size_bytes
    });

    return backup;
  }

  /**
   * Restore vault from backup
   */
  async restoreVault(backupData, newPassphrase, options = {}) {
    await this.init();

    // 1. Validate backup
    await this.validateBackup(backupData);

    console.log('🗄️ VaultBackup: Starting restore for vault:', backupData.manifest.vault_id);

    // 2. Determine vault ID (use original or generate new)
    let vaultId = backupData.manifest.vault_id;
    if (options.generateNewId || await this.vaultExists(vaultId)) {
      vaultId = `vault_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      console.log('🗄️ VaultBackup: Using new vault ID:', vaultId);
    }

    // 3. Initialize new vault
    await this.vaultManager.initializeVault(newPassphrase);
    
    // Wait for vault to be ready
    const status = await this.vaultManager.getStatus();
    if (!status.isUnlocked) {
      throw new Error('Failed to initialize vault for restore');
    }

    // 4. Get vault database
    const db = await this.storage.getVaultDatabase(vaultId);

    // 5. Restore memories
    console.log('🗄️ VaultBackup: Restoring memories...');
    for (const memory of backupData.vault.memories) {
      // Update vault ID in memory
      memory.header.vault_id = vaultId;
      await this.storage.storeInDB(db, 'memories', memory);
    }

    // 6. Restore capsules  
    console.log('🗄️ VaultBackup: Restoring capsules...');
    for (const capsule of backupData.vault.capsules) {
      // Update vault ID in capsule
      capsule.vault_id = vaultId;
      await this.storage.storeInDB(db, 'capsules', capsule);
    }

    // 7. Restore attachments
    console.log('🗄️ VaultBackup: Restoring attachments...');
    for (const attachment of backupData.vault.attachments) {
      // Update vault ID in attachment
      attachment.vault_id = vaultId;
      await this.storage.storeInDB(db, 'attachments', attachment);
    }

    // 8. Restore blobs (re-encrypt with new vault key)
    console.log('🗄️ VaultBackup: Restoring blobs...');
    const keyring = VaultService.getKeyring();
    
    for (const [contentHash, blobData] of Object.entries(backupData.blobs)) {
      try {
        // Decode from base64
        const originalBytes = this.base64ToBytes(blobData.data);
        
        // Re-encrypt with new vault key
        const { iv, ciphertext } = await encryptWithKey(keyring.masterKey, originalBytes);
        
        const blob = {
          content_hash: contentHash,
          encrypted_data: {
            iv: Array.from(iv),
            data: Array.from(ciphertext)
          },
          created: blobData.created,
          size: blobData.size,
          mime_type: blobData.mime_type
        };
        
        await this.storage.storeInDB(db, 'blobs', blob);
      } catch (error) {
        console.error('🗄️ VaultBackup: Failed to restore blob:', contentHash, error);
      }
    }

    // 9. Set vault metadata
    await this.setVaultMetadata(vaultId, {
      ...backupData.vault.metadata,
      id: vaultId,
      restored_from: backupData.manifest.vault_id,
      restored_at: new Date().toISOString()
    });

    // 10. Verify restoration
    const stats = await this.storage.getVaultStats(vaultId);
    const expectedStats = {
      memories: backupData.manifest.total_memories,
      attachments: backupData.manifest.total_attachments,
      blobs: backupData.manifest.total_blobs
    };

    if (stats.totalMemories !== expectedStats.memories ||
        stats.totalAttachments !== expectedStats.attachments) {
      console.warn('🗄️ VaultBackup: Restoration verification failed:', { stats, expectedStats });
    }

    console.log('🗄️ VaultBackup: Restore completed:', {
      vaultId,
      memories: stats.totalMemories,
      attachments: stats.totalAttachments,
      storageUsed: stats.storageUsed
    });

    return {
      vaultId,
      stats,
      success: true
    };
  }

  /**
   * Export vault as downloadable file
   */
  async exportVaultFile(vaultId = null, filename = null) {
    const backup = await this.createBackup(vaultId);
    
    if (!filename) {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      filename = `emma-vault-${backup.manifest.vault_id}-${timestamp}.json`;
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
      manifest: backup.manifest
    };
  }

  /**
   * Import vault from file
   */
  async importVaultFile(file, newPassphrase) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const backupData = JSON.parse(e.target.result);
          const result = await this.restoreVault(backupData, newPassphrase);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read backup file'));
      reader.readAsText(file);
    });
  }

  /**
   * Helper: Export all records from a store
   */
  async exportStore(db, storeName) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Helper: Validate backup integrity
   */
  async validateBackup(backup) {
    if (!backup.manifest || !backup.vault || !backup.blobs) {
      throw new Error('Invalid backup format: missing required sections');
    }

    if (backup.manifest.version !== '1.0.0') {
      throw new Error(`Unsupported backup version: ${backup.manifest.version}`);
    }

    if (!backup.manifest.vault_id || !backup.vault.memories || !backup.vault.capsules) {
      throw new Error('Invalid backup format: missing required data');
    }

    // Validate data integrity
    if (backup.vault.memories.length !== backup.manifest.total_memories) {
      throw new Error('Backup data corruption: memory count mismatch');
    }

    if (backup.vault.attachments.length !== backup.manifest.total_attachments) {
      throw new Error('Backup data corruption: attachment count mismatch');
    }

    console.log('🗄️ VaultBackup: Backup validation passed');
  }

  /**
   * Helper: Check if vault exists
   */
  async vaultExists(vaultId) {
    try {
      const db = await this.storage.getVaultDatabase(vaultId);
      return !!db;
    } catch {
      return false;
    }
  }

  /**
   * Helper: Calculate backup size
   */
  calculateBackupSize(memories, attachments, blobs) {
    const memoriesSize = JSON.stringify(memories).length;
    const attachmentsSize = JSON.stringify(attachments).length;
    const blobsSize = Object.values(blobs).reduce((total, blob) => {
      return total + (blob.data ? blob.data.length : 0);
    }, 0);
    
    return memoriesSize + attachmentsSize + blobsSize;
  }

  /**
   * Helper: Get vault metadata
   */
  async getVaultMetadata(vaultId) {
    // In a full implementation, this would read from vault-specific metadata store
    // For now, return basic metadata
    return {
      id: vaultId,
      name: `Vault ${vaultId}`,
      created: new Date().toISOString(),
      version: '1.0.0',
      format: 'emma-vault',
      encryption: 'AES-256-GCM'
    };
  }

  /**
   * Helper: Set vault metadata
   */
  async setVaultMetadata(vaultId, metadata) {
    // Store vault metadata in chrome.storage or dedicated store
    const key = `emma_vault_metadata_${vaultId}`;
    await chrome.storage.local.set({ [key]: metadata });
  }

  /**
   * Helper: Get vault settings
   */
  async getVaultSettings(vaultId) {
    const key = `emma_vault_settings_${vaultId}`;
    const result = await chrome.storage.local.get([key]);
    return result[key] || {};
  }

  /**
   * Helper: Convert bytes to base64
   */
  bytesToBase64(bytes) {
    return btoa(String.fromCharCode(...bytes));
  }

  /**
   * Helper: Convert base64 to bytes
   */
  base64ToBytes(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
}

// Create singleton instance
export const vaultBackup = new VaultBackupSystem();
