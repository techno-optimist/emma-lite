/**
 * EMMA RENDER CAPTURE ENGINE
 * 
 * Universal media capture at the rendering level
 * "If you can see it, Emma can save it"
 */

class RenderCaptureEngine {
  constructor() {
    this.debug = true;
    this.capturedMedia = [];
  }

  /**
   * Main entry point - captures ALL visual media on the page
   */
  async captureAllVisualMedia() {
    console.log('🎨 RenderCaptureEngine: Starting universal capture...');
    
    const media = [];
    
    // 1. Capture all rendered images (including CSS backgrounds)
    const images = await this.captureAllImages();
    media.push(...images);
    
    // 2. Capture video frames
    const videos = await this.captureVideoFrames();
    media.push(...videos);
    
    // 3. Capture canvas content
    const canvases = await this.captureCanvasContent();
    media.push(...canvases);
    
    // 4. Capture SVG graphics
    const svgs = await this.captureSVGGraphics();
    media.push(...svgs);
    
    // 5. Smart deduplication
    const uniqueMedia = this.deduplicateMedia(media);
    
    console.log(`🎨 Total unique media captured: ${uniqueMedia.length}`);
    return uniqueMedia;
  }

  /**
   * Capture all images including CSS backgrounds
   */
  async captureAllImages() {
    const captured = [];
    
    // Method 1: Standard img elements
    const imgElements = document.querySelectorAll('img');
    for (const img of imgElements) {
      const rect = img.getBoundingClientRect();
      if (this.isVisibleElement(rect)) {
        const captureData = await this.captureElement(img, 'img');
        if (captureData) captured.push(captureData);
      }
    }
    
    // Method 2: Elements with background images
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
      const style = window.getComputedStyle(element);
      const bgImage = style.backgroundImage;
      
      if (bgImage && bgImage !== 'none' && bgImage.includes('url')) {
        const rect = element.getBoundingClientRect();
        if (this.isVisibleElement(rect) && rect.width > 50 && rect.height > 50) {
          const captureData = await this.captureElement(element, 'background');
          if (captureData) captured.push(captureData);
        }
      }
    }
    
    // Method 3: Picture elements with sources
    const pictures = document.querySelectorAll('picture img');
    for (const img of pictures) {
      const rect = img.getBoundingClientRect();
      if (this.isVisibleElement(rect)) {
        const captureData = await this.captureElement(img, 'picture');
        if (captureData) captured.push(captureData);
      }
    }
    
    console.log(`🎨 Captured ${captured.length} images`);
    return captured;
  }

  /**
   * Capture video frames
   */
  async captureVideoFrames() {
    const captured = [];
    const videos = document.querySelectorAll('video');
    
    for (const video of videos) {
      const rect = video.getBoundingClientRect();
      if (this.isVisibleElement(rect) && video.readyState >= 2) {
        try {
          // Capture current frame
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          captured.push({
            type: 'video_frame',
            dataUrl: dataUrl,
            rect: rect,
            metadata: {
              currentTime: video.currentTime,
              duration: video.duration,
              poster: video.poster
            }
          });
        } catch (e) {
          console.log('🎨 Video frame capture failed:', e.message);
        }
      }
    }
    
    console.log(`🎨 Captured ${captured.length} video frames`);
    return captured;
  }

  /**
   * Capture canvas content
   */
  async captureCanvasContent() {
    const captured = [];
    const canvases = document.querySelectorAll('canvas');
    
    for (const canvas of canvases) {
      const rect = canvas.getBoundingClientRect();
      if (this.isVisibleElement(rect)) {
        try {
          const dataUrl = canvas.toDataURL('image/png');
          if (dataUrl && dataUrl !== 'data:,') {
            captured.push({
              type: 'canvas',
              dataUrl: dataUrl,
              rect: rect,
              metadata: {
                width: canvas.width,
                height: canvas.height
              }
            });
          }
        } catch (e) {
          console.log('🎨 Canvas capture failed:', e.message);
        }
      }
    }
    
    console.log(`🎨 Captured ${captured.length} canvases`);
    return captured;
  }

  /**
   * Capture SVG graphics
   */
  async captureSVGGraphics() {
    const captured = [];
    const svgs = document.querySelectorAll('svg');
    
    for (const svg of svgs) {
      const rect = svg.getBoundingClientRect();
      if (this.isVisibleElement(rect) && rect.width > 30 && rect.height > 30) {
        try {
          const svgData = new XMLSerializer().serializeToString(svg);
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);
          
          // Convert to image
          const img = new Image();
          img.src = url;
          await new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 1000);
          });
          
          if (img.complete) {
            const canvas = document.createElement('canvas');
            canvas.width = rect.width;
            canvas.height = rect.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, rect.width, rect.height);
            
            const dataUrl = canvas.toDataURL('image/png');
            captured.push({
              type: 'svg',
              dataUrl: dataUrl,
              rect: rect,
              metadata: {
                originalSvg: svgData.substring(0, 200) + '...'
              }
            });
          }
          
          URL.revokeObjectURL(url);
        } catch (e) {
          console.log('🎨 SVG capture failed:', e.message);
        }
      }
    }
    
    console.log(`🎨 Captured ${captured.length} SVGs`);
    return captured;
  }

  /**
   * Capture a specific element
   */
  async captureElement(element, type) {
    const rect = element.getBoundingClientRect();
    
    // Try multiple capture methods in order of preference
    const methods = [
      () => this.captureViaCanvas(element, rect),
      () => this.captureViaScreenshot(rect),
      () => this.captureViaDataUrl(element),
      () => this.captureViaDOMClone(element, rect)
    ];
    
    for (const method of methods) {
      try {
        const result = await method();
        if (result && result.dataUrl) {
          return {
            type: type,
            dataUrl: result.dataUrl,
            rect: rect,
            metadata: {
              method: result.method,
              originalSrc: element.src || element.currentSrc || null,
              alt: element.alt || null,
              title: element.title || null
            }
          };
        }
      } catch (e) {
        // Try next method
      }
    }
    
    return null;
  }

  /**
   * Capture via canvas (handles CORS gracefully)
   */
  async captureViaCanvas(element, rect) {
    if (element.tagName !== 'IMG') return null;
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d');
      
      // Try direct draw
      ctx.drawImage(element, 0, 0, rect.width, rect.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      if (dataUrl && dataUrl.length > 100) {
        return { dataUrl, method: 'canvas' };
      }
    } catch (e) {
      // CORS error - will try other methods
    }
    
    return null;
  }

  /**
   * Request screenshot of specific region from background
   */
  async captureViaScreenshot(rect) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'captureVisibleTab',
        region: {
          x: Math.max(0, rect.x),
          y: Math.max(0, rect.y),
          width: Math.min(rect.width, window.innerWidth - rect.x),
          height: Math.min(rect.height, window.innerHeight - rect.y)
        }
      });
      
      if (response && response.dataUrl) {
        return { dataUrl: response.dataUrl, method: 'screenshot' };
      }
    } catch (e) {
      console.log('🎨 Screenshot capture failed:', e.message);
    }
    
    return null;
  }

  /**
   * Try to get data URL directly
   */
  async captureViaDataUrl(element) {
    if (element.tagName !== 'IMG') return null;
    
    // Check if src is already a data URL
    const src = element.src || element.currentSrc;
    if (src && src.startsWith('data:')) {
      return { dataUrl: src, method: 'dataurl' };
    }
    
    return null;
  }

  /**
   * Clone element and render to canvas
   */
  async captureViaDOMClone(element, rect) {
    try {
      const clone = element.cloneNode(true);
      clone.style.position = 'fixed';
      clone.style.top = '0';
      clone.style.left = '0';
      clone.style.width = rect.width + 'px';
      clone.style.height = rect.height + 'px';
      clone.style.zIndex = '999999';
      document.body.appendChild(clone);
      
      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use html2canvas if available
      if (window.html2canvas) {
        const canvas = await window.html2canvas(clone);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        document.body.removeChild(clone);
        return { dataUrl, method: 'domclone' };
      }
      
      document.body.removeChild(clone);
    } catch (e) {
      // Clone method failed
    }
    
    return null;
  }

  /**
   * Check if element is visible
   */
  isVisibleElement(rect) {
    return rect.width > 0 && 
           rect.height > 0 && 
           rect.top < window.innerHeight &&
           rect.bottom > 0 &&
           rect.left < window.innerWidth &&
           rect.right > 0;
  }

  /**
   * Smart deduplication based on visual similarity
   */
  deduplicateMedia(media) {
    const unique = [];
    const seen = new Set();
    
    for (const item of media) {
      // Simple dedup by data URL length and position
      const key = `${item.dataUrl.length}_${Math.round(item.rect.x)}_${Math.round(item.rect.y)}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }
    
    return unique;
  }

  /**
   * Create smart contextual memory from captured media
   */
  async createContextualMemory(media) {
    const context = {
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      mediaCount: media.length,
      pageContext: this.extractPageContext(),
      mediaTypes: this.categorizeMedia(media)
    };
    
    return {
      content: this.generateMemoryContent(context),
      type: 'media_capture',
      source: 'render_capture',
      metadata: context,
      attachments: media
        .filter(item => item && item.dataUrl)  // Only include items with valid data
        .map((item, index) => ({
          id: `media_${Date.now()}_${index}`,
          type: 'image/jpeg',
          data: item.dataUrl,  // Keep full data URL
          filename: `capture_${index + 1}.jpg`,
          mimeType: 'image/jpeg',
          metadata: item.metadata
        }))
    };
  }

  /**
   * Extract page context for better memory generation
   */
  extractPageContext() {
    const context = {
      domain: window.location.hostname,
      path: window.location.pathname,
      isGallery: !!document.querySelector('[class*="gallery"], [class*="album"], [class*="photos"]'),
      isArticle: !!document.querySelector('article, [role="article"]'),
      isSocial: /twitter|facebook|instagram|reddit/i.test(window.location.hostname),
      hasVideo: document.querySelectorAll('video').length > 0
    };
    
    // Extract key text elements
    const headings = Array.from(document.querySelectorAll('h1, h2')).slice(0, 3);
    context.headings = headings.map(h => h.textContent.trim()).filter(t => t);
    
    return context;
  }

  /**
   * Categorize captured media
   */
  categorizeMedia(media) {
    const types = {};
    media.forEach(item => {
      types[item.type] = (types[item.type] || 0) + 1;
    });
    return types;
  }

  /**
   * Generate intelligent memory content
   */
  generateMemoryContent(context) {
    let content = `Visual content captured from ${context.title || context.url}\n\n`;
    
    if (context.mediaCount === 1) {
      content += `Saved 1 image`;
    } else {
      content += `Saved ${context.mediaCount} visual elements`;
    }
    
    // Add context-specific descriptions
    if (context.pageContext.isGallery) {
      content += ` from this photo gallery`;
    } else if (context.pageContext.isArticle) {
      content += ` from this article`;
    } else if (context.pageContext.isSocial) {
      content += ` from this social media post`;
    }
    
    // Add media type breakdown if diverse
    const types = Object.keys(context.mediaTypes);
    if (types.length > 1) {
      content += ` (${types.map(t => `${context.mediaTypes[t]} ${t}`).join(', ')})`;
    }
    
    // Add headings if available
    if (context.pageContext.headings && context.pageContext.headings.length > 0) {
      content += `\n\nContext: ${context.pageContext.headings[0]}`;
    }
    
    return content;
  }
}

// Export for use
window.RenderCaptureEngine = RenderCaptureEngine;
