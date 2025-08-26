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
    
    // 🎯 CRITICAL FIX: Add temporary memory storage for preview editing
    this.temporaryMemories = new Map(); // Store preview memories before vault save

    // 🤔 PERSON ENRICHMENT FLOW STATE
    this.currentPersonEnrichment = null; // Track active person enrichment conversations

    // Emma personality settings
    this.emmaPersonality = {
      name: "Emma",
      role: "Intelligent Memory Companion",
      tone: "warm, helpful, memory-focused",
      capabilities: ["memory insights", "capture suggestions", "conversation", "vectorless AI"]
    };

    // 🚀 CRITICAL: Initialize AI systems on startup
    this.initializeEmmaIntelligence();

  }

  getTitle() {
    return ''; // No title - clean header following voice capture pattern
  }

  /**
   * 🚀 INITIALIZE EMMA INTELLIGENCE SYSTEMS
   * Sets up API keys, vectorless engine, and intelligence capabilities
   */
  async initializeEmmaIntelligence() {
    console.log('🧠 Initializing Emma Intelligence Systems...');
    
    try {
      // Load vectorless settings (includes API key detection)
      this.loadVectorlessSettings();
      
      // Initialize vectorless engine for memory search
      await this.initializeVectorlessEngine();
      
      // Log the intelligence status
      this.logIntelligenceStatus();
      
    } catch (error) {
      console.warn('🧠 Emma intelligence initialization error:', error);
    }
  }

  /**
   * 📊 LOG INTELLIGENCE STATUS for debugging
   */
  logIntelligenceStatus() {
    console.log('🧠 EMMA INTELLIGENCE STATUS:');
    console.log(`  🏛️ Core Vault Operations: ✅ ALWAYS ENABLED`);
    console.log(`  🚀 Advanced AI (Conversation): ${this.apiKey ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`  🔍 Vectorless Engine (Memory Search): ${this.isVectorlessEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`  🎯 API Key: ${this.apiKey ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}`);
    console.log(`  🐛 Debug Mode: ${this.debugMode ? '✅ ON' : '❌ OFF'}`);
    
    console.log('');
    console.log('💜 EMMA CAPABILITIES:');
    console.log('  🏛️ Add people, create memories, manage vault (always works!)');
    console.log('  🔍 Search existing memories (vectorless engine)');
    console.log('  💬 Intelligent conversation (requires OpenAI key)');
    
    console.log('');
    console.log('🧠 DEMENTIA-FRIENDLY FEATURES:');
    console.log('  🔤 Case-insensitive name recognition');
    console.log('  🗣️ Natural language processing');
    console.log('  🎯 Ultra-robust name extraction');
    console.log('  🤔 Gentle person enrichment conversations');
    console.log('  💝 Always works without technical setup');
    
    if (!this.apiKey) {
      console.log('');
      console.log('💡 Note: Core vault operations work without API key!');
      console.log('   To enable enhanced conversation: Set OpenAI API key in Emma settings');
    }
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
    
    // 🎯 Setup dynamic quick start prompts
    this.setupQuickStartPrompts();
  }

  /**
   * 🎯 Setup elegant quick start prompts for user engagement
   * Dynamic, on-brand suggestions to guide conversation - appear in chat, disappear when conversation starts
   */
  setupQuickStartPrompts() {
    // Add prompts to the chat messages area, not the input area
    if (!this.messageContainer) {
      console.warn('💬 Message container not found for quick prompts');
      return;
    }

    // Dynamic prompt configuration - easy to modify and expand
    const promptsConfig = [
      {
        text: "Let's save some photos!",
        icon: "📸",
        action: "photos",
        description: "Capture and organize your favorite images"
      },
      {
        text: "Let's save a new memory",
        icon: "💝",
        action: "memory", 
        description: "Create a new memory capsule"
      },
      {
        text: "Ask me about any of your memories",
        icon: "🧠",
        action: "explore",
        description: "Explore and reminisce about past memories"
      }
    ];

    // Create prompts as proper Emma message content
    const promptsContent = `
      <div class="quick-prompts-text">Here are some ways I can help you today:</div>
      <div class="emma-quick-prompts-container">
        ${promptsConfig.map(prompt => `
          <button class="emma-quick-prompt" 
                  data-action="${prompt.action}"
                  data-text="${prompt.text}"
                  title="${prompt.description}">
            <span class="prompt-icon">${prompt.icon}</span>
            <span class="prompt-text">${prompt.text}</span>
          </button>
        `).join('')}
      </div>
    `;

    // Add prompts as a proper Emma message using the standard addMessage function
    const promptMessageId = this.addMessage(promptsContent, 'emma', { isHtml: true });
    
    // Mark this message as the quick start prompts for easy removal
    const promptMessage = document.getElementById(promptMessageId);
    if (promptMessage) {
      promptMessage.classList.add('emma-quick-start-prompts');
      promptMessage.id = 'quick-start-prompts-message';
    }

    // Apply beautiful Emma-branded styling
    this.addQuickPromptStyles();

    // Wire up functionality for each prompt
    this.setupPromptEventListeners();
    
    // Mark that we have quick prompts showing
    this.hasQuickPromptsShowing = true;
  }

  /**
   * 🎨 Add elegant Emma-branded styling for quick prompts
   */
  addQuickPromptStyles() {
    // Check if styles already exist to avoid duplicates
    if (document.getElementById('emma-quick-prompt-styles')) return;

    const styles = `
      <style id="emma-quick-prompt-styles">
        .emma-quick-start-prompts {
          animation: fadeInUp 0.6s ease-out 0.3s both;
        }
        
        .quick-prompts-text {
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
          margin-bottom: 16px;
          font-weight: 400;
        }
        
        .emma-quick-prompts-container {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          padding: 0;
          justify-content: center;
        }

        .emma-quick-prompt {
          background: linear-gradient(135deg, 
            rgba(138, 43, 226, 0.8) 0%, 
            rgba(75, 0, 130, 0.8) 100%);
          border: 1px solid rgba(138, 43, 226, 0.3);
          border-radius: 16px;
          padding: 12px 16px;
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 16px rgba(138, 43, 226, 0.2);
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 44px;
          outline: none;
          position: relative;
          overflow: hidden;
        }

        .emma-quick-prompt::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, 
            transparent, 
            rgba(255, 255, 255, 0.2), 
            transparent);
          transition: left 0.6s ease;
        }

        .emma-quick-prompt:hover {
          transform: translateY(-2px) scale(1.02);
          background: linear-gradient(135deg, 
            rgba(138, 43, 226, 0.9) 0%, 
            rgba(75, 0, 130, 0.9) 100%);
          box-shadow: 0 8px 24px rgba(138, 43, 226, 0.4);
          border-color: rgba(138, 43, 226, 0.6);
        }

        .emma-quick-prompt:hover::before {
          left: 100%;
        }

        .emma-quick-prompt:active {
          transform: translateY(0) scale(0.98);
        }

        .emma-quick-prompt:focus {
          border-color: rgba(138, 43, 226, 0.8);
          box-shadow: 0 0 0 3px rgba(138, 43, 226, 0.3);
        }

        .prompt-icon {
          font-size: 16px;
          line-height: 1;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
        }

        .prompt-text {
          line-height: 1.2;
          white-space: nowrap;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-10px);
          }
        }

        /* Mobile optimization */
        @media (max-width: 480px) {
          .emma-quick-prompts-container {
            flex-direction: column;
            gap: 8px;
          }
          
          .emma-quick-prompt {
            width: 100%;
            justify-content: center;
            min-height: 48px;
            font-size: 15px;
          }
        }

        /* Responsive flex layout */
        @media (min-width: 481px) and (max-width: 768px) {
          .emma-quick-prompt {
            flex: 1;
            min-width: 160px;
            justify-content: center;
          }
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  /**
   * 🔗 Setup event listeners for prompt functionality
   */
  setupPromptEventListeners() {
    const promptButtons = document.querySelectorAll('.emma-quick-prompt');
    
    promptButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        const text = e.currentTarget.dataset.text;
        
        // Visual feedback
        e.currentTarget.style.transform = 'scale(0.95)';
        setTimeout(() => {
          e.currentTarget.style.transform = '';
        }, 150);

        // Execute the appropriate action
        this.handlePromptAction(action, text);
      });
    });
  }

  /**
   * 🎬 Handle quick prompt actions with intelligent routing
   */
  async handlePromptAction(action, promptText) {
    console.log(`🎯 PROMPT: Executing action "${action}" with text "${promptText}"`);
    
    // Hide the quick prompts since conversation is starting
    this.hideQuickStartPrompts();
    
    // Add the prompt text as a user message to show context
    this.addMessage(promptText, 'user');
    
    try {
      switch (action) {
        case 'photos':
          await this.handlePhotosPrompt();
          break;
          
        case 'memory':
          await this.handleNewMemoryPrompt();
          break;
          
        case 'explore':
          await this.handleExploreMemoriesPrompt();
          break;
          
        default:
          console.warn(`Unknown prompt action: ${action}`);
          this.addMessage("I'm not sure how to help with that. Try asking me about your memories!", 'emma');
      }
    } catch (error) {
      console.error('🚨 PROMPT: Action failed:', error);
      this.addMessage("Something went wrong. Let's try that again!", 'emma');
    }
  }

  /**
   * 🫥 Hide quick start prompts when conversation begins  
   */
  hideQuickStartPrompts() {
    const promptsMessage = document.getElementById('quick-start-prompts-message');
    if (promptsMessage) {
      promptsMessage.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(() => {
        promptsMessage.remove();
        this.hasQuickPromptsShowing = false;
      }, 300);
    }
  }

  /**
   * 📸 Handle photos prompt - trigger intelligent photo capture
   */
  async handlePhotosPrompt() {
    this.addMessage("Perfect! Let's capture some photos to save as memories. I can help you organize them beautifully! 📸", 'emma');
    
    // Trigger the media upload flow with proper parameters
    const mediaMessage = "I'd like to save some photos as memories";
    const messageId = `message_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.handleMediaRequest(mediaMessage, messageId);
  }

  /**
   * 💝 Handle new memory prompt - start memory creation conversation  
   */
  async handleNewMemoryPrompt() {
    const responses = [
      "Wonderful! I'd love to help you create a new memory. What would you like to remember?",
      "That's beautiful! Tell me about this memory you'd like to save forever.",
      "Perfect! What special moment would you like to capture in your memory vault?",
      "I'm here to help! What's the story you'd like to preserve?"
    ];
    
    const response = responses[Math.floor(Math.random() * responses.length)];
    this.addMessage(response, 'emma');
    
    // Focus on the input for immediate typing
    if (this.inputField) {
      this.inputField.focus();
    }
  }

  /**
   * 🧠 Handle explore memories prompt - intelligent memory discovery
   */
  async handleExploreMemoriesPrompt() {
    const responses = [
      "I'd love to explore your memories with you! What would you like to reminisce about?",
      "Your memories are treasures! Is there a particular person, place, or time you'd like to revisit?",
      "Let's dive into your beautiful collection of memories. What's on your mind?",
      "I'm here to help you rediscover your precious moments. What would you like to explore?"
    ];
    
    const response = responses[Math.floor(Math.random() * responses.length)];
    this.addMessage(response, 'emma');
    
    // Could add memory suggestions based on vault content here
    // For now, encourage open conversation
    if (this.inputField) {
      this.inputField.focus();
    }
  }

  /**
   * 👤 Detect if user is SPECIFICALLY asking about an existing person (much more restrictive)
   * Returns { personName, requestType } if detected, null otherwise
   */
  detectPersonRequest(message) {
    const lowerMessage = message.toLowerCase().trim();
    
    // 🎯 DETECT person inquiries (case-insensitive names!)
    const personPatterns = [
      /(?:show me|tell me about|who is)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
      /(?:what about|how about)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
      /^([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s*\?+\s*$/i, // Just a name with question mark
    ];

    // 🚫 EXCLUDE common non-person requests
    const excludePatterns = [
      /\b(add|create|new|save|let|want|need|help|can|could|should)\b/i,
      /\b(person|people|memory|memories|vault|file)\b/i
    ];

    // Don't process if it contains excluded patterns
    for (const exclude of excludePatterns) {
      if (exclude.test(message)) {
        return null;
      }
    }

    for (const pattern of personPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const rawName = match[1].trim();
        
        // 🎯 VALIDATION: Reasonable name length and not common words
        if (rawName.length < 2 || rawName.length > 15) {
          continue;
        }

        // Filter out common words
        if (/^(you|me|us|that|this|what|where|when|how|why|who|and|or|the|a|an)$/i.test(rawName)) {
          continue;
        }

        // Capitalize the name properly
        const properName = rawName.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');

        return {
          personName: properName,
          requestType: this.categorizePersonRequest(lowerMessage),
          originalMessage: message
        };
      }
    }

    return null;
  }

  /**
   * 🏷️ Categorize the type of person request
   */
  categorizePersonRequest(lowerMessage) {
    if (lowerMessage.includes('show me')) return 'show';
    if (lowerMessage.includes('tell me about')) return 'tell';
    if (lowerMessage.includes('who is')) return 'who';
    if (lowerMessage.includes('where is')) return 'where';
    if (lowerMessage.includes('what about') || lowerMessage.includes('how about')) return 'about';
    return 'general';
  }

  /**
   * 👤 Handle person request by showing person card and memories
   */
  async handlePersonRequest(personRequest) {
    try {
      console.log('👤 CHAT: Handling person request:', personRequest);
      
      // Find the person in vault
      const person = await this.findPersonInVault(personRequest.personName);
      
      if (!person) {
        // Person not found - gentle response
        const notFoundResponses = [
          `I don't see anyone named "${personRequest.personName}" in your memory vault yet. Would you like to add them?`,
          `Hmm, I can't find "${personRequest.personName}" in your people. Should we create a profile for them?`,
          `I don't have "${personRequest.personName}" in your vault. Let's add them so I can remember them for you!`
        ];
        const response = notFoundResponses[Math.floor(Math.random() * notFoundResponses.length)];
        this.addMessage(response, 'emma');
        return;
      }

      // Generate contextual response based on request type
      const introResponse = this.generatePersonIntroResponse(person, personRequest.requestType);
      this.addMessage(introResponse, 'emma');

      // Show beautiful person card
      await this.displayPersonCard(person);

      // Find and display connected memories
      await this.displayPersonMemories(person);

    } catch (error) {
      console.error('👤 CHAT: Error handling person request:', error);
      this.addMessage("I had trouble finding that person. Let me try again in a moment.", 'emma');
    }
  }

  /**
   * 🔍 Find person in vault by name (fuzzy matching)
   */
  async findPersonInVault(searchName) {
    try {
      if (!window.emmaWebVault?.vaultData?.content?.people) {
        console.warn('👤 CHAT: No people data in vault');
        return null;
      }

      const vaultPeople = window.emmaWebVault.vaultData.content.people;
      const searchLower = searchName.toLowerCase().trim();

      // Try exact match first
      for (const [personId, person] of Object.entries(vaultPeople)) {
        if (person.name && person.name.toLowerCase() === searchLower) {
          return { ...person, id: personId };
        }
      }

      // Try partial match (contains)
      for (const [personId, person] of Object.entries(vaultPeople)) {
        if (person.name && person.name.toLowerCase().includes(searchLower)) {
          return { ...person, id: personId };
        }
      }

      // Try first name match
      for (const [personId, person] of Object.entries(vaultPeople)) {
        if (person.name) {
          const firstName = person.name.split(' ')[0].toLowerCase();
          if (firstName === searchLower) {
            return { ...person, id: personId };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('👤 CHAT: Error finding person:', error);
      return null;
    }
  }

  /**
   * 💬 Generate contextual intro response for person
   */
  generatePersonIntroResponse(person, requestType) {
    const relationship = person.relation || person.relationship || 'person';
    
    const responses = {
      show: [
        `Here's ${person.name}! They're your ${relationship}.`,
        `Let me show you ${person.name}, your ${relationship}.`,
        `This is ${person.name}! Such a special ${relationship}.`
      ],
      tell: [
        `${person.name} is your ${relationship}. Here's what I know about them:`,
        `Let me tell you about ${person.name}, your dear ${relationship}:`,
        `${person.name} - your wonderful ${relationship}. Here's their profile:`
      ],
      who: [
        `${person.name} is your ${relationship}!`,
        `That's ${person.name}, your ${relationship}.`,
        `${person.name} - they're your ${relationship}!`
      ],
      general: [
        `Here's ${person.name}, your ${relationship}:`,
        `${person.name}! Your ${relationship}. Let me show you:`,
        `That's ${person.name}, your ${relationship}:`
      ]
    };

    const responseList = responses[requestType] || responses.general;
    return responseList[Math.floor(Math.random() * responseList.length)];
  }

  /**
   * 🎨 Display beautiful person card in chat (like people picker)
   */
  async displayPersonCard(person) {
    try {
      const initials = (person.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      const relationship = person.relation || person.relationship || 'person';
      
      // 🎯 FIXED: Resolve avatar properly like other parts of the system
      let resolvedAvatarUrl = person.avatarUrl || person.profilePicture;
      
      // If no direct avatar URL, try to resolve from avatarId in media vault
      if (!resolvedAvatarUrl && person.avatarId && window.emmaWebVault?.vaultData?.content?.media) {
        const mediaItem = window.emmaWebVault.vaultData.content.media[person.avatarId];
        if (mediaItem && mediaItem.data) {
          resolvedAvatarUrl = mediaItem.data.startsWith('data:')
            ? mediaItem.data
            : `data:${mediaItem.type};base64,${mediaItem.data}`;
          console.log(`📸 CHAT: Resolved avatar for ${person.name} from avatarId`);
        }
      }
      
      console.log(`👤 CHAT: Person card for ${person.name}:`, {
        avatarUrl: person.avatarUrl ? 'has avatarUrl' : 'no avatarUrl',
        avatarId: person.avatarId || 'no avatarId', 
        resolved: resolvedAvatarUrl ? 'resolved!' : 'using initials'
      });
      
      // Create beautiful person card HTML using proper avatar resolution
      const personCardHTML = `
        <div class="chat-person-card">
          <div class="person-card-header">
            <div class="person-avatar-large" id="person-avatar-${person.id}">
              ${resolvedAvatarUrl ? 
                `<img src="${resolvedAvatarUrl}" alt="${person.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />` : 
                `<div class="avatar-initials">${initials}</div>`
              }
            </div>
            <div class="person-info">
              <div class="person-name">${person.name}</div>
              <div class="person-relationship">${relationship}</div>
            </div>
          </div>
        </div>
      `;

      // Add person card as Emma message with HTML content
      const cardMessageId = this.addMessage(personCardHTML, 'emma', { isHtml: true });
      
      // Add person card styling
      this.addPersonCardStyles();

    } catch (error) {
      console.error('👤 CHAT: Error displaying person card:', error);
    }
  }

  /**
   * 🎨 Add elegant person card styling
   */
  addPersonCardStyles() {
    // Check if styles already exist to avoid duplicates
    if (document.getElementById('chat-person-card-styles')) return;

    const styles = `
      <style id="chat-person-card-styles">
        .chat-person-card {
          background: linear-gradient(135deg, 
            rgba(138, 43, 226, 0.15) 0%, 
            rgba(75, 0, 130, 0.15) 100%);
          border: 1px solid rgba(138, 43, 226, 0.3);
          border-radius: 16px;
          padding: 20px;
          margin: 8px 0;
          backdrop-filter: blur(10px);
          animation: personCardFadeIn 0.6s ease-out;
        }

        .person-card-header {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .person-avatar-large {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          overflow: hidden;
          background: linear-gradient(135deg, #8a2be2, #4b0082);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(138, 43, 226, 0.3);
          position: relative;
        }

        .person-avatar-large img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-initials {
          color: white;
          font-size: 28px;
          font-weight: 600;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .person-info {
          flex: 1;
        }

        .person-name {
          color: white;
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 4px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .person-relationship {
          color: rgba(255, 255, 255, 0.8);
          font-size: 16px;
          font-weight: 400;
          text-transform: capitalize;
        }

        @keyframes personCardFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Mobile optimization */
        @media (max-width: 480px) {
          .person-card-header {
            flex-direction: column;
            text-align: center;
            gap: 12px;
          }
          
          .person-avatar-large {
            width: 100px;
            height: 100px;
          }
          
          .person-name {
            font-size: 20px;
          }
          
          .person-relationship {
            font-size: 14px;
          }
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  /**
   * 📚 Display connected memories for person
   */
  async displayPersonMemories(person) {
    try {
      console.log('📚 CHAT: Finding memories for person:', person.name);
      
      // Find connected memories using same logic as people page
      let connectedMemories = [];
      
      if (window.emmaWebVault?.vaultData?.content?.memories) {
        const vaultMemories = window.emmaWebVault.vaultData.content.memories;
        
        for (const [memoryId, memory] of Object.entries(vaultMemories)) {
          // Check if person is in memory's people metadata
          if (memory.metadata && memory.metadata.people && 
              Array.isArray(memory.metadata.people) && 
              memory.metadata.people.includes(person.id)) {
            connectedMemories.push({ ...memory, id: memoryId });
          }
          
          // Also check if person's name is mentioned in content
          if (person.name && memory.content) {
            const personName = person.name.toLowerCase();
            const memoryContent = memory.content.toLowerCase();
            if (memoryContent.includes(personName)) {
              // Avoid duplicates
              if (!connectedMemories.find(m => m.id === memoryId)) {
                connectedMemories.push({ ...memory, id: memoryId });
              }
            }
          }
        }
      }

      console.log(`📚 CHAT: Found ${connectedMemories.length} memories for ${person.name}`);

      if (connectedMemories.length === 0) {
        this.addMessage(`I don't see any memories with ${person.name} yet. Would you like to create some together?`, 'emma');
        return;
      }

      // Generate memories introduction
      const memoryCount = connectedMemories.length;
      const memoryIntros = [
        `I found ${memoryCount} ${memoryCount === 1 ? 'memory' : 'memories'} with ${person.name}:`,
        `Here are ${memoryCount} precious ${memoryCount === 1 ? 'moment' : 'moments'} you've shared with ${person.name}:`,
        `${person.name} appears in ${memoryCount} of your ${memoryCount === 1 ? 'memory' : 'memories'}:`
      ];
      const intro = memoryIntros[Math.floor(Math.random() * memoryIntros.length)];
      this.addMessage(intro, 'emma');

      // Display memory cards (limit to 5 most recent)
      const recentMemories = connectedMemories
        .sort((a, b) => new Date(b.created || b.date || 0) - new Date(a.created || a.date || 0))
        .slice(0, 5);

      for (const memory of recentMemories) {
        await this.displayMemoryCard(memory, person);
      }

      // If there are more memories, mention it
      if (connectedMemories.length > 5) {
        const moreCount = connectedMemories.length - 5;
        this.addMessage(`...and ${moreCount} more ${moreCount === 1 ? 'memory' : 'memories'} with ${person.name}. Would you like to see them all?`, 'emma');
      }

    } catch (error) {
      console.error('📚 CHAT: Error displaying person memories:', error);
      this.addMessage(`I had trouble loading memories for ${person.name}. Let me try again.`, 'emma');
    }
  }

  /**
   * 💝 Display individual memory card for person
   */
  async displayMemoryCard(memory, person) {
    try {
      const memoryDate = memory.created || memory.date || memory.timestamp;
      const formattedDate = memoryDate ? new Date(memoryDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short', 
        day: 'numeric'
      }) : 'Unknown date';
      
      // Clean up the preview text - remove extra whitespace and format nicely
      let preview = 'No content available';
      if (memory.content) {
        preview = memory.content
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .trim()
          .substring(0, 80); // Shorter preview
        if (memory.content.length > 80) {
          preview += '...';
        }
      }
      
      // Get all media attachments for responsive grid display
      let mediaItems = [];
      try {
        if (memory.attachments && memory.attachments.length > 0 && window.emmaWebVault?.vaultData?.content?.media) {
          const vaultMedia = window.emmaWebVault.vaultData.content.media;
          
          mediaItems = memory.attachments
            .map(attachment => {
              if (attachment && attachment.id && vaultMedia[attachment.id]) {
                const mediaData = vaultMedia[attachment.id];
                if (mediaData && mediaData.data) {
                  const mediaUrl = mediaData.data.startsWith('data:') 
                    ? mediaData.data 
                    : `data:${mediaData.type || 'image/jpeg'};base64,${mediaData.data}`;
                  return {
                    id: attachment.id,
                    url: mediaUrl,
                    type: mediaData.type || 'image/jpeg'
                  };
                }
              }
              return null;
            })
            .filter(item => item !== null);
            
          console.log(`📸 CHAT: Found ${mediaItems.length} media items for memory`);
        }
      } catch (mediaError) {
        console.warn('💝 CHAT: Error loading media:', mediaError);
        mediaItems = [];
      }

      // 🎯 RESPONSIVE MEDIA LAYOUT: Different layouts based on media count
      let mediaHTML = '';
      
      if (mediaItems.length === 0) {
        // No images - show heart icon
        mediaHTML = `
          <div class="memory-icon">
            💝
          </div>
        `;
      } else if (mediaItems.length === 1) {
        // Single image - span full width
        mediaHTML = `
          <div class="memory-single-image" onclick="event.stopPropagation(); window.chatExperience.openImageModal('${mediaItems[0].url}', '${memory.id}')">
            <img src="${mediaItems[0].url}" alt="Memory photo" />
          </div>
        `;
      } else {
        // Multiple images - responsive grid
        const gridClass = mediaItems.length === 2 ? 'grid-2' : 
                         mediaItems.length === 3 ? 'grid-3' : 'grid-4';
        
        mediaHTML = `
          <div class="memory-grid ${gridClass}">
            ${mediaItems.slice(0, 6).map((item, index) => `
              <div class="grid-item" onclick="event.stopPropagation(); window.chatExperience.openImageModal('${item.url}', '${memory.id}', ${index})">
                <img src="${item.url}" alt="Memory photo ${index + 1}" />
                ${index === 5 && mediaItems.length > 6 ? `<div class="more-overlay">+${mediaItems.length - 6}</div>` : ''}
              </div>
            `).join('')}
          </div>
        `;
      }

      // Create complete memory card with responsive media layout
      const memoryCardHTML = `
        <div class="chat-memory-card">
          ${mediaHTML}
          <div class="memory-content" onclick="window.chatExperience.openMemoryFromChat('${memory.id}')">
            <div class="memory-date">${formattedDate}</div>
            <div class="memory-text">${preview}</div>
            <div class="memory-action">💜 View this memory</div>
          </div>
        </div>
      `;

      // Add memory card as Emma message
      this.addMessage(memoryCardHTML, 'emma', { isHtml: true });
      
      // Add memory card styling
      this.addMemoryCardStyles();

    } catch (error) {
      console.error('💝 CHAT: Error displaying memory card:', error);
    }
  }

  /**
   * 🎨 Add memory card styling for chat
   */
  addMemoryCardStyles() {
    // Check if styles already exist to avoid duplicates
    if (document.getElementById('chat-memory-card-styles')) return;

    const styles = `
      <style id="chat-memory-card-styles">
        .chat-memory-card {
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.08) 0%, 
            rgba(255, 255, 255, 0.03) 100%);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          padding: 0;
          margin: 12px 0;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
          overflow: hidden;
        }

        .chat-memory-card:hover {
          background: linear-gradient(135deg, 
            rgba(138, 43, 226, 0.15) 0%, 
            rgba(75, 0, 130, 0.10) 100%);
          border-color: rgba(138, 43, 226, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(138, 43, 226, 0.25);
        }

        /* Single image layout - spans full width */
        .memory-single-image {
          width: 100%;
          height: 200px;
          cursor: pointer;
          overflow: hidden;
          border-radius: 16px 16px 0 0;
          position: relative;
        }

        .memory-single-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .memory-single-image:hover img {
          transform: scale(1.05);
        }

        /* Grid layouts for multiple images */
        .memory-grid {
          display: grid;
          gap: 2px;
          background: rgba(138, 43, 226, 0.1);
          border-radius: 16px 16px 0 0;
          overflow: hidden;
        }

        .memory-grid.grid-2 {
          grid-template-columns: 1fr 1fr;
          height: 160px;
        }

        .memory-grid.grid-3 {
          grid-template-columns: 2fr 1fr;
          grid-template-rows: 1fr 1fr;
          height: 200px;
        }

        .memory-grid.grid-3 .grid-item:first-child {
          grid-row: 1 / -1;
        }

        .memory-grid.grid-4 {
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          height: 200px;
        }

        .grid-item {
          position: relative;
          cursor: pointer;
          overflow: hidden;
          background: rgba(138, 43, 226, 0.2);
        }

        .grid-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .grid-item:hover img {
          transform: scale(1.1);
        }

        .more-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
          font-weight: 600;
        }

        /* Heart icon for no images */
        .memory-icon {
          width: 80px;
          height: 80px;
          border-radius: 16px;
          background: linear-gradient(135deg, #8a2be2, #4b0082);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          margin: 16px auto;
          box-shadow: 0 4px 12px rgba(138, 43, 226, 0.3);
        }

        /* Memory content area */
        .memory-content {
          padding: 16px;
          cursor: pointer;
        }

        .memory-date {
          color: rgba(138, 43, 226, 0.9);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .memory-text {
          color: rgba(255, 255, 255, 0.95);
          font-size: 14px;
          line-height: 1.4;
          margin-bottom: 12px;
          word-wrap: break-word;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .memory-action {
          color: rgba(138, 43, 226, 0.7);
          font-size: 12px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: color 0.2s ease;
        }

        .memory-content:hover .memory-action {
          color: rgba(138, 43, 226, 1);
        }

        /* Mobile optimization */
        @media (max-width: 480px) {
          .memory-single-image {
            height: 180px;
          }
          
          .memory-grid.grid-2,
          .memory-grid.grid-3,
          .memory-grid.grid-4 {
            height: 160px;
          }
          
          .memory-icon {
            width: 60px;
            height: 60px;
            font-size: 24px;
          }
          
          .memory-text {
            font-size: 13px;
            -webkit-line-clamp: 3;
          }
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  /**
   * 🔗 Open memory from chat (navigation helper)
   */
  openMemoryFromChat(memoryId) {
    console.log('🔗 CHAT: Opening memory from chat:', memoryId);
    
    // Use the existing edit memory functionality
    this.editMemoryDetails(memoryId);
  }

  /**
   * 🖼️ Open image modal for easy viewing (dementia-friendly)
   */
  openImageModal(imageUrl, memoryId, imageIndex = 0) {
    console.log('🖼️ CHAT: Opening image modal:', { memoryId, imageIndex });
    
    try {
      // Create beautiful image modal
      const modalHTML = `
        <div class="emma-image-modal" id="emma-image-modal" onclick="this.remove()">
          <div class="image-modal-content" onclick="event.stopPropagation()">
            <button class="modal-close-btn" onclick="document.getElementById('emma-image-modal').remove()">
              ×
            </button>
            <div class="image-container">
              <img src="${imageUrl}" alt="Memory photo" id="modal-image" />
            </div>
            <div class="image-modal-footer">
              <div class="image-info">
                <span class="image-label">📸 Memory Photo</span>
                <span class="memory-link" onclick="document.getElementById('emma-image-modal').remove(); window.chatExperience.openMemoryFromChat('${memoryId}')">
                  💜 View Full Memory
                </span>
              </div>
            </div>
          </div>
        </div>
      `;

      // Add modal to body
      document.body.insertAdjacentHTML('beforeend', modalHTML);

      // Add modal styling
      this.addImageModalStyles();

      // Add keyboard support
      const modalElement = document.getElementById('emma-image-modal');
      const handleKeydown = (e) => {
        if (e.key === 'Escape') {
          modalElement.remove();
          document.removeEventListener('keydown', handleKeydown);
        }
      };
      document.addEventListener('keydown', handleKeydown);

    } catch (error) {
      console.error('🖼️ CHAT: Error opening image modal:', error);
    }
  }

  /**
   * 🎨 Add image modal styling
   */
  addImageModalStyles() {
    // Check if styles already exist to avoid duplicates
    if (document.getElementById('emma-image-modal-styles')) return;

    const styles = `
      <style id="emma-image-modal-styles">
        .emma-image-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
          animation: modalFadeIn 0.3s ease-out;
        }

        .image-modal-content {
          max-width: 90vw;
          max-height: 90vh;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          overflow: hidden;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          position: relative;
          animation: modalSlideIn 0.3s ease-out;
        }

        .modal-close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(0, 0, 0, 0.7);
          border: none;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          font-size: 24px;
          cursor: pointer;
          z-index: 10001;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .modal-close-btn:hover {
          background: rgba(0, 0, 0, 0.9);
          transform: scale(1.1);
        }

        .image-container {
          display: flex;
          align-items: center;
          justify-content: center;
          max-height: 70vh;
          overflow: hidden;
        }

        .image-container img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 12px;
        }

        .image-modal-footer {
          background: linear-gradient(135deg, 
            rgba(138, 43, 226, 0.2) 0%, 
            rgba(75, 0, 130, 0.2) 100%);
          padding: 16px 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .image-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: white;
        }

        .image-label {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
        }

        .memory-link {
          color: rgba(138, 43, 226, 0.9);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 8px;
          background: rgba(138, 43, 226, 0.1);
          border: 1px solid rgba(138, 43, 226, 0.3);
          transition: all 0.2s ease;
        }

        .memory-link:hover {
          background: rgba(138, 43, 226, 0.2);
          border-color: rgba(138, 43, 226, 0.5);
          transform: translateY(-1px);
        }

        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalSlideIn {
          from { 
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to { 
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        /* Mobile optimization */
        @media (max-width: 480px) {
          .emma-image-modal {
            padding: 10px;
          }
          
          .image-modal-content {
            max-width: 95vw;
            max-height: 95vh;
          }
          
          .image-container {
            max-height: 75vh;
          }
          
          .image-info {
            flex-direction: column;
            gap: 12px;
            text-align: center;
          }
          
          .memory-link {
            width: 100%;
            text-align: center;
          }
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
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

    // Hide quick start prompts when user starts typing their own messages
    if (this.hasQuickPromptsShowing) {
      this.hideQuickStartPrompts();
    }

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

    // 🔍 CRITICAL: Check for memory search queries BEFORE memory capture analysis
    // This prevents "what are my memories" from being captured as a memory
    const intent = this.classifyUserIntent(message);
    if (intent.type === 'memory_search') {
      console.log('🔍 EARLY MEMORY SEARCH DETECTION: Bypassing memory capture for:', message);
      this.showTypingIndicator();
      setTimeout(() => {
        this.respondAsEmma(message);
      }, 1000 + Math.random() * 1500);
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
      // SAFETY: Ensure options exists
      const safeOptions = options || {};
      
      // Handle HTML content vs regular text
      const messageContent = safeOptions.isHtml ? content : `<p>${this.formatMessageContent(content || '')}</p>`;

      // "DEBBE STANDARD" UX FIX: Add confirmation buttons directly to the intelligent prompt
      let confirmationHtml = '';
      if (safeOptions.requiresConfirmation && safeOptions.memoryId) {
        confirmationHtml = `
          <div class="memory-confirmation-buttons">
            <button class="capsule-btn primary" onclick="window.chatExperience.confirmSaveMemory('${safeOptions.memoryId}')">✨ Yes, save this memory</button>
            <button class="capsule-btn secondary" onclick="window.chatExperience.declineSaveMemory('${safeOptions.memoryId}')">Maybe later</button>
          </div>
        `;
      }

      // NEW PERSON RELATIONSHIP SELECTION
      if (safeOptions.requiresRelationshipSelection && safeOptions.memoryId && safeOptions.personName) {
        confirmationHtml = `
          <div class="relationship-selection-buttons">
            <button class="capsule-btn primary" onclick="window.chatExperience.addPersonToVault('${safeOptions.memoryId}', '${safeOptions.personName}', 'family')">👨‍👩‍👧‍👦 Family</button>
            <button class="capsule-btn primary" onclick="window.chatExperience.addPersonToVault('${safeOptions.memoryId}', '${safeOptions.personName}', 'friend')">👥 Friend</button>
            <button class="capsule-btn secondary" onclick="window.chatExperience.addPersonToVault('${safeOptions.memoryId}', '${safeOptions.personName}', 'acquaintance')">🤝 Acquaintance</button>
            <button class="capsule-btn secondary" onclick="window.chatExperience.skipPersonAddition('${safeOptions.memoryId}')">⏭️ Skip for now</button>
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

    // 🤔 CHECK FOR ACTIVE PERSON ENRICHMENT FLOW
    if (this.currentPersonEnrichment && 
        this.currentPersonEnrichment.stage !== 'complete' &&
        Date.now() - this.currentPersonEnrichment.startedAt < 300000) { // 5 minute timeout
      
      console.log('🤔 Active person enrichment detected, handling response');
      const handled = await this.handlePersonEnrichmentResponse(userMessage, this.currentPersonEnrichment.personName);
      
      if (handled) {
        // If this completed the enrichment, clear it
        if (this.currentPersonEnrichment.stage === 'complete') {
          this.currentPersonEnrichment = null;
        }
        return;
      }
    }

    // 🎯 INTELLIGENT INTENT CLASSIFICATION
    const intent = this.classifyUserIntent(userMessage);
    console.log('🧠 CHAT: Intent classified as:', intent);

    // 👤 PERSON REQUEST DETECTION: Only for specific person inquiries
    if (intent.type === 'person_inquiry') {
      const personRequest = this.detectPersonRequest(userMessage);
      if (personRequest) {
        console.log('👤 CHAT: Person request detected:', personRequest);
        await this.handlePersonRequest(personRequest);
        return;
      }
    }

    // 💝 Memory capture detection for ongoing conversations
    const hasDetectedMemory = Array.from(this.detectedMemories.values()).some(analysis =>
      analysis.memory && analysis.memory.originalContent &&
      analysis.memory.originalContent.includes(userMessage.substring(0, 50))
    );

    if (hasDetectedMemory) {
      const captureResponse = await this.generateMemoryCaptureResponse(userMessage);
      this.addMessage(captureResponse, 'emma');
      return;
    }

    // 🏛️ CORE VAULT OPERATIONS: Emma's primary job (always works!)
    if (intent.type === 'vault_operation') {
      console.log('🏛️ CORE VAULT OPERATION: Handling directly');
      await this.handleVaultOperation(userMessage, intent);
      return;
    }

    // 🔍 MEMORY SEARCH: Handle memory queries intelligently
    if (intent.type === 'memory_search') {
      // Check if this is a simple "what are my memories" type query
      if (/\b(what are|show me|list|tell me)\b.*\b(my|the)\b.*\b(memory|memories)\b/i.test(userMessage)) {
        console.log('🔍 MEMORY SEARCH: Handling simple memory list request');
        await this.handleMemoryListRequest(userMessage);
        return;
      }
      
      // For complex memory search queries, use vectorless if available
      if (this.isVectorlessEnabled && this.vectorlessEngine) {
        try {
          const result = await this.vectorlessEngine.processQuestion(userMessage);
          if (result.success) {
            this.addVectorlessMessage(result.response, result.memories, result.citations, result.suggestions);
            return;
          } else {
            console.warn('💬 Vectorless processing failed, using fallback:', result.error);
          }
        } catch (error) {
          console.error('💬 Vectorless AI error:', error);
        }
      }
      
      // Fallback for memory search without vectorless
      await this.handleMemoryListRequest(userMessage);
      return;
    }

    // 🚀 ADVANCED AI MODE: Use OpenAI for conversation and questions
    if (this.apiKey && intent.type === 'conversation') {
      console.log('🚀 ADVANCED AI MODE: Using OpenAI for intelligent conversation');
      console.log('🎯 Intent:', intent);
      try {
        const response = await this.generateIntelligentEmmaResponse(userMessage, intent);
        this.addMessage(response, 'emma');
        this.addAIModeIndicator(); // Show that AI was used
        return;
      } catch (error) {
        console.warn('🤖 AI response failed, using fallback:', error);
        // Don't show error for conversation - just fall through to dynamic response
      }
    }

    // 💜 FALLBACK: Dynamic responses for basic interactions
    const response = await this.generateDynamicEmmaResponse(userMessage);
    this.addMessage(response, 'emma');
  }

  /**
   * 🎯 INTELLIGENT INTENT CLASSIFICATION
   * Determines what the user is trying to do
   */
  classifyUserIntent(message) {
    const lower = message.toLowerCase().trim();

    // 👤 Person inquiries (asking ABOUT someone)
    if (/^(who is|tell me about|show me|what about|how about)\s+[A-Z]/i.test(message) ||
        /^[A-Z][a-z]+\s*\?+\s*$/.test(message)) {
      return { type: 'person_inquiry', confidence: 0.9 };
    }

    // 🔍 Memory search queries - ENHANCED to catch edge cases
    if (/\b(find|search|show|what|who|when|where|list|see|view|tell me)\b.*\b(memory|memories|remember)\b/i.test(message) ||
        /\b(what are|show me|tell me|list)\b.*\b(my|the)\b.*\b(memory|memories)\b/i.test(message) ||
        /\bmemory\b.*\b(list|search|find|show)\b/i.test(message) ||
        /\bmemories\b.*\b(list|search|find|show)\b/i.test(message)) {
      return { type: 'memory_search', confidence: 0.9 };
    }

    // 🏛️ CORE VAULT OPERATIONS (Emma's primary job - always works!)
    // ULTRA-ROBUST for dementia users - catch every possible way they might ask
    if (
      // Direct vault operations
      /\b(add|create|new|save)\b.*\b(person|people|memory|memories|vault)\b/i.test(message) ||
      /\b(add|save)\b.*\b(to|in)\b.*\b(vault|emma)\b/i.test(message) ||
      /\blet'?s?\s+(add|create|save)\b/i.test(message) ||
      
      // Natural language patterns for dementia users
      /\b(?:want|need|would\s+like)\s+(?:to\s+)?(?:add|save|create|put)\b/i.test(message) ||
      /\b(?:please|can\s+you)\s+(?:add|save|create|put)\b/i.test(message) ||
      /\b(?:put|place)\s+[a-zA-Z]+\b/i.test(message) ||
      
      // Simple "add [name]" pattern
      /\badd\s+[a-zA-Z]+/i.test(message) ||
      
      // "I have a person/friend/family member" patterns
      /\b(?:have|met|know)\s+(?:a\s+)?(?:person|friend|family|someone)\b/i.test(message)
    ) {
      return { type: 'vault_operation', confidence: 0.95 };
    }

    // 💬 General conversation & questions (use AI if available)
    if (/^(what|who|when|where|why|how|can|could|would|should|do|does|did|is|are|was|were)\b/i.test(message) ||
        message.includes('?') ||
        /\b(hello|hi|hey|thank|thanks|help|tell me|explain)\b/i.test(message)) {
      return { type: 'conversation', confidence: 0.6 };
    }

    // 🎯 Other commands/actions
    if (/\b(add|create|new|save|let|want|need|help)\b/i.test(message)) {
      return { type: 'general_command', confidence: 0.5 };
    }

    // 💬 Default: General conversation
    return { type: 'conversation', confidence: 0.4 };
  }

  /**
   * 🚀 GENERATE INTELLIGENT EMMA RESPONSE using OpenAI
   * This is where the real AI magic happens!
   */
  async generateIntelligentEmmaResponse(userMessage, intent) {
    const env = (typeof window !== 'undefined' && window.EMMA_ENV) ? window.EMMA_ENV : 'production';
    const useLLM = env !== 'production' && !!this.apiKey;

    try {
      // Get vault context for personalization
      const vaultContext = await this.getVaultContextForAI();

      if (!useLLM) {
        // Gentle, local-first fallback aligned with Emma ethos
        const topics = (vaultContext.recentTopics || []).slice(0, 3);
        const topicStr = topics.length ? ` I remember recent topics like ${topics.join(', ')}.` : '';
        const suggestions = [
          'Would you like me to save this as a memory?',
          'Should we look for related photos together?',
          'Want to add who was with you in this memory?'
        ];
        const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
        return (
          `I’m here with you. Let’s explore this together.${topicStr} ` +
          `${suggestion}`
        );
      }

      // Build the prompt based on intent and context
      const prompt = this.buildEmmaPrompt(userMessage, intent, vaultContext);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user }
          ],
          max_tokens: 300,
          temperature: 0.7
        })
      });

      if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content;
      if (aiResponse) return aiResponse.trim();
      throw new Error('No response content from OpenAI');

    } catch (error) {
      // Final safe fallback to ensure no broken UX
      const calm = 'I’m here with you. Let’s take this step by step.';
      return `${calm} Would you like me to save this as a memory?`;
    }
  }

  /**
   * 🧠 BUILD EMMA-SPECIFIC PROMPT for OpenAI
   */
  buildEmmaPrompt(userMessage, intent, vaultContext) {
    const systemPrompt = `You are Emma, an intelligent memory companion. You help users organize, explore, and interact with their personal memories in a warm, helpful way.

PERSONALITY:
- Warm, caring, and memory-focused
- Always helpful but never overwhelming
- Gentle and patient, especially for users with memory challenges
- Focus on preserving and celebrating memories

CONTEXT:
- User has ${vaultContext.memoryCount} memories in their vault
- Recent memories include: ${vaultContext.recentTopics.join(', ')}
- People in vault: ${vaultContext.people.join(', ')}

CAPABILITIES:
- Provide warm conversation about memories
- Answer questions about their vault and memories
- Give gentle encouragement about memory preservation
- Help them reflect on their experiences

NOTE: Core vault operations (adding people, creating memories) are handled by Emma's built-in systems. Focus on conversation, encouragement, and emotional support.

INTENT: ${intent.type}
${intent.type === 'conversation' ? 'User wants to have a conversation. Be warm, engaging, and memory-focused. Provide emotional support and encouragement.' : ''}

RULES:
- Keep responses concise (1-3 sentences)
- Always be encouraging about memory preservation
- Never mention technical details or AI limitations
- If unsure, offer to help them explore their memories`;

    return {
      system: systemPrompt,
      user: userMessage
    };
  }

  /**
   * 📊 GET VAULT CONTEXT for AI responses
   */
  async getVaultContextForAI() {
    try {
      const vault = window.emmaWebVault?.vaultData?.content;
      
      if (!vault) {
        return {
          memoryCount: 0,
          recentTopics: ['No memories yet'],
          people: ['No people yet']
        };
      }

      const memories = vault.memories || {};
      const people = vault.people || {};
      
      // Get recent memory topics
      const memoryList = Object.values(memories);
      const recentTopics = memoryList
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 3)
        .map(m => m.title || 'Untitled memory')
        .filter(Boolean);

      // Get people names
      const peopleNames = Object.values(people)
        .map(p => p.name)
        .filter(Boolean)
        .slice(0, 5);

      return {
        memoryCount: memoryList.length,
        recentTopics: recentTopics.length ? recentTopics : ['No recent memories'],
        people: peopleNames.length ? peopleNames : ['No people yet']
      };

    } catch (error) {
      console.error('📊 Error getting vault context:', error);
      return {
        memoryCount: 0,
        recentTopics: ['Context unavailable'],
        people: ['Context unavailable']
      };
    }
  }

  /**
   * 🔍 HANDLE MEMORY LIST REQUEST
   * Shows user their existing memories when they ask "what are my memories"
   */
  async handleMemoryListRequest(userMessage) {
    console.log('🔍 MEMORY LIST: Processing request:', userMessage);
    
    try {
      // Get memories from vault
      if (!window.emmaWebVault || !window.emmaWebVault.isOpen) {
        this.addMessage("I'd love to show you your memories! Please make sure your vault is unlocked first.", 'emma');
        return;
      }
      
      const memories = await window.emmaWebVault.listMemories(10); // Get first 10 memories
      
      if (!memories || memories.length === 0) {
        this.addMessage("You don't have any memories in your vault yet. Would you like to create your first memory together?", 'emma');
        return;
      }
      
      // Generate a warm, personal response
      const memoryCount = memories.length;
      const totalMemories = Object.keys(window.emmaWebVault.vaultData?.content?.memories || {}).length;
      
      let response = `You have ${totalMemories} memory${totalMemories !== 1 ? 'ies' : ''} in your vault! `;
      
      if (totalMemories > 10) {
        response += `Here are your ${memories.length} most recent ones:\n\n`;
      } else {
        response += `Here they are:\n\n`;
      }
      
      // List recent memories with dates
      memories.forEach((memory, index) => {
        const title = memory.title || 'Untitled Memory';
        const date = new Date(memory.created || memory.timestamp || Date.now()).toLocaleDateString();
        response += `${index + 1}. **${title}** (${date})\n`;
        
        // Add a brief preview of the content if available
        if (memory.content && memory.content.length > 0) {
          const preview = memory.content.substring(0, 100);
          response += `   ${preview}${memory.content.length > 100 ? '...' : ''}\n\n`;
        } else {
          response += '\n';
        }
      });
      
      if (totalMemories > 10) {
        response += `\nYou can view all your memories in the constellation view or ask me to search for specific ones!`;
      }
      
      this.addMessage(response, 'emma');
      console.log('✅ MEMORY LIST: Successfully displayed memories');
      
    } catch (error) {
      console.error('❌ MEMORY LIST ERROR:', error);
      this.addMessage("I had trouble accessing your memories right now. Please try again in a moment.", 'emma');
    }
  }

  /**
   * 🏛️ HANDLE CORE VAULT OPERATIONS
   * Emma's primary job - managing memories and people
   */
  async handleVaultOperation(userMessage, intent) {
    console.log('🏛️ Processing vault operation:', userMessage);
    
    const lower = userMessage.toLowerCase().trim();
    
    // 👤 Adding a person to the vault
    if (/\b(add|create|new|save)\b.*\b(person|people)\b/i.test(userMessage) ||
        /\b(add|save)\b.*\b(to|in)\b.*\b(vault|emma)\b/i.test(userMessage) ||
        /\blet'?s?\s+add\b/i.test(userMessage) ||
        /\badd\s+[a-zA-Z]+/i.test(userMessage)) {
      
      console.log('🏛️ PERSON ADDITION DETECTED');
      
      // Extract person name from message
      const personName = this.extractPersonNameFromMessage(userMessage);
      
      if (personName) {
        console.log('🏛️ PROCEEDING WITH PERSON ADDITION:', personName);
        await this.addPersonToVault(personName, userMessage);
      } else {
        console.log('🏛️ NO NAME FOUND - ASKING FOR CLARIFICATION');
        this.addMessage("I'd love to help you add someone to your vault! What's their name?", 'emma');
      }
      return;
    }
    
    // 💝 Creating a new memory
    if (/\b(add|create|new|save)\b.*\b(memory|memories)\b/i.test(userMessage)) {
      this.addMessage("I'll help you create a new memory! What would you like to remember?", 'emma');
      // TODO: Trigger memory creation wizard
      return;
    }
    
    // 🔧 General vault operations
    if (/\blet'?s?\s+(add|create|save)\b/i.test(userMessage)) {
      this.addMessage("I'm ready to help! What would you like to add to your vault - a person, a memory, or something else?", 'emma');
      return;
    }
    
    // 💜 Fallback for unrecognized vault operations
    this.addMessage("I'm here to help with your vault! I can add people, create memories, or help you organize your thoughts. What would you like to do?", 'emma');
  }

  /**
   * 🎯 EXTRACT PERSON NAME from user message
   * ULTRA-ROBUST for dementia users - must be PERFECT
   */
  extractPersonNameFromMessage(message) {
    console.log('🎯 EXTRACTING PERSON NAME FROM:', message);
    
    // 🧠 DEMENTIA-FRIENDLY: Handle the most natural phrases
    // Split on connecting words to isolate the name
    const connectingWords = /\b(to|in|into|from|for|with|at|on|by|the|vault|emma)\b/gi;
    
    // Split message on connecting words and take the part with the name
    const parts = message.split(connectingWords);
    console.log('🧠 MESSAGE PARTS:', parts);
    
    // Look for name patterns in each clean part
    const namePatterns = [
      // Basic patterns: "add mandy", "create john", "save sarah"
      /\b(?:add|create|new|save)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
      
      // "Let's" patterns: "lets add mandy", "let's create john"
      /\blet'?s?\s+(?:add|create|save)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
      
      // Person-specific: "person named mandy", "new person john"
      /\b(?:person|people)\s+(?:named|called)?\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
      /\bnew\s+(?:person|people)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
      
      // Natural language: "I want to add mandy", "please add john", "can you add sarah"
      /\b(?:want|need|would\s+like)\s+(?:to\s+)?(?:add|save|create)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
      /\b(?:please|can\s+you)\s+(?:add|save|create)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
      
      // Put/place patterns: "put mandy", "place john"
      /\b(?:put|place)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
      
      // Simple name at end: "add mandy please"
      /\badd\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s*(?:please|thanks)?/i
    ];
    
    for (const part of parts) {
      const cleanPart = part.trim();
      if (!cleanPart || cleanPart.length < 3) continue;
      
      console.log('🔍 CHECKING PART:', cleanPart);
      
      for (const pattern of namePatterns) {
        const match = cleanPart.match(pattern);
        if (match && match[1]) {
          const rawName = match[1].trim();
          console.log('🎯 FOUND POTENTIAL NAME:', rawName);
          
          // Clean the name - remove any remaining connecting words
          const cleanName = rawName.replace(/\b(to|in|into|from|for|with|at|on|by|the|vault|emma)\b/gi, '').trim();
          console.log('🧹 CLEANED NAME:', cleanName);
          
          // Validate it's actually a name
          if (this.isValidPersonName(cleanName)) {
            // Capitalize properly
            const properName = cleanName.split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
            
            console.log('✅ FINAL NAME EXTRACTED:', properName);
            return properName;
          } else {
            console.log('❌ NAME VALIDATION FAILED:', cleanName);
          }
        }
      }
    }
    
    console.log('❌ NO VALID NAME FOUND IN MESSAGE');
    return null;
  }

  /**
   * 🔍 VALIDATE if extracted text is actually a person name
   */
  isValidPersonName(name) {
    if (!name || typeof name !== 'string') {
      console.log('❌ VALIDATION: Not a string');
      return false;
    }
    
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      console.log('❌ VALIDATION: Length invalid:', trimmed.length);
      return false;
    }
    
    // Check if it's all letters and spaces (names should only be letters)
    if (!/^[a-zA-Z\s]+$/.test(trimmed)) {
      console.log('❌ VALIDATION: Contains non-letters:', trimmed);
      return false;
    }
    
    // Exclude common words that definitely aren't names
    const excludedWords = [
      'person', 'people', 'memory', 'memories', 'vault', 'emma', 'new', 'the', 'a', 'an',
      'to', 'in', 'into', 'from', 'for', 'with', 'at', 'on', 'by', 'of', 'and', 'or',
      'them', 'him', 'her', 'it', 'this', 'that', 'there', 'here', 'where', 'when',
      'what', 'who', 'how', 'why', 'add', 'create', 'save', 'lets', 'let', 'please'
    ];
    
    const words = trimmed.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (excludedWords.includes(word)) {
        console.log('❌ VALIDATION: Contains excluded word:', word);
        return false;
      }
    }
    
    console.log('✅ VALIDATION: Name is valid:', trimmed);
    return true;
  }

  /**
   * 👤 ADD PERSON TO VAULT
   */
  async addPersonToVault(personName, originalMessage) {
    try {
      console.log('👤 ADDING PERSON: Starting process for:', personName);
      
      // Check if person already exists
      const existingPerson = await this.findPersonInVault(personName);
      if (existingPerson) {
        console.log('👤 Person already exists:', existingPerson.name);
        this.addMessage(`${personName} is already in your vault! Would you like me to show you their information?`, 'emma');
        return;
      }
      
      // Create new person object
      const newPerson = {
        id: `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: personName,
        createdAt: new Date().toISOString(),
        memories: [],
        notes: `Added via Emma chat: "${originalMessage}"`,
        relationships: [],
        enrichment: {
          relationship: '',
          details: '',
          memories: [],
          addedAt: new Date().toISOString()
        }
      };
      
      console.log('👤 Created person object:', newPerson);
      
      // Add to vault
      if (window.emmaWebVault && window.emmaWebVault.vaultData) {
        if (!window.emmaWebVault.vaultData.content.people) {
          window.emmaWebVault.vaultData.content.people = {};
        }
        
        window.emmaWebVault.vaultData.content.people[newPerson.id] = newPerson;
        console.log('👤 Added to vault data structure');
        
        // Trigger save
        await window.emmaWebVault.scheduleElegantSave();
        console.log('👤 Vault save scheduled');
        
        // 💜 DEMENTIA-FRIENDLY SUCCESS MESSAGE
        this.addMessage(`✅ Perfect! I've added ${personName} to your vault.`, 'emma');
        this.addVaultOperationIndicator(); // Show that this was a core vault operation
        console.log('✅ PERSON ADDED SUCCESSFULLY:', personName);
        
        // 🌟 CRITICAL: Refresh constellation after adding new person
        setTimeout(() => {
          this.refreshConstellationAfterPersonAdd();
        }, 500);
        
        // 🤔 GENTLE FOLLOW-UP CONVERSATION
        setTimeout(() => {
          this.startPersonEnrichmentFlow(personName);
        }, 1500);
        
      } else {
        console.error('❌ Vault not available:', { 
          hasWebVault: !!window.emmaWebVault, 
          hasVaultData: !!window.emmaWebVault?.vaultData 
        });
        this.addMessage("I'm having trouble accessing your vault right now. Please make sure it's unlocked and try again.", 'emma');
      }
      
    } catch (error) {
      console.error('❌ PERSON ADD ERROR:', error);
      this.addMessage(`I had trouble adding ${personName} to your vault. Let me try again in a moment.`, 'emma');
    }
  }

  /**
   * 🌟 REFRESH CONSTELLATION AFTER PERSON ADD
   * Ensure new person appears immediately in constellation
   */
  refreshConstellationAfterPersonAdd() {
    console.log('🌟 EMMA CHAT: Refreshing constellation after person add');
    
    // Method 1: If we're on memories page with constellation, directly refresh
    if (window.loadConstellationView && typeof window.loadConstellationView === 'function') {
      console.log('🌟 EMMA CHAT: Calling loadConstellationView() after person add');
      window.loadConstellationView();
    }
    // Method 2: If we're on people page, refresh people view
    else if (window.location.pathname.includes('people-emma.html') && window.loadPeople) {
      console.log('🌟 EMMA CHAT: Refreshing people page after person add');
      window.loadPeople();
    }
    // Method 3: Dispatch event for any listening components
    else {
      console.log('🌟 EMMA CHAT: Dispatching person added event');
      window.dispatchEvent(new CustomEvent('emmaPersonAdded', {
        detail: { 
          action: 'refresh_constellation',
          source: 'emma_chat',
          timestamp: new Date().toISOString()
        }
      }));
    }
  }

  /**
   * 🤔 START PERSON ENRICHMENT FLOW
   * Gentle follow-up conversation for dementia users
   */
  async startPersonEnrichmentFlow(personName) {
    console.log('🤔 Starting person enrichment flow for:', personName);
    
    // 💜 GENTLE, NON-OVERWHELMING QUESTIONS
    const followUpQuestions = [
      `Tell me a little about ${personName}. How do you know them?`,
      `What's something special you'd like to remember about ${personName}?`,
      `Would you like to tell me how ${personName} is important to you?`,
      `Is there anything particular about ${personName} that makes you smile?`
    ];
    
    // Pick a random gentle question
    const question = followUpQuestions[Math.floor(Math.random() * followUpQuestions.length)];
    
    // 🕰️ Give them time to process the success first
    setTimeout(() => {
      this.addMessage(question, 'emma');
      
      // 🎯 SET CONTEXT for next response
      this.currentPersonEnrichment = {
        personName: personName,
        stage: 'relationship', // relationship, details, memories, complete
        startedAt: Date.now()
      };
      
    }, 2000); // Wait 2 seconds after success message
  }

  /**
   * 🤔 HANDLE PERSON ENRICHMENT RESPONSES
   * Process follow-up information about newly added person
   */
  async handlePersonEnrichmentResponse(userMessage, personName) {
    console.log('🤔 Handling enrichment response for:', personName, userMessage);
    
    // 🚫 CHECK FOR SKIP/DECLINE SIGNALS
    const skipPatterns = [
      /\b(no|nah|skip|pass|not now|maybe later|that'?s enough|i'?m good|all set)\b/i,
      /\b(move on|next|done|finished|enough|nothing else)\b/i,
      /\b(don'?t want|not interested|not really)\b/i
    ];
    
    const isSkipping = skipPatterns.some(pattern => pattern.test(userMessage.toLowerCase()));
    
    if (isSkipping) {
      console.log('🤔 User is skipping enrichment');
      this.addMessage(`That's perfectly fine! ${personName} is safely in your vault. We can always add more details later.`, 'emma');
      this.currentPersonEnrichment = null; // Clear the enrichment flow
      return true;
    }
    
    try {
      // Find the person in vault
      const vault = window.emmaWebVault?.vaultData?.content;
      if (!vault?.people) {
        console.error('❌ No people section in vault');
        return false;
      }
      
      // Find person by name
      let targetPerson = null;
      for (const [id, person] of Object.entries(vault.people)) {
        if (person.name === personName) {
          targetPerson = person;
          break;
        }
      }
      
      if (!targetPerson) {
        console.error('❌ Person not found in vault:', personName);
        return false;
      }
      
      // 💝 ADD ENRICHMENT INFO
      if (!targetPerson.enrichment) {
        targetPerson.enrichment = {
          relationship: '',
          details: '',
          memories: [],
          addedAt: new Date().toISOString()
        };
      }
      
      const stage = this.currentPersonEnrichment?.stage || 'relationship';
      
      if (stage === 'relationship') {
        targetPerson.enrichment.relationship = userMessage;
        targetPerson.notes = `${targetPerson.notes}\nRelationship: ${userMessage}`;
        
        // 💬 ACKNOWLEDGING RESPONSE
        const acknowledgments = [
          `That's wonderful! ${userMessage.includes('friend') ? 'Friends are so precious.' : 'Thank you for sharing that.'}`,
          `How lovely! I can tell ${personName} means a lot to you.`,
          `That's beautiful. ${personName} sounds like someone special.`,
          `Thank you for telling me about your connection with ${personName}.`
        ];
        
        const ack = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
        this.addMessage(ack, 'emma');
        
        // 🎯 OPTIONAL FOLLOW-UP
        setTimeout(() => {
          this.addMessage(`Is there anything else you'd like me to remember about ${personName}? Or we can move on to something else - whatever feels right for you.`, 'emma');
          
          this.currentPersonEnrichment.stage = 'complete';
        }, 2500);
        
      } else {
        // Additional details
        if (!targetPerson.enrichment.details) {
          targetPerson.enrichment.details = userMessage;
        } else {
          targetPerson.enrichment.details += `\n${userMessage}`;
        }
        
        targetPerson.notes += `\nAdditional: ${userMessage}`;
        
        this.addMessage(`Thank you for sharing that about ${personName}. I'll keep that in your vault.`, 'emma');
        this.currentPersonEnrichment.stage = 'complete';
      }
      
      // 💾 SAVE ENRICHMENT
      await window.emmaWebVault.scheduleElegantSave();
      console.log('✅ Person enrichment saved:', targetPerson.enrichment);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error handling person enrichment:', error);
      return false;
    }
  }

  /**
   * 🏛️ ADD VAULT OPERATION INDICATOR to show when Emma handled core operations
   */
  addVaultOperationIndicator() {
    // Add a subtle indicator that this was a core vault operation (for debugging/transparency)
    if (this.debugMode) {
      const lastMessage = this.messageContainer?.lastElementChild;
      if (lastMessage && lastMessage.classList.contains('emma-message')) {
        const indicator = document.createElement('div');
        indicator.className = 'vault-operation-indicator';
        indicator.style.cssText = `
          font-size: 10px;
          color: #9d4edd;
          text-align: right;
          margin-top: 2px;
          opacity: 0.7;
        `;
        indicator.textContent = '🏛️ Core Vault Operation';
        lastMessage.appendChild(indicator);
      }
    }
  }

  /**
   * 🤖 ADD AI MODE INDICATOR to show when advanced AI was used
   */
  addAIModeIndicator() {
    // Add a subtle indicator that AI was used (for debugging/transparency)
    if (this.debugMode) {
      const lastMessage = this.messageContainer?.lastElementChild;
      if (lastMessage && lastMessage.classList.contains('emma-message')) {
        const indicator = document.createElement('div');
        indicator.className = 'ai-mode-indicator';
        indicator.style.cssText = `
          font-size: 10px;
          color: #888;
          text-align: right;
          margin-top: 2px;
          opacity: 0.7;
        `;
        indicator.textContent = '🚀 Advanced AI';
        lastMessage.appendChild(indicator);
      }
    }
  }

  /**
   * Generate a dynamic, contextual Emma fallback response without LLM
   */
  async generateDynamicEmmaResponse(userMessage) {
    try {
      // Safety check for null/undefined inputs
      if (!userMessage) {
        return "I'm here to help! What would you like to do?";
      }

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

      // Initialize the engine (works offline without API key!)
      this.vectorlessEngine = new EmmaVectorlessEngine({
        apiKey: this.apiKey,
        dementiaMode: this.dementiaMode || false,
        debug: this.debugMode || false
      });

      // Try to load vault data (non-blocking)
      await this.loadVaultForVectorless();

      // Enable vectorless even without API keys (offline mode)
      if (this.vectorlessEngine && !this.isVectorlessEnabled) {
        this.isVectorlessEnabled = true;
        console.log('💜 Emma: Vectorless engine enabled in offline mode for demo');
      }

      this.updateVectorlessStatus();
      console.log('✅ Emma Vectorless AI system initialized (offline mode ready)!');

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
      // CRITICAL FIX: Check both global scope and window object
      if (typeof EmmaVectorlessEngine !== 'undefined' || window.EmmaVectorlessEngine) {
        console.log('💬 EmmaVectorlessEngine already available - using existing instance');
        resolve();
        return;
      }

      // CRITICAL FIX: Check if script is already loaded to prevent duplicates
      const existingScript = document.querySelector('script[src*="emma-vectorless-engine.js"]');
      if (existingScript) {
        console.log('💬 EmmaVectorlessEngine script already loaded, waiting for class to be available...');
        // Wait a bit for the script to execute
        setTimeout(() => {
          if (typeof EmmaVectorlessEngine !== 'undefined' || window.EmmaVectorlessEngine) {
            resolve();
          } else {
            console.warn('💬 Script loaded but class not available - proceeding without vectorless engine');
            resolve(); // Don't reject, just proceed without it
          }
        }, 100);
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
        scriptPath = './js/emma-vectorless-engine.js';
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
      // DEMO SECURITY: API key input disabled for family demo
      apiKeyInput.value = '';
      apiKeyInput.placeholder = '🔒 API features disabled for demo security';
      apiKeyInput.disabled = true;
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

    // SECURITY WARNING: API keys stored in localStorage (temporary for development)
    // TODO: Move to secure vault storage for production
    // DEMO SECURITY: API key storage completely disabled
    if (apiKey) {
      console.warn('🔒 DEMO MODE: API key storage disabled for security');
      // Do not store API keys in any form during demo
    }
    // Always remove any existing API keys for demo safety
    localStorage.removeItem('emma-openai-api-key');
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
  async resetSettings() {
    const confirmed = await window.emmaConfirm('Would you like to reset all chat settings to their original values?', {
      title: 'Reset Chat Settings',
      helpText: 'This will clear your current preferences.',
      confirmText: 'Yes, Reset',
      cancelText: 'Keep Current Settings'
    });
    if (confirmed) {
      // DEMO SECURITY: Always remove API keys for safety
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
      z-index: 20000;
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
          // 🚀 DEMO SECURITY: API keys disabled for family demo
    
    // 1. SECURITY LOCKDOWN: No API key access for demo safety
    this.apiKey = null; // DEMO MODE: API keys disabled for security
      
      // 2. Check old vectorless settings format (backup)
      if (!this.apiKey) {
        const stored = localStorage.getItem('emma-vectorless-settings');
        if (stored) {
          const settings = JSON.parse(stored);
          this.apiKey = settings.apiKey || null;
        }
      }
      
      // 3. Check global API key (backup)
      if (!this.apiKey && window.API_KEY) {
        this.apiKey = window.API_KEY;
        console.log('💬 Using global API key for Emma responses');
      }
      
      // 🔧 Load other settings
      this.dementiaMode = localStorage.getItem('emma-dementia-mode') === 'true';
      this.debugMode = localStorage.getItem('emma-debug-mode') === 'true';
      
      // 🎯 LOG RESULTS
      if (this.apiKey) {
        console.log('✅ OpenAI API key found and loaded successfully!');
      } else {
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
      script.src = './js/emma-intelligent-capture.js';
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
   * Detect conversational media requests (e.g., "let's save some pictures")
   */
  detectMediaRequest(message) {
    const text = message.toLowerCase().trim();
    
    const mediaRequestPatterns = [
      /let'?s save some (photos?|pictures?|videos?|images?)/i,
      /save (some|these|those) (photos?|pictures?|videos?|images?)/i,
      /add (some|these|those) (photos?|pictures?|videos?|images?)/i,
      /upload (some|these|those) (photos?|pictures?|videos?|images?)/i,
      /want to (add|save|upload) (photos?|pictures?|videos?|images?)/i,
      /need to (add|save|upload) (photos?|pictures?|videos?|images?)/i,
      /should (add|save|upload) (photos?|pictures?|videos?|images?)/i,
      /can we (add|save|upload) (photos?|pictures?|videos?|images?)/i,
      /let me (add|save|upload) (photos?|pictures?|videos?|images?)/i,
      /time to (add|save|upload) (photos?|pictures?|videos?|images?)/i
    ];
    
    const isMatch = mediaRequestPatterns.some(pattern => pattern.test(text));
    console.log('🔍 MEDIA DETECTION:', { text, isMatch, patterns: mediaRequestPatterns.length });
    return isMatch;
  }

  /**
   * Handle conversational media requests by showing enhanced memory preview
   */
  async handleMediaRequest(message, messageId) {
    try {
      // Generate dynamic response for media requests
      const response = await this.generateDynamicEmmaResponse(`The user wants to save photos/media: "${message}"`);
      await this.addMessage(response || "I'd love to help you save those photos!", 'emma', null, 'response');

      // Create a basic memory from the request
      const memory = {
        id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: 'New Photo Memory',
        content: message,
        timestamp: Date.now(),
        metadata: {
          people: [],
          emotions: [],
          locations: [],
          mediaUpload: true // Flag to show media interface
        },
        attachments: []
      };

      // 🎯 CRITICAL UPGRADE: Use the superior edit dialog instead of basic enhanced preview
      // Store memory in temporary storage for editing
      this.temporaryMemories.set(memory.id, memory);
      console.log('🎯 MEDIA REQUEST: Created temporary memory for superior edit dialog:', memory.id);
      console.log('🎯 MEDIA REQUEST: Memory metadata:', memory.metadata);
      
      // Show the much better edit dialog we just perfected!
      this.editMemoryDetails(memory.id);

    } catch (error) {
      console.error('❌ Error handling media request:', error);
      await this.addMessage("I'd love to help you save those photos! Let me set that up for you.", 'emma', null, 'response');
    }
  }

  /**
   * Analyze message for memory potential
   */
  async analyzeForMemory(message, messageId) {
    // 🔍 CRITICAL: Check for memory search queries FIRST - prevent wrong capture
    const intent = this.classifyUserIntent(message);
    if (intent.type === 'memory_search') {
      console.log('🔍 ANALYZE FOR MEMORY: Detected memory search query, skipping memory capture analysis:', message);
      return { handled: false }; // Let it go to normal Emma response
    }

    // 🎯 HANDLE CONVERSATIONAL MEDIA REQUESTS FIRST
    if (this.detectMediaRequest(message)) {
      console.log('📷 Detected conversational media request:', message);
      await this.handleMediaRequest(message, messageId);
      return { handled: true };
    }

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
    // 🎯 CRITICAL FIX: Store memory in temporary storage for editing
    this.temporaryMemories.set(memory.id, memory);
    console.log('🎯 MOBILE PREVIEW: Stored temporary memory for editing:', memory.id);

    // 📱 MOBILE-FIRST REDESIGN: Full-screen modal optimized for touch
    const hasImages = memory.attachments?.some(att => att.type?.startsWith('image/'));
    const hasVideo = memory.attachments?.some(att => att.type?.startsWith('video/'));
    const peopleList = memory.metadata?.people || [];
    
    const previewHTML = `
      <!-- 📱 MOBILE HEADER: Full-width with close button -->
      <div class="mobile-header">
        <div class="header-content">
          <h2 class="memory-title">${memory.title || 'Beautiful Memory'}</h2>
          <button class="close-btn" onclick="this.closest('.memory-preview-dialog').remove()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="memory-date">${memory.metadata?.date || 'Saturday, August 23, 2025'}</div>
      </div>

      <!-- 📸 HERO IMAGE CAROUSEL: Feature photos prominently -->
      ${hasImages ? `
        <div class="hero-carousel">
          <div class="carousel-container">
            ${memory.attachments
              .filter(att => att.type?.startsWith('image/'))
              .slice(0, 5)
              .map((image, index) => `
                <div class="hero-image ${index === 0 ? 'active' : ''}" style="background-image: url('${image.data || image.dataUrl || image.url}')">
                  <div class="image-overlay"></div>
                </div>
              `).join('')}
          </div>
          ${memory.attachments.filter(att => att.type?.startsWith('image/')).length > 1 ? `
            <div class="carousel-dots">
              ${memory.attachments
                .filter(att => att.type?.startsWith('image/'))
                .slice(0, 5)
                .map((_, index) => `
                  <div class="dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>
                `).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- 👥 PEOPLE SECTION: Large touch-friendly avatars -->
      ${peopleList.length > 0 ? `
        <div class="people-section">
          <h3 class="section-title">👥 People in this memory</h3>
          <div class="people-grid" id="people-grid-${memory.id}">
            <!-- People avatars will be loaded here -->
          </div>
        </div>
      ` : ''}

      <!-- 📝 CONTENT SECTION: Story and details -->
      <div class="content-section">
        <div class="memory-story">
          <p>${memory.content}</p>
        </div>
        
        ${memory.metadata?.emotions?.length > 0 ? `
          <div class="memory-tags">
            <span class="tag-label">💭</span>
            <div class="emotions-list">
              ${memory.metadata.emotions.map(emotion => `
                <span class="emotion-tag">${emotion}</span>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${memory.metadata?.location ? `
          <div class="memory-tags">
            <span class="tag-label">📍</span>
            <span class="location-tag">${memory.metadata.location}</span>
          </div>
        ` : ''}
      </div>

      <!-- 🎬 MEDIA GRID: Additional media -->
      ${memory.attachments?.length > 1 || hasVideo ? `
        <div class="media-section">
          <h3 class="section-title">📷 All Media (${memory.attachments.length})</h3>
          <div class="media-grid">
            ${memory.attachments.map((attachment, index) => `
              <div class="media-item ${attachment.type?.startsWith('image/') ? 'image' : attachment.type?.startsWith('video/') ? 'video' : 'file'}">
                ${attachment.type?.startsWith('image/') ? `
                  <img src="${attachment.data || attachment.dataUrl || attachment.url}" alt="${attachment.name}" />
                ` : attachment.type?.startsWith('video/') ? `
                  <video src="${attachment.dataUrl || attachment.url}" muted>
                    <div class="video-play-overlay">▶️</div>
                  </video>
                ` : `
                  <div class="file-item">
                    <div class="file-icon">${attachment.type?.startsWith('audio/') ? '🎵' : '📄'}</div>
                    <div class="file-name">${attachment.name}</div>
                  </div>
                `}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;

    // Create fully responsive dialog for ALL screen sizes
    const dialog = document.createElement('div');
    dialog.className = 'memory-preview-dialog responsive';
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
      background: rgba(0, 0, 0, 0.9) !important;
      backdrop-filter: blur(20px) !important;
      padding: 0;
    `;
    dialog.innerHTML = `
      <style>
        /* 🎯 RESPONSIVE DIALOG STYLES FOR ALL SCREEN SIZES */
        @keyframes dialogFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        .responsive-memory-container {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.95) 0%, rgba(124, 58, 237, 0.95) 50%, rgba(109, 40, 217, 0.95) 100%);
          border-radius: clamp(16px, 3vw, 24px);
          max-width: 95vw;
          max-height: 95vh;
          width: 100%;
          overflow-y: auto;
          position: relative;
          animation: dialogFadeIn 0.3s ease forwards;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        }
        
        /* 📱 MOBILE FIRST (320px+) */
        .responsive-memory-container {
          margin: 10px;
          padding: 20px;
        }
        
        /* 📱 TABLET (768px+) */
        @media (min-width: 768px) {
          .responsive-memory-container {
            margin: 20px;
            padding: 30px;
            max-width: 700px;
          }
        }
        
        /* 💻 LAPTOP (1024px+) */
        @media (min-width: 1024px) {
          .responsive-memory-container {
            margin: 40px;
            padding: 40px;
            max-width: 900px;
          }
        }
        
        /* 🖥️ DESKTOP (1440px+) */
        @media (min-width: 1440px) {
          .responsive-memory-container {
            max-width: 1100px;
            padding: 50px;
          }
        }
        
        /* HEADER STYLES */
        .memory-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: clamp(20px, 4vw, 30px);
          flex-wrap: wrap;
          gap: 15px;
        }
        
        .header-info h2 {
          margin: 0;
          color: white;
          font-size: clamp(20px, 4vw, 28px);
          font-weight: 700;
          line-height: 1.2;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .memory-date {
          color: rgba(255, 255, 255, 0.8);
          font-size: clamp(14px, 2.5vw, 16px);
          margin-top: 5px;
        }
        
        .close-btn {
          background: rgba(255, 255, 255, 0.15);
          border: none;
          color: white;
          width: clamp(40px, 6vw, 48px);
          height: clamp(40px, 6vw, 48px);
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          flex-shrink: 0;
        }
        
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: scale(1.1);
        }
        
        /* HERO CAROUSEL STYLES */
        .hero-carousel {
          margin-bottom: clamp(25px, 5vw, 35px);
          border-radius: clamp(12px, 2.5vw, 16px);
          overflow: hidden;
          position: relative;
          aspect-ratio: 16/9;
          background: rgba(0, 0, 0, 0.3);
        }
        
        .carousel-container {
          position: relative;
          width: 100%;
          height: 100%;
        }
        
        .hero-image {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          opacity: 0;
          transition: opacity 0.5s ease;
        }
        
        .hero-image.active {
          opacity: 1;
        }
        
        .image-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 50%;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.4));
        }
        
        .carousel-dots {
          position: absolute;
          bottom: 15px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
        }
        
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .dot.active {
          background: white;
          transform: scale(1.2);
        }
        
        /* PEOPLE SECTION */
        .people-section {
          margin-bottom: clamp(25px, 5vw, 35px);
        }
        
        .section-title {
          color: white;
          font-size: clamp(16px, 3vw, 20px);
          font-weight: 600;
          margin: 0 0 clamp(15px, 3vw, 20px) 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .people-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(clamp(80px, 15vw, 120px), 1fr));
          gap: clamp(12px, 3vw, 20px);
          justify-items: center;
        }
        
        .memory-person-avatar {
          width: clamp(70px, 12vw, 100px);
          height: clamp(70px, 12vw, 100px);
          border-radius: 50%;
          border: 3px solid rgba(255, 255, 255, 0.9);
          overflow: hidden;
          position: relative;
          background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: clamp(12px, 2.5vw, 16px);
          font-weight: 600;
          color: white;
          transition: all 0.3s ease;
          cursor: pointer;
          text-align: center;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }
        
        .memory-person-avatar:hover {
          transform: scale(1.05);
          border-color: white;
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5);
        }
        
        .memory-person-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        /* CONTENT SECTION */
        .content-section {
          margin-bottom: clamp(25px, 5vw, 35px);
        }
        
        .memory-story p {
          color: white;
          font-size: clamp(16px, 3vw, 18px);
          line-height: 1.6;
          margin: 0 0 clamp(15px, 3vw, 20px) 0;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }
        
        .memory-tags {
          display: flex;
          align-items: center;
          gap: clamp(10px, 2vw, 15px);
          margin-bottom: clamp(10px, 2vw, 15px);
          flex-wrap: wrap;
        }
        
        .tag-label {
          font-size: clamp(16px, 3vw, 18px);
          flex-shrink: 0;
        }
        
        .emotions-list {
          display: flex;
          gap: clamp(6px, 1.5vw, 10px);
          flex-wrap: wrap;
        }
        
        .emotion-tag, .location-tag {
          background: rgba(255, 255, 255, 0.15);
          color: white;
          padding: clamp(4px, 1vw, 6px) clamp(8px, 2vw, 12px);
          border-radius: clamp(12px, 2vw, 16px);
          font-size: clamp(12px, 2.5vw, 14px);
          font-weight: 500;
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
        }
        
        /* MEDIA SECTION */
        .media-section {
          margin-bottom: clamp(25px, 5vw, 35px);
        }
        
        .media-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(clamp(120px, 25vw, 200px), 1fr));
          gap: clamp(10px, 2vw, 15px);
        }
        
        .media-item {
          aspect-ratio: 1;
          border-radius: clamp(8px, 2vw, 12px);
          overflow: hidden;
          background: rgba(255, 255, 255, 0.1);
          position: relative;
          transition: transform 0.3s ease;
        }
        
        .media-item:hover {
          transform: scale(1.05);
        }
        
        .media-item img, .media-item video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .video-play-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: clamp(20px, 4vw, 30px);
          color: white;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }
        
        /* ACTION BUTTONS */
        .action-buttons {
          display: flex;
          gap: clamp(12px, 3vw, 20px);
          margin-top: clamp(30px, 5vw, 40px);
          flex-wrap: wrap;
        }
        
        .action-btn {
          flex: 1;
          min-width: clamp(120px, 25vw, 150px);
          padding: clamp(12px, 2.5vw, 16px) clamp(20px, 4vw, 30px);
          border: none;
          border-radius: clamp(10px, 2vw, 14px);
          font-size: clamp(14px, 2.5vw, 16px);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(6px, 1.5vw, 8px);
          text-decoration: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        .action-btn.primary {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          color: #8b5cf6;
          border: 2px solid rgba(255, 255, 255, 0.3);
        }
        
        .action-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 255, 255, 0.3);
        }
        
        .action-btn.secondary {
          background: rgba(255, 255, 255, 0.15);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(10px);
        }
        
        .action-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
        }
      </style>
      
      <div class="responsive-memory-container">
        <!-- HEADER -->
        <div class="memory-header">
          <div class="header-info">
            <h2>${memory.title || 'Beautiful Memory'}</h2>
            <div class="memory-date">${memory.metadata?.date || 'Saturday, August 23, 2025'}</div>
          </div>
          <button class="close-btn" onclick="this.closest('.memory-preview-dialog').remove()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        
        <!-- HERO CAROUSEL -->
        ${hasImages ? `
          <div class="hero-carousel">
            <div class="carousel-container">
              ${memory.attachments
                .filter(att => att.type?.startsWith('image/'))
                .slice(0, 5)
                .map((image, index) => `
                  <div class="hero-image ${index === 0 ? 'active' : ''}" style="background-image: url('${image.data || image.dataUrl || image.url}')">
                    <div class="image-overlay"></div>
                  </div>
                `).join('')}
            </div>
            ${memory.attachments.filter(att => att.type?.startsWith('image/')).length > 1 ? `
              <div class="carousel-dots">
                ${memory.attachments
                  .filter(att => att.type?.startsWith('image/'))
                  .slice(0, 5)
                  .map((_, index) => `
                    <div class="dot ${index === 0 ? 'active' : ''}" onclick="window.chatExperience.switchCarouselImage(${index})"></div>
                  `).join('')}
              </div>
            ` : ''}
          </div>
        ` : ''}
        
        <!-- PEOPLE SECTION -->
        ${peopleList.length > 0 ? `
          <div class="people-section">
            <h3 class="section-title">👥 People in this memory</h3>
            <div class="people-grid" id="people-grid-${memory.id}">
              <!-- People avatars will be loaded here -->
            </div>
          </div>
        ` : ''}
        
        <!-- CONTENT -->
        <div class="content-section">
          <div class="memory-story">
            <p>${memory.content}</p>
          </div>
          
          ${memory.metadata?.emotions?.length > 0 ? `
            <div class="memory-tags">
              <span class="tag-label">💭</span>
              <div class="emotions-list">
                ${memory.metadata.emotions.map(emotion => `
                  <span class="emotion-tag">${emotion}</span>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${memory.metadata?.location ? `
            <div class="memory-tags">
              <span class="tag-label">📍</span>
              <span class="location-tag">${memory.metadata.location}</span>
            </div>
          ` : ''}
        </div>

        <!-- MEDIA GRID -->
        ${memory.attachments?.length > 1 || hasVideo ? `
          <div class="media-section">
            <h3 class="section-title">📷 All Media (${memory.attachments.length})</h3>
            <div class="media-grid">
              ${memory.attachments.map((attachment, index) => `
                <div class="media-item ${attachment.type?.startsWith('image/') ? 'image' : attachment.type?.startsWith('video/') ? 'video' : 'file'}">
                  ${attachment.type?.startsWith('image/') ? `
                    <img src="${attachment.data || attachment.dataUrl || attachment.url}" alt="${attachment.name}" />
                  ` : attachment.type?.startsWith('video/') ? `
                    <video src="${attachment.dataUrl || attachment.url}" muted>
                    <div class="video-play-overlay">▶️</div>
                    </video>
                  ` : `
                    <div class="file-item">
                      <div class="file-icon">${attachment.type?.startsWith('audio/') ? '🎵' : '📄'}</div>
                      <div class="file-name">${attachment.name}</div>
                    </div>
                  `}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <!-- ACTION BUTTONS -->
        <div class="action-buttons">
          <button class="action-btn primary" onclick="window.chatExperience.saveMemoryToVault('${memory.id}')">
            ✨ Save to Vault
          </button>
          <button class="action-btn secondary" onclick="window.chatExperience.editMemoryDetails('${memory.id}')">
            ✏️ Edit Memory
          </button>
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
      // Load large responsive people avatars
      this.loadLargeResponsivePeopleAvatars(memory);
    }, 100);

  }

  /**
   * Switch carousel image in memory preview
   */
  switchCarouselImage(index) {
    const dialog = document.querySelector('.memory-preview-dialog');
    if (!dialog) return;
    
    // Update active image
    const images = dialog.querySelectorAll('.hero-image');
    const dots = dialog.querySelectorAll('.dot');
    
    images.forEach((img, i) => {
      img.classList.toggle('active', i === index);
    });
    
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  /**
   * Load large responsive people avatars for the new memory dialog
   */
  async loadLargeResponsivePeopleAvatars(memory) {
    const grid = document.getElementById(`people-grid-${memory.id}`);
    if (!grid) return;

    try {
      // Get people from vault
      let people = [];
      
      if (window.emmaAPI && typeof window.emmaAPI.people?.list === 'function') {
        try {
          const result = await window.emmaAPI.people.list();
          if (result?.success && Array.isArray(result.items)) {
            people = result.items;
          }
        } catch (apiError) {
          console.log('📝 EmmaAPI people.list failed:', apiError);
        }
      }
      
      // Fallback to vault direct access
      if (people.length === 0 && window.emmaWebVault?.vaultData?.content?.people) {
        const rawPeople = Object.values(window.emmaWebVault.vaultData.content.people) || [];
        const media = window.emmaWebVault.vaultData.content.media || {};
        
        people = rawPeople.map(person => {
          let avatarUrl = person.avatarUrl;
          
          if (!avatarUrl && person.avatarId && media[person.avatarId]) {
            const mediaItem = media[person.avatarId];
            if (mediaItem?.data) {
              avatarUrl = mediaItem.data.startsWith('data:')
                ? mediaItem.data
                : `data:${mediaItem.type};base64,${mediaItem.data}`;
            }
          }
          
          return { ...person, avatarUrl };
        });
      }

      if (people.length === 0) {
        grid.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center;">No people in vault yet.</p>';
        return;
      }

      // Filter to people in this memory
      const memoryPeopleIds = memory.metadata?.people || [];
      const memoryPeople = people.filter(person => 
        memoryPeopleIds.some(p => (typeof p === 'string' ? p : p.id) === person.id)
      );

      console.log('👥 RESPONSIVE: Loading', memoryPeople.length, 'people for memory');

      // Create responsive people avatars
      memoryPeople.forEach(person => {
        const personDiv = document.createElement('div');
        personDiv.className = 'memory-person-avatar';
        personDiv.dataset.personId = person.id;
        personDiv.dataset.personName = person.name;

        // Create name label below avatar
        const nameLabel = document.createElement('div');
        nameLabel.textContent = person.name;
        nameLabel.style.cssText = `
          color: white;
          font-size: clamp(12px, 2.5vw, 14px);
          font-weight: 500;
          margin-top: 8px;
          text-align: center;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        `;

        if (person.avatarUrl) {
          const img = document.createElement('img');
          img.src = person.avatarUrl;
          img.alt = person.name;
          img.onload = () => {
            personDiv.innerHTML = '';
            personDiv.appendChild(img);
          };
          img.onerror = () => {
            // Fallback to initials
            personDiv.textContent = person.name.split(' ').map(n => n[0]).join('').toUpperCase();
          };
        } else {
          // Show initials
          personDiv.textContent = person.name.split(' ').map(n => n[0]).join('').toUpperCase();
        }

        const container = document.createElement('div');
        container.style.cssText = 'display: flex; flex-direction: column; align-items: center;';
        container.appendChild(personDiv);
        container.appendChild(nameLabel);
        
        grid.appendChild(container);
      });

    } catch (error) {
      console.error('❌ Error loading responsive people avatars:', error);
      grid.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center;">Error loading people.</p>';
    }
  }

  /**
   * Show enhanced memory preview with media upload and people selection
   */
  showEnhancedMemoryPreview(memory) {
    try {
      if (!memory || !memory.id) {
        console.error('❌ Invalid memory object for enhanced preview');
        return;
      }

      // Create enhanced dialog
      const dialog = document.createElement('div');
    dialog.className = 'memory-preview-dialog enhanced';
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10000 !important;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      animation: dialogFadeIn 0.3s ease forwards;
      background: rgba(0, 0, 0, 0.8) !important;
      backdrop-filter: blur(15px) !important;
    `;

    dialog.innerHTML = `
      <style>
        .memory-person-avatar {
          width: 32px; height: 32px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.8);
          overflow: hidden; position: relative; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
          display: flex; align-items: center; justify-content: center; font-size: 0.8rem;
          font-weight: 600; color: white; transition: all 0.3s ease; cursor: pointer;
        }
        .memory-person-avatar:hover { transform: scale(1.2); border-color: white; z-index: 10; }
        .memory-person-avatar img { width: 100%; height: 100%; object-fit: cover; }
        
        .emma-drop-zone {
          border: 2px dashed rgba(139, 92, 246, 0.6); border-radius: 16px; padding: 40px;
          text-align: center; background: rgba(139, 92, 246, 0.1); cursor: pointer;
          transition: all 0.3s ease; margin: 20px 0;
        }
        .emma-drop-zone:hover { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.2); }
        .emma-drop-zone.drag-over { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.3); transform: scale(1.02); }
        
        .people-selection-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin: 16px 0;
        }
        .person-select-card {
          background: rgba(255, 255, 255, 0.05); border: 2px solid transparent; border-radius: 12px;
          padding: 16px; text-align: center; cursor: pointer; transition: all 0.3s ease;
        }
        .person-select-card:hover { background: rgba(255, 255, 255, 0.1); }
        .person-select-card.selected { border-color: #8b5cf6; background: rgba(139, 92, 246, 0.2); }
        
        .media-preview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin: 16px 0; }
        .media-preview-item { position: relative; border-radius: 8px; overflow: hidden; aspect-ratio: 1; }
        .media-preview-item img, .media-preview-item video { width: 100%; height: 100%; object-fit: cover; }
        .media-remove { position: absolute; top: 4px; right: 4px; background: rgba(255, 0, 0, 0.8); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; }
      </style>
      
      <div class="dialog-content" style="position: relative; z-index: 10001 !important; max-width: 600px; max-height: 80vh; overflow-y: auto;">
        <div class="dialog-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <h3 style="margin: 0; color: white;">📷 Create Photo Memory</h3>
          <button class="dialog-close" onclick="this.closest('.memory-preview-dialog').remove()" style="z-index: 10002 !important; background: none; border: none; color: white; font-size: 24px; cursor: pointer;">×</button>
        </div>
        
        <div class="dialog-body">
          <!-- Memory Content -->
          <div style="margin-bottom: 24px;">
            <label style="display: block; color: white; margin-bottom: 8px; font-weight: 600;">Memory Description:</label>
            <textarea id="memory-content-${memory.id}" style="width: 100%; min-height: 80px; padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); color: white; resize: vertical;" placeholder="Describe this memory...">${memory.content}</textarea>
          </div>

          <!-- Media Upload Section -->
          <div style="margin-bottom: 24px;">
            <h4 style="color: white; margin-bottom: 12px;">📷 Add Photos & Videos</h4>
            <div class="emma-drop-zone" id="drop-zone-${memory.id}" onclick="document.getElementById('file-input-${memory.id}').click()">
              <div style="color: white;">
                <div style="font-size: 48px; margin-bottom: 12px;">📷</div>
                <div style="font-size: 18px; margin-bottom: 8px;">Drop photos here or click to browse</div>
                <div style="font-size: 14px; opacity: 0.8;">JPG, PNG, MP4, MOV - Max 50MB per file</div>
              </div>
              <input type="file" id="file-input-${memory.id}" multiple accept="image/*,video/*" style="display: none;" onchange="window.chatExperience.handleEnhancedFileSelect(event, '${memory.id}')">
            </div>
            <div class="media-preview-grid" id="media-grid-${memory.id}"></div>
          </div>

          <!-- People Selection Section -->
          <div style="margin-bottom: 24px;">
            <h4 style="color: white; margin-bottom: 12px;">👥 Tag People in This Memory</h4>
            <div class="people-selection-grid" id="people-grid-${memory.id}">
              <div style="color: white; opacity: 0.8; grid-column: 1 / -1; text-align: center; padding: 20px;">Loading people...</div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button onclick="this.closest('.memory-preview-dialog').remove()" style="padding: 12px 24px; background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 8px; cursor: pointer;">Cancel</button>
            <button onclick="window.chatExperience.saveEnhancedMemory('${memory.id}')" style="padding: 12px 24px; background: linear-gradient(135deg, #8b5cf6, #ec4899); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">💝 Save Memory</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);
    
    // Load people data for selection
    this.loadPeopleForSelection(memory.id);
    
    // Setup drag and drop
    this.setupEnhancedDragDrop(memory.id);

    } catch (error) {
      console.error('❌ Error showing enhanced memory preview:', error);
      // Fallback to simple alert
      window.emmaInfo("I'd love to help you save photos! Please try the regular memory capture for now.", {
        title: "Photo Saving",
        helpText: "The memory capture feature works beautifully for photos."
      });
    }
  }

  /**
   * Create beautiful people avatars for memory capsule
   */
  async createCapsulePeopleAvatars(memory) {
    try {
      console.log('👥 Looking for avatars container:', `people-grid-${memory.id}`);
      const avatarsContainer = document.getElementById(`people-grid-${memory.id}`);
      if (!avatarsContainer) {
        console.warn('👥 Avatars container not found for memory:', memory.id);
        console.log('👥 Available elements:', document.querySelectorAll('[id*="capsule"]'));
        return;
      }
      console.log('👥 Found avatars container:', avatarsContainer);

      // Get people connected to this memory
      console.log('👥 AVATAR DEBUG: Memory metadata:', memory.metadata);
      console.log('👥 AVATAR DEBUG: People in memory:', memory.metadata?.people);
      
      if (!memory.metadata?.people?.length) {
        console.warn('👥 AVATAR DEBUG: No people found in memory metadata');
        avatarsContainer.innerHTML = '<span style="color: #888;">No people connected</span>';
        return;
      }
      
      console.log('👥 AVATAR DEBUG: Will create avatars for', memory.metadata.people.length, 'people');

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

      // Use EXACT constellation avatar code for consistency
      const connectedPeople = memory.metadata.people.slice(0, 3); // Limit to 3 like constellation
      
      for (const personId of connectedPeople) {
        // Check if this is a new person (temp ID)
        const isNewPerson = personId.startsWith('temp_');
        let person = null;

        if (isNewPerson) {
          // Create temporary person object for new people
          const tempName = personId.replace('temp_', '');
          person = {
            id: personId,
            name: tempName.charAt(0).toUpperCase() + tempName.slice(1),
            isNew: true
          };
        } else {
          person = peopleData[personId];
          if (!person) {
            console.warn('👥 Person not found in vault:', personId);
            continue;
          }
        }

        console.log('👥 Creating constellation-style avatar for:', person.name);

        // Create avatar with EXACT constellation styling
        const avatar = document.createElement('div');
        avatar.className = 'memory-person-avatar';
        avatar.title = person.name + (person.isNew ? ' (NEW)' : '');

        // Start with letter (constellation style)
        avatar.textContent = person.name.charAt(0).toUpperCase();

        // 🎯 CRITICAL FIX: Apply proper styling for ALL avatars
        avatar.style.cssText = `
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 18px;
          color: white;
          margin-right: 8px;
          flex-shrink: 0;
        `;

        // Apply styling based on person type
        if (person.isNew) {
          // NEW person styling (bright and attention-grabbing)
          avatar.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%)';
          avatar.style.border = '2px solid #ffeb3b';
          avatar.style.boxShadow = '0 0 10px rgba(255, 235, 59, 0.5)';
        } else {
          // EXISTING person styling (consistent with constellation)
          avatar.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)';
          avatar.style.border = '1px solid rgba(255, 255, 255, 0.2)';
          avatar.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.3)';
        }

        // Try to load person's avatar if they have one (existing people)
        if (!person.isNew && person.avatarUrl) {
          const img = document.createElement('img');
          img.src = person.avatarUrl;
          img.alt = `${person.name} avatar`;
          img.onload = () => {
            avatar.innerHTML = '';
            avatar.appendChild(img);
          };
          img.onerror = () => {
            // Keep letter fallback
          };
        } else if (!person.isNew && person.avatarId) {
          try {
            // Load from vault (exact constellation code)
            window.emmaWebVault.getMedia(person.avatarId).then(avatarData => {
              if (avatarData && avatarData.byteLength > 100) {
                const blob = new Blob([avatarData], { type: 'image/jpeg' });
                const url = URL.createObjectURL(blob);
                
                const img = document.createElement('img');
                img.src = url;
                img.alt = `${person.name} avatar`;
                img.onload = () => {
                  avatar.innerHTML = '';
                  avatar.appendChild(img);
                };
                img.onerror = () => {
                  // Keep beautiful letter fallback
                };
              } else {
                // Data too small or corrupted - keep beautiful letter fallback
              }
            }).catch(error => {
              // Vault photo corrupted - keep beautiful letter fallback
            });
          } catch (error) {
            // Keep beautiful letter fallback
          }
        }

        avatarsContainer.appendChild(avatar);
      }

    } catch (error) {
      console.error('❌ Error creating capsule people avatars:', error);
    }
  }

  /**
   * Edit memory details with proper modal
   */
  editMemoryDetails(memoryId) {
    // 🎯 CRITICAL FIX: Check temporary memories first (for preview editing)
    let memory = this.temporaryMemories.get(memoryId);
    
    // If not in temporary storage, try vault
    if (!memory && window.emmaWebVault && window.emmaWebVault.vaultData && window.emmaWebVault.vaultData.content) {
      const memories = window.emmaWebVault.vaultData.content.memories || {};
      memory = memories[memoryId];
    }
    
    if (!memory) {
      console.error('❌ Memory not found with ID:', memoryId, 'Available temporary memories:', Array.from(this.temporaryMemories.keys()));
      this.showToast('❌ Memory not found!', 'error');
      return;
    }
    
    console.log('✅ EDIT: Found memory for editing:', memory.id, memory.title || memory.content?.substring(0, 50));
    console.log('🔍 EDIT: Memory attachments structure:', memory.attachments?.length, memory.attachments?.slice(0, 2));

    // 🎯 CRITICAL FIX: Process vault attachments to resolve media data (same as dashboard)
    if (memory.attachments && window.emmaWebVault?.vaultData?.content?.media) {
      const vaultMedia = window.emmaWebVault.vaultData.content.media;
      memory.attachments = memory.attachments.map(attachment => {
        if (attachment.id && vaultMedia[attachment.id]) {
          const mediaItem = vaultMedia[attachment.id];
          console.log('🔍 EDIT: Resolving attachment:', attachment.id, 'to media data');
          return {
            ...attachment,
            data: mediaItem.data.startsWith('data:') 
              ? mediaItem.data 
              : `data:${mediaItem.type};base64,${mediaItem.data}`,
            dataUrl: mediaItem.data.startsWith('data:') 
              ? mediaItem.data 
              : `data:${mediaItem.type};base64,${mediaItem.data}`,
            url: mediaItem.data.startsWith('data:') 
              ? mediaItem.data 
              : `data:${mediaItem.type};base64,${mediaItem.data}`
          };
        }
        return attachment;
      });
      console.log('✅ EDIT: Processed attachments with media data:', memory.attachments?.length);
    }

    // Close the preview dialog first
    const dialog = document.querySelector('.memory-preview-dialog');
    if (dialog) dialog.remove();

    // Create edit modal
    const editModal = document.createElement('div');
    editModal.className = 'memory-edit-modal';
    editModal.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      z-index: 15000 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: rgba(0, 0, 0, 0.9) !important;
      backdrop-filter: blur(20px) !important;
    `;

    editModal.innerHTML = `
      <div class="edit-modal-content" style="
        background: linear-gradient(135deg, rgba(147, 112, 219, 0.95), rgba(123, 104, 238, 0.95));
        border-radius: 20px;
        padding: 30px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        color: white;
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
          <h2 style="margin: 0; font-size: 24px; font-weight: 600;">✏️ Edit Memory</h2>
          <button class="close-edit-btn" style="background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; font-size: 20px;">×</button>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: rgba(255, 255, 255, 0.9);">Title:</label>
          <input type="text" class="edit-title-input" value="${memory.metadata?.title || memory.title || ''}" style="
            width: 100%;
            padding: 12px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            font-size: 16px;
            box-sizing: border-box;
          " placeholder="Enter memory title...">
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: rgba(255, 255, 255, 0.9);">Content:</label>
          <textarea class="edit-content-textarea" style="
            width: 100%;
            min-height: 120px;
            padding: 12px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            font-size: 14px;
            line-height: 1.5;
            resize: vertical;
            box-sizing: border-box;
          " placeholder="Describe this memory...">${memory.content || ''}</textarea>
        </div>

        <div style="margin-bottom: 25px;">
          <label style="display: block; margin-bottom: 12px; font-weight: 600; color: rgba(255, 255, 255, 0.9);">👥 Who is in this memory?</label>
          <div class="people-picker-container" style="
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 20px;
          ">
            <div class="people-picker-grid" style="
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
              gap: 15px;
              margin-bottom: 15px;
            ">
              <!-- People will be loaded here -->
            </div>
            <div style="text-align: center; color: rgba(255, 255, 255, 0.6); font-size: 14px;">
              Loading people from vault...
            </div>
          </div>
        </div>

        <div style="margin-bottom: 25px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: rgba(255, 255, 255, 0.9);">📎 Attachments (${memory.attachments?.length || 0}):</label>
          <div class="edit-attachments-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px; margin-top: 10px;">
            ${(memory.attachments || []).map((attachment, index) => `
              <div style="position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; background: rgba(255, 255, 255, 0.1);">
                ${(attachment.data || attachment.dataUrl || attachment.url) ? `
                  <img src="${attachment.data || attachment.dataUrl || attachment.url}" style="width: 100%; height: 100%; object-fit: cover;" alt="Attachment ${index + 1}" onerror="this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.6);font-size:24px;\\'>📷</div>'">
                ` : `
                  <div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.6);font-size:24px;">📷</div>
                `}
                <button class="remove-attachment-btn" data-index="${index}" style="
                  position: absolute;
                  top: 4px;
                  right: 4px;
                  background: rgba(255, 0, 0, 0.8);
                  border: none;
                  color: white;
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  cursor: pointer;
                  font-size: 12px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">×</button>
              </div>
            `).join('')}
            <div style="
              aspect-ratio: 1;
              border: 2px dashed rgba(255, 255, 255, 0.4);
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              background: rgba(255, 255, 255, 0.05);
              transition: all 0.3s ease;
            " class="add-media-btn">
              <span style="font-size: 24px; color: rgba(255, 255, 255, 0.6);">+</span>
            </div>
          </div>
          <input type="file" class="media-file-input" multiple accept="image/*,video/*" style="display: none;">
        </div>

        <div style="display: flex; gap: 15px; justify-content: flex-end;">
          <button class="cancel-edit-btn" style="
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
          ">Cancel</button>
          <button class="save-edit-btn" style="
            background: linear-gradient(135deg, #10b981, #059669);
            border: none;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
          ">💾 Save Changes</button>
        </div>
      </div>
    `;

    document.body.appendChild(editModal);

    // Add event listeners
    const titleInput = editModal.querySelector('.edit-title-input');
    const contentTextarea = editModal.querySelector('.edit-content-textarea');
    const saveBtn = editModal.querySelector('.save-edit-btn');
    const cancelBtn = editModal.querySelector('.cancel-edit-btn');
    const closeBtn = editModal.querySelector('.close-edit-btn');
    const addMediaBtn = editModal.querySelector('.add-media-btn');
    const fileInput = editModal.querySelector('.media-file-input');

    // Close handlers
    const closeModal = () => editModal.remove();
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeModal();
    });

    // Add media handler
    addMediaBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      // 🎯 CRITICAL FIX: Implement proper file upload like memory capsules
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      
      console.log('📎 EDIT: Processing', files.length, 'uploaded files');
      this.showToast(`📎 Processing ${files.length} file${files.length > 1 ? 's' : ''}...`, 'info');
      
      try {
        // Process each file
        for (const file of files) {
          // Convert to data URL for display and storage
          const dataUrl = await this.fileToBase64(file);
          
          // Add to memory attachments
          memory.attachments = memory.attachments || [];
          memory.attachments.push({
            id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: file.type,
            name: file.name,
            size: file.size,
            data: dataUrl,
            dataUrl: dataUrl // For compatibility
          });
        }
        
        // Update temporary memory storage
        this.temporaryMemories.set(memory.id, memory);
        
        // Re-render the edit modal to show new attachments
        this.editMemoryDetails(memoryId);
        
        this.showToast(`✅ Added ${files.length} file${files.length > 1 ? 's' : ''} to memory!`, 'success');
        
      } catch (error) {
        console.error('❌ Error processing files:', error);
        this.showToast('❌ Failed to process files', 'error');
      }
    });

    // Remove attachment handlers
    editModal.querySelectorAll('.remove-attachment-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        memory.attachments.splice(index, 1);
        
        // 🎯 CRITICAL FIX: Update temporary memory storage after removal
        this.temporaryMemories.set(memory.id, memory);
        console.log('🗑️ EDIT: Removed attachment at index', index);
        
        // Re-render attachments grid
        this.editMemoryDetails(memoryId);
      });
    });

    // Load people for picker
    this.loadPeopleForPicker(editModal, memory);

    // Save handler
    saveBtn.addEventListener('click', async () => {
      const title = titleInput.value.trim() || 'Untitled Memory';
      const content = contentTextarea.value.trim();

      // Get selected people
      const selectedPeople = Array.from(editModal.querySelectorAll('.person-picker-item.selected'))
        .map(item => ({
          id: item.dataset.personId,
          name: item.dataset.personName
        }));

      // Update memory object
      memory.metadata = memory.metadata || {};
      memory.metadata.title = title;
      memory.metadata.people = selectedPeople;
      memory.title = title;
      memory.content = content;
      
      // 🎯 CRITICAL FIX: Update temporary memory storage with changes
      this.temporaryMemories.set(memory.id, memory);
      console.log('✅ EDIT: Updated temporary memory:', memory.id, 'with changes');

      // 🎯 CRITICAL FIX: For media request workflows, save to vault first, THEN close dialog
      console.log('🔍 EDIT: Checking mediaUpload flag:', memory.metadata?.mediaUpload, 'Full metadata:', memory.metadata);
      if (memory.metadata?.mediaUpload) {
        console.log('💾 EDIT: Media request workflow detected - saving to vault before closing dialog');
        
        // Show saving toast but don't close dialog yet
        this.showToast('💾 Saving to vault...', 'info');
        
        setTimeout(async () => {
          try {
            await this.saveMemoryToVault(memory.id);
            
            // NOW close the dialog after successful save
            closeModal();
            this.showToast('✅ Memory saved to vault!', 'success');
            
            // 🎯 TRIGGER CONSTELLATION REFRESH
            console.log('🔄 EDIT: Triggering constellation refresh after vault save...');
            window.dispatchEvent(new CustomEvent('emmaMemoryAdded', {
              detail: { 
                memoryId: memory.id,
                source: 'emma-chat-edit',
                timestamp: Date.now()
              }
            }));
            
          } catch (error) {
            console.error('❌ EDIT: Error auto-saving to vault:', error);
            this.showToast('❌ Failed to save to vault', 'error');
            // Close dialog even if save failed
            closeModal();
          }
        }, 500);
      } else {
        // Regular edit flow - close immediately and refresh preview
        this.showToast('💾 Changes saved!', 'success');
        closeModal();
        
        setTimeout(() => {
          this.showMemoryPreviewDialog(memory);
        }, 300);
      }
    });

    // Focus title input
    setTimeout(() => titleInput.focus(), 100);
  }

  /**
   * Load people from vault for the picker
   */
  async loadPeopleForPicker(modal, memory) {
    const grid = modal.querySelector('.people-picker-grid');
    const loadingText = modal.querySelector('.people-picker-container div:last-child');
    
    try {
      // Get people from vault
      let people = [];
      
      // FIXED: Use proper vault methods that resolve avatar URLs
      console.log('👥 PICKER: Loading people with avatars...');
      
      // Try EmmaAPI first
      if (window.emmaAPI && 
          typeof window.emmaAPI.people === 'object' && 
          window.emmaAPI.people !== null &&
          typeof window.emmaAPI.people.list === 'function') {
        try {
          const result = await window.emmaAPI.people.list();
          if (result && result.success && Array.isArray(result.items)) {
            people = result.items;
            console.log('👥 PICKER: Got people from EmmaAPI:', people.length);
          }
        } catch (apiError) {
          console.log('📝 EmmaAPI people.list failed:', apiError);
        }
      }
      
      // Try vault primary getPeople method (resolves avatars!)
      if (people.length === 0 && window.emmaVaultPrimary && typeof window.emmaVaultPrimary.getPeople === 'function') {
        try {
          people = await window.emmaVaultPrimary.getPeople();
          console.log('👥 PICKER: Got people from VaultPrimary with avatars:', people.length);
        } catch (vaultError) {
          console.log('📝 VaultPrimary getPeople failed:', vaultError);
        }
      }
      
      // Try web vault method
      if (people.length === 0 && 
          window.emmaWebVault && 
          typeof window.emmaWebVault.listPeople === 'function') {
        try {
          people = await window.emmaWebVault.listPeople();
          console.log('👥 PICKER: Got people from WebVault listPeople:', people.length);
        } catch (vaultError) {
          console.log('📝 Vault listPeople failed:', vaultError);
        }
      }
      
      // Last resort: Manual avatar resolution from raw vault data
      if (people.length === 0 && 
          window.emmaWebVault && 
          window.emmaWebVault.vaultData && 
          window.emmaWebVault.vaultData.content &&
          window.emmaWebVault.vaultData.content.people) {
        try {
          console.log('👥 PICKER: Manually resolving people avatars from raw data...');
          const rawPeople = Object.values(window.emmaWebVault.vaultData.content.people) || [];
          const media = window.emmaWebVault.vaultData.content.media || {};
          
          // Manually resolve avatars like the vault methods do
          people = rawPeople.map(person => {
            let avatarUrl = person.avatarUrl;
            
            // Resolve avatar from media if needed
            if (!avatarUrl && person.avatarId && media[person.avatarId]) {
              const mediaItem = media[person.avatarId];
              if (mediaItem && mediaItem.data) {
                avatarUrl = mediaItem.data.startsWith('data:')
                  ? mediaItem.data
                  : `data:${mediaItem.type};base64,${mediaItem.data}`;
                console.log(`👥 PICKER: Resolved avatar for ${person.name}:`, avatarUrl.substring(0, 50) + '...');
              }
            }
            
            return {
              ...person,
              avatarUrl
            };
          });
          
          console.log('👥 PICKER: Manually resolved avatars for', people.length, 'people');
        } catch (directError) {
          console.log('📝 Manual avatar resolution failed:', directError);
        }
      }

      // Get currently selected people
      const selectedPeopleIds = (memory.metadata?.people || []).map(p => p.id);
      
      if (people.length === 0) {
        loadingText.textContent = 'No people in vault yet. Add people first!';
        loadingText.style.color = 'rgba(255, 255, 255, 0.8)';
        return;
      }

      // 🎯 CRITICAL FIX: Clear grid to prevent duplication!
      console.log('🧹 PICKER: Clearing grid to prevent duplication...');
      grid.innerHTML = '';
      
      // Hide loading text
      loadingText.style.display = 'none';
      
      // Add "Create New Person" option first
      const addPersonItem = document.createElement('div');
      addPersonItem.className = 'add-person-item';
      addPersonItem.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 15px;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        background: rgba(139, 92, 246, 0.15);
        border: 2px dashed #8b5cf6;
        position: relative;
      `;
      
      // Create add person avatar
      const addAvatar = document.createElement('div');
      addAvatar.style.cssText = `
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: rgba(139, 92, 246, 0.2);
        border: 3px dashed #8b5cf6;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        color: #8b5cf6;
        margin-bottom: 8px;
        transition: all 0.3s ease;
      `;
      addAvatar.textContent = '+';
      
      // Create add person label
      const addLabel = document.createElement('div');
      addLabel.textContent = 'Add Person';
      addLabel.style.cssText = `
        font-size: 14px;
        font-weight: 600;
        color: #8b5cf6;
        text-align: center;
        margin-bottom: 4px;
      `;
      
      // Create instruction label
      const instructionLabel = document.createElement('div');
      instructionLabel.textContent = 'Click to create';
      instructionLabel.style.cssText = `
        font-size: 12px;
        color: rgba(139, 92, 246, 0.8);
        text-align: center;
      `;
      
      addPersonItem.appendChild(addAvatar);
      addPersonItem.appendChild(addLabel);
      addPersonItem.appendChild(instructionLabel);
      
      // Add click handler for new person
      addPersonItem.addEventListener('click', () => {
        this.showAddPersonDialog(modal, memory);
      });
      
      // Add hover effects
      addPersonItem.addEventListener('mouseenter', () => {
        addPersonItem.style.background = 'rgba(139, 92, 246, 0.25)';
        addPersonItem.style.transform = 'scale(1.02)';
        addAvatar.style.background = 'rgba(139, 92, 246, 0.3)';
        addAvatar.style.transform = 'scale(1.1)';
      });
      
      addPersonItem.addEventListener('mouseleave', () => {
        addPersonItem.style.background = 'rgba(139, 92, 246, 0.15)';
        addPersonItem.style.transform = 'scale(1)';
        addAvatar.style.background = 'rgba(139, 92, 246, 0.2)';
        addAvatar.style.transform = 'scale(1)';
      });
      
      grid.appendChild(addPersonItem);

      // Create people picker items
      people.forEach(person => {
        const isSelected = selectedPeopleIds.includes(person.id);
        
        const personItem = document.createElement('div');
        personItem.className = `person-picker-item ${isSelected ? 'selected' : ''}`;
        personItem.dataset.personId = person.id;
        personItem.dataset.personName = person.name;
        
        personItem.style.cssText = `
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 15px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          background: ${isSelected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
          border: 2px solid ${isSelected ? '#22c55e' : 'rgba(255, 255, 255, 0.2)'};
          transform: ${isSelected ? 'scale(1.05)' : 'scale(1)'};
        `;
        
        // Create large avatar
        const avatar = document.createElement('div');
        avatar.style.cssText = `
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
          color: white;
          margin-bottom: 8px;
          border: 3px solid ${isSelected ? '#22c55e' : 'rgba(255, 255, 255, 0.3)'};
          transition: all 0.3s ease;
        `;
        
        // FIXED: Load avatar properly using resolved avatarUrl
        const initials = person.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        avatar.textContent = initials; // Start with initials
        
        console.log(`👥 PICKER: Loading avatar for ${person.name}:`, {
          avatarUrl: person.avatarUrl ? person.avatarUrl.substring(0, 50) + '...' : 'none',
          avatarId: person.avatarId,
          avatar: person.avatar ? person.avatar.substring(0, 50) + '...' : 'none'
        });
        
        // Try avatarUrl first (resolved by vault methods)
        if (person.avatarUrl && person.avatarUrl.startsWith('data:')) {
          console.log(`📸 PICKER: Using resolved avatarUrl for ${person.name}`);
          const img = document.createElement('img');
          img.src = person.avatarUrl;
          img.alt = `${person.name} avatar`;
          img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 50%;';
          img.onload = () => {
            console.log(`✅ PICKER: Avatar loaded successfully for ${person.name}`);
            avatar.innerHTML = '';
            avatar.appendChild(img);
          };
          img.onerror = (error) => {
            console.log(`❌ PICKER: Avatar URL failed for ${person.name}:`, error);
          };
        } 
        // Fallback to legacy avatar field
        else if (person.avatar && person.avatar.startsWith('data:')) {
          console.log(`📸 PICKER: Using legacy avatar field for ${person.name}`);
          const img = document.createElement('img');
          img.src = person.avatar;
          img.alt = `${person.name} avatar`;
          img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 50%;';
          img.onload = () => {
            console.log(`✅ PICKER: Legacy avatar loaded for ${person.name}`);
            avatar.innerHTML = '';
            avatar.appendChild(img);
          };
          img.onerror = (error) => {
            console.log(`❌ PICKER: Legacy avatar failed for ${person.name}:`, error);
          };
        }
        // Final fallback: try to manually resolve avatarId if still needed
        else if (person.avatarId && window.emmaWebVault) {
          console.log(`📸 PICKER: Manually loading avatarId for ${person.name}:`, person.avatarId);
          try {
            window.emmaWebVault.getMedia(person.avatarId).then(avatarData => {
              if (avatarData) {
                console.log(`📸 PICKER: Got media data for ${person.name}:`, typeof avatarData);
                // Handle both ArrayBuffer and data URL responses
                let imageUrl;
                if (typeof avatarData === 'string' && avatarData.startsWith('data:')) {
                  imageUrl = avatarData;
                } else if (avatarData.byteLength > 100) {
                  const blob = new Blob([avatarData], { type: 'image/jpeg' });
                  imageUrl = URL.createObjectURL(blob);
                }
                
                if (imageUrl) {
                  const img = document.createElement('img');
                  img.src = imageUrl;
                  img.alt = `${person.name} avatar`;
                  img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 50%;';
                  img.onload = () => {
                    console.log(`✅ PICKER: Manual avatar loaded for ${person.name}`);
                    avatar.innerHTML = '';
                    avatar.appendChild(img);
                  };
                  img.onerror = (error) => {
                    console.log(`❌ PICKER: Manual avatar failed for ${person.name}:`, error);
                  };
                }
              } else {
                console.log(`📸 PICKER: No media data returned for ${person.name}`);
              }
            }).catch(error => {
              console.log(`❌ PICKER: Avatar fetch failed for ${person.name}:`, error);
            });
          } catch (error) {
            console.log(`❌ PICKER: Avatar access failed for ${person.name}:`, error);
          }
        } else {
          console.log(`📸 PICKER: No avatar available for ${person.name}, using initials`);
        }
        
        // Create name label
        const nameLabel = document.createElement('div');
        nameLabel.textContent = person.name;
        nameLabel.style.cssText = `
          font-size: 14px;
          font-weight: 600;
          color: white;
          text-align: center;
          word-break: break-word;
          margin-bottom: 4px;
        `;
        
        // Create relation label
        const relationLabel = document.createElement('div');
        relationLabel.textContent = person.relation || 'other';
        relationLabel.style.cssText = `
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
          text-transform: capitalize;
        `;
        
        // Add selection indicator
        const selectionIndicator = document.createElement('div');
        selectionIndicator.className = 'selection-indicator';
        selectionIndicator.style.cssText = `
          position: absolute;
          top: 8px;
          right: 8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: ${isSelected ? '#22c55e' : 'rgba(255, 255, 255, 0.2)'};
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: white;
          font-weight: bold;
          transition: all 0.3s ease;
        `;
        selectionIndicator.textContent = isSelected ? '✓' : '';
        
        // Make personItem relative for absolute positioning
        personItem.style.position = 'relative';
        
        personItem.appendChild(avatar);
        personItem.appendChild(nameLabel);
        personItem.appendChild(relationLabel);
        personItem.appendChild(selectionIndicator);
        
        // Add click handler
        personItem.addEventListener('click', () => {
          const isCurrentlySelected = personItem.classList.contains('selected');
          
          if (isCurrentlySelected) {
            // Deselect
            personItem.classList.remove('selected');
            personItem.style.background = 'rgba(255, 255, 255, 0.1)';
            personItem.style.border = '2px solid rgba(255, 255, 255, 0.2)';
            personItem.style.transform = 'scale(1)';
            avatar.style.border = '3px solid rgba(255, 255, 255, 0.3)';
            selectionIndicator.style.background = 'rgba(255, 255, 255, 0.2)';
            selectionIndicator.textContent = '';
          } else {
            // Select
            personItem.classList.add('selected');
            personItem.style.background = 'rgba(34, 197, 94, 0.3)';
            personItem.style.border = '2px solid #22c55e';
            personItem.style.transform = 'scale(1.05)';
            avatar.style.border = '3px solid #22c55e';
            selectionIndicator.style.background = '#22c55e';
            selectionIndicator.textContent = '✓';
          }
        });
        
        // Add hover effects
        personItem.addEventListener('mouseenter', () => {
          if (!personItem.classList.contains('selected')) {
            personItem.style.background = 'rgba(255, 255, 255, 0.15)';
            personItem.style.transform = 'scale(1.02)';
          }
        });
        
        personItem.addEventListener('mouseleave', () => {
          if (!personItem.classList.contains('selected')) {
            personItem.style.background = 'rgba(255, 255, 255, 0.1)';
            personItem.style.transform = 'scale(1)';
          }
        });
        
        grid.appendChild(personItem);
      });
      
    } catch (error) {
      console.error('❌ Error loading people for picker:', error);
      loadingText.textContent = 'Error loading people from vault';
      loadingText.style.color = 'rgba(255, 100, 100, 0.8)';
    }
  }

  /**
   * Show dialog to add a new person to the vault
   */
  showAddPersonDialog(parentModal, memory) {
    // Create add person dialog
    const addPersonDialog = document.createElement('div');
    addPersonDialog.className = 'add-person-dialog';
    addPersonDialog.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      z-index: 20000 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: rgba(0, 0, 0, 0.95) !important;
      backdrop-filter: blur(25px) !important;
    `;

    addPersonDialog.innerHTML = `
      <div class="add-person-modal-content" style="
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(124, 58, 237, 0.95));
        border-radius: 20px;
        padding: 30px;
        max-width: 500px;
        width: 90%;
        color: white;
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        transform: scale(0.9);
        opacity: 0;
        transition: all 0.3s ease;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
          <h2 style="margin: 0; font-size: 24px; font-weight: 600;">👤 Add New Person</h2>
          <button class="close-add-person-btn" style="background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; font-size: 20px;">×</button>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: rgba(255, 255, 255, 0.9);">Person's Name *</label>
          <input type="text" class="person-name-input" placeholder="Enter their name..." style="
            width: 100%;
            padding: 15px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.15);
            color: white;
            font-size: 18px;
            box-sizing: border-box;
            font-weight: 500;
          ">
        </div>

        <div style="margin-bottom: 25px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: rgba(255, 255, 255, 0.9);">Relationship</label>
          <select class="person-relation-select" style="
            width: 100%;
            padding: 15px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.15);
            color: white;
            font-size: 16px;
            box-sizing: border-box;
            cursor: pointer;
          ">
            <option value="family" style="background: #333; color: white;">Family</option>
            <option value="friend" style="background: #333; color: white;">Friend</option>
            <option value="neighbor" style="background: #333; color: white;">Neighbor</option>
            <option value="caregiver" style="background: #333; color: white;">Caregiver</option>
            <option value="doctor" style="background: #333; color: white;">Doctor</option>
            <option value="other" style="background: #333; color: white;">Other</option>
          </select>
        </div>

        <div style="background: rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 15px; margin-bottom: 25px;">
          <div style="font-size: 14px; color: rgba(255, 255, 255, 0.8); line-height: 1.4;">
            💡 <strong>Tip:</strong> This person will be saved to your vault and automatically added to this memory!
          </div>
        </div>

        <div style="display: flex; gap: 15px; justify-content: flex-end;">
          <button class="cancel-add-person-btn" style="
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 12px 24px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
            font-size: 16px;
          ">Cancel</button>
          <button class="save-person-btn" style="
            background: linear-gradient(135deg, #ffffff, #f3f4f6);
            border: none;
            color: #8b5cf6;
            padding: 12px 24px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 700;
            font-size: 16px;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
          ">✨ Add Person</button>
        </div>
      </div>
    `;

    document.body.appendChild(addPersonDialog);

    // Animate in
    setTimeout(() => {
      const content = addPersonDialog.querySelector('.add-person-modal-content');
      content.style.transform = 'scale(1)';
      content.style.opacity = '1';
    }, 50);

    // Get elements
    const nameInput = addPersonDialog.querySelector('.person-name-input');
    const relationSelect = addPersonDialog.querySelector('.person-relation-select');
    const saveBtn = addPersonDialog.querySelector('.save-person-btn');
    const cancelBtn = addPersonDialog.querySelector('.cancel-add-person-btn');
    const closeBtn = addPersonDialog.querySelector('.close-add-person-btn');

    // Close handlers
    const closeDialog = () => {
      const content = addPersonDialog.querySelector('.add-person-modal-content');
      content.style.transform = 'scale(0.9)';
      content.style.opacity = '0';
      setTimeout(() => addPersonDialog.remove(), 300);
    };

    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);
    addPersonDialog.addEventListener('click', (e) => {
      if (e.target === addPersonDialog) closeDialog();
    });

    // Save handler
    saveBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      const relation = relationSelect.value;

      if (!name) {
        nameInput.focus();
        nameInput.style.border = '2px solid #ef4444';
        this.showToast('❌ Please enter a name!', 'error');
        return;
      }

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = '💫 Creating...';

        // Create person in vault
        const newPerson = {
          name: name,
          relation: relation,
          contact: '',
          notes: '',
          created: new Date().toISOString()
        };

        let personResult;
        
        // SAFE ACCESS: Try different methods to add person to vault
        if (window.emmaAPI && 
            typeof window.emmaAPI.people === 'object' && 
            window.emmaAPI.people !== null &&
            typeof window.emmaAPI.people.add === 'function') {
          try {
            personResult = await window.emmaAPI.people.add(newPerson);
          } catch (apiError) {
            console.log('📝 EmmaAPI people.add failed, trying vault method:', apiError);
          }
        }
        
        // Fallback to vault method if API failed or doesn't exist
        if (!personResult && 
            window.emmaWebVault && 
            typeof window.emmaWebVault.addPerson === 'function') {
          try {
            personResult = await window.emmaWebVault.addPerson(newPerson);
          } catch (vaultError) {
            console.log('📝 Vault addPerson failed:', vaultError);
            throw new Error('Failed to add person to vault');
          }
        }
        
        // If no methods worked, throw error
        if (!personResult) {
          throw new Error('No valid method found to add person to vault');
        }

        if (personResult && (personResult.success || personResult.id)) {
          const personId = personResult.id || personResult.person?.id;
          
          // Auto-select the new person in the memory
          memory.metadata = memory.metadata || {};
          memory.metadata.people = memory.metadata.people || [];
          memory.metadata.people.push({
            id: personId,
            name: name
          });

          this.showToast(`✨ ${name} added to vault and memory!`, 'success');
          closeDialog();

          // Refresh the people picker
          setTimeout(() => {
            this.loadPeopleForPicker(parentModal, memory);
          }, 500);

        } else {
          throw new Error('Failed to create person');
        }

      } catch (error) {
        console.error('❌ Error adding person:', error);
        this.showToast('❌ Failed to add person. Please try again.', 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = '✨ Add Person';
      }
    });

    // Enter key to save
    nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && nameInput.value.trim()) {
        saveBtn.click();
      }
    });

    // Focus name input
    setTimeout(() => nameInput.focus(), 100);
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
      const existingPeople = memory.metadata.people || [];
      const peopleNames = memory.metadata.peopleNames || [];
      
      console.log('👥 EMMA CHAT: Memory people analysis:', {
        newPeople,
        existingPeople, 
        peopleNames,
        hasNewPeople: newPeople.length > 0
      });
      
      console.log('🚨 DEBUG: confirmSaveMemory called with memoryId:', memoryId);
      
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
   * Start new person onboarding flow - HANDLES ALL NEW PEOPLE
   */
  async startNewPersonOnboarding(memoryId, newPeople) {
    // Store all pending people in captureSession for sequential processing
    this.captureSession = this.captureSession || {};
    this.captureSession.pendingNewPeople = [...newPeople]; // Copy array
    this.captureSession.memoryId = memoryId;
    
    console.log('👥 EMMA CHAT: Starting onboarding for ALL new people:', newPeople);
    
    // Start with the first person
    await this.processNextNewPerson();
  }

  /**
   * Process next person in the queue
   */
  async processNextNewPerson() {
    if (!this.captureSession || !this.captureSession.pendingNewPeople || this.captureSession.pendingNewPeople.length === 0) {
      // All people processed - finalize memory save
      console.log('👥 EMMA CHAT: All new people processed, finalizing memory save');
      const memory = this.temporaryMemories.get(this.captureSession.memoryId);
      if (memory) {
        await this.finalizeMemorySave(memory, this.captureSession.memoryId);
      }
      return;
    }

    const personName = this.captureSession.pendingNewPeople.shift(); // Remove first person from queue
    const remaining = this.captureSession.pendingNewPeople.length;
    
    let message = `Great! Let me add ${personName} to your vault first.`;
    if (remaining > 0) {
      message += ` After ${personName}, I'll ask about ${remaining} more ${remaining === 1 ? 'person' : 'people'}.`;
    }
    message += ` What's your relationship with ${personName}?`;
    
    this.addMessage(message, 'emma', {
      isNewPersonPrompt: true,
      memoryId: this.captureSession.memoryId,
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
      
      // CRITICAL: Check vault access first
      if (!window.emmaWebVault || !window.emmaWebVault.isOpen) {
        throw new Error('Vault is not accessible');
      }
      
      // Add person to vault with error handling
      const result = await window.emmaWebVault.addPerson({
        name: personName,
        relation: relationship, // CRITICAL FIX: API expects 'relation' not 'relationship'
        contact: '', // Add default contact
        avatar: null // Add default avatar
      });

      console.log('✅ PERSON ADDED SUCCESSFULLY:', result);

      this.addMessage(`Perfect! I've added ${personName} as a ${relationship} to your vault. Now let me create your memory capsule...`, 'emma');

      // Update the memory metadata to replace temp ID with real ID
      await this.updateMemoryWithRealPersonId(memoryId, personName);

      // Check if there are more people to process
      if (this.captureSession && this.captureSession.pendingNewPeople && this.captureSession.pendingNewPeople.length > 0) {
        console.log('👥 EMMA CHAT: Person added, continuing with next person...');
        await this.processNextNewPerson();
        return;
      }

      // All people processed - finalize memory save
      const state = this.enrichmentState.get(memoryId);
      if (state && state.memory) {
        await this.finalizeMemorySave(state.memory, memoryId);
      } else {
        console.error('❌ ADD PERSON: No state or memory found, cannot proceed with enrichment');
        // Try to save anyway with basic memory structure
        await this.fallbackMemorySave(memoryId, personName);
      }
      
    } catch (error) {
      console.error('❌ CRITICAL: Failed to add person to vault:', error);
      this.addMessage(`I had trouble adding ${personName} to your vault (${error.message}), but let me save your memory anyway.`, 'emma');
      
      // Always try to save the memory even if person addition fails
      const state = this.enrichmentState.get(memoryId);
      if (state && state.memory) {
        await this.finalizeMemorySave(state.memory, memoryId);
      } else {
        await this.fallbackMemorySave(memoryId, personName);
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
   * Fallback memory save when enrichment state is lost
   */
  async fallbackMemorySave(memoryId, personName = null) {
    try {
      console.log('🚨 FALLBACK: Attempting to save memory without enrichment state');
      
      // Try to find the memory in detected memories
      let memory = null;
      for (const [msgId, analysis] of this.detectedMemories) {
        if (analysis.memory && analysis.memory.id === memoryId) {
          memory = analysis.memory;
          break;
        }
      }
      
      if (!memory) {
        console.error('❌ FALLBACK: No memory found for ID:', memoryId);
        this.addMessage("I'm sorry, I couldn't find the memory to save. Please try creating it again.", 'emma');
        return;
      }
      
      // If we have a person name, try to add them to metadata
      if (personName && memory.metadata) {
        if (!memory.metadata.peopleNames) memory.metadata.peopleNames = [];
        if (!memory.metadata.peopleNames.includes(personName)) {
          memory.metadata.peopleNames.push(personName);
        }
      }
      
      await this.finalizeMemorySave(memory, memoryId);
      
    } catch (error) {
      console.error('❌ FALLBACK SAVE FAILED:', error);
      this.addMessage("I'm having trouble saving your memory. Please try again.", 'emma');
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
      let people = [];
      if (window.emmaWebVault && typeof window.emmaWebVault.listPeople === 'function') {
        people = await window.emmaWebVault.listPeople();
      }
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
        console.log('💾 FINAL MEMORY PEOPLE:', state.memory.metadata.people);
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
      // 🎯 CRITICAL FIX: Get memory from temporary storage first (in case it was edited)
      let memory = this.temporaryMemories.get(memoryId);
      
      // Fallback to enrichment state if not in temporary storage
      if (!memory) {
        const state = this.enrichmentState.get(memoryId);
        if (!state || !state.memory) {
          this.showToast('❌ Memory not found', 'error');
          return;
        }
        memory = state.memory;
      }
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
        
        // 🎯 CRITICAL FIX: Clean up temporary memory after successful save
        this.temporaryMemories.delete(memoryId);
        console.log('🧹 VAULT: Cleaned up temporary memory after successful save:', memoryId);
        
        // Add success message
        this.addMessage(`Perfect! I've saved your memory to your vault. It's now preserved forever! 💜`, 'emma');
        
        // Close any preview dialogs
        const dialogs = document.querySelectorAll('.memory-preview-dialog');
        dialogs.forEach(dialog => dialog.remove());
        
        // 🌟 CRITICAL: Refresh constellation IMMEDIATELY after memory save
        setTimeout(() => {
          console.log('🔄 EMMA CHAT: Forcing constellation refresh after memory save');
          
          // Method 1: If we're on memories page, directly refresh constellation
          if (window.loadConstellationView && typeof window.loadConstellationView === 'function') {
            console.log('🔄 EMMA CHAT: Calling loadConstellationView() directly');
            window.loadConstellationView();
          }
          // Method 2: If we're on dashboard, trigger constellation mode directly
          else if (window.location.pathname.includes('dashboard.html') || window.location.pathname === '/' || window.location.pathname === '') {
            console.log('🔄 EMMA CHAT: Triggering constellation mode on dashboard');
            // Trigger constellation mode directly (same as clicking "Memories" menu)
            if (window.emmaDashboard && typeof window.emmaDashboard.enterMemoryConstellation === 'function') {
              window.emmaDashboard.enterMemoryConstellation();
            } else {
              // Fallback: reload page and auto-trigger constellation
              window.location.href = window.location.origin + '/dashboard.html#constellation';
            }
          }
          // Method 3: Dispatch event for constellation to listen
          else {
            console.log('🔄 EMMA CHAT: Dispatching memory added event for constellation');
            window.dispatchEvent(new CustomEvent('emmaMemoryAdded', {
              detail: { 
                action: 'refresh_constellation',
                source: 'emma_chat',
                memoryId: memoryId,
                timestamp: new Date().toISOString()
              }
            }));
          }
        }, 500);
        
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
        
        // 🎯 CRITICAL FIX: Clean up temporary memory after successful save
        this.temporaryMemories.delete(memoryId);
        console.log('🧹 VAULT: Cleaned up temporary memory after direct save:', memoryId);

        // Close dialog
        const dialog = document.querySelector('.memory-preview-dialog');
        if (dialog) dialog.remove();

        // Add confirmation message and redirect to constellation
        this.addMessage("Perfect! Your memory has been saved to your vault. Let me show you how it connects to your other memories! 🌟", 'emma');

        // CRITICAL: Refresh constellation IMMEDIATELY after memory save
        setTimeout(() => {
          // Close chat experience first
          if (this.close) {
            this.close();
          }

          // FORCE CONSTELLATION REFRESH after memory save
          setTimeout(() => {
            console.log('🔄 EMMA CHAT: Forcing constellation refresh after memory save');
            
            // Method 1: If we're on memories page, directly refresh constellation
            if (window.loadConstellationView && typeof window.loadConstellationView === 'function') {
              console.log('🔄 EMMA CHAT: Calling loadConstellationView() directly');
              window.loadConstellationView();
            }
            // Method 2: If we're on dashboard, trigger constellation mode directly
            else if (window.location.pathname.includes('dashboard.html') || window.location.pathname === '/' || window.location.pathname === '') {
              console.log('🔄 EMMA CHAT: Triggering constellation mode on dashboard');
              // Trigger constellation mode directly (same as clicking "Memories" menu)
              if (window.emmaDashboard && typeof window.emmaDashboard.enterMemoryConstellation === 'function') {
                window.emmaDashboard.enterMemoryConstellation();
              } else {
                // Fallback: reload page and auto-trigger constellation
                window.location.href = 'dashboard.html#constellation';
              }
            }
            // Method 3: If we're on memories page but constellation function not available, reload with constellation view
            else if (window.location.pathname.includes('memories.html')) {
              console.log('🔄 EMMA CHAT: On memories page, forcing constellation view');
              const currentUrl = new URL(window.location);
              currentUrl.searchParams.set('view', 'constellation');
              window.location.href = currentUrl.toString();
            }
            // Method 4: Fallback - navigate to constellation from any other page
            else {
              console.log('🔄 EMMA CHAT: Fallback navigation to constellation view');
              const baseUrl = window.location.origin;
              window.location.href = baseUrl + '/dashboard.html#constellation';
            }
          }, 500);
        }, 1500);

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
      let existingPeople = [];
      if (window.emmaWebVault && typeof window.emmaWebVault.listPeople === 'function') {
        existingPeople = await window.emmaWebVault.listPeople();
      }
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
        relation: relationship, // CRITICAL FIX: API expects 'relation' not 'relationship'
        contact: '', // Add default contact
        avatar: null // Add default avatar
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

      const result = await this.vectorlessEngine.processQuestion(prompt, {});
      const response = result.success ? result.response : null;
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

      const result = await this.vectorlessEngine.processQuestion(prompt, {});
      const response = result.success ? result.response : null;
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

      const result = await this.vectorlessEngine.processQuestion(prompt, {});
      const response = result.success ? result.response : null;
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

      const result = await this.vectorlessEngine.processQuestion(prompt, {});
      const response = result.success ? result.response : null;
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

      const result = await this.vectorlessEngine.processQuestion(prompt, {});
      const response = result.success ? result.response : null;
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

      const result = await this.vectorlessEngine.processQuestion(prompt, {});
      const response = result.success ? result.response : null;
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

      const result = await this.vectorlessEngine.processQuestion(prompt, {});
      const response = result.success ? result.response : null;
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

      const result = await this.vectorlessEngine.processQuestion(prompt, {});
      const response = result.success ? result.response : null;
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

      const result = await this.vectorlessEngine.processQuestion(prompt, {});
      const response = result.success ? result.response : null;
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

      const result = await this.vectorlessEngine.processQuestion(prompt, {});
      const response = result.success ? result.response : null;
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

  /**
   * Load people from vault for selection in enhanced preview
   */
  async loadPeopleForSelection(memoryId) {
    try {
      const peopleGrid = document.getElementById(`people-grid-${memoryId}`);
      if (!peopleGrid) return;

      if (!window.emmaWebVault || !window.emmaWebVault.vaultData) {
        peopleGrid.innerHTML = '<div style="color: white; opacity: 0.8; grid-column: 1 / -1; text-align: center; padding: 20px;">Vault not available</div>';
        return;
      }

      const peopleData = window.emmaWebVault.vaultData.content?.people || {};
      const people = Object.values(peopleData);

      if (people.length === 0) {
        peopleGrid.innerHTML = `
          <div style="color: white; opacity: 0.8; grid-column: 1 / -1; text-align: center; padding: 20px;">
            No people in vault yet. <button onclick="window.open('/people.html', '_blank')" style="color: #8b5cf6; background: none; border: none; text-decoration: underline; cursor: pointer;">Add people first</button>
          </div>
        `;
        return;
      }

      // Create people cards
      const peopleCards = people.map(person => {
        const initials = person.name.charAt(0).toUpperCase();
        return `
          <div class="person-select-card" data-person-id="${person.id}" onclick="window.chatExperience.togglePersonSelection('${person.id}', '${memoryId}')">
            <div style="width: 60px; height: 60px; margin: 0 auto 12px; border-radius: 50%; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: 600;">
              ${initials}
            </div>
            <div style="color: white; font-weight: 600; margin-bottom: 4px;">${person.name}</div>
            <div style="color: rgba(255,255,255,0.7); font-size: 12px;">${person.relation || 'friend'}</div>
          </div>
        `;
      }).join('');

      peopleGrid.innerHTML = peopleCards;

    } catch (error) {
      console.error('❌ Error loading people for selection:', error);
    }
  }

  /**
   * Toggle person selection in enhanced preview
   */
  togglePersonSelection(personId, memoryId) {
    const card = document.querySelector(`.person-select-card[data-person-id="${personId}"]`);
    if (!card) return;

    card.classList.toggle('selected');
    
    // Store selection
    if (!this.enhancedMemoryData) this.enhancedMemoryData = {};
    if (!this.enhancedMemoryData[memoryId]) this.enhancedMemoryData[memoryId] = { selectedPeople: [], uploadedFiles: [] };
    
    const isSelected = card.classList.contains('selected');
    const selectedPeople = this.enhancedMemoryData[memoryId].selectedPeople;
    
    if (isSelected && !selectedPeople.includes(personId)) {
      selectedPeople.push(personId);
    } else if (!isSelected) {
      const index = selectedPeople.indexOf(personId);
      if (index > -1) selectedPeople.splice(index, 1);
    }
  }

  /**
   * Setup drag and drop for enhanced file upload
   */
  setupEnhancedDragDrop(memoryId) {
    const dropZone = document.getElementById(`drop-zone-${memoryId}`);
    if (!dropZone) return;

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      
      const files = Array.from(e.dataTransfer.files);
      this.handleEnhancedFileSelect({ target: { files } }, memoryId);
    });
  }

  /**
   * Handle file selection in enhanced preview
   */
  handleEnhancedFileSelect(event, memoryId) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Store files
    if (!this.enhancedMemoryData) this.enhancedMemoryData = {};
    if (!this.enhancedMemoryData[memoryId]) this.enhancedMemoryData[memoryId] = { selectedPeople: [], uploadedFiles: [] };
    
    files.forEach(file => {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        window.emmaError(`That file (${file.name}) is quite large. Let's try a smaller one for better performance.`, {
          title: "Large File Detected",
          helpText: "Smaller files work better for everyone."
        });
        return;
      }
      
      this.enhancedMemoryData[memoryId].uploadedFiles.push(file);
    });

    this.displayUploadedFiles(memoryId);
  }

  /**
   * Display uploaded files in enhanced preview
   */
  displayUploadedFiles(memoryId) {
    const mediaGrid = document.getElementById(`media-grid-${memoryId}`);
    if (!mediaGrid || !this.enhancedMemoryData[memoryId]) return;

    const files = this.enhancedMemoryData[memoryId].uploadedFiles;
    
    mediaGrid.innerHTML = files.map((file, index) => {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');
      
      return `
        <div class="media-preview-item">
          ${isVideo ? 
            `<video src="${url}" muted></video>` : 
            `<img src="${url}" alt="${file.name}">`
          }
          <button class="media-remove" onclick="window.chatExperience.removeUploadedFile(${index}, '${memoryId}')" title="Remove">×</button>
        </div>
      `;
    }).join('');
  }

  /**
   * Remove uploaded file from enhanced preview
   */
  removeUploadedFile(index, memoryId) {
    if (!this.enhancedMemoryData[memoryId]) return;
    
    this.enhancedMemoryData[memoryId].uploadedFiles.splice(index, 1);
    this.displayUploadedFiles(memoryId);
  }

  /**
   * Save enhanced memory with media and people
   */
  async saveEnhancedMemory(memoryId) {
    try {
      const contentTextarea = document.getElementById(`memory-content-${memoryId}`);
      const content = contentTextarea ? contentTextarea.value.trim() : '';
      
      if (!content) {
        window.emmaError('Please add a description for this memory.', {
          title: "Missing Description",
          helpText: "A few words about this memory will help preserve the moment."
        });
        return;
      }

      // FIXED: Check if this is an existing memory from vault or new enhanced memory
      let memory = null;
      let isExistingMemory = false;
      
      // Try to get existing memory from vault first
      if (window.emmaWebVault && window.emmaWebVault.vaultData && window.emmaWebVault.vaultData.content) {
        const existingMemory = window.emmaWebVault.vaultData.content.memories?.[memoryId];
        if (existingMemory) {
          console.log('📝 SAVING: Found existing memory, updating content');
          memory = { ...existingMemory };
          memory.content = content;
          memory.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
          isExistingMemory = true;
        }
      }
      
      // If not existing memory, create new one from enhanced data
      if (!memory) {
        console.log('📝 SAVING: Creating new enhanced memory');
        const memoryData = this.enhancedMemoryData?.[memoryId] || { selectedPeople: [], uploadedFiles: [] };
        
        memory = {
          id: memoryId,
          title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          content: content,
          timestamp: Date.now(),
          metadata: {
            people: memoryData.selectedPeople,
            emotions: [],
            locations: [],
          },
          attachments: []
        };

        // Process uploaded files (only for new enhanced memories)
        if (memoryData.uploadedFiles && memoryData.uploadedFiles.length > 0) {
          console.log('📎 SAVING: Processing uploaded files:', memoryData.uploadedFiles.length);
          for (const file of memoryData.uploadedFiles) {
            try {
              const mediaId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              const arrayBuffer = await file.arrayBuffer();
              
              // Store in vault
              if (window.emmaWebVault && arrayBuffer) {
                await window.emmaWebVault.addMedia(mediaId, arrayBuffer, file.type, file.name);
                memory.attachments.push({
                  id: mediaId,
                  type: file.type,
                  name: file.name,
                  size: file.size
                });
              }
            } catch (fileError) {
              console.error('❌ Error processing file:', file.name, fileError);
            }
          }
        }
      }

      // Save memory to vault
      if (window.emmaWebVault && memory) {
        console.log('💾 SAVING: Final memory save to vault');
        await window.emmaWebVault.addMemory(memory);
        
        // Show success and close dialog
        const dialog = document.querySelector('.memory-preview-dialog.enhanced');
        if (dialog) {
          dialog.style.opacity = '0';
          setTimeout(() => dialog.remove(), 300);
        }
        
        // Clean up enhanced memory data (only if it's not an existing memory)
        if (!isExistingMemory && this.enhancedMemoryData?.[memoryId]) {
          delete this.enhancedMemoryData[memoryId];
        }
        
        // Show success message
        await this.addMessage("Your photo memory has been saved! 📷✨", 'emma', null, 'response');
        
        this.showToast("Memory saved successfully! 💝", "success");
        
        // CRITICAL: Refresh constellation IMMEDIATELY after memory save
        setTimeout(() => {
          // Dispatch refresh event for constellation
          window.dispatchEvent(new CustomEvent('emmaMemoryAdded', {
            detail: { memoryId: memory.id, memoryData: memory }
          }));
        }, 500);
      } else {
        throw new Error('Unable to save memory - vault not available or memory invalid');
      }

    } catch (error) {
      console.error('❌ Error saving enhanced memory:', error);
      this.showToast("Error saving memory. Please try again.", "error");
    }
  }
}

// Export for use in other modules
window.EmmaChatExperience = EmmaChatExperience;
console.log('💬 Emma Chat Experience: Module loaded successfully');
