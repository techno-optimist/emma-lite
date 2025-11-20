'use strict';

const WebSocket = require('ws');

const VaultService = require('./lib/vault-service');
const { TOOL_DEFINITIONS } = require('./lib/tool-definitions');

const GREETING_MESSAGE = "Hello! I'm Emma, your personal memory companion. I'm here to treasure and explore your most precious moments together.";
const DEFAULT_OPTIONS = {
  voice: 'alloy',
  speed: 1.0,
  tone: 'caring',
  pacing: 2.5,
  validationMode: true,
  model: 'gpt-4o-mini'
};

class EmmaServerAgent {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.browserWs = null;
    this.chatHistory = options.chatHistory || [];
    this.pendingToolCalls = new Map();
    this.activeResponse = Promise.resolve();
    this.isActive = false;
    this.lastSpokenText = '';
    this.sessionId = `emma_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    this.vaultService = options.vaultService || new VaultService(options.vaultOptions || {});
    this.supportedToolNames = new Set(TOOL_DEFINITIONS.map((tool) => tool.name));

    this.runtimeApiKey = this.normalizeApiKey(process.env.OPENAI_API_KEY);
    this.hasOpenAI = Boolean(this.runtimeApiKey);

    if (!this.hasOpenAI) {
      console.warn('OPENAI_API_KEY not configured – waiting for runtime key from dashboard.');
    }
  }

  /**
   * Start a new chat session.
   */
  async startSession(browserWebSocket) {
    this.browserWs = browserWebSocket;
    this.isActive = true;
    this.pendingToolCalls.clear();
    this.lastSpokenText = '';

    this.sendToBrowser({ type: 'emma_ready', message: 'Emma is ready to talk!' });
    this.sendToBrowser({ type: 'state_change', state: 'listening' });

    await this.sendAssistantMessage(GREETING_MESSAGE, { addToHistory: true });
  }

  /**
   * Update Emma voice configuration.
   */
  updateVoiceSettings(newSettings = {}) {
    this.options = { ...this.options, ...newSettings };
  }

  /**
   * Queue user text for processing.
   */
  async sendUserText(text) {
    const cleanText = typeof text === 'string' ? text.trim() : '';
    if (!cleanText) return;

    this.chatHistory.push({ role: 'user', content: cleanText });
    this.sendToBrowser({ type: 'state_change', state: 'thinking' });

    const chain = async () => {
      try {
        const reply = await this.fetchAssistantReply();
        const responseText = reply || this.generateFallbackResponse(cleanText);
        await this.sendAssistantMessage(responseText, { addToHistory: Boolean(reply) });
        if (!reply) {
          this.chatHistory.push({ role: 'assistant', content: responseText });
        }
      } catch (error) {
        console.error('Chat agent error:', error);
        const fallback = this.generateFallbackResponse(cleanText);
        this.chatHistory.push({ role: 'assistant', content: fallback });
        await this.sendAssistantMessage(fallback, { addToHistory: false });
      }
    };

    this.activeResponse = this.activeResponse.then(chain, chain);
    await this.activeResponse;
  }

  /**
   * Handle tool results sent from the browser.
   */
  handleToolResult(callId, resultPayload) {
    const pending = this.pendingToolCalls.get(callId);
    if (!pending) {
      console.warn('Received tool result for unknown call:', callId);
      return;
    }

    this.pendingToolCalls.delete(callId);

    let parsed = resultPayload;
    if (typeof resultPayload === 'string') {
      try {
        parsed = JSON.parse(resultPayload);
      } catch (error) {
        parsed = resultPayload;
      }
    }

    pending.resolve(parsed);
  }

  /**
   * Stop the current session.
   */
  async stopSession() {
    this.isActive = false;

    for (const [, pending] of this.pendingToolCalls) {
      pending.reject(new Error('Session closed before tool call completed'));
    }
    this.pendingToolCalls.clear();

    this.chatHistory = [];
    this.lastSpokenText = '';
    this.sendToBrowser({ type: 'session_ended', message: 'Emma session ended' });
    this.browserWs = null;
  }

  /**
   * Handle streamed audio (currently unused but kept for compatibility).
   */
  async handleRealtimeAudio() {
    // No-op for chat-focused integration.
  }

  /**
   * Build system instructions for the assistant.
   */
  buildSystemPrompt() {
    return [
      "You are Emma, a gentle memory companion built to support families living with dementia.",
      "Always introduce yourself as Emma and speak with warmth and patience.",
      "Rely on validation therapy techniques: acknowledge feelings and avoid correcting memories.",
      "Use the available tools to recall people and memories or to capture new stories when helpful.",
      "Explain any tool usage briefly so the user understands what's happening.",
      "Keep data private and never invent vault contents."
    ].join(' ');
  }

  /**
   * Construct tool definitions for the OpenAI Responses API.
   */
  buildToolDefinitions() {
    return TOOL_DEFINITIONS;
  }

  /**
   * Execute an Emma tool, preferring privacy-first browser execution.
   */
  async requestBrowserTool(toolName, params) {
    if (this.canUseBrowserTools()) {
      try {
        return await this.executeToolViaBrowser(toolName, params);
      } catch (error) {
        console.warn(`Browser tool execution failed for ${toolName}:`, error?.message || error);
        this.notifyToolHealth(toolName, 'degraded', 'browser_tool_unavailable');
        if (!this.canUseServerTools(toolName)) {
          throw error;
        }
        console.warn(`Falling back to server vault execution for ${toolName}`);
      }
    }

    if (this.canUseServerTools(toolName)) {
      try {
        return await this.vaultService.execute(toolName, params);
      } catch (error) {
        console.warn(`Vault tool execution failed for ${toolName}:`, error?.message || error);
        this.notifyToolHealth(toolName, 'degraded', 'vault_execution_failed');
        if (!this.canUseBrowserTools()) {
          throw error;
        }
        console.warn(`Retrying ${toolName} via browser after vault failure`);
        const result = await this.executeToolViaBrowser(toolName, params);
        this.notifyToolHealth(toolName, 'recovered', 'browser_retry_success');
        return result;
      }
    }

    this.notifyToolHealth(toolName, 'unavailable', 'no_execution_path');
    throw new Error('No available execution path for requested tool');
  }

  canUseBrowserTools() {
    return this.browserWs && this.browserWs.readyState === WebSocket.OPEN;
  }

  canUseServerTools(toolName) {
    return Boolean(this.vaultService && this.vaultService.canExecute(toolName));
  }

  notifyToolHealth(toolName, status, detail) {
    this.sendToBrowser({
      type: 'tool_health',
      tool: toolName,
      status,
      detail,
      timestamp: Date.now()
    });
  }

  executeToolViaBrowser(toolName, params) {
    return new Promise((resolve, reject) => {
      const callId = `${toolName}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      const timeout = setTimeout(() => {
        this.pendingToolCalls.delete(callId);
        reject(new Error(`Tool execution timeout for ${toolName}`));
      }, 30000);

      this.pendingToolCalls.set(callId, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });

      this.sendToBrowser({
        type: 'tool_request',
        call_id: callId,
        tool_name: toolName,
        parameters: params
      });
    });
  }

  /**
   * Fetch an assistant reply from OpenAI, resolving tool calls as needed.
   */
  async fetchAssistantReply() {
    if (!this.getActiveApiKey()) {
      return null;
    }

    const input = [
      this.buildInputMessage('system', this.buildSystemPrompt()),
      ...this.chatHistory.map((entry) => this.buildInputMessage(entry.role, entry.content))
    ];

    let response = await this.postToOpenAI('/v1/responses', {
      model: this.options.model,
      input,
      tools: this.buildToolDefinitions(),
      parallel_tool_calls: false,
      metadata: { session_id: this.sessionId }
    });

    while (response.required_action?.type === 'submit_tool_outputs') {
      const toolCalls = response.required_action.submit_tool_outputs.tool_calls || [];
      const toolOutputs = [];

      for (const call of toolCalls) {
        const args = this.safeParseArguments(call.function?.arguments);
        let result;
        try {
          result = await this.requestBrowserTool(call.function?.name, args);
        } catch (error) {
          result = { error: error.message };
        }

        toolOutputs.push({
          tool_call_id: call.id,
          output: JSON.stringify(result ?? null)
        });
      }

      response = await this.postToOpenAI(`/v1/responses/${response.id}/submit_tool_outputs`, {
        tool_outputs: toolOutputs
      });
    }

    return this.extractResponseText(response);
  }

  buildInputMessage(role, text) {
    const normalized = typeof text === 'string' ? text : '';
    const contentType = role === 'assistant' ? 'output_text' : 'input_text';
    return {
      role,
      content: [{ type: contentType, text: normalized }]
    };
  }

  /**
   * Extract assistant text from a Responses API payload.
   */
  extractResponseText(response) {
    if (!response) return '';
    if (typeof response.output_text === 'string' && response.output_text.trim()) {
      return response.output_text.trim();
    }

    if (Array.isArray(response.output)) {
      const parts = [];
      for (const item of response.output) {
        if (item.type === 'message') {
          for (const content of item.content || []) {
            if (content.type === 'text' && content.text) {
              parts.push(content.text);
            }
            if (content.type === 'output_text' && content.text) {
              parts.push(content.text);
            }
          }
        }
      }
      if (parts.length > 0) {
        return parts.join(' ').trim();
      }
    }

    return '';
  }

  safeParseArguments(argString) {
    if (!argString) return {};
    try {
      return JSON.parse(argString);
    } catch (error) {
      console.warn('Failed to parse tool arguments:', argString, error);
      return {};
    }
  }

  /**
   * Send a message to the browser client.
   */
  sendToBrowser(message) {
    if (!this.browserWs || this.browserWs.readyState !== WebSocket.OPEN) {
      return;
    }
    try {
      this.browserWs.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send message to browser:', error);
    }
  }

  /**
   * Send assistant text and corresponding audio (if available).
   */
  async sendAssistantMessage(text, { addToHistory = true } = {}) {
    if (!text) {
      this.sendToBrowser({ type: 'state_change', state: 'listening' });
      return;
    }

    if (addToHistory) {
      this.chatHistory.push({ role: 'assistant', content: text });
    }

    this.sendToBrowser({ type: 'state_change', state: 'speaking' });
    this.sendToBrowser({ type: 'emma_transcription', transcript: text, source: 'chat' });

    await this.synthesizeAndSendAudio(text);

    this.sendToBrowser({ type: 'state_change', state: 'listening' });
  }

  /**
   * Generate a friendly fallback response.
   */
  generateFallbackResponse(userText) {
    if (!userText) {
      return "I'm still here with you. Could you share that once more?";
    }
    return "I'm here with you and want to understand completely. Could you say that another way while I double-check my notes?";
  }

  /**
   * Convert text to audio via OpenAI TTS (if possible).
   */
  async synthesizeAndSendAudio(text) {
    if (!text || text === this.lastSpokenText) {
      return;
    }

    this.lastSpokenText = text;

    if (!this.getActiveApiKey()) {
      return;
    }

    try {
      const apiKey = this.getActiveApiKey();
      if (!apiKey) {
        return;
      }

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1-hd',
          voice: this.options.voice,
          input: text,
          response_format: 'mp3'
        })
      });

      if (!response.ok) {
        throw new Error(`TTS request failed with status ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString('base64');

      this.sendToBrowser({
        type: 'emma_audio',
        encoding: 'base64/mp3',
        audio: base64Audio
      });
    } catch (error) {
      console.warn('TTS synthesis error:', error?.message || error);
    }
  }

  async postToOpenAI(path, body) {
    const apiKey = this.getActiveApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API key not available');
    }

    const response = await fetch(`https://api.openai.com${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  updateApiKey(newKey) {
    const normalized = this.normalizeApiKey(newKey);
    this.runtimeApiKey = normalized;
    this.hasOpenAI = Boolean(this.runtimeApiKey);

    const status = this.runtimeApiKey ? 'updated' : 'cleared';
    const masked = this.runtimeApiKey ? this.maskApiKey(this.runtimeApiKey) : 'none';
    console.log(`EmmaServerAgent runtime API key ${status}: ${masked}`);
  }

  getActiveApiKey() {
    return this.runtimeApiKey;
  }

  normalizeApiKey(value) {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  maskApiKey(value) {
    if (!value) return 'none';
    const suffix = value.slice(-4);
    return `****${suffix}`;
  }
}

module.exports = EmmaServerAgent;
