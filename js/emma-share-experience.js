/**
 * Emma Share Experience - Universal Share Modal
 * CTO-approved implementation following Emma's premium design principles
 */

console.log('🔗 CACHE BUST DEBUG: emma-share-experience.js LOADED at', new Date().toISOString());

class EmmaShareExperience extends ExperiencePopup {
  constructor(position, settings = {}) {
    super(position, settings);
    
    // Share-specific properties
    this.activeTab = 'share-out'; // 'share-out' or 'shared-with-me'
    this.webglOrb = null;
    this.currentShares = [];
    this.sharedWithMe = [];
    
    // UI Elements
    this.tabButtons = {};
    this.tabContents = {};
    
    // Initialize QR service with bulletproof error handling
    try {
      // Check if QR generator is available
      if (typeof EmmaQRGenerator === 'undefined') {
        throw new Error('EmmaQRGenerator not loaded');
      }
      
      this.qrService = new QRService();
      console.log('🔗 QR Service initialized successfully with bulletproof generator');
    } catch (error) {
      console.error('🔗 QR Service initialization failed:', error);
      this.qrService = null;
      
      // Create minimal fallback service
      this.qrService = {
        generateQR: this.createMinimalQR.bind(this),
        getActiveShares: () => [],
        revokeShare: () => false,
        downloadQR: () => false,
        copyToClipboard: () => false
      };
      console.log('🔗 Using minimal fallback QR service');
    }
    
    console.log('🔗 Emma Share Experience initialized');
  }

  getTitle() {
    return ''; // No title - clean header following voice capture pattern
  }

  async initialize() {
    this.initializeEmmaOrb();
    this.setupShareInterface();
    this.setupKeyboardShortcuts();
    this.loadSharedContent();
    this.enableFocusMode();
    this.startPeriodicCleanup();
  }

  initializeEmmaOrb() {
    try {
      const orbContainer = document.getElementById('share-emma-orb');
      if (!orbContainer) {
        console.warn('🔗 Share Emma orb container not found');
        return;
      }
      
      if (window.EmmaOrb) {
        // Create WebGL Emma Orb for share interface
        this.webglOrb = new window.EmmaOrb(orbContainer, {
          hue: 200, // Blue-ish for sharing theme
          hoverIntensity: 0.3,
          rotateOnHover: true,
          forceHoverState: false
        });
        console.log('🔗 Share Emma Orb initialized successfully');
      } else {
        console.warn('🔗 EmmaOrb class not available, using fallback');
        // Fallback gradient
        orbContainer.style.background = 'radial-gradient(circle at 30% 30%, #4dabf7, #339af0, #74c0fc)';
        orbContainer.style.borderRadius = '50%';
        orbContainer.style.width = '100%';
        orbContainer.style.height = '100%';
      }
    } catch (error) {
      console.error('🚨 Error initializing Share Emma Orb:', error);
    }
  }

  renderContent(contentElement) {
    contentElement.innerHTML = `
      <div class="emma-share-studio">
        <!-- Emma WebGL Orb Anchor -->
        <div class="emma-anchor">
          <div class="webgl-orb-container" id="share-emma-orb"></div>
          <p class="emma-hint" id="share-emma-hint">Share memories and connect with loved ones</p>
        </div>

        <!-- Tab Navigation -->
        <div class="share-tabs">
          <button class="share-tab active" data-tab="share-out" id="tab-share-out">
            <span class="tab-icon">📤</span>
            <span class="tab-label">Share Out</span>
          </button>
          <button class="share-tab" data-tab="shared-with-me" id="tab-shared-with-me">
            <span class="tab-icon">📥</span>
            <span class="tab-label">Shared With Me</span>
          </button>
        </div>

        <!-- Tab Contents -->
        <div class="share-content">
          <!-- Share Out Tab -->
          <div class="tab-content active" id="content-share-out">
            <div class="share-section">
              <h3 class="section-title">Create New Share</h3>
              <div class="share-options">
                <button class="share-option" data-type="vault-access">
                  <div class="option-icon">🔒</div>
                  <div class="option-content">
                    <div class="option-title">Vault Access</div>
                    <div class="option-subtitle">Share your memory vault</div>
                  </div>
                </button>
                <button class="share-option" data-type="memory-share">
                  <div class="option-icon">💝</div>
                  <div class="option-content">
                    <div class="option-title">Memory Share</div>
                    <div class="option-subtitle">Share specific memories</div>
                  </div>
                </button>
                <button class="share-option" data-type="profile-connect">
                  <div class="option-icon">👥</div>
                  <div class="option-content">
                    <div class="option-title">Profile Connect</div>
                    <div class="option-subtitle">Connect Emma profiles</div>
                  </div>
                </button>
              </div>
            </div>

            <div class="share-section" id="active-shares-section">
              <div class="section-header">
                <h3 class="section-title">Active Shares</h3>
                <button class="refresh-btn" id="refresh-shares" title="Refresh shares">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                    <path d="M21 3v5h-5"/>
                    <path d="M11 12a1 1 0 1 0 2 0a1 1 0 0 0-2 0"/>
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                    <path d="M3 21v-5h5"/>
                  </svg>
                </button>
              </div>
              <div class="shares-container" id="shares-container">
                <div class="empty-state">
                  <div class="empty-icon">📤</div>
                  <div class="empty-text">No active shares yet</div>
                  <div class="empty-subtitle">Create a share to get started</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Shared With Me Tab -->
          <div class="tab-content" id="content-shared-with-me">
            <div class="share-section">
              <div class="section-header">
                <h3 class="section-title">Content Shared With You</h3>
                <button class="scan-btn" id="scan-qr" title="Scan QR code">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                </button>
              </div>
              <div class="shared-container" id="shared-container">
                <div class="empty-state">
                  <div class="empty-icon">📥</div>
                  <div class="empty-text">No shared content yet</div>
                  <div class="empty-subtitle">Scan a QR code to access shared memories</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- QR Generation Modal -->
        <div class="qr-modal" id="qr-modal" style="display: none;">
          <div class="qr-modal-content">
            <div class="qr-header">
              <h3 id="qr-title">Share QR Code</h3>
              <button class="qr-close" id="qr-close">✕</button>
            </div>
            <div class="qr-body">
              <div class="qr-display">
                <div class="qr-container" id="qr-container"></div>
                <div class="qr-info">
                  <div class="qr-share-title" id="qr-share-title">Vault Access</div>
                  <div class="qr-share-subtitle" id="qr-share-subtitle">Read-only access</div>
                </div>
              </div>
              <div class="qr-actions">
                <button class="qr-action-btn" id="qr-download">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download
                </button>
                <button class="qr-action-btn" id="qr-copy">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  setupShareInterface() {
    // Tab switching
    this.tabButtons.shareOut = document.getElementById('tab-share-out');
    this.tabButtons.sharedWithMe = document.getElementById('tab-shared-with-me');
    this.tabContents.shareOut = document.getElementById('content-share-out');
    this.tabContents.sharedWithMe = document.getElementById('content-shared-with-me');

    // Add tab click handlers
    Object.values(this.tabButtons).forEach(button => {
      button.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Share option handlers
    document.querySelectorAll('.share-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const type = e.currentTarget.dataset.type;
        this.createShare(type);
      });
    });

    // Refresh button
    document.getElementById('refresh-shares').addEventListener('click', () => {
      this.refreshShares();
    });

    // QR modal handlers
    document.getElementById('qr-close').addEventListener('click', () => {
      this.closeQRModal();
    });

    // QR modal background click
    document.getElementById('qr-modal').addEventListener('click', (e) => {
      if (e.target.id === 'qr-modal') {
        this.closeQRModal();
      }
    });

    this.loadActiveShares();
  }

  setupKeyboardShortcuts() {
    this.keyboardHandler = (e) => {
      if (!this.isVisible || !this.element) return;
      
      // Escape to close
      if (e.code === 'Escape') {
        // Close QR modal first if open
        const qrModal = document.getElementById('qr-modal');
        if (qrModal.style.display !== 'none') {
          this.closeQRModal();
          return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        this.close();
        return;
      }
      
      // Tab switching with numbers
      if (e.code === 'Digit1') {
        e.preventDefault();
        this.switchTab('share-out');
      } else if (e.code === 'Digit2') {
        e.preventDefault();
        this.switchTab('shared-with-me');
      }
    };
    
    document.addEventListener('keydown', this.keyboardHandler, true);
  }

  switchTab(tabName) {
    // Update active tab
    this.activeTab = tabName;
    
    // Update tab buttons
    Object.entries(this.tabButtons).forEach(([key, button]) => {
      button.classList.toggle('active', button.dataset.tab === tabName);
    });
    
    // Update tab contents
    Object.entries(this.tabContents).forEach(([key, content]) => {
      content.classList.toggle('active', content.id.includes(tabName));
    });
    
    // Update Emma orb color based on tab
    if (this.webglOrb && this.webglOrb.options) {
      const hue = tabName === 'share-out' ? 200 : 260; // Blue for sharing, purple for receiving
      this.webglOrb.options.hue = hue;
    }
    
    // Load tab-specific content
    if (tabName === 'shared-with-me') {
      this.loadSharedWithMe();
    }
  }

  async createShare(type) {
    try {
      // Check if QR service is available
      if (!this.qrService) {
        this.showToast('QR service unavailable. Please refresh and try again.', 'error');
        return;
      }

      let shareData = {};
      let options = {};

      // Get share data based on type
      switch (type) {
        case 'vault-access':
          const permissions = await this.showPermissionDialog();
          if (!permissions) return; // User cancelled
          
          shareData = { vaultId: 'default' };
          options = { 
            permissions: permissions.level,
            expires: permissions.expires 
          };
          break;

        case 'memory-share':
          const memories = await this.selectMemories();
          if (!memories || memories.length === 0) return;
          
          shareData = { memories: memories };
          options = { expires: Date.now() + 7 * 24 * 60 * 60 * 1000 }; // 7 days
          break;

        case 'profile-connect':
          shareData = { 
            profileId: 'user',
            name: 'Emma User' // Could get from user profile
          };
          options = { permissions: 'connect' };
          break;
      }

      // Generate QR code
      const qrResult = await this.qrService.generateQR(type, shareData, options);
      
      // Show QR modal
      this.showQRModal(qrResult);
      
      // Refresh active shares
      this.loadActiveShares();
      
    } catch (error) {
      console.error('🔗 Share creation failed:', error);
      this.showToast('Failed to create share. Please try again.', 'error');
    }
  }

  async showPermissionDialog() {
    return new Promise((resolve) => {
      // Simple permission dialog for now
      const permissions = ['read-only', 'read-write', 'admin'];
      const expires = [
        { label: '1 hour', value: Date.now() + 60 * 60 * 1000 },
        { label: '1 day', value: Date.now() + 24 * 60 * 60 * 1000 },
        { label: '1 week', value: Date.now() + 7 * 24 * 60 * 60 * 1000 },
        { label: 'Never', value: null }
      ];

      // For demo, return default permissions
      resolve({
        level: 'read-only',
        expires: expires[1].value // 1 day
      });
    });
  }

  async selectMemories() {
    // For demo, return some sample memories
    return [
      { id: 'mem1', title: 'Family Dinner', type: 'photo' },
      { id: 'mem2', title: 'Vacation Trip', type: 'collection' }
    ];
  }

  showQRModal(qrResult) {
    const modal = document.getElementById('qr-modal');
    const title = document.getElementById('qr-title');
    const container = document.getElementById('qr-container');
    const shareTitle = document.getElementById('qr-share-title');
    const shareSubtitle = document.getElementById('qr-share-subtitle');

    // Update modal content
    title.textContent = qrResult.displayData.title;
    shareTitle.textContent = qrResult.displayData.title;
    shareSubtitle.textContent = qrResult.displayData.subtitle;

    // Display QR code
    container.innerHTML = `<img src="${qrResult.dataURL}" alt="QR Code" class="qr-image" />`;

    // Setup action buttons
    document.getElementById('qr-download').onclick = () => {
      this.qrService.downloadQR(qrResult.id, `emma-${qrResult.type}-${Date.now()}.png`);
    };

    document.getElementById('qr-copy').onclick = async () => {
      const success = await this.qrService.copyToClipboard(qrResult.id);
      this.showToast(success ? 'Copied to clipboard!' : 'Failed to copy', success ? 'success' : 'error');
    };

    // Show modal
    modal.style.display = 'flex';
    
    // Store current QR for later reference
    this.currentQR = qrResult;
  }

  closeQRModal() {
    const modal = document.getElementById('qr-modal');
    modal.style.display = 'none';
    this.currentQR = null;
  }

  loadActiveShares() {
    const shares = this.qrService.getActiveShares();
    const container = document.getElementById('shares-container');
    
    if (shares.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📤</div>
          <div class="empty-text">No active shares yet</div>
          <div class="empty-subtitle">Create a share to get started</div>
        </div>
      `;
      return;
    }

    container.innerHTML = shares.map(share => `
      <div class="share-item" data-share-id="${share.id}">
        <div class="share-icon">${share.displayData.icon}</div>
        <div class="share-info">
          <div class="share-title">${share.displayData.title}</div>
          <div class="share-subtitle">${share.displayData.subtitle}</div>
          <div class="share-meta">
            Created ${this.formatDate(share.metadata.created)} • 
            ${share.metadata.expires ? `Expires ${this.qrService.formatExpiry(share.metadata.expires)}` : 'No expiry'}
          </div>
        </div>
        <div class="share-actions">
          <button class="share-action" onclick="window.shareExperience.viewQR('${share.id}')" title="View QR">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
          </button>
          <button class="share-action danger" onclick="window.shareExperience.revokeShare('${share.id}')" title="Revoke">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  viewQR(shareId) {
    const share = this.qrService.activeShares.get(shareId);
    if (share) {
      this.showQRModal(share);
    }
  }

  revokeShare(shareId) {
    if (confirm('Are you sure you want to revoke this share? This action cannot be undone.')) {
      const success = this.qrService.revokeShare(shareId);
      if (success) {
        this.showToast('Share revoked successfully', 'success');
        this.loadActiveShares();
      } else {
        this.showToast('Failed to revoke share', 'error');
      }
    }
  }

  loadSharedWithMe() {
    // For demo, show placeholder content
    const container = document.getElementById('shared-container');
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📥</div>
        <div class="empty-text">No shared content yet</div>
        <div class="empty-subtitle">Scan a QR code to access shared memories</div>
      </div>
    `;
  }

  loadSharedContent() {
    // Load any existing shared content
    this.loadActiveShares();
    if (this.activeTab === 'shared-with-me') {
      this.loadSharedWithMe();
    }
  }

  refreshShares() {
    this.qrService.clearExpired();
    this.loadActiveShares();
    this.showToast('Shares refreshed', 'success');
  }

  startPeriodicCleanup() {
    // Clean up expired shares every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.qrService.clearExpired();
    }, 5 * 60 * 1000);
  }

  enableFocusMode() {
    document.body.classList.add('share-focus');
  }

  disableFocusMode() {
    document.body.classList.remove('share-focus');
  }

  formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString();
  }

  showToast(message, type = 'info') {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      background: ${type === 'error' ? 'rgba(244, 67, 54, 0.9)' : type === 'success' ? 'rgba(76, 175, 80, 0.9)' : 'rgba(33, 150, 243, 0.9)'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      animation: slideInRight 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, 3000);
  }

  /**
   * Minimal QR creation for ultimate fallback
   */
  async createMinimalQR(type, data, options = {}) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 256;
    canvas.height = 256;
    
    // Emma gradient background
    const gradient = ctx.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(0.5, '#764ba2');
    gradient.addColorStop(1, '#f093fb');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    
    // Content area
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(30, 30, 196, 196);
    
    // Title
    ctx.fillStyle = '#764ba2';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('EMMA SHARE', 128, 80);
    
    // Type
    const typeMap = {
      'vault-access': '🔒 Vault Access',
      'memory-share': '💝 Memory Share',
      'profile-connect': '👥 Profile Connect'
    };
    
    ctx.font = '16px Arial';
    ctx.fillText(typeMap[type] || 'Share', 128, 110);
    
    // Instructions
    ctx.font = '12px Arial';
    ctx.fillText('Show this code to', 128, 140);
    ctx.fillText('connect with Emma', 128, 155);
    
    // Share ID
    const shareId = 'ID: ' + Date.now().toString().slice(-6);
    ctx.font = '10px Arial';
    ctx.fillText(shareId, 128, 200);
    
    return {
      id: 'minimal_' + Date.now(),
      type: type,
      dataURL: canvas.toDataURL(),
      content: JSON.stringify({ type, data, id: shareId }),
      displayData: {
        title: typeMap[type] || 'Share',
        subtitle: 'Minimal share code',
        icon: type === 'vault-access' ? '🔒' : type === 'memory-share' ? '💝' : '👥'
      },
      metadata: {
        created: Date.now(),
        expires: options.expires || null,
        permissions: options.permissions || 'read-only',
        description: 'Emergency fallback share'
      }
    };
  }

  cleanup() {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Remove keyboard shortcuts listener
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler, true);
      this.keyboardHandler = null;
    }
    
    // Clean up WebGL orb
    if (this.webglOrb && this.webglOrb.dispose) {
      this.webglOrb.dispose();
      this.webglOrb = null;
    }
    
    // Disable focus mode
    this.disableFocusMode();
    
    super.cleanup();
  }
}

// Export for use in other modules
window.EmmaShareExperience = EmmaShareExperience;
window.shareExperience = null; // Global reference for share actions

console.log('🔗 Emma Share Experience: Module loaded successfully');
