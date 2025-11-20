/**
 * 🧠 Emma Memory Orchestrator
 *
 * This class is the central nervous system for memory operations.
 * It coordinates between the chat experience, the memory wizard, and the vault.
 * It manages the state of memory creation and retrieval, ensuring a single source of truth.
 */
class MemoryOrchestrator {
  constructor() {
    if (MemoryOrchestrator.instance) {
      return MemoryOrchestrator.instance;
    }
    MemoryOrchestrator.instance = this;

    this.activeMemory = null;
    this.isCreatingMemory = false;
  }

  // A helper function to make API calls to the backend
  async _vaultApi(endpoint, body) {
    try {
      const response = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`🧠 MemoryOrchestrator: API call to ${endpoint} failed:`, error);
      throw error;
    }
  }

  // --- Person Management ---

  async getPeople(query = '') {
    return this._vaultApi('execute-tool', {
      toolName: 'get_people',
      params: { query },
    });
  }

  async createPersonProfile(personData) {
    return this._vaultApi('execute-tool', {
      toolName: 'create_person_profile',
      params: personData,
    });
  }

  async updatePerson(personData) {
    return this._vaultApi('execute-tool', {
      toolName: 'update_person',
      params: personData,
    });
  }


  // --- Memory Management ---

  async getMemories(params = {}) {
    return this._vaultApi('execute-tool', {
      toolName: 'get_memories',
      params,
    });
  }

  async getRelatedMemories(memoryId, limit = 3) {
    return this._vaultApi('execute-tool', {
      toolName: 'get_related_memories',
      params: { memoryId, limit },
    });
  }

  async createMemory(memoryData) {
    return this._vaultApi('execute-tool', {
      toolName: 'create_memory_capsule',
      params: memoryData,
    });
  }

  async updateMemory(memoryData) {
    return this._vaultApi('execute-tool', {
      toolName: 'update_memory_capsule',
      params: memoryData,
    });
  }

  // --- Memory Creation Wizard ---

  startMemoryCreation(initialData = {}) {
    this.isCreatingMemory = true;
    this.activeMemory = {
      id: `memory_${Date.now()}`,
      title: '',
      content: '',
      people: [],
      attachments: [],
      ...initialData,
    };
    this.launchWizard();
  }

  launchWizard() {
    const wizard = new UnifiedMemoryWizard(this, { x: 0, y: 0, width: '100%', height: '100%' });
    wizard.show();
  }

  updateActiveMemory(updates) {
    if (!this.isCreatingMemory) return;
    this.activeMemory = { ...this.activeMemory, ...updates };
    console.log('🧠 MemoryOrchestrator: Updating active memory:', this.activeMemory);
  }

  async saveActiveMemory() {
    if (!this.isCreatingMemory) return;

    try {
      const memoryToSave = {
        title: this.activeMemory.title,
        content: this.activeMemory.content || this.activeMemory.story,
        people: this.activeMemory.selectedPeople || [],
        attachments: this.activeMemory.mediaItems || [],
        tags: this.activeMemory.tags,
        // ... add any other relevant fields
      };

      await this.createMemory(memoryToSave);
      console.log('🧠 MemoryOrchestrator: Memory saved successfully.');

    } catch (error) {
      console.error('🧠 MemoryOrchestrator: Error saving memory:', error);
    } finally {
      this.isCreatingMemory = false;
      this.activeMemory = null;
    }
  }

  cancelMemoryCreation() {
    this.isCreatingMemory = false;
    this.activeMemory = null;
    console.log('🧠 MemoryOrchestrator: Canceled memory creation.');
  }
}

// Ensure it's a singleton
const memoryOrchestrator = new MemoryOrchestrator();
Object.freeze(memoryOrchestrator);

window.memoryOrchestrator = memoryOrchestrator;
