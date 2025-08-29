/**
 * 💜 EMMA CHAT CORE - Clean Orchestrator
 * Main chat interface that delegates to specialized modules
 * 
 * CTO ARCHITECTURE: Single responsibility - UI and coordination only
 */

class EmmaChatCore extends ExperiencePopup {
  constructor(position, settings = {}) {
    super(position, settings);
    
    // Core UI properties
    this.sessionId = this.generateSessionId();
    this.messages = [];
    this.isTyping = false;
    this.webglOrb = null;
    this.messageContainer = null;
    this.inputField = null;
    this.sendButton = null;
    
    // 🧠 MODULAR INTELLIGENCE SYSTEM
    this.intentClassifier = new EmmaIntentClassifier();
    this.memoryOperations = new EmmaMemoryOperations(this);
    this.personHandler = new EmmaPersonHandler(this);
    this.photoManager = new EmmaPhotoManager(this);
    this.dementiaCompanion = new EmmaDementiaCompanion(this);
    
    console.log('💜 Emma Chat Core: Initialized with modular architecture');
  }

  /**
   * 🎯 MAIN MESSAGE PROCESSING - Clean delegation
   */
  async sendMessage() {
    const message = this.inputField.value.trim();
    if (!message) return;

    // Add user message to UI
    this.addMessage(message, 'user');
    this.inputField.value = '';
    
    // Show typing indicator
    this.showTypingIndicator();
    
    // Process with clean delegation
    await this.processUserMessage(message);
  }

  /**
   * 🧠 CLEAN MESSAGE PROCESSING - BULLETPROOF!
   */
  async processUserMessage(userMessage) {
    try {
      console.log('💜 CORE: Processing message:', userMessage);
      
      // 🛡️ INPUT VALIDATION
      if (!userMessage || typeof userMessage !== 'string' || userMessage.trim() === '') {
        throw new Error('Invalid user message');
      }
      
      // 1. CLASSIFY INTENT (single source of truth with error boundary)
      let intent = null;
      try {
        intent = await this.intentClassifier.classifyIntent(userMessage);
        console.log('💜 CORE: Intent classified:', intent);
      } catch (intentError) {
        console.error('🛡️ CORE: Intent classification failed:', intentError);
        intent = { type: 'conversation', confidence: 0.5, originalMessage: userMessage };
      }
      
      // 2. DELEGATE TO APPROPRIATE MODULE (with error boundaries!)
      let response = null;
      
      // 🛡️ MODULE DELEGATION WITH ERROR BOUNDARIES
      try {
        switch (intent.type) {
          case 'memory_operation':
            response = await this.safeModuleCall(
              () => this.memoryOperations.handleMemoryRequest(userMessage, intent),
              'Memory Operations',
              "I'd love to help with your memories. Let me try again."
            );
            break;
            
          case 'person_operation':
            response = await this.safeModuleCall(
              () => this.personHandler.handlePersonRequest(userMessage, intent),
              'Person Handler',
              "I'd love to help you explore your people. Let me try again."
            );
            break;
            
          case 'photo_operation':
            response = await this.safeModuleCall(
              () => this.photoManager.handlePhotoRequest(userMessage, intent),
              'Photo Manager',
              "I'd love to help you add photos. Let me try again."
            );
            break;
            
          case 'memory_sharing':
            response = await this.safeModuleCall(
              () => this.dementiaCompanion.handleMemorySharing(userMessage, intent),
              'Memory Sharing',
              "That sounds like a beautiful memory. Tell me more about it."
            );
            break;
            
          case 'conversation':
            response = await this.safeModuleCall(
              () => this.dementiaCompanion.handleConversation(userMessage, intent),
              'Conversation',
              "I'm here to listen. What would you like to share?"
            );
            break;
            
          default:
            response = { 
              text: "I'm here to help with your memories. What would you like to explore?",
              timing: { delay: 1500, gentle: true }
            };
        }
      } catch (delegationError) {
        console.error('🛡️ CORE: Module delegation failed:', delegationError);
        response = { 
          text: "I'm here with you. Let me try to help in a different way.",
          timing: { delay: 2000, gentle: true }
        };
      }
      
      // 3. DISPLAY RESPONSE (single point with clinical timing)
      if (response) {
        // 🩺 CLINICAL TIMING: Respect dementia-appropriate delays
        const delay = response.timing?.delay || 1500;
        const isGentle = response.timing?.gentle || false;
        
        if (isGentle) {
          // Show typing indicator for appropriate time
          setTimeout(() => {
            this.hideTypingIndicator();
            
            if (response.text) {
              this.addMessage(response.text, 'emma');
            }
            
            // Execute actions after response is displayed
            if (response.actions) {
              setTimeout(() => {
                this.executeActions(response.actions);
              }, 500);
            }
          }, delay);
        } else {
          // Standard timing
          setTimeout(() => {
            this.hideTypingIndicator();
            
            if (response.text) {
              this.addMessage(response.text, 'emma');
            }
            
            if (response.actions) {
              this.executeActions(response.actions);
            }
          }, 1000);
        }
      }
      
    } catch (error) {
      console.error('💜 CORE: Error processing message:', error);
      this.hideTypingIndicator();
      this.addMessage("I'm here to help. Let me try again.", 'emma');
    }
  }

  /**
   * 🛡️ SAFE MODULE CALL - Bulletproof error handling
   */
  async safeModuleCall(moduleFunction, moduleName, fallbackMessage) {
    try {
      const result = await moduleFunction();
      
      // Validate response structure
      if (!result || typeof result !== 'object') {
        throw new Error(`${moduleName} returned invalid response structure`);
      }
      
      return result;
      
    } catch (moduleError) {
      console.error(`🛡️ CORE: ${moduleName} failed:`, moduleError);
      
      // Return clinical-safe fallback
      return {
        text: fallbackMessage,
        timing: { delay: 2000, gentle: true },
        error: true
      };
    }
  }

  /**
   * 🛡️ OFFLINE MODE DETECTION AND HANDLING
   */
  isOfflineMode() {
    return !navigator.onLine || !window.fetch;
  }

  /**
   * 🛡️ GRACEFUL API DEGRADATION
   */
  async safeAPICall(apiFunction, fallbackFunction, operationName) {
    try {
      if (this.isOfflineMode()) {
        console.log(`🛡️ CORE: Offline mode - using fallback for ${operationName}`);
        return await fallbackFunction();
      }
      
      const result = await Promise.race([
        apiFunction(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('API timeout')), 5000))
      ]);
      
      return result;
      
    } catch (apiError) {
      console.warn(`🛡️ CORE: API call failed for ${operationName}, using fallback:`, apiError);
      return await fallbackFunction();
    }
  }

  /**
   * 🎯 EXECUTE ACTIONS - Bulletproof action handling
   */
  async executeActions(actions) {
    if (!Array.isArray(actions)) {
      console.warn('🛡️ CORE: Invalid actions array:', actions);
      return;
    }
    
    for (const action of actions) {
      try {
        console.log('🎯 CORE: Executing action:', action.type);
        
        switch (action.type) {
          case 'display_person':
            if (action.person) {
              await this.safeModuleCall(
                () => this.personHandler.displayPersonCard(action.person),
                'Person Display',
                null // No fallback message for display actions
              );
            }
            break;
            
          case 'display_memories':
            if (action.memories && Array.isArray(action.memories)) {
              await this.safeModuleCall(
                () => this.memoryOperations.displayMemories(action.memories),
                'Memory Display',
                null
              );
            }
            break;
            
          case 'trigger_photo_upload':
            await this.safeModuleCall(
              () => this.photoManager.triggerUpload(action.targetPerson || 'your memories'),
              'Photo Upload',
              "I'd love to help you add photos. Please try again."
            );
            break;
            
          case 'create_memory':
            if (action.memoryData) {
              await this.safeModuleCall(
                () => this.memoryOperations.createMemory(action.memoryData),
                'Memory Creation',
                "I'd love to help you save that memory. Let me try again."
              );
            }
            break;
            
          default:
            console.warn('🛡️ CORE: Unknown action type:', action.type);
        }
        
        // Small delay between actions for smooth UX
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (actionError) {
        console.error('🛡️ CORE: Action execution failed:', actionError);
        // Continue with other actions - don't let one failure break everything
      }
    }
  }

  /**
   * 💜 UI MANAGEMENT - Keep it simple
   */
  addMessage(content, sender, options = {}) {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const messageDiv = document.createElement('div');
    messageDiv.className = `${sender}-message`;
    messageDiv.id = messageId;

    const messageTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (sender === 'emma') {
      const safeOptions = options || {};
      const messageContent = safeOptions.isHtml ? content : `<p>${content}</p>`;
      
      messageDiv.innerHTML = `
        <div class="emma-avatar">
          <div class="emma-orb-small"></div>
        </div>
        <div class="message-content">
          ${messageContent}
          <div class="message-time">${messageTime}</div>
        </div>
      `;
    } else {
      messageDiv.innerHTML = `
        <div class="message-content">
          <p>${content}</p>
          <div class="message-time">${messageTime}</div>
        </div>
      `;
    }

    this.messageContainer.appendChild(messageDiv);
    this.scrollToBottom();
    
    // Save to history
    this.messages.push({ content, sender, timestamp: Date.now() });
    this.saveChatHistory();

    return messageId;
  }

  showTypingIndicator() {
    if (this.typingIndicator) return;
    
    this.typingIndicator = document.createElement('div');
    this.typingIndicator.className = 'emma-typing';
    this.typingIndicator.innerHTML = `
      <div class="emma-avatar">
        <div class="emma-orb-small"></div>
      </div>
      <div class="typing-content">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    
    this.messageContainer.appendChild(this.typingIndicator);
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    if (this.typingIndicator) {
      this.typingIndicator.remove();
      this.typingIndicator = null;
    }
  }

  scrollToBottom() {
    if (this.messageContainer) {
      setTimeout(() => {
        this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
      }, 100);
    }
  }

  generateSessionId() {
    return `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  saveChatHistory() {
    try {
      sessionStorage.setItem(`emma-chat-${this.sessionId}`, JSON.stringify(this.messages));
    } catch (error) {
      console.warn('💜 Could not save chat history:', error);
    }
  }

  cleanup() {
    this.saveChatHistory();
    super.cleanup();
  }
}

// Export for global use
window.EmmaChatCore = EmmaChatCore;
console.log('💜 Emma Chat Core: Module loaded successfully');
