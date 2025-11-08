// js/memories.js - External JavaScript for memory gallery
// Desktop shim: prefer Electron bridge if available
// eslint-disable-next-line no-unused-vars
const chrome = (typeof window !== 'undefined' && (window.chromeShim || window.chrome)) || undefined;

console.log('🔥🔥🔥 CACHE BUST DEBUG: memories.js RELOADED at', new Date().toISOString());

// Timer manager will be loaded dynamically to avoid module errors
let timerManager = null;

let emmaChatLoaderPromise = null;

function resolveEmmaChatScriptUrl() {
  const existing = document.querySelector('script[src*="emma-chat-experience.js"]');
  if (existing && existing.src) {
    return existing.src;
  }

  try {
    return new URL('../js/emma-chat-experience.js', window.location.href).href;
  } catch (_) {
    return new URL('js/emma-chat-experience.js', window.location.href).href;
  }
}

function ensureEmmaChatExperienceLoaded() {
  if (typeof EmmaChatExperience !== 'undefined') {
    return Promise.resolve();
  }

  if (emmaChatLoaderPromise) {
    return emmaChatLoaderPromise;
  }

  emmaChatLoaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="emma-chat-experience.js"]');
    if (existing) {
      const isLoaded = existing.dataset.loaded === 'true' || existing.readyState === 'complete' || existing.readyState === 'loaded';
      if (isLoaded) {
        resolve();
        return;
      }

      existing.addEventListener('load', () => {
        existing.dataset.loaded = 'true';
        resolve();
      }, { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load EmmaChatExperience script')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = resolveEmmaChatScriptUrl();
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load EmmaChatExperience script'));
    document.head.appendChild(script);
  }).finally(() => {
    emmaChatLoaderPromise = null;
  });

  return emmaChatLoaderPromise;
}

// Create a simple timer manager for this context
const simpleTimerManager = {
  timers: new Set(),
  setTimeout(callback, delay, context = 'unknown') {
    const id = setTimeout(async () => {
      try {
        callback();
      } catch (error) {
        console.error('Timer error:', error);
      } finally {
        this.timers.delete(id);
      }
    }, delay);
    this.timers.add(id);
    return id;
  },
  clearAll() {
    for (const id of this.timers) {
      clearTimeout(id);
    }
    this.timers.clear();

  }
};

// ✅ PERFORMANCE: Global cleanup for events and timers
const globalAbortController = new AbortController();

// Clean up everything when page unloads
window.addEventListener('beforeunload', () => {

  // Clear all timers
  simpleTimerManager.clearAll();

  // Abort all event listeners
  globalAbortController.abort();

  // Clean up constellation canvas if active
  if (window.constellationCleanup) {
    window.constellationCleanup();
  }

}, { signal: globalAbortController.signal });

let allMemories = [];
let filteredMemories = [];
let currentVaultFilter = 'current'; // 'current' or specific vaultId
let currentOffset = 0;
let hasMoreMemories = true;
let isLoadingMore = false;
const isDesktopVault = typeof window !== 'undefined' && window.emma && window.emma.vault;

// Ensure floating orb exists on this page without inline scripts
(function ensureFloatingOrb(){
  try {
    if (!document.getElementById('emma-floating-orb')) {
      const host = document.createElement('div');
      host.id = 'emma-floating-orb';
      host.style.position = 'fixed';
      host.style.right = '16px';
      host.style.bottom = '16px';
      host.style.width = '72px';
      host.style.height = '72px';
      host.style.borderRadius = '50%';
      host.style.zIndex = '9999';
      document.body.appendChild(host);
    }
    if (window.EmmaOrb && !window.__emmaFloatingOrb) {
      try { window.__emmaFloatingOrb = new EmmaOrb(document.getElementById('emma-floating-orb'), { hue: 270, hoverIntensity: 0.35 }); } catch {}
    }
  } catch {}
})();

async function ensureVaultReady(vaultBanner) {
  if (!isDesktopVault) return true;
    try {
      // CRITICAL FIX: Use new extension FSM system instead of VaultGuardian
      const vaultUnlocked = localStorage.getItem('emmaVaultActive') === 'true' ||
                           sessionStorage.getItem('emmaVaultActive') === 'true' ||
                           (window.currentVaultStatus && window.currentVaultStatus.isUnlocked);

      if (vaultUnlocked) {

        return true;
      }

    // Create overlay modal
    const overlay = document.createElement('div');
    overlay.className = 'emma-onboarding-overlay';
    overlay.innerHTML = `
      <div class="emma-onboarding-modal">
        <div class="onboarding-header">
          <div class="orb"></div>
          <h2>Create your Memory Vault</h2>
          <p>Emma protects your memories with end‑to‑end encryption.</p>
        </div>
        <div class="onboarding-body">
          <div class="tab create-tab">
            <label>Vault name</label>
            <input id="emma-vault-name" type="text" placeholder="My Vault" />
            <label>Passphrase</label>
            <input id="emma-vault-pass" type="password" placeholder="••••••••" />
            <label>Confirm passphrase</label>
            <input id="emma-vault-pass2" type="password" placeholder="••••••••" />
            <button id="emma-create-vault" class="btn-primary">Create Secure Vault</button>
          </div>
          <div class="divider"><span>or</span></div>
          <div class="tab unlock-tab">
            <label>Unlock existing vault</label>
            <input id="emma-unlock-pass" type="password" placeholder="Passphrase" />
            <button id="emma-unlock-vault" class="btn-secondary">Unlock Vault</button>
          </div>
          <div class="divider"><span>or</span></div>
          <div class="tab new-tab">
            <button id="emma-create-new" class="btn-secondary danger">Create New Vault</button>
            <div class="hint">Creates a fresh vault. Your previous vault remains in the database.</div>
          </div>
        </div>
        <div class="onboarding-footer">Dedicated to Debbe — protecting what matters most.</div>
      </div>`;
    document.body.appendChild(overlay);

    (function setupOverlay(){
      const byId = (id) => overlay.querySelector(id);
      const nameEl = byId('#emma-vault-name');
      const p1 = byId('#emma-vault-pass');
      const p2 = byId('#emma-vault-pass2');
      const pUnlock = byId('#emma-unlock-pass');
      const createBtn = byId('#emma-create-vault');
      const unlockBtn = byId('#emma-unlock-vault');

      // If a vault already exists, hide create UI and switch copy
      (async () => {
        try {
          // CRITICAL FIX: Use new extension FSM system
          const vaultUnlocked = localStorage.getItem('emmaVaultActive') === 'true' ||
                               sessionStorage.getItem('emmaVaultActive') === 'true' ||
                               (window.currentVaultStatus && window.currentVaultStatus.isUnlocked);

          if (!vaultUnlocked) {
            const createTab = overlay.querySelector('.create-tab');
            if (createTab) createTab.style.display = 'none';
            const titleEl = overlay.querySelector('.onboarding-header h2');
            if (titleEl) titleEl.textContent = 'Unlock your Memory Vault';
          }
        } catch {}
      })();

      createBtn.addEventListener('click', async () => {
        const name = (nameEl.value || 'My Vault').trim();
        const pass = p1.value;
        if (!pass || pass !== p2.value) {
          createBtn.textContent = 'Passphrases do not match';
          setTimeout(() => (createBtn.textContent = 'Create Secure Vault'), 1500);
          return;
        }
        createBtn.disabled = true;
        createBtn.textContent = 'Creating…';
        try {
          const res = await window.emma.vault.initialize({ passphrase: pass, name });
          if (res && res.success && res.vaultId) {
            await window.emma.vault.setCurrent(res.vaultId);
            overlay.remove();
            if (vaultBanner) {
              vaultBanner.style.display = 'block';
              vaultBanner.style.background = 'rgba(16,185,129,0.15)';
              vaultBanner.style.border = '1px solid rgba(16,185,129,0.3)';
              vaultBanner.textContent = '🔐 Vault created and unlocked';
            }
            // continue; UI already loaded
          } else {
            createBtn.textContent = 'Failed. Try again';
            createBtn.disabled = false;
          }
        } catch (e) {
          createBtn.textContent = 'Error. Try again';
          createBtn.disabled = false;
        }
      });

      unlockBtn.addEventListener('click', async () => {
        const pass = pUnlock.value;
        if (!pass) return;
        unlockBtn.disabled = true;
        unlockBtn.textContent = 'Unlocking…';
        try {
          // Pass the vaultId from status if available
          const unlockParams = { passphrase: pass };
          if (status && status.vaultId) {
            unlockParams.vaultId = status.vaultId;
          }
          const res = await window.emma.vault.unlock(unlockParams);
          if (res && res.success) {
            overlay.remove();
            if (vaultBanner) {
              vaultBanner.style.display = 'block';
              vaultBanner.style.background = 'rgba(16,185,129,0.15)';
              vaultBanner.style.border = '1px solid rgba(16,185,129,0.3)';
              vaultBanner.textContent = '🔓 Vault unlocked';
            }
            // continue; UI already loaded
          } else {
            unlockBtn.textContent = 'Failed. Try again';
            unlockBtn.disabled = false;
          }
        } catch (e) {
          console.error('[Vault] Unlock error:', e);
          unlockBtn.textContent = 'Error. Try again';
          unlockBtn.disabled = false;
        }
      });

      const createNewBtn = byId('#emma-create-new');
      if (createNewBtn) {
        createNewBtn.addEventListener('click', async () => {
          openVaultSetupWizard({ onSuccess: async (res) => {
            try {
              if (res && res.vaultId) {
                await window.emma.vault.setCurrent(res.vaultId);
              }
              overlay.remove();
              if (vaultBanner) {
                vaultBanner.style.display = 'block';
                vaultBanner.style.background = 'rgba(16,185,129,0.15)';
                vaultBanner.style.border = '1px solid rgba(16,185,129,0.3)';
                vaultBanner.textContent = '🔐 New vault created and unlocked';
              }
              try { await loadMemories(); } catch {}
            } catch {}
          }});
        });
      }
    })();
    return true;
  } catch (e) {
    return false;
  }
}

// Guided vault setup modal
function openVaultSetupWizard({ onSuccess } = {}) {
  const modal = document.createElement('div');
  modal.className = 'emma-onboarding-overlay';
  modal.innerHTML = `
    <div class="emma-onboarding-modal">
      <div class="onboarding-header">
        <div class="orb"></div>
        <h2>Set up your Memory Vault</h2>
        <p>Choose a name and secure passphrase. This encrypts your memories end‑to‑end.</p>
      </div>
      <div class="onboarding-body">
        <label>Vault name</label>
        <input id="wizard-name" type="text" placeholder="My Vault" />
        <label>Passphrase</label>
        <input id="wizard-pass1" type="password" placeholder="••••••••" />
        <label>Confirm passphrase</label>
        <input id="wizard-pass2" type="password" placeholder="••••••••" />
        <div class="hint">Tip: use a short phrase you’ll remember. You can add recovery guardians later.</div>
        <div class="wizard-actions">
          <button id="wizard-cancel" class="btn-secondary">Cancel</button>
          <button id="wizard-create" class="btn-primary">Create Vault</button>
        </div>
        <div id="wizard-status" class="vault-status-compact" style="margin-top:8px;"></div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const byId = (id) => modal.querySelector(id);
  const nameEl = byId('#wizard-name');
  const p1 = byId('#wizard-pass1');
  const p2 = byId('#wizard-pass2');
  const cancel = byId('#wizard-cancel');
  const create = byId('#wizard-create');
  const status = byId('#wizard-status');

  cancel.onclick = () => modal.remove();
  create.onclick = async () => {
    const name = (nameEl.value || 'My Vault').trim();
    const passA = p1.value.trim();
    const passB = p2.value.trim();
    if (passA.length < 6) { status.textContent = 'Passphrase must be at least 6 characters'; return; }
    if (passA !== passB) { status.textContent = 'Passphrases do not match'; return; }
    create.disabled = true; create.textContent = 'Creating…'; status.textContent = '';
    try {
      const res = await window.emma.vault.initialize({ passphrase: passA, name });
      if (!res || !res.success) throw new Error(res?.error || 'Unknown error');
      modal.remove();
      if (typeof onSuccess === 'function') onSuccess(res);
    } catch (e) {
      status.textContent = `Failed to create vault: ${e.message || e}`;
      create.disabled = false; create.textContent = 'Create Vault';
    }
  };
}

async function loadMemories() {
  const container = document.getElementById('memory-grid');
  const emptyState = document.getElementById('empty-state');
  const vaultBanner = document.getElementById('vault-banner');
  const vaultFilterEl = document.getElementById('vault-filter');

  try {
    // Show loading state
    container.innerHTML = `
      <div class="loading-gallery">
        <div class="loading-capsule">
          <div class="loading-header"></div>
          <div class="loading-content">
            <div class="loading-line"></div>
            <div class="loading-line"></div>
            <div class="loading-line"></div>
          </div>
        </div>
        <div class="loading-capsule">
          <div class="loading-header"></div>
          <div class="loading-content">
            <div class="loading-line"></div>
            <div class="loading-line"></div>
            <div class="loading-line"></div>
          </div>
        </div>
        <div class="loading-capsule">
          <div class="loading-header"></div>
          <div class="loading-content">
            <div class="loading-line"></div>
            <div class="loading-line"></div>
            <div class="loading-line"></div>
          </div>
        </div>
      </div>
    `;

    // VaultGuardian will check status in the next section - no redundant calls needed

    // Always handle vault filter if present, populate with shared vaults if available
    try {
      if (vaultFilterEl) {
        // Try to get accessible vaults
        let vaults = [];
        if (window.vaultApi?.getAccessibleVaults) {
          vaults = await window.vaultApi.getAccessibleVaults() || [];
        }

        // Always populate the filter (shows "My Vault" at minimum)
        const prev = vaultFilterEl.value || 'current';
        vaultFilterEl.innerHTML = '<option value="current">My Vault</option>' +
          (vaults.length > 0 ? vaults.map(v => `<option value="${v.id}">Shared: ${v.name}</option>`).join('') : '');
        vaultFilterEl.value = prev;
        currentVaultFilter = vaultFilterEl.value || 'current';

        // Attach change listener once
        if (!vaultFilterEl.dataset.bound) {
          vaultFilterEl.addEventListener('change', async (e) => {
            currentVaultFilter = e.target.value;
            await loadMemories();
          });
          vaultFilterEl.dataset.bound = '1';
        }

      }
    } catch (e) {
      console.warn('Failed to populate vault filter:', e);
    }

    // ✅ VAULT-ONLY ACCESS - Single source of truth via VaultGuardian

    try {
      // Use EmmaWebVault instead of legacy VaultGuardian
      if (!window.emmaWebVault || !window.emmaWebVault.isOpen) {
        console.warn('🔸 EmmaWebVault not available for vault status');
        return { available: false, reason: 'Vault not unlocked' };
      }

      // Get vault status from EmmaWebVault (already checked above)

      // CRITICAL FIX: Check vault status using new extension FSM system
      const vaultUnlocked = localStorage.getItem('emmaVaultActive') === 'true' ||
                           sessionStorage.getItem('emmaVaultActive') === 'true' ||
                           (window.currentVaultStatus && window.currentVaultStatus.isUnlocked);

      if (!vaultUnlocked) {

        // Vault banner hidden - user can see lock status in header
        if (vaultBanner) {
          vaultBanner.style.display = 'none';
        }
        showEmptyState();
        const emptyMessageText = document.getElementById('empty-message-text');
        if (emptyMessageText) {
          emptyMessageText.textContent = 'No memories found. Create your first memory to get started.';
        }
        return;
      }

      // Reset pagination state for fresh load
      currentOffset = 0;
      hasMoreMemories = true;
      isLoadingMore = false;

      // Load memories from vault only - NO FALLBACKS
      const response = isDesktopVault
        ? await window.emma.vault.listCapsules({ limit: 50, offset: currentOffset })
        : await chrome.runtime.sendMessage({ action: 'vault.listCapsules', limit: 50, offset: currentOffset });

      const items = Array.isArray(response) ? response : (response && response.items) ? response.items : [];
      const memories = Array.isArray(items) ? items.map(it => ({
        id: it.id,
        title: it.title,
        timestamp: it.ts,
        source: it.source,
        _attachmentCount: it.attachmentCount,
        _previewThumb: it.previewThumb
      })) : [];

      allMemories = memories;
      await enrichMemoriesWithAttachments(allMemories);
      filteredMemories = [...allMemories];

      // Update pagination state
      currentOffset = allMemories.length;
      hasMoreMemories = memories.length === 50; // Has more if we got a full page

      if (allMemories.length > 0) {
        displayMemories(filteredMemories);
        updateResultsCount();

        // Add load more button if there are more memories
        addLoadMoreButton();

        // Update banner to show vault success
        if (vaultBanner) {
          vaultBanner.style.display = 'block';
          vaultBanner.style.background = 'rgba(16,185,129,0.15)';
          vaultBanner.style.border = '1px solid rgba(16,185,129,0.3)';
          vaultBanner.textContent = `🛡️ Vault Guardian · ${allMemories.length} memories loaded${hasMoreMemories ? ' (more available)' : ''}`;
        }

        console.log(`✅ VaultGuardian: Loaded ${allMemories.length} memories (hasMore: ${hasMoreMemories})`);
      } else {
        showEmptyState();

        if (vaultBanner) {
          vaultBanner.style.display = 'block';
          vaultBanner.style.background = 'rgba(16,185,129,0.15)';
          vaultBanner.style.border = '1px solid rgba(16,185,129,0.3)';
          vaultBanner.textContent = '🛡️ Vault Guardian · Ready to store memories';
        }
      }

    } catch (error) {
      console.error('🚨 VaultGuardian access failed:', error);

      // Show error state
      if (vaultBanner) {
        vaultBanner.style.display = 'block';
        vaultBanner.style.background = 'rgba(239,68,68,0.15)';
        vaultBanner.style.border = '1px solid rgba(239,68,68,0.3)';
        vaultBanner.textContent = '⚠️ Vault Error · Check vault status';
      }

      showEmptyState();
      const emptyMessageText = document.getElementById('empty-message-text');
      if (emptyMessageText) {
        emptyMessageText.textContent = 'Unable to load memories from vault. Check vault status.';
      }
    }
  } catch (error) {
    console.error('🧠 Failed to load memories:', error);
    container.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Failed to load memories</h3>
        <p>${error.message}</p>
        <button onclick="loadMemories()" class="btn-secondary">Try Again</button>
      </div>
    `;
  }
}

// ✅ PERFORMANCE: Load More Functionality
async function loadMoreMemories() {
  if (isLoadingMore || !hasMoreMemories) return;

  isLoadingMore = true;
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.textContent = 'Loading...';
    loadMoreBtn.disabled = true;
  }

  try {

    const response = await Promise.race([
      chrome.runtime.sendMessage({ action: 'getAllMemories', limit: 50, offset: currentOffset }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Load more timeout')), 5000))
    ]);

    if (response && response.success && Array.isArray(response.memories)) {
      const newMemories = response.memories;

      if (newMemories.length > 0) {
        // Append new memories to existing ones
        allMemories = [...allMemories, ...newMemories];
        await enrichMemoriesWithAttachments(newMemories); // Only enrich new ones
        filteredMemories = [...allMemories];

        // Update pagination state
        currentOffset += newMemories.length;
        hasMoreMemories = newMemories.length === 50;

        // Re-render all memories
        displayMemories(filteredMemories);
        updateResultsCount();

        console.log(`✅ MTAP: Loaded ${newMemories.length} additional memories (total: ${allMemories.length})`);
      } else {
        hasMoreMemories = false;

      }

      // Update load more button
      updateLoadMoreButton();
    }
  } catch (error) {
    console.error('🚨 Failed to load more memories:', error);
    if (loadMoreBtn) {
      loadMoreBtn.textContent = 'Load More Failed - Retry';
      loadMoreBtn.disabled = false;
    }
  } finally {
    isLoadingMore = false;
  }
}

function addLoadMoreButton() {
  // Remove existing button if present
  const existingBtn = document.getElementById('load-more-btn');
  if (existingBtn) existingBtn.remove();

  if (!hasMoreMemories) return;

  const container = document.getElementById('memory-grid');
  const loadMoreContainer = document.createElement('div');
  loadMoreContainer.className = 'load-more-container';
  loadMoreContainer.style.cssText = `
    display: flex;
    justify-content: center;
    margin: 32px 0;
    grid-column: 1 / -1;
  `;

  const loadMoreBtn = document.createElement('button');
  loadMoreBtn.id = 'load-more-btn';
  loadMoreBtn.className = 'btn-secondary';
  loadMoreBtn.textContent = `Load More Memories`;
  loadMoreBtn.style.cssText = `
    padding: 12px 24px;
    font-size: 14px;
    border-radius: 12px;
    transition: all 0.2s ease;
  `;

  loadMoreBtn.addEventListener('click', loadMoreMemories);
  loadMoreContainer.appendChild(loadMoreBtn);
  container.appendChild(loadMoreContainer);
}

function updateLoadMoreButton() {
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (!loadMoreBtn) return;

  if (hasMoreMemories) {
    loadMoreBtn.textContent = `Load More Memories`;
    loadMoreBtn.disabled = false;
  } else {
    loadMoreBtn.style.display = 'none';
  }
}

// Listen for background refresh signals when new memories are created
if (chrome && chrome.runtime && chrome.runtime.onMessage) {
  try {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.action === 'memories.refresh') {
        try { loadMemories(); } catch {}
      }
    });
  } catch {}
}

// Handle memory card actions with event delegation (CSP-compliant)
function handleMemoryActions(event) {
  const deleteBtn = event.target.closest('.delete-memory-btn');
  if (deleteBtn) {
    event.preventDefault();
    event.stopPropagation();
    const memoryId = deleteBtn.getAttribute('data-memory-id');

    if (memoryId) {
      deleteMemory(memoryId);
    }
    return;
  }
}

async function displayMemories(memories) {
  const container = document.getElementById('memory-grid');
  const emptyState = document.getElementById('empty-state');

  if (memories.length === 0) {
    showEmptyState();
    return;
  }

  // Hide empty state
  emptyState.classList.add('hidden');

  const sortedMemories = memories.sort((a, b) => b.timestamp - a.timestamp);
  // Apply title/content overrides if present
  try {
    const overrides = await chrome.storage.local.get(['emma_memory_overrides']);
    const map = overrides.emma_memory_overrides || {};
    sortedMemories.forEach(m => {
      if (map[m.id]) {
        if (map[m.id].title) m.title = map[m.id].title;
        if (map[m.id].content) m.content = map[m.id].content;
      }
    });
  } catch {}

  container.innerHTML = sortedMemories.map(memory => createMemoryCapsule(memory)).join('');

  // Add CSP-compliant event delegation for delete buttons
  container.removeEventListener('click', handleMemoryActions); // Remove existing listener
  container.addEventListener('click', handleMemoryActions);

  // Add click handlers for memory cards
  container.querySelectorAll('.memory-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't open detail if clicking on action buttons
      if (e.target.closest('.memory-action-btn')) {
        return;
      }
      const memoryId = card.dataset.id;
      openMemoryDetail(memoryId);
    });
  });
}

// Fetch first attachment thumbnail for each memory to use as card background
async function enrichMemoriesWithAttachments(memories) {
  try {
    const limited = memories.slice(0, 60); // avoid excessive calls
    await Promise.all(limited.map(async (m) => {
      try {
        if (isDesktopVault) {
          // Desktop: pull thumb from stored metadata via dedicated endpoint when available (future)
          // For now, rely on persisted meta in listCapsules (extension point)
        } else if (Array.isArray(m.attachments) && m.attachments.length) {
          // Fallback for simplified storage where attachments are embedded on the capsule
          m._attachmentCount = m.attachments.length;
          const first = m.attachments[0];
          if (first && (first.src || first.sourceUrl || first.url)) {
            m._previewThumb = first.src || first.sourceUrl || first.url; // may be remote URL
          }
        }
      } catch {}
    }));
  } catch {}
}

function createMemoryCapsule(memory) {
  const timeAgo = getTimeAgo(new Date(memory.timestamp));

  // Handle conversation capsules vs individual memories
  let displayTitle, displayContent, messageCount = 0, totalChars = 0;

  if (memory.type === 'conversation' && memory.messages) {
    displayTitle = memory.title || memory.metadata?.title || `Conversation (${memory.messages?.length || 0} messages)`;
    messageCount = memory.messageCount || memory.messages.length;

    // Show preview of first message
    const firstMessage = memory.messages[0];
    displayContent = firstMessage ? firstMessage.content : 'No content';

    // Calculate total character count for all messages
    totalChars = memory.messages.reduce((total, msg) => total + (msg.content ? msg.content.length : 0), 0);
  } else {
    displayTitle = memory.title || memory.metadata?.title || 'Untitled Memory';
    displayContent = memory.content || 'No content';
    totalChars = displayContent.length;
  }

  const preview = displayContent ? escapeHtml(displayContent.substring(0, 200)) : 'No content';
  const platform = memory.metadata?.platform || memory.source || 'unknown';

  const attachmentCount = memory._attachmentCount || memory.attachmentCount || (Array.isArray(memory.attachments) ? memory.attachments.length : 0);
  const bgStyle = memory._previewThumb ? `style=\"background-image:url('${memory._previewThumb}'); background-size:cover; background-position:center;\"` : '';
  return `
    <div class="memory-card" data-id="${memory.id}">
      <div class="memory-card-header" ${bgStyle}>
        <div class="memory-category">${memory.type || 'note'}</div>
        <div class="memory-actions">
          <button class="memory-action-btn delete-memory-btn" data-memory-id="${memory.id}" title="Delete">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
        </div>
        ${memory._previewThumb ? '' : `<div class="memory-icon">${memory.type === 'conversation' ? '💬' : '📝'}</div>`}
        ${attachmentCount ? `<div class="memory-badge">🖼️ ${attachmentCount}</div>` : ''}
      </div>

      <div class="memory-card-content">
        <h3 class="memory-title">${escapeHtml(displayTitle)}</h3>
        <p class="memory-description">
          ${preview}${displayContent.length > 200 ? '...' : ''}
        </p>
        <div class="memory-meta">
          <span class="memory-date">${timeAgo}</span>
          <span class="memory-stats">
            ${messageCount > 0 ? `${messageCount} messages • ` : ''}${getSourceName(platform)}
          </span>
        </div>
      </div>
    </div>
  `;
}

// Get friendly source name
function getSourceName(source) {
  const sourceMap = {
    'claude': 'Claude',
    'chatgpt': 'ChatGPT',
    'selection': 'Text Selection',
    'test': 'Test Data'
  };
  return sourceMap[source] || 'Unknown';
}

function getSourceIcon(source) {
  const icons = {
    claude: '🤖',
    chatgpt: '💬',
    selection: '✨',
    unknown: '📝'
  };
  return icons[source] || '📝';
}

function showEmptyState() {
  const container = document.getElementById('memory-grid');
  const emptyState = document.getElementById('empty-state');

  // Hide the grid content and show empty state
  container.innerHTML = '';
  emptyState.classList.remove('hidden');

  // Update empty state message
  const emptyMessageText = document.getElementById('empty-message-text');
  if (emptyMessageText) {
    emptyMessageText.textContent = 'Start creating your first memory capsule';
  }
}

// Generate sample memories for testing
async function generateSampleMemories() {
  const sampleMemories = [
    {
      content: 'Hello, how are you doing today?',
      role: 'user',
      source: 'chatgpt',
      type: 'conversation',
      metadata: { timestamp: Date.now() - 3600000 }
    },
    {
      content: "I'm doing well, thank you! How can I help you today?",
      role: 'assistant',
      source: 'chatgpt',
      type: 'conversation',
      metadata: { timestamp: Date.now() - 3500000 }
    },
    {
      content: 'Can you explain quantum computing to me?',
      role: 'user',
      source: 'claude',
      type: 'conversation',
      metadata: { timestamp: Date.now() - 7200000 }
    },
    {
      content: 'Quantum computing is a revolutionary computing paradigm that leverages quantum mechanical phenomena like superposition and entanglement to process information in ways that classical computers cannot...',
      role: 'assistant',
      source: 'claude',
      type: 'conversation',
      metadata: { timestamp: Date.now() - 7100000 }
    },
    {
      content: 'The future of AI will be shaped by advances in neural architectures, training methodologies, and computational efficiency.',
      role: 'user',
      source: 'selection',
      type: 'text_selection',
      metadata: { timestamp: Date.now() - 1800000 }
    }
  ];

  try {
    // 🔥 CRITICAL FIX: Use fixed web vault system instead of extension background
    console.log('💾 SAMPLES: Using fixed web vault system for sample memory generation');
    
    if (!window.emmaWebVault || !window.emmaWebVault.isOpen) {
      throw new Error('Vault not available. Please unlock your .emma vault first.');
    }
    
    for (const memory of sampleMemories) {
      // Transform to vault-compatible format
      const vaultMemory = {
        content: memory.content,
        metadata: {
          ...memory.metadata,
          type: memory.type,
          source: memory.source,
          role: memory.role,
          createdVia: 'SampleMemoryGenerator'
        },
        attachments: []
      };
      
      // Use fixed vault system with .emma file sync
      await window.emmaWebVault.addMemory(vaultMemory);
    }

    showNotification('Sample memories generated successfully!');
    await loadMemories(); // Reload the gallery

  } catch (error) {
    console.error('Failed to generate sample memories:', error);
    showNotification('Failed to generate sample memories: ' + error.message, 'error');
  }
}

// Simple notification system
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#ef4444' : '#10b981'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  simpleTimerManager.setTimeout(async () => {
    notification.style.animation = 'slideOut 0.3s ease';
    simpleTimerManager.setTimeout(() => notification.remove(), 300, 'notification_remove');
  }, 3000, 'notification_hide');
}

// Offer HML sync for people with fingerprints who were just tagged
async function offerHMLSyncForTaggedPeople(peopleWithFingerprints, memoryId) {
  try {
    if (!window.hmlSync?.manager) {

      // Offer to create an HML identity
      const message = `You need an HML identity to sync memories with ${peopleWithFingerprints.map(p => p.name).join(', ')}.\n\nWould you like to create your HML identity now? This will enable peer-to-peer collaboration.`;

      const confirmed = await window.emmaConfirm('Would you like to create your HML identity to sync memories with your people?', {
        title: 'Enable Memory Sharing',
        helpText: 'This will let you collaborate on memories with the people you\'ve tagged.',
        confirmText: 'Yes, Enable Sharing',
        cancelText: 'Maybe Later'
      });
      if (!confirmed) {
        return;
      }

      // Create HML identity and initialize sync
      try {
        await createHMLIdentityAndInitialize();
        showNotification('HML identity created! You can now sync with people.', 'success');

        // Now retry the sync offer
        setTimeout(async () => {
          offerHMLSyncForTaggedPeople(peopleWithFingerprints, memoryId);
        }, 1000);

      } catch (error) {
        console.error('[HML] Failed to create identity:', error);
        showNotification('Failed to create HML identity: ' + error.message, 'error');
      }

      return;
    }

    const names = peopleWithFingerprints.map(p => p.name).join(', ');
    const message = peopleWithFingerprints.length === 1
      ? `${names} has an HML identity and can sync this memory!\n\nWould you like to share your vault so they can see this memory and collaborate?`
      : `${names} have HML identities and can sync this memory!\n\nWould you like to share your vault so they can see this memory and collaborate?`;

    if (!confirm(message)) {
      return;
    }

    // Get current vault info
    // WEBAPP-FIRST: Vault manager deprecated - use webapp vault instead
    console.log('🚀 WEBAPP-FIRST: Vault operations moved to webapp');
    const vaultManager = getVaultManager();
    const status = await vaultManager.getStatus();
    const vaultId = status?.vaultId || 'default';

    // Share vault with each person who has a fingerprint
    let successCount = 0;
    let errors = [];

    for (const person of peopleWithFingerprints) {
      try {
        const fingerprint = person.keyFingerprint || person.fingerprint;

        // Set appropriate permissions (viewer by default, but could be enhanced)
        const permissions = {
          read: true,
          write: false, // Could make this configurable
          delete: false,
          share: false,
          admin: false
        };

        console.log(`[HML] Sharing vault ${vaultId} with ${person.name} (${fingerprint.slice(0, 16)}...)`);

        await window.hmlSync.manager.shareVault(vaultId, fingerprint, permissions);

        // Also ensure this person is being monitored for connections
        await window.hmlSync.manager.addPeerToMonitor(fingerprint);

        // Store in monitored peers
        const result = await chrome.storage.local.get(['emma_monitored_peers']);
        const peers = result.emma_monitored_peers || [];
        if (!peers.includes(fingerprint)) {
          peers.push(fingerprint);
          await chrome.storage.local.set({ emma_monitored_peers: peers });
        }

        successCount++;

      } catch (error) {
        console.error(`[HML] Failed to share vault with ${person.name}:`, error);
        errors.push(`${person.name}: ${error.message}`);
      }
    }

    // Show results
    if (successCount > 0) {
      const successMsg = successCount === peopleWithFingerprints.length
        ? `Successfully shared vault with all ${successCount} people! They can now sync and collaborate on this memory.`
        : `Successfully shared vault with ${successCount} of ${peopleWithFingerprints.length} people.`;

      showNotification(successMsg, 'success');

      // Show helpful next steps
      setTimeout(async () => {
        alert(`Vault sharing complete! 🎉\n\nNext steps:\n1. The tagged people will receive vault invitations\n2. Once they accept, this memory will sync to their devices\n3. You can collaborate on memories together\n\nNote: Make sure they have added your fingerprint in their HML Sync settings too!`);
      }, 2000);
    }

    if (errors.length > 0) {
      console.error('[HML] Vault sharing errors:', errors);
      showNotification(`Some vault shares failed: ${errors.join('; ')}`, 'error');
    }

  } catch (error) {
    console.error('[HML] Failed to offer vault sharing:', error);
    showNotification('Failed to set up vault sharing: ' + error.message, 'error');
  }
}

// Create HML identity and initialize sync system
async function createHMLIdentityAndInitialize() {
  try {
    // Import identity crypto utilities
    const { generateIdentity } = await import('./vault/identity-crypto.js');

    // Generate new identity (contains signing and encryption keypairs)
    const identity = await generateIdentity();

    // Store full identity object (preserve structure expected by HML Sync)
    await chrome.storage.local.set({ emma_my_identity: identity });

    // Initialize HML Sync with new identity
    const { P2PManager } = await import('./p2p/p2p-manager.js');
    const { BulletinBoardManager } = await import('./p2p/bulletin-board.js');

    const bulletinBoard = new BulletinBoardManager({ useMock: false });
    const p2pManager = new P2PManager(bulletinBoard);

    // Initialize the manager with the full identity
    await p2pManager.initialize(identity);

    // Make available globally
    window.hmlSync = {
      manager: p2pManager,
      initialized: true
    };

    return identity;

  } catch (error) {
    console.error('[HML] Failed to create identity and initialize sync:', error);
    throw error;
  }
}

function filterMemories() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const sourceFilter = document.getElementById('source-filter')?.value;
  const roleFilter = document.getElementById('role-filter')?.value;
  const vaultFilterEl = document.getElementById('vault-filter');
  if (vaultFilterEl) currentVaultFilter = vaultFilterEl.value || 'current';

  filteredMemories = allMemories.filter(memory => {
    const matchesSearch = memory.content.toLowerCase().includes(searchTerm);
    const matchesSource = !sourceFilter || sourceFilter === 'all' || memory.source === sourceFilter;
    const matchesRole = !roleFilter || roleFilter === 'all' || memory.role === roleFilter;
    const matchesVault = currentVaultFilter === 'current' || memory.vaultId === currentVaultFilter;

    return matchesSearch && matchesSource && matchesRole && matchesVault;
  });

  displayMemories(filteredMemories);
  updateResultsCount();
}

function updateResultsCount() {
  const filteredCountEl = document.getElementById('filtered-count');
  const totalCountEl = document.getElementById('total-count');
  const total = allMemories.length;
  const showing = filteredMemories.length;

  if (filteredCountEl) filteredCountEl.textContent = showing;
  if (totalCountEl) totalCountEl.textContent = total;
}

function refreshMemories() {
  loadMemories();
}

// --- Constellation View ---
async function loadConstellationView() {
  const grid = document.getElementById('memory-grid');
  const headerTitle = document.querySelector('.page-title');
  if (headerTitle) headerTitle.textContent = 'Constellation View';
  const resultsInfo = document.querySelector('.results-info');
  if (resultsInfo) resultsInfo.style.display = 'none';
  const searchFilter = document.querySelector('.search-filter-section');
  if (searchFilter) searchFilter.style.display = 'none';

  grid.innerHTML = '';

  try {
    const touchDevice = (navigator.maxTouchPoints || 0) > 1;
    const compactViewport = window.matchMedia('(max-width: 900px)').matches;
    if (touchDevice || compactViewport) {
      document.body.classList.add('performance-lite');
    }
  } catch {}

  // Fetch memories using same vault → background → local order
  let items = [];
  try {
    const vaultList = await chrome.runtime.sendMessage({ action: 'vault.listCapsules', limit: 200 });
    if (vaultList && vaultList.success && Array.isArray(vaultList.items) && vaultList.items.length) {
      items = vaultList.items.map(h => ({
        id: h.id,
        title: h.title || '(Encrypted Capsule)',
        timestamp: h.ts || Date.now(),
        source: h.source || 'unknown',
        tags: []
      }));
    }
  } catch {}

  if (!items.length) {
    try {
      const resp = await chrome.runtime.sendMessage({ action: 'getAllMemories', limit: 500, offset: 0 });
      if (resp && resp.success && Array.isArray(resp.memories) && resp.memories.length) {
        items = resp.memories.map(m => ({
          id: m.id,
          title: m.title || m.metadata?.title || (m.content ? String(m.content).slice(0, 40) : 'Untitled'),
          timestamp: m.timestamp || Date.now(),
          source: m.metadata?.platform || m.source || 'unknown',
          tags: Array.isArray(m.metadata?.tags)
            ? m.metadata.tags
            : (typeof m.metadata?.tags === 'string' ? m.metadata.tags.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(m.tags) ? m.tags : []))
        }));
      }
    } catch {}
  }

  if (!items.length) {
    try {
      const res = await chrome.storage.local.get(['emma_memories']);
      const list = res.emma_memories || [];
      items = list.map(m => ({
        id: m.id,
        title: m.title || m.metadata?.title || (m.content ? String(m.content).slice(0, 40) : 'Untitled'),
        timestamp: m.timestamp || Date.now(),
        source: m.metadata?.platform || m.source || 'unknown',
        tags: Array.isArray(m.metadata?.tags)
          ? m.metadata.tags
          : (typeof m.metadata?.tags === 'string' ? m.metadata.tags.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(m.tags) ? m.tags : []))
      }));
    } catch {}
  }

  if (!items.length) {
    grid.innerHTML = '<div class="empty-state">No memories available to render constellation.</div>';
    return;
  }

  const isCompactViewport = window.matchMedia('(max-width: 768px)').matches;
  const MAX_MOBILE_ITEMS = 220;
  if (isCompactViewport && items.length > MAX_MOBILE_ITEMS) {
    const step = Math.ceil(items.length / MAX_MOBILE_ITEMS);
    items = items.filter((_, idx) => idx % step === 0);
    console.log(`Constellation: trimmed records for mobile viewport using step ${step}`);
  }

  // Sort by time for subtle adjacency edges
  items.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  // Make available to detail modal
  try { allMemories = items.map(it => ({ id: it.id, title: it.title, timestamp: it.timestamp, source: it.source })); } catch {}

  // Create canvas host
  const wrap = document.createElement('div');
  wrap.style.position = 'relative';
  wrap.style.width = '100%';
  wrap.style.height = isCompactViewport ? '60vh' : '68vh';
  wrap.style.minHeight = isCompactViewport ? '320px' : '420px';
  wrap.style.border = '1px solid var(--emma-border)';
  wrap.style.borderRadius = '16px';
  wrap.style.background = 'var(--emma-card-bg)';
  wrap.style.backdropFilter = isCompactViewport ? 'blur(10px)' : 'blur(20px)';

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  wrap.appendChild(canvas);

  // Tooltip
  const tip = document.createElement('div');
  tip.style.position = 'absolute';
  tip.style.pointerEvents = 'none';
  tip.style.padding = '8px 10px';
  tip.style.border = '1px solid var(--emma-border)';
  tip.style.borderRadius = '8px';
  tip.style.background = 'rgba(0,0,0,0.6)';
  tip.style.color = '#e9d5ff';
  tip.style.fontSize = '12px';
  tip.style.transform = 'translate(8px, -8px)';
  tip.style.display = 'none';
  wrap.appendChild(tip);

  // Controls (cluster + reset)
  const controls = document.createElement('div');
  controls.style.position = 'absolute';
  controls.style.top = '8px';
  controls.style.left = '8px';
  controls.style.display = 'flex';
  controls.style.gap = '8px';
  controls.style.background = 'rgba(0,0,0,0.4)';
  controls.style.border = '1px solid var(--emma-border)';
  controls.style.borderRadius = '10px';
  controls.style.padding = '6px 8px';
  controls.style.backdropFilter = isCompactViewport ? 'blur(4px)' : 'blur(8px)';
  controls.innerHTML = `
    <label style="font-size:12px; color:#e9d5ff; display:flex; align-items:center; gap:6px;">
      Cluster:
      <select id="cluster-mode" style="font-size:12px; background:rgba(17,24,39,0.6); color:#e9d5ff; border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:3px 6px;">
        <option value="none">None</option>
        <option value="source">Source</option>
        <option value="tags">Tags</option>
      </select>
    </label>
    <div style="display: inline-flex; gap: 8px; align-items: center;">
      <button id="zoom-out" style="background: rgba(17,24,39,0.8); color: #e9d5ff; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 6px 10px; font-size: 14px; cursor: pointer;" title="Zoom Out">🔍➖</button>
      <button id="zoom-in" style="background: rgba(17,24,39,0.8); color: #e9d5ff; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 6px 10px; font-size: 14px; cursor: pointer;" title="Zoom In">🔍➕</button>
      <button id="reset-view" style="background: var(--emma-purple); color: white; border: none; border-radius: 8px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-weight: 500;" title="Show All Memories">🏠 Fit All</button>
    </div>
  `;
  wrap.appendChild(controls);

  grid.appendChild(wrap);

  const ctx = canvas.getContext('2d');

  // 🎯 DEMENTIA-FRIENDLY ZOOM: Enhanced view transform for gentle pan/zoom
  const view = { scale: 1, tx: 0, ty: 0, targetScale: 1, targetTx: 0, targetTy: 0 };
  const minScale = 0.3;  // Allow zooming out more to see all memories
  const maxScale = 5;    // Allow zooming in more for better detail
  let dragging = false;
  let dragStart = { x: 0, y: 0, tx: 0, ty: 0 };
  
  // 📱 TOUCH SUPPORT: Variables for pinch-to-zoom
  let touches = [];
  let lastPinchDistance = 0;
  let isPinching = false;
  let animationFrame = null;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    layoutDirty = true;
    draw();
  }
  window.addEventListener('resize', resize);

  // Layout: radial by time
  const center = () => {
    const rect = canvas.getBoundingClientRect();
    return { x: rect.width / 2, y: rect.height / 2 };
  };
  const nodeRadius = 6;
  const positions = new Map();
  let layoutDirty = true;
  let clusterMode = 'none';

  function groupItems() {
    if (clusterMode === 'none') return { groups: [{ key: 'All', items: items }] };
    const map = new Map();
    for (const it of items) {
      let key = 'Other';
      if (clusterMode === 'source') {
        key = (it.source || 'unknown').toString();
      } else if (clusterMode === 'tags') {
        const t = Array.isArray(it.tags) && it.tags.length ? it.tags[0] : null;
        key = t || 'untagged';
      }
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    const entries = Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
    const maxClusters = 8;
    const top = entries.slice(0, maxClusters);
    if (entries.length > maxClusters) {
      const rest = entries.slice(maxClusters).flatMap(e => e[1]);
      top.push(['Other', rest]);
    }
    return { groups: top.map(([key, arr]) => ({ key, items: arr })) };
  }

  function computeLayout() {
    positions.clear();
    const n = items.length;
    const minTs = items[0].timestamp || 0;
    const maxTs = items[n - 1].timestamp || 1;
    const c = center();
    const rect = canvas.getBoundingClientRect();
    const rMax = Math.max(40, Math.min(rect.width, rect.height) / 2 - 40);

    if (clusterMode === 'none') {
      for (let i = 0; i < n; i++) {
        const t = items[i].timestamp || 0;
        const norm = maxTs === minTs ? 0.5 : (t - minTs) / (maxTs - minTs);
        const angle = (i / n) * Math.PI * 2;
        const radius = 24 + norm * rMax;
        const x = c.x + Math.cos(angle) * radius;
        const y = c.y + Math.sin(angle) * radius;
        positions.set(items[i].id, { x, y });
      }
      return;
    }

    const { groups } = groupItems();
    const gCount = groups.length;
    const ringR = Math.max(60, rMax * 0.6);
    for (let gi = 0; gi < gCount; gi++) {
      const g = groups[gi];
      const gAngle = (gi / gCount) * Math.PI * 2;
      const gx = c.x + Math.cos(gAngle) * ringR;
      const gy = c.y + Math.sin(gAngle) * ringR;
      const m = g.items.length;
      const innerR = Math.max(20, Math.min(80, 18 + Math.sqrt(m) * 10));
      for (let j = 0; j < m; j++) {
        const a = (j / m) * Math.PI * 2;
        const rr = innerR * (0.7 + 0.3 * ((j % 5) / 5));
        const x = gx + Math.cos(a) * rr;
        const y = gy + Math.sin(a) * rr;
        positions.set(g.items[j].id, { x, y });
      }
    }
  }

  function ensureLayout() {
    if (!layoutDirty) return;
    computeLayout();
    layoutDirty = false;
  }

  // Edges: connect neighbors by time
  const edges = [];
  for (let i = 0; i < items.length - 1; i++) {
    edges.push([items[i].id, items[i + 1].id]);
  }

  function colorForSource(src) {
    const map = {
      chatgpt: '#10a37f',
      claude: '#ff6b35',
      selection: '#a855f7',
      unknown: '#9ca3af',
      manual: '#93c5fd'
    };
    return map[(src || 'unknown').toLowerCase()] || '#9ca3af';
  }

  let hoverId = null;

  // 🎯 SMOOTH ANIMATIONS: Gentle transitions for dementia-friendly UX
  function animateView() {
    const speed = 0.15; // Gentle animation speed
    let needsUpdate = false;
    
    // Smoothly animate to target position and scale
    if (Math.abs(view.scale - view.targetScale) > 0.001) {
      view.scale += (view.targetScale - view.scale) * speed;
      needsUpdate = true;
    }
    if (Math.abs(view.tx - view.targetTx) > 0.1) {
      view.tx += (view.targetTx - view.tx) * speed;
      needsUpdate = true;
    }
    if (Math.abs(view.ty - view.targetTy) > 0.1) {
      view.ty += (view.targetTy - view.ty) * speed;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      draw();
      animationFrame = requestAnimationFrame(animateView);
    } else {
      animationFrame = null;
    }
  }
  
  // Start smooth animation if not already running
  function startAnimation() {
    if (!animationFrame) {
      animationFrame = requestAnimationFrame(animateView);
    }
  }

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(view.tx, view.ty);
    ctx.scale(view.scale, view.scale);

    ensureLayout();
    const rect = canvas.getBoundingClientRect();
    const c2x = rect.width / 2, c2y = rect.height / 2;

    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = 'rgba(148,163,184,0.5)';
    ctx.lineWidth = 1;
    for (const [a, b] of edges) {
      const pa = positions.get(a), pb = positions.get(b);
      if (!pa || !pb) continue;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (const item of items) {
      const p = positions.get(item.id);
      if (!p) continue;
      const r = (item.id === hoverId) ? nodeRadius + 2 : nodeRadius;
      ctx.beginPath();
      ctx.fillStyle = colorForSource(item.source);
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Reset to screen space for title
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgba(226,232,240,0.8)';
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Memories Constellation', c2x, 20);
  }

  function hitTest(mx, my) {
    ensureLayout();
    const xw = (mx - view.tx);
    const yw = (my - view.ty);
    const wx = xw / view.scale;
    const wy = yw / view.scale;
    for (const item of items) {
      const p = positions.get(item.id);
      if (!p) continue;
      const dx = p.x - wx;
      const dy = p.y - wy;
      if (Math.hypot(dx, dy) <= nodeRadius + 3) return item.id;
    }
    return null;
  }

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (dragging) {
      // 🎯 SMOOTH PANNING: Use target values for immediate response
      view.targetTx = dragStart.tx + (mx - dragStart.x);
      view.targetTy = dragStart.ty + (my - dragStart.y);
      // Immediate update for responsive feel during drag
      view.tx = view.targetTx;
      view.ty = view.targetTy;
      draw();
      return;
    }
    const id = hitTest(mx, my);
    hoverId = id;
    if (id) {
      const item = items.find(x => x.id === id);
      if (item) {
        // SECURITY: Safe DOM creation to prevent XSS injection
        tip.innerHTML = ''; // Clear first
        const titleDiv = document.createElement('div');
        titleDiv.textContent = item.title || '(Untitled)';
        const timeSpan = document.createElement('span');
        timeSpan.style.opacity = '0.8';
        timeSpan.textContent = new Date(item.timestamp).toLocaleString();
        tip.appendChild(titleDiv);
        tip.appendChild(document.createElement('br'));
        tip.appendChild(timeSpan);
        tip.style.left = `${mx + 10}px`;
        tip.style.top = `${my - 10}px`;
        tip.style.display = 'block';
      }
    } else {
      tip.style.display = 'none';
    }
    draw();
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const id = hitTest(mx, my);
    if (id) openMemoryDetail(id);
  });

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    dragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top, tx: view.targetTx, ty: view.targetTy };
    dragging = true;
  });
  window.addEventListener('mouseup', () => { dragging = false; });
  canvas.addEventListener('mouseleave', () => { dragging = false; });
  // 🎯 ENHANCED ZOOM: Smooth wheel zoom with better UX
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    // Gentler zoom speed for dementia-friendly experience
    const zoom = Math.exp(-e.deltaY * 0.001);
    const newScale = Math.max(minScale, Math.min(maxScale, view.targetScale * zoom));
    
    // Calculate zoom point in world coordinates
    const wx = (mx - view.targetTx) / view.targetScale;
    const wy = (my - view.targetTy) / view.targetScale;
    
    // Set targets for smooth animation
    view.targetScale = newScale;
    view.targetTx = mx - wx * view.targetScale;
    view.targetTy = my - wy * view.targetScale;
    
    startAnimation();
  }, { passive: false });

  // 📱 TOUCH GESTURES: Pinch-to-zoom support for tablets/phones
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touches = Array.from(e.touches).map(touch => ({
      id: touch.identifier,
      x: touch.clientX - canvas.getBoundingClientRect().left,
      y: touch.clientY - canvas.getBoundingClientRect().top
    }));
    
    if (touches.length === 2) {
      // Start pinch gesture
      isPinching = true;
      const dx = touches[0].x - touches[1].x;
      const dy = touches[0].y - touches[1].y;
      lastPinchDistance = Math.sqrt(dx * dx + dy * dy);
    } else if (touches.length === 1) {
      // Start pan gesture
      dragStart = { x: touches[0].x, y: touches[0].y, tx: view.targetTx, ty: view.targetTy };
      dragging = true;
    }
  }, { passive: false });
  
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    touches = Array.from(e.touches).map(touch => ({
      id: touch.identifier,
      x: touch.clientX - canvas.getBoundingClientRect().left,
      y: touch.clientY - canvas.getBoundingClientRect().top
    }));
    
    if (isPinching && touches.length === 2) {
      // Handle pinch zoom
      const dx = touches[0].x - touches[1].x;
      const dy = touches[0].y - touches[1].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (lastPinchDistance > 0) {
        const zoom = distance / lastPinchDistance;
        const centerX = (touches[0].x + touches[1].x) / 2;
        const centerY = (touches[0].y + touches[1].y) / 2;
        
        const newScale = Math.max(minScale, Math.min(maxScale, view.targetScale * zoom));
        const wx = (centerX - view.targetTx) / view.targetScale;
        const wy = (centerY - view.targetTy) / view.targetScale;
        
        view.targetScale = newScale;
        view.targetTx = centerX - wx * view.targetScale;
        view.targetTy = centerY - wy * view.targetScale;
        
        startAnimation();
      }
      
      lastPinchDistance = distance;
    } else if (dragging && touches.length === 1) {
      // Handle pan
      view.targetTx = dragStart.tx + (touches[0].x - dragStart.x);
      view.targetTy = dragStart.ty + (touches[0].y - dragStart.y);
      startAnimation();
    }
  }, { passive: false });
  
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (e.touches.length === 0) {
      dragging = false;
      isPinching = false;
      lastPinchDistance = 0;
      touches = [];
    }
  }, { passive: false });

  const clusterSelect = controls.querySelector('#cluster-mode');
  clusterSelect.addEventListener('change', () => {
    clusterMode = clusterSelect.value;
    layoutDirty = true;
    draw();
  });
  
  // 🔍 ZOOM CONTROLS: Simple buttons for dementia-friendly navigation
  const zoomInBtn = controls.querySelector('#zoom-in');
  const zoomOutBtn = controls.querySelector('#zoom-out');
  const resetBtn = controls.querySelector('#reset-view');
  
  zoomInBtn.addEventListener('click', () => {
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const newScale = Math.min(maxScale, view.targetScale * 1.5);
    const wx = (centerX - view.targetTx) / view.targetScale;
    const wy = (centerY - view.targetTy) / view.targetScale;
    
    view.targetScale = newScale;
    view.targetTx = centerX - wx * view.targetScale;
    view.targetTy = centerY - wy * view.targetScale;
    
    startAnimation();
    console.log('🔍➕ Zoom In to scale:', newScale);
  });
  
  zoomOutBtn.addEventListener('click', () => {
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const newScale = Math.max(minScale, view.targetScale / 1.5);
    const wx = (centerX - view.targetTx) / view.targetScale;
    const wy = (centerY - view.targetTy) / view.targetScale;
    
    view.targetScale = newScale;
    view.targetTx = centerX - wx * view.targetScale;
    view.targetTy = centerY - wy * view.targetScale;
    
    startAnimation();
    console.log('🔍➖ Zoom Out to scale:', newScale);
  });
  
  // 🏠 ENHANCED RESET: Smooth animation back to fit-all view
  resetBtn.addEventListener('click', () => { 
    fitAllMemories();
  });

  // 🎯 AUTO-FIT: Calculate optimal zoom to show all memories elegantly
  function fitAllMemories() {
    ensureLayout();

    if (items.length === 0) {
      // No memories, just center the view
      view.targetScale = 1;
      view.targetTx = 0;
      view.targetTy = 0;
      startAnimation();
      return;
    }
    
    // Find bounding box of all memory positions
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (const item of items) {
      const p = positions.get(item.id);
      if (p) {
        minX = Math.min(minX, p.x - 40); // Add padding for node size
        minY = Math.min(minY, p.y - 40);
        maxX = Math.max(maxX, p.x + 40);
        maxY = Math.max(maxY, p.y + 40);
      }
    }
    
    if (minX === Infinity) {
      // No valid positions, just center
      view.targetScale = 1;
      view.targetTx = 0;
      view.targetTy = 0;
      startAnimation();
      return;
    }
    
    // Calculate canvas size
    const rect = canvas.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;
    
    // Calculate content size
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    // Calculate scale to fit all content with some padding
    const scaleX = (canvasWidth * 0.8) / contentWidth;  // 80% of canvas width
    const scaleY = (canvasHeight * 0.8) / contentHeight; // 80% of canvas height
    const optimalScale = Math.min(scaleX, scaleY, maxScale); // Don't exceed max scale
    
    // Ensure minimum scale
    const finalScale = Math.max(optimalScale, minScale);
    
    // Calculate center position
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;
    
    // Set targets for smooth animation to center
    view.targetScale = finalScale;
    view.targetTx = canvasWidth / 2 - contentCenterX * finalScale;
    view.targetTy = canvasHeight / 2 - contentCenterY * finalScale;
    
    console.log('🎯 FIT ALL: Fitting', items.length, 'memories with scale', finalScale);
    startAnimation();
  }
  
  // Initialize with all memories visible
  setTimeout(() => fitAllMemories(), 100);

  resize();
}

async function deleteMemory(memoryId) {

  // Confirm deletion
  const confirmed = await window.emmaConfirm('Would you like to put this memory away?', {
    title: 'Memory Management',
    helpText: 'This will remove the memory from your collection.',
    confirmText: 'Yes, Remove It',
    cancelText: 'Keep It',
    isDestructive: true
  });
  if (!confirmed) {
    return;
  }

  try {

    const response = await chrome.runtime.sendMessage({
      action: 'deleteMemory',
      memoryId: memoryId
    });

    if (response?.success) {

      // Show success notification
      showNotification('✅ Memory deleted successfully', 'success', 2000);

      // Reload memories to reflect the change
      await loadMemories();
    } else {
      throw new Error(response?.error || 'Failed to delete memory');
    }
  } catch (error) {
    console.error('❌ Memories: Delete failed:', error);
    showNotification('❌ Failed to delete memory: ' + error.message, 'error', 4000);
  }
}

async function injectHeaderLockStatus() {
  // GLOBAL GUARD: Only allow one instance
  if (window.emmaLockStatusInjected) {

    return;
  }
  window.emmaLockStatusInjected = true;

  const header = document.querySelector('.memories-header .header-actions');
  if (!header) return;
  let node = document.getElementById('emma-lock-status');
  if (!node) {
    node = document.createElement('div');
    node.id = 'emma-lock-status';
    node.style.cssText = 'display:flex;align-items:center;gap:8px;margin-right:8px;color:var(--emma-text-secondary)';
    header.prepend(node);
  }
  async function refresh() {
    try {
      // CRITICAL FIX: Use new extension FSM system instead of VaultGuardian
      const vaultUnlocked = localStorage.getItem('emmaVaultActive') === 'true' ||
                           sessionStorage.getItem('emmaVaultActive') === 'true' ||
                           (window.currentVaultStatus && window.currentVaultStatus.isUnlocked);

      const vaultName = localStorage.getItem('emmaVaultName') ||
                       sessionStorage.getItem('emmaVaultName') ||
                       (window.currentVaultStatus && window.currentVaultStatus.name) ||
                       'My Vault';

      if (vaultUnlocked) {
        // Unlocked state - show status with lock button
        // SECURITY: Safe DOM creation to prevent XSS injection
        node.innerHTML = ''; // Clear first
        const statusSpan = document.createElement('span');
        statusSpan.textContent = `🔓 ${vaultName} `;
        const lockBtn = document.createElement('button');
        lockBtn.id = 'emma-lock-now';
        lockBtn.className = 'btn-secondary';
        lockBtn.style.marginLeft = '8px';
        lockBtn.textContent = 'Lock';
        node.appendChild(statusSpan);
        node.appendChild(lockBtn);
        // Set up lock button click handler
        lockBtn.onclick = async () => {
          try {
            // CRITICAL: Ask for passphrase to encrypt vault before locking
            const passphrase = await showSimplePasswordPrompt('🔐 Enter passphrase to encrypt and lock vault');
            if (!passphrase) return;

            if (window.emmaWebVault) {
              await window.emmaWebVault.lockVault();

              // Refresh page to show locked state
              window.location.reload();
            }
          } catch (error) {
            console.error('❌ VAULT: Lock failed:', error);
            window.emmaError('Had trouble locking the vault. Let\'s try again.', {
              title: 'Vault Lock Issue',
              helpText: 'Sometimes this takes a moment to work properly.'
            });
          }
        };
      } else {
        // Locked state - show clickable unlock button
        node.innerHTML = `<button id="emma-unlock-now" class="btn-primary" style="background:#dc2626;border:1px solid #dc2626;color:white">🔐 Locked - Click to Unlock</button>`;
        const unlockBtn = document.getElementById('emma-unlock-now');
        if (unlockBtn) {
          unlockBtn.onclick = async () => {
            try {
              const passphrase = await showSimplePasswordPrompt('🔐 Enter Vault Passphrase');
              if (!passphrase) return;

              // Try to unlock via web vault system
              if (window.emmaWebVault) {
                await window.emmaWebVault.openVaultFile();

                // Refresh page to show unlocked state
                window.location.reload();
              }
            } catch (error) {
              console.error('🔒 Unlock failed:', error);
              window.emmaError('Had trouble unlocking the vault. Let\'s try again.', {
                title: 'Vault Unlock Issue',
                helpText: 'Sometimes this takes a moment to work properly.'
              });
            }
          };
        }
      }
    } catch {
      // Fallback - make it clickable too
      node.innerHTML = `<button id="emma-unlock-fallback" class="btn-primary" style="background:#dc2626;border:1px solid #dc2626;color:white">🔐 Locked - Click to Unlock</button>`;
      const fallbackBtn = document.getElementById('emma-unlock-fallback');
      if (fallbackBtn) {
        fallbackBtn.onclick = async () => {
          try {
            const passphrase = await showSimplePasswordPrompt('🔐 Enter Vault Passphrase');
            if (!passphrase) return;

            const unlockResult = await window.emma.vault.unlock({ passphrase });
            if (unlockResult && unlockResult.success) {

            } else {
              window.emmaError('The passphrase doesn\'t seem to match. Let\'s try entering it again.', {
                title: 'Passphrase Issue',
                helpText: 'Take your time - these can be tricky to remember.'
              });
            }
          } catch (error) {
            console.error('🛡️ Unlock failed:', error);
            window.emmaError('Had trouble unlocking the vault. Let\'s try again.', {
              title: 'Vault Unlock Issue',
              helpText: 'Sometimes this takes a moment to work properly.'
            });
          }
        };
      }
    }
  }

  // PREVENT MULTIPLE INTERVALS - Clear any existing ones first
  if (window.emmaLockStatusInterval) {
    clearInterval(window.emmaLockStatusInterval);
  }

  refresh();

  // window.emmaLockStatusInterval = setInterval(refresh, 5000); // DISABLED
}

function injectAuditViewerButton() {
  const header = document.querySelector('.memories-header .header-actions');
  if (!header) return;
  if (document.getElementById('emma-audit-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'emma-audit-btn';
  btn.className = 'btn-secondary';
  btn.textContent = 'Audit Log';
  btn.addEventListener('click', openAuditViewerModal);
  header.appendChild(btn);
}

function injectGuardianshipButton() {
  const header = document.querySelector('.memories-header .header-actions');
  if (!header) return;
  if (document.getElementById('emma-guardian-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'emma-guardian-btn';
  btn.className = 'btn-secondary';
  btn.textContent = 'Guardians';
  btn.addEventListener('click', openGuardianshipModal);
  header.appendChild(btn);
}

async function openGuardianshipModal() {
  try {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:grid;place-items:center;z-index:9999';
    wrap.innerHTML = `
      <div style="width:780px;max-width:96vw;max-height:86vh;overflow:auto;background:var(--emma-card-bg);border:1px solid var(--emma-border);border-radius:16px;">
        <div style=\"display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--emma-border)\">
          <div style=\"font-weight:700\">Guardianship & Recovery</div>
          <div style=\"display:flex;gap:8px;align-items:center\">
            <button id=\"guardian-generate\" class=\"btn\">Generate Shares</button>
            <button id=\"guardian-close\" class=\"btn secondary\">✕</button>
          </div>
        </div>
        <div style=\"padding:12px 18px;display:grid;gap:10px\">
          <div>Emma can create 3 recovery shares. Keep 2 in different safe places or give to trusted guardians. Any 2 can recover your vault. Shares are never stored by Emma.</div>
          <div id=\"guardian-list\"></div>
          <div style=\"margin-top:8px;border-top:1px solid var(--emma-border);padding-top:8px\">
            <div style=\"font-weight:600;margin-bottom:6px\">Recover Vault</div>
            <input id=\"rec1\" placeholder=\"Paste Share #1\" style=\"width:100%;padding:8px;border:1px solid var(--emma-border);border-radius:8px;background:rgba(255,255,255,0.05);color:var(--emma-text);margin-bottom:6px\"/>
            <input id=\"rec2\" placeholder=\"Paste Share #2\" style=\"width:100%;padding:8px;border:1px solid var(--emma-border);border-radius:8px;background:rgba(255,255,255,0.05);color:var(--emma-text);margin-bottom:6px\"/>
            <button id=\"guardian-recover\" class=\"btn-primary\">Recover & Unlock</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const list = wrap.querySelector('#guardian-list');
    wrap.querySelector('#guardian-close').addEventListener('click', () => wrap.remove());
    wrap.querySelector('#guardian-generate').addEventListener('click', async () => {
      try {
        const res = await window.emma.vault.recovery.generate();
        const shares = res?.shares || [];
        list.innerHTML = shares.map((s, i) => `
          <div style=\"display:flex;align-items:center;justify-content:space-between;border:1px solid var(--emma-border);border-radius:10px;padding:8px;gap:8px;margin-top:6px\">
            <div style=\"font-weight:600\">Share #${i+1}</div>
            <input value=\"${s}\" readonly style=\"flex:1;padding:6px 8px;border:1px solid var(--emma-border);border-radius:8px;background:rgba(255,255,255,0.05);color:var(--emma-text);\" />
            <div style=\"display:flex;gap:6px\">
              <button class=\"btn secondary copy\" data-idx=\"${i}\">Copy</button>
              <button class=\"btn secondary download\" data-idx=\"${i}\">Download</button>
              <button class=\"btn secondary print\" data-idx=\"${i}\">Print</button>
              <button class=\"btn secondary qr\" data-idx=\"${i}\">QR</button>
            </div>
          </div>
        `).join('');
        // Wire actions
        list.querySelectorAll('button.copy').forEach(btn => btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          const input = list.querySelectorAll('input')[idx];
          input.select(); document.execCommand('copy');
          showNotification(`Copied Share #${idx+1}`, 'success');
        }));
        list.querySelectorAll('button.download').forEach(btn => btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          const input = list.querySelectorAll('input')[idx];
          const blob = new Blob([input.value], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `emma_vault_share_${idx+1}.txt`; a.click(); URL.revokeObjectURL(url);
        }));
        list.querySelectorAll('button.print').forEach(btn => btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          const input = list.querySelectorAll('input')[idx];
          const w = window.open('', '_blank');
          if (!w) return;
          const escapeHtml = (s) => String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
          const safeValue = escapeHtml(input.value);
          w.document.write(`<!doctype html><title>Emma Vault Share #${idx+1}</title><body style=\"font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial; padding:24px\"><h2>Emma Vault Recovery Share #${idx+1}</h2><p>Keep this safe. Share only with trusted guardians.</p><pre style=\"white-space:pre-wrap;word-break:break-all;border:1px solid #ccc;padding:12px;border-radius:8px\">${safeValue}</pre></body>`);
          w.document.close(); w.focus(); w.print();
        }));
        list.querySelectorAll('button.qr').forEach(btn => btn.addEventListener('click', async () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          const input = list.querySelectorAll('input')[idx];
          const s = input.value;
          // caution modal
          const q = document.createElement('div');
          q.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:grid;place-items:center;z-index:10001';
          q.innerHTML = `
            <div style=\"width:520px;max-width:96vw;background:var(--emma-card-bg);border:1px solid var(--emma-border);border-radius:16px;\">
              <div style=\"padding:14px 18px;border-bottom:1px solid var(--emma-border);font-weight:700\">QR Export (Caution)</div>
              <div style=\"padding:14px 18px;\">
                <div style=\"opacity:.85;margin-bottom:10px\">Only display this QR in a private setting. Anyone who scans gets access to this recovery share.</div>
                <div id=\"qr-box\" style=\"display:grid;place-items:center;padding:10px\"></div>
                <div style=\"display:flex;gap:8px;justify-content:flex-end;margin-top:8px\"><button id=\"qr-close\" class=\"btn secondary\">Close</button></div>
              </div>
            </div>`;
          document.body.appendChild(q);
          try {
            const dataUrl = await window.emma.util.qrDataUrl(s, 256, 256);
            const img = document.createElement('img');
            img.src = dataUrl; img.alt = 'Recovery Share QR'; img.style = 'width:256px;height:256px';
            q.querySelector('#qr-box').appendChild(img);
          } catch {
            q.querySelector('#qr-box').innerHTML = '<div style=\\"opacity:.8\\">QR renderer unavailable in this build</div>';
          }
          q.querySelector('#qr-close').onclick = () => q.remove();
        }));
      } catch (e) {
        showNotification('Failed to generate shares: ' + e.message, 'error');
      }
    });
    wrap.querySelector('#guardian-recover').addEventListener('click', async () => {
      const s1 = wrap.querySelector('#rec1').value.trim();
      const s2 = wrap.querySelector('#rec2').value.trim();
      if (!s1 || !s2) return;
      try {
        const res = await window.emma.vault.recovery.unlock({ shares: [s1, s2] });
        if (res?.success) {
          showNotification('Vault recovered and unlocked', 'success');
          wrap.remove();
        }
      } catch (e) {
        showNotification('Recovery failed: ' + e.message, 'error');
      }
    });
  } catch (e) {
    showNotification('Guardianship error: ' + e.message, 'error');
  }
}

async function openAuditViewerModal() {
  try {
    const res = await window.emma.vault.listEvents({ limit: 1000, offset: 0 });
    const verify = await window.emma.vault.verifyEvents();
    const ok = !!verify?.ok;
    let items = (res?.items || []).map(it => ({
      ts: new Date(it.created_at).toLocaleString(),
      tms: new Date(it.created_at).getTime(),
      type: it.event?.type || 'event',
      detail: JSON.stringify(it.event),
      ok: it.ok
    }));
    // Filters UI
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:grid;place-items:center;z-index:9999';
    wrap.innerHTML = `
      <div style="width:1000px;max-width:96vw;max-height:86vh;overflow:auto;background:var(--emma-card-bg);border:1px solid var(--emma-border);border-radius:16px;">
        <div style=\"display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--emma-border)\">
          <div style=\"font-weight:700\">HML Audit Log ${ok ? '✓' : '⚠️'}</div>
          <div style=\"display:flex;gap:8px;align-items:center\">
            <input id=\"audit-filter\" placeholder=\"Filter by type (e.g., memory)\" style=\"padding:6px 8px;border:1px solid var(--emma-border);border-radius:8px;background:rgba(255,255,255,0.05);color:var(--emma-text);\"/>
            <input id=\"audit-from\" type=\"date\" style=\"padding:6px 8px;border:1px solid var(--emma-border);border-radius:8px;background:rgba(255,255,255,0.05);color:var(--emma-text);\"/>
            <input id=\"audit-to\" type=\"date\" style=\"padding:6px 8px;border:1px solid var(--emma-border);border-radius:8px;background:rgba(255,255,255,0.05);color:var(--emma-text);\"/>
            <button id=\"audit-export\" class=\"btn secondary\">Export CSV</button>
            <button id=\"audit-close\" class=\"btn secondary\">✕</button>
          </div>
        </div>
        <div style=\"padding:12px 18px;\">
          <table id=\"audit-table\" style=\"width:100%;border-collapse:collapse;font-size:12px\">
            <thead><tr style=\"text-align:left\"><th style=\"padding:6px 8px;border-bottom:1px solid var(--emma-border)\">Time</th><th style=\"padding:6px 8px;border-bottom:1px solid var(--emma-border)\">Type</th><th style=\"padding:6px 8px;border-bottom:1px solid var(--emma-border)\">OK</th><th style=\"padding:6px 8px;border-bottom:1px solid var(--emma-border)\">Event</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const tableBody = wrap.querySelector('#audit-table tbody');
    const filterInput = wrap.querySelector('#audit-filter');
    const fromInput = wrap.querySelector('#audit-from');
    const toInput = wrap.querySelector('#audit-to');
    const exportBtn = wrap.querySelector('#audit-export');
    const closeBtn = wrap.querySelector('#audit-close');
    const renderRows = () => {
      const term = (filterInput.value || '').toLowerCase().trim();
      const fromVal = fromInput.value ? Date.parse(fromInput.value + 'T00:00:00') : null;
      const toVal = toInput.value ? Date.parse(toInput.value + 'T23:59:59') : null;
      tableBody.innerHTML = items
        .filter(r => (!term || r.type.toLowerCase().includes(term) || r.detail.toLowerCase().includes(term)) && (fromVal == null || r.tms >= fromVal) && (toVal == null || r.tms <= toVal))
        .map((r, idx) => `<tr>
          <td style=\"padding:6px 8px;border-bottom:1px solid var(--emma-border)\">${r.ts}</td>
          <td style=\"padding:6px 8px;border-bottom:1px solid var(--emma-border)\">${r.type}</td>
          <td style=\"padding:6px 8px;border-bottom:1px solid var(--emma-border)\">${r.ok ? '✓' : '⚠️'}</td>
          <td style=\"padding:6px 8px;border-bottom:1px solid var(--emma-border);font-family:ui-monospace,monospace;white-space:pre-wrap\">
            <button class=\\"btn secondary view\\" data-idx=\\"${idx}\\">View</button>
          </td>
        </tr>`).join('');

      tableBody.querySelectorAll('button.view').forEach(btn => btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const rec = items[idx];
        openAuditDetailModal(rec);
      }));
    };
    renderRows();
    filterInput.addEventListener('input', renderRows);
    fromInput.addEventListener('change', renderRows);
    toInput.addEventListener('change', renderRows);
    exportBtn.addEventListener('click', () => {
      const rows = [['time','type','ok','event']].concat(items.map(r => [r.ts, r.type, r.ok ? 'ok' : 'bad', r.detail]));
      const csv = rows.map(r => r.map(x => '"' + String(x).replace(/"/g,'""') + '"').join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'hml_audit.csv'; a.click(); URL.revokeObjectURL(url);
    });
    closeBtn.addEventListener('click', () => wrap.remove());
  } catch (e) {
    showNotification('Failed to load audit log: ' + e.message, 'error');
  }
}

function openAuditDetailModal(rec) {
  const w = document.createElement('div');
  w.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:grid;place-items:center;z-index:10000';
  w.innerHTML = `
    <div style="width:760px;max-width:96vw;max-height:80vh;overflow:auto;background:var(--emma-card-bg);border:1px solid var(--emma-border);border-radius:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--emma-border)">
        <div style="font-weight:700">Event Detail</div>
        <div style="display:flex;gap:8px">
          <button id="audit-copy" class="btn secondary">Copy</button>
          <button id="audit-close2" class="btn secondary">✕</button>
        </div>
      </div>
      <pre id="audit-json" style="margin:0;padding:12px 18px;white-space:pre-wrap;word-break:break-all;font-family:ui-monospace,monospace"></pre>
    </div>`;
  document.body.appendChild(w);
  const code = w.querySelector('#audit-json');
  try {
    const obj = JSON.parse(rec.detail);
    code.innerHTML = syntaxHighlight(obj);
  } catch {
    code.textContent = rec.detail;
  }
  w.querySelector('#audit-copy').onclick = () => { navigator.clipboard.writeText(code.textContent).then(()=>showNotification('Copied event JSON','success')).catch(()=>{}); };
  w.querySelector('#audit-close2').onclick = () => w.remove();
}

function syntaxHighlight(json) {
  if (typeof json != 'string') {
    json = JSON.stringify(json, undefined, 2);
  }
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
    let cls = 'json-number';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'json-key';
      } else {
        cls = 'json-string';
      }
    } else if (/true|false/.test(match)) {
      cls = 'json-boolean';
    } else if (/null/.test(match)) {
      cls = 'json-null';
    }
    return '<span class="' + cls + '">' + match + '</span>';
  });
}

function setupIdleAutoLock() {
  // GLOBAL GUARD: Only allow one instance
  if (window.emmaIdleAutoLockSetup) {

    return;
  }
  window.emmaIdleAutoLockSetup = true;

  let lastActivity = Date.now();
  const update = () => (lastActivity = Date.now());
  ['mousemove','keydown','click','scroll','touchstart'].forEach(evt => window.addEventListener(evt, update, { passive: true }));

  // PREVENT MULTIPLE INTERVALS - Clear any existing ones first
  if (window.emmaIdleAutoLockInterval) {
    clearInterval(window.emmaIdleAutoLockInterval);
  }

  // CRITICAL FIX: Idle auto-lock permanently disabled - vault only locks when user chooses

}

// Simple password prompt for Electron (since prompt() doesn't work)
function showSimplePasswordPrompt(title = 'Enter Password') {
  return new Promise((resolve) => {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      min-width: 400px;
      text-align: center;
    `;

    modal.innerHTML = `
      <h3 style="margin: 0 0 20px 0; color: #333;">${title}</h3>
      <input type="password" id="passphrase-input" style="
        width: 100%;
        padding: 12px;
        border: 2px solid #ddd;
        border-radius: 4px;
        font-size: 16px;
        margin-bottom: 20px;
        box-sizing: border-box;
      " placeholder="Enter your passphrase" autofocus>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="cancel-btn" style="
          padding: 10px 20px;
          border: 2px solid #ccc;
          background: white;
          border-radius: 4px;
          cursor: pointer;
        ">Cancel</button>
        <button id="unlock-btn" style="
          padding: 10px 20px;
          border: 2px solid #4CAF50;
          background: #4CAF50;
          color: white;
          border-radius: 4px;
          cursor: pointer;
        ">Unlock</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const input = modal.querySelector('#passphrase-input');
    const cancelBtn = modal.querySelector('#cancel-btn');
    const unlockBtn = modal.querySelector('#unlock-btn');

    const cleanup = () => {
      document.body.removeChild(overlay);
    };

    const submit = () => {
      const value = input.value.trim();
      cleanup();
      resolve(value || null);
    };

    const cancel = () => {
      cleanup();
      resolve(null);
    };

    // Event listeners
    unlockBtn.onclick = submit;
    cancelBtn.onclick = cancel;
    input.onkeypress = (e) => {
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') cancel();
    };

    // Focus the input
    setTimeout(() => input.focus(), 100);
  });
}

// Helper function to show notifications
function showNotification(message, type = 'info', duration = 3000) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 999999;
    padding: 12px 16px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    opacity: 0;
    transition: opacity 0.3s ease;
    ${type === 'success' ? 'background: linear-gradient(135deg, #10B981, #059669);' : ''}
    ${type === 'error' ? 'background: linear-gradient(135deg, #EF4444, #DC2626);' : ''}
    ${type === 'info' ? 'background: linear-gradient(135deg, #667eea, #764ba2);' : ''}
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => notification.style.opacity = '1', 10);

  // Remove after duration
  setTimeout(async () => {
    notification.style.opacity = '0';
    setTimeout(async () => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, duration);
}

async function openMemoryDetail(memoryId) {
  const memory = allMemories.find(m => m.id == memoryId);
  if (!memory) return;

  console.log('🎯 CONSTELLATION: Opening responsive memory dialog for:', memory.title || memory.id);

  // 🚀 PERFORMANCE: Load full media on-demand if memory has lazy-loaded attachments
  const memoryWithFullMedia = await loadFullMediaForMemory(memory);

  // 📱💻🖥️ USE THE NEW RESPONSIVE MEMORY DIALOG!
  showResponsiveMemoryDialog(memoryWithFullMedia);
}

/**
 * 🚀 PERFORMANCE OPTIMIZATION: Load full media data on-demand for lazy-loaded attachments
 */
async function loadFullMediaForMemory(memory) {
  // Check if this memory has lazy-loaded attachments that need full loading
  const hasLazyAttachments = memory.attachments?.some(att => att.isLazyLoaded && att.hasMedia);
  
  if (!hasLazyAttachments) {
    console.log('💾 LAZY LOADING: Memory already has full media, no loading needed');
    return memory;
  }
  
  console.log('🚀 LAZY LOADING: Loading full media for', memory.attachments?.length || 0, 'attachments');
  
  try {
    // Get vault media data
    const vaultMedia = window.emmaWebVault?.vaultData?.content?.media || {};
    
    // Load full media data for lazy-loaded attachments
    const fullAttachments = memory.attachments.map(attachment => {
      if (attachment.isLazyLoaded && attachment.hasMedia && attachment.mediaId) {
        const mediaItem = vaultMedia[attachment.mediaId];
        if (mediaItem && mediaItem.data) {
          console.log('💾 LAZY LOADING: Loading full media for:', attachment.name);
          return {
            ...attachment,
            url: mediaItem.data.startsWith('data:')
              ? mediaItem.data
              : `data:${mediaItem.type};base64,${mediaItem.data}`,
            dataUrl: mediaItem.data.startsWith('data:')
              ? mediaItem.data
              : `data:${mediaItem.type};base64,${mediaItem.data}`,
            data: mediaItem.data,
            isLazyLoaded: false, // Mark as fully loaded
            isPersisted: true
          };
        }
      }
      
      // Return attachment as-is if already loaded or no media
      return attachment;
    });
    
    console.log('✅ LAZY LOADING: Successfully loaded full media data');
    
    return {
      ...memory,
      attachments: fullAttachments
    };
    
  } catch (error) {
    console.error('❌ LAZY LOADING: Failed to load full media:', error);
    // Return original memory if loading fails
    return memory;
  }
}

/**
 * 📱💻🖥️ RESPONSIVE MEMORY DIALOG - Works on ALL screen sizes!
 */
function showResponsiveMemoryDialog(memory) {
  // Prepare memory data  
  const hasImages = memory.attachments?.some(att => att.type?.startsWith('image/'));
  const hasVideo = memory.attachments?.some(att => att.type?.startsWith('video/'));
  const peopleList = memory.metadata?.people || [];
  
  // Create fully responsive dialog for ALL screen sizes
  const dialog = document.createElement('div');
  dialog.className = 'memory-preview-dialog responsive constellation';
  dialog.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    z-index: 10000 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    opacity: 0;
    animation: dialogFadeIn 0.3s ease forwards;
    background: rgba(0, 0, 0, 0.9) !important;
    backdrop-filter: blur(20px) !important;
    padding: 0;
  `;

  dialog.innerHTML = `
    <style>
      /* 🎯 RESPONSIVE DIALOG STYLES FOR ALL SCREEN SIZES */
      @keyframes dialogFadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      
      .responsive-memory-container {
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.95) 0%, rgba(124, 58, 237, 0.95) 50%, rgba(109, 40, 217, 0.95) 100%);
        border-radius: clamp(16px, 3vw, 24px);
        max-width: 95vw;
        max-height: 95vh;
        width: 100%;
        overflow-y: auto;
        position: relative;
        animation: dialogFadeIn 0.3s ease forwards;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
      }
      
      /* 📱 MOBILE FIRST (320px+) */
      .responsive-memory-container {
        margin: 10px;
        padding: 20px;
      }
      
      /* 📱 TABLET (768px+) */
      @media (min-width: 768px) {
        .responsive-memory-container {
          margin: 20px;
          padding: 30px;
          max-width: 700px;
        }
      }
      
      /* 💻 LAPTOP (1024px+) */
      @media (min-width: 1024px) {
        .responsive-memory-container {
          margin: 40px;
          padding: 40px;
          max-width: 900px;
        }
      }
      
      /* 🖥️ DESKTOP (1440px+) */
      @media (min-width: 1440px) {
        .responsive-memory-container {
          max-width: 1100px;
          padding: 50px;
        }
      }
      
      /* HEADER STYLES */
      .memory-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: clamp(20px, 4vw, 30px);
        flex-wrap: wrap;
        gap: 15px;
      }
      
      .header-info h2 {
        margin: 0;
        color: white;
        font-size: clamp(20px, 4vw, 28px);
        font-weight: 700;
        line-height: 1.2;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }
      
      .memory-date {
        color: rgba(255, 255, 255, 0.8);
        font-size: clamp(14px, 2.5vw, 16px);
        margin-top: 5px;
      }
      
      .close-btn {
        background: rgba(255, 255, 255, 0.15);
        border: none;
        color: white;
        width: clamp(40px, 6vw, 48px);
        height: clamp(40px, 6vw, 48px);
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
        flex-shrink: 0;
      }
      
      .close-btn:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: scale(1.1);
      }
      
      /* HERO CAROUSEL STYLES */
      .hero-carousel {
        margin-bottom: clamp(25px, 5vw, 35px);
        border-radius: clamp(12px, 2.5vw, 16px);
        overflow: hidden;
        position: relative;
        aspect-ratio: 16/9;
        background: rgba(0, 0, 0, 0.3);
      }
      
      .carousel-container {
        position: relative;
        width: 100%;
        height: 100%;
      }
      
      .hero-image {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-size: cover;
        background-position: center;
        opacity: 0;
        transition: opacity 0.5s ease;
      }
      
      .hero-image.active {
        opacity: 1;
      }
      
      .image-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 50%;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.4));
      }
      
      .carousel-dots {
        position: absolute;
        bottom: 15px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 8px;
      }
      
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .dot.active {
        background: white;
        transform: scale(1.2);
      }
      
      /* PEOPLE SECTION */
      .people-section {
        margin-bottom: clamp(25px, 5vw, 35px);
      }
      
      .section-title {
        color: white;
        font-size: clamp(16px, 3vw, 20px);
        font-weight: 600;
        margin: 0 0 clamp(15px, 3vw, 20px) 0;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }
      
      .people-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(clamp(80px, 15vw, 120px), 1fr));
        gap: clamp(12px, 3vw, 20px);
        justify-items: center;
      }
      
      .memory-person-avatar {
        width: clamp(70px, 12vw, 100px);
        height: clamp(70px, 12vw, 100px);
        border-radius: 50%;
        border: 3px solid rgba(255, 255, 255, 0.9);
        overflow: hidden;
        position: relative;
        background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: clamp(12px, 2.5vw, 16px);
        font-weight: 600;
        color: white;
        transition: all 0.3s ease;
        cursor: pointer;
        text-align: center;
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
      }
      
      .memory-person-avatar:hover {
        transform: scale(1.05);
        border-color: white;
        box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5);
      }
      
      .memory-person-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      /* CONTENT SECTION */
      .content-section {
        margin-bottom: clamp(25px, 5vw, 35px);
      }
      
      .memory-story p {
        color: white;
        font-size: clamp(16px, 3vw, 18px);
        line-height: 1.6;
        margin: 0 0 clamp(15px, 3vw, 20px) 0;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      }
      
      .memory-tags {
        display: flex;
        align-items: center;
        gap: clamp(10px, 2vw, 15px);
        margin-bottom: clamp(10px, 2vw, 15px);
        flex-wrap: wrap;
      }
      
      .tag-label {
        font-size: clamp(16px, 3vw, 18px);
        flex-shrink: 0;
      }
      
      .emotions-list {
        display: flex;
        gap: clamp(6px, 1.5vw, 10px);
        flex-wrap: wrap;
      }
      
      .emotion-tag, .location-tag {
        background: rgba(255, 255, 255, 0.15);
        color: white;
        padding: clamp(4px, 1vw, 6px) clamp(8px, 2vw, 12px);
        border-radius: clamp(12px, 2vw, 16px);
        font-size: clamp(12px, 2.5vw, 14px);
        font-weight: 500;
        border: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
      }
      
      /* MEDIA SECTION */
      .media-section {
        margin-bottom: clamp(25px, 5vw, 35px);
      }
      
      .media-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(clamp(120px, 25vw, 200px), 1fr));
        gap: clamp(10px, 2vw, 15px);
      }
      
      .media-item {
        aspect-ratio: 1;
        border-radius: clamp(8px, 2vw, 12px);
        overflow: hidden;
        background: rgba(255, 255, 255, 0.1);
        position: relative;
        transition: transform 0.3s ease;
      }
      
      .media-item:hover {
        transform: scale(1.05);
      }
      
      .media-item img, .media-item video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      .video-play-overlay {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: clamp(20px, 4vw, 30px);
        color: white;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
      }
      
      /* ACTION BUTTONS */
      .action-buttons {
        display: flex;
        gap: clamp(12px, 3vw, 20px);
        margin-top: clamp(30px, 5vw, 40px);
        flex-wrap: wrap;
      }
      
      .action-btn {
        flex: 1;
        min-width: clamp(120px, 25vw, 150px);
        padding: clamp(12px, 2.5vw, 16px) clamp(20px, 4vw, 30px);
        border: none;
        border-radius: clamp(10px, 2vw, 14px);
        font-size: clamp(14px, 2.5vw, 16px);
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: clamp(6px, 1.5vw, 8px);
        text-decoration: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
      
      .action-btn.primary {
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        color: #8b5cf6;
        border: 2px solid rgba(255, 255, 255, 0.3);
      }
      
      .action-btn.primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(255, 255, 255, 0.3);
      }
      
      .action-btn.secondary {
        background: rgba(255, 255, 255, 0.15);
        color: white;
        border: 2px solid rgba(255, 255, 255, 0.3);
        backdrop-filter: blur(10px);
      }
      
      .action-btn.secondary:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: translateY(-2px);
      }
    </style>
    
    <div class="responsive-memory-container">
      <!-- HEADER -->
      <div class="memory-header">
        <div class="header-info">
          <h2>${memory.title || 'Beautiful Memory'}</h2>
          <div class="memory-date">${memory.metadata?.date || formatMemoryDate(memory.timestamp)}</div>
          </div>
        <button class="close-btn" onclick="this.closest('.memory-preview-dialog').remove()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        </div>
      
      <!-- HERO CAROUSEL -->
      ${hasImages ? `
        <div class="hero-carousel">
          <div class="carousel-container">
            ${memory.attachments
              .filter(att => att.type?.startsWith('image/'))
              .slice(0, 5)
              .map((image, index) => `
                <div class="hero-image ${index === 0 ? 'active' : ''}" style="background-image: url('${image.data || image.dataUrl || image.url}')">
                  <div class="image-overlay"></div>
      </div>
              `).join('')}
        </div>
          ${memory.attachments.filter(att => att.type?.startsWith('image/')).length > 1 ? `
            <div class="carousel-dots">
              ${memory.attachments
                .filter(att => att.type?.startsWith('image/'))
                .slice(0, 5)
                .map((_, index) => `
                  <div class="dot ${index === 0 ? 'active' : ''}" onclick="switchConstellationCarouselImage(${index})"></div>
                `).join('')}
      </div>
          ` : ''}
        </div>
      ` : ''}
      
      <!-- PEOPLE SECTION -->
      ${peopleList.length > 0 ? `
        <div class="people-section">
          <h3 class="section-title">👥 People in this memory</h3>
          <div class="people-grid" id="people-grid-${memory.id}">
            <!-- People avatars will be loaded here -->
          </div>
        </div>
      ` : ''}
      
      <!-- CONTENT -->
      <div class="content-section">
        <div class="memory-story">
          <p>${memory.content}</p>
        </div>
        
        ${memory.metadata?.emotions?.length > 0 ? `
          <div class="memory-tags">
            <span class="tag-label">💭</span>
            <div class="emotions-list">
              ${memory.metadata.emotions.map(emotion => `
                <span class="emotion-tag">${emotion}</span>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${memory.metadata?.location ? `
          <div class="memory-tags">
            <span class="tag-label">📍</span>
            <span class="location-tag">${memory.metadata.location}</span>
          </div>
        ` : ''}
      </div>

      <!-- MEDIA GRID -->
      ${memory.attachments?.length > 1 || hasVideo ? `
        <div class="media-section">
          <h3 class="section-title">📷 All Media (${memory.attachments.length})</h3>
          <div class="media-grid">
            ${memory.attachments.map((attachment, index) => `
              <div class="media-item ${attachment.type?.startsWith('image/') ? 'image' : attachment.type?.startsWith('video/') ? 'video' : 'file'}">
                ${attachment.type?.startsWith('image/') ? `
                  <img src="${attachment.data || attachment.dataUrl || attachment.url}" alt="${attachment.name}" />
                ` : attachment.type?.startsWith('video/') ? `
                  <video src="${attachment.dataUrl || attachment.url}" muted>
                  <div class="video-play-overlay">▶️</div>
                  </video>
                ` : `
                  <div class="file-item">
                    <div class="file-icon">${attachment.type?.startsWith('audio/') ? '🎵' : '📄'}</div>
                    <div class="file-name">${attachment.name}</div>
                  </div>
                `}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <!-- ACTION BUTTONS -->
      <div class="action-buttons">
        <button class="action-btn secondary" onclick="editConstellationMemory('${memory.id}')">
          ✏️ Edit Memory
        </button>
        <button class="action-btn primary" onclick="shareConstellationMemory('${memory.id}')">
          🔗 Share Memory
        </button>
      </div>
    </div>
  `;

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.remove();
    }
  });

  document.body.appendChild(dialog);
  
  // Animate in
  setTimeout(async () => {
    dialog.style.opacity = '1';
    // Load people avatars if needed
    loadConstellationPeopleAvatars(memory);
  }, 100);
}

// Helper functions for the new responsive dialog
function formatMemoryDate(timestamp) {
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch (error) {
    return 'Recent';
  }
}

function switchConstellationCarouselImage(index) {
  const dialog = document.querySelector('.memory-preview-dialog.constellation');
  if (!dialog) return;
  
  // Update active image
  const images = dialog.querySelectorAll('.hero-image');
  const dots = dialog.querySelectorAll('.dot');
  
  images.forEach((img, i) => {
    img.classList.toggle('active', i === index);
  });
  
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });
}

async function loadConstellationPeopleAvatars(memory) {
  const grid = document.getElementById(`people-grid-${memory.id}`);
  if (!grid) return;

  try {
    // Get people from vault if available
    const peopleIds = memory.metadata?.people || [];
    if (peopleIds.length === 0) return;

    let people = [];
    
    // Try to get people from vault
    if (window.emmaWebVault?.vaultData?.content?.people) {
      const rawPeople = Object.values(window.emmaWebVault.vaultData.content.people) || [];
      const media = window.emmaWebVault.vaultData.content.media || {};
      
      people = rawPeople.map(person => {
        let avatarUrl = person.avatarUrl;
        
        if (!avatarUrl && person.avatarId && media[person.avatarId]) {
          const mediaItem = media[person.avatarId];
          if (mediaItem?.data) {
            avatarUrl = mediaItem.data.startsWith('data:')
              ? mediaItem.data
              : `data:${mediaItem.type};base64,${mediaItem.data}`;
          }
        }
        
        return { ...person, avatarUrl };
      });
    }

    // Filter to people in this memory
    const memoryPeople = people.filter(person => 
      peopleIds.some(p => (typeof p === 'string' ? p : p.id) === person.id)
    );

    if (memoryPeople.length === 0) {
      grid.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center;">No people found.</p>';
      return;
    }

    // Create responsive people avatars
    memoryPeople.forEach(person => {
      const personDiv = document.createElement('div');
      personDiv.className = 'memory-person-avatar';
      personDiv.dataset.personId = person.id;
      personDiv.dataset.personName = person.name;

      // Create name label below avatar
      const nameLabel = document.createElement('div');
      nameLabel.textContent = person.name;
      nameLabel.style.cssText = `
        color: white;
        font-size: clamp(12px, 2.5vw, 14px);
        font-weight: 500;
        margin-top: 8px;
        text-align: center;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      `;

      if (person.avatarUrl) {
        const img = document.createElement('img');
        img.src = person.avatarUrl;
        img.alt = person.name;
        img.onload = () => {
          personDiv.innerHTML = '';
          personDiv.appendChild(img);
        };
        img.onerror = () => {
          // Fallback to initials
          personDiv.textContent = person.name.split(' ').map(n => n[0]).join('').toUpperCase();
        };
      } else {
        // Show initials
        personDiv.textContent = person.name.split(' ').map(n => n[0]).join('').toUpperCase();
      }

      const container = document.createElement('div');
      container.style.cssText = 'display: flex; flex-direction: column; align-items: center;';
      container.appendChild(personDiv);
      container.appendChild(nameLabel);
      
      grid.appendChild(container);
    });

  } catch (error) {
    console.error('❌ Error loading constellation people avatars:', error);
    grid.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center;">Error loading people.</p>';
  }
}

function editConstellationMemory(memoryId) {
  console.log('✏️ CONSTELLATION: Opening edit dialog for memory:', memoryId);
  
  // 🎯 ELEGANT SOLUTION: Proper modal cleanup sequence
  const backgroundDialog = document.querySelector('.memory-preview-dialog.constellation');
  
  if (backgroundDialog) {
    // Add fade-out animation before removal
    backgroundDialog.style.opacity = '0';
    backgroundDialog.style.transition = 'opacity 0.2s ease';
    
    // Wait for fade-out, then remove and open edit modal
    setTimeout(async () => {
      backgroundDialog.remove();
      
      // Ensure constellation interactions are properly disabled
      document.body.classList.add('modal-open');
      
      try {
        await ensureEmmaChatExperienceLoaded();
        const tempChatExperience = new EmmaChatExperience();
        tempChatExperience.editMemoryDetails(memoryId);
      } catch (error) {
        console.error('❌ EmmaChatExperience not available', error);
      }
    }, 200);
  } else {
    // No background dialog - proceed directly
    ensureEmmaChatExperienceLoaded()
      .then(() => {
        const tempChatExperience = new EmmaChatExperience();
        tempChatExperience.editMemoryDetails(memoryId);
      })
      .catch((error) => {
        console.error('❌ EmmaChatExperience not available', error);
      });
  }
}

function shareConstellationMemory(memoryId) {
  console.log('🔗 CONSTELLATION: Sharing memory:', memoryId);
  
  // Basic share functionality - copy link to clipboard
  const shareUrl = `${window.location.origin}${window.location.pathname}?memory=${memoryId}`;
  
  if (navigator.share) {
    navigator.share({
      title: 'Emma Memory',
      text: 'Check out this memory!',
      url: shareUrl
    }).catch(console.error);
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(shareUrl).then(() => {
      // Show success message
      const toast = document.createElement('div');
      toast.textContent = '🔗 Memory link copied to clipboard!';
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(139, 92, 246, 0.95);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10001;
        font-weight: 500;
        backdrop-filter: blur(10px);
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }).catch(console.error);
  }
}

function closeMemoryDetail() {
  const modal = document.querySelector('.memory-detail-modal');
  if (modal) {
    modal.classList.remove('active');

    // Clean up escape key listener
    if (modal._escapeHandler) {
      document.removeEventListener('keydown', modal._escapeHandler);
    }

      setTimeout(async () => {
      modal.remove();
    }, 300);
  }
}

// Make it globally available
window.closeMemoryDetail = closeMemoryDetail;

function getTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// --- Data loaders (bridge to background / mtap) ---
async function preloadCounts(memory) {
  const [media, people, related] = await Promise.all([
    loadMedia(memory).catch(() => []),
    loadPeople(memory).catch(() => []),
    loadRelated(memory).catch(() => [])
  ]);
  return { mediaCount: media.length, peopleCount: people.length, relatedCount: related.length };
}

async function loadMedia(memory) {
  // Ask background for attachments for this capsule
  try {
    const resp = await browser.runtime.sendMessage({ action: 'getMemoryAttachments', memoryId: memory.id });
    if (resp && resp.success && Array.isArray(resp.items)) return resp.items;
  } catch {}
  return [];
}

async function loadPeople(memory) {
  try {
    const resp = await browser.runtime.sendMessage({ action: 'getMemoryPeople', memoryId: memory.id });
    if (resp && resp.success && Array.isArray(resp.items)) return resp.items;
  } catch {}
  return [];
}

async function loadRelated(memory) {
  try {
    const resp = await browser.runtime.sendMessage({ action: 'getRelatedMemories', memoryId: memory.id });
    if (resp && resp.success && Array.isArray(resp.items)) return resp.items;
  } catch {}
  return [];
}
          allMemories[idx] = { ...allMemories[idx], title, content };
        }
        renderTab();
      } else {
        showSaveStatus('error', 'Save failed');
        console.error('Failed to save memory:', updated?.error);
      }
    } catch (error) {
      showSaveStatus('error', 'Save failed');
      console.error('Error saving memory:', error);
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  };

  // Keyboard shortcuts (Ctrl+S to save)
  const handleKeydown = (e) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  if (saveBtn && titleInput) {
    saveBtn.addEventListener('click', handleSave);
    titleInput.addEventListener('keydown', handleKeydown);

    const contentInput = modal.querySelector('#memory-content-input');
    if (contentInput) {
      contentInput.addEventListener('keydown', handleKeydown);
    }
  }

  // Preload counts (media, people, related)
  preloadCounts(memory).then(({ mediaCount, peopleCount, relatedCount }) => {
    const setCount = (id, val) => { const el = modal.querySelector(id); if (el) el.textContent = String(val); };
    setCount('#tab-media-count', mediaCount);
    setCount('#tab-people-count', peopleCount);
    setCount('#tab-related-count', relatedCount);
  }).catch(() => {});

  function switchTab(tab) {
    activeTab = tab;
    tabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    renderTab();
  }

  function renderTab() {
    if (activeTab === 'overview') {
      bodyHost.innerHTML = renderOverview(memory);
      wireOverviewActions(bodyHost, memory);
      // Load and populate media gallery asynchronously
      loadOverviewMediaGallery(memory);
    } else if (activeTab === 'meta') {
      bodyHost.innerHTML = renderMeta(memory);
    } else if (activeTab === 'media') {
      loadMedia(memory).then(items => {
        bodyHost.innerHTML = renderMedia(items);
        wireMediaActions(bodyHost, items);
      }).catch(() => { bodyHost.innerHTML = '<div class="media-empty">Failed to load media</div>'; });
    } else if (activeTab === 'people') {
      loadPeople(memory).then(list => {
        bodyHost.innerHTML = renderPeople(list);
        wirePeopleActions(bodyHost);
      }).catch(() => { bodyHost.innerHTML = '<div class="media-empty">Failed to load people</div>'; });
    } else if (activeTab === 'related') {
      loadRelated(memory).then(list => {
        bodyHost.innerHTML = renderRelated(list);
      }).catch(() => { bodyHost.innerHTML = '<div class="media-empty">Failed to load related</div>'; });
    }
  }

  // initial render
  window._currentMemoryId = memory.id;
  renderTab();

  setTimeout(() => modal.classList.add('active'), 10);
}

// --- Rendering helpers ---
function renderOverview(memory) {
  // Always include media gallery at the top (will be populated async)
  const mediaGalleryHtml = `
    <div class="overview-media-gallery" id="overview-media-gallery">
      <div class="media-gallery-loading">
        <div class="loading-spinner-small"></div>
        <span>Loading media...</span>
      </div>
    </div>
  `;

  if (Array.isArray(memory.messages) && memory.messages.length) {
    const messagesHtml = memory.messages.map(msg => `
      <div class="conversation-message ${msg.role || 'user'}">
        <div class="message-header">
          <span class="message-role">${msg.role || 'user'}</span>
          <span class="message-time">${getTimeAgo(new Date(msg.timestamp || memory.timestamp))}</span>
        </div>
        <div class="message-content">${escapeHtml(msg.content || '')}</div>
      </div>
    `).join('');
    return `
      ${mediaGalleryHtml}
      <div class="overview-section">
        <div class="conversation-meta">
          <span class="conversation-platform">${memory.metadata?.platform || 'Unknown Platform'}</span>
          <span class="conversation-stats">${memory.messageCount || memory.messages.length} messages</span>
          <span class="conversation-date">${getTimeAgo(new Date(memory.timestamp))}</span>
        </div>
        <div class="conversation-messages">${messagesHtml}</div>
      </div>
    `;
  }
  const description = memory.content || memory.metadata?.description || '';
  const show = description || memory.metadata?.title || '';
  return `
    ${mediaGalleryHtml}
    <div class="overview-section">
      <textarea id="memory-content-input" class="memory-content-textarea" placeholder="Add notes, context, or details about this memory...">${escapeHtml(show || '')}</textarea>
      <div class="memory-meta-detail" style="margin-top:16px;">
        <span>Source: <span class="conversation-platform">${memory.source || memory.metadata?.platform || 'Unknown'}</span></span>
        <span>Created: ${getTimeAgo(new Date(memory.timestamp))}</span>
        ${memory.url ? `<span>URL: <a href="${memory.url}" target="_blank" style="color: var(--emma-text-secondary); text-decoration: underline;">${new URL(memory.url).hostname}</a></span>` : ''}
      </div>
    </div>
  `;
}

function getOverviewEditedContent() {
  const el = document.querySelector('.memory-detail-modal #memory-content-input');
  return el ? el.value : undefined;
}

// Load and render media gallery in the overview tab
async function loadOverviewMediaGallery(memory) {
  const galleryContainer = document.getElementById('overview-media-gallery');
  if (!galleryContainer) return;

  try {
    const mediaItems = await loadMedia(memory);

    if (mediaItems.length === 0) {
      // Hide the gallery if no media
      galleryContainer.style.display = 'none';
      return;
    }

    // Render compact media gallery
    const galleryHtml = renderCompactMediaGallery(mediaItems);
    galleryContainer.innerHTML = galleryHtml;

    // Wire up click handlers for slideshow
    wireMediaGalleryActions(galleryContainer, mediaItems);

  } catch (error) {
    console.error('Failed to load overview media gallery:', error);
    // Hide gallery on error
    galleryContainer.style.display = 'none';
  }
}

// Render a compact media gallery for the overview
function renderCompactMediaGallery(mediaItems) {
  const maxVisible = 4; // Show max 4 images in overview
  const visibleItems = mediaItems.slice(0, maxVisible);
  const remainingCount = Math.max(0, mediaItems.length - maxVisible);

  return `
    <div class="compact-media-gallery">
      <div class="gallery-header">
        <h3 class="gallery-title">📷 Media (${mediaItems.length})</h3>
        ${mediaItems.length > maxVisible ? `<span class="see-all-link" data-tab-link="media">See all ${mediaItems.length}</span>` : ''}
      </div>
      <div class="gallery-grid">
        ${visibleItems.map((item, index) => `
          <div class="gallery-item" data-media-index="${index}">
            ${item.type === 'image'
              ? `<img src="${item.dataUrl || item.url}" alt="Memory media" loading="lazy" />`
              : `<video src="${item.dataUrl || item.url}" poster="${item.thumbnail || ''}" muted></video>`
            }
            ${item.type === 'video' ? '<div class="video-overlay">▶</div>' : ''}
          </div>
        `).join('')}
        ${remainingCount > 0 ? `
          <div class="gallery-item more-indicator" data-tab-link="media">
            <div class="more-count">+${remainingCount}</div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// Wire up media gallery interactions
function wireMediaGalleryActions(container, mediaItems) {
  // Click on individual media items to open slideshow
  container.querySelectorAll('.gallery-item[data-media-index]').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.mediaIndex);
      openSlideshow(mediaItems, index);
    });
  });

  // Click "See all" or "+N more" to switch to media tab
  container.querySelectorAll('[data-tab-link="media"]').forEach(link => {
    link.addEventListener('click', () => {
      // Find and click the media tab button
      const mediaTabBtn = document.querySelector('.memory-detail-modal .tab-btn[data-tab="media"]');
      if (mediaTabBtn) {
        mediaTabBtn.click();
      }
    });
  });
}

function renderMeta(memory) {
  const md = memory.metadata || {};
  // Build a large text corpus to detect entities if not present
  const corpus = (() => {
    if (memory.type === 'conversation' && Array.isArray(memory.messages)) {
      return memory.messages.map(m => m.content || '').join('\n');
    }
    return (memory.content || '') + '\n' + (md.description || '');
  })();
  const entities = memory.entities || extractEntitiesLocal(corpus);
  const participants = Array.isArray(md.participants) ? md.participants : [];
  const label = (s) => `<div class="meta-label">${s}</div>`;
  const value = (s) => `<div class="meta-value">${s || '<span class=\"muted\">—</span>'}</div>`;
  const chips = (arr, prefix='') => (arr && arr.length) ? arr.map(x => `<span class="chip">${prefix}${escapeHtml(String(x))}</span>`).join(' ') : '<span class="muted">—</span>';
  const url = md.url || md.canonicalUrl || '';
  const link = url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>` : '<span class="muted">—</span>';
  const published = md.publishedAt || md.articlePublishedTime || '';
  const attCount = memory.attachmentCount || memory._attachmentCount || (Array.isArray(memory.attachments) ? memory.attachments.length : 0) || 0;
  return `
    <div class="meta-grid">
      <div class="meta-row">${label('Type')}${value(escapeHtml(memory.type || 'unknown'))}</div>
      <div class="meta-row">${label('Title')}${value(escapeHtml(md.title || memory.title || ''))}</div>
      <div class="meta-row">${label('Author')}${value(escapeHtml(md.author || ''))}</div>
      <div class="meta-row">${label('Participants')}${value(chips(participants))}</div>
      <div class="meta-row">${label('Site')}${value(escapeHtml(md.siteName || ''))}</div>
      <div class="meta-row">${label('URL')}${value(link)}</div>
      <div class="meta-row">${label('Published')}${value(escapeHtml(published))}</div>
      <div class="meta-row">${label('OG Type')}${value(escapeHtml(md.ogType || ''))}</div>
      <div class="meta-row">${label('Attachments')}${value(String(attCount))}</div>
      <div class="meta-sep"></div>
      <div class="meta-row">${label('Mentions')}${value(chips(entities.mentions, '@'))}</div>
      <div class="meta-row">${label('Hashtags')}${value(chips(entities.hashtags, '#'))}</div>
      <div class="meta-row">${label('Links')}${value((entities.urls||[]).map(u => `<a href="${u}" target="_blank" rel="noopener noreferrer">${escapeHtml(u)}</a>`).join('<br/>') || '<span class=\"muted\">—</span>')}</div>
    </div>
  `;
}

function extractEntitiesLocal(text) {
  const mentions = Array.from((text||'').matchAll(/(^|\s)@([a-zA-Z0-9_]{2,30})\b/g)).map(m => m[2]);
  const hashtags = Array.from((text||'').matchAll(/(^|\s)#([\p{L}0-9_]{2,50})/gu)).map(m => m[2]);
  const urls = Array.from((text||'').matchAll(/https?:\/\/[\w.-]+(?:\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?/g)).map(m => m[0]);
  return { mentions: Array.from(new Set(mentions)), hashtags: Array.from(new Set(hashtags)), urls: Array.from(new Set(urls)) };
}

function renderMedia(items) {
  if (!items || !items.length) return '<div class="media-empty">No media</div>';
  return `
    <div>
      <div class="media-toolbar">
        <div>Media (${items.length})</div>
        <button class="btn" id="slideshow-start">Start Slideshow</button>
      </div>
      <div class="media-grid">
        ${items.map((it, idx) => `
          <div class="media-thumb" data-idx="${idx}" data-id="${it.id}">
            <div style="position:absolute; top:6px; right:6px; display:flex; gap:6px; z-index:2;">
              <button class="btn secondary media-rename" data-id="${it.id}" title="Rename/Caption">✎</button>
              <button class="btn secondary media-delete" data-id="${it.id}" title="Delete">🗑</button>
            </div>
            ${it.type && it.type.startsWith('video') ? `<video src="${it.url}" muted></video>` : `<img src="${it.url}" alt="media" />`}
            ${it.caption ? `<div style="position:absolute; left:8px; bottom:8px; background:rgba(0,0,0,0.5); padding:4px 8px; border-radius:8px; font-size:12px;">${escapeHtml(it.caption)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderPeople(list) {
  if (!list || !list.length) {
    return `
      <div class="media-empty">
        <div style="margin-bottom: 16px;">No people tagged</div>
        <button class="btn secondary add-people-btn" style="display: inline-flex; align-items: center; gap: 8px;">
          <span>👥</span> Add People
        </button>
      </div>
    `;
  }
  return `
    <div class="people-grid">${list.map(p => {
      const initials = (p.name || '?').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
      const avatar = p.profilePicture ? `<img src="${p.profilePicture}" style="width:100%; height:100%; object-fit:cover; border-radius:50%"/>` : initials;
      const perm = p.permission ? `<span class=\"chip\" style=\"margin-left:8px; border:1px solid rgba(134,88,255,.3); background:rgba(134,88,255,.1); color:#8658ff; border-radius:999px; padding:2px 8px; font-size:11px;\">${p.permission}</span>` : '';
      return `
        <div class=\"person-card clickable-person\" data-person-id=\"${p.id}\" style=\"cursor: pointer; transition: background-color 0.2s ease;\">
          <div class=\"person-avatar\">${avatar}</div>
          <div>
            <div style=\"font-weight:600; display:flex; align-items:center; gap:6px;\">${escapeHtml(p.name || 'Unknown')}${perm}</div>
            <div style=\"font-size:12px; color:var(--emma-text-tertiary);\">${escapeHtml(p.relationship || 'Collaborator')}</div>
          </div>
        </div>`;
    }).join('')}
      <div class=\"person-card add-more-people\" style=\"cursor: pointer; transition: background-color 0.2s ease; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px dashed rgba(134,88,255,0.3); background: rgba(134,88,255,0.05);\">
        <div style=\"width:50px; height:50px; background:rgba(134,88,255,0.2); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#8658ff; font-size:24px; margin-bottom:8px;\">+</div>
        <div style=\"font-weight:600; color:#8658ff; text-align:center; font-size:12px;\">Add More People</div>
      </div>
    </div>
  `;
}

function renderRelated(list) {
  if (!list || !list.length) return '<div class="media-empty">No related memories found</div>';
  return `<div class="related-list">${list.map(r => `<div class="related-item">${escapeHtml(r.title || r.content || 'Memory')}</div>`).join('')}</div>`;
}

// --- Data loaders (bridge to background / mtap) ---
async function preloadCounts(memory) {
  const [media, people, related] = await Promise.all([
    loadMedia(memory).catch(() => []),
    loadPeople(memory).catch(() => []),
    loadRelated(memory).catch(() => [])
  ]);
  return { mediaCount: media.length, peopleCount: people.length, relatedCount: related.length };
}

async function loadMedia(memory) {
  // Ask background for attachments for this capsule
  try {
    const resp = await chrome.runtime.sendMessage({ action: 'attachment.list', capsuleId: memory.id });
    if (resp && resp.success && Array.isArray(resp.items)) {
      // Fetch data URLs so images display even when remote URLs are blocked or ephemeral
      const items = await Promise.all(resp.items.map(async (it) => {
        try {
          const blobResp = await chrome.runtime.sendMessage({ action: 'attachment.get', id: it.id });
          const url = (blobResp && blobResp.success && blobResp.dataUrl) ? blobResp.dataUrl : (it.sourceUrl || '');
          return { ...it, url };
        } catch {
          return { ...it, url: it.sourceUrl || '' };
        }
      }));
      return items;
    }
  } catch {}
  // Fallback to embedded attachments (simplified storage)
  if (Array.isArray(memory.attachments) && memory.attachments.length) {
    return memory.attachments.map((a, i) => ({
      id: a.id || `att_${memory.id}_${i}`,
      type: a.type || (a.mime && a.mime.startsWith('video') ? 'video' : 'image'),
      url: a.src || a.url || a.sourceUrl || '',
      caption: a.caption || ''
    }));
  }
  return [];
}

async function loadPeople(memory) {
  // Use the enhanced version that includes tagged people
  return await loadPeopleEnhanced(memory);
}

async function loadRelated(memory) {
  try {
    const resp = await chrome.runtime.sendMessage({ action: 'memory.getRelated', id: memory.id, limit: 10 });
    if (resp && resp.success && Array.isArray(resp.items)) return resp.items;
  } catch {}
  return [];
}

// --- Wire actions ---
function wireOverviewActions(host, memory) { /* reserved for future actions */ }

function wirePeopleActions(host) {
  // Add click handlers for person cards
  host.querySelectorAll('.clickable-person').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const personId = card.dataset.personId;
      if (personId) {
        openPersonModal(personId);
      }
    });

    // Add hover effect
    card.addEventListener('mouseenter', () => {
      card.style.backgroundColor = 'rgba(134, 88, 255, 0.1)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.backgroundColor = '';
    });
  });

  // Add click handler for "Add People" button
  const addPeopleBtn = host.querySelector('.add-people-btn');
  if (addPeopleBtn) {
    addPeopleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openAddPeopleModal();
    });
  }

  // Add click handler for "Add More People" button
  const addMorePeopleBtn = host.querySelector('.add-more-people');
  if (addMorePeopleBtn) {
    addMorePeopleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openAddPeopleModal();
    });

    // Add hover effect
    addMorePeopleBtn.addEventListener('mouseenter', () => {
      addMorePeopleBtn.style.backgroundColor = 'rgba(134, 88, 255, 0.1)';
      addMorePeopleBtn.style.borderColor = 'rgba(134, 88, 255, 0.5)';
    });
    addMorePeopleBtn.addEventListener('mouseleave', () => {
      addMorePeopleBtn.style.backgroundColor = 'rgba(134, 88, 255, 0.05)';
      addMorePeopleBtn.style.borderColor = 'rgba(134, 88, 255, 0.3)';
    });
  }
}

async function openAddPeopleModal() {
  try {
    // Load all people from storage
    const store = await chrome.storage.local.get(['emma_people']);
    const allPeople = Array.isArray(store.emma_people) ? store.emma_people : [];

    if (allPeople.length === 0) {
      window.emmaInfo('No people have been added yet. Would you like to add some people first?', {
        title: 'Add People',
        helpText: 'Adding people helps us remember who was part of your memories.'
      });
      return;
    }

    // Get currently tagged people for this memory to filter them out
    const currentMemory = { id: window._currentMemoryId };
    const currentlyTaggedPeople = await loadPeople(currentMemory);
    const taggedPeopleIds = new Set(currentlyTaggedPeople.map(p => String(p.id)));

    // Filter out already tagged people
    const availablePeople = allPeople.filter(person => !taggedPeopleIds.has(String(person.id)));

    if (availablePeople.length === 0) {
      window.emmaInfo('All your people are already connected to this memory!', {
        title: 'Everyone\'s Connected',
        helpText: 'This memory includes all the people you\'ve added.'
      });
      return;
    }

    // Create add people modal
    const modal = document.createElement('div');
    modal.className = 'memory-detail-modal add-people-modal';
    modal.style.zIndex = '10000';

    const peopleGridHtml = availablePeople.map(person => {
      const initials = (person.name || '?').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
      const avatar = person.profilePicture
        ? `<img src="${person.profilePicture}" style="width:60px; height:60px; object-fit:cover; border-radius:50%;"/>`
        : `<div style="width:60px; height:60px; background:#8658ff; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:18px; font-weight:600;">${initials}</div>`;

      // Show HML sync capability if person has fingerprint
      const hasFingerprint = person.keyFingerprint || person.fingerprint;
      const syncBadge = hasFingerprint
        ? `<div style="position:absolute; top:8px; right:8px; background:#4cd964; color:white; font-size:10px; padding:2px 6px; border-radius:8px; font-weight:600;">🔗 HML</div>`
        : '';

      return `
        <div class="selectable-person" data-person-id="${person.id}" data-fingerprint="${hasFingerprint || ''}" style="position:relative; padding:16px; border:2px solid transparent; border-radius:12px; text-align:center; cursor:pointer; transition:all 0.2s ease; background:rgba(255,255,255,0.05);">
          ${syncBadge}
          ${avatar}
          <div style="margin-top:8px; font-weight:600; color:#fff;">${escapeHtml(person.name || 'Unknown')}</div>
          <div style="margin-top:2px; font-size:12px; opacity:0.7;">${escapeHtml(person.relationship || 'Contact')}</div>
          ${hasFingerprint ? '<div style="margin-top:4px; font-size:10px; color:#4cd964;">✓ Sync Ready</div>' : '<div style="margin-top:4px; font-size:10px; color:#888;">No HML Identity</div>'}
        </div>
      `;
    }).join('');

    modal.innerHTML = `
      <div class="memory-detail-overlay"></div>
      <div class="memory-detail-content" style="max-width: 600px;">
        <div class="memory-detail-header">
          <h2 style="margin:0; color:#fff;">👥 Add People to Memory</h2>
          <button class="close-btn add-people-modal-close">×</button>
        </div>
        <div style="padding: 20px;">
          <p style="margin: 0 0 20px 0; opacity: 0.8;">Select people to tag in this memory:</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px;">
            ${peopleGridHtml}
          </div>
          <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; gap: 12px; justify-content: flex-end;">
            <button class="btn secondary add-people-modal-close">Cancel</button>
            <button class="btn add-people-confirm" disabled style="opacity: 0.5;">Add Selected People</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Track selected people
    const selectedPeople = new Set();
    const confirmBtn = modal.querySelector('.add-people-confirm');

    // Add selection handlers
    modal.querySelectorAll('.selectable-person').forEach(card => {
      card.addEventListener('click', () => {
        const personId = card.dataset.personId;

        if (selectedPeople.has(personId)) {
          // Deselect
          selectedPeople.delete(personId);
          card.style.borderColor = 'transparent';
          card.style.backgroundColor = 'rgba(255,255,255,0.05)';
        } else {
          // Select
          selectedPeople.add(personId);
          card.style.borderColor = '#8658ff';
          card.style.backgroundColor = 'rgba(134,88,255,0.1)';
        }

        // Update confirm button state
        if (selectedPeople.size > 0) {
          confirmBtn.disabled = false;
          confirmBtn.style.opacity = '1';
          confirmBtn.textContent = `Add ${selectedPeople.size} People`;
        } else {
          confirmBtn.disabled = true;
          confirmBtn.style.opacity = '0.5';
          confirmBtn.textContent = 'Add Selected People';
        }
      });

      // Add hover effect
      card.addEventListener('mouseenter', () => {
        if (!selectedPeople.has(card.dataset.personId)) {
          card.style.backgroundColor = 'rgba(134,88,255,0.05)';
        }
      });
      card.addEventListener('mouseleave', () => {
        if (!selectedPeople.has(card.dataset.personId)) {
          card.style.backgroundColor = 'rgba(255,255,255,0.05)';
        }
      });
    });

    // Add close handlers
    modal.querySelectorAll('.add-people-modal-close').forEach(btn => {
      btn.addEventListener('click', () => modal.remove());
    });
    modal.querySelector('.memory-detail-overlay').addEventListener('click', () => modal.remove());

    // Add confirm handler
    confirmBtn.addEventListener('click', async () => {
      if (selectedPeople.size > 0) {
        try {
          confirmBtn.disabled = true;
          confirmBtn.textContent = 'Adding People...';

          const selectedPeopleList = Array.from(selectedPeople).map(id => {
            const person = availablePeople.find(p => String(p.id) === id);
            return person;
          }).filter(Boolean);

          await tagPeopleToMemory(window._currentMemoryId, selectedPeopleList);

          // Check if any of the added people have HML fingerprints for sync
          const peopleWithFingerprints = selectedPeopleList.filter(person =>
            person.keyFingerprint || person.fingerprint
          );

          // Show success notification
          showNotification(`Successfully tagged ${selectedPeopleList.length} people to this memory!`, 'success');

          // Close modal
          modal.remove();

          // Refresh the people tab to show the newly tagged people
          refreshPeopleTab();

          // Offer HML sync if people have fingerprints
          if (peopleWithFingerprints.length > 0) {
            setTimeout(async () => {
              offerHMLSyncForTaggedPeople(peopleWithFingerprints, window._currentMemoryId);
            }, 1000);
          }

        } catch (error) {
          console.error('Failed to tag people:', error);
          showNotification('Failed to tag people: ' + error.message, 'error');

          // Re-enable button
          confirmBtn.disabled = false;
          confirmBtn.textContent = `Add ${selectedPeople.size} People`;
        }
      }
    });

    // Add escape key handler
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Show modal with animation
    setTimeout(() => modal.classList.add('active'), 10);

  } catch (error) {
    console.error('Failed to open add people modal:', error);
    window.emmaError('Had trouble loading the people list. Let\'s try again in a moment.', {
      title: 'Loading Issue',
      helpText: 'Sometimes these things take a moment to work.'
    });
  }
}

async function openPersonModal(personId) {
  try {
    // Load person data from storage
    const store = await chrome.storage.local.get(['emma_people']);
    const people = Array.isArray(store.emma_people) ? store.emma_people : [];
    const person = people.find(p => String(p.id) === String(personId));

    if (!person) {
      console.error('Person not found:', personId);
      return;
    }

    // Create simplified person modal
    const modal = document.createElement('div');
    modal.className = 'memory-detail-modal person-modal';
    modal.style.zIndex = '10000';

    const initials = (person.name || '?').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
    const avatar = person.profilePicture
      ? `<img src="${person.profilePicture}" style="width:80px; height:80px; object-fit:cover; border-radius:50%; margin-bottom:16px;"/>`
      : `<div style="width:80px; height:80px; background:#8658ff; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:24px; font-weight:600; margin-bottom:16px;">${initials}</div>`;

    modal.innerHTML = `
      <div class="memory-detail-overlay"></div>
      <div class="memory-detail-content" style="max-width: 480px;">
        <div class="memory-detail-header">
          <div style="display:flex; align-items:center; gap:16px;">
            ${avatar}
            <div>
              <h2 style="margin:0; color:#fff;">${escapeHtml(person.name || 'Unknown')}</h2>
              <p style="margin:4px 0 0 0; opacity:0.7;">${escapeHtml(person.relationship || 'Contact')}</p>
            </div>
          </div>
          <button class="close-btn person-modal-close">×</button>
        </div>
        <div style="padding: 20px;">
          ${person.email ? `<div style="margin-bottom:12px;"><strong>Email:</strong> ${escapeHtml(person.email)}</div>` : ''}
          ${person.phone ? `<div style="margin-bottom:12px;"><strong>Phone:</strong> ${escapeHtml(person.phone)}</div>` : ''}
          ${person.notes ? `<div style="margin-bottom:12px;"><strong>Notes:</strong> ${escapeHtml(person.notes)}</div>` : ''}
          ${person.keyFingerprint ? `
            <div style="margin-top:20px; padding:16px; background:rgba(134,88,255,0.1); border:1px solid rgba(134,88,255,0.3); border-radius:8px;">
              <strong style="color:#8658ff;">Cryptographic Identity</strong><br/>
              <code style="font-size:12px; color:#ffffff; word-break:break-all;">${escapeHtml(person.keyFingerprint)}</code>
            </div>
          ` : ''}
          <div style="margin-top:20px; display:flex; gap:8px; justify-content:flex-end;">
            <button class="btn secondary person-modal-close">Close</button>
            <button class="btn person-view-full" data-person-id="${person.id}">View Full Profile</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add close handlers
    modal.querySelectorAll('.person-modal-close').forEach(btn => {
      btn.addEventListener('click', () => modal.remove());
    });
    modal.querySelector('.memory-detail-overlay').addEventListener('click', () => modal.remove());

    // Add view full profile handler
    const viewFullBtn = modal.querySelector('.person-view-full');
    if (viewFullBtn) {
      viewFullBtn.addEventListener('click', () => {
        window.open(`people-emma.html?person=${person.id}`, '_blank');
      });
    }

    // Add escape key handler
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Show modal with animation
    setTimeout(() => modal.classList.add('active'), 10);

  } catch (error) {
    console.error('Failed to open person modal:', error);
  }
}

// Tag people to a memory
async function tagPeopleToMemory(memoryId, peopleList) {
  if (!memoryId || !peopleList || peopleList.length === 0) {
    throw new Error('Invalid memory ID or people list');
  }

  try {

    // Try multiple approaches to tag people, starting with the most comprehensive

    // Approach 1: Use background script API if available
    try {
      const result = await chrome.runtime.sendMessage({
        action: 'memory.tagPeople',
        memoryId: memoryId,
        people: peopleList.map(p => ({
          id: p.id,
          name: p.name,
          relationship: p.relationship || 'Contact',
          profilePicture: p.profilePicture
        }))
      });

      if (result && result.success) {

        return result;
      }
    } catch (error) {
      console.warn('⚠️ Background API tagging failed, trying direct storage:', error);
    }

    // Approach 2: Direct storage approach - store memory-people associations
    try {
      const storage = await chrome.storage.local.get(['emma_memory_people_tags']);
      const existingTags = storage.emma_memory_people_tags || {};

      // Initialize memory tags if not exist
      if (!existingTags[memoryId]) {
        existingTags[memoryId] = [];
      }

      // Add new people (avoid duplicates)
      const existingPeopleIds = new Set(existingTags[memoryId].map(p => String(p.id)));

      for (const person of peopleList) {
        if (!existingPeopleIds.has(String(person.id))) {
          existingTags[memoryId].push({
            id: person.id,
            name: person.name,
            relationship: person.relationship || 'Contact',
            profilePicture: person.profilePicture || null,
            taggedAt: new Date().toISOString()
          });
        }
      }

      // Save back to storage
      await chrome.storage.local.set({ emma_memory_people_tags: existingTags });

      return { success: true, method: 'direct_storage' };

    } catch (error) {
      console.error('❌ Direct storage tagging failed:', error);
      throw new Error(`Failed to tag people: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Tag people operation failed:', error);
    throw error;
  }
}

// Refresh the people tab to show updated people list
async function refreshPeopleTab() {
  try {

    const memoryId = window._currentMemoryId;
    if (!memoryId) {
      console.warn('⚠️ No current memory ID for refresh');
      return;
    }

    // Find the people tab content area
    const peopleTabBody = document.querySelector('.memory-detail-modal #memory-detail-body');
    if (!peopleTabBody) {
      console.warn('⚠️ People tab body not found');
      return;
    }

    // Check if people tab is currently active
    const peopleTabBtn = document.querySelector('.memory-detail-modal .tab-btn[data-tab="people"]');
    if (!peopleTabBtn || !peopleTabBtn.classList.contains('active')) {

      return;
    }

    // Reload people for current memory
    const memory = { id: memoryId };
    const updatedPeopleList = await loadPeople(memory);

    // Re-render people tab content
    peopleTabBody.innerHTML = renderPeople(updatedPeopleList);
    wirePeopleActions(peopleTabBody);

    // Update people count in tab
    const peopleCountEl = document.querySelector('.memory-detail-modal #tab-people-count');
    if (peopleCountEl) {
      peopleCountEl.textContent = String(updatedPeopleList.length);
    }

  } catch (error) {
    console.error('❌ Failed to refresh people tab:', error);
  }
}

// Enhanced loadPeople function to include tagged people
async function loadPeopleEnhanced(memory) {

  let base = [];
  try {
    const resp = await chrome.runtime.sendMessage({ action: 'memory.getPeople', id: memory.id });
    if (resp && resp.success && Array.isArray(resp.items)) base = resp.items;
  } catch {}

  // Load tagged people from our storage
  try {
    const storage = await chrome.storage.local.get(['emma_memory_people_tags']);
    const memoryTags = storage.emma_memory_people_tags || {};
    const taggedPeople = memoryTags[memory.id] || [];

    // Merge tagged people with base
    const existingIds = new Set(base.map(p => String(p.id)));
    for (const tagged of taggedPeople) {
      if (!existingIds.has(String(tagged.id))) {
        base.push(tagged);
        existingIds.add(String(tagged.id));
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to load tagged people:', error);
  }

  // Augment with collaborators from vault sharing for this capsule (existing logic)
  try {
    const store = await chrome.storage.local.get(['emma_vault_sharing', 'emma_people']);
    const records = Array.isArray(store.emma_vault_sharing) ? store.emma_vault_sharing : [];
    const people = Array.isArray(store.emma_people) ? store.emma_people : [];    const shared = records
      .filter(r => {

        const hasMemories = r && r.status !== 'revoked' && Array.isArray(r.memories);
        if (!hasMemories) {

          return false;
        }

        const hasThisMemory = r.memories.some(m => {

          return String(m.memoryId) === String(memory.id);
        });

        return hasThisMemory;
      })
      .map(r => {
        const person = people.find(p => parseInt(p.id) === parseInt(r.personId)) || { name: r.personName || 'Unknown', relationship: 'Collaborator' };
        const mem = r.memories.find(m => String(m.memoryId) === String(memory.id));
        return {
          id: r.personId,
          name: person.name || r.personName || 'Unknown',
          relationship: person.relationship || 'Collaborator',
          profilePicture: person.profilePicture || null,
          permission: (mem && mem.permission) || 'view'
        };
      });

    const merged = [...base];
    const seen = new Set(merged.map(p => String(p.id || p.name)));
    for (const s of shared) {
      const key = String(s.id || s.name);
      if (!seen.has(key)) { merged.push(s); seen.add(key); }
    }

    return merged;
  } catch (error) {
    console.error('❌ Error in loadPeopleEnhanced sharing lookup:', error);
    return base;
  }
}

async function saveMemoryEdits({ id, title, content }) {
  try {
    if (isDesktopVault) {
      const current = await window.emma.vault.getMemory({ id });
      const updated = {
        header: { ...(current.header || {}), id: id },
        core: { type: current.core?.type || 'conversation', content },
        semantic: { ...(current.semantic || {}) },
        relations: { ...(current.relations || {}) },
        metadata: { ...(current.metadata || {}), title },
      };
      const res = await window.emma.vault.storeMemory({ mtapMemory: updated });
      if (res && res.success) return res;
    } else {
      const resp = await chrome.runtime.sendMessage({ action: 'memory.update', id, updates: { title, content } });
      if (resp && resp.success) return resp;
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
  // Fallback: store in local overlay map if background lacks API
  try {
    const key = 'emma_memory_overrides';
    const cur = await chrome.storage.local.get([key]);
    const map = cur[key] || {};
    map[id] = { ...(map[id] || {}), ...(title ? { title } : {}), ...(content ? { content } : {}) };
    await chrome.storage.local.set({ [key]: map });
    return { success: true, localOnly: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function wireMediaActions(host, items) {
  const startBtn = host.querySelector('#slideshow-start');
  const thumbs = Array.from(host.querySelectorAll('.media-thumb'));
  const openAt = (idx) => openSlideshow(items, idx);
  if (startBtn) startBtn.addEventListener('click', () => openAt(0));
  thumbs.forEach(t => t.addEventListener('click', () => openAt(parseInt(t.dataset.idx, 10))));

  // Delete
  host.querySelectorAll('.media-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (!confirm('Delete this attachment?')) return;
      await chrome.runtime.sendMessage({ action: 'attachment.delete', id });
      const refreshed = await loadMedia({ id: window._currentMemoryId });
      host.innerHTML = renderMedia(refreshed);
      wireMediaActions(host, refreshed);
    });
  });

  // Rename/Caption (stores caption client-side in meta for now)
  host.querySelectorAll('.media-rename').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const caption = prompt('Enter caption/title for this media:');
      if (caption == null) return;
      // Use efficient attachment.update API
      const resp = await chrome.runtime.sendMessage({
        action: 'attachment.update',
        id,
        updates: { caption }
      });
      if (resp && resp.success) {
        const refreshed = await loadMedia({ id: window._currentMemoryId });
        host.innerHTML = renderMedia(refreshed);
        wireMediaActions(host, refreshed);
      }
    });
  });

  // Drag & drop import (MVP)
  const container = host.closest('.memory-detail-content');
  if (container && window._currentMemoryId) {
    container.addEventListener('dragover', (e) => { e.preventDefault(); });
    container.addEventListener('drop', async (e) => {
      e.preventDefault();
      const dt = e.dataTransfer;
      if (!dt || !dt.files || !dt.files.length) return;
      const file = dt.files[0];
      const dataUrl = await fileToDataUrl(file);
      const meta = { id: `att_${Date.now()}`, mime: file.type, size: file.size, type: file.type.startsWith('video') ? 'video' : 'image', capturedAt: new Date().toISOString(), capsuleId: window._currentMemoryId };
      await chrome.runtime.sendMessage({ action: 'attachment.add', meta, dataUrl });
      // Refresh
      const refreshed = await loadMedia({ id: window._currentMemoryId });
      host.innerHTML = renderMedia(refreshed);
      wireMediaActions(host, refreshed);
    });
  }
}

function openSlideshow(items, startIndex) {
  const wrap = document.createElement('div');
  wrap.className = 'slideshow-modal';
  wrap.innerHTML = `
    <div class="slideshow-frame">
      <button class="slide-close">×</button>
      <button class="slide-nav slide-prev">‹</button>
      <button class="slide-nav slide-next">›</button>
      <img class="slideshow-media" id="slide-media" />
    </div>`;
  document.body.appendChild(wrap);
  let index = startIndex || 0;
  async function render() {
    const img = wrap.querySelector('#slide-media');
    const att = items[index];
    // If we don't have a dataUrl, request the blob from background
    if (!att.url || att.url.startsWith('http')) {
      try {
        const resp = await chrome.runtime.sendMessage({ action: 'attachment.get', id: att.id });
        if (resp && resp.success && resp.dataUrl) {
          img.src = resp.dataUrl;
          return;
        }
      } catch {}
    }
    img.src = att.url;
  }
  const close = () => wrap.remove();
  wrap.querySelector('.slide-close').addEventListener('click', close);
  wrap.querySelector('.slide-prev').addEventListener('click', () => { index = (index - 1 + items.length) % items.length; render(); });
  wrap.querySelector('.slide-next').addEventListener('click', () => { index = (index + 1) % items.length; render(); });
  render();
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } catch (e) { reject(e); }
  });
}

// --- Share ---
function openShareModal(memory) {
  const wrap = document.createElement('div');
  wrap.className = 'share-modal';
  const shareUrl = location.origin + '/memories.html#' + encodeURIComponent(memory.id);
  wrap.innerHTML = `
    <div class="share-card">
      <div style="font-weight:700; margin-bottom:8px;">Share Memory</div>
      <input class="share-input" value="${shareUrl}" readonly />
      <div class="share-actions">
        <button class="btn" id="share-copy">Copy Link</button>
        <button class="btn secondary" id="share-close">Close</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  wrap.querySelector('#share-close').addEventListener('click', () => wrap.remove());
  wrap.querySelector('#share-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(shareUrl); } catch {}
  });
}

function closeMemoryDetail() {
  const modal = document.querySelector('.memory-detail-modal');
  if (modal) {
    modal.classList.remove('active');

    // Clean up escape key listener
    if (modal._escapeHandler) {
      document.removeEventListener('keydown', modal._escapeHandler);
    }

    setTimeout(async () => {
      modal.remove();
    }, 300);
  }
}

// Make it globally available
window.closeMemoryDetail = closeMemoryDetail;

function getTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {

  // Route by query param
  let isConstellation = false;
  try {
    const params = new URLSearchParams(window.location.search);
    isConstellation = params.get('view') === 'constellation';
  } catch {}

  if (isConstellation) {
    loadConstellationView();
  } else {
    loadMemories();
  }

  // 🌟 CRITICAL: Listen for new content events to auto-refresh constellation
  window.addEventListener('emmaMemoryAdded', (event) => {
    console.log('🌟 CONSTELLATION: Memory added event received, refreshing...');
    if (isConstellation || window.location.search.includes('constellation')) {
      setTimeout(() => loadConstellationView(), 500);
    }
  });

  window.addEventListener('emmaPersonAdded', (event) => {
    console.log('🌟 CONSTELLATION: Person added event received, refreshing...');
    if (isConstellation || window.location.search.includes('constellation')) {
      setTimeout(() => loadConstellationView(), 500);
    }
  });

  // Set up event listeners
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.addEventListener('input', filterMemories);
  const sourceFilter = document.getElementById('source-filter');
  if (sourceFilter) sourceFilter.addEventListener('change', filterMemories);
  const roleFilter = document.getElementById('role-filter');
  if (roleFilter) roleFilter.addEventListener('change', filterMemories);
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', () => {
    // In constellation mode, redraw instead of reloading gallery
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'constellation') {
      loadConstellationView();
    } else {
      refreshMemories();
    }
  });

  const backBtn = document.getElementById('back-btn');

  if (backBtn) {

    backBtn.style.pointerEvents = 'auto';
    backBtn.style.position = 'relative';
    backBtn.style.zIndex = '9999999';
    backBtn.style.backgroundColor = 'rgba(255, 0, 0, 0.3)'; // Red debug background
    backBtn.style.border = '2px solid red'; // Red debug border

    // Add multiple event listeners for maximum compatibility
    backBtn.addEventListener('click', (e) => {

      e.preventDefault();
      e.stopPropagation();

      try {
        // Desktop: open dashboard page if available, otherwise navigate to welcome
        if (window.location && window.location.href.includes('memories.html')) {

          window.location.href = 'welcome.html';
        } else {

          window.history.back();
        }
      } catch (error) {
        console.error('🔥 BACK BUTTON: Navigation error:', error);
        // As a last resort, navigate to welcome
        try {

          window.location.href = 'welcome.html';
        } catch {}
      }
    });

    // Add mouse event for extra debugging
    backBtn.addEventListener('mousedown', () => {

    });

    backBtn.addEventListener('mouseup', () => {

    });

  } else {
    console.error('🔥🔥🔥 BACK DEBUG: No back-btn element found!');
  }

  // Unlock button removed - use dashboard for vault management

  // Bind "Generate Sample Data" without inline handlers (CSP safe)
  const genBtn = document.getElementById('generate-sample-btn');
  if (genBtn) {
    genBtn.addEventListener('click', generateSampleMemories);
  }

  const createBtn = document.getElementById('create-memory-btn');
  if (createBtn) {

    createBtn.style.pointerEvents = 'auto';
    createBtn.style.position = 'relative';
    createBtn.style.zIndex = '9999999';
    createBtn.style.border = '2px solid blue'; // Blue debug border
  }

  // Clean button initialization
  const createBtn = document.getElementById('create-memory-btn');
  if (createBtn) {
    createBtn.addEventListener('click', () => {

      openCreateWizardModal();
    });

  }
  const emptyCreateBtn = document.getElementById('empty-create-btn');
  if (emptyCreateBtn) emptyCreateBtn.addEventListener('click', () => openCreateWizardModal());

  // Desktop: add audit viewer and lock status if available
  if (isDesktopVault) {
    injectHeaderLockStatus();
    injectAuditViewerButton();
    injectGuardianshipButton();
    setupIdleAutoLock();
  }

  // React to vault state changes to refresh UI immediately
  if (chrome && chrome.runtime && chrome.runtime.onMessage) {
    try {
      chrome.runtime.onMessage.addListener((request) => {
        if (request && request.action === 'vault.stateChanged') {

          updateVaultBanner(request.status);
          loadMemories();
        }
      });
    } catch (e) {
      console.error('🔐 Memories: Error setting up state listener:', e);
    }
  }
  // Auto-open wizard if requested
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === 'true' || params.get('create') === 'wizard') {
      setTimeout(() => openCreateWizardModal(), 300);
    }
  } catch {}
});

// Database diagnostic function
async function checkDatabaseModes() {
  try {

    // Check current MTAP setting
    const mtapSetting = localStorage.getItem('emma_use_mtap');

    // Get stats (shows what database the background is using)
    const statsResponse = await chrome.runtime.sendMessage({ action: 'getStats' });

    // Get MTAP status from background
    const mtapResponse = await chrome.runtime.sendMessage({ action: 'getMTAPStatus' });

    // Direct database check
    return new Promise((resolve) => {
      const dbRequest = indexedDB.open('EmmaLiteDB');

      dbRequest.onsuccess = (event) => {
        const db = event.target.result;
        const stores = Array.from(db.objectStoreNames);

        const counts = {};
        let completed = 0;

        stores.forEach(storeName => {
          if (storeName === 'memories' || storeName === 'mtap_memories') {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const countRequest = store.count();

            countRequest.onsuccess = () => {
              counts[storeName] = countRequest.result;
              completed++;

              if (completed === 2 || (completed === 1 && stores.length === 1)) {

                resolve(counts);
              }
            };
          }
        });
      };
    });

  } catch (error) {
    console.error('🔍 Database check failed:', error);
  }
}

// Make functions global for onclick handlers in HTML
window.generateSampleMemories = generateSampleMemories;
window.loadMemories = loadMemories;

// Live refresh: when background reports a new memory, reload the gallery
if (chrome && chrome.runtime && chrome.runtime.onMessage) {
  try {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.action === 'memory.created') {

        try { loadMemories(); } catch (e) { console.warn('Refresh failed:', e); }
      } else if (msg && msg.action === 'openMemoryById' && msg.memoryId) {

        try { openMemoryDetail(msg.memoryId); } catch (e) { console.warn('Open modal failed:', e); }
      }
    });
  } catch (e) {
    console.warn('Memories: could not attach live refresh listener:', e);
  }
}
window.refreshMemories = refreshMemories;
window.filterMemories = filterMemories;
window.checkDatabaseModes = checkDatabaseModes;

// Export for debugging
window.memoryGallery = {
  loadMemories,
  allMemories: () => allMemories,
  generateSampleMemories,
  filterMemories,
  refreshMemories,
  createNewCapsuleFlow
};window.debugVaultState = async function() {

  try {

    const status = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });

    if (status && status.success) {    }

    const list = await chrome.runtime.sendMessage({ action: 'vault.listCapsules', limit: 5 });

    const storage = await chrome.storage.local.get([
      'emma_vault_initialized',
      'emma_vault_settings',
      'emma_vault_session',
      'emma_vault_state'
    ]);

    const debug = await chrome.runtime.sendMessage({ action: 'vault.debug' });

  } catch (e) {
    console.error('🔍 Debug error:', e);
  }

};

console.log('🔍 Debug function added. Run debugVaultState() in console to test vault state.');

// Update vault banner based on status
function updateVaultBanner(status) {
  const vaultBanner = document.getElementById('vault-banner');
  if (!vaultBanner || !status) return;

  if (!status.initialized) {
    vaultBanner.style.display = 'block';
    vaultBanner.style.background = 'linear-gradient(90deg, rgba(244,63,94,0.15) 0%, rgba(239,68,68,0.15) 100%)';
    vaultBanner.style.border = '1px solid rgba(244,63,94,0.3)';
    vaultBanner.textContent = '🔧 Vault not set up · Complete setup to secure your memories';
  } else if (!status.isUnlocked) {
    vaultBanner.style.display = 'block';
    vaultBanner.style.background = 'linear-gradient(90deg, rgba(244,63,94,0.15) 0%, rgba(239,68,68,0.15) 100%)';
    vaultBanner.style.border = '1px solid rgba(244,63,94,0.3)';
    if (status.hasValidSession) {
      vaultBanner.textContent = '🔄 Vault session expired · Re-unlock to see encrypted capsules';
    } else {
      vaultBanner.textContent = '🔒 Vault locked · Unlock to see encrypted capsules';
    }
  } else {
    vaultBanner.style.display = 'block';
    vaultBanner.style.background = 'rgba(16,185,129,0.15)';
    vaultBanner.style.border = '1px solid rgba(16,185,129,0.3)';
    const sessionText = status.sessionExpiresAt ?
      ` (session expires ${new Date(status.sessionExpiresAt).toLocaleTimeString()})` : '';
    vaultBanner.textContent = `🔐 Vault unlocked · Encrypted capsules available${sessionText}`;
  }
}

// Create new capsule via prompts (quick MVP)
async function createNewCapsuleFlow() {
  // Backward-compatible alias; now opens the full wizard
  openCreateWizardModal();
}

// --- Wizard Modal (vanilla) ---
function openCreateWizardModal() {
  // Brand styles (injected once)
  if (!document.getElementById('emma-wizard-styles')) {
    const s = document.createElement('style');
    s.id = 'emma-wizard-styles';
    s.textContent = `
      .emma-wizard-overlay { position: fixed; inset: 0; background: rgba(6,4,20,0.78); backdrop-filter: blur(10px) saturate(115%); z-index: 99999; display: grid; place-items: center; }
      .emma-wizard { width: 760px; max-width: 96vw; color: var(--emma-text, #fff); background: rgba(20,16,40,0.96); border: 1px solid rgba(160,140,255,0.25); border-radius: 16px; box-shadow: 0 24px 80px rgba(0,0,0,0.55); display: grid; grid-template-rows: auto 1fr auto; }
      .emma-wiz-header { display:flex; align-items:center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); }
      .emma-wiz-title { display:flex; align-items:center; gap: 10px; }
      .emma-wiz-title .name { font-weight: 800; font-size: 16px; letter-spacing: .3px; }
      .emma-wiz-sub { font-size: 12px; color: var(--emma-text-secondary, rgba(255,255,255,0.7)); }
      .emma-wiz-close { background: transparent; border: 0; color: var(--emma-text-secondary, #cfcfe6); font-size: 20px; cursor: pointer; }
      .emma-wiz-body { padding: 16px 16px 8px 16px; max-height: 70vh; overflow: auto; }
      .emma-wiz-footer { padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.08); display:flex; justify-content: space-between; gap: 8px; }
      .emma-wiz-steps { height: 4px; background: rgba(255,255,255,0.08); border-radius: 999px; overflow: hidden; margin-top: 8px; }
      .emma-wiz-progress { height: 100%; width: 33%; background: var(--emma-gradient-1, linear-gradient(135deg,#667eea,#764ba2 50%,#f093fb)); transition: width .25s ease; }
      .emma-field { display:grid; gap:6px; margin-bottom: 12px; }
      .emma-field label { font-size: 12px; color: var(--emma-text-secondary, rgba(255,255,255,0.7)); }
      .emma-input, .emma-textarea, .emma-select { border-radius: 10px; border: 1px solid var(--emma-border, rgba(255,255,255,0.12)); background: rgba(255,255,255,0.06); color: var(--emma-text, #fff); padding: 10px 12px; font: inherit; }
      .emma-chips { display:flex; flex-wrap: wrap; gap: 8px; margin: 6px 0 12px 0; }
      .emma-chip { background: rgba(255,255,255,0.06); border:1px solid var(--emma-border, rgba(255,255,255,0.12)); color: var(--emma-text,#fff); padding: 6px 10px; border-radius: 999px; font-size: 12px; cursor: pointer; }
      .emma-chip:hover { border-color: var(--emma-purple, #764ba2); transform: translateY(-1px); }
      .emma-uploader { border:1px dashed rgba(255,255,255,0.25); border-radius:12px; padding:16px; text-align:center; }
      .emma-grid { margin-top:12px; display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:12px; }
      .emma-grid .itm { background: rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:10px; display:flex; flex-direction:column; gap:8px; }
      .emma-btn { background: var(--emma-gradient-2, linear-gradient(135deg,#4f46e5,#7c3aed 50%,#a855f7)); color:#fff; border: none; border-radius: 10px; padding: 8px 12px; cursor: pointer; }
      .emma-btn.secondary { background: rgba(255,255,255,0.06); color: var(--emma-text,#fff); border:1px solid var(--emma-border, rgba(255,255,255,0.12)); }
      .emma-actions { display:flex; gap:8px; }
      .emma-row { display:flex; gap:12px; }
      .emma-mic { background: rgba(255,255,255,0.06); border:1px solid var(--emma-border, rgba(255,255,255,0.12)); color: var(--emma-text,#fff); border-radius: 10px; padding: 8px 12px; cursor: pointer; }
      .emma-mic[aria-pressed="true"] { outline: 2px solid var(--emma-purple, #764ba2); }
    `;
    document.head.appendChild(s);
  }

  // Build modal shell (brand)
  const wrap = document.createElement('div');
  wrap.className = 'emma-wizard-overlay';
  wrap.innerHTML = `
    <div class="emma-wizard">
      <div class="emma-wiz-header">
        <div class="emma-wiz-title">
          <div class="emma-orb-container small" id="wiz-orb" style="width:28px;height:28px;"></div>
          <div>
            <div class="name">Create Memory</div>
            <div id="wiz-step-sub" class="emma-wiz-sub">Step 1 of 3</div>
          </div>
        </div>
        <button id="wiz-close" class="emma-wiz-close">✕</button>
      </div>
      <div class="emma-wiz-body">
        <div class="emma-wiz-steps"><div id="wiz-progress" class="emma-wiz-progress" style="width:33%"></div></div>
        <div id="wiz-body" style="margin-top:12px;"></div>
      </div>
      <div class="emma-wiz-footer">
        <div><button id="wiz-back" class="emma-btn secondary">Back</button></div>
        <div class="emma-actions">
          <button id="wiz-cancel" class="emma-btn secondary">Cancel</button>
          <button id="wiz-next" class="emma-btn">Next</button>
          <button id="wiz-create" class="emma-btn" style="display:none;">Create Capsule</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  try { if (window.EmmaOrb) new EmmaOrb(wrap.querySelector('#wiz-orb'), { hue: 270, hoverIntensity: .35, rotateOnHover: false, forceHoverState: true }); } catch {}

  // State
  let step = 1;
  let title = '';
  let description = '';
  let category = 'general';
  let tags = '';
  /** @type {{file:File, name:string, size:number, type:string, caption:string, preview:string}[]} */
  let files = [];

  const sub = wrap.querySelector('#wiz-step-sub');
  const body = wrap.querySelector('#wiz-body');
  const btnBack = wrap.querySelector('#wiz-back');
  const btnNext = wrap.querySelector('#wiz-next');
  const btnCreate = wrap.querySelector('#wiz-create');
  wrap.querySelector('#wiz-close').addEventListener('click', () => wrap.remove());
  wrap.querySelector('#wiz-cancel').addEventListener('click', () => wrap.remove());

  function render() {
    if (sub) sub.textContent = `Step ${step} of 3`;
    const progress = wrap.querySelector('#wiz-progress');
    if (progress) progress.style.width = `${Math.max(33, Math.min(100, step * 33))}%`;
    btnBack.style.visibility = step > 1 ? 'visible' : 'hidden';
    btnNext.style.display = step < 3 ? 'inline-block' : 'none';
    btnCreate.style.display = step === 3 ? 'inline-block' : 'none';
    if (step === 1) {
      body.innerHTML = `
        <div class="emma-field"><label>Title</label><input class="emma-input" id="wiz-title" type="text" placeholder="Give this memory a title"/></div>
        <div class="emma-field"><label>Description</label><textarea class="emma-textarea" id="wiz-desc" rows="4" placeholder="Describe this moment"></textarea></div>
        <div class="emma-row">
          <div class="emma-field" style="flex:1"><label>Category</label>
            <select class="emma-select" id="wiz-cat">
              <option value="general">General</option>
              <option value="photos">Photos</option>
              <option value="videos">Videos</option>
              <option value="notes">Notes</option>
              <option value="work">Work</option>
              <option value="personal">Personal</option>
            </select>
          </div>
          <div class="emma-field" style="flex:2"><label>Tags</label><input class="emma-input" id="wiz-tags" type="text" placeholder="Comma-separated tags"/></div>
        </div>
        <div class="emma-chips" id="wiz-suggest">
          <div class="emma-chip" data-val="family">#family</div>
          <div class="emma-chip" data-val="vintage">#vintage</div>
          <div class="emma-chip" data-val="childhood">#childhood</div>
        </div>`;
      body.querySelector('#wiz-title').value = title;
      body.querySelector('#wiz-desc').value = description;
      body.querySelector('#wiz-cat').value = category;
      body.querySelector('#wiz-tags').value = tags;
      body.querySelectorAll('#wiz-suggest .emma-chip').forEach(ch => ch.addEventListener('click', () => {
        const v = ch.getAttribute('data-val');
        const cur = body.querySelector('#wiz-tags').value.trim();
        body.querySelector('#wiz-tags').value = cur ? `${cur}, ${v}` : v;
        tags = body.querySelector('#wiz-tags').value;
      }));
      body.querySelector('#wiz-title').addEventListener('input', e => title = e.target.value);
      body.querySelector('#wiz-desc').addEventListener('input', e => description = e.target.value);
      body.querySelector('#wiz-cat').addEventListener('change', e => category = e.target.value);
      body.querySelector('#wiz-tags').addEventListener('input', e => tags = e.target.value);
    } else if (step === 2) {
      body.innerHTML = `
        <div class="emma-uploader">
          <input id="wiz-file" type="file" multiple accept="image/*,video/*" style="display:none"/>
          <div style="margin-bottom:8px">Add photos or videos</div>
          <button id="wiz-file-btn" class="emma-btn">Select Files</button>
        </div>
        <div id="wiz-grid" class="emma-grid"></div>`;
      const fileBtn = body.querySelector('#wiz-file-btn');
      const fileInput = body.querySelector('#wiz-file');
      fileBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async (e) => {
        const list = Array.from(e.target.files || []);
        for (const f of list) {
          const url = URL.createObjectURL(f);
          files.push({ file: f, name: f.name, size: f.size, type: f.type, caption: '', preview: url });
        }
        renderGrid();
      });
      renderGrid();
    } else {
      const tagList = (tags || '').split(',').map(t => t.trim()).filter(Boolean);
      body.innerHTML = `
        <div style="display:grid; gap:8px;">
          <div><strong>Title:</strong> ${escapeHtml(title || '(none)')}</div>
          <div><strong>Description:</strong> ${escapeHtml(description || '(none)')}</div>
          <div><strong>Category:</strong> ${escapeHtml(category)}</div>
          <div><strong>Tags:</strong> ${tagList.length ? escapeHtml(tagList.join(', ')) : '(none)'}</div>
          <div><strong>Attachments:</strong> ${files.length}</div>
        </div>`;
    }
  }

  // Listen for dementia setting changes to refresh orb behavior (legacy storage event)
  try {
    window.addEventListener('storage', (e) => {
      if (!e || !e.key) return;
      if (e.key.startsWith('dementia.') || e.key === 'dementia.settings.bump') {
        try {
          if (window._emmaDementia && typeof window._emmaDementia.loadSettings === 'function') {
            window._emmaDementia.loadSettings().then(() => {
              if (window._emmaDementia.isEnabledForVault) {
                window._emmaDementia.updateOrbState('idle');
              }
            });
          }
        } catch {}
      }
    });
  } catch {}

  // Also listen for explicit background broadcast
  try {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.action === 'settings.changed' && Array.isArray(msg.keys)) {
        const hasDementia = msg.keys.some(k => (k || '').startsWith('dementia.'));
        if (hasDementia && window._emmaDementia && window._emmaDementia.loadSettings) {
          window._emmaDementia.loadSettings().then(() => window._emmaDementia.updateOrbState('idle')).catch(() => {});
        }
      }
    });
  } catch {}

  function renderGrid() {
    const grid = body.querySelector('#wiz-grid');
    if (!grid) return;
    grid.innerHTML = files.map(att => `
      <div class="itm" data-id="${att.name}" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:10px; display:flex; flex-direction:column; gap:8px;">
        ${att.type.startsWith('image') ? `<img src="${att.preview}" style="width:100%; height:100px; object-fit:cover; border-radius:8px"/>` : `<div style="height:100px; display:grid; place-items:center; background:rgba(0,0,0,0.3); border-radius:8px">🎥</div>`}
        <div style="font-size:12px; opacity:.8">${escapeHtml(att.name)}</div>
        <div style="font-size:12px; opacity:.6">${(att.size/1024/1024).toFixed(1)} MB</div>
        <input class="cap" type="text" placeholder="Caption" style="font-size:12px"/>
        <button class="rm btn secondary" type="button">Remove</button>
      </div>
    `).join('');
    grid.querySelectorAll('.cap').forEach((el, idx) => el.addEventListener('input', e => files[idx].caption = e.target.value));
    grid.querySelectorAll('.rm').forEach((btn, idx) => btn.addEventListener('click', () => { files.splice(idx,1); renderGrid(); }));
  }

  btnBack.addEventListener('click', () => { step = Math.max(1, step - 1); render(); });
  btnNext.addEventListener('click', () => { step = Math.min(3, step + 1); render(); });
  btnCreate.addEventListener('click', saveWizard);
  render();

  async function saveWizard() {
    try {
      btnCreate.disabled = true; btnNext.disabled = true; btnBack.disabled = true;
      const tagList = (tags || '').split(',').map(t => t.trim()).filter(Boolean);
      let newMemoryId = null;
      if (isDesktopVault) {
        // MTAP-compliant create via vault
        const mtap = {
          header: { id: `mem_${Date.now()}`, created: Date.now(), version: '1.0.0', protocol: 'MTAP/1.0' },
          core: { type: files.length ? 'media' : 'note', content: description || title || '(Untitled memory)' },
          semantic: { summary: (description || title || '').slice(0, 120), keywords: tagList },
          relations: {},
          metadata: { title: title || undefined, category, tags: tagList, createdVia: 'CreateMemoryWizardModal' }
        };
        // Persist via secure preload API (bridge to main -> vault-service.storeMTAPMemory)
        const save = await window.emmaAPI?.vault?.storeMemory
          ? await window.emmaAPI.vault.storeMemory({ mtapMemory: mtap })
          : await window.emma.vault.storeMemory({ mtapMemory: mtap });
        if (!save || !save.success) throw new Error(save?.error || 'Failed to create memory');
        newMemoryId = save.id || mtap.header.id;
      } else {
        // 🔥 CRITICAL FIX: Use fixed web vault system instead of extension background
        console.log('💾 WIZARD: Using fixed web vault system for memory creation');
        
        if (!window.emmaWebVault || !window.emmaWebVault.isOpen) {
          throw new Error('Vault not available. Please unlock your .emma vault first.');
        }
        
        const payload = {
          content: description || title || '(Untitled memory)',
          metadata: { 
            title: title || undefined, 
            category, 
            tags: tagList, 
            createdVia: 'CreateMemoryWizardModal',
            source: 'manual',
            type: files.length ? 'media' : 'note'
          },
          attachments: [] // Will be processed separately below
        };
        
        // Use fixed vault system with .emma file sync
        const save = await window.emmaWebVault.addMemory(payload);
        if (!save || !save.success) throw new Error(save?.error || 'Failed to create memory');
        newMemoryId = save.memory?.id || `mem_${Date.now()}`;
      }

      // Desktop attachments
      if (isDesktopVault && files.length && newMemoryId) {
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const dataUrl = await fileToDataUrl(f.file);
          await window.emma.vault.addAttachment({
            memoryId: newMemoryId,
            mime: f.type || 'application/octet-stream',
            dataUrl,
            meta: { caption: f.caption || '', capturedAt: new Date().toISOString() }
          });
        }
      }

      wrap.remove();
      showNotification('✅ Capsule created');
      await loadMemories();
    } catch (e) {
      showNotification('Failed to create capsule: ' + e.message, 'error');
      btnCreate.disabled = false; btnNext.disabled = false; btnBack.disabled = false;
    }
  }
}

