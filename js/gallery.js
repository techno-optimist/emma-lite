/**
 * Emma Memory Gallery - PRODUCTION VERSION v2.1
 * Created with love for those living with dementia and their families
 * 
 * 🚨 EXTREME CACHE BUST v2.1 🚨
 * File: gallery.js 
 * Timestamp: 2025-08-22T22:58:00Z
 * Status: INCLUDES escapeHtml FUNCTION
 * Build: RENDER-FORCE-REFRESH-2025-08-22-v2
 * 
 * This file was rebuilt from scratch to eliminate ALL caching issues.
 * ALL REQUIRED FUNCTIONS INCLUDED: escapeHtml, renderEmptyState, createNewMemory
 */

// Global state
let memories = [];
let currentFilter = 'all';
let isLoading = true;

// REMOVED: Demo memories - only use vault storage from now on

/**
 * Initialize the gallery
 */
function initializeGallery() {

  // Debug: Check what Emma API methods are available
  if (window.emmaAPI) {
        // Emma API detected and ready
  } else {

  }

  // Set up event listeners
  setupEventListeners();

  // Pure web app mode - load memories directly
  if (window.emmaWebVault && window.emmaWebVault.isOpen && window.emmaWebVault.vaultData) {

    loadMemories();
  } else {

    // Wait for vault data restoration
    setTimeout(() => {
      if (window.emmaWebVault && window.emmaWebVault.isOpen && window.emmaWebVault.vaultData) {

        loadMemories();
      } else {
        console.warn('💝 GALLERY: No vault data available after delay');
      }
    }, 2000);
  }

  // Clean, professional gallery initialization
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {

  // No extra buttons to wire up - just memory cards
}

/**
 * Refresh gallery (can be called externally)
 */
window.refreshMemoryGallery = function() {

  loadMemories();
};

/**
 * Load memories from vault storage
 */
async function loadMemories() {

  try {
    // Try to get memories from .emma vault first
    let vaultMemories = [];

    // Check if we have the web vault available
    if (window.emmaWebVault) {

    if (window.emmaWebVault.isOpen && window.emmaWebVault.vaultData) {

      try {
        vaultMemories = await window.emmaWebVault.listMemories(1000, 0);

          // Memories loaded successfully
        } catch (vaultError) {
          console.error('💝 GALLERY: .emma vault error:', vaultError);
        }
      } else {

      }
    }

    // Fallback to old API if no web vault
    if (vaultMemories.length === 0 && window.emmaAPI) {
      // Try memories.getAll as fallback (old API method)
      if (window.emmaAPI.memories && window.emmaAPI.memories.getAll) {
        // Fallback to legacy API
        const vaultResult = await window.emmaAPI.memories.getAll({ limit: 1000, offset: 0 });

        if (vaultResult && Array.isArray(vaultResult)) {
          vaultMemories = vaultResult;
        } else if (vaultResult && vaultResult.memories && Array.isArray(vaultResult.memories)) {
          vaultMemories = vaultResult.memories;
        }
      }
    }

    // Transform vault memories to our format
    if (vaultMemories.length > 0) {
      // Processing vault memories for people connections

      memories = await Promise.all(vaultMemories.map(async (memory, index) => {
        // Convert vault attachments to mediaItems format
        const attachments = memory.attachments || [];

        // Ensure media items are properly formatted and reconstruct URLs
        const mediaItems = await Promise.all(attachments.map(async (item) => {
          // If the item has a dataUrl but no url, use dataUrl as url
          if (item.dataUrl && !item.url) {
            item.url = item.dataUrl;
            return item;
          }

          // CRITICAL FIX: If item has vaultId but no URL, fetch thumbnail from vault
          if (!item.url && !item.dataUrl && item.vaultId && item.isPersisted) {

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

        const transformedMemory = {
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
          mediaItems: mediaItems, // Preserve media items with URL fixing
          metadata: memory.metadata || {} // CRITICAL: Preserve metadata for people connections!
        };

        // Memory transformed with people metadata
        
        return transformedMemory;
      }));

      // Debug: Log media items for each memory
      memories.forEach((memory, index) => {
        if (memory.mediaItems && memory.mediaItems.length > 0) {
          // Media items processed for memory
        }
      });
    } else {

      // Check local storage for wizard-created memories
      try {
        const localMemories = JSON.parse(localStorage.getItem('emma_memories') || '[]');
        if (localMemories.length > 0) {

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

          memories = [];
        }
      } catch (localError) {
        console.error('💝 GALLERY: Error loading local memories:', localError);
        memories = [];
      }
    }

    // Render immediately
    setTimeout(async () => {
      await renderMemories();
    }, 100);

  } catch (error) {
    console.error('💝 GALLERY: Error loading vault memories:', error);

    memories = [];
    setTimeout(async () => {
      await renderMemories();
    }, 100);
  }
}

/**
 * Render memories in the grid
 */
async function renderMemories() {

  // Handle empty state
  if (memories.length === 0) {
    renderEmptyState();
    return;
  }

  const memoriesGrid = document.getElementById('memories-grid');
  if (!memoriesGrid) return;

  // Clear grid
  memoriesGrid.innerHTML = '';

  // Create cards asynchronously with staggered animation
  for (let i = 0; i < memories.length; i++) {
    const memory = memories[i];
    const card = await createMemoryCardElement(memory);
    
    // Add staggered fade-in animation
    card.style.opacity = '0';
    card.style.animation = `fadeInUp 0.6s ease ${i * 0.1}s forwards`;
    
    memoriesGrid.appendChild(card);
  }

  // Add animation keyframes if not already added
  if (!document.querySelector('#gallery-animations')) {
    const style = document.createElement('style');
    style.id = 'gallery-animations';
    style.textContent = `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Legacy function removed - using createMemoryCardElement instead

/**
 * Create memory card as DOM element (async version)
 */
async function createMemoryCardElement(memory) {
  const date = new Date(memory.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const favoriteIcon = memory.favorite ? '❤️' : '';

  // Create card element
  const card = document.createElement('div');
  card.className = 'memory-card';
  card.setAttribute('data-memory-id', memory.id);

  // Create slideshow background if memory has images
  if (memory.mediaItems && memory.mediaItems.length > 0) {
    const slideshow = createMemorySlideshow(memory);
    if (slideshow) {
      card.appendChild(slideshow);
    }
  }

  // Create info overlay at bottom
  const infoOverlay = document.createElement('div');
  infoOverlay.className = 'memory-info-overlay';

  // Left side: Text content
  const textContent = document.createElement('div');
  textContent.className = 'memory-text-content';

  const title = document.createElement('h3');
  title.className = 'memory-title';
  title.innerHTML = escapeHtml(memory.title) + (favoriteIcon ? ' ' + favoriteIcon : '');

  const excerpt = document.createElement('p');
  excerpt.className = 'memory-excerpt';
  excerpt.textContent = cleanExcerptForPreview(memory.excerpt);

  const dateDiv = document.createElement('div');
  dateDiv.className = 'memory-date';
  dateDiv.textContent = formattedDate;

  // Tags
  const tagsDiv = document.createElement('div');
  tagsDiv.className = 'memory-tags';
  memory.tags.slice(0, 2).forEach(tag => {
    const tagSpan = document.createElement('span');
    tagSpan.className = 'memory-tag';
    tagSpan.textContent = tag;
    tagsDiv.appendChild(tagSpan);
  });

  textContent.appendChild(title);
  textContent.appendChild(excerpt);
  textContent.appendChild(dateDiv);
  if (memory.tags.length > 0) {
    textContent.appendChild(tagsDiv);
  }

  // Right side: People avatars
  const peopleAvatars = await createMemoryPeopleAvatars(memory);

  // Assemble overlay
  infoOverlay.appendChild(textContent);
  infoOverlay.appendChild(peopleAvatars);

  // Assemble card
  card.appendChild(infoOverlay);

  // Add click handler with proper event handling
  card.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Increase delay to ensure modal setup completes before any potential close events
    setTimeout(() => {
      openMemoryDetail(memory);
    }, 150);
  });

  return card;
}

/**
 * Create memory slideshow background
 */
function createMemorySlideshow(memory) {
  try {
    // Get image attachments
    const images = memory.mediaItems.filter(item => 
      item.type && item.type.startsWith('image/') && item.url
    );

    if (images.length === 0) return null;

    // Create slideshow container
    const slideshow = document.createElement('div');
    slideshow.className = 'memory-slideshow-bg';

    // Create slides (limit to 3 for performance)
    images.slice(0, 3).forEach((image, index) => {
      const slide = document.createElement('div');
      slide.className = 'memory-slide-bg';
      slide.style.backgroundImage = `url(${image.url})`;
      
      // First slide active
      if (index === 0) {
        slide.classList.add('active');
      }
      
      slideshow.appendChild(slide);
    });

    // Start carousel if multiple slides with VARIABLE timing
    if (images.length > 1) {
      let currentSlide = 0;
      
      // Random interval between 3-7 seconds for natural feel
      const randomInterval = 3000 + Math.random() * 4000;
      
      // Add random delay before starting (0-2 seconds)
      const startDelay = Math.random() * 2000;
      
      setTimeout(() => {
        setInterval(() => {
          const slides = slideshow.querySelectorAll('.memory-slide-bg');
          if (slides.length > 1) {
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
          }
        }, randomInterval);
      }, startDelay);
    }

    return slideshow;

  } catch (error) {
    console.error('❌ Error creating memory slideshow:', error);
    return null;
  }
}

/**
 * Create people avatars for memory card
 */
async function createMemoryPeopleAvatars(memory) {
  const avatarsContainer = document.createElement('div');
  avatarsContainer.className = 'memory-people-avatars';

  try {
    // Creating people avatars for memory connections

    // Get people connected to this memory
    if (!memory.metadata || !memory.metadata.people || !Array.isArray(memory.metadata.people)) {
      // No people connected to this memory
      return avatarsContainer; // Empty container
    }

    // Found people connections in memory metadata

    // Load people data from vault
    if (!window.emmaWebVault || !window.emmaWebVault.isOpen || !window.emmaWebVault.vaultData) {
      console.warn('👥 Vault not available for people lookup');
      return avatarsContainer;
    }

    const vaultData = window.emmaWebVault.vaultData;
    const peopleData = vaultData.content?.people || {};
    
    // Available people loaded from vault

    // Create avatars for connected people (limit to 3)
    const connectedPeople = memory.metadata.people.slice(0, 3);
    
    for (const personId of connectedPeople) {
      const person = peopleData[personId];
      if (!person) {
        console.warn('👥 Person not found in vault:', personId);
        continue;
      }

      // Creating avatar for person

      const avatar = document.createElement('div');
      avatar.className = 'memory-person-avatar';
      avatar.title = person.name;

      // Start with letter
      avatar.textContent = person.name.charAt(0).toUpperCase();

      // Try to load person's avatar if they have one
      if (person.avatarUrl) {
        const img = document.createElement('img');
        img.src = person.avatarUrl;
        img.alt = `${person.name} avatar`;
        img.onload = () => {
          avatar.innerHTML = '';
          avatar.appendChild(img);
        };
        img.onerror = () => {
          // Keep letter fallback
        };
      } else if (person.avatarId) {
        try {
          // Load from vault
          const avatarData = await window.emmaWebVault.getMedia(person.avatarId);
          if (avatarData) {
            const blob = new Blob([avatarData], { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);
            
            const img = document.createElement('img');
            img.src = url;
            img.alt = `${person.name} avatar`;
            img.onload = () => {
              avatar.innerHTML = '';
              avatar.appendChild(img);
            };
          }
        } catch (error) {
          console.error('❌ Failed to load person avatar:', error);
        }
      }

      avatarsContainer.appendChild(avatar);
    }

    // Avatars container created successfully
    return avatarsContainer;

  } catch (error) {
    console.error('❌ Error creating people avatars:', error);
    return avatarsContainer;
  }
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
}/**
 * Open memory detail view
 */
/**
 * Open memory detail modal - Uses external modal system
 */
function openMemoryDetail(memory) {
  // Use external modal system
  if (typeof openMemoryDetailModal === 'function') {
    return openMemoryDetailModal(memory);
  } else {
    console.error('❌ GALLERY: Memory modal system not loaded!');
    alert('Memory detail modal not available. Please refresh the page.');
  }
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
        Start capturing your precious memories! Use Emma chat to create your first memory capsule.
      </p>
      
      <div class="empty-cta-box">
        <div class="empty-cta-icon">💬</div>
        <div class="empty-cta-content">
          <h3 class="empty-cta-title">Chat with Emma</h3>
          <p class="empty-cta-text">Tell Emma about your memories and she'll help you create beautiful memory capsules</p>
        </div>
      </div>
      
      <button id="empty-chat-btn" class="btn btn-primary" style="margin-top: 20px;">
        <span class="btn-icon">💬</span>
        Chat with Emma
      </button>
    </div>
  `;
  
  // Wire up the chat button to open Emma chat
  const chatBtn = document.getElementById('empty-chat-btn');
  if (chatBtn) {
    chatBtn.addEventListener('click', openEmmaChat);
  }
}

/**
 * Open Emma Chat for creating memories
 */
function openEmmaChat() {
  // Opening Emma chat interface
  
  // Use the modern Emma chat experience
  if (window.EmmaChatExperience) {
    // Using modern Emma Chat Experience
    const emmaChatExperience = new window.EmmaChatExperience();
    emmaChatExperience.show();
  } else if (window.OrbExperienceManager) {
    // Fallback to orb experience manager
    const experienceManager = window.OrbExperienceManager.getInstance();
    // Create a dummy orb element for the chat to position relative to
    const dummyOrb = document.createElement('div');
    dummyOrb.style.cssText = 'position: fixed; top: 50%; left: 50%; width: 1px; height: 1px; z-index: -1;';
    document.body.appendChild(dummyOrb);
    experienceManager.handleOrbClick('default', dummyOrb);
    // Clean up dummy orb after a delay
    setTimeout(() => {
      if (dummyOrb.parentNode) {
        dummyOrb.parentNode.removeChild(dummyOrb);
      }
    }, 1000);
  } else {
    console.warn('💬 GALLERY: No Emma chat system available, navigating to dashboard');
    // Fallback - navigate back to dashboard where Emma orb is available
    window.location.href = '../dashboard.html';
  }
}

/**
 * Create a new empty memory for editing
 */
async function createNewMemory() {
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
  await renderMemories();

  // Automatically open the new memory for editing
  setTimeout(() => {
    openMemoryDetail(newMemory);
  }, 100);
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

// Gallery initialized - ready to display memories
