/**
 * CLEAN Memory Detail Modal - No more broken code!
 */

/**
 * Open memory detail modal - CLEAN VERSION
 */
function openMemoryDetailModal(memory) {
  try {
    // Store current memory globally
    window.currentMemory = memory;
    
    // Create modal
  const modal = document.createElement('div');
  modal.className = 'memory-modal';
  modal.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background: rgba(0, 0, 0, 0.8) !important;
    backdrop-filter: blur(10px) !important;
    z-index: 2147483647 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    visibility: visible !important;
  `;

  modal.innerHTML = `
    <div style="
      background: rgba(26, 16, 51, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      color: white;
      width: 90%;
      max-width: 800px;
      max-height: 80vh;
      overflow: hidden;
    ">
      <div style="padding: 24px 32px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: space-between;">
        <h2 style="margin: 0; font-size: 24px; font-weight: 600;">${memory.title || 'Memory'}</h2>
        <button onclick="this.closest('.memory-modal').remove()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
      </div>
      
      <div style="display: flex; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
        <button onclick="showTab('overview')" style="padding: 16px 24px; background: none; border: none; color: white; cursor: pointer;">Overview</button>
        <button onclick="showTab('people')" style="padding: 16px 24px; background: none; border: none; color: rgba(255,255,255,0.7); cursor: pointer;">People</button>
      </div>
      
      <div id="overview-tab" style="padding: 32px; display: block;">
        <p>${memory.content || 'No content available'}</p>
      </div>
      
      <div id="people-tab" style="padding: 32px; display: none;">
        <h3 style="color: white; margin-bottom: 24px;">👥 People in this Memory</h3>
        <div id="people-content">
          <div style="text-align: center; color: rgba(255,255,255,0.7); margin: 40px 0;">
            Loading people...
          </div>
        </div>
      </div>
    </div>
  `;

  // Tab switching function
  window.showTab = function(tabName) {
    document.getElementById('overview-tab').style.display = tabName === 'overview' ? 'block' : 'none';
    document.getElementById('people-tab').style.display = tabName === 'people' ? 'block' : 'none';
    
    // Load people content when People tab is shown
    if (tabName === 'people') {
      loadPeopleInTab();
    }
  };

  document.body.appendChild(modal);
  
  // Add .show class to make modal visible (CSS has opacity: 0 by default)
  modal.classList.add('show');
  
  return modal;
  
  } catch (error) {
    console.error('❌ CLEAN MODAL ERROR:', error);
    alert('Modal creation failed: ' + error.message);
    throw error;
  }
}

/**
 * Load people directly in the People tab - elegant in-tab selection
 */
async function loadPeopleInTab() {
  try {
    const peopleContent = document.getElementById('people-content');
    if (!peopleContent) return;
    
    // Show loading state
    peopleContent.innerHTML = `
      <div style="text-align: center; color: rgba(255,255,255,0.7); margin: 40px 0;">
        <div style="font-size: 20px; margin-bottom: 8px;">⏳</div>
        Loading people...
      </div>
    `;
    
    // Use EXACT same API as working pages
    const response = await window.emmaAPI.people.list();
    
    if (response.success) {
      const people = response.items || [];
      
      if (people.length === 0) {
        peopleContent.innerHTML = `
          <div style="text-align: center; color: rgba(255,255,255,0.7); margin: 40px 0;">
            <div style="font-size: 48px; margin-bottom: 16px;">👥</div>
            <p>No people in your vault yet.</p>
            <button onclick="window.open('/pages/people.html', '_blank')" style="
              background: linear-gradient(135deg, #8658ff, #f093fb);
              border: none;
              color: white;
              padding: 12px 24px;
              border-radius: 12px;
              cursor: pointer;
              margin-top: 16px;
            ">Add People</button>
          </div>
        `;
        return;
      }
      
      // Create beautiful people grid with circular avatars
      const peopleGrid = people.map((person, index) => {
        const isSelected = false; // TODO: Check if person is already connected to memory
        const initials = (person.name || '?').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
        
        // Create avatar HTML - circular image with letter fallback
        const avatarHTML = person.profilePicture || person.avatarUrl
          ? `<img src="${person.profilePicture || person.avatarUrl}" 
                  style="width: 64px; height: 64px; object-fit: cover; border-radius: 50%; margin-bottom: 16px; border: 3px solid rgba(255,255,255,0.2);"
                  onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />`
          : `<div style="
              width: 64px; 
              height: 64px; 
              background: linear-gradient(135deg, #8658ff, #f093fb); 
              border-radius: 50%; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              color: white; 
              font-size: 24px; 
              font-weight: 600; 
              margin-bottom: 16px;
              border: 3px solid rgba(255,255,255,0.2);
            ">${initials}</div>`;
        
        return `
          <div onclick="togglePersonSelection('${person.id}')" 
               id="person-${person.id}"
               style="
                 padding: 20px; 
                 border: 2px solid ${isSelected ? '#8658ff' : 'rgba(255, 255, 255, 0.2)'}; 
                 border-radius: 16px;
                 cursor: pointer;
                 background: ${isSelected ? 'rgba(134, 88, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
                 color: white;
                 text-align: center;
                 transition: all 0.2s ease;
                 position: relative;
               " onmouseover="if (!this.classList.contains('selected')) { this.style.background='rgba(255, 255, 255, 0.1)'; this.style.transform='translateY(-2px)'; }" 
                  onmouseout="if (!this.classList.contains('selected')) { this.style.background='rgba(255, 255, 255, 0.05)'; this.style.transform='translateY(0)'; }">
            

            
            ${avatarHTML}
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">
              ${person.name || 'Unknown'}
            </div>
            <div style="font-size: 14px; opacity: 0.8;">
              ${person.relationship || 'Contact'}
            </div>
          </div>
        `;
      }).join('');
      
      peopleContent.innerHTML = `
        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        ">
          ${peopleGrid}
        </div>
        
        <div style="text-align: center; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
          <button onclick="savePeopleSelections()" style="
            background: linear-gradient(135deg, #8658ff, #f093fb);
            border: none;
            color: white;
            padding: 12px 32px;
            border-radius: 12px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            margin-right: 12px;
          ">Save Connections</button>
          
          <button onclick="window.open('/pages/people.html', '_blank')" style="
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            padding: 12px 24px;
            border-radius: 12px;
            cursor: pointer;
            font-size: 16px;
          ">Manage People</button>
        </div>
      `;
      
      // Add selection functionality
      window.togglePersonSelection = function(personId) {
        const personCard = document.getElementById(`person-${personId}`);
        const isSelected = personCard.classList.contains('selected');
        
        if (isSelected) {
          // Deselect
          personCard.classList.remove('selected');
          personCard.style.border = '2px solid rgba(255, 255, 255, 0.2)';
          personCard.style.background = 'rgba(255, 255, 255, 0.05)';
          // Remove checkmark
          const checkmark = personCard.querySelector('.selection-checkmark');
          if (checkmark) {
            checkmark.remove();
          }
        } else {
          // Select
          personCard.classList.add('selected');
          personCard.style.border = '2px solid #8658ff';
          personCard.style.background = 'rgba(134, 88, 255, 0.1)';
          // Add checkmark overlay
          const existingCheckmark = personCard.querySelector('.selection-checkmark');
          if (!existingCheckmark) {
            const checkmark = document.createElement('div');
            checkmark.className = 'selection-checkmark';
            checkmark.style.cssText = 'position: absolute; top: 8px; right: 8px; color: #8658ff; font-size: 20px; background: rgba(255,255,255,0.9); border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold;';
            checkmark.innerHTML = '✓';
            personCard.appendChild(checkmark);
          }
        }
      };
      
      window.savePeopleSelections = function() {
        const selectedCards = document.querySelectorAll('#people-content .selected');
        const selectedPeople = Array.from(selectedCards).map(card => {
          const personId = card.id.replace('person-', '');
          const person = people.find(p => p.id === personId);
          return person;
        });
        
        console.log('Selected people for memory:', selectedPeople);
        
        // Elegant success feedback instead of ugly alert
        const saveButton = document.querySelector('button[onclick="savePeopleSelections()"]');
        const originalText = saveButton.innerHTML;
        saveButton.innerHTML = `✅ Connected ${selectedPeople.length} people!`;
        saveButton.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
        
        setTimeout(() => {
          saveButton.innerHTML = originalText;
          saveButton.style.background = 'linear-gradient(135deg, #8658ff, #f093fb)';
        }, 2000);
        
        // TODO: Actually save the connections to the memory
      };
      
    } else {
      peopleContent.innerHTML = `
        <div style="text-align: center; color: rgba(255,255,255,0.7); margin: 40px 0;">
          <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <p>Failed to load people: ${response.error || 'Unknown error'}</p>
        </div>
      `;
    }
    
  } catch (error) {
    const peopleContent = document.getElementById('people-content');
    if (peopleContent) {
      peopleContent.innerHTML = `
        <div style="text-align: center; color: rgba(255,255,255,0.7); margin: 40px 0;">
          <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
          <p>Error loading people: ${error.message}</p>
        </div>
      `;
    }
  }
}

// Alias for gallery.js compatibility 
window.openMemoryDetail = openMemoryDetailModal;

console.log('✅ CLEAN Memory Detail Modal loaded successfully!');
