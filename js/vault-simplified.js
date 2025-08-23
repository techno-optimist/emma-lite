/**
 * Emma Vault Simplified - Extension Vault Operations (DEPRECATED)
 * 
 * ⚠️ WEBAPP-FIRST ARCHITECTURE: This file is deprecated
 * All vault operations now handled by webapp (js/emma-web-vault.js)
 * 
 * This file exists only for compatibility during transition
 */

console.warn('🚨 DEPRECATED: js/vault-simplified.js is no longer used. All vault operations handled by webapp.');

// Redirect any vault operations to webapp
if (typeof window !== 'undefined' && window.emmaWebVault) {
  console.log('✅ WEBAPP-FIRST: Vault operations redirected to webapp');
} else {
  console.error('❌ WEBAPP-FIRST: Webapp vault not available for operations');
}

// Export empty objects for compatibility
export const getVaultManager = () => {
  console.warn('🚨 DEPRECATED: getVaultManager() - use window.emmaWebVault instead');
  return null;
};

export const VaultManager = class {
  constructor() {
    console.warn('🚨 DEPRECATED: VaultManager class - use window.emmaWebVault instead');
  }
};
