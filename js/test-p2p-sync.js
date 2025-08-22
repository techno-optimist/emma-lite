/**
 * Test harness for HML Sync Protocol
 */

import { P2PManager } from './p2p/p2p-manager.js';
import { generateIdentity } from './vault/identity-crypto.js';
import { VaultManager } from './vault/vault-manager.js';
import { VaultStorage } from '../lib/vault-storage.js';

// Test state
const testState = {
  peer1: {
    manager: null,
    identity: null,
    vaultId: 'test-vault-sync',
    stats: { sent: 0, received: 0, synced: 0 }
  },
  peer2: {
    manager: null,
    identity: null,
    vaultId: 'test-vault-sync',
    stats: { sent: 0, received: 0, synced: 0 }
  }
};

// Logging functions
function log(peer, message, type = 'info') {
  const logEl = document.getElementById(`${peer}-log`);
  const timestamp = new Date().toLocaleTimeString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '📝';
  
  logEl.textContent += `[${timestamp}] ${prefix} ${message}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

// Update connection status
function updateStatus(peer, connected) {
  const statusEl = document.getElementById(`${peer}-status`);
  statusEl.className = `status ${connected ? 'connected' : 'disconnected'}`;
  statusEl.textContent = connected ? 'Connected' : 'Not Connected';
}

// Update stats
function updateStats(peer) {
  const stats = testState[peer].stats;
  document.getElementById(`${peer}-sent`).textContent = stats.sent;
  document.getElementById(`${peer}-received`).textContent = stats.received;
  document.getElementById(`${peer}-synced`).textContent = stats.synced;
}

// Display memories
async function displayMemories(peer) {
  const listEl = document.getElementById(`${peer}-memories`);
  listEl.innerHTML = '';
  
  try {
    // Get memories from vault database
    const dbName = `emma_vault_${testState[peer].vaultId}`;
    const db = await openDatabase(dbName);
    
    const transaction = db.transaction(['memories'], 'readonly');
    const store = transaction.objectStore('memories');
    const memories = [];
    
    const request = store.openCursor();
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        memories.push(cursor.value);
        cursor.continue();
      } else {
        // Display memories
        memories.forEach(memory => {
          const item = document.createElement('div');
          item.className = 'memory-item';
          item.innerHTML = `
            <div class="id">${memory.id}</div>
            <div class="content">${memory.content || memory.core?.content || 'No content'}</div>
            <div class="meta">
              Created: ${new Date(memory.timestamp).toLocaleTimeString()}
              ${memory.deleted ? ' | DELETED' : ''}
            </div>
          `;
          listEl.appendChild(item);
        });
        
        if (memories.length === 0) {
          listEl.innerHTML = '<div style="color: var(--text-secondary); text-align: center;">No memories yet</div>';
        }
      }
    };
    
    db.close();
  } catch (error) {
    log(peer, `Failed to display memories: ${error.message}`, 'error');
  }
}

// Open IndexedDB
async function openDatabase(dbName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('memories')) {
        const memoryStore = db.createObjectStore('memories', { keyPath: 'id' });
        memoryStore.createIndex('timestamp', 'timestamp', { unique: false });
        memoryStore.createIndex('modified', 'modified', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('capsules')) {
        db.createObjectStore('capsules', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('attachments')) {
        db.createObjectStore('attachments', { keyPath: 'id' });
      }
    };
  });
}

// Initialize peer
async function initializePeer(peer) {
  try {
    log(peer, 'Initializing...');
    
    // Generate identity
    const identity = await generateIdentity();
    testState[peer].identity = identity;
    
    // Display fingerprint
    document.getElementById(`${peer}-fingerprint`).value = identity.fingerprint;
    
    // Create P2P manager
    const manager = new P2PManager();
    await manager.initialize(identity);
    testState[peer].manager = manager;
    
    // Set up event listeners
    manager.addEventListener('message', (event) => {
      testState[peer].stats.received++;
      updateStats(peer);
      log(peer, `Received: ${event.detail.payload.type}`);
    });
    
    manager.addEventListener('connectionstatechange', (event) => {
      const { fingerprint, newState } = event.detail;
      log(peer, `Connection state: ${newState}`);
      updateStatus(peer, newState === 'CONNECTED');
    });
    
    manager.addEventListener('invitationreceived', (event) => {
      log(peer, `Invitation received: ${event.detail.shareId}`, 'success');
      // Auto-accept for testing
      manager.acceptShare(event.detail.shareId);
    });
    
    manager.addEventListener('shareconnected', (event) => {
      log(peer, `Share connected: ${event.detail.shareId}`, 'success');
    });
    
    // Hook into sync events
    manager.connectionManager.addEventListener('message', (event) => {
      if (event.detail.payload.type.startsWith('memory-')) {
        testState[peer].stats.synced++;
        updateStats(peer);
        displayMemories(peer);
      }
    });
    
    // Create test vault
    const vaultManager = new VaultManager();
    await vaultManager.createVault('test-passphrase', {
      name: `Test Vault ${peer}`,
      vaultId: testState[peer].vaultId
    });
    
    log(peer, 'Initialized successfully', 'success');
    
    // Initial display
    displayMemories(peer);
    
  } catch (error) {
    log(peer, `Initialization failed: ${error.message}`, 'error');
  }
}

// Create memory
async function createMemory(peer) {
  try {
    const content = document.getElementById(`${peer}-memory-content`).value;
    if (!content) {
      log(peer, 'Please enter memory content', 'error');
      return;
    }
    
    // Create memory using vault storage
    const vaultStorage = new VaultStorage();
    await vaultStorage.init();
    
    const memory = await vaultStorage.saveMemory({
      content,
      source: 'test',
      type: 'note',
      metadata: {
        createdBy: peer,
        testData: true
      }
    }, {
      vaultId: testState[peer].vaultId
    });
    
    log(peer, `Created memory: ${memory.id}`, 'success');
    
    // Clear input
    document.getElementById(`${peer}-memory-content`).value = '';
    
    // Update display
    displayMemories(peer);
    
    // Update stats
    testState[peer].stats.sent++;
    updateStats(peer);
    
  } catch (error) {
    log(peer, `Failed to create memory: ${error.message}`, 'error');
  }
}

// Connect peer 2 to peer 1
async function connectPeers() {
  try {
    const peer1Fingerprint = testState.peer1.identity?.fingerprint;
    const peer2Fingerprint = document.getElementById('peer2-peer-fp').value;
    
    if (!peer1Fingerprint || !peer2Fingerprint) {
      log('peer2', 'Please initialize both peers first', 'error');
      return;
    }
    
    log('peer2', 'Connecting to peer 1...');
    
    // Share vault from peer 1 to peer 2
    const shareId = await testState.peer1.manager.shareVault(
      testState.peer1.vaultId,
      testState.peer2.identity.fingerprint,
      'editor'
    );
    
    log('peer1', `Shared vault: ${shareId}`, 'success');
    
  } catch (error) {
    log('peer2', `Connection failed: ${error.message}`, 'error');
  }
}

// Force sync
async function forceSync() {
  try {
    if (testState.peer1.manager && testState.peer2.manager) {
      // Trigger sync from both sides
      const handler1 = testState.peer1.manager.syncHandlers.get(testState.peer1.vaultId);
      const handler2 = testState.peer2.manager.syncHandlers.get(testState.peer2.vaultId);
      
      if (handler1) await handler1.performSync();
      if (handler2) await handler2.performSync();
      
      log('peer1', 'Forced sync initiated', 'success');
      log('peer2', 'Forced sync initiated', 'success');
    }
  } catch (error) {
    console.error('Force sync failed:', error);
  }
}

// Clear all memories
async function clearMemories() {
  try {
    for (const peer of ['peer1', 'peer2']) {
      const dbName = `emma_vault_${testState[peer].vaultId}`;
      const db = await openDatabase(dbName);
      
      const transaction = db.transaction(['memories'], 'readwrite');
      const store = transaction.objectStore('memories');
      await store.clear();
      
      db.close();
      
      log(peer, 'Cleared all memories', 'success');
      displayMemories(peer);
    }
  } catch (error) {
    console.error('Clear memories failed:', error);
  }
}

// Wire up UI
document.getElementById('peer1-init').addEventListener('click', () => initializePeer('peer1'));
document.getElementById('peer2-init').addEventListener('click', () => initializePeer('peer2'));
document.getElementById('peer1-create-memory').addEventListener('click', () => createMemory('peer1'));
document.getElementById('peer2-create-memory').addEventListener('click', () => createMemory('peer2'));
document.getElementById('peer2-connect').addEventListener('click', connectPeers);
document.getElementById('force-sync').addEventListener('click', forceSync);
document.getElementById('clear-memories').addEventListener('click', clearMemories);

// Test batch sync
document.getElementById('test-batch').addEventListener('click', async () => {
  try {
    // Create multiple memories quickly
    for (let i = 0; i < 5; i++) {
      document.getElementById('peer1-memory-content').value = `Batch memory ${i + 1} from peer 1`;
      await createMemory('peer1');
    }
    
    log('peer1', 'Created 5 batch memories', 'success');
    
    // Force sync after a delay
    setTimeout(forceSync, 1000);
    
  } catch (error) {
    console.error('Batch test failed:', error);
  }
});

// Simulate conflict
document.getElementById('simulate-conflict').addEventListener('click', async () => {
  try {
    // Create same memory ID on both peers with different content
    const memoryId = `conflict_${Date.now()}`;
    
    // Create on peer 1
    const db1 = await openDatabase(`emma_vault_${testState.peer1.vaultId}`);
    const tx1 = db1.transaction(['memories'], 'readwrite');
    await tx1.objectStore('memories').put({
      id: memoryId,
      content: 'Content from peer 1',
      timestamp: Date.now(),
      modified: Date.now()
    });
    db1.close();
    
    // Create on peer 2 with slightly newer timestamp
    const db2 = await openDatabase(`emma_vault_${testState.peer2.vaultId}`);
    const tx2 = db2.transaction(['memories'], 'readwrite');
    await tx2.objectStore('memories').put({
      id: memoryId,
      content: 'Content from peer 2',
      timestamp: Date.now() + 100,
      modified: Date.now() + 100
    });
    db2.close();
    
    log('peer1', 'Created conflicting memory', 'success');
    log('peer2', 'Created conflicting memory', 'success');
    
    displayMemories('peer1');
    displayMemories('peer2');
    
    // Force sync to resolve conflict
    setTimeout(forceSync, 500);
    
  } catch (error) {
    console.error('Conflict simulation failed:', error);
  }
});

// Auto-refresh memories every 2 seconds
setInterval(() => {
  displayMemories('peer1');
  displayMemories('peer2');
}, 2000);

log('peer1', 'Test interface ready');
log('peer2', 'Test interface ready');























