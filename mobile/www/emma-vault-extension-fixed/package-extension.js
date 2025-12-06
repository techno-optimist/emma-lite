/**
 * Emma Vault Extension - Chrome Web Store Package Preparation
 * Prepares the extension for submission to Chrome Web Store
 * Built with love for Debbe and honoring Kevin's father's software legacy
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

console.log('📦 Emma Vault Extension - Package Preparation');
console.log('💜 Preparing for Chrome Web Store submission...');

// Package configuration
const packageConfig = {
  name: 'emma-vault-extension',
  version: '1.0.0',
  outputDir: './dist',
  excludeFiles: [
    'package-extension.js',
    'generate-icons.html',
    'test-extension.html',
    'integration-test.html',
    'demo-test.js',
    'TESTING.md',
    'node_modules',
    '.git',
    'dist',
    '*.log'
  ]
};

/**
 * Create distribution directory
 */
function createDistDirectory() {
  const distPath = path.join(__dirname, packageConfig.outputDir);
  
  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath, { recursive: true });
    console.log('✅ Created distribution directory');
  }
  
  return distPath;
}

/**
 * Validate extension files
 */
function validateExtensionFiles() {
  const requiredFiles = [
    'manifest.json',
    'background.js',
    'content-script.js',
    'popup.html',
    'popup.css',
    'popup.js',
    'icons/icon-16.png',
    'icons/icon-32.png',
    'icons/icon-48.png',
    'icons/icon-128.png'
  ];
  
  console.log('🔍 Validating required files...');
  
  const missingFiles = [];
  
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing required files:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    return false;
  }
  
  console.log('✅ All required files present');
  return true;
}

/**
 * Validate manifest.json
 */
function validateManifest() {
  console.log('🔍 Validating manifest.json...');
  
  try {
    const manifestPath = path.join(__dirname, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Check required fields
    const requiredFields = ['name', 'version', 'manifest_version', 'description'];
    const missingFields = requiredFields.filter(field => !manifest[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ Missing manifest fields:', missingFields);
      return false;
    }
    
    // Check manifest version
    if (manifest.manifest_version !== 3) {
      console.error('❌ Must use Manifest V3');
      return false;
    }
    
    // Check permissions
    if (!manifest.permissions || !Array.isArray(manifest.permissions)) {
      console.error('❌ Permissions must be an array');
      return false;
    }
    
    console.log('✅ Manifest validation passed');
    console.log(`   Name: ${manifest.name}`);
    console.log(`   Version: ${manifest.version}`);
    console.log(`   Description: ${manifest.description}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Manifest validation failed:', error.message);
    return false;
  }
}

/**
 * Create ZIP package
 */
async function createZipPackage(distPath) {
  console.log('📦 Creating ZIP package...');
  
  const zipPath = path.join(distPath, `${packageConfig.name}-v${packageConfig.version}.zip`);
  
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      console.log(`✅ ZIP package created: ${archive.pointer()} bytes`);
      console.log(`📁 Location: ${zipPath}`);
      resolve(zipPath);
    });
    
    archive.on('error', (err) => {
      console.error('❌ ZIP creation failed:', err);
      reject(err);
    });
    
    archive.pipe(output);
    
    // Add all files except excluded ones
    const addDirectory = (dirPath, archivePath = '') => {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const archiveItemPath = path.join(archivePath, item);
        const stat = fs.statSync(fullPath);
        
        // Check if file should be excluded
        const shouldExclude = packageConfig.excludeFiles.some(pattern => {
          if (pattern.includes('*')) {
            return item.match(pattern.replace(/\*/g, '.*'));
          }
          return item === pattern || archiveItemPath === pattern;
        });
        
        if (shouldExclude) {
          console.log(`⏭️  Excluding: ${archiveItemPath}`);
          continue;
        }
        
        if (stat.isDirectory()) {
          addDirectory(fullPath, archiveItemPath);
        } else {
          archive.file(fullPath, { name: archiveItemPath });
          console.log(`📄 Added: ${archiveItemPath}`);
        }
      }
    };
    
    addDirectory(__dirname);
    archive.finalize();
  });
}

/**
 * Generate submission checklist
 */
function generateSubmissionChecklist(zipPath) {
  const checklist = `
# 📋 Chrome Web Store Submission Checklist

## 📦 Package Information
- **Extension Name**: Emma Vault Bridge
- **Version**: ${packageConfig.version}
- **Package**: ${path.basename(zipPath)}
- **Created**: ${new Date().toLocaleString()}

## ✅ Pre-Submission Checklist

### Required Files
- [x] manifest.json (Manifest V3)
- [x] background.js (service worker)
- [x] content-script.js
- [x] popup.html, popup.css, popup.js
- [x] Icons (16, 32, 48, 128px)
- [x] README.md

### Store Listing Requirements
- [ ] Detailed description (minimum 132 characters)
- [ ] Screenshots (1280x800 or 640x400)
- [ ] Small promotional tile (440x280)
- [ ] Marquee promotional tile (1400x560) - optional
- [ ] Category selection
- [ ] Privacy policy (if collecting data)

### Technical Requirements
- [x] Manifest V3 compliance
- [x] No remote code execution
- [x] Minimal permissions requested
- [x] Content Security Policy compliant
- [x] No obfuscated code

### Description Template
\`\`\`
Emma Vault Bridge enables real-time synchronization between Emma Web App and your local .emma vault files.

🔒 COMPLETE PRIVACY - Your memories stay on YOUR computer
⚡ REAL-TIME SYNC - Every change saves instantly
💜 ZERO PASSWORDS - No accounts, no sign-ups
📁 ALWAYS ACCESSIBLE - Download your .emma file anytime

Perfect for families preserving precious memories, especially those dealing with memory challenges like dementia.

Built with love for Debbe and all the memories we cherish.
\`\`\`

### Keywords
- memory preservation
- vault synchronization
- privacy-first
- dementia friendly
- family memories
- local storage
- file sync

## 🚀 Submission Steps

1. Visit [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Click "Add new item"
3. Upload the ZIP file: ${path.basename(zipPath)}
4. Fill in store listing details
5. Upload screenshots and promotional images
6. Set pricing and distribution
7. Submit for review

## 📸 Screenshot Ideas

1. Extension popup interface
2. Emma Web App with sync indicator
3. File selection dialog
4. Sync status in action
5. Integration test results

## 💜 Dedication

This extension is dedicated to:
- Debbe - whose precious memories inspired this project
- Kevin's father - a software CEO who would be proud of this AI collaboration
- All families preserving memories for future generations

Built with love, tested with care, submitted with hope.
`;

  const checklistPath = path.join(path.dirname(zipPath), 'SUBMISSION_CHECKLIST.md');
  fs.writeFileSync(checklistPath, checklist);
  
  console.log('📋 Submission checklist created:', checklistPath);
}

/**
 * Main packaging function
 */
async function packageExtension() {
  try {
    console.log('🚀 Starting Emma Vault Extension packaging...');
    console.log('💜 Built with love for Debbe and honoring Kevin\'s father');
    console.log('');
    
    // Step 1: Validate files
    if (!validateExtensionFiles()) {
      process.exit(1);
    }
    
    // Step 2: Validate manifest
    if (!validateManifest()) {
      process.exit(1);
    }
    
    // Step 3: Create distribution directory
    const distPath = createDistDirectory();
    
    // Step 4: Create ZIP package
    const zipPath = await createZipPackage(distPath);
    
    // Step 5: Generate submission checklist
    generateSubmissionChecklist(zipPath);
    
    console.log('');
    console.log('🎉 Extension packaging completed successfully!');
    console.log('📦 Ready for Chrome Web Store submission');
    console.log('💜 Your parents would be proud of this achievement');
    console.log('');
    console.log('Next steps:');
    console.log('1. Review the submission checklist');
    console.log('2. Prepare screenshots and promotional images');
    console.log('3. Submit to Chrome Web Store');
    
  } catch (error) {
    console.error('❌ Packaging failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  packageExtension();
}

module.exports = { packageExtension, validateExtensionFiles, validateManifest };
