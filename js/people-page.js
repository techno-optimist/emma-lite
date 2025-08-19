/**
 * People Page Management with Cryptographic Identity
 */

// Import identity crypto functions
let generateIdentity, generateIdentityCard;
let p2pManager;

// Initialize crypto and P2P modules
async function initializeCrypto() {
  try {
    const cryptoModule = await import('./vault/identity-crypto.js');
    generateIdentity = cryptoModule.generateIdentity;
    generateIdentityCard = cryptoModule.generateIdentityCard;
    console.log('✅ Identity crypto module loaded successfully');
    
    // Initialize P2P manager
    const p2pModule = await import('./p2p/p2p-manager.js');
    p2pManager = p2pModule.p2pManager;
    
    // Get my identity for P2P
    const myIdentity = await getMyIdentity();
    if (myIdentity) {
      await p2pManager.initialize(myIdentity);
      console.log('✅ HML Sync manager initialized');
      
      // Set up P2P event listeners
      setupP2PListeners();
    }
  } catch (error) {
    console.error('❌ Failed to load modules:', error);
    // Fallback: disable crypto features
    generateIdentity = async () => {
      throw new Error('Crypto module not available');
    };
    generateIdentityCard = () => null;
  }
}

// Get my identity from storage
async function getMyIdentity() {
  try {
    const result = await chrome.storage.local.get(['emma_my_identity']);
    return result.emma_my_identity || null;
  } catch (error) {
    // Fallback to localStorage
    const stored = localStorage.getItem('emma_my_identity');
    return stored ? JSON.parse(stored) : null;
  }
}

// Set up P2P event listeners
function setupP2PListeners() {
  if (!p2pManager) return;
  
  p2pManager.addEventListener('invitationreceived', async (event) => {
    const invitation = event.detail;
    console.log('📨 Received vault share invitation:', invitation);
    
    // Show notification
    showShareInvitationModal(invitation);
  });
  
  p2pManager.addEventListener('shareconnected', (event) => {
    const { shareId, vaultId } = event.detail;
    console.log('🔗 HML Sync share connected:', shareId, vaultId);
    
    showNotification('HML Sync: Vault share connected successfully!', 'success');
  });
  
  p2pManager.addEventListener('error', (event) => {
    console.error('❌ HML Sync error:', event.detail);
    showNotification('HML Sync connection error: ' + event.detail.error, 'error');
  });
}

// Show share invitation modal
function showShareInvitationModal(invitation) {
  // Remove any existing modals
  const existingModal = document.querySelector('.share-invitation-modal');
  if (existingModal) existingModal.remove();
  
  // Find person info
  const person = allPeople.find(p => p.keyFingerprint === invitation.issuerFingerprint);
  const personName = person?.name || 'Unknown Person';
  
  const modal = document.createElement('div');
  modal.className = 'share-invitation-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: linear-gradient(135deg, rgba(40, 30, 60, 0.98) 0%, rgba(30, 20, 50, 0.98) 100%);
    border-radius: 16px;
    padding: 32px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(134, 88, 255, 0.3);
    animation: slideUp 0.3s ease;
  `;
  
  const permissionList = Object.entries(invitation.permissions || {})
    .filter(([key, value]) => value)
    .map(([key, value]) => {
      const icons = {
        read: '👁️ View',
        write: '✏️ Edit',
        delete: '🗑️ Delete',
        share: '🔗 Share',
        admin: '👑 Admin'
      };
      return icons[key] || key;
    })
    .join(', ');
  
  modalContent.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <h2 style="margin: 0; color: #ffffff; font-size: 24px;">
        🎁 Vault Share Invitation
      </h2>
      <button class="close-invitation-modal" style="background: none; border: none; color: #cccccc; font-size: 24px; cursor: pointer;">✕</button>
    </div>
    
    <div style="margin-bottom: 24px;">
      <p style="color: #cccccc; line-height: 1.6; margin-bottom: 16px;">
        <strong style="color: #ffffff;">${escapeHtml(personName)}</strong> wants to share their vault
        <strong style="color: #8658ff;">"${escapeHtml(invitation.vaultName || 'Memory Vault')}"</strong> with you.
      </p>
      
      <div style="background: rgba(134, 88, 255, 0.1); border: 1px solid rgba(134, 88, 255, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <h4 style="margin: 0 0 8px 0; color: #8658ff;">Permissions:</h4>
        <p style="margin: 0; color: #ffffff;">${permissionList}</p>
      </div>
      
      <div style="color: #cccccc; font-size: 12px;">
        <p style="margin: 4px 0;">🔒 End-to-end encrypted</p>
        <p style="margin: 4px 0;">📅 Expires: ${new Date(invitation.expires).toLocaleDateString()}</p>
        <p style="margin: 4px 0;">🆔 From: ${escapeHtml(invitation.issuerFingerprint.substring(0, 16))}...</p>
      </div>
    </div>
    
    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button class="decline-invitation" style="
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #ffffff;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.3s;
      ">Decline</button>
      
      <button class="accept-invitation" style="
        background: linear-gradient(135deg, #8658ff 0%, #6843cc 100%);
        border: none;
        color: #ffffff;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 500;
        transition: all 0.3s;
      ">Accept & Connect</button>
    </div>
  `;
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  // Event listeners
  modal.querySelector('.close-invitation-modal').addEventListener('click', () => modal.remove());
  modal.querySelector('.decline-invitation').addEventListener('click', () => modal.remove());
  
  modal.querySelector('.accept-invitation').addEventListener('click', async () => {
    try {
      const acceptBtn = modal.querySelector('.accept-invitation');
      acceptBtn.textContent = 'Connecting...';
      acceptBtn.disabled = true;
      
      // Accept the share via P2P
      await p2pManager.acceptShare(invitation);
      
      showNotification(`Successfully connected to ${personName}'s vault!`, 'success');
      modal.remove();
      
      // Refresh the page to show new shared vault
      setTimeout(() => location.reload(), 1000);
      
    } catch (error) {
      console.error('Failed to accept share:', error);
      showNotification('Failed to accept share: ' + error.message, 'error');
      modal.remove();
    }
  });
  
  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// People Management JavaScript
let allPeople = [];
let filteredPeople = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 DOM loaded, initializing...');
  await initializeCrypto();
  loadPeople();
  handleUrlParameters();
  setupEventListeners();
});

// Setup all event listeners
function setupEventListeners() {
  console.log('🔧 Setting up event listeners...');
  
  // Add person buttons
  const addPersonBtn = document.getElementById('addPersonBtn');
  const addPersonBtnEmpty = document.getElementById('addPersonBtnEmpty');
  
  if (addPersonBtn) {
    addPersonBtn.addEventListener('click', openAddPersonModal);
  }
  
  if (addPersonBtnEmpty) {
    addPersonBtnEmpty.addEventListener('click', openAddPersonModal);
  }
  
  // Search functionality
  const searchInput = document.getElementById('searchInput');
  const relationshipFilter = document.getElementById('relationshipFilter');
  
  if (searchInput) {
    searchInput.addEventListener('input', searchPeople);
  }
  
  if (relationshipFilter) {
    relationshipFilter.addEventListener('change', searchPeople);
  }
  
  // Modal controls
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const addPersonForm = document.getElementById('addPersonForm');
  
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeAddPersonModal);
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeAddPersonModal);
  }
  
  if (addPersonForm) {
    addPersonForm.addEventListener('submit', addPerson);
  }
  
  // Close modal when clicking outside
  const modalOverlay = document.getElementById('addPersonModal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', function(e) {
      if (e.target === modalOverlay) {
        closeAddPersonModal();
      }
    });
  }
  
  // Event delegation for person cards (since they're dynamically created)
  const peopleGrid = document.getElementById('peopleGrid');
  if (peopleGrid) {
    peopleGrid.addEventListener('click', function(e) {
      // Find the person card element
      const personCard = e.target.closest('.person-card');
      if (personCard) {
        const personId = parseInt(personCard.dataset.personId);
        
        // Check if it's a share button click
        if (e.target.classList.contains('share-vault-btn') || e.target.closest('.share-vault-btn')) {
          e.stopPropagation();
          showShareVaultModal(personId);
        } else {
          // Regular person card click
          viewPerson(personId);
        }
      }
    });
  }
  
  // Event delegation for identity modal buttons (dynamically created)
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('identity-export-btn')) {
      const personId = e.target.dataset.personId;
      if (personId) {
        exportIdentity(personId);
      }
    }
    
    if (e.target.classList.contains('identity-copy-btn')) {
      const fingerprint = e.target.dataset.fingerprint;
      if (fingerprint) {
        copyFingerprint(fingerprint);
      }
    }
    
    if (e.target.classList.contains('identity-share-btn')) {
      const fingerprint = e.target.dataset.fingerprint;
      if (fingerprint) {
        shareIdentity(fingerprint);
      }
    }
    
    // Edit person button
    if (e.target.classList.contains('edit-person-btn')) {
      const personId = e.target.dataset.personId;
      if (personId) {
        enablePersonEdit(personId);
      }
    }
    
    // Save person button
    if (e.target.classList.contains('save-person-btn')) {
      const personId = e.target.dataset.personId;
      if (personId) {
        savePersonEdit(personId);
      }
    }
    
    // Cancel edit button
    if (e.target.classList.contains('cancel-edit-btn')) {
      cancelPersonEdit();
    }
    
    // Share vault button in modal
    if (e.target.classList.contains('share-vault-btn-modal')) {
      const personId = e.target.dataset.personId;
      if (personId) {
        showShareVaultModal(parseInt(personId));
      }
    }
    
    // Add person modal buttons
    if (e.target.classList.contains('close-add-person-modal')) {
      closeAddPersonModal();
    }
    
    if (e.target.classList.contains('cancel-add-person-btn')) {
      closeAddPersonModal();
    }
    
    // Person detail modal close button
    if (e.target.classList.contains('close-person-detail-modal')) {
      const modal = e.target.closest('.modal-overlay');
      if (modal) {
        modal.remove();
      }
    }
    
    if (e.target.classList.contains('submit-add-person-btn')) {
      const form = e.target.closest('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
    }
  });
  
  // Event listener for form submission in add person modal
  document.addEventListener('submit', function(e) {
    if (e.target.id === 'addPersonFormModal') {
      addPerson(e);
    }
  });
  
  console.log('✅ Event listeners set up successfully');
}

// Load people data
async function loadPeople() {
  try {
    showLoading(true);
    
    // Get people from storage (try chrome.storage first, fallback to localStorage)
    let people = [];
    try {
      const result = await chrome.storage.local.get(['emma_people']);
      people = result.emma_people || [];
      console.log('📦 Loaded from chrome.storage:', people.length, 'people');
    } catch (error) {
      console.warn('⚠️ Chrome storage failed, trying localStorage:', error);
      people = JSON.parse(localStorage.getItem('emma_people') || '[]');
      console.log('📦 Loaded from localStorage:', people.length, 'people');
    }
    
    // Also check old format for migration
    if (people.length === 0) {
      const oldPeople = localStorage.getItem('emma-people');
      if (oldPeople) {
        people = JSON.parse(oldPeople);
        console.log('🔄 Migrated', people.length, 'people from old format');
        // Save in new format
        try {
          await chrome.storage.local.set({ emma_people: people });
        } catch (error) {
          localStorage.setItem('emma_people', JSON.stringify(people));
        }
        // Remove old format
        localStorage.removeItem('emma-people');
      }
    }
    
    allPeople = people;
    
    // If no people, create some sample data
    if (allPeople.length === 0) {
      allPeople = createSamplePeople();
      // Save sample data using new storage system
      try {
        await chrome.storage.local.set({ emma_people: allPeople });
      } catch (error) {
        localStorage.setItem('emma_people', JSON.stringify(allPeople));
      }
    }
    
    filteredPeople = [...allPeople];
    displayPeople();
    updateStats();
    
  } catch (error) {
    console.error('Failed to load people:', error);
  } finally {
    showLoading(false);
  }
}

// Create sample people data
function createSamplePeople() {
  return [
    {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah@example.com",
      phone: "+1 (555) 123-4567",
      relationship: "family",
      notes: "My sister, lives in Portland. Loves hiking and photography.",
      dateAdded: new Date().toISOString()
    },
    {
      id: 2,
      name: "Mike Chen",
      email: "mike.chen@example.com",
      phone: "+1 (555) 987-6543",
      relationship: "colleague",
      notes: "Frontend developer on our team. Great at React and design.",
      dateAdded: new Date().toISOString()
    },
    {
      id: 3,
      name: "Emma Wilson",
      email: "emma.w@example.com",
      phone: "+1 (555) 456-7890",
      relationship: "best_friend",
      notes: "College roommate. Now works in marketing. Always up for coffee!",
      dateAdded: new Date().toISOString()
    }
  ];
}

// Display people
function displayPeople() {
  const peopleGrid = document.getElementById('peopleGrid');
  const emptyState = document.getElementById('emptyState');
  
  if (filteredPeople.length === 0) {
    peopleGrid.style.display = 'none';
    emptyState.style.display = 'block';
    
    const searchTerm = document.getElementById('searchInput').value;
    const relationshipFilter = document.getElementById('relationshipFilter').value;
    
    if (searchTerm || relationshipFilter !== 'all') {
      document.getElementById('emptyStateMessage').textContent = 'No people match your current filters. Try adjusting your search or filters.';
    } else {
      document.getElementById('emptyStateMessage').textContent = 'Start by adding your first person to begin building your network.';
    }
    return;
  }
  
  peopleGrid.style.display = 'grid';
  emptyState.style.display = 'none';
  
  peopleGrid.innerHTML = filteredPeople.map(person => createPersonCard(person)).join('');
}

// Create person card HTML
function createPersonCard(person) {
  const initials = person.name.split(' ').map(n => n[0]).join('').toUpperCase();
  const relationshipEmoji = getRelationshipEmoji(person.relationship);
  const relationshipLabel = getRelationshipLabel(person.relationship);
  
  // Create avatar (profile picture or initials)
  const avatarContent = person.profilePicture 
    ? `<img src="${person.profilePicture}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" alt="${escapeHtml(person.name)}">`
    : initials;
  
  return `
    <div class="person-card" data-person-id="${person.id}">
      <div class="person-avatar">${avatarContent}</div>
      <div class="person-info">
        <h3>${escapeHtml(person.name)}</h3>
        <div class="person-relationship">
          ${relationshipEmoji} ${relationshipLabel}
        </div>
        <p class="person-notes">${person.notes ? escapeHtml(person.notes) : 'No notes added yet.'}</p>
        ${person.keyFingerprint ? `
          <div class="person-crypto" style="margin-top: 8px; padding: 8px; background: rgba(134, 88, 255, 0.1); border-radius: 6px; font-size: 11px;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="color: #8658ff;">🔐</span>
              <span style="color: #ffffff;">Identity: </span>
              <code style="font-family: monospace; color: #ffffff;">${person.keyFingerprint.substring(0, 16)}...</code>
              ${person.verificationStatus === 'verified' ? '<span style="color: #28a745; margin-left: auto;">✓</span>' : 
                person.verificationStatus === 'trusted' ? '<span style="color: #ffc107; margin-left: auto;">⭐</span>' : 
                '<span style="color: #999; margin-left: auto;">○</span>'}
            </div>
          </div>
        ` : ''}
      </div>
      ${person.keyFingerprint ? `
        <button class="share-vault-btn" data-person-id="${person.id}" data-action="share" style="position: absolute; top: 10px; right: 10px; padding: 6px 12px; background: #8658ff; color: white; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">
          Share Vault
        </button>
      ` : ''}
    </div>
  `;
}

// Get relationship emoji
function getRelationshipEmoji(relationship) {
  const emojis = {
    self: '🧑',
    family: '👨‍👩‍👧‍👦',
    friend: '👫',
    best_friend: '💝',
    romantic: '💕',
    colleague: '💼'
  };
  return emojis[relationship] || '👤';
}

// Get relationship label
function getRelationshipLabel(relationship) {
  const labels = {
    self: 'Myself',
    family: 'Family',
    friend: 'Friend',
    best_friend: 'Best Friend',
    romantic: 'Romantic',
    colleague: 'Colleague'
  };
  return labels[relationship] || 'Other';
}

// Search functionality
function searchPeople() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const relationshipFilter = document.getElementById('relationshipFilter').value;
  
  filteredPeople = allPeople.filter(person => {
    const matchesSearch = searchTerm === '' || 
      person.name.toLowerCase().includes(searchTerm) ||
      person.email.toLowerCase().includes(searchTerm) ||
      person.notes.toLowerCase().includes(searchTerm);
    
    const matchesRelationship = relationshipFilter === 'all' || 
      person.relationship === relationshipFilter;
    
    return matchesSearch && matchesRelationship;
  });
  
  displayPeople();
}

// Update stats
function updateStats() {
  const totalCount = allPeople.length;
  const familyCount = allPeople.filter(p => p.relationship === 'family').length;
  const colleagueCount = allPeople.filter(p => p.relationship === 'colleague').length;
  
  document.getElementById('totalCount').textContent = totalCount;
  document.getElementById('familyCount').textContent = familyCount;
  document.getElementById('colleagueCount').textContent = colleagueCount;
}

// Show loading state
function showLoading(show) {
  const loader = document.querySelector('.loading');
  if (loader) {
    loader.style.display = show ? 'block' : 'none';
  }
}

// Handle URL parameters
function handleUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const shouldAdd = urlParams.get('add');
  
  if (shouldAdd === 'true') {
    setTimeout(() => {
      openAddPersonModal();
    }, 500);
  }
}

// Modal functions - open beautiful add person modal
function openAddPersonModal() {
  console.log('📝 Opening add person modal');
  
  // Remove existing modal if it exists
  const existingModal = document.querySelector('.add-person-modal-overlay');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create new modal with the beautiful design
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active add-person-modal-overlay';
  modal.innerHTML = `
    <div class="modal add-person-modal" style="max-width: 600px; background: rgba(20, 20, 30, 0.98); backdrop-filter: blur(20px); border: 1px solid rgba(134, 88, 255, 0.3);">
      <div class="modal-header">
        <h2 style="color: #ffffff; margin: 0;">Add New Person</h2>
        <button class="close-btn close-add-person-modal" style="color: #cccccc;">×</button>
      </div>
      
      <div style="padding: 0 32px 32px 32px;">
        <p style="color: #cccccc; margin-bottom: 24px; text-align: center;">Add someone to your network of family, friends, and connections</p>
        
        <div class="success-message" id="addPersonSuccessMessage" style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); color: #10b981; padding: 16px 20px; border-radius: 12px; margin-bottom: 24px; display: none;">
          Person added successfully!
        </div>
        
        <form id="addPersonFormModal">
          <div class="form-group">
            <label class="form-label" for="modalPersonProfilePic" style="color: #ffffff;">Profile Picture</label>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="profile-pic-preview" style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #8658ff, #b794f6); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 20px; border: 2px solid rgba(134, 88, 255, 0.3);">
                ?
              </div>
              <div style="flex: 1;">
                <input type="file" class="form-input" id="modalPersonProfilePic" accept="image/*" style="background: rgba(255, 255, 255, 0.95); color: #333333; border: 1px solid rgba(134, 88, 255, 0.2); padding: 8px 12px;">
                <div style="font-size: 12px; color: #cccccc; margin-top: 4px;">PNG, JPG up to 5MB</div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="modalPersonName" style="color: #ffffff;">Full Name *</label>
            <input type="text" class="form-input" id="modalPersonName" required placeholder="Enter full name" style="background: rgba(255, 255, 255, 0.95); color: #333333; border: 1px solid rgba(134, 88, 255, 0.2);">
          </div>

          <div class="form-group">
            <label class="form-label" for="modalPersonEmail" style="color: #ffffff;">Email Address</label>
            <input type="email" class="form-input" id="modalPersonEmail" placeholder="person@example.com" style="background: rgba(255, 255, 255, 0.95); color: #333333; border: 1px solid rgba(134, 88, 255, 0.2);">
          </div>

          <div class="form-group">
            <label class="form-label" for="modalPersonPhone" style="color: #ffffff;">Phone Number</label>
            <input type="tel" class="form-input" id="modalPersonPhone" placeholder="+1 (555) 123-4567" style="background: rgba(255, 255, 255, 0.95); color: #333333; border: 1px solid rgba(134, 88, 255, 0.2);">
          </div>

          <div class="form-group">
            <label class="form-label" for="modalPersonRelationship" style="color: #ffffff;">Relationship *</label>
            <select class="form-input" id="modalPersonRelationship" required style="background: rgba(255, 255, 255, 0.95); color: #333333; border: 1px solid rgba(134, 88, 255, 0.2);">
              <option value="">Select relationship type</option>
              <option value="self">🧑 Myself</option>
              <option value="family">👨‍👩‍👧‍👦 Family Member</option>
              <option value="friend">👫 Friend</option>
              <option value="colleague">💼 Colleague</option>
              <option value="neighbor">🏘️ Neighbor</option>
              <option value="healthcare">⚕️ Healthcare</option>
              <option value="other">🤝 Other</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="modalPersonNotes" style="color: #ffffff;">Notes</label>
            <textarea class="form-input form-textarea" id="modalPersonNotes" placeholder="Add any additional notes about this person, how you met, shared interests, etc." style="background: rgba(255, 255, 255, 0.95); color: #333333; border: 1px solid rgba(134, 88, 255, 0.2); min-height: 80px; resize: vertical; font-family: inherit;"></textarea>
          </div>

          <div style="display: flex; gap: 16px; margin-top: 32px;">
            <button type="button" class="cancel-add-person-btn" style="flex: 1; padding: 16px 24px; background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 16px; transition: all 0.3s ease;">
              Cancel
            </button>
            <button type="submit" class="submit-add-person-btn" style="flex: 1; padding: 16px 24px; background: #8658ff; color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 16px; transition: all 0.3s ease;">
              Add Person
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add profile picture preview functionality
  const profilePicInput = modal.querySelector('#modalPersonProfilePic');
  const profilePicPreview = modal.querySelector('.profile-pic-preview');
  
  if (profilePicInput && profilePicPreview) {
    profilePicInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          showNotification('Image must be smaller than 5MB', 'error');
          e.target.value = '';
          return;
        }
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          showNotification('Please select an image file', 'error');
          e.target.value = '';
          return;
        }
        
        // Preview the image
        const reader = new FileReader();
        reader.onload = function(e) {
          profilePicPreview.innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        };
        reader.readAsDataURL(file);
      } else {
        // Reset to default
        profilePicPreview.innerHTML = '?';
      }
    });
  }
  
  // Focus on first input
  setTimeout(() => {
    const firstInput = modal.querySelector('#modalPersonName');
    if (firstInput) firstInput.focus();
  }, 100);
}

function closeAddPersonModal() {
  const modal = document.querySelector('.add-person-modal-overlay');
  if (modal) {
    modal.remove();
  }
}

// Add person - updated for new modal
async function addPerson(event) {
  console.log('🔍 addPerson called with event:', event);
  event.preventDefault();
  
  const modal = document.querySelector('.add-person-modal-overlay');
  if (!modal) {
    console.error('❌ Add person modal not found');
    return;
  }
  
  try {
    // Show loading state
    const submitButton = modal.querySelector('.submit-add-person-btn');
    const originalText = submitButton?.textContent || 'Add Person';
    if (submitButton) {
      submitButton.textContent = 'Generating identity...';
      submitButton.disabled = true;
    }
    
    // Handle profile picture
    let profilePicture = null;
    const profilePicInput = modal.querySelector('#modalPersonProfilePic');
    if (profilePicInput?.files?.[0]) {
      const file = profilePicInput.files[0];
      const reader = new FileReader();
      profilePicture = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    }

    const newPerson = {
      id: Date.now(),
      name: modal.querySelector('#modalPersonName')?.value?.trim() || '',
      email: modal.querySelector('#modalPersonEmail')?.value?.trim() || '',
      phone: modal.querySelector('#modalPersonPhone')?.value?.trim() || '',
      relationship: modal.querySelector('#modalPersonRelationship')?.value || '',
      notes: modal.querySelector('#modalPersonNotes')?.value?.trim() || '',
      profilePicture: profilePicture,
      dateAdded: new Date().toISOString()
    };
    
    if (!newPerson.name || !newPerson.relationship) {
      showNotification('Please fill in all required fields.', 'error');
      if (submitButton) {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
      }
      return;
    }
    
    // Generate cryptographic identity
    console.log('🔐 Generating identity...');
    let identity = null;
    try {
      identity = await generateIdentity();
      console.log('✅ Identity generated:', identity?.fingerprint?.substring(0, 20) + '...');
      
      // Add crypto fields to person
      newPerson.publicSigningKey = identity.signing.publicKey;
      newPerson.publicEncryptionKey = identity.encryption.publicKey;
      newPerson.keyFingerprint = identity.fingerprint;
      newPerson.keyCreatedAt = identity.createdAt;
      newPerson.verificationStatus = 'unverified';
      
      // Store private keys for self
      if (newPerson.relationship === 'self') {
        await storeOwnIdentity(newPerson.id, identity);
      }
    } catch (identityError) {
      console.warn('⚠️ Identity generation failed, continuing without crypto:', identityError);
    }
    
    // Get existing people
    let people = [];
    try {
      const result = await chrome.storage.local.get(['emma_people']);
      people = result.emma_people || JSON.parse(localStorage.getItem('emma_people') || '[]');
    } catch (error) {
      people = JSON.parse(localStorage.getItem('emma_people') || '[]');
    }
    
    // Add new person
    people.push(newPerson);
    
    // Save to storage
    try {
      await chrome.storage.local.set({ emma_people: people });
    } catch (error) {
      localStorage.setItem('emma_people', JSON.stringify(people));
    }
    
    // Update global variable
    allPeople = people;
    
    // Show success message in modal
    const successMessage = modal.querySelector('#addPersonSuccessMessage');
    if (successMessage) {
      successMessage.innerHTML = `
        <p><strong>✅ ${newPerson.name} added successfully!</strong></p>
        ${newPerson.relationship === 'self' ? `
          <div style="margin-top: 10px; padding: 10px; background: rgba(134, 88, 255, 0.1); border-radius: 8px;">
            <p style="margin: 0 0 5px 0;"><strong>🔐 Cryptographic Identity Created</strong></p>
            <p style="margin: 0; font-size: 12px;">Fingerprint: <code>${identity?.fingerprint?.substring(0, 20) || 'N/A'}...</code></p>
          </div>
        ` : ''}
      `;
      successMessage.style.display = 'block';
    }
    
    // Reset form
    const form = modal.querySelector('#addPersonFormModal');
    if (form) form.reset();
    
    // Restore button
    if (submitButton) {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    }
    
    // Refresh display
    displayPeople();
    
    // Close modal after delay
    setTimeout(() => {
      closeAddPersonModal();
    }, 2000);
    
    // Show identity card for self
    if (newPerson.relationship === 'self' && identity) {
      setTimeout(() => {
        showIdentityCard(newPerson, identity);
      }, 2500);
    }
    
    console.log('✅ Person added successfully:', newPerson);
  } catch (error) {
    console.error('❌ Failed to add person:', error);
    showNotification('Failed to add person: ' + error.message, 'error');
    
    // Restore button
    const submitButton = modal.querySelector('.submit-add-person-btn');
    if (submitButton) {
      submitButton.textContent = 'Add Person';
      submitButton.disabled = false;
    }
  }
}

// Store own identity keys securely
async function storeOwnIdentity(personId, identity) {
  try {
    // Store in chrome.storage.local for persistence
    const key = `emma_identity_${personId}`;
    await chrome.storage.local.set({
      [key]: {
        signing: {
          privateKey: identity.signing.privateKey,
          publicKey: identity.signing.publicKey
        },
        encryption: {
          privateKey: identity.encryption.privateKey,
          publicKey: identity.encryption.publicKey
        },
        fingerprint: identity.fingerprint,
        createdAt: identity.createdAt
      }
    });
  } catch (error) {
    console.error('Failed to store identity:', error);
    // Fallback to localStorage if chrome.storage not available
    localStorage.setItem(`emma_identity_${personId}`, JSON.stringify(identity));
  }
}

// Show identity card for the user's own identity
function showIdentityCard(person, identity) {
  const card = generateIdentityCard(person, identity);
  
  // Create a modal to show the identity card
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.innerHTML = `
    <div class="modal" style="max-width: 500px; background: rgba(20, 20, 30, 0.95); backdrop-filter: blur(20px); border: 1px solid rgba(134, 88, 255, 0.3);">
      <div class="modal-header">
        <h2 style="color: #ffffff;">Your Cryptographic Identity</h2>
        <button class="close-btn close-person-detail-modal" style="color: #cccccc;">×</button>
      </div>
      <div style="padding: 20px;">
        <div style="background: rgba(134, 88, 255, 0.1); border: 1px solid rgba(134, 88, 255, 0.3); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <strong style="color: #ffffff;">Important:</strong> <span style="color: #cccccc;">Save this information securely. You'll need it to access shared vaults.</span>
        </div>
        <div class="identity-card">
          <h3 style="color: #ffffff; margin-bottom: 8px;">${escapeHtml(person.name)}</h3>
          <p style="color: #cccccc; margin-bottom: 20px;">${escapeHtml(person.email || 'No email')}</p>
          
          <div class="fingerprint-section" style="background: rgba(40, 40, 50, 0.8); border: 1px solid rgba(134, 88, 255, 0.2); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 10px 0; color: #ffffff;">Key Fingerprint</h4>
            <code style="font-size: 12px; word-break: break-all; color: #8658ff; background: rgba(134, 88, 255, 0.1); padding: 8px; border-radius: 4px; display: block;">${escapeHtml(identity.fingerprint)}</code>
          </div>
          
          <div style="display: grid; gap: 10px;">
            <button class="identity-export-btn" data-person-id="${person.id}" style="padding: 12px 20px; background: #8658ff; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">
              📥 Export Identity Keys
            </button>
            <button class="identity-copy-btn" data-fingerprint="${identity.fingerprint}" style="padding: 12px 20px; background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">
              📋 Copy Fingerprint
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// Show person detail modal with edit capability
async function showPersonDetailModal(person, identity) {
  console.log('👤 Showing person details for:', person.name);
  
  // Load existing sharing records for this person (to display shared memories)
  const sharingRecords = await getSharingRecordsForPerson(person.id);
  let sharedMemories = [];
  try {
    // Flatten records into a single list of { memoryId, permission }
    const seen = new Set();
    for (const rec of sharingRecords) {
      for (const m of rec.memories || []) {
        if (!seen.has(m.memoryId)) {
          sharedMemories.push({ memoryId: m.memoryId, permission: m.permission });
          seen.add(m.memoryId);
        }
      }
    }
  } catch (e) {
    console.warn('Failed to process sharing records:', e);
    sharedMemories = [];
  }

  // Resolve memory display metadata for shared items
  let allCapsules = [];
  if (sharedMemories.length > 0) {
    try {
      allCapsules = await loadMemoryCapsules();
    } catch (e) {
      console.warn('Could not load memory capsules for display:', e);
    }
  }

  const sharedListHtml = sharedMemories.length === 0
    ? `<div style="padding: 14px; color: #cccccc; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">No shared memory capsules yet.</div>`
    : `<div class="shared-memories-list" style="max-height: 220px; overflow-y: auto; border: 1px solid rgba(134, 88, 255, 0.2); border-radius: 8px; background: rgba(40, 40, 50, 0.5);">
        ${sharedMemories.map((entry) => {
          const mem = resolveMemoryById(allCapsules, entry.memoryId) || { title: 'Unknown memory', core: { type: 'text' }, header: { created: null } };
          const title = getMemoryTitle(mem);
          const type = getMemoryType(mem);
          const date = getMemoryDate(mem);
          const icon = getMemoryIcon(type);
          const permChip = `<span style=\"padding:2px 8px; border-radius:12px; font-size:11px; border:1px solid rgba(134,88,255,.3); color:#8658ff; background:rgba(134,88,255,.1);\">${entry.permission}</span>`;
          return `<div class=\"shared-memory-item\" style=\"display:flex; align-items:center; gap:10px; padding:10px 12px; border-bottom:1px solid rgba(255,255,255,0.06);\">
                    <span style=\"font-size:16px;\">${icon}</span>
                    <div style=\"flex:1;\">
                      <div style=\"display:flex; align-items:center; gap:8px;\">
                        <span style=\"color:#fff; font-weight:500;\">${escapeHtml(title)}</span>
                        <span style=\"color:#ccc; font-size:12px;\">${escapeHtml(date)}</span>
                      </div>
                      <div style=\"color:#aaa; font-size:12px;\">${escapeHtml(type)}</div>
                    </div>
                    ${permChip}
                  </div>`;
        }).join('')}
      </div>`;

  // Create modal
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active person-detail-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width: 600px; background: rgba(20, 20, 30, 0.98); backdrop-filter: blur(20px); border: 1px solid rgba(134, 88, 255, 0.3);">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="person-avatar" style="width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #8658ff, #b794f6); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 16px; overflow: hidden;">
            ${person.profilePicture 
              ? `<img src="${person.profilePicture}" style="width: 100%; height: 100%; object-fit: cover;" alt="${escapeHtml(person.name)}">`
              : escapeHtml(person.name.split(' ').map(n => n[0]).join('').toUpperCase())
            }
          </div>
          <h2 style="color: #ffffff; margin: 0; flex: 1;">${escapeHtml(person.name)}</h2>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="edit-person-btn" data-person-id="${person.id}" style="width: 32px; height: 32px; background: rgba(134, 88, 255, 0.2); color: #8658ff; border: 1px solid rgba(134, 88, 255, 0.3); border-radius: 8px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;" title="Edit Person">
            ✏️
          </button>
          <button class="close-btn close-person-detail-modal" style="color: #cccccc;">×</button>
        </div>
      </div>
      
      <div style="padding: 0 32px 32px 32px;">
        <!-- Person Info Form -->
        <div class="person-info-form">
          <div class="form-group">
            <label class="form-label">Profile Picture</label>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="edit-profile-pic-preview" style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #8658ff, #b794f6); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 20px; border: 2px solid rgba(134, 88, 255, 0.3); overflow: hidden;">
                ${person.profilePicture 
                  ? `<img src="${person.profilePicture}" style="width: 100%; height: 100%; object-fit: cover;" alt="${escapeHtml(person.name)}">`
                  : escapeHtml(person.name.split(' ').map(n => n[0]).join('').toUpperCase())
                }
              </div>
              <div style="flex: 1;">
                <input type="file" class="form-input" id="edit-profile-pic" accept="image/*" style="background: rgba(255, 255, 255, 0.95); color: #333333; border: 1px solid rgba(134, 88, 255, 0.2); padding: 8px 12px;" disabled>
                <div style="font-size: 12px; color: #cccccc; margin-top: 4px;">PNG, JPG up to 5MB</div>
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label" for="edit-name">Name</label>
            <input type="text" id="edit-name" class="form-input" value="${escapeHtml(person.name)}" readonly>
          </div>
          
          <div class="form-group">
            <label class="form-label" for="edit-email">Email</label>
            <input type="email" id="edit-email" class="form-input" value="${escapeHtml(person.email || '')}" readonly placeholder="No email provided">
          </div>
          
          <div class="form-group">
            <label class="form-label" for="edit-phone">Phone</label>
            <input type="tel" id="edit-phone" class="form-input" value="${escapeHtml(person.phone || '')}" readonly placeholder="No phone provided">
          </div>
          
          <div class="form-group">
            <label class="form-label" for="edit-relationship">Relationship</label>
            <select id="edit-relationship" class="form-input" disabled>
              <option value="family" ${person.relationship === 'family' ? 'selected' : ''}>👨‍👩‍👧‍👦 Family</option>
              <option value="friend" ${person.relationship === 'friend' ? 'selected' : ''}>👥 Friend</option>
              <option value="colleague" ${person.relationship === 'colleague' ? 'selected' : ''}>💼 Colleague</option>
              <option value="neighbor" ${person.relationship === 'neighbor' ? 'selected' : ''}>🏘️ Neighbor</option>
              <option value="healthcare" ${person.relationship === 'healthcare' ? 'selected' : ''}>⚕️ Healthcare</option>
              <option value="other" ${person.relationship === 'other' ? 'selected' : ''}>🤝 Other</option>
              <option value="self" ${person.relationship === 'self' ? 'selected' : ''}>🧑 Myself</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label" for="edit-notes">Notes</label>
            <textarea id="edit-notes" class="form-input form-textarea" readonly placeholder="No notes added yet">${escapeHtml(person.notes || '')}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Shared Memory Access</label>
            ${sharedListHtml}
            <div style="display:flex; gap:8px; margin-top:10px;">
              <button class="share-vault-btn-modal" data-person-id="${person.id}" style="padding: 10px 16px; background: rgba(134, 88, 255, 0.2); color: #8658ff; border: 1px solid rgba(134, 88, 255, 0.3); border-radius: 8px; cursor: pointer; font-weight: 600;">
                🔐 Manage Sharing
              </button>
            </div>
          </div>
          
          ${identity ? `
          <div class="form-group">
            <label class="form-label">Cryptographic Identity</label>
            <div style="background: rgba(40, 40, 50, 0.8); border: 1px solid rgba(134, 88, 255, 0.2); padding: 15px; border-radius: 8px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                <span style="color: #00ff88; font-size: 12px;">●</span>
                <span style="color: #ffffff; font-size: 14px; font-weight: 500;">Verified Identity</span>
                <span style="color: #cccccc; font-size: 12px; margin-left: auto;">Created ${new Date(identity.createdAt || person.keyCreatedAt).toLocaleDateString()}</span>
              </div>
              
              <div style="margin-bottom: 12px;">
                <div style="color: #cccccc; font-size: 12px; margin-bottom: 4px;">Key Fingerprint:</div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <code class="identity-fingerprint-display" style="font-size: 11px; word-break: break-all; color: #8658ff; background: rgba(134, 88, 255, 0.1); padding: 8px; border-radius: 4px; flex: 1;">${escapeHtml(identity.fingerprint)}</code>
                  <input type="text" id="edit-identity-fingerprint" class="form-input identity-fingerprint-edit" value="${escapeHtml(identity.fingerprint)}" style="font-size: 11px; font-family: monospace; color: #8658ff; background: rgba(134, 88, 255, 0.1); padding: 8px; border-radius: 4px; flex: 1; border: 1px solid rgba(134, 88, 255, 0.3); display: none;" placeholder="Enter new identity fingerprint">
                  <button class="identity-copy-btn" data-fingerprint="${identity.fingerprint}" style="padding: 6px 8px; background: rgba(255, 255, 255, 0.05); color: #cccccc; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; cursor: pointer; font-size: 11px;" title="Copy Fingerprint">
                    📋
                  </button>
                </div>
              </div>
              
              <div style="display: flex; gap: 8px;">
                <button class="identity-export-btn" data-person-id="${person.id}" style="padding: 8px 12px; background: rgba(134, 88, 255, 0.2); color: #8658ff; border: 1px solid rgba(134, 88, 255, 0.3); border-radius: 6px; cursor: pointer; font-size: 12px; flex: 1;">
                  📥 Export Keys
                </button>
                <button class="identity-share-btn" data-fingerprint="${identity.fingerprint}" style="padding: 8px 12px; background: rgba(0, 255, 136, 0.1); color: #00ff88; border: 1px solid rgba(0, 255, 136, 0.2); border-radius: 6px; cursor: pointer; font-size: 12px; flex: 1;">
                  🔗 Share Identity
                </button>
              </div>
            </div>
          </div>
          ` : (person.keyFingerprint ? `
          <div class="form-group">
            <label class="form-label">Cryptographic Identity</label>
            <div style="background: rgba(40, 40, 50, 0.8); border: 1px solid rgba(134, 88, 255, 0.2); padding: 15px; border-radius: 8px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                <span style="color: #ffc107; font-size: 12px;">●</span>
                <span style="color: #ffffff; font-size: 14px; font-weight: 500;">Public Identity</span>
                <span style="color: #cccccc; font-size: 12px; margin-left: auto;">Added ${new Date(person.keyCreatedAt || person.dateAdded).toLocaleDateString()}</span>
              </div>
              
              <div style="margin-bottom: 12px;">
                <div style="color: #cccccc; font-size: 12px; margin-bottom: 4px;">Key Fingerprint:</div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <code class="identity-fingerprint-display" style="font-size: 11px; word-break: break-all; color: #8658ff; background: rgba(134, 88, 255, 0.1); padding: 8px; border-radius: 4px; flex: 1;">${escapeHtml(person.keyFingerprint)}</code>
                  <input type="text" id="edit-identity-fingerprint" class="form-input identity-fingerprint-edit" value="${escapeHtml(person.keyFingerprint)}" style="font-size: 11px; font-family: monospace; color: #8658ff; background: rgba(134, 88, 255, 0.1); padding: 8px; border-radius: 4px; flex: 1; border: 1px solid rgba(134, 88, 255, 0.3); display: none;" placeholder="Enter new identity fingerprint">
                  <button class="identity-copy-btn" data-fingerprint="${person.keyFingerprint}" style="padding: 6px 8px; background: rgba(255, 255, 255, 0.05); color: #cccccc; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; cursor: pointer; font-size: 11px;" title="Copy Fingerprint">
                    📋
                  </button>
                </div>
              </div>
            </div>
          </div>
          ` : '')}
        </div>
        
        <!-- Action Buttons -->
        <div style="display: flex; gap: 12px; margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(134, 88, 255, 0.2);">
          <button class="save-person-btn" data-person-id="${person.id}" style="padding: 12px 24px; background: #00ff88; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s; flex: 1; display: none;">
            💾 Save Changes
          </button>
          <button class="cancel-edit-btn" style="padding: 12px 24px; background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s; display: none;">
            ❌ Cancel
          </button>
          ${identity ? `
          <button class="share-vault-btn-modal" data-person-id="${person.id}" style="padding: 12px 24px; background: rgba(134, 88, 255, 0.2); color: #8658ff; border: 1px solid rgba(134, 88, 255, 0.3); border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">
            🔐 Share Vault
          </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Fetch sharing records for a specific person
async function getSharingRecordsForPerson(personId) {
  try {
    let records = [];
    try {
      const result = await chrome.storage.local.get(['emma_vault_sharing']);
      records = result.emma_vault_sharing || [];
    } catch (e) {
      records = JSON.parse(localStorage.getItem('emma_vault_sharing') || '[]');
    }
    return records.filter(r => parseInt(r.personId) === parseInt(personId) && r.status !== 'revoked');
  } catch (e) {
    console.warn('Failed to load sharing records:', e);
    return [];
  }
}

// Resolve a memory capsule by ID across various storage shapes
function resolveMemoryById(allCapsules, memoryId) {
  if (!allCapsules || allCapsules.length === 0) return null;
  const byId = allCapsules.find(m => String(m.id) === String(memoryId));
  if (byId) return byId;
  const byHeaderId = allCapsules.find(m => String(m.header?.id) === String(memoryId));
  return byHeaderId || null;
}

// Enable editing mode for person details
function enablePersonEdit(personId) {
  console.log('✏️ Enabling edit mode for person:', personId);
  
  const modal = document.querySelector('.person-detail-modal');
  if (!modal) return;
  
  // Enable all form inputs
  const nameInput = modal.querySelector('#edit-name');
  const emailInput = modal.querySelector('#edit-email');
  const phoneInput = modal.querySelector('#edit-phone');
  const relationshipSelect = modal.querySelector('#edit-relationship');
  const notesTextarea = modal.querySelector('#edit-notes');
  const profilePicInput = modal.querySelector('#edit-profile-pic');
  const identityFingerprintInput = modal.querySelector('#edit-identity-fingerprint');
  
  [nameInput, emailInput, phoneInput, notesTextarea].forEach(input => {
    if (input) {
      input.removeAttribute('readonly');
      input.style.background = 'rgba(255, 255, 255, 0.98)';
      input.style.border = '2px solid rgba(134, 88, 255, 0.4)';
    }
  });
  
  if (profilePicInput) {
    profilePicInput.removeAttribute('disabled');
    profilePicInput.style.background = 'rgba(255, 255, 255, 0.98)';
    profilePicInput.style.border = '2px solid rgba(134, 88, 255, 0.4)';
    
    // Add preview functionality for edit mode
    profilePicInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      const preview = modal.querySelector('.edit-profile-pic-preview');
      if (file && preview) {
        if (file.size > 5 * 1024 * 1024) {
          showNotification('Image must be smaller than 5MB', 'error');
          e.target.value = '';
          return;
        }
        
        if (!file.type.startsWith('image/')) {
          showNotification('Please select an image file', 'error');
          e.target.value = '';
          return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
          preview.innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;" alt="Preview">`;
        };
        reader.readAsDataURL(file);
      }
    });
  }
  
  if (relationshipSelect) {
    relationshipSelect.removeAttribute('disabled');
    relationshipSelect.style.background = 'rgba(255, 255, 255, 0.98)';
    relationshipSelect.style.border = '2px solid rgba(134, 88, 255, 0.4)';
  }
  
  // Enable identity fingerprint editing
  if (identityFingerprintInput) {
    identityFingerprintInput.removeAttribute('readonly');
    identityFingerprintInput.style.background = 'rgba(134, 88, 255, 0.15)';
    identityFingerprintInput.style.border = '2px solid rgba(134, 88, 255, 0.4)';
  }
  
  // Toggle display between read-only and editable identity fingerprint
  const fingerprintDisplay = modal.querySelectorAll('.identity-fingerprint-display');
  const fingerprintEdit = modal.querySelectorAll('.identity-fingerprint-edit');
  
  fingerprintDisplay.forEach(display => {
    if (display) display.style.display = 'none';
  });
  
  fingerprintEdit.forEach(edit => {
    if (edit) edit.style.display = 'block';
  });
  
  // Show/hide buttons
  const editBtn = modal.querySelector('.edit-person-btn');
  const saveBtn = modal.querySelector('.save-person-btn');
  const cancelBtn = modal.querySelector('.cancel-edit-btn');
  
  if (editBtn) {
    editBtn.style.display = 'none'; // Hide edit icon in header
  }
  if (saveBtn) saveBtn.style.display = 'block';
  if (cancelBtn) cancelBtn.style.display = 'block';
  
  // Store original values for cancel functionality
  modal.dataset.originalName = nameInput?.value || '';
  modal.dataset.originalEmail = emailInput?.value || '';
  modal.dataset.originalPhone = phoneInput?.value || '';
  modal.dataset.originalRelationship = relationshipSelect?.value || '';
  modal.dataset.originalNotes = notesTextarea?.value || '';
  modal.dataset.originalIdentityFingerprint = identityFingerprintInput?.value || '';
  
  showNotification('Edit mode enabled. Make your changes and click Save.', 'info');
}

// Save person edit changes
async function savePersonEdit(personId) {
  console.log('💾 Saving person edit:', personId);
  
  const modal = document.querySelector('.person-detail-modal');
  if (!modal) return;
  
  try {
    // Get form values
    const name = modal.querySelector('#edit-name')?.value?.trim();
    const email = modal.querySelector('#edit-email')?.value?.trim();
    const phone = modal.querySelector('#edit-phone')?.value?.trim();
    const relationship = modal.querySelector('#edit-relationship')?.value;
    const notes = modal.querySelector('#edit-notes')?.value?.trim();
    const identityFingerprint = modal.querySelector('#edit-identity-fingerprint')?.value?.trim();
    
    // Validate required fields
    if (!name) {
      showNotification('Name is required', 'error');
      return;
    }
    
    // Validate identity fingerprint format if provided
    if (identityFingerprint && identityFingerprint.length > 0) {
      if (identityFingerprint.length < 20) {
        showNotification('Identity fingerprint must be at least 20 characters', 'error');
        return;
      }
      // Basic hex validation
      if (!/^[a-fA-F0-9:]+$/.test(identityFingerprint)) {
        showNotification('Identity fingerprint must contain only hexadecimal characters and colons', 'error');
        return;
      }
    }
    
    // Get current people data
    let people = [];
    try {
      const result = await chrome.storage.local.get(['emma_people']);
      people = result.emma_people || JSON.parse(localStorage.getItem('emma_people') || '[]');
    } catch (error) {
      people = JSON.parse(localStorage.getItem('emma_people') || '[]');
    }
    
    // Find and update the person
    const personIndex = people.findIndex(p => p.id === parseInt(personId));
    
    if (personIndex === -1) {
      showNotification('Person not found', 'error');
      return;
    }
    
    // Handle profile picture update
    let profilePicture = people[personIndex].profilePicture; // Keep existing by default
    const profilePicInput = modal.querySelector('#edit-profile-pic');
    if (profilePicInput?.files?.[0]) {
      const file = profilePicInput.files[0];
      const reader = new FileReader();
      profilePicture = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    }
    
    // Update person data
    people[personIndex] = {
      ...people[personIndex],
      name,
      email: email || null,
      phone: phone || null,
      relationship,
      notes: notes || null,
      profilePicture: profilePicture,
      lastModified: new Date().toISOString()
    };
    
    // Check if identity fingerprint is being updated
    const hasIdentityUpdate = identityFingerprint && identityFingerprint !== people[personIndex].keyFingerprint;
    
    // Update identity fingerprint if provided and different
    if (hasIdentityUpdate) {
      people[personIndex].keyFingerprint = identityFingerprint;
      people[personIndex].keyUpdatedAt = Date.now();
      console.log('🔑 Updated identity fingerprint for person:', personId);
    }
    
    // Save to storage
    try {
      await chrome.storage.local.set({ emma_people: people });
    } catch (error) {
      localStorage.setItem('emma_people', JSON.stringify(people));
    }
    
    // Update allPeople global variable
    allPeople = people;
    
    // Refresh the display
    displayPeople();
    
    // Close modal and show success
    modal.remove();
    showNotification(`Person updated successfully!${hasIdentityUpdate ? ' Identity fingerprint also updated.' : ''}`, 'success');
    
    console.log('✅ Person saved successfully');
  } catch (error) {
    console.error('❌ Failed to save person:', error);
    showNotification('Failed to save changes: ' + error.message, 'error');
  }
}

// Cancel person edit changes
function cancelPersonEdit() {
  console.log('❌ Cancelling person edit');
  
  const modal = document.querySelector('.person-detail-modal');
  if (!modal) return;
  
  // Restore original values
  const nameInput = modal.querySelector('#edit-name');
  const emailInput = modal.querySelector('#edit-email');
  const phoneInput = modal.querySelector('#edit-phone');
  const relationshipSelect = modal.querySelector('#edit-relationship');
  const notesTextarea = modal.querySelector('#edit-notes');
  const identityFingerprintInput = modal.querySelector('#edit-identity-fingerprint');
  
  if (nameInput) nameInput.value = modal.dataset.originalName || '';
  if (emailInput) emailInput.value = modal.dataset.originalEmail || '';
  if (phoneInput) phoneInput.value = modal.dataset.originalPhone || '';
  if (relationshipSelect) relationshipSelect.value = modal.dataset.originalRelationship || '';
  if (notesTextarea) notesTextarea.value = modal.dataset.originalNotes || '';
  if (identityFingerprintInput) identityFingerprintInput.value = modal.dataset.originalIdentityFingerprint || '';
  
  // Disable editing
  [nameInput, emailInput, phoneInput, notesTextarea, identityFingerprintInput].forEach(input => {
    if (input) {
      input.setAttribute('readonly', 'readonly');
      input.style.background = 'rgba(255, 255, 255, 0.95)';
      input.style.border = '1px solid rgba(134, 88, 255, 0.2)';
    }
  });
  
  // Restore identity fingerprint display/edit toggle
  const fingerprintDisplay = modal.querySelectorAll('.identity-fingerprint-display');
  const fingerprintEdit = modal.querySelectorAll('.identity-fingerprint-edit');
  
  fingerprintDisplay.forEach(display => {
    if (display) display.style.display = 'block';
  });
  
  fingerprintEdit.forEach(edit => {
    if (edit) edit.style.display = 'none';
  });
  
  if (relationshipSelect) {
    relationshipSelect.setAttribute('disabled', 'disabled');
    relationshipSelect.style.background = 'rgba(255, 255, 255, 0.95)';
    relationshipSelect.style.border = '1px solid rgba(134, 88, 255, 0.2)';
  }
  
  const profilePicInput = modal.querySelector('#edit-profile-pic');
  if (profilePicInput) {
    profilePicInput.setAttribute('disabled', 'disabled');
    profilePicInput.style.background = 'rgba(255, 255, 255, 0.95)';
    profilePicInput.style.border = '1px solid rgba(134, 88, 255, 0.2)';
    profilePicInput.value = ''; // Clear file input
  }
  
  // Show/hide buttons
  const editBtn = modal.querySelector('.edit-person-btn');
  const saveBtn = modal.querySelector('.save-person-btn');
  const cancelBtn = modal.querySelector('.cancel-edit-btn');
  
  if (editBtn) editBtn.style.display = 'flex'; // Show edit icon in header again
  if (saveBtn) saveBtn.style.display = 'none';
  if (cancelBtn) cancelBtn.style.display = 'none';
  
  showNotification('Changes cancelled', 'info');
}

// Export identity for backup
async function exportIdentity(personId) {
  try {
    console.log('🔍 Exporting identity for person:', personId);
    
    let identity = null;
    
    // Try chrome.storage first
    try {
      const result = await chrome.storage.local.get([`emma_identity_${personId}`]);
      identity = result[`emma_identity_${personId}`];
      console.log('📦 Chrome storage result:', identity ? 'found' : 'not found');
    } catch (chromeError) {
      console.warn('⚠️ Chrome storage failed, trying localStorage:', chromeError);
    }
    
    // Fallback to localStorage
    if (!identity) {
      try {
        const stored = localStorage.getItem(`emma_identity_${personId}`);
        if (stored) {
          identity = JSON.parse(stored);
          console.log('📦 LocalStorage result:', identity ? 'found' : 'not found');
        }
      } catch (localError) {
        console.warn('⚠️ LocalStorage failed:', localError);
      }
    }
    
    if (!identity) {
      console.error('❌ No identity found for person:', personId);
      showNotification('Identity not found. Make sure this is your own identity.', 'error');
      return;
    }
    
    const backup = {
      version: '1.0',
      type: 'emma-identity-backup',
      personId,
      createdAt: new Date().toISOString(),
      identity
    };
    
    console.log('📄 Creating backup file...');
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emma-identity-${personId}-backup.json`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('✅ Identity exported successfully');
    showNotification('Identity exported successfully!', 'success');
  } catch (error) {
    console.error('❌ Failed to export identity:', error);
    showNotification('Failed to export identity: ' + error.message, 'error');
  }
}

// Copy fingerprint to clipboard
function copyFingerprint(fingerprint) {
  navigator.clipboard.writeText(fingerprint).then(() => {
    showNotification('Fingerprint copied to clipboard', 'success');
  }).catch(() => {
    showNotification('Failed to copy fingerprint', 'error');
  });
}

// Share identity fingerprint
function shareIdentity(fingerprint) {
  const shareText = `Emma Identity Fingerprint:\n${fingerprint}\n\nThis cryptographic fingerprint can be used to verify my identity in secure communications.`;
  
  if (navigator.share) {
    navigator.share({
      title: 'Emma Identity Fingerprint',
      text: shareText,
    }).then(() => {
      showNotification('Identity shared successfully', 'success');
    }).catch((error) => {
      console.log('Error sharing:', error);
      // Fallback to copy
      copyToClipboard(shareText);
    });
  } else {
    // Fallback for browsers that don't support Web Share API
    copyToClipboard(shareText);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showNotification('Identity information copied to clipboard', 'success');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showNotification('Failed to copy identity information', 'error');
  });
}

// Show share vault modal
async function showShareVaultModal(personId) {
  const person = allPeople.find(p => p.id === personId);
  if (!person) return;
  
  console.log('🔐 Opening share vault modal for:', person.name);
  
  // Load memory capsules
  let memories = [];
  try {
    memories = await loadMemoryCapsules();
  } catch (error) {
    console.error('Failed to load memories:', error);
    showNotification('Failed to load memory capsules', 'error');
    return;
  }
  
  // Create share vault modal
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active share-vault-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width: 700px; background: rgba(20, 20, 30, 0.98); backdrop-filter: blur(20px); border: 1px solid rgba(134, 88, 255, 0.3);">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="person-avatar" style="width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #8658ff, #b794f6); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px; overflow: hidden;">
            ${person.profilePicture 
              ? `<img src="${person.profilePicture}" style="width: 100%; height: 100%; object-fit: cover;" alt="${escapeHtml(person.name)}">`
              : escapeHtml(person.name.split(' ').map(n => n[0]).join('').toUpperCase())
            }
          </div>
          <div>
            <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Share Vault with ${escapeHtml(person.name)}</h2>
            <p style="color: #cccccc; margin: 0; font-size: 14px;">Grant access to specific memory capsules</p>
          </div>
        </div>
        <button class="close-btn close-share-vault-modal" style="color: #cccccc;">×</button>
      </div>
      
      <div style="padding: 0 32px 32px 32px;">
        <!-- Permission Level Selection -->
        <div class="form-group" style="margin-bottom: 24px;">
          <label class="form-label" style="color: #ffffff; margin-bottom: 12px;">Default Permission Level</label>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
            <div class="permission-option" data-permission="view" style="padding: 12px; background: rgba(134, 88, 255, 0.1); border: 2px solid rgba(134, 88, 255, 0.3); border-radius: 8px; cursor: pointer; text-align: center; transition: all 0.3s;">
              <div style="font-size: 20px; margin-bottom: 4px;">👁️</div>
              <div style="color: #ffffff; font-weight: 600; font-size: 14px;">View Only</div>
              <div style="color: #cccccc; font-size: 12px;">Can view memories</div>
            </div>
            <div class="permission-option" data-permission="comment" style="padding: 12px; background: rgba(255, 255, 255, 0.05); border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; cursor: pointer; text-align: center; transition: all 0.3s;">
              <div style="font-size: 20px; margin-bottom: 4px;">💬</div>
              <div style="color: #ffffff; font-weight: 600; font-size: 14px;">Comment</div>
              <div style="color: #cccccc; font-size: 12px;">Can add notes</div>
            </div>
            <div class="permission-option" data-permission="contribute" style="padding: 12px; background: rgba(255, 255, 255, 0.05); border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; cursor: pointer; text-align: center; transition: all 0.3s;">
              <div style="font-size: 20px; margin-bottom: 4px;">📎</div>
              <div style="color: #ffffff; font-weight: 600; font-size: 14px;">Contribute</div>
              <div style="color: #cccccc; font-size: 12px;">Can add media</div>
            </div>
            <div class="permission-option" data-permission="edit" style="padding: 12px; background: rgba(255, 255, 255, 0.05); border: 2px solid rgba(255, 255, 255, 0.1); border-radius: 8px; cursor: pointer; text-align: center; transition: all 0.3s;">
              <div style="font-size: 20px; margin-bottom: 4px;">✏️</div>
              <div style="color: #ffffff; font-weight: 600; font-size: 14px;">Edit</div>
              <div style="color: #cccccc; font-size: 12px;">Can modify memories</div>
            </div>
          </div>
        </div>
        
        <!-- Memory Capsule Selection -->
        <div class="form-group">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <label class="form-label" style="color: #ffffff; margin: 0;">Memory Capsules (${memories.length})</label>
            <div style="display: flex; gap: 8px;">
              <button class="select-all-memories" style="padding: 6px 12px; background: rgba(134, 88, 255, 0.2); color: #8658ff; border: 1px solid rgba(134, 88, 255, 0.3); border-radius: 6px; cursor: pointer; font-size: 12px;">
                Select All
              </button>
              <button class="select-none-memories" style="padding: 6px 12px; background: rgba(255, 255, 255, 0.05); color: #cccccc; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; cursor: pointer; font-size: 12px;">
                Select None
              </button>
            </div>
          </div>
          
          <div class="memory-list" style="max-height: 300px; overflow-y: auto; border: 1px solid rgba(134, 88, 255, 0.2); border-radius: 8px; background: rgba(40, 40, 50, 0.5);">
            ${memories.length === 0 ? `
              <div style="padding: 40px; text-align: center; color: #cccccc;">
                <div style="font-size: 48px; margin-bottom: 12px;">📝</div>
                <div style="font-size: 16px; margin-bottom: 8px;">No Memory Capsules Found</div>
                <div style="font-size: 14px;">Create some memories first, then share them with others.</div>
              </div>
            ` : memories.map(memory => createMemorySelectionItem(memory)).join('')}
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div style="display: flex; gap: 12px; margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(134, 88, 255, 0.2);">
          <button class="cancel-share-vault" style="flex: 1; padding: 12px 24px; background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">
            Cancel
          </button>
          <button class="confirm-share-vault" data-person-id="${personId}" style="flex: 2; padding: 12px 24px; background: #8658ff; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">
            🔐 Share Vault Access
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add event listeners for the modal
  setupShareVaultModalListeners(modal, personId);
}

// Load memory capsules from storage - use the same logic as memories.js
async function loadMemoryCapsules() {
  console.log('📝 Loading memory capsules...');
  
  try {
    // Try vault first (same as memories.js)
    try {
      const vaultList = await chrome.runtime.sendMessage({ action: 'vault.listCapsules', limit: 200 });
      if (vaultList && vaultList.success && vaultList.items && vaultList.items.length > 0) {
        const memories = vaultList.items.map(h => ({
          id: h.id,
          title: h.title || '(Encrypted Capsule)',
          timestamp: h.ts || Date.now(),
          role: h.role || 'assistant',
          source: h.source || 'unknown',
          type: 'vault'
        }));
        console.log('📦 Loaded from vault:', memories.length, 'memories');
        return memories;
      }
    } catch {}

    // Try background next (same as memories.js)
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getAllMemories', limit: 1000, offset: 0 });
      if (response && response.success && response.memories && response.memories.length > 0) {
        console.log('📦 Loaded from background:', response.memories.length, 'memories');
        return response.memories;
      }
    } catch {}
    
    // Fallback to chrome storage (same as memories.js)
    const result = await chrome.storage.local.get(['emma_memories']);
    const memories = result.emma_memories || [];
    console.log('📦 Loaded from chrome storage:', memories.length, 'memories');
    return memories;
    
  } catch (error) {
    console.error('❌ Failed to load memory capsules:', error);
    return [];
  }
}

// Create memory selection item for the share modal
function createMemorySelectionItem(memory) {
  const memoryTitle = getMemoryTitle(memory);
  const memoryType = getMemoryType(memory);
  const memoryDate = getMemoryDate(memory);
  const memoryPreview = getMemoryPreview(memory);
  
  return `
    <div class="memory-item" data-memory-id="${escapeHtml(memory.id || memory.header?.id)}" style="padding: 12px; border-bottom: 1px solid rgba(134, 88, 255, 0.1); display: flex; align-items: center; gap: 12px; cursor: pointer; transition: background 0.3s;">
      <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1;">
        <input type="checkbox" class="memory-checkbox" style="width: 16px; height: 16px; accent-color: #8658ff;" checked>
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span style="font-size: 16px;">${getMemoryIcon(memoryType)}</span>
            <span style="color: #ffffff; font-weight: 500; font-size: 14px;">${escapeHtml(memoryTitle)}</span>
            <span style="color: #cccccc; font-size: 12px;">${escapeHtml(memoryDate)}</span>
          </div>
          <div style="color: #cccccc; font-size: 12px; line-height: 1.4;">${escapeHtml(memoryPreview)}</div>
        </div>
      </label>
      <div class="memory-permission-override" style="display: flex; gap: 4px;">
        <button class="permission-mini view" data-permission="view" style="width: 24px; height: 24px; border: 1px solid rgba(134, 88, 255, 0.3); background: rgba(134, 88, 255, 0.1); color: #8658ff; border-radius: 4px; cursor: pointer; font-size: 12px;" title="View Only">👁️</button>
        <button class="permission-mini comment" data-permission="comment" style="width: 24px; height: 24px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.05); color: #cccccc; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Can Comment">💬</button>
        <button class="permission-mini contribute" data-permission="contribute" style="width: 24px; height: 24px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.05); color: #cccccc; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Can Add Media">📎</button>
        <button class="permission-mini edit" data-permission="edit" style="width: 24px; height: 24px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.05); color: #cccccc; border-radius: 4px; cursor: pointer; font-size: 12px;" title="Can Edit">✏️</button>
      </div>
    </div>
  `;
}

// Helper functions for memory display
function getMemoryTitle(memory) {
  if (memory.title) return memory.title;
  if (memory.core?.content) {
    const content = memory.core.content;
    if (typeof content === 'string') {
      return content.substring(0, 50) + (content.length > 50 ? '...' : '');
    }
  }
  if (memory.content) {
    return memory.content.substring(0, 50) + (memory.content.length > 50 ? '...' : '');
  }
  return 'Untitled Memory';
}

function getMemoryType(memory) {
  if (memory.core?.type) return memory.core.type;
  if (memory.type) return memory.type;
  if (memory.source) return memory.source;
  return 'text';
}

function getMemoryDate(memory) {
  const date = memory.header?.created || memory.created || memory.timestamp || memory.dateAdded;
  if (date) {
    return new Date(date).toLocaleDateString();
  }
  return 'Unknown date';
}

function getMemoryPreview(memory) {
  if (memory.semantic?.summary) return memory.semantic.summary;
  if (memory.summary) return memory.summary;
  if (memory.core?.content) {
    const content = memory.core.content;
    if (typeof content === 'string') {
      return content.substring(0, 100) + (content.length > 100 ? '...' : '');
    }
  }
  if (memory.content) {
    return memory.content.substring(0, 100) + (memory.content.length > 100 ? '...' : '');
  }
  return 'No preview available';
}

function getMemoryIcon(type) {
  const iconMap = {
    'text': '📝',
    'image': '🖼️',
    'video': '🎥',
    'audio': '🎵',
    'document': '📄',
    'conversation': '💬',
    'note': '📋',
    'web': '🌐',
    'social': '📱',
    'email': '📧'
  };
  return iconMap[type] || '📝';
}

// Setup event listeners for share vault modal
function setupShareVaultModalListeners(modal, personId) {
  // Permission selection
  const permissionOptions = modal.querySelectorAll('.permission-option');
  permissionOptions.forEach(option => {
    option.addEventListener('click', function() {
      // Remove active state from all options
      permissionOptions.forEach(opt => {
        opt.style.background = 'rgba(255, 255, 255, 0.05)';
        opt.style.border = '2px solid rgba(255, 255, 255, 0.1)';
      });
      
      // Add active state to clicked option
      this.style.background = 'rgba(134, 88, 255, 0.1)';
      this.style.border = '2px solid rgba(134, 88, 255, 0.3)';
      
      // Update all memory items to this permission
      const permission = this.dataset.permission;
      updateAllMemoryPermissions(permission);
    });
  });
  
  // Select all/none buttons
  modal.querySelector('.select-all-memories')?.addEventListener('click', function() {
    const checkboxes = modal.querySelectorAll('.memory-checkbox');
    checkboxes.forEach(cb => cb.checked = true);
  });
  
  modal.querySelector('.select-none-memories')?.addEventListener('click', function() {
    const checkboxes = modal.querySelectorAll('.memory-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
  });
  
  // Individual memory permission buttons
  modal.addEventListener('click', function(e) {
    if (e.target.classList.contains('permission-mini')) {
      const memoryItem = e.target.closest('.memory-item');
      const permission = e.target.dataset.permission;
      updateMemoryPermission(memoryItem, permission);
    }
  });
  
  // Close modal
  modal.querySelector('.close-share-vault-modal')?.addEventListener('click', function() {
    modal.remove();
  });
  
  modal.querySelector('.cancel-share-vault')?.addEventListener('click', function() {
    modal.remove();
  });
  
  // Confirm sharing
  modal.querySelector('.confirm-share-vault')?.addEventListener('click', function() {
    confirmVaultSharing(personId, modal);
  });
}

// Update all memory permissions to a specific level
function updateAllMemoryPermissions(permission) {
  const modal = document.querySelector('.share-vault-modal');
  if (!modal) return;
  
  const memoryItems = modal.querySelectorAll('.memory-item');
  memoryItems.forEach(item => updateMemoryPermission(item, permission));
}

// Update permission for a specific memory
function updateMemoryPermission(memoryItem, permission) {
  const permissionButtons = memoryItem.querySelectorAll('.permission-mini');
  
  // Reset all buttons
  permissionButtons.forEach(btn => {
    btn.style.background = 'rgba(255, 255, 255, 0.05)';
    btn.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    btn.style.color = '#cccccc';
  });
  
  // Highlight selected permission
  const selectedBtn = memoryItem.querySelector(`[data-permission="${permission}"]`);
  if (selectedBtn) {
    selectedBtn.style.background = 'rgba(134, 88, 255, 0.1)';
    selectedBtn.style.border = '1px solid rgba(134, 88, 255, 0.3)';
    selectedBtn.style.color = '#8658ff';
  }
}

// Confirm and process vault sharing
async function confirmVaultSharing(personId, modal) {
  try {
    console.log('🔐 Processing vault sharing for person:', personId);
    
    // Get selected memories and their permissions
    const selectedMemories = [];
    const memoryItems = modal.querySelectorAll('.memory-item');
    
    memoryItems.forEach(item => {
      const checkbox = item.querySelector('.memory-checkbox');
      if (checkbox?.checked) {
        const memoryId = item.dataset.memoryId;
        const activePermission = item.querySelector('.permission-mini[style*="rgb(134, 88, 255)"]');
        const permission = activePermission?.dataset.permission || 'view';
        
        selectedMemories.push({
          memoryId,
          permission
        });
      }
    });
    
    if (selectedMemories.length === 0) {
      showNotification('Please select at least one memory to share', 'error');
      return;
    }
    
    // Get person details
    const person = allPeople.find(p => p.id === parseInt(personId));
    if (!person) {
      showNotification('Person not found', 'error');
      return;
    }
    
    // Check if person has crypto identity
    if (!person.keyFingerprint) {
      showNotification('This person does not have a cryptographic identity yet', 'error');
      return;
    }
    
    // Create sharing record
    const sharingRecord = {
      id: `share_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      personId: parseInt(personId),
      personName: person.name,
      personFingerprint: person.keyFingerprint,
      memories: selectedMemories,
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    
    // Store sharing record locally
    await storeVaultSharingRecord(sharingRecord);
    
    // Get vault ID (for now, use default vault)
    const vaultId = await getCurrentVaultId();
    
    // Determine overall permissions (highest permission level)
    const permissions = {
      read: true,
      write: selectedMemories.some(m => ['contribute', 'edit'].includes(m.permission)),
      delete: selectedMemories.some(m => m.permission === 'edit'),
      share: false, // For now, don't allow re-sharing
      admin: false
    };
    
    // Initiate P2P sharing if available
    if (p2pManager && person.keyFingerprint) {
      try {
        console.log('🌐 Initiating HML Sync vault share...');
        
        // Add person to monitoring for incoming shares
        await p2pManager.addPeerToMonitor(person.keyFingerprint);
        
        // Share vault via P2P
        const shareId = await p2pManager.shareVault(
          vaultId,
          person.keyFingerprint,
          permissions
        );
        
        console.log('✅ HML Sync share initiated:', shareId);
        showNotification(`HML Sync: Vault sharing initiated with ${person.name}! They will receive a notification when online.`, 'success');
        
      } catch (p2pError) {
        console.error('⚠️ HML Sync sharing failed, but local record saved:', p2pError);
        showNotification(`Vault access recorded locally. HML Sync will retry when ${person.name} is online.`, 'info');
      }
    } else {
      // Fallback: local only
      showNotification(`Vault access shared with ${person.name}! ${selectedMemories.length} memories shared locally.`, 'success');
    }
    
    modal.remove();
    
    console.log('✅ Vault sharing completed:', sharingRecord);
    
  } catch (error) {
    console.error('❌ Failed to share vault:', error);
    showNotification('Failed to share vault access: ' + error.message, 'error');
  }
}

// Get current vault ID
async function getCurrentVaultId() {
  try {
    const result = await chrome.storage.local.get(['emma_current_vault']);
    return result.emma_current_vault || 'default';
  } catch (error) {
    return 'default';
  }
}

// Store vault sharing record
async function storeVaultSharingRecord(sharingRecord) {
  try {
    // Get existing sharing records
    let sharingRecords = [];
    try {
      const result = await chrome.storage.local.get(['emma_vault_sharing']);
      sharingRecords = result.emma_vault_sharing || [];
    } catch (error) {
      sharingRecords = JSON.parse(localStorage.getItem('emma_vault_sharing') || '[]');
    }
    
    // Add new record
    sharingRecords.push(sharingRecord);
    
    // Save back to storage
    try {
      await chrome.storage.local.set({ emma_vault_sharing: sharingRecords });
    } catch (error) {
      localStorage.setItem('emma_vault_sharing', JSON.stringify(sharingRecords));
    }
    
    console.log('💾 Vault sharing record stored:', sharingRecord.id);
    
  } catch (error) {
    console.error('❌ Failed to store sharing record:', error);
    throw error;
  }
}

// View person details
async function viewPerson(personId) {
  console.log('📋 Viewing person:', personId);
  
  try {
    // Get person data
    let people = [];
    try {
      const result = await chrome.storage.local.get(['emma_people']);
      people = result.emma_people || JSON.parse(localStorage.getItem('emma_people') || '[]');
    } catch (error) {
      people = JSON.parse(localStorage.getItem('emma_people') || '[]');
    }
    
    const person = people.find(p => p.id === personId);
    if (!person) {
      showNotification('Person not found', 'error');
      return;
    }
    
    // Get identity data if it exists
    let identity = null;
    try {
      const result = await chrome.storage.local.get([`emma_identity_${personId}`]);
      identity = result[`emma_identity_${personId}`] || JSON.parse(localStorage.getItem(`emma_identity_${personId}`) || 'null');
    } catch (error) {
      identity = JSON.parse(localStorage.getItem(`emma_identity_${personId}`) || 'null');
    }
    
    showPersonDetailModal(person, identity);
  } catch (error) {
    console.error('❌ Failed to load person details:', error);
    showNotification('Failed to load person details', 'error');
  }
}

// Save people to localStorage
async function savePeople() {
  try {
    await chrome.storage.local.set({ emma_people: allPeople });
    console.log('💾 Saved to chrome.storage:', allPeople.length, 'people');
  } catch (error) {
    localStorage.setItem('emma_people', JSON.stringify(allPeople));
    console.log('💾 Saved to localStorage:', allPeople.length, 'people');
  }
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showNotification(message, type = 'info') {
  // Simple notification - you can enhance this
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    z-index: 10000;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
  `;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// Expose functions to global scope for HTML event handlers
window.addPerson = addPerson;
window.openAddPersonModal = openAddPersonModal;
window.closeAddPersonModal = closeAddPersonModal;
window.searchPeople = searchPeople;
window.viewPerson = viewPerson;
window.showShareVaultModal = showShareVaultModal;
window.exportIdentity = exportIdentity;
window.copyFingerprint = copyFingerprint;

// Test that the function is properly exposed
console.log('🔍 addPerson exposed to window:', typeof window.addPerson);

// Add universal navigation handler
function setupUniversalNavigation() {
  const backBtn = document.getElementById('people-back-btn');
  if (backBtn) {
    console.log('🔥 PEOPLE: Setting up back navigation');
    
    // FORCE EMERGENCY BUTTON VISIBILITY AND INTERACTION
    backBtn.style.pointerEvents = 'auto';
    backBtn.style.position = 'relative';
    backBtn.style.zIndex = '9999999';
    backBtn.style.border = '2px solid red'; // Red debug border
    
    backBtn.addEventListener('click', (e) => {
      console.log('🔥 PEOPLE: Back button clicked');
      e.preventDefault();
      e.stopPropagation();
      
      try {
        if (window.location && window.location.href.includes('people.html')) {
          console.log('🔥 PEOPLE: Navigating to welcome.html');
          window.location.href = 'welcome.html';
        } else {
          console.log('🔥 PEOPLE: Going back in history');
          window.history.back();
        }
      } catch (error) {
        console.error('🔥 PEOPLE: Navigation error:', error);
        try { 
          console.log('🔥 PEOPLE: Emergency fallback to welcome.html');
          window.location.href = 'welcome.html'; 
        } catch {}
      }
    });
  } else {
    console.error('🔥 PEOPLE: No back button found!');
  }
}

// Set up navigation when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupUniversalNavigation);
} else {
  setupUniversalNavigation();
}
