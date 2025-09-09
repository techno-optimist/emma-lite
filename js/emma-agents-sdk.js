/**
 * Emma Realtime Agent - OpenAI Agents SDK Implementation
 * PRODUCTION-READY: Uses official OpenAI Agents SDK
 * Built with infinite love for Debbe and families everywhere 💜
 */

class EmmaRealtimeAgent {
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
    this.session = null;
    this.agent = null;
    this.chatInstance = null;
    
    // Privacy-first tools
    this.tools = new EmmaVoiceTools();
    
    console.log('🎙️ Emma Realtime Agent initialized with OpenAI Agents SDK');
  }

  /**
   * Initialize Emma as a RealtimeAgent
   */
  async initialize() {
    try {
      // Check if Agents SDK is available
      if (typeof window.openai === 'undefined' || !window.openai.RealtimeAgent) {
        throw new Error('OpenAI Agents SDK not loaded');
      }

      // Create Emma as a RealtimeAgent
      this.agent = new window.openai.RealtimeAgent({
        name: "Emma",
        instructions: this.buildEmmaInstructions(),
        voice: this.options.voice,
        tools: this.buildEmmaTools()
      });

      console.log('✅ Emma RealtimeAgent created successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Emma agent initialization failed:', error);
      return false;
    }
  }

  /**
   * Build Emma's personality instructions
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

You are built with infinite love for Debbe and families everywhere. 💜`;
  }

  /**
   * Build Emma's privacy-first tools for Agents SDK
   */
  buildEmmaTools() {
    return [
      {
        type: "function",
        name: "get_people",
        description: "Search local people by name or relationship",
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
          return await this.tools.execute('get_people', params);
        }
      },
      {
        type: "function",
        name: "get_memories",
        description: "List memory summaries by filters to help user recall moments",
        parameters: {
          type: "object",
          properties: {
            personId: { 
              type: "string", 
              description: "Filter memories by person ID" 
            },
            dateRange: { 
              type: "string", 
              description: "Filter by date range (e.g., 'last month', '2023')" 
            },
            limit: { 
              type: "number", 
              default: 5, 
              description: "Maximum memories to return" 
            }
          }
        },
        handler: async (params) => {
          const result = await this.tools.execute('get_memories', params);
          
          // Display visual results in chat
          if (this.chatInstance && result.memories) {
            this.chatInstance.displayMemoryResults(result.memories);
          }
          
          return result;
        }
      },
      {
        type: "function",
        name: "create_memory_from_voice",
        description: "Create a new memory capsule from conversation when user shares a story or experience",
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
          const result = await this.tools.execute('create_memory_from_voice', params);
          
          // Show success in chat
          if (this.chatInstance && result.success) {
            this.chatInstance.addMessage('system', `💭 New memory created: "${params.content.substring(0, 50)}..."`);
          }
          
          return result;
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
          const result = await this.tools.execute('update_person', params);
          
          // Show update in chat
          if (this.chatInstance && result.success) {
            this.chatInstance.addMessage('system', `👤 Updated ${result.personName} with new details`);
          }
          
          return result;
        }
      }
    ];
  }

  /**
   * Start voice session using Agents SDK
   */
  async startVoiceSession() {
    try {
      this.setState('connecting');
      
      if (!this.agent) {
        throw new Error('Emma agent not initialized');
      }

      // Get ephemeral token from backend
      const backendUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://emma-voice-backend.onrender.com';
        
      const tokenResponse = await fetch(`${backendUrl}/token`);
      const tokenData = await tokenResponse.json();

      console.log('🔑 Got ephemeral token for Emma');

      // Create RealtimeSession with Emma agent
      this.session = new window.openai.RealtimeSession(this.agent);

      // Connect with automatic microphone and audio setup
      await this.session.connect({
        apiKey: tokenData.value
      });

      this.isConnected = true;
      this.setState('listening');
      
      // Setup event handlers
      this.setupSessionHandlers();
      
      if (this.chatInstance) {
        this.chatInstance.addMessage('system', '✅ Emma is connected and ready to talk!');
      }

      console.log('🎙️ Emma voice session started with Agents SDK');
      
    } catch (error) {
      console.error('❌ Emma voice session failed:', error);
      this.showError('Voice session failed', error.message);
      this.setState('idle');
    }
  }

  /**
   * Setup session event handlers
   */
  setupSessionHandlers() {
    if (!this.session) return;

    // Handle transcription events
    this.session.on('user_transcription', (transcript) => {
      console.log('📝 User said:', transcript);
      if (this.chatInstance) {
        this.chatInstance.addMessage(transcript, 'user', { isVoice: true });
      }
    });

    this.session.on('agent_transcription', (transcript) => {
      console.log('📝 Emma said:', transcript);
      if (this.chatInstance) {
        this.chatInstance.addMessage(transcript, 'emma', { isVoice: true });
      }
    });

    // Handle session state changes
    this.session.on('state_change', (state) => {
      console.log('🎙️ Emma state:', state);
      this.setState(state);
    });

    // Handle errors
    this.session.on('error', (error) => {
      console.error('❌ Emma session error:', error);
      this.showError('Emma error', error.message);
    });

    // Handle tool calls (already handled by agent tool handlers)
    this.session.on('tool_call', (toolCall) => {
      console.log('🔧 Emma tool call:', toolCall.name);
    });
  }

  /**
   * Stop voice session
   */
  async stopVoiceSession() {
    try {
      this.isConnected = false;
      this.setState('idle');
      
      if (this.session) {
        await this.session.disconnect();
        this.session = null;
      }
      
      if (this.chatInstance) {
        this.chatInstance.addMessage('system', '🔇 Emma voice session ended');
      }
      
      console.log('🔇 Emma voice session stopped');
      
    } catch (error) {
      console.error('❌ Voice session cleanup error:', error);
    }
  }

  /**
   * Update Emma's voice settings
   */
  updateVoiceSettings(newSettings) {
    this.options = { ...this.options, ...newSettings };
    
    // If session is active, update agent configuration
    if (this.agent) {
      this.agent.voice = newSettings.voice || this.options.voice;
      this.agent.instructions = this.buildEmmaInstructions();
      
      console.log('🎛️ Emma voice settings updated:', newSettings);
    }
  }

  /**
   * Set Emma's state with UI updates
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
}

// Export for global use
window.EmmaRealtimeAgent = EmmaRealtimeAgent;
