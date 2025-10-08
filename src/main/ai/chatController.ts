/**
 * Chat Controller - Main orchestrator for RAG chat pipeline
 * 
 * Pipeline:
 * 1. Query → Embed query (BGE-M3)
 * 2. Retrieve top-K text sections (pgvector/Qdrant)
 * 3. Extract numeric data deterministically (JS)
 * 4. Aggregate stats (backend calculation)
 * 5. Format answer with Mistral 7B
 * 6. Return structured response with provenance
 */

import { EmbedClient } from './embedClient';
import { RetrievalClient, RetrievalResult } from './retrievalClient';
import { LocalRetrievalClient, LocalRetrievalResult } from './localRetrievalClient';
import { MistralClient } from './mistralClient';
import {
  extractFromTextSection,
  batchExtract,
  ExtractedAmount,
  ExtractedDate,
  ExtractedInvoiceID,
} from './numericExtractor';
import {
  aggregateAll,
  FullAggregation,
} from './aggregator';

export interface ChatQueryRequest {
  userId: string;
  query: string;
  options?: {
    currency?: string;
    dateRange?: {
      from: string;
      to: string;
    };
    topK?: number;
    locale?: 'tr' | 'us' | 'auto';
  };
}

export interface ProvenanceItem {
  sectionId: string;
  documentId: string;
  filename: string;
  snippet: string;
  similarity: number;
  metadata?: any;
}

export interface ChatQueryResponse {
  success: boolean;
  payload?: {
    answer: string;
    stats: {
      count: number;
      sum: number;
      average: number;
      median: number;
      currency: string | null;
      min?: number;
      max?: number;
      outliers?: number[];
    };
    provenance: ProvenanceItem[];
    usedChunkIds: string[];
    modelMeta: {
      model: string;
      latencyMs: number;
      fallback?: string;
      criticVerified?: boolean;
      criticIssues?: string[];
    };
    lowConfidence?: boolean;
    suggestedFollowUp?: string;
    displayFlags?: {
      lowConfidence?: boolean;
      duplicates?: boolean;
      outliers?: boolean;
    };
  };
  error?: string;
}

export interface DeepAnalysisConfig {
  enableCritic?: boolean;
  criticModel?: 'mistral' | 'local';
  escalateModel?: string;
  timeout?: number;
  criticTimeout?: number;
}

export class ChatController {
  private embedClient: EmbedClient;
  private retrievalClient: RetrievalClient;
  private localRetrievalClient: LocalRetrievalClient;
  private mistralClient: MistralClient;
  private useLocalStorage: boolean;

  constructor(useLocalStorage: boolean = true) {
    this.embedClient = new EmbedClient();
    this.retrievalClient = new RetrievalClient();
    // CRITICAL: Use the same store name as everywhere else
    this.localRetrievalClient = new LocalRetrievalClient({
      storeName: 'document-converter-data'
    });
    this.mistralClient = new MistralClient();
    this.useLocalStorage = useLocalStorage;
    
    console.log(`ChatController initialized: useLocalStorage=${useLocalStorage}`);
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<{
    embed: boolean;
    retrieval: boolean;
    mistral: boolean;
  }> {
    const [embed, mistral] = await Promise.all([
      this.embedClient.healthCheck(),
      this.mistralClient.healthCheck(),
    ]);

    return {
      embed,
      retrieval: true, // Retrieval is always available (local storage or DB connection)
      mistral,
    };
  }

  /**
   * Add document to local storage for retrieval
   */
  async addDocumentToLocalStorage(
    documentId: string,
    filename: string,
    content: string,
    metadata?: any
  ): Promise<void> {
    try {
      await this.localRetrievalClient.storeDocument(documentId, filename, content, metadata);
      console.log(`Added document to local storage: ${filename}`);
    } catch (error) {
      console.error('Error adding document to local storage:', error);
      throw error;
    }
  }

  /**
   * Get stored documents from local storage
   */
  getStoredDocuments(): any[] {
    return this.localRetrievalClient.getStoredDocuments();
  }

  /**
   * Clear all stored documents from local storage
   */
  clearStoredDocuments(): void {
    this.localRetrievalClient.clearStoredDocuments();
  }

  /**
   * Deep analysis chat query with multi-pass reasoning and critic verification
   * 
   * Pipeline:
   * 1. Embed query (BGE-M3)
   * 2. Retrieve topK chunks (pgvector/qdrant)
   * 3. Extract amounts/dates/invoiceIds (numericExtractor)
   * 4. Aggregate with duplicate & outlier detection
   * 5. Generate draft answer (Mistral)
   * 6. Critic verification (Mistral)
   * 7. Finalize or re-generate if critic finds issues
   */
  async chatQueryDeep(
    request: ChatQueryRequest,
    config: DeepAnalysisConfig = {}
  ): Promise<ChatQueryResponse> {
    const startTime = Date.now();
    const timeout = config.timeout || 15000; // 15s default
    const criticTimeout = config.criticTimeout || 2000; // 2s for critic
    const enableCritic = config.enableCritic !== false; // Default true

    try {
      console.log(`ChatController.Deep: Processing query for user ${request.userId}: "${request.query}"`);
      console.log(`ChatController.Deep: Config - critic=${enableCritic}, timeout=${timeout}ms`);

      // Check overall timeout
      if (Date.now() - startTime > timeout) {
        throw new Error('Deep analysis timeout before starting');
      }

      // Step 1: Generate query embedding
      const queryEmbedding = await this.generateQueryEmbedding(request.query);
      
      // Step 2: Retrieve similar text sections
      const retrievedChunks = await this.retrieveSimilarChunks(
        queryEmbedding,
        request.options?.topK,
        request.query
      );

      if (retrievedChunks.length === 0) {
        return await this.handleNoDataFound(request.query, startTime);
      }

      // Step 3: Extract numeric data from retrieved chunks
      const extractionResult = await this.extractNumericData(retrievedChunks, request.options?.locale);

      // Step 4: Aggregate statistics with duplicate and outlier detection
      const aggregation = await this.aggregateData(extractionResult, request.options?.currency);

      // Prepare computed stats for prompts
      const computedStats = {
        count: aggregation.amounts.count,
        sum: aggregation.amounts.sum,
        average: aggregation.amounts.average,
        median: aggregation.amounts.median,
        min: aggregation.amounts.min,
        max: aggregation.amounts.max,
        currency: aggregation.amounts.currency || 'TRY',
        outliers: aggregation.amounts.outliers || [],
      };

      const flags = {
        lowConfidence: aggregation.metadata.lowConfidence,
        duplicatesFound: aggregation.metadata.duplicatesFound || false,
        outliersFound: aggregation.metadata.outliersFound || false,
      };

      // Step 5: Prepare provenance
      const provenance = this.prepareProvenance(retrievedChunks);
      const snippets = retrievedChunks.slice(0, 5).map(c => c.content);

      // Check timeout before generation
      if (Date.now() - startTime > timeout) {
        console.warn('ChatController.Deep: Timeout before generation phase');
        return this.createFallbackResponse(computedStats, provenance, flags, startTime);
      }

      // Step 6: Generate draft answer with Mistral
      let draftAnswer: string;
      let draftProvenance: any[] = provenance.slice(0, 5);
      let followUp: string = '';
      let generationLatency = 0;

      try {
        const isMistralAvailable = await this.mistralClient.healthCheck();
        
        if (!isMistralAvailable) {
          console.warn('ChatController.Deep: Mistral unavailable, using fallback');
          return this.createFallbackResponse(computedStats, provenance, flags, startTime);
        }

        const generateResponse = await this.mistralClient.generateDeepAnswer(
          snippets,
          computedStats,
          flags
        );
        
        draftAnswer = generateResponse.answer;
        followUp = generateResponse.followUp;
        generationLatency = generateResponse.latencyMs;
        
        // Use provenance from LLM if available, otherwise use our computed one
        if (generateResponse.provenance && generateResponse.provenance.length > 0) {
          draftProvenance = generateResponse.provenance;
        }

        console.log(`ChatController.Deep: Draft generated in ${generationLatency}ms`);
      } catch (error) {
        console.error('ChatController.Deep: Generation failed, using fallback:', error);
        return this.createFallbackResponse(computedStats, provenance, flags, startTime);
      }

      // Step 7: Critic verification (if enabled and time allows)
      let criticVerified = false;
      let criticIssues: string[] = [];
      let criticLatency = 0;

      if (enableCritic && Date.now() - startTime < timeout - criticTimeout) {
        try {
          console.log('ChatController.Deep: Running critic verification...');
          
          const criticResponse = await this.mistralClient.criticVerify(
            draftAnswer,
            computedStats,
            draftProvenance
          );
          
          criticVerified = criticResponse.ok;
          criticIssues = criticResponse.issues;
          criticLatency = criticResponse.latencyMs;

          console.log(`ChatController.Deep: Critic completed in ${criticLatency}ms - OK=${criticVerified}`);
          
          if (!criticVerified && criticIssues.length > 0) {
            console.warn('ChatController.Deep: Critic found issues:', criticIssues);
            
            // Option: Re-generate with critic suggestions (if time allows)
            // For now, we'll proceed with the draft but flag it
            // TODO: Implement escalation to stronger model if configured
          }
        } catch (error) {
          console.error('ChatController.Deep: Critic verification failed:', error);
          // Continue with draft answer even if critic fails
          criticVerified = false;
          criticIssues = [`Critic error: ${error instanceof Error ? error.message : 'Unknown'}`];
        }
      } else if (enableCritic) {
        console.warn('ChatController.Deep: Skipping critic due to time constraints');
      }

      // Step 8: Finalize response
      const totalLatency = Date.now() - startTime;

      return {
        success: true,
        payload: {
          answer: draftAnswer,
          stats: {
            count: aggregation.amounts.count,
            sum: aggregation.amounts.sum,
            average: aggregation.amounts.average,
            median: aggregation.amounts.median,
            currency: aggregation.amounts.currency,
            min: aggregation.amounts.min,
            max: aggregation.amounts.max,
            outliers: aggregation.amounts.outliers,
          },
          provenance: draftProvenance,
          usedChunkIds: retrievedChunks.map(c => c.sectionId),
          modelMeta: {
            model: 'mistral-7b-deep',
            latencyMs: totalLatency,
            criticVerified: enableCritic ? criticVerified : undefined,
            criticIssues: criticIssues.length > 0 ? criticIssues : undefined,
          },
          lowConfidence: aggregation.metadata.lowConfidence,
          suggestedFollowUp: followUp || this.generateFollowUpSuggestion(aggregation),
          displayFlags: {
            lowConfidence: flags.lowConfidence,
            duplicates: flags.duplicatesFound,
            outliers: flags.outliersFound,
          },
        },
      };
    } catch (error) {
      console.error('ChatController.Deep: Query processing failed:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in deep analysis',
      };
    }
  }

  /**
   * Create fallback response when LLM is unavailable
   */
  private createFallbackResponse(
    computedStats: any,
    provenance: ProvenanceItem[],
    flags: any,
    startTime: number
  ): ChatQueryResponse {
    const fallbackText = MistralClient.getFallbackResponse(computedStats, provenance);
    
    return {
      success: true,
      payload: {
        answer: fallbackText,
        stats: {
          count: computedStats.count,
          sum: computedStats.sum,
          average: computedStats.average,
          median: computedStats.median,
          currency: computedStats.currency || 'TRY',
          min: computedStats.min,
          max: computedStats.max,
          outliers: computedStats.outliers,
        },
        provenance: provenance.slice(0, 5),
        usedChunkIds: provenance.map(p => p.sectionId),
        modelMeta: {
          model: 'fallback',
          latencyMs: Date.now() - startTime,
          fallback: 'mistral_unavailable',
        },
        lowConfidence: flags.lowConfidence,
        displayFlags: flags,
      },
    };
  }

  /**
   * Main chat query handler
   */
  async handleChatQuery(request: ChatQueryRequest): Promise<ChatQueryResponse> {
    const startTime = Date.now();

    try {
      console.log(`ChatController: Processing query for user ${request.userId}: "${request.query}"`);

      // Check if query is a general question (not document-related)
      if (this.isGeneralQuery(request.query)) {
        console.log('ChatController: Detected general query, responding directly');
        return await this.handleGeneralQuery(request.query, startTime);
      }

      // Step 1: Generate query embedding
      const queryEmbedding = await this.generateQueryEmbedding(request.query);
      
      // Step 2: Retrieve similar text sections
      const retrievedChunks = await this.retrieveSimilarChunks(queryEmbedding, request.options?.topK, request.query);

      if (retrievedChunks.length === 0) {
        return await this.handleNoDataFound(request.query, startTime);
      }

      // Step 3: Extract numeric data from retrieved chunks
      const extractionResult = await this.extractNumericData(retrievedChunks, request.options?.locale);

      // Step 4: Aggregate statistics
      const aggregation = await this.aggregateData(extractionResult, request.options?.currency);

      // Step 5: Prepare provenance
      const provenance = this.prepareProvenance(retrievedChunks);

      // Step 6: Format answer with Mistral
      console.log(`ChatController: Preparing to format answer with provenance count=${provenance.length}`);
      
      const answer = await this.formatAnswerWithMistral(
        retrievedChunks,
        aggregation,
        provenance,
        startTime,
        request.query // Pass original query for better context
      );

      const latencyMs = Date.now() - startTime;

      return {
        success: true,
        payload: {
          answer: answer.text,
          stats: {
            count: aggregation.amounts.count,
            sum: aggregation.amounts.sum,
            average: aggregation.amounts.average,
            median: aggregation.amounts.median,
            currency: aggregation.amounts.currency,
          },
          provenance,
          usedChunkIds: retrievedChunks.map(c => c.sectionId),
          modelMeta: {
            model: answer.model || 'mistral-7b',
            latencyMs,
            fallback: answer.fallback,
          },
          lowConfidence: aggregation.metadata.lowConfidence,
          suggestedFollowUp: this.generateFollowUpSuggestion(aggregation),
        },
      };
    } catch (error) {
      console.error('ChatController: Query processing failed:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Step 1: Generate query embedding
   */
  private async generateQueryEmbedding(query: string): Promise<number[]> {
    try {
      const embedding = await this.embedClient.embedQuery(query);
      console.log(`ChatController: Generated query embedding (dim=${embedding.length})`);
      return embedding;
    } catch (error) {
      console.error('ChatController: Embedding generation failed:', error);
      throw new Error('Failed to generate query embedding. Is the BGE-M3 server running?');
    }
  }

  /**
   * Check if query wants ALL documents (no filtering)
   */
  private wantsAllDocuments(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    
    // Direct "all" keywords
    const hasAllKeyword = /\b(bütün|tüm|hepsi|all)\b/.test(lowerQuery);
    const hasListKeyword = /(göster|listele|neler|show|list)/i.test(lowerQuery);
    
    // Counting/analysis queries need all documents
    const isCountingQuery = /\b(kaç|sayı|count|how\s+many|ne\s+kadar)\b/i.test(lowerQuery);
    const isAnalysisQuery = /(toplam|total|sum|average|ortalama|analiz|analyze)/i.test(lowerQuery);
    
    return (hasAllKeyword && hasListKeyword) || isCountingQuery || isAnalysisQuery;
  }

  /**
   * Step 2: Retrieve similar text sections
   */
  private async retrieveSimilarChunks(
    queryEmbedding: number[],
    topK?: number,
    query?: string
  ): Promise<RetrievalResult[]> {
    try {
      let chunks: RetrievalResult[];

      if (this.useLocalStorage) {
        // Use local storage for retrieval
        console.log(`ChatController: Attempting local storage retrieval with query embedding length: ${queryEmbedding.length}`);
        
        // Check if we have any stored documents first
        const storedDocs = this.localRetrievalClient.getStoredDocuments();
        console.log(`ChatController: Found ${storedDocs.length} stored documents in local storage`);
        
        if (storedDocs.length === 0) {
          console.warn('ChatController: No documents found in local storage, returning empty result');
          return [];
        }
        
        // If user wants ALL documents, return everything
        if (query && this.wantsAllDocuments(query)) {
          console.log('ChatController: User wants ALL documents, bypassing similarity filtering');
          const localChunks = await this.localRetrievalClient.retrieve(queryEmbedding, { 
            topK: 1000, // High number to get all
            threshold: -1  // Very low threshold to get everything
          });
          chunks = localChunks.map(chunk => ({
            sectionId: chunk.sectionId,
            documentId: chunk.documentId,
            filename: chunk.filename,
            content: chunk.content,
            similarity: chunk.similarity,
            metadata: chunk.metadata,
          }));
        } else {
          const localChunks = await this.localRetrievalClient.retrieve(queryEmbedding, { topK });
          chunks = localChunks.map(chunk => ({
            sectionId: chunk.sectionId,
            documentId: chunk.documentId,
            filename: chunk.filename,
            content: chunk.content,
            similarity: chunk.similarity,
            metadata: chunk.metadata,
          }));
        }
        console.log(`ChatController: Retrieved ${chunks.length} similar chunks from local storage`);
      } else {
        // Use vector database for retrieval
        chunks = await this.retrievalClient.retrieve(queryEmbedding, { topK });
        console.log(`ChatController: Retrieved ${chunks.length} similar chunks from vector database`);
      }

      return chunks;
    } catch (error) {
      console.error('ChatController: Retrieval failed:', error);
      
      // Fallback to local storage if vector database fails
      if (!this.useLocalStorage) {
        console.log('ChatController: Falling back to local storage retrieval');
        try {
          const localChunks = await this.localRetrievalClient.retrieve(queryEmbedding, { topK });
          const chunks = localChunks.map(chunk => ({
            sectionId: chunk.sectionId,
            documentId: chunk.documentId,
            filename: chunk.filename,
            content: chunk.content,
            similarity: chunk.similarity,
            metadata: chunk.metadata,
          }));
          console.log(`ChatController: Fallback retrieved ${chunks.length} similar chunks from local storage`);
          return chunks;
        } catch (fallbackError) {
          console.error('ChatController: Local storage fallback also failed:', fallbackError);
        }
      }
      
      throw new Error('Failed to retrieve documents. Check vector database connection and local storage.');
    }
  }

  /**
   * Step 3: Extract numeric data
   */
  private async extractNumericData(
    chunks: RetrievalResult[],
    locale: 'tr' | 'us' | 'auto' = 'tr'
  ): Promise<{
    amounts: ExtractedAmount[];
    dates: ExtractedDate[];
    invoiceIds: ExtractedInvoiceID[];
  }> {
    const sections = chunks.map(chunk => ({
      id: chunk.sectionId,
      content: chunk.content,
    }));

    const result = batchExtract(sections, locale);

    console.log(
      `ChatController: Extracted ${result.amounts.length} amounts, ${result.dates.length} dates, ${result.invoiceIds.length} invoice IDs`
    );

    return {
      amounts: result.amounts,
      dates: result.dates,
      invoiceIds: result.invoiceIds,
    };
  }

  /**
   * Step 4: Aggregate data
   */
  private async aggregateData(
    extractionResult: {
      amounts: ExtractedAmount[];
      dates: ExtractedDate[];
      invoiceIds: ExtractedInvoiceID[];
    },
    currency?: string
  ): Promise<FullAggregation> {
    const aggregation = aggregateAll(
      extractionResult.amounts,
      extractionResult.dates,
      extractionResult.invoiceIds,
      {
        currency,
        deduplicate: true,
      }
    );

    console.log(
      `ChatController: Aggregated stats - count: ${aggregation.amounts.count}, sum: ${aggregation.amounts.sum}, avg: ${aggregation.amounts.average}`
    );

    return aggregation;
  }

  /**
   * Step 5: Prepare provenance
   */
  private prepareProvenance(chunks: RetrievalResult[]): ProvenanceItem[] {
    return chunks.slice(0, 10).map(chunk => ({
      sectionId: chunk.sectionId,
      documentId: chunk.documentId,
      filename: chunk.filename,
      snippet: chunk.content.substring(0, 150),
      similarity: Math.round(chunk.similarity * 100) / 100,
      metadata: chunk.metadata,
    }));
  }

  /**
   * Step 6: Format answer with Mistral
   */
  private async formatAnswerWithMistral(
    chunks: RetrievalResult[],
    aggregation: FullAggregation,
    provenance: ProvenanceItem[],
    startTime: number,
    originalQuery?: string
  ): Promise<{ text: string; model: string; fallback?: string }> {
    try {
      // Check if Mistral is available
      const isMistralAvailable = await this.mistralClient.healthCheck();

      if (!isMistralAvailable) {
        console.warn('ChatController: Mistral server unavailable, using intelligent fallback');
        console.log(`Provenance count: ${provenance.length}, Stats count: ${aggregation.amounts.count}`);
        
        const fallbackText = MistralClient.getFallbackResponse(aggregation.amounts, provenance);
        return {
          text: fallbackText,
          model: 'fallback',
          fallback: 'mistral_down',
        };
      }

      // Prepare data for Mistral
      const snippets = chunks.slice(0, 5).map(c => c.content);
      const computedStats = {
        count: aggregation.amounts.count,
        sum: aggregation.amounts.sum,
        average: aggregation.amounts.average,
        median: aggregation.amounts.median,
        currency: aggregation.amounts.currency || 'TRY',
      };

      // Call Mistral to format the answer
      const response = await this.mistralClient.formatAnswer(snippets, computedStats, provenance);

      console.log(`ChatController: Mistral formatting took ${response.latencyMs}ms`);

      return {
        text: response.text,
        model: response.model,
      };
    } catch (error) {
      console.error('ChatController: Mistral formatting failed, using intelligent fallback:', error);
      console.log(`Fallback: Provenance count: ${provenance.length}, Stats count: ${aggregation.amounts.count}`);
      
      const fallbackText = MistralClient.getFallbackResponse(aggregation.amounts, provenance);
      return {
        text: fallbackText,
        model: 'fallback',
        fallback: 'mistral_error',
      };
    }
  }

  /**
   * Check if query is a general question (not document-related)
   */
  private isGeneralQuery(query: string): boolean {
    const lowerQuery = query.toLowerCase().trim();
    
    // First check if it's clearly a DOCUMENT query
    const documentKeywords = [
      /fatura/i,
      /belge/i,
      /d[oö]k[üu]man/i,  // döküman, dokuman, dokuман variations
      /dosya/i,
      /evrak/i,
      /veri/i,  // "veriler", "veri" 
      /kayıt/i,
      /invoice/i,
      /document/i,
      /file/i,
      /pdf/i,
      /excel/i,
      /word/i,
      /toplam.*(?:tutar|ücret|fiyat|miktar)/i,
      /ne\s+kadar.*(?:ödedim|harcadım)/i,
      /hangi.*(?:belge|fatura|dosya|d[oö]k[üu]man|evrak|veri)/i,
      /analiz\s+et/i,
      /göster.*(?:belge|fatura|dosya|evrak)/i,
      /listele.*(?:belge|fatura|dosya|evrak)/i,
      /(belge|fatura|dosya|d[oö]k[üu]man|evrak|veri).*neler/i,  // "belgeler neler", "evraklar neler"
      /neler.*(?:belge|fatura|dosya|evrak|veri|var)/i,  // "neler var", "hangi evraklar var"
      /(?:ne|hangi).*(?:evrak|veri|belge|dosya)/i,  // "ne evrak var", "hangi veriler"
    ];
    
    // If contains document keywords, it's NOT a general query (return false = document query)
    if (documentKeywords.some(pattern => pattern.test(lowerQuery))) {
      console.log(`ChatController: Query "${query}" matched document keyword, treating as document query`);
      return false;
    }
    
    console.log(`ChatController: Query "${query}" has no document keywords, treating as general conversation`);
    // If query is very short (less than 50 chars) and doesn't have doc keywords, 
    // it's likely a general conversation
    // DEFAULT: Treat as general query (for chat capability)
    return true;
  }

  /**
   * Handle general queries without document retrieval
   */
  private async handleGeneralQuery(
    query: string,
    startTime: number
  ): Promise<ChatQueryResponse> {
    const lowerQuery = query.toLowerCase();
    let answer: string;
    
    // Extract math expression from queries like "2+2 kaç"
    const mathMatch = query.match(/^\s*(\d+\s*[\+\-\*\/]\s*\d+)/);
    if (mathMatch) {
      try {
        const expression = mathMatch[1].replace(/\s+/g, '');
        const result = eval(expression);
        answer = `Sonuç: ${result}\n\nBen bir doküman analiz asistanıyım. Belgeleriniz hakkında sorular sorabilisiniz (örn: "fatura toplamı nedir?", "hangi belgeler var?").`;
      } catch {
        answer = 'Üzgünüm, bu hesaplamayı yapamadım.';
      }
    }
    // Greetings
    else if (/^(merhaba|selam|hi|hello|hey)/i.test(lowerQuery)) {
      answer = 'Merhaba! 👋 Ben bir doküman analiz asistanıyım. Hem belgelerinizi analiz edebilir, hem de sohbet edebilirim. Size nasıl yardımcı olabilirim?';
    }
    // How are you
    else if (/(nasılsın|how are you|ne haber)/i.test(lowerQuery)) {
      answer = 'İyiyim, teşekkür ederim! 😊 Bugün sizin için ne yapabilirim? Belge analizi yapabilirim veya sohbet edebiliriz.';
    }
    // What are you doing
    else if (/(ne\s+yapıyorsun|ne\s+yapıyor|what.*doing)/i.test(lowerQuery)) {
      answer = 'Sizinle sohbet ediyorum! 💬 Aynı zamanda belgelerinizi analiz etmeye ve sorularınıza yanıt vermeye hazırım. Ne isterseniz...';
    }
    // Who are you / Your name
    else if (/(kim\s+olduğun|kimsin|adın\s+ne|who\s+are\s+you|your\s+name)/i.test(lowerQuery)) {
      answer = 'Ben bir AI doküman analiz asistanıyım. 🤖 Belgelerinizi analiz edebilir, fatura hesaplamaları yapabilir ve genel sorularınıza yanıt verebilirim. Benimle istediğiniz konuda sohbet edebilirsiniz!';
    }
    // Weather
    else if (/(hava\s+nasıl|weather|hava\s+durumu)/i.test(lowerQuery)) {
      answer = 'Hava durumu bilgisine erişimim yok ama bunu sizin için arayabilirim desem yalan olur. 😅 Ama belgelerinizle ilgili size yardımcı olabilirim! Veya başka bir konuda sohbet edebiliriz.';
    }
    // Joke
    else if (/(şaka|joke|komik|eğlen)/i.test(lowerQuery)) {
      answer = 'Bir PDF ile bir Word dosyası mağazaya girer. PDF "Ben açılmam" der. Word "Ben de her zaman bozulurum" der. 😄\n\nBelgelerinizi analiz etmem daha komik olabilir!';
    }
    // Help
    else if (/^(yardım|help)$/i.test(lowerQuery)) {
      answer = '📚 Size şu konularda yardımcı olabilirim:\n\n' +
        '**Belge Analizi:**\n' +
        '• Fatura toplamları ve hesaplamalar\n' +
        '• PDF, Word, Excel analizi\n' +
        '• Tarih ve döküman arama\n\n' +
        '**Sohbet:**\n' +
        '• Genel sorular\n' +
        '• Basit hesaplamalar\n' +
        '• Konuşma ve yardım\n\n' +
        'Nasıl yardımcı olabilirim?';
    }
    // Thank you
    else if (/(teşekkür|sağol|thanks|thank you)/i.test(lowerQuery)) {
      answer = 'Rica ederim! 😊 Başka bir konuda yardımcı olmamı ister misiniz?';
    }
    // Goodbye
    else if (/(görüşürüz|hoşça\s+kal|bye|goodbye|güle\s+güle)/i.test(lowerQuery)) {
      answer = 'Görüşmek üzere! 👋 İhtiyacınız olduğunda buradayım.';
    }
    // Default response for other general conversations
    else {
      answer = 'Anladım. 🤔 Ben bir doküman analiz asistanıyım ama sizinle sohbet etmekten de mutluluk duyarım!\n\n' +
        'Belgeleriniz hakkında sorular sorabilir veya genel konularda konuşabiliriz. Ne yapmak istersiniz?';
    }

    return {
      success: true,
      payload: {
        answer,
        stats: {
          count: 0,
          sum: 0,
          average: 0,
          median: 0,
          currency: null,
        },
        provenance: [],
        usedChunkIds: [],
        modelMeta: {
          model: 'conversation',
          latencyMs: Date.now() - startTime,
          fallback: 'rule_based_chat',
        },
      },
    };
  }

  /**
   * Handle case when no data is found
   */
  private async handleNoDataFound(
    query: string,
    startTime: number
  ): Promise<ChatQueryResponse> {
    try {
      const response = await this.mistralClient.generateNoDataResponse(query);
      return {
        success: true,
        payload: {
          answer: response.text,
          stats: {
            count: 0,
            sum: 0,
            average: 0,
            median: 0,
            currency: null,
          },
          provenance: [],
          usedChunkIds: [],
          modelMeta: {
            model: response.model,
            latencyMs: Date.now() - startTime,
          },
          lowConfidence: true,
          suggestedFollowUp: 'Daha fazla belge yükleyin veya sorguyu yeniden ifade edin.',
        },
      };
    } catch (error) {
      // Fallback if Mistral is down - provide friendly response
      return {
        success: true,
        payload: {
          answer:
            'Merhaba! Ben dokümanlarınız hakkında bilgi verebilirim. Şu anda sistemde belgeler var, onlar hakkında sorular sorabilirsiniz. Örneğin:\n\n' +
            '• "Hangi belgelerim var?"\n' +
            '• "Fatura toplamım ne kadar?"\n' +
            '• "Son yüklediğim dosyalar neler?"\n\n' +
            'Nasıl yardımcı olabilirim?',
          stats: {
            count: 0,
            sum: 0,
            average: 0,
            median: 0,
            currency: null,
          },
          provenance: [],
          usedChunkIds: [],
          modelMeta: {
            model: 'fallback',
            latencyMs: Date.now() - startTime,
            fallback: 'mistral_down',
          },
          lowConfidence: true,
        },
      };
    }
  }

  /**
   * Generate follow-up suggestion based on aggregation results
   */
  private generateFollowUpSuggestion(aggregation: FullAggregation): string | undefined {
    if (aggregation.metadata.lowConfidence) {
      return 'Tarih aralığı belirtirseniz veya daha fazla belge yüklerseniz daha iyi sonuçlar alabilirim.';
    }

    if (aggregation.dates && aggregation.dates.count > 0) {
      return 'Dilersen belirli bir tarih aralığındaki faturaları filtreleyebilirim.';
    }

    if (aggregation.amounts.count > 10) {
      return 'Dilersen döviz dönüştürme veya aylık ortalama hesaplayabilirim.';
    }

    return undefined;
  }

  /**
   * Get configuration info
   */
  getConfig(): {
    embed: any;
    retrieval: any;
    mistral: any;
  } {
    return {
      embed: this.embedClient,
      retrieval: this.retrievalClient.getConfig(),
      mistral: this.mistralClient,
    };
  }
}

