// lib/timer-manager.js - Memory-safe timer management
// Prevents memory leaks from uncleaned timers

/**
 * Timer Manager - Centralized timer management with automatic cleanup
 * Prevents memory leaks from setTimeout/setInterval calls
 */
export class TimerManager {
  constructor() {
    this.timers = new Map();
    this.intervals = new Map();
    this.nextId = 1;
  }

  /**
   * Create a managed setTimeout
   * @param {Function} callback - Function to execute
   * @param {number} delay - Delay in milliseconds
   * @param {string} context - Context for debugging (optional)
   * @returns {string} Timer ID for cleanup
   */
  setTimeout(callback, delay, context = 'unknown') {
    const id = `timer_${this.nextId++}`;
    
    const timerId = setTimeout(() => {
      try {
        callback();
      } catch (error) {
        console.error(`TimerManager: Error in timeout ${id}:`, error);
      } finally {
        // Auto-cleanup after execution
        this.timers.delete(id);
      }
    }, delay);
    
    this.timers.set(id, {
      id: timerId,
      context,
      type: 'timeout',
      createdAt: Date.now(),
      delay
    });
    
    console.log(`⏰ TimerManager: Created timeout ${id} (${context}, ${delay}ms)`);
    return id;
  }

  /**
   * Create a managed setInterval
   * @param {Function} callback - Function to execute
   * @param {number} interval - Interval in milliseconds
   * @param {string} context - Context for debugging (optional)
   * @returns {string} Timer ID for cleanup
   */
  setInterval(callback, interval, context = 'unknown') {
    const id = `interval_${this.nextId++}`;
    
    const intervalId = setInterval(() => {
      try {
        callback();
      } catch (error) {
        console.error(`TimerManager: Error in interval ${id}:`, error);
      }
    }, interval);
    
    this.intervals.set(id, {
      id: intervalId,
      context,
      type: 'interval',
      createdAt: Date.now(),
      interval
    });
    
    console.log(`⏰ TimerManager: Created interval ${id} (${context}, ${interval}ms)`);
    return id;
  }

  /**
   * Clear a specific timer
   * @param {string} id - Timer ID
   */
  clear(id) {
    if (this.timers.has(id)) {
      const timer = this.timers.get(id);
      clearTimeout(timer.id);
      this.timers.delete(id);
      console.log(`🧹 TimerManager: Cleared timeout ${id}`);
    }
    
    if (this.intervals.has(id)) {
      const interval = this.intervals.get(id);
      clearInterval(interval.id);
      this.intervals.delete(id);
      console.log(`🧹 TimerManager: Cleared interval ${id}`);
    }
  }

  /**
   * Clear all timers (for cleanup)
   */
  clearAll() {
    let cleared = 0;
    
    // Clear all timeouts
    for (const [id, timer] of this.timers) {
      clearTimeout(timer.id);
      cleared++;
    }
    this.timers.clear();
    
    // Clear all intervals
    for (const [id, interval] of this.intervals) {
      clearInterval(interval.id);
      cleared++;
    }
    this.intervals.clear();
    
    console.log(`🧹 TimerManager: Cleared ${cleared} timers`);
    return cleared;
  }

  /**
   * Get timer statistics
   * @returns {Object} Timer stats
   */
  getStats() {
    const now = Date.now();
    const timeouts = Array.from(this.timers.values());
    const intervals = Array.from(this.intervals.values());
    
    return {
      timeouts: {
        count: timeouts.length,
        contexts: timeouts.map(t => t.context),
        oldestAge: timeouts.length > 0 ? now - Math.min(...timeouts.map(t => t.createdAt)) : 0
      },
      intervals: {
        count: intervals.length,
        contexts: intervals.map(i => i.context),
        oldestAge: intervals.length > 0 ? now - Math.min(...intervals.map(i => i.createdAt)) : 0
      },
      total: timeouts.length + intervals.length
    };
  }

  /**
   * Clean up old timers (emergency cleanup)
   * @param {number} maxAge - Maximum age in milliseconds (default: 5 minutes)
   */
  cleanupOld(maxAge = 5 * 60 * 1000) {
    const now = Date.now();
    let cleaned = 0;
    
    // Cleanup old timeouts
    for (const [id, timer] of this.timers) {
      if (now - timer.createdAt > maxAge) {
        clearTimeout(timer.id);
        this.timers.delete(id);
        cleaned++;
        console.warn(`🧹 TimerManager: Cleaned up old timeout ${id} (${timer.context})`);
      }
    }
    
    // Cleanup old intervals (these are more concerning)
    for (const [id, interval] of this.intervals) {
      if (now - interval.createdAt > maxAge) {
        clearInterval(interval.id);
        this.intervals.delete(id);
        cleaned++;
        console.warn(`🧹 TimerManager: Cleaned up old interval ${id} (${interval.context})`);
      }
    }
    
    return cleaned;
  }
}

// Export singleton instance
export const timerManager = new TimerManager();

// Auto-cleanup on extension unload
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onSuspend?.addListener(() => {
    timerManager.clearAll();
  });
}


















