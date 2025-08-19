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
    this.isOpen = false;
    this.autoSaveTimer = null;
    this.passphrase = null;
    this.fileHandle = null; // For File System Access API
    this.pendingChanges = false;
    this.saveDebounceTimer = null;
    this.extensionAvailable = false;
    this.extensionSyncEnabled = false;
    
    console.log('💜 Emma Web Vault initialized with elegant file management');
    
    // Check for Emma Vault Extension
    this.checkExtensionAvailability();
  }

  /**
   * Create new .emma vault file
   * Same API as desktop version!
   */
  async createVaultFile(name, passphrase) {
    try {
      console.log('🌟 EmmaWebVault.createVaultFile called with name:', name, 'passphrase length:', passphrase?.length);
      
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
      sessionStorage.setItem('emmaVaultPassphrase', passphrase); // CRITICAL: Store passphrase for session
      
      // CRITICAL: Set 12-hour auto-unlock when creating .emma file
      const twelveHoursFromNow = Date.now() + (12 * 60 * 60 * 1000); // 12 hours
      localStorage.setItem('emmaVaultSessionExpiry', twelveHoursFromNow.toString());
      console.log('✅ Session storage set - new vault active AND unlocked for 12 hours!');
      
      // Save to IndexedDB as backup
      await this.saveToIndexedDB();
      
      // FORCE download for new vault creation
      console.log('💾 Creating initial .emma file...');
      const originalAutoDownload = this.vaultData.settings?.autoDownload;
      this.vaultData.settings = this.vaultData.settings || {};
      this.vaultData.settings.autoDownload = true; // Force download for new vaults
      
      await this.downloadVaultFile(name);
      
      // Restore original setting
      this.vaultData.settings.autoDownload = originalAutoDownload;
      console.log('✅ Initial .emma file created and downloaded');
      
      console.log('✅ New vault created successfully!');
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
      console.log('📁 Opening vault file:', file?.name);
      
      let fileToProcess = file;
      
      // Store the original filename for better UX
      if (file) {
        this.originalFileName = file.name;
        // Persist for restoration across pages
        try { sessionStorage.setItem('emmaVaultOriginalFileName', file.name); } catch (_) {}
        console.log('📝 ELEGANT: Stored original filename for updates:', file.name);
        
        // CRITICAL: If file is provided but no fileHandle, we need write access
        if (!this.fileHandle && 'showOpenFilePicker' in window) {
          console.log('🔓 ELEGANT: File provided but no write access - requesting permission...');
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
              console.log('✅ ELEGANT: Write access granted for seamless updates!');
            } else {
              console.log('⚠️ ELEGANT: Different file selected, using provided file');
            }
          } catch (error) {
            console.log('ℹ️ ELEGANT: User declined write access, using fallback mode');
          }
        }
      }
      
      // If no file provided, use File System Access API
      if (!file && 'showOpenFilePicker' in window) {
        const [fileHandle] = await window.showOpenFilePicker({
          types: [{
            description: 'Emma Vault Files',
            accept: { 'application/emma': ['.emma'] }
          }]
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
      const vaultData = await this.decryptVaultFile(fileToProcess, passphrase);
      
      this.vaultData = vaultData;
      this.isOpen = true;
      
      // Set session storage for dashboard
      sessionStorage.setItem('emmaVaultActive', 'true');
      sessionStorage.setItem('emmaVaultName', vaultData.metadata?.name || 'Web Vault');
      sessionStorage.setItem('emmaVaultPassphrase', passphrase); // CRITICAL: Store passphrase for session
      
      // CRITICAL: Set 12-hour auto-unlock when opening .emma file
      const twelveHoursFromNow = Date.now() + (12 * 60 * 60 * 1000); // 12 hours
      localStorage.setItem('emmaVaultSessionExpiry', twelveHoursFromNow.toString());
      console.log('✅ Session storage set - vault active AND unlocked for 12 hours!');
      
      // Save to IndexedDB as backup AFTER loading from file
      await this.saveToIndexedDB();
      console.log('✅ ELEGANT: Vault data backed up to IndexedDB');
      
      console.log('🎉 ELEGANT: Vault opened successfully with seamless file access!');
      
      return { success: true, stats: this.getStats() };
      
    } catch (error) {
      console.error('❌ Failed to open vault:', error);
      throw error;
    }
  }

  /**
   * Add memory (IDENTICAL API to desktop version!)
   */
  async addMemory({ content, metadata = {}, attachments = [] }) {
    if (!this.isOpen) throw new Error('No vault is open');
    
    // Check if we need passphrase for encryption and don't have it
    if (attachments.length > 0 && !this.passphrase) {
      console.log('🔐 Passphrase needed for media encryption - requesting from user');
      console.log('🔐 Modal available?', !!window.cleanSecurePasswordModal);
      
      if (window.cleanSecurePasswordModal) {
        try {
          this.passphrase = await window.cleanSecurePasswordModal.show({
            title: 'Unlock Vault for Media',
            message: 'Enter your vault passphrase to encrypt media attachments',
            placeholder: 'Enter vault passphrase...'
          });
          console.log('🔐 Passphrase obtained via secure modal');
        } catch (error) {
          console.error('🔐 Secure modal failed:', error);
          // Fallback to browser prompt
          this.passphrase = prompt('Enter your vault passphrase to encrypt media:');
        }
      } else {
        console.warn('🔐 Secure modal not available - using browser prompt');
        this.passphrase = prompt('Enter your vault passphrase to encrypt media:');
      }
      
      if (!this.passphrase) {
        throw new Error('Passphrase is required to encrypt media attachments');
      }
    }
    
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
      console.log(`🔗 VAULT: Processing ${attachments.length} attachments for memory ${memoryId}`);
      for (const attachment of attachments) {
        console.log('🔗 VAULT: Processing attachment:', attachment.name, attachment.type);
        const mediaId = await this.addMedia(attachment);
        console.log('🔗 VAULT: Media stored with ID:', mediaId);
        
        const attachmentRef = {
          id: mediaId,
          type: attachment.type,
          name: attachment.name,
          size: attachment.size || 0
        };
        
        memory.attachments.push(attachmentRef);
        console.log('🔗 VAULT: Added attachment reference to memory:', attachmentRef);
      }
      
      console.log(`🔗 VAULT: Memory ${memoryId} now has ${memory.attachments.length} attachments`);
      console.log('🔗 VAULT: Final attachments array:', memory.attachments);
      
      // Generate thumbnail for first image
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
        console.log('✅ Memory added and saved:', memoryId);
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
   * List memories (IDENTICAL API to desktop version!)
   */
  async listMemories(limit = 50, offset = 0) {
    if (!this.isOpen) return [];
    
    try {
      const memories = Object.values(this.vaultData.content.memories);
      
      return memories
        .sort((a, b) => new Date(b.created) - new Date(a.created))
        .slice(offset, offset + limit)
        .map(memory => ({
          ...memory,
          thumbnail: memory.thumbnail || this.getDefaultThumbnail(memory)
        }));
        
    } catch (error) {
      console.error('❌ Failed to list memories:', error);
      return [];
    }
  }

  /**
   * Delete a memory by id
   */
  async deleteMemory(memoryId) {
    if (!this.isOpen) throw new Error('No vault is open');
    if (!memoryId) throw new Error('Missing memory id');
    
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
    if (!this.isOpen) throw new Error('No vault is open');
    
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
        console.log('✅ Person added and saved:', personId);
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
    if (!this.isOpen) return [];
    
    try {
      return Object.values(this.vaultData.content.people);
    } catch (error) {
      console.error('❌ Failed to list people:', error);
      return [];
    }
  }

  /**
   * Add media file with encryption
   */
  async addMedia({ type, data, name, file }) {
    try {
      const mediaId = this.generateId('media');
      
      let mediaData;
      if (file) {
        mediaData = await this.fileToArrayBuffer(file);
      } else if (data instanceof ArrayBuffer) {
        mediaData = data;
      } else if (typeof data === 'string') {
        // Base64 or data URL
        mediaData = this.dataURLToArrayBuffer(data);
      } else {
        throw new Error('Invalid media data format');
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
      
      this.vaultData.content.media[mediaId] = media;
      this.vaultData.stats.mediaCount++;
      this.vaultData.stats.totalSize += mediaData.byteLength;
      
      console.log('✅ Media added:', mediaId);
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
      console.log('🔐 MEDIA: Restored passphrase from session storage');
    }
    
    if (!this.passphrase) {
      throw new Error('No passphrase available - vault session may have expired');
    }
    
    try {
      const media = this.vaultData.content.media[mediaId];
      if (!media) {
        throw new Error('Media not found');
      }
      
      // EMERGENCY FIX: Convert salt from IndexedDB object back to Uint8Array
      let salt = this.vaultData.encryption.salt;
      if (salt && typeof salt === 'object' && !(salt instanceof Uint8Array)) {
        // Convert plain object back to Uint8Array
        salt = new Uint8Array(Object.values(salt));
        console.log('🔧 SALT FIX: Converted object salt back to Uint8Array, length:', salt.length);
      }
      
      // Decrypt media data using vault salt and passphrase
      const decryptedData = await this.decryptData(media.data, salt, this.passphrase);
      
      // Convert to blob URL for display
      const blob = new Blob([decryptedData], { type: media.type });
      return URL.createObjectURL(blob);
      
    } catch (error) {
      console.error('❌ Failed to get media:', error);
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
    
    return {
      ...this.vaultData.stats,
      isOpen: true,
      name: this.vaultData.name,
      created: this.vaultData.created
    };
  }

  /**
   * Auto-save with graceful fallback for unsupported browsers
   */
  async autoSave() {
    console.log('💾 AUTO-SAVE: Starting save operation...');
    
    // Check if File System Access API is supported
    const hasFileSystemAccess = 'showOpenFilePicker' in window;
    
    if (hasFileSystemAccess && this.fileHandle) {
      // PREFERRED: Direct save to original file
      console.log('🚀 DIRECT-SAVE: Using File System Access API');
      this.pendingChanges = true;
      this.scheduleElegantSave();
    } else if (hasFileSystemAccess && !this.fileHandle) {
      // File System Access API supported but no handle - show affordance
      console.warn('⛔ DIRECT-SAVE: No file handle - prompting user');
      this.showDirectSaveAffordance && this.showDirectSaveAffordance();
      // Still save to IndexedDB as backup
      await this.saveToIndexedDB();
      throw new Error('Direct save required: no file access available');
    } else {
      // FALLBACK: File System Access API not supported - use download method
      console.log('📥 FALLBACK-SAVE: File System Access API not supported - using download fallback');
      await this.saveToIndexedDB();
      // Auto-download updated vault file
      await this.downloadVaultFile(this.originalFileName || 'updated-vault.emma');
      console.log('✅ FALLBACK-SAVE: Vault downloaded successfully');
    }
    
    // Always save to IndexedDB as backup
    try {
      await this.saveToIndexedDB();
      console.log('✅ BACKUP: Data saved to IndexedDB');
    } catch (error) {
      console.error('❌ BACKUP: IndexedDB save failed:', error);
    }
  }

  /**
   * Schedule debounced elegant save to prevent excessive file writes
   */
  scheduleElegantSave() {
    // Clear any existing timer
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    
    // Schedule save after 2-second debounce
    this.saveDebounceTimer = setTimeout(async () => {
      if (this.pendingChanges) {
        await this.performElegantSave();
        this.pendingChanges = false;
      }
    }, 2000);
    
    console.log('⏱️ ELEGANT: Save scheduled in 2 seconds...');
  }

  /**
   * Perform elegant atomic file update
   */
  async performElegantSave() {
    try {
      console.log('🚀 DIRECT-SAVE: Performing direct file update...');
      
      // Direct-save-only: Must have file handle
      if (!this.fileHandle || !('createWritable' in this.fileHandle)) {
        console.error('⛔ DIRECT-SAVE: No file handle available');
        this.showDirectSaveAffordance && this.showDirectSaveAffordance();
        throw new Error('Direct save required: no file access available');
      }
      
      // Perform atomic write to original file
      await this.atomicFileUpdate();
      console.log('✅ DIRECT-SAVE: Vault file updated seamlessly!');
      
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
      console.log('⚛️ ATOMIC: Starting atomic file update...');
      
      // Generate encrypted vault data
      const encryptedData = await this.encryptVaultData();
      
      // Perform atomic write
      const writable = await this.fileHandle.createWritable({ keepExistingData: false });
      await writable.write(encryptedData);
      await writable.close(); // Atomic commit
      
      console.log('✅ ATOMIC: File updated successfully!');
      
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
        console.log('🔗 ELEGANT: File access re-established');
        return true;
      } else {
        console.log('⚠️ ELEGANT: Different file selected');
        return false;
      }
    } catch (error) {
      console.log('ℹ️ ELEGANT: User cancelled file selection');
      return false;
    }
  }

  // REMOVED: Session storage fallback methods - direct-save-only mode

  /**
   * Lock vault and download updated .emma file
   */
  async lockVault() {
    try {
      console.log('🔒 DIRECT-SAVE: Locking vault with final save...');

      // Direct-save-only: Must have file handle for final save
      if (!this.fileHandle || !('createWritable' in this.fileHandle)) {
        console.error('⛔ DIRECT-SAVE: Cannot lock - no file access');
        this.showDirectSaveAffordance && this.showDirectSaveAffordance();
        throw new Error('Direct save required to lock vault');
      }
      
      // Perform final atomic update
      await this.atomicFileUpdate();
      console.log('✅ DIRECT-SAVE: Final update written to original .emma file');
      
      // Clear vault state
      this.isOpen = false;
      this.vaultData = null;
      this.passphrase = null;
      this.fileHandle = null;
      this.originalFileName = null;
      
      // Clear session storage
      sessionStorage.removeItem('emmaVaultActive');
      sessionStorage.removeItem('emmaVaultPassphrase');
      sessionStorage.removeItem('emmaVaultOriginalFileName');
      localStorage.removeItem('emmaVaultSessionExpiry');
      
      console.log('✅ DIRECT-SAVE: Vault locked successfully');
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
      const request = indexedDB.open('EmmaVault', 1);
      
      return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['vaults'], 'readonly');
          const store = transaction.objectStore('vaults');
          const getRequest = store.get('current');
          
          getRequest.onsuccess = () => {
            const result = getRequest.result;
            if (result && result.data) {
              console.log('✅ Vault data loaded from IndexedDB');
              resolve(result.data);
            } else {
              console.log('📝 No vault data found in IndexedDB');
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
      console.log('🔄 ELEGANT: Restoring complete vault state...');
      
      // Restore vault data from IndexedDB
      const vaultData = await this.loadFromIndexedDB();
      if (vaultData) {
        this.vaultData = vaultData;
        this.isOpen = true;
        console.log('✅ ELEGANT: Vault data restored');
      }
      
      // Restore passphrase from session
      this.passphrase = sessionStorage.getItem('emmaVaultPassphrase');
      if (this.passphrase) {
        console.log('✅ ELEGANT: Passphrase restored from session');
      }
      
      // Restore original filename
      this.originalFileName = sessionStorage.getItem('emmaVaultOriginalFileName');
      if (this.originalFileName) {
        console.log('✅ ELEGANT: Original filename restored:', this.originalFileName);
      }
      
      // Note: fileHandle cannot be restored from storage (not serializable)
      // It will be re-established on first save attempt if needed
      
      return { vaultData, hasPassphrase: !!this.passphrase, hasFileName: !!this.originalFileName };
      
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
        const request = indexedDB.open('EmmaVault', 1);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('vaults')) {
            db.createObjectStore('vaults', { keyPath: 'id' });
          }
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
      console.log('📁 downloadVaultFile called with filename:', filename);
      
      if (!this.vaultData) {
        console.error('❌ No vault data available for download');
        return;
      }
      
      const name = filename || this.originalFileName || this.vaultData.name || 'Emma-Vault';
      console.log('📁 Using vault name for save:', name);
      
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
          console.log('💾 EMERGENCY: Vault updated in original file:', this.originalFileName);
          return;
        } catch (error) {
          console.warn('File System Access failed, falling back to download:', error);
        }
      }
      
      // Fallback: Download link with clear messaging
      console.log('📥 EMERGENCY: Downloading updated vault file (browser security prevents direct file updates)');
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
      
      console.log('💾 Vault downloaded as .emma file');
      
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
      console.log('🔐 Starting vault data encryption...');
      
      // Use provided vault data or default to current
      const dataToEncrypt = vaultData || this.vaultData;
      
      // Convert vault data to JSON
      const jsonData = JSON.stringify(dataToEncrypt);
      console.log('📄 JSON data length:', jsonData.length);
      
      const encoder = new TextEncoder();
      const data = encoder.encode(jsonData);
      console.log('📄 Encoded data length:', data.length);
      
      // Encrypt using Web Crypto API with specified passphrase
      console.log('🔐 Encrypting data with', customPassphrase ? 'custom' : 'session', 'passphrase...');
      const encryptedData = await this.encryptData(data, null, customPassphrase);
      console.log('✅ Data encrypted, length:', encryptedData.byteLength);
      
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
      
      console.log('📦 File components:');
      console.log('- Header length:', header.length);
      console.log('- Version length:', version.length);
      console.log('- Salt length:', salt.length);
      console.log('- Encrypted data length:', encryptedArray.length);
      
      const totalLength = header.length + version.length + salt.length + encryptedArray.length;
      console.log('📦 Total file length:', totalLength);
      
      // Combine header + version + salt + encrypted data
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      console.log('📦 Assembling file...');
      result.set(header, offset);
      offset += header.length;
      console.log('✅ Header set, new offset:', offset);
      
      result.set(version, offset);
      offset += version.length;
      console.log('✅ Version set, new offset:', offset);
      
      result.set(salt, offset);
      offset += salt.length;
      console.log('✅ Salt set, new offset:', offset);
      
      result.set(encryptedArray, offset);
      console.log('✅ Encrypted data set, final length:', result.length);
      
      console.log('✅ Vault data encryption completed successfully!');
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
      const encryptedData = data.slice(38);
      
      console.log('📁 Decrypting vault file...');
      console.log('🔍 DECRYPT DEBUG: File size:', data.length);
      console.log('🔍 DECRYPT DEBUG: Magic bytes:', magic);
      console.log('🔍 DECRYPT DEBUG: Salt length:', salt.length);
      console.log('🔍 DECRYPT DEBUG: Encrypted data length:', encryptedData.length);
      console.log('🔍 DECRYPT DEBUG: Passphrase length:', passphrase.length);
      
      // Decrypt data
      const decryptedData = await this.decryptData(encryptedData.buffer, salt, passphrase);
      
      // Parse JSON
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(decryptedData);
      
      console.log('🚨 EMERGENCY: Decrypted JSON length:', jsonString.length);
      console.log('🚨 EMERGENCY: JSON preview (first 500 chars):', jsonString.substring(0, 500));
      
      const vaultData = JSON.parse(jsonString);
      
      // Ensure encryption metadata is present and salt is sourced from file header
      if (!vaultData.encryption) {
        vaultData.encryption = {};
      }
      // Persist the exact salt bytes used by this file for future re-encryptions
      vaultData.encryption.salt = new Uint8Array(salt);
      
      console.log('🚨 EMERGENCY: Parsed vault data - checking contents:');
      console.log('- Memory count in file:', Object.keys(vaultData.content?.memories || {}).length);
      console.log('- People count in file:', Object.keys(vaultData.content?.people || {}).length);
      console.log('- Media count in file:', Object.keys(vaultData.content?.media || {}).length);
      console.log('- Memory IDs:', Object.keys(vaultData.content?.memories || {}));
      console.log('- People IDs:', Object.keys(vaultData.content?.people || {}));
      
      console.log('✅ Vault decrypted successfully');
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
      console.log('🔍 AFFORDANCE: Checking if should show button...');
      console.log('🔍 AFFORDANCE: isFallbackMode?', this.isFallbackMode());
      console.log('🔍 AFFORDANCE: fileHandle?', !!this.fileHandle);
      console.log('🔍 AFFORDANCE: originalFileName?', !!this.originalFileName);
      console.log('🔍 AFFORDANCE: showOpenFilePicker supported?', 'showOpenFilePicker' in window);
      
      if (!this.isFallbackMode()) {
        console.log('📢 AFFORDANCE: Not in fallback mode - no button needed');
        return;
      }
      
      if (document.getElementById('emma-direct-save-btn')) {
        console.log('📢 AFFORDANCE: Button already exists - skipping');
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
      console.log('🔐 encryptData called with data length:', data.length || data.byteLength);
      
      let salt = customSalt || this.vaultData.encryption.salt;
      const passphrase = customPassphrase || this.passphrase;
      
      // EMERGENCY FIX: Convert salt from IndexedDB object back to Uint8Array if needed
      if (salt && typeof salt === 'object' && !(salt instanceof Uint8Array)) {
        salt = new Uint8Array(Object.values(salt));
        console.log('🔧 ENCRYPT SALT FIX: Converted object salt to Uint8Array, length:', salt.length);
      }
      
      console.log('🔐 Using salt length:', salt?.length, 'passphrase length:', passphrase?.length);
      
      // Ensure data is ArrayBuffer or Uint8Array
      let dataToEncrypt;
      if (data instanceof ArrayBuffer) {
        dataToEncrypt = data;
      } else if (data instanceof Uint8Array) {
        dataToEncrypt = data.buffer;
      } else {
        throw new Error('Data must be ArrayBuffer or Uint8Array');
      }
      
      console.log('🔐 Data to encrypt length:', dataToEncrypt.byteLength);
      
      // Derive key from passphrase
      console.log('🔑 Importing key material...');
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(passphrase),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );
      
      console.log('🔑 Deriving encryption key...');
      // Ensure salt is a Uint8Array
      const saltBuffer = typeof salt === 'string' ? new TextEncoder().encode(salt) : new Uint8Array(salt);
      console.log('🔑 Salt buffer length:', saltBuffer.length);
      
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
      console.log('🔐 Generating IV...');
      const iv = crypto.getRandomValues(new Uint8Array(12));
      console.log('🔐 IV length:', iv.length);
      
      // Encrypt data
      console.log('🔐 Encrypting data with AES-GCM...');
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        dataToEncrypt
      );
      console.log('✅ Encryption completed, encrypted length:', encryptedData.byteLength);
      
      // Combine IV + encrypted data
      console.log('📦 Combining IV and encrypted data...');
      const encryptedArray = new Uint8Array(encryptedData);
      const totalLength = iv.length + encryptedArray.length;
      console.log('📦 Total result length will be:', totalLength);
      
      const result = new Uint8Array(totalLength);
      
      console.log('📦 Setting IV at offset 0, length:', iv.length);
      result.set(iv, 0);
      
      console.log('📦 Setting encrypted data at offset:', iv.length, 'length:', encryptedArray.length);
      result.set(encryptedArray, iv.length);
      
      console.log('✅ encryptData completed successfully, result length:', result.length);
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
      const passphrase = customPassphrase || this.passphrase;
      
      console.log('🔍 DECRYPT DATA DEBUG: Starting decryption...');
      console.log('🔍 DECRYPT DATA DEBUG: Encrypted data length:', encryptedData.byteLength);
      console.log('🔍 DECRYPT DATA DEBUG: Salt provided:', !!customSalt);
      console.log('🔍 DECRYPT DATA DEBUG: Passphrase provided:', !!customPassphrase);
      console.log('🔍 DECRYPT DATA DEBUG: Using passphrase length:', passphrase?.length);
      
      // Extract IV and data
      const data = new Uint8Array(encryptedData);
      const iv = data.slice(0, 12);
      const encrypted = data.slice(12);
      
      console.log('🔍 DECRYPT DATA DEBUG: IV length:', iv.length);
      console.log('🔍 DECRYPT DATA DEBUG: Encrypted payload length:', encrypted.length);
      
      // Derive key from passphrase
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(passphrase),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );
      
      // EMERGENCY FIX: Handle all salt formats (string, object from IndexedDB, Uint8Array)
      let saltBuffer;
      if (typeof salt === 'string') {
        saltBuffer = new TextEncoder().encode(salt);
      } else if (salt && typeof salt === 'object' && !(salt instanceof Uint8Array)) {
        // Convert IndexedDB object back to Uint8Array
        saltBuffer = new Uint8Array(Object.values(salt));
        console.log('🔧 DECRYPT SALT FIX: Converted object salt to Uint8Array');
      } else {
        saltBuffer = new Uint8Array(salt);
      }
      console.log('🔑 DECRYPT: Salt buffer length:', saltBuffer.length);
      
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
      console.log('🔗 Emma Vault Extension detected! Version:', window.EmmaVaultExtension?.version);
      
      // CRITICAL: Initialize mock vault immediately when extension detected
      await this.initializeExtensionVault();
      
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
   * Initialize mock vault for extension mode
   */
  async initializeExtensionVault() {
    console.log('🔗 Initializing mock vault for extension mode...');
    
    // Set up mock vault data
    this.isOpen = true;
    this.currentVault = 'extension-managed-vault';
    this.vaultData = {
      version: '1.0',
      name: 'Extension Vault',
      created: new Date().toISOString(),
      encryption: {
        enabled: true,
        algorithm: 'AES-GCM'
      },
      content: {
        memories: {},
        people: {},
        settings: {}
      },
      stats: {
        memoryCount: 0,
        peopleCount: 0,
        totalSize: 0
      }
    };
    
    // Set session storage
    sessionStorage.setItem('emmaVaultActive', 'true');
    sessionStorage.setItem('emmaVaultName', 'Extension Vault');
    
    // Set global vault status
    window.currentVaultStatus = { 
      isUnlocked: true, 
      managedByExtension: true,
      name: 'Extension Vault'
    };
    
    console.log('✅ Mock vault initialized for extension mode');
    console.log('✅ Vault state: isOpen =', this.isOpen, ', currentVault =', this.currentVault);
    
    // Notify other components that vault is ready
    window.dispatchEvent(new CustomEvent('extension-vault-ready', {
      detail: { vaultData: this.vaultData }
    }));
  }

  /**
   * Set up listeners for extension communication
   */
  setupExtensionListeners() {
    // Listen for extension ready event
    window.addEventListener('emma-vault-extension-ready', (event) => {
      console.log('🔗 Extension ready event received:', event.detail);
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
    console.log('📨 Extension message received:', message.type);
    
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
        console.log('✅ Vault synced to local file:', message.data);
        this.showSyncNotification('success', `Saved ${this.formatBytes(message.data.bytesWritten)}`);
        break;
        
      case 'SYNC_ERROR':
        console.error('❌ Sync error:', message.error);
        this.showSyncNotification('error', 'Sync failed: ' + message.error);
        break;
    }
  }

  /**
   * Check extension sync status
   */
  async checkExtensionSyncStatus() {
    if (!this.extensionAvailable) return;
    
    // Request sync status from extension
    window.postMessage({
      channel: 'emma-vault-bridge',
      type: 'REQUEST_SYNC_STATUS'
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
        
        console.log('💾 Auto-saved vault:', this.currentVault);
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
}

// Global instance - ONLY create if doesn't exist (prevent data loss!)
if (!window.emmaWebVault) {
  window.emmaWebVault = new EmmaWebVault();
  console.log('🌟 EmmaWebVault created for first time');
} else {
  console.log('✅ EmmaWebVault already exists - preserving data');
}

// Compatibility layer - IDENTICAL API to desktop version!
window.emmaAPI = {
  vault: {
    create: async (data) => {
      return await window.emmaWebVault.createVaultFile(data.name, data.passphrase);
    },
    
    open: async () => {
      return await window.emmaWebVault.openVaultFile();
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
          
          // If memoryId provided, link the attachment
          if (attachment.memoryId && window.emmaWebVault.vaultData.content.memories[attachment.memoryId]) {
            const memory = window.emmaWebVault.vaultData.content.memories[attachment.memoryId];
            if (!memory.attachments) memory.attachments = [];
            
            memory.attachments.push({
              id: mediaId,
              type: attachment.type,
              name: attachment.name,
              size: attachment.size || 0
            });
            
            // Trigger auto-save for attachment linking
            await window.emmaWebVault.autoSave();
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
        const people = await window.emmaWebVault.listPeople();
        return { success: true, items: people };
      } catch (error) {
        console.error('❌ Failed to list people:', error);
        return { success: false, error: error.message, items: [] };
      }
    }
  },
  
  media: {
    get: async (mediaId) => {
      return await window.emmaWebVault.getMedia(mediaId);
    }
  }
};

console.log('🌟 Emma Web Vault System ready - preserving memories with love! 💜');
console.log('🔍 VAULT DEBUG: emmaWebVault created?', !!window.emmaWebVault);
console.log('🔍 VAULT DEBUG: emmaWebVault isOpen?', window.emmaWebVault?.isOpen);
console.log('🔍 VAULT DEBUG: emmaAPI created?', !!window.emmaAPI);
