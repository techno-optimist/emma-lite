/**
 * Emma Vectorless AI Engine
 * Revolutionary memory intelligence without vector embeddings
 * Inspired by: https://github.com/roe-ai/vectorless
 * 
 * CTO STRATEGIC INITIATIVE: True intelligence over .emma files
 * Privacy-first, local processing, LLM-powered reasoning
 */

class EmmaVectorlessEngine {
  constructor(options = {}) {
    this.options = {
      apiKey: options.apiKey || null,
      model: options.model || 'gpt-4o-mini',
      maxMemories: options.maxMemories || 50,
      responseTimeout: options.responseTimeout || 15000,
      dementiaMode: options.dementiaMode || false,
      debug: options.debug || false,
      ...options
    };
    
    this.currentVault = null;
    this.memoryCache = new Map();
    this.processingQueue = [];
    
    if (this.options.debug) {
      console.log('🧠 Emma Vectorless Engine initialized:', this.options);
    }
  }

  /**
   * Load and parse .emma vault for intelligent processing
   * @param {Object} vaultData - Decrypted .emma vault content
   */
  async loadVault(vaultData) {
    try {
      this.currentVault = vaultData;
      
      // Parse vault structure for intelligent processing
      const analysis = await this.analyzeVaultStructure(vaultData);
      
      if (this.options.debug) {
        console.log('🗂️ Vault analysis:', analysis);
      }
      
      // Cache frequently accessed memories
      await this.buildMemoryCache(vaultData);
      
      return {
        success: true,
        analysis,
        memoryCount: analysis.memoryCount,
        peopleCount: analysis.peopleCount,
        timeSpan: analysis.timeSpan
      };
    } catch (error) {
      console.error('❌ Failed to load vault:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stage 1: Analyze vault structure for intelligent memory selection
   * @param {Object} vaultData - .emma vault content
   */
  async analyzeVaultStructure(vaultData) {
    const memories = Object.values(vaultData.content?.memories || {});
    const people = Object.values(vaultData.content?.people || {});
    
    // Extract memory categories and themes
    const categories = new Set();
    const emotions = new Set();
    const tags = new Set();
    const timeRange = { earliest: null, latest: null };
    
    memories.forEach(memory => {
      // Extract categories from tags and content
      if (memory.metadata?.tags) {
        memory.metadata.tags.forEach(tag => tags.add(tag));
      }
      
      if (memory.metadata?.emotion) {
        emotions.add(memory.metadata.emotion);
      }
      
      // Analyze time range
      const created = new Date(memory.created);
      if (!timeRange.earliest || created < timeRange.earliest) {
        timeRange.earliest = created;
      }
      if (!timeRange.latest || created > timeRange.latest) {
        timeRange.latest = created;
      }
      
      // Extract implicit categories from content
      const content = memory.content?.toLowerCase() || '';
      if (content.includes('family')) categories.add('family');
      if (content.includes('work') || content.includes('job')) categories.add('work');
      if (content.includes('travel') || content.includes('vacation')) categories.add('travel');
      if (content.includes('birthday') || content.includes('celebration')) categories.add('celebrations');
      if (content.includes('photo') || content.includes('picture')) categories.add('photos');
    });
    
    return {
      memoryCount: memories.length,
      peopleCount: people.length,
      categories: Array.from(categories),
      emotions: Array.from(emotions),
      tags: Array.from(tags),
      timeSpan: timeRange,
      vaultName: vaultData.name || 'Untitled Vault',
      peopleNames: people.map(p => p.name).filter(Boolean)
    };
  }

  /**
   * Build intelligent memory cache for fast access
   * @param {Object} vaultData - .emma vault content
   */
  async buildMemoryCache(vaultData) {
    const memories = Object.values(vaultData.content?.memories || {});
    
    // Cache memories by various indices for fast retrieval
    this.memoryCache.clear();
    
    memories.forEach(memory => {
      // Cache by ID
      this.memoryCache.set(memory.id, memory);
      
      // Cache by people
      if (memory.metadata?.people) {
        memory.metadata.people.forEach(personId => {
          const key = `person:${personId}`;
          if (!this.memoryCache.has(key)) {
            this.memoryCache.set(key, []);
          }
          this.memoryCache.get(key).push(memory);
        });
      }
      
      // Cache by emotion
      if (memory.metadata?.emotion) {
        const key = `emotion:${memory.metadata.emotion}`;
        if (!this.memoryCache.has(key)) {
          this.memoryCache.set(key, []);
        }
        this.memoryCache.get(key).push(memory);
      }
      
      // Cache by tags
      if (memory.metadata?.tags) {
        memory.metadata.tags.forEach(tag => {
          const key = `tag:${tag}`;
          if (!this.memoryCache.has(key)) {
            this.memoryCache.set(key, []);
          }
          this.memoryCache.get(key).push(memory);
        });
      }
    });
    
    if (this.options.debug) {
      console.log('💾 Memory cache built:', this.memoryCache.size, 'entries');
    }
  }

  /**
   * Main vectorless processing: Answer user questions intelligently
   * @param {string} userQuestion - User's question or message
   * @param {Object} context - Additional context (conversation history, etc.)
   */
  async processQuestion(userQuestion, context = {}) {
    if (!this.currentVault) {
      throw new Error('No vault loaded. Call loadVault() first.');
    }

    try {
      const startTime = Date.now();
      
      // Stage 1: Intelligent Memory Collection Selection
      if (this.options.debug) {
        console.log('🧠 Stage 1: Analyzing memory collections...');
      }
      const selectedCollections = await this.selectMemoryCollections(userQuestion);
      
      // Stage 2: Memory Relevance Detection
      if (this.options.debug) {
        console.log('🎯 Stage 2: Detecting relevant memories...');
      }
      const relevantMemories = await this.detectRelevantMemories(userQuestion, selectedCollections);
      
      // Stage 3: Contextual Response Generation
      if (this.options.debug) {
        console.log('💬 Stage 3: Generating contextual response...');
      }
      const response = await this.generateContextualResponse(userQuestion, relevantMemories, context);
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        response: response.text,
        memories: relevantMemories,
        citations: response.citations,
        suggestions: response.suggestions,
        processingTime,
        stages: {
          collections: selectedCollections.length,
          relevantMemories: relevantMemories.length,
          totalMemories: Object.keys(this.currentVault.content?.memories || {}).length
        }
      };
    } catch (error) {
      console.error('❌ Vectorless processing failed:', error);
      return {
        success: false,
        error: error.message,
        fallbackResponse: this.generateFallbackResponse(userQuestion)
      };
    }
  }

  /**
   * Stage 1: Select memory collections using LLM reasoning
   * @param {string} userQuestion - User's question
   */
  async selectMemoryCollections(userQuestion) {
    if (!this.currentVault) return [];
    
    const vaultAnalysis = await this.analyzeVaultStructure(this.currentVault);
    
    // For demo purposes, use intelligent heuristics
    // In production, this would use LLM API call
    const memories = Object.values(this.currentVault.content?.memories || {});
    
    if (this.options.apiKey) {
      return await this.llmSelectCollections(userQuestion, vaultAnalysis, memories);
    } else {
      return await this.heuristicSelectCollections(userQuestion, memories);
    }
  }

  /**
   * LLM-powered memory collection selection
   */
  async llmSelectCollections(userQuestion, vaultAnalysis, memories) {
    const prompt = `Analyze this memory vault and user question to identify the most relevant memory groups:

VAULT METADATA:
- Name: "${vaultAnalysis.vaultName}"
- Total Memories: ${vaultAnalysis.memoryCount}
- Categories: ${vaultAnalysis.categories.join(', ')}
- People: ${vaultAnalysis.peopleNames.join(', ')}
- Time Range: ${vaultAnalysis.timeSpan.earliest?.toDateString()} to ${vaultAnalysis.timeSpan.latest?.toDateString()}
- Emotions: ${vaultAnalysis.emotions.join(', ')}

USER QUESTION: "${userQuestion}"

AVAILABLE MEMORIES (titles only):
${memories.slice(0, 20).map((m, i) => `${i+1}. ${m.metadata?.title || 'Untitled'} (${m.metadata?.emotion || 'neutral'})`).join('\n')}

Select the indices of the top 10 memories most likely to contain relevant information.
Consider temporal context, people mentioned, emotional themes, and content relevance.

Respond with only a JSON array of indices: [1, 3, 7, ...]`;

    try {
      const response = await this.callLLM(prompt, { maxTokens: 200 });
      const indices = JSON.parse(response.trim());
      return indices.map(i => memories[i - 1]).filter(Boolean);
    } catch (error) {
      console.warn('⚠️ LLM collection selection failed, using heuristics:', error);
      return await this.heuristicSelectCollections(userQuestion, memories);
    }
  }

  /**
   * Heuristic-based memory collection selection (fallback)
   */
  async heuristicSelectCollections(userQuestion, memories) {
    const questionLower = userQuestion.toLowerCase();
    const keywords = questionLower.split(/\s+/).filter(word => word.length > 2);
    
    // Score memories based on keyword matches
    const scoredMemories = memories.map(memory => {
      let score = 0;
      const content = (memory.content || '').toLowerCase();
      const title = (memory.metadata?.title || '').toLowerCase();
      const tags = (memory.metadata?.tags || []).join(' ').toLowerCase();
      
      keywords.forEach(keyword => {
        if (title.includes(keyword)) score += 3;
        if (content.includes(keyword)) score += 2;
        if (tags.includes(keyword)) score += 1;
      });
      
      return { memory, score };
    });
    
    // Return top scoring memories
    return scoredMemories
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(this.options.maxMemories / 2, 10))
      .filter(item => item.score > 0)
      .map(item => item.memory);
  }

  /**
   * Stage 2: Detect relevant memories using LLM reasoning
   * @param {string} userQuestion - User's question
   * @param {Array} selectedMemories - Pre-selected memory collections
   */
  async detectRelevantMemories(userQuestion, selectedMemories) {
    if (selectedMemories.length === 0) return [];
    
    if (this.options.apiKey) {
      return await this.llmDetectRelevance(userQuestion, selectedMemories);
    } else {
      return await this.heuristicDetectRelevance(userQuestion, selectedMemories);
    }
  }

  /**
   * LLM-powered memory relevance detection
   */
  async llmDetectRelevance(userQuestion, selectedMemories) {
    const prompt = `Examine these memories to find the most relevant ones for the user's question:

USER QUESTION: "${userQuestion}"

MEMORIES TO ANALYZE:
${selectedMemories.map((m, i) => `
Memory ${i+1}:
Title: ${m.metadata?.title || 'Untitled'}
Content: ${m.content?.substring(0, 300) || 'No content'}${m.content?.length > 300 ? '...' : ''}
People: ${m.metadata?.people?.map(pid => this.getPersonName(pid)).join(', ') || 'None'}
Date: ${new Date(m.created).toDateString()}
Emotion: ${m.metadata?.emotion || 'neutral'}
Tags: ${m.metadata?.tags?.join(', ') || 'None'}
`).join('\n---\n')}

Rank these memories by relevance (1-10 scale) and select the top 5 most relevant.
Consider emotional context, people relationships, temporal connections, and direct content relevance.

Respond with JSON: {"relevantMemories": [{"index": 1, "relevance": 9, "reason": "..."}, ...]}`;

    try {
      const response = await this.callLLM(prompt, { maxTokens: 800 });
      const result = JSON.parse(response.trim());
      
      return result.relevantMemories
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 5)
        .map(item => ({
          ...selectedMemories[item.index - 1],
          relevanceScore: item.relevance,
          relevanceReason: item.reason
        }));
    } catch (error) {
      console.warn('⚠️ LLM relevance detection failed, using heuristics:', error);
      return await this.heuristicDetectRelevance(userQuestion, selectedMemories);
    }
  }

  /**
   * Heuristic-based memory relevance detection (fallback)
   */
  async heuristicDetectRelevance(userQuestion, selectedMemories) {
    // Use the same scoring logic as collection selection but more refined
    const questionLower = userQuestion.toLowerCase();
    const keywords = questionLower.split(/\s+/).filter(word => word.length > 2);
    
    const scoredMemories = selectedMemories.map(memory => {
      let score = 0;
      const content = (memory.content || '').toLowerCase();
      const title = (memory.metadata?.title || '').toLowerCase();
      
      keywords.forEach(keyword => {
        // Exact matches get higher scores
        if (title === keyword) score += 5;
        else if (title.includes(keyword)) score += 3;
        
        if (content.includes(keyword)) {
          // Count occurrences
          const matches = (content.match(new RegExp(keyword, 'g')) || []).length;
          score += Math.min(matches * 2, 10);
        }
      });
      
      // Boost recent memories slightly
      const daysSinceCreated = (Date.now() - new Date(memory.created)) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated < 30) score += 1;
      
      return { ...memory, relevanceScore: score };
    });
    
    return scoredMemories
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5)
      .filter(memory => memory.relevanceScore > 0);
  }

  /**
   * Stage 3: Generate contextual response using LLM reasoning
   * @param {string} userQuestion - User's question
   * @param {Array} relevantMemories - Relevant memories with scores
   * @param {Object} context - Additional context
   */
  async generateContextualResponse(userQuestion, relevantMemories, context) {
    if (relevantMemories.length === 0) {
      return {
        text: this.generateFallbackResponse(userQuestion),
        citations: [],
        suggestions: ['Try asking about specific people or events', 'Browse your memory gallery', 'Add more memories to your vault']
      };
    }

    if (this.options.apiKey) {
      return await this.llmGenerateResponse(userQuestion, relevantMemories, context);
    } else {
      return await this.heuristicGenerateResponse(userQuestion, relevantMemories);
    }
  }

  /**
   * LLM-powered contextual response generation
   */
  async llmGenerateResponse(userQuestion, relevantMemories, context) {
    const dementiaInstructions = this.options.dementiaMode ? `
IMPORTANT - DEMENTIA CARE GUIDELINES:
- NEVER correct or contradict the user's memories
- Use validation therapy - affirm their feelings and experiences
- Respond with warmth and patience
- If memories seem confused, gently redirect to positive aspects
- Use simple, clear language
- Avoid overwhelming with too much information
` : '';

    const prompt = `You are Emma, a compassionate AI memory companion. Generate a thoughtful response using these relevant memories:

USER QUESTION: "${userQuestion}"

RELEVANT MEMORIES:
${relevantMemories.map((m, i) => `
[Memory ${i+1}: "${m.metadata?.title || 'Untitled'}"]
Content: ${m.content || 'No content available'}
People: ${m.metadata?.people?.map(pid => this.getPersonName(pid)).join(', ') || 'None'}
Date: ${new Date(m.created).toDateString()}
Emotion: ${m.metadata?.emotion || 'neutral'}
Relevance: ${m.relevanceScore || 'N/A'}/10
${m.relevanceReason ? `Why relevant: ${m.relevanceReason}` : ''}
`).join('\n---\n')}

EMMA'S PERSONALITY:
- Warm, empathetic, and encouraging
- Focuses on positive connections and relationships
- Helps users discover insights about their memories
- Suggests ways to explore or expand on memories

${dementiaInstructions}

Generate a response that:
1. Directly addresses the user's question
2. References specific memories naturally (use format: [Memory: Title])
3. Maintains Emma's caring, supportive personality
4. Provides 2-3 follow-up suggestions related to the memories

Response should be conversational, not clinical. Make it feel like talking to a caring friend who knows their life story.`;

    try {
      const response = await this.callLLM(prompt, { maxTokens: 600 });
      
      // Extract citations and suggestions from response
      const citations = this.extractCitations(response, relevantMemories);
      const suggestions = this.extractSuggestions(response, relevantMemories);
      
      return {
        text: response.trim(),
        citations,
        suggestions
      };
    } catch (error) {
      console.warn('⚠️ LLM response generation failed, using heuristics:', error);
      return await this.heuristicGenerateResponse(userQuestion, relevantMemories);
    }
  }

  /**
   * Heuristic-based response generation (fallback)
   */
  async heuristicGenerateResponse(userQuestion, relevantMemories) {
    const topMemory = relevantMemories[0];
    const memoryCount = relevantMemories.length;
    
    let response = `I found ${memoryCount} relevant ${memoryCount === 1 ? 'memory' : 'memories'} related to your question. `;
    
    if (topMemory) {
      const title = topMemory.metadata?.title || 'one of your memories';
      const emotion = topMemory.metadata?.emotion;
      
      response += `The most relevant is "${title}"`;
      if (emotion && emotion !== 'neutral') {
        response += ` - it sounds like it was a ${emotion} time`;
      }
      response += '. ';
      
      // Add a snippet of the memory content
      if (topMemory.content) {
        const snippet = topMemory.content.substring(0, 150);
        response += `Here's what you captured: "${snippet}${topMemory.content.length > 150 ? '...' : ''}" `;
      }
    }
    
    const citations = relevantMemories.map(m => ({
      memoryId: m.id,
      title: m.metadata?.title || 'Untitled',
      relevance: m.relevanceScore || 0
    }));
    
    const suggestions = [
      'Tell me more about this memory',
      'Show me related photos',
      'Who else was involved in this?'
    ];
    
    return { text: response.trim(), citations, suggestions };
  }

  /**
   * Generate fallback response when no relevant memories found
   */
  generateFallbackResponse(userQuestion) {
    const fallbacks = [
      "I'd love to help you explore that topic! It seems like you might not have captured memories about this yet. Would you like to add some?",
      "That's an interesting question. I don't see any memories that directly relate to that, but I'm here to help you capture and explore your experiences.",
      "I couldn't find specific memories about that, but every question helps me understand what's important to you. Would you like to create a memory about this topic?",
      "While I don't have memories that directly answer that question, I'm always learning about what matters to you. Feel free to share more about this topic!"
    ];
    
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  /**
   * Call LLM API (OpenAI, local, etc.)
   */
  async callLLM(prompt, options = {}) {
    if (!this.options.apiKey) {
      throw new Error('No API key configured for LLM calls');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.options.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.options.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`LLM API call failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Extract memory citations from LLM response
   */
  extractCitations(response, relevantMemories) {
    const citations = [];
    const citationPattern = /\[Memory:\s*([^\]]+)\]/g;
    let match;
    
    while ((match = citationPattern.exec(response)) !== null) {
      const title = match[1];
      const memory = relevantMemories.find(m => 
        (m.metadata?.title || '').toLowerCase().includes(title.toLowerCase())
      );
      
      if (memory) {
        citations.push({
          memoryId: memory.id,
          title: memory.metadata?.title || 'Untitled',
          relevance: memory.relevanceScore || 0
        });
      }
    }
    
    return citations;
  }

  /**
   * Extract suggestions from LLM response or generate intelligent ones
   */
  extractSuggestions(response, relevantMemories) {
    // For now, generate contextual suggestions based on memories
    const suggestions = [];
    
    if (relevantMemories.length > 0) {
      const topMemory = relevantMemories[0];
      
      if (topMemory.metadata?.people?.length > 0) {
        suggestions.push('Tell me more about the people in this memory');
      }
      
      if (topMemory.metadata?.tags?.length > 0) {
        const tag = topMemory.metadata.tags[0];
        suggestions.push(`Show me other memories about ${tag}`);
      }
      
      suggestions.push('Add more details to this memory');
    }
    
    // Ensure we have at least 3 suggestions
    while (suggestions.length < 3) {
      const generic = [
        'Browse your memory gallery',
        'Capture a new memory',
        'Explore your relationships',
        'View your memory timeline'
      ];
      const unused = generic.filter(s => !suggestions.includes(s));
      if (unused.length > 0) {
        suggestions.push(unused[0]);
      } else {
        break;
      }
    }
    
    return suggestions.slice(0, 3);
  }

  /**
   * Get person name by ID from vault
   */
  getPersonName(personId) {
    if (!this.currentVault?.content?.people) return 'Unknown';
    const person = this.currentVault.content.people[personId];
    return person?.name || 'Unknown';
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return {
      vaultLoaded: !!this.currentVault,
      memoryCount: this.currentVault ? Object.keys(this.currentVault.content?.memories || {}).length : 0,
      cacheSize: this.memoryCache.size,
      processingQueue: this.processingQueue.length,
      options: this.options
    };
  }
}

// Export for use in extension and web app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmmaVectorlessEngine;
} else if (typeof window !== 'undefined') {
  window.EmmaVectorlessEngine = EmmaVectorlessEngine;
}
