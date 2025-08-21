/**
 * Emma Chat Experience - Intelligent Memory Companion Chat Interface
 * CTO-approved implementation following Emma's premium design principles
 * 
 * 🚀 VECTORLESS AI INTEGRATION: Revolutionary memory intelligence without vector embeddings
 * Privacy-first, local processing with optional cloud LLM enhancement
 */

console.log('💬 CACHE BUST DEBUG: emma-chat-experience.js LOADED at', new Date().toISOString());

class EmmaChatExperience extends ExperiencePopup {
  constructor(position, settings = {}) {
    super(position, settings);
    
    // Chat-specific properties
    this.messages = [];
    this.isTyping = false;
    this.sessionId = this.generateSessionId();
    this.webglOrb = null;
    this.messageContainer = null;
    this.inputField = null;
    this.sendButton = null;
    
    // 🧠 Vectorless AI Engine Integration
    this.vectorlessEngine = null;
    this.apiKey = null;
    this.isVectorlessEnabled = false;
    
    // 💝 Intelligent Memory Capture Integration
    this.intelligentCapture = null;
    this.detectedMemories = new Map();
    this.activeCapture = null;
    
    // Emma personality settings
    this.emmaPersonality = {
      name: "Emma",
      role: "Intelligent Memory Companion",
      tone: "warm, helpful, memory-focused",
      capabilities: ["memory insights", "capture suggestions", "conversation", "vectorless AI"]
    };
    
    console.log('💬 Emma Chat Experience initialized');
  }

  getTitle() {
    return ''; // No title - clean header following voice capture pattern
  }

  async initialize() {
    this.initializeEmmaOrb();
    this.setupChatInterface();
    this.setupKeyboardShortcuts();
    this.loadChatHistory();
    
    // 🧠 Initialize Vectorless AI Engine
    await this.initializeVectorlessEngine();
    
    // 💝 Initialize Intelligent Memory Capture
    console.log('🚨 AUDIT: About to initialize intelligent capture');
    await this.initializeIntelligentCapture();
    console.log('🚨 AUDIT: Intelligent capture initialization complete. Result:', !!this.intelligentCapture);
    
    // Set global reference for onclick handlers
    window.chatExperience = this;
    
    // 🚨 AUDIT: Add test function for memory detection
    window.testMemoryDetection = async (message) => {
      console.log('🧪 TESTING: Manual memory detection test');
      if (this.intelligentCapture) {
        const result = await this.intelligentCapture.analyzeMessage({
          content: message || 'my dog cutie almost died from a fungus',
          timestamp: Date.now(),
          sender: 'user'
        });
        console.log('🧪 TEST RESULT:', result);
        return result;
      } else {
        console.log('🧪 TEST FAILED: No intelligent capture available');
        return null;
      }
    };
    
    this.startWithWelcomeMessage();
    this.enableFocusMode();
  }

  initializeEmmaOrb() {
    try {
      const orbContainer = document.getElementById('chat-emma-orb');
      if (!orbContainer) {
        console.warn('💬 Chat Emma orb container not found');
        return;
      }
      
      if (window.EmmaOrb) {
        // Create WebGL Emma Orb for chat interface
        this.webglOrb = new window.EmmaOrb(orbContainer, {
          hue: 270, // Emma's signature purple-pink
          hoverIntensity: 0.3,
          rotateOnHover: false,
          forceHoverState: false
        });
        console.log('💬 Chat Emma Orb initialized successfully');
      } else {
        console.warn('💬 EmmaOrb class not available, using fallback');
        // Fallback gradient
        orbContainer.style.background = 'radial-gradient(circle at 30% 30%, #8A5EFA, #764ba2, #f093fb)';
        orbContainer.style.borderRadius = '50%';
        orbContainer.style.width = '100%';
        orbContainer.style.height = '100%';
      }
    } catch (error) {
      console.error('🚨 Error initializing Chat Emma Orb:', error);
    }
  }

  renderContent(contentElement) {
    contentElement.innerHTML = `
      <div class="emma-chat-studio">
        <!-- Emma WebGL Orb Anchor -->
        <div class="emma-anchor">
          <div class="webgl-orb-container" id="chat-emma-orb"></div>
          <p class="emma-hint" id="chat-emma-hint">Ready to chat about your memories</p>
        </div>

        <!-- Chat Messages Area -->
        <div class="chat-messages-area" id="chat-messages-area">
          <div class="messages-container" id="messages-container">
            <!-- Messages will be dynamically added here -->
          </div>
        </div>

        <!-- Chat Input Area -->
        <div class="chat-input-area">
          <div class="input-container">
            <button id="voice-input-button" class="voice-input-button" title="Voice to text">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
            <textarea 
              id="chat-input" 
              class="chat-input" 
              placeholder="Ask Emma about your memories..." 
              rows="1"
              maxlength="2000"
            ></textarea>
            <button id="vectorless-settings-button" class="vectorless-settings-button" title="Vectorless AI Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
              </svg>
            </button>
            <button id="send-button" class="send-button" title="Send message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
          <div class="input-hints">
            <span class="hint-item">Press Enter to send</span>
            <span class="hint-separator">•</span>
            <span class="hint-item">Click mic for voice input</span>
            <span class="hint-separator">•</span>
            <span class="hint-item">Shift+Enter for new line</span>
          </div>
        </div>

        <!-- Typing Indicator -->
        <div class="typing-indicator" id="typing-indicator" style="display: none;">
          <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
          <span class="typing-text">Emma is thinking...</span>
        </div>

        <!-- Vectorless AI Settings Modal -->
        <div class="vectorless-settings-modal" id="vectorless-settings-modal" style="display: none;">
          <div class="modal-backdrop" id="modal-backdrop"></div>
          <div class="modal-content">
            <div class="modal-header">
              <h3>🧠 Vectorless AI Settings</h3>
              <button class="modal-close" id="modal-close-button">×</button>
            </div>
            <div class="modal-body">
              <div class="settings-section">
                <h4>🔑 OpenAI API Configuration</h4>
                <p class="settings-description">
                  Enable advanced AI responses by providing your OpenAI API key. 
                  Emma will use intelligent heuristics if no key is provided.
                </p>
                <div class="input-group">
                  <label for="api-key-input">API Key (Optional)</label>
                  <input 
                    type="password" 
                    id="api-key-input" 
                    class="settings-input"
                    placeholder="sk-..." 
                    autocomplete="off"
                  >
                  <small class="input-help">Your API key is stored locally and never transmitted to our servers</small>
                </div>
              </div>
              
              <div class="settings-section">
                <h4>🤗 Dementia Care Mode</h4>
                <p class="settings-description">
                  Specialized responses using validation therapy principles for users with memory impairment.
                </p>
                <div class="toggle-group">
                  <label class="toggle-switch">
                    <input type="checkbox" id="dementia-mode-toggle">
                    <span class="toggle-slider"></span>
                  </label>
                  <span class="toggle-label">Enable Dementia Care Mode</span>
                </div>
              </div>
              
              <div class="settings-section">
                <h4>🔍 Debug Mode</h4>
                <p class="settings-description">
                  Show processing details and performance metrics for development.
                </p>
                <div class="toggle-group">
                  <label class="toggle-switch">
                    <input type="checkbox" id="debug-mode-toggle">
                    <span class="toggle-slider"></span>
                  </label>
                  <span class="toggle-label">Enable Debug Mode</span>
                </div>
              </div>
              
              <div class="settings-section">
                <div class="vectorless-status" id="vectorless-status">
                  <div class="status-indicator" id="status-indicator">⚪</div>
                  <span id="status-text">Initializing...</span>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="button-secondary" id="reset-settings-button">Reset to Defaults</button>
              <button class="button-primary" id="save-settings-button">Save Settings</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  setupChatInterface() {
    this.messageContainer = document.getElementById('messages-container');
    this.inputField = document.getElementById('chat-input');
    this.sendButton = document.getElementById('send-button');
    this.voiceButton = document.getElementById('voice-input-button');
    this.settingsButton = document.getElementById('vectorless-settings-button');
    
    if (!this.messageContainer || !this.inputField || !this.sendButton || !this.voiceButton || !this.settingsButton) {
      console.error('💬 Chat interface elements not found');
      return;
    }

    // Setup input handling
    this.inputField.addEventListener('input', () => this.handleInputChange());
    this.inputField.addEventListener('keydown', (e) => this.handleInputKeydown(e));
    this.sendButton.addEventListener('click', () => this.sendMessage());
    this.voiceButton.addEventListener('click', () => this.toggleVoiceInput());
    this.settingsButton.addEventListener('click', () => this.openVectorlessSettings());

    // Auto-resize textarea
    this.inputField.addEventListener('input', () => this.autoResizeTextarea());
    
    // Initialize voice recognition
    this.initializeVoiceRecognition();
    
    // Setup settings modal
    this.setupSettingsModal();
  }

  setupKeyboardShortcuts() {
    this.keyboardHandler = (e) => {
      if (!this.isVisible || !this.element) return;
      
      // Escape to close (unless typing in input)
      if (e.code === 'Escape' && document.activeElement !== this.inputField) {
        e.preventDefault();
        e.stopPropagation();
        this.close();
        return;
      }
    };
    
    document.addEventListener('keydown', this.keyboardHandler, true);
  }

  handleInputKeydown(e) {
    // Enter to send (unless Shift+Enter for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
      return;
    }
    
    // Auto-resize on Enter
    if (e.key === 'Enter') {
      setTimeout(() => this.autoResizeTextarea(), 0);
    }
  }

  handleInputChange() {
    // Update Emma orb state based on input
    if (this.webglOrb && this.webglOrb.options) {
      const hasText = this.inputField.value.trim().length > 0;
      this.webglOrb.options.forceHoverState = hasText;
    }
  }

  autoResizeTextarea() {
    const textarea = this.inputField;
    textarea.style.height = 'auto';
    const scrollHeight = Math.min(textarea.scrollHeight, 120); // Max 5 lines
    textarea.style.height = scrollHeight + 'px';
  }

  initializeVoiceRecognition() {
    // Check for speech recognition support
    this.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!this.SpeechRecognition) {
      console.warn('💬 Speech recognition not supported');
      this.voiceButton.disabled = true;
      this.voiceButton.title = 'Voice input not supported in this browser';
      return;
    }

    this.voiceRecognition = new this.SpeechRecognition();
    this.voiceRecognition.continuous = false; // Single command mode for chat
    this.voiceRecognition.interimResults = true;
    this.voiceRecognition.lang = 'en-US';

    this.voiceRecognition.onstart = () => {
      console.log('🎤 Voice recognition started');
      this.isListening = true;
      this.voiceButton.classList.add('listening');
      this.voiceButton.title = 'Listening... Click to stop';
      
      // Update Emma orb state
      if (this.webglOrb && this.webglOrb.options) {
        this.webglOrb.options.forceHoverState = true;
        this.webglOrb.options.hue = 220; // Blue tint while listening
      }
    };

    this.voiceRecognition.onresult = (event) => {
      let transcript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }

      if (transcript.trim()) {
        // Add the transcribed text to the input field
        const currentText = this.inputField.value;
        const newText = currentText ? currentText + ' ' + transcript.trim() : transcript.trim();
        this.inputField.value = newText;
        this.autoResizeTextarea();
        this.handleInputChange();
        
        // Focus the input field for potential editing
        this.inputField.focus();
        this.inputField.setSelectionRange(newText.length, newText.length);
      }
    };

    this.voiceRecognition.onerror = (event) => {
      console.error('💬 Voice recognition error:', event.error);
      this.stopVoiceInput();
      
      if (event.error === 'not-allowed') {
        this.showToast('Microphone access denied. Please allow microphone permissions.', 'error');
      } else if (event.error === 'no-speech') {
        this.showToast('No speech detected. Please try again.', 'warning');
      } else {
        this.showToast('Voice recognition error. Please try again.', 'error');
      }
    };

    this.voiceRecognition.onend = () => {
      console.log('🎤 Voice recognition ended');
      this.stopVoiceInput();
    };

    this.isListening = false;
  }

  toggleVoiceInput() {
    if (!this.SpeechRecognition) {
      this.showToast('Voice input not supported in this browser', 'error');
      return;
    }

    if (this.isListening) {
      this.stopVoiceInput();
    } else {
      this.startVoiceInput();
    }
  }

  startVoiceInput() {
    if (!this.voiceRecognition || this.isListening) return;

    try {
      this.voiceRecognition.start();
    } catch (error) {
      console.error('💬 Error starting voice recognition:', error);
      this.showToast('Failed to start voice input. Please try again.', 'error');
    }
  }

  stopVoiceInput() {
    if (!this.voiceRecognition || !this.isListening) return;

    try {
      this.voiceRecognition.stop();
    } catch (error) {
      console.warn('💬 Error stopping voice recognition:', error);
    }

    this.isListening = false;
    this.voiceButton.classList.remove('listening');
    this.voiceButton.title = 'Voice to text';
    
    // Reset Emma orb state
    if (this.webglOrb && this.webglOrb.options) {
      this.webglOrb.options.forceHoverState = false;
      this.webglOrb.options.hue = 270; // Back to purple
    }
  }

  showToast(message, type = 'info') {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      background: ${type === 'error' ? 'rgba(244, 67, 54, 0.9)' : type === 'warning' ? 'rgba(255, 152, 0, 0.9)' : 'rgba(76, 175, 80, 0.9)'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      animation: slideInRight 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, 3000);
  }

  async sendMessage() {
    const message = this.inputField.value.trim();
    if (!message) return;

    // Add user message
    const messageId = this.addMessage(message, 'user');
    this.inputField.value = '';
    this.autoResizeTextarea();
    this.handleInputChange();

    // 💝 Check for memory detection
    if (this.intelligentCapture) {
      console.log('💝 TESTING: About to analyze message for memory:', message);
      this.analyzeForMemory(message, messageId);
    } else {
      console.log('💝 TESTING: No intelligent capture available for memory analysis');
    }

    // Show typing indicator
    this.showTypingIndicator();

    // Simulate Emma thinking and respond
    setTimeout(() => {
      this.respondAsEmma(message);
    }, 1000 + Math.random() * 1500); // 1-2.5s realistic delay
  }

  addMessage(content, sender, options = {}) {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.id = messageId;
    
    const messageTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (sender === 'emma') {
      messageDiv.innerHTML = `
        <div class="message-avatar">
          <div class="emma-avatar-mini"></div>
        </div>
        <div class="message-content">
          <div class="message-text">${this.formatMessageContent(content)}</div>
          <div class="message-time">${messageTime}</div>
        </div>
      `;
    } else {
      messageDiv.innerHTML = `
        <div class="message-content">
          <div class="message-text">${this.formatMessageContent(content)}</div>
          <div class="message-time">${messageTime}</div>
        </div>
      `;
    }

    // Animate message in
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(10px)';
    this.messageContainer.appendChild(messageDiv);

    // Trigger animation
    requestAnimationFrame(() => {
      messageDiv.style.transition = 'all 0.3s ease';
      messageDiv.style.opacity = '1';
      messageDiv.style.transform = 'translateY(0)';
    });

    // Store message
    this.messages.push({
      id: messageId,
      content,
      sender,
      timestamp: Date.now(),
      ...options
    });

    // Auto-scroll to bottom
    this.scrollToBottom();
    
    return messageId;
  }

  formatMessageContent(content) {
    // Basic formatting for Emma's responses
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/\n/g, '<br>'); // Line breaks
  }

  scrollToBottom() {
    const messagesArea = document.getElementById('chat-messages-area');
    if (messagesArea) {
      messagesArea.scrollTop = messagesArea.scrollHeight;
    }
  }

  showTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.style.display = 'flex';
      this.isTyping = true;
      
      // Emma orb thinking state
      if (this.webglOrb && this.webglOrb.options) {
        this.webglOrb.options.forceHoverState = true;
        this.webglOrb.options.hue = 240; // Slight blue tint while thinking
      }
    }
  }

  hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.style.display = 'none';
      this.isTyping = false;
      
      // Reset Emma orb
      if (this.webglOrb && this.webglOrb.options) {
        this.webglOrb.options.forceHoverState = false;
        this.webglOrb.options.hue = 270; // Back to purple
      }
    }
  }

  async respondAsEmma(userMessage) {
    this.hideTypingIndicator();
    
    // 🧠 Use Vectorless AI if available, otherwise fallback to basic responses
    if (this.isVectorlessEnabled && this.vectorlessEngine) {
      try {
        const result = await this.vectorlessEngine.processQuestion(userMessage);
        
        if (result.success) {
          // Add Emma's intelligent response with memory citations
          this.addVectorlessMessage(result.response, result.memories, result.citations, result.suggestions);
          return;
        } else {
          console.warn('💬 Vectorless processing failed, using fallback:', result.error);
        }
      } catch (error) {
        console.error('💬 Vectorless AI error:', error);
      }
    }
    
    // Fallback to basic response generation
    const response = await this.generateEmmaResponse(userMessage);
    this.addMessage(response, 'emma');
  }

  async generateEmmaResponse(userMessage) {
    // This is where we'd integrate with actual Emma AI/memory context
    // For now, providing contextual responses based on keywords
    
    const lowerMessage = userMessage.toLowerCase();
    
    // Memory-related responses
    if (lowerMessage.includes('memory') || lowerMessage.includes('remember') || lowerMessage.includes('recall')) {
      return "I'd love to help you explore your memories! I can see you have some beautiful moments captured. Would you like me to help you organize them or find something specific?";
    }
    
    if (lowerMessage.includes('photo') || lowerMessage.includes('picture') || lowerMessage.includes('image')) {
      return "Photos hold such precious memories! I can help you add context to your images, organize them by people or events, or even suggest new ways to capture moments. What would you like to do?";
    }
    
    if (lowerMessage.includes('family') || lowerMessage.includes('relative') || lowerMessage.includes('loved one')) {
      return "Family connections are so important. I can help you create memory capsules about family members, organize photos by people, or set up sharing with family members. How can I assist with your family memories?";
    }
    
    if (lowerMessage.includes('help') || lowerMessage.includes('how') || lowerMessage.includes('what can')) {
      return "I'm here to be your memory companion! I can help you **capture new memories** through voice or photos, **organize your existing memories**, **find specific moments**, and **share memories with loved ones**. What interests you most?";
    }
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return "Hello! I'm so glad you're here. I'm Emma, your memory companion. I notice you have some wonderful memories already - would you like to explore them or capture something new today?";
    }
    
    // Default thoughtful response
    const responses = [
      "That's interesting! How does that relate to your memories or experiences?",
      "I'm here to help with your memories and moments. Can you tell me more about what you're thinking?",
      "I'd love to understand better. Are you thinking about capturing a new memory or exploring existing ones?",
      "Let me help you with that. What kind of memory or experience would you like to work with?"
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  startWithWelcomeMessage() {
    setTimeout(() => {
      const welcomeMessages = [
        "Hi there! I'm Emma, your memory companion. What's on your mind today?",
        "Hello! I'm Emma. I'm here to help you with your memories and moments. How can I assist you?",
        "Welcome! I'm Emma, and I love helping people with their precious memories. What would you like to explore?"
      ];
      
      const welcomeMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
      this.addMessage(welcomeMessage, 'emma');
    }, 500);
  }

  loadChatHistory() {
    // Load previous chat messages from session storage
    try {
      const stored = sessionStorage.getItem(`emma-chat-${this.sessionId}`);
      if (stored) {
        this.messages = JSON.parse(stored);
        this.renderStoredMessages();
      }
    } catch (error) {
      console.warn('💬 Could not load chat history:', error);
    }
  }

  renderStoredMessages() {
    this.messages.forEach(msg => {
      this.addMessage(msg.content, msg.sender, { skipStore: true });
    });
  }

  saveChatHistory() {
    try {
      sessionStorage.setItem(`emma-chat-${this.sessionId}`, JSON.stringify(this.messages));
    } catch (error) {
      console.warn('💬 Could not save chat history:', error);
    }
  }

  generateSessionId() {
    return `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  enableFocusMode() {
    document.body.classList.add('chat-focus');
  }

  disableFocusMode() {
    document.body.classList.remove('chat-focus');
  }

  // 🧠 VECTORLESS AI INTEGRATION METHODS

  /**
   * Initialize the Vectorless AI Engine with vault data
   */
  async initializeVectorlessEngine() {
    try {
      // Load saved settings
      this.loadVectorlessSettings();
      
      // Check if EmmaVectorlessEngine is available
      if (typeof EmmaVectorlessEngine === 'undefined') {
        if (this.debugMode) {
          console.warn('💬 EmmaVectorlessEngine not available, loading...');
        }
        await this.loadVectorlessEngine();
      }
      
      // Initialize the engine
      this.vectorlessEngine = new EmmaVectorlessEngine({
        apiKey: this.apiKey,
        dementiaMode: this.dementiaMode || false,
        debug: this.debugMode || false
      });
      
      // Try to load vault data (non-blocking)
      await this.loadVaultForVectorless();
      
      this.updateVectorlessStatus();
      
      if (this.debugMode) {
        console.log('🧠 Vectorless AI Engine initialized successfully');
      }
      
    } catch (error) {
      if (this.debugMode) {
        console.error('🧠 Failed to initialize Vectorless AI:', error);
      }
      this.isVectorlessEnabled = false;
      this.updateVectorlessStatus('Heuristics mode - ' + (error.message || 'No vault'));
    }
  }

  /**
   * Load the vectorless engine script if not available
   */
  async loadVectorlessEngine() {
    return new Promise((resolve, reject) => {
      if (typeof EmmaVectorlessEngine !== 'undefined') {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = '../js/emma-vectorless-engine.js';
      script.onload = () => {
        console.log('🧠 Vectorless engine script loaded');
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load vectorless engine script'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Load vault data for vectorless processing
   */
  async loadVaultForVectorless() {
    try {
      // Try to get vault data from extension or web vault
      let vaultData = null;
      
      // Check if we have web vault available
      if (window.emmaWebVault && window.emmaWebVault.extensionAvailable && window.emmaWebVault.isOpen) {
        // Request vault data for vectorless processing
        vaultData = await this.requestVaultDataFromExtension();
      }
      
      if (vaultData && this.vectorlessEngine) {
        const result = await this.vectorlessEngine.loadVault(vaultData);
        if (result.success) {
          this.isVectorlessEnabled = true;
          console.log('🧠 Vault loaded into vectorless engine:', result);
          return result;
        } else {
          throw new Error(result.error || 'Failed to load vault');
        }
      } else {
        if (this.debugMode) {
          console.warn('🧠 No vault data available for vectorless processing - will use heuristics only');
        }
        this.isVectorlessEnabled = false;
      }
    } catch (error) {
      if (this.debugMode) {
        console.error('🧠 Failed to load vault for vectorless:', error);
      }
      this.isVectorlessEnabled = false;
      // Don't throw error - just disable vectorless features
    }
  }

  /**
   * Request vault data from extension for vectorless processing
   */
  async requestVaultDataFromExtension() {
    return new Promise((resolve) => {
      const messageHandler = (event) => {
        if (event.data?.channel === 'emma-vault-bridge' && event.data?.type === 'VAULT_DATA_FOR_VECTORLESS') {
          console.log('🧠 Received vault data for vectorless processing');
          window.removeEventListener('message', messageHandler);
          resolve(event.data.data);
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Request vault data from extension
      window.postMessage({
        channel: 'emma-vault-bridge',
        type: 'REQUEST_VAULT_DATA_FOR_VECTORLESS'
      }, window.location.origin);
      
      // Timeout fallback
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        resolve(null);
      }, 5000);
    });
  }

  /**
   * Add vectorless message with memory citations and suggestions
   */
  addVectorlessMessage(content, memories, citations, suggestions) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message emma-message vectorless-message';
    
    const messageTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let citationsHtml = '';
    if (citations && citations.length > 0) {
      citationsHtml = `
        <div class="message-citations">
          <h5>📚 Referenced Memories:</h5>
          ${citations.map(c => `
            <div class="citation-item">
              <span class="citation-title">${c.title}</span>
              ${c.relevance ? `<span class="citation-relevance">${c.relevance}/10</span>` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }
    
    let suggestionsHtml = '';
    if (suggestions && suggestions.length > 0) {
      suggestionsHtml = `
        <div class="message-suggestions">
          <div class="suggestions-label">💡 Try asking:</div>
          <div class="suggestion-buttons">
            ${suggestions.map(s => `
              <button class="suggestion-button" onclick="document.getElementById('chat-input').value='${s}'; document.getElementById('chat-input').focus();">
                ${s}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    messageDiv.innerHTML = `
      <div class="message-avatar">
        <div class="emma-avatar-mini vectorless-avatar"></div>
      </div>
      <div class="message-content">
        <div class="message-text">${this.formatMessageContent(content)}</div>
        ${citationsHtml}
        ${suggestionsHtml}
        <div class="message-time">
          ${messageTime} 
          <span class="vectorless-badge">🧠 Vectorless AI</span>
        </div>
      </div>
    `;

    // Animate message in
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(10px)';
    this.messageContainer.appendChild(messageDiv);

    // Trigger animation
    requestAnimationFrame(() => {
      messageDiv.style.transition = 'all 0.3s ease';
      messageDiv.style.opacity = '1';
      messageDiv.style.transform = 'translateY(0)';
    });

    // Store message
    this.messages.push({
      content,
      sender: 'emma',
      timestamp: Date.now(),
      vectorless: true,
      citations,
      suggestions
    });

    // Auto-scroll to bottom
    this.scrollToBottom();
  }

  /**
   * Setup settings modal event handlers
   */
  setupSettingsModal() {
    const modal = document.getElementById('vectorless-settings-modal');
    const backdrop = document.getElementById('modal-backdrop');
    const closeButton = document.getElementById('modal-close-button');
    const saveButton = document.getElementById('save-settings-button');
    const resetButton = document.getElementById('reset-settings-button');
    
    if (!modal || !backdrop || !closeButton || !saveButton || !resetButton) {
      console.error('💬 Settings modal elements not found');
      return;
    }

    // Close modal handlers
    backdrop.addEventListener('click', () => this.closeVectorlessSettings());
    closeButton.addEventListener('click', () => this.closeVectorlessSettings());
    
    // Settings handlers
    saveButton.addEventListener('click', () => this.saveVectorlessSettings());
    resetButton.addEventListener('click', () => this.resetVectorlessSettings());
    
    // Load current settings into modal
    this.loadSettingsIntoModal();
  }

  /**
   * Open vectorless settings modal
   */
  openVectorlessSettings() {
    const modal = document.getElementById('vectorless-settings-modal');
    if (modal) {
      this.loadSettingsIntoModal();
      modal.style.display = 'flex';
    }
  }

  /**
   * Close vectorless settings modal
   */
  closeVectorlessSettings() {
    const modal = document.getElementById('vectorless-settings-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * Load current settings into modal
   */
  loadSettingsIntoModal() {
    const apiKeyInput = document.getElementById('api-key-input');
    const dementiaToggle = document.getElementById('dementia-mode-toggle');
    const debugToggle = document.getElementById('debug-mode-toggle');
    
    if (apiKeyInput) apiKeyInput.value = this.apiKey || '';
    if (dementiaToggle) dementiaToggle.checked = this.dementiaMode || false;
    if (debugToggle) debugToggle.checked = this.debugMode || false;
  }

  /**
   * Save vectorless settings
   */
  async saveVectorlessSettings() {
    const apiKeyInput = document.getElementById('api-key-input');
    const dementiaToggle = document.getElementById('dementia-mode-toggle');
    const debugToggle = document.getElementById('debug-mode-toggle');
    
    // Get values from modal
    const newApiKey = apiKeyInput?.value.trim() || null;
    const newDementiaMode = dementiaToggle?.checked || false;
    const newDebugMode = debugToggle?.checked || false;
    
    // Update settings
    this.apiKey = newApiKey;
    this.dementiaMode = newDementiaMode;
    this.debugMode = newDebugMode;
    
    // Save to localStorage
    const settings = {
      apiKey: this.apiKey,
      dementiaMode: this.dementiaMode,
      debugMode: this.debugMode
    };
    
    try {
      localStorage.setItem('emma-vectorless-settings', JSON.stringify(settings));
      
      // Reinitialize vectorless engine with new settings
      if (this.vectorlessEngine) {
        this.vectorlessEngine.options.apiKey = this.apiKey;
        this.vectorlessEngine.options.dementiaMode = this.dementiaMode;
        this.vectorlessEngine.options.debug = this.debugMode;
      }
      
      this.updateVectorlessStatus();
      this.closeVectorlessSettings();
      
      // Show success message
      this.addMessage('⚙️ Settings saved successfully! Vectorless AI updated with new configuration.', 'emma');
      
    } catch (error) {
      console.error('💬 Failed to save settings:', error);
      this.addMessage('❌ Failed to save settings. Please try again.', 'emma');
    }
  }

  /**
   * Reset vectorless settings to defaults
   */
  resetVectorlessSettings() {
    this.apiKey = null;
    this.dementiaMode = false;
    this.debugMode = false;
    
    // Clear localStorage
    localStorage.removeItem('emma-vectorless-settings');
    
    // Update modal
    this.loadSettingsIntoModal();
    
    // Reinitialize engine
    if (this.vectorlessEngine) {
      this.vectorlessEngine.options.apiKey = null;
      this.vectorlessEngine.options.dementiaMode = false;
      this.vectorlessEngine.options.debug = false;
    }
    
    this.updateVectorlessStatus();
    this.addMessage('🔄 Settings reset to defaults. Vectorless AI will use intelligent heuristics.', 'emma');
  }

  /**
   * Load vectorless settings from localStorage
   */
  loadVectorlessSettings() {
    try {
      const stored = localStorage.getItem('emma-vectorless-settings');
      if (stored) {
        const settings = JSON.parse(stored);
        this.apiKey = settings.apiKey || null;
        this.dementiaMode = settings.dementiaMode || false;
        this.debugMode = settings.debugMode || false;
      }
    } catch (error) {
      console.warn('💬 Could not load vectorless settings:', error);
    }
  }

  /**
   * Update vectorless status indicator
   */
  updateVectorlessStatus(customMessage = null) {
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    
    if (!statusIndicator || !statusText) return;
    
    if (customMessage) {
      statusIndicator.textContent = '🔴';
      statusText.textContent = customMessage;
      return;
    }
    
    if (this.isVectorlessEnabled) {
      statusIndicator.textContent = '🟢';
      const mode = this.apiKey ? 'OpenAI API' : 'Heuristics';
      const extras = [];
      if (this.dementiaMode) extras.push('Dementia Mode');
      if (this.debugMode) extras.push('Debug Mode');
      
      statusText.textContent = `Active (${mode})${extras.length ? ' • ' + extras.join(', ') : ''}`;
    } else {
      statusIndicator.textContent = '🟡';
      statusText.textContent = 'No vault loaded - basic responses only';
    }
  }

  // 💝 INTELLIGENT MEMORY CAPTURE METHODS

  /**
   * Initialize intelligent memory capture
   */
  async initializeIntelligentCapture() {
    try {
      console.log('🚨 AUDIT: Checking EmmaIntelligentCapture availability:', typeof EmmaIntelligentCapture);
      
      // Check if EmmaIntelligentCapture is available
      if (typeof EmmaIntelligentCapture === 'undefined') {
        console.log('🚨 AUDIT: EmmaIntelligentCapture not available, loading script...');
        await this.loadIntelligentCaptureScript();
        
        // Wait for script to fully initialize
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('🚨 AUDIT: After script loading, EmmaIntelligentCapture type:', typeof EmmaIntelligentCapture);
      }
      
      // Double-check that the class is now available
      if (typeof EmmaIntelligentCapture === 'undefined') {
        console.error('🚨 AUDIT: EmmaIntelligentCapture still not available after loading - CRITICAL FAILURE');
        this.intelligentCapture = null;
        return;
      }
      
      console.log('🚨 AUDIT: About to create EmmaIntelligentCapture instance');
      
      // Initialize capture engine (works with or without vectorless)
      this.intelligentCapture = new EmmaIntelligentCapture({
        vectorlessEngine: this.vectorlessEngine || null,
        vaultManager: window.emmaWebVault || null,
        dementiaMode: this.dementiaMode || false,
        debug: true // Force debug for audit
      });
      
      console.log('🚨 AUDIT: EmmaIntelligentCapture created successfully:', !!this.intelligentCapture);
      
      const mode = this.vectorlessEngine ? 'with vectorless engine' : 'with heuristics only';
      console.log(`💝 Intelligent Memory Capture initialized ${mode}`);
      
    } catch (error) {
      console.error('🚨 AUDIT: CRITICAL - Failed to initialize Intelligent Capture:', error);
      console.error('🚨 AUDIT: Error stack:', error.stack);
      // Gracefully disable intelligent capture
      this.intelligentCapture = null;
    }
  }

  /**
   * Load intelligent capture script
   */
  async loadIntelligentCaptureScript() {
    return new Promise((resolve, reject) => {
      if (typeof EmmaIntelligentCapture !== 'undefined') {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = '../js/emma-intelligent-capture.js';
      script.onload = () => {
        console.log('💝 Intelligent capture script loaded');
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load intelligent capture script'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Analyze message for memory potential
   */
  async analyzeForMemory(message, messageId) {
    if (!this.intelligentCapture) {
      if (this.debugMode) {
        console.log('💝 No intelligent capture available - skipping memory analysis');
      }
      return;
    }
    
    try {
      if (this.debugMode) {
        console.log('💝 Analyzing message for memory potential:', message);
      }
      
      const analysis = await this.intelligentCapture.analyzeMessage({
        content: message,
        timestamp: Date.now(),
        sender: 'user'
      });
      
      if (this.debugMode) {
        console.log('💝 Memory analysis result:', analysis);
      }
      
      if (analysis.isMemoryWorthy) {
        // Store detected memory
        this.detectedMemories.set(messageId, analysis);
        
        // Show memory detection indicator
        this.showMemoryDetectionIndicator(messageId, analysis);
        
        // Auto-suggest capture for high-value memories
        if (analysis.autoCapture) {
          setTimeout(() => {
            this.suggestMemoryCapture(analysis);
          }, 2000);
        }
        
        if (this.debugMode) {
          console.log(`💝 Memory detected! Score: ${analysis.signals?.score}, Confidence: ${analysis.confidence}%`);
        }
      } else {
        if (this.debugMode) {
          console.log(`💝 Not memory-worthy. Score: ${analysis.signals?.score}, Reason: ${analysis.reason}`);
        }
      }
      
    } catch (error) {
      if (this.debugMode) {
        console.error('💝 Memory analysis failed:', error);
      }
    }
  }

  /**
   * Show memory detection indicator on message
   */
  showMemoryDetectionIndicator(messageId, analysis) {
    const messageEl = document.getElementById(messageId);
    if (!messageEl) return;
    
    const indicator = document.createElement('div');
    indicator.className = 'memory-detection-indicator';
    indicator.innerHTML = `
      <div class="detection-content">
        <span class="pulse-dot"></span>
        <span class="detection-text">Emma detected a memory</span>
        <span class="confidence">${analysis.confidence}% confident</span>
        <button class="save-memory-btn" onclick="window.chatExperience.saveMemoryFromChat('${messageId}')">
          💾 Save as Memory
        </button>
      </div>
    `;
    
    // Add animation
    indicator.style.opacity = '0';
    indicator.style.transform = 'translateY(-10px)';
    
    messageEl.querySelector('.message-content').appendChild(indicator);
    
    // Animate in
    requestAnimationFrame(() => {
      indicator.style.transition = 'all 0.3s ease';
      indicator.style.opacity = '1';
      indicator.style.transform = 'translateY(0)';
    });
  }

  /**
   * Suggest memory capture to user
   */
  suggestMemoryCapture(analysis) {
    const suggestion = `I noticed you shared something special! ${analysis.memory.title || 'This moment'} seems worth preserving. Would you like me to help you save this as a memory?`;
    
    const suggestionId = this.addMessage(suggestion, 'emma', { type: 'memory-suggestion' });
    
    // Add action buttons
    const messageEl = document.getElementById(suggestionId);
    if (messageEl) {
      const actions = document.createElement('div');
      actions.className = 'memory-suggestion-actions';
      actions.innerHTML = `
        <button class="suggestion-action primary" onclick="window.chatExperience.startMemoryCapture('${analysis.memory.id}')">
          💝 Yes, let's save this memory
        </button>
        <button class="suggestion-action secondary" onclick="window.chatExperience.dismissMemorySuggestion('${suggestionId}')">
          Maybe later
        </button>
      `;
      
      messageEl.querySelector('.message-content').appendChild(actions);
    }
  }

  /**
   * Save memory from chat message
   */
  async saveMemoryFromChat(messageId) {
    const analysis = this.detectedMemories.get(messageId);
    if (!analysis) {
      this.addMessage("I couldn't find the memory details. Let me help you capture it fresh!", 'emma');
      return;
    }
    
    // Show memory preview dialog
    this.showMemoryPreviewDialog(analysis.memory);
  }

  /**
   * Start memory capture conversation
   */
  async startMemoryCapture(memoryId) {
    // Find the memory analysis
    let analysis = null;
    for (const [msgId, a] of this.detectedMemories) {
      if (a.memory && a.memory.id === memoryId) {
        analysis = a;
        break;
      }
    }
    
    if (!analysis) {
      this.addMessage("Let's start fresh! Tell me about the memory you'd like to capture.", 'emma');
      return;
    }
    
    // Start capture session
    this.activeCapture = await this.intelligentCapture.startCaptureSession({
      content: analysis.memory.originalContent,
      timestamp: Date.now()
    });
    
    if (this.activeCapture.success && this.activeCapture.nextPrompt) {
      this.addMessage(this.activeCapture.nextPrompt.text, 'emma', { type: 'memory-prompt' });
    }
  }

  /**
   * Show memory preview dialog
   */
  showMemoryPreviewDialog(memory) {
    const dialog = document.createElement('div');
    dialog.className = 'memory-preview-dialog';
    dialog.innerHTML = `
      <div class="dialog-backdrop"></div>
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>💝 Memory Preview</h3>
          <button class="dialog-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="dialog-body">
          <div class="memory-preview">
            <h4>${memory.title}</h4>
            <p>${memory.content}</p>
            <div class="memory-metadata">
              ${memory.metadata.people.length > 0 ? `<span class="meta-item">👥 ${memory.metadata.people.join(', ')}</span>` : ''}
              ${memory.metadata.emotions.length > 0 ? `<span class="meta-item">💭 ${memory.metadata.emotions.join(', ')}</span>` : ''}
              <span class="meta-item">📅 ${new Date(memory.metadata.date).toLocaleDateString()}</span>
              <span class="meta-item">⭐ ${memory.metadata.importance} importance</span>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="button-secondary" onclick="window.chatExperience.editMemory('${memory.id}')">
            ✏️ Edit Details
          </button>
          <button class="button-primary" onclick="window.chatExperience.confirmSaveMemory('${memory.id}')">
            💾 Save to Vault
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Animate in
    requestAnimationFrame(() => {
      dialog.classList.add('show');
    });
  }

  /**
   * Confirm and save memory
   */
  async confirmSaveMemory(memoryId) {
    // Find memory in detected memories
    let memory = null;
    for (const [msgId, analysis] of this.detectedMemories) {
      if (analysis.memory && analysis.memory.id === memoryId) {
        memory = analysis.memory;
        break;
      }
    }
    
    if (!memory) {
      this.addMessage("I couldn't find that memory. Let me help you create a new one!", 'emma');
      return;
    }
    
    // Save to vault
    const result = await this.intelligentCapture.saveMemory(memory);
    
    // Remove dialog
    document.querySelector('.memory-preview-dialog')?.remove();
    
    if (result.success) {
      this.addMessage(`✨ Beautiful! I've saved "${memory.title}" to your memory vault. This special moment is now preserved forever.`, 'emma', { type: 'success' });
      
      // Clear from detected memories
      this.detectedMemories.clear();
    } else {
      this.addMessage(`I had trouble saving the memory. ${result.error || 'Please try again.'}`, 'emma', { type: 'error' });
    }
  }

  /**
   * Dismiss memory suggestion
   */
  dismissMemorySuggestion(messageId) {
    const messageEl = document.getElementById(messageId);
    if (messageEl) {
      const actions = messageEl.querySelector('.memory-suggestion-actions');
      if (actions) {
        actions.style.opacity = '0';
        setTimeout(() => actions.remove(), 300);
      }
    }
  }

  /**
   * Handle memory capture continuation
   */
  async handleCaptureResponse(response) {
    if (!this.activeCapture || !this.intelligentCapture) return;
    
    const result = await this.intelligentCapture.continueCapture(response);
    
    if (result.continue && result.nextPrompt) {
      this.addMessage(result.nextPrompt.text, 'emma', { type: 'memory-prompt' });
    } else if (result.complete) {
      // Show final memory preview
      this.showMemoryPreviewDialog(result.memory);
      this.activeCapture = null;
    }
  }

  cleanup() {
    // Save chat history before closing
    this.saveChatHistory();
    
    // Stop voice recognition if active
    if (this.isListening) {
      this.stopVoiceInput();
    }
    
    // Remove keyboard shortcuts listener
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler, true);
      this.keyboardHandler = null;
    }
    
    // Clean up WebGL orb
    if (this.webglOrb && this.webglOrb.dispose) {
      this.webglOrb.dispose();
      this.webglOrb = null;
    }
    
    // Clean up vectorless engine
    if (this.vectorlessEngine) {
      this.vectorlessEngine = null;
    }
    
    // Clean up intelligent capture
    if (this.intelligentCapture) {
      this.intelligentCapture = null;
    }
    
    // Clear detected memories
    this.detectedMemories.clear();
    
    // Disable focus mode
    this.disableFocusMode();
    
    super.cleanup();
  }
}

// Export for use in other modules
window.EmmaChatExperience = EmmaChatExperience;
console.log('💬 Emma Chat Experience: Module loaded successfully');
