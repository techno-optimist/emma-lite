/**
 * Mobile-only helpers for Android (Capacitor WebView).
 * - Requests microphone permission proactively.
 * - Persists vault saves to an on-device .emma file using Capacitor Filesystem.
 * Web remains unaffected; all logic is gated to Android + Capacitor presence.
 */
(function () {
  const cap = window.Capacitor;
  const isAndroid = cap?.getPlatform?.() === 'android';
  if (!isAndroid) return;

  const plugins = cap.Plugins || {};
  const Filesystem = plugins.Filesystem || cap.Filesystem;
  const Preferences = plugins.Preferences || plugins.Storage || cap.Preferences;
  const Directory = Filesystem?.Directory || plugins.Directory || { Data: 'DATA' };
  const Encoding = Filesystem?.Encoding || plugins.Encoding || { UTF8: 'utf8', BASE64: 'base64' };

  const VAULT_PATH_PREF = 'emma_mobile_vault_path';
  const DEFAULT_VAULT_NAME = 'emma-vault';
  const AUTO_PREF_KEY = 'emmaVaultAutoSavePreference';
  const AUTO_ENABLED_KEY = 'emmaVaultAutoSaveEnabled';

  const safeName = (name) => {
    if (!name || typeof name !== 'string') return DEFAULT_VAULT_NAME;
    return name.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || DEFAULT_VAULT_NAME;
  };

  function toBase64(u8) {
    if (!u8) return '';
    if (typeof u8 === 'string') return u8;
    if (!(u8 instanceof Uint8Array)) {
      console.warn('⚠️ Unexpected vault data type for mobile save:', typeof u8);
      return '';
    }
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < u8.length; i += chunk) {
      binary += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  async function saveEncryptedVault(encryptedData, fileName) {
    if (!Filesystem || !encryptedData) return;
    const path = fileName || `${DEFAULT_VAULT_NAME}.emma`;
    const data = toBase64(encryptedData);
    if (!data) return;
    try {
      await Filesystem.writeFile({
        path,
        data,
        directory: Directory.Data || 'DATA',
        encoding: Encoding.BASE64 || 'base64',
        recursive: true
      });
      if (Preferences?.set) {
        await Preferences.set({ key: VAULT_PATH_PREF, value: path });
      }
      console.log('📁 Mobile vault saved to', path);
    } catch (error) {
      console.warn('⚠️ Mobile vault file save failed:', error);
    }
  }

  async function saveVaultToMobileFile(reason = 'autosave') {
    try {
      if (!window.emmaWebVault || !window.emmaWebVault.vaultData) return;
      if (!Filesystem) return; // Skip if plugin not available
      const passphrase = window.emmaWebVault.passphrase;
      if (!passphrase) {
        console.warn('⚠️ Mobile vault save skipped: passphrase not cached yet');
        return;
      }
      const vaultName = safeName(window.emmaWebVault.vaultData?.metadata?.name);
      const encryptedData = await window.emmaWebVault.encryptVaultData(null, passphrase);
      await saveEncryptedVault(encryptedData, `${vaultName}.emma`);
    } catch (error) {
      console.warn(`⚠️ Mobile vault save (${reason}) failed:`, error);
    }
  }

  function patchVaultPersistence() {
    const vault = window.emmaWebVault;
    if (!vault || vault._mobilePatched) return;
    const originalSave = typeof vault.saveToIndexedDB === 'function' ? vault.saveToIndexedDB.bind(vault) : null;
    if (originalSave) {
      vault.saveToIndexedDB = async function patchedSaveToIndexedDB() {
        await originalSave();
        await saveVaultToMobileFile('autosave');
      };
    }
    // Expose manual save hook
    vault.saveToMobileFile = saveVaultToMobileFile;
    vault._mobilePatched = true;
    console.log('📱 Mobile vault persistence enabled (Android)');
  }

  function forceDirectAutoSaveMode() {
    try {
      localStorage.setItem(AUTO_PREF_KEY, 'direct');
      localStorage.setItem(AUTO_ENABLED_KEY, 'true');
    } catch (_) {}
  }

  function waitForVault() {
    if (window.emmaWebVault) {
      patchVaultPersistence();
      forceDirectAutoSaveMode();
      return;
    }
    setTimeout(waitForVault, 250);
  }

  // Microphone permission helper (best-effort)
  async function requestMicPermission() {
    const perms = plugins?.Permissions;
    if (!perms) {
      return;
    }
    try {
      const status = await (perms.query?.({ permissions: ['microphone'] }) || perms.queryPermissions?.({ permissions: ['microphone'] }));
      const state = status?.microphone || status?.state || status;
      if (state === 'granted' || state === 'GRANTED') return;
      await (perms.request?.({ permissions: ['microphone'] }) || perms.requestPermissions?.({ permissions: ['microphone'] }));
    } catch (err) {
      console.warn('⚠️ Microphone permission request failed (mobile):', err);
    }
  }

  requestMicPermission();
  document.addEventListener('resume', requestMicPermission);
  waitForVault();

  // Safety net: periodic save attempt if vault has pending changes
  setInterval(() => {
    try {
      if (window.emmaWebVault?.vaultData && window.emmaWebVault?.pendingChanges) {
        saveVaultToMobileFile('interval');
      }
    } catch (_) {}
  }, 30000);
})();
