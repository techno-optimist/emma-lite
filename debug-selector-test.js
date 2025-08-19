// Debug script to test the unified selectors
// Run this in the Google Photos console to verify our selectors

console.log('🧪 Testing Unified Selector Strategy...');

// Test the detection selector (what shows "42 photos") - Complex CSS :not() version
const detectionSel = `
  img[src*="googleusercontent.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"]),
  img[src*="photos.google.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"]),
  img[src*="lh3.googleusercontent.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"]),
  img[src*="lh4.googleusercontent.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"]),
  img[src*="lh5.googleusercontent.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"]),
  img[src*="lh6.googleusercontent.com"]:not([src*="=s32"]):not([src*="=s40"]):not([src*="=s48"]):not([src*="=s64"]):not([src*="=s80"]):not([src*="=s96"]):not([src*="=s128"]):not([src*="thumbnail"]):not([width="32"]):not([width="40"]):not([width="48"])
`.replace(/\s+/g, ' ').trim();

// Test the NEW collection selector (simplified + JS filtering)
const collectionSel = `
  img[src*="googleusercontent.com"],
  img[src*="photos.google.com"],
  img[src*="lh3.googleusercontent.com"],
  img[src*="lh4.googleusercontent.com"],
  img[src*="lh5.googleusercontent.com"],
  img[src*="lh6.googleusercontent.com"]
`.replace(/\s+/g, ' ').trim();

// JavaScript thumbnail filter
const isNotThumbnail = (img) => {
  const src = img.currentSrc || img.src || '';
  const width = img.getAttribute('width') || '';
  const height = img.getAttribute('height') || '';
  
  const thumbnailPatterns = ['=s32', '=s40', '=s48', '=s64', '=s80', '=s96', '=s128', 'thumbnail'];
  if (thumbnailPatterns.some(pattern => src.includes(pattern))) return false;
  
  const smallSizes = ['32', '40', '48', '64', '80', '96'];
  if (smallSizes.includes(width) || smallSizes.includes(height)) return false;
  
  return true;
};

console.log('Detection selector:', detectionSel.slice(0, 100) + '...');
console.log('Collection selector:', collectionSel.slice(0, 100) + '...');

// Test the actual selectors
console.log('\n=== TESTING SELECTORS ===');

// Test complex CSS :not() selector (what detectPageContext uses)
const detectionResults = document.querySelectorAll(detectionSel);
console.log(`Detection (CSS :not()) found: ${detectionResults.length} elements`);

// Test simplified + JS filtering (what new collectAllGooglePhotos uses)
const collectionResultsAll = document.querySelectorAll(collectionSel);
const collectionResults = Array.from(collectionResultsAll).filter(isNotThumbnail);
console.log(`Collection (JS filtering) found: ${collectionResultsAll.length} total, ${collectionResults.length} after thumbnail filter`);

// Test with size filtering like detectPageContext
const detectionSized = Array.from(detectionResults).filter(img => {
  const rect = img.getBoundingClientRect();
  return rect.width >= 100 && rect.height >= 100;
});

const collectionSized = Array.from(collectionResults).filter(img => {
  const rect = img.getBoundingClientRect();
  return rect.width >= 100 && rect.height >= 100;
});

console.log(`\n=== SIZE FILTERING (≥100px) ===`);
console.log(`Detection sized: ${detectionSized.length} elements`);
console.log(`Collection sized: ${collectionSized.length} elements`);

console.log(`\n=== COMPARISON ===`);
if (detectionSized.length === collectionSized.length) {
  console.log('✅ SUCCESS: Both methods find the same number of photos!');
} else {
  console.log(`❌ MISMATCH: Detection finds ${detectionSized.length}, Collection finds ${collectionSized.length}`);
}

// Show sample elements
if (detectionSized.length > 0) {
  console.log('Sample detection elements:', detectionSized.slice(0, 3).map(img => ({
    src: img.src?.slice(0, 60) + '...',
    size: `${img.getBoundingClientRect().width}x${img.getBoundingClientRect().height}`
  })));
}

// Test the fallback selector
const fallbackSel = `
  img[src*="googleusercontent.com"], 
  img[src*="photos.google.com"],
  img[src*="ggpht.com"],
  img[role="img"],
  [data-photo] img,
  [data-item] img,
  .photo img,
  .item img
`.replace(/\s+/g, ' ').trim();

const fallbackResults = document.querySelectorAll(fallbackSel);
console.log(`Fallback selector found: ${fallbackResults.length} elements`);

// Test very simple selector
const simpleResults = document.querySelectorAll('img[src*="googleusercontent.com"]');
console.log(`Simple selector found: ${simpleResults.length} elements`);

console.log('✅ Selector comparison complete');
