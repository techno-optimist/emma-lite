'use strict';
(function attachDashboardNavigationHandlers() {
  const clickActions = {
    'navigate-settings': () => { window.location.href = 'pages/emma-settings-redesigned.html'; },
    'open-migration': () => { if (typeof openMigrationPage === 'function') { openMigrationPage(); } },
    'open-gallery': () => { window.location.href = 'pages/gallery.html'; },
    'open-settings': () => { window.location.href = 'pages/emma-settings-redesigned.html'; },
    'open-people': () => { window.location.href = 'pages/people-emma.html'; }
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-action]').forEach(element => {
      const action = element.getAttribute('data-action');
      if (clickActions[action]) {
        element.addEventListener('click', (event) => {
          event.preventDefault();
          try {
            clickActions[action]();
          } catch (error) {
            console.error('Dashboard navigation handler failed:', error);
          }
        });
      }
    });
  });
})();
    window.metadataIncludesPerson = window.metadataIncludesPerson || ((peopleList, person) => {
      if (!Array.isArray(peopleList) || !person) return false;

      const targetId = person.id ? String(person.id).trim() : '';
      if (!targetId) return false;

      const resolveEntryId = (entry) => {
        if (!entry) return null;
        if (typeof entry === 'string' || typeof entry === 'number') {
          const trimmed = String(entry).trim();
          return trimmed || null;
        }
        if (typeof entry === 'object') {
          const candidate = entry.id ?? entry.personId ?? entry.personID ?? entry.person_id ?? entry.uuid ?? entry.guid;
          if (candidate === undefined || candidate === null) return null;
          const trimmed = String(candidate).trim();
          return trimmed || null;
        }
        return null;
      };

      return peopleList.some(entry => {
        const entryId = resolveEntryId(entry);
        return entryId && entryId === targetId;
      });
    });

    window.contentMentionsPerson = window.contentMentionsPerson || ((personName, content) => {
      if (!personName || !content) return false;

      const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const words = personName.trim().split(/\s+/).filter(Boolean).map(escapeRegex);
      if (words.length === 0) return false;

      const pattern = `\\b${words.join('\\s+')}\\b(?:'s)?`;
      const regex = new RegExp(pattern, 'i');

      return regex.test(content);
    });

    // Extension mode - Skip vault session validation

    // Vault initialization moved to end of page after ALL scripts load

    // Dashboard Controller
    class EmmaDashboard {
      constructor() {
        // Original Emma Orb setup (RESTORED)
        this.orb = document.getElementById('emma-orb');
        this.radialMenu = document.getElementById('radial-menu');
        this.voiceIndicator = document.getElementById('voice-indicator');
        
        // CRITICAL: Expose dashboard globally for Emma Chat Experience
        window.emmaDashboard = this;
        this.loading = document.getElementById('loading');
        
        // Initialize WebGL Emma Orb (RESTORED ORIGINAL)
        this.initEmmaOrb();

        console.log('🔧 Constructor - Dashboard initialized with clean original system');
        this.panels = {
          dailyBrief: document.getElementById('daily-brief'),
          aiInsights: document.getElementById('ai-insights'),
          quickActions: document.getElementById('quick-actions')
        };

        // Burger menu removed for clean interface
        this.panelsVisible = false;

        // Utility icons functionality
        this.utilityIcons = document.querySelector('.utility-icons');
        this.setupUtilityIcons();

        this.isMenuOpen = false;
        this.emmaChatLoaderPromise = null;
        this.stats = { memories: 0, people: 0, today: 0 };
        this.particles = [];
        this.nodes = [];
        this.neuralCanvas = document.getElementById('neural-canvas');
        this.neuralCtx = this.neuralCanvas ? this.neuralCanvas.getContext('2d') : null;
        this.lowPowerMode = this.shouldUsePerformanceLite();
        document.body.classList.toggle('performance-lite', this.lowPowerMode);

        // Neural memory network properties
        this.isConstellationMode = false;
        this.constellationMemories = [];
        this.centralNeuron = null;
        
        // 🔍 ZOOM FUNCTIONALITY: Dashboard constellation zoom/pan state
        this.zoomState = {
          scale: 1,
          translateX: 0,
          translateY: 0,
          isDragging: false,
          lastTouchDistance: 0,
          minScale: 0.3,
          maxScale: 3.0
        };
        this.constellationContainer = null;
        this.activeNodeDrag = null;
        this.pendingNodeDrag = null;
        this.nodeDragPointerId = null;
        this.nodeDragOffset = { x: 0, y: 0 };
        this.persistLayoutDebounce = null;
        this.constellationLayoutKey = 'emmaConstellationLayoutV1';
        this.constellationFiltersKey = 'emmaConstellationFiltersV1';
        this.nodeDragStart = { x: 0, y: 0 };
        this.nodeDragThreshold = 6;
        this.nodeDragTransformData = null;
        this.touchHoldDelay = 350;
        this.nodeDragHoldTimeout = null;
        this.nodeDragHoldActive = false;
        this.nodeDragLatestEvent = null;
        this.nodeDragLastPointerType = null;
        this.touchPanDisabled = false;
        this.boundNodePointerMove = (event) => this.handleNodePointerMove(event);
        this.boundNodePointerUp = (event) => this.handleNodePointerUp(event);

        // Initialize WebGL Emma Orb
        this.initEmmaOrb();
        this.handleThemeApplied = this.handleThemeApplied.bind(this);
        window.addEventListener('emmaThemeApplied', this.handleThemeApplied);
        try {
          const activeTheme = window.emmaThemeManager && typeof window.emmaThemeManager.getActiveTheme === 'function'
            ? window.emmaThemeManager.getActiveTheme()
            : null;
          if (activeTheme) {
            this.handleThemeApplied({ detail: { theme: activeTheme } });
          }
        } catch (themeError) {
          console.warn('DASHBOARD: Unable to apply theme on init', themeError);
        }

        // Listen for vault status changes
        document.addEventListener('vaultStatusChanged', (event) => {

          this.updateVaultNodeStatus();
          this.updateAllVaultIndicators();
        });

        this.init();
      }

      // Removed Universal Orb Menu - keeping clean original system

      // Removed Universal Orb Menu action handler - using original radial menu system

      async init() {
        // Show loading
        this.loading.classList.add('active');

        // Initialize Emma's orb in loading screen
        this.initLoadingOrb();

        // Initialize constellation background
        console.log('🔍 DEBUG: About to initialize constellation, DOM ready state:', document.readyState);
        console.log('🔍 DEBUG: Constellation canvas exists?', !!document.getElementById('constellation'));
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

        // 🎯 SAFE AUTO-TRIGGER: Check URL params for constellation or memory creation
        this.handleURLParams();

        // Start background animations
        this.startAnimations();
      }

      initConstellation() {
        const canvas = document.getElementById('constellation');
        if (!canvas) {
          console.warn('⚠️ Constellation canvas not found, skipping initialization');
          return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.warn('⚠️ Could not get constellation canvas context, skipping initialization');
          return;
        }

        // Set canvas size
        const resize = () => {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Create memory particles
        const particleCount = this.shouldReduceConstellationPhysics() ? 24 : 50;
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
          const reducePhysics = this.shouldReduceConstellationPhysics();
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
            ctx.fillStyle = `rgba(111, 99, 217, ${p.opacity})`;
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
                  ctx.strokeStyle = `rgba(111, 99, 217, ${(1 - dist / 100) * 0.2})`;
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
        // RESTORED: Original Emma orb click handler
        this.orb.addEventListener('click', (e) => {
          e.stopPropagation();
          console.log('🎯 ORB CLICKED - Debug info:', {
            isConstellationMode: this.isConstellationMode,
            isMenuOpen: this.isMenuOpen,
            orbExists: !!this.orb,
            radialMenuExists: !!this.radialMenu,
            dashboardInstance: !!window.emmaDashboard
          });
          
          if (this.isConstellationMode) {
            console.log('🌌 Exiting constellation mode...');
            this.exitMemoryConstellation();
          } else {
            console.log('🔘 Toggling radial menu...');
            this.toggleRadialMenu();
          }
        });

        // RESTORED: Radial menu items
        this.radialMenu.querySelectorAll('.radial-item').forEach(item => {
          item.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = item.dataset.action;
            this.handleRadialAction(action);
          });
        });

        console.log('🎯 Event listeners setup - RESTORED original orb & radial menu');

        // Track mouse/touch position for neural effects
        this.mouseX = 0;
        this.mouseY = 0;

        // Mouse support
        document.addEventListener('mousemove', (e) => {
          this.mouseX = e.clientX;
          this.mouseY = e.clientY;
          this.updateNodeProximityEffects();
        });

        // Touch support for mobile
        document.addEventListener('touchmove', (e) => {
          if (e.touches.length > 0) {
            this.mouseX = e.touches[0].clientX;
            this.mouseY = e.touches[0].clientY;
            this.updateNodeProximityEffects();
          }
        }, { passive: true });

        document.addEventListener('touchstart', (e) => {
          if (e.touches.length > 0) {
            this.mouseX = e.touches[0].clientX;
            this.mouseY = e.touches[0].clientY;
          }
        }, { passive: true });

        // Handle window resize for responsive repositioning
        window.addEventListener('resize', () => {
          // Debounce resize events
          clearTimeout(this.resizeTimeout);
          this.resizeTimeout = setTimeout(() => {
            if (this.isMenuOpen) {
              // 🔄 MOBILE FIX: Keep radial menu bound to orb center
              this.repositionMenuToOrb();
              
              // CRITICAL FIX: Resize canvas and redraw connections after repositioning
              if (this.neuralCanvas) {
                this.neuralCanvas.width = window.innerWidth;
                this.neuralCanvas.height = window.innerHeight;
              }
              
              // Force immediate redraw of connections with new positions
              if (this.render && typeof this.render === 'function') {
                this.render();
              } else if (window.neuralRenderer && window.neuralRenderer.render) {
                window.neuralRenderer.render();
              }
            } else if (this.isConstellationMode) {
              // Existing constellation resize handling
              this.repositionNodesOnResize();
              
              if (this.neuralCanvas) {
                this.neuralCanvas.width = window.innerWidth;
                this.neuralCanvas.height = window.innerHeight;
              }
              
              if (this.render && typeof this.render === 'function') {
                this.render();
              } else if (window.neuralRenderer && window.neuralRenderer.render) {
                window.neuralRenderer.render();
              }
            }
          }, 250);
        });
      }

      // Extract proximity effects to separate method for reuse
      updateNodeProximityEffects() {
        // Add proximity effects to nodes (both menu and constellation modes)
        if ((this.isMenuOpen || this.isConstellationMode) && this.nodes.length > 0) {
          this.nodes.forEach(node => {
            const dist = Math.sqrt(
              Math.pow(this.mouseX - node.x, 2) +
              Math.pow(this.mouseY - node.y, 2)
            );

            if (dist < 120) {
              // Subtle attraction to mouse with organic feel
              const force = (120 - dist) / 120;
              const angle = Math.atan2(this.mouseY - node.y, this.mouseX - node.x);

              // Very gentle attraction with organic damping
              const attractionStrength = force * 0.08; // Much more subtle
              node.vx += Math.cos(angle) * attractionStrength;
              node.vy += Math.sin(angle) * attractionStrength;

              // Add glow effect (stronger for memory nodes)
              const glowStrength = this.isConstellationMode ? 36 : 26;
              const baseOpacity = this.isConstellationMode ? 0.6 : 0.45;
              const glowSize = glowStrength + force * 18;
              const glowOpacity = Math.min(baseOpacity + force * 0.25, 0.75);
              if (node.element) {
                node.element.style.boxShadow = `0 0 ${glowSize}px rgba(111, 99, 217, ${glowOpacity})`;
              }
            } else {
              // Reset glow when mouse is far
              if (node.element) {
                node.element.style.boxShadow = '';
              }
            }
          });
        }
      }

      // Reposition nodes on window resize for responsive behavior (CONSTELLATION MODE ONLY)
      repositionNodesOnResize() {
        if (!this.nodes || this.nodes.length === 0) return;
        
        // 🚨 CRITICAL: This function is now ONLY for constellation mode
        // Radial menu repositioning is handled by repositionMenuToOrb()
        if (!this.isConstellationMode) {
          console.warn('🚨 repositionNodesOnResize called for non-constellation mode - use repositionMenuToOrb instead');
          return;
        }

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // Reposition each constellation node
        this.nodes.forEach((node, i) => {
          // For constellation mode, maintain relative positions but scale
          const scaleX = window.innerWidth / (this.lastWindowWidth || window.innerWidth);
          const scaleY = window.innerHeight / (this.lastWindowHeight || window.innerHeight);

          node.x = centerX + (node.x - centerX) * scaleX;
          node.y = centerY + (node.y - centerY) * scaleY;
          node.baseX = node.x;
          node.baseY = node.y;

          // Update DOM position - UNIFIED: Same size for all devices
          if (node.element) {
            const elementSize = 45; // Consistent centering for all devices (90px items)
            node.element.style.left = (node.x - elementSize) + 'px';
            node.element.style.top = (node.y - elementSize) + 'px';
          }
        });

        // Store current window size for next resize
        this.lastWindowWidth = window.innerWidth;
        this.lastWindowHeight = window.innerHeight;

      }

      // Keyboard shortcuts
      setupKeyboardShortcuts() {
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

            this.toggleRadialMenu();
          }
        });

        // Hover effects for orb
        this.orb.addEventListener('mouseenter', () => {
          document.querySelectorAll('.quick-stats').forEach(el => {
            el.style.opacity = '1';
          });
        });

        // Initialize keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // RESTORED: Click outside to close menu
        document.addEventListener('click', (e) => {
          if (this.isMenuOpen && !this.orb.contains(e.target) && !this.radialMenu.contains(e.target)) {
            this.toggleRadialMenu();
          }
        });

        // RESTORED: Hover effects for orb
        this.orb.addEventListener('mouseenter', () => {
          document.querySelectorAll('.quick-stats').forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(-10px) scale(1.02)';
          });
        });

        this.orb.addEventListener('mouseleave', () => {
          document.querySelectorAll('.quick-stats').forEach(el => {
            el.style.opacity = '0.7';
            el.style.transform = 'translateY(0) scale(1)';
          });
        });

        // CRITICAL FIX: Listen for vault status changes from extension
        this.setupVaultStatusListener();
        
        // Auto-trigger constellation mode if hash is present
        if (window.location.hash === '#constellation') {
          console.log('🌟 DASHBOARD: Auto-triggering constellation mode from URL hash');
          setTimeout(() => {
            this.enterMemoryConstellation();
          }, 1000); // Wait for vault to load
        }
      }

      // Listen for vault status changes and update UI
      setupVaultStatusListener() {
        window.addEventListener('vault-status-changed', (event) => {

          // Update global status
          window.currentVaultStatus = event.detail;

          // Update vault node status in UI
          this.updateVaultNodeStatus();

          // Update any vault-dependent UI elements
          this.refreshVaultDependentUI();
        });

        // Also listen for extension-vault-ready directly
        window.addEventListener('extension-vault-ready', (event) => {

          // Ensure vault status is updated
          if (window.webVaultStatus) {
            window.webVaultStatus.status.isUnlocked = true;
            window.webVaultStatus.status.hasVault = true;
            window.webVaultStatus.status.name = event.detail.vaultName;
            window.currentVaultStatus = window.webVaultStatus.status;
          }

          // Update UI immediately
          this.updateVaultNodeStatus();
        });

        // CRITICAL: Listen for memory additions from Emma Chat
        window.addEventListener('emmaMemoryAdded', (event) => {
          console.log('🔄 DASHBOARD: Memory added event received, refreshing constellation');
          
          if (this.isConstellationMode) {
            // Force constellation refresh with new data - longer delay to ensure vault sync
            setTimeout(() => {
              this.enterMemoryConstellation();
              console.log('🔄 DASHBOARD: Constellation refreshed after memory addition');
            }, 300); // Increased delay for better data consistency
          }
        });
        window.addEventListener('emmaMemoryDeleted', (event) => {
          console.log('🗋 DASHBOARD: Memory deleted event received, refreshing constellation');
          
          if (this.isConstellationMode) {
            setTimeout(() => {
              this.enterMemoryConstellation();
              console.log('🗋 DASHBOARD: Constellation refreshed after memory deletion');
            }, 300);
          }
        });
      }

      // Refresh UI elements that depend on vault status
      refreshVaultDependentUI() {
        // Update any vault-dependent elements
        const vaultElements = document.querySelectorAll('[data-vault-dependent]');
        vaultElements.forEach(element => {
          if (window.currentVaultStatus && window.currentVaultStatus.isUnlocked) {
            element.classList.remove('vault-locked');
            element.classList.add('vault-unlocked');
          } else {
            element.classList.remove('vault-unlocked');
            element.classList.add('vault-locked');
          }
        });
      }

      shouldUsePerformanceLite() {
        try {
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const compactViewport = window.matchMedia('(max-width: 900px)').matches;
          const touchDevice = (navigator.maxTouchPoints || 0) > 1;
          return prefersReducedMotion || compactViewport || touchDevice;
        } catch (error) {
          console.warn('Performance mode detection failed (non-critical):', error);
          return false;
        }
      }

      isCompactViewport() {
        return window.innerWidth <= 768;
      }

      getConstellationNodeSize() {
        const width = window.innerWidth;
        if (width <= 480) return 56;
        if (width <= 900) return 68;
        return 80;
      }

      shouldReduceConstellationPhysics() {
        return this.lowPowerMode || this.isCompactViewport();
      }

      initNeuralNetwork() {
        // 🎯 BACK TO BASICS: Orb-relative positioning that actually works
        console.log('🔧 initNeuralNetwork: Using orb-relative positioning');

        const items = this.radialMenu.querySelectorAll('.radial-item');
        
        // 🔥 GET ACTUAL ORB POSITION: Don't force it, work with it
        const orbRect = this.orb.getBoundingClientRect();
        const orbCenterX = orbRect.left + orbRect.width / 2;
        const orbCenterY = orbRect.top + orbRect.height / 2;

        console.log('🎯 Actual orb center:', { x: orbCenterX, y: orbCenterY, orbRect });

        // 🌌 SIMPLIFIED: One radius that works great for all devices - true orbiting feel
        const radius = 140; // Proper orbiting distance - feels like satellites around Emma orb

        console.log('🌌 Using unified orbiting radius:', radius, 'px for all devices');

        // Clear existing nodes
        this.nodes = [];

        items.forEach((item, i) => {
          const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2;
          
          // 🔗 ORB-RELATIVE: Calculate position relative to actual orb center
          const targetX = orbCenterX + Math.cos(angle) * radius;
          const targetY = orbCenterY + Math.sin(angle) * radius;

          // 🎬 ANIMATION SETUP: Start at actual orb center for animate-out effect
          const startX = orbCenterX;
          const startY = orbCenterY;

          // Position at target location (no scaling animation needed)
          item.style.left = (targetX - 45) + 'px'; // Center the 90px item
          item.style.top = (targetY - 45) + 'px';
          
          // CRITICAL FIX: Ensure item is visible after exitMemoryConstellation reset
          item.style.opacity = '1';
          item.style.transform = 'scale(1)';
          
          console.log(`🔧 Item ${i} restored:`, {
            left: item.style.left,
            top: item.style.top,
            opacity: item.style.opacity,
            transform: item.style.transform
          });

          console.log(`🎯 Item ${i}: start(${startX}, ${startY}) → target(${targetX}, ${targetY})`);

          // Store position data (simplified for gentle fade)
          const nodeData = {
            element: item,
            x: targetX,      // Final position
            y: targetY,
            targetX: targetX,
            targetY: targetY,
            baseX: targetX,
            baseY: targetY,
            angle: angle,
            connections: [],
            orbBound: true
          };

          this.nodes.push(nodeData);
        });

        // Create connections between nodes
        this.nodes.forEach((node, i) => {
          // Connect to adjacent nodes
          const next = this.nodes[(i + 1) % this.nodes.length];
          const prev = this.nodes[(i - 1 + this.nodes.length) % this.nodes.length];
          node.connections.push(next, prev);

          // Connect to opposite node for cross-connections
          const opposite = this.nodes[(i + Math.floor(this.nodes.length / 2)) % this.nodes.length];
          if (opposite !== node) {
            node.connections.push(opposite);
          }
        });

        // Add central orb as a node at actual orb center
        this.centralNode = {
          x: orbCenterX,
          y: orbCenterY,
          element: this.orb
        };

        // Connect all nodes to center
        this.nodes.forEach(node => {
          node.connections.push(this.centralNode);
        });
      }

      // Removed initRadialNeuralNetwork - no longer needed since we exit constellation instead of showing menu overlay

      toggleRadialMenu() {
        console.log('🔘 toggleRadialMenu called - Debug:', {
          isMenuOpen: this.isMenuOpen,
          radialMenuExists: !!this.radialMenu,
          dashboardInstance: !!window.emmaDashboard
        });
        
        this.isMenuOpen = !this.isMenuOpen;

        if (this.isMenuOpen) {
          this.radialMenu.classList.add('active');
          document.body.classList.add('menu-active'); // Fade ALL UI elements
          document.body.classList.remove('dashboard-minimal');

          this.updateVaultNodeStatus(); // Update vault node based on status

          // Initialize the menu nodes (without aggressive physics)
          this.initNeuralNetwork();

        } else {
          this.radialMenu.classList.remove('active');
          document.body.classList.remove('menu-active');
          if (!this.isConstellationMode) {
            document.body.classList.add('dashboard-minimal');
          }

          // Clear any neural animation
          if (this.neuralAnimationId) {
            cancelAnimationFrame(this.neuralAnimationId);
            this.neuralCtx.clearRect(0, 0, this.neuralCanvas.width, this.neuralCanvas.height);
          }

          // Reset nodes array
          this.nodes = [];
        }
      }

      // Simple method to position menu items around orb with gentle fade-in
      positionMenuItemsAroundOrb() {
        const orbRect = this.orb.getBoundingClientRect();
        const orbCenterX = orbRect.left + orbRect.width / 2;
        const orbCenterY = orbRect.top + orbRect.height / 2;
        const radius = 140; // Consistent distance from orb

        const menuItems = this.radialMenu.querySelectorAll('.radial-item');
        
        menuItems.forEach((item, i) => {
          const angle = (i / menuItems.length) * Math.PI * 2 - Math.PI / 2;
          const targetX = orbCenterX + Math.cos(angle) * radius;
          const targetY = orbCenterY + Math.sin(angle) * radius;
          
          // Position the item (center the 90px item)
          item.style.left = (targetX - 45) + 'px';
          item.style.top = (targetY - 45) + 'px';
        });
      }

      // 🧠 NEURAL EXPANSION: Expand radial nodes using neural network physics
      expandRadialNeuralNetwork() {
        console.log('🧠 Expanding radial neural network from orb center');
        
        this.nodes.forEach((node, i) => {
          // Set target position for neural physics to move toward
          node.baseX = node.targetX;
          node.baseY = node.targetY;
          
          // Add initial velocity toward target (like constellation nodes)
          const dx = node.targetX - node.x;
          const dy = node.targetY - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 1) {
            // Give it momentum toward target
            node.vx = (dx / distance) * 3; // Fast initial velocity
            node.vy = (dy / distance) * 3;
          }
          
          // Show and scale the node
          setTimeout(() => {
            node.element.style.transition = 'opacity 0.1s ease, transform 0.1s ease';
            node.element.style.opacity = '1';
            node.element.style.transform = 'scale(1)';
            
            // Pause float animation during menu display
            node.element.style.animationPlayState = 'paused';
            
            console.log(`🧠 Node ${i} neural expansion initiated to (${node.targetX}, ${node.targetY})`);
          }, i * 15); // Fast stagger
        });
      }

      // 🧠 NEURAL COLLAPSE: Collapse radial nodes back to orb using neural physics
      collapseRadialNeuralNetwork() {
        console.log('🧠 Collapsing radial neural network back to orb center');
        
        // Get actual orb center position
        const orbRect = this.orb.getBoundingClientRect();
        const orbCenterX = orbRect.left + orbRect.width / 2;
        const orbCenterY = orbRect.top + orbRect.height / 2;
        
        this.nodes.forEach((node, i) => {
          // Set orb center as the new target for neural physics
          node.baseX = orbCenterX;
          node.baseY = orbCenterY;
          node.targetX = orbCenterX;
          node.targetY = orbCenterY;
          
          // Add velocity toward orb center (like constellation nodes)
          const dx = orbCenterX - node.x;
          const dy = orbCenterY - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 1) {
            // Give it momentum toward orb center
            node.vx = (dx / distance) * 4; // Fast collapse velocity
            node.vy = (dy / distance) * 4;
          }
          
          // Hide and scale down the node
          setTimeout(() => {
            node.element.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
            node.element.style.opacity = '0';
            node.element.style.transform = 'scale(0)';
            
            // Re-enable float animation when menu closes
            node.element.style.animationPlayState = 'running';
            
            console.log(`🧠 Node ${i} neural collapse initiated to orb (${orbCenterX}, ${orbCenterY})`);
          }, (this.nodes.length - 1 - i) * 20); // Fast reverse stagger
        });
      }

      // 🔄 NEW: Reposition menu items to stay bound to orb (for resize/orientation changes)
      repositionMenuToOrb() {
        if (!this.isMenuOpen || this.nodes.length === 0) return;
        
        console.log('🔄 Repositioning menu items to stay bound to orb');
        
        // Get current orb position (don't force it, work with it)
        const orbRect = this.orb.getBoundingClientRect();
        const orbCenterX = orbRect.left + orbRect.width / 2;
        const orbCenterY = orbRect.top + orbRect.height / 2;
        
        // 🌌 SIMPLIFIED: Same orbiting radius for all devices
        const radius = 140; // Consistent orbiting distance - satellites around Emma orb
        
        // Update all node positions relative to actual orb center
        this.nodes.forEach((node, i) => {
          const angle = (i / this.nodes.length) * Math.PI * 2 - Math.PI / 2;
          const newTargetX = orbCenterX + Math.cos(angle) * radius;
          const newTargetY = orbCenterY + Math.sin(angle) * radius;
          
          // Update positions with fast smooth transition
          const item = node.element;
          item.style.transition = 'all 0.15s ease';
          item.style.left = (newTargetX - 45) + 'px';
          item.style.top = (newTargetY - 45) + 'px';
          
          // Update node data
          node.x = newTargetX;
          node.y = newTargetY;
          node.targetX = newTargetX;
          node.targetY = newTargetY;
          node.baseX = newTargetX;
          node.baseY = newTargetY;
        });
      }

      initLoadingOrb() {
        try {
          const loadingOrbContainer = document.querySelector('.loading-orb');
          if (!loadingOrbContainer) {
            console.warn('🌟 Loading orb container not found');
            return;
          }

          if (window.EmmaOrb) {
            // Create WebGL Emma Orb for loading screen
            this.loadingOrb = new window.EmmaOrb(loadingOrbContainer, {
              hue: 270, // Emma's signature purple-pink
              hoverIntensity: 0.5,
              rotateOnHover: false,
              forceHoverState: true // Always show active state during loading
            });

          } else {
            console.warn('🌟 EmmaOrb class not available for loading, using fallback');
            // Fallback to gradient orb if WebGL not available
            const fallbackDiv = document.createElement('div');
            fallbackDiv.className = 'loading-orb-fallback';
            loadingOrbContainer.appendChild(fallbackDiv);
          }
        } catch (error) {
          console.error('🚨 Error initializing Loading Emma Orb:', error);
          // Fallback on error
          const loadingOrbContainer = document.querySelector('.loading-orb');
          if (loadingOrbContainer) {
            const fallbackDiv = document.createElement('div');
            fallbackDiv.className = 'loading-orb-fallback';
            loadingOrbContainer.appendChild(fallbackDiv);
          }
        }
      }

      initEmmaOrb() {
        try {
          const orbContainer = document.getElementById('webgl-orb-container');
          if (!orbContainer) {
            console.warn('🌟 WebGL orb container not found');
            return;
          }

          const computed = getComputedStyle(document.documentElement);
          const hueValue = parseFloat(computed.getPropertyValue('--emma-orb-hue')) || 270;
          const hoverIntensityValue = parseFloat(computed.getPropertyValue('--emma-orb-hover-intensity')) || 0.35;

          if (window.EmmaOrb) {
            try {
              // Create WebGL Emma Orb with Emma's signature purple-pink hue
              this.webglOrb = new window.EmmaOrb(orbContainer, {
                hue: hueValue,
                hoverIntensity: hoverIntensityValue,
                rotateOnHover: true,
                forceHoverState: false
              });

            } catch (webglError) {
              console.error('❌ WebGL orb creation failed:', webglError);
              // Force fallback
              window.EmmaOrb = null;
            }
          }

          if (!window.EmmaOrb || !this.webglOrb) {
            console.warn('🌟 EmmaOrb class not available, using fallback');
            const fallbackGradient = (computed.getPropertyValue('--emma-gradient-primary') || '').trim();
            const fallbackGlow = (computed.getPropertyValue('--emma-glow-strong') || '0 0 40px rgba(111, 99, 217, 0.6)').trim();
            orbContainer.style.background = fallbackGradient || 'radial-gradient(circle at 30% 30%, #6f63d9, #4f46e5, #deb3e4)';
            orbContainer.style.borderRadius = '50%';
            orbContainer.style.width = '100%';
            orbContainer.style.height = '100%';
            orbContainer.style.boxShadow = `${fallbackGlow}, inset 0 0 40px rgba(255, 255, 255, 0.1)`;
            orbContainer.style.animation = 'orb-pulse 3s ease-in-out infinite';

          }

          // Clean Emma orb - no vault unlock needed on dashboard
        } catch (error) {
          console.error('🚨 Error initializing Emma Orb:', error);
          // Ensure fallback is applied
          const orbContainer = document.getElementById('webgl-orb-container');
          if (orbContainer) {
            const computed = getComputedStyle(document.documentElement);
            const fallbackGradient = (computed.getPropertyValue('--emma-gradient-primary') || '').trim();
            const fallbackGlow = (computed.getPropertyValue('--emma-glow-strong') || '0 0 40px rgba(111, 99, 217, 0.6)').trim();
            orbContainer.style.background = fallbackGradient || 'radial-gradient(circle at 30% 30%, #6f63d9, #4f46e5)';
            orbContainer.style.borderRadius = '50%';
            orbContainer.style.width = '100%';
            orbContainer.style.height = '100%';
            orbContainer.style.boxShadow = `${fallbackGlow}, inset 0 0 40px rgba(255, 255, 255, 0.1)`;
          }
        }
      }

      handleThemeApplied(event) {
        const theme = event && event.detail ? event.detail.theme : null;
        if (!theme) return;
        this.applyThemeToOrb(theme);
      }

      applyThemeToOrb(theme) {
        if (!theme) return;

        if (this.webglOrb) {
          const hue = parseFloat(theme.cssVars && theme.cssVars['--emma-orb-hue']);
          if (!Number.isNaN(hue)) {
            this.webglOrb.options.hue = hue;
          }

          const hoverIntensity = parseFloat(theme.cssVars && theme.cssVars['--emma-orb-hover-intensity']);
          if (!Number.isNaN(hoverIntensity)) {
            this.webglOrb.options.hoverIntensity = hoverIntensity;
          }
        } else {
          const orbContainer = document.getElementById('webgl-orb-container');
          if (!orbContainer) return;

          const gradient = theme.cssVars && theme.cssVars['--emma-gradient-primary'];
          const glow = theme.cssVars && theme.cssVars['--emma-glow-strong'];

          if (gradient) {
            orbContainer.style.background = gradient.trim();
          }

          if (glow) {
            orbContainer.style.boxShadow = `${glow.trim()}, inset 0 0 40px rgba(255, 255, 255, 0.1)`;
          }
        }
      }

      updateVaultNodeStatus() {
        try {

          const vaultNode = document.getElementById('vault-node');
          if (!vaultNode) {
            console.warn('⚠️ Vault node not found, skipping status update');
            // Try alternative selectors
            const altVaultNode = document.querySelector('[data-action="vault"], .radial-item[onclick*="vault"]');
            if (altVaultNode) {

              this.updateAlternativeVaultNode(altVaultNode);
            }
            return;
          }

          const vaultIcon = vaultNode.querySelector('.radial-item-icon');
          if (!vaultIcon) {
            console.warn('⚠️ Vault icon not found, trying alternative selector');
            const altIcon = vaultNode.querySelector('span, .icon');
            if (altIcon) {

              this.updateVaultIcon(altIcon, vaultNode);
              return;
            }
            return;
          }

          this.updateVaultIcon(vaultIcon, vaultNode);
        } catch (error) {
          console.warn('⚠️ Error updating vault node status:', error);
        }
      }

      updateVaultIcon(vaultIcon, vaultNode) {
        if (window.currentVaultStatus && window.currentVaultStatus.isUnlocked) {

          vaultIcon.textContent = '🔓';
          vaultNode.style.background = 'rgba(74, 222, 128, 0.1)'; // Green tint when unlocked
          vaultNode.style.borderColor = 'rgba(74, 222, 128, 0.3)';
          vaultNode.style.boxShadow = '0 0 14px rgba(74, 222, 128, 0.3)';
        } else {

          vaultIcon.textContent = '🔒';
          vaultNode.style.background = 'var(--emma-glass)'; // Default when locked
          vaultNode.style.borderColor = 'rgba(111, 99, 217, 0.3)';
          vaultNode.style.boxShadow = '0 0 12px rgba(111, 99, 217, 0.18)';
        }
      }

      updateAlternativeVaultNode(node) {
        const icon = node.querySelector('span') || node;
        if (window.currentVaultStatus && window.currentVaultStatus.isUnlocked) {
          icon.textContent = '🔓';
          node.style.background = 'rgba(74, 222, 128, 0.1)';
        } else {
          icon.textContent = '🔒';
          node.style.background = 'var(--emma-glass)';
        }
      }

      updateAllVaultIndicators() {

        // Update any vault-related elements
        const vaultElements = document.querySelectorAll('[data-action="vault"], .vault-indicator, #vault-node');
        vaultElements.forEach(element => {
          const icon = element.querySelector('span, .radial-item-icon') || element;
          if (window.currentVaultStatus && window.currentVaultStatus.isUnlocked) {
            if (icon.textContent) icon.textContent = '🔓';
            element.style.background = 'rgba(74, 222, 128, 0.1)';
            element.style.borderColor = 'rgba(74, 222, 128, 0.3)';
            element.style.boxShadow = '0 0 14px rgba(74, 222, 128, 0.3)';
          } else {
            if (icon.textContent) icon.textContent = '🔒';
            element.style.background = 'var(--emma-glass)';
            element.style.borderColor = 'rgba(111, 99, 217, 0.3)';
            element.style.boxShadow = '0 0 12px rgba(111, 99, 217, 0.18)';
          }
        });

      }

      assignNodeUid(element, prefix) {
        if (!element) return `${prefix}-unknown`;
        this.nodeUidCounter = (this.nodeUidCounter || 0) + 1;
        const uid = `${prefix}-${this.nodeUidCounter}`;
        element.dataset.nodeUid = uid;
        return uid;
      }

      linkNodes(nodeA, nodeB) {
        if (!nodeA || !nodeB || nodeA === nodeB) {
          return;
        }

        if (nodeA.isCreateNode || nodeB.isCreateNode) {
          return;
        }

        if (!Array.isArray(nodeA.connections)) {
          nodeA.connections = [];
        }
        if (!Array.isArray(nodeB.connections)) {
          nodeB.connections = [];
        }

        if (!nodeA.connections.includes(nodeB)) {
          nodeA.connections.push(nodeB);
        }
        if (!nodeB.connections.includes(nodeA)) {
          nodeB.connections.push(nodeA);
        }
      }

      purgeCreateNodeConnections() {
        const createElement = this.createMemoryElement;
        if (!createElement) return;

        this.nodes.forEach(node => {
          if (!Array.isArray(node.connections)) return;
          node.connections = node.connections.filter(conn => {
            if (!conn) return false;
            if (conn.isCreateNode) {
              if (Array.isArray(conn.connections)) {
                conn.connections = conn.connections.filter(inner => inner !== node);
              }
              return false;
            }
            if (conn.element === createElement) {
              return false;
            }
            return true;
          });
        });

        if (this.centralNode && Array.isArray(this.centralNode.connections)) {
          this.centralNode.connections = this.centralNode.connections.filter(conn => conn && !conn.isCreateNode && conn.element !== createElement);
        }

        const createNode = this.nodes.find(node => node.isCreateNode);
        if (createNode) {
          createNode.connections = [];
        }
      }

      dedupeNodeConnections() {
        this.nodes.forEach(node => {
          if (!Array.isArray(node.connections)) {
            node.connections = [];
            return;
          }

          const seen = new Set();
          node.connections = node.connections.filter(conn => {
            if (!conn) return false;
            const key = conn.uid || (conn.element && conn.element.dataset && conn.element.dataset.nodeUid);
            if (!key) return false;
            if (seen.has(key)) {
              if (Array.isArray(conn.connections)) {
                conn.connections = conn.connections.filter(inner => inner !== node);
              }
              return false;
            }
            seen.add(key);
            return true;
          });
        });

        if (this.centralNode && Array.isArray(this.centralNode.connections)) {
          const seenCenter = new Set();
          this.centralNode.connections = this.centralNode.connections.filter(conn => {
            if (!conn) return false;
            const key = conn.uid || (conn.element && conn.element.dataset && conn.element.dataset.nodeUid);
            if (!key) return false;
            if (seenCenter.has(key)) {
              if (Array.isArray(conn.connections)) {
                conn.connections = conn.connections.filter(inner => inner !== this.centralNode);
              }
              return false;
            }
            seenCenter.add(key);
            return true;
          });
        }
      }

      // Check if a line intersects with Emma orb circle
      lineIntersectsCircle(x1, y1, x2, y2, cx, cy, radius) {
        // Vector from point1 to point2
        const dx = x2 - x1;
        const dy = y2 - y1;

        // Vector from point1 to circle center
        const fx = x1 - cx;
        const fy = y1 - cy;

        // Quadratic equation coefficients
        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = (fx * fx + fy * fy) - radius * radius;

        const discriminant = b * b - 4 * a * c;

        // No intersection if discriminant is negative
        if (discriminant < 0) return false;

        // Check if intersection points are within the line segment
        const sqrt_discriminant = Math.sqrt(discriminant);
        const t1 = (-b - sqrt_discriminant) / (2 * a);
        const t2 = (-b + sqrt_discriminant) / (2 * a);

        // If either intersection point is within [0,1], line intersects circle
        return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
      }

      animateNeuralNetwork() {
        if (!this.neuralCanvas || !this.neuralCtx) {
          return;
        }

        this.neuralCanvas.width = window.innerWidth;
        this.neuralCanvas.height = window.innerHeight;
        const ctx = this.neuralCtx;
        const skipCanvasRendering = this.lowPowerMode || document.body.classList.contains('performance-lite') || !ctx;

        const animate = () => {
          const reducePhysics = this.shouldReduceConstellationPhysics();
          if (!this.isMenuOpen && !this.isConstellationMode) {
            this.neuralAnimationId = null;
            return;
          }

          if (!skipCanvasRendering) {
            ctx.clearRect(0, 0, this.neuralCanvas.width, this.neuralCanvas.height);

            if (!reducePhysics && (this.isMenuOpen || this.isConstellationMode)) {
              ctx.strokeStyle = 'rgba(111, 99, 217, 0.03)';
              ctx.lineWidth = 1;
              const gridSize = 50;

              for (let x = 0; x < this.neuralCanvas.width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, this.neuralCanvas.height);
                ctx.stroke();
              }

              for (let y = 0; y < this.neuralCanvas.height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(this.neuralCanvas.width, y);
                ctx.stroke();
              }
            }
          }

          // Update node positions with organic movement (only for visible nodes)
          const time = Date.now() * 0.001;
          this.nodes.forEach((node, i) => {
            // CRITICAL FIX: Only animate visible nodes
            const nodeElement = node.element || document.getElementById(node.id);
            if (!nodeElement || nodeElement.style.display === 'none') {
              return; // Skip animation for hidden nodes
            }

            const halfWidth = (nodeElement.offsetWidth || 0) / 2;
            const halfHeight = (nodeElement.offsetHeight || 0) / 2;

            if (node.isDragging) {
              node.vx = 0;
              node.vy = 0;
              node.baseX = node.x;
              node.baseY = node.y;
              nodeElement.style.left = `${node.x - halfWidth}px`;
              nodeElement.style.top = `${node.y - halfHeight}px`;
              return;
            }

            const isStaticConstellationNode =
              this.isConstellationMode &&
              !node.orbBound &&
              (node.type === 'memory' || node.isCreateNode);

            if (isStaticConstellationNode) {
              // Keep memory nodes and create button steady in constellation mode
              node.vx = 0;
              node.vy = 0;
              node.x = node.baseX;
              node.y = node.baseY;
              nodeElement.style.left = `${node.x - halfWidth}px`;
              nodeElement.style.top = `${node.y - halfHeight}px`;
              return;
            }

            // Different floating movement for radial vs constellation nodes
            let floatX, floatY;
            if (node.orbBound) {
              // 🎯 RADIAL MENU NODES: Much tighter floating to stay within 50px radius
              floatX = Math.sin(time * 0.3 + i) * 3; // Reduced from 12px to 3px
              floatY = Math.cos(time * 0.2 + i * 0.5) * 2; // Reduced from 8px to 2px
            } else {
              // 🌌 CONSTELLATION NODES: Normal floating movement
              floatX = Math.sin(time * 0.3 + i) * 12 * (reducePhysics ? 0.6 : 1);
              floatY = Math.cos(time * 0.2 + i * 0.5) * 8 * (reducePhysics ? 0.6 : 1);
            }

            // Gentle elastic force back to base position (petri dish feel)
            const dx = (node.baseX + floatX) - node.x;
            const dy = (node.baseY + floatY) - node.y;

            node.vx += dx * (reducePhysics ? 0.003 : 0.005); // Adaptive elastic force
            node.vy += dy * (reducePhysics ? 0.003 : 0.005);

            // Apply more damping for organic feel
            node.vx *= reducePhysics ? 0.985 : 0.98;
            node.vy *= reducePhysics ? 0.985 : 0.98;

            // Add repulsion from Emma orb (prevent overlap)
            if (this.centralNode && this.isConstellationMode) {
              const orbDx = node.x - this.centralNode.x;
              const orbDy = node.y - this.centralNode.y;
              const orbDist = Math.sqrt(orbDx * orbDx + orbDy * orbDy);

              // Repulsion zone around Emma orb
              const repulsionRadius = reducePhysics ? 130 : 150;
              if (orbDist < repulsionRadius && orbDist > 0) {
                const repulsionForce = (repulsionRadius - orbDist) / repulsionRadius;
                const forceStrength = repulsionForce * (reducePhysics ? 0.2 : 0.3); // Gentle but firm repulsion

                const normalizedDx = orbDx / orbDist;
                const normalizedDy = orbDy / orbDist;

                node.vx += normalizedDx * forceStrength;
                node.vy += normalizedDy * forceStrength;
              }
            }

            // Add gentle repulsion between memory nodes (prevent overlap)
            if (this.isConstellationMode && !reducePhysics) {
              this.nodes.forEach((otherNode, j) => {
                if (i !== j) {
                  // CRITICAL FIX: Only calculate repulsion with visible nodes
                  const otherElement = otherNode.element || document.getElementById(otherNode.id);
                  if (!otherElement || otherElement.style.display === 'none') {
                    return; // Skip repulsion with hidden nodes
                  }
                  const nodeDx = node.x - otherNode.x;
                  const nodeDy = node.y - otherNode.y;
                  const nodeDist = Math.sqrt(nodeDx * nodeDx + nodeDy * nodeDy);

                  // Minimum distance between nodes
                  const minNodeDistance = 110;
                  if (nodeDist < minNodeDistance && nodeDist > 0) {
                    const repulsionForce = (minNodeDistance - nodeDist) / minNodeDistance;
                    const forceStrength = repulsionForce * 0.1; // Very gentle node repulsion

                    const normalizedDx = nodeDx / nodeDist;
                    const normalizedDy = nodeDy / nodeDist;

                    node.vx += normalizedDx * forceStrength;
                    node.vy += normalizedDy * forceStrength;
                  }
                }
              });
            }

            // Update position
            node.x += node.vx;
            node.y += node.vy;

            // 🎯 RADIAL MENU CONSTRAINT: Hard limit radial nodes with proper breathing room from orb
            if (node.orbBound && this.orbNeuralNode) {
              const orbDx = node.x - this.orbNeuralNode.x;
              const orbDy = node.y - this.orbNeuralNode.y;
              const orbDistance = Math.sqrt(orbDx * orbDx + orbDy * orbDy);
              
              // 🌌 SIMPLIFIED: One max distance for all devices - orbiting constraint
              const MAX_RADIAL_DISTANCE = reducePhysics ? 120 : 150; // Orbiting distance + small buffer for physics
              
              if (orbDistance > MAX_RADIAL_DISTANCE) {
                // Constrain to max distance from orb center
                const constrainedX = this.orbNeuralNode.x + (orbDx / orbDistance) * MAX_RADIAL_DISTANCE;
                const constrainedY = this.orbNeuralNode.y + (orbDy / orbDistance) * MAX_RADIAL_DISTANCE;
                node.x = constrainedX;
                node.y = constrainedY;
                
                // Zero out velocity to prevent further drift
                node.vx *= 0.5;
                node.vy *= 0.5;
              }
            }

            // Update DOM element position
            nodeElement.style.left = `${node.x - halfWidth}px`;
            nodeElement.style.top = `${node.y - halfHeight}px`;
          });

          if (!skipCanvasRendering) {
            const drawnEdges = new Set();
            this.nodes.forEach((node, nodeIndex) => {
              if (node.isCreateNode) {
                return;
              }

              const sourceElement = node.element || document.getElementById(node.id);
              if (!sourceElement || sourceElement.style.display === 'none') {
                return;
              }

              const sourceKey = node.uid || (sourceElement.dataset && sourceElement.dataset.nodeUid) || `node-${nodeIndex}`;

              node.connections.forEach(target => {
                if (!target || target.isCreateNode) {
                  return;
                }

                const targetElement = target.element || document.getElementById(target.id);
                if (!targetElement || targetElement.style.display === 'none') {
                  return;
                }

                const targetKey = target.uid || (targetElement.dataset && targetElement.dataset.nodeUid) || 'target';
                const edgeA = sourceKey < targetKey ? sourceKey : targetKey;
                const edgeB = sourceKey < targetKey ? targetKey : sourceKey;
                const edgeId = `${edgeA}::${edgeB}`;
                if (drawnEdges.has(edgeId)) {
                  return;
                }
                drawnEdges.add(edgeId);

                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;
                const orbRadius = 110;

                if (this.lineIntersectsCircle(node.x, node.y, target.x, target.y, centerX, centerY, orbRadius)) {
                  return;
                }

                const dist = Math.sqrt(
                  Math.pow(node.x - target.x, 2) +
                  Math.pow(node.y - target.y, 2)
                );

                const isMemoryMode = this.isConstellationMode && !this.isMenuOpen;
                const gradient = ctx.createLinearGradient(
                  node.x, node.y, target.x, target.y
                );

                if (isMemoryMode) {
                  gradient.addColorStop(0, 'rgba(111, 99, 217, 0.2)');
                  gradient.addColorStop(0.5, 'rgba(222, 179, 228, 0.15)');
                  gradient.addColorStop(1, 'rgba(111, 99, 217, 0.2)');
                  ctx.lineWidth = 1.2 + Math.sin(time + dist * 0.01) * 0.2;
                } else {
                  gradient.addColorStop(0, 'rgba(111, 99, 217, 0.03)');
                  gradient.addColorStop(0.5, 'rgba(222, 179, 228, 0.02)');
                  gradient.addColorStop(1, 'rgba(111, 99, 217, 0.03)');
                  ctx.lineWidth = 0.5 + Math.sin(time + dist * 0.01) * 0.1;
                }

                ctx.strokeStyle = gradient;

                ctx.beginPath();
                ctx.moveTo(node.x, node.y);

                const curve1 = Math.sin(time * 0.4 + node.x * 0.005) * 15;
                const curve2 = Math.cos(time * 0.3 + node.y * 0.005) * 10;

                ctx.bezierCurveTo(
                  node.x + curve1,
                  node.y + curve2,
                  target.x - curve2,
                  target.y - curve1,
                  target.x,
                  target.y
                );

                ctx.stroke();
              });
            });
          }

          this.neuralAnimationId = requestAnimationFrame(animate);
        };

        animate();
      }

      // 🎯 SAFE URL PARAM HANDLER: Auto-trigger constellation or memory creation
      handleURLParams() {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          
          if (urlParams.get('constellation') === 'true') {
            // Auto-enter constellation mode after a brief delay
            setTimeout(() => {
              console.log('🎯 AUTO-TRIGGERING: Constellation mode from URL param');
              this.enterMemoryConstellation();
            }, 2000); // Wait for dashboard to fully load
          }
          
          if (urlParams.get('create') === 'true') {
            // Auto-start voice capture for memory creation
            setTimeout(() => {
              console.log('🎯 AUTO-TRIGGERING: Memory creation from URL param');
              this.startVoiceCapture();
            }, 2000); // Wait for dashboard to fully load
          }

          if (urlParams.get('createMemory') === 'true') {
            const personIdParam = urlParams.get('person');
            const personNameParam = urlParams.get('personName');
            const chatPrompt = personNameParam
              ? `I'd love to help you capture a memory about ${personNameParam}. What moment would you like me to remember?`
              : "I'd love to help you capture a new memory. What would you like me to remember?";

            setTimeout(() => {
              console.log('💬 AUTO-TRIGGERING: Emma Chat memory capture flow', {
                personId: personIdParam,
                personName: personNameParam
              });
              this.startEmmaChatExperience({
                personId: personIdParam,
                personName: personNameParam,
                autoPrompt: chatPrompt,
                focusInput: true
              });
            }, 2000);

            // Remove params so chat doesn't auto-open again on refresh/navigation
            urlParams.delete('createMemory');
            urlParams.delete('person');
            urlParams.delete('personName');

            const remaining = urlParams.toString();
            if (window.history && typeof window.history.replaceState === 'function') {
              const newUrl = remaining ? `${window.location.pathname}?${remaining}` : window.location.pathname;
              window.history.replaceState({}, '', newUrl);
            }
          }
        } catch (error) {
          console.warn('🔧 URL param handling failed (non-critical):', error);
          // Safe fallback - do nothing if URL parsing fails
        }
      }

      async handleRadialAction(action) {

        switch(action) {
          case 'capture':
            this.startVoiceCapture();
            break;
          case 'memories':
            await this.enterMemoryConstellation();
            break;
          case 'people':
            window.location.href = 'pages/people-emma.html';
            break;
          case 'chat':
            this.startEmmaChatExperience();
            break;
        }

        // Close menu after action
        if (this.isMenuOpen) {
          this.toggleRadialMenu();
        }
      }

      resolveEmmaChatScriptUrl() {
        const existingScript = document.querySelector('script[src*="emma-chat-experience.js"]');
        if (existingScript?.src) {
          return existingScript.src;
        }

        try {
          return new URL('js/emma-chat-experience.js', window.location.href).href;
        } catch (error) {
          console.warn('[Emma] Unable to resolve chat script URL, falling back to relative path', error);
          return 'js/emma-chat-experience.js';
        }
      }

      async ensureEmmaChatExperienceLoaded() {
        if (typeof EmmaChatExperience !== 'undefined') {
          return true;
        }

        if (!this.emmaChatLoaderPromise) {
          this.emmaChatLoaderPromise = new Promise((resolve, reject) => {
            const markLoaded = (scriptEl) => {
              if (scriptEl) {
                scriptEl.dataset.loaded = 'true';
              }
              resolve();
            };

            const handleError = (error) => reject(error || new Error('Failed to load EmmaChatExperience script'));
            const existing = document.querySelector('script[src*="emma-chat-experience.js"]');

            if (existing) {
              const alreadyLoaded = existing.dataset.loaded === 'true' ||
                existing.readyState === 'complete' ||
                existing.readyState === 'loaded';

              if (alreadyLoaded) {
                markLoaded(existing);
                return;
              }

              existing.addEventListener('load', () => markLoaded(existing), { once: true });
              existing.addEventListener('error', () => handleError(new Error('Failed to load EmmaChatExperience script')), { once: true });
              return;
            }

            const script = document.createElement('script');
            script.src = this.resolveEmmaChatScriptUrl();
            script.async = true;
            script.addEventListener('load', () => markLoaded(script), { once: true });
            script.addEventListener('error', () => handleError(new Error('Failed to load EmmaChatExperience script')), { once: true });
            document.head.appendChild(script);
          }).finally(() => {
            this.emmaChatLoaderPromise = null;
          });
        }

        try {
          await this.emmaChatLoaderPromise;
          return typeof EmmaChatExperience !== 'undefined';
        } catch (error) {
          console.error('[Emma] Unable to load EmmaChatExperience:', error);
          return false;
        }
      }

      async startVoiceCapture() {
        document.body.classList.remove('dashboard-minimal');

        // Calculate elegant position relative to Emma orb
        const orbRect = this.orb.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Position the panel optimally
        let left = orbRect.right + 24;
        let top = Math.max(40, orbRect.top - 80);

        // Ensure it fits in viewport
        const panelWidth = 480;
        const panelHeight = 700;

        if (left + panelWidth > viewportWidth - 40) {
          left = orbRect.left - panelWidth - 24;
        }

        if (top + panelHeight > viewportHeight - 40) {
          top = viewportHeight - panelHeight - 40;
        }

        const position = {
          left: Math.max(40, left),
          top: Math.max(40, top),
          width: panelWidth,
          height: panelHeight
        };

        // Create and show voice capture experience
        this.voiceCaptureExperience = new VoiceCaptureExperience(position, {
          voiceEnabled: true,
          autoStart: false // Let user initiate
        });

        try {
          await this.voiceCaptureExperience.show();

        } catch (error) {
          console.error('🎤 Failed to open voice capture:', error);
          this.showToast('Failed to open Voice Memory Studio. Please try again.', 'error');
        } finally {
          document.body.classList.add('dashboard-minimal');
        }
      }

      async startEmmaChatExperience(options = {}) {

        const {
          autoPrompt = null,
          personName = '',
          personId = '',
          focusInput = false
        } = options || {};

        // Center chat in the middle of the page
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Chat panel dimensions
        const panelWidth = 600; // Wider for comfortable chat
        const panelHeight = 700;

        // Center position in the middle of the page
        const position = {
          left: (viewportWidth - panelWidth) / 2,
          top: (viewportHeight - panelHeight) / 2,
          width: panelWidth,
          height: panelHeight
        };

        if (typeof EmmaChatExperience === 'undefined') {
          console.warn('[Emma] EmmaChatExperience class not available, attempting to load script');
          this.showToast('Loading chat module…', 'info');
          const loaded = await this.ensureEmmaChatExperienceLoaded();
          if (!loaded) {
            this.showToast('Chat module could not load. Check your connection and try again.', 'error');
            return;
          }
        }

        // Create and show Emma chat experience
        this.emmaChatExperience = new EmmaChatExperience(position, {
          contextAware: true,
          memoryIntegration: true
        });

        try {
          await this.emmaChatExperience.show();

          if (personId) {
            this.emmaChatExperience.pendingPersonId = personId;
          }

          const promptText = autoPrompt || (personName ? `I'd love to help you capture a memory about ${personName}. What moment would you like me to remember?` : null);
          if (promptText && typeof this.emmaChatExperience.addMessage === 'function') {
            this.emmaChatExperience.addMessage(promptText, 'emma');
          }

          if ((focusInput || promptText) && this.emmaChatExperience.inputField) {
            this.emmaChatExperience.inputField.focus();
          }

        } catch (error) {
          console.error('💬 Failed to open Emma Chat:', error);
          this.showToast('Failed to open Chat with Emma. Please try again.', 'error');
        }
      }

      openVaultModal() {
        // Check if extension is available first
        if (window.emmaWebVault && window.emmaWebVault.extensionAvailable) {
          // Extension is managing vault - dashboard should work automatically

          return; // Don't show vault modal, extension handles everything
        }

        const modal = document.getElementById('vault-modal');
        const statusIcon = document.getElementById('status-icon');
        const statusTitle = document.getElementById('status-title');
        const statusDescription = document.getElementById('status-description');
        const actionBtn = document.getElementById('vault-action-btn');
        const statusCard = document.getElementById('vault-status-card');
        const unlockSection = document.getElementById('unlock-section');
        const createVaultSection = document.getElementById('create-vault-section');

        // Check if .emma vault is active (only if extension not available)
        const vaultActive = sessionStorage.getItem('emmaVaultActive') === 'true';
        const vaultName = sessionStorage.getItem('emmaVaultName') || 'Unknown Vault';
        const extensionVaultActive = false; // Extension not available in this branch

        if (extensionVaultActive) {
          // Extension is managing vault - show connected status
          statusIcon.textContent = '🔗';
          statusTitle.textContent = 'Extension Connected';
          statusDescription.textContent = 'Vault managed by Emma Extension - changes auto-save to local file';
          actionBtn.textContent = '🔒 Manage via Extension';
          actionBtn.onclick = () => alert('Click the Emma extension icon 🔒 in your browser toolbar to manage your vault!');
          actionBtn.style.display = 'block';
          unlockSection.style.display = 'none';
          createVaultSection.style.display = 'none';
          statusCard.classList.add('unlocked'); // Show as unlocked/connected
        } else if (window.currentVaultStatus && window.currentVaultStatus.isUnlocked) {
          statusIcon.textContent = '🔓';
          statusTitle.textContent = `${vaultName} - Unlocked`;
          statusDescription.textContent = `Your .emma vault file is open and your memories are accessible`;
          actionBtn.textContent = '🔒 Lock Vault';
          actionBtn.onclick = () => this.lockVault();
          actionBtn.style.display = 'block';
          statusCard.classList.add('unlocked');
          unlockSection.style.display = 'none';
          createVaultSection.style.display = 'none';
        } else {
          statusIcon.textContent = '🔒';
          statusTitle.textContent = 'Vault Locked';
          statusDescription.textContent = 'Enter your vault code to access your memories';
          actionBtn.textContent = 'Unlock Vault';
          actionBtn.onclick = () => this.showUnlockForm();
          actionBtn.style.display = 'block';
          statusCard.classList.remove('unlocked');
          unlockSection.style.display = 'none';
          createVaultSection.style.display = 'none';
        }

        modal.style.display = 'flex';
        setTimeout(() => {
          modal.classList.add('show');
        }, 10);

        // Store reference for global access
        window.openVaultModal = () => this.openVaultModal();
      }

      closeVaultModal() {
        const modal = document.getElementById('vault-modal');
        modal.classList.remove('show');
        setTimeout(() => {
          modal.style.display = 'none';
        }, 300);
      }

      showUnlockForm() {
        // Use beautiful universal vault modal instead of inline form
        universalVaultModal.show({
          title: "Unlock Vault",
          message: "Enter your vault passphrase to access your secure memories",
          onSuccess: (result) => {

            // Update vault status using unified manager
            const vaultName = sessionStorage.getItem('emmaVaultName') || 'Web Vault';
            window.webVaultStatus.unlock(vaultName);

            // Refresh dashboard data and UI
            this.loadDashboardData();

            // IMMEDIATE vault icon update
            const vaultIcon = document.querySelector('#vault-node .radial-item-icon');
            if (vaultIcon) {
              vaultIcon.textContent = '🔓';

            }

            // Update vault node with delay to ensure DOM is ready
            setTimeout(() => {
              this.updateVaultNodeStatus();

              // Also try to update any other vault indicators
              this.updateAllVaultIndicators();

              // Force another immediate update
              const vaultIconAgain = document.querySelector('#vault-node .radial-item-icon');
              if (vaultIconAgain) {
                vaultIconAgain.textContent = '🔓';

              }
            }, 100);

            // Don't reopen modal - let it close naturally
            // The next time user opens it, it will show correct status

            this.showToast('✅ Vault unlocked successfully!', 'success');

          },
          onCancel: () => {

          }
        });
      }

      hideUnlockForm() {
        const unlockSection = document.getElementById('unlock-section');
        const passwordInput = document.getElementById('vault-password');
        unlockSection.style.display = 'none';
        passwordInput.value = '';
      }

      async unlockVault() {
        const passwordInput = document.getElementById('vault-password');
        const unlockBtn = document.getElementById('unlock-btn');
        const password = passwordInput.value.trim();

        if (!password) {
          passwordInput.focus();
          return;
        }

        try {
          unlockBtn.disabled = true;
          unlockBtn.textContent = '🔓 Unlocking...';

          if (window.emmaAPI && window.emmaAPI.vault) {
            const result = await window.emmaAPI.vault.unlock({ passphrase: password });

            if (result && result.success) {
              // Success - update status and close form
              window.currentVaultStatus = { isUnlocked: true };
              await this.loadDashboardData();
              this.updateVaultNodeStatus(); // Update the floating vault node
              this.hideUnlockForm();
              this.openVaultModal(); // Refresh modal with new status
              this.showToast('✅ Vault unlocked successfully!', 'success');
            } else {
              throw new Error(result?.error || 'Unlock failed');
            }
          } else {
            // No API available
            throw new Error('Vault API not available');
          }
        } catch (error) {
          console.error('🏠 Dashboard: Unlock error:', error);
          this.showToast('❌ Failed to unlock vault: ' + error.message, 'error');
        } finally {
          unlockBtn.disabled = false;
          unlockBtn.textContent = '🔓 Unlock';
        }
      }

      async lockVault() {
        try {
          if (window.emmaAPI && window.emmaAPI.vault) {
            const result = await window.emmaAPI.vault.lock();

            if (result && result.success) {
              window.currentVaultStatus = { isUnlocked: false };
              await this.loadDashboardData();
              this.updateVaultNodeStatus(); // Update the floating vault node
              this.openVaultModal(); // Refresh modal with new status
              this.showToast('🔒 Vault locked successfully!', 'success');
            } else {
              throw new Error(result?.error || 'Lock failed');
            }
          } else {
            // Demo mode
            console.warn('🏠 Dashboard: No Emma API - demo lock');
            window.currentVaultStatus = { isUnlocked: false };
            await this.loadDashboardData();
            this.updateVaultNodeStatus(); // Update the floating vault node
            this.openVaultModal();
            this.showToast('🎭 Demo vault locked!', 'info');
          }
        } catch (error) {
          console.error('🏠 Dashboard: Lock error:', error);
          this.showToast('❌ Failed to lock vault: ' + error.message, 'error');
        }
      }

      // Clean dashboard - vault unlock handled by index.html

      async showQRShare() {

        // Check if classes are available
        if (typeof EmmaShareExperience === 'undefined') {
          console.error('🔗 EmmaShareExperience class not found');
          this.showToast('Share feature unavailable. Please refresh the page.', 'error');
          return;
        }

        if (typeof QRService === 'undefined') {
          console.warn('🔗 QRService class not found - will use fallback');
        }

        // Calculate elegant position relative to Emma orb
        const orbRect = this.orb.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;        // Position the share panel optimally
        let left = orbRect.right + 24;
        let top = Math.max(40, orbRect.top - 120);

        // Share panel dimensions
        const panelWidth = 650; // Wider for share content
        const panelHeight = 720;

        // Ensure it fits in viewport
        if (left + panelWidth > viewportWidth - 40) {
          left = orbRect.left - panelWidth - 24;
        }

        if (top + panelHeight > viewportHeight - 40) {
          top = viewportHeight - panelHeight - 40;
        }

        const position = {
          left: Math.max(40, left),
          top: Math.max(40, top),
          width: panelWidth,
          height: panelHeight
        };

        try {
          // Create and show Emma share experience
          this.emmaShareExperience = new EmmaShareExperience(position, {
            contextAware: true,
            vaultIntegration: true
          });

          // Set global reference for share actions
          window.shareExperience = this.emmaShareExperience;

          await this.emmaShareExperience.show();

        } catch (error) {
          console.error('🔗 Failed to open Emma Share:', error);
          this.showToast('Failed to open Share interface: ' + error.message, 'error');
        }
      }

      async loadDashboardData() {
        try {
          // Use WebVaultStatus instead of old Electron API

          // Don't override vault status - WebVaultStatus manages it
          // window.currentVaultStatus is set by WebVaultStatus manager

          // Keep central orb neutral - Emma branding only (text removed)

          // Load stats from web vault
          try {
            if (window.emmaWebVault && window.webVaultStatus && window.webVaultStatus.isUnlocked()) {
              const stats = window.emmaWebVault.getStats();
              this.updateStats({
                memories: stats.memoryCount || 0,
                people: stats.peopleCount || 0,
                today: 0 // TODO: Calculate today's memories
              });
            } else {
              this.updateStats({ memories: 0, people: 0, today: 0 });
            }
          } catch (e) {
            console.warn('⚠️ Web vault stats unavailable:', e.message);
            this.updateStats({ memories: 0, people: 0, today: 0 });
          }
        } catch (error) {
          console.error('🚨 Dashboard data load error:', error);
          // Fallback to demo data - but DON'T override vault status!
          // WebVaultStatus manager handles vault status, not this function
          this.updateStats({ memories: 0, people: 0, today: 0 });
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
          const reducePhysics = this.shouldReduceConstellationPhysics();
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
        // Panels are now hidden by default and shown via burger menu
        // No longer auto-showing panels to reduce visual distraction

      }

      // Burger menu removed for clean interface

      setupUtilityIcons() {
        if (!this.utilityIcons) {
          return;
        }

        // Add click handlers to utility items
        this.utilityIcons.querySelectorAll('.utility-item').forEach(item => {
          item.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = item.dataset.action;
            this.handleUtilityAction(action);
          });
        });

      }

      handleUtilityAction(action) {

        switch(action) {
          case 'settings':
            window.location.href = 'pages/emma-settings-redesigned.html';
            break;
          default:

        }
      }

      togglePanels() {
        this.panelsVisible = !this.panelsVisible;

        // Toggle body class for CSS animations
        if (this.panelsVisible) {
          document.body.classList.add('panels-visible');
          this.burgerMenuBtn.classList.add('active');

          // Also add active class to each panel for visibility
          if (this.panels.dailyBrief) this.panels.dailyBrief.classList.add('active');
          if (this.panels.aiInsights) this.panels.aiInsights.classList.add('active');
          if (this.panels.quickActions) this.panels.quickActions.classList.add('active');
        } else {
          document.body.classList.remove('panels-visible');
          this.burgerMenuBtn.classList.remove('active');

          // Remove active class from panels
          if (this.panels.dailyBrief) this.panels.dailyBrief.classList.remove('active');
          if (this.panels.aiInsights) this.panels.aiInsights.classList.remove('active');
          if (this.panels.quickActions) this.panels.quickActions.classList.remove('active');
        }

      }

      startAnimations() {
        // Subtle pulse animation for WebGL orb
        setInterval(() => {
          if (window.currentVaultStatus && !window.currentVaultStatus.isUnlocked) {
            const orbContainer = this.orb.querySelector('.emma-orb-webgl');
            if (orbContainer) {
              orbContainer.style.animation = 'orb-pulse 2s ease-in-out';
            }
          }
        }, 5000);
      }      // Enter memory constellation mode
      async enterMemoryConstellation() {
        document.body.classList.remove('dashboard-minimal');
        // CRITICAL: Clear any existing memory nodes first (prevents duplicates)
        this.clearAllMemoryNodesFromDOM();

        this.isConstellationMode = true;

        // PERSISTENCE: Save constellation state for page refresh
        localStorage.setItem('emmaConstellationActive', 'true');

        // Add constellation-active class to hide all UI
        document.body.classList.add('constellation-active');

        // Shrink central orb
        this.shrinkCentralOrb();

        // 🔍 CREATE ZOOMABLE CONSTELLATION CONTAINER
        this.createConstellationContainer();

        // Load memory data for constellation
        await this.loadMemoriesForConstellation();

        // Fade out current nodes
        await this.fadeOutMenuNodes();

        // Create memory constellation (await for real memories)
        await this.createMemoryConstellation();

        // Show constellation UI with zoom controls
        this.showConstellationUI();
      }

      // Shrink central Emma orb when memories are visible
      shrinkCentralOrb() {

        
        // 🎭 FADE OUT orb first
        this.orb.style.transition = 'opacity 0.4s ease, transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
        this.orb.style.opacity = '0';
        
        // After fade out, reposition to bottom center
        setTimeout(() => {
          // 📍 REPOSITION: Move to bottom center
          this.orb.style.position = 'fixed';
          this.orb.style.top = 'auto';
          this.orb.style.bottom = '40px';
          this.orb.style.left = '50%';
          this.orb.style.transform = 'translateX(-50%) scale(0.6)';
          this.orb.style.zIndex = '99999'; // CRITICAL: Above ALL overlays and constellation nodes
          this.orb.style.pointerEvents = 'auto'; // CRITICAL: Ensure orb is clickable
          
          // 🎭 FADE IN at new position
          setTimeout(() => {
            this.orb.style.opacity = '0.9';

          }, 100);
          
        }, 400); // Wait for fade out to complete

        // Add hover effects for memory mode
        this.addOrbHoverEffects();
      }

      // Add hover effects to orb in memory mode
      addOrbHoverEffects() {
        if (this.orbHoverAdded) return;
        this.orbHoverAdded = true;

        const orbContainer = this.orb.querySelector('.emma-orb-webgl');

        this.orb.addEventListener('mouseenter', () => {
          if (this.isConstellationMode) {
            // 🎯 HOVER: Scale up while maintaining bottom center position
            this.orb.style.transform = 'translateX(-50%) scale(0.8)';
            this.orb.style.opacity = '1';
          }
        });

        this.orb.addEventListener('mouseleave', () => {
          if (this.isConstellationMode) {
            // 🎯 HOVER OUT: Return to normal size at bottom center
            this.orb.style.transform = 'translateX(-50%) scale(0.6)';
            this.orb.style.opacity = '0.9';
          }
        });
      }

      // Restore central Emma orb to original center position
      restoreCentralOrb() {

        
        // 🎭 FADE OUT from bottom position
        this.orb.style.transition = 'opacity 0.3s ease';
        this.orb.style.opacity = '0';
        
        setTimeout(() => {
          // 📍 RESTORE: Move back to center
          this.orb.style.position = 'fixed';
          this.orb.style.top = '50%';
          this.orb.style.bottom = 'auto';
          this.orb.style.left = '50%';
          this.orb.style.transform = 'translate(-50%, -50%) scale(1)';
          this.orb.style.zIndex = '10';
          
          // Reset transitions for normal behavior
          this.orb.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
          
          // 🎭 FADE IN at center
          setTimeout(() => {
            this.orb.style.opacity = '1';

          }, 100);
          
        }, 300); // Wait for fade out
      }

      // Load memories for constellation
      async loadMemoriesForConstellation() {
        try {
          // Get memories from API
          let memories = await this.getMemories();

          if (memories.length > 0) {

            console.log('💝 CONSTELLATION DEBUG: Memory titles:', memories.map(m => m.title));
          }

          // Add debugging info about available APIs

          this.constellationMemories = this.organizeMemoriesByTheme(memories);

          // Count total memories
          const totalMemories = Object.values(this.constellationMemories).reduce((sum, theme) => sum + theme.length, 0);

          // If no memories, suggest user create some
          if (totalMemories === 0) {

          }

        } catch (error) {

          this.constellationMemories = {family: [], travel: [], recent: [], special: []};
        }
      }

      // Get memories from vault (same API as gallery)
      async getMemories() {
        try {
          let allMemories = [];

          // 1. FIRST: Get vault memories (if available)
          if (window.emmaWebVault && window.emmaWebVault.isOpen && window.emmaWebVault.vaultData) {

            const vaultMemories = window.emmaWebVault.vaultData.content?.memories || {};
            const vaultMedia = window.emmaWebVault.vaultData.content?.media || {};

            // Convert vault memories to array format with LIGHTWEIGHT LOADING for constellation
            const memories = Object.values(vaultMemories).map(memory => {
              // 🚀 PERFORMANCE FIX: Only create lightweight attachment previews for constellation
              // Full media will be loaded on-demand when memory is clicked
              const attachmentPreviews = (memory.attachments || []).map(attachment => {
                const mediaItem = vaultMedia[attachment.id];
                return {
                  id: attachment.id,
                  type: attachment.type,
                  name: attachment.name,
                  size: attachment.size,
                  // 💡 LAZY LOADING: Store media ID for on-demand loading, don't load data URL yet
                  mediaId: attachment.id,
                  hasMedia: !!(mediaItem && mediaItem.data),
                  isLazyLoaded: true, // Flag to indicate this needs full loading on click
                  // Only create preview thumbnail for first image attachment
                  previewUrl: null // Will be set below for first image only
                };
              });

              // 🎯 OPTIMIZATION: Only load preview for FIRST image attachment (for constellation thumbnail)
              if (attachmentPreviews.length > 0) {
                const firstImageAttachment = attachmentPreviews.find(att => 
                  att.hasMedia && (att.type?.startsWith('image/') || !att.type?.startsWith('video/'))
                );
                
                if (firstImageAttachment) {
                  const mediaItem = vaultMedia[firstImageAttachment.id];
                  if (mediaItem && mediaItem.data) {
                    // Only load the first image for constellation thumbnail
                    firstImageAttachment.previewUrl = mediaItem.data.startsWith('data:')
                      ? mediaItem.data
                      : `data:${mediaItem.type};base64,${mediaItem.data}`;
                  }
                }
              }

              return {
                ...memory,
                // FIXED: Transform like gallery pages do - extract title from content/metadata
                title: memory.metadata?.title || memory.title || memory.subject || memory.summary || memory.content?.substring(0, 50) + '...' || `Memory`,
                attachments: attachmentPreviews, // Lightweight previews only
                attachmentCount: attachmentPreviews.length,
                hasMedia: attachmentPreviews.some(att => att.hasMedia),
                isVaultMemory: true
              };
            });

            // Add thumbnail from first attachment for constellation display
            const memoriesWithThumbnails = memories.map(memory => {
              const attachments = memory.attachments || [];
              let thumbnail = memory.thumbnail;

              // 🎯 PERFORMANCE: Use previewUrl from first image attachment for thumbnail
              if (!thumbnail && attachments.length > 0) {
                const firstImageWithPreview = attachments.find(att => att.previewUrl);
                if (firstImageWithPreview) {
                  thumbnail = firstImageWithPreview.previewUrl;
                }
              }

              return {
                ...memory,
                thumbnail
              };
            });

            allMemories = [...memoriesWithThumbnails];
            console.log('💝 CONSTELLATION: Loaded', allMemories.length, 'vault memories');
            console.log('💝 CONSTELLATION DEBUG: First memory structure:', allMemories[0]);
            console.log('💝 CONSTELLATION DEBUG: First memory keys:', Object.keys(allMemories[0] || {}));
          }

          // Note: All memories should be stored directly in vault - no fallback needed

          return allMemories;

        } catch (error) {
          console.error('💝 CONSTELLATION: Error loading memories from vault:', error);
          return [];
        }
      }

      // Helper to detect category from memory content
      detectCategoryFromContent(memory) {
        const content = ((memory.title || '') + ' ' + (memory.content || '')).toLowerCase();
        if (content.includes('family') || content.includes('mom') || content.includes('dad')) return 'family';
        if (content.includes('travel') || content.includes('trip') || content.includes('vacation')) return 'travel';
        if (memory.timestamp && new Date() - new Date(memory.timestamp) < 30 * 24 * 60 * 60 * 1000) return 'recent';
        return 'special';
      }

      // Generate organic neural network positions (NOT circular)
      generateNeuralNetworkPositions(nodeCount, centerX, centerY, width, height, minDistance) {
        const positions = [];
        const maxAttempts = 100;

        // First position: Create Memory node in top-center area
        positions.push({
          x: centerX + (Math.random() - 0.5) * 100,
          y: centerY - height * 0.25 + (Math.random() - 0.5) * 80
        });

        // Generate remaining positions with organic scatter
        for (let i = 1; i < nodeCount; i++) {
          let placed = false;
          let attempts = 0;

          while (!placed && attempts < maxAttempts) {
            // Use clustered random distribution (not uniform)
            const clusterX = centerX + (Math.random() - 0.5) * width;
            const clusterY = centerY + (Math.random() - 0.5) * height;

            // Add some organic bias toward clusters
            const biasStrength = Math.random() * 0.3;
            const biasAngle = Math.random() * Math.PI * 2;
            const x = clusterX + Math.cos(biasAngle) * biasStrength * 150;
            const y = clusterY + Math.sin(biasAngle) * biasStrength * 150;

            // Check minimum distance from all existing nodes AND center orb
            let validPosition = true;

            // Check distance from center Emma orb (exclusion zone)
            const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            if (distFromCenter < 150) { // 150px exclusion zone around Emma orb
              validPosition = false;
            }

            // Check distance from other nodes
            if (validPosition) {
              for (const pos of positions) {
                const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
                if (dist < minDistance) {
                  validPosition = false;
                  break;
                }
              }
            }

            // Keep nodes within bounds
            if (validPosition &&
                x > centerX - width/2 + 50 && x < centerX + width/2 - 50 &&
                y > centerY - height/2 + 50 && y < centerY + height/2 - 50) {
              positions.push({ x, y });
              placed = true;
            }

            attempts++;
          }

          // Fallback if can't place after max attempts
          if (!placed) {
            const angle = (i / nodeCount) * Math.PI * 2;
            const fallbackRadius = 200 + Math.random() * 100;
            positions.push({
              x: centerX + Math.cos(angle) * fallbackRadius,
              y: centerY + Math.sin(angle) * fallbackRadius
            });
          }
        }

        return positions;
      }      // Generate memory thumbnail based on theme
      generateMemoryThumbnail(theme) {
        const themeEmojis = {
          family: ['👨‍👩‍👧‍👦', '🏠', '❤️', '🍽️', '🎂'],
          travel: ['✈️', '🗺️', '📸', '🏖️', '🏔️'],
          recent: ['📱', '☕', '🌅', '🎵', '📚'],
          special: ['🎉', '💝', '🌟', '🎈', '🎊']
        };
        const emojis = themeEmojis[theme] || ['💫'];
        return emojis[Math.floor(Math.random() * emojis.length)];
      }

      // Organize memories by theme for constellations
      organizeMemoriesByTheme(memories) {
        const organized = {
          family: [],
          travel: [],
          recent: [],
          special: []
        };

        memories.forEach(memory => {
          const theme = memory.theme || this.detectMemoryTheme(memory);
          if (organized[theme]) {
            organized[theme].push(memory);
          } else {
            organized.special.push(memory);
          }
        });

        return organized;
      }

      // Detect memory theme from content
      detectMemoryTheme(memory) {
        // Use category first, then fallback to content analysis
        if (memory.category) {
          return memory.category;
        }

        const content = (memory.title + ' ' + (memory.content || memory.description || '')).toLowerCase();
        if (content.includes('family') || content.includes('mom') || content.includes('dad')) return 'family';
        if (content.includes('travel') || content.includes('trip') || content.includes('vacation')) return 'travel';
        if (memory.date && new Date() - new Date(memory.date) < 30 * 24 * 60 * 60 * 1000) return 'recent';
        return 'special';
      }

      // Fade out menu nodes
      async fadeOutMenuNodes() {
        return new Promise(resolve => {
          this.radialMenu.querySelectorAll('.radial-item').forEach((item, i) => {
            setTimeout(() => {
              item.style.transition = 'all 0.5s ease';
              item.style.opacity = '0';
              item.style.transform = 'scale(0)';
            }, i * 50);
          });

          setTimeout(resolve, 500);
        });
      }

      // Create memory constellation using EXACT working neural network system
      async createMemoryConstellation() {

        // CRITICAL: Remove any existing memory nodes from DOM first
        this.clearAllMemoryNodesFromDOM();

        // Clear existing nodes array
        this.nodes = [];

        // Don't reload memories - use already loaded ones from enterMemoryConstellation()

        // Get memories for constellation
        const allMemories = [];
        Object.keys(this.constellationMemories).forEach(theme => {
          this.constellationMemories[theme].forEach(memory => {
            allMemories.push({ ...memory, theme });
          });
        });

        // Load people from vault for constellation
        const allPeople = await this.loadPeopleForConstellation();
        this.constellationPeople = allPeople; // Store for filtering

        if (allMemories.length === 0 && allPeople.length === 0) {
          console.warn('💝 No memories or people found in vault - constellation will show only the Create Memory node');
        }

        // Create memory and people nodes using EXACT same pattern as main menu
        this.initMemoryNeuralNetwork(allMemories, allPeople);

        // Restore any saved layout preferences before animations begin
        this.applySavedConstellationLayout();
        this.persistConstellationLayout();

        // Set up for constellation mode without triggering menu
        this.isMenuOpen = false; // CRITICAL: Constellation mode starts with menu closed
        this.radialMenu.classList.remove('active'); // Ensure menu is hidden
        document.body.classList.remove('menu-active');

        // Start the neural animation (EXACT same as main menu)
        this.animateNeuralNetwork();

      }

      // Load people from vault for constellation
      async loadPeopleForConstellation() {
        try {

          if (window.emmaAPI && window.emmaAPI.people && window.emmaAPI.people.list) {
            const result = await window.emmaAPI.people.list();

            if (result && result.success && Array.isArray(result.items)) {

              return result.items;
            }
          }

          return [];

        } catch (error) {
          console.error('👥 CONSTELLATION: Error loading people:', error);
          return [];
        }
      }

      // Initialize memory neural network using EXACT same pattern as working main menu
      initMemoryNeuralNetwork(memories, people = []) {

        const compactMode = this.shouldReduceConstellationPhysics();
        const nodeSize = this.getConstellationNodeSize();
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        // Neural network layout parameters
        const networkWidth = Math.max(nodeSize * 4, Math.min(window.innerWidth * (compactMode ? 0.9 : 0.7), compactMode ? 640 : 800));
        const networkHeight = Math.max(nodeSize * 4, Math.min(window.innerHeight * (compactMode ? 0.9 : 0.7), compactMode ? 540 : 600));
        const minDistance = Math.max(nodeSize + 40, compactMode ? 100 : 120); // Minimum distance between nodes

        // Take fewer nodes on compact/low power view for performance
        const selectedMemories = memories.slice(0, compactMode ? 8 : 12);
        const selectedPeople = people.slice(0, compactMode ? 6 : 8);
        const totalNodes = selectedMemories.length + selectedPeople.length + 1; // +1 for create node

        // Generate organic neural network positions
        const positions = this.generateNeuralNetworkPositions(totalNodes, centerX, centerY, networkWidth, networkHeight, minDistance);

        // Always add "Create New Memory" node at the first position (top-center area)
        const createPos = positions[0];
        const createMemoryElement = this.createCreateMemoryNodeElement(createPos.x, createPos.y);
        this.createMemoryElement = createMemoryElement;
        const createNode = {
          element: createMemoryElement,
          x: createPos.x,
          y: createPos.y,
          vx: 0,
          vy: 0,
          baseX: createPos.x,
          baseY: createPos.y,
          connections: [],
          isCreateNode: true,
          uid: createMemoryElement.dataset.nodeUid
        };
        this.nodes.push(createNode);
        this.enableNodeDragging(createNode);

        // Create memory nodes in organic neural pattern
        selectedMemories.forEach((memory, i) => {
          const pos = positions[i + 1]; // Skip position 0 (create node)

          // Create memory node element
          const memoryElement = this.createMemoryNodeElement(memory, pos.x, pos.y);

          const memoryNode = {
            element: memoryElement,
            x: pos.x,
            y: pos.y,
            vx: 0,
            vy: 0,
            baseX: pos.x,
      baseY: pos.y,
      connections: [],
      memory: memory,
      type: 'memory',
      uid: memoryElement.dataset.nodeUid
    };
          this.nodes.push(memoryNode);
          this.enableNodeDragging(memoryNode);
        });

        // Create people nodes in remaining positions
        selectedPeople.forEach((person, i) => {
          const posIndex = selectedMemories.length + i + 1; // Skip create node and memory nodes
          const pos = positions[posIndex];

          if (pos) { // Make sure we have a position
            // Create person node element
            const personElement = this.createPersonNodeElement(person, pos.x, pos.y);

            const personNode = {
              element: personElement,
              x: pos.x,
              y: pos.y,
              vx: 0,
              vy: 0,
              baseX: pos.x,
      baseY: pos.y,
      connections: [],
      person: person,
      type: 'person',
      uid: personElement.dataset.nodeUid
    };
            this.nodes.push(personNode);
            this.enableNodeDragging(personNode);
          }
        });

        // Create intelligent connections between memories and people
        this.createMemoryPeopleConnections(selectedMemories, selectedPeople);

        // Create organic neural network connections (NOT spoked wheel)
        const organicNodes = this.nodes.filter(node => !node.isCreateNode);
        organicNodes.forEach(node => {
          organicNodes.forEach(otherNode => {
            if (node === otherNode) {
              return;
            }

            const dist = Math.sqrt(
              Math.pow(node.x - otherNode.x, 2) +
              Math.pow(node.y - otherNode.y, 2)
            );

            if (dist < 250 && node.connections.filter(conn => !conn.isCreateNode).length < 4) {
              this.linkNodes(node, otherNode);
            }
          });

          const effectiveConnections = node.connections.filter(conn => !conn.isCreateNode);
          if (effectiveConnections.length < 2) {
            const nearest = organicNodes
              .filter(otherNode => otherNode !== node)
              .map(otherNode => ({
                node: otherNode,
                dist: Math.sqrt(
                  Math.pow(node.x - otherNode.x, 2) +
                  Math.pow(node.y - otherNode.y, 2)
                )
              }))
              .sort((a, b) => a.dist - b.dist)
              .slice(0, 2);

            nearest.forEach(({ node: closestNode }) => {
              this.linkNodes(node, closestNode);
            });
          }
        });

        // Add central orb as a special node (but only some memory nodes connect to it)
        this.centralNode = {
          x: centerX,
          y: centerY,
          element: this.orb,
          connections: (this.centralNode && this.centralNode.connections) || [],
          uid: 'central-orb'
        };
        if (this.orb) {
          this.orb.dataset.nodeUid = 'central-orb';
        }

        const eligibleCentralNodes = organicNodes.filter(node => node.type === 'memory');
        const centralConnections = Math.min(4, Math.floor(eligibleCentralNodes.length / 2) || 1);
        const shuffledNodes = [...eligibleCentralNodes].sort(() => Math.random() - 0.5);
        shuffledNodes.slice(0, centralConnections).forEach(node => {
          this.linkNodes(node, this.centralNode);
        });

        this.purgeCreateNodeConnections();
        this.dedupeNodeConnections();

      }

      // Create memory node element that opens memory capsule dialog
      createMemoryNodeElement(memory, x, y) {
        const memoryElement = document.createElement('div');
        memoryElement.className = 'memory-node';

        // Add theme data attribute for styling
        memoryElement.setAttribute('data-theme', memory.theme);

        const nodeSize = this.getConstellationNodeSize();
        const borderWidth = Math.max(2, Math.round(nodeSize * 0.04));
        const baseShadow = `0 ${Math.round(nodeSize * 0.08)}px ${Math.round(nodeSize * 0.28)}px rgba(111, 99, 217, 0.3)`;
        const hoverShadow = `0 0 ${Math.round(nodeSize * 0.4)}px rgba(111, 99, 217, 0.4), 0 0 ${Math.round(nodeSize * 0.7)}px rgba(111, 99, 217, 0.24)`;

        // CLEAN CIRCULAR NODE - No text labels, pure image capsule
        memoryElement.style.cssText = `
          position: fixed;
          left: ${x}px;
          top: ${y}px;
          width: ${nodeSize}px;
          height: ${nodeSize}px;
          border-radius: 50%;
          border: ${borderWidth}px solid rgba(111, 99, 217, 0.6);
          cursor: pointer;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          opacity: 0;
          transform: scale(0);
          box-shadow: ${baseShadow};
          z-index: 1500; /* CRITICAL FIX: Higher z-index to appear above all connections */
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: auto; /* CRITICAL: Ensure nodes are clickable even with container pointer-events: none */
        `;

        // APPLY BACKGROUND AFTER BASE STYLING: Memory capsule as single node with image background
        if (memory.thumbnail) {
          // Use image as background of the entire node - NO separate elements
          memoryElement.style.backgroundImage = `url('${memory.thumbnail}')`;
          memoryElement.style.backgroundSize = 'cover';
          memoryElement.style.backgroundPosition = 'center';

        } else {
          // Fallback to gradient with emoji
          memoryElement.style.background = 'linear-gradient(135deg, #6f63d9 0%, #d06fa8 100%)';
          const emojiDiv = document.createElement('div');
          emojiDiv.style.cssText = `font-size: ${Math.round(nodeSize * 0.3)}px; color: white;`;
          emojiDiv.textContent = '💝';
          memoryElement.appendChild(emojiDiv);

        }

        memoryElement.dataset.preventClick = 'false';

        // Add click handler to open memory capsule dialog
        memoryElement.addEventListener('click', (e) => {
          if (memoryElement.dataset.preventClick === 'true') {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.stopPropagation();
          this.openMemoryCapsuleDialog(memory);
        });

        // Add hover effects
        memoryElement.addEventListener('mouseenter', () => {
          memoryElement.style.transform = 'scale(1.1)';
          memoryElement.style.boxShadow = hoverShadow;
        });

        memoryElement.addEventListener('mouseleave', () => {
          memoryElement.style.transform = 'scale(1)';
          memoryElement.style.boxShadow = baseShadow;
        });

        // 🔍 ZOOM FIX: Add to constellation container instead of body
        const targetContainer = this.constellationContainer || document.body;
        targetContainer.appendChild(memoryElement);

        // Animate in with random delay for organic feel
        const delay = Math.random() * 500 + 100;
        setTimeout(() => {
          memoryElement.style.transform = 'scale(1)';
          memoryElement.style.opacity = '1';
        }, delay);

        this.assignNodeUid(memoryElement, `memory-${memory.id || 'node'}`);
        return memoryElement;
      }

      // Create the "Create New Memory" node element with elegant SVG +
      createCreateMemoryNodeElement(x, y) {
        const createElement = document.createElement('div');
        createElement.className = 'create-memory-node';
        const nodeSize = this.getConstellationNodeSize();
        const createSize = Math.max(44, Math.round(nodeSize * 0.75));
        const createBorder = Math.max(2, Math.round(createSize * 0.05));
        const baseCreateShadow = `
            0 0 ${Math.round(createSize * 0.28)}px rgba(16, 185, 129, 0.35),
            0 0 ${Math.round(createSize * 0.5)}px rgba(16, 185, 129, 0.18),
            inset 0 0 ${Math.round(createSize * 0.28)}px rgba(16, 185, 129, 0.12)
          `;
        const hoverCreateShadow = `
            0 0 ${Math.round(createSize * 0.4)}px rgba(16, 185, 129, 0.45),
            0 0 ${Math.round(createSize * 0.7)}px rgba(16, 185, 129, 0.28),
            inset 0 0 ${Math.round(createSize * 0.38)}px rgba(16, 185, 129, 0.18)
          `;
        
        // Create elegant SVG + icon
        const svgPlus = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgPlus.setAttribute('width', '24');
        svgPlus.setAttribute('height', '24');
        svgPlus.setAttribute('viewBox', '0 0 24 24');
        svgPlus.style.cssText = `
          filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.8));
          transition: filter 0.3s ease;
        `;
        
        // Create + lines with elegant styling
        const horizontalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        horizontalLine.setAttribute('x1', '6');
        horizontalLine.setAttribute('y1', '12');
        horizontalLine.setAttribute('x2', '18');
        horizontalLine.setAttribute('y2', '12');
        horizontalLine.setAttribute('stroke', 'rgba(16, 185, 129, 1)');
        horizontalLine.setAttribute('stroke-width', '2');
        horizontalLine.setAttribute('stroke-linecap', 'round');
        
        const verticalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        verticalLine.setAttribute('x1', '12');
        verticalLine.setAttribute('y1', '6');
        verticalLine.setAttribute('x2', '12');
        verticalLine.setAttribute('y2', '18');
        verticalLine.setAttribute('stroke', 'rgba(16, 185, 129, 1)');
        verticalLine.setAttribute('stroke-width', '2');
        verticalLine.setAttribute('stroke-linecap', 'round');
        
        svgPlus.appendChild(horizontalLine);
        svgPlus.appendChild(verticalLine);
        createElement.appendChild(svgPlus);

        // Smaller, more elegant styling with compelling glow
        createElement.style.cssText = `
          position: fixed;
          left: ${x - createSize / 2}px;
          top: ${y - createSize / 2}px;
          width: ${createSize}px;
          height: ${createSize}px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(34, 197, 94, 0.15));
          backdrop-filter: blur(20px);
          border: ${createBorder}px solid rgba(16, 185, 129, 0.5);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          opacity: 0;
          transform: scale(0);
          box-shadow: ${baseCreateShadow};
          animation: addNodeGlow 3s ease-in-out infinite;
          z-index: 1500; /* CRITICAL FIX: Higher z-index to appear above all connections */
          pointer-events: auto; /* CRITICAL: Ensure create node is clickable even with container pointer-events: none */
        `;

        // Add hover effect with enhanced SVG glow
        createElement.addEventListener('mouseenter', () => {
          createElement.style.transform = 'scale(1.15)';
          createElement.style.boxShadow = hoverCreateShadow;
          svgPlus.style.filter = 'drop-shadow(0 0 12px rgba(16, 185, 129, 1))';
        });

        createElement.addEventListener('mouseleave', () => {
          createElement.style.transform = 'scale(1)';
          createElement.style.boxShadow = baseCreateShadow;
          svgPlus.style.filter = 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))';
        });

        createElement.dataset.preventClick = 'false';

        // Add click handler to open Emma chat for memory creation
        createElement.addEventListener('click', (e) => {
          if (createElement.dataset.preventClick === 'true') {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.stopPropagation();

          // Open Emma chat experience for intelligent memory creation
          this.startEmmaChatExperience();
        });

        // 🔍 ZOOM FIX: Add to constellation container instead of body
        const targetContainer = this.constellationContainer || document.body;
        targetContainer.appendChild(createElement);

        // Animate in
        setTimeout(() => {
          createElement.style.transform = 'scale(1)';
          createElement.style.opacity = '1';
        }, 100);

        this.assignNodeUid(createElement, 'create-node');
        return createElement;
      }

      // Open Emma memory creation wizard (proper capture wizard)
      openEmmaMemoryWizard() {

        // CRITICAL FIX: Debug and ensure AssistantExperience is available

        console.log('🧠 DEBUG: Available window objects:', Object.keys(window).filter(k => k.includes('Assistant') || k.includes('Experience')));

        try {
          // Wait a moment for scripts to load, then check again
          setTimeout(() => {

            if (window.AssistantExperience) {

              // Create and show the full assistant experience popup
              const assistantInstance = new window.AssistantExperience(
                { x: window.innerWidth / 2, y: window.innerHeight / 2 },
                { showCloseButton: true }
              );
              // Show the full popup - this will open with the voice wizard tab active
              assistantInstance.show();
              // Store reference for global access
              window.assistantInstance = assistantInstance;
            } else {
              console.error('🧠 AssistantExperience STILL not available after delay!');
              console.log('🧠 Available classes:', Object.keys(window).filter(k => k.endsWith('Experience')));
              this.showToast('❌ Emma Assistant not loaded', 'error');
            }
          }, 100);

        } catch (error) {
          console.error('Failed to open Emma memory wizard:', error);
          this.showToast('❌ Failed to open memory wizard', 'error');
        }
      }

      // Fallback voice memory wizard
      openVoiceMemoryWizard() {
        console.log('🧠 Opening voice memory wizard (fallback)');

        // Create a voice memory wizard modal similar to AssistantExperience
        const modalHTML = `
          <div class="voice-wizard-modal" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(25px) saturate(180%);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
          ">
            <div class="voice-wizard-content" style="
              /* 🎨 EMMA GLASSMORPHISM: Match chat interface aesthetic */
              background: rgba(26, 16, 51, 0.92);
              backdrop-filter: blur(25px) saturate(150%);
              border-radius: 20px;
              padding: 40px;
              width: 90%;
              max-width: 600px;
              border: 1px solid rgba(255, 255, 255, 0.12);
              box-shadow: 
                0 25px 80px rgba(0, 0, 0, 0.4),
                0 0 0 1px rgba(255, 255, 255, 0.08),
                inset 0 1px 0 rgba(255, 255, 255, 0.12);
              color: white;
              text-align: center;
            ">
              <div class="emma-section">
                <div style="color: rgba(255, 255, 255, 0.8); font-size: 14px; margin-bottom: 8px;">EMMA ASKS</div>
                <h1 style="margin: 0 0 24px 0; font-size: 28px; font-weight: 700;">
                  What's your favorite memory with Mom? Take your time, I'm listening.
                </h1>
                <div class="suggestions" style="margin-bottom: 32px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                  <button class="suggestion-chip" style="
                    padding: 8px 16px;
                    background: rgba(255, 255, 255, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 20px;
                    color: white;
                    font-size: 14px;
                    cursor: pointer;
                  ">Holiday traditions</button>
                  <button class="suggestion-chip" style="
                    padding: 8px 16px;
                    background: rgba(255, 255, 255, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 20px;
                    color: white;
                    font-size: 14px;
                    cursor: pointer;
                  ">Her wisdom</button>
                  <button class="suggestion-chip" style="
                    padding: 8px 16px;
                    background: rgba(255, 255, 255, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 20px;
                    color: white;
                    font-size: 14px;
                    cursor: pointer;
                  ">Family meals</button>
                </div>
              </div>

              <div class="voice-capture" style="margin-bottom: 32px;">
                <div class="voice-button-container" style="margin-bottom: 16px;">
                  <button class="voice-button" style="
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.2);
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto;
                  ">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" x2="12" y1="19" y2="22"/>
                      <line x1="8" x2="16" y1="22" y2="22"/>
                    </svg>
                  </button>
                </div>
                <div style="color: rgba(255, 255, 255, 0.8); font-size: 14px;">Tap to start recording</div>
              </div>

              <div class="transcription" style="margin-bottom: 32px;">
                <div style="color: rgba(255, 255, 255, 0.8); font-size: 14px; margin-bottom: 8px;">YOUR STORY</div>
                <div style="
                  background: rgba(255, 255, 255, 0.1);
                  border-radius: 12px;
                  padding: 20px;
                  min-height: 80px;
                  font-style: italic;
                  color: rgba(255, 255, 255, 0.6);
                ">Your words will appear here as you speak...</div>
              </div>

              <div style="margin-bottom: 24px;">
                <div style="color: rgba(255, 255, 255, 0.8); font-size: 14px; margin-bottom: 8px;">1 of 5 questions</div>
                <div style="
                  width: 100%;
                  height: 4px;
                  background: rgba(255, 255, 255, 0.2);
                  border-radius: 2px;
                  overflow: hidden;
                ">
                  <div style="
                    width: 20%;
                    height: 100%;
                    background: linear-gradient(90deg, #ffffff, rgba(255, 255, 255, 0.8));
                    border-radius: 2px;
                  "></div>
                </div>
              </div>

              <div style="display: flex; gap: 12px; justify-content: center;">
                <button class="skip-btn" style="
                  padding: 14px 28px;
                  border: 2px solid rgba(255, 255, 255, 0.3);
                  background: rgba(255, 255, 255, 0.1);
                  color: white;
                  border-radius: 10px;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: 500;
                ">Skip</button>
                <button class="continue-btn" style="
                  padding: 14px 28px;
                  border: none;
                  background: rgba(255, 255, 255, 0.9);
                  color: #6b46c1;
                  border-radius: 10px;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: 600;
                ">Continue →</button>
              </div>
            </div>
          </div>
        `;

        // Create and show modal - SECURITY FIX: Use safe DOM creation
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'vault-migration-modal';
        modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(25px) saturate(180%); z-index: 10000; align-items: center; justify-content: center;';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = 'background: rgba(26, 16, 51, 0.92); backdrop-filter: blur(25px) saturate(150%); border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.12); padding: 40px; border-radius: 20px; max-width: 500px; text-align: center;';

        const title = document.createElement('h2');
        title.textContent = '🔄 Vault Migration Available';
        title.style.cssText = 'color: white; margin-bottom: 20px; font-size: 24px;';

        const description = document.createElement('p');
        description.textContent = 'A new vault storage system is available with enhanced security and performance. Would you like to migrate your existing vault?';
        description.style.cssText = 'color: rgba(255, 255, 255, 0.8); margin-bottom: 30px; line-height: 1.6;';

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 15px; justify-content: center;';

        const skipBtn = document.createElement('button');
        skipBtn.className = 'skip-btn';
        skipBtn.textContent = 'Skip for Now';
        skipBtn.style.cssText = 'padding: 12px 24px; background: rgba(255, 255, 255, 0.1); color: white; border: none; border-radius: 8px; cursor: pointer;';

        const continueBtn = document.createElement('button');
        continueBtn.className = 'continue-btn';
        continueBtn.textContent = 'Migrate Vault';
        continueBtn.style.cssText = 'padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #deb3e4 100%); color: white; border: none; border-radius: 8px; cursor: pointer;';

        buttonContainer.appendChild(skipBtn);
        buttonContainer.appendChild(continueBtn);
        modalContent.appendChild(title);
        modalContent.appendChild(description);
        modalContent.appendChild(buttonContainer);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Add event listeners
        const skipBtnQuery = modal.querySelector('.skip-btn');
        const continueBtnQuery = modal.querySelector('.continue-btn');

        skipBtnQuery.addEventListener('click', () => modal.remove());
        continueBtnQuery.addEventListener('click', () => {
          // For now, just show a message and close
          this.showToast('🎤 Voice wizard coming soon!', 'info');
          modal.remove();
        });

        // Close on outside click
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            modal.remove();
          }
        });
      }

      // Open memory capsule dialog (reuses existing memory dialog system)
      openMemoryCapsuleDialog(memory) {

        this.openMemoryDialog(memory);
      }

      // Create neural branches from central Emma neuron
      createNeuralBranches(memories) {

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // First layer - primary neurons directly connected to Emma
        const primaryCount = Math.min(8, memories.length); // Max 8 primary branches
        const primaryAngleStep = (Math.PI * 2) / primaryCount;
        const primaryRadius = 200;

        // Create primary neurons
        const primaryNeurons = [];
        for (let i = 0; i < primaryCount; i++) {
          const angle = i * primaryAngleStep - Math.PI / 2;
          const x = centerX + Math.cos(angle) * primaryRadius;
          const y = centerY + Math.sin(angle) * primaryRadius;

          if (memories[i]) {
            const neuron = this.createMemoryNode(memories[i], x, y, memories[i].theme);
            neuron.isPrimary = true;
            neuron.connections.push(this.centralNeuron);
            this.centralNeuron.connections.push(neuron);
            primaryNeurons.push(neuron);
            this.nodes.push(neuron);
          }
        }

        // Create secondary and tertiary neurons branching from primaries
        let memoryIndex = primaryCount;
        primaryNeurons.forEach((primaryNeuron, primaryIndex) => {
          // Calculate how many secondary neurons this primary should have
          const remainingMemories = memories.length - memoryIndex;
          const remainingPrimaries = primaryCount - primaryIndex;
          const secondaryCount = Math.ceil(remainingMemories / remainingPrimaries);

          // Create secondary neurons
          for (let j = 0; j < secondaryCount && memoryIndex < memories.length; j++) {
            const memory = memories[memoryIndex++];

            // Position secondary neurons in an arc around the primary
            const secondaryAngle = primaryIndex * primaryAngleStep +
              (j - secondaryCount/2) * (Math.PI / 6) / secondaryCount;
            const secondaryRadius = 120 + Math.random() * 60;

            const x = primaryNeuron.x + Math.cos(secondaryAngle) * secondaryRadius;
            const y = primaryNeuron.y + Math.sin(secondaryAngle) * secondaryRadius;

            // Ensure within bounds
            const padding = 100;
            const finalX = Math.max(padding, Math.min(window.innerWidth - padding, x));
            const finalY = Math.max(padding, Math.min(window.innerHeight - padding, y));

            const secondaryNeuron = this.createMemoryNode(memory, finalX, finalY, memory.theme);
            secondaryNeuron.isSecondary = true;
            secondaryNeuron.connections.push(primaryNeuron);
            primaryNeuron.connections.push(secondaryNeuron);
            this.nodes.push(secondaryNeuron);
          }
        });

      }

      // Create individual memory node
      createMemoryNode(memory, x, y, theme) {
        console.log(`🌟 Creating memory node element for "${memory.title}" at (${x}, ${y})`);

        const memoryElement = document.createElement('div');
        memoryElement.className = 'memory-node';

        // SECURITY FIX: Use safe DOM creation instead of innerHTML
        const thumbnail = document.createElement('div');
        thumbnail.className = 'memory-thumbnail';
        thumbnail.textContent = memory.thumbnail; // Safe text content

        const label = document.createElement('div');
        label.className = 'memory-label';
        label.textContent = memory.title; // Safe text content

        memoryElement.appendChild(thumbnail);
        memoryElement.appendChild(label);

        // Add theme data attribute for styling
        memoryElement.setAttribute('data-theme', theme);

        // Style the memory node
        memoryElement.style.cssText = `
          position: fixed;
          left: ${x}px;
          top: ${y}px;
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.1), rgba(111, 99, 217, 0.2));
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          transform: scale(0);
          opacity: 0;
          z-index: 1000;
          color: white;
        `;

        memoryElement.dataset.preventClick = 'false';

        // Add click handler for elegant memory dialog
        memoryElement.addEventListener('click', (e) => {
          if (memoryElement.dataset.preventClick === 'true') {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.stopPropagation();
          this.openMemoryDialog(memory);
        });

        // Add hover effects with theme-based glow
        memoryElement.addEventListener('mouseenter', () => {
          const themeColors = {
            family: 'rgba(255, 105, 135, 0.8)',
            travel: 'rgba(52, 211, 153, 0.8)',
            recent: 'rgba(96, 165, 250, 0.8)',
            special: 'rgba(251, 191, 36, 0.8)'
          };

          memoryElement.style.transform = 'scale(1.3)';
          memoryElement.style.boxShadow = `0 0 32px ${themeColors[theme] || 'rgba(111, 99, 217, 0.55)'}, 0 0 52px ${themeColors[theme] || 'rgba(111, 99, 217, 0.28)'}`;
          memoryElement.style.zIndex = '1600'; /* CRITICAL FIX: Even higher on hover to stay above everything */
        });

        memoryElement.addEventListener('mouseleave', () => {
          memoryElement.style.transform = 'scale(1)';
          memoryElement.style.boxShadow = '';
          memoryElement.style.zIndex = '1500'; /* CRITICAL FIX: Maintain high z-index even when not hovering */
        });

        // 🔍 ZOOM FIX: Add to constellation container for proper zoom behavior
        const targetContainer = this.constellationContainer || document.querySelector('.dashboard') || document.body;
        targetContainer.appendChild(memoryElement);

        // Animate in with staggered timing
        const delay = Math.random() * 500 + 200; // 200-700ms delay
        setTimeout(() => {

          memoryElement.style.transform = 'scale(1)';
          memoryElement.style.opacity = '1';
        }, delay);

        const uid = this.assignNodeUid(memoryElement, `memory-${memory.id || 'node'}`);

        const nodeData = {
          element: memoryElement,
          x: x,
          y: y,
          baseX: x,
          baseY: y,
          vx: 0,
          vy: 0,
          memory: memory,
          theme: theme,
          connections: [],
          uid: uid,
          type: 'memory'
        };

        this.enableNodeDragging(nodeData);

        return nodeData;
      }

      // Create person node element for constellation with heartbeat effect
      createPersonNodeElement(person, x, y) {
        const personElement = document.createElement('div');
        personElement.className = 'person-node';

        // Create person avatar with first letter of name
        const avatar = person.name.charAt(0).toUpperCase();
        const relationColor = this.getRelationColor(person.relation);
        const nodeSize = this.getConstellationNodeSize();
        const personSize = Math.max(56, Math.round(nodeSize * 1.05));
        const borderWidth = Math.max(2, Math.round(personSize * 0.045));
        const basePersonShadow = `
            0 ${Math.round(personSize * 0.08)}px ${Math.round(personSize * 0.3)}px ${relationColor.glow},
            0 0 ${Math.round(personSize * 0.18)}px rgba(239, 68, 68, 0.26),
            0 0 ${Math.round(personSize * 0.32)}px rgba(239, 68, 68, 0.1)
          `;
        const hoverPersonShadow = `
            0 0 ${Math.round(personSize * 0.42)}px ${relationColor.glow},
            0 0 ${Math.round(personSize * 0.75)}px rgba(239, 68, 68, 0.3)
          `;

        // Create BIGGER avatar circle with subtle heartbeat glow - NO TEXT LABELS
        personElement.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          width: ${personSize}px;
          height: ${personSize}px;
          border-radius: 50%;
          background: ${relationColor.gradient};
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: ${Math.round(personSize * 0.33)}px;
          border: ${borderWidth}px solid ${relationColor.border};
          box-shadow: ${basePersonShadow};
          overflow: hidden;
          cursor: pointer;
          transform: scale(0);
          opacity: 0;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          animation: heartbeat 4s ease-in-out infinite;
          z-index: 1500; /* CRITICAL FIX: Higher z-index to appear above all connections */
          pointer-events: auto; /* CRITICAL: Ensure person nodes are clickable even with container pointer-events: none */
        `;

        // Start with letter, then try to load avatar image
        personElement.textContent = avatar;

        // Try to load actual avatar image if person has one
        if (person.avatarId) {
          this.loadPersonAvatar(person, personElement, avatar);
        }

        personElement.dataset.preventClick = 'false';

        // Add click handler to open person summary modal
        personElement.addEventListener('click', (e) => {
          if (personElement.dataset.preventClick === 'true') {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.stopPropagation();
          this.openPersonSummaryModal(person);
        });

        // Add hover effects with relation-based glow
        personElement.addEventListener('mouseenter', () => {
          personElement.style.transform = 'scale(1.15)';
          personElement.style.boxShadow = hoverPersonShadow;
          personElement.style.zIndex = '1600'; /* CRITICAL FIX: Even higher on hover to stay above everything */
        });

        personElement.addEventListener('mouseleave', () => {
          personElement.style.transform = 'scale(1)';
          personElement.style.boxShadow = basePersonShadow;
          personElement.style.zIndex = '1500'; /* CRITICAL FIX: Maintain high z-index even when not hovering */
        });

        // 🔗 CRITICAL FIX: Append to constellation container for zoom/pan anchoring
        if (this.constellationContainer) {
          this.constellationContainer.appendChild(personElement);
        } else {
          const container = document.querySelector('.dashboard') || document.body;
          container.appendChild(personElement);
        }

        // Animate in with staggered timing
        const delay = Math.random() * 500 + 300; // 300-800ms delay
        setTimeout(() => {

          personElement.style.transform = 'scale(1)';
          personElement.style.opacity = '1';
        }, delay);

        this.assignNodeUid(personElement, `person-${person.id || 'node'}`);
        return personElement;
      }

      // Load actual avatar image for person node
      async loadPersonAvatar(person, personElement, fallbackLetter) {
        try {

          // FIXED: Use avatarUrl directly from extension (already reconstructed)
          if (person.avatarUrl) {
            // Create image element
            const img = document.createElement('img');
            img.src = person.avatarUrl;
            img.draggable = false;
             img.style.pointerEvents = 'none';
            img.alt = person.name || 'Person avatar';
            img.addEventListener('dragstart', (event) => event.preventDefault());
            img.alt = `${person.name} avatar`;
            img.style.cssText = `
              width: 100%;
              height: 100%;
              object-fit: cover;
              border-radius: 50%;
            `;

            img.onload = () => {
              // Replace letter with image once loaded
              personElement.innerHTML = '';
              personElement.appendChild(img);

            };

            img.onerror = () => {
              console.error('📷 CONSTELLATION: Failed to display avatar for:', person.name);
              // Keep the letter fallback
            };
          } else {
            console.warn('📷 CONSTELLATION: No avatar URL for:', person.name);
          }
        } catch (error) {
          console.error('📷 CONSTELLATION: Error loading avatar for:', person.name, error);
          // Keep the letter fallback
        }
      }

      // Open revolutionary migration page
      openMigrationPage() {

        window.location.href = 'pages/vault-migration.html';
      }

      // Open person summary modal with connected memories
      async openPersonSummaryModal(person) {

        // 🎯 FIXED: Use same memory loading approach as people-emma.html
        let connectedMemories = [];
        try {
          if (!window.emmaWebVault || !window.emmaWebVault.vaultData?.content) {
            console.error('❌ CONSTELLATION: Vault data not available');
            return;
          }

          const vaultData = window.emmaWebVault.vaultData;
          const allMemories = vaultData.content.memories || {};

          // Find memories that include this person - SAME LOGIC AS PEOPLE-EMMA.HTML
          for (const [memoryId, memory] of Object.entries(allMemories)) {
            const memoryWithId = memory.id ? memory : { ...memory, id: memoryId };

            if (window.metadataIncludesPerson(memory.metadata?.people, person)) {
              connectedMemories.push(memoryWithId);
              continue;
            }

            // Content-based inference removed for accuracy; rely on explicit metadata links only
          }

          console.log(`🔗 CONSTELLATION: Found ${connectedMemories.length} memories for person ${person.id}`);

        } catch (error) {
          console.error('❌ CONSTELLATION: Error loading memories:', error);
        }

        // Create modal HTML
        const modalHTML = `
          <div class="person-summary-modal-overlay" id="person-summary-overlay" onclick="window.memoryConstellation.closePersonSummaryModal()">
            <div class="person-summary-modal" onclick="event.stopPropagation()">
              <button class="modal-close" onclick="window.memoryConstellation.closePersonSummaryModal()">×</button>

              <div class="person-summary-header">
                <div class="person-summary-avatar" id="person-summary-avatar">
                  ${person.name.charAt(0).toUpperCase()}
                </div>
                <div class="person-summary-info">
                  <h2 class="person-summary-name">${person.name}</h2>
                  <p class="person-summary-relation">${person.relation || 'other'}</p>
                  <p class="person-summary-contact">${person.contact || 'No contact info'}</p>
                </div>
              </div>

              <div class="person-summary-content">
                <h3 class="summary-section-title">Connected Memories</h3>
                <div class="connected-memories">
                  ${connectedMemories.length > 0 ?
                    connectedMemories.map(memory => {
                      // Get thumbnail from attachments or fallback
                      const thumbnail = memory.thumbnail ||
                                       (memory.attachments && memory.attachments.length > 0 && memory.attachments[0].url ? memory.attachments[0].url : null);
                      const memoryTitle = memory.metadata?.title || memory.title || memory.subject || 'Untitled Memory';
                      const memoryDate = memory.created || memory.date || memory.timestamp;

                      return `
                        <div class="connected-memory-item" onclick="window.memoryConstellation.openMemoryFromPerson('${memory.id}')">
                          <div class="memory-preview">
                            ${thumbnail ? `<img src="${thumbnail}" alt="Memory">` : '💝'}
                          </div>
                          <div class="memory-info">
                            <div class="memory-title">${memoryTitle}</div>
                            <div class="memory-date">${memoryDate ? new Date(memoryDate).toLocaleDateString() : 'Unknown date'}</div>
                          </div>
                        </div>
                      `;
                    }).join('') :
                    '<div class="no-memories">No connected memories yet</div>'
                  }
                </div>

                <div class="person-summary-actions">
                  <button class="btn btn-primary" onclick="window.memoryConstellation.createMemoryWithPersonFromConstellation('${person.id}')">
                    <span>✨</span>
                    Create Memory Together
                  </button>
                  <button class="btn btn-secondary" onclick="window.location.href='pages/people-emma.html'">
                    <span>👥</span>
                    Manage People
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Make constellation functions globally accessible for modal
        window.memoryConstellation = this;

        // Load avatar if available - CRITICAL for showing person's image
        if (person.avatarUrl) {
          this.loadAvatarForSummary(person);
        } else {

        }

        // Show modal with animation
        setTimeout(() => {
          document.getElementById('person-summary-overlay').classList.add('active');
        }, 10);
      }

      async loadAvatarForSummary(person) {
        try {

          // FIXED: Use avatarUrl directly (same as constellation nodes and people page)
          if (person.avatarUrl) {
            const avatarElement = document.getElementById('person-summary-avatar');
            if (avatarElement) {

              avatarElement.innerHTML = `<img src="${person.avatarUrl}" alt="${person.name}" style="
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 50%;
              ">`;

            } else {
              console.error('📷 SUMMARY: Avatar element not found in DOM');
            }
          } else {
            console.warn('📷 SUMMARY: No avatarUrl available for:', person.name);
          }
        } catch (error) {
          console.error('📷 SUMMARY: Error loading avatar for:', person.name, error);
        }
      }

      closePersonSummaryModal() {
        const overlay = document.getElementById('person-summary-overlay');
        if (overlay) {
          overlay.classList.remove('active');
          setTimeout(() => overlay.remove(), 300);
        }
      }

      createMemoryWithPersonFromConstellation(personId) {
        this.closePersonSummaryModal();
        window.location.href = `dashboard.html?createMemory=true&person=${personId}`;
      }

      async openMemoryFromPerson(memoryId) {

        this.closePersonSummaryModal();

        // Find the memory in our loaded memories
        try {
          let allMemories = [];
          if (window.emmaWebVault && window.emmaWebVault.extensionAvailable) {
            allMemories = await window.emmaWebVault.listMemories(1000);
          }

          const memory = allMemories.find(m => m.id === memoryId);
          if (memory) {
            this.openMemoryDialog(memory);
          } else {
            console.error('💝 Memory not found:', memoryId);
            this.showToast('❌ Memory not found', 'error');
          }
        } catch (error) {
          console.error('💝 Error opening memory from person:', error);
          this.showToast('❌ Error opening memory', 'error');
        }
      }

      // Get relation-specific colors for people nodes
      getRelationColor(relation) {
        const colors = {
          family: {
            gradient: 'linear-gradient(135deg, #ef4444, #f87171)',
            border: 'rgba(239, 68, 68, 0.6)',
            glow: 'rgba(239, 68, 68, 0.8)'
          },
          friend: {
            gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
            border: 'rgba(59, 130, 246, 0.6)',
            glow: 'rgba(59, 130, 246, 0.8)'
          },
          colleague: {
            gradient: 'linear-gradient(135deg, #10b981, #34d399)',
            border: 'rgba(16, 185, 129, 0.6)',
            glow: 'rgba(16, 185, 129, 0.8)'
          },
          romantic: {
            gradient: 'linear-gradient(135deg, #d06fa8, #f472b6)',
            border: 'rgba(208, 111, 168, 0.6)',
            glow: 'rgba(208, 111, 168, 0.8)'
          }
        };

        return colors[relation] || colors.friend; // Default to friend colors
      }

      // Open person dialog (placeholder)
      openPersonDialog(person) {

        this.showToast(`👥 ${person.name} (${person.relation})`, 'info');
      }

      // Create intelligent connections between memory nodes and people nodes
      createMemoryPeopleConnections(memories, people) {

        const memoryNodes = this.nodes.filter(node => node.type === 'memory');
        const peopleNodes = this.nodes.filter(node => node.type === 'person');
        const reducePhysics = this.shouldReduceConstellationPhysics();

        // For each memory, connect to people who were involved
        memoryNodes.forEach(memoryNode => {
          const memory = memoryNode.memory;

          // Check if memory has people data (from wizard selections or manual input)
          if (memory.selectedPeople && Array.isArray(memory.selectedPeople)) {
            // Connect to people selected in wizard
            memory.selectedPeople.forEach(personId => {
              const personNode = peopleNodes.find(pNode => pNode.person.id === personId);
              if (personNode) {
                this.linkNodes(memoryNode, personNode);
              }
            });
          }

          // Also check if people are mentioned in memory content/responses
          const memoryText = (memory.content || '').toLowerCase() + ' ' +
                            (memory.responses || []).join(' ').toLowerCase();

          peopleNodes.forEach(personNode => {
            const personName = personNode.person.name.toLowerCase();

            // If person's name is mentioned in the memory text, create connection
            if (memoryText.includes(personName)) {
              this.linkNodes(memoryNode, personNode);
              console.log(`🔗 Auto-connected memory "${memory.title}" to person "${personNode.person.name}" (name mentioned)`);
            }
          });
        });

                if (!reducePhysics) {
          // Create some random connections for people who aren't connected to anything
          peopleNodes.forEach(personNode => {
            if (personNode.connections.length === 0) {
              let closestMemory = null;
              let closestDistance = Infinity;

              memoryNodes.forEach(memoryNode => {
                const dx = personNode.x - memoryNode.x;
                const dy = personNode.y - memoryNode.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < closestDistance && memoryNode.connections.length < 3) {
                  closestDistance = distance;
                  closestMemory = memoryNode;
                }
              });

              if (closestMemory) {
                this.linkNodes(personNode, closestMemory);
              }
            }
          });
        }
      }      // Update neural network node positions with overlap prevention
      updateConstellationNodes() {
        const time = Date.now() * 0.001;

        // Update all memory nodes
        this.nodes.forEach((node, i) => {
          // Reset forces
          let forceX = 0;
          let forceY = 0;

          // Repulsion from other nodes to prevent overlap
          this.nodes.forEach((otherNode, j) => {
            if (i !== j) {
              const dx = node.x - otherNode.x;
              const dy = node.y - otherNode.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              const minDistance = node.isPrimary || otherNode.isPrimary ? 150 : 120;
              if (distance < minDistance) {
                const force = (minDistance - distance) / distance * 0.3;
                forceX += dx * force;
                forceY += dy * force;
              }
            }
          });

          // Also repel from central neuron
          if (this.centralNeuron) {
            const dx = node.x - this.centralNeuron.x;
            const dy = node.y - this.centralNeuron.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 150) {
              const force = (150 - distance) / distance * 0.4;
              forceX += dx * force;
              forceY += dy * force;
            }
          }

          // Gentle attraction to base position
          const baseAttraction = node.isPrimary ? 0.03 : 0.02;
          forceX += (node.baseX - node.x) * baseAttraction;
          forceY += (node.baseY - node.y) * baseAttraction;

          // Subtle floating motion - less for primary nodes
          const floatAmplitude = node.isPrimary ? 1.5 : 2.5;
          const floatX = Math.sin(time * 0.15 + i * 0.7) * floatAmplitude;
          const floatY = Math.cos(time * 0.12 + i * 0.5) * floatAmplitude;

          // Apply forces
          node.vx = (node.vx + forceX) * 0.92; // Damping
          node.vy = (node.vy + forceY) * 0.92;

          // Update position
          node.x += node.vx + floatX * 0.4;
          node.y += node.vy + floatY * 0.4;

          // Keep within bounds
          const padding = 80;
          node.x = Math.max(padding, Math.min(window.innerWidth - padding, node.x));
          node.y = Math.max(padding, Math.min(window.innerHeight - padding, node.y));

          // Update DOM position
          if (node.element) {
            node.element.style.left = node.x + 'px';
            node.element.style.top = node.y + 'px';
          }
        });

        // The central neuron (Emma orb) stays fixed at center
        if (this.centralNeuron) {
          this.centralNeuron.x = window.innerWidth / 2;
          this.centralNeuron.y = window.innerHeight / 2;
        }
      }

      // Show elegant constellation burger menu
      showConstellationUI() {
        // Initialize constellation filters state
        this.constellationFilters = {
          memories: true,
          people: true,
          family: true,
          travel: true,
          recent: true,
          special: true
        };
        const savedFilters = this.loadSavedConstellationFilters();
        if (savedFilters) {
          this.constellationFilters = { ...this.constellationFilters, ...savedFilters };
        }

        // Create elegant burger menu
        const burgerMenu = document.createElement('div');
        burgerMenu.className = 'constellation-burger-menu';
        burgerMenu.innerHTML = `
          <!-- Burger Button -->
          <button class="constellation-burger-btn" id="constellationBurger">
            <div class="burger-lines">
              <span></span>
              <span></span>
              <span></span>
          </div>
            <div class="burger-label">Filters</div>
          </button>

          <!-- Expandable Menu Panel -->
          <div class="constellation-menu-panel" id="constellationPanel">
            <div class="panel-header">
              <h3>🌟 Constellation Filters</h3>
              <button class="panel-close" onclick="dashboard.exitMemoryConstellation()">✕</button>
            </div>

            <div class="filter-section">
              <h4>Node Types</h4>
              <div class="filter-toggles">
                <label class="filter-toggle">
                  <input type="checkbox" id="filter-memories" checked>
                  <span class="toggle-slider"></span>
                  <span class="toggle-label">💝 Memories</span>
                  <span class="toggle-count" id="count-memories">0</span>
                </label>

                <label class="filter-toggle">
                  <input type="checkbox" id="filter-people" checked>
                  <span class="toggle-slider"></span>
                  <span class="toggle-label">👤 People</span>
                  <span class="toggle-count" id="count-people">0</span>
                </label>
              </div>
            </div>

            <div class="filter-section">
              <h4>Memory Themes</h4>
              <div class="filter-toggles">
                <label class="filter-toggle">
                  <input type="checkbox" id="filter-family" checked>
                  <span class="toggle-slider family"></span>
                  <span class="toggle-label">👨‍👩‍👧‍👦 Family</span>
                  <span class="toggle-count" id="count-family">0</span>
                </label>

                <label class="filter-toggle">
                  <input type="checkbox" id="filter-travel" checked>
                  <span class="toggle-slider travel"></span>
                  <span class="toggle-label">✈️ Travel</span>
                  <span class="toggle-count" id="count-travel">0</span>
                </label>

                <label class="filter-toggle">
                  <input type="checkbox" id="filter-recent" checked>
                  <span class="toggle-slider recent"></span>
                  <span class="toggle-label">🕒 Recent</span>
                  <span class="toggle-count" id="count-recent">0</span>
                </label>

                <label class="filter-toggle">
                  <input type="checkbox" id="filter-special" checked>
                  <span class="toggle-slider special"></span>
                  <span class="toggle-label">⭐ Special</span>
                  <span class="toggle-count" id="count-special">0</span>
                </label>
              </div>
            </div>

            <div class="filter-actions">
              <button class="filter-btn secondary" id="reset-filters-btn">
                Reset All
              </button>
              <button class="filter-btn primary" id="apply-filters-btn">
                Apply Filters
              </button>
            </div>
          </div>
        `;

        // Add elegant styles
        const styles = document.createElement('style');
        styles.textContent = `
          .constellation-burger-menu {
          position: fixed;
          top: 20px;
          left: 20px;
            z-index: 2000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }

          .constellation-burger-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            background: rgba(17, 17, 27, 0.95);
            border: 1px solid rgba(111, 99, 217, 0.4);
            border-radius: 12px;
            padding: 12px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(15px);
            box-shadow: 0 8px 32px rgba(111, 99, 217, 0.15);
          }

          .constellation-burger-btn:hover {
            background: rgba(111, 99, 217, 0.1);
            border-color: rgba(111, 99, 217, 0.6);
            transform: translateY(-2px);
            box-shadow: 0 12px 40px rgba(111, 99, 217, 0.25);
          }

          .burger-lines {
            display: flex;
            flex-direction: column;
            gap: 3px;
          }

          .burger-lines span {
            width: 18px;
            height: 2px;
            background: rgba(111, 99, 217, 0.8);
            border-radius: 1px;
            transition: all 0.3s ease;
          }

          .constellation-burger-btn:hover .burger-lines span {
            background: rgba(111, 99, 217, 1);
          }

          .burger-label {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .constellation-menu-panel {
            position: absolute;
            top: 0;
            left: 0;
            width: 320px;
            background: rgba(17, 17, 27, 0.98);
          border: 1px solid rgba(111, 99, 217, 0.3);
            border-radius: 16px;
            backdrop-filter: blur(20px);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
            transform: translateX(-100%) scale(0.95);
            opacity: 0;
            visibility: hidden;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
          }

          .constellation-menu-panel.active {
            transform: translateX(0) scale(1);
            opacity: 1;
            visibility: visible;
          }

          .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px 16px;
            border-bottom: 1px solid rgba(111, 99, 217, 0.2);
          }

          .panel-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: white;
          }

          .panel-close {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            font-size: 18px;
            cursor: pointer;
            padding: 4px;
            border-radius: 6px;
            transition: all 0.2s ease;
          }

          .panel-close:hover {
            background: rgba(255, 255, 255, 0.1);
            color: white;
          }

          .filter-section {
            padding: 20px 24px;
            border-bottom: 1px solid rgba(111, 99, 217, 0.1);
          }

          .filter-section:last-of-type {
            border-bottom: none;
          }

          .filter-section h4 {
            margin: 0 0 16px 0;
            font-size: 14px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.8);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .filter-toggles {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .filter-toggle {
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            padding: 8px 0;
            transition: all 0.2s ease;
          }

          .filter-toggle:hover {
            background: rgba(111, 99, 217, 0.05);
            border-radius: 8px;
            padding: 8px 8px;
            margin: 0 -8px;
          }

          .filter-toggle input[type="checkbox"] {
            display: none;
          }

          .toggle-slider {
            position: relative;
            width: 40px;
            height: 20px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            transition: all 0.3s ease;
            flex-shrink: 0;
          }

          .toggle-slider:before {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 16px;
            height: 16px;
            background: white;
            border-radius: 50%;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }

          .filter-toggle input:checked + .toggle-slider {
            background: rgba(111, 99, 217, 0.8);
          }

          .filter-toggle input:checked + .toggle-slider:before {
            transform: translateX(20px);
            background: white;
          }

          /* Theme-specific toggle colors */
          .toggle-slider.family:before { background: rgba(255, 105, 135, 0.1); }
          .filter-toggle input:checked + .toggle-slider.family { background: rgba(255, 105, 135, 0.8); }

          .toggle-slider.travel:before { background: rgba(52, 211, 153, 0.1); }
          .filter-toggle input:checked + .toggle-slider.travel { background: rgba(52, 211, 153, 0.8); }

          .toggle-slider.recent:before { background: rgba(96, 165, 250, 0.1); }
          .filter-toggle input:checked + .toggle-slider.recent { background: rgba(96, 165, 250, 0.8); }

          .toggle-slider.special:before { background: rgba(251, 191, 36, 0.1); }
          .filter-toggle input:checked + .toggle-slider.special { background: rgba(251, 191, 36, 0.8); }

          .toggle-label {
            flex: 1;
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            font-weight: 500;
          }

          .toggle-count {
            background: rgba(111, 99, 217, 0.2);
            color: rgba(111, 99, 217, 1);
            padding: 2px 8px;
          border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            min-width: 20px;
            text-align: center;
          }

          .filter-actions {
            padding: 20px 24px;
            display: flex;
            gap: 12px;
          }

          .filter-btn {
            flex: 1;
            padding: 12px 16px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .filter-btn.secondary {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.8);
          }

          .filter-btn.secondary:hover {
            background: rgba(255, 255, 255, 0.15);
            color: white;
          }

          .filter-btn.primary {
            background: rgba(111, 99, 217, 0.8);
            color: white;
          }

          .filter-btn.primary:hover {
            background: rgba(111, 99, 217, 1);
            transform: translateY(-1px);
          }
        `;

        document.head.appendChild(styles);
        document.body.appendChild(burgerMenu);

        // Set up burger menu interactions
        this.setupConstellationMenu();

        // Update counts
        this.updateConstellationCounts();

        this.constellationUI = burgerMenu;
        
        // 🎯 NO CONTROLS NEEDED: Natural gestures (wheel zoom, drag pan, pinch) are intuitive
      }

      // Set up constellation menu interactions
      setupConstellationMenu() {
        const burgerBtn = document.getElementById('constellationBurger');
        const panel = document.getElementById('constellationPanel');

        // Toggle menu on burger click
        burgerBtn.addEventListener('click', () => {
          panel.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
          if (!burgerBtn.contains(e.target) && !panel.contains(e.target)) {
            panel.classList.remove('active');
          }
        });

        // Set up filter toggle event listeners
        const filterInputs = panel.querySelectorAll('input[type="checkbox"]');
        filterInputs.forEach(input => {
          const filterType = input.id.replace('filter-', '');
          if (this.constellationFilters && typeof this.constellationFilters[filterType] === 'boolean') {
            input.checked = this.constellationFilters[filterType];
          } else {
            this.constellationFilters[filterType] = input.checked;
          }
          input.addEventListener('change', (e) => {
            const filterType = e.target.id.replace('filter-', '');
            this.toggleConstellationFilter(filterType, e.target.checked);
          });
        });

        // Set up action button event listeners
        document.getElementById('reset-filters-btn').addEventListener('click', () => {
          this.resetConstellationFilters();
        });

        document.getElementById('apply-filters-btn').addEventListener('click', () => {
          this.hideConstellationMenu();
        });

        // Apply saved filter state immediately so constellation reflects preferences
        this.applyConstellationFilters();
        this.persistConstellationFilters();
      }

      // Toggle constellation filter and update display
      toggleConstellationFilter(filterType, enabled) {
        if (!this.constellationFilters) {
          this.constellationFilters = {};
        }
        this.constellationFilters[filterType] = enabled;
        this.persistConstellationFilters();

        // Apply filters with smooth animation
        this.applyConstellationFilters();
      }

      // Apply constellation filters with smooth animations
      applyConstellationFilters() {
        const nodes = document.querySelectorAll('.memory-node, .person-node');

        nodes.forEach(node => {
          const nodeType = node.classList.contains('memory-node') ? 'memory' : 'person';
          const theme = node.dataset.theme || 'recent';

          let shouldShow = false;

          // Check if node type is enabled
          if (nodeType === 'memory' && this.constellationFilters.memories) {
            // Check if memory theme is enabled
            shouldShow = this.constellationFilters[theme];
          } else if (nodeType === 'person' && this.constellationFilters.people) {
            shouldShow = true;
          }

          // Smooth animation for show/hide
          if (shouldShow && node.style.display === 'none') {
            // Show with fade in
            node.style.display = 'block';
            node.style.opacity = '0';
            node.style.transform = 'scale(0.8)';

            requestAnimationFrame(() => {
              node.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
              node.style.opacity = '1';
              node.style.transform = 'scale(1)';
            });
          } else if (!shouldShow && node.style.display !== 'none') {
            // Hide with fade out
            node.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            node.style.opacity = '0';
            node.style.transform = 'scale(0.8)';

            setTimeout(() => {
              node.style.display = 'none';
            }, 300);
          }
        });

        // Neural connections now update automatically in animation loop based on node visibility
      }

      // Neural connections now handled automatically in main animation loop

      // Update constellation counts in the menu
      updateConstellationCounts() {
        // Count memories by theme
        const themeCounts = {
          family: 0,
          travel: 0,
          recent: 0,
          special: 0
        };

        Object.keys(this.constellationMemories || {}).forEach(theme => {
          themeCounts[theme] = (this.constellationMemories[theme] || []).length;
        });

        // Count people
        const peopleCount = this.constellationPeople ? this.constellationPeople.length : 0;
        const totalMemories = Object.values(themeCounts).reduce((sum, count) => sum + count, 0);

        // Update count displays
        const updateCount = (id, count) => {
          const element = document.getElementById(id);
          if (element) element.textContent = count;
        };

        updateCount('count-memories', totalMemories);
        updateCount('count-people', peopleCount);
        updateCount('count-family', themeCounts.family);
        updateCount('count-travel', themeCounts.travel);
        updateCount('count-recent', themeCounts.recent);
        updateCount('count-special', themeCounts.special);
      }

      // Reset all constellation filters
      resetConstellationFilters() {
        // Reset all filters to true
        this.constellationFilters = {
          memories: true,
          people: true,
          family: true,
          travel: true,
          recent: true,
          special: true
        };

        // Update checkboxes
        const checkboxes = document.querySelectorAll('#constellationPanel input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
          checkbox.checked = true;
        });

        // Apply filters
        this.applyConstellationFilters();
        this.persistConstellationFilters();

      }

      // Hide constellation menu
      hideConstellationMenu() {
        const panel = document.getElementById('constellationPanel');
        if (panel) {
          panel.classList.remove('active');
        }
      }

      // 🔍 CREATE ZOOMABLE CONSTELLATION CONTAINER
      createConstellationContainer() {
        // Remove any existing constellation container
        const existingContainer = document.getElementById('constellation-zoom-container');
        if (existingContainer) {
          existingContainer.remove();
        }

        // Create zoomable container for constellation nodes
        this.constellationContainer = document.createElement('div');
        this.constellationContainer.id = 'constellation-zoom-container';
        this.constellationContainer.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1400;
          transform-origin: 0 0;
          will-change: transform;
        `;
        
        // 🔧 CRITICAL FIX: Container doesn't block events, but child nodes can still be clicked
        // Child nodes will have pointer-events: auto set individually

        // Reset zoom state
        this.zoomState.scale = 1;
        this.zoomState.translateX = 0;
        this.zoomState.translateY = 0;

        // Add to dashboard
        document.body.appendChild(this.constellationContainer);

        if (this.neuralCanvas) {
          this.neuralCanvas.style.transformOrigin = '0 0';
        }

        // Enable zoom/pan interaction on the container
        this.setupConstellationZoom();

        console.log('🔍 ZOOM: Created constellation container with zoom functionality');
      }

      // 🔍 SETUP ZOOM AND PAN FUNCTIONALITY
      setupConstellationZoom() {
        // Enable pointer events for zoom interaction
        document.addEventListener('wheel', (e) => {
          if (this.isConstellationMode) {
            // 🚫 SMART SCROLL: Don't intercept wheel events over dialogs/modals/chat
            const isOverDialog = e.target.closest('.memory-preview-dialog') || 
                                e.target.closest('.person-summary-modal') ||
                                e.target.closest('.voice-wizard-modal') ||
                                e.target.closest('.modal-overlay') ||
                                e.target.closest('.responsive-memory-container') ||
                                
                                // 💬 CHAT WINDOW EXCLUSIONS
                                e.target.closest('.experience-popup') ||
                                e.target.closest('.chat-container') ||
                                e.target.closest('.message-container') ||
                                e.target.closest('.messages-container') ||
                                e.target.closest('.chat-messages') ||
                                e.target.closest('.emma-chat') ||
                                e.target.closest('[class*="chat"]') ||
                                e.target.closest('[class*="message"]') ||
                                e.target.closest('[class*="popup"]') ||

                                // Vault control panel: allow native scroll inside overlay
                                e.target.closest('.vault-control-overlay') ||
                                e.target.closest('.vault-control-dialog') ||
                                e.target.closest('.vault-control');
            
            if (!isOverDialog) {
              // Only zoom constellation when NOT scrolling in a dialog
              e.preventDefault();
              this.handleConstellationZoom(e);
            }
            // If over dialog, allow natural scrolling behavior
          }
        }, { passive: false });

        // 🎯 IMPROVED MOUSE DRAG PANNING - More responsive for Debbe
        let isDragging = false;
        let dragStart = { x: 0, y: 0 };
        let dragStartZoom = { ...this.zoomState };

        document.addEventListener('mousedown', (e) => {
          // Allow dragging when clicking empty constellation space
          if (!this.isConstellationMode || e.button !== 0) return;

          const target = e.target;
          const interactiveSelectors = [
            '.memory-node',
            '.person-node',
            '.create-memory-node',
            '.constellation-controls',
            '.constellation-menu-panel',
            '.constellation-burger-btn',
            '.memory-dialog',
            '.memory-dialog-overlay',
            '.person-summary-modal',
            '.voice-wizard-modal',
            '.modal-overlay',
            '.experience-popup',
            '.chat-container',
            '.chat-messages',
            '.radial-menu'
          ];

          const isInteractiveTarget = interactiveSelectors.some(selector => target.closest(selector));
          if (isInteractiveTarget) return;

          const isConstellationSurface =
            target.id === 'constellation' ||
            target.classList?.contains('constellation-canvas') ||
            target.closest('#constellation-zoom-container') ||
            target === document.body ||
            target.classList?.contains('dashboard');

          if (!isConstellationSurface) return;

          isDragging = true;
          dragStart = { x: e.clientX, y: e.clientY };
          dragStartZoom = { ...this.zoomState };
          document.body.style.cursor = 'grabbing';
          e.preventDefault(); // Only prevent when starting drag on empty space
        });



        document.addEventListener('mousemove', (e) => {
          if (isDragging && this.isConstellationMode) {
            const deltaX = e.clientX - dragStart.x;
            const deltaY = e.clientY - dragStart.y;
            
            this.zoomState.translateX = dragStartZoom.translateX + deltaX;
            this.zoomState.translateY = dragStartZoom.translateY + deltaY;
            
            this.updateConstellationTransform();
          }
        });

        document.addEventListener('mouseup', () => {
          if (isDragging) {
            isDragging = false;
            document.body.style.cursor = '';
          }
        });

        // 📱 TOUCH GESTURES for tablets/phones
        let startTouches = [];
        let startZoomState = { ...this.zoomState };

        document.addEventListener('touchstart', (e) => {
          if (!this.isConstellationMode) return;
          const touchTarget = e.target;
          if (this.isInteractiveConstellationTarget(touchTarget)) {
            this.touchPanDisabled = true;
            startTouches = [];
            return;
          }
          this.touchPanDisabled = false;
          startTouches = Array.from(e.touches);
          startZoomState = { ...this.zoomState };
        });

        document.addEventListener('touchmove', (e) => {
          if (this.isConstellationMode && startTouches.length > 0 && !this.touchPanDisabled) {
            e.preventDefault();
            this.handleConstellationTouchMove(e, startTouches, startZoomState);
          }
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
          startTouches = [];
          if (e.touches.length === 0) {
            this.touchPanDisabled = false;
          }
        });

        // Keyboard navigation for accessibility
        document.addEventListener('keydown', (e) => {
          if (this.isConstellationMode) {
            this.handleConstellationKeyboard(e);
          }
        });
      }

      // Enable node-level dragging
      isInteractiveConstellationTarget(target) {
        if (!target) return false;
        const interactiveSelectors = [
          '.memory-node',
          '.person-node',
          '.create-memory-node',
          '.constellation-controls',
          '.constellation-menu-panel',
          '.constellation-burger-btn',
          '.memory-dialog',
          '.memory-dialog-overlay',
          '.person-summary-modal',
          '.voice-wizard-modal',
          '.modal-overlay',
          '.experience-popup',
          '.chat-container',
          '.chat-messages',
          '.radial-menu'
        ];
        return interactiveSelectors.some(selector => target.closest(selector));
      }

      // Enable node-level dragging for pointer events
      enableNodeDragging(node) {
        if (!node || !node.element) return;
        if (node.orbBound) return; // Skip radial menu nodes
        const element = node.element;
        if (element.dataset.dragHandlerAttached === 'true') return;

        element.dataset.dragHandlerAttached = 'true';
        element.setAttribute('draggable', 'false');
        element.style.touchAction = 'none';
        element.style.userSelect = 'none';
        element.style.webkitUserSelect = 'none';
        element.addEventListener('dragstart', (event) => {
          event.preventDefault();
        });
        element.onselectstart = () => false;
        element.addEventListener('pointerdown', () => {
          if (document.activeElement && document.activeElement.blur) {
            try { document.activeElement.blur(); } catch {}
          }
        }, { passive: true });
        element.addEventListener('pointerdown', (event) => this.handleNodePointerDown(event, node));
      }

      handleNodePointerDown(event, node) {
        if (!this.isConstellationMode) return;
        if (!node || !node.element) return;

        const pointerType = event.pointerType || 'mouse';
        this.nodeDragLastPointerType = pointerType;

        if (pointerType === 'mouse' && event.button !== 0) return;
        if (this.activeNodeDrag || this.pendingNodeDrag) return;

        if (this.nodeDragHoldTimeout) {
          clearTimeout(this.nodeDragHoldTimeout);
          this.nodeDragHoldTimeout = null;
        }
        this.nodeDragHoldActive = false;
        this.nodeDragLatestEvent = event;

        this.pendingNodeDrag = node;
        this.nodeDragPointerId = event.pointerId ?? 'mouse';
        this.nodeDragStart = { x: event.clientX, y: event.clientY };
        node.justDragged = false;
        node.isDragging = false;

        if (node.element.setPointerCapture && event.pointerId !== undefined) {
          try {
            node.element.setPointerCapture(event.pointerId);
          } catch (error) {
            console.warn('[Constellation] Unable to capture pointer for node drag', error);
          }
        }

        document.addEventListener('pointermove', this.boundNodePointerMove);
        document.addEventListener('pointerup', this.boundNodePointerUp);
        document.addEventListener('pointercancel', this.boundNodePointerUp);

        if (pointerType === 'touch') {
          this.touchPanDisabled = true;
          this.nodeDragHoldTimeout = setTimeout(() => {
            if (!this.isConstellationMode) return;
            if (this.pendingNodeDrag !== node || this.activeNodeDrag) return;
            this.nodeDragHoldActive = true;
            const latestEvent = this.nodeDragLatestEvent || event;
            this.beginNodeDrag(node, latestEvent);
          }, this.touchHoldDelay);
          return;
        }
      }

      handleNodePointerMove(event) {
        if (this.nodeDragPointerId !== null && event.pointerId !== undefined && event.pointerId !== this.nodeDragPointerId) {
          return;
        }

        const pointerType = event.pointerType || this.nodeDragLastPointerType || 'mouse';
        this.nodeDragLatestEvent = event;

        const candidate = this.activeNodeDrag || this.pendingNodeDrag;
        if (!candidate || !candidate.element) return;

        if (pointerType === 'touch') {
          if (!this.activeNodeDrag) {
            return;
          }
          event.preventDefault();
          this.updateNodeDragPosition(event);
          return;
        }

        const deltaX = event.clientX - this.nodeDragStart.x;
        const deltaY = event.clientY - this.nodeDragStart.y;

        if (!this.activeNodeDrag) {
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          if (distance < this.nodeDragThreshold) {
            return;
          }
          this.beginNodeDrag(candidate, event);
        }

        if (!this.activeNodeDrag) return;

        event.preventDefault();
        this.updateNodeDragPosition(event);
      }

      handleNodePointerUp(event) {
        if (this.nodeDragPointerId !== null && event.pointerId !== undefined && event.pointerId !== this.nodeDragPointerId) {
          return;
        }

        const pointerType = event.pointerType || this.nodeDragLastPointerType || 'mouse';

        if (this.nodeDragHoldTimeout) {
          clearTimeout(this.nodeDragHoldTimeout);
          this.nodeDragHoldTimeout = null;
        }
        this.nodeDragHoldActive = false;
        this.nodeDragLatestEvent = null;

        const node = this.activeNodeDrag || this.pendingNodeDrag;

        if (node && node.element && node.element.releasePointerCapture && this.nodeDragPointerId !== null && this.nodeDragPointerId !== 'mouse') {
          try {
            node.element.releasePointerCapture(this.nodeDragPointerId);
          } catch (error) {
            console.warn('[Constellation] Unable to release pointer capture', error);
          }
        }

        if (this.activeNodeDrag) {
          this.endNodeDrag();
        }

        this.pendingNodeDrag = null;
        this.nodeDragPointerId = null;
        this.nodeDragTransformData = null;
        this.nodeDragLastPointerType = null;

        if (pointerType === 'touch') {
          this.touchPanDisabled = false;
        }

        document.removeEventListener('pointermove', this.boundNodePointerMove);
        document.removeEventListener('pointerup', this.boundNodePointerUp);
        document.removeEventListener('pointercancel', this.boundNodePointerUp);
      }

      beginNodeDrag(node, event) {
        if (!node || !node.element) return;

        if (this.nodeDragHoldTimeout) {
          clearTimeout(this.nodeDragHoldTimeout);
          this.nodeDragHoldTimeout = null;
        }
        if (this.nodeDragLastPointerType === 'touch') {
          this.nodeDragHoldActive = true;
          this.touchPanDisabled = true;
        }
        this.nodeDragLatestEvent = event;

        this.activeNodeDrag = node;
        this.pendingNodeDrag = null;
        node.isDragging = true;
        node.vx = 0;
        node.vy = 0;
        node.element.dataset.preventClick = 'true';
        node.originalTransition = node.originalTransition ?? node.element.style.transition;
        node.element.style.transition = 'none';
        node.element.classList.add('dragging');

        document.body.style.cursor = 'grabbing';
        node.element.style.cursor = 'grabbing';

        this.nodeDragTransformData = this.computeNodeDragTransformData();
        const stagePoint = this.clientToStageCoordinates(event.clientX, event.clientY);
        this.nodeDragOffset = {
          x: stagePoint.x - node.x,
          y: stagePoint.y - node.y
        };

        this.updateNodeDragPosition(event);
      }

      updateNodeDragPosition(event) {
        if (!this.activeNodeDrag) return;
        const node = this.activeNodeDrag;
        const element = node.element;
        if (!element) return;

        const stagePoint = this.clientToStageCoordinates(event.clientX, event.clientY);
        node.x = stagePoint.x - this.nodeDragOffset.x;
        node.y = stagePoint.y - this.nodeDragOffset.y;
        node.baseX = node.x;
        node.baseY = node.y;
        node.vx = 0;
        node.vy = 0;

        const halfWidth = (element.offsetWidth || 0) / 2;
        const halfHeight = (element.offsetHeight || 0) / 2;

        element.style.left = `${node.x - halfWidth}px`;
        element.style.top = `${node.y - halfHeight}px`;
      }

      endNodeDrag() {
        if (!this.activeNodeDrag) return;
        const node = this.activeNodeDrag;
        const element = node.element;

        node.isDragging = false;
        node.baseX = node.x;
        node.baseY = node.y;
        node.vx = 0;
        node.vy = 0;
        node.justDragged = true;

        if (element) {
          if (node.originalTransition !== undefined) {
            element.style.transition = node.originalTransition;
          }
          element.style.cursor = '';
          element.classList.remove('dragging');
          setTimeout(() => {
            element.dataset.preventClick = 'false';
            node.justDragged = false;
          }, 100);
        }

        document.body.style.cursor = '';
        this.activeNodeDrag = null;

        this.scheduleConstellationLayoutPersist();
      }

      computeNodeDragTransformData() {
        const container = this.constellationContainer;
        if (!container) return null;

        const rect = container.getBoundingClientRect();
        const transform = window.getComputedStyle(container).transform;
        const MatrixClass = window.DOMMatrixReadOnly || window.DOMMatrix;

        if (!MatrixClass) {
          return {
            rect,
            inverseMatrix: {
              transformPoint: (point) => ({ x: point.x, y: point.y })
            }
          };
        }

        if (!transform || transform === 'none') {
          return {
            rect,
            inverseMatrix: new MatrixClass()
          };
        }

        try {
          const matrix = new MatrixClass(transform);
          const inverseMatrix = typeof matrix.inverse === 'function' ? matrix.inverse() : matrix;
          return {
            rect,
            inverseMatrix
          };
        } catch (error) {
          console.warn('[Constellation] Failed to compute transform matrix; using identity', error);
          return {
            rect,
            inverseMatrix: new MatrixClass()
          };
        }
      }

      clientToStageCoordinates(clientX, clientY) {
        const container = this.constellationContainer;
        if (!container) {
          return { x: clientX, y: clientY };
        }

        const data = this.nodeDragTransformData || this.computeNodeDragTransformData();
        if (!data) {
          return { x: clientX, y: clientY };
        }

        const { rect, inverseMatrix } = data;
        const localX = clientX - rect.left;
        const localY = clientY - rect.top;
        const pointInit = typeof DOMPoint === 'function'
          ? new DOMPoint(localX, localY)
          : { x: localX, y: localY, z: 0, w: 1 };

        const transformed = (inverseMatrix && typeof inverseMatrix.transformPoint === 'function')
          ? inverseMatrix.transformPoint(pointInit)
          : pointInit;

        return { x: transformed.x, y: transformed.y };
      }

      scheduleConstellationLayoutPersist() {
        if (!this.isConstellationMode) return;
        if (this.persistLayoutDebounce) {
          clearTimeout(this.persistLayoutDebounce);
        }
        this.persistLayoutDebounce = setTimeout(() => {
          this.persistLayoutDebounce = null;
          this.persistConstellationLayout();
        }, 150);
      }

      loadSavedConstellationLayout() {
        if (typeof window === 'undefined' || !window.localStorage) {
          return null;
        }
        try {
          const raw = window.localStorage.getItem(this.constellationLayoutKey);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          if (!parsed || typeof parsed !== 'object' || typeof parsed.nodes !== 'object') {
            return null;
          }
          return parsed;
        } catch (error) {
          console.warn('🌌 CONSTELLATION: Failed to parse saved layout', error);
          return null;
        }
      }

      applySavedConstellationLayout() {
        const saved = this.loadSavedConstellationLayout();
        if (!saved || !saved.nodes || !Array.isArray(this.nodes) || this.nodes.length === 0) {
          return;
        }

        const width = Math.max(window.innerWidth || document.documentElement?.clientWidth || 0, 1);
        const height = Math.max(window.innerHeight || document.documentElement?.clientHeight || 0, 1);
        const nodeMap = new Map();

        this.nodes.forEach(node => {
          if (node && node.uid) {
            nodeMap.set(node.uid, node);
          }
        });

        Object.entries(saved.nodes).forEach(([uid, position]) => {
          const node = nodeMap.get(uid);
          if (!node || !node.element) return;

          const leftRatio = typeof position.leftRatio === 'number' ? position.leftRatio : null;
          const topRatio = typeof position.topRatio === 'number' ? position.topRatio : null;
          if (leftRatio === null || topRatio === null) return;

          const left = leftRatio * width;
          const top = topRatio * height;

          node.x = left;
          node.y = top;
          node.baseX = left;
          node.baseY = top;
          node.vx = 0;
          node.vy = 0;

          node.element.style.left = `${left}px`;
          node.element.style.top = `${top}px`;
        });

        const savedViewport = saved.viewport || {};
        const savedWidth = Number.isFinite(savedViewport.width) && savedViewport.width > 0 ? savedViewport.width : width;
        const savedHeight = Number.isFinite(savedViewport.height) && savedViewport.height > 0 ? savedViewport.height : height;
        const widthRatio = savedWidth ? width / savedWidth : 1;
        const heightRatio = savedHeight ? height / savedHeight : 1;

        let appliedZoom = false;
        if (saved.zoom) {
          const { scale, translateX, translateY } = saved.zoom;
          if (Number.isFinite(scale) && Number.isFinite(translateX) && Number.isFinite(translateY)) {
            const clampedScale = Math.max(this.zoomState.minScale, Math.min(this.zoomState.maxScale, scale));
            this.zoomState.scale = clampedScale;
            this.zoomState.translateX = translateX * widthRatio;
            this.zoomState.translateY = translateY * heightRatio;
            appliedZoom = true;
          }
        }

        if (appliedZoom) {
          this.updateConstellationTransform();
        }
      }

      persistConstellationLayout() {
        if (typeof window === 'undefined' || !window.localStorage) {
          return;
        }
        if (!Array.isArray(this.nodes) || this.nodes.length === 0) {
          return;
        }

        const width = Math.max(window.innerWidth || document.documentElement?.clientWidth || 0, 1);
        const height = Math.max(window.innerHeight || document.documentElement?.clientHeight || 0, 1);
        const nodesPayload = {};

        this.nodes.forEach(node => {
          if (!node || node.orbBound || !node.uid || !node.element) {
            return;
          }

          let left = typeof node.x === 'number' ? node.x : NaN;
          let top = typeof node.y === 'number' ? node.y : NaN;

          if (!Number.isFinite(left) || !Number.isFinite(top)) {
            const styleLeft = parseFloat(node.element.style.left);
            const styleTop = parseFloat(node.element.style.top);
            if (!Number.isFinite(left) && Number.isFinite(styleLeft)) {
              left = styleLeft;
            }
            if (!Number.isFinite(top) && Number.isFinite(styleTop)) {
              top = styleTop;
            }
          }

          if (!Number.isFinite(left) || !Number.isFinite(top)) {
            const rect = node.element.getBoundingClientRect();
            if (!Number.isFinite(left)) {
              left = rect.left;
            }
            if (!Number.isFinite(top)) {
              top = rect.top;
            }
          }

          if (Number.isFinite(left) && Number.isFinite(top)) {
            nodesPayload[node.uid] = {
              leftRatio: left / width,
              topRatio: top / height
            };
          }
        });

        try {
          const zoomData = {
            scale: Number.isFinite(this.zoomState?.scale) ? this.zoomState.scale : 1,
            translateX: Number.isFinite(this.zoomState?.translateX) ? this.zoomState.translateX : 0,
            translateY: Number.isFinite(this.zoomState?.translateY) ? this.zoomState.translateY : 0
          };

          window.localStorage.setItem(this.constellationLayoutKey, JSON.stringify({
            nodes: nodesPayload,
            viewport: { width, height },
            zoom: zoomData,
            savedAt: Date.now()
          }));
        } catch (error) {
          console.warn('🌌 CONSTELLATION: Failed to persist layout', error);
        }
      }

      loadSavedConstellationFilters() {
        if (typeof window === 'undefined' || !window.localStorage) {
          return null;
        }
        try {
          const raw = window.localStorage.getItem(this.constellationFiltersKey);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          if (!parsed || typeof parsed !== 'object') return null;

          const allowedKeys = ['memories', 'people', 'family', 'travel', 'recent', 'special'];
          const sanitized = {};

          allowedKeys.forEach(key => {
            if (typeof parsed[key] === 'boolean') {
              sanitized[key] = parsed[key];
            }
          });

          return Object.keys(sanitized).length > 0 ? sanitized : null;
        } catch (error) {
          console.warn('🌌 CONSTELLATION: Failed to parse saved filters', error);
          return null;
        }
      }

      persistConstellationFilters() {
        if (typeof window === 'undefined' || !window.localStorage) {
          return;
        }
        if (!this.constellationFilters) {
          return;
        }
        try {
          window.localStorage.setItem(this.constellationFiltersKey, JSON.stringify(this.constellationFilters));
        } catch (error) {
          console.warn('🌌 CONSTELLATION: Failed to persist filters', error);
        }
      }

      // 📱 HANDLE TOUCH GESTURES (PINCH TO ZOOM + PAN)
      handleConstellationTouchMove(e, startTouches, startZoomState) {
        const currentTouches = Array.from(e.touches);

        if (currentTouches.length === 2 && startTouches.length === 2) {
          // Pinch to zoom
          const startDistance = Math.hypot(
            startTouches[0].clientX - startTouches[1].clientX,
            startTouches[0].clientY - startTouches[1].clientY
          );
          const currentDistance = Math.hypot(
            currentTouches[0].clientX - currentTouches[1].clientX,
            currentTouches[0].clientY - currentTouches[1].clientY
          );

          const scaleChange = currentDistance / startDistance;
          const newScale = Math.max(this.zoomState.minScale,
                           Math.min(this.zoomState.maxScale,
                           startZoomState.scale * scaleChange));

          // Zoom towards pinch center
          const centerX = (currentTouches[0].clientX + currentTouches[1].clientX) / 2;
          const centerY = (currentTouches[0].clientY + currentTouches[1].clientY) / 2;
          
          const scaleRatio = newScale / this.zoomState.scale;
          this.zoomState.translateX = centerX - (centerX - this.zoomState.translateX) * scaleRatio;
          this.zoomState.translateY = centerY - (centerY - this.zoomState.translateY) * scaleRatio;
          this.zoomState.scale = newScale;
          
          this.updateConstellationTransform();
        } else if (currentTouches.length === 1 && startTouches.length === 1) {
          // Single finger pan
          const deltaX = currentTouches[0].clientX - startTouches[0].clientX;
          const deltaY = currentTouches[0].clientY - startTouches[0].clientY;

          this.zoomState.translateX = startZoomState.translateX + deltaX;
          this.zoomState.translateY = startZoomState.translateY + deltaY;
          this.updateConstellationTransform();
        }
      }

      // ⌨️ KEYBOARD NAVIGATION for constellation
      handleConstellationKeyboard(e) {
        const panStep = 50; // Pixels to pan per key press
        const zoomStep = 0.05; // 🎯 GENTLE: 5% per key press instead of 10%

        switch(e.key) {
          case 'ArrowUp':
            e.preventDefault();
            this.zoomState.translateY += panStep;
            this.updateConstellationTransform();
            break;
          case 'ArrowDown':
            e.preventDefault();
            this.zoomState.translateY -= panStep;
            this.updateConstellationTransform();
            break;
          case 'ArrowLeft':
            e.preventDefault();
            this.zoomState.translateX += panStep;
            this.updateConstellationTransform();
            break;
          case 'ArrowRight':
            e.preventDefault();
            this.zoomState.translateX -= panStep;
            this.updateConstellationTransform();
            break;
          case '+':
          case '=':
            e.preventDefault();
            this.zoomState.scale = Math.min(this.zoomState.maxScale, this.zoomState.scale * (1 + zoomStep));
            this.updateConstellationTransform();
            break;
          case '-':
            e.preventDefault();
            this.zoomState.scale = Math.max(this.zoomState.minScale, this.zoomState.scale * (1 - zoomStep));
            this.updateConstellationTransform();
            break;
          case '0':
            e.preventDefault();
            this.fitAllMemories();
            break;
        }
      }

      // 🔍 HANDLE MOUSE WHEEL ZOOM
      handleConstellationZoom(e) {
        // 🎯 GENTLE ZOOM: Much less aggressive (3% per scroll instead of 10%)
        const zoomFactor = e.deltaY > 0 ? 0.97 : 1.03;
        const newScale = Math.max(this.zoomState.minScale, 
                         Math.min(this.zoomState.maxScale, 
                         this.zoomState.scale * zoomFactor));

        // Zoom towards mouse position
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Calculate offset to zoom towards mouse
        const scaleRatio = newScale / this.zoomState.scale;
        this.zoomState.translateX = mouseX - (mouseX - this.zoomState.translateX) * scaleRatio;
        this.zoomState.translateY = mouseY - (mouseY - this.zoomState.translateY) * scaleRatio;
        this.zoomState.scale = newScale;

        this.updateConstellationTransform();
      }

      // 🔍 UPDATE CONSTELLATION TRANSFORM
      updateConstellationTransform() {
        const scale = Number.isFinite(this.zoomState.scale) ? this.zoomState.scale : 1;
        const translateX = Number.isFinite(this.zoomState.translateX) ? this.zoomState.translateX : 0;
        const translateY = Number.isFinite(this.zoomState.translateY) ? this.zoomState.translateY : 0;
        const transform = `matrix(${scale}, 0, 0, ${scale}, ${translateX}, ${translateY})`;
        
        // Apply transform to constellation container (memory nodes)
        if (this.constellationContainer) {
          this.constellationContainer.style.transformOrigin = '0 0';
          this.constellationContainer.style.transform = transform;
        }
        
        // 💥 CRITICAL FIX: Apply same transform to neural canvas (connections)
        // This ensures connections stay anchored to nodes when zooming/panning
        if (this.neuralCanvas) {
          this.neuralCanvas.style.transform = transform;
          this.neuralCanvas.style.transformOrigin = '0 0';
        }
        
        if (this.isConstellationMode) {
          this.scheduleConstellationLayoutPersist();
        }

        console.log('🔗 TRANSFORM: Applied zoom/pan to both nodes and connections');
      }

      // 🔍 ADD ELEGANT EMMA-BRANDED ZOOM CONTROLS
      addConstellationZoomControls() {
        // Remove any existing zoom controls
        const existingControls = document.getElementById('constellation-zoom-controls');
        if (existingControls) {
          existingControls.remove();
        }

        // Create Emma-branded zoom controls container
        const zoomControls = document.createElement('div');
        zoomControls.id = 'constellation-zoom-controls';
        zoomControls.style.cssText = `
          position: fixed;
          bottom: 40px;
          right: 40px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          z-index: 9999;
          opacity: 1;
          transition: all 0.3s ease;
        `;

        // Emma-branded button base style
        const buttonBaseStyle = `
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: linear-gradient(135deg, 
            rgba(111, 99, 217, 0.9) 0%, 
            rgba(124, 58, 237, 0.8) 50%,
            rgba(109, 40, 217, 0.9) 100%
          );
          backdrop-filter: blur(20px) saturate(150%);
          color: white;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 
            0 6px 22px rgba(111, 99, 217, 0.28),
            0 0 0 1px rgba(255, 255, 255, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-weight: 500;
          position: relative;
          overflow: hidden;
        `;

        // Zoom in button
        const zoomInBtn = document.createElement('button');
        zoomInBtn.innerHTML = '+';
        zoomInBtn.title = 'Zoom In to Explore';
        zoomInBtn.style.cssText = buttonBaseStyle;
        
        zoomInBtn.addEventListener('click', () => {
          const centerX = window.innerWidth / 2;
          const centerY = window.innerHeight / 2;
          // 🎯 GENTLE: 15% per button click instead of 30%
          const newScale = Math.min(this.zoomState.maxScale, this.zoomState.scale * 1.15);
          
          // Zoom towards center for smooth experience
          const scaleRatio = newScale / this.zoomState.scale;
          this.zoomState.translateX = centerX - (centerX - this.zoomState.translateX) * scaleRatio;
          this.zoomState.translateY = centerY - (centerY - this.zoomState.translateY) * scaleRatio;
          this.zoomState.scale = newScale;
          
          this.updateConstellationTransform();
        });

        // Zoom out button
        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.innerHTML = '−';
        zoomOutBtn.title = 'Zoom Out to See More';
        zoomOutBtn.style.cssText = buttonBaseStyle;
        
        zoomOutBtn.addEventListener('click', () => {
          const centerX = window.innerWidth / 2;
          const centerY = window.innerHeight / 2;
          // 🎯 GENTLE: 15% per button click instead of 30%
          const newScale = Math.max(this.zoomState.minScale, this.zoomState.scale / 1.15);
          
          // Zoom from center for smooth experience
          const scaleRatio = newScale / this.zoomState.scale;
          this.zoomState.translateX = centerX - (centerX - this.zoomState.translateX) * scaleRatio;
          this.zoomState.translateY = centerY - (centerY - this.zoomState.translateY) * scaleRatio;
          this.zoomState.scale = newScale;
          
          this.updateConstellationTransform();
        });

        // Fit all button - special Emma green
        const resetBtn = document.createElement('button');
        resetBtn.innerHTML = '⌂';
        resetBtn.title = 'Show All Memories';
        resetBtn.style.cssText = buttonBaseStyle.replace(
          'rgba(111, 99, 217, 0.9) 0%, rgba(124, 58, 237, 0.8) 50%, rgba(109, 40, 217, 0.9) 100%',
          'rgba(16, 185, 129, 0.9) 0%, rgba(5, 150, 105, 0.8) 50%, rgba(4, 120, 87, 0.9) 100%'
        ).replace(
          'rgba(111, 99, 217, 0.28)',
          'rgba(16, 185, 129, 0.28)'
        );
        
        resetBtn.addEventListener('click', () => {
          this.fitAllMemories();
        });

        // Add elegant hover effects
        [zoomInBtn, zoomOutBtn, resetBtn].forEach(btn => {
          btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.05) translateY(-2px)';
            btn.style.boxShadow = `
              0 10px 28px rgba(111, 99, 217, 0.32),
              0 0 0 1px rgba(255, 255, 255, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.2)
            `;
          });
          
          btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1) translateY(0)';
            btn.style.boxShadow = `
              0 6px 22px rgba(111, 99, 217, 0.28),
              0 0 0 1px rgba(255, 255, 255, 0.05),
              inset 0 1px 0 rgba(255, 255, 255, 0.1)
            `;
          });

          // Add subtle click effect
          btn.addEventListener('mousedown', () => {
            btn.style.transform = 'scale(0.95)';
          });
          
          btn.addEventListener('mouseup', () => {
            btn.style.transform = 'scale(1.05) translateY(-2px)';
          });
        });

        zoomControls.appendChild(zoomInBtn);
        zoomControls.appendChild(zoomOutBtn);
        zoomControls.appendChild(resetBtn);
        document.body.appendChild(zoomControls);

        // 🧭 ADD NAVIGATION ARROWS for easy panning
        this.addConstellationPanControls();

        console.log('🎨 ZOOM: Added elegant Emma-branded zoom controls');
      }

      // 🧭 ADD DEMENTIA-FRIENDLY PAN CONTROLS
      addConstellationPanControls() {
        // Remove any existing pan controls
        const existingPanControls = document.getElementById('constellation-pan-controls');
        if (existingPanControls) {
          existingPanControls.remove();
        }

        // Create navigation controls container
        const panControls = document.createElement('div');
        panControls.id = 'constellation-pan-controls';
        panControls.style.cssText = `
          position: fixed;
          bottom: 40px;
          left: 40px;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          grid-template-rows: 1fr 1fr 1fr;
          gap: 8px;
          z-index: 9999;
          opacity: 1;
          transition: all 0.3s ease;
          width: 144px;
          height: 144px;
        `;

        // Emma-branded button style for arrows
        const arrowButtonStyle = `
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: linear-gradient(135deg, 
            rgba(111, 99, 217, 0.85) 0%, 
            rgba(124, 58, 237, 0.75) 50%,
            rgba(109, 40, 217, 0.85) 100%
          );
          backdrop-filter: blur(20px) saturate(150%);
          color: white;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 
            0 6px 24px rgba(111, 99, 217, 0.25),
            0 0 0 1px rgba(255, 255, 255, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-weight: 600;
        `;

        const panStep = 100; // Distance to pan in pixels

        // Create directional buttons in a 3x3 grid pattern
        const directions = [
          { pos: [0, 1], arrow: '↑', title: 'Pan Up', dx: 0, dy: panStep },
          { pos: [1, 0], arrow: '←', title: 'Pan Left', dx: panStep, dy: 0 },
          { pos: [1, 1], arrow: '⊕', title: 'Center View', dx: 0, dy: 0, special: 'center' },
          { pos: [1, 2], arrow: '→', title: 'Pan Right', dx: -panStep, dy: 0 },
          { pos: [2, 1], arrow: '↓', title: 'Pan Down', dx: 0, dy: -panStep }
        ];

        directions.forEach(({ pos, arrow, title, dx, dy, special }) => {
          const button = document.createElement('button');
          button.innerHTML = arrow;
          button.title = title;
          button.style.cssText = arrowButtonStyle;
          button.style.gridColumn = pos[1] + 1;
          button.style.gridRow = pos[0] + 1;

          // Special styling for center button
          if (special === 'center') {
            button.style.background = `linear-gradient(135deg, 
              rgba(16, 185, 129, 0.85) 0%, 
              rgba(5, 150, 105, 0.75) 50%,
              rgba(4, 120, 87, 0.85) 100%
            )`;
            button.style.boxShadow = `
              0 6px 24px rgba(16, 185, 129, 0.25),
              0 0 0 1px rgba(255, 255, 255, 0.05),
              inset 0 1px 0 rgba(255, 255, 255, 0.1)
            `;
          }

          button.addEventListener('click', () => {
            if (special === 'center') {
              // Center the view (reset translation)
              this.zoomState.translateX = 0;
              this.zoomState.translateY = 0;
            } else {
              // Pan in the specified direction
              this.zoomState.translateX += dx;
              this.zoomState.translateY += dy;
            }
            this.updateConstellationTransform();
          });

          // Add hover effects
          button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.05)';
            if (special === 'center') {
              button.style.boxShadow = `
                0 8px 32px rgba(16, 185, 129, 0.4),
                0 0 0 1px rgba(255, 255, 255, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.2)
              `;
            } else {
              button.style.boxShadow = `
                0 8px 32px rgba(111, 99, 217, 0.4),
                0 0 0 1px rgba(255, 255, 255, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.2)
              `;
            }
          });

          button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            if (special === 'center') {
              button.style.boxShadow = `
                0 6px 24px rgba(16, 185, 129, 0.25),
                0 0 0 1px rgba(255, 255, 255, 0.05),
                inset 0 1px 0 rgba(255, 255, 255, 0.1)
              `;
            } else {
              button.style.boxShadow = `
                0 6px 24px rgba(111, 99, 217, 0.25),
                0 0 0 1px rgba(255, 255, 255, 0.05),
                inset 0 1px 0 rgba(255, 255, 255, 0.1)
              `;
            }
          });

          // Add click effect
          button.addEventListener('mousedown', () => {
            button.style.transform = 'scale(0.95)';
          });

          button.addEventListener('mouseup', () => {
            button.style.transform = 'scale(1.05)';
          });

          panControls.appendChild(button);
        });

        document.body.appendChild(panControls);

        console.log('🧭 PAN: Added dementia-friendly navigation controls');
      }

      // 🔍 FIT ALL MEMORIES IN VIEW
      fitAllMemories() {
        if (!this.nodes || this.nodes.length === 0) {
          // Reset to center if no nodes
          this.zoomState.scale = 1;
          this.zoomState.translateX = 0;
          this.zoomState.translateY = 0;
          this.updateConstellationTransform();
          return;
        }

        // Find bounding box of all nodes
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        this.nodes.forEach(node => {
          if (node.x !== undefined && node.y !== undefined) {
            minX = Math.min(minX, node.x - 50); // Add padding
            minY = Math.min(minY, node.y - 50);
            maxX = Math.max(maxX, node.x + 50);
            maxY = Math.max(maxY, node.y + 50);
          }
        });

        if (minX === Infinity) {
          // No valid positions, just center
          this.zoomState.scale = 1;
          this.zoomState.translateX = 0;
          this.zoomState.translateY = 0;
          this.updateConstellationTransform();
          return;
        }

        // Calculate optimal scale and position
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const scaleX = (viewportWidth * 0.8) / contentWidth;
        const scaleY = (viewportHeight * 0.8) / contentHeight;
        const optimalScale = Math.min(scaleX, scaleY, this.zoomState.maxScale);
        const finalScale = Math.max(optimalScale, this.zoomState.minScale);

        // Center the content
        const contentCenterX = (minX + maxX) / 2;
        const contentCenterY = (minY + maxY) / 2;
        
        this.zoomState.scale = finalScale;
        this.zoomState.translateX = viewportWidth / 2 - contentCenterX * finalScale;
        this.zoomState.translateY = viewportHeight / 2 - contentCenterY * finalScale;

        this.updateConstellationTransform();
        
        console.log('🏠 ZOOM: Fitted all memories in view for Debbe');
      }

      // Removed fadeOutMemoryNodes and fadeInMemoryNodes - no longer needed since constellation mode exits to main dashboard

      // Completely clear all memory nodes from DOM (prevents duplicates)
      clearAllMemoryNodesFromDOM() {

        // Remove all memory-node, person-node, and create-memory-node elements (including orphaned ones)
        const existingMemoryNodes = document.querySelectorAll('.memory-node, .create-memory-node, .person-node');
        existingMemoryNodes.forEach(node => {

          node.remove();
        });

        // Clear ONLY memory nodes from the nodes array (preserve radial menu items)
        if (this.nodes) {
          this.nodes.forEach(node => {
            if (node.element && node.element.parentNode) {
              // Only remove if it's a constellation node, NOT a radial menu item
              if (node.element.classList.contains('memory-node') ||
                  node.element.classList.contains('create-memory-node') ||
                  node.element.classList.contains('person-node')) {

                node.element.remove();
              } else {

              }
            }
          });
          // Filter out only the constellation nodes, keep radial items
          this.nodes = this.nodes.filter(node =>
            !node.element.classList.contains('memory-node') &&
            !node.element.classList.contains('create-memory-node') &&
            !node.element.classList.contains('person-node')
          );
        }

        // Reset central node
        this.centralNode = null;
        this.createMemoryElement = null;

      }

      // Exit constellation mode
      exitMemoryConstellation() {
        document.body.classList.add('dashboard-minimal');
        console.log('🌌 exitMemoryConstellation called - Current state:', {
          isConstellationMode: this.isConstellationMode,
          isMenuOpen: this.isMenuOpen,
          orbExists: !!this.orb,
          radialMenuExists: !!this.radialMenu
        });

        this.isConstellationMode = false;

        // PERSISTENCE: Clear constellation state
        localStorage.removeItem('emmaConstellationActive');

        // Stop neural animation (EXACT same as main menu)
        this.isMenuOpen = false;
        if (this.neuralAnimationId) {
          cancelAnimationFrame(this.neuralAnimationId);
          this.neuralCtx.clearRect(0, 0, this.neuralCanvas.width, this.neuralCanvas.height);
        }

        // 🔍 RESET ZOOM STATE: Reset neural canvas transform and clean up
        if (this.neuralCanvas) {
          this.neuralCanvas.style.transform = '';
          this.neuralCanvas.style.transformOrigin = '';
        }
        
        // Remove constellation container  
        const constellationContainer = document.getElementById('constellation-zoom-container');
        if (constellationContainer) {
          constellationContainer.remove();
        }
        
        // Reset zoom state
        this.zoomState.scale = 1;
        this.zoomState.translateX = 0;
        this.zoomState.translateY = 0;
        this.constellationContainer = null;

        // Remove constellation-active class to restore UI
        document.body.classList.remove('constellation-active');
        document.body.classList.remove('menu-active');
        this.radialMenu.classList.remove('active');

        // Restore central orb size
        this.restoreCentralOrb();

        // Remove constellation UI
        if (this.constellationUI) {
          this.constellationUI.remove();
          this.constellationUI = null;
        }

        // CRITICAL: Use thorough DOM cleanup to prevent duplicates
        this.clearAllMemoryNodesFromDOM();

        // Clear animation
        if (this.neuralAnimationId) {
          cancelAnimationFrame(this.neuralAnimationId);
          this.neuralCtx.clearRect(0, 0, this.neuralCanvas.width, this.neuralCanvas.height);
        }

        // Reset nodes
        this.nodes = [];

        // Hide radial menu
        this.radialMenu.classList.remove('active');
        this.isMenuOpen = false;

        // Reset radial menu items to default state
        const radialItems = this.radialMenu.querySelectorAll('.radial-item');

        radialItems.forEach((item, i) => {
          item.style.opacity = '0';
          item.style.transform = 'scale(0)';
          // CRITICAL: Reset positioning to default
          item.style.left = '';
          item.style.top = '';
          item.style.animationPlayState = 'running';
        });
        
        console.log('🌌 exitMemoryConstellation complete - Final state:', {
          isConstellationMode: this.isConstellationMode,
          isMenuOpen: this.isMenuOpen,
          radialMenuClasses: this.radialMenu?.className,
          bodyClasses: document.body.className
        });
      }

      // Sanitize title to remove base64 or corrupted data
      sanitizeTitle(title) {
        if (!title || typeof title !== 'string') return 'Untitled Memory';

        // Check if it looks like base64 or corrupted data
        if (title.length > 50 || /^[A-Za-z0-9+\/=]{20,}$/.test(title)) {
          return 'Memory Capsule';
        }

        // Remove any non-printable characters and limit length
        const cleaned = title.replace(/[^\x20-\x7E]/g, '').trim();
        return cleaned.length > 0 ? cleaned.substring(0, 50) : 'Untitled Memory';
      }

      // 📱💻🖥️ RESPONSIVE MEMORY DIALOG - Works on ALL screen sizes!
      async openMemoryDialog(memory) {
        console.log('🎯 DASHBOARD: Opening responsive memory dialog for:', memory.title || memory.id);
        
        // 🚀 CRITICAL FIX: Load full media if lazy-loaded (from performance optimization)
        const memoryWithFullMedia = await this.loadFullMediaForMemory(memory);
        
        // 📱💻🖥️ USE THE NEW RESPONSIVE MEMORY DIALOG!
        this.showResponsiveMemoryDialog(memoryWithFullMedia);
      }

      /**
       * 🚀 PERFORMANCE OPTIMIZATION: Load full media data on-demand for lazy-loaded attachments
       * (Reused from memories.js constellation)
       */
      async loadFullMediaForMemory(memory) {
        // Check if this memory has lazy-loaded attachments that need full loading
        const hasLazyAttachments = memory.attachments?.some(att => att.isLazyLoaded && att.hasMedia);
        
        if (!hasLazyAttachments) {
          console.log('💾 DASHBOARD: Memory already has full media, no loading needed');
          return memory;
        }
        
        console.log('🚀 DASHBOARD: Loading full media for', memory.attachments?.length || 0, 'attachments');
        
        try {
          // Get vault media data
          const vaultMedia = window.emmaWebVault?.vaultData?.content?.media || {};
          
          // Load full media data for lazy-loaded attachments
          const fullAttachments = memory.attachments.map(attachment => {
            if (attachment.isLazyLoaded && attachment.hasMedia && attachment.mediaId) {
              const mediaItem = vaultMedia[attachment.mediaId];
              if (mediaItem && mediaItem.data) {
                console.log('💾 DASHBOARD: Loading full media for:', attachment.name);
                return {
                  ...attachment,
                  url: mediaItem.data.startsWith('data:')
                    ? mediaItem.data
                    : `data:${mediaItem.type};base64,${mediaItem.data}`,
                  dataUrl: mediaItem.data.startsWith('data:')
                    ? mediaItem.data
                    : `data:${mediaItem.type};base64,${mediaItem.data}`,
                  data: mediaItem.data,
                  isLazyLoaded: false, // Mark as fully loaded
                  isPersisted: true
                };
              }
            }
            
            // Return attachment as-is if already loaded or no media
            return attachment;
          });
          
          console.log('✅ DASHBOARD: Successfully loaded full media data');
          
          return {
            ...memory,
            attachments: fullAttachments
          };
          
        } catch (error) {
          console.error('❌ DASHBOARD: Failed to load full media:', error);
          // Return original memory if loading fails
          return memory;
        }
      }

      /**
       * 📱💻🖥️ RESPONSIVE MEMORY DIALOG - Works on ALL screen sizes!
       */
      showResponsiveMemoryDialog(memory) {
        // Prepare memory data  
        const hasImages = memory.attachments?.some(att => att.type?.startsWith('image/')) || 
                         memory.mediaItems?.some(item => item.type?.startsWith('image/'));
        const hasVideo = memory.attachments?.some(att => att.type?.startsWith('video/')) || 
                        memory.mediaItems?.some(item => item.type?.startsWith('video/'));
        const peopleList = memory.metadata?.people || memory.people || [];
        
        // Create fully responsive dialog for ALL screen sizes
        const dialog = document.createElement('div');
        dialog.className = 'memory-preview-dialog responsive dashboard';
        dialog.style.cssText = `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          z-index: 10000 !important;
          display: flex !important;
          align-items: flex-start !important;
          justify-content: center !important;
          opacity: 0;
          animation: dialogFadeIn 0.3s ease forwards;
          background: rgba(0, 0, 0, 0.6) !important;
          backdrop-filter: blur(25px) saturate(180%) !important;
          padding: 20px;
          overflow-y: auto !important;
          box-sizing: border-box;
          pointer-events: auto !important;
        `;

        dialog.innerHTML = `
          <style>
            /* 🎯 RESPONSIVE DIALOG STYLES FOR ALL SCREEN SIZES */
            @keyframes dialogFadeIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
            
            .responsive-memory-container {
              /* 🎨 EMMA GLASSMORPHISM: Match chat interface aesthetic */
              background: rgba(26, 16, 51, 0.92);
              backdrop-filter: blur(25px) saturate(150%);
              border-radius: clamp(16px, 3vw, 24px);
              max-width: 95vw;
              max-height: 95vh;
              width: 100%;
              overflow-y: auto;
              position: relative;
              animation: dialogFadeIn 0.3s ease forwards;
              border: 1px solid rgba(255, 255, 255, 0.12);
              box-shadow: 
                0 25px 80px rgba(0, 0, 0, 0.4),
                0 0 0 1px rgba(255, 255, 255, 0.08),
                inset 0 1px 0 rgba(255, 255, 255, 0.12);
            }
            
            /* 📱 MOBILE FIRST (320px+) */
            .responsive-memory-container {
              margin: 10px;
              padding: 20px;
            }
            
            /* 📱 TABLET (768px+) */
            @media (min-width: 768px) {
              .responsive-memory-container {
                margin: 20px;
                padding: 30px;
                max-width: 700px;
              }
            }
            
            /* 💻 LAPTOP (1024px+) */
            @media (min-width: 1024px) {
              .responsive-memory-container {
                margin: 40px;
                padding: 40px;
                max-width: 900px;
              }
            }
            
            /* 🖥️ DESKTOP (1440px+) */
            @media (min-width: 1440px) {
              .responsive-memory-container {
                max-width: 1100px;
                padding: 50px;
              }
            }
            
            /* HEADER STYLES */
            .memory-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: clamp(20px, 4vw, 30px);
              flex-wrap: wrap;
              gap: 15px;
            }
            
            .header-info h2 {
              margin: 0;
              color: white;
              font-size: clamp(20px, 4vw, 28px);
              font-weight: 700;
              line-height: 1.2;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            
            .memory-date {
              color: rgba(255, 255, 255, 0.8);
              font-size: clamp(14px, 2.5vw, 16px);
              margin-top: 5px;
            }
            
            .close-btn {
              background: rgba(255, 255, 255, 0.15);
              border: none;
              color: white;
              width: clamp(40px, 6vw, 48px);
              height: clamp(40px, 6vw, 48px);
              border-radius: 50%;
              cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
              transition: all 0.3s ease;
              backdrop-filter: blur(10px);
              flex-shrink: 0;
            }
            
            .close-btn:hover {
              background: rgba(255, 255, 255, 0.25);
              transform: scale(1.1);
            }
            
            /* HERO CAROUSEL STYLES */
            .hero-carousel {
              margin-bottom: clamp(25px, 5vw, 35px);
              border-radius: clamp(12px, 2.5vw, 16px);
            overflow: hidden;
            position: relative;
              aspect-ratio: 16/9;
              background: rgba(0, 0, 0, 0.3);
            }
            
            .carousel-container {
              position: relative;
              width: 100%;
              height: 100%;
            }
            
            .hero-image {
                position: absolute;
                top: 0;
                left: 0;
              width: 100%;
              height: 100%;
              background-size: cover;
              background-position: center;
              opacity: 0;
              transition: opacity 0.5s ease;
            }
            
            .hero-image.active {
              opacity: 1;
            }
            
            .image-overlay {
              position: absolute;
                bottom: 0;
              left: 0;
              right: 0;
              height: 50%;
              background: linear-gradient(transparent, rgba(0, 0, 0, 0.4));
            }
            
            .carousel-dots {
              position: absolute;
              bottom: 15px;
              left: 50%;
              transform: translateX(-50%);
                    display: flex;
              gap: 8px;
            }
            
            .dot {
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background: rgba(255, 255, 255, 0.5);
              cursor: pointer;
              transition: all 0.3s ease;
            }
            
            .dot.active {
              background: white;
              transform: scale(1.2);
            }
            
            /* PEOPLE SECTION */
            .people-section {
              margin-bottom: clamp(25px, 5vw, 35px);
            }
            
            .section-title {
              color: white;
              font-size: clamp(16px, 3vw, 20px);
              font-weight: 600;
              margin: 0 0 clamp(15px, 3vw, 20px) 0;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            
            .people-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(clamp(80px, 15vw, 120px), 1fr));
              gap: clamp(12px, 3vw, 20px);
              justify-items: center;
            }
            
            .memory-person-avatar {
              width: clamp(70px, 12vw, 100px);
              height: clamp(70px, 12vw, 100px);
                                border-radius: 50%;
              border: 3px solid rgba(255, 255, 255, 0.9);
                                overflow: hidden;
              position: relative;
              background: linear-gradient(135deg, #6f63d9 0%, #d06fa8 100%);
                            display: flex;
                            flex-direction: column;
                              align-items: center;
                              justify-content: center;
              font-size: clamp(12px, 2.5vw, 16px);
                              font-weight: 600;
              color: white;
                    transition: all 0.3s ease;
              cursor: pointer;
              text-align: center;
              box-shadow: 0 4px 12px rgba(111, 99, 217, 0.3);
            }
            
            .memory-person-avatar:hover {
              transform: scale(1.05);
              border-color: white;
              box-shadow: 0 6px 20px rgba(111, 99, 217, 0.5);
            }
            
            .memory-person-avatar img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            
            /* CONTENT SECTION */
            .content-section {
              margin-bottom: clamp(25px, 5vw, 35px);
            }
            
            .memory-story p {
              color: white;
              font-size: clamp(16px, 3vw, 18px);
                line-height: 1.6;
              margin: 0 0 clamp(15px, 3vw, 20px) 0;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }
            
            .memory-tags {
                      display: flex;
                      align-items: center;
              gap: clamp(10px, 2vw, 15px);
              margin-bottom: clamp(10px, 2vw, 15px);
              flex-wrap: wrap;
            }
            
            .tag-label {
              font-size: clamp(16px, 3vw, 18px);
              flex-shrink: 0;
            }
            
            .emotions-list {
                    display: flex;
              gap: clamp(6px, 1.5vw, 10px);
              flex-wrap: wrap;
            }
            
            .emotion-tag, .location-tag {
              background: rgba(255, 255, 255, 0.15);
              color: white;
              padding: clamp(4px, 1vw, 6px) clamp(8px, 2vw, 12px);
              border-radius: clamp(12px, 2vw, 16px);
              font-size: clamp(12px, 2.5vw, 14px);
                      font-weight: 500;
              border: 1px solid rgba(255, 255, 255, 0.2);
              backdrop-filter: blur(10px);
            }
            
            /* MEDIA SECTION */
            .media-section {
              margin-bottom: clamp(25px, 5vw, 35px);
            }
            
            .media-grid {
                    display: grid;
              grid-template-columns: repeat(auto-fill, minmax(clamp(120px, 25vw, 200px), 1fr));
              gap: clamp(10px, 2vw, 15px);
            }
            
            .media-item {
              aspect-ratio: 1;
              border-radius: clamp(8px, 2vw, 12px);
                          overflow: hidden;
              background: rgba(255, 255, 255, 0.1);
                          position: relative;
              transition: transform 0.3s ease;
            }
            
            .media-item:hover {
              transform: scale(1.05);
            }
            
            .media-item img, .media-item video {
                              width: 100%;
                              height: 100%;
              object-fit: cover;
            }
            
            .video-play-overlay {
                                position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-size: clamp(20px, 4vw, 30px);
              color: white;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
            }
            
            /* ACTION BUTTONS */
            .action-buttons {
              display: flex;
              gap: clamp(12px, 3vw, 20px);
              margin-top: clamp(30px, 5vw, 40px);
              flex-wrap: wrap;
            }
            
            .action-btn {
              flex: 1;
              min-width: clamp(120px, 25vw, 150px);
              padding: clamp(12px, 2.5vw, 16px) clamp(20px, 4vw, 30px);
              border: none;
              border-radius: clamp(10px, 2vw, 14px);
              font-size: clamp(14px, 2.5vw, 16px);
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
                                display: flex;
                                align-items: center;
                                justify-content: center;
              gap: clamp(6px, 1.5vw, 8px);
              text-decoration: none;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }
            
            .action-btn.primary {
              background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
              color: #6f63d9;
              border: 2px solid rgba(255, 255, 255, 0.3);
            }
            
            .action-btn.primary:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(255, 255, 255, 0.3);
            }
            
            .action-btn.secondary {
              background: rgba(255, 255, 255, 0.15);
              color: white;
              border: 2px solid rgba(255, 255, 255, 0.3);
                                  backdrop-filter: blur(10px);
            }
            
            .action-btn.secondary:hover {
              background: rgba(255, 255, 255, 0.25);
              transform: translateY(-2px);
            }
          </style>
          
          <div class="responsive-memory-container">
            <!-- HEADER -->
            <div class="memory-header">
              <div class="header-info">
                <h2>${memory.metadata?.title || memory.title || memory.subject || 'Beautiful Memory'}</h2>
                <div class="memory-date">${this.formatMemoryDate(memory.created || memory.date || memory.timestamp)}</div>
              </div>
              <button class="close-btn" onclick="window.emmaDashboard.closeMemoryDialog()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
                              </div>

            <!-- HERO CAROUSEL -->
            ${hasImages ? `
              <div class="hero-carousel">
                <div class="carousel-container">
                  ${(memory.attachments || memory.mediaItems || [])
                    .filter(att => att.type?.startsWith('image/'))
                    .slice(0, 5)
                    .map((image, index) => {
                      const imageUrl = image.url || image.dataUrl || image.data || image.previewUrl;
                      
                      // 🔧 FIX: Use img tag instead of background-image for better compatibility
                      return `
                        <div class="hero-image ${index === 0 ? 'active' : ''}">
                          <img src="${imageUrl}" alt="${image.name || 'Memory image'}" style="
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                            border-radius: 12px;
                          " />
                          <div class="image-overlay"></div>
                        </div>
                      `;
                    }).join('')}
                </div>
                ${(memory.attachments || memory.mediaItems || []).filter(att => att.type?.startsWith('image/')).length > 1 ? `
                  <div class="carousel-dots">
                    ${(memory.attachments || memory.mediaItems || [])
                      .filter(att => att.type?.startsWith('image/'))
                      .slice(0, 5)
                      .map((_, index) => `
                        <div class="dot ${index === 0 ? 'active' : ''}" onclick="window.emmaDashboard.switchDashboardCarouselImage(${index})"></div>
                      `).join('')}
                        </div>
                ` : ''}
              </div>
            ` : ''}
            
            <!-- PEOPLE SECTION -->
            ${peopleList.length > 0 ? `
              <div class="people-section">
                <h3 class="section-title">👥 People in this memory</h3>
                <div class="people-grid" id="people-grid-${memory.id}">
                  <!-- People avatars will be loaded here -->
                  </div>
                </div>
              ` : ''}

            <!-- CONTENT -->
            <div class="content-section">
              <div class="memory-story">
                <p>${memory.content || memory.description || memory.details || 'This precious memory is stored in your vault...'}</p>
            </div>

              ${memory.metadata?.emotions?.length > 0 ? `
                <div class="memory-tags">
                  <span class="tag-label">💭</span>
                  <div class="emotions-list">
                    ${memory.metadata.emotions.map(emotion => `
                      <span class="emotion-tag">${emotion}</span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              ${memory.metadata?.location || memory.location ? `
                <div class="memory-tags">
                  <span class="tag-label">📍</span>
                  <span class="location-tag">${memory.metadata?.location || memory.location}</span>
                </div>
              ` : ''}
            </div>

            <!-- MEDIA GRID -->
            ${(memory.attachments?.length > 1 || memory.mediaItems?.length > 1) || hasVideo ? `
              <div class="media-section">
                <h3 class="section-title">📷 All Media (${(memory.attachments || memory.mediaItems || []).length})</h3>
                <div class="media-grid">
                  ${(memory.attachments || memory.mediaItems || []).map((attachment, index) => `
                    <div class="media-item ${attachment.type?.startsWith('image/') ? 'image' : attachment.type?.startsWith('video/') ? 'video' : 'file'}">
                      ${attachment.type?.startsWith('image/') ? `
                        <img src="${attachment.url || attachment.dataUrl || attachment.data || attachment.previewUrl}" alt="${attachment.name}" />
                      ` : attachment.type?.startsWith('video/') ? `
                        <video src="${attachment.dataUrl || attachment.url}" muted>
                        <div class="video-play-overlay">▶️</div>
                        </video>
                      ` : `
                        <div class="file-item">
                          <div class="file-icon">${attachment.type?.startsWith('audio/') ? '🎵' : '📄'}</div>
                          <div class="file-name">${attachment.name}</div>
                        </div>
                      `}
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            <!-- ACTION BUTTONS -->
            <div class="action-buttons">
              <button class="action-btn secondary" onclick="window.emmaDashboard.editDashboardMemory('${memory.id}')">
                ✏️ Edit Memory
              </button>
              <button class="action-btn primary" onclick="window.emmaDashboard.shareDashboardMemory('${memory.id}')">
                🔗 Share Memory
              </button>
            </div>
          </div>
        `;

        dialog.addEventListener('click', (e) => {
          if (e.target === dialog) {
            dialog.remove();
          }
        });

        document.body.appendChild(dialog);
        this.currentMemoryDialog = dialog;

        // Animate in
        setTimeout(() => {
          dialog.style.opacity = '1';
          // Load people avatars if needed
          this.loadDashboardPeopleAvatars(memory);
        }, 100);
      }

      /**
       * 📅 Format memory date for display
       */
      formatMemoryDate(timestamp) {
        if (!timestamp) return 'Unknown date';
        
        try {
          const date = new Date(timestamp);
          return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric', 
            month: 'long',
            day: 'numeric'
          });
        } catch (error) {
          console.warn('Error formatting date:', error);
          return 'Unknown date';
        }
      }

      /**
       * 🎠 Switch carousel image in dashboard dialog
       */
      switchDashboardCarouselImage(index) {
        const heroImages = document.querySelectorAll('.hero-image');
        const dots = document.querySelectorAll('.dot');
        
        heroImages.forEach((img, i) => {
          img.classList.toggle('active', i === index);
        });
        
        dots.forEach((dot, i) => {
          dot.classList.toggle('active', i === index);
        });
      }

      /**
       * 👥 Load people avatars for dashboard memory dialog
       */
      async loadDashboardPeopleAvatars(memory) {
        const peopleGrid = document.getElementById(`people-grid-${memory.id}`);
        if (!peopleGrid) return;

        const peopleList = memory.metadata?.people || memory.people || [];
        if (peopleList.length === 0) return;

        try {
          // Get vault data for people info
          let vaultData = null;
          if (window.emmaWebVault && window.emmaWebVault.vaultData) {
            vaultData = window.emmaWebVault.vaultData;
          }

          if (!vaultData?.content?.people) {
            console.warn('⚠️ No vault people data available');
            return;
          }

          const vaultPeople = vaultData.content.people;
          const vaultMedia = vaultData.content.media || {};

          // Create avatar elements for each person
          peopleList.forEach(personId => {
            const person = vaultPeople[personId];
            if (!person) return;

            // Resolve avatar URL
            let avatarUrl = person.avatarUrl;
            if (!avatarUrl && person.avatarId && vaultMedia[person.avatarId]) {
              const mediaItem = vaultMedia[person.avatarId];
              avatarUrl = mediaItem.data?.startsWith('data:') 
                ? mediaItem.data 
                : `data:${mediaItem.type};base64,${mediaItem.data}`;
            }

            const firstName = (person.name || 'Unknown').split(' ')[0];
            const initials = firstName.charAt(0).toUpperCase();

            const avatarElement = document.createElement('div');
            avatarElement.className = 'memory-person-avatar';
            avatarElement.onclick = () => this.openPersonDialog(personId);

            if (avatarUrl) {
              const img = document.createElement('img');
              img.src = avatarUrl;
              img.alt = person.name;
              img.onerror = () => {
                // Fallback to initials if image fails
                avatarElement.innerHTML = `<span>${initials}</span>`;
              };
              avatarElement.appendChild(img);
            } else {
              avatarElement.innerHTML = `<span>${initials}</span>`;
            }

            // Add name label below avatar
            const nameLabel = document.createElement('div');
            nameLabel.style.cssText = `
              color: white;
              font-size: clamp(12px, 2vw, 14px);
              font-weight: 500;
              margin-top: 8px;
              text-align: center;
            `;
            nameLabel.textContent = firstName;

            const avatarContainer = document.createElement('div');
            avatarContainer.appendChild(avatarElement);
            avatarContainer.appendChild(nameLabel);

            peopleGrid.appendChild(avatarContainer);
          });

        } catch (error) {
          console.error('❌ Error loading dashboard people avatars:', error);
        }
      }

      /**
       * ✏️ Edit memory from dashboard dialog - DIRECT APPROACH
       */
      editDashboardMemory(memoryId) {
        // Close current dialog
        this.closeMemoryDialog();
        
        // Simple approach: Create temporary instance JUST for the edit dialog
        if (typeof EmmaChatExperience !== 'undefined') {
          const tempChatExperience = new EmmaChatExperience();
          tempChatExperience.editMemoryDetails(memoryId);
        } else {
          console.error('❌ EmmaChatExperience not available');
        }
      }

      /**
       * 🔗 Share memory from dashboard dialog
       */
      shareDashboardMemory(memoryId) {
        const shareUrl = `${window.location.origin}/index.html?memory=${memoryId}`;
        
        if (navigator.share && navigator.canShare && navigator.canShare({ url: shareUrl })) {
          navigator.share({
            title: 'Emma Memory',
            text: 'Check out this memory from Emma',
            url: shareUrl
          }).catch(err => {
            console.log('Share cancelled:', err);
            // Fallback to copy
            this.copyToClipboard(shareUrl);
          });
        } else {
          // Fallback to copy to clipboard
          this.copyToClipboard(shareUrl);
        }
      }

      /**
       * 📋 Copy text to clipboard utility
       */
      copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(() => {
            this.showToast('🔗 Memory link copied to clipboard!', 'success');
          }).catch(err => {
            console.error('Failed to copy:', err);
            this.fallbackCopyToClipboard(text);
          });
        } else {
          this.fallbackCopyToClipboard(text);
        }
      }

      /**
       * 📋 Fallback copy method for older browsers
       */
      fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          this.showToast('🔗 Memory link copied to clipboard!', 'success');
        } catch (err) {
          console.error('Fallback copy failed:', err);
          this.showToast('❌ Failed to copy link', 'error');
        }
        
        document.body.removeChild(textArea);
      }

      /**
       * 🍞 Show toast notification
       */
      showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: ${type === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' : 
                      type === 'error' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 
                      'linear-gradient(135deg, #6f63d9, #7c3aed)'};
          color: white;
          padding: 16px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          z-index: 20000;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          opacity: 0;
          transform: translateX(100%);
          transition: all 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
          toast.style.opacity = '1';
          toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
          toast.style.opacity = '0';
          toast.style.transform = 'translateX(100%)';
          setTimeout(() => {
            if (toast.parentNode) {
              toast.parentNode.removeChild(toast);
            }
          }, 300);
        }, 3000);
      }

      // Close memory dialog
      closeMemoryDialog() {
        if (this.currentMemoryDialog) {
          this.currentMemoryDialog.style.opacity = '0';
          setTimeout(() => {
            if (this.currentMemoryDialog) {
              this.currentMemoryDialog.remove();
              this.currentMemoryDialog = null;
            }
          }, 300);
        }
      }

      // Open person dialog from memory
      openPersonDialog(personId) {

        // Navigate to people page with person selected
        window.location.href = `pages/people-emma.html?person=${personId}`;
      }

      // Memory dialog slideshow controls
      prevSlide() {

        // Demo functionality - would implement real slideshow
      }

      nextSlide() {

        // Demo functionality - would implement real slideshow
      }

      shareMemory(memoryId) {

        this.showToast('📤 Memory shared!', 'success');
      }

      editMemory(memoryId) {

        this.showToast('✏️ Opening memory editor...', 'info');
      }

      // Filter constellation by theme
      filterByTheme(theme) {

        this.nodes.forEach(node => {
          if (node.theme === theme) {
            node.element.style.opacity = '1';
            node.element.style.transform = 'scale(1)';
          } else {
            node.element.style.opacity = '0.3';
            node.element.style.transform = 'scale(0.8)';
          }
        });
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

    // Initialize dashboard
    document.addEventListener('DOMContentLoaded', () => {
      document.body.classList.add('dashboard-minimal');
      // Small delay to ensure all elements are definitely available
      setTimeout(() => {
        console.log('🔍 DEBUG: Creating EmmaDashboard instance...');
        
        // CRITICAL FIX: Only create if not already exists
        if (!window.emmaDashboard) {
          window.emmaDashboard = new EmmaDashboard();
          console.log('✅ EmmaDashboard created successfully');
        } else {
          console.log('✅ EmmaDashboard already exists, skipping duplicate creation');
        }

        // Setup vault modal event listeners AFTER dashboard is created
      const dashboard = window.emmaDashboard;

      // Close button
      document.getElementById('close-vault-modal').addEventListener('click', () => {
        dashboard.closeVaultModal();
      });

      // Click outside to close
      document.getElementById('vault-modal').addEventListener('click', (e) => {
        if (e.target.id === 'vault-modal') {
          dashboard.closeVaultModal();
        }
      });

      // Unlock form handlers
      document.getElementById('unlock-btn').addEventListener('click', () => {
        dashboard.unlockVault();
      });

      document.getElementById('cancel-unlock-btn').addEventListener('click', () => {
        dashboard.hideUnlockForm();
      });

      // Create vault button handler
      document.getElementById('create-vault-btn').addEventListener('click', async () => {

        try {
          if (window.emmaAPI && window.emmaAPI.vault) {
            const st = await window.emmaAPI.vault.status();
            if (st && st.initialized) {

              dashboard.showUnlockForm();
              return;
            }
          }
        } catch {}
        // Load welcome page for vault setup
        window.location.assign('pages/welcome.html');
      });

      // Password input enter key
      document.getElementById('vault-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          dashboard.unlockVault();
        }
      });

      // QR Code handlers
      document.getElementById('generate-vault-qr-dashboard').addEventListener('click', () => {
        dashboard.showToast('📱 Vault QR generation coming soon!', 'info');
      });

      document.getElementById('open-qr-scanner-dashboard').addEventListener('click', () => {
        dashboard.showToast('📷 QR scanner coming soon!', 'info');
      });

      // Escape key to close vault modal
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const modal = document.getElementById('vault-modal');
          if (modal.classList.contains('show')) {
            dashboard.closeVaultModal();
          }
        }
      });

      // Vault status is managed by WebVaultStatus - don't override here!
      localStorage.removeItem('emmaConstellationActive');
      const params = new URLSearchParams(window.location.search);
      if (params.get('constellation') === 'true') {
        setTimeout(() => {
          if (window.emmaDashboard && window.emmaDashboard.enterMemoryConstellation) {
            window.emmaDashboard.enterMemoryConstellation();
          }
        }, 1000);
      }

      // CRITICAL: Initialize vault objects AFTER all scripts load
      setTimeout(() => {
          console.log('🚨🔧 DASHBOARD: setTimeout running - starting vault initialization...');
          console.log('🚨🔧 DASHBOARD: EmmaWebVault class available:', typeof EmmaWebVault);
          console.log('🚨🔧 DASHBOARD: window.emmaWebVault exists:', !!window.emmaWebVault);
          
          // CRITICAL FIX: Create the global vault instance (was missing!)
          if (typeof EmmaWebVault !== 'undefined' && !window.emmaWebVault) {
            console.log('🚨🔧 DASHBOARD: Creating new EmmaWebVault instance...');
            window.emmaWebVault = new EmmaWebVault();
            console.log('✅ DASHBOARD: EmmaWebVault instance created and ready');
            console.log('✅ DASHBOARD: window.emmaWebVault now exists:', !!window.emmaWebVault);
            
            // IMMEDIATE VAULT RESTORATION for extension compatibility
            if (sessionStorage.getItem('emmaVaultActive') === 'true') {
              console.log('🚨🔧 DASHBOARD: Immediately restoring vault for extension compatibility...');
              console.log('🚨🔧 DASHBOARD: Session vault name:', sessionStorage.getItem('emmaVaultName'));
              console.log('🚨🔧 DASHBOARD: Document ready state:', document.readyState);
              
              window.emmaWebVault.restoreVaultState()
                .then(result => {
                  if (result) {
                    console.log('🚨✅ DASHBOARD: Vault restored successfully for extension!', {
                      isOpen: window.emmaWebVault.isOpen,
                      hasVaultData: !!window.emmaWebVault.vaultData,
                      hasAddMemoryMethod: typeof window.emmaWebVault.addMemory
                    });
                  } else {
                    console.log('🚨⚠️ DASHBOARD: Vault restore returned false - troubleshooting...');
                    console.log('🚨⚠️ DASHBOARD: Current vault state:', {
                      isOpen: window.emmaWebVault.isOpen,
                      hasVaultData: !!window.emmaWebVault.vaultData,
                      sessionActive: sessionStorage.getItem('emmaVaultActive'),
                      sessionName: sessionStorage.getItem('emmaVaultName')
                    });
                  }
                })
                .catch(error => {
                  console.error('🚨❌ DASHBOARD: Could not restore vault:', error);
                  console.error('🚨❌ DASHBOARD: Restore error details:', {
                    errorMessage: error.message,
                    errorStack: error.stack,
                    vaultExists: !!window.emmaWebVault,
                    sessionActive: sessionStorage.getItem('emmaVaultActive')
                  });
                });
            } else {
              console.log('🚨ℹ️ DASHBOARD: No active vault session found - extension will need manual unlock');
            }
          } else if (typeof EmmaWebVault === 'undefined') {
            console.error('🚨❌ DASHBOARD: EmmaWebVault class not available! Check script loading.');
          } else if (window.emmaWebVault) {
            console.log('🚨ℹ️ DASHBOARD: window.emmaWebVault already exists, skipping creation');
          } else {
            console.error('🚨❌ DASHBOARD: Unknown condition preventing vault creation');
          }

          // Check what's available        
          // Extension mode - Set up extension-aware vault status
        if (window.emmaWebVault && window.emmaWebVault.extensionAvailable) {

          // Set dashboard as ready - extension handles all vault operations
          const statusIcon = document.getElementById('status-icon');
          const statusTitle = document.getElementById('status-title');
          const statusDescription = document.getElementById('status-description');
          const actionBtn = document.getElementById('vault-action-btn');

          if (statusIcon) statusIcon.textContent = '🔗';
          if (statusTitle) statusTitle.textContent = 'Extension Connected';
          if (statusDescription) statusDescription.textContent = 'Ready to preserve memories! Extension manages your vault automatically.';
          if (actionBtn) actionBtn.style.display = 'none'; // Hide action button

          // Listen for extension vault ready event
          window.addEventListener('extension-vault-ready', (event) => {

            // Force update vault icon to unlocked
            const vaultIcon = document.querySelector('#vault-node .radial-item-icon');
            if (vaultIcon) {
              vaultIcon.textContent = '🔓';

            }

            // Update vault node status
            setTimeout(() => {
              if (window.dashboard && window.dashboard.updateVaultNodeStatus) {
                window.dashboard.updateVaultNodeStatus();

              }
            }, 100);
          });
        } else if (window.emmaWebVault && window.emmaWebVault.isOpen) {
          // Vault is already open and ready
          console.log('✅ DASHBOARD: Vault is already open and ready');
        }

        }, 100); // Small delay for DOM elements to be available
        
      }, 100); // Small delay to ensure all elements are definitely available
    });
    
    // 🚨 CRITICAL: Add postMessage handlers for content script communication
    window.addEventListener('message', (event) => {
      // Only handle messages from same origin
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === 'EMMA_VAULT_CHECK') {
        console.log('🚨📨 DASHBOARD: Received vault check request from content script');
        
        const vaultStatus = {
          exists: !!window.emmaWebVault,
          isOpen: window.emmaWebVault?.isOpen,
          canAddMemory: typeof window.emmaWebVault?.addMemory === 'function',
          timestamp: Date.now()
        };
        
        console.log('🚨📨 DASHBOARD: Sending vault status:', vaultStatus);
        
        window.postMessage({
          type: 'EMMA_VAULT_RESPONSE',
          messageId: event.data.messageId,
          vaultStatus: vaultStatus
        }, '*');
      }
      
                    if (event.data?.type === 'EMMA_VAULT_SAVE' && window.emmaWebVault && window.emmaWebVault.isOpen) {
                console.log('🚨💾 DASHBOARD: Received save request from content script');
                console.log('🚨💾 DASHBOARD: Memory data size:', JSON.stringify(event.data.memoryData).length);

                window.emmaWebVault.addMemory(event.data.memoryData)
                  .then(result => {
                    console.log('🚨✅ DASHBOARD: Save successful:', result);
                    
                    // 🎯 CRITICAL: Trigger constellation refresh after extension save
                    console.log('🔄 DASHBOARD: Triggering constellation refresh after extension save...');
                    window.dispatchEvent(new CustomEvent('emmaMemoryAdded', {
                      detail: { 
                        memoryId: result.id,
                        source: 'extension',
                        timestamp: Date.now()
                      }
                    }));
                    
                    window.postMessage({
                      type: 'EMMA_VAULT_SAVE_RESPONSE',
                      messageId: event.data.messageId,
                      result: { success: true, result }
                    }, '*');
                  })
                  .catch(error => {
                    console.error('🚨❌ DASHBOARD: Save failed:', error);
                    window.postMessage({
                      type: 'EMMA_VAULT_SAVE_RESPONSE',
                      messageId: event.data.messageId,
                      result: { success: false, error: error.message }
                    }, '*');
                  });
              }
    });





















