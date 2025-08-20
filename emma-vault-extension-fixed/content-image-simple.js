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
 * Site-aware image detection with Google Photos support
 */
async function detectImagesOnPage() {
  console.log('🖼️ DETECT: Starting image detection on:', window.location.hostname);

  // Wait one frame and a brief delay to let lazy content paint
  await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 150)));

  const images = [];
  const seenUrls = new Set();
  const isGooglePhotos = window.location.hostname.includes('photos.google.com');

  const telemetry = { imgSrc: 0, imgSrcset: 0, cssBackground: 0 };

  // Helper to push image data safely
  function addImage(src, width, height, meta = {}) {
    if (!src || seenUrls.has(src)) return false;
    if (src.startsWith('data:') || src === window.location.href) return false;
    if (width <= 1 || height <= 1) return false;
    seenUrls.add(src);
    images.push({
      id: `img_${images.length}`,
      url: src,
      alt: meta.alt || '',
      title: meta.title || '',
      width,
      height,
      filename: extractFilename(src),
      source: meta.source || 'img',
      pageContext: {
        url: window.location.href,
        title: document.title,
        hostname: window.location.hostname
      },
      timestamp: Date.now()
    });
    return true;
  }

  // Parse srcset and return the largest candidate
  function getLargestFromSrcset(srcset) {
    try {
      const parts = srcset.split(',').map(p => p.trim());
      let best = null;
      for (const p of parts) {
        const [url, descriptor] = p.split(/\s+/);
        const w = descriptor && descriptor.endsWith('w') ? parseInt(descriptor) : 0;
        if (!best || w > best.w) best = { url, w };
      }
      return best ? best.url : null;
    } catch {
      return null;
    }
  }

  // 1) Collect from <img> elements
  const allImgs = document.querySelectorAll('img');
  console.log(`🖼️ DETECT: Found ${allImgs.length} <img> nodes`);
  for (const img of allImgs) {
    let src = img.currentSrc || img.src || null;
    // If using srcset and no src, pick largest candidate
    if (!src && img.srcset) src = getLargestFromSrcset(img.srcset);
    const width = img.naturalWidth || img.width || img.clientWidth || 0;
    const height = img.naturalHeight || img.height || img.clientHeight || 0;
    if (addImage(src, width, height, { alt: img.alt, title: img.title, source: img.srcset ? 'img-srcset' : 'img-src' })) {
      telemetry[img.srcset ? 'imgSrcset' : 'imgSrc']++;
    }
  }

  // 2) Google Photos specific: re-enable CSS background scan
  if (isGooglePhotos) {
    const bgCandidates = document.querySelectorAll("div[role='img'], div[style*='background-image']");
    console.log(`🖼️ DETECT GP: Checking ${bgCandidates.length} background candidates`);
    for (const el of bgCandidates) {
      const style = getComputedStyle(el);
      const bg = style.backgroundImage;
      if (!bg || bg === 'none') continue;
      const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
      if (!m) continue;
      let url = m[1];
      // Only googleusercontent or lh#.googleusercontent are useful
      if (!(url.includes('googleusercontent.com') || url.includes('ggpht.com'))) continue;
      const w = el.clientWidth || 0;
      const h = el.clientHeight || 0;
      // Require reasonably sized tile to avoid icons
      if (w < 200 || h < 200) continue;
      if (addImage(url, w, h, { source: 'css-background' })) telemetry.cssBackground++;
    }
  }

  console.log(`🖼️ DETECT: Done. img/src=${telemetry.imgSrc}, img/srcset=${telemetry.imgSrcset}, cssBackground=${telemetry.cssBackground}, total=${images.length}`);
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
