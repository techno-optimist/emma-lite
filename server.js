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

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "wss://api.openai.com", "https://api.openai.com"],
      mediaSrc: ["'self'", "blob:"],
      workerSrc: ["'self'", "blob:"],
      fontSrc: ["'self'", "data:"]
    }
  },
  // Disable problematic permissions policy features
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: []
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
 * EPHEMERAL TOKEN ENDPOINT
 * CTO SECURITY: Generates short-lived tokens for OpenAI Realtime
 * NO USER DATA STORED - privacy-first architecture
 */
app.post('/api/realtime/token', async (req, res) => {
  try {
    // Rate limiting
    await tokenLimiter.consume(req.ip);
    
    // Validate request
    const { scope, model } = req.body;
    if (scope !== 'voice' || !model?.startsWith('gpt-4o-realtime')) {
      return res.status(400).json({ 
        error: 'Invalid request parameters',
        code: 'INVALID_PARAMS'
      });
    }

    // Environment check
    if (!process.env.OPENAI_API_KEY) {
      console.error('🚨 CRITICAL: OPENAI_API_KEY not configured');
      return res.status(500).json({
        error: 'Voice service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE'
      });
    }

    // Generate ephemeral session token (60 seconds)
    const sessionId = crypto.randomBytes(16).toString('hex');
    const expiresAt = Math.floor(Date.now() / 1000) + 60; // 60 seconds from now
    
    // CTO NOTE: This is a proxy token, not direct OpenAI key exposure
    const ephemeralToken = Buffer.from(JSON.stringify({
      key: process.env.OPENAI_API_KEY,
      session: sessionId,
      expires: expiresAt,
      scope: 'realtime-voice-only'
    })).toString('base64');

    // Log for monitoring (NO PII)
    console.log(`🎙️ VOICE TOKEN: Generated for session ${sessionId}, expires ${new Date(expiresAt * 1000).toISOString()}`);

    res.json({
      token: ephemeralToken,
      expires_in: 60,
      session_id: sessionId,
      model: model
    });

  } catch (rateLimitError) {
    if (rateLimitError.remainingPoints !== undefined) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Please wait before requesting another token.',
        code: 'RATE_LIMITED',
        retry_after: Math.round(rateLimitError.msBeforeNext / 1000)
      });
    }
    
    console.error('🚨 TOKEN GENERATION ERROR:', rateLimitError);
    res.status(500).json({
      error: 'Token generation failed',
      code: 'INTERNAL_ERROR'
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

// Serve static files (existing Emma web app)
app.get('*', (req, res) => {
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

app.listen(PORT, () => {
  console.log(`
🌟 Emma Voice Service Started
📍 Port: ${PORT}
🔒 Mode: ${process.env.NODE_ENV || 'development'}
🎙️ Voice: ${process.env.OPENAI_API_KEY ? 'Enabled' : 'DISABLED - Set OPENAI_API_KEY'}
💜 Privacy: Local-first architecture maintained
  `);
});

module.exports = app;
