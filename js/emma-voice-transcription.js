/**
 * Emma Voice Transcription Experience
 * Beautiful, real-time voice transcription with Emma's signature design
 * 
 * VISION: Elegant overlay that shows Debbe's words appearing in real-time
 * - Blurred background focusing on the transcription
 * - Large, beautiful Emma-branded text
 * - Real-time transcription feedback
 * - Preview before sending
 * 
 * 💜 Built with love for Debbe and all users who prefer voice interaction
 */

class EmmaVoiceTranscription {
  constructor(options = {}) {
    this.options = {
      onTranscriptionComplete: options.onTranscriptionComplete || (() => {}),
      onTranscriptionCancel: options.onTranscriptionCancel || (() => {}),
      showPreview: options.showPreview !== false, // Default true
      autoSend: options.autoSend || false,
      placeholder: options.placeholder || "Speak to Emma...",
      ...options
    };
    
    this.isRecording = false;
    this.recognition = null;
    this.transcriptionText = '';
    this.overlay = null;
    this.interimResults = '';
    this.finalResults = '';
    
    // CRITICAL FIX: Initialize speech recognition in constructor
    this.initializeSpeechRecognition();
    
    console.log('🎤 Emma Voice Transcription initialized with recognition:', !!this.recognition);
  }
  
  /**
   * Initialize Web Speech API
   */
  initializeSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('🎤 Speech recognition not supported in this browser');
      return;
    }
    
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    
    // Real-time transcription results
    this.recognition.onresult = (event) => {
      this.handleTranscriptionResult(event);
    };
    
    this.recognition.onstart = () => {
      console.log('🎤 Voice recognition started');
      this.isRecording = true;
      this.updateRecordingIndicator();
    };
    
    this.recognition.onend = () => {
      console.log('🎤 Voice recognition ended');
      this.isRecording = false;
      this.updateRecordingIndicator();
      
      if (this.finalResults.trim()) {
        this.showTranscriptionPreview();
      } else {
        this.closeTranscriptionOverlay();
      }
    };
    
    this.recognition.onerror = (event) => {
      console.error('🎤 Voice recognition error:', event.error);
      this.handleTranscriptionError(event.error);
    };
  }
  
  /**
   * Start voice transcription with beautiful overlay
   */
  async startTranscription() {
    console.log('🎤 START: startTranscription called');
    console.log('🎤 START: recognition exists?', !!this.recognition);
    
    if (!this.recognition) {
      console.error('🎤 START: Speech recognition not initialized!');
      this.showError('Voice recognition not supported in this browser');
      return;
    }
    
    if (this.isRecording) {
      console.log('🎤 START: Already recording, stopping first');
      this.stopTranscription();
      return;
    }
    
    // Reset transcription state
    this.transcriptionText = '';
    this.interimResults = '';
    this.finalResults = '';
    console.log('🎤 START: Transcription state reset');
    
    // Create beautiful overlay
    this.createTranscriptionOverlay();
    
    try {
      // Start recognition
      console.log('🎤 START: About to call recognition.start()');
      this.recognition.start();
      console.log('🎤 START: recognition.start() called successfully');
    } catch (error) {
      console.error('🎤 START: Failed to start voice recognition:', error);
      this.closeTranscriptionOverlay();
      this.showError('Failed to start voice recognition: ' + error.message);
    }
  }
  
  /**
   * Stop voice transcription
   */
  stopTranscription() {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
    }
  }
  
  /**
   * Create beautiful Emma-branded transcription overlay
   */
  createTranscriptionOverlay() {
    // Remove existing overlay if present
    if (this.overlay) {
      this.overlay.remove();
    }
    
    this.overlay = document.createElement('div');
    this.overlay.id = 'emma-voice-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(20px);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.4s ease;
    `;
    
    this.overlay.innerHTML = `
      <!-- Emma Voice Transcription - Mobile-First Design -->
      <div class="emma-voice-container" style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
        border: none;
        border-radius: ${window.innerWidth <= 768 ? '20px' : '28px'};
        padding: ${window.innerWidth <= 768 ? '32px 24px' : '48px 40px'};
        max-width: ${window.innerWidth <= 768 ? '95%' : '600px'};
        width: ${window.innerWidth <= 768 ? '95%' : '90%'};
        text-align: center;
        backdrop-filter: blur(30px);
        box-shadow: 0 32px 120px rgba(139, 92, 246, 0.6);
        position: relative;
        min-height: ${window.innerWidth <= 768 ? '70vh' : 'auto'};
        display: flex;
        flex-direction: column;
        justify-content: center;
      ">
        <!-- Emma Voice Header -->
        <div class="emma-voice-header" style="
          margin-bottom: ${window.innerWidth <= 768 ? '40px' : '32px'};
          animation: fadeInUp 0.6s ease;
        ">
          <div style="
            font-size: ${window.innerWidth <= 768 ? '42px' : '32px'};
            font-weight: 300;
            color: white;
            margin-bottom: 12px;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            letter-spacing: 2px;
          ">emma</div>
          <div style="
            font-size: ${window.innerWidth <= 768 ? '18px' : '16px'};
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 8px;
            font-weight: 500;
          ">is listening to you</div>
          <div style="
            font-size: ${window.innerWidth <= 768 ? '16px' : '14px'};
            color: rgba(255, 255, 255, 0.7);
            margin: 0;
          ">Speak naturally and watch your words appear</div>
        </div>
        
        <!-- Emma Orb Microphone -->
        <div class="emma-mic-orb" id="emma-mic-orb" style="
          width: ${window.innerWidth <= 768 ? '120px' : '100px'};
          height: ${window.innerWidth <= 768 ? '120px' : '100px'};
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.1));
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto ${window.innerWidth <= 768 ? '40px' : '32px'};
          box-shadow: 
            0 0 60px rgba(255, 255, 255, 0.4),
            inset 0 0 40px rgba(255, 255, 255, 0.1);
          transition: all 0.4s ease;
          animation: orbPulse 3s ease-in-out infinite;
        ">
          <svg width="${window.innerWidth <= 768 ? '40' : '36'}" height="${window.innerWidth <= 768 ? '40' : '36'}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </div>
        
        <!-- Transcription Display -->
        <div class="emma-transcription-display" style="
          min-height: ${window.innerWidth <= 768 ? '150px' : '120px'};
          background: rgba(255, 255, 255, 0.15);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: ${window.innerWidth <= 768 ? '20px' : '16px'};
          padding: ${window.innerWidth <= 768 ? '32px 24px' : '24px'};
          margin-bottom: ${window.innerWidth <= 768 ? '40px' : '32px'};
          position: relative;
          overflow-y: auto;
          max-height: ${window.innerWidth <= 768 ? '200px' : '300px'};
          backdrop-filter: blur(10px);
          box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.1);
        ">
          <div id="transcription-text" style="
            font-size: ${window.innerWidth <= 768 ? '28px' : '24px'};
            line-height: 1.3;
            color: white;
            font-weight: 300;
            text-align: center;
            min-height: ${window.innerWidth <= 768 ? '84px' : '72px'};
            display: flex;
            align-items: center;
            justify-content: center;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
            letter-spacing: 0.5px;
          ">
            <span style="color: rgba(255, 255, 255, 0.6); font-style: italic; font-size: ${window.innerWidth <= 768 ? '20px' : '18px'};">
              💜 Waiting for your voice...
            </span>
          </div>
          
          <div id="interim-text" style="display: none;"></div>
        </div>
        
        <!-- Recording Status -->
        <div class="emma-recording-status" id="recording-status" style="
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: ${window.innerWidth <= 768 ? '40px' : '32px'};
          font-size: ${window.innerWidth <= 768 ? '18px' : '16px'};
          color: white;
          font-weight: 500;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        ">
          <div class="emma-recording-dot" style="
            width: ${window.innerWidth <= 768 ? '16px' : '14px'};
            height: ${window.innerWidth <= 768 ? '16px' : '14px'};
            border-radius: 50%;
            background: #ff4757;
            animation: emmaPulse 1.2s infinite;
            box-shadow: 0 0 20px rgba(255, 71, 87, 0.6);
          "></div>
          <span>Recording your memories...</span>
        </div>
        
        <!-- Emma Action Buttons -->
        <div class="emma-voice-actions" style="
          display: flex;
          gap: ${window.innerWidth <= 768 ? '12px' : '16px'};
          justify-content: center;
          flex-wrap: wrap;
        ">
          <button class="emma-voice-btn emma-stop-btn" id="stop-recording-btn" style="
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid rgba(255, 255, 255, 0.4);
            color: white;
            padding: ${window.innerWidth <= 768 ? '16px 24px' : '14px 20px'};
            border-radius: ${window.innerWidth <= 768 ? '16px' : '12px'};
            cursor: pointer;
            font-weight: 600;
            font-size: ${window.innerWidth <= 768 ? '16px' : '14px'};
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            backdrop-filter: blur(10px);
            min-width: ${window.innerWidth <= 768 ? '140px' : '120px'};
            justify-content: center;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
            <span>Stop</span>
          </button>
          
          <button class="emma-voice-btn emma-cancel-btn" id="cancel-recording-btn" style="
            background: rgba(255, 71, 87, 0.2);
            border: 2px solid rgba(255, 71, 87, 0.4);
            color: #ff4757;
            padding: ${window.innerWidth <= 768 ? '16px 24px' : '14px 20px'};
            border-radius: ${window.innerWidth <= 768 ? '16px' : '12px'};
            cursor: pointer;
            font-weight: 600;
            font-size: ${window.innerWidth <= 768 ? '16px' : '14px'};
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            backdrop-filter: blur(10px);
            min-width: ${window.innerWidth <= 768 ? '140px' : '120px'};
            justify-content: center;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            <span>Cancel</span>
          </button>
        </div>
      </div>
      
      <!-- Emma Voice Animations -->
      <style>
        @keyframes emmaPulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
            box-shadow: 0 0 20px rgba(255, 71, 87, 0.6);
          }
          50% { 
            opacity: 0.7; 
            transform: scale(1.3);
            box-shadow: 0 0 40px rgba(255, 71, 87, 0.9);
          }
        }
        
        @keyframes orbPulse {
          0%, 100% { 
            box-shadow: 
              0 0 60px rgba(255, 255, 255, 0.4),
              inset 0 0 40px rgba(255, 255, 255, 0.1);
            transform: scale(1);
          }
          50% { 
            box-shadow: 
              0 0 80px rgba(255, 255, 255, 0.6),
              inset 0 0 60px rgba(255, 255, 255, 0.2);
            transform: scale(1.02);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .emma-voice-btn:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        }
        
        .emma-voice-btn:active {
          transform: translateY(-1px) scale(0.98);
        }
        
        /* Emma transcription text animations */
        .emma-word {
          display: inline;
          opacity: 0;
          animation: emmaWordAppear 0.4s ease forwards;
        }
        
        @keyframes emmaWordAppear {
          from {
            opacity: 0;
            transform: translateY(15px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        /* Mobile-specific animations */
        @media (max-width: 768px) {
          .emma-voice-container {
            animation: mobileSlideUp 0.5s ease;
          }
          
          @keyframes mobileSlideUp {
            from {
              opacity: 0;
              transform: translateY(50px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        }
      </style>
    `;
    
    document.body.appendChild(this.overlay);
    
    // Animate in
    requestAnimationFrame(() => {
      this.overlay.style.opacity = '1';
    });
    
    // Setup event listeners
    this.setupOverlayEventListeners();
    
    console.log('🎤 Emma voice transcription overlay created');
  }
  
  /**
   * Setup overlay event listeners
   */
  setupOverlayEventListeners() {
    const stopBtn = document.getElementById('stop-recording-btn');
    const cancelBtn = document.getElementById('cancel-recording-btn');
    
    stopBtn.addEventListener('click', () => {
      this.stopTranscription();
    });
    
    cancelBtn.addEventListener('click', () => {
      this.cancelTranscription();
    });
    
    // Close on escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.cancelTranscription();
      }
    };
    
    document.addEventListener('keydown', escapeHandler);
    
    // Store handler for cleanup
    this.escapeHandler = escapeHandler;
  }
  
  /**
   * Handle real-time transcription results
   */
  handleTranscriptionResult(event) {
    let interimTranscript = '';
    let finalTranscript = '';
    
    console.log('🎤 Raw transcription event:', event);
    
    // Process all results - FIXED transcript access
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      
      // CRITICAL FIX: Correct transcript access pattern
      const transcript = (result[0] && result[0].transcript) || result.transcript || '';
      
      console.log(`🎤 Result ${i}:`, {
        result: result,
        transcript: transcript,
        isFinal: result.isFinal,
        confidence: result[0] ? result[0].confidence : 'unknown'
      });
      
      if (transcript.trim()) {
        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
    }
    
    // Update stored results
    if (finalTranscript.trim()) {
      this.finalResults += finalTranscript + ' ';
      console.log('🎤 Added final transcript:', finalTranscript);
    }
    this.interimResults = interimTranscript;
    
    // Update display with beautiful animation
    this.updateTranscriptionDisplay();
    
    console.log('🎤 Current state:', {
      finalResults: this.finalResults,
      interimResults: this.interimResults
    });
  }
  
  /**
   * Update transcription display with beautiful animations
   */
  updateTranscriptionDisplay() {
    const transcriptionDiv = document.getElementById('transcription-text');
    const interimDiv = document.getElementById('interim-text');
    
    if (!transcriptionDiv || !interimDiv) {
      console.error('🎤 Transcription display elements not found');
      return;
    }
    
    console.log('🎤 Updating display with:', {
      final: this.finalResults,
      interim: this.interimResults
    });
    
    // Combine final and interim for display
    const allText = this.finalResults + this.interimResults;
    
    if (allText.trim()) {
      // Show transcribed text
      transcriptionDiv.style.textAlign = 'left';
      transcriptionDiv.style.justifyContent = 'flex-start';
      transcriptionDiv.style.alignItems = 'flex-start';
      transcriptionDiv.style.display = 'block';
      
      // Split into final and interim parts
      const finalWords = this.finalResults.trim();
      const interimWords = this.interimResults.trim();
      
      let displayHTML = '';
      
      // Final words (confirmed)
      if (finalWords) {
        displayHTML += `<span style="color: white; font-weight: 400;">${finalWords}</span>`;
      }
      
      // Interim words (currently speaking)
      if (interimWords) {
        displayHTML += `<span style="color: rgba(255, 255, 255, 0.7); font-style: italic;"> ${interimWords}</span>`;
      }
      
      transcriptionDiv.innerHTML = displayHTML;
      
      // Clear interim div since we're showing it inline
      interimDiv.innerHTML = '';
      
    } else {
      // Show placeholder
      transcriptionDiv.innerHTML = `
        <span style="color: rgba(255, 255, 255, 0.5); font-style: italic;">
          Waiting for your voice...
        </span>
      `;
      transcriptionDiv.style.textAlign = 'center';
      transcriptionDiv.style.justifyContent = 'center';
      transcriptionDiv.style.alignItems = 'center';
      transcriptionDiv.style.display = 'flex';
      
      interimDiv.innerHTML = '';
    }
  }
  
  /**
   * Update recording indicator
   */
  updateRecordingIndicator() {
    const micVisual = document.getElementById('mic-visual');
    const recordingStatus = document.getElementById('recording-status');
    
    if (!micVisual || !recordingStatus) return;
    
    if (this.isRecording) {
      micVisual.classList.add('recording');
      recordingStatus.style.opacity = '1';
    } else {
      micVisual.classList.remove('recording');
      recordingStatus.style.opacity = '0.5';
    }
  }
  
  /**
   * Show transcription preview before sending
   */
  showTranscriptionPreview() {
    if (!this.options.showPreview) {
      this.completeTranscription();
      return;
    }
    
    const container = this.overlay.querySelector('.voice-transcription-container');
    if (!container) return;
    
    // Update to preview mode
    container.innerHTML = `
      <!-- Preview Mode -->
      <div class="voice-header" style="margin-bottom: 32px;">
        <h2 style="
          font-size: 24px;
          font-weight: 600;
          color: white;
          margin-bottom: 8px;
        ">✨ Your Message</h2>
        <p style="
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          margin: 0;
        ">Review and send your message to Emma</p>
      </div>
      
      <!-- Preview Text -->
      <div style="
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 32px;
        text-align: left;
      ">
        <div style="
          font-size: 18px;
          line-height: 1.5;
          color: white;
          font-weight: 300;
        ">${this.finalResults}</div>
      </div>
      
      <!-- Preview Actions -->
      <div style="
        display: flex;
        gap: 16px;
        justify-content: center;
      ">
        <button id="send-transcription-btn" style="
          background: linear-gradient(135deg, #8B5CF6, #F093FB);
          border: none;
          color: white;
          padding: 14px 28px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
          Send to Emma
        </button>
        
        <button id="record-again-btn" style="
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 14px 28px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          </svg>
          Record Again
        </button>
        
        <button id="cancel-transcription-btn" style="
          background: rgba(239, 68, 68, 0.2);
          border: 2px solid rgba(239, 68, 68, 0.4);
          color: #ef4444;
          padding: 14px 28px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          Cancel
        </button>
      </div>
    `;
    
    // Setup preview event listeners
    document.getElementById('send-transcription-btn').addEventListener('click', () => {
      this.completeTranscription();
    });
    
    document.getElementById('record-again-btn').addEventListener('click', () => {
      this.startTranscription();
    });
    
    document.getElementById('cancel-transcription-btn').addEventListener('click', () => {
      this.cancelTranscription();
    });
    
    console.log('🎤 Transcription preview shown');
  }
  
  /**
   * Complete transcription and send to callback
   */
  completeTranscription() {
    const finalText = this.finalResults.trim();
    
    if (finalText) {
      console.log('🎤 Transcription completed:', finalText);
      this.options.onTranscriptionComplete(finalText);
    }
    
    this.closeTranscriptionOverlay();
  }
  
  /**
   * Cancel transcription
   */
  cancelTranscription() {
    console.log('🎤 Transcription cancelled');
    
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
    }
    
    this.options.onTranscriptionCancel();
    this.closeTranscriptionOverlay();
  }
  
  /**
   * Close transcription overlay
   */
  closeTranscriptionOverlay() {
    if (!this.overlay) return;
    
    // Animate out
    this.overlay.style.opacity = '0';
    
    setTimeout(() => {
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      this.overlay = null;
    }, 400);
    
    // Cleanup event listeners
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
    
    console.log('🎤 Voice transcription overlay closed');
  }
  
  /**
   * Handle transcription errors
   */
  handleTranscriptionError(error) {
    console.error('🎤 Transcription error:', error);
    
    let errorMessage = 'Voice recognition failed';
    
    switch (error) {
      case 'no-speech':
        errorMessage = 'No speech detected. Please try again.';
        break;
      case 'audio-capture':
        errorMessage = 'Microphone not accessible. Please check permissions.';
        break;
      case 'not-allowed':
        errorMessage = 'Microphone permission denied. Please enable microphone access.';
        break;
      case 'network':
        errorMessage = 'Network error. Please check your connection.';
        break;
    }
    
    this.showError(errorMessage);
    this.closeTranscriptionOverlay();
  }
  
  /**
   * Show error message
   */
  showError(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(239, 68, 68, 0.9);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      font-weight: 600;
      z-index: 10001;
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.2);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    toast.textContent = `🎤 ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
  
  /**
   * Check if voice recognition is supported
   */
  static isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.EmmaVoiceTranscription = EmmaVoiceTranscription;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmmaVoiceTranscription;
}
