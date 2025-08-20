/**
 * Emma Universal Orb Manager
 * Centralized system for managing multiple orb types without conflicts
 */

// Orb Registry - All available orb types and their configurations
const OrbRegistry = {
  'default': {
    name: 'Emma Assistant',
    class: 'EmmaAssistant', // Will be resolved to actual class
    priority: 0,
    settingsKeys: [],
    requiredScripts: ['emma-orb.js', 'emma-assistant.js']
  },
  'dementia': {
    name: 'Dementia Companion', 
    class: 'EmmaDementiaCompanion',
    priority: 10,
    settingsKeys: ['dementia.enabled', 'dementia.stage', 'dementia.voiceEnabled', 'dementia.storeTranscripts'],
    requiredScripts: ['emma-orb.js', 'emma-dementia-styles.js', 'emma-dementia-companion.js', 'emma-dementia-vault-integration.js']
  },
  'mirror': {
    name: 'Mirror Emma',
    class: 'EmmaMirrorCompanion',
    priority: 5,
    settingsKeys: ['mirror.enabled', 'mirror.adaptationSpeed', 'mirror.mirrorStyle'],
    requiredScripts: ['emma-orb.js', 'emma-mirror-companion.js']
  }
};

/**
 * OrbManager - Singleton that manages all orb instances
 */
class OrbManager {
  constructor() {
    if (OrbManager.instance) {
      return OrbManager.instance;
    }
    
    this.currentOrb = null;
    this.currentOrbType = null;
    this.orbContainer = null;
    this.settings = {};
    this.initialized = false;
    this.vaultId = 'unknown';
    
    OrbManager.instance = this;
  }

  /**
   * Initialize the orb manager
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('🎯 OrbManager: Initializing...');
    
    try {
      // Get vault ID
      await this.loadVaultId();
      
      // Create single orb container
      this.createOrbContainer();
      
      // Hide any existing orbs
      this.hideExistingOrbs();
      
      // Load user settings
      await this.loadSettings();
      
      // Determine which orb to show
      const orbType = await this.determineOrbType();
      console.log('🎯 OrbManager: Selected orb type:', orbType);
      
      // Create and mount the orb
      await this.switchToOrb(orbType);
      
      // Listen for settings changes
      this.setupListeners();
      
      this.initialized = true;
      console.log('🎯 OrbManager: Initialization complete');
    } catch (error) {
      console.error('🎯 OrbManager: Initialization failed:', error);
    }
  }

  /**
   * Get vault ID for settings
   */
  async loadVaultId() {
    try {
      if (window.emmaAPI?.vault?.status) {
        const status = await window.emmaAPI.vault.status();
        this.vaultId = status?.vaultId || 'unknown';
      } else if (window.chrome && chrome.runtime) {
        const response = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });
        this.vaultId = response?.vaultId || 'unknown';
      }
    } catch (e) {
      console.warn('🎯 OrbManager: Failed to get vault ID:', e);
    }
  }

  /**
   * Create the single orb container
   */
  createOrbContainer() {
    // Remove any existing container
    const existing = document.querySelector('.emma-universal-orb-container');
    if (existing) existing.remove();
    
    // Get user preferences
    const size = this.settings[`orb.size:${this.vaultId}`] || 72;
    const position = this.settings[`orb.position:${this.vaultId}`] || 'bottom-right';
    
    // Parse position
    const positions = {
      'bottom-right': { bottom: '20px', right: '20px', top: 'auto', left: 'auto' },
      'bottom-left': { bottom: '20px', left: '20px', top: 'auto', right: 'auto' },
      'top-right': { top: '20px', right: '20px', bottom: 'auto', left: 'auto' },
      'top-left': { top: '20px', left: '20px', bottom: 'auto', right: 'auto' }
    };
    
    const posStyle = positions[position] || positions['bottom-right'];
    
    // Create new container
    this.orbContainer = document.createElement('div');
    this.orbContainer.className = 'emma-universal-orb-container';
    this.orbContainer.style.cssText = `
      position: fixed;
      ${Object.entries(posStyle).map(([k, v]) => `${k}: ${v}`).join('; ')};
      width: ${size}px;
      height: ${size}px;
      z-index: 2147483647; /* ensure on top of overlays */
      pointer-events: auto;
    `;
    
    document.body.appendChild(this.orbContainer);
    // Avoid page overlays consuming clicks
    this.orbContainer.addEventListener('pointerdown', (e) => e.stopPropagation(), true);
    this.orbContainer.addEventListener('click', (e) => e.stopPropagation(), true);
    
    // Setup auto-hide if enabled
    const autoHide = this.settings[`orb.autoHide:${this.vaultId}`];
    const hideMinutes = this.settings[`orb.hideMinutes:${this.vaultId}`] || 5;
    
    if (autoHide) {
      this.setupAutoHide(hideMinutes);
    }
  }

  /**
   * Hide any existing orbs to prevent duplicates
   */
  hideExistingOrbs() {
    const existingOrbs = document.querySelectorAll(`
      .emma-orb-container:not(.emma-universal-orb-container),
      .emma-assistant-panel,
      .assistant-container,
      .emma-panel,
      .memory-assistant
    `);
    
    existingOrbs.forEach(el => {
      el.style.display = 'none';
      el.style.visibility = 'hidden';
    });
  }

  /**
   * Load all settings
   */
  async loadSettings() {
    this.settings = {};

    // Collect explicit keys (persona + enabled flags + orb preferences)
    const explicitKeys = new Set([
      `orb.persona:${this.vaultId}`,
      `dementia.enabled:${this.vaultId}`,
      `mirror.enabled:${this.vaultId}`,
      `orb.size:${this.vaultId}`,
      `orb.position:${this.vaultId}`,
      `orb.autoHide:${this.vaultId}`,
      `orb.hideMinutes:${this.vaultId}`
    ]);

    // Load using SettingsService for consistent precedence
    try {
      if (window.SettingsService) {
        this.settings = await window.SettingsService.get([...explicitKeys]);
      } else if (window.chrome && chrome.storage) {
        this.settings = await new Promise(resolve => chrome.storage.local.get([...explicitKeys], resolve));
      }
    } catch (e) {
      console.warn('🎯 OrbManager: Failed to load settings:', e);
    }
    
    console.log('🎯 OrbManager: Loaded settings:', this.settings);
  }

  /**
   * Determine which orb type to show based on settings and priority
   */
  async determineOrbType() {
    // First check if user has explicitly selected a persona
    const personaKey = `orb.persona:${this.vaultId}`;
    const selectedPersona = this.settings[personaKey];
    if (selectedPersona && selectedPersona !== 'default' && OrbRegistry[selectedPersona]) {
      return selectedPersona;
    }
    
    // Otherwise, use priority-based selection
    const enabledOrbs = [];
    
    for (const [type, config] of Object.entries(OrbRegistry)) {
      if (type === 'default') {
        // Default is always available
        enabledOrbs.push({ type, priority: config.priority });
      } else {
        // Check if this orb type is enabled
        const enableKey = `${type}.enabled:${this.vaultId}`;
        if (this.settings[enableKey] === true) {
          enabledOrbs.push({ type, priority: config.priority });
        }
      }
    }
    
    // Sort by priority (highest first)
    enabledOrbs.sort((a, b) => b.priority - a.priority);
    
    // Return highest priority enabled orb
    return enabledOrbs[0]?.type || 'default';
  }

  /**
   * Switch to a different orb type
   */
  async switchToOrb(orbType, options = {}) {
    console.log('🎯 OrbManager: Switching to orb type:', orbType);
    
    // Cleanup existing orb
    if (this.currentOrb) {
      console.log('🎯 OrbManager: Cleaning up current orb');
      try {
        if (typeof this.currentOrb.cleanup === 'function') {
          await this.currentOrb.cleanup();
        }
        // Remove any panels or UI elements
        const panels = document.querySelectorAll('.emma-panel, .emma-dementia-panel, .emma-assistant-panel');
        panels.forEach(p => p.remove());
      } catch (e) {
        console.warn('🎯 OrbManager: Cleanup error:', e);
      }
      this.currentOrb = null;
    }
    
    // Clear the container
    this.orbContainer.innerHTML = '';
    
    // Get orb configuration
    const config = OrbRegistry[orbType];
    if (!config) {
      console.error('🎯 OrbManager: Unknown orb type:', orbType);
      return;
    }
    
    // Load required scripts if needed
    await this.ensureScriptsLoaded(config.requiredScripts);
    
    // Get the orb class
    const OrbClass = window[config.class];
    if (!OrbClass) {
      console.error('🎯 OrbManager: Orb class not found:', config.class);
      return;
    }
    
    // Create new orb instance
    try {
      console.log('🎯 OrbManager: Creating new orb instance');
      
      // Get color customization
      const colorTheme = this.settings[`orb.colorTheme:${this.vaultId}`] || 'default';
      const customColor = this.settings[`orb.customColor:${this.vaultId}`] || '#8b5cf6';
      
      // Calculate hue from color
      const hue = this.getHueFromColor(orbType, colorTheme, customColor);
      
      // Ensure the container accepts clicks
      this.orbContainer.style.pointerEvents = 'auto';
      this.currentOrb = new OrbClass(this.orbContainer, {
        ...options,
        manager: this,
        settings: this.getOrbSettings(orbType),
        vaultId: this.vaultId,
        hue: hue
      });
      
      // Store current type
      this.currentOrbType = orbType;
      
      console.log('🎯 OrbManager: Orb created successfully');
    } catch (e) {
      console.error('🎯 OrbManager: Failed to create orb:', e);
    }
  }

  /**
   * Get hue value from color settings
   */
  getHueFromColor(orbType, colorTheme, customColor) {
    // Persona-specific defaults
    const personaHues = {
      'default': 260,     // Purple
      'dementia': 200,    // Blue
      'therapy': 120,     // Green
      'coaching': 30      // Orange
    };
    
    // Theme colors
    const themeHues = {
      'default': personaHues[orbType] || 260,
      'purple': 260,
      'blue': 200,
      'green': 120,
      'orange': 30,
      'pink': 330,
      'custom': this.hexToHue(customColor)
    };
    
    return themeHues[colorTheme] || personaHues[orbType] || 260;
  }

  /**
   * Convert hex color to hue value
   */
  hexToHue(hex) {
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

  /**
   * Get settings for a specific orb type
   */
  getOrbSettings(orbType) {
    const config = OrbRegistry[orbType];
    const orbSettings = {};
    
    config.settingsKeys.forEach(key => {
      const actualKey = key.includes(':') ? key : `${key}:${this.vaultId}`;
      orbSettings[key] = this.settings[actualKey];
    });
    
    return orbSettings;
  }

  /**
   * Ensure required scripts are loaded
   */
  async ensureScriptsLoaded(scripts) {
    // In production, scripts should already be loaded
    // This is mainly for dynamic loading in the future
    return Promise.resolve();
  }

  /**
   * Setup listeners for settings changes
   */
  setupListeners() {
    // Listen for settings changes
    if (window.chrome && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
        if (message.action === 'settings.changed' || message.action === 'refreshDementiaCompanion') {
          console.log('🎯 OrbManager: Settings changed, reloading...');
          await this.handleSettingsChange();
        }
      });
    }
    
    // Listen for localStorage changes
    window.addEventListener('storage', async (e) => {
      if (e.key && (e.key.includes('dementia.settings.bump') || e.key.includes('orb.settings'))) {
        console.log('🎯 OrbManager: Storage changed, reloading...');
        await this.handleSettingsChange();
      }
    });
    
    // Listen for postMessage
    window.addEventListener('message', async (event) => {
      if (event.data.type === 'DEMENTIA_SETTINGS_CHANGED' || event.data.type === 'ORB_SETTINGS_CHANGED') {
        console.log('🎯 OrbManager: PostMessage received, reloading...');
        await this.handleSettingsChange();
      }
    });
  }

  /**
   * Handle settings changes
   */
  async handleSettingsChange() {
    console.log('🎯 OrbManager: handleSettingsChange called');
    
    // Reload settings
    await this.loadSettings();
    console.log('🎯 OrbManager: Settings after reload:', this.settings);
    
    // Determine new orb type
    const newOrbType = await this.determineOrbType();
    console.log('🎯 OrbManager: Determined orb type:', newOrbType, 'current:', this.currentOrbType);
    
    // Switch if different
    if (newOrbType !== this.currentOrbType) {
      console.log('🎯 OrbManager: Orb type changed from', this.currentOrbType, 'to', newOrbType);
      await this.switchToOrb(newOrbType);
    } else if (this.currentOrb && typeof this.currentOrb.onSettingsChanged === 'function') {
      // Just update settings on current orb
      console.log('🎯 OrbManager: Updating settings on current orb');
      this.currentOrb.onSettingsChanged(this.getOrbSettings(this.currentOrbType));
    } else {
      console.log('🎯 OrbManager: No changes needed or no current orb');
    }
  }

  /**
   * Setup auto-hide functionality
   */
  setupAutoHide(minutes) {
    let hideTimeout;
    const hideDelay = minutes * 60 * 1000; // Convert to milliseconds
    
    const resetHideTimer = () => {
      if (hideTimeout) clearTimeout(hideTimeout);
      
      // Show orb if hidden
      if (this.orbContainer.style.opacity === '0') {
        this.orbContainer.style.transition = 'opacity 0.3s ease';
        this.orbContainer.style.opacity = '1';
        this.orbContainer.style.pointerEvents = 'auto';
      }
      
      // Set new timer
      hideTimeout = setTimeout(() => {
        this.orbContainer.style.transition = 'opacity 0.3s ease';
        this.orbContainer.style.opacity = '0';
        this.orbContainer.style.pointerEvents = 'none';
      }, hideDelay);
    };
    
    // Monitor user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetHideTimer, true);
    });
    
    // Start timer
    resetHideTimer();
    
    // Store cleanup function
    this.cleanupAutoHide = () => {
      if (hideTimeout) clearTimeout(hideTimeout);
      ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.removeEventListener(event, resetHideTimer, true);
      });
    };
  }

  /**
   * Get the singleton instance
   */
  static getInstance() {
    if (!OrbManager.instance) {
      OrbManager.instance = new OrbManager();
    }
    return OrbManager.instance;
  }
}

// Export for use
window.OrbManager = OrbManager;
window.OrbRegistry = OrbRegistry;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    OrbManager.getInstance().initialize();
  });
} else {
  // DOM already loaded
  setTimeout(() => {
    OrbManager.getInstance().initialize();
  }, 100);
}
