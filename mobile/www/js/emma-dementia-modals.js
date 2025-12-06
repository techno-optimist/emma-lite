/**
 * Emma Dementia-Friendly Modal System
 * Gentle, accessible, validation therapy approach
 * 
 * 💜 Built with love for cognitive accessibility
 */

class EmmaDementiaModals {
  constructor() {
    this.isOpen = false;
    this.currentResolve = null;
    this.currentReject = null;
  }

  /**
   * Show a gentle, reassuring error message
   * Uses validation therapy language - no blame, gentle guidance
   */
  showError(options = {}) {
    const {
      title = "Let's try that together",
      message = "Something didn't work as expected. That's okay, let's figure it out.",
      actionText = "Try Again",
      helpText = "Take your time. I'm here to help.",
      onAction = null
    } = options;

    return this.createModal({
      type: 'error',
      title,
      message,
      helpText,
      buttons: [
        {
          text: actionText,
          class: 'emma-btn-primary',
          action: () => {
            if (onAction) onAction();
            this.close();
          }
        }
      ]
    });
  }

  /**
   * Show a gentle success message with positive reinforcement
   */
  showSuccess(options = {}) {
    const {
      title = "Well done!",
      message = "That worked perfectly.",
      helpText = "You're doing great.",
      autoClose = true,
      autoCloseDelay = 3000
    } = options;

    const modal = this.createModal({
      type: 'success',
      title,
      message,
      helpText,
      buttons: [
        {
          text: "Continue",
          class: 'emma-btn-primary',
          action: () => this.close()
        }
      ]
    });

    if (autoClose) {
      setTimeout(() => {
        if (this.isOpen) {
          this.close();
        }
      }, autoCloseDelay);
    }

    return modal;
  }

  /**
   * Show a gentle confirmation with clear choices
   * Avoids anxiety-inducing language like "delete forever"
   */
  showConfirmation(options = {}) {
    return new Promise((resolve, reject) => {
      const {
        title = "Let me check",
        message = "Would you like to continue?",
        confirmText = "Yes, Continue",
        cancelText = "No, Go Back",
        helpText = "Take your time to decide.",
        isDestructive = false
      } = options;

      // For destructive actions, use gentler language
      const finalMessage = isDestructive 
        ? message.replace(/delete|remove|destroy/gi, 'put away')
        : message;

      this.currentResolve = resolve;
      this.currentReject = reject;

      this.createModal({
        type: 'confirm',
        title,
        message: finalMessage,
        helpText,
        buttons: [
          {
            text: cancelText,
            class: 'emma-btn-secondary',
            action: () => {
              resolve(false);
              this.close();
            }
          },
          {
            text: confirmText,
            class: isDestructive ? 'emma-btn-warning' : 'emma-btn-primary',
            action: () => {
              resolve(true);
              this.close();
            }
          }
        ]
      });
    });
  }

  /**
   * Show an informational message with optional action
   */
  showInfo(options = {}) {
    const {
      title = "Good to know",
      message = "Here's some helpful information.",
      actionText = "Got it",
      helpText = null
    } = options;

    return this.createModal({
      type: 'info',
      title,
      message,
      helpText,
      buttons: [
        {
          text: actionText,
          class: 'emma-btn-primary',
          action: () => this.close()
        }
      ]
    });
  }

  /**
   * Create the modal with dementia-friendly styling
   */
  createModal(config) {
    if (this.isOpen) {
      return Promise.reject(new Error('Modal is already open'));
    }

    this.isOpen = true;

    const { type, title, message, helpText, buttons } = config;

    // Create modal HTML with high contrast, large text
    const modalHTML = `
      <div class="emma-dementia-modal-overlay" id="emmaDementiaModal">
        <div class="emma-dementia-modal">
          <div class="emma-dementia-modal-header">
            <div class="emma-dementia-modal-icon emma-dementia-icon-${type}">
              ${this.getIcon(type)}
            </div>
            <h2 class="emma-dementia-modal-title">${title}</h2>
          </div>
          
          <div class="emma-dementia-modal-body">
            <p class="emma-dementia-modal-message">${message}</p>
            ${helpText ? `<p class="emma-dementia-modal-help">${helpText}</p>` : ''}
          </div>
          
          <div class="emma-dementia-modal-footer">
            ${buttons.map(btn => `
              <button class="emma-dementia-btn ${btn.class}" 
                      data-action="${buttons.indexOf(btn)}"
                      tabindex="0">
                ${btn.text}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Add to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add styles if not already present
    this.addStyles();

    // Set up event listeners
    const modal = document.getElementById('emmaDementiaModal');
    
    buttons.forEach((btn, index) => {
      const btnElement = modal.querySelector(`[data-action="${index}"]`);
      btnElement.addEventListener('click', btn.action);
    });

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.close();
      }
    });

    // Escape key handling
    document.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Focus first button
    setTimeout(() => {
      const firstBtn = modal.querySelector('.emma-dementia-btn');
      if (firstBtn) firstBtn.focus();
    }, 100);

    return Promise.resolve();
  }

  /**
   * Get appropriate icon for modal type
   */
  getIcon(type) {
    const icons = {
      error: '💙', // Gentle blue heart instead of harsh red X
      success: '✨', // Sparkles for positive reinforcement  
      confirm: '🤔', // Thinking face for decisions
      info: 'ℹ️'    // Information symbol
    };
    return icons[type] || '💙';
  }

  /**
   * Handle keyboard navigation (accessibility)
   */
  handleKeyDown(e) {
    if (!this.isOpen) return;

    if (e.key === 'Escape') {
      if (this.currentReject) {
        this.currentReject(new Error('User cancelled'));
      }
      this.close();
    }
  }

  /**
   * Close the modal
   */
  close() {
    const modal = document.getElementById('emmaDementiaModal');
    if (modal) {
      modal.remove();
    }
    
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.isOpen = false;
    this.currentResolve = null;
    this.currentReject = null;
  }

  /**
   * Add dementia-friendly CSS styles
   */
  addStyles() {
    if (document.getElementById('emmaDementiaModalStyles')) return;

    const styles = `
      <style id="emmaDementiaModalStyles">
        .emma-dementia-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        }

        .emma-dementia-modal {
          background: white;
          border-radius: 12px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          animation: emmaDementiaModalSlideIn 0.3s ease-out;
        }

        @keyframes emmaDementiaModalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .emma-dementia-modal-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 24px;
          text-align: center;
        }

        .emma-dementia-modal-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .emma-dementia-modal-title {
          margin: 0;
          font-size: var(--emma-font-2xl, 24px);
          font-weight: 600;
          line-height: 1.3;
        }

        .emma-dementia-modal-body {
          padding: calc(32px * var(--emma-font-scale, 1)) calc(24px * var(--emma-font-scale, 1));
          text-align: center;
        }

        .emma-dementia-modal-message {
          font-size: var(--emma-font-lg, 18px);
          line-height: 1.6;
          color: #333;
          margin: 0 0 calc(16px * var(--emma-font-scale, 1)) 0;
        }

        .emma-dementia-modal-help {
          font-size: var(--emma-font-base, 16px);
          color: #666;
          font-style: italic;
          margin: 0;
        }

        .emma-dementia-modal-footer {
          padding: calc(24px * var(--emma-font-scale, 1));
          display: flex;
          gap: calc(12px * var(--emma-font-scale, 1));
          justify-content: center;
          background: #f8f9fa;
        }

        .emma-dementia-btn {
          padding: calc(16px * var(--emma-font-scale, 1)) calc(32px * var(--emma-font-scale, 1));
          border: none;
          border-radius: calc(8px * var(--emma-font-scale, 1));
          font-size: var(--emma-font-base, 16px);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: calc(120px * var(--emma-font-scale, 1));
          min-height: calc(44px * var(--emma-font-scale, 1)); /* Ensure accessibility */
        }

        .emma-dementia-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .emma-dementia-btn:focus {
          outline: 3px solid #667eea;
          outline-offset: 2px;
        }

        .emma-btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .emma-btn-secondary {
          background: #e9ecef;
          color: #495057;
        }

        .emma-btn-warning {
          background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%);
          color: #2d3436;
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .emma-dementia-modal {
            border: 3px solid #000;
          }
          
          .emma-dementia-modal-message,
          .emma-dementia-modal-title {
            color: #000;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .emma-dementia-modal {
            animation: none;
          }
          
          .emma-dementia-btn:hover {
            transform: none;
          }
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }
}

// Create global instance
window.emmaDementiaModals = new EmmaDementiaModals();

// Convenient global functions for backwards compatibility
window.emmaError = (message, options = {}) => 
  window.emmaDementiaModals.showError({ message, ...options });

window.emmaSuccess = (message, options = {}) => 
  window.emmaDementiaModals.showSuccess({ message, ...options });

window.emmaConfirm = (message, options = {}) => 
  window.emmaDementiaModals.showConfirmation({ message, ...options });

window.emmaInfo = (message, options = {}) => 
  window.emmaDementiaModals.showInfo({ message, ...options });
