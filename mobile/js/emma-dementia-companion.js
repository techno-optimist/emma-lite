/**
 * Emma Dementia Companion - Specialized support for users with memory impairment
 * Built on top of the existing Emma Orb infrastructure
 */

class EmmaDementiaCompanion extends BaseOrb {
  constructor(container, options = {}) {
    console.log('🧠 EmmaDementiaCompanion constructor called with container:', container, 'options:', options);
    super(container, { ...options, orbType: 'dementia' });
    this.options = {
      stage: 'EARLY', // EARLY, MIDDLE, LATE
      voiceEnabled: true,
      caregiverMode: false,
      userName: 'dear',
      preferredVoice: null,
      ...options
    };
    console.log('🧠 Options after merge:', this.options);
    
    // Initialize base orb
    this.orb = new EmmaOrb(container, {
      hue: 200, // Calming blue default
      hoverIntensity: 0.1, // Gentler hover effect
      rotateOnHover: false, // Less disorienting
      ...options.orbOptions
    });
    
    // State management
    this.state = {
      isListening: false,
      isProcessing: false,
      currentActivity: null,
      recentQuestions: new Map(), // Track repeated questions
      emotionalState: 'neutral',
      lastInteraction: null
    };
    
    // CTO Intelligence Enhancement: Initialize intelligent components
    this.initializeIntelligenceLayer();
    
    // Load per-vault settings before initializing components
    // Initialize
    this.init();
  }

  /**
   * CTO Enhancement: Initialize Intelligence Layer for Dementia Care
   */
  initializeIntelligenceLayer() {
    try {
      // Initialize Memory Context Analyzer for personalized responses
      if (typeof MemoryContextAnalyzer !== 'undefined') {
        this.contextAnalyzer = new MemoryContextAnalyzer();
        console.log('🧠 Memory Context Analyzer initialized for dementia care');
      } else {
        console.warn('🧠 MemoryContextAnalyzer not available - using basic responses');
      }

      // Initialize Question Engine for gentle, contextual prompts
      if (typeof EmmaQuestionEngine !== 'undefined') {
        this.questionEngine = new EmmaQuestionEngine();
        console.log('🧠 Question Engine initialized for dementia care');
      } else {
        console.warn('🧠 EmmaQuestionEngine not available - using basic prompts');
      }

      // Memory context cache for faster responses
      this.memoryContext = null;
      this.lastContextUpdate = null;
    } catch (error) {
      console.error('🧠 Error initializing intelligence layer:', error);
    }
  }

  async init() {
    await super.init();
    
    // Auto-initialization
    await this.loadSettings();
    this.initializeUIBasedOnSettings();
    
    // Setup click handler AFTER UI is created
    this.finalizeInitialization();
    
    // Listen for settings changes
    this.setupSettingsListener();
  }

  async loadSettings() {
    try {
      console.log('🧠 Dementia Companion: Loading settings...');
      // Try Electron bridge first
      let vid = 'unknown';
      let values = {};
      
      // First, try to get vault ID
      try {
        if (window.emmaAPI?.vault?.status) {
          const status = await window.emmaAPI.vault.status();
          vid = status?.vaultId || vid;
          console.log('🧠 Vault ID from Electron API:', vid);
        }
      } catch (e) {
        console.log('🧠 Failed to get vault ID from Electron:', e.message);
      }
      
      // Try Electron storage
      try {
        if (window.emmaAPI?.storage?.get) {
          const keys = [
            `dementia.enabled:${vid}`,
            `dementia.stage:${vid}`,
            `dementia.voiceEnabled:${vid}`,
            `dementia.storeTranscripts:${vid}`
          ];
          values = await window.emmaAPI.storage.get(keys) || {};
          console.log('🧠 Settings from Electron storage:', values);
        }
      } catch (e) {
        console.log('🧠 Electron storage failed:', e.message);
      }

      // Fallback to extension storage if Electron bridge unavailable
      if (!values || Object.keys(values).length === 0) {
        try {
          // Get vault id from background
          const bgStatus = await (window.chrome && chrome.runtime && chrome.runtime.sendMessage
            ? chrome.runtime.sendMessage({ action: 'vault.getStatus' })
            : Promise.resolve(null));
          if (bgStatus && bgStatus.vaultId) vid = bgStatus.vaultId;
          const keys = [
            `dementia.enabled:${vid}`,
            `dementia.stage:${vid}`,
            `dementia.voiceEnabled:${vid}`,
            `dementia.storeTranscripts:${vid}`
          ];
          values = (window.chrome && chrome.storage && chrome.storage.local
            ? await new Promise((resolve) => chrome.storage.local.get(keys, resolve))
            : {});
        } catch {}
      }

      const keys = [
        `dementia.enabled:${vid}`,
        `dementia.stage:${vid}`,
        `dementia.voiceEnabled:${vid}`,
        `dementia.storeTranscripts:${vid}`,
        `dementia.micConsent:${vid}`
      ];
      this.isEnabledForVault = Boolean(values[keys[0]]);
      if (values[keys[1]]) this.options.stage = values[keys[1]];
      if (values[keys[2]] !== undefined) this.options.voiceEnabled = Boolean(values[keys[2]]);
      this.options.storeTranscripts = Boolean(values[keys[3]]);
      this.micConsentGranted = values[keys[4]] === true;
      
      console.log('🧠 Dementia Companion settings loaded:', {
        vaultId: vid,
        enabled: this.isEnabledForVault,
        stage: this.options.stage,
        voice: this.options.voiceEnabled,
        transcripts: this.options.storeTranscripts,
        keys: keys,
        rawValues: values
      });
    } catch {
      this.isEnabledForVault = false;
    }
  }

  initializeUIBasedOnSettings() {
    console.log('🧠 Initializing UI based on settings, enabled:', this.isEnabledForVault);
    
    // Clear any existing UI
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
    
    // Respect per-vault toggle
    if (!this.isEnabledForVault) {
      // Minimal UI only
      this.setupUI(true);
      this.updateOrbState('disabled');
      return;
    }
    
    // Initialize components for full mode
    this.initializeVoiceInterface();
    this.initializePatternRecognition();
    this.initializeConversationEngine();
    this.initializeCaregiverReporting();
    this.setupUI(false);
    this.updateOrbState('idle');
  }

  setupSettingsListener() {
    // Listen for settings changes from the options page
    if (window.chrome && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'settings.changed') {
          const hasDementiaKeys = message.keys?.some(k => k.startsWith('dementia.'));
          if (hasDementiaKeys) {
            console.log('🧠 Settings changed, reloading dementia companion settings');
            this.loadSettings().then(() => {
              this.initializeUIBasedOnSettings();
            });
          }
        }
      });
    }
    
    // Also listen for localStorage changes (fallback)
    window.addEventListener('storage', (e) => {
      if (e.key === 'dementia.settings.bump') {
        console.log('🧠 Settings bump detected, reloading dementia companion settings');
        setTimeout(() => {
          this.loadSettings().then(() => {
            this.initializeUIBasedOnSettings();
          });
        }, 100);
      }
    });
  }

  async persistSetting(name, value) {
    try {
      // Try Electron storage first
      const status = await window.emmaAPI?.vault?.status?.();
      const vid = status?.vaultId || 'unknown';
      const key = `dementia.${name}:${vid}`;
      if (window.emmaAPI?.storage?.set) {
        await window.emmaAPI.storage.set({ [key]: value });
        return true;
      }
    } catch {}
    try {
      // Fallback to extension local storage
      const bgStatus = await (window.chrome && chrome.runtime && chrome.runtime.sendMessage
        ? chrome.runtime.sendMessage({ action: 'vault.getStatus' })
        : Promise.resolve(null));
      const vid = (bgStatus && bgStatus.vaultId) ? bgStatus.vaultId : 'unknown';
      const key = `dementia.${name}:${vid}`;
      if (window.chrome && chrome.storage && chrome.storage.local) {
        await new Promise((resolve) => chrome.storage.local.set({ [key]: value }, resolve));
        return true;
      }
    } catch {}
    return false;
  }
  
  initializeVoiceInterface() {
    if (!this.options.voiceEnabled) return;
    if (!this.micConsentGranted) return; // gate on explicit consent
    
    // Check for speech recognition support
    this.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!this.SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }
    
    this.recognition = new this.SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    
    // Voice synthesis for responses
    this.synthesis = window.speechSynthesis;
    this.setupVoice();
    
    // Wake word detection
    this.setupWakeWordDetection();
  }
  
  setupVoice() {
    // Get available voices and select preferred
    const voices = this.synthesis.getVoices();
    if (this.options.preferredVoice) {
      this.voice = voices.find(v => v.name === this.options.preferredVoice);
    }
    if (!this.voice) {
      // Default to a calm, clear voice
      this.voice = voices.find(v => v.name.includes('Google UK English Female')) ||
                   voices.find(v => v.name.includes('Samantha')) ||
                   voices[0];
    }
  }
  
  setupWakeWordDetection() {
    let wakeWordTimeout;
    
    this.recognition.onresult = (event) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript.toLowerCase();
      
      // Check for wake word
      if (transcript.includes('emma') || transcript.includes('hey emma')) {
        this.activateListening();
        return;
      }
      
      // If listening is active, process the speech
      if (this.state.isListening) {
        clearTimeout(wakeWordTimeout);
        wakeWordTimeout = setTimeout(() => {
          this.processSpeech(transcript);
        }, 1000); // Wait for pause in speech
      }
    };
    
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        this.deactivateListening();
      }
    };
  }
  
  activateListening() {
    this.state.isListening = true;
    this.updateOrbState('listening');
    this.speak("I'm here. How can I help?", { gentle: true });
    
    // Auto-deactivate after 30 seconds of no interaction
    this.listeningTimeout = setTimeout(() => {
      this.deactivateListening();
    }, 30000);
  }
  
  deactivateListening() {
    this.state.isListening = false;
    this.updateOrbState('idle');
    clearTimeout(this.listeningTimeout);
  }
  
  async processSpeech(transcript) {
    // Reset listening timeout
    clearTimeout(this.listeningTimeout);
    this.listeningTimeout = setTimeout(() => {
      this.deactivateListening();
    }, 30000);
    
    // Track the question
    this.trackQuestion(transcript);
    
    // CTO Intelligence Enhancement: Get enhanced context with memory analysis
    const context = await this.determineEnhancedContext(transcript);
    const response = await this.generateIntelligentResponse(transcript, context);
    
    // Speak the response
    this.speak(response.text, response.options);
    
    // Update state
    this.state.lastInteraction = {
      timestamp: Date.now(),
      userSpeech: transcript,
      emmaResponse: response.text,
      context: context,
      intelligenceUsed: response.intelligenceUsed || false
    };
    
    // Log for caregiver reporting
    this.logInteraction(this.state.lastInteraction);
  }
  
  trackQuestion(question) {
    // Normalize the question for comparison
    const normalized = this.normalizeQuestion(question);
    
    // Check if this question was asked recently
    if (this.state.recentQuestions.has(normalized)) {
      const lastAsked = this.state.recentQuestions.get(normalized);
      const timeSince = Date.now() - lastAsked.timestamp;
      
      if (timeSince < 300000) { // Within 5 minutes
        lastAsked.count++;
        lastAsked.timestamp = Date.now();
        
        // Flag for caregiver if repeated too often
        if (lastAsked.count > 3) {
          this.flagRepetitiveQuestion(normalized, lastAsked.count);
        }
      }
    } else {
      this.state.recentQuestions.set(normalized, {
        count: 1,
        timestamp: Date.now(),
        original: question
      });
    }
    
    // Clean up old questions (older than 1 hour)
    this.cleanupOldQuestions();
  }
  
  normalizeQuestion(question) {
    // Remove common variations to detect same question
    return question.toLowerCase()
      .replace(/who is|who's|who are/g, 'who')
      .replace(/what is|what's|what are/g, 'what')
      .replace(/where is|where's|where are/g, 'where')
      .replace(/this person|that person|they|them/g, 'person')
      .replace(/[?.!,]/g, '')
      .trim();
  }
  
  determineContext() {
    // Check what the user is currently doing
    const currentPage = window.location.pathname;
    const context = {
      activity: 'general',
      page: currentPage,
      hasMemoriesOpen: false,
      currentMemory: null
    };
    
    // Check if viewing memories
    if (currentPage.includes('memories') || document.querySelector('.memory-viewer')) {
      context.activity = 'viewing_memories';
      context.hasMemoriesOpen = true;
      
      // Try to determine which memory is being viewed
      const activeMemory = document.querySelector('.memory-active');
      if (activeMemory) {
        context.currentMemory = {
          id: activeMemory.dataset.memoryId,
          type: activeMemory.dataset.memoryType,
          caption: activeMemory.querySelector('.memory-caption')?.textContent
        };
      }
    }
    
    return context;
  }
  
  /**
   * CTO Intelligence Enhancement: Enhanced context determination with memory analysis
   */
  async determineEnhancedContext(userSpeech) {
    // Start with basic context
    const basicContext = this.determineContext();
    
    // Enhance with memory context analysis if available
    if (this.contextAnalyzer) {
      try {
        // Update memory context cache if needed (every 5 minutes)
        const now = Date.now();
        if (!this.memoryContext || !this.lastContextUpdate || 
            (now - this.lastContextUpdate) > 300000) {
          
          console.log('🧠 Updating memory context for dementia care...');
          await this.contextAnalyzer.loadMemories();
          this.memoryContext = await this.contextAnalyzer.analyzeMemoryContext();
          this.lastContextUpdate = now;
        }
        
        // Enhance context with memory insights
        return {
          ...basicContext,
          memoryInsights: this.memoryContext,
          relevantMemories: await this.findRelevantMemories(userSpeech),
          userSpeechAnalysis: this.analyzeUserSpeech(userSpeech),
          intelligenceEnhanced: true
        };
      } catch (error) {
        console.error('🧠 Error enhancing context:', error);
        return { ...basicContext, intelligenceEnhanced: false };
      }
    }
    
    return { ...basicContext, intelligenceEnhanced: false };
  }

  /**
   * CTO Intelligence Enhancement: Find memories relevant to user's speech
   */
  async findRelevantMemories(userSpeech) {
    if (!this.contextAnalyzer || !this.memoryContext) return [];
    
    try {
      // Extract key terms from user speech
      const keyTerms = this.extractKeyTerms(userSpeech);
      
      // Find memories that match themes, people, or keywords
      const relevantMemories = [];
      
      if (this.memoryContext.memories) {
        for (const memory of this.memoryContext.memories) {
          const memoryText = (memory.story || memory.title || '').toLowerCase();
          
          // Check for keyword matches
          const hasKeywordMatch = keyTerms.some(term => 
            memoryText.includes(term.toLowerCase())
          );
          
          // Check for people matches
          const hasPeopleMatch = this.memoryContext.people.some(person =>
            userSpeech.toLowerCase().includes(person.toLowerCase())
          );
          
          if (hasKeywordMatch || hasPeopleMatch) {
            relevantMemories.push({
              ...memory,
              relevanceScore: this.calculateRelevanceScore(memory, keyTerms)
            });
          }
        }
      }
      
      // Sort by relevance and return top 3
      return relevantMemories
        .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
        .slice(0, 3);
    } catch (error) {
      console.error('🧠 Error finding relevant memories:', error);
      return [];
    }
  }

  /**
   * CTO Intelligence Enhancement: Generate intelligent, contextual responses
   */
  async generateIntelligentResponse(userSpeech, context) {
    const stage = this.getStageProfile();
    let response = { text: '', options: { gentle: true, pace: 'slow' }, intelligenceUsed: false };
    
    // Try intelligent response first if available
    if (context.intelligenceEnhanced && this.questionEngine) {
      try {
        const intelligentResponse = await this.generateContextualResponse(userSpeech, context, stage);
        if (intelligentResponse) {
          return { ...intelligentResponse, intelligenceUsed: true };
        }
      } catch (error) {
        console.error('🧠 Error generating intelligent response:', error);
      }
    }
    
    // Fallback to original pattern-based responses
    return this.generateBasicResponse(userSpeech, context, stage);
  }

  /**
   * CTO Intelligence Enhancement: Generate contextual response using memory insights
   */
  async generateContextualResponse(userSpeech, context, stage) {
    const { memoryInsights, relevantMemories } = context;
    
    // Pattern matching with memory context
    if (userSpeech.match(/who.*(this|that|person|they)/i)) {
      return this.handleIntelligentPersonIdentification(relevantMemories, stage);
    } else if (userSpeech.match(/where.*(this|we|am i)/i)) {
      return this.handleIntelligentLocationQuestion(relevantMemories, stage);
    } else if (userSpeech.match(/when.*(this|that|happen)/i)) {
      return this.handleIntelligentTimeQuestion(relevantMemories, stage);
    } else if (userSpeech.match(/tell me.*(about|more)/i)) {
      return this.handleIntelligentStoryPrompt(relevantMemories, memoryInsights, stage);
    } else if (relevantMemories.length > 0) {
      // Generate response based on relevant memories
      return this.generateMemoryBasedResponse(relevantMemories[0], stage);
    }
    
    return null; // No intelligent response available
  }

  /**
   * Original response generation (renamed for clarity)
   */
  generateBasicResponse(userSpeech, context, stage) {
    let responseText = '';
    let options = { gentle: true, pace: 'slow' };
    
    // Pattern matching for common questions
    if (userSpeech.match(/who.*(this|that|person|they)/i)) {
      responseText = this.handlePersonIdentification(context, stage);
    } else if (userSpeech.match(/where.*(this|we|am i)/i)) {
      responseText = this.handleLocationQuestion(context, stage);
    } else if (userSpeech.match(/when.*(this|that|happen)/i)) {
      responseText = this.handleTimeQuestion(context, stage);
    } else if (userSpeech.match(/help|confused|don't understand/i)) {
      responseText = this.handleConfusion(context, stage);
      options.comforting = true;
    } else if (userSpeech.match(/tell me.*(about|more)/i)) {
      responseText = this.handleStoryPrompt(context, stage);
    } else {
      // General conversational response
      responseText = this.handleGeneralConversation(userSpeech, context, stage);
    }
    
    return { text: responseText, options };
  }

  /**
   * CTO Intelligence Enhancement: Intelligent response handlers
   */
  
  handleIntelligentPersonIdentification(relevantMemories, stage) {
    if (relevantMemories.length === 0) return null;
    
    const memory = relevantMemories[0];
    const people = this.extractPeopleFromMemory(memory);
    
    if (people.length > 0) {
      const person = people[0];
      let response = '';
      
      switch (stage.name) {
        case 'EARLY':
          response = `That looks like ${person}. `;
          if (memory.story) {
            response += `I remember you mentioned ${this.extractRelationshipContext(memory, person)}.`;
          }
          break;
        case 'MIDDLE':
          response = `I see ${person} there. They look happy in this memory, don't they?`;
          break;
        case 'LATE':
          response = `What a lovely person. They seem very special to you.`;
          break;
      }
      
      return { text: response, options: { gentle: true, pace: 'slow' } };
    }
    
    return null;
  }

  handleIntelligentLocationQuestion(relevantMemories, stage) {
    if (relevantMemories.length === 0) return null;
    
    const memory = relevantMemories[0];
    const location = this.extractLocationFromMemory(memory);
    
    if (location) {
      let response = '';
      
      switch (stage.name) {
        case 'EARLY':
          response = `This looks like it was taken at ${location}. `;
          if (memory.story) {
            response += `You mentioned it was ${this.extractLocationContext(memory)}.`;
          }
          break;
        case 'MIDDLE':
          response = `This is a beautiful place. It looks peaceful and special.`;
          break;
        case 'LATE':
          response = `What a lovely setting. You must have had wonderful times here.`;
          break;
      }
      
      return { text: response, options: { gentle: true, pace: 'slow' } };
    }
    
    return null;
  }

  handleIntelligentTimeQuestion(relevantMemories, stage) {
    if (relevantMemories.length === 0) return null;
    
    const memory = relevantMemories[0];
    const timeContext = this.extractTimeFromMemory(memory);
    
    if (timeContext) {
      let response = '';
      
      switch (stage.name) {
        case 'EARLY':
          response = `This was ${timeContext}. `;
          if (memory.story) {
            response += `You shared such a lovely story about this time.`;
          }
          break;
        case 'MIDDLE':
          response = `This brings back such beautiful memories from ${timeContext}.`;
          break;
        case 'LATE':
          response = `This is from a special time in your life. Such precious memories.`;
          break;
      }
      
      return { text: response, options: { gentle: true, pace: 'slow' } };
    }
    
    return null;
  }

  handleIntelligentStoryPrompt(relevantMemories, memoryInsights, stage) {
    if (relevantMemories.length === 0) return null;
    
    const memory = relevantMemories[0];
    let response = '';
    
    switch (stage.name) {
      case 'EARLY':
        response = `I'd love to hear more about this memory. `;
        if (memory.story) {
          response += `You mentioned ${this.extractStoryHighlight(memory)}. What else do you remember?`;
        } else {
          response += `What was special about this moment?`;
        }
        break;
      case 'MIDDLE':
        response = `This looks like such a meaningful memory. Tell me what you're feeling when you look at this.`;
        break;
      case 'LATE':
        response = `This is beautiful. I can see how much joy this brings you.`;
        break;
    }
    
    return { text: response, options: { gentle: true, pace: 'slow', encouraging: true } };
  }

  generateMemoryBasedResponse(memory, stage) {
    let response = '';
    
    switch (stage.name) {
      case 'EARLY':
        response = `This reminds me of when you told me about ${this.extractMemoryTheme(memory)}. `;
        response += `It sounds like it was a wonderful time.`;
        break;
      case 'MIDDLE':
        response = `I can see this is a precious memory for you. The happiness shows in your face.`;
        break;
      case 'LATE':
        response = `What a beautiful moment. You can feel the love and joy in this memory.`;
        break;
    }
    
    return { text: response, options: { gentle: true, pace: 'slow', validating: true } };
  }

  /**
   * CTO Intelligence Enhancement: Utility methods for memory analysis
   */
  
  extractKeyTerms(speech) {
    // Simple keyword extraction - could be enhanced with NLP
    const words = speech.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'was', 'are', 'were', 'this', 'that', 'these', 'those']);
    return words.filter(word => word.length > 2 && !stopWords.has(word));
  }

  calculateRelevanceScore(memory, keyTerms) {
    let score = 0;
    const memoryText = (memory.story || memory.title || '').toLowerCase();
    
    keyTerms.forEach(term => {
      if (memoryText.includes(term)) {
        score += 1;
      }
    });
    
    return score;
  }

  analyzeUserSpeech(speech) {
    return {
      length: speech.length,
      questionType: this.detectQuestionType(speech),
      emotionalTone: this.detectEmotionalTone(speech),
      keyTerms: this.extractKeyTerms(speech)
    };
  }

  detectQuestionType(speech) {
    if (speech.match(/who/i)) return 'person';
    if (speech.match(/where/i)) return 'location';
    if (speech.match(/when/i)) return 'time';
    if (speech.match(/what/i)) return 'description';
    if (speech.match(/how/i)) return 'process';
    if (speech.match(/why/i)) return 'reason';
    return 'general';
  }

  detectEmotionalTone(speech) {
    if (speech.match(/happy|joy|love|wonderful|great/i)) return 'positive';
    if (speech.match(/sad|confused|lost|help|don't know/i)) return 'negative';
    return 'neutral';
  }

  extractPeopleFromMemory(memory) {
    // Simple name extraction - could be enhanced
    const text = memory.story || memory.title || '';
    const names = [];
    
    // Look for common name patterns
    const nameMatches = text.match(/\b[A-Z][a-z]+\b/g) || [];
    nameMatches.forEach(match => {
      if (match.length > 2 && !['The', 'This', 'That', 'When', 'Where'].includes(match)) {
        names.push(match);
      }
    });
    
    return names;
  }

  extractLocationFromMemory(memory) {
    const text = (memory.story || memory.title || '').toLowerCase();
    
    // Look for location indicators
    const locationKeywords = ['at', 'in', 'near', 'by', 'park', 'beach', 'home', 'house', 'restaurant', 'church', 'school'];
    for (const keyword of locationKeywords) {
      if (text.includes(keyword)) {
        return this.extractContextAroundKeyword(text, keyword);
      }
    }
    
    return null;
  }

  extractTimeFromMemory(memory) {
    const text = (memory.story || memory.title || '').toLowerCase();
    
    // Look for time indicators
    if (text.match(/\d{4}/)) {
      const year = text.match(/\d{4}/)[0];
      return `around ${year}`;
    }
    
    const timeKeywords = ['summer', 'winter', 'spring', 'fall', 'christmas', 'birthday', 'wedding', 'graduation'];
    for (const keyword of timeKeywords) {
      if (text.includes(keyword)) {
        return `during ${keyword}`;
      }
    }
    
    return 'a special time';
  }

  extractContextAroundKeyword(text, keyword) {
    const words = text.split(' ');
    const keywordIndex = words.findIndex(word => word.includes(keyword));
    
    if (keywordIndex !== -1) {
      const start = Math.max(0, keywordIndex - 2);
      const end = Math.min(words.length, keywordIndex + 3);
      return words.slice(start, end).join(' ');
    }
    
    return keyword;
  }

  extractStoryHighlight(memory) {
    const story = memory.story || '';
    if (story.length > 100) {
      return story.substring(0, 100) + '...';
    }
    return story;
  }

  extractMemoryTheme(memory) {
    const text = (memory.story || memory.title || '').toLowerCase();
    
    if (text.includes('family')) return 'your family';
    if (text.includes('travel')) return 'your travels';
    if (text.includes('wedding')) return 'your wedding';
    if (text.includes('birthday')) return 'a birthday celebration';
    if (text.includes('holiday')) return 'a holiday';
    
    return 'this special time';
  }

  extractRelationshipContext(memory, person) {
    const text = (memory.story || '').toLowerCase();
    
    if (text.includes('mom') || text.includes('mother')) return 'your mother';
    if (text.includes('dad') || text.includes('father')) return 'your father';
    if (text.includes('husband') || text.includes('wife')) return 'your spouse';
    if (text.includes('son') || text.includes('daughter')) return 'your child';
    if (text.includes('friend')) return 'a dear friend';
    
    return 'someone special';
  }

  extractLocationContext(memory) {
    const text = (memory.story || '').toLowerCase();
    
    if (text.includes('vacation') || text.includes('trip')) return 'a wonderful vacation spot';
    if (text.includes('home')) return 'home';
    if (text.includes('park')) return 'a beautiful park';
    if (text.includes('beach')) return 'a lovely beach';
    
    return 'a special place';
  }
  
  handlePersonIdentification(context, stage) {
    if (!context.currentMemory) {
      return "I'd love to help. Can you show me which photo you're asking about?";
    }
    
    // Check if this is a repeated question
    const isRepeated = this.isRecentlyAskedQuestion('who person');
    
    if (isRepeated && stage.errorCorrection === 'none') {
      // Don't highlight the repetition
      return "This looks like someone special to you. What do you remember about them?";
    }
    
    // Try to get information from the memory
    if (context.currentMemory.caption) {
      if (stage.responseDetail === 'full') {
        return `I see ${context.currentMemory.caption}. Tell me what you remember about this moment.`;
      } else {
        return `Someone special. Can you tell me about them?`;
      }
    }
    
    return "Tell me what you see in this photo. I'd love to hear about it.";
  }
  
  handleConfusion(context, stage) {
    const responses = [
      "That's okay. We can take our time. What would you like to know?",
      "No worries at all. I'm here to help. What can I tell you about?",
      "It's perfectly fine. Would you like me to describe what I see?"
    ];
    
    if (stage.interaction === 'validation-only') {
      return "You're doing wonderfully. I'm right here with you.";
    }
    
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  handleStoryPrompt(context, stage) {
    if (!context.currentMemory) {
      return "I'd love to hear a story. What would you like to share?";
    }
    
    const prompts = [
      "This looks like a wonderful moment. What made this day special?",
      "I can see this means a lot to you. What do you remember most?",
      "Tell me about the happiness in this photo."
    ];
    
    return prompts[Math.floor(Math.random() * prompts.length)];
  }
  
  speak(text, options = {}) {
    if (!this.synthesis || !this.voice) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.voice;
    utterance.rate = options.pace === 'slow' ? 0.85 : 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;
    
    // Add emotional tone
    if (options.comforting) {
      utterance.rate = 0.8;
      utterance.pitch = 0.95;
    }
    
    this.updateOrbState('speaking');
    utterance.onend = () => {
      this.updateOrbState('listening');
    };
    
    this.synthesis.speak(utterance);
  }
  
  initializePatternRecognition() {
    this.patterns = {
      repetition: new Map(),
      confusion: [],
      emotional: []
    };
    
    // Set up monitoring intervals
    setInterval(() => this.analyzePatterns(), 60000); // Every minute
    setInterval(() => this.generateCaregiverReport(), 3600000); // Every hour
  }
  
  analyzePatterns() {
    // Analyze recent interactions for patterns
    const recentRepetitions = Array.from(this.state.recentQuestions.entries())
      .filter(([_, data]) => data.count > 2);
    
    if (recentRepetitions.length > 0) {
      this.patterns.repetition.set(Date.now(), {
        questions: recentRepetitions,
        severity: this.calculateRepetitionSeverity(recentRepetitions)
      });
    }
    
    // Detect emotional patterns
    if (this.state.emotionalState !== 'neutral') {
      this.patterns.emotional.push({
        timestamp: Date.now(),
        state: this.state.emotionalState,
        trigger: this.state.lastInteraction
      });
    }
  }
  
  initializeConversationEngine() {
    this.conversationTemplates = {
      EARLY: {
        greetings: [
          "Hello! How are you feeling today?",
          "Good to see you! What would you like to look at?",
          "Hi there! Ready to explore some memories?"
        ],
        validations: [
          "That's a wonderful memory.",
          "Thank you for sharing that with me.",
          "What a special moment that must have been."
        ],
        prompts: [
          "Can you tell me more about that?",
          "What else do you remember?",
          "How did that make you feel?"
        ]
      },
      MIDDLE: {
        greetings: [
          "Hello! I'm here to help.",
          "Hi! Let's look at some photos.",
          "Good to see you!"
        ],
        validations: [
          "That's nice.",
          "Thank you for telling me.",
          "How wonderful."
        ],
        prompts: [
          "Tell me about this.",
          "What do you see?",
          "Do you remember this?"
        ]
      },
      LATE: {
        greetings: [
          "Hello, dear.",
          "I'm here with you.",
          "Everything is okay."
        ],
        validations: [
          "Yes, that's right.",
          "You're doing great.",
          "I understand."
        ],
        prompts: [
          "This is nice.",
          "You're safe.",
          "I'm listening."
        ]
      }
    };
  }
  
  initializeCaregiverReporting() {
    this.caregiverData = {
      interactions: [],
      patterns: {
        bestTimes: new Map(),
        triggerWords: new Set(),
        calmingTopics: new Set()
      },
      dailySummary: null
    };
  }
  
  setupUI(minimal = false) {
    console.log('🧠 Setting up UI, minimal mode:', minimal);
    // Add Emma interface panel
    this.panel = document.createElement('div');
    this.panel.className = 'emma-dementia-panel hidden';
    this.panel.innerHTML = `
      <div class="emma-panel-header">
        <div class="emma-status">
          <span class="status-icon"></span>
          <span class="status-text">${minimal ? 'Dementia Companion is off' : 'Emma is here'}</span>
        </div>
        <button class="emma-minimize" aria-label="Minimize Emma">×</button>
      </div>
      <div class="emma-panel-content">
        ${minimal ? `
          <div class="emma-suggestions">
            <p>Dementia Companion is disabled for this vault.</p>
            <p class="text-sm" style="color:#666">Enable it under Settings → Dementia Companion or use the button below.</p>
            <div style="margin-top:8px;display:flex;gap:8px;">
              <button class="emma-enable btn btn-primary" style="padding:6px 10px;border-radius:8px;">Enable Now</button>
            </div>
          </div>
        ` : `
          <div class=\"emma-suggestions\">
            <p>${this.micConsentGranted ? 'Try saying:' : 'Microphone consent required to enable voice assistance.'}</p>
            <ul>
              <li>\"Who is this person?\"</li>
              <li>\"Tell me about this photo\"</li>
              <li>\"When was this?\"</li>
            </ul>
          </div>
          ${this.micConsentGranted ? '<div class=\\"emma-transcript\\"></div>' : `
            <div class=\\"emma-transcript\\" style=\\"margin-top:8px;\\"> 
              <button class=\\"emma-consent\\">Allow Microphone</button>
              <div class=\\"consent-notice\\">Local-only processing. You can revoke in Settings.</div>
            </div>
          `}
        `}
      </div>
      <div class="emma-panel-footer">
        <button class="emma-settings" aria-label="Emma settings">Settings</button>
        <button class="emma-help" aria-label="Get help">Help</button>
      </div>
    `;
    
    document.body.appendChild(this.panel);
    
    // Add styles
    this.addStyles();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  addStyles() {
    // Use external styles if available, otherwise add basic styles
    if (window.addDementiaStyles) {
      window.addDementiaStyles();
    } else {
      // Fallback minimal styles
      const style = document.createElement('style');
      style.id = 'emma-dementia-fallback-styles';
      style.textContent = `
        .emma-dementia-panel {
          position: fixed;
          bottom: 100px;
          right: 20px;
          width: 380px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.95) 0%, rgba(124, 58, 237, 0.95) 100%);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          backdrop-filter: blur(20px);
          box-shadow: 0 20px 25px -5px rgba(139, 92, 246, 0.25);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          z-index: 10001;
          transition: all 0.4s ease;
          color: white;
          overflow: hidden;
        }
        .emma-dementia-panel.hidden {
          transform: translateY(calc(100% + 20px)) scale(0.95);
          opacity: 0;
          pointer-events: none;
        }
        .emma-panel-header {
          padding: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .emma-status { display: flex; align-items: center; gap: 12px; font-weight: 600; }
        .status-icon { width: 10px; height: 10px; border-radius: 50%; background: #34d399; }
        .emma-minimize { background: rgba(255, 255, 255, 0.1); border: none; padding: 8px; border-radius: 10px; color: white; cursor: pointer; }
        .emma-panel-content { padding: 24px; }
        .emma-panel-footer { padding: 24px; display: flex; gap: 12px; }
        .btn { padding: 12px 20px; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
        .btn-primary { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; }
      `;
      document.head.appendChild(style);
    }
  }
  
  setupEventListeners() {
    // Orb click
    this.container.addEventListener('click', () => {
      this.togglePanel();
    });
    
    // Panel controls
    this.panel.querySelector('.emma-minimize').addEventListener('click', (e) => {
      e.stopPropagation();
      this.hidePanel();
    });
    
    // Start voice recognition when panel opens (only if enabled)
    this.container.addEventListener('click', () => {
      if (!this.isEnabledForVault) return;
      if (this.recognition && !this.recognitionStarted) {
        try {
          this.recognition.start();
          this.recognitionStarted = true;
        } catch (e) {
          // ignore duplicate start
        }
      }
    });

    // Enable button (when disabled)
    const enableBtn = this.panel.querySelector('.emma-enable');
    if (enableBtn) {
      enableBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const ok = await this.persistSetting('enabled', true);
        if (ok) {
          this.isEnabledForVault = true;
          this.updateOrbState('idle');
          // Re-init full features
          if (this.micConsentGranted) this.initializeVoiceInterface();
          this.initializePatternRecognition();
          this.initializeConversationEngine();
          this.initializeCaregiverReporting();
          // Re-render content area
          const content = this.panel.querySelector('.emma-panel-content');
          if (content) {
            content.innerHTML = `
              <div class=\"emma-suggestions\">
                <p>${this.micConsentGranted ? 'Try saying:' : 'Microphone consent required to enable voice assistance.'}</p>
                <ul>
                  <li>\"Who is this person?\"</li>
                  <li>\"Tell me about this photo\"</li>
                  <li>\"When was this?\"</li>
                </ul>
              </div>
              ${this.micConsentGranted ? '<div class=\\"emma-transcript\\"></div>' : `
                <div class=\\"emma-transcript\\" style=\\"margin-top:8px;\\"> 
                  <button class=\\"emma-consent\\">Allow Microphone</button>
                  <div class=\\"consent-notice\\">Local-only processing. You can revoke in Settings.</div>
                </div>
              `}`;
            // Wire consent button if present
            const cBtn = content.querySelector('.emma-consent');
            if (cBtn) this.attachConsentHandler(cBtn);
          }
        }
      });
    }

    // Mic consent button (when present)
    const consentBtn = this.panel.querySelector('.emma-consent');
    if (consentBtn) {
      console.log('🧠 Found consent button, attaching handler');
      this.attachConsentHandler(consentBtn);
    } else {
      console.log('🧠 No consent button found in panel');
    }
  }

  attachConsentHandler(button) {
    if (!button) return;
    console.log('🧠 Attaching consent handler to button:', button);
    button.addEventListener('click', async (e) => {
      e.stopPropagation();
      console.log('🧠 Consent button clicked!');
      try {
        // Request mic permission by starting/stopping recognition once
        if (!this.recognition && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
          const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
          this.recognition = new Rec();
        }
        if (this.recognition && !this.recognitionStarted) {
          try { this.recognition.start(); this.recognition.stop(); } catch {}
        }
        await this.persistSetting('micConsent', true);
        this.micConsentGranted = true;
        this.initializeVoiceInterface();
        // Update panel to show transcript area
        const content = this.panel.querySelector('.emma-panel-content');
        if (content) {
          const tx = content.querySelector('.emma-transcript');
          if (tx) {
            tx.innerHTML = '';
          }
          const statusText = this.panel.querySelector('.status-text');
          if (statusText) statusText.textContent = 'Emma is here';
        }
      } catch (err) {
        // Keep UI unchanged on failure
      }
    });
  }
  
  togglePanel() {
    this.panel.classList.toggle('hidden');
    if (!this.panel.classList.contains('hidden')) {
      this.activateListening();
    } else {
      this.deactivateListening();
    }
  }
  
  hidePanel() {
    this.panel.classList.add('hidden');
    this.deactivateListening();
  }
  
  updateOrbState(state) {
    console.log('🧠 Updating orb state to:', state);
    // Update visual state
    const orbColors = {
      idle: 200,        // Soft blue
      listening: 120,   // Green
      speaking: 280,    // Purple
      processing: 60,   // Yellow
      disabled: 0       // Red/gray when disabled
    };
    
    if (this.orb && orbColors[state] !== undefined) {
      this.orb.options.hue = orbColors[state];
    }
    
    // Update status in panel
    const statusIcon = this.panel.querySelector('.status-icon');
    const statusText = this.panel.querySelector('.status-text');
    
    const statusMessages = {
      idle: 'Emma is here',
      listening: 'Emma is listening...',
      speaking: 'Emma is speaking',
      processing: 'Emma is thinking...'
    };
    
    statusText.textContent = statusMessages[state] || 'Emma is here';
    this.container.className = `emma-orb-container ${state}`;
  }
  
  getStageProfile() {
    const profiles = {
      EARLY: {
        questionComplexity: 'high',
        responseDetail: 'full',
        errorCorrection: 'subtle',
        memoryDepth: 'detailed'
      },
      MIDDLE: {
        questionComplexity: 'simple',
        responseDetail: 'brief',
        errorCorrection: 'none',
        memoryDepth: 'simple'
      },
      LATE: {
        questionComplexity: 'very simple',
        responseDetail: 'emotional',
        errorCorrection: 'validation',
        memoryDepth: 'comfort'
      }
    };
    
    return profiles[this.options.stage] || profiles.EARLY;
  }
  
  // Helper methods
  isRecentlyAskedQuestion(normalized) {
    const recent = this.state.recentQuestions.get(normalized);
    return recent && recent.count > 1 && (Date.now() - recent.timestamp) < 300000;
  }
  
  cleanupOldQuestions() {
    const oneHourAgo = Date.now() - 3600000;
    for (const [question, data] of this.state.recentQuestions.entries()) {
      if (data.timestamp < oneHourAgo) {
        this.state.recentQuestions.delete(question);
      }
    }
  }
  
  logInteraction(interaction) {
    this.caregiverData.interactions.push(interaction);
    
    // Keep only last 24 hours of interactions
    const oneDayAgo = Date.now() - 86400000;
    this.caregiverData.interactions = this.caregiverData.interactions
      .filter(i => i.timestamp > oneDayAgo);
  }
  
  flagRepetitiveQuestion(question, count) {
    // This would integrate with caregiver notification system
    console.log(`Repetitive question flagged: "${question}" asked ${count} times`);
  }
  
  calculateRepetitionSeverity(repetitions) {
    const totalCount = repetitions.reduce((sum, [_, data]) => sum + data.count, 0);
    if (totalCount > 20) return 'high';
    if (totalCount > 10) return 'moderate';
    return 'low';
  }
  
  generateCaregiverReport() {
    // This would generate the daily summary for caregivers
    const report = {
      date: new Date().toLocaleDateString(),
      interactions: this.caregiverData.interactions.length,
      patterns: this.patterns,
      recommendations: this.generateRecommendations()
    };
    
    this.caregiverData.dailySummary = report;
    return report;
  }
  
  generateRecommendations() {
    const recommendations = [];
    
    // Based on repetition patterns
    if (this.patterns.repetition.size > 0) {
      recommendations.push({
        type: 'repetition',
        message: 'Consider creating memory cards for frequently asked questions'
      });
    }
    
    // Based on best engagement times
    const morningEngagement = this.caregiverData.interactions
      .filter(i => new Date(i.timestamp).getHours() < 12).length;
    const afternoonEngagement = this.caregiverData.interactions
      .filter(i => new Date(i.timestamp).getHours() >= 12).length;
      
    if (morningEngagement > afternoonEngagement * 1.5) {
      recommendations.push({
        type: 'timing',
        message: 'Best engagement appears to be in morning hours'
      });
    }
    
    return recommendations;
  }

  // Method called by memories.js when settings change
  refreshOrbState() {
    console.log('🧠 Refreshing orb state');
    this.loadSettings().then(() => {
      this.initializeUIBasedOnSettings();
    });
  }

  // Cleanup method for OrbManager
  async cleanup() {
    console.log('🧠 Cleaning up Dementia Companion');
    
    super.cleanup(); // Remove click handler
    
    // Stop voice recognition if active
    if (this.recognition) {
      try {
        this.recognition.stop();
        this.recognition = null;
      } catch (e) {}
    }
    
    // Stop speech synthesis
    if (this.synthesis) {
      try {
        this.synthesis.cancel();
      } catch (e) {}
    }
    
    // Remove panel
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
    
    // Clear any timers
    if (this.listeningTimeout) {
      clearTimeout(this.listeningTimeout);
    }
    
    // Remove event listeners
    if (this.container) {
      this.container.removeEventListener('click', this.togglePanel);
    }
    
    // Destroy orb
    if (this.orb) {
      // OrEmmaOrb doesn't have a destroy method, but we can clear the container
      this.container.innerHTML = '';
      this.orb = null;
    }
  }

  // Settings change handler for OrbManager
  onSettingsChanged(settings) {
    console.log('🧠 Settings changed:', settings);
    // Re-apply settings and update UI
    Object.assign(this.options, settings);
    this.loadSettings().then(() => {
      this.initializeUIBasedOnSettings();
    });
  }
}

// Export for use
window.EmmaDementiaCompanion = EmmaDementiaCompanion;
