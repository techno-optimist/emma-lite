// lib/database.js - IndexedDB wrapper for memory storage
export class MemoryDatabase {
  constructor() {
    this.dbName = 'EmmaLiteDB';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create memories store
        if (!db.objectStoreNames.contains('memories')) {
          const memoryStore = db.createObjectStore('memories', { 
            keyPath: 'id', 
            autoIncrement: true 
          });

          // Indexes for efficient querying
          memoryStore.createIndex('timestamp', 'timestamp', { unique: false });
          memoryStore.createIndex('source', 'source', { unique: false });
          memoryStore.createIndex('type', 'type', { unique: false });
          memoryStore.createIndex('searchText', 'searchText', { unique: false });
        }

        // Create embeddings store for vector search
        if (!db.objectStoreNames.contains('embeddings')) {
          const embeddingStore = db.createObjectStore('embeddings', { 
            keyPath: 'memoryId' 
          });
          embeddingStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Create analytics store
        if (!db.objectStoreNames.contains('analytics')) {
          const analyticsStore = db.createObjectStore('analytics', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          analyticsStore.createIndex('event', 'event', { unique: false });
          analyticsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async addMemory(memory) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction(['memories'], 'readwrite');
    const store = transaction.objectStore('memories');
    
    const memoryData = {
      ...memory,
      timestamp: Date.now(),
      searchText: this.createSearchText(memory)
    };

    return new Promise((resolve, reject) => {
      const request = store.add(memoryData);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getMemory(id) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction(['memories'], 'readonly');
    const store = transaction.objectStore('memories');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllMemories(limit = 100, offset = 0) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction(['memories'], 'readonly');
    const store = transaction.objectStore('memories');
    const index = store.index('timestamp');

    return new Promise((resolve, reject) => {
      const memories = [];
      let count = 0;
      let skipped = 0;

      const request = index.openCursor(null, 'prev'); // Sort by timestamp desc

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        
        if (cursor && count < limit) {
          if (skipped >= offset) {
            memories.push(cursor.value);
            count++;
          } else {
            skipped++;
          }
          cursor.continue();
        } else {
          resolve(memories);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async searchMemories(query, limit = 20) {
    if (!this.db) await this.init();
    
    const queryLower = query.toLowerCase();
    const queryTokens = this.tokenize(queryLower);
    const allMemories = await this.getAllMemories(1000); // Get more for searching
    
    // Score and rank memories
    const scoredMemories = allMemories.map(memory => {
      const score = this.calculateRelevance(memory, queryTokens);
      return { ...memory, score };
    });

    // Sort by score and return top results
    return scoredMemories
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  calculateRelevance(memory, queryTokens) {
    const memoryText = this.createSearchText(memory).toLowerCase();
    const memoryTokens = this.tokenize(memoryText);
    
    let score = 0;
    const tokenSet = new Set(memoryTokens);
    
    // Token overlap scoring
    for (const qToken of queryTokens) {
      if (tokenSet.has(qToken)) {
        score += 1;
      }
      
      // Partial matches
      for (const mToken of memoryTokens) {
        if (mToken.includes(qToken) || qToken.includes(mToken)) {
          score += 0.5;
        }
      }
    }

    // Boost recent memories slightly
    const ageInDays = (Date.now() - memory.timestamp) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0, 1 - (ageInDays / 30)); // Decay over 30 days
    score += recencyBoost * 0.2;

    // Boost by type
    if (memory.type === 'user') score *= 1.2;
    
    return score;
  }

  tokenize(text) {
    return text
      .split(/[\s\W]+/)
      .filter(token => token.length > 2)
      .map(token => token.toLowerCase());
  }

  createSearchText(memory) {
    const parts = [
      memory.content || '',
      memory.role || '',
      memory.source || '',
      memory.metadata?.topic || '',
      memory.metadata?.summary || ''
    ];
    
    return parts.filter(Boolean).join(' ');
  }

  async deleteMemory(id) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction(['memories'], 'readwrite');
    const store = transaction.objectStore('memories');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllMemories() {
    if (!this.db) await this.init();

    const transaction = this.db.transaction(['memories'], 'readwrite');
    const store = transaction.objectStore('memories');

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getStats() {
    if (!this.db) await this.init();

    const transaction = this.db.transaction(['memories'], 'readonly');
    const store = transaction.objectStore('memories');

    return new Promise((resolve, reject) => {
      const countRequest = store.count();
      
      countRequest.onsuccess = () => {
        const count = countRequest.result;
        
        // Get size estimate
        if (navigator.storage && navigator.storage.estimate) {
          navigator.storage.estimate().then(estimate => {
            resolve({
              totalMemories: count,
              storageUsed: estimate.usage || 0,
              storageQuota: estimate.quota || 0
            });
          });
        } else {
          resolve({
            totalMemories: count,
            storageUsed: 0,
            storageQuota: 0
          });
        }
      };

      countRequest.onerror = () => reject(countRequest.error);
    });
  }

  async exportData() {
    if (!this.db) await this.init();

    const memories = await this.getAllMemories(10000); // Get all
    const settings = await this.getAllSettings();
    
    return {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      memories,
      settings,
      stats: await this.getStats()
    };
  }

  async importData(data) {
    if (!this.db) await this.init();

    // Validate data format
    if (!data.version || !data.memories) {
      throw new Error('Invalid import data format');
    }

    // Clear existing data (optional)
    if (data.clearExisting) {
      await this.clearAllMemories();
    }

    // Import memories
    const imported = [];
    for (const memory of data.memories) {
      try {
        const id = await this.addMemory(memory);
        imported.push(id);
      } catch (err) {
        console.error('Failed to import memory:', err);
      }
    }

    return {
      imported: imported.length,
      failed: data.memories.length - imported.length
    };
  }

  async getSetting(key, defaultValue = null) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');

    return new Promise((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : defaultValue);
      };
      request.onerror = () => resolve(defaultValue);
    });
  }

  async setSetting(key, value) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');

    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllSettings() {
    if (!this.db) await this.init();

    const transaction = this.db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const settings = {};
        request.result.forEach(item => {
          settings[item.key] = item.value;
        });
        resolve(settings);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async trackEvent(event, data = {}) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction(['analytics'], 'readwrite');
    const store = transaction.objectStore('analytics');

    const eventData = {
      event,
      data,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(eventData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Export singleton instance
export const memoryDB = new MemoryDatabase();