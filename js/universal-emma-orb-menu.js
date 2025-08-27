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
    this.setupEventListeners();
    this.positionElements();
    
    console.log('🌟 Universal Emma Orb Menu initialized');
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
        
        <!-- Central Emma Orb -->
        <div class="emma-orb-center" style="
          position: absolute;
          width: ${this.options.orbSize}px;
          height: ${this.options.orbSize}px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          box-shadow: 0 0 40px rgba(134, 88, 255, 0.4);
          backdrop-filter: blur(20px);
          border: 2px solid rgba(255, 255, 255, 0.2);
        ">
          <span style="color: white; font-size: 24px; font-weight: 300;">💜</span>
        </div>
        
        <!-- Menu Nodes Container -->
        <div class="menu-nodes" style="
          position: absolute;
          width: 100%;
          height: 100%;
          pointer-events: none;
        ">
          ${this.menuItems.map((item, index) => `
            <div class="menu-node" data-action="${item.action}" style="
              position: absolute;
              width: ${this.options.nodeSize}px;
              height: ${this.options.nodeSize}px;
              border-radius: 50%;
              background: rgba(26, 16, 51, 0.9);
              backdrop-filter: blur(20px);
              border: 2px solid rgba(134, 88, 255, 0.3);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              opacity: 0;
              transition: opacity ${this.options.animationDuration}ms ease ${index * 50}ms, transform 0.2s ease;
              pointer-events: auto;
              z-index: 5;
              color: white;
              box-shadow: 0 0 30px rgba(134, 88, 255, 0.2);
            ">
              <div style="margin-bottom: 4px;">
                ${item.icon}
              </div>
              <div style="font-size: 12px; font-weight: 500;">
                ${item.label}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  createCanvas() {
    this.canvas = this.container.querySelector('.orb-connections');
    this.ctx = this.canvas.getContext('2d');
    
    // Set canvas size
    this.resizeCanvas();
    
    // Handle resize
    window.addEventListener('resize', () => this.resizeCanvas());
  }
  
  resizeCanvas() {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }
  
  setupEventListeners() {
    // Orb click to toggle menu
    const orb = this.container.querySelector('.emma-orb-center');
    orb.addEventListener('click', () => this.toggle());
    
    // Orb hover effects
    orb.addEventListener('mouseenter', () => {
      orb.style.transform = 'scale(1.05)';
      orb.style.boxShadow = '0 0 60px rgba(134, 88, 255, 0.6)';
    });
    
    orb.addEventListener('mouseleave', () => {
      orb.style.transform = 'scale(1)';
      orb.style.boxShadow = '0 0 40px rgba(134, 88, 255, 0.4)';
    });
    
    // Node click handlers
    const nodes = this.container.querySelectorAll('.menu-node');
    nodes.forEach(node => {
      node.addEventListener('click', (e) => {
        const action = node.dataset.action;
        this.handleAction(action);
      });
      
      // Node hover effects
      node.addEventListener('mouseenter', () => {
        node.style.transform = 'scale(1.05)';
        node.style.boxShadow = '0 0 40px rgba(134, 88, 255, 0.4)';
      });
      
      node.addEventListener('mouseleave', () => {
        node.style.transform = 'scale(1)';
        node.style.boxShadow = '0 0 30px rgba(134, 88, 255, 0.2)';
      });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.container.contains(e.target)) {
        this.close();
      }
    });
  }
  
  positionElements() {
    const containerRect = this.container.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    
    // Position nodes around the orb
    const nodes = this.container.querySelectorAll('.menu-node');
    nodes.forEach((node, index) => {
      const angle = (index / this.menuItems.length) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + Math.cos(angle) * this.options.radius - this.options.nodeSize / 2;
      const y = centerY + Math.sin(angle) * this.options.radius - this.options.nodeSize / 2;
      
      node.style.left = x + 'px';
      node.style.top = y + 'px';
      
      // Store position for line drawing
      this.nodes[index] = {
        element: node,
        x: x + this.options.nodeSize / 2,
        y: y + this.options.nodeSize / 2,
        centerX: centerX,
        centerY: centerY
      };
    });
  }
  
  drawConnections() {
    if (!this.ctx || !this.isOpen) return;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw lines from center to each node
    const containerRect = this.container.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    
    this.ctx.strokeStyle = this.options.lineColor;
    this.ctx.lineWidth = this.options.lineWidth;
    this.ctx.lineCap = 'round';
    
    this.nodes.forEach(node => {
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.lineTo(node.x, node.y);
      this.ctx.stroke();
    });
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
