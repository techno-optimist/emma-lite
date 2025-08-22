/**
 * Emma Browser Compatibility Fix
 * Comprehensive cross-browser support for Emma vault system
 * 
 * CRITICAL ISSUES IDENTIFIED:
 * 1. File System Access API not supported in Firefox, Safari
 * 2. Brave browser may block certain features with Shields
 * 3. Inconsistent fallback behavior across browsers
 * 4. Missing feature detection for critical APIs
 * 
 * 💜 Built with love for preserving precious memories across all browsers
 */

class EmmaBrowserCompatibility {
  constructor() {
    this.browserInfo = this.detectBrowser();
    this.featureSupport = this.detectFeatures();
    this.initializeCompatibilityLayer();
    
    console.log('🌐 Emma Browser Compatibility initialized for:', this.browserInfo.name);
    console.log('🔍 Feature support:', this.featureSupport);
  }
  
  /**
   * Comprehensive browser detection
   */
  detectBrowser() {
    const userAgent = navigator.userAgent;
    const vendor = navigator.vendor;
    
    let name = 'Unknown';
    let version = 'Unknown';
    let engine = 'Unknown';
    let isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    // Brave detection (most specific first)
    if (navigator.brave && navigator.brave.isBrave) {
      name = 'Brave';
      engine = 'Blink';
      const match = userAgent.match(/Chrome\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    }
    // Chrome/Chromium
    else if (/Chrome/.test(userAgent) && /Google Inc/.test(vendor)) {
      if (/Edg/.test(userAgent)) {
        name = 'Edge';
        const match = userAgent.match(/Edg\/(\d+)/);
        version = match ? match[1] : 'Unknown';
      } else {
        name = 'Chrome';
        const match = userAgent.match(/Chrome\/(\d+)/);
        version = match ? match[1] : 'Unknown';
      }
      engine = 'Blink';
    }
    // Firefox
    else if (/Firefox/.test(userAgent)) {
      name = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Gecko';
    }
    // Safari
    else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
      name = 'Safari';
      const match = userAgent.match(/Version\/(\d+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'WebKit';
    }
    
    return {
      name,
      version: parseInt(version),
      engine,
      isMobile,
      userAgent,
      vendor
    };
  }
  
  /**
   * Detect browser feature support
   */
  detectFeatures() {
    return {
      // File System Access API
      fileSystemAccess: 'showOpenFilePicker' in window,
      fileSystemWrite: 'showSaveFilePicker' in window,
      
      // Web Crypto API
      webCrypto: !!(window.crypto && window.crypto.subtle),
      
      // Storage APIs
      indexedDB: !!window.indexedDB,
      localStorage: !!window.localStorage,
      sessionStorage: !!window.sessionStorage,
      
      // Drag and Drop
      dragDrop: 'ondragstart' in document.createElement('div'),
      
      // Other features
      webGL: !!window.WebGLRenderingContext,
      webAudio: !!(window.AudioContext || window.webkitAudioContext),
      speechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
      
      // Security features
      isSecureContext: window.isSecureContext,
      httpsRequired: location.protocol === 'https:' || location.hostname === 'localhost'
    };
  }
  
  /**
   * Initialize compatibility layer with polyfills and fallbacks
   */
  initializeCompatibilityLayer() {
    // Add browser-specific classes to body
    document.body.classList.add(`browser-${this.browserInfo.name.toLowerCase()}`);
    document.body.classList.add(`engine-${this.browserInfo.engine.toLowerCase()}`);
    
    if (this.browserInfo.isMobile) {
      document.body.classList.add('mobile-device');
    }
    
    // Initialize fallbacks
    this.initializeFileSystemFallback();
    this.initializeCryptoFallback();
    this.initializeStorageFallback();
    this.initializeBraveSpecificFixes();
  }
  
  /**
   * File System Access API fallback for unsupported browsers
   */
  initializeFileSystemFallback() {
    if (!this.featureSupport.fileSystemAccess) {
      console.log('📁 FALLBACK: File System Access API not supported, setting up fallback');
      
      // Override showOpenFilePicker with fallback
      window.showOpenFilePicker = this.createFilePickerFallback();
      
      // Mark as fallback mode
      window.emmaFileSystemFallback = true;
    }
    
    // Brave-specific File System Access fixes
    if (this.browserInfo.name === 'Brave') {
      this.setupBraveFileSystemFixes();
    }
  }
  
  /**
   * Create File System Access API fallback using file input
   */
  createFilePickerFallback() {
    return (options = {}) => {
      return new Promise((resolve, reject) => {
        // Create hidden file input
        const input = document.createElement('input');
        input.type = 'file';
        input.style.display = 'none';
        
        // Set accept types from options
        if (options.types && options.types.length > 0) {
          const accept = options.types
            .map(type => Object.values(type.accept || {}).flat())
            .flat()
            .join(',');
          input.accept = accept;
        }
        
        input.multiple = options.multiple || false;
        
        // Handle file selection
        input.addEventListener('change', (event) => {
          const files = Array.from(event.target.files);
          if (files.length === 0) {
            reject(new Error('No file selected'));
            return;
          }
          
          // Create mock file handles
          const fileHandles = files.map(file => this.createMockFileHandle(file));
          
          if (options.multiple) {
            resolve(fileHandles);
          } else {
            resolve([fileHandles[0]]);
          }
          
          // Clean up
          document.body.removeChild(input);
        });
        
        // Handle cancellation
        input.addEventListener('cancel', () => {
          reject(new Error('File selection cancelled'));
          document.body.removeChild(input);
        });
        
        // Trigger file picker
        document.body.appendChild(input);
        input.click();
      });
    };
  }
  
  /**
   * Create mock file handle for fallback mode
   */
  createMockFileHandle(file) {
    return {
      name: file.name,
      kind: 'file',
      
      getFile: async () => file,
      
      // Mock write capability (will use download fallback)
      createWritable: () => {
        throw new Error('Write access not available - will use download fallback');
      },
      
      // Mark as fallback
      _emmaMockHandle: true,
      _originalFile: file
    };
  }
  
  /**
   * Brave browser specific fixes
   */
  setupBraveFileSystemFixes() {
    console.log('🛡️ BRAVE: Setting up Brave-specific File System Access fixes');
    
    // Brave may require user gesture for File System Access
    this.ensureUserGestureForFileAccess();
    
    // Brave shields detection and guidance
    this.setupBraveShieldsGuidance();
  }
  
  /**
   * Ensure File System Access API calls happen within user gesture
   */
  ensureUserGestureForFileAccess() {
    const originalShowOpenFilePicker = window.showOpenFilePicker;
    
    if (originalShowOpenFilePicker) {
      window.showOpenFilePicker = async (options) => {
        try {
          return await originalShowOpenFilePicker(options);
        } catch (error) {
          if (error.name === 'SecurityError' || error.message.includes('user gesture')) {
            console.log('🛡️ BRAVE: File System Access requires user gesture - showing guidance');
            this.showBraveFileAccessGuidance();
            throw error;
          }
          throw error;
        }
      };
    }
  }
  
  /**
   * Setup Brave shields detection and user guidance
   */
  setupBraveShieldsGuidance() {
    // Check if this looks like Brave is blocking features
    const potentialBraveBlocking = () => {
      return this.browserInfo.name === 'Brave' && (
        !this.featureSupport.fileSystemAccess ||
        !this.featureSupport.webCrypto ||
        !this.featureSupport.indexedDB
      );
    };
    
    if (potentialBraveBlocking()) {
      console.log('🛡️ BRAVE: Potential feature blocking detected');
      this.showBraveCompatibilityGuidance();
    }
  }
  
  /**
   * Show Brave-specific user guidance
   */
  showBraveCompatibilityGuidance() {
    const guidance = document.createElement('div');
    guidance.id = 'brave-guidance';
    guidance.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #ff6b35, #f7931e);
      color: white;
      padding: 20px;
      border-radius: 12px;
      max-width: 300px;
      z-index: 10000;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.2);
    `;
    
    guidance.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 24px; margin-right: 10px;">🛡️</span>
        <strong>Brave Browser Detected</strong>
      </div>
      <p style="margin-bottom: 15px; font-size: 14px;">
        For the best Emma experience, please:
      </p>
      <ol style="font-size: 13px; margin-bottom: 15px; padding-left: 20px;">
        <li>Click the Brave shield icon in the address bar</li>
        <li>Turn off "Block scripts" for this site</li>
        <li>Refresh the page</li>
      </ol>
      <button onclick="this.parentElement.remove()" style="
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
      ">Got it!</button>
    `;
    
    document.body.appendChild(guidance);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (document.getElementById('brave-guidance')) {
        guidance.remove();
      }
    }, 10000);
  }
  
  /**
   * Show file access guidance for Brave
   */
  showBraveFileAccessGuidance() {
    alert(`🛡️ Brave Browser Notice\n\nTo access your .emma vault files, please:\n\n1. Click the Brave shield icon in your address bar\n2. Allow "File system access" for this site\n3. Try opening your vault again\n\nThis ensures Emma can securely access your memory files.`);
  }
  
  /**
   * Web Crypto API fallback (though most modern browsers support it)
   */
  initializeCryptoFallback() {
    if (!this.featureSupport.webCrypto) {
      console.error('❌ CRYPTO: Web Crypto API not supported - Emma vault encryption will not work');
      
      // Show critical error
      this.showCriticalError(
        'Web Crypto API Required',
        'Emma requires Web Crypto API for secure vault encryption. Please update your browser or use a modern browser like Chrome, Firefox, or Safari.'
      );
    } else if (!this.featureSupport.isSecureContext) {
      console.warn('⚠️ CRYPTO: Not in secure context - Web Crypto may be limited');
      
      if (!this.featureSupport.httpsRequired) {
        this.showWarning(
          'Secure Connection Required',
          'Emma works best over HTTPS. Some features may be limited over HTTP.'
        );
      }
    }
  }
  
  /**
   * Storage fallback system
   */
  initializeStorageFallback() {
    // IndexedDB fallback
    if (!this.featureSupport.indexedDB) {
      console.warn('⚠️ STORAGE: IndexedDB not supported - using localStorage fallback');
      this.setupIndexedDBFallback();
    }
    
    // localStorage fallback
    if (!this.featureSupport.localStorage) {
      console.error('❌ STORAGE: localStorage not supported - Emma cannot store data');
      this.showCriticalError(
        'Local Storage Required',
        'Emma requires localStorage to function. Please enable localStorage in your browser settings.'
      );
    }
  }
  
  /**
   * Brave browser specific fixes
   */
  initializeBraveSpecificFixes() {
    if (this.browserInfo.name === 'Brave') {
      console.log('🛡️ BRAVE: Applying Brave-specific compatibility fixes');
      
      // Fix for Brave's aggressive script blocking
      this.fixBraveScriptBlocking();
      
      // Fix for Brave's storage restrictions
      this.fixBraveStorageIssues();
      
      // Fix for Brave's File System Access restrictions
      this.fixBraveFileSystemIssues();
    }
  }
  
  /**
   * Fix Brave script blocking issues
   */
  fixBraveScriptBlocking() {
    // Detect if scripts are being blocked
    const scriptTest = document.createElement('script');
    scriptTest.textContent = 'window.emmaScriptTest = true;';
    document.head.appendChild(scriptTest);
    
    setTimeout(() => {
      if (!window.emmaScriptTest) {
        console.warn('🛡️ BRAVE: Scripts may be blocked by Brave Shields');
        this.showBraveCompatibilityGuidance();
      }
      document.head.removeChild(scriptTest);
      delete window.emmaScriptTest;
    }, 100);
  }
  
  /**
   * Fix Brave storage issues
   */
  fixBraveStorageIssues() {
    // Test storage functionality
    try {
      localStorage.setItem('emmaBraveTest', 'test');
      const retrieved = localStorage.getItem('emmaBraveTest');
      localStorage.removeItem('emmaBraveTest');
      
      if (retrieved !== 'test') {
        throw new Error('Storage test failed');
      }
    } catch (error) {
      console.warn('🛡️ BRAVE: Storage issues detected:', error);
      this.showBraveStorageGuidance();
    }
  }
  
  /**
   * Fix Brave File System Access issues
   */
  fixBraveFileSystemIssues() {
    if (this.featureSupport.fileSystemAccess) {
      // Test File System Access API
      const testFileAccess = async () => {
        try {
          // This will fail if Brave is blocking file access
          await window.showOpenFilePicker({
            types: [{ description: 'Test', accept: { 'text/plain': ['.txt'] } }],
            excludeAcceptAllOption: true,
            multiple: false
          });
        } catch (error) {
          if (error.name === 'SecurityError') {
            console.warn('🛡️ BRAVE: File System Access blocked by Brave Shields');
            this.showBraveFileAccessGuidance();
          }
        }
      };
      
      // Only test on user interaction to avoid unnecessary prompts
      document.addEventListener('click', testFileAccess, { once: true });
    }
  }
  
  /**
   * Show storage guidance for Brave users
   */
  showBraveStorageGuidance() {
    this.showWarning(
      'Brave Storage Settings',
      'If Emma is not saving your vault properly, please check Brave Settings > Privacy and Security > Site and Shields Settings and ensure this site can use storage.'
    );
  }
  
  /**
   * Setup IndexedDB fallback using localStorage
   */
  setupIndexedDBFallback() {
    // Create a localStorage-based IndexedDB shim
    window.indexedDB = {
      open: (name, version) => {
        return {
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
          result: {
            transaction: () => ({
              objectStore: () => ({
                add: (data) => {
                  try {
                    const key = `idb_${name}_${data.id || Date.now()}`;
                    localStorage.setItem(key, JSON.stringify(data));
                    return { onsuccess: null, onerror: null };
                  } catch (error) {
                    return { onerror: () => {}, error };
                  }
                },
                get: (id) => {
                  try {
                    const key = `idb_${name}_${id}`;
                    const data = localStorage.getItem(key);
                    return { 
                      onsuccess: null, 
                      result: data ? JSON.parse(data) : null 
                    };
                  } catch (error) {
                    return { onerror: () => {}, error };
                  }
                }
              })
            }),
            close: () => {},
            objectStoreNames: { contains: () => false }
          }
        };
      },
      deleteDatabase: () => ({ onsuccess: null })
    };
    
    console.log('✅ FALLBACK: IndexedDB localStorage shim installed');
  }
  
  /**
   * Enhanced error handling for Emma vault operations
   */
  async safeVaultOperation(operation, fallbackOperation = null) {
    try {
      return await operation();
    } catch (error) {
      console.error('🚨 VAULT OPERATION FAILED:', error);
      
      // Browser-specific error handling
      if (this.browserInfo.name === 'Brave' && error.name === 'SecurityError') {
        this.showBraveCompatibilityGuidance();
      } else if (error.message.includes('File System Access')) {
        this.showFileSystemAccessGuidance();
      }
      
      // Try fallback if available
      if (fallbackOperation) {
        console.log('🔄 FALLBACK: Attempting fallback operation...');
        try {
          return await fallbackOperation();
        } catch (fallbackError) {
          console.error('❌ FALLBACK: Fallback operation also failed:', fallbackError);
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Show File System Access guidance
   */
  showFileSystemAccessGuidance() {
    const browserSpecific = {
      'Brave': 'Please disable Brave Shields for this site to enable file access.',
      'Firefox': 'Emma will use download/upload mode instead of direct file access.',
      'Safari': 'Emma will use download/upload mode instead of direct file access.',
      'Chrome': 'Please ensure you\'re using Chrome 86+ for full file access support.',
      'Edge': 'Please ensure you\'re using Edge 86+ for full file access support.'
    };
    
    const message = browserSpecific[this.browserInfo.name] || 
      'Your browser may not support direct file access. Emma will use download/upload mode.';
    
    this.showWarning('File Access Notice', message);
  }
  
  /**
   * Show critical error modal
   */
  showCriticalError(title, message) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(10px);
    `;
    
    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #ef4444, #dc2626);
        border-radius: 20px;
        padding: 30px;
        max-width: 400px;
        text-align: center;
        color: white;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      ">
        <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
        <h2 style="margin-bottom: 15px;">${title}</h2>
        <p style="margin-bottom: 20px; opacity: 0.9;">${message}</p>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        ">Understand</button>
      </div>
    `;
    
    document.body.appendChild(modal);
  }
  
  /**
   * Show warning modal
   */
  showWarning(title, message) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
      padding: 20px;
      border-radius: 12px;
      max-width: 300px;
      z-index: 10000;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.2);
    `;
    
    modal.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 24px; margin-right: 10px;">⚠️</span>
        <strong>${title}</strong>
      </div>
      <p style="margin-bottom: 15px; font-size: 14px;">${message}</p>
      <button onclick="this.parentElement.remove()" style="
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
      ">Got it!</button>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (modal.parentElement) {
        modal.remove();
      }
    }, 8000);
  }
  
  /**
   * Get browser compatibility report
   */
  getCompatibilityReport() {
    const criticalFeatures = ['webCrypto', 'localStorage', 'isSecureContext'];
    const recommendedFeatures = ['fileSystemAccess', 'indexedDB', 'dragDrop'];
    
    const critical = criticalFeatures.every(feature => this.featureSupport[feature]);
    const recommended = recommendedFeatures.filter(feature => this.featureSupport[feature]).length;
    
    return {
      browser: this.browserInfo,
      features: this.featureSupport,
      compatibility: {
        critical: critical,
        score: (recommended / recommendedFeatures.length) * 100,
        issues: this.getKnownIssues()
      }
    };
  }
  
  /**
   * Get known browser-specific issues
   */
  getKnownIssues() {
    const issues = [];
    
    if (this.browserInfo.name === 'Brave') {
      if (!this.featureSupport.fileSystemAccess) {
        issues.push('File System Access API may be blocked by Brave Shields');
      }
      issues.push('May require disabling Shields for full functionality');
    }
    
    if (this.browserInfo.name === 'Firefox') {
      if (!this.featureSupport.fileSystemAccess) {
        issues.push('File System Access API not supported - will use download/upload mode');
      }
    }
    
    if (this.browserInfo.name === 'Safari') {
      if (!this.featureSupport.fileSystemAccess) {
        issues.push('File System Access API not supported - will use download/upload mode');
      }
      if (this.browserInfo.version < 14) {
        issues.push('Some Web Crypto features may be limited on older Safari versions');
      }
    }
    
    if (!this.featureSupport.isSecureContext) {
      issues.push('Not in secure context - Web Crypto API may be limited');
    }
    
    return issues;
  }
  
  /**
   * Apply browser-specific CSS fixes
   */
  applyBrowserSpecificStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Browser-specific fixes */
      
      /* Brave browser fixes */
      .browser-brave .emma-orb-webgl {
        /* Ensure WebGL works with Brave's security settings */
        image-rendering: auto;
        transform: translateZ(0);
      }
      
      /* Firefox fixes */
      .browser-firefox .vault-btn {
        /* Firefox button rendering fix */
        -moz-appearance: none;
      }
      
      /* Safari fixes */
      .browser-safari .emma-orb-container {
        /* Safari transform fix */
        -webkit-transform-style: preserve-3d;
      }
      
      /* Mobile device fixes */
      .mobile-device .vault-controls {
        flex-direction: column;
        align-items: center;
      }
      
      .mobile-device .vault-btn {
        width: 100%;
        max-width: 300px;
        margin: 5px 0;
      }
      
      /* Fallback mode styling */
      .emma-fallback-mode .vault-status::after {
        content: ' (Compatibility Mode)';
        font-size: 0.8em;
        opacity: 0.7;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Initialize Emma with browser compatibility
   */
  async initializeEmmaWithCompatibility() {
    console.log('🚀 EMMA: Initializing with browser compatibility layer...');
    
    // Apply browser-specific styles
    this.applyBrowserSpecificStyles();
    
    // Mark fallback mode if needed
    if (!this.featureSupport.fileSystemAccess) {
      document.body.classList.add('emma-fallback-mode');
    }
    
    // Show compatibility status
    if (this.browserInfo.name === 'Brave') {
      console.log('🛡️ BRAVE: Emma initialized with Brave compatibility layer');
    }
    
    // Return compatibility report
    return this.getCompatibilityReport();
  }
}

// Enhanced Emma vault operations with browser compatibility
class EmmaCompatibleVault extends EmmaWebVault {
  constructor() {
    super();
    this.compatibility = new EmmaBrowserCompatibility();
    
    // Override openVaultFile with compatibility layer
    this.originalOpenVaultFile = this.openVaultFile.bind(this);
    this.openVaultFile = this.compatibleOpenVaultFile.bind(this);
    
    // Override createVaultFile with compatibility layer
    this.originalCreateVaultFile = this.createVaultFile.bind(this);
    this.createVaultFile = this.compatibleCreateVaultFile.bind(this);
  }
  
  /**
   * Browser-compatible vault file opening
   */
  async compatibleOpenVaultFile(file) {
    return await this.compatibility.safeVaultOperation(
      () => this.originalOpenVaultFile(file),
      () => this.fallbackOpenVaultFile(file)
    );
  }
  
  /**
   * Browser-compatible vault file creation
   */
  async compatibleCreateVaultFile(name, passphrase) {
    return await this.compatibility.safeVaultOperation(
      () => this.originalCreateVaultFile(name, passphrase),
      () => this.fallbackCreateVaultFile(name, passphrase)
    );
  }
  
  /**
   * Fallback vault opening for browsers without File System Access API
   */
  async fallbackOpenVaultFile(file) {
    console.log('🔄 FALLBACK: Opening vault file without File System Access API');
    
    // Use the existing fallback mechanism but with better error handling
    try {
      const fileData = new Uint8Array(await file.arrayBuffer());
      
      // Request passphrase
      const passphrase = await this.requestPassphrase(file.name);
      if (!passphrase) throw new Error('No passphrase provided');
      
      // Decrypt using native crypto
      const vaultData = await this.exactWorkingDecrypt(fileData, passphrase);
      
      // Store vault data (no file handle in fallback mode)
      this.vaultData = vaultData;
      this.isOpen = true;
      this.passphrase = passphrase;
      this.fileHandle = null; // No direct write access
      this.originalFileName = file.name;
      
      // Store session data
      sessionStorage.setItem('emmaVaultActive', 'true');
      sessionStorage.setItem('emmaVaultName', vaultData.metadata?.name || file.name);
      sessionStorage.setItem('emmaVaultPassphrase', passphrase);
      
      // Save to IndexedDB
      await this.saveToIndexedDB();
      
      console.log('✅ FALLBACK: Vault opened successfully in fallback mode');
      
      return {
        success: true,
        vaultData: vaultData,
        fallbackMode: true
      };
      
    } catch (error) {
      console.error('❌ FALLBACK: Vault opening failed:', error);
      throw error;
    }
  }
  
  /**
   * Fallback vault creation for browsers without File System Access API
   */
  async fallbackCreateVaultFile(name, passphrase) {
    console.log('🔄 FALLBACK: Creating vault file without File System Access API');
    
    try {
      // Create vault data structure
      const vaultData = {
        metadata: {
          version: '2.0',
          created: new Date().toISOString(),
          name: name,
          encryption: {
            algorithm: 'AES-GCM',
            keyDerivation: 'PBKDF2',
            iterations: 250000,
            salt: Array.from(crypto.getRandomValues(new Uint8Array(32)))
          }
        },
        content: {
          memories: {},
          people: {},
          media: {}
        },
        stats: {
          memoryCount: 0,
          peopleCount: 0,
          mediaCount: 0
        }
      };
      
      // Encrypt vault
      const encryptedData = await this.nativeEncryptVault(vaultData, passphrase);
      
      // Download the vault file
      const blob = new Blob([encryptedData], { type: 'application/emma-vault' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/[^a-zA-Z0-9-_]/g, '_')}.emma`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Store vault data (no file handle in fallback mode)
      this.vaultData = vaultData;
      this.isOpen = true;
      this.passphrase = passphrase;
      this.fileHandle = null;
      this.originalFileName = a.download;
      
      // Store session data
      sessionStorage.setItem('emmaVaultActive', 'true');
      sessionStorage.setItem('emmaVaultName', name);
      sessionStorage.setItem('emmaVaultPassphrase', passphrase);
      
      // Save to IndexedDB
      await this.saveToIndexedDB();
      
      console.log('✅ FALLBACK: Vault created and downloaded successfully');
      
      return {
        success: true,
        vaultData: vaultData,
        fallbackMode: true,
        downloadedFileName: a.download
      };
      
    } catch (error) {
      console.error('❌ FALLBACK: Vault creation failed:', error);
      throw error;
    }
  }
  
  /**
   * Request passphrase with browser compatibility
   */
  async requestPassphrase(fileName, isCreate = false) {
    // Try Emma's modal first
    if (window.cleanSecurePasswordModal) {
      try {
        return await window.cleanSecurePasswordModal.show({
          title: isCreate ? `🔒 Secure Your Vault` : `🔐 Unlock ${fileName}`,
          message: isCreate 
            ? `Create a passphrase for "${fileName}":` 
            : `Enter the passphrase for "${fileName}":`,
          placeholder: 'Enter passphrase...'
        });
      } catch (error) {
        if (error.message === 'User cancelled') {
          return null;
        }
        // Fall through to prompt fallback
      }
    }
    
    // Fallback to browser prompt
    const passphrase = prompt(
      isCreate 
        ? `🔒 Create a passphrase for your new vault "${fileName}":` 
        : `🔐 Enter the passphrase for "${fileName}":`
    );
    
    return passphrase?.trim() || null;
  }
}

// Initialize compatibility system
window.addEventListener('DOMContentLoaded', () => {
  console.log('🌐 EMMA: Initializing browser compatibility system...');
  
  // Replace EmmaWebVault with compatible version
  if (window.emmaWebVault) {
    console.log('🔄 EMMA: Upgrading existing vault with compatibility layer...');
    const oldVault = window.emmaWebVault;
    window.emmaWebVault = new EmmaCompatibleVault();
    
    // Preserve existing state
    if (oldVault.isOpen) {
      window.emmaWebVault.isOpen = oldVault.isOpen;
      window.emmaWebVault.vaultData = oldVault.vaultData;
      window.emmaWebVault.passphrase = oldVault.passphrase;
      window.emmaWebVault.fileHandle = oldVault.fileHandle;
    }
  } else {
    window.emmaWebVault = new EmmaCompatibleVault();
  }
  
  // Initialize compatibility system
  window.emmaBrowserCompatibility = window.emmaWebVault.compatibility;
  
  // Show compatibility status
  const report = window.emmaBrowserCompatibility.getCompatibilityReport();
  console.log('📊 EMMA: Browser compatibility report:', report);
  
  if (report.compatibility.issues.length > 0) {
    console.warn('⚠️ EMMA: Browser compatibility issues detected:', report.compatibility.issues);
  }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EmmaBrowserCompatibility, EmmaCompatibleVault };
}
