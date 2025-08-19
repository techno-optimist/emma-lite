// Node.js script to generate Emma icons using canvas
const fs = require('fs');
const path = require('path');

// Check if canvas is available
let Canvas;
try {
  Canvas = require('canvas');
} catch (e) {
  console.log('Canvas not available, using browser method...');
}

// Create Emma icon data as base64
function createEmmaIconBase64(size) {
  // SVG template for Emma icon
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="emmaPurpleGradient" cx="0.5" cy="0.3" r="0.8">
        <stop offset="0%" style="stop-color:#E879F9;stop-opacity:1" />
        <stop offset="30%" style="stop-color:#C084FC;stop-opacity:1" />
        <stop offset="60%" style="stop-color:#A855F7;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
      </radialGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="${size/32}" result="coloredBlur"/>
        <feMerge> 
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    <circle cx="${size/2}" cy="${size/2}" r="${size*0.45}" fill="url(#emmaPurpleGradient)" filter="url(#glow)" />
    <circle cx="${size/2}" cy="${size/2}" r="${size*0.41}" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="${Math.max(1, size/64)}"/>
    
    <text x="${size/2}" y="${size/2 + size*0.03}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
          font-size="${Math.max(size*0.18, 8)}" font-weight="600" fill="white" text-anchor="middle" 
          style="text-shadow: 0 0 ${Math.max(2, size/32)}px rgba(255,255,255,0.5);">emma</text>
  </svg>`;
  
  return Buffer.from(svg).toString('base64');
}

// Generate PNG icons
const iconSizes = [16, 32, 48, 128];

console.log('🎨 Generating Emma icons...');

iconSizes.forEach(size => {
  const svgBase64 = createEmmaIconBase64(size);
  const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`;
  
  // Write SVG first (will convert to PNG in browser)
  const tempSvgPath = path.join(__dirname, 'icons', `temp-icon-${size}.svg`);
  const svgContent = Buffer.from(svgBase64, 'base64').toString();
  
  try {
    fs.writeFileSync(tempSvgPath, svgContent);
    console.log(`✅ Created temp SVG for ${size}x${size}`);
  } catch (error) {
    console.error(`❌ Failed to create SVG for ${size}x${size}:`, error.message);
  }
});

console.log('📝 Created temporary SVG files. Now creating HTML converter...');

