/**
 * REAL-TIME VAULT STATE MONITOR
 * Tracks EVERY vault state change with stack traces
 * Built to catch the auto-lock culprit red-handed!
 */

class VaultStateMonitor {
  constructor() {
    this.isMonitoring = false;
    this.stateHistory = [];
    this.maxHistory = 100;
    this.checkInterval = null;
    this.lastKnownState = null;
    
    console.log('🔍 VAULT MONITOR: Initialized - ready to catch auto-lock culprit!');
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🔍 VAULT MONITOR: Starting real-time monitoring...');
    
    // Monitor every 500ms
    this.checkInterval = setInterval(() => {
      this.checkVaultState();
    }, 500);
    
    // Also monitor on specific events
    this.setupEventMonitoring();
    
    // Initial state capture
    this.checkVaultState();
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    console.log('🔍 VAULT MONITOR: Stopped monitoring');
  }

  async checkVaultState() {
    try {
      // Get current state from all sources
      const currentState = await this.getCurrentState();
      
      // Check if state changed
      if (this.lastKnownState && this.hasStateChanged(currentState, this.lastKnownState)) {
        const change = this.detectStateChange(currentState, this.lastKnownState);
        
        // CRITICAL: If vault went from unlocked to locked, capture stack trace!
        if (change.type === 'LOCKED' && this.lastKnownState.isUnlocked && !currentState.isUnlocked) {
          console.error('🚨 VAULT MONITOR: AUTO-LOCK DETECTED!');
          console.error('🚨 Previous state:', this.lastKnownState);
          console.error('🚨 Current state:', currentState);
          console.error('🚨 Stack trace:', new Error().stack);
          
          // Capture detailed forensics
          this.captureAutoLockForensics(this.lastKnownState, currentState);
        }
        
        // Log all state changes
        this.logStateChange(change, this.lastKnownState, currentState);
      }
      
      this.lastKnownState = currentState;
      
    } catch (error) {
      console.warn('🔍 VAULT MONITOR: Check failed:', error);
    }
  }

  async getCurrentState() {
    const state = {
      timestamp: Date.now(),
      // Background FSM state
      backgroundState: null,
      backgroundDebug: null,
      // Web app localStorage
      webAppVaultActive: null,
      webAppVaultName: null,
      webAppSessionActive: null,
      webAppSessionName: null,
      // Extension popup state
      popupIsVaultOpen: window.emmaApp ? window.emmaApp.isVaultOpen : null,
      // Global status
      currentVaultStatus: window.currentVaultStatus,
      // Derived state
      isUnlocked: false
    };

    try {
      // Get background state
      if (chrome.runtime) {
        state.backgroundState = await chrome.runtime.sendMessage({ action: 'CHECK_STATE' });
        state.backgroundDebug = await chrome.runtime.sendMessage({ action: 'DEBUG_DUMP_STATE' });
      }
    } catch (e) {
      console.warn('🔍 MONITOR: Could not get background state:', e);
    }

    try {
      // Get web app state if on Emma site
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('emma-hijc.onrender.com')) {
        const webAppState = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => ({
            emmaVaultActive: localStorage.getItem('emmaVaultActive'),
            emmaVaultName: localStorage.getItem('emmaVaultName'),
            sessionVaultActive: sessionStorage.getItem('emmaVaultActive'),
            sessionVaultName: sessionStorage.getItem('emmaVaultName'),
            currentVaultStatus: window.currentVaultStatus,
            emmaWebVaultIsOpen: window.emmaWebVault ? window.emmaWebVault.isOpen : null
          })
        });
        
        if (webAppState[0]?.result) {
          const result = webAppState[0].result;
          state.webAppVaultActive = result.emmaVaultActive;
          state.webAppVaultName = result.emmaVaultName;
          state.webAppSessionActive = result.sessionVaultActive;
          state.webAppSessionName = result.sessionVaultName;
        }
      }
    } catch (e) {
      console.warn('🔍 MONITOR: Could not get web app state:', e);
    }

    // Determine if vault should be considered unlocked
    state.isUnlocked = (
      state.backgroundState?.state === 'unlocked' ||
      state.webAppVaultActive === 'true' ||
      state.webAppSessionActive === 'true' ||
      (state.currentVaultStatus && state.currentVaultStatus.isUnlocked) ||
      state.popupIsVaultOpen === true
    );

    return state;
  }

  hasStateChanged(current, previous) {
    return (
      current.isUnlocked !== previous.isUnlocked ||
      current.backgroundState?.state !== previous.backgroundState?.state ||
      current.webAppVaultActive !== previous.webAppVaultActive ||
      current.webAppSessionActive !== previous.webAppSessionActive ||
      current.popupIsVaultOpen !== previous.popupIsVaultOpen
    );
  }

  detectStateChange(current, previous) {
    if (current.isUnlocked && !previous.isUnlocked) {
      return { type: 'UNLOCKED', timestamp: current.timestamp };
    } else if (!current.isUnlocked && previous.isUnlocked) {
      return { type: 'LOCKED', timestamp: current.timestamp };
    } else {
      return { type: 'OTHER', timestamp: current.timestamp };
    }
  }

  logStateChange(change, previous, current) {
    console.log(`🔍 VAULT MONITOR: State change detected - ${change.type}`, {
      change,
      previous: {
        isUnlocked: previous.isUnlocked,
        backgroundState: previous.backgroundState?.state,
        webAppActive: previous.webAppVaultActive,
        popupOpen: previous.popupIsVaultOpen
      },
      current: {
        isUnlocked: current.isUnlocked,
        backgroundState: current.backgroundState?.state,
        webAppActive: current.webAppVaultActive,
        popupOpen: current.popupIsVaultOpen
      }
    });
  }

  captureAutoLockForensics(previous, current) {
    const forensics = {
      timestamp: new Date().toISOString(),
      event: 'AUTO_LOCK_DETECTED',
      previousState: previous,
      currentState: current,
      stackTrace: new Error().stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      changes: {
        backgroundStateChanged: current.backgroundState?.state !== previous.backgroundState?.state,
        webAppActiveChanged: current.webAppVaultActive !== previous.webAppVaultActive,
        sessionActiveChanged: current.webAppSessionActive !== previous.webAppSessionActive,
        popupStateChanged: current.popupIsVaultOpen !== previous.popupIsVaultOpen,
        globalStatusChanged: JSON.stringify(current.currentVaultStatus) !== JSON.stringify(previous.currentVaultStatus)
      }
    };
    
    console.error('🚨🚨🚨 AUTO-LOCK FORENSICS:', forensics);
    
    // Store forensics for later analysis
    this.storeForensics(forensics);
    
    // Try to identify the specific cause
    this.identifyAutoLockCause(forensics);
  }

  identifyAutoLockCause(forensics) {
    const changes = forensics.changes;
    let suspectedCause = 'UNKNOWN';
    
    if (changes.backgroundStateChanged) {
      suspectedCause = 'BACKGROUND_FSM_RESET';
    } else if (changes.webAppActiveChanged) {
      suspectedCause = 'WEB_APP_LOCALSTORAGE_CLEARED';
    } else if (changes.sessionActiveChanged) {
      suspectedCause = 'WEB_APP_SESSIONSTORAGE_CLEARED';
    } else if (changes.popupStateChanged) {
      suspectedCause = 'EXTENSION_POPUP_RESET';
    } else if (changes.globalStatusChanged) {
      suspectedCause = 'GLOBAL_STATUS_OVERRIDE';
    }
    
    console.error(`🎯 VAULT MONITOR: Suspected cause - ${suspectedCause}`);
    
    // Provide specific debugging advice
    switch (suspectedCause) {
      case 'BACKGROUND_FSM_RESET':
        console.error('💡 Check: Service worker restart, extension reload, or background script error');
        break;
      case 'WEB_APP_LOCALSTORAGE_CLEARED':
        console.error('💡 Check: Page reload, localStorage.clear(), or localStorage.removeItem calls');
        break;
      case 'WEB_APP_SESSIONSTORAGE_CLEARED':
        console.error('💡 Check: Tab navigation, sessionStorage.clear(), or page refresh');
        break;
      case 'EXTENSION_POPUP_RESET':
        console.error('💡 Check: Extension popup reinitialization or popup script error');
        break;
      case 'GLOBAL_STATUS_OVERRIDE':
        console.error('💡 Check: Dashboard initialization or window.currentVaultStatus assignment');
        break;
    }
  }

  storeForensics(forensics) {
    try {
      const key = 'emma_auto_lock_forensics';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(forensics);
      
      // Keep only last 10 forensic reports
      if (existing.length > 10) {
        existing.splice(0, existing.length - 10);
      }
      
      localStorage.setItem(key, JSON.stringify(existing));
      console.log('🔍 VAULT MONITOR: Forensics stored for analysis');
    } catch (e) {
      console.warn('🔍 VAULT MONITOR: Could not store forensics:', e);
    }
  }

  setupEventMonitoring() {
    // Monitor page visibility changes
    document.addEventListener('visibilitychange', () => {
      console.log('🔍 VAULT MONITOR: Visibility changed to:', document.visibilityState);
      setTimeout(() => this.checkVaultState(), 100);
    });

    // Monitor focus/blur
    window.addEventListener('focus', () => {
      console.log('🔍 VAULT MONITOR: Window focused');
      setTimeout(() => this.checkVaultState(), 100);
    });

    window.addEventListener('blur', () => {
      console.log('🔍 VAULT MONITOR: Window blurred');
      setTimeout(() => this.checkVaultState(), 100);
    });

    // Monitor storage changes
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.includes('emmaVault')) {
        console.log('🔍 VAULT MONITOR: Storage changed:', e.key, 'from', e.oldValue, 'to', e.newValue);
        setTimeout(() => this.checkVaultState(), 100);
      }
    });
  }

  // Get forensics history
  getForensicsHistory() {
    try {
      return JSON.parse(localStorage.getItem('emma_auto_lock_forensics') || '[]');
    } catch (e) {
      return [];
    }
  }

  // Clear forensics history
  clearForensics() {
    localStorage.removeItem('emma_auto_lock_forensics');
    console.log('🔍 VAULT MONITOR: Forensics history cleared');
  }
}

// Global instance
window.vaultStateMonitor = new VaultStateMonitor();

// Global functions for console access
window.startVaultMonitoring = () => {
  window.vaultStateMonitor.startMonitoring();
  console.log('🔍 VAULT MONITOR: Started! Will catch auto-lock red-handed.');
};

window.stopVaultMonitoring = () => {
  window.vaultStateMonitor.stopMonitoring();
};

window.getVaultForensics = () => {
  const history = window.vaultStateMonitor.getForensicsHistory();
  console.log('🔍 VAULT FORENSICS HISTORY:', history);
  return history;
};

window.clearVaultForensics = () => {
  window.vaultStateMonitor.clearForensics();
};

console.log('🔍 VAULT MONITOR: Ready! Call startVaultMonitoring() to begin surveillance.');
