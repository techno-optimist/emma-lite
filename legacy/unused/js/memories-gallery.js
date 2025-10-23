// Memory Gallery - Capsule style based on Components/Memories design
console.log('🎯 Memory Gallery: Script loading...');

// State management
let allMemories = [];
let filteredMemories = [];
let isLoading = true;

// Category colors mapping
const categoryColors = {
  'Family': 'bg-blue-100 text-blue-800',
  'Friends': 'bg-green-100 text-green-800', 
  'Travel': 'bg-purple-100 text-purple-800',
  'Celebration': 'bg-pink-100 text-pink-800',
  'Achievement': 'bg-yellow-100 text-yellow-800',
  'Daily Life': 'bg-gray-100 text-gray-800',
  'Other': 'bg-indigo-100 text-indigo-800'
};

// DOM Elements
const elements = {};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎯 Memory Gallery: DOM Content Loaded');
  
  // Get DOM elements
  elements.searchInput = document.getElementById('search-input');
  elements.categoryFilter = document.getElementById('category-filter');
  elements.memoryGrid = document.getElementById('memory-grid');
  elements.emptyState = document.getElementById('empty-state');
  elements.createMemoryBtn = document.getElementById('create-memory-btn');
  elements.emptyCreateBtn = document.getElementById('empty-create-btn');
  elements.backBtn = document.getElementById('back-btn');
  elements.filteredCount = document.getElementById('filtered-count');
  elements.totalCount = document.getElementById('total-count');
  elements.emptyMessageText = document.getElementById('empty-message-text');
  
  // Attach event listeners
  attachEventListeners();
  
  // Load memories
  await loadMemories();
});

// Attach event listeners
function attachEventListeners() {
  console.log('🎯 Memory Gallery: Attaching event listeners...');
  
  // Search input
  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', handleSearch);
  }
  
  // Category filter
  if (elements.categoryFilter) {
    elements.categoryFilter.addEventListener('change', handleCategoryFilter);
  }
  
  // Back button
  if (elements.backBtn) {
    elements.backBtn.addEventListener('click', () => {
      try { window.location.href = 'popup.html'; } catch {}
    });
  }
  
  // Create memory buttons
  if (elements.createMemoryBtn) {
    elements.createMemoryBtn.addEventListener('click', handleCreateMemory);
  }
  if (elements.emptyCreateBtn) {
    elements.emptyCreateBtn.addEventListener('click', handleCreateMemory);
  }
  
  console.log('🎯 Memory Gallery: Event listeners attached');
}

// Load memories from background script
async function loadMemories() {
  console.log('🎯 Memory Gallery: Loading memories...');
  
  try {
    isLoading = true;
    showLoadingState();
    
    const response = await chrome.runtime.sendMessage({ 
      action: 'getAllMemories',
      limit: 1000
    });
    
    console.log('🎯 Memory Gallery: Memories response:', response);
    
    if (response && response.success && response.memories) {
      allMemories = response.memories;
      console.log(`🎯 Memory Gallery: Loaded ${allMemories.length} memories`);
    } else {
      console.warn('🎯 Memory Gallery: Invalid response:', response);
      allMemories = [];
    }
    
    isLoading = false;
    applyFilters();
    
  } catch (error) {
    console.error('🎯 Memory Gallery: Failed to load memories:', error);
    isLoading = false;
    allMemories = [];
    applyFilters();
  }
}

// Apply current filters
function applyFilters() {
  const searchTerm = elements.searchInput?.value.toLowerCase() || '';
  const selectedCategory = elements.categoryFilter?.value || 'All';
  
  filteredMemories = allMemories.filter(memory => {
    // Search filter
    const matchesSearch = !searchTerm || 
      memory.content?.toLowerCase().includes(searchTerm) ||
      memory.title?.toLowerCase().includes(searchTerm) ||
      memory.description?.toLowerCase().includes(searchTerm);
    
    // Category filter
    const matchesCategory = selectedCategory === 'All' || 
      memory.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  updateResultsCount();
  displayMemories();
}

// Handle search input
function handleSearch() {
  console.log('🎯 Memory Gallery: Search triggered');
  applyFilters();
}

// Handle category filter
function handleCategoryFilter() {
  console.log('🎯 Memory Gallery: Category filter triggered');
  applyFilters();
}

// Update results count
function updateResultsCount() {
  if (elements.filteredCount) {
    elements.filteredCount.textContent = filteredMemories.length;
  }
  if (elements.totalCount) {
    elements.totalCount.textContent = allMemories.length;
  }
  
  // Update empty message based on filters
  if (elements.emptyMessageText) {
    const searchTerm = elements.searchInput?.value || '';
    const selectedCategory = elements.categoryFilter?.value || 'All';
    
    if (searchTerm || selectedCategory !== 'All') {
      elements.emptyMessageText.textContent = 'Try adjusting your search or filter criteria';
    } else {
      elements.emptyMessageText.textContent = 'Start creating your first memory capsule';
    }
  }
}

// Show loading state
function showLoadingState() {
  if (elements.memoryGrid) {
    elements.memoryGrid.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading your memories...</p>
      </div>
    `;
  }
  
  if (elements.emptyState) {
    elements.emptyState.classList.add('hidden');
  }
}

// Display memories
function displayMemories() {
  console.log(`🎯 Memory Gallery: Displaying ${filteredMemories.length} memories`);
  
  if (filteredMemories.length === 0) {
    showEmptyState();
    return;
  }
  
  // Hide empty state
  if (elements.emptyState) {
    elements.emptyState.classList.add('hidden');
  }
  
  // Create memory cards
  const memoryCards = filteredMemories.map(memory => createMemoryCard(memory)).join('');
  
  if (elements.memoryGrid) {
    elements.memoryGrid.innerHTML = memoryCards;
  }
  
  // Attach click listeners to memory cards
  attachMemoryCardListeners();
}

// Show empty state
function showEmptyState() {
  if (elements.memoryGrid) {
    elements.memoryGrid.innerHTML = '';
  }
  
  if (elements.emptyState) {
    elements.emptyState.classList.remove('hidden');
  }
}

// Create memory card HTML
function createMemoryCard(memory) {
  const category = memory.category || 'Other';
  const title = memory.title || 'Untitled Memory';
  const description = memory.description || memory.content || 'No description available';
  const date = formatDate(memory.timestamp || memory.created_at || Date.now());
  const mediaCount = memory.media_count || 0;
  
  return `
    <div class="memory-card" data-memory-id="${memory.id}">
      <div class="memory-card-header">
        <div class="memory-category">${category}</div>
        <div class="memory-actions">
          <button class="memory-action-btn" data-action="view" title="View memory">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button class="memory-action-btn" data-action="delete" title="Delete memory">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3,6 5,6 21,6"/>
              <path d="m19,6v14a2,2 0 0 1-2,2H7a2,2 0 0 1-2-2V6m3,0V4a2,2 0 0 1,2-2h4a2,2 0 0 1,2,2v2"/>
            </svg>
          </button>
        </div>
        <div class="memory-icon">💝</div>
      </div>
      
      <div class="memory-card-content">
        <h3 class="memory-title">${escapeHtml(title)}</h3>
        <p class="memory-description">${escapeHtml(truncateText(description, 120))}</p>
        <div class="memory-meta">
          <span>${date}</span>
          <span>${mediaCount} media</span>
        </div>
      </div>
    </div>
  `;
}

// Attach click listeners to memory cards
function attachMemoryCardListeners() {
  // Memory card clicks
  const memoryCards = document.querySelectorAll('.memory-card');
  memoryCards.forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't trigger if clicking on action buttons
      if (!e.target.closest('.memory-action-btn')) {
        const memoryId = card.dataset.memoryId;
        handleMemoryClick(memoryId);
      }
    });
  });
  
  // Action button clicks
  const actionBtns = document.querySelectorAll('.memory-action-btn');
  actionBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const memoryCard = btn.closest('.memory-card');
      const memoryId = memoryCard?.dataset.memoryId;
      
      if (action === 'view') {
        handleMemoryClick(memoryId);
      } else if (action === 'delete') {
        handleDeleteMemory(memoryId);
      }
    });
  });
}

// Handle memory card click
function handleMemoryClick(memoryId) {
  console.log('🎯 Memory Gallery: Memory clicked:', memoryId);
  // TODO: Open memory detail modal or navigate to detail page
  showNotification('Memory detail view coming soon!');
}

// Handle delete memory
async function handleDeleteMemory(memoryId) {
  const confirmed = await window.emmaConfirm('Would you like to put this memory away?', {
    title: 'Memory Management',
    helpText: 'This will remove the memory from your collection.',
    confirmText: 'Yes, Remove It',
    cancelText: 'Keep It',
    isDestructive: true
  });
  if (!confirmed) {
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'deleteMemory',
      id: memoryId
    });
    
    if (response && response.success) {
      showNotification('Memory deleted successfully');
      await loadMemories(); // Reload memories
    } else {
      showNotification('Failed to delete memory', 'error');
    }
  } catch (error) {
    console.error('🎯 Memory Gallery: Delete failed:', error);
    showNotification('Failed to delete memory', 'error');
  }
}

// Handle create memory
function handleCreateMemory() {
  console.log('🎯 Memory Gallery: Create memory clicked');
  // TODO: Open create memory wizard
  showNotification('Create memory wizard coming soon!');
}

// Utility Functions

// Format date
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Truncate text
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

// Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show notification
function showNotification(message, type = 'info') {
  console.log(`🎯 Memory Gallery: ${type.toUpperCase()}: ${message}`);
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? 'var(--emma-error)' : 'var(--emma-success)'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    font-size: 14px;
    font-weight: 500;
    animation: slideInRight 0.3s ease;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

console.log('🎯 Memory Gallery: Script loaded successfully');