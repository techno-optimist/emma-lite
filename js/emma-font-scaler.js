/**
 * Emma Dynamic Font Scaler
 * Allows users to increase/decrease font sizes app-wide while preserving design
 * 
 * 💜 Built with love for accessibility without compromising beauty
 */

class EmmaFontScaler {
  constructor() {
    this.currentScale = this.loadSavedScale();
    this.minScale = 0.8;  // 80% minimum
    this.maxScale = 2.0;  // 200% maximum  
    this.scaleStep = 0.1; // 10% increments
    
    this.init();
  }

  /**
   * Initialize the font scaler
   */
  init() {
    this.createScaleCSS();
    this.applyScale(this.currentScale);
    this.createControls();
    
    // Listen for keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyboard.bind(this));
    
    console.log(`🔤 Emma Font Scaler initialized at ${Math.round(this.currentScale * 100)}%`);
  }

  /**
   * Create the CSS custom property system for scaling
   */
  createScaleCSS() {
    if (document.getElementById('emmaFontScalerStyles')) return;

    const styles = `
      <style id="emmaFontScalerStyles">
        :root {
          --emma-font-scale: ${this.currentScale};
          
          /* Dynamic font sizes that preserve the design ratios */
          --emma-font-xs: calc(12px * var(--emma-font-scale));
          --emma-font-sm: calc(14px * var(--emma-font-scale));
          --emma-font-base: calc(16px * var(--emma-font-scale));
          --emma-font-lg: calc(18px * var(--emma-font-scale));
          --emma-font-xl: calc(20px * var(--emma-font-scale));
          --emma-font-2xl: calc(24px * var(--emma-font-scale));
          --emma-font-3xl: calc(30px * var(--emma-font-scale));
          --emma-font-4xl: calc(36px * var(--emma-font-scale));
          --emma-font-5xl: calc(48px * var(--emma-font-scale));
        }

        /* Override existing font sizes to use scalable versions */
        body {
          font-size: var(--emma-font-base) !important;
        }

        h1 {
          font-size: var(--emma-font-4xl) !important;
        }

        h2 {
          font-size: var(--emma-font-3xl) !important;
        }

        h3 {
          font-size: var(--emma-font-2xl) !important;
        }

        h4 {
          font-size: var(--emma-font-xl) !important;
        }

        h5 {
          font-size: var(--emma-font-lg) !important;
        }

        h6 {
          font-size: var(--emma-font-base) !important;
        }

        /* Button text scaling */
        button, .btn, .emma-btn {
          font-size: var(--emma-font-base) !important;
        }

        .btn-sm, .emma-btn-sm {
          font-size: var(--emma-font-sm) !important;
        }

        .btn-lg, .emma-btn-lg {
          font-size: var(--emma-font-lg) !important;
        }

        /* Input and form scaling */
        input, textarea, select {
          font-size: var(--emma-font-base) !important;
        }

        /* Navigation and menu scaling */
        nav, .navbar, .menu {
          font-size: var(--emma-font-base) !important;
        }

        /* Modal and popup scaling - COMPREHENSIVE */
        .modal, .popup, .tooltip, .dialog, .overlay {
          font-size: var(--emma-font-base) !important;
        }

        /* Emma-specific modal classes */
        .emma-modal, .emma-popup, .emma-dialog {
          font-size: var(--emma-font-base) !important;
        }

        /* Dementia-friendly modals */
        .emma-dementia-modal {
          font-size: var(--emma-font-base) !important;
        }

        .emma-dementia-modal-title {
          font-size: var(--emma-font-2xl) !important;
        }

        .emma-dementia-modal-message {
          font-size: var(--emma-font-lg) !important;
        }

        .emma-dementia-modal-help {
          font-size: var(--emma-font-base) !important;
        }

        .emma-dementia-btn {
          font-size: var(--emma-font-base) !important;
          padding: calc(12px * var(--emma-font-scale)) calc(24px * var(--emma-font-scale)) !important;
        }

        /* Password and input modals */
        .clean-modal, .secure-modal, .emma-input-modal {
          font-size: var(--emma-font-base) !important;
        }

        .clean-modal-title, .secure-modal-title, .emma-input-title {
          font-size: var(--emma-font-xl) !important;
        }

        .clean-modal-message, .secure-modal-message, .emma-input-message {
          font-size: var(--emma-font-base) !important;
        }

        /* Modal headers and content */
        .modal-header, .popup-header, .dialog-header {
          font-size: var(--emma-font-lg) !important;
        }

        .modal-body, .popup-body, .dialog-body, .modal-content {
          font-size: var(--emma-font-base) !important;
        }

        .modal-footer, .popup-footer, .dialog-footer {
          font-size: var(--emma-font-base) !important;
        }

        /* Modal headings */
        .modal h1, .popup h1, .dialog h1,
        .emma-modal h1, .emma-popup h1 {
          font-size: var(--emma-font-3xl) !important;
        }

        .modal h2, .popup h2, .dialog h2,
        .emma-modal h2, .emma-popup h2 {
          font-size: var(--emma-font-2xl) !important;
        }

        .modal h3, .popup h3, .dialog h3,
        .emma-modal h3, .emma-popup h3 {
          font-size: var(--emma-font-xl) !important;
        }

        /* Modal buttons */
        .modal-btn, .popup-btn, .dialog-btn,
        .emma-btn, .clean-btn, .secure-btn {
          font-size: var(--emma-font-base) !important;
          padding: calc(10px * var(--emma-font-scale)) calc(20px * var(--emma-font-scale)) !important;
        }

        /* Modal inputs */
        .modal input, .popup input, .dialog input,
        .emma-modal input, .clean-modal input, .secure-modal input {
          font-size: var(--emma-font-base) !important;
          padding: calc(12px * var(--emma-font-scale)) !important;
        }

        .modal textarea, .popup textarea, .dialog textarea,
        .emma-modal textarea {
          font-size: var(--emma-font-base) !important;
          padding: calc(12px * var(--emma-font-scale)) !important;
        }

        /* Card and content scaling */
        .card, .content, .description {
          font-size: var(--emma-font-base) !important;
        }

        /* Small text scaling */
        small, .small, .text-sm, .caption {
          font-size: var(--emma-font-sm) !important;
        }

        /* Large text scaling */
        .text-lg, .lead {
          font-size: var(--emma-font-lg) !important;
        }

        /* Chat and message scaling */
        .chat-message, .message, .chat {
          font-size: var(--emma-font-base) !important;
        }

        /* Memory card scaling */
        .memory-card, .memory-item, .memory-container {
          font-size: var(--emma-font-base) !important;
        }

        .memory-title, .memory-name {
          font-size: var(--emma-font-lg) !important;
        }

        .memory-description, .memory-content, .memory-excerpt {
          font-size: var(--emma-font-base) !important;
        }

        .memory-date, .memory-timestamp, .memory-meta {
          font-size: var(--emma-font-sm) !important;
        }

        /* Gallery and grid scaling */
        .gallery, .grid, .card-grid {
          font-size: var(--emma-font-base) !important;
        }

        .gallery-item, .grid-item {
          font-size: var(--emma-font-base) !important;
        }

        /* Chat experience scaling */
        .chat-container, .chat-window {
          font-size: var(--emma-font-base) !important;
        }

        .chat-message, .message-bubble {
          font-size: var(--emma-font-base) !important;
          padding: calc(12px * var(--emma-font-scale)) calc(16px * var(--emma-font-scale)) !important;
        }

        .chat-input, .message-input {
          font-size: var(--emma-font-base) !important;
          padding: calc(12px * var(--emma-font-scale)) !important;
        }

        /* Emma orb and companion scaling */
        .emma-orb-text, .companion-text {
          font-size: var(--emma-font-base) !important;
        }

        .orb-status, .companion-status {
          font-size: var(--emma-font-sm) !important;
        }

        /* Vault and security UI scaling */
        .vault-status, .security-indicator {
          font-size: var(--emma-font-sm) !important;
        }

        .vault-name, .vault-title {
          font-size: var(--emma-font-lg) !important;
        }

        /* Settings and options scaling */
        .settings-group, .option-group {
          font-size: var(--emma-font-base) !important;
        }

        .settings-label, .option-label {
          font-size: var(--emma-font-base) !important;
        }

        .settings-description, .option-description {
          font-size: var(--emma-font-sm) !important;
        }

        /* Dashboard and page content scaling */
        .dashboard, .page-content, .main-content {
          font-size: var(--emma-font-base) !important;
        }

        .dashboard-card, .info-card {
          font-size: var(--emma-font-base) !important;
        }

        .card-title, .section-title {
          font-size: var(--emma-font-lg) !important;
        }

        /* Status indicators and badges */
        .status, .badge, .tag, .label {
          font-size: var(--emma-font-sm) !important;
          padding: calc(4px * var(--emma-font-scale)) calc(8px * var(--emma-font-scale)) !important;
        }

        /* Dropdown and select scaling */
        .dropdown, .select, .picker {
          font-size: var(--emma-font-base) !important;
        }

        .dropdown-item, .select-option {
          font-size: var(--emma-font-base) !important;
          padding: calc(8px * var(--emma-font-scale)) calc(12px * var(--emma-font-scale)) !important;
        }

        /* Toast and notification scaling */
        .toast, .notification, .alert {
          font-size: var(--emma-font-base) !important;
          padding: calc(12px * var(--emma-font-scale)) calc(16px * var(--emma-font-scale)) !important;
        }

        .toast-title, .notification-title {
          font-size: var(--emma-font-lg) !important;
        }

        /* Tab and navigation scaling */
        .tab, .nav-item, .breadcrumb {
          font-size: var(--emma-font-base) !important;
          padding: calc(8px * var(--emma-font-scale)) calc(16px * var(--emma-font-scale)) !important;
        }

        /* Error and success message scaling */
        .error, .success, .warning, .info {
          font-size: var(--emma-font-base) !important;
          padding: calc(12px * var(--emma-font-scale)) !important;
        }

        /* Accordion and collapsible scaling */
        .accordion, .collapsible {
          font-size: var(--emma-font-base) !important;
        }

        .accordion-header, .collapsible-header {
          font-size: var(--emma-font-lg) !important;
          padding: calc(12px * var(--emma-font-scale)) !important;
        }

        /* Progress and loading scaling */
        .progress, .loading, .spinner {
          font-size: var(--emma-font-sm) !important;
        }

        /* People and relationships scaling */
        .person-card, .relationship-item {
          font-size: var(--emma-font-base) !important;
        }

        .person-name, .relationship-name {
          font-size: var(--emma-font-lg) !important;
        }

        /* Voice capture and audio UI scaling */
        .voice-ui, .audio-controls {
          font-size: var(--emma-font-base) !important;
        }

        .voice-status, .audio-status {
          font-size: var(--emma-font-sm) !important;
        }

        /* Media and image UI scaling */
        .media-controls, .image-viewer {
          font-size: var(--emma-font-base) !important;
        }

        .media-caption, .image-caption {
          font-size: var(--emma-font-sm) !important;
          padding: calc(8px * var(--emma-font-scale)) !important;
        }

        /* Preserve icon sizes (don't scale icons, just text) */
        .icon, .emoji, [class*="icon-"] {
          font-size: inherit !important;
        }

        /* Responsive scaling adjustments */
        @media (max-width: 768px) {
          /* Slightly larger base font on mobile when scaled */
          body {
            font-size: calc(var(--emma-font-base) * 1.05) !important;
          }
          
          /* Ensure buttons remain tappable */
          button, .btn, .emma-btn {
            min-height: calc(44px * var(--emma-font-scale)) !important;
            padding: calc(12px * var(--emma-font-scale)) calc(16px * var(--emma-font-scale)) !important;
          }
        }

        @media (max-width: 480px) {
          /* Even larger base font on small screens when scaled */
          body {
            font-size: calc(var(--emma-font-base) * 1.1) !important;
          }
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  /**
   * Create floating font size controls (DISABLED - controls moved to settings)
   */
  createControls() {
    // Font controls are now in the settings panel - no floating controls needed
    console.log('🔤 Font controls moved to settings panel - skipping floating controls');
    return;
  }

  /**
   * Add styles for the font controls
   */
  addControlStyles() {
    if (document.getElementById('emmaFontControlStyles')) return;

    const styles = `
      <style id="emmaFontControlStyles">
        .emma-font-controls {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          transition: all 0.3s ease;
        }

        .emma-font-controls:hover {
          background: rgba(0, 0, 0, 0.9);
          transform: translateY(-2px);
        }

        .emma-font-controls-inner {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .emma-font-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .emma-font-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
        }

        .emma-font-btn:active {
          transform: scale(0.95);
        }

        .emma-font-reset {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        }

        .emma-font-scale {
          color: white;
          font-size: 12px;
          font-weight: 600;
          min-width: 40px;
          text-align: center;
        }

        /* Hide controls when reduced motion is preferred */
        @media (prefers-reduced-motion: reduce) {
          .emma-font-controls {
            transition: none;
          }
          
          .emma-font-controls:hover {
            transform: none;
          }
          
          .emma-font-btn:hover {
            transform: none;
          }
        }

        /* Responsive positioning */
        @media (max-width: 768px) {
          .emma-font-controls {
            top: 10px;
            right: 10px;
            padding: 6px;
          }
          
          .emma-font-btn {
            width: 28px;
            height: 28px;
            font-size: 12px;
          }
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  /**
   * Bind control button events (for settings panel integration)
   */
  bindControlEvents() {
    // Settings panel will call our public methods directly
    // No need to bind floating control events
    console.log('🔤 Font control events handled by settings panel');
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboard(e) {
    if (e.ctrlKey || e.metaKey) {
      switch(e.key) {
        case '=':
        case '+':
          e.preventDefault();
          this.increaseFont();
          break;
        case '-':
          e.preventDefault();
          this.decreaseFont();
          break;
        case '0':
          e.preventDefault();
          this.resetFont();
          break;
      }
    }
  }

  /**
   * Increase font size
   */
  increaseFont() {
    if (this.currentScale < this.maxScale) {
      this.currentScale = Math.min(this.maxScale, this.currentScale + this.scaleStep);
      this.applyScale(this.currentScale);
      this.saveScale();
      this.showFeedback('Font size increased');
    }
  }

  /**
   * Decrease font size
   */
  decreaseFont() {
    if (this.currentScale > this.minScale) {
      this.currentScale = Math.max(this.minScale, this.currentScale - this.scaleStep);
      this.applyScale(this.currentScale);
      this.saveScale();
      this.showFeedback('Font size decreased');
    }
  }

  /**
   * Reset font size to default
   */
  resetFont() {
    this.currentScale = 1.0;
    this.applyScale(this.currentScale);
    this.saveScale();
    this.showFeedback('Font size reset to default');
  }

  /**
   * Apply the font scale
   */
  applyScale(scale) {
    document.documentElement.style.setProperty('--emma-font-scale', scale);
    
    // Update control display
    const scaleDisplay = document.getElementById('fontScale');
    if (scaleDisplay) {
      scaleDisplay.textContent = `${Math.round(scale * 100)}%`;
    }
  }

  /**
   * Save scale to localStorage
   */
  saveScale() {
    try {
      localStorage.setItem('emma-font-scale', this.currentScale.toString());
    } catch (error) {
      console.warn('Could not save font scale setting:', error);
    }
  }

  /**
   * Load saved scale from localStorage
   */
  loadSavedScale() {
    try {
      const saved = localStorage.getItem('emma-font-scale');
      if (saved) {
        const scale = parseFloat(saved);
        if (scale >= this.minScale && scale <= this.maxScale) {
          return scale;
        }
      }
    } catch (error) {
      console.warn('Could not load font scale setting:', error);
    }
    return 1.0; // Default scale
  }

  /**
   * Show brief feedback when font size changes
   */
  showFeedback(message) {
    // Use Emma's logger if available
    if (window.EmmaLogger) {
      window.EmmaLogger.info(`🔤 ${message}`);
    } else {
      console.log(`🔤 ${message}`);
    }

    // Show visual feedback in the control
    const scaleDisplay = document.getElementById('fontScale');
    if (scaleDisplay) {
      scaleDisplay.style.color = '#4ade80'; // Success color
      setTimeout(() => {
        scaleDisplay.style.color = 'white';
      }, 500);
    }
  }

  /**
   * Public API for programmatic control
   */
  setScale(scale) {
    if (scale >= this.minScale && scale <= this.maxScale) {
      this.currentScale = scale;
      this.applyScale(this.currentScale);
      this.saveScale();
    }
  }

  getScale() {
    return this.currentScale;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.emmaFontScaler = new EmmaFontScaler();
  });
} else {
  window.emmaFontScaler = new EmmaFontScaler();
}

// Make available globally
window.EmmaFontScaler = EmmaFontScaler;
