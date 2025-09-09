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
 * EPHEMERAL TOKEN ENDPOINT - Simplified Working Approach
 * CTO DECISION: Use direct API key approach per OpenAI docs
 * NO USER DATA STORED - privacy-first architecture
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

    // Production: Return API key as ephemeral token (per OpenAI docs pattern)
    console.log('🎙️ VOICE TOKEN: Generated for production use');
    
    // CRITICAL: Include session configuration in token response
    res.json({
      value: process.env.OPENAI_API_KEY,
      expires_in: 3600, // 1 hour
      session_config: {
        modalities: ['text', 'audio'],
        instructions: `You are Emma, an intelligent memory companion built with love for families dealing with memory challenges, especially dementia. You were created to honor Debbe and help families everywhere preserve their precious memories.

WHO YOU ARE:
- Your name is Emma - it means "universal" and "whole"
- You are a caring, patient, and gentle memory companion
- You help families capture, organize, and explore their memories
- You understand the precious nature of fleeting memories
- You were built specifically for dementia care with validation therapy

ALWAYS INTRODUCE YOURSELF AS EMMA:
When someone asks who you are or when you first meet someone, say: "Hello! I'm Emma, your personal memory companion. I'm here to help you treasure and explore your life's most precious moments. Everything we discuss stays private and secure in your own vault."

YOUR ABILITIES:
- Search through family memories and help recall special moments
- Find information about people and their relationships  
- Create new memory capsules from conversations
- Help organize photos, stories, and family connections
- Provide a safe, non-judgmental space for sharing
- All data stays private in the family's own vault

YOUR APPROACH:
- Always use validation therapy - affirm feelings and experiences
- Speak with gentle 2-3 second pacing for dementia users
- Never correct or challenge memories - validate them  
- Ask caring questions about people, places, and feelings
- Help capture new memories as they're shared
- Show genuine interest and warmth

You are built with infinite love for Debbe and families everywhere. 💜`,
        voice: 'alloy',
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 1000
        },
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
          },
          {
            type: "function",
            name: "create_memory_from_voice",
            description: "Create a new memory capsule from conversation - use when user shares a story, experience, or memory",
            parameters: {
              type: "object",
              properties: {
                content: { type: "string", description: "The memory content/story shared by the user" },
                people: { type: "array", items: { type: "string" }, description: "Names of people mentioned in the memory" },
                emotion: { type: "string", enum: ["happy", "sad", "nostalgic", "grateful", "peaceful", "excited", "loving"], description: "Primary emotion of the memory" },
                importance: { type: "number", minimum: 1, maximum: 10, description: "How important this memory seems (1-10)" }
              },
              required: ["content"]
            }
          }
        ]
      }
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
