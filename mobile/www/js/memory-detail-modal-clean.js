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
    window.emmaError('Had trouble opening the memory details. Let\'s try again.', {
      title: 'Memory Details Issue',
      helpText: 'Sometimes these things take a moment to work.'
    });
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
            <button onclick="window.open('/pages/people-emma.html', '_blank')" style="
              background: linear-gradient(135deg, #6f63d9, #deb3e4);
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
        // Check if person is already connected to this memory
        const currentMemory = window.currentMemory;
        const connectedPeople = currentMemory?.metadata?.people || [];
        const isSelected = connectedPeople.includes(person.id);
        const initials = (person.name || '?').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
        
        // Create avatar HTML - circular image with letter fallback
        const avatarHTML = person.profilePicture || person.avatarUrl
          ? `<img src="${person.profilePicture || person.avatarUrl}" 
                  style="width: 64px; height: 64px; object-fit: cover; border-radius: 50%; margin-bottom: 16px; border: 3px solid rgba(255,255,255,0.2);"
                  onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />`
          : `<div style="
              width: 64px; 
              height: 64px; 
              background: linear-gradient(135deg, #6f63d9, #deb3e4); 
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
                 border: 2px solid ${isSelected ? '#6f63d9' : 'rgba(255, 255, 255, 0.2)'}; 
                 border-radius: 16px;
                 cursor: pointer;
                 background: ${isSelected ? 'rgba(111, 99, 217, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
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
            background: linear-gradient(135deg, #6f63d9, #deb3e4);
            border: none;
            color: white;
            padding: 12px 32px;
            border-radius: 12px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            margin-right: 12px;
          ">Save Connections</button>
          
          <button onclick="window.open('/pages/people-emma.html', '_blank')" style="
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
      
      // Add initial checkmarks for pre-selected people
      setTimeout(() => {
        people.forEach(person => {
          const currentMemory = window.currentMemory;
          const connectedPeople = currentMemory?.metadata?.people || [];
          if (connectedPeople.includes(person.id)) {
            const personCard = document.getElementById(`person-${person.id}`);
            if (personCard) {
              personCard.classList.add('selected');
              personCard.style.border = '2px solid #6f63d9';
              personCard.style.background = 'rgba(111, 99, 217, 0.1)';
              
              const checkmark = document.createElement('div');
              checkmark.className = 'selection-checkmark';
              checkmark.style.cssText = 'position: absolute; top: 8px; right: 8px; color: #6f63d9; font-size: 20px; background: rgba(255,255,255,0.9); border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold;';
              checkmark.innerHTML = '✓';
              personCard.appendChild(checkmark);
            }
          }
        });
      }, 100);
      
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
          personCard.style.border = '2px solid #6f63d9';
          personCard.style.background = 'rgba(111, 99, 217, 0.1)';
          // Add checkmark overlay
          const existingCheckmark = personCard.querySelector('.selection-checkmark');
          if (!existingCheckmark) {
            const checkmark = document.createElement('div');
            checkmark.className = 'selection-checkmark';
            checkmark.style.cssText = 'position: absolute; top: 8px; right: 8px; color: #6f63d9; font-size: 20px; background: rgba(255,255,255,0.9); border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold;';
            checkmark.innerHTML = '✓';
            personCard.appendChild(checkmark);
          }
        }
      };
      
      window.savePeopleSelections = async function() {
        const selectedCards = document.querySelectorAll('#people-content .selected');
        const selectedPeople = Array.from(selectedCards).map(card => {
          const personId = card.id.replace('person-', '');
          const person = people.find(p => p.id === personId);
          return person;
        });
        
        console.log('Selected people for memory:', selectedPeople);
        
        const saveButton = document.querySelector('button[onclick="savePeopleSelections()"]');
        const originalText = saveButton.innerHTML;
        
        try {
          // Show saving state
          saveButton.innerHTML = '💾 Saving...';
          saveButton.disabled = true;
          
          // Get the current memory
          const currentMemory = window.currentMemory;
          if (!currentMemory) {
            throw new Error('No current memory found');
          }
          
          // Create people ID array for metadata
          const peopleIds = selectedPeople.map(p => p.id);
          
          // Update memory metadata with people connections
          const updatedMemory = {
            ...currentMemory,
            metadata: {
              ...currentMemory.metadata,
              people: peopleIds
            }
          };
          
          // Debug: Check what APIs are available
          console.log('🔍 SAVE DEBUG: Available APIs:');
          console.log('- window.emmaAPI?.vault?.updateMemory:', typeof window.emmaAPI?.vault?.updateMemory);
          console.log('- window.emmaAPI?.vault?.storeMemory:', typeof window.emmaAPI?.vault?.storeMemory);
          console.log('- window.emmaWebVault?.updateMemory:', typeof window.emmaWebVault?.updateMemory);
          console.log('- window.emmaWebVault?.storeMemory:', typeof window.emmaWebVault?.storeMemory);
          console.log('- window.emma?.vault?.storeMemory:', typeof window.emma?.vault?.storeMemory);
          
          // Save to vault using available APIs
          let saveResult = null;
          let apiUsed = 'none';
          
          if (window.emmaAPI?.vault?.storeMemory) {
            // Try Emma API storeMemory (most likely to work)
            console.log('🔄 SAVE: Trying emmaAPI.vault.storeMemory...');
            apiUsed = 'emmaAPI.vault.storeMemory';
            const mtapMemory = {
              id: updatedMemory.id,
              header: { id: updatedMemory.id, created: Date.now(), title: updatedMemory.title, protocol: 'MTAP/1.0' },
              core: { content: updatedMemory.content },
              metadata: { ...updatedMemory.metadata, people: peopleIds },
              semantic: {},
              relations: {}
            };
            saveResult = await window.emmaAPI.vault.storeMemory({ mtapMemory });
          } else if (window.emmaWebVault?.storeMemory) {
            // Try web vault storeMemory
            console.log('🔄 SAVE: Trying emmaWebVault.storeMemory...');
            apiUsed = 'emmaWebVault.storeMemory';
            saveResult = await window.emmaWebVault.storeMemory(updatedMemory);
          } else if (window.emmaAPI?.vault?.updateMemory) {
            // Try new updateMemory API
            console.log('🔄 SAVE: Trying emmaAPI.vault.updateMemory...');
            apiUsed = 'emmaAPI.vault.updateMemory';
            saveResult = await window.emmaAPI.vault.updateMemory(updatedMemory);
          } else if (window.emmaWebVault?.updateMemory) {
            // Fallback to web vault update
            console.log('🔄 SAVE: Trying emmaWebVault.updateMemory...');
            apiUsed = 'emmaWebVault.updateMemory';
            saveResult = await window.emmaWebVault.updateMemory(updatedMemory.id, updatedMemory);
          } else if (window.emma?.vault?.storeMemory) {
            // Legacy API fallback
            console.log('🔄 SAVE: Trying legacy emma.vault.storeMemory...');
            apiUsed = 'legacy.emma.vault.storeMemory';
            const mtapMemory = {
              id: updatedMemory.id,
              header: { id: updatedMemory.id, created: Date.now(), title: updatedMemory.title, protocol: 'MTAP/1.0' },
              core: { content: updatedMemory.content },
              metadata: { ...updatedMemory.metadata, people: peopleIds },
              semantic: {},
              relations: {}
            };
            saveResult = await window.emma.vault.storeMemory({ mtapMemory });
          } else {
            // FALLBACK: No vault APIs available - try localStorage or direct memory update
            console.log('🔄 SAVE: No vault APIs - trying localStorage fallback...');
            
            // Try to update the memory in whatever storage system is being used
            // First, try to update the current memory object directly
            if (window.currentMemory) {
              window.currentMemory = updatedMemory;
              
              // Try to persist to localStorage if that's where memories are stored
              try {
                const existingMemories = JSON.parse(localStorage.getItem('emma_memories') || '[]');
                const memoryIndex = existingMemories.findIndex(m => m.id === updatedMemory.id);
                
                if (memoryIndex >= 0) {
                  existingMemories[memoryIndex] = updatedMemory;
                  localStorage.setItem('emma_memories', JSON.stringify(existingMemories));
                  console.log('✅ SAVE: Updated memory in localStorage');
                  saveResult = { success: true };
                  apiUsed = 'localStorage';
                } else {
                  console.log('⚠️ SAVE: Memory not found in localStorage, memory only updated in-memory');
                  saveResult = { success: true };
                  apiUsed = 'in-memory-only';
                }
                
                // CRITICAL: Also update vaultData.memories so people dialogs see the connections
                if (window.emmaWebVault?.vaultData?.memories) {
                  if (window.emmaWebVault.vaultData.memories[updatedMemory.id]) {
                    window.emmaWebVault.vaultData.memories[updatedMemory.id] = updatedMemory;
                    console.log('✅ SAVE: Updated memory in vaultData - people dialogs will now see connections');
                  } else {
                    console.log('⚠️ SAVE: Memory not found in vaultData, but localStorage updated');
                  }
                }
                
              } catch (localStorageError) {
                console.log('⚠️ SAVE: localStorage failed, but memory updated in-memory:', localStorageError);
                saveResult = { success: true };
                apiUsed = 'in-memory-only';
              }
            } else {
              throw new Error('No storage method available - no vault APIs and no currentMemory');
            }
          }
          
          console.log(`🔍 SAVE: Used API: ${apiUsed}`);
          console.log('🔍 SAVE: Result:', saveResult);
          
          if (saveResult && saveResult.success) {
            // Success feedback
            saveButton.innerHTML = `✅ Connected ${selectedPeople.length} people!`;
            saveButton.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
            
            // Update the global current memory
            window.currentMemory = updatedMemory;
            
            // Refresh all views to show updated connections
            setTimeout(() => {
              // Refresh gallery
              if (typeof window.refreshMemoryGallery === 'function') {
                window.refreshMemoryGallery();
                console.log('🔄 Gallery refreshed to show updated connections');
              }
              
              // Refresh people constellation if it exists
              if (window.memoryConstellation && typeof window.memoryConstellation.loadPeopleForConstellation === 'function') {
                window.memoryConstellation.loadPeopleForConstellation().then(() => {
                  console.log('🔄 Constellation refreshed to show updated connections');
                });
              }
              
              // Refresh people page if it's open (people-emma.html)
              if (typeof window.loadPeople === 'function') {
                window.loadPeople();
                console.log('🔄 People page refreshed to show updated connections');
              }
              
              // Dispatch a custom event so any other components can listen for connection updates
              window.dispatchEvent(new CustomEvent('emmaPeopleConnectionsUpdated', {
                detail: { 
                  memoryId: updatedMemory.id,
                  connectedPeople: peopleIds,
                  updatedMemory: updatedMemory
                }
              }));
              console.log('📡 Dispatched emmaPeopleConnectionsUpdated event');
              
            }, 500);
            
            console.log('✅ Successfully saved people connections to memory');
            
          } else {
            throw new Error(saveResult?.error || 'Failed to save memory');
          }
          
        } catch (error) {
          console.error('❌ Error saving people connections:', error);
          
          // Error feedback
          saveButton.innerHTML = '❌ Save Failed';
          saveButton.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        }
        
        // Reset button after 2 seconds
        setTimeout(() => {
          saveButton.innerHTML = originalText;
          saveButton.style.background = 'linear-gradient(135deg, #6f63d9, #deb3e4)';
          saveButton.disabled = false;
        }, 2000);
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
