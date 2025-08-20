'use strict';

(function(global){
  async function setBackupExcluded(excluded) {
    try {
      const plugin = global.Capacitor?.Plugins?.BackupControl;
      if (plugin && typeof plugin.setExcluded === 'function') {
        await plugin.setExcluded({ excluded: !!excluded });
        global.localStorage?.setItem('emma.vault.backupExcluded', JSON.stringify(!!excluded));
        return { ok: true, native: true };
      }
    } catch (e) { /* ignore and fallback */ }
    // Fallback: store preference only; UI should educate user
    global.localStorage?.setItem('emma.vault.backupExcluded', JSON.stringify(!!excluded));
    return { ok: true, native: false };
  }

  function getBackupExcluded() {
    try { return JSON.parse(global.localStorage?.getItem('emma.vault.backupExcluded') || 'false'); } catch { return false; }
  }

  global.EmmaBackupControl = { setBackupExcluded, getBackupExcluded };
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis));

