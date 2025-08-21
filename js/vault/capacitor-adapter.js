'use strict';

(function(global){
  const { VaultStorageAdapter } = global.EmmaVaultAdapters || {};
  const { createManifest, verifyManifest } = global.EmmaVaultJournal || {};

  function ensureCapacitor() {
    const C = global.Capacitor || global.CapacitorBridge || null;
    if (!C || !global.Capacitor?.Plugins?.Filesystem) {
      throw new Error('Capacitor Filesystem not available');
    }
    return global.Capacitor.Plugins.Filesystem;
  }

  async function writeFile(path, data) {
    const Filesystem = ensureCapacitor();
    const b64 = btoa(String.fromCharCode(...data));
    await Filesystem.writeFile({ path, data: b64, directory: 'DOCUMENTS', recursive: true });
  }

  async function readFile(path) {
    const Filesystem = ensureCapacitor();
    const res = await Filesystem.readFile({ path, directory: 'DOCUMENTS' });
    const binary = atob(res.data || '');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function getUri(path) {
    const Filesystem = ensureCapacitor();
    try {
      const res = await Filesystem.getUri({ path, directory: 'DOCUMENTS' });
      return res?.uri || null;
    } catch { return null; }
  }

  async function exists(path) {
    const Filesystem = ensureCapacitor();
    try { await Filesystem.stat({ path, directory: 'DOCUMENTS' }); return true; } catch { return false; }
  }

  async function remove(path) {
    const Filesystem = ensureCapacitor();
    try { await Filesystem.deleteFile({ path, directory: 'DOCUMENTS' }); } catch {}
  }

  class EmmaVaultCapacitorAdapter extends VaultStorageAdapter {
    constructor() {
      super();
      this._id = 'capacitor';
      this._name = 'vault';
      this._path = 'Emma/vault.emma';
    }
    get id() { return this._id; }
    async openVault(options = {}) {
      this._name = options.vaultName || this._name;
      this._path = `Emma/${this._name}.emma`;
      if (!(await exists(this._path))) {
        await writeFile(this._path, new Uint8Array());
      }
      // Startup repair: if tmp+manifest exists, verify and promote
      try {
        const tmpPath = `Emma/${this._name}.tmp`;
        const manPath = `Emma/${this._name}.manifest.json`;
        if (await exists(tmpPath) && await exists(manPath) && createManifest && verifyManifest) {
          const tmpBytes = await readFile(tmpPath);
          const manBytes = await readFile(manPath);
          const manifest = JSON.parse(new TextDecoder().decode(manBytes));
          const ok = await verifyManifest(tmpBytes, manifest);
          if (ok) {
            await writeFile(this._path, tmpBytes);
            await remove(tmpPath);
            await remove(manPath);
          } else {
            // preserve recovery
            const recPath = `Emma/${this._name}.recovery-${Date.now()}.emma`;
            await writeFile(recPath, tmpBytes);
            await remove(manPath);
          }
        }
      } catch {}
      await this._rememberRecent();
    }
    async readVault() {
      return await readFile(this._path);
    }
    async writeVault(data) {
      if (!(data instanceof Uint8Array)) throw new Error('writeVault expects Uint8Array');
      const tmpPath = `Emma/${this._name}.tmp`;
      const manPath = `Emma/${this._name}.manifest.json`;
      // Write temp and manifest
      await writeFile(tmpPath, data);
      const manifest = await createManifest ? (await createManifest(data)) : { version: 0 };
      await writeFile(manPath, new TextEncoder().encode(JSON.stringify(manifest)));
      const ok = verifyManifest ? await verifyManifest(data, manifest) : true;
      if (!ok) {
        const recPath = `Emma/${this._name}.recovery-${Date.now()}.emma`;
        await writeFile(recPath, await readFile(tmpPath));
        throw new Error('Manifest verification failed');
      }
      // Replace vault with tmp
      await writeFile(this._path, await readFile(tmpPath));
      // Cleanup
      await remove(tmpPath);
      await remove(manPath);
      await this._rememberRecent();
    }
    async exportVault(options = {}) {
      // Read current vault and write to an export path, then present share sheet if available
      const bytes = await this.readVault().catch(() => new Uint8Array());
      const filename = options.suggestedName || (this._name + '.emma');
      const exportPath = `Emma/Exports/${filename}`;
      await writeFile(exportPath, bytes);
      try {
        const Share = global.Capacitor?.Plugins?.Share;
        if (Share && typeof Share.share === 'function') {
          // Resolve a URI for the written file if available
          const uri = await getUri(exportPath);
          await Share.share({
            title: 'Export Emma Vault',
            text: 'Your Emma vault export',
            url: uri || exportPath,
            dialogTitle: 'Share Emma Vault'
          });
        }
      } catch { /* ignore */ }
    }
    async importVault(input) {
      if (input instanceof Uint8Array) {
        await this.writeVault(input);
        return;
      }
      throw new Error('Unsupported import input for Capacitor adapter');
    }
    async listRecentVaults() {
      try {
        const raw = global.localStorage?.getItem('emma.vault.recent') || '[]';
        return JSON.parse(raw) || [];
      } catch { return []; }
    }
    async _rememberRecent() {
      try {
        const list = await this.listRecentVaults();
        const entry = { id: 'capacitor://'+this._name, name: this._name, source: this._id, lastOpenedAt: new Date().toISOString() };
        const filtered = [entry, ...list.filter(e => e.id !== entry.id)].slice(0, 5);
        global.localStorage?.setItem('emma.vault.recent', JSON.stringify(filtered));
      } catch {}
    }
  }

  global.EmmaVaultCapacitorAdapter = EmmaVaultCapacitorAdapter;
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis));

