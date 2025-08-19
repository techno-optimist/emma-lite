// test/setup/test-setup.js - Global test setup for Emma Vault System

// Mock Chrome Extension APIs
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
      onChanged: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    openOptionsPage: jest.fn()
  },
  tabs: {
    create: jest.fn(),
    captureVisibleTab: jest.fn()
  },
  notifications: {
    create: jest.fn()
  }
};

// Mock IndexedDB for testing
import 'fake-indexeddb/auto';

// Mock Crypto API if not available in test environment
if (!global.crypto) {
  const { webcrypto } = require('crypto');
  global.crypto = webcrypto;
}

// Mock window.prompt for backup passphrase tests
global.prompt = jest.fn().mockReturnValue('test-backup-passphrase-123456');

// Mock window.alert and confirm
global.alert = jest.fn();
global.confirm = jest.fn().mockReturnValue(true);

// Mock screen object for device fingerprinting
global.screen = {
  width: 1920,
  height: 1080
};

// Mock navigator for device fingerprinting
Object.defineProperty(global.navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Test Browser)',
  writable: true
});

Object.defineProperty(global.navigator, 'platform', {
  value: 'Test Platform',
  writable: true
});

Object.defineProperty(global.navigator, 'language', {
  value: 'en-US',
  writable: true
});

// Mock Intl for timezone testing
global.Intl = {
  DateTimeFormat: jest.fn().mockReturnValue({
    resolvedOptions: jest.fn().mockReturnValue({
      timeZone: 'America/New_York'
    })
  })
};

// Mock performance API for timing tests
global.performance = {
  now: jest.fn().mockReturnValue(Date.now())
};

// Mock Blob for backup tests
global.Blob = class MockBlob {
  constructor(parts, options) {
    this.parts = parts;
    this.type = options?.type || '';
    this.size = parts.reduce((size, part) => size + part.length, 0);
  }
};

// Mock URL for file downloads
global.URL = {
  createObjectURL: jest.fn().mockReturnValue('blob:mock-url'),
  revokeObjectURL: jest.fn()
};

// Security test utilities
global.SecurityTestHelpers = {
  /**
   * Generate test vault with known data
   */
  async createTestVault(passphrase = 'test-passphrase-123456') {
    const vaultId = `test_vault_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    // Mock vault creation
    chrome.storage.local.get.mockResolvedValue({
      emma_vault_initialized: true,
      emma_vault_session: {
        vaultId,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        version: 2,
        entropy: 8.0,
        deviceFingerprint: 'test-fingerprint'
      }
    });
    
    return { vaultId, passphrase };
  },

  /**
   * Mock vault unlock state
   */
  mockVaultUnlocked(vaultId) {
    chrome.storage.local.get.mockImplementation((keys) => {
      const result = {};
      if (keys.includes('emma_vault_session') || keys === 'emma_vault_session') {
        result.emma_vault_session = {
          vaultId,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
          version: 2,
          entropy: 8.0,
          deviceFingerprint: 'test-fingerprint'
        };
      }
      if (keys.includes('emma_vault_settings') || keys === 'emma_vault_settings') {
        result.emma_vault_settings = {
          verifier: {
            iv: new Array(12).fill(0),
            data: new Array(16).fill(0)
          }
        };
      }
      return Promise.resolve(result);
    });
  },

  /**
   * Mock storage operations
   */
  mockStorageOperations() {
    let storage = {};
    
    chrome.storage.local.get.mockImplementation((keys) => {
      if (typeof keys === 'string') {
        return Promise.resolve({ [keys]: storage[keys] });
      }
      
      const result = {};
      if (Array.isArray(keys)) {
        keys.forEach(key => {
          if (storage[key] !== undefined) {
            result[key] = storage[key];
          }
        });
      } else if (keys === null || keys === undefined) {
        return Promise.resolve(storage);
      }
      
      return Promise.resolve(result);
    });
    
    chrome.storage.local.set.mockImplementation((items) => {
      Object.assign(storage, items);
      return Promise.resolve();
    });
    
    chrome.storage.local.remove.mockImplementation((keys) => {
      if (typeof keys === 'string') {
        delete storage[keys];
      } else if (Array.isArray(keys)) {
        keys.forEach(key => delete storage[key]);
      }
      return Promise.resolve();
    });
    
    chrome.storage.local.clear.mockImplementation(() => {
      storage = {};
      return Promise.resolve();
    });
    
    return storage;
  },

  /**
   * Calculate test data entropy
   */
  calculateEntropy(data) {
    const frequency = new Map();
    for (const byte of data) {
      frequency.set(byte, (frequency.get(byte) || 0) + 1);
    }
    
    let entropy = 0;
    const length = data.length;
    for (const count of frequency.values()) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }
    
    return entropy;
  }
};

// Global test configuration
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Setup default storage mock
  global.SecurityTestHelpers.mockStorageOperations();
});

afterEach(() => {
  // Cleanup after each test
  jest.resetAllMocks();
});

// Increase timeout for security tests
jest.setTimeout(30000);

