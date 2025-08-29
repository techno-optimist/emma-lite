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
    
    // 🩺 CLINICAL TIMING: Dementia-appropriate response timing
    this.responseDelay = {
      minimum: 1500, // Never respond too quickly (causes anxiety)
      maximum: 3000, // Never too slow (causes confusion)
      confusion: 2500, // Extra time for confusion responses
      validation: 2000 // Standard validation timing
    };
  }

  /**
   * 💬 HANDLE GENERAL CONVERSATION - CLINICAL GRADE
   */
  async handleConversation(userMessage, intent) {
    console.log('💜 DEMENTIA: Handling conversation:', userMessage);
    
    const context = this.chatCore.intentClassifier.getContext();
    
    // 🩺 CLINICAL TIMING: Determine appropriate response delay
    const isConfusion = /\b(what|huh|confused|don't understand)\b/i.test(userMessage);
    const delay = isConfusion ? this.responseDelay.confusion : this.responseDelay.validation;
    
    // Generate validation-focused response
    const responseText = this.generateValidationResponse(userMessage, context);
    
    return {
      text: responseText,
      actions: [],
      timing: {
        delay: delay,
        gentle: true,
        clinical: true
      }
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
   * 💜 GENERATE VALIDATION RESPONSE - CLINICAL GRADE
   */
  generateValidationResponse(userMessage, context) {
    const lower = userMessage.toLowerCase().trim();
    const person = context.lastQueriedPerson;
    
    // 🩺 CLINICAL SAFETY: Handle simple affirmations with warmth
    if (lower === 'yes' || lower === 'yeah' || lower === 'ok' || lower === 'sure') {
      if (person) {
        const affirmationResponses = [
          `I'm so grateful you're sharing about ${person} with me. These stories are precious. What else comes to mind about them?`,
          `Thank you for trusting me with memories of ${person}. I can feel how much they mean to you. What else would you like to remember together?`,
          `It's beautiful hearing about ${person}. Every memory you share helps me understand how special they are to you. Tell me more.`
        ];
        return affirmationResponses[Math.floor(Math.random() * affirmationResponses.length)];
      } else {
        const generalAffirmations = [
          `Thank you for sharing with me. Your stories matter so much. What else is close to your heart?`,
          `I love hearing what's important to you. These moments you're sharing are precious. What else would you like to explore?`,
          `It means so much that you're opening up to me. What other memories are stirring in your heart?`
        ];
        return generalAffirmations[Math.floor(Math.random() * generalAffirmations.length)];
      }
    }
    
    // 🩺 CLINICAL SAFETY: Handle confusion with extreme gentleness
    if (lower === 'what' || lower === 'what?' || lower === 'huh' || lower === 'huh?' || 
        lower === 'i don\'t understand' || lower === 'confused') {
      const confusionResponses = [
        person ? 
          `That's completely okay! Sometimes words don't come easily. You were sharing about ${person}, and that's beautiful. Take all the time you need.` :
          `That's perfectly fine. There's no rush at all. I'm here to listen to whatever feels comfortable to share.`,
        `No worries whatsoever. Sometimes it takes a moment to find the right words. I'm here with you, and there's no pressure at all.`,
        `That's absolutely okay. We can go at whatever pace feels right for you. What feels comfortable to talk about right now?`
      ];
      return confusionResponses[Math.floor(Math.random() * confusionResponses.length)];
    }
    
    // 🩺 CLINICAL SAFETY: Handle distress with validation
    if (lower.includes('confused') || lower.includes('lost') || lower.includes('don\'t know') ||
        lower.includes('can\'t remember') || lower.includes('forget')) {
      const supportiveResponses = [
        `That's completely normal and okay. Memory can be gentle sometimes. What you're feeling right now is valid, and I'm here with you.`,
        `It's perfectly alright to feel that way. You don't need to remember everything - just being here and sharing what feels comfortable is enough.`,
        `Those feelings are completely understandable. You're safe here with me, and there's no pressure to remember anything specific. What feels good to talk about?`
      ];
      return supportiveResponses[Math.floor(Math.random() * supportiveResponses.length)];
    }
    
    // 🩺 CLINICAL SAFETY: Handle negative emotions with validation
    if (lower.includes('sad') || lower.includes('upset') || lower.includes('angry') || 
        lower.includes('frustrated') || lower.includes('worried')) {
      const emotionalValidation = [
        `I can hear that you're feeling something difficult right now. Those feelings are completely valid. I'm here to listen without any judgment.`,
        `Thank you for sharing how you're feeling with me. It takes courage to express difficult emotions. You're safe here to feel whatever you need to feel.`,
        `Your feelings matter so much to me. It's okay to have difficult moments. Would you like to talk about what's making you feel this way?`
      ];
      return emotionalValidation[Math.floor(Math.random() * emotionalValidation.length)];
    }
    
    // 🩺 DEFAULT VALIDATION: Always affirm and encourage
    const clinicalValidationResponses = [
      `What you're sharing with me is meaningful and important. I'm honored to listen. What else feels significant to you?`,
      `I can feel that this matters deeply to you. Thank you for trusting me with your thoughts. What else is in your heart?`,
      `Your words carry such meaning. I'm grateful you're sharing this with me. What other thoughts are you carrying today?`,
      `This is precious to hear. Every story you share helps me understand what's important to you. What else would you like to explore together?`
    ];
    
    return clinicalValidationResponses[Math.floor(Math.random() * clinicalValidationResponses.length)];
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
