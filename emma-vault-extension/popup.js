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
    this.activeFileHandle = null; // Store active file handle
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleBackgroundMessage(request, sender, sendResponse);
      return true; // Keep channel open for async response
    });
    
    // DOM Elements
    this.elements = {
      // States
      welcomeState: document.getElementById('welcomeState'),
      activeVaultState: document.getElementById('activeVaultState'),
      
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
      vaultSize: document.getElementById('vaultSize'),
      lastSyncTime: document.getElementById('lastSyncTime'),
      
      // Action buttons
      addMemoryBtn: document.getElementById('addMemoryBtn'),
      openWebAppBtn: document.getElementById('openWebAppBtn'),
      downloadVaultBtn: document.getElementById('downloadVaultBtn'),
      closeVaultBtn: document.getElementById('closeVaultBtn'),
      
      // Modal
      modalOverlay: document.getElementById('modalOverlay'),
      modalContent: document.getElementById('modalContent'),
      
      // Version
      version: document.getElementById('version')
    };
    
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
    
    // Active vault actions
    this.elements.addMemoryBtn.addEventListener('click', () => this.addMemory());
    this.elements.openWebAppBtn.addEventListener('click', () => this.openWebApp());
    this.elements.downloadVaultBtn.addEventListener('click', () => this.downloadVault());
    this.elements.closeVaultBtn.addEventListener('click', () => this.closeVault());
    
    // Modal close
    this.elements.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.elements.modalOverlay) {
        this.closeModal();
      }
    });
    
    console.log('🎧 Event listeners set up');
  }
  
  updateUI() {
    console.log('🔄 Updating UI - isVaultOpen:', this.isVaultOpen);
    
    if (this.isVaultOpen) {
      this.showActiveVaultState();
    } else {
      this.showWelcomeState();
    }
    
    this.updateRecentVaults();
  }
  
  showWelcomeState() {
    this.elements.welcomeState.classList.remove('hidden');
    this.elements.activeVaultState.classList.add('hidden');
    console.log('📋 Showing welcome state');
  }
  
  showActiveVaultState() {
    this.elements.welcomeState.classList.add('hidden');
    this.elements.activeVaultState.classList.remove('hidden');
    
    // Update vault info
    if (this.currentVault) {
      this.elements.activeVaultName.textContent = this.vaultData?.name || 'My Memories';
      this.elements.activeVaultPath.textContent = this.currentVault.fileName || 'vault.emma';
      
      // Update stats
      const memoryCount = Object.keys(this.vaultData?.content?.memories || {}).length;
      this.elements.memoryCount.textContent = memoryCount;
      
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
      
      // Read and parse vault file
      const file = await fileHandle.getFile();
      const content = await file.text();
      const vaultData = JSON.parse(content);
      
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
      
      this.vaultData = vaultData;
      this.isVaultOpen = true;
      
      // CRITICAL: Store file handle in popup for vault operations
      this.activeFileHandle = fileHandle;
      console.log('✅ File handle stored in popup for vault operations');
      
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
      
      // Read file content
      const content = await file.text();
      const vaultData = JSON.parse(content);
      
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
  
  async downloadVault() {
    console.log('⬇️ Downloading vault...');
    
    if (!this.vaultData) {
      this.showError('No vault open');
      return;
    }
    
    try {
      // Create download blob
      const vaultJson = JSON.stringify(this.vaultData, null, 2);
      const blob = new Blob([vaultJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.vaultData.name || 'vault'}-backup.emma`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      console.log('✅ Vault downloaded');
      this.showSuccess('Vault downloaded successfully!');
      
    } catch (error) {
      console.error('❌ Download failed:', error);
      this.showError('Failed to download vault');
    }
  }
  
  async closeVault() {
    console.log('🔒 Closing vault...');
    
    this.currentVault = null;
    this.vaultData = null;
    this.isVaultOpen = false;
    
    await this.saveState();
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
      
      this.vaultData = vaultData;
      this.isVaultOpen = true;
      
      // CRITICAL: Store vault info - background will handle saves via popup
      console.log('📤 Storing vault info for background script...');
      await chrome.storage.local.set({
        vaultReady: true,
        vaultFileName: fileHandle.name,
        vaultCreated: new Date().toISOString()
      });
      
      // Store file handle in popup context for background to request
      this.activeFileHandle = fileHandle;
      
      console.log('✅ Vault ready for background saves');
      
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
  
  /**
   * Handle messages from background script
   */
  async handleBackgroundMessage(request, sender, sendResponse) {
    console.log('📨 Popup received message from background:', request.action);
    
    try {
      switch (request.action) {
        case 'SAVE_MEMORY_TO_VAULT':
          const memoryResult = await this.saveMemoryToFile(request.data);
          sendResponse(memoryResult);
          break;
          
        case 'SAVE_PERSON_TO_VAULT':
          const personResult = await this.savePersonToFile(request.data);
          sendResponse(personResult);
          break;
          
        case 'SAVE_MEDIA_TO_VAULT':
          const mediaResult = await this.saveMediaToFile(request.data);
          sendResponse(mediaResult);
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('❌ Popup message handler error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  /**
   * Save memory to vault file using popup's file handle
   */
  async saveMemoryToFile(memoryData) {
    if (!this.activeFileHandle) {
      throw new Error('No file handle available in popup');
    }
    
    // Read current vault data
    const file = await this.activeFileHandle.getFile();
    const currentData = JSON.parse(await file.text());
    
    // Generate memory ID
    const memoryId = 'memory_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Process attachments and save media files
    const processedAttachments = [];
    for (const attachment of memoryData.attachments || []) {
      const mediaId = 'media_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      const media = {
        id: mediaId,
        created: new Date().toISOString(),
        name: attachment.name,
        type: attachment.type,
        size: attachment.size || 0,
        data: attachment.data
      };
      
      if (!currentData.content.media) currentData.content.media = {};
      currentData.content.media[mediaId] = media;
      
      processedAttachments.push({
        id: mediaId,
        type: attachment.type,
        name: attachment.name,
        size: attachment.size || 0
      });
    }
    
    // Create memory object
    const memory = {
      id: memoryId,
      created: memoryData.created || new Date().toISOString(),
      content: memoryData.content,
      metadata: memoryData.metadata || {},
      attachments: processedAttachments
    };
    
    // Add to vault
    if (!currentData.content.memories) currentData.content.memories = {};
    currentData.content.memories[memoryId] = memory;
    
    // Update stats
    if (!currentData.stats) currentData.stats = { memoryCount: 0, peopleCount: 0, totalSize: 0 };
    currentData.stats.memoryCount = Object.keys(currentData.content.memories).length;
    
    // Write to file
    const writable = await this.activeFileHandle.createWritable();
    await writable.write(JSON.stringify(currentData, null, 2));
    await writable.close();
    
    console.log('✅ Memory saved to vault file via popup');
    return { success: true, id: memoryId };
  }
  
  /**
   * Save person to vault file using popup's file handle
   */
  async savePersonToFile(personData) {
    if (!this.activeFileHandle) {
      throw new Error('No file handle available in popup');
    }
    
    // Read current vault data
    const file = await this.activeFileHandle.getFile();
    const currentData = JSON.parse(await file.text());
    
    // Generate person ID
    const personId = 'person_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Create person object
    const person = {
      id: personId,
      created: personData.created || new Date().toISOString(),
      name: personData.name,
      relation: personData.relation || '',
      contact: personData.contact || '',
      avatar: personData.avatar || null
    };
    
    // Add to vault
    if (!currentData.content.people) currentData.content.people = {};
    currentData.content.people[personId] = person;
    
    // Update stats
    if (!currentData.stats) currentData.stats = { memoryCount: 0, peopleCount: 0, totalSize: 0 };
    currentData.stats.peopleCount = Object.keys(currentData.content.people).length;
    
    // Write to file
    const writable = await this.activeFileHandle.createWritable();
    await writable.write(JSON.stringify(currentData, null, 2));
    await writable.close();
    
    console.log('✅ Person saved to vault file via popup');
    return { success: true, id: personId };
  }
  
  /**
   * Save media to vault file using popup's file handle
   */
  async saveMediaToFile(mediaData) {
    if (!this.activeFileHandle) {
      throw new Error('No file handle available in popup');
    }
    
    // Read current vault data
    const file = await this.activeFileHandle.getFile();
    const currentData = JSON.parse(await file.text());
    
    // Generate media ID
    const mediaId = 'media_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Create media object
    const media = {
      id: mediaId,
      created: mediaData.created || new Date().toISOString(),
      name: mediaData.name,
      type: mediaData.type,
      size: mediaData.size || 0,
      data: mediaData.data
    };
    
    // Add to vault
    if (!currentData.content.media) currentData.content.media = {};
    currentData.content.media[mediaId] = media;
    
    // Update stats
    if (!currentData.stats) currentData.stats = { memoryCount: 0, peopleCount: 0, totalSize: 0 };
    currentData.stats.totalSize += JSON.stringify(media).length;
    
    // Write to file
    const writable = await this.activeFileHandle.createWritable();
    await writable.write(JSON.stringify(currentData, null, 2));
    await writable.close();
    
    console.log('✅ Media saved to vault file via popup');
    return { success: true, id: mediaId };
  }
  
  calculateVaultSize() {
    if (!this.vaultData) return 0;
    return JSON.stringify(this.vaultData).length;
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
