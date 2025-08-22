/**
 * Memory Detail Modal - Beautiful Emma-branded modal system
 * Version: 2.0 - Production Ready
 * CACHE BUST: v2.0-2025-08-22-23-20
 */

/**
 * Open memory detail modal - Beautiful production implementation
 * @param {Object} memory - The memory object to display
 * @returns {HTMLElement} - The modal element
 */
function openMemoryDetailModal(memory) {
  console.log('🎪 MODAL: Opening memory detail for:', memory.title || memory.id);
  
  // Hide Emma orb while modal is open
  const emmaOrb = document.getElementById('universal-emma-orb');
  if (emmaOrb) {
    emmaOrb.style.display = 'none';
  }

  // Create modal with beautiful styling
  const modal = document.createElement('div');
  modal.className = 'memory-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease;
  `;

  // Create modal content
  const modalContent = createModalContent(memory);
  modal.appendChild(modalContent);

  // Add to DOM
  document.body.appendChild(modal);
  
  // Setup event handlers
  setupModalEventHandlers(modal, memory);
  
  // Store reference
  window.currentMemory = memory;
  
  // Focus title input
  setTimeout(() => {
    const titleInput = modal.querySelector('#memory-title-input');
    if (titleInput) {
      titleInput.focus();
      titleInput.select();
    }
  }, 100);

  console.log('✨ MODAL: Memory detail modal opened successfully');
  return modal;
}

/**
 * Create the beautiful modal content structure
 * @param {Object} memory - The memory object
 * @returns {HTMLElement} - The modal content element
 */
function createModalContent(memory) {
  const overlay = document.createElement('div');
  overlay.className = 'memory-detail-overlay';
  overlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: transparent;
  `;

  const content = document.createElement('div');
  content.className = 'memory-detail-content';
  content.style.cssText = `
    position: relative;
    width: 90%;
    max-width: 900px;
    max-height: 90vh;
    background: linear-gradient(135deg, rgba(20, 20, 30, 0.95), rgba(30, 30, 40, 0.95));
    backdrop-filter: blur(20px);
    border: 1px solid rgba(134, 88, 255, 0.3);
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;

  content.innerHTML = `
    <!-- Header -->
    <div class="memory-detail-header" style="
      padding: 24px 32px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      gap: 16px;
      background: linear-gradient(135deg, rgba(134, 88, 255, 0.1), rgba(240, 147, 251, 0.1));
    ">
      <div style="flex: 1;">
        <input type="text" id="memory-title-input" value="${escapeHtml(memory.title || '')}" placeholder="Enter memory title..." style="
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 12px 16px;
          color: white;
          font-size: 18px;
          font-weight: 600;
          width: 100%;
          outline: none;
        "/>
      </div>
      <div style="display: flex; gap: 12px;">
        <button class="modal-delete-btn" style="
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        ">🗑️ Delete</button>
        <button class="modal-save-btn" style="
          background: linear-gradient(135deg, #8658ff, #f093fb);
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        ">💾 Save</button>
      </div>
      <button class="modal-close-btn" style="
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 8px;
        transition: all 0.2s ease;
      ">&times;</button>
    </div>

    <!-- Tabs -->
    <div class="memory-detail-tabs" style="
      display: flex;
      padding: 0 32px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.02);
    ">
      <button class="tab-btn active" data-tab="overview" style="
        background: none;
        border: none;
        color: white;
        padding: 16px 20px;
        cursor: pointer;
        border-bottom: 2px solid #f093fb;
        transition: all 0.2s ease;
      ">Overview</button>
      <button class="tab-btn" data-tab="media" style="
        background: none;
        border: none;
        color: rgba(255,255,255,0.6);
        padding: 16px 20px;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.2s ease;
      ">Media <span style="
        background: rgba(118, 75, 162, 0.3);
        color: #f093fb;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        margin-left: 4px;
      ">${memory.mediaItems ? memory.mediaItems.length : 0}</span></button>
      <button class="tab-btn" data-tab="people" style="
        background: none;
        border: none;
        color: rgba(255,255,255,0.6);
        padding: 16px 20px;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.2s ease;
      ">People <span style="
        background: rgba(118, 75, 162, 0.3);
        color: #f093fb;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        margin-left: 4px;
      ">${memory.metadata?.people ? memory.metadata.people.length : 0}</span></button>
    </div>

    <!-- Body -->
    <div class="memory-detail-body" style="
      flex: 1;
      overflow-y: auto;
      padding: 24px 32px;
    ">
      <div class="tab-content active" data-tab-content="overview">
        <textarea id="memory-content-textarea" style="
          width: 100%;
          min-height: 200px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 16px;
          color: white;
          font-size: 14px;
          line-height: 1.6;
          resize: vertical;
          outline: none;
        " placeholder="Share your memory...">${escapeHtml(memory.content || memory.excerpt || '')}</textarea>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
          <div>
            <label style="display: block; color: rgba(255,255,255,0.8); margin-bottom: 8px;">Date</label>
            <input type="date" id="memory-date-input" value="${new Date(memory.date).toISOString().split('T')[0]}" style="
              width: 100%;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 8px;
              padding: 12px;
              color: white;
              outline: none;
            "/>
          </div>
          <div>
            <label style="display: block; color: rgba(255,255,255,0.8); margin-bottom: 8px;">Category</label>
            <select id="memory-category-select" style="
              width: 100%;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 8px;
              padding: 12px;
              color: white;
              outline: none;
            ">
              <option value="family" ${memory.category === 'family' ? 'selected' : ''}>👨‍👩‍👧‍👦 Family</option>
              <option value="friends" ${memory.category === 'friends' ? 'selected' : ''}>👥 Friends</option>
              <option value="travel" ${memory.category === 'travel' ? 'selected' : ''}>✈️ Travel</option>
              <option value="celebration" ${memory.category === 'celebration' ? 'selected' : ''}>🎉 Celebrations</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="tab-content" data-tab-content="media" style="display: none;">
        <p style="color: rgba(255,255,255,0.6);">Media management coming soon...</p>
      </div>
      
      <div class="tab-content" data-tab-content="people" style="display: none;">
        <p style="color: rgba(255,255,255,0.6);">People connections coming soon...</p>
      </div>
    </div>
  `;

  const container = document.createElement('div');
  container.appendChild(overlay);
  container.appendChild(content);
  
  return container;
}

/**
 * Setup modal event handlers to prevent bubbling and handle interactions
 * @param {HTMLElement} modal - The modal element
 * @param {Object} memory - The memory object
 */
function setupModalEventHandlers(modal, memory) {
  // Prevent modal from closing when clicking inside content
  const content = modal.querySelector('.memory-detail-content');
  if (content) {
    content.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent bubbling to overlay
    });
  }

  // Close modal when clicking overlay
  const overlay = modal.querySelector('.memory-detail-overlay');
  if (overlay) {
    overlay.addEventListener('click', () => {
      closeModal(modal);
    });
  }

  // Close button
  const closeBtn = modal.querySelector('.modal-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal(modal);
    });
  }

  // Save button
  const saveBtn = modal.querySelector('.modal-save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      saveMemoryChanges(modal, memory);
    });
  }

  // Delete button
  const deleteBtn = modal.querySelector('.modal-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      confirmDeleteMemory(modal, memory);
    });
  }

  // Tab switching
  const tabBtns = modal.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      switchTab(modal, btn.dataset.tab);
    });
  });

  // Escape key to close
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal(modal);
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

/**
 * Close the modal and restore Emma orb
 * @param {HTMLElement} modal - The modal to close
 */
function closeModal(modal) {
  console.log('🎪 MODAL: Closing modal');
  
  // Restore Emma orb
  const emmaOrb = document.getElementById('universal-emma-orb');
  if (emmaOrb) {
    emmaOrb.style.display = 'block';
  }

  // Remove modal from DOM
  if (modal && modal.parentNode) {
    modal.remove();
  }

  // Clear references
  window.currentMemory = null;
}

/**
 * Switch between tabs in the modal
 * @param {HTMLElement} modal - The modal element
 * @param {string} tabName - The tab to switch to
 */
function switchTab(modal, tabName) {
  // Update tab buttons
  const tabBtns = modal.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
      btn.style.color = 'white';
      btn.style.borderBottom = '2px solid #f093fb';
    } else {
      btn.classList.remove('active');
      btn.style.color = 'rgba(255,255,255,0.6)';
      btn.style.borderBottom = '2px solid transparent';
    }
  });

  // Update tab content
  const tabContents = modal.querySelectorAll('.tab-content');
  tabContents.forEach(content => {
    if (content.dataset.tabContent === tabName) {
      content.style.display = 'block';
      content.classList.add('active');
    } else {
      content.style.display = 'none';
      content.classList.remove('active');
    }
  });
}

/**
 * Save memory changes back to vault
 * @param {HTMLElement} modal - The modal element
 * @param {Object} memory - The memory object
 */
function saveMemoryChanges(modal, memory) {
  console.log('💾 MODAL: Saving memory changes');
  
  try {
    // Get form values
    const titleInput = modal.querySelector('#memory-title-input');
    const contentTextarea = modal.querySelector('#memory-content-textarea');
    const dateInput = modal.querySelector('#memory-date-input');
    const categorySelect = modal.querySelector('#memory-category-select');

    // Update memory object
    if (titleInput) memory.title = titleInput.value;
    if (contentTextarea) memory.content = contentTextarea.value;
    if (dateInput) memory.date = new Date(dateInput.value);
    if (categorySelect) memory.category = categorySelect.value;

    // Save to vault if available
    if (window.emmaWebVault) {
      window.emmaWebVault.updateMemory(memory.id, memory);
      console.log('✅ MODAL: Memory saved to vault');
    }

    // Re-render gallery
    if (window.memoryGallery && window.memoryGallery.renderMemories) {
      window.memoryGallery.renderMemories();
    }

    // Show save feedback
    const saveBtn = modal.querySelector('.modal-save-btn');
    if (saveBtn) {
      const originalText = saveBtn.innerHTML;
      saveBtn.innerHTML = '✅ Saved!';
      saveBtn.style.background = 'rgba(34, 197, 94, 0.8)';
      setTimeout(() => {
        saveBtn.innerHTML = originalText;
        saveBtn.style.background = 'linear-gradient(135deg, #8658ff, #f093fb)';
      }, 2000);
    }

  } catch (error) {
    console.error('❌ MODAL: Error saving memory:', error);
  }
}

/**
 * Confirm and delete memory
 * @param {HTMLElement} modal - The modal element
 * @param {Object} memory - The memory object
 */
function confirmDeleteMemory(modal, memory) {
  if (confirm('Are you sure you want to delete this memory? This action cannot be undone.')) {
    try {
      // Remove from vault if available
      if (window.emmaWebVault) {
        window.emmaWebVault.deleteMemory(memory.id);
        console.log('🗑️ MODAL: Memory deleted from vault');
      }

      // Re-render gallery
      if (window.memoryGallery && window.memoryGallery.renderMemories) {
        window.memoryGallery.renderMemories();
      }

      // Close modal
      closeModal(modal);

    } catch (error) {
      console.error('❌ MODAL: Error deleting memory:', error);
    }
  }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Add CSS for fade-in animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  
  .memory-modal .memory-detail-content {
    animation: fadeIn 0.3s ease;
  }
`;
document.head.appendChild(style);

console.log('🎪 Memory Detail Modal: Loaded and ready - beautiful Emma-branded modals! ✨');
