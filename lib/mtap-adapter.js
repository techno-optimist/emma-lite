// lib/mtap-adapter.js - MTAP Protocol Implementation for Emma Lite
// This adds MTAP compliance to the extension

/**
 * MTAP (Memory Transfer & Access Protocol) v1.0 Lite Implementation
 * Provides protocol-compliant memory storage with future federation support
 */

export class MTAPAdapter {
  constructor() {
    this.version = '1.0.0';
    this.nodeId = this.generateNodeId();
  }

  /**
   * Create MTAP-compliant memory structure
   */
  async createMemory(content, metadata = {}) {
    const memory = {
      // MTAP Header (immutable)
      header: {
        id: this.generateMemoryId(),
        version: this.version,
        created: new Date().toISOString(),
        creator: await this.getDID(),
        signature: null, // Will be set after signing
        protocol: 'MTAP/1.0'
      },
      
      // MTAP Core Content
      core: {
        type: this.detectMemoryType(content),
        content: content,
        encoding: 'UTF-8',
        encrypted: false,
        compression: null
      },
      
      // MTAP Semantic Layer
      semantic: {
        summary: this.generateSummary(content),
        keywords: this.extractKeywords(content),
        entities: this.extractEntities(content),
        emotions: metadata.emotions || [],
        embeddings: null // Would be vector embeddings in full implementation
      },
      
      // MTAP Relations
      relations: {
        previous: metadata.previousId || null,
        next: null,
        related: [],
        references: metadata.references || []
      },
      
      // MTAP Permissions
      permissions: {
        owner: await this.getDID(),
        public: false,
        shared: [],
        agents: this.getDefaultAgentPermissions()
      },
      
      // MTAP Metadata
      metadata: {
        source: metadata.source || 'unknown',
        application: 'emma-lite',
        deviceId: this.nodeId,
        ...metadata
      }
    };
    
    // Generate content hash for addressing
    memory.header.contentHash = await this.generateContentHash(memory.core);
    
    // Sign the memory
    memory.header.signature = await this.signMemory(memory);
    
    return memory;
  }

  /**
   * Store memory with MTAP compliance
   */
  async store(memory) {
    // Validate MTAP structure
    if (!this.validateMTAPStructure(memory)) {
      throw new Error('Invalid MTAP memory structure');
    }
    
    // Generate content address
    const address = this.generateContentAddress(memory);
    
    // Store with address
    const stored = {
      ...memory,
      _mtapAddress: address,
      _mtapStored: Date.now()
    };
    
    return stored;
  }

  /**
   * Retrieve memory by MTAP address
   */
  async retrieve(address) {
    // In full MTAP, this would query federation network
    // For now, retrieve from local storage
    return this.localRetrieve(address);
  }

  /**
   * Generate DID (Decentralized Identifier)
   */
  async getDID() {
    // Simple DID for Emma Lite; tolerate service worker context
    let did = null;
    try {
      if (typeof localStorage !== 'undefined') {
        did = localStorage.getItem('emma_did');
      }
    } catch (_) {}
    if (!did && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const res = await chrome.storage.local.get(['emma_did']);
        did = res.emma_did || null;
      } catch (_) {}
    }
    if (!did) {
      did = `did:emma:${this.generateRandomId()}`;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('emma_did', did);
        } else if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          await chrome.storage.local.set({ emma_did: did });
        }
      } catch (_) {}
    }
    return did;
  }

  /**
   * Generate unique memory ID
   */
  generateMemoryId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `mem_${timestamp}_${random}`;
  }

  /**
   * Generate node ID for this instance
   */
  generateNodeId() {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate content hash for content addressing
   */
  async generateContentHash(content) {
    const text = JSON.stringify(content);
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate content address (MTAP URL)
   */
  generateContentAddress(memory) {
    const hash = memory.header.contentHash;
    return `mtap://memory/${hash}`;
  }

  /**
   * Sign memory for authenticity
   */
  async signMemory(memory) {
    // Simplified signing for Emma Lite
    // Full implementation would use proper cryptographic signing
    const content = JSON.stringify({
      header: memory.header,
      core: memory.core
    });
    
    return await this.generateContentHash(content);
  }

  /**
   * Validate MTAP structure
   */
  validateMTAPStructure(memory) {
    const requiredFields = [
      'header',
      'header.id',
      'header.version',
      'header.created',
      'header.creator',
      'core',
      'core.content',
      'semantic',
      'relations',
      'permissions'
    ];
    
    for (const field of requiredFields) {
      if (!this.getNestedProperty(memory, field)) {
        console.error(`Missing required MTAP field: ${field}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get nested property safely
   */
  getNestedProperty(obj, path) {
    return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
  }

  /**
   * Detect memory type from content
   */
  detectMemoryType(content) {
    if (typeof content === 'string') return 'text';
    if (content.image) return 'image';
    if (content.video) return 'video';
    if (content.audio) return 'audio';
    return 'composite';
  }

  /**
   * Generate summary (simplified)
   */
  generateSummary(content) {
    if (typeof content !== 'string') return '';
    
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.slice(0, 2).join(' ').substring(0, 200);
  }

  /**
   * Extract keywords (simplified)
   */
  extractKeywords(content) {
    if (typeof content !== 'string') return [];
    
    const words = content.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 4);
    
    // Simple frequency-based keywords
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Extract entities (simplified)
   */
  extractEntities(content) {
    if (typeof content !== 'string') return [];
    
    const entities = [];
    
    // Simple pattern matching for common entities
    // Full implementation would use NER (Named Entity Recognition)
    
    // URLs
    const urls = content.match(/https?:\/\/[^\s]+/g) || [];
    urls.forEach(url => entities.push({ type: 'url', value: url }));
    
    // Emails
    const emails = content.match(/[\w.-]+@[\w.-]+\.\w+/g) || [];
    emails.forEach(email => entities.push({ type: 'email', value: email }));
    
    // Dates (simple pattern)
    const dates = content.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g) || [];
    dates.forEach(date => entities.push({ type: 'date', value: date }));
    
    return entities;
  }

  /**
   * Get default agent permissions
   */
  getDefaultAgentPermissions() {
    return [
      {
        agentId: 'chatgpt',
        permissions: ['read'],
        granted: Date.now(),
        expiry: null
      },
      {
        agentId: 'claude',
        permissions: ['read'],
        granted: Date.now(),
        expiry: null
      }
    ];
  }

  /**
   * Local retrieve (placeholder for federation)
   */
  async localRetrieve(address) {
    // In full MTAP, this would:
    // 1. Check local storage
    // 2. Query federation network
    // 3. Verify content integrity
    // For now, just return from local
    
    return null; // Implement with actual storage
  }

  /**
   * Generate random ID
   */
  generateRandomId() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Export memory in MTAP format
   */
  async exportMTAPFormat(memories) {
    return {
      version: '1.0.0',
      protocol: 'MTAP',
      exported: new Date().toISOString(),
      node: this.nodeId,
      did: await this.getDID(),
      memories: await Promise.all(memories.map(m => this.toMTAPFormat(m))),
      signature: null // Would be signed in full implementation
    };
  }

  /**
   * Import memories from MTAP format
   */
  async importMTAPFormat(data) {
    if (data.protocol !== 'MTAP') {
      throw new Error('Not an MTAP export file');
    }
    
    const imported = [];
    for (const memory of data.memories) {
      if (this.validateMTAPStructure(memory)) {
        imported.push(memory);
      }
    }
    
    return imported;
  }

  /**
   * Convert simple memory to MTAP format
   */
  async toMTAPFormat(simpleMemory) {
    return await this.createMemory(
      simpleMemory.content,
      {
        source: simpleMemory.source,
        role: simpleMemory.role,
        timestamp: simpleMemory.timestamp,
        ...simpleMemory.metadata
      }
    );
  }
}

// Federation stub (for future implementation)
export class MTAPFederation {
  constructor() {
    this.nodes = new Map();
    this.dht = null; // Distributed Hash Table for P2P
  }

  /**
   * Join federation network
   */
  async join() {
    // Future: Connect to P2P network
    // Future: Announce presence
    // Future: Sync with peers
    console.log('MTAP Federation: Currently in standalone mode');
  }

  /**
   * Discover other nodes
   */
  async discoverNodes() {
    // Future: Query DHT
    // Future: DNS-based discovery
    // Future: Local network discovery
    return [];
  }

  /**
   * Replicate memory to federation
   */
  async replicate(memory) {
    // Future: Find suitable nodes
    // Future: Negotiate storage
    // Future: Transfer memory
    // Future: Verify replication
    return true;
  }
}

// MCP (Model Context Protocol) Bridge
export class MCPBridge {
  constructor(mtapAdapter) {
    this.mtap = mtapAdapter;
  }

  /**
   * Format memories for AI agent consumption via MCP
   */
  async getContext(query, options = {}) {
    // This would implement the MCP protocol
    // For now, return simplified context
    
    const memories = await this.searchMemories(query);
    
    return {
      protocol: 'MCP/1.0',
      context: memories.map(m => ({
        content: m.core.content,
        timestamp: m.header.created,
        relevance: this.calculateRelevance(m, query),
        metadata: m.metadata
      })),
      tokens: this.estimateTokens(memories),
      truncated: false
    };
  }

  /**
   * Search memories (placeholder)
   */
  async searchMemories(query) {
    // Would integrate with actual search
    return [];
  }

  /**
   * Calculate relevance score
   */
  calculateRelevance(memory, query) {
    // Simplified relevance calculation
    const content = memory.core.content.toLowerCase();
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/);
    
    let score = 0;
    words.forEach(word => {
      if (content.includes(word)) score += 1;
    });
    
    return score / words.length;
  }

  /**
   * Estimate token count
   */
  estimateTokens(memories) {
    // Rough estimate: 1 token ≈ 4 characters
    const totalChars = memories.reduce((sum, m) => 
      sum + JSON.stringify(m.core.content).length, 0
    );
    return Math.ceil(totalChars / 4);
  }
}

// Export singleton instances
export const mtapAdapter = new MTAPAdapter();
export const mtapFederation = new MTAPFederation();
export const mcpBridge = new MCPBridge(mtapAdapter);