/**
 * 🌟 Emma Orb System - Core Type Definitions
 * 
 * Comprehensive type system for the Emma orb components
 * Designed for type safety, extensibility, and developer experience
 */

import { ReactNode, CSSProperties } from 'react';
import { Variants, Transition, PanInfo } from 'framer-motion';

// ========================================
// CORE ENUMS & TYPES
// ========================================

/** Core Emma orb variants for different contexts */
export type EmmaOrbVariant = 
  | 'companion'      // Main Emma companion interface
  | 'memory'         // Memory capsule context
  | 'relationship'   // Relationship context  
  | 'chat'           // Chat interface
  | 'wizard'         // Wizard interface
  | 'custom';        // Custom implementation

/** Standard size presets with pixel values */
export type EmmaOrbSize = 
  | 'micro'    // 32px - minimal contexts
  | 'tiny'     // 40px - compact mobile
  | 'small'    // 48px - standard mobile
  | 'medium'   // 64px - standard desktop
  | 'large'    // 80px - emphasis
  | 'xl'       // 96px - modal/hero
  | 'xxl'      // 128px - showcase
  | 'giant';   // 160px - marketing

/** Emma orb animation states */
export type EmmaOrbState = 
  | 'idle'        // Default floating
  | 'hovering'    // Mouse hover
  | 'active'      // Click/interaction
  | 'thinking'    // Processing
  | 'speaking'    // Voice output
  | 'listening'   // Voice input
  | 'celebrating' // Success/joy
  | 'attention'   // Needs attention
  | 'emergency'   // Alert state
  | 'sleeping'    // Inactive/minimized
  | 'loading'     // Initial load
  | 'error';      // Error state

/** Container contexts for responsive behavior */
export type EmmaOrbContainer =
  | 'viewport'    // Full viewport positioning
  | 'modal'       // Modal dialog context
  | 'sidebar'     // Sidebar/panel context
  | 'inline'      // Inline with content
  | 'floating';   // Fixed floating position

/** Positioning options */
export type EmmaOrbPosition = 
  | 'center'       // Center of container
  | 'top-left'     // Top left corner
  | 'top-right'    // Top right corner
  | 'bottom-left'  // Bottom left corner
  | 'bottom-right' // Bottom right corner
  | 'custom';      // Custom positioning

// ========================================
// THEME & STYLING
// ========================================

/** Core theme configuration */
export interface EmmaTheme {
  /** Primary hue (0-360) */
  hue: number;
  /** Saturation percentage (0-100) */
  saturation: number;
  /** Lightness percentage (0-100) */
  lightness: number;
  /** Visual intensity (0-1) */
  intensity: number;
  /** Shadow intensity (0-1) */
  shadowIntensity: number;
  /** Border glow intensity (0-1) */
  borderGlow: number;
  /** Custom CSS properties */
  customProperties?: Record<string, string | number>;
}

/** Predefined theme presets */
export type EmmaThemePreset = 
  | 'cosmic'      // Purple/blue cosmic theme
  | 'warm'        // Orange/yellow warm theme
  | 'cool'        // Blue/teal cool theme
  | 'nature'      // Green/earth nature theme
  | 'sunset'      // Pink/orange sunset theme
  | 'monochrome'  // Grayscale theme
  | 'custom';     // Custom theme

/** Size configuration with responsive breakpoints */
export interface SizeConfig {
  /** Base size in pixels */
  size: number;
  /** Text scale factor */
  textScale: number;
  /** Effect scale factor */
  effectScale: number;
  /** Spacing scale factor */
  spacingScale: number;
  /** Responsive breakpoints */
  breakpoints?: {
    mobile?: Partial<SizeConfig>;
    tablet?: Partial<SizeConfig>;
    desktop?: Partial<SizeConfig>;
  };
}

// ========================================
// ANIMATION SYSTEM
// ========================================

/** Animation performance levels */
export type AnimationPerformance = 
  | 'high'     // All animations enabled
  | 'medium'   // Reduced complexity
  | 'low'      // Essential only
  | 'minimal'; // Static/reduced motion

/** Animation configuration */
export interface AnimationConfig {
  /** Performance level */
  performance: AnimationPerformance;
  /** Respect reduced motion preference */
  respectReducedMotion: boolean;
  /** Maximum simultaneous animations */
  maxConcurrent: number;
  /** Global animation speed multiplier */
  speedMultiplier: number;
  /** Enable/disable specific animation types */
  enabledTypes: {
    movement: boolean;
    scaling: boolean;
    rotation: boolean;
    opacity: boolean;
    color: boolean;
    effects: boolean;
  };
}

/** Animation state transition */
export interface AnimationTransition {
  /** Target state */
  to: EmmaOrbState;
  /** Transition duration in seconds */
  duration?: number;
  /** Easing function */
  ease?: string | number[];
  /** Delay before starting */
  delay?: number;
  /** Repeat configuration */
  repeat?: number | 'infinite';
  /** Cleanup function */
  cleanup?: () => void;
}

// ========================================
// INTERACTION SYSTEM  
// ========================================

/** User interaction handlers */
export interface EmmaInteractionHandlers {
  /** Click/tap interaction */
  onClick?: () => void;
  /** Double click/tap */
  onDoubleClick?: () => void;
  /** Hover start */
  onHoverStart?: () => void;
  /** Hover end */
  onHoverEnd?: () => void;
  /** Focus */
  onFocus?: () => void;
  /** Blur */
  onBlur?: () => void;
  /** Drag start */
  onDragStart?: () => void;
  /** Drag end */
  onDragEnd?: () => void;
  /** Long press */
  onLongPress?: () => void;
  /** State change */
  onStateChange?: (newState: EmmaOrbState) => void;
}

/** Gesture configuration */
export interface GestureConfig {
  /** Enable drag interactions */
  enableDrag: boolean;
  /** Enable hover effects */
  enableHover: boolean;
  /** Enable touch gestures */
  enableTouch: boolean;
  /** Drag constraints */
  dragConstraints?: {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  };
  /** Touch sensitivity */
  touchSensitivity: number;
}

// ========================================
// ACCESSIBILITY
// ========================================

/** Accessibility configuration */
export interface AccessibilityConfig {
  /** ARIA label */
  label?: string;
  /** ARIA description */
  description?: string;
  /** ARIA live region type */
  live?: 'off' | 'polite' | 'assertive';
  /** Role attribute */
  role?: string;
  /** Focusable */
  focusable: boolean;
  /** Keyboard navigation */
  keyboardNavigation: boolean;
  /** Screen reader announcements */
  announcements: {
    stateChanges: boolean;
    interactions: boolean;
    errors: boolean;
  };
}

// ========================================
// VISUAL EFFECTS
// ========================================

/** Visual effect types */
export type VisualEffectType = 
  | 'sparkles'    // Sparkle animations
  | 'glow'        // Glow effects
  | 'pulse'       // Pulsing effects
  | 'ripple'      // Ripple animations
  | 'particles'   // Particle effects
  | 'trails'      // Motion trails
  | 'shimmer'     // Shimmer effects
  | 'gradient';   // Gradient animations

/** Visual effect configuration */
export interface VisualEffectConfig {
  /** Effect type */
  type: VisualEffectType;
  /** Intensity (0-1) */
  intensity: number;
  /** Duration in seconds */
  duration: number;
  /** Color override */
  color?: string;
  /** Custom properties */
  properties?: Record<string, any>;
  /** Trigger conditions */
  triggers: EmmaOrbState[];
}

// ========================================
// RESPONSIVE SYSTEM
// ========================================

/** Responsive configuration */
export interface ResponsiveConfig {
  /** Breakpoint definitions */
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  /** Size scaling per breakpoint */
  scaling: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  /** Behavior adaptations */
  adaptations: {
    mobile: {
      reduceAnimations: boolean;
      simplifyEffects: boolean;
      increaseTouchTargets: boolean;
    };
    tablet: {
      reduceAnimations: boolean;
      simplifyEffects: boolean;
    };
    desktop: {
      enableAdvancedEffects: boolean;
      enableHoverStates: boolean;
    };
  };
}

// ========================================
// CORE COMPONENT PROPS
// ========================================

/** Core EmmaOrb component properties */
export interface EmmaOrbProps {
  /** Orb variant */
  variant?: EmmaOrbVariant;
  /** Size preset or custom size */
  size?: EmmaOrbSize | number;
  /** Current state */
  state?: EmmaOrbState;
  /** Theme configuration */
  theme?: EmmaTheme | EmmaThemePreset;
  /** Container context */
  container?: EmmaOrbContainer;
  /** Position within container */
  position?: EmmaOrbPosition;
  /** Custom positioning */
  customPosition?: { x: number; y: number };
  /** Interaction handlers */
  interactions?: EmmaInteractionHandlers;
  /** Gesture configuration */
  gestures?: Partial<GestureConfig>;
  /** Accessibility configuration */
  accessibility?: Partial<AccessibilityConfig>;
  /** Animation configuration */
  animations?: Partial<AnimationConfig>;
  /** Visual effects */
  effects?: VisualEffectConfig[];
  /** Responsive behavior */
  responsive?: Partial<ResponsiveConfig>;
  /** Custom CSS styles */
  style?: CSSProperties;
  /** CSS class name */
  className?: string;
  /** Child components */
  children?: ReactNode;
  /** Test ID for testing */
  testId?: string;
  /** Debug mode */
  debug?: boolean;
}

// ========================================
// CONTEXT TYPES
// ========================================

/** Emma orb system context */
export interface EmmaOrbContext {
  /** Global theme */
  theme: EmmaTheme;
  /** Global animation config */
  animations: AnimationConfig;
  /** Global responsive config */
  responsive: ResponsiveConfig;
  /** Performance monitoring */
  performance: {
    activeAnimations: number;
    frameRate: number;
    memoryUsage: number;
  };
  /** Update functions */
  updateTheme: (theme: Partial<EmmaTheme>) => void;
  updateAnimations: (config: Partial<AnimationConfig>) => void;
  updateResponsive: (config: Partial<ResponsiveConfig>) => void;
}

// ========================================
// UTILITY TYPES
// ========================================

/** Extract size value from size type */
export type SizeValue<T extends EmmaOrbSize | number> = 
  T extends number ? T : T extends EmmaOrbSize ? number : never;

/** Animation variant map */
export type AnimationVariants = Record<EmmaOrbState | 'initial', Variants>;

/** Effect component props */
export interface EffectComponentProps {
  size: number;
  theme: EmmaTheme;
  state: EmmaOrbState;
  config: VisualEffectConfig;
}

/** Performance metrics */
export interface PerformanceMetrics {
  /** Render time in milliseconds */
  renderTime: number;
  /** Animation frame rate */
  frameRate: number;
  /** Memory usage in MB */
  memoryUsage: number;
  /** Bundle size in KB */
  bundleSize: number;
  /** Time to interactive */
  timeToInteractive: number;
}

// ========================================
// EXPORTS
// ========================================

export type {
  // Re-export for convenience
  Variants,
  Transition,
  PanInfo,
  ReactNode,
  CSSProperties
}; 