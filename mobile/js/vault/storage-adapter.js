'use strict';

(function(global) {
  /**
   * Emma Vault Storage Adapters
   *
   * This module defines the cross-environment adapter contract used by the web app,
   * extension, and mobile shells to perform all vault file I/O. All higher layers
   * must depend on this contract rather than direct file APIs.
   */

  /**
   * @typedef {Object} OpenOptions
   * @property {string} [vaultName] - Logical name of the vault (without extension)
   * @property {any} [input] - Environment-specific input (e.g., File handle, File, path)
   */

  /**
   * @typedef {Object} ExportOptions
   * @property {string} [suggestedName]
   * @property {string} [mimeType]
   */

  /**
   * @typedef {Object} RecentVault
   * @property {string} id
   * @property {string} name
   * @property {string} source - adapter identifier (e.g., 'opfs', 'capacitor', 'memory')
   * @property {string} lastOpenedAt
   */

  class VaultStorageAdapter {
    /** @returns {string} unique adapter id */
    get id() { throw new Error('Not implemented'); }

    /**
     * Open or create a vault for subsequent operations.
     * @param {OpenOptions} options
     * @returns {Promise<void>}
     */
    async openVault(options) { throw new Error('Not implemented'); }

    /**
     * Read the entire vault as Uint8Array.
     * @returns {Promise<Uint8Array>}
     */
    async readVault() { throw new Error('Not implemented'); }

    /**
     * Persist encrypted vault bytes.
     * @param {Uint8Array} data
     * @returns {Promise<void>}
     */
    async writeVault(data) { throw new Error('Not implemented'); }

    /**
     * Export the vault to an external destination (picker/share sheet where available).
     * @param {ExportOptions} [options]
     * @returns {Promise<void>}
     */
    async exportVault(options) { throw new Error('Not implemented'); }

    /**
     * Import a vault from user-selected input (File, path, or handle depending on env).
     * @param {any} input
     * @returns {Promise<void>}
     */
    async importVault(input) { throw new Error('Not implemented'); }

    /**
     * List recently used vault references for quick access.
     * @returns {Promise<RecentVault[]>}
     */
    async listRecentVaults() { return []; }
  }

  /**
   * Minimal in-memory adapter useful for tests and fallbacks.
   */
  class InMemoryAdapter extends VaultStorageAdapter {
    constructor() {
      super();
      this._id = 'memory';
      this._name = 'untitled';
      this._bytes = new Uint8Array();
    }
    get id() { return this._id; }
    async openVault(options = {}) {
      this._name = options.vaultName || this._name;
    }
    async readVault() {
      return new Uint8Array(this._bytes);
    }
    async writeVault(data) {
      if (!(data instanceof Uint8Array)) throw new Error('writeVault expects Uint8Array');
      this._bytes = new Uint8Array(data);
      this._rememberRecent();
    }
    async exportVault() { /* no-op for memory */ }
    async importVault(input) {
      if (input instanceof Uint8Array) {
        this._bytes = new Uint8Array(input);
      } else if (input && input.arrayBuffer) {
        const buf = await input.arrayBuffer();
        this._bytes = new Uint8Array(buf);
      } else {
        throw new Error('Unsupported import input for memory adapter');
      }
      this._rememberRecent();
    }
    async listRecentVaults() {
      const raw = global.localStorage ? global.localStorage.getItem('emma.vault.recent') : null;
      if (!raw) return [];
      try { return JSON.parse(raw) || []; } catch { return []; }
    }
    _rememberRecent() {
      try {
        if (!global.localStorage) return;
        const list = this.listRecentVaults ? (Array.isArray(this._cachedRecent) ? this._cachedRecent : JSON.parse(global.localStorage.getItem('emma.vault.recent') || '[]')) : [];
        const entry = { id: 'memory://'+this._name, name: this._name, source: this._id, lastOpenedAt: new Date().toISOString() };
        const filtered = [entry, ...list.filter(e => e.id !== entry.id)].slice(0, 5);
        global.localStorage.setItem('emma.vault.recent', JSON.stringify(filtered));
        this._cachedRecent = filtered;
      } catch { /* ignore */ }
    }
  }

  global.EmmaVaultAdapters = Object.assign(global.EmmaVaultAdapters || {}, {
    VaultStorageAdapter,
    InMemoryAdapter
  });
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis));

