// lib/database-mtap.js - Enhanced database with MTAP support
import { mtapAdapter } from './mtap-adapter.js';

export class MemoryDatabaseMTAP {
  constructor() {
    this.dbName = 'EmmaLiteDB';
    this.version = 2; // Increment version for MTAP support
    this.db = null;
    this.useMTAP = true; // Always use MTAP mode
    this.initPromise = null;
  }

  init() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      // Force MTAP mode - no more simple mode
      this.useMTAP = true;
      // Persist mode flag where available (service worker has no localStorage)
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('emma_use_mtap', 'true');
        } else if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ emma_use_mtap: 'true' });
        }
      } catch (_) {}
      
      console.log('🔧 Database init - MTAP mode: FORCED ON (simple mode removed)');
      
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        this.initPromise = null; // Reset promise on error
        reject(request.error);
      };

      request.onsuccess = async () => {
        this.db = request.result;
        
        try {
          // Migrate any existing simple memories to MTAP format
          await this.migrateSimpleToMTAP();
          resolve(this.db);
        } catch (migrationError) {
          console.error('Migration failed:', migrationError);
          this.initPromise = null; // Reset promise on error
          reject(migrationError);
        }
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Original memories store
        if (!db.objectStoreNames.contains('memories')) {
          const memoryStore = db.createObjectStore('memories', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          memoryStore.createIndex('timestamp', 'timestamp', { unique: false });
          memoryStore.createIndex('source', 'source', { unique: false });
          memoryStore.createIndex('type', 'type', { unique: false });
          memoryStore.createIndex('searchText', 'searchText', { unique: false });
        }

        // MTAP memories store (for protocol-compliant storage)
        if (!db.objectStoreNames.contains('mtap_memories')) {
          const mtapStore = db.createObjectStore('mtap_memories', { 
            keyPath: 'header.id' 
          });
          mtapStore.createIndex('created', 'header.created', { unique: false });
          mtapStore.createIndex('creator', 'header.creator', { unique: false });
          mtapStore.createIndex('contentHash', 'header.contentHash', { unique: false });
          mtapStore.createIndex('mtapAddress', '_mtapAddress', { unique: true });
        }

        // MTAP index for fast lookups
        if (!db.objectStoreNames.contains('mtap_index')) {
          const indexStore = db.createObjectStore('mtap_index', { 
            keyPath: 'address' 
          });
          indexStore.createIndex('memoryId', 'memoryId', { unique: false });
          indexStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Keep other stores
        if (!db.objectStoreNames.contains('embeddings')) {
          const embeddingStore = db.createObjectStore('embeddings', { 
            keyPath: 'memoryId' 
          });
          embeddingStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('analytics')) {
          const analyticsStore = db.createObjectStore('analytics', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          analyticsStore.createIndex('event', 'event', { unique: false });
          analyticsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Media attachments store (blob storage + metadata)
        if (!db.objectStoreNames.contains('attachments')) {
          const att = db.createObjectStore('attachments', { keyPath: 'id' });
          att.createIndex('hash', 'hash', { unique: true });
          att.createIndex('capsuleId', 'capsuleId', { unique: false });
          att.createIndex('created', 'capturedAt', { unique: false });
        }
      };
    });
  }

  async addMemory(memory) {
    if (!this.db) await this.init();

    // Always use MTAP mode - simple mode removed
    return this.addMTAPMemory(memory);
  }

  async addSimpleMemory(memory) {
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

  async addMTAPMemory(simpleMemory) {
    // Convert to MTAP format
    const mtapMemory = await mtapAdapter.createMemory(
      simpleMemory.content,
      {
        source: simpleMemory.source,
        role: simpleMemory.role,
        type: simpleMemory.type,
        url: simpleMemory.url,
        ...simpleMemory.metadata
      }
    );

    // Store with MTAP protocol
    const stored = await mtapAdapter.store(mtapMemory);

    const transaction = this.db.transaction(['mtap_memories', 'mtap_index'], 'readwrite');
    const mtapStore = transaction.objectStore('mtap_memories');
    const indexStore = transaction.objectStore('mtap_index');

    return new Promise((resolve, reject) => {
      // Store MTAP memory
      const mtapRequest = mtapStore.add(stored);
      
      mtapRequest.onsuccess = () => {
        // Store index entry
        const indexEntry = {
          address: stored._mtapAddress,
          memoryId: stored.header.id,
          timestamp: Date.now(),
          keywords: stored.semantic.keywords
        };
        
        const indexRequest = indexStore.add(indexEntry);
        
        indexRequest.onsuccess = () => {
          console.log(`MTAP Memory stored: ${stored._mtapAddress}`);
          resolve(stored.header.id);
        };
        
        indexRequest.onerror = () => reject(indexRequest.error);
      };
      
      mtapRequest.onerror = () => reject(mtapRequest.error);
    });
  }

  async getAllMemories(limit = 100, offset = 0) {
    // Best-effort init + retry for resilience across SW restarts
    if (!this.db) await this.init();
    try {
      // Always use MTAP mode - simple mode removed
      return await this.getAllMTAPMemories(limit, offset);
    } catch (e) {
      console.warn('getAllMemories first attempt failed, retrying after re-init:', e);
      // Re-init and try once more
      this.initPromise = null;
      await this.init();
      return this.getAllMTAPMemories(limit, offset);
    }
  }

  async getAllSimpleMemories(limit, offset) {
    const transaction = this.db.transaction(['memories'], 'readonly');
    const store = transaction.objectStore('memories');
    const index = store.index('timestamp');

    return new Promise((resolve, reject) => {
      const memories = [];
      let count = 0;
      let skipped = 0;

      const request = index.openCursor(null, 'prev');

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

  async getAllMTAPMemories(limit, offset) {
    const transaction = this.db.transaction(['mtap_memories'], 'readonly');
    const store = transaction.objectStore('mtap_memories');
    const index = store.index('created');

    return new Promise((resolve, reject) => {
      const memories = [];
      let count = 0;
      let skipped = 0;

      const request = index.openCursor(null, 'prev');

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        
        if (cursor && count < limit) {
          if (skipped >= offset) {
            // Convert MTAP memory to simple format for UI
            const mtapMemory = cursor.value;
            const simpleMemory = {
              id: mtapMemory.header.id,
              content: mtapMemory.core.content,
              role: mtapMemory.metadata.role || 'user',
              source: mtapMemory.metadata.source || 'unknown',
              timestamp: new Date(mtapMemory.header.created).getTime(),
              metadata: mtapMemory.metadata,
              _mtapAddress: mtapMemory._mtapAddress
            };
            memories.push(simpleMemory);
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

  async getMTAPMemoryById(id) {
    if (!this.db) await this.init();
    const transaction = this.db.transaction(['mtap_memories'], 'readonly');
    const store = transaction.objectStore('mtap_memories');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

    async searchMemories(query, limit = 20) {
    if (!this.db) await this.init();

    // Always use MTAP mode - simple mode removed
    return this.searchMTAPMemories(query, limit);
  }

  async searchSimpleMemories(query, limit) {
    const queryLower = query.toLowerCase();
    const queryTokens = this.tokenize(queryLower);
    const allMemories = await this.getAllSimpleMemories(1000);
    
    const scoredMemories = allMemories.map(memory => {
      const score = this.calculateRelevance(memory, queryTokens);
      return { ...memory, score };
    });

    return scoredMemories
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async searchMTAPMemories(query, limit) {
    const queryLower = query.toLowerCase();
    const queryTokens = this.tokenize(queryLower);
    
    const transaction = this.db.transaction(['mtap_memories'], 'readonly');
    const store = transaction.objectStore('mtap_memories');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        const mtapMemories = request.result;
        
        // Score and rank MTAP memories
        const scoredMemories = mtapMemories.map(mtapMemory => {
          // Calculate relevance using MTAP semantic data
          let score = 0;
          
          // Check keywords
          const keywords = mtapMemory.semantic.keywords || [];
          queryTokens.forEach(token => {
            if (keywords.includes(token)) score += 2;
          });
          
          // Check content
          const content = (mtapMemory.core.content || '').toLowerCase();
          queryTokens.forEach(token => {
            if (content.includes(token)) score += 1;
          });
          
          // Check summary
          const summary = (mtapMemory.semantic.summary || '').toLowerCase();
          queryTokens.forEach(token => {
            if (summary.includes(token)) score += 0.5;
          });
          
          // Convert to simple format for UI
          const simpleMemory = {
            id: mtapMemory.header.id,
            content: mtapMemory.core.content,
            role: mtapMemory.metadata.role || 'user',
            source: mtapMemory.metadata.source || 'unknown',
            timestamp: new Date(mtapMemory.header.created).getTime(),
            metadata: mtapMemory.metadata,
            _mtapAddress: mtapMemory._mtapAddress,
            score
          };
          
          return simpleMemory;
        });
        
        const results = scoredMemories
          .filter(m => m.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
        
        resolve(results);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  calculateRelevance(memory, queryTokens) {
    const memoryText = this.createSearchText(memory).toLowerCase();
    const memoryTokens = this.tokenize(memoryText);
    
    let score = 0;
    const tokenSet = new Set(memoryTokens);
    
    for (const qToken of queryTokens) {
      if (tokenSet.has(qToken)) {
        score += 1;
      }
      
      for (const mToken of memoryTokens) {
        if (mToken.includes(qToken) || qToken.includes(mToken)) {
          score += 0.5;
        }
      }
    }

    const ageInDays = (Date.now() - memory.timestamp) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0, 1 - (ageInDays / 30));
    score += recencyBoost * 0.2;

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

  async exportData() {
    if (!this.db) await this.init();

    // Always use MTAP mode - simple mode removed
    return this.exportMTAPData();
  }

  async exportSimpleData() {
    const memories = await this.getAllSimpleMemories(10000);
    const settings = await this.getAllSettings();
    
    return {
      version: '1.0.0',
      format: 'simple',
      exportDate: new Date().toISOString(),
      memories,
      settings,
      stats: await this.getStats()
    };
  }

  async exportMTAPData() {
    const transaction = this.db.transaction(['mtap_memories'], 'readonly');
    const store = transaction.objectStore('mtap_memories');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = async () => {
        const mtapMemories = request.result;
        const settings = await this.getAllSettings();
        
        // Export in MTAP format
        const exportData = await mtapAdapter.exportMTAPFormat(mtapMemories);
        exportData.settings = settings;
        exportData.stats = await this.getStats();
        
        resolve(exportData);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async importData(data) {
    if (!this.db) await this.init();

    // Always use MTAP mode - auto-convert simple data to MTAP
    if (data.protocol === 'MTAP') {
      return this.importMTAPData(data);
    } else {
      // Convert simple data to MTAP format before importing
      const mtapData = this.convertSimpleToMTAPFormat(data);
      return this.importMTAPData(mtapData);
    }
  }

  async importSimpleData(data) {
    if (!data.memories) {
      throw new Error('Invalid import data format');
    }

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

  async importMTAPData(data) {
    const memories = await mtapAdapter.importMTAPFormat(data);
    
    const transaction = this.db.transaction(['mtap_memories', 'mtap_index'], 'readwrite');
    const mtapStore = transaction.objectStore('mtap_memories');
    const indexStore = transaction.objectStore('mtap_index');
    
    let imported = 0;
    
    for (const memory of memories) {
      try {
        await new Promise((resolve, reject) => {
          const request = mtapStore.add(memory);
          request.onsuccess = () => {
            imported++;
            resolve();
          };
          request.onerror = () => reject(request.error);
        });
      } catch (err) {
        console.error('Failed to import MTAP memory:', err);
      }
    }
    
    return {
      imported,
      failed: memories.length - imported
    };
  }

  // MTAP mode is always enabled - toggle function kept for compatibility
  async toggleMTAPMode(enabled) {
    // Force MTAP mode regardless of input
    this.useMTAP = true;
    localStorage.setItem('emma_use_mtap', 'true');
    await this.setSetting('useMTAP', true);
    
    console.log('🔧 MTAP mode is always enabled (simple mode removed)');
  }

  // Get current mode
  getMTAPMode() {
    return true; // Always MTAP mode
  }

  // Convert simple format data to MTAP format
  convertSimpleToMTAPFormat(simpleData) {
    if (!simpleData.memories) {
      throw new Error('Invalid simple data format');
    }

    const mtapMemories = simpleData.memories.map(memory => {
      return {
        header: {
          id: memory.id || Date.now() + Math.random(),
          created: memory.timestamp || Date.now(),
          creator: 'emma-lite-extension',
          contentHash: this.generateContentHash(memory.content || ''),
          version: '1.0'
        },
        content: {
          text: memory.content || '',
          role: memory.role || 'user',
          source: memory.source || 'unknown',
          type: memory.type || 'conversation'
        },
        metadata: memory.metadata || {},
        _mtapAddress: `mtap://emma/${memory.id || Date.now()}`
      };
    });

    return {
      protocol: 'MTAP',
      version: '1.0',
      created: Date.now(),
      memories: mtapMemories,
      settings: simpleData.settings || {}
    };
  }

  generateContentHash(content) {
    // Simple hash function for content
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Migrate existing simple memories to MTAP format
  async migrateSimpleToMTAP() {
    try {
      // Check if simple memories store exists and has data
      if (!this.db.objectStoreNames.contains('memories')) {
        console.log('🔧 No simple memories store found - migration not needed');
        return;
      }

      const simpleMemories = await this.getAllSimpleMemories(10000);
      
      if (simpleMemories.length === 0) {
        console.log('🔧 No simple memories found - migration not needed');
        return;
      }

      console.log(`🔧 Migrating ${simpleMemories.length} simple memories to MTAP format...`);

      // Convert and save each memory to MTAP format
      let migrated = 0;
      for (const simpleMemory of simpleMemories) {
        try {
          await this.addMTAPMemory(simpleMemory);
          migrated++;
        } catch (error) {
          console.error('🔧 Failed to migrate memory:', simpleMemory.id, error);
        }
      }

      console.log(`🔧 Migration completed: ${migrated}/${simpleMemories.length} memories migrated`);

      // Clear the simple memories store after successful migration
      if (migrated > 0) {
        const transaction = this.db.transaction(['memories'], 'readwrite');
        const store = transaction.objectStore('memories');
        await new Promise((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
        console.log('🔧 Simple memories store cleared after migration');
      }

    } catch (error) {
      console.error('🔧 Migration failed:', error);
    }
  }

  // Other methods remain the same...
  async deleteMemory(id) {
    if (!this.db) await this.init();

    // Always use MTAP mode - simple mode removed
    const storeName = 'mtap_memories';
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllMemories() {
    if (!this.db) await this.init();

    // Backup before wipe (best-effort)
    try {
      const backup = await this.exportMTAPData();
      const backupEnvelope = {
        createdAt: Date.now(),
        kind: 'emma_backup_before_clear',
        backup
      };
      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          await chrome.storage.local.set({ emma_last_backup: backupEnvelope });
        } else if (typeof localStorage !== 'undefined') {
          localStorage.setItem('emma_last_backup', JSON.stringify(backupEnvelope));
        }
      } catch (_) {}
    } catch (e) {
      console.warn('Backup before clear failed (continuing with clear):', e);
    }

    // Always use MTAP mode - simple mode removed
    const storeNames = ['mtap_memories', 'mtap_index', 'attachments'];

    const transaction = this.db.transaction(storeNames, 'readwrite');

    const promises = storeNames.map(storeName => {
      return new Promise((resolve, reject) => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    return Promise.all(promises);
  }

  // Lightweight integrity sanity check for diagnostics
  async integrityCheck() {
    try {
      const stats = await this.getStats();
      const all = await this.getAllMemories(Math.max(100, stats.totalMemories || 100), 0);
      return {
        ok: true,
        counts: {
          statsTotal: stats.totalMemories || 0,
          listed: all.length
        }
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // --- Attachments API ---
  async addAttachment(attachmentMeta, blob) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['attachments'], 'readwrite');
      const store = tx.objectStore('attachments');
      const record = { ...attachmentMeta, blob };
      const req = store.put(record);
      req.onsuccess = () => resolve(attachmentMeta.id);
      req.onerror = () => reject(req.error);
    });
  }

  async listAttachments(capsuleId) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['attachments'], 'readonly');
      const store = tx.objectStore('attachments');
      const idx = store.index('capsuleId');
      const results = [];
      const req = idx.openCursor(IDBKeyRange.only(capsuleId), 'prev');
      req.onsuccess = (e) => {
        const cur = e.target.result;
        if (cur) { results.push(cur.value); cur.continue(); } else { resolve(results); }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getAttachment(id) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['attachments'], 'readonly');
      const store = tx.objectStore('attachments');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteAttachment(id) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['attachments'], 'readwrite');
      const store = tx.objectStore('attachments');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async updateAttachment(id, updates) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['attachments'], 'readwrite');
      const store = tx.objectStore('attachments');
      
      // First get the existing attachment
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (!existing) {
          reject(new Error('Attachment not found'));
          return;
        }
        
        // Merge updates (excluding blob changes for now)
        const updated = { ...existing, ...updates };
        
        // Store the updated record
        const putReq = store.put(updated);
        putReq.onsuccess = () => resolve(true);
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async getStats() {
    if (!this.db) {
      // Guard against init failures to avoid null transaction errors
      try { await this.init(); } catch (e) { return { totalMemories: 0, storageUsed: 0, storageQuota: 0, mtapMode: true }; }
    }

    // Always use MTAP mode - simple mode removed
    const storeName = 'mtap_memories';
    if (!this.db) {
      return { totalMemories: 0, storageUsed: 0, storageQuota: 0, mtapMode: true };
    }
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const countRequest = store.count();
      
      countRequest.onsuccess = () => {
        const count = countRequest.result;
        
        if (navigator.storage && navigator.storage.estimate) {
          navigator.storage.estimate().then(estimate => {
            resolve({
              totalMemories: count,
              storageUsed: estimate.usage || 0,
              storageQuota: estimate.quota || 0,
              mtapMode: true // Always MTAP mode
            });
          });
        } else {
          resolve({
            totalMemories: count,
            storageUsed: 0,
            storageQuota: 0,
            mtapMode: true // Always MTAP mode
          });
        }
      };

      countRequest.onerror = () => reject(countRequest.error);
    });
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
        settings.mtapMode = this.useMTAP; // Include current mode
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
      timestamp: Date.now(),
      mtapMode: this.useMTAP
    };

    return new Promise((resolve, reject) => {
      const request = store.add(eventData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Export enhanced database with MTAP support
export const memoryDB = new MemoryDatabaseMTAP();