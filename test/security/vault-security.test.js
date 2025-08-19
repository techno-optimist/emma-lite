// test/security/vault-security.test.js - Security Test Suite for Vault System

import { vaultStorage } from '../../lib/vault-storage.js';
import { vaultBackup } from '../../lib/vault-backup.js';
import { getVaultManager } from '../../js/vault/vault-manager.js';
import { VaultService } from '../../js/vault/service.js';

/**
 * CRITICAL SECURITY TESTS
 * Tests for encryption, key management, session security, and backup integrity
 */
describe('Vault Security Tests', () => {
  let testVaultId;
  let testPassphrase;
  let vaultManager;

  beforeEach(async () => {
    // Setup test environment
    testPassphrase = 'test-secure-passphrase-123456';
    vaultManager = getVaultManager();
    
    // Initialize test vault
    await vaultManager.initializeVault(testPassphrase);
    const status = await vaultManager.getStatus();
    testVaultId = status.vaultId;
  });

  afterEach(async () => {
    // Cleanup test vault
    try {
      await cleanupTestVault(testVaultId);
    } catch (error) {
      console.warn('Test cleanup failed:', error);
    }
  });

  describe('Encryption Security', () => {
    test('should encrypt memory content with proper key derivation', async () => {
      const testContent = 'This is sensitive user data that must be encrypted';
      
      const memoryId = await vaultStorage.saveMemory({
        content: testContent,
        metadata: { source: 'security-test' }
      });

      expect(memoryId).toBeTruthy();
      expect(memoryId).toMatch(/^mem_/);

      // Verify content is actually encrypted in storage
      const db = await vaultStorage.getVaultDatabase(testVaultId);
      const encryptedMemory = await vaultStorage.getFromDB(db, 'memories', memoryId);
      
      // The stored content should not contain plaintext
      const storedContent = JSON.stringify(encryptedMemory);
      expect(storedContent).not.toContain(testContent);
      expect(storedContent).not.toContain('sensitive user data');
    });

    test('should prevent key extraction attacks', async () => {
      const keyring = VaultService.getKeyring();
      
      // Attempt to access master key directly
      expect(() => {
        return keyring.masterKey.exportKey;
      }).not.toThrow(); // Key should exist but not be exportable

      // Verify key cannot be serialized
      expect(() => {
        JSON.stringify(keyring.masterKey);
      }).toThrow();
    });

    test('should use different IVs for each encryption operation', async () => {
      const testContent = 'Same content for IV uniqueness test';
      
      // Create multiple memories with same content
      const memoryIds = [];
      for (let i = 0; i < 5; i++) {
        const memoryId = await vaultStorage.saveMemory({
          content: testContent,
          metadata: { source: 'iv-test', index: i }
        });
        memoryIds.push(memoryId);
      }

      // Get encrypted capsules and verify different IVs
      const db = await vaultStorage.getVaultDatabase(testVaultId);
      const ivs = new Set();
      
      for (const memoryId of memoryIds) {
        const capsules = await vaultStorage.queryDB(db, 'capsules', 'memory_id', memoryId);
        expect(capsules).toHaveLength(1);
        
        const iv = capsules[0].encrypted_content.iv;
        const ivString = JSON.stringify(iv);
        
        expect(ivs.has(ivString)).toBe(false);
        ivs.add(ivString);
      }
      
      expect(ivs.size).toBe(5);
    });

    test('should validate key availability before encryption', async () => {
      // Lock the vault
      await vaultManager.lock();
      
      // Attempt to save memory with locked vault
      await expect(
        vaultStorage.saveMemory({
          content: 'This should fail',
          metadata: { source: 'lock-test' }
        })
      ).rejects.toThrow('Vault must be unlocked');
    });

    test('should detect and prevent encryption with null keys', async () => {
      // Mock a scenario where keyring returns null
      const originalGetKeyring = VaultService.getKeyring;
      VaultService.getKeyring = jest.fn().mockReturnValue(null);

      await expect(
        vaultStorage.saveMemory({
          content: 'This should fail with null keyring',
          metadata: { source: 'null-key-test' }
        })
      ).rejects.toThrow('Vault must be unlocked');

      // Restore original function
      VaultService.getKeyring = originalGetKeyring;
    });
  });

  describe('Session Security', () => {
    test('should generate cryptographically secure session tokens', async () => {
      const sessions = [];
      
      // Generate multiple sessions
      for (let i = 0; i < 100; i++) {
        const session = await vaultManager.createSession();
        sessions.push(session);
      }

      // Verify no token collisions
      const tokens = sessions.map(s => s.token);
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(100);

      // Verify high entropy
      for (const session of sessions) {
        expect(session.entropy).toBeGreaterThan(7.0);
        expect(session.token).toHaveLength(44); // Base64 encoded 32 bytes
      }
    });

    test('should include device fingerprinting', async () => {
      const session = await vaultManager.createSession();
      
      expect(session.deviceFingerprint).toBeTruthy();
      expect(session.deviceFingerprint).toHaveLength(24); // Base64 encoded 16 bytes
      expect(session.version).toBe(2);
    });

    test('should validate session security correctly', async () => {
      const session = await vaultManager.createSession();
      const settings = await chrome.storage.local.get(['emma_vault_settings']);
      
      // Valid session should pass
      const isValid = await vaultManager.validateSessionSecurity(
        session, 
        settings.emma_vault_settings, 
        Date.now()
      );
      expect(isValid).toBe(true);

      // Expired session should fail
      const expiredSession = { ...session, expiresAt: Date.now() - 1000 };
      const isExpiredValid = await vaultManager.validateSessionSecurity(
        expiredSession,
        settings.emma_vault_settings,
        Date.now()
      );
      expect(isExpiredValid).toBe(false);

      // Low entropy session should fail
      const lowEntropySession = { ...session, entropy: 3.0 };
      const isLowEntropyValid = await vaultManager.validateSessionSecurity(
        lowEntropySession,
        settings.emma_vault_settings,
        Date.now()
      );
      expect(isLowEntropyValid).toBe(false);
    });
  });

  describe('Backup Security', () => {
    test('should encrypt backup files properly', async () => {
      // Create test data
      await vaultStorage.saveMemory({
        content: 'Secret test data for backup encryption',
        metadata: { source: 'backup-test' }
      });

      const backup = await vaultBackup.createBackup(testVaultId, {
        backupPassphrase: 'backup-test-passphrase-123'
      });

      // Verify backup is encrypted
      expect(backup.format).toBe('emma-secure-backup-v2');
      expect(backup.metadata.encrypted).toBe(true);
      expect(backup.metadata.secure).toBe(true);

      // Verify no plaintext data in backup
      const backupString = JSON.stringify(backup);
      expect(backupString).not.toContain('Secret test data');
      expect(backupString).not.toContain('backup-test');
      
      // Verify encrypted data is present
      expect(backup.encrypted_data).toBeInstanceOf(Array);
      expect(backup.encrypted_data.length).toBeGreaterThan(100);
    });

    test('should detect backup tampering', async () => {
      // Create legitimate backup
      await vaultStorage.saveMemory({
        content: 'Test data for tampering detection',
        metadata: { source: 'tamper-test' }
      });

      const backup = await vaultBackup.createBackup(testVaultId, {
        backupPassphrase: 'tamper-test-passphrase'
      });

      // Tamper with backup data
      backup.encrypted_data[0] ^= 0xFF;

      // Attempt to restore tampered backup
      await expect(
        vaultBackup.restoreVault(
          backup,
          'tamper-test-passphrase',
          'new-vault-passphrase'
        )
      ).rejects.toThrow('Backup integrity verification failed');
    });

    test('should require strong backup passphrases', async () => {
      await expect(
        vaultBackup.createBackup(testVaultId, {
          backupPassphrase: 'weak'
        })
      ).rejects.toThrow('Backup passphrase must be at least 12 characters');
    });
  });

  describe('Data Integrity Security', () => {
    test('should detect content corruption', async () => {
      const testContent = 'Original content for corruption test';
      const memoryId = await vaultStorage.saveMemory({
        content: testContent,
        metadata: { source: 'corruption-test' }
      });

      // Retrieve and verify original content
      const originalMemory = await vaultStorage.getMemory(memoryId);
      expect(originalMemory.core.content).toBe(testContent);

      // Directly corrupt the stored data
      const db = await vaultStorage.getVaultDatabase(testVaultId);
      await corruptMemoryContent(db, memoryId);

      // Attempt to retrieve corrupted memory
      await expect(
        vaultStorage.getMemory(memoryId)
      ).rejects.toThrow('Memory content corrupted');
    });

    test('should validate checksums on memory retrieval', async () => {
      const memoryId = await vaultStorage.saveMemory({
        content: 'Content with checksum validation',
        metadata: { source: 'checksum-test' }
      });

      // Get memory and verify it has integrity checksums
      const db = await vaultStorage.getVaultDatabase(testVaultId);
      const storedMemory = await vaultStorage.getFromDB(db, 'memories', memoryId);
      
      expect(storedMemory.integrity).toBeDefined();
      expect(storedMemory.integrity.content_checksum).toBeTruthy();
      expect(storedMemory.integrity.header_checksum).toBeTruthy();
      expect(storedMemory.integrity.created_at).toBeTruthy();
    });

    test('should log corruption events for monitoring', async () => {
      const memoryId = await vaultStorage.saveMemory({
        content: 'Content for corruption logging test',
        metadata: { source: 'logging-test' }
      });

      // Clear existing corruption events
      await chrome.storage.local.remove(['emma_corruption_events']);

      // Corrupt data and attempt retrieval
      const db = await vaultStorage.getVaultDatabase(testVaultId);
      await corruptMemoryContent(db, memoryId);

      try {
        await vaultStorage.getMemory(memoryId);
      } catch (error) {
        // Expected to fail
      }

      // Verify corruption event was logged
      const result = await chrome.storage.local.get(['emma_corruption_events']);
      const events = result.emma_corruption_events || [];
      
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('DATA_CORRUPTION');
      expect(events[0].code).toBe('CONTENT_CORRUPTED');
      expect(events[0].severity).toBe('CRITICAL');
    });
  });

  describe('Transaction Security', () => {
    test('should prevent partial data corruption on transaction failure', async () => {
      // Mock a scenario where capsule store fails
      const db = await vaultStorage.getVaultDatabase(testVaultId);
      const originalPut = db.transaction(['memories', 'capsules'], 'readwrite')
        .objectStore('capsules').put;
      
      // Override put method to fail for capsules
      jest.spyOn(db.transaction(['memories', 'capsules'], 'readwrite')
        .objectStore('capsules'), 'put')
        .mockImplementation(() => {
          throw new Error('Simulated capsule store failure');
        });

      // Attempt to save memory
      await expect(
        vaultStorage.saveMemory({
          content: 'This should fail atomically',
          metadata: { source: 'transaction-test' }
        })
      ).rejects.toThrow();

      // Verify no partial data was saved
      const memories = await vaultStorage.listMemories(10);
      const testMemories = memories.items.filter(m => 
        m.metadata && m.metadata.source === 'transaction-test'
      );
      expect(testMemories).toHaveLength(0);
    });
  });
});

/**
 * Test Helper Functions
 */

async function cleanupTestVault(vaultId) {
  if (vaultId) {
    try {
      await indexedDB.deleteDatabase(`EmmaVault_${vaultId}`);
    } catch (error) {
      console.warn('Failed to cleanup test vault:', error);
    }
  }
}

async function corruptMemoryContent(db, memoryId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['memories'], 'readwrite');
    const store = transaction.objectStore('memories');
    
    const getRequest = store.get(memoryId);
    getRequest.onsuccess = () => {
      const memory = getRequest.result;
      
      // Corrupt the content checksum
      if (memory.integrity) {
        memory.integrity.content_checksum = 'corrupted_checksum_12345';
      }
      
      const putRequest = store.put(memory);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Security Test Utilities
 */
export const SecurityTestUtils = {
  /**
   * Calculate Shannon entropy for randomness testing
   */
  calculateShannonEntropy(data) {
    const frequency = new Map();
    for (const char of data) {
      frequency.set(char, (frequency.get(char) || 0) + 1);
    }
    
    let entropy = 0;
    const length = data.length;
    for (const count of frequency.values()) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }
    
    return entropy;
  },

  /**
   * Generate test data with known properties
   */
  generateTestData(size = 1000, pattern = 'random') {
    const data = new Array(size);
    
    switch (pattern) {
      case 'random':
        for (let i = 0; i < size; i++) {
          data[i] = String.fromCharCode(Math.floor(Math.random() * 256));
        }
        break;
      case 'predictable':
        for (let i = 0; i < size; i++) {
          data[i] = String.fromCharCode(i % 256);
        }
        break;
      case 'constant':
        data.fill('A');
        break;
    }
    
    return data.join('');
  },

  /**
   * Simulate timing attack scenarios
   */
  async performTimingAnalysis(operation, iterations = 100) {
    const timings = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await operation();
      const end = performance.now();
      timings.push(end - start);
    }
    
    const average = timings.reduce((a, b) => a + b) / timings.length;
    const variance = timings.reduce((acc, time) => {
      return acc + Math.pow(time - average, 2);
    }, 0) / timings.length;
    
    return { timings, average, variance, standardDeviation: Math.sqrt(variance) };
  }
};

