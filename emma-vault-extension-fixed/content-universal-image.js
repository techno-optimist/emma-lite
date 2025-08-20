/**
 * Emma Image Detection Content Script
 * Simplified version for image capture functionality
 * Built with love for Debbe and all precious memories 💜
 */

console.log('🖼️ Emma Image Detection Content Script loaded on:', window.location.href);
console.log('🖼️ User agent:', navigator.userAgent);
console.log('🖼️ Document ready state:', document.readyState);

// 🖼️ Emma Image Detection Integration
let emmaImageDetector = null;

/**
 * Initialize Emma Image Detector when requested
 */
async function initializeImageDetector() {
  if (!emmaImageDetector) {
    // Load the image detector module if not already loaded
    if (!window.EmmaImageDetector) {
      try {
        console.log('🖼️ EmmaImageDetector not found, loading module...');
        // Dynamically load the image detector
        await loadImageDetectorModule();
        
        // Check if it loaded properly
        if (!window.EmmaImageDetector) {
          throw new Error('EmmaImageDetector class not found after loading module');
        }
        
        console.log('🖼️ EmmaImageDetector type:', typeof window.EmmaImageDetector);
        console.log('🖼️ EmmaImageDetector constructor:', window.EmmaImageDetector.constructor);
        
      } catch (error) {
        console.error('🖼️ Failed to load image detector module:', error);
        return null;
      }
    }
    
    try {
      console.log('🖼️ Creating new EmmaImageDetector instance...');
      emmaImageDetector = new window.EmmaImageDetector();
      console.log('🖼️ EmmaImageDetector instance created successfully');
    } catch (error) {
      console.error('🖼️ Failed to create EmmaImageDetector instance:', error);
      return null;
    }
  }
  
  return emmaImageDetector;
}

/**
 * Load image detector module dynamically
 */
function loadImageDetectorModule() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const scriptUrl = chrome.runtime.getURL('emma-image-detector.js');
    console.log('🖼️ Loading image detector from:', scriptUrl);
    
    script.src = scriptUrl;
    script.onload = () => {
      console.log('🖼️ Image detector script loaded successfully');
      resolve();
    };
    script.onerror = (error) => {
      console.error('🖼️ Failed to load image detector script:', error);
      reject(error);
    };
    document.head.appendChild(script);
  });
}

/**
 * Handle image detection requests from popup
 */
async function handleImageDetectionRequest() {
  try {
    console.log('🖼️ Starting image detection for popup...');
    
    const detector = await initializeImageDetector();
    if (!detector) {
      throw new Error('Failed to initialize image detector');
    }
    
    const images = await detector.startDetection();
    
    console.log(`🖼️ Detected ${images.length} images for popup`);
    
    return images;
    
  } catch (error) {
    console.error('🖼️ Image detection failed:', error);
    throw error;
  }
}

// Set up message listener for image detection
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('🖼️ Content script received message:', message.action);
  
  if (message.action === 'DETECT_IMAGES') {
    console.log('🖼️ Processing DETECT_IMAGES request...');
    
    handleImageDetectionRequest().then(images => {
      console.log(`🖼️ Sending back ${images.length} images`);
      sendResponse({ success: true, images });
    }).catch(error => {
      console.error('🖼️ Error in image detection:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // Indicates async response
  }
  
  return false; // Let other handlers process other messages
});

console.log('🖼️ Emma Image Detection Content Script ready');

// Test if we're on an extension page (content scripts don't normally run there)
if (window.location.protocol === 'chrome-extension:') {
  console.log('🖼️ WARNING: Content script running on extension page - this is unusual');
  console.log('🖼️ Try testing on a regular webpage like google.com or news site');
}
