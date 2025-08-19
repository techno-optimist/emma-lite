// Module Loading Test Script

const output = document.getElementById('output');

function log(message, type = 'info') {
    const div = document.createElement('div');
    div.className = type;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    output.appendChild(div);
    console.log(message);
}

async function testModules() {
    log('Starting module tests...', 'info');
    
    // Test 1: Basic crypto utils
    try {
        log('Testing crypto-utils.js...', 'info');
        const cryptoUtils = await import('./vault/crypto-utils.js');
        log('✓ crypto-utils.js loaded', 'success');
        
        // Test a function
        const id = cryptoUtils.generateId();
        log(`✓ generateId() works: ${id}`, 'success');
    } catch (error) {
        log(`✗ crypto-utils.js failed: ${error.message}`, 'error');
        console.error(error);
    }
    
    // Test 2: Identity crypto - check if it exists first
    try {
        log('Checking for identity-crypto.js...', 'info');
        const response = await fetch('./vault/identity-crypto.js');
        if (!response.ok) {
            throw new Error(`File not found: ${response.status}`);
        }
        
        log('Testing identity-crypto.js import...', 'info');
        const identityCrypto = await import('./vault/identity-crypto.js');
        log('✓ identity-crypto.js loaded', 'success');
        
        if (identityCrypto.generateIdentity) {
            log('✓ generateIdentity function found', 'success');
        } else {
            log('✗ generateIdentity function not found', 'error');
        }
    } catch (error) {
        log(`✗ identity-crypto.js failed: ${error.message}`, 'error');
        console.error(error);
    }
    
    // Test 3: WebRTC Manager
    try {
        log('Testing webrtc-manager.js...', 'info');
        const webrtcManager = await import('./p2p/webrtc-manager.js');
        log('✓ webrtc-manager.js loaded', 'success');
        
        if (webrtcManager.ConnectionManager) {
            log('✓ ConnectionManager class found', 'success');
        } else {
            log('✗ ConnectionManager class not found', 'error');
        }
    } catch (error) {
        log(`✗ webrtc-manager.js failed: ${error.message}`, 'error');
        console.error(error);
    }
    
    // Test 4: Bulletin Board
    try {
        log('Testing bulletin-board.js...', 'info');
        const bulletinBoard = await import('./p2p/bulletin-board.js');
        log('✓ bulletin-board.js loaded', 'success');
        
        if (bulletinBoard.BulletinBoardManager) {
            log('✓ BulletinBoardManager class found', 'success');
        } else {
            log('✗ BulletinBoardManager class not found', 'error');
        }
    } catch (error) {
        log(`✗ bulletin-board.js failed: ${error.message}`, 'error');
        console.error(error);
    }
    
    // Test 5: P2P Manager
    try {
        log('Testing p2p-manager.js...', 'info');
        const p2pManager = await import('./p2p/p2p-manager.js');
        log('✓ p2p-manager.js loaded', 'success');
        
        if (p2pManager.p2pManager) {
            log('✓ p2pManager instance found', 'success');
        } else {
            log('✗ p2pManager instance not found', 'error');
        }
    } catch (error) {
        log(`✗ p2p-manager.js failed: ${error.message}`, 'error');
        console.error(error);
    }
    
    log('Module tests complete!', 'info');
}

// Run tests when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testModules);
} else {
    testModules();
}






















