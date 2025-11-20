This file provides guidance for AI agents working with the Emma Intelligence codebase.

## EmmaUnifiedIntelligence System

The `EmmaUnifiedIntelligence` class is the primary entry point for processing all local chat messages. It is designed to be a single, intelligent system that replaces the previous fragmented intent classification logic.

### Key Responsibilities:

-   **Analyze User Intent:** The `analyzeAndRespond` method is the sole entry point for all incoming user messages. It uses a combination of LLM-based analysis (if an API key is provided) and smart heuristics to determine the user's intent.
-   **Generate Unified Responses:** Based on the intent analysis, the system generates a single, contextual, and empathetic response. It also recommends specific actions to be executed by the `EmmaChatExperience` class (e.g., displaying a person's information, triggering a photo upload).
-   **Maintain Conversation Context:** The system maintains its own internal conversation history and context, allowing for more natural and intelligent follow-up interactions.
-   **Dementia-Friendly Interaction:** All responses and analyses are designed with dementia care principles in mind, focusing on validation, patience, and warmth.

### Agent Workflow:

1.  **Message Routing:** All local chat messages from `EmmaChatExperience` should be routed directly to the `unifiedIntelligence.analyzeAndRespond` method.
2.  **Response Handling:** The `analyzeAndRespond` method will return a response object containing the text to be displayed to the user and any recommended actions. The `EmmaChatExperience` class is responsible for rendering the response and executing the actions.
3.  **No Direct Intent Classification:** Agents should **not** implement any separate intent classification or message processing logic within `EmmaChatExperience`. All such logic is now centralized in the `EmmaUnifiedIntelligence` system.
4.  **Extending Capabilities:** To add new capabilities or response types, agents should modify the `EmmaUnifiedIntelligence` class, particularly the `llmAnalyzeIntent`, `heuristicAnalyzeIntent`, and `generateUnifiedResponse` methods.
5.  **Context is Key:** When modifying the system, pay close attention to the use of `conversationHistory` and `currentContext` to ensure that all responses are context-aware and personalized.

By centralizing the intelligence in this new system, we aim to create a more robust, maintainable, and intelligent conversational experience for our users.
