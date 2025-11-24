/**
 * Emma Webapp-Extension Communication Bridge
 * Handles clean messaging between webapp and extension
 * 
 * WEBAPP-FIRST ARCHITECTURE: Webapp is single source of truth for vault operations
 */

class EmmaWebappExtensionBridge {
  constructor() {
    this.pendingMessages = new Map();
    this.setupListeners();
    console.log('🌉 Emma Webapp-Extension Bridge initialized');
  }

  setupListeners() {
    // Listen for messages from extension
    window.addEventListener('message', (event) => {
      // Only accept messages from same origin for safety
      if (event.origin !== window.location.origin) return;
      if (event.data?.source === 'emma-extension') {
        this.handleExtensionMessage(event.data);
      }
    });
  }

  async handleExtensionMessage(message) {
    const { type, data, messageId } = message;
    
    try {
      let response = { success: false, error: 'Unknown action' };
      
      switch (type) {
        case 'EMMA_SAVE_MEMORY':
          response = await this.saveMemoryToVault(data);
          break;
          
        case 'EMMA_GET_VAULT_STATUS':
          response = await this.getVaultStatus();
          break;
          
        case 'EMMA_LIST_MEMORIES':
          response = await this.listMemories(data);
          break;
          
        default:
          console.warn('🌉 Unknown message type from extension:', type);
      }
      
      // Send response back to extension
      this.sendResponse(messageId, response);
      
    } catch (error) {
      console.error('🌉 Error handling extension message:', error);
      this.sendResponse(messageId, {
        success: false,
        error: error.message
      });
    }
  }

  async saveMemoryToVault(memoryData) {
    try {
      console.log('🌉 Bridge: Saving memory to webapp vault');
      
      // Check if webapp vault is available and unlocked
      if (!window.emmaWebVault) {
        throw new Error('Webapp vault not available');
      }
      
      if (!window.emmaWebVault.isOpen) {
        throw new Error('Webapp vault is locked. Please unlock your vault first.');
      }
      
      // Save memory using webapp vault
      const result = await window.emmaWebVault.addMemory({
        content: memoryData.content,
        metadata: memoryData.metadata,
        attachments: memoryData.attachments || []
      });
      
      if (result.success) {
        console.log('✅ Bridge: Memory saved successfully via webapp vault');
        return {
          success: true,
          memoryId: result.memory.id,
          memory: result.memory
        };
      } else {
        throw new Error('Webapp vault save failed');
      }
      
    } catch (error) {
      console.error('❌ Bridge: Failed to save memory to webapp vault:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getVaultStatus() {
    try {
      if (!window.emmaWebVault) {
        return {
          success: true,
          isOpen: false,
          isAvailable: false
        };
      }
      
      return {
        success: true,
        isOpen: window.emmaWebVault.isOpen,
        isAvailable: true,
        stats: window.emmaWebVault.getStats()
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async listMemories(options = {}) {
    try {
      if (!window.emmaWebVault || !window.emmaWebVault.isOpen) {
        return {
          success: false,
          error: 'Vault not available or locked'
        };
      }
      
      const memories = await window.emmaWebVault.listMemories(
        options.limit || 50,
        options.offset || 0
      );
      
      return {
        success: true,
        memories: memories
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  sendResponse(messageId, response) {
    window.postMessage({
      type: 'EMMA_RESPONSE',
      messageId: messageId,
      ...response
    }, window.location.origin);
  }
}

// Initialize bridge when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.emmaWebappExtensionBridge = new EmmaWebappExtensionBridge();
  });
} else {
  window.emmaWebappExtensionBridge = new EmmaWebappExtensionBridge();
}

console.log('🌉 Emma Webapp-Extension Bridge script loaded');
