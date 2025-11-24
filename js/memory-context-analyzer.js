/**
 * 🧠 Emma Memory Context Analyzer
 * 
 * Analyzes existing memories to generate contextual, personalized questions
 * CTO Quality Standard: Production-grade AI-powered memory intelligence
 * 
 * Core Intelligence:
 * - Pattern recognition across memory themes
 * - People and relationship mapping
 * - Emotional sentiment analysis
 * - Storytelling style adaptation
 */

class MemoryContextAnalyzer {
  constructor() {
    this.memoryCache = [];
    this.analysisCache = null;
    this.lastAnalysisTime = null;
    
    console.log('🧠 MemoryContextAnalyzer: Initialized');
  }

  /**
   * Analyze all existing memories to generate contextual insights
   * CTO Review: Comprehensive pattern recognition
   */
  async analyzeExistingMemories() {
    try {
      console.log('🔍 MemoryContextAnalyzer: Starting memory analysis...');
      
      // Load all memories from vault
      const memories = await this.loadAllMemories();
      
      if (!memories || memories.length === 0) {
        console.log('🔍 No existing memories found - using standard questions');
        return this.getStandardAnalysis();
      }

      console.log(`🔍 Analyzing ${memories.length} existing memories...`);

      // Perform comprehensive analysis
      const analysis = {
        memoryCount: memories.length,
        themes: this.analyzeThemes(memories),
        people: this.analyzePeople(memories),
        emotions: this.analyzeEmotions(memories),
        timePatterns: this.analyzeTimePatterns(memories),
        storytellingStyle: this.analyzeStorytellingStyle(memories),
        suggestedQuestions: []
      };

      // Generate contextual questions based on analysis
      analysis.suggestedQuestions = this.generateContextualQuestions(analysis);

      this.analysisCache = analysis;
      this.lastAnalysisTime = Date.now();

      console.log('🔍 Memory analysis complete:', analysis);
      return analysis;

    } catch (error) {
      console.error('🔍 Memory analysis failed:', error);
      return this.getStandardAnalysis();
    }
  }

  /**
   * Load all memories from vault
   * CTO Review: Robust memory loading with fallbacks
   */
  async loadAllMemories() {
    try {
      // Try vault API first
      if (window.emmaAPI?.vault?.memory?.list) {
        const result = await window.emmaAPI.vault.memory.list({ limit: 1000 });
        if (result?.success && result?.memories) {
          return result.memories;
        }
      }

      // Fallback to extension storage
      if (window.chrome?.runtime) {
        const result = await chrome.runtime.sendMessage({ 
          action: 'memory.list', 
          limit: 1000 
        });
        if (result?.success && result?.memories) {
          return result.memories;
        }
      }

      // Fallback to local storage
      const localMemories = localStorage.getItem('emma_memories');
      if (localMemories) {
        return JSON.parse(localMemories);
      }

      return [];

    } catch (error) {
      console.error('🔍 Failed to load memories:', error);
      return [];
    }
  }

  /**
   * Analyze themes across memories
   * CTO Review: Pattern recognition for memory categorization
   */
  analyzeThemes(memories) {
    const themes = {};
    const commonThemes = [
      'family', 'travel', 'holidays', 'childhood', 'school', 'work', 
      'friends', 'love', 'achievement', 'loss', 'celebration', 'tradition',
      'home', 'food', 'music', 'nature', 'pets', 'hobbies'
    ];

    memories.forEach(memory => {
      const text = `${memory.title || ''} ${memory.description || ''} ${memory.content || ''}`.toLowerCase();
      
      // Check for theme keywords
      commonThemes.forEach(theme => {
        const themeKeywords = this.getThemeKeywords(theme);
        const matches = themeKeywords.filter(keyword => text.includes(keyword)).length;
        
        if (matches > 0) {
          themes[theme] = (themes[theme] || 0) + matches;
        }
      });

      // Extract categories if available
      if (memory.category && memory.category !== 'general') {
        themes[memory.category] = (themes[memory.category] || 0) + 1;
      }
    });

    // Sort themes by frequency
    const sortedThemes = Object.entries(themes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5); // Top 5 themes

    console.log('🎨 Theme analysis:', sortedThemes);
    return sortedThemes;
  }

  /**
   * Get keywords for theme detection
   * CTO Review: Comprehensive keyword mapping
   */
  getThemeKeywords(theme) {
    const keywordMap = {
      family: ['mom', 'dad', 'mother', 'father', 'sister', 'brother', 'family', 'parents', 'children', 'kids', 'grandma', 'grandpa'],
      travel: ['trip', 'vacation', 'travel', 'journey', 'visit', 'flew', 'drive', 'hotel', 'beach', 'mountain', 'city'],
      holidays: ['christmas', 'thanksgiving', 'birthday', 'holiday', 'celebration', 'party', 'anniversary', 'wedding'],
      childhood: ['childhood', 'young', 'kid', 'school', 'playground', 'toys', 'games', 'growing up'],
      work: ['work', 'job', 'career', 'office', 'colleague', 'boss', 'meeting', 'project', 'achievement'],
      friends: ['friend', 'friends', 'buddy', 'pal', 'companion', 'together', 'hang out', 'social'],
      love: ['love', 'romance', 'relationship', 'partner', 'spouse', 'dating', 'marriage', 'heart'],
      food: ['food', 'cooking', 'dinner', 'meal', 'restaurant', 'recipe', 'kitchen', 'eating'],
      home: ['home', 'house', 'room', 'garden', 'neighborhood', 'moving', 'apartment'],
      pets: ['dog', 'cat', 'pet', 'animal', 'puppy', 'kitten', 'bird', 'fish']
    };

    return keywordMap[theme] || [theme];
  }

  /**
   * Analyze people mentioned in memories
   * CTO Review: Relationship mapping and frequency analysis
   */
  analyzePeople(memories) {
    const people = {};
    const namePatterns = [
      /\b[A-Z][a-z]+\b/g, // Capitalized names
      /\b(mom|dad|mother|father|sister|brother|grandma|grandpa|aunt|uncle|cousin)\b/gi // Family terms
    ];

    memories.forEach(memory => {
      const text = `${memory.title || ''} ${memory.description || ''} ${memory.content || ''}`;
      
      namePatterns.forEach(pattern => {
        const matches = text.match(pattern) || [];
        matches.forEach(name => {
          const cleanName = name.toLowerCase().trim();
          if (cleanName.length > 1 && !this.isCommonWord(cleanName)) {
            people[cleanName] = (people[cleanName] || 0) + 1;
          }
        });
      });
    });

    // Sort by frequency and return top people
    const sortedPeople = Object.entries(people)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    console.log('👥 People analysis:', sortedPeople);
    return sortedPeople;
  }

  /**
   * Check if word is too common to be a name
   */
  isCommonWord(word) {
    const commonWords = [
      'the', 'and', 'was', 'were', 'been', 'have', 'had', 'will', 'would',
      'could', 'should', 'time', 'day', 'year', 'way', 'back', 'good', 'great'
    ];
    return commonWords.includes(word);
  }

  /**
   * Analyze emotional patterns in memories
   * CTO Review: Sentiment analysis for emotional intelligence
   */
  analyzeEmotions(memories) {
    const emotions = {
      positive: 0,
      negative: 0,
      nostalgic: 0,
      joyful: 0,
      peaceful: 0,
      exciting: 0
    };

    const emotionKeywords = {
      positive: ['happy', 'joy', 'love', 'wonderful', 'amazing', 'beautiful', 'perfect', 'blessed'],
      negative: ['sad', 'difficult', 'hard', 'loss', 'miss', 'gone', 'hurt', 'pain'],
      nostalgic: ['remember', 'used to', 'back then', 'those days', 'miss', 'reminds me'],
      joyful: ['laugh', 'fun', 'exciting', 'celebration', 'party', 'smile', 'delight'],
      peaceful: ['calm', 'quiet', 'peaceful', 'serene', 'gentle', 'soft', 'still'],
      exciting: ['adventure', 'thrilling', 'amazing', 'incredible', 'wow', 'exciting']
    };

    memories.forEach(memory => {
      const text = `${memory.title || ''} ${memory.description || ''} ${memory.content || ''}`.toLowerCase();
      
      Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
        const matches = keywords.filter(keyword => text.includes(keyword)).length;
        emotions[emotion] += matches;
      });
    });

    console.log('💭 Emotion analysis:', emotions);
    return emotions;
  }

  /**
   * Analyze time patterns in memories
   */
  analyzeTimePatterns(memories) {
    const patterns = {
      recentMemories: 0,
      childhoodMemories: 0,
      seasonalPatterns: {},
      decadePatterns: {}
    };

    const currentYear = new Date().getFullYear();
    const seasons = ['spring', 'summer', 'fall', 'autumn', 'winter'];

    memories.forEach(memory => {
      const text = `${memory.title || ''} ${memory.description || ''} ${memory.content || ''}`.toLowerCase();
      
      // Check for childhood indicators
      if (text.includes('child') || text.includes('young') || text.includes('kid')) {
        patterns.childhoodMemories++;
      }

      // Check for recent indicators
      if (text.includes('recently') || text.includes('last year') || text.includes('this year')) {
        patterns.recentMemories++;
      }

      // Check for seasonal patterns
      seasons.forEach(season => {
        if (text.includes(season)) {
          patterns.seasonalPatterns[season] = (patterns.seasonalPatterns[season] || 0) + 1;
        }
      });
    });

    console.log('⏰ Time pattern analysis:', patterns);
    return patterns;
  }

  /**
   * Analyze storytelling style preferences
   */
  analyzeStorytellingStyle(memories) {
    const style = {
      averageLength: 0,
      detailLevel: 'medium',
      preferredPerspective: 'first',
      emotionalExpression: 'moderate'
    };

    if (memories.length === 0) return style;

    // Calculate average memory length
    const totalLength = memories.reduce((sum, memory) => {
      return sum + (memory.content?.length || 0) + (memory.description?.length || 0);
    }, 0);
    
    style.averageLength = Math.round(totalLength / memories.length);

    // Determine detail level
    if (style.averageLength > 500) {
      style.detailLevel = 'high';
    } else if (style.averageLength < 150) {
      style.detailLevel = 'low';
    }

    console.log('📝 Storytelling style analysis:', style);
    return style;
  }

  /**
   * Generate contextual questions based on analysis
   * CTO Review: Emma's intelligent question generation
   */
  generateContextualQuestions(analysis) {
    const questions = [];

    // If user has existing memories, generate contextual questions
    if (analysis.memoryCount > 0) {
      // Theme-based questions
      if (analysis.themes.length > 0) {
        const topTheme = analysis.themes[0][0];
        questions.push({
          id: 'contextual_theme',
          text: `I notice you have many ${topTheme} memories. What's a ${topTheme} moment that stands out to you?`,
          suggestions: this.getThemeSuggestions(topTheme),
          followUp: `That sounds like a meaningful ${topTheme} experience.`
        });
      }

      // People-based questions
      if (analysis.people.length > 0) {
        const topPerson = analysis.people[0];
        questions.push({
          id: 'contextual_person',
          text: `You've mentioned ${topPerson.name} before. What's a special memory you have with them?`,
          suggestions: ['A conversation we had', 'Something they taught me', 'A moment we shared', 'Their unique qualities'],
          followUp: `${topPerson.name} sounds like someone very important to you.`
        });
      }

      // Emotional continuation
      const dominantEmotion = Object.entries(analysis.emotions).sort(([,a], [,b]) => b - a)[0];
      if (dominantEmotion && dominantEmotion[1] > 0) {
        questions.push({
          id: 'contextual_emotion',
          text: `Your memories often capture ${dominantEmotion[0]} moments. What's another time you felt that way?`,
          suggestions: this.getEmotionSuggestions(dominantEmotion[0]),
          followUp: `Those ${dominantEmotion[0]} feelings are so important to preserve.`
        });
      }

    }

    // Always include some standard questions as fallbacks
    questions.push(...this.getStandardQuestions());

    return questions.slice(0, 4); // Return top 4 questions
  }

  /**
   * Get theme-specific suggestions
   */
  getThemeSuggestions(theme) {
    const suggestionMap = {
      family: ['Family gatherings', 'Traditions we shared', 'Lessons they taught me', 'Daily moments together'],
      travel: ['Places we explored', 'Adventures we had', 'People we met', 'Unexpected discoveries'],
      holidays: ['Special traditions', 'Gift exchanges', 'Family time', 'Memorable celebrations'],
      childhood: ['Games we played', 'Friends I had', 'Things I learned', 'Favorite activities'],
      work: ['Achievements', 'Colleagues', 'Challenges overcome', 'Career milestones'],
      friends: ['Adventures together', 'Support they gave', 'Fun times', 'How we met']
    };

    return suggestionMap[theme] || ['Special moments', 'People involved', 'What made it meaningful', 'How it changed me'];
  }

  /**
   * Get emotion-specific suggestions
   */
  getEmotionSuggestions(emotion) {
    const suggestionMap = {
      positive: ['Moments of pure happiness', 'Times I felt grateful', 'Achievements I\'m proud of', 'Love I experienced'],
      joyful: ['Laughter we shared', 'Celebrations', 'Surprises', 'Playful moments'],
      peaceful: ['Quiet moments', 'Nature experiences', 'Meditation or reflection', 'Comfort I found'],
      nostalgic: ['Childhood memories', 'Old friendships', 'Places from the past', 'Traditions']
    };

    return suggestionMap[emotion] || ['Meaningful moments', 'People who mattered', 'Feelings I remember', 'Why it was special'];
  }

  /**
   * Get standard questions for new users
   * CTO Review: Thoughtfully designed intake questions
   */
  getStandardQuestions() {
    return [
      {
        id: 'primary_memory',
        text: "What's a memory that brings you joy when you think about it?",
        suggestions: ['Family moments', 'Achievements', 'Adventures', 'Quiet moments'],
        followUp: "That sounds like a beautiful memory. Tell me more about what made it special."
      },
      {
        id: 'important_person',
        text: "Who is someone important in your life that you'd like to remember?",
        suggestions: ['Family member', 'Close friend', 'Mentor', 'Partner'],
        followUp: "They sound like someone who means a lot to you."
      },
      {
        id: 'meaningful_moment',
        text: "What's a moment that changed you or taught you something important?",
        suggestions: ['Life lesson', 'Overcoming challenge', 'New perspective', 'Personal growth'],
        followUp: "Those transformative moments are so valuable to capture."
      },
      {
        id: 'sensory_memory',
        text: "What's a memory where you can still remember the sights, sounds, or smells?",
        suggestions: ['Childhood home', 'Special meal', 'Nature scene', 'Celebration'],
        followUp: "Those sensory details make memories come alive."
      }
    ];
  }

  /**
   * Get standard analysis for new users
   */
  getStandardAnalysis() {
    return {
      memoryCount: 0,
      themes: [],
      people: [],
      emotions: {},
      timePatterns: {},
      storytellingStyle: { detailLevel: 'medium', averageLength: 200 },
      suggestedQuestions: this.getStandardQuestions()
    };
  }

  /**
   * Get cached analysis or generate new one
   */
  async getAnalysis() {
    // Return cached analysis if recent (within 30 minutes)
    if (this.analysisCache && this.lastAnalysisTime &&
        (Date.now() - this.lastAnalysisTime) < 1800000) {
      console.log('🧠 Using cached memory analysis');
      return this.analysisCache;
    }

    // Generate fresh analysis
    return await this.analyzeExistingMemories();
  }

  /**
   * Generate next question based on current progress
   */
  getNextQuestion(questionIndex, previousResponses = []) {
    // This will be implemented to adapt questions based on previous answers
    // For now, return the question at the given index
    return this.analysisCache?.suggestedQuestions?.[questionIndex] || this.getStandardQuestions()[questionIndex];
  }
}

// Export for global access
window.MemoryContextAnalyzer = MemoryContextAnalyzer;

console.log('🧠 MemoryContextAnalyzer: Class loaded successfully');
