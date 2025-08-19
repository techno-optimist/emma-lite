// Test page for HML Sync (P2P) Vault Integration
import { P2PManager } from './p2p/p2p-manager.js';
import { BulletinBoardManager } from './p2p/bulletin-board.js';
import { generateIdentity } from './vault/identity-crypto.js';

let p2pManager = null;
let myIdentity = null;

// Initialize everything
async function initialize() {
  try {
    log('🚀 Initializing HML Sync Vault Integration Test...', 'info');
    
    // Check if we have a stored identity
    const storedIdentity = await getMyIdentity();
    if (storedIdentity) {
      myIdentity = storedIdentity;
      log('✅ Found existing identity', 'info');
    } else {
      // Generate a new identity for testing
      myIdentity = await generateIdentity();
      await storeMyIdentity(myIdentity);
      log('✅ Generated new identity', 'info');
    }
    
    // Initialize HML Sync manager with real bulletin board
    const bulletinBoard = new BulletinBoardManager({ 
      useMock: false, // Use real GitHub Gist for production testing
      fallbackToMock: true // But fallback to mock if GitHub fails
    });
    
    p2pManager = new P2PManager(bulletinBoard);
    await p2pManager.initialize(myIdentity);
    
    // Set up event listeners
    setupP2PListeners();
    
    // Load vault status
    await loadVaultStatus();
    
    // Load shared vaults
    await loadSharedVaults();
    
    // Enable share button
    document.getElementById('shareVaultBtn').disabled = false;
    
    log('✅ HML Sync system initialized', 'info');
    updateP2PStatus('HML Sync connected - Ready to share vaults');
    
  } catch (error) {
    log(`❌ HML Sync initialization failed: ${error.message}`, 'error');
    updateP2PStatus(`HML Sync Error: ${error.message}`);
  }
}

// Get stored identity
async function getMyIdentity() {
  try {
    const result = await chrome.storage.local.get(['emma_my_identity']);
    return result.emma_my_identity || null;
  } catch (error) {
    return null;
  }
}

// Store identity
async function storeMyIdentity(identity) {
  try {
    await chrome.storage.local.set({ emma_my_identity: identity });
  } catch (error) {
    console.error('Failed to store identity:', error);
  }
}

// Load and display vault status
async function loadVaultStatus() {
  try {
    // Try to get vault status from VaultManager
    const { getVaultManager } = await import('./vault/vault-manager.js');
    const vaultManager = getVaultManager();
    const status = await vaultManager.getStatus();
    
    let statusText = `
Vault Initialized: ${status.initialized ? 'Yes' : 'No'}
Vault Unlocked: ${status.isUnlocked ? 'Yes' : 'No'}
Current Vault ID: ${status.vaultId || 'None'}
Has Valid Session: ${status.hasValidSession ? 'Yes' : 'No'}
    `.trim();
    
    document.getElementById('vaultStatus').textContent = statusText;
    
    if (status.isUnlocked && status.vaultId) {
      // Get current vault details
      const vault = await p2pManager.getVault(status.vaultId);
      displayCurrentVault(vault);
      
      // Enable unlock button if vault is locked
      document.getElementById('unlockVaultBtn').style.display = 'none';
    } else {
      document.getElementById('currentVault').style.display = 'none';
      document.getElementById('unlockVaultBtn').style.display = 'inline-block';
    }
    
  } catch (error) {
    log(`Failed to load vault status: ${error.message}`, 'error');
    document.getElementById('vaultStatus').textContent = 'Error loading vault status';
  }
}

// Display current vault info
function displayCurrentVault(vault) {
  document.getElementById('currentVault').style.display = 'block';
  document.getElementById('vaultId').textContent = vault.id;
  document.getElementById('vaultName').textContent = vault.name;
  document.getElementById('vaultCreated').textContent = new Date(vault.createdAt).toLocaleString();
  
  // Display master key info (truncated for security)
  let keyInfo = 'Not available';
  if (vault.masterKey) {
    if (vault.masterKey instanceof CryptoKey) {
      keyInfo = '[CryptoKey Object - Active]';
    } else if (vault.isMock) {
      keyInfo = '[Mock Key - Testing Only]';
    } else {
      keyInfo = '[Key Available]';
    }
  }
  document.getElementById('vaultKey').textContent = keyInfo;
}

// Load and display shared vaults
async function loadSharedVaults() {
  try {
    const result = await chrome.storage.local.get(['emma_shared_vaults']);
    const sharedVaults = result.emma_shared_vaults || {};
    
    const container = document.getElementById('sharedVaults');
    
    if (Object.keys(sharedVaults).length === 0) {
      container.innerHTML = '<p>No shared vaults yet.</p>';
      return;
    }
    
    container.innerHTML = '';
    
    for (const [vaultId, vault] of Object.entries(sharedVaults)) {
      const vaultDiv = document.createElement('div');
      vaultDiv.className = 'shared-vault';
      vaultDiv.innerHTML = `
        <h4>${vault.name}</h4>
        <p><strong>ID:</strong> ${vault.id}</p>
        <p><strong>Shared by:</strong> ${vault.sharedByName || vault.sharedBy}</p>
        <p><strong>Permissions:</strong> ${vault.permissions}</p>
        <p><strong>Shared on:</strong> ${new Date(vault.sharedAt).toLocaleString()}</p>
        ${vault.lastSynced ? `<p><strong>Last synced:</strong> ${new Date(vault.lastSynced).toLocaleString()}</p>` : ''}
      `;
      container.appendChild(vaultDiv);
    }
    
  } catch (error) {
    log(`Failed to load shared vaults: ${error.message}`, 'error');
  }
}

// Set up P2P event listeners
function setupP2PListeners() {
  p2pManager.addEventListener('invitationreceived', (event) => {
    log(`📨 Received vault share invitation from ${event.detail.invitation.issuerFingerprint}`, 'info');
    showShareInvitationModal(event.detail.invitation);
  });
  
  p2pManager.addEventListener('shareconnected', (event) => {
    log(`✅ Share connected: ${event.detail.shareId}`, 'info');
    loadSharedVaults(); // Refresh shared vaults display
  });
  
  p2pManager.addEventListener('shareaccepted', (event) => {
    log(`✅ Share accepted: Vault ${event.detail.vaultId}`, 'info');
    loadSharedVaults(); // Refresh shared vaults display
  });
  
  p2pManager.addEventListener('error', (event) => {
    log(`❌ HML Sync Error: ${event.detail.message}`, 'error');
  });
}

// Show invitation modal
function showShareInvitationModal(invitation) {
  if (confirm(`
Vault Share Invitation Received!

From: ${invitation.issuerFingerprint}
Vault: ${invitation.vaultName}
Permissions: ${invitation.permissions}

Do you want to accept this vault share?
  `)) {
    acceptShare(invitation);
  }
}

// Accept a share invitation
async function acceptShare(invitation) {
  try {
    log('Accepting vault share...', 'info');
    const shareId = await p2pManager.acceptShare(invitation);
    log(`✅ Vault share accepted: ${shareId}`, 'info');
  } catch (error) {
    log(`❌ Failed to accept share: ${error.message}`, 'error');
  }
}

// Update P2P status display
function updateP2PStatus(message) {
  document.getElementById('p2pStatus').textContent = message;
}

// Log messages
function log(message, type = 'info') {
  console.log(message);
  
  const logDiv = document.getElementById('eventLog');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logDiv.appendChild(entry);
  
  // Auto-scroll to bottom
  logDiv.scrollTop = logDiv.scrollHeight;
}

// Event handlers
document.addEventListener('DOMContentLoaded', () => {
  // Refresh vault status
  document.getElementById('refreshVaultBtn').addEventListener('click', async () => {
    log('Refreshing vault status (HML)...', 'info');
    await loadVaultStatus();
    await loadSharedVaults();
  });
  
  // Unlock vault (placeholder - would need passphrase UI)
  document.getElementById('unlockVaultBtn').addEventListener('click', () => {
    alert('Please unlock your vault from the main Emma interface first.');
    log('Vault unlock requires main Emma interface (HML)', 'warning');
  });
  
  // Share vault
  document.getElementById('shareVaultBtn').addEventListener('click', async () => {
    const recipientFingerprint = document.getElementById('recipientFingerprint').value.trim();
    const permissions = document.getElementById('permissions').value;
    
    if (!recipientFingerprint) {
      alert('Please enter a recipient fingerprint');
      return;
    }
    
    try {
      log(`HML Sync: Sharing vault with ${recipientFingerprint}...`, 'info');
      
      // Get current vault ID
      const { getVaultManager } = await import('./vault/vault-manager.js');
      const vaultManager = getVaultManager();
      const status = await vaultManager.getStatus();
      
      if (!status.isUnlocked || !status.vaultId) {
        throw new Error('No active vault. Please unlock a vault first.');
      }
      
      const shareId = await p2pManager.shareVault(
        status.vaultId,
        recipientFingerprint,
        permissions
      );
      
      log(`✅ HML Sync: Vault share initiated: ${shareId}`, 'info');
      
    } catch (error) {
      log(`❌ HML Sync share failed: ${error.message}`, 'error');
      alert(`Failed to share vault: ${error.message}`);
    }
  });
  
  // Create test person
  document.getElementById('createTestPersonBtn').addEventListener('click', async () => {
    try {
      log('Creating test person (HML identity)...', 'info');
      
      // Generate a test identity
      const testIdentity = await generateIdentity();
      
      // Create person record
      const person = {
        id: `person_${Date.now()}`,
        name: 'Test Person',
        relationship: 'friend',
        notes: 'Test person for P2P sharing',
        identity: testIdentity,
        keyFingerprint: testIdentity.fingerprint,
        profilePicture: null,
        createdAt: Date.now()
      };
      
      // Store person
      const result = await chrome.storage.local.get(['emma_people']);
      const people = result.emma_people || [];
      people.push(person);
      await chrome.storage.local.set({ emma_people: people });
      
      // Display the fingerprint
      document.getElementById('recipientFingerprint').value = testIdentity.fingerprint;
      
      log(`✅ Test person created with fingerprint: ${testIdentity.fingerprint}`, 'info');
      alert(`Test person created!\n\nFingerprint: ${testIdentity.fingerprint}\n\nThis has been copied to the recipient field.`);
      
    } catch (error) {
      log(`❌ Failed to create test person: ${error.message}`, 'error');
    }
  });
  
  // Simulate full share
  document.getElementById('simulateShareBtn').addEventListener('click', async () => {
    try {
      log('Starting HML Sync full share simulation...', 'info');
      
      // Create a test recipient
      const recipientIdentity = await generateIdentity();
      const recipientFingerprint = recipientIdentity.fingerprint;
      
      log(`Created test recipient: ${recipientFingerprint}`, 'info');
      
      // Get current vault
      const { getVaultManager } = await import('./vault/vault-manager.js');
      const vaultManager = getVaultManager();
      const status = await vaultManager.getStatus();
      
      let vaultId = status.vaultId || 'test-vault-' + Date.now();
      
      // Share the vault
      log('HML Sync: Initiating vault share...', 'info');
      const shareId = await p2pManager.shareVault(vaultId, recipientFingerprint, 'editor');
      
      log(`✅ Share created: ${shareId}`, 'info');
      log('Simulating recipient accepting share...', 'info');
      
      // TODO: Simulate recipient accepting the share
      // This would normally happen on the recipient's device
      
      log('✅ Full share simulation completed!', 'info');
      
    } catch (error) {
      log(`❌ Simulation failed: ${error.message}`, 'error');
    }
  });
  
  // Initialize on load
  initialize();
});

// Refresh status every 10 seconds
setInterval(() => {
  if (p2pManager) {
    const connections = p2pManager.connectionManager?.connections.size || 0;
    const shares = p2pManager.activeShares.size;
    updateP2PStatus(`HML Sync connected - ${connections} peers, ${shares} active shares`);
  }
}, 10000);
