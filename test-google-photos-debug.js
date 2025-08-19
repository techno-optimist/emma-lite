// Test script for Google Photos debugging
// Run this in the console on a Google Photos page after reloading the extension

console.log('🧪 Testing Google Photos collection with enhanced debugging...');

// First, let's see what images are on the page
const allImages = document.querySelectorAll('img');
console.log(`Total IMG elements on page: ${allImages.length}`);

// Check how many have Google domains
const googleImages = Array.from(allImages).filter(img => {
  const src = img.currentSrc || img.src || img.srcset || '';
  return src.includes('googleusercontent.com') || src.includes('photos.google.com') || src.includes('ggpht.com');
});
console.log(`Google domain images: ${googleImages.length}`);

// Show a sample of the first few
if (googleImages.length > 0) {
  console.log('Sample Google images:', googleImages.slice(0, 5).map(img => ({
    src: (img.currentSrc || img.src || '').slice(0, 80),
    size: `${img.getBoundingClientRect().width}x${img.getBoundingClientRect().height}`,
    visible: img.getBoundingClientRect().width > 0 && img.getBoundingClientRect().height > 0
  })));
}

// Test the strict selector
const strictMatches = document.querySelectorAll('img[src*="googleusercontent.com"], img[src*="photos.google.com"], img[srcset*="googleusercontent.com"], img[data-src*="googleusercontent.com"], img[data-src*="photos.google.com"]');
console.log(`Strict selector matches: ${strictMatches.length}`);

// Now trigger Emma's collection
console.log('🚀 Triggering Emma collection - check console for detailed logs...');

// You can click the "Save All Photos" button now or run:
// chrome.runtime.sendMessage({action: 'media.batchImport', selector: 'auto'});

