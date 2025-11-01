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
const EmmaServerAgent = require('./emma-agent');
const VaultService = require('./lib/vault-service');
const { getEmmaAppManifest, APP_NAME, APP_DEFAULT_MODEL } = require('./apps/emma-openai-app');

const app = express();
const PORT = process.env.PORT || 3000;

const vaultService = new VaultService();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "blob:", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers for now
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "wss://api.openai.com", "https://api.openai.com", "https://emma-voice-backend.onrender.com", "https://cdn.jsdelivr.net"],
      mediaSrc: ["'self'", "blob:", "data:"],
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

app.use(express.json({ limit: '10mb' }));
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

const appsRouter = express.Router();

appsRouter.get('/manifest', (req, res) => {
  const model = typeof req.query.model === 'string' ? req.query.model : APP_DEFAULT_MODEL;
  const manifest = getEmmaAppManifest({ model, vaultService });
  res.json({
    app: APP_NAME,
    manifest
  });
});

appsRouter.post('/tools/:toolName', async (req, res) => {
  const toolName = req.params.toolName;

  if (!vaultService.canExecute(toolName)) {
    return res.status(404).json({
      ok: false,
      error: `Unsupported tool: ${toolName}`
    });
  }

  try {
    const result = await vaultService.execute(toolName, req.body || {});
    res.json({ ok: true, result });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error?.message || 'Tool execution failed'
    });
  }
});

app.use('/apps/emma', appsRouter);

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

// Create WebSocket server for Emma voice
const wss = new WebSocket.Server({ 
  server,
  path: '/voice'
});

/**
 * Emma Voice WebSocket Server
 * PRODUCTION-READY: Server-side Emma agent with browser client
 */
wss.on('connection', (browserWs, request) => {
  console.log('🎙️ New Emma voice session started');
  
  // Create Emma agent for this session
  const emmaAgent = new EmmaServerAgent({
    voice: 'alloy',
    speed: 1.0,
    tone: 'caring',
    pacing: 2.5,
    validationMode: true,
    vaultService
  });
  
  // Handle messages from browser
  browserWs.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 Browser message:', message.type);
      
      switch (message.type) {
        case 'start_session':
          await emmaAgent.startSession(browserWs);
          break;
          
        case 'user_text':
          // Forward user text into the agent as a message
          if (emmaAgent && emmaAgent.sendUserText) {
            await emmaAgent.sendUserText(message.text || '');
          }
          break;

        case 'tool_result':
          if (message.call_id) {
            const payload = Object.prototype.hasOwnProperty.call(message, 'result')
              ? message.result
              : message;
            emmaAgent.handleToolResult(message.call_id, payload);
          }
          break;

        case 'voice_settings':
          emmaAgent.updateVoiceSettings(message.settings);
          break;

        case 'stop_session':
          await emmaAgent.stopSession();
          break;

        case 'user_audio_chunk':
        case 'realtime_audio_chunk':
          // Audio streaming is not currently handled by the chat agent.
          break;

        default:
          console.warn('Unhandled browser message type:', message.type);
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
    if (emmaAgent) {
      emmaAgent.stopSession().catch((error) => {
        console.error('Emma session cleanup error:', error);
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`
🌟 Emma Voice Service Started
📍 Port: ${PORT}
🔒 Mode: ${process.env.NODE_ENV || 'development'}
🎙️ Voice: ${process.env.OPENAI_API_KEY ? 'Enabled' : 'DISABLED - Set OPENAI_API_KEY'}
🌐 WebSocket: /voice (Emma agent proxy)
💜 Privacy: Local-first architecture maintained
  `);
});

module.exports = app;
