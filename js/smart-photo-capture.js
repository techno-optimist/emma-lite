/**
 * EMMA SMART PHOTO CAPTURE SYSTEM
 * 
 * This system uses Chrome's screenshot API to capture photos
 * that are visible on the page, bypassing all CORS restrictions.
 * 
 * Philosophy: "What you see is what you get"
 */

// Ensure we're in the right context
(function() {
  'use strict';

class EmmaSmartPhotoCapture {
  constructor() {
    this.capturedPhotos = [];
    this.debugMode = true;
  }

  log(message, ...args) {
    if (this.debugMode) {
      console.log(`📸 SMART CAPTURE: ${message}`, ...args);
    }
  }

  /**
   * Main entry point: Capture all visible photos on the page
   */
  async captureAllPhotos(options = {}) {
    this.log('Starting smart photo capture...');
    
    const {
      scrollCapture = true,
      maxPhotos = 50,
      minSize = 100,
      captureDelay = 500
    } = options;

    try {
      // Step 1: Find all photo elements on the page
      const photoElements = this.findAllPhotos(minSize);
      this.log(`Found ${photoElements.length} photos on page`);

      if (photoElements.length === 0) {
        return {
          success: false,
          error: 'No photos found on page',
          photos: []
        };
      }

      // Step 2: Group photos by viewport visibility
      const photoGroups = scrollCapture ? 
        await this.groupPhotosByViewport(photoElements) : 
        [{ scroll: { top: 0, left: 0 }, photos: photoElements }];

      this.log(`Organized photos into ${photoGroups.length} viewport groups`);

      // Step 3: Capture each group
      const capturedPhotos = [];
      
      for (let i = 0; i < photoGroups.length && capturedPhotos.length < maxPhotos; i++) {
        const group = photoGroups[i];
        this.log(`Processing group ${i + 1}/${photoGroups.length} with ${group.photos.length} photos`);

        // Scroll to position if needed
        if (scrollCapture && (group.scroll.top !== window.scrollY || group.scroll.left !== window.scrollX)) {
          window.scrollTo(group.scroll.left, group.scroll.top);
          await this.sleep(captureDelay); // Wait for scroll and images to load
        }

        // Request screenshot from background
        const screenshot = await this.requestScreenshot();
        if (!screenshot.success) {
          this.log(`Failed to capture screenshot for group ${i + 1}: ${screenshot.error}`);
          continue;
        }

        // Extract individual photos from screenshot
        for (const photo of group.photos) {
          if (capturedPhotos.length >= maxPhotos) break;

          try {
            const extracted = await this.extractPhotoFromScreenshot(
              screenshot.dataUrl,
              photo.rect,
              window.devicePixelRatio || 1
            );

            if (extracted.success) {
              capturedPhotos.push({
                id: `photo_${Date.now()}_${capturedPhotos.length}`,
                dataUrl: extracted.dataUrl,
                metadata: {
                  originalSrc: photo.src,
                  dimensions: {
                    width: photo.rect.width,
                    height: photo.rect.height
                  },
                  capturedAt: new Date().toISOString(),
                  pageUrl: window.location.href,
                  method: 'smart_screenshot_extract'
                }
              });

              this.log(`Successfully captured photo ${capturedPhotos.length}/${maxPhotos}`);
            }
          } catch (error) {
            this.log(`Failed to extract photo: ${error.message}`);
          }
        }
      }

      // Step 4: Create memory capsule with photos
      if (capturedPhotos.length > 0) {
        const capsuleId = await this.createPhotoCapsule(capturedPhotos);
        
        return {
          success: true,
          photos: capturedPhotos,
          capsuleId: capsuleId,
          summary: {
            totalFound: photoElements.length,
            captured: capturedPhotos.length,
            method: 'smart_screenshot_capture'
          }
        };
      }

      return {
        success: false,
        error: 'No photos could be captured',
        photos: []
      };

    } catch (error) {
      this.log('Smart capture error:', error);
      return {
        success: false,
        error: error.message,
        photos: []
      };
    }
  }

  /**
   * Find all photo elements on the page
   */
  findAllPhotos(minSize = 100) {
    const photos = [];
    
    // Find all img elements
    const images = Array.from(document.querySelectorAll('img'));
    
    for (const img of images) {
      const rect = img.getBoundingClientRect();
      
      // Filter criteria
      if (rect.width < minSize || rect.height < minSize) continue;
      if (rect.width === 0 || rect.height === 0) continue;
      
      // Check if it's likely a photo (not UI element)
      const src = img.src || '';
      const isPhoto = 
        src.includes('googleusercontent.com') ||
        src.includes('gstatic.com') ||
        src.includes('photos.google.com') ||
        (rect.width > 200 && rect.height > 200);

      if (isPhoto) {
        photos.push({
          element: img,
          src: src,
          rect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom,
            right: rect.right
          }
        });
      }
    }

    return photos;
  }

  /**
   * Group photos by viewport for efficient capture
   */
  async groupPhotosByViewport(photos) {
    const groups = [];
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Sort photos by vertical position
    const sortedPhotos = [...photos].sort((a, b) => a.rect.top - b.rect.top);
    
    let currentGroup = null;
    
    for (const photo of sortedPhotos) {
      const scrollTop = photo.rect.top + window.scrollY - 100; // Add padding
      const scrollLeft = photo.rect.left + window.scrollX - 100;
      
      // Check if we need a new group
      if (!currentGroup || 
          Math.abs(scrollTop - currentGroup.scroll.top) > viewportHeight * 0.8) {
        currentGroup = {
          scroll: { 
            top: Math.max(0, scrollTop), 
            left: Math.max(0, scrollLeft) 
          },
          photos: []
        };
        groups.push(currentGroup);
      }
      
      currentGroup.photos.push(photo);
    }
    
    return groups;
  }

  /**
   * Request screenshot from background script
   */
  async requestScreenshot() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'captureVisibleTab',
        fullPage: false
      }, (response) => {
        if (response && response.success) {
          resolve(response);
        } else {
          resolve({ 
            success: false, 
            error: response?.error || 'Screenshot failed' 
          });
        }
      });
    });
  }

  /**
   * Extract individual photo from full screenshot
   */
  async extractPhotoFromScreenshot(screenshotDataUrl, photoRect, devicePixelRatio = 1) {
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate extraction coordinates accounting for device pixel ratio
          const extractX = (photoRect.left + window.scrollX) * devicePixelRatio;
          const extractY = (photoRect.top + window.scrollY) * devicePixelRatio;
          const extractWidth = photoRect.width * devicePixelRatio;
          const extractHeight = photoRect.height * devicePixelRatio;
          
          // Set canvas size to photo dimensions
          canvas.width = photoRect.width;
          canvas.height = photoRect.height;
          
          // Draw the extracted portion
          ctx.drawImage(
            img,
            extractX, extractY, extractWidth, extractHeight,
            0, 0, canvas.width, canvas.height
          );
          
          resolve({
            success: true,
            dataUrl: canvas.toDataURL('image/jpeg', 0.9)
          });
        } catch (error) {
          resolve({
            success: false,
            error: error.message
          });
        }
      };
      
      img.onerror = () => {
        resolve({
          success: false,
          error: 'Failed to load screenshot'
        });
      };
      
      img.src = screenshotDataUrl;
    });
  }

  /**
   * Create memory capsule with captured photos
   */
  async createPhotoCapsule(photos) {
    const capsuleData = {
      content: `Photo album with ${photos.length} images captured from ${window.location.hostname}`,
      type: 'media',
      source: 'smart_photo_capture',
      metadata: {
        url: window.location.href,
        photoCount: photos.length,
        capturedAt: new Date().toISOString(),
        title: document.title || 'Photo Album'
      },
      attachments: photos.map(photo => ({
        type: 'image/jpeg',
        dataUrl: photo.dataUrl,
        metadata: photo.metadata
      }))
    };

    // 🔥 CRITICAL FIX: Use fixed web vault system instead of extension background
    this.log('💾 PHOTO CAPTURE: Using fixed web vault system for photo capsule creation');
    
    if (!window.emmaWebVault || !window.emmaWebVault.isOpen) {
      throw new Error('Vault not available. Please unlock your .emma vault first.');
    }
    
    // Transform to vault-compatible format
    const vaultMemory = {
      content: capsuleData.content,
      metadata: {
        ...capsuleData.metadata,
        type: capsuleData.type,
        source: capsuleData.source,
        createdVia: 'SmartPhotoCapture'
      },
      attachments: capsuleData.attachments.map(photo => ({
        type: photo.type,
        data: photo.dataUrl, // Use dataUrl as data
        name: `photo_${Date.now()}.jpg`,
        metadata: photo.metadata
      }))
    };
    
    // Use fixed vault system with .emma file sync
    const response = await window.emmaWebVault.addMemory(vaultMemory);
    
    if (response && response.success) {
      const memoryId = response.memory?.id || `photo_${Date.now()}`;
      this.log(`Created capsule with ${photos.length} photos: ${memoryId}`);
      return memoryId;
    }

    throw new Error('Failed to create photo capsule: ' + (response?.error || 'Unknown error'));
  }

  /**
   * Utility: Sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Show progress indicator
   */
  showProgress(message, current, total) {
    // Update or create progress indicator
    let progressDiv = document.getElementById('emma-photo-progress');
    
    if (!progressDiv) {
      progressDiv = document.createElement('div');
      progressDiv.id = 'emma-photo-progress';
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
        border: 1px solid rgba(111, 99, 217, 0.3);
        min-width: 300px;
      `;
      document.body.appendChild(progressDiv);
    }

    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    
    progressDiv.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 10px;">📸 Emma Photo Capture</div>
      <div>${message}</div>
      <div style="margin-top: 10px;">
        <div style="background: #374151; height: 6px; border-radius: 3px;">
          <div style="background: linear-gradient(90deg, #10b981, #3b82f6); height: 100%; width: ${percentage}%; border-radius: 3px; transition: width 0.3s;"></div>
        </div>
      </div>
      <div style="font-size: 12px; margin-top: 8px; color: #9ca3af;">${current}/${total} photos captured</div>
    `;

    if (current >= total && total > 0) {
      setTimeout(() => {
        if (progressDiv.parentNode) {
          progressDiv.parentNode.removeChild(progressDiv);
        }
      }, 3000);
    }
  }
}

// Export for use - ensure it's available globally
if (typeof window !== 'undefined') {
  window.EmmaSmartPhotoCapture = EmmaSmartPhotoCapture;
  
  // Convenience function
  window.emmaSmartCapture = async function(options) {
    const capture = new EmmaSmartPhotoCapture();
    return await capture.captureAllPhotos(options);
  };
  
  console.log('📸 Emma Smart Photo Capture loaded!');
  console.log('💡 Usage: emmaSmartCapture() or emmaSmartCapture({ maxPhotos: 20 })');
} else {
  console.error('📸 Emma Smart Photo Capture: window object not available');
}

})(); // Close the IIFE
