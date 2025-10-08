/**
 * Retrieval Client - Vector similarity search for Supabase pgvector or Qdrant
 * 
 * Supports both vector database backends via environment variable
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getTokenStorage } from '../store';

export interface RetrievalResult {
  sectionId: string;
  documentId: string;
  filename: string;
  content: string;
  similarity: number;
  metadata?: {
    pageNumber?: number;
    sectionTitle?: string;
    contentType?: string;
  };
}

export interface RetrievalConfig {
  vectorDb: 'pgvector' | 'qdrant';
  supabaseUrl?: string;
  supabaseKey?: string;
  qdrantUrl?: string;
  qdrantApiKey?: string;
  topK: number;
  similarityThreshold: number;
}

export class RetrievalClient {
  private config: RetrievalConfig;
  private supabase: SupabaseClient | null = null;

  constructor(config: Partial<RetrievalConfig> = {}) {
    this.config = {
      vectorDb: (config.vectorDb || process.env.VECTOR_DB || 'pgvector') as 'pgvector' | 'qdrant',
      supabaseUrl: config.supabaseUrl || process.env.SUPABASE_URL,
      supabaseKey: config.supabaseKey || process.env.SUPABASE_ANON_KEY,
      qdrantUrl: config.qdrantUrl || process.env.QDRANT_URL || 'http://localhost:6333',
      qdrantApiKey: config.qdrantApiKey || process.env.QDRANT_API_KEY,
      topK: config.topK || parseInt(process.env.TOP_K || '50', 10),
      similarityThreshold: config.similarityThreshold || 0.15,
    };

    if (this.config.vectorDb === 'pgvector') {
      // Initialize async
      this.initializeSupabase().catch(err => {
        console.error('Failed to initialize Supabase:', err);
      });
    }
  }

  /**
   * Initialize Supabase client
   */
  private async initializeSupabase(): Promise<void> {
    // Try to get credentials from OAuth token storage first
    try {
      const tokenStorage = getTokenStorage();
      const authInfo = await tokenStorage.getAuthInfo();
      
      if (authInfo?.selectedProject) {
        const project = authInfo.selectedProject;
        const tokens = await tokenStorage.getTokens();
        
        if (!tokens || !tokens.accessToken) {
          throw new Error('No valid access token found');
        }
        
        // Construct Supabase URL from project
        const supabaseUrl = `https://${project.id}.supabase.co`;
        
        // Use access token as the key
        this.supabase = createClient(supabaseUrl, tokens.accessToken, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
        
        console.log(`Supabase retrieval client initialized for project: ${project.name}`);
        return;
      }
    } catch (error) {
      console.warn('Failed to get OAuth credentials, trying environment variables:', error);
    }

    // Fallback to environment variables
    if (!this.config.supabaseUrl || !this.config.supabaseKey) {
      console.warn('Supabase credentials not configured for pgvector');
      return;
    }

    this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('Supabase retrieval client initialized from env vars');
  }

  /**
   * Retrieve similar text sections using pgvector
   */
  private async retrieveWithPgVector(
    queryEmbedding: number[],
    topK: number
  ): Promise<RetrievalResult[]> {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }

    try {
      // Call the match_embeddings function
      const { data, error } = await this.supabase.rpc('match_embeddings', {
        query_embedding: queryEmbedding,
        match_threshold: this.config.similarityThreshold,
        match_count: topK,
      });

      if (error) {
        console.error('pgvector retrieval error:', error);
        throw new Error(`pgvector retrieval failed: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.log('No similar documents found');
        return [];
      }

      // Map results to RetrievalResult format
      return data.map((row: any) => ({
        sectionId: row.section_id || row.id,
        documentId: row.document_id,
        filename: row.filename || 'unknown',
        content: row.content,
        similarity: row.similarity,
        metadata: {
          pageNumber: row.page_number,
          sectionTitle: row.section_title,
          contentType: row.content_type,
        },
      }));
    } catch (error) {
      console.error('pgvector retrieval error:', error);
      throw error;
    }
  }

  /**
   * Retrieve similar text sections using Qdrant
   */
  private async retrieveWithQdrant(
    queryEmbedding: number[],
    topK: number
  ): Promise<RetrievalResult[]> {
    try {
      const payload = {
        vector: queryEmbedding,
        limit: topK,
        score_threshold: this.config.similarityThreshold,
        with_payload: true,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.config.qdrantApiKey) {
        headers['api-key'] = this.config.qdrantApiKey;
      }

      const response = await fetch(`${this.config.qdrantUrl}/collections/documents/points/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Qdrant error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.result || data.result.length === 0) {
        console.log('No similar documents found in Qdrant');
        return [];
      }

      // Map Qdrant results to RetrievalResult format
      return data.result.map((point: any) => ({
        sectionId: point.id,
        documentId: point.payload.document_id,
        filename: point.payload.filename || 'unknown',
        content: point.payload.content,
        similarity: point.score,
        metadata: {
          pageNumber: point.payload.page_number,
          sectionTitle: point.payload.section_title,
          contentType: point.payload.content_type,
        },
      }));
    } catch (error) {
      console.error('Qdrant retrieval error:', error);
      throw error;
    }
  }

  /**
   * Retrieve similar text sections
   */
  async retrieve(
    queryEmbedding: number[],
    options: {
      topK?: number;
      threshold?: number;
    } = {}
  ): Promise<RetrievalResult[]> {
    const topK = options.topK || this.config.topK;
    const threshold = options.threshold || this.config.similarityThreshold;

    // Temporarily override threshold if provided
    const originalThreshold = this.config.similarityThreshold;
    if (threshold !== originalThreshold) {
      this.config.similarityThreshold = threshold;
    }

    try {
      let results: RetrievalResult[];

      if (this.config.vectorDb === 'pgvector') {
        console.log(`Retrieving with pgvector (topK=${topK}, threshold=${threshold})`);
        results = await this.retrieveWithPgVector(queryEmbedding, topK);
      } else {
        console.log(`Retrieving with Qdrant (topK=${topK}, threshold=${threshold})`);
        results = await this.retrieveWithQdrant(queryEmbedding, topK);
      }

      // Additional filtering by threshold (in case DB didn't filter)
      results = results.filter(r => r.similarity >= threshold);

      // Sort by similarity (descending)
      results.sort((a, b) => b.similarity - a.similarity);

      console.log(`Retrieved ${results.length} similar text sections`);
      return results;
    } finally {
      // Restore original threshold
      this.config.similarityThreshold = originalThreshold;
    }
  }

  /**
   * Get configuration info
   */
  getConfig(): RetrievalConfig {
    return { ...this.config };
  }
}

/**
 * SQL function for pgvector (to be created in Supabase)
 * 
 * CREATE OR REPLACE FUNCTION match_embeddings(
 *   query_embedding VECTOR(1024),
 *   match_threshold FLOAT,
 *   match_count INT
 * )
 * RETURNS TABLE (
 *   section_id TEXT,
 *   document_id TEXT,
 *   filename TEXT,
 *   content TEXT,
 *   page_number INT,
 *   section_title TEXT,
 *   content_type TEXT,
 *   similarity FLOAT
 * )
 * LANGUAGE plpgsql
 * AS $$
 * BEGIN
 *   RETURN QUERY
 *   SELECT
 *     ts.id AS section_id,
 *     ts.document_id,
 *     d.filename,
 *     ts.content,
 *     ts.page_number,
 *     ts.section_title,
 *     ts.content_type,
 *     1 - (e.embedding <=> query_embedding) AS similarity
 *   FROM embeddings e
 *   JOIN text_sections ts ON ts.id = e.text_section_id
 *   JOIN documents d ON d.id = ts.document_id
 *   WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
 *   ORDER BY e.embedding <=> query_embedding
 *   LIMIT match_count;
 * END;
 * $$;
 */

