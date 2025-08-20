'use strict';

(function(global){
  async function sha256(bytes) {
    const buf = await crypto.subtle.digest('SHA-256', bytes);
    return new Uint8Array(buf);
  }

  function toHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function createManifest(data, options = {}) {
    const chunkSize = options.chunkSize || 64 * 1024; // 64KB
    const total = data.length || data.byteLength || 0;
    const chunks = [];
    for (let i = 0; i < total; i += chunkSize) {
      const slice = data.subarray(i, Math.min(total, i + chunkSize));
      const hash = await sha256(slice);
      chunks.push({ index: chunks.length, size: slice.length, sha256: toHex(hash) });
    }
    const rootHash = await sha256(data);
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      totalBytes: total,
      chunkSize,
      chunkCount: chunks.length,
      rootHash: toHex(rootHash),
      chunks
    };
  }

  async function verifyManifest(data, manifest) {
    if (!manifest || manifest.version !== 1) return false;
    if (manifest.totalBytes !== (data.length || data.byteLength || 0)) return false;
    for (let i = 0; i < manifest.chunkCount; i++) {
      const { index, size, sha256: expected } = manifest.chunks[i];
      const start = index * manifest.chunkSize;
      const end = Math.min(manifest.totalBytes, start + size);
      const slice = data.subarray(start, end);
      const hash = await sha256(slice);
      if (toHex(hash) !== expected) return false;
    }
    const rootHash = await sha256(data);
    return toHex(rootHash) === manifest.rootHash;
  }

  global.EmmaVaultJournal = { createManifest, verifyManifest };
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis));

