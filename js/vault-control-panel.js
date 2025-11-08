/**
 * Emma Vault Control Panel
 * Elegant central vault management interface
 * 
 * VISION: Universal vault control with beautiful Emma design
 * - Sync status between web app and local file
 * - Download controls for updating .emma file
 * - Vault statistics and security controls
 * - Perfect for dementia users - clear, simple interface
 * 
 * FOR DEBBE: Complete vault control in one beautiful modal \u2764\uFE0F
 */

class EmmaVaultControlPanel {
  constructor() {
    this.isOpen = false;
    this.syncStatus = {
      webAppLastSaved: null,
      localFileLastSaved: null,
      hasUnsavedChanges: false,
      autoSaveEnabled: true
    };
    this.boundEscapeHandler = null;
    this.triggerElement = null;
    
    console.log('\u{1F6E1}\uFE0F Emma Vault Control Panel initialized');
    
    this.ensureStylesInjected();
    // Create and inject the control panel
    this.createControlPanel();
    this.updateSyncStatus();
    
    // Auto-update sync status every 30 seconds
    setInterval(() => {
      if (this.isOpen) {
        this.updateSyncStatus();
      }
    }, 30000);
  }

  ensureStylesInjected() {
    if (document.getElementById('emmaVaultControlPanelStyles')) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.id = 'emmaVaultControlPanelStyles';

    try {
      const currentScript = document.currentScript || Array.from(document.getElementsByTagName('script'))
        .find(script => script && script.src && script.src.includes('vault-control-panel.js'));
      const scriptUrl = currentScript ? new URL(currentScript.src, window.location.href) : null;
      const cssUrl = scriptUrl ? new URL('../css/vault-control-panel.css', scriptUrl) : null;
      link.href = cssUrl ? cssUrl.href : 'css/vault-control-panel.css';
    } catch (error) {
      console.warn('Vault Control Panel: failed to resolve stylesheet path, using default', error);
      link.href = 'css/vault-control-panel.css';
    }

    link.onerror = () => {
      link.remove();
      if (!document.getElementById('emmaVaultControlPanelInlineStyles')) {
        const fallback = document.createElement('style');
        fallback.id = 'emmaVaultControlPanelInlineStyles';
        fallback.textContent = `
          .vault-control-shield {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 9999;
            border: none;
            border-radius: 50%;
            width: 48px;
            height: 48px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(var(--emma-accent-primary-rgb, 139, 92, 246), 0.18);
            color: var(--emma-accent-primary, #8b5cf6);
            cursor: pointer;
          }
        `;
        document.head.appendChild(fallback);
      }
    };

    document.head.appendChild(link);
  }

  /**
   * Create the elegant control panel interface
   */
  createControlPanel() {
    // Create shield icon (always visible)
    const shieldIcon = document.createElement('button');
    shieldIcon.id = 'vaultControlShield';
    shieldIcon.className = 'vault-control-shield emma-floating-button';
    shieldIcon.type = 'button';
    shieldIcon.setAttribute('aria-expanded', 'false');
    shieldIcon.setAttribute('aria-label', 'Vault Control Panel');
    shieldIcon.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
        <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/>
      </svg>
    `;
    shieldIcon.title = 'Vault Control Panel';
    
    // Click to open control panel
    shieldIcon.addEventListener('click', () => this.openControlPanel());
    
    document.body.appendChild(shieldIcon);
    console.log('\u{1F6E1}\uFE0F Vault Control Panel shield icon created');
  }

  /**
   * Open the elegant control panel modal
   */
  openControlPanel() {
    if (this.isOpen) return;
    this.isOpen = true;
    
    console.log('\u{1F6E1}\uFE0F Opening Vault Control Panel...');
    
    // Update sync status before showing
    this.updateSyncStatus();
    
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'vaultControlModal';
    modalOverlay.className = 'vault-control-overlay';
    
    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'vault-control-dialog';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'vaultControlTitle');
    modal.tabIndex = -1;
    
    modal.innerHTML = this.generateModalContent();
    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);
    this.triggerElement = document.getElementById('vaultControlShield');
    if (this.triggerElement) {
      this.triggerElement.setAttribute('aria-expanded', 'true');
    }
    
    // Animate in
    requestAnimationFrame(() => {
      modalOverlay.classList.add('is-visible');
      modal.focus();
    });
    
    // Set up event listeners
    this.setupModalEventListeners(modalOverlay);

    this.boundEscapeHandler = (event) => {
      if (event.key === 'Escape') {
        this.closeControlPanel();
      }
    };
    document.addEventListener('keydown', this.boundEscapeHandler);
  }

  /**
   * Generate the beautiful modal content
   */
  generateModalContent() {
    const vaultInfo = this.getVaultInfo();
    const syncStatus = this.syncStatus;
    const syncState = syncStatus.hasUnsavedChanges ? 'dirty' : 'clean';
    const syncAccent = syncStatus.hasUnsavedChanges ? 'var(--emma-warning)' : 'var(--emma-success)';
    const syncHeadline = syncStatus.hasUnsavedChanges ? '\u26A0\uFE0F Unsaved Changes' : '\u2705 In Sync';
    const syncDescription = syncStatus.hasUnsavedChanges
      ? 'Your web app has newer data than your local file.'
      : 'Web app and local file are up to date.';
    const heroSignalText = (syncHeadline || 'Sync Status').replace(/[<>]/g, '').trim();
    
    return `
      <button type="button" class="vault-control__dismiss" id="closeControlPanelIcon" aria-label="Close vault control panel">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M6 6l12 12M18 6l-12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
      </button>
      <div class="vault-control">
        <header class="vault-control__hero" aria-label="Vault overview">
          <div class="vault-hero">
            <span class="vault-hero__glow" aria-hidden="true"></span>
            <div class="vault-hero__signal" role="status">
              <span class="vault-hero__signal-dot" data-state="${syncState}" aria-hidden="true"></span>
              <span class="vault-hero__signal-text">${heroSignalText || 'Sync Status'}</span>
            </div>
            <div class="vault-hero__core">
              <div class="vault-hero__icon" aria-hidden="true">\u{1F6E1}\uFE0F</div>
              <div class="vault-hero__copy">
                <span class="vault-hero__eyebrow">Emma Vault System</span>
                <h2 id="vaultControlTitle" class="vault-hero__title">Vault Control Hub</h2>
                <p class="vault-hero__subtitle">Curate, lock, and share your memory constellation with total confidence.</p>
              </div>
            </div>
            <div class="vault-hero__quickstats" aria-label="Vault at a glance">
              <div class="vault-hero__stat">
                <span>Memories</span>
                <strong>${vaultInfo.memoryCount}</strong>
              </div>
              <div class="vault-hero__stat">
                <span>People</span>
                <strong>${vaultInfo.peopleCount}</strong>
              </div>
              <div class="vault-hero__stat">
                <span>Media</span>
                <strong>${vaultInfo.mediaCount}</strong>
              </div>
              <div class="vault-hero__stat">
                <span>Last Sync</span>
                <strong>${syncStatus.webAppLastSaved || 'Never'}</strong>
              </div>
            </div>
            <div class="vault-hero__meta" aria-label="Active vault">
              <span class="vault-hero__chip">Active Vault</span>
              <span class="vault-hero__name">${vaultInfo.name}</span>
            </div>
          </div>
        </header>
        
        <!-- Vault Information -->
        <section class="vault-section vault-section--info">
          <div class="vault-section__header">
            <span class="vault-section__eyebrow">Vault Overview</span>
            <div class="vault-section__headline">
              <span class="vault-section__icon" aria-hidden="true">\u{1F4C1}</span>
              <h3 class="vault-section__title">${vaultInfo.name}</h3>
            </div>
          </div>
          <dl class="vault-stats">
            <div class="vault-stats__item">
              <dt>\u{1F49D} Memories</dt>
              <dd>${vaultInfo.memoryCount}</dd>
            </div>
            <div class="vault-stats__item">
              <dt>\u{1F465} People</dt>
              <dd>${vaultInfo.peopleCount}</dd>
            </div>
            <div class="vault-stats__item">
              <dt>\u{1F4F7} Media</dt>
              <dd>${vaultInfo.mediaCount}</dd>
            </div>
            <div class="vault-stats__item">
              <dt>\u{1F4CA} Size</dt>
              <dd>${vaultInfo.size}</dd>
            </div>
          </dl>
        </section>
        
        <!-- Sync Status -->
        <section class="vault-section vault-section--sync" data-sync-state="${syncState}" style="--vault-sync-accent: ${syncAccent};">
          <div class="vault-section__header">
            <span class="vault-section__eyebrow">Sync Intelligence</span>
            <div class="vault-section__headline">
              <span class="vault-section__icon" aria-hidden="true">\u{1F504}</span>
              <h3 class="vault-section__title">Sync Status</h3>
            </div>
          </div>
          <div class="vault-sync">
            <div class="vault-sync__row">
              <span class="vault-sync__label">\u{1F4BE} Web App</span>
              <span class="vault-sync__value">${syncStatus.webAppLastSaved || 'Never saved'}</span>
            </div>
            <div class="vault-sync__row">
              <span class="vault-sync__label">\u{1F4C1} Local File</span>
              <span class="vault-sync__value">${syncStatus.localFileLastSaved || 'Never saved'}</span>
            </div>
            <div class="vault-sync__row">
              <span class="vault-sync__label">\u2699\uFE0F Auto Save</span>
              <span class="vault-sync__value">${syncStatus.autoSaveEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
          <div class="vault-sync__badge" aria-live="polite">
            <strong>${syncHeadline}</strong>
            <span>${syncDescription}</span>
          </div>
        </section>
        
        <!-- Vault Controls -->
        <section class="vault-section vault-section--controls">
          <div class="vault-section__header">
            <span class="vault-section__eyebrow">Command Center</span>
            <div class="vault-section__headline">
              <span class="vault-section__icon" aria-hidden="true">\u2699\uFE0F</span>
              <h3 class="vault-section__title">Vault Controls</h3>
            </div>
          </div>
          <div class="vault-actions">
            <button id="openVaultBtn" class="vault-button emma-button emma-button--neutral">
              <span class="vault-button__icon" aria-hidden="true">\u{1F4C1}</span>
              <span class="vault-button__label">Open Different Vault</span>
            </button>
            <button id="downloadVaultBtn" class="vault-button emma-button emma-button--affirmative">
              <span class="vault-button__icon" aria-hidden="true">\u{1F4BE}</span>
              <span class="vault-button__label">Download Updated Vault</span>
            </button>
            <button id="lockVaultBtn" class="vault-button emma-button emma-button--danger">
              <span class="vault-button__icon" aria-hidden="true">\u{1F512}</span>
              <span class="vault-button__label">Lock Vault</span>
            </button>
            <button id="vaultStatsBtn" class="vault-button emma-button emma-button--outline">
              <span class="vault-button__icon" aria-hidden="true">\u{1F4CA}</span>
              <span class="vault-button__label">Vault Statistics</span>
            </button>
          </div>
          <input type="file" id="vaultControlFileInput" accept=".emma" hidden>
        </section>
        
      </div>
    `;
  }

  /**
   * Set up modal event listeners
   */
  setupModalEventListeners(modalOverlay) {
    const get = (selector) => modalOverlay.querySelector(selector);

    const openBtn = get('#openVaultBtn');
    if (openBtn) {
      openBtn.addEventListener('click', () => this.openDifferentVault());
    }

    const downloadBtn = get('#downloadVaultBtn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadUpdatedVault());
    }

    const lockBtn = get('#lockVaultBtn');
    if (lockBtn) {
      lockBtn.addEventListener('click', () => this.lockVault());
    }

    const statsBtn = get('#vaultStatsBtn');
    if (statsBtn) {
      statsBtn.addEventListener('click', () => this.showVaultStatistics());
    }

    const closeIcon = get('#closeControlPanelIcon');
    if (closeIcon) {
      closeIcon.addEventListener('click', () => this.closeControlPanel());
    }

    modalOverlay.addEventListener('click', (event) => {
      if (event.target === modalOverlay) {
        this.closeControlPanel();
      }
    });
  }

  /**
   * Get current vault information
   */
  getVaultInfo() {
    if (!window.emmaWebVault || !window.emmaWebVault.vaultData) {
      return {
        name: 'No vault loaded',
        memoryCount: 0,
        peopleCount: 0,
        mediaCount: 0,
        size: '0 B'
      };
    }
    
    const vaultData = window.emmaWebVault.vaultData;
    const memories = Object.keys(vaultData.content?.memories || {}).length;
    const people = Object.keys(vaultData.content?.people || {}).length;
    const media = Object.keys(vaultData.content?.media || {}).length;
    const sizeBytes = JSON.stringify(vaultData).length;
    const fallbackName = vaultData.metadata?.name
      || vaultData.name
      || window.emmaWebVault.originalFileName
      || (() => {
        try {
          return sessionStorage.getItem('emmaVaultName') || localStorage.getItem('emmaVaultName');
        } catch (_) {
          return null;
        }
      })();
    const normalizedName = typeof window.emmaWebVault.ensureVaultMetadataName === 'function'
      ? window.emmaWebVault.ensureVaultMetadataName(fallbackName)
      : (fallbackName || 'Unknown Vault');

    return {
      name: normalizedName,
      memoryCount: memories,
      peopleCount: people,
      mediaCount: media,
      size: this.formatFileSize(sizeBytes)
    };
  }

  /**
   * Update sync status information
   */
  updateSyncStatus() {
    try {
      // Get last saved timestamps
      this.syncStatus.webAppLastSaved = localStorage.getItem('emmaVaultLastSaved') || 'Never';
      this.syncStatus.localFileLastSaved = localStorage.getItem('emmaVaultFileLastSaved') || 'Never';
      
      // Check for unsaved changes (simplified check)
      const webAppTime = new Date(this.syncStatus.webAppLastSaved === 'Never' ? 0 : this.syncStatus.webAppLastSaved);
      const fileTime = new Date(this.syncStatus.localFileLastSaved === 'Never' ? 0 : this.syncStatus.localFileLastSaved);
      
      this.syncStatus.hasUnsavedChanges = webAppTime > fileTime;
      
      console.log('\u{1F504} Sync status updated:', this.syncStatus);
    } catch (error) {
      console.warn('\u26A0\uFE0F Failed to update sync status:', error);
    }
  }

  /**
   * Open a different vault file (session recovery)
   */
  async openDifferentVault() {
    try {
      console.log('\u{1F4C1} Opening different vault for session recovery...');
      
      // Trigger file input
      const fileInput = document.getElementById('vaultControlFileInput');
      fileInput.onchange = async (event) => {
        const file = event.target.files[0];
        if (file && file.name.endsWith('.emma')) {
          await this.processVaultFile(file);
        } else {
          this.showToast('\u274C Please select a valid .emma vault file', 'error');
        }
        fileInput.value = ''; // Reset for future use
      };
      
      fileInput.click();
      
    } catch (error) {
      console.error('\u274C Failed to open vault file dialog:', error);
      this.showToast('\u274C Failed to open file dialog: ' + error.message, 'error');
    }
  }

  /**
   * Process vault file with full encryption support (copied from index.html)
   */
  async processVaultFile(file, fileHandle = null) {
    try {
      console.log('\u{1F4C2} Processing vault file:', file.name);
      
      // Show loading state
      this.showToast('\u{1F4C2} Processing vault file...', 'info');
      
      // Read file data
      const fileData = await file.arrayBuffer();
      console.log('\u{1F4C4} File data loaded, size:', fileData.byteLength);
      
      // Request passphrase using Emma's beautiful modal
      let passphrase;
      try {
        if (window.cleanSecurePasswordModal) {
          passphrase = await window.cleanSecurePasswordModal.show({
            title: `Unlock ${file.name}`,
            message: 'Enter your vault passphrase to unlock your memories:',
            placeholder: 'Enter passphrase...'
          });
        } else {
          // Fallback to simple prompt if modal not available
          // SECURITY FIX: Replace prompt with proper modal
          passphrase = await showPasswordModal(`Enter passphrase for ${file.name}`, 'Passphrase:');
        }
      } catch (error) {
        if (error.message === 'User cancelled') {
          console.log('\u{1F4C2} Vault unlock cancelled by user');
          return;
        }
        throw error;
      }
      
      if (!passphrase) {
        console.log('\u{1F4C2} Vault unlock cancelled - no passphrase provided');
        return;
      }
      
      this.showToast('\u{1F510} Decrypting vault...', 'info');
      
      // Decrypt vault using Emma Web Vault's native crypto
      const vaultData = await window.emmaWebVault.exactWorkingDecrypt(fileData, passphrase);
      
      if (!vaultData || !vaultData.content) {
        throw new Error('Invalid vault data structure');
      }
      
      console.log('\u2705 Vault decrypted successfully:', vaultData.metadata?.name);
      
      // Update Emma Web Vault with new data
      window.emmaWebVault.vaultData = vaultData;
      window.emmaWebVault.isOpen = true;
      window.emmaWebVault.originalFileName = file.name;
      try {
        sessionStorage.setItem('emmaVaultOriginalFileName', file.name);
        localStorage.setItem('emmaVaultOriginalFileName', file.name);
      } catch (_) {}
      window.emmaWebVault.fileHandle = fileHandle;
      
      // Update session storage and localStorage
      sessionStorage.setItem('emmaVaultActive', 'true');
      sessionStorage.setItem('emmaVaultName', vaultData.metadata?.name || file.name);
      localStorage.setItem('emmaVaultActive', 'true');
      localStorage.setItem('emmaVaultName', vaultData.metadata?.name || file.name);
      
      // Save to IndexedDB for persistence
      try {
        await window.emmaWebVault.saveToIndexedDB();
        console.log('\u2705 New vault saved to IndexedDB successfully');
      } catch (idbError) {
        console.warn('\u26A0\uFE0F IndexedDB save failed (non-critical):', idbError);
      }
      
      // Update control panel display
      this.updateSyncStatus();
      
      // Close control panel and show success
      this.closeControlPanel();
      this.showToast(`\u2705 Vault "${vaultData.metadata?.name || file.name}" loaded successfully!`, 'success');
      
      // Refresh page to show new vault data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('\u274C Failed to process vault:', error);
      this.showToast('\u274C Failed to unlock vault: ' + error.message, 'error');
    }
  }

  /**
   * Download updated vault file with proper encryption
   */
  async downloadUpdatedVault() {
    try {
      console.log('\u{1F4BE} Downloading updated vault...');
      
      if (!window.emmaWebVault || !window.emmaWebVault.vaultData) {
        throw new Error('No vault data available');
      }
      
      const downloadBtn = document.getElementById('downloadVaultBtn');
      const iconSpan = downloadBtn ? downloadBtn.querySelector('.vault-button__icon') : null;
      const labelSpan = downloadBtn ? downloadBtn.querySelector('.vault-button__label') : null;
      const originalIcon = iconSpan ? iconSpan.textContent : '\u{1F4BE}';
      const originalLabel = labelSpan ? labelSpan.textContent : (downloadBtn ? downloadBtn.textContent.trim() : 'Download Updated Vault');
      const setButtonState = (icon, label) => {
        if (!downloadBtn) {
          return;
        }
        if (iconSpan) {
          iconSpan.textContent = icon;
        }
        if (labelSpan) {
          labelSpan.textContent = label;
        }
        if (!iconSpan || !labelSpan) {
          const parts = [];
          if (icon) { parts.push(icon); }
          if (label) { parts.push(label); }
          downloadBtn.textContent = parts.join(' ');
        }
      };
      
      if (downloadBtn) {
        setButtonState('\u23F3', 'Preparing download...');
        downloadBtn.disabled = true;
      }
      
      let passphrase;
      try {
        if (window.cleanSecurePasswordModal) {
          passphrase = await window.cleanSecurePasswordModal.show({
            title: 'Encrypt Vault for Download',
            message: 'Enter your vault passphrase to encrypt and save:',
            placeholder: 'Enter vault passphrase...'
          });
        } else {
          passphrase = prompt('\u{1F510} Enter your vault passphrase to encrypt and save:');
        }
      } catch (error) {
        if (error.message === 'User cancelled') {
          console.log('\u{1F4BE} Download cancelled by user');
          if (downloadBtn) {
            setButtonState(originalIcon, originalLabel);
            downloadBtn.disabled = false;
          }
          return;
        }
        throw error;
      }
      
      if (!passphrase) {
        console.log('\u{1F4BE} Download cancelled - no passphrase provided');
        if (downloadBtn) {
          setButtonState(originalIcon, originalLabel);
          downloadBtn.disabled = false;
        }
        return;
      }
      
      if (downloadBtn) {
        setButtonState('\u{1F512}', 'Encrypting vault...');
      }
      
      const encryptedData = await window.emmaWebVault.nativeEncryptVault(
        window.emmaWebVault.vaultData,
        passphrase
      );
      
      if (downloadBtn) {
        setButtonState('\u{1F4BE}', 'Saving vault...');
      }
      
      if (window.emmaWebVault.fileHandle) {
        const writable = await window.emmaWebVault.fileHandle.createWritable();
        await writable.write(encryptedData);
        await writable.close();
        this.showToast('\u2705 Vault saved to your local file successfully!', 'success');
      } else {
        const fileName = `${window.emmaWebVault.vaultData.metadata?.name || 'vault'}-updated.emma`;
        const blob = new Blob([encryptedData], { type: 'application/emma-vault' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('\u{1F4E5} Updated vault downloaded successfully!', 'success');
      }
      
      localStorage.setItem('emmaVaultFileLastSaved', new Date().toISOString());
      this.updateSyncStatus();
      
      if (downloadBtn) {
        setButtonState(originalIcon, originalLabel);
        downloadBtn.disabled = false;
      }
      
      console.log('\u2705 Vault download completed successfully');
      
    } catch (error) {
      console.error('\u274C Failed to download vault:', error);
      this.showToast('\u274C Failed to download vault: ' + error.message, 'error');
      
      const downloadBtn = document.getElementById('downloadVaultBtn');
      if (downloadBtn) {
        const iconSpan = downloadBtn.querySelector('.vault-button__icon');
        const labelSpan = downloadBtn.querySelector('.vault-button__label');
        if (iconSpan) {
          iconSpan.textContent = '\u{1F4BE}';
        }
        if (labelSpan) {
          labelSpan.textContent = 'Download Updated Vault';
        } else {
          downloadBtn.textContent = '\u{1F4BE} Download Updated Vault';
        }
        downloadBtn.disabled = false;
      }
    }
  }

  /**
   * Lock vault with confirmation
   */
  async lockVault() {
    try {
      const confirmed = await window.emmaConfirm('Would you like to lock your vault for security?', {
        title: 'Lock Vault',
        helpText: 'You\'ll need to enter your passphrase to unlock it again.',
        confirmText: 'Yes, Lock It',
        cancelText: 'Keep Unlocked'
      });
      if (!confirmed) return;
      
      console.log('\u{1F512} Locking vault...');
      
      if (window.emmaWebVault && window.emmaWebVault.lockVault) {
        await window.emmaWebVault.lockVault();
        this.showToast('\u{1F512} Vault locked successfully', 'success');
        
        // Close control panel and redirect to index
        this.closeControlPanel();
        setTimeout(() => {
          window.location.href = '../index.html';
        }, 1000);
      } else {
        throw new Error('Vault lock functionality not available');
      }
      
    } catch (error) {
      console.error('\u274C Failed to lock vault:', error);
      this.showToast('\u274C Failed to lock vault: ' + error.message, 'error');
    }
  }

  /**
   * Show detailed vault statistics
   */
  showVaultStatistics() {
    // TODO: Implement detailed statistics modal
    this.showToast('\u{1F4CA} Detailed statistics coming soon!', 'info');
  }

  /**
   * Close the control panel
   */
  closeControlPanel() {
    const overlay = document.getElementById('vaultControlModal');
    if (!overlay) {
      return;
    }

    overlay.classList.remove('is-visible');

    let cleaned = false;
    const finalize = () => {
      if (cleaned) {
        return;
      }
      cleaned = true;

      if (this.boundEscapeHandler) {
        document.removeEventListener('keydown', this.boundEscapeHandler);
        this.boundEscapeHandler = null;
      }

      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }

      this.isOpen = false;

      if (this.triggerElement) {
        this.triggerElement.setAttribute('aria-expanded', 'false');
        this.triggerElement.focus();
        this.triggerElement = null;
      }
    };

    const onTransitionEnd = (event) => {
      if (event.target === overlay) {
        overlay.removeEventListener('transitionend', onTransitionEnd);
        finalize();
      }
    };

    overlay.addEventListener('transitionend', onTransitionEnd);

    setTimeout(() => {
      if (cleaned) {
        return;
      }
      overlay.removeEventListener('transitionend', onTransitionEnd);
      finalize();
    }, 260);
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `vault-toast vault-toast--${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    const activeCount = document.querySelectorAll('.vault-toast').length;
    toast.style.setProperty('--vault-toast-index', activeCount.toString());

    const accent = type === 'success'
      ? 'var(--emma-success)'
      : type === 'error'
        ? 'var(--emma-danger)'
        : 'var(--emma-accent-primary)';
    toast.style.setProperty('--vault-toast-accent', accent);
    toast.textContent = message;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('is-visible');
    });

    const dismiss = () => {
      toast.classList.remove('is-visible');
      const removeToast = () => {
        toast.removeEventListener('transitionend', removeToast);
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      };
      toast.addEventListener('transitionend', removeToast);
      setTimeout(removeToast, 400);
    };

    setTimeout(dismiss, 4200);
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

// Create global instance
if (!window.emmaVaultControlPanel) {
  window.emmaVaultControlPanel = new EmmaVaultControlPanel();
  console.log('\u{1F6E1}\uFE0F Emma Vault Control Panel ready');
} else {
  console.log('\u2705 Using existing Vault Control Panel instance');
}

// Global access for debugging
window.openVaultControlPanel = () => window.emmaVaultControlPanel.openControlPanel();









