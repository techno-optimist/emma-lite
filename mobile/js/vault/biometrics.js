'use strict';

(function(global){
  const STORAGE_KEY = 'emma.vault.biometrics.enabled';

  function isCapacitor() {
    try { return !!(global.Capacitor && global.Capacitor.isNativePlatform); } catch { return false; }
  }

  function getEnabled() {
    try { return JSON.parse(global.localStorage?.getItem(STORAGE_KEY) || 'false'); } catch { return false; }
  }

  async function setEnabled(enabled) {
    global.localStorage?.setItem(STORAGE_KEY, JSON.stringify(!!enabled));
  }

  async function isAvailable() {
    // Native availability check; in web, return false
    if (!isCapacitor()) return false;
    // Attempt to detect a plugin surface; tolerate absence
    const Bio = global.Capacitor?.Plugins?.Biometric || global.Capacitor?.Plugins?.FingerprintAuth;
    return !!Bio;
  }

  async function enableQuickUnlock() {
    if (await isAvailable()) {
      try {
        const Bio = global.Capacitor.Plugins.Biometric || global.Capacitor.Plugins.FingerprintAuth;
        if (Bio && typeof Bio.isAvailable === 'function') {
          const av = await Bio.isAvailable();
          if (!av?.has || av.error) throw new Error('Biometrics not available');
        }
        // Optionally create a protected secret; platform-specific implementation later
      } catch (e) {
        throw new Error(e?.message || 'Failed to enable biometrics');
      }
    }
    await setEnabled(true);
    return { ok: true };
  }

  async function disableQuickUnlock() {
    await setEnabled(false);
    return { ok: true };
  }

  global.EmmaBiometrics = { isAvailable, getEnabled, enableQuickUnlock, disableQuickUnlock };
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis));

