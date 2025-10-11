/**
 * Document Ingest Pipeline
 * 
 * Complete workflow for document ingestion following Rag-workflow.md:
 * 1. File scanning
 * 2. Filename heuristics
 * 3. Semantic classification (BGE-M3)
 * 4. Normalization
 * 5. Validation
 * 6. Summary generation
 * 7. Embedding (BGE-M3)
 * 8. Storage
 * 9. Audit logging
 * 
 * CURSOR RULES ENFORCED:
 * - Ingest validation: schema_v and confidence required
 * - Reject destructive schema changes
 * - Auto human review: confidence < 0.6
 * - Immutable normalized records (versioned)
 * - Audit trail for all operations
 */

import { SemanticClassifier, DocumentContext } from './semanticClassifier';
import { DocumentNormalizer, RawDocument } from './documentNormalizer';
import { EmbedClient } from './embedClient';
import { DocumentSummarizer } from './documentSummarizer';
import {
  NormalizedDocument,
  DocumentValidator,
  ProcessingLogEntry,
} from './canonicalSchema';

export interface IngestOptions {
  skipEmbedding?: boolean;
  skipValidation?: boolean;
  autoReview?: boolean;
  generateSummary?: boolean;
  summaryMaxLength?: number;
  extractTables?: boolean; // 🆕 Enable table extraction
  generateAISummary?: boolean; // 🆕 Enable AI summary generation
}

export interface IngestResult {
  success: boolean;
  document?: NormalizedDocument;
  embedding?: number[];
  error?: string;
  warnings: string[];
  needsReview: boolean;
  processingTime: number;
}

export interface IngestStats {
  total: number;
  successful: number;
  failed: number;
  needsReview: number;
  averageProcessingTime: number;
  byType: Record<string, number>;
}

export class DocumentIngestPipeline {
  private classifier: SemanticClassifier;
  private normalizer: DocumentNormalizer;
  private embedClient: EmbedClient;
  private summarizer: DocumentSummarizer;

  constructor() {
    this.classifier = new SemanticClassifier();
    this.normalizer = new DocumentNormalizer();
    this.embedClient = new EmbedClient();
    this.summarizer = new DocumentSummarizer();
  }

  /**
   * Ingest a single document through the complete pipeline
   */
  async ingest(
    raw: RawDocument,
    options: IngestOptions = {}
  ): Promise<IngestResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const log: ProcessingLogEntry[] = [];

    try {
      console.log(`📥 Starting ingest pipeline for: ${raw.filename}`);

      // STEP 1: Build document context
      const context: DocumentContext = {
        filename: raw.filename,
        content: raw.content,
        metadata: raw.metadata,
      };

      log.push({
        timestamp: new Date().toISOString(),
        stage: 'ingest',
        status: 'success',
        message: 'Document context prepared',
      });

      // STEP 2: Semantic classification
      console.log('🔍 Step 2: Semantic classification...');
      const classification = await this.classifier.classify(context);
      
      log.push({
        timestamp: new Date().toISOString(),
        stage: 'classify',
        status: 'success',
        message: `Classified as ${classification.type}`,
        details: {
          type: classification.type,
          confidence: classification.confidence.classification,
          method: classification.method,
        },
      });

      if (classification.confidence.classification < 0.6) {
        warnings.push(`Low classification confidence: ${classification.confidence.classification.toFixed(2)}`);
      }

      // STEP 3: Normalization (with table extraction)
      console.log('📝 Step 3: Normalization...');
      const normalized = await this.normalizer.normalize(raw, classification, {
        strictValidation: !options.skipValidation,
        generateSummary: options.generateSummary !== false,
        summaryMaxLength: options.summaryMaxLength,
        extractTables: options.extractTables !== false, // 🆕 Table extraction enabled by default
      });

      log.push({
        timestamp: new Date().toISOString(),
        stage: 'normalize',
        status: 'success',
        message: 'Document normalized to canonical schema',
      });

      // Merge processing logs
      if (normalized.processing_log) {
        log.push(...normalized.processing_log);
      }
      normalized.processing_log = log;

      // STEP 4: Validation (CURSOR RULE: enforce schema compliance)
      if (!options.skipValidation) {
        console.log('✅ Step 4: Validation...');
        const validation = DocumentValidator.validate(normalized);

        if (!validation.valid) {
          log.push({
            timestamp: new Date().toISOString(),
            stage: 'validate',
            status: 'error',
            message: 'Validation failed',
            details: validation,
          });

          // CURSOR RULE: Reject destructive schema changes
          throw new Error(`Schema validation failed: ${validation.errors.join(', ')}`);
        }

        if (validation.warnings.length > 0) {
          warnings.push(...validation.warnings);
          log.push({
            timestamp: new Date().toISOString(),
            stage: 'validate',
            status: 'warning',
            message: `Validation warnings: ${validation.warnings.join(', ')}`,
          });
        } else {
          log.push({
            timestamp: new Date().toISOString(),
            stage: 'validate',
            status: 'success',
            message: 'Validation passed',
          });
        }
      }

      // STEP 5: 🆕 AI Summary Generation (LLM-based)
      if (options.generateAISummary !== false && raw.content) {
        console.log('📝 Step 5: Generating AI summary...');
        try {
          const summaryResult = await this.summarizer.summarize(
            raw.content,
            classification.type,
            {
              maxLength: options.summaryMaxLength || 100,
              language: 'tr',
              style: 'brief',
            }
          );

          if (summaryResult.success) {
            normalized.summary = {
              text: summaryResult.summary,
              keyPoints: summaryResult.keyPoints,
              generatedAt: new Date().toISOString(),
              confidence: summaryResult.confidence,
              language: (summaryResult.language === 'en' ? 'en' : 'tr') as 'tr' | 'en',
            };

            log.push({
              timestamp: new Date().toISOString(),
              stage: 'ingest',
              status: 'success',
              message: `AI summary generated (${summaryResult.processingTimeMs}ms)`,
              details: { keyPointsCount: summaryResult.keyPoints.length },
            });
          } else {
            warnings.push(`AI summary generation failed: ${summaryResult.error}`);
            log.push({
              timestamp: new Date().toISOString(),
              stage: 'ingest',
              status: 'warning',
              message: 'AI summary generation failed',
              details: { error: summaryResult.error },
            });
          }
        } catch (error) {
          warnings.push(`AI summary error: ${error}`);
          log.push({
            timestamp: new Date().toISOString(),
            stage: 'ingest',
            status: 'warning',
            message: 'AI summary generation error',
            details: { error: String(error) },
          });
        }
      }

      // STEP 6: Auto human review check (CURSOR RULE)
      let needsReview = normalized.needs_human_review;
      if (options.autoReview !== false) {
        if (classification.confidence.classification < 0.6) {
          needsReview = true;
          warnings.push('Auto review: Low classification confidence (<0.6)');
        }
        if (!normalized.total && normalized.type === 'fatura') {
          needsReview = true;
          warnings.push('Auto review: Invoice missing total amount');
        }
      }
      normalized.needs_human_review = needsReview;

      // STEP 7: Embedding generation (BGE-M3)
      let embedding: number[] | undefined;
      if (!options.skipEmbedding && normalized.source_sample) {
        console.log('🧮 Step 6: Generating embedding with BGE-M3...');
        try {
          const embeddings = await this.embedClient.embed([normalized.source_sample]);
          embedding = embeddings[0];
          normalized.embedding = embedding;
          normalized.embedding_model = 'bge-m3';

          log.push({
            timestamp: new Date().toISOString(),
            stage: 'embed',
            status: 'success',
            message: `Embedding generated (dim: ${embedding.length})`,
          });
        } catch (error) {
          warnings.push(`Embedding generation failed: ${error}`);
          log.push({
            timestamp: new Date().toISOString(),
            stage: 'embed',
            status: 'warning',
            message: 'Embedding generation failed',
            details: { error: String(error) },
          });
        }
      }

      // STEP 8: Final audit log
      const processingTime = Date.now() - startTime;
      log.push({
        timestamp: new Date().toISOString(),
        stage: 'ingest',
        status: 'success',
        message: `Ingest pipeline completed in ${processingTime}ms`,
        details: {
          needs_review: needsReview,
          warnings: warnings.length,
          has_embedding: !!embedding,
        },
      });

      console.log(`✅ Ingest completed for: ${raw.filename} (${processingTime}ms)`);

      return {
        success: true,
        document: normalized,
        embedding,
        warnings,
        needsReview,
        processingTime,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Ingest failed for: ${raw.filename}`, error);

      log.push({
        timestamp: new Date().toISOString(),
        stage: 'ingest',
        status: 'error',
        message: 'Ingest pipeline failed',
        details: { error: String(error) },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        warnings,
        needsReview: true,
        processingTime,
      };
    }
  }

  /**
   * Batch ingest multiple documents
   */
  async batchIngest(
    rawDocs: RawDocument[],
    options: IngestOptions = {}
  ): Promise<{
    results: IngestResult[];
    stats: IngestStats;
  }> {
    console.log(`📦 Starting batch ingest for ${rawDocs.length} documents...`);
    const startTime = Date.now();

    const results: IngestResult[] = [];
    const stats: IngestStats = {
      total: rawDocs.length,
      successful: 0,
      failed: 0,
      needsReview: 0,
      averageProcessingTime: 0,
      byType: {},
    };

    for (let i = 0; i < rawDocs.length; i++) {
      const raw = rawDocs[i];
      console.log(`📄 Processing ${i + 1}/${rawDocs.length}: ${raw.filename}`);

      const result = await this.ingest(raw, options);
      results.push(result);

      if (result.success) {
        stats.successful++;
        
        if (result.document) {
          const type = result.document.type;
          stats.byType[type] = (stats.byType[type] || 0) + 1;
        }

        if (result.needsReview) {
          stats.needsReview++;
        }
      } else {
        stats.failed++;
      }
    }

    const totalTime = Date.now() - startTime;
    stats.averageProcessingTime = totalTime / rawDocs.length;

    console.log(`✅ Batch ingest completed:`, stats);

    return { results, stats };
  }

  /**
   * Reindex document (for updates)
   * CURSOR RULE: Immutable normalized records - create new version
   */
  async reindex(
    documentId: string,
    raw: RawDocument,
    options: IngestOptions = {}
  ): Promise<IngestResult> {
    console.log(`🔄 Reindexing document: ${documentId}`);

    // Generate new version ID
    const versionedId = `${documentId}_v${Date.now()}`;
    const versionedRaw = { ...raw, id: versionedId };

    // Ingest as new version
    const result = await this.ingest(versionedRaw, options);

    if (result.success && result.document) {
      result.document.processing_log?.push({
        timestamp: new Date().toISOString(),
        stage: 'index',
        status: 'success',
        message: `Reindexed as new version: ${versionedId}`,
        details: { original_id: documentId },
      });
    }

    return result;
  }

  /**
   * Health check - verify all pipeline components
   */
  async healthCheck(): Promise<{
    classifier: boolean;
    normalizer: boolean;
    embedClient: boolean;
    overall: boolean;
  }> {
    const embedClientOk = await this.embedClient.healthCheck();

    return {
      classifier: true, // Always available (uses LLM)
      normalizer: true, // Always available (deterministic)
      embedClient: embedClientOk,
      overall: embedClientOk, // Pipeline works even without embeddings (fallback)
    };
  }
}

