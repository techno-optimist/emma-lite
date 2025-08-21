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
 * FOR DEBBE: Complete vault control in one beautiful modal ❤️
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
    
    console.log('🛡️ Emma Vault Control Panel initialized');
    
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

  /**
   * Create the elegant control panel interface
   */
  createControlPanel() {
    // Create shield icon (always visible)
    const shieldIcon = document.createElement('div');
    shieldIcon.id = 'vaultControlShield';
    shieldIcon.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #8B5CF6, #F093FB);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 8px 32px rgba(139, 92, 246, 0.4);
      border: 2px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
      z-index: 9999;
      font-size: 24px;
      color: white;
    `;
    shieldIcon.innerHTML = '🛡️';
    shieldIcon.title = 'Vault Control Panel';
    
    // Hover effects
    shieldIcon.addEventListener('mouseenter', () => {
      shieldIcon.style.transform = 'scale(1.1)';
      shieldIcon.style.boxShadow = '0 12px 48px rgba(139, 92, 246, 0.6)';
    });
    
    shieldIcon.addEventListener('mouseleave', () => {
      shieldIcon.style.transform = 'scale(1)';
      shieldIcon.style.boxShadow = '0 8px 32px rgba(139, 92, 246, 0.4)';
    });
    
    // Click to open control panel
    shieldIcon.addEventListener('click', () => this.openControlPanel());
    
    document.body.appendChild(shieldIcon);
    console.log('🛡️ Vault Control Panel shield icon created');
  }

  /**
   * Open the elegant control panel modal
   */
  openControlPanel() {
    if (this.isOpen) return;
    this.isOpen = true;
    
    console.log('🛡️ Opening Vault Control Panel...');
    
    // Update sync status before showing
    this.updateSyncStatus();
    
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'vaultControlModal';
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(15px);
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      border-radius: 24px;
      padding: 40px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      border: 2px solid rgba(139, 92, 246, 0.3);
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
      transform: scale(0.9);
      transition: transform 0.3s ease;
    `;
    
    modal.innerHTML = this.generateModalContent();
    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);
    
    // Animate in
    setTimeout(() => {
      modalOverlay.style.opacity = '1';
      modal.style.transform = 'scale(1)';
    }, 10);
    
    // Set up event listeners
    this.setupModalEventListeners(modalOverlay);
  }

  /**
   * Generate the beautiful modal content
   */
  generateModalContent() {
    const vaultInfo = this.getVaultInfo();
    const syncStatus = this.syncStatus;
    
    return `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 48px; margin-bottom: 15px;">🛡️</div>
        <h2 style="color: white; margin: 0 0 10px 0; font-size: 28px; font-weight: 600;">
          Vault Control Panel
        </h2>
        <p style="color: rgba(255,255,255,0.7); margin: 0; font-size: 16px;">
          Manage your precious memories vault
        </p>
      </div>
      
      <!-- Vault Information -->
      <div style="
        background: rgba(139, 92, 246, 0.1);
        border: 2px solid rgba(139, 92, 246, 0.3);
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 24px;
      ">
        <h3 style="color: white; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center; gap: 10px;">
          📁 ${vaultInfo.name}
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; color: rgba(255,255,255,0.9);">
          <div>
            <strong>💝 Memories:</strong> ${vaultInfo.memoryCount}
          </div>
          <div>
            <strong>👥 People:</strong> ${vaultInfo.peopleCount}
          </div>
          <div>
            <strong>📷 Media:</strong> ${vaultInfo.mediaCount}
          </div>
          <div>
            <strong>📊 Size:</strong> ${vaultInfo.size}
          </div>
        </div>
      </div>
      
      <!-- Sync Status -->
      <div style="
        background: rgba(16, 185, 129, 0.1);
        border: 2px solid rgba(16, 185, 129, 0.3);
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 24px;
      ">
        <h3 style="color: white; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center; gap: 10px;">
          🔄 Sync Status
        </h3>
        <div style="color: rgba(255,255,255,0.9); line-height: 1.6;">
          <div style="margin-bottom: 10px;">
            <strong>💾 Web App:</strong> ${syncStatus.webAppLastSaved || 'Never saved'}
          </div>
          <div style="margin-bottom: 10px;">
            <strong>📁 Local File:</strong> ${syncStatus.localFileLastSaved || 'Never saved'}
          </div>
          <div style="
            padding: 12px;
            background: ${syncStatus.hasUnsavedChanges ? 'rgba(251, 191, 36, 0.2)' : 'rgba(16, 185, 129, 0.2)'};
            border: 2px solid ${syncStatus.hasUnsavedChanges ? 'rgba(251, 191, 36, 0.4)' : 'rgba(16, 185, 129, 0.4)'};
            border-radius: 10px;
            margin-top: 10px;
          ">
            ${syncStatus.hasUnsavedChanges ? 
              '⚠️ <strong>Unsaved Changes</strong><br>Your web app has newer data than your local file' :
              '✅ <strong>In Sync</strong><br>Web app and local file are up to date'
            }
          </div>
        </div>
      </div>
      
      <!-- Vault Controls -->
      <div style="
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 24px;
      ">
        <h3 style="color: white; margin: 0 0 20px 0; font-size: 18px; display: flex; align-items: center; gap: 10px;">
          ⚙️ Vault Controls
        </h3>
        <div style="display: grid; gap: 12px;">
          <button id="downloadVaultBtn" style="
            background: linear-gradient(135deg, #10b981, #059669);
            border: none;
            color: white;
            padding: 14px 20px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
          " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            💾 Download Updated Vault
          </button>
          
          <button id="lockVaultBtn" style="
            background: linear-gradient(135deg, #dc2626, #b91c1c);
            border: none;
            color: white;
            padding: 14px 20px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
          " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            🔒 Lock Vault
          </button>
          
          <button id="vaultStatsBtn" style="
            background: rgba(139, 92, 246, 0.2);
            border: 2px solid rgba(139, 92, 246, 0.4);
            color: white;
            padding: 14px 20px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
          " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            📊 Vault Statistics
          </button>
        </div>
      </div>
      
      <!-- Close Button -->
      <div style="text-align: center;">
        <button id="closeControlPanelBtn" style="
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
          ✕ Close
        </button>
      </div>
    `;
  }

  /**
   * Set up modal event listeners
   */
  setupModalEventListeners(modalOverlay) {
    // Download vault button
    document.getElementById('downloadVaultBtn').addEventListener('click', () => {
      this.downloadUpdatedVault();
    });
    
    // Lock vault button
    document.getElementById('lockVaultBtn').addEventListener('click', () => {
      this.lockVault();
    });
    
    // Vault statistics button
    document.getElementById('vaultStatsBtn').addEventListener('click', () => {
      this.showVaultStatistics();
    });
    
    // Close button
    document.getElementById('closeControlPanelBtn').addEventListener('click', () => {
      this.closeControlPanel();
    });
    
    // Click outside to close
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        this.closeControlPanel();
      }
    });
    
    // Escape key to close
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.closeControlPanel();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
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
    
    return {
      name: vaultData.metadata?.name || 'Unknown Vault',
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
      
      console.log('🔄 Sync status updated:', this.syncStatus);
    } catch (error) {
      console.warn('⚠️ Failed to update sync status:', error);
    }
  }

  /**
   * Download updated vault file
   */
  async downloadUpdatedVault() {
    try {
      console.log('💾 Downloading updated vault...');
      
      if (!window.emmaWebVault || !window.emmaWebVault.vaultData) {
        throw new Error('No vault data available');
      }
      
      // Show loading state
      const downloadBtn = document.getElementById('downloadVaultBtn');
      const originalText = downloadBtn.innerHTML;
      downloadBtn.innerHTML = '⏳ Preparing download...';
      downloadBtn.disabled = true;
      
      // Use existing download functionality
      if (window.emmaWebVault.fileHandle) {
        // Use File System Access API for seamless save
        await window.emmaWebVault.saveVaultToFile();
        this.showToast('✅ Vault saved to your local file successfully!', 'success');
      } else {
        // Fallback to download
        const fileName = `${window.emmaWebVault.vaultData.metadata?.name || 'vault'}-updated.emma`;
        await window.emmaWebVault.downloadVaultFile(fileName);
        this.showToast('📥 Updated vault downloaded successfully!', 'success');
      }
      
      // Update sync status
      localStorage.setItem('emmaVaultFileLastSaved', new Date().toISOString());
      this.updateSyncStatus();
      
      // Restore button
      downloadBtn.innerHTML = originalText;
      downloadBtn.disabled = false;
      
    } catch (error) {
      console.error('❌ Failed to download vault:', error);
      this.showToast('❌ Failed to download vault: ' + error.message, 'error');
      
      // Restore button
      const downloadBtn = document.getElementById('downloadVaultBtn');
      downloadBtn.innerHTML = '💾 Download Updated Vault';
      downloadBtn.disabled = false;
    }
  }

  /**
   * Lock vault with confirmation
   */
  async lockVault() {
    try {
      const confirmed = confirm('🔒 Are you sure you want to lock your vault?\n\nYou will need to enter your passphrase to unlock it again.');
      if (!confirmed) return;
      
      console.log('🔒 Locking vault...');
      
      if (window.emmaWebVault && window.emmaWebVault.lockVault) {
        await window.emmaWebVault.lockVault();
        this.showToast('🔒 Vault locked successfully', 'success');
        
        // Close control panel and redirect to index
        this.closeControlPanel();
        setTimeout(() => {
          window.location.href = '../index.html';
        }, 1000);
      } else {
        throw new Error('Vault lock functionality not available');
      }
      
    } catch (error) {
      console.error('❌ Failed to lock vault:', error);
      this.showToast('❌ Failed to lock vault: ' + error.message, 'error');
    }
  }

  /**
   * Show detailed vault statistics
   */
  showVaultStatistics() {
    // TODO: Implement detailed statistics modal
    this.showToast('📊 Detailed statistics coming soon!', 'info');
  }

  /**
   * Close the control panel
   */
  closeControlPanel() {
    const modal = document.getElementById('vaultControlModal');
    if (modal) {
      modal.style.opacity = '0';
      modal.querySelector('div').style.transform = 'scale(0.9)';
      setTimeout(() => {
        modal.remove();
        this.isOpen = false;
      }, 300);
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? 'rgba(16, 185, 129, 0.9)' : type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(59, 130, 246, 0.9)'};
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      font-weight: 600;
      z-index: 10001;
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.2);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: 300px;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
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
  console.log('🛡️ Emma Vault Control Panel ready');
} else {
  console.log('✅ Using existing Vault Control Panel instance');
}

// Global access for debugging
window.openVaultControlPanel = () => window.emmaVaultControlPanel.openControlPanel();
