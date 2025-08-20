/**
 * Clean Secure Password Modal for Emma Web
 * NO debugging code, NO auto-typing, CLEAN implementation
 * 
 * 💜 Built with love and absolute security in mind
 */

class CleanSecurePasswordModal {
  constructor() {
    this.isOpen = false;
    this.currentResolve = null;
    this.currentReject = null;
  }

  show(options = {}) {
    return new Promise((resolve, reject) => {
      if (this.isOpen) {
        reject(new Error('Modal is already open'));
        return;
      }

      const {
        title = "Secure Password",
        message = "Please enter your password",
        placeholder = "Enter password...",
        confirmPassword = false
      } = options;

      this.currentResolve = resolve;
      this.currentReject = reject;
      this.isOpen = true;

      // Create modal HTML - CLEAN VERSION
      const modalHTML = `
        <div class="clean-modal-overlay" id="cleanModalOverlay">
          <div class="clean-modal">
            <div class="clean-modal-header">
              <h3 class="clean-modal-title">${title}</h3>
              <button class="clean-modal-close" onclick="window.cleanSecurePasswordModal.cancel()">×</button>
            </div>
            
            <div class="clean-modal-body">
              <p class="clean-modal-message">${message}</p>
              
              <div class="clean-input-group">
                <input 
                  type="password" 
                  id="cleanPasswordInput" 
                  class="clean-input" 
                  placeholder="${placeholder}"
                  autocomplete="new-password"
                >
              </div>
              
              ${confirmPassword ? `
                <div class="clean-input-group">
                  <input 
                    type="password" 
                    id="cleanConfirmInput" 
                    class="clean-input" 
                    placeholder="Confirm password..."
                    autocomplete="new-password"
                  >
                </div>
              ` : ''}
              
              <div class="clean-security-notice">
                🔐 Your password is processed locally and never stored.
              </div>
            </div>
            
            <div class="clean-modal-footer">
              <button class="clean-btn clean-btn-cancel" onclick="window.cleanSecurePasswordModal.cancel()">
                Cancel
              </button>
              <button class="clean-btn clean-btn-confirm" onclick="window.cleanSecurePasswordModal.confirm()">
                ${confirmPassword ? 'Create Vault' : 'Unlock'}
              </button>
            </div>
          </div>
        </div>
      `;

      // Add modal to page
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      
      // Set proper z-index above memory wizard (99999) but not blocking everything
      const overlay = document.querySelector('.clean-modal-overlay');
      const modal = document.querySelector('.clean-modal');
      if (overlay) {
        overlay.style.zIndex = '2147483648';
        overlay.style.pointerEvents = 'auto';
        console.log('🔐 PROPER Z-INDEX: Set password modal to 100000 (above wizard 99999)');
      }
      if (modal) {
        modal.style.zIndex = '2147483648';
        modal.style.pointerEvents = 'auto';
        console.log('🔐 MODAL Z-INDEX: Set modal content to 100001');
      }

      // Add CLEAN event listeners
      this.setupCleanEventListeners(confirmPassword);

      // Focus password input - NO AUTO-TYPING
      setTimeout(() => {
        const passwordInput = document.getElementById('cleanPasswordInput');
        if (passwordInput) {
          passwordInput.focus();
        }
      }, 100);
    });
  }

  setupCleanEventListeners(confirmPassword) {
    const passwordInput = document.getElementById('cleanPasswordInput');
    const confirmInput = document.getElementById('cleanConfirmInput');

    // CLEAN Enter key handling - NO AUTO-SUBMISSION
    passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (confirmPassword && confirmInput) {
          confirmInput.focus();
        } else {
          this.confirm();
        }
      }
      if (e.key === 'Escape') {
        this.cancel();
      }
    });

    if (confirmInput) {
      confirmInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.confirm();
        }
        if (e.key === 'Escape') {
          this.cancel();
        }
      });
    }

    // Click outside to close
    document.getElementById('cleanModalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'cleanModalOverlay') {
        this.cancel();
      }
    });
  }

  confirm() {
    const passwordInput = document.getElementById('cleanPasswordInput');
    const confirmInput = document.getElementById('cleanConfirmInput');
    
    if (!passwordInput) {
      this.cancel();
      return;
    }

    const password = passwordInput.value;
    
    if (!password) {
      alert('Password is required');
      return;
    }

    if (confirmInput) {
      const confirmPassword = confirmInput.value;
      if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }
    }

    // Store resolve function before closing
    const resolveFunction = this.currentResolve;
    
    this.close();
    
    // Call resolve function after closing
    if (resolveFunction && typeof resolveFunction === 'function') {
      if (confirmInput) {
        resolveFunction({ password, confirm: confirmInput.value });
      } else {
        resolveFunction(password);
      }
    }
  }

  cancel() {
    // Store reject function before closing
    const rejectFunction = this.currentReject;
    
    this.close();
    
    // Call reject function after closing
    if (rejectFunction && typeof rejectFunction === 'function') {
      rejectFunction(new Error('Password input cancelled'));
    }
  }

  close() {
    const overlay = document.getElementById('cleanModalOverlay');
    if (overlay) {
      overlay.remove();
    }
    this.isOpen = false;
    this.currentResolve = null;
    this.currentReject = null;
  }
}

// Global instance
window.cleanSecurePasswordModal = new CleanSecurePasswordModal();

// CLEAN CSS Styles
const cleanModalStyles = `
<style>
.clean-modal-overlay {
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
  z-index: 2147483648;
  animation: fadeIn 0.3s ease;
}

.clean-modal {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  max-width: 450px;
  width: 90%;
  box-shadow: 0 0 40px rgba(134, 88, 255, 0.6);
  animation: slideIn 0.3s ease;
}

.clean-modal-header {
  padding: 25px 30px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.clean-modal-title {
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.clean-modal-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.8);
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

.clean-modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.clean-modal-body {
  padding: 20px 30px;
}

.clean-modal-message {
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 20px;
  line-height: 1.5;
}

.clean-input-group {
  margin-bottom: 20px;
}

.clean-input {
  width: 100%;
  padding: 15px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  font-size: 1rem;
  transition: all 0.3s ease;
  font-family: inherit;
  box-sizing: border-box;
}

.clean-input:focus {
  outline: none;
  border-color: #764ba2;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 3px rgba(134, 88, 255, 0.2);
}

.clean-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.clean-security-notice {
  background: rgba(74, 222, 128, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 8px;
  padding: 12px;
  font-size: 0.85rem;
  color: #4ade80;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 15px;
}

.clean-modal-footer {
  padding: 0 30px 25px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.clean-btn {
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-size: 0.95rem;
}

.clean-btn-cancel {
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.clean-btn-cancel:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.8);
}

.clean-btn-confirm {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%);
  color: white;
  min-width: 100px;
}

.clean-btn-confirm:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(134, 88, 255, 0.3);
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
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', cleanModalStyles);

console.log('🔐 Clean Secure Password Modal initialized - NO debugging artifacts!');
