/**
 * Document Migrator - Migrate existing documents to normalized schema
 * 
 * This tool helps migrate documents that were processed before
 * the semantic classification feature was added.
 */

import { DocumentIngestPipeline } from './documentIngestPipeline';
import { RawDocument } from './documentNormalizer';
import { LocalRetrievalClient } from './localRetrievalClient';

export interface MigrationResult {
  total: number;
  migrated: number;
  failed: number;
  skipped: number;
  errors: Array<{ documentId: string; error: string }>;
}

export class DocumentMigrator {
  private pipeline: DocumentIngestPipeline;
  private retrievalClient: LocalRetrievalClient;

  constructor() {
    this.pipeline = new DocumentIngestPipeline();
    this.retrievalClient = new LocalRetrievalClient();
  }

  /**
   * Migrate documents from persistent storage
   * This reads documents that don't have normalized metadata and processes them
   */
  async migrateStoredDocuments(): Promise<MigrationResult> {
    console.log('🔄 Starting document migration...');

    const result: MigrationResult = {
      total: 0,
      migrated: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // Get all stored documents
      const storedDocs = this.retrievalClient.getStoredDocuments();
      result.total = storedDocs.length;

      console.log(`📦 Found ${storedDocs.length} documents to process`);

      for (const doc of storedDocs) {
        try {
          // Check if document already has normalized metadata
          if (doc.metadata?.type && doc.metadata?.confidence !== undefined) {
            console.log(`⏭️ Skipping already normalized document: ${doc.filename}`);
            result.skipped++;
            continue;
          }

          console.log(`🔍 Migrating document: ${doc.filename}`);

          // Create raw document for pipeline
          const rawDoc: RawDocument = {
            id: doc.id,
            filename: doc.filename,
            filePath: doc.metadata?.filePath || doc.filename,
            content: doc.content || '',
            metadata: doc.metadata || {},
          };

          // Run through ingest pipeline
          const ingestResult = await this.pipeline.ingest(rawDoc, {
            generateSummary: true,
            skipEmbedding: false, // Generate new embeddings
          });

          if (ingestResult.success && ingestResult.document) {
            // Store normalized document
            await this.retrievalClient.storeNormalizedDocument(ingestResult.document);
            
            console.log(`✅ Migrated: ${doc.filename}`);
            console.log(`   📄 Type: ${ingestResult.document.type}`);
            console.log(`   📊 Confidence: ${ingestResult.document.confidence.classification.toFixed(2)}`);
            
            result.migrated++;
          } else {
            throw new Error(ingestResult.error || 'Migration failed');
          }
        } catch (error) {
          console.error(`❌ Failed to migrate ${doc.filename}:`, error);
          result.failed++;
          result.errors.push({
            documentId: doc.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      console.log('✅ Migration completed:', result);
      return result;

    } catch (error) {
      console.error('❌ Migration process failed:', error);
      throw error;
    }
  }

  /**
   * Migrate a single document by ID
   */
  async migrateSingleDocument(documentId: string): Promise<boolean> {
    console.log(`🔍 Migrating single document: ${documentId}`);

    try {
      const storedDocs = this.retrievalClient.getStoredDocuments();
      const doc = storedDocs.find(d => d.id === documentId);

      if (!doc) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Check if already normalized
      if (doc.metadata?.type && doc.metadata?.confidence !== undefined) {
        console.log('⏭️ Document already normalized');
        return true;
      }

      // Create raw document
      const rawDoc: RawDocument = {
        id: doc.id,
        filename: doc.filename,
        filePath: doc.metadata?.filePath || doc.filename,
        content: doc.content || '',
        metadata: doc.metadata || {},
      };

      // Run through pipeline
      const ingestResult = await this.pipeline.ingest(rawDoc, {
        generateSummary: true,
        skipEmbedding: false,
      });

      if (ingestResult.success && ingestResult.document) {
        await this.retrievalClient.storeNormalizedDocument(ingestResult.document);
        console.log(`✅ Document migrated: ${doc.filename}`);
        return true;
      }

      throw new Error(ingestResult.error || 'Migration failed');

    } catch (error) {
      console.error('❌ Single document migration failed:', error);
      return false;
    }
  }

  /**
   * Get migration status
   */
  getMigrationStatus(): {
    total: number;
    normalized: number;
    needsMigration: number;
  } {
    const storedDocs = this.retrievalClient.getStoredDocuments();
    const normalized = storedDocs.filter(
      d => d.metadata?.type && d.metadata?.confidence !== undefined
    ).length;

    return {
      total: storedDocs.length,
      normalized,
      needsMigration: storedDocs.length - normalized,
    };
  }
}

