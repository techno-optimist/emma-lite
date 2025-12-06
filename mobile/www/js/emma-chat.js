// Emma Chat Interface
console.log('💬 Emma Chat: Initializing...');

// Chat state
let chatHistory = [];
let currentContext = [];
let isProcessing = false;

// Initialize chat
document.addEventListener('DOMContentLoaded', async () => {
  console.log('💬 Emma Chat: DOM loaded');
  
  // Load chat history from storage
  await loadChatHistory();
  
  // Auto-resize textarea
  const chatInput = document.getElementById('chat-input');
  chatInput.addEventListener('input', autoResizeTextarea);
  
  // Focus on input
  chatInput.focus();
  
  // Check for memories
  await checkMemoryStatus();
});

// Load chat history
async function loadChatHistory() {
  try {
    const result = await chrome.storage.local.get(['emma_chat_history']);
    if (result.emma_chat_history) {
      chatHistory = result.emma_chat_history;
      // Only show last 20 messages on load
      const recentHistory = chatHistory.slice(-20);
      recentHistory.forEach(msg => displayMessage(msg.sender, msg.content, msg.timestamp, false));
      
      if (recentHistory.length > 0) {
        document.getElementById('welcome-message').style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Failed to load chat history:', error);
  }
}

// Save chat history
async function saveChatHistory() {
  try {
    // Keep only last 100 messages
    const historyToSave = chatHistory.slice(-100);
    await chrome.storage.local.set({ emma_chat_history: historyToSave });
  } catch (error) {
    console.error('Failed to save chat history:', error);
  }
}

// Check memory status
async function checkMemoryStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStats' });
    if (response.success && response.stats.totalMemories > 0) {
      updateSuggestedPrompts([
        `Found ${response.stats.totalMemories} memories in your HML`,
        'Show me my recent memories',
        'What did I talk about yesterday?',
        'Find memories about work'
      ]);
    }
  } catch (error) {
    console.error('Failed to check memory status:', error);
  }
}

// Send message
async function sendMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  
  if (!message || isProcessing) return;
  
  // Clear input
  input.value = '';
  autoResizeTextarea({ target: input });
  
  // Hide welcome message
  document.getElementById('welcome-message').style.display = 'none';
  
  // Display user message
  displayMessage('user', message);
  
  // Save to history
  chatHistory.push({
    sender: 'user',
    content: message,
    timestamp: Date.now()
  });
  await saveChatHistory();
  
  // Process message
  await processUserMessage(message);
}

// Process user message
async function processUserMessage(message) {
  isProcessing = true;
  showTypingIndicator();
  
  try {
    // Search for relevant memories
    const memories = await searchMemories(message);
    
    // Generate response
    const response = await generateResponse(message, memories);
    
    // Hide typing indicator
    hideTypingIndicator();
    
    // Display Emma's response
    displayMessage('emma', response.text, Date.now(), true);
    
    // Display relevant memories if any
    if (response.memories && response.memories.length > 0) {
      response.memories.forEach(memory => {
        displayMemoryCapsule(memory);
      });
    }
    
    // Save Emma's response
    chatHistory.push({
      sender: 'emma',
      content: response.text,
      timestamp: Date.now(),
      memories: response.memories
    });
    await saveChatHistory();
    
    // Update suggested prompts based on context
    if (response.suggestions) {
      updateSuggestedPrompts(response.suggestions);
    }
    
  } catch (error) {
    console.error('Failed to process message:', error);
    hideTypingIndicator();
    displayMessage('emma', "I'm having trouble accessing your memories right now. Please try again.", Date.now(), true);
  }
  
  isProcessing = false;
}

// Search memories
async function searchMemories(query) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'searchMemories',
      query: query,
      limit: 5
    });
    
    if (response.success) {
      return response.results || [];
    }
    return [];
  } catch (error) {
    console.error('Memory search failed:', error);
    return [];
  }
}

// Generate response (simplified for now)
async function generateResponse(message, memories) {
  // For now, use a simple rule-based system
  // In future, this will connect to Claude/GPT API
  
  let responseText = '';
  let relevantMemories = [];
  let suggestions = [];
  
  // Check message intent
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('recent') || lowerMessage.includes('today') || lowerMessage.includes('week')) {
    if (memories.length > 0) {
      responseText = `I found ${memories.length} recent memories. Here are the most relevant ones:`;
      relevantMemories = memories.slice(0, 3);
      suggestions = [
        'Tell me more about the first one',
        'Show older memories',
        'Filter by source'
      ];
    } else {
      responseText = "I don't see any recent memories yet. Try capturing some conversations with AI assistants!";
      suggestions = [
        'How do I capture memories?',
        'What sites are supported?',
        'Show me all memories'
      ];
    }
  } else if (lowerMessage.includes('learn') || lowerMessage.includes('insight')) {
    if (memories.length > 0) {
      responseText = "Based on your memory patterns, I notice you've been exploring topics like: ";
      // Extract topics from memories
      const topics = extractTopics(memories);
      responseText += topics.join(', ') + '. Would you like me to show specific conversations about any of these?';
      suggestions = topics.map(topic => `Show memories about ${topic}`);
    } else {
      responseText = "I'll be able to provide insights once you've captured more memories. Each conversation you save helps me understand your interests better!";
    }
  } else if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
    responseText = "I can help you explore your Human Memory Layer! I can search for specific topics, show recent memories, find patterns in your conversations, and help you discover connections between different discussions. What would you like to explore?";
    suggestions = [
      'Show me how to capture memories',
      'What can you do?',
      'Search for a specific topic'
    ];
  } else {
    // General search
    if (memories.length > 0) {
      responseText = `I found ${memories.length} memories related to "${message}". Here they are:`;
      relevantMemories = memories;
      suggestions = [
        'Show more details',
        'Find similar memories',
        'When was this?'
      ];
    } else {
      responseText = `I couldn't find any memories specifically about "${message}". Try asking about recent conversations or broader topics.`;
      suggestions = [
        'Show all memories',
        'What topics do I have?',
        'Help me search better'
      ];
    }
  }
  
  return {
    text: responseText,
    memories: relevantMemories,
    suggestions: suggestions
  };
}

// Extract topics from memories
function extractTopics(memories) {
  const topics = new Set();
  
  memories.forEach(memory => {
    // Extract from searchText
    if (memory.searchText) {
      const words = memory.searchText.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 4 && !commonWords.includes(word)) {
          topics.add(word);
        }
      });
    }
    
    // Extract from metadata
    if (memory.metadata && memory.metadata.keywords) {
      memory.metadata.keywords.forEach(keyword => topics.add(keyword));
    }
  });
  
  return Array.from(topics).slice(0, 5);
}

// Common words to filter out
const commonWords = ['the', 'and', 'for', 'with', 'from', 'about', 'that', 'this', 'what', 'when', 'where', 'which', 'would', 'could', 'should'];

// Display message
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
  timeDiv.textContent = formatTime(timestamp);
  
  contentDiv.appendChild(textDiv);
  contentDiv.appendChild(timeDiv);
  
  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);
  
  messagesContainer.appendChild(messageDiv);
  
  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Display memory capsule
function displayMemoryCapsule(memory) {
  const messagesContainer = document.getElementById('chat-messages');
  
  const capsuleDiv = document.createElement('div');
  capsuleDiv.className = 'memory-capsule';
  capsuleDiv.onclick = () => expandMemory(memory);
  
  // Header
  const headerDiv = document.createElement('div');
  headerDiv.className = 'memory-header';
  
  const sourceDiv = document.createElement('div');
  sourceDiv.className = 'memory-source';
  // SECURITY: Safe DOM creation to prevent XSS injection
  const iconSpan = document.createElement('span');
  iconSpan.innerHTML = getSourceIcon(memory.source); // getSourceIcon returns safe icons
  const sourceText = document.createTextNode(` ${memory.source || 'Unknown'}`);
  sourceDiv.appendChild(iconSpan);
  sourceDiv.appendChild(sourceText);
  
  const dateDiv = document.createElement('div');
  dateDiv.className = 'memory-date';
  dateDiv.textContent = new Date(memory.timestamp).toLocaleDateString();
  
  headerDiv.appendChild(sourceDiv);
  headerDiv.appendChild(dateDiv);
  
  // Content
  const contentDiv = document.createElement('div');
  contentDiv.className = 'memory-content';
  contentDiv.textContent = truncateText(memory.content, 150);
  
  // Metadata
  const metadataDiv = document.createElement('div');
  metadataDiv.className = 'memory-metadata';
  
  if (memory.type) {
    const typeTag = document.createElement('span');
    typeTag.className = 'memory-tag';
    typeTag.textContent = memory.type;
    metadataDiv.appendChild(typeTag);
  }
  
  if (memory.metadata && memory.metadata.keywords) {
    memory.metadata.keywords.slice(0, 3).forEach(keyword => {
      const tag = document.createElement('span');
      tag.className = 'memory-tag';
      tag.textContent = keyword;
      metadataDiv.appendChild(tag);
    });
  }
  
  capsuleDiv.appendChild(headerDiv);
  capsuleDiv.appendChild(contentDiv);
  capsuleDiv.appendChild(metadataDiv);
  
  messagesContainer.appendChild(capsuleDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Get source icon
function getSourceIcon(source) {
  const icons = {
    'chatgpt': '🤖',
    'claude': '🎭',
    'github': '🐙',
    'google': '🔍',
    'default': '💭'
  };
  
  const sourceLower = (source || '').toLowerCase();
  for (const [key, icon] of Object.entries(icons)) {
    if (sourceLower.includes(key)) return icon;
  }
  return icons.default;
}

// Expand memory
function expandMemory(memory) {
  // TODO: Show full memory in modal or expand inline
  console.log('Expanding memory:', memory);
  displayMessage('emma', `This memory was captured on ${new Date(memory.timestamp).toLocaleString()}. Would you like me to find related memories or tell you more about this conversation?`);
  updateSuggestedPrompts([
    'Find similar memories',
    'What else did we discuss then?',
    'Show the full conversation'
  ]);
}

// Show/hide typing indicator
function showTypingIndicator() {
  document.getElementById('typing-indicator').classList.add('active');
  const messagesContainer = document.getElementById('chat-messages');
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTypingIndicator() {
  document.getElementById('typing-indicator').classList.remove('active');
}

// Update suggested prompts
function updateSuggestedPrompts(prompts) {
  const container = document.getElementById('suggested-prompts');
  container.innerHTML = '';
  
  if (prompts && prompts.length > 0) {
    container.style.display = 'flex';
    prompts.forEach(prompt => {
      const chip = document.createElement('div');
      chip.className = 'prompt-chip';
      chip.textContent = prompt;
      chip.onclick = () => sendPrompt(prompt);
      container.appendChild(chip);
    });
  } else {
    container.style.display = 'none';
  }
}

// Send prompt
function sendPrompt(prompt) {
  const input = document.getElementById('chat-input');
  input.value = prompt;
  autoResizeTextarea({ target: input });
  sendMessage();
}

// Handle keyboard shortcuts
function handleKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

// Auto-resize textarea
function autoResizeTextarea(event) {
  const textarea = event.target;
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

// Clear chat
async function clearChat() {
  const confirmed = await window.emmaConfirm('Would you like to clear all chat history?', {
    title: 'Clear Chat History',
    helpText: 'This will remove all previous conversations.',
    confirmText: 'Yes, Clear',
    cancelText: 'Keep History'
  });
  if (confirmed) {
    chatHistory = [];
    saveChatHistory();
    document.getElementById('chat-messages').innerHTML = '';
    document.getElementById('welcome-message').style.display = 'block';
    document.getElementById('suggested-prompts').style.display = 'none';
  }
}

// Open memory search
function openMemorySearch() {
  // TODO: Open advanced memory search modal
  displayMessage('emma', 'Advanced memory search coming soon! For now, just ask me what you\'re looking for and I\'ll search through your memories.');
}

// Voice input
function startVoiceInput() {
  // TODO: Implement voice input
  displayMessage('emma', 'Voice input coming soon! This will let you talk to me naturally about your memories.');
}

// Utility functions
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Export functions for external use
window.emmaChat = {
  sendMessage,
  sendPrompt,
  clearChat,
  openMemorySearch,
  startVoiceInput
};
























