'use strict';

(function(global){
  async function getFreeSpaceBytes() {
    if (!global.navigator?.storage?.estimate) return null;
    try {
      const { usage = 0, quota = 0 } = await global.navigator.storage.estimate();
      const free = Math.max(0, (quota || 0) - (usage || 0));
      return free;
    } catch { return null; }
  }

  function bytesToHuman(bytes) {
    if (bytes == null) return 'unknown';
    const units = ['B','KB','MB','GB','TB'];
    let i = 0; let v = bytes;
    while (v >= 1024 && i < units.length-1) { v /= 1024; i++; }
    return `${v.toFixed(1)} ${units[i]}`;
  }

  async function ensureSufficientSpace(requiredBytes, minFreeBytes = 200 * 1024 * 1024) {
    const free = await getFreeSpaceBytes();
    if (free == null) return { ok: true, freeBytes: null, note: 'unknown' };
    if (free < minFreeBytes + (requiredBytes || 0)) {
      return { ok: false, freeBytes: free, message: `Low storage: ${bytesToHuman(free)} free` };
    }
    return { ok: true, freeBytes: free };
  }

  global.EmmaVaultPreflight = { getFreeSpaceBytes, ensureSufficientSpace, bytesToHuman };
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis));

