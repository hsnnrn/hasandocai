/**
 * Re-Ranker - Improve retrieval results quality
 * Inspired by llm-search's re-ranking strategy
 * https://github.com/snexus/llm-search
 * 
 * Uses multiple signals to re-rank retrieval results:
 * - Keyword density
 * - Filename relevance  
 * - Position in document (earlier sections often more important)
 * - Content freshness (if metadata available)
 */

import { RetrievalResult } from './documentRetriever';

export interface RerankingOptions {
  /** Weight for keyword density score (0-1) */
  keywordDensityWeight?: number;
  /** Weight for filename match score (0-1) */
  filenameWeight?: number;
  /** Weight for position score (0-1) */
  positionWeight?: number;
  /** Enable diversity - penalize duplicate documents */
  enableDiversity?: boolean;
  /** Maximum results from same document */
  maxPerDocument?: number;
}

const DEFAULT_OPTIONS: Required<RerankingOptions> = {
  keywordDensityWeight: 0.3,
  filenameWeight: 0.4,
  positionWeight: 0.2,
  enableDiversity: true,
  maxPerDocument: 3,
};

/**
 * Calculate keyword density score
 */
function calculateKeywordDensity(excerpt: string, queryWords: string[]): number {
  const excerptLower = excerpt.toLowerCase();
  const words = excerptLower.split(/\s+/);
  
  if (words.length === 0) return 0;
  
  let matchCount = 0;
  for (const word of words) {
    if (queryWords.some(qw => word.includes(qw) || qw.includes(word))) {
      matchCount++;
    }
  }
  
  return matchCount / words.length;
}

/**
 * Calculate position score (earlier = better)
 */
function calculatePositionScore(page: number = 1, totalPages: number = 100): number {
  // Normalize to 0-1 range, with earlier pages scoring higher
  // First page = 1.0, last page = 0.1
  return Math.max(0.1, 1.0 - ((page - 1) / totalPages) * 0.9);
}

/**
 * Re-rank retrieval results using multiple signals
 * Inspired by llm-search's "Retrieve and Re-rank" strategy
 */
export function rerankResults(
  results: RetrievalResult[],
  query: string,
  options: RerankingOptions = {}
): RetrievalResult[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (results.length === 0) return results;
  
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  console.log(`🔄 Re-ranking ${results.length} results with query: "${query}"`);
  
  // Calculate new scores for each result
  const reranked = results.map(result => {
    // 1. Original relevance score (from BM25 + hybrid)
    const originalScore = result.relevanceScore;
    
    // 2. Keyword density in excerpt
    const densityScore = calculateKeywordDensity(result.excerpt, queryWords);
    
    // 3. Position score (if available)
    const positionScore = result.page ? calculatePositionScore(result.page) : 0.5;
    
    // 4. Filename relevance (already in original score, but can boost)
    const filenameScore = queryWords.some(qw => 
      result.filename.toLowerCase().includes(qw)
    ) ? 1.0 : 0.0;
    
    // Combined score
    const rerankScore = 
      originalScore * (1 - opts.keywordDensityWeight - opts.filenameWeight - opts.positionWeight) +
      densityScore * opts.keywordDensityWeight +
      filenameScore * opts.filenameWeight +
      positionScore * opts.positionWeight;
    
    return {
      ...result,
      relevanceScore: rerankScore,
      _originalScore: originalScore,
      _densityScore: densityScore,
      _positionScore: positionScore,
      _filenameScore: filenameScore,
    };
  });
  
  // Sort by new score
  reranked.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // Apply diversity filter if enabled
  if (opts.enableDiversity && opts.maxPerDocument) {
    const documentCounts = new Map<string, number>();
    const diverse: typeof reranked = [];
    
    for (const result of reranked) {
      const count = documentCounts.get(result.document_id) || 0;
      
      if (count < opts.maxPerDocument) {
        diverse.push(result);
        documentCounts.set(result.document_id, count + 1);
      }
    }
    
    console.log(`✅ Re-ranking complete: ${results.length} → ${diverse.length} results (diversity applied)`);
    return diverse;
  }
  
  console.log(`✅ Re-ranking complete: ${results.length} results`);
  return reranked;
}

/**
 * Multi-query generator (RAG Fusion inspired)
 * Generate multiple variations of the same query for better recall
 * Inspired by: https://towardsdatascience.com/forget-rag-the-future-is-rag-fusion
 */
export function generateQueryVariations(query: string, count: number = 3): string[] {
  const variations: string[] = [query]; // Original query first
  
  const queryLower = query.toLowerCase();
  
  // Variation 1: Add synonyms for common words
  const synonymMap: Record<string, string[]> = {
    'fatura': ['invoice', 'belge', 'evrak'],
    'tutar': ['miktar', 'bedel', 'ücret', 'fiyat'],
    'toplam': ['total', 'sum', 'genel'],
    'kaç': ['ne kadar', 'sayı', 'adet'],
  };
  
  let variation1 = query;
  for (const [word, synonyms] of Object.entries(synonymMap)) {
    if (queryLower.includes(word) && synonyms.length > 0) {
      // Replace with first synonym
      variation1 = variation1.replace(new RegExp(`\\b${word}\\b`, 'gi'), synonyms[0]);
      break;
    }
  }
  
  if (variation1 !== query) {
    variations.push(variation1);
  }
  
  // Variation 2: Rephrase question
  if (queryLower.startsWith('hangi')) {
    variations.push(query.replace(/^hangi/i, 'ne gibi'));
  } else if (queryLower.startsWith('kaç')) {
    variations.push(query.replace(/^kaç/i, 'toplam kaç'));
  } else if (queryLower.includes('nedir')) {
    variations.push(query.replace(/nedir/i, 'ne'));
  }
  
  // Variation 3: Add context words
  if (!queryLower.includes('belge') && !queryLower.includes('dosya') && !queryLower.includes('doküman')) {
    variations.push(`${query} belgede`);
  }
  
  // Return unique variations (up to count)
  const unique = Array.from(new Set(variations));
  console.log(`🔀 Generated ${unique.length} query variations from: "${query}"`);
  
  return unique.slice(0, count);
}

/**
 * Deduplicate results by content similarity
 * Remove near-duplicate sections
 */
export function deduplicateResults(results: RetrievalResult[], threshold: number = 0.8): RetrievalResult[] {
  if (results.length <= 1) return results;
  
  const deduplicated: RetrievalResult[] = [];
  
  for (const result of results) {
    let isDuplicate = false;
    
    for (const existing of deduplicated) {
      // Simple similarity check: word overlap
      const words1 = new Set(result.excerpt.toLowerCase().split(/\s+/));
      const words2 = new Set(existing.excerpt.toLowerCase().split(/\s+/));
      
      const intersection = new Set([...words1].filter(w => words2.has(w)));
      const union = new Set([...words1, ...words2]);
      
      const similarity = intersection.size / union.size;
      
      if (similarity >= threshold) {
        isDuplicate = true;
        console.log(`🔄 Dedup: Skipping duplicate (${(similarity * 100).toFixed(0)}% similar)`);
        break;
      }
    }
    
    if (!isDuplicate) {
      deduplicated.push(result);
    }
  }
  
  console.log(`✅ Deduplication: ${results.length} → ${deduplicated.length} results`);
  return deduplicated;
}

