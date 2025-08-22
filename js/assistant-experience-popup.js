/**
 * Emma Assistant Experience Popup
 * General-purpose AI assistant interface
 */

class AssistantExperience extends ExperiencePopup {
  constructor(position, settings) {
    super(position, settings);
    this.chatHistory = [];
  }

  getTitle() {
    return 'Emma Assistant';
  }

  renderContent(contentElement) {
    contentElement.innerHTML = `
      <div class="assistant-experience">
        <!-- Clean Header -->
        <div class="custom-header">
          <!-- Navigation Toolbar (Left) -->
          <div class="navigation-toolbar">
            <button class="nav-btn dashboard-btn" onclick="window.assistantInstance?.navigateHome()" data-tab="dashboard" title="Dashboard Home">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
            </button>
            <button class="nav-btn active" onclick="window.assistantInstance?.showHomeTab()" data-tab="home" title="Voice Assistant">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" x2="12" y1="19" y2="22"/>
                <line x1="8" x2="16" y1="22" y2="22"/>
              </svg>
            </button>
            <button class="nav-btn" onclick="window.assistantInstance?.showRememberDialog()" data-tab="remember" title="Remember - Emma's Memory">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
                <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
                <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
                <path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/>
                <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/>
                <path d="M3.477 10.896a4 4 0 0 1 .585-.396"/>
                <path d="M19.938 10.5a4 4 0 0 1 .585.396"/>
                <path d="M6 18a4 4 0 0 1-1.967-.516"/>
                <path d="M19.967 17.484A4 4 0 0 1 18 18"/>
              </svg>
            </button>
            <button class="nav-btn" onclick="window.assistantInstance?.showChatTab()" data-tab="chat" title="Chat">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
            <button class="nav-btn" onclick="window.assistantInstance?.showMemoriesTab()" data-tab="memories" title="Memories">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
            </button>
            <button class="nav-btn" onclick="window.assistantInstance?.showActionsTab()" data-tab="actions" title="Actions">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
        </div>

          <!-- Action Buttons (Right) -->
          <div class="header-actions">
            <button class="vault-btn" onclick="window.assistantInstance?.openVaultDialog()" title="Vault Settings">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
              </svg>
            </button>
            <button class="settings-btn" id="settings-btn" onclick="window.assistantInstance?.navigateToSettings()" title="App Settings">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="m12 1 1.68 1.68a3 3 0 0 0 2.12.88h2.4a1 1 0 0 1 1 1v2.4a3 3 0 0 0 .88 2.12L22 12l-1.68 1.68a3 3 0 0 0-.88 2.12v2.4a1 1 0 0 1-1 1h-2.4a3 3 0 0 0-2.12.88L12 23l-1.68-1.68a3 3 0 0 0-2.12-.88H5.8a1 1 0 0 1-1-1v-2.4a3 3 0 0 0-.88-2.12L2 12l1.68-1.68a3 3 0 0 0 .88-2.12V5.8a1 1 0 0 1 1-1h2.4a3 3 0 0 0 2.12-.88z"/>
              </svg>
            </button>
            <button class="close-btn" onclick="window.assistantInstance?.close()">×</button>
          </div>
        </div>

        <!-- Tab Content Container -->
        <div class="tab-content-container">
                     <!-- Voice Assistant Tab -->
           <div class="tab-content active" data-tab="home">
             <!-- Voice Memory Wizard - ULTRA COMPACT NO SCROLL -->
             <div class="voice-wizard-container" style="min-height: 600px;">
               <!-- Emma's Question -->
               <div class="emma-section">
                 <div class="emma-label">Emma asks</div>
                 <h1 class="emma-question" id="questionText">
                   What's your favorite memory with Mom? Take your time, I'm listening.
                 </h1>
                 <div class="suggestions">
                   <button class="suggestion-chip" onclick="window.assistantInstance?.addSuggestion('Holiday traditions')">Holiday traditions</button>
                   <button class="suggestion-chip" onclick="window.assistantInstance?.addSuggestion('Her wisdom')">Her wisdom</button>
                   <button class="suggestion-chip" onclick="window.assistantInstance?.addSuggestion('Family meals')">Family meals</button>
                 </div>
               </div>

               <!-- Voice Capture -->
               <div class="voice-capture">
                 <div class="voice-button-container">
                   <button class="voice-button" id="voiceBtn" onclick="window.assistantInstance?.toggleRecording()">
                     <span id="voiceIcon">
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                         <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                         <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                         <line x1="12" x2="12" y1="19" y2="22"/>
                         <line x1="8" x2="16" y1="22" y2="22"/>
                       </svg>
                     </span>
                   </button>
                 </div>
                 <div class="voice-status" id="voiceStatus">Tap to start recording</div>
               </div>

               <!-- Transcription -->
               <div class="transcription">
                 <div class="transcription-label">Your Story</div>
                 <div class="transcription-text" id="transcriptionText">
                   <span class="transcription-placeholder">Your words will appear here as you speak...</span>
                 </div>
               </div>

               <!-- Progress -->
               <div class="wizard-progress">
                 <div class="progress-bar">
                   <div class="progress-fill" id="progressBar"></div>
                 </div>
                 <div class="progress-text">
                   <span id="currentStep">1</span> of <span id="totalSteps">5</span> questions
                 </div>
               </div>

               <!-- Actions -->
               <div class="wizard-actions">
                 <button class="wizard-btn wizard-btn-secondary" onclick="window.assistantInstance?.skipQuestion()">Skip</button>
                 <button class="wizard-btn wizard-btn-primary" onclick="window.assistantInstance?.nextQuestion()">Continue →</button>
               </div>
             </div>
           </div>

          <!-- Chat Tab -->
          <div class="tab-content" data-tab="chat">
        <div class="chat-container">
          <div class="chat-messages" id="chat-messages">
            <div class="emma-message">
                  <div class="message-avatar">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"/>
                    </svg>
                  </div>
              <div class="message-content">
                <p>Hello! I'm Emma, your AI assistant. How can I help you today?</p>
                <div class="message-suggestions">
                      <button class="suggestion-btn" onclick="window.assistantInstance?.sendMessage('Help me organize my memories')">Organize memories</button>
                      <button class="suggestion-btn" onclick="window.assistantInstance?.sendMessage('What did I do yesterday?')">Yesterday's activities</button>
                      <button class="suggestion-btn" onclick="window.assistantInstance?.sendMessage('Show me my photos')">View photos</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Input Area -->
          <div class="chat-input-area">
            <input type="text" id="chat-input" placeholder="Ask me anything..." class="chat-input">
                <button class="send-button" onclick="window.assistantInstance?.sendCurrentMessage()">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/>
                  </svg>
                </button>
              </div>
          </div>
        </div>

          <!-- Memories Tab -->
          <div class="tab-content" data-tab="memories">
            <!-- Mini Gallery for Memories Tab - Full Width -->
            <div class="memories-mini-gallery full-width">
              <div class="mini-gallery-header">
                <h3>Your Memory Collection</h3>
                <button class="view-all-btn" onclick="window.location.href='memory-gallery-new.html'">View All</button>
              </div>
              <div class="mini-gallery-grid" id="memories-mini-gallery-grid">
                <!-- Memory cards will be loaded here -->
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Status -->
        <div class="status-bar">
          <div class="status-item">
            <span class="status-label">Memories:</span>
            <span class="status-value" id="memory-count">Loading...</span>
          </div>
          <div class="status-item">
            <span class="status-label">Last Activity:</span>
            <span class="status-value" id="last-activity">Just now</span>
          </div>
        </div>
      </div>
    `;

    this.addAssistantStyles();
  }

  addAssistantStyles() {
    if (document.getElementById('assistant-experience-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'assistant-experience-styles';
    styles.textContent = `
      /* Override base popup styles */
      .emma-experience-popup {
        padding: 0 !important;
      }

             .assistant-experience {
         position: absolute;
         top: 0;
         left: 0;
         right: 0;
         bottom: 0;
         display: flex;
         flex-direction: column;
         background: linear-gradient(135deg, rgba(147, 112, 219, 0.95), rgba(123, 104, 238, 0.95));
         backdrop-filter: blur(20px);
         border-radius: 16px;
         overflow: hidden;
         margin: 0;
         padding: 0;
         font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         color: white;
         width: 100%;
         height: 100%;
         min-height: 600px; /* Temporary fixed height while debugging */
       }

      /* Clean Header */
      .custom-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(255, 255, 255, 0.05);
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }      .vault-btn, .settings-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .vault-btn:hover, .settings-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
      }

      .close-btn {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        font-size: 18px;
        cursor: pointer;
        padding: 4px;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .close-btn:hover {
        color: white;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }      /* Message Avatar Styles */
      .message-avatar {
        width: 28px;
        height: 28px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        flex-shrink: 0;
      }

      /* Navigation Toolbar */
      .navigation-toolbar {
        display: flex;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 6px;
        gap: 4px;
      }

      .nav-btn {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        padding: 10px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        position: relative;
      }

      .nav-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        color: rgba(255, 255, 255, 0.9);
        transform: translateY(-1px);
      }

      .nav-btn.active {
        background: rgba(255, 255, 255, 0.25);
        color: white;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      /* Special styling for the brain icon (remember feature) */
      .nav-btn[data-tab="remember"] {
        background: linear-gradient(135deg, rgba(138, 43, 226, 0.3), rgba(75, 0, 130, 0.3));
        border: 1px solid rgba(138, 43, 226, 0.4);
      }

      .nav-btn[data-tab="remember"]:hover {
        background: linear-gradient(135deg, rgba(138, 43, 226, 0.4), rgba(75, 0, 130, 0.4));
        border-color: rgba(138, 43, 226, 0.6);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(138, 43, 226, 0.3);
      }

      /* Home Dashboard */
      .home-dashboard {
        padding: 20px;
        height: 100%;
        overflow-y: auto;
        /* Hide scrollbar but keep functionality */
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      .home-dashboard::-webkit-scrollbar {
        display: none;
      }

      .features-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 24px;
      }

      .feature-card {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        padding: 20px 16px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        min-height: 100px;
      }

      .feature-card:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
      }

      .feature-icon {
        width: 40px;
        height: 40px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }

      .feature-info h3 {
        margin: 0;
        color: white;
        font-size: 14px;
        font-weight: 600;
      }

      .feature-info p {
        margin: 0;
        color: rgba(255, 255, 255, 0.7);
        font-size: 12px;
      }

      .quick-stats {
        display: flex;
        gap: 24px;
        justify-content: center;
        padding: 20px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        margin-top: 4px;
      }

      /* Mini Gallery Styles */
      .mini-gallery-container, .memories-mini-gallery {
        grid-column: span 2;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        padding: 20px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      /* Full Width Mini Gallery */
      .mini-gallery-container.full-width, .memories-mini-gallery.full-width {
        grid-column: unset;
        background: transparent;
        border: none;
        padding: 0;
        border-radius: 0;
        width: 100%;
      }

      .mini-gallery-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding: 0 20px;
      }

      .full-width .mini-gallery-header {
        padding: 12px 20px 8px 20px;
      }

      .mini-gallery-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: white;
      }

      .view-all-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .view-all-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.3);
      }

      .mini-gallery-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .full-width .mini-gallery-grid {
        padding: 0 20px 12px 20px;
      }

      .mini-memory-card {
        background: rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 12px;
        cursor: pointer;
        transition: background 0.15s ease;
        border: 1px solid rgba(255, 255, 255, 0.1);
        position: relative;
        overflow: hidden;
        user-select: none;
      }

      .mini-memory-card:hover {
        background: rgba(255, 255, 255, 0.12);
      }

      .mini-memory-image {
        width: 100%;
        height: 80px;
        background: linear-gradient(135deg, rgba(147, 112, 219, 0.3), rgba(123, 104, 238, 0.3));
        border-radius: 8px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        overflow: hidden;
      }

      .mini-memory-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 8px;
      }

      .mini-memory-title {
        font-size: 12px;
        font-weight: 600;
        color: white;
        margin: 0 0 4px 0;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .mini-memory-date {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.7);
        margin: 0;
      }

      .mini-memory-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 20px;
        color: rgba(255, 255, 255, 0.5);
        font-size: 12px;
      }

      .mini-memory-placeholder svg {
        margin-bottom: 8px;
        opacity: 0.5;
      }

      .stat-item {
        text-align: center;
        flex: 1;
      }

      .stat-number {
        display: block;
        color: white;
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 4px;
      }

      .stat-label {
        color: rgba(255, 255, 255, 0.7);
        font-size: 12px;
      }

             /* Tab Content - BULLETPROOF FLEXBOX DESIGN */
       .tab-content-container {
         flex: 1;
         position: relative;
         overflow: hidden;
         min-height: 0;
         display: flex;
         flex-direction: column;
       }

       .tab-content {
         position: absolute;
         top: 0;
         left: 0;
         right: 0;
         bottom: 0;
         padding: 0;
         opacity: 0;
         transform: translateX(20px);
         transition: opacity 0.2s ease, transform 0.2s ease;
         pointer-events: none;
         overflow: hidden; /* NO SCROLLING EVER */
         display: flex;
         flex-direction: column;
       }

      .tab-content.active {
        opacity: 1;
        transform: translateX(0);
        pointer-events: auto;
      }

      /* Remove padding for full-width galleries */
      .tab-content[data-tab="memories"] {
        padding: 0;
      }

                    /* Voice Wizard - ULTRA COMPACT NO SCROLL DESIGN */
       .voice-wizard-container {
         display: flex;
         flex-direction: column;
         height: 100%;
         padding: 20px;
         box-sizing: border-box;
         justify-content: space-between;
         gap: 20px; /* More generous spacing */
       }

       /* Emma Question Section - Compact */
       .emma-section {
         text-align: center;
         padding: 0;
         flex-shrink: 0;
       }

      .emma-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 8px;
      }

             .emma-question {
         font-size: 16px; /* Smaller font */
         font-weight: 600;
         color: white;
         line-height: 1.3; /* Tighter line height */
         margin: 8px 0; /* Tighter margins */
       }

      .suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        justify-content: center;
        margin-top: 4px;
      }

             .suggestion-chip {
         padding: 4px 8px; /* More compact */
         background: rgba(255, 255, 255, 0.1);
         border: 1px solid rgba(255, 255, 255, 0.2);
         border-radius: 12px; /* Smaller radius */
         font-size: 11px; /* Smaller font */
         color: white;
         cursor: pointer;
         transition: all 0.2s ease;
         display: inline-block; /* Remove flex for compactness */
       }

      .suggestion-chip svg {
        flex-shrink: 0;
        opacity: 0.8;
      }

      .suggestion-chip:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.4);
        transform: translateY(-2px);
      }

      .suggestion-chip:hover svg {
        opacity: 1;
      }

             /* Voice Capture - ULTRA COMPACT */
       .voice-capture {
         display: flex;
         flex-direction: column;
         align-items: center;
         justify-content: center;
         flex: 0 0 88px;
         gap: 6px;
       }

             .voice-button-container {
         position: relative;
         margin-bottom: 0;
       }

             .voice-button {
         width: 70px; /* Smaller button */
         height: 70px;
         border-radius: 50%;
         background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
         border: 2px solid rgba(255, 255, 255, 0.3);
         color: white;
         font-size: 24px; /* Smaller icon */
         cursor: pointer;
         box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
         transition: all 0.3s ease;
         display: flex;
         align-items: center;
         justify-content: center;
       }

      .voice-button:hover {
        transform: scale(1.05);
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.2));
      }

      .voice-button.recording {
        animation: voicePulse 1.5s infinite;
        background: linear-gradient(135deg, rgba(255, 100, 100, 0.8), rgba(255, 50, 50, 0.6));
      }

      @keyframes voicePulse {
        0% { transform: scale(1); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3); }
        50% { transform: scale(1.1); box-shadow: 0 12px 30px rgba(255, 50, 50, 0.6); }
        100% { transform: scale(1); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3); }
      }

      .voice-status {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.8);
        text-align: center;
      }

             .transcription {
         background: rgba(255, 255, 255, 0.1);
         border-radius: 12px;
         padding: 10px;
         height: 70px; /* FIXED HEIGHT - NO SCROLLING */
         overflow: hidden; /* NO SCROLLING */
         margin: 0;
         flex-shrink: 0;
       }

      .transcription-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 8px;
      }

      .transcription-text {
        color: white;
        line-height: 1.6;
        font-size: 14px;
      }

      .transcription-placeholder {
        color: rgba(255, 255, 255, 0.5);
        font-style: italic;
      }

             .wizard-progress {
         padding: 6px 0; /* tighter */
         text-align: center;
         flex-shrink: 0;
       }

      .progress-bar {
        height: 3px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 8px;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.6));
        width: 20%;
        transition: width 0.3s ease;
        border-radius: 2px;
      }

      .progress-text {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
      }

             .wizard-actions {
         padding: 10px 0; /* tighter */
         display: flex;
         gap: 12px;
         justify-content: space-between;
         margin: 0;
         flex-shrink: 0; /* Never shrink */
       }

      .wizard-btn {
        padding: 12px 20px;
        border-radius: 8px;
        border: none;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        flex: 1;
        max-width: 120px;
      }

      .wizard-btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .wizard-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .wizard-btn-primary {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.8));
        color: #6b46c1;
        font-weight: 600;
      }

      .wizard-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
      }

      /* Chat Styles */
      .chat-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 0 0 16px 0;
        max-height: 300px;
      }

      .emma-message {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
      }

      .user-message {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
        flex-direction: row-reverse;
      }

      .message-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        flex-shrink: 0;
      }

      .user-message .message-avatar {
        background: rgba(147, 112, 219, 0.8);
      }

      .message-content {
        flex: 1;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 12px;
      }

      .user-message .message-content {
        background: rgba(147, 112, 219, 0.3);
      }

      .message-content p {
        margin: 0;
        line-height: 1.4;
        font-size: 14px;
      }

      .message-suggestions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
        flex-wrap: wrap;
      }

      .suggestion-btn {
        background: rgba(147, 112, 219, 0.6);
        border: none;
        color: white;
        padding: 6px 12px;
        border-radius: 16px;
        cursor: pointer;
        font-size: 12px;
        transition: background-color 0.2s ease;
      }

      .suggestion-btn:hover {
        background: rgba(147, 112, 219, 0.8);
      }

      .chat-input-area {
        display: flex;
        gap: 8px;
        padding: 16px 0 0 0;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .chat-input {
        flex: 1;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
      }

      .chat-input::placeholder {
        color: rgba(255, 255, 255, 0.6);
      }

      .send-button {
        background: rgba(147, 112, 219, 0.8);
        border: none;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s ease;
      }

      .send-button:hover {
        background: rgba(147, 112, 219, 1);
      }

      .status-bar {
        display: flex;
        justify-content: space-between;
        padding: 12px 0 0 0;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        margin-top: 16px;
        font-size: 12px;
      }

      .status-item {
        display: flex;
        gap: 4px;
      }

      .status-label {
        opacity: 0.7;
      }

      .status-value {
        font-weight: 600;
      }

      /* Memories Tab Styles */
      .memories-overview {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .overview-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .stat-card {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        padding: 16px;
        text-align: center;
      }

      .stat-number {
        font-size: 24px;
        font-weight: 700;
        color: white;
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* Actions Styles */
      .quick-actions-grid, .actions-grid {
        display: grid;
        gap: 12px;
      }

      .quick-actions-grid {
        grid-template-columns: 1fr 1fr;
      }

      .actions-grid {
        grid-template-columns: 1fr 1fr;
      }

      .action-card {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 12px;
        color: white;
        text-align: left;
      }

      .action-card:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      .action-card.large {
        grid-column: span 2;
        padding: 20px;
      }

      .action-card svg {
        color: var(--emma-accent);
        flex-shrink: 0;
      }

      .action-text h4 {
        margin: 0 0 4px 0;
        font-size: 14px;
        font-weight: 600;
        color: white;
      }

      .action-text p {
        margin: 0;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
      }

      /* Footer Status */
      .status-bar {
        background: rgba(255, 255, 255, 0.05);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding: 12px 20px;
        margin: 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.7);
      }

      .status-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }
    `;
    document.head.appendChild(styles);
  }

  async initialize() {

    // Store global reference for onclick handlers
    window.assistantInstance = this;

    // Hide the base popup header since we're creating our own
    const baseHeader = this.element.querySelector('.popup-header');
    if (baseHeader) {
      baseHeader.style.display = 'none';
    }

    // Add direct event listener for settings button as backup
    setTimeout(() => {
      const settingsBtn = this.element.querySelector('#settings-btn');
      if (settingsBtn) {

        console.log('🔧 Settings button styles:', getComputedStyle(settingsBtn));

        // Add multiple event listeners for debugging
        settingsBtn.addEventListener('click', (e) => {

          e.preventDefault();
          e.stopPropagation();
          this.navigateToSettings();
        });

        settingsBtn.addEventListener('mousedown', (e) => {

        });

        settingsBtn.addEventListener('mouseup', (e) => {

        });

        // Button is confirmed working - remove debug styling
        // settingsBtn.style.border = '2px solid red';
        // settingsBtn.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';

      } else {

      }
    }, 100);

    // Ensure content area uses natural document flow (so height can be measured)
    const contentElement = this.element.querySelector('.popup-content');
    if (contentElement) {
      contentElement.style.position = 'static';
      contentElement.style.padding = '0';
      contentElement.style.margin = '0';
      contentElement.style.overflow = 'visible';
    }

    // Setup chat input
    const chatInput = this.element.querySelector('#chat-input');
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendCurrentMessage();
        }
      });
    }

    // Load status info
    await this.loadStatusInfo();

    // Initialize voice wizard
    this.initializeVoiceWizard();

    // Resize popup to fit content exactly (no internal scroll)
    setTimeout(() => { this.resizeToContent({ minHeight: 700 }); this.ensureOnScreen(); }, 0);
    // Safety re-clamp after render settles
    setTimeout(() => this.ensureOnScreen(), 50);

    // Load initial data for home dashboard
    await this.loadHomeDashboardData();
  }

  initializeVoiceWizard() {

    // Voice wizard state
    this.isRecording = false;
    this.recognition = null;
    this.currentStep = 1;
    this.totalSteps = 5;
    this.transcript = '';
    this.transcripts = []; // Store all transcripts from all questions

    this.questions = [
      "What's your favorite memory with Mom? Take your time, I'm listening.",
      "Tell me about a tradition she started. What made it special?",
      "What wisdom did she share that you still carry with you?",
      "Describe a moment when you saw her truly happy.",
      "What story about her do you want to make sure is never forgotten?"
    ];

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            this.transcript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        this.updateTranscription(this.transcript + interimTranscript);
      };

      this.recognition.onerror = (event) => {
        console.error('🎤 Speech recognition error:', event.error);
        this.stopRecording();
      };

      this.recognition.onend = () => {
        this.stopRecording();
      };

    } else {
      console.warn('🎤 Speech recognition not supported in this browser');
    }

    // Update initial progress
    this.updateProgress();
  }

  setupSafeHeight() {

    // Simple one-time height calculation after content loads
    setTimeout(() => {
      this.calculateOptimalHeight();
    }, 200);

    // Additional recalculation after a bit more time to catch any delayed rendering
    setTimeout(() => {

      this.calculateOptimalHeight();
    }, 500);
  }

  calculateOptimalHeight() {
    try {
      const assistantElement = this.element.querySelector('.assistant-experience');
      if (!assistantElement || !this.element) return;

      // Get the header height
      const header = assistantElement.querySelector('.custom-header');
      const headerHeight = header ? header.offsetHeight : 60;

      // Get the current active tab content
      const activeTab = assistantElement.querySelector('.tab-content.active');
      if (!activeTab) return;

      // Calculate content height - use total scrollHeight for accuracy
      let contentHeight = activeTab.scrollHeight;

      // Add extra padding to ensure nothing gets cut off
      contentHeight += 60; // Extra padding for safety

             // For voice wizard, ensure we account for all sections with extra padding
       if (activeTab.dataset.tab === 'home') {
         const sections = [
           '.emma-section',
           '.voice-capture',
           '.transcription',
           '.wizard-progress',
           '.wizard-actions'
         ];

         let sectionTotal = 0;
         sections.forEach(selector => {
           const section = activeTab.querySelector(selector);
           if (section) {
             sectionTotal += section.scrollHeight;

           }
         });

         // Add substantial extra space for voice wizard to prevent cutoff
         const voiceWizardPadding = 120; // Extra space for buttons
         contentHeight = Math.max(contentHeight, sectionTotal + voiceWizardPadding);

       }

       // Calculate optimal height with generous minimums for voice wizard
       const minHeight = activeTab.dataset.tab === 'home' ? 550 : 400; // Voice wizard needs more space
       const maxHeight = window.innerHeight - 60; // More conservative margin
       const optimalHeight = Math.min(
         Math.max(headerHeight + contentHeight, minHeight),
         maxHeight
       );

      // Apply height to parent container (which positions relative to orb)
      if (this.element) {
        const currentTop = parseInt(this.element.style.top) || 0;
        const currentHeight = parseInt(this.element.style.height) || 400;
        const heightDifference = optimalHeight - currentHeight;
        const newTop = Math.max(20, currentTop - heightDifference);

        this.element.style.height = optimalHeight + 'px';
        this.element.style.top = newTop + 'px';

      }

    } catch (error) {
      console.error('📏 Error in safe height calculation:', error);
    }
  }

  setupDynamicHeight() {
    console.log('📏 AssistantExperience: Setting up dynamic height (DISABLED)');

    // Function to calculate and apply optimal height
    const adjustHeight = () => {
      try {
        const assistantElement = this.element.querySelector('.assistant-experience');
        if (!assistantElement) return;

        // Get the active tab content
        const activeTabContent = this.element.querySelector('.tab-content.active');
        if (!activeTabContent) return;

        // Reset any previous height constraints
        assistantElement.style.height = 'auto';

        // Calculate content height
        const header = this.element.querySelector('.custom-header');
        const headerHeight = header ? header.offsetHeight : 0;

        // Get content height by measuring the actual content
        let contentHeight = 0;

        if (activeTabContent.dataset.tab === 'home') {
          // Voice wizard content
          const wizardContainer = activeTabContent.querySelector('.voice-wizard-container');
          if (wizardContainer) {
            const emmaSection = wizardContainer.querySelector('.emma-section');
            const voiceCapture = wizardContainer.querySelector('.voice-capture');
            const transcription = wizardContainer.querySelector('.transcription');
            const progress = wizardContainer.querySelector('.wizard-progress');
            const actions = wizardContainer.querySelector('.wizard-actions');

            contentHeight = (emmaSection?.offsetHeight || 0) +
                          (voiceCapture?.offsetHeight || 0) +
                          (transcription?.offsetHeight || 0) +
                          (progress?.offsetHeight || 0) +
                          (actions?.offsetHeight || 0) +
                          40; // padding
          }
        } else {
          // Other tabs - measure their content
          contentHeight = activeTabContent.scrollHeight;
        }

        // Calculate total height needed
        const totalHeight = headerHeight + contentHeight;

        // Apply constraints
        const minHeight = 400;
        const maxHeight = window.innerHeight - 40; // Leave 40px margin
        const optimalHeight = Math.max(minHeight, Math.min(totalHeight, maxHeight));

        // Apply the height while maintaining orb-anchored positioning
        assistantElement.style.height = optimalHeight + 'px';

        // Update the parent popup container height while preserving its fixed positioning
        if (this.element) {
          // Keep the existing position but update height
          const currentTop = parseInt(this.element.style.top) || 0;
          const currentHeight = parseInt(this.element.style.height) || 400;

          // Calculate new top position to maintain bottom anchor
          // (grow upward from the bottom edge)
          const heightDifference = optimalHeight - currentHeight;
          const newTop = currentTop - heightDifference;

          // Apply the new positioning
          this.element.style.height = optimalHeight + 'px';
          this.element.style.top = Math.max(20, newTop) + 'px'; // Ensure it doesn't go off-screen
        }

      } catch (error) {
        console.error('📏 Error adjusting height:', error);
      }
    };

    // Initial adjustment
    setTimeout(() => adjustHeight(), 100);

    // Store the function for later use
    this.adjustHeight = adjustHeight;

    // Set up mutation observer to watch for content changes
    if (window.MutationObserver) {
      this.heightObserver = new MutationObserver(() => {
        setTimeout(() => adjustHeight(), 50);
      });

      const assistantElement = this.element.querySelector('.assistant-experience');
      if (assistantElement) {
        this.heightObserver.observe(assistantElement, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'style']
        });
      }
    }

    // Adjust on window resize
    this.resizeHandler = () => {
      setTimeout(() => adjustHeight(), 100);
    };
    window.addEventListener('resize', this.resizeHandler);

    // DISABLED: Dynamic height adjustments that were causing loops
    // this.originalSwitchTab = this.switchTab;
    // this.switchTab = (tabName) => {
    //   this.originalSwitchTab.call(this, tabName);
    //   setTimeout(() => adjustHeight(), 100);
    // };
  }

  async loadStatusInfo() {
    try {
      // TODO: Load actual memory count and activity
      const memoryCountEl = this.element.querySelector('#memory-count');
      const lastActivityEl = this.element.querySelector('#last-activity');

      if (memoryCountEl) memoryCountEl.textContent = '157';
      if (lastActivityEl) lastActivityEl.textContent = '2 hours ago';
    } catch (error) {
      console.error('💜 AssistantExperience: Failed to load status:', error);
    }
  }

  sendCurrentMessage() {
    const input = this.element.querySelector('#chat-input');
    if (input && input.value.trim()) {
      this.sendMessage(input.value.trim());
      input.value = '';
    }
  }

  sendMessage(message) {

    // Add user message to chat
    this.addMessageToChat(message, 'user');

    // Simulate Emma response
    setTimeout(() => {
      this.respondToMessage(message);
    }, 1000);
  }

  addMessageToChat(message, sender = 'emma') {
    const messagesContainer = this.element.querySelector('#chat-messages');
    if (!messagesContainer) return;

    const messageEl = document.createElement('div');
    messageEl.className = sender === 'user' ? 'user-message' : 'emma-message';

    const avatar = sender === 'user' ? '👤' : '👩‍💼';

    messageEl.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div class="message-content">
        <p>${message}</p>
      </div>
    `;

    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  respondToMessage(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    let response = "I understand you'd like help with that. Let me assist you!";

    if (lowerMessage.includes('memory') || lowerMessage.includes('remember')) {
      response = "I can help you with your memories! Would you like me to show you recent memories or help you create a new one?";
    } else if (lowerMessage.includes('photo') || lowerMessage.includes('picture')) {
      response = "I'd be happy to help you with photos! I can show you recent photos or help you organize them by date or people.";
    } else if (lowerMessage.includes('yesterday') || lowerMessage.includes('today')) {
      response = "Let me check your recent activities... I can see you captured 3 memories yesterday and had 2 conversations with me.";
    } else if (lowerMessage.includes('organize')) {
      response = "Great idea! I can help organize your memories by date, people, or topics. Which would you prefer?";
    }

    this.addMessageToChat(response, 'emma');
  }

  captureMemory() {

    this.showNotification('Memory capture feature coming soon!');
  }

  searchMemories() {

    this.sendMessage('Help me search my memories');
  }

  exportData() {

    this.showNotification('Export feature coming soon!');
  }

  openSettings() {

    this.showNotification('Opening settings...');
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(147, 112, 219, 0.9);
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

  // DYNAMIC HEIGHT CALCULATION FOR EACH TAB
  calculateAndSetTabHeights() {

    const popup = document.querySelector('.assistant-experience');
    const header = document.querySelector('.custom-header');
    const tabContainer = document.querySelector('.tab-content-container');

    if (!popup || !header || !tabContainer) {

      return;
    }

    // Safety check - ensure popup is visible
    if (popup.offsetHeight === 0 || !popup.parentElement) {

      return;
    }

    // Get all tabs
    const tabs = ['home', 'chat', 'memories', 'actions'];
    const tabHeights = {};

    tabs.forEach(tabName => {
      const tabContent = document.querySelector(`[data-tab="${tabName}"]`);
      if (tabContent) {
        // Temporarily show tab to measure
        const wasActive = tabContent.classList.contains('active');
        tabContent.classList.add('active');
        tabContent.style.opacity = '1';
        tabContent.style.pointerEvents = 'auto';

        // Calculate total content height
        const contentHeight = this.measureTabContent(tabContent, tabName);
        tabHeights[tabName] = contentHeight;

        // Restore original state
        if (!wasActive) {
          tabContent.classList.remove('active');
          tabContent.style.opacity = '0';
          tabContent.style.pointerEvents = 'none';
        }
      }
    });

    // Set height for current active tab
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab) {
      const activeTabName = activeTab.getAttribute('data-tab');
      const requiredHeight = Math.max(tabHeights[activeTabName], 400); // Minimum 400px
      this.setPopupHeight(requiredHeight);

    }

    // Store heights for tab switching
    this.tabHeights = tabHeights;
  }

  measureTabContent(tabElement, tabName) {

    // Base measurements
    const header = document.querySelector('.custom-header');
    const headerHeight = header ? header.offsetHeight : 60;
    const padding = 40; // Container padding

    if (tabName === 'home') {
      // Measure voice wizard sections
      const question = tabElement.querySelector('.emma-section');
      const voiceCapture = tabElement.querySelector('.voice-capture');
      const transcription = tabElement.querySelector('.transcription');
      const progress = tabElement.querySelector('.wizard-progress');
      const actions = tabElement.querySelector('.wizard-actions');

      let totalHeight = headerHeight + padding;

      if (question) totalHeight += question.offsetHeight;
      if (voiceCapture) totalHeight += voiceCapture.offsetHeight;
      if (transcription) totalHeight += transcription.offsetHeight;
      if (progress) totalHeight += progress.offsetHeight;
      if (actions) totalHeight += actions.offsetHeight;

      // Add gaps (20px between sections, 5 sections = 4 gaps)
      totalHeight += (4 * 20);

      return totalHeight;
    }

    // For other tabs, measure all children
    let contentHeight = headerHeight + padding;
    const children = Array.from(tabElement.children);
    children.forEach(child => {
      contentHeight += child.offsetHeight;
    });

    return contentHeight + 60; // Extra buffer
  }

  setPopupHeight(height) {
    const popup = document.querySelector('.assistant-experience');
    const container = popup?.parentElement;

    if (popup && container) {

      // Set the popup height
      popup.style.height = `${height}px`;
      popup.style.minHeight = `${height}px`;

      // Ensure popup stays visible - don't change container positioning
      // The popup should already be positioned correctly by the orb system
      console.log(`📏 SET POPUP HEIGHT: ${height}px (keeping existing position)`);

    }
  }

  // Navigation Methods
  navigateToWelcome() {

    this.close();
    setTimeout(() => {
      window.location.href = 'welcome.html';
    }, 300);
  }

  navigateToSettings() {

    // NEW THEORY: Maybe this.close() is breaking the navigation context

    // Try navigation BEFORE closing

    window.location.href = 'options.html';

    // Close after a delay
    setTimeout(() => {

      this.close();
    }, 100);
  }

  navigateHome() {

    // Navigate to the new dashboard

    window.location.href = 'dashboard-new.html';

    // Close after a delay
    setTimeout(() => {

      this.close();
    }, 100);
  }

  // Test function for direct calling
  testSettingsNavigation() {

    // Test 1: Try navigating to welcome.html (should work)

    window.location.href = 'welcome.html';

    setTimeout(() => {

      // Test 2: Try navigating to options.html from welcome

      window.location.href = 'options.html';
    }, 1000);
  }

  async openVaultDialog() {

    try {
      // First check vault status
      let vaultStatus;
      if (window.emma?.vault?.status) {
        vaultStatus = await window.emma.vault.status();
      } else if (window.emmaAPI?.vault?.status) {
        vaultStatus = await window.emmaAPI.vault.status();
      }

      // If vault is not initialized, show setup wizard
      if (!vaultStatus?.initialized) {
        this.showVaultSetupDialog();
        return;
      }

      // If vault is locked, show unlock dialog
      if (!vaultStatus?.isUnlocked) {
        this.showVaultUnlockDialog();
        return;
      }

      // If vault is unlocked, show lock option
      this.showVaultLockDialog();

    } catch (error) {
      console.error('❌ AssistantExperience: Failed to access vault', error);
      this.showVaultNotification('Failed to access vault: ' + error.message);
    }
  }

  showVaultSetupDialog() {

    // Use the existing openVaultSetupWizard function if available
    if (typeof openVaultSetupWizard === 'function') {
      openVaultSetupWizard({
        onSuccess: (result) => {

          this.showVaultNotification('Vault setup completed successfully!');
        }
      });
    } else {
      // Fallback: redirect to memories page which has the setup wizard
      this.showVaultNotification('Redirecting to vault setup...');
      setTimeout(() => {
        window.location.href = 'memories.html';
      }, 1000);
    }
  }

  async showVaultUnlockDialog() {

    try {
      const passphrase = await this.showPasswordModal('Unlock Vault');

      this.showVaultNotification('Unlocking vault...');

      let result;
      if (window.emma?.vault) {
        const st = await window.emma.vault.status();
        result = await window.emma.vault.unlock(st?.vaultId ? { passphrase, vaultId: st.vaultId } : { passphrase });
      } else if (window.emmaAPI?.vault?.unlock) {
        result = await window.emmaAPI.vault.unlock({ passphrase });
      } else {
        this.showVaultNotification('Vault unlock not available in current mode');
        return;
      }

      if (result && result.success) {
        this.showVaultNotification('Vault unlocked successfully! 🔓');
      } else {
        this.showVaultNotification(`Failed to unlock vault: ${result?.error || 'Unknown error'}`);
      }
    } catch (error) {
      if (error.message !== 'User cancelled') {
        console.error('❌ AssistantExperience: Unlock vault error:', error);
        this.showVaultNotification(`Unlock error: ${error.message}`);
      }
    }
  }

  async showVaultLockDialog() {

    const confirmed = confirm('Are you sure you want to lock the vault? You\'ll need to enter your passphrase to unlock it again.');
    if (!confirmed) return;

    try {
      let result;
      if (window.emma?.vault?.lock) {
        result = await window.emma.vault.lock();
      } else if (window.emmaAPI?.vault?.lock) {
        result = await window.emmaAPI.vault.lock();
      } else {
        this.showVaultNotification('Vault lock not available in current mode');
        return;
      }

      if (result && result.success) {
        this.showVaultNotification('Vault locked successfully 🔒');
      } else {
        this.showVaultNotification(`Failed to lock vault: ${result?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ AssistantExperience: Lock vault error:', error);
      this.showVaultNotification(`Lock error: ${error.message}`);
    }
  }

  showPasswordModal(title = 'Enter Vault Code') {
    return new Promise((resolve, reject) => {
      // Create modal HTML with Emma branding and ultra-high z-index
      const modalHTML = `
        <div class="vault-password-modal" style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2147483647;
        ">
          <div class="vault-password-content" style="
            background: linear-gradient(135deg, rgba(147, 112, 219, 0.95), rgba(123, 104, 238, 0.95));
            border-radius: 16px;
            padding: 32px;
            width: 90%;
            max-width: 420px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(20px);
          ">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
              <div style="
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
              ">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,7.45 16,8.26V11C16,14.88 14.12,18.14 12,19.92C9.88,18.14 8,14.88 8,11V8.26C9.2,7.45 10.6,7 12,7Z"/>
                </svg>
              </div>
              <div>
                <h3 style="margin: 0; color: white; font-size: 18px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${title}</h3>
                <p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 14px;">Enter your vault passphrase to continue</p>
              </div>
            </div>
            <input type="password" placeholder="Enter passphrase..." style="
              width: 100%;
              padding: 16px;
              border: 2px solid rgba(255, 255, 255, 0.2);
              border-radius: 12px;
              font-size: 16px;
              margin-bottom: 24px;
              box-sizing: border-box;
              background: rgba(255, 255, 255, 0.1);
              color: white;
              backdrop-filter: blur(10px);
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            ">
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
              <button class="cancel-btn" style="
                padding: 12px 24px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                background: rgba(255, 255, 255, 0.1);
                color: white;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              ">Cancel</button>
              <button class="confirm-btn" style="
                padding: 12px 24px;
                border: none;
                background: rgba(255, 255, 255, 0.9);
                color: #6b46c1;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.2s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              ">Unlock Vault</button>
            </div>
          </div>
        </div>
      `;

      const modalElement = document.createElement('div');
      modalElement.innerHTML = modalHTML;
      const modal = modalElement.firstElementChild;
      document.body.appendChild(modal);

      const input = modal.querySelector('input[type="password"]');
      const cancelBtn = modal.querySelector('.cancel-btn');
      const confirmBtn = modal.querySelector('.confirm-btn');

      // Focus the input
      setTimeout(() => input.focus(), 100);

      const cleanup = () => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      };

      const handleSubmit = () => {
        const value = input.value.trim();
        if (value) {
          cleanup();
          resolve(value);
        }
      };

      const handleCancel = () => {
        cleanup();
        reject(new Error('User cancelled'));
      };

      // Add hover effects
      cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        cancelBtn.style.borderColor = 'rgba(255, 255, 255, 0.5)';
      });
      cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        cancelBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      });

      confirmBtn.addEventListener('mouseenter', () => {
        confirmBtn.style.background = 'white';
        confirmBtn.style.transform = 'translateY(-1px)';
      });
      confirmBtn.addEventListener('mouseleave', () => {
        confirmBtn.style.background = 'rgba(255, 255, 255, 0.9)';
        confirmBtn.style.transform = 'translateY(0)';
      });

      // Event listeners
      cancelBtn.addEventListener('click', handleCancel);
      confirmBtn.addEventListener('click', handleSubmit);
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSubmit();
        if (e.key === 'Escape') handleCancel();
      });

      // Click outside to cancel
      modal.addEventListener('click', (e) => {
        if (e.target === modal) handleCancel();
      });
    });
  }

     showVaultNotification(message) {
     // TEMPORARY DEBUG: Also show browser alert for visibility testing

     // Create a temporary notification with Emma branding
     const notification = document.createElement('div');

    // Determine notification type and icon
    let icon = '🔐';
    let bgColor = 'linear-gradient(135deg, rgba(147, 112, 219, 0.95), rgba(123, 104, 238, 0.95))';

    if (message.includes('successfully') || message.includes('completed')) {
      icon = '✅';
      bgColor = 'linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(22, 163, 74, 0.95))';
    } else if (message.includes('Failed') || message.includes('error')) {
      icon = '❌';
      bgColor = 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95))';
    } else if (message.includes('Redirecting') || message.includes('Unlocking')) {
      icon = '🔄';
    }

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 16px;">${icon}</span>
        <span>${message}</span>
      </div>
    `;

         notification.style.cssText = `
       position: fixed !important;
       top: 24px !important;
       right: 24px !important;
       background: ${bgColor} !important;
       color: white !important;
       padding: 16px 20px !important;
       border-radius: 12px !important;
       font-size: 14px !important;
       font-weight: 500 !important;
       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
       box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3) !important;
       border: 1px solid rgba(255, 255, 255, 0.2) !important;
       backdrop-filter: blur(20px) !important;
       z-index: 999999999 !important;
       animation: slideInOut 4s ease-in-out !important;
       max-width: 350px !important;
       pointer-events: none !important;
     `;

    // Add slideInOut animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInOut {
        0% { opacity: 0; transform: translateX(100%) translateY(-10px); }
        10%, 85% { opacity: 1; transform: translateX(0) translateY(0); }
        100% { opacity: 0; transform: translateX(100%) translateY(-10px); }
      }
    `;
    document.head.appendChild(style);

         // Force append to the highest level DOM to escape any stacking contexts
     const topLevelContainer = document.documentElement || document.body;
     topLevelContainer.appendChild(notification);

     // Force the notification to the front immediately
     notification.style.zIndex = '2147483647';

    // Remove after animation
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    }, 4000);
  }

  navigateToMemoryGallery() {

    // Simple direct navigation like the dashboard
    window.location.href = 'memory-gallery-new.html';
  }

  createNewMemory() {

    this.showCreateMemoryModal();
  }

  showCreateMemoryModal() {
    // Create and show the Create Memory modal
    const modalHTML = `
      <div class="create-memory-modal" style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(12px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483649;
      ">
        <div class="create-memory-content" style="
          background: linear-gradient(135deg, rgba(138, 43, 226, 0.95), rgba(75, 0, 130, 0.95));
          border-radius: 20px;
          padding: 40px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(20px);
          color: white;
        ">
          <div style="margin-bottom: 24px; text-align: center;">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" style="margin-bottom: 16px;">
              <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
            </svg>
          </div>

          <h2 style="
            margin: 0 0 24px 0;
            font-size: 28px;
            font-weight: 700;
            background: linear-gradient(45deg, #ffffff, #e6e6fa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            text-align: center;
          ">Create New Memory</h2>

          <div style="margin-bottom: 20px;">
            <label style="
              display: block;
              margin-bottom: 8px;
              font-size: 14px;
              font-weight: 600;
              color: rgba(255, 255, 255, 0.9);
            ">Memory Title</label>
            <input type="text" id="memory-title-input" placeholder="What would you like to remember?" style="
              width: 100%;
              padding: 12px 16px;
              border: 2px solid rgba(255, 255, 255, 0.2);
              border-radius: 10px;
              background: rgba(255, 255, 255, 0.1);
              color: white;
              font-size: 16px;
              backdrop-filter: blur(10px);
              outline: none;
              transition: all 0.2s ease;
            ">
          </div>

          <div style="margin-bottom: 32px;">
            <label style="
              display: block;
              margin-bottom: 8px;
              font-size: 14px;
              font-weight: 600;
              color: rgba(255, 255, 255, 0.9);
            ">Description (Optional)</label>
            <textarea id="memory-description-input" placeholder="Add details about this memory..." rows="4" style="
              width: 100%;
              padding: 12px 16px;
              border: 2px solid rgba(255, 255, 255, 0.2);
              border-radius: 10px;
              background: rgba(255, 255, 255, 0.1);
              color: white;
              font-size: 14px;
              backdrop-filter: blur(10px);
              outline: none;
              transition: all 0.2s ease;
              resize: vertical;
              min-height: 80px;
            "></textarea>
          </div>

          <div style="
            display: flex;
            gap: 12px;
            justify-content: center;
          ">
            <button class="create-memory-btn" style="
              padding: 14px 28px;
              border: none;
              background: rgba(255, 255, 255, 0.9);
              color: #6b46c1;
              border-radius: 10px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              transition: all 0.2s ease;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            ">Create Memory</button>
            <button class="cancel-create-btn" style="
              padding: 14px 28px;
              border: 2px solid rgba(255, 255, 255, 0.3);
              background: rgba(255, 255, 255, 0.1);
              color: white;
              border-radius: 10px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
              transition: all 0.2s ease;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            ">Cancel</button>
          </div>
        </div>
      </div>
    `;

    // Create modal element
    const modalElement = document.createElement('div');
    modalElement.innerHTML = modalHTML;
    const modal = modalElement.firstElementChild;
    document.body.appendChild(modal);

    // Focus on title input
    setTimeout(() => {
      const titleInput = modal.querySelector('#memory-title-input');
      titleInput.focus();
    }, 100);

    // Add event listeners
    const createBtn = modal.querySelector('.create-memory-btn');
    const cancelBtn = modal.querySelector('.cancel-create-btn');
    const titleInput = modal.querySelector('#memory-title-input');
    const descriptionInput = modal.querySelector('#memory-description-input');

    createBtn.addEventListener('click', async () => {
      const title = titleInput.value.trim();
      if (!title) {
        titleInput.style.borderColor = 'rgba(255, 99, 71, 0.8)';
        return;
      }

      const description = descriptionInput.value.trim();

      try {
        // Create the memory using Emma's API
        const memoryData = {
          title: title,
          content: description,
          date: new Date().toISOString(),
          type: 'manual',
          tags: []
        };

        if (window.emmaAPI && window.emmaAPI.memories && window.emmaAPI.memories.save) {
          await window.emmaAPI.memories.save(memoryData);
          this.showVaultNotification('✅ Memory created successfully!');
        } else {

          this.showVaultNotification('📝 Memory created (demo mode)');
        }

        modal.remove();

        // Navigate to memory gallery to see the new memory
        setTimeout(() => {
          this.navigateToMemoryGallery();
        }, 1000);

      } catch (error) {
        console.error('Failed to create memory:', error);
        this.showVaultNotification('❌ Failed to create memory');
      }
    });

    cancelBtn.addEventListener('click', () => {
      modal.remove();
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Handle Enter key in title input
    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createBtn.click();
      }
    });

    // Reset border color on input
    titleInput.addEventListener('input', () => {
      titleInput.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    });

    // Add hover effects
    createBtn.addEventListener('mouseenter', () => {
      createBtn.style.background = 'rgba(255, 255, 255, 1)';
      createBtn.style.transform = 'translateY(-1px)';
    });

    createBtn.addEventListener('mouseleave', () => {
      createBtn.style.background = 'rgba(255, 255, 255, 0.9)';
      createBtn.style.transform = 'translateY(0)';
    });

    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.background = 'rgba(255, 255, 255, 0.2)';
      cancelBtn.style.borderColor = 'rgba(255, 255, 255, 0.5)';
    });

    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.background = 'rgba(255, 255, 255, 0.1)';
      cancelBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    });
  }

  // Tab Management
  showHomeTab() {
    this.switchTab('home');
  }

  showRememberDialog() {

    // Create and show the Remember dialog
    const modalHTML = `
      <div class="remember-modal" style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(12px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483648;
      ">
        <div class="remember-content" style="
          background: linear-gradient(135deg, rgba(138, 43, 226, 0.95), rgba(75, 0, 130, 0.95));
          border-radius: 20px;
          padding: 40px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(20px);
          text-align: center;
          color: white;
        ">
          <div style="margin-bottom: 24px;">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" style="margin-bottom: 16px;">
              <path d="M9.5,13A1.5,1.5 0 0,0 8,14.5A1.5,1.5 0 0,0 9.5,16A1.5,1.5 0 0,0 11,14.5A1.5,1.5 0 0,0 9.5,13M14.5,13A1.5,1.5 0 0,0 13,14.5A1.5,1.5 0 0,0 14.5,16A1.5,1.5 0 0,0 16,14.5A1.5,1.5 0 0,0 14.5,13M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M21,9V7H15L13.5,7.5C13.1,7.4 12.6,7.5 12.1,7.8L7,10.24V12L11.5,9.5L12.5,9.5H21M7,18A4,4 0 0,0 11,22A4,4 0 0,0 15,18A4,4 0 0,0 11,14A4,4 0 0,0 7,18Z"/>
            </svg>
          </div>

          <h2 style="
            margin: 0 0 16px 0;
            font-size: 28px;
            font-weight: 700;
            background: linear-gradient(45deg, #ffffff, #e6e6fa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          ">Emma's Memory</h2>

          <p style="
            margin: 0 0 24px 0;
            font-size: 16px;
            line-height: 1.6;
            opacity: 0.9;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          ">
            I'm here to help you remember. Wherever you are, whatever you're doing, I can capture moments, recall details, and connect memories across time.
          </p>

          <div style="
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 20px;
            margin: 24px 0;
            text-align: left;
          ">
            <h3 style="
              margin: 0 0 12px 0;
              font-size: 18px;
              font-weight: 600;
              color: #ffffff;
            ">Core Features:</h3>
            <ul style="
              margin: 0;
              padding: 0;
              list-style: none;
              font-size: 14px;
              line-height: 1.8;
            ">
              <li style="margin-bottom: 8px;">🎯 <strong>Context Awareness</strong> - I know where you are and what you're viewing</li>
              <li style="margin-bottom: 8px;">💡 <strong>Smart Recall</strong> - Ask me "What was that thing about..." and I'll find it</li>
              <li style="margin-bottom: 8px;">🔗 <strong>Memory Connections</strong> - I link related thoughts and experiences</li>
              <li style="margin-bottom: 8px;">⏰ <strong>Temporal Awareness</strong> - I remember when things happened</li>
              <li>🎤 <strong>Voice Activation</strong> - Just say "Emma, remember this" anywhere</li>
            </ul>
          </div>

          <div style="
            display: flex;
            gap: 12px;
            justify-content: center;
            margin-top: 32px;
          ">
            <button class="try-remember-btn" style="
              padding: 14px 28px;
              border: none;
              background: rgba(255, 255, 255, 0.9);
              color: #6b46c1;
              border-radius: 10px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              transition: all 0.2s ease;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            ">Try It Now</button>
            <button class="close-remember-btn" style="
              padding: 14px 28px;
              border: 2px solid rgba(255, 255, 255, 0.3);
              background: rgba(255, 255, 255, 0.1);
              color: white;
              border-radius: 10px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
              transition: all 0.2s ease;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            ">Got It</button>
          </div>
        </div>
      </div>
    `;

    // Create modal element
    const modalElement = document.createElement('div');
    modalElement.innerHTML = modalHTML;
    const modal = modalElement.firstElementChild;
    document.body.appendChild(modal);

    // Add event listeners
    const tryBtn = modal.querySelector('.try-remember-btn');
    const closeBtn = modal.querySelector('.close-remember-btn');

    tryBtn.addEventListener('click', () => {
      modal.remove();
      // TODO: Implement "Try It Now" functionality
      this.showVoiceActivationDemo();
    });

    closeBtn.addEventListener('click', () => {
      modal.remove();
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Add hover effects
    tryBtn.addEventListener('mouseenter', () => {
      tryBtn.style.background = 'rgba(255, 255, 255, 1)';
      tryBtn.style.transform = 'translateY(-1px)';
    });

    tryBtn.addEventListener('mouseleave', () => {
      tryBtn.style.background = 'rgba(255, 255, 255, 0.9)';
      tryBtn.style.transform = 'translateY(0)';
    });

    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
      closeBtn.style.borderColor = 'rgba(255, 255, 255, 0.5)';
    });

    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
      closeBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    });
  }

  showVoiceActivationDemo() {
    // TODO: Implement voice activation demo

    // For now, just show a simple notification
    this.showVaultNotification('🎤 Voice activation coming soon! Say "Emma, remember this" to capture moments.');
  }

  showChatTab() {
    this.switchTab('chat');
  }

  showMemoriesTab() {
    this.switchTab('memories');
  }

  showActionsTab() {
    this.switchTab('actions');
  }

  switchTab(tabName) {

    // Update nav buttons
    const navBtns = this.element.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update tab content
    const tabContents = this.element.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
      if (content.dataset.tab === tabName) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });

    // Resize to natural content height on tab switch
    setTimeout(() => this.resizeToContent({ minHeight: 520 }), 0);

    // Update memory count and last activity when switching to memories tab
    if (tabName === 'memories') {
      this.updateMemoriesStats();
    }
  }

  updateMemoriesStats() {
    const memoriesCount = this.element.querySelector('#memories-count');
    const lastActivity = this.element.querySelector('#last-activity');

    if (memoriesCount) memoriesCount.textContent = '157';
    if (lastActivity) lastActivity.textContent = '2 hours ago';
  }

  async loadHomeDashboardData() {
    try {

      // Try to get actual memory count
      let memoryCount = '--';
      let lastActivity = '--';

      if (window.emmaAPI?.vault?.getAll) {
        try {
          const memories = await window.emmaAPI.vault.getAll();
          memoryCount = Array.isArray(memories) ? memories.length.toString() : '--';

          // Find the most recent memory for last activity
          if (memories && memories.length > 0) {
            const sortedMemories = memories.sort((a, b) => new Date(b.timestamp || b.created_at || 0) - new Date(a.timestamp || a.created_at || 0));
            if (sortedMemories[0]) {
              const lastMemory = sortedMemories[0];
              const lastDate = new Date(lastMemory.timestamp || lastMemory.created_at);
              if (!isNaN(lastDate.getTime())) {
                const now = new Date();
                const diffMs = now - lastDate;
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

                if (diffHours < 1) {
                  lastActivity = 'Just now';
                } else if (diffHours < 24) {
                  lastActivity = `${diffHours}h ago`;
                } else {
                  const diffDays = Math.floor(diffHours / 24);
                  lastActivity = `${diffDays}d ago`;
                }
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ AssistantExperience: Could not load vault memories, using defaults', error);
        }
      }

      // Update the stats in the home dashboard
      const totalMemoriesEl = this.element.querySelector('#total-memories');
      const lastActivityEl = this.element.querySelector('#last-activity');

      if (totalMemoriesEl) totalMemoriesEl.textContent = memoryCount;
      if (lastActivityEl) lastActivityEl.textContent = lastActivity;

      // Load mini galleries
      await this.loadMiniGalleries();

    } catch (error) {
      console.error('❌ AssistantExperience: Failed to load home dashboard data', error);

      // Load sample mini galleries even on error
      await this.loadMiniGalleries();
    }
  }

  async loadMiniGalleries() {
    try {

      // Try to get actual memories
      let memories = [];

      if (window.emmaAPI?.vault?.getAll) {
        try {
          memories = await window.emmaAPI.vault.getAll();

        } catch (error) {

        }
      }

      // Use sample data if no real memories
      const sampleMemories = [
        {
          id: '1',
          title: 'Sunday Family Dinner',
          date: 'Aug 9, 2024',
          image: null,
          emoji: '❤️'
        },
        {
          id: '2',
          title: 'Morning Garden Walk',
          date: 'Aug 11, 2024',
          image: null,
          emoji: '🌸'
        },
        {
          id: '3',
          title: 'Sarah\'s Birthday Celebration',
          date: 'Aug 4, 2024',
          image: null,
          emoji: '🎂'
        },
        {
          id: '4',
          title: 'Coffee with Emma',
          date: 'Aug 7, 2024',
          image: null,
          emoji: '☕'
        }
      ];

      const memoriesToShow = memories?.length ? memories.slice(-4).reverse() : sampleMemories;

      // Store current memories for modal access
      this.currentMemories = memoriesToShow;

      // Render both mini galleries
      this.renderMiniGallery('mini-gallery-grid', memoriesToShow);
      this.renderMiniGallery('memories-mini-gallery-grid', memoriesToShow);

    } catch (error) {
      console.error('❌ Failed to load mini galleries:', error);
    }
  }

  renderMiniGallery(containerId, memories) {
    const container = this.element.querySelector(`#${containerId}`);
    if (!container) {
      console.warn(`⚠️ Mini gallery container not found: ${containerId}`);
      return;
    }

    if (!memories || memories.length === 0) {
      container.innerHTML = `
        <div class="mini-memory-placeholder">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
            <path d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z"/>
          </svg>
          <p>No memories yet</p>
          <p>Create your first memory!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = memories.map(memory => `
      <div class="mini-memory-card" data-memory-id="${memory.id}">
        <div class="mini-memory-image">
          ${memory.image ?
            `<img src="${memory.image}" alt="${memory.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
             <div style="display:none; width:100%; height:100%; align-items:center; justify-content:center; font-size:24px;">${memory.emoji || '💝'}</div>` :
            `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:24px;">${memory.emoji || '💝'}</div>`
          }
        </div>
        <h4 class="mini-memory-title">${memory.title || 'Untitled Memory'}</h4>
        <p class="mini-memory-date">${memory.date || this.formatDate(memory.createdAt || memory.timestamp)}</p>
      </div>
    `).join('');

    // Add click event listeners
    const cards = container.querySelectorAll('.mini-memory-card');
    cards.forEach(card => {
      card.addEventListener('click', (e) => {

        const memoryId = card.dataset.memoryId;

        if (window.assistantInstance) {

          window.assistantInstance.openMemoryDetail(memoryId);
        } else {
          console.error('❌ No assistant instance found');
        }
      });
    });
  }

  async openMemoryDetail(memoryId) {

    // Find the memory in our loaded data
    let memory = null;
    try {
      // Try to get the actual memory from our current data or API
      const memories = this.currentMemories || [];
      memory = memories.find(m => m.id === memoryId);

      if (!memory) {
        // Fallback: try to load from API
        if (window.emmaAPI?.vault?.getAll) {
          const allMemories = await window.emmaAPI.vault.getAll();
          memory = allMemories?.find(m => m.id === memoryId);
        }
      }

      if (!memory) {
        console.warn('Memory not found, using sample data');
        // Fallback to sample memory
        memory = {
          id: memoryId,
          title: 'Memory Details',
          content: 'This memory is loading...',
          date: new Date().toLocaleDateString(),
          emoji: '💝'
        };
      }
    } catch (error) {
      console.error('Error loading memory:', error);
      return;
    }

    // Close the assistant popup first
    this.close();

    // Wait a moment for popup to close, then open memory detail
    setTimeout(() => {
      this.showMemoryDetailModal(memory);
    }, 100);
  }

  showMemoryDetailModal(memory) {

    // Create modal overlay
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      background: rgba(0, 0, 0, 0.8) !important;
      backdrop-filter: blur(8px) !important;
      z-index: 2147483650 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 20px !important;
      animation: fadeIn 0.3s ease !important;
    `;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: linear-gradient(135deg, rgba(147, 112, 219, 0.95), rgba(123, 104, 238, 0.95)) !important;
      border-radius: 20px !important;
      padding: 30px !important;
      max-width: 500px !important;
      width: 100% !important;
      max-height: 80vh !important;
      overflow-y: auto !important;
      backdrop-filter: blur(20px) !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3) !important;
      color: white !important;
    `;

    modalContent.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 24px; font-weight: 600;">${memory.title || 'Memory Details'}</h2>
        <button id="close-memory-modal" style="background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 18px;">×</button>
      </div>

      <div style="margin-bottom: 15px;">
        <div style="width: 100%; height: 200px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05)); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 48px; margin-bottom: 15px;">
          ${memory.emoji || '💝'}
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <strong style="color: rgba(255, 255, 255, 0.8);">Date:</strong>
        <span style="margin-left: 10px;">${memory.date || 'Recently'}</span>
      </div>

      <div style="margin-bottom: 20px;">
        <strong style="color: rgba(255, 255, 255, 0.8);">Content:</strong>
        <p style="margin: 10px 0; line-height: 1.6; color: rgba(255, 255, 255, 0.9);">
          ${memory.content || memory.description || 'This is a beautiful memory waiting to be filled with details...'}
        </p>
      </div>

      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="edit-memory" style="background: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.3); color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer;">Edit</button>
        <button id="view-full-gallery" style="background: rgba(255, 255, 255, 0.9); border: none; color: #6b46c1; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">View in Gallery</button>
      </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Add event listeners
    const closeBtn = modalContent.querySelector('#close-memory-modal');
    const editBtn = modalContent.querySelector('#edit-memory');
    const galleryBtn = modalContent.querySelector('#view-full-gallery');

    closeBtn.addEventListener('click', () => {
      modal.remove();
    });

    editBtn.addEventListener('click', () => {
      modal.remove();
      // Navigate to full gallery for editing
      window.location.href = `memory-gallery-new.html#${memory.id}`;
    });

    galleryBtn.addEventListener('click', () => {
      modal.remove();
      window.location.href = `memory-gallery-new.html#${memory.id}`;
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Add fade in animation CSS
    if (!document.getElementById('memory-modal-styles')) {
      const style = document.createElement('style');
      style.id = 'memory-modal-styles';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .memory-modal-animation {
          animation: fadeIn 0.3s ease forwards !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Apply animation class
    modal.classList.add('memory-modal-animation');
  }

  formatDate(dateStr) {
    if (!dateStr) return 'Recently';

    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Recently';

      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Recently';
    }
  }

  toggleRecording() {

    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  startRecording() {
    if (!this.recognition) {
      this.showVaultNotification('Voice recording is not supported in your browser. Please try Chrome, Edge, or Safari.');
      return;
    }

    this.isRecording = true;

    try {
      this.recognition.start();
    } catch (error) {
      console.error('🎤 Failed to start recording:', error);
      this.isRecording = false;
      return;
    }

    const voiceBtn = this.element.querySelector('#voiceBtn');
    const voiceIcon = this.element.querySelector('#voiceIcon');
    const voiceStatus = this.element.querySelector('#voiceStatus');

    if (voiceBtn) voiceBtn.classList.add('recording');
    if (voiceIcon) {
      voiceIcon.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <rect width="6" height="6" x="9" y="9" rx="1"/>
        </svg>
      `;
    }
    if (voiceStatus) voiceStatus.textContent = 'Recording... Tap to pause';
  }

  stopRecording() {
    if (!this.isRecording) return;

    this.isRecording = false;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.error('🎤 Error stopping recognition:', error);
      }
    }

    const voiceBtn = this.element.querySelector('#voiceBtn');
    const voiceIcon = this.element.querySelector('#voiceIcon');
    const voiceStatus = this.element.querySelector('#voiceStatus');

    if (voiceBtn) voiceBtn.classList.remove('recording');
    if (voiceIcon) {
      voiceIcon.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" x2="12" y1="19" y2="22"/>
          <line x1="8" x2="16" y1="22" y2="22"/>
        </svg>
      `;
    }
    if (voiceStatus) voiceStatus.textContent = 'Tap to continue recording';
  }

  updateTranscription(text) {
    const element = this.element.querySelector('#transcriptionText');
    if (element) {
      if (text && text.trim()) {
        element.textContent = text;
      } else {
        element.innerHTML = '<span class="transcription-placeholder">Your words will appear here as you speak...</span>';
      }
    }
  }

  addSuggestion(text) {

    this.transcript = this.transcript ? this.transcript + ' ' + text : text;
    this.updateTranscription(this.transcript);
  }

  nextQuestion() {

    if (this.currentStep < this.totalSteps) {
      // Store the current transcript before moving to next question
      if (this.transcript && this.transcript.trim()) {

        this.transcripts.push({
          question: this.questions[this.currentStep - 1],
          answer: this.transcript.trim(),
          questionNumber: this.currentStep
        });
      }

      this.currentStep++;
      this.updateProgress();
      const questionElement = this.element.querySelector('#questionText');
      if (questionElement) {
        questionElement.textContent = this.questions[this.currentStep - 1];
      }
      this.transcript = '';
      this.updateTranscription('');
    } else {
      // Store the final transcript before saving
      if (this.transcript && this.transcript.trim()) {

        this.transcripts.push({
          question: this.questions[this.currentStep - 1],
          answer: this.transcript.trim(),
          questionNumber: this.currentStep
        });
      }

      // Wizard complete - save the memory!

      this.saveVoiceMemory();
    }

    // TEMPORARILY DISABLED: Height adjustment causing infinite loop
    // if (this.adjustHeight) {
    //   setTimeout(() => this.adjustHeight(), 100);
    // }
  }

  skipQuestion() {

    this.nextQuestion();
  }

  async saveVoiceMemory() {
    try {

      // Combine all transcript Q&As into a formatted story
      let fullContent = '';
      if (this.transcripts && this.transcripts.length > 0) {
        fullContent = this.transcripts.map(transcript => {
          return `**${transcript.question}**\n\n${transcript.answer}`;
        }).join('\n\n---\n\n');
      }

      if (!fullContent.trim()) {
        console.warn('💾 VOICE: No content to save');
        this.showVaultNotification('⚠️ No voice content captured to save');
        this.resetWizard();
        return;
      }

      // Use the first question as title context or a generic title
      const titleContext = this.transcripts.length > 0 ?
        this.transcripts[0].question.split('?')[0].replace("What's your favorite memory", "Memory") :
        "Voice Memory";

      // Create memory data
      const memoryData = {
        id: 'voice_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        title: titleContext,
        content: fullContent,
        category: 'voice',
        source: 'voice_wizard',
        type: 'voice_capture',
        date: new Date().toISOString(),
        tags: ['voice', 'memory', 'conversation'],
        metadata: {
          captureMethod: 'voice_wizard',
          questionsAnswered: this.transcripts.length,
          allQuestions: this.transcripts.map(t => t.question),
          capturedAt: new Date().toISOString()
        }
      };

      // Enhanced debugging and API checking

      // Try multiple API methods based on the documentation
      let result = null;
      let apiUsed = '';

      if (window.emmaAPI?.memories?.save) {

        apiUsed = 'memories.save';
        try {
          result = await window.emmaAPI.memories.save(memoryData);

        } catch (error) {
          console.error('💾 VOICE: memories.save error:', error);
        }
      }

      // Fallback to legacy window.emma.vault.storeMemory with MTAP shape
      if (!result?.success && window.emma?.vault?.storeMemory) {

        apiUsed = 'legacy.vault.storeMemory';
        try {
          const mtapMemory = {
            id: memoryData.id,
            header: { id: memoryData.id, created: Date.now(), title: memoryData.title, protocol: 'MTAP/1.0' },
            core: { content: memoryData.content },
            metadata: { title: memoryData.title, platform: memoryData.source, type: memoryData.type, ...memoryData.metadata },
            semantic: {},
            relations: {}
          };
          result = await window.emma.vault.storeMemory({ mtapMemory });

        } catch (error) {
          console.error('💾 VOICE: legacy vault.storeMemory error:', error);
        }
      }

      if (result && result.success) {

        this.showVaultNotification('✅ Memory captured and saved to vault!');
        // Quick sanity check: fetch latest memories and log count
        try {
          const after = await window.emmaAPI?.memories?.getAll?.({ limit: 5, offset: 0 });

        } catch (e) {
          console.warn('💾 VOICE: Post-save getAll check failed', e);
        }

        // Navigate to memory gallery to show the new memory
        setTimeout(() => {

          window.location.href = 'memory-gallery-new.html';
        }, 2000);

      } else if (result) {
        console.error(`💾 VOICE: Save failed via ${apiUsed}:`, result);
        this.showVaultNotification(`❌ Failed to save memory: ${result.error || 'Unknown error'}`);
        this.resetWizard();
      } else {
        console.warn('💾 VOICE: No API available - demo mode');

        this.showVaultNotification('📝 Memory captured (demo mode)');

        // Still navigate to gallery in demo mode
        setTimeout(() => {
          console.log('🔄 VOICE: Navigating to memory gallery (demo)');
          window.location.href = 'memory-gallery-new.html';
        }, 2000);
      }

    } catch (error) {
      console.error('💾 VOICE: Error saving memory:', error);
      this.showVaultNotification('❌ Error saving memory: ' + error.message);
      this.resetWizard();
    }
  }

  resetWizard() {

    this.currentStep = 1;
    this.updateProgress();
    const questionElement = this.element.querySelector('#questionText');
    if (questionElement) {
      questionElement.textContent = this.questions[0];
    }
    this.transcript = '';
    this.transcripts = [];
    this.updateTranscription('');
  }

  updateProgress() {
    const progress = (this.currentStep / this.totalSteps) * 100;
    const progressBar = this.element.querySelector('#progressBar');
    const currentStepElement = this.element.querySelector('#currentStep');
    const totalStepsElement = this.element.querySelector('#totalSteps');

    console.log('📊 Updating progress:', progress + '%', `(${this.currentStep}/${this.totalSteps})`);

    if (progressBar) progressBar.style.width = progress + '%';
    if (currentStepElement) currentStepElement.textContent = this.currentStep;
    if (totalStepsElement) totalStepsElement.textContent = this.totalSteps;
  }

  close() {
    // Stop any active recording
    if (this.isRecording) {
      this.stopRecording();
    }

    // Clean up dynamic height listeners
    if (this.heightObserver) {
      this.heightObserver.disconnect();
      this.heightObserver = null;
    }

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    // Remove global reference
    if (window.assistantInstance === this) {
      window.assistantInstance = null;
    }

    // Call parent close method
    try { super.close(); } catch (e) { console.error('Popup close error:', e); }
  }
}

// Export for use
window.AssistantExperience = AssistantExperience;
