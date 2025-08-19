// memories-gallery.js - External JavaScript for memory capsule gallery

console.log('🧠 Emma Memory Gallery loading...');

let allMemories = [];
let isLoading = false;

// Load memories and stats
async function loadMemories() {
  if (isLoading) return;
  isLoading = true;
  
  const container = document.getElementById('memories-container');
  const errorContainer = document.getElementById('error-container');
  const statsBar = document.getElementById('stats-bar');
  
  console.log('Loading memories from vault...');
  
  try {
    // Show loading state
    container.innerHTML = `
      <div class="loading-capsules">
        <div class="loading-capsule"></div>
        <div class="loading-capsule"></div>
        <div class="loading-capsule"></div>
        <div class="loading-capsule"></div>
      </div>
    `;
    
    // Try vault first
    const [vaultList, vaultStats] = await Promise.all([
      sendMessage({ action: 'vault.listCapsules', limit: 200 }),
      sendMessage({ action: 'vault.stats' })
    ]);
    
    console.log('Vault list response:', vaultList);
    console.log('Vault stats response:', vaultStats);
    
    // Update stats
    if (vaultStats && vaultStats.success) {
      updateStats(vaultStats);
      statsBar.style.display = 'block';
    }
    
    // Handle memories
    if (vaultList && vaultList.success && vaultList.items) {
      // Map vault headers to gallery format and fetch attachments
      allMemories = await Promise.all(vaultList.items.map(async h => {
        const memory = {
          id: h.id,
          content: h.title || '(Encrypted)',
          timestamp: h.ts || Date.now(),
          role: h.role || 'assistant',
          source: h.source || 'unknown',
          attachments: []
        };
        
        // Fetch attachments for this memory
        try {
          const attachmentsResponse = await sendMessage({ 
            action: 'attachment.list', 
            capsuleId: h.id 
          });
          if (attachmentsResponse && attachmentsResponse.success) {
            memory.attachments = attachmentsResponse.items || [];
            console.log(`Memory ${h.id}: Found ${memory.attachments.length} attachments`);
          }
        } catch (error) {
          console.warn(`Failed to fetch attachments for memory ${h.id}:`, error);
        }
        
        return memory;
      }));
      console.log(`Vault: Found ${allMemories.length} memories`);
      
      if (allMemories.length > 0) {
        displayMemories(allMemories);
      } else {
        // Vault empty: fall back to legacy and chrome storage
        console.warn('Vault empty, falling back to legacy sources');
        const memoriesResponse = await sendMessage({ action: 'getAllMemories' });
        if (memoriesResponse && memoriesResponse.memories && memoriesResponse.memories.length > 0) {
          allMemories = memoriesResponse.memories;
          displayMemories(allMemories);
        } else {
          // chrome.storage.local fallback
          const result = await chrome.storage.local.get(['emma_memories']);
          const memories = result.emma_memories || [];
          if (memories.length > 0) {
            allMemories = memories;
            displayMemories(allMemories);
          } else {
            showEmptyState();
          }
        }
      }
    } else {
      console.warn('Vault not available or locked, falling back to background: getAllMemories');
      const memoriesResponse = await sendMessage({ action: 'getAllMemories' });
      if (memoriesResponse && memoriesResponse.memories) {
        // Add empty attachments array for legacy memories
        allMemories = memoriesResponse.memories.map(memory => ({
          ...memory,
          attachments: memory.attachments || []
        }));
        if (allMemories.length > 0) {
          displayMemories(allMemories);
        } else {
          throw new Error('No memories available');
        }
      } else {
        throw new Error('Failed to load memories: Invalid response format');
      }
    }
    
  } catch (error) {
    console.error('Failed to load memories from background, trying localStorage fallback:', error);
    
    // Try chrome.storage.local fallback
    try {
      console.log('Trying chrome.storage.local fallback...');
      const result = await chrome.storage.local.get(['emma_memories']);
      const memories = result.emma_memories || [];
      
      console.log(`Found ${memories.length} memories in chrome.storage.local fallback`);
      
      if (memories.length > 0) {
        // Add empty attachments array for legacy memories
        allMemories = memories.map(memory => ({
          ...memory,
          attachments: memory.attachments || []
        }));
        displayMemories(allMemories);
        
        // Show fallback notice
        errorContainer.innerHTML = `
          <div class="info-capsule" style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3);">
            <h3 style="color: #3b82f6;">📱 Using Chrome Storage</h3>
            <p>Memories loaded from chrome storage (background database unavailable)</p>
          </div>
        `;
      } else {
        // Try localStorage as final fallback
        console.log('No memories in chrome.storage.local, trying localStorage...');
        const localMemories = localStorage.getItem('emma_memories');
        if (localMemories) {
          const localMems = JSON.parse(localMemories);
          if (localMems.length > 0) {
            // Add empty attachments array for legacy memories
            allMemories = localMems.map(memory => ({
              ...memory,
              attachments: memory.attachments || []
            }));
            displayMemories(allMemories);
            errorContainer.innerHTML = `
              <div class="info-capsule" style="background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3);">
                <h3 style="color: #f59e0b;">⚠️ Using Domain-Specific Storage</h3>
                <p>Memories found only in domain localStorage</p>
              </div>
            `;
          } else {
            showEmptyState();
          }
        } else {
          showEmptyState();
        }
      }
    } catch (storageError) {
      console.error('Failed to load from chrome.storage.local:', storageError);
      errorContainer.innerHTML = `
        <div class="error-capsule">
          <h3>Failed to load memories</h3>
          <p>All storage methods failed: ${error.message}</p>
          <button onclick="loadMemories()" class="btn" style="margin-top: 16px;">Try Again</button>
        </div>
      `;
      container.innerHTML = '';
    }
  } finally {
    isLoading = false;
  }
}

// Send message to background script
function sendMessage(message) {
  return new Promise((resolve, reject) => {
    if (!chrome || !chrome.runtime) {
      reject(new Error('Chrome runtime not available'));
      return;
    }
    
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// Update stats display
function updateStats(stats) {
  document.getElementById('total-count').textContent = stats.totalMemories || 0;
  document.getElementById('today-count').textContent = stats.todayCount || 0;
  
  const storage = stats.storageUsed || 0;
  const storageText = storage < 1024 * 1024 
    ? `${Math.round(storage / 1024)} KB`
    : `${Math.round(storage / (1024 * 1024))} MB`;
  document.getElementById('storage-size').textContent = storageText;
}

// Display memories as capsules
function displayMemories(memories) {
  const container = document.getElementById('memories-container');
  
  const capsules = memories
    .sort((a, b) => b.timestamp - a.timestamp) // Newest first
    .map(memory => createMemoryCapsule(memory))
    .join('');
  
  container.innerHTML = `<div class="memory-gallery">${capsules}</div>`;
  
  // Add click handlers
  container.querySelectorAll('.memory-capsule').forEach(capsule => {
    capsule.addEventListener('click', () => {
      const memoryId = capsule.dataset.id;
      openMemoryDetails(memoryId);
    });
  });
}

// Create individual memory capsule HTML
function createMemoryCapsule(memory) {
  const timeAgo = getTimeAgo(new Date(memory.timestamp));
  const contentLength = memory.content ? memory.content.length : 0;
  const preview = memory.content ? escapeHtml(memory.content.substring(0, 200)) : 'No content';
  const hasAttachments = memory.attachments && memory.attachments.length > 0;
  
  // Create media preview if there are attachments
  let mediaPreview = '';
  if (hasAttachments) {
    const imageAttachments = memory.attachments.filter(att => att.type === 'image');
    const videoAttachments = memory.attachments.filter(att => att.type === 'video');
    
    if (imageAttachments.length > 0) {
      // Show first few images as thumbnails
      const displayImages = imageAttachments.slice(0, 3);
      mediaPreview = `
        <div class="memory-media-preview">
          <div class="media-thumbnails">
            ${displayImages.map(img => `
              <div class="media-thumbnail image-thumbnail" data-attachment-id="${img.id}">
                <div class="thumbnail-placeholder">🖼️</div>
                <div class="thumbnail-overlay">
                  <span class="media-type">IMG</span>
                </div>
              </div>
            `).join('')}
            ${memory.attachments.length > 3 ? `
              <div class="media-thumbnail more-indicator">
                <span class="more-count">+${memory.attachments.length - 3}</span>
              </div>
            ` : ''}
          </div>
          <div class="media-info">
            <span class="media-count">${memory.attachments.length} attachment${memory.attachments.length !== 1 ? 's' : ''}</span>
            ${imageAttachments.length > 0 ? `<span class="media-types">📷 ${imageAttachments.length} image${imageAttachments.length !== 1 ? 's' : ''}</span>` : ''}
            ${videoAttachments.length > 0 ? `<span class="media-types">🎥 ${videoAttachments.length} video${videoAttachments.length !== 1 ? 's' : ''}</span>` : ''}
          </div>
        </div>
      `;
    } else if (videoAttachments.length > 0) {
      // Show video thumbnails
      mediaPreview = `
        <div class="memory-media-preview">
          <div class="media-thumbnails">
            ${videoAttachments.slice(0, 3).map(vid => `
              <div class="media-thumbnail video-thumbnail" data-attachment-id="${vid.id}">
                <div class="thumbnail-placeholder">🎥</div>
                <div class="thumbnail-overlay">
                  <span class="media-type">VID</span>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="media-info">
            <span class="media-count">${memory.attachments.length} attachment${memory.attachments.length !== 1 ? 's' : ''}</span>
            <span class="media-types">🎥 ${videoAttachments.length} video${videoAttachments.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      `;
    }
  }
  
  return `
    <div class="memory-capsule ${hasAttachments ? 'has-media' : ''}" data-id="${memory.id}">
      <div class="memory-header">
        <div class="memory-source ${memory.source || 'unknown'}">
          ${getSourceName(memory.source)}
        </div>
        <div class="memory-role ${memory.role || 'user'}">${memory.role || 'user'}</div>
      </div>
      
      ${hasAttachments ? mediaPreview : `
        <div class="memory-content">
          ${preview}${contentLength > 200 ? '...' : ''}
        </div>
      `}
      
      <div class="memory-meta">
        <div class="memory-time">${timeAgo}</div>
        <div class="memory-length">
          ${hasAttachments ? 
            `${memory.attachments.length} media item${memory.attachments.length !== 1 ? 's' : ''}` : 
            `${contentLength} chars`
          }
        </div>
      </div>
    </div>
  `;
}

// Get friendly source name
function getSourceName(source) {
  const sourceMap = {
    'claude': 'Claude',
    'chatgpt': 'ChatGPT',
    'selection': 'Text Selection',
    'test': 'Test Data'
  };
  return sourceMap[source] || 'Unknown';
}

// Show empty state
function showEmptyState() {
  const container = document.getElementById('memories-container');
  container.innerHTML = `
    <div class="empty-gallery">
      <div class="empty-gallery-icon">🌌</div>
      <h3>No memory capsules yet</h3>
      <p style="color: var(--emma-text-secondary); margin-bottom: 24px;">
        Start capturing conversations to see your memories here.
      </p>
      <button onclick="window.close()" class="btn">Back to Extension</button>
    </div>
  `;
}

// Open memory details with proper modal functionality
function openMemoryDetails(memoryId) {
  const memory = allMemories.find(m => m.id == memoryId);
  if (!memory) return;
  
  // Create modal backdrop
  const modal = document.createElement('div');
  modal.className = 'memory-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    backdrop-filter: blur(4px);
    animation: fadeIn 0.3s ease;
  `;
  
  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'memory-modal-content';
  modalContent.style.cssText = `
    background: var(--emma-dark);
    border: 1px solid var(--emma-border);
    border-radius: 16px;
    padding: 32px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    animation: slideIn 0.3s ease;
  `;
  
  // Create close button
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.style.cssText = `
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(255,255,255,0.1);
    border: none;
    color: var(--emma-text);
    font-size: 24px;
    cursor: pointer;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  `;
  
  // Close button hover effect
  closeButton.addEventListener('mouseenter', () => {
    closeButton.style.background = 'rgba(239, 68, 68, 0.3)';
    closeButton.style.transform = 'scale(1.1)';
  });
  
  closeButton.addEventListener('mouseleave', () => {
    closeButton.style.background = 'rgba(255,255,255,0.1)';
    closeButton.style.transform = 'scale(1)';
  });
  
  // Modal content HTML
  modalContent.innerHTML = `
    <h3 style="color: var(--emma-purple); margin-bottom: 16px; padding-right: 40px;">
      ${getSourceName(memory.source)} Memory
    </h3>
    
    <div style="
      background: rgba(118, 75, 162, 0.1);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      white-space: pre-wrap;
      line-height: 1.6;
      color: var(--emma-text);
      border: 1px solid rgba(118, 75, 162, 0.2);
    ">${escapeHtml(memory.content)}</div>
    
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      color: var(--emma-text-secondary);
      padding-top: 16px;
      border-top: 1px solid var(--emma-border);
    ">
      <span style="
        background: rgba(118, 75, 162, 0.2);
        padding: 4px 8px;
        border-radius: 4px;
        color: var(--emma-purple);
        font-weight: 600;
      ">Role: ${memory.role}</span>
      <span>${new Date(memory.timestamp).toLocaleString()}</span>
    </div>
  `;
  
  // Add close button to modal content
  modalContent.appendChild(closeButton);
  
  // Add content to modal
  modal.appendChild(modalContent);
  
  // Close functions
  function closeModal() {
    modal.style.animation = 'fadeOut 0.3s ease';
    modalContent.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 300);
  }
  
  // Close button click
  closeButton.addEventListener('click', (e) => {
    e.stopPropagation();
    closeModal();
  });
  
  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // Escape key to close
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  // Prevent content clicks from closing modal
  modalContent.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  // Add animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
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
    
    @keyframes slideOut {
      from { 
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to { 
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
      }
    }
  `;
  
  if (!document.querySelector('style[data-modal-animations]')) {
    style.setAttribute('data-modal-animations', 'true');
    document.head.appendChild(style);
  }
  
  // Add to body
  document.body.appendChild(modal);
  
  // Focus management
  closeButton.focus();
}

// Utility functions
function getTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, starting memory gallery...');
  loadMemories();
});

// Export for debugging
window.memoryGallery = {
  loadMemories,
  allMemories: () => allMemories,
  sendMessage
};

console.log('🧠 Emma Memory Gallery script loaded');