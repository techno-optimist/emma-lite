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

// Initialize chat
document.addEventListener('DOMContentLoaded', () => {
  console.log('💬 Emma WS Chat: DOM loaded');
  connectWebSocket();

  const chatInput = document.getElementById('chat-input');
  chatInput.addEventListener('input', autoResizeTextarea);
  chatInput.focus();
});

function getWebSocketUrl() {
  const fallbackUrls = [
    'wss://emma-lite-optimized.onrender.com/voice',
    'wss://emma-hjjc.onrender.com/voice'
  ];

  const seen = new Set();
  const candidates = [];

  const pushCandidate = (url) => {
    if (url && !seen.has(url) && !failedWsUrls.has(url)) {
      seen.add(url);
      candidates.push(url);
    }
  };

  pushCandidate(lastKnownWsUrl);

  if (typeof window.getEmmaBackendWsUrl === 'function') {
    try {
      pushCandidate(window.getEmmaBackendWsUrl());
    } catch (e) {
      console.warn('💬 Emma WS Chat: backend URL resolution failed', e);
    }
  }

  fallbackUrls.forEach(pushCandidate);

  return candidates;
}

function connectWebSocket() {
  clearTimeout(reconnectTimer);

  const candidates = getWebSocketUrl();

  const tryCandidate = (index = 0) => {
    const wsUrl = candidates[index];

    if (!wsUrl) {
      console.error('💬 Emma WS Chat: No WebSocket candidates available');
      scheduleReconnect();
      return;
    }

    console.log('💬 Emma WS Chat: Connecting to', wsUrl);
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('💬 Emma WS Chat: Connected');
      let sessionId = sessionStorage.getItem('emma-session-id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        sessionStorage.setItem('emma-session-id', sessionId);
      }
      try { sessionStorage.setItem('emma-last-ws-url', wsUrl); } catch (_) {}
      lastKnownWsUrl = wsUrl;
      failedWsUrls.delete(wsUrl);
      ws.send(JSON.stringify({ type: 'start_session', sessionId }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleServerMessage(message);
    };

    ws.onclose = () => {
      console.log('💬 Emma WS Chat: Disconnected');
      scheduleReconnect();
    };

    ws.onerror = (error) => {
      console.error('💬 Emma WS Chat: Error', error);
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

  if (!message || isProcessing || !ws || ws.readyState !== WebSocket.OPEN) return;

  input.value = '';
  autoResizeTextarea({ target: input });

  document.getElementById('welcome-message').style.display = 'none';
  displayMessage('user', message);

  ws.send(JSON.stringify({ type: 'user_text', text: message }));
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
