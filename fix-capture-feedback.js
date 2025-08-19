/**
 * Fix for Emma Capture Page Visual Feedback
 * This script enhances the notification system and adds better visual feedback
 */

// Enhanced notification system with better styling and positioning
function enhancedShowNotification(message, type = 'info', duration = 4000) {
  console.log(`📢 Enhanced Notification: ${type.toUpperCase()}: ${message}`);
  
  // Remove any existing notifications first
  const existingNotifications = document.querySelectorAll('.emma-enhanced-notification');
  existingNotifications.forEach(notif => notif.remove());
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `emma-enhanced-notification notification-${type}`;
  notification.textContent = message;
  
  // Enhanced styling with higher z-index and better positioning
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '16px 20px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    zIndex: '999999', // Much higher z-index
    maxWidth: '350px',
    minWidth: '250px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    lineHeight: '1.4',
    wordWrap: 'break-word',
    transform: 'translateX(400px) scale(0.9)',
    opacity: '0',
    transition: 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    background: type === 'error' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 
                type === 'warning' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
                type === 'success' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
  });
  
  // Add icon based on type
  const icon = document.createElement('span');
  icon.style.marginRight = '8px';
  icon.style.fontSize = '16px';
  icon.textContent = type === 'error' ? '❌' : 
                     type === 'warning' ? '⚠️' :
                     type === 'success' ? '✅' : 
                     'ℹ️';
  
  notification.insertBefore(icon, notification.firstChild);
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0) scale(1)';
    notification.style.opacity = '1';
  }, 10);
  
  // Auto-remove after specified duration
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.transform = 'translateX(400px) scale(0.9)';
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 400);
    }
  }, duration);
  
  return notification;
}

// Enhanced capture button with visual feedback
function enhanceCaptureButton() {
  const captureBtn = document.getElementById('capture-btn');
  if (!captureBtn) {
    console.log('❌ Capture button not found');
    return;
  }
  
  console.log('🔧 Enhancing capture button with visual feedback...');
  
  // Add loading state styling
  const addLoadingState = () => {
    captureBtn.style.opacity = '0.7';
    captureBtn.style.transform = 'scale(0.95)';
    captureBtn.style.pointerEvents = 'none';
    
    // Add loading animation
    const originalIcon = captureBtn.querySelector('.action-icon');
    if (originalIcon) {
      originalIcon.style.animation = 'spin 1s linear infinite';
      originalIcon.textContent = '⏳';
    }
    
    // Add loading text
    const actionTitle = captureBtn.querySelector('.action-title');
    if (actionTitle) {
      actionTitle.dataset.original = actionTitle.textContent;
      actionTitle.textContent = 'Capturing...';
    }
  };
  
  const removeLoadingState = () => {
    captureBtn.style.opacity = '';
    captureBtn.style.transform = '';
    captureBtn.style.pointerEvents = '';
    
    // Reset icon
    const originalIcon = captureBtn.querySelector('.action-icon');
    if (originalIcon) {
      originalIcon.style.animation = '';
      originalIcon.textContent = '📸';
    }
    
    // Reset text
    const actionTitle = captureBtn.querySelector('.action-title');
    if (actionTitle && actionTitle.dataset.original) {
      actionTitle.textContent = actionTitle.dataset.original;
    }
  };
  
  // Add CSS for spin animation
  if (!document.querySelector('#capture-enhancement-styles')) {
    const style = document.createElement('style');
    style.id = 'capture-enhancement-styles';
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      .emma-enhanced-notification {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        z-index: 999999 !important;
      }
      
      .capture-button-enhanced {
        transition: all 0.3s ease !important;
      }
      
      .capture-button-enhanced:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 24px rgba(118, 75, 162, 0.3) !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  captureBtn.classList.add('capture-button-enhanced');
  
  // Override the capture function with enhanced feedback
  const originalCaptureFunction = window.captureCurrentPage || (() => {
    console.log('Original capture function not found, using enhanced fallback');
  });
  
  // Enhanced capture function with better feedback
  window.enhancedCaptureCurrentPage = async function() {
    console.log('🚀 Enhanced Capture: Starting...');
    
    // Show immediate feedback
    addLoadingState();
    enhancedShowNotification('🔍 Starting page capture...', 'info', 2000);
    
    try {
      // Check vault status first
      try {
        const vs = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });
        if (!vs || !vs.success || !vs.isUnlocked) {
          removeLoadingState();
          enhancedShowNotification('🔒 Please unlock your vault first to capture memories', 'warning', 5000);
          return;
        }
      } catch {
        removeLoadingState();
        enhancedShowNotification('⚠️ Vault status unknown. Please unlock first for secure capture.', 'warning', 5000);
        return;
      }
      
      console.log('✅ Enhanced Capture: Vault check passed');
      
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        removeLoadingState();
        enhancedShowNotification('❌ No active tab found', 'error');
        return;
      }
      
      console.log(`🎯 Enhanced Capture: Starting for ${tab.url}`);
      
      // Check if it's a valid URL
      if (!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
        removeLoadingState();
        enhancedShowNotification('❌ Cannot capture from this type of page', 'error');
        return;
      }
      
      // Update progress
      enhancedShowNotification('📡 Checking page compatibility...', 'info', 3000);
      
      // Test if universal content script is active
      try {
        console.log('🔍 Enhanced Capture: Testing universal content script...');
        const pingResponse = await Promise.race([
          chrome.tabs.sendMessage(tab.id, { action: 'ping' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 2000))
        ]);
        
        console.log('✅ Enhanced Capture: Universal content script active:', pingResponse);
        
        // Content script is active, send capture request
        enhancedShowNotification('🔍 Analyzing page content...', 'info', 4000);

        const captureResponse = await Promise.race([
          chrome.tabs.sendMessage(tab.id, { action: 'captureNow' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Capture timeout after 10 seconds')), 10000))
        ]);
        
        console.log('📸 Enhanced Capture: Response received:', captureResponse);
        
        if (captureResponse && captureResponse.success) {
          const count = captureResponse.count || 'some';
          removeLoadingState();
          enhancedShowNotification(`🎉 Successfully captured ${count} memories from this page!`, 'success', 6000);
        } else {
          const errorMsg = captureResponse?.error || captureResponse?.message || 'Unknown capture error';
          console.error('❌ Enhanced Capture: Failed with response:', captureResponse);
          removeLoadingState();
          enhancedShowNotification(`❌ Capture failed: ${errorMsg}`, 'error', 6000);
        }
        
      } catch (pingError) {
        console.log('⚠️ Enhanced Capture: Universal content script not responding, will inject...', pingError.message);
        
        // Content script not active, inject it
        try {
          console.log('💉 Enhanced Capture: Injecting universal content script...');
          enhancedShowNotification('🔧 Setting up Emma on this page...', 'info', 4000);
          
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['js/content-universal.js']
          });
          
          console.log('✅ Enhanced Capture: Universal content script injected');
          enhancedShowNotification('⏳ Initializing Emma...', 'info', 3000);
          
          // Wait for initialization
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Try ping again to confirm it's ready
          let scriptReady = false;
          for (let i = 0; i < 5; i++) {
            try {
              const testPing = await Promise.race([
                chrome.tabs.sendMessage(tab.id, { action: 'ping' }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Test ping timeout')), 1000))
              ]);
              
              console.log(`✅ Enhanced Capture: Universal script ready (attempt ${i + 1}):`, testPing);
              scriptReady = true;
              break;
            } catch (e) {
              console.log(`⏳ Enhanced Capture: Waiting for script to initialize (attempt ${i + 1})...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          
          if (scriptReady) {
            // Now try capture
            enhancedShowNotification('📸 Capturing page content...', 'info', 4000);
            
            const finalCaptureResponse = await Promise.race([
              chrome.tabs.sendMessage(tab.id, { action: 'captureNow' }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Final capture timeout')), 10000))
            ]);
            
            console.log('🎯 Enhanced Capture: Final capture response:', finalCaptureResponse);
            
            if (finalCaptureResponse && finalCaptureResponse.success) {
              const count = finalCaptureResponse.count || 'some';
              removeLoadingState();
              enhancedShowNotification(`🎉 Successfully captured ${count} memories from this page!`, 'success', 6000);
            } else {
              removeLoadingState();
              enhancedShowNotification(`⚠️ ${finalCaptureResponse?.message || 'No content found to capture'}`, 'warning', 5000);
            }
          } else {
            removeLoadingState();
            enhancedShowNotification('❌ Failed to initialize Emma on this page', 'error', 5000);
          }
          
        } catch (injectionError) {
          console.error('💥 Enhanced Capture: Failed to inject universal content script:', injectionError);
          removeLoadingState();
          enhancedShowNotification('❌ Failed to inject Emma: ' + injectionError.message, 'error', 6000);
        }
      }
      
    } catch (error) {
      console.error('💥 Enhanced Capture: Failed:', error);
      removeLoadingState();
      enhancedShowNotification('❌ Failed to capture: ' + error.message, 'error', 5000);
    }
  };
  
  // Replace the original click handler
  const newCaptureBtn = captureBtn.cloneNode(true);
  captureBtn.parentNode.replaceChild(newCaptureBtn, captureBtn);
  
  newCaptureBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 Enhanced Capture Button Clicked!');
    window.enhancedCaptureCurrentPage();
  });
  
  console.log('✅ Capture button enhanced with better visual feedback');
}

// Pulse effect for the capture button to indicate it's ready
function addCaptureButtonPulse() {
  const captureBtn = document.getElementById('capture-btn');
  if (!captureBtn) return;
  
  // Add subtle pulse animation
  const style = document.createElement('style');
  style.textContent = `
    .capture-ready-pulse {
      animation: capture-pulse 3s ease-in-out infinite;
    }
    
    @keyframes capture-pulse {
      0%, 100% { 
        box-shadow: 0 0 0 0 rgba(118, 75, 162, 0.4);
        transform: scale(1);
      }
      50% { 
        box-shadow: 0 0 0 8px rgba(118, 75, 162, 0.1);
        transform: scale(1.02);
      }
    }
  `;
  document.head.appendChild(style);
  
  captureBtn.classList.add('capture-ready-pulse');
  
  // Remove pulse after first click
  captureBtn.addEventListener('click', () => {
    captureBtn.classList.remove('capture-ready-pulse');
  }, { once: true });
}

// Initialize enhancements
function initializeCaptureEnhancements() {
  console.log('🚀 Initializing capture visual feedback enhancements...');
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        enhanceCaptureButton();
        addCaptureButtonPulse();
        console.log('✅ Capture enhancements initialized');
      }, 100);
    });
  } else {
    setTimeout(() => {
      enhanceCaptureButton();
      addCaptureButtonPulse();
      console.log('✅ Capture enhancements initialized');
    }, 100);
  }
  
  // Show initialization notification
  setTimeout(() => {
    enhancedShowNotification('🎯 Emma capture system enhanced! Click "Capture Page" to test.', 'info', 4000);
  }, 500);
}

// Auto-initialize if this script is loaded
if (typeof window !== 'undefined') {
  initializeCaptureEnhancements();
}

// Export for manual use
window.enhanceCaptureSystem = {
  enhance: initializeCaptureEnhancements,
  showNotification: enhancedShowNotification,
  enhanceButton: enhanceCaptureButton
};

console.log('🔧 Enhanced capture feedback system loaded and ready!');

