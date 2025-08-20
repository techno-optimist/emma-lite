/**
 * 🧠 Emma Unified Memory Wizard - Clean Working Version
 * 
 * CTO Emergency Fix: Simplified, working wizard without intelligence layer complexity
 * Emma Branding: Pixel-perfect implementation
 */

class UnifiedMemoryWizard extends ExperiencePopup {
  constructor(position, settings = {}) {
    super(position, settings);
    
    // Core state management
    this.currentStep = 1;
    this.totalSteps = 7;
    this.responses = [];
    this.mediaItems = [];
    this.isRecording = false;
    this.recognition = null;
    this.currentTranscript = '';
    this.inputMethod = null;
    
    // People selection state
    this.availablePeople = [];
    this.selectedPeople = [];
    
    // Initialize speech recognition if available
    this.initializeSpeechRecognition();
    
    console.log('🧠 UnifiedMemoryWizard: Clean version initialized');
  }

  getTitle() {
    return ''; // Clean header - Emma branding handles title
  }

  /**
   * Get dynamic title based on current step
   */
  getDynamicTitle() {
    switch (this.currentStep) {
      case 1:
        return 'Create Memory Capsule';
      case 2:
        return 'What memory would you like to capture?';
      case 3:
        return 'Who was involved in this memory?';
      case 4:
        return 'Where did this take place?';
      case 5:
        return 'What made this moment special?';
      case 6:
        return 'Add Photos or Videos';
      case 7:
        return 'Review Your Memory';
      default:
        return 'Review Your Memory';
    }
  }

  /**
   * Get dynamic subtitle based on current step
   */
  getDynamicSubtitle() {
    switch (this.currentStep) {
      case 1:
        return 'Emma will guide you through capturing your precious memory';
      case 2:
        return 'Tell me about a special moment you\'d like to remember';
      case 3:
        return 'Share the people who made this moment special';
      case 4:
        return 'Describe the location or setting of this memory';
      case 5:
        return 'Tell me about the emotions and feelings from this time';
      case 6:
        return 'Upload media to make your memory come alive';
      case 7:
        return 'Everything looks good? Let\'s save this precious memory!';
      default:
        return 'Everything looks good? Let\'s save this precious memory!';
    }
  }

  /**
   * Initialize Web Speech API with error handling
   */
  initializeSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      this.speechAvailable = false;
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;
      
      this.speechAvailable = true;
      console.log('🎤 Speech recognition initialized successfully');
      
    } catch (error) {
      console.error('🎤 Speech recognition initialization failed:', error);
      this.speechAvailable = false;
    }
  }

  /**
   * Render the wizard interface - streamlined layout
   */
  renderContent(contentElement) {
    // Set global reference first
    window.unifiedWizardInstance = this;
    
    // Make the wizard take full popup space
    contentElement.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      padding: 0;
      margin: 0;
      overflow: hidden;
    `;
    
    contentElement.innerHTML = `
      <style>
        /* Voice Input Interface */
        .voice-input-section {
          margin-bottom: 24px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .voice-controls {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }

        .voice-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 14px;
          font-weight: 500;
        }

        .voice-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }

        .voice-btn.recording {
          background: rgba(239, 68, 68, 0.3);
          border-color: rgba(239, 68, 68, 0.5);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .voice-status {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          font-style: italic;
        }

        .audio-visualizer {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 40px;
          margin-bottom: 16px;
          opacity: 0.3;
          transition: opacity 0.3s ease;
        }

        .audio-visualizer.active {
          opacity: 1;
        }

        .visualizer-bars {
          display: flex;
          align-items: end;
          gap: 3px;
          height: 30px;
        }

        .visualizer-bars .bar {
          width: 4px;
          background: linear-gradient(to top, #8B5CF6, #A78BFA);
          border-radius: 2px;
          height: 8px;
          transition: height 0.2s ease;
        }

        .audio-visualizer.active .bar {
          animation: wave 1.5s ease-in-out infinite;
        }

        @keyframes wave {
          0%, 100% { height: 8px; }
          50% { height: 25px; }
        }

        .transcription-display {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .transcription-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .transcription-text {
          color: white;
          font-size: 14px;
          line-height: 1.5;
          min-height: 20px;
          font-style: italic;
        }

        /* People Selection Interface */
        .people-selection-section {
          margin-bottom: 24px;
        }

        .people-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .person-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.08);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
        }

        .person-card:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }

        .person-card.selected {
          background: rgba(139, 92, 246, 0.3);
          border-color: rgba(139, 92, 246, 0.5);
        }

        .person-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8B5CF6, #A78BFA);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 16px;
        }

        .person-info {
          flex: 1;
        }

        .person-name {
          color: white;
          font-weight: 500;
          font-size: 14px;
          margin-bottom: 2px;
        }

        .person-relation {
          color: rgba(255, 255, 255, 0.6);
          font-size: 12px;
          text-transform: capitalize;
        }

        .person-check {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: all 0.3s ease;
        }

        .person-card.selected .person-check {
          opacity: 1;
          background: rgba(34, 197, 94, 0.8);
        }

        .add-person-btn, .add-first-person-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 2px dashed rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 14px;
          width: 100%;
        }

        .add-person-btn:hover, .add-first-person-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.4);
        }

        .no-people-section {
          text-align: center;
          padding: 40px 20px;
        }

        .no-people-message {
          color: rgba(255, 255, 255, 0.7);
        }

        .no-people-message svg {
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .no-people-message p {
          margin-bottom: 20px;
          font-size: 16px;
        }

        .selected-people-summary {
          margin-top: 16px;
          padding: 12px;
          background: rgba(139, 92, 246, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(139, 92, 246, 0.2);
        }

        .summary-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .selected-people-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .selected-person-tag {
          background: rgba(139, 92, 246, 0.3);
          border: 1px solid rgba(139, 92, 246, 0.4);
          border-radius: 16px;
          padding: 4px 12px;
          color: white;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .manual-input-toggle {
          margin-top: 16px;
          text-align: center;
        }

        .toggle-manual-btn {
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.7);
          padding: 8px 16px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.3s ease;
        }

        .toggle-manual-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        .manual-input-area {
          margin-top: 16px;
        }
      </style>
      
      <!-- Emma Header -->
      <div class="wizard-header">
        <div class="emma-orb-container" id="wizard-emma-orb">
          <!-- Emma orb will be initialized here -->
        </div>
        <div class="wizard-title-section">
          <h1 class="wizard-title" id="dynamic-title">${this.getDynamicTitle()}</h1>
          <p class="wizard-subtitle" id="dynamic-subtitle">${this.getDynamicSubtitle()}</p>
        </div>
        <button class="wizard-close-btn" onclick="window.unifiedWizardInstance?.close()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Progress Indicator -->
      <div class="wizard-progress">
        <div class="progress-track">
          <div class="progress-fill" id="wizard-progress-fill"></div>
        </div>
        <div class="progress-label">
          <span id="progress-text">Step ${this.currentStep} of ${this.totalSteps}</span>
        </div>
      </div>

      <!-- Dynamic Content Area -->
      <div class="wizard-content" id="wizard-content">
        ${this.renderCurrentStep()}
      </div>


    `;

    console.log('🎨 UnifiedMemoryWizard: Clean layout rendered');
    return contentElement;
  }

  /**
   * Render current step content
   */
  renderCurrentStep() {
    switch (this.currentStep) {
      case 1:
        return this.renderWelcomeStep();
      case 2:
      case 3:
      case 4:
      case 5:
        return this.renderQuestionStep();
      case 6:
        return this.renderMediaStep();
      case 7:
        return this.renderReviewStep();
      default:
        return this.renderReviewStep();
    }
  }

  /**
   * Render welcome step - clean and direct
   */
  renderWelcomeStep() {
    return `
      <div class="wizard-step welcome-step">
        <div class="input-method-selection">
          <h3 class="selection-title">How would you like to share your memory?</h3>
          
          <div class="method-options">
            ${this.speechAvailable ? `
              <div class="method-option recommended" onclick="event.stopPropagation(); window.unifiedWizardInstance?.selectInputMethod('voice')">
                <div class="method-icon">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" x2="12" y1="19" y2="22"/>
                    <line x1="8" x2="16" y1="22" y2="22"/>
                  </svg>
                </div>
                <div class="method-content">
                  <h4>Voice + Text</h4>
                  <p>Speak naturally - I'll listen and you can edit as needed</p>
                  <span class="recommended-badge">Recommended</span>
                </div>
              </div>
            ` : ''}
            
            <div class="method-option" onclick="event.stopPropagation(); window.unifiedWizardInstance?.selectInputMethod('text')">
              <div class="method-icon">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
              </div>
              <div class="method-content">
                <h4>Text Only</h4>
                <p>Type your responses at your own pace</p>
              </div>
            </div>
          </div>
        </div>

        <div class="welcome-footer">
          <p class="privacy-note">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
            </svg>
            Your memories are encrypted and private
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Render question step
   */
  renderQuestionStep() {
    const questions = [
      "What memory would you like to capture?",
      "Who was involved in this memory?", 
      "Where did this take place?",
      "What made this moment special?"
    ];
    
    const questionIndex = this.currentStep - 2;
    const question = questions[questionIndex] || "Tell me more about this memory";
    
    // Special handling for people selection (step 3, questionIndex 1)
    if (questionIndex === 1) {
      return this.renderPeopleSelectionStep();
    }
    
    return `
      <div class="wizard-step question-step">
        <div class="input-area">
          <div class="emma-input-container">
            <div class="input-label">${this.getInputLabel(questionIndex)}</div>
            
            ${this.inputMethod === 'voice' ? `
              <!-- Voice Input Interface -->
              <div class="voice-input-section">
                <div class="voice-controls">
                  <button class="voice-btn ${this.isRecording ? 'recording' : ''}" 
                          onclick="window.unifiedWizardInstance?.toggleRecording()"
                          id="voice-btn-${questionIndex}">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" x2="12" y1="19" y2="22"/>
                      <line x1="8" x2="16" y1="22" y2="22"/>
                    </svg>
                    <span>${this.isRecording ? 'Stop Recording' : 'Start Recording'}</span>
                  </button>
                  <div class="voice-status" id="voice-status-${questionIndex}">
                    ${this.isRecording ? '🎤 Listening...' : '🎤 Tap to speak'}
                  </div>
                </div>
                
                <!-- Audio Visualizer -->
                <div class="audio-visualizer ${this.isRecording ? 'active' : ''}" id="audio-visualizer-${questionIndex}">
                  <div class="visualizer-bars">
                    ${Array.from({length: 8}, (_, i) => `<div class="bar" style="animation-delay: ${i * 0.1}s"></div>`).join('')}
                  </div>
                </div>
                
                <!-- Transcription Display -->
                <div class="transcription-display" id="transcription-${questionIndex}">
                  <div class="transcription-label">What you said:</div>
                  <div class="transcription-text">${this.currentTranscript || 'Your words will appear here as you speak...'}</div>
                </div>
              </div>
            ` : ''}
            
            <textarea 
              class="emma-memory-textarea" 
              placeholder="${this.getInputPlaceholder(questionIndex)}"
              id="memory-input-${questionIndex}"
              oninput="window.unifiedWizardInstance?.updateInput(this.value)">${this.currentTranscript || ''}</textarea>
            <div class="input-footer">
              <div class="character-count" id="char-count-${questionIndex}">0 characters</div>
              <div class="input-hints">
                <span class="hint-item">${this.getInputHint(questionIndex)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="question-actions">
          <button class="wizard-btn wizard-btn-secondary" onclick="event.stopPropagation(); window.unifiedWizardInstance?.goBack()">
            Back
          </button>
          <button class="wizard-btn wizard-btn-primary" id="question-next-btn" 
                  onclick="event.stopPropagation(); window.unifiedWizardInstance?.goNext()" 
                  ${!this.currentTranscript ? 'disabled' : ''}>
            ${questionIndex < 3 ? 'Next Question' : 'Add Media'}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render media step with premium Emma design
   */
  renderMediaStep() {
    return `
      <div class="wizard-step media-step">
        <div class="media-upload-container">
          <!-- Emma Premium Drag & Drop Zone -->
          <div class="emma-drop-zone" 
               id="emma-drop-zone"
               onclick="document.getElementById('media-upload').click()"
               ondragover="event.preventDefault(); this.classList.add('drag-over')"
               ondragleave="this.classList.remove('drag-over')"
               ondrop="window.unifiedWizardInstance?.handleFileDrop(event)">
            
            <div class="drop-zone-content">
              <div class="upload-icon">
                <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
              
              <div class="upload-text">
                <h3>Drop your photos & videos here</h3>
                <p>or <span class="upload-link">click to browse</span> your files</p>
              </div>
              
              <div class="upload-specs">
                <span class="spec-item">📷 Photos: JPG, PNG, HEIC</span>
                <span class="spec-item">🎥 Videos: MP4, MOV, AVI</span>
                <span class="spec-item">📁 Max 50MB per file</span>
              </div>
            </div>
            
            <input type="file" id="media-upload" multiple accept="image/*,video/*" style="display: none;"
                   onchange="window.unifiedWizardInstance?.handleFileSelect(event)">
          </div>
          
          <!-- Media Preview Grid -->
          <div class="media-preview-grid" id="media-preview-grid" style="display: none;">
            <div class="preview-header">
              <h3>Your Media</h3>
              <button class="add-more-btn" onclick="document.getElementById('media-upload').click()">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add More
              </button>
            </div>
            <div class="preview-items" id="preview-items">
              <!-- Media previews will be inserted here -->
            </div>
          </div>
        </div>
        
        <div class="media-actions">
          <button class="wizard-btn wizard-btn-secondary" onclick="event.stopPropagation(); window.unifiedWizardInstance?.goBack()">
            Back
          </button>
          <button class="wizard-btn wizard-btn-primary" onclick="event.stopPropagation(); console.log('🎯 Review & Save clicked!'); window.unifiedWizardInstance?.goNext()">
            Review & Save
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render review step with beautiful memory capsule summary
   */
  renderReviewStep() {
    const memoryTitle = this.generateMemoryTitle();
    const memoryStory = this.generateMemoryStory();
    
    return `
      <div class="wizard-step review-step">
        <div class="memory-capsule-preview">
          <div class="capsule-header">
            <div class="capsule-icon">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
                <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
              </svg>
            </div>
            <div class="capsule-title-section">
              <h2 class="capsule-title">${memoryTitle}</h2>
              <p class="capsule-date">${new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>
          </div>

          <div class="capsule-content">
            <div class="memory-story">
              <h3>Your Memory Story</h3>
              <div class="story-text">${memoryStory}</div>
            </div>

            ${this.mediaItems.length > 0 ? `
              <div class="memory-media">
                <h3>Attached Media (${this.mediaItems.length})</h3>
                <div class="media-summary-grid">
                  ${this.mediaItems.map(item => `
                    <div class="media-summary-item">
                      <div class="media-thumbnail">
                        ${item.preview.type === 'image' ? `
                          <img src="${item.preview.thumbnail}" alt="${item.name}">
                        ` : `
                          <div class="video-thumbnail">
                            <img src="${item.preview.thumbnail}" alt="${item.name}">
                            <div class="video-play-icon">
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
                                <polygon points="5,3 19,12 5,21"/>
                              </svg>
                            </div>
                          </div>
                        `}
                      </div>
                      <div class="media-info">
                        <div class="media-name">${this.truncateFileName(item.name)}</div>
                        <div class="media-size">${this.formatFileSize(item.size)}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
        
        <div class="review-actions">
          <button class="wizard-btn wizard-btn-secondary" onclick="event.stopPropagation(); window.unifiedWizardInstance?.goBack()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15,18 9,12 15,6"></polyline>
            </svg>
            Edit Memory
          </button>
          <button class="wizard-btn wizard-btn-primary wizard-btn-save" onclick="event.stopPropagation(); window.unifiedWizardInstance?.saveMemoryToVault()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
            </svg>
            Save to Vault
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Initialize the wizard after rendering
   */
  async initialize() {
    console.log('🧠 UnifiedMemoryWizard: Initializing clean version...');
    
    // Hide the base popup header since we're creating our own wizard header
    const baseHeader = this.element.querySelector('.popup-header');
    if (baseHeader) {
      baseHeader.style.display = 'none';
      console.log('🧠 UnifiedMemoryWizard: Hidden duplicate popup header');
    }
    
    // Load people data for selection
    await this.loadPeopleData();
    
    this.initializeEmmaOrb();
    this.updateDynamicHeader();
    this.updateProgress();
    this.optimizePopupHeight();
    this.setupDynamicResizing();
    
    console.log('🧠 UnifiedMemoryWizard: Clean initialization complete');
  }

  /**
   * Render people selection step
   */
  renderPeopleSelectionStep() {
    const questionIndex = this.currentStep - 2;
    
    return `
      <div class="wizard-step people-step">
        <div class="input-area">
          <div class="emma-input-container">
            <div class="input-label">👥 The People Involved</div>
            
            ${this.availablePeople && this.availablePeople.length > 0 ? `
              <!-- People Selection Grid -->
              <div class="people-selection-section">
                <div class="people-grid">
                  ${this.availablePeople.map(person => `
                    <div class="person-card ${this.selectedPeople.includes(person.id) ? 'selected' : ''}" 
                         onclick="window.unifiedWizardInstance?.togglePersonSelection('${person.id}')">
                      <div class="person-avatar">
                        ${person.name.charAt(0).toUpperCase()}
                      </div>
                      <div class="person-info">
                        <div class="person-name">${person.name}</div>
                        <div class="person-relation">${person.relation || 'friend'}</div>
                      </div>
                      <div class="person-check">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="20,6 9,17 4,12"/>
                        </svg>
                      </div>
                    </div>
                  `).join('')}
                </div>
                
                <div class="add-new-person">
                  <button class="add-person-btn" onclick="window.unifiedWizardInstance?.showAddPersonForm()">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <line x1="19" x2="19" y1="8" y2="14"/>
                      <line x1="22" x2="16" y1="11" y2="11"/>
                    </svg>
                    Add New Person
                  </button>
                </div>
              </div>
            ` : `
              <!-- No People Found - Show Add Form -->
              <div class="no-people-section">
                <div class="no-people-message">
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <line x1="19" x2="19" y1="8" y2="14"/>
                    <line x1="22" x2="16" y1="11" y2="11"/>
                  </svg>
                  <p>No people found in your vault yet</p>
                  <button class="add-first-person-btn" onclick="window.unifiedWizardInstance?.showAddPersonForm()">
                    Add Your First Person
                  </button>
                </div>
              </div>
            `}
            
            <!-- Selected People Summary -->
            <div class="selected-people-summary" id="selected-people-summary" style="display: ${this.selectedPeople.length > 0 ? 'block' : 'none'}">
              <div class="summary-label">Selected people:</div>
              <div class="selected-people-list" id="selected-people-list">
                <!-- Will be populated by JavaScript -->
              </div>
            </div>
            
            <!-- Manual Text Input (fallback) -->
            <div class="manual-input-section">
              <div class="manual-input-toggle">
                <button class="toggle-manual-btn" onclick="window.unifiedWizardInstance?.toggleManualInput()">
                  ✏️ Or describe manually
                </button>
              </div>
              <div class="manual-input-area" id="manual-input-area" style="display: none;">
                <textarea 
                  class="emma-memory-textarea" 
                  placeholder="${this.getInputPlaceholder(questionIndex)}"
                  id="memory-input-${questionIndex}"
                  oninput="window.unifiedWizardInstance?.updateInput(this.value)">${this.currentTranscript || ''}</textarea>
                <div class="input-footer">
                  <div class="character-count" id="char-count-${questionIndex}">0 characters</div>
                  <div class="input-hints">
                    <span class="hint-item">${this.getInputHint(questionIndex)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="question-actions">
          <button class="wizard-btn wizard-btn-secondary" onclick="event.stopPropagation(); window.unifiedWizardInstance?.goBack()">
            Back
          </button>
          <button class="wizard-btn wizard-btn-primary" id="question-next-btn" 
                  onclick="event.stopPropagation(); window.unifiedWizardInstance?.goNext()" 
                  ${this.selectedPeople.length === 0 && !this.currentTranscript ? 'disabled' : ''}>
            Next Question
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Load people data from vault
   */
  async loadPeopleData() {
    try {
      console.log('👥 Loading people from vault...');
      
      if (window.emmaAPI && window.emmaAPI.people && window.emmaAPI.people.list) {
        const result = await window.emmaAPI.people.list();
        console.log('👥 People result:', result);
        
        if (result && result.success && Array.isArray(result.items)) {
          this.availablePeople = result.items;
          console.log(`👥 Loaded ${this.availablePeople.length} people from vault`);
        } else {
          this.availablePeople = [];
          console.log('👥 No people found in vault');
        }
      } else {
        console.warn('👥 People API not available');
        this.availablePeople = [];
      }
      
      // Initialize selected people array
      this.selectedPeople = [];
      
    } catch (error) {
      console.error('👥 Error loading people:', error);
      this.availablePeople = [];
      this.selectedPeople = [];
    }
  }

  /**
   * Initialize Emma orb in wizard header
   */
  initializeEmmaOrb() {
    try {
      const orbContainer = document.getElementById('wizard-emma-orb');
      if (!orbContainer) {
        console.warn('🌟 Wizard Emma orb container not found');
        return;
      }
      
      if (window.EmmaOrb) {
        this.webglOrb = new window.EmmaOrb(orbContainer, {
          hue: 270,
          hoverIntensity: 0.4,
          rotateOnHover: false,
          forceHoverState: true
        });
        console.log('🌟 Wizard Emma Orb initialized successfully');
      } else {
        console.warn('🌟 EmmaOrb class not available, using fallback');
        orbContainer.style.background = 'radial-gradient(circle at 30% 30%, #8A5EFA, #764ba2, #f093fb)';
      }
    } catch (error) {
      console.error('🚨 Error initializing Wizard Emma Orb:', error);
    }
  }

  /**
   * Select input method
   */
  selectInputMethod(method) {
    try {
    this.inputMethod = method;
    console.log(`🎯 Input method selected: ${method}`);
      console.log(`🎯 Current step before goNext: ${this.currentStep}`);
    this.goNext();
      console.log(`🎯 Current step after goNext: ${this.currentStep}`);
    } catch (error) {
      console.error('🚨 Error in selectInputMethod:', error);
    }
  }

  /**
   * Update input from user with enhanced UI feedback
   */
  updateInput(value) {
    this.currentTranscript = value;
    
    // Update character count
    const questionIndex = this.currentStep - 2;
    const charCount = document.getElementById(`char-count-${questionIndex}`);
    if (charCount) {
      const count = value.length;
      charCount.textContent = `${count} character${count !== 1 ? 's' : ''}`;
      
      // Add color coding for length
      if (count > 100) {
        charCount.style.color = '#48BB78'; // Green for good length
      } else if (count > 20) {
        charCount.style.color = '#667eea'; // Emma purple for decent length  
      } else {
        charCount.style.color = '#A0AEC0'; // Gray for short
      }
    }
    
    // Enable/disable next button based on content
    const nextBtn = document.getElementById('question-next-btn');
    if (nextBtn && this.currentStep >= 2 && this.currentStep <= 5) {
      const hasContent = value.trim().length > 0;
      nextBtn.disabled = !hasContent;
      
      // Update button text based on content quality
      if (hasContent && value.trim().length > 20) {
        nextBtn.innerHTML = `
          ${questionIndex < 3 ? 'Next Question' : 'Add Media'} ✨
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9,18 15,12 9,6"></polyline>
          </svg>
        `;
      }
    }
  }

  /**
   * Navigation methods
   */
  goNext() {
    try {
      console.log(`🎯 goNext called - current step: ${this.currentStep}, total steps: ${this.totalSteps}`);
      
      // Save response if on question step
      if (this.currentStep >= 2 && this.currentStep <= 5 && this.currentTranscript) {
        this.responses.push(this.currentTranscript);
        this.currentTranscript = '';
        console.log(`🎯 Saved response, total responses: ${this.responses.length}`);
      }
      
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        console.log(`🎯 Moving to step: ${this.currentStep}`);
        this.updateWizardContent();
        this.updateProgress();
        console.log(`🎯 Content and progress updated`);
      } else {
        console.log(`🎯 Already at final step (${this.currentStep}/${this.totalSteps})`);
      }
    } catch (error) {
      console.error('🚨 Error in goNext:', error);
      throw error; // Re-throw to see the full stack trace
    }
  }

  goBack() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateWizardContent();
      this.updateProgress();
    }
  }

  skipStep() {
    if (this.currentStep >= 2 && this.currentStep <= 5) {
      this.goNext();
    }
  }

  /**
   * Update wizard content with dynamic resizing
   */
  updateWizardContent() {
    try {
      console.log(`🎯 updateWizardContent called for step: ${this.currentStep}`);
      
      // Update dynamic header
      this.updateDynamicHeader();
      
      // Update content
    const contentElement = document.getElementById('wizard-content');
    if (contentElement) {
        const newContent = this.renderCurrentStep();
        console.log(`🎯 Generated content length: ${newContent.length}`);
        contentElement.innerHTML = newContent;
      setTimeout(() => this.optimizePopupHeight(), 50);
        console.log(`🎯 Content updated successfully`);
      } else {
        console.error('🚨 wizard-content element not found!');
      }
    } catch (error) {
      console.error('🚨 Error in updateWizardContent:', error);
      throw error;
    }
  }

  /**
   * Update dynamic header with current step's question
   */
  updateDynamicHeader() {
    const titleElement = document.getElementById('dynamic-title');
    const subtitleElement = document.getElementById('dynamic-subtitle');
    
    if (titleElement) {
      titleElement.textContent = this.getDynamicTitle();
    }
    
    if (subtitleElement) {
      subtitleElement.textContent = this.getDynamicSubtitle();
    }
  }

  /**
   * Get contextual input label for each question
   */
  getInputLabel(questionIndex) {
    const labels = [
      '✨ Your Special Memory',      // Question 1: What memory
      '👥 The People Involved',     // Question 2: Who was involved  
      '📍 The Location',            // Question 3: Where
      '💖 What Made It Special'     // Question 4: What made it special
    ];
    
    return labels[questionIndex] || '✨ Your Memory';
  }

  /**
   * Get contextual placeholder text for each question
   */
  getInputPlaceholder(questionIndex) {
    const placeholders = [
      'Describe the memory you want to capture... What happened? When was it? What do you remember most?',
      'Who was there with you? Family, friends, colleagues? Tell me about the people who shared this moment...',
      'Where did this take place? Was it at home, a special location, during travel? Paint the scene for me...',
      'What emotions did you feel? What made this moment stand out? Why is this memory precious to you?'
    ];
    
    return placeholders[questionIndex] || 'Share your thoughts and feelings about this memory...';
  }

  /**
   * Get contextual hints for each question
   */
  getInputHint(questionIndex) {
    const hints = [
      '💡 Include when it happened and what you remember most vividly',
      '👥 Mention names, relationships, and what they meant to you',
      '🗺️ Describe the setting, atmosphere, and what the place was like',
      '❤️ Share the emotions, feelings, and why this moment matters'
    ];
    
    return hints[questionIndex] || '💡 Be as detailed as you\'d like';
  }

  /**
   * Update progress indicator
   */
  updateProgress() {
    const progressFill = document.getElementById('wizard-progress-fill');
    const progressText = document.getElementById('progress-text');
    
    if (progressFill) {
      const percentage = (this.currentStep / this.totalSteps) * 100;
      progressFill.style.width = `${percentage}%`;
    }
    
    if (progressText) {
      progressText.textContent = `Step ${this.currentStep} of ${this.totalSteps}`;
    }
  }

  /**
   * Optimize popup height for content
   */
  optimizePopupHeight() {
    try {
      const popup = this.element; // Use this.element instead of this.popupElement
      if (!popup) {
        console.log('🎨 No popup element found for height optimization');
        return;
      }
      
      const content = popup.querySelector('.wizard-content');
      if (!content) {
        console.log('🎨 No wizard-content found for height optimization');
        return;
      }
      
      // Calculate optimal height based on actual content
      const headerHeight = 120; // Wizard header with Emma orb
      const progressHeight = 40; // Progress bar
      const contentHeight = content.scrollHeight;
      const padding = 40;
      
      const optimalHeight = headerHeight + progressHeight + contentHeight + padding;
      const maxHeight = window.innerHeight * 0.85; // Leave some margin
      const minHeight = 300; // Minimum height
      const finalHeight = Math.max(minHeight, Math.min(optimalHeight, maxHeight));
      
      console.log(`🎨 Height optimization: content=${contentHeight}px, optimal=${optimalHeight}px, final=${finalHeight}px`);
      
      popup.style.height = `${finalHeight}px`;
      
      // Update position to keep it centered
      this.position.height = finalHeight;
      
    } catch (error) {
      console.error('🎨 Height optimization failed:', error);
    }
  }

  /**
   * Setup dynamic resizing
   */
  setupDynamicResizing() {
    // Resize on window resize
    window.addEventListener('resize', () => {
      setTimeout(() => this.optimizePopupHeight(), 100);
    });
  }

  /**
   * Toggle voice recording
   */
  toggleRecording() {
    console.log('🎤 Toggle recording called, current state:', this.isRecording);
    
    if (!this.recognition) {
      console.error('🎤 Speech recognition not available');
      this.showToast('❌ Speech recognition not available', 'error');
      return;
    }

    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  /**
   * Start voice recording
   */
  startRecording() {
    try {
      console.log('🎤 Starting voice recording...');
      this.isRecording = true;
      this.currentTranscript = '';
      
      // Update UI
      this.updateVoiceUI();
      
      // Start recognition
      this.recognition.start();
      
      // Set up event handlers
      this.recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        this.currentTranscript = finalTranscript + interimTranscript;
        this.updateTranscriptionDisplay();
        this.updateInput(this.currentTranscript);
      };
      
      this.recognition.onerror = (event) => {
        console.error('🎤 Speech recognition error:', event.error);
        this.stopRecording();
        this.showToast('❌ Voice recognition error', 'error');
      };
      
      this.recognition.onend = () => {
        console.log('🎤 Speech recognition ended');
        this.isRecording = false;
        this.updateVoiceUI();
      };
      
    } catch (error) {
      console.error('🎤 Error starting recording:', error);
      this.isRecording = false;
      this.updateVoiceUI();
    }
  }

  /**
   * Stop voice recording
   */
  stopRecording() {
    try {
      console.log('🎤 Stopping voice recording...');
      this.isRecording = false;
      
      if (this.recognition) {
        this.recognition.stop();
      }
      
      this.updateVoiceUI();
      
    } catch (error) {
      console.error('🎤 Error stopping recording:', error);
    }
  }

  /**
   * Update voice UI elements
   */
  updateVoiceUI() {
    const questionIndex = this.currentStep - 2;
    
    // Update voice button
    const voiceBtn = document.getElementById(`voice-btn-${questionIndex}`);
    if (voiceBtn) {
      voiceBtn.className = `voice-btn ${this.isRecording ? 'recording' : ''}`;
      const span = voiceBtn.querySelector('span');
      if (span) {
        span.textContent = this.isRecording ? 'Stop Recording' : 'Start Recording';
      }
    }
    
    // Update voice status
    const voiceStatus = document.getElementById(`voice-status-${questionIndex}`);
    if (voiceStatus) {
      voiceStatus.textContent = this.isRecording ? '🎤 Listening...' : '🎤 Tap to speak';
    }
    
    // Update audio visualizer
    const visualizer = document.getElementById(`audio-visualizer-${questionIndex}`);
    if (visualizer) {
      if (this.isRecording) {
        visualizer.classList.add('active');
      } else {
        visualizer.classList.remove('active');
      }
    }
  }

  /**
   * Update transcription display
   */
  updateTranscriptionDisplay() {
    const questionIndex = this.currentStep - 2;
    const transcriptionText = document.getElementById(`transcription-${questionIndex}`)?.querySelector('.transcription-text');
    
    if (transcriptionText) {
      transcriptionText.textContent = this.currentTranscript || 'Your words will appear here as you speak...';
    }
    
    // Also update the textarea
    const textarea = document.getElementById(`memory-input-${questionIndex}`);
    if (textarea) {
      textarea.value = this.currentTranscript;
    }
  }

  /**
   * Toggle person selection
   */
  togglePersonSelection(personId) {
    console.log('👥 Toggle person selection:', personId);
    
    if (!this.selectedPeople) {
      this.selectedPeople = [];
    }
    
    const index = this.selectedPeople.indexOf(personId);
    if (index === -1) {
      this.selectedPeople.push(personId);
      console.log('👥 Added person:', personId);
    } else {
      this.selectedPeople.splice(index, 1);
      console.log('👥 Removed person:', personId);
    }
    
    this.updatePeopleUI();
    this.updateNextButton();
  }

  /**
   * Update people selection UI
   */
  updatePeopleUI() {
    // Update person cards
    const personCards = document.querySelectorAll('.person-card');
    personCards.forEach(card => {
      const onclick = card.getAttribute('onclick');
      if (onclick) {
        const personId = onclick.match(/'([^']+)'/)?.[1];
        if (personId) {
          if (this.selectedPeople.includes(personId)) {
            card.classList.add('selected');
          } else {
            card.classList.remove('selected');
          }
        }
      }
    });
    
    // Update selected people summary
    this.updateSelectedPeopleSummary();
  }

  /**
   * Update selected people summary
   */
  updateSelectedPeopleSummary() {
    const summaryElement = document.getElementById('selected-people-summary');
    const listElement = document.getElementById('selected-people-list');
    
    if (!summaryElement || !listElement) return;
    
    if (this.selectedPeople.length > 0) {
      summaryElement.style.display = 'block';
      
      const selectedNames = this.selectedPeople.map(personId => {
        const person = this.availablePeople.find(p => p.id === personId);
        return person ? person.name : 'Unknown';
      });
      
      listElement.innerHTML = selectedNames.map(name => `
        <div class="selected-person-tag">
          <span>${name}</span>
        </div>
      `).join('');
    } else {
      summaryElement.style.display = 'none';
    }
  }

  /**
   * Update next button state
   */
  updateNextButton() {
    const nextBtn = document.getElementById('question-next-btn');
    if (nextBtn) {
      const hasSelection = this.selectedPeople.length > 0 || this.currentTranscript;
      nextBtn.disabled = !hasSelection;
    }
  }

  /**
   * Toggle manual input area
   */
  toggleManualInput() {
    const manualArea = document.getElementById('manual-input-area');
    if (manualArea) {
      const isVisible = manualArea.style.display !== 'none';
      manualArea.style.display = isVisible ? 'none' : 'block';
      
      if (!isVisible) {
        // Focus the textarea when showing manual input
        const textarea = manualArea.querySelector('textarea');
        if (textarea) {
          setTimeout(() => textarea.focus(), 100);
        }
      }
    }
  }

  /**
   * Show add person form (placeholder)
   */
  showAddPersonForm() {
    // For now, just toggle manual input
    this.toggleManualInput();
    this.showToast('💡 Use the manual input below to add new people', 'info');
  }

  /**
   * Handle file selection from input
   */
  handleFileSelect(event) {
    const files = Array.from(event.target.files);
    this.processFiles(files);
  }

  /**
   * Handle drag and drop
   */
  handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const dropZone = document.getElementById('emma-drop-zone');
    dropZone.classList.remove('drag-over');
    
    const files = Array.from(event.dataTransfer.files);
    this.processFiles(files);
  }

  /**
   * Process uploaded files
   */
  async processFiles(files) {
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      
      if (!isImage && !isVideo) {
        this.showUploadError(`${file.name} is not a supported media file`);
        return false;
      }
      
      if (!isValidSize) {
        this.showUploadError(`${file.name} is too large (max 50MB)`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    // Add files to media items
    for (const file of validFiles) {
      const mediaItem = {
        file: file,
        name: file.name,
        type: file.type,
        size: file.size,
        preview: await this.generatePreview(file),
        id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      this.mediaItems.push(mediaItem);
    }

    // Update the UI
    this.updateMediaPreview();
    console.log(`📷 Added ${validFiles.length} media items, total: ${this.mediaItems.length}`);
  }

  /**
   * Generate preview for media file
   */
  async generatePreview(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (file.type.startsWith('image/')) {
          resolve({
            type: 'image',
            url: e.target.result,
            thumbnail: e.target.result
          });
        } else if (file.type.startsWith('video/')) {
          // For videos, create a video element to capture thumbnail
          const video = document.createElement('video');
          video.src = e.target.result;
          video.onloadedmetadata = () => {
            video.currentTime = 1; // Seek to 1 second for thumbnail
          };
          video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 150;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            resolve({
              type: 'video',
              url: e.target.result,
              thumbnail: canvas.toDataURL(),
              duration: video.duration
            });
          };
        }
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Update media preview grid
   */
  updateMediaPreview() {
    const previewGrid = document.getElementById('media-preview-grid');
    const previewItems = document.getElementById('preview-items');
    const dropZone = document.getElementById('emma-drop-zone');
    
    if (this.mediaItems.length > 0) {
      // Show preview grid, hide drop zone
      previewGrid.style.display = 'block';
      dropZone.style.display = 'none';
      
      // Generate preview HTML
      previewItems.innerHTML = this.mediaItems.map(item => `
        <div class="media-preview-item" data-id="${item.id}">
          <div class="preview-thumbnail">
            ${item.preview.type === 'image' ? `
              <img src="${item.preview.thumbnail}" alt="${item.name}">
            ` : `
              <div class="video-thumbnail">
                <img src="${item.preview.thumbnail}" alt="${item.name}">
                <div class="video-overlay">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                    <polygon points="5,3 19,12 5,21"/>
                  </svg>
                  <span class="video-duration">${this.formatDuration(item.preview.duration)}</span>
                </div>
              </div>
            `}
          </div>
          
          <div class="preview-info">
            <div class="file-name">${this.truncateFileName(item.name)}</div>
            <div class="file-size">${this.formatFileSize(item.size)}</div>
          </div>
          
          <button class="remove-media-btn" onclick="event.stopPropagation(); window.unifiedWizardInstance?.removeMedia('${item.id}')">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      `).join('');
    } else {
      // Show drop zone, hide preview grid
      previewGrid.style.display = 'none';
      dropZone.style.display = 'flex';
    }
  }

  /**
   * Remove media item
   */
  removeMedia(mediaId) {
    this.mediaItems = this.mediaItems.filter(item => item.id !== mediaId);
    this.updateMediaPreview();
    console.log(`🗑️ Removed media item, remaining: ${this.mediaItems.length}`);
  }

  /**
   * Show upload error with Emma styling
   */
  showUploadError(message) {
    // Create temporary error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'upload-error-toast';
    errorDiv.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      ${message}
    `;
    
    document.body.appendChild(errorDiv);
    
    // Remove after 4 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 4000);
  }

  /**
   * Utility methods for media handling
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatDuration(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  truncateFileName(name) {
    if (name.length <= 20) return name;
    const ext = name.split('.').pop();
    const base = name.substring(0, name.lastIndexOf('.'));
    return base.substring(0, 15) + '...' + ext;
  }

  /**
   * Generate intelligent memory title from responses
   */
  generateMemoryTitle() {
    if (this.responses.length === 0) return 'New Memory';
    
    const firstResponse = this.responses[0] || '';
    
    // Extract key phrases for title
    const words = firstResponse.split(' ').filter(word => word.length > 3);
    const keyWords = words.slice(0, 4).join(' ');
    
    if (keyWords.length > 50) {
      return keyWords.substring(0, 47) + '...';
    }
    
    return keyWords || 'Special Memory';
  }

  /**
   * Generate cohesive memory story from all responses
   */
  generateMemoryStory() {
    if (this.responses.length === 0) return 'No story captured yet.';
    
    const questionLabels = [
      'The Memory',
      'People Involved', 
      'Location',
      'What Made It Special'
    ];
    
    let story = '';
    this.responses.forEach((response, index) => {
      if (response && response.trim()) {
        story += `**${questionLabels[index] || `Detail ${index + 1}`}:**\n${response.trim()}\n\n`;
      }
    });
    
    return story || 'No details captured yet.';
  }

  /**
   * Save memory capsule to Emma's vault
   */
  async saveMemoryToVault() {
    try {
      console.log('💾 Saving memory capsule to vault...');
      
      // Show saving state
      const saveBtn = document.querySelector('.wizard-btn-save');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 11-6.219-8.56"/>
          </svg>
          Saving...
        `;
      }
      
      // First, save media files to vault if any exist
      const processedMediaItems = await this.saveMediaToVault();
      
      // Create memory capsule object with vault-processed media
      const memoryCapsule = {
        id: `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: this.generateMemoryTitle(),
        content: this.generateMemoryStory(), // Use 'content' instead of 'story' to match gallery
        story: this.generateMemoryStory(), // Keep both for compatibility
        responses: this.responses,
        mediaItems: processedMediaItems,
        inputMethod: this.inputMethod,
        createdAt: new Date().toISOString(),
        date: new Date().toISOString(),
        category: this.detectCategory(),
        tags: this.generateTags()
      };
      
      console.log('💾 Memory capsule created:', memoryCapsule);
      
      // Save to .emma web vault using our web vault system
      console.log('💾 VAULT DEBUG: Checking vault availability...');
      console.log('💾 VAULT DEBUG: emmaWebVault exists:', !!window.emmaWebVault);
      console.log('💾 VAULT DEBUG: webVaultStatus exists:', !!window.webVaultStatus);
      console.log('💾 VAULT DEBUG: sessionStorage emmaVaultActive:', sessionStorage.getItem('emmaVaultActive'));
      console.log('💾 VAULT DEBUG: localStorage sessionExpiry:', localStorage.getItem('emmaVaultSessionExpiry'));
      
      if (window.webVaultStatus) {
          // CRITICAL FIX: Remove session expiry check - vault stays unlocked until user locks it
        const isSessionValid = true; // Always valid - user controlled locking
        
        console.log('💾 VAULT DEBUG: Session expiry check DISABLED - user controlled locking');
        console.log('💾 VAULT DEBUG: Session always valid until user locks vault');
        console.log('💾 VAULT DEBUG: webVaultStatus.status:', window.webVaultStatus.getStatus());
        console.log('💾 VAULT DEBUG: isUnlocked() result:', window.webVaultStatus.isUnlocked());
      }
      
      // CRITICAL: Force vault open if session is active but vault thinks it's closed
      if (window.emmaWebVault && sessionStorage.getItem('emmaVaultActive') === 'true') {
        // CRITICAL FIX: Remove session expiry check - vault stays unlocked until user locks it
        const isSessionValid = true; // Always valid - user controlled locking
        
        if (isSessionValid && !window.emmaWebVault.isOpen) {
          console.log('🔧 FORCE OPENING: Session is valid but vault thinks it\'s closed - forcing open');
          window.emmaWebVault.isOpen = true;
          
          // Try to load minimal vault data if missing
          if (!window.emmaWebVault.vaultData) {
            window.emmaWebVault.vaultData = {
              content: { memories: {}, people: {}, media: {} },
              stats: { memoryCount: 0, peopleCount: 0, mediaCount: 0 },
              metadata: { name: sessionStorage.getItem('emmaVaultName') || 'Web Vault' }
            };
            console.log('🔧 FORCE OPENING: Created minimal vault data structure');
          }
        }
      }
      
      // CRITICAL: Check for extension mode OR normal vault unlock
      const extensionMode = window.emmaWebVault && window.emmaWebVault.extensionAvailable;
      const normalVaultUnlocked = window.emmaWebVault && window.webVaultStatus && window.webVaultStatus.isUnlocked();
      
      if (extensionMode || normalVaultUnlocked) {
        try {
          console.log('💾 Using emmaWebVault.addMemory() for .emma vault');
          // Convert media items to vault format
          const vaultAttachments = [];
          for (const mediaItem of this.mediaItems || []) {
            if (mediaItem.file) {
              vaultAttachments.push({
                type: mediaItem.type,
                name: mediaItem.name,
                file: mediaItem.file
              });
            } else if (mediaItem.preview && mediaItem.preview.url) {
              vaultAttachments.push({
                type: mediaItem.type,
                name: mediaItem.name,
                data: mediaItem.preview.url
              });
            }
          }
          
          console.log('💾 VAULT: Converted attachments for vault:', vaultAttachments);
          
          const result = await window.emmaWebVault.addMemory({
            content: memoryCapsule.content || memoryCapsule.story,
            metadata: {
              title: memoryCapsule.title,
              category: memoryCapsule.category,
              tags: memoryCapsule.tags,
              createdAt: memoryCapsule.createdAt,
              inputMethod: memoryCapsule.inputMethod,
              responses: memoryCapsule.responses
            },
            attachments: vaultAttachments
          });
          console.log('💾 Memory saved to .emma vault successfully:', result);
          
          this.showSuccessMessage('Memory capsule saved to your secure .emma vault! 🎉');
          
          // Close wizard and refresh gallery
          setTimeout(() => {
            this.close();
            
            // Refresh gallery if we're on the gallery page
            if (window.location.pathname.includes('memory-gallery')) {
              console.log('🔄 WIZARD: Refreshing gallery to show new memory...');
              // Wait for extension to complete saving, then refresh
              setTimeout(() => {
                if (window.refreshMemoryGallery) {
                  window.refreshMemoryGallery();
                } else if (window.loadMemories) {
                  window.loadMemories();
                }
              }, 500);
            }
          }, 2000);
          return;
          
        } catch (vaultError) {
          console.error('💾 .emma vault save failed:', vaultError);
        }
      } else {
        console.warn('💾 Web vault not available or locked - cannot save memory');
        this.showErrorMessage('Vault is not unlocked. Please unlock your vault first.');
        return;
      }

      
    } catch (error) {
      console.error('💾 Error saving memory:', error);
      this.showErrorMessage('Error saving memory. Please try again.');
      
      // Reset save button
      const saveBtn = document.querySelector('.wizard-btn-save');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
          </svg>
          Save to Vault
        `;
      }
    }
  }

  /**
   * Save to local storage as fallback
   */
  saveToLocalStorage(memoryCapsule) {
    try {
      // Add a unique ID for the memory
      memoryCapsule.id = `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const existingMemories = JSON.parse(localStorage.getItem('emma_memories') || '[]');
      existingMemories.push(memoryCapsule);
      localStorage.setItem('emma_memories', JSON.stringify(existingMemories));
      
      console.log('💾 Memory saved to local storage:', memoryCapsule);
      
      this.showSuccessMessage('Memory capsule saved! Refreshing gallery... 💾');
      
      // Close wizard and refresh gallery
      setTimeout(() => {
        this.close();
        // Try to refresh the gallery if possible
        if (window.location.pathname.includes('memory-gallery')) {
          console.log('💾 Refreshing gallery page...');
          window.location.reload();
        }
      }, 1500);
      
    } catch (error) {
      console.error('💾 Local storage failed:', error);
      this.showErrorMessage('Failed to save memory. Please try again.');
    }
  }

  /**
   * CTO Critical Fix: Save media files to vault first
   */
  async saveMediaToVault() {
    if (!this.mediaItems || this.mediaItems.length === 0) {
      console.log('💾 No media items to save');
      return [];
    }
    
    console.log(`💾 Processing ${this.mediaItems.length} media files for vault storage...`);
    const processedMediaItems = [];
    
    for (const mediaItem of this.mediaItems) {
      try {
        let vaultAttachmentId = null;
        
        // Try to save to vault using attachment API
        if (window.emmaAPI && window.emmaAPI.vault && window.emmaAPI.vault.attachment && window.emmaAPI.vault.attachment.add) {
          console.log(`📷 MEDIA: Saving ${mediaItem.name} to vault...`);
          
          // Convert file to data URL if not already done
          let dataUrl = mediaItem.preview.url;
          if (mediaItem.file && !dataUrl) {
            dataUrl = await this.fileToDataUrl(mediaItem.file);
          }
          
          const vaultResult = await window.emmaAPI.vault.attachment.add({
            name: mediaItem.name,
            type: mediaItem.type,
            data: dataUrl,
            size: mediaItem.size
          });
          
          if (vaultResult && vaultResult.success && vaultResult.id) {
            vaultAttachmentId = vaultResult.id;
            console.log(`📷 MEDIA: ${mediaItem.name} saved to vault with ID: ${vaultAttachmentId}`);
          } else {
            console.error(`📷 MEDIA: Vault save failed for ${mediaItem.name}:`, vaultResult);
          }
        } else {
          console.warn('📷 MEDIA: Using direct web vault addMedia API');
          // Fallback to direct web vault API
          if (window.emmaWebVault && window.emmaWebVault.isOpen) {
            vaultAttachmentId = await window.emmaWebVault.addMedia({
              name: mediaItem.name,
              type: mediaItem.type,
              file: mediaItem.file || mediaItem.preview.url
            });
            console.log(`📷 MEDIA: ${mediaItem.name} saved directly to web vault with ID: ${vaultAttachmentId}`);
          }
        }
        
        // Create processed media item
        const processedItem = {
          id: mediaItem.id,
          name: mediaItem.name,
          type: mediaItem.type,
          size: mediaItem.size,
          vaultId: vaultAttachmentId,
          uploadedAt: new Date().toISOString(),
          isPersisted: !!vaultAttachmentId,
          // Keep dataUrl for local display if vault save failed
          url: vaultAttachmentId ? null : mediaItem.preview.url,
          dataUrl: vaultAttachmentId ? null : mediaItem.preview.url
        };
        
        processedMediaItems.push(processedItem);
        
      } catch (error) {
        console.error(`📷 MEDIA: Error processing ${mediaItem.name}:`, error);
        
        // Add as local-only item if vault processing fails
        processedMediaItems.push({
          id: mediaItem.id,
          name: mediaItem.name,
          type: mediaItem.type,
          size: mediaItem.size,
          vaultId: null,
          uploadedAt: new Date().toISOString(),
          isPersisted: false,
          url: mediaItem.preview.url,
          dataUrl: mediaItem.preview.url
        });
      }
    }
    
    console.log(`💾 Processed ${processedMediaItems.length} media items:`, processedMediaItems.map(item => ({
      name: item.name,
      isPersisted: item.isPersisted,
      vaultId: item.vaultId
    })));
    
    return processedMediaItems;
  }

  /**
   * Convert file to data URL
   */
  async fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Detect memory category from content
   */
  detectCategory() {
    const allText = this.responses.join(' ').toLowerCase();
    
    if (allText.includes('family') || allText.includes('mom') || allText.includes('dad') || allText.includes('child')) return 'family';
    if (allText.includes('travel') || allText.includes('trip') || allText.includes('vacation')) return 'travel';
    if (allText.includes('wedding') || allText.includes('marriage')) return 'celebration';
    if (allText.includes('birthday') || allText.includes('party')) return 'celebration';
    if (allText.includes('work') || allText.includes('job') || allText.includes('career')) return 'work';
    if (allText.includes('school') || allText.includes('education') || allText.includes('graduation')) return 'education';
    if (allText.includes('holiday') || allText.includes('christmas')) return 'holiday';
    
    return 'personal'; // Default category
  }

  /**
   * Generate tags from memory content
   */
  generateTags() {
    const tags = new Set();
    const allText = this.responses.join(' ').toLowerCase();
    
    // Auto-detect common themes
    if (allText.includes('family') || allText.includes('mom') || allText.includes('dad')) tags.add('family');
    if (allText.includes('friend') || allText.includes('friends')) tags.add('friends');
    if (allText.includes('travel') || allText.includes('trip') || allText.includes('vacation')) tags.add('travel');
    if (allText.includes('wedding') || allText.includes('marriage')) tags.add('wedding');
    if (allText.includes('birthday') || allText.includes('celebration')) tags.add('celebration');
    if (allText.includes('work') || allText.includes('job') || allText.includes('career')) tags.add('work');
    if (allText.includes('school') || allText.includes('education')) tags.add('education');
    if (allText.includes('holiday') || allText.includes('christmas') || allText.includes('thanksgiving')) tags.add('holiday');
    
    return Array.from(tags);
  }

  /**
   * Show success message
   */
  showSuccessMessage(message) {
    this.showToast(message, 'success');
  }

  /**
   * Show error message  
   */
  showErrorMessage(message) {
    this.showToast(message, 'error');
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `wizard-toast wizard-toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'} ${message}
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 4000);
  }
}

// Export for global access
window.UnifiedMemoryWizard = UnifiedMemoryWizard;

console.log('🧠 UnifiedMemoryWizard: Clean version loaded successfully');