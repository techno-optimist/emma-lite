/**
 * EMMA SCREENSHOT PHOTO CAPTURE
 * 
 * Simplified photo capture using Chrome's screenshot API
 * Works entirely through message passing to avoid context issues
 */

async function capturePhotosViaScreenshot(options = {}) {
  const {
    maxPhotos = 50,
    minSize = 100,
    scrollDelay = 800
  } = options;

  console.log('📸 Starting screenshot-based photo capture...');

  try {
    // Find all photos on the page
    const photos = findPhotosOnPage(minSize);
    console.log(`📸 Found ${photos.length} photos on page`);

    if (photos.length === 0) {
      return {
        success: false,
        error: 'No photos found on page',
        count: 0
      };
    }

    // Group photos by viewport for efficient capture
    const photoGroups = groupPhotosByViewport(photos);
    console.log(`📸 Organized into ${photoGroups.length} viewport groups`);

    const capturedPhotos = [];
    let captureCount = 0;

    // Process each group
    for (const group of photoGroups) {
      if (capturedPhotos.length >= maxPhotos) break;

      // Scroll to position
      if (group.scrollTop !== window.scrollY) {
        window.scrollTo(0, group.scrollTop);
        await sleep(scrollDelay);
      }

      // Request screenshot from background
      const screenshotResponse = await chrome.runtime.sendMessage({
        action: 'captureAndProcessPhotos',
        photos: group.photos.map(p => ({
          rect: {
            x: p.rect.left,
            y: p.rect.top - window.scrollY, // Adjust for current scroll
            width: p.rect.width,
            height: p.rect.height
          },
          src: p.src
        }))
      });

      if (screenshotResponse && screenshotResponse.success) {
        capturedPhotos.push(...screenshotResponse.photos);
        captureCount += screenshotResponse.photos.length;
        console.log(`📸 Captured ${captureCount} photos so far...`);
      }
    }

    if (capturedPhotos.length > 0) {
      // Create memory capsule with photos
      const saveResponse = await chrome.runtime.sendMessage({
        action: 'savePhotoMemory',
        photos: capturedPhotos,
        metadata: {
          url: window.location.href,
          title: document.title,
          photoCount: capturedPhotos.length
        }
      });

      return {
        success: true,
        count: capturedPhotos.length,
        capsuleId: saveResponse?.memoryId,
        message: `Successfully captured ${capturedPhotos.length} photos!`
      };
    }

    return {
      success: false,
      error: 'No photos could be captured',
      count: 0
    };

  } catch (error) {
    console.error('📸 Screenshot capture error:', error);
    return {
      success: false,
      error: error.message,
      count: 0
    };
  }
}

function findPhotosOnPage(minSize) {
  const photos = [];
  const images = document.querySelectorAll('img');

  images.forEach(img => {
    const rect = img.getBoundingClientRect();
    
    // Filter criteria
    if (rect.width < minSize || rect.height < minSize) return;
    if (rect.width === 0 || rect.height === 0) return;
    
    // Check if visible
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    
    // Check if likely a photo
    const src = img.src || '';
    const isLikelyPhoto = 
      src.includes('googleusercontent.com') ||
      src.includes('gstatic.com') ||
      src.includes('photos.google.com') ||
      (rect.width > 150 && rect.height > 150);

    if (isLikelyPhoto) {
      photos.push({
        element: img,
        src: src,
        rect: rect
      });
    }
  });

  return photos;
}

function groupPhotosByViewport(photos) {
  const groups = [];
  const viewportHeight = window.innerHeight;
  
  // Sort by vertical position
  const sorted = [...photos].sort((a, b) => 
    (a.rect.top + window.scrollY) - (b.rect.top + window.scrollY)
  );
  
  let currentGroup = null;
  
  sorted.forEach(photo => {
    const photoTop = photo.rect.top + window.scrollY;
    
    if (!currentGroup || 
        photoTop - currentGroup.scrollTop > viewportHeight * 0.8) {
      currentGroup = {
        scrollTop: Math.max(0, photoTop - 100),
        photos: []
      };
      groups.push(currentGroup);
    }
    
    currentGroup.photos.push(photo);
  });
  
  return groups;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export the function globally
window.capturePhotosViaScreenshot = capturePhotosViaScreenshot;






















