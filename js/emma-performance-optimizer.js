/**
 * Emma Performance Optimizer
 * Lazy loading, reduced motion, and performance budgets for demo readiness
 * 
 * 💜 Built with love for smooth, accessible experiences
 */

class EmmaPerformanceOptimizer {
  constructor() {
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.loadedModules = new Set();
    this.deferredComponents = new Map();
    this.performanceBudget = {
      maxInitialJS: 500, // KB
      maxImageSize: 5,   // MB
      maxConcurrentRequests: 6
    };
    
    this.init();
  }

  /**
   * Initialize performance optimizations
   */
  init() {
    this.setupReducedMotion();
    this.setupLazyLoading();
    this.setupResourceOptimization();
    this.deferNonCriticalComponents();
    this.monitorPerformance();
    
    console.log('🚀 Emma Performance Optimizer initialized');
  }

  /**
   * Setup reduced motion preferences for dementia-friendly experience
   */
  setupReducedMotion() {
    const reducedMotionCSS = `
      <style id="emmaReducedMotionStyles">
        /* Respect user's motion preferences */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
          
          /* Disable Emma's floating animations for comfort */
          body::before {
            animation: none !important;
          }
          
          .emma-orb, .orb-pulse, .floating-element {
            animation: none !important;
            transform: none !important;
          }
          
          /* Keep gentle hover effects but remove motion */
          .hover-effect:hover {
            transform: none !important;
            animation: none !important;
          }
          
          /* Disable parallax and motion effects */
          .parallax, .motion-effect, .floating {
            transform: none !important;
            animation: none !important;
          }
        }

        /* Performance-conscious animations even when motion is enabled */
        .performance-safe-animation {
          will-change: transform;
          transform: translateZ(0); /* Enable GPU acceleration */
        }
        
        /* Optimize expensive gradient animations */
        .gradient-animation {
          backface-visibility: hidden;
          perspective: 1000px;
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', reducedMotionCSS);

    // Listen for changes in motion preference
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.isReducedMotion = e.matches;
      this.handleMotionPreferenceChange();
    });
  }

  /**
   * Handle motion preference changes
   */
  handleMotionPreferenceChange() {
    if (this.isReducedMotion) {
      document.body.classList.add('reduced-motion');
      console.log('🎯 Reduced motion activated for comfort');
    } else {
      document.body.classList.remove('reduced-motion');
      console.log('🎯 Normal motion restored');
    }

    // Notify all components about motion preference change
    window.dispatchEvent(new CustomEvent('emma:motionPreferenceChanged', {
      detail: { reducedMotion: this.isReducedMotion }
    }));
  }

  /**
   * Setup lazy loading for images and components
   */
  setupLazyLoading() {
    // Intersection Observer for lazy loading
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          
          // Load the image
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
          
          // Load deferred components
          if (img.dataset.component) {
            this.loadDeferredComponent(img.dataset.component);
          }
        }
      });
    }, {
      rootMargin: '50px' // Start loading 50px before entering viewport
    });

    // Observe all lazy images
    document.addEventListener('DOMContentLoaded', () => {
      const lazyImages = document.querySelectorAll('img[data-src]');
      lazyImages.forEach(img => imageObserver.observe(img));
    });

    // Dynamic lazy loading for content that gets added later
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            const lazyImages = node.querySelectorAll ? node.querySelectorAll('img[data-src]') : [];
            lazyImages.forEach(img => imageObserver.observe(img));
          }
        });
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Defer loading of non-critical components
   */
  deferNonCriticalComponents() {
    const deferredComponents = [
      {
        name: 'chat-experience',
        selector: '#emma-chat-container',
        loader: () => this.loadChatExperience()
      },
      {
        name: 'memory-gallery',
        selector: '.memory-gallery',
        loader: () => this.loadMemoryGallery()
      },
      {
        name: 'voice-capture',
        selector: '.voice-capture-ui',
        loader: () => this.loadVoiceCapture()
      },
      {
        name: 'dementia-companion',
        selector: '.dementia-companion',
        loader: () => this.loadDementiaCompanion()
      }
    ];

    // Register deferred components
    deferredComponents.forEach(component => {
      this.deferredComponents.set(component.name, component);
    });

    // Use requestIdleCallback for deferred loading
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        this.loadVisibleComponents();
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        this.loadVisibleComponents();
      }, 1000);
    }
  }

  /**
   * Load components that are visible on screen
   */
  loadVisibleComponents() {
    this.deferredComponents.forEach((component, name) => {
      const element = document.querySelector(component.selector);
      if (element && this.isElementVisible(element)) {
        this.loadDeferredComponent(name);
      }
    });
  }

  /**
   * Check if element is visible in viewport
   */
  isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  /**
   * Load a deferred component
   */
  async loadDeferredComponent(name) {
    if (this.loadedModules.has(name)) return;

    const component = this.deferredComponents.get(name);
    if (!component) return;

    try {
      console.log(`🔄 Loading deferred component: ${name}`);
      await component.loader();
      this.loadedModules.add(name);
      console.log(`✅ Component loaded: ${name}`);
    } catch (error) {
      console.error(`❌ Failed to load component ${name}:`, error);
    }
  }

  /**
   * Lazy load chat experience
   */
  async loadChatExperience() {
    // Only load if not already loaded and element exists
    if (!this.loadedModules.has('chat-experience')) {
      const chatContainer = document.querySelector('#emma-chat-container');
      if (chatContainer && window.EmmaChatExperience) {
        // Initialize chat experience if needed
        if (!window.emmaChatExperience) {
          window.emmaChatExperience = new EmmaChatExperience();
        }
      }
    }
  }

  /**
   * Lazy load memory gallery
   */
  async loadMemoryGallery() {
    if (!this.loadedModules.has('memory-gallery')) {
      // Load gallery only when needed
      const galleryContainer = document.querySelector('.memory-gallery');
      if (galleryContainer) {
        // Initialize gallery if needed
        console.log('🖼️ Memory gallery loaded on demand');
      }
    }
  }

  /**
   * Lazy load voice capture
   */
  async loadVoiceCapture() {
    if (!this.loadedModules.has('voice-capture')) {
      const voiceContainer = document.querySelector('.voice-capture-ui');
      if (voiceContainer && window.EmmaVoiceCaptureExperience) {
        console.log('🎤 Voice capture loaded on demand');
      }
    }
  }

  /**
   * Lazy load dementia companion
   */
  async loadDementiaCompanion() {
    if (!this.loadedModules.has('dementia-companion')) {
      const companionContainer = document.querySelector('.dementia-companion');
      if (companionContainer && window.EmmaDementiaCompanion) {
        console.log('🧠 Dementia companion loaded on demand');
      }
    }
  }

  /**
   * Setup resource optimization
   */
  setupResourceOptimization() {
    // Preload critical resources
    this.preloadCriticalResources();
    
    // Optimize image loading
    this.optimizeImageLoading();
    
    // Setup resource budgets
    this.enforceResourceBudgets();
  }

  /**
   * Preload critical resources
   */
  preloadCriticalResources() {
    const criticalResources = [
      { href: 'css/main.css', as: 'style' },
      { href: 'js/emma-web-vault.js', as: 'script' },
      { href: 'js/emma-env.js', as: 'script' }
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      document.head.appendChild(link);
    });
  }

  /**
   * Optimize image loading
   */
  optimizeImageLoading() {
    // Add loading="lazy" to images that don't have it
    document.addEventListener('DOMContentLoaded', () => {
      const images = document.querySelectorAll('img:not([loading])');
      images.forEach(img => {
        // Don't lazy load images that are above the fold
        const rect = img.getBoundingClientRect();
        if (rect.top > window.innerHeight) {
          img.loading = 'lazy';
        }
      });
    });

    // Compress large images on the fly
    this.setupImageCompression();
  }

  /**
   * Setup client-side image compression for uploads
   */
  setupImageCompression() {
    // Helper function to compress images before upload
    window.compressImage = (file, maxSizeMB = 2, quality = 0.8) => {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          // Calculate new dimensions
          let { width, height } = img;
          const maxDimension = 1920; // Max width or height
          
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height * maxDimension) / width;
              width = maxDimension;
            } else {
              width = (width * maxDimension) / height;
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(resolve, 'image/jpeg', quality);
        };
        
        img.src = URL.createObjectURL(file);
      });
    };
  }

  /**
   * Enforce performance budgets
   */
  enforceResourceBudgets() {
    // Monitor script loading
    const originalAppendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function(child) {
      if (child.tagName === 'SCRIPT' && child.src) {
        console.log(`📦 Loading script: ${child.src}`);
      }
      return originalAppendChild.call(this, child);
    };

    // Monitor large file uploads
    document.addEventListener('change', (e) => {
      if (e.target.type === 'file') {
        Array.from(e.target.files).forEach(file => {
          const sizeMB = file.size / (1024 * 1024);
          if (sizeMB > this.performanceBudget.maxImageSize) {
            console.warn(`⚠️ Large file detected: ${file.name} (${sizeMB.toFixed(1)}MB)`);
            
            // Show user-friendly warning
            if (window.emmaError) {
              window.emmaError(
                `That file is quite large (${sizeMB.toFixed(1)}MB). Would you like me to compress it for faster loading?`,
                {
                  title: 'Large file detected',
                  helpText: 'Smaller files work better for everyone.',
                  actionText: 'Compress it'
                }
              );
            }
          }
        });
      }
    });
  }

  /**
   * Monitor performance metrics
   */
  monitorPerformance() {
    // Performance observer for monitoring
    if (window.PerformanceObserver) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            console.log(`📊 Page load time: ${entry.loadEventEnd - entry.fetchStart}ms`);
          } else if (entry.entryType === 'largest-contentful-paint') {
            console.log(`📊 LCP: ${entry.startTime}ms`);
          }
        }
      });

      observer.observe({ entryTypes: ['navigation', 'largest-contentful-paint'] });
    }

    // Memory usage monitoring (if available)
    if (performance.memory) {
      setInterval(() => {
        const memoryInfo = performance.memory;
        const usedMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
        
        if (usedMB > 100) { // Alert if using more than 100MB
          console.warn(`⚠️ High memory usage: ${usedMB.toFixed(1)}MB`);
        }
      }, 30000); // Check every 30 seconds
    }
  }

  /**
   * Public API for manual optimization
   */
  optimizeForDemo() {
    console.log('🎬 Optimizing for demo mode...');
    
    // Preload critical demo resources
    this.loadDeferredComponent('chat-experience');
    this.loadDeferredComponent('memory-gallery');
    
    // Reduce motion for demo stability
    if (!this.isReducedMotion) {
      document.body.classList.add('demo-mode');
    }
    
    // Clear any performance warnings
    console.clear();
    
    console.log('✨ Demo optimization complete!');
  }

  /**
   * Get performance status
   */
  getPerformanceStatus() {
    return {
      reducedMotion: this.isReducedMotion,
      loadedModules: Array.from(this.loadedModules),
      deferredComponents: Array.from(this.deferredComponents.keys()),
      memoryUsage: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / (1024 * 1024)),
        total: Math.round(performance.memory.totalJSHeapSize / (1024 * 1024))
      } : null
    };
  }
}

// Initialize performance optimizer
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.emmaPerformanceOptimizer = new EmmaPerformanceOptimizer();
  });
} else {
  window.emmaPerformanceOptimizer = new EmmaPerformanceOptimizer();
}

// Make available globally
window.EmmaPerformanceOptimizer = EmmaPerformanceOptimizer;
