/**
 * NUCLEAR OPTION: Dead Simple Vault System
 * One flag, one rule: unlocked = true/false
 * Built with love for Debbe - SIMPLICITY FIRST
 */

class SimpleVault {
  constructor() {
    this.VAULT_KEY = 'emmaSimpleVaultUnlocked';
    this.NAME_KEY = 'emmaSimpleVaultName';
    
    console.log('🔥 SIMPLE VAULT: Initialized with nuclear simplicity');
  }
  
  /**
   * Check if vault is unlocked (ONLY source of truth)
   */
  isUnlocked() {
    const unlocked = localStorage.getItem(this.VAULT_KEY) === 'true';
    console.log('🔥 SIMPLE VAULT: Vault unlocked?', unlocked);
    return unlocked;
  }
  
  /**
   * Get vault name
   */
  getVaultName() {
    return localStorage.getItem(this.NAME_KEY) || 'My Vault';
  }
  
  /**
   * Unlock vault (sets flag to true)
   */
  unlock(vaultName = 'My Vault') {
    localStorage.setItem(this.VAULT_KEY, 'true');
    localStorage.setItem(this.NAME_KEY, vaultName);
    console.log('🔥 SIMPLE VAULT: Vault unlocked -', vaultName);
    
    // Also update legacy keys for compatibility
    localStorage.setItem('emmaVaultActive', 'true');
    localStorage.setItem('emmaVaultName', vaultName);
  }
  
  /**
   * Lock vault (sets flag to false)
   */
  lock() {
    localStorage.setItem(this.VAULT_KEY, 'false');
    localStorage.removeItem(this.NAME_KEY);
    console.log('🔥 SIMPLE VAULT: Vault locked');
    
    // Also clear legacy keys
    localStorage.setItem('emmaVaultActive', 'false');
    localStorage.removeItem('emmaVaultName');
  }
  
  /**
   * Force unlock (for emergency situations)
   */
  forceUnlock(vaultName = 'Emergency Vault') {
    console.log('🚨 SIMPLE VAULT: FORCE UNLOCK - emergency override');
    this.unlock(vaultName);
  }
}

// Global simple vault instance
window.simpleVault = new SimpleVault();

console.log('🔥 SIMPLE VAULT: Dead simple vault system ready');
