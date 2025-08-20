/**
 * Emma Mirror Companion
 * Adaptive reflection companion that mirrors user communication style
 */

class EmmaMirrorCompanion extends BaseOrb {
  constructor(container, options = {}) {
    super(container, { ...options, orbType: 'mirror' });
    
    this.adaptationSpeed = 5;
    this.mirrorStyle = true;
    this.conversationHistory = [];
    
    console.log('🪞 EmmaMirrorCompanion: Initializing Mirror Emma');
    this.init();
  }
  
  async init() {
    await super.init();
    await this.loadSettings();
    this.setupUI();
    this.setupEventHandlers();
    
    // Setup click handler AFTER UI is created
    this.finalizeInitialization();
    
    console.log('🪞 EmmaMirrorCompanion: Mirror Emma ready');
  }
  
  async loadSettings() {
    try {
      const vid = this.options.vaultId || 'unknown';
      const keys = [
        `mirror.enabled:${vid}`,
        `mirror.adaptationSpeed:${vid}`,
        `mirror.mirrorStyle:${vid}`,
        `mirror.voiceEnabled:${vid}`,
        `mirror.responseStyle:${vid}`,
        `mirror.wakeWord:${vid}`
      ];
      
      let settings = {};
      if (window.emmaAPI?.storage?.get) {
        settings = await window.emmaAPI.storage.get(keys);
      } else if (window.chrome && chrome.storage && chrome.storage.local) {
        settings = await chrome.storage.local.get(keys);
      }
      
      this.enabled = settings[keys[0]] || false;
      this.adaptationSpeed = settings[keys[1]] || 5;
      this.mirrorStyle = settings[keys[2]] !== false; // default true
      this.voiceEnabled = settings[keys[3]] || false;
      this.responseStyle = settings[keys[4]] || 'conversational';
      this.wakeWord = settings[keys[5]] || 'Emma';
      
      console.log('🪞 EmmaMirrorCompanion: Settings loaded', {
        enabled: this.enabled,
        adaptationSpeed: this.adaptationSpeed,
        mirrorStyle: this.mirrorStyle
      });
      
    } catch (e) {
      console.warn('🪞 EmmaMirrorCompanion: Failed to load settings:', e);
    }
  }
  
  setupUI() {
    if (!this.container) return;
    
    // Create the orb using the shared EmmaOrb
    this.orb = new EmmaOrb(this.container, {
      hue: 0, // Silver/gray color for mirror
      ...this.options
    });
    
    // Create mirror-specific UI panel
    this.createMirrorPanel();
    
    this.updateOrbState();
  }
  
  createMirrorPanel() {
    // Create floating panel for mirror interactions
    this.panel = document.createElement('div');
    this.panel.className = 'emma-mirror-panel';
    this.panel.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 20px;
      width: 320px;
      max-height: 400px;
      background: rgba(20, 20, 30, 0.95);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 20px;
      display: none;
      z-index: 9999;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    `;
    
    this.panel.innerHTML = `
      <div class="mirror-header">
        <h3 style="margin: 0 0 8px 0; font-size: 18px; background: linear-gradient(135deg, #c0c0c0, #808080); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
          Mirror Emma
        </h3>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: rgba(255,255,255,0.7);">
          Adapting to your communication style...
        </p>
      </div>
      
      <div class="adaptation-status">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 13px; color: rgba(255,255,255,0.8);">Adaptation Level</span>
          <span id="adaptation-level" style="font-size: 13px; color: #c0c0c0;">Learning...</span>
        </div>
        <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
          <div id="adaptation-progress" style="width: 0%; height: 100%; background: linear-gradient(135deg, #c0c0c0, #808080); transition: width 0.3s ease;"></div>
        </div>
      </div>
      
      <div class="communication-insights" style="margin-top: 16px;">
        <div style="font-size: 13px; color: rgba(255,255,255,0.8); margin-bottom: 8px;">Current Style:</div>
        <div id="current-style" style="font-size: 14px; color: #c0c0c0;">Observing...</div>
      </div>
      
      <div class="mirror-actions" style="margin-top: 20px; display: flex; gap: 8px;">
        <button id="mirror-reset" style="
          flex: 1;
          padding: 8px 12px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          color: white;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        ">Reset Learning</button>
        <button id="mirror-settings" style="
          flex: 1;
          padding: 8px 12px;
          background: linear-gradient(135deg, #c0c0c0, #808080);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        ">Settings</button>
      </div>
    `;
    
    document.body.appendChild(this.panel);
  }
  
  setupEventHandlers() {
    if (!this.container) return;
    
    // Panel button handlers
    if (this.panel) {
      const resetBtn = this.panel.querySelector('#mirror-reset');
      const settingsBtn = this.panel.querySelector('#mirror-settings');
      
      if (resetBtn) {
        resetBtn.addEventListener('click', () => this.resetAdaptation());
      }
      
      if (settingsBtn) {
        settingsBtn.addEventListener('click', () => this.openSettings());
      }
    }
    
    // Listen for user input across the page to learn from
    this.setupLearningListeners();
  }
  
  setupLearningListeners() {
    // Listen for text input, clicks, and other user interactions
    document.addEventListener('input', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        this.learnFromInput(e.target.value);
      }
    });
    
    // Listen for speech if available
    if (this.voiceEnabled && 'webkitSpeechRecognition' in window) {
      this.setupSpeechLearning();
    }
  }
  
  setupSpeechLearning() {
    try {
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      
      this.recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            this.learnFromSpeech(event.results[i][0].transcript);
          }
        }
      };
      
      this.recognition.start();
    } catch (e) {
      console.warn('🪞 EmmaMirrorCompanion: Speech recognition not available:', e);
    }
  }
  
  learnFromInput(text) {
    if (!text || text.length < 5) return;
    
    // Analyze communication style
    const style = this.analyzeStyle(text);
    this.updateAdaptation(style);
  }
  
  learnFromSpeech(text) {
    this.learnFromInput(text);
  }
  
  analyzeStyle(text) {
    const analysis = {
      formality: this.detectFormality(text),
      emotion: this.detectEmotion(text),
      brevity: text.length < 50 ? 'brief' : 'detailed',
      questionStyle: text.includes('?') ? 'inquisitive' : 'declarative'
    };
    
    return analysis;
  }
  
  detectFormality(text) {
    const formalWords = ['please', 'thank you', 'would', 'could', 'should'];
    const casualWords = ['hey', 'yeah', 'ok', 'cool', 'awesome'];
    
    const formalCount = formalWords.filter(word => text.toLowerCase().includes(word)).length;
    const casualCount = casualWords.filter(word => text.toLowerCase().includes(word)).length;
    
    if (formalCount > casualCount) return 'formal';
    if (casualCount > formalCount) return 'casual';
    return 'neutral';
  }
  
  detectEmotion(text) {
    const positiveWords = ['happy', 'great', 'awesome', 'love', 'excited'];
    const negativeWords = ['sad', 'angry', 'frustrated', 'hate', 'terrible'];
    
    const positiveCount = positiveWords.filter(word => text.toLowerCase().includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.toLowerCase().includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }
  
  updateAdaptation(style) {
    // Store the style analysis
    this.conversationHistory.push({
      timestamp: Date.now(),
      style: style
    });
    
    // Keep only recent history
    if (this.conversationHistory.length > 100) {
      this.conversationHistory.shift();
    }
    
    // Update UI
    this.updateAdaptationDisplay();
  }
  
  updateAdaptationDisplay() {
    if (!this.panel) return;
    
    const progressBar = this.panel.querySelector('#adaptation-progress');
    const levelText = this.panel.querySelector('#adaptation-level');
    const styleText = this.panel.querySelector('#current-style');
    
    if (progressBar && levelText && styleText) {
      const progress = Math.min(this.conversationHistory.length * 2, 100);
      progressBar.style.width = progress + '%';
      
      if (progress < 20) {
        levelText.textContent = 'Learning...';
        styleText.textContent = 'Observing patterns';
      } else if (progress < 60) {
        levelText.textContent = 'Adapting...';
        styleText.textContent = this.getCurrentStyleSummary();
      } else {
        levelText.textContent = 'Synchronized';
        styleText.textContent = this.getCurrentStyleSummary();
      }
    }
  }
  
  getCurrentStyleSummary() {
    if (this.conversationHistory.length === 0) return 'No data yet';
    
    const recent = this.conversationHistory.slice(-10);
    const formality = this.getMostCommon(recent.map(h => h.style.formality));
    const emotion = this.getMostCommon(recent.map(h => h.style.emotion));
    
    return `${formality.charAt(0).toUpperCase() + formality.slice(1)}, ${emotion}`;
  }
  
  getMostCommon(arr) {
    return arr.sort((a,b) =>
      arr.filter(v => v === a).length - arr.filter(v => v === b).length
    ).pop();
  }
  
  togglePanel() {
    if (!this.panel) return;
    
    const isVisible = this.panel.style.display !== 'none';
    this.panel.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
      this.updateAdaptationDisplay();
    }
  }
  
  resetAdaptation() {
    this.conversationHistory = [];
    this.updateAdaptationDisplay();
    
    // Show feedback
    const levelText = this.panel.querySelector('#adaptation-level');
    if (levelText) {
      const original = levelText.textContent;
      levelText.textContent = 'Reset complete';
      setTimeout(() => {
        levelText.textContent = 'Learning...';
      }, 2000);
    }
  }
  
  openSettings() {
    // This will be called by the main settings dialog
    if (window.openOrbDialog) {
      window.openOrbDialog('mirror');
    }
  }
  
  updateOrbState() {
    if (!this.orb) return;
    
    let state = 'idle';
    if (!this.enabled) {
      state = 'disabled';
    } else if (this.conversationHistory.length > 10) {
      state = 'learning';
    }
    
    // Update orb appearance based on state
    if (this.orb.updateState) {
      this.orb.updateState(state);
    }
  }
  
  cleanup() {
    console.log('🪞 EmmaMirrorCompanion: Cleaning up');
    
    super.cleanup(); // Remove click handler
    
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
    
    if (this.orb && this.orb.cleanup) {
      this.orb.cleanup();
    }
    
    // Remove event listeners
    document.removeEventListener('input', this.learnFromInput);
  }
  
  onSettingsChanged(settings) {
    console.log('🪞 EmmaMirrorCompanion: Settings changed', settings);
    this.loadSettings().then(() => {
      this.updateOrbState();
    });
  }
}

// Make available globally
window.EmmaMirrorCompanion = EmmaMirrorCompanion;
