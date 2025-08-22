/**
 * Emma Mobile UI Fixes
 * Comprehensive mobile responsiveness for chat UI and orb menu positioning
 * 
 * ISSUES IDENTIFIED:
 * 1. Chat UI too big on mobile screens - doesn't snap to screen size
 * 2. Emma orb menu nodes not anchored to orb center on small screens
 * 3. Radial menu positioning offset on mobile devices
 * 4. Chat modal sizing not responsive to viewport
 * 
 * 💜 Built with love for perfect mobile experience
 */

class EmmaMobileUIFixes {
  constructor() {
    this.isMobile = this.detectMobile();
    this.isTablet = this.detectTablet();
    this.viewport = this.getViewportInfo();
    
    console.log('📱 Emma Mobile UI Fixes initialized:', {
      isMobile: this.isMobile,
      isTablet: this.isTablet,
      viewport: this.viewport
    });
    
    this.initializeFixes();
  }
  
  /**
   * Detect if device is mobile
   */
  detectMobile() {
    return window.innerWidth <= 768 || 
           /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  /**
   * Detect if device is tablet
   */
  detectTablet() {
    return window.innerWidth > 768 && window.innerWidth <= 1024;
  }
  
  /**
   * Get comprehensive viewport information
   */
  getViewportInfo() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
    };
  }
  
  /**
   * Initialize all mobile UI fixes
   */
  initializeFixes() {
    // Apply mobile-specific CSS
    this.injectMobileCSS();
    
    // Fix chat UI responsiveness
    this.fixChatUIResponsiveness();
    
    // Fix Emma orb menu positioning
    this.fixOrbMenuPositioning();
    
    // Set up responsive listeners
    this.setupResponsiveListeners();
    
    // Fix experience popup positioning
    this.fixExperiencePopupPositioning();
    
    console.log('✅ Emma Mobile UI Fixes applied');
  }
  
  /**
   * Inject comprehensive mobile CSS fixes
   */
  injectMobileCSS() {
    const style = document.createElement('style');
    style.id = 'emma-mobile-fixes';
    style.textContent = `
      /* ================================
         MOBILE CHAT UI FIXES
         ================================ */
      
      @media (max-width: 768px) {
        /* Chat Experience Modal Fixes */
        .experience-popup-overlay {
          padding: 10px !important;
        }
        
        .experience-popup-container {
          width: calc(100vw - 20px) !important;
          height: calc(100vh - 40px) !important;
          max-width: none !important;
          max-height: none !important;
          min-height: calc(100vh - 40px) !important;
          position: fixed !important;
          top: 20px !important;
          left: 10px !important;
          right: 10px !important;
          bottom: 20px !important;
        }
        
        .experience-popup-content {
          width: 100% !important;
          height: 100% !important;
          max-height: none !important;
          padding: 16px !important;
          border-radius: 16px !important;
        }
        
        /* Chat Messages Area */
        .emma-chat-messages {
          max-height: calc(100vh - 200px) !important;
          min-height: 300px !important;
          padding: 12px 8px !important;
        }
        
        /* Chat Input Area */
        .emma-chat-input {
          padding: 12px 0 !important;
        }
        
        .input-wrapper {
          padding: 8px !important;
          gap: 6px !important;
        }
        
        .chat-textarea {
          font-size: 16px !important; /* Prevent zoom on iOS */
          padding: 12px !important;
          min-height: 44px !important; /* iOS touch target */
        }
        
        .voice-btn, .settings-btn, .send-btn {
          width: 44px !important; /* iOS touch target */
          height: 44px !important;
          min-width: 44px !important;
          min-height: 44px !important;
        }
        
        /* Chat Header */
        .emma-chat-header {
          padding: 12px 0 !important;
          flex-direction: column !important;
          text-align: center !important;
          gap: 12px !important;
        }
        
        .emma-chat-title {
          font-size: 20px !important;
        }
        
        .emma-chat-subtitle {
          font-size: 14px !important;
        }
        
        /* Close Button */
        .chat-close-btn {
          top: 8px !important;
          right: 8px !important;
          width: 36px !important;
          height: 36px !important;
        }
        
        /* Message Bubbles */
        .user-message .message-bubble,
        .emma-message .message-content {
          max-width: calc(100% - 20px) !important;
          font-size: 15px !important;
        }
        
        /* Settings Modal */
        .emma-settings-modal .settings-content {
          padding: 20px !important;
          margin: 10px !important;
          max-height: calc(100vh - 40px) !important;
          overflow-y: auto !important;
        }
      }
      
      /* ================================
         ORBALL MENU POSITIONING FIXES
         ================================ */
      
      @media (max-width: 768px) {
        /* Radial Menu Container */
        .radial-menu {
          width: 100vw !important;
          height: 100vh !important;
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
        }
        
        /* Radial Menu Items - Properly Anchored */
        .radial-item {
          width: 70px !important;
          height: 70px !important;
          position: absolute !important;
          transform-origin: center center !important;
        }
        
        .radial-item-icon {
          font-size: 20px !important;
        }
        
        .radial-item-label {
          font-size: 10px !important;
          margin-top: 2px !important;
        }
        
        /* Emma Orb Container */
        .emma-orb-container {
          width: 100px !important;
          height: 100px !important;
          position: fixed !important;
          left: 50% !important;
          top: 50% !important;
          transform: translate(-50%, -50%) !important;
        }
        
        /* Center positioning for mobile */
        .center-container {
          position: fixed !important;
          left: 50% !important;
          top: 50% !important;
          transform: translate(-50%, -50%) !important;
        }
        
        /* Memory constellation nodes */
        .memory-node {
          width: 60px !important;
          height: 60px !important;
          font-size: 12px !important;
        }
        
        /* Utility icons positioning */
        .utility-icons {
          bottom: 20px !important;
          left: 20px !important;
          gap: 12px !important;
        }
        
        .utility-item {
          width: 44px !important;
          height: 44px !important;
        }
      }
      
      /* ================================
         TABLET OPTIMIZATIONS
         ================================ */
      
      @media (min-width: 769px) and (max-width: 1024px) {
        .experience-popup-container {
          width: 90vw !important;
          height: 85vh !important;
          max-width: 700px !important;
        }
        
        .radial-item {
          width: 80px !important;
          height: 80px !important;
        }
        
        .emma-orb-container {
          width: 140px !important;
          height: 140px !important;
        }
      }
      
      /* ================================
         LANDSCAPE MOBILE FIXES
         ================================ */
      
      @media (max-width: 768px) and (orientation: landscape) {
        .experience-popup-container {
          height: calc(100vh - 20px) !important;
          width: calc(100vw - 40px) !important;
        }
        
        .emma-chat-messages {
          max-height: calc(100vh - 180px) !important;
        }
        
        .radial-menu {
          width: 100vw !important;
          height: 100vh !important;
        }
      }
      
      /* ================================
         TOUCH IMPROVEMENTS
         ================================ */
      
      @media (pointer: coarse) {
        /* All touch targets minimum 44px */
        .radial-item,
        .voice-btn,
        .settings-btn,
        .send-btn,
        .chat-close-btn,
        .utility-item {
          min-width: 44px !important;
          min-height: 44px !important;
        }
        
        /* Larger tap areas */
        .radial-item {
          padding: 8px !important;
        }
        
        /* Prevent text selection on touch */
        .radial-item,
        .emma-orb-container,
        .utility-item {
          -webkit-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
        }
      }
      
      /* ================================
         ACCESSIBILITY FIXES
         ================================ */
      
      @media (prefers-reduced-motion: reduce) {
        .radial-item,
        .emma-orb-container,
        .experience-popup-container {
          animation: none !important;
          transition: none !important;
        }
      }
      
      /* High contrast mode support */
      @media (prefers-contrast: high) {
        .radial-item {
          border-width: 3px !important;
        }
        
        .experience-popup-content {
          border-width: 3px !important;
        }
      }
    `;
    
    document.head.appendChild(style);
    console.log('📱 Mobile CSS fixes injected');
  }
  
  /**
   * Fix chat UI responsiveness
   */
  fixChatUIResponsiveness() {
    // Override ExperiencePopup positioning for chat
    if (window.EmmaChatExperience) {
      const originalShow = window.EmmaChatExperience.prototype.show;
      
      window.EmmaChatExperience.prototype.show = function() {
        // Apply mobile-specific positioning
        if (window.innerWidth <= 768) {
          this.position = {
            left: 10,
            top: 20,
            width: window.innerWidth - 20,
            height: window.innerHeight - 40
          };
        } else if (window.innerWidth <= 1024) {
          this.position = {
            left: (window.innerWidth - 700) / 2,
            top: (window.innerHeight - 600) / 2,
            width: 700,
            height: 600
          };
        }
        
        return originalShow.call(this);
      };
    }
    
    // Fix existing chat instances
    this.fixExistingChatInstances();
    
    console.log('📱 Chat UI responsiveness fixed');
  }
  
  /**
   * Fix existing chat instances
   */
  fixExistingChatInstances() {
    const chatContainers = document.querySelectorAll('.experience-popup-container');
    chatContainers.forEach(container => {
      if (this.isMobile) {
        container.style.cssText += `
          width: calc(100vw - 20px) !important;
          height: calc(100vh - 40px) !important;
          top: 20px !important;
          left: 10px !important;
          right: 10px !important;
          bottom: 20px !important;
          position: fixed !important;
        `;
      }
    });
  }
  
  /**
   * Fix Emma orb menu positioning to be properly anchored
   */
  fixOrbMenuPositioning() {
    // Override the dashboard's radial menu positioning
    if (window.emmaDashboard || window.EmmaDashboard) {
      this.fixDashboardRadialPositioning();
    }
    
    // Set up proper radial menu positioning
    this.setupProperRadialPositioning();
    
    console.log('🎯 Orb menu positioning fixed');
  }
  
  /**
   * Fix dashboard radial positioning
   */
  fixDashboardRadialPositioning() {
    // Override the initNeuralNetwork method to fix positioning
    const originalInitNeuralNetwork = window.emmaDashboard?.initNeuralNetwork;
    
    if (originalInitNeuralNetwork) {
      window.emmaDashboard.initNeuralNetwork = () => {
        const items = document.querySelectorAll('.radial-item');
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // Calculate proper radius for mobile
        let radius;
        if (this.isMobile) {
          radius = Math.min(window.innerWidth, window.innerHeight) * 0.25;
        } else if (this.isTablet) {
          radius = 180;
        } else {
          radius = 220;
        }
        
        // Clear existing nodes
        window.emmaDashboard.nodes = [];
        
        items.forEach((item, i) => {
          const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          
          // CRITICAL: Properly center the element
          const elementSize = this.isMobile ? 35 : 45; // Half of element size
          item.style.position = 'absolute';
          item.style.left = (x - elementSize) + 'px';
          item.style.top = (y - elementSize) + 'px';
          item.style.transform = 'none'; // Remove any conflicting transforms
          
          console.log(`🎯 FIXED: Positioned radial item ${i} at center(${centerX}, ${centerY}) + radius(${radius}) = (${x}, ${y}) -> DOM(${x - elementSize}, ${y - elementSize})`);
          
          window.emmaDashboard.nodes.push({
            element: item,
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            baseX: x,
            baseY: y,
            angle: angle,
            connections: []
          });
        });
        
        // Set up connections
        window.emmaDashboard.nodes.forEach((node, i) => {
          const next = window.emmaDashboard.nodes[(i + 1) % window.emmaDashboard.nodes.length];
          const prev = window.emmaDashboard.nodes[(i - 1 + window.emmaDashboard.nodes.length) % window.emmaDashboard.nodes.length];
          node.connections.push(next, prev);
        });
        
        console.log('🎯 Fixed radial menu positioning with', window.emmaDashboard.nodes.length, 'properly anchored nodes');
      };
      
      // Re-initialize if dashboard exists
      if (window.emmaDashboard.nodes) {
        window.emmaDashboard.initNeuralNetwork();
      }
    }
  }
  
  /**
   * Set up proper radial positioning for any radial menu
   */
  setupProperRadialPositioning() {
    // Function to reposition radial items properly
    const repositionRadialItems = () => {
      const radialMenu = document.querySelector('.radial-menu');
      const radialItems = document.querySelectorAll('.radial-item');
      const orbContainer = document.querySelector('.emma-orb-container');
      
      if (!radialItems.length) return;
      
      // Get the actual center of the Emma orb
      let centerX, centerY;
      
      if (orbContainer) {
        const orbRect = orbContainer.getBoundingClientRect();
        centerX = orbRect.left + orbRect.width / 2;
        centerY = orbRect.top + orbRect.height / 2;
      } else {
        // Fallback to screen center
        centerX = window.innerWidth / 2;
        centerY = window.innerHeight / 2;
      }
      
      // Calculate radius based on screen size
      let radius;
      if (this.isMobile) {
        radius = Math.min(window.innerWidth, window.innerHeight) * 0.25;
      } else if (this.isTablet) {
        radius = 180;
      } else {
        radius = 220;
      }
      
      // Position each radial item around the orb center
      radialItems.forEach((item, i) => {
        const angle = (i / radialItems.length) * Math.PI * 2 - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        // Get element size for proper centering
        const itemSize = this.isMobile ? 35 : 45; // Half of actual size
        
        // Apply position relative to viewport
        item.style.position = 'fixed';
        item.style.left = (x - itemSize) + 'px';
        item.style.top = (y - itemSize) + 'px';
        item.style.transform = 'none';
        item.style.zIndex = '1000';
        
        console.log(`🎯 ANCHORED: Item ${i} to orb center(${centerX}, ${centerY}) at angle ${angle} -> position(${x - itemSize}, ${y - itemSize})`);
      });
    };
    
    // Apply positioning immediately
    repositionRadialItems();
    
    // Reposition on window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.viewport = this.getViewportInfo();
        this.isMobile = this.detectMobile();
        this.isTablet = this.detectTablet();
        repositionRadialItems();
      }, 100);
    });
    
    // Reposition when radial menu becomes active
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target;
          if (target.classList.contains('radial-menu') && target.classList.contains('active')) {
            setTimeout(repositionRadialItems, 50); // Small delay for animation
          }
        }
      });
    });
    
    const radialMenu = document.querySelector('.radial-menu');
    if (radialMenu) {
      observer.observe(radialMenu, { attributes: true, attributeFilter: ['class'] });
    }
  }
  
  /**
   * Fix experience popup positioning for mobile
   */
  fixExperiencePopupPositioning() {
    // Override ExperiencePopup base class if available
    if (window.ExperiencePopup) {
      const originalCreateOverlay = window.ExperiencePopup.prototype.createOverlay;
      
      window.ExperiencePopup.prototype.createOverlay = function() {
        const overlay = originalCreateOverlay.call(this);
        
        // Apply mobile-specific styles
        if (window.innerWidth <= 768) {
          const container = overlay.querySelector('.experience-popup-container');
          if (container) {
            container.style.cssText += `
              width: calc(100vw - 20px) !important;
              height: calc(100vh - 40px) !important;
              max-width: none !important;
              max-height: none !important;
              top: 20px !important;
              left: 10px !important;
              right: 10px !important;
              bottom: 20px !important;
              position: fixed !important;
            `;
          }
        }
        
        return overlay;
      };
    }
    
    console.log('📱 Experience popup positioning fixed');
  }
  
  /**
   * Set up responsive listeners
   */
  setupResponsiveListeners() {
    let resizeTimeout;
    
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.handleResize();
      }, 150);
    });
    
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.handleOrientationChange();
      }, 300); // Wait for orientation change to complete
    });
    
    console.log('📱 Responsive listeners set up');
  }
  
  /**
   * Handle window resize
   */
  handleResize() {
    const wasMobile = this.isMobile;
    const wasTablet = this.isTablet;
    
    this.isMobile = this.detectMobile();
    this.isTablet = this.detectTablet();
    this.viewport = this.getViewportInfo();
    
    console.log('📱 Resize detected:', {
      wasMobile, isMobile: this.isMobile,
      wasTablet, isTablet: this.isTablet,
      viewport: this.viewport
    });
    
    // If device type changed, reapply fixes
    if (wasMobile !== this.isMobile || wasTablet !== this.isTablet) {
      this.fixExistingChatInstances();
      this.fixOrbMenuPositioning();
    }
    
    // Update CSS custom properties for dynamic sizing
    document.documentElement.style.setProperty('--viewport-width', this.viewport.width + 'px');
    document.documentElement.style.setProperty('--viewport-height', this.viewport.height + 'px');
  }
  
  /**
   * Handle orientation change
   */
  handleOrientationChange() {
    console.log('📱 Orientation changed to:', this.viewport.orientation);
    
    // Update viewport info
    this.viewport = this.getViewportInfo();
    
    // Reapply fixes for new orientation
    this.fixExistingChatInstances();
    this.fixOrbMenuPositioning();
    
    // Force a repaint to ensure proper positioning
    document.body.style.display = 'none';
    document.body.offsetHeight; // Trigger reflow
    document.body.style.display = '';
  }
  
  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      isMobile: this.isMobile,
      isTablet: this.isTablet,
      viewport: this.viewport,
      radialItems: document.querySelectorAll('.radial-item').length,
      chatContainers: document.querySelectorAll('.experience-popup-container').length,
      orbContainer: !!document.querySelector('.emma-orb-container')
    };
  }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure other systems are loaded
  setTimeout(() => {
    window.emmaMobileUIFixes = new EmmaMobileUIFixes();
    console.log('📱 Emma Mobile UI Fixes ready:', window.emmaMobileUIFixes.getDebugInfo());
  }, 500);
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
  // DOM still loading, wait for DOMContentLoaded
} else {
  // DOM already loaded, initialize immediately
  setTimeout(() => {
    if (!window.emmaMobileUIFixes) {
      window.emmaMobileUIFixes = new EmmaMobileUIFixes();
      console.log('📱 Emma Mobile UI Fixes ready (immediate):', window.emmaMobileUIFixes.getDebugInfo());
    }
  }, 100);
}

// Export for manual initialization if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmmaMobileUIFixes;
}
