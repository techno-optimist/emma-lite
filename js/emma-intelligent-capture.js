/**
 * Emma Intelligent Memory Capture
 * Revolutionary conversational memory creation with vectorless AI
 * 
 * CTO VISION: Emma as the intelligent gatekeeper of all memories
 * Transform memory capture from forms to natural conversation
 */

class EmmaIntelligentCapture {
  constructor(options = {}) {
    this.options = {
      vectorlessEngine: options.vectorlessEngine || null,
      vaultManager: options.vaultManager || null,
      dementiaMode: options.dementiaMode || false,
      autoSave: options.autoSave || false,
      debug: options.debug || false,
      ...options
    };
    
    // Core components
    this.conversationContext = [];
    this.pendingMemories = new Map();
    this.activeMemory = null;
    this.followUpQueue = [];
    
    // Memory detection thresholds
    this.thresholds = {
      memoryWorthy: 5,     // Minimum score to consider memory-worthy
      autoCapture: 8,      // Auto-suggest capture above this score
      importance: {
        low: 3,
        medium: 6,
        high: 9
      }
    };
    
    // Conversation state
    this.isCapturing = false;
    this.captureSession = null;
    
    if (this.options.debug) {
      console.log('🧠 Emma Intelligent Capture initialized');
    }
  }

  /**
   * Analyze a message for memory potential
   * @param {Object} message - Message object with content, attachments, etc.
   * @returns {Object} Analysis result with memory detection
   */
  async analyzeMessage(message) {
    try {
      // Add to conversation context
      this.updateConversationContext(message);
      
      // Detect memory signals
      const signals = await this.detectMemorySignals(message);
      
      if (this.options.debug) {
        console.log('📊 Memory signals detected:', signals);
      }
      
      // If memory-worthy, extract components
      if (signals.score >= this.thresholds.memoryWorthy) {
        const memory = await this.extractMemoryComponents(message, signals);
        const prompts = await this.generateSmartPrompts(memory, signals);
        
        return {
          isMemoryWorthy: true,
          memory,
          signals,
          prompts,
          confidence: this.calculateConfidence(signals),
          autoCapture: signals.score >= this.thresholds.autoCapture
        };
      }
      
      return {
        isMemoryWorthy: false,
        signals,
        reason: 'Score below threshold'
      };
      
    } catch (error) {
      console.error('❌ Error analyzing message:', error);
      return {
        isMemoryWorthy: false,
        error: error.message
      };
    }
  }

  /**
   * Update conversation context with new message
   */
  updateConversationContext(message) {
    this.conversationContext.push({
      content: message.content || message.text || '',
      attachments: message.attachments || [],
      timestamp: message.timestamp || Date.now(),
      sender: message.sender || 'user',
      metadata: message.metadata || {}
    });
    
    // Keep only last 20 messages for context
    if (this.conversationContext.length > 20) {
      this.conversationContext.shift();
    }
  }

  /**
   * Detect memory signals in message
   */
  async detectMemorySignals(message) {
    const content = message.content || message.text || '';
    const signals = {
      score: 0,
      types: [],
      emotions: [],
      people: [],
      milestones: [],
      keywords: []
    };
    
    // Milestone detection
    const milestonePatterns = [
      /first\s+time/i,
      /learned\s+to/i,
      /finally\s+(?:did|made|achieved)/i,
      /graduated/i,
      /birthday/i,
      /anniversary/i,
      /passed\s+away/i,
      /was\s+born/i,
      /got\s+(?:married|engaged)/i,
      /new\s+(?:job|house|baby)/i
    ];
    
    milestonePatterns.forEach(pattern => {
      if (pattern.test(content)) {
        signals.score += 3;
        signals.types.push('milestone');
        signals.milestones.push(pattern.source);
      }
    });
    
    // Emotional intensity detection
    const emotionalWords = {
      high: ['amazing', 'incredible', 'wonderful', 'terrible', 'devastating', 'perfect', 'worst', 'best'],
      medium: ['happy', 'sad', 'excited', 'worried', 'proud', 'disappointed'],
      low: ['nice', 'good', 'okay', 'fine']
    };
    
    Object.entries(emotionalWords).forEach(([intensity, words]) => {
      words.forEach(word => {
        if (content.toLowerCase().includes(word)) {
          signals.score += intensity === 'high' ? 3 : intensity === 'medium' ? 2 : 1;
          signals.emotions.push(word);
        }
      });
    });
    
    // People detection
    const peoplePatterns = [
      /\b(mom|dad|mother|father|parent)\b/i,
      /\b(son|daughter|child|children|kids?)\b/i,
      /\b(husband|wife|spouse|partner)\b/i,
      /\b(grandma|grandpa|grandmother|grandfather)\b/i,
      /\b(sister|brother|sibling)\b/i,
      /\b(friend|best friend)\b/i,
      /\b[A-Z][a-z]+ (?:and|&) [A-Z][a-z]+\b/ // Names like "John and Mary"
    ];
    
    peoplePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        signals.score += 2;
        signals.people.push(...matches);
      }
    });
    
    // Photo attachment bonus
    if (message.attachments && message.attachments.length > 0) {
      signals.score += 2;
      signals.types.push('visual');
    }
    
    // Temporal indicators
    const timePatterns = [
      /yesterday/i,
      /today/i,
      /last\s+(?:week|month|year)/i,
      /\d+\s+years?\s+ago/i
    ];
    
    timePatterns.forEach(pattern => {
      if (pattern.test(content)) {
        signals.score += 1;
        signals.types.push('temporal');
      }
    });
    
    // Use vectorless AI for deeper analysis if available
    if (this.options.vectorlessEngine && typeof this.options.vectorlessEngine.analyzeMemoryPotential === 'function') {
      try {
        const aiAnalysis = await this.options.vectorlessEngine.analyzeMemoryPotential(content);
        signals.score += aiAnalysis.additionalScore || 0;
        signals.aiInsights = aiAnalysis.insights;
      } catch (error) {
        if (this.options.debug) {
          console.warn('⚠️ Vectorless analysis failed, using heuristics only:', error);
        }
      }
    }
    
    return signals;
  }

  /**
   * Extract memory components from message and context
   */
  async extractMemoryComponents(message, signals) {
    const content = message.content || message.text || '';
    
    // Generate smart title
    const title = await this.generateMemoryTitle(content, signals);
    
    // Extract and enrich content
    const enrichedContent = await this.enrichMemoryContent(content, this.conversationContext);
    
    // Determine importance
    const importance = this.calculateImportance(signals);
    
    // Extract metadata
    const metadata = {
      emotions: signals.emotions || [],
      people: this.extractPeopleNames(signals.people || []),
      tags: await this.generateAutoTags(content, signals),
      location: this.extractLocation(content),
      date: this.extractOrInferDate(message, content),
      importance,
      captureMethod: 'intelligent-conversation',
      aiGenerated: true
    };
    
    // Build memory object
    const memory = {
      id: this.generateMemoryId(),
      title,
      content: enrichedContent,
      originalContent: content,
      metadata,
      attachments: message.attachments || [],
      created: Date.now(),
      signals,
      conversationContext: this.conversationContext.slice(-5) // Last 5 messages for context
    };
    
    return memory;
  }

  /**
   * Generate smart prompts based on memory and context
   */
  async generateSmartPrompts(memory, signals) {
    const prompts = [];
    
    // People-based prompts
    if (memory.metadata.people.length > 0) {
      prompts.push({
        text: `Tell me more about ${memory.metadata.people[0]}. What made this moment special with them?`,
        purpose: 'enrich-people',
        priority: 'high'
      });
    }
    
    // Emotion-based prompts
    if (signals.emotions.length > 0) {
      const emotion = signals.emotions[0];
      prompts.push({
        text: `You mentioned feeling ${emotion}. Can you describe that feeling a bit more?`,
        purpose: 'enrich-emotion',
        priority: 'medium'
      });
    }
    
    // Milestone prompts
    if (signals.types.includes('milestone')) {
      prompts.push({
        text: "This sounds like an important milestone! What led up to this moment?",
        purpose: 'enrich-context',
        priority: 'high'
      });
    }
    
    // Photo prompts
    if (memory.attachments.length === 0 && signals.types.includes('visual')) {
      prompts.push({
        text: "Do you have any photos from this moment you'd like to add?",
        purpose: 'add-media',
        priority: 'low'
      });
    }
    
    // Dementia-optimized prompts
    if (this.options.dementiaMode) {
      return this.generateDementiaPrompts(memory);
    }
    
    // Use AI for smarter prompts if available
    if (this.options.vectorlessEngine && typeof this.options.vectorlessEngine.generateMemoryPrompts === 'function') {
      try {
        const aiPrompts = await this.options.vectorlessEngine.generateMemoryPrompts(memory);
        prompts.push(...aiPrompts);
      } catch (error) {
        if (this.options.debug) {
          console.warn('⚠️ AI prompt generation failed, using defaults:', error);
        }
      }
    }
    
    // Sort by priority and return top 3
    return prompts
      .sort((a, b) => {
        const priority = { high: 3, medium: 2, low: 1 };
        return (priority[b.priority] || 0) - (priority[a.priority] || 0);
      })
      .slice(0, 3);
  }

  /**
   * Generate dementia-optimized prompts
   */
  generateDementiaPrompts(memory) {
    return [
      {
        text: "That sounds wonderful. Tell me more.",
        purpose: 'encourage-sharing',
        priority: 'high'
      },
      {
        text: "How did that make you feel?",
        purpose: 'emotional-validation',
        priority: 'medium'
      },
      {
        text: "Who else was there with you?",
        purpose: 'social-connection',
        priority: 'medium'
      }
    ];
  }

  /**
   * Start a capture session from conversation
   */
  async startCaptureSession(initialMessage) {
    this.isCapturing = true;
    this.captureSession = {
      id: this.generateSessionId(),
      started: Date.now(),
      messages: [],
      memory: null,
      state: 'gathering'
    };
    
    // Analyze initial message
    const analysis = await this.analyzeMessage(initialMessage);
    
    if (analysis.isMemoryWorthy) {
      this.captureSession.memory = analysis.memory;
      this.followUpQueue = analysis.prompts || [];
      
      return {
        success: true,
        memory: analysis.memory,
        nextPrompt: this.getNextPrompt()
      };
    }
    
    return {
      success: false,
      message: "Let's start fresh. Tell me about the memory you'd like to capture."
    };
  }

  /**
   * Continue capture session with user response
   */
  async continueCapture(userResponse) {
    if (!this.isCapturing || !this.captureSession) {
      throw new Error('No active capture session');
    }
    
    // Add response to session
    this.captureSession.messages.push({
      content: userResponse,
      timestamp: Date.now(),
      type: 'user-response'
    });
    
    // Enrich current memory with new information
    if (this.captureSession.memory) {
      await this.enrichMemoryWithResponse(this.captureSession.memory, userResponse);
    }
    
    // Get next prompt or complete
    const nextPrompt = this.getNextPrompt();
    
    if (!nextPrompt) {
      return await this.completeCapture();
    }
    
    return {
      continue: true,
      memory: this.captureSession.memory,
      nextPrompt
    };
  }

  /**
   * Enrich memory with user response
   */
  async enrichMemoryWithResponse(memory, response) {
    // Extract new information
    const newPeople = this.extractPeopleNames([response]);
    const newEmotions = this.extractEmotions(response);
    const newDetails = this.extractKeyDetails(response);
    
    // Merge with existing
    memory.metadata.people = [...new Set([...memory.metadata.people, ...newPeople])];
    memory.metadata.emotions = [...new Set([...memory.metadata.emotions, ...newEmotions])];
    
    // Enrich content
    if (newDetails.length > 0) {
      memory.content += ` ${newDetails.join('. ')}.`;
    }
    
    // Update importance based on new information
    memory.metadata.importance = Math.min(10, memory.metadata.importance + 1);
  }

  /**
   * Complete capture session
   */
  async completeCapture() {
    if (!this.captureSession || !this.captureSession.memory) {
      throw new Error('No memory to save');
    }
    
    const memory = this.captureSession.memory;
    
    // Final enrichment
    memory.content = await this.finalizeMemoryContent(memory);
    
    // Generate preview
    const preview = this.generateMemoryPreview(memory);
    
    // Reset session
    this.isCapturing = false;
    const session = this.captureSession;
    this.captureSession = null;
    
    return {
      complete: true,
      memory,
      preview,
      session
    };
  }

  /**
   * Save memory to vault
   */
  async saveMemory(memory) {
    if (!this.options.vaultManager) {
      throw new Error('No vault manager configured');
    }
    
    try {
      // Final processing
      const finalMemory = {
        ...memory,
        id: memory.id || this.generateMemoryId(),
        created: memory.created || Date.now(),
        updated: Date.now()
      };
      
      // Save to vault
      const result = await this.options.vaultManager.addMemory(finalMemory);
      
      if (this.options.debug) {
        console.log('💾 Memory saved successfully:', result);
      }
      
      return {
        success: true,
        memoryId: result.id,
        memory: finalMemory
      };
      
    } catch (error) {
      console.error('❌ Failed to save memory:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Helper: Generate memory title
   */
  async generateMemoryTitle(content, signals) {
    // Try AI generation first
    if (this.options.vectorlessEngine && typeof this.options.vectorlessEngine.generateTitle === 'function') {
      try {
        const aiTitle = await this.options.vectorlessEngine.generateTitle(content);
        if (aiTitle) return aiTitle;
      } catch (error) {
        if (this.options.debug) {
          console.warn('⚠️ AI title generation failed:', error);
        }
      }
    }
    
    // Fallback to heuristic generation
    if (signals.milestones.length > 0) {
      return this.capitalizeFirst(signals.milestones[0].replace(/_/g, ' '));
    }
    
    if (signals.people.length > 0 && signals.emotions.length > 0) {
      return `${this.capitalizeFirst(signals.emotions[0])} moment with ${signals.people[0]}`;
    }
    
    // Extract key phrase
    const keyPhrase = this.extractKeyPhrase(content);
    return keyPhrase || 'A Special Memory';
  }

  /**
   * Helper: Enrich memory content
   */
  async enrichMemoryContent(content, context) {
    // Build context narrative
    let enriched = content;
    
    // Add temporal context if missing
    if (!content.match(/yesterday|today|last|ago/i)) {
      enriched = `Today, ${enriched}`;
    }
    
    // Ensure proper sentence structure
    if (!enriched.endsWith('.') && !enriched.endsWith('!') && !enriched.endsWith('?')) {
      enriched += '.';
    }
    
    return enriched;
  }

  /**
   * Helper: Generate auto tags
   */
  async generateAutoTags(content, signals) {
    const tags = new Set();
    
    // Add type-based tags
    if (signals.types.includes('milestone')) tags.add('milestone');
    if (signals.types.includes('visual')) tags.add('photo');
    
    // Add emotion tags
    signals.emotions.forEach(emotion => tags.add(emotion));
    
    // Add relationship tags
    if (signals.people.some(p => /family|mom|dad|parent|child/i.test(p))) {
      tags.add('family');
    }
    
    // Add activity tags
    const activities = ['travel', 'celebration', 'achievement', 'daily life'];
    activities.forEach(activity => {
      if (content.toLowerCase().includes(activity)) {
        tags.add(activity);
      }
    });
    
    return Array.from(tags);
  }

  /**
   * Helper: Calculate importance
   */
  calculateImportance(signals) {
    const score = signals.score || 0;
    
    if (score >= this.thresholds.importance.high) return 'high';
    if (score >= this.thresholds.importance.medium) return 'medium';
    return 'low';
  }

  /**
   * Helper: Calculate confidence
   */
  calculateConfidence(signals) {
    const maxScore = 15;
    const confidence = Math.min(100, (signals.score / maxScore) * 100);
    return Math.round(confidence);
  }

  /**
   * Helper: Get next prompt
   */
  getNextPrompt() {
    if (this.followUpQueue.length === 0) return null;
    return this.followUpQueue.shift();
  }

  /**
   * Helper: Generate memory preview
   */
  generateMemoryPreview(memory) {
    return {
      title: memory.title,
      content: memory.content.substring(0, 200) + (memory.content.length > 200 ? '...' : ''),
      metadata: {
        people: memory.metadata.people.slice(0, 3),
        emotions: memory.metadata.emotions.slice(0, 3),
        importance: memory.metadata.importance,
        hasPhotos: memory.attachments.length > 0
      }
    };
  }

  /**
   * Helper: Extract people names
   */
  extractPeopleNames(peopleRaw) {
    const names = new Set();
    
    peopleRaw.forEach(person => {
      // Clean up relationship terms
      const cleaned = person
        .replace(/\b(my|the|our)\b/gi, '')
        .replace(/\b(mom|mother|dad|father|parent)\b/gi, match => this.capitalizeFirst(match))
        .trim();
      
      if (cleaned) names.add(cleaned);
    });
    
    return Array.from(names);
  }

  /**
   * Helper: Extract emotions
   */
  extractEmotions(text) {
    const emotions = [];
    const emotionWords = ['happy', 'sad', 'excited', 'proud', 'grateful', 'worried', 'surprised'];
    
    emotionWords.forEach(emotion => {
      if (text.toLowerCase().includes(emotion)) {
        emotions.push(emotion);
      }
    });
    
    return emotions;
  }

  /**
   * Helper: Extract key details
   */
  extractKeyDetails(text) {
    // Simple sentence extraction for now
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map(s => s.trim()).filter(s => s.length > 20);
  }

  /**
   * Helper: Extract location
   */
  extractLocation(text) {
    const locationPatterns = [
      /\b(?:at|in)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /\b(beach|park|home|hospital|school|restaurant|church)\b/gi
    ];
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) return match[1] || match[0];
    }
    
    return null;
  }

  /**
   * Helper: Extract or infer date
   */
  extractOrInferDate(message, content) {
    // Check for explicit dates
    const datePattern = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/;
    const match = content.match(datePattern);
    if (match) return new Date(match[1]);
    
    // Infer from temporal words
    const today = new Date();
    if (/\btoday\b/i.test(content)) return today;
    if (/\byesterday\b/i.test(content)) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    }
    
    // Default to message timestamp
    return new Date(message.timestamp || Date.now());
  }

  /**
   * Helper: Extract key phrase
   */
  extractKeyPhrase(text) {
    // Find the most important phrase
    const sentences = text.split(/[.!?]+/);
    if (sentences.length > 0) {
      const firstSentence = sentences[0].trim();
      if (firstSentence.length < 50) return firstSentence;
      
      // Extract subject and verb
      const words = firstSentence.split(' ').slice(0, 8);
      return words.join(' ') + '...';
    }
    return null;
  }

  /**
   * Helper: Finalize memory content
   */
  async finalizeMemoryContent(memory) {
    let content = memory.content;
    
    // Add context from conversation if needed
    if (memory.conversationContext && memory.conversationContext.length > 0) {
      const contextDetails = memory.conversationContext
        .filter(msg => msg.sender === 'user')
        .map(msg => this.extractKeyDetails(msg.content))
        .flat()
        .filter(detail => !content.includes(detail));
      
      if (contextDetails.length > 0) {
        content += ' ' + contextDetails.join(' ');
      }
    }
    
    return content.trim();
  }

  /**
   * Helper: Generate IDs
   */
  generateMemoryId() {
    return `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Helper: Capitalize first letter
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}

// Export for use in Emma ecosystem
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmmaIntelligentCapture;
} else if (typeof window !== 'undefined') {
  window.EmmaIntelligentCapture = EmmaIntelligentCapture;
}
