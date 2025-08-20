/**
 * Beautiful Memory Gallery - Honoring precious moments
 * Created with love for those living with dementia and their families
 */

console.log('💝 Beautiful Memory Gallery: Loading...');

// Global state
let memories = [];
let currentFilter = 'all';
let isLoading = true;

// REMOVED: Demo memories - only use vault storage from now on

/**
 * Initialize the gallery
 */
function initializeGallery() {
  console.log('💝 GALLERY: Initializing beautiful memory gallery');
  
  // Debug: Check what Emma API methods are available
  if (window.emmaAPI) {
    console.log('💝 GALLERY: Emma API available, methods:', Object.keys(window.emmaAPI));
    if (window.emmaAPI.vault) {
      console.log('💝 GALLERY: Vault API methods:', Object.keys(window.emmaAPI.vault));
    }
    if (window.emmaAPI.memory) {
      console.log('💝 GALLERY: Memory API methods:', Object.keys(window.emmaAPI.memory));
    }
    if (window.emmaAPI.storage) {
      console.log('💝 GALLERY: Storage API methods:', Object.keys(window.emmaAPI.storage));
    }
  } else {
    console.log('💝 GALLERY: No Emma API available - will use sample data');
  }
  
  // Set up event listeners
  setupEventListeners();
  
  // Wait for extension communication to complete before loading memories
  if (window.emmaWebVault && window.emmaWebVault.extensionAvailable) {
    console.log('💝 GALLERY: Extension already detected - loading memories');
    loadMemories();
  } else {
    console.log('💝 GALLERY: Waiting for extension detection...');
    // Listen for extension ready event
    window.addEventListener('extension-vault-ready', () => {
      console.log('💝 GALLERY: Extension vault ready - now loading memories');
      loadMemories();
    });
    
    // Also try loading after a delay in case extension is detected
    setTimeout(() => {
      if (window.emmaWebVault && window.emmaWebVault.extensionAvailable) {
        console.log('💝 GALLERY: Extension detected after delay - loading memories');
        loadMemories();
      }
    }, 2000);
  }

  // Clean, professional gallery initialization
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
  console.log('💝 GALLERY: Setting up simple event listeners');
  // No extra buttons to wire up - just memory cards
}

/**
 * Refresh gallery (can be called externally)
 */
window.refreshMemoryGallery = function() {
  console.log('🔄 GALLERY: External refresh requested');
  loadMemories();
};

/**
 * Load memories from vault storage
 */
async function loadMemories() {
  console.log('💝 GALLERY: Loading memories from vault...');
  
  try {
    // Try to get memories from .emma vault first
    let vaultMemories = [];
    
    // Check if we have the web vault available
    if (window.emmaWebVault) {
      console.log('💝 GALLERY: Checking extension availability:', window.emmaWebVault.extensionAvailable);
      
      if (window.emmaWebVault.extensionAvailable) {
        console.log('💝 GALLERY: Loading from extension vault...');
        try {
          vaultMemories = await window.emmaWebVault.listMemories(1000, 0);
          console.log('💝 GALLERY: Extension vault result:', vaultMemories);
          
          // DEBUG: Log each memory to identify the issue
          vaultMemories.forEach((mem, idx) => {
            console.log(`📝 MEMORY ${idx + 1}:`, {
              id: mem.id,
              title: mem.metadata?.title || mem.title || 'No title',
              hasContent: !!mem.content,
              hasAttachments: !!(mem.attachments && mem.attachments.length > 0),
              attachmentCount: mem.attachments?.length || 0,
              created: mem.created
            });
          });
        } catch (vaultError) {
          console.error('💝 GALLERY: .emma vault error:', vaultError);
        }
      } else {
        console.log('💝 GALLERY: Vault not open - cannot load memories');
      }
    }
    
    // Fallback to old API if no web vault
    if (vaultMemories.length === 0 && window.emmaAPI) {
      // Try memories.getAll as fallback (old API method)
      if (window.emmaAPI.memories && window.emmaAPI.memories.getAll) {
        console.log('💝 GALLERY: Trying old API memories.getAll()');
        const vaultResult = await window.emmaAPI.memories.getAll({ limit: 1000, offset: 0 });
        console.log('💝 GALLERY: Old API result:', vaultResult);
        
        if (vaultResult && Array.isArray(vaultResult)) {
          vaultMemories = vaultResult;
        } else if (vaultResult && vaultResult.memories && Array.isArray(vaultResult.memories)) {
          vaultMemories = vaultResult.memories;
        }
      }
    }
    
    // Transform vault memories to our format
    if (vaultMemories.length > 0) {
      console.log(`💝 GALLERY: Found ${vaultMemories.length} vault memories`);
      memories = await Promise.all(vaultMemories.map(async (memory, index) => {
        // Convert vault attachments to mediaItems format
        const attachments = memory.attachments || [];
        console.log(`📷 GALLERY: Memory "${memory.metadata?.title || memory.id}" has ${attachments.length} attachments`);
        
        // Ensure media items are properly formatted and reconstruct URLs
        const mediaItems = await Promise.all(attachments.map(async (item) => {
          // If the item has a dataUrl but no url, use dataUrl as url
          if (item.dataUrl && !item.url) {
            item.url = item.dataUrl;
            return item;
          }
          
          // CRITICAL FIX: If item has vaultId but no URL, fetch thumbnail from vault
          if (!item.url && !item.dataUrl && item.vaultId && item.isPersisted) {
            console.log('📷 MEDIA: Reconstructing URL for vaultId:', item.vaultId, 'memoryId:', memory.id);
            try {
              // Fetch attachment metadata from vault to get thumbnail
              if (window.emmaAPI && window.emmaAPI.attachments && window.emmaAPI.attachments.list) {
                const attachmentsList = await window.emmaAPI.attachments.list({ memoryId: memory.id });
                if (attachmentsList && attachmentsList.success && attachmentsList.items) {
                  const attachment = attachmentsList.items.find(att => att.id === item.vaultId);
                  if (attachment && attachment.thumb) {
                    // Use thumbnail for display
                    const thumbnailDataUrl = `data:image/jpeg;base64,${attachment.thumb}`;
                    item.url = thumbnailDataUrl;
                    console.log('📷 MEDIA: Reconstructed thumbnail URL for', item.name);
                  } else {
                    console.warn('📷 MEDIA: No thumbnail found in vault for', item.name);
                    item.url = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2U8L3RleHQ+PC9zdmc+';
                  }
                } else {
                  console.warn('📷 MEDIA: Failed to fetch attachments list for memory:', memory.id);
                  item.url = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2U8L3RleHQ+PC9zdmc+';
                }
              } else {
                console.warn('📷 MEDIA: No attachment API available for reconstruction');
                item.url = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2U8L3RleHQ+PC9zdmc+';
              }
            } catch (error) {
              console.error('📷 MEDIA: Failed to reconstruct URL for vaultId:', item.vaultId, error);
              // Use placeholder on error
              item.url = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+RXJyb3I8L3RleHQ+PC9zdmc+';
            }
          }
          
          return item;
        }));

        return {
          id: memory.id || `vault_${index}`,
          title: memory.metadata?.title || memory.title || memory.subject || memory.summary || `Memory ${index + 1}`,
          excerpt: memory.content || memory.description || 'A precious memory...',
          content: memory.content || memory.description || memory.details || 'This memory is precious to you.',
          category: memory.metadata?.category || memory.category || memory.type || 'family',
          tags: memory.metadata?.tags || memory.tags || memory.keywords || ['memory'],
          date: memory.created || memory.date || memory.created_at || memory.timestamp || new Date(),
          // FIXED: Use first attachment URL for gallery card preview
          image: (mediaItems.length > 0 && mediaItems[0].url) ? mediaItems[0].url : memory.thumbnail || memory.image || memory.photo || null,
          favorite: memory.favorite || memory.starred || false,
          mediaItems: mediaItems // Preserve media items with URL fixing
        };
      }));
      console.log(`💝 GALLERY: Transformed ${memories.length} memories for display`);
      
      // Debug: Log media items for each memory
      memories.forEach((memory, index) => {
        if (memory.mediaItems && memory.mediaItems.length > 0) {
          console.log(`📷 GALLERY: Memory "${memory.title}" has ${memory.mediaItems.length} media items:`, 
            memory.mediaItems.map(item => ({
              name: item.name,
              hasUrl: !!item.url,
              hasDataUrl: !!item.dataUrl,
              urlPreview: item.url ? item.url.substring(0, 50) + '...' : 'none',
              isPersisted: item.isPersisted,
              vaultId: item.vaultId
            }))
          );
        }
      });
    } else {
      console.log('💝 GALLERY: No vault memories found - checking local storage fallback');
      
      // Check local storage for wizard-created memories
      try {
        const localMemories = JSON.parse(localStorage.getItem('emma_memories') || '[]');
        if (localMemories.length > 0) {
          console.log(`💝 GALLERY: Found ${localMemories.length} local memories`);
          memories = localMemories.map(memory => ({
            id: memory.id || `local-${Date.now()}`,
            title: memory.title || 'Untitled Memory',
            story: memory.story || '',
            responses: memory.responses || [],
            mediaItems: memory.mediaItems || [],
            tags: memory.tags || [],
            createdAt: memory.createdAt || new Date().toISOString(),
            source: 'local'
          }));
        } else {
          console.log('💝 GALLERY: No local memories found either - starting with empty gallery');
          memories = [];
        }
      } catch (localError) {
        console.error('💝 GALLERY: Error loading local memories:', localError);
        memories = [];
      }
    }
    
    // Render immediately 
    setTimeout(() => {
      renderMemories();
    }, 100);
    
  } catch (error) {
    console.error('💝 GALLERY: Error loading vault memories:', error);
    console.log('💝 GALLERY: Starting with empty gallery - vault connection failed');
    memories = [];
    setTimeout(() => {
      renderMemories();
    }, 100);
  }
}

/**
 * Render memories in the grid
 */
function renderMemories() {
  console.log(`💝 GALLERY: Rendering ${memories.length} memories`);
  
  // Handle empty state
  if (memories.length === 0) {
    renderEmptyState();
    return;
  }
  
  const memoriesGrid = document.getElementById('memories-grid');
  
  // Show all memories (no filtering)
  if (memoriesGrid) {
    memoriesGrid.innerHTML = memories.map(memory => createMemoryCard(memory)).join('');
    
    // Add click handlers to cards
    memoriesGrid.querySelectorAll('.memory-card').forEach((card, index) => {
      card.style.pointerEvents = 'auto';
      card.style.zIndex = '999999';
      card.addEventListener('click', () => {
        const memory = memories[index];
        openMemoryDetail(memory);
      });
    });
  }
}

/**
 * Create a beautiful memory card HTML
 */
function createMemoryCard(memory) {
  const date = new Date(memory.date);
  const formattedDate = date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
  
  const categoryIcon = getCategoryIcon(memory.category);
  const favoriteIcon = memory.favorite ? '❤️' : '';
  
  return `
    <div class="memory-card" data-memory-id="${memory.id}">
      <div class="memory-image">
        ${memory.image && memory.image.startsWith('data:') ? `<img src="${memory.image}" alt="${memory.title}">` : `<div class="category-icon">${categoryIcon}</div>`}
      </div>
      <div class="memory-content">
        <h3 class="memory-title">${escapeHtml(memory.title)} ${favoriteIcon}</h3>
        <p class="memory-excerpt">${escapeHtml(cleanExcerptForPreview(memory.excerpt))}</p>
        <div class="memory-meta">
          <div class="memory-date">
            <span>${formattedDate}</span>
          </div>
          <div class="memory-tags">
            ${memory.tags.slice(0, 2).map(tag => `<span class="memory-tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Clean excerpt for preview - remove markdown formatting
 */
function cleanExcerptForPreview(excerpt) {
  if (!excerpt) return '';
  
  // Remove markdown headers (**text**)
  let cleaned = excerpt.replace(/\*\*([^*]+)\*\*/g, '$1');
  
  // Remove section headers like "**The Memory:**"
  cleaned = cleaned.replace(/\*\*[^*]+:\*\*/g, '');
  
  // Remove extra newlines and trim
  cleaned = cleaned.replace(/\n+/g, ' ').trim();
  
  // Limit length for preview
  if (cleaned.length > 150) {
    cleaned = cleaned.substring(0, 150) + '...';
  }
  
  return cleaned;
}

/**
 * Get category icon
 */
function getCategoryIcon(category) {
  const icons = {
    family: '👨‍👩‍👧‍👦',
    friends: '👥',
    travel: '✈️',
    celebration: '🎉',
    daily: '🌅',
    default: '💝'
  };
  return icons[category] || icons.default;
}



/**
 * Open memory detail view
 */
function openMemoryDetail(memory) {
  console.log(`💝 GALLERY: Opening memory detail for: ${memory.title}`);
  
  // FORCE: Temporarily disable Emma orb to avoid z-index conflicts
  const emmaOrb = document.getElementById('universal-emma-orb');
  if (emmaOrb) {
    emmaOrb.style.display = 'none';
    console.log('💝 GALLERY: Temporarily hid Emma orb for modal');
  }
  
  // Create beautiful modal
  const modal = document.createElement('div');
  console.log('💝 GALLERY: Creating modal with z-index 2147483650');
  modal.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    background: rgba(0, 0, 0, 0.8) !important;
    backdrop-filter: blur(8px) !important;
    z-index: 2147483650 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 20px !important;
    animation: fadeIn 0.3s ease !important;
    pointer-events: auto !important;
    visibility: visible !important;
    opacity: 1 !important;
  `;
  
  const date = new Date(memory.date);
  const formattedDate = date.toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  modal.innerHTML = `
    <div class="memory-detail-overlay" style="
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      background: transparent !important;
      z-index: 2147483649 !important;
    "></div>
    <div class="memory-detail-content" style="
      background: linear-gradient(135deg, #1a1033 0%, #2d1b69 50%, #0f0c29 100%) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      border-radius: 24px !important;
      max-width: 900px !important;
      width: 95% !important;
      max-height: 90vh !important;
      overflow: hidden !important;
      position: relative !important;
      box-shadow: 0 20px 60px rgba(118, 75, 162, 0.3) !important;
      z-index: 2147483651 !important;
      pointer-events: auto !important;
      display: flex !important;
      flex-direction: column !important;
    ">
      
      <!-- Header with editable title and actions -->
      <div class="memory-detail-header" style="
        padding: 24px 24px 16px !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        display: flex !important;
        align-items: center !important;
        gap: 16px !important;
      ">
        <input id="memory-title-input" style="
          flex: 1 !important;
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 8px !important;
          padding: 12px 16px !important;
          color: white !important;
          font-size: 18px !important;
          font-weight: 600 !important;
        " value="${escapeHtml(memory.title)}" placeholder="Enter memory title..." />
        
        <div class="memory-header-actions" style="display: flex; align-items: center; gap: 12px;">
          <div id="save-status" class="save-status" style="display: none; color: #4ade80; font-size: 14px;">
            <span id="save-status-text">Saved</span>
          </div>
          <button class="btn" id="memory-delete-btn" style="
            background: linear-gradient(135deg, #ef4444, #dc2626) !important;
            border: none !important;
            color: white !important;
            padding: 10px 16px !important;
            border-radius: 8px !important;
            cursor: pointer !important;
            font-size: 14px !important;
            font-weight: 600 !important;
            transition: all 0.2s ease !important;
          " onmouseover="this.style.background='linear-gradient(135deg, #dc2626, #b91c1c)'" onmouseout="this.style.background='linear-gradient(135deg, #ef4444, #dc2626)'">🗑️ Delete</button>
          <button class="btn" id="memory-save-btn" style="
            background: var(--emma-gradient-1) !important;
            border: none !important;
            color: white !important;
            padding: 10px 16px !important;
            border-radius: 8px !important;
            cursor: pointer !important;
            font-size: 14px !important;
            font-weight: 600 !important;
          ">💾 Save</button>
        </div>
        
        <button class="close-btn" onclick="
          const emmaOrb = document.getElementById('universal-emma-orb');
          if (emmaOrb) {
            emmaOrb.style.display = 'block';
            console.log('💝 GALLERY: Restored Emma orb after modal close');
          }
          this.closest('.memory-modal').remove();
        " style="
          background: none !important;
          border: none !important;
          font-size: 24px !important;
          color: rgba(255, 255, 255, 0.7) !important;
          cursor: pointer !important;
          width: 40px !important;
          height: 40px !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.2s ease !important;
          z-index: 2147483652 !important;
          pointer-events: auto !important;
        " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='none'">×</button>
      </div>

      <!-- Tab Navigation -->
      <div class="memory-tabs" style="
        display: flex !important;
        align-items: center !important;
        padding: 0 24px !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        background: rgba(255, 255, 255, 0.02) !important;
      ">
        <button class="tab-btn active" data-tab="overview" style="
          background: none !important;
          border: none !important;
          color: white !important;
          padding: 16px 20px !important;
          cursor: pointer !important;
          border-bottom: 2px solid transparent !important;
          transition: all 0.2s ease !important;
        ">Overview</button>
        <button class="tab-btn" data-tab="meta" style="
          background: none !important;
          border: none !important;
          color: rgba(255, 255, 255, 0.6) !important;
          padding: 16px 20px !important;
          cursor: pointer !important;
          border-bottom: 2px solid transparent !important;
          transition: all 0.2s ease !important;
        ">Meta</button>
        <button class="tab-btn" data-tab="media" style="
          background: none !important;
          border: none !important;
          color: rgba(255, 255, 255, 0.6) !important;
          padding: 16px 20px !important;
          cursor: pointer !important;
          border-bottom: 2px solid transparent !important;
          transition: all 0.2s ease !important;
        ">Media <span class="tab-count" id="tab-media-count" style="
          background: rgba(118, 75, 162, 0.3) !important;
          color: #f093fb !important;
          padding: 2px 8px !important;
          border-radius: 12px !important;
          font-size: 11px !important;
          margin-left: 4px !important;
        ">0</span></button>
        <button class="tab-btn" data-tab="people" style="
          background: none !important;
          border: none !important;
          color: rgba(255, 255, 255, 0.6) !important;
          padding: 16px 20px !important;
          cursor: pointer !important;
          border-bottom: 2px solid transparent !important;
          transition: all 0.2s ease !important;
        ">People <span class="tab-count" id="tab-people-count" style="
          background: rgba(118, 75, 162, 0.3) !important;
          color: #f093fb !important;
          padding: 2px 8px !important;
          border-radius: 12px !important;
          font-size: 11px !important;
          margin-left: 4px !important;
        ">0</span></button>
        <button class="tab-btn" data-tab="related" style="
          background: none !important;
          border: none !important;
          color: rgba(255, 255, 255, 0.6) !important;
          padding: 16px 20px !important;
          cursor: pointer !important;
          border-bottom: 2px solid transparent !important;
          transition: all 0.2s ease !important;
        ">Related <span class="tab-count" id="tab-related-count" style="
          background: rgba(118, 75, 162, 0.3) !important;
          color: #f093fb !important;
          padding: 2px 8px !important;
          border-radius: 12px !important;
          font-size: 11px !important;
          margin-left: 4px !important;
        ">0</span></button>
        
        <div style="margin-left: auto; padding: 8px 12px;">
          <button class="btn secondary" id="share-memory-btn" style="
            background: rgba(255, 255, 255, 0.1) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            color: white !important;
            padding: 8px 16px !important;
            border-radius: 8px !important;
            cursor: pointer !important;
            font-size: 14px !important;
          ">Share</button>
        </div>
      </div>

      <!-- Tab Content Body -->
      <div class="memory-detail-body" id="memory-detail-body" style="
        flex: 1 !important;
        overflow-y: auto !important;
        padding: 24px !important;
      ">
        <!-- Content will be loaded here based on active tab -->
      </div>
    </div>
  `;
  
  modal.className = 'memory-modal';
  document.body.appendChild(modal);
  
  // Set up tab system
  let activeTab = 'overview';
  const bodyHost = modal.querySelector('#memory-detail-body');
  const tabButtons = Array.from(modal.querySelectorAll('.tab-btn'));
  
  // Tab switching functionality
  function switchTab(tab) {
    activeTab = tab;
    tabButtons.forEach(btn => {
      const isActive = btn.dataset.tab === tab;
      btn.classList.toggle('active', isActive);
      btn.style.color = isActive ? 'white !important' : 'rgba(255, 255, 255, 0.6) !important';
      btn.style.borderBottomColor = isActive ? '#f093fb !important' : 'transparent !important';
    });
    renderTab();
  }
  
  // Add tab click handlers
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  
  // Render tab content
  function renderTab() {
    if (activeTab === 'overview') {
      bodyHost.innerHTML = renderOverview(memory);
      // Initialize slideshow for overview tab
      setTimeout(() => {
        currentSlideIndex = 0;
        goToSlide(0);
        startSlideshow();
      }, 100);
    } else if (activeTab === 'meta') {
      stopSlideshow();
      bodyHost.innerHTML = renderMeta(memory);
    } else if (activeTab === 'media') {
      stopSlideshow();
      bodyHost.innerHTML = renderMedia(memory);
    } else if (activeTab === 'people') {
      stopSlideshow();
      bodyHost.innerHTML = renderPeople(memory);
    } else if (activeTab === 'related') {
      stopSlideshow();
      bodyHost.innerHTML = renderRelated(memory);
    }
  }
  
  // Save functionality
  const saveBtn = modal.querySelector('#memory-save-btn');
  const saveStatus = modal.querySelector('#save-status');
  const saveStatusText = modal.querySelector('#save-status-text');
  const titleInput = modal.querySelector('#memory-title-input');
  
  function showSaveStatus(type, message) {
    if (!saveStatus || !saveStatusText) return;
    saveStatus.style.display = 'inline-flex';
    saveStatus.style.color = type === 'saved' ? '#4ade80' : type === 'error' ? '#f87171' : '#fbbf24';
    saveStatusText.textContent = message;
    
    if (type === 'saved') {
      setTimeout(() => {
        saveStatus.style.display = 'none';
      }, 3000);
    }
  }
  
  async function handleSave() {
    const title = titleInput.value.trim() || 'Untitled Memory';
    const content = document.getElementById('memory-content-input')?.value || memory.content || '';
    const category = document.getElementById('memory-category-select')?.value || memory.category || 'family';
    const date = document.getElementById('memory-date-input')?.value || memory.date;
    
    try {
      showSaveStatus('saving', 'Saving...');
      if (saveBtn) saveBtn.disabled = true;
      
      // Update memory object
      memory.title = title;
      memory.content = content;
      memory.category = category;
      memory.date = date;
      
      // Try to save via .emma web vault first
      if (window.emmaWebVault && window.emmaWebVault.isOpen) {
        console.log('💾 SAVE: Saving to .emma web vault...');
        // Update the memory in the vault
        const memoryData = {
          id: memory.id,
          title: title,
          content: content,
          category: category,
          date: date,
          mediaItems: memory.mediaItems || []
        };
        
        // Extension mode: Route memory updates through extension
        if (window.emmaWebVault && window.emmaWebVault.extensionAvailable) {
          console.log('🔗 GALLERY: Routing memory update through extension');
          // Extension handles all vault operations - no direct data manipulation
          // Memory updates should go through proper extension save flow
          
          // Trigger direct save to update original file
          try {
            await window.emmaWebVault.autoSave();
            showSaveStatus('saved', '✓ Saved to .emma vault');
            console.log('💾 SAVE: Memory updated in .emma vault successfully');
          } catch (saveError) {
            showSaveStatus('error', '⚠️ Direct save required');
            console.error('💾 SAVE: Direct save failed:', saveError);
            
            if (saveError.message.includes('Direct save required')) {
              // Show user-friendly message
              setTimeout(() => {
                showSaveStatus('warning', 'Click "Enable direct save" button');
              }, 2000);
            }
            return; // Don't refresh gallery if save failed
          }
          
          // Refresh gallery to show updated memory
          setTimeout(() => {
            console.log('🔄 SAVE: Refreshing gallery to show updated memory...');
            if (window.loadMemories) {
              window.loadMemories();
            }
          }, 1000);
        }
        
      } else if (window.emmaAPI && window.emmaAPI.memories && window.emmaAPI.memories.save) {
        console.log('💾 SAVE: Falling back to old API...');
        // CRITICAL FIX: Strip dataUrls from mediaItems before persistence
        const persistableMediaItems = (memory.mediaItems || []).map(item => ({
          id: item.id,
          name: item.name,
          type: item.type,
          size: item.size,
          vaultId: item.vaultId,
          uploadedAt: item.uploadedAt,
          isPersisted: item.isPersisted,
          // Remove large dataUrls to prevent JSON serialization issues
          url: item.isPersisted ? null : item.url,
          dataUrl: item.isPersisted ? null : item.dataUrl
        }));
        
        const memoryData = {
          id: memory.id,
          title: title,
          content: content,
          category: category,
          date: date,
          mediaItems: persistableMediaItems
        };
        
        console.log('💾 SAVE: Saving memory with media items:', {
          memoryId: memory.id,
          title: title,
          mediaItemsCount: memoryData.mediaItems.length,
          mediaItems: memoryData.mediaItems.map(item => ({
            name: item.name,
            hasUrl: !!item.url,
            hasDataUrl: !!item.dataUrl,
            isPersisted: item.isPersisted,
            vaultId: item.vaultId
          }))
        });
        
        const result = await window.emmaAPI.memories.save(memoryData);
        
        if (result && result.success) {
          showSaveStatus('saved', '✓ Saved to vault');
          console.log('💾 SAVE: Memory saved to vault successfully');
        } else {
          showSaveStatus('error', 'Vault save failed');
          console.error('💾 SAVE: Vault save failed:', result);
        }
      } else {
        showSaveStatus('saved', '✓ Saved (demo)');
        console.warn('💾 SAVE: No vault API - saved locally only');
      }
      
      // Update the memory in the main array
      const memoryIndex = memories.findIndex(m => m.id === memory.id);
      if (memoryIndex !== -1) {
        memories[memoryIndex] = memory;
      }
      
    } catch (error) {
      showSaveStatus('error', 'Save failed');
      console.error('💾 SAVE: Error saving memory:', error);
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }
  
  // Add save button handler
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSave);
  }
  
  // Add delete button handler
  const deleteBtn = modal.querySelector('#memory-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      // Confirm deletion
      const confirmed = confirm(`Are you sure you want to permanently delete "${memory.title}"?\n\nThis action cannot be undone.`);
      if (!confirmed) return;
      
      try {
        console.log('🗑️ DELETE: Deleting memory:', memory.id);
        
        // Delete using elegant API
        if (window.emmaAPI && window.emmaAPI.memories && window.emmaAPI.memories.delete) {
          console.log('🗑️ DELETE: Removing from .emma vault via API...');
          const result = await window.emmaAPI.memories.delete(memory.id);
          if (result && result.success) {
            console.log('🗑️ DELETE: Memory removed from .emma vault and auto-saved');
          } else {
            console.error('🗑️ DELETE: API delete failed:', result);
          }
        }
        
        // Remove from local memories array
        const memoryIndex = memories.findIndex(m => m.id === memory.id);
        if (memoryIndex !== -1) {
          memories.splice(memoryIndex, 1);
          console.log('🗑️ DELETE: Memory removed from local array');
        }
        
        // Close modal
        closeModal();
        
        // Refresh gallery to show updated list
        setTimeout(() => {
          console.log('🔄 DELETE: Refreshing gallery after deletion...');
          if (window.loadMemories) {
            window.loadMemories();
          }
        }, 500);
        
      } catch (error) {
        console.error('🗑️ DELETE: Error deleting memory:', error);
        alert('Failed to delete memory. Please try again.');
      }
    });
  }
  
  // Add keyboard shortcuts
  const handleKeydown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      closeModal();
    }
  };
  
  document.addEventListener('keydown', handleKeydown);
  modal._keydownHandler = handleKeydown;
  
  // Share button handler
  const shareBtn = modal.querySelector('#share-memory-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      openQRShareModal(memory);
    });
  }
  
  // Close handlers
  const overlay = modal.querySelector('.memory-detail-overlay');
  const closeModal = () => {
    // Cleanup
    if (modal._keydownHandler) {
      document.removeEventListener('keydown', modal._keydownHandler);
    }
    const emmaOrb = document.getElementById('universal-emma-orb');
    if (emmaOrb) {
      emmaOrb.style.display = 'block';
      console.log('💝 GALLERY: Restored Emma orb after modal close');
    }
    modal.remove();
  };
  
  overlay.addEventListener('click', closeModal);
  
  // Update close button to use the cleanup function
  const closeBtn = modal.querySelector('.close-btn');
  closeBtn.onclick = closeModal;
  
  // Store current memory globally for helper functions
  window.currentMemory = memory;
  
  // Initial render
  renderTab();
  
  // Add fade in animation
  modal.style.opacity = '0';
  setTimeout(() => {
    modal.style.opacity = '1';
  }, 10);
}

/**
 * Render mini slideshow for overview tab
 */
function renderMiniSlideshow(memory) {
  const mediaItems = memory.mediaItems || [];
  
  if (mediaItems.length === 0) {
    return `
      <!-- No media placeholder -->
      <div style="
        text-align: center;
        padding: 40px 20px;
        margin-bottom: 24px;
        border: 2px dashed rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.02);
      ">
        <div style="font-size: 48px; margin-bottom: 12px; opacity: 0.3;">📷</div>
        <p style="color: rgba(255, 255, 255, 0.6); margin: 0 0 16px 0;">
          Add photos and videos to bring this memory to life
        </p>
                  <button onclick="document.getElementById('overview-media-file-input').click()" style="
            background: var(--emma-gradient-1);
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
          ">📷 Add Media</button>
      </div>
    `;
  }
  
  return `
    <div class="mini-slideshow" style="margin-bottom: 24px;">
      <div style="position: relative; height: 200px; border-radius: 12px; overflow: hidden; background: rgba(255, 255, 255, 0.05);">
        <div class="slideshow-container" id="slideshow-container" style="
          display: flex;
          transition: transform 0.5s ease;
          height: 100%;
        ">
          ${mediaItems.map((item, index) => `
            <div class="slide" style="
              flex: 0 0 100%;
              height: 100%;
              position: relative;
            ">
              ${item.type.startsWith('image/') ? 
                `<img src="${item.url}" style="width: 100%; height: 100%; object-fit: cover;">` :
                `<video src="${item.url}" style="width: 100%; height: 100%; object-fit: cover;" muted autoplay loop></video>`
              }
              <div style="
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
                padding: 20px 16px 12px;
                color: white;
                font-size: 12px;
              ">
                ${item.name} • ${Math.round(item.size / 1024)}KB
              </div>
            </div>
          `).join('')}
        </div>
        
        <!-- Navigation dots -->
        ${mediaItems.length > 1 ? `
          <div style="
            position: absolute;
            bottom: 12px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 6px;
            z-index: 10;
          ">
            ${mediaItems.map((_, index) => `
              <button class="slide-dot" data-slide="${index}" style="
                width: 8px;
                height: 8px;
                border-radius: 50%;
                border: none;
                background: rgba(255, 255, 255, 0.5);
                cursor: pointer;
                transition: background 0.3s ease;
              " onclick="goToSlide(${index})"></button>
            `).join('')}
          </div>
          
          <!-- Navigation arrows -->
          <button class="slide-nav prev" onclick="previousSlide()" style="
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.5);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.7;
            transition: opacity 0.3s ease;
          " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">‹</button>
          
          <button class="slide-nav next" onclick="nextSlide()" style="
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.5);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.7;
            transition: opacity 0.3s ease;
          " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">›</button>
        ` : ''}
      </div>
      
      <div style="text-align: center; margin-top: 12px;">
        <small style="color: rgba(255, 255, 255, 0.6);">
          ${mediaItems.length} media file${mediaItems.length > 1 ? 's' : ''} • 
          <a href="#" onclick="switchTab('media'); return false;" style="color: var(--emma-accent); text-decoration: none;">Manage all media</a>
        </small>
      </div>
    </div>
  `;
}

/**
 * Tab rendering functions - replicate legacy memory modal features
 */
function renderOverview(memory) {
  return `
    <div class="overview-content">
      <!-- Hidden file input for adding media from Overview tab -->
      <input type="file" id="overview-media-file-input" accept="image/*,video/*" multiple style="display: none;" onchange="handleMediaUpload(event)">
      
      <!-- Mini Media Slideshow at the top -->
      ${renderMiniSlideshow(memory)}
      
      <!-- Memory content editor -->
      <div style="margin-bottom: 24px;">
        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: rgba(255, 255, 255, 0.8);">Memory Content</label>
        <textarea id="memory-content-input" style="
          width: 100%;
          min-height: 120px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 16px;
          color: white;
          font-size: 14px;
          line-height: 1.5;
          resize: vertical;
        " placeholder="Describe this memory...">${escapeHtml(memory.content || '')}</textarea>
      </div>
      
      <!-- Category and tags -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
        <div>
          <label style="display: block; font-weight: 600; margin-bottom: 8px; color: rgba(255, 255, 255, 0.8);">Category</label>
          <select id="memory-category-select" style="
            width: 100%;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 12px;
            color: white;
            font-size: 14px;
          ">
            <option value="family" ${memory.category === 'family' ? 'selected' : ''}>👨‍👩‍👧‍👦 Family</option>
            <option value="friends" ${memory.category === 'friends' ? 'selected' : ''}>👥 Friends</option>
            <option value="travel" ${memory.category === 'travel' ? 'selected' : ''}>✈️ Travel</option>
            <option value="celebration" ${memory.category === 'celebration' ? 'selected' : ''}>🎉 Celebrations</option>
            <option value="daily" ${memory.category === 'daily' ? 'selected' : ''}>🌅 Daily Life</option>
          </select>
        </div>
        <div>
          <label style="display: block; font-weight: 600; margin-bottom: 8px; color: rgba(255, 255, 255, 0.8);">Date</label>
          <input type="date" id="memory-date-input" style="
            width: 100%;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 12px;
            color: white;
            font-size: 14px;
          " value="${new Date(memory.date).toISOString().split('T')[0]}" />
        </div>
      </div>
      
      <!-- Tags -->
      <div style="margin-bottom: 24px;">
        <label style="display: block; font-weight: 600; margin-bottom: 8px; color: rgba(255, 255, 255, 0.8);">Tags</label>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
          ${(memory.tags || []).map(tag => `
            <span style="
              padding: 6px 12px;
              background: rgba(118, 75, 162, 0.2);
              border: 1px solid rgba(118, 75, 162, 0.3);
              border-radius: 16px;
              font-size: 12px;
              color: #f093fb;
              display: flex;
              align-items: center;
              gap: 4px;
            ">
              ${escapeHtml(tag)}
              <button onclick="removeTag('${escapeHtml(tag)}')" style="
                background: none;
                border: none;
                color: #f093fb;
                cursor: pointer;
                font-size: 10px;
                padding: 0;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
              ">×</button>
            </span>
          `).join('')}
        </div>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="new-tag-input" placeholder="Add a tag..." onkeypress="if(event.key==='Enter') addTag()" style="
            flex: 1;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 8px 12px;
            color: white;
            font-size: 14px;
          " />
          <button onclick="addTag()" style="
            background: var(--emma-gradient-1);
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
          ">Add</button>
        </div>
      </div>

    </div>
  `;
}

function renderMeta(memory) {
  const metadata = memory.metadata || {};
  return `
    <div class="meta-content">
      <div style="display: grid; gap: 16px;">
        <div class="meta-row">
          <div class="meta-label">Memory ID</div>
          <div class="meta-value">${escapeHtml(memory.id || 'N/A')}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">Type</div>
          <div class="meta-value">${escapeHtml(memory.type || memory.category || 'memory')}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">Created</div>
          <div class="meta-value">${new Date(memory.date || memory.created_at || Date.now()).toLocaleString()}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">Last Modified</div>
          <div class="meta-value">${new Date(memory.updated_at || memory.date || Date.now()).toLocaleString()}</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">Word Count</div>
          <div class="meta-value">${(memory.content || '').split(/\s+/).filter(w => w.length > 0).length} words</div>
        </div>
        <div class="meta-row">
          <div class="meta-label">Source</div>
          <div class="meta-value">${escapeHtml(metadata.source || 'Manual entry')}</div>
        </div>
        ${metadata.location ? `
          <div class="meta-row">
            <div class="meta-label">Location</div>
            <div class="meta-value">${escapeHtml(metadata.location)}</div>
          </div>
        ` : ''}
        ${metadata.weather ? `
          <div class="meta-row">
            <div class="meta-label">Weather</div>
            <div class="meta-value">${escapeHtml(metadata.weather)}</div>
          </div>
        ` : ''}
      </div>
    </div>
    <style>
      .meta-row {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 16px;
        padding: 12px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }
      .meta-label {
        font-weight: 600;
        color: rgba(255, 255, 255, 0.7);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .meta-value {
        color: white;
        font-size: 14px;
      }
    </style>
  `;
}

function renderMedia(memory) {
  const mediaItems = memory.mediaItems || [];
  
  return `
    <div class="media-content">
      <!-- Hidden file input -->
      <input type="file" id="media-file-input" accept="image/*,video/*" multiple style="display: none;" onchange="handleMediaUpload(event)">
      
      ${mediaItems.length > 0 ? `
        <!-- Media grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
          ${mediaItems.map(item => `
            <div style="position: relative; border-radius: 8px; overflow: hidden; background: rgba(255, 255, 255, 0.1);">
              ${item.type.startsWith('image/') ? 
                `<img src="${item.url}" style="width: 100%; height: 150px; object-fit: cover;">` :
                `<video src="${item.url}" style="width: 100%; height: 150px; object-fit: cover;" controls></video>`
              }
              <!-- Vault status indicator -->
              <div style="
                position: absolute;
                top: 8px;
                left: 8px;
                background: ${item.isPersisted ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)'};
                color: white;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 10px;
                font-weight: 600;
              ">${item.isPersisted ? '✓ Vault' : '⚠ Local'}</div>
              
              <button onclick="removeMediaItem('${item.id}')" style="
                position: absolute;
                top: 8px;
                right: 8px;
                background: rgba(0, 0, 0, 0.7);
                border: none;
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 12px;
              ">×</button>
              
              <!-- Media info overlay -->
              <div style="
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
                padding: 20px 12px 8px;
                color: white;
                font-size: 12px;
              ">
                <div style="font-weight: 600;">${item.name}</div>
                <div style="opacity: 0.8;">${Math.round(item.size / 1024)}KB</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <!-- Empty state -->
        <div style="text-align: center; padding: 60px 20px;">
          <div style="font-size: 64px; margin-bottom: 16px; opacity: 0.3;">📷</div>
          <h3 style="color: white; margin-bottom: 8px;">Media Gallery</h3>
          <p style="color: rgba(255, 255, 255, 0.6); margin-bottom: 24px;">
            Add photos and videos to bring this memory to life.
          </p>
        </div>
      `}
      
      <!-- Add media button -->
      <div style="text-align: center;">
        <button onclick="document.getElementById('media-file-input').click()" style="
          background: var(--emma-gradient-1);
          border: none;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        ">📷 Add Media</button>
      </div>
    </div>
  `;
}

function renderPeople(memory) {
  // For demo, show placeholder with sample people
  const samplePeople = [
    { id: 1, name: 'Mom', relationship: 'Mother', permission: 'Full Access' },
    { id: 2, name: 'Dad', relationship: 'Father', permission: 'View Only' },
    { id: 3, name: 'Sarah', relationship: 'Sister', permission: 'Full Access' }
  ];
  
  return `
    <div class="people-content">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h3 style="color: white; margin: 0;">People in this Memory</h3>
        <button onclick="showNotification('👥 Add people feature coming soon!', 'info')" style="
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        ">+ Add People</button>
      </div>
      
      <div class="people-grid" style="display: grid; gap: 16px;">
        ${samplePeople.map(person => `
          <div class="person-card" style="
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 16px;
            transition: all 0.2s ease;
            cursor: pointer;
          " onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
            <div style="
              width: 48px;
              height: 48px;
              border-radius: 50%;
              background: var(--emma-gradient-1);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 600;
              font-size: 18px;
            ">${person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
            
            <div style="flex: 1;">
              <div style="color: white; font-weight: 600; margin-bottom: 4px;">${escapeHtml(person.name)}</div>
              <div style="color: rgba(255, 255, 255, 0.6); font-size: 14px;">${escapeHtml(person.relationship)}</div>
            </div>
            
            <div style="
              background: rgba(118, 75, 162, 0.2);
              border: 1px solid rgba(118, 75, 162, 0.3);
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              color: #f093fb;
            ">${escapeHtml(person.permission)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderRelated(memory) {
  // For demo, show placeholder
  return `
    <div class="related-content">
      <div style="text-align: center; padding: 60px 20px;">
        <div style="font-size: 64px; margin-bottom: 16px; opacity: 0.3;">🔗</div>
        <h3 style="color: white; margin-bottom: 8px;">Related Memories</h3>
        <p style="color: rgba(255, 255, 255, 0.6); margin-bottom: 24px;">
          Emma will automatically find and suggest related memories based on people, places, and themes.
        </p>
        <button onclick="showNotification('🔍 Related memories analysis coming soon!', 'info')" style="
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        ">Find Related</button>
      </div>
    </div>
  `;
}

// Helper functions for tags
function addTag() {
  const input = document.getElementById('new-tag-input');
  const tag = input.value.trim();
  if (tag && !window.currentMemory.tags.includes(tag)) {
    window.currentMemory.tags.push(tag);
    input.value = '';
    // Re-render overview tab
    const bodyHost = document.querySelector('#memory-detail-body');
    if (bodyHost) {
      bodyHost.innerHTML = renderOverview(window.currentMemory);
    }
  }
}

function removeTag(tag) {
  if (window.currentMemory && window.currentMemory.tags) {
    window.currentMemory.tags = window.currentMemory.tags.filter(t => t !== tag);
    // Re-render overview tab
    const bodyHost = document.querySelector('#memory-detail-body');
    if (bodyHost) {
      bodyHost.innerHTML = renderOverview(window.currentMemory);
    }
  }
}



/**
 * Show beautiful notification
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(118, 75, 162, 0.3);
    z-index: 10001;
    max-width: 400px;
    font-size: 14px;
    line-height: 1.4;
    animation: slideIn 0.3s ease;
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Add CSS animation
 */
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(style);

/**
 * Render empty state when no vault memories exist
 */
function renderEmptyState() {
  const memoriesGrid = document.getElementById('memories-grid');
  if (!memoriesGrid) return;
  
  memoriesGrid.innerHTML = `
    <div class="empty-state-card">
      <div class="empty-icon">💝</div>
      <h2 class="empty-title">Your Memory Gallery is Ready</h2>
      <p class="empty-message">
        Start capturing your precious memories! Click the <strong>Emma orb</strong> below to create your first memory capsule.
      </p>
      <div class="empty-cta-box">
        <div class="empty-cta-icon">👇</div>
        <div class="empty-cta-content">
          <h3 class="empty-cta-title">Click the Emma Orb</h3>
          <p class="empty-cta-text">
            Look for the glowing purple orb in the bottom-right corner<br/>
            Click it to open Emma's memory creation wizard
          </p>
        </div>
      </div>
      </div>
    </div>
  `;
  
  // No button click handler needed - users should click the Emma orb
  
  // Add event listener for clear vault button
  const clearBtn = document.getElementById('clear-vault-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('⚠️ Are you sure you want to clear all memories from the vault? This cannot be undone!')) {
        console.log('💝 GALLERY: Clearing vault memories...');
        clearVaultMemories();
      }
    });
  }
}

/**
 * Clear all memories from the vault storage
 */
async function clearVaultMemories() {
  try {
    // Clear using debug.kv.clear if available
    if (window.emmaAPI && window.emmaAPI.debug && window.emmaAPI.debug.kv && window.emmaAPI.debug.kv.clear) {
      console.log('💝 GALLERY: Clearing vault storage...');
      const result = await window.emmaAPI.debug.kv.clear();
      console.log('💝 GALLERY: Clear result:', result);
      
      // Clear local memories array
      memories = [];
      
      // Re-render to show empty state
      renderMemories();
      
      // Show success notification
      showNotification('🗑️ All memories cleared from vault', 'success');
    } else {
      console.error('💝 GALLERY: No clear API available');
      showNotification('⚠️ Clear function not available', 'error');
    }
  } catch (error) {
    console.error('💝 GALLERY: Error clearing vault:', error);
    showNotification('⚠️ Failed to clear vault: ' + error.message, 'error');
  }
}

/**
 * Create a new empty memory for editing
 */
function createNewMemory() {
  const newMemory = {
    id: 'new_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    title: 'New Memory',
    excerpt: 'A new memory to be filled with precious moments...',
    content: 'This is a new memory. Add your thoughts, experiences, and photos here.',
    category: 'family',
    tags: ['memory'],
    date: new Date(),
    image: null,
    favorite: false,
    mediaItems: []
  };
  
  // Add to memories array
  memories.unshift(newMemory);
  
  // Re-render the grid
  renderMemories();
  
  // Automatically open the new memory for editing
  setTimeout(() => {
    openMemoryDetail(newMemory);
  }, 100);
}

/**
 * Handle media file upload
 */
async function handleMediaUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  console.log('📷 MEDIA: Uploading', files.length, 'files');
  
  // Get current memory
  const memory = window.currentMemory;
  if (!memory) {
    showNotification('❌ No memory selected', 'error');
    return;
  }
  
  // Initialize mediaItems array if it doesn't exist
  if (!memory.mediaItems) {
    memory.mediaItems = [];
  }
  
  // Process each file
  for (const file of Array.from(files)) {
    try {
      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        showNotification(`❌ "${file.name}" is not a supported media file`, 'error');
        continue;
      }
      
      console.log('📷 MEDIA: Processing', file.name);
      showNotification(`📷 Uploading ${file.name}...`, 'info');
      
      // Convert file to data URL for vault storage
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      // Save to elegant vault system
      let vaultAttachmentId = null;
      if (window.emmaWebVault && window.emmaWebVault.isOpen) {
        try {
          console.log('📷 MEDIA: Saving to elegant vault:', file.name);
          vaultAttachmentId = await window.emmaWebVault.addMedia({
            name: file.name,
            type: file.type,
            data: dataUrl
          });
          
          console.log('📷 MEDIA: Saved to elegant vault with ID:', vaultAttachmentId);
          
          // Extension mode: Route attachment updates through extension
          if (window.emmaWebVault && window.emmaWebVault.extensionAvailable) {
            console.log('🔗 GALLERY: Routing attachment update through extension');
            // Extension handles all vault operations - no direct data manipulation
            
            // Trigger direct save to persist to file
            try {
              await window.emmaWebVault.autoSave();
              console.log('📷 MEDIA: Triggered direct save for media upload');
            } catch (saveError) {
              console.error('📷 MEDIA: Direct save failed for media upload:', saveError);
              showNotification('⚠️ Media added but direct save required - click "Enable direct save"', 'warning');
            }
          }
          
        } catch (vaultError) {
          console.error('📷 MEDIA: Failed to save to elegant vault:', vaultError);
          showNotification(`⚠️ ${file.name} uploaded locally (vault save failed)`, 'warning');
        }
      } else {
        console.warn('📷 MEDIA: Elegant vault not available - storing locally only');
      }
      
      // Add to memory (use dataUrl for immediate display)
      const mediaItem = {
        id: 'media_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type,
        size: file.size,
        url: dataUrl, // Use for immediate display
        dataUrl: dataUrl, // Keep temporarily for this session
        vaultId: vaultAttachmentId, // Vault attachment ID if saved
        uploadedAt: new Date(),
        isPersisted: !!vaultAttachmentId // Track if saved to vault
      };
      
      memory.mediaItems.push(mediaItem);
      console.log('📷 MEDIA: Added', file.name, 'to memory', vaultAttachmentId ? '(vault saved)' : '(local only)');
      console.log('📷 MEDIA: Media item details:', {
        id: mediaItem.id,
        name: mediaItem.name,
        hasUrl: !!mediaItem.url,
        hasDataUrl: !!mediaItem.dataUrl,
        urlLength: mediaItem.url ? mediaItem.url.length : 0,
        dataUrlLength: mediaItem.dataUrl ? mediaItem.dataUrl.length : 0,
        isPersisted: mediaItem.isPersisted,
        vaultId: mediaItem.vaultId
      });
      showNotification(`✅ ${file.name} uploaded successfully!`, 'success');
      
    } catch (error) {
      console.error('📷 MEDIA: Error processing', file.name, ':', error);
      showNotification(`❌ Failed to upload ${file.name}`, 'error');
    }
  }
  
  // Update the memory in the main array
  const memoryIndex = memories.findIndex(m => m.id === memory.id);
  if (memoryIndex !== -1) {
    memories[memoryIndex] = memory;
  }
  
  // CRITICAL FIX: Auto-save memory with new media items
  console.log('📷 MEDIA: Auto-saving memory with updated media items...');
  console.log('📷 MEDIA: mediaItems before save:', {
    count: memory.mediaItems.length,
    items: memory.mediaItems.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      hasUrl: !!item.url,
      hasDataUrl: !!item.dataUrl,
      urlLength: item.url ? item.url.length : 0,
      dataUrlLength: item.dataUrl ? item.dataUrl.length : 0,
      urlPreview: item.url ? item.url.substring(0, 50) + '...' : null,
      dataUrlPreview: item.dataUrl ? item.dataUrl.substring(0, 50) + '...' : null,
      isPersisted: item.isPersisted,
      vaultId: item.vaultId
    }))
  });
  
  try {
    // Use .emma web vault for saving updated memory
    if (window.emmaWebVault && window.emmaWebVault.isOpen) {
      console.log('📷 MEDIA: Updating memory in .emma vault...');
      
      // Extension mode: Route memory updates through extension
      if (window.emmaWebVault && window.emmaWebVault.extensionAvailable) {
        console.log('🔗 GALLERY: Routing memory update through extension');
        // Extension handles all vault operations - no direct data manipulation
        
        // Save vault data
        await window.emmaWebVault.saveToIndexedDB(window.emmaWebVault.vaultData);
        console.log('📷 MEDIA: Memory updated in vault with new media');
      }
      
    } else if (window.emmaAPI && window.emmaAPI.memories && window.emmaAPI.memories.save) {
      console.log('📷 MEDIA: Falling back to old API...');
      // CRITICAL FIX: Strip dataUrls from mediaItems before persistence to avoid size issues
      const persistableMediaItems = memory.mediaItems.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        size: item.size,
        vaultId: item.vaultId,
        uploadedAt: item.uploadedAt,
        isPersisted: item.isPersisted,
        // Remove large dataUrls to prevent JSON serialization issues
        url: item.isPersisted ? null : item.url,
        dataUrl: item.isPersisted ? null : item.dataUrl
      }));
      
      const memoryPayload = {
        id: memory.id,
        title: memory.title,
        content: memory.content,
        category: memory.category,
        date: memory.date,
        mediaItems: persistableMediaItems // Use stripped version for storage
      };
      
      console.log('📷 MEDIA: Sending payload to save:', {
        id: memoryPayload.id,
        title: memoryPayload.title,
        mediaItemsCount: memoryPayload.mediaItems.length,
        payloadSize: JSON.stringify(memoryPayload).length
      });
      
      const saveResult = await window.emmaAPI.memories.save(memoryPayload);
      
      if (saveResult && saveResult.success) {
        console.log('📷 MEDIA: Memory auto-saved successfully with media items');
        showNotification(`💾 Memory updated with ${files.length} media file${files.length > 1 ? 's' : ''}`, 'success');
      } else {
        console.error('📷 MEDIA: Auto-save failed:', saveResult);
        showNotification(`⚠️ Media added but auto-save failed - please save manually`, 'warning');
      }
    } else {
      console.warn('📷 MEDIA: No save API available - media added locally only');
      showNotification(`⚠️ Media added locally - save manually to persist`, 'warning');
    }
  } catch (saveError) {
    console.error('📷 MEDIA: Auto-save error:', saveError);
    showNotification(`⚠️ Media added but auto-save failed: ${saveError.message}`, 'warning');
  }
  
  // Re-render the media tab
  const bodyHost = document.getElementById('memory-detail-body');
  if (bodyHost) {
    bodyHost.innerHTML = renderMedia(memory);
  }
  
  // Update the memory card image if it doesn't have one
  if (!memory.image && memory.mediaItems.length > 0) {
    const firstImage = memory.mediaItems.find(item => item.type.startsWith('image/'));
    if (firstImage) {
      memory.image = firstImage.url;
      // Re-render the gallery to show the new thumbnail
      renderMemories();
    }
  }
  
  // Clear the input
  event.target.value = '';
}

/**
 * Remove a media item
 */
async function removeMediaItem(mediaId) {
  console.log('🗑️ MEDIA: Removing', mediaId);
  
  const memory = window.currentMemory;
  if (!memory || !memory.mediaItems) return;
  
  // Find and remove the media item
  const itemIndex = memory.mediaItems.findIndex(item => item.id === mediaId);
  if (itemIndex === -1) return;
  
  const item = memory.mediaItems[itemIndex];
  
  // Remove from vault if it was persisted
  if (item.vaultId && window.emmaAPI && window.emmaAPI.vault && window.emmaAPI.vault.attachment && window.emmaAPI.vault.attachment.remove) {
    try {
      console.log('🗑️ MEDIA: Removing from vault:', item.vaultId);
      await window.emmaAPI.vault.attachment.remove(item.vaultId);
      console.log('🗑️ MEDIA: Successfully removed from vault');
    } catch (error) {
      console.error('🗑️ MEDIA: Failed to remove from vault:', error);
      showNotification(`⚠️ Failed to remove ${item.name} from vault`, 'warning');
    }
  }
  
  // Revoke the object URL to free memory
  URL.revokeObjectURL(item.url);
  
  // Remove from array
  memory.mediaItems.splice(itemIndex, 1);
  
  showNotification(`🗑️ Removed ${item.name}`, 'success');
  
  // Update the memory in the main array
  const memoryIndex = memories.findIndex(m => m.id === memory.id);
  if (memoryIndex !== -1) {
    memories[memoryIndex] = memory;
  }
  
  // If this was the main image, update it
  if (memory.image === item.url) {
    const firstImage = memory.mediaItems.find(item => item.type.startsWith('image/'));
    memory.image = firstImage ? firstImage.url : null;
    // Re-render the gallery
    renderMemories();
  }
  
  // Re-render the media tab
  const bodyHost = document.getElementById('memory-detail-body');
  if (bodyHost) {
    bodyHost.innerHTML = renderMedia(memory);
  }
  
  showNotification(`🗑️ Removed "${item.name}"`, 'info');
}

/**
 * Slideshow navigation functions
 */
let currentSlideIndex = 0;

function goToSlide(index) {
  const container = document.getElementById('slideshow-container');
  if (!container) return;
  
  const memory = window.currentMemory;
  if (!memory || !memory.mediaItems) return;
  
  currentSlideIndex = Math.max(0, Math.min(index, memory.mediaItems.length - 1));
  
  // Move the container
  container.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
  
  // Update dots
  document.querySelectorAll('.slide-dot').forEach((dot, i) => {
    dot.style.background = i === currentSlideIndex ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)';
  });
}

function nextSlide() {
  const memory = window.currentMemory;
  if (!memory || !memory.mediaItems) return;
  
  const nextIndex = (currentSlideIndex + 1) % memory.mediaItems.length;
  goToSlide(nextIndex);
}

function previousSlide() {
  const memory = window.currentMemory;
  if (!memory || !memory.mediaItems) return;
  
  const prevIndex = currentSlideIndex === 0 ? memory.mediaItems.length - 1 : currentSlideIndex - 1;
  goToSlide(prevIndex);
}

// Auto-advance slideshow
let slideshowTimer;

function startSlideshow() {
  const memory = window.currentMemory;
  if (!memory || !memory.mediaItems || memory.mediaItems.length <= 1) return;
  
  // Clear existing timer
  if (slideshowTimer) clearInterval(slideshowTimer);
  
  // Auto-advance every 4 seconds
  slideshowTimer = setInterval(() => {
    nextSlide();
  }, 4000);
}

function stopSlideshow() {
  if (slideshowTimer) {
    clearInterval(slideshowTimer);
    slideshowTimer = null;
  }
}

// Initialize when DOM is ready - but delay to allow vault restoration
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Delay initialization to allow vault restoration to complete
    setTimeout(initializeGallery, 500);
  });
} else {
  // Delay initialization to allow vault restoration to complete
  setTimeout(initializeGallery, 500);
}

// Global access
window.memoryGallery = {
  loadMemories,
  renderMemories,
  createNewMemory
};

/**
 * Open QR Share Modal for Memory Capsule
 */
function openQRShareModal(memory) {
  console.log('🔗 Opening QR Share Modal for memory:', memory.id);
  
  // Remove any existing QR modals
  const existingQRModal = document.querySelector('.qr-share-modal');
  if (existingQRModal) existingQRModal.remove();
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active qr-share-modal';
  modal.style.zIndex = '2000'; // Above memory detail modal
  
  const memoryTitle = memory.title || 'Untitled Memory';
  const memoryType = memory.type || 'note';
  const memoryDate = memory.date || new Date().toLocaleDateString();
  const attachmentCount = (memory.mediaItems || []).length;
  
  modal.innerHTML = `
    <div class="modal qr-share-dialog" style="
      max-width: 600px; 
      background: linear-gradient(135deg, rgba(20, 20, 30, 0.98), rgba(30, 30, 40, 0.98)); 
      backdrop-filter: blur(20px); 
      border: 1px solid rgba(134, 88, 255, 0.3);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    ">
      <div class="modal-header" style="
        padding: 24px 32px 16px 32px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: linear-gradient(135deg, rgba(134, 88, 255, 0.1), rgba(240, 147, 251, 0.1));
      ">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div class="qr-icon" style="
            width: 48px; height: 48px; 
            background: linear-gradient(135deg, #8658ff, #f093fb); 
            border-radius: 12px; 
            display: flex; align-items: center; justify-content: center; 
            font-size: 24px;
          ">📱</div>
          <div>
            <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">
              Share Memory Capsule
            </h2>
            <p style="color: #cccccc; margin: 4px 0 0 0; font-size: 14px;">
              "${memoryTitle}" • ${memoryType} • ${attachmentCount} attachments
            </p>
          </div>
        </div>
        <button class="close-btn close-qr-modal" style="
          color: #cccccc; font-size: 24px; cursor: pointer; 
          background: none; border: none;
        ">×</button>
      </div>
      
      <div class="qr-modal-body" style="padding: 32px;">
        <!-- Privacy Level Selection -->
        <div class="privacy-selection" style="margin-bottom: 32px;">
          <h3 style="color: #ffffff; font-size: 18px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            🔐 Privacy Level
          </h3>
          <div class="privacy-options" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
            <div class="privacy-option" data-level="private" style="
              padding: 16px; border: 2px solid rgba(255, 255, 255, 0.2); 
              border-radius: 12px; cursor: pointer; text-align: center;
              background: rgba(255, 255, 255, 0.05);
              transition: all 0.3s ease;
            ">
              <div style="font-size: 24px; margin-bottom: 8px;">🔒</div>
              <div style="color: #ffffff; font-weight: 600; margin-bottom: 4px;">Private</div>
              <div style="color: #cccccc; font-size: 12px;">Reference only</div>
            </div>
            <div class="privacy-option active" data-level="protected" style="
              padding: 16px; border: 2px solid #8658ff; 
              border-radius: 12px; cursor: pointer; text-align: center;
              background: rgba(134, 88, 255, 0.1);
              transition: all 0.3s ease;
            ">
              <div style="font-size: 24px; margin-bottom: 8px;">🛡️</div>
              <div style="color: #ffffff; font-weight: 600; margin-bottom: 4px;">Protected</div>
              <div style="color: #cccccc; font-size: 12px;">24hr token</div>
            </div>
            <div class="privacy-option" data-level="public" style="
              padding: 16px; border: 2px solid rgba(255, 255, 255, 0.2); 
              border-radius: 12px; cursor: pointer; text-align: center;
              background: rgba(255, 255, 255, 0.05);
              transition: all 0.3s ease;
            ">
              <div style="font-size: 24px; margin-bottom: 8px;">🌐</div>
              <div style="color: #ffffff; font-weight: 600; margin-bottom: 4px;">Public</div>
              <div style="color: #cccccc; font-size: 12px;">Summary only</div>
            </div>
          </div>
        </div>
        
        <!-- QR Code Generation -->
        <div class="qr-generation" style="margin-bottom: 32px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <!-- QR Display -->
            <div class="qr-display" style="text-align: center;">
              <div id="qr-code-container" style="
                background: white; 
                padding: 20px; 
                border-radius: 16px; 
                margin-bottom: 16px;
                display: inline-block;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
              ">
                <div id="qr-placeholder" style="
                  width: 200px; height: 200px; 
                  background: #f0f0f0; 
                  border-radius: 8px;
                  display: flex; align-items: center; justify-content: center;
                  color: #666; font-size: 14px;
                ">Click Generate QR</div>
              </div>
              <div style="display: flex; gap: 8px; justify-content: center;">
                <button id="generate-qr-btn" class="btn-primary" style="
                  background: linear-gradient(135deg, #8658ff, #f093fb);
                  border: none; color: white; padding: 12px 24px;
                  border-radius: 8px; cursor: pointer; font-weight: 600;
                ">Generate QR</button>
                <button id="download-qr-btn" class="btn-secondary" style="
                  background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2);
                  color: white; padding: 12px 24px; border-radius: 8px; cursor: pointer;
                  opacity: 0.5; pointer-events: none;
                " disabled>Download</button>
              </div>
            </div>
            
            <!-- QR Info -->
            <div class="qr-info">
              <h4 style="color: #ffffff; margin-bottom: 16px;">Share Options</h4>
              
              <div class="share-option" style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                  <span style="font-size: 20px;">👨‍👩‍👧‍👦</span>
                  <span style="color: #ffffff; font-weight: 600;">Family Members</span>
                </div>
                <div style="color: #cccccc; font-size: 14px; margin-left: 32px;">
                  Share with family for viewing memories together
                </div>
              </div>
              
              <div class="share-option" style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                  <span style="font-size: 20px;">🤖</span>
                  <span style="color: #ffffff; font-weight: 600;">AI Assistants</span>
                </div>
                <div style="color: #cccccc; font-size: 14px; margin-left: 32px;">
                  Let AI agents understand your memory context
                </div>
              </div>
              
              <div class="share-option">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                  <span style="font-size: 20px;">⚕️</span>
                  <span style="color: #ffffff; font-weight: 600;">Healthcare Providers</span>
                </div>
                <div style="color: #cccccc; font-size: 14px; margin-left: 32px;">
                  Secure, time-limited access for medical context
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Advanced Options -->
        <div class="advanced-options" style="
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 24px;
        ">
          <details style="color: #ffffff;">
            <summary style="cursor: pointer; font-weight: 600; margin-bottom: 16px;">
              ⚙️ Advanced Options
            </summary>
            <div style="margin-left: 20px;">
              <label style="display: block; margin-bottom: 12px;">
                <input type="checkbox" id="include-summary" checked style="margin-right: 8px;">
                <span style="color: #cccccc;">Include AI summary in QR</span>
              </label>
              <label style="display: block; margin-bottom: 12px;">
                <input type="checkbox" id="include-keywords" checked style="margin-right: 8px;">
                <span style="color: #cccccc;">Include keywords for AI agents</span>
              </label>
              <div style="margin-bottom: 12px;">
                <label style="color: #cccccc; display: block; margin-bottom: 4px;">Expiry Time:</label>
                <select id="expiry-time" style="
                  background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2);
                  color: white; padding: 8px; border-radius: 6px; width: 150px;
                ">
                  <option value="3600000">1 hour</option>
                  <option value="86400000" selected>24 hours</option>
                  <option value="604800000">7 days</option>
                  <option value="2592000000">30 days</option>
                </select>
              </div>
            </div>
          </details>
        </div>
        
        <!-- Generated Data Preview -->
        <div id="qr-data-preview" style="
          display: none;
          margin-top: 24px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          border-left: 4px solid #8658ff;
        ">
          <h4 style="color: #ffffff; margin-bottom: 12px;">QR Data Preview</h4>
          <pre id="qr-data-content" style="
            color: #cccccc; font-size: 12px; line-height: 1.4;
            background: rgba(0, 0, 0, 0.3); padding: 12px; border-radius: 6px;
            overflow-x: auto; white-space: pre-wrap;
          "></pre>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setupQRModalInteractions(modal, memory);
  
  // Animate in
  modal.style.opacity = '0';
  setTimeout(() => {
    modal.style.opacity = '1';
  }, 10);
}

/**
 * Setup QR Modal Interactions
 */
function setupQRModalInteractions(modal, memory) {
  let currentPrivacyLevel = 'protected';
  let generatedQRData = null;
  
  // Privacy level selection
  const privacyOptions = modal.querySelectorAll('.privacy-option');
  privacyOptions.forEach(option => {
    option.addEventListener('click', function() {
      // Remove active from all
      privacyOptions.forEach(opt => {
        opt.classList.remove('active');
        opt.style.border = '2px solid rgba(255, 255, 255, 0.2)';
        opt.style.background = 'rgba(255, 255, 255, 0.05)';
      });
      
      // Add active to clicked
      this.classList.add('active');
      this.style.border = '2px solid #8658ff';
      this.style.background = 'rgba(134, 88, 255, 0.1)';
      
      currentPrivacyLevel = this.dataset.level;
      console.log('🔐 Privacy level changed to:', currentPrivacyLevel);
      
      // Reset QR generation
      resetQRGeneration();
    });
  });
  
  // Generate QR button
  const generateBtn = modal.querySelector('#generate-qr-btn');
  const downloadBtn = modal.querySelector('#download-qr-btn');
  const qrContainer = modal.querySelector('#qr-code-container');
  const qrPlaceholder = modal.querySelector('#qr-placeholder');
  const dataPreview = modal.querySelector('#qr-data-preview');
  const dataContent = modal.querySelector('#qr-data-content');
  
  generateBtn.addEventListener('click', async function() {
    try {
      generateBtn.disabled = true;
      generateBtn.textContent = 'Generating...';
      
      // Get options
      const includeSummary = modal.querySelector('#include-summary').checked;
      const includeKeywords = modal.querySelector('#include-keywords').checked;
      const expiryTime = parseInt(modal.querySelector('#expiry-time').value);
      
      const options = {
        privacyLevel: currentPrivacyLevel,
        includeSummary,
        includeKeywords,
        expiryMs: expiryTime
      };
      
      console.log('🔗 Generating QR with options:', options);
      
      // Generate QR via Emma API
      if (window.emmaAPI && window.emmaAPI.memories && window.emmaAPI.memories.generateQR) {
        const result = await window.emmaAPI.memories.generateQR(memory.id, options);
        
        if (result && result.success) {
          // Display QR code
          qrPlaceholder.innerHTML = `<img src="${result.qrCode}" style="width: 200px; height: 200px;" alt="QR Code" />`;
          
          // Show data preview
          dataContent.textContent = JSON.stringify(result.payload, null, 2);
          dataPreview.style.display = 'block';
          
          // Enable download
          downloadBtn.disabled = false;
          downloadBtn.style.opacity = '1';
          downloadBtn.style.pointerEvents = 'auto';
          
          // Store for download
          generatedQRData = result;
          
          showNotification('✅ QR code generated successfully!', 'success');
        } else {
          throw new Error(result?.error || 'QR generation failed');
        }
      } else {
        // Demo mode - generate fake QR
        console.warn('🔗 No Emma API - generating demo QR');
        generateDemoQR();
      }
      
    } catch (error) {
      console.error('🔗 QR Generation error:', error);
      showNotification('❌ Failed to generate QR code: ' + error.message, 'error');
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate QR';
    }
  });
  
  // Download QR button
  downloadBtn.addEventListener('click', function() {
    if (generatedQRData && generatedQRData.qrCode) {
      downloadQRCode(generatedQRData.qrCode, memory.title);
    }
  });
  
  // Close modal
  const closeBtn = modal.querySelector('.close-qr-modal');
  closeBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  function resetQRGeneration() {
    qrPlaceholder.innerHTML = 'Click Generate QR';
    dataPreview.style.display = 'none';
    downloadBtn.disabled = true;
    downloadBtn.style.opacity = '0.5';
    downloadBtn.style.pointerEvents = 'none';
    generatedQRData = null;
  }
  
  function generateDemoQR() {
    // Demo QR generation for when API isn't available
    const demoPayload = {
      v: '1.0',
      type: 'capsule',
      id: memory.id,
      meta: {
        title: memory.title || 'Demo Memory',
        created: Date.now(),
        type: memory.type || 'note',
        summary: currentPrivacyLevel !== 'private' ? (memory.content || '').substring(0, 200) + '...' : undefined
      }
    };
    
    // Create simple demo QR (just text for demo)
    qrPlaceholder.innerHTML = `
      <div style="
        width: 200px; height: 200px; 
        background: linear-gradient(45deg, #000 25%, transparent 25%), 
                    linear-gradient(-45deg, #000 25%, transparent 25%), 
                    linear-gradient(45deg, transparent 75%, #000 75%), 
                    linear-gradient(-45deg, transparent 75%, #000 75%);
        background-size: 20px 20px;
        background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        display: flex; align-items: center; justify-content: center;
        color: white; font-weight: bold; font-size: 12px;
      ">
        DEMO QR
      </div>
    `;
    
    dataContent.textContent = JSON.stringify(demoPayload, null, 2);
    dataPreview.style.display = 'block';
    
    downloadBtn.disabled = false;
    downloadBtn.style.opacity = '1';
    downloadBtn.style.pointerEvents = 'auto';
    
    showNotification('📱 Demo QR generated (API not available)', 'info');
  }
}

/**
 * Download QR Code as Image
 */
function downloadQRCode(qrDataUrl, memoryTitle) {
  try {
    const link = document.createElement('a');
    link.download = `emma-memory-qr-${memoryTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
    link.href = qrDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('📥 QR code downloaded!', 'success');
  } catch (error) {
    console.error('Download failed:', error);
    showNotification('❌ Download failed', 'error');
  }
}

// Global access
window.openQRShareModal = openQRShareModal;

console.log('💝 Beautiful Memory Gallery: Ready to honor precious moments');
