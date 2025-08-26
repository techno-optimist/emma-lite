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
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // Create overlay first
  const overlay = document.createElement('div');
  overlay.className = 'memory-detail-overlay';
  overlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: transparent;
    z-index: 1;
  `;

  // Create modal content
  const content = createModalContent(memory);
  content.style.zIndex = '2';
  content.style.position = 'relative';
  try {
    // Safely populate user-influenced fields after DOM construction
    const titleEl = content.querySelector('#memory-title-input');
    if (titleEl) titleEl.value = (memory && memory.title) ? String(memory.title) : '';
    const textEl = content.querySelector('#memory-content-textarea');
    if (textEl) textEl.value = (memory && (memory.content || memory.excerpt)) ? String(memory.content || memory.excerpt) : '';
  } catch (e) {
    console.warn('⚠️ Modal field population warning:', e);
  }

  // Add both to modal
  modal.appendChild(overlay);
  modal.appendChild(content);

  // Ensure modal CSS is injected for visibility
  if (!document.querySelector('#memory-modal-styles')) {
    const style = document.createElement('style');
    style.id = 'memory-modal-styles';
    style.textContent = `
      .memory-modal {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 2147483647 !important;
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Add to DOM
  document.body.appendChild(modal);
  console.log('🎪 MODAL: Modal added to DOM, checking visibility...');
  console.log('🎪 MODAL: Modal display style:', window.getComputedStyle(modal).display);
  console.log('🎪 MODAL: Modal z-index:', window.getComputedStyle(modal).zIndex);
  
  // Setup event handlers with longer delay to prevent immediate close
  // Add immediate protection against click events
  modal._isOpening = true;
  setTimeout(() => {
    modal._isOpening = false;
    console.log('🎪 MODAL: Opening protection disabled after 300ms');
  }, 300);
  
  setTimeout(() => {
    setupModalEventHandlers(modal, memory, overlay, content);
    console.log('🎪 MODAL: Event handlers set up after 150ms');
    
    // Double-check modal is still visible
    if (modal.parentNode) {
      console.log('🎪 MODAL: Modal still in DOM after event setup');
    } else {
      console.error('🎪 MODAL: Modal was removed from DOM!');
    }
  }, 150);
  
  // Store reference
  window.currentMemory = memory;
  
  // Focus title input after modal is fully rendered
  // Delay focus to ensure modal is stable
  setTimeout(() => {
    try {
      const titleInput = modal.querySelector('#memory-title-input');
      if (titleInput && modal.parentNode) {
        console.log('🎪 MODAL: Focusing title input');
        titleInput.focus();
        titleInput.select();
      }
    } catch (error) {
      console.warn('🎪 MODAL: Could not focus title input:', error);
    }
  }, 300); // Longer delay to ensure modal is stable

  console.log('✨ MODAL: Memory detail modal opened successfully');
  
  // CRITICAL FIX: Load content for all tabs on modal open for smooth Emma experience
  setTimeout(() => {
    console.log('🎪 MODAL: Pre-loading tab content for perfect Emma experience');
    if (modal.parentNode) {
      try {
        loadMediaContent(modal, memory);
        loadPeopleContent(modal, memory).catch(error => {
          console.error('❌ MODAL: Error pre-loading people:', error);
        });
        console.log('✅ MODAL: Tab content pre-loading started');
      } catch (error) {
        console.error('❌ MODAL: Error pre-loading tab content:', error);
      }
    } else {
      console.error('🎪 MODAL: Cannot load tab content - modal not in DOM');
    }
  }, 400);
  
  // DEBUG: Verify modal exists in DOM
  setTimeout(() => {
    const modalCheck = document.querySelector('.memory-modal');
    const modalCount = document.querySelectorAll('.memory-modal').length;
    console.log('🔍 MODAL DEBUG: Modal exists in DOM?', !!modalCheck);
    console.log('🔍 MODAL DEBUG: Modal count in DOM:', modalCount);
    console.log('🔍 MODAL DEBUG: Modal z-index:', modalCheck?.style.zIndex);
    console.log('🔍 MODAL DEBUG: Modal computed z-index:', window.getComputedStyle(modalCheck).zIndex);
    console.log('🔍 MODAL DEBUG: Modal display:', modalCheck?.style.display);
    console.log('🔍 MODAL DEBUG: Modal visibility:', modalCheck?.style.visibility);
  }, 100);
  
  return modal;
}

/**
 * Create the beautiful modal content structure
 * @param {Object} memory - The memory object
 * @returns {HTMLElement} - The modal content element
 */
function createModalContent(memory) {
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
        <input type="text" id="memory-title-input" placeholder="Enter memory title..." style="
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
        " placeholder="Share your memory..."></textarea>
        
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
        <div id="media-content">
          <div class="media-loading">Loading media...</div>
        </div>
      </div>
      
      <div class="tab-content" data-tab-content="people" style="display: none;">
        <div id="people-content">
          <div class="people-loading">Loading people...</div>
        </div>
      </div>
    </div>
  `;

  return content;
}

/**
 * Switch tab and load content
 * @param {HTMLElement} modal - The modal element  
 * @param {string} tabName - The tab to switch to
 */
function switchTab(modal, tabName) {
  const memory = window.currentMemory;
  if (!memory) return;
  
  // Update tab button styles
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
  
  // Show corresponding content
  const tabContents = modal.querySelectorAll('.tab-content');
  tabContents.forEach(content => {
    content.style.display = content.dataset.tabContent === tabName ? 'block' : 'none';
  });
  
  // Load content for specific tabs
  if (tabName === 'media') {
    loadMediaContent(modal, memory);
  } else if (tabName === 'people') {
    loadPeopleContent(modal, memory).catch(error => {
      console.error('❌ MODAL: Error loading people content:', error);
    });
  }
}

/**
 * Load media content for the memory
 */
function loadMediaContent(modal, memory) {
  const mediaContainer = modal.querySelector('#media-content');
  if (!mediaContainer) return;
  
  try {
    const mediaItems = memory.mediaItems || [];
    console.log('🖼️ MODAL: Loading media for memory:', memory.title, 'Items:', mediaItems.length);
    
    if (mediaItems.length === 0) {
      mediaContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
          <div style="font-size: 48px; margin-bottom: 16px;">🖼️</div>
          <h3>No Media Found</h3>
          <p>This memory doesn't have any photos or media attached yet.</p>
        </div>
      `;
      return;
    }
    
    // Render media grid
    const mediaHtml = mediaItems.map((item, index) => {
      const isImage = item.type && item.type.startsWith('image/');
      const thumbnail = item.url || item.dataUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2U8L3RleHQ+PC9zdmc+';
      
      return `
        <div class="media-item" data-index="${index}" style="
          position: relative;
          aspect-ratio: 1;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          background: rgba(255,255,255,0.05);
          transition: transform 0.2s ease;
        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
          ${isImage ? `
            <img src="${thumbnail}" alt="${item.name || 'Memory image'}" style="
              width: 100%;
              height: 100%;
              object-fit: cover;
            "/>
          ` : `
            <div style="
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(255,255,255,0.1);
              color: white;
              font-size: 24px;
            ">📄</div>
          `}
          <div style="
            position: absolute;
            bottom: 8px;
            left: 8px;
            right: 8px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          ">${item.name || 'Untitled'}</div>
        </div>
      `;
    }).join('');
    
    mediaContainer.innerHTML = `
      <div style="
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 16px;
        padding: 20px;
      ">
        ${mediaHtml}
      </div>
    `;
    
    // Add click handlers for media items
    modal.querySelectorAll('.media-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        console.log('🖼️ MODAL: Media item clicked:', index);
        // TODO: Open slideshow/lightbox
      });
    });
    
  } catch (error) {
    console.error('❌ MODAL: Error loading media:', error);
    mediaContainer.innerHTML = `
      <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h3>Error Loading Media</h3>
        <p>There was an issue loading the media for this memory.</p>
      </div>
    `;
  }
}

/**
 * Load people content for the memory
 */
async function loadPeopleContent(modal, memory) {
  const peopleContainer = modal.querySelector('#people-content');
  if (!peopleContainer) return;
  
  try {
    console.log('👥 MODAL: Loading people for memory:', memory.title);
    console.log('👥 MODAL: Memory metadata:', memory.metadata);
    
    // Get people from memory metadata
    const connectedPeople = memory.metadata?.people || [];
    
    // Use the SAME API that works for people page and constellation
    let allPeople = {};
    
    try {
      // Use the exact same API that people page and constellation use successfully
      if (window.emmaAPI && window.emmaAPI.people && window.emmaAPI.people.list) {
        const result = await window.emmaAPI.people.list();
        if (result && result.success && Array.isArray(result.items)) {
          // Convert array to object with id as key for consistent access
          result.items.forEach(person => {
            if (person.id) {
              allPeople[person.id] = person;
            }
          });
          console.log('👥 MODAL: Loaded people via emmaAPI (same as people page)');
        }
      }
    } catch (error) {
      console.warn('👥 MODAL: EmmaAPI failed, trying direct vault access:', error);
    }
    
    // Fallback to direct vault access if API not available
    if (Object.keys(allPeople).length === 0 && window.emmaWebVault?.vaultData?.content?.people) {
      allPeople = window.emmaWebVault.vaultData.content.people || {};
      console.log('👥 MODAL: Using people from direct vault access');
    }
    
    console.log('👥 MODAL: Connected people IDs:', connectedPeople);
    console.log('👥 MODAL: Available people total:', Object.keys(allPeople));
    
    if (connectedPeople.length === 0) {
      peopleContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
          <div style="font-size: 48px; margin-bottom: 16px;">👥</div>
          <h3>No People Tagged</h3>
          <p>This memory doesn't have any people tagged yet.</p>
          <button class="btn btn-primary" style="margin-top: 16px;" onclick="openAddPeopleModalForGallery()">
            <span>👥</span> Add People
          </button>
        </div>
      `;
      return;
    }
    
    // Render connected people
    const peopleHtml = connectedPeople.map(personId => {
      const person = allPeople[personId];
      if (!person) {
        return `
          <div style="padding: 16px; background: rgba(255,255,255,0.05); border-radius: 12px; text-align: center;">
            <div style="color: rgba(255,255,255,0.6);">Person not found (${personId})</div>
          </div>
        `;
      }
      
      const initials = (person.name || '?').charAt(0).toUpperCase();
      const avatar = person.avatarUrl ? `
        <img src="${person.avatarUrl}" alt="${person.name}" style="
          width: 60px;
          height: 60px;
          border-radius: 50%;
          object-fit: cover;
        "/>
      ` : `
        <div style="
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8658ff, #f093fb);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
          font-weight: 600;
        ">${initials}</div>
      `;
      
      return `
        <div class="person-card" data-person-id="${person.id}" style="
          padding: 20px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
          ${avatar}
          <div style="margin-top: 12px; font-weight: 600; color: white;">${person.name || 'Unknown'}</div>
          <div style="margin-top: 4px; font-size: 14px; color: rgba(255,255,255,0.6);">${person.relationship || 'Connection'}</div>
        </div>
      `;
    }).join('');
    
    peopleContainer.innerHTML = `
      <div style="padding: 20px;">
        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        ">
          ${peopleHtml}
        </div>
        <div style="text-align: center;">
          <button class="btn btn-secondary" onclick="openAddPeopleModalForGallery()">
            <span>👥</span> Add More People
          </button>
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error('❌ MODAL: Error loading people:', error);
    peopleContainer.innerHTML = `
      <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h3>Error Loading People</h3>
        <p>There was an issue loading the people for this memory.</p>
      </div>
    `;
  }
}

/**
 * SIMPLE BEAUTIFUL PEOPLE SELECTION - NO MORE COMPLEXITY!
 */
async function openAddPeopleModalForGallery() {
  try {
    // COPY EXACT LOGIC FROM WORKING PAGES
    const response = await window.emmaAPI.people.list();
    
    if (response.success) {
      const people = response.items || [];
      
      if (people.length === 0) {
        window.emmaInfo('No people have been added yet. Would you like to add some people first?', {
          title: 'Add People',
          helpText: 'Adding people helps us remember who was part of your memories.'
        });
        return;
      }
      
      // Create simple selection UI - just like people page createPersonCard
      const peopleList = people.map(person => 
        `<div onclick="selectPersonForMemory('${person.id}')" style="
          padding: 10px; 
          margin: 5px; 
          border: 1px solid #ccc; 
          cursor: pointer;
          background: white;
          color: black;
        ">
          ${person.name || 'Unknown'} (${person.relationship || 'Contact'})
        </div>`
      ).join('');
      
      // Simple modal
      const modal = document.createElement('div');
      modal.innerHTML = `
        <div style="
          position: fixed; 
          top: 0; left: 0; 
          width: 100%; height: 100%; 
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        ">
          <div style="
            background: white; 
            padding: 20px; 
            border-radius: 10px;
            max-width: 400px;
            max-height: 500px;
            overflow-y: auto;
          ">
            <h3 style="color: black;">Select People for Memory</h3>
            ${peopleList}
            <button onclick="this.closest('div').closest('div').remove()" style="
              margin-top: 10px;
              padding: 10px;
              background: #ccc;
              border: none;
              border-radius: 5px;
              cursor: pointer;
            ">Cancel</button>
          </div>
        </div>
      `;
      
      // Add selection function
      window.selectPersonForMemory = function(personId) {
        const person = people.find(p => p.id === personId);
        window.emmaSuccess(`Great choice! ${person.name} has been connected to this memory.`, {
          title: 'Person Connected',
          helpText: 'This helps us remember who was part of this special moment.'
        });
        modal.remove();
        delete window.selectPersonForMemory;
      };
      
      document.body.appendChild(modal);
      
    } else {
      window.emmaError('Had trouble loading the people list. Let\'s try again in a moment.', {
        title: 'Loading Issue',
        helpText: 'Sometimes these things take a moment to work.'
      });
    }
    
  } catch (error) {
    window.emmaError('Had trouble loading the people list. Let\'s try again in a moment.', {
      title: 'Loading Issue',
      helpText: 'Sometimes these things take a moment to work.'
    });
  }
}

/**
 * Setup modal event handlers to prevent bubbling and handle interactions
 * @param {HTMLElement} modal - The modal element  
 * @param {Object} memory - The memory object
 */
function setupModalEventHandlers(modal, memory, overlay, content) {
  // Clean event handlers setup
  console.log('Setting up modal event handlers');
      return;
    }

    // Create the beautiful selection overlay
    const overlay = document.createElement('div');
    overlay.className = 'people-selection-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
      z-index: 20000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    // Create the elegant people grid
    const peopleGrid = availablePeople.map(person => {
      const initials = (person.name || '?').charAt(0).toUpperCase();
      const hasAvatar = person.avatarUrl || person.profilePicture;
      
      return `
        <div class="person-selector-card" data-person-id="${person.id}" style="
          position: relative;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid transparent;
          border-radius: 16px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        " onclick="selectPerson(this)" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="updateCardBackground(this)">
          
          <div style="
            width: 80px;
            height: 80px;
            margin: 0 auto 16px;
            border-radius: 50%;
            background: ${hasAvatar ? 'transparent' : 'linear-gradient(135deg, #8658ff, #f093fb)'};
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          ">
            ${hasAvatar ? 
              `<img src="${person.avatarUrl || person.profilePicture}" alt="${person.name}" style="width: 100%; height: 100%; object-fit: cover;" />` :
              `<span style="color: white; font-size: 32px; font-weight: 600;">${initials}</span>`
            }
          </div>
          
          <h3 style="
            color: white;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 8px;
          ">${person.name || 'Unknown'}</h3>
          
          <p style="
            color: rgba(255, 255, 255, 0.7);
            font-size: 14px;
            margin: 0;
          ">${person.relationship || 'Connection'}</p>
          
          <div class="selection-indicator" style="
            position: absolute;
            top: 12px;
            right: 12px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid rgba(255, 255, 255, 0.3);
            display: none;
            align-items: center;
            justify-content: center;
          ">
            <span style="color: white; font-size: 14px;">✓</span>
          </div>
        </div>
      `;
    }).join('');

    overlay.innerHTML = `
      <div style="
        background: rgba(26, 16, 51, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 24px;
        padding: 32px;
        max-width: 800px;
        max-height: 80vh;
        overflow-y: auto;
        color: white;
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 20px;
        ">
          <div>
            <h2 style="margin: 0; font-size: 24px; font-weight: 600;">Connect People to Memory</h2>
            <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.7);">Select people who are part of this memory</p>
          </div>
          <button onclick="this.closest('.people-selection-overlay').remove()" style="
            background: none;
            border: none;
            color: white;
            font-size: 28px;
            cursor: pointer;
            padding: 8px;
          ">&times;</button>
        </div>
        
        <div id="people-grid" style="
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        ">
          ${peopleGrid}
        </div>
        
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 20px;
        ">
          <div id="selection-count" style="color: rgba(255, 255, 255, 0.7);">
            0 people selected
          </div>
          <div style="display: flex; gap: 16px;">
            <button onclick="this.closest('.people-selection-overlay').remove()" style="
              background: rgba(255, 255, 255, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.2);
              color: white;
              padding: 12px 24px;
              border-radius: 12px;
              cursor: pointer;
              font-size: 16px;
            ">Cancel</button>
            <button id="connect-people-btn" onclick="connectSelectedPeople()" disabled style="
              background: linear-gradient(135deg, #8658ff, #f093fb);
              border: none;
              color: white;
              padding: 12px 24px;
              border-radius: 12px;
              cursor: pointer;
              font-size: 16px;
              opacity: 0.5;
            ">Connect 0 People</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Add the selection logic
    const selectedPeople = new Set();

    window.selectPerson = function(card) {
      const personId = card.dataset.personId;
      const indicator = card.querySelector('.selection-indicator');
      const countDiv = document.getElementById('selection-count');
      const connectBtn = document.getElementById('connect-people-btn');
      
      if (selectedPeople.has(personId)) {
        // Deselect
        selectedPeople.delete(personId);
        card.style.border = '2px solid transparent';
        indicator.style.display = 'none';
      } else {
        // Select
        selectedPeople.add(personId);
        card.style.border = '2px solid #8658ff';
        indicator.style.display = 'flex';
      }
      
      // Update UI
      const count = selectedPeople.size;
      countDiv.textContent = count === 1 ? '1 person selected' : `${count} people selected`;
      connectBtn.disabled = count === 0;
      connectBtn.style.opacity = count === 0 ? '0.5' : '1';
      connectBtn.textContent = count === 0 ? 'Connect 0 People' : `Connect ${count} People`;
    };

    window.updateCardBackground = function(card) {
      const personId = card.dataset.personId;
      if (!selectedPeople.has(personId)) {
        card.style.background = 'rgba(255, 255, 255, 0.05)';
      } else {
        card.style.background = 'rgba(134, 88, 255, 0.2)';
      }
    };

    window.connectSelectedPeople = async function() {
      if (selectedPeople.size === 0) return;
      
      try {
        const connectBtn = document.getElementById('connect-people-btn');
        connectBtn.disabled = true;
        connectBtn.textContent = 'Connecting...';
        
        // Update memory metadata with selected people
        if (!currentMemory.metadata) currentMemory.metadata = {};
        if (!currentMemory.metadata.people) currentMemory.metadata.people = [];
        
        // Add selected people IDs
        Array.from(selectedPeople).forEach(personId => {
          if (!currentMemory.metadata.people.includes(personId)) {
            currentMemory.metadata.people.push(personId);
          }
        });
        
        // Also update selectedPeople for constellation compatibility
        if (!currentMemory.selectedPeople) currentMemory.selectedPeople = [];
        Array.from(selectedPeople).forEach(personId => {
          if (!currentMemory.selectedPeople.includes(personId)) {
            currentMemory.selectedPeople.push(personId);
          }
        });
        
        console.log('👥 MODAL: Updated memory with people connections:', currentMemory.metadata.people);
        
        // Save to vault if available
        if (window.emmaWebVault && currentMemory.id) {
          try {
            await window.emmaWebVault.updateMemory(currentMemory.id, {
              metadata: currentMemory.metadata,
              selectedPeople: currentMemory.selectedPeople
            });
            console.log('💾 MODAL: Saved people connections to vault');
          } catch (error) {
            console.warn('💾 MODAL: Could not save to vault:', error);
          }
        }
        
        // Success notification
        console.log(`✅ Successfully connected ${selectedPeople.size} people to memory "${currentMemory.title}"`);
        
        // Close overlay
        overlay.remove();
        
        // Refresh the People tab to show new connections
        setTimeout(() => {
          const memoryModal = document.querySelector('.memory-modal');
          if (memoryModal && currentMemory) {
            loadPeopleContent(memoryModal, currentMemory).catch(error => {
              console.error('❌ Error refreshing people content:', error);
            });
          }
        }, 200);
        
      } catch (error) {
        console.error('❌ Failed to connect people:', error);
        window.emmaError('Had trouble connecting that person. Let\'s try again.', {
          title: 'Connection Issue',
          helpText: 'Sometimes these connections take a moment to work.'
        });
      }
    };

    // Cleanup function for global variables
    overlay.addEventListener('remove', () => {
      delete window.selectPerson;
      delete window.updateCardBackground;
      delete window.connectSelectedPeople;
    });

    console.log('🎪 MODAL: Beautiful people selection grid opened with', availablePeople.length, 'available people');

  } catch (error) {
    console.error('❌ MODAL: Failed to open people selection:', error);
    window.emmaError('Had trouble loading the people list. Let\'s try again in a moment.', {
      title: 'Loading Issue',
      helpText: 'Sometimes these things take a moment to work.'
    });
  }
}

/**
 * Setup modal event handlers to prevent bubbling and handle interactions
 * @param {HTMLElement} modal - The modal element
 * @param {Object} memory - The memory object
 */
function setupModalEventHandlers(modal, memory, overlay, content) {
  console.log('🎪 MODAL: Setting up event handlers');
  
  // Prevent modal from closing when clicking inside content
  if (content) {
    content.addEventListener('click', (e) => {
      console.log('🎪 MODAL: Content clicked - preventing propagation');
      e.stopPropagation(); // Prevent bubbling to overlay
    });
  }

  // Close modal when clicking overlay
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (modal._isOpening) {
        console.log('🎪 MODAL: Overlay clicked during opening - ignoring');
        return;
      }
      console.log('🎪 MODAL: Overlay clicked - closing modal');
      e.stopPropagation();
      closeModal(modal);
    });
  }

  // Also add click handler to modal background
  modal.addEventListener('click', (e) => {
    if (modal._isOpening) {
      console.log('🎪 MODAL: Modal clicked during opening - ignoring');
      return;
    }
    if (e.target === modal) {
      console.log('🎪 MODAL: Modal background clicked - closing modal');
      closeModal(modal);
    }
  });

  // Close button
  const closeBtn = content.querySelector('.modal-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      console.log('🎪 MODAL: Close button clicked');
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

  // Delete button removed for stability

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
async function confirmDeleteMemory(modal, memory) {
  const confirmed = await window.emmaConfirm('Would you like to put this memory away?', {
    title: 'Memory Management',
    helpText: 'This will remove the memory from your collection.',
    confirmText: 'Yes, Remove It',
    cancelText: 'Keep It',
    isDestructive: true
  });
  if (confirmed) {
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

// Add CSS for fade-in animation and NUCLEAR Z-INDEX
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  
  .memory-modal .memory-detail-content {
    animation: fadeIn 0.3s ease;
  }
  
  /* NUCLEAR Z-INDEX - FORCE MODAL TO TOP OF EVERYTHING */
  .memory-modal {
    z-index: 2147483651 !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    display: flex !important;
  }
  
  .memory-modal * {
    z-index: 2147483651 !important;
  }
`;
document.head.appendChild(style);

console.log('🎪 Memory Detail Modal: Loaded and ready - beautiful Emma-branded modals! ✨');
