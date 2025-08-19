/**
 * 🌟 Emma Orb - Core Component
 * 
 * Minimal, focused core component for Emma orb rendering
 * Handles: Basic visual rendering, essential animations, prop management
 * Does NOT handle: Complex effects, interactions, theming (those are composed)
 */

import React, { forwardRef, useMemo, useState, useEffect } from 'react';
import { EmmaOrbProps, EmmaOrbState, EmmaOrbSize } from './types';
import ReactBitsOrbExact from './ReactBitsOrbExact';

// ========================================
// SIZE CONFIGURATION
// ========================================

const SIZE_PRESETS: Record<EmmaOrbSize, number> = {
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
// CSS ANIMATION CLASSES
// ========================================

const getAnimationClass = (state: EmmaOrbState, prefersReducedMotion: boolean) => {
  if (prefersReducedMotion) {
    return `emma-orb--${state}-reduced`;
  }
  return `emma-orb--${state}`;
};

// ========================================
// CSS STYLES
// ========================================

const orbStyles = `
  .emma-orb {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease-out;
    overflow: visible;
    z-index: 0;
  }
  
  .emma-orb__core {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    z-index: 0;
  }
  
  .emma-orb__reactbits:hover {
    transform: scale(1.05) translateY(-2px);
  }
  
  .emma-orb--idle .emma-orb__reactbits {
    animation: emma-float 4s ease-in-out infinite;
  }
  
  .emma-orb--hovering .emma-orb__reactbits {
    transform: scale(1.1) translateY(-12px);
  }
  
  .emma-orb--active .emma-orb__reactbits {
    transform: scale(0.95);
  }
  
  @keyframes emma-float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }
  
  @media (prefers-reduced-motion: reduce) {
    .emma-orb__reactbits {
      animation: none !important;
      transform: none !important;
    }
  }
`;

// ========================================
// CORE COMPONENT
// ========================================

export const EmmaOrb = forwardRef<HTMLDivElement, EmmaOrbProps>(
  (
    {
      variant = 'companion',
      size = 'medium',
      state = 'idle',
      theme: themeProp,
      container = 'inline',
      position = 'center',
      customPosition,
      interactions,
      style,
      className = '',
      children,
      testId,
      debug = false,
      ...props
    },
    ref
  ) => {
    // ========================================
    // HOOKS & COMPUTED VALUES
    // ========================================
    
    const [isHovered, setIsHovered] = useState(false);
    const [currentState, setCurrentState] = useState(state);
    
    // Check for reduced motion preference
    const prefersReducedMotion = useMemo(() => {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      }
      return false;
    }, []);
    
    // Resolve final size value
    const finalSize = useMemo(() => {
      return typeof size === 'number' ? size : SIZE_PRESETS[size];
    }, [size]);
    
    // Basic theme fallback
    const theme = useMemo(() => {
      if (typeof themeProp === 'object') {
        return themeProp;
      }
      // Default cosmic theme
      return {
        hue: 250,
        saturation: 80,
        lightness: 60,
        intensity: 0.8,
        shadowIntensity: 0.5,
        borderGlow: 0.3,
      };
    }, [themeProp]);
    
    // Update state when prop changes
    useEffect(() => {
      setCurrentState(state);
    }, [state]);
    
    // ========================================
    // INTERACTION HANDLERS
    // ========================================
    
    const handleClick = () => {
      setCurrentState('active');
      setTimeout(() => setCurrentState(state), 100);
      interactions?.onClick?.();
    };
    
    const handleMouseEnter = () => {
      setIsHovered(true);
      interactions?.onHoverStart?.();
    };
    
    const handleMouseLeave = () => {
      setIsHovered(false);
      interactions?.onHoverEnd?.();
    };
    
    // ========================================
    // STYLES
    // ========================================
    
    const containerStyles = useMemo(() => ({
      width: finalSize,
      height: finalSize,
      position: (position === 'custom' && customPosition ? 'absolute' : 'relative') as 'absolute' | 'relative',
      left: customPosition?.x,
      top: customPosition?.y,
      cursor: interactions?.onClick ? 'pointer' : 'default',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
      ...style,
    }), [finalSize, position, customPosition, interactions?.onClick, style]);
    
    const orbProps = useMemo(() => ({
      width: finalSize,
      height: finalSize,
      hue: theme.hue,
      saturation: theme.saturation / 100,
      lightness: theme.lightness / 100,
      intensity: theme.intensity,
    }), [finalSize, theme]);
    
    // Determine animation class
    const animationClass = getAnimationClass(
      isHovered && currentState === 'idle' ? 'hovering' : currentState,
      prefersReducedMotion
    );
    
    // ========================================
    // DEBUG OUTPUT
    // ========================================
    
    if (debug) {
      console.log('🔍 EmmaOrb Debug:', {
        variant,
        size: finalSize,
        state: currentState,
        theme: theme.hue,
        container,
        position,
        prefersReducedMotion,
      });
    }
    
    // ========================================
    // RENDER
    // ========================================
    
    return (
      <>
        {/* Inject CSS styles */}
        <style>{orbStyles}</style>
        
        <div
          ref={ref}
          data-testid={testId}
          data-emma-orb={variant}
          data-emma-state={currentState}
          className={`emma-orb emma-orb--${variant} ${animationClass} ${className}`}
          style={containerStyles}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          {...props}
        >
          {/* Exact ReactBits Orb Implementation */}
          <div className="emma-orb__core">
            <ReactBitsOrbExact 
              size={finalSize}
              hue={theme.hue}
              hoverIntensity={0.2}
              rotateOnHover={true}
              forceHoverState={false}
              settings={props.settings}
            />
          </div>
          
          {/* Composed Effects & Children */}
          {children && (
            <div className="emma-orb__effects">
              {children}
            </div>
          )}
          
          {/* Debug Overlay */}
          {debug && (
            <div 
              className="absolute -top-16 left-0 bg-black/80 text-white p-1 rounded text-xs z-50"
              style={{ fontSize: '10px', lineHeight: '12px' }}
            >
              {variant} | {currentState} | {finalSize}px
            </div>
          )}
        </div>
      </>
    );
  }
);

EmmaOrb.displayName = 'EmmaOrb';

// ========================================
// DEFAULT EXPORTS
// ========================================

export default EmmaOrb; 