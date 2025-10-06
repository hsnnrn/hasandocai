/**
 * AI Service - RAG Chat Integration
 * 
 * Bu modül BGE-M3 embedding, Qdrant vector database ve Llama-3.2 LLM
 * entegrasyonunu sağlar. Mevcut BGE-M3 kullanımını korur ve RAG chat
 * yetenekleri ekler.
 */

import { app } from 'electron';
import * as path from 'path';
import { EmbeddingClient } from './embeddingClient';
import { VectorClient } from './vectorClient';
import { LLMRunner } from './llmRunner';

export interface AIConfig {
  modelPath: string;
  vectorDbUrl: string;
  embeddingDimension: number;
  maxTokens: number;
  temperature: number;
  topK: number;
}

export interface QueryRequest {
  question: string;
  conversationId?: string;
  maxTokens?: number;
  temperature?: number;
  topK?: number;
}

export interface QueryResponse {
  success: boolean;
  answer?: string;
  sources?: Array<{
    content: string;
    score: number;
    metadata: any;
  }>;
  error?: string;
  processingTime?: number;
}

export interface IndexRequest {
  textSections: Array<{
    id: string;
    content: string;
    metadata?: any;
  }>;
  documentId?: string;
  overwrite?: boolean;
}

export interface IndexResponse {
  success: boolean;
  indexedCount?: number;
  error?: string;
}

class AIService {
  private embeddingClient: EmbeddingClient;
  private vectorClient: VectorClient;
  private llmRunner: LLMRunner;
  private config: AIConfig;
  private isInitialized: boolean = false;

  constructor() {
    this.config = this.getDefaultConfig();
    this.embeddingClient = new EmbeddingClient();
    this.vectorClient = new VectorClient(this.config.vectorDbUrl);
    this.llmRunner = new LLMRunner(this.config.modelPath);
  }

  private getDefaultConfig(): AIConfig {
    const userDataPath = app.getPath('userData');
    
    return {
      modelPath: path.join(userDataPath, 'models', 'llama3.2-1b-q4.gguf'),
      vectorDbUrl: process.env.VECTOR_DB_URL || 'http://127.0.0.1:6333',
      embeddingDimension: 1024, // BGE-M3 dimension
      maxTokens: 512,
      temperature: 0.7,
      topK: 4
    };
  }

  /**
   * Initialize AI services
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🤖 Initializing AI services...');

      // Check if model file exists
      const fs = await import('fs/promises');
      try {
        await fs.access(this.config.modelPath);
        console.log('✅ Model file found:', this.config.modelPath);
      } catch (error) {
        console.warn('⚠️ Model file not found:', this.config.modelPath);
        console.warn('Please download and place the model file as instructed in README');
      }

      // Initialize vector database
      await this.vectorClient.initialize();
      console.log('✅ Vector database initialized');

      // Initialize LLM runner
      await this.llmRunner.initialize();
      console.log('✅ LLM runner initialized');

      this.isInitialized = true;
      console.log('✅ AI services initialized successfully');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to initialize AI services:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Index text sections to vector database
   */
  async indexTextSections(request: IndexRequest): Promise<IndexResponse> {
    try {
      if (!this.isInitialized) {
        throw new Error('AI services not initialized');
      }

      console.log(`📚 Indexing ${request.textSections.length} text sections...`);

      let indexedCount = 0;

      for (const section of request.textSections) {
        try {
          // Generate embedding using BGE-M3
          const embedding = await this.embeddingClient.getEmbedding(section.content);
          
          // Store in vector database
          await this.vectorClient.upsert({
            id: section.id,
            vector: embedding,
            metadata: {
              content: section.content,
              documentId: request.documentId,
              ...section.metadata
            }
          });

          indexedCount++;
        } catch (error) {
          console.error(`Failed to index section ${section.id}:`, error);
        }
      }

      console.log(`✅ Indexed ${indexedCount} text sections`);
      return { success: true, indexedCount };
    } catch (error) {
      console.error('❌ Failed to index text sections:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Process user query with RAG
   */
  async handleQuery(request: QueryRequest): Promise<QueryResponse> {
    try {
      if (!this.isInitialized) {
        throw new Error('AI services not initialized');
      }

      const startTime = Date.now();
      console.log(`🤔 Processing query: ${request.question}`);

      // Generate query embedding
      const queryEmbedding = await this.embeddingClient.getEmbedding(request.question);

      // Search similar chunks
      const topK = request.topK || this.config.topK;
      const similarChunks = await this.vectorClient.search(queryEmbedding, topK);

      if (similarChunks.length === 0) {
        return {
          success: true,
          answer: "Üzgünüm, bu konuda yeterli bilgi bulamadım. Lütfen daha fazla belge yükleyin.",
          sources: [],
          processingTime: Date.now() - startTime
        };
      }

      // Prepare context from chunks
      const context = similarChunks
        .map(chunk => chunk.metadata.content)
        .join('\n\n');

      // Generate prompt
      const prompt = this.buildPrompt(request.question, context);

      // Generate response using LLM
      const maxTokens = request.maxTokens || this.config.maxTokens;
      const temperature = request.temperature || this.config.temperature;
      
      const answer = await this.llmRunner.generateResponse(prompt, {
        maxTokens,
        temperature
      });

      const processingTime = Date.now() - startTime;
      console.log(`✅ Query processed in ${processingTime}ms`);

      return {
        success: true,
        answer,
        sources: similarChunks.map(chunk => ({
          content: chunk.metadata.content,
          score: chunk.score,
          metadata: chunk.metadata
        })),
        processingTime
      };
    } catch (error) {
      console.error('❌ Failed to process query:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Build prompt for LLM
   */
  private buildPrompt(question: string, context: string): string {
    return `Sen bir yardımcı AI asistanısın. Aşağıdaki bağlam bilgilerini kullanarak kullanıcının sorusunu yanıtla.

BAĞLAM:
${context}

SORU: ${question}

YANIT: Bağlam bilgilerine dayanarak kısa ve net bir yanıt ver. Eğer bağlamda yeterli bilgi yoksa bunu belirt.`;
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<{
    initialized: boolean;
    modelPath: string;
    vectorDbUrl: string;
    embeddingDimension: number;
  }> {
    return {
      initialized: this.isInitialized,
      modelPath: this.config.modelPath,
      vectorDbUrl: this.config.vectorDbUrl,
      embeddingDimension: this.config.embeddingDimension
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.llmRunner.cleanup();
      console.log('✅ AI service cleanup completed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}

// Singleton instance
let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}

export { AIService };

