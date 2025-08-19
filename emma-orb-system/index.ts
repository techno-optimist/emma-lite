/**
 * 🌟 Emma Orb System - Main Export
 * 
 * Production-ready Emma orb system for the Emma Memory Companion
 * Provides: Core components, presets, animations, and utilities
 */

// ========================================
// CORE COMPONENTS
// ========================================

export { EmmaOrb } from './core/EmmaOrb';
export { default as WebGLOrb } from './core/WebGLOrb';

// ========================================
// TYPE DEFINITIONS
// ========================================

export type {
  EmmaOrbProps,
  EmmaOrbVariant,
  EmmaOrbSize,
  EmmaOrbState,
  EmmaOrbContainer,
  EmmaOrbPosition,
  EmmaTheme,
  EmmaThemePreset,
  EmmaInteractionHandlers,
  AccessibilityConfig,
  AnimationConfig,
  AnimationPerformance,
  VisualEffectConfig,
  ResponsiveConfig,
} from './core/types';

// ========================================
// ANIMATION SYSTEM
// ========================================

export { useEmmaAnimations } from './animations/useEmmaAnimations';

// ========================================
// PRESET COMPONENTS
// ========================================

export { EmmaCompanionOrb } from './presets/EmmaCompanionOrb';

// ========================================
// EXAMPLES & SHOWCASE
// ========================================

export { default as EmmaOrbShowcase } from './examples/EmmaOrbShowcase';

// ========================================
// UTILITY FUNCTIONS
// ========================================

export const createEmmaTheme = (
  hue: number,
  saturation: number = 80,
  lightness: number = 60,
  intensity: number = 0.8
) => ({
  hue,
  saturation,
  lightness,
  intensity,
  shadowIntensity: intensity * 0.7,
  borderGlow: intensity * 0.4,
});

export const EMMA_THEME_PRESETS = {
  cosmic: createEmmaTheme(250, 80, 60, 0.8),
  warm: createEmmaTheme(30, 85, 65, 0.7),
  cool: createEmmaTheme(200, 75, 55, 0.8),
  nature: createEmmaTheme(120, 70, 50, 0.6),
  sunset: createEmmaTheme(15, 90, 70, 0.9),
  monochrome: createEmmaTheme(0, 0, 50, 0.5),
};

export const EMMA_SIZE_PRESETS = {
  micro: 32,
  tiny: 40,
  small: 48,
  medium: 64,
  large: 80,
  xl: 96,
  xxl: 128,
  giant: 160,
};

// ========================================
// VERSION INFO
// ========================================

export const EMMA_ORB_SYSTEM_VERSION = '1.0.0';
export const EMMA_ORB_SYSTEM_BUILD = 'production';

// ========================================
// DEFAULT EXPORT
// ========================================

export { EmmaOrb as default } from './core/EmmaOrb';

