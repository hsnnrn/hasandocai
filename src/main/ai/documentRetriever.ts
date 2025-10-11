/**
 * Document Retriever - LOCAL_DOCS retrieval with keyword, n-gram, and semantic matching
 * 
 * OPTIMIZATIONS:
 * - Inverted index for O(1) keyword lookups
 * - Pre-computed normalization cache
 * - Smart cascading scoring pipeline
 * - Context pruning for LLM
 * - BM25 ranking for better keyword relevance
 */

import { BM25Ranker } from './bm25Ranker';

export interface TextSection {
  id: string;
  content: string;
  contentLength: number;
}

export interface LocalDocument {
  documentId: string;
  title: string;
  filename: string;
  fileType: string;
  textSections: TextSection[];
}

export interface RetrievalResult {
  section_id: string;
  document_id: string;
  filename: string;
  excerpt: string;
  relevanceScore: number;
  page?: number;
  matchType: 'exact' | 'partial' | 'ngram' | 'semantic';
}

export interface NumericValue {
  section_id: string;
  rawValue: string;
  parsedValue: number;
  currency?: string;
}

export type QueryIntent = 'PRICE_QUERY' | 'LIST_QUERY' | 'GENERAL';

/**
 * Normalized document cache entry
 */
interface NormalizedDocCache {
  sectionId: string;
  documentId: string;
  filename: string;
  originalText: string;
  normalizedText: string;
  normalizedWords: Set<string>;
  nGrams: Set<string>; // pre-computed trigrams
  page: number;
}

/**
 * Inverted index structure
 */
interface InvertedIndex {
  [normalizedWord: string]: Set<string>; // word -> sectionIds
}

/**
 * Global cache storage
 */
let normalizedCache: Map<string, NormalizedDocCache> = new Map();
let invertedIndex: InvertedIndex = {};
let lastDocumentHash: string = '';
let bm25Ranker: BM25Ranker | null = null;

/**
 * Force invalidate the retrieval cache (call when documents change)
 */
export function invalidateRetrievalCache(): void {
  normalizedCache.clear();
  invertedIndex = {};
  lastDocumentHash = '';
  if (bm25Ranker) {
    bm25Ranker.clear();
  }
  console.log('🔄 Retrieval cache invalidated (including BM25)');
}

/**
 * Normalize Turkish text for comparison
 * OPTIMIZED: Keep currency symbols and numbers intact
 */
function normalizeTurkish(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
    // NOTE: We intentionally keep ₺$€.,- for currency/number matching
}

/**
 * Normalize filename for matching
 * IMPROVED: Preserve IDs and special patterns like Invoice-13TVEI4D
 */
function normalizeFilename(filename: string): string {
  // Remove extension
  const withoutExt = filename.replace(/\.(pdf|docx?|xlsx?|pptx?|txt)$/i, '');
  
  // Don't replace dashes if they're part of an ID pattern (letters+dash+alphanumeric)
  // Examples: Invoice-13TVEI4D, DOC-2024-001, File-ABC123
  const hasIDPattern = /[a-zA-Z]+-[a-zA-Z0-9]+/i.test(withoutExt);
  
  if (hasIDPattern) {
    // Preserve the ID, only normalize Turkish characters
    return normalizeTurkish(withoutExt);
  } else {
    // Normal case: replace dashes/underscores with spaces
    return normalizeTurkish(withoutExt.replace(/[-_]/g, ' '));
  }
}

/**
 * Detect query intent based on keywords
 */
function detectQueryIntent(query: string): QueryIntent {
  const normalizedQuery = normalizeTurkish(query);
  
  // Price/amount keywords
  const priceKeywords = ['bedel', 'tutar', 'fiyat', 'ucret', 'toplam', 'kac', 'ne kadar', 'miktar', 'odeme', 'para'];
  if (priceKeywords.some(kw => normalizedQuery.includes(kw))) {
    return 'PRICE_QUERY';
  }
  
  // List keywords
  const listKeywords = ['listele', 'goster', 'neler var', 'hepsi', 'butun', 'tum', 'hangi belgeler'];
  if (listKeywords.some(kw => normalizedQuery.includes(kw))) {
    return 'LIST_QUERY';
  }
  
  return 'GENERAL';
}

/**
 * Generate n-grams from text
 */
function getNGrams(text: string, n: number = 3): string[] {
  const normalized = normalizeTurkish(text);
  const words = normalized.split(/\s+/);
  const ngrams: string[] = [];

  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(' '));
  }

  return ngrams;
}

/**
 * Calculate Jaccard similarity between two sets
 */
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Generate hash for documents to detect changes
 */
function generateDocumentHash(docs: LocalDocument[]): string {
  const ids = docs.map(d => d.documentId).sort().join('|');
  return ids;
}

/**
 * Build inverted index and normalized cache from documents
 */
function buildIndexAndCache(localDocs: LocalDocument[]): void {
  const startTime = Date.now();
  
  normalizedCache.clear();
  invertedIndex = {};

  for (const doc of localDocs) {
    // Extract filename keywords (without extension)
    const filenameNormalized = normalizeFilename(doc.filename);
    const filenameWords = filenameNormalized.split(/[\s\-_]+/).filter(w => w.length > 2);
    
    for (let i = 0; i < doc.textSections.length; i++) {
      const section = doc.textSections[i];
      const normalizedText = normalizeTurkish(section.content);
      const contentWords = normalizedText.split(/\s+/).filter(w => w.length > 2);
      
      // Combine content words + filename words for this section
      const allWords = [...contentWords, ...filenameWords];
      const normalizedWords = new Set(allWords);
      const nGrams = new Set(getNGrams(section.content, 3));

      // Build normalized cache
      const cacheEntry: NormalizedDocCache = {
        sectionId: section.id,
        documentId: doc.documentId,
        filename: doc.filename,
        originalText: section.content,
        normalizedText,
        normalizedWords,
        nGrams,
        page: i + 1,
      };
      
      normalizedCache.set(section.id, cacheEntry);

      // Build inverted index (includes both content and filename words)
      for (const word of allWords) {
        if (!invertedIndex[word]) {
          invertedIndex[word] = new Set();
        }
        invertedIndex[word].add(section.id);
      }
    }
  }

  // Build BM25 index
  bm25Ranker = new BM25Ranker({
    k1: 1.5,  // Higher for invoice/document search (more weight to term frequency)
    b: 0.75,  // Standard length normalization
  });

  const bm25Docs = Array.from(normalizedCache.values()).map(cached => ({
    id: cached.sectionId,
    text: cached.originalText,
  }));

  bm25Ranker.addDocuments(bm25Docs);

  const elapsed = Date.now() - startTime;
  console.log(`🚀 Built inverted index, cache, and BM25: ${normalizedCache.size} sections, ${Object.keys(invertedIndex).length} unique words in ${elapsed}ms`);
}

/**
 * Extract numeric values from text (Turkish locale)
 */
export function extractNumericValues(text: string, sectionId: string): NumericValue[] {
  const results: NumericValue[] = [];

  // Pattern 1: Currency symbols (₺, $, €, £) followed by numbers
  const currencyPattern1 = /([₺$€£])\s*([\d.,]+)/g;
  let match: RegExpExecArray | null;
  
  while ((match = currencyPattern1.exec(text)) !== null) {
    const symbol = match[1];
    const rawValue = match[2];
    const parsedValue = parseTurkishNumber(rawValue);
    
    if (!isNaN(parsedValue)) {
      results.push({
        section_id: sectionId,
        rawValue: `${symbol}${rawValue}`,
        parsedValue,
        currency: getCurrencyFromSymbol(symbol),
      });
    }
  }

  // Pattern 2: Numbers followed by currency codes (TRY, TL, USD, EUR, etc.)
  const currencyPattern2 = /([\d.,]+)\s*(TRY|TL|USD|EUR|GBP|EURO)/gi;
  
  while ((match = currencyPattern2.exec(text)) !== null) {
    const rawValue = match[1];
    const currencyCode = match[2].toUpperCase();
    const parsedValue = parseTurkishNumber(rawValue);
    
    if (!isNaN(parsedValue)) {
      results.push({
        section_id: sectionId,
        rawValue: `${rawValue} ${currencyCode}`,
        parsedValue,
        currency: normalizeCurrency(currencyCode),
      });
    }
  }

  // Pattern 3: Standalone numbers (no currency)
  const numberPattern = /\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\b/g;
  
  while ((match = numberPattern.exec(text)) !== null) {
    const rawValue = match[1];
    const parsedValue = parseTurkishNumber(rawValue);
    
    // Only include if it looks like a financial number (has decimal or is large)
    if (!isNaN(parsedValue) && (rawValue.includes(',') || rawValue.includes('.') || parsedValue >= 100)) {
      // Check if this number wasn't already captured by currency patterns
      const alreadyCaptured = results.some(r => r.rawValue.includes(rawValue));
      if (!alreadyCaptured) {
        results.push({
          section_id: sectionId,
          rawValue,
          parsedValue,
        });
      }
    }
  }

  return results;
}

/**
 * Parse Turkish-formatted number (e.g., "1.234,56" -> 1234.56)
 */
function parseTurkishNumber(text: string): number {
  // Turkish format: 1.234,56 (dot for thousands, comma for decimal)
  // Also support: 1,234.56 (English format)
  
  let cleaned = text.trim();
  
  // Detect format based on last separator
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  
  if (lastComma > lastDot) {
    // Turkish format: 1.234,56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // English format: 1,234.56
    cleaned = cleaned.replace(/,/g, '');
  }
  
  return parseFloat(cleaned);
}

/**
 * Get currency code from symbol
 */
function getCurrencyFromSymbol(symbol: string): string {
  const mapping: Record<string, string> = {
    '₺': 'TRY',
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
  };
  return mapping[symbol] || 'UNKNOWN';
}

/**
 * Normalize currency code
 */
function normalizeCurrency(code: string): string {
  const normalized = code.toUpperCase();
  if (normalized === 'TL') return 'TRY';
  if (normalized === 'EURO') return 'EUR';
  return normalized;
}

/**
 * Retrieve relevant sections from LOCAL_DOCS
 * OPTIMIZED with inverted index and smart scoring pipeline
 */
export function retrieveRelevantSections(
  query: string,
  localDocs: LocalDocument[],
  options: {
    maxRefs?: number;
    minScore?: number;
  } = {}
): RetrievalResult[] {
  const startTime = Date.now();
  console.log('🎯 retrieveRelevantSections called with query:', query);
  console.log('📊 localDocs count:', localDocs.length);
  
  // DEBUG: Log all document filenames
  console.log('📄 Available documents:', localDocs.map(d => ({
    filename: d.filename,
    documentId: d.documentId,
    sectionsCount: d.textSections.length
  })));
  
  const maxRefs = options.maxRefs || 5;
  // 🆕 OPTIMIZATION: Lowered minScore for better recall (old: 0.2 → new: 0.1)
  const minScore = options.minScore || 0.1;

  // Build index and cache if documents changed
  const currentHash = generateDocumentHash(localDocs);
  if (currentHash !== lastDocumentHash) {
    buildIndexAndCache(localDocs);
    lastDocumentHash = currentHash;
  }

  // DETECT QUERY INTENT
  const queryIntent = detectQueryIntent(query);
  console.log('🎯 Query intent detected:', queryIntent);

  const results: RetrievalResult[] = [];
  
  // IMPROVED: Remove file extensions from query before normalization
  const queryWithoutExtension = query.replace(/\.(pdf|docx?|xlsx?|pptx?|txt)$/i, '');
  const normalizedQuery = normalizeTurkish(queryWithoutExtension);
  // Split by spaces, hyphens, and underscores to match filename words
  const queryWords = normalizedQuery.split(/[\s\-_]+/).filter(w => w.length > 2);

  console.log('🔤 Original query:', query);
  console.log('🔤 Query without extension:', queryWithoutExtension);
  console.log('🔤 normalizedQuery:', normalizedQuery);
  console.log('📝 queryWords (split by spaces/hyphens/underscores):', queryWords);

  // Special handling for very general queries (only explicit document listing queries)
  const isGeneralQuery = /^(belge|dosya|dokuman|ne var|neler var|listele|goster|hepsi)$/i.test(query.trim()) 
    || (queryWords.length <= 2 && /^(nedir|ne|var)$/i.test(queryWords[queryWords.length - 1] || ''));

  if (isGeneralQuery) {
    console.log('🔍 General query detected, returning document overview');
    for (const doc of localDocs) {
      const sectionsToShow = Math.min(10, doc.textSections.length);
      let combinedContent = '';
      for (let i = 0; i < sectionsToShow; i++) {
        combinedContent += doc.textSections[i].content + ' ';
      }
      
      const excerpt = combinedContent.length > 500 
        ? combinedContent.substring(0, 500) + '...'
        : combinedContent;

      results.push({
        section_id: doc.textSections[0].id,
        document_id: doc.documentId,
        filename: doc.filename,
        excerpt: excerpt.trim(),
        relevanceScore: 0.95,
        page: 1,
        matchType: 'exact',
      });
    }
    const elapsed = Date.now() - startTime;
    console.log(`⚡ Retrieval completed in ${elapsed}ms (general query)`);

    // ✅ FIX: For LIST_QUERY, return ALL documents (not limited by maxRefs)
    // This ensures "Hangi belgeler var?" shows all uploaded documents
    return queryIntent === 'LIST_QUERY' ? results : results.slice(0, maxRefs);
  }

  // SMART SCORING PIPELINE - Cascading approach with BM25

  // STEP 0: Get BM25 scores for all documents
  const bm25Scores = new Map<string, number>();
  if (bm25Ranker) {
    const bm25Results = bm25Ranker.search(query, 100); // Get top 100 from BM25
    for (const result of bm25Results) {
      bm25Scores.set(result.documentId, result.score);
    }
    console.log(`🔍 BM25: Scored ${bm25Results.length} sections (top score: ${bm25Results[0]?.score.toFixed(2) || 0})`);
  }

  // STEP 1: Check for filename matches first (high priority) - IMPROVED
  const filenameMatchedDocs = new Map<string, number>(); // documentId -> match score
  for (const doc of localDocs) {
    const normalizedFilename = normalizeFilename(doc.filename);
    const filenameWords = normalizedFilename.split(/[\s\-_]+/).filter(w => w.length > 2);
    
    let bestMatchScore = 0;
    let matchDetails = '';
    
    // Check each query word against each filename word
    for (const qw of queryWords) {
      for (const fw of filenameWords) {
        let matchScore = 0;
        
        // EXACT match (highest priority)
        if (qw === fw) {
          matchScore = 1.0;
          matchDetails = `exact: "${qw}" = "${fw}"`;
        }
        // PREFIX match (very high priority) - e.g., "photobox" matches "photobox360"
        else if (fw.startsWith(qw) && qw.length >= 4) {
          matchScore = 0.95 - (fw.length - qw.length) * 0.05; // Slight penalty for length difference
          matchDetails = `prefix: "${qw}" → "${fw}"`;
        }
        // CONTAINS match (high priority) - e.g., "box360" matches "photobox360"
        else if (fw.includes(qw) && qw.length >= 4) {
          matchScore = 0.85;
          matchDetails = `contains: "${qw}" ⊂ "${fw}"`;
        }
        // REVERSE: filename word is prefix of query word
        else if (qw.startsWith(fw) && fw.length >= 4) {
          matchScore = 0.75;
          matchDetails = `reverse-prefix: "${fw}" → "${qw}"`;
        }
        // PARTIAL: query contains filename word
        else if (qw.includes(fw) && fw.length >= 4) {
          matchScore = 0.65;
          matchDetails = `reverse-contains: "${fw}" ⊂ "${qw}"`;
        }
        
        if (matchScore > bestMatchScore) {
          bestMatchScore = matchScore;
        }
      }
    }
    
    if (bestMatchScore > 0) {
      filenameMatchedDocs.set(doc.documentId, bestMatchScore);
      console.log(`📁 Filename match found: "${doc.filename}" (score: ${bestMatchScore.toFixed(2)}, ${matchDetails})`);
    }
  }

  // STEP 2: Get candidate sections using inverted index (O(1) per word)
  // 🆕 OPTIMIZATION: Add partial/substring matching for better recall
  const candidateSections = new Set<string>();
  
  for (const word of queryWords) {
    // Exact match (fast path)
    const exactSectionIds = invertedIndex[word];
    if (exactSectionIds) {
      exactSectionIds.forEach(id => candidateSections.add(id));
    }
    
    // 🆕 PARTIAL MATCH: Check if query word is a prefix/substring of indexed words
    // Example: "photobox" matches "photobox360"
    if (word.length >= 4) { // Only for words with 4+ chars
      let partialMatchCount = 0;
      const maxPartialMatches = 50; // Limit for performance
      
      for (const indexedWord in invertedIndex) {
        if (partialMatchCount >= maxPartialMatches) break;
        
        // Check if query word is a substring of indexed word OR vice versa
        if (indexedWord.includes(word) || word.includes(indexedWord)) {
          const sectionIds = invertedIndex[indexedWord];
          if (sectionIds) {
            sectionIds.forEach(id => candidateSections.add(id));
            partialMatchCount++;
            if (partialMatchCount <= 5) { // Log only first 5
              console.log(`🔗 Partial match: "${word}" ~ "${indexedWord}"`);
            }
          }
        }
      }
      
      if (partialMatchCount > 5) {
        console.log(`🔗 ... and ${partialMatchCount - 5} more partial matches for "${word}"`);
      }
    }
  }

  console.log(`🔍 Found ${candidateSections.size} candidate sections from inverted index`);
  console.log(`📁 Found ${filenameMatchedDocs.size} documents with filename matches`);

  // STEP 3: If filename matches found, add ALL sections from those docs with high priority
  if (filenameMatchedDocs.size > 0) {
    for (const [sectionId, cached] of normalizedCache.entries()) {
      if (filenameMatchedDocs.has(cached.documentId)) {
        candidateSections.add(sectionId);
      }
    }
    console.log(`📁 Added sections from filename-matched docs, total candidates: ${candidateSections.size}`);
  }

  // Score only candidate sections
  for (const sectionId of candidateSections) {
    const cached = normalizedCache.get(sectionId);
    if (!cached) continue;

    let score = 0;
    let matchType: 'exact' | 'partial' | 'ngram' | 'semantic' = 'semantic';

    // BOOST: Give high priority to filename-matched documents (with score)
    const filenameMatchScore = filenameMatchedDocs.get(cached.documentId) || 0;
    const isFilenameMatch = filenameMatchScore > 0;

    // Step 1: Fast exact match check (O(1) with normalized cache)
    if (cached.normalizedText.includes(normalizedQuery)) {
      score = 1.0;
      matchType = 'exact';
    }
    // Step 2: Keyword intersection (O(k) where k = query words)
    else {
      const queryWordsSet = new Set(queryWords);
      const intersection = new Set([...queryWordsSet].filter(w => cached.normalizedWords.has(w)));
      const keywordScore = intersection.size / queryWords.length;
      
      // 🆕 OPTIMIZATION: Lowered threshold for better recall
      // Old: 0.1 (filename) / 0.3 (general) → New: 0.05 (filename) / 0.15 (general)
      const threshold = isFilenameMatch ? 0.05 : 0.15;
      
      // 🆕 OPTIMIZATION: Don't skip if BM25 score exists (even if keyword score is low)
      const bm25Score = bm25Scores.get(cached.sectionId) || 0;
      const normalizedBM25 = Math.min(bm25Score / 10, 1.0);
      
      if (keywordScore < threshold && normalizedBM25 < 0.2) {
        // Skip only if BOTH keyword AND BM25 scores are low
        continue;
      }

      score = keywordScore * 0.9;
      matchType = 'partial';

      // Step 3: Only calculate n-gram for high-potential matches
      if (keywordScore > 0.5) {
        const queryNGrams = new Set(getNGrams(query, 3));
        const ngramSimilarity = jaccardSimilarity(queryNGrams, cached.nGrams);
        if (ngramSimilarity > 0) {
          score = Math.max(score, ngramSimilarity * 0.7);
          matchType = 'ngram';
        }
      }
    }

    // FILENAME BOOST: Use pre-computed match score from Step 1
    // This score already accounts for exact/prefix/contains/partial matches
    if (filenameMatchScore > 0) {
      // 🆕 FIX: If ONLY filename matches (no content match), ensure minimum score
      // This prevents filename-matched docs from being filtered out
      if (score < 0.3 && filenameMatchScore >= 0.7) {
        // Strong filename match but weak content match → force minimum score
        score = 0.5; // Ensure it passes minScore threshold (0.15)
        console.log(`🚀 FILENAME-ONLY match: Boosted score to ${score.toFixed(2)} for: ${cached.filename}`);
      }
      
      // Convert match score (0-1) to boost value
      // Higher match score = higher boost (up to 0.9)
      const filenameBoost = filenameMatchScore * 0.9;
      score += filenameBoost;
      console.log(`📈 Applied filename boost: +${filenameBoost.toFixed(2)} (match score: ${filenameMatchScore.toFixed(2)}, total: ${score.toFixed(2)}) for: ${cached.filename}`);
    }

    // INTENT-BASED FILTERING: For price queries, prioritize sections with currency/numbers
    if (queryIntent === 'PRICE_QUERY') {
      const hasCurrencyOrNumber = /[₺$€£]|TL|USD|EUR|GBP|\d+[.,]\d+/.test(cached.originalText);
      if (hasCurrencyOrNumber) {
        score += 0.3; // Boost sections with price indicators
      } else {
        score *= 0.5; // Penalize sections without price info for price queries
      }
    }

    // HYBRID SCORING: Combine keyword score with BM25 score
    const bm25Score = bm25Scores.get(cached.sectionId) || 0;
    
    if (bm25Score > 0) {
      // Normalize BM25 score to 0-1 range (typical BM25 scores are 0-10)
      const normalizedBM25 = Math.min(bm25Score / 10, 1.0);
      
      // 🆕 OPTIMIZATION: Increased BM25 weight for better semantic matching
      // Old: 40% keyword + 60% BM25 → New: 30% keyword + 70% BM25
      const hybridScore = score * 0.3 + normalizedBM25 * 0.7;
      score = hybridScore;
      
      console.log(`🔀 Hybrid Score: ${cached.sectionId.substring(0, 20)}... keyword=${(score * 0.3).toFixed(2)} + BM25=${(normalizedBM25 * 0.7).toFixed(2)} = ${score.toFixed(2)}`);
    }

    // Add to results if above threshold
    if (score >= minScore) {
      const excerpt = cached.originalText.length > 200 
        ? cached.originalText.substring(0, 200) + '...'
        : cached.originalText;

      results.push({
        section_id: cached.sectionId,
        document_id: cached.documentId,
        filename: cached.filename,
        excerpt,
        relevanceScore: Math.min(score, 1.0),
        page: cached.page,
        matchType: bm25Score > 0 ? 'ngram' : matchType, // Upgrade to ngram if BM25 matched
      });
    }
  }

  // Sort by relevance score (descending)
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // SMART SECTION FILTERING based on intent
  let filteredResults = results;
  
  if (queryIntent === 'PRICE_QUERY') {
    // For price queries: prioritize sections with numbers/currency
    const sectionsWithPrices = results.filter(r => 
      /[₺$€£]|TL|USD|EUR|GBP|\d+[.,]\d+/.test(r.excerpt)
    );
    
    // If we have enough price-containing sections, use only those
    if (sectionsWithPrices.length >= 1) {
      console.log(`💰 Price query: Filtered to ${sectionsWithPrices.length} sections with price info`);
      filteredResults = sectionsWithPrices.slice(0, 2); // Only top 2 sections for price queries
    } else {
      // No price info found, return top 2 anyway
      filteredResults = results.slice(0, 2);
    }
  } else {
    // For other queries, return top K results
    filteredResults = results.slice(0, maxRefs);
  }

  const elapsed = Date.now() - startTime;
  console.log(`⚡ Retrieval completed in ${elapsed}ms (${filteredResults.length} results)`);

  return filteredResults;
}


/**
 * Compute aggregate statistics from numeric values
 */
export function computeAggregates(values: NumericValue[]): {
  count: number;
  sum: number;
  avg: number;
  median: number;
  min: number;
  max: number;
  currency?: string;
} {
  if (values.length === 0) {
    return { count: 0, sum: 0, avg: 0, median: 0, min: 0, max: 0 };
  }

  const numbers = values.map(v => v.parsedValue).sort((a, b) => a - b);
  const sum = numbers.reduce((acc, n) => acc + n, 0);
  const count = numbers.length;
  const avg = sum / count;
  const median = count % 2 === 0
    ? (numbers[count / 2 - 1] + numbers[count / 2]) / 2
    : numbers[Math.floor(count / 2)];
  const min = numbers[0];
  const max = numbers[count - 1];

  // Determine primary currency (most common)
  const currencies = values
    .filter(v => v.currency)
    .map(v => v.currency!);
  const currencyCount: Record<string, number> = {};
  for (const curr of currencies) {
    currencyCount[curr] = (currencyCount[curr] || 0) + 1;
  }
  const primaryCurrency = Object.keys(currencyCount).sort(
    (a, b) => currencyCount[b] - currencyCount[a]
  )[0];

  return { count, sum, avg, median, min, max, currency: primaryCurrency };
}

