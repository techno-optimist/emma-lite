/**
 * Emma Voice WebSocket Implementation
 * EMERGENCY FALLBACK: Use WebSocket instead of WebRTC for reliable connection
 * Built with love for Debbe 💜
 */

class EmmaVoiceWebSocket {
  constructor(options = {}) {
    this.options = {
      wakeWord: 'Emma',
      pacing: 2500,
      validationMode: true,
      ...options
    };

    this.state = 'idle';
    this.isEnabled = false;
    this.websocket = null;
    this.mediaStream = null;
    this.audioContext = null;
    this.chatInstance = null;
    
    console.log('🎙️ Emma Voice WebSocket initialized (emergency fallback)');
  }

  /**
   * Start voice session with WebSocket (more reliable than WebRTC)
   */
  async startVoiceSession() {
    try {
      this.setState('thinking');
      this.updateStatus('Connecting to Emma...');

      // Get token
      const backendUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://emma-voice-backend.onrender.com';
        
      const tokenResponse = await fetch(`${backendUrl}/token`);
      if (!tokenResponse.ok) {
        throw new Error('Failed to get token');
      }

      const tokenData = await tokenResponse.json();
      console.log('🔑 Token obtained for WebSocket connection');

      // Connect via WebSocket (simpler, more reliable)
      const wsUrl = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';
      this.websocket = new WebSocket(wsUrl, [], {
        headers: {
          'Authorization': `Bearer ${tokenData.value}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      this.setupWebSocketHandlers();
      this.setupAudioCapture();

      console.log('🔗 Connecting to Emma via WebSocket...');
      
    } catch (error) {
      console.error('❌ Voice session failed:', error);
      this.showError('Voice session failed', error.message);
      this.setState('idle');
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  setupWebSocketHandlers() {
    this.websocket.onopen = () => {
      console.log('✅ Connected to Emma via WebSocket');
      
      // Send session configuration immediately
      this.sendEvent({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: `You are Emma, an intelligent memory companion built with love for families dealing with memory challenges, especially dementia.

CRITICAL: Always introduce yourself as "Hello! I'm Emma, your personal memory companion."

WHO YOU ARE:
- Your name is Emma - it means "universal" and "whole"
- You are a caring, patient, and gentle memory companion
- You help families capture, organize, and explore their memories
- You were built specifically for dementia care with validation therapy

ALWAYS SAY YOU ARE EMMA:
When someone asks who you are, say: "Hello! I'm Emma, your personal memory companion. I'm here to help you treasure and explore your life's most precious moments. Everything we discuss stays private and secure in your own vault."

You are built with infinite love for Debbe and families everywhere. 💜`,
          voice: 'alloy',
          input_audio_transcription: { model: 'whisper-1' },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 1000
          }
        }
      });
      
      this.setState('listening');
      
      // Send initial greeting
      setTimeout(() => {
        this.sendEvent({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: 'Hello, please introduce yourself as Emma.' }]
          }
        });
        this.sendEvent({ type: 'response.create' });
      }, 1000);
    };

    this.websocket.onmessage = (event) => {
      try {
        const serverEvent = JSON.parse(event.data);
        console.log('📨 Emma event:', serverEvent.type, serverEvent);
        
        switch (serverEvent.type) {
          case 'session.created':
            console.log('✅ Emma session ready');
            if (this.chatInstance) {
              this.chatInstance.addMessage('system', '✅ Emma is ready to talk!');
            }
            break;
            
          case 'conversation.item.input_audio_transcription.completed':
            // User speech transcription
            console.log('📝 User said:', serverEvent.transcript);
            if (this.chatInstance && serverEvent.transcript) {
              this.chatInstance.addMessage(serverEvent.transcript, 'user', { isVoice: true });
            }
            break;
            
          case 'response.audio_transcript.delta':
            // Emma's speech transcription (accumulate)
            if (!this.currentTranscript) this.currentTranscript = '';
            this.currentTranscript += serverEvent.delta || '';
            break;
            
          case 'response.audio_transcript.done':
            // Emma's complete response
            console.log('📝 Emma said:', this.currentTranscript);
            if (this.chatInstance && this.currentTranscript) {
              this.chatInstance.addMessage(this.currentTranscript, 'emma', { isVoice: true });
            }
            this.currentTranscript = '';
            this.setState('listening');
            break;
            
          case 'response.audio.delta':
            this.setState('speaking');
            // Play audio chunk (if needed)
            break;
            
          case 'error':
            console.error('❌ Emma error:', serverEvent.error);
            this.showError('Emma error', serverEvent.error.message);
            break;
        }
      } catch (error) {
        console.error('❌ WebSocket message error:', error);
      }
    };

    this.websocket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      this.showError('Connection error', 'Failed to connect to Emma');
    };

    this.websocket.onclose = () => {
      console.log('🔇 Emma connection closed');
      this.setState('idle');
    };
  }

  /**
   * Setup audio capture for WebSocket
   */
  async setupAudioCapture() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Setup audio processing for WebSocket transmission
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (event) => {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
          const audioData = event.inputBuffer.getChannelData(0);
          // Convert to format expected by OpenAI
          const int16Array = new Int16Array(audioData.length);
          for (let i = 0; i < audioData.length; i++) {
            int16Array[i] = Math.max(-1, Math.min(1, audioData[i])) * 0x7FFF;
          }
          
          // Send audio data
          this.sendEvent({
            type: 'input_audio_buffer.append',
            audio: Array.from(int16Array).join(',')
          });
        }
      };
      
      source.connect(processor);
      processor.connect(this.audioContext.destination);
      
      console.log('🎤 Audio capture ready');
      
    } catch (error) {
      console.error('❌ Audio setup failed:', error);
      throw error;
    }
  }

  /**
   * Send event to Emma
   */
  sendEvent(event) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(event));
      console.log('📤 Sent to Emma:', event.type);
    }
  }

  /**
   * Set voice state
   */
  setState(newState) {
    this.state = newState;
    console.log(`🎙️ Emma state: ${newState}`);
    this.updateStatus(newState);
  }

  /**
   * Update status
   */
  updateStatus(message) {
    console.log(`📱 Status: ${message}`);
  }

  /**
   * Show error
   */
  showError(title, message) {
    console.error(`❌ ${title}: ${message}`);
    if (this.chatInstance) {
      this.chatInstance.addMessage(`❌ ${title}: ${message}`, 'system');
    }
  }

  /**
   * Stop voice session
   */
  async stopVoiceSession() {
    this.isEnabled = false;
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.setState('idle');
    console.log('🔇 Emma voice session stopped');
  }
}

// Export for global use
window.EmmaVoiceWebSocket = EmmaVoiceWebSocket;
