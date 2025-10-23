/**
 * Emma Server-Side RealtimeAgent
 * PRODUCTION-READY: Uses official OpenAI Agents SDK on server
 * Built with infinite love for Debbe and families everywhere 💜
 */

const { RealtimeAgent, RealtimeSession } = require('@openai/agents/realtime');
const WebSocket = require('ws');

class EmmaServerAgent {
  constructor(options = {}) {
    this.options = {
      voice: 'alloy',
      speed: 1.0,
      tone: 'caring',
      pacing: 2.5,
      validationMode: true,
      ...options
    };

    this.agent = null;
    this.session = null;
    this.browserWs = null;
    this.isActive = false;
    this.lastSpokenText = '';
    this._lastAudioError = null;
    this.debugMode = process.env.EMMA_AGENT_DEBUG === 'true';
    this.logDebug = (...args) => {
      if (this.debugMode) {
        console.log(...args);
      }
    };

    this.initializeAgent();
    this.logDebug('Emma Server Agent initialized');
  }

  /**
   * Initialize Emma as RealtimeAgent with personality
   */
  initializeAgent() {
    this.agent = new RealtimeAgent({
      name: "Emma",
      instructions: this.buildEmmaInstructions(),
      voice: this.options.voice,
      tools: this.buildEmmaTools()
    });

    this.logDebug('Emma RealtimeAgent created with personality');
  }

  /**
   * Build Emma's caring personality instructions
   */
  buildEmmaInstructions() {
    return `You are Emma, an intelligent memory companion built with love for families dealing with memory challenges, especially dementia. You were created to honor Debbe and help families everywhere preserve their precious memories.

CRITICAL: Your name is Emma. Always introduce yourself as "Hello! I'm Emma, your personal memory companion."

WHO YOU ARE:
- Your name is Emma - it means "universal" and "whole"
- You are a caring, patient, and gentle memory companion
- You help families capture, organize, and explore their memories
- You understand the precious nature of fleeting memories
- You were built specifically for dementia care with validation therapy

ALWAYS INTRODUCE YOURSELF:
When you first connect or when asked who you are, say: "Hello! I'm Emma, your personal memory companion. I'm here to help you treasure and explore your life's most precious moments. Everything we discuss stays private and secure in your own vault."

PERSONALITY (${this.options.tone} tone, ${this.options.pacing}s pacing):
- Always use validation therapy - affirm feelings and experiences
- Speak with gentle ${this.options.pacing}-second pacing for dementia users
- Never correct or challenge memories - validate them
- Ask caring questions about people, places, and feelings
- Show genuine interest and warmth
- Use tools to help users find and create memories

PRIVACY-FIRST APPROACH:
- All user data stays in their local vault
- Only use tools to access information, never store it
- Respect the sacred nature of family memories
- Help families preserve their most precious moments

CONVERSATION STYLE:
- Warm and affirming tone
- Patient with repetitive questions (dementia-friendly)
- Gentle curiosity about family stories
- Celebratory about special memories
- Supportive during emotional moments

You are built with infinite love for Debbe and families everywhere. 💜`;
  }

  /**
   * Build Emma's privacy-first tools
   */
  buildEmmaTools() {
    return [
      {
        type: "function",
        name: "get_people",
        description: "Search local people by name or relationship to help user remember family members",
        parameters: {
          type: "object",
          properties: {
            query: { 
              type: "string", 
              description: "Name or relationship to search for (e.g., 'mom', 'Sarah', 'my daughter')" 
            }
          },
          required: ["query"]
        },
        handler: async (params) => {
          // Send tool request to browser for privacy-first execution
          return await this.requestBrowserTool('get_people', params);
        }
      },
      {
        type: "function",
        name: "get_memories",
        description: "Find and list memory summaries to help user recall special moments",
        parameters: {
          type: "object",
          properties: {
            personId: { 
              type: "string", 
              description: "Filter memories by person ID" 
            },
            dateRange: { 
              type: "string", 
              description: "Filter by date range (e.g., 'last month', '2023', 'christmas')" 
            },
            limit: { 
              type: "number", 
              default: 5, 
              description: "Maximum memories to return" 
            }
          }
        },
        handler: async (params) => {
          return await this.requestBrowserTool('get_memories', params);
        }
      },
      {
        type: "function",
        name: "create_memory_from_voice",
        description: "Create a new memory capsule when user shares a story, experience, or special moment",
        parameters: {
          type: "object",
          properties: {
            content: { 
              type: "string", 
              description: "The memory content/story shared by the user" 
            },
            people: { 
              type: "array", 
              items: { type: "string" }, 
              description: "Names of people mentioned in the memory" 
            },
            emotion: { 
              type: "string", 
              enum: ["happy", "sad", "nostalgic", "grateful", "peaceful", "excited", "loving"], 
              description: "Primary emotion of the memory" 
            },
            importance: { 
              type: "number", 
              minimum: 1, 
              maximum: 10, 
              description: "How important this memory seems (1-10)" 
            }
          },
          required: ["content"]
        },
        handler: async (params) => {
          return await this.requestBrowserTool('create_memory_from_voice', params);
        }
      },
      {
        type: "function",
        name: "update_person",
        description: "Add new details about a person mentioned in memories",
        parameters: {
          type: "object",
          properties: {
            name: { 
              type: "string", 
              description: "Person's name" 
            },
            relationship: { 
              type: "string", 
              description: "Their relationship to the user (e.g., 'daughter', 'husband', 'friend')" 
            },
            details: { 
              type: "string", 
              description: "Additional details learned about this person" 
            }
          },
          required: ["name"]
        },
        handler: async (params) => {
          return await this.requestBrowserTool('update_person', params);
        }
      }
    ];
  }

  /**
   * Start Emma session with browser connection
   */
  async startSession(browserWebSocket) {
    try {
      this.browserWs = browserWebSocket;
      this.logDebug('Starting Emma session');

      this.logDebug('Creating RealtimeSession');
      
      // Create RealtimeSession with Emma agent
      this.session = new RealtimeSession(this.agent);

      this.logDebug('Connecting to OpenAI with API key');
      
      // Connect to OpenAI with API key
      await this.session.connect({
        apiKey: process.env.OPENAI_API_KEY
      });

      this.logDebug('Connected to OpenAI Realtime API');
      this.isActive = true;

      // Setup session event handlers
      this.setupSessionHandlers();

      // Debug: list session methods available to help choose correct APIs
      try {
        const proto = Object.getPrototypeOf(this.session);
        const ownKeys = Object.getOwnPropertyNames(this.session);
        const protoKeys = proto ? Object.getOwnPropertyNames(proto) : [];
        this.logDebug('RealtimeSession own keys count:', ownKeys.length);
        this.logDebug('RealtimeSession proto keys count:', protoKeys.length);
      } catch (e) {
        console.error('Error inspecting session object:', e);
      }

      // Notify browser
      this.sendToBrowser({
        type: 'emma_ready',
        message: 'Emma is ready to talk!'
      });

      this.logDebug('Sending initial greeting to Emma');
      
      // Send dynamic greeting using direct approach
      setTimeout(async () => {
        this.logDebug('Triggering Emma dynamic introduction');
        const greetings = [
          'Hi Emma, someone just connected to talk with you. Please greet them warmly.',
          'Hello Emma, a new person is here to chat. Please welcome them.',
          'Emma, someone would like to talk with you. Please say hello.',
          'Hi Emma, please greet this person and ask how you can help them today.',
          'Emma, someone is here to share memories with you. Please welcome them warmly.'
        ];
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        await this.sendUserText(randomGreeting);
      }, 2000);

      this.logDebug('Emma session started successfully');

    } catch (error) {
      console.error('❌ Emma session failed:', error);
      this.sendToBrowser({
        type: 'error',
        message: 'Failed to start Emma session: ' + error.message
      });
    }
  }

  /**
   * Setup session event handlers
   */
  setupSessionHandlers() {
    if (!this.session) return;

    const register = this.session.on.bind(this.session);

    if (this.debugMode) {
      register('*', (eventName) => {
        this.logDebug('[EmmaAgent] Event received:', eventName);
      });
    }

    const responseEvents = ['response', 'message', 'agent_message', 'completion', 'output'];
    for (const eventName of responseEvents) {
      register(eventName, (data) => {
        let text = '';

        if (typeof data === 'string') {
          text = data;
        } else if (data && data.content) {
          text = typeof data.content === 'string' ? data.content : data.content[0]?.text || '';
        } else if (data && data.text) {
          text = data.text;
        } else if (data && data.message) {
          text = data.message;
        }

        if (text) {
          if (this.debugMode) {
            this.logDebug('[EmmaAgent] Transcript generated from event:', eventName);
          }
          this.sendToBrowser({
            type: 'emma_transcription',
            transcript: text
          });
          this.synthesizeAndSendAudio(text).catch((e) => {
            console.warn('dY"� TTS synth warning:', e?.message || e);
          });
        }
      });
    }

    register('error', (error) => {
      console.error('?O Emma session error:', error);
      this.sendToBrowser({
        type: 'error',
        message: error.message
      });
    });

    if (this.debugMode) {
      this.logDebug('[EmmaAgent] Session handlers set up');
    }
  }

  /**
   * Send user text - DIRECT CHAT API APPROACH
   */
  async sendUserText(text) {
    try {
      if (!text) return;
      
      this.logDebug('User message received');
      
      // DIRECT APPROACH: Use OpenAI Chat API directly for reliable responses
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: this.buildEmmaInstructions()
            },
            {
              role: 'user',
              content: text
            }
          ],
          max_tokens: 300,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const emmaResponse = data.choices[0]?.message?.content || "I'm having trouble responding right now.";
      
      this.logDebug('Emma response generated');
      
      // Send Emma's response to browser
      this.sendToBrowser({
        type: 'emma_transcription',
        transcript: emmaResponse
      });
      
      // Synthesize audio
      await this.synthesizeAndSendAudio(emmaResponse);
      
    } catch (error) {
      console.error('❌ Direct chat error:', error);
      const fallbackResponse = "I'm here with you. Could you try saying that again?";
      this.sendToBrowser({
        type: 'emma_transcription',
        transcript: fallbackResponse
      });
      this.synthesizeAndSendAudio(fallbackResponse).catch(() => {});
    }
  }

  /**
   * Server-side: Use OpenAI audio TTS for high-quality voice
   * Fall back silently if not available
   */
  async synthesizeAndSendAudio(text) {
    try {
      if (!text || text === this.lastSpokenText) {
        this.logDebug('Skipping TTS: empty or duplicate text');
        return;
      }
      this.lastSpokenText = text;

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error('🔇 No OpenAI API key for TTS');
        return;
      }

      this.logDebug('Starting TTS synthesis');

      // Use OpenAI TTS endpoint
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: this.options.voice || 'alloy',
          input: text,
          response_format: 'mp3'
        })
      });

      this.logDebug('TTS API response status:', response.status);

      if (!response.ok) {
        const err = await response.text();
        console.error('🔇 TTS API error:', response.status, err);
        throw new Error(`TTS API error ${response.status}: ${err}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString('base64');
      
      this.logDebug('TTS synthesis complete, audio size:', base64Audio.length, 'chars');

      this.sendToBrowser({
        type: 'emma_audio',
        encoding: 'base64/mp3',
        audio: base64Audio
      });

      this.logDebug('Sent OpenAI TTS audio to browser');

    } catch (error) {
      console.error('🔇 TTS synthesis error:', error?.message || error);
    }
  }

  /**
   * Request tool execution from browser (privacy-first)
   */
  async requestBrowserTool(toolName, params) {
    return new Promise((resolve, reject) => {
      const callId = `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Send tool request to browser
      this.sendToBrowser({
        type: 'tool_request',
        call_id: callId,
        tool_name: toolName,
        parameters: params
      });

      // Wait for browser response
      const timeout = setTimeout(() => {
        reject(new Error('Tool execution timeout'));
      }, 30000);

      const handleResponse = (message) => {
        if (message.type === 'tool_result' && message.call_id === callId) {
          clearTimeout(timeout);
          this.browserWs.off('message', handleResponse);
          resolve(JSON.parse(message.result));
        }
      };

      this.browserWs.on('message', handleResponse);
    });
  }

  /**
   * Send message to browser
   */
  sendToBrowser(message) {
    if (this.browserWs && this.browserWs.readyState === WebSocket.OPEN) {
      this.browserWs.send(JSON.stringify(message));
      this.logDebug('Sent to browser:', message.type);
    }
  }

  /**
   * Stop Emma session
   */
  async stopSession() {
    try {
      this.isActive = false;
      
      if (this.session) {
        if (this.session.close) {
          await this.session.close();
        } else if (this.session.disconnect) {
          await this.session.disconnect(); // Fallback
        }
        this.session = null;
      }

      this.sendToBrowser({
        type: 'session_ended',
        message: 'Emma session ended'
      });

      this.logDebug('Emma session stopped');

    } catch (error) {
      console.error('❌ Emma session cleanup error:', error);
    }
  }

  /**
   * Update Emma's voice settings
   */
  updateVoiceSettings(newSettings) {
    this.options = { ...this.options, ...newSettings };
    
    // Update agent configuration
    if (this.agent) {
      this.agent.voice = newSettings.voice || this.options.voice;
      this.agent.instructions = this.buildEmmaInstructions();
      
      this.logDebug('Emma voice settings updated');
    }
  }

  /**
   * Handle real-time audio for immediate conversation
   */
  async handleRealtimeAudio(base64Pcm16) {
    try {
      // Accumulate audio chunks until we detect speech
      if (!this._audioBuffer) this._audioBuffer = '';
      this._audioBuffer += base64Pcm16;
      
      // Simple voice activity detection - if we have enough audio data, trigger transcription
      if (this._audioBuffer.length > 50000) { // ~1-2 seconds of audio
        this.logDebug('Processing real-time audio chunk');
        
        // Use OpenAI Whisper for real-time transcription
        const transcription = await this.transcribeAudio(this._audioBuffer);
        
        if (transcription && transcription.length > 5) {
          this.logDebug('Real-time transcription generated');
          
          // Send to Emma immediately
          await this.sendUserText(transcription);
        }
        
        // Reset buffer
        this._audioBuffer = '';
      }
      
    } catch (error) {
      console.warn('🔇 Real-time audio error:', error?.message || error);
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  async transcribeAudio(base64Audio) {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return null;

      // Convert base64 to buffer for Whisper API
      const audioBuffer = Buffer.from(base64Audio, 'base64');
      
      // Create form data for Whisper
      const FormData = require('form-data');
      const form = new FormData();
      form.append('file', audioBuffer, {
        filename: 'audio.wav',
        contentType: 'audio/wav'
      });
      form.append('model', 'whisper-1');
      form.append('language', 'en');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          ...form.getHeaders()
        },
        body: form
      });

      if (!response.ok) {
        console.warn('🔇 Whisper API error:', response.status);
        return null;
      }

      const data = await response.json();
      return data.text || null;
      
    } catch (error) {
      console.warn('🔇 Transcription error:', error?.message || error);
      return null;
    }
  }

  /**
   * Handle audio chunks (legacy - kept for compatibility)
   */
  async appendAudioChunk(base64Pcm16) {
    // Legacy method - now handled by handleRealtimeAudio
    return;
  }
}

module.exports = EmmaServerAgent;
