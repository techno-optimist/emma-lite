/**
 * Emma Extension Crypto Service
 * Pure cryptographic operations for Web App Primary Architecture
 * 
 * CTO STRATEGIC INITIATIVE: Stateless crypto service
 * - No data storage in service worker
 * - Pure encryption/decryption functions
 * - Bulletproof reliability for dementia users
 * 
 * FOR DEBBE: Secure crypto operations that never fail ❤️
 */

/**
 * PHASE 2.3: Pure crypto message handlers
 * Add to background.js message listener
 */

// Add these cases to the existing chrome.runtime.onMessage.addListener

/**
 * ENCRYPT_VAULT_DATA: Pure encryption service
 */
async function handleEncryptVaultData(vaultData, passphrase) {
  try {
    console.log('🔒 CRYPTO: Encrypting vault data...');
    
    // Generate salt for encryption
    const salt = crypto.getRandomValues(new Uint8Array(32));
    
    // Convert vault data to JSON string
    const jsonString = JSON.stringify(vaultData);
    const dataToEncrypt = new TextEncoder().encode(jsonString);
    
    // Derive encryption key
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 250000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // Generate IV for encryption
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the data
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      dataToEncrypt
    );
    
    // Create .emma file format
    const magicBytes = new TextEncoder().encode('EMMA');
    const saltBytes = salt;
    const ivBytes = iv;
    const encryptedBytes = new Uint8Array(encrypted);
    
    // Combine all parts
    const totalLength = 4 + 32 + 12 + encryptedBytes.length;
    const fileData = new Uint8Array(totalLength);
    
    let offset = 0;
    fileData.set(magicBytes, offset); offset += 4;
    fileData.set(saltBytes, offset); offset += 32;
    fileData.set(ivBytes, offset); offset += 12;
    fileData.set(encryptedBytes, offset);
    
    console.log('✅ CRYPTO: Vault encrypted successfully, size:', fileData.length);
    
    return {
      success: true,
      encryptedData: Array.from(fileData), // Convert for message passing
      salt: Array.from(salt),
      iv: Array.from(iv)
    };
    
  } catch (error) {
    console.error('❌ CRYPTO: Encryption failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * DECRYPT_VAULT_DATA: Pure decryption service
 */
async function handleDecryptVaultData(encryptedData, passphrase) {
  try {
    console.log('🔓 CRYPTO: Decrypting vault data...');
    
    // Convert array back to Uint8Array
    const fileData = new Uint8Array(encryptedData);
    
    // Verify .emma file format
    const magicBytes = fileData.slice(0, 4);
    const magicString = new TextDecoder().decode(magicBytes);
    
    if (magicString !== 'EMMA') {
      throw new Error('Invalid .emma file format');
    }
    
    // Extract components
    const salt = fileData.slice(4, 36);
    const iv = fileData.slice(36, 48);
    const encrypted = fileData.slice(48);
    
    console.log('🔓 CRYPTO: File format verified, extracting data...');
    
    // Derive decryption key
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 250000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encrypted
    );
    
    // Parse JSON
    const jsonString = new TextDecoder().decode(decrypted);
    const vaultData = JSON.parse(jsonString);
    
    console.log('✅ CRYPTO: Vault decrypted successfully, memories:', 
      Object.keys(vaultData.content?.memories || {}).length);
    
    return {
      success: true,
      vaultData: vaultData
    };
    
  } catch (error) {
    console.error('❌ CRYPTO: Decryption failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * GENERATE_ENCRYPTION_SALT: Generate new salt for vault creation
 */
function handleGenerateEncryptionSalt() {
  try {
    const salt = crypto.getRandomValues(new Uint8Array(32));
    console.log('🧂 CRYPTO: Generated new encryption salt');
    
    return {
      success: true,
      salt: Array.from(salt)
    };
  } catch (error) {
    console.error('❌ CRYPTO: Failed to generate salt:', error);
    return { success: false, error: error.message };
  }
}

// Export functions for use in background.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleEncryptVaultData,
    handleDecryptVaultData,
    handleGenerateEncryptionSalt
  };
}

console.log('🔐 Emma Crypto Service loaded - Pure cryptographic operations ready');
