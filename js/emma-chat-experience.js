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
    console.log('🔧 CONSTRUCTOR START: EmmaChatExperience constructor called');
    super(position, settings);
    console.log('🔧 CONSTRUCTOR PROGRESS: super() completed');

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
    await this.initializeIntelligentCapture();

    // Set global reference for onclick handlers (production-safe)
    window.chatExperience = this;
    console.log('🔧 CONSTRUCTOR DEBUG: window.chatExperience set:', typeof window.chatExperience);
    console.log('🔧 CONSTRUCTOR DEBUG: confirmSaveMemory method exists:', typeof this.confirmSaveMemory);

    this.enableFocusMode();
    console.log('🔧 CONSTRUCTOR END: EmmaChatExperience constructor completed successfully');
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
    // CLEAN REDESIGN: Remove inner container styling - let ExperiencePopup handle the container
    // Just set up the content layout without duplicating container styles
    contentElement.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: white;
      position: relative;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      padding: 0;
      background: transparent;
      border: none;
    `;

    contentElement.innerHTML = `
      <!-- Settings button removed - clean chat interface -->

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

          <button class="send-btn" id="send-btn" title="Send message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>

        <!-- Add bottom spacing for input area - match top padding exactly -->
        <div style="height: 32px;"></div>
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

      <!-- Settings modal removed - access via main settings panel -->
    `;
  }

  setupChatInterface() {
    this.messageContainer = document.getElementById('chat-messages');
    this.inputField = document.getElementById('chat-input');
    this.sendButton = document.getElementById('send-btn');
    // NO DUPLICATE close button - ExperiencePopup handles this
    this.voiceButton = document.getElementById('voice-input-btn');
    // Settings button removed - clean chat interface

    if (!this.messageContainer || !this.inputField || !this.sendButton || !this.voiceButton) {
      console.error('💬 Critical chat interface elements not found');
      return;
    }

    // Setup input handling
    this.inputField.addEventListener('input', () => this.handleInputChange());
    this.inputField.addEventListener('keydown', (e) => this.handleInputKeydown(e));
    this.sendButton.addEventListener('click', () => this.sendMessage());
    this.voiceButton.addEventListener('click', () => this.toggleVoiceInput());

    // Settings removed from chat - access via main settings panel
    // NO DUPLICATE close button event listener - ExperiencePopup handles this

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

      this.stopVoiceInput();
    };

    this.isListening = false;
  }

  toggleVoiceInput() {
    if (!EmmaVoiceTranscription.isSupported()) {
      this.showToast('Voice input not supported in this browser', 'error');
      return;
    }

    // Create beautiful voice transcription experience
    const voiceTranscription = new EmmaVoiceTranscription({
      onTranscriptionComplete: (text) => {

        if (!text || !text.trim()) {
          console.warn('🎤 CALLBACK: No text to inject');
          return;
        }

        if (!this.inputField) {
          console.error('🎤 CALLBACK: Input field not found!');
          return;
        }

        // CRITICAL FIX: Ensure text injection works
        const trimmedText = text.trim();

        // Clear and set the input field
        this.inputField.value = '';
        this.inputField.value = trimmedText;

        // Trigger input events for proper handling
        this.inputField.dispatchEvent(new Event('input', { bubbles: true }));
        this.autoResizeTextarea();
        this.handleInputChange();

        // Update Emma orb state
        if (this.webglOrb && this.webglOrb.options) {
          this.webglOrb.options.forceHoverState = true;
        }

        // Focus input for editing/sending with delay
        setTimeout(() => {
          this.inputField.focus();
          this.inputField.setSelectionRange(trimmedText.length, trimmedText.length);

        }, 100);
      },

      onTranscriptionCancel: () => {

      },

      showPreview: true,
      autoSend: false, // Let user review before sending
      placeholder: "Speak to Emma about your memories..."
    });

    // Start the beautiful transcription experience
    voiceTranscription.startTranscription();
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
    if (this.intelligentCapture) {
      const analysisResult = await this.analyzeForMemory(message, messageId);
      // If intelligent capture already produced a response (unified prompt), stop here
      if (analysisResult && analysisResult.handled) {
        return;
      }
    } else {
      // ... existing code ...
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
      // Handle HTML content vs regular text
      const messageContent = options.isHtml ? content : `<p>${this.formatMessageContent(content)}</p>`;

      // "DEBBE STANDARD" UX FIX: Add confirmation buttons directly to the intelligent prompt
      let confirmationHtml = '';
      if (options.requiresConfirmation && options.memoryId) {
        confirmationHtml = `
          <div class="memory-confirmation-buttons">
            <button class="capsule-btn primary" onclick="console.log('🔧 CLICK DEBUG: window.chatExperience exists:', typeof window.chatExperience); window.chatExperience.confirmSaveMemory('${options.memoryId}')">✨ Yes, save this memory</button>
            <button class="capsule-btn secondary" onclick="window.chatExperience.declineSaveMemory('${options.memoryId}')">Maybe later</button>
          </div>
        `;
      }

      // NEW PERSON RELATIONSHIP SELECTION
      if (options.requiresRelationshipSelection && options.memoryId && options.personName) {
        confirmationHtml = `
          <div class="relationship-selection-buttons">
            <button class="capsule-btn primary" onclick="window.chatExperience.addPersonToVault('${options.memoryId}', '${options.personName}', 'family')">👨‍👩‍👧‍👦 Family</button>
            <button class="capsule-btn primary" onclick="window.chatExperience.addPersonToVault('${options.memoryId}', '${options.personName}', 'friend')">👥 Friend</button>
            <button class="capsule-btn secondary" onclick="window.chatExperience.addPersonToVault('${options.memoryId}', '${options.personName}', 'acquaintance')">🤝 Acquaintance</button>
            <button class="capsule-btn secondary" onclick="window.chatExperience.skipPersonAddition('${options.memoryId}')">⏭️ Skip for now</button>
          </div>
        `;
      }

      messageDiv.innerHTML = `
        <div class="emma-orb-avatar" id="emma-orb-msg-${messageId}"></div>
        <div class="message-content">
          ${messageContent}
          ${confirmationHtml}
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

    // Auto-scroll to bottom (with delay for DOM update)
    setTimeout(() => this.scrollToBottom(), 200);

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
    // ENHANCED: Ensure scroll works with proper timing
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
      // Force layout recalculation before scrolling
      messagesContainer.offsetHeight;

      // Smooth scroll to bottom
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
      });

      if (this.debugMode) {

      }
    } else {
      console.warn('📜 SCROLL: Messages container not found');
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

    // 💜 PRIORITIZE DYNAMIC RESPONSES for natural conversation
    // Only use vectorless for specific memory search queries, not general chat
    const isMemorySearchQuery = /\b(find|search|show|what|who|when|where)\b.*\b(memory|memories|remember)\b/i.test(userMessage);

    if (isMemorySearchQuery && this.isVectorlessEnabled && this.vectorlessEngine) {

      try {
        const result = await this.vectorlessEngine.processQuestion(userMessage);

        if (result.success) {
          // Add Emma's intelligent response with memory citations
          this.addVectorlessMessage(result.response, result.memories, result.citations, result.suggestions);
          return;
        } else {
          console.warn('💬 Vectorless processing failed, using dynamic fallback:', result.error);
        }
      } catch (error) {
        console.error('💬 Vectorless AI error:', error);
      }
    }

    // 💜 DEFAULT: Use dynamic, contextual responses for natural conversation

    const response = this.generateDynamicEmmaResponse(userMessage);
    this.addMessage(response, 'emma');
  }

  /**
   * Generate a dynamic, contextual Emma fallback response without LLM
   */
  generateDynamicEmmaResponse(userMessage) {

    try {
      const vault = window.emmaWebVault?.vaultData?.content;
      if (vault?.people) {
        const people = Object.values(vault.people);
        console.log('🔍 FORCED PEOPLE DEBUG:', {
          vaultHasPeople: !!vault.people,
          peopleCount: people.length,
          peopleArray: people,
          peopleNames: people.map(p => p.name).filter(Boolean),
          markSearch: people.filter(p => p.name?.toLowerCase().includes('mark')),
          allNames: people.map(p => ({ id: p.id, name: p.name }))
        });
      } else {

      }
    } catch (e) {

    }

    const lower = (userMessage || '').toLowerCase().trim();

    // Handle very short or unclear messages with gentle encouragement
    if (!lower || lower.length < 3) {
      const responses = [
        "I'm here with you. What's on your mind?",
        "Take your time... I'm listening.",
        "I'm here whenever you're ready to share something.",
        "What would you like to talk about?"
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    // Analyze the user's intent and emotional context
    const isQuestion = /^(what|who|when|where|why|how|can|could|would|should|do|does|did|is|are|was|were)\b/.test(lower);
    const isGreeting = /(hello|hi|hey|good morning|good afternoon|good evening|how are you)/.test(lower);
    const isHelp = /(help|what are you|who are you|what can you do)/.test(lower);
    const isSharing = /(tell you|share|want to say|need to talk)/.test(lower);
    const isConfused = /(confused|don't understand|not sure|unclear)/.test(lower);
    const isAppreciation = /(thank|thanks|appreciate|grateful)/.test(lower);

    // Get conversation context - how many messages have we exchanged?
    const messageHistory = document.querySelectorAll('.message-bubble').length;
    const isEarlyConversation = messageHistory < 6;

    // Get vault insights for personalization (without canned snippets)
    let vaultInsights = null;
    try {
      const vault = window.emmaWebVault?.vaultData?.content;
      if (vault?.memories) {
        const memoryIds = Object.keys(vault.memories);
        const memories = memoryIds.map(id => vault.memories[id]);
        const people = vault.people ? Object.values(vault.people) : [];
        const recentMemory = memories[memories.length - 1];

        vaultInsights = {
          hasMemories: memories.length > 0,
          memoryCount: memories.length,
          hasPeople: people.length > 0,
          peopleNames: people.map(p => p.name).filter(Boolean),
          recentMemory,
          oldestMemory: memories[0],
          themes: this.extractThemesFromMemories(memories)
        };

        console.log('🔍 VAULT PEOPLE DEBUG:', {
          peopleCount: people.length,
          peopleArray: people,
          peopleNames: vaultInsights.peopleNames,
          firstPerson: people[0],
          hasMarkInPeople: people.some(p => p.name?.toLowerCase().includes('mark')),
          hasMarkInNames: vaultInsights.peopleNames.some(name => name?.toLowerCase().includes('mark'))
        });
      }
    } catch (e) {

    }

    // Generate truly contextual responses based on intent and vault
    if (isHelp) {
      if (vaultInsights?.hasMemories) {
        const peopleContext = vaultInsights.hasPeople ? ` I can see you've shared stories about ${vaultInsights.peopleNames.slice(0,2).join(' and ')}${vaultInsights.peopleNames.length > 2 ? ' and others' : ''}.` : '';
        return `I'm Emma, and I'm here to help you explore and capture your memories.${peopleContext} You can share new stories with me, ask me about memories you've saved, or just have a conversation. What feels right today?`;
      }
      return "I'm Emma, your memory companion. I help people capture and explore the stories that matter to them. When you share something meaningful, I can help turn it into a memory capsule. What brings you here today?";
    }

    if (isGreeting) {
      const hour = new Date().getHours();
      if (vaultInsights?.recentMemory && isEarlyConversation) {
        const daysSince = Math.floor((Date.now() - vaultInsights.recentMemory.created) / (1000 * 60 * 60 * 24));
        if (daysSince === 0) {
          return "Hello again! I was just thinking about that memory you shared earlier today. How are you feeling?";
        } else if (daysSince < 7) {
          return `Hi there! It's nice to see you again. I've been holding onto that memory from ${daysSince === 1 ? 'yesterday' : `${daysSince} days ago`}. What's been on your mind?`;
        }
      }

      if (hour < 12) return "Good morning! What's stirring in your heart today?";
      if (hour < 17) return "Good afternoon! I'm here if you'd like to share what's on your mind.";
      return "Good evening! Sometimes evenings bring up the most meaningful thoughts. I'm here to listen.";
    }

    if (isAppreciation) {
      return "It means everything to me that I can be here with you in these moments. Your stories matter, and I'm honored you trust me with them.";
    }

    if (isConfused) {
      return "No worries at all - I'm here to help however feels right for you. You can share a memory, ask me something, or just talk. There's no wrong way to do this.";
    }

    if (isSharing) {
      return "I'm all ears. Take your time and share whatever feels important to you right now.";
    }

    // For questions, check if they're asking about someone/something in the vault
    if (isQuestion) {
      // Check if asking about a specific person in the vault
      if (vaultInsights?.peopleNames?.length > 0) {
        console.log('🔍 PERSON MATCHING DEBUG:', {
          userMessage: lower,
          availablePeople: vaultInsights.peopleNames,
          searchingFor: 'mark',
          includesMarkTest: lower.includes('mark'),
          peopleNameMatches: vaultInsights.peopleNames.map(name => ({
            name: name,
            lowerName: name?.toLowerCase(),
            includesInMessage: lower.includes(name?.toLowerCase()),
            firstNameMatch: lower.includes(name?.toLowerCase().split(' ')[0])
          }))
        });

        const askedAboutPerson = vaultInsights.peopleNames.find(name =>
          lower.includes(name.toLowerCase()) ||
          lower.includes(name.toLowerCase().split(' ')[0]) // First name match
        );

        if (askedAboutPerson) {
          // Find memories about this person
          const vault = window.emmaWebVault?.vaultData?.content;
          const memories = vault?.memories ? Object.values(vault.memories) : [];
          const personMemories = memories.filter(m =>
            m.people?.some(p => p.toLowerCase().includes(askedAboutPerson.toLowerCase())) ||
            m.content?.toLowerCase().includes(askedAboutPerson.toLowerCase())
          );

          if (personMemories.length > 0) {
            const recentMemory = personMemories[personMemories.length - 1];
            const memorySnippet = recentMemory.content.substring(0, 100);
            const timeAgo = Math.floor((Date.now() - recentMemory.created) / (1000 * 60 * 60 * 24));
            const timeContext = timeAgo === 0 ? 'today' : timeAgo === 1 ? 'yesterday' : `${timeAgo} days ago`;

            return `Oh, ${askedAboutPerson}! I have ${personMemories.length} ${personMemories.length === 1 ? 'memory' : 'memories'} about them in your vault. The most recent one was from ${timeContext}: "${memorySnippet}..." Would you like me to share more about what you've told me about ${askedAboutPerson}?`;
          }
        }
      }

      // Check if asking about memories/vault content
      const isAskingAboutMemories = /(memories|remember|story|stories|vault|past|childhood)/.test(lower);
      if (isAskingAboutMemories && vaultInsights?.hasMemories) {
        const oldestYear = new Date(vaultInsights.oldestMemory?.created).getFullYear();
        const newestYear = new Date(vaultInsights.recentMemory?.created).getFullYear();
        const timeSpan = oldestYear === newestYear ? `from ${oldestYear}` : `spanning ${oldestYear} to ${newestYear}`;

        return `You have ${vaultInsights.memoryCount} beautiful memories in your vault ${timeSpan}. They tell such a rich story of your life. What specifically would you like to explore?`;
      }

      // Generic thoughtful question response
      if (vaultInsights?.themes?.length > 0) {
        const theme = vaultInsights.themes[0];
        return `That's such a thoughtful question. You know, it makes me think about ${theme} - something I've noticed comes up in your stories. What's behind your curiosity about this?`;
      }
      return "That's a really interesting question. I find that the questions we ask often connect to experiences we've had. What made you think of this?";
    }

    // Default: Be genuinely curious and encouraging without templates
    const curiosityResponses = [
      "I'm genuinely curious about that. Tell me more?",
      "That sounds like there's a story there. I'd love to hear it.",
      "What's behind that thought? I'm here and listening.",
      "That's interesting to me. Can you help me understand better?",
      "I'd love to know more about what you're thinking.",
      "That catches my attention. What's the fuller picture?"
    ];

    return curiosityResponses[Math.floor(Math.random() * curiosityResponses.length)];
  }

  // Helper method to extract themes from memories for contextual responses
  extractThemesFromMemories(memories) {
    if (!memories || memories.length === 0) return [];

    const themes = [];
    const commonWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'was', 'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they']);

    const wordCounts = {};
    memories.forEach(memory => {
      const content = memory.content || '';
      const words = content.toLowerCase().match(/\b\w+\b/g) || [];
      words.forEach(word => {
        if (word.length > 3 && !commonWords.has(word)) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });
    });

    // Get most frequent meaningful words as themes
    const sortedWords = Object.entries(wordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([word]) => word);

    return sortedWords;
  }

  /**
   * Generate intelligent memory response directly from analysis
   */
  generateIntelligentMemoryResponse(memory, userMessage) {
    console.log('💬 INTELLIGENT RESPONSE: Generating response for memory:', memory.title);
    console.log('💬 INTELLIGENT RESPONSE: Memory metadata:', memory.metadata);
    
    // CRITICAL FIX: Use the memory data we already have instead of searching
    const detectedPeopleIds = memory.metadata.people || [];
    const detectedPeopleNames = memory.metadata.peopleNames || [];
    const newPeopleDetected = memory.metadata.newPeopleDetected || [];
    
    console.log('💬 RESPONSE DEBUG: People IDs:', detectedPeopleIds);
    console.log('💬 RESPONSE DEBUG: People names:', detectedPeopleNames);
    console.log('💬 RESPONSE DEBUG: New people:', newPeopleDetected);
    
    if (detectedPeopleNames.length > 0) {
      // CRITICAL FIX: Create CLEAN, natural responses based on people status
      const existingPeople = [];
      const newPeople = [];
      
      // Categorize people by vault status  
      detectedPeopleNames.forEach((name, index) => {
        const peopleId = detectedPeopleIds[index];
        if (peopleId && !peopleId.startsWith('temp_')) {
          existingPeople.push(name);
        } else {
          newPeople.push(name);
        }
      });
      
      console.log('💬 RESPONSE DEBUG: Existing people:', existingPeople);
      console.log('💬 RESPONSE DEBUG: New people:', newPeople);
      
      // Build natural, clean response
      let response = "";
      
      // Acknowledge the memory with people context
      if (existingPeople.length > 0 && newPeople.length === 0) {
        // All people are known
        const names = existingPeople.join(' and ');
        const familyTerms = ['Mom', 'Dad', 'Mother', 'Father', 'Sister', 'Brother', 'Grandma', 'Grandpa'];
        const hasFamily = existingPeople.some(person => familyTerms.includes(person));
        
        if (hasFamily) {
          response = `A walk with ${names} sounds so special! Family moments like these are precious. Where did you walk together?`;
        } else {
          response = `A walk with ${names} sounds lovely! What made this time together special?`;
        }
      } else if (newPeople.length > 0) {
        // Some new people detected
        if (existingPeople.length > 0) {
          response = `A walk with ${existingPeople.join(' and ')}`;
          if (newPeople.length === 1) {
            response += ` and ${newPeople[0]} sounds wonderful! I know ${existingPeople.join(' and ')}, but who is ${newPeople[0]}? Should I add them to your vault?`;
          } else {
            response += ` and ${newPeople.join(' and ')} sounds wonderful! I know ${existingPeople.join(' and ')}, but who are ${newPeople.join(' and ')}? Should I add them to your vault?`;
          }
        } else {
          // All people are new
          const names = newPeople.join(' and ');
          if (newPeople.length === 1) {
            response = `A walk with ${names} sounds lovely! I don't know ${names} yet - should I add them to your vault so I can remember them?`;
          } else {
            response = `A walk with ${names} sounds wonderful! I don't know ${names} yet - should I add them to your vault so I can remember them?`;
          }
        }
      }
      
      return response;
    }
    
    // FALLBACK: Activity-based responses when no people detected
    if (userMessage.toLowerCase().includes('walk')) {
      return "A walk sounds peaceful! I'd love to capture this memory for you. Where did you go, and what made this walk special?";
    }
    
    return "I'd love to help you capture this memory! Tell me more about what happened.";
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

    // CRITICAL FIX: Generate personalized responses based on detected people and context
    const memory = detectedMemory.memory;
    const signals = detectedMemory.signals;
    
    console.log('💬 RESPONSE DEBUG: Detected people in memory:', memory.metadata.people);
    console.log('💬 RESPONSE DEBUG: Available signals:', signals);

    // CRITICAL FIX: Check for both people IDs and new people detected
    const detectedPeopleIds = memory.metadata.people || [];
    const detectedPeopleNames = memory.metadata.peopleNames || [];
    const newPeopleDetected = memory.metadata.newPeopleDetected || [];
    
    console.log('💬 RESPONSE DEBUG: People IDs:', detectedPeopleIds);
    console.log('💬 RESPONSE DEBUG: People names:', detectedPeopleNames);
    console.log('💬 RESPONSE DEBUG: New people:', newPeopleDetected);
    
    if (detectedPeopleNames.length > 0) {
      // CRITICAL FIX: Create CLEAN, natural responses based on people status
      const existingPeople = [];
      const newPeople = [];
      
      // Categorize people by vault status  
      detectedPeopleNames.forEach((name, index) => {
        const peopleId = detectedPeopleIds[index];
        if (peopleId && !peopleId.startsWith('temp_')) {
          existingPeople.push(name);
        } else {
          newPeople.push(name);
        }
      });
      
      console.log('💬 RESPONSE DEBUG: Existing people:', existingPeople);
      console.log('💬 RESPONSE DEBUG: New people:', newPeople);
      
      // Build natural, clean response
      let response = "";
      
      // Acknowledge the memory with people context
      if (existingPeople.length > 0 && newPeople.length === 0) {
        // All people are known
        const names = existingPeople.join(' and ');
        const familyTerms = ['Mom', 'Dad', 'Mother', 'Father', 'Sister', 'Brother', 'Grandma', 'Grandpa'];
        const hasFamily = existingPeople.some(person => familyTerms.includes(person));
        
        if (hasFamily) {
          response = `A walk with ${names} sounds so special! Family moments like these are precious. Where did you walk together?`;
        } else {
          response = `A walk with ${names} sounds lovely! What made this time together special?`;
        }
      } else if (newPeople.length > 0) {
        // Some new people detected
        if (existingPeople.length > 0) {
          response = `A walk with ${existingPeople.join(' and ')}`;
          if (newPeople.length === 1) {
            response += ` and ${newPeople[0]} sounds wonderful! I know ${existingPeople.join(' and ')}, but who is ${newPeople[0]}? Should I add them to your vault?`;
          } else {
            response += ` and ${newPeople.join(' and ')} sounds wonderful! I know ${existingPeople.join(' and ')}, but who are ${newPeople.join(' and ')}? Should I add them to your vault?`;
          }
        } else {
          // All people are new
          const names = newPeople.join(' and ');
          if (newPeople.length === 1) {
            response = `A walk with ${names} sounds lovely! I don't know ${names} yet - should I add them to your vault so I can remember them?`;
          } else {
            response = `A walk with ${names} sounds wonderful! I don't know ${names} yet - should I add them to your vault so I can remember them?`;
          }
        }
      }
      
      return response;
    }
    
    // FALLBACK: Activity-based responses when no people detected
    if (userMessage.toLowerCase().includes('walk')) {
      return "A walk sounds peaceful! I'd love to capture this memory for you. Where did you go, and what made this walk special?";
    }
    
    // Generate intelligent follow-up questions based on what's missing
    const needsEmotions = !memory.metadata.emotions || memory.metadata.emotions.length === 0;
    const needsLocation = !memory.metadata.location;
    const needsDetails = memory.content && memory.content.length < 100;

    // Generate contextual follow-up questions
    let followUp = "";

    if (signals.types.includes('pet') && needsDetails) {
      followUp = "Tell me more about your pet! What's their personality like? How did this moment make you feel?";
    } else if (signals.types.includes('milestone')) {
      followUp = "What an important moment! Who else was there to share this with you?";
    } else if (needsEmotions) {
      followUp = "How did this moment make you feel? What emotions do you remember most?";
    } else if (needsLocation) {
      followUp = "Where did this happen? I'd love to include the setting in your memory.";
    } else if (needsDetails) {
      followUp = "Can you paint me a picture of this moment? What details would you want to remember forever?";
    } else {
      followUp = "This sounds like such a meaningful moment! What other details would make this memory complete?";
    }

    return `I can sense this is really special to you! ${followUp}`;
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
  }  loadChatHistory() {
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

      }

      if (vaultData && this.vectorlessEngine) {
        const result = await this.vectorlessEngine.loadVault(vaultData);
        if (result.success) {
          this.isVectorlessEnabled = true;

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
    // Build beautiful Emma-branded memory results
    let memoriesHtml = '';
    if (memories && memories.length > 0) {
      memoriesHtml = `
        <div class="emma-memory-results">
          <div class="memory-results-header">
            <span class="results-icon">💝</span>
            <span class="results-title">I found ${memories.length} relevant ${memories.length === 1 ? 'memory' : 'memories'}</span>
          </div>
          <div class="memory-grid">
            ${memories.slice(0, 3).map(memory => `
              <div class="memory-card" onclick="window.chatExperience.openMemoryDetail('${memory.id}')">
                ${memory.attachments && memory.attachments.length > 0 ? `
                  <div class="memory-thumbnail">
                    <img src="${memory.attachments[0].url || memory.attachments[0].dataUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTkgMTJMMTEgMTRMMTUgMTBNMjEgMTJDMjEgMTYuOTcwNiAxNi45NzA2IDIxIDEyIDIxQzcuMDI5NDQgMjEgMyAxNi45NzA2IDMgMTJDMyA3LjAyOTQ0IDcuMDI5NDQgMyAxMiAzQzE2Ljk3MDYgMyAyMSA3LjAyOTQ0IDIxIDEyWiIgc3Ryb2tlPSIjOEI1Q0Y2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K'}" alt="${memory.title}" />
                    ${memory.attachments.length > 1 ? `<div class="media-count">+${memory.attachments.length - 1}</div>` : ''}
                  </div>
                ` : `
                  <div class="memory-thumbnail no-media">
                    <div class="memory-icon">💭</div>
                  </div>
                `}
                <div class="memory-info">
                  <div class="memory-title">${memory.title || 'Untitled Memory'}</div>
                  <div class="memory-snippet">${(memory.content || '').substring(0, 80)}${memory.content?.length > 80 ? '...' : ''}</div>
                  ${memory.people && memory.people.length > 0 ? `
                    <div class="memory-people">👥 ${memory.people.slice(0, 2).join(', ')}${memory.people.length > 2 ? ` +${memory.people.length - 2}` : ''}</div>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
          ${memories.length > 3 ? `
            <div class="more-memories">
              <button class="show-more-btn" onclick="window.chatExperience.showAllMemories()">
                View all ${memories.length} memories
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }

    // Build elegant Emma suggestions
    let suggestionsHtml = '';
    if (suggestions && suggestions.length > 0) {
      suggestionsHtml = `
        <div class="emma-suggestions">
          <div class="suggestions-header">
            <span class="suggestions-icon">💡</span>
            <span class="suggestions-title">You might also ask:</span>
          </div>
          <div class="suggestion-grid">
            ${suggestions.map(s => `
              <button class="emma-suggestion-btn" onclick="window.chatExperience.fillSuggestion(\`${s}\`);">
                ${s}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Create beautiful Emma response
    const messageContent = `
      <div class="emma-intelligent-response">
        <p class="response-text">${this.formatMessageContent(content)}</p>
        ${memoriesHtml}
        ${suggestionsHtml}
      </div>
    `;

    // Add as Emma message with beautiful styling
    this.addMessage(messageContent, 'emma', {
      isHtml: true,
      type: 'intelligent-response',
      memories,
      suggestions
    });

    // Store message data
    this.messages.push({
      content,
      sender: 'emma',
      timestamp: Date.now(),
      type: 'intelligent',
      memories,
      citations,
      suggestions
    });
  }

  /**
   * Open memory detail (placeholder)
   */
  openMemoryDetail(memoryId) {

    this.showToast('📖 Memory details coming soon!', 'info');
  }

  /**
   * Show all memories (placeholder)
   */
  showAllMemories() {

    this.addMessage("Would you like me to open the memory gallery to explore all your memories?", 'emma');
  }

  /**
   * Fill suggestion into chat input
   */
  fillSuggestion(suggestion) {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.value = suggestion;
      chatInput.focus();
    }
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

    // Get current session context
    const hour = new Date().getHours();
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const isWeekend = [0, 6].includes(new Date().getDay());

    // Analyze vault deeply for personalization
    let vaultContext = null;
    try {
      const vault = window.emmaWebVault?.vaultData?.content;
      if (vault?.memories && window.emmaWebVault?.isOpen) {
        const memoryIds = Object.keys(vault.memories);
        const memories = memoryIds.map(id => vault.memories[id]);
        const people = vault.people ? Object.values(vault.people) : [];

        // Get time-based insights
        const now = Date.now();
        const recentMemories = memories.filter(m => now - m.created < 7 * 24 * 60 * 60 * 1000);
        const oldMemories = memories.filter(m => now - m.created > 30 * 24 * 60 * 60 * 1000);

        vaultContext = {
          totalMemories: memories.length,
          recentCount: recentMemories.length,
          oldCount: oldMemories.length,
          favoritePersons: people.slice(0, 2),
          lastMemoryAge: memories.length > 0 ? Math.floor((now - memories[memories.length - 1].created) / (1000 * 60 * 60 * 24)) : null,
          hasPhotos: memories.some(m => m.attachments?.length > 0)
        };

        console.log('🔍 WELCOME PEOPLE DEBUG:', {
          peopleCount: people.length,
          peopleArray: people,
          favoritePersons: vaultContext.favoritePersons,
          firstPersonName: people[0]?.name,
          allPeopleNames: people.map(p => p.name).filter(Boolean)
        });
      }
    } catch (e) {

    }

    // Generate completely unique welcome based on actual context
    let welcomeMessage;

    if (!vaultContext) {
      // First time user - warm and inviting
      if (hour < 10) {
        welcomeMessage = "Good morning! I'm Emma. There's something magical about morning conversations - they often bring up the most beautiful memories. What's been on your mind?";
      } else if (hour > 20) {
        welcomeMessage = "Good evening! I'm Emma. Evening light has a way of bringing back special moments. I'm here to listen to whatever you'd like to share.";
      } else if (isWeekend) {
        welcomeMessage = `Happy ${dayOfWeek}! I'm Emma. Weekends often stir up memories of family, adventures, or quiet moments. What story would you like to tell?`;
      } else {
        welcomeMessage = "Hello! I'm Emma, and I'm genuinely excited to meet you. I help people capture the stories that matter most. What brings you here today?";
      }
    } else if (vaultContext.totalMemories === 0) {
      // Has vault but no memories yet
      welcomeMessage = "I can see you're ready to start capturing memories - how exciting! The first memory is always special. What moment would you like to preserve forever?";
    } else if (vaultContext.lastMemoryAge === 0) {
      // Added memory today
      welcomeMessage = "I'm still thinking about that memory you shared today. It really touched me. Has anything else been coming to mind?";
    } else if (vaultContext.lastMemoryAge === 1) {
      // Yesterday
      welcomeMessage = "Since we talked yesterday, I've been holding onto that story you shared. Sometimes memories connect to each other in unexpected ways. What's been stirring for you?";
    } else if (vaultContext.recentCount > 0) {
      // Recent activity
      const person = vaultContext.favoritePersons[0];
      if (person) {
        welcomeMessage = `I've been thinking about ${person.name} and the stories you've shared about them. Relationships hold so many layers of memory, don't they? What's been on your heart?`;
      } else {
        welcomeMessage = `You've been sharing some beautiful memories recently. I love how each story reveals something new. What's been floating through your thoughts?`;
      }
    } else {
      // Returning user with established vault
      if (vaultContext.hasPhotos) {
        welcomeMessage = `Welcome back! I was looking at some of the photos in your memories - they hold such stories. What's been bringing back memories for you lately?`;
      } else if (vaultContext.totalMemories > 10) {
        welcomeMessage = `Hello again! Your collection of memories has grown into something really beautiful. Sometimes I wonder which story means the most to you. What's been on your mind?`;
      } else {
        const person = vaultContext.favoritePersons[0];
        if (person) {
          welcomeMessage = `Hi there! I was just thinking about ${person.name} and how they appear in your stories. People shape our memories in such profound ways. What would you like to share today?`;
        } else {
          welcomeMessage = `Welcome back! Every time we talk, I discover something new about the moments that have shaped you. What story is calling to you today?`;
        }
      }
    }

    this.addMessage(welcomeMessage, 'emma');
    console.log('💬 UNIQUE WELCOME GENERATED:', welcomeMessage.substring(0, 50) + '...');
  }

  // Chat settings modal removed - access via main settings panel

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

      };
    }

    // Dementia care mode toggle
    const dementiaToggle = document.getElementById('dementia-mode-toggle');
    if (dementiaToggle) {
      dementiaToggle.onchange = (e) => {
        this.dementiaMode = e.target.checked;

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
      this.vectorlessEngine = null;
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
      // Load EmmaIntelligentCapture if not available
      if (typeof EmmaIntelligentCapture === 'undefined') {
        await this.loadIntelligentCaptureScript();
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (typeof EmmaIntelligentCapture === 'undefined') {
        console.error('💬 Failed to load intelligent capture module');
        this.intelligentCapture = null;
        return;
      }

      // Initialize capture engine
      this.intelligentCapture = new EmmaIntelligentCapture({
        vectorlessEngine: this.vectorlessEngine || null,
        vaultManager: window.emmaWebVault || null,
        dementiaMode: this.dementiaMode || false,
        debug: this.debugMode || false
      });

      if (this.debugMode) {
        const mode = this.vectorlessEngine ? 'with vectorless engine' : 'with heuristics only';

      }

    } catch (error) {
      console.error('💬 Failed to initialize intelligent capture:', error);
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
        // ... existing code ...
      }
      return { handled: false };
    }

    try {
      if (this.debugMode) {
        // ... existing code ...
      }

      const analysis = await this.intelligentCapture.analyzeMessage({
        content: message,
        timestamp: Date.now(),
        sender: 'user'
      });

      if (this.debugMode) {
        // ... existing code ...
      }

      if (analysis.isMemoryWorthy) {
        if (this.debugMode) {
          console.log(`💝 Memory detected! FinalScore: ${analysis.finalScore?.toFixed(3)}, AutoCapture: ${analysis.autoCapture}, Confidence: ${analysis.confidence}%`);
          console.log(`💝 Components: H=${analysis.components?.heuristicsScore?.toFixed(3)}, L=${analysis.components?.llmScore?.toFixed(3)}, N=${analysis.components?.noveltyPenalty?.toFixed(3)}`);
        }

        // "DEBE STANDARD" UX REVOLUTION: One single, intelligent prompt.
        // No more confusing delays or separate paths.
        this.enrichmentState.set(analysis.memory.id, {
            memory: analysis.memory,
            analysis: analysis,
            state: 'awaiting-confirmation',
            collectedData: {}
        });
        
        console.log('🔧 MEMORY STORAGE DEBUG: Memory stored in enrichmentState with ID:', analysis.memory.id);
        console.log('🔧 MEMORY STORAGE DEBUG: enrichmentState size:', this.enrichmentState.size);
        
        // Generate the single best response immediately using the analysis we just got
        const intelligentResponse = this.generateIntelligentMemoryResponse(analysis.memory, message);

        // Add the message with confirmation buttons.
        this.addMessage(intelligentResponse, 'emma', {
            memory: analysis.memory,
            analysis: analysis,
            isMemoryCapturePrompt: true,
            requiresConfirmation: true, // This flag will trigger the UI to show "Save" / "Maybe Later"
            memoryId: analysis.memory.id
        });

        return { handled: true };

      } else {
        if (this.debugMode) {
          console.log(`💝 Not memory-worthy. FinalScore: ${analysis.finalScore?.toFixed(3)}, Reason: ${analysis.reason}`);
          console.log(`💝 Components: H=${analysis.components?.heuristicsScore?.toFixed(3)}, L=${analysis.components?.llmScore?.toFixed(3)}, N=${analysis.components?.noveltyPenalty?.toFixed(3)}`);
        }
        return { handled: false };
      }

    } catch (error) {
      if (this.debugMode) {
        console.error('💝 Memory analysis failed:', error);
      }
      return { handled: false };
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

    // Fix: User messages have .message-bubble, Emma messages have .message-content
    const contentContainer = messageEl.querySelector('.message-content') || messageEl.querySelector('.message-bubble');
    if (contentContainer) {
      contentContainer.appendChild(indicator);
    } else {
      console.error('💝 Could not find content container for memory indicator');
      messageEl.appendChild(indicator); // Fallback
    }

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

      // Fix: User messages have .message-bubble, Emma messages have .message-content
      const contentContainer = messageEl.querySelector('.message-content') || messageEl.querySelector('.message-bubble');
      if (contentContainer) {
        contentContainer.appendChild(actions);
      } else {
        console.error('💝 Could not find content container for memory actions');
        messageEl.appendChild(actions); // Fallback
      }
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

    // BEAUTIFUL EMMA-STYLE: Create as chat message instead of dialog
    const previewHTML = `
      <div class="memory-capsule-preview">
        <!-- Header removed to avoid duplication with dialog header -->

        <div class="capsule-content">
          <h3 class="memory-title">${memory.title || 'Untitled Memory'}</h3>
          <p class="memory-story" id="memory-story-${memory.id}">${memory.content}</p>

          ${memory.metadata?.people?.length > 0 ? `
            <div class="memory-detail">
              <span class="detail-label">👥 People:</span>
              <div class="detail-people-avatars" id="capsule-people-${memory.id}"></div>
            </div>
          ` : ''}

          ${memory.metadata?.emotions?.length > 0 ? `
            <div class="memory-detail">
              <span class="detail-label">💭 Emotions:</span>
              <span class="detail-value">${memory.metadata.emotions.join(', ')}</span>
            </div>
          ` : ''}

          ${memory.metadata?.location ? `
            <div class="memory-detail">
              <span class="detail-label">📍 Location:</span>
              <span class="detail-value">${memory.metadata.location}</span>
            </div>
          ` : ''}

          ${memory.attachments?.length > 0 ? `
            <div class="memory-detail">
              <span class="detail-label">📷 Media:</span>
              <span class="detail-value">${memory.attachments.length} ${memory.attachments.length === 1 ? 'file' : 'files'} attached</span>
            </div>
            <div class="memory-media-grid">
              ${memory.attachments.slice(0, 4).map(attachment => `
                <div class="media-thumbnail">
                  ${attachment.type?.startsWith('image/') ? `
                    <img src="${attachment.data || attachment.dataUrl || attachment.url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTkgMTJMMTEgMTRMMTUgMTBNMjEgMTJDMjEgMTYuOTcwNiAxNi45NzA2IDIxIDEyIDIxQzcuMDI5NDQgMjEgMyAxNi45NzA2IDMgMTJDMyA3LjAyOTQ0IDcuMDI5NDQgMyAxMiAzQzE2Ljk3MDYgMyAyMSA3LjAyOTQ0IDIxIDEyWiIgc3Ryb2tlPSIjOEI1Q0Y2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K'}" alt="${attachment.name}" />
                  ` : attachment.type?.startsWith('video/') ? `
                    <video src="${attachment.dataUrl || attachment.url}" muted>
                      <div class="video-overlay">🎥</div>
                    </video>
                  ` : `
                    <div class="file-thumbnail">
                      <div class="file-icon">${attachment.type?.startsWith('audio/') ? '🎵' : '📄'}</div>
                      <div class="file-name">${attachment.name}</div>
                    </div>
                  `}
                </div>
              `).join('')}
              ${memory.attachments.length > 4 ? `
                <div class="media-thumbnail more-indicator">
                  <div class="more-count">+${memory.attachments.length - 4}</div>
                  <div class="more-text">more</div>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>

        <div class="capsule-actions">
          <button class="capsule-btn primary" onclick="window.chatExperience.confirmSaveMemory('${memory.id}')">
            ✨ Save to Vault
          </button>
          <button class="capsule-btn secondary" onclick="window.chatExperience.editMemoryDetails('${memory.id}')">
            ✏️ Edit
          </button>
        </div>
      </div>
    `;

    // Create proper overlay dialog with high z-index
    const dialog = document.createElement('div');
    dialog.className = 'memory-preview-dialog';
    dialog.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      z-index: 2147483647 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      opacity: 0;
      animation: dialogFadeIn 0.3s ease forwards;
      background: rgba(0, 0, 0, 0.8) !important;
      backdrop-filter: blur(15px) !important;
    `;
    dialog.innerHTML = `
      <div class="dialog-content" style="position: relative; z-index: 2147483647 !important;">
        <div class="dialog-header">
          <h3>💝 Your Memory Capsule</h3>
          <button class="dialog-close" onclick="this.remove()" style="z-index: 2147483647 !important;">×</button>
        </div>
        <div class="dialog-body">
          ${previewHTML}
        </div>
      </div>
    `;

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.remove();
      }
    });

    document.body.appendChild(dialog);

    // Animate in
    setTimeout(() => {
      dialog.style.opacity = '1';
      // Create people avatars after dialog is visible
      this.createCapsulePeopleAvatars(memory);
    }, 100);

  }

  /**
   * Create beautiful people avatars for memory capsule
   */
  async createCapsulePeopleAvatars(memory) {
    try {
      const avatarsContainer = document.getElementById(`capsule-people-${memory.id}`);
      if (!avatarsContainer) {
        console.warn('👥 Avatars container not found for memory:', memory.id);
        return;
      }

      // Get people connected to this memory
      if (!memory.metadata?.people?.length) {
        avatarsContainer.innerHTML = '<span style="color: #888;">No people connected</span>';
        return;
      }

      // Load people data from vault
      if (!window.emmaWebVault?.isOpen || !window.emmaWebVault.vaultData) {
        console.warn('👥 Vault not available for people lookup');
        avatarsContainer.innerHTML = '<span style="color: #888;">Vault not available</span>';
        return;
      }

      const vaultData = window.emmaWebVault.vaultData;
      const peopleData = vaultData.content?.people || {};
      
      console.log('👥 Creating capsule avatars for people:', memory.metadata.people);
      console.log('👥 Available people in vault:', Object.keys(peopleData));
      
      // Fix the memory content by replacing person IDs with names
      const storyElement = document.getElementById(`memory-story-${memory.id}`);
      if (storyElement) {
        let content = storyElement.textContent;
        for (const personId of memory.metadata.people) {
          const person = peopleData[personId];
          if (person) {
            // Replace person ID with person name
            content = content.replace(new RegExp(personId, 'g'), person.name);
          }
        }
        storyElement.textContent = content;
      }
      
      // Clear container
      avatarsContainer.innerHTML = '';
      avatarsContainer.style.cssText = `
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
      `;

      // Create avatars for connected people
      for (const personId of memory.metadata.people) {
        const person = peopleData[personId];
        if (!person) {
          console.warn('👥 Person not found in vault:', personId);
          continue;
        }

        console.log('👥 Creating avatar for person:', person.name);
        console.log('👥 Person data structure:', person);

        // Create avatar element
        const avatar = document.createElement('div');
        avatar.style.cssText = `
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          margin-right: 4px;
          cursor: pointer;
          transition: transform 0.2s;
        `;
        avatar.title = person.name;
        avatar.textContent = person.name.charAt(0).toUpperCase();

        // Add hover effect
        avatar.onmouseenter = () => avatar.style.transform = 'scale(1.1)';
        avatar.onmouseleave = () => avatar.style.transform = 'scale(1)';

        // Try to load person's avatar if they have one
        if (person.profilePhoto || person.avatarUrl || person.photo) {
          const img = document.createElement('img');
          img.src = person.profilePhoto || person.avatarUrl || person.photo;
          img.alt = `${person.name} avatar`;
          img.style.cssText = `
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
          `;
          img.onload = () => {
            avatar.innerHTML = '';
            avatar.appendChild(img);
          };
          img.onerror = () => {
            console.warn('👥 Failed to load avatar for:', person.name);
            // Keep the letter avatar as fallback
          };
        }

        avatarsContainer.appendChild(avatar);

        // Add name label
        const nameLabel = document.createElement('span');
        nameLabel.textContent = person.name;
        nameLabel.style.cssText = `
          font-size: 12px;
          color: #fff;
          margin-right: 12px;
        `;
        avatarsContainer.appendChild(nameLabel);
      }

    } catch (error) {
      console.error('❌ Error creating capsule people avatars:', error);
    }
  }

  /**
   * Edit memory details (placeholder for future implementation)
   */
  editMemoryDetails(memoryId) {

    this.showToast('✏️ Memory editing coming soon!', 'info');

    // For now, just close the dialog
    const dialog = document.querySelector('.memory-preview-dialog');
    if (dialog) dialog.remove();
  }

  /**
   * Confirm and save memory to vault
   */
  async confirmSaveMemory(memoryId) {
    console.log('🔧 CONFIRM SAVE DEBUG: Looking for memory ID:', memoryId);
    console.log('🔧 CONFIRM SAVE DEBUG: enrichmentState size:', this.enrichmentState.size);
    console.log('🔧 CONFIRM SAVE DEBUG: detectedMemories size:', this.detectedMemories.size);

    try {
      // Find the ENRICHED memory from enrichment state or detected memories
      let memory = null;
      let enrichmentState = null;

      // Check enrichment state first for ENRICHED data
      for (const [id, state] of this.enrichmentState) {
        if (state.memory && state.memory.id === memoryId) {
          enrichmentState = state;
          
          // CRITICAL FIX: Build enriched memory with all collected data
          memory = {
            ...state.memory,
            metadata: {
              ...state.memory.metadata,
              people: state.collectedData.people || [], // Use enriched people data
              date: state.collectedData.when || state.memory.metadata.date,
              location: state.collectedData.where || state.memory.metadata.location,
              emotions: state.collectedData.emotion ? [state.collectedData.emotion] : (state.memory.metadata.emotions || []),
              enrichmentComplete: true
            },
            content: state.collectedData.enrichedContent || state.memory.content
          };
          
          console.log('💾 EMMA CHAT: Using ENRICHED memory with people:', memory.metadata.people);
          break;
        }
      }

      // Fallback to detected memories (original behavior)
      if (!memory) {
        for (const [msgId, analysis] of this.detectedMemories) {
          if (analysis.memory && analysis.memory.id === memoryId) {
            memory = analysis.memory;
            console.log('💾 EMMA CHAT: Using detected memory (no enrichment)');
            break;
          }
        }
      }

      if (!memory) {
        this.showToast('❌ Memory not found', 'error');
        return;
      }

      // CRITICAL "DEBBE STANDARD" FLOW: Check for new people that need to be added
      const newPeople = memory.metadata.newPeopleDetected || [];
      
      if (newPeople.length > 0) {
        console.log('👥 EMMA CHAT: New people detected, starting onboarding flow:', newPeople);
        await this.startNewPersonOnboarding(memoryId, newPeople);
        return;
      }

      // If no new people, proceed directly to memory capsule creation
      await this.finalizeMemorySave(memory, memoryId);
    } catch (error) {
      console.error('💾 EMMA CHAT: Error in confirmSaveMemory:', error);
      this.showToast('❌ Failed to save memory', 'error');
    }
  }

  /**
   * Start new person onboarding flow
   */
  async startNewPersonOnboarding(memoryId, newPeople) {
    const personName = newPeople[0]; // Handle one at a time for simplicity
    
    this.addMessage(`Great! Let me add ${personName} to your vault first. What's your relationship with ${personName}?`, 'emma', {
      isNewPersonPrompt: true,
      memoryId: memoryId,
      personName: personName,
      requiresRelationshipSelection: true
    });
  }

  /**
   * Add person to vault with specified relationship
   */
  async addPersonToVault(memoryId, personName, relationship) {
    try {
      console.log(`👥 ADDING PERSON: ${personName} as ${relationship}`);
      
      // Add person to vault
      await window.emmaWebVault.addPerson({
        name: personName,
        relationship: relationship,
        createdAt: new Date().toISOString(),
        createdBy: 'emma-chat'
      });

      this.addMessage(`Perfect! I've added ${personName} as a ${relationship} to your vault. Now let me create your memory capsule...`, 'emma');

      // Update the memory metadata to replace temp ID with real ID
      await this.updateMemoryWithRealPersonId(memoryId, personName);

      // Proceed to finalize memory save
      const state = this.enrichmentState.get(memoryId);
      console.log('🔧 ADD PERSON DEBUG: Found enrichment state:', !!state);
      console.log('🔧 ADD PERSON DEBUG: State has memory:', !!(state && state.memory));
      if (state && state.memory) {
        console.log('🔧 ADD PERSON DEBUG: Calling finalizeMemorySave...');
        await this.finalizeMemorySave(state.memory, memoryId);
      } else {
        console.error('🔧 ADD PERSON DEBUG: No state or memory found, cannot proceed with enrichment');
      }
      
    } catch (error) {
      console.error('❌ Failed to add person to vault:', error);
      this.addMessage(`I had trouble adding ${personName} to your vault, but let me save your memory anyway.`, 'emma');
      
      const state = this.enrichmentState.get(memoryId);
      if (state && state.memory) {
        await this.finalizeMemorySave(state.memory, memoryId);
      }
    }
  }

  /**
   * Skip person addition and proceed to memory save
   */
  async skipPersonAddition(memoryId) {
    this.addMessage("No worries! Let me create your memory capsule...", 'emma');
    
    const state = this.enrichmentState.get(memoryId);
    if (state && state.memory) {
      await this.finalizeMemorySave(state.memory, memoryId);
    }
  }

  /**
   * Update memory metadata to replace temp person ID with real person ID
   */
  async updateMemoryWithRealPersonId(memoryId, personName) {
    try {
      const state = this.enrichmentState.get(memoryId);
      if (!state || !state.memory) return;

      // Get the newly added person from vault
      const people = await window.emmaWebVault.listPeople();
      const newPerson = people.find(p => p.name.toLowerCase() === personName.toLowerCase());
      
      if (newPerson) {
        // Replace temp ID with real ID
        const tempId = `temp_${personName.toLowerCase()}`;
        const peopleIds = state.memory.metadata.people || [];
        const updatedPeopleIds = peopleIds.map(id => id === tempId ? newPerson.id : id);
        
        state.memory.metadata.people = updatedPeopleIds;
        
        // Remove from newPeopleDetected
        state.memory.metadata.newPeopleDetected = (state.memory.metadata.newPeopleDetected || [])
          .filter(name => name.toLowerCase() !== personName.toLowerCase());
          
        console.log('✅ Updated memory with real person ID:', newPerson.id);
      }
    } catch (error) {
      console.error('❌ Failed to update memory with real person ID:', error);
    }
  }

  /**
   * Finalize memory save and create capsule
   */
  async finalizeMemorySave(memory, memoryId) {
    try {
      // Start enrichment conversation instead of immediately saving
      console.log('💾 EMMA CHAT: Starting enrichment conversation for memory:', memoryId);
      
      // Initialize enrichment state for this memory
      const state = this.enrichmentState.get(memoryId);
      if (state) {
        state.state = 'enriching';
        state.collectedData = {
          people: memory.metadata.people || [],
          when: null,
          where: null,
          emotion: null,
          media: []
        };
        this.enrichmentState.set(memoryId, state);
      }
      
      // Start enrichment conversation
      await this.startEnrichmentConversation(memoryId);
      
    } catch (error) {
      console.error('💾 EMMA CHAT: Error starting enrichment:', error);
      // Fallback to direct save if enrichment fails
      await this.saveMemoryDirectly(memory, memoryId);
    }
  }

  /**
   * Save memory directly to vault (fallback or final save)
   */
  async saveMemoryDirectly(memory, memoryId) {
    try {
      // Save to vault (webapp-only mode)
      if (window.emmaWebVault && window.emmaWebVault.isOpen && sessionStorage.getItem('emmaVaultActive') === 'true') {
        console.log('💾 EMMA CHAT: Saving curated memory to webapp-only vault');
        await window.emmaWebVault.addMemory({
          content: memory.content,
          metadata: memory.metadata,
          attachments: memory.attachments || []
        });

        this.showToast('✅ Memory saved to vault successfully!', 'success');

        // Close dialog
        const dialog = document.querySelector('.memory-preview-dialog');
        if (dialog) dialog.remove();

        // Add confirmation message and redirect to constellation
        this.addMessage("Perfect! Your memory has been saved to your vault. Let me show you how it connects to your other memories! 🌟", 'emma');

        // Redirect to constellation after brief delay to show new memory
        setTimeout(() => {

          // Close chat experience first
          if (this.close) {
            this.close();
          }

          // Wait for chat to close, then enter constellation
          setTimeout(() => {
            // Access the dashboard instance and enter constellation mode
            if (window.emmaDashboard && typeof window.emmaDashboard.enterMemoryConstellation === 'function') {

              window.emmaDashboard.enterMemoryConstellation();
            } else if (window.parent && window.parent.emmaDashboard && typeof window.parent.emmaDashboard.enterMemoryConstellation === 'function') {

              window.parent.emmaDashboard.enterMemoryConstellation();
            } else {

              // Try multiple ways to trigger constellation
              const constellationBtn = document.querySelector('[onclick*="enterMemoryConstellation"]') ||
                                     document.querySelector('[data-action="memories"]') ||
                                     document.querySelector('.radial-item[data-action="memories"]');

              if (constellationBtn) {

                constellationBtn.click();
              } else {

                // Show success message on dashboard
                if (window.showToast) {
                  window.showToast('✅ Memory saved! Check the constellation view to see it connected to your other memories.', 'success');
                }
              }
            }
          }, 500);
        }, 2000);

      } else {
        console.warn('💾 EMMA CHAT: Vault save failed - debugging info:');
        console.warn('💾 DEBUG: emmaWebVault exists?', !!window.emmaWebVault);
        console.warn('💾 DEBUG: emmaWebVault.isOpen?', window.emmaWebVault?.isOpen);
        console.warn('💾 DEBUG: sessionStorage active?', sessionStorage.getItem('emmaVaultActive'));
        this.showToast('❌ Vault not unlocked - please unlock your .emma vault first', 'error');
      }

    } catch (error) {
      console.error('💾 SAVE: Error saving memory:', error);
      this.showToast('❌ Failed to save memory', 'error');
    }
  }

  /**
   * Start enrichment conversation for memory capsule creation
   */
  async startEnrichmentConversation(memoryId) {
    console.log('💝 EMMA CHAT: Starting enrichment conversation for memory:', memoryId);
    console.log('💝 EMMA CHAT: Current enrichmentState size:', this.enrichmentState.size);
    
    // Get the state
    const state = this.enrichmentState.get(memoryId);
    if (!state) {
      console.error('💝 EMMA CHAT: No enrichment state found for memory:', memoryId);
      return;
    }

    // Initialize enrichment stages
    if (!state.stagesCompleted) {
      state.stagesCompleted = [];
    }
    
    // Update state
    this.enrichmentState.set(memoryId, state);

    // Start with first enrichment question
    this.addMessage("Now let me help you create a beautiful memory capsule! I'd love to gather some more details to make this memory really special.", 'emma');
    
    // Ask the first enrichment question
    this.askNextEnrichmentQuestion(memoryId);
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
  }  /**
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
      const messageId = this.addMessage(question, 'emma', {
        type: 'enrichment-question',
        memoryId: memoryId,
        stage: nextStage
      });

      // If asking for media, show elegant file upload interface
      if (nextStage === 'media') {
        setTimeout(() => {
          this.showMediaUploadInterface(messageId, memoryId);
        }, 800);
      }

      if (this.debugMode) {

      }
    }, delay);
  }

  /**
   * Complete enrichment and show preview for final save
   */
  completeEnrichmentAndShowPreview(memoryId) {

    const state = this.enrichmentState.get(memoryId);
    if (!state) {
      console.error('🎯 ENRICHMENT: No state found for memory:', memoryId);
      return;
    }

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
      attachments: (state.collectedData.media || []).map(mediaItem => {
        console.log('🔥 ENRICHMENT CONVERSION: Converting media item:', {
          id: mediaItem.id,
          name: mediaItem.name,
          type: mediaItem.type,
          hasDataUrl: !!mediaItem.dataUrl,
          dataUrlStart: mediaItem.dataUrl ? mediaItem.dataUrl.substring(0, 50) : 'none'
        });

        const convertedItem = {
          id: mediaItem.id,
          name: mediaItem.name,
          type: mediaItem.type,
          size: mediaItem.size,
          data: mediaItem.dataUrl || mediaItem.data // Try both dataUrl and data properties
        };

        return convertedItem;
      })
    };

    console.log('🔥 FINAL ENRICHED MEMORY:', {
      memoryId: enrichedMemory.id,
      attachmentCount: enrichedMemory.attachments?.length || 0,
      attachments: enrichedMemory.attachments || [],
      hasDataInAttachments: enrichedMemory.attachments?.every(att => !!att.data) || false
    });

    if (this.debugMode) {

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

    }

    // Extract information based on current stage
    switch (currentStage) {
      case 'who':
        // CRITICAL FIX: extractPeopleFromResponse is now async and creates people in vault
        state.collectedData.people = await this.extractPeopleFromResponse(userResponse);
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
   * Extract people names from user response and create them in vault if needed
   * CTO CRITICAL FIX: Actually persist people to vault, don't just extract names!
   */
  async extractPeopleFromResponse(response) {
    const people = [];
    const text = response.toLowerCase();

    // Handle "no one" or "alone" responses first
    if (/\b(no one|nobody|alone|just me|by myself)\b/i.test(text)) {
      return [];
    }

    const detectedNames = [];

    // Common relationship terms
    const relationships = ['mom', 'dad', 'mother', 'father', 'sister', 'brother', 'friend', 'husband', 'wife', 'son', 'daughter', 'grandmother', 'grandfather', 'grandma', 'grandpa', 'uncle', 'aunt', 'cousin'];
    relationships.forEach(rel => {
      if (text.includes(rel)) {
        detectedNames.push({
          name: rel.charAt(0).toUpperCase() + rel.slice(1),
          relationship: rel
        });
      }
    });

    // Extract proper names (capitalized words)
    const words = response.split(/\s+/);
    words.forEach(word => {
      const clean = word.replace(/[^A-Za-z]/g, '');
      if (/^[A-Z][a-z]+$/.test(clean) && clean.length > 2) {
        // Skip common non-name words
        const skipWords = ['The', 'And', 'But', 'For', 'With', 'This', 'That', 'When', 'Where', 'What', 'How', 'Yes', 'His', 'Her', 'She', 'Him'];
        if (!skipWords.includes(clean)) {
          detectedNames.push({
            name: clean,
            relationship: 'friend' // default relationship
          });
        }
      }
    });

    // Remove duplicates by name
    const uniqueNames = detectedNames.filter((person, index, self) => 
      index === self.findIndex(p => p.name.toLowerCase() === person.name.toLowerCase())
    );

    console.log('👥 EMMA CHAT: Detected people in response:', uniqueNames);

    // Create or find each person in the vault
    for (const personData of uniqueNames) {
      try {
        const personId = await this.findOrCreatePerson(personData.name, personData.relationship);
        if (personId) {
          people.push(personId);
        }
      } catch (error) {
        console.error('👥 EMMA CHAT: Failed to create person:', personData.name, error);
        // Continue with other people if one fails
      }
    }

    console.log('👥 EMMA CHAT: Final people IDs for memory:', people);
    return people;
  }

  /**
   * Find existing person or create new one in vault
   */
  async findOrCreatePerson(name, relationship = 'friend') {
    try {
      // Check if we have vault access
      if (!window.emmaWebVault || !window.emmaWebVault.isOpen) {
        console.warn('👥 EMMA CHAT: No vault access for person creation');
        return null;
      }

      // Get existing people from vault
      const existingPeople = await window.emmaWebVault.listPeople();
      console.log('👥 EMMA CHAT: Checking against existing people:', existingPeople?.length || 0);

      // Check if person already exists (case-insensitive)
      const existingPerson = existingPeople.find(person => 
        person.name && person.name.toLowerCase() === name.toLowerCase()
      );

      if (existingPerson) {
        console.log('👥 EMMA CHAT: Found existing person:', existingPerson.name, existingPerson.id);
        return existingPerson.id;
      }

      // Create new person
      console.log('👥 EMMA CHAT: Creating new person:', name, 'with relationship:', relationship);
      const newPerson = await window.emmaWebVault.addPerson({
        name: name,
        relationship: relationship,
        createdAt: new Date().toISOString(),
        createdBy: 'emma-chat'
      });

      console.log('✅ EMMA CHAT: Created new person:', newPerson);
      return newPerson.id || newPerson.person?.id;

    } catch (error) {
      console.error('❌ EMMA CHAT: Failed to find/create person:', name, error);
      return null;
    }
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

  /**
   * Show media upload interface when Emma asks for photos/videos
   */
  showMediaUploadInterface(messageId, memoryId) {

    const messageEl = document.getElementById(messageId);
    if (!messageEl) {
      console.error('📷 UPLOAD: Message element not found:', messageId);
      return;
    }

    const uploadId = `upload-${Date.now()}`;
    const uploadHTML = `
      <div class="emma-simple-upload" id="${uploadId}">
        <input type="file"
               class="file-input-hidden"
               id="${uploadId}-input"
               multiple
               accept="image/*,video/*,audio/*"
               onchange="window.chatExperience.handleEnrichmentFileSelect(event, '${memoryId}', '${uploadId}')">

        <div class="upload-button-container">
          <button class="emma-file-btn" onclick="document.getElementById('${uploadId}-input').click(); event.stopPropagation();">
            📷 Choose Photos & Videos
          </button>
          <button class="emma-skip-btn" onclick="window.chatExperience.skipMediaUpload('${memoryId}')">
            ⏭️ Continue Without Photos
          </button>
          <div class="upload-formats">JPG, PNG, MP4, MOV, etc.</div>
        </div>

        <div class="file-preview-area" id="${uploadId}-preview" style="display: none;">
          <!-- File previews will appear here -->
        </div>

        <div class="upload-status" id="${uploadId}-status" style="display: none;">
          <div class="upload-success">✅ Files added to memory</div>
        </div>
      </div>
    `;

    // Add to Emma's message content
    const contentContainer = messageEl.querySelector('.message-content');
    if (contentContainer) {
      contentContainer.insertAdjacentHTML('beforeend', uploadHTML);

      // Auto-scroll to show upload area
      setTimeout(() => this.scrollToBottom(), 300);
    } else {
      console.error('📷 UPLOAD: Content container not found in message');
    }
  }

  /**
   * Setup drag and drop for file upload
   */
  setupFileUploadDragDrop(uploadArea, memoryId, uploadId) {
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.processEnrichmentFiles(files, memoryId, uploadId);
      }
    });

    uploadArea.addEventListener('click', () => {
      const fileInput = uploadArea.querySelector('.file-input-hidden');
      if (fileInput) fileInput.click();
    });
  }

  /**
   * Handle file selection from input
   */
  async handleEnrichmentFileSelect(event, memoryId, uploadId) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    await this.processEnrichmentFiles(files, memoryId, uploadId);
  }

  /**
   * Process files for enrichment
   */
  async processEnrichmentFiles(files, memoryId, uploadId) {
    const state = this.enrichmentState.get(memoryId);
    if (!state) return;

    const previewArea = document.getElementById(`${uploadId}-preview`);
    const actionsArea = document.getElementById(`${uploadId}-actions`);

    if (!state.collectedData.media) {
      state.collectedData.media = [];
    }

    for (const file of Array.from(files)) {
      try {
        // Validate file type
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
          this.showToast(`❌ "${file.name}" is not a supported media file`, 'error');
          continue;
        }

        this.showToast(`📷 Processing ${file.name}...`, 'info');

        // Convert to data URL
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Add to collected media
        const mediaItem = {
          id: 'media_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: dataUrl,
          uploadedAt: Date.now()
        };

        state.collectedData.media.push(mediaItem);
        this.enrichmentState.set(memoryId, state);

        // Show preview
        this.addFilePreview(mediaItem, `${uploadId}-preview`);

        this.showToast(`✅ ${file.name} ready to add!`, 'success');

      } catch (error) {
        console.error('📷 Error processing file:', error);
        this.showToast(`❌ Failed to process ${file.name}`, 'error');
      }
    }

    // Show preview and auto-progress if files were added
    if (state.collectedData.media.length > 0) {
      previewArea.style.display = 'block';

      // Show status instead of manual buttons
      const statusArea = document.getElementById(`${uploadId}-status`);
      if (statusArea) {
        statusArea.style.display = 'block';
      }

      // Auto-progress after showing preview
      setTimeout(() => {
        const mediaCount = state.collectedData.media.length;
        this.addMessage(`Perfect! I've added ${mediaCount} ${mediaCount === 1 ? 'file' : 'files'} to your memory. Let me put together a beautiful memory capsule for you to review.`, 'emma');

        // Mark media stage as completed and continue
        state.stagesCompleted.push('media');
        this.enrichmentState.set(memoryId, state);

        // Continue to completion
        setTimeout(() => {
          this.completeEnrichmentAndShowPreview(memoryId);
        }, 1500);

      }, 1000); // Brief delay to show the files were added

      setTimeout(() => this.scrollToBottom(), 300);
    }
  }

  /**
   * Add file preview item
   */
  addFilePreview(mediaItem, previewAreaId) {
    const previewArea = document.getElementById(previewAreaId);
    if (!previewArea) return;

    const previewHTML = `
      <div class="file-preview-item" id="preview-${mediaItem.id}">
        <div class="file-preview-icon">
          ${mediaItem.type.startsWith('image/')
            ? `<img src="${mediaItem.dataUrl}" alt="${mediaItem.name}">`
            : mediaItem.type.startsWith('video/')
            ? '🎥'
            : '🎵'}
        </div>
        <div class="file-preview-info">
          <div class="file-preview-name">${mediaItem.name}</div>
          <div class="file-preview-size">${this.formatFileSize(mediaItem.size)}</div>
        </div>
        <button class="file-remove-btn" onclick="window.chatExperience.removeEnrichmentFile('${mediaItem.id}', '${previewAreaId}')">
          ✕
        </button>
      </div>
    `;

    previewArea.insertAdjacentHTML('beforeend', previewHTML);
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Remove file from enrichment
   */
  removeEnrichmentFile(mediaId, previewAreaId) {
    // Remove from all enrichment states
    for (const [memoryId, state] of this.enrichmentState) {
      if (state.collectedData.media) {
        state.collectedData.media = state.collectedData.media.filter(m => m.id !== mediaId);
        this.enrichmentState.set(memoryId, state);
      }
    }

    // Remove preview element
    const previewElement = document.getElementById(`preview-${mediaId}`);
    if (previewElement) {
      previewElement.remove();
    }

    // Hide preview area if no files left
    const previewArea = document.getElementById(previewAreaId);
    if (previewArea && previewArea.children.length === 0) {
      previewArea.style.display = 'none';
    }
  }

  /**
   * Confirm media upload and continue enrichment
   */
  async confirmMediaUpload(memoryId, uploadId) {
    const state = this.enrichmentState.get(memoryId);
    if (!state) return;

    const mediaCount = state.collectedData.media?.length || 0;

    if (mediaCount > 0) {
      this.addMessage(`Perfect! I've added ${mediaCount} ${mediaCount === 1 ? 'file' : 'files'} to your memory. Let me put together a beautiful memory capsule for you to review.`, 'emma');
    } else {
      this.addMessage("No worries! We can always add photos later. Let me create your memory capsule.", 'emma');
    }

    // Mark media stage as completed and continue
    state.stagesCompleted.push('media');
    this.enrichmentState.set(memoryId, state);

    // Continue to completion
    setTimeout(() => {
      this.completeEnrichmentAndShowPreview(memoryId);
    }, 1500);
  }

  /**
   * Skip media upload and continue enrichment
   */
  skipMediaUpload(memoryId) {
    const state = this.enrichmentState.get(memoryId);
    if (!state) return;

    this.addMessage("That's perfectly fine! Your words paint a beautiful picture. Let me create your memory capsule.", 'emma');

    // Mark media stage as completed and continue
    state.stagesCompleted.push('media');
    this.enrichmentState.set(memoryId, state);

    // Continue to completion
    setTimeout(() => {
      this.completeEnrichmentAndShowPreview(memoryId);
    }, 1500);
  }

  /**
   * Generate stage-specific acknowledgment for enrichment
   */
  generateStageAcknowledgment(stage, collectedData) {
    const acknowledgments = {
      who: "Thank you for sharing who was there with you.",
      when: "That timing helps me understand the context better.",
      where: "The setting adds such important detail to your memory.",
      emotion: "Those feelings are such an important part of this memory.",
      media: "Thank you for letting me know about photos and videos."
    };

    return acknowledgments[stage] || "Thank you for sharing that detail.";
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
