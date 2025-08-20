/**
 * Enhanced HML Modal Functions
 * Provides tab navigation and sync management for the HML control panel
 */

// Global state
let hmlManager = null; // Will be set by popup.js

// Set HML manager reference (called from popup.js)
export function setHmlManager(hmlSync) {
  hmlManager = hmlSync;
  console.log('[HML Enhanced] Manager reference set:', !!hmlManager?.manager);
}

// Ensure HML manager is initialized (lazy init to avoid race conditions)
async function ensureHmlManagerInitialized() {
  try {
    // Already initialized and has a manager instance
    if (hmlManager?.manager) return hmlManager.manager;

    // If wrapper exists but not initialized yet, try to initialize
    if (!hmlManager) hmlManager = { initialized: false, manager: null };

    // Load identity
    const result = await chrome.storage.local.get(['emma_my_identity']);
    const myIdentity = result.emma_my_identity;
    if (!myIdentity) {
      throw new Error('HML Sync not initialized. Please create an identity first.');
    }

    // Dynamically import P2P components and initialize
    const { P2PManager } = await import('./p2p/p2p-manager.js');
    const { BulletinBoardManager } = await import('./p2p/bulletin-board.js');
    const bulletinBoard = new BulletinBoardManager({ useMock: false });
    const p2p = new P2PManager(bulletinBoard);

    try { await p2p.initialize(myIdentity); } catch {}

    hmlManager.manager = p2p;
    hmlManager.initialized = true;
    console.log('[HML Enhanced] Lazy-initialized HML manager');
    return p2p;
  } catch (e) {
    console.warn('[HML Enhanced] Failed to ensure manager initialization:', e);
    throw e;
  }
}

// Tab system initialization
export function initializeTabs() {
  const tabs = document.querySelectorAll('.hml-tab');
  const panels = document.querySelectorAll('.hml-tab-panel');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Update active states
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(`tab-${targetTab}`).classList.add('active');
      
      // Load tab-specific content
      if (targetTab === 'sync') updateSyncStats();
      else if (targetTab === 'peers') updatePeersTab();
      else if (targetTab === 'settings') updateSettingsTab();
      else if (targetTab === 'cloud') {
        // Navigate to Emma Cloud page
        try {
          chrome.tabs.create({ url: chrome.runtime.getURL('emma-cloud.html') });
        } catch (error) {
          console.error('Failed to open Emma Cloud:', error);
          window.showNotification?.('Emma Cloud page not found', 'error');
        }
      }
    });
  });
  
  // Wire up sync tab actions
  const syncNowBtn = document.getElementById('hml-sync-now');
  if (syncNowBtn) {
    syncNowBtn.onclick = async () => {
      try {
        // Force sync all vaults
        const handlers = hmlManager?.manager?.syncHandlers || new Map();
        for (const [vaultId, handler] of handlers) {
          await handler.performSync();
        }
        window.showNotification?.('Sync initiated for all vaults', 'success');
        updateSyncStats();
      } catch (error) {
        window.showNotification?.('Sync failed', 'error');
      }
    };
  }
  
  // Wire up peers tab actions
  const shareBtn = document.getElementById('hml-share-fp');
  if (shareBtn) {
    shareBtn.onclick = async () => {
      const fp = document.getElementById('hml-fingerprint')?.textContent;
      if (fp && navigator.share) {
        try {
          await navigator.share({
            title: 'My Emma HML Identity',
            text: `Add me on Emma: ${fp}`
          });
        } catch (e) {
          // User cancelled or share failed
        }
      }
    };
  }
  
  const addPeerBtn = document.getElementById('hml-add-peer');
  if (addPeerBtn) {
    addPeerBtn.onclick = async () => {
      const fp = prompt('Enter the full fingerprint of the peer you want to connect to:\n\n(You can get this from their Emma extension under Peers > Your Identity)');
      if (fp && fp.trim()) {
        try {
          await addPeerToMonitor(fp.trim());
          window.showNotification?.('Peer added! Monitoring for connections...', 'success');
          updatePeersList();
          
          // Show helpful next steps
          setTimeout(() => {
            if (confirm('Peer added successfully!\n\nNext steps:\n1. Ask the peer to add your fingerprint too\n2. One of you can share a vault to establish connection\n\nWould you like to see your fingerprint to share with them?')) {
              // Focus on the identity card
              const identityCard = document.querySelector('.hml-identity-card');
              if (identityCard) {
                identityCard.scrollIntoView({ behavior: 'smooth' });
                identityCard.style.animation = 'pulse 0.5s ease-in-out';
              }
            }
          }, 1000);
          
        } catch (error) {
          window.showNotification?.('Failed to add peer: ' + error.message, 'error');
        }
      }
    };
  }
  
  // Wire up settings actions
  const autoSyncToggle = document.getElementById('hml-auto-sync');
  if (autoSyncToggle) {
    autoSyncToggle.onchange = async (e) => {
      await chrome.storage.local.set({ emma_hml_auto_sync: e.target.checked });
      window.showNotification?.('Auto-sync setting updated', 'success');
    };
  }
  
  const syncIntervalSelect = document.getElementById('hml-sync-interval');
  if (syncIntervalSelect) {
    syncIntervalSelect.onchange = async (e) => {
      const interval = parseInt(e.target.value);
      await chrome.storage.local.set({ emma_hml_sync_interval: interval });
      
      // Update sync handlers with new interval
      if (hmlManager?.manager?.syncHandlers) {
        for (const [vaultId, handler] of hmlManager.manager.syncHandlers) {
          if (handler.syncInterval) {
            clearInterval(handler.syncInterval);
            if (interval > 0) {
              handler.syncInterval = setInterval(() => handler.performSync(), interval * 1000);
            }
          }
        }
      }
      
      window.showNotification?.(`Sync interval updated to ${interval === 0 ? 'manual only' : `every ${interval}s`}`, 'success');
    };
  }
  
  const testConnectionBtn = document.getElementById('hml-test-connection');
  if (testConnectionBtn) {
    testConnectionBtn.onclick = async () => {
      try {
        // Test bulletin board connection
        const result = await hmlManager?.manager?.bulletinBoard?.post?.('hml-test', { 
          type: 'connection-test', 
          timestamp: Date.now() 
        });
        window.appendHmlBoardLog?.(`✅ Bulletin board test: ${result?.id || 'OK'}`);
        
        // Show monitored peers and channels
        const monitoredPeers = await getMonitoredPeers();
        window.appendHmlBoardLog?.(`📋 Monitoring ${monitoredPeers.length} peers`);
        
        if (hmlManager?.manager?.pollingChannels) {
          const channels = Array.from(hmlManager.manager.pollingChannels);
          window.appendHmlBoardLog?.(`📡 Polling ${channels.length} channels`);
          
          // Test each channel for recent messages
          for (let i = 0; i < Math.min(channels.length, 3); i++) {
            const channel = channels[i];
            try {
              const messages = await hmlManager.manager.bulletinBoard.get(channel, {
                since: Date.now() - (24 * 60 * 60 * 1000)
              });
              window.appendHmlBoardLog?.(`📨 Channel ${channel.slice(0, 8)}...: ${messages.length} messages`);
            } catch (e) {
              window.appendHmlBoardLog?.(`❌ Channel ${channel.slice(0, 8)}...: ${e.message}`);
            }
          }
        }
        
      } catch (e) {
        window.appendHmlBoardLog?.(`❌ Connection test failed: ${e.message}`);
      }
    };
  }
}

// Update sync statistics
export async function updateSyncStats() {
  try {
    // Update connection status
    const statusIndicator = document.getElementById('hml-status-indicator');
    const statusMain = document.getElementById('hml-status-main');
    const statusDetail = document.getElementById('hml-status-detail');
    
    const activeConnections = hmlManager?.manager?.connectionManager?.getActiveConnections?.() || [];
    const connectedPeers = activeConnections.filter(c => c.state === 'CONNECTED').length;
    
    if (connectedPeers > 0) {
      statusIndicator.className = 'hml-status-indicator connected';
      statusMain.textContent = `Connected to ${connectedPeers} peer${connectedPeers > 1 ? 's' : ''}`;
      statusDetail.textContent = 'Syncing enabled';
    } else {
      statusIndicator.className = 'hml-status-indicator';
      statusMain.textContent = 'Not connected';
      statusDetail.textContent = 'Waiting for peers';
    }
    
    // Get sync statistics
    const vaults = hmlManager?.manager?.syncHandlers || new Map();
    const activeVaults = vaults.size;
    
    // Get total synced memories count
    let totalSynced = 0;
    const syncStats = await chrome.storage.local.get(['emma_sync_stats']);
    if (syncStats.emma_sync_stats) {
      totalSynced = syncStats.emma_sync_stats.totalSynced || 0;
    }
    
    // Get last sync time
    let lastSync = 'Never';
    if (syncStats.emma_sync_stats?.lastSync) {
      const lastSyncTime = new Date(syncStats.emma_sync_stats.lastSync);
      const now = new Date();
      const diff = now - lastSyncTime;
      
      if (diff < 60000) lastSync = 'Just now';
      else if (diff < 3600000) lastSync = `${Math.floor(diff / 60000)}m ago`;
      else if (diff < 86400000) lastSync = `${Math.floor(diff / 3600000)}h ago`;
      else lastSync = lastSyncTime.toLocaleDateString();
    }
    
    // Update UI
    document.getElementById('hml-active-vaults').textContent = activeVaults;
    document.getElementById('hml-total-synced').textContent = totalSynced;
    document.getElementById('hml-last-sync').textContent = lastSync;
    
    // Update vault list
    updateVaultList();
    
  } catch (error) {
    console.error('Failed to update sync stats:', error);
  }
}

// Update vault list
async function updateVaultList() {
  const vaultList = document.getElementById('hml-vault-list');
  if (!vaultList) return;
  
  try {
    const result = await chrome.storage.local.get(['emma_shared_vaults', 'emma_vault_registry']);
    const sharedVaults = result.emma_shared_vaults || {};
    const vaultRegistry = result.emma_vault_registry || {};
    
    if (Object.keys(sharedVaults).length === 0) {
      vaultList.innerHTML = `
        <div class="hml-empty-state">
          <i class="material-icons">folder_open</i>
          <p>No vaults are currently syncing</p>
          <span>Share a vault with someone to start syncing</span>
        </div>
      `;
    } else {
      const vaultItems = [];
      
      for (const [vaultId, info] of Object.entries(sharedVaults)) {
        const vaultInfo = vaultRegistry[vaultId] || {};
        const peerCount = (info.sharedWith?.length || 0) + (info.sharedBy ? 1 : 0);
        
        vaultItems.push(`
          <div class="hml-vault-item" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div class="hml-vault-info" style="flex: 1; min-width: 0;">
              <div class="hml-vault-name" style="font-size: 12px; font-weight: 500; color: #fff; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis;">${vaultInfo.name || info.name || 'Shared Vault'}</div>
              <div class="hml-vault-stats" style="font-size: 10px; color: rgba(255,255,255,0.6);">
                <span>${peerCount} peer${peerCount !== 1 ? 's' : ''}</span>
                <span style="margin: 0 6px;">•</span>
                <span>${info.permissions || 'viewer'}</span>
              </div>
            </div>
            <button class="hml-icon-btn" onclick="window.syncVault?.('${vaultId}')" title="Sync now" style="margin-left: 8px;">
              ⟳
            </button>
          </div>
        `);
      }
      
      vaultList.innerHTML = vaultItems.join('');
    }
  } catch (error) {
    console.error('Failed to update vault list:', error);
  }
}

// Make syncVault available globally for onclick
window.syncVault = async (vaultId) => {
  try {
    const handler = hmlManager?.manager?.syncHandlers?.get(vaultId);
    if (handler) {
      await handler.performSync();
      window.showNotification?.('Vault sync initiated', 'success');
    }
  } catch (error) {
    window.showNotification?.('Sync failed', 'error');
  }
};

// Update peers tab
export function updatePeersTab() {
  window.renderHmlIdentity?.();
  updatePeersList();
  updateInvitesList();
}

// Restore monitored peers to P2P manager (called on initialization)
async function restoreMonitoredPeers() {
  if (!hmlManager?.manager) return;
  
  try {
    const monitoredPeers = await getMonitoredPeers();
    for (const fingerprint of monitoredPeers) {
      await hmlManager.manager.addPeerToMonitor(fingerprint);
      console.log('[HML] Restored monitored peer:', fingerprint.slice(0, 16) + '...');
    }
    if (monitoredPeers.length > 0) {
      console.log('[HML] Restored', monitoredPeers.length, 'monitored peers');
    }
  } catch (error) {
    console.error('[HML] Failed to restore monitored peers:', error);
  }
}

// Update peers list with enhanced display
async function updatePeersList() {
  const peersContainer = document.getElementById('hml-peers');
  if (!peersContainer) return;
  
  // Ensure monitored peers are restored (after manager ready)
  try { await ensureHmlManagerInitialized(); } catch {}
  await restoreMonitoredPeers();
  
  const active = hmlManager?.manager?.connectionManager?.getActiveConnections?.() || [];
  const monitoredPeers = await getMonitoredPeers();
  
  if (active.length === 0 && monitoredPeers.length === 0) {
    peersContainer.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.4); padding: 40px;">No peers connected</div>';
    return;
  }
  
  const peerCards = [];
  
  // Add active connections
  for (const conn of active) {
    const isConnected = conn.state === 'CONNECTED';
    const stats = conn.stats || {};
    
    peerCards.push(`
      <div class="hml-peer-card" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 11px; font-family: monospace; color: #b0b0d0; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis;">${(conn.peerFingerprint || '').slice(0, 12)}...</div>
            <div style="display: flex; align-items: center; gap: 6px; font-size: 9px;">
              <span style="padding: 2px 6px; border-radius: 8px; font-weight: 500; ${isConnected ? 'background: rgba(76,217,100,0.2); color: #4cd964;' : 'background: rgba(255,59,48,0.2); color: #ff3b30;'}">${conn.state}</span>
              <span style="color: rgba(255,255,255,0.5);">${conn.pc?.iceConnectionState || 'unknown'}</span>
            </div>
          </div>
          <button class="hml-icon-btn" onclick="window.removePeer?.('${conn.peerFingerprint}')" title="Remove peer" style="margin-left: 8px;">
            ✕
          </button>
        </div>
      </div>
    `);
  }
  
  // Add monitored but not connected peers
  for (const fp of monitoredPeers) {
    if (!active.find(c => c.peerFingerprint === fp)) {
      peerCards.push(`
        <div class="hml-peer-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px; opacity: 0.7;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 11px; font-family: monospace; color: #b0b0d0; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis;">${fp.slice(0, 12)}...</div>
              <div style="font-size: 9px; color: rgba(255,255,255,0.4);">Monitoring</div>
            </div>
            <button class="hml-icon-btn" onclick="window.removePeer?.('${fp}')" title="Stop monitoring" style="margin-left: 8px;">
              ✕
            </button>
          </div>
        </div>
      `);
    }
  }
  
  peersContainer.innerHTML = peerCards.join('');
  
  // Update peer count badge
  const peerCount = active.filter(c => c.state === 'CONNECTED').length;
  const badge = document.getElementById('hml-peers-badge');
  if (badge) {
    if (peerCount > 0) {
      badge.textContent = peerCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Get monitored peers
async function getMonitoredPeers() {
  try {
    const result = await chrome.storage.local.get(['emma_monitored_peers']);
    return result.emma_monitored_peers || [];
  } catch {
    return [];
  }
}

// Remove peer function
window.removePeer = async (fingerprint) => {
  try {
    // Remove from monitored peers
    const result = await chrome.storage.local.get(['emma_monitored_peers']);
    const peers = result.emma_monitored_peers || [];
    const updated = peers.filter(fp => fp !== fingerprint);
    await chrome.storage.local.set({ emma_monitored_peers: updated });
    
    // Close connection if active
    const conn = hmlManager?.manager?.connectionManager?.getConnection?.(fingerprint);
    if (conn) {
      conn.close?.();
    }
    
    window.showNotification?.('Peer removed', 'success');
    updatePeersList();
  } catch (error) {
    window.showNotification?.('Failed to remove peer', 'error');
  }
};

// Update invites list
async function updateInvitesList() {
  const invitesSection = document.getElementById('hml-invites-section');
  const invitesList = document.getElementById('hml-invites');
  
  if (!invitesSection || !invitesList) return;
  
  const invites = hmlManager?.__invites || [];
  
  if (invites.length === 0) {
    invitesSection.style.display = 'none';
    return;
  }
  
  invitesSection.style.display = 'block';
  invitesList.innerHTML = invites.map((inv, idx) => `
    <div class="hml-invite-item" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 12px; margin-bottom: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 12px; color: rgba(255,255,255,0.6);">From:</div>
          <div style="font-size: 13px; font-family: monospace; color: #b0b0d0;">${(inv.issuerFingerprint || '').slice(0, 16)}...</div>
          <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 4px;">
            ${inv.permissions || 'viewer'} access
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn tiny" onclick="window.acceptInvite?.(${idx})">Accept</button>
          <button class="btn tiny" style="background: rgba(255,59,48,0.2); color: #ff3b30;" onclick="window.declineInvite?.(${idx})">Decline</button>
        </div>
      </div>
    </div>
  `).join('');
}

// Accept invite function
window.acceptInvite = async (index) => {
  const invites = hmlManager?.__invites || [];
  if (index >= 0 && index < invites.length) {
    const invite = invites[index];
    try {
      await hmlManager?.manager?.acceptShare?.(invite.shareId);
      hmlManager.__invites.splice(index, 1);
      window.showNotification?.('Invitation accepted', 'success');
      updateInvitesList();
    } catch (error) {
      window.showNotification?.('Failed to accept invitation', 'error');
    }
  }
};

// Decline invite function
window.declineInvite = (index) => {
  const invites = hmlManager?.__invites || [];
  if (index >= 0 && index < invites.length) {
    hmlManager.__invites.splice(index, 1);
    window.showNotification?.('Invitation declined', 'success');
    updateInvitesList();
  }
};

// Add peer to monitor function
async function addPeerToMonitor(fingerprint) {
  if (!fingerprint || typeof fingerprint !== 'string') {
    throw new Error('Invalid fingerprint');
  }
  
  // Validate fingerprint format (basic check)
  if (fingerprint.length < 20) {
    throw new Error('Fingerprint too short - need full fingerprint');
  }
  
  // Ensure HML sync is initialized (lazy)
  if (!hmlManager?.manager) {
    await ensureHmlManagerInitialized();
  }
  
  console.log('[HML] Adding peer to monitor:', fingerprint.slice(0, 16) + '...');
  
  // Add to P2P manager
  try {
    await hmlManager.manager.addPeerToMonitor(fingerprint);
    console.log('[HML] Peer added to P2P manager polling');
  } catch (error) {
    console.error('[HML] P2P manager error:', error);
    throw new Error('Failed to add peer to P2P manager: ' + error.message);
  }
  
  // Store in monitored peers list
  try {
    const result = await chrome.storage.local.get(['emma_monitored_peers']);
    const peers = result.emma_monitored_peers || [];
    
    if (!peers.includes(fingerprint)) {
      peers.push(fingerprint);
      await chrome.storage.local.set({ emma_monitored_peers: peers });
      console.log('[HML] Stored peer in monitored list');
    } else {
      console.log('[HML] Peer already in monitored list');
    }
  } catch (error) {
    console.error('[HML] Failed to store monitored peer:', error);
    throw new Error('Failed to save peer to storage');
  }
  
  console.log('[HML] Successfully added peer. Polling will check for shares every 5 seconds.');
}

// Update settings tab
export async function updateSettingsTab() {
  try {
    // Load current settings
    const settings = await chrome.storage.local.get([
      'emma_hml_auto_sync',
      'emma_hml_auto_accept_viewer',
      'emma_hml_provider',
      'emma_hml_sync_interval'
    ]);
    
    // Update UI
    const autoSync = document.getElementById('hml-auto-sync');
    if (autoSync) autoSync.checked = settings.emma_hml_auto_sync !== false;
    
    const autoAccept = document.getElementById('hml-auto-accept-viewer');
    if (autoAccept) autoAccept.checked = settings.emma_hml_auto_accept_viewer || false;
    
    const provider = document.getElementById('hml-provider');
    if (provider) provider.value = settings.emma_hml_provider || 'both';
    
    const syncInterval = document.getElementById('hml-sync-interval');
    if (syncInterval) syncInterval.value = settings.emma_hml_sync_interval || '30';
    
    // Load TURN servers
    window.loadTurnServers?.();
  } catch (error) {
    console.error('Failed to update settings:', error);
  }
}
