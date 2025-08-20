'use strict';

(function(global){
  class CryptoWorkerClient {
    constructor(workerUrl) {
      this._worker = new Worker(workerUrl, { type: 'module' });
      this._nextId = 1;
      this._pending = new Map();
      this._worker.onmessage = (e) => {
        const { id, ok, result, error } = e.data || {};
        const pending = this._pending.get(id);
        if (!pending) return;
        this._pending.delete(id);
        ok ? pending.resolve(result) : pending.reject(new Error(error || 'Worker error'));
      };
    }
    _call(op, payload, transfer = []) {
      const id = this._nextId++;
      const p = new Promise((resolve, reject) => this._pending.set(id, { resolve, reject }));
      this._worker.postMessage({ id, op, payload }, transfer);
      return p;
    }
    pbkdf2(passphrase, salt, iterations) { return this._call('pbkdf2', { passphrase, salt, iterations }); }
    encrypt(key, plaintext) { return this._call('encrypt', { key, plaintext }); }
    decrypt(key, iv, ciphertext) { return this._call('decrypt', { key, iv, ciphertext }); }
    profilePBKDF2(passphrase, salt, iterations) { return this._call('profilePBKDF2', { passphrase, salt, iterations }); }
  }

  global.EmmaCryptoWorkerClient = CryptoWorkerClient;
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis));

