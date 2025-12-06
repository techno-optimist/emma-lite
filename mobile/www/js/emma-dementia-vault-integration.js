/**
 * Emma Dementia Companion - Vault Integration
 * Connects the Dementia Companion to Emma's secure vault system
 */

class DementiaVaultIntegration {
  constructor(companion) {
    this.companion = companion;
    this.vaultAPI = window.emmaAPI?.vault || window.chromeShim?.runtime;
    this.currentVaultId = null;
    this.isInitialized = false;
    
    this.init();
  }
  
  async init() {
    try {
      // Check vault status
      const status = await this.getVaultStatus();
      if (status.initialized && status.isUnlocked) {
        this.currentVaultId = status.vaultId;
        this.isInitialized = true;
        console.log('Dementia Companion connected to vault:', this.currentVaultId);
      } else {
        console.warn('Vault not unlocked. Dementia Companion running in limited mode.');
      }
    } catch (error) {
      console.error('Failed to initialize vault integration:', error);
    }
  }
  
  async getVaultStatus() {
    if (this.vaultAPI?.status) {
      return await this.vaultAPI.status();
    }
    // Fallback for legacy API
    return new Promise((resolve) => {
      this.vaultAPI.sendMessage({ action: 'vault.status' }, (response) => {
        resolve(response);
      });
    });
  }
  
  /**
   * Retrieve memories for display and interaction
   */
  async getMemoriesForViewing(options = {}) {
    if (!this.isInitialized) {
      console.warn('Vault not initialized');
      return [];
    }
    
    try {
      const memories = await this.listMemories(options);
      
      // Filter for photo/video memories suitable for reminiscence
      const viewableMemories = memories.filter(memory => {
        const type = memory.semantic?.type || memory.metadata?.type;
        return ['photo', 'video', 'image'].includes(type);
      });
      
      // Sort by relevance for dementia care (familiar faces, happy moments)
      return this.sortMemoriesForDementia(viewableMemories);
    } catch (error) {
      console.error('Failed to retrieve memories:', error);
      return [];
    }
  }
  
  async listMemories(options = {}) {
    if (this.vaultAPI?.listCapsules) {
      return await this.vaultAPI.listCapsules(options);
    }
    // Legacy API
    return new Promise((resolve) => {
      this.vaultAPI.sendMessage({ 
        action: 'vault.listCapsules',
        ...options 
      }, (response) => {
        resolve(response.capsules || []);
      });
    });
  }
  
  /**
   * Get full memory details including decrypted content
   */
  async getMemoryDetails(memoryId) {
    if (!this.isInitialized || !memoryId) return null;
    
    try {
      if (this.vaultAPI?.getMemory) {
        return await this.vaultAPI.getMemory(memoryId);
      }
      
      // Legacy API
      return new Promise((resolve) => {
        this.vaultAPI.sendMessage({ 
          action: 'vault.getMemory',
          memoryId 
        }, (response) => {
          resolve(response.memory);
        });
      });
    } catch (error) {
      console.error('Failed to get memory details:', error);
      return null;
    }
  }
  
  /**
   * Update memory with new details provided by user
   */
  async updateMemoryWithDetails(memoryId, newDetails) {
    if (!this.isInitialized || !memoryId) return false;
    
    try {
      // Get current memory
      const memory = await this.getMemoryDetails(memoryId);
      if (!memory) return false;
      
      // Create updated semantic data
      const updatedSemantic = {
        ...memory.semantic,
        dementiaUpdates: [
          ...(memory.semantic.dementiaUpdates || []),
          {
            timestamp: Date.now(),
            details: newDetails,
            source: 'dementia-companion',
            userId: this.companion.options.userName
          }
        ]
      };
      
      // Merge any people or location details
      if (newDetails.people) {
        updatedSemantic.people = [
          ...(memory.semantic.people || []),
          ...newDetails.people
        ];
      }
      
      if (newDetails.location) {
        updatedSemantic.location = newDetails.location;
      }
      
      // Update the memory
      const updatedMemory = {
        ...memory,
        semantic: updatedSemantic,
        metadata: {
          ...memory.metadata,
          lastUpdatedByDementiaCompanion: Date.now(),
          updateCount: (memory.metadata.updateCount || 0) + 1
        }
      };
      
      return await this.saveMemory(updatedMemory);
    } catch (error) {
      console.error('Failed to update memory:', error);
      return false;
    }
  }
  
  async saveMemory(memory) {
    // Prefer the modern API: memories.save (Electron preload)
    if (window.emmaAPI?.memories?.save) {
      try { const res = await window.emmaAPI.memories.save(memory); return res; } catch (e) { /* fall through */ }
    }
    // Fallback to single IPC channel via chromeShim (Electron legacy HTML)
    if (window.chromeShim && window.chromeShim.runtime && window.chromeShim.runtime.sendMessage) {
      return new Promise((resolve) => {
        window.chromeShim.runtime.sendMessage({ action: 'saveMemory', data: memory }, (response) => {
          resolve(response && response.success ? response : { success: false, error: 'unknown' });
        });
      });
    }
    // Final fallback to extension background
    if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'saveMemory', data: memory }, (response) => {
          resolve(response && response.success ? response : { success: false, error: 'unknown' });
        });
      });
    }
    return { success: false, error: 'No storage API available' };
  }
  
  /**
   * Log interaction for caregiver reporting
   */
  async logInteraction(interaction) {
    if (!this.isInitialized) {
      // Store locally if vault not available
      this.storeLocalInteraction(interaction);
      return;
    }
    
    try {
      const caregiverLog = {
        id: `dementia-log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'caregiver-log',
        semantic: {
          type: 'dementia-interaction',
          timestamp: interaction.timestamp,
          userSpeech: interaction.userSpeech,
          emmaResponse: interaction.emmaResponse,
          context: interaction.context,
          patterns: {
            isRepetition: interaction.isRepetition || false,
            emotionalState: interaction.emotionalState || 'neutral',
            confusionLevel: interaction.confusionLevel || 'none'
          }
        },
        metadata: {
          source: 'dementia-companion',
          stage: this.companion.options.stage,
          sessionId: this.companion.sessionId,
          env: 'demo'
        }
      };
      
      await this.saveMemory(caregiverLog);
      
      // Also append to HML event log for audit trail
      await this.appendToHMLLog({
        type: 'dementia-interaction',
        data: caregiverLog
      });
    } catch (error) {
      console.error('Failed to log interaction:', error);
      this.storeLocalInteraction(interaction);
    }
  }
  
  /**
   * Generate and store caregiver report
   */
  async storeCaregiverReport(report) {
    if (!this.isInitialized) {
      this.storeLocalReport(report);
      return;
    }
    
    try {
      const reportMemory = {
        id: `dementia-report-${report.date}-${Date.now()}`,
        type: 'caregiver-report',
        semantic: {
          type: 'dementia-daily-report',
          date: report.date,
          interactions: report.interactions,
          patterns: report.patterns,
          recommendations: report.recommendations,
          summary: this.generateReportSummary(report)
        },
        metadata: {
          source: 'dementia-companion',
          reportType: 'daily',
          stage: this.companion.options.stage,
          generated: Date.now(),
          env: 'demo'
        }
      };
      
      await this.saveMemory(reportMemory);
      
      // Notify caregivers if configured
      await this.notifyCaregivers(reportMemory);
    } catch (error) {
      console.error('Failed to store caregiver report:', error);
      this.storeLocalReport(report);
    }
  }
  
  /**
   * Retrieve interaction history for pattern analysis
   */
  async getInteractionHistory(days = 7) {
    if (!this.isInitialized) {
      return this.getLocalInteractionHistory(days);
    }
    
    try {
      const since = Date.now() - (days * 24 * 60 * 60 * 1000);
      const memories = await this.listMemories({
        type: 'caregiver-log',
        since: since
      });
      
      return memories
        .filter(m => m.semantic?.type === 'dementia-interaction')
        .map(m => ({
          timestamp: m.semantic.timestamp,
          userSpeech: m.semantic.userSpeech,
          emmaResponse: m.semantic.emmaResponse,
          patterns: m.semantic.patterns
        }))
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to get interaction history:', error);
      return this.getLocalInteractionHistory(days);
    }
  }
  
  /**
   * Analyze patterns across interactions
   */
  async analyzePatterns(interactions) {
    const patterns = {
      commonQuestions: new Map(),
      timeOfDayActivity: new Map(),
      emotionalTrends: [],
      confusionEpisodes: [],
      positiveTopics: new Set(),
      triggerTopics: new Set()
    };
    
    interactions.forEach(interaction => {
      // Track common questions
      if (interaction.userSpeech) {
        const normalized = this.normalizeQuestion(interaction.userSpeech);
        patterns.commonQuestions.set(
          normalized, 
          (patterns.commonQuestions.get(normalized) || 0) + 1
        );
      }
      
      // Track time of day patterns
      const hour = new Date(interaction.timestamp).getHours();
      patterns.timeOfDayActivity.set(
        hour,
        (patterns.timeOfDayActivity.get(hour) || 0) + 1
      );
      
      // Track emotional patterns
      if (interaction.patterns?.emotionalState !== 'neutral') {
        patterns.emotionalTrends.push({
          timestamp: interaction.timestamp,
          state: interaction.patterns.emotionalState
        });
      }
      
      // Track confusion
      if (interaction.patterns?.confusionLevel !== 'none') {
        patterns.confusionEpisodes.push({
          timestamp: interaction.timestamp,
          level: interaction.patterns.confusionLevel,
          context: interaction.context
        });
      }
    });
    
    return patterns;
  }
  
  /**
   * Sort memories optimized for dementia viewing
   */
  sortMemoriesForDementia(memories) {
    return memories.sort((a, b) => {
      // Prioritize memories with people
      const aPeople = a.semantic?.people?.length || 0;
      const bPeople = b.semantic?.people?.length || 0;
      if (aPeople !== bPeople) return bPeople - aPeople;
      
      // Then prioritize happy/positive memories
      const aPositive = this.getPositivityScore(a);
      const bPositive = this.getPositivityScore(b);
      if (aPositive !== bPositive) return bPositive - aPositive;
      
      // Then by familiarity (how often viewed)
      const aViews = a.metadata?.viewCount || 0;
      const bViews = b.metadata?.viewCount || 0;
      return bViews - aViews;
    });
  }
  
  getPositivityScore(memory) {
    const positive = ['happy', 'joy', 'celebration', 'wedding', 'birthday', 'graduation'];
    const text = JSON.stringify(memory.semantic).toLowerCase();
    return positive.reduce((score, word) => {
      return score + (text.includes(word) ? 1 : 0);
    }, 0);
  }
  
  normalizeQuestion(question) {
    return question.toLowerCase()
      .replace(/who is|who's|who are/g, 'who')
      .replace(/what is|what's|what are/g, 'what')
      .replace(/where is|where's|where are/g, 'where')
      .replace(/[?.!,]/g, '')
      .trim();
  }
  
  /**
   * Append to HML event log for audit trail
   */
  async appendToHMLLog(event) {
    if (!this.vaultAPI?.appendHMLEvent) return;
    
    try {
      await this.vaultAPI.appendHMLEvent({
        vaultId: this.currentVaultId,
        event: {
          type: 'dementia-companion-event',
          timestamp: Date.now(),
          data: event
        }
      });
    } catch (error) {
      console.error('Failed to append to HML log:', error);
    }
  }
  
  /**
   * Local storage fallbacks
   */
  storeLocalInteraction(interaction) {
    const stored = JSON.parse(localStorage.getItem('dementia-interactions') || '[]');
    stored.push(interaction);
    // Keep only last 1000 interactions
    if (stored.length > 1000) {
      stored.shift();
    }
    localStorage.setItem('dementia-interactions', JSON.stringify(stored));
  }
  
  storeLocalReport(report) {
    const stored = JSON.parse(localStorage.getItem('dementia-reports') || '[]');
    stored.push(report);
    // Keep only last 30 reports
    if (stored.length > 30) {
      stored.shift();
    }
    localStorage.setItem('dementia-reports', JSON.stringify(stored));
  }
  
  getLocalInteractionHistory(days) {
    const stored = JSON.parse(localStorage.getItem('dementia-interactions') || '[]');
    const since = Date.now() - (days * 24 * 60 * 60 * 1000);
    return stored.filter(i => i.timestamp > since);
  }
  
  generateReportSummary(report) {
    const totalInteractions = report.interactions;
    const repetitions = report.patterns.repetition?.size || 0;
    const bestHour = this.findBestEngagementHour(report.patterns);
    
    return `Daily summary: ${totalInteractions} interactions with ${repetitions} repeated questions. ` +
           `Best engagement time was ${bestHour}:00. ` +
           `${report.recommendations.length} recommendations provided.`;
  }
  
  findBestEngagementHour(patterns) {
    if (!patterns.timeOfDayActivity) return 'unknown';
    
    let bestHour = 0;
    let maxActivity = 0;
    
    patterns.timeOfDayActivity.forEach((count, hour) => {
      if (count > maxActivity) {
        maxActivity = count;
        bestHour = hour;
      }
    });
    
    return bestHour;
  }
  
  async notifyCaregivers(report) {
    // This would integrate with notification system
    // For now, just log
    console.log('Caregiver report ready:', report.id);
  }
}

/**
 * Extend the main Dementia Companion with vault integration
 */
if (window.EmmaDementiaCompanion) {
  const originalInit = window.EmmaDementiaCompanion.prototype.init;
  
  window.EmmaDementiaCompanion.prototype.init = function() {
    // Call original init
    if (originalInit) originalInit.call(this);
    
    // Add vault integration
    this.vault = new DementiaVaultIntegration(this);
    
    // Override interaction logging to use vault
    const originalLog = this.logInteraction;
    this.logInteraction = async (interaction) => {
      if (originalLog) originalLog.call(this, interaction);
      await this.vault.logInteraction(interaction);
    };
    
    // Override report generation to store in vault
    const originalReport = this.generateCaregiverReport;
    this.generateCaregiverReport = async function() {
      const report = originalReport.call(this);
      await this.vault.storeCaregiverReport(report);
      return report;
    };
    
    // Add session ID for tracking
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };
  
  /**
   * Enhanced methods for vault-connected features
   */
  window.EmmaDementiaCompanion.prototype.loadMemoriesForViewing = async function() {
    if (!this.vault) return [];
    return await this.vault.getMemoriesForViewing();
  };
  
  window.EmmaDementiaCompanion.prototype.updateCurrentMemory = async function(details) {
    if (!this.vault || !this.state.currentMemory?.id) return false;
    
    return await this.vault.updateMemoryWithDetails(
      this.state.currentMemory.id,
      details
    );
  };
  
  window.EmmaDementiaCompanion.prototype.analyzeHistoricalPatterns = async function() {
    if (!this.vault) return null;
    
    const history = await this.vault.getInteractionHistory(7);
    return await this.vault.analyzePatterns(history);
  };
}

// Export vault integration
window.DementiaVaultIntegration = DementiaVaultIntegration;
