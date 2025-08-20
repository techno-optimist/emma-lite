'use strict';

// Dedicated worker for KDF and AES-GCM to avoid blocking the UI thread

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBytes(input) {
  if (input == null) return new Uint8Array();
  if (input instanceof Uint8Array) return input;
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer);
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (typeof input === 'string') return textEncoder.encode(input);
  throw new Error('Unsupported input type');
}

async function pbkdf2Key(passphrase, saltBytes, iterations) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true, // extractable so we can send raw bytes back
    ['encrypt', 'decrypt']
  );
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', aesKey));
  return raw;
}

async function encryptAesGcm(keyBytes, plaintextBytes) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintextBytes));
  return { iv, ciphertext: ct };
}

async function decryptAesGcm(keyBytes, iv, ciphertextBytes) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertextBytes));
  return pt;
}

async function profilePBKDF2(passphrase, saltBytes, iterations) {
  const t0 = performance.now();
  const key = await pbkdf2Key(passphrase, saltBytes, iterations);
  const t1 = performance.now();
  return { ms: t1 - t0, key };
}

self.onmessage = async (e) => {
  const { id, op, payload } = e.data || {};
  try {
    if (op === 'pbkdf2') {
      const { passphrase, salt, iterations } = payload;
      const saltBytes = toBytes(salt);
      const t0 = performance.now();
      const key = await pbkdf2Key(passphrase, saltBytes, iterations);
      const t1 = performance.now();
      const res = { ok: true, result: { key, ms: t1 - t0 } };
      // Transfer buffers for performance
      return self.postMessage({ id, ...res }, [key.buffer]);
    }
    if (op === 'encrypt') {
      const { key, plaintext } = payload;
      const { iv, ciphertext } = await encryptAesGcm(toBytes(key), toBytes(plaintext));
      return self.postMessage({ id, ok: true, result: { iv, ciphertext } }, [iv.buffer, ciphertext.buffer]);
    }
    if (op === 'decrypt') {
      const { key, iv, ciphertext } = payload;
      const pt = await decryptAesGcm(toBytes(key), toBytes(iv), toBytes(ciphertext));
      return self.postMessage({ id, ok: true, result: { plaintext: pt } }, [pt.buffer]);
    }
    if (op === 'profilePBKDF2') {
      const { passphrase, salt, iterations } = payload;
      const { ms, key } = await profilePBKDF2(passphrase, toBytes(salt), iterations);
      return self.postMessage({ id, ok: true, result: { ms, key } }, [key.buffer]);
    }
    throw new Error('Unknown op: ' + op);
  } catch (err) {
    const message = (err && err.message) ? err.message : String(err);
    self.postMessage({ id, ok: false, error: message });
  }
};

