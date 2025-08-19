/**
 * 🌟 Modern Orb Component
 * 
 * Beautiful gradient orb with smooth glow effects
 * Inspired by reactbits.dev/backgrounds/orb
 */

import React, { useRef, useEffect, useState } from 'react';

const ModernOrb = ({ 
  size = 80, 
  hue = 250, 
  saturation = 80, 
  lightness = 60, 
  intensity = 0.8,
  className = '',
  style = {},
  animated = true
}) => {
  const orbRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Handle mouse movement for interactive glow
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (orbRef.current) {
        const rect = orbRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        setMousePos({
          x: (e.clientX - centerX) / rect.width,
          y: (e.clientY - centerY) / rect.height
        });
      }
    };

    if (isHovered) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isHovered]);

  // Generate CSS custom properties for the orb
  const orbStyles = {
    '--orb-size': `${size}px`,
    '--orb-hue': hue,
    '--orb-saturation': `${saturation}%`,
    '--orb-lightness': `${lightness}%`,
    '--orb-intensity': intensity,
    '--mouse-x': mousePos.x,
    '--mouse-y': mousePos.y,
    ...style
  };

  return (
    <>
      <style>{`
        .modern-orb {
          position: relative;
          width: var(--orb-size);
          height: var(--orb-size);
          border-radius: 50%;
          background: radial-gradient(
            circle at 30% 30%,
            hsla(var(--orb-hue), var(--orb-saturation), calc(var(--orb-lightness) + 20%), 0.9),
            hsla(var(--orb-hue), var(--orb-saturation), var(--orb-lightness), 0.7),
            hsla(var(--orb-hue), var(--orb-saturation), calc(var(--orb-lightness) - 20%), 0.4)
          );
          box-shadow: 
            0 0 calc(var(--orb-size) * 0.5) hsla(var(--orb-hue), var(--orb-saturation), var(--orb-lightness), 0.4),
            0 0 calc(var(--orb-size) * 0.25) hsla(var(--orb-hue), var(--orb-saturation), var(--orb-lightness), 0.6),
            inset 0 0 calc(var(--orb-size) * 0.1) hsla(var(--orb-hue), var(--orb-saturation), calc(var(--orb-lightness) + 30%), 0.3);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .modern-orb::before {
          content: '';
          position: absolute;
          top: 10%;
          left: 20%;
          width: 30%;
          height: 30%;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            hsla(var(--orb-hue), var(--orb-saturation), calc(var(--orb-lightness) + 40%), 0.8),
            transparent 60%
          );
          filter: blur(2px);
        }

        .modern-orb::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            hsla(var(--orb-hue), var(--orb-saturation), var(--orb-lightness), 0.1),
            transparent 50%
          );
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }

        .modern-orb:hover {
          transform: scale(1.05) translateY(-2px);
          box-shadow: 
            0 0 calc(var(--orb-size) * 0.8) hsla(var(--orb-hue), var(--orb-saturation), var(--orb-lightness), 0.5),
            0 0 calc(var(--orb-size) * 0.4) hsla(var(--orb-hue), var(--orb-saturation), var(--orb-lightness), 0.7),
            inset 0 0 calc(var(--orb-size) * 0.1) hsla(var(--orb-hue), var(--orb-saturation), calc(var(--orb-lightness) + 30%), 0.4);
        }

        .modern-orb:hover::after {
          opacity: 1;
        }

        .modern-orb:active {
          transform: scale(0.98) translateY(1px);
        }

        .modern-orb--animated {
          animation: orb-float 4s ease-in-out infinite;
        }

        .modern-orb--thinking {
          animation: orb-pulse 1.5s ease-in-out infinite;
        }

        .modern-orb--speaking {
          animation: orb-glow 2s ease-in-out infinite;
        }

        .modern-orb--listening {
          animation: orb-ripple 2s ease-in-out infinite;
        }

        @keyframes orb-float {
          0%, 100% { 
            transform: translateY(0px) scale(1);
          }
          50% { 
            transform: translateY(-8px) scale(1.02);
          }
        }

        @keyframes orb-pulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
          }
          50% { 
            transform: scale(1.1);
            opacity: 0.8;
          }
        }

        @keyframes orb-glow {
          0%, 100% {
            box-shadow: 
              0 0 calc(var(--orb-size) * 0.5) hsla(var(--orb-hue), var(--orb-saturation), var(--orb-lightness), 0.4),
              0 0 calc(var(--orb-size) * 0.25) hsla(var(--orb-hue), var(--orb-saturation), var(--orb-lightness), 0.6);
          }
          50% {
            box-shadow: 
              0 0 calc(var(--orb-size) * 0.8) hsla(var(--orb-hue), var(--orb-saturation), var(--orb-lightness), 0.6),
              0 0 calc(var(--orb-size) * 0.4) hsla(var(--orb-hue), var(--orb-saturation), var(--orb-lightness), 0.8);
          }
        }

        @keyframes orb-ripple {
          0% {
            box-shadow: 
              0 0 calc(var(--orb-size) * 0.5) hsla(var(--orb-hue), var(--orb-saturation), var(--orb-lightness), 0.4),
              0 0 calc(var(--orb-size) * 0.25) hsla(var(--orb-hue), var(--orb-saturation), var(--orb-lightness), 0.6);
          }
          25% {
            box-shadow: 
              0 0 calc(var(--orb-size) * 0.7) hsla(var(--orb-hue), var(--orb-saturation), var(--orb-lightness), 0.3),
              0 0 calc(var(--orb-size) * 0.35) hsla(var(--orb-hue), var(--orb-saturation), var(--orb-lightness), 0.5);
          }
          50% {
            box-shadow: 
              0 0 calc(var(--orb-size) * 0.9) hsla(var(--orb-hue), var(--orb-saturation), var(--orb-lightness), 0.2),
              0 0 calc(var(--orb-size) * 0.45) hsla(var(--orb-hue), var(--orb-saturation), var(--orb-lightness), 0.4);
          }
          75% {
            box-shadow: 
              0 0 calc(var(--orb-size) * 0.7) hsla(var(--orb-hue), var(--orb-saturation), var(--orb-lightness), 0.3),
              0 0 calc(var(--orb-size) * 0.35) hsla(var(--orb-hue), var(--orb-saturation), var(--orb-lightness), 0.5);
          }
          100% {
            box-shadow: 
              0 0 calc(var(--orb-size) * 0.5) hsla(var(--orb-hue), var(--orb-saturation), var(--orb-lightness), 0.4),
              0 0 calc(var(--orb-size) * 0.25) hsla(var(--orb-hue), var(--orb-saturation), var(--orb-lightness), 0.6);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .modern-orb--animated,
          .modern-orb--thinking,
          .modern-orb--speaking,
          .modern-orb--listening {
            animation: none;
          }
        }
      `}</style>
      
      <div
        ref={orbRef}
        className={`modern-orb ${animated ? 'modern-orb--animated' : ''} ${className}`}
        style={orbStyles}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
    </>
  );
};

export default ModernOrb;

