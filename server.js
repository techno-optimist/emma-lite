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
 * EPHEMERAL TOKEN ENDPOINT - OpenAI Realtime API Official Pattern
 * CTO SECURITY: Uses official OpenAI client_secrets endpoint
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

    // Development mode fallback (when using test_key)
    if (process.env.OPENAI_API_KEY === 'test_key' || process.env.OPENAI_API_KEY === 'test_key_placeholder') {
      console.log('🧪 DEV MODE: Using simulated token for development');
      const sessionId = crypto.randomBytes(16).toString('hex');
      return res.json({
        client_secret: 'dev_token_' + sessionId,
        expires_in: 300,
        session_id: sessionId
      });
    }

    // Official OpenAI Realtime API session configuration
    const sessionConfig = {
      session: {
        type: "realtime",
        model: "gpt-4o-realtime-preview-2024-12-17",
        audio: {
          output: {
            voice: "alloy", // Calm, friendly voice for dementia users
          },
        },
        // CTO SECURITY: Add tools configuration for local-only operations
        tools: [
          {
            type: "function",
            name: "get_people",
            description: "Search local people by name or relationship",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "Name or relationship to search for" }
              },
              required: ["query"]
            }
          },
          {
            type: "function", 
            name: "get_memories",
            description: "List memory summaries by filters",
            parameters: {
              type: "object",
              properties: {
                personId: { type: "string", description: "Filter by person ID" },
                limit: { type: "number", default: 5, description: "Max memories to return" }
              }
            }
          }
        ]
      }
    };

    // Call official OpenAI client_secrets endpoint
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionConfig)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('🚨 OpenAI client_secrets error:', error);
      return res.status(500).json({
        error: 'Failed to generate ephemeral token',
        code: 'OPENAI_ERROR'
      });
    }

    const data = await response.json();
    
    // Log for monitoring (NO PII)
    console.log(`🎙️ VOICE TOKEN: Generated ephemeral token, expires in ${data.expires_in || 60}s`);

    res.json(data);

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
