class EmmaAssistant extends BaseOrb {
  constructor(container, options = {}) {
    super(container, { ...options, orbType: 'default' });
    this.init();
  }
  
  async init() {
    await super.init();
    this.setupUI();
    this.finalizeInitialization(); // Setup click handler AFTER UI is created
  }
  
  setupUI() {
    if (!this.container) return;
    this.orb = new EmmaOrb(this.container, {
      hue: 260,
      ...this.options
    });
  }
  
  cleanup() {
    super.cleanup(); // Remove click handler
    if (this.orb && this.orb.cleanup) {
      this.orb.cleanup();
    }
  }
  
  onSettingsChanged() {
    // Settings changed
  }
}

window.EmmaAssistant = EmmaAssistant;
