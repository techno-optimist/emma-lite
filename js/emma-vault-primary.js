/**
 * Emma Vault Primary Manager
 * Revolutionary Web App-Primary Architecture
 * 
 * CTO STRATEGIC INITIATIVE: Bulletproof vault persistence
 * - Web app becomes primary vault holder
 * - Extension becomes pure crypto service
 * - Zero data loss on service worker restart
 * 
 * FOR DEBBE: Every memory preserved with absolute reliability.
 */

class EmmaVaultPrimary {
  constructor() {
    this.vaultData = null;
    this.isOpen = false;
    this.passphrase = null;
    this.fileHandle = null; // Direct File System Access API
    try {
      const stored = localStorage.getItem('emmaVaultAutoSaveEnabled');
      this.autoSaveEnabled = stored === 'false' ? false : true;
    } catch (error) {
      console.warn('[EmmaVaultPrimary] Unable to read auto-save preference:', error);
      this.autoSaveEnabled = true;
    }
    this.saveDebounceTimer = null;
    
    // Feature flag for gradual migration
    this.useWebAppPrimary = localStorage.getItem('USE_WEBAPP_PRIMARY') === 'true';
    
    console.log('[VaultPrimary] EmmaVaultPrimary initialized - Web App Primary Architecture');
    console.log('[VaultPrimary] Feature flag USE_WEBAPP_PRIMARY:', this.useWebAppPrimary);
    
    // Auto-restore vault state on construction
    this.restoreVaultState();
  }

  setAutoSaveEnabled(enabled) {
    this.autoSaveEnabled = !!enabled;
  }

  /**
   * PHASE 2.1: Enhanced vault state restoration
   * Primary data source: IndexedDB (not extension)
   */
  async restoreVaultState() {
    try {
      console.log('🔄 PRIMARY: Restoring vault state from IndexedDB...');
      
      // Check if vault should be active
      const vaultActive = localStorage.getItem('emmaVaultActive') === 'true' || 
                         sessionStorage.getItem('emmaVaultActive') === 'true';
      const vaultName = localStorage.getItem('emmaVaultName') || 
                       sessionStorage.getItem('emmaVaultName');
      const passphrase = sessionStorage.getItem('emmaVaultPassphrase');
      
      if (vaultActive && vaultName) {
        console.log('🔓 PRIMARY: Vault should be active, attempting restore...');
        
        // Try to restore from IndexedDB first (primary source)
        const vaultData = await this.loadFromIndexedDB();
        if (vaultData) {
          this.vaultData = vaultData;
          this.isOpen = true;
          this.passphrase = passphrase;
          console.log('✅ PRIMARY: Vault restored from IndexedDB with', 
            Object.keys(vaultData.content?.memories || {}).length, 'memories');
          
          // Update global status
          window.currentVaultStatus = {
            isUnlocked: true,
            hasVault: true,
            name: vaultName
          };
          
          return true;
        } else {
          console.warn('⚠️ PRIMARY: No IndexedDB data found, vault may need re-unlock');
        }
      }
      
      console.log('🔒 PRIMARY: No active vault session found');
      return false;
      
    } catch (error) {
      console.error('❌ PRIMARY: Failed to restore vault state:', error);
      return false;
    }
  }

  /**
   * PHASE 2.1: Enhanced IndexedDB persistence
   * Auto-saves on every change for bulletproof persistence
   */
  async saveToIndexedDB() {
    return new Promise((resolve, reject) => {
      try {
        console.log('💾 PRIMARY: Saving vault to IndexedDB...');
        
        const request = indexedDB.open('EmmaPrimaryVault', 1);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('vaults')) {
            const store = db.createObjectStore('vaults', { keyPath: 'id' });
            console.log('🗄️ PRIMARY: Created IndexedDB object store');
          }
        };
        
        request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction(['vaults'], 'readwrite');
          const store = transaction.objectStore('vaults');
          
          const saveData = {
            id: 'current',
            data: this.vaultData,
            timestamp: new Date().toISOString(),
            memoryCount: Object.keys(this.vaultData?.content?.memories || {}).length,
            peopleCount: Object.keys(this.vaultData?.content?.people || {}).length,
            // SECURITY: Never store passphrase in IndexedDB
          };
          
          store.put(saveData);
          
          transaction.oncomplete = () => {
            console.log('✅ PRIMARY: Vault saved to IndexedDB successfully');
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
        
        request.onerror = () => reject(request.error);
        
      } catch (error) {
        console.error('❌ PRIMARY: IndexedDB save failed:', error);
        reject(error);
      }
    });
  }

  /**
   * PHASE 2.1: Enhanced IndexedDB loading
   */
  async loadFromIndexedDB() {
    try {
      console.log('📖 PRIMARY: Loading vault from IndexedDB...');
      
      const request = indexedDB.open('EmmaPrimaryVault', 1);
      
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
              console.log('✅ PRIMARY: Vault loaded from IndexedDB with', 
                result.memoryCount || 0, 'memories');
              resolve(result.data);
            } else {
              console.log('📝 PRIMARY: No vault data in IndexedDB');
              resolve(null);
            }
          };
          
          getRequest.onerror = () => reject(getRequest.error);
        };
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('vaults')) {
            db.createObjectStore('vaults', { keyPath: 'id' });
          }
        };
      });
    } catch (error) {
      console.error('❌ PRIMARY: Failed to load from IndexedDB:', error);
      return null;
    }
  }

  /**
   * PHASE 2.2: Direct File System Access API management
   */
  async selectVaultFile() {
    try {
      console.log('📁 PRIMARY: Opening file picker for .emma vault...');
      
      // Use File System Access API directly in web app
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'Emma Vault Files',
          accept: { 'application/emma-vault': ['.emma'] }
        }],
        excludeAcceptAllOption: true,
        multiple: false
      });
      
      this.fileHandle = fileHandle;
      console.log('✅ PRIMARY: File selected:', fileHandle.name);
      
      return fileHandle;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('File selection cancelled');
      }
      console.error('❌ PRIMARY: File selection failed:', error);
      throw error;
    }
  }

  /**
   * PHASE 2.2: Direct vault file loading with extension crypto
   */
  async openVaultFile(fileHandle = null, passphrase = null) {
    try {
      console.log('🔓 PRIMARY: Opening vault file...');
      
      // Select file if not provided
      if (!fileHandle) {
        fileHandle = await this.selectVaultFile();
      }
      
      // Get passphrase if not provided
      if (!passphrase) {
        passphrase = await this.requestPassphrase(fileHandle.name);
      }
      
      // Read file data
      const file = await fileHandle.getFile();
      const fileData = new Uint8Array(await file.arrayBuffer());
      
      console.log('📖 PRIMARY: File read, size:', fileData.length);
      
      // Request decryption from extension (crypto service)
      const decryptResult = await this.requestDecryption(fileData, passphrase);
      if (!decryptResult.success) {
        throw new Error(decryptResult.error || 'Decryption failed');
      }
      
      // Set vault data and state
      this.vaultData = decryptResult.vaultData;
      this.isOpen = true;
      this.passphrase = passphrase;
      this.fileHandle = fileHandle;
      
      // Persist to IndexedDB immediately
      await this.saveToIndexedDB();
      
      // Update session storage
      sessionStorage.setItem('emmaVaultActive', 'true');
      sessionStorage.setItem('emmaVaultName', this.vaultData.metadata?.name || 'Web Vault');
      // SECURITY: Never store passphrase in web storage - keep in memory only
      localStorage.setItem('emmaVaultActive', 'true');
      localStorage.setItem('emmaVaultName', this.vaultData.metadata?.name || 'Web Vault');
      
      // Update global status
      window.currentVaultStatus = {
        isUnlocked: true,
        hasVault: true,
        name: this.vaultData.metadata?.name || 'Web Vault'
      };
      
      console.log('✅ PRIMARY: Vault opened successfully with', 
        Object.keys(this.vaultData.content?.memories || {}).length, 'memories');
      
      return { success: true, stats: this.getStats() };
      
    } catch (error) {
      console.error('❌ PRIMARY: Failed to open vault:', error);
      throw error;
    }
  }

  /**
   * PHASE 2.3: Request decryption from extension crypto service
   */
  async requestDecryption(encryptedData, passphrase) {
    try {
      console.log('🔐 PRIMARY: Requesting decryption from extension...');
      
      // Check if extension API is available (not available on Render)
      if (!window.chrome || !window.chrome.runtime) {
        console.warn('🌐 PRIMARY: Extension API not available, using fallback decryption');
        return await this.fallbackDecryption(encryptedData, passphrase);
      }
      
      // Send to extension for decryption
      const response = await chrome.runtime.sendMessage({
        action: 'DECRYPT_VAULT_DATA',
        encryptedData: Array.from(encryptedData), // Convert Uint8Array for message passing
        passphrase: passphrase
      });
      
      if (response && response.success) {
        console.log('✅ PRIMARY: Vault decrypted by extension');
        return { success: true, vaultData: response.vaultData };
      } else {
        throw new Error(response?.error || 'Decryption failed');
      }
    } catch (error) {
      console.error('❌ PRIMARY: Decryption request failed, trying fallback:', error);
      return await this.fallbackDecryption(encryptedData, passphrase);
    }
  }

  /**
   * PHASE 2.3: Request encryption from extension crypto service
   */
  async requestEncryption(vaultData, passphrase) {
    try {
      console.log('🔒 PRIMARY: Requesting encryption from extension...');
      
      // Check if extension API is available (not available on Render)
      if (!window.chrome || !window.chrome.runtime) {
        console.warn('🌐 PRIMARY: Extension API not available, using fallback encryption');
        return await this.fallbackEncryption(vaultData, passphrase);
      }
      
      // Send to extension for encryption
      const response = await chrome.runtime.sendMessage({
        action: 'ENCRYPT_VAULT_DATA',
        vaultData: vaultData,
        passphrase: passphrase
      });
      
      if (response && response.success) {
        console.log('✅ PRIMARY: Vault encrypted by extension');
        return { success: true, encryptedData: new Uint8Array(response.encryptedData) };
      } else {
        throw new Error(response?.error || 'Encryption failed');
      }
    } catch (error) {
      console.error('❌ PRIMARY: Encryption request failed, trying fallback:', error);
      return await this.fallbackEncryption(vaultData, passphrase);
    }
  }

  /**
   * PHASE 2.2: Direct vault file saving
   */
  async saveVaultToFile() {
    try {
      if (!this.fileHandle) {
        throw new Error('No file handle available. Please select a vault file first.');
      }
      
      console.log('💾 PRIMARY: Saving vault to file...');
      
      // Request encryption from extension
      const encryptResult = await this.requestEncryption(this.vaultData, this.passphrase);
      if (!encryptResult.success) {
        throw new Error(encryptResult.error || 'Encryption failed');
      }
      
      // Write encrypted data to file
      const writable = await this.fileHandle.createWritable();
      await writable.write(encryptResult.encryptedData);
      await writable.close();
      
      console.log('✅ PRIMARY: Vault saved to file successfully');
      
      // Also save to IndexedDB as backup
      await this.saveToIndexedDB();
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ PRIMARY: Failed to save vault to file:', error);
      throw error;
    }
  }

  /**
   * PHASE 2.1: Auto-save with debouncing for performance
   */
  scheduleAutoSave() {
    if (!this.autoSaveEnabled) return;
    
    // Clear existing timer
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    
    // Schedule save after 2 seconds of inactivity
    this.saveDebounceTimer = setTimeout(async () => {
      try {
        await this.saveToIndexedDB(); // Always save to IndexedDB
        
        // Also save to file if we have file handle
        if (this.fileHandle) {
          await this.saveVaultToFile();
        }
        
        console.log('✅ PRIMARY: Auto-save completed');
      } catch (error) {
        console.error('❌ PRIMARY: Auto-save failed:', error);
      }
    }, 2000);
  }

  /**
   * Add memory with bulletproof persistence
   */
  async addMemory(memoryData) {
    try {
      if (!this.isOpen) {
        throw new Error('No vault is open');
      }
      
      console.log('💝 PRIMARY: Adding memory to vault...');
      
      // Generate memory ID
      const memoryId = 'memory_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      // Create memory object
      const memory = {
        id: memoryId,
        created: memoryData.created || new Date().toISOString(),
        updated: new Date().toISOString(),
        content: memoryData.content,
        metadata: memoryData.metadata || {},
        attachments: memoryData.attachments || []
      };
      
      // Add to vault
      if (!this.vaultData.content.memories) {
        this.vaultData.content.memories = {};
      }
      this.vaultData.content.memories[memoryId] = memory;
      
      // Update stats
      if (!this.vaultData.stats) {
        this.vaultData.stats = { memoryCount: 0, peopleCount: 0, totalSize: 0 };
      }
      this.vaultData.stats.memoryCount = Object.keys(this.vaultData.content.memories).length;
      
      // CRITICAL: Auto-save immediately to IndexedDB
      await this.saveToIndexedDB();
      
      // Schedule file save (debounced)
      this.scheduleAutoSave();
      
      console.log('✅ PRIMARY: Memory added and persisted');
      return { success: true, memory: memory };
      
    } catch (error) {
      console.error('❌ PRIMARY: Failed to add memory:', error);
      throw error;
    }
  }

  /**
   * Get memories (always from local data, never from extension)
   */
  async getMemories() {
    try {
      if (!this.isOpen || !this.vaultData) {
        return [];
      }
      
      const memories = this.vaultData.content?.memories || {};
      const media = this.vaultData.content?.media || {};
      
      // Reconstruct memories with media URLs
      const memoriesWithMedia = Object.values(memories).map(memory => {
        const attachments = (memory.attachments || []).map(attachment => {
          const mediaItem = media[attachment.id];
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
      
      console.log(`📝 PRIMARY: Returning ${memoriesWithMedia.length} memories from local data`);
      return memoriesWithMedia;
      
    } catch (error) {
      console.error('❌ PRIMARY: Failed to get memories:', error);
      return [];
    }
  }

  /**
   * Get people (always from local data)
   */
  async getPeople() {
    try {
      if (!this.isOpen || !this.vaultData) {
        return [];
      }
      
      const people = this.vaultData.content?.people || {};
      const media = this.vaultData.content?.media || {};
      
      // Reconstruct people with avatar URLs
      const peopleWithAvatars = Object.values(people).map(person => {
        let avatarUrl = person.avatarUrl;
        
        // Resolve avatar from media if needed
        if (!avatarUrl && person.avatarId && media[person.avatarId]) {
          const mediaItem = media[person.avatarId];
          avatarUrl = mediaItem.data.startsWith('data:')
            ? mediaItem.data
            : `data:${mediaItem.type};base64,${mediaItem.data}`;
        }
        
        return {
          ...person,
          avatarUrl
        };
      });
      
      console.log(`👥 PRIMARY: Returning ${peopleWithAvatars.length} people from local data`);
      return peopleWithAvatars;
      
    } catch (error) {
      console.error('❌ PRIMARY: Failed to get people:', error);
      return [];
    }
  }

  /**
   * Request passphrase with beautiful Emma secure modal
   * SECURITY: Uses Emma's encrypted modal system
   */
  async requestPassphrase(fileName) {
    try {
      console.log('🔐 PRIMARY: Requesting passphrase using Emma secure modal...');
      
      if (window.cleanSecurePasswordModal) {
        return await window.cleanSecurePasswordModal.show({
          title: 'Unlock Vault',
          message: `Enter the passphrase for your vault: ${fileName}`,
          placeholder: 'Enter vault passphrase...'
        });
      } else {
        console.warn('⚠️ PRIMARY: Secure modal not available, using fallback');
        // SECURITY WARNING: This fallback is not encrypted
        const passphrase = prompt(`🔐 Enter passphrase for ${fileName}:`);
        if (!passphrase) {
          throw new Error('Passphrase required');
        }
        return passphrase;
      }
    } catch (error) {
      if (error.message === 'User cancelled') {
        throw new Error('Vault unlock cancelled');
      }
      console.error('❌ PRIMARY: Passphrase request failed:', error);
      throw error;
    }
  }

  /**
   * Get vault statistics
   */
  getStats() {
    if (!this.vaultData) {
      return { memoryCount: 0, peopleCount: 0, mediaCount: 0 };
    }
    
    return {
      memoryCount: Object.keys(this.vaultData.content?.memories || {}).length,
      peopleCount: Object.keys(this.vaultData.content?.people || {}).length,
      mediaCount: Object.keys(this.vaultData.content?.media || {}).length,
      totalSize: JSON.stringify(this.vaultData).length
    };
  }

  /**
   * PHASE 2.3: Fallback decryption for Render (no extension)
   */
  async fallbackDecryption(encryptedData, passphrase) {
    try {
      console.log('🔓 PRIMARY FALLBACK: Decrypting vault data locally...');
      
      // Verify .emma file format
      const magicBytes = encryptedData.slice(0, 4);
      const magicString = new TextDecoder().decode(magicBytes);
      
      if (magicString !== 'EMMA') {
        throw new Error('Invalid .emma file format');
      }
      
      // Extract components
      const salt = encryptedData.slice(4, 36);
      const iv = encryptedData.slice(36, 48);
      const encrypted = encryptedData.slice(48);
      
      console.log('🔓 PRIMARY FALLBACK: File format verified, extracting data...');
      
      // Derive decryption key
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
        ['decrypt']
      );
      
      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted
      );
      
      // Parse JSON
      const jsonString = new TextDecoder().decode(decrypted);
      const vaultData = JSON.parse(jsonString);
      
      console.log('✅ PRIMARY FALLBACK: Vault decrypted successfully, memories:', 
        Object.keys(vaultData.content?.memories || {}).length);
      
      return {
        success: true,
        vaultData: vaultData
      };
      
    } catch (error) {
      console.error('❌ PRIMARY FALLBACK: Decryption failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * PHASE 2.3: Fallback encryption for Render (no extension)
   */
  async fallbackEncryption(vaultData, passphrase) {
    try {
      console.log('🔒 PRIMARY FALLBACK: Encrypting vault data locally...');
      
      // Generate salt for encryption
      const salt = crypto.getRandomValues(new Uint8Array(32));
      
      // Convert vault data to JSON string
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
      
      // Generate IV for encryption
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt the data
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        dataToEncrypt
      );
      
      // Create .emma file format
      const magicBytes = new TextEncoder().encode('EMMA');
      const saltBytes = salt;
      const ivBytes = iv;
      const encryptedBytes = new Uint8Array(encrypted);
      
      // Combine all parts
      const totalLength = 4 + 32 + 12 + encryptedBytes.length;
      const fileData = new Uint8Array(totalLength);
      
      let offset = 0;
      fileData.set(magicBytes, offset); offset += 4;
      fileData.set(saltBytes, offset); offset += 32;
      fileData.set(ivBytes, offset); offset += 12;
      fileData.set(encryptedBytes, offset);
      
      console.log('✅ PRIMARY FALLBACK: Vault encrypted successfully, size:', fileData.length);
      
      return {
        success: true,
        encryptedData: fileData
      };
      
    } catch (error) {
      console.error('❌ PRIMARY FALLBACK: Encryption failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if vault is open and has data
   */
  isVaultReady() {
    return this.isOpen && this.vaultData && this.vaultData.content;
  }

  /**
   * Lock vault (clear sensitive data, keep IndexedDB backup)
   */
  async lockVault() {
    try {
      console.log('🔒 PRIMARY: Locking vault...');
      
      // Save final state to file if possible
      if (this.fileHandle) {
        await this.saveVaultToFile();
      }
      
      // Clear sensitive data from memory
      this.isOpen = false;
      this.passphrase = null;
      this.vaultData = null;
      this.fileHandle = null;
      
      // Clear session storage
      sessionStorage.removeItem('emmaVaultActive');
      sessionStorage.removeItem('emmaVaultName');
      sessionStorage.removeItem('emmaVaultPassphrase');
      localStorage.removeItem('emmaVaultActive');
      localStorage.removeItem('emmaVaultName');
      
      // Update global status
      window.currentVaultStatus = {
        isUnlocked: false,
        hasVault: false,
        name: null
      };
      
      console.log('✅ PRIMARY: Vault locked successfully');
      return { success: true };
      
    } catch (error) {
      console.error('❌ PRIMARY: Failed to lock vault:', error);
      throw error;
    }
  }
}

// Feature flag: Only create if enabled
if (localStorage.getItem('USE_WEBAPP_PRIMARY') === 'true') {
  if (!window.emmaVaultPrimary) {
    window.emmaVaultPrimary = new EmmaVaultPrimary();
    console.log('🚀 PRIMARY: EmmaVaultPrimary created - Web App Primary Architecture active');
  } else {
    console.log('✅ PRIMARY: Using existing EmmaVaultPrimary instance');
  }
} else {
  console.log('🔧 PRIMARY: Feature flag disabled - using legacy architecture');
}

// Global access for debugging
window.EmmaVaultPrimary = EmmaVaultPrimary;

