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
    
    // Legacy heuristic thresholds (kept for compatibility with existing signal scoring)
    this.thresholds = {
      memoryWorthy: 1,
      autoCapture: 2,
      importance: {
        low: 1,
        medium: 2,
        high: 3
      }
    };

    // Normalized decision thresholds for the new MemoryWorthinessEngine (0..1 scale)
    // LOWERED for better sensitivity - Emma should catch more memories
    this.thresholdsNormalized = {
      memoryWorthy: 0.25,   // maximum sensitivity for Debbe
      autoCapture: 0.55     // easier auto-capture
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
      
      // Detect memory signals (current message)
      const signals = await this.detectMemorySignals(message);

      // Light multi-turn context boost (last 3 user messages)
      const contextText = this.getRecentContextText(3);
      if (contextText) {
        const ctxBoost = this.detectContextBoost(contextText);
        if (ctxBoost.scoreBoost > 0) {
          signals.score += ctxBoost.scoreBoost;
          if (!signals.types.includes('context')) signals.types.push('context');
        }
      }
      
      // New: Aggregated normalized scoring (0..1) with novelty and optional LLM gating
      const content = message.content || message.text || '';
      const heuristicsScore = this.calculateHeuristicsScore(content, message); // 0..1

      let llmScore = 0; // 0..1
      // ALWAYS try LLM if available (remove gating for now to debug)
      if (this.options.vectorlessEngine && typeof this.options.vectorlessEngine.analyzeMemoryPotential === 'function') {
        try {
          const ctx = this.getRecentContextText(3);
          if (this.options.debug) {
            console.log('🧠 LLM: Calling analyzeMemoryPotential with content:', content.substring(0, 100));
          }
          const ai = await this.options.vectorlessEngine.analyzeMemoryPotential(content, { context: ctx });
          llmScore = this.normalizeLLMScore(ai && (ai.score0to10 ?? ai.score));
          if (ai && ai.rationale) signals.aiInsights = ai.rationale;
          if (this.options.debug) {
            console.log('🧠 LLM: Got response:', { score0to10: ai?.score0to10, rationale: ai?.rationale, normalizedScore: llmScore });
          }
        } catch (err) {
          if (this.options.debug) console.warn('⚠️ LLM gating failed, using heuristics only:', err);
        }
      } else {
        if (this.options.debug) {
          console.log('🧠 LLM: Not available - vectorlessEngine exists?', !!this.options.vectorlessEngine);
          console.log('🧠 LLM: analyzeMemoryPotential function exists?', typeof this.options.vectorlessEngine?.analyzeMemoryPotential);
        }
      }

      const noveltyPenalty = await this.calculateNoveltyPenalty(content); // 0..1 (higher = more similar → lower final)

      // ADAPTIVE WEIGHTING: If no LLM, boost heuristics
      const hasLLM = llmScore > 0;
      const finalScore = hasLLM 
        ? this.clamp01(0.6 * llmScore + 0.3 * heuristicsScore - 0.1 * noveltyPenalty)
        : this.clamp01(0.8 * heuristicsScore - 0.1 * noveltyPenalty); // Boost heuristics when offline
      
      const isMemoryWorthy = finalScore >= this.thresholdsNormalized.memoryWorthy;
      const autoCapture = finalScore >= this.thresholdsNormalized.autoCapture;

      if (this.options.debug) {
        console.log('📊 Memory signals detected:', signals);
        console.log('🧮 Aggregated scoring:', { heuristicsScore, llmScore, noveltyPenalty, finalScore });
      }

      if (isMemoryWorthy) {
        const memory = await this.extractMemoryComponents(message, signals);
        const prompts = await this.generateSmartPrompts(memory, signals);
        return {
          isMemoryWorthy: true,
          autoCapture,
          finalScore,
          components: { heuristicsScore, llmScore, noveltyPenalty },
          memory,
          signals,
          prompts,
          confidence: Math.round(finalScore * 100)
        };
      }

      return { isMemoryWorthy: false, finalScore, components: { heuristicsScore, llmScore, noveltyPenalty }, signals, reason: 'Below threshold' };
      
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
    
    // Milestone detection (more comprehensive patterns)
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
      /new\s+(?:job|house|baby)/i,
      /almost\s+(?:died|killed|lost)/i,
      /survived/i,
      /recovered/i,
      /adventure/i,
      /story\s+about/i,
      /reminded\s+me/i,
      /lifting\s+me\s+up/i,
      /crane/i,
      /\bremember\s+when/i,
      /\bwas\s+little/i,
      /\bused\s+to/i,
      /\bwould\s+always/i,
      /climb\s+trees/i
    ];
    
    // Pet-related patterns (separate for better scoring)
    const petPatterns = [
      /cutie/i,
      /\bpet\b/i,
      /\bdog\b/i,
      /\bcat\b/i,
      /puppy/i,
      /kitten/i
    ];
    
    milestonePatterns.forEach(pattern => {
      if (pattern.test(content)) {
        signals.score += 3;
        signals.types.push('milestone');
        signals.milestones.push(pattern.source);
      }
    });
    
    // Pet-related scoring (separate for better tracking)
    petPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        signals.score += 3;
        signals.types.push('pet');
        signals.milestones.push(pattern.source);
      }
    });
    
    // Emotional intensity detection
    const emotionalWords = {
      high: ['amazing', 'incredible', 'wonderful', 'terrible', 'devastating', 'perfect', 'worst', 'best', 'adventure', 'special', 'precious'],
      medium: ['happy', 'sad', 'excited', 'worried', 'proud', 'disappointed', 'reminded', 'story', 'memory'],
      low: ['nice', 'good', 'okay', 'fine', 'talked', 'told']
    };
    
    Object.entries(emotionalWords).forEach(([intensity, words]) => {
      words.forEach(word => {
        if (content.toLowerCase().includes(word)) {
          signals.score += intensity === 'high' ? 3 : intensity === 'medium' ? 2 : 1;
          signals.emotions.push(word);
        }
      });
    });
    
    // People detection (generic patterns only - no hardcoded names)
    const peoplePatterns = [
      /\b(mom|dad|mother|father|parent)\b/i,
      /\b(son|daughter|child|children|kids?)\b/i,
      /\b(husband|wife|spouse|partner)\b/i,
      /\b(grandma|grandpa|grandmother|grandfather)\b/i,
      /\b(sister|brother|sibling)\b/i,
      /\b(friend|best friend)\b/i,
      /\b[A-Z][a-z]+ (?:and|&) [A-Z][a-z]+\b/, // Names like "John and Mary"
      /\b(he|she|they)\s+(?:was|were|used to|would)/i // Pronouns with past tense
    ];
    
    console.log('🔍 PEOPLE DEBUG: Analyzing content for people:', content);
    
    peoplePatterns.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        console.log(`👥 PEOPLE DEBUG: Pattern ${index} matched:`, pattern, 'matches:', matches);
        signals.score += 2;
        signals.people.push(...matches);
      }
    });
    
    console.log('👥 PEOPLE DEBUG: Raw people detected:', signals.people);

    // Proper-noun name candidates (contextual, no hardcoded names)
    const properNames = this.extractProperNames(content);
    if (properNames.length > 0) {
      properNames.forEach(name => {
        if (!signals.people.includes(name)) {
          signals.people.push(name);
        }
      });
      // Weight once for detected proper names (avoid over-scoring)
      signals.score += Math.min(2, properNames.length);
    }
    
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
    
    // Debug output
    if (this.options.debug) {
      console.log('💝 MEMORY SCORING DEBUG:');
      console.log('   Content:', content.substring(0, 100) + '...');
      console.log('   Score:', signals.score);
      console.log('   Types:', signals.types);
      console.log('   Emotions:', signals.emotions);
      console.log('   People:', signals.people);
      console.log('   Milestones:', signals.milestones);
      console.log('   Threshold:', this.thresholds.memoryWorthy);
      console.log('   Is Memory Worthy?', signals.score >= this.thresholds.memoryWorthy);
    }
    
    return signals;
  }

  /**
   * Get recent user context (excluding current) up to N messages
   */
  getRecentContextText(n = 3) {
    const recent = this.conversationContext
      .filter(m => m && m.sender === 'user')
      .slice(-n-1, -1) // exclude current (added beforehand)
      .map(m => m.content)
      .filter(Boolean);
    return recent.join(' ');
  }

  /**
   * Heuristic context boost using soft signals across recent turns
   */
  detectContextBoost(text) {
    let scoreBoost = 0;
    const softPatterns = [
      /\bremember(ed)?\b/i,
      /\bback\s+then\b/i,
      /\bwhen\s+I\s+was\b/i,
      /\b(in|around)\s+(19|20)\d{2}\b/,
      /\b(last|this|next)\s+(year|summer|winter|spring|fall|month|week)\b/i,
      /\b(mom|dad|mother|father|grand(ma|pa|mother|father))\b/i
    ];
    softPatterns.forEach(p => { if (p.test(text)) scoreBoost++; });
    scoreBoost = Math.min(3, scoreBoost); // cap
    return { scoreBoost };
  }

  /**
   * Extract candidate proper names from free text using conservative heuristics
   * - Detect capitalized tokens not at sentence start
   * - Exclude common words/months/days
   * - Return unique list
   */
  extractProperNames(text) {
    console.log('🔍 PROPER NAMES DEBUG: Input text:', text);
    
    const excluded = new Set([
      'I','The','A','An','And','But','Or','So','Because','When','While','Before','After',
      'He','She','They','We','You','It','His','Her','Their','Our','Your','Its',
      'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday',
      'January','February','March','April','May','June','July','August','September','October','November','December'
    ]);
    const names = new Set();
    const tokens = text.split(/([.!?]\s+)/); // keep sentence boundaries
    
    console.log('🔍 PROPER NAMES DEBUG: Tokens:', tokens);
    
    for (let i = 0; i < tokens.length; i++) {
      const sentence = tokens[i];
      if (!sentence || /[.!?]\s+/.test(sentence)) continue;
      const words = sentence.split(/\s+/);
      
      console.log('🔍 PROPER NAMES DEBUG: Processing sentence:', sentence, 'words:', words);
      
      for (let w = 0; w < words.length; w++) {
        const word = words[w].replace(/[^A-Za-z'-]/g, '');
        if (!word) continue;
        
        console.log(`🔍 PROPER NAMES DEBUG: Word ${w}: "${word}" (first word: ${w === 0})`);
        
        // Skip first word of sentence to avoid capitalization bias
        if (w === 0) {
          console.log('🔍 PROPER NAMES DEBUG: Skipping first word:', word);
          continue;
        }
        
        const isProperName = /^[A-Z][a-z'-]{1,}$/.test(word);
        const isExcluded = excluded.has(word);
        
        console.log(`🔍 PROPER NAMES DEBUG: "${word}" - Proper format: ${isProperName}, Excluded: ${isExcluded}`);
        
        if (isProperName && !isExcluded) {
          names.add(word);
          console.log('✅ PROPER NAMES DEBUG: Added name:', word);
        }
      }
    }
    
    const result = Array.from(names);
    console.log('🔍 PROPER NAMES DEBUG: Final result:', result);
    return result;
  }

  /**
   * Temporal phrase detection and scoring
   */
  detectTemporalSignals(content, signals) {
    const temporalPatterns = [
      /\b(in|during|around)\s+(19|20)\d{2}\b/i,
      /\b(last|this|next)\s+(year|summer|winter|spring|fall|autumn|month|week)\b/i,
      /\bwhen\s+I\s+was\s+(a\s+kid|little|young|in\s+(high\s+school|college))\b/i,
      /\bage\s+\d+\b/i,
      /\bdecades?\s+ago\b/i
    ];
    let matched = false;
    temporalPatterns.forEach(p => { if (p.test(content)) { signals.score += 2; matched = true; } });
    if (matched && !signals.types.includes('temporal')) signals.types.push('temporal');
  }

  /**
   * Normalized heuristics-based memory worthiness (0..1)
   * FIXED: Much more sensitive scoring for memory detection
   */
  calculateHeuristicsScore(text, message) {
    const content = (text || '').trim();
    if (!content) return 0;

    let score = 0;
    const tokens = content.split(/\s+/).filter(Boolean);

    // First-person indicator (BOOSTED - critical for memories)
    // Multiple matches = stronger signal
    const firstPersonMatches = content.match(/(\bI\b|\bI'm\b|\bI was\b|\bwe\b|\bwe're\b|\bwe were\b|\bmy\b|\bour\b)/gi) || [];
    if (firstPersonMatches.length > 0) {
      score += Math.min(0.40, 0.35 + (firstPersonMatches.length - 1) * 0.05); // 0.35-0.40 based on frequency
    }

    // Past-tense indicators (ENHANCED patterns)
    const pastTensePatterns = [
      /\b(remember|remembered)\b/i,
      /\b(was|were|had|did|went|came|saw|felt|thought)\b/i,
      /\b\w+ed\b/i, // words ending in 'ed'
      /\b(used to|would always|back then)\b/i
    ];
    let pastTenseHits = 0;
    pastTensePatterns.forEach(pattern => {
      if (pattern.test(content)) pastTenseHits++;
    });
    score += Math.min(0.25, pastTenseHits * 0.08); // Up to 0.25 for strong past-tense

    // Temporal/childhood indicators (ENHANCED)
    const temporalPatterns = [
      /\b(kid|child|childhood|little|young)\b/i,
      /\b(yesterday|today|years?\s+ago|last\s+(week|month|year))\b/i,
      /\b(when\s+I\s+was|as\s+a\s+kid|growing\s+up)\b/i,
      /\b(school|playground|home|family)\b/i
    ];
    let temporalHits = 0;
    temporalPatterns.forEach(pattern => {
      if (pattern.test(content)) temporalHits++;
    });
    score += Math.min(0.25, temporalHits * 0.08); // Up to 0.25 for strong temporal

    // Event/story indicators (NEW)
    const eventPatterns = [
      /\b(fell|hit|hurt|accident|happened|story|time|moment)\b/i,
      /\b(climbing|playing|running|walking|going)\b/i,
      /\b(tree|house|park|hospital|doctor)\b/i
    ];
    let eventHits = 0;
    eventPatterns.forEach(pattern => {
      if (pattern.test(content)) eventHits++;
    });
    score += Math.min(0.15, eventHits * 0.05); // Up to 0.15 for events

    // Length bonus (reasonable stories)
    const len = content.length;
    if (len > 50) score += 0.10; // Bonus for substantial content
    if (len > 20) score += 0.05; // Small bonus for any meaningful content

    // Attachments bonus
    if (message.attachments && message.attachments.length > 0) {
      score += 0.10;
    }
    
    // Memory intent keywords (for explicit memory requests)
    const memoryIntentPatterns = [
      /\b(save|remember|memory|capture|record)\b/i,
      /\b(want to|need to|should)\s+(save|remember|capture|record)\b/i
    ];
    let intentHits = 0;
    memoryIntentPatterns.forEach(pattern => {
      if (pattern.test(content)) intentHits++;
    });
    if (intentHits > 0) {
      score += 0.30; // Significant boost for explicit memory intent
      console.log('🎯 MEMORY INTENT DETECTED: Boosting score by 0.30');
    }

    if (this.options.debug) {
      console.log('🧮 HEURISTICS DEBUG:', {
        content: content.substring(0, 100),
        firstPersonMatches: firstPersonMatches.length,
        pastTenseHits,
        temporalHits,
        eventHits,
        length: len,
        finalHeuristicsScore: score
      });
    }

    return this.clamp01(score);
  }

  /**
   * Novelty penalty (0..1) using Jaccard similarity of bigrams vs existing memories
   */
  async calculateNoveltyPenalty(content) {
    try {
      const vault = this.options.vaultManager && this.options.vaultManager.vaultData;
      const memories = (vault && vault.content && vault.content.memories) ? Object.values(vault.content.memories) : [];
      
      if (this.options.debug) {
        console.log('🔍 NOVELTY DEBUG:', {
          hasVaultManager: !!this.options.vaultManager,
          vaultManagerIsOpen: this.options.vaultManager?.isOpen,
          hasVaultData: !!vault,
          memoryCount: memories.length,
          vaultStructure: vault ? Object.keys(vault) : 'no vault'
        });
      }
      
      if (!memories || memories.length === 0) return 0;

      const inputBigrams = this.getBigrams(content.toLowerCase());
      if (inputBigrams.size === 0) return 0;

      let maxJac = 0;
      const sample = memories.slice(0, 80); // lightweight
      for (const m of sample) {
        const txt = (m.content || m.title || '').toLowerCase();
        const bg = this.getBigrams(txt);
        if (bg.size === 0) continue;
        const jac = this.jaccard(inputBigrams, bg);
        if (jac > maxJac) maxJac = jac;
        if (maxJac > 0.5) break; // early exit
      }
      return this.clamp01(maxJac); // treat similarity as penalty directly
    } catch (e) {
      if (this.options.debug) console.warn('⚠️ Novelty penalty failed:', e);
      return 0;
    }
  }

  getBigrams(text) {
    const tokens = text.split(/[^a-z0-9']+/i).filter(t => t.length > 1);
    const set = new Set();
    for (let i = 0; i < tokens.length - 1; i++) {
      set.add(tokens[i] + ' ' + tokens[i + 1]);
    }
    return set;
  }

  jaccard(a, b) {
    let inter = 0;
    for (const x of a) if (b.has(x)) inter++;
    const union = a.size + b.size - inter;
    return union === 0 ? 0 : inter / union;
  }

  normalizeLLMScore(score0to10) {
    if (typeof score0to10 !== 'number' || Number.isNaN(score0to10)) return 0;
    return this.clamp01(score0to10 / 10);
  }

  clamp01(x) { return Math.max(0, Math.min(1, x)); }

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
    
    // Extract metadata with VAULT INTEGRATION
    const extractedPeopleNames = this.extractPeopleNames(signals.people || []);
    console.log('🎯 MEMORY DEBUG: Creating metadata with people names:', extractedPeopleNames);
    
    // CRITICAL FIX: Convert people names to vault IDs and handle new people
    const { peopleIds, newPeople } = await this.resolvePeopleToVaultIds(extractedPeopleNames);
    console.log('🎯 MEMORY DEBUG: Resolved people IDs:', peopleIds);
    console.log('🎯 MEMORY DEBUG: New people detected:', newPeople);
    
    const metadata = {
      emotions: signals.emotions || [],
      people: peopleIds, // Use vault IDs instead of names
      peopleNames: extractedPeopleNames, // Keep names for reference
      newPeopleDetected: newPeople, // Track new people for prompts
      tags: await this.generateAutoTags(content, signals),
      location: this.extractLocation(content),
      date: this.extractOrInferDate(message, content),
      importance,
      captureMethod: 'intelligent-conversation',
      aiGenerated: true
    };
    
    console.log('🎯 MEMORY DEBUG: Final metadata with vault integration:', metadata);
    
    // Additional temporal extraction
    this.detectTemporalSignals(content, signals);

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
   * CRITICAL: Resolve people names to vault IDs and identify new people
   */
  async resolvePeopleToVaultIds(peopleNames) {
    const peopleIds = [];
    const newPeople = [];
    
    try {
      // Check if we have vault access
      if (!window.emmaWebVault || !window.emmaWebVault.isOpen) {
        console.warn('🎯 VAULT: No vault access for people resolution - using names only');
        return { peopleIds: peopleNames, newPeople: [] };
      }

      // Get existing people from vault
      const existingPeople = await window.emmaWebVault.listPeople();
      console.log('🎯 VAULT: Checking against', existingPeople?.length || 0, 'existing people');

      // Resolve each detected person
      for (const personName of peopleNames) {
        // Check if person already exists (case-insensitive)
        const existingPerson = existingPeople.find(person => 
          person.name && person.name.toLowerCase() === personName.toLowerCase()
        );

        if (existingPerson) {
          console.log('✅ VAULT: Found existing person:', personName, '→', existingPerson.id);
          peopleIds.push(existingPerson.id);
        } else {
          console.log('🆕 VAULT: New person detected:', personName);
          newPeople.push(personName);
          // For now, use the name as placeholder until user confirms
          peopleIds.push(`temp_${personName.toLowerCase()}`);
        }
      }

      return { peopleIds, newPeople };
      
    } catch (error) {
      console.error('❌ VAULT: Failed to resolve people to IDs:', error);
      // Fallback to using names
      return { peopleIds: peopleNames, newPeople: [] };
    }
  }

  /**
   * Helper: Extract people names
   */
  extractPeopleNames(peopleRaw) {
    console.log('👥 EXTRACT DEBUG: Input peopleRaw:', peopleRaw);
    const names = new Set();
    
    peopleRaw.forEach(person => {
      console.log('👥 EXTRACT DEBUG: Processing person:', person);
      // Clean up relationship terms
      const cleaned = person
        .replace(/\b(my|the|our)\b/gi, '')
        .replace(/\b(mom|mother|dad|father|parent)\b/gi, match => this.capitalizeFirst(match))
        .trim();
      
      console.log('👥 EXTRACT DEBUG: Cleaned person:', cleaned);
      if (cleaned) names.add(cleaned);
    });
    
    const result = Array.from(names);
    console.log('👥 EXTRACT DEBUG: Final people names:', result);
    return result;
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
