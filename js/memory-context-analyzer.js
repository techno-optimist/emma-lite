/**
 * Memory Context Analyzer
 * Analyzes the user's memory vault to provide contextual suggestions.
 */
class MemoryContextAnalyzer {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * Performs a contextual analysis of the memory vault.
   * @returns {Promise<object>} An analysis object with suggestions.
   */
  async getAnalysis() {
    try {
      const { memories } = await this.orchestrator.getMemories();
      const totalMemories = memories.length;
      const recentTopics = this.extractRecentTopics(memories);
      const suggestedQuestions = this.generateSuggestedQuestions(recentTopics);

      return {
        totalMemories,
        recentTopics,
        suggestedQuestions,
      };
    } catch (error) {
      console.error('Error getting memory analysis:', error);
      return {
        totalMemories: 0,
        recentTopics: [],
        suggestedQuestions: [],
      };
    }
  }

  extractRecentTopics(memories) {
    const topics = new Set();
    memories
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
      .forEach((memory) => {
        if (memory.tags && memory.tags.length > 0) {
          memory.tags.forEach((tag) => topics.add(tag));
        } else if (memory.title) {
          memory.title.split(' ').forEach((word) => {
            if (word.length > 4) topics.add(word.toLowerCase());
          });
        }
      });
    return [...topics];
  }

  generateSuggestedQuestions(topics) {
    if (topics.length === 0) return [];

    const topic = topics[Math.floor(Math.random() * topics.length)];
    return [
      {
        text: `I noticed you've been thinking about ${topic} lately. Would you like to share a memory about that?`,
        confidence: 0.85,
      },
    ];
  }
}
