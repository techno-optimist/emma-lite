/**
 * 🧠 EmmaUnifiedIntelligence: Refactored for Modularity and Enhanced Capabilities
 * This class serves as the central intelligence hub for Emma, handling intent analysis,
 * response generation, and action dispatching. It's designed to be extensible and
 * dementia-friendly, prioritizing validation, context-awareness, and gentle guidance.
 */
class EmmaUnifiedIntelligence {
    constructor(options = {}) {
        this.options = {
            dementiaMode: true,
            validationTherapy: true,
            ...options
        };
        this.conversationHistory = [];
        this.currentContext = {
            lastQueriedPerson: null,
            activeMemoryDiscussion: null,
            userEmotionalState: 'neutral',
            lastIntent: null,
            waitingForResponse: null,
        };

        // Add conversationContext alias for compatibility with emma-chat-experience.js
        this.conversationContext = {
            recentPeople: new Set(),
            conversationFlow: [],
            currentTopic: null,
            lastUserIntent: null,
            lastQueriedPerson: null,
        };

        // Centralized intent definitions for easy extension
        this.intentStrategies = {
            'vault_query': this.handleVaultQuery.bind(this),
            'photo_request': this.handlePhotoRequest.bind(this),
            'memory_sharing': this.handleMemorySharing.bind(this),
            'add_memory_detail': this.handleAddMemoryDetail.bind(this),
            'confusion': this.handleConfusion.bind(this),
            'conversation': this.handleConversation.bind(this),
        };
    }

    /**
     * 🎯 Primary Entry Point: Analyzes a user's message and returns an intelligent response.
     */
    async analyzeAndRespond(userMessage, chatInstance) {
        try {
            console.log('🧠 UNIFIED: Processing message ->', userMessage);
            this.addToHistory(userMessage, 'user');

            // Check for contextual actions first
            if (this.currentContext.waitingForResponse) {
                const contextualResponse = await this.handleContextualResponse(userMessage, chatInstance);
                if (contextualResponse) {
                    this.addToHistory(contextualResponse.text, 'emma');
                    return contextualResponse;
                }
            }

            const vaultContext = this.getVaultContext();
            const analysis = await this.analyzeIntent(userMessage, vaultContext);

            console.log('🧠 UNIFIED: Intent analysis ->', analysis);
            this.updateContext(analysis);

            const response = await this.generateResponse(analysis, chatInstance);
            this.addToHistory(response.text, 'emma');

            return response;
        } catch (error) {
            console.error('🚨 UNIFIED: Critical error in analyzeAndRespond ->', error);
            return this.generateFallbackResponse();
        }
    }

    /**
     * 🧐 Analyzes the user's intent using an LLM if available, otherwise falls back to robust heuristics.
     */
    async analyzeIntent(userMessage, vaultContext) {
        const conversationContext = this.getConversationContext();
        if (this.options.apiKey) {
            try {
                return await this.llmAnalyzeIntent(userMessage, vaultContext, conversationContext);
            } catch (error) {
                console.warn('🧠 LLM analysis failed, falling back to heuristics.', error);
            }
        }
        return this.heuristicAnalyzeIntent(userMessage, vaultContext);
    }

    /**
     * 🤖 Performs intent analysis using an LLM for nuanced understanding.
     */
    async llmAnalyzeIntent(userMessage, vaultContext, conversationContext) {
        const prompt = this.buildLlmPrompt(userMessage, vaultContext, conversationContext);
        const llmResponse = await this.callLLM(prompt);
        try {
            return JSON.parse(llmResponse);
        } catch (error) {
            console.error('🚨 LLM response parsing failed:', error, 'Response:', llmResponse);
            // If parsing fails, ask the LLM to fix its own mistake
            const fixupPrompt = `The following JSON is invalid. Please fix it and return only the valid JSON object.\n\n${llmResponse}`;
            const fixedResponse = await this.callLLM(fixupPrompt);
            return JSON.parse(fixedResponse);
        }
    }

    /**
     * 💡 Performs intent analysis using dementia-friendly heuristics as a fallback.
     */
    heuristicAnalyzeIntent(userMessage, vaultContext) {
        const lower = userMessage.toLowerCase().trim();

        if (this.isAddMemoryDetail(lower)) {
            return {
                intent: 'add_memory_detail',
                confidence: 0.9,
                targetMemoryId: this.currentContext.activeMemoryDiscussion?.id
            };
        }

        // Rule-based intent detection...
        if (this.isVaultQuery(lower, vaultContext)) {
            const targetPerson = vaultContext.peopleNames.find(name => lower.includes(name.toLowerCase()));
            return {
                intent: 'vault_query',
                confidence: 0.9,
                targetPerson,
                recommendedActions: ['show_person', 'display_memories']
            };
        }

        if (this.isPhotoRequest(lower)) {
            return {
                intent: 'photo_request',
                confidence: 0.85,
                targetPerson: this.currentContext.lastQueriedPerson,
                recommendedActions: ['trigger_photo_upload']
            };
        }

        if (this.isMemorySharing(lower)) {
            return {
                intent: 'memory_sharing',
                confidence: 0.8,
                targetPerson: this.currentContext.lastQueriedPerson,
                memoryContent: userMessage,
                suggestedResponse: this.generateMemoryValidation(userMessage)
            };
        }

        return {
            intent: 'conversation',
            confidence: 0.5,
            suggestedResponse: "I'm here to listen. What would you like to share?"
        };
    }

    /**
     * 🎭 Generates a response based on the analyzed intent.
     */
    async generateResponse(analysis, chatInstance) {
        const handler = this.intentStrategies[analysis.intent] || this.handleConversation;
        return await handler(analysis, chatInstance);
    }

    // --- Intent Handlers ---

    async handleVaultQuery(analysis, chatInstance) {
        const person = await chatInstance.findPersonInVault(analysis.targetPerson);
        if (!person) {
            if (this.options.dementiaMode) {
                return {
                    text: `I'm listening. Tell me about ${analysis.targetPerson}. Every story is important.`,
                    actions: []
                };
            }
            return {
                text: `I don't believe we've talked about ${analysis.targetPerson} before. Would you like to tell me about them?`,
                actions: []
            };
        }
        const memories = await chatInstance.getPersonMemories(person);
        const memoryText = memories.length > 0 ?
            `I have ${memories.length} lovely ${memories.length === 1 ? 'memory' : 'memories'} of them.` :
            "I'm ready to learn more about them.";

        return {
            text: `Ah, ${person.name}! They are your ${person.relation || 'loved one'}. ${memoryText} Shall I bring up what you've shared about them?`,
            actions: ['show_person', 'display_memories'],
            analysis
        };
    }

    async handlePhotoRequest(analysis) {
        const personText = analysis.targetPerson ? `with ${analysis.targetPerson}` : '';
        return {
            text: `Of course. I can help you save photos ${personText}. Please select the photos you'd like to add.`,
            actions: ['trigger_photo_upload'],
            analysis
        };
    }

    handleMemorySharing(analysis) {
        return {
            text: analysis.suggestedResponse || this.generateMemoryValidation(analysis.memoryContent),
            actions: ['offer_memory_save'],
            analysis
        };
    }

    handleConfusion() {
        if (this.options.dementiaMode) {
            const person = this.currentContext.lastQueriedPerson;
            const topic = person ? `about ${person}` : "about your memories";
            return {
                text: `It's alright, sometimes thoughts can get tangled. We were just talking ${topic}. We can continue with that, or we can talk about something new. Whatever feels right to you.`,
                actions: []
            };
        }
        const person = this.currentContext.lastQueriedPerson;
        const text = person ?
            `I'm sorry if I was unclear. We were just talking about ${person}. Would you like to continue?` :
            "I'm always here to help with your memories. What's on your mind?";
        return { text, actions: [] };
    }

    handleConversation(analysis) {
        return {
            text: analysis.suggestedResponse || "That's interesting. Tell me more.",
            actions: []
        };
    }

    async handleAddMemoryDetail(analysis, chatInstance) {
        const memory = await chatInstance.findMemoryById(analysis.targetMemoryId);
        if (!memory) {
            return { text: "I'm sorry, I couldn't find that memory to add details to.", actions: [] };
        }

        this.currentContext.activeMemoryDiscussion = memory;
        this.currentContext.waitingForResponse = 'add_detail_text';

        return { text: "I'd be happy to add more to that memory. What would you like to add?", actions: [] };
    }

    async handleContextualResponse(userMessage, chatInstance) {
        const { waitingForResponse, activeMemoryDiscussion } = this.currentContext;

        if (waitingForResponse === 'add_detail_text' && activeMemoryDiscussion) {
            const updatedContent = `${activeMemoryDiscussion.content}\n\n**Update:** ${userMessage}`;
            const updatedMemory = { ...activeMemoryDiscussion, content: updatedContent };

            await window.memoryOrchestrator.updateMemory(updatedMemory);

            this.currentContext.waitingForResponse = null;
            this.currentContext.activeMemoryDiscussion = null;

            return { text: "I've added that to your memory. Is there anything else?", actions: [] };
        }

        // If the context doesn't match, reset and let the normal flow handle it
        this.currentContext.waitingForResponse = null;
        return null;
    }

    // --- Helper Methods ---

    updateContext(analysis) {
        this.currentContext.lastIntent = analysis.intent;
        if (analysis.targetPerson) {
            this.currentContext.lastQueriedPerson = analysis.targetPerson;
        }
        if (analysis.emotionalTone) {
            this.currentContext.userEmotionalState = analysis.emotionalTone;
        }
    }

    addToHistory(message, sender) {
        this.conversationHistory.push({ message, sender, timestamp: Date.now() });
        if (this.conversationHistory.length > 10) {
            this.conversationHistory.shift();
        }
    }

    getConversationContext() {
        return this.conversationHistory.slice(-5).map(h => `${h.sender}: ${h.message}`).join('\n');
    }

    getVaultContext() {
        const vault = this.options.vaultAccess ? this.options.vaultAccess() : null;
        if (!vault) return { memoryCount: 0, peopleCount: 0, peopleNames: [], recentTopics: [] };

        const people = Object.values(vault.people || {});
        return {
            memoryCount: Object.keys(vault.memories || {}).length,
            peopleCount: people.length,
            peopleNames: people.map(p => p.name).filter(Boolean),
            recentTopics: [] // Placeholder for future implementation
        };
    }

    generateFallbackResponse() {
        return {
            text: "I'm having a little trouble thinking right now, but I'm still here to listen.",
            actions: []
        };
    }

    // --- Heuristic Logic ---

    isVaultQuery(lower, vaultContext) {
        return (lower.includes('who') || lower.includes('tell me about') || lower.includes('show me')) &&
               vaultContext.peopleNames.some(name => lower.includes(name.toLowerCase()));
    }

    isAddMemoryDetail(lower) {
        return (lower.startsWith("add to that") || lower.startsWith("add more to that")) && this.currentContext.activeMemoryDiscussion;
    }

    isPhotoRequest(lower) {
        const hasPhotoWord = lower.includes('picture') || lower.includes('photo');
        const hasActionWord = lower.includes('add') || lower.includes('save') || lower.includes('upload');
        const isConfirmation = lower === 'yes' || lower === 'yeah';

        return hasPhotoWord && hasActionWord || (isConfirmation && this.isPhotoContext());
    }

    isPhotoContext() {
        const lastEmmaMsg = this.conversationHistory.filter(h => h.sender === 'emma').pop()?.message || '';
        return lastEmmaMsg.toLowerCase().includes('photo');
    }

    isMemorySharing(lower) {
        const memoryIndicators = ['remember', 'mowing', 'cooking', 'always', 'usually', 'fell', 'went', 'saw', 'felt'];
        return this.currentContext.lastQueriedPerson && (memoryIndicators.some(word => lower.includes(word)) || lower.length < 25);
    }

    generateMemoryValidation(message) {
        const person = this.currentContext.lastQueriedPerson;
        const personText = person ? ` with ${person}` : '';

        // Validation therapy focuses on acknowledging the emotion and reality of the memory.
        const validations = [
            `That sounds like a very important memory${personText}. Thank you for sharing it with me.`,
            `I can feel how significant that moment${personText} is. I'm here to listen to more if you'd like to share.`,
            `That's a powerful memory. It's safe with me.`,
            `It sounds like that moment${personText} really stayed with you.`,
        ];

        // If dementiaMode is on, we select a gentle, validating response.
        if (this.options.dementiaMode) {
            return validations[Math.floor(Math.random() * validations.length)];
        }

        // Original behavior for non-dementia mode can be more direct.
        if (message.toLowerCase().includes('always')) {
            return `Those recurring moments${personText} often hold the most meaning. Thank you for sharing that with me.`;
        }
        return `That sounds like a very significant moment${personText}. I'm honored you've shared it.`;
    }

    // --- LLM Interaction ---

    buildLlmPrompt(userMessage, vaultContext, conversationContext) {
        return `You are Emma's intelligence system. Analyze the user message in the context of the conversation and vault data.

**Conversation Context:**
${conversationContext}

**User Message:** "${userMessage}"

**Vault Context:**
- Memories: ${vaultContext.memoryCount}
- People: ${vaultContext.peopleNames.join(', ')}

**Core Directives:**
- **Dementia Care Mode:** ALWAYS use validation therapy. Affirm the user's feelings and experiences. NEVER correct or contradict. Be gentle and patient.
- **Intent First:** Determine the primary intent from the list: [vault_query, memory_sharing, photo_request, confusion, conversation].
- **Extract Entities:** Identify key information like 'targetPerson' or 'memoryContent'.
- **Assess Tone:** Determine the 'emotionalTone' [positive, neutral, confused, sad].
- **Recommend Actions:** Suggest follow-up system actions from this list: [show_person, display_memories, trigger_photo_upload, create_memory, offer_memory_save].
- **Suggest Response:** Formulate a warm, validating, and natural response for Emma to say.

**Output Format (JSON only):**
{
  "intent": "...",
  "confidence": 0.0,
  "targetPerson": "...",
  "memoryContent": "...",
  "emotionalTone": "...",
  "suggestedResponse": "...",
  "recommendedActions": ["..."]
}`;
    }

    async callLLM(prompt) {
        if (!this.options.apiKey) throw new Error('API key is not configured.');

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.options.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4', // Or a newer, more suitable model
                messages: [{ role: 'system', content: prompt }],
                max_tokens: 350,
                temperature: 0.5,
                response_format: { type: "json_object" } // Improves reliability
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }
}
