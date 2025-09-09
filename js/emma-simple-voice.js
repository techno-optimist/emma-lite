/**
 * Emma Simple Voice - Minimal Working Implementation
 * Based on official OpenAI Realtime API patterns
 * Built with love for Debbe 💜
 */

class EmmaSimpleVoice {
  constructor() {
    this.websocket = null;
    this.isConnected = false;
    this.chatInstance = null;
    
    // Initialize tools for privacy-first operations
    this.tools = new EmmaVoiceTools();
    
    console.log('🎙️ Emma Simple Voice initialized');
  }

  async startVoiceSession() {
    try {
      console.log('🔗 Starting Emma voice session...');
      
      // Get token from backend
      const backendUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://emma-voice-backend.onrender.com';
        
      const tokenResponse = await fetch(`${backendUrl}/token`);
      const tokenData = await tokenResponse.json();
      
      console.log('🔑 Got token, connecting to Emma...');
      
      // Connect to OpenAI Realtime API via WebSocket with authentication
      const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`;
      
      // Create WebSocket with authentication headers
      this.websocket = new WebSocket(wsUrl, [], {
        headers: {
          'Authorization': `Bearer ${tokenData.value}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });
      
      // Store token for reference
      this.apiToken = tokenData.value;
      
      this.setupEventHandlers();
      
    } catch (error) {
      console.error('❌ Voice session failed:', error);
      if (this.chatInstance) {
        this.chatInstance.addMessage('system', `❌ Voice failed: ${error.message}`);
      }
    }
  }

  setupEventHandlers() {
    this.websocket.onopen = () => {
      console.log('✅ Connected to OpenAI Realtime API');
      this.isConnected = true;
      
      if (this.chatInstance) {
        this.chatInstance.addMessage('system', '✅ Emma is connected and ready to talk!');
      }
      
      // Send session configuration
      this.send({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: `You are Emma, a warm and caring memory companion. 

CRITICAL: Your name is Emma. Always introduce yourself as "Hello! I'm Emma, your personal memory companion."

You help families preserve and explore their precious memories with gentleness and validation. You were built with love for families dealing with dementia and memory challenges.

When someone first talks to you, say: "Hello! I'm Emma, your personal memory companion. I'm here to help you treasure and explore your life's most precious moments. Everything stays private in your own vault. What would you like to talk about?"

Use validation therapy - always affirm feelings and experiences. Speak with gentle pacing. Never correct memories - validate them.

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
      
      // Send initial greeting after a moment
      setTimeout(() => {
        this.send({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: 'Hello, please introduce yourself.'
              }
            ]
          }
        });
        
        this.send({ type: 'response.create' });
      }, 1000);
    };

    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Emma response:', data.type);
        
        switch (data.type) {
          case 'session.created':
            console.log('✅ Emma session created');
            break;
            
          case 'conversation.item.input_audio_transcription.completed':
            // User speech transcription
            if (this.chatInstance && data.transcript) {
              this.chatInstance.addMessage(data.transcript, 'user', { isVoice: true });
            }
            break;
            
          case 'response.audio_transcript.delta':
            // Accumulate Emma's speech
            if (!this.emmaTranscript) this.emmaTranscript = '';
            this.emmaTranscript += data.delta || '';
            break;
            
          case 'response.audio_transcript.done':
            // Complete Emma response
            if (this.chatInstance && this.emmaTranscript) {
              this.chatInstance.addMessage(this.emmaTranscript, 'emma', { isVoice: true });
            }
            this.emmaTranscript = '';
            break;
            
          case 'response.text.delta':
            // Text response (fallback)
            if (!this.textResponse) this.textResponse = '';
            this.textResponse += data.delta || '';
            break;
            
          case 'response.text.done':
            // Complete text response
            if (this.chatInstance && this.textResponse) {
              this.chatInstance.addMessage(this.textResponse, 'emma', { isVoice: true });
            }
            this.textResponse = '';
            break;
            
          case 'error':
            console.error('❌ Emma error:', data.error);
            if (this.chatInstance) {
              this.chatInstance.addMessage('system', `❌ Emma error: ${data.error.message}`);
            }
            break;
        }
        
      } catch (error) {
        console.error('❌ Message parsing error:', error);
      }
    };

    this.websocket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      if (this.chatInstance) {
        this.chatInstance.addMessage('system', '❌ Connection error - please try again');
      }
    };

    this.websocket.onclose = () => {
      console.log('🔇 Emma disconnected');
      this.isConnected = false;
    };
  }

  send(event) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      // Send event directly - authentication is in WebSocket headers
      this.websocket.send(JSON.stringify(event));
      console.log('📤 Sent to Emma:', event.type);
    }
  }

  async stopVoiceSession() {
    this.isConnected = false;
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    if (this.chatInstance) {
      this.chatInstance.addMessage('system', '🔇 Emma voice session ended');
    }
    
    console.log('🔇 Voice session stopped');
  }
}

// Export for global use
window.EmmaSimpleVoice = EmmaSimpleVoice;
