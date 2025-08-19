/**
 * Jest test setup for HML compliance testing
 * Configures environment for crypto operations and DOM simulation
 */

// Import required polyfills for Node.js environment
import { TextEncoder, TextDecoder } from 'util';
import { webcrypto } from 'crypto';

// Setup global crypto for Node.js
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

// Setup TextEncoder/TextDecoder for Node.js
if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

// Mock Chrome APIs for extension testing
globalThis.chrome = {
  storage: {
    local: {
      get: jest.fn((keys) => {
        return Promise.resolve({});
      }),
      set: jest.fn((items) => {
        return Promise.resolve();
      }),
      remove: jest.fn((keys) => {
        return Promise.resolve();
      })
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  }
};

// Mock window object for vault manager
globalThis.window = globalThis.window || {};
globalThis.window.vaultManager = {
  getKeyring: jest.fn(() => Promise.resolve(null))
};

// Setup console for better test output
const originalConsole = console;
globalThis.console = {
  ...originalConsole,
  warn: jest.fn((...args) => {
    // Only show warnings in verbose mode
    if (process.env.VERBOSE_TESTS) {
      originalConsole.warn(...args);
    }
  }),
  error: jest.fn((...args) => {
    originalConsole.error(...args);
  })
};

// Setup test timeout
jest.setTimeout(30000); // 30 seconds for crypto operations

