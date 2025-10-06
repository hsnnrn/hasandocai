/**
 * Mock Vector Client - Development/Testing
 * 
 * Qdrant olmadan test için basit in-memory vector storage
 */

export interface VectorPoint {
  id: string;
  vector: number[];
  metadata: any;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: any;
}

export class MockVectorClient {
  private collectionName: string = 'documents';
  private vectors: Map<string, VectorPoint> = new Map();
  private isInitialized: boolean = false;

  constructor(baseUrl: string) {
    console.log('🔧 Using Mock Vector Client for development');
  }

  /**
   * Initialize mock vector client
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing Mock Vector Client...');
      this.isInitialized = true;
      console.log('✅ Mock Vector Client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Mock Vector Client:', error);
      throw error;
    }
  }

  /**
   * Upsert vector point
   */
  async upsert(point: VectorPoint): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Mock Vector Client not initialized');
    }

    try {
      this.vectors.set(point.id, point);
      console.log(`📝 Mock: Upserted vector point ${point.id}`);
    } catch (error) {
      console.error('❌ Failed to upsert vector point:', error);
      throw error;
    }
  }

  /**
   * Batch upsert vector points
   */
  async batchUpsert(points: VectorPoint[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Mock Vector Client not initialized');
    }

    if (points.length === 0) {
      return;
    }

    try {
      for (const point of points) {
        this.vectors.set(point.id, point);
      }
      console.log(`📝 Mock: Batch upserted ${points.length} points`);
    } catch (error) {
      console.error('❌ Failed to batch upsert vector points:', error);
      throw error;
    }
  }

  /**
   * Search similar vectors (simple cosine similarity)
   */
  async search(queryVector: number[], limit: number = 4, scoreThreshold: number = 0.7): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      throw new Error('Mock Vector Client not initialized');
    }

    try {
      const results: SearchResult[] = [];

      for (const [id, point] of this.vectors) {
        const similarity = this.cosineSimilarity(queryVector, point.vector);
        
        if (similarity >= scoreThreshold) {
          results.push({
            id: point.id,
            score: similarity,
            metadata: point.metadata
          });
        }
      }

      // Sort by score and limit results
      results.sort((a, b) => b.score - a.score);
      return results.slice(0, limit);
    } catch (error) {
      console.error('❌ Failed to search vectors:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Delete vector point
   */
  async delete(id: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Mock Vector Client not initialized');
    }

    try {
      this.vectors.delete(id);
      console.log(`🗑️ Mock: Deleted vector point ${id}`);
    } catch (error) {
      console.error('❌ Failed to delete vector point:', error);
      throw error;
    }
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Mock Vector Client not initialized');
    }

    return {
      name: this.collectionName,
      vectors_count: this.vectors.size,
      status: 'green'
    };
  }

  /**
   * Clear all vectors
   */
  async clearAll(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Mock Vector Client not initialized');
    }

    try {
      this.vectors.clear();
      console.log('🗑️ Mock: Cleared all vectors');
    } catch (error) {
      console.error('❌ Failed to clear vectors:', error);
      throw error;
    }
  }
}
