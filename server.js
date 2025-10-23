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

const app = express();
const PORT = process.env.PORT || 3000;

// Security hardening
app.disable('x-powered-by');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "blob:", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "wss://api.openai.com", "https://api.openai.com", "https://emma-voice-backend.onrender.com", "https://cdn.jsdelivr.net"],
      mediaSrc: ["'self'", "blob:", "data:"],
      workerSrc: ["'self'", "blob:"],
      fontSrc: ["'self'", "data:"]
    }
  },
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
// Serve project assets while keeping tighter cache control for HTML
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/themes', express.static(path.join(__dirname, 'themes')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));
// Serve extension artifacts only if explicitly needed (kept read-only)
app.use('/emma-vault-extension-fixed', express.static(path.join(__dirname, 'emma-vault-extension-fixed')));
// Root index and favicon
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/favicon.svg', (req, res) => res.sendFile(path.join(__dirname, 'favicon.svg')));

// Explicit routes for root-level dashboards to avoid SPA fallback loop.
// NOTE: This root-level dashboard.html is the canonical dashboard entry point.
app.get('/dashboard.html', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'dashboard.html')));
[
  'add-person.html',
  'emma-cloud.html'
].forEach((file) => {
  app.get(`/${file}`, (req, res) => res.sendFile(path.join(__dirname, file)));
});

// Rate limiting for token endpoint
const tokenLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 10,
  duration: 60,
});

/**
 * EPHEMERAL TOKEN ENDPOINT - OFFICIAL OpenAI GA Pattern
 * Uses /v1/realtime/client_secrets as per official docs
 */
app.get('/token', async (req, res) => {
  try {
    await tokenLimiter.consume(req.ip);

    if (!process.env.OPENAI_API_KEY) {
      console.error('CRITICAL: OPENAI_API_KEY not configured');
      return res.status(500).json({
        error: 'Voice service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE'
      });
    }

    if (process.env.OPENAI_API_KEY === 'test_key' || process.env.OPENAI_API_KEY === 'test_key_placeholder') {
      return res.json({
        value: 'dev_token_' + crypto.randomBytes(8).toString('hex'),
        expires_in: 300
      });
    }

    const sessionConfig = {
      session: {
        type: 'realtime',
        model: 'gpt-4o-realtime-preview-2024-12-17',
        audio: { output: { voice: 'alloy' } },
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

You are built with infinite love for Debbe and families everywhere.`
      }
    };

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
      console.error('OpenAI client_secrets error:', response.status, errorText);
      return res.status(502).json({
        error: 'Ephemeral token generation failed',
        code: 'TOKEN_UPSTREAM_ERROR'
      });
    }

    const data = await response.json();
    return res.json(data);

  } catch (error) {
    console.error('TOKEN GENERATION ERROR:', error);
    return res.status(502).json({
      error: 'Token service unavailable',
      code: 'TOKEN_SERVICE_ERROR'
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
  res.send('Emma Voice Backend is running!');
});

/**
 * CTO SECURITY: Block all other API endpoints
 */
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Emma is local-first. User data stays in your vault.',
    code: 'LOCAL_FIRST_ARCHITECTURE'
  });
});

// Fallback for SPA routes (do not expose other filesystem paths)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path === '/token') {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err);
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

// WebSocket security controls
const ALLOWED_WS_ORIGINS = new Set(
  (process.env.NODE_ENV === 'production')
    ? ['https://emma-hjc.onrender.com', 'https://emma-voice-backend.onrender.com']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000']
);
const ipConnCount = new Map();
const MAX_WS_PER_IP = parseInt(process.env.MAX_WS_PER_IP || '5', 10);

/**
 * Emma Voice WebSocket Server
 */
wss.on('connection', (browserWs, request) => {
  // Origin check
  const origin = request.headers.origin;
  if (!ALLOWED_WS_ORIGINS.has(origin)) {
    try { browserWs.close(1008, 'Origin not allowed'); } catch (_) {}
    return;
  }

  // IP connection limiting
  const ip = request.socket?.remoteAddress || 'unknown';
  const curr = ipConnCount.get(ip) || 0;
  if (curr >= MAX_WS_PER_IP) {
    try { browserWs.close(1013, 'Too many connections'); } catch (_) {}
    return;
  }
  ipConnCount.set(ip, curr + 1);

  // Create Emma agent for this session
  const emmaAgent = new EmmaServerAgent({
    voice: 'alloy',
    speed: 1.0,
    tone: 'caring',
    pacing: 2.5,
    validationMode: true
  });

  // Handle messages from browser
  browserWs.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      switch (message.type) {
        case 'start_session':
          await emmaAgent.startSession(browserWs);
          break;
        case 'user_text':
          if (emmaAgent && emmaAgent.sendUserText) {
            await emmaAgent.sendUserText(message.text || '');
          }
          break;
        case 'user_audio_chunk':
          break;
        case 'realtime_audio_chunk':
          if (emmaAgent && message.chunk) {
            await emmaAgent.handleRealtimeAudio(message.chunk);
          }
          break;
        case 'tool_result':
          if (message.call_id && message.result) {
            emmaAgent.handleToolResult(message.call_id, message.result);
          }
          break;
      }
    } catch (error) {
      try {
        browserWs.send(JSON.stringify({ type: 'error', message: 'Failed to process message' }));
      } catch (_) {}
    }
  });

  // Handle browser disconnect
  browserWs.on('close', () => {
    if (emmaAgent) {
      emmaAgent.stopSession();
    }
    const ip = request.socket?.remoteAddress || 'unknown';
    const curr = ipConnCount.get(ip) || 1;
    ipConnCount.set(ip, Math.max(0, curr - 1));
  });
});

server.listen(PORT, () => {
  console.log(`Emma Voice Service Started on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

module.exports = app;
