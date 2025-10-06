/**
 * Vector Client - Qdrant Integration
 * 
 * Qdrant vector database ile entegrasyon sağlar.
 * Local Qdrant instance kullanır.
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

export class VectorClient {
  private baseUrl: string;
  private collectionName: string = 'documents';
  private isInitialized: boolean = false;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Initialize vector database connection
   */
  async initialize(): Promise<void> {
    try {
      console.log(`🔗 Connecting to Qdrant at ${this.baseUrl}...`);
      
      // Test connection
      const response = await fetch(`${this.baseUrl}/collections`);
      if (!response.ok) {
        throw new Error(`Qdrant connection failed: ${response.status} ${response.statusText}`);
      }

      // Create collection if it doesn't exist
      await this.ensureCollection();
      
      this.isInitialized = true;
      console.log('✅ Vector database initialized');
    } catch (error) {
      console.error('❌ Failed to initialize vector database:', error);
      throw error;
    }
  }

  /**
   * Ensure collection exists
   */
  private async ensureCollection(): Promise<void> {
    try {
      // Check if collection exists
      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}`);
      
      if (response.status === 404) {
        // Collection doesn't exist, create it
        await this.createCollection();
      } else if (!response.ok) {
        throw new Error(`Failed to check collection: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Failed to ensure collection:', error);
      throw error;
    }
  }

  /**
   * Create collection with proper configuration
   */
  private async createCollection(): Promise<void> {
    try {
      console.log(`📁 Creating collection: ${this.collectionName}`);
      
      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vectors: {
            size: 1024, // BGE-M3 embedding dimension
            distance: 'Cosine'
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create collection: ${response.status} - ${errorText}`);
      }

      console.log('✅ Collection created successfully');
    } catch (error) {
      console.error('❌ Failed to create collection:', error);
      throw error;
    }
  }

  /**
   * Upsert vector point
   */
  async upsert(point: VectorPoint): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Vector client not initialized');
    }

    try {
      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          points: [{
            id: point.id,
            vector: point.vector,
            payload: point.metadata
          }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upsert point: ${response.status} - ${errorText}`);
      }
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
      throw new Error('Vector client not initialized');
    }

    if (points.length === 0) {
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          points: points.map(point => ({
            id: point.id,
            vector: point.vector,
            payload: point.metadata
          }))
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to batch upsert points: ${response.status} - ${errorText}`);
      }

      console.log(`✅ Batch upserted ${points.length} points`);
    } catch (error) {
      console.error('❌ Failed to batch upsert vector points:', error);
      throw error;
    }
  }

  /**
   * Search similar vectors
   */
  async search(queryVector: number[], limit: number = 4, scoreThreshold: number = 0.7): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      throw new Error('Vector client not initialized');
    }

    try {
      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vector: queryVector,
          limit: limit,
          with_payload: true,
          score_threshold: scoreThreshold
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to search vectors: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      return data.result.map((item: any) => ({
        id: item.id,
        score: item.score,
        metadata: item.payload
      }));
    } catch (error) {
      console.error('❌ Failed to search vectors:', error);
      throw error;
    }
  }

  /**
   * Delete vector point
   */
  async delete(id: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Vector client not initialized');
    }

    try {
      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          points: [id]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete point: ${response.status} - ${errorText}`);
      }
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
      throw new Error('Vector client not initialized');
    }

    try {
      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get collection info: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get collection info:', error);
      throw error;
    }
  }

  /**
   * Clear all vectors
   */
  async clearAll(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Vector client not initialized');
    }

    try {
      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filter: {
            must: []
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to clear collection: ${response.status} - ${errorText}`);
      }

      console.log('✅ Collection cleared');
    } catch (error) {
      console.error('❌ Failed to clear collection:', error);
      throw error;
    }
  }
}
