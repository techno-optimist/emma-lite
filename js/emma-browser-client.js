/**
 * Emma Browser Client
 * PRODUCTION-READY: Connects to server-side Emma RealtimeAgent
 * Built with infinite love for Debbe and families everywhere 💜
 */

class EmmaBrowserClient {
  constructor(options = {}) {
    this.options = {
      voice: 'alloy',
      speed: 1.0,
      tone: 'caring',
      pacing: 2.5,
      validationMode: true,
      ...options
    };

    // State management
    this.state = 'idle';
    this.isConnected = false;
    this.websocket = null;
    this.chatInstance = null;
    
    // Privacy-first tools (for local execution)
    this.tools = new EmmaVoiceTools();
    
    console.log('🎙️ Emma Browser Client initialized');

    // Web Speech: recognition (input) and synthesis (output)
    this.recognition = null;
    this.isListening = false;
    this.synth = window.speechSynthesis || null;
    this.audioWorkletNode = null;
    this.audioContext = null;
    this.lastEmmaText = '';
  }

  /**
   * Start voice session with server-side Emma agent
   */
  async startVoiceSession() {
    try {
      this.setState('connecting');
      
      // Connect to Emma backend
      await this.connectToEmmaAgent();
      
      console.log('🎙️ Emma voice session started');

      // Request mic permission (shows browser mic indicator)
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Keep stream open for VU/meter and optional PCM streaming
          await this.setupPcmStreaming(stream);
        }
      } catch (permErr) {
        console.warn('⚠️ Mic permission not granted:', permErr?.message || permErr);
      }

      // Start responsive speech recognition for real-time conversation
      await this.startListening();
      // Note: Disabled real-time audio streaming due to Whisper API format issues
      // Using optimized Speech Recognition for better responsiveness
      
    } catch (error) {
      console.error('❌ Voice session failed:', error);
      this.showError('Voice session failed', error.message);
      this.setState('idle');
    }
  }
  /**
   * Set up AudioWorklet to capture PCM16 mono 24kHz and send to server in chunks
   */
  async setupPcmStreaming(mediaStream) {
    try {
      if (!window.AudioWorkletNode || !window.AudioContext) return;
      this.audioContext = this.audioContext || new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
      const source = this.audioContext.createMediaStreamSource(mediaStream);

      // Inline processor via AudioWorklet
      const processorCode = `
        class EmmaPcmProcessor extends AudioWorkletProcessor {
          constructor() {
            super();
            this.buffer = [];
            this.downsampleFactor = sampleRate / 24000;
            this.accumulator = 0;
            this.sampleHold = 0;
          }
          process(inputs) {
            const input = inputs[0];
            if (!input || input.length === 0) return true;
            const channel = input[0];
            for (let i = 0; i < channel.length; i++) {
              this.accumulator += 1;
              // Simple downsample by hold (nearest) to 24kHz
              if (this.accumulator >= this.downsampleFactor) {
                this.accumulator -= this.downsampleFactor;
                let s = Math.max(-1, Math.min(1, channel[i]));
                const int16 = s < 0 ? s * 0x8000 : s * 0x7FFF;
                this.buffer.push(int16);
              }
            }
            if (this.buffer.length >= 24000) {
              const pcm16 = new Int16Array(this.buffer);
              // Convert to base64 without btoa (not available in worklet)
              const bytes = new Uint8Array(pcm16.buffer);
              const base64 = this.toBase64(bytes);
              this.port.postMessage({ type: 'chunk', data: base64 });
              this.buffer = [];
            }
            return true;
          }
          toBase64(bytes) {
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
            let out = '';
            let i;
            for (i = 0; i + 2 < bytes.length; i += 3) {
              const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
              out += alphabet[(n >> 18) & 63] + alphabet[(n >> 12) & 63] + alphabet[(n >> 6) & 63] + alphabet[n & 63];
            }
            if (i < bytes.length) {
              let n = (bytes[i] << 16) | ((i + 1 < bytes.length ? bytes[i + 1] : 0) << 8);
              out += alphabet[(n >> 18) & 63] + alphabet[(n >> 12) & 63] + (i + 1 < bytes.length ? alphabet[(n >> 6) & 63] : '=') + '=';
            }
            return out;
          }
        }
        registerProcessor('emma-pcm', EmmaPcmProcessor);
      `;

      const blob = new Blob([processorCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await this.audioContext.audioWorklet.addModule(url);
      this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'emma-pcm');
      this.audioWorkletNode.port.onmessage = (e) => {
        if (e.data?.type === 'chunk') {
          this.sendToAgent({ type: 'user_audio_chunk', chunk: e.data.data });
        }
      };
      source.connect(this.audioWorkletNode);
      this.audioWorkletNode.connect(this.audioContext.destination);
    } catch (e) {
      console.warn('🎙️ PCM streaming not available:', e?.message || e);
    }
  }

  /**
   * Connect to server-side Emma agent
   */
  async connectToEmmaAgent() {
    try {
      const backendUrl = window.location.hostname === 'localhost' 
        ? 'ws://localhost:3001' 
        : 'wss://emma-voice-backend.onrender.com';
      
      const wsUrl = `${backendUrl}/voice`;
      
      console.log('🔗 Connecting to Emma agent...');
      
      this.websocket = new WebSocket(wsUrl);
      this.setupWebSocketHandlers();
      
      // Wait for connection
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);
        
        this.websocket.onopen = () => {
          clearTimeout(timeout);
          console.log('✅ Connected to Emma agent');
          this.isConnected = true;
          
          // Notify chat of connection
          if (this.chatInstance) {
            this.chatInstance.addMessage('system', '🔗 Connected to Emma backend');
          }
          
          // Start Emma session
          this.sendToAgent({
            type: 'start_session',
            config: {
              voice: this.options.voice,
              speed: this.options.speed,
              tone: this.options.tone,
              pacing: this.options.pacing
            }
          });
          
          resolve();
        };
        
        this.websocket.onerror = (error) => {
          clearTimeout(timeout);
          reject(new Error('WebSocket connection failed'));
        };
      });
      
    } catch (error) {
      console.error('❌ Emma agent connection failed:', error);
      throw error;
    }
  }

  /**
   * Start browser speech recognition and forward text to Emma
   */
  async startListening() {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('⚠️ Web Speech Recognition not supported in this browser');
        if (this.chatInstance) {
          this.chatInstance.addMessage('system', '⚠️ Speech recognition not supported in this browser');
        }
        return;
      }

      this.recognition = new SpeechRecognition();
      this.recognition.lang = (navigator.language || 'en-US');
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      let partial = '';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.setState('listening');
        if (this.chatInstance && !this._micAnnounced) {
          this._micAnnounced = true;
          this.chatInstance.addMessage('system', '🎤 Mic is on');
        }
      };

      this.recognition.onerror = (e) => {
        console.warn('🎤 Recognition error:', e.error);
        
        // Handle different error types
        if (e.error === 'network') {
          console.log('🎤 Network error - will retry recognition');
          // Don't disable, just log - network issues are temporary
        } else if (e.error === 'no-speech') {
          console.log('🎤 No speech detected - continuing to listen');
          // This is normal, don't disable
        } else if (e.error === 'audio-capture') {
          console.error('🎤 Microphone access denied');
          this._disableRecognition = true;
          if (this.chatInstance) {
            this.chatInstance.addMessage('system', '🎤 Microphone access needed for voice chat');
          }
        } else if (e.error === 'not-allowed') {
          console.error('🎤 Speech recognition not allowed');
          this._disableRecognition = true;
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        // Restart automatically during active session unless disabled
        if (this.isConnected && !this._disableRecognition) {
          setTimeout(() => this.recognition && this.recognition.start(), 600);
        }
      };

      this.recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0].transcript.trim();
          
          if (res.isFinal && text.length > 0) {
            // Show user transcript and send to Emma immediately
            if (this.chatInstance) {
              this.chatInstance.addMessage(text, 'user', { isVoice: true });
            }
            this.sendToAgent({ type: 'user_text', text });
            partial = '';
            console.log('🎤 Final speech sent to Emma:', text);
          } else if (text.length > 0) {
            // Show interim results for real-time feel
            partial = text;
            console.log('🎤 Interim speech:', text);
          }
        }
      };

      this.recognition.start();
    } catch (error) {
      console.warn('⚠️ Failed to start listening:', error?.message || error);
    }
  }

  /**
   * Speak text locally using Web Speech Synthesis
   */
  speak(text) {
    try {
      if (!this.synth) return;
      // Stop any queued utterances for snappy response
      this.synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = this.options.speed || 1.0;
      utter.pitch = 1.0;
      utter.lang = (navigator.language || 'en-US');
      this.synth.speak(utter);
    } catch (e) {
      console.warn('🔇 Speech synthesis failed:', e?.message || e);
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  setupWebSocketHandlers() {
    this.websocket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 Emma message:', message.type);
        
        switch (message.type) {
          case 'emma_ready':
            this.setState('listening');
            if (this.chatInstance) {
              if (typeof this.chatInstance.markAgentReady === 'function') {
                this.chatInstance.markAgentReady();
              }
              this.chatInstance.addMessage('system', '✅ Emma is ready to talk!');
              this.chatInstance.addMessage('system', '🎤 Say something to Emma - transcription will appear here');
            }
            break;

          case 'user_transcription':
            // Display user's speech in chat
            if (this.chatInstance && message.transcript) {
              this.chatInstance.addMessage(message.transcript, 'user', { isVoice: true });
            }
            break;
            
          case 'emma_transcription':
            // Display Emma's speech in chat
            if (this.chatInstance && message.transcript) {
              const isVoice = message.source === 'voice';
              this.chatInstance.addMessage(message.transcript, 'emma', { isVoice });
              if (typeof this.chatInstance.hideTypingIndicator === 'function') {
                this.chatInstance.hideTypingIndicator();
              }
            }
            // Store text for fallback and wait for server audio
            this.lastEmmaText = message.transcript;
            console.log('📝 Emma transcript received, waiting for server audio...');
            break;

          case 'emma_audio':
            // High-quality server-synthesized audio (mp3 base64) - PRIORITY PLAYBACK
            if (message.audio && message.encoding === 'base64/mp3') {
              try {
                console.log('🎤 Playing OpenAI TTS audio (Alloy voice)');
                
                // Method 1: Try data URL
                const audioUrl = `data:audio/mp3;base64,${message.audio}`;
                const audio = new Audio();
                audio.volume = 0.9;
                
                // Add error handling
                audio.onerror = (e) => {
                  console.warn('🔇 Data URL audio failed:', e);
                  this.playAudioFallback(message.audio);
                };
                
                audio.src = audioUrl;
                await audio.play();
                console.log('✅ OpenAI TTS audio played successfully');
                
              } catch (e) {
                console.warn('🔇 Primary audio playback failed:', e?.message || e);
                this.playAudioFallback(message.audio);
              }
            }
            break;
            
          case 'state_change':
            this.setState(message.state);
            if (this.chatInstance) {
              if (message.state === 'thinking' && typeof this.chatInstance.showTypingIndicator === 'function') {
                this.chatInstance.showTypingIndicator();
              }
              if ((message.state === 'speaking' || message.state === 'listening') &&
                  typeof this.chatInstance.hideTypingIndicator === 'function') {
                this.chatInstance.hideTypingIndicator();
              }
            }
            break;
            
          case 'tool_request':
            // Execute tool locally (privacy-first)
            await this.handleToolRequest(message);
            break;
            
          case 'error':
            console.error('❌ Emma error:', message.message);
            this.showError('Emma error', message.message);
            break;
            
          case 'session_ended':
            this.setState('idle');
            if (this.chatInstance) {
              this.chatInstance.addMessage('system', '🔇 Emma session ended');
            }
            break;
        }
        
      } catch (error) {
        console.error('❌ WebSocket message error:', error);
      }
    };

    this.websocket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      this.showError('Connection error', 'Lost connection to Emma');
    };

    this.websocket.onclose = () => {
      console.log('🔇 Emma agent connection closed');
      this.isConnected = false;
      this.setState('idle');
      if (this.chatInstance && typeof this.chatInstance.markAgentDisconnected === 'function') {
        this.chatInstance.markAgentDisconnected();
      }
    };
  }

  /**
   * Handle tool requests from Emma agent (privacy-first execution)
   */
  async handleToolRequest(message) {
    try {
      const { call_id, tool_name, parameters } = message;
      console.log(`🔧 Executing ${tool_name} locally (privacy-first)`);
      
      // Execute tool locally in browser
      const result = await this.tools.execute(tool_name, parameters);
      
      // Send result back to Emma agent
      this.sendToAgent({
        type: 'tool_result',
        call_id: call_id,
        result: JSON.stringify(result)
      });
      
      // Display tool results in chat
      this.displayToolResult(tool_name, parameters, result);
      
    } catch (error) {
      console.error('❌ Tool execution error:', error);
      
      // Send error back to Emma
      this.sendToAgent({
        type: 'tool_result',
        call_id: message.call_id,
        result: JSON.stringify({ error: error.message })
      });
    }
  }

  /**
   * Display tool results visually in chat
   */
  displayToolResult(toolName, params, result) {
    if (!this.chatInstance) return;

    if (result && result.error) {
      this.chatInstance.addMessage(`⚠️ ${result.error}`, 'system');
      return;
    }

    switch (toolName) {
      case 'get_people':
        if (result.people && result.people.length > 0) {
          this.chatInstance.displayPeopleResults(result.people);
        }
        break;

      case 'get_memories':
        if (result.memories && result.memories.length > 0) {
          this.chatInstance.displayMemoryResults(result.memories);
        }
        break;

      case 'summarize_memory':
        if (result.summary) {
          this.chatInstance.addMessage(`📝 Here's a gentle summary: ${result.summary}`, 'emma');
        }
        break;

      case 'create_memory_from_voice':
        if (result.success) {
          this.chatInstance.addMessage('system', `💭 New memory created: "${params.content.substring(0, 50)}..."`, {
            type: 'memory-created',
            memoryId: result.memoryId
          });
        }
        break;

      case 'create_memory_capsule':
        if (result.success) {
          const label = result.title || params.title || params.content?.substring(0, 50) || 'New memory';
          this.chatInstance.addMessage('system', `💾 Saved memory: "${label}"`, {
            type: 'memory-created',
            memoryId: result.memoryId
          });
        }
        break;

      case 'update_person':
        if (result.success) {
          this.chatInstance.addMessage('system', `👤 Updated ${result.personName} with new details`, {
            type: 'person-updated'
          });
        }
        break;

      case 'create_person_profile':
        if (result.success) {
          this.chatInstance.addMessage('system', `👤 Added ${result.personName} to your people`, {
            type: 'person-created',
            personId: result.personId
          });
        }
        break;

      case 'update_memory_capsule':
        if (result.success) {
          const fields = result.updatedFields?.length
            ? result.updatedFields.join(', ')
            : 'memory details';
          this.chatInstance.addMessage('system', `📝 Updated ${fields} for your memory`, {
            type: 'memory-updated',
            memoryId: result.memoryId
          });
        }
        break;

      case 'attach_memory_media':
        if (result.success) {
          const count = result.attachmentCount ?? (params.media?.length || 0);
          this.chatInstance.addMessage('system', `📎 Added ${count} new ${count === 1 ? 'attachment' : 'attachments'} to your memory`, {
            type: 'memory-media-added',
            memoryId: result.memoryId
          });
        }
        break;
    }
  }

  /**
   * Send message to Emma agent
   */
  sendToAgent(message) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
      console.log('📤 Sent to Emma:', message.type);
    }
  }

  /**
   * Set state with UI updates
   */
  setState(newState) {
    if (this.state === newState) return;
    
    const oldState = this.state;
    this.state = newState;
    
    console.log(`🎙️ Emma: ${oldState} → ${newState}`);
    
    // Update chat status
    if (this.chatInstance) {
      const statusMessages = {
        idle: '',
        connecting: '🔗 Connecting to Emma...',
        listening: '👂 Emma is listening...',
        thinking: '🤔 Emma is thinking...',
        speaking: '🗣️ Emma is speaking...'
      };
      
      const message = statusMessages[newState];
      if (this.chatInstance.typingIndicator) {
        const span = this.chatInstance.typingIndicator.querySelector('span');
        if (span && message) {
          span.textContent = message;
        }
        this.chatInstance.typingIndicator.style.display = message ? 'flex' : 'none';
      }
    }
  }

  /**
   * Show error with dementia-friendly messaging
   */
  showError(title, message) {
    const friendlyMessage = this.options.validationMode 
      ? `${title}. That's okay, these things happen. ${message}`
      : `${title}: ${message}`;
      
    if (this.chatInstance) {
      this.chatInstance.addMessage('system', `❌ ${friendlyMessage}`);
    }
    
    console.error(`❌ ${title}:`, message);
  }

  /**
   * Stop voice session
   */
  async stopVoiceSession() {
    try {
      this.isConnected = false;
      this.setState('idle');
      
      // Send stop message to agent
      this.sendToAgent({ type: 'stop_session' });
      
      // Close WebSocket
      if (this.websocket) {
        this.websocket.close();
        this.websocket = null;
      }
      
      if (this.chatInstance) {
        this.chatInstance.addMessage('system', '🔇 Emma voice session ended');
      }
      
      console.log('🔇 Voice session stopped cleanly');
      
    } catch (error) {
      console.error('❌ Voice session cleanup error:', error);
    }
  }

  /**
   * Update voice settings
   */
  updateVoiceSettings(newSettings) {
    this.options = { ...this.options, ...newSettings };
    
    // Send settings update to agent
    if (this.isConnected) {
      this.sendToAgent({
        type: 'voice_settings',
        settings: newSettings
      });
    }
    
    console.log('🎛️ Voice settings updated:', newSettings);
  }

  /**
   * Fallback audio playback using Blob URL (CSP-friendly)
   */
  /**
   * Start real-time audio streaming for true conversation
   */
  async startRealtimeAudioStreaming() {
    try {
      console.log('🎙️ Starting real-time audio streaming...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('⚠️ Real-time audio not supported');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create audio context for real-time processing
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      const source = this.audioContext.createMediaStreamSource(stream);
      
      // Create a script processor for real-time audio chunks
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (event) => {
        if (!this.isConnected) return;
        
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Convert float32 to int16 PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Convert to base64 and send
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        
        // Send real-time audio chunk
        this.sendToAgent({
          type: 'realtime_audio_chunk',
          chunk: base64
        });
      };
      
      source.connect(processor);
      processor.connect(this.audioContext.destination);
      
      console.log('✅ Real-time audio streaming active');
      
    } catch (error) {
      console.warn('⚠️ Real-time audio streaming failed:', error?.message || error);
    }
  }

  playAudioFallback(base64Audio) {
    try {
      console.log('🎤 Trying Blob URL fallback for audio playback');
      
      // Convert base64 to blob
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const blobUrl = URL.createObjectURL(blob);
      
      const audio = new Audio(blobUrl);
      audio.volume = 0.9;
      
      audio.onended = () => {
        URL.revokeObjectURL(blobUrl);
        console.log('✅ Blob audio played and cleaned up');
      };
      
      audio.onerror = (e) => {
        console.warn('🔇 Blob audio also failed:', e);
        URL.revokeObjectURL(blobUrl);
        // Final fallback to browser TTS
        this.speak(this.lastEmmaText || 'I\'m having trouble with my voice right now.');
      };
      
      audio.play();
      
    } catch (e) {
      console.error('🔇 Blob fallback failed:', e?.message || e);
      // Final fallback to browser TTS
      this.speak(this.lastEmmaText || 'I\'m having trouble with my voice right now.');
    }
  }
}

// Export for global use
window.EmmaBrowserClient = EmmaBrowserClient;
