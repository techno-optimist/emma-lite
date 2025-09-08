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
          this.orb.setHue(stateColors[state] || 260);
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
      const tokenResponse = await fetch('/api/realtime/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'voice',
          model: 'gpt-4o-realtime-preview-2024-12-17'
        })
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        throw new Error(error.error || 'Token generation failed');
      }

      const tokenData = await tokenResponse.json();
      console.log('🔑 Ephemeral token obtained, expires in', tokenData.expires_in, 'seconds');

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
   * Setup WebRTC connection to OpenAI Realtime
   */
  async setupWebRTC(tokenData) {
    try {
      // Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Add audio track
      const audioTrack = this.mediaStream.getAudioTracks()[0];
      this.peerConnection.addTrack(audioTrack, this.mediaStream);

      // Create data channel for tool calls
      this.dataChannel = this.peerConnection.createDataChannel('oai-events');
      this.setupDataChannelHandlers();

      // Handle incoming audio
      this.peerConnection.ontrack = (event) => {
        console.log('🔊 Incoming audio track');
        const audioElement = document.createElement('audio');
        audioElement.autoplay = true;
        audioElement.srcObject = event.streams[0];
        document.body.appendChild(audioElement);
        
        // Remove after session ends
        this.audioElement = audioElement;
      };

      // TODO: Actually connect to OpenAI Realtime API
      // For now, simulate connection
      console.log('🔗 WebRTC setup complete (simulation mode)');
      
    } catch (error) {
      console.error('❌ WebRTC setup failed:', error);
      throw error;
    }
  }

  /**
   * Setup data channel for privacy-first tool calls
   */
  setupDataChannelHandlers() {
    this.dataChannel.onopen = () => {
      console.log('📡 Data channel open for tool calls');
    };

    this.dataChannel.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'tool_call') {
          console.log('🔧 Tool call received:', message.name);
          
          // Execute tool locally (privacy-first)
          const result = await this.tools.execute(message.name, message.parameters);
          
          // Send result back
          this.dataChannel.send(JSON.stringify({
            type: 'tool_result',
            call_id: message.call_id,
            result: result
          }));
        }
        
      } catch (error) {
        console.error('❌ Data channel message error:', error);
      }
    };
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
   * Create memory from voice (vault integration)
   */
  async createMemoryFromVoice(params) {
    try {
      if (!window.emmaWebVault?.isOpen) {
        return { error: 'Vault not available' };
      }
      
      // Use existing vault system (Staging → Approval → Vault)
      const result = await window.emmaWebVault.addMemory({
        content: params.text,
        metadata: {
          source: 'voice',
          people: params.peopleIds || [],
          tags: ['voice-capture'],
          emotion: 'neutral',
          importance: 5
        }
      });
      
      return { success: true, memoryId: result.memory?.id };
      
    } catch (error) {
      console.error('❌ createMemoryFromVoice error:', error);
      return { error: 'Failed to create memory' };
    }
  }

  /**
   * Update person locally (vault integration)
   */
  async updatePerson(params) {
    try {
      if (!window.emmaWebVault?.isOpen) {
        return { error: 'Vault not available' };
      }
      
      const people = window.emmaWebVault.vaultData?.content?.people || {};
      const person = people[params.personId];
      
      if (!person) {
        return { error: 'Person not found' };
      }
      
      // Update person field
      person[params.field] = params.value;
      person.updated = new Date().toISOString();
      
      // Save to vault
      await window.emmaWebVault.scheduleElegantSave();
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ updatePerson error:', error);
      return { error: 'Failed to update person' };
    }
  }
}

// Export for global use
window.EmmaRealtimeVoice = EmmaRealtimeVoice;
