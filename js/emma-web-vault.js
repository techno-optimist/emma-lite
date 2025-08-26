/**
 * Emma Web Vault System
 * Browser-compatible .emma file system with Web Crypto API
 * Preserves ALL desktop functionality while working in any browser
 *
 * 💜 Built with love for preserving precious memories
 */

class EmmaWebVault {
  constructor() {
    this.currentVault = null;
    this.vaultData = null;
    this.autoSaveTimer = null;
    this.passphrase = null;
    this.fileHandle = null; // For File System Access API
    this.pendingChanges = false;
    this.saveDebounceTimer = null;

    // WEBAPP-FIRST ARCHITECTURE: Webapp is single source of truth
    this.extensionAvailable = false; // Extension defers to webapp
    this.extensionSyncEnabled = false;
    this.pureWebAppMode = true; // Webapp manages all vault operations
    this.isWebappPrimary = true; // NEW: Webapp-first flag

    // CRITICAL FIX: Restore vault state from localStorage on construction
    const vaultActive = localStorage.getItem('emmaVaultActive') === 'true';
    const vaultName = localStorage.getItem('emmaVaultName');

    if (vaultActive && vaultName) {

      this.isOpen = true; // Restore unlocked state

      // CRITICAL FIX: Restore actual vault data from IndexedDB
      setTimeout(async () => {
        try {

          const vaultData = await this.loadFromIndexedDB();
          if (vaultData) {
            this.vaultData = vaultData;

            // SECURITY: Passphrase no longer stored in sessionStorage for security
            // User will be prompted for passphrase when needed
            console.log('🔒 CONSTRUCTOR: Vault restored from IndexedDB - passphrase required for operations');

            console.log('✅ CONSTRUCTOR: Vault data restored from IndexedDB with',
              Object.keys(vaultData.content?.memories || {}).length, 'memories');
          } else {
            console.warn('⚠️ CONSTRUCTOR: No vault data in IndexedDB - creating minimal structure');
            // Fallback to minimal structure
            this.vaultData = {
              content: { memories: {}, people: {}, media: {} },
              stats: { memoryCount: 0, peopleCount: 0, mediaCount: 0 },
              metadata: { name: vaultName }
            };
          }
        } catch (error) {
          console.error('❌ CONSTRUCTOR: Failed to restore vault data:', error);
          // Fallback to minimal structure
          this.vaultData = {
            content: { memories: {}, people: {}, media: {} },
            stats: { memoryCount: 0, peopleCount: 0, mediaCount: 0 },
            metadata: { name: vaultName }
          };
        }
      }, 100); // Small delay to ensure IndexedDB is ready

    } else {
      this.isOpen = false;

    }

    // Check for Emma Vault Extension
    // PURE WEB APP: No extension communication needed

  }

  /**
   * Create new .emma vault file
   * Same API as desktop version!
   */
  async createVaultFile(name, passphrase) {
    // Extension mode: Route vault creation to extension
    if (this.extensionAvailable) {

      throw new Error('Please use the browser extension to create vaults. Click the Emma extension icon.');
    }

    try {

      if (!name || !passphrase) {
        throw new Error(`Missing required parameters: name=${name}, passphrase=${passphrase ? 'provided' : 'missing'}`);
      }

      this.passphrase = passphrase;

      // Create vault structure (IDENTICAL to desktop version)
      this.vaultData = {
        version: '1.0',
        created: new Date().toISOString(),
        name: name,
        encryption: {
          algorithm: 'AES-GCM', // Web Crypto compatible
          keyDerivation: 'PBKDF2',
          iterations: 100000,
          salt: this.generateSalt()
        },
        content: {
          memories: {},
          people: {},
          media: {},
          relationships: {},
          settings: {}
        },
        stats: {
          memoryCount: 0,
          peopleCount: 0,
          mediaCount: 0,
          totalSize: 0
        }
      };

      this.isOpen = true;

      // Set session storage for dashboard
      sessionStorage.setItem('emmaVaultActive', 'true');
      sessionStorage.setItem('emmaVaultName', name);
      // SECURITY: Never store passphrase in web storage - keep in memory only

      // CRITICAL FIX: Remove automatic session expiry - vault stays unlocked until user locks it
      localStorage.removeItem('emmaVaultSessionExpiry'); // Remove any existing expiry
      console.log('✅ Session storage set - new vault active AND unlocked (no expiry - user controlled)!');

      // Save to IndexedDB for persistence
      await this.saveToIndexedDB();      const originalAutoDownload = this.vaultData.settings?.autoDownload;
      this.vaultData.settings = this.vaultData.settings || {};
      this.vaultData.settings.autoDownload = true; // Force download for new vaults

      await this.downloadVaultFile(name);

      // Restore original setting
      this.vaultData.settings.autoDownload = originalAutoDownload;

      return { success: true, name: name };

    } catch (error) {
      console.error('❌ Failed to create vault:', error);
      throw error;
    }
  }

  /**
   * Open .emma vault file
   * Supports both File System Access API and file input fallback
   */
  async openVaultFile(file) {
    try {

      let fileToProcess = file;

      // Store the original filename for better UX
      if (file) {
        this.originalFileName = file.name;
        // Persist for restoration across pages
        try { sessionStorage.setItem('emmaVaultOriginalFileName', file.name); } catch (_) {}

        // CRITICAL: If file is provided but no fileHandle, we need write access
        if (!this.fileHandle && 'showOpenFilePicker' in window) {

          try {
            const [fileHandle] = await window.showOpenFilePicker({
              types: [{
                description: 'Emma Vault Files',
                accept: { 'application/emma': ['.emma'] }
              }]
            });
            const selectedFile = await fileHandle.getFile();
            if (selectedFile.name === file.name && selectedFile.size === file.size) {
              this.fileHandle = fileHandle;

            } else {

            }
          } catch (error) {

          }
        }
      }

      // PURE WEB APP: Use native File System Access API (no extension needed)
      if (!file && 'showOpenFilePicker' in window) {

        const [fileHandle] = await window.showOpenFilePicker({
          types: [{
            description: 'Emma Vault Files',
            accept: { 'application/emma-vault': ['.emma'] }
          }],
          excludeAcceptAllOption: true,
          multiple: false
        });

        this.fileHandle = fileHandle;
        fileToProcess = await fileHandle.getFile();

      }

      if (!fileToProcess) {
        throw new Error('No file selected');
      }

      // Get passphrase securely with CLEAN modal
      const passphrase = await window.cleanSecurePasswordModal.show({
        title: 'Unlock Vault',
        message: `Enter the passphrase for your vault: ${fileToProcess.name}`,
        placeholder: 'Enter vault passphrase...'
      });

      this.passphrase = passphrase;

      // Decrypt and load vault
      // Decrypt vault data using NATIVE crypto (no extension needed)
      const vaultData = await this.nativeDecryptVault(fileData, passphrase);

      this.vaultData = vaultData;
      this.isOpen = true;

      // Set session storage for dashboard
      sessionStorage.setItem('emmaVaultActive', 'true');
      sessionStorage.setItem('emmaVaultName', vaultData.metadata?.name || 'Web Vault');
      // SECURITY: Never store passphrase in web storage - keep in memory only

      // CRITICAL FIX: Remove automatic session expiry - vault stays unlocked until user locks it
      localStorage.removeItem('emmaVaultSessionExpiry'); // Remove any existing expiry
      console.log('✅ Session storage set - vault active AND unlocked (no expiry - user controlled)!');

      // Save to IndexedDB as backup AFTER loading from file
      await this.saveToIndexedDB();

      return { success: true, stats: this.getStats() };

    } catch (error) {
      console.error('❌ Failed to open vault:', error);
      throw error;
    }
  }

  /**
   * Add memory (WEBAPP-FIRST: Single source of truth for all memory operations)
   */
  async addMemory({ content, metadata = {}, attachments = [] }) {

    // WEBAPP-FIRST: All memory operations go through webapp vault
    console.log('🚀 WEBAPP-FIRST: Adding memory to webapp vault:', {
      isOpen: this.isOpen,
      hasPassphrase: !!this.passphrase,
      sessionActive: sessionStorage.getItem('emmaVaultActive'),
      sessionPassphrase: !!sessionStorage.getItem('emmaVaultPassphrase'),
      sessionName: sessionStorage.getItem('emmaVaultName'),
      attachmentCount: attachments.length,
      hasVaultData: !!this.vaultData,
      webappPrimary: this.isWebappPrimary
    });

    // WEBAPP-FIRST: No extension routing - webapp handles all operations directly

    // Normal vault mode
    if (!this.isOpen) {
      throw new Error('No vault is open');
    }

          // EMERGENCY FIX: Always ensure passphrase is available for any memory save
      if (!this.passphrase) {
        // FIRST: Try to restore passphrase from session storage
        // SECURITY: Passphrase no longer stored in sessionStorage for security
        console.log('🔐 EMERGENCY FIX: Checking passphrase for memory save');

        if (this.passphrase) {
          console.log('✅ EMERGENCY FIX: Passphrase available in memory');
        } else {
          console.error('🔐 CRITICAL: No passphrase available - emergency re-authentication required');

          // Emergency prompt - ALWAYS show for missing passphrase
          if (window.cleanSecurePasswordModal) {
            try {
              this.passphrase = await window.cleanSecurePasswordModal.show({
                title: 'Vault Access Required',
                message: 'Please re-enter your vault passphrase to save this memory.',
                placeholder: 'Enter vault passphrase...'
              });

              // Restore sessionStorage after emergency unlock
              if (this.passphrase) {
                // SECURITY: Never store passphrase in web storage
                console.log('✅ EMERGENCY FIX: Passphrase restored and cached');
              }
            } catch (error) {
              console.error('🔐 Secure modal failed:', error);
              throw new Error('Vault access required to save memories. Please unlock your vault first.');
            }
          } else {
            throw new Error('Vault access required. Please reload the page and unlock your vault.');
          }

          if (!this.passphrase) {
            throw new Error('Vault passphrase is required to save memories');
          }
        }
      }

    // Log final passphrase status before proceeding

    try {
      const memoryId = this.generateId('memory');
      const timestamp = new Date().toISOString();

      // Same memory structure as desktop version
      const memory = {
        id: memoryId,
        created: timestamp,
        updated: timestamp,
        content: content,
        metadata: {
          emotion: metadata.emotion || 'neutral',
          importance: metadata.importance || 5,
          tags: metadata.tags || [],
          people: metadata.people || [],
          location: metadata.location || '',
          ...metadata
        },
        attachments: []
      };

      // Process attachments (same as desktop)

      for (const attachment of attachments) {

        console.log('🔥 ATTACHMENT DEBUG: Processing attachment:', {
          name: attachment.name,
          type: attachment.type,
          hasData: !!attachment.data,
          dataType: typeof attachment.data,
          dataLength: attachment.data?.length,
          dataStart: typeof attachment.data === 'string' ? attachment.data.substring(0, 50) : 'not string',
          fullAttachment: attachment
        });

        const attachmentData = attachment.data || attachment.dataUrl;
        if (!attachmentData) {
          console.error('❌ ATTACHMENT MISSING DATA:', attachment);
          throw new Error('Attachment missing data - file may not have been uploaded properly');
        }

        // Normalize attachment object for addMedia
        const normalizedAttachment = {
          name: attachment.name,
          type: attachment.type,
          data: attachmentData  // Use either data or dataUrl
        };

        const mediaId = await this.addMedia(normalizedAttachment);

        const attachmentRef = {
          id: mediaId,
          type: attachment.type,
          name: attachment.name,
          size: attachment.size || 0
        };

        memory.attachments.push(attachmentRef);

      }      // Generate thumbnail for first image
      if (memory.attachments.length > 0) {
        const firstImage = memory.attachments.find(a => a.type.startsWith('image/'));
        if (firstImage) {
          memory.thumbnail = await this.generateThumbnail(firstImage.id);
        }
      }

      // Store in vault
      this.vaultData.content.memories[memoryId] = memory;
      this.vaultData.stats.memoryCount++;
      this.vaultData.stats.totalSize += this.calculateMemorySize(memory);

      // Auto-save with direct-save-only error handling
      try {
        await this.autoSave();

        return { success: true, memory: memory };
      } catch (saveError) {
        // Remove the memory from vault since save failed
        delete this.vaultData.content.memories[memoryId];
        this.vaultData.stats.memoryCount--;

        console.error('❌ Memory save failed - rolled back:', saveError);
        throw new Error(`Failed to save memory: ${saveError.message}`);
      }

    } catch (error) {
      console.error('❌ Failed to add memory:', error);
      throw error;
    }
  }

  /**
   * Update memory (CRITICAL: Missing method causing data loss!)
   */
  async updateMemory(memoryId, updates) {
    console.log('🔄 VAULT: Updating memory:', memoryId, updates);

    // Extension mode: Route through extension
    if (this.extensionAvailable) {
      // Send update to extension for saving to actual vault
      window.postMessage({
        channel: 'emma-vault-bridge',
        type: 'UPDATE_MEMORY',
        data: {
          memoryId: memoryId,
          updates: updates
        }
      }, window.location.origin);

      return { success: true };
    }

    // Normal vault mode
    if (!this.isOpen) {
      throw new Error('No vault is open');
    }

    const memory = this.vaultData.content.memories[memoryId];
    if (!memory) {
      throw new Error(`Memory not found: ${memoryId}`);
    }

    try {
      // Update memory fields
      const timestamp = new Date().toISOString();
      
      // Merge updates into existing memory
      Object.keys(updates).forEach(key => {
        if (key === 'metadata') {
          // Deep merge metadata to preserve existing fields
          memory.metadata = {
            ...memory.metadata,
            ...updates.metadata
          };
        } else {
          memory[key] = updates[key];
        }
      });
      
      // Always update the timestamp
      memory.updated = timestamp;

      console.log('✅ VAULT: Memory updated successfully:', memoryId);
      console.log('📊 VAULT: Updated metadata.people:', memory.metadata?.people);

      // Auto-save the vault
      await this.autoSave();

      return { success: true, memory: memory };
    } catch (error) {
      console.error('❌ VAULT: Failed to update memory:', error);
      throw error;
    }
  }

  /**
   * List memories (IDENTICAL API to desktop version!)
   */
  async listMemories(limit = 50, offset = 0) {
    // PHASE 2: Use Web App Primary if enabled
    if (this.useWebAppPrimary && window.emmaVaultPrimary) {

      const memories = await window.emmaVaultPrimary.getMemories();
      // Apply pagination
      return memories
        .sort((a, b) => new Date(b.created) - new Date(a.created))
        .slice(offset, offset + limit);
    }

    // Pure web app mode: Get memories from vault data directly (same as constellation)
    if (this.isOpen && this.vaultData) {

      const vaultMemories = this.vaultData.content?.memories || {};
      const vaultMedia = this.vaultData.content?.media || {};

      // Convert vault memories to array format (same as constellation)
      const memories = Object.values(vaultMemories).map(memory => {
        // Process attachments to include data URLs
        const attachments = (memory.attachments || []).map(attachment => {
          const mediaItem = vaultMedia[attachment.id];
          if (mediaItem && mediaItem.data) {
            return {
              ...attachment,
              url: mediaItem.data.startsWith('data:')
                ? mediaItem.data
                : `data:${mediaItem.type};base64,${mediaItem.data}`,
              dataUrl: mediaItem.data.startsWith('data:')
                ? mediaItem.data
                : `data:${mediaItem.type};base64,${mediaItem.data}`,
              isPersisted: true
            };
          }
          return attachment;
        });

        return {
          ...memory,
          attachments
        };
      });

      // Apply sorting and pagination
      const sortedMemories = memories.sort((a, b) => new Date(b.created) - new Date(a.created));
      return sortedMemories.slice(offset, offset + limit);
    }

    // Legacy extension mode (disabled)
    if (false) { // this.extensionAvailable

      // Request memories data from extension
      return new Promise((resolve) => {
        const messageHandler = (event) => {
          if (event.data?.channel === 'emma-vault-bridge' && event.data?.type === 'MEMORIES_DATA') {

            window.removeEventListener('message', messageHandler);

            const memories = event.data.data || [];
            // Apply sorting and pagination
            const sortedMemories = memories
              .sort((a, b) => new Date(b.created) - new Date(a.created))
              .slice(offset, offset + limit);

            resolve(sortedMemories);
          }
        };

        window.addEventListener('message', messageHandler);

        // Request memories data from extension
        window.postMessage({
          channel: 'emma-vault-bridge',
          type: 'REQUEST_MEMORIES_DATA'
        }, window.location.origin);

        // Timeout fallback
        setTimeout(() => {
          window.removeEventListener('message', messageHandler);
          resolve([]);
        }, 2000);
      });
    }

    // Fallback for non-extension mode
    return [];
  }

  /**
   * Delete a memory by id
   */
  async deleteMemory(memoryId) {
    if (!memoryId) throw new Error('Missing memory id');

    // Extension mode: Route through extension
    if (this.extensionAvailable && window.currentVaultStatus?.managedByExtension) {

      return new Promise((resolve, reject) => {
        const messageId = `delete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Set up response listener
        const handleResponse = (event) => {
          if (event.data?.channel === 'emma-vault-bridge' && event.data.type === 'EMMA_RESPONSE' && event.data.messageId === messageId) {
            window.removeEventListener('message', handleResponse);
            if (event.data.success) {

              resolve({ success: true });
            } else {
              console.error('🗑️ EXTENSION DELETE: Failed:', event.data.error);
              reject(new Error(event.data.error || 'Delete failed'));
            }
          }
        };

        window.addEventListener('message', handleResponse);

        // Send delete request to extension
        window.postMessage({
          channel: 'emma-vault-bridge',
          type: 'EMMA_DELETE_MEMORY',
          messageId: messageId,
          memoryId: memoryId
        }, window.location.origin);

        // Timeout after 10 seconds
        setTimeout(() => {
          window.removeEventListener('message', handleResponse);
          reject(new Error('Delete operation timed out'));
        }, 10000);
      });
    }

    // Normal vault mode
    if (!this.isOpen) throw new Error('No vault is open');

    if (!this.vaultData.content.memories[memoryId]) {
      return { success: false, error: 'Memory not found' };
    }

    delete this.vaultData.content.memories[memoryId];
    if (this.vaultData.stats.memoryCount > 0) this.vaultData.stats.memoryCount--;

    await this.autoSave();
    return { success: true };
  }

  /**
   * Add person (IDENTICAL API to desktop version!)
   */
  async addPerson({ name, relation, contact, avatar }) {
    // Extension mode: Route through extension instead of web app vault
    if (this.extensionAvailable) {

      // Send person to extension for saving to actual vault
      const personData = {
        name: name,
        relation: relation,
        contact: contact,
        avatar: avatar,
        created: new Date().toISOString()
      };

      // Notify extension to save this person
      window.postMessage({
        channel: 'emma-vault-bridge',
        type: 'SAVE_PERSON',
        data: personData
      }, window.location.origin);

      // Return success immediately - extension handles actual saving
      const personId = this.generateId('person');
      return { id: personId, success: true };
    }

    // Normal vault mode
    if (!this.isOpen) {
      throw new Error('No vault is open');
    }

    try {
      const personId = this.generateId('person');

      const person = {
        id: personId,
        name: name,
        relation: relation || '',
        contact: contact || '',
        created: new Date().toISOString(),
        avatarId: null,
        memoryCount: 0
      };

      // Handle avatar: accept existing mediaId or data URL
      if (avatar) {
        try {
          if (typeof avatar === 'string' && this.vaultData?.content?.media && this.vaultData.content.media[avatar]) {
            // Avatar is an existing media ID
            person.avatarId = avatar;
          } else if (typeof avatar === 'string' && avatar.startsWith('data:')) {
            // Avatar is a data URL - store as new media
            person.avatarId = await this.addMedia({
              type: 'image/jpeg',
              data: avatar,
              name: `${name}-avatar`
            });
          } else {
            // Unknown format - attempt best-effort store
            person.avatarId = await this.addMedia({
              type: 'image/jpeg',
              data: avatar,
              name: `${name}-avatar`
            });
          }
        } catch (avatarErr) {
          console.warn('⚠️ Failed to process avatar, continuing without:', avatarErr);
        }
      }

      this.vaultData.content.people[personId] = person;
      this.vaultData.stats.peopleCount++;

      // Auto-save with direct-save-only error handling
      try {
        await this.autoSave();

        return { success: true, person: person };
      } catch (saveError) {
        // Remove the person from memory since save failed
        delete this.vaultData.content.people[personId];
        this.vaultData.stats.peopleCount--;

        console.error('❌ Person save failed - rolled back:', saveError);
        throw new Error(`Failed to save person: ${saveError.message}`);
      }

    } catch (error) {
      console.error('❌ Failed to add person:', error);
      throw error;
    }
  }

  /**
   * Update an existing person
   */
  async updatePerson({ id, name, relation, contact, avatar }) {
    if (!this.isOpen) throw new Error('No vault is open');
    if (!id) throw new Error('Missing person id');

    const existing = this.vaultData.content.people[id];
    if (!existing) throw new Error('Person not found');

    // Apply updates
    if (typeof name === 'string') existing.name = name;
    if (typeof relation === 'string') existing.relation = relation;
    if (typeof contact === 'string') existing.contact = contact;
    existing.updated = new Date().toISOString();

    if (avatar) {
      try {
        if (typeof avatar === 'string' && this.vaultData?.content?.media && this.vaultData.content.media[avatar]) {
          existing.avatarId = avatar;
        } else if (typeof avatar === 'string' && avatar.startsWith('data:')) {
          existing.avatarId = await this.addMedia({
            type: 'image/jpeg',
            data: avatar,
            name: `${existing.name || 'person'}-avatar`
          });
        }
      } catch (avatarErr) {
        console.warn('⚠️ Failed to update avatar:', avatarErr);
      }
    }

    try {
      await this.autoSave();
      return { success: true, person: existing };
    } catch (saveError) {
      console.error('❌ Person update save failed:', saveError);
      throw new Error(`Failed to save person update: ${saveError.message}`);
    }
  }

  /**
   * Delete a person by id
   */
  async deletePerson(personId) {
    if (!this.isOpen) throw new Error('No vault is open');
    if (!personId) throw new Error('Missing person id');

    if (!this.vaultData.content.people[personId]) {
      return { success: false, error: 'Person not found' };
    }

    delete this.vaultData.content.people[personId];
    if (this.vaultData.stats.peopleCount > 0) this.vaultData.stats.peopleCount--;

    await this.autoSave();
    return { success: true };
  }

  /**
   * List people (IDENTICAL API to desktop version!)
   */
  async listPeople() {
    // Pure web app mode: Get people from vault data directly
    if (this.isOpen && this.vaultData) {

      const vaultPeople = this.vaultData.content?.people || {};
      const vaultMedia = this.vaultData.content?.media || {};

      // Convert people object to array with avatar URLs
      const people = Object.values(vaultPeople).map(person => {
        let avatarUrl = person.avatarUrl;

        // Resolve avatar from media if needed
        if (!avatarUrl && person.avatarId && vaultMedia[person.avatarId]) {
          const mediaItem = vaultMedia[person.avatarId];
          avatarUrl = mediaItem.data.startsWith('data:')
            ? mediaItem.data
            : `data:${mediaItem.type};base64,${mediaItem.data}`;
        }

        return {
          ...person,
          avatarUrl
        };
      });

      return people;
    }

    // Fallback for non-extension mode
    return [];
  }

  /**
   * Add media file with encryption
   */
  async addMedia({ type, data, name, file }) {

    console.log('🔥 ADD_MEDIA DEBUG: Received parameters:', {
      type,
      name,
      hasFile: !!file,
      hasData: !!data,
      dataType: typeof data,
      dataLength: data?.length,
      dataConstructor: data?.constructor?.name,
      dataStart: typeof data === 'string' ? data.substring(0, 50) : 'not string'
    });
    // Extension mode: Route media saving through extension
    if (this.extensionAvailable) {

      // Convert file to base64 for sending to extension
      let base64Data;
      if (file) {
        const reader = new FileReader();
        base64Data = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else {
        base64Data = data; // Already base64 or data URL
      }

      // Send media to extension for saving
      const mediaData = {
        name: name || file?.name,
        type: type || file?.type,
        size: file?.size || 0,
        data: base64Data,
        created: new Date().toISOString()
      };

      // Notify extension to save this media
      window.postMessage({
        channel: 'emma-vault-bridge',
        type: 'SAVE_MEDIA',
        data: mediaData
      }, window.location.origin);

      // Return success immediately - extension handles actual saving
      const mediaId = this.generateId('media');
      return mediaId;
    }

    try {
      const mediaId = this.generateId('media');

      let mediaData;
      console.log('🔥 MEDIA DATA TYPE CHECK:', {
        hasFile: !!file,
        hasData: !!data,
        dataType: typeof data,
        isArrayBuffer: data instanceof ArrayBuffer,
        isString: typeof data === 'string',
        dataConstructor: data?.constructor?.name,
        dataPreview: typeof data === 'string' ? data.substring(0, 100) : 'not string'
      });

      if (file) {

        mediaData = await this.fileToArrayBuffer(file);
      } else if (data instanceof ArrayBuffer) {

        mediaData = data;
      } else if (typeof data === 'string') {
        console.log('📝 Using string data (base64/dataURL)');
        // SPECIAL CASE: For extension captures, store data URLs directly without encryption
        if (data.startsWith('data:')) {
          console.log('🔧 EXTENSION CAPTURE: Storing data URL directly without encryption');
          const media = {
            id: mediaId,
            name: name,
            type: type,
            size: data.length,
            created: new Date().toISOString(),
            encrypted: false, // Mark as unencrypted
            data: data // Store data URL directly
          };

          // Ensure media storage exists
          if (!this.vaultData.content.media) {
            this.vaultData.content.media = {};
          }

          this.vaultData.content.media[mediaId] = media;
          this.vaultData.stats.mediaCount++;
          this.vaultData.stats.totalSize += data.length;

          return mediaId;
        }
        // Base64 or data URL - convert to ArrayBuffer for encryption
        mediaData = this.dataURLToArrayBuffer(data);
      } else {
        console.error('❌ INVALID DATA FORMAT - DETAILED ANALYSIS:', {
          hasFile: !!file,
          hasData: !!data,
          dataType: typeof data,
          dataIsNull: data === null,
          dataIsUndefined: data === undefined,
          dataValue: data,
          parametersReceived: { type, data, name, file }
        });
        throw new Error(`Invalid media data format - got ${typeof data}, expected File object, ArrayBuffer, or string`);
      }

      // Encrypt media data
      const encryptedData = await this.encryptData(mediaData);

      const media = {
        id: mediaId,
        name: name,
        type: type,
        size: mediaData.byteLength,
        created: new Date().toISOString(),
        encrypted: true,
        data: encryptedData
      };

      // Ensure media storage exists
      if (!this.vaultData.content.media) {
        this.vaultData.content.media = {};
      }

      this.vaultData.content.media[mediaId] = media;
      this.vaultData.stats.mediaCount++;
      this.vaultData.stats.totalSize += mediaData.byteLength;

      return mediaId;

    } catch (error) {
      console.error('❌ Failed to add media:', error);
      throw error;
    }
  }

  /**
   * Get media file (decrypted)
   */
  async getMedia(mediaId) {
    if (!this.isOpen) throw new Error('No vault is open');

    // Restore passphrase from session if missing
    if (!this.passphrase) {
      this.passphrase = sessionStorage.getItem('emmaVaultPassphrase');

    } else {

    }

    if (!this.passphrase) {
      throw new Error('No passphrase available - please unlock vault first');
    }

    try {
      const media = this.vaultData.content.media[mediaId];
      if (!media) {
        throw new Error('Media not found');
      }

      // CRITICAL FIX: Handle both encrypted and unencrypted media
      if (media.encrypted === false || typeof media.data === 'string') {
        // Unencrypted data (base64 data URL) - return directly
        console.log('📸 MEDIA: Returning unencrypted media data:', mediaId);
        
        if (media.data.startsWith('data:')) {
          // Already a data URL - return as is
          return media.data;
        } else {
          // Base64 string - convert to data URL
          return `data:${media.type};base64,${media.data}`;
        }
      } else {
        // Encrypted data - decrypt first
        console.log('🔐 MEDIA: Decrypting encrypted media data:', mediaId);
        
        let salt = this.vaultData.encryption.salt;
        if (salt && typeof salt === 'object' && !(salt instanceof Uint8Array)) {
          // Convert plain object back to Uint8Array
          salt = new Uint8Array(Object.values(salt));
        }

        // Decrypt media data using vault salt and passphrase
        const decryptedData = await this.decryptData(media.data, salt, this.passphrase);

        // Convert to blob URL for display
        const blob = new Blob([decryptedData], { type: media.type });
        return URL.createObjectURL(blob);
      }

    } catch (error) {
      console.error('❌ Failed to get media:', error);
      // Fallback: if decryption fails, try treating as unencrypted
      const media = this.vaultData.content.media[mediaId];
      if (media && typeof media.data === 'string') {
        console.log('🔄 MEDIA: Decryption failed, trying as unencrypted data');
        if (media.data.startsWith('data:')) {
          return media.data;
        } else {
          return `data:${media.type};base64,${media.data}`;
        }
      }
      throw error;
    }
  }

  /**
   * Remove media by id and scrub references
   */
  async removeMedia(mediaId) {
    if (!this.isOpen) throw new Error('No vault is open');
    if (!mediaId) throw new Error('Missing media id');

    // If media does not exist, nothing to do
    if (!this.vaultData.content.media[mediaId]) {
      return { success: false, error: 'Media not found' };
    }

    try {
      const removed = this.vaultData.content.media[mediaId];
      const removedSize = removed?.size || 0;

      // Remove references from memories.attachments
      const memories = this.vaultData.content.memories || {};
      for (const memId of Object.keys(memories)) {
        const mem = memories[memId];
        if (Array.isArray(mem.attachments)) {
          const before = mem.attachments.length;
          mem.attachments = mem.attachments.filter(att => att.id !== mediaId);
          const after = mem.attachments.length;
          if (before !== after) {
            // If thumbnail referenced this media, clear it (optional re-gen later)
            if (mem.thumbnail && mem.thumbnail.mediaId === mediaId) {
              mem.thumbnail = null;
            }
          }
        }
      }

      // Remove references from people avatars
      const people = this.vaultData.content.people || {};
      for (const personId of Object.keys(people)) {
        const person = people[personId];
        if (person.avatarId === mediaId) {
          person.avatarId = null;
        }
      }

      // Remove from media and stats
      delete this.vaultData.content.media[mediaId];
      if (this.vaultData.stats.mediaCount > 0) this.vaultData.stats.mediaCount--;
      if (typeof this.vaultData.stats.totalSize === 'number') {
        this.vaultData.stats.totalSize = Math.max(0, this.vaultData.stats.totalSize - removedSize);
      }

      await this.autoSave();
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to remove media:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get vault statistics (IDENTICAL API to desktop version!)
   */
  getStats() {
    if (!this.isOpen) return null;

    // CRITICAL FIX: Handle case where vault is open but data not loaded yet
    if (!this.vaultData || !this.vaultData.stats) {

      return {
        memoryCount: 0,
        peopleCount: 0,
        mediaCount: 0,
        isOpen: true,
        name: 'Loading...',
        created: null
      };
    }

    return {
      ...this.vaultData.stats,
      isOpen: true,
      name: this.vaultData.name,
      created: this.vaultData.created
    };
  }

  /**
   * Auto-save with CRITICAL .emma file sync requirement
   * EMMA ETHOS: .emma file is the single source of truth
   */
  async autoSave() {

    // 🔥 CRITICAL: .emma file MUST be updated or operation fails
    const hasFileSystemAccess = 'showOpenFilePicker' in window;

    if (hasFileSystemAccess && this.fileHandle) {
      // ✅ PREFERRED: Direct save to original file
      console.log('💾 VAULT: Saving directly to .emma file');
      
      // Show sync status
      if (window.emmaSyncStatus) {
        window.emmaSyncStatus.show('syncing', 'Saving to .emma file...');
      }
      
      this.pendingChanges = true;
      this.scheduleElegantSave();
      
      // Save to IndexedDB as backup only AFTER file save is scheduled
      try {
        await this.saveToIndexedDB();
      } catch (error) {
        console.warn('⚠️ BACKUP: IndexedDB save failed (non-critical):', error);
      }
      
    } else if (hasFileSystemAccess && !this.fileHandle) {
      // 🚨 CRITICAL: Try to restore file handle first
      console.warn('⛔ CRITICAL: No file handle - attempting restoration...');
      
      try {
        const restored = await this.reEstablishFileAccess();
        // If successful, retry save
        if (restored && this.fileHandle) {
          console.log('✅ File handle restored - retrying save');
          return await this.autoSave();
        }
      } catch (restoreError) {
        console.error('❌ File handle restoration failed:', restoreError);
      }
      
      // 🚨 CRITICAL: Cannot save to .emma file - BLOCK THE OPERATION
      if (window.emmaSyncStatus) {
        window.emmaSyncStatus.show('error', '.emma file access lost');
      }
      this.showFileSyncError();
      throw new Error('CRITICAL: Cannot save to .emma file - file access lost');
      
    } else {
      // 🔄 FALLBACK: File System Access API not supported
      console.log('📥 FALLBACK: Using download method for .emma file');
      
      // Show fallback sync status
      if (window.emmaSyncStatus) {
        window.emmaSyncStatus.show('warning', 'Download required - browser limitation');
      }
      
      // Save to IndexedDB first
      await this.saveToIndexedDB();
      // Then trigger download of updated .emma file
      await this.downloadVaultFile(this.originalFileName || 'updated-vault.emma');
    }
  }

  /**
   * Schedule debounced elegant save to prevent excessive file writes
   * EMMA ETHOS: Minimize data loss window while preventing file thrashing
   */
  scheduleElegantSave() {
    // Clear any existing timer
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    // 🔥 CRITICAL: Reduced debounce to 500ms for Emma's precious memories
    // Balance between data safety and file performance
    this.saveDebounceTimer = setTimeout(async () => {
      if (this.pendingChanges) {
        console.log('💾 EMMA: Performing immediate .emma file save');
        try {
          await this.performElegantSave();
          this.pendingChanges = false;
          console.log('✅ EMMA: .emma file saved successfully');
          
          // Show success status
          if (window.emmaSyncStatus) {
            window.emmaSyncStatus.show('success', '.emma file updated successfully');
          }
        } catch (error) {
          console.error('❌ EMMA: Critical .emma file save failed:', error);
          
          // Show error status
          if (window.emmaSyncStatus) {
            window.emmaSyncStatus.show('error', '.emma file save failed');
          }
          
          // Show error to user - this is critical
          this.showFileSyncError();
        }
      }
    }, 500); // Reduced from 2000ms to 500ms for Emma's ethos

  }

  /**
   * Perform elegant atomic file update
   */
  async performElegantSave() {
    try {

      // Direct-save-only: Must have file handle
      if (!this.fileHandle || !('createWritable' in this.fileHandle)) {
        console.error('⛔ DIRECT-SAVE: No file handle available');
        this.showDirectSaveAffordance && this.showDirectSaveAffordance();
        throw new Error('Direct save required: no file access available');
      }

      // Perform atomic write to original file
      await this.atomicFileUpdate();

    } catch (error) {
      console.error('❌ DIRECT-SAVE: Save failed:', error);
      throw error; // Propagate error to caller
    }
  }

  /**
   * Atomic file update with integrity protection
   */
  async atomicFileUpdate() {
    try {

      // Generate encrypted vault data
      const encryptedData = await this.encryptVaultData();

      // Perform atomic write
      const writable = await this.fileHandle.createWritable({ keepExistingData: false });
      await writable.write(encryptedData);
      await writable.close(); // Atomic commit

    } catch (error) {
      console.error('❌ ATOMIC: File update failed:', error);
      throw error;
    }
  }

  /**
   * Re-establish file access for continued updates
   */
  async reEstablishFileAccess() {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'Emma Vault Files',
          accept: { 'application/emma': ['.emma'] }
        }]
      });

      const file = await fileHandle.getFile();
      if (file.name === this.originalFileName) {
        this.fileHandle = fileHandle;

        return true;
      } else {

        return false;
      }
    } catch (error) {

      return false;
    }
  }

  // REMOVED: Session storage fallback methods - direct-save-only mode

  /**
   * Lock vault and download updated .emma file
   */
  async lockVault() {
    try {

      // Direct-save-only: Must have file handle for final save
      if (!this.fileHandle || !('createWritable' in this.fileHandle)) {
        console.error('⛔ DIRECT-SAVE: Cannot lock - no file access');
        this.showDirectSaveAffordance && this.showDirectSaveAffordance();
        throw new Error('Direct save required to lock vault');
      }

      // Perform final atomic update
      await this.atomicFileUpdate();

      // 🔥 CRITICAL: Preserve filename for file access restoration
      const preservedFileName = this.originalFileName;
      
      // Clear vault state
      this.isOpen = false;
      this.vaultData = null;
      this.passphrase = null;
      this.fileHandle = null; // Handle cleared but filename preserved
      this.originalFileName = null;

      // Clear session storage (but preserve filename in localStorage)
      sessionStorage.removeItem('emmaVaultActive');
      sessionStorage.removeItem('emmaVaultPassphrase');
      sessionStorage.removeItem('emmaVaultOriginalFileName');

      // CRITICAL FIX: Clear active state but PRESERVE filename for restoration
      localStorage.removeItem('emmaVaultActive');
      localStorage.removeItem('emmaVaultName');
      
      // 🔄 PRESERVE: Keep filename in localStorage for file access restoration
      if (preservedFileName) {
        localStorage.setItem('emmaVaultOriginalFileName', preservedFileName);
        console.log('💾 LOCK: Preserved filename for restoration:', preservedFileName);
      }

      return { success: true };

    } catch (error) {
      console.error('❌ DIRECT-SAVE: Failed to lock vault:', error);
      throw error;
    }
  }

  /**
   * Load vault from IndexedDB (browser storage backup)
   */
  async loadFromIndexedDB() {
    try {
      const request = indexedDB.open('EmmaVault', 3); // Increment to force fresh rebuild

      return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);

        // CRITICAL: Handle database upgrade for version 3
        request.onupgradeneeded = (event) => {

          const db = event.target.result;

          // Delete old object stores if they exist
          if (db.objectStoreNames.contains('vaults')) {
            db.deleteObjectStore('vaults');
          }

          // Create new object store
          const store = db.createObjectStore('vaults', { keyPath: 'id' });

        };

        request.onsuccess = () => {
          const db = request.result;

          // Check if object store exists
          if (!db.objectStoreNames.contains('vaults')) {
            console.warn('⚠️ IndexedDB: Object store "vaults" not found - returning null');
            resolve(null);
            return;
          }

          const transaction = db.transaction(['vaults'], 'readonly');
          const store = transaction.objectStore('vaults');
          const getRequest = store.get('current');

          getRequest.onsuccess = () => {
            const result = getRequest.result;
            if (result && result.data) {

              resolve(result.data);
            } else {

              resolve(null);
            }
          };

          getRequest.onerror = () => reject(getRequest.error);
        };
      });
    } catch (error) {
      console.error('❌ Failed to load from IndexedDB:', error);
      return null;
    }
  }

  /**
   * Restore complete vault state including elegant file system access
   */
  async restoreVaultState() {
    try {

      // CRITICAL FIX: Check if session OR localStorage indicates vault should be unlocked
      const sessionVaultActive = sessionStorage.getItem('emmaVaultActive') === 'true';
      const localVaultActive = localStorage.getItem('emmaVaultActive') === 'true';
      const vaultActive = sessionVaultActive || localVaultActive;

      const vaultName = sessionStorage.getItem('emmaVaultName') || localStorage.getItem('emmaVaultName');
      const passphrase = sessionStorage.getItem('emmaVaultPassphrase');

      // SIMPLIFIED: If vault is marked as active, restore it (don't require passphrase)
      if (vaultActive) {

        // Restore vault data from IndexedDB if available
        const vaultData = await this.loadFromIndexedDB();
        if (vaultData) {
          this.vaultData = vaultData;

        } else {
          // Create minimal vault structure if no IndexedDB data
          this.vaultData = {
            content: { memories: {}, people: {}, media: {} },
            stats: { memoryCount: 0, peopleCount: 0, mediaCount: 0 },
            metadata: { name: vaultName || 'Web Vault' }
          };

        }

        // ALWAYS set vault as open if session is active with passphrase
        this.isOpen = true;
        this.passphrase = passphrase;

        // Restore original filename (check both session and localStorage)
        this.originalFileName = sessionStorage.getItem('emmaVaultOriginalFileName') || 
                               localStorage.getItem('emmaVaultOriginalFileName');
        
        // 🔥 CRITICAL: Try to restore file access for .emma file sync
        if (this.originalFileName && 'showOpenFilePicker' in window) {
          console.log('🔄 RESTORE: Attempting to restore file access for:', this.originalFileName);
          try {
            // Try silent restoration first (may work if browser remembers permission)
            const restored = await this.reEstablishFileAccess();
            if (restored) {
              console.log('✅ RESTORE: File access restored automatically');
            } else {
              console.warn('⚠️ RESTORE: File access not restored - will prompt on first save');
            }
          } catch (error) {
            console.warn('⚠️ RESTORE: File access restoration failed:', error);
            // Not critical - user will be prompted on first save
          }
        }

        return { vaultData: this.vaultData, hasPassphrase: true, hasFileName: !!this.originalFileName };
      } else {

        return null;
      }

    } catch (error) {
      console.error('❌ ELEGANT: Failed to restore vault state:', error);
      return null;
    }
  }

  /**
   * Save vault to IndexedDB (browser storage backup)
   */
  async saveToIndexedDB() {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open('EmmaVault', 3); // Increment version for clean rebuild

        request.onupgradeneeded = (event) => {
          const db = event.target.result;

          // Clear any existing stores first
          const existingStores = Array.from(db.objectStoreNames);
          existingStores.forEach(storeName => {
            try {
              db.deleteObjectStore(storeName);

            } catch (e) {
              console.warn('⚠️ IndexedDB: Could not delete store:', storeName);
            }
          });

          // Create fresh vault store
          const vaultStore = db.createObjectStore('vaults', { keyPath: 'id' });

        };

        request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction(['vaults'], 'readwrite');
          const store = transaction.objectStore('vaults');

          store.put({
            id: 'current',
            data: this.vaultData,
            timestamp: new Date().toISOString()
            // SECURITY: Never store passphrase in IndexedDB
            // User must re-enter passphrase when reopening browser
          });

          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        };

        request.onerror = () => reject(request.error);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Download .emma vault file
   */
  async downloadVaultFile(filename) {
    try {

      if (!this.vaultData) {
        console.error('❌ No vault data available for download');
        return;
      }

      const name = filename || this.originalFileName || this.vaultData.name || 'Emma-Vault';

      // Remove .emma extension if present to avoid double extension
      const baseName = name.replace(/\.emma$/, '');

      // Encrypt vault data
      const encryptedData = await this.encryptVaultData();

      // Create .emma file
      const blob = new Blob([encryptedData], { type: 'application/emma' });

      // Use File System Access API if available
      if (this.fileHandle && 'createWritable' in this.fileHandle) {
        try {
          const writable = await this.fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();

          return;
        } catch (error) {
          console.warn('File System Access failed, falling back to download:', error);
        }
      }

      // Fallback: Download link with clear messaging
      // Download updated vault file (browser security prevents direct file updates)
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.emma`;
      a.click();

      URL.revokeObjectURL(url);

      // Show user message about file update
      if (typeof showToast === 'function') {
        showToast(`📥 Updated ${baseName}.emma downloaded - replace your original file`, 'info');
      }

    } catch (error) {
      console.error('❌ Failed to download vault:', error);
      throw error;
    }
  }

  /**
   * Encrypt vault data for .emma file
   */
  async encryptVaultData(vaultData = null, customPassphrase = null) {
    try {

      // Use provided vault data or default to current
      const dataToEncrypt = vaultData || this.vaultData;

      // Convert vault data to JSON
      const jsonData = JSON.stringify(dataToEncrypt);

      const encoder = new TextEncoder();
      const data = encoder.encode(jsonData);

      // Encrypt using Web Crypto API with specified passphrase

      const encryptedData = await this.encryptData(data, null, customPassphrase);

      // Create .emma file format
      const header = new TextEncoder().encode('EMMA'); // Magic bytes (4 bytes)
      const version = new Uint8Array([1, 0]); // Version 1.0 (2 bytes)
      // Normalize salt to a Uint8Array (32 bytes)
      let salt = dataToEncrypt?.encryption?.salt;
      if (!salt) {
        throw new Error('Vault encryption salt missing');
      }
      if (salt && typeof salt === 'object' && !(salt instanceof Uint8Array)) {
        // Convert IndexedDB/plain object back to Uint8Array
        salt = new Uint8Array(Array.isArray(salt) ? salt : Object.values(salt));
      } else if (typeof salt === 'string') {
        salt = new TextEncoder().encode(salt);
      }
      if (!(salt instanceof Uint8Array)) {
        throw new Error('Invalid vault salt format');
      }
      if (salt.length !== 32) {
        console.warn('⚠️ SALT: Unexpected salt length:', salt.length, '- attempting to proceed with normalized value');
      }
      // Persist normalized salt back in memory to avoid future issues
      try { this.vaultData.encryption.salt = salt; } catch (_) {}

      // Ensure it's Uint8Array for assembly
      salt = new Uint8Array(salt);
      const encryptedArray = new Uint8Array(encryptedData); // Convert ArrayBuffer to Uint8Array
      const totalLength = header.length + version.length + salt.length + encryptedArray.length;

      // Combine header + version + salt + encrypted data
      const result = new Uint8Array(totalLength);
      let offset = 0;

      result.set(header, offset);
      offset += header.length;

      result.set(version, offset);
      offset += version.length;

      result.set(salt, offset);
      offset += salt.length;

      result.set(encryptedArray, offset);

      return result;

    } catch (error) {
      console.error('❌ Failed to encrypt vault data:', error);
      console.error('❌ Error details:', error.stack);
      throw error;
    }
  }

  /**
   * Decrypt .emma vault file
   */
  async decryptVaultFile(file, passphrase) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      // Check magic bytes
      const magic = new TextDecoder().decode(data.slice(0, 4));
      if (magic !== 'EMMA') {
        throw new Error('Invalid .emma file format');
      }

      // Extract components
      const version = data.slice(4, 6);
      const salt = data.slice(6, 38); // 32 bytes salt
      const encryptedData = data.slice(38);      // Decrypt data
      const decryptedData = await this.decryptData(encryptedData.buffer, salt, passphrase);

      // Parse JSON
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(decryptedData);

      // Validate JSON structure before save

      const vaultData = JSON.parse(jsonString);

      // Ensure encryption metadata is present and salt is sourced from file header
      if (!vaultData.encryption) {
        vaultData.encryption = {};
      }
      // Persist the exact salt bytes used by this file for future re-encryptions
      vaultData.encryption.salt = new Uint8Array(salt);

      console.log('- Memory count in file:', Object.keys(vaultData.content?.memories || {}).length);
      console.log('- People count in file:', Object.keys(vaultData.content?.people || {}).length);
      console.log('- Media count in file:', Object.keys(vaultData.content?.media || {}).length);
      console.log('- Memory IDs:', Object.keys(vaultData.content?.memories || {}));
      console.log('- People IDs:', Object.keys(vaultData.content?.people || {}));

      return vaultData;

    } catch (error) {
      console.error('❌ Failed to decrypt vault file:', error);
      throw new Error('Failed to decrypt vault. Please check your passphrase.');
    }
  }

  /**
   * Detect if we are in fallback mode (no direct file access)
   */
  isFallbackMode() {
    return !this.fileHandle && !!this.originalFileName && (typeof window !== 'undefined') && ('showOpenFilePicker' in window);
  }

  /**
   * Show a small, reusable affordance to re-establish direct file save
   */
  showDirectSaveAffordance() {
    try {

      console.log('🔍 AFFORDANCE: isFallbackMode?', this.isFallbackMode());      if (!this.isFallbackMode()) {

        return;
      }

      if (document.getElementById('emma-direct-save-btn')) {

        return; // Already shown
      }

      const btn = document.createElement('button');
      btn.id = 'emma-direct-save-btn';
      btn.innerHTML = '🔓 Enable Direct Save';
      btn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 2147483647;
        padding: 12px 18px;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: #fff;
        border: none;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(239, 68, 68, 0.4);
        font-weight: 600;
        cursor: pointer;
        font-size: 14px;
        animation: pulse 2s infinite;
      `;

      // Add pulsing animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(btn);

      const enable = async () => {
        try {
          btn.disabled = true;
          btn.innerHTML = '🔄 Requesting access...';
          const ok = await this.reEstablishFileAccess();
          if (ok && this.fileHandle) {
            btn.innerHTML = '✅ Direct save enabled!';
            btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            setTimeout(() => btn.remove(), 2000);
            if (typeof showToast === 'function') showToast('✅ Direct save enabled - all changes now save automatically!', 'success');
          } else {
            btn.innerHTML = '🔓 Enable Direct Save';
            btn.disabled = false;
          }
        } catch (e) {
          btn.textContent = 'Enable direct save';
          btn.disabled = false;
        }
      };
      btn.addEventListener('click', enable);
    } catch (_) {}
  }

  /**
   * Encrypt data using Web Crypto API
   */
  async encryptData(data, customSalt, customPassphrase) {
    try {

      let salt = customSalt || this.vaultData.encryption.salt;
      const passphrase = customPassphrase || this.passphrase;

      if (salt && typeof salt === 'object' && !(salt instanceof Uint8Array)) {
        salt = new Uint8Array(Object.values(salt));

      }

      // Ensure data is ArrayBuffer or Uint8Array
      let dataToEncrypt;
      if (data instanceof ArrayBuffer) {
        dataToEncrypt = data;
      } else if (data instanceof Uint8Array) {
        dataToEncrypt = data.buffer;
      } else {
        throw new Error('Data must be ArrayBuffer or Uint8Array');
      }

      // Derive key from passphrase

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(passphrase),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      // Ensure salt is a Uint8Array
      const saltBuffer = typeof salt === 'string' ? new TextEncoder().encode(salt) : new Uint8Array(salt);

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: saltBuffer,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      // Generate IV

      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt data

      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        dataToEncrypt
      );

      // Combine IV + encrypted data

      const encryptedArray = new Uint8Array(encryptedData);
      const totalLength = iv.length + encryptedArray.length;

      const result = new Uint8Array(totalLength);

      result.set(iv, 0);

      result.set(encryptedArray, iv.length);

      return result.buffer;

    } catch (error) {
      console.error('❌ Encryption failed:', error);
      console.error('❌ Error details:', error.stack);
      throw error;
    }
  }

  /**
   * Decrypt data using Web Crypto API
   */
  async decryptData(encryptedData, customSalt, customPassphrase) {
    try {
      const salt = customSalt || this.vaultData.encryption.salt;
      const passphrase = customPassphrase || this.passphrase;      // Extract IV and data
      const data = new Uint8Array(encryptedData);
      const iv = data.slice(0, 12);
      const encrypted = data.slice(12);      // Derive key from passphrase
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(passphrase),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      let saltBuffer;
      if (typeof salt === 'string') {
        saltBuffer = new TextEncoder().encode(salt);
      } else if (salt && typeof salt === 'object' && !(salt instanceof Uint8Array)) {
        // Convert IndexedDB object back to Uint8Array
        saltBuffer = new Uint8Array(Object.values(salt));

      } else {
        saltBuffer = new Uint8Array(salt);
      }

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: saltBuffer,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      // Decrypt data
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted
      );

      return decryptedData;

    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw error;
    }
  }

  // Helper methods
  generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSalt() {
    return crypto.getRandomValues(new Uint8Array(32));
  }

  async fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  dataURLToArrayBuffer(dataURL) {
    const base64 = dataURL.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async generateThumbnail(mediaId) {
    try {
      const mediaUrl = await this.getMedia(mediaId);

      // Create canvas for thumbnail
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      return new Promise((resolve) => {
        img.onload = () => {
          // Calculate thumbnail size (maintain aspect ratio)
          const maxSize = 150;
          let { width, height } = img;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and convert to data URL
          ctx.drawImage(img, 0, 0, width, height);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.8);

          URL.revokeObjectURL(mediaUrl);
          resolve(thumbnail);
        };

        img.onerror = () => {
          URL.revokeObjectURL(mediaUrl);
          resolve(null);
        };

        img.src = mediaUrl;
      });

    } catch (error) {
      console.warn('Failed to generate thumbnail:', error);
      return null;
    }
  }

  getDefaultThumbnail(memory) {
    // Return emoji based on memory content or metadata
    const emotion = memory.metadata?.emotion || 'neutral';
    const emojis = {
      happy: '😊',
      sad: '😢',
      love: '💕',
      excited: '🎉',
      peaceful: '🌸',
      neutral: '📝'
    };
    return emojis[emotion] || '📝';
  }

  calculateMemorySize(memory) {
    // Estimate memory size in bytes
    const baseSize = JSON.stringify(memory).length;
    const attachmentSize = memory.attachments.reduce((total, att) => total + (att.size || 0), 0);
    return baseSize + attachmentSize;
  }

  /**
   * Check if Emma Vault Extension is available
   */
  async checkExtensionAvailability() {
    // Check for extension marker
    const marker = document.getElementById('emma-vault-extension-marker');
    if (marker || window.EmmaVaultExtension) {
      this.extensionAvailable = true;

      // Extension handles vault - web app just provides UI

      // Listen for extension messages
      this.setupExtensionListeners();

      // Check sync status
      await this.checkExtensionSyncStatus();
    } else {
      // Check again after a delay (extension might still be loading)
      setTimeout(() => this.checkExtensionAvailability(), 1000);
    }
  }

  /**
   * Set up listeners for extension communication
   */
  setupExtensionListeners() {
    // Listen for extension ready event
    window.addEventListener('emma-vault-extension-ready', (event) => {

      this.extensionAvailable = true;
      this.notifyExtensionStatus();
    });

    // Listen for extension messages
    window.addEventListener('message', (event) => {
      if (event.data?.channel === 'emma-vault-bridge') {
        this.handleExtensionMessage(event.data);
      }
    });
  }

  /**
   * Handle messages from extension
   */
  handleExtensionMessage(message) {

    switch (message.type) {
      case 'EXTENSION_READY':
        this.extensionAvailable = true;
        this.notifyExtensionStatus();
        break;

      case 'SYNC_STATUS':
        this.extensionSyncEnabled = message.data.syncEnabled;
        this.notifyExtensionStatus();
        break;

      case 'SYNC_COMPLETE':

        this.showSyncNotification('success', `Saved ${this.formatBytes(message.data.bytesWritten)}`);
        break;

      case 'SYNC_ERROR':
        console.error('❌ Sync error:', message.error);
        this.showSyncNotification('error', 'Sync failed: ' + message.error);
        break;

      case 'VAULT_STATUS':

        if (message.data.vaultOpen) {

          // CRITICAL: Set global vault status for dashboard
          window.currentVaultStatus = {
            isUnlocked: true,
            managedByExtension: true,
            name: message.data.vaultName
          };

          // CRITICAL FIX: Update web vault isOpen flag for extension mode
          this.isOpen = true;
          this.extensionAvailable = true;

          // Update web app status to show vault is ready
          sessionStorage.setItem('emmaVaultActive', 'true');
          sessionStorage.setItem('emmaVaultName', message.data.vaultName || 'Extension Vault');

          // CRITICAL FIX: Also use localStorage as backup (survives tab close/reopen)
          localStorage.setItem('emmaVaultActive', 'true');
          localStorage.setItem('emmaVaultName', message.data.vaultName || 'Extension Vault');

          // Notify dashboard that vault is ready
          window.dispatchEvent(new CustomEvent('extension-vault-ready', {
            detail: {
              vaultReady: true,
              vaultName: message.data.vaultName,
              memoryCount: message.data.memoryCount,
              peopleCount: message.data.peopleCount
            }
          }));

        } else {

          // CRITICAL FIX: Don't auto-lock when extension reports closed!
          // Extension might be temporarily restarting - preserve web app vault state

          // Keep vault open in web app - only lock when user explicitly locks
          // Don't clear storage or force locked state
        }
        break;

    }
  }

  /**
   * Check extension sync status
   */
  async checkExtensionSyncStatus() {
    if (!this.extensionAvailable) return;

    // Request vault status from extension

    window.postMessage({
      channel: 'emma-vault-bridge',
      type: 'REQUEST_VAULT_STATUS'
    }, window.location.origin);
  }

  /**
   * Enable extension sync
   */
  async enableExtensionSync() {
    if (!this.extensionAvailable) {
      throw new Error('Emma Vault Extension not available');
    }

    window.postMessage({
      channel: 'emma-vault-bridge',
      type: 'ENABLE_SYNC'
    }, window.location.origin);
  }

  /**
   * Disable extension sync
   */
  async disableExtensionSync() {
    if (!this.extensionAvailable) return;

    window.postMessage({
      channel: 'emma-vault-bridge',
      type: 'DISABLE_SYNC'
    }, window.location.origin);
  }

  /**
   * Sync vault data through extension
   */
  async syncToExtension() {
    if (!this.extensionAvailable || !this.extensionSyncEnabled || !this.vaultData) {
      return;
    }

    // Prepare vault data for sync
    const syncData = {
      id: this.currentVault,
      name: this.vaultData.name,
      created: this.vaultData.created,
      content: {
        memories: Object.values(this.vaultData.content.memories || {}),
        people: Object.values(this.vaultData.content.people || {}),
        settings: this.vaultData.settings || {}
      }
    };

    // Send to extension
    window.postMessage({
      channel: 'emma-vault-bridge',
      type: 'VAULT_UPDATE',
      data: syncData
    }, window.location.origin);
  }

  /**
   * Override autoSave to sync with extension
   */
  async autoSave() {
    if (!this.isOpen || !this.pendingChanges) return;

    // Clear existing timer
    clearTimeout(this.saveDebounceTimer);

    // Debounce saves
    this.saveDebounceTimer = setTimeout(async () => {
      try {
        // Update stats before saving
        await this.updateStats();

        // Sync to extension if available
        if (this.extensionAvailable && this.extensionSyncEnabled) {
          await this.syncToExtension();
        }

        // Regular auto-save to localStorage
        const vaultKey = `emma_vault_${this.currentVault}`;
        localStorage.setItem(vaultKey, JSON.stringify(this.vaultData));

        // Reset pending changes flag
        this.pendingChanges = false;

      } catch (error) {
        console.error('❌ Auto-save failed:', error);
      }
    }, 1000); // 1 second debounce
  }

  /**
   * Notify UI about extension status
   */
  notifyExtensionStatus() {
    const event = new CustomEvent('emma-extension-status', {
      detail: {
        available: this.extensionAvailable,
        syncEnabled: this.extensionSyncEnabled
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Show sync notification
   */
  showSyncNotification(type, message) {
    // Create or update sync indicator
    let indicator = document.getElementById('emma-sync-notification');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'emma-sync-notification';
      indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: ${type === 'success' ? '#10B981' : '#EF4444'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
      `;
      document.body.appendChild(indicator);
    }

    indicator.textContent = message;
    indicator.style.background = type === 'success' ? '#10B981' : '#EF4444';

    // Auto-hide after 3 seconds
    setTimeout(() => indicator.remove(), 3000);
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
  /**
   * EXACT WORKING CRYPTO: Copied from extension background.js
   */
  async exactWorkingDecrypt(fileData, passphrase) {
    try {

      // Parse .emma file format: EMMA + version + salt + iv + encrypted data
      const data = new Uint8Array(fileData);

      // Check magic bytes
      const magic = new TextDecoder().decode(data.slice(0, 4));
      if (magic !== 'EMMA') {
        throw new Error('Invalid .emma file format');
      }

      // Extract components (EXACT format from working extension)
      const version = data.slice(4, 6);
      const salt = data.slice(6, 38); // 32 bytes
      const iv = data.slice(38, 50); // 12 bytes
      const encrypted = data.slice(50);

      console.log('🔓 EXACT WORKING: Extracted vault components:', {
        magic,
        version: Array.from(version),
        saltLength: salt.length,
        ivLength: iv.length,
        encryptedLength: encrypted.length
      });

      // Derive key from passphrase using PBKDF2 (EXACT parameters)
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(passphrase),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 250000, // EXACT same as extension
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      // Decrypt the data (EXACT same as extension)
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted
      );

      // Parse JSON
      const jsonString = new TextDecoder().decode(decrypted);
      const vaultData = JSON.parse(jsonString);

      console.log('✅ EXACT WORKING: Vault decrypted successfully! Memories:',
        Object.keys(vaultData.content?.memories || {}).length);

      return vaultData;

    } catch (error) {
      console.error('❌ EXACT WORKING: Decryption failed:', error);
      throw new Error('Failed to decrypt vault: ' + error.message);
    }
  }

  /**
   * PURE WEB APP: Native vault encryption (no extension needed)
   */
  async nativeEncryptVault(vaultData, passphrase) {
    try {

      // Generate encryption salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(32));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Convert vault data to bytes
      const jsonString = JSON.stringify(vaultData);
      const dataToEncrypt = new TextEncoder().encode(jsonString);

      // Derive encryption key
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 250000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      // Encrypt the data
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        dataToEncrypt
      );

      // Create .emma file format
      const magicBytes = new TextEncoder().encode('EMMA');
      const encryptedBytes = new Uint8Array(encrypted);

      // Combine all parts: EMMA + salt + iv + encrypted data
      const totalLength = 4 + 32 + 12 + encryptedBytes.length;
      const fileData = new Uint8Array(totalLength);

      let offset = 0;
      fileData.set(magicBytes, offset); offset += 4;
      fileData.set(salt, offset); offset += 32;
      fileData.set(iv, offset); offset += 12;
      fileData.set(encryptedBytes, offset);

      return fileData;

    } catch (error) {
      console.error('❌ NATIVE CRYPTO: Encryption failed:', error);
      throw error;
    }
  }
}

// NOTE: Vault instance is now created by dashboard.html to control timing
// This prevents race conditions during initialization

// Compatibility layer - IDENTICAL API to desktop version!
window.emmaAPI = {
  vault: {
    create: async (data) => {
      return await window.emmaWebVault.createVaultFile(data.name, data.passphrase);
    },

    open: async () => {
      return await window.emmaWebVault.openVaultFile();
    },

    unlock: async (data) => {
      // For web vault, we need to load from IndexedDB and decrypt with passphrase
      try {
        const vaultData = await window.emmaWebVault.loadFromIndexedDB();
        if (!vaultData) {
          return { success: false, error: 'No vault found. Please create or open a vault first.' };
        }

        // If vault data appears to be encrypted, decrypt it
        if (vaultData.encrypted !== false && data.passphrase) {
          try {
            const decryptedData = await window.emmaWebVault.nativeDecryptVault(vaultData, data.passphrase);
            window.emmaWebVault.vaultData = decryptedData;
            window.emmaWebVault.passphrase = data.passphrase;
            window.emmaWebVault.isOpen = true;

            // Set session storage for dashboard
            sessionStorage.setItem('emmaVaultActive', 'true');
            sessionStorage.setItem('emmaVaultName', decryptedData.metadata?.name || decryptedData.name || 'Web Vault');
            // SECURITY: Never store passphrase in web storage

            console.log('✅ Vault unlocked successfully via API!');
            return { success: true, stats: window.emmaWebVault.getStats() };
          } catch (error) {
            console.error('❌ Failed to decrypt vault with provided passphrase:', error);
            return { success: false, error: 'Incorrect passphrase or corrupted vault data' };
          }
        } else {
          // Vault data is not encrypted or already decrypted
          window.emmaWebVault.vaultData = vaultData;
          window.emmaWebVault.isOpen = true;
          if (data.passphrase) {
            window.emmaWebVault.passphrase = data.passphrase;
            // SECURITY: Never store passphrase in web storage - keep in memory only
          }

          sessionStorage.setItem('emmaVaultActive', 'true');
          sessionStorage.setItem('emmaVaultName', vaultData.metadata?.name || vaultData.name || 'Web Vault');

          console.log('✅ Vault opened successfully (unencrypted data)!');
          return { success: true, stats: window.emmaWebVault.getStats() };
        }
      } catch (error) {
        console.error('❌ Failed to unlock vault:', error);
        return { success: false, error: error.message };
      }
    },

    status: () => {
      return {
        hasVault: window.emmaWebVault.isOpen,
        isUnlocked: window.emmaWebVault.isOpen,
        name: window.emmaWebVault.vaultData?.name
      };
    },

    stats: () => {
      return window.emmaWebVault.getStats();
    },

    lock: async () => {
      return await window.emmaWebVault.lockVault();
    },

    attachment: {
      add: async (attachment) => {
        try {
          const mediaId = await window.emmaWebVault.addMedia({
            name: attachment.name,
            type: attachment.type,
            data: attachment.data
          });

          // Extension mode: Route attachment linking through extension
          if (attachment.memoryId && window.emmaWebVault.extensionAvailable) {

            // Extension handles all vault operations - no direct data manipulation
            // Attachment linking should go through proper extension save flow
          }

          return { success: true, id: mediaId };
        } catch (error) {
          console.error('❌ Failed to add attachment:', error);
          return { success: false, error: error.message };
        }
      },
      remove: async (mediaId) => {
        try {
          const res = await window.emmaWebVault.removeMedia(mediaId);
          return { success: res.success };
        } catch (error) {
          console.error('❌ Failed to remove attachment:', error);
          return { success: false, error: error.message };
        }
      }
    }
  },

  memories: {
    getAll: async (limit) => {
      return await window.emmaWebVault.listMemories(limit);
    },

    save: async (memory) => {
      return await window.emmaWebVault.addMemory(memory);
    },

    delete: async (memoryId) => {
      try {
        const res = await window.emmaWebVault.deleteMemory(memoryId);
        return { success: res.success };
      } catch (error) {
        console.error('❌ Failed to delete memory:', error);
        return { success: false, error: error.message };
      }
    }
  },

  people: {
    add: async (person) => {
      return await window.emmaWebVault.addPerson(person);
    },
    update: async (person) => {
      try {
        const res = await window.emmaWebVault.updatePerson(person);
        return { success: true, person: res.person };
      } catch (error) {
        console.error('❌ Failed to update person:', error);
        return { success: false, error: error.message };
      }
    },
    delete: async (personId) => {
      try {
        const res = await window.emmaWebVault.deletePerson(personId);
        return { success: res.success };
      } catch (error) {
        console.error('❌ Failed to delete person:', error);
        return { success: false, error: error.message };
      }
    },

    list: async () => {
      try {
        // CLEAN: Direct vault access since vault should exist on all pages now
        if (!window.emmaWebVault) {
          console.warn('⚠️ EmmaWebVault not available, returning empty people list');
          return { success: true, items: [] };
        }
        
        if (typeof window.emmaWebVault.listPeople !== 'function') {
          console.warn('⚠️ listPeople method not available, returning empty people list');
          return { success: true, items: [] };
        }
        
        console.log('👥 API: Calling vault.listPeople()...');
        const people = await window.emmaWebVault.listPeople();
        console.log(`👥 API: Retrieved ${people?.length || 0} people from vault`);
        return { success: true, items: people || [] };
      } catch (error) {
        console.error('❌ Failed to list people:', error);
        return { success: false, error: error.message, items: [] };
      }
    },

    update: async (personData) => {
      try {

        // Extension mode: Route through extension
        if (window.emmaWebVault && window.emmaWebVault.extensionAvailable) {

          // Send person update to extension for saving to actual vault
          const updateData = {
            id: personData.id,
            name: personData.name,
            relation: personData.relation,
            contact: personData.contact,
            avatar: personData.avatarUrl || personData.avatar, // Use avatarUrl if available
            avatarId: personData.avatarId,
            updated: new Date().toISOString()
          };

          // Notify extension to update this person
          window.postMessage({
            channel: 'emma-vault-bridge',
            type: 'UPDATE_PERSON',
            data: updateData
          }, window.location.origin);

          // Return success immediately - extension handles actual saving
          return { success: true, id: personData.id };
        }

        // Fallback for non-extension mode
        return await window.emmaWebVault.updatePerson(personData);
      } catch (error) {
        console.error('❌ Failed to update person:', error);
        return { success: false, error: error.message };
      }
    }
  },

  media: {
    get: async (mediaId) => {
      return await window.emmaWebVault.getMedia(mediaId);
    }
  }
};

/**
 * Show critical error when .emma file sync is broken
 * EMMA ETHOS: Never silently fail - always inform the user
 */
EmmaWebVault.prototype.showFileSyncError = function() {
  console.error('🚨 CRITICAL: .emma file sync broken - showing user error');
  
  // Remove any existing sync error modal
  const existing = document.querySelector('.emma-sync-error-modal');
  if (existing) existing.remove();
  
  // Create prominent error modal
  const modal = document.createElement('div');
  modal.className = 'emma-sync-error-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(220, 38, 38, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    color: white;
  `;
  
  modal.innerHTML = `
    <div style="
      background: #dc2626;
      padding: 40px;
      border-radius: 20px;
      max-width: 600px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    ">
      <div style="font-size: 48px; margin-bottom: 20px;">🚨</div>
      <h2 style="margin: 0 0 20px 0; font-size: 24px;">CRITICAL: .emma File Access Lost</h2>
      <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.5; opacity: 0.9;">
        Your memories cannot be saved to your .emma file right now. This means your memories 
        would only exist in your browser and could be lost.<br><br>
        <strong>Click below to restore access to your .emma file.</strong>
      </p>
      <button id="restore-file-access" style="
        background: white;
        color: #dc2626;
        border: none;
        padding: 15px 30px;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        margin-right: 15px;
      ">🔗 Restore File Access</button>
      <button id="cancel-save" style="
        background: transparent;
        color: white;
        border: 2px solid white;
        padding: 13px 30px;
        border-radius: 10px;
        font-size: 16px;
        cursor: pointer;
      ">Cancel Save</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Handle restore file access
  document.getElementById('restore-file-access').onclick = async () => {
    try {
      const restored = await this.reEstablishFileAccess();
      if (restored) {
        modal.remove();
        // Show success and retry the save operation
        this.showToast && this.showToast('✅ File access restored! Saving to .emma file...', 'success');
        // The autoSave will retry automatically
      } else {
        window.emmaError('Could not restore file access. Please ensure you select the correct .emma file.', {
          title: 'File Access Issue',
          helpText: 'Let\'s try selecting your .emma file again.'
        });
      }
    } catch (error) {
      console.error('File restoration failed:', error);
      window.emmaError('Failed to restore file access: ' + error.message, {
        title: 'File Access Problem',
        helpText: 'Let\'s try again together.'
      });
    }
  };
  
  // Handle cancel
  document.getElementById('cancel-save').onclick = () => {
    modal.remove();
    // User explicitly chose not to save - this is acceptable
  };
};

// Emma Web Vault System ready for production
console.log('🌟 Emma Web Vault System ready - preserving memories with love! 💜');
