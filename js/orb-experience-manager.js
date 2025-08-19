/**
 * Emma Orb Experience Manager
 * Manages different popup experiences for each orb type
 */

class OrbExperienceManager {
  constructor() {
    this.activePopup = null;
    this.experienceTypes = {
      'default': {
        name: 'Emma Assistant',
        popupClass: 'AssistantExperience',
        defaultSettings: {
          popupSize: 'medium', // CTO: Now 500x550 for better wizard experience
          popupBehavior: 'show_popup',
          autoHide: false,
          voiceEnabled: false,
          interfaceMode: 'standard'
        }
      },
      'dementia': {
        name: 'Memory Companion',
        popupClass: 'DementiaExperience', 
        defaultSettings: {
          popupSize: 'large',
          popupBehavior: 'show_popup',
          autoHide: false,
          voiceEnabled: true,
          interfaceMode: 'simplified',
          autoListen: true,
          wakeWord: 'Emma'
        }
      },
      'mirror': {
        name: 'Mirror Emma',
        popupClass: 'MirrorExperience',
        defaultSettings: {
          popupSize: 'medium',
          popupBehavior: 'show_popup', 
          autoHide: true,
          voiceEnabled: false,
          interfaceMode: 'advanced'
        }
      }
    };
  }

  /**
   * Handle orb click - show appropriate experience
   */
  async handleOrbClick(orbType, orbElement) {
    console.log(`🎭 OrbExperience: Handling ${orbType} orb click`);
    
    try {
      // Get user's customization settings for this orb
      const settings = await this.getOrbExperienceSettings(orbType);
      
      // Close any existing popup
      if (this.activePopup) {
        this.activePopup.close();
        this.notifyUniversalOrbDialogState(false, 'previous_experience');
        this.activePopup = null;
      }

      // Handle different popup behaviors
      switch (settings.popupBehavior) {
        case 'show_popup':
          await this.showExperiencePopup(orbType, settings, orbElement);
          break;
        case 'voice_activate':
          await this.activateVoiceMode(orbType, settings);
          break;
        case 'minimize':
          await this.showMinimizedMode(orbType, settings);
          break;
        default:
          await this.showExperiencePopup(orbType, settings, orbElement);
      }
      
    } catch (error) {
      console.error('🎭 OrbExperience: Failed to handle orb click:', error);
      // Fallback to basic popup
      this.showBasicPopup(orbType);
    }
  }

  /**
   * Show the appropriate experience popup
   * CTO Enhancement: Integrated unified memory wizard
   */
  async showExperiencePopup(orbType, settings, orbElement) {
    const experienceConfig = this.experienceTypes[orbType];
    if (!experienceConfig) {
      console.warn(`🎭 OrbExperience: Unknown orb type: ${orbType}`);
      return;
    }

    // Notify universal orb that a dialog is opening
    this.notifyUniversalOrbDialogState(true, `${orbType}_experience`);

    // Calculate popup position relative to orb
    const rect = orbElement.getBoundingClientRect();
    const position = this.calculatePopupPosition(rect, settings.popupSize);

    // CTO ENHANCEMENT: Use unified memory wizard for memory capture
    if (orbType === 'default' && window.UnifiedMemoryWizard) {
      console.log('🧠 OrbExperience: Using unified memory wizard');
      this.activePopup = new window.UnifiedMemoryWizard(position, settings);
    } else {
      // Create the appropriate experience popup
      const ExperienceClass = window[experienceConfig.popupClass];
      if (ExperienceClass) {
        this.activePopup = new ExperienceClass(position, settings);
      } else {
        console.warn(`🎭 OrbExperience: ${experienceConfig.popupClass} not found, showing basic popup`);
        this.showBasicPopup(orbType);
        return;
      }
    }
    
    // Set up close handler to notify when dialog closes
    const instance = this.activePopup;
    const originalClose = instance.close.bind(instance);
    this.activePopup.close = () => {
      console.log(`🎭 OrbExperience: ${orbType} popup closing`);
      // Call original close with correct instance binding first
      try { originalClose(); } catch (e) { console.error('🔴 Popup close error:', e); }
      // Notify and clear reference after close completes
      this.notifyUniversalOrbDialogState(false, `${orbType}_experience`);
      this.activePopup = null;
    };
    
    await this.activePopup.show();
  }

  /**
   * Get experience settings for an orb type
   */
  async getOrbExperienceSettings(orbType) {
    // EMERGENCY: Put back nuclear disable to stop storage.get flood
    console.log('🚨 OrbExperienceManager: NUCLEAR DISABLE - returning hardcoded defaults to stop polling');
    return {
      popupSize: 'medium',
      popupBehavior: 'show_popup',
      autoHide: false,
      voiceEnabled: false,
      interfaceMode: 'standard',
      autoListen: false,
      wakeWord: 'Emma'
    };
    
    try {
      // Get vault ID
      let vaultId = 'default';
      if (window.emmaAPI?.vault?.status) {
        const status = await window.emmaAPI.vault.status();
        vaultId = status?.vaultId || vaultId;
      }

      // Get user's customized settings
      const settingsKeys = [
        `${orbType}.popup.size:${vaultId}`,
        `${orbType}.popup.behavior:${vaultId}`,
        `${orbType}.popup.autoHide:${vaultId}`,
        `${orbType}.popup.voiceEnabled:${vaultId}`,
        `${orbType}.popup.interfaceMode:${vaultId}`,
        `${orbType}.popup.autoListen:${vaultId}`,
        `${orbType}.popup.wakeWord:${vaultId}`
      ];

      const userSettings = window.SettingsService 
        ? await window.SettingsService.get(settingsKeys)
        : {};

      // Merge with defaults
      const defaults = this.experienceTypes[orbType]?.defaultSettings || {};
      return {
        popupSize: userSettings[`${orbType}.popup.size:${vaultId}`] || defaults.popupSize || 'medium',
        popupBehavior: userSettings[`${orbType}.popup.behavior:${vaultId}`] || defaults.popupBehavior || 'show_popup',
        autoHide: userSettings[`${orbType}.popup.autoHide:${vaultId}`] ?? defaults.autoHide ?? false,
        voiceEnabled: userSettings[`${orbType}.popup.voiceEnabled:${vaultId}`] ?? defaults.voiceEnabled ?? false,
        interfaceMode: userSettings[`${orbType}.popup.interfaceMode:${vaultId}`] || defaults.interfaceMode || 'standard',
        autoListen: userSettings[`${orbType}.popup.autoListen:${vaultId}`] ?? defaults.autoListen ?? false,
        wakeWord: userSettings[`${orbType}.popup.wakeWord:${vaultId}`] || defaults.wakeWord || 'Emma'
      };
    } catch (error) {
      console.error('🎭 OrbExperience: Failed to get settings:', error);
      return this.experienceTypes[orbType]?.defaultSettings || {};
    }
  }

  /**
   * Calculate optimal popup position
   */
  calculatePopupPosition(orbRect, size) {
    const sizes = {
      small: { width: 300, height: 200 },
      medium: { width: 500, height: 550 }, // CTO: Increased height for wizard
      large: { width: 700, height: 700 },   // CTO: Increased height for better UX
      fullscreen: { width: window.innerWidth * 0.9, height: window.innerHeight * 0.9 }
    };

    const popupSize = sizes[size] || sizes.medium;

    // Anchor the popup's bottom-right corner to a point just to the LEFT of the orb
    // and aligned with the orb's BOTTOM so the popup opens UP and LEFT.
    const marginX = 12;
    const marginY = 12;
    const anchorX = orbRect.left - marginX;   // to the left of orb
    const anchorY = Math.min(orbRect.bottom, window.innerHeight - marginY); // within viewport

    // Derive top-left from bottom-right anchor
    let left = anchorX - popupSize.width;     // open to the left of orb
    let top = anchorY - popupSize.height;     // open upward from orb bottom

    // Clamp to viewport with small padding
    const pad = 12;
    // Horizontal clamp only; vertical is forced to top-of-viewport per UX request
    left = Math.max(pad, Math.min(left, window.innerWidth - popupSize.width - pad));
    top = pad; // open at very top so user can drag from there

    return {
      left,
      top,
      width: popupSize.width,
      height: popupSize.height
    };
  }

  /**
   * Activate voice mode without popup
   */
  async activateVoiceMode(orbType, settings) {
    console.log(`🎤 OrbExperience: Activating voice mode for ${orbType}`);
    // TODO: Implement voice-only interaction
    this.showNotification(`Voice mode activated for ${this.experienceTypes[orbType]?.name}`);
  }

  /**
   * Show minimized mode
   */
  async showMinimizedMode(orbType, settings) {
    console.log(`📦 OrbExperience: Showing minimized mode for ${orbType}`);
    // TODO: Implement minimized popup
    this.showBasicPopup(orbType, true);
  }

  /**
   * Basic fallback popup
   */
  showBasicPopup(orbType, minimized = false) {
    const config = this.experienceTypes[orbType];
    const name = config?.name || 'Emma';
    
    this.showNotification(`${name} experience coming soon!`, minimized ? 'info' : 'warning');
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    // Create simple notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'warning' ? '#ff6b6b' : type === 'info' ? '#4ecdc4' : '#95e1d3'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  /**
   * Notify universal orb about dialog state changes
   */
  notifyUniversalOrbDialogState(isOpen, dialogType) {
    try {
      if (window.UniversalEmmaOrb) {
        const orbInstance = window.UniversalEmmaOrb.getInstance();
        if (orbInstance && orbInstance.notifyDialogStateChange) {
          orbInstance.notifyDialogStateChange(isOpen, dialogType);
        }
      }
    } catch (error) {
      console.warn('🎭 Failed to notify universal orb about dialog state:', error);
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!OrbExperienceManager.instance) {
      OrbExperienceManager.instance = new OrbExperienceManager();
    }
    return OrbExperienceManager.instance;
  }
}

// Export for use
window.OrbExperienceManager = OrbExperienceManager;
