'use strict';

(function(global){
  const { InMemoryAdapter } = global.EmmaVaultAdapters || {};

  function isOPFSSupported() {
    return !!(global.navigator && global.navigator.storage && global.navigator.storage.getDirectory);
  }

  function isExtensionContext() {
    // Heuristic: presence of chrome.runtime and not a service worker-only context
    try { return !!(global.chrome && global.chrome.runtime && global.chrome.runtime.id); } catch { return false; }
  }

  function adapterIdFromEnv() {
    if (isExtensionContext()) return 'extension';
    if (isOPFSSupported()) return 'opfs';
    return 'memory';
  }

  async function selectAdapter() {
    const id = adapterIdFromEnv();
    if (id === 'opfs') {
      if (!global.EmmaVaultOPFSAdapter) {
        // Lazy define placeholder to avoid crash; caller should handle feature warnings
        return new InMemoryAdapter();
      }
      return new global.EmmaVaultOPFSAdapter();
    }
    if (id === 'extension') {
      if (!global.EmmaVaultExtensionAdapter) return new InMemoryAdapter();
      return new global.EmmaVaultExtensionAdapter();
    }
    return new InMemoryAdapter();
  }

  global.EmmaVaultAdapterSelector = {
    selectAdapter,
    adapterIdFromEnv,
    isOPFSSupported,
    isExtensionContext
  };
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis));

