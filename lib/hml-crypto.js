/**
 * HML v1.0 Cryptographic Envelope Implementation
 * Implements XChaCha20-Poly1305 encryption per HML specification §5
 * 
 * This replaces Emma's AES-GCM implementation with HML-compliant encryption
 */

import { HMLCanonicalizer } from './hml-canonicalizer.js';

export class HMLCryptography {
  
  /**
   * Encrypt content using HML-compliant XChaCha20-Poly1305
   * @param {string} content - Content to encrypt
   * @param {string} capsuleId - Capsule ID for AAD
   * @param {string} version - Version for AAD
   * @param {object} labels - Labels for AAD
   * @returns {Promise<object>} - Encryption envelope
   */
  static async encryptContent(content, capsuleId, version, labels) {
    try {
      // Import XChaCha20-Poly1305 implementation
      const { XChaCha20Poly1305 } = await import('@stablelib/xchacha20poly1305');
      
      // Generate 256-bit key (for now, use a derived key)
      const key = await this.deriveContentKey(capsuleId);
      
      // Generate 192-bit nonce for XChaCha20
      const nonce = crypto.getRandomValues(new Uint8Array(24));
      
      // Construct AAD per HML specification
      const aad = await this.constructAAD(capsuleId, version, labels);
      
      // Encrypt using XChaCha20-Poly1305
      const cipher = new XChaCha20Poly1305(key);
      const contentBytes = new TextEncoder().encode(content);
      const ciphertext = cipher.seal(nonce, contentBytes, aad);
      
      // Calculate AAD hash for verification
      const aadHash = await this.hash(aad);
      
      return {
        algorithm: "XChaCha20-Poly1305",
        nonce: this.base64url(nonce),
        ciphertext: this.base64url(ciphertext),
        aad_hash: aadHash
      };
      
    } catch (error) {
      console.error('HML encryption failed:', error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }
  
  /**
   * Decrypt content using HML-compliant XChaCha20-Poly1305
   * @param {object} envelope - Encryption envelope
   * @param {string} capsuleId - Capsule ID for AAD reconstruction
   * @param {string} version - Version for AAD reconstruction
   * @param {object} labels - Labels for AAD reconstruction
   * @returns {Promise<string>} - Decrypted content
   */
  static async decryptContent(envelope, capsuleId, version, labels) {
    try {
      // Import XChaCha20-Poly1305 implementation
      const { XChaCha20Poly1305 } = await import('@stablelib/xchacha20poly1305');
      
      // Validate algorithm
      if (envelope.algorithm !== "XChaCha20-Poly1305") {
        throw new Error(`Unsupported algorithm: ${envelope.algorithm}`);
      }
      
      // Derive the same key used for encryption
      const key = await this.deriveContentKey(capsuleId);
      
      // Decode nonce and ciphertext
      const nonce = this.base64urlDecode(envelope.nonce);
      const ciphertext = this.base64urlDecode(envelope.ciphertext);
      
      // Reconstruct AAD
      const aad = await this.constructAAD(capsuleId, version, labels);
      
      // Verify AAD hash if provided
      if (envelope.aad_hash) {
        const expectedAadHash = await this.hash(aad);
        if (expectedAadHash !== envelope.aad_hash) {
          throw new Error('AAD verification failed');
        }
      }
      
      // Decrypt using XChaCha20-Poly1305
      const cipher = new XChaCha20Poly1305(key);
      const decryptedBytes = cipher.open(nonce, ciphertext, aad);
      
      if (!decryptedBytes) {
        throw new Error('Decryption failed - invalid ciphertext or key');
      }
      
      return new TextDecoder().decode(decryptedBytes);
      
    } catch (error) {
      console.error('HML decryption failed:', error);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }
  
  /**
   * Construct Additional Authenticated Data per HML specification §5.2
   * @param {string} capsuleId - Capsule ID
   * @param {string} version - Version string
   * @param {object} labels - Labels object
   * @returns {Promise<Uint8Array>} - AAD bytes
   */
  static async constructAAD(capsuleId, version, labels) {
    try {
      const parts = [];
      
      // len(capsule_id) || capsule_id
      const capsuleIdBytes = new TextEncoder().encode(capsuleId);
      parts.push(this.lengthPrefix(capsuleIdBytes));
      parts.push(capsuleIdBytes);
      
      // len(version) || version
      const versionBytes = new TextEncoder().encode(version);
      parts.push(this.lengthPrefix(versionBytes));
      parts.push(versionBytes);
      
      // len(labels_hash) || labels_hash
      const labelsCanonical = HMLCanonicalizer.canonicalize(labels);
      const labelsHash = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(labelsCanonical)
      );
      const labelsHashBytes = new Uint8Array(labelsHash);
      parts.push(this.lengthPrefix(labelsHashBytes));
      parts.push(labelsHashBytes);
      
      return this.concatBytes(parts);
      
    } catch (error) {
      console.error('AAD construction failed:', error);
      throw new Error(`AAD construction failed: ${error.message}`);
    }
  }
  
  /**
   * Derive content encryption key
   * @param {string} capsuleId - Capsule ID for key derivation
   * @returns {Promise<Uint8Array>} - 256-bit key
   */
  static async deriveContentKey(capsuleId) {
    try {
      // Get master key from vault or generate temporary one
      const masterBytes = await this.getMasterKey();
      
      // Import for HKDF deriveBits
      const baseKey = await crypto.subtle.importKey('raw', masterBytes, 'HKDF', false, ['deriveBits']);
      const info = new TextEncoder().encode(`hml-content-${capsuleId}`);
      const salt = new TextEncoder().encode('hml-v1.0-content-key');
      
      // Derive 256-bit key for XChaCha20
      const bits = await crypto.subtle.deriveBits(
        {
          name: 'HKDF',
          hash: 'SHA-256',
          salt,
          info
        },
        baseKey,
        256 // 256 bits
      );
      
      return new Uint8Array(bits);
      
    } catch (error) {
      console.error('Key derivation failed:', error);
      throw new Error(`Key derivation failed: ${error.message}`);
    }
  }
  
  /**
   * Get or generate master key
   * @returns {Promise<Uint8Array>} - Master key bytes
   */
  static async getMasterKey() {
    try {
      // In-memory cache for non-extension environments
      if (globalThis.__HML_MASTER_KEY instanceof Uint8Array && globalThis.__HML_MASTER_KEY.length === 32) {
        return globalThis.__HML_MASTER_KEY;
      }

      if (typeof window !== 'undefined' && window.vaultManager) {
        const keyring = await window.vaultManager.getKeyring();
        if (keyring?.masterKey instanceof CryptoKey) {
          const raw = await crypto.subtle.exportKey('raw', keyring.masterKey);
          globalThis.__HML_MASTER_KEY = new Uint8Array(raw);
          return globalThis.__HML_MASTER_KEY;
        }
        if (keyring?.masterKey) {
          const mk = new Uint8Array(keyring.masterKey);
          globalThis.__HML_MASTER_KEY = mk;
          return mk;
        }
      }
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const result = await chrome.storage.local.get(['hml_master_key']);
        if (result.hml_master_key) {
          const mk = new Uint8Array(result.hml_master_key);
          globalThis.__HML_MASTER_KEY = mk;
          return mk;
        }
      }
    } catch {}
    const mk = crypto.getRandomValues(new Uint8Array(32));
    globalThis.__HML_MASTER_KEY = mk;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ hml_master_key: Array.from(mk) });
      }
    } catch {}
    return mk;
  }
  
  /**
   * Create 4-byte little-endian length prefix
   * @param {Uint8Array} bytes - Bytes to prefix
   * @returns {Uint8Array} - Length prefix
   */
  static lengthPrefix(bytes) {
    const length = new Uint32Array([bytes.length]);
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setUint32(0, length[0], true); // little-endian
    return new Uint8Array(buffer);
  }
  
  /**
   * Concatenate byte arrays
   * @param {Array<Uint8Array>} arrays - Arrays to concatenate
   * @returns {Uint8Array} - Concatenated bytes
   */
  static concatBytes(arrays) {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    
    return result;
  }
  
  /**
   * Calculate SHA-256 hash
   * @param {Uint8Array} data - Data to hash
   * @returns {Promise<string>} - Hash in "sha256:hex" format
   */
  static async hash(data) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `sha256:${hashHex}`;
  }
  
  /**
   * Base64url encode (RFC 4648 §5)
   * @param {Uint8Array} bytes - Bytes to encode
   * @returns {string} - Base64url string
   */
  static base64url(bytes) {
    const base64 = Buffer.from(bytes).toString('base64');
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  
  /**
   * Base64url decode
   * @param {string} str - Base64url string
   * @returns {Uint8Array} - Decoded bytes
   */
  static base64urlDecode(str) {
    // Add padding if needed
    const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    const binaryString = Buffer.from(base64, 'base64').toString('binary');
    return new Uint8Array(binaryString.length).map((_, i) => 
      binaryString.charCodeAt(i)
    );
  }
  
  /**
   * Generate cryptographically secure random nonce
   * @param {number} length - Nonce length in bytes
   * @returns {Uint8Array} - Random nonce
   */
  static generateNonce(length = 24) {
    return crypto.getRandomValues(new Uint8Array(length));
  }
  
  /**
   * Validate encryption envelope format
   * @param {object} envelope - Encryption envelope to validate
   * @returns {boolean} - True if valid
   */
  static validateEnvelope(envelope) {
    const required = ['algorithm', 'nonce', 'ciphertext'];
    
    for (const field of required) {
      if (!envelope[field]) {
        return false;
      }
    }
    
    if (envelope.algorithm !== 'XChaCha20-Poly1305') {
      return false;
    }
    
    // Validate base64url format
    const base64urlPattern = /^[A-Za-z0-9_-]+$/;
    if (!base64urlPattern.test(envelope.nonce) || 
        !base64urlPattern.test(envelope.ciphertext)) {
      return false;
    }
    
    return true;
  }
}

/**
 * HML Key Management utilities
 */
export class HMLKeyManager {
  
  /**
   * Generate new master key with secure randomness
   * @returns {Uint8Array} - 256-bit master key
   */
  static generateMasterKey() {
    return crypto.getRandomValues(new Uint8Array(32));
  }
  
  /**
   * Derive key using PBKDF2 from passphrase
   * @param {string} passphrase - User passphrase
   * @param {Uint8Array} salt - Cryptographic salt
   * @param {number} iterations - PBKDF2 iterations (default 100000)
   * @returns {Promise<Uint8Array>} - Derived key
   */
  static async deriveKeyFromPassphrase(passphrase, salt, iterations = 100000) {
    const passphraseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256'
      },
      passphraseKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
    
    const keyBuffer = await crypto.subtle.exportKey('raw', derivedKey);
    return new Uint8Array(keyBuffer);
  }
  
  /**
   * Generate cryptographic salt
   * @param {number} length - Salt length in bytes (default 32)
   * @returns {Uint8Array} - Random salt
   */
  static generateSalt(length = 32) {
    return crypto.getRandomValues(new Uint8Array(length));
  }
  
  /**
   * Securely wipe key from memory (best effort)
   * @param {Uint8Array} key - Key to wipe
   */
  static secureWipe(key) {
    if (key instanceof Uint8Array) {
      crypto.getRandomValues(key); // Overwrite with random data
      key.fill(0); // Then zero out
    }
  }
}

/**
 * HML Cryptography test utilities
 */
export class HMLCryptoTestUtils {
  
  /**
   * Test encryption/decryption round trip
   * @returns {Promise<boolean>} - True if test passes
   */
  static async testEncryptionRoundTrip() {
    try {
      const testContent = "Hello, HML World! 🔐";
      const testCapsuleId = "urn:hml:capsule:sha256:test123";
      const testVersion = "1.0.0";
      const testLabels = { sensitivity: "personal" };
      
      // Encrypt
      const envelope = await HMLCryptography.encryptContent(
        testContent, testCapsuleId, testVersion, testLabels
      );
      
      // Decrypt
      const decrypted = await HMLCryptography.decryptContent(
        envelope, testCapsuleId, testVersion, testLabels
      );
      
      return decrypted === testContent;
      
    } catch (error) {
      console.error('Encryption round trip test failed:', error);
      return false;
    }
  }
  
  /**
   * Validate AAD construction
   * @returns {Promise<boolean>} - True if AAD is constructed correctly
   */
  static async testAADConstruction() {
    try {
      const capsuleId = "test-capsule";
      const version = "1.0.0";
      const labels = { sensitivity: "personal", retention: "permanent" };
      
      const aad = await HMLCryptography.constructAAD(capsuleId, version, labels);
      
      // AAD should be deterministic
      const aad2 = await HMLCryptography.constructAAD(capsuleId, version, labels);
      
      // Should be equal
      if (aad.length !== aad2.length) return false;
      
      for (let i = 0; i < aad.length; i++) {
        if (aad[i] !== aad2[i]) return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('AAD construction test failed:', error);
      return false;
    }
  }
}

export const HML_CRYPTO_VERSION = "1.0.0";
export const HML_ENCRYPTION_ALGORITHM = "XChaCha20-Poly1305";
export const HML_KEY_SIZE = 256; // bits
export const HML_NONCE_SIZE = 192; // bits
