/**
 * Mock Embedding Client - Development/Testing
 * 
 * BGE-M3 olmadan test için basit mock embeddings
 */

export class MockEmbeddingClient {
  private isHealthy: boolean = false;

  constructor() {
    this.checkHealth();
  }

  /**
   * Check mock embedding service health
   */
  private async checkHealth(): Promise<void> {
    try {
      console.log('🔧 Mock BGE-M3 embedding service is healthy');
      this.isHealthy = true;
    } catch (error) {
      console.error('❌ Mock BGE-M3 health check failed:', error);
      this.isHealthy = false;
    }
  }

  /**
   * Get mock embedding for a single text
   */
  async getEmbedding(text: string): Promise<number[]> {
    if (!this.isHealthy) {
      await this.checkHealth();
      if (!this.isHealthy) {
        throw new Error('Mock BGE-M3 embedding service is not available');
      }
    }

    try {
      // Generate deterministic mock embedding based on text
      const embedding = this.generateMockEmbedding(text);
      console.log(`🔧 Mock: Generated embedding for text (${text.length} chars)`);
      return embedding;
    } catch (error) {
      console.error('❌ Mock: Failed to get embedding:', error);
      throw new Error(`Mock embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get mock embeddings for multiple texts (batch processing)
   */
  async getEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.isHealthy) {
      await this.checkHealth();
      if (!this.isHealthy) {
        throw new Error('Mock BGE-M3 embedding service is not available');
      }
    }

    try {
      const embeddings = texts.map(text => this.generateMockEmbedding(text));
      console.log(`🔧 Mock: Generated ${embeddings.length} embeddings`);
      return embeddings;
    } catch (error) {
      console.error('❌ Mock: Failed to get embeddings:', error);
      throw new Error(`Mock batch embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate deterministic mock embedding
   */
  private generateMockEmbedding(text: string): number[] {
    // Create a deterministic embedding based on text content
    const embedding = new Array(1024).fill(0);
    
    // Use text hash to create deterministic values
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Fill embedding with deterministic values
    for (let i = 0; i < 1024; i++) {
      const seed = (hash + i) % 1000;
      embedding[i] = (Math.sin(seed) + 1) / 2; // Normalize to 0-1
    }
    
    return embedding;
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
