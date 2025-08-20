/**
 * Emma Automation Module
 * Handles communication with the Python automation service
 */

class EmmaAutomation {
  constructor() {
    this.wsUrl = 'ws://localhost:8000/ws';
    this.httpUrl = 'http://localhost:8000';
    this.websocket = null;
    this.tasks = new Map();
    this.reconnectInterval = 5000;
    this.isConnected = false;
    this.messageHandlers = new Map();
  }

  /**
   * Connect to the automation service via WebSocket
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log('Emma Automation: Connecting to service...');
        this.websocket = new WebSocket(this.wsUrl);

        this.websocket.onopen = () => {
          console.log('Emma Automation: Connected to service');
          this.isConnected = true;
          resolve(true);
        };

        this.websocket.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };

        this.websocket.onerror = (error) => {
          console.error('Emma Automation: WebSocket error:', error);
          this.isConnected = false;
          reject(error);
        };

        this.websocket.onclose = () => {
          console.log('Emma Automation: Disconnected from service');
          this.isConnected = false;
          // Attempt to reconnect
          setTimeout(() => this.connect(), this.reconnectInterval);
        };

      } catch (error) {
        console.error('Emma Automation: Connection failed:', error);
        reject(error);
      }
    });
  }

  /**
   * Send a message to the automation service
   */
  send(message) {
    if (!this.isConnected || !this.websocket) {
      throw new Error('Not connected to automation service');
    }
    this.websocket.send(JSON.stringify(message));
  }

  /**
   * Extract memories based on natural language query
   */
  async extractMemories(query, options = {}) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      // Set up task tracking
      this.tasks.set(taskId, { resolve, reject, startTime: Date.now() });

      // Detect platform from query if not specified
      const platform = options.platform || this.detectPlatform(query);

      // Send extraction request
      this.send({
        type: 'extract_memories',
        task_id: taskId,
        query: query,
        platform: platform,
        options: {
          headless: options.headless !== false,
          ...options
        }
      });

      // Set timeout
      setTimeout(() => {
        if (this.tasks.has(taskId)) {
          this.tasks.delete(taskId);
          reject(new Error('Task timeout after 5 minutes'));
        }
      }, 300000); // 5 minutes
    });
  }

  /**
   * Handle incoming messages from the service
   */
  handleMessage(message) {
    console.log('Emma Automation: Received message:', message.type);

    switch (message.type) {
      case 'task_queued':
        console.log(`Task ${message.task_id} queued for processing`);
        break;

      case 'task_completed':
        if (this.tasks.has(message.task_id)) {
          const task = this.tasks.get(message.task_id);
          this.tasks.delete(message.task_id);
          task.resolve(message.result);
        }
        break;

      case 'task_failed':
        if (this.tasks.has(message.task_id)) {
          const task = this.tasks.get(message.task_id);
          this.tasks.delete(message.task_id);
          task.reject(new Error(message.error));
        }
        break;

      case 'progress':
        // Emit progress events
        if (this.messageHandlers.has('progress')) {
          this.messageHandlers.get('progress')(message);
        }
        break;

      default:
        console.log('Emma Automation: Unknown message type:', message.type);
    }
  }

  /**
   * Detect platform from query text
   */
  detectPlatform(query) {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('facebook') || queryLower.includes('fb')) {
      return 'facebook';
    } else if (queryLower.includes('twitter') || queryLower.includes('tweet')) {
      return 'twitter';
    } else if (queryLower.includes('instagram') || queryLower.includes('insta')) {
      return 'instagram';
    } else if (queryLower.includes('linkedin')) {
      return 'linkedin';
    } else if (queryLower.includes('reddit')) {
      return 'reddit';
    }
    
    return 'generic';
  }

  /**
   * Register a message handler
   */
  on(event, handler) {
    this.messageHandlers.set(event, handler);
  }

  /**
   * Check if service is available via HTTP
   */
  async checkServiceHealth() {
    try {
      const response = await fetch(this.httpUrl);
      const data = await response.json();
      return data.status === 'running';
    } catch (error) {
      return false;
    }
  }

  /**
   * Start the automation service (if installed locally)
   */
  async startService() {
    // This would typically be handled by a native messaging host
    // For now, we'll just check if it's running
    const isHealthy = await this.checkServiceHealth();
    if (!isHealthy) {
      console.warn('Emma Automation: Service not running. Please start emma_automation_service.py');
      return false;
    }
    return true;
  }
}

// Extension integration
class EmmaAutomationExtension {
  constructor() {
    this.automation = new EmmaAutomation();
  }

  /**
   * Initialize the automation module
   */
  async initialize() {
    try {
      // Check if service is running
      const serviceHealthy = await this.automation.checkServiceHealth();
      if (!serviceHealthy) {
        console.warn('Emma Automation: Service not detected. Autonomous features disabled.');
        return false;
      }

      // Connect via WebSocket
      await this.automation.connect();
      
      // Set up progress handler
      this.automation.on('progress', (message) => {
        this.updateUI(message);
      });

      return true;
    } catch (error) {
      console.error('Emma Automation: Initialization failed:', error);
      return false;
    }
  }

  /**
   * Process automation request from UI
   */
  async processAutomationRequest(query, options = {}) {
    try {
      // Validate query
      if (!query || query.trim().length < 10) {
        throw new Error('Please provide a more detailed query');
      }

      // Start extraction
      const result = await this.automation.extractMemories(query, options);
      
      if (result.success) {
        // Process each memory
        const savedMemories = await this.saveMemoriesToVault(result.memories);
        
        return {
          success: true,
          count: savedMemories.length,
          memories: savedMemories,
          platform: result.platform
        };
      } else {
        throw new Error(result.error || 'Extraction failed');
      }

    } catch (error) {
      console.error('Emma Automation: Request failed:', error);
      throw error;
    }
  }

  /**
   * Save extracted memories to Emma vault
   */
  async saveMemoriesToVault(memories) {
    const savedMemories = [];

    for (const memory of memories) {
      try {
        // Send to background script for storage
        const response = await chrome.runtime.sendMessage({
          action: 'ephemeral.add',
          memory: {
            ...memory,
            source: 'automation',
            captureType: 'autonomous'
          }
        });

        if (response.success) {
          savedMemories.push(memory);
        }
      } catch (error) {
        console.error('Failed to save memory:', error);
      }
    }

    return savedMemories;
  }

  /**
   * Update UI with progress
   */
  updateUI(progress) {
    // Send progress to popup or content script
    chrome.runtime.sendMessage({
      action: 'automationProgress',
      progress: progress
    });
  }

  /**
   * Create a memory capsule from automation results
   */
  createMemoryCapsule(memories, query) {
    const capsuleId = `auto_${Date.now()}`;
    
    return {
      id: capsuleId,
      type: 'automation_collection',
      title: `Automated Collection: ${query.substring(0, 50)}...`,
      description: `Automatically extracted ${memories.length} memories based on: "${query}"`,
      memories: memories,
      metadata: {
        query: query,
        extractedAt: new Date().toISOString(),
        platforms: [...new Set(memories.map(m => m.platform))],
        totalCount: memories.length
      },
      timestamp: Date.now()
    };
  }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EmmaAutomation, EmmaAutomationExtension };
} else {
  window.EmmaAutomation = EmmaAutomation;
  window.EmmaAutomationExtension = EmmaAutomationExtension;
}
