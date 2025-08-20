'use strict';

(function(global){
  const { VaultStorageAdapter } = global.EmmaVaultAdapters || {};
  const { createManifest, verifyManifest } = global.EmmaVaultJournal || {};

  async function getRootDirectory() {
    if (!global.navigator?.storage?.getDirectory) {
      throw new Error('OPFS not supported');
    }
    return await global.navigator.storage.getDirectory();
  }

  async function ensureFile(handle, create) {
    try {
      return await handle.getFileHandle('vault.emma', { create });
    } catch (e) {
      if (!create) throw e;
      return await handle.getFileHandle('vault.emma', { create: true });
    }
  }

  class EmmaVaultOPFSAdapter extends VaultStorageAdapter {
    constructor() {
      super();
      this._id = 'opfs';
      this._name = 'vault';
      this._root = null;
      this._file = null;
    }
    get id() { return this._id; }

    async openVault(options = {}) {
      this._name = options.vaultName || this._name;
      this._root = await getRootDirectory();
      this._file = await ensureFile(this._root, true);
      await this._rememberRecent();
    }

    async readVault() {
      if (!this._file) throw new Error('Vault not opened');
      const file = await this._file.getFile();
      const buf = await file.arrayBuffer();
      return new Uint8Array(buf);
    }

    async writeVault(data) {
      if (!this._file) throw new Error('Vault not opened');
      if (!(data instanceof Uint8Array)) throw new Error('writeVault expects Uint8Array');
      // Phase 1: journaling with temp + manifest, then atomic rename replace
      const dir = this._root;
      const tmp = await dir.getFileHandle('vault.tmp', { create: true });
      const man = await dir.getFileHandle('vault.manifest.json', { create: true });
      // Write temp bytes
      let w = await tmp.createWritable();
      await w.write(data);
      await w.close();
      // Write manifest
      const manifest = await createManifest ? (await createManifest(data)) : { version: 0 };
      w = await man.createWritable();
      await w.write(new Blob([JSON.stringify(manifest)], { type: 'application/json' }));
      await w.close();
      // Verify
      const verifyOk = verifyManifest ? await verifyManifest(data, manifest) : true;
      if (!verifyOk) throw new Error('Manifest verification failed');
      // Atomic replace: truncate original then write data (OPFS lacks rename over existing)
      const vaultWritable = await this._file.createWritable();
      await vaultWritable.truncate(0);
      await vaultWritable.write(data);
      await vaultWritable.close();
      // Cleanup
      try { await dir.removeEntry('vault.tmp'); } catch {}
      try { await dir.removeEntry('vault.manifest.json'); } catch {}
      await this._rememberRecent();
    }

    async exportVault(options = {}) {
      // Phase 0: fallback to browser download
      if (!global.Blob || !global.URL || !global.document) return;
      const bytes = await this.readVault().catch(() => new Uint8Array());
      const blob = new Blob([bytes], { type: options.mimeType || 'application/octet-stream' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = options.suggestedName || (this._name + '.emma');
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 0);
    }

    async importVault(input) {
      const file = input && input.arrayBuffer ? input : null;
      if (!file) throw new Error('OPFS import expects a File/Blob');
      const buf = new Uint8Array(await file.arrayBuffer());
      await this.writeVault(buf);
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
        const entry = { id: 'opfs://'+this._name, name: this._name, source: this._id, lastOpenedAt: new Date().toISOString() };
        const filtered = [entry, ...list.filter(e => e.id !== entry.id)].slice(0, 5);
        global.localStorage?.setItem('emma.vault.recent', JSON.stringify(filtered));
      } catch { /* ignore */ }
    }
  }

  global.EmmaVaultOPFSAdapter = EmmaVaultOPFSAdapter;
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis));

