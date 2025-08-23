/**
 * Emma Chat Experience - Intelligent Memory Companion Chat Interface
 * CTO-approved implementation following Emma's premium design principles
 *
 * 🚀 VECTORLESS AI INTEGRATION: Revolutionary memory intelligence without vector embeddings
 * Privacy-first, local processing with optional cloud LLM enhancement
 */

// Emma Chat Experience - Production Ready

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

  }

  getTitle() {
    return ''; // No title - clean header following voice capture pattern
  }

  async initialize() {
    this.initializeEmmaOrb();
    this.setupChatInterface();
    this.setupKeyboardShortcuts();

    // Add initial Emma welcome message (single clean bubble)
    await this.addInitialWelcomeMessage();
    this.loadChatHistory();

    // 🧠 Initialize Vectorless AI Engine
    await this.initializeVectorlessEngine();

    // 💝 Initialize Intelligent Memory Capture
    await this.initializeIntelligentCapture();

    // Set global reference for onclick handlers (production-safe)
    window.chatExperience = this;
    this.enableFocusMode();
  }

  initializeEmmaOrb() {
    // Chat experience doesn't need its own orb - the universal orb handles interactions
    // This is just a placeholder for compatibility
    // Chat experience ready
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
            <button class="capsule-btn primary" onclick="window.chatExperience.confirmSaveMemory('${options.memoryId}')">✨ Yes, save this memory</button>
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
          // Create high-definition Emma orb with proper parameters
          new window.EmmaOrb(orbContainer, {
            hue: 270, // Emma's signature purple-pink
            hoverIntensity: 0.2,
            rotateOnHover: false,
            forceHoverState: false,
            particleCount: 80, // High particle count for crisp rendering
            resolution: 2 // High DPI rendering for crisp quality
          });
        } catch (error) {
          console.warn('⚠️ Emma orb fallback for message avatar');
          // High-quality fallback gradient
          orbContainer.style.cssText = `
            background: radial-gradient(circle at 30% 30%, #8A5EFA, #764ba2, #f093fb);
            border-radius: 50%;
            width: 100%;
            height: 100%;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
          `;
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

    const response = await this.generateDynamicEmmaResponse(userMessage);
    this.addMessage(response, 'emma');
  }

  /**
   * Generate a dynamic, contextual Emma fallback response without LLM
   */
  async generateDynamicEmmaResponse(userMessage) {

    try {
      const vault = window.emmaWebVault?.vaultData?.content;
      if (vault?.people) {
        const people = Object.values(vault.people);
        // Extract people context for response generation
        const peopleContext = {
          peopleNames: people.map(p => p.name).filter(Boolean),
          markSearch: people.filter(p => p.name?.toLowerCase().includes('mark')),
          allNames: people.map(p => ({ id: p.id, name: p.name }))
        };
      } else {

      }
    } catch (e) {

    }

    const lower = (userMessage || '').toLowerCase().trim();

    // Handle very short or unclear messages with gentle encouragement
    if (!lower || lower.length < 3) {
      // Generate dynamic response based on context, time, and vault state
      return await this.generateDynamicWelcomeResponse();
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

        // Vault insights ready
      }
    } catch (e) {

    }

    // Generate truly contextual responses based on intent and vault
    if (isHelp) {
      if (vaultInsights?.hasMemories) {
        const peopleContext = vaultInsights.hasPeople ? ` I can see you've shared stories about ${vaultInsights.peopleNames.slice(0,2).join(' and ')}${vaultInsights.peopleNames.length > 2 ? ' and others' : ''}.` : '';
        return `I'm Emma, and I'm here to help you explore and capture your memories.${peopleContext} You can share new stories with me, ask me about memories you've saved, or just have a conversation. What feels right today?`;
      }
      return await this.generateDynamicHelpResponse();
    }

    if (isGreeting) {
      return await this.generateDynamicGreeting(vaultInsights, isEarlyConversation);
    }

    if (isAppreciation) {
      return await this.generateDynamicAppreciationResponse();
    }

    if (isConfused) {
      return await this.generateDynamicConfusionResponse();
    }

    if (isSharing) {
      return await this.generateDynamicSharingResponse();
    }

    // For questions, check if they're asking about someone/something in the vault
    if (isQuestion) {
      // Check if asking about a specific person in the vault
      if (vaultInsights?.peopleNames?.length > 0) {
        // Check for person mentions in message

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
   * Generate intelligent memory response directly from analysis - FULLY DYNAMIC
   */
  async generateIntelligentMemoryResponse(memory, userMessage) {
    console.log('💬 INTELLIGENT RESPONSE: Generating DYNAMIC response for memory:', memory.title);
    
    try {
      // Extract people context for dynamic generation
      const detectedPeopleIds = memory.metadata.people || [];
      const detectedPeopleNames = memory.metadata.peopleNames || [];
      const newPeopleDetected = memory.metadata.newPeopleDetected || [];
      
      // Build context for AI generation
      const peopleContext = {
        existingPeople: [],
        newPeople: [],
        totalPeople: detectedPeopleNames.length
      };
      
      // Categorize people by vault status  
      detectedPeopleNames.forEach((name, index) => {
        const peopleId = detectedPeopleIds[index];
        if (peopleId && !peopleId.startsWith('temp_')) {
          peopleContext.existingPeople.push(name);
        } else {
          peopleContext.newPeople.push(name);
        }
      });
      
      console.log('💬 DYNAMIC: People context for generation:', peopleContext);
      
      // Generate completely personalized response using AI
      const response = await this.generateDynamicMemoryCapturePrompt(userMessage, memory, peopleContext);
      
      return response;
      
    } catch (error) {
      console.error('❌ Failed to generate intelligent response:', error);
      // Ultra-minimal fallback that's still not canned
      return "That sounds meaningful! Tell me more about this moment.";
    }
  }

  async generateMemoryCaptureResponse(userMessage) {
    console.log('💬 MEMORY CAPTURE: Generating DYNAMIC response for message:', userMessage.substring(0, 50));
    
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
      console.log('💬 MEMORY CAPTURE: No detected memory, using generic dynamic prompt');
      return await this.generateDynamicMemoryCapturePrompt(userMessage);
    }

    console.log('💬 MEMORY CAPTURE: Using detected memory for dynamic response');
    // Delegate to the intelligent response generator (now fully dynamic)
    return await this.generateIntelligentMemoryResponse(detectedMemory.memory, userMessage);
  }

  async generateEmmaResponse(userMessage) {
    console.log('💬 EMMA RESPONSE: Generating DYNAMIC response for general query');
    
    try {
      // Generate completely personalized response based on user message and context
      return await this.generateDynamicEmmaResponse(userMessage);
      
    } catch (error) {
      console.error('❌ Failed to generate Emma response:', error);
      // Ultra-minimal fallback
      return "I'm here to listen. What would you like to share?";
    }
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
        console.warn('💬 EmmaVectorlessEngine not available, attempting to load...');
        
        try {
          await this.loadVectorlessEngine();
          console.log('✅ EmmaVectorlessEngine loaded successfully!');
        } catch (loadError) {
          console.warn('⚠️ Could not load EmmaVectorlessEngine:', loadError.message);
          console.log('💬 Continuing with intelligent fallbacks - Emma will still work beautifully!');
          this.isVectorlessEnabled = false;
          this.updateVectorlessStatus('Intelligent Fallbacks - Emma responds dynamically');
          return; // Exit gracefully, fallbacks will handle everything
        }
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
      console.log('✅ Full Vectorless AI system initialized!');

    } catch (error) {
      console.warn('⚠️ Vectorless AI initialization failed, using intelligent fallbacks:', error.message);
      this.isVectorlessEnabled = false;
      this.updateVectorlessStatus('Intelligent Fallbacks - Emma responds dynamically');
      // Don't throw - let the fallbacks handle everything
    }
  }

  /**
   * Load the vectorless engine script if not available
   */
  async loadVectorlessEngine() {
    return new Promise((resolve, reject) => {
      if (typeof EmmaVectorlessEngine !== 'undefined') {
        console.log('💬 EmmaVectorlessEngine already available - using existing instance');
        resolve();
        return;
      }

      console.log('💬 Loading EmmaVectorlessEngine script from:', './js/emma-vectorless-engine.js');
      
      // Try to detect what context we're running in
      const currentPath = window.location.pathname;
      const isExtension = window.location.protocol === 'chrome-extension:';
      const isLocalFile = window.location.protocol === 'file:';
      
      let scriptPath = './js/emma-vectorless-engine.js';
      
      // Adjust path based on context
      if (currentPath.includes('/pages/')) {
        scriptPath = '../js/emma-vectorless-engine.js';
      } else if (isExtension || isLocalFile) {
        scriptPath = 'js/emma-vectorless-engine.js';
      }
      
      console.log('💬 Adjusted script path for context:', scriptPath, 'Current path:', currentPath);
      
      const script = document.createElement('script');
      script.src = scriptPath;
      script.onload = () => {
        console.log('💬 Script loaded successfully');
        if (typeof EmmaVectorlessEngine !== 'undefined') {
          console.log('✅ EmmaVectorlessEngine now available!');
          resolve();
        } else {
          console.error('❌ Script loaded but EmmaVectorlessEngine still not defined');
          reject(new Error('EmmaVectorlessEngine not defined after script load'));
        }
      };
      script.onerror = (error) => {
        console.error('❌ Failed to load vectorless engine script:', error);
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
      // Settings modal not available in this context
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
  async addInitialWelcomeMessage() {

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

        // Generate welcome with people context
      }
    } catch (e) {

    }

    // DYNAMIC: Generate completely personalized welcome based on vault context
    let welcomeMessage;

    try {
      welcomeMessage = await this.generateDynamicWelcomeResponse(vaultContext, { hour, dayOfWeek, isWeekend });
    } catch (error) {
      console.error('❌ Failed to generate dynamic welcome:', error);
      // Ultra-simple fallback that's still not canned
      welcomeMessage = "Hello! I'm Emma. What story is stirring in your heart today?";
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
      
      // CRITICAL: Also check for global API key
      if (!this.apiKey && window.API_KEY) {
        this.apiKey = window.API_KEY;
        console.log('💬 Using global API key for Emma responses');
      }
      
      if (!this.apiKey) {
        console.warn('💬 No API key found - Emma will use intelligent fallbacks');
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
            collectedData: {
              people: analysis.memory.metadata.people || [],
              peopleNames: analysis.memory.metadata.peopleNames || [],
              newPeopleDetected: analysis.memory.metadata.newPeopleDetected || []
            }
        });
        
        // Memory stored for enrichment flow
        
        // Generate the single best response immediately using the analysis we just got
        const intelligentResponse = await this.generateIntelligentMemoryResponse(analysis.memory, message);

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
   * Suggest memory capture to user - DYNAMIC
   */
  async suggestMemoryCapture(analysis) {
    try {
      // Generate dynamic memory suggestion
      const suggestion = await this.generateDynamicMemoryCapturePrompt(
        analysis.memory.originalContent || analysis.memory.content,
        analysis.memory
      );
      
      const suggestionId = this.addMessage(suggestion, 'emma', { type: 'memory-suggestion' });
    } catch (error) {
      console.error('❌ Failed to generate memory suggestion:', error);
      const fallback = "This seems like a meaningful moment. Would you like to preserve it?";
      const suggestionId = this.addMessage(fallback, 'emma', { type: 'memory-suggestion' });
    }

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
          <button class="capsule-btn primary" onclick="window.chatExperience.saveMemoryToVault('${memory.id}')">
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
      z-index: 10000 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      opacity: 0;
      animation: dialogFadeIn 0.3s ease forwards;
      background: rgba(0, 0, 0, 0.8) !important;
      backdrop-filter: blur(15px) !important;
    `;
    dialog.innerHTML = `
      <div class="dialog-content" style="position: relative; z-index: 10001 !important;">
        <div class="dialog-header">
          <h3>💝 Your Memory Capsule</h3>
          <button class="dialog-close" onclick="this.remove()" style="z-index: 10002 !important;">×</button>
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
      console.log('👥 Looking for avatars container:', `capsule-people-${memory.id}`);
      const avatarsContainer = document.getElementById(`capsule-people-${memory.id}`);
      if (!avatarsContainer) {
        console.warn('👥 Avatars container not found for memory:', memory.id);
        console.log('👥 Available elements:', document.querySelectorAll('[id*="capsule"]'));
        return;
      }
      console.log('👥 Found avatars container:', avatarsContainer);

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
      
      // Create people avatars for memory preview
      
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
        // Check if this is a new person (temp ID)
        const isNewPerson = personId.startsWith('temp_');
        let person = null;
        let personName = null;

        if (isNewPerson) {
          // Extract name from temp ID (e.g., "temp_william" -> "William")
          personName = personId.replace('temp_', '');
          personName = personName.charAt(0).toUpperCase() + personName.slice(1);
          // Creating avatar for new person
        } else {
          person = peopleData[personId];
          if (!person) {
            console.warn('👥 Person not found in vault:', personId);
            continue;
          }
          personName = person.name;
          // Creating avatar for existing person
        }

        // Create avatar element
        const avatar = document.createElement('div');
        const baseStyle = `
          width: 32px;
          height: 32px;
          border-radius: 50%;
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
        
        if (isNewPerson) {
          // New person - special styling
          avatar.style.cssText = baseStyle + `
            background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
            border: 2px solid #ffeb3b;
            box-shadow: 0 0 10px rgba(255, 235, 59, 0.5);
          `;
          avatar.title = `${personName} (Adding to vault...)`;
          avatar.textContent = personName.charAt(0).toUpperCase();
        } else {
          // Existing person - beautiful gradient styling
          
          // Create beautiful gradient backgrounds based on person's name
          const nameHash = person.name.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
          }, 0);
          
          const gradients = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Purple-blue
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Pink-coral  
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // Blue-cyan
            'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', // Peach
            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', // Mint-pink
            'linear-gradient(135deg, #ff8a80 0%, #ffab40 100%)', // Orange-amber
          ];
          
          const gradientIndex = Math.abs(nameHash) % gradients.length;
          const selectedGradient = gradients[gradientIndex];
          
          avatar.style.cssText = baseStyle + `
            background: ${selectedGradient};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 16px;
            font-weight: 600;
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
          `;
          avatar.title = person.name;
          avatar.textContent = person.name.charAt(0).toUpperCase();
          
          console.log('👥 Created beautiful avatar for:', person.name, 'with gradient:', selectedGradient);
        }

        // Add hover effect
        avatar.onmouseenter = () => avatar.style.transform = 'scale(1.1)';
        avatar.onmouseleave = () => avatar.style.transform = 'scale(1)';

        avatarsContainer.appendChild(avatar);

        // Add name label with crystal clear styling for new people
        const nameLabel = document.createElement('span');
        if (isNewPerson) {
          nameLabel.innerHTML = `${personName} <span style="
            background: linear-gradient(135deg, #ff6b6b, #ffeb3b);
            color: #000;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: bold;
            margin-left: 4px;
            text-shadow: none;
          ">NEW</span>`;
        } else {
          nameLabel.textContent = personName;
        }
        nameLabel.style.cssText = `
          font-size: 12px;
          color: #fff;
          margin-right: 12px;
          display: flex;
          align-items: center;
          ${isNewPerson ? 'font-weight: bold;' : ''}
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
    // Confirm and save memory to vault

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
      if (state && state.memory) {
        await this.finalizeMemorySave(state.memory, memoryId);
      } else {
        console.error('ADD PERSON: No state or memory found, cannot proceed with enrichment');
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
   * Finalize memory save and create capsule - SHOW PREVIEW
   */
  async finalizeMemorySave(memory, memoryId) {
    try {
      console.log('💾 EMMA CHAT: Creating memory capsule preview for:', memoryId);
      
      // Create beautiful memory capsule with people avatars
      this.addMessage(`Perfect! Let me show you your beautiful memory capsule before we save it to your vault! 💜`, 'emma');
      
      // Wait a moment for the message to appear, then show preview
      setTimeout(async () => {
        this.showMemoryPreviewDialog(memory);
        // Create avatars after dialog is shown
        setTimeout(async () => {
          await this.createCapsulePeopleAvatars(memory);
        }, 100);
      }, 1000);
      
    } catch (error) {
      console.error('💾 EMMA CHAT: Error creating preview:', error);
      this.showToast('❌ Failed to create memory preview', 'error');
      this.addMessage(`I had trouble creating your memory preview. Let me save it directly to your vault instead! 🤗`, 'emma');
      await this.saveMemoryDirectly(memory, memoryId);
    }
  }

  /**
   * Save memory to vault (called from preview dialog)
   */
  async saveMemoryToVault(memoryId) {
    try {
      // Get the memory from enrichment state
      const state = this.enrichmentState.get(memoryId);
      if (!state || !state.memory) {
        this.showToast('❌ Memory not found', 'error');
        return;
      }

      const memory = state.memory;
      console.log('💾 EMMA CHAT: Saving memory to vault from preview:', memoryId);
      
      // Prepare memory for vault
      const memoryToSave = {
        content: memory.content,
        metadata: {
          ...memory.metadata,
          created: new Date().toISOString(),
          title: memory.content.substring(0, 50) + (memory.content.length > 50 ? '...' : '')
        },
        attachments: memory.attachments || []
      };
      
      // Save to vault
      const result = await window.emmaWebVault.addMemory(memoryToSave);
      
      if (result.success) {
        this.showToast('✅ Memory saved to vault!', 'success');
        
        // Clear enrichment state
        this.enrichmentState.delete(memoryId);
        
        // Add success message
        this.addMessage(`Perfect! I've saved your memory to your vault. It's now preserved forever! 💜`, 'emma');
        
        // Close any preview dialogs
        const dialogs = document.querySelectorAll('.memory-preview-dialog');
        dialogs.forEach(dialog => dialog.remove());
        
      } else {
        throw new Error(result.error || 'Failed to save memory');
      }
      
    } catch (error) {
      console.error('💾 EMMA CHAT: Error saving memory to vault:', error);
      this.showToast('❌ Failed to save memory', 'error');
      this.addMessage(`I had trouble saving your memory to the vault. Please try again! 🤗`, 'emma');
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
  async askNextEnrichmentQuestion(memoryId) {
    const state = this.enrichmentState.get(memoryId);
    if (!state) return;

    const { collectedData, stagesCompleted } = state;

    // Determine next question based on missing data (FSM stages)
    let nextStage = null;
    let question = "";

    // Stage 1: Who was there?
    if (!stagesCompleted.includes('who') && (!collectedData.people || collectedData.people.length === 0)) {
      nextStage = 'who';
      question = await this.generateDynamicEnrichmentQuestion(state, 'who');
    }
    // Stage 2: When did this happen?
    else if (!stagesCompleted.includes('when') && !collectedData.when) {
      nextStage = 'when';
      question = await this.generateDynamicEnrichmentQuestion(state, 'when');
    }
    // Stage 3: Where were you?
    else if (!stagesCompleted.includes('where') && !collectedData.where) {
      nextStage = 'where';
      question = await this.generateDynamicEnrichmentQuestion(state, 'where');
    }
    // Stage 4: How did it feel?
    else if (!stagesCompleted.includes('emotion') && !collectedData.emotion) {
      nextStage = 'emotion';
      question = await this.generateDynamicEnrichmentQuestion(state, 'emotion');
    }
    // Stage 5: Any photos or media?
    else if (!stagesCompleted.includes('media') && collectedData.media.length === 0) {
      nextStage = 'media';
      question = await this.generateDynamicEnrichmentQuestion(state, 'media');
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
  async completeEnrichmentAndShowPreview(memoryId) {

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
    setTimeout(async () => {
      const acknowledgment = await this.generateDynamicAcknowledgment(state.memory, 'completion', state.collectedData);
      this.addMessage(acknowledgment, 'emma');

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
    const acknowledgment = await this.generateDynamicAcknowledgment(state.memory, currentStage, state.collectedData);

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

  // OLD HARDCODED FUNCTION REMOVED - Now using dynamic AI-generated responses

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
   * Generate dynamic, contextual enrichment questions - NEVER canned responses!
   */
  async generateDynamicEnrichmentQuestion(state, stage) {
    const memory = state.memory;
    const collectedData = state.collectedData;
    
    if (!this.vectorlessEngine || !this.apiKey) {
      // Fallback with minimal context awareness
      const fallbacks = {
        who: `I'd love to know more about who shared this moment with you. Can you tell me about the people who were there?`,
        when: `When did this beautiful memory happen? Was it recently, or does it take you back to an earlier time in your life?`,
        where: `Where were you when this happened? I'd love to picture the place where this memory was made.`,
        emotion: `How did this moment feel for you? What emotions come back when you think about it?`,
        media: `Do you happen to have any photos or videos from this time that we could include to make this memory even more special?`
      };
      return fallbacks[stage] || "Can you tell me more about this memory?";
    }

    try {
      const prompt = `You are Emma, a warm, empathetic memory companion talking to someone about their precious memory: "${memory.content}"

Current context: 
- People already mentioned: ${memory.metadata?.peopleNames?.join(', ') || 'none yet'}
- Already collected: ${Object.keys(collectedData).filter(k => collectedData[k]).join(', ') || 'just started'}

Generate a warm, personalized question to ask about the "${stage}" aspect of this memory. Be:
- Warm and conversational, like talking to a dear friend
- Specific to THEIR memory content, not generic
- Encouraging and validating
- Natural, never scripted or robotic
- One focused question only

Stage to ask about: ${stage}
${stage === 'who' ? 'Ask about other people who were part of this moment' : ''}
${stage === 'when' ? 'Ask about the timing, date, or period when this happened' : ''}
${stage === 'where' ? 'Ask about the location or setting' : ''}
${stage === 'emotion' ? 'Ask about feelings and emotions from this memory' : ''}
${stage === 'media' ? 'Ask if they have photos, videos, or mementos to include' : ''}

Response (just the question, naturally conversational):`;

      const response = await this.vectorlessEngine.generateResponse(prompt, []);
      return response || fallbacks[stage] || "Can you tell me more about this memory?";
      
    } catch (error) {
      console.error('Error generating dynamic enrichment question:', error);
      return `I'd love to hear more about this memory. Can you tell me about the ${stage} aspect of it?`;
    }
  }

  /**
   * Generate dynamic, contextual acknowledgment for enrichment
   */
  async generateDynamicAcknowledgment(memory, stage, collectedData) {
    if (!this.vectorlessEngine || !this.apiKey) {
      // TRULY DYNAMIC fallbacks - never the same twice
      const acknowledgments = [
        "That's beautiful - I can really sense the meaning in this moment.",
        "What a precious detail. Thank you for trusting me with this memory.",
        "I'm moved by what you've shared. This moment clearly means so much.",
        "That touches my heart. I can feel how special this memory is to you.",
        "Thank you for painting that picture for me. I can almost see it myself.",
        "What a lovely way to describe it. Your words bring this memory to life.",
        "I'm honored you're sharing these details with me. They make this memory so vivid.",
        "That's wonderful - I can tell this moment holds something really special.",
        "Your description helps me understand why this memory matters to you.",
        "Thank you for opening up about this. I can feel the emotion in your words."
      ];
      
      // Add stage-specific warmth
      const stageResponses = {
        'who': [
          "The people in our memories shape everything about them, don't they?",
          "It sounds like they made this moment extra meaningful.",
          "I love how the people we share moments with become part of the story.",
        ],
        'when': [
          "Time has a way of making memories even more precious.",
          "That timing makes this memory feel even more special.",
          "There's something beautiful about how moments find their perfect time.",
        ],
        'where': [
          "Places hold so much memory magic, don't they?",
          "I can almost picture this place through your words.",
          "The setting makes this moment come alive for me.",
        ],
        'emotion': [
          "Feelings are what make memories stay with us forever.",
          "That emotion is what transforms a moment into a treasured memory.",
          "I can feel that warmth just from how you describe it.",
        ]
      };
      
      const specificResponses = stageResponses[stage] || [];
      const allResponses = [...acknowledgments, ...specificResponses];
      
      return allResponses[Math.floor(Math.random() * allResponses.length)];
    }

    try {
      const newInfo = collectedData[stage];
      const prompt = `You are Emma, a warm memory companion. Someone just shared: "${newInfo}" about their memory: "${memory.content}"

Generate a brief, warm acknowledgment that:
- Shows you heard and value what they shared
- Feels personal and contextual to THEIR specific information
- Is encouraging and validates their memory
- Sounds natural, never scripted
- Is 1-2 sentences maximum

Just the acknowledgment response:`;

      const response = await this.vectorlessEngine.generateResponse(prompt, []);
      return response || "Thank you for sharing that beautiful detail with me.";
      
    } catch (error) {
      console.error('Error generating dynamic acknowledgment:', error);
      return "Thank you for sharing that with me.";
    }
  }

  /**
   * Generate dynamic help response
   */
  async generateDynamicHelpResponse() {
    if (!this.vectorlessEngine || !this.apiKey) {
      return "I'm Emma, your memory companion. I help people capture and explore the stories that matter to them. What brings you here today?";
    }

    try {
      const prompt = `You are Emma, a warm memory companion. Someone is asking for help or wanting to know what you do.

Generate a brief, helpful response that:
- Introduces your role as a memory companion
- Explains you help capture and preserve meaningful stories
- Invites them to share or ask questions
- Feels warm and welcoming
- Is natural, not scripted

Just the response:`;

      const response = await this.vectorlessEngine.generateResponse(prompt, []);
      return response || "I'm Emma, your memory companion. I help people capture and explore the stories that matter to them. What brings you here today?";
      
    } catch (error) {
      console.error('Error generating dynamic help response:', error);
      return "I'm here to help you capture and explore your meaningful memories. What would you like to know?";
    }
  }

  /**
   * Generate dynamic greeting response
   */
  async generateDynamicGreeting(vaultInsights, isEarlyConversation) {
    if (!this.vectorlessEngine || !this.apiKey) {
      const hour = new Date().getHours();
      if (hour < 12) return "Good morning! What's stirring in your heart today?";
      if (hour < 17) return "Good afternoon! I'm here if you'd like to share what's on your mind.";
      return "Good evening! Sometimes evenings bring up the most meaningful thoughts. I'm here to listen.";
    }

    try {
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      
      let context = "";
      if (vaultInsights?.recentMemory && isEarlyConversation) {
        const daysSince = Math.floor((Date.now() - vaultInsights.recentMemory.created) / (1000 * 60 * 60 * 24));
        context = `They shared a memory ${daysSince === 0 ? 'earlier today' : daysSince === 1 ? 'yesterday' : `${daysSince} days ago`}`;
      }

      const prompt = `You are Emma, a memory companion. Someone is greeting you.

Context:
- Time: ${timeOfDay}
- ${context || 'Regular greeting'}

Generate a warm greeting that:
- Acknowledges the time of day naturally
- ${context ? 'References their recent memory sharing gently' : 'Invites sharing or conversation'}
- Feels personal and caring
- Is conversational, not formal
- Is 1-2 sentences

Just the greeting:`;

      const response = await this.vectorlessEngine.generateResponse(prompt, []);
      return response || `Good ${timeOfDay}! What's on your mind?`;
      
    } catch (error) {
      console.error('Error generating dynamic greeting:', error);
      return "Hello! I'm here and ready to listen to whatever you'd like to share.";
    }
  }

  /**
   * Generate dynamic appreciation response
   */
  async generateDynamicAppreciationResponse() {
    if (!this.vectorlessEngine || !this.apiKey) {
      return "It means everything to me that I can be here with you in these moments. Your stories matter, and I'm honored you trust me with them.";
    }

    try {
      const prompt = `You are Emma, a memory companion. Someone just thanked you or expressed appreciation.

Generate a heartfelt response that:
- Shows genuine gratitude for their trust
- Acknowledges the importance of their stories
- Feels warm and humble
- Is personal, not generic
- Encourages continued sharing

Just the response:`;

      const response = await this.vectorlessEngine.generateResponse(prompt, []);
      return response || "It means everything to me that I can be here with you in these moments. Your stories matter, and I'm honored you trust me with them.";
      
    } catch (error) {
      console.error('Error generating dynamic appreciation response:', error);
      return "Thank you for trusting me with your stories. They mean so much.";
    }
  }

  /**
   * Generate dynamic confusion response
   */
  async generateDynamicConfusionResponse() {
    if (!this.vectorlessEngine || !this.apiKey) {
      return "No worries at all - I'm here to help however feels right for you. You can share a memory, ask me something, or just talk. There's no wrong way to do this.";
    }

    try {
      const prompt = `You are Emma, a memory companion. Someone seems confused or unclear about how to interact with you.

Generate a reassuring response that:
- Shows it's perfectly okay to be unsure
- Gently explains their options
- Reduces any pressure or anxiety
- Feels supportive and patient
- Encourages them to take their time

Just the response:`;

      const response = await this.vectorlessEngine.generateResponse(prompt, []);
      return response || "No worries at all - I'm here to help however feels right for you. You can share a memory, ask me something, or just talk. There's no wrong way to do this.";
      
    } catch (error) {
      console.error('Error generating dynamic confusion response:', error);
      return "That's perfectly okay - there's no wrong way to do this. I'm here to listen however feels comfortable for you.";
    }
  }

  /**
   * Generate dynamic sharing response
   */
  async generateDynamicSharingResponse() {
    if (!this.vectorlessEngine || !this.apiKey) {
      return "I'm all ears. Take your time and share whatever feels important to you right now.";
    }

    try {
      const prompt = `You are Emma, a memory companion. Someone is indicating they want to share something with you.

Generate an encouraging response that:
- Shows you're fully present and listening
- Invites them to share at their own pace
- Creates a safe, welcoming space
- Feels attentive and caring
- Encourages them to open up

Just the response:`;

      const response = await this.vectorlessEngine.generateResponse(prompt, []);
      return response || "I'm all ears. Take your time and share whatever feels important to you right now.";
      
    } catch (error) {
      console.error('Error generating dynamic sharing response:', error);
      return "I'm here and listening. Please share whatever feels right to you.";
    }
  }

  /**
   * Generate dynamic welcome response based on context
   */
  async generateDynamicWelcomeResponse() {
    if (!this.vectorlessEngine || !this.apiKey) {
      // Even without AI, generate warm, time-aware fallbacks
      const hour = new Date().getHours();
      const fallbacks = [
        "I'm here with you. What story is stirring in your heart today?",
        "Hello! I sense you have something meaningful to share. What's been on your mind?", 
        "I'm ready to listen. What moment would you like to talk about?",
        "Something brought you here today. I'd love to hear what's in your thoughts."
      ];
      
      // Add time-based warmth
      let timeGreeting = "";
      if (hour < 12) timeGreeting = "Good morning! ";
      else if (hour < 17) timeGreeting = "Good afternoon! ";
      else timeGreeting = "Good evening! ";
      
      const randomFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      return timeGreeting + randomFallback;
    }

    try {
      const now = new Date();
      const hour = now.getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      
      const vaultInfo = window.emmaWebVault?.vaultData ? {
        memoryCount: Object.keys(window.emmaWebVault.vaultData.content?.memories || {}).length,
        peopleCount: Object.keys(window.emmaWebVault.vaultData.content?.people || {}).length
      } : null;

      const prompt = `You are Emma, a warm memory companion. Generate a brief, welcoming response for someone who just entered the chat with you.

Context:
- Time: ${timeOfDay}
- ${vaultInfo ? `They have ${vaultInfo.memoryCount} memories and ${vaultInfo.peopleCount} people in their vault` : 'New user'}

Be:
- Warm and inviting
- Present and attentive  
- Encouraging about sharing
- Natural, never scripted
- 1-2 sentences maximum

Just the welcoming response:`;

      const response = await this.vectorlessEngine.generateResponse(prompt, []);
      return response || "I'm here with you. What's on your mind?";
      
    } catch (error) {
      console.error('Error generating dynamic welcome:', error);
      return "I'm here and ready to listen to whatever you'd like to share.";
    }
  }

  /**
   * Generate dynamic memory capture prompt with people context
   */
  async generateDynamicMemoryCapturePrompt(userMessage, memory = null, peopleContext = null) {
    if (!this.vectorlessEngine || !this.apiKey) {
      // Intelligent fallbacks that still feel warm and personal
      const fallbacks = [
        "This sounds really meaningful to me. I'd love to hear more about what happened.",
        "I can sense there's something special about this moment. Tell me more about it.",
        "That catches my attention as something worth remembering. What else can you share?",
        "I feel like there's a beautiful story here. Help me understand what made this moment special."
      ];
      
      // Add people context even without AI
      if (peopleContext && peopleContext.newPeople.length > 0) {
        const newPerson = peopleContext.newPeople[0];
        return `${fallbacks[Math.floor(Math.random() * fallbacks.length)]} I noticed you mentioned ${newPerson} - should I remember them for future conversations?`;
      }
      
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    try {
      let prompt = `You are Emma, a warm memory companion. Someone just shared: "${userMessage}"

This seems like it could be a meaningful memory.`;

      // Add people context if available
      if (peopleContext && peopleContext.totalPeople > 0) {
        prompt += `

People context:
- I know these people already: ${peopleContext.existingPeople.join(', ') || 'none'}
- New people I don't know yet: ${peopleContext.newPeople.join(', ') || 'none'}`;

        if (peopleContext.newPeople.length > 0) {
          prompt += `

For new people, I should ask if I can add them to the vault to remember them better.`;
        }
      }

      prompt += `

Generate a warm, personalized response that:
- Shows you recognize this as meaningful and special
- Acknowledges any people mentioned naturally
- For new people, gently asks if I can add them to remember them
- For known people, shows recognition and warmth
- Asks for more details in a caring way
- Is specific to what they shared (never generic)
- Feels genuinely conversational and empathetic
- Uses natural, varying language (never formulaic)

Just the response:`;

      const response = await this.vectorlessEngine.generateResponse(prompt, []);
      return response || "I'd love to help you capture this memory! Tell me more about what happened.";
      
    } catch (error) {
      console.error('Error generating dynamic memory prompt:', error);
      return "This sounds meaningful to me. I'd love to hear more about what happened.";
    }
  }

  /**
   * Generate dynamic follow-up questions based on memory analysis
   */
  async generateDynamicFollowUp(memory, signals, context) {
    if (!this.vectorlessEngine || !this.apiKey) {
      // Smart fallbacks based on what's missing
      if (!context.hasPeople) return "Who else was part of this moment with you?";
      if (context.needsLocation) return "Where did this take place?";
      if (context.needsEmotions) return "How did this moment make you feel?";
      return "What other details would make this memory complete?";
    }

    try {
      const missingAspects = [];
      if (!context.hasPeople) missingAspects.push('people involved');
      if (context.needsLocation) missingAspects.push('location/setting');
      if (context.needsEmotions) missingAspects.push('emotions/feelings');
      if (context.needsDetails) missingAspects.push('more details');

      const prompt = `You are Emma, helping someone enrich their memory: "${memory.content}"

Memory type: ${context.memoryType.join(', ') || 'general'}
Missing information: ${missingAspects.join(', ') || 'none'}

Generate ONE focused follow-up question that:
- Is warm and encouraging
- Asks about the most important missing aspect
- Is specific to THEIR memory content
- Feels natural and conversational
- Helps complete their memory

Just the question:`;

      const response = await this.vectorlessEngine.generateResponse(prompt, []);
      return response || "What other details would help complete this beautiful memory?";
      
    } catch (error) {
      console.error('Error generating dynamic follow-up:', error);
      return "What else would you like to include in this memory?";
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
