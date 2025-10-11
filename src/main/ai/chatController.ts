/**
 * Chat Controller - Pure AI Chat with Llama 3.2
 * OPTIMIZED with caching and context pruning
 * 
 * NEW: Support for Canonical Schema and Aggregation Service
 * - Uses NormalizedDocument metadata for better responses
 * - Integrates AggregationService for numeric queries
 * - Type-aware and confidence-aware responses
 */

import { LlamaClient } from './llamaClient';
import {
  retrieveRelevantSections,
  extractNumericValues,
  computeAggregates,
  invalidateRetrievalCache,
  LocalDocument,
  RetrievalResult,
  NumericValue,
} from './documentRetriever';
import { RetrievalCache } from './retrievalCache';
import { AggregationService } from './aggregationService';
import { NormalizedDocument, DocumentType } from './canonicalSchema';
import { DocumentSummarizer } from './documentSummarizer';
import { rerankResults, deduplicateResults, generateQueryVariations } from './reranker';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Intent Classification Types
 */
interface Intent {
  type: 'CASUAL_CHAT' | 'META_QUERY' | 'DOCUMENT_QUERY' | 'SUMMARIZE_QUERY';
  confidence: number;
  handler?: string;
}

export interface ChatQueryRequest {
  userId: string;
  query: string;
  conversationHistory?: ChatMessage[];
}

export interface DocumentChatQueryRequest {
  userId: string;
  query: string;
  localDocs: any[];
  options?: {
    compute?: boolean;
    showRaw?: boolean;
    maxRefs?: number;
    locale?: string;
  };
  conversationHistory?: ChatMessage[];
}

export interface ChatQueryResponse {
  success: boolean;
  payload?: {
    answer: string;
    modelMeta: {
      model: string;
      latencyMs: number;
    };
  };
  error?: string;
}

export interface DocumentChatQueryResponse {
  success: boolean;
  payload?: {
    answer: string;
    meta?: any; // Parsed __meta__ JSON
    modelMeta: {
      model: string;
      latencyMs: number;
    };
  };
  error?: string;
}

/**
 * Extract filename from message content
 */
function extractFilenameFromMessage(content: string): string | null {
  // Try to extract filename with extension
  const filenameMatch = content.match(/([a-zA-Z0-9\-_]+\.(pdf|xlsx?|docx?|txt|csv))/i);
  if (filenameMatch) {
    return filenameMatch[1];
  }
  
  // Try to extract filename without extension (must start with capital letter)
  const filenameNoExtMatch = content.match(/([A-Z][a-zA-Z0-9\-_]{5,})/);
  if (filenameNoExtMatch) {
    return filenameNoExtMatch[1];
  }
  
  return null;
}

/**
 * Preprocess query: expand abbreviations, normalize, and resolve references
 * WITH CONVERSATION CONTEXT AWARENESS
 * OPTIMIZED: Better Turkish text normalization and filename preservation
 */
function preprocessQuery(query: string, conversationHistory: ChatMessage[] = []): string {
  let processed = query
    // Abbreviation expansion
    .replace(/\bbdl\b/gi, 'bedel')
    .replace(/\bfat\.?\b/gi, 'fatura')
    .replace(/\btut\.?\b/gi, 'tutar')
    .replace(/\bücr\.?\b/gi, 'ücret')
    .replace(/\btop\.?\b/gi, 'toplam')
    .replace(/\bdok\.?\b/gi, 'doküman')
    .replace(/\bbelg\.?\b/gi, 'belge')
    // 🆕 Common typo corrections (EXPANDED)
    .replace(/\bpotobox/gi, 'photobox')
    .replace(/\bfhotobox/gi, 'photobox')
    .replace(/\bohotobox/gi, 'photobox')
    .replace(/\bphotobok/gi, 'photobox')
    .replace(/\bfotobox/gi, 'photobox')
    .replace(/\bfotobok/gi, 'photobox')
    // Normalize multiple spaces
    .replace(/\s+/g, ' ')
    .trim();

  // ============================================
  // PHASE 1: Resolve explicit reference words (bu, o, şu)
  // ============================================
  const hasReference = /^(bu|o|şu|bunun|onun|bunlar|onlar|bundan|ondan|bununla|onunla)(\s|$)/i.test(processed);
  
  if (hasReference && conversationHistory.length > 0) {
    console.log('🔍 [PHASE 1] Detected reference word, searching conversation history...');
    
    // Look at last 5 messages to find file/document references
    const recentMessages = conversationHistory.slice(-5).reverse();
    
    for (const msg of recentMessages) {
      const filename = extractFilenameFromMessage(msg.content);
      
      if (filename) {
        console.log(`✅ [PHASE 1] Resolved reference to: ${filename}`);
        processed = processed.replace(/^(bu|o|şu|bunun|onun|bunlar|onlar|bundan|ondan|bununla|onunla)(\s+|$)/i, `${filename} `);
        break;
      }
    }
  }

  // ============================================
  // PHASE 2: Context-aware query expansion (IMPROVED - llm-search inspired)
  // If query doesn't mention a filename, check conversation history
  // BUT ONLY if query seems to be asking about specific document content
  // ============================================
  const queryHasFilename = /[a-zA-Z0-9\-_]+\.(pdf|xlsx?|docx?|txt|csv)/i.test(processed);
  
  // 🆕 FIX: Only expand context for follow-up questions (not for new document searches)
  // Indicators of follow-up questions: "bu", "o", "kime", "nerede", "ne zaman", etc.
  const isFollowUpQuestion = /^(bu|o|şu|kime|nerede|ne zaman|nasıl|hangi|kaç)/i.test(processed);
  const isNewSearch = processed.split(/\s+/).some(word => word.length >= 5); // Has substantial keywords
  
  if (!queryHasFilename && conversationHistory.length > 0 && isFollowUpQuestion && !isNewSearch) {
    console.log('🔍 [PHASE 2] Follow-up question detected, checking conversation context...');
    
    // Look at last 5 messages (prioritize recent ones)
    const recentMessages = conversationHistory.slice(-5).reverse();
    
    for (const msg of recentMessages) {
      const filename = extractFilenameFromMessage(msg.content);
      
      if (filename) {
        console.log(`✅ [PHASE 2] Context-aware expansion: Adding "${filename}" to query`);
        // Prepend filename to query for better retrieval
        processed = `${filename} ${processed}`;
        break;
      }
    }
  } else if (!queryHasFilename && conversationHistory.length > 0 && isNewSearch) {
    console.log('🔍 [PHASE 2] New search detected - SKIPPING context expansion to allow fresh query');
  }
  
  console.log('🔧 Final preprocessed query:', processed);
  return processed;
}

/**
 * Clean LLM response: remove excessive formatting
 * For casual chat only - keeps response short
 */
function cleanCasualResponse(text: string): string {
  let cleaned = text
    // Remove markdown bold
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Remove markdown italic
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // If response has more than 2 sentences, keep only first 2 (casual chat only)
  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  if (sentences.length > 2) {
    cleaned = sentences.slice(0, 2).join(' ');
    if (!cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
      cleaned += '.';
    }
  }

  return cleaned;
}

/**
 * Clean document query response: minimal cleanup, preserve full answer
 */
function cleanDocumentResponse(text: string): string {
  return text
    // Remove excessive newlines only
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export class ChatController {
  private llamaClient: LlamaClient;
  private retrievalCache: RetrievalCache;
  private aggregationService: AggregationService;
  private summarizer: DocumentSummarizer;

  constructor() {
    this.llamaClient = new LlamaClient();
    this.summarizer = new DocumentSummarizer();
    // 🆕 OPTIMIZATION: Increased cache size and TTL for better performance
    // DocMind AI inspiration: larger cache for frequent document queries
    this.retrievalCache = new RetrievalCache(100, 600000); // 100 entries, 10 min TTL (was: 50, 5min)
    this.aggregationService = new AggregationService();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    llama: boolean;
  }> {
    const llama = await this.llamaClient.healthCheck();
    return { llama };
  }

  /**
   * Invalidate retrieval cache (call when documents change)
   */
  invalidateCache(): void {
    this.retrievalCache.invalidate();
    invalidateRetrievalCache(); // Also invalidate document retriever's internal cache
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.retrievalCache.getStats();
  }

  /**
   * Pure chat query handler with conversation history
   */
  async handleChatQuery(request: ChatQueryRequest): Promise<ChatQueryResponse> {
    const startTime = Date.now();

    try {
      console.log('🤖 ChatController: Handling query:', request.query.substring(0, 50) + '...');
      console.log('📚 Conversation history length:', request.conversationHistory?.length || 0);
      
      const response = await this.llamaClient.chatResponse(
        request.query, 
        request.conversationHistory || []
      );
      
      console.log('✅ ChatController: Got response from Llama:', response.text.substring(0, 100) + '...');

      return {
        success: true,
        payload: {
          answer: response.text,
          modelMeta: {
            model: response.model,
            latencyMs: Date.now() - startTime,
          },
        },
      };
    } catch (error) {
      console.error('❌ ChatController Error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'AI yanıt veremedi. Ollama sunucusunun çalıştığından emin olun.',
      };
    }
  }

  /**
   * Document-aware chat query handler with LOCAL_DOCS
   * OPTIMIZED with Intent Classification + Natural Conversation
   */
  async handleDocumentChatQuery(request: DocumentChatQueryRequest): Promise<DocumentChatQueryResponse> {
    const startTime = Date.now();

    try {
      // PREPROCESS QUERY: Expand abbreviations and resolve references
      let preprocessedQuery = preprocessQuery(request.query, request.conversationHistory || []);
      console.log('📄 ChatController: Handling document chat query:', preprocessedQuery.substring(0, 50) + '...');
      console.log('📚 LOCAL_DOCS count:', request.localDocs?.length || 0);
      console.log('💬 Conversation History:', {
        length: request.conversationHistory?.length || 0,
        history: request.conversationHistory?.slice(-3).map(h => ({ 
          role: h.role, 
          content: h.content.substring(0, 50) + '...' 
        })) || []
      });

      const localDocs = (request.localDocs || []) as LocalDocument[];
      const options = request.options || {};

      // ============================================
      // STEP 1: INTENT CLASSIFICATION (ÖNCE YAP!)
      // ============================================
      const intent = this.classifyIntent(preprocessedQuery, localDocs);
      console.log('🧠 Intent:', intent.type, '| Confidence:', intent.confidence);

      // ============================================
      // STEP 2: ROUTE TO APPROPRIATE HANDLER (RETRIEVAL YAPMADAN!)
      // ============================================

      // CASUAL CHAT - No document retrieval needed
      if (intent.type === 'CASUAL_CHAT') {
        console.log('💬 Casual chat detected - skipping retrieval');
        return this.handleCasualChat(preprocessedQuery, request.conversationHistory || [], startTime);
      }

      // 🆕 SUMMARIZE QUERY - Generate document summary
      if (intent.type === 'SUMMARIZE_QUERY') {
        console.log('📝 Summarize query detected - generating summary');
        return this.handleSummarizeQuery(preprocessedQuery, localDocs, startTime);
      }

      // META QUERY - Direct answer without LLM or retrieval
      if (intent.type === 'META_QUERY') {
        console.log('📋 Meta query detected - skipping retrieval');
        return this.handleMetaQuery(preprocessedQuery, localDocs, intent, startTime);
      }

      // ============================================
      // CONTEXT ENRICHMENT: Handle references (bu, o, şu)
      // Only for DOCUMENT_QUERY
      // ============================================
      const hasReference = /^(bu|o|şu)\s/i.test(preprocessedQuery.toLowerCase());
      if (hasReference && request.conversationHistory && request.conversationHistory.length > 0) {
        const lastMentionedDoc = this.extractLastMentionedDocument(request.conversationHistory, localDocs);
        if (lastMentionedDoc) {
          // Replace reference with document name
          preprocessedQuery = preprocessedQuery.replace(/^(bu|o|şu)\s+/i, `${lastMentionedDoc} `);
          console.log('🔗 Reference detected, enriched query:', preprocessedQuery);
        }
      }

      // ============================================
      // STEP 2.5: Check if query is aggregation query (NEW)
      // ============================================
      if (AggregationService.isAggregateQuery(preprocessedQuery)) {
        console.log('📊 Aggregate query detected - using AggregationService');
        return this.handleAggregateQuery(preprocessedQuery, localDocs, startTime);
      }

      // DOCUMENT QUERY - Use retrieval + LLM (continues below)
      console.log('📊 Document Query Mode - Starting retrieval...');

      // Step 1: Check cache first (use preprocessed query for caching)
      // 🆕 OPTIMIZATION: Smarter cache key normalization
      const cacheKey = preprocessedQuery.toLowerCase().trim();
      const cachedResults = this.retrievalCache.get(cacheKey);
      let retrievalResults: RetrievalResult[];

      if (cachedResults) {
        console.log(`⚡ Cache HIT for query: "${cacheKey.substring(0, 50)}..."`);
        retrievalResults = cachedResults;
      } else {
        console.log(`❌ Cache MISS for query: "${cacheKey.substring(0, 50)}..."`);
        // Step 2: Retrieve relevant sections (use preprocessed query)
        const retrievalStartTime = Date.now();
        retrievalResults = retrieveRelevantSections(
          preprocessedQuery,
          localDocs,
          {
            maxRefs: 3, // 🆕 OPTIMIZATION: Increased from 2 to 3 for better context (DocMind AI uses 3-5)
            minScore: 0.15, // 🆕 OPTIMIZATION: Lowered from 0.2 to 0.15 for better recall
          }
        );
        const retrievalTime = Date.now() - retrievalStartTime;
        console.log(`🔍 Retrieved ${retrievalResults.length} sections in ${retrievalTime}ms`);

        // 🆕 OPTIMIZATION: Re-rank and deduplicate results (llm-search inspired)
        const reranked = rerankResults(retrievalResults, preprocessedQuery, {
          keywordDensityWeight: 0.3,
          filenameWeight: 0.4,
          positionWeight: 0.2,
          enableDiversity: true,
          maxPerDocument: 3,
        });
        
        const deduplicated = deduplicateResults(reranked, 0.75);
        retrievalResults = deduplicated;
        
        console.log(`🎯 After re-ranking & dedup: ${retrievalResults.length} results`);

        // Cache the results
        this.retrievalCache.set(cacheKey, retrievalResults);
      }

      // ============================================
      // CRITICAL CHECK: Validate retrieval results
      // ============================================
      console.log(`🔍 Retrieved ${retrievalResults.length} sections`);
      
      if (retrievalResults.length === 0) {
        // Prepare document suggestions with file types
        const docSuggestions = localDocs.slice(0, 3).map(d => {
          const type = d.filename.endsWith('.xlsx') || d.filename.endsWith('.xls') ? 'Excel' :
                       d.filename.endsWith('.pdf') ? 'PDF' :
                       d.filename.endsWith('.docx') || d.filename.endsWith('.doc') ? 'Word' :
                       d.filename.endsWith('.txt') ? 'Text' : 'Document';
          return `• ${d.filename} (${type})`;
        }).join('\n');
        
        const notFoundMessage = `✅ ${localDocs.length} belge kontrol edildi — 0 kaynak bulundu

Belgelerinizde bu bilgiye rastlamadım. 

Deneyebileceğiniz alternatifler:
1) Daha spesifik bir anahtar kelime kullanın
2) Dosya adını tam olarak yazın (örn: "Invoice-13TVEI4D-0002.docx")
3) Arama kapsamını "tüm dokümanlar" yapın

📚 Önerilen belgeler:
${docSuggestions}

Daha detay istiyorsanız hangi dosyayı inceleyeyim?`;
        
        return {
          success: true,
          payload: {
            answer: notFoundMessage,
            meta: {
              query_type: 'document_query',
              found_data: false,
              checked_documents: localDocs.length,
              found_sources: 0,
              available_documents: localDocs.map(d => d.filename),
              suggestion: 'Try more specific keywords or exact filename'
            },
            modelMeta: {
              model: 'no-data',
              latencyMs: Date.now() - startTime,
            },
          },
        };
      }

      // Log retrieval success
      console.log(`✅ ${localDocs.length} belge kontrol edildi — ${retrievalResults.length} kaynak bulundu`);
      
      if (retrievalResults.length > 0) {
        console.log('📊 Top 3 results:', retrievalResults.slice(0, 3).map(r => ({
          filename: r.filename,
          relevanceScore: r.relevanceScore.toFixed(2),
          preview: r.excerpt.substring(0, 80) + '...'
        })));
      }

      // Step 2: Extract numeric values from retrieved sections
      const allNumericValues: NumericValue[] = [];
      for (const result of retrievalResults) {
        const numericValues = extractNumericValues(result.excerpt, result.section_id);
        allNumericValues.push(...numericValues);
      }

      console.log(`🔢 Extracted ${allNumericValues.length} numeric values`);

      // EARLY RETURN: If price query with clear filename mention and numeric values, return directly
      const isPriceQuery = /bedel|tutar|fiyat|ücret|toplam|kaç|ne kadar|miktar/i.test(preprocessedQuery);
      
      // Check if query mentions a specific filename (with or without extension)
      let mentionsFilename = false;
      let targetFilename = '';
      
      if (retrievalResults.length > 0 && retrievalResults[0].relevanceScore >= 0.7) {
        const topResult = retrievalResults[0];
        const filenameWithoutExt = topResult.filename.replace(/\.\w+$/i, '');
        const queryLower = preprocessedQuery.toLowerCase();
        
        // Check various filename matching patterns
        if (queryLower.includes(filenameWithoutExt.toLowerCase()) ||
            queryLower.includes(topResult.filename.toLowerCase()) ||
            filenameWithoutExt.toLowerCase().includes(queryLower.split(' ')[0]?.toLowerCase() || '')) {
          mentionsFilename = true;
          targetFilename = topResult.filename;
          console.log(`✅ Detected filename mention: "${targetFilename}" in query`);
        }
      }
      
      if (isPriceQuery && mentionsFilename && allNumericValues.length > 0) {
        // Get the most relevant numeric value (usually the largest for invoices)
        const primaryValue = allNumericValues.length === 1 
          ? allNumericValues[0]
          : allNumericValues.reduce((max, val) => val.parsedValue > max.parsedValue ? val : max);
        
        const directAnswer = `Fatura tutarı: ${primaryValue.rawValue}`;
        
        console.log('⚡ Early return: Direct price answer:', directAnswer);
        
        return {
          success: true,
          payload: {
            answer: directAnswer,
            meta: {
              language: 'tr',
              query: preprocessedQuery,
              query_type: 'price_query_direct',
              foundReferences: retrievalResults.map(r => ({
                section_id: r.section_id,
                document_id: r.document_id,
                filename: r.filename,
                relevanceScore: r.relevanceScore,
              })),
              numericValues: allNumericValues,
              confidence: 0.95,
              notes: 'Direct price extraction - filename matched',
            },
            modelMeta: {
              model: 'direct-extraction',
              latencyMs: Date.now() - startTime,
            },
          },
        };
      }

      // Step 3: Compute aggregates if requested
      let aggregates: any = { count: 0 };
      if (options.compute && allNumericValues.length > 0) {
        aggregates = computeAggregates(allNumericValues);
        console.log('📊 Computed aggregates:', aggregates);
      }

      // ============================================
      // Step 4: Build OPTIMIZED LOCAL_DOCS for LLM (NEW FORMAT)
      // Following the new system prompt expectations
      // OPTIMIZED: Smarter context window management (inspired by DocMind AI)
      // ============================================
      const topResults = retrievalResults.slice(0, 3); // Take top 3 only
      
      // Build LOCAL_DOCS from retrieval results (only relevant sections)
      const relevantLocalDocs: any[] = [];
      const processedDocIds = new Set<string>();
      
      // 🆕 OPTIMIZATION: Dynamic section length based on number of results
      // Fewer results = more context per result
      const maxSectionLength = topResults.length <= 2 ? 800 : 500;
      const maxSectionsPerDoc = topResults.length <= 2 ? 8 : 5;
      
      console.log(`📊 Context optimization: ${topResults.length} results → ${maxSectionLength} chars/section, ${maxSectionsPerDoc} sections/doc`);
      
      for (const result of topResults) {
        if (!processedDocIds.has(result.document_id)) {
          // Find the full document
          const fullDoc = localDocs.find(d => d.documentId === result.document_id);
          if (fullDoc) {
            // Add only relevant sections (optimization)
            const relevantSections = fullDoc.textSections
              .filter((s: any) => 
                topResults.some(r => r.section_id === s.id && r.document_id === result.document_id)
              )
              .slice(0, maxSectionsPerDoc); // Dynamic limit
            
            relevantLocalDocs.push({
              documentId: fullDoc.documentId,
              filename: fullDoc.filename,
              fileType: fullDoc.fileType,
              textSections: relevantSections.map((s: any) => ({
                id: s.id,
                content: s.content.substring(0, maxSectionLength) // Dynamic limit
              }))
            });
            
            processedDocIds.add(result.document_id);
          }
        }
      }
      
      // Add numeric values to context if found
      let numericContext = '';
      if (allNumericValues.length > 0) {
        numericContext = '\n\nTESPİT EDİLEN SAYISAL DEĞERLER:\n';
        allNumericValues.slice(0, 5).forEach(nv => {
          numericContext += `• ${nv.rawValue} ${nv.currency || ''}\n`;
        });
      }

      console.log('📊 Built relevant LOCAL_DOCS:', {
        docsCount: relevantLocalDocs.length,
        totalSections: relevantLocalDocs.reduce((sum, d) => sum + d.textSections.length, 0),
        numericValues: allNumericValues.length
      });

      // ============================================
      // Step 5: Build NATURAL PROMPT following new system prompt format
      // OPTIMIZED: Shorter, more focused prompt (DocMind AI style)
      // ============================================
      const docsJson = JSON.stringify(relevantLocalDocs, null, 2);
      const maxPromptSize = 6000; // 🆕 OPTIMIZATION: Reduced from 8000 for faster processing
      const trimmedDocs = docsJson.length > maxPromptSize ? docsJson.substring(0, maxPromptSize) + '\n...(kısaltıldı)' : docsJson;
      
      const prompt = `Soru: "${preprocessedQuery}"

Kaynak (${retrievalResults.length} bulundu):
${trimmedDocs}
${numericContext}

Yanıt ver:
- Doğal ve kısa
- Belgelerdeki bilgilere dayanarak
- Liste veya bold kullanma`;

      // ============================================
      // Step 6: Get LLM response
      // ============================================
      try {
        // Filter conversation history: exclude system messages and meta queries
        const filteredHistory = (request.conversationHistory || []).filter(msg => {
          // Only keep actual document queries and user questions
          return msg.role === 'user' || !msg.content.includes('Bu dosya hakkında ne öğrenmek istersiniz?');
        });
        
        console.log('📜 Filtered conversation history:', {
          original: request.conversationHistory?.length || 0,
          filtered: filteredHistory.length,
          lastMessages: filteredHistory.slice(-3).map(m => ({ role: m.role, preview: m.content.substring(0, 50) }))
        });
        
        const response = await this.llamaClient.simpleChat(prompt, filteredHistory);
        
        // Clean response (minimal - preserve full content for document queries)
        let answer = cleanDocumentResponse(response.text.trim());
        
        console.log('✅ Final Answer:', answer.substring(0, 200) + '...');
        
        // ============================================
        // CRITICAL FIX: Check for false negatives
        // ============================================
        if (answer.includes('ilgili içerik bulunamadı') && topResults.length > 0) {
          // Override with direct answer from data
          const docNames = topResults.map(r => r.filename).join(', ');
          answer = `Belgelerinizde şu bilgiler var: ${docNames}`;
          console.log('🔧 Fixed false negative - using direct answer');
      }

      return {
        success: true,
        payload: {
            answer,
            meta: {
              query_type: 'document_query',
              sources: topResults.map(r => ({
                filename: r.filename,
                relevance: r.relevanceScore
              })),
              numeric_values: allNumericValues.length,
              model: response.model
            },
          modelMeta: {
            model: response.model,
            latencyMs: Date.now() - startTime,
          },
        },
      };
        
      } catch (error) {
        console.error('❌ LLM Error:', error);
        
        // FALLBACK: Direct answer from retrieval
        const docNames = topResults.map(r => r.filename).join(', ');
        return {
          success: true,
          payload: {
            answer: `Bu sorguyla ilgili ${topResults.length} belge buldum: ${docNames}`,
            meta: {
              query_type: 'document_query',
              fallback: true,
              sources: topResults.map(r => r.filename)
            },
            modelMeta: {
              model: 'fallback',
              latencyMs: Date.now() - startTime,
            },
          },
        };
      }
    } catch (error) {
      console.error('❌ ChatController Document Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Document AI yanıt veremedi',
      };
    }
  }

  // ============================================
  // INTENT CLASSIFICATION
  // ============================================
  private classifyIntent(query: string, localDocs: LocalDocument[]): Intent {
    const q = query.toLowerCase().trim();
    
    // CASUAL CHAT patterns
    const casualPatterns = [
      /^(merhaba|selam|hey|hi|hello)$/i,
      /^(nasılsın|naber|ne haber)/i,
      /^(teşekkür|teşekkürler|sağol|thanks)/i,
      /^(güle güle|hoşça kal|bye|görüşürüz)/i,
      /^(yardım|help)$/i,
    ];
    
    if (casualPatterns.some(p => p.test(q))) {
      return { type: 'CASUAL_CHAT', confidence: 0.95 };
    }

    // 🆕 SUMMARIZE QUERY patterns (özetle, summarize, özet)
    const summarizePatterns = [
      /^(özetle|özetle|özetini|özetini ver)/i,
      /^(summarize|summary)/i,
      /(özetle|özetini ver|özetini al|summarize)/i,
      /(özet|summary)\s+(ver|al|getir|yap|yaz)/i,
    ];

    if (summarizePatterns.some(p => p.test(q))) {
      return { type: 'SUMMARIZE_QUERY', confidence: 0.9, handler: 'summarize' };
    }
    
    // META QUERY patterns (about documents themselves)
    // 🆕 FIX: Removed ^ anchor to match anywhere in query
    const metaPatterns = [
      // Invoice-specific queries (CHECK FIRST - more specific)
      { pattern: /(elimde|elinde).*(fatura|invoice)/i, handler: 'invoice_list' },
      { pattern: /(fatura|invoice).*(var|neler|liste|hangi)/i, handler: 'invoice_list' },
      { pattern: /(kaç|kaç tane).*(fatura|invoice)/i, handler: 'invoice_count' },
      { pattern: /(hangi|ne|neler).*(fatura|invoice)/i, handler: 'invoice_list' },
      // General document queries
      { pattern: /(kaç|kaç tane).*(belge|döküman|dosya|doküman)/i, handler: 'document_count' },
      { pattern: /(hangi|ne|neler).*(belge|döküman|dosya|doküman)/i, handler: 'document_list' },
      { pattern: /hangi belgeler/i, handler: 'document_list' },
      { pattern: /hangi dosyalar/i, handler: 'document_list' },
      { pattern: /belgeler.*var/i, handler: 'document_list' },
      { pattern: /(döküman|doküman|belge|dosya).*var/i, handler: 'document_list' },
      { pattern: /elinde.*(döküman|doküman|belge|dosya)/i, handler: 'document_list' },
      { pattern: /belgeler.*neler/i, handler: 'document_list' },
      { pattern: /döküman.*liste/i, handler: 'document_list' },
      { pattern: /doküman.*liste/i, handler: 'document_list' },
      { pattern: /^liste$/i, handler: 'document_list' },
      { pattern: /^belgeler$/i, handler: 'document_list' },
    ];
    
    for (const { pattern, handler } of metaPatterns) {
      if (pattern.test(q)) {
        return { type: 'META_QUERY', confidence: 0.9, handler };
      }
    }
    
    // Check if query is just a filename (without asking anything)
    // Example: "sample-invoice.pdf" or "Employee Sample Data.xlsx"
    const isJustFilename = /^[\w\-\s]+\.(pdf|xlsx?|docx?|txt|csv|json)$/i.test(q);
    if (isJustFilename) {
      return { type: 'META_QUERY', confidence: 0.85, handler: 'file_info' };
    }
    
    // DOCUMENT QUERY (default)
    return { type: 'DOCUMENT_QUERY', confidence: 0.8 };
  }

  // ============================================
  // CASUAL CHAT HANDLER
  // ============================================
  private async handleCasualChat(
    query: string, 
    conversationHistory: ChatMessage[],
    startTime: number
  ): Promise<DocumentChatQueryResponse> {
    const q = query.toLowerCase().trim();
    
    // Predefined responses for common queries
    const responses: Record<string, string> = {
      'merhaba': 'Merhaba! Belgeleriniz hakkında size nasıl yardımcı olabilirim?',
      'selam': 'Selam! Belgelerinizi analiz etmeme yardımcı olabilirim.',
      'nasılsın': 'İyiyim, teşekkürler! Belgelerinizle ilgili sorularınızı yanıtlamaya hazırım.',
      'teşekkürler': 'Rica ederim! Başka bir şey sormak isterseniz buradayım.',
      'teşekkür': 'Rica ederim! Başka bir şey sormak isterseniz buradayım.',
      'sağol': 'Rica ederim! Size yardımcı olmaktan mutluluk duyarım.',
      'yardım': `Size şu konularda yardımcı olabilirim:

📚 **Belge Bilgisi:**
• "Hangi belgeler var?" — Yüklü belgeleri listeler
• "Kaç belge var?" — Toplam belge sayısı

🔍 **İçerik Arama:**
• "sample invoice fatura tutarı kaç?" — Fatura tutarını bulur
• "Employee dosyasında kaç kişi var?" — Excel verilerini sayar

💡 **İpucu:** Dosya adını tam veya kısmi yazabilirsiniz (örn: "Invoice-13TVEI4D")`,
    };
    
    // Find matching response
    for (const [key, response] of Object.entries(responses)) {
      if (q.includes(key)) {
        return {
          success: true,
          payload: {
            answer: response,
            meta: {
              query_type: 'casual_chat',
              intent: key
            },
            modelMeta: {
              model: 'predefined',
              latencyMs: Date.now() - startTime,
            }
          }
        };
      }
    }
    
    // If no match, use LLM for natural conversation
    try {
      const casualPrompt = `Sen yardımsever bir asistansın. Kullanıcı şunu söyledi: "${query}"
    
Kısa ve doğal bir cevap ver (1-2 cümle). Belgelerle ilgili değilse sohbet et.`;

      const llmResponse = await this.llamaClient.simpleChat(casualPrompt, conversationHistory);
      
      return {
        success: true,
        payload: {
          answer: cleanCasualResponse(llmResponse.text), // Short answer for casual chat
          meta: {
            query_type: 'casual_chat',
            model: llmResponse.model
          },
          modelMeta: {
            model: llmResponse.model,
            latencyMs: Date.now() - startTime,
          }
        }
      };
    } catch (error) {
      return {
        success: true,
        payload: {
          answer: 'Size nasıl yardımcı olabilirim?',
          meta: { query_type: 'casual_chat', fallback: true },
          modelMeta: {
            model: 'fallback',
            latencyMs: Date.now() - startTime,
          }
        }
      };
    }
  }

  // ============================================
  // META QUERY HANDLER (Direct Answers)
  // ============================================
  private handleMetaQuery(
    query: string,
    localDocs: LocalDocument[],
    intent: Intent,
    startTime: number
  ): DocumentChatQueryResponse {
    
    if (intent.handler === 'document_count') {
      return {
        success: true,
        payload: {
          answer: `Toplam ${localDocs.length} belge yüklü.`,
          meta: {
            query_type: 'meta_query',
            document_count: localDocs.length,
            intent: 'document_count'
          },
          modelMeta: {
            model: 'direct-meta',
            latencyMs: Date.now() - startTime,
          }
        }
      };
    }
    
    if (intent.handler === 'invoice_count') {
      // Count invoices by filename pattern or content
      const invoiceDocs = localDocs.filter(d => 
        /invoice|fatura/i.test(d.filename) || 
        /invoice|fatura/i.test(d.title || '')
      );
      
      return {
        success: true,
        payload: {
          answer: `Toplam ${invoiceDocs.length} fatura bulundu:\n\n${invoiceDocs.map(d => `• ${d.filename}`).join('\n')}`,
          meta: {
            query_type: 'meta_query',
            invoice_count: invoiceDocs.length,
            total_documents: localDocs.length,
            intent: 'invoice_count',
            invoices: invoiceDocs.map(d => d.filename)
          },
          modelMeta: {
            model: 'direct-meta',
            latencyMs: Date.now() - startTime,
          }
        }
      };
    }
    
    if (intent.handler === 'invoice_list') {
      const invoiceDocs = localDocs.filter(d => 
        /invoice|fatura/i.test(d.filename) || 
        /invoice|fatura/i.test(d.title || '')
      );
      
      if (invoiceDocs.length === 0) {
        return {
          success: true,
          payload: {
            answer: `Fatura bulunamadı. Toplam ${localDocs.length} belge var ama hiçbiri fatura değil.`,
            meta: {
              query_type: 'meta_query',
              invoice_count: 0,
              intent: 'invoice_list'
            },
            modelMeta: {
              model: 'direct-meta',
              latencyMs: Date.now() - startTime,
            }
          }
        };
      }
      
      const docList = invoiceDocs.map(d => {
        const sectionCount = d.textSections?.length || 0;
        return `• ${d.filename} (${sectionCount} bölüm)`;
      }).join('\n');
      
      return {
        success: true,
        payload: {
          answer: `Toplam ${invoiceDocs.length} fatura bulundu:\n\n${docList}`,
          meta: {
            query_type: 'meta_query',
            invoice_count: invoiceDocs.length,
            intent: 'invoice_list',
            invoices: invoiceDocs.map(d => d.filename)
          },
          modelMeta: {
            model: 'direct-meta',
            latencyMs: Date.now() - startTime,
          }
        }
      };
    }
    
    if (intent.handler === 'document_list') {
      const docList = localDocs.map(d => {
        const type = d.filename.endsWith('.xlsx') || d.filename.endsWith('.xls') ? 'Excel' :
                     d.filename.endsWith('.pdf') ? 'PDF' :
                     d.filename.endsWith('.docx') || d.filename.endsWith('.doc') ? 'Word' :
                     d.filename.endsWith('.txt') ? 'Text' :
                     d.filename.endsWith('.json') ? 'JSON' : 'Document';
        
        // Add section count if available
        const sectionCount = d.textSections?.length || 0;
        const sectionInfo = sectionCount > 0 ? ` (${sectionCount} bölüm)` : '';
        
        return `• ${d.filename} (${type})${sectionInfo}`;
      }).join('\n');
      
      const answer = `Toplam ${localDocs.length} belge yüklü:\n\n${docList}\n\nDaha fazla bilgi için dosya adını yazabilirsiniz.`;
      
      return {
        success: true,
        payload: {
          answer,
          meta: {
            query_type: 'meta_query',
            document_count: localDocs.length,
            document_names: localDocs.map(d => d.filename),
            total_sections: localDocs.reduce((sum, d) => sum + (d.textSections?.length || 0), 0),
            intent: 'document_list'
          },
          modelMeta: {
            model: 'direct-meta',
            latencyMs: Date.now() - startTime,
          }
        }
      };
    }
    
    if (intent.handler === 'file_info') {
      // User asked about a specific file
      const filename = query.trim();
      const matchedDoc = localDocs.find(d => 
        d.filename.toLowerCase() === filename.toLowerCase() ||
        d.filename.toLowerCase().includes(filename.toLowerCase().replace(/\.\w+$/, ''))
      );
      
      if (matchedDoc) {
        const type = matchedDoc.filename.endsWith('.xlsx') || matchedDoc.filename.endsWith('.xls') ? 'Excel' :
                     matchedDoc.filename.endsWith('.pdf') ? 'PDF' :
                     matchedDoc.filename.endsWith('.docx') || matchedDoc.filename.endsWith('.doc') ? 'Word' :
                     matchedDoc.filename.endsWith('.txt') ? 'Text' : 'Belge';
        
        const sectionCount = matchedDoc.textSections?.length || 0;
        
        let answer = `📄 **${matchedDoc.filename}**\n\n`;
        answer += `Tür: ${type}\n`;
        answer += `Bölüm sayısı: ${sectionCount}\n\n`;
        answer += `Bu dosya hakkında ne öğrenmek istersiniz?\n`;
        answer += `• "Bu dosyada ne var?"\n`;
        answer += `• "Fatura tutarı nedir?"\n`;
        answer += `• "İçeriği özetle"`;
        
        return {
          success: true,
          payload: {
            answer,
            meta: {
              query_type: 'meta_query',
              intent: 'file_info',
              filename: matchedDoc.filename,
              file_type: type,
              sections: sectionCount
            },
            modelMeta: {
              model: 'direct-meta',
              latencyMs: Date.now() - startTime,
            }
          }
        };
      } else {
        return {
          success: true,
          payload: {
            answer: `"${filename}" dosyasını bulamadım. Yüklü dosyalarınız:\n\n${localDocs.map(d => `• ${d.filename}`).join('\n')}`,
            meta: {
              query_type: 'meta_query',
              intent: 'file_info',
              error: 'file_not_found'
            },
            modelMeta: {
              model: 'direct-meta',
              latencyMs: Date.now() - startTime,
            }
          }
        };
      }
    }
    
    // Fallback
    return {
      success: false,
      error: 'Meta query handler not found',
      payload: {
        answer: 'Meta query handler not found',
        modelMeta: {
          model: 'error',
          latencyMs: Date.now() - startTime,
        }
      }
    };
  }

  // ============================================
  // 🆕 SUMMARIZE QUERY HANDLER (AI-Powered Summaries)
  // ============================================
  private async handleSummarizeQuery(
    query: string,
    localDocs: LocalDocument[],
    startTime: number
  ): Promise<DocumentChatQueryResponse> {
    try {
      // Extract filename from query (if any)
      const filenameMatch = query.match(/([a-zA-Z0-9\-_]+\.(pdf|xlsx?|docx?|txt|csv))/i);
      const filename = filenameMatch ? filenameMatch[1] : null;

      // Find target document
      let targetDoc: LocalDocument | null = null;
      
      if (filename) {
        const foundDoc = localDocs.find(d => 
          d.filename.toLowerCase() === filename.toLowerCase() ||
          d.filename.toLowerCase().includes(filename.toLowerCase().replace(/\.\w+$/, ''))
        );
        targetDoc = foundDoc || null;
      } else if (localDocs.length === 1) {
        // If only one document, summarize it
        targetDoc = localDocs[0];
      }

      if (!targetDoc) {
        const docList = localDocs.map(d => `• ${d.filename}`).join('\n');
        return {
          success: true,
          payload: {
            answer: `📝 Hangi belgeyi özetlememi istersiniz?\n\nMevcut belgeler:\n${docList}\n\nÖrnek: "Invoice-13TVEI4D-0002.docx özetle"`,
            meta: {
              query_type: 'summarize_query',
              error: 'no_target_document',
            },
            modelMeta: {
              model: 'direct-meta',
              latencyMs: Date.now() - startTime,
            },
          },
        };
      }

      // Gather document text
      const documentText = targetDoc.textSections?.map(s => s.content).join('\n') || '';
      
      if (!documentText) {
        return {
          success: true,
          payload: {
            answer: `⚠️ "${targetDoc.filename}" için metin içeriği bulunamadı.`,
            meta: {
              query_type: 'summarize_query',
              error: 'no_content',
              filename: targetDoc.filename,
            },
            modelMeta: {
              model: 'error',
              latencyMs: Date.now() - startTime,
            },
          },
        };
      }

      console.log(`📝 Generating summary for: ${targetDoc.filename}`);

      // Generate summary using DocumentSummarizer
      const summaryResult = await this.summarizer.summarize(documentText, 'diger', {
        maxLength: 150,
        language: 'tr',
        style: 'brief',
      });

      if (!summaryResult.success) {
        return {
          success: false,
          error: summaryResult.error,
          payload: {
            answer: `❌ Özet oluştururken hata oluştu: ${summaryResult.error}`,
            meta: {
              query_type: 'summarize_query',
              error: summaryResult.error,
            },
            modelMeta: {
              model: 'error',
              latencyMs: Date.now() - startTime,
            },
          },
        };
      }

      // Format response
      let answer = `📄 **${targetDoc.filename} Özeti**\n\n`;
      answer += `${summaryResult.summary}\n\n`;
      
      if (summaryResult.keyPoints.length > 0) {
        answer += `**Anahtar Noktalar:**\n`;
        summaryResult.keyPoints.forEach(point => {
          answer += `• ${point}\n`;
        });
      }

      return {
        success: true,
        payload: {
          answer,
          meta: {
            query_type: 'summarize_query',
            filename: targetDoc.filename,
            summary: summaryResult.summary,
            keyPoints: summaryResult.keyPoints,
            confidence: summaryResult.confidence,
            processingTimeMs: summaryResult.processingTimeMs,
          },
          modelMeta: {
            model: 'ai-summarizer',
            latencyMs: Date.now() - startTime,
          },
        },
      };
    } catch (error) {
      console.error('❌ Summarize query error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        payload: {
          answer: `❌ Özet oluştururken beklenmeyen bir hata oluştu.`,
          meta: {
            query_type: 'summarize_query',
            error: String(error),
          },
          modelMeta: {
            model: 'error',
            latencyMs: Date.now() - startTime,
          },
        },
      };
    }
  }

  // ============================================
  // CONTEXT ENRICHMENT - Extract Last Mentioned Document
  // ============================================
  private extractLastMentionedDocument(
    conversationHistory: any[],
    localDocs: LocalDocument[]
  ): string | null {
    console.log(`🔍 Searching for document in ${conversationHistory.length} messages`);
    
    // Check last 5 messages (most recent first)
    const recentMessages = conversationHistory.slice(-5).reverse();
    
    for (let i = 0; i < recentMessages.length; i++) {
      const message = recentMessages[i];
      // Handle both ChatMessage format and {role, content} format
      const content = (message.content || message.text || '').toLowerCase();
      
      console.log(`📝 Message ${i}: "${content.substring(0, 100)}..."`);
      
      // Try to find any document name mentioned
      for (const doc of localDocs) {
        const filename = doc.filename;
        const filenameWithoutExt = filename.replace(/\.(pdf|docx?|xlsx?|pptx?|txt)$/i, '');
        
        // Strategy 1: Exact filename match
        if (content.includes(filename.toLowerCase())) {
          console.log(`✅ Found exact match: ${filename}`);
          return filename;
        }
        
        // Strategy 2: Filename without extension
        if (content.includes(filenameWithoutExt.toLowerCase())) {
          console.log(`✅ Found match (no ext): ${filename}`);
          return filename;
        }
        
        // Strategy 3: Check for ID patterns (e.g., "Invoice-13TVEI4D")
        const idMatches = filenameWithoutExt.match(/[a-zA-Z]+-[a-zA-Z0-9]+/gi) || [];
        for (const id of idMatches) {
          if (content.includes(id.toLowerCase())) {
            console.log(`✅ Found ID match: ${id} in ${filename}`);
            return filename;
          }
        }
        
        // Strategy 4: Partial word matches (significant parts)
        const filenameParts = filenameWithoutExt.split(/[\s\-_]+/).filter(p => p.length > 4);
        for (const part of filenameParts) {
          if (content.includes(part.toLowerCase())) {
            console.log(`✅ Found part match: ${part} in ${filename}`);
            return filename;
          }
        }
      }
    }
    
    console.log('❌ No document found in conversation history');
    return null;
  }

  // ============================================
  // AGGREGATE QUERY HANDLER (NEW - Following Rag-workflow.md Section 10)
  // ============================================
  private handleAggregateQuery(
    query: string,
    localDocs: LocalDocument[],
    startTime: number
  ): DocumentChatQueryResponse {
    console.log('📊 Processing aggregate query:', query);

    try {
      // Parse query into AggregateQuery
      const aggregateQuery = AggregationService.parseQuery(query);

      if (!aggregateQuery) {
        throw new Error('Failed to parse aggregate query');
      }

      // Convert LocalDocument to NormalizedDocument (if metadata available)
      const normalizedDocs: NormalizedDocument[] = [];
      
      for (const doc of localDocs) {
        // Try to extract normalized metadata if available
        const metadata = (doc as any).metadata || {};
        
        if (metadata.type && metadata.confidence !== undefined) {
          // This document has canonical schema metadata
          normalizedDocs.push({
            schema_v: metadata.schema_v || 1,
            id: doc.documentId,
            filename: doc.filename,
            type: metadata.type,
            invoice_no: metadata.invoice_no || null,
            date: metadata.date || null,
            supplier: metadata.supplier || null,
            buyer: metadata.buyer || null,
            currency: metadata.currency || null,
            total: metadata.total || null,
            tax: metadata.tax || null,
            items: [],
            raw_path: metadata.raw_path || doc.filename,
            file_type: metadata.file_type || doc.fileType,
            confidence: {
              classification: metadata.confidence || 0.5,
            },
            normalized_at: metadata.normalized_at || new Date().toISOString(),
            source_sample: '',
            needs_human_review: metadata.needs_human_review || false,
          });
        } else {
          // Fallback: create basic normalized document
          console.warn('Document lacks canonical schema metadata:', doc.filename);
        }
      }

      if (normalizedDocs.length === 0) {
        console.warn('⚠️ No normalized documents found. Documents need classification.');
        
        // HELPFUL: Provide migration instructions
        const docList = localDocs.map(d => `• ${d.filename}`).join('\n');
        
        return {
          success: true,
          payload: {
            answer: `📊 ${localDocs.length} belge bulundu, ancak analiz için normalize edilmeli.

Mevcut belgeler:
${docList}

✅ Çözüm: Belgeleri yeniden yükleyin veya browser console'da şu komutu çalıştırın:
\`\`\`javascript
await window.aiAPI.migrateAllDocuments()
\`\`\`

Bu komut mevcut belgeleri otomatik olarak sınıflandırıp normalize edecek.`,
            meta: {
              query_type: 'aggregate_query',
              error: 'no_normalized_documents',
              total_documents: localDocs.length,
              needs_migration: true,
            },
            modelMeta: {
              model: 'aggregate-error',
              latencyMs: Date.now() - startTime,
            },
          },
        };
      }

      // Execute aggregation
      const result = this.aggregationService.aggregate(normalizedDocs, aggregateQuery);

      console.log('✅ Aggregation result:', result);

      // Format response
      let answer = result.naturalLanguage;

      // Add source info
      if (result.sources.length > 0 && result.sources.length <= 5) {
        answer += `\n\nKaynaklar:\n${result.sources.slice(0, 5).map(id => {
          const doc = normalizedDocs.find(d => d.id === id);
          return doc ? `• ${doc.filename}` : `• ${id}`;
        }).join('\n')}`;
      }

      return {
        success: true,
        payload: {
          answer,
          meta: {
            query_type: 'aggregate_query',
            operation: aggregateQuery.operation,
            field: aggregateQuery.field,
            result_value: result.value,
            sources_count: result.count,
            confidence: 1.0, // Aggregation is deterministic
          },
          modelMeta: {
            model: 'aggregation-service',
            latencyMs: Date.now() - startTime,
          },
        },
      };

    } catch (error) {
      console.error('❌ Aggregation query failed:', error);

      // Fallback to normal document query
      console.log('⚠️ Falling back to normal document query');
      return {
        success: true,
        payload: {
          answer: 'Sayısal hesaplama yapılamadı. Lütfen soruyu daha açık bir şekilde sorun veya belgeleri inceleyin.',
          meta: {
            query_type: 'aggregate_query',
            error: 'aggregation_failed',
            fallback: true,
          },
          modelMeta: {
            model: 'aggregate-error',
            latencyMs: Date.now() - startTime,
          },
        },
      };
    }
  }
}
