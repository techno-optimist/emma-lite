/**
 * Emma Modal Helpers - Secure Replacements for alert/confirm/prompt
 * SECURITY: Replaces unsafe browser dialogs with proper Emma-branded modals
 */

/**
 * Show a confirmation modal with Emma branding
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {string} confirmText - Confirm button text
 * @param {string} cancelText - Cancel button text
 * @returns {Promise<boolean>} - True if confirmed, false if cancelled
 */
async function showConfirmModal(title, message, confirmText = 'Confirm', cancelText = 'Cancel') {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'emma-modal-overlay';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.8); z-index: 10000;
      display: flex; align-items: center; justify-content: center;
    `;
    
    const content = document.createElement('div');
    content.className = 'emma-modal-content';
    content.style.cssText = `
      background: linear-gradient(135deg, #1a1033 0%, #2d1b69 50%, #0f0c29 100%);
      padding: 30px; border-radius: 16px; max-width: 400px; text-align: center;
      border: 1px solid rgba(139, 92, 246, 0.3);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    `;
    
    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.style.cssText = 'color: white; margin-bottom: 15px; font-size: 20px;';
    
    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    messageEl.style.cssText = 'color: rgba(255, 255, 255, 0.8); margin-bottom: 25px; line-height: 1.5;';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 12px; justify-content: center;';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = cancelText;
    cancelBtn.style.cssText = `
      padding: 10px 20px; background: rgba(255, 255, 255, 0.1); 
      color: white; border: none; border-radius: 8px; cursor: pointer;
      transition: all 0.3s ease;
    `;
    
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = confirmText;
    confirmBtn.style.cssText = `
      padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      color: white; border: none; border-radius: 8px; cursor: pointer;
      transition: all 0.3s ease;
    `;
    
    // Event handlers
    const cleanup = () => document.body.removeChild(modal);
    
    cancelBtn.onclick = () => {
      cleanup();
      resolve(false);
    };
    
    confirmBtn.onclick = () => {
      cleanup();
      resolve(true);
    };
    
    modal.onclick = (e) => {
      if (e.target === modal) {
        cleanup();
        resolve(false);
      }
    };
    
    // ESC key handler
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        document.removeEventListener('keydown', escHandler);
        resolve(false);
      }
    };
    document.addEventListener('keydown', escHandler);
    
    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(confirmBtn);
    content.appendChild(titleEl);
    content.appendChild(messageEl);
    content.appendChild(buttonContainer);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Focus confirm button
    confirmBtn.focus();
  });
}

/**
 * Show an error modal with Emma branding
 * @param {string} title - Error title
 * @param {string} message - Error message
 */
function showErrorModal(title, message) {
  const modal = document.createElement('div');
  modal.className = 'emma-modal-overlay';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.8); z-index: 10000;
    display: flex; align-items: center; justify-content: center;
  `;
  
  const content = document.createElement('div');
  content.className = 'emma-modal-content';
  content.style.cssText = `
    background: linear-gradient(135deg, #1a1033 0%, #2d1b69 50%, #0f0c29 100%);
    padding: 30px; border-radius: 16px; max-width: 400px; text-align: center;
    border: 1px solid rgba(255, 100, 100, 0.3);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  `;
  
  const titleEl = document.createElement('h3');
  titleEl.textContent = '⚠️ ' + title;
  titleEl.style.cssText = 'color: #ff6b6b; margin-bottom: 15px; font-size: 20px;';
  
  const messageEl = document.createElement('p');
  messageEl.textContent = message;
  messageEl.style.cssText = 'color: rgba(255, 255, 255, 0.8); margin-bottom: 25px; line-height: 1.5;';
  
  const okBtn = document.createElement('button');
  okBtn.textContent = 'OK';
  okBtn.style.cssText = `
    padding: 10px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
    color: white; border: none; border-radius: 8px; cursor: pointer;
    transition: all 0.3s ease;
  `;
  
  // Event handlers
  const cleanup = () => document.body.removeChild(modal);
  
  okBtn.onclick = cleanup;
  modal.onclick = (e) => {
    if (e.target === modal) cleanup();
  };
  
  // ESC key handler
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      cleanup();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
  
  content.appendChild(titleEl);
  content.appendChild(messageEl);
  content.appendChild(okBtn);
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Focus OK button
  okBtn.focus();
}

/**
 * Show a password input modal with Emma branding
 * @param {string} title - Modal title
 * @param {string} label - Input label
 * @returns {Promise<string|null>} - Password string or null if cancelled
 */
async function showPasswordModal(title, label) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'emma-modal-overlay';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.8); z-index: 10000;
      display: flex; align-items: center; justify-content: center;
    `;
    
    const content = document.createElement('div');
    content.className = 'emma-modal-content';
    content.style.cssText = `
      background: linear-gradient(135deg, #1a1033 0%, #2d1b69 50%, #0f0c29 100%);
      padding: 30px; border-radius: 16px; max-width: 400px; text-align: center;
      border: 1px solid rgba(139, 92, 246, 0.3);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    `;
    
    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.style.cssText = 'color: white; margin-bottom: 20px; font-size: 20px;';
    
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = 'color: rgba(255, 255, 255, 0.8); display: block; margin-bottom: 10px; text-align: left;';
    
    const input = document.createElement('input');
    input.type = 'password';
    input.style.cssText = `
      width: 100%; padding: 12px; border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 8px; background: rgba(255, 255, 255, 0.05); color: white;
      margin-bottom: 20px; font-size: 16px;
    `;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 12px; justify-content: center;';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 10px 20px; background: rgba(255, 255, 255, 0.1);
      color: white; border: none; border-radius: 8px; cursor: pointer;
    `;
    
    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.style.cssText = `
      padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      color: white; border: none; border-radius: 8px; cursor: pointer;
    `;
    
    // Event handlers
    const cleanup = () => document.body.removeChild(modal);
    
    cancelBtn.onclick = () => {
      cleanup();
      resolve(null);
    };
    
    okBtn.onclick = () => {
      const value = input.value.trim();
      cleanup();
      resolve(value || null);
    };
    
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const value = input.value.trim();
        cleanup();
        resolve(value || null);
      }
    };
    
    modal.onclick = (e) => {
      if (e.target === modal) {
        cleanup();
        resolve(null);
      }
    };
    
    // ESC key handler
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        document.removeEventListener('keydown', escHandler);
        resolve(null);
      }
    };
    document.addEventListener('keydown', escHandler);
    
    content.appendChild(titleEl);
    content.appendChild(labelEl);
    content.appendChild(input);
    content.appendChild(buttonContainer);
    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(okBtn);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Focus input
    input.focus();
  });
}

// Make functions globally available
window.showConfirmModal = showConfirmModal;
window.showErrorModal = showErrorModal;
window.showPasswordModal = showPasswordModal;
