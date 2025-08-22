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
    this.enrichmentState = new Map(); // Track enrichment conversations
    this.debugMode = true; // Enable debug mode to see scoring
    
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
    
    // Add initial Emma welcome message (single clean bubble)
    this.addInitialWelcomeMessage();
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
    // CLEAN REDESIGN: Remove inner container, direct modal content
    contentElement.style.cssText = `
      background: linear-gradient(145deg, rgba(139, 92, 246, 0.15), rgba(240, 147, 251, 0.10));
      border: 2px solid rgba(139, 92, 246, 0.3);
      border-radius: 24px;
      padding: 32px;
      backdrop-filter: blur(20px);
      box-shadow: 0 24px 80px rgba(139, 92, 246, 0.4);
      display: flex;
      flex-direction: column;
      gap: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: white;
      position: relative;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    `;
    
    contentElement.innerHTML = `
      <!-- Close Button Only -->
      <button class="chat-close-btn" id="chat-close-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <!-- Chat Messages -->
      <div class="emma-chat-messages" id="chat-messages">
        <!-- Messages will be added dynamically -->
      </div>

      <!-- Chat Input -->
      <div class="emma-chat-input">
        <div class="input-wrapper">
          <button class="voice-btn" id="voice-input-btn" title="Voice input">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>
          <textarea 
            id="chat-input" 
            class="chat-textarea" 
            placeholder="Ask Emma about your memories..."
            rows="1"
            maxlength="2000"
          ></textarea>
          <button class="settings-btn" id="chat-settings-btn" title="Chat settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="m12 1 1.09 3.26L16 5.64l-1.64 3.36L17 12l-2.64 2.64L16 18.36l-3.26-1.09L12 23l-1.09-3.26L8 18.36l1.64-3.36L7 12l2.64-2.64L8 5.64l3.26 1.09z"/>
            </svg>
          </button>
          <button class="send-btn" id="send-btn" title="Send message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
        <div class="input-hints">
          <span>Press Enter to send • Click mic for voice • Shift+Enter for new line</span>
        </div>
      </div>

      <!-- Typing Indicator -->
      <div class="emma-typing" id="typing-indicator" style="display: none;">
        <div class="typing-dots">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
        <span>Emma is thinking...</span>
      </div>

      <!-- Emma Chat Settings Modal -->
      <div class="emma-settings-modal" id="chat-settings-modal" style="display: none;">
        <div class="settings-content">
          <div class="settings-header">
            <h3 class="settings-title">🧠 Emma Chat Settings</h3>
            <button class="chat-close-btn" id="settings-close-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          <div class="settings-section">
            <h4>🔑 OpenAI API Configuration</h4>
            <p class="settings-description">
              Enable advanced AI responses by providing your OpenAI API key. 
              Emma will use intelligent heuristics if no key is provided.
            </p>
            <input 
              type="password" 
              id="api-key-input" 
              class="settings-input"
              placeholder="sk-..." 
              autocomplete="off"
            >
            <small class="input-help">Your API key is stored locally and never transmitted to our servers</small>
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
                <input type="checkbox" id="debug-mode-toggle" checked>
                <span class="toggle-slider"></span>
              </label>
              <span class="toggle-label">Enable Debug Mode</span>
            </div>
          </div>
          
          <div class="settings-section">
            <h4>🧠 Vectorless AI Status</h4>
            <div class="vectorless-status" id="vectorless-status">
              <div class="status-indicator" id="status-indicator">⚪</div>
              <span id="status-text">Initializing...</span>
            </div>
          </div>
          
          <div class="settings-footer">
            <button class="settings-btn-secondary" id="reset-settings-btn">Reset to Defaults</button>
            <button class="settings-btn-primary" id="save-settings-btn">Save Settings</button>
          </div>
        </div>
      </div>
    `;
  }

  setupChatInterface() {
    this.messageContainer = document.getElementById('chat-messages');
    this.inputField = document.getElementById('chat-input');
    this.sendButton = document.getElementById('send-btn');
    this.closeButton = document.getElementById('chat-close-btn');
    this.voiceButton = document.getElementById('voice-input-btn');
    this.settingsButton = document.getElementById('chat-settings-btn');
    
    if (!this.messageContainer || !this.inputField || !this.sendButton || !this.voiceButton || !this.settingsButton) {
      console.error('💬 Chat interface elements not found');
      return;
    }

    // Setup input handling
    this.inputField.addEventListener('input', () => this.handleInputChange());
    this.inputField.addEventListener('keydown', (e) => this.handleInputKeydown(e));
    this.sendButton.addEventListener('click', () => this.sendMessage());
    this.voiceButton.addEventListener('click', () => this.toggleVoiceInput());
    this.settingsButton.addEventListener('click', () => this.showChatSettings());
    this.closeButton.addEventListener('click', () => this.close());

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

    // 🎯 ENRICHMENT FSM: Check if this is a response to an enrichment question
    const activeEnrichment = this.findActiveEnrichmentForResponse();
    if (activeEnrichment) {
      await this.processEnrichmentResponse(activeEnrichment, message);
      return;
    }

    // 💝 Check for memory detection (new messages only)
    console.log('🚨 DEBUG: intelligentCapture exists?', !!this.intelligentCapture);
    if (this.intelligentCapture) {
      console.log('💝 TESTING: About to analyze message for memory:', message);
      await this.analyzeForMemory(message, messageId);
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
    messageDiv.className = `${sender}-message`;
    messageDiv.id = messageId;
    
    const messageTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (sender === 'emma') {
      messageDiv.innerHTML = `
        <div class="emma-orb-avatar" id="emma-orb-msg-${messageId}"></div>
        <div class="message-content">
          <p>${this.formatMessageContent(content)}</p>
          <span class="message-time">${messageTime}</span>
        </div>
      `;
    } else {
      messageDiv.innerHTML = `
        <div class="message-bubble">
          <p class="message-text">${this.formatMessageContent(content)}</p>
          <span class="message-time">${messageTime}</span>
        </div>
      `;
    }

    // Animate message in
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(10px)';
    this.messageContainer.appendChild(messageDiv);

    // Initialize Emma orb for Emma messages
    if (sender === 'emma') {
      const orbContainer = document.getElementById(`emma-orb-msg-${messageId}`);
      if (orbContainer && window.EmmaOrb) {
        try {
          new window.EmmaOrb(orbContainer, {
            size: 40,
            interactive: false,
            theme: 'purple'
          });
        } catch (error) {
          console.warn('⚠️ Emma orb fallback for message avatar');
          orbContainer.style.background = 'radial-gradient(circle, rgba(139, 92, 246, 0.8), rgba(240, 147, 251, 0.6))';
        }
      }
    }

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
    
    // 💝 Check if this message has detected memory - if so, focus on capture instead of search
    const hasDetectedMemory = Array.from(this.detectedMemories.values()).some(analysis => 
      analysis.memory && analysis.memory.originalContent && 
      analysis.memory.originalContent.includes(userMessage.substring(0, 50))
    );
    
    if (hasDetectedMemory) {
      // Focus on memory capture, not searching existing memories
      const captureResponse = await this.generateMemoryCaptureResponse(userMessage);
      this.addMessage(captureResponse, 'emma');
      return;
    }
    
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

  async generateMemoryCaptureResponse(userMessage) {
    // Find the detected memory for this message
    let detectedMemory = null;
    for (const [msgId, analysis] of this.detectedMemories) {
      if (analysis.memory && analysis.memory.originalContent && 
          analysis.memory.originalContent.includes(userMessage.substring(0, 50))) {
        detectedMemory = analysis;
        break;
      }
    }
    
    if (!detectedMemory) {
      return "I'd love to help you capture this memory! Tell me more about what happened.";
    }
    
    // Generate intelligent follow-up questions based on what's missing
    const memory = detectedMemory.memory;
    const signals = detectedMemory.signals;
    
    // Determine what information we need
    const needsPeople = !memory.metadata.people || memory.metadata.people.length === 0;
    const needsEmotions = !memory.metadata.emotions || memory.metadata.emotions.length === 0;
    const needsLocation = !memory.metadata.location;
    const needsPhotos = !memory.attachments || memory.attachments.length === 0;
    const needsDetails = memory.content && memory.content.length < 100;
    
    // Generate contextual follow-up questions
    let followUp = "";
    
    if (signals.types.includes('pet') && needsDetails) {
      followUp = "Tell me more about your pet! What's their personality like? How did this moment make you feel?";
    } else if (signals.types.includes('milestone') && needsPeople) {
      followUp = "What an important moment! Who else was there to share this with you?";
    } else if (memory.metadata.people.includes('mom') || memory.metadata.people.includes('dad')) {
      followUp = "Family moments are so precious! What made this time with your parent extra special?";
    } else if (needsEmotions) {
      followUp = "How did this moment make you feel? What emotions do you remember most?";
    } else if (needsLocation) {
      followUp = "Where did this happen? I'd love to include the setting in your memory.";
    } else if (needsDetails) {
      followUp = "Can you paint me a picture of this moment? What details would you want to remember forever?";
    } else {
      followUp = "This sounds like such a meaningful moment! What other details would make this memory complete?";
    }
    
    // Always ask about photos
    const photoPrompt = needsPhotos ? " Do you have any photos from this moment you'd like to add?" : "";
    
    return `I can sense this is really special to you! ${followUp}${photoPrompt}`;
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
      
      // Check if we have web vault available (PURE WEB APP MODE)
      if (window.emmaWebVault && window.emmaWebVault.isOpen) {
        // Get vault data directly from web app (no extension needed)
        vaultData = window.emmaWebVault.vaultData;
        console.log('🧠 CHAT: Got vault data directly from web app:', !!vaultData);
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
   * Add initial Emma welcome message (single clean bubble)
   * DYNAMIC & PERSONAL: Different greetings based on time, vault content, recent activity
   */
  addInitialWelcomeMessage() {
    console.log('💬 Adding Emma welcome message...');
    
    // Get time-based greeting
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    
    // Check vault for personalization
    const hasVault = window.emmaWebVault?.isOpen;
    const memoryCount = window.emmaWebVault?.vaultData?.content?.memories?.length || 0;
    const lastMemory = window.emmaWebVault?.vaultData?.content?.memories?.[memoryCount - 1];
    
    // Create dynamic welcome based on context
    let welcomeMessage;
    
    if (!hasVault) {
      // No vault - focus on getting started
      const greetings = [
        `${timeGreeting}! I'm Emma. I'd love to help you capture and explore your precious memories. Would you like to create your first memory capsule?`,
        `Hi there! I'm Emma, your memory companion. Tell me about a moment that makes you smile - I'd love to help you preserve it.`,
        `${timeGreeting}! I'm Emma. Every memory is a treasure waiting to be discovered. What story would you like to share today?`
      ];
      welcomeMessage = greetings[Math.floor(Math.random() * greetings.length)];
    } else if (memoryCount === 0) {
      // Empty vault - encourage first memory
      welcomeMessage = `${timeGreeting}! I see you've created your vault - that's wonderful! Let's add your first memory. Tell me about something special that happened to you.`;
    } else if (lastMemory && Date.now() - lastMemory.capturedAt < 86400000) {
      // Recent activity - reference it
      const recentPerson = lastMemory.people?.[0];
      welcomeMessage = recentPerson 
        ? `${timeGreeting}! I loved learning about ${recentPerson} in your last memory. What other stories would you like to share?`
        : `${timeGreeting}! Your last memory was beautiful. What else has been on your mind?`;
    } else {
      // Established user - warm, personal
      const topics = [
        `${timeGreeting}! What memories have been floating through your mind today?`,
        `Hello again! I've been thinking about all the wonderful stories you've shared. What would you like to explore today?`,
        `${timeGreeting}! Your vault has ${memoryCount} beautiful memories. Would you like to add another or explore what you've captured?`,
        `Welcome back! Sometimes old memories surface in unexpected ways. Has anything from your past come to mind recently?`
      ];
      welcomeMessage = topics[Math.floor(Math.random() * topics.length)];
    }
    
    this.addMessage(welcomeMessage, 'emma');
    
    // Add a contextual follow-up hint after a brief pause
    if (this.dementiaMode) {
      setTimeout(() => {
        const hints = [
          "Take your time... there's no rush. 💜",
          "I'm here whenever you're ready to share.",
          "Even small moments can hold big meanings."
        ];
        const hint = hints[Math.floor(Math.random() * hints.length)];
        this.addMessage(hint, 'emma', { subtle: true });
      }, 3000);
    }
  }

  /**
   * Show chat settings modal (Emma-branded)
   */
  showChatSettings() {
    console.log('⚙️ Opening Emma chat settings...');
    const modal = document.getElementById('chat-settings-modal');
    if (modal) {
      this.loadSettingsIntoModal();
      modal.style.display = 'flex';
      modal.classList.add('show');
      this.setupSettingsEventListeners();
    }
  }

  /**
   * Setup settings modal event listeners
   */
  setupSettingsEventListeners() {
    // Close button
    const closeBtn = document.getElementById('settings-close-btn');
    if (closeBtn) {
      closeBtn.onclick = () => this.closeChatSettings();
    }
    
    // Save settings button
    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) {
      saveBtn.onclick = () => this.saveSettings();
    }
    
    // Reset settings button
    const resetBtn = document.getElementById('reset-settings-btn');
    if (resetBtn) {
      resetBtn.onclick = () => this.resetSettings();
    }
    
    // Debug mode toggle
    const debugToggle = document.getElementById('debug-mode-toggle');
    if (debugToggle) {
      debugToggle.onchange = (e) => {
        this.debugMode = e.target.checked;
        console.log('🔍 Debug mode:', this.debugMode ? 'enabled' : 'disabled');
      };
    }
    
    // Dementia care mode toggle
    const dementiaToggle = document.getElementById('dementia-mode-toggle');
    if (dementiaToggle) {
      dementiaToggle.onchange = (e) => {
        this.dementiaMode = e.target.checked;
        console.log('🤗 Dementia care mode:', this.dementiaMode ? 'enabled' : 'disabled');
      };
    }
    
    // API key input
    const apiKeyInput = document.getElementById('api-key-input');
    if (apiKeyInput) {
      apiKeyInput.onchange = (e) => {
        this.apiKey = e.target.value;
        if (this.apiKey) {
          this.initializeVectorlessEngine();
        }
      };
    }
    
    // Click outside to close
    const modal = document.getElementById('chat-settings-modal');
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) {
          this.closeChatSettings();
        }
      };
    }
  }

  /**
   * Close chat settings modal
   */
  closeChatSettings() {
    const modal = document.getElementById('chat-settings-modal');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    }
  }

  /**
   * Load current settings into modal
   */
  loadSettingsIntoModal() {
    // Load API key
    const apiKeyInput = document.getElementById('api-key-input');
    if (apiKeyInput) {
      apiKeyInput.value = this.apiKey || localStorage.getItem('emma-openai-api-key') || '';
    }
    
    // Load debug mode
    const debugToggle = document.getElementById('debug-mode-toggle');
    if (debugToggle) {
      debugToggle.checked = this.debugMode;
    }
    
    // Load dementia care mode
    const dementiaToggle = document.getElementById('dementia-mode-toggle');
    if (dementiaToggle) {
      dementiaToggle.checked = this.dementiaMode;
    }
    
    // Update vectorless status
    this.updateVectorlessStatus();
  }

  /**
   * Save settings
   */
  saveSettings() {
    const apiKey = document.getElementById('api-key-input')?.value || '';
    const debugMode = document.getElementById('debug-mode-toggle')?.checked || false;
    const dementiaMode = document.getElementById('dementia-mode-toggle')?.checked || false;
    
    // Save to localStorage
    if (apiKey) {
      localStorage.setItem('emma-openai-api-key', apiKey);
    } else {
      localStorage.removeItem('emma-openai-api-key');
    }
    localStorage.setItem('emma-debug-mode', debugMode);
    localStorage.setItem('emma-dementia-mode', dementiaMode);
    
    // Update instance
    this.apiKey = apiKey;
    this.debugMode = debugMode;
    this.dementiaMode = dementiaMode;
    
    // Reinitialize vectorless engine if API key changed
    if (apiKey) {
      this.initializeVectorlessEngine();
    }
    
    this.showToast('✅ Settings saved successfully!', 'success');
    this.closeChatSettings();
  }

  /**
   * Reset settings to defaults
   */
  resetSettings() {
    if (confirm('🔄 Reset all chat settings to defaults?')) {
      localStorage.removeItem('emma-openai-api-key');
      localStorage.removeItem('emma-debug-mode');
      localStorage.removeItem('emma-dementia-mode');
      
      this.apiKey = null;
      this.debugMode = true;
      this.dementiaMode = false;
      
      this.loadSettingsIntoModal();
      this.showToast('🔄 Settings reset to defaults', 'info');
    }
  }

  /**
   * Update vectorless AI status display
   */
  updateVectorlessStatus() {
    const indicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    
    if (indicator && statusText) {
      if (this.isVectorlessEnabled && this.vectorlessEngine) {
        indicator.textContent = '🟢';
        statusText.textContent = 'Vectorless AI Active';
      } else if (this.apiKey) {
        indicator.textContent = '🟡';
        statusText.textContent = 'API Key Set - Initializing...';
      } else {
        indicator.textContent = '🔴';
        statusText.textContent = 'Heuristics Only (No API Key)';
      }
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    // Create toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? 'rgba(16, 185, 129, 0.9)' : type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(59, 130, 246, 0.9)'};
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      font-weight: 600;
      z-index: 10002;
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.2);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      max-width: 300px;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
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
      console.log('🧠 CHAT: Initializing intelligent capture with vault manager:', {
        hasVaultManager: !!window.emmaWebVault,
        vaultIsOpen: window.emmaWebVault?.isOpen,
        vaultHasData: !!window.emmaWebVault?.vaultData,
        memoryCount: Object.keys(window.emmaWebVault?.vaultData?.content?.memories || {}).length
      });
      
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
        
        // Show memory detection indicator with new confidence
        this.showMemoryDetectionIndicator(messageId, analysis);
        
        if (this.debugMode) {
          console.log(`💝 Memory detected! FinalScore: ${analysis.finalScore?.toFixed(3)}, AutoCapture: ${analysis.autoCapture}, Confidence: ${analysis.confidence}%`);
          console.log(`💝 Components: H=${analysis.components?.heuristicsScore?.toFixed(3)}, L=${analysis.components?.llmScore?.toFixed(3)}, N=${analysis.components?.noveltyPenalty?.toFixed(3)}`);
        }
        
        // NEW FSM LOGIC: Always start enrichment for memory-worthy content
        // Auto-capture (≥0.70) gets quick suggestion + enrichment
        // Regular memory-worthy (0.40-0.69) gets enrichment only
        
        if (analysis.autoCapture) {
          // High-confidence: Show quick capture option + start enrichment
          setTimeout(() => {
            this.suggestMemoryCapture(analysis);
          }, 1500);
          
          setTimeout(() => {
            this.startStructuredEnrichment(analysis, messageId);
          }, 3000);
        } else {
          // Medium-confidence: Start enrichment conversation immediately
          setTimeout(() => {
            this.startStructuredEnrichment(analysis, messageId);
          }, 2000);
        }
        
      } else {
        if (this.debugMode) {
          console.log(`💝 Not memory-worthy. FinalScore: ${analysis.finalScore?.toFixed(3)}, Reason: ${analysis.reason}`);
          console.log(`💝 Components: H=${analysis.components?.heuristicsScore?.toFixed(3)}, L=${analysis.components?.llmScore?.toFixed(3)}, N=${analysis.components?.noveltyPenalty?.toFixed(3)}`);
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
        <span class="confidence">${analysis.confidence}%</span>
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
            <button class="button-secondary" onclick="window.chatExperience.addPhotosToMemory('${memory.id}')">
              📸 Add Photos
            </button>
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
   * Add photos to memory
   */
  async addPhotosToMemory(memoryId) {
    // Create file input for photo selection
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    
    fileInput.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      
      // Find the memory
      let memory = null;
      for (const [msgId, analysis] of this.detectedMemories) {
        if (analysis.memory && analysis.memory.id === memoryId) {
          memory = analysis.memory;
          break;
        }
      }
      
      if (!memory) return;
      
      // Process photos
      for (const file of files) {
        const base64 = await this.fileToBase64(file);
        memory.attachments = memory.attachments || [];
        memory.attachments.push({
          id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: file.type,
          name: file.name,
          size: file.size,
          data: base64
        });
      }
      
      // Update the preview dialog
      document.querySelector('.memory-preview-dialog')?.remove();
      this.showMemoryPreviewDialog(memory);
      
      this.addMessage(`📸 Great! I've added ${files.length} photo${files.length > 1 ? 's' : ''} to your memory. This will make it even more special!`, 'emma');
    };
    
    fileInput.click();
  }

  /**
   * Convert file to base64
   */
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
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
   * Start structured enrichment FSM (who/when/where/what/emotion/media/preview)
   * CTO BEST PRACTICES: One question at a time, dementia-friendly pacing
   */
  async startStructuredEnrichment(analysis, messageId) {
    const memory = analysis.memory;
    const memoryId = memory.id;
    
    if (this.debugMode) {
      console.log('🎯 ENRICHMENT FSM: Starting structured enrichment for memory:', memoryId);
    }
    
    // Initialize enrichment state for this memory
    this.enrichmentState.set(memoryId, {
      messageId,
      memory,
      analysis,
      currentStage: 'who',
      collectedData: {
        people: memory.metadata.people || [],
        when: memory.metadata.date || null,
        where: memory.metadata.location || null,
        emotion: memory.metadata.emotions?.[0] || null,
        details: memory.content || '',
        media: memory.attachments || []
      },
      stagesCompleted: [],
      startTime: Date.now()
    });
    
    // Start with first enrichment question
    this.askNextEnrichmentQuestion(memoryId);
  }

  /**
   * FSM: Ask next enrichment question based on missing data
   * CTO BEST PRACTICES: Short questions, dementia-friendly, one at a time
   */
  askNextEnrichmentQuestion(memoryId) {
    const state = this.enrichmentState.get(memoryId);
    if (!state) return;
    
    const { collectedData, stagesCompleted } = state;
    
    // Determine next question based on missing data (FSM stages)
    let nextStage = null;
    let question = "";
    
    // Stage 1: Who was there?
    if (!stagesCompleted.includes('who') && (!collectedData.people || collectedData.people.length === 0)) {
      nextStage = 'who';
      question = "Who else was there with you during this moment?";
    }
    // Stage 2: When did this happen?
    else if (!stagesCompleted.includes('when') && !collectedData.when) {
      nextStage = 'when';
      question = "When did this happen? Can you remember the time period or your age?";
    }
    // Stage 3: Where were you?
    else if (!stagesCompleted.includes('where') && !collectedData.where) {
      nextStage = 'where';
      question = "Where did this take place? Paint me a picture of the setting.";
    }
    // Stage 4: How did it feel?
    else if (!stagesCompleted.includes('emotion') && !collectedData.emotion) {
      nextStage = 'emotion';
      question = "How did this moment make you feel? What emotions do you remember?";
    }
    // Stage 5: Any photos or media?
    else if (!stagesCompleted.includes('media') && collectedData.media.length === 0) {
      nextStage = 'media';
      question = "Do you have any photos, videos, or other mementos from this time that you'd like to include?";
    }
    // Stage 6: Complete - show preview
    else {
      this.completeEnrichmentAndShowPreview(memoryId);
      return;
    }
    
    // Update state
    state.currentStage = nextStage;
    this.enrichmentState.set(memoryId, state);
    
    // Add dementia-friendly pacing (2-3 second delay)
    const delay = this.dementiaMode ? 2500 : 1500;
    
    setTimeout(() => {
      this.addMessage(question, 'emma', { 
        type: 'enrichment-question',
        memoryId: memoryId,
        stage: nextStage
      });
      
      if (this.debugMode) {
        console.log(`🎯 ENRICHMENT FSM: Asked ${nextStage} question for memory ${memoryId}`);
      }
    }, delay);
  }

  /**
   * Complete enrichment and show preview for final save
   */
  completeEnrichmentAndShowPreview(memoryId) {
    const state = this.enrichmentState.get(memoryId);
    if (!state) return;
    
    // Build final enriched memory
    const enrichedMemory = {
      ...state.memory,
      metadata: {
        ...state.memory.metadata,
        people: state.collectedData.people,
        date: state.collectedData.when || new Date(),
        location: state.collectedData.where,
        emotions: state.collectedData.emotion ? [state.collectedData.emotion] : [],
        importance: this.calculateEnrichedImportance(state.collectedData),
        enrichmentComplete: true
      },
      content: this.buildEnrichedContent(state.collectedData),
      attachments: state.collectedData.media
    };
    
    if (this.debugMode) {
      console.log('🎯 ENRICHMENT FSM: Completed enrichment for memory:', memoryId, enrichedMemory);
    }
    
    // Show preview dialog for final confirmation
    setTimeout(() => {
      this.addMessage("Perfect! I've gathered all the details. Let me show you a preview of your memory capsule.", 'emma');
      
      setTimeout(() => {
        this.showMemoryPreviewDialog(enrichedMemory);
      }, 1500);
    }, this.dementiaMode ? 2000 : 1000);
    
    // Clean up enrichment state
    this.enrichmentState.delete(memoryId);
  }

  /**
   * Calculate importance based on enriched data
   */
  calculateEnrichedImportance(collectedData) {
    let importance = 5; // Base importance
    
    // People involvement increases importance
    if (collectedData.people && collectedData.people.length > 0) {
      importance += Math.min(2, collectedData.people.length);
    }
    
    // Strong emotions increase importance
    if (collectedData.emotion) {
      const strongEmotions = ['amazing', 'wonderful', 'terrible', 'devastating', 'perfect', 'best', 'worst'];
      if (strongEmotions.some(e => collectedData.emotion.toLowerCase().includes(e))) {
        importance += 2;
      } else {
        importance += 1;
      }
    }
    
    // Media presence increases importance
    if (collectedData.media && collectedData.media.length > 0) {
      importance += 1;
    }
    
    // Specific location increases importance
    if (collectedData.where) {
      importance += 1;
    }
    
    return Math.min(10, Math.max(1, importance));
  }

  /**
   * Build enriched content from collected data
   */
  buildEnrichedContent(collectedData) {
    let content = collectedData.details || '';
    
    // Add contextual enrichments
    if (collectedData.when && !content.toLowerCase().includes('when')) {
      content += ` This happened ${collectedData.when}.`;
    }
    
    if (collectedData.where && !content.toLowerCase().includes('where')) {
      content += ` The setting was ${collectedData.where}.`;
    }
    
    if (collectedData.people && collectedData.people.length > 0) {
      const peopleText = collectedData.people.join(', ');
      if (!content.toLowerCase().includes(peopleText.toLowerCase())) {
        content += ` ${collectedData.people.length === 1 ? 'Also there was' : 'Also there were'} ${peopleText}.`;
      }
    }
    
    if (collectedData.emotion && !content.toLowerCase().includes(collectedData.emotion.toLowerCase())) {
      content += ` This moment felt ${collectedData.emotion}.`;
    }
    
    return content.trim();
  }

  /**
   * Find active enrichment session waiting for user response
   */
  findActiveEnrichmentForResponse() {
    // Look for the most recent enrichment state that's waiting for input
    for (const [memoryId, state] of this.enrichmentState) {
      if (state.currentStage && !state.stagesCompleted.includes(state.currentStage)) {
        return { memoryId, state };
      }
    }
    return null;
  }

  /**
   * Process user response to enrichment question
   * CTO BEST PRACTICES: Extract data, update state, ask next question
   */
  async processEnrichmentResponse(activeEnrichment, userResponse) {
    const { memoryId, state } = activeEnrichment;
    const currentStage = state.currentStage;
    
    if (this.debugMode) {
      console.log(`🎯 ENRICHMENT FSM: Processing ${currentStage} response for memory ${memoryId}:`, userResponse);
    }
    
    // Extract information based on current stage
    switch (currentStage) {
      case 'who':
        state.collectedData.people = this.extractPeopleFromResponse(userResponse);
        break;
      case 'when':
        state.collectedData.when = this.extractTimeFromResponse(userResponse);
        break;
      case 'where':
        state.collectedData.where = this.extractLocationFromResponse(userResponse);
        break;
      case 'emotion':
        state.collectedData.emotion = this.extractEmotionFromResponse(userResponse);
        break;
      case 'media':
        // Handle media response (yes/no, or media upload)
        if (this.isPositiveResponse(userResponse)) {
          this.addMessage("Great! You can drag and drop photos here, or I'll help you add them to the final memory capsule.", 'emma');
        }
        break;
    }
    
    // Mark stage as completed
    state.stagesCompleted.push(currentStage);
    this.enrichmentState.set(memoryId, state);
    
    // Acknowledge the response with validation (dementia-friendly)
    const acknowledgment = this.generateStageAcknowledgment(currentStage, userResponse);
    
    setTimeout(() => {
      this.addMessage(acknowledgment, 'emma', { type: 'enrichment-acknowledgment' });
      
      // Ask next question after brief pause
      setTimeout(() => {
        this.askNextEnrichmentQuestion(memoryId);
      }, this.dementiaMode ? 1500 : 800);
      
    }, this.dementiaMode ? 2000 : 1000);
  }

  /**
   * Extract people names from user response
   */
  extractPeopleFromResponse(response) {
    const people = [];
    const text = response.toLowerCase();
    
    // Common relationship terms
    const relationships = ['mom', 'dad', 'mother', 'father', 'sister', 'brother', 'friend', 'husband', 'wife', 'son', 'daughter'];
    relationships.forEach(rel => {
      if (text.includes(rel)) {
        people.push(rel.charAt(0).toUpperCase() + rel.slice(1));
      }
    });
    
    // Extract proper names (capitalized words)
    const words = response.split(/\s+/);
    words.forEach(word => {
      const clean = word.replace(/[^A-Za-z]/g, '');
      if (/^[A-Z][a-z]+$/.test(clean) && clean.length > 2) {
        people.push(clean);
      }
    });
    
    // Handle "no one" or "alone" responses
    if (/\b(no one|nobody|alone|just me|by myself)\b/i.test(text)) {
      return [];
    }
    
    return [...new Set(people)]; // Remove duplicates
  }

  /**
   * Extract time information from user response
   */
  extractTimeFromResponse(response) {
    const text = response.toLowerCase();
    
    // Age references
    const ageMatch = text.match(/\b(?:age\s+)?(\d+)\b/);
    if (ageMatch) {
      return `around age ${ageMatch[1]}`;
    }
    
    // Time periods
    if (text.includes('kid') || text.includes('child')) return 'childhood';
    if (text.includes('teenager') || text.includes('teen')) return 'teenage years';
    if (text.includes('young adult')) return 'young adult';
    if (text.includes('college')) return 'college years';
    
    // Specific years
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      return yearMatch[0];
    }
    
    // Relative time
    if (text.includes('yesterday')) return 'yesterday';
    if (text.includes('last week')) return 'last week';
    if (text.includes('last month')) return 'last month';
    if (text.includes('last year')) return 'last year';
    
    // Return original if we can't parse
    return response;
  }

  /**
   * Extract location from user response
   */
  extractLocationFromResponse(response) {
    const text = response.toLowerCase();
    
    // Common locations
    const locations = ['home', 'school', 'park', 'hospital', 'beach', 'restaurant', 'church', 'work'];
    for (const loc of locations) {
      if (text.includes(loc)) {
        return loc;
      }
    }
    
    // Look for "at/in [place]" patterns
    const atMatch = text.match(/\b(?:at|in)\s+(?:the\s+)?([a-z\s]+)/);
    if (atMatch) {
      return atMatch[1].trim();
    }
    
    return response;
  }

  /**
   * Extract emotion from user response
   */
  extractEmotionFromResponse(response) {
    const text = response.toLowerCase();
    
    // Emotion words
    const emotions = ['happy', 'sad', 'excited', 'scared', 'proud', 'embarrassed', 'surprised', 'angry', 'grateful', 'peaceful'];
    for (const emotion of emotions) {
      if (text.includes(emotion)) {
        return emotion;
      }
    }
    
    // Feeling patterns
    const feelingMatch = text.match(/\bfelt?\s+([a-z]+)/);
    if (feelingMatch) {
      return feelingMatch[1];
    }
    
    return response;
  }

  /**
   * Check if response is positive (for media question)
   */
  isPositiveResponse(response) {
    const text = response.toLowerCase();
    const positive = ['yes', 'yeah', 'sure', 'okay', 'ok', 'definitely', 'absolutely'];
    const negative = ['no', 'nope', 'not really', 'don\'t have', 'none'];
    
    for (const pos of positive) {
      if (text.includes(pos)) return true;
    }
    for (const neg of negative) {
      if (text.includes(neg)) return false;
    }
    
    return text.length > 10; // Assume longer responses are positive
  }

  /**
   * Generate stage acknowledgment (dementia-friendly validation)
   */
  generateStageAcknowledgment(stage, response) {
    const acknowledgments = {
      who: "Thank you for sharing who was there with you.",
      when: "I appreciate you telling me about the timing.",
      where: "That helps me picture where this happened.",
      emotion: "Thank you for sharing how that felt.",
      media: "I understand about the photos."
    };
    
    return acknowledgments[stage] || "Thank you for sharing that detail.";
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
