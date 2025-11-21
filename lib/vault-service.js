'use strict';

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { TOOL_DEFINITIONS } = require('./tool-definitions');

const DEFAULT_VAULT = {
  people: [],
  memories: []
};

class VaultService {
  constructor(options = {}) {
    this.vaultPath = options.vaultPath || path.join(__dirname, '..', 'data', 'vault.json');
    this.supportedTools = new Set(TOOL_DEFINITIONS.map((tool) => tool.name));
    this.initialized = false;
  }

  async ensureVault() {
    if (this.initialized) {
      return;
    }

    await fs.mkdir(path.dirname(this.vaultPath), { recursive: true });

    try {
      await fs.access(this.vaultPath);
    } catch (error) {
      await fs.writeFile(this.vaultPath, JSON.stringify(DEFAULT_VAULT, null, 2), 'utf8');
    }

    this.initialized = true;
  }

  async loadVault() {
    await this.ensureVault();
    const contents = await fs.readFile(this.vaultPath, 'utf8');
    try {
      const parsed = JSON.parse(contents);
      if (!parsed.people || !Array.isArray(parsed.people) || !parsed.memories || !Array.isArray(parsed.memories)) {
        return { ...DEFAULT_VAULT };
      }
      return parsed;
    } catch (error) {
      console.warn('Vault store corrupted, resetting to defaults:', error?.message || error);
      return { ...DEFAULT_VAULT };
    }
  }

  async saveVault(vault) {
    await this.ensureVault();
    const payload = JSON.stringify(vault, null, 2);
    await fs.writeFile(this.vaultPath, payload, 'utf8');
  }

  generateId(prefix) {
    const random = crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : crypto.randomBytes(6).toString('hex');
    return `${prefix}_${Date.now()}_${random}`;
  }

  canExecute(toolName) {
    return this.supportedTools.has(toolName);
  }

  async execute(toolName, params = {}) {
    const name = String(toolName || '').trim();

    switch (name) {
      case 'get_people':
        return this.getPeople(params);
      case 'get_memories':
        return this.getMemories(params);
      case 'summarize_memory':
        return this.summarizeMemory(params);
      case 'create_memory_from_voice':
        return this.createMemoryFromVoice(params);
      case 'create_memory_capsule':
        return this.createMemoryCapsule(params);
      case 'update_person':
        return this.updatePerson(params);
      case 'create_person_profile':
        return this.createPersonProfile(params);
      case 'update_memory_capsule':
        return this.updateMemoryCapsule(params);
      case 'attach_memory_media':
        return this.attachMemoryMedia(params);
      case 'delete_memory':
        return this.deleteMemory(params);
      case 'delete_person':
        return this.deletePerson(params);
      default:
        throw new Error(`Unsupported tool: ${name}`);
    }
  }

  async getPeople({ query = '', limit = 10 } = {}) {
    const vault = await this.loadVault();
    const trimmedQuery = query.trim().toLowerCase();
    const normalizedLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);

    if (!trimmedQuery) {
      return {
        query,
        people: vault.people.slice(0, normalizedLimit)
      };
    }

    const matches = vault.people.filter((person) => {
      const haystack = [person.name, person.relationship, person.details]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(trimmedQuery);
    });

    return {
      query,
      people: matches.slice(0, normalizedLimit)
    };
  }

  async getMemories({ query, personId, dateRange, limit = 5 } = {}) {
    const vault = await this.loadVault();
    let results = vault.memories.slice();
    const normalizedLimit = Math.min(Math.max(Number(limit) || 5, 5), 50);

    if (personId) {
      results = results.filter((memory) => (memory.people || []).some((person) => person.id === personId));
    }

    if (dateRange) {
      const normalizedDate = dateRange.trim().toLowerCase();
      results = results.filter((memory) => {
        const haystack = [memory.date, memory.content, memory.title]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedDate);
      });
    }

    if (query) {
      const keywords = query.trim().toLowerCase().split(/\s+/);
      results = results.map(memory => {
        let score = 0;
        const title = (memory.title || '').toLowerCase();
        const content = (memory.content || '').toLowerCase();
        const tags = (memory.tags || []).join(' ').toLowerCase();
        const importanceScore = typeof memory.importance === 'number' ? memory.importance * 2 : 0;
        const attachmentScore = Array.isArray(memory.attachments) && memory.attachments.length ? 2 : 0;

        for (const keyword of keywords) {
          if (title.includes(keyword)) score += 5;
          if (content.includes(keyword)) score += 1;
          if (tags.includes(keyword)) score += 3;
        }

        const recency = Date.parse(memory.date || memory.createdAt || '') || 0;
        const ageDays = recency ? (Date.now() - recency) / (1000 * 60 * 60 * 24) : null;
        const recencyBoost = typeof ageDays === 'number' ? Math.max(0, 10 - ageDays / 30) : 0;

        score += importanceScore + attachmentScore + recencyBoost;

        return { ...memory, score };
      }).filter(memory => memory.score > 0);

      results.sort((a, b) => b.score - a.score);
    } else {
      results.sort((a, b) => {
        const aDate = Date.parse(a.date) || Date.parse(a.createdAt) || 0;
        const bDate = Date.parse(b.date) || Date.parse(b.createdAt) || 0;
        const aImportance = typeof a.importance === 'number' ? a.importance : 0;
        const bImportance = typeof b.importance === 'number' ? b.importance : 0;
        const aMedia = Array.isArray(a.attachments) ? a.attachments.length : 0;
        const bMedia = Array.isArray(b.attachments) ? b.attachments.length : 0;

        const dateDelta = bDate - aDate;
        if (dateDelta !== 0) return dateDelta;

        if (bImportance !== aImportance) return bImportance - aImportance;
        if (bMedia !== aMedia) return bMedia - aMedia;

        return 0;
      });
    }

    return {
      query: query || null,
      personId: personId || null,
      dateRange: dateRange || null,
      memories: results.slice(0, normalizedLimit)
    };
  }

  async summarizeMemory({ memoryId } = {}) {
    if (!memoryId) {
      throw new Error('memoryId is required to summarize a memory');
    }

    const vault = await this.loadVault();
    const memory = vault.memories.find((item) => item.id === memoryId);

    if (!memory) {
      throw new Error(`Memory ${memoryId} not found`);
    }

    const preview = this.buildSummary(memory);
    return {
      memoryId,
      summary: preview
    };
  }

  async createMemoryFromVoice(payload = {}) {
    if (!payload.content) {
      throw new Error('content is required to create a memory');
    }

    const title = this.deriveTitle(payload.content, 'Shared Memory');
    const memory = await this.createMemoryCapsule({
      ...payload,
      title
    });

    return {
      success: true,
      memoryId: memory.memory.id,
      title: memory.memory.title,
      created: memory.memory,
      createdPeople: memory.createdPeople
    };
  }

  async createMemoryCapsule(payload = {}) {
    if (!payload.content) {
      throw new Error('content is required to create a memory');
    }

    const now = new Date().toISOString();

    return this.updateVault((vault) => {
      const { resolvedPeople, newlyCreated } = this.resolvePeople(vault, payload.people || []);
      const attachments = this.normalizeAttachments(payload.attachments || []);

      const memory = {
        id: this.generateId('memory'),
        title: payload.title || this.deriveTitle(payload.content, 'New Memory'),
        content: payload.content,
        emotion: payload.emotion || null,
        importance: typeof payload.importance === 'number' ? payload.importance : null,
        tags: Array.isArray(payload.tags) ? payload.tags.filter(Boolean) : [],
        date: payload.date || null,
        location: payload.location || null,
        people: resolvedPeople,
        attachments,
        createdAt: now,
        updatedAt: now
      };

      vault.memories.push(memory);

      return {
        success: true,
        memoryId: memory.id,
        title: memory.title,
        memory,
        createdPeople: newlyCreated
      };
    });
  }

  async updatePerson(payload = {}) {
    const name = (payload.name || '').trim();
    if (!name) {
      throw new Error('name is required to update a person');
    }

    const relationship = payload.relationship?.trim();
    const details = payload.details?.trim();

    return this.updateVault((vault) => {
      const person = this.findPersonByName(vault, name);
      const now = new Date().toISOString();

      if (!person) {
        const created = {
          id: this.generateId('person'),
          name,
          relationship: relationship || null,
          details: details || null,
          pronouns: null,
          birthday: null,
          avatar: null,
          createdAt: now,
          updatedAt: now
        };
        vault.people.push(created);
        return { person: created, created: true };
      }

      if (relationship) {
        person.relationship = relationship;
      }

      if (details) {
        person.details = details;
      }

      person.updatedAt = now;
      return { person, created: false };
    });
  }

  async createPersonProfile(payload = {}) {
    const name = (payload.name || '').trim();
    if (!name) {
      throw new Error('name is required to create a person');
    }

    const relationship = payload.relationship?.trim() || null;
    const pronouns = payload.pronouns?.trim() || null;
    const birthday = payload.birthday?.trim() || null;
    const details = payload.details?.trim() || null;
    const avatar = payload.avatar ? this.normalizeAttachment(payload.avatar, 'avatar') : null;

    return this.updateVault((vault) => {
      const existing = this.findPersonByName(vault, name);
      const now = new Date().toISOString();

      if (existing) {
        existing.relationship = relationship || existing.relationship || null;
        existing.pronouns = pronouns || existing.pronouns || null;
        existing.birthday = birthday || existing.birthday || null;
        existing.details = details || existing.details || null;
        existing.avatar = avatar || existing.avatar || null;
        existing.updatedAt = now;
        return { person: existing, created: false };
      }

      const person = {
        id: this.generateId('person'),
        name,
        relationship,
        pronouns,
        birthday,
        details,
        avatar,
        createdAt: now,
        updatedAt: now
      };

      vault.people.push(person);

      return { person, created: true };
    });
  }

  async updateMemoryCapsule(payload = {}) {
    const memoryId = (payload.memoryId || '').trim();
    if (!memoryId) {
      throw new Error('memoryId is required to update a memory');
    }

    return this.updateVault((vault) => {
      const memory = vault.memories.find((item) => item.id === memoryId);
      if (!memory) {
        throw new Error(`Memory ${memoryId} not found`);
      }

      const updatedFields = [];

      if (payload.content) {
        memory.content = payload.content;
        updatedFields.push('content');
      }

      if (payload.title) {
        memory.title = payload.title;
        updatedFields.push('title');
      }

      if (payload.emotion) {
        memory.emotion = payload.emotion;
        updatedFields.push('emotion');
      }

      if (typeof payload.importance === 'number') {
        memory.importance = payload.importance;
        updatedFields.push('importance');
      }

      if (payload.tags) {
        memory.tags = Array.isArray(payload.tags) ? payload.tags.filter(Boolean) : [];
        updatedFields.push('tags');
      }

      if (payload.location) {
        memory.location = payload.location;
        updatedFields.push('location');
      }

      if (payload.date) {
        memory.date = payload.date;
        updatedFields.push('date');
      }

      if (payload.people) {
        const { resolvedPeople, newlyCreated } = this.resolvePeople(vault, payload.people);
        memory.people = resolvedPeople;
        memory.__newlyCreatedPeople = newlyCreated;
        updatedFields.push('people');
      }

      if (Array.isArray(payload.removeAttachmentIds) && payload.removeAttachmentIds.length) {
        const idsToRemove = new Set(payload.removeAttachmentIds);
        memory.attachments = (memory.attachments || []).filter((attachment) => !idsToRemove.has(attachment.id));
        updatedFields.push('attachments');
      }

      if (payload.attachments) {
        const normalized = this.normalizeAttachments(payload.attachments);
        if (payload.replaceAttachments) {
          memory.attachments = normalized;
        } else {
          memory.attachments = [...(memory.attachments || []), ...normalized];
        }
        updatedFields.push('attachments');
      }

      memory.updatedAt = new Date().toISOString();

      const createdPeople = memory.__newlyCreatedPeople || [];
      delete memory.__newlyCreatedPeople;

      return {
        success: true,
        memoryId,
        memory,
        createdPeople,
        updatedFields
      };
    });
  }

  async attachMemoryMedia(payload = {}) {
    const memoryId = (payload.memoryId || '').trim();
    if (!memoryId) {
      throw new Error('memoryId is required to attach media');
    }

    const media = Array.isArray(payload.media) ? payload.media : [];
    if (!media.length) {
      throw new Error('media array is required to attach media');
    }

    return this.updateVault((vault) => {
      const memory = vault.memories.find((item) => item.id === memoryId);
      if (!memory) {
        throw new Error(`Memory ${memoryId} not found`);
      }

      const normalized = this.normalizeAttachments(media, 'media');

      if (payload.replaceExisting) {
        memory.attachments = normalized;
      } else {
        memory.attachments = [...(memory.attachments || []), ...normalized];
      }

      memory.updatedAt = new Date().toISOString();

      return {
        success: true,
        memoryId,
        memory,
        attached: normalized,
        attachmentCount: normalized.length
      };
    });
  }

  async updateVault(mutator) {
    const vault = await this.loadVault();
    const result = await mutator(vault);
    await this.saveVault(vault);
    return result;
  }

  resolvePeople(vault, rawPeople) {
    const peopleInputs = Array.isArray(rawPeople) ? rawPeople : [];
    const resolvedPeople = [];
    const newlyCreated = [];

    for (const entry of peopleInputs) {
      const normalized = this.normalizePersonEntry(entry);
      if (!normalized) {
        continue;
      }

      let person = null;

      if (normalized.id) {
        person = vault.people.find((item) => item.id === normalized.id);
      }

      if (!person && normalized.name) {
        person = this.findPersonByName(vault, normalized.name);
      }

      if (!person && normalized.name) {
        const now = new Date().toISOString();
        person = {
          id: this.generateId('person'),
          name: normalized.name,
          relationship: normalized.relationship || null,
          details: null,
          pronouns: null,
          birthday: null,
          avatar: null,
          createdAt: now,
          updatedAt: now
        };
        vault.people.push(person);
        newlyCreated.push(person);
      }

      if (person) {
        if (normalized.relationship && !person.relationship) {
          person.relationship = normalized.relationship;
        }
        resolvedPeople.push({ id: person.id, name: person.name, relationship: person.relationship || null });
      }
    }

    return { resolvedPeople, newlyCreated };
  }

  normalizePersonEntry(entry) {
    if (!entry) return null;
    if (typeof entry === 'string') {
      return { name: entry.trim() };
    }
    if (typeof entry === 'object') {
      const normalized = {};
      if (entry.id) {
        normalized.id = String(entry.id);
      }
      if (entry.name) {
        normalized.name = String(entry.name).trim();
      }
      if (entry.relationship) {
        normalized.relationship = String(entry.relationship).trim();
      }
      return normalized;
    }
    return null;
  }

  normalizeAttachments(attachments, defaultPrefix = 'attachment') {
    if (!Array.isArray(attachments)) {
      return [];
    }

    const seenHashes = new Set();

    return attachments
      .map((item) => this.normalizeAttachment(item, defaultPrefix))
      .filter((attachment) => {
        if (!attachment) return false;
        if (attachment.sha256 && seenHashes.has(attachment.sha256)) {
          return false;
        }
        if (attachment.sha256) {
          seenHashes.add(attachment.sha256);
        }
        return true;
      });
  }

  normalizeAttachment(item, defaultPrefix = 'attachment') {
    if (!item) return null;

    const attachment = { ...item };
    attachment.id = item.id || this.generateId(defaultPrefix);
    if (item.uploadId) {
      attachment.uploadId = item.uploadId;
    }
    if (item.name) {
      attachment.name = item.name;
    }
    if (item.type) {
      attachment.type = item.type;
    }
    if (item.data) {
      attachment.data = item.data;
    }
    if (item.dataUrl) {
      attachment.dataUrl = item.dataUrl;
    }
    attachment.addedAt = new Date().toISOString();

    const rawContent = attachment.dataUrl || attachment.data;
    if (rawContent) {
      const contentString = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
      attachment.size = Buffer.byteLength(contentString, 'utf8');
      attachment.sha256 = crypto.createHash('sha256').update(contentString).digest('hex');

      const MAX_ATTACHMENT_SIZE = 8 * 1024 * 1024; // 8MB
      if (attachment.size > MAX_ATTACHMENT_SIZE) {
        console.warn(`Attachment ${attachment.id} skipped: exceeds ${MAX_ATTACHMENT_SIZE} bytes`);
        return null;
      }
    }

    return attachment;
  }

  findPersonByName(vault, name) {
    const target = name.trim().toLowerCase();
    return vault.people.find((person) => person.name.trim().toLowerCase() === target);
  }

  deriveTitle(content, fallback) {
    if (!content) {
      return fallback;
    }

    const cleaned = content.replace(/\s+/g, ' ').trim();
    if (!cleaned) {
      return fallback;
    }

    const words = cleaned.split(' ');
    const preview = words.slice(0, 6).join(' ');
    return preview.length < cleaned.length ? `${preview}…` : preview;
  }

  buildSummary(memory) {
    if (memory.title && memory.content) {
      return `${memory.title.trim()} — ${this.limitText(memory.content, 200)}`;
    }
    if (memory.content) {
      return this.limitText(memory.content, 200);
    }
    return 'This memory was saved, but it does not include any story details yet.';
  }

  limitText(text, maxLength) {
    if (!text) return '';
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    return `${cleaned.slice(0, maxLength - 1)}…`;
  }

  async deleteMemory({ memoryId } = {}) {
    const id = (memoryId || '').trim();
    if (!id) {
      throw new Error('memoryId is required to delete a memory');
    }

    return this.updateVault((vault) => {
      const initialCount = vault.memories.length;
      vault.memories = vault.memories.filter((memory) => memory.id !== id);
      const success = vault.memories.length < initialCount;

      if (!success) {
        throw new Error(`Memory ${id} not found`);
      }

      return { success, memoryId: id };
    });
  }

  async deletePerson({ personId } = {}) {
    const id = (personId || '').trim();
    if (!id) {
      throw new Error('personId is required to delete a person');
    }

    return this.updateVault((vault) => {
      const initialCount = vault.people.length;
      vault.people = vault.people.filter((person) => person.id !== id);
      const success = vault.people.length < initialCount;

      if (!success) {
        throw new Error(`Person ${id} not found`);
      }

      // Also remove this person from any memories
      vault.memories.forEach((memory) => {
        if (Array.isArray(memory.people)) {
          memory.people = memory.people.filter((person) => person.id !== id);
        }
      });

      return { success, personId: id };
    });
  }
}

module.exports = VaultService;
