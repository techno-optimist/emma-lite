/**
 * 🎬 Emma Animations Hook
 * 
 * Centralized animation state management for Emma orbs
 * Handles: State transitions, performance monitoring, cleanup
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { EmmaOrbState, AnimationConfig, AnimationPerformance } from '../core/types';

// ========================================
// ANIMATION CONFIGURATION
// ========================================

const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  performance: 'high',
  respectReducedMotion: true,
  maxConcurrent: 3,
  speedMultiplier: 1,
  enabledTypes: {
    movement: true,
    scaling: true,
    rotation: true,
    opacity: true,
    color: true,
    effects: true,
  },
};

// ========================================
// PERFORMANCE MONITORING
// ========================================

interface PerformanceMetrics {
  frameRate: number;
  memoryUsage: number;
  renderTime: number;
}

const usePerformanceMonitoring = (componentId: string) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    frameRate: 60,
    memoryUsage: 0,
    renderTime: 0,
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    const updateMetrics = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      
      if (delta >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / delta);
        
        setMetrics(prev => ({
          ...prev,
          frameRate: fps,
          memoryUsage: (performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0,
        }));
        
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      
      frameCountRef.current++;
      requestAnimationFrame(updateMetrics);
    };

    const animationId = requestAnimationFrame(updateMetrics);
    
    return () => cancelAnimationFrame(animationId);
  }, [componentId]);

  return metrics;
};

// ========================================
// MAIN HOOK
// ========================================

interface UseEmmaAnimationsOptions {
  performance?: AnimationPerformance;
  componentId?: string;
  onStateChange?: (state: EmmaOrbState) => void;
}

export const useEmmaAnimations = (
  initialState: EmmaOrbState = 'idle',
  options: UseEmmaAnimationsOptions = {}
) => {
  const {
    performance = 'high',
    componentId = 'emma-orb',
    onStateChange,
  } = options;

  // ========================================
  // STATE MANAGEMENT
  // ========================================

  const [currentState, setCurrentState] = useState<EmmaOrbState>(initialState);
  const [config, setConfig] = useState<AnimationConfig>({
    ...DEFAULT_ANIMATION_CONFIG,
    performance,
  });
  const [activeAnimations, setActiveAnimations] = useState<string[]>([]);

  // Performance monitoring
  const metrics = usePerformanceMonitoring(componentId);

  // ========================================
  // STATE TRANSITIONS
  // ========================================

  const setState = useCallback((newState: EmmaOrbState) => {
    if (newState === currentState) return;

    setCurrentState(newState);
    onStateChange?.(newState);

    // Add to active animations tracking
    const animationId = `${componentId}-${newState}-${Date.now()}`;
    setActiveAnimations(prev => [...prev, animationId]);

    // Clean up after animation duration
    setTimeout(() => {
      setActiveAnimations(prev => prev.filter(id => id !== animationId));
    }, 2000); // Default animation duration
  }, [currentState, componentId, onStateChange]);

  // ========================================
  // PERFORMANCE OPTIMIZATION
  // ========================================

  const updateConfig = useCallback((newConfig: Partial<AnimationConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // Auto-adjust performance based on metrics
  useEffect(() => {
    if (metrics.frameRate < 30 && config.performance === 'high') {
      updateConfig({ performance: 'medium' });
    } else if (metrics.frameRate < 15 && config.performance === 'medium') {
      updateConfig({ performance: 'low' });
    }
  }, [metrics.frameRate, config.performance, updateConfig]);

  // ========================================
  // CLEANUP
  // ========================================

  useEffect(() => {
    return () => {
      // Clean up any remaining animations
      setActiveAnimations([]);
    };
  }, []);

  // ========================================
  // RETURN API
  // ========================================

  return {
    currentState,
    setState,
    config,
    updateConfig,
    activeAnimations,
    metrics,
    
    // Utility functions
    isAnimating: activeAnimations.length > 0,
    canAnimate: activeAnimations.length < config.maxConcurrent,
    
    // Performance helpers
    getOptimalPerformance: () => {
      if (metrics.frameRate >= 50) return 'high';
      if (metrics.frameRate >= 30) return 'medium';
      if (metrics.frameRate >= 15) return 'low';
      return 'minimal';
    },
  };
};

export default useEmmaAnimations;

