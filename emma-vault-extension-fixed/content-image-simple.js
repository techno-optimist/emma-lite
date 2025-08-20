/**
 * Emma Simple Image Detection Content Script
 * Self-contained image detection without external dependencies
 * Built with love for Debbe and all precious memories 💜
 */

console.log('🖼️ Emma Simple Image Detection Content Script loaded on:', window.location.href);

// ULTRA DEBUG: Add to window for testing
window.emmaImageDebug = {
  scriptLoaded: true,
  loadTime: new Date().toISOString(),
  url: window.location.href
};

console.log('🖼️ ULTRA DEBUG: Script definitely loaded, added window.emmaImageDebug');

/**
 * Simple image detection function - ULTRA SIMPLE for debugging
 */
async function detectImagesOnPage() {
  console.log('🖼️ ULTRA SIMPLE: Starting image detection on:', window.location.hostname);
  
  const images = [];
  const seenUrls = new Set();
  
  // Get ALL images first
  const allImages = document.querySelectorAll('img');
  console.log(`🖼️ ULTRA SIMPLE: Found ${allImages.length} total img elements`);
  
  // Log first 5 images for debugging
  for (let i = 0; i < Math.min(5, allImages.length); i++) {
    const img = allImages[i];
    console.log(`🖼️ DEBUG Image ${i}:`, {
      src: img.src?.substring(0, 80),
      width: img.width,
      height: img.height,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      clientWidth: img.clientWidth,
      clientHeight: img.clientHeight
    });
  }
  
  // Very permissive filtering for now - just basic requirements
  for (const img of allImages) {
    try {
      const src = img.src;
      if (!src || seenUrls.has(src)) {
        console.log('🖼️ SKIP: No src or duplicate');
        continue;
      }
      
      // Skip obvious data URLs and empty sources
      if (src.startsWith('data:') || src === window.location.href) {
        console.log('🖼️ SKIP: Data URL or same as page');
        continue;
      }
      
      // Very basic size check - just exclude 1x1 tracking pixels
      const width = img.naturalWidth || img.width || img.clientWidth || 0;
      const height = img.naturalHeight || img.height || img.clientHeight || 0;
      
      if (width <= 1 || height <= 1) {
        console.log(`🖼️ SKIP: Tracking pixel ${width}×${height}`);
        continue;
      }
      
      // For now, include everything else to see what we get
      seenUrls.add(src);
      
      const imageData = {
        id: `img_${images.length}`,
        url: src,
        alt: img.alt || '',
        title: img.title || '',
        width: width,
        height: height,
        filename: extractFilename(src),
        source: 'ultra-simple',
        pageContext: {
          url: window.location.href,
          title: document.title,
          hostname: window.location.hostname
        },
        timestamp: Date.now()
      };
      
      images.push(imageData);
      console.log(`🖼️ ADDED: ${imageData.filename} (${width}×${height}) from ${src.substring(0, 60)}`);
      
    } catch (error) {
      console.warn('🖼️ Error processing image:', error);
    }
  }
  
  // Skip CSS background detection for Google Photos (too many false positives)
  const isGooglePhotos = window.location.hostname.includes('photos.google.com');
  if (!isGooglePhotos) {
    // Also check for CSS background images on key elements
    const elementsWithBackgrounds = document.querySelectorAll('div, section, article, header');
    console.log(`🖼️ Checking ${elementsWithBackgrounds.length} elements for background images`);
    
    for (const element of elementsWithBackgrounds) {
      try {
        const style = window.getComputedStyle(element);
        const backgroundImage = style.backgroundImage;
        
        if (backgroundImage && backgroundImage !== 'none') {
          const urlMatch = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
          if (urlMatch && urlMatch[1] && !seenUrls.has(urlMatch[1])) {
            const url = urlMatch[1];
            
            // Skip data URLs and very small images
            if (url.startsWith('data:') || url.includes('1x1') || url.includes('pixel')) continue;
            
            // Additional filtering for background images
            if (url.includes('icon') || url.includes('logo') || url.includes('button') || 
                url.includes('arrow') || url.includes('spinner')) continue;
            
            const elementWidth = element.clientWidth || 0;
            const elementHeight = element.clientHeight || 0;
            
            // Only include reasonably sized background images
            if (elementWidth < 100 || elementHeight < 100) continue;
            
            seenUrls.add(url);
            
            const imageData = {
              id: `bg_${images.length}`,
              url: url,
              alt: element.getAttribute('aria-label') || '',
              title: element.title || '',
              width: elementWidth,
              height: elementHeight,
              filename: extractFilename(url),
              source: 'css-background',
              pageContext: {
                url: window.location.href,
                title: document.title,
                hostname: window.location.hostname
              },
              timestamp: Date.now()
            };
            
            images.push(imageData);
          }
        }
      } catch (error) {
        // Silently continue
      }
    }
  }
  
  console.log(`🖼️ Simple detection complete: Found ${images.length} images`);
  return images;
}

/**
 * Extract filename from URL
 */
function extractFilename(url) {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop() || 'image';
    return filename.includes('.') ? filename : 'image.jpg';
  } catch {
    return 'image.jpg';
  }
}

// Set up message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('🖼️ Simple content script received message:', message.action);
  
  if (message.action === 'DETECT_IMAGES') {
    console.log('🖼️ Processing DETECT_IMAGES request...');
    
    detectImagesOnPage().then(images => {
      console.log(`🖼️ Sending back ${images.length} images`);
      sendResponse({ success: true, images });
    }).catch(error => {
      console.error('🖼️ Error in simple image detection:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // Indicates async response
  }
  
  return false;
});

console.log('🖼️ Emma Simple Image Detection Content Script ready');
