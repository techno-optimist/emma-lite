// Emma WebSocket Chat Interface
console.log('💬 Emma WS Chat: Initializing...');

// WebSocket state
let ws;
let isProcessing = false;
let reconnectTimer = null;
const RECONNECT_DELAY_MS = 2000;
const failedWsUrls = new Set();
let lastKnownWsUrl = (() => {
  try {
    return sessionStorage.getItem('emma-last-ws-url');
  } catch (_) {
    return null;
  }
})();
let connectionStatusEl;
let connectionState = 'connecting';
let pendingMessages = [];
let fallbackIntelligence = null;

// Initialize chat
document.addEventListener('DOMContentLoaded', () => {
  console.log('💬 Emma WS Chat: DOM loaded');
  connectionStatusEl = document.getElementById('chat-connection-status');
  initializeFallbackIntelligence();
  updateConnectionStatus('connecting', 'Connecting to Emma…');
  connectWebSocket();

  const chatInput = document.getElementById('chat-input');
  chatInput.addEventListener('input', autoResizeTextarea);
  chatInput.focus();
});

function initializeFallbackIntelligence() {
  if (typeof EmmaUnifiedIntelligence !== 'function') {
    console.warn('💬 Emma WS Chat: Unified intelligence unavailable; offline responses disabled.');
    return;
  }

  fallbackIntelligence = new EmmaUnifiedIntelligence({
    dementiaMode: true,
    validationTherapy: true,
    apiKey: window.EMMA_OPENAI_KEY || null,
    vaultAccess: () => window.emmaWebVault?.vaultData?.content
  });
}

function getWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const fallbackHosts = [
    'emma-lite-optimized.onrender.com',
    'emma-hjjc.onrender.com'
  ];

  const seen = new Set();
  const candidates = [];

  const pushCandidate = (url) => {
    if (url && !seen.has(url) && !failedWsUrls.has(url)) {
      seen.add(url);
      candidates.push(url);
    }
  };

  const buildWsUrl = (hostOrUrl) => {
    if (!hostOrUrl) return null;
    try {
      const maybeUrl = new URL(hostOrUrl, window.location.href);
      if (maybeUrl.protocol === 'ws:' || maybeUrl.protocol === 'wss:') {
        return maybeUrl.toString();
      }

      const host = maybeUrl.host || hostOrUrl;
      const path = maybeUrl.pathname && maybeUrl.pathname !== '/' ? maybeUrl.pathname : '/voice';
      return `${protocol}//${host.replace(/^\/*/, '')}${path}`;
    } catch (_) {
      return null;
    }
  };

  pushCandidate(buildWsUrl(lastKnownWsUrl));

  // Allow explicit overrides to avoid repeated merge conflicts across environments.
  if (window.EMMA_WS_URL) {
    pushCandidate(buildWsUrl(window.EMMA_WS_URL));
  }

  // Prefer the current page host, which also keeps local development working.
  pushCandidate(buildWsUrl(window.location.host));

  if (typeof window.getEmmaBackendWsUrl === 'function') {
    try {
      pushCandidate(buildWsUrl(window.getEmmaBackendWsUrl()));
    } catch (e) {
      console.warn('💬 Emma WS Chat: backend URL resolution failed', e);
    }
  }

  fallbackHosts.forEach((host) => pushCandidate(buildWsUrl(host)));

  return candidates;
}

function updateConnectionStatus(state, label) {
  connectionState = state;

  if (connectionStatusEl) {
    connectionStatusEl.textContent = label;
    connectionStatusEl.classList.remove('connected', 'offline', 'connecting');
    connectionStatusEl.classList.add(state);
  }

  const chatInput = document.getElementById('chat-input');
  const sendButton = document.querySelector('.chat-input-area button');
  const disable = state === 'connecting';
  if (chatInput) chatInput.disabled = disable;
  if (sendButton) sendButton.disabled = disable;
}

function flushPendingMessages() {
  if (!pendingMessages.length || !ws || ws.readyState !== WebSocket.OPEN) return;

  const queue = [...pendingMessages];
  pendingMessages = [];

  queue.forEach((text) => {
    ws.send(JSON.stringify({ type: 'user_text', text }));
  });
}

async function respondWithFallback(userMessage) {
  if (!fallbackIntelligence) return;

  try {
    const response = await fallbackIntelligence.analyzeAndRespond(userMessage, null);
    if (response?.text) {
      displayMessage('emma', response.text);
    } else {
      displayMessage('system', 'Emma is offline but keeping notes.');
    }
  } catch (error) {
    console.warn('💬 Emma WS Chat: Fallback response failed', error);
    displayMessage('system', 'Emma is offline right now. Your message has been saved.');
  }
}

function connectWebSocket() {
  clearTimeout(reconnectTimer);

  const candidates = getWebSocketUrl();
  updateConnectionStatus('connecting', 'Connecting to Emma…');

  const tryCandidate = (index = 0) => {
    const wsUrl = candidates[index];

    if (!wsUrl) {
      console.error('💬 Emma WS Chat: No WebSocket candidates available');
      updateConnectionStatus('offline', 'Unable to find an Emma server. Retrying…');
      scheduleReconnect();
      return;
    }

    console.log('💬 Emma WS Chat: Connecting to', wsUrl);
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('💬 Emma WS Chat: Connected');
      updateConnectionStatus('connected', 'Connected to Emma');
      let sessionId = sessionStorage.getItem('emma-session-id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        sessionStorage.setItem('emma-session-id', sessionId);
      }
      try { sessionStorage.setItem('emma-last-ws-url', wsUrl); } catch (_) {}
      lastKnownWsUrl = wsUrl;
      failedWsUrls.delete(wsUrl);
      ws.send(JSON.stringify({ type: 'start_session', sessionId }));
      flushPendingMessages();
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleServerMessage(message);
    };

    ws.onclose = () => {
      console.log('💬 Emma WS Chat: Disconnected');
      updateConnectionStatus('offline', 'Connection lost. Reconnecting…');
      scheduleReconnect();
    };

    ws.onerror = (error) => {
      console.error('💬 Emma WS Chat: Error', error);
      updateConnectionStatus('offline', 'Unable to reach Emma. Trying next server…');
      failedWsUrls.add(wsUrl);
      if (index + 1 < candidates.length) {
        try { ws.close(); } catch (_) {}
        tryCandidate(index + 1);
        return;
      }
      scheduleReconnect();
    };
  };

  tryCandidate(0);
}

function handleServerMessage(message) {
  switch (message.type) {
    case 'emma_ready':
      console.log('Emma is ready');
      break;
    case 'state_change':
      if (message.state === 'thinking') {
        showTypingIndicator();
      } else {
        hideTypingIndicator();
      }
      break;
    case 'emma_transcription':
      displayMessage('emma', message.transcript, Date.now(), true);
      break;
    case 'emma_audio':
      playAudioResponse(message);
      break;
    case 'tool_request':
      handleToolRequest(message);
      break;
    case 'session_ended':
      console.log('Session ended');
      break;
    case 'error':
      displayMessage('system', `❌ ${message.message || 'Emma ran into an issue.'}`);
      break;
    default:
      console.warn('Unhandled server message type:', message.type);
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  updateConnectionStatus('connecting', 'Reconnecting to Emma…');
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectWebSocket();
  }, RECONNECT_DELAY_MS);
}

async function handleToolRequest(request) {
  const { call_id, tool_name, parameters } = request;
  let result;

  try {
    // For now, we'll just use the vault service directly on the client-side
    // This is a temporary solution until the architecture is unified
    if (!window.emmaWebVault) {
      throw new Error('Emma vault not initialized in browser');
    }
    result = await window.emmaWebVault.executeTool(tool_name, parameters);
  } catch (error) {
    result = { error: error.message };
  }

  ws.send(JSON.stringify({
    type: 'tool_result',
    call_id,
    result: JSON.stringify(result)
  }));
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();

  if (!message || isProcessing) return;

  input.value = '';
  autoResizeTextarea({ target: input });

  document.getElementById('welcome-message').style.display = 'none';
  displayMessage('user', message);

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'user_text', text: message }));
  } else {
    pendingMessages.push(message);
    updateConnectionStatus('offline', 'Offline — using local Emma until reconnection');
    respondWithFallback(message);
    scheduleReconnect();
  }
}

function displayMessage(sender, content, timestamp = Date.now(), animate = true) {
  const messagesContainer = document.getElementById('chat-messages');

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}`;
  if (!animate) messageDiv.style.animation = 'none';

  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'message-avatar';
  avatarDiv.textContent = sender === 'user' ? '👤' : '🧠';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';

  const textDiv = document.createElement('div');
  textDiv.className = 'message-text';
  textDiv.textContent = content;

  const timeDiv = document.createElement('div');
  timeDiv.className = 'message-time';
  timeDiv.textContent = new Date(timestamp).toLocaleTimeString();

  contentDiv.appendChild(textDiv);
  contentDiv.appendChild(timeDiv);

  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);

  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function playAudioResponse(message) {
  if (!message?.audio || message.encoding !== 'base64/mp3') {
    return;
  }

  try {
    const audioUrl = `data:audio/mp3;base64,${message.audio}`;
    const audio = new Audio(audioUrl);
    audio.volume = 0.9;
    await audio.play();
  } catch (error) {
    console.warn('Failed to play Emma audio:', error);
  }
}

function showTypingIndicator() {
  document.getElementById('typing-indicator').classList.add('active');
  const messagesContainer = document.getElementById('chat-messages');
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTypingIndicator() {
  document.getElementById('typing-indicator').classList.remove('active');
}

function autoResizeTextarea(event) {
  const textarea = event.target;
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function handleKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

window.emmaWsChat = {
  sendMessage,
  handleKeyPress
};
