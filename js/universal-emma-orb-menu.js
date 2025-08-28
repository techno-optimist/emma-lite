/**
 * Universal Emma Orb Menu
 * A self-contained, reusable menu component with connected nodes
 * 
 * Features:
 * - 3 nodes (Memories, Chat, People) connected to central Emma orb
 * - Thin constellation-style connecting lines
 * - Click orb to open/close
 * - Gentle fade animations
 * - Easily pluggable across all pages
 * 
 * Usage:
 * const menu = new UniversalEmmaOrbMenu(container, options);
 */

class UniversalEmmaOrbMenu {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.options = {
      orbSize: 120,
      nodeSize: 90,
      radius: 140,
      lineColor: 'rgba(134, 88, 255, 0.3)',
      lineWidth: 2,
      animationDuration: 400,
      ...options
    };
    
    this.isOpen = false;
    this.nodes = [];
    this.canvas = null;
    this.ctx = null;
    
    this.menuItems = [
      {
        id: 'memories',
        label: 'Memories',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-2.5 2.5M6.5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H6.5z"/>
          <path d="M9 10h6M9 14h4"/>
        </svg>`,
        action: 'memories'
      },
      {
        id: 'chat',
        label: 'Chat',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>`,
        action: 'chat'
      },
      {
        id: 'people',
        label: 'People',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>`,
        action: 'people'
      }
    ];
    
    this.init();
  }
  
  init() {
    this.createHTML();
    this.createCanvas();
    // NO WebGL orb - original dashboard handles this
    this.setupEventListeners();
    // DON'T position elements on init - only when menu is actually open
    
    console.log('🌟 Universal Connected Nodes initialized (lines will appear when menu opens)');
  }
  
  createHTML() {
    this.container.innerHTML = `
      <div class="universal-orb-menu" style="
        position: relative;
        width: 100%;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <!-- Connection Canvas -->
        <canvas class="orb-connections" style="
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
        "></canvas>
        
        <!-- NO CENTRAL ORB - Original handles this -->
        
        <!-- NO MENU NODES - Using actual radial menu items -->
      </div>
    `;
  }
  
  createCanvas() {
    this.canvas = this.container.querySelector('.orb-connections');
    this.ctx = this.canvas.getContext('2d');
    
    // CRITICAL: Set canvas to full viewport size immediately
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    
    console.log('🔗 Canvas created:', {
      width: this.canvas.width,
      height: this.canvas.height,
      canvasElement: !!this.canvas,
      context: !!this.ctx
    });
    
    // Set canvas size
    this.resizeCanvas();
    
    // Handle resize
    window.addEventListener('resize', () => this.resizeCanvas());
  }
  
  resizeCanvas() {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    
    console.log('🔗 Canvas resized:', {
      width: this.canvas.width,
      height: this.canvas.height,
      containerRect: rect
    });
    
    // Redraw connections after resize
    setTimeout(() => {
      this.drawConnections();
    }, 50);
  }
  
  initWebGLOrb() {
    // RESTORED: Initialize the beautiful WebGL Emma orb
    try {
      const orbContainer = this.container.querySelector('#webgl-orb-container');
      if (!orbContainer) {
        console.warn('🌟 WebGL orb container not found');
        return;
      }

      // Check if EmmaOrb class is available
      if (window.EmmaOrb) {
        try {
          console.log('🌟 Initializing beautiful WebGL Emma orb');
          
          // Create the gorgeous WebGL Emma Orb with EXACT original settings
          this.webglOrb = new window.EmmaOrb(orbContainer, {
            hue: 270, // Emma's signature purple-pink
            hoverIntensity: 0.35, // ORIGINAL SETTING
            rotateOnHover: true,
            forceHoverState: false // ORIGINAL SETTING
          });
          
          console.log('✨ Beautiful WebGL Emma orb restored successfully!');
        } catch (webglError) {
          console.error('❌ WebGL orb creation failed:', webglError);
          this.applyFallbackOrb(orbContainer);
        }
      } else {
        console.warn('🌟 EmmaOrb class not available - using fallback');
        this.applyFallbackOrb(orbContainer);
      }
    } catch (error) {
      console.error('❌ Error initializing WebGL orb:', error);
    }
  }
  
  applyFallbackOrb(orbContainer) {
    // EXACT original fallback styling
    orbContainer.style.background = 'radial-gradient(circle at 30% 30%, #8658ff, #4f46e5, #f093fb)';
    orbContainer.style.borderRadius = '50%';
    orbContainer.style.width = '100%';
    orbContainer.style.height = '100%';
    orbContainer.style.boxShadow = '0 0 40px rgba(134, 88, 255, 0.6), inset 0 0 40px rgba(255, 255, 255, 0.1)';
  }
  
  setupEventListeners() {
    // NO event listeners needed - just drawing lines to actual radial menu
    console.log('🔗 Universal Orb Menu: Setup complete (lines only, no interactive nodes)');
    
    // Handle resize to redraw lines
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      // Redraw connections after resize
      setTimeout(() => {
        this.positionElements();
      }, 100);
    });
  }
  
  positionElements() {
    // CRITICAL: Only draw lines if radial menu is actually open/active
    const radialMenu = document.getElementById('radial-menu');
    const emmaDashboard = window.emmaDashboard;
    
    // Check if radial menu is active/open
    const isRadialMenuOpen = radialMenu && radialMenu.classList.contains('active');
    const isDashboardMenuOpen = emmaDashboard && emmaDashboard.isMenuOpen;
    
    console.log('🔗 Universal Orb Menu positioning check:', {
      radialMenuExists: !!radialMenu,
      radialMenuActive: isRadialMenuOpen,
      dashboardMenuOpen: isDashboardMenuOpen,
      shouldDrawLines: isRadialMenuOpen || isDashboardMenuOpen
    });
    
    // CRITICAL: Only proceed if menu is actually open
    if (!isRadialMenuOpen && !isDashboardMenuOpen) {
      console.log('🔗 Radial menu not open - clearing lines');
      this.nodes = [];
      this.clearCanvas();
      return;
    }
    
    // Get actual orb position
    let centerX, centerY;
    if (emmaDashboard && emmaDashboard.orb) {
      const orbRect = emmaDashboard.orb.getBoundingClientRect();
      centerX = orbRect.left + orbRect.width / 2;
      centerY = orbRect.top + orbRect.height / 2;
      console.log('🔗 Using ACTUAL orb position:', { centerX, centerY });
    } else {
      console.log('🔗 No dashboard orb found - skipping');
      return;
    }
    
    // Get actual radial menu items
    const actualRadialItems = radialMenu ? radialMenu.querySelectorAll('.radial-item') : [];
    console.log('🔗 Found actual radial items:', actualRadialItems.length);
    
    // Clear our nodes array and populate with actual radial item positions
    this.nodes = [];
    
    actualRadialItems.forEach((item, index) => {
      const itemRect = item.getBoundingClientRect();
      
      // Only add items that are actually visible (not at 0,0 or hidden)
      if (itemRect.width > 0 && itemRect.height > 0) {
        const itemCenterX = itemRect.left + itemRect.width / 2;
        const itemCenterY = itemRect.top + itemRect.height / 2;
        
        // Store position for line drawing
        this.nodes[index] = {
          element: item,
          x: itemCenterX,
          y: itemCenterY,
          centerX: centerX,
          centerY: centerY
        };
        
        console.log(`🔗 Visible radial item ${index} at:`, {
          x: itemCenterX,
          y: itemCenterY
        });
      }
    });
    
    // Draw connecting lines after positioning
    setTimeout(() => {
      this.drawConnections();
    }, 100);
  }
  
  clearCanvas() {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
  
  drawConnections() {
    if (!this.ctx) return;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // CRITICAL: Get ACTUAL Emma orb position for line drawing
    const emmaDashboard = window.emmaDashboard;
    let centerX, centerY;
    
    if (emmaDashboard && emmaDashboard.orb) {
      const orbRect = emmaDashboard.orb.getBoundingClientRect();
      centerX = orbRect.left + orbRect.width / 2;
      centerY = orbRect.top + orbRect.height / 2;
    } else {
      // Fallback to viewport center
      centerX = window.innerWidth / 2;
      centerY = window.innerHeight / 2;
    }
    
    this.ctx.strokeStyle = this.options.lineColor;
    this.ctx.lineWidth = this.options.lineWidth;
    this.ctx.lineCap = 'round';
    
    console.log('🔗 Drawing connections from center:', { centerX, centerY, nodeCount: this.nodes.length });
    
    this.nodes.forEach((node, index) => {
      console.log(`🔗 Drawing line ${index}:`, {
        from: { x: centerX, y: centerY },
        to: { x: node.x, y: node.y }
      });
      
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.lineTo(node.x, node.y);
      this.ctx.stroke();
    });
  }
  
  // Refresh connections when radial menu state changes
  refreshConnections() {
    console.log('🔗 Refreshing Universal Orb Menu connections');
    this.positionElements();
  }
  
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
  
  open() {
    this.isOpen = true;
    
    // Show nodes with staggered animation
    const nodes = this.container.querySelectorAll('.menu-node');
    nodes.forEach((node, index) => {
      setTimeout(() => {
        node.style.opacity = '1';
      }, index * 50);
    });
    
    // Draw connections after a brief delay
    setTimeout(() => {
      this.drawConnections();
    }, 100);
    
    // Dispatch custom event
    this.container.dispatchEvent(new CustomEvent('orb-menu-opened'));
  }
  
  close() {
    this.isOpen = false;
    
    // Hide nodes
    const nodes = this.container.querySelectorAll('.menu-node');
    nodes.forEach(node => {
      node.style.opacity = '0';
    });
    
    // Clear connections
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    // Dispatch custom event
    this.container.dispatchEvent(new CustomEvent('orb-menu-closed'));
  }
  
  handleAction(action) {
    console.log('🎯 Universal Orb Menu: Action triggered:', action);
    
    // Close menu after action
    this.close();
    
    // Dispatch action event with detail
    this.container.dispatchEvent(new CustomEvent('orb-menu-action', {
      detail: { action }
    }));
    
    // Default actions (can be overridden by event listeners)
    switch(action) {
      case 'memories':
        if (window.emmaDashboard && window.emmaDashboard.enterMemoryConstellation) {
          window.emmaDashboard.enterMemoryConstellation();
        } else {
          console.log('🎯 Navigate to memories');
        }
        break;
      case 'chat':
        if (window.emmaDashboard && window.emmaDashboard.startEmmaChatExperience) {
          window.emmaDashboard.startEmmaChatExperience();
        } else {
          console.log('🎯 Open chat');
        }
        break;
      case 'people':
        window.location.href = 'pages/people-emma.html';
        break;
      default:
        console.log('🎯 Unknown action:', action);
    }
  }
  
  // Public API methods
  setOrbIcon(icon) {
    const orbContent = this.container.querySelector('.emma-orb-center span');
    if (orbContent) {
      orbContent.innerHTML = icon;
    }
  }
  
  updateNodeAction(nodeId, newAction) {
    const node = this.container.querySelector(`[data-action="${nodeId}"]`);
    if (node) {
      node.dataset.action = newAction;
    }
  }
  
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    window.removeEventListener('resize', () => this.resizeCanvas());
  }
}

// Auto-initialize if element exists
document.addEventListener('DOMContentLoaded', () => {
  const orbContainer = document.getElementById('universal-orb-menu');
  if (orbContainer) {
    window.universalOrbMenu = new UniversalEmmaOrbMenu(orbContainer);
  }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UniversalEmmaOrbMenu;
}

// Global access
window.UniversalEmmaOrbMenu = UniversalEmmaOrbMenu;
