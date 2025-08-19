// js/options.js - Settings page logic

// Secure Password Modal Function (from popup.js)
function showPasswordModal(title = 'Enter Vault Code') {
  return new Promise((resolve, reject) => {
    const modal = document.getElementById('password-modal');
    const titleEl = document.getElementById('password-modal-title');
    const input = document.getElementById('password-modal-input');
    const cancelBtn = document.getElementById('password-modal-cancel');
    const confirmBtn = document.getElementById('password-modal-confirm');
    const closeBtn = document.getElementById('password-modal-close');
    
    if (!modal || !input || !cancelBtn || !confirmBtn || !closeBtn) {
      reject(new Error('Password modal elements not found'));
      return;
    }
    
    // Set title
    if (titleEl) titleEl.textContent = title;
    
    // Reset and show modal
    input.value = '';
    modal.style.display = 'flex';
    
    // Focus input after a brief delay
    setTimeout(() => {
      input.focus();
    }, 100);
    
    // Event handlers
    function handleKeyPress(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    }
    
    function handleConfirm() {
      const password = input.value.trim();
      if (!password) {
        input.focus();
        return;
      }
      
      cleanup();
      resolve(password);
    }
    
    function handleCancel() {
      cleanup();
      reject(new Error('Password entry cancelled'));
    }
    
    function cleanup() {
      modal.style.display = 'none';
      input.removeEventListener('keypress', handleKeyPress);
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      closeBtn.removeEventListener('click', handleCancel);
    }
    
    // Add event listeners
    input.addEventListener('keypress', handleKeyPress);
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    closeBtn.addEventListener('click', handleCancel);
  });
}

// Universal navigation handler as fallback
function setupUniversalNavigationHandlers() {
  console.log('🔍 Setting up universal navigation handlers...');
  
  // Find all possible back/close buttons
  const possibleBackButtons = [
    document.getElementById('settings-back'),
    document.querySelector('[id*="back"]'),
    document.querySelector('[class*="back"]'),
    document.querySelector('button[title*="back"]'),
    document.querySelector('button[aria-label*="back"]')
  ].filter(Boolean);
  
  const possibleCloseButtons = [
    document.getElementById('settings-close'),
    document.querySelector('[id*="close"]'),
    document.querySelector('[class*="close"]'),
    document.querySelector('button[title*="close"]'),
    document.querySelector('button[aria-label*="close"]')
  ].filter(Boolean);
  
  console.log('🔍 Found navigation buttons:', {
    backButtons: possibleBackButtons.length,
    closeButtons: possibleCloseButtons.length
  });
  
  // Enhanced navigation function
  const navigate = (action) => {
    console.log(`🚀 Universal navigation: ${action}`);
    try {
      if (window.chrome && chrome.tabs) {
        chrome.tabs.create({ url: chrome.runtime.getURL('dashboard-new.html') });
      } else if (window.emmaAPI) {
        window.location.href = 'dashboard-new.html';
      } else if (action === 'back') {
        window.history.back();
      } else {
        window.close();
      }
    } catch (err) {
      console.error('Navigation failed:', err);
      window.location.href = 'dashboard-new.html';
    }
  };
  
  // Add handlers to all found buttons
  [...possibleBackButtons].forEach(btn => {
    if (btn) {
      btn.style.pointerEvents = 'auto';
      btn.style.cursor = 'pointer';
      btn.style.zIndex = '10002';
      btn.addEventListener('click', (e) => {
        console.log('🔍 BACK BUTTON CLICKED!', btn);
        e.preventDefault();
        e.stopPropagation();
        navigate('back');
      }, true);
      console.log('🔍 Added back handler to:', btn);
    }
  });
  
  [...possibleCloseButtons].forEach(btn => {
    if (btn) {
      btn.style.pointerEvents = 'auto';
      btn.style.cursor = 'pointer';
      btn.style.zIndex = '10002';
      btn.addEventListener('click', (e) => {
        console.log('🔍 CLOSE BUTTON CLICKED!', btn);
        e.preventDefault();
        e.stopPropagation();
        navigate('close');
      }, true);
      console.log('🔍 Added close handler to:', btn);
    }
  });
  
  // Create emergency navigation button if none found
  if (possibleBackButtons.length === 0 && possibleCloseButtons.length === 0) {
    console.log('🚨 No navigation buttons found, creating emergency button');
    const emergencyBtn = document.createElement('button');
    emergencyBtn.innerText = '← Back to Dashboard';
    emergencyBtn.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 99999;
      background: #ff4444;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
    `;
    emergencyBtn.addEventListener('click', () => navigate('back'));
    document.body.appendChild(emergencyBtn);
  }
  
  // Also add keyboard shortcuts as backup
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      console.log('🔍 Escape key pressed - closing');
      navigate('close');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
      console.log('🔍 Ctrl+W pressed - closing');
      e.preventDefault();
      navigate('close');
    }
  });
}

/**
 * Setup QR Code Management functionality
 */
function setupQRManagement() {
  console.log('🔗 Setting up QR code management...');
  
  const generateVaultQRBtn = document.getElementById('generate-vault-qr');
  const openQRScannerBtn = document.getElementById('open-qr-scanner');
  
  // Generate Vault QR
  if (generateVaultQRBtn) {
    generateVaultQRBtn.addEventListener('click', async () => {
      try {
        generateVaultQRBtn.disabled = true;
        generateVaultQRBtn.textContent = 'Generating...';
        
        const defaultPrivate = document.getElementById('qr-default-private')?.checked || false;
        const defaultExpiry = document.getElementById('qr-default-expiry')?.value || '86400000';
        
        const options = {
          privacyLevel: defaultPrivate ? 'private' : 'protected',
          purpose: 'share',
          expiryMs: parseInt(defaultExpiry)
        };
        
        console.log('🔗 Generating vault QR with options:', options);
        
        if (window.emmaAPI && window.emmaAPI.vault && window.emmaAPI.vault.generateQR) {
          const result = await window.emmaAPI.vault.generateQR(options);
          
          if (result && result.success) {
            openVaultQRModal(result);
          } else {
            throw new Error(result?.error || 'Vault QR generation failed');
          }
        } else {
          // Demo mode
          console.warn('🔗 No Emma API - generating demo vault QR');
          openVaultQRModal({
            success: true,
            qrCode: generateDemoQRCode('vault'),
            payload: {
              v: '1.0',
              type: 'vault',
              id: 'demo-vault-' + Date.now(),
              meta: {
                name: 'Demo Vault',
                created: Date.now(),
                memories: 42,
                attachments: 15
              }
            }
          });
        }
        
      } catch (error) {
        console.error('🔗 Vault QR generation error:', error);
        showNotification('❌ Failed to generate vault QR: ' + error.message, 'error');
      } finally {
        generateVaultQRBtn.disabled = false;
        generateVaultQRBtn.textContent = 'Generate Vault QR';
      }
    });
  }
  
  // Open QR Scanner
  if (openQRScannerBtn) {
    openQRScannerBtn.addEventListener('click', () => {
      openQRScannerModal();
    });
  }
  
  console.log('🔗 QR code management setup complete');
}

/**
 * Open Vault QR Modal
 */
function openVaultQRModal(qrResult) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active vault-qr-modal';
  modal.style.zIndex = '10000';
  
  modal.innerHTML = `
    <div class="modal" style="
      max-width: 500px; 
      background: linear-gradient(135deg, rgba(20, 20, 30, 0.98), rgba(30, 30, 40, 0.98)); 
      backdrop-filter: blur(20px); 
      border: 1px solid rgba(134, 88, 255, 0.3);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    ">
      <div class="modal-header" style="
        padding: 24px 32px 16px 32px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: linear-gradient(135deg, rgba(134, 88, 255, 0.1), rgba(240, 147, 251, 0.1));
      ">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="
            width: 48px; height: 48px; 
            background: linear-gradient(135deg, #8658ff, #f093fb); 
            border-radius: 12px; 
            display: flex; align-items: center; justify-content: center; 
            font-size: 24px;
          ">🔐</div>
          <div>
            <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">
              Vault QR Code
            </h2>
            <p style="color: #cccccc; margin: 4px 0 0 0; font-size: 14px;">
              Secure access to your memory vault
            </p>
          </div>
        </div>
        <button class="close-btn close-vault-qr" style="
          color: #cccccc; font-size: 24px; cursor: pointer; 
          background: none; border: none;
        ">×</button>
      </div>
      
      <div style="padding: 32px; text-align: center;">
        <div style="
          background: white; 
          padding: 20px; 
          border-radius: 16px; 
          margin-bottom: 20px;
          display: inline-block;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        ">
          <img src="${qrResult.qrCode}" style="width: 250px; height: 250px;" alt="Vault QR Code" />
        </div>
        
        <div style="margin-bottom: 24px;">
          <h3 style="color: #ffffff; margin: 0 0 8px 0; font-size: 18px;">How to Use</h3>
          <div style="text-align: left; color: #cccccc; font-size: 14px; line-height: 1.5;">
            <p style="margin: 8px 0;">📱 <strong>Family:</strong> Scan to view shared memories</p>
            <p style="margin: 8px 0;">🤖 <strong>AI Assistants:</strong> Provides context about your vault</p>
            <p style="margin: 8px 0;">⚕️ <strong>Healthcare:</strong> Time-limited access for providers</p>
          </div>
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="download-vault-qr" style="
            background: linear-gradient(135deg, #8658ff, #f093fb);
            border: none; color: white; padding: 12px 24px;
            border-radius: 8px; cursor: pointer; font-weight: 600;
          ">📥 Download QR</button>
          <button id="copy-vault-data" style="
            background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2);
            color: white; padding: 12px 24px; border-radius: 8px; cursor: pointer;
          ">📋 Copy Data</button>
        </div>
        
        <details style="margin-top: 20px; text-align: left;">
          <summary style="color: #cccccc; cursor: pointer; font-size: 13px;">
            🔍 QR Data Preview
          </summary>
          <pre style="
            color: #cccccc; font-size: 11px; line-height: 1.4;
            background: rgba(0, 0, 0, 0.3); padding: 12px; border-radius: 6px;
            overflow-x: auto; white-space: pre-wrap; margin-top: 8px;
          ">${JSON.stringify(qrResult.payload, null, 2)}</pre>
        </details>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Event handlers
  modal.querySelector('.close-vault-qr').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  modal.querySelector('#download-vault-qr').addEventListener('click', () => {
    downloadQRCode(qrResult.qrCode, 'emma-vault-qr');
  });
  
  modal.querySelector('#copy-vault-data').addEventListener('click', () => {
    navigator.clipboard.writeText(JSON.stringify(qrResult.payload, null, 2));
    showNotification('📋 QR data copied to clipboard', 'success');
  });
  
  // Animate in
  modal.style.opacity = '0';
  setTimeout(() => {
    modal.style.opacity = '1';
  }, 10);
}

/**
 * Open QR Scanner Modal
 */
function openQRScannerModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active qr-scanner-modal';
  modal.style.zIndex = '10000';
  
  modal.innerHTML = `
    <div class="modal" style="
      max-width: 600px; 
      background: linear-gradient(135deg, rgba(20, 20, 30, 0.98), rgba(30, 30, 40, 0.98)); 
      backdrop-filter: blur(20px); 
      border: 1px solid rgba(134, 88, 255, 0.3);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    ">
      <div class="modal-header" style="
        padding: 24px 32px 16px 32px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: linear-gradient(135deg, rgba(134, 88, 255, 0.1), rgba(240, 147, 251, 0.1));
      ">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="
            width: 48px; height: 48px; 
            background: linear-gradient(135deg, #8658ff, #f093fb); 
            border-radius: 12px; 
            display: flex; align-items: center; justify-content: center; 
            font-size: 24px;
          ">📷</div>
          <div>
            <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">
              QR Code Scanner
            </h2>
            <p style="color: #cccccc; margin: 4px 0 0 0; font-size: 14px;">
              Scan Emma QR codes to access shared content
            </p>
          </div>
        </div>
        <button class="close-btn close-qr-scanner" style="
          color: #cccccc; font-size: 24px; cursor: pointer; 
          background: none; border: none;
        ">×</button>
      </div>
      
      <div style="padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div id="qr-scanner-area" style="
            width: 300px; height: 300px; 
            background: rgba(255, 255, 255, 0.05);
            border: 2px dashed rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            margin: 0 auto 16px;
            display: flex; align-items: center; justify-content: center;
            color: #cccccc; font-size: 14px;
          ">
            📷 Camera not available in demo
          </div>
          
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button id="start-camera-scan" style="
              background: linear-gradient(135deg, #8658ff, #f093fb);
              border: none; color: white; padding: 12px 24px;
              border-radius: 8px; cursor: pointer; font-weight: 600;
            ">📷 Use Camera</button>
            <button id="upload-qr-image" style="
              background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2);
              color: white; padding: 12px 24px; border-radius: 8px; cursor: pointer;
            ">📁 Upload Image</button>
          </div>
          
          <input type="file" id="qr-file-input" accept="image/*" style="display: none;">
        </div>
        
        <div id="scan-results" style="display: none;">
          <h3 style="color: #ffffff; margin: 0 0 12px 0;">Scan Results</h3>
          <div id="scan-content" style="
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 16px;
            border-left: 4px solid #8658ff;
          "></div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Event handlers
  modal.querySelector('.close-qr-scanner').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  // Demo functionality
  modal.querySelector('#start-camera-scan').addEventListener('click', () => {
    showNotification('📷 Camera scanning not available in demo mode', 'info');
  });
  
  modal.querySelector('#upload-qr-image').addEventListener('click', () => {
    modal.querySelector('#qr-file-input').click();
  });
  
  modal.querySelector('#qr-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      showNotification('📁 QR image processing not available in demo mode', 'info');
    }
  });
  
  // Animate in
  modal.style.opacity = '0';
  setTimeout(() => {
    modal.style.opacity = '1';
  }, 10);
}

/**
 * Generate demo QR code
 */
function generateDemoQRCode(type) {
  // Return a simple data URL for demo QR
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="white"/>
      <rect x="10" y="10" width="20" height="20" fill="black"/>
      <rect x="30" y="10" width="20" height="20" fill="black"/>
      <rect x="50" y="10" width="20" height="20" fill="black"/>
      <rect x="10" y="30" width="20" height="20" fill="black"/>
      <rect x="50" y="30" width="20" height="20" fill="black"/>
      <rect x="10" y="50" width="20" height="20" fill="black"/>
      <rect x="30" y="50" width="20" height="20" fill="black"/>
      <rect x="50" y="50" width="20" height="20" fill="black"/>
      <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="12" fill="black">DEMO QR</text>
      <text x="100" y="120" text-anchor="middle" font-family="Arial" font-size="10" fill="black">${type.toUpperCase()}</text>
    </svg>
  `)}`;
}

/**
 * Download QR Code as Image
 */
function downloadQRCode(qrDataUrl, filename) {
  try {
    const link = document.createElement('a');
    link.download = `${filename}-${Date.now()}.png`;
    link.href = qrDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('📥 QR code downloaded!', 'success');
  } catch (error) {
    console.error('Download failed:', error);
    showNotification('❌ Download failed', 'error');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await updateStats();
  attachEventListeners();
  setupOrbManager();
  // Wire exit buttons with enhanced navigation
  try {
    const backBtn = document.getElementById('settings-back');
    const closeBtn = document.getElementById('settings-close');
    
    console.log('🔍 Button setup debug:', {
      backBtn: backBtn,
      closeBtn: closeBtn,
      backBtnExists: !!backBtn,
      closeBtnExists: !!closeBtn,
      backBtnVisible: backBtn ? getComputedStyle(backBtn).display : 'N/A',
      closeBtnVisible: closeBtn ? getComputedStyle(closeBtn).display : 'N/A'
    });
    
    if (backBtn) {
      // Make sure button is clickable
      backBtn.style.pointerEvents = 'auto';
      backBtn.style.cursor = 'pointer';
      backBtn.style.position = 'relative';
      backBtn.style.zIndex = '10001';
      
      const backClickHandler = (e) => {
        console.log('🔙 Back button clicked');
        e.preventDefault();
        e.stopPropagation();
        try {
          if (window.chrome && chrome.tabs) {
            // Extension environment
            chrome.tabs.create({ url: chrome.runtime.getURL('dashboard-new.html') });
          } else if (window.emmaAPI) {
            // Electron environment  
            window.location.href = 'dashboard-new.html';
          } else {
            // Fallback
            window.history.back();
          }
        } catch (err) {
          console.error('Navigation failed:', err);
          window.location.href = 'dashboard-new.html';
        }
      };
      
      backBtn.addEventListener('click', backClickHandler, true);
      backBtn.addEventListener('click', backClickHandler, false);
    }
    
    if (closeBtn) {
      // Make sure button is clickable
      closeBtn.style.pointerEvents = 'auto';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.position = 'relative';
      closeBtn.style.zIndex = '10001';
      
      const closeClickHandler = (e) => {
        console.log('❌ Close button clicked');
        e.preventDefault();
        e.stopPropagation();
        try {
          if (window.chrome && chrome.tabs) {
            chrome.tabs.create({ url: chrome.runtime.getURL('dashboard-new.html') });
          } else if (window.emmaAPI) {
            window.location.href = 'dashboard-new.html';
          } else {
            window.close();
          }
        } catch (err) {
          console.error('Close failed:', err);
          window.location.href = 'dashboard-new.html';
        }
      };
      
      closeBtn.addEventListener('click', closeClickHandler, true);
      closeBtn.addEventListener('click', closeClickHandler, false);
    }
  } catch (err) {
    console.error('Failed to setup navigation:', err);
  }
  
  // Fallback: Add universal click handlers for any element with these IDs
  setTimeout(() => {
    setupUniversalNavigationHandlers();
  }, 1000);
  
  // Initialize migration system
  await initializeMigrationSystem();
});

// Load current settings
async function loadSettings() {
  try {
    // Check if we're in Electron or Extension environment
    let response;
    if (window.emmaAPI && window.emmaAPI.storage) {
      // Electron environment - use window.emmaAPI
      const storageKeys = ['autoCapture', 'captureUser', 'captureAI', 'analytics', 'debugMode', 'maxMemories'];
      const storageData = await window.emmaAPI.storage.get(storageKeys);
      response = {
        success: true,
        settings: {
          autoCapture: storageData.autoCapture !== false,
          captureUser: storageData.captureUser !== false,
          captureAI: storageData.captureAI !== false,
          analytics: storageData.analytics === true,
          debugMode: storageData.debugMode === true,
          maxMemories: storageData.maxMemories || 10000
        }
      };
    } else if (window.chrome && chrome.runtime) {
      // Extension environment
      response = await chrome.runtime.sendMessage({ action: 'getSettings' });
    } else {
      // Fallback with defaults
      response = {
        success: true,
        settings: {
          autoCapture: true,
          captureUser: true,
          captureAI: true,
          analytics: false,
          debugMode: false,
          maxMemories: 10000
        }
      };
    }
    
    if (response.success) {
      const settings = response.settings;
      
      const setIfExists = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
          if (el.type === 'checkbox') {
            el.checked = value;
          } else {
            el.value = value;
          }
        }
      };
      
      setIfExists('auto-capture', settings.autoCapture !== false);
      setIfExists('capture-user', settings.captureUser !== false);
      setIfExists('capture-ai', settings.captureAI !== false);
      setIfExists('analytics', settings.analytics === true);
      setIfExists('debug-mode', settings.debugMode === true);
      setIfExists('max-memories', settings.maxMemories || 10000);

      // Load Dementia Companion settings (per-vault via background kv or local)
      try {
        let vid = 'unknown';
        // Prefer Electron bridge if present
        if (window.emmaAPI?.vault?.status) {
          const st = await window.emmaAPI.vault.status();
          vid = st?.vaultId || vid;
        } else if (window.chrome && chrome.runtime) {
          const vs = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });
          vid = vs?.vaultId || vid;
        }
        const keys = [
          `dementia.enabled:${vid}`,
          `dementia.stage:${vid}`,
          `dementia.voiceEnabled:${vid}`,
          `dementia.storeTranscripts:${vid}`
        ];
        let store = {};
        if (window.emmaAPI?.storage?.get) {
          store = await window.emmaAPI.storage.get(keys);
        } else if (window.chrome && chrome.storage && chrome.storage.local) {
          store = await chrome.storage.local.get(keys);
        }
        const $ = (id) => document.getElementById(id);
        if ($('dementia-enabled')) $('dementia-enabled').checked = Boolean(store[keys[0]]);
        if ($('dementia-stage')) $('dementia-stage').value = store[keys[1]] || 'EARLY';
        if ($('dementia-voice-enabled')) $('dementia-voice-enabled').checked = store[keys[2]] !== false;
        if ($('dementia-store-transcripts')) $('dementia-store-transcripts').checked = store[keys[3]] === true;
      } catch (e) {
        console.warn('Dementia settings load failed:', e?.message);
      }
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Update statistics
async function updateStats() {
  try {
    console.log('📊 Options: Updating stats...');
    let response;
    
    if (window.emmaAPI && window.emmaAPI.vault) {
      // Electron environment - use vault API directly
      try {
        const stats = await window.emmaAPI.vault.stats();
        response = { success: true, stats };
      } catch (e) {
        response = { success: false, error: e.message };
      }
    } else if (window.chrome && chrome.runtime) {
      // Extension environment
      response = await chrome.runtime.sendMessage({ action: 'getStats' });
    } else {
      // Fallback
      response = { success: false, error: 'No storage API available' };
    }
    
    console.log('📊 Options: getStats response:', response);
    
    if (response && response.success) {
      const stats = response.stats;
      
      // Update vault statistics elements (in the unified vault section)
      const vaultMemoryCount = document.getElementById('vault-memory-count');
      const vaultSizeElement = document.getElementById('vault-size');
      
      if (vaultMemoryCount) {
        vaultMemoryCount.textContent = formatNumber(stats.totalMemories || 0);
      }
      
      if (vaultSizeElement) {
        vaultSizeElement.textContent = formatBytes(stats.storageUsed || stats.totalSize || 0);
      }
      
      console.log('📊 Options: Vault stats updated successfully');
    } else {
      console.warn('📊 Options: getStats failed:', response);
      // Set fallback values for vault stats
      const vaultMemoryCount = document.getElementById('vault-memory-count');
      const vaultSizeElement = document.getElementById('vault-size');
      
      if (vaultMemoryCount) {
        vaultMemoryCount.textContent = '0';
      }
      
      if (vaultSizeElement) {
        vaultSizeElement.textContent = '0 B';
      }
    }
  } catch (error) {
    console.error('📊 Options: Failed to update stats:', error);
    // Set fallback values on error for vault stats
    const vaultMemoryCount = document.getElementById('vault-memory-count');
    const vaultSizeElement = document.getElementById('vault-size');
    
    if (vaultMemoryCount) {
      vaultMemoryCount.textContent = '0';
    }
    
    if (vaultSizeElement) {
      vaultSizeElement.textContent = '0 B';
    }
  }
}

// Save settings
async function saveSettings() {
  const getElementValue = (id, defaultValue = false) => {
    const el = document.getElementById(id);
    if (!el) return defaultValue;
    return el.type === 'checkbox' ? el.checked : el.value;
  };

  const settings = {
    autoCapture: getElementValue('auto-capture', true),
    captureUser: getElementValue('capture-user', true),
    captureAI: getElementValue('capture-ai', true),
    analytics: getElementValue('analytics', false),
    debugMode: getElementValue('debug-mode', false),
    maxMemories: parseInt(getElementValue('max-memories', '10000')) || 10000
  };
  
  try {
    // Save to appropriate storage
    if (window.emmaAPI && window.emmaAPI.storage) {
      // Electron environment
      await window.emmaAPI.storage.set(settings);
    } else if (window.chrome && chrome.runtime) {
      // Extension environment - save each setting
      for (const [key, value] of Object.entries(settings)) {
        await chrome.runtime.sendMessage({
          action: 'setSetting',
          key,
          value
        });
      }
    }
    
    console.log('✅ Settings saved successfully');
  } catch (error) {
    console.error('Failed to save settings:', error);
    showNotification('Failed to save settings', 'error');
    return; // Don't show success indicators on error
  }

  // Persist Dementia Companion settings per-vault in local storage (background can sync to kv)
  try {
    let vid = 'unknown';
    if (window.emmaAPI?.vault?.status) {
      const st = await window.emmaAPI.vault.status();
      vid = st?.vaultId || vid;
    } else if (window.chrome && chrome.runtime) {
      const vs = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });
      vid = vs?.vaultId || vid;
    }
    const prefix = (name) => `dementia.${name}:${vid}`;
    const map = {
      [prefix('enabled')]: getElementValue('dementia-enabled', false),
      [prefix('stage')]: getElementValue('dementia-stage', 'EARLY'),
      [prefix('voiceEnabled')]: getElementValue('dementia-voice-enabled', true),
      [prefix('storeTranscripts')]: getElementValue('dementia-store-transcripts', false)
    };
    
    if (window.emmaAPI?.storage?.set) {
      await window.emmaAPI.storage.set(map);
    }
    // Also persist to extension local for portability
    if (window.chrome && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set(map);
    }
    // Broadcast change to other extension pages (legacy HTML UIs)
    if (window.chrome && chrome.runtime) {
      try { 
        await chrome.runtime.sendMessage({ action: 'settings.changed', keys: Object.keys(map) }); 
      } catch (e) {
        console.warn('Failed to broadcast settings change:', e.message);
      }
    }
    try { 
      localStorage.setItem('dementia.settings.bump', `${Date.now()}:${Math.random()}`); 
    } catch (e) {
      console.warn('Failed to update localStorage bump:', e.message);
    }
    
    // Try to directly refresh dementia companion if it exists
    try {
      // Send a message to any open tabs to refresh
      if (window.chrome && chrome.tabs) {
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { 
              action: 'refreshDementiaCompanion' 
            }).catch(() => {}); // Ignore errors
          });
        });
      }
      
      // Also broadcast via window postMessage for same-origin frames
      window.postMessage({ 
        type: 'DEMENTIA_SETTINGS_CHANGED',
        timestamp: Date.now()
      }, '*');
    } catch (e) {
      console.warn('Failed to broadcast dementia refresh:', e.message);
    }
    
    console.log('✅ Dementia settings saved successfully');
  } catch (e) {
    console.warn('Failed to save dementia settings:', e?.message);
  }
  
  // Save Orb Manager settings
  try {
    let vid = 'unknown';
    if (window.emmaAPI?.vault?.status) {
      const st = await window.emmaAPI.vault.status();
      vid = st?.vaultId || vid;
    } else if (window.chrome && chrome.runtime) {
      const vs = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });
      vid = vs?.vaultId || vid;
    }
    
    const orbSettings = {
      [`orb.persona:${vid}`]: getElementValue('orb-persona', 'default'),
      [`orb.colorTheme:${vid}`]: getElementValue('orb-color-theme', 'default'),
      [`orb.customColor:${vid}`]: getElementValue('orb-custom-color', '#8b5cf6'),
      [`orb.size:${vid}`]: parseInt(getElementValue('orb-size', '72')),
      [`orb.position:${vid}`]: getElementValue('orb-position', 'bottom-right'),
      [`orb.autoHide:${vid}`]: getElementValue('orb-auto-hide', false),
      [`orb.hideMinutes:${vid}`]: parseInt(getElementValue('orb-hide-minutes', '5'))
    };
    
    if (window.emmaAPI?.storage?.set) {
      await window.emmaAPI.storage.set(orbSettings);
    }
    if (window.chrome && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set(orbSettings);
    }
    
    // Enable the selected orb type
    const selectedPersona = getElementValue('orb-persona', 'default');
    if (selectedPersona !== 'default') {
      const personaEnableKey = `${selectedPersona}.enabled:${vid}`;
      await (window.emmaAPI?.storage?.set || chrome.storage.local.set)({ [personaEnableKey]: true });
    }
    
    console.log('✅ Orb Manager settings saved successfully');
  } catch (e) {
    console.warn('Failed to save orb settings:', e?.message);
  }
  
  // Show success indicators at the end
  showNotification('Settings saved successfully!');
  showSaveIndicator();
}

// Reset to defaults
async function resetSettings() {
  if (!confirm('Reset all settings to defaults?')) return;
  
  const defaults = {
    autoCapture: true,
    captureUser: true,
    captureAI: true,
    analytics: false,
    debugMode: false,
    maxMemories: 10000
  };
  
  try {
    for (const [key, value] of Object.entries(defaults)) {
      await chrome.runtime.sendMessage({
        action: 'setSetting',
        key,
        value
      });
    }
    
    await loadSettings();
    showNotification('Settings reset to defaults');
  } catch (error) {
    console.error('Failed to reset settings:', error);
  }
}

// Export data
async function exportData() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'exportData' });
    
    if (response.success) {
      const data = response.data;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `emma-memories-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      showNotification('Data exported successfully');
    }
  } catch (error) {
    console.error('Export failed:', error);
    showNotification('Export failed', 'error');
  }
}

// Import data
async function importData() {
  document.getElementById('import-file').click();
}

async function handleImport(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    const response = await chrome.runtime.sendMessage({
      action: 'importData',
      data
    });
    
    if (response.success) {
      showNotification(`Imported ${response.result.imported} memories`);
      await updateStats();
    }
  } catch (error) {
    console.error('Import failed:', error);
    showNotification('Import failed', 'error');
  }
}

// Clear all memories
async function clearAllMemories() {
  try {
    const confirmText = await showPasswordModal('⚠️ Type "DELETE ALL" to confirm');
    
    if (confirmText !== 'DELETE ALL') {
      showNotification('Cancelled - memories not deleted');
      return;
    }
  } catch (error) {
    showNotification('Cancelled - memories not deleted');
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'clearMemories', confirmToken: 'CONFIRM_DELETE_ALL', origin: 'options_page' });
    
    if (response.success) {
      showNotification('All memories cleared');
      await updateStats();
    } else if (response.error === 'confirmation_required') {
      showNotification('Deletion blocked: confirmation token missing', 'error');
    }
  } catch (error) {
    console.error('Failed to clear memories:', error);
    showNotification('Failed to clear memories', 'error');
  }
}

// Show notification
function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = 'notification show';
  
  if (type === 'error') {
    notification.style.background = '#ef4444';
  } else {
    notification.style.background = '#10b981';
  }
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Small inline save indicator near the header
function showSaveIndicator(text = 'Saved ✓') {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  el.textContent = text;
  el.style.display = 'inline-block';
  clearTimeout(showSaveIndicator._t);
  showSaveIndicator._t = setTimeout(() => { el.style.display = 'none'; }, 1800);
}

// Utility functions
function formatNumber(num) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// formatBytes function moved to line 2457 to avoid duplicate declaration

// Event listeners
function attachEventListeners() {
  // Settings buttons (with null checks)
  const saveBtn = document.getElementById('save-btn');
  const resetBtn = document.getElementById('reset-btn');
  
  if (saveBtn) saveBtn.addEventListener('click', saveSettings);
  if (resetBtn) resetBtn.addEventListener('click', resetSettings);
  
  // Legacy storage buttons (removed from UI, keeping for compatibility)
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const clearBtn = document.getElementById('clear-btn');
  const importFile = document.getElementById('import-file');
  
  if (exportBtn) exportBtn.addEventListener('click', exportData);
  if (importBtn) importBtn.addEventListener('click', importData);
  if (clearBtn) clearBtn.addEventListener('click', clearAllMemories);
  
  if (importFile) {
    importFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleImport(file);
      e.target.value = '';
    });
  }
  
  // Auto-save on toggle change
  const toggles = document.querySelectorAll('input[type="checkbox"], select');
  toggles.forEach(toggle => {
    toggle.addEventListener('change', () => {
      // Don't auto-save for disabled inputs
      if (!toggle.disabled) {
        console.log('Auto-saving due to toggle/select change:', toggle.id);
        saveSettings();
      }
    });
  });
  
  // Auto-save on number input change
  const maxMemoriesInput = document.getElementById('max-memories');
  if (maxMemoriesInput) {
    maxMemoriesInput.addEventListener('change', saveSettings);
  }
  
  // Vault Backup & Restore
  setupVaultBackupRestore();
  
  // QR Code Management
  setupQRManagement();
}

// Enhanced Vault Backup & Restore functionality
function setupVaultBackupRestore() {
  const exportVaultBtn = document.getElementById('export-vault');
  const importVaultBtn = document.getElementById('import-vault');
  const importVaultFile = document.getElementById('import-vault-file');
  const backupStatus = document.getElementById('backup-status');
  const refreshBtn = document.getElementById('refresh-vault-info');
  
  console.log('🔧 setupVaultBackupRestore: Checking button elements...');
  console.log('  export-vault:', exportVaultBtn ? '✅' : '❌');
  console.log('  import-vault:', importVaultBtn ? '✅' : '❌');
  console.log('  import-vault-file:', importVaultFile ? '✅' : '❌');
  console.log('  refresh-vault-info:', refreshBtn ? '✅' : '❌');
  
  // Export vault (with null check)
  if (exportVaultBtn) {
    exportVaultBtn.addEventListener('click', async () => {
    try {
      exportVaultBtn.disabled = true;
      exportVaultBtn.innerHTML = '<span class="btn-icon">⏳</span> Exporting...';
      
      let backupPassphrase;
      try {
        backupPassphrase = await showPasswordModal('🔐 Encrypt Backup');
        if (backupPassphrase.length < 12) {
          showBackupStatus('error', '🚫 Passphrase too short (minimum 12 characters)');
          return;
        }
      } catch (error) {
        // User cancelled password entry
        return;
      }
        
      showBackupStatus('info', '🔄 Creating encrypted backup...');
      
      const response = await chrome.runtime.sendMessage({
        action: 'vault.exportFile',
        backupPassphrase
      });
      
      if (response.success) {
        // UI triggers download
        const dataStr = JSON.stringify(response.backup, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.filename;
        a.click();
        URL.revokeObjectURL(url);
        
        showBackupStatus('success', `✅ Vault exported successfully! File: ${response.filename} (${formatBytes(response.size)})`);
        updateLastBackupTime();
        await loadVaultStats(); // Refresh stats
      } else {
        throw new Error(response.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      showBackupStatus('error', `❌ Export failed: ${error.message}`);
    } finally {
      exportVaultBtn.disabled = false;
      exportVaultBtn.innerHTML = '<span class="btn-icon">📤</span> Export Vault';
    }
  });
  
  } else {
    console.warn('⚠️ Export vault button not found in DOM');
  }
  
  // Import vault file picker (with null check)
  if (importVaultBtn && importVaultFile) {
    importVaultBtn.addEventListener('click', () => {
      importVaultFile.click();
    });
  } else {
    console.warn('⚠️ Import vault button or file input not found in DOM');
  }
  
  // Import vault file handler (with null check)
  if (importVaultFile) {
    importVaultFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      // Validate file type and size
      if (!file.name.endsWith('.json')) {
        showBackupStatus('error', '❌ Invalid file type. Please select a .json backup file.');
        return;
      }
      
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        showBackupStatus('error', '❌ File too large. Backup files should be under 100MB.');
        return;
      }
      
      // Ask for passphrases with secure modal
      let backupPassphrase, newPassphrase;
      try {
        backupPassphrase = await showPasswordModal('🔓 Decrypt Backup');
        newPassphrase = await showPasswordModal('🔐 New Vault Passphrase');
        
        if (newPassphrase.length < 8) {
          showBackupStatus('error', '❌ New passphrase must be at least 8 characters');
          return;
        }
      } catch (error) {
        // User cancelled password entry
        return;
      }
      
      showBackupStatus('info', '📖 Reading backup file...');
      
      // Read and validate file
      const fileContent = await readFile(file);
      let backupData;
      try {
        backupData = JSON.parse(fileContent);
      } catch (parseError) {
        throw new Error('Invalid backup file format');
      }
      
      // Basic backup validation
      if (backupData.format !== "emma-secure-backup-v2") {
        throw new Error('Invalid backup structure - unsupported backup format. Please use a backup created with this version of Emma.');
      }
      
      if (!backupData.encryption || !backupData.encrypted_data || !backupData.integrity_hash) {
        throw new Error('Invalid backup structure - missing encryption data');
      }
      
      showBackupStatus('info', '🔐 Restoring vault from backup...');
      
      // Restore vault
      const response = await chrome.runtime.sendMessage({
        action: 'vault.restoreBackup',
        backupData,
        backupPassphrase,
        newPassphrase: newPassphrase,
        options: { generateNewId: true }
      });
      
      if (response.success) {
        const restored = response.restored || {};
        showBackupStatus('success', 
          `✅ Vault restored successfully! ` +
          `Restored ${restored.memories || 0} memories, ${restored.attachments || 0} attachments`
        );
        await loadVaultInfo();
        await loadVaultStats();
      } else {
        throw new Error(response.error || 'Restore failed');
      }
      
    } catch (error) {
      console.error('Import error:', error);
      showBackupStatus('error', `❌ Import failed: ${error.message}`);
    } finally {
      e.target.value = '';
    }
  });
  } else {
    console.warn('⚠️ Import vault file input not found in DOM');
  }
  
  // Refresh vault info button (with null check)
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.innerHTML = '<span>🔄</span> Refreshing...';
      await loadVaultInfo();
      await loadVaultStats();
      refreshBtn.innerHTML = '<span>🔄</span> Refresh';
    });
  } else {
    console.warn('⚠️ Refresh vault info button not found in DOM');
  }
  
  // Load vault info and stats on page load
  loadVaultInfo();
  loadVaultStats();
}

// Enhanced backup status display
function showBackupStatus(type, message) {
  const status = document.getElementById('backup-status');
  if (!status) return;
  
  status.className = `backup-status ${type}`;
  status.textContent = message;
  status.style.display = 'block';
  
  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      status.style.display = 'none';
    }, 10000);
  }
}

// Legacy function for compatibility
function showImportStatus(type, message) {
  const status = document.getElementById('import-status');
  if (status) {
    status.className = `import-status ${type}`;
    status.textContent = message;
    
    if (type === 'success' || type === 'error') {
      setTimeout(() => {
        status.style.display = 'none';
      }, 10000);
    }
  } else {
    // Fallback to new backup status
    showBackupStatus(type, message);
  }
}

async function loadVaultInfo() {
  try {
    console.log('🔧 loadVaultInfo: Starting vault info load...');
    // Update status indicator
    updateVaultStatusIndicator('loading', 'Loading vault info...');
    
    // Add timeout to prevent hanging
    const response = await Promise.race([
      chrome.runtime.sendMessage({ action: 'vault.getStatus' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Vault status timeout')), 5000))
    ]);
    
    console.log('🔧 loadVaultInfo: Got response:', response);
    
    if (response && response.success) {
      const status = response; // response is already the status object with success: true
      
      // Update vault details
      const vaultIdEl = document.getElementById('vault-id');
      if (vaultIdEl) {
        vaultIdEl.textContent = status.vaultId ? status.vaultId.slice(0, 12) + '...' : 'Not available';
      }
      
      const vaultCreatedEl = document.getElementById('vault-created');
      if (vaultCreatedEl) {
        vaultCreatedEl.textContent = status.lastUnlockedAt ? 
          new Date(status.lastUnlockedAt).toLocaleDateString() : 'Unknown';
      }
      
      // Update lock status
      const lockStatusEl = document.getElementById('vault-lock-status');
      if (lockStatusEl) {
        if (status.isUnlocked) {
          lockStatusEl.innerHTML = '<span class="status-indicator">🔓</span> Unlocked';
        } else {
          lockStatusEl.innerHTML = '<span class="status-indicator">🔒</span> Locked';
        }
      }
      
      // Update status indicator
      updateVaultStatusIndicator(status.isUnlocked ? 'unlocked' : 'locked', 
        status.isUnlocked ? 'Vault unlocked' : 'Vault locked');
      
      // Load last backup time from storage
      const result = await chrome.storage.local.get(['emma_last_backup']);
      const lastBackupEl = document.getElementById('vault-last-backup');
      if (lastBackupEl) {
        lastBackupEl.textContent = result.emma_last_backup ? 
          new Date(result.emma_last_backup).toLocaleDateString() : 'Never';
      }
    } else {
      console.error('🔧 loadVaultInfo: Invalid response:', response);
      updateVaultStatusIndicator('error', response && response.error ? `Vault: ${response.error}` : 'Vault system initializing');
    }
  } catch (error) {
    console.error('Failed to load vault info:', error);
    
    // Provide specific error messages
    let errorMessage = 'Vault info unavailable';
    if (error.message === 'Vault status timeout') {
      errorMessage = 'Checking vault status...';
    } else if (error.message.includes('Could not establish connection')) {
      errorMessage = 'Vault system starting...';
    }
    
    updateVaultStatusIndicator('error', errorMessage);
    
    // Set fallback values for vault details
    const vaultIdEl = document.getElementById('vault-id');
    const vaultCreatedEl = document.getElementById('vault-created');
    const lockStatusEl = document.getElementById('vault-lock-status');
    
    if (vaultIdEl) vaultIdEl.textContent = 'Error loading';
    if (vaultCreatedEl) vaultCreatedEl.textContent = 'Error loading';
    if (lockStatusEl) lockStatusEl.innerHTML = '<span class="status-indicator">❌</span> Error';
  }
}

async function loadVaultStats() {
  try {
    // Add timeout to prevent hanging
    const response = await Promise.race([
      chrome.runtime.sendMessage({ action: 'vault.stats' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Vault stats timeout')), 5000))
    ]);
    
    if (response.success && response.stats) {
      const stats = response.stats;
      
      // Update memory count
      const memoryCountEl = document.getElementById('vault-memory-count');
      if (memoryCountEl) {
        memoryCountEl.textContent = stats.totalMemories || '0';
      }
      
      // Update storage size
      const sizeEl = document.getElementById('vault-size');
      if (sizeEl) {
        const sizeBytes = stats.totalSize || 0;
        sizeEl.textContent = formatBytes(sizeBytes);
      }
      
      // Update last backup time
      const result = await chrome.storage.local.get(['emma_last_backup']);
      const lastBackupEl = document.getElementById('vault-last-backup');
      if (lastBackupEl) {
        if (result.emma_last_backup) {
          const backupDate = new Date(result.emma_last_backup);
          const now = new Date();
          const daysDiff = Math.floor((now - backupDate) / (1000 * 60 * 60 * 24));
          
          if (daysDiff === 0) {
            lastBackupEl.textContent = 'Today';
          } else if (daysDiff === 1) {
            lastBackupEl.textContent = 'Yesterday';
          } else if (daysDiff < 7) {
            lastBackupEl.textContent = `${daysDiff} days ago`;
          } else {
            lastBackupEl.textContent = backupDate.toLocaleDateString();
          }
        } else {
          lastBackupEl.textContent = 'Never';
        }
      }
    }
  } catch (error) {
    console.error('Failed to load vault stats:', error);
    
    // Set error values for vault stats
    const vaultMemoryCount = document.getElementById('vault-memory-count');
    const vaultSizeElement = document.getElementById('vault-size');
    const lastBackupEl = document.getElementById('vault-last-backup');
    
    if (vaultMemoryCount) {
      vaultMemoryCount.textContent = 'Error';
    }
    
    if (vaultSizeElement) {
      vaultSizeElement.textContent = 'Error';
    }
    
    if (lastBackupEl) {
      lastBackupEl.textContent = 'Error';
    }
  }
}

// Modern Orb Avatar Selector setup
function setupOrbManager() {
  setupOrbAvatars();
  setupOrbDialog();
  
  // Universal orb system handles orb display  
  console.log('🎯 Options: Universal orb system will handle orb display');
  
  // Debug: Enhanced global click listener to detect click blocking
  document.addEventListener('click', (e) => {
    console.log('🎯 GLOBAL CLICK:', {
      target: e.target,
      tagName: e.target.tagName,
      className: e.target.className,
      id: e.target.id,
      zIndex: getComputedStyle(e.target).zIndex,
      pointerEvents: getComputedStyle(e.target).pointerEvents,
      position: getComputedStyle(e.target).position
    });

    // Check what elements are at this position
    const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
    console.log('🎯 ELEMENTS AT CLICK POINT:', elementsAtPoint.map(el => ({
      tagName: el.tagName,
      className: el.className,
      id: el.id,
      zIndex: getComputedStyle(el).zIndex
    })));

    if (e.target.closest('.emma-universal-orb-container')) {
      console.log('🎯 CLICK DEBUG: Orb container clicked!', e.target);
    } else {
      const orbContainer = document.querySelector('.emma-universal-orb-container');
      if (orbContainer) {
        const rect = orbContainer.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        const inBounds = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        if (inBounds) {
          console.log('🎯 CLICK DEBUG: Click within orb bounds but intercepted!', {
            clickTarget: e.target,
            orbContainer: orbContainer,
            orbRect: rect,
            clickPos: { x, y },
            targetZIndex: getComputedStyle(e.target).zIndex,
            orbZIndex: getComputedStyle(orbContainer).zIndex,
            targetPointerEvents: getComputedStyle(e.target).pointerEvents,
            orbPointerEvents: getComputedStyle(orbContainer).pointerEvents
          });
        }
      }
    }

    // Debug back/close buttons specifically
    if (e.target.id === 'settings-back' || e.target.id === 'settings-close') {
      console.log('🔙 BACK/CLOSE BUTTON CLICKED:', e.target.id);
    }
  }, true);
}

function setupOrbAvatars() {
  // Create real Emma orbs for each avatar
  const orbTypes = [
    { type: 'default', hue: 260, title: 'Emma Assistant' },
    { type: 'dementia', hue: 200, title: 'Memory Companion' },
    { type: 'mirror', hue: 0, title: 'Mirror Emma' } // Silver/gray
  ];
  
  window.avatarOrbs = {};
  
  orbTypes.forEach(({ type, hue, title }) => {
    const avatarContainer = document.querySelector(`#avatar-${type} .orb-container`);
    if (avatarContainer && window.EmmaOrb) {
      try {
        window.avatarOrbs[type] = new EmmaOrb(avatarContainer, {
          hue: hue,
          forceHoverState: false,
          rotateOnHover: true
        });
      } catch (e) {
        console.warn(`Failed to create ${type} avatar orb:`, e);
      }
    }
  });
  
  // Set up click handlers for orb selection
  document.querySelectorAll('.orb-option').forEach(option => {
    option.addEventListener('click', (e) => {
      const orbType = option.dataset.orbType;
      const badge = e.target.closest('.orb-status-badge');
      
      // If clicking specifically on the badge, handle accordingly
      if (badge) {
        if (badge.textContent === 'Configure') {
          // Configure button clicked
          openOrbDialog(orbType);
        } else if (badge.textContent === 'Active') {
          // Active orb clicked - open dialog too
          openOrbDialog(orbType);
        }
        return; // Don't proceed to activation
      }
      
      // If clicking anywhere else on the orb card, activate it
      console.log(`🎯 Activating orb: ${orbType} (from element:`, option, ')');
      console.log(`🎯 Element dataset:`, option.dataset);
      activateOrb(orbType);
    });
  });
  
  // Separate handlers for Configure badges to make them more responsive
  document.querySelectorAll('.orb-status-badge').forEach(badge => {
    badge.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent the main orb click handler
      const option = e.target.closest('.orb-option');
      const orbType = option.dataset.orbType;
      
      console.log(`🔧 Opening settings for: ${orbType}`);
      openOrbDialog(orbType);
    });
  });
  
  // Load and display current active orb
  loadActiveOrbStatus();
}

async function loadActiveOrbStatus() {
  try {
    let vid = 'unknown';
    if (window.emmaAPI?.vault?.status) {
      const st = await window.emmaAPI.vault.status();
      vid = st?.vaultId || vid;
    } else if (window.chrome && chrome.runtime) {
      const vs = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });
      vid = vs?.vaultId || vid;
    }
    
    console.log(`🎯 loadActiveOrbStatus - Using vault ID: ${vid}`);
    
    // DEBUG: Show ALL storage first  
    console.log('🎯 DEBUG: localStorage contents:', 
      Object.fromEntries(Array.from(Array(localStorage.length).keys())
        .map(i => [localStorage.key(i), localStorage.getItem(localStorage.key(i))])));
        
    if (window.chrome && chrome.storage) {
      chrome.storage.local.get(null, (all) => {
        console.log('🎯 DEBUG: chrome.storage.local contents:', all);
      });
    }
    
    // Use SettingsService for deterministic precedence
    const allKeys = [
      `orb.persona:${vid}`,
      `dementia.enabled:${vid}`,
      `mirror.enabled:${vid}`
    ];
    const store = await window.SettingsService.get(allKeys);
    console.log('🎯 FINAL storage keys resolved:', store);
    
    // Now check the specific keys we care about
    const personaKey = `orb.persona:${vid}`;
    const dementiaKey = `dementia.enabled:${vid}`;
    const mirrorKey = `mirror.enabled:${vid}`;
    
    const selectedPersona = store[personaKey];
    const dementiaEnabled = store[dementiaKey];
    const mirrorEnabled = store[mirrorKey];
    
    console.log('🎯 loadActiveOrbStatus - Key analysis:', {
      vid,
      personaKey,
      dementiaKey,
      mirrorKey,
      selectedPersona,
      dementiaEnabled,
      mirrorEnabled,
      'KEY_EXISTS_IN_STORE': personaKey in store,
      'ACTUAL_VALUE': store[personaKey],
      'ALL_PERSONA_KEYS': Object.keys(store).filter(k => k.includes('orb.persona'))
    });
    
    // ULTRA-DEBUG: Let's see exactly what's happening
    console.log('🎯 ULTRA-DEBUG - Raw storage values:');
    console.log('- dementiaEnabled:', dementiaEnabled, '(type:', typeof dementiaEnabled, ')');
    console.log('- mirrorEnabled:', mirrorEnabled, '(type:', typeof mirrorEnabled, ')');
    console.log('- selectedPersona:', selectedPersona, '(type:', typeof selectedPersona, ')');
    
    // Selection precedence: explicit persona (if set) → enabled flags → default
    let activeOrb = 'default';
    if (selectedPersona && selectedPersona !== 'default') {
      activeOrb = selectedPersona;
      console.log('🔥 EXPLICIT PERSONA -> activeOrb =', activeOrb);
    } else if (dementiaEnabled === true) {
      activeOrb = 'dementia';
      console.log('🔥 DEMENTIA IS TRUE -> activeOrb = dementia');
    } else if (mirrorEnabled === true) {
      activeOrb = 'mirror';
      console.log('🔥 MIRROR IS TRUE -> activeOrb = mirror');
    } else {
      activeOrb = 'default';
      console.log('🔥 NOTHING ENABLED -> activeOrb = default');
    }
    
    console.log('🔥 FINAL DECISION: activeOrb =', activeOrb);
    console.log('🔥 DECISION LOGIC: selectedPersona:', selectedPersona, ', dementiaEnabled:', dementiaEnabled, ', mirrorEnabled:', mirrorEnabled);
    
    console.log(`🎯 loadActiveOrbStatus - determined active orb: ${activeOrb}`);
    
    // Update UI - FORCE the changes
    console.log('🎯 Starting UI update for active orb:', activeOrb);
    
    document.querySelectorAll('.orb-option').forEach(option => {
      const type = option.dataset.orbType;
      const badge = option.querySelector('.orb-status-badge');
      
      console.log(`🎯 Processing orb option: ${type}, badge exists:`, !!badge);
      
      if (!badge) {
        console.error(`🎯 ERROR: No badge found for ${type}`);
        return;
      }
      
      if (type === activeOrb) {
        console.log(`🎯 ✅ SETTING ${type} TO ACTIVE`);
        
        // Force remove all existing classes
        option.className = 'orb-option active';
        badge.className = 'orb-status-badge';
        
        // Set active state
        badge.textContent = 'Active';
        badge.style.background = 'var(--emma-gradient-1)';
        badge.style.color = 'white';
        
        console.log(`🎯 ✅ ${type} badge text set to:`, badge.textContent);
      } else {
        console.log(`🎯 ⚪ SETTING ${type} TO INACTIVE`);
        
        // Force remove all existing classes  
        option.className = 'orb-option';
        badge.className = 'orb-status-badge inactive';
        
        // Set inactive state
        badge.textContent = 'Configure';
        badge.style.background = 'rgba(255, 255, 255, 0.1)';
        badge.style.color = 'var(--emma-text-secondary)';
        
        console.log(`🎯 ⚪ ${type} badge text set to:`, badge.textContent);
      }
    });
    
    console.log('🎯 UI update completed');
    
  } catch (e) {
    console.warn('Failed to load active orb status:', e);
  }
}

async function activateOrb(orbType) {
  console.log(`🎯 activateOrb called with: ${orbType}`);
  
  try {
    let vid = 'unknown';
    if (window.emmaAPI?.vault?.status) {
      const st = await window.emmaAPI.vault.status();
      vid = st?.vaultId || vid;
    } else if (window.chrome && chrome.runtime) {
      try {
        const vs = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });
        vid = vs?.vaultId || vid;
      } catch (e) {
        console.warn('Failed to get vault status, using default');
      }
    }
    
    console.log(`🎯 Using vault ID: ${vid}`);
    
    // Set the selected persona and clear all other enabled flags
    const settings = {
      [`orb.persona:${vid}`]: orbType,
      // Clear all enabled flags first
      [`dementia.enabled:${vid}`]: false,
      [`mirror.enabled:${vid}`]: false
    };
    
    // Only set enabled flag for the selected non-default orb
    if (orbType !== 'default') {
      settings[`${orbType}.enabled:${vid}`] = true;
    }
    console.log('🎯 Settings to save (service):', settings);
    await window.SettingsService.set(settings);
    
    // DEBUG: Verify what was actually saved
    const verification = await window.SettingsService.get(Object.keys(settings));
    console.log('🎯 Verification read after save:', verification);
    
    // Broadcast settings change
    if (window.chrome && chrome.runtime) {
      try {
        chrome.runtime.sendMessage({ action: 'settings.changed', settings });
        console.log('✅ Broadcasted settings change');
        
        // Special handling for dementia companion
        if (orbType === 'dementia') {
          localStorage.setItem('dementia.settings.bump', Date.now().toString());
          window.postMessage({ type: 'DEMENTIA_SETTINGS_CHANGED', settings }, '*');
          console.log('✅ Triggered dementia-specific updates');
        }
      } catch (e) {
        console.warn('Failed to broadcast settings:', e);
      }
    }
    // Universal bumps for all personas
    try {
      localStorage.setItem('orb.settings.bump', Date.now().toString());
      window.postMessage({ type: 'ORB_SETTINGS_CHANGED', settings }, '*');
    } catch {}
    
    // Show success
    showNotification(`${getOrbDisplayName(orbType)} activated!`);
    
    // Force immediate UI update
    console.log('🎯 Force updating UI immediately...');
    await loadActiveOrbStatus();
    
    // Double-check - force another update after a short delay
    setTimeout(async () => {
      console.log('🎯 Secondary UI update...');
      await loadActiveOrbStatus();
    }, 100);
    
    console.log(`✅ Successfully activated orb: ${orbType}`);
    
  } catch (e) {
    console.error('Failed to activate orb:', e);
    showNotification('Failed to activate orb', 'error');
  }
}

function getOrbDisplayName(orbType) {
  const names = {
    'default': 'Emma Assistant',
    'dementia': 'Memory Companion',
    'mirror': 'Mirror Emma'
  };
  return names[orbType] || orbType;
}

async function loadOrbSettings() {
  try {
    let vid = 'unknown';
    if (window.emmaAPI?.vault?.status) {
      const st = await window.emmaAPI.vault.status();
      vid = st?.vaultId || vid;
    } else if (window.chrome && chrome.runtime) {
      const vs = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });
      vid = vs?.vaultId || vid;
    }
    
    const keys = [
      `orb.persona:${vid}`,
      `orb.colorTheme:${vid}`,
      `orb.customColor:${vid}`,
      `orb.size:${vid}`,
      `orb.position:${vid}`,
      `orb.autoHide:${vid}`,
      `orb.hideMinutes:${vid}`
    ];
    
    let store = {};
    if (window.emmaAPI?.storage?.get) {
      store = await window.emmaAPI.storage.get(keys);
    } else if (window.chrome && chrome.storage && chrome.storage.local) {
      store = await chrome.storage.local.get(keys);
    }
    
    // Apply loaded settings
    const $ = (id) => document.getElementById(id);
    if ($('orb-persona')) $('orb-persona').value = store[keys[0]] || 'default';
    if ($('orb-color-theme')) $('orb-color-theme').value = store[keys[1]] || 'default';
    if ($('orb-custom-color')) $('orb-custom-color').value = store[keys[2]] || '#8b5cf6';
    if ($('orb-size')) {
      $('orb-size').value = store[keys[3]] || 72;
      $('orb-size-value').textContent = (store[keys[3]] || 72) + 'px';
    }
    if ($('orb-position')) $('orb-position').value = store[keys[4]] || 'bottom-right';
    if ($('orb-auto-hide')) $('orb-auto-hide').checked = store[keys[5]] || false;
    if ($('orb-hide-minutes')) $('orb-hide-minutes').value = store[keys[6]] || 5;
    
    // Show/hide auto-hide time based on checkbox
    if ($('orb-auto-hide-time')) {
      $('orb-auto-hide-time').style.display = store[keys[5]] ? 'block' : 'none';
    }
    
    // Show/hide custom color picker
    if ($('orb-color-theme').value === 'custom') {
      $('orb-custom-color').style.display = 'inline-block';
    }
  } catch (e) {
    console.warn('Failed to load orb settings:', e?.message);
  }
}

function updateOrbPreview() {
  const preview = document.getElementById('orb-preview');
  if (!preview) return;
  
  const colorTheme = document.getElementById('orb-color-theme').value;
  const customColor = document.getElementById('orb-custom-color').value;
  const size = document.getElementById('orb-size').value;
  const persona = document.getElementById('orb-persona').value;
  
  // Update size
  preview.style.width = size + 'px';
  preview.style.height = size + 'px';
  
  // Calculate hue for the real Emma orb
  const hue = getHueFromPersonaAndTheme(persona, colorTheme, customColor);
  
  // Clear existing content and create real Emma orb
  preview.innerHTML = '';
  preview.style.background = 'transparent';
  preview.style.boxShadow = 'none';
  
  // Create the actual Emma orb
  if (window.EmmaOrb) {
    try {
      window.orbPreviewInstance = new EmmaOrb(preview, {
        hue: hue,
        forceHoverState: true, // Always show active state for preview
        rotateOnHover: false   // Disable rotation for preview
      });
    } catch (e) {
      console.warn('Failed to create orb preview, using fallback:', e);
      createFallbackPreview(preview, size, hue);
    }
  } else {
    createFallbackPreview(preview, size, hue);
  }
}

function getHueFromPersonaAndTheme(persona, colorTheme, customColor) {
  // Persona-specific defaults
  const personaHues = {
    'default': 260,     // Purple
    'dementia': 200,    // Blue
    'therapy': 120,     // Green
    'coaching': 30      // Orange
  };
  
  // Theme colors
  const themeHues = {
    'default': personaHues[persona] || 260,
    'purple': 260,
    'blue': 200,
    'green': 120,
    'orange': 30,
    'pink': 330,
    'custom': hexToHue(customColor)
  };
  
  return themeHues[colorTheme] || personaHues[persona] || 260;
}

function hexToHue(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 260;
  
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  let hue = 0;
  if (delta === 0) {
    hue = 0;
  } else if (max === r) {
    hue = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
  } else if (max === g) {
    hue = ((b - r) / delta + 2) / 6;
  } else {
    hue = ((r - g) / delta + 4) / 6;
  }
  
  return Math.round(hue * 360);
}

function createFallbackPreview(container, size, hue) {
  // Create a simple animated CSS fallback that mimics the orb
  container.innerHTML = `
    <div style="
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, 
        hsla(${hue}, 70%, 60%, 0.3) 0%, 
        hsla(${hue}, 80%, 50%, 0.6) 50%, 
        hsla(${hue}, 90%, 40%, 0.9) 100%);
      border: 2px solid hsla(${hue}, 80%, 60%, 0.8);
      box-shadow: 
        0 0 20px hsla(${hue}, 80%, 60%, 0.4),
        inset 0 0 20px hsla(${hue}, 90%, 70%, 0.2);
      animation: orbPulse 2s ease-in-out infinite alternate;
    "></div>
    <style>
      @keyframes orbPulse {
        0% { transform: scale(0.95); opacity: 0.8; }
        100% { transform: scale(1.05); opacity: 1; }
      }
    </style>
  `;
}

// Orb Settings Dialog
let currentDialogOrb = null;
let dialogOrbInstance = null;

function setupOrbDialog() {
  const dialog = document.getElementById('orb-settings-dialog');
  const closeBtn = document.getElementById('close-orb-dialog');
  const cancelBtn = document.getElementById('dialog-cancel');
  const saveBtn = document.getElementById('dialog-save');
  const resetBtn = document.getElementById('dialog-reset');
  
  // Close handlers
  closeBtn.addEventListener('click', closeOrbDialog);
  cancelBtn.addEventListener('click', closeOrbDialog);
  
  // Click outside to close
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closeOrbDialog();
  });
  
  // Tab switching
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      switchDialogTab(tabName);
    });
  });
  
  // Settings interactions
  setupDialogSettings();
  
  // Save button
  saveBtn.addEventListener('click', saveDialogSettings);
  
  // Reset button
  resetBtn.addEventListener('click', resetDialogSettings);
}

function openOrbDialog(orbType) {
  currentDialogOrb = orbType;
  const dialog = document.getElementById('orb-settings-dialog');
  
  // Update dialog title and info
  const orbInfo = {
    'default': {
      title: 'Emma Assistant',
      subtitle: 'Your versatile AI companion',
      hue: 260
    },
    'dementia': {
      title: 'Memory Companion',
      subtitle: 'Specialized memory care support',
      hue: 200
    },
    'mirror': {
      title: 'Mirror Emma',
      subtitle: 'Adaptive reflection companion',
      hue: 0
    }
  };
  
  const info = orbInfo[orbType];
  document.getElementById('dialog-orb-title').textContent = info.title;
  document.getElementById('dialog-orb-subtitle').textContent = info.subtitle;
  
  // Create dialog orb preview
  const previewContainer = document.querySelector('#dialog-orb-preview .orb-container');
  if (previewContainer && window.EmmaOrb) {
    // Cleanup existing
    if (dialogOrbInstance && dialogOrbInstance.cleanup) {
      dialogOrbInstance.cleanup();
    }
    
    try {
      dialogOrbInstance = new EmmaOrb(previewContainer, {
        hue: info.hue,
        forceHoverState: true,
        rotateOnHover: false
      });
    } catch (e) {
      console.warn('Failed to create dialog orb preview:', e);
    }
  }
  
  // Show/hide type-specific settings
  document.getElementById('dementia-specific').style.display = orbType === 'dementia' ? 'block' : 'none';
  document.getElementById('mirror-specific').style.display = orbType === 'mirror' ? 'block' : 'none';
  
  // Load current settings for this orb
  loadDialogSettings(orbType);
  
  // Show dialog
  dialog.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeOrbDialog() {
  const dialog = document.getElementById('orb-settings-dialog');
  dialog.classList.remove('active');
  document.body.style.overflow = '';
  
  // Cleanup dialog orb
  if (dialogOrbInstance && dialogOrbInstance.cleanup) {
    dialogOrbInstance.cleanup();
    dialogOrbInstance = null;
  }
  
  currentDialogOrb = null;
}

function switchDialogTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabName}`);
  });
}

async function loadDialogSettings(orbType) {
  try {
    let vid = 'unknown';
    if (window.emmaAPI?.vault?.status) {
      const st = await window.emmaAPI.vault.status();
      vid = st?.vaultId || vid;
    } else if (window.chrome && chrome.runtime) {
      const vs = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });
      vid = vs?.vaultId || vid;
    }
    
    // Load all relevant settings
    const keys = [
      `orb.colorTheme:${vid}`,
      `orb.customColor:${vid}`,
      `orb.size:${vid}`,
      `orb.position:${vid}`,
      `orb.autoHide:${vid}`,
      `orb.hideMinutes:${vid}`,
      `${orbType}.voiceEnabled:${vid}`,
      `${orbType}.responseStyle:${vid}`,
      `${orbType}.wakeWord:${vid}`,
      `${orbType}.enabled:${vid}`
    ];
    
    // Add type-specific keys
    if (orbType === 'dementia') {
      keys.push(`dementia.stage:${vid}`, `dementia.storeTranscripts:${vid}`);
    } else if (orbType === 'mirror') {
      keys.push(`mirror.adaptationSpeed:${vid}`, `mirror.mirrorStyle:${vid}`);
    }
    
    let store = {};
    if (window.emmaAPI?.storage?.get) {
      store = await window.emmaAPI.storage.get(keys);
    } else if (window.chrome && chrome.storage && chrome.storage.local) {
      store = await chrome.storage.local.get(keys);
    }
    
    // Apply settings to dialog controls
    applySettingsToDialog(store, vid, orbType);
    
  } catch (e) {
    console.warn('Failed to load dialog settings:', e);
  }
}

function applySettingsToDialog(store, vid, orbType) {
  // Appearance settings
  const colorTheme = store[`orb.colorTheme:${vid}`] || 'default';
  document.querySelectorAll('.color-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.color === colorTheme);
  });
  
  const customColor = store[`orb.customColor:${vid}`] || '#8b5cf6';
  document.getElementById('dialog-custom-color').value = customColor;
  document.getElementById('dialog-custom-color').style.display = colorTheme === 'custom' ? 'block' : 'none';
  
  const size = store[`orb.size:${vid}`] || 72;
  document.getElementById('dialog-orb-size').value = size;
  document.getElementById('dialog-size-value').textContent = size + 'px';
  
  const position = store[`orb.position:${vid}`] || 'bottom-right';
  document.querySelectorAll('.position-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.position === position);
  });
  
  const autoHide = store[`orb.autoHide:${vid}`] || false;
  document.getElementById('dialog-auto-hide').checked = autoHide;
  document.getElementById('dialog-auto-hide-options').style.display = autoHide ? 'block' : 'none';
  
  const hideMinutes = store[`orb.hideMinutes:${vid}`] || 5;
  document.getElementById('dialog-hide-minutes').value = hideMinutes;
  
  // Behavior settings
  const voiceEnabled = store[`${orbType}.voiceEnabled:${vid}`] || false;
  document.getElementById('dialog-voice-enabled').checked = voiceEnabled;
  
  const responseStyle = store[`${orbType}.responseStyle:${vid}`] || 'conversational';
  document.getElementById('dialog-response-style').value = responseStyle;
  
  const wakeWord = store[`${orbType}.wakeWord:${vid}`] || 'Emma';
  document.getElementById('dialog-wake-word').value = wakeWord;
  
  // Type-specific settings
  if (orbType === 'dementia') {
    const stage = store[`dementia.stage:${vid}`] || 'EARLY';
    document.getElementById('dialog-dementia-stage').value = stage;
    
    const storeTranscripts = store[`dementia.storeTranscripts:${vid}`] || false;
    document.getElementById('dialog-store-transcripts').checked = storeTranscripts;
  } else if (orbType === 'mirror') {
    const adaptationSpeed = store[`mirror.adaptationSpeed:${vid}`] || 5;
    document.getElementById('dialog-adaptation-speed').value = adaptationSpeed;
    
    const mirrorStyle = store[`mirror.mirrorStyle:${vid}`] || true;
    document.getElementById('dialog-mirror-style').checked = mirrorStyle;
  }
}

function setupDialogSettings() {
  // Color theme selection
  document.querySelectorAll('.color-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
      
      const isCustom = option.dataset.color === 'custom';
      document.getElementById('dialog-custom-color').style.display = isCustom ? 'block' : 'none';
      
      updateDialogOrbPreview();
    });
  });
  
  // Custom color picker
  document.getElementById('dialog-custom-color').addEventListener('input', updateDialogOrbPreview);
  
  // Size slider
  document.getElementById('dialog-orb-size').addEventListener('input', (e) => {
    document.getElementById('dialog-size-value').textContent = e.target.value + 'px';
    updateDialogOrbPreview();
  });
  
  // Position selection
  document.querySelectorAll('.position-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.position-option').forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
    });
  });
  
  // Auto-hide toggle
  document.getElementById('dialog-auto-hide').addEventListener('change', (e) => {
    document.getElementById('dialog-auto-hide-options').style.display = e.target.checked ? 'block' : 'none';
  });
  
  // Response delay slider
  document.getElementById('dialog-response-delay').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value) / 1000;
    document.getElementById('dialog-delay-value').textContent = value.toFixed(1) + 's';
  });
}

function updateDialogOrbPreview() {
  if (!dialogOrbInstance) return;
  
  const activeColor = document.querySelector('.color-option.active');
  const customColor = document.getElementById('dialog-custom-color').value;
  
  let hue = 260; // default
  if (activeColor) {
    const colorMap = {
      'default': 260,
      'blue': 200,
      'green': 120,
      'orange': 30,
      'pink': 330,
      'custom': hexToHue(customColor)
    };
    hue = colorMap[activeColor.dataset.color] || 260;
  }
  
  // Update orb hue
  if (dialogOrbInstance.options) {
    dialogOrbInstance.options.hue = hue;
  }
}

async function saveDialogSettings() {
  if (!currentDialogOrb) return;
  
  try {
    let vid = 'unknown';
    if (window.emmaAPI?.vault?.status) {
      const st = await window.emmaAPI.vault.status();
      vid = st?.vaultId || vid;
    } else if (window.chrome && chrome.runtime) {
      const vs = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });
      vid = vs?.vaultId || vid;
    }
    
    // Collect all settings from dialog
    const settings = {
      [`orb.persona:${vid}`]: currentDialogOrb,
      [`orb.colorTheme:${vid}`]: document.querySelector('.color-option.active')?.dataset.color || 'default',
      [`orb.customColor:${vid}`]: document.getElementById('dialog-custom-color').value,
      [`orb.size:${vid}`]: parseInt(document.getElementById('dialog-orb-size').value),
      [`orb.position:${vid}`]: document.querySelector('.position-option.active')?.dataset.position || 'bottom-right',
      [`orb.autoHide:${vid}`]: document.getElementById('dialog-auto-hide').checked,
      [`orb.hideMinutes:${vid}`]: parseInt(document.getElementById('dialog-hide-minutes').value),
      [`${currentDialogOrb}.enabled:${vid}`]: true,
      [`${currentDialogOrb}.voiceEnabled:${vid}`]: document.getElementById('dialog-voice-enabled').checked,
      [`${currentDialogOrb}.responseStyle:${vid}`]: document.getElementById('dialog-response-style').value,
      [`${currentDialogOrb}.wakeWord:${vid}`]: document.getElementById('dialog-wake-word').value
    };
    
    // Add type-specific settings
    if (currentDialogOrb === 'dementia') {
      settings[`dementia.stage:${vid}`] = document.getElementById('dialog-dementia-stage').value;
      settings[`dementia.storeTranscripts:${vid}`] = document.getElementById('dialog-store-transcripts').checked;
    } else if (currentDialogOrb === 'mirror') {
      settings[`mirror.adaptationSpeed:${vid}`] = parseInt(document.getElementById('dialog-adaptation-speed').value);
      settings[`mirror.mirrorStyle:${vid}`] = document.getElementById('dialog-mirror-style').checked;
    }
    
    // Save settings
    if (window.emmaAPI?.storage?.set) {
      await window.emmaAPI.storage.set(settings);
    }
    if (window.chrome && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set(settings);
    }
    
    // Broadcast settings change
    if (window.chrome && chrome.runtime) {
      chrome.runtime.sendMessage({ action: 'settings.changed', settings });
      
      // Update localStorage for dementia companion
      if (currentDialogOrb === 'dementia') {
        localStorage.setItem('dementia.settings.bump', Date.now().toString());
        window.postMessage({ type: 'DEMENTIA_SETTINGS_CHANGED', settings }, '*');
      }
    }
    
    // Show success
    showNotification('Settings saved successfully!');
    showSaveIndicator();
    
    // Update avatar status and close dialog
    await loadActiveOrbStatus();
    closeOrbDialog();
    
  } catch (e) {
    console.error('Failed to save dialog settings:', e);
    showNotification('Failed to save settings', 'error');
  }
}

function resetDialogSettings() {
  if (!confirm('Reset all settings for this orb to defaults?')) return;
  
  // Reset to default values
  document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
  document.querySelector('.color-option[data-color="default"]').classList.add('active');
  document.getElementById('dialog-custom-color').style.display = 'none';
  
  document.getElementById('dialog-orb-size').value = 72;
  document.getElementById('dialog-size-value').textContent = '72px';
  
  document.querySelectorAll('.position-option').forEach(opt => opt.classList.remove('active'));
  document.querySelector('.position-option[data-position="bottom-right"]').classList.add('active');
  
  document.getElementById('dialog-auto-hide').checked = false;
  document.getElementById('dialog-auto-hide-options').style.display = 'none';
  document.getElementById('dialog-hide-minutes').value = 5;
  
  document.getElementById('dialog-voice-enabled').checked = false;
  document.getElementById('dialog-response-style').value = 'conversational';
  document.getElementById('dialog-wake-word').value = 'Emma';
  
  if (currentDialogOrb === 'dementia') {
    document.getElementById('dialog-dementia-stage').value = 'EARLY';
    document.getElementById('dialog-store-transcripts').checked = false;
  } else if (currentDialogOrb === 'mirror') {
    document.getElementById('dialog-adaptation-speed').value = 5;
    document.getElementById('dialog-mirror-style').checked = true;
  }
  
  updateDialogOrbPreview();
}

// Make openOrbDialog globally available
window.openOrbDialog = openOrbDialog;

// Cleanup function for orb preview
function cleanupOrbPreview() {
  if (window.orbPreviewInstance && window.orbPreviewInstance.cleanup) {
    window.orbPreviewInstance.cleanup();
    window.orbPreviewInstance = null;
  }
}

function updateVaultStatusIndicator(status, text) {
  const statusDot = document.getElementById('vault-status-dot');
  const statusText = document.getElementById('vault-status-text');
  
  if (statusDot) {
    statusDot.className = `status-dot status-${status}`;
  }
  
  if (statusText) {
    statusText.textContent = text;
  }
}

function updateLastBackupTime() {
  const now = Date.now();
  chrome.storage.local.set({ emma_last_backup: now });
  document.getElementById('last-backup').textContent = new Date(now).toLocaleDateString();
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==========================================
// Migration System Functions
// ==========================================

let migrationState = {
  analyzing: false,
  migrating: false,
  currentAnalysis: null,
  currentResult: null
};

/**
 * Initialize migration system on page load
 */
async function initializeMigrationSystem() {
  console.log('🔄 Options: Initializing migration system...');
  
  try {
    // Set up event listeners
    setupMigrationEventListeners();
    
    // Check for legacy data automatically
    await checkForLegacyData();
    
    console.log('✅ Options: Migration system initialized');
  } catch (error) {
    console.error('❌ Options: Failed to initialize migration system:', error);
    updateMigrationStatus('error', `Initialization failed: ${error.message}`);
  }
}

/**
 * Set up migration event listeners
 */
function setupMigrationEventListeners() {
  const analyzeLegacyBtn = document.getElementById('analyze-legacy-btn');
  const previewMigrationBtn = document.getElementById('preview-migration-btn');
  const startMigrationBtn = document.getElementById('start-migration-btn');
  const refreshMigrationBtn = document.getElementById('refresh-migration-btn');

  if (analyzeLegacyBtn) {
    analyzeLegacyBtn.addEventListener('click', analyzeLegacyData);
  }
  
  if (previewMigrationBtn) {
    previewMigrationBtn.addEventListener('click', () => runMigration(true));
  }
  
  if (startMigrationBtn) {
    startMigrationBtn.addEventListener('click', () => runMigration(false));
  }
  
  if (refreshMigrationBtn) {
    refreshMigrationBtn.addEventListener('click', checkForLegacyData);
  }
}

/**
 * Check for legacy data on page load
 */
async function checkForLegacyData() {
  console.log('🔍 Options: Checking for legacy data...');
  updateMigrationStatus('loading', 'Checking for legacy data...');
  
  try {
    const response = await Promise.race([
      chrome.runtime.sendMessage({ action: 'vault.migration.analyze' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
    ]);

    if (response && response.success) {
      const analysis = response.analysis;
      const totalLegacy = analysis.legacyMemories.count + analysis.mtapMemories.count;
      
      if (totalLegacy > 0) {
        updateMigrationStatus('ready', `Found ${totalLegacy} memories to migrate`);
        showMigrationAnalysis(analysis);
        showMigrationOptions();
        showMigrationButtons(['preview-migration-btn', 'start-migration-btn']);
      } else {
        updateMigrationStatus('completed', 'No legacy data found - all memories are in vault');
        hideMigrationSections();
      }
      
      migrationState.currentAnalysis = analysis;
    } else {
      const error = response ? response.error : 'Invalid response';
      updateMigrationStatus('error', error);
    }
  } catch (error) {
    console.error('❌ Options: Failed to check legacy data:', error);
    if (error.message === 'Timeout') {
      updateMigrationStatus('error', 'Migration check timed out - background script may not be responding');
    } else {
      updateMigrationStatus('error', `Failed to check legacy data: ${error.message}`);
    }
  }
}

/**
 * Analyze legacy data
 */
async function analyzeLegacyData() {
  if (migrationState.analyzing) return;
  
  migrationState.analyzing = true;
  updateMigrationStatus('loading', 'Analyzing legacy data...');
  
  const analyzeLegacyBtn = document.getElementById('analyze-legacy-btn');
  if (analyzeLegacyBtn) {
    analyzeLegacyBtn.disabled = true;
    analyzeLegacyBtn.textContent = '🔄 Analyzing...';
  }
  
  try {
    const response = await Promise.race([
      chrome.runtime.sendMessage({ action: 'vault.migration.analyze' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
    ]);

    if (response && response.success) {
      const analysis = response.analysis;
      const totalLegacy = analysis.legacyMemories.count + analysis.mtapMemories.count;
      
      updateMigrationStatus('ready', `Analysis complete - ${totalLegacy} memories found`);
      showMigrationAnalysis(analysis);
      showMigrationOptions();
      showMigrationButtons(['preview-migration-btn', 'start-migration-btn']);
      
      migrationState.currentAnalysis = analysis;
    } else {
      const error = response ? response.error : 'Analysis failed';
      updateMigrationStatus('error', error);
    }
  } catch (error) {
    console.error('❌ Options: Analysis failed:', error);
    updateMigrationStatus('error', `Analysis failed: ${error.message}`);
  } finally {
    migrationState.analyzing = false;
    if (analyzeLegacyBtn) {
      analyzeLegacyBtn.disabled = false;
      analyzeLegacyBtn.innerHTML = '<span>📊</span> Analyze Legacy Data';
    }
  }
}

/**
 * Run migration (preview or live)
 */
async function runMigration(isDryRun = false) {
  if (migrationState.migrating) return;
  
  migrationState.migrating = true;
  
  // Get migration options
  const options = getMigrationOptions();
  options.dryRun = isDryRun;
  
  updateMigrationStatus('migrating', `${isDryRun ? 'Previewing' : 'Running'} migration...`);
  showMigrationProgress();
  hideMigrationButtons(['preview-migration-btn', 'start-migration-btn']);
  
  try {
    const response = await chrome.runtime.sendMessage({ 
      action: 'vault.migration.migrate',
      options 
    });

    if (response && response.success) {
      const result = response.result;
      
      updateMigrationStatus('completed', `${isDryRun ? 'Preview' : 'Migration'} completed successfully`);
      showMigrationResults(result);
      hideMigrationProgress();
      
      if (isDryRun) {
        showMigrationButtons(['start-migration-btn', 'refresh-migration-btn']);
      } else {
        showMigrationButtons(['refresh-migration-btn']);
      }
      
      migrationState.currentResult = result;
    } else {
      const error = response ? response.error : 'Migration failed';
      updateMigrationStatus('error', error);
      hideMigrationProgress();
      showMigrationButtons(['preview-migration-btn', 'start-migration-btn', 'refresh-migration-btn']);
    }
  } catch (error) {
    console.error('❌ Options: Migration failed:', error);
    updateMigrationStatus('error', `Migration failed: ${error.message}`);
    hideMigrationProgress();
    showMigrationButtons(['preview-migration-btn', 'start-migration-btn', 'refresh-migration-btn']);
  } finally {
    migrationState.migrating = false;
  }
}

/**
 * Get migration options from UI
 */
function getMigrationOptions() {
  const dryRunCheckbox = document.getElementById('migration-dry-run');
  const skipDuplicatesCheckbox = document.getElementById('migration-skip-duplicates');
  const backupFirstCheckbox = document.getElementById('migration-backup-first');
  
  return {
    dryRun: dryRunCheckbox ? dryRunCheckbox.checked : true,
    skipDuplicates: skipDuplicatesCheckbox ? skipDuplicatesCheckbox.checked : true,
    backupBeforeMigration: backupFirstCheckbox ? backupFirstCheckbox.checked : true,
    batchSize: 10
  };
}

/**
 * Update migration status indicator
 */
function updateMigrationStatus(status, message) {
  const statusDot = document.getElementById('migration-status-dot');
  const statusText = document.getElementById('migration-status-text');
  const statusDiv = document.getElementById('migration-status');
  
  if (statusDot) {
    statusDot.className = `status-dot status-${status}`;
  }
  
  if (statusText) {
    statusText.textContent = message;
  }
  
  if (statusDiv) {
    statusDiv.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  }
  
  console.log(`🔄 Migration Status: ${status} - ${message}`);
}

/**
 * Show migration analysis results
 */
function showMigrationAnalysis(analysis) {
  const analysisDiv = document.getElementById('migration-analysis');
  const legacyCountEl = document.getElementById('legacy-count');
  const mtapCountEl = document.getElementById('mtap-count');
  const totalSizeEl = document.getElementById('total-size');
  const duplicateCountEl = document.getElementById('duplicate-count');
  
  if (analysisDiv) analysisDiv.style.display = 'block';
  
  if (legacyCountEl) legacyCountEl.textContent = formatNumber(analysis.legacyMemories.count);
  if (mtapCountEl) mtapCountEl.textContent = formatNumber(analysis.mtapMemories.count);
  if (totalSizeEl) totalSizeEl.textContent = formatBytes(analysis.legacyMemories.totalSize + analysis.mtapMemories.totalSize);
  if (duplicateCountEl) duplicateCountEl.textContent = formatNumber(analysis.duplicates.length);
}

/**
 * Show migration options
 */
function showMigrationOptions() {
  const optionsDiv = document.getElementById('migration-options');
  if (optionsDiv) optionsDiv.style.display = 'block';
}

/**
 * Show migration progress
 */
function showMigrationProgress() {
  const progressDiv = document.getElementById('migration-progress');
  if (progressDiv) progressDiv.style.display = 'block';
  
  // Reset progress
  updateMigrationProgress('Starting...', 0);
}

/**
 * Hide migration progress
 */
function hideMigrationProgress() {
  const progressDiv = document.getElementById('migration-progress');
  if (progressDiv) progressDiv.style.display = 'none';
}

/**
 * Update migration progress
 */
function updateMigrationProgress(phase, progress) {
  const phaseEl = document.getElementById('migration-phase');
  const fillEl = document.getElementById('migration-progress-fill');
  const percentageEl = document.getElementById('migration-percentage');
  
  if (phaseEl) phaseEl.textContent = phase;
  if (fillEl) fillEl.style.width = `${progress * 100}%`;
  if (percentageEl) percentageEl.textContent = `${Math.round(progress * 100)}%`;
}

/**
 * Show migration results
 */
function showMigrationResults(result) {
  const resultsDiv = document.getElementById('migration-results');
  const migratedCountEl = document.getElementById('migrated-count');
  const skippedCountEl = document.getElementById('skipped-count');
  const failedCountEl = document.getElementById('failed-count');
  
  if (resultsDiv) resultsDiv.style.display = 'block';
  
  if (migratedCountEl) migratedCountEl.textContent = formatNumber(result.totalMigrated || 0);
  if (skippedCountEl) skippedCountEl.textContent = formatNumber(result.totalSkipped || 0);
  if (failedCountEl) failedCountEl.textContent = formatNumber(result.totalFailed || 0);
}

/**
 * Show specific migration buttons
 */
function showMigrationButtons(buttonIds) {
  buttonIds.forEach(id => {
    const button = document.getElementById(id);
    if (button) button.style.display = 'inline-flex';
  });
}

/**
 * Hide specific migration buttons
 */
function hideMigrationButtons(buttonIds) {
  buttonIds.forEach(id => {
    const button = document.getElementById(id);
    if (button) button.style.display = 'none';
  });
}

/**
 * Hide all migration sections
 */
function hideMigrationSections() {
  const sections = ['migration-analysis', 'migration-options', 'migration-progress', 'migration-results'];
  sections.forEach(id => {
    const section = document.getElementById(id);
    if (section) section.style.display = 'none';
  });
  
  hideMigrationButtons(['preview-migration-btn', 'start-migration-btn']);
  showMigrationButtons(['refresh-migration-btn']);
}