/**
 * Secure Password Modal for Emma Web
 * Beautiful, secure password input with Emma design principles
 * Hides password input and provides proper security
 * 
 * 💜 Built with love and security in mind
 */

class SecurePasswordModal {
  constructor() {
    this.isOpen = false;
    this.currentResolve = null;
    this.currentReject = null;
  }

  /**
   * Show secure password input modal
   * @param {Object} options - Configuration options
   * @param {string} options.title - Modal title
   * @param {string} options.message - Message to display
   * @param {string} options.placeholder - Input placeholder
   * @param {boolean} options.confirmPassword - Show password confirmation field
   * @returns {Promise<string|{password: string, confirm: string}>} - The entered password(s)
   */
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

      // Create modal HTML
      const modalHTML = `
        <div class="emma-secure-modal-overlay" id="secureModalOverlay">
          <div class="emma-secure-modal">
            <div class="emma-secure-modal-header">
              <h3 class="emma-secure-modal-title">${title}</h3>
              <button class="emma-secure-modal-close" onclick="window.securePasswordModal.cancel()">×</button>
            </div>
            
            <div class="emma-secure-modal-body">
              <p class="emma-secure-modal-message">${message}</p>
              
              <div class="emma-secure-input-group">
                <input 
                  type="password" 
                  id="securePasswordInput" 
                  class="emma-secure-input" 
                  placeholder="${placeholder}"
                  autocomplete="new-password"
                >
                <div class="emma-password-strength" id="passwordStrength"></div>
              </div>
              
              ${confirmPassword ? `
                <div class="emma-secure-input-group">
                  <input 
                    type="password" 
                    id="confirmPasswordInput" 
                    class="emma-secure-input" 
                    placeholder="Confirm password..."
                    autocomplete="new-password"
                  >
                  <div class="emma-password-match" id="passwordMatch"></div>
                </div>
              ` : ''}
              
              <div class="emma-security-notice">
                <span class="emma-security-icon">🔐</span>
                Your password is never stored in plain text and is processed locally in your browser.
              </div>
            </div>
            
            <div class="emma-secure-modal-footer">
              <button class="emma-secure-btn emma-secure-btn-cancel" onclick="window.securePasswordModal.cancel()">
                Cancel
              </button>
              <button class="emma-secure-btn emma-secure-btn-confirm" onclick="window.securePasswordModal.confirm()">
                ${confirmPassword ? 'Create Vault' : 'Unlock'}
              </button>
            </div>
          </div>
        </div>
      `;

      // Add modal to page
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      console.log('🔐 Secure modal HTML added to page');

      // Add event listeners
      this.setupEventListeners(confirmPassword);
      console.log('🔐 Event listeners setup completed');

      // Focus password input and test
      setTimeout(() => {
        const passwordInput = document.getElementById('securePasswordInput');
        if (passwordInput) {
          console.log('🔐 Password input found, attempting focus...');
          passwordInput.focus();
          
          // Clean focus without any auto-typing
          console.log('🔐 Password input focused and ready for user input');
          
        } else {
          console.error('❌ Password input not found!');
        }
      }, 100);
    });
  }

  setupEventListeners(confirmPassword) {
    const passwordInput = document.getElementById('securePasswordInput');
    const confirmInput = document.getElementById('confirmPasswordInput');

    // Enter key handling
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

    // Password strength indicator
    passwordInput.addEventListener('input', () => {
      this.updatePasswordStrength(passwordInput.value);
    });

    // Password match indicator
    if (confirmInput) {
      confirmInput.addEventListener('input', () => {
        this.updatePasswordMatch(passwordInput.value, confirmInput.value);
      });
      passwordInput.addEventListener('input', () => {
        this.updatePasswordMatch(passwordInput.value, confirmInput.value);
      });
    }

    // Click outside to close
    document.getElementById('secureModalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'secureModalOverlay') {
        this.cancel();
      }
    });
  }

  updatePasswordStrength(password) {
    const strengthDiv = document.getElementById('passwordStrength');
    if (!strengthDiv) return;

    const strength = this.calculatePasswordStrength(password);
    
    strengthDiv.innerHTML = `
      <div class="emma-strength-bar">
        <div class="emma-strength-fill emma-strength-${strength.level}" style="width: ${strength.percentage}%"></div>
      </div>
      <span class="emma-strength-text">${strength.text}</span>
    `;
  }

  updatePasswordMatch(password, confirm) {
    const matchDiv = document.getElementById('passwordMatch');
    if (!matchDiv) return;

    if (confirm.length === 0) {
      matchDiv.innerHTML = '';
      return;
    }

    const matches = password === confirm;
    matchDiv.innerHTML = `
      <span class="emma-match-indicator ${matches ? 'match' : 'no-match'}">
        ${matches ? '✅ Passwords match' : '❌ Passwords do not match'}
      </span>
    `;
  }

  calculatePasswordStrength(password) {
    if (password.length === 0) return { level: 'none', percentage: 0, text: '' };

    let score = 0;
    let feedback = [];

    // Length check
    if (password.length >= 8) score += 25;
    else feedback.push('At least 8 characters');

    // Character variety
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 20;

    // Length bonus
    if (password.length >= 12) score += 10;

    let level, text;
    if (score < 30) {
      level = 'weak';
      text = 'Weak - ' + (feedback.length > 0 ? feedback[0] : 'Add more variety');
    } else if (score < 60) {
      level = 'fair';
      text = 'Fair - Consider adding special characters';
    } else if (score < 80) {
      level = 'good';
      text = 'Good password strength';
    } else {
      level = 'strong';
      text = 'Strong password - excellent security!';
    }

    return { level, percentage: Math.min(score, 100), text };
  }

  confirm() {
    const passwordInput = document.getElementById('securePasswordInput');
    const confirmInput = document.getElementById('confirmPasswordInput');
    
    if (!passwordInput) {
      this.cancel();
      return;
    }

    const password = passwordInput.value;
    
    if (!password) {
      this.showError('Password is required');
      return;
    }

    if (confirmInput) {
      const confirmPassword = confirmInput.value;
      if (password !== confirmPassword) {
        this.showError('Passwords do not match');
        return;
      }
      
      // Check minimum strength for new passwords
      const strength = this.calculatePasswordStrength(password);
      if (strength.level === 'weak') {
        this.showError('Please choose a stronger password for better security');
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
      rejectFunction(new Error('Password input cancelled'));
    } else {
      console.error('❌ currentReject is not a function:', typeof this.currentReject);
    }
  }

  showError(message) {
    // Remove existing error
    const existingError = document.querySelector('.emma-secure-error');
    if (existingError) {
      existingError.remove();
    }

    // Add new error
    const modalBody = document.querySelector('.emma-secure-modal-body');
    const errorHTML = `
      <div class="emma-secure-error">
        <span class="emma-error-icon">⚠️</span>
        ${message}
      </div>
    `;
    modalBody.insertAdjacentHTML('beforeend', errorHTML);

    // Remove error after 5 seconds
    setTimeout(() => {
      const error = document.querySelector('.emma-secure-error');
      if (error) error.remove();
    }, 5000);
  }

  close() {
    const overlay = document.getElementById('secureModalOverlay');
    if (overlay) {
      overlay.remove();
    }
    this.isOpen = false;
    this.currentResolve = null;
    this.currentReject = null;
  }
}

// Global instance
window.securePasswordModal = new SecurePasswordModal();

// CSS Styles for the secure modal
const secureModalStyles = `
<style>
/* Emma Brand Variables for Secure Modal */
:root {
  --emma-gradient-1: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  --emma-gradient-2: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%);
  --emma-glass: rgba(255, 255, 255, 0.05);
  --emma-border: rgba(255, 255, 255, 0.1);
  --emma-text: #ffffff;
  --emma-text-secondary: rgba(255, 255, 255, 0.8);
  --emma-text-tertiary: rgba(255, 255, 255, 0.6);
  --emma-purple: #764ba2;
  --emma-success: #4ade80;
  --emma-error: #f87171;
  --emma-glow: 0 0 40px rgba(134, 88, 255, 0.6);
}
.emma-secure-modal-overlay {
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
  pointer-events: auto;
}

.emma-secure-modal {
  background: var(--emma-glass);
  backdrop-filter: blur(20px);
  border: 1px solid var(--emma-border);
  border-radius: 20px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--emma-glow);
  animation: slideIn 0.3s ease;
}

.emma-secure-modal-header {
  padding: 25px 30px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.emma-secure-modal-title {
  color: var(--emma-text);
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  background: var(--emma-gradient-1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.emma-secure-modal-close {
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

.emma-secure-modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--emma-text);
}

.emma-secure-modal-body {
  padding: 20px 30px;
}

.emma-secure-modal-message {
  color: var(--emma-text-secondary);
  margin-bottom: 20px;
  line-height: 1.5;
}

.emma-secure-input-group {
  margin-bottom: 20px;
}

.emma-secure-input {
  width: 100%;
  padding: 15px;
  border: 2px solid var(--emma-border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--emma-text);
  font-size: 1rem;
  transition: all 0.3s ease;
  font-family: inherit;
  pointer-events: auto !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  z-index: 10001;
  position: relative;
}

.emma-secure-input:focus {
  outline: none;
  border-color: var(--emma-purple);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 3px rgba(134, 88, 255, 0.2);
}

.emma-secure-input::placeholder {
  color: var(--emma-text-tertiary);
}

.emma-password-strength {
  margin-top: 10px;
}

.emma-strength-bar {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 5px;
}

.emma-strength-fill {
  height: 100%;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.emma-strength-weak { background: #f87171; }
.emma-strength-fair { background: #fbbf24; }
.emma-strength-good { background: #34d399; }
.emma-strength-strong { background: #10b981; }

.emma-strength-text {
  font-size: 0.85rem;
  color: var(--emma-text-tertiary);
}

.emma-match-indicator {
  font-size: 0.85rem;
  margin-top: 5px;
  display: block;
}

.emma-match-indicator.match {
  color: var(--emma-success);
}

.emma-match-indicator.no-match {
  color: var(--emma-error);
}

.emma-security-notice {
  background: rgba(74, 222, 128, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 8px;
  padding: 12px;
  font-size: 0.85rem;
  color: var(--emma-success);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 15px;
}

.emma-security-icon {
  font-size: 1.1rem;
}

.emma-secure-modal-footer {
  padding: 0 30px 25px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.emma-secure-btn {
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-size: 0.95rem;
}

.emma-secure-btn-cancel {
  background: transparent;
  color: var(--emma-text-secondary);
  border: 2px solid var(--emma-border);
}

.emma-secure-btn-cancel:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--emma-text);
  border-color: var(--emma-text-secondary);
}

.emma-secure-btn-confirm {
  background: var(--emma-gradient-2);
  color: white;
  min-width: 100px;
}

.emma-secure-btn-confirm:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(134, 88, 255, 0.3);
}

.emma-secure-error {
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
document.head.insertAdjacentHTML('beforeend', secureModalStyles);

console.log('🔐 Secure Password Modal initialized - protecting your precious memories!');
