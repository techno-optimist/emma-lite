import { EventEmitter } from 'events';
import OpenAI from 'openai';
import { DatabaseStorage } from '../storage';
import { MemoryGraphBridge, MemoryTensor } from './MemoryGraphBridge';
import { memoryGraphLogger as logger, PerformanceMonitor } from './Logger';
import { Session } from 'neo4j-driver';

/**
 * Entanglement Types - Different ways memories can be connected
 */
export enum EntanglementType {
  TEMPORAL = 'temporal', // Memories close in time
  SEMANTIC = 'semantic', // Similar content/meaning
  EMOTIONAL = 'emotional', // Similar emotional states
  PERSON = 'person', // Same people mentioned
  LOCATION = 'location', // Same places
  THEME = 'theme', // Similar themes/topics
  CAUSAL = 'causal', // One led to another
  CONTINUATION = 'continuation', // Part of same story
  CONTRAST = 'contrast', // Opposing but related
  ASSOCIATIVE = 'associative', // General association
}

/**
 * Entanglement Strength - How strong the connection is
 */
export enum EntanglementStrength {
  WEAK = 0.25,
  MODERATE = 0.5,
  STRONG = 0.75,
  VERY_STRONG = 1.0,
}

/**
 * Memory Entanglement - Represents a connection between two memories
 */
export interface MemoryEntanglement {
  id: string;
  memoryA: string;
  memoryB: string;
  type: EntanglementType;
  strength: number;
  confidence: number;
  metadata: {
    reason: string;
    sharedElements?: string[];
    temporalDistance?: number;
    emotionalResonance?: number;
    semanticSimilarity?: number;
  };
  bidirectional: boolean;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
}

/**
 * Entanglement Discovery Result
 */
export interface EntanglementDiscovery {
  memory: any;
  entanglements: MemoryEntanglement[];
  suggestions: {
    type: EntanglementType;
    targetMemoryId: string;
    reason: string;
    confidence: number;
  }[];
}

/**
 * Entanglement Engine Configuration
 */
export interface EntanglementEngineConfig {
  openAIApiKey?: string;
  embeddingModel?: string;
  minConfidenceThreshold?: number;
  maxEntanglementsPerMemory?: number;
  temporalWindowDays?: number;
  enableAutoDiscovery?: boolean;
  discoveryBatchSize?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

/**
 * Entanglement Engine Events
 */
export enum EntanglementEvent {
  DISCOVERY_STARTED = 'discovery:started',
  DISCOVERY_COMPLETED = 'discovery:completed',
  ENTANGLEMENT_CREATED = 'entanglement:created',
  ENTANGLEMENT_UPDATED = 'entanglement:updated',
  ENTANGLEMENT_REMOVED = 'entanglement:removed',
  ERROR = 'error',
}

/**
 * Entanglement Engine - Creates meaningful connections between memories
 *
 * This engine uses multiple strategies to identify relationships:
 * 1. Semantic similarity via embeddings
 * 2. Temporal proximity analysis
 * 3. Emotional resonance mapping
 * 4. Entity extraction (people, places, things)
 * 5. Theme and topic modeling
 */
export class EntanglementEngine extends EventEmitter {
  private storage: DatabaseStorage;
  private memoryGraph: MemoryGraphBridge;
  private openai: OpenAI;
  private config: Required<EntanglementEngineConfig>;
  private isInitialized: boolean = false;
  private discoveryQueue: Set<string> = new Set();
  private processingMemories: Set<string> = new Set();

  constructor(
    storage: DatabaseStorage,
    memoryGraph: MemoryGraphBridge,
    config?: EntanglementEngineConfig
  ) {
    super();
    this.storage = storage;
    this.memoryGraph = memoryGraph;
    this.config = this.buildConfig(config);

    this.openai = new OpenAI({
      apiKey: this.config.openAIApiKey,
    });
  }

  private buildConfig(config?: EntanglementEngineConfig): Required<EntanglementEngineConfig> {
    return {
      openAIApiKey: config?.openAIApiKey || process.env.OPENAI_API_KEY || '',
      embeddingModel: config?.embeddingModel || 'text-embedding-3-small',
      minConfidenceThreshold: config?.minConfidenceThreshold || 0.3,
      maxEntanglementsPerMemory: config?.maxEntanglementsPerMemory || 20,
      temporalWindowDays: config?.temporalWindowDays || 30,
      enableAutoDiscovery: config?.enableAutoDiscovery ?? true,
      discoveryBatchSize: config?.discoveryBatchSize || 10,
      cacheEnabled: config?.cacheEnabled ?? true,
      cacheTTL: config?.cacheTTL || 3600, // 1 hour
    };
  }

  /**
   * Initialize the Entanglement Engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Entanglement Engine already initialized');
      return;
    }

    logger.info('Initializing Entanglement Engine...', { config: this.config });

    try {
      // Verify OpenAI API key
      if (!this.config.openAIApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Test OpenAI connection
      await this.testOpenAIConnection();

      // Create Neo4j indexes for entanglements
      await this.createGraphIndexes();

      this.isInitialized = true;
      logger.info('✅ Entanglement Engine initialized successfully');

      // Start auto-discovery if enabled
      if (this.config.enableAutoDiscovery) {
        this.startAutoDiscovery();
      }
    } catch (error) {
      logger.error('Failed to initialize Entanglement Engine', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Test OpenAI connection
   */
  private async testOpenAIConnection(): Promise<void> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.config.embeddingModel,
        input: 'test',
      });
      logger.info('OpenAI connection verified', { model: this.config.embeddingModel });
    } catch (error) {
      throw new Error(
        `OpenAI connection failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create Neo4j indexes for entanglements
   */
  private async createGraphIndexes(): Promise<void> {
    const session = this.memoryGraph['neo4jDriver'].session();

    try {
      // Create Entanglement relationship indexes
      await session.run(`
        CREATE INDEX entanglement_type IF NOT EXISTS
        FOR ()-[r:ENTANGLED_WITH]-() ON (r.type)
      `);

      await session.run(`
        CREATE INDEX entanglement_strength IF NOT EXISTS
        FOR ()-[r:ENTANGLED_WITH]-() ON (r.strength)
      `);

      logger.info('Neo4j entanglement indexes created');
    } catch (error) {
      logger.warn('Neo4j index creation failed (may already exist)', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Discover entanglements for a memory
   */
  async discoverEntanglements(memoryId: string, userId: number): Promise<EntanglementDiscovery> {
    if (!this.isInitialized) {
      throw new Error('Entanglement Engine not initialized');
    }

    const monitorId = `entanglement_discovery_${memoryId}`;
    PerformanceMonitor.start(monitorId);

    try {
      this.emit(EntanglementEvent.DISCOVERY_STARTED, { memoryId, userId });

      // Get the target memory
      const memory = await this.storage.getMemoryScreenshot(parseInt(memoryId), userId);
      if (!memory) {
        throw new Error(`Memory ${memoryId} not found`);
      }

      // Get embedding for the memory
      const embedding = await this.generateEmbedding(memory);

      // Find similar memories
      const candidates = await this.findCandidateMemories(memory, userId, embedding);

      // Analyze relationships
      const entanglements = await this.analyzeRelationships(memory, candidates, embedding);

      // Store entanglements in Neo4j
      await this.storeEntanglements(memory, entanglements);

      // Generate suggestions for additional connections
      const suggestions = await this.generateSuggestions(memory, entanglements, candidates);

      const duration = PerformanceMonitor.end(monitorId);

      const result: EntanglementDiscovery = {
        memory,
        entanglements,
        suggestions,
      };

      this.emit(EntanglementEvent.DISCOVERY_COMPLETED, {
        memoryId,
        userId,
        entanglementsFound: entanglements.length,
        duration,
      });

      logger.info('Entanglement discovery completed', {
        memoryId,
        entanglementsFound: entanglements.length,
        suggestionsGenerated: suggestions.length,
        duration,
      });

      return result;
    } catch (error) {
      PerformanceMonitor.end(monitorId);
      logger.error('Entanglement discovery failed', {
        memoryId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      this.emit(EntanglementEvent.ERROR, {
        memoryId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate embedding for a memory
   */
  private async generateEmbedding(memory: any): Promise<number[]> {
    try {
      // Combine relevant text content
      const textContent = [
        memory.title || '',
        memory.content || '',
        memory.emotionalNarrative || '',
        ...(memory.emotions || []),
        ...(memory.tags || []),
      ]
        .filter(Boolean)
        .join(' ');

      const response = await this.openai.embeddings.create({
        model: this.config.embeddingModel,
        input: textContent,
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('Failed to generate embedding', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Find candidate memories for entanglement
   */
  private async findCandidateMemories(
    memory: any,
    userId: number,
    embedding: number[]
  ): Promise<any[]> {
    try {
      // Get recent memories within temporal window
      const recentMemories = await this.getRecentMemories(userId, memory.id);

      // Get semantically similar memories using vector search
      const similarMemories = await this.findSimilarMemoriesByEmbedding(
        userId,
        embedding,
        memory.id
      );

      // Get memories with similar emotions
      const emotionalMemories = await this.findEmotionallyResonantMemories(
        userId,
        memory,
        memory.id
      );

      // Combine and deduplicate
      const candidateMap = new Map<string, any>();
      [...recentMemories, ...similarMemories, ...emotionalMemories].forEach(m => {
        if (m.id !== memory.id) {
          candidateMap.set(m.id.toString(), m);
        }
      });

      return Array.from(candidateMap.values());
    } catch (error) {
      logger.error('Failed to find candidate memories', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Analyze relationships between memories
   */
  private async analyzeRelationships(
    memory: any,
    candidates: any[],
    embedding: number[]
  ): Promise<MemoryEntanglement[]> {
    const entanglements: MemoryEntanglement[] = [];

    for (const candidate of candidates) {
      try {
        // Generate embedding for candidate if needed
        const candidateEmbedding = await this.generateEmbedding(candidate);

        // Calculate different relationship scores
        const scores = {
          semantic: this.calculateSemanticSimilarity(embedding, candidateEmbedding),
          temporal: this.calculateTemporalProximity(memory, candidate),
          emotional: this.calculateEmotionalResonance(memory, candidate),
          entity: await this.calculateEntityOverlap(memory, candidate),
        };

        // Determine primary entanglement type and strength
        const { type, strength, confidence } = this.determineEntanglementType(scores);

        if (confidence >= this.config.minConfidenceThreshold) {
          const entanglement: MemoryEntanglement = {
            id: `ent-${memory.id}-${candidate.id}-${Date.now()}`,
            memoryA: memory.id.toString(),
            memoryB: candidate.id.toString(),
            type,
            strength,
            confidence,
            metadata: {
              reason: this.generateEntanglementReason(type, scores),
              temporalDistance: scores.temporal,
              emotionalResonance: scores.emotional,
              semanticSimilarity: scores.semantic,
            },
            bidirectional: true,
            createdAt: new Date(),
            lastAccessed: new Date(),
            accessCount: 0,
          };

          entanglements.push(entanglement);
        }
      } catch (error) {
        logger.warn('Failed to analyze relationship', {
          memoryId: memory.id,
          candidateId: candidate.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Sort by confidence and limit to max entanglements
    return entanglements
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.maxEntanglementsPerMemory);
  }

  /**
   * Calculate semantic similarity using cosine similarity
   */
  private calculateSemanticSimilarity(embedding1: number[], embedding2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) return 0;

    return dotProduct / (norm1 * norm2);
  }

  /**
   * Calculate temporal proximity between memories
   */
  private calculateTemporalProximity(memory1: any, memory2: any): number {
    const date1 = new Date(memory1.timestamp || memory1.createdAt);
    const date2 = new Date(memory2.timestamp || memory2.createdAt);

    const daysDiff = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);

    // Normalize to 0-1 scale based on temporal window
    return Math.max(0, 1 - daysDiff / this.config.temporalWindowDays);
  }

  /**
   * Calculate emotional resonance between memories
   */
  private calculateEmotionalResonance(memory1: any, memory2: any): number {
    const emotions1 = new Set(memory1.emotions || []);
    const emotions2 = new Set(memory2.emotions || []);

    if (emotions1.size === 0 || emotions2.size === 0) return 0;

    const emotions1Array = Array.from(emotions1);
    const emotions2Array = Array.from(emotions2);
    const intersection = new Set(emotions1Array.filter(x => emotions2.has(x)));
    const union = new Set([...emotions1Array, ...emotions2Array]);

    // Jaccard similarity for emotions
    const emotionSimilarity = intersection.size / union.size;

    // Consider emotional intensity
    const intensity1 = memory1.emotionalIntensity || 0.5;
    const intensity2 = memory2.emotionalIntensity || 0.5;
    const intensitySimilarity = 1 - Math.abs(intensity1 - intensity2);

    return (emotionSimilarity + intensitySimilarity) / 2;
  }

  /**
   * Calculate entity overlap using NLP
   */
  private async calculateEntityOverlap(memory1: any, memory2: any): Promise<number> {
    try {
      // Use OpenAI to extract entities
      const entities1 = await this.extractEntities(memory1);
      const entities2 = await this.extractEntities(memory2);

      const set1 = new Set(entities1);
      const set2 = new Set(entities2);

      if (set1.size === 0 || set2.size === 0) return 0;

      const set1Array = Array.from(set1);
      const set2Array = Array.from(set2);
      const intersection = new Set(set1Array.filter(x => set2.has(x)));
      const union = new Set([...set1Array, ...set2Array]);

      return intersection.size / union.size;
    } catch (error) {
      logger.warn('Entity extraction failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * Extract entities from memory using OpenAI
   */
  private async extractEntities(memory: any): Promise<string[]> {
    try {
      const prompt = `Extract all people, places, and important objects mentioned in this memory. Return as a simple comma-separated list.

Memory: "${memory.title || ''} - ${memory.content || ''}"

Entities:`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 100,
      });

      const entities = response.choices[0]?.message?.content || '';
      return entities
        .split(',')
        .map(e => e.trim())
        .filter(Boolean);
    } catch (error) {
      logger.warn('Entity extraction with OpenAI failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Determine the primary entanglement type based on scores
   */
  private determineEntanglementType(scores: {
    semantic: number;
    temporal: number;
    emotional: number;
    entity: number;
  }): { type: EntanglementType; strength: number; confidence: number } {
    // Find the dominant relationship type
    const scoreEntries = Object.entries(scores);
    const [dominantType, dominantScore] = scoreEntries.reduce((a, b) => (a[1] > b[1] ? a : b));

    // Calculate overall confidence
    const avgScore = scoreEntries.reduce((sum, [_, score]) => sum + score, 0) / scoreEntries.length;
    const confidence = (dominantScore + avgScore) / 2;

    // Map score type to entanglement type
    let type: EntanglementType;
    switch (dominantType) {
      case 'semantic':
        type = EntanglementType.SEMANTIC;
        break;
      case 'temporal':
        type = EntanglementType.TEMPORAL;
        break;
      case 'emotional':
        type = EntanglementType.EMOTIONAL;
        break;
      case 'entity':
        type = EntanglementType.PERSON; // Could be person, location, or theme
        break;
      default:
        type = EntanglementType.ASSOCIATIVE;
    }

    // Determine strength based on confidence
    let strength: number;
    if (confidence >= 0.8) strength = EntanglementStrength.VERY_STRONG;
    else if (confidence >= 0.6) strength = EntanglementStrength.STRONG;
    else if (confidence >= 0.4) strength = EntanglementStrength.MODERATE;
    else strength = EntanglementStrength.WEAK;

    return { type, strength, confidence };
  }

  /**
   * Generate human-readable reason for entanglement
   */
  private generateEntanglementReason(type: EntanglementType, scores: any): string {
    switch (type) {
      case EntanglementType.SEMANTIC:
        return `These memories share similar themes and content (${Math.round(scores.semantic * 100)}% similarity)`;
      case EntanglementType.TEMPORAL:
        return `These memories occurred close together in time`;
      case EntanglementType.EMOTIONAL:
        return `These memories evoke similar emotional responses (${Math.round(scores.emotional * 100)}% resonance)`;
      case EntanglementType.PERSON:
        return `These memories involve the same people or places`;
      default:
        return `These memories are connected through multiple associations`;
    }
  }

  /**
   * Store entanglements in Neo4j graph
   */
  private async storeEntanglements(
    memory: any,
    entanglements: MemoryEntanglement[]
  ): Promise<void> {
    const session = this.memoryGraph['neo4jDriver'].session();

    try {
      for (const entanglement of entanglements) {
        await session.run(
          `
          MATCH (a:Memory {id: $memoryA})
          MATCH (b:Memory {id: $memoryB})
          MERGE (a)-[r:ENTANGLED_WITH {id: $entanglementId}]->(b)
          SET r.type = $type,
              r.strength = $strength,
              r.confidence = $confidence,
              r.reason = $reason,
              r.createdAt = datetime(),
              r.lastAccessed = datetime(),
              r.accessCount = 0
          ${entanglement.bidirectional ? 'MERGE (b)-[r2:ENTANGLED_WITH {id: $entanglementId + "_reverse"}]->(a) SET r2 = r' : ''}
        `,
          {
            memoryA: `memory-${entanglement.memoryA}`,
            memoryB: `memory-${entanglement.memoryB}`,
            entanglementId: entanglement.id,
            type: entanglement.type,
            strength: entanglement.strength,
            confidence: entanglement.confidence,
            reason: entanglement.metadata.reason,
          }
        );

        this.emit(EntanglementEvent.ENTANGLEMENT_CREATED, entanglement);
      }

      logger.info('Entanglements stored in Neo4j', {
        memoryId: memory.id,
        count: entanglements.length,
      });
    } catch (error) {
      logger.error('Failed to store entanglements', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Generate suggestions for additional connections
   */
  private async generateSuggestions(
    memory: any,
    existingEntanglements: MemoryEntanglement[],
    candidates: any[]
  ): Promise<any[]> {
    // Get memories already entangled
    const entangledIds = new Set(existingEntanglements.map(e => e.memoryB));

    // Find candidates not yet entangled but with potential
    const suggestions = candidates
      .filter(c => !entangledIds.has(c.id.toString()))
      .slice(0, 5)
      .map(candidate => ({
        type: EntanglementType.ASSOCIATIVE,
        targetMemoryId: candidate.id.toString(),
        reason: 'Potential connection identified through pattern analysis',
        confidence: 0.25,
      }));

    return suggestions;
  }

  /**
   * Get recent memories within temporal window
   */
  private async getRecentMemories(userId: number, excludeId: string): Promise<any[]> {
    try {
      const memories = await this.storage.getMemoryScreenshots(userId);
      const targetDate = new Date();

      return memories.filter(m => {
        if (m.id.toString() === excludeId) return false;

        const memoryDate = new Date(m.timestamp || m.createdAt || Date.now());
        const daysDiff =
          Math.abs(targetDate.getTime() - memoryDate.getTime()) / (1000 * 60 * 60 * 24);

        return daysDiff <= this.config.temporalWindowDays;
      });
    } catch (error) {
      logger.error('Failed to get recent memories', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Find similar memories by embedding (simplified version)
   */
  private async findSimilarMemoriesByEmbedding(
    userId: number,
    embedding: number[],
    excludeId: string
  ): Promise<any[]> {
    // In a production system, this would use vector search in MongoDB or a dedicated vector DB
    // For now, we'll get all memories and calculate similarity
    try {
      const memories = await this.storage.getMemoryScreenshots(userId);
      const similarities: Array<{ memory: any; similarity: number }> = [];

      for (const memory of memories) {
        if (memory.id.toString() === excludeId) continue;

        try {
          const memEmbedding = await this.generateEmbedding(memory);
          const similarity = this.calculateSemanticSimilarity(embedding, memEmbedding);

          if (similarity > 0.5) {
            similarities.push({ memory, similarity });
          }
        } catch (error) {
          // Skip memories that fail embedding
        }
      }

      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10)
        .map(s => s.memory);
    } catch (error) {
      logger.error('Failed to find similar memories', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Find emotionally resonant memories
   */
  private async findEmotionallyResonantMemories(
    userId: number,
    targetMemory: any,
    excludeId: string
  ): Promise<any[]> {
    try {
      const memories = await this.storage.getMemoryScreenshots(userId);
      const targetEmotions = new Set(targetMemory.emotions || []);

      if (targetEmotions.size === 0) return [];

      return memories
        .filter(m => {
          if (m.id.toString() === excludeId) return false;

          const memoryEmotions = new Set((m as any).emotions || []);
          const targetEmotionsArray = Array.from(targetEmotions);
          const intersection = new Set(targetEmotionsArray.filter(x => memoryEmotions.has(x)));

          return intersection.size > 0;
        })
        .slice(0, 10);
    } catch (error) {
      logger.error('Failed to find emotionally resonant memories', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Start automatic discovery process
   */
  private startAutoDiscovery(): void {
    logger.info('Starting automatic entanglement discovery');

    // Run discovery every 5 minutes
    setInterval(
      async () => {
        if (this.discoveryQueue.size > 0) {
          await this.processDiscoveryQueue();
        }
      },
      5 * 60 * 1000
    );
  }

  /**
   * Process discovery queue
   */
  private async processDiscoveryQueue(): Promise<void> {
    const batch = Array.from(this.discoveryQueue).slice(0, this.config.discoveryBatchSize);

    for (const memoryInfo of batch) {
      try {
        const [memoryId, userId] = memoryInfo.split(':');

        if (!this.processingMemories.has(memoryId)) {
          this.processingMemories.add(memoryId);
          this.discoveryQueue.delete(memoryInfo);

          await this.discoverEntanglements(memoryId, parseInt(userId));

          this.processingMemories.delete(memoryId);
        }
      } catch (error) {
        logger.warn('Discovery queue processing failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Queue memory for entanglement discovery
   */
  queueForDiscovery(memoryId: string, userId: number): void {
    this.discoveryQueue.add(`${memoryId}:${userId}`);
    logger.info('Memory queued for entanglement discovery', { memoryId, userId });
  }

  /**
   * Get entanglements for a memory
   */
  async getMemoryEntanglements(memoryId: string): Promise<MemoryEntanglement[]> {
    const session = this.memoryGraph['neo4jDriver'].session();

    try {
      const result = await session.run(
        `
        MATCH (m:Memory {id: $memoryId})-[r:ENTANGLED_WITH]-(other:Memory)
        RETURN r, other
        ORDER BY r.strength DESC, r.confidence DESC
      `,
        {
          memoryId: `memory-${memoryId}`,
        }
      );

      return result.records.map(record => {
        const rel = record.get('r');
        const other = record.get('other');

        return {
          id: rel.properties.id,
          memoryA: memoryId,
          memoryB: other.properties.sqliteId,
          type: rel.properties.type,
          strength: rel.properties.strength,
          confidence: rel.properties.confidence,
          metadata: {
            reason: rel.properties.reason,
          },
          bidirectional: true,
          createdAt: new Date(rel.properties.createdAt),
          lastAccessed: new Date(rel.properties.lastAccessed),
          accessCount: rel.properties.accessCount || 0,
        };
      });
    } catch (error) {
      logger.error('Failed to get memory entanglements', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Traverse memory graph starting from a memory
   */
  async traverseMemoryGraph(
    memoryId: string,
    depth: number = 2,
    filters?: {
      minStrength?: number;
      types?: EntanglementType[];
    }
  ): Promise<any> {
    const session = this.memoryGraph['neo4jDriver'].session();

    try {
      const whereClause = filters
        ? `
        WHERE r.strength >= ${filters.minStrength || 0}
        ${filters.types ? `AND r.type IN [${filters.types.map(t => `'${t}'`).join(',')}]` : ''}
      `
        : '';

      const result = await session.run(
        `
        MATCH path = (start:Memory {id: $memoryId})-[r:ENTANGLED_WITH*1..${depth}]-(connected:Memory)
        ${whereClause}
        RETURN path
        LIMIT 100
      `,
        {
          memoryId: `memory-${memoryId}`,
        }
      );

      // Build graph structure
      const nodes = new Map();
      const edges: Array<{
        source: any;
        target: any;
        type: string;
        strength: number;
      }> = [];

      result.records.forEach(record => {
        const path = record.get('path');

        // Add nodes
        path.nodes.forEach((node: any) => {
          if (!nodes.has(node.properties.id)) {
            nodes.set(node.properties.id, {
              id: node.properties.sqliteId,
              title: node.properties.title,
              timestamp: node.properties.timestamp,
              significance: node.properties.significance,
            });
          }
        });

        // Add edges
        path.relationships.forEach((rel: any) => {
          edges.push({
            source: rel.start,
            target: rel.end,
            type: rel.properties.type,
            strength: rel.properties.strength,
          });
        });
      });

      return {
        nodes: Array.from(nodes.values()),
        edges,
        rootMemoryId: memoryId,
      };
    } catch (error) {
      logger.error('Failed to traverse memory graph', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Shutdown the engine
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Entanglement Engine...');

    // Clear queues
    this.discoveryQueue.clear();
    this.processingMemories.clear();

    // Remove all listeners
    this.removeAllListeners();

    this.isInitialized = false;
    logger.info('Entanglement Engine shutdown complete');
  }
}
