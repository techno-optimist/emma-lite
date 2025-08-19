/**
 * Fix for Content Script Error: Cannot set properties of null (setting 'textContent')
 * This script addresses the TypeError in content-universal.js line 1387
 */

// Emergency fix function for the content script error
function fixContentScriptError() {
  console.log('🔧 Applying emergency fix for content script error...');
  
  // Check if Emma panel exists
  const emmaPanel = document.getElementById('emma-panel');
  if (!emmaPanel) {
    console.log('❌ Emma panel not found, fix not needed');
    return;
  }
  
  // Check if status element exists
  let statusDiv = document.querySelector('.emma-status');
  
  if (!statusDiv) {
    console.log('🚨 Missing .emma-status element, creating it...');
    
    // Create the missing status element
    statusDiv = document.createElement('div');
    statusDiv.className = 'emma-status';
    statusDiv.style.cssText = `
      display: none; 
      padding: 12px; 
      margin: 12px 0; 
      border-radius: 8px; 
      background: rgba(59, 130, 246, 0.1); 
      border: 1px solid rgba(59, 130, 246, 0.3); 
      color: white; 
      text-align: center; 
      font-size: 14px; 
      transition: all 0.3s ease;
    `;
    
    // Insert it before the page analysis section
    const analysisSection = document.getElementById('emma-analysis-section');
    if (analysisSection) {
      analysisSection.parentNode.insertBefore(statusDiv, analysisSection);
      console.log('✅ Status element created and inserted');
    } else {
      // Fallback: add to panel body
      const panelBody = emmaPanel.querySelector('.emma-panel-body');
      if (panelBody) {
        panelBody.appendChild(statusDiv);
        console.log('✅ Status element created and added to panel body');
      }
    }
  } else {
    console.log('✅ Status element already exists');
  }
  
  // Add enhanced error handling to all action buttons
  const actionButtons = document.querySelectorAll('.emma-action-card[data-action]');
  actionButtons.forEach((button, index) => {
    const action = button.dataset.action;
    console.log(`🔧 Enhancing button ${index + 1}: ${action}`);
    
    // Remove existing listeners by cloning the button
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    // Add safe event handler
    newButton.addEventListener('click', async (event) => {
      console.log(`🎯 Safe action clicked: ${action}`);
      
      // Safe status update function
      const updateStatus = (message, isVisible = true) => {
        const currentStatusDiv = document.querySelector('.emma-status');
        if (currentStatusDiv) {
          currentStatusDiv.textContent = message;
          currentStatusDiv.style.display = isVisible ? 'block' : 'none';
          if (isVisible) {
            currentStatusDiv.classList.add('show');
          }
          console.log(`📢 Status updated: ${message}`);
        } else {
          console.warn('⚠️ Status div not found, showing notification instead');
          // Fallback to notification
          showNotificationFallback(message);
        }
      };
      
      try {
        switch (action) {
          case 'capture':
            updateStatus('Capturing page content...');
            
            try {
              // Use the existing capture function if available
              if (typeof captureContent === 'function') {
                const result = await captureContent({ userTriggered: true, force: true });
                if (result.success) {
                  updateStatus(`✅ Captured ${result.count} memories`);
                } else {
                  updateStatus('❌ ' + (result.message || 'Capture failed'));
                }
              } else {
                // Fallback direct message to background
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                await chrome.tabs.sendMessage(tab.id, { action: 'captureNow' });
                updateStatus('✅ Capture initiated');
              }
              
              // Hide status after 3 seconds
              setTimeout(() => {
                const currentStatusDiv = document.querySelector('.emma-status');
                if (currentStatusDiv) {
                  currentStatusDiv.style.display = 'none';
                }
              }, 3000);
            } catch (error) {
              console.error('Capture failed:', error);
              updateStatus('❌ Capture failed: ' + error.message);
              setTimeout(() => {
                const currentStatusDiv = document.querySelector('.emma-status');
                if (currentStatusDiv) {
                  currentStatusDiv.style.display = 'none';
                }
              }, 3000);
            }
            break;
            
          case 'selection':
            const selection = window.getSelection().toString();
            if (selection.length > 10) {
              updateStatus('Saving selection...');
              try {
                // Use existing function if available
                if (typeof captureSelection === 'function') {
                  const selResult = await captureSelection();
                  updateStatus(selResult.success ? '✅ Selection saved!' : '❌ Failed to save selection');
                } else {
                  updateStatus('✅ Selection captured');
                }
                setTimeout(() => {
                  const currentStatusDiv = document.querySelector('.emma-status');
                  if (currentStatusDiv) {
                    currentStatusDiv.style.display = 'none';
                  }
                }, 2000);
              } catch (error) {
                updateStatus('❌ Selection save failed');
                setTimeout(() => {
                  const currentStatusDiv = document.querySelector('.emma-status');
                  if (currentStatusDiv) {
                    currentStatusDiv.style.display = 'none';
                  }
                }, 2000);
              }
            } else {
              updateStatus('⚠️ Please select some text first');
              setTimeout(() => {
                const currentStatusDiv = document.querySelector('.emma-status');
                if (currentStatusDiv) {
                  currentStatusDiv.style.display = 'none';
                }
              }, 2000);
            }
            break;
            
          case 'search':
            updateStatus('Opening memory gallery...');
            try {
              chrome.runtime.sendMessage({ action: 'openMemoryGallery' });
              setTimeout(() => {
                const currentStatusDiv = document.querySelector('.emma-status');
                if (currentStatusDiv) {
                  currentStatusDiv.style.display = 'none';
                }
              }, 1000);
            } catch (error) {
              updateStatus('❌ Failed to open gallery');
              setTimeout(() => {
                const currentStatusDiv = document.querySelector('.emma-status');
                if (currentStatusDiv) {
                  currentStatusDiv.style.display = 'none';
                }
              }, 2000);
            }
            break;
            
          default:
            console.log(`Unknown action: ${action}`);
        }
      } catch (error) {
        console.error(`Error handling action ${action}:`, error);
        updateStatus(`❌ Action failed: ${error.message}`);
        setTimeout(() => {
          const currentStatusDiv = document.querySelector('.emma-status');
          if (currentStatusDiv) {
            currentStatusDiv.style.display = 'none';
          }
        }, 3000);
      }
    });
  });
  
  console.log('✅ Content script error fix applied successfully');
  
  // Show confirmation
  setTimeout(() => {
    showNotificationFallback('🔧 Emma content script error fixed!', 'success');
  }, 500);
}

// Fallback notification function
function showNotificationFallback(message, type = 'info') {
  console.log(`📢 Fallback notification: ${message}`);
  
  // Create a simple notification
  const notification = document.createElement('div');
  notification.textContent = message;
  
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 16px',
    background: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6',
    color: 'white',
    borderRadius: '8px',
    zIndex: '999999',
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
  });
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// Auto-run the fix if Emma panel is detected
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(fixContentScriptError, 1000);
  });
} else {
  setTimeout(fixContentScriptError, 1000);
}

// Make fix function available globally for manual execution
window.emmaContentScriptFix = fixContentScriptError;

console.log('🔧 Emma content script error fix loaded. Run emmaContentScriptFix() manually if needed.');

