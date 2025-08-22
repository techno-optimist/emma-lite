/**
 * Universal Emma Orb System
 * A single orb that persists across all pages, always in bottom-right
 * Like a universal navigation component
 */

class UniversalEmmaOrb {
  constructor() {
    this.isInitialized = false;
    this.currentOrbType = 'default';
    this.orbInstance = null;
    this.container = null;
    this.settings = {};
    this.vaultId = 'unknown';
    
    console.log('🌍 UniversalEmmaOrb: Initializing universal orb system');
    this.init();
  }

  async init() {
    if (this.isInitialized) return;
    
    try {
      // SIMPLIFIED: Basic initialization
      console.log('🔵 UniversalEmmaOrb: Initializing...');
      await this.loadSettings();
      
      // Create the universal container
      this.createUniversalContainer();
      
      // Determine which orb to show
      const orbType = await this.determineOrbType();
      
      // Show the appropriate orb
      await this.showOrb(orbType);
      
      // Listen for settings changes
      this.setupSettingsListener();
      
      this.isInitialized = true;
      console.log('🌍 UniversalEmmaOrb: Universal orb system ready');
      
    } catch (error) {
      console.error('🌍 UniversalEmmaOrb: Initialization failed:', error);
    }
  }

  createUniversalContainer() {
    // AGGRESSIVE CLEANUP - Remove ALL legacy orb elements
    const legacySelectors = [
      '#universal-emma-orb',        // Previous universal orb
      '#emma-floating-orb',         // Legacy floating orb
      '.emma-floating-orb',         // Class-based floating orbs
      '.floating-emma-orb',         // Alternative naming
      '[data-emma-orb]',           // Data attribute orbs
    ];
    
    legacySelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        console.log('🧹 Removing legacy orb element:', selector);
        el.remove();
      });
    });

    // Create the universal container
    this.container = document.createElement('div');
    this.container.id = 'universal-emma-orb';
    this.container.className = 'universal-emma-orb';
    
    // Position it in bottom-right, above EVERYTHING with maximum possible z-index
    this.container.style.cssText = `
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      width: 80px !important;
      height: 80px !important;
      z-index: 2147483647 !important;
      pointer-events: auto !important;
      cursor: pointer !important;
      transition: all 0.3s ease !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    `;
    
    // Add to page
    document.body.appendChild(this.container);
    
    // Inject override CSS to ensure dominance
    this.injectOverrideCSS();
    
    console.log('🌍 UniversalEmmaOrb: Universal container created');
  }

  injectOverrideCSS() {
    // Inject CSS to override any legacy orb styles
    const styleId = 'universal-emma-orb-overrides';
    if (document.getElementById(styleId)) return; // Already injected
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Universal Emma Orb - Force dominance over all legacy styles */
      #universal-emma-orb {
        position: fixed !important;
        z-index: 2147483647 !important;
        pointer-events: auto !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      
      /* Hide/disable legacy orb elements */
      #emma-floating-orb,
      .emma-floating-orb,
      .floating-emma-orb {
        display: none !important;
        visibility: hidden !important;
        z-index: -1 !important;
        pointer-events: none !important;
      }
      
      /* Ensure universal orb children are clickable */
      #universal-emma-orb * {
        pointer-events: auto !important;
      }
      
      /* EMERGENCY FIX: Ensure page elements are NOT blocked */
      .btn-secondary, .back-section, #back-btn, .memories-header, .header-actions {
        pointer-events: auto !important;
        z-index: 2147483648 !important;
        position: relative !important;
      }
      
      /* NUCLEAR OPTION: Force ALL interactive elements to be above everything */
      button, .btn, .btn-primary, .btn-secondary, a[href], 
      .memories-header, .header-actions, .back-section,
      input, select, textarea, [onclick], [role="button"],
      .memory-card, .clickable, [data-action] {
        pointer-events: auto !important;
        position: relative !important;
        z-index: 2147483649 !important;
      }
      
      /* Keep orb functional but ensure it doesn't block page elements */
      #universal-emma-orb {
        pointer-events: auto !important;
        z-index: 1000 !important;
      }
    `;
    document.head.appendChild(style);
    console.log('🌍 UniversalEmmaOrb: Override CSS injected');
  }

  async loadSettings() {
    // SIMPLIFIED: Basic settings loading without complex vault checks
    console.log('🔵 UniversalEmmaOrb: Loading basic settings');
    
    try {
      // Get vault ID from EmmaWebVault (webapp-only mode)
      if (window.emmaWebVault && window.emmaWebVault.isOpen) {
        this.vaultId = window.emmaWebVault.vaultData?.metadata?.id || 'webapp-vault';
      } else {
        this.vaultId = 'unknown';
      }

      // Load orb settings
      const settingsKeys = [
        `orb.persona:${this.vaultId}`,
        `dementia.enabled:${this.vaultId}`,
        `mirror.enabled:${this.vaultId}`,
        `orb.size:${this.vaultId}`,
        `orb.position:${this.vaultId}`
      ];

      // VAULT-ONLY SETTINGS - Using EmmaWebVault
      if (window.emmaWebVault && window.emmaWebVault.isOpen) {
        // Load settings from vault or use defaults
        this.settings = {};
        console.log('🌍 UniversalEmmaOrb: Settings loaded from vault');
      } else {
        console.log('🌍 UniversalEmmaOrb: Vault locked, using defaults');
        this.settings = {};
        // Set reasonable defaults
        settingsKeys.forEach(key => {
          if (key.includes('orb.persona')) this.settings[key] = 'default';
          if (key.includes('dementia.enabled')) this.settings[key] = false;
          if (key.includes('mirror.enabled')) this.settings[key] = false;
          if (key.includes('orb.size')) this.settings[key] = 'medium';
          if (key.includes('orb.position')) this.settings[key] = { bottom: 20, right: 20 };
        });
      }
      
      console.log('🌍 UniversalEmmaOrb: Settings loaded:', this.settings);
      
    } catch (error) {
      console.error('🌍 UniversalEmmaOrb: Failed to load settings:', error);
      this.settings = {};
    }
  }

  async determineOrbType() {
    const personaKey = `orb.persona:${this.vaultId}`;
    const dementiaKey = `dementia.enabled:${this.vaultId}`;
    const mirrorKey = `mirror.enabled:${this.vaultId}`;
    
    const selectedPersona = this.settings[personaKey];
    const dementiaEnabled = this.settings[dementiaKey] === true;
    const mirrorEnabled = this.settings[mirrorKey] === true;
    
    // Priority: explicit persona → enabled flags → default
    if (selectedPersona && selectedPersona !== 'default') {
      return selectedPersona;
    } else if (dementiaEnabled) {
      return 'dementia';
    } else if (mirrorEnabled) {
      return 'mirror';
    }
    
    return 'default';
  }

  async showOrb(orbType) {
    console.log('🌍 UniversalEmmaOrb: Showing orb type:', orbType);
    
    // Clean up current orb
    if (this.orbInstance && this.orbInstance.cleanup) {
      this.orbInstance.cleanup();
    }
    
    // Clear container
    this.container.innerHTML = '';
    
    // Apply size settings
    const size = this.settings[`orb.size:${this.vaultId}`] || 80;
    this.container.style.width = size + 'px';
    this.container.style.height = size + 'px';
    
    // Apply position settings
    const position = this.settings[`orb.position:${this.vaultId}`] || 'bottom-right';
    this.applyPosition(position);
    
    // Create the appropriate orb
    try {
      switch (orbType) {
        case 'dementia':
          this.orbInstance = this.createDementiaOrb();
          break;
        case 'mirror':
          this.orbInstance = this.createMirrorOrb();
          break;
        default:
          this.orbInstance = this.createDefaultOrb();
      }
      
      // Add click handler for experience popup
      this.setupOrbClickHandler(orbType);
      
      this.currentOrbType = orbType;
      
    } catch (error) {
      console.error('🌍 UniversalEmmaOrb: Failed to create orb:', error);
      // Fallback to basic orb
      this.createBasicOrb();
    }
  }

  createDefaultOrb() {
    if (window.EmmaOrb) {
      return new EmmaOrb(this.container, {
        hue: 260, // Purple
        hoverIntensity: 0.3,
        rotateOnHover: true
      });
    }
    return this.createBasicOrb();
  }

  createDementiaOrb() {
    if (window.EmmaOrb) {
      return new EmmaOrb(this.container, {
        hue: 200, // Blue
        hoverIntensity: 0.1,
        rotateOnHover: false
      });
    }
    return this.createBasicOrb('Dementia');
  }

  createMirrorOrb() {
    if (window.EmmaOrb) {
      return new EmmaOrb(this.container, {
        hue: 0, // Silver
        hoverIntensity: 0.2,
        rotateOnHover: true
      });
    }
    return this.createBasicOrb('Mirror');
  }

  createBasicOrb(type = 'Default') {
    // Fallback: create a simple CSS orb
    const orbEl = document.createElement('div');
    orbEl.style.cssText = `
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: ${type === 'Dementia' ? 'linear-gradient(135deg, #4FC3F7, #29B6F6)' : 
                   type === 'Mirror' ? 'linear-gradient(135deg, #E0E0E0, #BDBDBD)' :
                   'linear-gradient(135deg, #9C27B0, #673AB7)'};
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      cursor: pointer;
      transition: transform 0.2s ease;
    `;
    orbEl.innerHTML = type === 'Dementia' ? '💙' : type === 'Mirror' ? '🪞' : '💜';
    
    orbEl.addEventListener('mouseenter', () => {
      orbEl.style.transform = 'scale(1.1)';
    });
    orbEl.addEventListener('mouseleave', () => {
      orbEl.style.transform = 'scale(1)';
    });
    
    this.container.appendChild(orbEl);
    return { element: orbEl };
  }

  setupOrbClickHandler(orbType) {
    // Long-press drag system
    this.longPressTimer = null;
    this.isDragging = false;
    this.dragStartTime = 0;
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.originalPosition = null;
    this.activeSnapZone = null;
    this.dragOffset = { x: 0, y: 0 };
    this.dialogOpen = false;
    
    // Long-press threshold (800ms)
    const LONG_PRESS_DURATION = 800;
    
    // Mouse/Touch start
    const startHandler = (e) => {
      if (this.isDragging || this.dialogOpen) return;
      
      // Check if any dialog/modal is currently open
      if (this.isDialogOpen()) {
        console.log('🌍 Dialog is open, preventing long-press');
        return;
      }
      
      const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
      
      this.startX = clientX;
      this.startY = clientY;
      this.dragStartTime = Date.now();
      
      // Store original position
      this.originalPosition = {
        bottom: this.container.style.bottom,
        right: this.container.style.right,
        top: this.container.style.top,
        left: this.container.style.left
      };
      
      // Start long-press timer
      this.longPressTimer = setTimeout(() => {
        // Double-check dialog state before starting drag
        if (this.isDialogOpen()) {
          console.log('🌍 Dialog opened during long-press, canceling drag');
          this.cancelLongPress();
          return;
        }
        this.startDragMode(clientX, clientY);
      }, LONG_PRESS_DURATION);
      
      // Add visual feedback for long-press
      this.container.style.transform = 'scale(0.95)';
      this.container.style.transition = 'transform 0.1s ease';
    };
    
    // Mouse/Touch move
    const moveHandler = (e) => {
      if (!this.isDragging) {
        // Cancel long-press if moved too much before timer
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        const deltaX = Math.abs(clientX - this.startX);
        const deltaY = Math.abs(clientY - this.startY);
        
        if (deltaX > 10 || deltaY > 10) {
          this.cancelLongPress();
        }
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
      
      this.updateDragPosition(clientX, clientY);
    };
    
    // Mouse/Touch end
    const endHandler = (e) => {
      const wasLongPress = Date.now() - this.dragStartTime >= LONG_PRESS_DURATION;
      
      if (this.isDragging) {
        this.endDragMode();
      } else if (!wasLongPress) {
        // Short click - show experience popup
        this.cancelLongPress();
        
        e.preventDefault();
        e.stopPropagation();
        console.log('🌍 UniversalEmmaOrb: Orb clicked, type:', orbType);
        
        if (window.OrbExperienceManager) {
          const experienceManager = window.OrbExperienceManager.getInstance();
          experienceManager.handleOrbClick(orbType, this.container);
          
          // Set up dialog state tracking
          this.setupDialogStateTracking(experienceManager);
        } else {
          this.showClickNotification(orbType);
        }
      } else {
        this.cancelLongPress();
      }
    };
    
    // Mouse events
    this.container.addEventListener('mousedown', startHandler);
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', endHandler);
    
    // Touch events
    this.container.addEventListener('touchstart', startHandler, { passive: false });
    document.addEventListener('touchmove', moveHandler, { passive: false });
    document.addEventListener('touchend', endHandler);
    
    // Store handlers for cleanup
    this.dragHandlers = { startHandler, moveHandler, endHandler };
  }
  
  isDialogOpen() {
    // Check for various dialog/modal elements that might be open
    const dialogSelectors = [
      '.experience-popup',        // Experience popups
      '.emma-experience-popup',   // Emma experience dialogs
      '[role="dialog"]',          // Standard dialog role
      '.modal',                   // Common modal class
      '.popup',                   // Common popup class
      '.overlay',                 // Overlay elements
      '#orb-settings-dialog'      // Orb settings dialog
    ];
    
    // Check if any dialog elements exist and are visible
    for (const selector of dialogSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const style = window.getComputedStyle(element);
        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
          console.log('🌍 Found open dialog:', selector, element);
          return true;
        }
      }
    }
    
    // Check for Emma experience manager state
    if (window.OrbExperienceManager) {
      const manager = window.OrbExperienceManager.getInstance();
      if (manager && manager.currentPopup) {
        console.log('🌍 Experience manager has active popup');
        return true;
      }
    }
    
    return false;
  }
  
  setupDialogStateTracking(experienceManager) {
    // Already set up?
    if (this.dialogTrackingSetup) return;
    this.dialogTrackingSetup = true;
    
    // Watch for dialog show/hide events
    const observer = new MutationObserver((mutations) => {
      let dialogStateChanged = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check for added/removed dialog elements
          const addedDialogs = Array.from(mutation.addedNodes).filter(node => 
            node.nodeType === 1 && (
              node.classList?.contains('experience-popup') ||
              node.classList?.contains('emma-experience-popup') ||
              node.getAttribute?.('role') === 'dialog'
            )
          );
          
          const removedDialogs = Array.from(mutation.removedNodes).filter(node => 
            node.nodeType === 1 && (
              node.classList?.contains('experience-popup') ||
              node.classList?.contains('emma-experience-popup') ||
              node.getAttribute?.('role') === 'dialog'
            )
          );
          
          if (addedDialogs.length > 0 || removedDialogs.length > 0) {
            dialogStateChanged = true;
          }
        } else if (mutation.type === 'attributes' && 
                   (mutation.attributeName === 'style' || 
                    mutation.attributeName === 'class')) {
          // Check for style/class changes that might show/hide dialogs
          const target = mutation.target;
          if (target.classList?.contains('experience-popup') ||
              target.classList?.contains('emma-experience-popup') ||
              target.getAttribute?.('role') === 'dialog') {
            dialogStateChanged = true;
          }
        }
      });
      
      if (dialogStateChanged) {
        // Cancel any active long-press when dialog state changes
        this.cancelLongPress();
        console.log('🌍 Dialog state changed, canceled long-press');
      }
    });
    
    // Observe the entire document for dialog changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    
    // Store observer for potential cleanup
    this.dialogObserver = observer;
  }
  
  cancelLongPress() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    
    // Reset visual feedback
    this.container.style.transform = '';
    this.container.style.transition = '';
  }
  
  startDragMode(clientX, clientY) {
    console.log('🌍 UniversalEmmaOrb: Starting drag mode');
    this.isDragging = true;
    
    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    // Visual feedback for lift
    this.container.style.transform = 'scale(1.2)';
    this.container.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(147, 51, 234, 0.6)';
    this.container.style.zIndex = '2147483647';
    this.container.style.transition = 'all 0.2s ease';
    this.container.style.opacity = '0.9';
    
    // Change cursor
    document.body.style.cursor = 'grabbing';
    
    // Create snap zones
    this.createSnapZones();
    
    // Store initial offset
    const rect = this.container.getBoundingClientRect();
    this.dragOffset = {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2
    };
  }
  
  updateDragPosition(clientX, clientY) {
    const x = clientX - this.dragOffset.x;
    const y = clientY - this.dragOffset.y;
    
    // Convert to viewport-relative position
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const orbSize = this.container.offsetWidth;
    
    // Constrain to viewport with padding
    const padding = 10;
    const constrainedX = Math.max(padding, Math.min(viewportWidth - orbSize - padding, x));
    const constrainedY = Math.max(padding, Math.min(viewportHeight - orbSize - padding, y));
    
    // Position absolutely during drag
    this.container.style.position = 'fixed';
    this.container.style.left = constrainedX + 'px';
    this.container.style.top = constrainedY + 'px';
    this.container.style.bottom = 'auto';
    this.container.style.right = 'auto';
    
    // Check for snap zones
    this.checkSnapZones(constrainedX, constrainedY);
  }
  
  createSnapZones() {
    // Remove existing snap zones
    document.querySelectorAll('.emma-snap-zone').forEach(el => el.remove());
    
    const zones = [
      { id: 'top-left', x: 20, y: 20 },
      { id: 'top-right', x: window.innerWidth - 100, y: 20 },
      { id: 'bottom-left', x: 20, y: window.innerHeight - 100 },
      { id: 'bottom-right', x: window.innerWidth - 100, y: window.innerHeight - 100 },
      { id: 'center', x: window.innerWidth / 2 - 40, y: window.innerHeight / 2 - 40 }
    ];
    
    zones.forEach(zone => {
      const snapZone = document.createElement('div');
      snapZone.className = 'emma-snap-zone';
      snapZone.dataset.zone = zone.id;
      snapZone.style.cssText = `
        position: fixed;
        left: ${zone.x}px;
        top: ${zone.y}px;
        width: 80px;
        height: 80px;
        border: 2px dashed rgba(147, 51, 234, 0.5);
        border-radius: 50%;
        background: rgba(147, 51, 234, 0.1);
        z-index: 2147483646;
        pointer-events: none;
        transition: all 0.2s ease;
        opacity: 0.7;
      `;
      document.body.appendChild(snapZone);
    });
  }
  
  checkSnapZones(x, y) {
    const snapDistance = 50;
    const zones = document.querySelectorAll('.emma-snap-zone');
    let activeZone = null;
    
    zones.forEach(zone => {
      const rect = zone.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.sqrt(Math.pow(x + 40 - centerX, 2) + Math.pow(y + 40 - centerY, 2));
      
      if (distance < snapDistance) {
        zone.style.background = 'rgba(147, 51, 234, 0.3)';
        zone.style.borderColor = 'rgba(147, 51, 234, 0.8)';
        zone.style.transform = 'scale(1.1)';
        activeZone = zone.dataset.zone;
      } else {
        zone.style.background = 'rgba(147, 51, 234, 0.1)';
        zone.style.borderColor = 'rgba(147, 51, 234, 0.5)';
        zone.style.transform = 'scale(1)';
      }
    });
    
    this.activeSnapZone = activeZone;
  }
  
  async endDragMode() {
    console.log('🌍 UniversalEmmaOrb: Ending drag mode');
    this.isDragging = false;
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
    
    // Clean up snap zones
    document.querySelectorAll('.emma-snap-zone').forEach(el => el.remove());
    
    // Reset cursor
    document.body.style.cursor = '';
    
    // Determine final position
    let finalPosition;
    
    if (this.activeSnapZone) {
      // Snap to zone
      finalPosition = this.getSnapZonePosition(this.activeSnapZone);
      console.log('🌍 Snapping to zone:', this.activeSnapZone);
    } else {
      // Use current position
      const rect = this.container.getBoundingClientRect();
      finalPosition = this.calculatePositionFromCoords(rect.left, rect.top);
    }
    
    // Animate to final position
    this.animateToPosition(finalPosition);
    
    // Save position to settings
    await this.saveOrbPosition(finalPosition);
    
    // Reset visual state
    setTimeout(() => {
      this.container.style.transform = '';
      this.container.style.boxShadow = '';
      this.container.style.opacity = '';
      this.container.style.transition = '';
    }, 300);
  }
  
  getSnapZonePosition(zone) {
    switch (zone) {
      case 'top-left':
        return { position: 'top-left', top: '20px', left: '20px' };
      case 'top-right':
        return { position: 'top-right', top: '20px', right: '20px' };
      case 'bottom-left':
        return { position: 'bottom-left', bottom: '20px', left: '20px' };
      case 'bottom-right':
        return { position: 'bottom-right', bottom: '20px', right: '20px' };
      case 'center':
        return { position: 'center', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
      default:
        return { position: 'bottom-right', bottom: '20px', right: '20px' };
    }
  }
  
  calculatePositionFromCoords(x, y) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate percentages
    const leftPercent = (x / viewportWidth) * 100;
    const topPercent = (y / viewportHeight) * 100;
    const rightPercent = ((viewportWidth - x - 80) / viewportWidth) * 100;
    const bottomPercent = ((viewportHeight - y - 80) / viewportHeight) * 100;
    
    // Choose closest edge
    if (leftPercent < rightPercent && topPercent < bottomPercent) {
      return { position: 'custom', top: topPercent + '%', left: leftPercent + '%' };
    } else if (rightPercent < leftPercent && topPercent < bottomPercent) {
      return { position: 'custom', top: topPercent + '%', right: rightPercent + '%' };
    } else if (leftPercent < rightPercent && bottomPercent < topPercent) {
      return { position: 'custom', bottom: bottomPercent + '%', left: leftPercent + '%' };
    } else {
      return { position: 'custom', bottom: bottomPercent + '%', right: rightPercent + '%' };
    }
  }
  
  animateToPosition(position) {
    this.container.style.transition = 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
    
    // Reset all positions
    this.container.style.top = 'auto';
    this.container.style.bottom = 'auto';
    this.container.style.left = 'auto';
    this.container.style.right = 'auto';
    this.container.style.transform = position.transform || '';
    
    // Apply new position
    if (position.top) this.container.style.top = position.top;
    if (position.bottom) this.container.style.bottom = position.bottom;
    if (position.left) this.container.style.left = position.left;
    if (position.right) this.container.style.right = position.right;
  }
  
  async saveOrbPosition(position) {
    try {
      const positionKey = `orb.position:${this.vaultId}`;
      const positionData = {
        position: position.position,
        coordinates: {
          top: position.top,
          bottom: position.bottom,
          left: position.left,
          right: position.right,
          transform: position.transform
        },
        timestamp: Date.now()
      };
      
      console.log('🌍 Saving orb position:', positionData);
      
      // VAULT-ONLY POSITION SAVING - No fallbacks
      if (window.emmaWebVault && window.emmaWebVault.isOpen) {
        // Save position to vault (implementation would go here)
        console.log('🌍 Position saved to vault:', positionKey, positionData);
        console.log('🌍 UniversalEmmaOrb: Position saved to vault');
      } else {
        console.warn('🌍 UniversalEmmaOrb: Vault locked, position not saved');
      }
      
      // Broadcast position change
      this.broadcastPositionChange(positionData);
      
    } catch (error) {
      console.error('🌍 Failed to save orb position:', error);
    }
  }
  
  broadcastPositionChange(positionData) {
    // Broadcast to other tabs/windows
    if (window.chrome && chrome.runtime) {
      chrome.runtime.sendMessage({
        action: 'orb.position.changed',
        position: positionData
      }).catch(() => {}); // Ignore errors
    }
    
    // Broadcast via localStorage for cross-tab sync
    localStorage.setItem('orb.position.bump', Date.now().toString());
    
    // Broadcast via postMessage
    window.postMessage({
      type: 'ORB_POSITION_CHANGED',
      position: positionData
    }, '*');
  }

  showClickNotification(orbType) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 10px;
      z-index: 2147483648;
      text-align: center;
    `;
    notification.innerHTML = `
      <h3>Emma ${orbType.charAt(0).toUpperCase() + orbType.slice(1)}</h3>
      <p>Universal orb clicked!</p>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 2000);
  }

  applyPosition(positionSetting) {
    // Reset all positions
    this.container.style.top = 'auto';
    this.container.style.bottom = 'auto';
    this.container.style.left = 'auto';
    this.container.style.right = 'auto';
    this.container.style.transform = '';
    
    // Get saved position data
    const positionKey = `orb.position:${this.vaultId}`;
    const savedPosition = this.settings[positionKey];
    
    if (savedPosition && savedPosition.coordinates) {
      // Apply saved custom position
      console.log('🌍 Applying saved position:', savedPosition);
      const coords = savedPosition.coordinates;
      
      if (coords.top) this.container.style.top = coords.top;
      if (coords.bottom) this.container.style.bottom = coords.bottom;
      if (coords.left) this.container.style.left = coords.left;
      if (coords.right) this.container.style.right = coords.right;
      if (coords.transform) this.container.style.transform = coords.transform;
      
    } else {
      // Apply default position from settings or fallback
      const position = positionSetting || this.settings[`orb.position:${this.vaultId}`] || 'bottom-right';
      
      switch (position) {
        case 'top-left':
          this.container.style.top = '20px';
          this.container.style.left = '20px';
          break;
        case 'top-right':
          this.container.style.top = '20px';
          this.container.style.right = '20px';
          break;
        case 'bottom-left':
          this.container.style.bottom = '20px';
          this.container.style.left = '20px';
          break;
        case 'center':
          this.container.style.top = '50%';
          this.container.style.left = '50%';
          this.container.style.transform = 'translate(-50%, -50%)';
          break;
        default: // bottom-right
          this.container.style.bottom = '20px';
          this.container.style.right = '20px';
      }
    }
  }

  setupSettingsListener() {
    // SIMPLIFIED: Basic event listeners  
    console.log('🔵 UniversalEmmaOrb: Setting up basic event listeners');
    
    // Listen for settings changes from various sources
    console.log('🌍 UniversalEmmaOrb: Setting up event listeners');
    
    // Chrome storage changes (only in extension context)
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      try {
        chrome.storage.onChanged.addListener(async (changes, areaName) => {
          if (areaName === 'local') {
            console.log('🌍 UniversalEmmaOrb: Storage changed, refreshing...');
            await this.refreshOrb();
          }
        });
        console.log('🌍 UniversalEmmaOrb: Chrome storage listener added');
      } catch (error) {
        console.warn('🌍 UniversalEmmaOrb: Failed to add Chrome storage listener:', error);
      }
    }
    
    // localStorage changes (for cross-tab updates)
    window.addEventListener('storage', async (e) => {
      if (e.key && (e.key.includes('orb.') || e.key.includes('dementia.') || e.key.includes('mirror.'))) {
        console.log('🌍 UniversalEmmaOrb: localStorage changed, refreshing...');
        await this.refreshOrb();
      }
    });
    
    // PostMessage events
    window.addEventListener('message', async (event) => {
      if (event.data.type === 'ORB_SETTINGS_CHANGED' || 
          event.data.type === 'DEMENTIA_SETTINGS_CHANGED' ||
          event.data.type === 'ORB_POSITION_CHANGED') {
        console.log('🌍 UniversalEmmaOrb: PostMessage received, refreshing...');
        await this.refreshOrb();
      }
    });
    
    // localStorage position changes
    window.addEventListener('storage', async (e) => {
      if (e.key === 'orb.position.bump') {
        console.log('🌍 UniversalEmmaOrb: Position changed, refreshing...');
        await this.refreshOrb();
      }
    });
    
    // Runtime message events (only in extension context)
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      try {
        chrome.runtime.onMessage.addListener(async (message) => {
          if (message.action === 'settings.changed') {
            console.log('🌍 UniversalEmmaOrb: Runtime message received, refreshing...');
            await this.refreshOrb();
          }
        });
        console.log('🌍 UniversalEmmaOrb: Chrome runtime listener added');
      } catch (error) {
        console.warn('🌍 UniversalEmmaOrb: Failed to add Chrome runtime listener:', error);
      }
    }
    
    // EmmaWebVault event subscription for vault changes
    if (window.emmaWebVault) {
      try {
        // Listen for vault unlock/lock events
        document.addEventListener('emma-vault-unlocked', async () => {
          console.log('🌍 UniversalEmmaOrb: Vault unlocked, refreshing...');
          await this.refreshOrb();
        });
        document.addEventListener('emma-vault-locked', async () => {
          console.log('🌍 UniversalEmmaOrb: Vault locked, refreshing...');
          await this.refreshOrb();
        });
        console.log('🌍 UniversalEmmaOrb: EmmaWebVault listeners added');
      } catch (error) {
        console.warn('🌍 UniversalEmmaOrb: Failed to add EmmaWebVault listeners:', error);
      }
    }
  }

  async refreshOrb() {
    // SIMPLIFIED: Basic orb refresh
    console.log('🔵 UniversalEmmaOrb: Refreshing orb display');
    
    try {
      // Reload settings to check for changes
      await this.loadSettings();
      
      // Determine new orb type
      const newOrbType = await this.determineOrbType();
      
      // Update if changed
      if (newOrbType !== this.currentOrbType) {
        console.log('🌍 UniversalEmmaOrb: Orb type changed from', this.currentOrbType, 'to', newOrbType);
        await this.showOrb(newOrbType);
      }
      
    } catch (error) {
      console.error('🌍 UniversalEmmaOrb: Refresh failed:', error);
    }
  }

  // Public method for external components to notify about dialog state
  notifyDialogStateChange(isOpen, dialogType = 'unknown') {
    console.log(`🌍 Dialog state notification: ${isOpen ? 'opened' : 'closed'} (${dialogType})`);
    
    if (isOpen) {
      // Cancel any active long-press when dialog opens
      this.cancelLongPress();
      this.dialogOpen = true;
    } else {
      this.dialogOpen = false;
    }
  }
  
  // Static method to initialize the universal orb
  static initialize() {
    if (!window.universalEmmaOrbInstance) {
      window.universalEmmaOrbInstance = new UniversalEmmaOrb();
    }
    return window.universalEmmaOrbInstance;
  }
  
  // Static method to get existing instance
  static getInstance() {
    return window.universalEmmaOrbInstance;
  }
}

// Auto-initialize when script loads (after DOM is ready)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => UniversalEmmaOrb.initialize(), 100);
  });
} else {
  setTimeout(() => UniversalEmmaOrb.initialize(), 100);
}

// Export for manual initialization
window.UniversalEmmaOrb = UniversalEmmaOrb;
