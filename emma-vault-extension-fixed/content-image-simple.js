/**
 * Emma Simple Image Detection Content Script
 * Self-contained image detection without external dependencies
 * Built with love for Debbe and all precious memories 💜
 */

console.log('🖼️ Emma Simple Image Detection Content Script loaded on:', window.location.href);

/**
 * Simple image detection function with Google Photos optimization
 */
async function detectImagesOnPage() {
  console.log('🖼️ Starting image detection on:', window.location.hostname);
  
  const images = [];
  const seenUrls = new Set();
  const isGooglePhotos = window.location.hostname.includes('photos.google.com');
  
  let imgElements;
  
  if (isGooglePhotos) {
    console.log('🖼️ Using Google Photos optimized detection...');
    
    // Use Emma's proven Google Photos selectors
    const googlePhotosSelector = `
      img[src*="googleusercontent.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"]):not([style*="width: 32"]):not([style*="width: 40"]):not([style*="width: 48"]),
      img[src*="photos.google.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"]),
      img[src*="lh3.googleusercontent.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"]),
      img[src*="lh4.googleusercontent.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"]),
      img[src*="lh5.googleusercontent.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"]),
      img[src*="lh6.googleusercontent.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"])
    `.replace(/\s+/g, ' ').trim();
    
    imgElements = document.querySelectorAll(googlePhotosSelector);
    console.log(`🖼️ Google Photos: Found ${imgElements.length} filtered images`);
    
  } else {
    // Standard detection for other sites
    imgElements = document.querySelectorAll('img');
    console.log(`🖼️ Standard detection: Found ${imgElements.length} img elements`);
  }
  
  for (const img of imgElements) {
    try {
      let src = img.src || img.dataset.src;
      if (!src || seenUrls.has(src)) continue;
      
      // Get dimensions
      const rect = img.getBoundingClientRect();
      const width = img.naturalWidth || rect.width || img.width || 0;
      const height = img.naturalHeight || rect.height || img.height || 0;
      
      // Apply size filtering based on site
      if (isGooglePhotos) {
        // For Google Photos, be more permissive but still filter out tiny UI elements
        if (width < 100 || height < 100) {
          console.log(`🖼️ GP: Skipping small image: ${width}×${height}`);
          continue;
        }
      } else {
        // For other sites, standard filtering
        if (width < 50 || height < 50) continue;
      }
      
      // Skip data URLs for now (can be very large)
      if (src.startsWith('data:')) continue;
      
      // Additional Google Photos filtering
      if (isGooglePhotos) {
        // Skip obvious UI elements
        if (src.includes('avatar') || src.includes('profile') || 
            src.includes('icon') || src.includes('logo') ||
            src.includes('=s32') || src.includes('=s40') || src.includes('=s48')) {
          console.log(`🖼️ GP: Skipping UI element: ${src.substring(0, 80)}`);
          continue;
        }
        
        // Upgrade thumbnail URLs to higher quality
        if (src.includes('googleusercontent.com') && src.includes('=s')) {
          const upgradedSrc = src.replace(/=s\d+/g, '=s2048'); // High quality
          console.log(`🖼️ GP: Upgrading image quality: ${src.substring(0, 60)} → ${upgradedSrc.substring(0, 60)}`);
          src = upgradedSrc;
        }
      }
      
      seenUrls.add(src);
      
      const imageData = {
        id: `img_${images.length}`,
        url: src,
        alt: img.alt || '',
        title: img.title || '',
        width: width,
        height: height,
        filename: extractFilename(src),
        source: isGooglePhotos ? 'google-photos' : 'standard',
        pageContext: {
          url: window.location.href,
          title: document.title,
          hostname: window.location.hostname
        },
        timestamp: Date.now()
      };
      
      images.push(imageData);
      console.log(`🖼️ Added image: ${imageData.filename} (${width}×${height})`);
      
    } catch (error) {
      console.warn('🖼️ Error processing image:', error);
    }
  }
  
  // Skip CSS background detection for Google Photos (too many false positives)
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
