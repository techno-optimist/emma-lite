/**
 * Cryptographic utilities for P2P communication
 * 
 * Provides encryption/decryption and key management utilities
 * that work with both the existing vault system and new P2P features
 */

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Generate a random ID
 */
export function generateId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Calculate SHA-256 hash
 */
export async function sha256(data) {
  const encoder = new TextEncoder();
  const dataBytes = typeof data === 'string' ? encoder.encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
  return new Uint8Array(hashBuffer);
}

/**
 * Convert bytes to base64url (URL-safe base64)
 */
export function base64url(bytes) {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Convert base64url to bytes
 */
export function base64urlToBytes(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '=='.substring(0, (4 - base64.length % 4) % 4);
  const binary = atob(padded);
  return new Uint8Array(binary.split('').map(char => char.charCodeAt(0)));
}

/**
 * Encrypt data using AES-GCM
 */
export async function encryptData(data, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const dataBytes = typeof data === 'string' ? textEncoder.encode(data) : data;
  
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    dataBytes
  );
  
  // Combine IV and ciphertext
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return base64url(combined);
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptData(encryptedData, key) {
  const combined = base64urlToBytes(encryptedData);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    ciphertext
  );
  
  return textDecoder.decode(decrypted);
}

/**
 * Derive a shared secret from ECDH key agreement
 */
export async function deriveSharedSecret(privateKey, publicKey) {
  const sharedSecret = await crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: publicKey
    },
    privateKey,
    256
  );
  
  return new Uint8Array(sharedSecret);
}

/**
 * Derive an AES key from shared secret
 */
export async function deriveAESKey(sharedSecret, salt, info) {
  // Import shared secret as HKDF key
  const baseKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    'HKDF',
    false,
    ['deriveKey']
  );
  
  // Derive AES key
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: textEncoder.encode(info)
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  return aesKey;
}

/**
 * Calculate deterministic rendezvous ID for two fingerprints
 */
export async function calculateRendezvousId(fingerprint1, fingerprint2) {
  // Sort fingerprints to ensure same result regardless of order
  const sorted = [fingerprint1, fingerprint2].sort();
  const combined = sorted.join(':') + ':emma-rendezvous-v1';
  
  const hash = await sha256(combined);
  return base64url(hash);
}

/**
 * Generate ephemeral keypair for one-time use
 */
export async function generateEphemeralKeyPair() {
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
 * Export public key to base64
 */
export async function exportPublicKey(key) {
  const exported = await crypto.subtle.exportKey('spki', key);
  return base64url(new Uint8Array(exported));
}

/**
 * Import public key from base64
 */
export async function importPublicKey(base64Key) {
  const keyData = base64urlToBytes(base64Key);
  
  return await crypto.subtle.importKey(
    'spki',
    keyData,
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    []
  );
}

/**
 * Create a time-locked encryption that can only be decrypted after a certain time
 */
export async function timeLockEncrypt(data, key, unlockTime) {
  const now = Date.now();
  if (unlockTime <= now) {
    throw new Error('Unlock time must be in the future');
  }
  
  // Add unlock time to the data
  const timedData = {
    data: data,
    unlockTime: unlockTime,
    lockedAt: now
  };
  
  return await encryptData(JSON.stringify(timedData), key);
}

/**
 * Decrypt time-locked data
 */
export async function timeLockDecrypt(encryptedData, key) {
  const decrypted = await decryptData(encryptedData, key);
  const timedData = JSON.parse(decrypted);
  
  const now = Date.now();
  if (now < timedData.unlockTime) {
    const remaining = timedData.unlockTime - now;
    throw new Error(`Data is time-locked for another ${Math.ceil(remaining / 1000)} seconds`);
  }
  
  return timedData.data;
}

/**
 * Sign data with private key
 */
export async function signData(data, privateKey) {
  const dataBytes = typeof data === 'string' ? textEncoder.encode(data) : data;
  
  const signature = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: 'SHA-256'
    },
    privateKey,
    dataBytes
  );
  
  return base64url(new Uint8Array(signature));
}

/**
 * Verify signature with public key
 */
export async function verifySignature(data, signature, publicKey) {
  const dataBytes = typeof data === 'string' ? textEncoder.encode(data) : data;
  const signatureBytes = base64urlToBytes(signature);
  
  return await crypto.subtle.verify(
    {
      name: 'ECDSA',
      hash: 'SHA-256'
    },
    publicKey,
    signatureBytes,
    dataBytes
  );
}






















