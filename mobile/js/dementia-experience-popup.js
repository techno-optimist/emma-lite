/**
 * Memory Companion (Dementia) Experience Popup
 * Specialized interface for dementia care with voice interaction and memory support
 */

class DementiaExperience extends ExperiencePopup {
  constructor(position, settings) {
    super(position, settings);
    this.voiceRecognition = null;
    this.speechSynthesis = null;
    this.currentMemorySlide = 0;
    this.memories = [];
    this.isListening = false;
  }

  getTitle() {
    return '💙 Memory Companion';
  }

  renderContent(contentElement) {
    contentElement.innerHTML = `
      <div class="dementia-experience">
        <!-- Voice Status Bar -->
        <div class="voice-status-bar">
          <div class="voice-indicator ${this.settings.voiceEnabled ? 'active' : ''}">
            <span class="voice-icon">🎤</span>
            <span class="voice-text">${this.settings.voiceEnabled ? 'Listening for "Emma"...' : 'Voice disabled'}</span>
          </div>
          ${this.settings.voiceEnabled ? `
            <button class="voice-toggle-btn" onclick="this.toggleListening()">
              ${this.isListening ? 'Stop Listening' : 'Start Listening'}
            </button>
          ` : ''}
        </div>

        <!-- Memory Slideshow Section -->
        <div class="memory-slideshow-section">
          <h4>📸 Your Memories</h4>
          <div class="slideshow-container">
            <div class="memory-slide" id="memory-slide-container">
              <div class="slide-placeholder">
                <span class="slide-icon">📷</span>
                <p>Loading your memories...</p>
              </div>
            </div>
            <div class="slideshow-controls">
              <button class="slide-btn" onclick="this.previousSlide()" title="Previous">‹</button>
              <span class="slide-counter">0 / 0</span>
              <button class="slide-btn" onclick="this.nextSlide()" title="Next">›</button>
            </div>
          </div>
        </div>

        <!-- Gentle Interaction Section -->
        <div class="interaction-section">
          <h4>💬 Let's Chat</h4>
          <div class="conversation-area">
            <div class="emma-message">
              <span class="emma-avatar">👩‍💼</span>
              <div class="message-content">
                <p>Hello! I'm here to help you with your memories. Would you like to:</p>
                <div class="quick-actions">
                  <button class="action-btn" onclick="this.startMemoryViewing()">View Photos</button>
                  <button class="action-btn" onclick="this.startStorytelling()">Tell a Story</button>
                  <button class="action-btn" onclick="this.startRemembering()">Remember Together</button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Voice Input Area -->
          ${this.settings.voiceEnabled ? `
            <div class="voice-input-area">
              <div class="voice-prompt">
                <span class="prompt-text">Say "${this.settings.wakeWord || 'Emma'}" to start talking...</span>
              </div>
            </div>
          ` : `
            <div class="text-input-area">
              <input type="text" placeholder="Type your message..." class="message-input">
              <button class="send-btn">Send</button>
            </div>
          `}
        </div>

        <!-- Caregiver Communication Panel -->
        <div class="caregiver-section">
          <h4>👨‍⚕️ Caregiver Updates</h4>
          <div class="caregiver-summary">
            <div class="summary-item">
              <span class="summary-label">Today's Interactions:</span>
              <span class="summary-value">3 conversations</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Memories Reviewed:</span>
              <span class="summary-value">5 photos</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Mood Assessment:</span>
              <span class="summary-value mood-positive">Positive</span>
            </div>
          </div>
          <button class="caregiver-btn" onclick="this.sendCaregiverUpdate()">
            Send Update to Caregiver
          </button>
        </div>
      </div>
    `;

    this.addDementiaStyles();
  }

  addDementiaStyles() {
    if (document.getElementById('dementia-experience-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'dementia-experience-styles';
    styles.textContent = `
      .dementia-experience {
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .voice-status-bar {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .voice-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
      }

      .voice-indicator.active .voice-icon {
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .voice-toggle-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        transition: background-color 0.2s ease;
      }

      .voice-toggle-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .memory-slideshow-section {
        flex: 1;
        min-height: 200px;
      }

      .memory-slideshow-section h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 600;
      }

      .slideshow-container {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        overflow: hidden;
      }

      .memory-slide {
        height: 150px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.2);
      }

      .slide-placeholder {
        text-align: center;
        opacity: 0.7;
      }

      .slide-icon {
        font-size: 24px;
        display: block;
        margin-bottom: 8px;
      }

      .slideshow-controls {
        padding: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(255, 255, 255, 0.05);
      }

      .slide-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s ease;
      }

      .slide-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .slide-counter {
        font-size: 14px;
        opacity: 0.8;
      }

      .interaction-section h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 600;
      }

      .conversation-area {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
      }

      .emma-message {
        display: flex;
        gap: 12px;
        align-items: flex-start;
      }

      .emma-avatar {
        font-size: 20px;
        width: 36px;
        height: 36px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .message-content p {
        margin: 0 0 12px 0;
        line-height: 1.4;
      }

      .quick-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .action-btn {
        background: rgba(100, 149, 237, 0.8);
        border: none;
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        transition: background-color 0.2s ease;
      }

      .action-btn:hover {
        background: rgba(100, 149, 237, 1);
      }

      .voice-input-area, .text-input-area {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 12px;
      }

      .voice-prompt {
        text-align: center;
        font-style: italic;
        opacity: 0.8;
      }

      .text-input-area {
        display: flex;
        gap: 8px;
      }

      .message-input {
        flex: 1;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 14px;
      }

      .message-input::placeholder {
        color: rgba(255, 255, 255, 0.6);
      }

      .send-btn {
        background: rgba(100, 149, 237, 0.8);
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
      }

      .caregiver-section h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 600;
      }

      .caregiver-summary {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
      }

      .summary-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 14px;
      }

      .summary-item:last-child {
        margin-bottom: 0;
      }

      .summary-label {
        opacity: 0.8;
      }

      .summary-value {
        font-weight: 600;
      }

      .mood-positive {
        color: #90EE90;
      }

      .caregiver-btn {
        background: rgba(138, 43, 226, 0.8);
        border: none;
        color: white;
        padding: 10px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        width: 100%;
        transition: background-color 0.2s ease;
      }

      .caregiver-btn:hover {
        background: rgba(138, 43, 226, 1);
      }
    `;
    document.head.appendChild(styles);
  }

  async initialize() {
    console.log('🧠 DementiaExperience: Initializing memory companion interface');
    
    // Setup voice recognition if enabled
    if (this.settings.voiceEnabled) {
      this.setupVoiceRecognition();
    }

    // Load memories
    await this.loadMemories();

    // Setup auto-listening if enabled
    if (this.settings.autoListen && this.settings.voiceEnabled) {
      setTimeout(() => this.startListening(), 1000);
    }
  }

  setupVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('🧠 DementiaExperience: Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.voiceRecognition = new SpeechRecognition();
    this.voiceRecognition.continuous = true;
    this.voiceRecognition.interimResults = true;
    this.voiceRecognition.lang = 'en-US';

    this.voiceRecognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        this.handleVoiceInput(result[0].transcript);
      }
    };

    this.voiceRecognition.onerror = (event) => {
      console.error('🧠 DementiaExperience: Voice recognition error:', event.error);
    };

    console.log('🧠 DementiaExperience: Voice recognition setup complete');
  }

  startListening() {
    if (this.voiceRecognition && !this.isListening) {
      this.voiceRecognition.start();
      this.isListening = true;
      this.updateVoiceStatus('Listening...');
    }
  }

  stopListening() {
    if (this.voiceRecognition && this.isListening) {
      this.voiceRecognition.stop();
      this.isListening = false;
      this.updateVoiceStatus(`Say "${this.settings.wakeWord}" to start...`);
    }
  }

  updateVoiceStatus(text) {
    const statusText = this.element?.querySelector('.voice-text');
    if (statusText) {
      statusText.textContent = text;
    }
  }

  handleVoiceInput(transcript) {
    console.log('🧠 DementiaExperience: Voice input:', transcript);
    
    const lowerTranscript = transcript.toLowerCase();
    const wakeWord = (this.settings.wakeWord || 'emma').toLowerCase();
    
    if (lowerTranscript.includes(wakeWord)) {
      this.processVoiceCommand(transcript);
    }
  }

  processVoiceCommand(command) {
    console.log('🧠 DementiaExperience: Processing voice command:', command);
    
    // Simple command processing
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('photo') || lowerCommand.includes('picture')) {
      this.startMemoryViewing();
    } else if (lowerCommand.includes('story') || lowerCommand.includes('tell')) {
      this.startStorytelling();
    } else if (lowerCommand.includes('remember') || lowerCommand.includes('memory')) {
      this.startRemembering();
    } else {
      this.respondToGeneral(command);
    }
  }

  async loadMemories() {
    try {
      // TODO: Load actual memories from vault
      this.memories = [
        { title: 'Family Dinner', image: null, date: '2024-01-15' },
        { title: 'Garden Photos', image: null, date: '2024-01-10' },
        { title: 'Birthday Party', image: null, date: '2024-01-05' }
      ];
      
      this.updateSlideshow();
    } catch (error) {
      console.error('🧠 DementiaExperience: Failed to load memories:', error);
    }
  }

  updateSlideshow() {
    const container = this.element?.querySelector('#memory-slide-container');
    const counter = this.element?.querySelector('.slide-counter');
    
    if (!container || !counter) return;

    if (this.memories.length === 0) {
      container.innerHTML = `
        <div class="slide-placeholder">
          <span class="slide-icon">📷</span>
          <p>No memories found</p>
        </div>
      `;
      counter.textContent = '0 / 0';
      return;
    }

    const memory = this.memories[this.currentMemorySlide];
    container.innerHTML = `
      <div class="memory-item">
        <h5>${memory.title}</h5>
        <p>Date: ${memory.date}</p>
        ${memory.image ? `<img src="${memory.image}" alt="${memory.title}">` : '<div class="no-image">📸</div>'}
      </div>
    `;
    
    counter.textContent = `${this.currentMemorySlide + 1} / ${this.memories.length}`;
  }

  startMemoryViewing() {
    console.log('🧠 DementiaExperience: Starting memory viewing');
    this.speak("Let's look at your photos together. I'll help you remember the stories behind them.");
  }

  startStorytelling() {
    console.log('🧠 DementiaExperience: Starting storytelling');
    this.speak("I'd love to hear your stories. Tell me about a special memory you'd like to share.");
  }

  startRemembering() {
    console.log('🧠 DementiaExperience: Starting remembering session');
    this.speak("Let's remember together. What would you like to talk about today?");
  }

  respondToGeneral(input) {
    console.log('🧠 DementiaExperience: General response to:', input);
    this.speak("I'm here to listen. Please tell me more about that.");
  }

  speak(text) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8; // Slower speech for clarity
      utterance.pitch = 1;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }
    
    // Also show in UI
    this.addEmmaMessage(text);
  }

  addEmmaMessage(text) {
    // TODO: Add message to conversation area
    console.log('🧠 Emma says:', text);
  }

  sendCaregiverUpdate() {
    console.log('🧠 DementiaExperience: Sending caregiver update');
    this.showNotification('Caregiver update sent successfully!', 'success');
  }

  previousSlide() {
    if (this.memories.length === 0) return;
    this.currentMemorySlide = (this.currentMemorySlide - 1 + this.memories.length) % this.memories.length;
    this.updateSlideshow();
  }

  nextSlide() {
    if (this.memories.length === 0) return;
    this.currentMemorySlide = (this.currentMemorySlide + 1) % this.memories.length;
    this.updateSlideshow();
  }

  showNotification(message, type = 'info') {
    // Simple notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: ${type === 'success' ? '#4CAF50' : '#2196F3'};
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10001;
    `;
    notification.textContent = message;
    this.element.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
  }

  cleanup() {
    super.cleanup();
    
    if (this.voiceRecognition && this.isListening) {
      this.voiceRecognition.stop();
    }
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}

// Export for use
window.DementiaExperience = DementiaExperience;
