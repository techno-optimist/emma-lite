/**
 * Identity Cryptography Module for Emma Collaborative Vaults
 * 
 * Handles cryptographic identity generation and management for people.
 * Uses Ed25519 for signing/verification and X25519 for encryption/decryption.
 */

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Generate a complete cryptographic identity for a person
 * @returns {Promise<Object>} Identity object with signing and encryption keypairs
 */
export async function generateIdentity() {
  try {
    // Generate Ed25519 signing keypair
    const signingKeyPair = await generateSigningKeyPair();
    
    // Generate X25519 encryption keypair
    const encryptionKeyPair = await generateEncryptionKeyPair();
    
    // Generate key fingerprint for verification
    const fingerprint = await generateKeyFingerprint(signingKeyPair.publicKey);
    
    return {
      signing: {
        publicKey: await exportPublicKey(signingKeyPair.publicKey),
        privateKey: await exportPrivateKey(signingKeyPair.privateKey)
      },
      encryption: {
        publicKey: await exportPublicKey(encryptionKeyPair.publicKey),
        privateKey: await exportPrivateKey(encryptionKeyPair.privateKey)
      },
      fingerprint,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to generate identity:', error);
    throw new Error(`Identity generation failed: ${error.message}`);
  }
}

/**
 * Generate Ed25519 signing keypair
 * Note: WebCrypto doesn't support Ed25519 natively yet, so we use ECDSA P-256 as a fallback
 * In production, consider using a library like tweetnacl-js for true Ed25519
 */
async function generateSigningKeyPair() {
  // Using ECDSA P-256 as Ed25519 alternative for now
  // TODO: Replace with Ed25519 when WebCrypto support is available
  return await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256'
    },
    true,
    ['sign', 'verify']
  );
}

/**
 * Generate X25519 encryption keypair
 * Note: Using ECDH P-256 as X25519 alternative for WebCrypto compatibility
 */
async function generateEncryptionKeyPair() {
  // Using ECDH P-256 as X25519 alternative
  // TODO: Replace with X25519 when WebCrypto support is available
  return await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Export a public key to base64 string
 */
async function exportPublicKey(key) {
  const exported = await crypto.subtle.exportKey('spki', key);
  return bytesToBase64(new Uint8Array(exported));
}

/**
 * Export a private key to base64 string
 */
async function exportPrivateKey(key) {
  const exported = await crypto.subtle.exportKey('pkcs8', key);
  return bytesToBase64(new Uint8Array(exported));
}

/**
 * Import a public key from base64 string
 */
export async function importPublicKey(base64Key, keyType = 'signing') {
  const keyData = base64ToBytes(base64Key);
  const algorithm = keyType === 'signing' 
    ? { name: 'ECDSA', namedCurve: 'P-256' }
    : { name: 'ECDH', namedCurve: 'P-256' };
  const keyUsages = keyType === 'signing' ? ['verify'] : [];
  
  return await crypto.subtle.importKey(
    'spki',
    keyData,
    algorithm,
    true,
    keyUsages
  );
}

/**
 * Import a private key from base64 string
 */
export async function importPrivateKey(base64Key, keyType = 'signing') {
  const keyData = base64ToBytes(base64Key);
  const algorithm = keyType === 'signing' 
    ? { name: 'ECDSA', namedCurve: 'P-256' }
    : { name: 'ECDH', namedCurve: 'P-256' };
  const keyUsages = keyType === 'signing' ? ['sign'] : ['deriveKey', 'deriveBits'];
  
  return await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    algorithm,
    true,
    keyUsages
  );
}

/**
 * Generate a fingerprint for a public key
 */
async function generateKeyFingerprint(publicKey) {
  const exported = await crypto.subtle.exportKey('spki', publicKey);
  const hash = await crypto.subtle.digest('SHA-256', exported);
  const fingerprint = bytesToHex(new Uint8Array(hash));
  
  // Format as colon-separated hex pairs for readability
  return fingerprint.match(/.{1,2}/g).join(':').toUpperCase();
}

/**
 * Wrap a vault key with a recipient's public encryption key
 */
export async function wrapVaultKey(vaultKey, recipientPublicKey) {
  try {
    // Import recipient's public key
    const publicKey = await importPublicKey(recipientPublicKey, 'encryption');
    
    // Generate ephemeral keypair for this wrapping operation
    const ephemeralKeyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      ['deriveKey', 'deriveBits']
    );
    
    // Derive shared secret
    const sharedSecret = await crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: publicKey
      },
      ephemeralKeyPair.privateKey,
      256
    );
    
    // Import shared secret as AES key
    const wrappingKey = await crypto.subtle.importKey(
      'raw',
      sharedSecret,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Wrap the vault key
    const wrappedKey = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      wrappingKey,
      vaultKey
    );
    
    // Export ephemeral public key
    const ephemeralPublicKey = await exportPublicKey(ephemeralKeyPair.publicKey);
    
    return {
      wrappedKey: bytesToBase64(new Uint8Array(wrappedKey)),
      ephemeralPublicKey,
      iv: bytesToBase64(iv),
      algorithm: 'ECDH-AES256-GCM'
    };
  } catch (error) {
    console.error('Failed to wrap vault key:', error);
    throw new Error(`Key wrapping failed: ${error.message}`);
  }
}

/**
 * Unwrap a vault key using recipient's private encryption key
 */
export async function unwrapVaultKey(wrappedKeyData, recipientPrivateKey) {
  try {
    // Import recipient's private key
    const privateKey = await importPrivateKey(recipientPrivateKey, 'encryption');
    
    // Import ephemeral public key
    const ephemeralPublicKey = await importPublicKey(wrappedKeyData.ephemeralPublicKey, 'encryption');
    
    // Derive shared secret
    const sharedSecret = await crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: ephemeralPublicKey
      },
      privateKey,
      256
    );
    
    // Import shared secret as AES key
    const unwrappingKey = await crypto.subtle.importKey(
      'raw',
      sharedSecret,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Unwrap the vault key
    const vaultKey = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: base64ToBytes(wrappedKeyData.iv)
      },
      unwrappingKey,
      base64ToBytes(wrappedKeyData.wrappedKey)
    );
    
    return new Uint8Array(vaultKey);
  } catch (error) {
    console.error('Failed to unwrap vault key:', error);
    throw new Error(`Key unwrapping failed: ${error.message}`);
  }
}

/**
 * Sign data with a private signing key
 */
export async function signData(data, privateKeyBase64) {
  try {
    const privateKey = await importPrivateKey(privateKeyBase64, 'signing');
    const dataBytes = typeof data === 'string' ? textEncoder.encode(data) : data;
    
    const signature = await crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: 'SHA-256'
      },
      privateKey,
      dataBytes
    );
    
    return bytesToBase64(new Uint8Array(signature));
  } catch (error) {
    console.error('Failed to sign data:', error);
    throw new Error(`Signing failed: ${error.message}`);
  }
}

/**
 * Verify a signature with a public signing key
 */
export async function verifySignature(data, signature, publicKeyBase64) {
  try {
    const publicKey = await importPublicKey(publicKeyBase64, 'signing');
    const dataBytes = typeof data === 'string' ? textEncoder.encode(data) : data;
    const signatureBytes = base64ToBytes(signature);
    
    return await crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: 'SHA-256'
      },
      publicKey,
      signatureBytes,
      dataBytes
    );
  } catch (error) {
    console.error('Failed to verify signature:', error);
    return false;
  }
}

// Utility functions
function bytesToBase64(bytes) {
  const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join('');
  return btoa(binString);
}

function base64ToBytes(base64) {
  const binString = atob(base64);
  return Uint8Array.from(binString, (m) => m.codePointAt(0));
}

function bytesToHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a shareable identity card for a person
 */
export function generateIdentityCard(person, identity) {
  return {
    name: person.name,
    email: person.email,
    publicSigningKey: identity.signing.publicKey,
    publicEncryptionKey: identity.encryption.publicKey,
    fingerprint: identity.fingerprint,
    createdAt: identity.createdAt,
    verificationQR: generateVerificationQR(identity.fingerprint)
  };
}

/**
 * Generate QR code data for key verification
 */
function generateVerificationQR(fingerprint) {
  // This would contain the fingerprint and verification URL
  return `emma://verify/${fingerprint}`;
}

/**
 * Export identity keys for backup
 */
export function exportIdentityForBackup(identity) {
  return {
    version: '1.0',
    type: 'emma-identity-backup',
    createdAt: new Date().toISOString(),
    identity: {
      signing: {
        publicKey: identity.signing.publicKey,
        privateKey: identity.signing.privateKey
      },
      encryption: {
        publicKey: identity.encryption.publicKey,
        privateKey: identity.encryption.privateKey
      },
      fingerprint: identity.fingerprint,
      createdAt: identity.createdAt
    }
  };
}

/**
 * Import identity keys from backup
 */
export async function importIdentityFromBackup(backup) {
  if (backup.type !== 'emma-identity-backup') {
    throw new Error('Invalid backup format');
  }
  
  // Verify keys can be imported
  await importPrivateKey(backup.identity.signing.privateKey, 'signing');
  await importPrivateKey(backup.identity.encryption.privateKey, 'encryption');
  
  return backup.identity;
}

























