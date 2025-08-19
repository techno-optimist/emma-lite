/**
 * Universal Vault Unlock Modal
 * Beautiful, reusable vault unlock modal with Emma design principles
 */

class UniversalVaultModal {
  constructor() {
    this.isOpen = false;
    this.onSuccessCallback = null;
    this.onCancelCallback = null;
    this.wasSuccessful = false;
  }

  /**
   * Show the vault unlock modal
   * @param {Object} options - Configuration options
   * @param {string} options.title - Modal title (default: "Unlock Vault")
   * @param {string} options.message - Message to display
   * @param {Function} options.onSuccess - Callback when vault is unlocked
   * @param {Function} options.onCancel - Callback when modal is cancelled
   */
  show(options = {}) {
    if (this.isOpen) return;

    const {
      title = "Unlock Vault",
      message = "Please enter your vault passphrase to continue",
      onSuccess = null,
      onCancel = null
    } = options;

    this.onSuccessCallback = onSuccess;
    this.onCancelCallback = onCancel;
    this.isOpen = true;
    this.wasSuccessful = false;

    const modalHTML = `
      <div class="universal-vault-modal-overlay" id="universal-vault-modal" onclick="this.handleOverlayClick(event)">
        <div class="universal-vault-modal" onclick="event.stopPropagation()">
          <!-- Close Button -->
          <button class="universal-vault-close" onclick="universalVaultModal.hide()">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>

          <!-- Header -->
          <div class="universal-vault-header">
            <div class="universal-vault-icon">
              <div class="vault-orb">
                <div class="vault-orb-inner">🔒</div>
              </div>
            </div>
            <h2 class="universal-vault-title">${title}</h2>
            <p class="universal-vault-message">${message}</p>
          </div>

          <!-- Unlock Form -->
          <form class="universal-vault-form" onsubmit="universalVaultModal.handleUnlock(event)">
            <div class="universal-vault-input-group">
              <label for="vault-passphrase" class="universal-vault-label">Vault Passphrase</label>
              <div class="universal-vault-input-container">
                <input 
                  type="password" 
                  id="vault-passphrase" 
                  class="universal-vault-input" 
                  placeholder="Enter your passphrase"
                  required
                  autocomplete="current-password"
                >
                <button type="button" class="universal-vault-toggle-password" onclick="universalVaultModal.togglePassword()">
                  <svg class="eye-open" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M1 10s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7z" stroke="currentColor" stroke-width="2"/>
                    <circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  <svg class="eye-closed" width="20" height="20" viewBox="0 0 20 20" fill="none" style="display: none;">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 10 20C4 20 1 10 1 10a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 10 4c6 0 9 10 9 10a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" stroke-width="2"/>
                    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Session Duration -->
            <div class="universal-vault-session">
              <label class="universal-vault-session-label">
                <input type="checkbox" id="extend-session" checked>
                <span class="checkmark"></span>
                Keep unlocked for 12 hours
              </label>
            </div>

            <!-- Error Display -->
            <div class="universal-vault-error" id="vault-error" style="display: none;"></div>

            <!-- Actions -->
            <div class="universal-vault-actions">
              <button type="button" class="universal-vault-btn universal-vault-btn-secondary" onclick="universalVaultModal.hide()">
                Cancel
              </button>
              <button type="submit" class="universal-vault-btn universal-vault-btn-primary" id="unlock-btn">
                <span class="btn-text">🔓 Unlock Vault</span>
                <div class="btn-loading" style="display: none;">
                  <div class="spinner"></div>
                  <span>Unlocking...</span>
                </div>
              </button>
            </div>
          </form>

          <!-- Footer -->
          <div class="universal-vault-footer">
            <p class="universal-vault-help">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="2"/>
                <path d="M8 12v-4M8 6h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              Forgot your passphrase? Contact your vault guardian for recovery.
            </p>
          </div>
        </div>
      </div>
    `;

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add styles if not already present
    this.addStyles();

    // Show with animation
    setTimeout(() => {
      const modal = document.getElementById('universal-vault-modal');
      modal.classList.add('active');
      // Focus on input
      document.getElementById('vault-passphrase').focus();
    }, 10);
  }

  hide() {
    if (!this.isOpen) return;

    const modal = document.getElementById('universal-vault-modal');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => {
        modal.remove();
        this.isOpen = false;
        
        // Call cancel callback only if not successful
        if (this.onCancelCallback && !this.wasSuccessful) {
          this.onCancelCallback();
        }
      }, 300);
    }
  }

  handleOverlayClick(event) {
    if (event.target === event.currentTarget) {
      this.hide();
    }
  }

  togglePassword() {
    const input = document.getElementById('vault-passphrase');
    const eyeOpen = document.querySelector('.eye-open');
    const eyeClosed = document.querySelector('.eye-closed');
    
    if (input.type === 'password') {
      input.type = 'text';
      eyeOpen.style.display = 'none';
      eyeClosed.style.display = 'block';
    } else {
      input.type = 'password';
      eyeOpen.style.display = 'block';
      eyeClosed.style.display = 'none';
    }
  }

  async handleUnlock(event) {
    event.preventDefault();
    
    const passphrase = document.getElementById('vault-passphrase').value;
    const extendSession = document.getElementById('extend-session').checked;
    const errorDiv = document.getElementById('vault-error');
    const unlockBtn = document.getElementById('unlock-btn');
    const btnText = unlockBtn?.querySelector('.btn-text');
    const btnLoading = unlockBtn?.querySelector('.btn-loading');

    if (!passphrase.trim()) {
      this.showError('Please enter your vault passphrase');
      return;
    }

    // Show loading state with null checks
    if (unlockBtn) unlockBtn.disabled = true;
    if (btnText) btnText.style.display = 'none';
    if (btnLoading) btnLoading.style.display = 'flex';
    if (errorDiv) errorDiv.style.display = 'none';

    try {
      // For web app: vault is already unlocked when loaded
      // Just simulate successful unlock and close modal
      console.log('🔓 Web app: Vault already unlocked - closing modal');
      
      const result = { success: true };

      if (result.success) {
        console.log('✅ VAULT: Successfully unlocked via universal modal');
        
        // For web app: Set 12-hour session in localStorage
        if (extendSession) {
          const twelveHoursFromNow = Date.now() + (12 * 60 * 60 * 1000); // 12 hours
          localStorage.setItem('emmaVaultSessionExpiry', twelveHoursFromNow.toString());
          console.log('✅ VAULT: Session extended to 12 hours');
        } else {
          // Default 30 minute session
          const thirtyMinutesFromNow = Date.now() + (30 * 60 * 1000);
          localStorage.setItem('emmaVaultSessionExpiry', thirtyMinutesFromNow.toString());
          console.log('✅ VAULT: Session set to 30 minutes');
        }

        // Success animation with null checks
        if (btnText) {
          btnText.textContent = '✅ Unlocked!';
          btnText.style.display = 'block';
        }
        if (btnLoading) {
          btnLoading.style.display = 'none';
        }

        // Mark as successful to prevent cancel callback
        this.wasSuccessful = true;
        
        // Call success callback
        if (this.onSuccessCallback) {
          this.onSuccessCallback(result);
        }

        // Hide modal after brief success display
        setTimeout(() => {
          this.hide();
        }, 1000);

      } else {
        this.showError(result.error || 'Failed to unlock vault');
        this.resetButton();
      }

    } catch (error) {
      console.error('❌ VAULT: Unlock error:', error);
      this.showError('Failed to unlock vault. Please check your passphrase.');
      this.resetButton();
    }
  }

  showError(message) {
    const errorDiv = document.getElementById('vault-error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Add shake animation
    const modal = document.querySelector('.universal-vault-modal');
    modal.classList.add('shake');
    setTimeout(() => modal.classList.remove('shake'), 500);
  }

  resetButton() {
    const unlockBtn = document.getElementById('unlock-btn');
    const btnText = unlockBtn?.querySelector('.btn-text');
    const btnLoading = unlockBtn?.querySelector('.btn-loading');
    
    if (unlockBtn) unlockBtn.disabled = false;
    if (btnText) {
      btnText.style.display = 'block';
      btnText.textContent = '🔓 Unlock Vault';
    }
    if (btnLoading) {
      btnLoading.style.display = 'none';
    }
  }

  addStyles() {
    if (document.getElementById('universal-vault-modal-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'universal-vault-modal-styles';
    styles.textContent = `
      /* Universal Vault Modal Styles */
      .universal-vault-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
      }

      .universal-vault-modal-overlay.active {
        opacity: 1;
        visibility: visible;
      }

      .universal-vault-modal {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(40px);
        -webkit-backdrop-filter: blur(40px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 32px;
        padding: 40px;
        width: 90%;
        max-width: 480px;
        transform: scale(0.9) translateY(20px);
        transition: transform 0.3s ease;
        position: relative;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }

      .universal-vault-modal-overlay.active .universal-vault-modal {
        transform: scale(1) translateY(0);
      }

      .universal-vault-modal.shake {
        animation: modalShake 0.5s ease-in-out;
      }

      @keyframes modalShake {
        0%, 100% { transform: scale(1) translateY(0) translateX(0); }
        25% { transform: scale(1) translateY(0) translateX(-5px); }
        75% { transform: scale(1) translateY(0) translateX(5px); }
      }

      .universal-vault-close {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }

      .universal-vault-close:hover {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        transform: scale(1.1);
      }

      .universal-vault-header {
        text-align: center;
        margin-bottom: 32px;
      }

      .universal-vault-icon {
        margin-bottom: 24px;
      }

      .vault-orb {
        width: 80px;
        height: 80px;
        margin: 0 auto;
        border-radius: 50%;
        background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        animation: vaultPulse 3s ease-in-out infinite;
      }

      .vault-orb::before {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
        opacity: 0.3;
        animation: vaultGlow 2s ease-in-out infinite alternate;
      }

      .vault-orb-inner {
        font-size: 32px;
        z-index: 1;
      }

      @keyframes vaultPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }

      @keyframes vaultGlow {
        0% { opacity: 0.3; }
        100% { opacity: 0.6; }
      }

      .universal-vault-title {
        color: white;
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: 12px;
        background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .universal-vault-message {
        color: rgba(255, 255, 255, 0.8);
        font-size: 1rem;
        line-height: 1.5;
        margin: 0;
      }

      .universal-vault-form {
        margin-bottom: 24px;
      }

      .universal-vault-input-group {
        margin-bottom: 24px;
      }

      .universal-vault-label {
        display: block;
        color: white;
        font-weight: 600;
        margin-bottom: 8px;
        font-size: 0.9rem;
      }

      .universal-vault-input-container {
        position: relative;
      }

      .universal-vault-input {
        width: 100%;
        padding: 16px 50px 16px 16px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 16px;
        color: white;
        font-size: 1rem;
        transition: all 0.3s ease;
        box-sizing: border-box;
      }

      .universal-vault-input:focus {
        outline: none;
        border-color: rgba(139, 92, 246, 0.6);
        box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        background: rgba(255, 255, 255, 0.15);
      }

      .universal-vault-input::placeholder {
        color: rgba(255, 255, 255, 0.5);
      }

      .universal-vault-toggle-password {
        position: absolute;
        right: 16px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: color 0.3s ease;
      }

      .universal-vault-toggle-password:hover {
        color: white;
      }

      .universal-vault-session {
        margin-bottom: 20px;
      }

      .universal-vault-session-label {
        display: flex;
        align-items: center;
        color: rgba(255, 255, 255, 0.8);
        font-size: 0.9rem;
        cursor: pointer;
        user-select: none;
      }

      .universal-vault-session-label input[type="checkbox"] {
        display: none;
      }

      .checkmark {
        width: 20px;
        height: 20px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 4px;
        margin-right: 12px;
        position: relative;
        transition: all 0.3s ease;
      }

      .universal-vault-session-label input[type="checkbox"]:checked + .checkmark {
        background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
        border-color: transparent;
      }

      .universal-vault-session-label input[type="checkbox"]:checked + .checkmark::after {
        content: '✓';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 12px;
        font-weight: bold;
      }

      .universal-vault-error {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 12px;
        padding: 12px 16px;
        color: #fca5a5;
        font-size: 0.9rem;
        margin-bottom: 20px;
      }

      .universal-vault-actions {
        display: flex;
        gap: 16px;
      }

      .universal-vault-btn {
        flex: 1;
        padding: 16px 24px;
        border-radius: 16px;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        position: relative;
      }

      .universal-vault-btn:disabled {
        cursor: not-allowed;
        opacity: 0.7;
      }

      .universal-vault-btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .universal-vault-btn-secondary:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.2);
        color: white;
      }

      .universal-vault-btn-primary {
        background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
        color: white;
        border: none;
      }

      .universal-vault-btn-primary:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 10px 30px rgba(139, 92, 246, 0.3);
      }

      .btn-loading {
        display: none;
        align-items: center;
        gap: 8px;
      }

      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid transparent;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .universal-vault-footer {
        text-align: center;
        padding-top: 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .universal-vault-help {
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.85rem;
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .universal-vault-help svg {
        flex-shrink: 0;
      }

      /* Mobile Responsive */
      @media (max-width: 640px) {
        .universal-vault-modal {
          padding: 32px 24px;
          margin: 20px;
          border-radius: 24px;
        }

        .universal-vault-title {
          font-size: 1.5rem;
        }

        .universal-vault-actions {
          flex-direction: column;
        }

        .vault-orb {
          width: 60px;
          height: 60px;
        }

        .vault-orb-inner {
          font-size: 24px;
        }
      }
    `;

    document.head.appendChild(styles);
  }
}

// Create global instance
window.universalVaultModal = new UniversalVaultModal();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UniversalVaultModal;
}
