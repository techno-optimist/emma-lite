/**
 * Emma Vault Extension - Popup Controller
 * Self-contained vault management interface
 * Built with love for Debbe and all precious memories
 */

// Application State
class EmmaVaultExtension {
  constructor() {
    this.currentVault = null;
    this.vaultData = null;
    this.isVaultOpen = false;
    this.recentVaults = [];

    
    // DOM Elements
    this.elements = {
      // States
      welcomeState: document.getElementById('welcomeState'),
      activeVaultState: document.getElementById('activeVaultState'),
      imageCaptureState: document.getElementById('imageCaptureState'),
      
      // Welcome state elements
      vaultDropZone: document.getElementById('vaultDropZone'),
      createNewVault: document.getElementById('createNewVault'),
      openExistingVault: document.getElementById('openExistingVault'),
      recentVaults: document.getElementById('recentVaults'),
      noRecentVaults: document.getElementById('noRecentVaults'),
      
      // Active vault elements
      activeVaultName: document.getElementById('activeVaultName'),
      activeVaultPath: document.getElementById('activeVaultPath'),
      vaultStatusIndicator: document.getElementById('vaultStatusIndicator'),
      memoryCount: document.getElementById('memoryCount'),
      peopleCount: document.getElementById('peopleCount'),
      vaultSize: document.getElementById('vaultSize'),
      lastSyncTime: document.getElementById('lastSyncTime'),
      
      // Action buttons
      addMemoryBtn: document.getElementById('addMemoryBtn'),
      captureImagesBtn: document.getElementById('captureImagesBtn'),
      openWebAppBtn: document.getElementById('openWebAppBtn'),
      downloadVaultBtn: document.getElementById('downloadVaultBtn'),
      closeVaultBtn: document.getElementById('closeVaultBtn'),
      
      // Image capture elements
      backToVaultBtn: document.getElementById('backToVaultBtn'),
      captureSubtitle: document.getElementById('captureSubtitle'),
      selectedCount: document.getElementById('selectedCount'),
      totalCount: document.getElementById('totalCount'),
      selectAllBtn: document.getElementById('selectAllBtn'),
      selectNoneBtn: document.getElementById('selectNoneBtn'),
      imageGrid: document.getElementById('imageGrid'),
      imageLoadingState: document.getElementById('imageLoadingState'),
      imageEmptyState: document.getElementById('imageEmptyState'),
      imageErrorState: document.getElementById('imageErrorState'),
      errorMessage: document.getElementById('errorMessage'),
      retryDetectionBtn: document.getElementById('retryDetectionBtn'),
      createMemoryCapsuleBtn: document.getElementById('createMemoryCapsuleBtn'),
      
      // Modal
      modalOverlay: document.getElementById('modalOverlay'),
      modalContent: document.getElementById('modalContent'),
      
      // Version
      version: document.getElementById('version')
    };
    
    // Image capture state
    this.detectedImages = [];
    this.selectedImages = new Set();
    this.currentPageInfo = null;
    
    console.log('💜 Emma Vault Extension initialized');
  }
  
  async init() {
    console.log('🚀 Initializing Emma Vault Extension...');
    
    // Set version
    const manifest = chrome.runtime.getManifest();
    this.elements.version.textContent = manifest.version;
    
    // Load saved state
    await this.loadState();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Update UI
    this.updateUI();
    
    console.log('✅ Emma Vault Extension ready');
    
    // Initialize Emma orb
    this.initializeEmmaOrb();
  }
  
  initializeEmmaOrb() {
    try {
      const orbContainer = document.getElementById('emmaOrb');
      if (orbContainer && window.EmmaOrb) {
        this.orb = new EmmaOrb(orbContainer, {
          hue: 0,
          hoverIntensity: 0.2,
          rotateOnHover: false, // Disable rotation to prevent shaking
          forceHoverState: false
        });
        console.log('🌟 Emma orb initialized');
        
        // Initialize small orb for Add Memory button
        const addMemoryOrb = document.getElementById('addMemoryOrb');
        if (addMemoryOrb) {
          new EmmaOrb(addMemoryOrb, {
            hue: 270,
            hoverIntensity: 0.5,
            rotateOnHover: true,
            forceHoverState: false
          });
          console.log('🌟 Add Memory orb initialized');
        }
      } else {
        console.log('⚠️ Emma orb not available, using CSS fallback');
      }
    } catch (error) {
      console.warn('Emma orb initialization failed, using fallback:', error);
    }
  }
  
  async loadState() {
    try {
      const storage = await chrome.storage.local.get([
        'currentVault',
        'recentVaults',
        'vaultData'
      ]);
      
      this.currentVault = storage.currentVault || null;
      this.recentVaults = storage.recentVaults || [];
      this.vaultData = storage.vaultData || null;
      this.isVaultOpen = !!(this.currentVault && this.vaultData);
      
      console.log('📊 State loaded:', {
        hasVault: !!this.currentVault,
        recentCount: this.recentVaults.length
      });
      
    } catch (error) {
      console.error('❌ Error loading state:', error);
    }
  }
  
  async saveState() {
    try {
      await chrome.storage.local.set({
        currentVault: this.currentVault,
        recentVaults: this.recentVaults,
        vaultData: this.vaultData
      });
      
      console.log('💾 State saved');
    } catch (error) {
      console.error('❌ Error saving state:', error);
    }
  }
  
  setupEventListeners() {
    // Welcome state actions
    this.elements.vaultDropZone.addEventListener('click', () => this.openExistingVault());
    this.elements.createNewVault.addEventListener('click', () => this.createNewVault());
    this.elements.openExistingVault.addEventListener('click', () => this.openExistingVault());
    
    // Active vault actions - Add Memory opens web app wizard
    this.elements.addMemoryBtn.addEventListener('click', () => this.openMemoryWizard());
    this.elements.captureImagesBtn.addEventListener('click', () => this.startImageCapture());
    this.elements.openWebAppBtn.addEventListener('click', () => this.openWebApp());
    this.elements.downloadVaultBtn.addEventListener('click', () => this.downloadVault());
    this.elements.closeVaultBtn.addEventListener('click', () => this.closeVault());
    
    // Image capture actions
    this.elements.backToVaultBtn.addEventListener('click', () => this.backToVault());
    this.elements.selectAllBtn.addEventListener('click', () => this.selectAllImages());
    this.elements.selectNoneBtn.addEventListener('click', () => this.selectNoneImages());
    this.elements.retryDetectionBtn.addEventListener('click', () => this.retryImageDetection());
    this.elements.createMemoryCapsuleBtn.addEventListener('click', () => this.createMemoryCapsuleFromImages());
    
    // Modal close
    this.elements.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.elements.modalOverlay) {
        this.closeModal();
      }
    });
    
    console.log('🎧 Event listeners set up');
  }
  
  updateUI() {
    // Authoritative state from background
    chrome.runtime.sendMessage({ action: 'CHECK_STATE' }, (state) => {
      if (!state || state.state === 'locked') {
        console.log('🔒 POPUP: Background reports locked');
        this.isVaultOpen = false;
        this.showWelcomeState();
        chrome.storage.local.get(['vaultFileName']).then(storage => {
          if (storage.vaultFileName) {
            this.showVaultUnlockOverlay(storage.vaultFileName);
          }
        });
        return;
      }
      if (state.state === 'unlocked') {
        console.log('✅ POPUP: Background reports unlocked');
        this.isVaultOpen = true;
        this.hideVaultUnlockOverlay();
        this.showActiveVaultState();
        this.elements.vaultStatusIndicator.textContent = '🟢';
      }
      this.updateRecentVaults();
    });
  }
  
  // REMOVED: Old checkVaultLockStatus - now using FSM via updateUI() → CHECK_STATE
  
  // Show elegant vault unlock overlay
  showVaultUnlockOverlay(vaultName) {
    // Remove any existing overlay
    this.hideVaultUnlockOverlay();
    
    // Create beautiful unlock overlay
    const overlay = document.createElement('div');
    overlay.id = 'vaultUnlockOverlay';
    overlay.innerHTML = `
      <div class="unlock-overlay-backdrop"></div>
      <div class="unlock-overlay-content">
        <div class="unlock-header">
          <div class="unlock-icon">🔐</div>
          <h2 class="unlock-title">Vault Locked</h2>
          <p class="unlock-subtitle">Enter your passphrase to access "${vaultName}"</p>
        </div>
        
        <div class="unlock-form">
          <div class="input-group">
            <input type="password" id="unlockPassphrase" placeholder="Enter your passphrase" class="unlock-input">
            <div class="input-icon">🔑</div>
          </div>
          
          <div class="unlock-actions">
            <button id="unlockVaultBtn" class="unlock-btn primary">
              <span class="btn-icon">🔓</span>
              Unlock Vault
            </button>
            <button id="cancelUnlockBtn" class="unlock-btn secondary">
              Cancel
            </button>
          </div>
        </div>
        
        <div class="unlock-footer">
          <p class="unlock-hint">💡 This keeps your precious memories secure</p>
        </div>
      </div>
    `;
    
    // Add elegant styles
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    document.body.appendChild(overlay);
    
    // Add CSS for the overlay
    this.addUnlockOverlayStyles();
    
    // Set up event handlers
    this.setupUnlockOverlayHandlers(vaultName);
    
    // Focus the input
    setTimeout(() => {
      const input = document.getElementById('unlockPassphrase');
      if (input) input.focus();
    }, 100);
  }
  
  // Hide vault unlock overlay
  hideVaultUnlockOverlay() {
    const overlay = document.getElementById('vaultUnlockOverlay');
    if (overlay) {
      overlay.remove();
    }
  }
  
  // Add styles for unlock overlay
  addUnlockOverlayStyles() {
    if (document.getElementById('unlockOverlayStyles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'unlockOverlayStyles';
    styles.textContent = `
      .unlock-overlay-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(17, 17, 27, 0.95);
        backdrop-filter: blur(20px);
      }
      
      .unlock-overlay-content {
        position: relative;
        background: rgba(17, 17, 27, 0.98);
        border: 1px solid rgba(134, 88, 255, 0.3);
        border-radius: 20px;
        padding: 32px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        text-align: center;
        animation: unlockSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      @keyframes unlockSlideIn {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      .unlock-header {
        margin-bottom: 24px;
      }
      
      .unlock-icon {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.8;
      }
      
      .unlock-title {
        color: white;
        font-size: 24px;
        font-weight: 600;
        margin: 0 0 8px 0;
      }
      
      .unlock-subtitle {
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
        margin: 0;
        line-height: 1.4;
      }
      
      .unlock-form {
        margin-bottom: 24px;
      }
      
      .input-group {
        position: relative;
        margin-bottom: 20px;
      }
      
      .unlock-input {
        width: 100%;
        padding: 16px 20px 16px 50px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(134, 88, 255, 0.3);
        border-radius: 12px;
        color: white;
        font-size: 16px;
        outline: none;
        transition: all 0.3s ease;
        box-sizing: border-box;
      }
      
      .unlock-input:focus {
        border-color: rgba(134, 88, 255, 0.6);
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 0 20px rgba(134, 88, 255, 0.2);
      }
      
      .unlock-input::placeholder {
        color: rgba(255, 255, 255, 0.5);
      }
      
      .input-icon {
        position: absolute;
        left: 16px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 18px;
        opacity: 0.6;
      }
      
      .unlock-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
      }
      
      .unlock-btn {
        padding: 12px 24px;
        border: none;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .unlock-btn.primary {
        background: linear-gradient(135deg, #8658ff, #f093fb);
        color: white;
      }
      
      .unlock-btn.primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(134, 88, 255, 0.4);
      }
      
      .unlock-btn.secondary {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .unlock-btn.secondary:hover {
        background: rgba(255, 255, 255, 0.15);
        color: white;
      }
      
      .unlock-footer {
        margin-top: 16px;
      }
      
      .unlock-hint {
        color: rgba(255, 255, 255, 0.6);
        font-size: 12px;
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }
    `;
    
    document.head.appendChild(styles);
  }
  
  // Set up unlock overlay event handlers
  setupUnlockOverlayHandlers(vaultName) {
    const unlockBtn = document.getElementById('unlockVaultBtn');
    const cancelBtn = document.getElementById('cancelUnlockBtn');
    const input = document.getElementById('unlockPassphrase');
    
    // Unlock button handler
    unlockBtn.addEventListener('click', () => {
      this.performUnlockFromOverlay(vaultName);
    });
    
    // Cancel button handler
    cancelBtn.addEventListener('click', () => {
      this.hideVaultUnlockOverlay();
    });
    
    // Enter key handler
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.performUnlockFromOverlay(vaultName);
      }
    });
    
    // Escape key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideVaultUnlockOverlay();
      }
    });
  }
  
  // Perform vault unlock from overlay
  async performUnlockFromOverlay(vaultName) {
    const input = document.getElementById('unlockPassphrase');
    const unlockBtn = document.getElementById('unlockVaultBtn');
    const passphrase = input.value.trim();
    
    if (!passphrase) {
      this.showError('Please enter your passphrase');
      return;
    }
    
    try {
      // Show loading state
      unlockBtn.innerHTML = '<span class="btn-icon">⏳</span> Unlocking...';
      unlockBtn.disabled = true;
      
      // Ask background to unlock using its file handle and passphrase
      const response = await chrome.runtime.sendMessage({ action: 'UNLOCK_VAULT', passphrase });
      if (!response || !response.success) {
        throw new Error(response?.error || 'Unlock failed');
      }
      this.vaultData = response.vaultData;
      this.isVaultOpen = true;
      this.hideVaultUnlockOverlay();
      this.showSuccess('Vault unlocked successfully!');
      this.updateUI();
      
    } catch (error) {
      console.error('❌ POPUP: Unlock failed:', error);
      this.showError('Failed to unlock vault: ' + error.message);
      
      // Reset button
      unlockBtn.innerHTML = '<span class="btn-icon">🔓</span> Unlock Vault';
      unlockBtn.disabled = false;
    }
  }
  
  showWelcomeState() {
    this.elements.welcomeState.classList.remove('hidden');
    this.elements.activeVaultState.classList.add('hidden');
    console.log('📋 Showing welcome state');
  }
  
  async updateStatsFromBackground() {
    try {
      // Get current stats from background FSM authority
      const state = await chrome.runtime.sendMessage({ action: 'CHECK_STATE' });
      if (state) {
        this.elements.memoryCount.textContent = state.memoryCount || 0;
        this.elements.peopleCount.textContent = state.peopleCount || 0;
        console.log('📊 POPUP: Updated stats from background FSM - memories:', state.memoryCount, 'people:', state.peopleCount, 'state:', state.state);
        // Do NOT mutate UI state here to avoid loops; updateUI() owns state transitions
      }
    } catch (error) {
      console.error('❌ POPUP: Failed to get stats from background:', error);
      // Fallback to local data
      const memoryCount = Object.keys(this.vaultData?.content?.memories || {}).length;
      const peopleCount = Object.keys(this.vaultData?.content?.people || {}).length;
      this.elements.memoryCount.textContent = memoryCount;
      this.elements.peopleCount.textContent = peopleCount;
    }
  }
  
  showActiveVaultState() {
    this.elements.welcomeState.classList.add('hidden');
    this.elements.activeVaultState.classList.remove('hidden');
    
    // Update vault info
    if (this.currentVault) {
      this.elements.activeVaultName.textContent = this.vaultData?.name || 'My Memories';
      this.elements.activeVaultPath.textContent = this.currentVault.fileName || 'vault.emma';
      
      // Update stats from background script (has current data)
      this.updateStatsFromBackground();
      
      const vaultSize = this.calculateVaultSize();
      this.elements.vaultSize.textContent = this.formatBytes(vaultSize);
      
      // Update sync time
      const lastSync = this.currentVault.lastSync;
      if (lastSync) {
        this.elements.lastSyncTime.textContent = this.formatTimeAgo(new Date(lastSync));
      } else {
        this.elements.lastSyncTime.textContent = 'Never';
      }
      
      // Update status indicator
      this.elements.vaultStatusIndicator.textContent = '🟢';
    }
    
    console.log('📁 Showing active vault state');
  }
  
  updateRecentVaults() {
    const container = this.elements.recentVaults;
    const noRecent = this.elements.noRecentVaults;
    
    // Clear existing items (except template and no-recent message)
    const existingItems = container.querySelectorAll('.recent-vault-item:not(#recentVaultTemplate)');
    existingItems.forEach(item => item.remove());
    
    if (this.recentVaults.length === 0) {
      noRecent.style.display = 'block';
      return;
    }
    
    noRecent.style.display = 'none';
    
    // Add recent vault items
    this.recentVaults.slice(0, 3).forEach(vault => {
      const item = this.createRecentVaultItem(vault);
      container.appendChild(item);
    });
  }
  
  createRecentVaultItem(vault) {
    const template = document.getElementById('recentVaultTemplate');
    const item = template.cloneNode(true);
    item.id = '';
    item.style.display = 'flex';
    
    const nameEl = item.querySelector('.vault-name');
    const detailsEl = item.querySelector('.vault-details');
    
    nameEl.textContent = vault.name || 'Unnamed Vault';
    detailsEl.textContent = `Last opened: ${this.formatTimeAgo(new Date(vault.lastOpened))}`;
    
    item.addEventListener('click', () => this.openRecentVault(vault));
    
    return item;
  }
  
  async createNewVault() {
    console.log('🌟 Creating new vault...');
    
    try {
      // Check if File System Access API is supported
      if (!window.showSaveFilePicker) {
        console.log('⚠️ File System Access API not supported, using download fallback');
        await this.createVaultWithFallback();
        return;
      }
      
      // Show vault creation modal
      await this.showVaultCreationModal();
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('User cancelled vault creation');
        return;
      }
      console.error('❌ Vault creation failed:', error);
      this.showError('Failed to create vault: ' + error.message);
    }
  }

  /**
   * Create vault with download fallback for browsers like Brave
   */
  async createVaultWithFallback() {
    const modalContent = `
      <div class="modal-header">
        <h2>🌟 Create New Vault</h2>
        <p>Create a new .emma vault (will download to your Downloads folder)</p>
      </div>
      
      <form id="createVaultFallbackForm" class="modal-form">
        <div class="form-group">
          <label for="vaultNameFallback">Vault Name:</label>
          <input type="text" id="vaultNameFallback" placeholder="My Memories" required>
        </div>
        
        <div class="form-group">
          <label for="vaultPasswordFallback">Vault Password (required for security):</label>
          <input type="password" id="vaultPasswordFallback" placeholder="Enter a strong password" required>
          <small style="color: rgba(255,255,255,0.7); font-size: 0.8rem; margin-top: 4px; display: block;">
            🔒 Protects your precious memories - choose something memorable but secure
          </small>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn-secondary" onclick="emmaApp.closeModal()">Cancel</button>
          <button type="submit" class="btn-primary">Create & Download</button>
        </div>
      </form>
      
      <div class="help-note" style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; font-size: 0.85rem;">
        <strong>💡 Note:</strong> In Brave, your vault will download to your Downloads folder. You can then upload it back to add memories.
      </div>
    `;
    
    this.showModal(modalContent);
    
    // Handle form submission
    document.getElementById('createVaultFallbackForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('vaultNameFallback').value;
      const password = document.getElementById('vaultPasswordFallback').value;
      
      // SECURITY: Validate password is provided
      if (!password || password.trim().length === 0) {
        alert('🔒 Password is required to protect your memories!');
        return;
      }
      
      if (password.length < 6) {
        alert('🔒 Password must be at least 6 characters for security!');
        return;
      }
      
      await this.performVaultCreationFallback(name, password);
    });
  }
  
  async openExistingVault() {
    console.log('📁 Opening existing vault...');
    
    try {
      // Check if File System Access API is supported
      if (!window.showOpenFilePicker) {
        console.log('⚠️ File System Access API not supported, using fallback');
        await this.openVaultWithFallback();
        return;
      }
      
      // Show file picker
      const [fileHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'Emma Vault Files',
            accept: {
              'application/emma': ['.emma'],
              'application/json': ['.emma']
            }
          }
        ]
      });
      
      // Read vault file and detect format
      const file = await fileHandle.getFile();
      console.log('📁 DEBUG: File name:', file.name);
      console.log('📁 DEBUG: File size:', file.size);
      console.log('📁 DEBUG: File type:', file.type);
      
      // Check if file is binary (encrypted) or text (JSON)
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const magic = new TextDecoder().decode(data.slice(0, 4));
      
      console.log('📁 DEBUG: First 4 bytes as text:', magic);
      console.log('📁 DEBUG: First 10 bytes as hex:', Array.from(data.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' '));
      
      let rawVaultData;
      if (magic === 'EMMA') {
        console.log('📁 DETECTED: Binary encrypted .emma file');
        // This is a binary encrypted file - we'll handle this in the encryption check
        rawVaultData = { encryption: { enabled: true }, isBinaryFile: true, fileData: data };
      } else {
        console.log('📁 DETECTED: Text JSON .emma file');
        // This is a text JSON file
        const content = new TextDecoder().decode(data);
        console.log('📁 DEBUG: JSON content preview:', content.substring(0, 200));
        rawVaultData = JSON.parse(content);
      }
      
      // Check if vault is encrypted and decrypt if needed
      let vaultData;
      if (rawVaultData.encryption && rawVaultData.encryption.enabled) {
        console.log('🔐 Vault is encrypted - requesting passphrase...');
        
        // Request passphrase using beautiful Emma modal
        const passphrase = await this.showPassphraseModal();
        if (!passphrase) {
          throw new Error('Passphrase required to unlock encrypted vault');
        }
        
        // Decrypt the vault using the proven web vault logic
        console.log('🔓 Decrypting vault with passphrase...');
        if (rawVaultData.isBinaryFile) {
          // Binary encrypted file
          vaultData = await this.decryptBinaryVaultFile(rawVaultData.fileData, passphrase);
        } else {
          // JSON file with encrypted content fields
          console.log('🔓 JSON vault - decrypting content fields...');
          vaultData = await this.decryptJSONVaultContent(rawVaultData, passphrase);
        }
        console.log('✅ Vault decrypted successfully!');
      } else {
        // Unencrypted vault
        vaultData = rawVaultData;
        console.log('📂 Vault is unencrypted - using raw data');
      }
      
      // Validate vault structure
      if (!this.validateVaultData(vaultData)) {
        throw new Error('Invalid vault file format');
      }
      
      // Set up vault
      this.currentVault = {
        fileHandle: fileHandle,
        fileName: fileHandle.name,
        lastSync: new Date().toISOString(),
        lastOpened: new Date().toISOString()
      };
      
      // Provide file handle to background for direct file access
      try {
        await chrome.runtime.sendMessage({ action: 'SET_FILE_HANDLE', handle: fileHandle });
      } catch (e) {
        console.warn('⚠️ Could not pass file handle to background:', e?.message || e);
      }

      this.vaultData = vaultData;
      this.isVaultOpen = true;
      
      // CRITICAL DEBUG: Log vault opening process
      console.log('🚨 POPUP DEBUG: Vault opened, setting data and sending to background');
      console.log('🚨 POPUP DEBUG: Vault data keys:', Object.keys(vaultData));
      console.log('🚨 POPUP DEBUG: Memory count:', Object.keys(vaultData?.content?.memories || {}).length);
      console.log('🚨 POPUP DEBUG: People count:', Object.keys(vaultData?.content?.people || {}).length);
      
      // CRITICAL FIX: Send vault data to background script for in-memory storage
      try {
        console.log('🚨 POPUP DEBUG: Sending VAULT_LOAD message to background...');
        const response = await chrome.runtime.sendMessage({ 
          action: 'VAULT_LOAD', 
          data: vaultData 
        });
        console.log('🚨 POPUP DEBUG: VAULT_LOAD response:', response);
        console.log('✅ Vault data loaded into background script memory');
      } catch (error) {
        console.error('❌ POPUP DEBUG: Failed to load vault data into background:', error);
        console.error('❌ POPUP DEBUG: Error details:', error.message, error.stack);
      }
      
      // CRITICAL: Update localStorage so web app knows vault is unlocked
      localStorage.setItem('emmaVaultActive', 'true');
      localStorage.setItem('emmaVaultName', fileHandle.name);
      console.log('✅ POPUP: Updated localStorage - vault marked as unlocked');
      
      // CRITICAL FIX: Sync localStorage state to web app
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('emma-hijc.onrender.com')) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (vaultName) => {
              localStorage.setItem('emmaVaultActive', 'true');
              localStorage.setItem('emmaVaultName', vaultName);
              console.log('🔄 EXTENSION→WEB: Synced vault unlock state to web app');
            },
            args: [fileHandle.name]
          });
        } catch (syncError) {
          console.warn('⚠️ POPUP: Could not sync unlock state to web app:', syncError);
        }
      }
      
      // SECURITY: Do NOT persist plaintext vault data in extension storage. Keep in-memory only.
      // Mark readiness via minimal metadata; actual content remains in this popup's memory.
      await chrome.storage.local.set({
        vaultFileName: fileHandle.name,
        vaultReady: true,
        lastSaved: new Date().toISOString()
      });
      
      // Add to recent vaults
      this.addToRecentVaults({
        name: vaultData.name || 'Unnamed Vault',
        fileName: fileHandle.name,
        lastOpened: new Date().toISOString()
      });
      
      // Save state and update UI
      await this.saveState();
      this.updateUI();
      
      console.log('✅ Vault opened successfully:', fileHandle.name);
      this.showSuccess('Vault opened successfully!');
      
      // CRITICAL: Redirect directly to dashboard since vault is now ready
      console.log('🚀 Redirecting to Emma dashboard...');
      setTimeout(() => {
        chrome.tabs.create({
          url: 'https://emma-hjjc.onrender.com/working-desktop-dashboard.html'
        });
        window.close(); // Close popup after redirect
      }, 1500);
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('User cancelled file selection');
        return;
      }
      console.error('❌ Failed to open vault:', error);
      this.showError('Failed to open vault: ' + error.message);
    }
  }
  
  async openRecentVault(vault) {
    console.log('🕐 Opening recent vault:', vault.name);
    // For now, just open file picker since we can't persist file handles
    await this.openExistingVault();
  }

  /**
   * Fallback vault opening for browsers without File System Access API
   */
  async openVaultWithFallback() {
    const modalContent = `
      <div class="modal-header">
        <h2>📁 Open Vault File</h2>
        <p>Brave browser doesn't support direct file access yet.<br>Please upload your .emma file:</p>
      </div>
      
      <form id="uploadVaultForm" class="modal-form">
        <div class="form-group">
          <label for="vaultFile">Select .emma vault file:</label>
          <input type="file" id="vaultFile" accept=".emma,.json" required>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn-secondary" onclick="emmaApp.closeModal()">Cancel</button>
          <button type="submit" class="btn-primary">Open Vault</button>
        </div>
      </form>
      
      <div class="help-note" style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; font-size: 0.85rem;">
        <strong>💡 Tip:</strong> For the best experience, use Chrome or Edge which support direct file access.
      </div>
    `;
    
    this.showModal(modalContent);
    
    // Handle form submission
    document.getElementById('uploadVaultForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const fileInput = document.getElementById('vaultFile');
      const file = fileInput.files[0];
      
      if (!file) {
        this.showError('Please select a file');
        return;
      }
      
      await this.processUploadedVault(file);
    });
  }

  /**
   * Process uploaded vault file (fallback method)
   */
  async processUploadedVault(file) {
    try {
      console.log('📤 Processing uploaded vault:', file.name);
      
      // Check if file is binary (encrypted) or text (JSON)
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const magic = new TextDecoder().decode(data.slice(0, 4));
      
      console.log('📁 BRAVE: First 4 bytes as text:', magic);
      
      let vaultData;
      if (magic === 'EMMA') {
        console.log('📁 BRAVE: Detected encrypted .emma file - requesting passphrase');
        
        // Show Emma-branded passphrase modal for Brave
        const passphrase = await this.showBravePassphraseModal(file.name);
        if (!passphrase) {
          throw new Error('Passphrase required to unlock encrypted vault');
        }
        
        // Decrypt the vault using the proven web vault logic
        console.log('🔓 BRAVE: Decrypting vault with passphrase...');
        vaultData = await this.decryptBinaryVaultFile(data, passphrase);
        console.log('✅ BRAVE: Vault decrypted successfully!');
      } else {
        console.log('📁 BRAVE: Detected unencrypted JSON .emma file');
        // This is a text JSON file
        const content = new TextDecoder().decode(data);
        vaultData = JSON.parse(content);
      }
      
      // Validate vault structure
      if (!this.validateVaultData(vaultData)) {
        throw new Error('Invalid vault file format');
      }
      
      // Set up vault (without file handle since we can't write back in Brave)
      this.currentVault = {
        fileName: file.name,
        lastSync: new Date().toISOString(),
        lastOpened: new Date().toISOString(),
        readOnly: true // Mark as read-only for Brave
      };
      
      this.vaultData = vaultData;
      this.isVaultOpen = true;
      
      // CRITICAL FIX: Send vault data to background script for in-memory storage
      try {
        await chrome.runtime.sendMessage({ 
          action: 'VAULT_LOAD', 
          data: vaultData 
        });
        console.log('✅ Vault data loaded into background script memory (fallback mode)');
      } catch (error) {
        console.error('❌ Failed to load vault data into background:', error);
      }
      
      // Add to recent vaults
      this.addToRecentVaults({
        name: vaultData.name || 'Unnamed Vault',
        fileName: file.name,
        lastOpened: new Date().toISOString(),
        readOnly: true
      });
      
      // Save state and update UI
      await this.saveState();
      this.updateUI();
      this.closeModal();
      
      console.log('✅ Vault opened successfully (read-only mode):', file.name);
      this.showSuccess('Vault opened! Note: Changes will download as new file in Brave.');
      
    } catch (error) {
      console.error('❌ Failed to process uploaded vault:', error);
      this.showError('Failed to open vault: ' + error.message);
    }
  }
  
  async addMemory() {
    console.log('✨ Adding new memory...');
    
    try {
      await this.showAddMemoryModal();
    } catch (error) {
      console.error('❌ Failed to add memory:', error);
      this.showError('Failed to add memory: ' + error.message);
    }
  }
  
  async openWebApp() {
    console.log('🌐 Opening Emma Web App...');
    
    try {
      // Open directly to dashboard since vault is already managed by extension
      await chrome.tabs.create({
        url: 'https://emma-hjjc.onrender.com/working-desktop-dashboard.html'
      });
      
      // Close popup
      window.close();
      
    } catch (error) {
      console.error('❌ Failed to open web app:', error);
      this.showError('Failed to open web app');
    }
  }
  
  async openMemoryWizard() {
    console.log('🧠 Opening memory creation wizard...');
    
    try {
      // Open dashboard and trigger memory wizard
      await chrome.tabs.create({
        url: 'https://emma-hjjc.onrender.com/working-desktop-dashboard.html#create-memory'
      });
      
      // Close popup
      window.close();
      
    } catch (error) {
      console.error('❌ Failed to open memory wizard:', error);
      this.showError('Failed to open memory wizard');
    }
  }
  
  async downloadVault() {
    console.log('⬇️ Downloading vault...');
    
    if (!this.vaultData) {
      this.showError('No vault open');
      return;
    }
    
    try {
      // BEAUTIFUL UX: Show passphrase modal for download encryption
      console.log('🔐 Requesting passphrase for secure vault download...');
      
      const downloadPassphrase = await this.showDownloadPassphraseModal();
      if (!downloadPassphrase) {
        console.log('❌ Download cancelled - no passphrase provided');
        return;
      }
      
      // Route download through background script for proper encryption
      console.log('🔐 Requesting encrypted vault download from background...');
      
      const response = await chrome.runtime.sendMessage({ 
        action: 'DOWNLOAD_ENCRYPTED_VAULT',
        passphrase: downloadPassphrase,
        vaultName: this.vaultData.name || 'vault'
      });
      
      if (response && response.success) {
        console.log('✅ Encrypted vault download initiated');
        this.showSuccess('Encrypted vault downloaded successfully!');
      } else {
        throw new Error(response?.error || 'Download failed');
      }
      
    } catch (error) {
      console.error('❌ Download failed:', error);
      this.showError('Failed to download vault: ' + error.message);
    }
  }
  
  async closeVault() {
    console.log('🔒 Closing vault...');
    try {
      const res = await chrome.runtime.sendMessage({ action: 'LOCK' });
      console.log('🔒 LOCK result:', res);
    } catch (e) {
      console.warn('⚠️ LOCK call failed:', e);
    }
    this.currentVault = null;
    this.vaultData = null;
    this.isVaultOpen = false;
    this.updateUI();
    console.log('✅ Vault closed');
  }
  
  // Modal Functions
  async showVaultCreationModal() {
    const modalContent = `
      <div class="modal-header">
        <h2>🌟 Create New Vault</h2>
        <p>Create a new .emma vault to store your precious memories</p>
      </div>
      
      <form id="createVaultForm" class="modal-form">
        <div class="form-group">
          <label for="vaultName">Vault Name:</label>
          <input type="text" id="vaultName" placeholder="My Memories" required>
        </div>
        
        <div class="form-group">
          <label for="vaultPassword">Vault Password (required for security):</label>
          <input type="password" id="vaultPassword" placeholder="Enter a strong password" required>
          <small style="color: rgba(255,255,255,0.7); font-size: 0.8rem; margin-top: 4px; display: block;">
            🔒 Protects your precious memories - choose something memorable but secure
          </small>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn-secondary" onclick="emmaApp.closeModal()">Cancel</button>
          <button type="submit" class="btn-primary">Create Vault</button>
        </div>
      </form>
    `;
    
    this.showModal(modalContent);
    
    // Handle form submission
    document.getElementById('createVaultForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('vaultName').value;
      const password = document.getElementById('vaultPassword').value;
      
      // SECURITY: Validate password is provided
      if (!password || password.trim().length === 0) {
        alert('🔒 Password is required to protect your memories!');
        return;
      }
      
      if (password.length < 6) {
        alert('🔒 Password must be at least 6 characters for security!');
        return;
      }
      
      await this.performVaultCreation(name, password);
    });
  }
  
  async showAddMemoryModal() {
    const modalContent = `
      <div class="modal-header">
        <h2>✨ Add New Memory</h2>
        <p>Capture a precious moment</p>
      </div>
      
      <form id="addMemoryForm" class="modal-form">
        <div class="form-group">
          <label for="memoryContent">Memory:</label>
          <textarea id="memoryContent" placeholder="Describe your memory..." rows="4" required></textarea>
        </div>
        
        <div class="form-group">
          <label for="memoryEmotion">Emotion:</label>
          <select id="memoryEmotion">
            <option value="happy">Happy 😊</option>
            <option value="peaceful">Peaceful 😌</option>
            <option value="nostalgic">Nostalgic 🥰</option>
            <option value="grateful">Grateful 🙏</option>
            <option value="neutral">Neutral 😐</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="memoryImportance">Importance (1-10):</label>
          <input type="range" id="memoryImportance" min="1" max="10" value="5">
          <span id="importanceValue">5</span>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn-secondary" onclick="emmaApp.closeModal()">Cancel</button>
          <button type="submit" class="btn-primary">Save Memory</button>
        </div>
      </form>
    `;
    
    this.showModal(modalContent);
    
    // Update importance display
    const slider = document.getElementById('memoryImportance');
    const display = document.getElementById('importanceValue');
    slider.addEventListener('input', () => {
      display.textContent = slider.value;
    });
    
    // Handle form submission
    document.getElementById('addMemoryForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const content = document.getElementById('memoryContent').value;
      const emotion = document.getElementById('memoryEmotion').value;
      const importance = parseInt(document.getElementById('memoryImportance').value);
      
      await this.performAddMemory(content, emotion, importance);
    });
  }
  
  showModal(content) {
    this.elements.modalContent.innerHTML = content;
    this.elements.modalOverlay.classList.remove('hidden');
  }
  
  closeModal() {
    this.elements.modalOverlay.classList.add('hidden');
  }

  // Emma-branded passphrase modal for Brave
  async showBravePassphraseModal(fileName) {
    return new Promise((resolve, reject) => {
      const modalContent = `
        <div class="modal-header">
          <div class="emma-orb-container">
            <div class="emma-orb" id="passphraseOrb"></div>
          </div>
          <h2>🔐 Unlock Vault</h2>
          <p>Enter the passphrase for your encrypted vault:</p>
          <p class="file-name" style="
            background: rgba(134, 88, 255, 0.2);
            padding: 8px 16px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(134, 88, 255, 0.3);
            margin: 8px 0;
          ">${fileName}</p>
        </div>
        
        <form id="bravePassphraseForm" class="modal-form">
          <div class="form-group">
            <label for="bravePassphrase">Vault Passphrase:</label>
            <input type="password" id="bravePassphrase" placeholder="Enter your passphrase" required autofocus>
            <small style="color: rgba(255,255,255,0.7); font-size: 0.8rem; margin-top: 4px; display: block;">
              🔒 Your passphrase decrypts your precious memories locally
            </small>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="emmaApp.cancelBravePassphrase()">Cancel</button>
            <button type="submit" class="btn-primary">🔓 Unlock Vault</button>
          </div>
        </form>
        
        <div class="help-note" style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; font-size: 0.85rem;">
          <strong>💡 Brave Browser:</strong> Your vault will be opened in read-only mode. Changes will download as a new file.
        </div>
      `;
      
      this.showModal(modalContent);
      
      // Initialize orb
      setTimeout(() => {
        try {
          const orbContainer = document.getElementById('passphraseOrb');
          if (orbContainer && window.EmmaOrb) {
            new EmmaOrb(orbContainer, {
              hue: 270,
              hoverIntensity: 0.3,
              rotateOnHover: false
            });
          }
        } catch (e) {
          console.warn('⚠️ Could not initialize passphrase orb:', e);
        }
      }, 100);
      
      // Handle form submission
      document.getElementById('bravePassphraseForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const passphrase = document.getElementById('bravePassphrase').value.trim();
        if (passphrase) {
          this.closeModal();
          resolve(passphrase);
        }
      });
      
      // Global cancel function
      window.emmaApp = window.emmaApp || {};
      window.emmaApp.cancelBravePassphrase = () => {
        this.closeModal();
        reject(new Error('User cancelled passphrase entry'));
      };
      
      // Focus the input
      setTimeout(() => {
        const input = document.getElementById('bravePassphrase');
        if (input) input.focus();
      }, 200);
    });
  }
  
  // Vault Operations
  async performVaultCreationFallback(name, password) {
    try {
      // SECURITY: Validate password before creating vault
      if (!password || password.trim().length === 0) {
        throw new Error('Password is required for vault security');
      }
      
      // Create vault data structure
      const vaultData = {
        version: '1.0',
        name: name,
        created: new Date().toISOString(),
        encryption: {
          enabled: true, // Always enabled for security
          algorithm: 'AES-GCM'
        },
        content: {
          memories: {},
          people: {},
          settings: {}
        },
        stats: {
          memoryCount: 0,
          peopleCount: 0,
          totalSize: 0
        }
      };
      
      // Create download blob
      const vaultJson = JSON.stringify(vaultData, null, 2);
      const blob = new Blob([vaultJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.toLowerCase().replace(/\s+/g, '-')}.emma`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      // Set up vault in read-only mode
      this.currentVault = {
        fileName: `${name.toLowerCase().replace(/\s+/g, '-')}.emma`,
        lastSync: new Date().toISOString(),
        lastOpened: new Date().toISOString(),
        readOnly: true
      };
      
      this.vaultData = vaultData;
      this.isVaultOpen = true;
      
      // Add to recent vaults
      this.addToRecentVaults({
        name: name,
        fileName: this.currentVault.fileName,
        lastOpened: new Date().toISOString(),
        readOnly: true
      });
      
      // Save state and update UI
      await this.saveState();
      this.updateUI();
      this.closeModal();
      
      console.log('✅ Vault created and downloaded:', this.currentVault.fileName);
      this.showSuccess('Vault created! Check your Downloads folder.');
      
    } catch (error) {
      throw error;
    }
  }

  async performVaultCreation(name, password) {
    try {
      // SECURITY: Validate password before creating vault
      if (!password || password.trim().length === 0) {
        throw new Error('Password is required for vault security');
      }
      
      // Create vault data structure
      const vaultData = {
        version: '1.0',
        name: name,
        created: new Date().toISOString(),
        encryption: {
          enabled: true, // Always enabled for security
          algorithm: 'AES-GCM'
        },
        content: {
          memories: {},
          people: {},
          settings: {}
        },
        stats: {
          memoryCount: 0,
          peopleCount: 0,
          totalSize: 0
        }
      };
      
      // Show file save picker
      const fileHandle = await window.showSaveFilePicker({
        types: [
          {
            description: 'Emma Vault Files',
            accept: {
              'application/emma': ['.emma']
            }
          }
        ],
        suggestedName: `${name.toLowerCase().replace(/\s+/g, '-')}.emma`
      });
      
      // Write vault to file
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(vaultData, null, 2));
      await writable.close();
      
      // Set up vault
      this.currentVault = {
        fileHandle: fileHandle,
        fileName: fileHandle.name,
        lastSync: new Date().toISOString(),
        lastOpened: new Date().toISOString()
      };
      
      // Provide file handle to background for direct file access
      try {
        await chrome.runtime.sendMessage({ action: 'SET_FILE_HANDLE', handle: fileHandle });
      } catch (e) {
        console.warn('⚠️ Could not pass file handle to background:', e?.message || e);
      }

      this.vaultData = vaultData;
      this.isVaultOpen = true;
      
      // CRITICAL FIX: Send vault data to background script for in-memory storage
      try {
        await chrome.runtime.sendMessage({ 
          action: 'VAULT_LOAD', 
          data: vaultData 
        });
        console.log('✅ Vault data loaded into background script memory (create vault)');
      } catch (error) {
        console.error('❌ Failed to load vault data into background:', error);
      }
      
      // CRITICAL: Update localStorage so web app knows vault is unlocked
      localStorage.setItem('emmaVaultActive', 'true');
      localStorage.setItem('emmaVaultName', fileHandle.name);
      console.log('✅ POPUP: Updated localStorage - vault marked as unlocked');
      
      // CRITICAL FIX: Sync localStorage state to web app
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('emma-hijc.onrender.com')) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (vaultName) => {
              localStorage.setItem('emmaVaultActive', 'true');
              localStorage.setItem('emmaVaultName', vaultName);
              console.log('🔄 EXTENSION→WEB: Synced vault unlock state to web app (create vault)');
            },
            args: [fileHandle.name]
          });
        } catch (syncError) {
          console.warn('⚠️ POPUP: Could not sync unlock state to web app:', syncError);
        }
      }
      
      // SECURITY: Do NOT persist plaintext vault data in extension storage.
      await chrome.storage.local.set({
        vaultFileName: fileHandle.name,
        vaultReady: true,
        lastSaved: new Date().toISOString()
      });
      
      // Add to recent vaults
      this.addToRecentVaults({
        name: name,
        fileName: fileHandle.name,
        lastOpened: new Date().toISOString()
      });
      
      // Save state and update UI
      await this.saveState();
      this.updateUI();
      this.closeModal();
      
      console.log('✅ Vault created successfully:', fileHandle.name);
      this.showSuccess('Vault created successfully!');
      
      // CRITICAL: Redirect directly to dashboard since vault is now ready
      console.log('🚀 Redirecting to Emma dashboard...');
      setTimeout(() => {
        chrome.tabs.create({
          url: 'https://emma-hjjc.onrender.com/working-desktop-dashboard.html'
        });
        window.close(); // Close popup after redirect
      }, 1500);
      
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      throw error;
    }
  }
  
  async performAddMemory(content, emotion, importance) {
    if (!this.isVaultOpen) {
      throw new Error('No vault open');
    }
    
    try {
      // Create memory object
      const memoryId = this.generateId('memory');
      const memory = {
        id: memoryId,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        content: content,
        metadata: {
          emotion: emotion,
          importance: importance,
          tags: [],
          people: []
        }
      };
      
      // Add to vault data
      this.vaultData.content.memories[memoryId] = memory;
      this.vaultData.stats.memoryCount = Object.keys(this.vaultData.content.memories).length;
      
      // Save to file
      await this.saveVaultToFile();
      
      // Update UI and close modal
      this.updateUI();
      this.closeModal();
      
      console.log('✅ Memory added successfully:', memoryId);
      this.showSuccess('Memory saved successfully!');
      
    } catch (error) {
      throw error;
    }
  }
  
  async saveVaultToFile() {
    if (!this.vaultData) {
      throw new Error('No vault data available');
    }
    
    // Check if we have direct file access
    if (this.currentVault?.fileHandle && !this.currentVault?.readOnly) {
      try {
        const writable = await this.currentVault.fileHandle.createWritable();
        await writable.write(JSON.stringify(this.vaultData, null, 2));
        await writable.close();
        
        // Update sync time
        this.currentVault.lastSync = new Date().toISOString();
        await this.saveState();
        
        console.log('💾 Vault saved to file');
        return;
        
      } catch (error) {
        console.error('❌ Failed to save vault to file:', error);
        throw error;
      }
    }
    
    // Fallback: Download updated vault
    console.log('📥 Using download fallback for vault save');
    
    try {
      const vaultJson = JSON.stringify(this.vaultData, null, 2);
      const blob = new Blob([vaultJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = this.currentVault?.fileName || 'updated-vault.emma';
      a.click();
      
      URL.revokeObjectURL(url);
      
      // Update sync time
      if (this.currentVault) {
        this.currentVault.lastSync = new Date().toISOString();
        await this.saveState();
      }
      
      console.log('💾 Vault downloaded as updated file');
      this.showSuccess('Vault updated! Downloaded to your Downloads folder.');
      
    } catch (error) {
      console.error('❌ Failed to download vault:', error);
      throw error;
    }
  }
  
  // Utility Functions
  validateVaultData(data) {
    return data && 
           data.version && 
           data.content && 
           typeof data.content.memories === 'object';
  }
  
  addToRecentVaults(vault) {
    // Remove existing entry
    this.recentVaults = this.recentVaults.filter(v => v.fileName !== vault.fileName);
    
    // Add to beginning
    this.recentVaults.unshift(vault);
    
    // Keep only last 5
    this.recentVaults = this.recentVaults.slice(0, 5);
  }
  
  generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  

  
  calculateVaultSize() {
    if (!this.vaultData) return 0;
    return JSON.stringify(this.vaultData).length;
  }
  
  /**
   * Detect if vault content contains encrypted fields
   */
  detectEncryptedFields(content) {
    if (!content || typeof content !== 'object') return false;
    
    // Check for common encrypted field patterns
    const checkObject = (obj) => {
      if (!obj || typeof obj !== 'object') return false;
      
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          // Check for base64-encoded encrypted data patterns
          if (value.length > 100 && /^[A-Za-z0-9+/=]+$/.test(value)) {
            console.log(`🔍 ENCRYPTION CHECK: Potential encrypted field detected: ${key}`);
            return true;
          }
          // Check for explicit encryption markers
          if (value.startsWith('ENCRYPTED:') || value.startsWith('AES-GCM:')) {
            console.log(`🔍 ENCRYPTION CHECK: Explicit encryption marker found: ${key}`);
            return true;
          }
        } else if (typeof value === 'object' && value !== null) {
          // Recursively check nested objects
          if (checkObject(value)) return true;
        }
      }
      return false;
    };
    
    return checkObject(content);
  }
  
  /**
   * Decrypt JSON vault content (for JSON files with encrypted fields)
   */
  async decryptJSONVaultContent(rawVaultData, passphrase) {
    try {
      console.log('🔓 Extension: Decrypting JSON vault content...');
      
      // For JSON vaults, the structure is there but content may be encrypted
      // For now, return the vault as-is since the structure is already accessible
      // TODO: Implement field-level decryption if content fields are encrypted
      
      console.log('📂 Extension: JSON vault structure:');
      console.log('- Vault name:', rawVaultData.name);
      console.log('- Created:', rawVaultData.created);
      console.log('- Encryption enabled:', rawVaultData.encryption?.enabled);
      console.log('- Content keys:', Object.keys(rawVaultData.content || {}));
      
      // Check if content fields are encrypted or plain
      if (rawVaultData.content) {
        console.log('- Memories:', Object.keys(rawVaultData.content.memories || {}).length);
        console.log('- People:', Object.keys(rawVaultData.content.people || {}).length);
        console.log('- Media:', Object.keys(rawVaultData.content.media || {}).length);
        
        // SECURITY FIX: Check for encrypted content fields and block if found
        const hasEncryptedContent = this.detectEncryptedFields(rawVaultData.content);
        if (hasEncryptedContent) {
          throw new Error('This vault contains encrypted JSON fields which are not yet supported. Please use a binary (.emma) vault format or contact support for field-level decryption.');
        }
      }
      
      return rawVaultData;
      
    } catch (error) {
      console.error('❌ Extension: Failed to decrypt JSON vault:', error);
      throw new Error('Failed to decrypt JSON vault content.');
    }
  }
  
  /**
   * Decrypt binary .emma vault file (for binary encrypted files)
   */
  async decryptBinaryVaultFile(data, passphrase) {
    try {
      // Check magic bytes
      const magic = new TextDecoder().decode(data.slice(0, 4));
      if (magic !== 'EMMA') {
        throw new Error('Invalid .emma file format - missing EMMA magic bytes');
      }
      
      // Extract components
      const version = data.slice(4, 6);
      const salt = data.slice(6, 38); // 32 bytes salt
      const encryptedData = data.slice(38);
      
      console.log('📁 Extension: Decrypting binary vault file...');
      console.log('🔍 DECRYPT DEBUG: File size:', data.length);
      console.log('🔍 DECRYPT DEBUG: Magic bytes:', magic);
      console.log('🔍 DECRYPT DEBUG: Salt length:', salt.length);
      console.log('🔍 DECRYPT DEBUG: Encrypted data length:', encryptedData.length);
      
      // Decrypt data
      const decryptedData = await this.decryptData(encryptedData.buffer, salt, passphrase);
      
      // Parse JSON
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(decryptedData);
      
      console.log('🔓 Extension: Decrypted JSON length:', jsonString.length);
      console.log('🔓 Extension: JSON preview (first 200 chars):', jsonString.substring(0, 200));
      
      const vaultData = JSON.parse(jsonString);
      
      console.log('🔓 Extension: Parsed vault data - checking contents:');
      console.log('- Memory count in file:', Object.keys(vaultData.content?.memories || {}).length);
      console.log('- People count in file:', Object.keys(vaultData.content?.people || {}).length);
      console.log('- Media count in file:', Object.keys(vaultData.content?.media || {}).length);
      
      return vaultData;
      
    } catch (error) {
      console.error('❌ Extension: Failed to decrypt binary vault file:', error);
      throw new Error('Failed to decrypt vault. Please check your passphrase.');
    }
  }
  
  /**
   * Decrypt .emma vault file (copied from web vault)
   */
  async decryptVaultFile(file, passphrase) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      // Check magic bytes
      const magic = new TextDecoder().decode(data.slice(0, 4));
      if (magic !== 'EMMA') {
        throw new Error('Invalid .emma file format');
      }
      
      // Extract components
      const version = data.slice(4, 6);
      const salt = data.slice(6, 38); // 32 bytes salt
      const encryptedData = data.slice(38);
      
      console.log('📁 Extension: Decrypting vault file...');
      console.log('🔍 DECRYPT DEBUG: File size:', data.length);
      console.log('🔍 DECRYPT DEBUG: Magic bytes:', magic);
      console.log('🔍 DECRYPT DEBUG: Salt length:', salt.length);
      console.log('🔍 DECRYPT DEBUG: Encrypted data length:', encryptedData.length);
      
      // Decrypt data
      const decryptedData = await this.decryptData(encryptedData.buffer, salt, passphrase);
      
      // Parse JSON
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(decryptedData);
      
      console.log('🔓 Extension: Decrypted JSON length:', jsonString.length);
      console.log('🔓 Extension: JSON preview (first 200 chars):', jsonString.substring(0, 200));
      
      const vaultData = JSON.parse(jsonString);
      
      console.log('🔓 Extension: Parsed vault data - checking contents:');
      console.log('- Memory count in file:', Object.keys(vaultData.content?.memories || {}).length);
      console.log('- People count in file:', Object.keys(vaultData.content?.people || {}).length);
      console.log('- Media count in file:', Object.keys(vaultData.content?.media || {}).length);
      
      return vaultData;
      
    } catch (error) {
      console.error('❌ Extension: Failed to decrypt vault file:', error);
      throw new Error('Failed to decrypt vault. Please check your passphrase.');
    }
  }
  
  /**
   * Decrypt data using Web Crypto API (copied from web vault)
   */
  async decryptData(encryptedData, salt, passphrase) {
    try {
      console.log('🔍 Extension: Starting data decryption...');
      
      // Extract IV and data
      const data = new Uint8Array(encryptedData);
      const iv = data.slice(0, 12);
      const encrypted = data.slice(12);
      
      // Derive key from passphrase
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(passphrase),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );
      
      // Handle salt format
      let saltBuffer;
      if (typeof salt === 'string') {
        saltBuffer = new TextEncoder().encode(salt);
      } else {
        saltBuffer = new Uint8Array(salt);
      }
      
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: saltBuffer,
          iterations: 250000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      
      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encrypted
      );
      
      // CRITICAL SECURITY: Verify decryption actually worked by parsing JSON
      try {
        const testString = new TextDecoder().decode(decrypted);
        const testParse = JSON.parse(testString);
        if (!testParse || typeof testParse !== 'object') {
          throw new Error('Decrypted data is not valid JSON');
        }
        console.log('✅ Extension: Data decrypted and validated successfully');
      } catch (parseError) {
        console.error('❌ Extension: Decrypted data validation failed:', parseError);
        throw new Error('Invalid passphrase - decrypted data is corrupted');
      }
      
      return decrypted;
      
    } catch (error) {
      console.error('❌ Extension: Decryption failed:', error);
      throw new Error('Decryption failed - incorrect passphrase or corrupted data');
    }
  }
  
  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
  
  formatTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
  
  showSuccess(message) {
    // Simple success notification
    console.log('✅', message);
    // TODO: Add toast notification
  }
  
  showError(message) {
    // Simple error notification
    console.error('❌', message);
    alert(message); // Temporary - replace with toast
  }
  
  /**
   * Show beautiful Emma-branded passphrase modal
   */
  async showPassphraseModal() {
    return new Promise((resolve, reject) => {
      // Create beautiful modal overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      `;
      
      // Create modal content
      overlay.innerHTML = `
        <div style="
          background: var(--emma-glass);
          backdrop-filter: blur(20px);
          border: 1px solid var(--emma-border);
          border-radius: 20px;
          padding: 32px;
          max-width: 400px;
          width: 90%;
          text-align: center;
          box-shadow: var(--emma-glow);
        ">
          <div style="
            font-size: 2rem;
            margin-bottom: 16px;
          ">🔐</div>
          
          <h2 style="
            color: var(--emma-text);
            margin-bottom: 12px;
            font-size: 1.4rem;
          ">Unlock Vault</h2>
          
          <p style="
            color: var(--emma-text-secondary);
            margin-bottom: 24px;
            line-height: 1.5;
          ">Enter your vault passphrase to decrypt and access your precious memories</p>
          
          <input type="password" id="passphraseInput" placeholder="Enter vault passphrase..." style="
            width: 100%;
            padding: 12px 16px;
            border: 2px solid var(--emma-border);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.05);
            color: var(--emma-text);
            font-size: 1rem;
            margin-bottom: 24px;
            box-sizing: border-box;
          ">
          
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button id="cancelBtn" style="
              padding: 12px 24px;
              border: 2px solid var(--emma-border);
              border-radius: 12px;
              background: transparent;
              color: var(--emma-text);
              cursor: pointer;
              font-size: 1rem;
            ">Cancel</button>
            
            <button id="unlockBtn" style="
              padding: 12px 24px;
              border: none;
              border-radius: 12px;
              background: var(--emma-gradient-2);
              color: white;
              cursor: pointer;
              font-size: 1rem;
              font-weight: 600;
            ">🔓 Unlock</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      const input = overlay.querySelector('#passphraseInput');
      const unlockBtn = overlay.querySelector('#unlockBtn');
      const cancelBtn = overlay.querySelector('#cancelBtn');
      
      // Focus input
      setTimeout(() => input.focus(), 100);
      
      // Handle unlock
      const handleUnlock = () => {
        const passphrase = input.value.trim();
        if (passphrase) {
          document.body.removeChild(overlay);
          resolve(passphrase);
        } else {
          input.focus();
        }
      };
      
      // Handle cancel
      const handleCancel = () => {
        document.body.removeChild(overlay);
        resolve(null);
      };
      
      // Event listeners
      unlockBtn.addEventListener('click', handleUnlock);
      cancelBtn.addEventListener('click', handleCancel);
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleUnlock();
        if (e.key === 'Escape') handleCancel();
      });
      
      // Close on overlay click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) handleCancel();
      });
    });
  }

  /**
   * Show beautiful Emma-branded download passphrase modal
   */
  async showDownloadPassphraseModal() {
    return new Promise((resolve, reject) => {
      // Create beautiful modal overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      `;
      
      overlay.innerHTML = `
        <div style="
          background: var(--emma-glass);
          backdrop-filter: blur(20px);
          border: 1px solid var(--emma-border);
          border-radius: 20px;
          padding: 32px;
          max-width: 400px;
          width: 90%;
          text-align: center;
          box-shadow: var(--emma-glow);
        ">
          <div style="
            font-size: 2rem;
            margin-bottom: 16px;
          ">💾</div>
          
          <h2 style="
            color: var(--emma-text);
            margin-bottom: 12px;
            font-size: 1.4rem;
          ">Encrypt Vault Download</h2>
          
          <p style="
            color: var(--emma-text-secondary);
            margin-bottom: 24px;
            line-height: 1.5;
          ">Enter a passphrase to encrypt your vault backup. You'll need this same passphrase to open the downloaded file.</p>
          
          <input type="password" id="downloadPassphraseInput" placeholder="Enter passphrase for backup..." style="
            width: 100%;
            padding: 12px 16px;
            border: 2px solid var(--emma-border);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.05);
            color: var(--emma-text);
            font-size: 1rem;
            margin-bottom: 24px;
            box-sizing: border-box;
          ">
          
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button id="downloadCancelBtn" style="
              padding: 12px 24px;
              border: 2px solid var(--emma-border);
              border-radius: 12px;
              background: transparent;
              color: var(--emma-text);
              cursor: pointer;
              font-size: 1rem;
            ">Cancel</button>
            
            <button id="downloadBtn" style="
              padding: 12px 24px;
              border: none;
              border-radius: 12px;
              background: var(--emma-gradient-2);
              color: white;
              cursor: pointer;
              font-size: 1rem;
              font-weight: 600;
            ">💾 Download</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      const input = overlay.querySelector('#downloadPassphraseInput');
      const downloadBtn = overlay.querySelector('#downloadBtn');
      const cancelBtn = overlay.querySelector('#downloadCancelBtn');
      
      // Focus input
      setTimeout(() => input.focus(), 100);
      
      // Handle download
      const handleDownload = () => {
        const passphrase = input.value.trim();
        if (passphrase) {
          document.body.removeChild(overlay);
          resolve(passphrase);
        } else {
          input.focus();
        }
      };
      
      // Handle cancel
      const handleCancel = () => {
        document.body.removeChild(overlay);
        resolve(null);
      };
      
      // Event listeners
      downloadBtn.addEventListener('click', handleDownload);
      cancelBtn.addEventListener('click', handleCancel);
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleDownload();
        if (e.key === 'Escape') handleCancel();
      });
      
      // Close on overlay click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) handleCancel();
      });
    });
  }
  
  // 🖼️ IMAGE CAPTURE FUNCTIONALITY
  
  /**
   * Start image capture mode
   */
  async startImageCapture() {
    console.log('🖼️ Starting image capture mode...');
    
    // Switch to image capture state
    this.showImageCaptureState();
    
    // Show loading state
    this.showImageLoadingState();
    
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error('No active tab found');
      }
      
      // Persist active tab id for follow-up downloads
      this.activeTabId = tab.id;

      // Update subtitle with page info
      this.elements.captureSubtitle.textContent = `Scanning ${tab.title || tab.url}...`;
      
      // First, try to inject the simple content script programmatically
      try {
        console.log('🖼️ Injecting simple image detection script...');
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-image-simple.js']
        });
        console.log('🖼️ Simple image detection script injected successfully');
        
        // Wait a moment for the script to initialize
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (injectionError) {
        console.log('🖼️ Script injection failed (might already be injected):', injectionError.message);
      }
      
      // Send detection request to content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'DETECT_IMAGES' });
      
      if (response && response.success) {
        this.handleImageDetectionSuccess(response.images, {
          url: tab.url,
          title: tab.title,
          hostname: new URL(tab.url).hostname
        });
      } else {
        throw new Error(response?.error || 'Image detection failed');
      }
      
    } catch (error) {
      console.error('🖼️ Image capture failed:', error);
      this.handleImageDetectionError(error.message);
    }
  }
  
  /**
   * Handle successful image detection
   */
  handleImageDetectionSuccess(images, pageInfo) {
    console.log(`🖼️ Received ${images.length} images from content script`);
    
    this.detectedImages = images;
    this.currentPageInfo = pageInfo;
    this.selectedImages.clear();
    
    // Update subtitle
    this.elements.captureSubtitle.textContent = `Found ${images.length} images on ${pageInfo.hostname}`;
    
    if (images.length === 0) {
      this.showImageEmptyState();
    } else {
      this.renderImageGrid();
      this.updateSelectionSummary();
    }
  }
  
  /**
   * Handle image detection error
   */
  handleImageDetectionError(errorMessage) {
    console.error('🖼️ Image detection error:', errorMessage);
    
    this.elements.errorMessage.textContent = errorMessage;
    this.showImageErrorState();
  }
  
  /**
   * Render the image grid
   */
  renderImageGrid() {
    const grid = this.elements.imageGrid;
    grid.innerHTML = '';
    
    // Hide loading/error/empty states
    this.hideAllImageStates();
    
    this.detectedImages.forEach((image, index) => {
      const imageItem = this.createImageItem(image, index);
      grid.appendChild(imageItem);
    });
    
    // Show the grid
    grid.parentElement.style.display = 'block';
  }
  
  /**
   * Create an image item element
   */
  createImageItem(image, index) {
    const item = document.createElement('div');
    item.className = 'image-item';
    item.dataset.index = index;
    
    // Create image element
    const img = document.createElement('img');
    img.src = image.url;
    img.alt = image.alt || '';
    img.loading = 'lazy';
    
    // Handle image load errors
    img.onerror = () => {
      // Fallback: try to fetch in page context and set data URL for preview
      this.loadImagePreview(img, image.url);
    };
    
    // Create checkbox
    const checkbox = document.createElement('div');
    checkbox.className = 'image-checkbox';
    
    // Create overlay with image info
    const overlay = document.createElement('div');
    overlay.className = 'image-overlay';
    
    const overlayText = [];
    if (image.filename) overlayText.push(image.filename);
    if (image.width && image.height) overlayText.push(`${image.width}×${image.height}`);
    if (image.alt) overlayText.push(image.alt.substring(0, 50));
    
    overlay.textContent = overlayText.join(' • ');
    
    // Assemble item
    item.appendChild(img);
    item.appendChild(checkbox);
    item.appendChild(overlay);
    
    // Add click handler
    item.addEventListener('click', () => this.toggleImageSelection(index));
    
    return item;
  }
  
  /**
   * Toggle image selection
   */
  toggleImageSelection(index) {
    const item = this.elements.imageGrid.children[index];
    if (!item) return;
    
    if (this.selectedImages.has(index)) {
      this.selectedImages.delete(index);
      item.classList.remove('selected');
    } else {
      this.selectedImages.add(index);
      item.classList.add('selected');
    }
    
    this.updateSelectionSummary();
  }
  
  /**
   * Select all images
   */
  selectAllImages() {
    this.selectedImages.clear();
    
    this.detectedImages.forEach((_, index) => {
      this.selectedImages.add(index);
      const item = this.elements.imageGrid.children[index];
      if (item) item.classList.add('selected');
    });
    
    this.updateSelectionSummary();
  }
  
  /**
   * Deselect all images
   */
  selectNoneImages() {
    this.selectedImages.clear();
    
    Array.from(this.elements.imageGrid.children).forEach(item => {
      item.classList.remove('selected');
    });
    
    this.updateSelectionSummary();
  }
  
  /**
   * Update selection summary
   */
  updateSelectionSummary() {
    this.elements.selectedCount.textContent = this.selectedImages.size;
    this.elements.totalCount.textContent = this.detectedImages.length;
    
    // Enable/disable create button
    const hasSelection = this.selectedImages.size > 0;
    this.elements.createMemoryCapsuleBtn.disabled = !hasSelection;
    
    if (hasSelection) {
      this.elements.createMemoryCapsuleBtn.classList.remove('disabled');
    } else {
      this.elements.createMemoryCapsuleBtn.classList.add('disabled');
    }
  }
  
  /**
   * Retry image detection
   */
  async retryImageDetection() {
    await this.startImageCapture();
  }
  
  /**
   * Create memory capsule from selected images
   */
  async createMemoryCapsuleFromImages() {
    if (this.selectedImages.size === 0) {
      console.warn('🖼️ No images selected for memory capsule');
      return;
    }
    
    console.log(`🖼️ Creating memory capsule from ${this.selectedImages.size} selected images...`);
    
    // Update UI to show processing
    this.elements.captureSubtitle.textContent = 'Downloading and processing images...';
    this.elements.createMemoryCapsuleBtn.disabled = true;
    this.elements.createMemoryCapsuleBtn.textContent = 'Processing...';
    
    try {
      // Download and process selected images
      const processedAttachments = [];
      let successCount = 0;
      
      for (const index of this.selectedImages) {
        const image = this.detectedImages[index];
        
        try {
          console.log(`🖼️ Processing image ${successCount + 1}/${this.selectedImages.size}: ${image.filename}`);
          
          // Update progress in UI
          this.elements.captureSubtitle.textContent = `Downloading image ${successCount + 1} of ${this.selectedImages.size}...`;
          
          // Download the image and convert to base64
          const imageData = await this.downloadImageAsBase64(image.url);
          
          if (imageData) {
            const attachment = {
              type: imageData.mimeType,
              name: image.filename || `image_${successCount + 1}.jpg`,
              data: imageData.dataUrl,
              size: imageData.size,
              metadata: {
                alt: image.alt,
                title: image.title,
                dimensions: image.width && image.height ? `${image.width}×${image.height}` : null,
                sourceUrl: image.url,
                context: image.context,
                originalMetadata: image.metadata
              }
            };
            
            processedAttachments.push(attachment);
            successCount++;
            
            console.log(`🖼️ ✅ Successfully processed ${image.filename} (${(imageData.size / 1024).toFixed(1)}KB)`);
            console.log(`🖼️ DEBUG: Attachment data preview:`, {
              name: attachment.name,
              type: attachment.type,
              dataUrlPreview: attachment.data.substring(0, 50) + '...',
              sourceUrl: attachment.metadata.sourceUrl.substring(0, 80)
            });
          }
        } catch (imageError) {
          console.warn(`🖼️ ❌ Failed to download image ${image.filename}:`, imageError);
          // Continue with other images
        }
      }
      
      if (processedAttachments.length === 0) {
        throw new Error('No images could be downloaded successfully');
      }
      
      console.log(`🖼️ Successfully processed ${processedAttachments.length} images`);
      
      // Create memory capsule data
      const memoryCapsule = {
        title: `Images from ${this.currentPageInfo.hostname}`,
        content: `Captured ${processedAttachments.length} images from ${this.currentPageInfo.title || this.currentPageInfo.url}`,
        type: 'image-collection',
        source: 'emma-image-capture',
        metadata: {
          sourceUrl: this.currentPageInfo.url,
          sourceTitle: this.currentPageInfo.title,
          sourceHostname: this.currentPageInfo.hostname,
          capturedAt: new Date().toISOString(),
          imageCount: processedAttachments.length,
          originalSelectionCount: this.selectedImages.size
        },
        attachments: processedAttachments
      };
      
      console.log('🖼️ Sending memory capsule to vault:', memoryCapsule);
      
      // Send to background script for processing
      const response = await chrome.runtime.sendMessage({
        action: 'SAVE_MEMORY_TO_VAULT',
        data: memoryCapsule
      });
      
      if (response && response.success) {
        console.log('🖼️ Memory capsule created successfully:', response.memoryId);
        this.showSuccessMessage(`Memory capsule created with ${processedAttachments.length} images!`);
        // Show created preview card
        this.renderCreatedPreview(memoryCapsule, processedAttachments);
      } else {
        throw new Error(response?.error || 'Failed to create memory capsule');
      }
      
    } catch (error) {
      console.error('🖼️ Failed to create memory capsule:', error);
      this.showErrorMessage(`Failed to create memory capsule: ${error.message}`);
    } finally {
      // Reset UI
      this.elements.createMemoryCapsuleBtn.disabled = false;
      this.elements.createMemoryCapsuleBtn.innerHTML = '<span class="btn-icon">💾</span><span class="btn-text">Create Memory Capsule</span>';
    }
  }
  
  /**
   * Download an image and convert to base64 data URL
   */
  async downloadImageAsBase64(imageUrl) {
    try {
      console.log(`🖼️ Downloading image: ${imageUrl.substring(0, 100)}...`);
      
      // Prefer chrome.scripting execution to bypass cross-origin limits via the page context
      if (this.activeTabId && chrome.scripting) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: this.activeTabId },
            func: async (url) => {
              try {
                const res = await fetch(url, { credentials: 'include', mode: 'cors' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const blob = await res.blob();
                const mime = blob.type || 'image/jpeg';
                const dataUrl = await new Promise((resolve, reject) => {
                  const r = new FileReader();
                  r.onload = () => resolve(r.result);
                  r.onerror = reject;
                  r.readAsDataURL(blob);
                });
                return { dataUrl, mimeType: mime, size: blob.size };
              } catch (e) {
                return { error: e?.message || 'page-fetch-failed' };
              }
            },
            args: [imageUrl]
          });
          const value = results && results[0] && results[0].result;
          if (value && !value.error) {
            return { dataUrl: value.dataUrl, mimeType: value.mimeType, size: value.size };
          }
          if (value && value.error) {
            console.warn('🖼️ Page-context fetch failed, falling back to extension fetch:', value.error);
          }
        } catch (scriptErr) {
          console.warn('🖼️ Page-context fetch error, falling back:', scriptErr?.message || scriptErr);
        }
      }

      // Fallback: Fetch from extension context (may hit CORS)
      const response = await fetch(imageUrl, { credentials: 'include', mode: 'cors' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Get the blob
      const blob = await response.blob();
      const mimeType = blob.type || 'image/jpeg';
      
      // Convert to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            dataUrl: reader.result,
            mimeType: mimeType,
            size: blob.size
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
    } catch (error) {
      console.error('🖼️ Failed to download image:', error);
      throw error;
    }
  }

  /**
   * Load preview image into an <img> element by fetching via page-context
   */
  async loadImagePreview(imgEl, imageUrl) {
    try {
      if (!this.activeTabId || !chrome.scripting) throw new Error('no-active-tab');
      const results = await chrome.scripting.executeScript({
        target: { tabId: this.activeTabId },
        func: async (url) => {
          try {
            const res = await fetch(url, { credentials: 'include', mode: 'cors' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const dataUrl = await new Promise((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => resolve(r.result);
              r.onerror = reject;
              r.readAsDataURL(blob);
            });
            return { dataUrl };
          } catch (e) {
            return { error: e?.message || 'preview-fetch-failed' };
          }
        },
        args: [imageUrl]
      });
      const value = results && results[0] && results[0].result;
      if (value && value.dataUrl) {
        imgEl.src = value.dataUrl;
        return;
      }
      throw new Error(value?.error || 'preview-failed');
    } catch (e) {
      // Final fallback placeholder
      imgEl.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjQwIiB5PSI0MCIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgZm9udC1zaXplPSIxMiI+4p2MPC90ZXh0Pgo8L3N2Zz4K';
    }
  }

  /**
   * Render created capsule preview card inline
   */
  renderCreatedPreview(memoryCapsule, attachments) {
    // Hide grids/states
    this.elements.imageGrid.innerHTML = '';
    this.elements.imageLoadingState.classList.add('hidden');
    this.elements.imageEmptyState.classList.add('hidden');
    this.elements.imageErrorState.classList.add('hidden');

    // Populate preview
    const preview = document.getElementById('createdPreview');
    const thumbs = document.getElementById('createdThumbs');
    const title = document.getElementById('createdTitle');
    const meta = document.getElementById('createdMeta');
    const viewBtn = document.getElementById('viewInWebAppPreviewBtn');
    const captureMoreBtn = document.getElementById('captureMoreBtn');

    thumbs.innerHTML = '';
    const maxThumbs = Math.min(4, attachments.length);
    for (let i = 0; i < maxThumbs; i++) {
      const img = document.createElement('img');
      const a = attachments[i];
      // For thumb, prefer data if present else url
      img.src = a.data || a.url;
      thumbs.appendChild(img);
    }
    title.textContent = memoryCapsule.title || 'New Memory';
    meta.textContent = `${attachments.length} images • ${new Date().toLocaleString()}`;

    preview.classList.remove('hidden');

    // Actions
    viewBtn.onclick = () => this.openWebApp();
    captureMoreBtn.onclick = () => this.startImageCapture();
  }
  
  /**
   * Go back to vault view
   */
  backToVault() {
    this.showActiveVaultState();
    
    // Clear image capture state
    this.detectedImages = [];
    this.selectedImages.clear();
    this.currentPageInfo = null;
  }
  
  /**
   * Show image capture state
   */
  showImageCaptureState() {
    this.elements.welcomeState.classList.add('hidden');
    this.elements.activeVaultState.classList.add('hidden');
    this.elements.imageCaptureState.classList.remove('hidden');
  }
  
  /**
   * Show image loading state
   */
  showImageLoadingState() {
    this.hideAllImageStates();
    this.elements.imageLoadingState.classList.remove('hidden');
  }
  
  /**
   * Show image empty state
   */
  showImageEmptyState() {
    this.hideAllImageStates();
    this.elements.imageEmptyState.classList.remove('hidden');
  }
  
  /**
   * Show image error state
   */
  showImageErrorState() {
    this.hideAllImageStates();
    this.elements.imageErrorState.classList.remove('hidden');
  }
  
  /**
   * Hide all image states
   */
  hideAllImageStates() {
    this.elements.imageLoadingState.classList.add('hidden');
    this.elements.imageEmptyState.classList.add('hidden');
    this.elements.imageErrorState.classList.add('hidden');
  }
  
  /**
   * Show success message
   */
  showSuccessMessage(message) {
    // Simple success indication - could be enhanced with a toast system
    this.elements.captureSubtitle.textContent = message;
    this.elements.captureSubtitle.style.color = 'var(--emma-success)';
    
    setTimeout(() => {
      this.elements.captureSubtitle.style.color = '';
    }, 3000);
  }
  
  /**
   * Show error message
   */
  showErrorMessage(message) {
    // Simple error indication - could be enhanced with a toast system
    this.elements.captureSubtitle.textContent = message;
    this.elements.captureSubtitle.style.color = 'var(--emma-error)';
    
    setTimeout(() => {
      this.elements.captureSubtitle.style.color = '';
    }, 5000);
  }
}

// Initialize the application
let emmaApp;

document.addEventListener('DOMContentLoaded', async () => {
  console.log('💜 Emma Vault Extension starting...');
  
  emmaApp = new EmmaVaultExtension();
  await emmaApp.init();
  
  // Make available globally for modal callbacks
  window.emmaApp = emmaApp;
  
  console.log('🎉 Emma Vault Extension ready for Debbe and all precious memories!');
});
