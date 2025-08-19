class BaseOrb {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.orbType = options.orbType || 'default';
  }
  
  async init() {
    // Override in subclasses for additional initialization
    // Call setupClickHandler() AFTER creating UI elements
  }
  
  /**
   * Call this after UI elements are created to ensure clicks work
   */
  finalizeInitialization() {
    this.setupClickHandler();
    console.log(`🎯 BaseOrb: Finalized initialization for ${this.orbType} orb`);
  }
  
  setupClickHandler() {
    if (!this.container) return;
    
    // Make container and all children clickable
    this.container.style.cursor = 'pointer';
    this.container.style.pointerEvents = 'auto';
    this.container.style.position = 'relative'; // Ensure it's positioned
    
    // Add click event listener with capture=true to catch early
    this.clickHandler = (e) => {
      console.log(`🎯 BaseOrb: ${this.orbType} orb click captured!`, e.target);
      e.preventDefault();
      e.stopPropagation();
      this.handleOrbClick();
    };
    
    // Add multiple event listeners to ensure we catch clicks
    this.container.addEventListener('click', this.clickHandler, true); // Capture phase
    this.container.addEventListener('click', this.clickHandler, false); // Bubble phase
    
    // Also add to any child canvas/elements
    setTimeout(() => {
      const childElements = this.container.querySelectorAll('canvas, div, span');
      childElements.forEach(child => {
        child.style.pointerEvents = 'auto';
        child.addEventListener('click', this.clickHandler, true);
      });
    }, 100);
    
    console.log(`🎯 BaseOrb: Enhanced click handler setup for ${this.orbType} orb`);
  }
  
  handleOrbClick() {
    console.log(`🎯 BaseOrb: ${this.orbType} orb clicked`);
    
    // Use OrbExperienceManager to show appropriate popup
    if (window.OrbExperienceManager) {
      const experienceManager = window.OrbExperienceManager.getInstance();
      experienceManager.handleOrbClick(this.orbType, this.container);
    } else {
      console.warn('🎯 BaseOrb: OrbExperienceManager not available');
      this.showFallbackPopup();
    }
  }
  
  showFallbackPopup() {
    // Simple fallback notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(147, 112, 219, 0.95);
      color: white;
      padding: 20px;
      border-radius: 12px;
      z-index: 10000;
      text-align: center;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    `;
    notification.innerHTML = `
      <h3 style="margin: 0 0 8px 0;">Emma ${this.orbType.charAt(0).toUpperCase() + this.orbType.slice(1)}</h3>
      <p style="margin: 0;">Experience popup coming soon!</p>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 2000);
  }
  
  cleanup() {
    // Remove click handlers
    if (this.container && this.clickHandler) {
      this.container.removeEventListener('click', this.clickHandler, true);
      this.container.removeEventListener('click', this.clickHandler, false);
      
      // Remove from child elements
      const childElements = this.container.querySelectorAll('canvas, div, span');
      childElements.forEach(child => {
        child.removeEventListener('click', this.clickHandler, true);
      });
    }
    // Override in subclasses for additional cleanup
  }
  
  onSettingsChanged(settings) {
    // Override in subclasses
  }
}

window.BaseOrb = BaseOrb;
