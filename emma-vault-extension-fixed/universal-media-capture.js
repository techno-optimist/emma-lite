/**
 * Universal Media Capture Engine
 * Works on ANY website using intelligent content analysis
 */

// Prevent double-declaration when the script is injected multiple times
if (typeof window !== 'undefined' && window.UniversalMediaCapture) {
  console.log('🔍 UNIVERSAL: UniversalMediaCapture already loaded, skipping redefine');
} else {

class _UniversalMediaCapture {
  constructor() {
    this.capturedElements = new Set();
    this.qualityThreshold = 3; // Configurable
    this.maxElements = 100; // Safety limit
  }

  /**
   * Main entry point: Capture all high-quality media from current page
   */
  async capturePageMedia(options = {}) {
    console.log('🔍 UNIVERSAL: Starting intelligent media capture...');
    
    const {
      includeVideos = true,
      qualityThreshold = this.qualityThreshold,
      maxElements = this.maxElements,
      scrollToLoad = true
    } = options;

    // Step 1: Optionally scroll to trigger lazy loading
    if (scrollToLoad) {
      await this.triggerLazyLoading();
    }

    // Step 2: Find all media elements
    const allMedia = this.findAllMediaElements(includeVideos);
    console.log(`🔍 UNIVERSAL: Found ${allMedia.length} total media elements`);

    // Step 3: Score and filter using intelligent heuristics
    const scoredMedia = allMedia.map(element => ({
      element,
      score: this.calculateQualityScore(element),
      metadata: this.extractMetadata(element)
    }));

    // Step 4: Filter by quality threshold
    const highQualityMedia = scoredMedia
      .filter(item => item.score >= qualityThreshold)
      .sort((a, b) => b.score - a.score) // Best quality first
      .slice(0, maxElements); // Safety limit

    console.log(`🔍 UNIVERSAL: ${highQualityMedia.length} high-quality items (threshold: ${qualityThreshold})`);
    
    // Step 5: Convert to capture format
    const captureData = highQualityMedia.map(item => this.prepareCaptureData(item));

    return {
      success: true,
      elements: captureData,
      summary: {
        totalFound: allMedia.length,
        highQuality: highQualityMedia.length,
        threshold: qualityThreshold,
        scores: scoredMedia.map(s => s.score)
      }
    };
  }

  /**
   * Find all image and video elements on the page
   */
  findAllMediaElements(includeVideos = true) {
    const selectors = ['img'];
    if (includeVideos) selectors.push('video');
    
    const elements = [];
    
    for (const selector of selectors) {
      const found = document.querySelectorAll(selector);
      elements.push(...Array.from(found));
    }

    // Remove duplicates and ensure visibility
    return elements.filter((element, index, array) => {
      // Remove duplicates by src
      const src = element.currentSrc || element.src;
      return src && array.findIndex(e => (e.currentSrc || e.src) === src) === index;
    });
  }

  /**
   * Calculate quality score using multiple heuristics
   */
  calculateQualityScore(element) {
    let score = 0;
    const rect = element.getBoundingClientRect();
    const src = element.currentSrc || element.src || '';
    
    // 1. Size-based scoring
    const area = rect.width * rect.height;
    if (area >= 640000) score += 3; // >= 800x800
    else if (area >= 160000) score += 2; // >= 400x400  
    else if (area >= 40000) score += 1; // >= 200x200
    else if (area < 10000) score -= 2; // < 100x100 (likely thumbnail)

    // 2. Aspect ratio analysis
    const aspectRatio = rect.width / rect.height;
    if (aspectRatio >= 0.2 && aspectRatio <= 5) score += 1; // Reasonable aspect ratio
    else score -= 2; // Extreme aspect ratio (likely UI)

    // 3. URL pattern analysis
    const srcLower = src.toLowerCase();
    if (srcLower.includes('thumbnail') || srcLower.includes('thumb')) score -= 2;
    if (srcLower.includes('icon') || srcLower.includes('avatar')) score -= 2;
    if (srcLower.includes('full') || srcLower.includes('original')) score += 2;
    if (srcLower.includes('large') || srcLower.includes('=s4096')) score += 1;
    if (srcLower.match(/=s(8|16|24|32|40|48|64|80|96|128)($|[^0-9])/)) score -= 1;

    // 4. DOM context analysis
    const parent = element.closest('nav, header, footer, .nav, .header, .footer');
    if (parent) score -= 1;
    
    const mainContent = element.closest('main, article, .content, .post, .photo');
    if (mainContent) score += 1;

    if (element.alt && element.alt.length > 5) score += 1; // Has descriptive alt text

    // 5. Visibility scoring
    if (this.isInViewport(rect)) score += 2;
    else if (this.wasRecentlyVisible(element)) score += 1;

    // 6. File extension bonus
    if (srcLower.match(/\.(jpg|jpeg|png|webp|avif)(\?|$)/)) score += 1;

    return score;
  }

  /**
   * Check if element is currently visible
   */
  isInViewport(rect) {
    return rect.top >= 0 && 
           rect.left >= 0 && 
           rect.bottom <= window.innerHeight && 
           rect.right <= window.innerWidth;
  }

  /**
   * Extract useful metadata from element
   */
  extractMetadata(element) {
    const rect = element.getBoundingClientRect();
    return {
      src: element.currentSrc || element.src,
      alt: element.alt || '',
      width: rect.width,
      height: rect.height,
      area: rect.width * rect.height,
      aspectRatio: rect.width / rect.height,
      tagName: element.tagName.toLowerCase(),
      visible: this.isInViewport(rect)
    };
  }

  /**
   * Convert scored element to capture format
   */
  prepareCaptureData(item) {
    const { element, score, metadata } = item;
    const rect = element.getBoundingClientRect();
    
    // Upgrade URL to highest quality if possible
    const upgradedSrc = this.upgradeImageURL(metadata.src);
    
    return {
      tagName: metadata.tagName,
      src: upgradedSrc,
      originalSrc: metadata.src,
      rect: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      },
      metadata: {
        ...metadata,
        qualityScore: score,
        upgraded: upgradedSrc !== metadata.src
      },
      dpr: window.devicePixelRatio || 1,
      selector: this.generateElementSelector(element)
    };
  }

  /**
   * Attempt to upgrade image URL to highest quality
   */
  upgradeImageURL(src) {
    if (!src) return src;
    
    try {
      const url = new URL(src, window.location.href);
      
      // Google services upgrade
      if (url.hostname.includes('googleusercontent.com') || 
          url.hostname.includes('photos.google.com')) {
        let upgraded = src.replace(/=s(\d+)(?=[^0-9]|$)/g, '=s4096');
        upgraded = upgraded.replace(/w\d+-h\d+/g, 'w4096-h4096');
        upgraded = upgraded.replace(/=w\d+-h\d+-no/g, '=w4096-h4096-no');
        return upgraded;
      }
      
      // Instagram upgrade
      if (url.hostname.includes('cdninstagram.com')) {
        return src.replace(/\/s\d+x\d+\//, '/');
      }
      
      // Pinterest upgrade  
      if (url.hostname.includes('pinimg.com')) {
        return src.replace(/\/\d+x\//, '/originals/');
      }
      
      // Default: return original
      return src;
    } catch {
      return src;
    }
  }

  /**
   * Trigger lazy loading by scrolling
   */
  async triggerLazyLoading() {
    console.log('🔍 UNIVERSAL: Triggering lazy loading...');
    
    const originalPosition = window.scrollY;
    const step = Math.max(window.innerHeight, 800);
    const maxScrolls = 5; // Reasonable limit
    
    for (let i = 0; i < maxScrolls; i++) {
      window.scrollBy(0, step);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Restore original position
    window.scrollTo(0, originalPosition);
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  /**
   * Generate CSS selector for element
   */
  generateElementSelector(element) {
    if (element.id) return `#${element.id}`;
    
    let selector = element.tagName.toLowerCase();
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.length > 0);
      if (classes.length > 0) {
        selector += '.' + classes.slice(0, 2).join('.');
      }
    }
    
    return selector;
  }

  /**
   * Check if element was recently visible (placeholder for now)
   */
  wasRecentlyVisible(element) {
    // Could implement with IntersectionObserver tracking
    return false;
  }
}

// Export for use - ensure it's properly attached to window
if (typeof window !== 'undefined') {
  window.UniversalMediaCapture = _UniversalMediaCapture;
  console.log('🔍 UNIVERSAL: UniversalMediaCapture class exported to window');
} else {
  console.warn('🔍 UNIVERSAL: window object not available for export');
}

// Also support module exports if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = _UniversalMediaCapture;
}

// 🚨 CRITICAL FIX: Add SAVE_MEMORY_TO_WEBAPP_VAULT handler for non-Emma pages ONLY
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🚨📡 UNIVERSAL: MESSAGE RECEIVED!', request.action, 'on page:', window.location.href);
  
  // CRITICAL: Only handle if NOT on Emma domain (prevent infinite loop!)
  const isEmmaDomain = window.location.href.includes('emma-hjjc.onrender.com') || 
                       window.location.href.includes('emma-lite-extension.onrender.com') ||
                       window.location.href.includes('localhost') ||
                       window.location.href.includes('127.0.0.1');
  
  if (request.action === 'SAVE_MEMORY_TO_WEBAPP_VAULT') {
    if (isEmmaDomain) {
      console.log('🚨🚫 UNIVERSAL: On Emma domain - letting content-script.js handle this!');
      return false; // Let content-script.js handle it
    }
    
    console.log('🚨⚠️ UNIVERSAL: Got save request on non-Emma page! Redirecting to background...');
    console.log('🚨⚠️ UNIVERSAL: This should have been sent to Emma dashboard tab!');
    
    // Forward to background to handle properly
    chrome.runtime.sendMessage({
      action: 'RELAY_SAVE_TO_WEBAPP',
      originalData: request.memoryData,
      fromPage: window.location.href
    }).then(result => {
      console.log('🚨⚠️ UNIVERSAL: Relay result:', result);
      sendResponse(result);
    }).catch(error => {
      console.error('🚨❌ UNIVERSAL: Relay failed:', error);
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // Keep message channel open for async response
  }
});

}
