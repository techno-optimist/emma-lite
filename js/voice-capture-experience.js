/**
 * Voice Capture Experience Popup
 * Advanced voice memory creation system
 */

console.log('🎤 Voice Capture Experience: Loading module');

class VoiceCaptureExperience extends ExperiencePopup {
  constructor(position, settings) {
    super(position, settings);
    this.isRecording = false;
    this.recognition = null;
    this.transcript = '';
    this.startTime = null;
    this.currentMode = 'quick'; // quick, story, interview, free
    this.captureSession = {
      id: null,
      segments: [],
      metadata: {}
    };
    this.focusModeActive = false;
  }

  getTitle() {
    return '';
  }

  async initialize() {
    console.log('🎤 VoiceCaptureExperience: Initializing voice system');
    this.initializeVoiceEngine();
    this.initializeTopicSuggestions();
    this.enableFocusMode();
    this.initializeEmmaOrb();
    this.startInitialPrompt();
  }

  initializeEmmaOrb() {
    try {
      const orbContainer = document.getElementById('voice-emma-orb');
      if (!orbContainer) {
        console.warn('🌟 Voice Emma orb container not found');
        return;
      }
      
      if (window.EmmaOrb) {
        // Create WebGL Emma Orb for voice interface
        this.webglOrb = new window.EmmaOrb(orbContainer, {
          hue: 270, // Emma's signature purple-pink
          hoverIntensity: 0.4,
          rotateOnHover: false, // Keep it stable during recording
          forceHoverState: false
        });
        console.log('🌟 Voice Emma Orb initialized successfully');
      } else {
        console.warn('🌟 EmmaOrb class not available, using fallback');
        // Fallback gradient
        orbContainer.style.background = 'radial-gradient(circle at 30% 30%, #8A5EFA, #764ba2, #f093fb)';
        orbContainer.style.borderRadius = '50%';
        orbContainer.style.width = '100%';
        orbContainer.style.height = '100%';
      }
    } catch (error) {
      console.error('🚨 Error initializing Voice Emma Orb:', error);
      // Fallback
      const orbContainer = document.getElementById('voice-emma-orb');
      if (orbContainer) {
        orbContainer.style.background = 'radial-gradient(circle at 30% 30%, #8A5EFA, #764ba2, #f093fb)';
        orbContainer.style.borderRadius = '50%';
        orbContainer.style.width = '100%';
        orbContainer.style.height = '100%';
      }
    }
  }

  renderContent(contentElement) {
    contentElement.innerHTML = `
      <div class="emma-voice-studio">
        <!-- Emma WebGL Orb Anchor -->
        <div class="emma-anchor">
          <div class="webgl-orb-container" id="voice-emma-orb"></div>
          <p class="emma-hint" id="emma-hint">Ready to capture your thoughts</p>
        </div>

        <!-- Clean Transcription Area -->
        <div class="transcription-area">
          <div class="transcription-content" id="transcription-content">
            <div class="transcription-prompt">
              <div class="prompt-text">Speak naturally and I'll capture every word...</div>
            </div>
          </div>
          <div class="transcription-metrics" id="transcription-metrics">
            <span id="word-count">0 words</span>
            <span class="separator">•</span>
            <span id="char-count">0 characters</span>
          </div>
        </div>

        <!-- Elegant Topic Suggestions -->
        <div class="topic-suggestions" id="topic-suggestions">
          <div class="suggestions-header">
            <div class="suggestions-refresh" id="suggestions-refresh" title="New suggestions">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
            </div>
          </div>
          <div class="topic-nodes" id="topic-nodes">
            <!-- Dynamic suggestions -->
          </div>
        </div>

        <!-- Minimal Controls -->
        <div class="voice-controls">
          <button class="record-button" id="record-btn" disabled>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="8" fill="currentColor"/>
            </svg>
            <span>Start Recording</span>
            <span class="shortcut">Space</span>
          </button>
          
          <button class="record-button pause" id="pause-btn" style="display: none;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="6" y="5" width="4" height="14" fill="currentColor"/>
              <rect x="14" y="5" width="4" height="14" fill="currentColor"/>
            </svg>
            <span>Pause</span>
            <span class="shortcut">Space</span>
          </button>
          
          <div class="action-controls" style="display: none;" id="action-controls">
            <button class="action-btn save" id="save-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
            <button class="action-btn discard" id="cancel-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Clean Progress -->
        <div class="progress-area" id="progress-area" style="display: none;">
          <div class="progress-bar">
            <div class="progress-fill" id="progress-fill"></div>
          </div>
          <div class="time-info">
            <span id="duration-display">00:00</span>
            <span>/</span>
            <span>15:00</span>
          </div>
        </div>

        <!-- Minimal Visualizer -->
        <div class="audio-viz" id="audio-viz">
          <div class="viz-bar" style="--delay: 0ms"></div>
          <div class="viz-bar" style="--delay: 80ms"></div>
          <div class="viz-bar" style="--delay: 160ms"></div>
          <div class="viz-bar" style="--delay: 240ms"></div>
          <div class="viz-bar" style="--delay: 320ms"></div>
        </div>
      </div>
    `;

    this.setupVoiceControls();
    this.setupKeyboardShortcuts();
  }

  setupKeyboardShortcuts() {
    // Bound function to ensure proper cleanup
    this.keyboardHandler = (e) => {
      // Only handle shortcuts if voice capture popup is active and visible
      if (!this.isVisible || !this.element) return;
      
      // Space bar to toggle recording (only if not typing in text areas)
      if (e.code === 'Space' && !e.target.closest('input, textarea, [contenteditable]')) {
        e.preventDefault();
        e.stopPropagation();
        if (this.isRecording) {
          this.pauseRecording();
        } else {
          this.startRecording();
        }
        return;
      }
      
      // Escape to cancel
      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.cancelCapture();
        return;
      }
      
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyS') {
        e.preventDefault();
        e.stopPropagation();
        if (this.transcript.trim()) {
          this.saveMemory();
        }
        return;
      }
    };
    
    document.addEventListener('keydown', this.keyboardHandler, true); // Use capture phase
  }

  initializeVoiceEngine() {
    // Check for speech recognition support
    this.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!this.SpeechRecognition) {
      console.warn('🎤 Speech recognition not supported');
      this.showFallbackUI();
      return;
    }

    this.recognition = new this.SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    // Handle speech results
    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        this.transcript += finalTranscript;
      }

      this.updateTranscriptionDisplay(this.transcript + interimTranscript);
    };

    // Handle errors
    this.recognition.onerror = (event) => {
      console.error('🎤 Speech recognition error:', event.error);
      this.handleRecognitionError(event.error);
    };

    // Handle end
    this.recognition.onend = () => {
      if (this.isRecording) {
        console.log('🎤 Recognition ended unexpectedly, restarting...');
        this.startRecognition();
      }
    };

    // Enable recording button
    const recordBtn = document.getElementById('record-btn');
    if (recordBtn) {
      recordBtn.disabled = false;
    }
  }

  initializeTopicSuggestions() {
    const now = new Date();
    const hour = now.getHours();
    
    let suggestions = [];
    
    if (hour < 10) {
      // Morning suggestions
      suggestions = [
        { icon: '🌅', text: 'Morning thoughts', prompt: 'How did you sleep? Any dreams to remember?' },
        { icon: '☕', text: 'Daily plans', prompt: 'What are you looking forward to today?' },
        { icon: '🌱', text: 'Fresh starts', prompt: 'Any new beginnings on your mind?' }
      ];
    } else if (hour < 17) {
      // Afternoon suggestions
      suggestions = [
        { icon: '💭', text: 'Current moment', prompt: 'How has your day been so far?' },
        { icon: '🎯', text: 'Accomplishments', prompt: 'What have you achieved today?' },
        { icon: '😊', text: 'Joy moments', prompt: 'What made you smile today?' }
      ];
    } else {
      // Evening suggestions
      suggestions = [
        { icon: '🌟', text: 'Day highlights', prompt: 'What was the best part of your day?' },
        { icon: '💝', text: 'Gratitude', prompt: 'What are you grateful for today?' },
        { icon: '🔮', text: 'Reflections', prompt: 'Any thoughts as the day ends?' }
      ];
    }

    this.renderSuggestions(suggestions);
  }

  renderSuggestions(suggestions) {
    const container = document.getElementById('topic-nodes');
    if (!container) return;

    container.innerHTML = suggestions.map((suggestion, index) => `
      <div class="topic-node" data-prompt="${suggestion.prompt}" style="--node-delay: ${index * 100}ms">
        <div class="node-content">
          <div class="node-icon">${suggestion.icon}</div>
          <div class="node-text">${suggestion.text}</div>
        </div>
        <div class="node-glow"></div>
      </div>
    `).join('');

    // Add click listeners with elegant interaction
    container.querySelectorAll('.topic-node').forEach(node => {
      node.addEventListener('click', () => {
        const prompt = node.dataset.prompt;
        this.applySuggestion(prompt, node);
      });
    });

    // Add refresh functionality
    const refreshBtn = document.getElementById('suggestions-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.refreshTopicSuggestions();
      });
    }
  }

  applySuggestion(prompt, nodeElement = null) {
    // Elegant node selection animation
    if (nodeElement) {
      nodeElement.classList.add('selected');
      
      // Remove selection after animation
      setTimeout(() => {
        if (nodeElement.classList) {
          nodeElement.classList.remove('selected');
        }
      }, 2000);
    }

    // Update Emma's hint with the prompt
    const hint = document.getElementById('emma-hint');
    if (hint) {
      hint.textContent = prompt;
      hint.style.background = 'linear-gradient(135deg, #667eea, #764ba2, #f093fb)';
      hint.style.webkitBackgroundClip = 'text';
      hint.style.webkitTextFillColor = 'transparent';
    }

    // Auto-start recording if not already started
    if (!this.isRecording) {
      setTimeout(() => this.startRecording(), 800);
    }
  }

  refreshTopicSuggestions() {
    // Add elegant refresh animation
    const refreshBtn = document.getElementById('suggestions-refresh');
    if (refreshBtn) {
      refreshBtn.style.transform = 'rotate(360deg)';
      setTimeout(() => {
        refreshBtn.style.transform = 'rotate(0deg)';
      }, 600);
    }
    
    // Regenerate suggestions with different context
    this.initializeTopicSuggestions();
  }

  setupVoiceControls() {
    const recordBtn = document.getElementById('record-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    recordBtn?.addEventListener('click', () => this.startRecording());
    pauseBtn?.addEventListener('click', () => this.pauseRecording());
    saveBtn?.addEventListener('click', () => this.saveMemory());
    cancelBtn?.addEventListener('click', () => this.cancelCapture());
  }

  startRecording() {
    if (!this.recognition) {
      this.showFallbackUI();
      return;
    }

    this.isRecording = true;
    this.startTime = Date.now();
    this.transcript = '';
    
    // Update UI
    this.updateRecordingState(true);
    
    // Start recognition
    this.startRecognition();
    
    // Start progress tracking
    this.startProgressTracking();
    
    // Start audio visualization
    this.startAudioVisualization();

    console.log('🎤 Voice recording started');
  }

  startRecognition() {
    if (this.recognition && this.isRecording) {
      try {
        this.recognition.start();
      } catch (error) {
        console.error('🎤 Failed to start recognition:', error);
        this.handleRecognitionError(error.name || 'unknown');
      }
    }
  }

  pauseRecording() {
    if (!this.isRecording) return;

    this.isRecording = false;
    this.recognition?.stop();
    
    this.updateRecordingState(false);
    this.stopAudioVisualization();
    
    console.log('🎤 Voice recording paused');
  }

  async saveMemory() {
    if (!this.transcript.trim()) {
      this.showToast('Please speak something before saving', 'warning');
      return;
    }

    try {
      const memory = await this.createMemoryCapsule();
      await this.saveToVault(memory);
      
      this.showToast('Memory saved successfully!', 'success');
      this.close();
    } catch (error) {
      console.error('🎤 Failed to save memory:', error);
      this.showToast('Failed to save memory. Please try again.', 'error');
    }
  }

  cancelCapture() {
    this.pauseRecording();
    this.disableFocusMode();
    this.close();
  }

  updateRecordingState(recording) {
    const recordBtn = document.getElementById('record-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const actionControls = document.getElementById('action-controls');
    const progressArea = document.getElementById('progress-area');
    const hint = document.getElementById('emma-hint');
    const visualizer = document.getElementById('audio-viz');

    if (recording) {
      // Update interface state
      recordBtn.style.display = 'none';
      pauseBtn.style.display = 'flex';
      actionControls.style.display = 'flex';
      progressArea.style.display = 'flex';
      
      // Update WebGL Emma orb state
      if (this.webglOrb) {
        this.webglOrb.setHoverState(true); // Activate listening state
        this.webglOrb.setHue(290); // Shift to more vibrant listening hue
      }
      
      // Update hint
      if (hint) hint.textContent = 'I\'m listening...';
      
      // Start visualizer
      visualizer?.classList.add('active');
      
    } else {
      // Update interface state
      recordBtn.style.display = 'flex';
      pauseBtn.style.display = 'none';
      actionControls.style.display = 'none';
      progressArea.style.display = 'none';
      
      // Update WebGL Emma orb state
      if (this.webglOrb) {
        this.webglOrb.setHoverState(false); // Return to idle state
        this.webglOrb.setHue(270); // Return to default Emma hue
      }
      
      // Update hint
      if (hint) hint.textContent = 'Ready to capture your thoughts';
      
      // Stop visualizer
      visualizer?.classList.remove('active');
    }
  }

  updateTranscriptionDisplay(text) {
    const content = document.getElementById('transcription-content');
    const wordCount = document.getElementById('word-count');
    const charCount = document.getElementById('char-count');
    
    if (content) {
      if (text.trim()) {
        // Show actual transcription with elegant formatting
        content.innerHTML = `<div class="transcribed-text">${this.formatTranscriptText(text)}</div>`;
        content.classList.add('has-content');
      } else {
        // Show elegant prompt
        content.innerHTML = `
          <div class="transcription-prompt">
            <div class="prompt-icon">✨</div>
            <div class="prompt-text">Speak naturally and I'll capture every word...</div>
          </div>
        `;
        content.classList.remove('has-content');
      }
    }

    // Update metrics
    if (wordCount) {
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
      wordCount.textContent = `${words.length} words`;
    }
    
    if (charCount) {
      charCount.textContent = `${text.length} characters`;
    }
  }

  formatTranscriptText(text) {
    // Add subtle formatting for better readability
    return text
      .split(/(\.|!|\?)\s+/)
      .map((segment, index) => {
        if (segment.match(/[.!?]/)) {
          return `<span class="sentence-end">${segment}</span>`;
        }
        return segment;
      })
      .join('');
  }

  startProgressTracking() {
    const maxDuration = 15 * 60 * 1000; // 15 minutes in ms
    
    this.progressInterval = setInterval(() => {
      if (!this.isRecording || !this.startTime) return;
      
      const elapsed = Date.now() - this.startTime;
      const percentage = Math.min((elapsed / maxDuration) * 100, 100);
      
      // Update progress bar
      const progressFill = document.getElementById('progress-fill');
      if (progressFill) {
        progressFill.style.width = `${percentage}%`;
      }
      
      // Update duration display
      const durationDisplay = document.getElementById('duration-display');
      if (durationDisplay) {
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        durationDisplay.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
      }
      
      // Auto-stop at 15 minutes
      if (elapsed >= maxDuration) {
        this.pauseRecording();
        this.showToast('Maximum recording time reached. Saving automatically...', 'info');
        setTimeout(() => this.saveMemory(), 1000);
      }
    }, 1000);
  }

  startAudioVisualization() {
    const visualizer = document.getElementById('audio-viz');
    if (!visualizer) return;

    visualizer.classList.add('active');
    
    // Clean, minimal visualization
    this.visualizerInterval = setInterval(() => {
      const bars = visualizer.querySelectorAll('.viz-bar');
      bars.forEach((bar, index) => {
        // Create wave-like pattern
        const baseHeight = Math.sin((Date.now() * 0.002) + (index * 0.8)) * 0.4 + 0.6;
        const randomVariation = Math.random() * 0.3;
        const height = Math.max(0.2, Math.min(1, baseHeight + randomVariation));
        
        bar.style.transform = `scaleY(${height})`;
      });
    }, 120);
  }

  stopAudioVisualization() {
    const visualizer = document.getElementById('audio-viz');
    if (visualizer) {
      visualizer.classList.remove('active');
    }
    
    if (this.visualizerInterval) {
      clearInterval(this.visualizerInterval);
      this.visualizerInterval = null;
    }
  }

  updateAudioQuality() {
    const qualityBars = document.querySelectorAll('.quality-bars .bar');
    if (!qualityBars.length) return;
    
    // Simulate audio quality detection (in real implementation, use actual audio analysis)
    const quality = 0.7 + Math.random() * 0.3; // 70-100% quality range
    const activeBars = Math.ceil(quality * qualityBars.length);
    
    qualityBars.forEach((bar, index) => {
      if (index < activeBars) {
        bar.classList.add('active');
      } else {
        bar.classList.remove('active');
      }
    });
  }

  enableFocusMode() {
    if (this.focusModeActive) return;
    
    this.focusModeActive = true;
    document.body.classList.add('voice-capture-focus');
    
    // Add styles for focus mode
    if (!document.getElementById('voice-capture-focus-styles')) {
      const style = document.createElement('style');
      style.id = 'voice-capture-focus-styles';
      style.textContent = `
        body.voice-capture-focus .info-panel,
        body.voice-capture-focus .welcome-text,
        body.voice-capture-focus .quick-stats,
        body.voice-capture-focus .radial-menu {
          opacity: 0.3 !important;
          filter: blur(2px) !important;
          pointer-events: none !important;
          transition: all 0.3s ease !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  disableFocusMode() {
    if (!this.focusModeActive) return;
    
    this.focusModeActive = false;
    document.body.classList.remove('voice-capture-focus');
  }

  startInitialPrompt() {
    setTimeout(() => {
      const hintElement = document.querySelector('.hint');
      if (hintElement && !this.isRecording) {
        hintElement.textContent = "Try one of the suggestions below, or just start talking!";
      }
    }, 1000);
  }

  async createMemoryCapsule() {
    const now = new Date();
    const duration = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
    const words = this.transcript.trim().split(/\s+/).filter(word => word.length > 0);
    
    return {
      id: `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'voice_capture',
      title: this.generateTitleFromTranscript(this.transcript),
      content: this.transcript.trim(),
      timestamp: now.toISOString(),
      privacy: 'private',
      metadata: {
        source: 'voice_capture',
        duration: duration,
        wordCount: words.length,
        captureMode: this.currentMode,
        version: '1.0'
      },
      transcription: {
        raw: this.transcript,
        cleaned: this.cleanTranscript(this.transcript),
        confidence: 'high' // Could be improved with actual confidence scores
      },
      attachments: [],
      tags: this.extractTagsFromTranscript(this.transcript)
    };
  }

  generateTitleFromTranscript(transcript) {
    const cleaned = transcript.trim();
    if (cleaned.length <= 50) {
      return cleaned;
    }
    
    // Extract first meaningful phrase or sentence
    const sentences = cleaned.split(/[.!?]+/);
    const firstSentence = sentences[0].trim();
    
    if (firstSentence.length <= 50) {
      return firstSentence;
    }
    
    // Fallback to first 47 characters + "..."
    return cleaned.substring(0, 47) + '...';
  }

  cleanTranscript(transcript) {
    return transcript
      .trim()
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .replace(/\b(um|uh|er|ah)\b/gi, '') // Remove filler words
      .replace(/\s+/g, ' ') // Clean up spaces again
      .trim();
  }

  extractTagsFromTranscript(transcript) {
    const tags = [];
    const text = transcript.toLowerCase();
    
    // Simple keyword extraction - could be enhanced with NLP
    const timeKeywords = ['today', 'yesterday', 'morning', 'evening', 'weekend'];
    const emotionKeywords = ['happy', 'sad', 'excited', 'worried', 'grateful'];
    const familyKeywords = ['mom', 'dad', 'mother', 'father', 'family', 'kids', 'children'];
    
    timeKeywords.forEach(keyword => {
      if (text.includes(keyword)) tags.push(keyword);
    });
    
    emotionKeywords.forEach(keyword => {
      if (text.includes(keyword)) tags.push(keyword);
    });
    
    familyKeywords.forEach(keyword => {
      if (text.includes(keyword)) tags.push('family');
    });
    
    return [...new Set(tags)]; // Remove duplicates
  }

  async saveToVault(memory) {
    console.log('🎤 Saving memory to vault:', memory);
    
    try {
      // Try to integrate with Emma's vault system if available
      if (window.VaultStorage) {
        const vaultStorage = new window.VaultStorage();
        await vaultStorage.saveMemory({
          content: memory.content,
          metadata: {
            ...memory.metadata,
            title: memory.title,
            tags: memory.tags,
            transcription: memory.transcription
          },
          source: 'voice_capture',
          type: 'voice_memory',
          attachments: memory.attachments || []
        });
        console.log('🎤 Memory saved to vault successfully');
      } 
      // Fallback to browser extension storage
      else if (chrome && chrome.runtime) {
        await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: 'saveVoiceMemory',
            memory: memory
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (response && response.success) {
              resolve(response);
            } else {
              reject(new Error('Failed to save memory via extension'));
            }
          });
        });
        console.log('🎤 Memory saved via extension successfully');
      }
      // Final fallback to localStorage
      else {
        const savedMemories = JSON.parse(localStorage.getItem('emma_voice_memories') || '[]');
        savedMemories.push(memory);
        localStorage.setItem('emma_voice_memories', JSON.stringify(savedMemories));
        console.log('🎤 Memory saved to localStorage as fallback');
      }
    } catch (error) {
      console.error('🎤 Primary save failed, using localStorage fallback:', error);
      // Always ensure we save the memory somewhere
      const savedMemories = JSON.parse(localStorage.getItem('emma_voice_memories') || '[]');
      savedMemories.push(memory);
      localStorage.setItem('emma_voice_memories', JSON.stringify(savedMemories));
    }
  }

  handleRecognitionError(error) {
    console.error('🎤 Recognition error:', error);
    
    let message = 'Voice recognition error occurred.';
    
    switch (error) {
      case 'not-allowed':
        message = 'Microphone access denied. Please allow microphone access and try again.';
        break;
      case 'no-speech':
        message = 'No speech detected. Please try speaking again.';
        break;
      case 'network':
        message = 'Network error. Voice recognition may not work offline.';
        break;
      case 'audio-capture':
        message = 'Audio capture failed. Please check your microphone.';
        break;
    }
    
    this.showToast(message, 'error');
    this.pauseRecording();
  }

  showFallbackUI() {
    // Show text input fallback when voice is not available
    console.log('🎤 Showing fallback text input');
    this.showToast('Voice recognition not available. Please type your memory instead.', 'info');
    // Could implement text input fallback here
  }

  showToast(message, type = 'info') {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = `voice-toast voice-toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#ff4757' : type === 'success' ? '#2ed573' : '#5352ed'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 5000);
  }

  cleanup() {
    // Clean up intervals and listeners
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    
    if (this.visualizerInterval) {
      clearInterval(this.visualizerInterval);
      this.visualizerInterval = null;
    }
    
    // Remove keyboard shortcuts listener
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler, true);
      this.keyboardHandler = null;
    }
    
    // Stop recognition
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
    }
    
    // Clean up WebGL orb
    if (this.webglOrb && this.webglOrb.dispose) {
      this.webglOrb.dispose();
      this.webglOrb = null;
    }
    
    // Disable focus mode
    this.disableFocusMode();
    
    // Remove focus mode styles
    const styleElement = document.getElementById('voice-capture-focus-styles');
    if (styleElement) {
      styleElement.remove();
    }
    
    super.cleanup();
  }
}

// Export for use in other modules
window.VoiceCaptureExperience = VoiceCaptureExperience;
console.log('🎤 Voice Capture Experience: Module loaded successfully');
