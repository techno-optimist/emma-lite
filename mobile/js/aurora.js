// js/aurora.js - WebGL Aurora Background for Emma Extension
// Adapted from the React Aurora component

class Aurora {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      colorStops: options.colorStops || ["#9333ea", "#ec4899", "#06b6d4"],
      amplitude: options.amplitude || 1.0,
      blend: options.blend || 0.6,
      speed: options.speed || 0.3,
      ...options
    };
    
    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.mesh = null;
    this.animationId = null;
    
    this.init();
  }
  
  init() {
    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      pointer-events: none;
      background: transparent;
    `;
    
    // Get WebGL context
    this.gl = this.canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true
    });
    
    if (!this.gl) {
      console.log('WebGL2 not supported, falling back to CSS background');
      this.fallbackBackground();
      return;
    }
    
    // Setup WebGL
    this.setupWebGL();
    this.createShaders();
    this.createGeometry();
    this.resize();
    this.startAnimation();
    
    // Add to container
    this.container.appendChild(this.canvas);
    
    // Handle resize
    window.addEventListener('resize', () => this.resize());
  }
  
  setupWebGL() {
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }
  
  createShaders() {
    const gl = this.gl;
    
    const vertexShaderSource = `#version 300 es
      in vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;
    
    const fragmentShaderSource = `#version 300 es
      precision highp float;
      
      uniform float uTime;
      uniform float uAmplitude;
      uniform vec3 uColorStops[3];
      uniform vec2 uResolution;
      uniform float uBlend;
      
      out vec4 fragColor;
      
      vec3 permute(vec3 x) {
        return mod(((x * 34.0) + 1.0) * x, 289.0);
      }
      
      float snoise(vec2 v){
        const vec4 C = vec4(
            0.211324865405187, 0.366025403784439,
            -0.577350269189626, 0.024390243902439
        );
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
      
        vec3 p = permute(
            permute(i.y + vec3(0.0, i1.y, 1.0))
          + i.x + vec3(0.0, i1.x, 1.0)
        );
      
        vec3 m = max(
            0.5 - vec3(
                dot(x0, x0),
                dot(x12.xy, x12.xy),
                dot(x12.zw, x12.zw)
            ), 
            0.0
        );
        m = m * m;
        m = m * m;
      
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }
      
      struct ColorStop {
        vec3 color;
        float position;
      };
      
      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution;
        
        ColorStop colors[3];
        colors[0] = ColorStop(uColorStops[0], 0.0);
        colors[1] = ColorStop(uColorStops[1], 0.5);
        colors[2] = ColorStop(uColorStops[2], 1.0);
        
        // Simplified color ramp
        vec3 rampColor;
        if (uv.x < 0.5) {
          float factor = uv.x * 2.0;
          rampColor = mix(colors[0].color, colors[1].color, factor);
        } else {
          float factor = (uv.x - 0.5) * 2.0;
          rampColor = mix(colors[1].color, colors[2].color, factor);
        }
        
        float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
        height = exp(height);
        height = (uv.y * 2.0 - height + 0.2);
        float intensity = 0.6 * height;
        
        float midPoint = 0.20;
        float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);
        
        vec3 auroraColor = intensity * rampColor;
        
        fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
      }
    `;
    
    // Compile shaders
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    // Create program
    this.program = gl.createProgram();
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);
    
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(this.program));
      this.fallbackBackground();
      return;
    }
    
    gl.useProgram(this.program);
    
    // Get uniform locations
    this.uniforms = {
      uTime: gl.getUniformLocation(this.program, 'uTime'),
      uAmplitude: gl.getUniformLocation(this.program, 'uAmplitude'),
      uColorStops: gl.getUniformLocation(this.program, 'uColorStops'),
      uResolution: gl.getUniformLocation(this.program, 'uResolution'),
      uBlend: gl.getUniformLocation(this.program, 'uBlend')
    };
    
    // Set initial uniforms
    this.updateUniforms();
  }
  
  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      return null;
    }
    
    return shader;
  }
  
  createGeometry() {
    const gl = this.gl;
    
    // Triangle that covers the entire screen
    const vertices = new Float32Array([
      -1, -1,
       3, -1,
      -1,  3
    ]);
    
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(this.program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  }
  
  updateUniforms() {
    const gl = this.gl;
    
    // Convert hex colors to RGB arrays
    const colorStopsArray = this.options.colorStops.map(hex => this.hexToRgb(hex));
    
    gl.uniform1f(this.uniforms.uAmplitude, this.options.amplitude);
    gl.uniform3fv(this.uniforms.uColorStops, colorStopsArray.flat());
    gl.uniform1f(this.uniforms.uBlend, this.options.blend);
  }
  
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ] : [0, 0, 0];
  }
  
  resize() {
    if (!this.canvas || !this.gl) return;
    
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;
    
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
    
    if (this.uniforms && this.uniforms.uResolution) {
      this.gl.uniform2f(this.uniforms.uResolution, width, height);
    }
  }
  
  startAnimation() {
    const animate = (time) => {
      if (!this.gl || !this.program) return;
      
      const gl = this.gl;
      
      // Update time uniform
      gl.uniform1f(this.uniforms.uTime, time * 0.001 * this.options.speed);
      
      // Clear and draw
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    this.animationId = requestAnimationFrame(animate);
  }
  
  fallbackBackground() {
    // CSS gradient fallback
    this.container.style.background = `
      radial-gradient(circle at 20% 20%, rgba(147, 51, 234, 0.3) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.3) 0%, transparent 50%),
      radial-gradient(circle at 40% 60%, rgba(6, 182, 212, 0.2) 0%, transparent 50%)
    `;
  }
  
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    if (this.gl) {
      this.gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  }
  
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    if (this.gl && this.program) {
      this.updateUniforms();
    }
  }
}

// Export for use in popup
window.Aurora = Aurora;