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
    
    this.initializeSpeechRecognition();
    
    console.log('🎤 Emma Voice Transcription initialized');
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
    if (!this.recognition) {
      this.showError('Voice recognition not supported in this browser');
      return;
    }
    
    if (this.isRecording) {
      this.stopTranscription();
      return;
    }
    
    // Reset transcription state
    this.transcriptionText = '';
    this.interimResults = '';
    this.finalResults = '';
    
    // Create beautiful overlay
    this.createTranscriptionOverlay();
    
    try {
      // Start recognition
      this.recognition.start();
      console.log('🎤 Starting Emma voice transcription...');
    } catch (error) {
      console.error('🎤 Failed to start voice recognition:', error);
      this.closeTranscriptionOverlay();
      this.showError('Failed to start voice recognition');
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
      <!-- Voice Transcription Interface -->
      <div class="voice-transcription-container" style="
        background: linear-gradient(145deg, rgba(139, 92, 246, 0.15), rgba(240, 147, 251, 0.10));
        border: 2px solid rgba(139, 92, 246, 0.3);
        border-radius: 24px;
        padding: 48px 40px;
        max-width: 700px;
        width: 90%;
        text-align: center;
        backdrop-filter: blur(20px);
        box-shadow: 0 24px 80px rgba(139, 92, 246, 0.4);
        position: relative;
      ">
        <!-- Emma Voice Header -->
        <div class="voice-header" style="
          margin-bottom: 32px;
        ">
          <h2 style="
            font-size: 28px;
            font-weight: 300;
            color: white;
            margin-bottom: 8px;
            background: linear-gradient(135deg, #8B5CF6, #F093FB);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          ">emma is listening</h2>
          <p style="
            font-size: 16px;
            color: rgba(255, 255, 255, 0.7);
            margin: 0;
          ">Speak naturally - your words will appear below</p>
        </div>
        
        <!-- Microphone Visual -->
        <div class="mic-visual" id="mic-visual" style="
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8B5CF6, #F093FB);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 32px;
          box-shadow: 0 0 40px rgba(139, 92, 246, 0.6);
          transition: all 0.3s ease;
        ">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </div>
        
        <!-- Real-time Transcription Display -->
        <div class="transcription-display" style="
          min-height: 120px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 32px;
          position: relative;
          overflow-y: auto;
          max-height: 300px;
        ">
          <div id="transcription-text" style="
            font-size: 24px;
            line-height: 1.4;
            color: white;
            font-weight: 300;
            text-align: left;
            min-height: 72px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="color: rgba(255, 255, 255, 0.5); font-style: italic;">
              Waiting for your voice...
            </span>
          </div>
          
          <!-- Interim text (lighter) -->
          <div id="interim-text" style="
            font-size: 20px;
            line-height: 1.3;
            color: rgba(255, 255, 255, 0.6);
            font-weight: 300;
            text-align: left;
            font-style: italic;
            margin-top: 8px;
            min-height: 24px;
          "></div>
        </div>
        
        <!-- Recording Status -->
        <div class="recording-status" id="recording-status" style="
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 24px;
          font-size: 16px;
          color: rgba(255, 255, 255, 0.8);
        ">
          <div class="recording-dot" style="
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #ef4444;
            animation: pulse 1.5s infinite;
          "></div>
          <span>Recording...</span>
        </div>
        
        <!-- Action Buttons -->
        <div class="voice-actions" style="
          display: flex;
          gap: 16px;
          justify-content: center;
        ">
          <button class="voice-action-btn" id="stop-recording-btn" style="
            background: rgba(239, 68, 68, 0.2);
            border: 2px solid rgba(239, 68, 68, 0.4);
            color: #ef4444;
            padding: 12px 24px;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="6" y="6" width="12" height="12"/>
            </svg>
            Stop Recording
          </button>
          
          <button class="voice-action-btn" id="cancel-recording-btn" style="
            background: rgba(156, 163, 175, 0.2);
            border: 2px solid rgba(156, 163, 175, 0.4);
            color: #9ca3af;
            padding: 12px 24px;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 600;
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
      </div>
      
      <!-- CSS Animations -->
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        
        @keyframes micPulse {
          0%, 100% { 
            box-shadow: 0 0 40px rgba(139, 92, 246, 0.6);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 60px rgba(139, 92, 246, 0.9);
            transform: scale(1.05);
          }
        }
        
        .mic-visual.recording {
          animation: micPulse 2s infinite;
        }
        
        .voice-action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        /* Transcription text animations */
        .transcription-word {
          display: inline;
          opacity: 0;
          animation: wordAppear 0.3s ease forwards;
        }
        
        @keyframes wordAppear {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
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
    
    // Process all results
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i].transcript;
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    
    // Update stored results
    if (finalTranscript) {
      this.finalResults += finalTranscript;
    }
    this.interimResults = interimTranscript;
    
    // Update display with beautiful animation
    this.updateTranscriptionDisplay();
    
    console.log('🎤 Transcription update:', {
      final: this.finalResults,
      interim: this.interimResults
    });
  }
  
  /**
   * Update transcription display with beautiful animations
   */
  updateTranscriptionDisplay() {
    const transcriptionDiv = document.getElementById('transcription-text');
    const interimDiv = document.getElementById('interim-text');
    
    if (!transcriptionDiv || !interimDiv) return;
    
    // Update final text (confirmed words)
    if (this.finalResults.trim()) {
      transcriptionDiv.style.textAlign = 'left';
      transcriptionDiv.style.justifyContent = 'flex-start';
      transcriptionDiv.style.alignItems = 'flex-start';
      
      // Animate words appearing
      const words = this.finalResults.trim().split(' ');
      transcriptionDiv.innerHTML = words.map((word, index) => 
        `<span class="transcription-word" style="animation-delay: ${index * 0.1}s">${word} </span>`
      ).join('');
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
    }
    
    // Update interim text (current speaking)
    if (this.interimResults.trim()) {
      interimDiv.textContent = this.interimResults;
      interimDiv.style.opacity = '0.8';
    } else {
      interimDiv.textContent = '';
      interimDiv.style.opacity = '0';
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
