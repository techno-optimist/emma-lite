/**
 * Emma Simple Image Detection Content Script
 * Self-contained image detection without external dependencies
 * Built with love for Debbe and all precious memories 💜
 */

console.log('🖼️ Emma Simple Image Detection Content Script loaded on:', window.location.href);

/**
 * Simple image detection function - no external dependencies
 */
async function detectImagesOnPage() {
  console.log('🖼️ Starting simple image detection...');
  
  const images = [];
  const seenUrls = new Set();
  
  // Find all img elements
  const imgElements = document.querySelectorAll('img');
  console.log(`🖼️ Found ${imgElements.length} img elements`);
  
  for (const img of imgElements) {
    try {
      const src = img.src || img.dataset.src;
      if (!src || seenUrls.has(src)) continue;
      
      // Skip very small images (likely icons/decorations)
      const width = img.naturalWidth || img.width || 0;
      const height = img.naturalHeight || img.height || 0;
      
      if (width < 50 || height < 50) continue;
      
      // Skip data URLs for now (can be very large)
      if (src.startsWith('data:')) continue;
      
      seenUrls.add(src);
      
      const imageData = {
        id: `img_${images.length}`,
        url: src,
        alt: img.alt || '',
        title: img.title || '',
        width: width,
        height: height,
        filename: extractFilename(src),
        pageContext: {
          url: window.location.href,
          title: document.title,
          hostname: window.location.hostname
        },
        timestamp: Date.now()
      };
      
      images.push(imageData);
      
    } catch (error) {
      console.warn('🖼️ Error processing image:', error);
    }
  }
  
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
          
          seenUrls.add(url);
          
          const imageData = {
            id: `bg_${images.length}`,
            url: url,
            alt: element.getAttribute('aria-label') || '',
            title: element.title || '',
            width: element.clientWidth || 0,
            height: element.clientHeight || 0,
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
