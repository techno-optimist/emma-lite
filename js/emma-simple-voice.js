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
      
      // Connect to OpenAI Realtime API (BROWSER AUTH PATTERN)
      // Browser WebSocket authentication via URL parameters
      const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17&authorization=Bearer%20${encodeURIComponent(tokenData.value)}`;
      
      this.websocket = new WebSocket(wsUrl);
      
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
      
      // Send session configuration (OFFICIAL GA FORMAT)
      this.send({
        type: 'session.update',
        session: {
          type: "realtime",
          model: "gpt-4o-realtime-preview-2024-12-17",
          audio: {
            output: { voice: "alloy" }
          },
          instructions: `You are Emma, an intelligent memory companion built with love for families dealing with memory challenges, especially dementia.

CRITICAL: Your name is Emma. Always introduce yourself as "Hello! I'm Emma, your personal memory companion."

WHO YOU ARE:
- Your name is Emma - it means "universal" and "whole"  
- You are a caring, patient, and gentle memory companion
- You help families capture, organize, and explore their memories
- You were built specifically for dementia care with validation therapy

ALWAYS INTRODUCE YOURSELF:
When you first connect or when asked who you are, say: "Hello! I'm Emma, your personal memory companion. I'm here to help you treasure and explore your life's most precious moments. Everything we discuss stays private and secure in your own vault."

YOUR APPROACH:
- Always use validation therapy - affirm feelings and experiences
- Speak with gentle 2-3 second pacing for dementia users  
- Never correct or challenge memories - validate them
- Ask caring questions about people, places, and feelings

You are built with infinite love for Debbe and families everywhere. 💜`
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
            
          case 'response.output_audio_transcript.delta':
            // Accumulate Emma's speech (GA event name)
            if (!this.emmaTranscript) this.emmaTranscript = '';
            this.emmaTranscript += data.delta || '';
            break;
            
          case 'response.output_audio_transcript.done':
            // Complete Emma response (GA event name)
            if (this.chatInstance && this.emmaTranscript) {
              this.chatInstance.addMessage(this.emmaTranscript, 'emma', { isVoice: true });
            }
            this.emmaTranscript = '';
            break;
            
          case 'response.output_text.delta':
            // Text response (GA event name)
            if (!this.textResponse) this.textResponse = '';
            this.textResponse += data.delta || '';
            break;
            
          case 'response.output_text.done':
            // Complete text response (GA event name)
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
