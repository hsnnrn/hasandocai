/**
 * Embedding Client - BGE-M3 Integration
 * 
 * Mevcut BGE-M3 kullanımını korur ve RAG için embedding işlemlerini yönetir.
 */

import { embedTexts } from '../bgeClient';

export class EmbeddingClient {
  private isHealthy: boolean = false;

  constructor() {
    this.checkHealth();
  }

  /**
   * Check BGE-M3 model server health
   */
  private async checkHealth(): Promise<void> {
    try {
      // Mevcut BGE-M3 health check'i kullan
      const { checkModelServerHealth } = await import('../bgeClient');
      const health = await checkModelServerHealth();
      this.isHealthy = health.modelLoaded;
      
      if (this.isHealthy) {
        console.log('✅ BGE-M3 embedding service is healthy');
      } else {
        console.warn('⚠️ BGE-M3 embedding service is not ready');
      }
    } catch (error) {
      console.error('❌ BGE-M3 health check failed:', error);
      this.isHealthy = false;
    }
  }

  /**
   * Get embedding for a single text
   */
  async getEmbedding(text: string): Promise<number[]> {
    if (!this.isHealthy) {
      await this.checkHealth();
      if (!this.isHealthy) {
        throw new Error('BGE-M3 embedding service is not available');
      }
    }

    try {
      // Mevcut BGE-M3 embedTexts fonksiyonunu kullan
      const embeddings = await embedTexts([text]);
      
      if (!embeddings || embeddings.length === 0) {
        throw new Error('Failed to generate embedding');
      }

      return embeddings[0];
    } catch (error) {
      console.error('❌ Failed to get embedding:', error);
      throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get embeddings for multiple texts (batch processing)
   */
  async getEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.isHealthy) {
      await this.checkHealth();
      if (!this.isHealthy) {
        throw new Error('BGE-M3 embedding service is not available');
      }
    }

    try {
      // Mevcut BGE-M3 embedTexts fonksiyonunu kullan
      const embeddings = await embedTexts(texts);
      
      if (!embeddings || embeddings.length !== texts.length) {
        throw new Error('Failed to generate embeddings for all texts');
      }

      return embeddings;
    } catch (error) {
      console.error('❌ Failed to get embeddings:', error);
      throw new Error(`Batch embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if embedding service is available
   */
  isAvailable(): boolean {
    return this.isHealthy;
  }

  /**
   * Get embedding dimension
   */
  getDimension(): number {
    return 1024; // BGE-M3 embedding dimension
  }
}

