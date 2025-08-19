/**
 * Emma Chat Experience - Intelligent Memory Companion Chat Interface
 * CTO-approved implementation following Emma's premium design principles
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
    
    // Emma personality settings
    this.emmaPersonality = {
      name: "Emma",
      role: "Intelligent Memory Companion",
      tone: "warm, helpful, memory-focused",
      capabilities: ["memory insights", "capture suggestions", "conversation"]
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
      </div>
    `;
  }

  setupChatInterface() {
    this.messageContainer = document.getElementById('messages-container');
    this.inputField = document.getElementById('chat-input');
    this.sendButton = document.getElementById('send-button');
    this.voiceButton = document.getElementById('voice-input-button');
    
    if (!this.messageContainer || !this.inputField || !this.sendButton || !this.voiceButton) {
      console.error('💬 Chat interface elements not found');
      return;
    }

    // Setup input handling
    this.inputField.addEventListener('input', () => this.handleInputChange());
    this.inputField.addEventListener('keydown', (e) => this.handleInputKeydown(e));
    this.sendButton.addEventListener('click', () => this.sendMessage());
    this.voiceButton.addEventListener('click', () => this.toggleVoiceInput());

    // Auto-resize textarea
    this.inputField.addEventListener('input', () => this.autoResizeTextarea());
    
    // Initialize voice recognition
    this.initializeVoiceRecognition();
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
    this.addMessage(message, 'user');
    this.inputField.value = '';
    this.autoResizeTextarea();
    this.handleInputChange();

    // Show typing indicator
    this.showTypingIndicator();

    // Simulate Emma thinking and respond
    setTimeout(() => {
      this.respondAsEmma(message);
    }, 1000 + Math.random() * 1500); // 1-2.5s realistic delay
  }

  addMessage(content, sender, options = {}) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
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
      content,
      sender,
      timestamp: Date.now(),
      ...options
    });

    // Auto-scroll to bottom
    this.scrollToBottom();
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
    
    // Generate contextual response based on user message
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
    
    // Disable focus mode
    this.disableFocusMode();
    
    super.cleanup();
  }
}

// Export for use in other modules
window.EmmaChatExperience = EmmaChatExperience;
console.log('💬 Emma Chat Experience: Module loaded successfully');
