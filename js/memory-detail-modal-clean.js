/**
 * CLEAN Memory Detail Modal - No more broken code!
 */

/**
 * Open memory detail modal - CLEAN VERSION
 */
function openMemoryDetailModal(memory) {
  console.log('Opening memory detail for:', memory.title || memory.id);
  
  // Store current memory globally
  window.currentMemory = memory;
  
  // Create modal
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
        <h3>People in this Memory</h3>
        <p>No people tagged yet.</p>
        <button onclick="openAddPeopleModalForGallery()" style="
          background: linear-gradient(135deg, #8658ff, #f093fb);
          border: none;
          color: white;
          padding: 12px 24px;
          border-radius: 12px;
          cursor: pointer;
          margin-top: 16px;
        ">Add People</button>
      </div>
    </div>
  `;

  // Tab switching function
  window.showTab = function(tabName) {
    document.getElementById('overview-tab').style.display = tabName === 'overview' ? 'block' : 'none';
    document.getElementById('people-tab').style.display = tabName === 'people' ? 'block' : 'none';
  };

  document.body.appendChild(modal);
  return modal;
}

/**
 * CLEAN People Selection - Uses working logic from other pages
 */
async function openAddPeopleModalForGallery() {
  try {
    console.log('Loading people...');
    
    // Use EXACT same API as working pages
    const response = await window.emmaAPI.people.list();
    
    if (response.success) {
      const people = response.items || [];
      
      if (people.length === 0) {
        alert('No people found. Please add people first.');
        return;
      }
      
      // Create simple list
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
        alert(`Selected: ${person.name}. (Connection logic to be implemented)`);
        modal.remove();
        delete window.selectPersonForMemory;
      };
      
      document.body.appendChild(modal);
      
    } else {
      alert('Failed to load people: ' + (response.error || 'Unknown error'));
    }
    
  } catch (error) {
    alert('Error loading people: ' + error.message);
  }
}

// Alias for gallery.js compatibility 
window.openMemoryDetail = openMemoryDetailModal;

console.log('✅ CLEAN Memory Detail Modal loaded successfully!');
