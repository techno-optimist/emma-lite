// js/memories-hml-init.js
// Initializes HML Sync on the memories page in a CSP-compliant way

// Desktop shim
// eslint-disable-next-line no-unused-vars
const chrome = (typeof window !== 'undefined' && (window.chromeShim || window.chrome)) || undefined;

async function initializeHMLSyncForMemoriesPage() {
  try {
    // Check if already initialized globally
    if (window.hmlSync?.manager) return;

    // Import HML components lazily
    const { P2PManager } = await import('./p2p/p2p-manager.js');
    const { BulletinBoardManager } = await import('./p2p/bulletin-board.js');
    await import('./emma-unified-intelligence.js');

    // Load identity
    const result = chrome && chrome.storage && chrome.storage.local
      ? await chrome.storage.local.get(['emma_my_identity', 'emma_monitored_peers', 'emma_vault_registry'])
      : {};
    const myIdentity = result.emma_my_identity;
    const peers = result.emma_monitored_peers || [];

    if (!myIdentity) {
      console.log('[HML] No identity found, HML Sync not initialized on memories page');
      return;
    }

    // Initialize bulletin board and P2P manager
    const bulletinBoard = new BulletinBoardManager({ useMock: false });
    const p2pManager = new P2PManager(bulletinBoard);

    // Initialize manager
    await p2pManager.initialize(myIdentity);

    // Expose globally for other scripts
    window.hmlSync = {
      manager: p2pManager,
      initialized: true
    };

    // Restore monitored peers
    for (const fp of peers) {
      try { await p2pManager.addPeerToMonitor(fp); } catch {}
    }

    // Populate vault filter options (always show, populate with shared vaults if available)
    try {
      const vaultFilterEl = document.getElementById('vault-filter');
      const reg = result.emma_vault_registry || { vaults: [] };
      if (vaultFilterEl) {
        // Always show the filter, populate with shared vaults if available
        const prev = vaultFilterEl.value || 'current';
        vaultFilterEl.innerHTML = '<option value="current">My Vault</option>' +
          (reg.vaults && reg.vaults.length > 0 ? 
            reg.vaults.map(v => `<option value="${v.id}">Shared: ${v.name || 'Vault'}</option>`).join('') : 
            '');
        vaultFilterEl.value = prev;
        console.log('[HML] Vault filter populated with', reg.vaults ? reg.vaults.length : 0, 'shared vaults');
      }
    } catch (e) {
      console.warn('[HML] Failed to populate vault filter:', e);
    }

    console.log('[HML] Sync initialized for memories page');
  } catch (error) {
    console.error('[HML] Failed to initialize HML Sync on memories page:', error);
    window.hmlSync = { manager: null, initialized: false };
  }
}

// Kick off on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeHMLSyncForMemoriesPage);
} else {
  initializeHMLSyncForMemoriesPage();
}

// Expose a small vault API to classic scripts (for shared vault filtering)
(async () => {
  try {
    const mod = await import('../lib/vault-storage.js');
    const { vaultStorage } = mod;
    window.vaultApi = {
      async listMemoriesForVault(vaultId, limit = 200) {
        try {
          const res = await vaultStorage.listMemories(limit, vaultId);
          // Map MTAP memories to simple format expected by UI
          const items = (res && res.items) ? res.items.map(h => ({
            id: h.header?.id || h.id,
            content: h.core?.content || h.header?.title || '(Encrypted Capsule)',
            timestamp: h.header?.created || h.ts || Date.now(),
            role: h.core?.role || 'assistant',
            source: h.metadata?.source || 'unknown',
            vaultId
          })) : [];
          return { success: true, items };
        } catch (e) {
          console.warn('[VaultAPI] listMemoriesForVault failed:', e);
          return { success: false, items: [], error: e.message };
        }
      },
      async getAccessibleVaults() {
        try {
          const s = await chrome.storage.local.get(['emma_shared_vaults', 'emma_vault_registry']);
          const shared = s.emma_shared_vaults || {};
          const reg = s.emma_vault_registry || { vaults: [] };
          const vaults = (reg.vaults || []).map(v => ({ id: v.id, name: v.name || 'Shared Vault' }));
          // Ensure all shared vaults are present
          for (const vid of Object.keys(shared)) {
            if (!vaults.find(v => v.id === vid)) {
              vaults.push({ id: vid, name: shared[vid].name || 'Shared Vault' });
            }
          }
          return vaults;
        } catch { return []; }
      }
    };
  } catch (e) {
    console.warn('[VaultAPI] unavailable:', e);
  }
})();


