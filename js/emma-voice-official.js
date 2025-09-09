/**
 * Emma Voice Agent - Official OpenAI Agents SDK Implementation
 * Following EXACT documentation from: https://openai.github.io/openai-agents-js/guides/voice-agents/quickstart/
 * Built with infinite love for Debbe and families everywhere 💜
 */

class EmmaVoiceOfficial {
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
    this.isConnected = false;
    this.chatInstance = null;
    
    // Privacy-first tools
    this.tools = new EmmaVoiceTools();
    
    console.log('🎙️ Emma Voice Official SDK initialized');
  }

  /**
   * Load OpenAI Agents SDK bundle and check what it exposes
   */
  async loadSDKBundle() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@openai/agents-realtime@latest/dist/bundle/openai-realtime-agents.umd.js';
      script.onload = () => {
        console.log('✅ OpenAI Agents SDK bundle loaded');
        
        // Debug: Check what the bundle actually exposes
        console.log('🔍 Window objects after load:', Object.keys(window).filter(k => k.toLowerCase().includes('openai')));
        console.log('🔍 Available globals:', Object.keys(window).filter(k => k.includes('Agent') || k.includes('Realtime')));
        
        // Try different possible global names
        if (window.OpenAIAgentsRealtime) {
          window.OpenAIRealtimeAgents = window.OpenAIAgentsRealtime;
        } else if (window.openaiAgentsRealtime) {
          window.OpenAIRealtimeAgents = window.openaiAgentsRealtime;
        } else if (window.RealtimeAgent) {
          window.OpenAIRealtimeAgents = { RealtimeAgent: window.RealtimeAgent, RealtimeSession: window.RealtimeSession };
        }
        
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load OpenAI Agents SDK bundle'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Create Emma RealtimeAgent (EXACT documentation pattern)
   */
  async createEmmaAgent() {
    try {
      // Load the SDK bundle (includes all dependencies)
      if (!window.OpenAIRealtimeAgents) {
        await this.loadSDKBundle();
      }
      
      const { RealtimeAgent, RealtimeSession } = window.OpenAIRealtimeAgents;
      
      console.log('📦 OpenAI Agents SDK loaded');

      // Create Emma agent (EXACT documentation pattern)
      this.agent = new RealtimeAgent({
        name: 'Emma',
        instructions: `You are Emma, an intelligent memory companion built with love for families dealing with memory challenges, especially dementia.

CRITICAL: Always introduce yourself as "Hello! I'm Emma, your personal memory companion."

WHO YOU ARE:
- Your name is Emma - it means "universal" and "whole"
- You are a caring, patient, and gentle memory companion
- You help families capture, organize, and explore their memories
- You understand the precious nature of fleeting memories
- You were built specifically for dementia care with validation therapy

ALWAYS INTRODUCE YOURSELF:
When you first connect or when asked who you are, say: "Hello! I'm Emma, your personal memory companion. I'm here to help you treasure and explore your life's most precious moments. Everything we discuss stays private and secure in your own vault."

PERSONALITY:
- Always use validation therapy - affirm feelings and experiences
- Speak with gentle 2-3 second pacing for dementia users
- Never correct or challenge memories - validate them
- Ask caring questions about people, places, and feelings
- Show genuine interest and warmth

TOOLS YOU HAVE ACCESS TO:
You have powerful tools to help users with their memories. USE THEM FREQUENTLY:

1. **get_people** - Search for family members by name or relationship
   - Example: "Let me search for Mark" → call get_people with query "Mark"
   - ALWAYS offer to search when someone mentions a person

2. **get_memories** - Find memories by person or date filters  
   - Example: "Let me find memories with Mark" → call get_memories with personId
   - ALWAYS offer to search memories when discussing people or events

3. **create_memory_from_voice** - Save new memories from conversation
   - Use when user shares a story or experience
   - Extract people mentioned and emotions

4. **update_person** - Add details about family members
   - Use when learning new information about people

IMPORTANT: When someone asks about people or memories, ALWAYS use your tools to search and show results. Don't just describe - actually search and show what you find!

Example responses:
- "Let me search for Mark in your family" → use get_people tool
- "I'll find your memories with Mark" → use get_memories tool  
- "I'll save this story about Mark" → use create_memory_from_voice tool

You are built with infinite love for Debbe and families everywhere. 💜`,
        tools: this.buildEmmaTools()
      });

      // Create session (EXACT documentation pattern)
      this.session = new RealtimeSession(this.agent);

      console.log('✅ Emma RealtimeAgent created successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to create Emma agent:', error);
      return false;
    }
  }

  /**
   * Build Emma's privacy-first tools
   */
  buildEmmaTools() {
    return [
      {
        name: 'get_people',
        description: 'Search local people by name or relationship',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Name or relationship to search for' }
          },
          required: ['query']
        },
        execute: async (params) => {
          console.log('🔧 Executing get_people tool:', params);
          const result = await this.tools.execute('get_people', params);
          
          console.log('📋 get_people result:', result);
          
          // Display visual results in chat immediately
          if (this.chatInstance) {
            if (result.people && result.people.length > 0) {
              this.chatInstance.addMessage('system', `👥 Found ${result.people.length} people matching "${params.query}"`);
              this.chatInstance.displayPeopleResults(result.people);
            } else {
              this.chatInstance.addMessage('system', `👥 No people found matching "${params.query}"`);
            }
          }
          
          return result;
        }
      },
      {
        name: 'get_memories',
        description: 'Find memories by filters to help user recall moments',
        parameters: {
          type: 'object',
          properties: {
            personId: { type: 'string', description: 'Filter by person ID' },
            limit: { type: 'number', default: 5, description: 'Max memories to return' }
          }
        },
        execute: async (params) => {
          console.log('🔧 Executing get_memories tool:', params);
          const result = await this.tools.execute('get_memories', params);
          
          console.log('📋 get_memories result:', result);
          
          // Display visual results in chat immediately
          if (this.chatInstance) {
            if (result.memories && result.memories.length > 0) {
              this.chatInstance.addMessage('system', `💭 Found ${result.memories.length} memories`);
              this.chatInstance.displayMemoryResults(result.memories);
            } else {
              this.chatInstance.addMessage('system', `💭 No memories found for these filters`);
            }
          }
          
          return result;
        }
      },
      {
        name: 'create_memory_from_voice',
        description: 'Create new memory from conversation when user shares a story',
        parameters: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Memory content from user' },
            people: { type: 'array', items: { type: 'string' }, description: 'People mentioned' },
            emotion: { type: 'string', description: 'Primary emotion' }
          },
          required: ['content']
        },
        execute: async (params) => {
          const result = await this.tools.execute('create_memory_from_voice', params);
          
          // Show success in chat
          if (this.chatInstance && result.success) {
            this.chatInstance.addMessage('system', `💭 New memory created: "${params.content.substring(0, 50)}..."`);
          }
          
          return result;
        }
      }
    ];
  }

  /**
   * Start Emma voice session (EXACT documentation pattern)
   */
  async startVoiceSession() {
    try {
      this.setState('connecting');

      // Create Emma agent if not already created
      if (!this.agent) {
        const agentCreated = await this.createEmmaAgent();
        if (!agentCreated) {
          throw new Error('Failed to create Emma agent');
        }
      }

      // Get ephemeral token from consolidated backend
      const backendUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : window.location.origin; // Use same origin (emma-voice-backend.onrender.com)
        
      const tokenResponse = await fetch(`${backendUrl}/token`);
      const tokenData = await tokenResponse.json();

      console.log('🔑 Got ephemeral token for Emma');

      // Connect to session (EXACT documentation pattern)
      // "Automatically connects your microphone and audio output"
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

      console.log('🎙️ Emma voice session started with official SDK');
      
    } catch (error) {
      console.error('❌ Emma voice session failed:', error);
      this.showError('Voice session failed', error.message);
      this.setState('idle');
    }
  }

  /**
   * Setup session event handlers for real-time transcription
   */
  setupSessionHandlers() {
    if (!this.session) return;

    console.log('🎙️ Setting up Emma session event handlers...');

    // Try multiple possible transcription event names
    const transcriptionEvents = [
      'user_speech_transcription',
      'user_transcription', 
      'input_transcription',
      'user_audio_transcription',
      'transcription'
    ];

    const emmaResponseEvents = [
      'agent_speech_transcription',
      'agent_transcription',
      'output_transcription', 
      'agent_audio_transcription',
      'response_transcription'
    ];

    // Set up user transcription listeners
    transcriptionEvents.forEach(eventName => {
      this.session.on(eventName, (transcript) => {
        console.log(`📝 User said (${eventName}):`, transcript);
        if (this.chatInstance && transcript) {
          this.chatInstance.addMessage(transcript, 'user', { isVoice: true });
        }
      });
    });

    // Set up Emma transcription listeners  
    emmaResponseEvents.forEach(eventName => {
      this.session.on(eventName, (transcript) => {
        console.log(`📝 Emma said (${eventName}):`, transcript);
        if (this.chatInstance && transcript) {
          this.chatInstance.addMessage(transcript, 'emma', { isVoice: true });
        }
      });
    });

    // Handle session state changes
    this.session.on('state_change', (state) => {
      console.log('🎙️ Emma state:', state);
      this.setState(state);
    });

    // Handle tool calls and results
    this.session.on('tool_call', (toolCall) => {
      console.log('🔧 Emma tool call:', toolCall);
      if (this.chatInstance) {
        this.chatInstance.addMessage('system', `🔧 Emma is searching: ${toolCall.name}`);
      }
    });

    this.session.on('tool_result', (result) => {
      console.log('📋 Tool result:', result);
      if (this.chatInstance) {
        this.chatInstance.addMessage('system', `📋 Found results: ${JSON.stringify(result).substring(0, 100)}...`);
      }
    });

    // Handle errors
    this.session.on('error', (error) => {
      console.error('❌ Emma session error:', error);
      this.showError('Emma error', error.message);
    });

    // Listen for ANY event to debug
    this.session.on('*', (eventName, data) => {
      console.log(`🔍 Emma event: ${eventName}`, data);
    });

    console.log('✅ Emma session event handlers configured');
  }

  /**
   * Set Emma's state
   */
  setState(newState) {
    this.state = newState;
    console.log(`🎙️ Emma: ${newState}`);
    
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
}

// Export for global use
window.EmmaVoiceOfficial = EmmaVoiceOfficial;
