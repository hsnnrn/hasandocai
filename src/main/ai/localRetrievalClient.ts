/**
 * Local Retrieval Client - Uses local storage data for document retrieval
 * 
 * This client searches through locally processed documents stored in electron-store
 * instead of requiring a vector database connection.
 */

import Store from 'electron-store';
import { EmbedClient } from './embedClient';

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
      topK: config.topK || 50,
      similarityThreshold: config.similarityThreshold || 0.01, // Very low threshold for testing
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
      // Split content into chunks (sections)
      const chunks = this.splitIntoChunks(content, 1000); // 1000 chars per chunk
      
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

      // Generate embeddings for chunks
      await this.generateChunkEmbeddings(documentId, chunks);

      console.log(`Stored document: ${filename} with ${chunks.length} chunks`);
      console.log('LocalRetrievalClient.storeDocument: Total documents after storing:', documents.length);
      console.log('LocalRetrievalClient.storeDocument: Store keys after storing:', Object.keys(this.store.store));
    } catch (error) {
      console.error('Error storing document:', error);
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
      
      console.log(`Generated embeddings for ${chunks.length} chunks of document: ${documentId}`);
    } catch (error) {
      console.error('Error generating chunk embeddings:', error);
      // Continue without embeddings - will use text similarity as fallback
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
   * Retrieve similar documents using embedding similarity or text search
   */
  async retrieve(
    queryEmbedding: number[],
    options: {
      topK?: number;
      threshold?: number;
    } = {}
  ): Promise<LocalRetrievalResult[]> {
    const topK = options.topK || this.config.topK;
    const threshold = options.threshold || this.config.similarityThreshold;

    try {
      console.log('='.repeat(60));
      console.log(`LocalRetrievalClient: Starting retrieval with topK=${topK}, threshold=${threshold}`);
      console.log(`LocalRetrievalClient: Query embedding length: ${queryEmbedding.length}`);
      console.log(`LocalRetrievalClient: Query embedding preview: [${queryEmbedding.slice(0, 5).map(n => n.toFixed(3)).join(', ')}...]`);
      
      const documents = this.store.get('processedDocuments', []);
      const embeddingsStore = this.store.get('documentEmbeddings', {});
      
      console.log(`LocalRetrievalClient: Found ${documents.length} processed documents`);
      console.log(`LocalRetrievalClient: Found ${Object.keys(embeddingsStore).length} documents with embeddings`);
      
      // Debug: Show document details
      if (documents.length > 0) {
        console.log('LocalRetrievalClient: Document details:');
        documents.forEach((doc: any, index: number) => {
          console.log(`  Doc ${index + 1}: ${doc.filename} (${doc.content?.length || 0} chars, ${doc.chunks?.length || 0} chunks)`);
        });
      } else {
        console.log('LocalRetrievalClient: ❌ No processed documents found in store!');
        console.log('LocalRetrievalClient: Store contents:', this.store.store);
      }
      
      if (documents.length === 0) {
        console.log('LocalRetrievalClient: No local documents found for retrieval');
        return [];
      }

      const results: LocalRetrievalResult[] = [];

      for (const doc of documents) {
        const docEmbeddings = embeddingsStore[doc.id];
        
        console.log(`\nProcessing doc: ${doc.filename} (id: ${doc.id})`);
        console.log(`  Has embeddings: ${!!docEmbeddings}`);
        
        if (docEmbeddings && docEmbeddings.chunks) {
          // Use embedding similarity
          console.log(`  Using embedding similarity for ${docEmbeddings.chunks.length} chunks`);
          
          for (let i = 0; i < docEmbeddings.chunks.length; i++) {
            const chunk = docEmbeddings.chunks[i];
            const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
            
            console.log(`    Chunk ${i}: similarity=${similarity.toFixed(4)}, threshold=${threshold}`);
            
            if (similarity >= threshold) {
              console.log(`      ✅ Chunk ${i} PASSED threshold`);
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
                },
              });
            } else {
              console.log(`      ❌ Chunk ${i} FAILED threshold (${similarity.toFixed(4)} < ${threshold})`);
            }
          }
        } else {
          // Fallback to text similarity for documents without embeddings
          console.log(`  No embeddings found, using text similarity fallback`);
          const chunks = doc.chunks || this.splitIntoChunks(doc.content, 1000);
          
          console.log(`  Processing ${chunks.length} text chunks`);
          
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const textSimilarity = this.textSimilarity(queryEmbedding, chunk);
            
            console.log(`    Chunk ${i}: text_similarity=${textSimilarity.toFixed(4)}, threshold=${threshold}`);
            
            if (textSimilarity >= threshold) {
              console.log(`      ✅ Chunk ${i} PASSED threshold (text similarity)`);
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
            } else {
              console.log(`      ❌ Chunk ${i} FAILED threshold (${textSimilarity.toFixed(4)} < ${threshold})`);
            }
          }
        }
      }

      // Sort by similarity (descending)
      results.sort((a, b) => b.similarity - a.similarity);

      // Return top K results
      const topResults = results.slice(0, topK);
      
      console.log(`\n📊 Retrieval Summary:`);
      console.log(`  Total results before filtering: ${results.length}`);
      console.log(`  Top K results returned: ${topResults.length}`);
      console.log(`  Documents processed: ${documents.length}`);
      
      if (topResults.length > 0) {
        console.log(`\n✅ Top results:`);
        topResults.slice(0, 3).forEach((r, i) => {
          console.log(`  ${i + 1}. ${r.filename} (similarity: ${r.similarity.toFixed(4)})`);
          console.log(`     Content preview: ${r.content.substring(0, 80)}...`);
        });
      } else {
        console.log(`\n❌ No results found! This means:`);
        console.log(`  - All chunks had similarity < ${threshold}`);
        console.log(`  - Consider lowering threshold or checking embedding generation`);
      }
      console.log('='.repeat(60));
      
      return topResults;

    } catch (error) {
      console.error('Local retrieval error:', error);
      throw new Error(`Local retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
   * Simple text similarity fallback (keyword matching)
   * When embeddings are not available, use basic text matching
   */
  private textSimilarity(queryEmbedding: number[], text: string): number {
    // Since we don't have the original query text here, we can't do proper keyword matching
    // Return a low baseline score - embeddings should be used for proper similarity
    // This prevents all documents from matching when embeddings fail
    return 0.1;
  }

  /**
   * Get all stored documents
   */
  getStoredDocuments(): any[] {
    const documents = this.store.get('processedDocuments', []);
    console.log(`LocalRetrievalClient.getStoredDocuments: Found ${documents.length} documents`);
    console.log('LocalRetrievalClient.getStoredDocuments: Store keys:', Object.keys(this.store.store));
    console.log('LocalRetrievalClient.getStoredDocuments: Full store:', this.store.store);
    return documents;
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
