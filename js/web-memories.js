// 🧠 Emma Web Memories - Simple Web App Version
// Designed specifically for the web vault system

console.log('💝 Emma Web Memories: Loading...');

// Simple memory management for web app
class WebMemories {
  constructor() {
    this.memories = [];
    this.isLoading = false;
  }

  async loadMemories() {
    console.log('💝 WebMemories: Loading memories from web vault...');
    
    try {
      // Check if we have an active web vault
      if (window.emmaWebVault && sessionStorage.getItem('emmaVaultActive') === 'true') {
        // Load memories from IndexedDB via our web vault
        const vaultData = await window.emmaWebVault.loadFromIndexedDB();
        if (vaultData && vaultData.memories) {
          this.memories = vaultData.memories;
          console.log(`💝 WebMemories: Loaded ${this.memories.length} memories`);
          return this.memories;
        }
      }
      
      // No memories or vault not active
      console.log('💝 WebMemories: No memories found or vault not active');
      return [];
      
    } catch (error) {
      console.error('💝 WebMemories: Error loading memories:', error);
      return [];
    }
  }

  async saveMemory(memory) {
    console.log('💝 WebMemories: Saving memory:', memory.title);
    
    try {
      // Add to local array
      this.memories.push(memory);
      
      // Save to web vault if available
      if (window.emmaWebVault) {
        const vaultData = await window.emmaWebVault.loadFromIndexedDB() || {};
        vaultData.memories = this.memories;
        await window.emmaWebVault.saveToIndexedDB(vaultData);
        console.log('💝 WebMemories: Memory saved to vault');
      }
      
      return { success: true };
    } catch (error) {
      console.error('💝 WebMemories: Error saving memory:', error);
      return { success: false, error: error.message };
    }
  }

  getStats() {
    return {
      total: this.memories.length,
      today: this.memories.filter(m => {
        const today = new Date().toDateString();
        return new Date(m.timestamp).toDateString() === today;
      }).length
    };
  }
}

// Initialize web memories
window.webMemories = new WebMemories();

// Load memories when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.webMemories.loadMemories();
  });
} else {
  window.webMemories.loadMemories();
}

console.log('💝 Emma Web Memories: Ready!');





