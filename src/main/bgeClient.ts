/**
 * BGE-M3 Embedding Client for Electron Main Process
 * 
 * This module handles communication with the local BGE-M3 model server
 * and integration with Supabase for storing embeddings.
 * 
 * Placeholders to replace:
 * - <SUPABASE_URL>: Your Supabase project URL
 * - <SERVICE_ROLE_KEY>: Your Supabase service role key (store securely)
 * - <MODEL_SERVER_URL>: BGE-M3 model server URL (default: http://127.0.0.1:7860)
 * - <EMBEDDING_DIMENSION>: BGE-M3 embedding dimension (default: 1024)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Types
export interface EmbeddingRequest {
  texts: string[];
  batchSize?: number;
  normalize?: boolean;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  modelInfo: {
    modelName: string;
    device: string;
    embeddingDim: number;
    processingTime: number;
    textCount: number;
  };
}

export interface HealthResponse {
  status: string;
  device: string;
  modelLoaded: boolean;
  modelInfo: {
    modelName: string;
    embeddingDim: number;
    device: string;
  };
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  source?: string;
  createdAt?: Date;
  tags?: string[];
  [key: string]: any;
}

export interface IndexDocumentRequest {
  projectRef: string;
  content: string;
  metadata?: DocumentMetadata;
}

export interface IndexDocumentResponse {
  success: boolean;
  documentId?: string;
  error?: string;
  embeddingCount?: number;
}

// Configuration
const CONFIG = {
  MODEL_SERVER_URL: process.env.MODEL_SERVER_URL || 'http://127.0.0.1:7860',
  SUPABASE_URL: process.env.SUPABASE_URL || '<SUPABASE_URL>',
  SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '<SERVICE_ROLE_KEY>',
  EMBEDDING_DIMENSION: 1024,
  REQUEST_TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 2,
  BATCH_SIZE: 64
};

// Global Supabase client
let supabaseClient: SupabaseClient | null = null;

/**
 * Initialize Supabase client with service role key
 */
export function initializeSupabase(): void {
  if (!CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL === '<SUPABASE_URL>') {
    throw new Error('SUPABASE_URL not configured. Please set SUPABASE_URL environment variable.');
  }
  
  if (!CONFIG.SERVICE_ROLE_KEY || CONFIG.SERVICE_ROLE_KEY === '<SERVICE_ROLE_KEY>') {
    throw new Error('SERVICE_ROLE_KEY not configured. Please set SUPABASE_SERVICE_ROLE_KEY environment variable.');
  }

  supabaseClient = createClient(CONFIG.SUPABASE_URL, CONFIG.SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('Supabase client initialized with service role key');
}

/**
 * Check if BGE-M3 model server is healthy
 */
export async function checkModelServerHealth(): Promise<HealthResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${CONFIG.MODEL_SERVER_URL}/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Model server health check failed: ${response.status} ${response.statusText}`);
    }

    const healthData = await response.json() as HealthResponse;
    return healthData;
  } catch (error) {
    console.error('Model server health check failed:', error);
    throw new Error(`Cannot connect to model server at ${CONFIG.MODEL_SERVER_URL}. Make sure the server is running.`);
  }
}

/**
 * Generate embeddings for texts using BGE-M3 model server
 */
export async function embedTexts(
  texts: string[], 
  options: { batchSize?: number; normalize?: boolean } = {}
): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    throw new Error('No texts provided for embedding');
  }

  if (texts.length > CONFIG.BATCH_SIZE) {
    throw new Error(`Too many texts. Maximum allowed: ${CONFIG.BATCH_SIZE}`);
  }

  const requestBody: EmbeddingRequest = {
    texts,
    batchSize: options.batchSize || CONFIG.BATCH_SIZE,
    normalize: options.normalize !== false
  };

  let lastError: Error | null = null;

  // Retry logic
  for (let attempt = 0; attempt <= CONFIG.MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);
      
      const response = await fetch(`${CONFIG.MODEL_SERVER_URL}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Model server request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as EmbeddingResponse;
      
      // Validate embeddings
      if (!result.embeddings || result.embeddings.length !== texts.length) {
        throw new Error('Invalid embedding response: length mismatch');
      }

      // Validate embedding dimensions
      const firstEmbedding = result.embeddings[0];
      if (!firstEmbedding || firstEmbedding.length !== CONFIG.EMBEDDING_DIMENSION) {
        throw new Error(`Invalid embedding dimension: expected ${CONFIG.EMBEDDING_DIMENSION}, got ${firstEmbedding?.length || 0}`);
      }

      console.log(`Generated embeddings for ${texts.length} texts using ${result.modelInfo.device}`);
      return result.embeddings;

    } catch (error) {
      lastError = error as Error;
      console.warn(`Embedding attempt ${attempt + 1} failed:`, error);
      
      if (attempt < CONFIG.MAX_RETRIES) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw new Error(`Failed to generate embeddings after ${CONFIG.MAX_RETRIES + 1} attempts. Last error: ${lastError?.message}`);
}

/**
 * Index document to Supabase with embeddings
 */
export async function indexDocumentToSupabase(
  projectRef: string,
  content: string,
  embedding: number[],
  metadata: DocumentMetadata = {}
): Promise<IndexDocumentResponse> {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized. Call initializeSupabase() first.');
  }

  if (!embedding || embedding.length !== CONFIG.EMBEDDING_DIMENSION) {
    throw new Error(`Invalid embedding dimension: expected ${CONFIG.EMBEDDING_DIMENSION}, got ${embedding?.length || 0}`);
  }

  try {
    const documentData = {
      project_ref: projectRef,
      content: content,
      embedding: embedding,
      metadata: metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseClient
      .from('documents')
      .insert([documentData])
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw new Error(`Failed to insert document: ${error.message}`);
    }

    console.log(`Document indexed successfully with ID: ${data.id}`);
    return {
      success: true,
      documentId: data.id,
      embeddingCount: 1
    };

  } catch (error) {
    console.error('Error indexing document to Supabase:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Process and index a document with automatic embedding generation
 */
export async function processAndIndexDocument(
  request: IndexDocumentRequest
): Promise<IndexDocumentResponse> {
  try {
    console.log(`Processing document for project: ${request.projectRef}`);

    // Check model server health first
    const health = await checkModelServerHealth();
    if (!health.modelLoaded) {
      throw new Error('Model server is not ready. Model not loaded.');
    }

    // Generate embedding for the content
    const embeddings = await embedTexts([request.content]);
    const embedding = embeddings[0];

    // Index to Supabase
    const result = await indexDocumentToSupabase(
      request.projectRef,
      request.content,
      embedding,
      request.metadata
    );

    return result;

  } catch (error) {
    console.error('Error processing and indexing document:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Batch process multiple documents
 */
export async function batchProcessDocuments(
  projectRef: string,
  documents: Array<{ content: string; metadata?: DocumentMetadata }>
): Promise<IndexDocumentResponse> {
  try {
    console.log(`Batch processing ${documents.length} documents for project: ${projectRef}`);

    // Check model server health
    const health = await checkModelServerHealth();
    if (!health.modelLoaded) {
      throw new Error('Model server is not ready. Model not loaded.');
    }

    // Extract all texts for batch embedding
    const texts = documents.map(doc => doc.content);
    
    // Generate embeddings in batch
    const embeddings = await embedTexts(texts);

    // Insert all documents to Supabase
    if (!supabaseClient) {
      throw new Error('Supabase client not initialized');
    }

    const documentData = documents.map((doc, index) => ({
      project_ref: projectRef,
      content: doc.content,
      embedding: embeddings[index],
      metadata: doc.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabaseClient
      .from('documents')
      .insert(documentData)
      .select('id');

    if (error) {
      throw new Error(`Failed to insert documents: ${error.message}`);
    }

    console.log(`Batch indexed ${documents.length} documents successfully`);
    return {
      success: true,
      documentId: data.map(d => d.id).join(','),
      embeddingCount: documents.length
    };

  } catch (error) {
    console.error('Error batch processing documents:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get configuration info for debugging
 */
export function getConfig() {
  return {
    modelServerUrl: CONFIG.MODEL_SERVER_URL,
    supabaseUrl: CONFIG.SUPABASE_URL,
    embeddingDimension: CONFIG.EMBEDDING_DIMENSION,
    maxBatchSize: CONFIG.BATCH_SIZE,
    requestTimeout: CONFIG.REQUEST_TIMEOUT,
    maxRetries: CONFIG.MAX_RETRIES
  };
}
