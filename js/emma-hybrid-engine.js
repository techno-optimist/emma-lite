/**
 * Emma Hybrid Engine - Intelligent Memory Orchestration
 * Combines smart pattern recognition with universal fallback
 */

class EmmaHybridEngine {
  constructor() {
    this.recognizers = new Map();
    this.initializeRecognizers();
    this.universalCapture = new UniversalCapture();
    this.memoryQueue = [];
    this.isProcessing = false;
  }

  initializeRecognizers() {
    // Register recognizers in priority order
    this.registerRecognizer('conversation', new ConversationRecognizer());
    this.registerRecognizer('documentation', new DocumentationRecognizer());
    this.registerRecognizer('code', new CodeRecognizer());
    this.registerRecognizer('article', new ArticleRecognizer());
    this.registerRecognizer('research', new ResearchRecognizer());
  }

  registerRecognizer(name, recognizer) {
    this.recognizers.set(name, recognizer);
    console.log(`Emma: Registered ${name} recognizer`);
  }

  async analyze(options = {}) {
    const url = window.location.href;
    const content = document.body;
    
    // Try each recognizer in order
    for (const [name, recognizer] of this.recognizers) {
      try {
        if (await recognizer.canHandle(url, content)) {
          console.log(`Emma: Using ${name} recognizer for ${url}`);
          return {
            type: name,
            recognizer,
            confidence: await recognizer.getConfidence(url, content)
          };
        }
      } catch (error) {
        console.warn(`Emma: ${name} recognizer failed:`, error);
      }
    }
    
    // Fallback to universal capture
    console.log('Emma: No specific recognizer matched, using universal capture');
    return {
      type: 'universal',
      recognizer: this.universalCapture,
      confidence: 0.5
    };
  }

  async capture(options = {}) {
    const analysis = await this.analyze(options);
    
    if (analysis.confidence < 0.3 && !options.force) {
      console.log('Emma: Low confidence, skipping automatic capture');
      return null;
    }
    
    const memories = await analysis.recognizer.extract(document, options);
    
    if (memories && memories.length > 0) {
      await this.processMemories(memories, analysis.type);
      return memories;
    }
    
    return null;
  }

  async processMemories(memories, type) {
    for (const memory of memories) {
      // Enhance memory with metadata
      memory.captureType = type;
      memory.captureTime = Date.now();
      memory.url = window.location.href;
      memory.domain = window.location.hostname;
      
      // Add to queue for batch processing
      this.memoryQueue.push(memory);
    }
    
    // Process queue
    if (!this.isProcessing) {
      await this.flushMemoryQueue();
    }
  }

  async flushMemoryQueue() {
    if (this.memoryQueue.length === 0) return;
    
    this.isProcessing = true;
    const batch = [...this.memoryQueue];
    this.memoryQueue = [];
    
    try {
      for (const memory of batch) {
        await chrome.runtime.sendMessage({
          action: 'saveMemory',
          data: memory
        });
      }
      console.log(`Emma: Saved ${batch.length} memories`);
    } catch (error) {
      console.error('Emma: Failed to save memories:', error);
      // Re-queue failed memories
      this.memoryQueue.unshift(...batch);
    } finally {
      this.isProcessing = false;
    }
  }
}

/**
 * Base Recognizer Class
 */
class BaseRecognizer {
  async canHandle(url, content) {
    throw new Error('canHandle must be implemented');
  }
  
  async getConfidence(url, content) {
    return 1.0; // Default high confidence
  }
  
  async extract(document, options) {
    throw new Error('extract must be implemented');
  }
  
  // Utility methods
  findElements(selectors) {
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) return elements;
    }
    return [];
  }
  
  extractText(element) {
    const clone = element.cloneNode(true);
    // Remove scripts, styles, and hidden elements
    clone.querySelectorAll('script, style, [hidden]').forEach(el => el.remove());
    return clone.textContent.trim();
  }
}

/**
 * Conversation Recognizer - For AI chat platforms
 */
class ConversationRecognizer extends BaseRecognizer {
  constructor() {
    super();
    this.patterns = {
      chatgpt: {
        domain: ['chat.openai.com', 'chatgpt.com'],
        selectors: {
          messages: '[data-testid^="conversation-turn-"]',
          user: '[data-message-author-role="user"]',
          assistant: '[data-message-author-role="assistant"]'
        }
      },
      claude: {
        domain: ['claude.ai'],
        selectors: {
          messages: '[data-testid*="message"], .message-content, [class*="message"]',
          user: '[data-role="user"], [class*="user-message"]',
          assistant: '[data-role="assistant"], [class*="assistant-message"]'
        }
      },
      gemini: {
        domain: ['gemini.google.com', 'bard.google.com'],
        selectors: {
          messages: '[class*="conversation"], [class*="message"]',
          user: '[class*="user"], [class*="human"]',
          assistant: '[class*="model"], [class*="assistant"]'
        }
      },
      perplexity: {
        domain: ['perplexity.ai'],
        selectors: {
          messages: '[class*="message"], [class*="query"], [class*="answer"]',
          user: '[class*="human"], [class*="query"]',
          assistant: '[class*="answer"], [class*="response"]'
        }
      }
    };
  }
  
  async canHandle(url, content) {
    const domain = new URL(url).hostname;
    
    // Check known AI platforms
    for (const [platform, config] of Object.entries(this.patterns)) {
      if (config.domain.some(d => domain.includes(d))) {
        return true;
      }
    }
    
    // Check for conversation patterns in content
    const hasConversationMarkers = 
      content.textContent.includes('User:') || 
      content.textContent.includes('Assistant:') ||
      content.querySelector('[role="dialog"]') ||
      content.querySelector('[class*="chat"]') ||
      content.querySelector('[class*="conversation"]');
    
    return hasConversationMarkers;
  }
  
  async getConfidence(url, content) {
    const domain = new URL(url).hostname;
    
    // High confidence for known platforms
    for (const [platform, config] of Object.entries(this.patterns)) {
      if (config.domain.some(d => domain.includes(d))) {
        return 0.95;
      }
    }
    
    // Medium confidence for unknown but likely conversations
    return 0.6;
  }
  
  async extract(document, options) {
    const memories = [];
    const platform = this.detectPlatform(window.location.hostname);
    
    if (platform) {
      // Use platform-specific extraction
      memories.push(...await this.extractPlatformMessages(document, platform));
    } else {
      // Use generic conversation extraction
      memories.push(...await this.extractGenericConversation(document));
    }
    
    return memories;
  }
  
  detectPlatform(hostname) {
    for (const [platform, config] of Object.entries(this.patterns)) {
      if (config.domain.some(d => hostname.includes(d))) {
        return platform;
      }
    }
    return null;
  }
  
  async extractPlatformMessages(document, platform) {
    const config = this.patterns[platform];
    const memories = [];
    const messages = document.querySelectorAll(config.selectors.messages);
    
    messages.forEach((element, index) => {
      const isUser = element.querySelector(config.selectors.user);
      const isAssistant = element.querySelector(config.selectors.assistant);
      
      if (isUser || isAssistant) {
        const content = this.extractText(element);
        if (content.length > 10) {
          memories.push({
            content,
            role: isUser ? 'user' : 'assistant',
            source: platform,
            type: 'conversation',
            metadata: {
              platform,
              messageIndex: index,
              timestamp: Date.now()
            }
          });
        }
      }
    });
    
    return memories;
  }
  
  async extractGenericConversation(document) {
    const memories = [];
    
    // Look for alternating speaker patterns
    const possibleMessages = document.querySelectorAll(
      'div[class*="message"], article, section, [role="article"], .comment, .post'
    );
    
    let lastRole = null;
    possibleMessages.forEach((element, index) => {
      const text = this.extractText(element);
      if (text.length > 20) {
        // Alternate between user and assistant for unknown formats
        const role = lastRole === 'user' ? 'assistant' : 'user';
        lastRole = role;
        
        memories.push({
          content: text,
          role,
          source: 'unknown',
          type: 'conversation',
          metadata: {
            elementIndex: index,
            timestamp: Date.now()
          }
        });
      }
    });
    
    return memories;
  }
}

/**
 * Documentation Recognizer - For technical docs, wikis
 */
class DocumentationRecognizer extends BaseRecognizer {
  constructor() {
    super();
    this.docSites = [
      'developer.mozilla.org',
      'docs.python.org',
      'nodejs.org/docs',
      'reactjs.org',
      'vuejs.org',
      'angular.io',
      'tensorflow.org',
      'pytorch.org',
      'stackoverflow.com',
      'github.com',
      'gitlab.com'
    ];
  }
  
  async canHandle(url, content) {
    const domain = new URL(url).hostname;
    
    // Check known documentation sites
    if (this.docSites.some(site => domain.includes(site))) {
      return true;
    }
    
    // Check for documentation markers
    const hasDocMarkers = 
      content.querySelector('pre code') || // Code blocks
      content.querySelector('.highlight') || // Syntax highlighting
      content.querySelector('[class*="docs"]') ||
      content.querySelector('[class*="api"]') ||
      content.querySelector('[class*="reference"]');
    
    return hasDocMarkers;
  }
  
  async extract(document, options) {
    const memories = [];
    
    // Extract main documentation content
    const mainContent = document.querySelector(
      'main, article, [role="main"], .documentation, .content'
    );
    
    if (mainContent) {
      // Extract title
      const title = document.querySelector('h1')?.textContent || document.title;
      
      // Extract code examples
      const codeBlocks = mainContent.querySelectorAll('pre code, .highlight');
      codeBlocks.forEach((block, index) => {
        memories.push({
          content: block.textContent,
          type: 'code',
          source: 'documentation',
          metadata: {
            title,
            language: block.className || 'unknown',
            blockIndex: index
          }
        });
      });
      
      // Extract important sections
      const sections = mainContent.querySelectorAll('section, .section');
      sections.forEach(section => {
        const heading = section.querySelector('h2, h3')?.textContent;
        if (heading && this.isImportantSection(heading)) {
          memories.push({
            content: this.extractText(section),
            type: 'documentation',
            source: 'documentation',
            metadata: {
              title,
              section: heading
            }
          });
        }
      });
    }
    
    return memories;
  }
  
  isImportantSection(heading) {
    const important = ['example', 'usage', 'api', 'reference', 'syntax', 'parameter', 'return'];
    return important.some(keyword => heading.toLowerCase().includes(keyword));
  }
}

/**
 * Code Recognizer - For code repositories and snippets
 */
class CodeRecognizer extends BaseRecognizer {
  async canHandle(url, content) {
    const domain = new URL(url).hostname;
    
    // GitHub, GitLab, BitBucket, etc.
    const codeHosts = ['github.com', 'gitlab.com', 'bitbucket.org', 'codepen.io', 'jsfiddle.net'];
    if (codeHosts.some(host => domain.includes(host))) {
      return true;
    }
    
    // Check for code elements
    const codeElements = content.querySelectorAll('pre code, .highlight, .CodeMirror');
    return codeElements.length > 3; // Multiple code blocks indicate code-focused content
  }
  
  async extract(document, options) {
    const memories = [];
    const url = window.location.href;
    
    // GitHub specific
    if (url.includes('github.com')) {
      const repoInfo = this.extractGitHubInfo(document);
      const codeBlocks = document.querySelectorAll('.blob-code, pre code');
      
      codeBlocks.forEach((block, index) => {
        memories.push({
          content: block.textContent,
          type: 'code',
          source: 'github',
          metadata: {
            ...repoInfo,
            blockIndex: index
          }
        });
      });
    } else {
      // Generic code extraction
      const codeBlocks = document.querySelectorAll('pre code, .highlight');
      codeBlocks.forEach((block, index) => {
        memories.push({
          content: block.textContent,
          type: 'code',
          source: 'code',
          metadata: {
            language: this.detectLanguage(block),
            blockIndex: index
          }
        });
      });
    }
    
    return memories;
  }
  
  extractGitHubInfo(document) {
    const pathParts = window.location.pathname.split('/');
    return {
      owner: pathParts[1] || 'unknown',
      repo: pathParts[2] || 'unknown',
      branch: document.querySelector('.branch-name')?.textContent || 'main',
      file: document.querySelector('.final-path')?.textContent || 'unknown'
    };
  }
  
  detectLanguage(element) {
    const className = element.className;
    const languages = ['javascript', 'python', 'java', 'cpp', 'go', 'rust', 'typescript'];
    
    for (const lang of languages) {
      if (className.includes(lang)) return lang;
    }
    
    return 'unknown';
  }
}

/**
 * Article Recognizer - For blog posts, news articles
 */
class ArticleRecognizer extends BaseRecognizer {
  async canHandle(url, content) {
    // Check for article metadata
    const hasArticleMarkers = 
      content.querySelector('article') ||
      content.querySelector('[itemtype*="Article"]') ||
      content.querySelector('meta[property="og:type"][content="article"]') ||
      content.querySelector('.post, .blog-post, .entry-content');
    
    return hasArticleMarkers;
  }
  
  async extract(document, options) {
    const memories = [];
    
    // Extract article metadata
    const title = document.querySelector('h1')?.textContent || 
                  document.querySelector('meta[property="og:title"]')?.content ||
                  document.title;
    
    const author = document.querySelector('[rel="author"]')?.textContent ||
                   document.querySelector('meta[name="author"]')?.content ||
                   'Unknown';
    
    const publishDate = document.querySelector('time')?.getAttribute('datetime') ||
                        document.querySelector('meta[property="article:published_time"]')?.content;
    
    // Extract main content
    const article = document.querySelector('article, .post-content, .entry-content, main');
    
    if (article) {
      // Extract summary/key points
      const summary = this.extractSummary(article);
      
      memories.push({
        content: summary,
        type: 'article',
        source: 'article',
        metadata: {
          title,
          author,
          publishDate,
          fullText: this.extractText(article).substring(0, 5000) // Limit size
        }
      });
      
      // Extract notable quotes
      const quotes = article.querySelectorAll('blockquote');
      quotes.forEach(quote => {
        memories.push({
          content: this.extractText(quote),
          type: 'quote',
          source: 'article',
          metadata: {
            articleTitle: title,
            author
          }
        });
      });
    }
    
    return memories;
  }
  
  extractSummary(article) {
    // Try to find explicit summary
    const summary = article.querySelector('.summary, .abstract, .lead');
    if (summary) return this.extractText(summary);
    
    // Otherwise, take first few paragraphs
    const paragraphs = article.querySelectorAll('p');
    const firstFew = Array.from(paragraphs).slice(0, 3);
    return firstFew.map(p => this.extractText(p)).join('\n\n');
  }
}

/**
 * Research Recognizer - For academic papers, research
 */
class ResearchRecognizer extends BaseRecognizer {
  async canHandle(url, content) {
    const domain = new URL(url).hostname;
    
    // Academic sites
    const academicSites = ['arxiv.org', 'pubmed', 'scholar.google', 'jstor.org', 'sciencedirect.com'];
    if (academicSites.some(site => domain.includes(site))) {
      return true;
    }
    
    // Check for research markers
    const hasResearchMarkers = 
      content.querySelector('.abstract') ||
      content.querySelector('[class*="citation"]') ||
      content.textContent.includes('Abstract') && content.textContent.includes('References');
    
    return hasResearchMarkers;
  }
  
  async extract(document, options) {
    const memories = [];
    
    // Extract paper metadata
    const title = document.querySelector('h1, .title')?.textContent;
    const authors = this.extractAuthors(document);
    const abstract = document.querySelector('.abstract')?.textContent;
    
    if (title && abstract) {
      memories.push({
        content: abstract,
        type: 'research',
        source: 'research',
        metadata: {
          title,
          authors,
          paperType: 'abstract'
        }
      });
    }
    
    // Extract key findings/conclusions
    const conclusions = document.querySelector('.conclusions, [class*="conclusion"]');
    if (conclusions) {
      memories.push({
        content: this.extractText(conclusions),
        type: 'research',
        source: 'research',
        metadata: {
          title,
          authors,
          paperType: 'conclusions'
        }
      });
    }
    
    return memories;
  }
  
  extractAuthors(document) {
    const authorElements = document.querySelectorAll('.author, [class*="author"]');
    return Array.from(authorElements).map(el => el.textContent.trim()).join(', ');
  }
}

/**
 * Universal Capture - Fallback for any content
 */
class UniversalCapture extends BaseRecognizer {
  async canHandle(url, content) {
    return true; // Always can handle
  }
  
  async getConfidence(url, content) {
    return 0.3; // Low confidence by default
  }
  
  async extract(document, options) {
    const memories = [];
    
    // Only capture if user explicitly requests
    if (!options.userTriggered) {
      return memories;
    }
    
    // Get selected text if any
    const selection = window.getSelection();
    if (selection && selection.toString().length > 10) {
      memories.push({
        content: selection.toString(),
        type: 'selection',
        source: 'manual',
        metadata: {
          trigger: 'user_selection'
        }
      });
    } else {
      // Capture visible text
      const visibleText = this.getVisibleText(document);
      if (visibleText.length > 50) {
        memories.push({
          content: visibleText.substring(0, 3000), // Limit size
          type: 'page',
          source: 'manual',
          metadata: {
            trigger: 'user_capture',
            title: document.title
          }
        });
      }
    }
    
    return memories;
  }
  
  getVisibleText(document) {
    const main = document.querySelector('main, article, [role="main"], .content') || document.body;
    return this.extractText(main);
  }
}

// Export for use in content scripts
window.EmmaHybridEngine = EmmaHybridEngine;
