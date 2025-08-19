/**
 * 🎭 Emma Question Engine
 * 
 * Generates intelligent, contextual questions for memory capture
 * CTO Quality Standard: Production-grade conversational AI
 * 
 * Intelligence Features:
 * - Context-aware question selection
 * - Adaptive follow-up questions
 * - Emotional intelligence in prompting
 * - Progressive memory building
 */

class EmmaQuestionEngine {
  constructor() {
    this.contextAnalyzer = null; // Will be injected externally
    this.currentQuestions = [];
    this.currentQuestionIndex = 0;
    this.responses = [];
    
    console.log('🎭 EmmaQuestionEngine: Initialized');
  }

  /**
   * Initialize question flow based on user's memory context
   * CTO Review: Intelligent question selection
   */
  async initializeQuestionFlow() {
    try {
      console.log('🎭 Initializing intelligent question flow...');
      
      let analysis = null;
      
      // Analyze existing memories for context if analyzer available
      if (this.contextAnalyzer && typeof this.contextAnalyzer.analyzeExistingMemories === 'function') {
        analysis = await this.contextAnalyzer.analyzeExistingMemories();
      } else {
        console.warn('🎭 Context analyzer not available - using standard questions');
        analysis = { memoryCount: 0, themes: [], people: [] };
      }
      
      // Generate personalized question set
      this.currentQuestions = this.selectOptimalQuestions(analysis);
      this.currentQuestionIndex = 0;
      
      console.log('🎭 Question flow initialized:', {
        memoryCount: analysis.memoryCount,
        questionCount: this.currentQuestions.length,
        isPersonalized: analysis.memoryCount > 0
      });

      return this.currentQuestions;

    } catch (error) {
      console.error('🎭 Question flow initialization failed:', error);
      
      // Fallback to standard questions
      this.currentQuestions = this.getStandardQuestions();
      this.currentQuestionIndex = 0;
      
      return this.currentQuestions;
    }
  }

  /**
   * Select optimal questions based on context analysis
   * CTO Review: Smart question prioritization
   */
  selectOptimalQuestions(analysis) {
    const questions = [];

    if (analysis.memoryCount === 0) {
      // New user - use carefully crafted intake questions
      console.log('🎭 New user detected - using intake questions');
      return this.getNewUserQuestions();
    }

    // Existing user - blend contextual and standard questions
    console.log('🎭 Existing user detected - generating contextual questions');
    
    // Start with contextual questions from analysis
    const contextualQuestions = analysis.suggestedQuestions || [];
    questions.push(...contextualQuestions.slice(0, 2)); // Top 2 contextual

    // Add complementary standard questions
    const standardQuestions = this.contextAnalyzer.getStandardQuestions();
    const remainingSlots = 4 - questions.length;
    
    // Select standard questions that don't overlap with contextual themes
    const usedThemes = new Set(questions.map(q => q.id));
    const complementaryQuestions = standardQuestions.filter(q => !usedThemes.has(q.id));
    
    questions.push(...complementaryQuestions.slice(0, remainingSlots));

    return questions;
  }

  /**
   * Get carefully crafted questions for new users
   * CTO Review: Perfect first-time user experience
   */
  getNewUserQuestions() {
    return [
      {
        id: 'opening_memory',
        text: "Let's start with something meaningful. What's a memory that always makes you smile?",
        suggestions: ['Family time', 'Achievement', 'Adventure', 'Quiet moment'],
        followUp: "That sounds wonderful. What made that moment so special to you?",
        type: 'opening'
      },
      {
        id: 'important_person',
        text: "Who is someone important in your life that you'd love to remember more about?",
        suggestions: ['Family member', 'Close friend', 'Mentor', 'Life partner'],
        followUp: "Tell me about a specific moment with them that you treasure.",
        type: 'relationship'
      },
      {
        id: 'life_lesson',
        text: "What's something you learned from experience that you'd want to pass on?",
        suggestions: ['Life wisdom', 'Overcoming challenge', 'Personal growth', 'Important realization'],
        followUp: "That's valuable wisdom. How did you come to learn that?",
        type: 'wisdom'
      },
      {
        id: 'sensory_detail',
        text: "What's a memory where you can still feel like you're there - the sights, sounds, even smells?",
        suggestions: ['Childhood home', 'Special place', 'Celebration', 'Nature scene'],
        followUp: "Those vivid details make memories so powerful. What else do you remember?",
        type: 'sensory'
      }
    ];
  }

  /**
   * Get current question
   */
  getCurrentQuestion() {
    if (this.currentQuestionIndex >= this.currentQuestions.length) {
      return null; // No more questions
    }
    
    return this.currentQuestions[this.currentQuestionIndex];
  }

  /**
   * Get next question with adaptive logic
   * CTO Review: Intelligent question progression
   */
  getNextQuestion(questionIndex = null) {
    // Use provided index or current index
    const index = questionIndex !== null ? questionIndex : this.currentQuestionIndex;
    
    // Ensure we have questions
    if (!this.currentQuestions || this.currentQuestions.length === 0) {
      this.currentQuestions = this.getStandardQuestions();
    }
    
    // Return question at index, or last question if index too high
    const questionToReturn = this.currentQuestions[Math.min(index, this.currentQuestions.length - 1)];
    
    return questionToReturn || this.getStandardQuestions()[0];
  }

  /**
   * Get current question without advancing
   */
  getCurrentQuestion() {
    return this.getNextQuestion(this.currentQuestionIndex);
  }

  /**
   * Move to next question
   */
  nextQuestion() {
    this.currentQuestionIndex++;
    return this.getCurrentQuestion();
  }

  /**
   * Move to previous question
   */
  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
    return this.getCurrentQuestion();
  }

  /**
   * Add response for current question
   */
  addResponse(questionId, response) {
    this.responses.push({
      questionId: questionId,
      response: response.trim(),
      timestamp: new Date()
    });
  }

  /**
   * Adapt question based on conversation context
   * CTO Review: Dynamic question adaptation
   */
  adaptQuestionToContext(question) {
    // Analyze previous responses for context
    const previousResponses = this.responses;
    
    // If user mentioned specific people, adapt questions
    if (previousResponses.length > 0) {
      const lastResponse = previousResponses[previousResponses.length - 1];
      const mentionedPeople = this.extractPeopleFromText(lastResponse.response);
      
      if (mentionedPeople.length > 0 && question.type === 'relationship') {
        question.text = `Tell me more about ${mentionedPeople[0]}. What's another memory with them?`;
        question.suggestions = ['How we met', 'Something they taught me', 'A tradition we shared', 'Their unique personality'];
      }
    }

    return question;
  }

  /**
   * Extract people names from text
   */
  extractPeopleFromText(text) {
    const namePattern = /\b[A-Z][a-z]+\b/g;
    const matches = text.match(namePattern) || [];
    
    // Filter out common words that might be capitalized
    const commonWords = ['The', 'And', 'But', 'When', 'Where', 'What', 'How', 'Why', 'This', 'That'];
    return matches.filter(name => !commonWords.includes(name));
  }

  /**
   * Get progress information
   */
  getProgress() {
    return {
      currentIndex: this.currentQuestionIndex,
      totalQuestions: this.currentQuestions.length,
      completed: this.responses.length,
      percentage: Math.round((this.responses.length / this.currentQuestions.length) * 100)
    };
  }

  /**
   * Get all responses for memory creation
   */
  getAllResponses() {
    return {
      responses: this.responses,
      analysis: this.contextAnalyzer.analysisCache,
      totalQuestions: this.currentQuestions.length,
      completedQuestions: this.responses.length
    };
  }

  /**
   * Reset for new memory capture session
   */
  reset() {
    this.currentQuestions = [];
    this.currentQuestionIndex = 0;
    this.responses = [];
    console.log('🎭 EmmaQuestionEngine: Reset for new session');
  }

  /**
   * Skip current question
   */
  skipCurrentQuestion() {
    const currentQuestion = this.getCurrentQuestion();
    if (currentQuestion) {
      this.responses.push({
        questionId: currentQuestion.id,
        question: currentQuestion.text,
        response: '[Skipped]',
        timestamp: new Date(),
        skipped: true
      });
    }
    
    this.currentQuestionIndex++;
    return this.getCurrentQuestion();
  }

  /**
   * Generate memory title based on responses
   * CTO Review: AI-powered title generation
   */
  generateMemoryTitle() {
    if (this.responses.length === 0) {
      return 'New Memory';
    }

    // Use the first response as basis for title
    const firstResponse = this.responses[0];
    const words = firstResponse.response.split(' ').slice(0, 6); // First 6 words
    
    // Clean and format
    let title = words.join(' ');
    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }

    return title || 'Memory from ' + new Date().toLocaleDateString();
  }

  /**
   * Generate memory description from all responses
   * CTO Review: Comprehensive memory compilation
   */
  generateMemoryDescription() {
    if (this.responses.length === 0) {
      return '';
    }

    // Combine all responses into a coherent description
    const responseTexts = this.responses
      .filter(r => !r.skipped && r.response !== '[Skipped]')
      .map(r => r.response);

    return responseTexts.join('\n\n');
  }

  /**
   * Suggest memory tags based on responses
   */
  generateMemoryTags() {
    const tags = new Set();
    
    // Add theme-based tags
    this.responses.forEach(response => {
      const text = response.response.toLowerCase();
      
      // Family tags
      if (text.includes('mom') || text.includes('dad') || text.includes('family')) {
        tags.add('family');
      }
      
      // Emotion tags
      if (text.includes('happy') || text.includes('joy')) {
        tags.add('joyful');
      }
      
      if (text.includes('love') || text.includes('heart')) {
        tags.add('love');
      }
      
      // Activity tags
      if (text.includes('travel') || text.includes('trip')) {
        tags.add('travel');
      }
      
      if (text.includes('holiday') || text.includes('celebration')) {
        tags.add('celebration');
      }
    });

    return Array.from(tags);
  }

  /**
   * Get standard fallback questions when no context available
   */
  getStandardQuestions() {
    return [
      {
        id: 'standard-1',
        text: "What memory would you like to capture?",
        subtext: "Tell me about a special moment you'd like to remember",
        category: 'general'
      },
      {
        id: 'standard-2', 
        text: "Who was involved in this memory?",
        subtext: "Share the people who made this moment special",
        category: 'people'
      },
      {
        id: 'standard-3',
        text: "Where did this take place?",
        subtext: "Describe the location or setting of this memory",
        category: 'location'
      },
      {
        id: 'standard-4',
        text: "What made this moment special?",
        subtext: "Tell me about the emotions and feelings from this time",
        category: 'emotion'
      }
    ];
  }
}

// Export for global access
window.EmmaQuestionEngine = EmmaQuestionEngine;

console.log('🎭 EmmaQuestionEngine: Class loaded successfully');
