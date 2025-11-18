/**
 * Emma Web Vault System
 * Browser-compatible .emma file system with Web Crypto API
 * Preserves ALL desktop functionality while working in any browser
 *
 *  Built with love for preserving precious memories
 */

class EmmaWebVault {
  constructor() {
    this.currentVault = null;
    this.vaultData = null;
    this.autoSaveTimer = null;
    this.passphrase = null;
    this._fileHandle = null; // Underlying File System Access API handle
    this._suspendHandlePersistence = false;
    this.fileHandlePersistenceDisabled = false;
    Object.defineProperty(this, 'fileHandle', {
      configurable: true,
      enumerable: true,
      get: () => this._fileHandle,
      set: (handle) => {
        const normalizedHandle = handle || null;
        const previousHandle = this._fileHandle;

        if (previousHandle === normalizedHandle) {
          this._fileHandle = normalizedHandle;
          return;
        }

        this._fileHandle = normalizedHandle;

        if (this._suspendHandlePersistence || this.fileHandlePersistenceDisabled) {
          return;
        }

        if (normalizedHandle) {
          this.persistFileHandle(normalizedHandle).catch(error => {
            console.warn(' FILE-HANDLE: Failed to persist handle:', error);
          });
        } else if (previousHandle) {
          this.clearPersistedFileHandle().catch(error => {
            console.warn(' FILE-HANDLE: Failed to clear persisted handle:', error);
          });
        }
      }
    });
    this.pendingChanges = false;
    this.saveDebounceTimer = null;
    this.isFileSelectionInProgress = false;
    this.needsFileReauth = false;
    this.originalFileName = null;
    this.autoSavePromptVisible = false;
    this.autoSavePreference = (() => {
      try {
        const storedPref = localStorage.getItem('emmaVaultAutoSavePreference');
        if (storedPref === 'direct' || storedPref === 'browser-only') {
          return storedPref;
        }
      } catch (error) {
        console.warn('[EmmaWebVault] Failed to read auto-save mode preference:', error);
      }
      return 'undecided';
    })();
    this.browserOnlyModeActive = this.autoSavePreference === 'browser-only';
    this.fileSystemAccessAvailable = this.hasNativeFileSystemAccess();
    if (!this.fileSystemAccessAvailable && this.autoSavePreference !== 'browser-only') {
      this.autoSavePreference = 'browser-only';
      this.browserOnlyModeActive = true;
      try {
        localStorage.setItem('emmaVaultAutoSavePreference', 'browser-only');
      } catch (_) {}
    }
    const storedAutoSave = (() => {
      try {
        return localStorage.getItem('emmaVaultAutoSaveEnabled');
      } catch (error) {
        console.warn('[EmmaWebVault] Failed to read auto-save preference:', error);
        return null;
      }
    })();
    if (storedAutoSave === null) {
      try {
        localStorage.setItem('emmaVaultAutoSaveEnabled', 'true');
      } catch (error) {
        console.warn('[EmmaWebVault] Failed to prime auto-save preference:', error);
      }
      this.autoSaveEnabled = true;
    } else {
      this.autoSaveEnabled = storedAutoSave !== 'false';
    }

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
            this.ensureVaultMetadataName(vaultName);

            // SECURITY: Passphrase no longer stored in sessionStorage for security
            // User will be prompted for passphrase when needed
            console.log(' CONSTRUCTOR: Vault restored from IndexedDB - passphrase required for operations');

            console.log(' CONSTRUCTOR: Vault data restored from IndexedDB with',
              Object.keys(vaultData.content?.memories || {}).length, 'memories');
          } else {
            console.warn(' CONSTRUCTOR: No vault data in IndexedDB - creating minimal structure');
            // Fallback to minimal structure
            this.vaultData = {
              content: { memories: {}, people: {}, media: {} },
              stats: { memoryCount: 0, peopleCount: 0, mediaCount: 0 },
              metadata: { name: vaultName }
            };
            this.ensureVaultMetadataName(vaultName);
          }
        } catch (error) {
          console.error(' CONSTRUCTOR: Failed to restore vault data:', error);
          // Fallback to minimal structure
          this.vaultData = {
            content: { memories: {}, people: {}, media: {} },
            stats: { memoryCount: 0, peopleCount: 0, mediaCount: 0 },
            metadata: { name: vaultName }
          };
          this.ensureVaultMetadataName(vaultName);
        }
      }, 100); // Small delay to ensure IndexedDB is ready

    } else {
      this.isOpen = false;

    }

    // Check for Emma Vault Extension
    // PURE WEB APP: No extension communication needed

  }

  cacheSessionPassphrase(passphrase) {
    if (typeof passphrase !== 'string') return;
    const hasValue = passphrase.length > 0 && passphrase.trim().length > 0;
    if (!hasValue) return;
    this.passphrase = passphrase;
    try {
      sessionStorage.setItem('emmaVaultPassphrase', passphrase);
    } catch (error) {
      console.warn(' PASSCODE CACHE: Failed to persist passphrase in sessionStorage:', error);
    }
  }

  ensureVaultMetadataName(preferredName) {
    if (!this.vaultData) {
      return preferredName || null;
    }

    this.vaultData.metadata = this.vaultData.metadata || {};
    const placeholderNames = new Set([
      'Recovered Vault',
      'Recoved Vault',
      'Web Vault',
      'Unknown Vault',
      'Emma Vault'
    ]);
    const existing = typeof this.vaultData.metadata.name === 'string'
      ? this.vaultData.metadata.name.trim()
      : '';
    if (existing && !placeholderNames.has(existing)) {
      this.vaultData.metadata.name = existing;
      return existing;
    }

    const safePreferred = typeof preferredName === 'string' ? preferredName.trim() : '';
    let storedName = '';
    try {
      const sessionName = typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem('emmaVaultName')
        : null;
      const localName = typeof localStorage !== 'undefined'
        ? localStorage.getItem('emmaVaultName')
        : null;
      storedName = (sessionName || localName || '').trim();
    } catch (_) {
      storedName = '';
    }

    const fallbackSources = [
      safePreferred,
      this.vaultData.name,
      this.originalFileName,
      storedName
    ];

    let normalized = '';
    for (const candidate of fallbackSources) {
      const trimmed = typeof candidate === 'string' ? candidate.trim() : '';
      if (trimmed && !placeholderNames.has(trimmed)) {
        normalized = trimmed;
        break;
      }
    }

    if (!normalized) {
      normalized = existing || 'Emma Vault';
    }

    this.vaultData.metadata.name = normalized;
    return normalized;
  }

  getPassphrasePromptCopy(context = 'operation') {
    const copy = {
      title: 'Vault Passphrase Required',
      message: 'Please re-enter your vault passphrase to continue. Emma never stores passphrases permanently.',
      placeholder: 'Enter passphrase...',
      promptText: 'Enter your vault passphrase to continue:'
    };

    switch (context) {
      case 'file-save':
        copy.title = 'Save Changes to .emma File';
        copy.message = 'To keep your .emma file secure, re-enter your vault passphrase before saving.';
        break;
      case 'encrypt-data':
        copy.title = 'Secure Memory Save';
        copy.message = 'Emma needs your passphrase to encrypt this memory in your .emma vault.';
        break;
      case 'download':
        copy.title = 'Download Updated Vault';
        copy.message = 'Enter the passphrase that should protect the downloaded .emma file.';
        break;
      default:
        break;
    }

    return copy;
  }

  async ensureActivePassphrase(context = 'operation') {
    const hasPassphrase = typeof this.passphrase === 'string' && this.passphrase.length > 0;
    if (hasPassphrase) {
      return this.passphrase;
    }

    let restored = null;
    try {
      restored = sessionStorage.getItem('emmaVaultPassphrase');
    } catch (error) {
      console.warn(' PASSCODE CACHE: Unable to read sessionStorage:', error);
    }
    if (typeof restored === 'string' && restored.length > 0) {
      this.passphrase = restored;
      return this.passphrase;
    }

    if (typeof window === 'undefined') {
      throw new Error('Passphrase required to continue');
    }

    const copy = this.getPassphrasePromptCopy(context);
    let passphrase = null;

    try {
      if (window.cleanSecurePasswordModal && typeof window.cleanSecurePasswordModal.show === 'function') {
        passphrase = await window.cleanSecurePasswordModal.show({
          title: copy.title,
          message: copy.message,
          placeholder: copy.placeholder
        });
      } else if (typeof window.showPasswordModal === 'function') {
        passphrase = await window.showPasswordModal(copy.message, copy.placeholder || 'Passphrase:');
      } else {
        passphrase = window.prompt(copy.promptText || copy.message);
      }
    } catch (promptError) {
      console.error(' PASSCODE PROMPT: Failed to collect passphrase:', promptError);
      passphrase = null;
    }

    if (typeof passphrase !== 'string' || passphrase.trim().length === 0) {
      throw new Error('Passphrase required to continue.');
    }

    this.cacheSessionPassphrase(passphrase);
    return this.passphrase;
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

      this.cacheSessionPassphrase(passphrase);

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

      const normalizedName = this.ensureVaultMetadataName(name);

      // Set session storage for dashboard
      sessionStorage.setItem('emmaVaultActive', 'true');
      sessionStorage.setItem('emmaVaultName', normalizedName);
      // SECURITY: Passphrase cached in sessionStorage for this tab only (cleared on lock)

      // CRITICAL FIX: Remove automatic session expiry - vault stays unlocked until user locks it
      localStorage.removeItem('emmaVaultSessionExpiry'); // Remove any existing expiry
      console.log(' Session storage set - new vault active AND unlocked (no expiry - user controlled)!');

      // Save to IndexedDB for persistence
      await this.saveToIndexedDB();

      let directFileHandleCaptured = false;
      if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
        try {
          directFileHandleCaptured = await this.saveNewVaultViaSavePicker(name);
        } catch (savePickerError) {
          console.warn(' CREATE: Save picker write failed, falling back to download:', savePickerError);
          directFileHandleCaptured = false;
        }
      }

      if (!directFileHandleCaptured) {
        const originalAutoDownload = this.vaultData.settings?.autoDownload;
        this.vaultData.settings = this.vaultData.settings || {};
        this.vaultData.settings.autoDownload = true; // Force download for new vaults

        await this.downloadVaultFile(name);
        const normalizedFileName = typeof name === 'string' && name.toLowerCase().endsWith('.emma')
          ? name
          : `${name}.emma`;
        if (typeof this.updateOriginalFileName === 'function') {
          this.updateOriginalFileName(normalizedFileName);
        } else {
          this.originalFileName = normalizedFileName;
        }

        // Restore original setting
        this.vaultData.settings.autoDownload = originalAutoDownload;
      }

      this.maybePromptForAutoSave('create');

      return { success: true, name: name };

    } catch (error) {
      console.error(' Failed to create vault:', error);
      throw error;
    }
  }

  /**
   * Open .emma vault file
   * Supports both File System Access API and file input fallback
   */
  async openVaultFile(file) {
    try {
      if (this.isFileSelectionInProgress) {
        console.warn(' VAULT: File selection already in progress - ignoring duplicate request');
        return { success: false, reason: 'file_selection_in_progress' };
      }

      this.isFileSelectionInProgress = true;

      let fileToProcess = file;

      // Store the original filename for better UX
      if (file) {
        this.updateOriginalFileName(file.name);

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

      const openedFile = await fileHandle.getFile();
      this.updateOriginalFileName(openedFile.name);
      this.fileHandle = fileHandle;
      fileToProcess = openedFile;

    }

      if (!fileToProcess) {
        throw new Error('No file selected');
      }

      // Get passphrase securely with CLEAN modal or fallback
      let passphrase = null;
      try {
        if (window.cleanSecurePasswordModal && typeof window.cleanSecurePasswordModal.show === 'function') {
          passphrase = await window.cleanSecurePasswordModal.show({
            title: 'Unlock Vault',
            message: `Enter the passphrase for your vault: ${fileToProcess.name}`,
            placeholder: 'Enter vault passphrase...'
          });
        } else if (typeof window.showPasswordModal === 'function') {
          passphrase = await window.showPasswordModal(`Enter the passphrase for ${fileToProcess.name}`, 'Passphrase:');
        } else {
          passphrase = window.prompt(`Enter the passphrase for ${fileToProcess.name}`);
        }
      } catch (modalError) {
        console.error(' PASSCODE MODAL: Failed to collect passphrase:', modalError);
        passphrase = null;
      }

      if (!passphrase) {
        console.warn(' VAULT: Passphrase entry cancelled - aborting open flow');
        return { success: false, reason: 'passphrase_cancelled' };
      }

      this.cacheSessionPassphrase(passphrase);

      // Decrypt and load vault
      const fileBuffer = await fileToProcess.arrayBuffer();
      const vaultData = await this.nativeDecryptVault(fileBuffer, passphrase);

      this.vaultData = vaultData;
      this.isOpen = true;
      const normalizedName = this.ensureVaultMetadataName(
        vaultData.metadata?.name ||
        vaultData.name ||
        fileToProcess?.name ||
        this.originalFileName ||
        'Web Vault'
      );

      // Set session storage for dashboard
      sessionStorage.setItem('emmaVaultActive', 'true');
      sessionStorage.setItem('emmaVaultName', normalizedName);
      try {
        localStorage.setItem('emmaVaultName', normalizedName);
      } catch (_) {}
      // SECURITY: Passphrase cached in sessionStorage for this tab only (cleared on lock)

      // CRITICAL FIX: Remove automatic session expiry - vault stays unlocked until user locks it
      localStorage.removeItem('emmaVaultSessionExpiry'); // Remove any existing expiry
      console.log(' Session storage set - vault active AND unlocked (no expiry - user controlled)!');

      // Save to IndexedDB as backup AFTER loading from file
      await this.saveToIndexedDB();

      if (!this.fileHandle && typeof this.ensureDirectFileHandle === 'function') {
        try {
          await this.ensureDirectFileHandle('initial-open', { promptOnFailure: true });
        } catch (handleError) {
          console.warn(' FILE-ACCESS: Unable to capture direct file access after open:', handleError);
        }
      }

      return { success: true, stats: this.getStats() };

    } catch (error) {
      console.error(' Failed to open vault:', error);
      throw error;
    } finally {
      this.isFileSelectionInProgress = false;
    }
  }

  /**
   * Add memory (WEBAPP-FIRST: Single source of truth for all memory operations)
   */
  async addMemory({ content, metadata = {}, attachments = [] }) {

    // WEBAPP-FIRST: All memory operations go through webapp vault
    console.log(' WEBAPP-FIRST: Adding memory to webapp vault:', {
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
        console.log(' EMERGENCY FIX: Checking passphrase for memory save');

        if (this.passphrase) {
          console.log(' EMERGENCY FIX: Passphrase available in memory');
        } else {
          console.error(' CRITICAL: No passphrase available - emergency re-authentication required');

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
                // SECURITY: Passphrase cached in sessionStorage for this tab only
                console.log(' EMERGENCY FIX: Passphrase restored and cached');
                this.cacheSessionPassphrase(this.passphrase);
                await this.ensureDirectFileHandle('passphrase-reauth', { promptOnFailure: false });
              }
            } catch (error) {
              console.error(' Secure modal failed:', error);
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

        console.log(' ATTACHMENT DEBUG: Processing attachment:', {
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
          console.error(' ATTACHMENT MISSING DATA:', attachment);
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

        console.error(' Memory save failed - rolled back:', saveError);
        throw new Error(`Failed to save memory: ${saveError.message}`);
      }

    } catch (error) {
      console.error(' Failed to add memory:', error);
      throw error;
    }
  }

  /**
   * Update memory (CRITICAL: Missing method causing data loss!)
   */
  async updateMemory(memoryId, updates) {
    console.log(' VAULT: Updating memory:', memoryId, updates);

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

      console.log(' VAULT: Memory updated successfully:', memoryId);
      console.log(' VAULT: Updated metadata.people:', memory.metadata?.people);

      // Auto-save the vault
      await this.autoSave();

      return { success: true, memory: memory };
    } catch (error) {
      console.error(' VAULT: Failed to update memory:', error);
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
              console.error(' EXTENSION DELETE: Failed:', event.data.error);
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
          console.warn(' Failed to process avatar, continuing without:', avatarErr);
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

        console.error(' Person save failed - rolled back:', saveError);
        throw new Error(`Failed to save person: ${saveError.message}`);
      }

    } catch (error) {
      console.error(' Failed to add person:', error);
      throw error;
    }
  }

  /**
   * Update an existing person
   */
  async updatePerson({ id, name, relation, contact, avatar, avatarId, avatarUrl }) {
    if (!this.isOpen) throw new Error('No vault is open');
    if (!id) throw new Error('Missing person id');

    const existing = this.vaultData.content.people[id];
    if (!existing) throw new Error('Person not found');

    // Apply updates
    if (typeof name === 'string') existing.name = name;
    if (typeof relation === 'string') existing.relation = relation;
    if (typeof contact === 'string') existing.contact = contact;
    existing.updated = new Date().toISOString();

    const avatarParamProvided = typeof avatar !== 'undefined';
    const avatarIdProvided = typeof avatarId !== 'undefined';
    const avatarUrlProvided = typeof avatarUrl !== 'undefined';

    try {
      if (avatarParamProvided) {
        if (avatar === null) {
          existing.avatarId = null;
          delete existing.avatarUrl;
        } else if (typeof avatar === 'string') {
          const mediaStore = this.vaultData?.content?.media || {};
          if (mediaStore[avatar]) {
            existing.avatarId = avatar;
          } else if (avatar.startsWith('data:')) {
            const newAvatarId = await this.addMedia({
              type: 'image/jpeg',
              data: avatar,
              name: `${existing.name || 'person'}-avatar`
            });
            existing.avatarId = newAvatarId;
          } else {
            // Fallback: attempt to store raw string data
            const newAvatarId = await this.addMedia({
              type: 'image/jpeg',
              data: avatar,
              name: `${existing.name || 'person'}-avatar`
            });
            existing.avatarId = newAvatarId;
          }
        }
      } else if (avatarIdProvided) {
        if (avatarId === null) {
          existing.avatarId = null;
          delete existing.avatarUrl;
        } else if (typeof avatarId === 'string') {
          existing.avatarId = avatarId;
        }
      }
    } catch (avatarErr) {
      console.warn(' Failed to update avatar:', avatarErr);
    }

    if (avatarUrlProvided) {
      if (avatarUrl) {
        existing.avatarUrl = avatarUrl;
      } else {
        delete existing.avatarUrl;
      }
    }

    try {
      await this.autoSave();
      return { success: true, person: existing };
    } catch (saveError) {
      console.error(' Person update save failed:', saveError);
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

    console.log(' ADD_MEDIA DEBUG: Received parameters:', {
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
      console.log(' MEDIA DATA TYPE CHECK:', {
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
        console.log(' Using string data (base64/dataURL)');
        // SPECIAL CASE: For extension captures, store data URLs directly without encryption
        if (data.startsWith('data:')) {
          console.log(' EXTENSION CAPTURE: Storing data URL directly without encryption');
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
        console.error(' INVALID DATA FORMAT - DETAILED ANALYSIS:', {
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
      console.error(' Failed to add media:', error);
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
        console.log(' MEDIA: Returning unencrypted media data:', mediaId);
        
        if (media.data.startsWith('data:')) {
          // Already a data URL - return as is
          return media.data;
        } else {
          // Base64 string - convert to data URL
          return `data:${media.type};base64,${media.data}`;
        }
      } else {
        // Encrypted data - decrypt first
        console.log(' MEDIA: Decrypting encrypted media data:', mediaId);
        
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
      console.error(' Failed to get media:', error);
      // Fallback: if decryption fails, try treating as unencrypted
      const media = this.vaultData.content.media[mediaId];
      if (media && typeof media.data === 'string') {
        console.log(' MEDIA: Decryption failed, trying as unencrypted data');
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
      console.error(' Failed to remove media:', error);
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

    if (!this.autoSaveEnabled) {
      this.pendingChanges = true;
      console.debug('[EmmaWebVault] Auto-save disabled by settings; skipping autoSave run');
      return;
    }

    //  CRITICAL: .emma file MUST be updated or operation fails (unless user opts out)
    const hasFileSystemAccess = this.hasNativeFileSystemAccess();
    const wantsDirectSave = this.autoSavePreference !== 'browser-only';

    if (hasFileSystemAccess && !this.fileHandle && wantsDirectSave) {
      try {
        const restored = await this.ensureDirectFileHandle('auto-save', { promptOnFailure: true });
        if (restored && this.fileHandle) {
          this.needsFileReauth = false;
        }
      } catch (handleError) {
        console.warn(' AUTO-SAVE: Failed to restore file handle automatically:', handleError);
      }
    }

    if (hasFileSystemAccess && this.fileHandle) {
      //  PREFERRED: Direct save to original file
      console.log(' VAULT: Saving directly to .emma file');
      
      // Show sync status
      if (window.emmaSyncStatus) {
        window.emmaSyncStatus.show('syncing', 'Saving to .emma file...');
      }
      
      this.pendingChanges = true;
      this.scheduleElegantSave();
      this.needsFileReauth = false;
      const syncModal = document.querySelector('.emma-sync-error-modal');
      if (syncModal) syncModal.remove();
      
      // CRITICAL: Also sync to extension if available (merged from removed duplicate)
      if (this.extensionAvailable && this.extensionSyncEnabled) {
        try {
          await this.syncToExtension();
          console.log(' VAULT: Extension sync completed');
        } catch (extensionError) {
          console.warn(' EXTENSION: Sync failed (non-critical):', extensionError);
        }
      }
      
      // Save to IndexedDB as backup only AFTER file save is scheduled
      try {
        await this.saveToIndexedDB();
      } catch (error) {
        console.warn(' BACKUP: IndexedDB save failed (non-critical):', error);
      }
      
    } else if (hasFileSystemAccess && !this.fileHandle && !wantsDirectSave) {
      //  USER-CHOSEN BROWSER MODE: Keep everything in IndexedDB
      try {
        await this.saveToIndexedDB();
        this.pendingChanges = false;
        this.needsFileReauth = false;
        if (window.emmaSyncStatus) {
          window.emmaSyncStatus.show('info', 'Browser-only mode: changes saved locally. Download when ready.');
        }
        return;
      } catch (browserOnlyError) {
        console.error(' BROWSER-ONLY: IndexedDB save failed:', browserOnlyError);
        throw new Error('Browser-only mode failed to save changes');
      }
    } else if (hasFileSystemAccess && !this.fileHandle) {
      //  GRACEFUL: No file handle - save to IndexedDB and defer file save
      console.warn(' GRACEFUL: No file handle - saving to IndexedDB, will prompt for file access on next user interaction');
      
      // Save to IndexedDB immediately as backup
      try {
        await this.saveToIndexedDB();
        console.log(' GRACEFUL: Saved to IndexedDB backup');

        if (this.isWebappPrimary) {
          // Pure webapp mode treats IndexedDB as primary storage so autosave can proceed
          this.needsFileReauth = false;
          this.pendingChanges = false;
          if (window.emmaSyncStatus) {
            window.emmaSyncStatus.show('success', 'Changes saved to Emma Web Vault');
          }
          return;
        }
        
        // Mark that we need file re-authentication 
        this.needsFileReauth = true;
        this.promptForFileReauth();
        
        // Show gentle notification (not blocking error)
        if (window.emmaSyncStatus) {
          window.emmaSyncStatus.show('warning', 'Changes saved locally - will sync to .emma file when ready');
        }
        
        // Don't throw error - allow operation to continue
        return;
        
      } catch (indexedDBError) {
        console.error(' GRACEFUL: IndexedDB backup also failed:', indexedDBError);
        
        // Only now show error since both methods failed
        if (window.emmaSyncStatus) {
          window.emmaSyncStatus.show('error', 'Cannot save changes - storage unavailable');
        }
        throw new Error('CRITICAL: Cannot save to any storage method');
      }
      
    } else {
      //  FALLBACK: Browser-only mode - keep everything inside this browser
      console.log(' FALLBACK: Browser-only mode active - data saved to IndexedDB');
      try {
        await this.saveToIndexedDB();
        this.pendingChanges = false;
        this.needsFileReauth = false;
        if (window.emmaSyncStatus) {
          window.emmaSyncStatus.show('info', 'Browser-only mode: changes stay local until you download the vault');
        }
      } catch (error) {
        console.error(' FALLBACK: IndexedDB save failed:', error);
        if (window.emmaSyncStatus) {
          window.emmaSyncStatus.show('error', 'Cannot save changes - browser storage unavailable');
        }
        throw error;
      }
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

    //  CRITICAL: Reduced debounce to 500ms for Emma's precious memories
    // Balance between data safety and file performance
    this.saveDebounceTimer = setTimeout(async () => {
      if (this.pendingChanges) {
        console.log(' EMMA: Performing immediate .emma file save');
        try {
          await this.performElegantSave();
          this.pendingChanges = false;
          console.log(' EMMA: .emma file saved successfully');
          
          // Show success status
          if (window.emmaSyncStatus) {
            window.emmaSyncStatus.show('success', '.emma file updated successfully');
          }
        } catch (error) {
          console.error(' EMMA: Critical .emma file save failed:', error);
          
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
        console.error(' DIRECT-SAVE: No file handle available');
        this.needsFileReauth = true;
        this.promptForFileReauth();
        throw new Error('Direct save required: no file access available');
      }

      // Perform atomic write to original file
      await this.atomicFileUpdate();

    } catch (error) {
      console.error(' DIRECT-SAVE: Save failed:', error);
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

      // Perform atomic write with handle preservation
      const writable = await this.fileHandle.createWritable({ keepExistingData: false });
      await writable.write(encryptedData);
      await writable.close(); // Atomic commit
      
      // CRITICAL: Verify file handle is still valid after write
      try {
        // Test handle validity by attempting to get file info
        await this.fileHandle.getFile();
        console.log(' ATOMIC: File handle preserved after write');
      } catch (handleError) {
        console.warn(' ATOMIC: File handle invalidated after write, will need re-auth:', handleError);
        // Don't throw - just log for debugging
      }

    } catch (error) {
      console.error(' ATOMIC: File update failed:', error);
      
      // If write failed, check if it's a handle issue
      if (error.name === 'NotAllowedError' || error.message.includes('permission')) {
        console.warn(' ATOMIC: Permission denied - file handle may be invalid');
        this.fileHandle = null; // Clear invalid handle
        this.needsFileReauth = true;
        this.promptForFileReauth();
      }
      
      throw error;
    }
  }

  /**
   * Re-establish file access for continued updates
   */
  async reEstablishFileAccess() {
    if (!this.hasNativeFileSystemAccess()) {
      return false;
    }
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'Emma Vault Files',
          accept: { 'application/emma': ['.emma'] }
        }]
      });

      const file = await fileHandle.getFile();
      const isDifferentFileSelection = !!(this.originalFileName && file.name !== this.originalFileName);

      if (isDifferentFileSelection) {
        console.warn(' REAUTH: Selected file name differs from stored reference. Switching vault to new file.', {
          stored: this.originalFileName,
          selected: file.name
        });

        try {
          await this.switchVaultToSelectedFile(fileHandle, file, { source: 'reauth' });
          return true;
        } catch (switchError) {
          console.error(' REAUTH: Failed to switch vault from new selection:', switchError);
          if (window.emmaError) {
            window.emmaError('Could not switch to the selected .emma file: ' + switchError.message, {
              title: 'Vault Switch Failed',
              helpText: 'Let’s try selecting the file again and double-check the passphrase.'
            });
          }
          return false;
        }
      }

      this.updateOriginalFileName(file.name);
      this.fileHandle = fileHandle;
      this.needsFileReauth = false;
      const syncModal = document.querySelector('.emma-sync-error-modal');
      if (syncModal) syncModal.remove();

      return true;
    } catch (error) {

      return false;
    }
  }

  async ensureDirectFileHandle(context = 'operation', options = {}) {
    if (!this.hasNativeFileSystemAccess()) {
      return false;
    }
    const { promptOnFailure = true } = options || {};

    if (typeof window === 'undefined' || !('showOpenFilePicker' in window)) {
      return false;
    }

    if (this.fileHandle) {
      return true;
    }

    try {
      const persistedHandle = await this.loadPersistedFileHandle({ silent: true });
      if (persistedHandle?.handle) {
        this._suspendHandlePersistence = true;
        this.fileHandle = persistedHandle.handle;
        this._suspendHandlePersistence = false;

        if (persistedHandle.originalFileName && !this.originalFileName) {
          this.originalFileName = persistedHandle.originalFileName;
        }

        if (persistedHandle.permission !== 'denied') {
          this.needsFileReauth = false;
          return true;
        }

        // Permission denied - reset handle so we can prompt again
        this.fileHandle = null;
      }
    } catch (error) {
      console.warn(` FILE-ACCESS: Failed to restore persisted handle before ${context}:`, error);
    }

    if (this.isFileSelectionInProgress) {
      return false;
    }

    if (!this.originalFileName) {
      try {
        this.originalFileName = sessionStorage.getItem('emmaVaultOriginalFileName') ||
          localStorage.getItem('emmaVaultOriginalFileName') ||
          this.originalFileName;
      } catch (error) {
        console.warn(' FILE-ACCESS: Unable to restore cached filename before reauth:', error);
      }
    }

    if (!this.originalFileName) {
      return false;
    }

    try {
      const restored = await this.reEstablishFileAccess();
      this.needsFileReauth = !restored;
      if (!restored && promptOnFailure) {
        this.promptForFileReauth();
      }
      return restored;
    } catch (error) {
      console.warn(` FILE-ACCESS: Failed to restore handle after ${context}:`, error);
      this.needsFileReauth = true;
      if (promptOnFailure) {
        this.promptForFileReauth();
      }
      return false;
    }
  }

  // REMOVED: Session storage fallback methods - direct-save-only mode

  /**
   * Lock vault and download updated .emma file
   */
  async lockVault() {
    try {
      const directMode = this.autoSavePreference === 'direct' &&
        this.fileHandle && typeof this.fileHandle.createWritable === 'function';

      if (directMode) {
        await this.atomicFileUpdate();
      } else {
        await this.saveToIndexedDB();
        console.log(' LOCK: Operating in browser-only mode - data saved to IndexedDB.');
      }

      const preservedFileName = this.originalFileName;
      this.isOpen = false;
      this.vaultData = null;
      this.passphrase = null;
      this.fileHandle = directMode ? null : this.fileHandle;
      this.originalFileName = null;

      sessionStorage.removeItem('emmaVaultActive');
      sessionStorage.removeItem('emmaVaultPassphrase');
      sessionStorage.removeItem('emmaVaultOriginalFileName');
      localStorage.removeItem('emmaVaultActive');
      localStorage.removeItem('emmaVaultName');

      if (preservedFileName) {
        localStorage.setItem('emmaVaultOriginalFileName', preservedFileName);
        console.log(' LOCK: Preserved filename for restoration:', preservedFileName);
      }

      return { success: true, mode: directMode ? 'direct' : 'browser-only' };
    } catch (error) {
      console.error(' LOCK: Failed to lock vault:', error);
      throw error;
    }
  }
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
            console.warn(' IndexedDB: Object store "vaults" not found - returning null');
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
      console.error(' Failed to load from IndexedDB:', error);
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
          this.ensureVaultMetadataName(vaultName);

        } else {
          // Create minimal vault structure if no IndexedDB data
          this.vaultData = {
            content: { memories: {}, people: {}, media: {} },
            stats: { memoryCount: 0, peopleCount: 0, mediaCount: 0 },
            metadata: { name: vaultName || 'Web Vault' }
          };
          this.ensureVaultMetadataName(vaultName);

        }

        // ALWAYS set vault as open if session is active with passphrase
        this.isOpen = true;
        this.passphrase = passphrase;

        // Restore original filename (check both session and localStorage)
        this.originalFileName = sessionStorage.getItem('emmaVaultOriginalFileName') || 
                               localStorage.getItem('emmaVaultOriginalFileName');

        let persistedHandleStatus = null;
        if (!this.fileHandle && this.canPersistFileHandles()) {
          persistedHandleStatus = await this.loadPersistedFileHandle({ silent: true });
          if (persistedHandleStatus?.handle) {
            this._suspendHandlePersistence = true;
            this.fileHandle = persistedHandleStatus.handle;
            this._suspendHandlePersistence = false;

            if (persistedHandleStatus.originalFileName && !this.originalFileName) {
              this.originalFileName = persistedHandleStatus.originalFileName;
            }

            if (this.originalFileName) {
              try {
                sessionStorage.setItem('emmaVaultOriginalFileName', this.originalFileName);
                localStorage.setItem('emmaVaultOriginalFileName', this.originalFileName);
              } catch (_) {}
            }
          }
        }
        
        if (this.fileHandle) {
          if (persistedHandleStatus && persistedHandleStatus.permission === 'denied' && !this.browserOnlyModeActive) {
            this.needsFileReauth = true;
            this.promptForFileReauth();
          } else {
            this.needsFileReauth = false;
          }
        } else if (this.browserOnlyModeActive) {
          this.needsFileReauth = false;
        } else if (this.originalFileName) {
          //  CRITICAL: Defer re-auth until user action to avoid unsolicited file pickers
          this.needsFileReauth = true;
          this.promptForFileReauth();
        } else if (this.autoSavePreference === 'undecided') {
          this.needsFileReauth = true;
          this.promptForFileReauth();
        }
        const supportsDirectSavePrompt = this.hasNativeFileSystemAccess();
        const shouldInviteLegacyUsers = this.autoSavePreference === 'undecided' && supportsDirectSavePrompt;
        const shouldRecoverAutoSave = this.autoSavePreference === 'direct' && !this.fileHandle && supportsDirectSavePrompt && !this.browserOnlyModeActive;

        if (shouldInviteLegacyUsers || shouldRecoverAutoSave) {
          setTimeout(() => {
            if (this.autoSavePromptVisible) return;
            if (shouldInviteLegacyUsers) {
              this.showAutoSavePreferencePrompt('legacy-upgrade');
            } else if (shouldRecoverAutoSave) {
              this.showAutoSavePreferencePrompt('permission-lost');
            }
          }, 800);
        }

        return { vaultData: this.vaultData, hasPassphrase: true, hasFileName: !!this.originalFileName };
      } else {

        return null;
      }

    } catch (error) {
      console.error(' ELEGANT: Failed to restore vault state:', error);
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
              console.warn(' IndexedDB: Could not delete store:', storeName);
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
        console.error(' No vault data available for download');
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
        showToast(` Updated ${baseName}.emma downloaded - replace your original file`, 'info');
      }

    } catch (error) {
      console.error(' Failed to download vault:', error);
      throw error;
    }
  }

  /**
   * Create/write new vault file using the File System Access API save picker
   */
  async saveNewVaultViaSavePicker(preferredName) {
    if (typeof window === 'undefined' || typeof window.showSaveFilePicker !== 'function') {
      return false;
    }

    const normalizedName = this.ensureVaultMetadataName(preferredName);
    const suggestedName = normalizedName && normalizedName.toLowerCase().endsWith('.emma')
      ? normalizedName
      : `${normalizedName || 'Emma Vault'}.emma`;

    const fileHandle = await window.showSaveFilePicker({
      suggestedName,
      types: [{
        description: 'Emma Vault Files',
        accept: { 'application/emma': ['.emma'] }
      }],
      excludeAcceptAllOption: true
    });

    const encryptedData = await this.encryptVaultData();
    const writable = await fileHandle.createWritable();
    await writable.write(encryptedData);
    await writable.close();

    this.fileHandle = fileHandle;
    this.needsFileReauth = false;
    this.updateOriginalFileName(fileHandle.name || suggestedName);

    if (window.emmaSyncStatus) {
      window.emmaSyncStatus.show('success', `Saved ${fileHandle.name || suggestedName} on your device`);
    }

    return true;
  }

  /**
   * Encrypt vault data for .emma file
   */
  async encryptVaultData(vaultData = null, customPassphrase = null) {
    try {

      // Use provided vault data or default to current
      const dataToEncrypt = vaultData || this.vaultData;

      if (!customPassphrase) {
        await this.ensureActivePassphrase('file-save');
      }
      const activePassphrase = customPassphrase || this.passphrase;

      // Convert vault data to JSON
      const jsonData = JSON.stringify(dataToEncrypt);

      const encoder = new TextEncoder();
      const data = encoder.encode(jsonData);

      // Encrypt using Web Crypto API with specified passphrase

      const encryptedData = await this.encryptData(data, null, activePassphrase);

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
        console.warn(' SALT: Unexpected salt length:', salt.length, '- attempting to proceed with normalized value');
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
      console.error(' Failed to encrypt vault data:', error);
      console.error(' Error details:', error.stack);
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
      console.error(' Failed to decrypt vault file:', error);
      throw new Error('Failed to decrypt vault. Please check your passphrase.');
    }
  }

  /**
   * Detect if we are in fallback mode (no direct file access)
   */
  isFallbackMode() {
    return !this.fileHandle && !!this.originalFileName && (typeof window !== 'undefined') && ('showOpenFilePicker' in window);
  }

  hasNativeFileSystemAccess() {
    return typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';
  }

  setAutoSavePreference(preference) {
    const allowed = new Set(['direct', 'browser-only', 'undecided']);
    let normalized = allowed.has(preference) ? preference : 'undecided';
    if (normalized === 'direct' && !this.hasNativeFileSystemAccess()) {
      normalized = 'browser-only';
    }
    this.autoSavePreference = normalized;
    this.browserOnlyModeActive = normalized === 'browser-only';

    try {
      if (normalized === 'undecided') {
        localStorage.removeItem('emmaVaultAutoSavePreference');
      } else {
        localStorage.setItem('emmaVaultAutoSavePreference', normalized);
      }
    } catch (error) {
      console.warn(' AUTO-SAVE PREF: Failed to persist preference:', error);
    }

    if (normalized === 'browser-only') {
      this.needsFileReauth = false;
    }
  }

  async requestDirectSaveHandle(context = 'auto-save-preference') {
    if (typeof window === 'undefined') return false;

    if (this.fileHandle && typeof this.fileHandle.requestPermission === 'function') {
      try {
        const status = await this.fileHandle.requestPermission({ mode: 'readwrite' });
        if (status === 'granted') {
          this.needsFileReauth = false;
          return true;
        }
      } catch (permissionError) {
        console.warn(' AUTO-SAVE HANDLE: Existing handle permission request failed:', permissionError);
      }
    }

    if (typeof window.showSaveFilePicker !== 'function') {
      return await this.reEstablishFileAccess();
    }

    const vaultName = this.ensureVaultMetadataName(
      this.originalFileName || this.vaultData?.name || 'Emma Vault'
    );
    const suggestedName = vaultName.toLowerCase().endsWith('.emma')
      ? vaultName
      : `${vaultName}.emma`;

    try {
      let fileHandle = null;
      if (typeof window.showSaveFilePicker === 'function') {
        fileHandle = await window.showSaveFilePicker({
          suggestedName,
          types: [{
            description: 'Emma Vault Files',
            accept: { 'application/emma': ['.emma'] }
          }],
          excludeAcceptAllOption: true
        });
      } else if (typeof window.chooseFileSystemEntries === 'function') {
        fileHandle = await window.chooseFileSystemEntries({
          type: 'saveFile',
          accepts: [{
            description: 'Emma Vault Files',
            extensions: ['emma'],
            mimeTypes: ['application/emma']
          }],
          suggestedName
        });
      } else {
        return await this.reEstablishFileAccess();
      }

      this.fileHandle = fileHandle;
      this.updateOriginalFileName(fileHandle.name || suggestedName);
      this.needsFileReauth = false;

      try {
        await this.atomicFileUpdate();
      } catch (writeError) {
        console.warn(' AUTO-SAVE HANDLE: Initial direct save failed:', writeError);
        throw writeError;
      }

      return true;
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error(` AUTO-SAVE HANDLE: Failed to capture save handle during ${context}:`, error);
      } else {
        console.log(' AUTO-SAVE HANDLE: User canceled save permission prompt.');
      }
      return false;
    }
  }

  maybePromptForAutoSave(context = 'activation') {
    if (!this.hasNativeFileSystemAccess()) return;
    if (typeof document === 'undefined') return;
    if (this.autoSavePreference !== 'undecided') return;
    if (this.autoSavePromptVisible) return;
    if (!document.body) return;
    this.showAutoSavePreferencePrompt(context);
  }

  showAutoSavePreferencePrompt(context = 'activation') {
    if (typeof document === 'undefined') return;
    if (!document.body) return;
    if (this.autoSavePromptVisible) return;
    this.autoSavePromptVisible = true;

    const copy = (() => {
      switch (context) {
        case 'permission-lost':
          return {
            title: 'Restore Auto-Save?',
            body: `Emma lost permission to update your <strong>.emma</strong> file after a browser restart or settings change.
              <br><br>
              Click below so your browser can show the \"Save changes\" prompt again. Once confirmed, Emma will resume writing directly to your vault.`
          };
        case 'manual-request':
          return {
            title: 'Enable Auto-Save?',
            body: `Emma can save changes straight to your <strong>.emma</strong> file so you never lose a moment.
              <br><br>
              Enable auto-save to let Emma update the file continuously, or keep everything in this browser and download manually later.`
          };
        case 'legacy-upgrade':
          return {
            title: 'Try Auto-Save for Your Vault?',
            body: `This vault was created before Emma offered direct auto-save.
              <br><br>
              Give Emma permission to keep your <strong>.emma</strong> file updated automatically (you’ll see the browser’s \"Save changes\" prompt), or continue saving only inside this browser and download when ready.`
          };
        default:
          return {
            title: 'Keep Emma Auto-Saving?',
            body: `Emma can save changes directly to your <strong>.emma</strong> file so your memories never leave your device.
              <br><br>
              Enable auto-save to let Emma update your vault file after every change. Your browser will ask you to confirm that Emma can update the file (you'll see a \"Save changes\" prompt). Or, you can keep everything in browser storage and download updates manually when you're ready.`
          };
      }
    })();

    const modal = document.createElement('div');
    modal.className = 'emma-auto-save-prompt';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.78);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      color: #0f172a;
    `;

    modal.innerHTML = `
      <div style="
        background: white;
        padding: 36px;
        border-radius: 20px;
        max-width: 520px;
        width: calc(100% - 40px);
        box-shadow: 0 25px 60px rgba(15,23,42,0.35);
        text-align: left;
      ">
        <h2 style="margin: 0 0 16px 0; font-size: 24px; color: #0f172a;">${copy.title}</h2>
        <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.5; color: #0f172a;">
          ${copy.body}
        </p>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button id="emma-enable-auto-save" style="
            background: #2563eb;
            color: white;
            border: none;
            padding: 14px 20px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
          ">Enable Auto-Save</button>
          <button id="emma-browser-only-save" style="
            background: transparent;
            color: #0f172a;
            border: 2px solid rgba(15,23,42,0.2);
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 500;
            cursor: pointer;
          ">Keep Memories In This Browser Only</button>
        </div>
      </div>
    `;

    const cleanupPrompt = () => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
      this.autoSavePromptVisible = false;
    };

    document.body.appendChild(modal);

    const enableButton = modal.querySelector('#emma-enable-auto-save');
    const browserButton = modal.querySelector('#emma-browser-only-save');

    const resetEnableButton = () => {
      enableButton.disabled = false;
      browserButton.disabled = false;
      enableButton.textContent = 'Enable Auto-Save';
    };

    enableButton.addEventListener('click', async () => {
      if (enableButton.disabled) return;
      enableButton.disabled = true;
      browserButton.disabled = true;
      enableButton.textContent = 'Requesting Access...';

      const hasFileSystemAccess = typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';

      if (!hasFileSystemAccess) {
        cleanupPrompt();
        resetEnableButton();
        this.setAutoSavePreference('browser-only');
        this.needsFileReauth = false;
        if (window.emmaError) {
          window.emmaError('This browser cannot grant Emma direct access to your .emma file. Emma will keep your memories inside this browser until you download updates.', {
            title: 'Auto-save not supported',
            helpText: 'Use Chrome or Edge (File System Access API) if you want Emma to update your .emma file automatically.'
          });
        }
        return;
      }

      try {
        const restored = await this.requestDirectSaveHandle('auto-save-preference');
        if (restored && this.fileHandle) {
          this.setAutoSavePreference('direct');
          this.needsFileReauth = false;
          cleanupPrompt();
          if (this.showToast) {
            this.showToast(' Auto-save enabled. Emma will keep your .emma file updated.', 'success');
          }
          if (window.emmaSyncStatus) {
            window.emmaSyncStatus.show('success', 'Auto-save active - Emma will write directly to your .emma file');
          }
          return;
        }

        resetEnableButton();
        cleanupPrompt();
        if (window.emmaError) {
          window.emmaError('Emma could not connect to your .emma file. Please try again later.', {
            title: 'Auto-save not enabled',
            helpText: 'You can continue using browser-only storage and download updates whenever you like.'
          });
        }
      } catch (error) {
        console.error(' AUTO-SAVE PROMPT: Failed to enable auto-save:', error);
        resetEnableButton();
        cleanupPrompt();
        if (window.emmaError) {
          window.emmaError('Something went wrong while enabling auto-save: ' + error.message, {
            title: 'Auto-save not enabled',
            helpText: 'Emma will keep saving in this browser until you try again.'
          });
        }
      }
    });

    browserButton.addEventListener('click', () => {
      this.setAutoSavePreference('browser-only');
      this.needsFileReauth = false;
      cleanupPrompt();
      if (this.showToast) {
        this.showToast(' Browser-only mode enabled. Use Download to export your .emma file when ready.', 'info');
      }
      if (window.emmaSyncStatus) {
        window.emmaSyncStatus.show('info', 'Browser-only mode: changes stay in this browser until you download the vault');
      }
    });
  }

  async loadPersistedFileHandle(options = {}) {
    return null;
  }

  canPersistFileHandles() {
    return false;
  }

  async openHandleDatabase() {
    return null;
  }

  async persistFileHandle() {
    return false;
  }

  async clearPersistedFileHandle() {
    return false;
  }

  async getHandlePermissionState(fileHandle, mode = 'readwrite') {
    if (!fileHandle || typeof fileHandle.queryPermission !== 'function') {
      return 'unknown';
    }

    try {
      return await fileHandle.queryPermission({ mode });
    } catch (error) {
      console.warn(' FILE-HANDLE: queryPermission failed:', error);
      return 'unknown';
    }
  }

  /**
   * Encrypt data using Web Crypto API
   */
  async encryptData(data, customSalt, customPassphrase) {
    try {

      let salt = customSalt || this.vaultData.encryption.salt;
      let passphrase = customPassphrase || this.passphrase;

      if (typeof passphrase !== 'string' || passphrase.trim().length === 0) {
        if (!customPassphrase) {
          await this.ensureActivePassphrase('encrypt-data');
          passphrase = this.passphrase;
        }
      }

      if (typeof passphrase !== 'string' || passphrase.length === 0) {
        throw new Error('Passphrase is required for encryption');
      }

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
      console.error(' Encryption failed:', error);
      console.error(' Error details:', error.stack);
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
      console.error(' Decryption failed:', error);
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

  normalizeToArrayBuffer(data) {
    if (data instanceof ArrayBuffer) {
      return data;
    }
    if (ArrayBuffer.isView(data)) {
      return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    }
    throw new Error('Unsupported vault buffer format');
  }

  inspectVaultBytes(data, label = 'vault-file') {
    try {
      const buffer = data instanceof Uint8Array ? data : new Uint8Array(this.normalizeToArrayBuffer(data));
      const header = new TextDecoder().decode(buffer.slice(0, 4));
      const asciiPreview = this.peekAsciiString(buffer.slice(0, 128));
      const hexPreview = Array.from(buffer.slice(0, 40)).map(b => b.toString(16).padStart(2, '0')).join(' ');
      const summary = {
        label,
        totalBytes: buffer.length,
        header,
        hexPreview,
        asciiPreview,
      };
      console.log('?? VAULT INSPECTOR:', summary);
      return summary;
    } catch (error) {
      console.warn('VAULT INSPECTOR: Failed to analyze buffer:', error);
      return null;
    }
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
      happy: '',
      sad: '',
      love: '',
      excited: '',
      peaceful: '',
      neutral: ''
    };
    return emojis[emotion] || '';
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
        console.error(' Sync error:', message.error);
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
   *  REMOVED DUPLICATE autoSave - was overriding .emma file saving!
   * Original autoSave (line ~1106) handles proper .emma file persistence.
   */

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
      const arrayBuffer = this.normalizeToArrayBuffer(fileData);
      const data = new Uint8Array(arrayBuffer);

      const magic = new TextDecoder().decode(data.slice(0, 4));
      if (magic !== 'EMMA') {
        throw new Error('Invalid .emma file format');
      }

      const plaintextCandidate = this.tryParsePlaintextVault(data.slice(4));
      if (plaintextCandidate) {
        console.warn('EXACT WORKING: Plaintext vault detected - returning parsed data directly');
        plaintextCandidate.encryption = plaintextCandidate.encryption || {};
        plaintextCandidate.encryption.iterations = plaintextCandidate.encryption.iterations || 0;
        plaintextCandidate.encryption.salt = plaintextCandidate.encryption.salt || new Uint8Array(32);
        return plaintextCandidate;
      }

      const buildLayouts = () => {
        const attempts = [];
        const versionFlags = [true, false];
        const preambleLengths = [0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 28, 32];
        const saltLengths = [32, 16, 24, 48, 64, 40];
        const ivLengths = [12, 16, 24];

        for (const includeVersion of versionFlags) {
          for (const preamble of preambleLengths) {
            for (const saltLength of saltLengths) {
              for (const ivLength of ivLengths) {
                let offset = 4;
                let version = null;

                if (includeVersion) {
                  if (data.length >= offset + 2) {
                    const candidate = data.slice(offset, offset + 2);
                    const [major, minor] = candidate;
                    const looksLikeVersion = (major === 1 && minor <= 10) || (major === 0 && minor <= 10);
                    const bytesRemaining = data.length - (offset + 2 + preamble + saltLength + ivLength);
                    if (looksLikeVersion && bytesRemaining >= 0) {
                      version = candidate;
                      offset += 2;
                    } else {
                      continue;
                    }
                  } else {
                    continue;
                  }
                }

                offset += preamble;
                if (data.length < offset + saltLength + ivLength + 16) {
                  continue;
                }

                const salt = data.slice(offset, offset + saltLength);
                const iv = data.slice(offset + saltLength, offset + saltLength + ivLength);
                const encrypted = data.slice(offset + saltLength + ivLength);
                attempts.push({ salt, iv, encrypted, version, ivLength, saltLength, preamble });
              }
            }
          }
        }

        return attempts;
      };

      const layoutAttempts = buildLayouts();
      if (layoutAttempts.length === 0) {
        throw new Error('Unsupported .emma file layout');
      }

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(passphrase),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      const iterationCandidates = [
        500000,
        400000,
        350000,
        330000,
        320000,
        310000,
        300000,
        280000,
        262144,
        250000,
        200000,
        175000,
        150000,
        125000,
        110000,
        100000,
        96000,
        80000,
        64000,
        50000
      ];
      let chosenIterations = null;
      let vaultData = null;
      let lastError = null;

      for (const layout of layoutAttempts) {
        for (const iterations of iterationCandidates) {
          try {
            const key = await crypto.subtle.deriveKey(
              {
                name: 'PBKDF2',
                salt: layout.salt,
                iterations,
                hash: 'SHA-256'
              },
              keyMaterial,
              { name: 'AES-GCM', length: 256 },
              false,
              ['decrypt']
            );

            const decrypted = await crypto.subtle.decrypt(
              { name: 'AES-GCM', iv: layout.iv },
              key,
              layout.encrypted
            );

            const jsonString = new TextDecoder().decode(decrypted);
            vaultData = JSON.parse(jsonString);
            chosenIterations = iterations;
            vaultData.encryption = vaultData.encryption || {};
            vaultData.encryption.salt = new Uint8Array(layout.salt);
            if (chosenIterations) {
              vaultData.encryption.iterations = chosenIterations;
            }

            console.log('EXACT WORKING: Vault decrypted successfully!', {
              memories: Object.keys(vaultData.content?.memories || {}).length,
              layout: layout.version ? 'versioned' : 'legacy'
            });
            return vaultData;
          } catch (error) {
            lastError = error;
          }
        }
      }

      const summary = layoutAttempts.map(layout => ({
        saltLength: layout.saltLength || layout.salt?.length || null,
        ivLength: layout.ivLength || layout.iv?.length || null,
        encryptedLength: layout.encrypted?.length || null,
        version: layout.version ? Array.from(layout.version) : null
      }));
      const firstBytes = Array.from(data.slice(0, 64));
      const asciiPreview = this.peekAsciiString(data.slice(0, 128));
      console.error('EXACT WORKING: Exhausted all layout/iteration combinations', summary);
      console.error('EXACT WORKING: Layout summary raw', JSON.stringify(summary));
      console.error('EXACT WORKING: File first bytes', firstBytes);
      if (asciiPreview) {
        console.error('EXACT WORKING: ASCII preview', asciiPreview);
      }

      throw lastError || new Error('Failed to derive Emma vault key.');

    } catch (error) {
      console.error('EXACT WORKING: Decryption failed:', error);
      throw new Error('Failed to decrypt vault: ' + error.message);
    }
  }

  async nativeDecryptVault(source, passphrase) {
    try {
      if (!source) {
        throw new Error('No vault data provided');
      }

      if (source && typeof source === 'object') {
        if (source.data && source.data.content) {
          return source.data;
        }
        if (source.content && source.metadata) {
          return source;
        }
      }

      const effectivePassphrase = passphrase || this.passphrase;
      if (!effectivePassphrase) {
        throw new Error('Passphrase required to decrypt vault');
      }

      let buffer = null;

      if (source instanceof ArrayBuffer) {
        buffer = source;
      } else if (ArrayBuffer.isView(source)) {
        buffer = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
      } else if (typeof Blob !== 'undefined' && source instanceof Blob) {
        buffer = await source.arrayBuffer();
      } else if (typeof source === 'string') {
        const binary = atob(source);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        buffer = bytes.buffer;
      }

      if (buffer) {
        return await this.exactWorkingDecrypt(buffer, effectivePassphrase);
      }

      throw new Error('Unsupported vault data format');
    } catch (error) {
      console.error(' NATIVE DECRYPT: Failed to restore vault:', error);
      throw error;
    }
  }

  peekAsciiString(data) {
    try {
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const decoded = decoder.decode(data);
      const printable = decoded.replace(/[^\x20-\x7E]/g, ' ').trim();
      if (!printable) return null;
      return printable;
    } catch {
      return null;
    }
  }

  tryParsePlaintextVault(data) {
    try {
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const decoded = decoder.decode(data);
      const trimmed = decoded.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        return JSON.parse(trimmed);
      }
      // Base64 fallback
      const compact = trimmed.replace(/\s+/g, '');
      if (/^[A-Za-z0-9+/=]+$/.test(compact) && compact.length % 4 === 0) {
        const binary = atob(compact);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const nestedDecoded = decoder.decode(bytes);
        const nestedTrimmed = nestedDecoded.trim();
        if (nestedTrimmed.startsWith('{') && nestedTrimmed.endsWith('}')) {
          return JSON.parse(nestedTrimmed);
        }
      }
    } catch (error) {
      console.warn('PLAINTEXT DETECTION: Failed to parse plaintext vault:', error);
    }
    return null;
  }

  async hasBrowserBackup() {
    try {
      const backup = await this.loadFromIndexedDB();
      return !!backup;
    } catch (error) {
      console.warn('BROWSER BACKUP: Unable to check IndexedDB:', error);
      return false;
    }
  }

  applyNewPassphrase(passphrase) {
    if (!passphrase) {
      throw new Error('Passphrase required to re-encrypt vault');
    }
    this.passphrase = passphrase;
    this.cacheSessionPassphrase(passphrase);
    this.vaultData.encryption = {
      algorithm: 'AES-GCM',
      keyDerivation: 'PBKDF2',
      iterations: 310000,
      salt: this.generateSalt()
    };
  }

  async recoverFromBrowserBackup(passphrase) {
    const backup = await this.loadFromIndexedDB();
    if (!backup) {
      throw new Error('No browser backup found in this browser');
    }

    this.vaultData = backup;
    this.isOpen = true;
    this.applyNewPassphrase(passphrase);
    const normalizedName = this.ensureVaultMetadataName(
      this.vaultData.metadata?.name ||
      this.vaultData.name ||
      this.originalFileName ||
      'Recovered Vault'
    );
    sessionStorage.setItem('emmaVaultActive', 'true');
    sessionStorage.setItem('emmaVaultName', normalizedName);
    localStorage.setItem('emmaVaultActive', 'true');
    localStorage.setItem('emmaVaultName', normalizedName);
    await this.saveToIndexedDB();
    return this.vaultData;
  }
async nativeEncryptVault(vaultData, passphrase) {
    try {

      let activePassphrase = passphrase;
      if (!activePassphrase || !activePassphrase.trim()) {
        await this.ensureActivePassphrase('download');
        activePassphrase = this.passphrase;
      }
      activePassphrase = activePassphrase.trim();
      if (!activePassphrase) {
        throw new Error('Passphrase required to encrypt vault');
      }

      // Generate encryption salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(32));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Convert vault data to bytes
      const jsonString = JSON.stringify(vaultData);
      const dataToEncrypt = new TextEncoder().encode(jsonString);

      // Derive encryption key
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(activePassphrase),
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
      console.error(' NATIVE CRYPTO: Encryption failed:', error);
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
            window.emmaWebVault.cacheSessionPassphrase(data.passphrase);
            window.emmaWebVault.isOpen = true;

            // Set session storage for dashboard
            sessionStorage.setItem('emmaVaultActive', 'true');
            sessionStorage.setItem('emmaVaultName', decryptedData.metadata?.name || decryptedData.name || 'Web Vault');
            // SECURITY: Passphrase cached in sessionStorage for this tab only

            console.log(' Vault unlocked successfully via API!');
            const stats = window.emmaWebVault.getStats();
            await window.emmaWebVault.ensureDirectFileHandle('unlock', { promptOnFailure: false });
            return { success: true, stats };
          } catch (error) {
            console.error(' Failed to decrypt vault with provided passphrase:', error);
            return { success: false, error: 'Incorrect passphrase or corrupted vault data' };
          }
        } else {
          // Vault data is not encrypted or already decrypted
          window.emmaWebVault.vaultData = vaultData;
          window.emmaWebVault.isOpen = true;
          if (data.passphrase) {
            window.emmaWebVault.cacheSessionPassphrase(data.passphrase);
          }

          sessionStorage.setItem('emmaVaultActive', 'true');
          sessionStorage.setItem('emmaVaultName', vaultData.metadata?.name || vaultData.name || 'Web Vault');

          console.log(' Vault opened successfully (unencrypted data)!');
          const stats = window.emmaWebVault.getStats();
          await window.emmaWebVault.ensureDirectFileHandle('unlock', { promptOnFailure: false });
          return { success: true, stats };
        }
      } catch (error) {
        console.error(' Failed to unlock vault:', error);
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
          console.error(' Failed to add attachment:', error);
          return { success: false, error: error.message };
        }
      },
      remove: async (mediaId) => {
        try {
          const res = await window.emmaWebVault.removeMedia(mediaId);
          return { success: res.success };
        } catch (error) {
          console.error(' Failed to remove attachment:', error);
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
        console.error(' Failed to delete memory:', error);
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
        console.error(' Failed to update person:', error);
        return { success: false, error: error.message };
      }
    },
    delete: async (personId) => {
      try {
        const res = await window.emmaWebVault.deletePerson(personId);
        return { success: res.success };
      } catch (error) {
        console.error(' Failed to delete person:', error);
        return { success: false, error: error.message };
      }
    },

    list: async () => {
      try {
        // CLEAN: Direct vault access since vault should exist on all pages now
        if (!window.emmaWebVault) {
          console.warn(' EmmaWebVault not available, returning empty people list');
          return { success: true, items: [] };
        }
        
        if (typeof window.emmaWebVault.listPeople !== 'function') {
          console.warn(' listPeople method not available, returning empty people list');
          return { success: true, items: [] };
        }
        
        console.log(' API: Calling vault.listPeople()...');
        const people = await window.emmaWebVault.listPeople();
        console.log(` API: Retrieved ${people?.length || 0} people from vault`);
        return { success: true, items: people || [] };
      } catch (error) {
        console.error(' Failed to list people:', error);
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
        console.error(' Failed to update person:', error);
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

EmmaWebVault.prototype.setAutoSaveEnabled = function(enabled) {
  this.autoSaveEnabled = !!enabled;
  if (!this.autoSaveEnabled) {
    this.pendingChanges = true;
  }
};

EmmaWebVault.prototype.updateOriginalFileName = function(fileName) {
  if (!fileName) {
    return;
  }

  this.originalFileName = fileName;

  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem('emmaVaultOriginalFileName', fileName);
    } catch (_) {}
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('emmaVaultOriginalFileName', fileName);
    } catch (_) {}
  }
};

EmmaWebVault.prototype.promptForVaultPassphrase = async function(fileName, options = {}) {
  const {
    title = options.title || 'Unlock Vault',
    message = options.message || `Enter the passphrase for your vault: ${fileName}`,
    placeholder = options.placeholder || 'Enter vault passphrase...',
    promptText = options.promptText || `Enter the passphrase for ${fileName}`
  } = options;

  try {
    if (window.cleanSecurePasswordModal && typeof window.cleanSecurePasswordModal.show === 'function') {
      return await window.cleanSecurePasswordModal.show({
        title,
        message,
        placeholder
      });
    }

    if (typeof window.showPasswordModal === 'function') {
      return await window.showPasswordModal(message, 'Passphrase:');
    }
  } catch (modalError) {
    console.error(' PASSCODE MODAL: Failed to collect passphrase:', modalError);
    return null;
  }

  return window.prompt(promptText);
};

EmmaWebVault.prototype.switchVaultToSelectedFile = async function(fileHandle, file, options = {}) {
  const {
    passphraseOverride = null,
    promptTitle,
    promptMessage,
    promptPlaceholder,
    promptText,
    promptOnFailure = true,
    source = 'manual'
  } = options || {};

  console.log(' SWITCH: Starting vault swap', {
    hasHandle: !!fileHandle,
    fileProvided: !!file,
    source
  });

  const fileBlob = file || (fileHandle && typeof fileHandle.getFile === 'function'
    ? await fileHandle.getFile()
    : null);

  if (!fileBlob) {
    throw new Error('No vault file available to load');
  }
  console.log(' SWITCH: File resolved', { name: fileBlob.name, size: fileBlob.size, type: fileBlob.type });

  let passphrase = passphraseOverride;
  const hasProvidedPassphrase = typeof passphrase === 'string' && passphrase.length > 0 && passphrase.trim().length > 0;

  if (!hasProvidedPassphrase) {
    passphrase = await this.promptForVaultPassphrase(fileBlob.name, {
      title: promptTitle || 'Switch Vault',
      message: promptMessage || `Enter the passphrase to open ${fileBlob.name}`,
      placeholder: promptPlaceholder || 'Enter vault passphrase...',
      promptText: promptText || `Enter the passphrase for ${fileBlob.name}`
    });
  }

  if (typeof passphrase !== 'string' || passphrase.trim().length === 0) {
    throw new Error('Passphrase is required to switch vaults');
  }

  const fileBuffer = await fileBlob.arrayBuffer();
  console.log(' SWITCH: File buffer ready. Decrypting with native flow...');

  const vaultData = await this.nativeDecryptVault(fileBuffer, passphrase);
  console.log(' SWITCH: Vault decrypted successfully');

  if (!vaultData || !vaultData.content) {
    throw new Error('Invalid vault data structure');
  }
  console.log(' SWITCH: Vault decrypted. Updating state...', {
    memoryCount: Object.keys(vaultData.content?.memories || {}).length,
    peopleCount: Object.keys(vaultData.content?.people || {}).length
  });

  this.vaultData = vaultData;
  this.isOpen = true;
  this.passphrase = passphrase;
  this.cacheSessionPassphrase(passphrase);

  const normalizedName = this.ensureVaultMetadataName(
    vaultData.metadata?.name ||
    vaultData.name ||
    fileBlob.name ||
    'Web Vault'
  );

  try {
    sessionStorage.setItem('emmaVaultActive', 'true');
    sessionStorage.setItem('emmaVaultName', normalizedName);
  } catch (_) {}

  try {
    localStorage.setItem('emmaVaultActive', 'true');
    localStorage.setItem('emmaVaultName', normalizedName);
  } catch (_) {}

  this.updateOriginalFileName(fileBlob.name);

  if (fileHandle) {
    this.fileHandle = fileHandle;
    this.needsFileReauth = false;
  } else if (!this.fileHandle) {
    this.fileHandle = null;
  }

  if (!this.fileHandle && typeof this.ensureDirectFileHandle === 'function') {
    try {
      await this.ensureDirectFileHandle(`${source}-switch`, { promptOnFailure });
    } catch (handleError) {
      console.warn(' FILE-ACCESS: Unable to capture direct file handle after switch:', handleError);
    }
  }

  try {
    await this.saveToIndexedDB();
    console.log(' SWITCH: Vault saved to IndexedDB after switching files');
  } catch (idbError) {
    console.warn(' SWITCH: IndexedDB save failed (non-critical):', idbError);
  }

  const syncModal = document.querySelector('.emma-sync-error-modal');
  if (syncModal) syncModal.remove();

  if (window.webVaultStatus && typeof window.webVaultStatus.unlock === 'function') {
    window.webVaultStatus.unlock(normalizedName);
  } else {
    window.currentVaultStatus = {
      isUnlocked: true,
      hasVault: true,
      name: normalizedName
    };
  }

  if (this.showToast) {
    this.showToast(` Switched to ${normalizedName}`, 'success');
  }

  console.log(' SWITCH: Completed successfully');
  return true;
};

EmmaWebVault.prototype.showDirectSaveAffordance = function() {
  if (this.autoSavePreference === 'browser-only') {
    if (this.showToast) {
      this.showToast(' Browser-only mode is active. Use Download to update your .emma file when you are ready.', 'info');
    }
    return;
  }

  this.needsFileReauth = true;
  if (this.autoSavePreference === 'undecided') {
    this.maybePromptForAutoSave('manual-request');
    return;
  }
  this.promptForFileReauth();
};

/**
 * Show critical error when .emma file sync is broken
 * EMMA ETHOS: Never silently fail - always inform the user
 */
EmmaWebVault.prototype.showFileSyncError = function() {
  console.error(' CRITICAL: .emma file sync broken - showing user error');
  
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
      <div style="font-size: 48px; margin-bottom: 20px;"></div>
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
      "> Restore File Access</button>
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
        this.showToast && this.showToast(' File access restored! Saving to .emma file...', 'success');
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
console.log(' Emma Web Vault System ready - preserving memories with love! ');

