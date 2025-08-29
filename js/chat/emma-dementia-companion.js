/**
 * 💜 EMMA DEMENTIA COMPANION - Validation Therapy & Memory Support
 * Single responsibility: Dementia-appropriate responses and memory sharing
 * 
 * CTO ARCHITECTURE: Clinical-grade validation therapy with context awareness
 */

class EmmaDementiaCompanion {
  constructor(chatCore) {
    this.chatCore = chatCore;
    this.validationMode = true; // Always validate, never contradict
  }

  /**
   * 💬 HANDLE GENERAL CONVERSATION
   */
  async handleConversation(userMessage, intent) {
    console.log('💜 DEMENTIA: Handling conversation:', userMessage);
    
    const context = this.chatCore.intentClassifier.getContext();
    
    // Generate validation-focused response
    const response = this.generateValidationResponse(userMessage, context);
    
    return {
      text: response,
      actions: []
    };
  }

  /**
   * 💝 HANDLE MEMORY SHARING
   */
  async handleMemorySharing(userMessage, intent) {
    console.log('💝 DEMENTIA: Handling memory sharing:', userMessage);
    
    const person = intent.targetPerson || 'someone special';
    const response = this.generateMemorySharingResponse(userMessage, person);
    
    return {
      text: response,
      actions: [{
        type: 'offer_memory_save',
        memoryContent: userMessage,
        targetPerson: person
      }]
    };
  }

  /**
   * 💜 GENERATE VALIDATION RESPONSE
   */
  generateValidationResponse(userMessage, context) {
    const lower = userMessage.toLowerCase().trim();
    const person = context.lastQueriedPerson;
    
    // Handle simple affirmations
    if (lower === 'yes' || lower === 'yeah' || lower === 'ok') {
      if (person) {
        return `I'm so glad you're sharing about ${person}. These memories mean so much. What else would you like to tell me?`;
      } else {
        return `Thank you for sharing with me. I love hearing your stories. What else is on your mind?`;
      }
    }
    
    // Handle confusion or questions
    if (lower === 'what' || lower === 'what?' || lower === 'huh' || lower === 'huh?') {
      if (person) {
        return `I'm sorry if I wasn't clear! You were telling me about ${person}. Would you like to continue sharing about them?`;
      } else {
        return `I'm here to listen! What would you like to talk about?`;
      }
    }
    
    // Handle expressions of feeling
    if (lower.includes('confused') || lower.includes('lost') || lower.includes('don\'t understand')) {
      return `That's perfectly okay. We can take our time. I'm here to listen to whatever you'd like to share.`;
    }
    
    // Default validation response
    const validationResponses = [
      `That's meaningful to share with me. Tell me more about what's important to you.`,
      `I can hear that this matters to you. What else would you like me to know?`,
      `Thank you for trusting me with your thoughts. What's been on your mind?`,
      `I'm here to listen. What would you like to explore together?`
    ];
    
    return validationResponses[Math.floor(Math.random() * validationResponses.length)];
  }

  /**
   * 💝 GENERATE MEMORY SHARING RESPONSE
   */
  generateMemorySharingResponse(userMessage, person) {
    const lower = userMessage.toLowerCase();
    
    // Relationship responses
    if (lower === 'husband' || lower.includes('husband')) {
      return `Oh, ${person} is your husband! What a beautiful relationship. Tell me about when you first met him.`;
    }
    if (lower === 'wife' || lower.includes('wife')) {
      return `Oh, ${person} is your wife! What a wonderful bond you share. How did you two meet?`;
    }
    if (lower.includes('married')) {
      return `You and ${person} are married! What a beautiful love story. When did you know they were the one?`;
    }
    
    // Activity responses
    if (lower.includes('mowing') || lower.includes('lawn')) {
      return `Oh, ${person} and lawn mowing! That sounds like such a regular part of life together. I can picture those times. What made those moments special?`;
    }
    if (lower.includes('cooking')) {
      return `${person} cooking! I bet those kitchen moments were special. What did they like to make?`;
    }
    if (lower.includes('always') || lower.includes('usually')) {
      return `That sounds like such a meaningful pattern with ${person}! Those regular moments together can be so precious. Tell me more about those times.`;
    }
    
    // Emotional responses
    if (lower.includes('funny')) {
      return `That sounds like such a funny memory with ${person}! I love hearing about moments that brought joy. What else do you remember about it?`;
    }
    if (lower.includes('sad') || lower.includes('difficult')) {
      return `Thank you for sharing that with me. Even difficult moments with ${person} are part of your story together. How are you feeling about it now?`;
    }
    if (lower.includes('beautiful') || lower.includes('wonderful') || lower.includes('amazing')) {
      return `What a beautiful memory with ${person}! I can feel the joy in your voice. Tell me more about what made it so special.`;
    }
    
    // General memory validation
    const generalResponses = [
      `That sounds like such a meaningful memory with ${person}! I love hearing about moments like that. What else do you remember?`,
      `What a special time with ${person}! I can picture that. How did it make you feel?`,
      `That sounds like a beautiful moment with ${person}. Tell me more about what happened.`,
      `I love hearing about your time with ${person}. What made that moment special to you?`
    ];
    
    return generalResponses[Math.floor(Math.random() * generalResponses.length)];
  }

  /**
   * 🤗 HANDLE CONFUSION WITH GENTLE REDIRECTION
   */
  handleConfusion(userMessage, context) {
    const person = context.lastQueriedPerson;
    
    const confusionResponses = [
      person ? 
        `That's okay! You were telling me about ${person}. Take your time - what would you like to share?` :
        `That's perfectly fine. I'm here to listen. What's on your mind?`,
      `No worries at all. We can go at whatever pace feels comfortable for you.`,
      `That's alright! Sometimes it takes a moment to find the words. I'm here when you're ready.`
    ];
    
    return confusionResponses[Math.floor(Math.random() * confusionResponses.length)];
  }

  /**
   * 🔍 DETECT MEMORY SHARING CONTEXT
   */
  isMemorySharing(userMessage, context) {
    const lower = userMessage.toLowerCase();
    
    // Must have person context
    if (!context.lastQueriedPerson) return false;
    
    // Relationship indicators
    const relationships = ['husband', 'wife', 'married', 'mother', 'father', 'son', 'daughter', 'friend'];
    if (relationships.some(word => lower.includes(word))) return true;
    
    // Activity indicators
    const activities = ['mowing', 'cooking', 'cleaning', 'working', 'playing', 'talking', 'laughing'];
    if (activities.some(word => lower.includes(word))) return true;
    
    // Temporal indicators
    if (lower.includes('always') || lower.includes('usually') || lower.includes('often')) return true;
    
    // Simple descriptors in person context
    if (lower.length < 30 && context.lastQueriedPerson) return true;
    
    return false;
  }
}

// Export for global use
window.EmmaDementiaCompanion = EmmaDementiaCompanion;
console.log('💜 Emma Dementia Companion: Module loaded successfully');
