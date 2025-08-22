/**
 * Google Photos Specific Capture Module
 * Designed to capture ALL photos from Google Photos albums
 */

class GooglePhotosCapture {
  constructor() {
    this.debug = true;
  }

  /**
   * Find all photos on a Google Photos page
   */
  findAllPhotos() {
    console.log('🔍 GooglePhotosCapture: Starting photo scan...');
    
    // Get ALL img elements
    const allImages = Array.from(document.querySelectorAll('img'));
    console.log(`🔍 Total img elements on page: ${allImages.length}`);
    
    const photos = [];
    const seenUrls = new Set();
    
    allImages.forEach((img, index) => {
      const src = img.src || img.dataset.src || '';
      const rect = img.getBoundingClientRect();
      
      // Skip if no source or already seen
      if (!src || seenUrls.has(src)) return;
      
      // Check if it's a Google-hosted image
      const isGoogleImage = 
        src.includes('googleusercontent.com') ||
        src.includes('lh3.google') ||
        src.includes('gstatic.com') ||
        src.includes('.google.com');
      
      if (!isGoogleImage) return;
      
      // Very liberal size check - Google Photos can have various sizes
      const minDimension = Math.min(rect.width, rect.height);
      const maxDimension = Math.max(rect.width, rect.height);
      
      // Skip only really tiny images (< 30px) or extreme aspect ratios
      if (minDimension < 30) {
        if (this.debug) console.log(`🔍 Skipping tiny image ${index}: ${minDimension}px`);
        return;
      }
      
      // Skip extreme aspect ratios (likely UI elements)
      const aspectRatio = maxDimension / minDimension;
      if (aspectRatio > 10) {
        if (this.debug) console.log(`🔍 Skipping extreme aspect ratio ${index}: ${aspectRatio}`);
        return;
      }
      
      // This is likely a photo!
      seenUrls.add(src);
      
      const photoData = {
        element: img,
        src: src,
        width: rect.width,
        height: rect.height,
        rect: {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        },
        selector: this.generateSelector(img),
        index: photos.length
      };
      
      photos.push(photoData);
      console.log(`📸 Photo ${photos.length}: ${src.substring(0, 60)}... (${Math.round(rect.width)}x${Math.round(rect.height)})`);
    });
    
    console.log(`📸 GooglePhotosCapture: Found ${photos.length} photos`);
    return photos;
  }

  /**
   * Generate a selector for re-finding the element
   */
  generateSelector(element) {
    // Try various attributes
    if (element.id) return `#${element.id}`;
    if (element.getAttribute('jsname')) return `img[jsname="${element.getAttribute('jsname')}"]`;
    if (element.className) return `img.${element.className.split(' ')[0]}`;
    
    // Fallback to src-based selector
    const src = element.src || element.dataset.src || '';
    if (src) {
      const srcPart = src.substring(0, 50);
      return `img[src^="${srcPart}"]`;
    }
    
    return 'img';
  }

  /**
   * Convert photos to Emma's expected format
   */
  toEmmaFormat(photos) {
    return photos.map(photo => ({
      src: photo.src,
      alt: photo.element.alt || '',
      tagName: 'img',
      selector: photo.selector,
      rect: photo.rect,
      dpr: window.devicePixelRatio || 1,
      metadata: {
        width: photo.width,
        height: photo.height,
        googlePhotos: true
      }
    }));
  }
}

// Export for use
window.GooglePhotosCapture = GooglePhotosCapture;




















