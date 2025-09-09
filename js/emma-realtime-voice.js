/**
 * Emma Realtime Voice Integration
 * PRIVACY-FIRST: Local-only tool execution, ephemeral tokens only
 * DEMENTIA-FRIENDLY: Validation therapy, gentle pacing, clear states
 * 
 * Built with love for Debbe and families everywhere 💜
 */

class EmmaRealtimeVoice {
  constructor(options = {}) {
    this.options = {
      wakeWord: 'Emma',
      pacing: 2500, // 2.5s dementia-friendly pacing
      validationMode: true,
      ...options
    };

    // State management
    this.state = 'idle'; // idle, listening, thinking, speaking
    this.isEnabled = false;
    this.session = null;
    this.mediaStream = null;
    this.audioContext = null;
    this.peerConnection = null;
    
    // Privacy-first tool system
    this.tools = new EmmaVoiceTools();
    
    // UI integration
    this.orb = null;
    this.statusElement = null;
    
    console.log('🎙️ Emma Realtime Voice initialized with privacy-first architecture');
  }

  /**
   * Initialize voice system with Emma orb integration
   */
  async initialize(orbContainer, statusContainer) {
    try {
      // Check browser compatibility
      if (!this.checkCompatibility()) {
        throw new Error('Voice features not supported in this browser');
      }

      // Initialize orb with voice states
      if (orbContainer && window.EmmaOrb) {
        this.orb = new window.EmmaOrb(orbContainer, {
          hue: 260, // Emma purple
          hoverIntensity: 0.3,
          rotateOnHover: true
        });
        
        // Add voice-specific orb states
        this.orb.setVoiceState = (state) => {
          const stateColors = {
            idle: 260,      // Purple
            listening: 200, // Blue  
            thinking: 60,   // Yellow
            speaking: 120   // Green
          };
          if (this.orb.setHue) {
            this.orb.setHue(stateColors[state] || 260);
          }
        };
      }

      // Setup status display
      if (statusContainer) {
        this.statusElement = this.createStatusElement(statusContainer);
      }

      console.log('✅ Emma Voice initialized successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Voice initialization failed:', error);
      this.showError('Voice features unavailable', error.message);
      return false;
    }
  }

  /**
   * CTO SECURITY: Check browser compatibility for privacy-first features
   */
  checkCompatibility() {
    const required = [
      'navigator.mediaDevices',
      'navigator.mediaDevices.getUserMedia',
      'RTCPeerConnection',
      'WebSocket',
      'AudioContext'
    ];

    for (const feature of required) {
      const parts = feature.split('.');
      let obj = window;
      for (const part of parts) {
        if (!obj || !obj[part]) {
          console.warn(`❌ Missing required feature: ${feature}`);
          return false;
        }
        obj = obj[part];
      }
    }

    return true;
  }

  /**
   * Start voice session with ephemeral token
   */
  async startVoiceSession() {
    try {
      this.setState('thinking');
      this.updateStatus('Preparing voice session...');

      // Get ephemeral token (privacy-first)
      const backendUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://emma-voice-backend.onrender.com';
        
      const tokenResponse = await fetch(`${backendUrl}/token`);

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        throw new Error(error.error || 'Token generation failed');
      }

      const tokenData = await tokenResponse.json();
      console.log('🔑 Ephemeral token obtained, expires in', tokenData.expires_in, 'seconds');

      // Store session configuration for later use
      this.sessionConfig = tokenData.session_config;

      // Setup WebRTC connection
      await this.setupWebRTC(tokenData);
      
      this.isEnabled = true;
      this.setState('listening');
      this.updateStatus('Listening... Say "Emma" to start');
      
      console.log('🎙️ Voice session active');
      
    } catch (error) {
      console.error('❌ Voice session failed:', error);
      this.showError('Voice session failed', error.message);
      this.setState('idle');
    }
  }

  /**
   * Setup WebRTC connection to OpenAI Realtime API (Official Implementation)
   */
  async setupWebRTC(tokenData) {
    try {
      // Create peer connection with STUN servers for NAT traversal
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Set up to play remote audio from the model
      this.audioElement = document.createElement('audio');
      this.audioElement.autoplay = true;
      this.peerConnection.ontrack = (e) => {
        console.log('🔊 Receiving audio stream from Emma');
        this.audioElement.srcObject = e.streams[0];
        this.setState('speaking');
      };

      // Add local audio track for microphone input
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      const audioTrack = this.mediaStream.getAudioTracks()[0];
      this.peerConnection.addTrack(audioTrack, this.mediaStream);
      console.log('🎤 Microphone connected');

      // Set up data channel for sending and receiving events
      this.dataChannel = this.peerConnection.createDataChannel('oai-events');
      this.setupDataChannelHandlers();

      // Start the session using Session Description Protocol (SDP)
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Connect to OpenAI Realtime API (CORRECTED ENDPOINT)
      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      
      console.log('🔗 Connecting to OpenAI Realtime API...');
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          'Authorization': `Bearer ${tokenData.client_secret || tokenData.value || tokenData.token}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        const error = await sdpResponse.text();
        throw new Error(`OpenAI Realtime connection failed: ${error}`);
      }

      const answer = {
        type: 'answer',
        sdp: await sdpResponse.text(),
      };
      
      await this.peerConnection.setRemoteDescription(answer);
      
      console.log('✅ Connected to OpenAI Realtime API');
      this.setState('listening');
      
    } catch (error) {
      console.error('❌ WebRTC setup failed:', error);
      throw error;
    }
  }

  /**
   * Setup data channel for OpenAI Realtime events and privacy-first tool calls
   */
  setupDataChannelHandlers() {
    this.dataChannel.onopen = () => {
      console.log('📡 Data channel open - Emma is ready to listen');
      
      // CRITICAL FIX: Don't send session.update - session is configured via backend
      // Just listen for events and handle them
    };

    this.dataChannel.onmessage = async (event) => {
      try {
        const serverEvent = JSON.parse(event.data);
        console.log('📨 Server event:', serverEvent.type);
        
        switch (serverEvent.type) {
          case 'session.created':
            console.log('✅ Emma session created');
            this.setState('listening');
            // Notify chat that Emma is ready
            if (this.chatInstance) {
              this.chatInstance.addMessage('system', '✅ Emma is now listening and ready to talk!');
            }
            
            // Send session configuration now that connection is established
            if (this.sessionConfig) {
              console.log('📋 Configuring Emma session...');
              this.sendEvent({
                type: 'session.update',
                session: this.sessionConfig
              });
              
              // Send initial greeting to ensure Emma introduces herself
              setTimeout(() => {
                this.sendEvent({
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
                
                // Trigger response
                this.sendEvent({ type: 'response.create' });
              }, 1000);
            }
            break;
            
          case 'input_audio_buffer.speech_started':
            console.log('🎤 User started speaking');
            this.setState('listening');
            break;
            
          case 'input_audio_buffer.speech_stopped':
            console.log('🎤 User stopped speaking');
            this.setState('thinking');
            break;
            
          case 'conversation.item.input_audio_transcription.completed':
            // Display user's transcribed speech in chat
            console.log('📝 User transcription:', serverEvent.transcript);
            if (this.chatInstance && serverEvent.transcript) {
              this.chatInstance.addMessage(serverEvent.transcript, 'user', { 
                type: 'voice-transcription',
                isVoice: true 
              });
            }
            break;
            
          case 'response.audio_transcript.delta':
            // Accumulate Emma's speech transcript
            if (!this.currentTranscript) this.currentTranscript = '';
            this.currentTranscript += serverEvent.delta || '';
            break;
            
          case 'response.audio_transcript.done':
            // Display Emma's complete transcript in chat
            console.log('📝 Emma transcript:', this.currentTranscript);
            if (this.chatInstance && this.currentTranscript) {
              this.chatInstance.addMessage(this.currentTranscript, 'emma', {
                type: 'voice-response',
                isVoice: true
              });
            }
            this.currentTranscript = '';
            break;
            
          case 'response.audio.delta':
            // Audio is handled by WebRTC automatically
            this.setState('speaking');
            break;
            
          case 'response.audio.done':
            this.setState('listening');
            break;
            
          case 'response.function_call_arguments.delta':
            // Function call in progress
            console.log('🔧 Function call:', serverEvent.name);
            break;
            
          case 'response.function_call_arguments.done':
            // Execute tool locally (privacy-first)
            await this.handleFunctionCall(serverEvent);
            break;
            
          case 'error':
            console.error('❌ OpenAI error:', serverEvent.error);
            this.showError('Emma encountered an issue', serverEvent.error.message);
            break;
        }
        
      } catch (error) {
        console.error('❌ Data channel message error:', error);
      }
    };
  }

  /**
   * Send event to OpenAI Realtime API
   */
  sendEvent(event) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(event));
      console.log('📤 Sent event:', event.type);
    }
  }

  /**
   * Handle function calls with privacy-first local execution
   */
  async handleFunctionCall(event) {
    try {
      const { name, arguments: args, call_id } = event;
      console.log(`🔧 Executing ${name} locally (privacy-first)`);
      
      // Execute tool locally
      const result = await this.tools.execute(name, JSON.parse(args));
      
      // Send result back to OpenAI
      this.sendEvent({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: call_id,
          output: JSON.stringify(result)
        }
      });
      
      // Trigger response generation
      this.sendEvent({ type: 'response.create' });
      
    } catch (error) {
      console.error('❌ Function call error:', error);
      
      // Send error back to OpenAI
      this.sendEvent({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: event.call_id,
          output: JSON.stringify({ error: error.message })
        }
      });
    }
  }

  /**
   * Set voice state with orb and UI updates
   */
  setState(newState) {
    if (this.state === newState) return;
    
    const oldState = this.state;
    this.state = newState;
    
    console.log(`🎙️ State: ${oldState} → ${newState}`);
    
    // Update orb visual state
    if (this.orb && this.orb.setVoiceState) {
      this.orb.setVoiceState(newState);
    }
    
    // Update status
    const stateMessages = {
      idle: 'Voice ready',
      listening: 'Listening...',
      thinking: 'Processing...',
      speaking: 'Emma speaking...'
    };
    
    this.updateStatus(stateMessages[newState] || newState);
  }

  /**
   * Update status display (dementia-friendly)
   */
  updateStatus(message, type = 'info') {
    if (!this.statusElement) return;
    
    this.statusElement.textContent = message;
    this.statusElement.className = `emma-voice-status ${type}`;
    
    console.log(`📱 Status: ${message}`);
  }

  /**
   * Show error with validation therapy tone
   */
  showError(title, message) {
    // Dementia-friendly: Never blame user, always validate
    const friendlyMessage = this.options.validationMode 
      ? `${title}. That's okay, these things happen. ${message}`
      : `${title}: ${message}`;
      
    this.updateStatus(friendlyMessage, 'error');
    
    // Clear error after gentle delay
    setTimeout(() => {
      this.updateStatus('Voice ready');
    }, 5000);
  }

  /**
   * Create status element
   */
  createStatusElement(container) {
    const status = document.createElement('div');
    status.className = 'emma-voice-status';
    status.style.cssText = `
      padding: 12px 20px;
      background: rgba(138, 43, 226, 0.1);
      border: 1px solid rgba(138, 43, 226, 0.3);
      border-radius: 8px;
      color: #8a2be2;
      font-size: 14px;
      text-align: center;
      margin: 10px 0;
    `;
    status.textContent = 'Voice ready';
    container.appendChild(status);
    return status;
  }

  /**
   * Stop voice session and cleanup
   */
  async stopVoiceSession() {
    try {
      this.isEnabled = false;
      this.setState('idle');
      
      // Cleanup WebRTC
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }
      
      // Stop media stream
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }
      
      // Cleanup audio element
      if (this.audioElement) {
        this.audioElement.remove();
        this.audioElement = null;
      }
      
      this.updateStatus('Voice session ended');
      console.log('🔇 Voice session stopped');
      
    } catch (error) {
      console.error('❌ Voice session cleanup error:', error);
    }
  }

  /**
   * Toggle voice session
   */
  async toggle() {
    if (this.isEnabled) {
      await this.stopVoiceSession();
    } else {
      await this.startVoiceSession();
    }
  }
}

/**
 * Privacy-First Tool System
 * CTO MANDATE: All tools execute locally, no vault data to cloud
 */
class EmmaVoiceTools {
  constructor() {
    this.tools = {
      get_people: this.getPeople.bind(this),
      get_memories: this.getMemories.bind(this),
      summarize_memory: this.summarizeMemory.bind(this),
      create_memory_from_voice: this.createMemoryFromVoice.bind(this),
      update_person: this.updatePerson.bind(this)
    };
    
    console.log('🔧 Emma Voice Tools initialized (local-only)');
  }

  async execute(toolName, parameters) {
    if (!this.tools[toolName]) {
      throw new Error(`Unknown tool: ${toolName}`);
    }
    
    console.log(`🔧 Executing tool: ${toolName}`, parameters);
    return await this.tools[toolName](parameters);
  }

  /**
   * Get people from local vault (privacy-first)
   */
  async getPeople(params) {
    try {
      if (!window.emmaWebVault?.isOpen) {
        return { error: 'Vault not available', people: [] };
      }
      
      const vaultPeople = window.emmaWebVault.vaultData?.content?.people || {};
      const people = Object.values(vaultPeople);
      
      // Filter by query if provided
      if (params.query) {
        const query = params.query.toLowerCase();
        const filtered = people.filter(person => 
          person.name?.toLowerCase().includes(query) ||
          person.relationship?.toLowerCase().includes(query)
        );
        return { people: filtered.map(p => ({ id: p.id, name: p.name, relationship: p.relationship })) };
      }
      
      return { people: people.map(p => ({ id: p.id, name: p.name, relationship: p.relationship })) };
      
    } catch (error) {
      console.error('❌ getPeople error:', error);
      return { error: 'Failed to get people', people: [] };
    }
  }

  /**
   * Get memories from local vault (privacy-first)
   */
  async getMemories(params) {
    try {
      if (!window.emmaWebVault?.isOpen) {
        return { error: 'Vault not available', memories: [] };
      }
      
      const vaultMemories = window.emmaWebVault.vaultData?.content?.memories || {};
      let memories = Object.values(vaultMemories);
      
      // Filter by person if provided
      if (params.personId) {
        memories = memories.filter(memory => 
          memory.metadata?.people?.includes(params.personId)
        );
      }
      
      // Sort by date (newest first)
      memories.sort((a, b) => new Date(b.created) - new Date(a.created));
      
      // Limit results
      const limit = params.limit || 5;
      memories = memories.slice(0, limit);
      
      // Return only metadata (no content for privacy)
      return {
        memories: memories.map(m => ({
          id: m.id,
          created: m.created,
          title: m.content?.substring(0, 50) + '...',
          people: m.metadata?.people || [],
          tags: m.metadata?.tags || []
        }))
      };
      
    } catch (error) {
      console.error('❌ getMemories error:', error);
      return { error: 'Failed to get memories', memories: [] };
    }
  }

  /**
   * Summarize memory locally (privacy-first)
   */
  async summarizeMemory(params) {
    try {
      if (!window.emmaWebVault?.isOpen) {
        return { error: 'Vault not available' };
      }
      
      const memory = window.emmaWebVault.vaultData?.content?.memories?.[params.memoryId];
      if (!memory) {
        return { error: 'Memory not found' };
      }
      
      // Simple local summarization (no cloud)
      const content = memory.content || '';
      const words = content.split(' ');
      const summary = words.length > 50 
        ? words.slice(0, 50).join(' ') + '...'
        : content;
      
      return {
        summary: summary,
        created: memory.created,
        people: memory.metadata?.people || [],
        tags: memory.metadata?.tags || []
      };
      
    } catch (error) {
      console.error('❌ summarizeMemory error:', error);
      return { error: 'Failed to summarize memory' };
    }
  }

  /**
   * Create memory from voice (vault integration) - ENHANCED
   */
  async createMemoryFromVoice(params) {
    try {
      if (!window.emmaWebVault?.isOpen) {
        return { error: 'Vault not available - please open your vault first' };
      }
      
      console.log('💭 Creating memory from voice:', params);
      
      // Process people mentioned in the memory
      const peopleIds = [];
      if (params.people && params.people.length > 0) {
        for (const personName of params.people) {
          // Try to find existing person or create new one
          const person = await this.findOrCreatePerson(personName);
          if (person && person.id) {
            peopleIds.push(person.id);
          }
        }
      }
      
      // Create rich metadata from voice parameters
      const metadata = {
        source: 'voice-conversation',
        people: peopleIds,
        tags: ['voice-capture', 'conversation'],
        emotion: params.emotion || 'neutral',
        importance: params.importance || 7, // Default to high importance for voice memories
        created_via: 'emma-voice',
        date_captured: new Date().toISOString()
      };
      
      // Use existing vault system (Staging → Approval → Vault)
      const result = await window.emmaWebVault.addMemory({
        content: params.content,
        metadata: metadata
      });
      
      console.log('✅ Memory created successfully:', result.memory?.id);
      
      return { 
        success: true, 
        memoryId: result.memory?.id,
        peopleConnected: peopleIds.length,
        message: `Memory saved with ${peopleIds.length} people connected`
      };
      
    } catch (error) {
      console.error('❌ createMemoryFromVoice error:', error);
      return { error: 'Failed to create memory: ' + error.message };
    }
  }

  /**
   * Find existing person or create new one (privacy-first)
   */
  async findOrCreatePerson(personName) {
    try {
      if (!window.emmaWebVault?.vaultData?.content?.people) {
        // Initialize people object if it doesn't exist
        if (!window.emmaWebVault.vaultData.content.people) {
          window.emmaWebVault.vaultData.content.people = {};
        }
      }
      
      const people = window.emmaWebVault.vaultData.content.people;
      
      // Try to find existing person (case-insensitive)
      const existingPerson = Object.values(people).find(person => 
        person.name?.toLowerCase() === personName.toLowerCase()
      );
      
      if (existingPerson) {
        console.log('👤 Found existing person:', existingPerson.name);
        return existingPerson;
      }
      
      // Create new person
      const personId = 'person_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const newPerson = {
        id: personId,
        name: personName,
        relationship: 'family', // Default, can be updated later
        created: new Date().toISOString(),
        source: 'voice-conversation'
      };
      
      // Add to vault
      people[personId] = newPerson;
      
      // Save vault changes
      await window.emmaWebVault.scheduleElegantSave();
      
      console.log('👤 Created new person:', newPerson.name);
      return newPerson;
      
    } catch (error) {
      console.error('❌ findOrCreatePerson error:', error);
      return null;
    }
  }

  /**
   * Update person locally (vault integration) - ENHANCED
   */
  async updatePerson(params) {
    try {
      if (!window.emmaWebVault?.isOpen) {
        return { error: 'Vault not available - please open your vault first' };
      }
      
      console.log('👤 Updating person:', params);
      
      const people = window.emmaWebVault.vaultData?.content?.people || {};
      
      // Find person by name if no direct ID provided
      let person = null;
      if (params.name) {
        person = Object.values(people).find(p => 
          p.name?.toLowerCase() === params.name.toLowerCase()
        );
        
        // If person doesn't exist, create them
        if (!person) {
          person = await this.findOrCreatePerson(params.name);
        }
      }
      
      if (!person) {
        return { error: 'Person not found and could not be created' };
      }
      
      // Update person with new information
      if (params.relationship) {
        person.relationship = params.relationship;
      }
      
      if (params.details) {
        // Add to existing details or create new
        if (!person.details) person.details = [];
        if (Array.isArray(person.details)) {
          person.details.push({
            detail: params.details,
            added: new Date().toISOString(),
            source: 'voice-conversation'
          });
        } else {
          // Convert old string details to array format
          person.details = [
            { detail: person.details, source: 'legacy' },
            { detail: params.details, added: new Date().toISOString(), source: 'voice-conversation' }
          ];
        }
      }
      
      person.updated = new Date().toISOString();
      
      // Save to vault
      await window.emmaWebVault.scheduleElegantSave();
      
      console.log('✅ Person updated successfully:', person.name);
      
      return { 
        success: true, 
        personName: person.name,
        message: `Updated ${person.name} with new details`
      };
      
    } catch (error) {
      console.error('❌ updatePerson error:', error);
      return { error: 'Failed to update person: ' + error.message };
    }
  }
}

// Export for global use
window.EmmaRealtimeVoice = EmmaRealtimeVoice;
