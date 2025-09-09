/**
 * OpenAI Agents SDK Loader
 * Loads the official OpenAI Agents SDK for browser use
 */

class OpenAIAgentsLoader {
  constructor() {
    this.loaded = false;
    this.loading = false;
  }

  async loadSDK() {
    if (this.loaded) return true;
    if (this.loading) {
      // Wait for existing load to complete
      while (this.loading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.loaded;
    }

    try {
      this.loading = true;
      console.log('📦 Loading OpenAI Agents SDK...');

      // Create script element for Agents SDK
      const script = document.createElement('script');
      script.type = 'module';
      script.innerHTML = `
        import { RealtimeAgent, RealtimeSession } from 'https://cdn.jsdelivr.net/npm/@openai/agents@latest/dist/index.js';
        
        // Make available globally
        window.openai = {
          RealtimeAgent,
          RealtimeSession
        };
        
        console.log('✅ OpenAI Agents SDK loaded successfully');
        window.dispatchEvent(new CustomEvent('openai-agents-loaded'));
      `;

      document.head.appendChild(script);

      // Wait for SDK to load
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('SDK load timeout'));
        }, 10000);

        window.addEventListener('openai-agents-loaded', () => {
          clearTimeout(timeout);
          this.loaded = true;
          this.loading = false;
          resolve(true);
        }, { once: true });

        script.onerror = () => {
          clearTimeout(timeout);
          this.loading = false;
          reject(new Error('Failed to load OpenAI Agents SDK'));
        };
      });

    } catch (error) {
      this.loading = false;
      console.error('❌ Failed to load OpenAI Agents SDK:', error);
      
      // Fallback: Set up mock objects for development
      window.openai = {
        RealtimeAgent: class MockRealtimeAgent {
          constructor(config) {
            console.warn('⚠️ Using mock RealtimeAgent - SDK not available');
            this.config = config;
          }
        },
        RealtimeSession: class MockRealtimeSession {
          constructor(agent) {
            console.warn('⚠️ Using mock RealtimeSession - SDK not available');
            this.agent = agent;
          }
          async connect() {
            throw new Error('OpenAI Agents SDK not available');
          }
        }
      };
      
      return false;
    }
  }
}

// Global instance
window.openaiAgentsLoader = new OpenAIAgentsLoader();
