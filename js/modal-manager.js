/**
 * Emma Modal Manager - Prevents constellation background conflicts
 * Manages modal layering and interaction states
 * 
 * 💜 EMMA ETHOS: Smooth, accessible modal experience
 */

class EmmaModalManager {
  constructor() {
    this.activeModals = new Set();
    this.originalOverflows = new Map();
    this.init();
  }

  init() {
    // Listen for modal open/close events
    this.setupModalObserver();
    
    // Add escape key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModals.size > 0) {
        this.closeTopModal();
      }
    });

    console.log('💜 Emma Modal Manager initialized');
  }

  /**
   * Setup observers for modal state changes
   */
  setupModalObserver() {
    // Watch for modal elements being added/shown
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.checkForModal(node);
            }
          });
        }
        
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'class' || 
             mutation.attributeName === 'style')) {
          this.checkForModal(mutation.target);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }

  /**
   * Check if an element is a modal and manage its state
   */
  checkForModal(element) {
    const modalSelectors = [
      '.memory-modal',
      '.memory-preview-dialog', // CRITICAL: Constellation modals
      '.memory-preview-dialog.constellation',
      '.memory-preview-dialog.responsive',
      '.slideshow-modal', 
      '.share-modal',
      '.memory-wizard-modal',
      '.chat-modal',
      '.settings-modal',
      '.emma-modal-overlay',
      '[role="dialog"]',
      '[aria-modal="true"]'
    ];

    const isModal = modalSelectors.some(selector => {
      return element.matches && element.matches(selector);
    });

    if (isModal) {
      const isVisible = this.isElementVisible(element);
      
      if (isVisible && !this.activeModals.has(element)) {
        this.openModal(element);
      } else if (!isVisible && this.activeModals.has(element)) {
        this.closeModal(element);
      }
    }
  }

  /**
   * Check if element is visible
   */
  isElementVisible(element) {
    const style = getComputedStyle(element);
    const hasShowClass = element.classList.contains('show') || 
                        element.classList.contains('active') ||
                        element.classList.contains('open');
    
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           (hasShowClass || style.opacity > 0);
  }

  /**
   * Handle modal opening
   */
  openModal(modalElement) {
    console.log('💜 Modal Manager: Opening modal', modalElement.className);
    
    this.activeModals.add(modalElement);
    
    // Add modal-open class to body
    document.body.classList.add('modal-open');
    
    // Store original overflow and prevent background scrolling
    if (!this.originalOverflows.has(document.body)) {
      this.originalOverflows.set(document.body, document.body.style.overflow);
      document.body.style.overflow = 'hidden';
    }

    // Disable constellation interactions
    this.disableConstellationInteraction();
    
    // Ensure proper focus management
    this.manageFocus(modalElement);
    
    // Update z-index if needed
    this.ensureProperZIndex(modalElement);
  }

  /**
   * Handle modal closing
   */
  closeModal(modalElement) {
    console.log('💜 Modal Manager: Closing modal', modalElement.className);
    
    this.activeModals.delete(modalElement);
    
    // If no modals are open, restore original state
    if (this.activeModals.size === 0) {
      document.body.classList.remove('modal-open');
      
      // Restore original overflow
      const originalOverflow = this.originalOverflows.get(document.body);
      if (originalOverflow !== undefined) {
        document.body.style.overflow = originalOverflow;
        this.originalOverflows.delete(document.body);
      }
      
      // Re-enable constellation interactions
      this.enableConstellationInteraction();
    }
  }

  /**
   * Disable constellation background interactions
   */
  disableConstellationInteraction() {
    const canvasElements = document.querySelectorAll('.memories-container canvas, .constellation-canvas');
    canvasElements.forEach(canvas => {
      canvas.style.pointerEvents = 'none';
      canvas.classList.add('modal-disabled');
    });

    // Disable any background scroll handlers
    const memoryContainer = document.querySelector('.memories-container');
    if (memoryContainer) {
      memoryContainer.classList.add('modal-active');
      // Prevent wheel events on the background
      memoryContainer.addEventListener('wheel', this.preventBackgroundScroll, { passive: false });
    }
  }

  /**
   * Re-enable constellation interactions
   */
  enableConstellationInteraction() {
    const canvasElements = document.querySelectorAll('.memories-container canvas, .constellation-canvas');
    canvasElements.forEach(canvas => {
      canvas.style.pointerEvents = 'auto';
      canvas.classList.remove('modal-disabled');
    });

    const memoryContainer = document.querySelector('.memories-container');
    if (memoryContainer) {
      memoryContainer.classList.remove('modal-active');
      memoryContainer.removeEventListener('wheel', this.preventBackgroundScroll);
    }
  }

  /**
   * Prevent background scrolling while modal is open
   */
  preventBackgroundScroll(e) {
    // Only prevent if the target is not within a modal
    const modal = e.target.closest('[role="dialog"], .memory-modal, .modal');
    if (!modal) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  /**
   * Manage focus for accessibility
   */
  manageFocus(modalElement) {
    // Store the currently focused element
    if (!modalElement.dataset.previousFocus) {
      modalElement.dataset.previousFocus = document.activeElement ? 
        document.activeElement.getAttribute('id') : '';
    }

    // Focus the modal or first focusable element
    setTimeout(() => {
      const focusable = modalElement.querySelector(
        'input, button, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable) {
        focusable.focus();
      } else {
        modalElement.focus();
      }
    }, 100);
  }

  /**
   * Ensure modal has proper z-index
   */
  ensureProperZIndex(modalElement) {
    const modalType = this.getModalType(modalElement);
    const zIndex = this.getZIndexForModalType(modalType);
    
    if (zIndex) {
      modalElement.style.zIndex = zIndex;
      
      // Also fix the overlay if it exists
      const overlay = modalElement.querySelector('.memory-detail-overlay, .modal-overlay, .overlay');
      if (overlay) {
        overlay.style.zIndex = zIndex - 1;
      }
    }
  }

  /**
   * Get modal type for z-index assignment
   */
  getModalType(modalElement) {
    if (modalElement.matches('.memory-preview-dialog.constellation, .memory-preview-dialog.responsive')) return 'constellation';
    if (modalElement.matches('.memory-modal, .memory-preview-dialog')) return 'memory';
    if (modalElement.matches('.slideshow-modal')) return 'slideshow';
    if (modalElement.matches('.share-modal')) return 'share';
    if (modalElement.matches('.memory-wizard-modal')) return 'wizard';
    if (modalElement.matches('.emma-modal-overlay')) return 'emma';
    if (modalElement.matches('.error-modal, .warning-dialog')) return 'alert';
    return 'default';
  }

  /**
   * Get appropriate z-index for modal type
   */
  getZIndexForModalType(type) {
    const zIndexMap = {
      constellation: 10000, // CRITICAL: Match constellation modal z-index
      memory: 10000,
      slideshow: 3100,
      share: 3200, 
      wizard: 3300,
      emma: 4000,
      alert: 4100,
      default: 10000
    };
    
    return zIndexMap[type];
  }

  /**
   * Close the topmost modal
   */
  closeTopModal() {
    if (this.activeModals.size > 0) {
      const modals = Array.from(this.activeModals);
      const topModal = modals[modals.length - 1];
      
      // Try to find and click close button
      const closeBtn = topModal.querySelector('.close-btn, .btn-close, [data-dismiss="modal"]');
      if (closeBtn) {
        closeBtn.click();
      } else {
        // Hide modal directly
        topModal.style.display = 'none';
        topModal.classList.remove('show', 'active', 'open');
        this.closeModal(topModal);
      }
    }
  }

  /**
   * Force close all modals (emergency)
   */
  closeAllModals() {
    console.log('💜 Modal Manager: Emergency close all modals');
    
    Array.from(this.activeModals).forEach(modal => {
      modal.style.display = 'none';
      modal.classList.remove('show', 'active', 'open');
      this.closeModal(modal);
    });
    
    this.activeModals.clear();
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    this.enableConstellationInteraction();
  }

  /**
   * Get current modal stack
   */
  getActiveModals() {
    return Array.from(this.activeModals);
  }
}

// Initialize modal manager when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.emmaModalManager = new EmmaModalManager();
  });
} else {
  window.emmaModalManager = new EmmaModalManager();
}

// Export for use in other scripts
window.EmmaModalManager = EmmaModalManager;

console.log('💜 Emma Modal Manager script loaded');
