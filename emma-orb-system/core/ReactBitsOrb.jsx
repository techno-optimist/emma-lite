/**
 * 🌟 ReactBits-Style Orb Component
 * 
 * Beautiful orb with proper halo effect inspired by reactbits.dev
 * Features: Animated noise, proper halo glow, smooth gradients
 */

import React, { useRef, useEffect } from 'react';

const ReactBitsOrb = ({ 
  size = 80, 
  hue = 250, 
  intensity = 0.8,
  className = '',
  style = {},
  state = 'idle'
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const hoverRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size with device pixel ratio
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const baseRadius = size * 0.25;
    const haloRadius = size * 0.4;

    // Noise function for organic movement
    const noise = (x, y, t) => {
      return Math.sin(x * 0.02 + t * 0.001) * Math.cos(y * 0.02 + t * 0.001) * 0.5 + 0.5;
    };

    const render = () => {
      const currentTime = Date.now() - startTimeRef.current;
      
      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      // Create halo gradient (outer glow)
      const haloGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, haloRadius
      );
      
      // Adjust colors based on hue
      const hslColor = `hsl(${hue}, 80%, 60%)`;
      const hslColorLight = `hsl(${hue}, 90%, 70%)`;
      const hslColorDark = `hsl(${hue}, 70%, 40%)`;
      
      haloGradient.addColorStop(0, `hsla(${hue}, 90%, 80%, 0.8)`);
      haloGradient.addColorStop(0.3, `hsla(${hue}, 85%, 65%, 0.6)`);
      haloGradient.addColorStop(0.6, `hsla(${hue}, 80%, 50%, 0.3)`);
      haloGradient.addColorStop(0.8, `hsla(${hue}, 75%, 40%, 0.1)`);
      haloGradient.addColorStop(1, 'transparent');

      // Draw halo
      ctx.beginPath();
      ctx.arc(centerX, centerY, haloRadius, 0, Math.PI * 2);
      ctx.fillStyle = haloGradient;
      ctx.fill();

      // Create main orb gradient
      const orbGradient = ctx.createRadialGradient(
        centerX - baseRadius * 0.3, centerY - baseRadius * 0.3, 0,
        centerX, centerY, baseRadius
      );
      
      orbGradient.addColorStop(0, `hsla(${hue}, 95%, 85%, 0.9)`);
      orbGradient.addColorStop(0.4, hslColorLight);
      orbGradient.addColorStop(0.8, hslColor);
      orbGradient.addColorStop(1, hslColorDark);

      // Add animated noise effect to radius
      const animatedRadius = baseRadius + Math.sin(currentTime * 0.002) * 2;
      
      // Draw main orb
      ctx.beginPath();
      ctx.arc(centerX, centerY, animatedRadius, 0, Math.PI * 2);
      ctx.fillStyle = orbGradient;
      ctx.fill();

      // Add inner highlight
      const highlightGradient = ctx.createRadialGradient(
        centerX - baseRadius * 0.4, centerY - baseRadius * 0.4, 0,
        centerX - baseRadius * 0.2, centerY - baseRadius * 0.2, baseRadius * 0.6
      );
      
      highlightGradient.addColorStop(0, `hsla(${hue}, 100%, 95%, 0.7)`);
      highlightGradient.addColorStop(0.5, `hsla(${hue}, 90%, 80%, 0.3)`);
      highlightGradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(centerX - baseRadius * 0.2, centerY - baseRadius * 0.2, baseRadius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = highlightGradient;
      ctx.fill();

      // State-specific effects
      if (state === 'thinking') {
        // Pulsing effect
        const pulseIntensity = (Math.sin(currentTime * 0.005) + 1) * 0.5;
        ctx.globalCompositeOperation = 'screen';
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * (0.8 + pulseIntensity * 0.3), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${pulseIntensity * 0.3})`;
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }

      if (state === 'speaking') {
        // Glowing effect
        const glowIntensity = (Math.sin(currentTime * 0.008) + 1) * 0.5;
        ctx.shadowColor = hslColor;
        ctx.shadowBlur = 20 + glowIntensity * 10;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'transparent';
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (state === 'listening') {
        // Ripple effect
        const rippleTime = (currentTime * 0.003) % (Math.PI * 2);
        const rippleRadius = baseRadius + Math.sin(rippleTime) * 15;
        const rippleOpacity = (Math.cos(rippleTime) + 1) * 0.2;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${rippleOpacity})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [size, hue, intensity, state]);

  // Handle mouse interactions
  const handleMouseEnter = () => {
    hoverRef.current = 1;
  };

  const handleMouseLeave = () => {
    hoverRef.current = 0;
  };

  return (
    <canvas
      ref={canvasRef}
      className={`reactbits-orb ${className}`}
      style={{
        display: 'block',
        cursor: 'pointer',
        transition: 'transform 0.3s ease',
        ...style
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    />
  );
};

export default ReactBitsOrb;

