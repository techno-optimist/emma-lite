/**
 * 🌟 WebGL Orb Component
 * 
 * High-performance WebGL-based orb rendering
 * Adapted for Emma Memory Companion
 */

import React, { useRef, useEffect, useMemo } from 'react';

const WebGLOrb = ({ 
  width = 64, 
  height = 64, 
  hue = 250, 
  saturation = 0.8, 
  lightness = 0.6, 
  intensity = 0.8,
  className = '',
  style = {}
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const glRef = useRef(null);
  const programRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Vertex shader source
  const vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_uv = a_position * 0.5 + 0.5;
    }
  `;

  // Fragment shader source with Emma-style effects
  const fragmentShaderSource = `
    precision mediump float;
    
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform float u_hue;
    uniform float u_saturation;
    uniform float u_lightness;
    uniform float u_intensity;
    
    varying vec2 v_uv;
    
    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }
    
    float noise(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    
    void main() {
      vec2 st = v_uv;
      vec2 center = vec2(0.5);
      float dist = distance(st, center);
      
      // Create circular gradient
      float circle = 1.0 - smoothstep(0.0, 0.5, dist);
      
      // Add animated noise for organic feel
      float n = noise(st * 10.0 + u_time * 0.5) * 0.1;
      circle += n;
      
      // Create pulsing effect
      float pulse = sin(u_time * 2.0) * 0.1 + 0.9;
      circle *= pulse;
      
      // Add inner glow
      float innerGlow = 1.0 - smoothstep(0.0, 0.3, dist);
      innerGlow *= 0.5;
      
      // Combine effects
      float alpha = circle + innerGlow;
      alpha *= u_intensity;
      
      // Convert HSL to RGB
      vec3 color = hsv2rgb(vec3(u_hue / 360.0, u_saturation, u_lightness));
      
      // Add sparkle effect
      float sparkle = noise(st * 50.0 + u_time) * 0.2;
      color += vec3(sparkle);
      
      gl_FragColor = vec4(color, alpha);
    }
  `;

  // Create shader
  const createShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  };

  // Create program
  const createProgram = (gl, vertexShader, fragmentShader) => {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    
    return program;
  };

  // Initialize WebGL
  const initWebGL = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    glRef.current = gl;

    // Create shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) return;

    // Create program
    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;

    programRef.current = program;

    // Set up geometry (full screen quad)
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Set up attributes
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Set viewport
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  };

  // Render frame
  const render = () => {
    const gl = glRef.current;
    const program = programRef.current;
    const canvas = canvasRef.current;
    
    if (!gl || !program || !canvas) return;

    // Clear canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Use program
    gl.useProgram(program);

    // Set uniforms
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const hueLocation = gl.getUniformLocation(program, 'u_hue');
    const saturationLocation = gl.getUniformLocation(program, 'u_saturation');
    const lightnessLocation = gl.getUniformLocation(program, 'u_lightness');
    const intensityLocation = gl.getUniformLocation(program, 'u_intensity');

    const currentTime = (Date.now() - startTimeRef.current) / 1000;
    
    gl.uniform1f(timeLocation, currentTime);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform1f(hueLocation, hue);
    gl.uniform1f(saturationLocation, saturation);
    gl.uniform1f(lightnessLocation, lightness);
    gl.uniform1f(intensityLocation, intensity);

    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Continue animation
    animationRef.current = requestAnimationFrame(render);
  };

  // Initialize on mount
  useEffect(() => {
    initWebGL();
    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Update uniforms when props change
  useEffect(() => {
    // Uniforms will be updated on next render cycle
  }, [hue, saturation, lightness, intensity]);

  // Handle canvas resize and ensure crisp rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Set actual size in memory (scaled to account for extra pixel density)
      const scale = window.devicePixelRatio || 1;
      canvas.width = width * scale;
      canvas.height = height * scale;
      
      // Scale the canvas back down using CSS
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      
      const gl = glRef.current;
      if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    }
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        display: 'block',
        imageRendering: 'crisp-edges',
        ...style
      }}
    />
  );
};

export default WebGLOrb;

