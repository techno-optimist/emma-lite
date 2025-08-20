/**
 * Emma Image Detection Content Script
 * Simplified version for image capture functionality
 * Built with love for Debbe and all precious memories 💜
 */

console.log('🖼️ Emma Image Detection Content Script loaded');

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
        // Dynamically load the image detector
        await loadImageDetectorModule();
      } catch (error) {
        console.error('🖼️ Failed to load image detector module:', error);
        return null;
      }
    }
    
    emmaImageDetector = new window.EmmaImageDetector();
  }
  
  return emmaImageDetector;
}

/**
 * Load image detector module dynamically
 */
function loadImageDetectorModule() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('../js/emma-image-detector.js');
    script.onload = resolve;
    script.onerror = reject;
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
