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
      const backendOrigin = (typeof window.getEmmaBackendOrigin === 'function')
        ? window.getEmmaBackendOrigin()
        : 'https://emma-voice-backend.onrender.com';
        
      const tokenResponse = await fetch(`${backendOrigin}/token`);

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
      this.updateStatus('Connected to Emma - ready to talk!');
      
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

      // Connect to OpenAI Realtime API (OFFICIAL ENDPOINT FROM DOCS)
      const baseUrl = 'https://api.openai.com/v1/realtime/calls';
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
            
            // CRITICAL: Session is configured via backend, not data channel
            // Just send initial greeting to trigger Emma's introduction
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
      create_memory_capsule: this.createMemoryCapsule.bind(this),
      update_person: this.updatePerson.bind(this),
      create_person_profile: this.createPersonProfile.bind(this),
      update_memory_capsule: this.updateMemoryCapsule.bind(this),
      attach_memory_media: this.attachMemoryMedia.bind(this)
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

      const peopleIds = await this.resolvePeopleIdentifiers(params.people || []);
      const attachments = await this.normalizeAttachments(params.attachments || []);
      const content = (params.content || '').trim();
      const derivedTitle = params.title || (content ? content.substring(0, 60) : 'Voice memory');

      // Create rich metadata from voice parameters
      const metadata = {
        source: 'voice-conversation',
        people: peopleIds,
        tags: ['voice-capture', 'conversation'],
        emotion: params.emotion || 'neutral',
        importance: params.importance || 7, // Default to high importance for voice memories
        created_via: 'emma-voice',
        date_captured: new Date().toISOString(),
        title: derivedTitle,
        date: params.date || undefined,
        location: params.location || undefined
      };

      // Use existing vault system (Staging → Approval → Vault)
      const result = await window.emmaWebVault.addMemory({
        content: content,
        metadata: metadata,
        attachments
      });

      console.log('✅ Memory created successfully:', result.memory?.id);

      return {
        success: true,
        memoryId: result.memory?.id,
        peopleConnected: peopleIds.length,
        attachmentCount: attachments.length,
        message: `Memory saved with ${peopleIds.length} people connected`
      };

    } catch (error) {
      console.error('❌ createMemoryFromVoice error:', error);
      return { error: 'Failed to create memory: ' + error.message };
    }
  }

  async createMemoryCapsule(params = {}) {
    try {
      if (!window.emmaWebVault?.isOpen) {
        return { error: 'Vault not available - please open your vault first' };
      }

      const content = (params.content || '').trim();
      if (!content) {
        return { error: 'Memory content is required' };
      }

      const title = params.title?.trim() || content.substring(0, 60);
      const peopleIds = await this.resolvePeopleIdentifiers(params.people || []);
      const attachments = await this.normalizeAttachments(params.attachments || []);

      const metadata = {
        ...(params.metadata || {}),
        title,
        people: peopleIds,
        emotion: params.emotion || params.metadata?.emotion || 'neutral',
        importance: typeof params.importance === 'number'
          ? params.importance
          : params.metadata?.importance || 5,
        tags: Array.isArray(params.tags) ? params.tags : params.metadata?.tags || [],
        location: params.location || params.metadata?.location || '',
        date: params.date || params.metadata?.date,
        captureMethod: params.captureMethod || 'chat-agent',
        created_via: 'emma-agent-chat'
      };

      const result = await window.emmaWebVault.addMemory({
        content,
        metadata,
        attachments
      });

      if (!result?.success) {
        return { error: result?.error || 'Failed to save memory' };
      }

      return {
        success: true,
        memoryId: result.memory?.id,
        title,
        peopleCount: peopleIds.length,
        attachmentCount: attachments.length
      };

    } catch (error) {
      console.error('❌ createMemoryCapsule error:', error);
      return { error: 'Failed to save memory capsule: ' + error.message };
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

  async resolvePeopleIdentifiers(peopleInput) {
    const ids = [];
    if (!Array.isArray(peopleInput)) {
      return ids;
    }

    const seen = new Set();
    for (const entry of peopleInput) {
      if (!entry) continue;

      if (typeof entry === 'string') {
        const person = await this.findOrCreatePerson(entry.trim());
        if (person?.id && !seen.has(person.id)) {
          ids.push(person.id);
          seen.add(person.id);
        }
        continue;
      }

      if (typeof entry === 'object') {
        if (entry.id) {
          if (!seen.has(entry.id)) {
            ids.push(entry.id);
            seen.add(entry.id);
          }
          if (entry.relationship && window.emmaWebVault?.vaultData?.content?.people?.[entry.id]) {
            window.emmaWebVault.vaultData.content.people[entry.id].relationship = entry.relationship;
          }
          continue;
        }

        if (entry.name) {
          const person = await this.findOrCreatePerson(entry.name);
          if (person?.id && !seen.has(person.id)) {
            ids.push(person.id);
            seen.add(person.id);
          }
          if (entry.relationship && person) {
            person.relationship = entry.relationship;
          }
        }
      }
    }

    return ids;
  }

  lookupChatMedia(uploadId) {
    if (!uploadId) return null;

    try {
      if (window.chatExperience && typeof window.chatExperience.lookupMediaUpload === 'function') {
        const media = window.chatExperience.lookupMediaUpload(uploadId);
        if (media) {
          return media;
        }
      }
    } catch (error) {
      console.warn('📷 lookupChatMedia error:', error);
    }

    return null;
  }

  async processAttachmentPayload(attachment) {
    if (!attachment) return null;

    try {
      const mediaStore = window.emmaWebVault?.vaultData?.content?.media || {};
      let { id, uploadId, data, dataUrl, type, name, size } = attachment;
      let payload = data || dataUrl || attachment.url;
      let resolvedName = name;
      let resolvedType = type || attachment.mimeType;
      let resolvedSize = size || attachment.fileSize || 0;

      if (!payload && (uploadId || id)) {
        const lookupId = uploadId || id;
        const chatMedia = this.lookupChatMedia(lookupId);
        if (chatMedia) {
          payload = chatMedia.dataUrl || chatMedia.data;
          resolvedName = resolvedName || chatMedia.name;
          resolvedType = resolvedType || chatMedia.type;
          resolvedSize = resolvedSize || chatMedia.size || resolvedSize;
          id = chatMedia.id || lookupId;
        }
      }

      if (!payload && id && mediaStore[id]) {
        const mediaItem = mediaStore[id];
        return {
          id,
          type: resolvedType || mediaItem.type,
          name: resolvedName || mediaItem.name,
          size: resolvedSize || mediaItem.size || 0
        };
      }

      if (!payload) {
        return null;
      }

      const mime = resolvedType || 'application/octet-stream';
      if (typeof payload === 'string' && !payload.startsWith('data:')) {
        payload = `data:${mime};base64,${payload}`;
      }

      const storedId = await window.emmaWebVault.addMedia({
        type: mime,
        name: resolvedName || 'memory-attachment',
        data: payload
      });

      return {
        id: storedId,
        type: mime,
        name: resolvedName || 'memory-attachment',
        size: resolvedSize || 0
      };

    } catch (error) {
      console.error('❌ processAttachmentPayload error:', error);
      return null;
    }
  }

  async normalizeAttachments(attachments) {
    if (!Array.isArray(attachments) || attachments.length === 0) {
      return [];
    }

    const processed = [];
    for (const attachment of attachments) {
      const normalized = await this.processAttachmentPayload(attachment);
      if (normalized) {
        processed.push(normalized);
      }
    }

    return processed;
  }

  async createPersonProfile(params = {}) {
    try {
      if (!window.emmaWebVault?.isOpen) {
        return { error: 'Vault not available - please open your vault first' };
      }

      const name = params.name?.trim();
      if (!name) {
        return { error: 'Person name is required' };
      }

      const people = window.emmaWebVault.vaultData?.content?.people || {};
      let person = Object.values(people).find(p => p.name?.toLowerCase() === name.toLowerCase());

      if (!person) {
        const personId = 'person_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        person = {
          id: personId,
          name,
          created: new Date().toISOString(),
          source: 'emma-agent-chat'
        };
        people[personId] = person;
      }

      if (params.relationship) {
        person.relationship = params.relationship;
      }

      if (params.pronouns) {
        person.pronouns = params.pronouns;
      }

      if (params.birthday) {
        person.birthday = params.birthday;
      }

      if (params.details) {
        if (!person.details) {
          person.details = [];
        }
        if (Array.isArray(person.details)) {
          person.details.push({
            detail: params.details,
            added: new Date().toISOString(),
            source: 'emma-agent-chat'
          });
        } else if (typeof person.details === 'string') {
          person.details = [
            { detail: person.details, source: 'legacy' },
            { detail: params.details, added: new Date().toISOString(), source: 'emma-agent-chat' }
          ];
        }
      }

      if (params.avatar && (params.avatar.data || params.avatar.dataUrl || params.avatar.uploadId || params.avatar.id)) {
        const avatarAttachment = await this.processAttachmentPayload({
          id: params.avatar.id,
          uploadId: params.avatar.uploadId,
          data: params.avatar.data,
          dataUrl: params.avatar.dataUrl,
          type: params.avatar.type || 'image/png',
          name: params.avatar.name || `${name}-avatar`
        });

        if (avatarAttachment?.id) {
          person.avatarId = avatarAttachment.id;
          person.avatarUpdated = new Date().toISOString();
        }
      }

      person.updated = new Date().toISOString();

      await window.emmaWebVault.scheduleElegantSave();

      return {
        success: true,
        personId: person.id,
        personName: person.name
      };

    } catch (error) {
      console.error('❌ createPersonProfile error:', error);
      return { error: 'Failed to create person: ' + error.message };
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

  async updateMemoryCapsule(params = {}) {
    try {
      if (!window.emmaWebVault?.isOpen) {
        return { error: 'Vault not available - please open your vault first' };
      }

      const memoryId = params.memoryId;
      if (!memoryId) {
        return { error: 'memoryId is required' };
      }

      const memory = window.emmaWebVault.vaultData?.content?.memories?.[memoryId];
      if (!memory) {
        return { error: 'Memory not found' };
      }

      const updates = {};
      const metadataUpdates = {};

      if (typeof params.content === 'string' && params.content.trim()) {
        updates.content = params.content.trim();
        if (!params.title) {
          metadataUpdates.title = params.content.trim().substring(0, 60);
        }
      }

      if (params.title) {
        metadataUpdates.title = params.title;
      }

      if (Array.isArray(params.tags)) {
        metadataUpdates.tags = params.tags;
      }

      if (params.emotion) {
        metadataUpdates.emotion = params.emotion;
      }

      if (typeof params.importance === 'number') {
        metadataUpdates.importance = params.importance;
      }

      if (params.location) {
        metadataUpdates.location = params.location;
      }

      if (params.date) {
        metadataUpdates.date = params.date;
      }

      if (params.people) {
        metadataUpdates.people = await this.resolvePeopleIdentifiers(params.people);
      }

      if (Object.keys(metadataUpdates).length > 0) {
        updates.metadata = {
          ...memory.metadata,
          ...metadataUpdates
        };
      }

      let attachmentsChanged = false;
      let attachments = Array.isArray(memory.attachments) ? [...memory.attachments] : [];

      if (Array.isArray(params.removeAttachmentIds) && params.removeAttachmentIds.length > 0) {
        const removalSet = new Set(params.removeAttachmentIds);
        attachments = attachments.filter(att => !removalSet.has(att.id));
        attachmentsChanged = true;
      }

      if (params.replaceAttachments) {
        attachments = [];
        attachmentsChanged = true;
      }

      if (Array.isArray(params.attachments) && params.attachments.length > 0) {
        const newAttachments = await this.normalizeAttachments(params.attachments);
        if (newAttachments.length > 0) {
          attachments = attachments.concat(newAttachments);
          attachmentsChanged = true;
        }
      }

      if (attachmentsChanged) {
        updates.attachments = attachments;
      }

      if (Object.keys(updates).length === 0) {
        return { success: true, memoryId, updatedFields: [] };
      }

      const result = await window.emmaWebVault.updateMemory(memoryId, updates);
      if (!result?.success) {
        return { error: result?.error || 'Failed to update memory' };
      }

      const updatedFields = Object.keys(updates);
      return {
        success: true,
        memoryId,
        updatedFields,
        attachmentCount: updates.attachments ? updates.attachments.length : undefined
      };

    } catch (error) {
      console.error('❌ updateMemoryCapsule error:', error);
      return { error: 'Failed to update memory: ' + error.message };
    }
  }

  async attachMemoryMedia(params = {}) {
    try {
      if (!params.memoryId) {
        return { error: 'memoryId is required' };
      }
      if (!Array.isArray(params.media) || params.media.length === 0) {
        return { error: 'Media array is required' };
      }

      const updateResult = await this.updateMemoryCapsule({
        memoryId: params.memoryId,
        attachments: params.media,
        replaceAttachments: params.replaceExisting === true
      });

      if (updateResult.success) {
        return {
          ...updateResult,
          attachmentCount: updateResult.attachmentCount ?? params.media.length
        };
      }

      return updateResult;

    } catch (error) {
      console.error('❌ attachMemoryMedia error:', error);
      return { error: 'Failed to attach media: ' + error.message };
    }
  }
}

// Export for global use
window.EmmaRealtimeVoice = EmmaRealtimeVoice;
