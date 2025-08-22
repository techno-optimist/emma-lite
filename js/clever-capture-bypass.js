/**
 * EMMA CLEVER CAPTURE BYPASS SYSTEM
 * 
 * This system uses multiple ingenious techniques to capture photos 
 * even when ad blockers or network restrictions are in place.
 * 
 * Philosophy: "If it's rendered, it's capturable"
 */

class EmmaCleverCaptureBypass {
  constructor() {
    this.maxRetries = 3;
    this.debugMode = true;
    this.capturedElements = new Set();
  }

  log(message, ...args) {
    if (this.debugMode) {
      console.log(`🧠 CLEVER BYPASS: ${message}`, ...args);
    }
  }

  /**
   * TECHNIQUE 1: Canvas Re-rendering
   * Draw the image to a canvas to get pixel data directly
   */
  async captureViaCanvas(imgElement) {
    try {
      this.log('Attempting canvas re-rendering capture...');
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size to match image
      const rect = imgElement.getBoundingClientRect();
      canvas.width = imgElement.naturalWidth || rect.width;
      canvas.height = imgElement.naturalHeight || rect.height;
      
      // Wait for image to load if not already loaded
      if (!imgElement.complete) {
        await new Promise((resolve, reject) => {
          imgElement.onload = resolve;
          imgElement.onerror = reject;
          setTimeout(reject, 5000); // 5 second timeout
        });
      }
      
      // Draw image to canvas
      ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
      
      // Extract as blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      
      this.log('✅ Canvas capture successful', { width: canvas.width, height: canvas.height, size: blob.size });
      
      return {
        success: true,
        blob: blob,
        metadata: {
          width: canvas.width,
          height: canvas.height,
          source: 'canvas_rerender',
          originalSrc: imgElement.src,
          alt: imgElement.alt
        }
      };
      
    } catch (error) {
      this.log('❌ Canvas capture failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * TECHNIQUE 2: CSS Background Image Extraction
   * Some sites use background images instead of img tags
   */
  async captureBackgroundImage(element) {
    try {
      this.log('Attempting background image capture...');
      
      const computedStyle = window.getComputedStyle(element);
      const backgroundImage = computedStyle.backgroundImage;
      
      if (!backgroundImage || backgroundImage === 'none') {
        return { success: false, error: 'No background image found' };
      }
      
      // Extract URL from background-image CSS
      const urlMatch = backgroundImage.match(/url\(["']?(.*?)["']?\)/);
      if (!urlMatch) {
        return { success: false, error: 'Could not extract background image URL' };
      }
      
      const imageUrl = urlMatch[1];
      this.log('Found background image URL:', imageUrl);
      
      // Create temporary img element to use canvas technique
      const tempImg = document.createElement('img');
      tempImg.crossOrigin = 'anonymous';
      tempImg.src = imageUrl;
      
      return await this.captureViaCanvas(tempImg);
      
    } catch (error) {
      this.log('❌ Background image capture failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * TECHNIQUE 3: Data URL Conversion
   * Convert existing image data to data URL
   */
  async captureViaDataURL(imgElement) {
    try {
      this.log('Attempting data URL conversion...');
      
      // If image is already a data URL, we can use it directly
      if (imgElement.src.startsWith('data:')) {
        const response = await fetch(imgElement.src);
        const blob = await response.blob();
        
        return {
          success: true,
          blob: blob,
          metadata: {
            source: 'data_url_direct',
            originalSrc: imgElement.src.substring(0, 100) + '...'
          }
        };
      }
      
      // Otherwise, use canvas to convert to data URL
      const canvasResult = await this.captureViaCanvas(imgElement);
      if (canvasResult.success) {
        return canvasResult;
      }
      
      return { success: false, error: 'Data URL conversion failed' };
      
    } catch (error) {
      this.log('❌ Data URL capture failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * TECHNIQUE 4: Blob URL Creation
   * Create blob URLs from image data
   */
  async captureViaBlobURL(imgElement) {
    try {
      this.log('Attempting blob URL creation...');
      
      const canvasResult = await this.captureViaCanvas(imgElement);
      if (canvasResult.success) {
        // Create blob URL for the captured data
        const blobUrl = URL.createObjectURL(canvasResult.blob);
        
        return {
          ...canvasResult,
          blobUrl: blobUrl,
          metadata: {
            ...canvasResult.metadata,
            blobUrl: blobUrl
          }
        };
      }
      
      return { success: false, error: 'Blob URL creation failed' };
      
    } catch (error) {
      this.log('❌ Blob URL capture failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * TECHNIQUE 5: Screen Region Capture
   * Use Chrome's captureVisibleTab API to screenshot specific regions
   */
  async captureViaScreenRegion(element) {
    try {
      this.log('Attempting screen region capture...');
      
      const rect = element.getBoundingClientRect();
      
      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for scroll
      
      // Send message to background script to capture this region
      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'captureVisibleTab',
          region: {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          devicePixelRatio: window.devicePixelRatio || 1
        }, resolve);
      });
      
      if (result && result.success) {
        this.log('✅ Screen region capture successful');
        return {
          success: true,
          dataUrl: result.dataUrl,
          metadata: {
            source: 'screen_region',
            rect: rect,
            originalElement: element.tagName
          }
        };
      }
      
      return { success: false, error: result?.error || 'Screen capture failed' };
      
    } catch (error) {
      this.log('❌ Screen region capture failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * TECHNIQUE 6: Service Worker Bypass
   * Use service worker to intercept and cache requests
   */
  async registerServiceWorkerBypass() {
    try {
      this.log('Attempting service worker bypass registration...');
      
      if ('serviceWorker' in navigator) {
        // Create inline service worker that intercepts image requests
        const swCode = `
          self.addEventListener('fetch', event => {
            if (event.request.url.includes('googleusercontent.com') || 
                event.request.url.includes('photos.google.com')) {
              // Clone the request and try to fetch
              event.respondWith(
                fetch(event.request.clone())
                  .then(response => response.clone())
                  .catch(() => {
                    // If blocked, return a transparent pixel
                    return new Response(new Uint8Array([]), {
                      headers: { 'Content-Type': 'image/png' }
                    });
                  })
              );
            }
          });
        `;
        
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        
        await navigator.serviceWorker.register(swUrl);
        this.log('✅ Service worker bypass registered');
        
        return { success: true };
      }
      
      return { success: false, error: 'Service Worker not supported' };
      
    } catch (error) {
      this.log('❌ Service worker bypass failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * MASTER TECHNIQUE: Multi-Strategy Capture
   * Try all techniques in order until one succeeds
   */
  async captureElementClever(element) {
    const elementId = element.src || element.id || Math.random().toString(36);
    
    if (this.capturedElements.has(elementId)) {
      this.log('Element already captured, skipping');
      return { success: false, error: 'Already captured' };
    }
    
    this.log('Starting clever capture for element:', elementId);
    
    const techniques = [
      { name: 'Canvas Re-rendering', method: () => this.captureViaCanvas(element) },
      { name: 'Data URL Conversion', method: () => this.captureViaDataURL(element) },
      { name: 'Blob URL Creation', method: () => this.captureViaBlobURL(element) },
      { name: 'Background Image', method: () => this.captureBackgroundImage(element) },
      { name: 'Screen Region', method: () => this.captureViaScreenRegion(element) }
    ];
    
    for (const technique of techniques) {
      this.log(`Trying technique: ${technique.name}`);
      
      try {
        const result = await technique.method();
        
        if (result.success) {
          this.log(`✅ SUCCESS with ${technique.name}!`);
          this.capturedElements.add(elementId);
          
          // Add technique info to metadata
          result.metadata = result.metadata || {};
          result.metadata.captureMethod = technique.name;
          result.metadata.timestamp = new Date().toISOString();
          
          return result;
        } else {
          this.log(`❌ ${technique.name} failed: ${result.error}`);
        }
        
      } catch (error) {
        this.log(`💥 ${technique.name} threw error:`, error.message);
      }
      
      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.log('❌ All techniques failed for element');
    return { success: false, error: 'All capture techniques failed' };
  }

  /**
   * BATCH CLEVER CAPTURE
   * Apply clever capture to multiple elements
   */
  async batchCleverCapture(elements = null) {
    this.log('Starting batch clever capture...');
    
    // If no elements provided, find all images on page
    if (!elements) {
      elements = Array.from(document.querySelectorAll('img, [style*="background-image"]'))
        .filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 50 && rect.height > 50; // Only capture reasonably sized elements
        });
    }
    
    this.log(`Found ${elements.length} elements to capture`);
    
    const results = [];
    const errors = [];
    
    // Create progress indicator
    const progressDiv = this.createProgressIndicator();
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      this.updateProgress(progressDiv, i + 1, elements.length, `Capturing element ${i + 1}...`);
      
      try {
        const result = await this.captureElementClever(element);
        
        if (result.success) {
          results.push(result);
          this.log(`✅ Captured element ${i + 1}/${elements.length}`);
        } else {
          errors.push(`Element ${i + 1}: ${result.error}`);
        }
        
      } catch (error) {
        errors.push(`Element ${i + 1}: ${error.message}`);image.png
        this.log(`💥 Exception capturing element ${i + 1}:`, error);
      }
      
      // Small delay to prevent overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    this.updateProgress(progressDiv, elements.length, elements.length, 
      `✅ Completed! Captured ${results.length}/${elements.length} elements`);
    
    // Remove progress indicator after 3 seconds
    setTimeout(() => {
      if (progressDiv.parentNode) {
        progressDiv.parentNode.removeChild(progressDiv);
      }
    }, 3000);
    
    this.log(`Batch capture complete: ${results.length} successes, ${errors.length} failures`);
    
    return {
      success: results.length > 0,
      captured: results,
      errors: errors,
      summary: {
        total: elements.length,
        successful: results.length,
        failed: errors.length
      }
    };
  }

  createProgressIndicator() {
    const progressDiv = document.createElement('div');
    progressDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(20, 20, 30, 0.95);
      color: white;
      padding: 20px;
      border-radius: 12px;
      z-index: 999999;
      font-family: system-ui;
      backdrop-filter: blur(20px);
      border: 1px solid rgba(139, 92, 246, 0.3);
      min-width: 300px;
    `;
    
    progressDiv.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 10px;">🧠 Emma Clever Capture</div>
      <div id="emma-progress-text">Initializing...</div>
      <div style="margin-top: 10px;">
        <div style="background: #374151; height: 6px; border-radius: 3px;">
          <div id="emma-progress-bar" style="background: linear-gradient(90deg, #10b981, #3b82f6); height: 100%; width: 0%; border-radius: 3px; transition: width 0.3s;"></div>
        </div>
      </div>
      <div id="emma-progress-stats" style="font-size: 12px; margin-top: 8px; color: #9ca3af;"></div>
    `;
    
    document.body.appendChild(progressDiv);
    return progressDiv;
  }

  updateProgress(progressDiv, current, total, message) {
    const progressText = progressDiv.querySelector('#emma-progress-text');
    const progressBar = progressDiv.querySelector('#emma-progress-bar');
    const progressStats = progressDiv.querySelector('#emma-progress-stats');
    
    const percentage = (current / total) * 100;
    
    if (progressText) progressText.textContent = message;
    if (progressBar) progressBar.style.width = percentage + '%';
    if (progressStats) progressStats.textContent = `${current}/${total} (${Math.round(percentage)}%)`;
  }
}

// Global instance
window.emmaCleverBypass = new EmmaCleverCaptureBypass();

// Convenience functions
window.emmaCleverCapture = (element) => window.emmaCleverBypass.captureElementClever(element);
window.emmaBatchCleverCapture = (elements) => window.emmaCleverBypass.batchCleverCapture(elements);

console.log('🧠 Emma Clever Capture Bypass System loaded!');
console.log('📚 Available functions:');
console.log('  - emmaCleverCapture(element) - Capture single element');
console.log('  - emmaBatchCleverCapture() - Capture all images on page');
console.log('  - emmaCleverBypass.* - Access full bypass system');




















