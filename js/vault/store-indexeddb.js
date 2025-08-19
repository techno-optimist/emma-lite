// js/vault/store-indexeddb.js - IndexedDB-backed encrypted store

const DB_NAME = 'EmmaVaultDB';
const DB_VERSION = 1;

export class IndexedDBVaultStore {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;
    this.db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('log')) {
          db.createObjectStore('log', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('blobs')) {
          db.createObjectStore('blobs', { keyPath: 'cid' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.db;
  }

  async putLog(entry) {
    const db = await this.init();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['log'], 'readwrite');
      tx.objectStore('log').put(entry);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async listLog(limit = 100, cursorAfterTs = 0) {
    const db = await this.init();
    const items = [];
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['log'], 'readonly');
      const store = tx.objectStore('log');
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const val = cursor.value;
          if (val.ts > cursorAfterTs) items.push(val);
          if (items.length >= limit) { resolve(); return; }
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
    // sort newest first
    items.sort((a, b) => b.ts - a.ts);
    return items;
  }

  async putBlob(cid, dataBytes) {
    const db = await this.init();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['blobs'], 'readwrite');
      tx.objectStore('blobs').put({ cid, data: dataBytes });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async getBlob(cid) {
    const db = await this.init();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(['blobs'], 'readonly');
      const req = tx.objectStore('blobs').get(cid);
      req.onsuccess = () => resolve(req.result ? new Uint8Array(req.result.data) : null);
      req.onerror = () => reject(req.error);
    });
  }
}


