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
          // Immediately stop tracks; we use Web Speech for transcription
          stream.getTracks().forEach(t => t.stop());
        }
      } catch (permErr) {
        console.warn('⚠️ Mic permission not granted:', permErr?.message || permErr);
      }

      // Start speech recognition for user input
      await this.startListening();
      
    } catch (error) {
      console.error('❌ Voice session failed:', error);
      this.showError('Voice session failed', error.message);
      this.setState('idle');
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

      let partial = '';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.setState('listening');
        if (this.chatInstance) {
          this.chatInstance.addMessage('system', '🎤 Mic is on');
        }
      };

      this.recognition.onerror = (e) => {
        console.warn('🎤 Recognition error:', e.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        // Restart automatically during active session
        if (this.isConnected) {
          setTimeout(() => this.recognition && this.recognition.start(), 250);
        }
      };

      this.recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0].transcript.trim();
          if (res.isFinal) {
            // Show user transcript and send to Emma
            if (this.chatInstance && text) {
              this.chatInstance.addMessage(text, 'user', { isVoice: true });
            }
            this.sendToAgent({ type: 'user_text', text });
            partial = '';
          } else {
            partial = text;
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
              this.chatInstance.addMessage(message.transcript, 'emma', { isVoice: true });
            }
            // Speak Emma's response locally (privacy-first)
            if (message.transcript) {
              this.speak(message.transcript);
            }
            break;
            
          case 'state_change':
            this.setState(message.state);
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
        
      case 'create_memory_from_voice':
        if (result.success) {
          this.chatInstance.addMessage('system', `💭 New memory created: "${params.content.substring(0, 50)}..."`, {
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
      if (message && this.chatInstance.typingIndicator) {
        const span = this.chatInstance.typingIndicator.querySelector('span');
        if (span) {
          span.textContent = message;
          this.chatInstance.typingIndicator.style.display = message ? 'block' : 'none';
        }
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
}

// Export for global use
window.EmmaBrowserClient = EmmaBrowserClient;
