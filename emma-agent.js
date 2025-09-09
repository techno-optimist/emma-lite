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

    this.initializeAgent();
    console.log('🎙️ Emma Server Agent initialized');
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

    console.log('✅ Emma RealtimeAgent created with personality');
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
      console.log('🎙️ Starting Emma session...');

      // Create RealtimeSession with Emma agent
      this.session = new RealtimeSession(this.agent);

      // Connect to OpenAI with API key
      await this.session.connect({
        apiKey: process.env.OPENAI_API_KEY
      });

      this.isActive = true;

      // Setup session event handlers
      this.setupSessionHandlers();

      // Notify browser
      this.sendToBrowser({
        type: 'emma_ready',
        message: 'Emma is ready to talk!'
      });

      // Send initial greeting
      setTimeout(() => {
        this.session.sendMessage('Hello, please introduce yourself as Emma.');
      }, 1000);

      console.log('✅ Emma session started successfully');

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

    // Handle user speech transcription
    this.session.on('user_transcription', (transcript) => {
      console.log('📝 User said:', transcript);
      this.sendToBrowser({
        type: 'user_transcription',
        transcript: transcript
      });
    });

    // Handle Emma's speech transcription
    this.session.on('agent_transcription', (transcript) => {
      console.log('📝 Emma said:', transcript);
      this.sendToBrowser({
        type: 'emma_transcription',
        transcript: transcript
      });
    });

    // Handle session state changes
    this.session.on('state_change', (state) => {
      console.log('🎙️ Emma state:', state);
      this.sendToBrowser({
        type: 'state_change',
        state: state
      });
    });

    // Handle errors
    this.session.on('error', (error) => {
      console.error('❌ Emma session error:', error);
      this.sendToBrowser({
        type: 'error',
        message: error.message
      });
    });

    // Handle tool calls (handled by agent tool handlers automatically)
    this.session.on('tool_call', (toolCall) => {
      console.log('🔧 Emma tool call:', toolCall.name);
    });
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
      console.log('📤 Sent to browser:', message.type);
    }
  }

  /**
   * Stop Emma session
   */
  async stopSession() {
    try {
      this.isActive = false;
      
      if (this.session) {
        await this.session.disconnect();
        this.session = null;
      }

      this.sendToBrowser({
        type: 'session_ended',
        message: 'Emma session ended'
      });

      console.log('🔇 Emma session stopped');

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
      
      console.log('🎛️ Emma voice settings updated:', newSettings);
    }
  }
}

module.exports = EmmaServerAgent;
