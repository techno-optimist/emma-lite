/**
 * 🌟 Emma Companion Orb - Preset Component
 * 
 * Production-ready companion orb implementation
 * Demonstrates: Component composition, performance optimization, accessibility
 * Features: Smart defaults, interaction handling, visual effects
 */

import React, { useState, useCallback, useEffect } from 'react';
import { EmmaOrb } from '../core/EmmaOrb';
import { EmmaOrbProps, EmmaOrbState, EmmaInteractionHandlers } from '../core/types';

// ========================================
// COMPANION-SPECIFIC CONFIGURATION
// ========================================

/** Companion orb default theme */
const COMPANION_THEME = {
  hue: 250,        // Cosmic purple
  saturation: 80,  // Rich saturation
  lightness: 60,   // Balanced lightness
  intensity: 0.8,  // High intensity
  shadowIntensity: 0.6,
  borderGlow: 0.4,
};

/** Companion interaction states */
const COMPANION_STATES: Record<string, EmmaOrbState> = {
  IDLE: 'idle',
  LISTENING: 'listening',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
  CELEBRATING: 'celebrating',
  ATTENTION: 'attention',
  ERROR: 'error',
};

// ========================================
// COMPANION ORB COMPONENT
// ========================================

export interface EmmaCompanionOrbProps extends Omit<EmmaOrbProps, 'variant'> {
  /** Companion-specific interaction handlers */
  onConversationStart?: () => void;
  onConversationEnd?: () => void;
  onMemoryCapture?: () => void;
  onEmergencyTrigger?: () => void;
  /** Auto-transition to thinking state */
  autoThink?: boolean;
  /** Show celebration on success */
  showCelebration?: boolean;
  /** Enable voice interaction */
  voiceEnabled?: boolean;
}

export const EmmaCompanionOrb: React.FC<EmmaCompanionOrbProps> = ({
  size = 'large',
  state: externalState,
  theme = COMPANION_THEME,
  onConversationStart,
  onConversationEnd,
  onMemoryCapture,
  onEmergencyTrigger,
  autoThink = true,
  showCelebration = true,
  voiceEnabled = true,
  interactions,
  accessibility,
  ...props
}) => {
  // ========================================
  // STATE MANAGEMENT
  // ========================================

  const [isConversationActive, setIsConversationActive] = useState(false);
  const [currentState, setCurrentState] = useState<EmmaOrbState>(externalState || 'idle');
  const [lastInteraction, setLastInteraction] = useState<Date | null>(null);

  // Update state when external state changes
  useEffect(() => {
    if (externalState) {
      setCurrentState(externalState);
    }
  }, [externalState]);

  // ========================================
  // INTERACTION HANDLERS
  // ========================================

  const handleClick = useCallback(() => {
    setLastInteraction(new Date());
    
    if (!isConversationActive) {
      setIsConversationActive(true);
      setCurrentState('listening');
      onConversationStart?.();
    } else {
      // Cycle through conversation states
      switch (currentState) {
        case 'listening':
          if (autoThink) {
            setCurrentState('thinking');
            setTimeout(() => setCurrentState('speaking'), 1500);
          }
          break;
        case 'thinking':
          setCurrentState('speaking');
          break;
        case 'speaking':
          setCurrentState('idle');
          setIsConversationActive(false);
          onConversationEnd?.();
          break;
        default:
          setCurrentState('listening');
      }
    }

    interactions?.onClick?.();
  }, [
    isConversationActive,
    currentState,
    autoThink,
    onConversationStart,
    onConversationEnd,
    interactions?.onClick,
  ]);

  const handleDoubleClick = useCallback(() => {
    if (showCelebration) {
      setCurrentState('celebrating');
      setTimeout(() => setCurrentState('idle'), 1000);
    }
    onMemoryCapture?.();
    interactions?.onDoubleClick?.();
  }, [showCelebration, onMemoryCapture, interactions?.onDoubleClick]);

  const handleHoverStart = useCallback(() => {
    interactions?.onHoverStart?.();
  }, [interactions?.onHoverStart]);

  const handleHoverEnd = useCallback(() => {
    interactions?.onHoverEnd?.();
  }, [interactions?.onHoverEnd]);

  // ========================================
  // ACCESSIBILITY CONFIGURATION
  // ========================================

  const accessibilityConfig = {
    label: 'Emma companion assistant',
    description: `Emma is currently ${currentState}. Click to interact, double-click to capture memory.`,
    live: 'polite' as const,
    role: 'button',
    focusable: true,
    keyboardNavigation: true,
    announcements: {
      stateChanges: true,
      interactions: true,
      errors: true,
    },
    ...accessibility,
  };

  // ========================================
  // INTERACTION CONFIGURATION
  // ========================================

  const interactionHandlers: EmmaInteractionHandlers = {
    onClick: handleClick,
    onDoubleClick: handleDoubleClick,
    onHoverStart: handleHoverStart,
    onHoverEnd: handleHoverEnd,
    onStateChange: (newState: EmmaOrbState) => {
      console.log(`🌟 Emma state changed: ${currentState} → ${newState}`);
    },
    ...interactions,
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="relative flex flex-col items-center">
      <EmmaOrb
        {...props}
        variant="companion"
        size={size}
        state={currentState}
        theme={theme}
        interactions={interactionHandlers}
        accessibility={accessibilityConfig}
        testId="emma-companion-orb"
      >
        {/* Voice indicator for accessibility */}
        {voiceEnabled && currentState === 'speaking' && (
          <div 
            className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full animate-pulse"
            aria-label="Voice output active"
          />
        )}
      </EmmaOrb>
      
      {/* Conversation Status Bubble - Under the orb */}
      {isConversationActive && (
        <div 
          className="mt-2 px-3 py-1 bg-gray-800 text-white text-xs rounded-full shadow-lg"
          aria-hidden="true"
        >
          {currentState === 'listening' && '👂 Listening...'}
          {currentState === 'thinking' && '🤔 Thinking...'}
          {currentState === 'speaking' && '💬 Speaking...'}
        </div>
      )}
    </div>
  );
};

// ========================================
// EXPORTS
// ========================================

export default EmmaCompanionOrb; 