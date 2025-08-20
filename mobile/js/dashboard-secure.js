// app/js/dashboard-secure.js - Extracted dashboard functionality for CSP compliance
// SECURITY: External script file to eliminate inline JavaScript

// Dashboard Controller
class EmmaDashboard {
  constructor() {
    this.orb = document.getElementById('emma-orb');
    this.radialMenu = document.getElementById('radial-menu');
    this.voiceIndicator = document.getElementById('voice-indicator');
    this.loading = document.getElementById('loading');
    
    console.log('🔧 Constructor - radialMenu:', this.radialMenu);
    console.log('🔧 Constructor - radial items:', this.radialMenu ? this.radialMenu.querySelectorAll('.radial-item').length : 'NULL');
    this.panels = {
      dailyBrief: document.getElementById('daily-brief'),
      aiInsights: document.getElementById('ai-insights'),
      quickActions: document.getElementById('quick-actions')
    };
    
    this.isMenuOpen = false;
    this.stats = { memories: 0, people: 0, today: 0 };
    this.particles = [];
    this.nodes = [];
    this.neuralCanvas = document.getElementById('neural-canvas');
    this.neuralCtx = this.neuralCanvas.getContext('2d');
    
    // Neural memory network properties
    this.isConstellationMode = false;
    this.constellationMemories = [];
    this.centralNeuron = null;
    
    // Initialize WebGL Emma Orb
    this.initEmmaOrb();
    
    this.init();
  }

  async init() {
    // Show loading
    this.loading.classList.add('active');
    
    // Initialize constellation background
    this.initConstellation();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Load initial data
    await this.loadDashboardData();
    
    // Animate panels based on time of day
    this.showContextualPanels();
    
    // Hide loading
    setTimeout(() => {
      this.loading.classList.remove('active');
    }, 1500);
    
    // Start background animations
    this.startAnimations();
  }

  initConstellation() {
    const canvas = document.getElementById('constellation');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    
    // Create memory particles
    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2
      });
    }
    
    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw particles
      this.particles.forEach((p, i) => {
        // Update position
        p.x += p.vx;
        p.y += p.vy;
        
        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(134, 88, 255, ${p.opacity})`;
        ctx.fill();
        
        // Draw connections
        this.particles.forEach((p2, j) => {
          if (i !== j) {
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 100) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `rgba(134, 88, 255, ${(1 - dist / 100) * 0.2})`;
              ctx.stroke();
            }
          }
        });
      });
      
      requestAnimationFrame(animate);
    };
    animate();
  }

  setupEventListeners() {
    // Orb click - exit constellation or toggle menu
    this.orb.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.isConstellationMode) {
        // Simple: Exit constellation mode back to main dashboard
        this.exitMemoryConstellation();
      } else {
        this.toggleRadialMenu();
      }
    });
    
    // Radial menu items
    this.radialMenu.querySelectorAll('.radial-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        this.handleRadialAction(action);
      });
    });
    
    // Track mouse position for neural effects
    this.mouseX = 0;
    this.mouseY = 0;
    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      
      // Add proximity effects to nodes (both menu and constellation modes)
      if ((this.isMenuOpen || this.isConstellationMode) && this.nodes.length > 0) {
        this.nodes.forEach(node => {
          const dist = Math.sqrt(
            Math.pow(this.mouseX - node.x, 2) + 
            Math.pow(this.mouseY - node.y, 2)
          );
          
          if (dist < 150) {
            // Gentle repel nodes from mouse (petri dish organisms)
            const force = (150 - dist) / 150;
            const angle = Math.atan2(node.y - this.mouseY, node.x - this.mouseX);
            node.vx += Math.cos(angle) * force * 0.5; // Much gentler repulsion
            node.vy += Math.sin(angle) * force * 0.5;
            
            // Add glow effect (stronger for memory nodes)
            const glowStrength = this.isConstellationMode ? 60 : 40;
            const baseOpacity = this.isConstellationMode ? 0.8 : 0.6;
            node.element.style.boxShadow = `0 0 ${glowStrength + force * 30}px rgba(134, 88, 255, ${baseOpacity + force * 0.4})`;
          } else {
            const defaultGlow = this.isConstellationMode ? '0 0 40px rgba(134, 88, 255, 0.4)' : '0 0 30px rgba(134, 88, 255, 0.2)';
            node.element.style.boxShadow = defaultGlow;
          }
        });
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        this.startVoiceCapture();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.handleRadialAction('search');
      } else if (e.key === 'Escape' && this.isMenuOpen) {
        this.toggleRadialMenu();
      }
    });
    
    // Click outside to close menu
    document.addEventListener('click', (e) => {
      if (this.isMenuOpen && !this.orb.contains(e.target) && !this.radialMenu.contains(e.target)) {
        console.log('🚨 Document click closing menu - target:', e.target);
        this.toggleRadialMenu();
      }
    });
    
    // Hover effects for orb
    this.orb.addEventListener('mouseenter', () => {
      document.querySelectorAll('.quick-stats').forEach(el => {
        el.style.opacity = '1';
      });
    });
  }

  async loadDashboardData() {
    try {
      // Load vault status (store but don't show on central orb)
      if (window.emmaAPI && window.emmaAPI.vault) {
        try {
          const status = await window.emmaAPI.vault.status();
          window.currentVaultStatus = status || { isUnlocked: false };
        } catch (e) {
          console.warn('⚠️ Vault status unavailable:', e.message);
          window.currentVaultStatus = { isUnlocked: false };
        }
        
        // Load stats safely
        try {
          const stats = await window.emmaAPI.vault.stats();
          this.updateStats({
            memories: (stats && stats.totalMemories) || 42,
            people: (stats && stats.totalPeople) || 12,
            today: (stats && stats.todayMemories) || 3
          });
        } catch (e) {
          console.warn('⚠️ Vault stats unavailable:', e.message);
          this.updateStats({ memories: 42, people: 12, today: 3 });
        }
      } else {
        // Demo data when API not available
        console.log('🎭 Using demo data - Emma API not available');
        window.currentVaultStatus = { isUnlocked: false };
        this.updateStats({ memories: 42, people: 12, today: 3 });
      }
    } catch (error) {
      console.error('🚨 Dashboard data load error:', error);
      // Fallback to demo data
      window.currentVaultStatus = { isUnlocked: false };
      this.updateStats({ memories: 42, people: 12, today: 3 });
    }
  }

  updateStats(newStats) {
    Object.assign(this.stats, newStats);
    
    // Animate number changes
    Object.keys(newStats).forEach(key => {
      const element = document.getElementById(`stat-${key}`);
      if (element) {
        const start = parseInt(element.textContent) || 0;
        const end = this.stats[key];
        const duration = 1000;
        const startTime = Date.now();
        
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const current = Math.floor(start + (end - start) * progress);
          element.textContent = current;
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        animate();
      }
    });
  }

  showContextualPanels() {
    const hour = new Date().getHours();
    
    // Show all panels for demo
    setTimeout(() => {
      // Show all available panels
      if (this.panels.dailyBrief) this.panels.dailyBrief.classList.add('active');
      if (this.panels.aiInsights) this.panels.aiInsights.classList.add('active');
      if (this.panels.quickActions) this.panels.quickActions.classList.add('active');
    }, 1000);
  }

  startAnimations() {
    // Implement remaining animation methods...
    console.log('🎬 Starting background animations');
  }

  // Add simplified versions of other methods for CSP compliance
  initEmmaOrb() {
    try {
      const orbContainer = document.getElementById('webgl-orb-container');
      if (!orbContainer) {
        console.warn('🌟 WebGL orb container not found');
        return;
      }
      
      if (window.EmmaOrb) {
        // Create WebGL Emma Orb with Emma's signature purple-pink hue
        this.webglOrb = new window.EmmaOrb(orbContainer, {
          hue: 270, // Purple-pink Emma colors
          hoverIntensity: 0.35,
          rotateOnHover: true,
          forceHoverState: false
        });
        console.log('🌟 WebGL Emma Orb initialized successfully');
      } else {
        console.warn('🌟 EmmaOrb class not available, using fallback');
        // Fallback to simple gradient if EmmaOrb class not loaded
        orbContainer.style.background = 'radial-gradient(circle at 30% 30%, #8658ff, #4f46e5)';
        orbContainer.style.borderRadius = '50%';
        orbContainer.style.width = '100%';
        orbContainer.style.height = '100%';
      }
    } catch (error) {
      console.error('🚨 Error initializing Emma Orb:', error);
      // Ensure fallback is applied
      const orbContainer = document.getElementById('webgl-orb-container');
      if (orbContainer) {
        orbContainer.style.background = 'radial-gradient(circle at 30% 30%, #8658ff, #4f46e5)';
        orbContainer.style.borderRadius = '50%';
        orbContainer.style.width = '100%';
        orbContainer.style.height = '100%';
      }
    }
  }

  toggleRadialMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    console.log('🎯 Toggle menu:', this.isMenuOpen);
    
    if (this.isMenuOpen) {
      this.radialMenu.classList.add('active');
      document.body.classList.add('menu-active');
    } else {
      this.radialMenu.classList.remove('active');
      document.body.classList.remove('menu-active');
    }
  }

  handleRadialAction(action) {
    console.log('🎯 Radial action:', action);
    this.toggleRadialMenu(); // Close menu after action
    
    switch (action) {
      case 'voice':
        this.startVoiceCapture();
        break;
      case 'chat':
        this.openEmmaChatExperience();
        break;
      case 'memories':
        this.openMemoryGallery();
        break;
      case 'vault':
        this.openVaultModal();
        break;
      case 'share':
        this.openShareExperience();
        break;
      case 'search':
        this.showToast('🔍 Search coming soon!', 'info');
        break;
      default:
        this.showToast(`Action: ${action}`, 'info');
    }
  }

  async startVoiceCapture() {
    console.log('🎤 Starting voice capture...');
    try {
      if (window.VoiceCaptureExperience) {
        this.voiceCaptureExperience = new VoiceCaptureExperience({ 
          source: 'dashboard', 
          mode: 'voice_only' 
        });
        await this.voiceCaptureExperience.show();
      } else {
        this.showToast('🎤 Voice capture system loading...', 'info');
      }
    } catch (error) {
      console.error('🎤 Voice capture error:', error);
      this.showToast('🎤 Voice capture unavailable', 'error');
    }
  }

  openEmmaChatExperience() {
    console.log('🤖 Opening Emma Chat...');
    try {
      if (window.EmmaChatExperience) {
        this.emmaChatExperience = new EmmaChatExperience();
        this.emmaChatExperience.show();
      } else {
        this.showToast('🤖 Chat system loading...', 'info');
      }
    } catch (error) {
      console.error('🤖 Chat error:', error);
      this.showToast('🤖 Chat unavailable', 'error');
    }
  }

  openMemoryGallery() {
    console.log('💎 Opening memory gallery...');
    window.location.href = '../memories-gallery.html';
  }

  openVaultModal() {
    const modal = document.getElementById('vault-modal');
    if (modal) {
      modal.style.display = 'flex';
      setTimeout(() => modal.classList.add('show'), 10);
    }
  }

  closeVaultModal() {
    const modal = document.getElementById('vault-modal');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => modal.style.display = 'none', 300);
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const span = document.createElement('span');
    span.textContent = message; // Safe - prevents HTML injection
    toast.appendChild(span);
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.emmaDashboard = new EmmaDashboard();
  console.log('✨ Emma Dashboard 2.0 initialized');
  
  // Setup vault modal event listeners
  const dashboard = window.emmaDashboard;
  
  // Close button
  const closeBtn = document.getElementById('close-vault-modal');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      dashboard.closeVaultModal();
    });
  }
  
  // Click outside to close
  const modal = document.getElementById('vault-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'vault-modal') {
        dashboard.closeVaultModal();
      }
    });
  }
  
  // Other event listeners...
  const unlockBtn = document.getElementById('unlock-btn');
  if (unlockBtn) {
    unlockBtn.addEventListener('click', () => {
      dashboard.unlockVault();
    });
  }
});
