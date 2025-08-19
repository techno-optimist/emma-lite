/**
 * Emma Input Modal - Beautiful text input with Emma design
 * Replaces ugly browser prompt() with elegant Emma-styled modal
 * 
 * 💜 Built with love for beautiful user experiences
 */

class EmmaInputModal {
  constructor() {
    this.isOpen = false;
    this.currentResolve = null;
    this.currentReject = null;
  }

  /**
   * Show beautiful input modal
   * @param {Object} options - Configuration options
   * @param {string} options.title - Modal title
   * @param {string} options.message - Message to display
   * @param {string} options.placeholder - Input placeholder
   * @param {string} options.defaultValue - Default input value
   * @returns {Promise<string>} - The entered text
   */
  show(options = {}) {
    return new Promise((resolve, reject) => {
      if (this.isOpen) {
        reject(new Error('Modal is already open'));
        return;
      }

      const {
        title = "Emma",
        message = "Please enter a value",
        placeholder = "Enter text...",
        defaultValue = ""
      } = options;

      this.currentResolve = resolve;
      this.currentReject = reject;
      this.isOpen = true;

      // Create modal HTML
      const modalHTML = `
        <div class="emma-input-modal-overlay" id="inputModalOverlay">
          <div class="emma-input-modal">
            <div class="emma-input-modal-header">
              <h3 class="emma-input-modal-title">${title}</h3>
              <button class="emma-input-modal-close" onclick="window.emmaInputModal.cancel()">×</button>
            </div>
            
            <div class="emma-input-modal-body">
              <p class="emma-input-modal-message">${message}</p>
              
              <div class="emma-input-group">
                <input 
                  type="text" 
                  id="emmaTextInput" 
                  class="emma-text-input" 
                  placeholder="${placeholder}"
                  value="${defaultValue}"
                  autocomplete="off"
                >
              </div>
            </div>
            
            <div class="emma-input-modal-footer">
              <button class="emma-input-btn emma-input-btn-cancel" onclick="window.emmaInputModal.cancel()">
                Cancel
              </button>
              <button class="emma-input-btn emma-input-btn-confirm" onclick="window.emmaInputModal.confirm()">
                OK
              </button>
            </div>
          </div>
        </div>
      `;

      // Add modal to page
      document.body.insertAdjacentHTML('beforeend', modalHTML);

      // Add event listeners
      this.setupEventListeners();

      // Focus input and select default text
      setTimeout(() => {
        const input = document.getElementById('emmaTextInput');
        input.focus();
        if (defaultValue) {
          input.select();
        }
      }, 100);
    });
  }

  setupEventListeners() {
    const textInput = document.getElementById('emmaTextInput');

    // Enter key handling
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.confirm();
      }
      if (e.key === 'Escape') {
        this.cancel();
      }
    });

    // Click outside to close
    document.getElementById('inputModalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'inputModalOverlay') {
        this.cancel();
      }
    });
  }

  confirm() {
    const textInput = document.getElementById('emmaTextInput');
    
    if (!textInput) {
      this.cancel();
      return;
    }

    const value = textInput.value.trim();
    
    if (!value) {
      this.showError('Please enter a value');
      return;
    }

    // Store resolve function before closing
    const resolveFunction = this.currentResolve;
    
    this.close();
    
    // Call resolve function after closing
    if (resolveFunction && typeof resolveFunction === 'function') {
      resolveFunction(value);
    } else {
      console.error('❌ currentResolve is not a function:', typeof this.currentResolve);
    }
  }

  cancel() {
    // Store reject function before closing
    const rejectFunction = this.currentReject;
    
    this.close();
    
    // Call reject function after closing
    if (rejectFunction && typeof rejectFunction === 'function') {
      rejectFunction(new Error('Input cancelled'));
    } else {
      console.error('❌ currentReject is not a function:', typeof this.currentReject);
    }
  }

  showError(message) {
    // Remove existing error
    const existingError = document.querySelector('.emma-input-error');
    if (existingError) {
      existingError.remove();
    }

    // Add new error
    const modalBody = document.querySelector('.emma-input-modal-body');
    const errorHTML = `
      <div class="emma-input-error">
        <span class="emma-error-icon">⚠️</span>
        ${message}
      </div>
    `;
    modalBody.insertAdjacentHTML('beforeend', errorHTML);

    // Focus input again
    document.getElementById('emmaTextInput').focus();

    // Remove error after 3 seconds
    setTimeout(() => {
      const error = document.querySelector('.emma-input-error');
      if (error) error.remove();
    }, 3000);
  }

  close() {
    const overlay = document.getElementById('inputModalOverlay');
    if (overlay) {
      overlay.remove();
    }
    this.isOpen = false;
    this.currentResolve = null;
    this.currentReject = null;
  }
}

// Global instance
window.emmaInputModal = new EmmaInputModal();

// CSS Styles for the input modal
const inputModalStyles = `
<style>
.emma-input-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.3s ease;
}

.emma-input-modal {
  background: var(--emma-glass);
  backdrop-filter: blur(20px);
  border: 1px solid var(--emma-border);
  border-radius: 20px;
  max-width: 450px;
  width: 90%;
  max-height: 70vh;
  overflow-y: auto;
  box-shadow: var(--emma-glow);
  animation: slideIn 0.3s ease;
}

.emma-input-modal-header {
  padding: 25px 30px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.emma-input-modal-title {
  color: var(--emma-text);
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0;
  background: var(--emma-gradient-1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.emma-input-modal-close {
  background: none;
  border: none;
  color: var(--emma-text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.emma-input-modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--emma-text);
}

.emma-input-modal-body {
  padding: 20px 30px;
}

.emma-input-modal-message {
  color: var(--emma-text-secondary);
  margin-bottom: 20px;
  line-height: 1.5;
  font-size: 1rem;
}

.emma-input-group {
  margin-bottom: 20px;
}

.emma-text-input {
  width: 100%;
  padding: 15px;
  border: 2px solid var(--emma-border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--emma-text);
  font-size: 1rem;
  transition: all 0.3s ease;
  font-family: inherit;
}

.emma-text-input:focus {
  outline: none;
  border-color: var(--emma-purple);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 3px rgba(134, 88, 255, 0.2);
}

.emma-text-input::placeholder {
  color: var(--emma-text-tertiary);
}

.emma-input-modal-footer {
  padding: 0 30px 25px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.emma-input-btn {
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-size: 0.95rem;
}

.emma-input-btn-cancel {
  background: transparent;
  color: var(--emma-text-secondary);
  border: 2px solid var(--emma-border);
}

.emma-input-btn-cancel:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--emma-text);
  border-color: var(--emma-text-secondary);
}

.emma-input-btn-confirm {
  background: var(--emma-gradient-2);
  color: white;
  min-width: 80px;
}

.emma-input-btn-confirm:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(134, 88, 255, 0.3);
}

.emma-input-error {
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: var(--emma-error);
  border-radius: 8px;
  padding: 12px;
  margin-top: 15px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: shake 0.5s ease;
}

.emma-error-icon {
  font-size: 1.1rem;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { 
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', inputModalStyles);

console.log('✨ Emma Input Modal initialized - beautiful text input ready!');
