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
      default:
        throw new Error(`Unsupported tool: ${name}`);
    }
  }

  async getPeople({ query = '' } = {}) {
    const vault = await this.loadVault();
    const trimmedQuery = query.trim().toLowerCase();

    if (!trimmedQuery) {
      return {
        query,
        people: vault.people.slice(0, 10)
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
      people: matches.slice(0, 10)
    };
  }

  async getMemories({ personId, dateRange, limit = 5 } = {}) {
    const vault = await this.loadVault();
    let results = vault.memories.slice();

    if (personId) {
      results = results.filter((memory) => (memory.people || []).some((person) => person.id === personId));
    }

    if (dateRange) {
      const normalized = dateRange.trim().toLowerCase();
      results = results.filter((memory) => {
        const haystack = [memory.date, memory.content, memory.title]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalized);
      });
    }

    results.sort((a, b) => {
      const aDate = Date.parse(a.date) || Date.parse(a.createdAt) || 0;
      const bDate = Date.parse(b.date) || Date.parse(b.createdAt) || 0;
      return bDate - aDate;
    });

    return {
      personId: personId || null,
      dateRange: dateRange || null,
      memories: results.slice(0, limit)
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

      if (payload.content) {
        memory.content = payload.content;
      }

      if (payload.title) {
        memory.title = payload.title;
      }

      if (payload.emotion) {
        memory.emotion = payload.emotion;
      }

      if (typeof payload.importance === 'number') {
        memory.importance = payload.importance;
      }

      if (payload.tags) {
        memory.tags = Array.isArray(payload.tags) ? payload.tags.filter(Boolean) : [];
      }

      if (payload.location) {
        memory.location = payload.location;
      }

      if (payload.date) {
        memory.date = payload.date;
      }

      if (payload.people) {
        const { resolvedPeople, newlyCreated } = this.resolvePeople(vault, payload.people);
        memory.people = resolvedPeople;
        memory.__newlyCreatedPeople = newlyCreated;
      }

      if (Array.isArray(payload.removeAttachmentIds) && payload.removeAttachmentIds.length) {
        const idsToRemove = new Set(payload.removeAttachmentIds);
        memory.attachments = (memory.attachments || []).filter((attachment) => !idsToRemove.has(attachment.id));
      }

      if (payload.attachments) {
        const normalized = this.normalizeAttachments(payload.attachments);
        if (payload.replaceAttachments) {
          memory.attachments = normalized;
        } else {
          memory.attachments = [...(memory.attachments || []), ...normalized];
        }
      }

      memory.updatedAt = new Date().toISOString();

      const createdPeople = memory.__newlyCreatedPeople || [];
      delete memory.__newlyCreatedPeople;

      return {
        memory,
        createdPeople
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
        memory,
        attached: normalized
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

    return attachments
      .map((item) => this.normalizeAttachment(item, defaultPrefix))
      .filter(Boolean);
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
}

module.exports = VaultService;
