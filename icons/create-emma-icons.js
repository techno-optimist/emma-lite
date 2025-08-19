// Create Emma Icons using Canvas API
// Run this in the browser console on generate-emma-icons.html

const iconSizes = [16, 32, 48, 128];

function createEmmaIconCanvas(size) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;

    // Create gradient background
    const gradient = ctx.createRadialGradient(
        size/2, size*0.3, 0,
        size/2, size/2, size*0.8
    );
    gradient.addColorStop(0, '#E879F9');
    gradient.addColorStop(0.3, '#C084FC');
    gradient.addColorStop(0.6, '#A855F7');
    gradient.addColorStop(1, '#7C3AED');

    // Draw main circle
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size*0.45, 0, Math.PI * 2);
    ctx.fill();

    // Add subtle inner glow ring
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = Math.max(1, size/64);
    ctx.beginPath();
    ctx.arc(size/2, size/2, size*0.41, 0, Math.PI * 2);
    ctx.stroke();

    // Add "emma" text
    const fontSize = Math.max(size * 0.18, 8);
    ctx.fillStyle = 'white';
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Add subtle text shadow
    ctx.shadowColor = 'rgba(255,255,255,0.5)';
    ctx.shadowBlur = Math.max(2, size/32);
    
    ctx.fillText('emma', size/2, size/2 + fontSize*0.1);

    return canvas;
}

// Function to download canvas as PNG
function downloadCanvasAsPNG(canvas, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Generate and download all Emma icons
function generateEmmaIcons() {
    console.log('🎨 Generating Emma icons...');
    
    iconSizes.forEach((size, index) => {
        setTimeout(() => {
            const canvas = createEmmaIconCanvas(size);
            downloadCanvasAsPNG(canvas, `icon-${size}.png`);
            console.log(`✅ Generated icon-${size}.png`);
        }, index * 500); // Stagger downloads
    });
    
    console.log('🎉 All Emma icons will be downloaded shortly!');
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
    console.log('Emma Icon Generator loaded! Run generateEmmaIcons() to create icons.');
}

