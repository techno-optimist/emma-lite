// js/vault/service.js - Background VaultService API
import { Keyring, SETTINGS_KEY } from './keyring.js';
import { IndexedDBVaultStore } from './store-indexeddb.js';
import { utf8ToBytes, bytesToUtf8, encryptWithKey, decryptWithKey, generateRandomBytes, bytesToBase64 } from './crypto.js';

const keyring = new Keyring();
const store = new IndexedDBVaultStore();

function hashBytesSHA256(bytes) {
  return crypto.subtle.digest('SHA-256', bytes).then(buf => {
    const arr = new Uint8Array(buf);
    return bytesToBase64(arr);
  });
}

export const VaultService = {
  // Expose the keyring instance for VaultManager to use
  getKeyring() {
    return keyring;
  },
  
  async initialize() {
    // Ensure baseline settings and store are initialized
    const settings = await keyring.ensureSettings();
    // Touch the store to ensure IDB is opened at least once
    try { await store.listLog(1); } catch {}
    
    // If no verifier persisted yet, create and persist using a temporary derived key
    try {
      if (!settings.verifier) {
        // We cannot derive without user passphrase here. Verifier will be set during first unlock.
        // Leave as-is; unlock() will populate it on success.
      }
    } catch {}
    return { success: true };
  },
  async status() {
    const unlocked = await keyring.isUnlocked();
    return { success: true, unlocked };
  },
  async isUnlocked() {
    const s = await this.status();
    return s.unlocked === true;
  },
  async unlock(passphrase) {
    await keyring.unlockWithPassphrase(passphrase);
    // After a successful unlock, ensure a verifier is stored to validate future unlocks
    try {
      const current = await chrome.storage.local.get([SETTINGS_KEY]);
      const settings = current[SETTINGS_KEY] || (await keyring.ensureSettings());
      if (!settings.verifier) {
        console.log('🔐 VaultService: Creating new verifier...');
        const { iv, ciphertext } = await encryptWithKey(keyring.masterKey, utf8ToBytes('emma:verifier:v1'));
        settings.verifier = { iv: Array.from(iv), data: Array.from(ciphertext) };
        console.log('🔐 VaultService: Verifier created', {
          ivLength: iv.length,
          ciphertextLength: ciphertext.length,
          ivArrayLength: settings.verifier.iv.length,
          dataArrayLength: settings.verifier.data.length
        });
        await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
        console.log('🔐 VaultService: Verifier saved to storage');
      } else {
        console.log('🔐 VaultService: Verifier already exists, skipping creation');
      }
      // Persist last-unlocked timestamp for UX and session logic
      await chrome.storage.local.set({ emma_vault_unlocked_at: Date.now() });
      // Broadcast unlocked event
      try { await chrome.runtime.sendMessage({ action: 'vault.unlocked' }).catch(() => {}); } catch {}
    } catch {}
    return { success: true };
  },
  async lock() {
    await keyring.lock();
    return { success: true };
  },
  async createCapsule(payload) {
    if (!(await keyring.isUnlocked())) {
      return { success: false, error: 'Vault locked' };
    }

    const headerObj = {
      title: payload.metadata?.title || (payload.content?.slice(0, 80) || 'Memory'),
      ts: payload.metadata?.timestamp || Date.now(),
      role: payload.role || 'assistant',
      source: payload.source || 'unknown',
      type: payload.type || 'conversation'
    };

    const contentBytes = utf8ToBytes(payload.content || '');
    const { iv: contentIv, ciphertext: contentCipher } = await encryptWithKey(keyring.masterKey, contentBytes);
    const headerBytes = utf8ToBytes(JSON.stringify(headerObj));
    const { iv: headerIv, ciphertext: headerCipher } = await encryptWithKey(keyring.masterKey, headerBytes);

    const cid = await hashBytesSHA256(contentCipher);
    const id = `cap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const logEntry = {
      id,
      ts: headerObj.ts,
      type: 'create',
      header: { iv: Array.from(headerIv), data: Array.from(headerCipher) }, // store as arrays for IDB
      blob: { iv: Array.from(contentIv), cid },
    };

    await store.putBlob(cid, contentCipher);
    await store.putLog(logEntry);

    return { success: true, id };
  },
  async listCapsules(limit = 50) {
    const entries = await store.listLog(limit);
    // Note: do not decrypt full content here; decrypt headers only
    const headers = [];
    for (const e of entries) {
      try {
        const headerBytes = new Uint8Array(e.header.data);
        const iv = new Uint8Array(e.header.iv);
        const plain = await decryptWithKey(keyring.masterKey, iv, headerBytes);
        const meta = JSON.parse(bytesToUtf8(plain));
        headers.push({ id: e.id, ts: e.ts, ...meta });
      } catch {
        headers.push({ id: e.id, ts: e.ts, title: 'Locked', error: true });
      }
    }
    return { success: true, items: headers };
  },
  async getCapsuleContent(id) {
    const entries = await store.listLog(5000); // simple scan for beta
    const entry = entries.find(e => e.id === id);
    if (!entry) return { success: false, error: 'Not found' };
    const blob = await store.getBlob(entry.blob.cid);
    const iv = new Uint8Array(entry.blob.iv);
    const plain = await decryptWithKey(keyring.masterKey, iv, blob);
    return { success: true, content: bytesToUtf8(plain) };
  },
  async stats() {
    const entries = await store.listLog(10000);
    return { success: true, stats: { totalMemories: entries.length } };
  }
};

// Note: Message handlers moved to VaultManager in js/background.js
// This function is kept for backward compatibility but handlers are disabled
export function registerVaultMessageHandlers() {
  console.log('🔐 VaultService: Legacy message handlers disabled - using VaultManager');
  // Handlers moved to VaultManager to prevent conflicts
}


