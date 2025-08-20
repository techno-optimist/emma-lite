// HML Sync (P2P) Vault Sharing Test Script

// Show any errors in the console and on page
window.addEventListener('error', (event) => {
    console.error('Script error:', event.error);
    const logEl = document.getElementById('eventLog');
    if (logEl) {
        logEl.textContent += `[ERROR] ${event.error.message}\n`;
    }
});

// Import modules with error handling
let p2pManager, generateIdentity, BulletinBoardManager;
let myIdentity = null;
let bulletinBoard = null;

async function loadModules() {
    try {
        const p2pModule = await import('./p2p/p2p-manager.js');
        p2pManager = p2pModule.p2pManager;
        console.log('✅ HML Sync manager module loaded');
        
        const cryptoModule = await import('./vault/identity-crypto.js');
        generateIdentity = cryptoModule.generateIdentity;
        console.log('✅ Identity crypto module loaded');
        
        const bulletinModule = await import('./p2p/bulletin-board.js');
        BulletinBoardManager = bulletinModule.BulletinBoardManager;
        // Use mock bulletin board for testing
        bulletinBoard = new BulletinBoardManager({ useMock: true });
        console.log('✅ Bulletin board module loaded (using mock)');
        
        return true;
    } catch (error) {
        console.error('Failed to load modules:', error);
        document.getElementById('eventLog').textContent = `Failed to load modules: ${error.message}\n${error.stack}\n`;
        return false;
    }
}

// Logging
function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEl = document.getElementById('eventLog');
    const prefix = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        warning: '⚠️'
    }[type] || '📝';
    
    logEl.textContent += `[${timestamp}] ${prefix} ${message}\n`;
    logEl.scrollTop = logEl.scrollHeight;
    
    console.log(`[${type}]`, message);
}

// Initialize
async function initialize() {
    try {
        log('Starting initialization...', 'info');
        
        // Load modules first
        const modulesLoaded = await loadModules();
        if (!modulesLoaded) {
            throw new Error('Failed to load required modules');
        }
        
        // Check if modules loaded
        if (!generateIdentity) {
            throw new Error('Identity crypto module not loaded');
        }
        if (!p2pManager) {
            throw new Error('HML Sync manager module not loaded');
        }
        if (!bulletinBoard) {
            throw new Error('Bulletin board module not loaded');
        }
        
        log('All modules loaded successfully', 'success');
        
        // Check for existing identity
        const stored = localStorage.getItem('emma_test_identity');
        if (stored) {
            myIdentity = JSON.parse(stored);
            log('Loaded existing identity', 'success');
        } else {
            // Generate new identity
            log('Generating new identity...', 'info');
            myIdentity = await generateIdentity();
            localStorage.setItem('emma_test_identity', JSON.stringify(myIdentity));
            log('Generated new identity', 'success');
        }
        
        // Display identity
        updateIdentityDisplay();
        
        // Initialize P2P manager
        log('Initializing HML Sync manager...', 'info');
        await p2pManager.initialize(myIdentity);
        log('HML Sync manager initialized', 'success');
        
        // Set up event listeners
        setupP2PListeners();
        updateP2PStatus('initialized');
        
        log('Initialization complete for HML Sync!', 'success');
        
    } catch (error) {
        log(`Initialization failed: ${error.message}`, 'error');
        console.error('Full error:', error);
        
        // Show error in identity display
        const identityEl = document.getElementById('myIdentity');
        if (identityEl) {
            identityEl.innerHTML = `
                <div style="color: #ff6b6b;">
                    <strong>Error:</strong> ${error.message}
                    <br><small>Check console for details</small>
                </div>
            `;
        }
    }
}

// Update identity display
function updateIdentityDisplay() {
    const identityEl = document.getElementById('myIdentity');
    identityEl.innerHTML = `
        <div class="peer-info">
            <strong>Fingerprint:</strong>
            <div class="fingerprint">${myIdentity.fingerprint}</div>
            <small>Created: ${new Date(myIdentity.createdAt).toLocaleString()}</small>
        </div>
    `;
    
    document.getElementById('copyFingerprintBtn').disabled = false;
}

// HML Sync Event Listeners
function setupP2PListeners() {
    p2pManager.addEventListener('invitationreceived', (event) => {
        log(`Received invitation from ${event.detail.issuerFingerprint}`, 'info');
        displayInvitation(event.detail);
    });
    
    p2pManager.addEventListener('shareconnected', (event) => {
        log(`Share connected! ID: ${event.detail.shareId}`, 'success');
        updateConnections();
    });
    
    p2pManager.addEventListener('error', (event) => {
        log(`HML Sync Error: ${event.detail.error}`, 'error');
    });
    
    p2pManager.addEventListener('message', (event) => {
        log(`Message from ${event.detail.fingerprint}: ${event.detail.type}`, 'info');
    });
}

// UI Event Handlers
const addEventListenerSafe = (id, event, handler) => {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener(event, handler);
    } else {
        console.warn(`Element with id '${id}' not found`);
    }
};

// Set up all UI event listeners
function setupUIEventListeners() {
    addEventListenerSafe('generateIdentityBtn', 'click', async () => {
        if (confirm('Generate new identity? This will replace your current identity.')) {
            myIdentity = await generateIdentity();
            localStorage.setItem('emma_test_identity', JSON.stringify(myIdentity));
            updateIdentityDisplay();
            log('Generated new identity', 'success');
            
            // Reinitialize HML Sync
            await p2pManager.initialize(myIdentity);
        }
    });
    
    addEventListenerSafe('copyFingerprintBtn', 'click', () => {
        if (myIdentity && myIdentity.fingerprint) {
            navigator.clipboard.writeText(myIdentity.fingerprint);
            log('Fingerprint copied to clipboard (HML identity)', 'success');
        } else {
            log('No identity available to copy', 'warning');
        }
    });
    
    addEventListenerSafe('shareVaultBtn', 'click', async () => {
        const recipientFingerprint = document.getElementById('recipientFingerprint').value.trim();
        if (!recipientFingerprint) {
            log('Please enter recipient fingerprint', 'warning');
            return;
        }
        
        try {
            // Add to monitoring
            await p2pManager.addPeerToMonitor(recipientFingerprint);
            
            const shareId = await p2pManager.shareVault(
                'test-vault-001',
                recipientFingerprint,
                { read: true, write: true, delete: false, share: false, admin: false }
            );
            
            log(`Share initiated! ID: ${shareId}`, 'success');
            log(`Invitation posted to HML bulletin board`, 'info');
            
        } catch (error) {
            log(`Share failed: ${error.message}`, 'error');
        }
    });
    
    addEventListenerSafe('checkBulletinBtn', 'click', async () => {
        log('Checking HML bulletin board...', 'info');
        
        try {
            // Check for messages in test channel
            const messages = await bulletinBoard.get('test-channel', { limit: 10 });
            
            const messagesEl = document.getElementById('bulletinMessages');
            if (messages.length === 0) {
                messagesEl.innerHTML = '<p><small>No messages found</small></p>';
            } else {
                messagesEl.innerHTML = messages.map(msg => `
                    <div class="peer-info">
                        <strong>${msg.data.type || 'Unknown'}</strong>
                        <small>${new Date(msg.timestamp).toLocaleString()}</small>
                        <div style="font-size: 11px; color: #666;">ID: ${msg.id}</div>
                    </div>
                `).join('');
            }
            
            log(`Found ${messages.length} messages`, 'success');
            
        } catch (error) {
            log(`HML bulletin check failed: ${error.message}`, 'error');
        }
    });
    
    addEventListenerSafe('postTestBtn', 'click', async () => {
        try {
            const testMessage = {
                type: 'test-message',
                from: myIdentity.fingerprint,
                content: 'Hello P2P World!',
                timestamp: Date.now()
            };
            
            const result = await bulletinBoard.post('test-channel', testMessage);
            log(`Test message posted! ID: ${result.id}`, 'success');
            
        } catch (error) {
            log(`Post failed: ${error.message}`, 'error');
        }
    });
    
    addEventListenerSafe('clearLogBtn', 'click', () => {
        document.getElementById('eventLog').textContent = '';
    });
    
    // Test functions
    addEventListenerSafe('testLocalBtn', 'click', () => {
        try {
            localStorage.setItem('emma_p2p_test', 'success');
            const value = localStorage.getItem('emma_p2p_test');
            localStorage.removeItem('emma_p2p_test');
            log('Local storage test passed', 'success');
        } catch (error) {
            log(`Local storage test failed: ${error.message}`, 'error');
        }
    });
    
    addEventListenerSafe('testGitHubBtn', 'click', async () => {
        log('Testing HML bulletin (GitHub Gist) API...', 'info');
        
        try {
            const response = await fetch('https://api.github.com/gists/public?per_page=1');
            if (response.ok) {
                log(`GitHub API accessible! Rate limit: ${response.headers.get('X-RateLimit-Remaining')}`, 'success');
            } else {
                log(`GitHub API returned ${response.status}`, 'warning');
            }
        } catch (error) {
            log(`GitHub API test failed: ${error.message}`, 'error');
        }
    });
    
    addEventListenerSafe('testWebRTCBtn', 'click', () => {
        if (window.RTCPeerConnection) {
            log('WebRTC is supported!', 'success');
            
            // Test STUN
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            
            pc.createDataChannel('test');
            pc.createOffer().then(offer => {
                log('WebRTC offer created successfully', 'success');
                pc.close();
            }).catch(error => {
                log(`WebRTC offer failed: ${error.message}`, 'error');
            });
            
        } else {
            log('WebRTC not supported in this browser', 'error');
        }
    });
    
    addEventListenerSafe('simulateShareBtn', 'click', async () => {
        log('=== Starting HML Sync full share simulation ===', 'info');
        
        if (!myIdentity || !myIdentity.fingerprint) {
            log('No identity available for simulation', 'error');
            return;
        }
        
        // Simulate sharing with self (different fingerprint)
        const fakeRecipient = myIdentity.fingerprint.split(':').reverse().join(':');
        
        log(`1. Sharing with simulated peer: ${fakeRecipient}`, 'info');
        
        try {
            await p2pManager.addPeerToMonitor(fakeRecipient);
            const shareId = await p2pManager.shareVault(
                'simulation-vault',
                fakeRecipient,
                { read: true, write: true }
            );
            
            log(`2. Share created: ${shareId}`, 'success');
            log('3. Invitation posted to HML bulletin board', 'success');
            log('4. Waiting for recipient to come online...', 'info');
            
            // In real scenario, recipient would check bulletin board
            // and accept the invitation
            
        } catch (error) {
            log(`Simulation failed: ${error.message}`, 'error');
        }
    });
}

// Status updates
function updateP2PStatus(status) {
    const statusEl = document.getElementById('p2pStatus');
    const states = {
        'initialized': '<span class="status connected">HML Sync Initialized</span>',
        'connecting': '<span class="status pending">HML Sync Connecting...</span>',
        'error': '<span class="status disconnected">HML Sync Error</span>'
    };
    
    statusEl.innerHTML = states[status] || '<span class="status disconnected">Unknown</span>';
}

function updateConnections() {
    const stats = p2pManager.connectionManager.getStats();
    document.getElementById('connectionStats').innerHTML = `
        <small>Connections: ${stats.connected} active, ${stats.total} total</small>
    `;
    
    const connectionsEl = document.getElementById('activeConnections');
    const connections = p2pManager.connectionManager.getActiveConnections();
    
    if (connections.length === 0) {
        connectionsEl.innerHTML = '<p><small>No active connections</small></p>';
    } else {
        connectionsEl.innerHTML = connections.map(conn => `
            <div class="peer-info">
                <strong>Peer:</strong> ${conn.peerFingerprint.substring(0, 20)}...
                <br><small>State: ${conn.state}</small>
            </div>
        `).join('');
    }
}

function displayInvitation(invitation) {
    const invitationsEl = document.getElementById('pendingInvitations');
    invitationsEl.innerHTML = `
        <div class="peer-info" data-invitation-id="${invitation.shareId}">
            <strong>${invitation.vaultName}</strong>
            <br><small>From: ${invitation.issuerFingerprint.substring(0, 20)}...</small>
            <br><button class="accept-invitation-btn" data-share-id="${invitation.shareId}">Accept</button>
            <button class="decline-invitation-btn" data-share-id="${invitation.shareId}">Decline</button>
        </div>
    `;
    
    // Add event listeners to the new buttons
    const acceptBtn = invitationsEl.querySelector('.accept-invitation-btn');
    const declineBtn = invitationsEl.querySelector('.decline-invitation-btn');
    
    if (acceptBtn) {
        acceptBtn.addEventListener('click', async (e) => {
            const shareId = e.target.dataset.shareId;
            log('Accepting invitation...', 'info');
            try {
                await p2pManager.acceptShare(invitation);
                log('Invitation accepted!', 'success');
                updateConnections();
                invitationsEl.innerHTML = '<p><small>No pending invitations</small></p>';
            } catch (error) {
                log(`Failed to accept invitation: ${error.message}`, 'error');
            }
        });
    }
    
    if (declineBtn) {
        declineBtn.addEventListener('click', (e) => {
            const shareId = e.target.dataset.shareId;
            log('Invitation declined', 'info');
            invitationsEl.innerHTML = '<p><small>No pending invitations</small></p>';
        });
    }
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        setupUIEventListeners();
        await initialize();
        // Update stats periodically
        setInterval(updateConnections, 5000);
    });
} else {
    // DOM already loaded
    setupUIEventListeners();
    initialize().then(() => {
        // Update stats periodically
        setInterval(updateConnections, 5000);
    });
}
