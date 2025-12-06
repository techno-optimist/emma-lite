// js/vault/crypto.js - WebCrypto helpers for Emma HML Vault

// NOTE: Minimal, battle-tested primitives only. For beta we use PBKDF2-SHA-256
// to derive an AES-256-GCM key from a passphrase. Production can switch to
// Argon2id via WASM if desired.

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export async function deriveMasterKey(passphrase, saltBytes, iterations = 250000) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  return aesKey;
}

export function generateRandomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export async function encryptWithKey(key, plaintextBytes) {
  const iv = generateRandomBytes(12);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintextBytes
  );
  return { iv, ciphertext: new Uint8Array(ciphertext) };
}

export async function decryptWithKey(key, iv, ciphertextBytes) {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertextBytes
  );
  return new Uint8Array(plaintext);
}

export function utf8ToBytes(str) {
  return textEncoder.encode(str);
}

export function bytesToUtf8(bytes) {
  return textDecoder.decode(bytes);
}

export function bytesToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}


