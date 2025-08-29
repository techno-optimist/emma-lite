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
   * 🧠 CLEAN MESSAGE PROCESSING - No conflicts!
   */
  async processUserMessage(userMessage) {
    try {
      console.log('💜 CORE: Processing message:', userMessage);
      
      // 1. CLASSIFY INTENT (single source of truth)
      const intent = await this.intentClassifier.classifyIntent(userMessage);
      console.log('💜 CORE: Intent classified:', intent);
      
      // 2. DELEGATE TO APPROPRIATE MODULE (no conflicts!)
      let response = null;
      
      switch (intent.type) {
        case 'memory_operation':
          response = await this.memoryOperations.handleMemoryRequest(userMessage, intent);
          break;
          
        case 'person_operation':
          response = await this.personHandler.handlePersonRequest(userMessage, intent);
          break;
          
        case 'photo_operation':
          response = await this.photoManager.handlePhotoRequest(userMessage, intent);
          break;
          
        case 'memory_sharing':
          response = await this.dementiaCompanion.handleMemorySharing(userMessage, intent);
          break;
          
        case 'conversation':
          response = await this.dementiaCompanion.handleConversation(userMessage, intent);
          break;
          
        default:
          response = { text: "I'm here to help with your memories. What would you like to explore?" };
      }
      
      // 3. DISPLAY RESPONSE (single point)
      if (response) {
        this.hideTypingIndicator();
        
        if (response.text) {
          this.addMessage(response.text, 'emma');
        }
        
        // Execute any actions
        if (response.actions) {
          await this.executeActions(response.actions);
        }
      }
      
    } catch (error) {
      console.error('💜 CORE: Error processing message:', error);
      this.hideTypingIndicator();
      this.addMessage("I'm here to help. Let me try again.", 'emma');
    }
  }

  /**
   * 🎯 EXECUTE ACTIONS - Clean action handling
   */
  async executeActions(actions) {
    for (const action of actions) {
      switch (action.type) {
        case 'display_person':
          await this.personHandler.displayPersonCard(action.person);
          break;
        case 'display_memories':
          await this.memoryOperations.displayMemories(action.memories);
          break;
        case 'trigger_photo_upload':
          await this.photoManager.triggerUpload(action.targetPerson);
          break;
        case 'create_memory':
          await this.memoryOperations.createMemory(action.memoryData);
          break;
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
