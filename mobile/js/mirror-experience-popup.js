/**
 * Mirror Emma Experience Popup
 * Reflective companion that adapts and mirrors communication style
 */

class MirrorExperience extends ExperiencePopup {
  constructor(position, settings) {
    super(position, settings);
    this.communicationPatterns = [];
    this.adaptationLevel = 0.5; // 0-1 scale
  }

  getTitle() {
    return '🪞 Mirror Emma';
  }

  renderContent(contentElement) {
    contentElement.innerHTML = `
      <div class="mirror-experience">
        <!-- Adaptation Status -->
        <div class="adaptation-status">
          <h4>🔄 Adaptation Level</h4>
          <div class="adaptation-meter">
            <div class="adaptation-fill" style="width: ${this.adaptationLevel * 100}%"></div>
          </div>
          <span class="adaptation-text">${Math.round(this.adaptationLevel * 100)}% Synchronized</span>
        </div>

        <!-- Communication Analysis -->
        <div class="communication-analysis">
          <h4>📊 Your Communication Style</h4>
          <div class="analysis-grid">
            <div class="analysis-item">
              <span class="analysis-label">Tone:</span>
              <span class="analysis-value" id="tone-analysis">Analyzing...</span>
            </div>
            <div class="analysis-item">
              <span class="analysis-label">Pace:</span>
              <span class="analysis-value" id="pace-analysis">Analyzing...</span>
            </div>
            <div class="analysis-item">
              <span class="analysis-label">Complexity:</span>
              <span class="analysis-value" id="complexity-analysis">Analyzing...</span>
            </div>
            <div class="analysis-item">
              <span class="analysis-label">Preferred Topics:</span>
              <span class="analysis-value" id="topics-analysis">Analyzing...</span>
            </div>
          </div>
        </div>

        <!-- Mirror Chat Interface -->
        <div class="mirror-chat">
          <h4>💬 Reflective Conversation</h4>
          <div class="chat-messages" id="mirror-chat-messages">
            <div class="mirror-message">
              <div class="message-avatar">🪞</div>
              <div class="message-content">
                <p>I'm adapting to your communication style... Let's start a conversation so I can mirror your preferences!</p>
              </div>
            </div>
          </div>
          
          <div class="chat-input-area">
            <input type="text" id="mirror-chat-input" placeholder="Share your thoughts..." class="mirror-input">
            <button class="mirror-send-btn" onclick="this.sendMirrorMessage()">Reflect</button>
          </div>
        </div>

        <!-- Adaptation Controls -->
        <div class="adaptation-controls">
          <h4>⚙️ Mirror Settings</h4>
          <div class="control-group">
            <label class="control-label">
              <span>Mirror Intensity:</span>
              <input type="range" id="mirror-intensity" min="0" max="100" value="${this.adaptationLevel * 100}" 
                     onchange="this.updateAdaptation(this.value)">
            </label>
          </div>
          
          <div class="control-group">
            <label class="control-label">
              <input type="checkbox" id="auto-adapt" checked>
              <span>Auto-adapt to my style</span>
            </label>
          </div>
          
          <div class="control-group">
            <label class="control-label">
              <input type="checkbox" id="practice-mode">
              <span>Practice mode (conversation training)</span>
            </label>
          </div>
        </div>

        <!-- Insights Panel -->
        <div class="insights-panel">
          <h4>💡 Insights & Suggestions</h4>
          <div class="insight-item">
            <span class="insight-icon">🎯</span>
            <span class="insight-text">Your communication is most effective in the afternoons</span>
          </div>
          <div class="insight-item">
            <span class="insight-icon">📈</span>
            <span class="insight-text">Try varying your sentence length for better engagement</span>
          </div>
          <div class="insight-item">
            <span class="insight-icon">🔍</span>
            <span class="insight-text">You prefer concrete examples over abstract concepts</span>
          </div>
        </div>
      </div>
    `;

    this.addMirrorStyles();
  }

  addMirrorStyles() {
    if (document.getElementById('mirror-experience-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'mirror-experience-styles';
    styles.textContent = `
      .mirror-experience {
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 16px;
        font-size: 14px;
      }

      .adaptation-status h4 {
        margin: 0 0 8px 0;
        font-size: 16px;
        font-weight: 600;
      }

      .adaptation-meter {
        width: 100%;
        height: 8px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 8px;
      }

      .adaptation-fill {
        height: 100%;
        background: linear-gradient(90deg, #C0C0C0, #E5E5E5);
        transition: width 0.3s ease;
      }

      .adaptation-text {
        font-size: 12px;
        opacity: 0.8;
      }

      .communication-analysis h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 600;
      }

      .analysis-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 12px;
      }

      .analysis-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .analysis-label {
        font-size: 12px;
        opacity: 0.7;
      }

      .analysis-value {
        font-weight: 600;
        font-size: 13px;
      }

      .mirror-chat {
        flex: 1;
        min-height: 0;
      }

      .mirror-chat h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 600;
      }

      .chat-messages {
        max-height: 150px;
        overflow-y: auto;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 12px;
      }

      .mirror-message {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }

      .mirror-message:last-child {
        margin-bottom: 0;
      }

      .message-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: rgba(192, 192, 192, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        flex-shrink: 0;
      }

      .message-content {
        flex: 1;
      }

      .message-content p {
        margin: 0;
        line-height: 1.4;
        font-size: 13px;
      }

      .chat-input-area {
        display: flex;
        gap: 8px;
      }

      .mirror-input {
        flex: 1;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
      }

      .mirror-input::placeholder {
        color: rgba(255, 255, 255, 0.6);
      }

      .mirror-send-btn {
        background: rgba(192, 192, 192, 0.8);
        border: none;
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        transition: background-color 0.2s ease;
      }

      .mirror-send-btn:hover {
        background: rgba(192, 192, 192, 1);
      }

      .adaptation-controls h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 600;
      }

      .control-group {
        margin-bottom: 12px;
      }

      .control-group:last-child {
        margin-bottom: 0;
      }

      .control-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        cursor: pointer;
      }

      .control-label input[type="range"] {
        flex: 1;
      }

      .control-label input[type="checkbox"] {
        margin: 0;
      }

      .insights-panel h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 600;
      }

      .insight-item {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        padding: 8px;
        margin-bottom: 8px;
        font-size: 12px;
      }

      .insight-item:last-child {
        margin-bottom: 0;
      }

      .insight-icon {
        font-size: 14px;
        flex-shrink: 0;
      }

      .insight-text {
        line-height: 1.3;
      }
    `;
    document.head.appendChild(styles);
  }

  async initialize() {
    console.log('🪞 MirrorExperience: Initializing mirror interface');
    
    // Setup chat input
    const chatInput = this.element.querySelector('#mirror-chat-input');
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendMirrorMessage();
        }
      });
    }

    // Simulate analysis
    setTimeout(() => this.runCommunicationAnalysis(), 1000);
  }

  runCommunicationAnalysis() {
    // Simulate analysis results
    const analyses = {
      tone: ['Warm', 'Professional', 'Casual', 'Enthusiastic'][Math.floor(Math.random() * 4)],
      pace: ['Measured', 'Quick', 'Relaxed', 'Variable'][Math.floor(Math.random() * 4)],
      complexity: ['Simple', 'Moderate', 'Complex', 'Mixed'][Math.floor(Math.random() * 4)],
      topics: ['Technology', 'Personal Growth', 'Memories', 'Planning'][Math.floor(Math.random() * 4)]
    };

    const toneEl = this.element.querySelector('#tone-analysis');
    const paceEl = this.element.querySelector('#pace-analysis');
    const complexityEl = this.element.querySelector('#complexity-analysis');
    const topicsEl = this.element.querySelector('#topics-analysis');

    if (toneEl) toneEl.textContent = analyses.tone;
    if (paceEl) paceEl.textContent = analyses.pace;
    if (complexityEl) complexityEl.textContent = analyses.complexity;
    if (topicsEl) topicsEl.textContent = analyses.topics;
  }

  sendMirrorMessage() {
    const input = this.element.querySelector('#mirror-chat-input');
    if (!input || !input.value.trim()) return;

    const message = input.value.trim();
    this.addMirrorMessage(message, 'user');
    
    // Analyze and mirror the message
    setTimeout(() => {
      this.mirrorResponse(message);
    }, 800);

    input.value = '';
  }

  addMirrorMessage(message, sender = 'mirror') {
    const messagesContainer = this.element.querySelector('#mirror-chat-messages');
    if (!messagesContainer) return;

    const messageEl = document.createElement('div');
    messageEl.className = 'mirror-message';
    
    const avatar = sender === 'user' ? '👤' : '🪞';
    
    messageEl.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div class="message-content">
        <p>${message}</p>
      </div>
    `;
    
    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  mirrorResponse(userMessage) {
    // Analyze user's communication style
    const analysis = this.analyzeCommunicationStyle(userMessage);
    
    // Generate mirrored response
    let response = this.generateMirroredResponse(userMessage, analysis);
    
    this.addMirrorMessage(response, 'mirror');
    
    // Update adaptation level
    this.adaptationLevel = Math.min(1, this.adaptationLevel + 0.1);
    this.updateAdaptationMeter();
  }

  analyzeCommunicationStyle(message) {
    const analysis = {
      length: message.length,
      complexity: (message.match(/[,;:.!?]/g) || []).length / message.length,
      enthusiasm: (message.match(/[!]/g) || []).length,
      questions: (message.match(/[?]/g) || []).length,
      tone: message.toLowerCase().includes('please') || message.toLowerCase().includes('thank') ? 'polite' : 'casual'
    };
    
    return analysis;
  }

  generateMirroredResponse(message, analysis) {
    let response = "I understand your perspective";
    
    // Mirror enthusiasm
    if (analysis.enthusiasm > 0) {
      response += "! That's really interesting";
      if (analysis.enthusiasm > 1) response += "!!";
    } else {
      response += ". That's an interesting point";
    }
    
    // Mirror question style
    if (analysis.questions > 0) {
      response += ". What aspects of this matter most to you?";
    } else {
      response += ". I can see why you'd think about it that way.";
    }
    
    // Mirror politeness
    if (analysis.tone === 'polite') {
      response = "Thank you for sharing that. " + response;
    }
    
    return response;
  }

  updateAdaptation(value) {
    this.adaptationLevel = value / 100;
    this.updateAdaptationMeter();
  }

  updateAdaptationMeter() {
    const fill = this.element.querySelector('.adaptation-fill');
    const text = this.element.querySelector('.adaptation-text');
    
    if (fill) {
      fill.style.width = `${this.adaptationLevel * 100}%`;
    }
    
    if (text) {
      text.textContent = `${Math.round(this.adaptationLevel * 100)}% Synchronized`;
    }
  }
}

// Export for use
window.MirrorExperience = MirrorExperience;
