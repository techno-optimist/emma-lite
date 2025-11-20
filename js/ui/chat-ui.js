/**
 * 🎨 ChatUI: Handles all UI rendering and user interaction for the Emma chat experience.
 * This class is responsible for the presentation layer, separating DOM manipulation
 * from the core chat logic.
 */
class ChatUI {
    constructor(chatExperience) {
        this.chatExperience = chatExperience;
        this.messageContainer = null;
        this.inputField = null;
        this.sendButton = null;
        this.voiceButton = null;
    }

    /**
     * Renders the main chat interface into the provided content element.
     */
    render(contentElement) {
        contentElement.innerHTML = `
            <div class="emma-chat-messages" id="chat-messages"></div>
            <div class="emma-chat-input">
                <div class="input-wrapper">
                    <button class="voice-btn" id="voice-input-btn" title="Voice input">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                            <line x1="12" y1="19" x2="12" y2="23"/>
                            <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                    </button>
                    <textarea id="chat-input" class="chat-textarea" placeholder="Ask Emma about your memories..." rows="1"></textarea>
                    <button class="send-btn" id="send-btn" title="Send message">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="emma-typing" id="typing-indicator" style="display: none;">
                <span>Emma is thinking...</span>
            </div>
        `;
        this.initUI();
    }

    /**
     * Initializes UI elements and attaches event listeners.
     */
    initUI() {
        this.messageContainer = document.getElementById('chat-messages');
        this.inputField = document.getElementById('chat-input');
        this.sendButton = document.getElementById('send-btn');
        this.voiceButton = document.getElementById('voice-input-btn');

        this.sendButton.addEventListener('click', () => this.chatExperience.sendMessage());
        this.inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.chatExperience.sendMessage();
            }
        });
    }

    /**
     * Adds a message to the chat display.
     */
    addMessage(content, sender, options = {}) {
        const messageId = `msg-${Date.now()}`;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.id = messageId;

        const messageContent = options.isHtml ? content : `<p>${this.formatMessageContent(content)}</p>`;

        messageDiv.innerHTML = `
            <div class="message-content">
                ${messageContent}
            </div>
        `;

        this.messageContainer.appendChild(messageDiv);
        this.scrollToBottom();
        return messageId;
    }

    /**
     * Formats message content for display.
     */
    formatMessageContent(content) {
        return content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    /**
     * Scrolls the message container to the bottom.
     */
    scrollToBottom() {
        this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
    }

    /**
     * Shows or hides the typing indicator.
     */
    setTypingIndicator(isTyping) {
        const indicator = document.getElementById('typing-indicator');
        indicator.style.display = isTyping ? 'flex' : 'none';
    }

    /**
     * Clears the input field.
     */
    clearInputField() {
        this.inputField.value = '';
    }

    /**
     * Gets the current value of the input field.
     */
    getInputField() {
        return this.inputField.value;
    }
}
