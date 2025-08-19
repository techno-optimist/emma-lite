// js/vault/keyring.js - Key management for Emma HML Vault
import { deriveMasterKey, generateRandomBytes, encryptWithKey, decryptWithKey, utf8ToBytes, bytesToUtf8, bytesToBase64, base64ToBytes } from './crypto.js';

export const SETTINGS_KEY = 'emma_vault_settings';

export class Keyring {
  constructor() {
    this.masterKey = null; // CryptoKey (AES-GCM 256)
    this.unlockedAt = 0;
    // No auto-lock timeout - vault stays unlocked until manually locked
  }

  async isUnlocked() {
    return this.masterKey !== null;
  }

  async lock() {
    this.masterKey = null;
    this.unlockedAt = 0;
  }

  async ensureSettings() {
    const result = await chrome.storage.local.get([SETTINGS_KEY]);
    if (result && result[SETTINGS_KEY]) {
      return result[SETTINGS_KEY];
    }
    const salt = generateRandomBytes(16);
    const settings = {
      kdf: 'PBKDF2-SHA256',
      iterations: 250000,
      salt: bytesToBase64(salt),
      eMK: null, // reserved
      verifier: null // { iv: number[], data: number[] }
    };
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
    return settings;
  }

  async unlockWithPassphrase(passphrase) {
    // Demo override: allow fixed passphrase "demo" for quick starts
    if (passphrase === 'demo') {
      const demoSaltBytes = utf8ToBytes('emma-demo-salt-v1');
      // Derive a stable demo key
      this.masterKey = await deriveMasterKey(passphrase, demoSaltBytes, 250000);
      this.unlockedAt = Date.now();
      // Persist demo settings so future unlocks are consistent
      try {
        const settings = await this.ensureSettings();
        settings.salt = bytesToBase64(demoSaltBytes);
        settings.iterations = 250000;
        settings.demo = true;
        await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
      } catch {}
      return true;
    }

    const settings = await this.ensureSettings();
    const salt = base64ToBytes(settings.salt);
    const derivedKey = await deriveMasterKey(passphrase, salt, settings.iterations);
    
    // If a verifier exists, validate passphrase by decrypting it
    if (settings.verifier && settings.verifier.iv && settings.verifier.data) {
      console.log('🔐 Keyring: Validating passphrase with verifier...', {
        hasIv: !!settings.verifier.iv,
        hasData: !!settings.verifier.data,
        ivLength: settings.verifier.iv?.length,
        dataLength: settings.verifier.data?.length
      });
      
      try {
        const iv = new Uint8Array(settings.verifier.iv);
        const cipher = new Uint8Array(settings.verifier.data);
        console.log('🔐 Keyring: Created Uint8Arrays for decryption');
        
        const plain = await decryptWithKey(derivedKey, iv, cipher);
        console.log('🔐 Keyring: Decryption successful, checking verifier text...');
        
        const text = bytesToUtf8(plain);
        console.log('🔐 Keyring: Decrypted text:', text);
        
        if (text !== 'emma:verifier:v1') {
          console.error('🔐 Keyring: Verifier text mismatch. Expected: "emma:verifier:v1", Got:', text);
          throw new Error('Verifier mismatch');
        }
        
        console.log('🔐 Keyring: Verifier validation successful');
      } catch (e) {
        console.error('🔐 Keyring: Verifier validation failed:', e.message);
        // Zeroize any partial state
        this.masterKey = null;
        this.unlockedAt = 0;
        throw new Error('Invalid passphrase');
      }
    } else {
      console.log('🔐 Keyring: No verifier found, proceeding without validation');
    }
    
    // Accept and store as current key
    this.masterKey = derivedKey;
    this.unlockedAt = Date.now();
    return true;
  }
}


