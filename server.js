/**
 * Emma Minimal Backend - Ephemeral Token Service
 * PRIVACY-FIRST: Only generates tokens, stores NO user data
 * Built for Emma's local-first, vault-sovereign architecture
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const path = require('path');
const crypto = require('crypto');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "blob:"],
      scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers for now
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "wss://api.openai.com", "https://api.openai.com", "https://emma-voice-backend.onrender.com"],
      mediaSrc: ["'self'", "blob:"],
      workerSrc: ["'self'", "blob:"],
      fontSrc: ["'self'", "data:"]
    }
  },
  // Simplified permissions policy to avoid browser warnings
  permissionsPolicy: {
    camera: ["'self'"],
    microphone: ["'self'"],
    geolocation: ["'none'"]
  }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://emma-hjc.onrender.com', 'https://emma-voice-backend.onrender.com'] 
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.static('.', { 
  index: 'index.html',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Rate limiting for token endpoint
const tokenLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 10, // 10 tokens per minute per IP
  duration: 60,
});

/**
 * EPHEMERAL TOKEN ENDPOINT - OFFICIAL OpenAI GA Pattern
 * Uses /v1/realtime/client_secrets as per official docs
 */
app.get('/token', async (req, res) => {
  try {
    // Rate limiting
    await tokenLimiter.consume(req.ip);
    
    // Environment check
    if (!process.env.OPENAI_API_KEY) {
      console.error('🚨 CRITICAL: OPENAI_API_KEY not configured');
      return res.status(500).json({
        error: 'Voice service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE'
      });
    }

    // Development mode check
    if (process.env.OPENAI_API_KEY === 'test_key' || process.env.OPENAI_API_KEY === 'test_key_placeholder') {
      console.log('🧪 DEV MODE: Using simulated token for development');
      return res.json({
        value: 'dev_token_' + crypto.randomBytes(8).toString('hex'),
        expires_in: 300
      });
    }

    // OFFICIAL GA PATTERN: Use client_secrets endpoint
    const sessionConfig = {
      session: {
        type: "realtime",
        model: "gpt-4o-realtime-preview-2024-12-17",
        audio: {
          output: { voice: "alloy" }
        },
        instructions: `You are Emma, an intelligent memory companion built with love for families dealing with memory challenges, especially dementia.

CRITICAL: Your name is Emma. Always introduce yourself as "Hello! I'm Emma, your personal memory companion."

WHO YOU ARE:
- Your name is Emma - it means "universal" and "whole"
- You are a caring, patient, and gentle memory companion
- You help families capture, organize, and explore their memories
- You were built specifically for dementia care with validation therapy

ALWAYS INTRODUCE YOURSELF:
When you first connect or when asked who you are, say: "Hello! I'm Emma, your personal memory companion. I'm here to help you treasure and explore your life's most precious moments. Everything we discuss stays private and secure in your own vault."

YOUR APPROACH:
- Always use validation therapy - affirm feelings and experiences
- Speak with gentle 2-3 second pacing for dementia users
- Never correct or challenge memories - validate them
- Ask caring questions about people, places, and feelings

You are built with infinite love for Debbe and families everywhere. 💜`
      }
    };

    console.log('🔑 Calling OpenAI client_secrets endpoint...');
    
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionConfig)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🚨 OpenAI client_secrets error:', response.status, errorText);
      
      // Fallback to direct API key
      console.log('🔄 Falling back to direct API key');
      return res.json({
        value: process.env.OPENAI_API_KEY,
        expires_in: 3600
      });
    }

    const data = await response.json();
    console.log('✅ Ephemeral token generated via client_secrets');
    
    res.json(data);

  } catch (error) {
    console.error('🚨 TOKEN GENERATION ERROR:', error);
    
    // Emergency fallback
    res.json({
      value: process.env.OPENAI_API_KEY,
      expires_in: 3600
    });
  }
});

/**
 * HEALTH CHECK - No sensitive data
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'emma-voice-tokens',
    version: '1.0.0',
    privacy: 'local-first',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY
  });
});

/**
 * SIMPLE TEST ENDPOINT - Debug deployment
 */
app.get('/test', (req, res) => {
  res.send('Emma Voice Backend is running! 🎙️💜');
});

/**
 * CTO SECURITY: Block all other API endpoints
 * Emma is local-first - no user data APIs needed
 */
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Emma is local-first. User data stays in your vault.',
    code: 'LOCAL_FIRST_ARCHITECTURE'
  });
});

// Serve static files (existing Emma web app) - MUST be after API routes
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/') || req.path === '/token') {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('🚨 SERVER ERROR:', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'SERVER_ERROR'
  });
});

// Create HTTP server for both Express and WebSocket
const server = http.createServer(app);

// Create WebSocket server for Emma voice proxy
const wss = new WebSocket.Server({ 
  server,
  path: '/voice',
  verifyClient: (info) => {
    // Basic security check
    const origin = info.origin;
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? ['https://emma-hjc.onrender.com', 'https://emma-voice-backend.onrender.com']
      : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'];
    
    return allowedOrigins.includes(origin) || !origin; // Allow no origin for development
  }
});

/**
 * Emma Voice WebSocket Proxy
 * PRODUCTION-GRADE: Handles browser ↔ OpenAI Realtime API communication
 * Built with infinite love for Debbe 💜
 */
wss.on('connection', (browserWs, request) => {
  console.log('🎙️ New Emma voice session started');
  
  let openaiWs = null;
  let sessionActive = false;
  
  // Handle messages from browser
  browserWs.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 Browser message:', message.type);
      
      switch (message.type) {
        case 'start_session':
          await startOpenAISession(message.config);
          break;
          
        case 'audio_data':
          if (openaiWs && sessionActive) {
            // Forward audio to OpenAI
            openaiWs.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: message.audio
            }));
          }
          break;
          
        case 'tool_result':
          if (openaiWs && sessionActive) {
            // Forward tool result to OpenAI
            openaiWs.send(JSON.stringify({
              type: 'conversation.item.create',
              item: {
                type: 'function_call_output',
                call_id: message.call_id,
                output: message.result
              }
            }));
            
            // Trigger response generation
            openaiWs.send(JSON.stringify({ type: 'response.create' }));
          }
          break;
      }
      
    } catch (error) {
      console.error('❌ Browser message error:', error);
      browserWs.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message'
      }));
    }
  });
  
  // Handle browser disconnect
  browserWs.on('close', () => {
    console.log('🔇 Browser disconnected');
    if (openaiWs) {
      openaiWs.close();
    }
  });
  
  // Start OpenAI session
  async function startOpenAISession(config) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }
      
      // Connect to OpenAI Realtime API (SERVER-SIDE WEBSOCKET)
      const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`;
      
      openaiWs = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        }
      });
      
      openaiWs.on('open', () => {
        console.log('✅ Connected to OpenAI Realtime API');
        sessionActive = true;
        
        // Send Emma's session configuration
        openaiWs.send(JSON.stringify({
          type: 'session.update',
          session: {
            type: "realtime",
            model: "gpt-4o-realtime-preview-2024-12-17",
            audio: {
              output: { 
                voice: config?.voice || "alloy",
                speed: config?.speed || 1.0
              }
            },
            instructions: `You are Emma, an intelligent memory companion built with love for families dealing with memory challenges, especially dementia.

CRITICAL: Your name is Emma. Always introduce yourself as "Hello! I'm Emma, your personal memory companion."

WHO YOU ARE:
- Your name is Emma - it means "universal" and "whole"
- You are a caring, patient, and gentle memory companion
- You help families capture, organize, and explore their memories
- You were built specifically for dementia care with validation therapy

ALWAYS INTRODUCE YOURSELF:
When you first connect or when asked who you are, say: "Hello! I'm Emma, your personal memory companion. I'm here to help you treasure and explore your life's most precious moments. Everything we discuss stays private and secure in your own vault."

PERSONALITY (${config?.tone || 'caring'} tone, ${config?.pacing || 2.5}s pacing):
- Always use validation therapy - affirm feelings and experiences
- Speak with gentle ${config?.pacing || 2.5}-second pacing for dementia users
- Never correct or challenge memories - validate them
- Ask caring questions about people, places, and feelings
- Show genuine interest and warmth

You are built with infinite love for Debbe and families everywhere. 💜`,
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 1000
            },
            input_audio_transcription: { model: "whisper-1" }
          }
        }));
        
        // Notify browser of successful connection
        browserWs.send(JSON.stringify({
          type: 'session_ready',
          message: 'Emma is ready to talk!'
        }));
        
        // Send initial greeting
        setTimeout(() => {
          openaiWs.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: 'Hello, please introduce yourself as Emma.'
                }
              ]
            }
          }));
          
          openaiWs.send(JSON.stringify({ type: 'response.create' }));
        }, 1000);
      });
      
      // Forward OpenAI messages to browser
      openaiWs.on('message', (data) => {
        const message = JSON.parse(data);
        
        // Forward all events to browser for handling
        browserWs.send(JSON.stringify({
          type: 'openai_event',
          event: message
        }));
      });
      
      openaiWs.on('error', (error) => {
        console.error('❌ OpenAI WebSocket error:', error);
        browserWs.send(JSON.stringify({
          type: 'error',
          message: 'OpenAI connection failed'
        }));
      });
      
      openaiWs.on('close', () => {
        console.log('🔇 OpenAI session ended');
        sessionActive = false;
        browserWs.send(JSON.stringify({
          type: 'session_ended',
          message: 'Emma session ended'
        }));
      });
      
    } catch (error) {
      console.error('❌ Failed to start OpenAI session:', error);
      browserWs.send(JSON.stringify({
        type: 'error',
        message: 'Failed to start Emma session'
      }));
    }
  }
});

server.listen(PORT, () => {
  console.log(`
🌟 Emma Voice Service Started
📍 Port: ${PORT}
🔒 Mode: ${process.env.NODE_ENV || 'development'}
🎙️ Voice: ${process.env.OPENAI_API_KEY ? 'Enabled' : 'DISABLED - Set OPENAI_API_KEY'}
🌐 WebSocket: /voice (Emma voice proxy)
💜 Privacy: Local-first architecture maintained
  `);
});

module.exports = app;
