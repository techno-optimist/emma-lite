/**
 * 🎛️ Emma Orb Settings Hook
 * 
 * Manages orb settings with localStorage persistence and real-time updates
 */

import { useState, useEffect, useCallback } from 'react';

const DEFAULT_SETTINGS = {
  visual: {
    hue: 250,
    saturation: 80,
    lightness: 60,
    haloIntensity: 0.8,
    haloThickness: 0.4,
    noiseScale: 0.65,
    innerRadius: 0.6,
    rotationSpeed: 0.3,
    glowIntensity: 1.0,
    colorVariation: 0.5,
    gradientStops: 4,
    opacity: 1.0
  },
  contextual: {
    moodDetection: true,
    conversationSync: true,
    environmentalResponse: true,
    timeOfDayAdaptation: true,
    userProximityResponse: true,
    emotionalResonance: 0.7,
    contextualMemory: true,
    adaptiveColors: true,
    stressResponse: true,
    celebrationMode: true
  },
  behavioral: {
    idleAnimation: 'float',
    hoverResponse: 'scale',
    clickResponse: 'pulse',
    voiceSync: true,
    breathingPattern: true,
    attentionSeeking: false,
    interactionDelay: 200,
    animationSpeed: 1.0,
    responsiveness: 0.8,
    personalityMode: 'friendly'
  },
  advanced: {
    performanceMode: 'high',
    debugMode: false,
    accessibilityMode: false,
    reducedMotion: false,
    batteryOptimization: false,
    webglFallback: true,
    frameRateLimit: 60,
    qualityScaling: 'auto',
    memoryOptimization: true,
    analyticsTracking: false
  }
};

const STORAGE_KEY = 'emma-orb-settings';

export const useOrbSettings = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        // Merge with defaults to ensure all properties exist
        const mergedSettings = {
          visual: { ...DEFAULT_SETTINGS.visual, ...parsed.visual },
          contextual: { ...DEFAULT_SETTINGS.contextual, ...parsed.contextual },
          behavioral: { ...DEFAULT_SETTINGS.behavioral, ...parsed.behavioral },
          advanced: { ...DEFAULT_SETTINGS.advanced, ...parsed.advanced }
        };
        setSettings(mergedSettings);
      }
    } catch (error) {
      console.error('Failed to load orb settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings = settings) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      setHasChanges(false);
      return true;
    } catch (error) {
      console.error('Failed to save orb settings:', error);
      return false;
    }
  }, [settings]);

  // Update settings
  const updateSettings = useCallback((newSettings) => {
    setSettings(newSettings);
    setHasChanges(true);
  }, []);

  // Update a specific setting
  const updateSetting = useCallback((category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    setHasChanges(true);
  }, []);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
  }, []);

  // Apply preset
  const applyPreset = useCallback((preset) => {
    const newSettings = { ...settings, ...preset.settings };
    setSettings(newSettings);
    setHasChanges(true);
  }, [settings]);

  // Export settings
  const exportSettings = useCallback(() => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'emma-orb-settings.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [settings]);

  // Import settings
  const importSettings = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          const mergedSettings = {
            visual: { ...DEFAULT_SETTINGS.visual, ...imported.visual },
            contextual: { ...DEFAULT_SETTINGS.contextual, ...imported.contextual },
            behavioral: { ...DEFAULT_SETTINGS.behavioral, ...imported.behavioral },
            advanced: { ...DEFAULT_SETTINGS.advanced, ...imported.advanced }
          };
          setSettings(mergedSettings);
          setHasChanges(true);
          resolve(mergedSettings);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }, []);

  // Get current theme colors based on settings
  const getCurrentTheme = useCallback(() => {
    const { hue, saturation, lightness } = settings.visual;
    return {
      hue,
      saturation,
      lightness,
      intensity: settings.visual.haloIntensity,
      primary: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      light: `hsl(${hue}, ${saturation}%, ${Math.min(lightness + 20, 100)}%)`,
      dark: `hsl(${hue}, ${saturation}%, ${Math.max(lightness - 20, 0)}%)`
    };
  }, [settings.visual]);

  // Check if reduced motion is preferred
  const shouldReduceMotion = useCallback(() => {
    return settings.advanced.reducedMotion || 
           (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, [settings.advanced.reducedMotion]);

  // Get performance settings
  const getPerformanceSettings = useCallback(() => {
    const { performanceMode, frameRateLimit, qualityScaling } = settings.advanced;
    
    let quality = 1.0;
    if (qualityScaling !== 'auto') {
      quality = parseFloat(qualityScaling.replace('x', ''));
    } else {
      // Auto-detect based on device capabilities
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      if (gl) {
        const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        quality = maxTextureSize >= 4096 ? 1.0 : 0.75;
      }
    }

    return {
      quality,
      frameRate: frameRateLimit,
      mode: performanceMode,
      webglFallback: settings.advanced.webglFallback
    };
  }, [settings.advanced]);

  return {
    settings,
    isLoading,
    hasChanges,
    updateSettings,
    updateSetting,
    saveSettings,
    resetSettings,
    applyPreset,
    exportSettings,
    importSettings,
    getCurrentTheme,
    shouldReduceMotion,
    getPerformanceSettings,
    defaults: DEFAULT_SETTINGS
  };
};

