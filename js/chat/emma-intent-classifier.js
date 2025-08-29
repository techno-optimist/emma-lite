/**
 * 🧠 EMMA INTENT CLASSIFIER - Smart Routing
 * Single responsibility: Determine user intent and route appropriately
 * 
 * CTO ARCHITECTURE: Clean intent classification with no conflicts
 */

class EmmaIntentClassifier {
  constructor() {
    this.conversationContext = {
      lastQueriedPerson: null,
      currentTopic: null,
      recentPeople: new Set(),
      conversationFlow: []
    };
  }

  /**
   * 🎯 CLASSIFY USER INTENT - Single source of truth
   */
  async classifyIntent(message) {
    const lower = message.toLowerCase().trim();
    
    console.log('🧠 INTENT: Classifying:', message);
    
    // 📷 PHOTO OPERATIONS (highest priority)
    if (this.isPhotoRequest(lower)) {
      return {
        type: 'photo_operation',
        confidence: 0.98,
        targetPerson: this.conversationContext.lastQueriedPerson,
        originalMessage: message
      };
    }

    // 💝 MEMORY OPERATIONS
    if (this.isMemoryOperation(lower)) {
      return {
        type: 'memory_operation',
        confidence: 0.95,
        subType: this.getMemoryOperationType(lower),
        originalMessage: message
      };
    }

    // 👤 PERSON OPERATIONS  
    if (this.isPersonOperation(lower)) {
      return {
        type: 'person_operation',
        confidence: 0.9,
        subType: this.getPersonOperationType(lower),
        targetPerson: this.extractPersonFromMessage(message),
        originalMessage: message
      };
    }

    // 💬 MEMORY SHARING (in context)
    if (this.isMemorySharing(lower)) {
      return {
        type: 'memory_sharing',
        confidence: 0.85,
        targetPerson: this.conversationContext.lastQueriedPerson,
        originalMessage: message
      };
    }

    // 🗣️ GENERAL CONVERSATION
    return {
      type: 'conversation',
      confidence: 0.7,
      originalMessage: message
    };
  }

  /**
   * 📷 DETECT PHOTO REQUESTS
   */
  isPhotoRequest(lower) {
    const photoPatterns = [
      /^(add|upload|save|attach)\s+(photo|picture|image)s?$/,
      /^(photo|picture|image)s?\s+(add|upload|save|attach)$/,
      /\b(add|upload|save)\b.*\b(photo|picture|image)\b/,
      /\b(photo|picture|image)\b.*\b(add|upload|save)\b/
    ];
    
    return photoPatterns.some(pattern => pattern.test(lower));
  }

  /**
   * 💝 DETECT MEMORY OPERATIONS
   */
  isMemoryOperation(lower) {
    // Memory creation
    if (/\b(save|create|new|add)\b.*\b(memory|memories)\b/i.test(lower) ||
        /\blet'?s\s+save\b/i.test(lower) ||
        /\bmemory\b.*\b(save|create|new|add)\b/i.test(lower)) {
      return true;
    }
    
    // Memory queries
    if (/\b(show|list|find|search|what are)\b.*\b(my|the)\b.*\b(memory|memories)\b/i.test(lower) ||
        /\b(memory|memories)\b.*\b(list|show|find|search)\b/i.test(lower)) {
      return true;
    }
    
    return false;
  }

  /**
   * 👤 DETECT PERSON OPERATIONS
   */
  isPersonOperation(lower) {
    // People listing
    if (/\b(who are|what are|show me|list)\b.*\b(my|the|all)\b.*\b(people|person|contacts|family)\b/i.test(lower)) {
      return true;
    }
    
    // Specific person queries
    if (/^(who is|tell me about|show me)\s+[a-zA-Z]+/i.test(lower) ||
        /^[a-zA-Z]+\s*\?+\s*$/i.test(lower)) {
      return true;
    }
    
    return false;
  }

  /**
   * 💬 DETECT MEMORY SHARING
   */
  isMemorySharing(lower) {
    // Only in person context
    if (!this.conversationContext.lastQueriedPerson) return false;
    
    // Activity words
    const activities = ['fell', 'went', 'saw', 'met', 'did', 'was', 'had', 'mowing', 'cooking'];
    if (activities.some(word => lower.includes(word))) return true;
    
    // Relationship words
    const relationships = ['husband', 'wife', 'married', 'mother', 'father', 'son', 'daughter'];
    if (relationships.some(word => lower.includes(word))) return true;
    
    // Short responses in person context
    if (lower.length < 20 && this.conversationContext.lastQueriedPerson) return true;
    
    return false;
  }

  /**
   * 🔍 HELPER METHODS
   */
  getMemoryOperationType(lower) {
    if (/\b(save|create|new|add)\b/i.test(lower)) return 'create';
    if (/\b(show|list|find|search)\b/i.test(lower)) return 'search';
    return 'general';
  }

  getPersonOperationType(lower) {
    if (/\b(who are|list|all)\b.*\b(people|person)\b/i.test(lower)) return 'list';
    if (/^(who is|tell me about|show me)\s+/i.test(lower)) return 'query';
    return 'general';
  }

  extractPersonFromMessage(message) {
    // Extract person names from vault
    const vault = window.emmaWebVault?.vaultData?.content;
    if (vault?.people) {
      const people = Object.values(vault.people);
      for (const person of people) {
        if (person.name && message.toLowerCase().includes(person.name.toLowerCase())) {
          return person.name;
        }
      }
    }
    
    // Extract capitalized names
    const nameMatch = message.match(/(?:who is|tell me about|show me)\s+([A-Z][a-z]+)/i);
    return nameMatch ? nameMatch[1] : null;
  }

  /**
   * 📝 CONTEXT MANAGEMENT - ENHANCED FOR EMOTIONAL INTELLIGENCE
   */
  updateContext(userMessage, intent, emmaResponse = null) {
    // Track conversation flow with emotional context
    this.conversationContext.conversationFlow.push({
      message: userMessage,
      intent: intent,
      timestamp: Date.now(),
      emotionalTone: this.detectEmotionalTone(userMessage),
      memorySharing: intent.type === 'memory_sharing',
      emmaResponse: emmaResponse
    });
    
    // Keep last 5 exchanges for rich context
    if (this.conversationContext.conversationFlow.length > 5) {
      this.conversationContext.conversationFlow.shift();
    }
    
    // Enhanced person context tracking
    if (intent.targetPerson) {
      this.conversationContext.lastQueriedPerson = intent.targetPerson;
      this.conversationContext.recentPeople.add(intent.targetPerson);
      
      // Track relationship context if revealed
      this.trackRelationshipContext(userMessage, intent.targetPerson);
    }
    
    // Track memory themes for proactive assistance
    this.trackMemoryThemes(userMessage, intent);
    
    // Update emotional state for appropriate responses
    this.conversationContext.emotionalState = this.detectEmotionalTone(userMessage);
    this.conversationContext.currentTopic = intent.targetPerson || intent.subType || null;
    
    console.log('🧠 CONTEXT UPDATE:', {
      lastPerson: this.conversationContext.lastQueriedPerson,
      emotionalState: this.conversationContext.emotionalState,
      recentThemes: this.conversationContext.memoryThemes,
      conversationLength: this.conversationContext.conversationFlow.length
    });
  }

  /**
   * 💝 DETECT EMOTIONAL TONE - For empathetic responses
   */
  detectEmotionalTone(message) {
    const lower = message.toLowerCase();
    
    // Positive emotions
    if (lower.includes('happy') || lower.includes('joy') || lower.includes('wonderful') || 
        lower.includes('amazing') || lower.includes('beautiful') || lower.includes('love')) {
      return 'joyful';
    }
    
    // Nostalgic/warm emotions
    if (lower.includes('remember') || lower.includes('miss') || lower.includes('think about')) {
      return 'nostalgic';
    }
    
    // Sad/difficult emotions
    if (lower.includes('sad') || lower.includes('difficult') || lower.includes('hard') ||
        lower.includes('upset') || lower.includes('worried')) {
      return 'reflective';
    }
    
    // Confused/uncertain
    if (lower.includes('confused') || lower.includes('don\'t know') || 
        lower.includes('can\'t remember') || lower === 'what' || lower === 'huh') {
      return 'uncertain';
    }
    
    // Excited/engaged
    if (lower.includes('funny') || lower.includes('exciting') || lower.includes('awesome')) {
      return 'excited';
    }
    
    return 'calm';
  }

  /**
   * 👥 TRACK RELATIONSHIP CONTEXT
   */
  trackRelationshipContext(message, person) {
    const lower = message.toLowerCase();
    
    if (!this.conversationContext.relationships) {
      this.conversationContext.relationships = new Map();
    }
    
    // Detect relationship reveals
    if (lower.includes('husband')) {
      this.conversationContext.relationships.set(person, 'husband');
    } else if (lower.includes('wife')) {
      this.conversationContext.relationships.set(person, 'wife');
    } else if (lower.includes('son')) {
      this.conversationContext.relationships.set(person, 'son');
    } else if (lower.includes('daughter')) {
      this.conversationContext.relationships.set(person, 'daughter');
    } else if (lower.includes('mother') || lower.includes('mom')) {
      this.conversationContext.relationships.set(person, 'mother');
    } else if (lower.includes('father') || lower.includes('dad')) {
      this.conversationContext.relationships.set(person, 'father');
    }
  }

  /**
   * 🧠 TRACK MEMORY THEMES - For proactive assistance
   */
  trackMemoryThemes(message, intent) {
    if (!this.conversationContext.memoryThemes) {
      this.conversationContext.memoryThemes = new Set();
    }
    
    const lower = message.toLowerCase();
    
    // Activity themes
    if (lower.includes('school')) this.conversationContext.memoryThemes.add('education');
    if (lower.includes('work') || lower.includes('job')) this.conversationContext.memoryThemes.add('career');
    if (lower.includes('travel') || lower.includes('trip')) this.conversationContext.memoryThemes.add('travel');
    if (lower.includes('wedding') || lower.includes('married')) this.conversationContext.memoryThemes.add('milestones');
    if (lower.includes('birthday') || lower.includes('celebration')) this.conversationContext.memoryThemes.add('celebrations');
    if (lower.includes('holiday') || lower.includes('christmas')) this.conversationContext.memoryThemes.add('holidays');
    
    // Keep themes manageable
    if (this.conversationContext.memoryThemes.size > 10) {
      const themesArray = Array.from(this.conversationContext.memoryThemes);
      this.conversationContext.memoryThemes = new Set(themesArray.slice(-10));
    }
  }

  /**
   * 🔄 CONTEXT ACCESS for other modules
   */
  getContext() {
    return this.conversationContext;
  }

  setContext(updates) {
    Object.assign(this.conversationContext, updates);
  }
}

// Export for global use
window.EmmaChatCore = EmmaChatCore;
console.log('🧠 Emma Intent Classifier: Module loaded successfully');
