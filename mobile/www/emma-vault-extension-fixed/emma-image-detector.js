/**
 * Emma Image Detector - Comprehensive Image Discovery System
 * Inspired by PactInteractive Image Downloader but enhanced for Emma's memory system
 * Built with love for Debbe and all precious memories 💜
 */

class EmmaImageDetector {
  constructor() {
    this.detectedImages = [];
    this.observer = null;
    this.isScanning = false;
    this.scanCount = 0;
    
    // Configuration
    this.config = {
      minWidth: 32,
      minHeight: 32,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'],
      excludeSelectors: [
        'img[src*="icon"]',
        'img[src*="logo"]', 
        'img[src*="button"]',
        'img[src*="arrow"]',
        'img[width="1"]',
        'img[height="1"]',
        'img[data-tracking]',
        '.ad img',
        '.advertisement img',
        '.sponsored img'
      ],
      includeDataUrls: false,
      includeSvg: true
    };
    
    console.log('🖼️ Emma Image Detector initialized');
  }

  /**
   * Start comprehensive image detection on the current page
   */
  async startDetection() {
    if (this.isScanning) {
      console.log('🖼️ Image detection already in progress');
      return this.detectedImages;
    }

    this.isScanning = true;
    this.detectedImages = [];
    this.scanCount++;
    
    console.log(`🖼️ Starting image detection scan #${this.scanCount} on ${window.location.hostname}`);
    
    try {
      // Detect images from multiple sources
      await this.detectImgElements();
      await this.detectCSSBackgroundImages();
      await this.detectLazyLoadedImages();
      await this.detectSVGImages();
      
      // Filter and deduplicate
      this.filterImages();
      this.deduplicateImages();
      
      // Sort by relevance/size
      this.sortImagesByRelevance();
      
      console.log(`🖼️ Detection complete: Found ${this.detectedImages.length} meaningful images`);
      
      // Set up observer for dynamically loaded images
      this.setupDynamicObserver();
      
      return this.detectedImages;
      
    } catch (error) {
      console.error('🖼️ Error during image detection:', error);
      return [];
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Detect all <img> elements on the page
   */
  async detectImgElements() {
    const imgElements = document.querySelectorAll('img');
    console.log(`🖼️ Found ${imgElements.length} img elements`);
    
    for (const img of imgElements) {
      try {
        const imageData = await this.extractImageData(img);
        if (imageData) {
          this.detectedImages.push(imageData);
        }
      } catch (error) {
        console.warn('🖼️ Failed to extract image data:', error);
      }
    }
  }

  /**
   * Detect CSS background images
   */
  async detectCSSBackgroundImages() {
    const elements = document.querySelectorAll('*');
    let backgroundCount = 0;
    
    for (const element of elements) {
      try {
        const style = window.getComputedStyle(element);
        const backgroundImage = style.backgroundImage;
        
        if (backgroundImage && backgroundImage !== 'none') {
          const urlMatch = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
          if (urlMatch && urlMatch[1]) {
            const imageData = await this.extractImageDataFromUrl(urlMatch[1], element);
            if (imageData) {
              imageData.source = 'css-background';
              this.detectedImages.push(imageData);
              backgroundCount++;
            }
          }
        }
      } catch (error) {
        // Silently continue - many elements will not have background images
      }
    }
    
    console.log(`🖼️ Found ${backgroundCount} CSS background images`);
  }

  /**
   * Detect lazy-loaded images that might not be visible yet
   */
  async detectLazyLoadedImages() {
    const lazySelectors = [
      'img[data-src]',
      'img[data-lazy]', 
      'img[data-original]',
      'img[data-srcset]',
      '[data-bg]',
      '[data-background]'
    ];
    
    let lazyCount = 0;
    
    for (const selector of lazySelectors) {
      const elements = document.querySelectorAll(selector);
      
      for (const element of elements) {
        try {
          const dataSrc = element.dataset.src || element.dataset.lazy || 
                         element.dataset.original || element.dataset.bg || 
                         element.dataset.background;
          
          if (dataSrc) {
            const imageData = await this.extractImageDataFromUrl(dataSrc, element);
            if (imageData) {
              imageData.source = 'lazy-loaded';
              imageData.isLazy = true;
              this.detectedImages.push(imageData);
              lazyCount++;
            }
          }
        } catch (error) {
          console.warn('🖼️ Failed to extract lazy image:', error);
        }
      }
    }
    
    console.log(`🖼️ Found ${lazyCount} lazy-loaded images`);
  }

  /**
   * Detect SVG images and graphics
   */
  async detectSVGImages() {
    if (!this.config.includeSvg) return;
    
    const svgElements = document.querySelectorAll('svg, img[src$=".svg"]');
    let svgCount = 0;
    
    for (const svg of svgElements) {
      try {
        const imageData = await this.extractSVGData(svg);
        if (imageData) {
          this.detectedImages.push(imageData);
          svgCount++;
        }
      } catch (error) {
        console.warn('🖼️ Failed to extract SVG:', error);
      }
    }
    
    console.log(`🖼️ Found ${svgCount} SVG images`);
  }

  /**
   * Extract comprehensive image data from an img element
   */
  async extractImageData(imgElement) {
    const src = imgElement.src || imgElement.dataset.src;
    if (!src || src === window.location.href) return null;
    
    // Skip data URLs if not configured to include them
    if (src.startsWith('data:') && !this.config.includeDataUrls) {
      return null;
    }
    
    // Check if image meets size requirements
    const naturalWidth = imgElement.naturalWidth || imgElement.width || 0;
    const naturalHeight = imgElement.naturalHeight || imgElement.height || 0;
    
    if (naturalWidth < this.config.minWidth || naturalHeight < this.config.minHeight) {
      return null;
    }
    
    // Extract metadata
    const imageData = {
      id: this.generateImageId(src),
      url: src,
      alt: imgElement.alt || '',
      title: imgElement.title || '',
      width: naturalWidth,
      height: naturalHeight,
      displayWidth: imgElement.width || naturalWidth,
      displayHeight: imgElement.height || naturalHeight,
      source: 'img-element',
      element: imgElement,
      filename: this.extractFilename(src),
      extension: this.extractExtension(src),
      isDataUrl: src.startsWith('data:'),
      pageContext: {
        url: window.location.href,
        title: document.title,
        hostname: window.location.hostname
      },
      metadata: {
        classes: imgElement.className,
        id: imgElement.id,
        parentElement: imgElement.parentElement?.tagName,
        ariaLabel: imgElement.getAttribute('aria-label'),
        role: imgElement.getAttribute('role')
      },
      timestamp: Date.now()
    };
    
    // Try to extract additional context from surrounding elements
    imageData.context = this.extractImageContext(imgElement);
    
    return imageData;
  }

  /**
   * Extract image data from a URL (for CSS backgrounds, lazy loading, etc.)
   */
  async extractImageDataFromUrl(url, element = null) {
    if (!url || url === window.location.href) return null;
    
    // Convert relative URLs to absolute
    const absoluteUrl = new URL(url, window.location.href).href;
    
    // Check if it's a supported image format
    if (!this.isSupportedImageFormat(absoluteUrl)) return null;
    
    const imageData = {
      id: this.generateImageId(absoluteUrl),
      url: absoluteUrl,
      alt: element?.alt || element?.getAttribute('aria-label') || '',
      title: element?.title || '',
      width: 0, // Will be determined when image loads
      height: 0,
      source: 'url-based',
      element: element,
      filename: this.extractFilename(absoluteUrl),
      extension: this.extractExtension(absoluteUrl),
      isDataUrl: absoluteUrl.startsWith('data:'),
      pageContext: {
        url: window.location.href,
        title: document.title,
        hostname: window.location.hostname
      },
      metadata: element ? {
        classes: element.className,
        id: element.id,
        parentElement: element.parentElement?.tagName
      } : {},
      timestamp: Date.now()
    };
    
    if (element) {
      imageData.context = this.extractImageContext(element);
    }
    
    return imageData;
  }

  /**
   * Extract SVG data
   */
  async extractSVGData(svgElement) {
    const imageData = {
      id: this.generateImageId(svgElement.outerHTML.substring(0, 100)),
      url: svgElement.tagName === 'svg' ? 'data:image/svg+xml;base64,' + btoa(svgElement.outerHTML) : svgElement.src,
      alt: svgElement.getAttribute('aria-label') || svgElement.alt || '',
      title: svgElement.title || svgElement.querySelector('title')?.textContent || '',
      width: svgElement.width?.baseVal?.value || svgElement.clientWidth || 0,
      height: svgElement.height?.baseVal?.value || svgElement.clientHeight || 0,
      source: 'svg',
      element: svgElement,
      filename: 'image.svg',
      extension: 'svg',
      isDataUrl: true,
      pageContext: {
        url: window.location.href,
        title: document.title,
        hostname: window.location.hostname
      },
      metadata: {
        classes: svgElement.className,
        id: svgElement.id,
        viewBox: svgElement.getAttribute('viewBox')
      },
      timestamp: Date.now()
    };
    
    imageData.context = this.extractImageContext(svgElement);
    
    return imageData;
  }

  /**
   * Extract contextual information around an image
   */
  extractImageContext(element) {
    const context = {
      caption: '',
      description: '',
      nearbyText: '',
      semanticRole: ''
    };
    
    // Look for figure/figcaption
    const figure = element.closest('figure');
    if (figure) {
      const figcaption = figure.querySelector('figcaption');
      if (figcaption) {
        context.caption = figcaption.textContent.trim();
      }
    }
    
    // Look for nearby text content
    const parent = element.parentElement;
    if (parent) {
      const textNodes = Array.from(parent.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent.trim())
        .filter(text => text.length > 0);
      
      context.nearbyText = textNodes.join(' ').substring(0, 200);
    }
    
    // Determine semantic role
    if (element.getAttribute('role')) {
      context.semanticRole = element.getAttribute('role');
    } else if (element.closest('article')) {
      context.semanticRole = 'article-image';
    } else if (element.closest('header')) {
      context.semanticRole = 'header-image';
    } else if (element.closest('main')) {
      context.semanticRole = 'main-content';
    }
    
    return context;
  }

  /**
   * Filter out unwanted images based on configuration
   */
  filterImages() {
    const beforeCount = this.detectedImages.length;
    
    this.detectedImages = this.detectedImages.filter(image => {
      // Check excluded selectors
      if (image.element) {
        for (const selector of this.config.excludeSelectors) {
          if (image.element.matches && image.element.matches(selector)) {
            return false;
          }
        }
      }
      
      // Check supported formats
      if (!this.isSupportedImageFormat(image.url)) {
        return false;
      }
      
      // Check size requirements
      if (image.width > 0 && image.height > 0) {
        if (image.width < this.config.minWidth || image.height < this.config.minHeight) {
          return false;
        }
      }
      
      return true;
    });
    
    console.log(`🖼️ Filtered images: ${beforeCount} → ${this.detectedImages.length}`);
  }

  /**
   * Remove duplicate images based on URL
   */
  deduplicateImages() {
    const beforeCount = this.detectedImages.length;
    const seenUrls = new Set();
    
    this.detectedImages = this.detectedImages.filter(image => {
      if (seenUrls.has(image.url)) {
        return false;
      }
      seenUrls.add(image.url);
      return true;
    });
    
    console.log(`🖼️ Deduplicated images: ${beforeCount} → ${this.detectedImages.length}`);
  }

  /**
   * Sort images by relevance (size, context, position)
   */
  sortImagesByRelevance() {
    this.detectedImages.sort((a, b) => {
      // Calculate relevance score
      const scoreA = this.calculateRelevanceScore(a);
      const scoreB = this.calculateRelevanceScore(b);
      
      return scoreB - scoreA; // Higher scores first
    });
  }

  /**
   * Calculate relevance score for an image
   */
  calculateRelevanceScore(image) {
    let score = 0;
    
    // Size score (larger images are more relevant)
    const area = (image.width || 0) * (image.height || 0);
    score += Math.min(area / 10000, 100); // Cap at 100 points
    
    // Context score
    if (image.alt && image.alt.length > 0) score += 20;
    if (image.title && image.title.length > 0) score += 15;
    if (image.context?.caption) score += 25;
    if (image.context?.description) score += 20;
    
    // Source type score
    switch (image.source) {
      case 'img-element': score += 10; break;
      case 'css-background': score += 5; break;
      case 'lazy-loaded': score += 8; break;
      case 'svg': score += 3; break;
    }
    
    // Semantic role score
    switch (image.context?.semanticRole) {
      case 'article-image': score += 15; break;
      case 'main-content': score += 12; break;
      case 'header-image': score += 8; break;
    }
    
    return score;
  }

  /**
   * Set up observer for dynamically loaded images
   */
  setupDynamicObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    this.observer = new MutationObserver((mutations) => {
      let hasNewImages = false;
      
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'IMG' || node.querySelector('img')) {
              hasNewImages = true;
            }
          }
        });
      });
      
      if (hasNewImages) {
        // Debounce detection to avoid excessive scanning
        clearTimeout(this.detectionTimeout);
        this.detectionTimeout = setTimeout(() => {
          this.startDetection();
        }, 1000);
      }
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Helper functions
   */
  generateImageId(input) {
    // Simple hash function for generating consistent IDs
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  extractFilename(url) {
    try {
      const pathname = new URL(url).pathname;
      return pathname.split('/').pop() || 'image';
    } catch {
      return 'image';
    }
  }

  extractExtension(url) {
    const filename = this.extractFilename(url);
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  }

  isSupportedImageFormat(url) {
    if (url.startsWith('data:image/')) return true;
    
    const extension = this.extractExtension(url);
    return this.config.supportedFormats.includes(extension);
  }

  /**
   * Get current detection results
   */
  getDetectedImages() {
    return this.detectedImages;
  }

  /**
   * Stop detection and clean up
   */
  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    if (this.detectionTimeout) {
      clearTimeout(this.detectionTimeout);
    }
    
    this.isScanning = false;
    console.log('🖼️ Emma Image Detector stopped');
  }
}

// Export for use in content script
if (typeof window !== 'undefined') {
  window.EmmaImageDetector = EmmaImageDetector;
  console.log('🖼️ EmmaImageDetector class exported to window');
}
