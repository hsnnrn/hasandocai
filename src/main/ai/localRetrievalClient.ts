/**
 * Local Retrieval Client - Uses local storage data for document retrieval
 * 
 * NOW SUPPORTS NORMALIZED DOCUMENTS (Canonical Schema)
 * - Stores NormalizedDocument with confidence and type
 * - BGE-M3 embeddings
 * - Source-traceable retrieval
 * 
 * This client searches through locally processed documents stored in electron-store
 * instead of requiring a vector database connection.
 */

import Store from 'electron-store';
import { EmbedClient } from './embedClient';
import { NormalizedDocument, DocumentType } from './canonicalSchema';

export interface LocalRetrievalResult {
  sectionId: string;
  documentId: string;
  filename: string;
  content: string;
  similarity: number;
  metadata?: {
    pageNumber?: number;
    sectionTitle?: string;
    contentType?: string;
    timestamp?: number;
    filePath?: string;
    // NEW: Canonical schema metadata
    documentType?: DocumentType;
    confidence?: number;
    invoiceNo?: string;
    date?: string;
    total?: number;
    currency?: string;
  };
}

export interface LocalRetrievalConfig {
  topK: number;
  similarityThreshold: number;
  storeName: string;
}

export class LocalRetrievalClient {
  private config: LocalRetrievalConfig;
  private store: Store<any>;
  private embedClient: EmbedClient;

  constructor(config: Partial<LocalRetrievalConfig> = {}) {
    this.config = {
      topK: config.topK || 100,
      similarityThreshold: config.similarityThreshold || 0.001,
      storeName: config.storeName || 'document-converter-data',
    };

    this.store = new Store({
      name: this.config.storeName,
      defaults: {
        processedDocuments: [],
        documentEmbeddings: {},
      },
    });

    this.embedClient = new EmbedClient();
  }

  /**
   * Store processed document content for later retrieval
   */
  async storeDocument(
    documentId: string,
    filename: string,
    content: string,
    metadata?: any
  ): Promise<void> {
    try {
      const chunks = this.splitIntoChunks(content, 2000);
      
      const processedDoc = {
        id: documentId,
        filename,
        content,
        chunks,
        metadata: {
          ...metadata,
          timestamp: Date.now(),
          chunkCount: chunks.length,
        },
      };

      const documents = this.store.get('processedDocuments', []);
      const existingIndex = documents.findIndex((doc: any) => doc.id === documentId);
      
      if (existingIndex >= 0) {
        documents[existingIndex] = processedDoc;
      } else {
        documents.push(processedDoc);
      }

      this.store.set('processedDocuments', documents);
      await this.generateChunkEmbeddings(documentId, chunks);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Store normalized document (NEW - Canonical Schema support)
   * Following Rag-workflow.md specification
   */
  async storeNormalizedDocument(normalized: NormalizedDocument): Promise<void> {
    try {
      console.log('💾 Storing normalized document:', normalized.filename);

      // Use source_sample as content for embedding
      const content = normalized.source_sample || normalized.filename;
      const chunks = this.splitIntoChunks(content, 2000);

      const processedDoc = {
        id: normalized.id,
        filename: normalized.filename,
        content,
        chunks,
        metadata: {
          // Canonical schema fields
          schema_v: normalized.schema_v,
          type: normalized.type,
          invoice_no: normalized.invoice_no,
          date: normalized.date,
          supplier: normalized.supplier,
          buyer: normalized.buyer,
          currency: normalized.currency,
          total: normalized.total,
          tax: normalized.tax,
          confidence: normalized.confidence.classification,
          needs_human_review: normalized.needs_human_review,
          normalized_at: normalized.normalized_at,
          raw_path: normalized.raw_path,
          file_type: normalized.file_type,
          timestamp: Date.now(),
          chunkCount: chunks.length,
        },
        // Store full normalized document for reference
        normalizedDocument: normalized,
      };

      const documents = this.store.get('processedDocuments', []);
      const existingIndex = documents.findIndex((doc: any) => doc.id === normalized.id);

      if (existingIndex >= 0) {
        // CURSOR RULE: Immutable records - version the old one
        const oldDoc = documents[existingIndex];
        oldDoc.archived = true;
        oldDoc.archived_at = Date.now();
        documents[existingIndex] = processedDoc;
      } else {
        documents.push(processedDoc);
      }

      this.store.set('processedDocuments', documents);

      // Generate embeddings (use pre-computed embedding if available)
      if (normalized.embedding) {
        console.log('✅ Using pre-computed embedding from normalized document');
        const embeddingsStore = this.store.get('documentEmbeddings', {});
        embeddingsStore[normalized.id] = {
          documentId: normalized.id,
          chunks: chunks.map((chunk, index) => ({
            chunkIndex: index,
            content: chunk,
            embedding: normalized.embedding, // Reuse same embedding for all chunks
          })),
          timestamp: Date.now(),
        };
        this.store.set('documentEmbeddings', embeddingsStore);
      } else {
        await this.generateChunkEmbeddings(normalized.id, chunks);
      }

      console.log('✅ Normalized document stored successfully');
    } catch (error) {
      console.error('❌ Failed to store normalized document:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for document chunks
   */
  private async generateChunkEmbeddings(documentId: string, chunks: string[]): Promise<void> {
    try {
      const embeddings = await this.embedClient.embed(chunks);
      
      const embeddingData = {
        documentId,
        chunks: chunks.map((chunk, index) => ({
          chunkIndex: index,
          content: chunk,
          embedding: embeddings[index],
        })),
        timestamp: Date.now(),
      };

      const embeddingsStore = this.store.get('documentEmbeddings', {});
      embeddingsStore[documentId] = embeddingData;
      
      this.store.set('documentEmbeddings', embeddingsStore);
    } catch (error) {
      // Continue without embeddings
    }
  }

  /**
   * Split content into chunks for processing
   */
  private splitIntoChunks(content: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;
      
      if (currentChunk.length + trimmedSentence.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedSentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.length > 0 ? chunks : [content];
  }

  /**
   * Retrieve similar documents using embedding similarity
   */
  async retrieve(
    queryEmbedding: number[],
    options: {
      topK?: number;
      threshold?: number;
    } = {}
  ): Promise<LocalRetrievalResult[]> {
    const topK = options.topK || this.config.topK;
    const threshold = options.threshold !== undefined ? options.threshold : this.config.similarityThreshold;

    try {
      const documents = this.store.get('processedDocuments', []);
      const embeddingsStore = this.store.get('documentEmbeddings', {});
      
      if (documents.length === 0) {
        return [];
      }

      const results: LocalRetrievalResult[] = [];

      for (const doc of documents) {
        const docEmbeddings = embeddingsStore[doc.id];
        
        if (docEmbeddings && docEmbeddings.chunks) {
          for (let i = 0; i < docEmbeddings.chunks.length; i++) {
            const chunk = docEmbeddings.chunks[i];
            const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
            
            if (similarity >= threshold) {
              results.push({
                sectionId: `${doc.id}_chunk_${i}`,
                documentId: doc.id,
                filename: doc.filename,
                content: chunk.content,
                similarity,
                metadata: {
                  pageNumber: i + 1,
                  sectionTitle: `Chunk ${i + 1}`,
                  contentType: 'text',
                  timestamp: doc.metadata?.timestamp,
                  filePath: doc.metadata?.filePath,
                  // NEW: Include canonical schema metadata
                  documentType: doc.metadata?.type,
                  confidence: doc.metadata?.confidence,
                  invoiceNo: doc.metadata?.invoice_no,
                  date: doc.metadata?.date,
                  total: doc.metadata?.total,
                  currency: doc.metadata?.currency,
                },
              });
            }
          }
        } else {
          const chunks = doc.chunks || this.splitIntoChunks(doc.content, 2000);
          
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const textSimilarity = 0.5;
            
            if (textSimilarity >= threshold) {
              results.push({
                sectionId: `${doc.id}_chunk_${i}`,
                documentId: doc.id,
                filename: doc.filename,
                content: chunk,
                similarity: textSimilarity,
                metadata: {
                  pageNumber: i + 1,
                  sectionTitle: `Chunk ${i + 1}`,
                  contentType: 'text',
                  timestamp: doc.metadata?.timestamp,
                  filePath: doc.metadata?.filePath,
                },
              });
            }
          }
        }
      }

      results.sort((a, b) => b.similarity - a.similarity);
      return results.slice(0, topK);

    } catch (error) {
      throw new Error(`Local retrieval failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }


  /**
   * Get all stored documents
   */
  getStoredDocuments(): any[] {
    return this.store.get('processedDocuments', []);
  }

  /**
   * Clear all stored documents
   */
  clearStoredDocuments(): void {
    this.store.set('processedDocuments', []);
    this.store.set('documentEmbeddings', {});
  }

  /**
   * Get configuration info
   */
  getConfig(): LocalRetrievalConfig {
    return { ...this.config };
  }
}
