/**
 * BM25 Ranker - Improved keyword-based ranking for document retrieval
 * 
 * BM25 (Best Matching 25) is a probabilistic ranking function that:
 * - Boosts rare/specific terms (IDF - Inverse Document Frequency)
 * - Penalizes term repetition spam (saturation function)
 * - Normalizes by document length (longer docs don't dominate)
 * 
 * Formula: BM25(D, Q) = Σ IDF(qi) * (f(qi, D) * (k1 + 1)) / (f(qi, D) + k1 * (1 - b + b * |D| / avgdl))
 * 
 * Where:
 * - f(qi, D): term frequency of qi in document D
 * - |D|: length of document D
 * - avgdl: average document length in corpus
 * - k1: term frequency saturation parameter (default: 1.2)
 * - b: length normalization parameter (default: 0.75)
 * - IDF(qi): inverse document frequency of term qi
 */

export interface BM25Config {
  k1: number;  // Term frequency saturation (1.2 - 2.0, default: 1.2)
  b: number;   // Length normalization (0 - 1.0, default: 0.75)
}

export interface BM25Document {
  id: string;
  text: string;
  terms: string[];
  termFrequency: Map<string, number>;
  length: number;
}

export interface BM25Score {
  documentId: string;
  score: number;
  matchedTerms: string[];
  explanation?: string;
}

export class BM25Ranker {
  private config: BM25Config;
  private documents: Map<string, BM25Document>;
  private idf: Map<string, number>;
  private averageDocLength: number;
  private totalDocs: number;

  constructor(config: Partial<BM25Config> = {}) {
    this.config = {
      k1: config.k1 || 1.2,
      b: config.b || 0.75,
    };

    this.documents = new Map();
    this.idf = new Map();
    this.averageDocLength = 0;
    this.totalDocs = 0;
  }

  /**
   * Normalize and tokenize text (Turkish-aware)
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .split(/[\s\-_.,;:!?()\[\]{}]+/)
      .filter(term => term.length > 2); // Filter out very short terms
  }

  /**
   * Calculate term frequency for a document
   */
  private calculateTermFrequency(terms: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    
    for (const term of terms) {
      tf.set(term, (tf.get(term) || 0) + 1);
    }
    
    return tf;
  }

  /**
   * Add documents to the index
   */
  addDocuments(docs: Array<{ id: string; text: string }>): void {
    console.log(`📊 BM25: Indexing ${docs.length} documents...`);
    const startTime = Date.now();

    // Clear existing index
    this.documents.clear();
    this.idf.clear();

    // Process each document
    for (const doc of docs) {
      const terms = this.tokenize(doc.text);
      const termFrequency = this.calculateTermFrequency(terms);

      this.documents.set(doc.id, {
        id: doc.id,
        text: doc.text,
        terms,
        termFrequency,
        length: terms.length,
      });
    }

    this.totalDocs = this.documents.size;

    // Calculate average document length
    let totalLength = 0;
    for (const doc of this.documents.values()) {
      totalLength += doc.length;
    }
    this.averageDocLength = totalLength / this.totalDocs;

    // Calculate IDF for each term
    this.calculateIDF();

    const elapsed = Date.now() - startTime;
    console.log(`✅ BM25: Indexed ${this.totalDocs} documents in ${elapsed}ms`);
    console.log(`📏 Average document length: ${this.averageDocLength.toFixed(0)} terms`);
    console.log(`📖 Unique terms: ${this.idf.size}`);
  }

  /**
   * Calculate Inverse Document Frequency (IDF) for all terms
   */
  private calculateIDF(): void {
    const documentFrequency = new Map<string, number>();

    // Count how many documents contain each term
    for (const doc of this.documents.values()) {
      const uniqueTerms = new Set(doc.terms);
      for (const term of uniqueTerms) {
        documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
      }
    }

    // Calculate IDF: log((N - df + 0.5) / (df + 0.5) + 1)
    for (const [term, df] of documentFrequency.entries()) {
      const idf = Math.log((this.totalDocs - df + 0.5) / (df + 0.5) + 1);
      this.idf.set(term, idf);
    }
  }

  /**
   * Calculate BM25 score for a query against a document
   */
  private calculateScore(queryTerms: string[], doc: BM25Document): {
    score: number;
    matchedTerms: string[];
  } {
    let score = 0;
    const matchedTerms: string[] = [];

    for (const term of queryTerms) {
      const termFreq = doc.termFrequency.get(term) || 0;
      
      if (termFreq === 0) continue; // Term not in document

      matchedTerms.push(term);

      // Get IDF (default to 0 if term not in corpus)
      const idf = this.idf.get(term) || 0;

      // BM25 formula
      const numerator = termFreq * (this.config.k1 + 1);
      const denominator = termFreq + this.config.k1 * (
        1 - this.config.b + this.config.b * (doc.length / this.averageDocLength)
      );

      score += idf * (numerator / denominator);
    }

    return { score, matchedTerms };
  }

  /**
   * Search documents for query and return ranked results
   */
  search(query: string, topK: number = 10): BM25Score[] {
    if (this.documents.size === 0) {
      console.warn('⚠️ BM25: No documents indexed');
      return [];
    }

    const queryTerms = this.tokenize(query);
    console.log(`🔍 BM25 Search: "${query}" → ${queryTerms.length} query terms`);

    const results: BM25Score[] = [];

    for (const doc of this.documents.values()) {
      const { score, matchedTerms } = this.calculateScore(queryTerms, doc);

      if (score > 0) {
        results.push({
          documentId: doc.id,
          score,
          matchedTerms,
        });
      }
    }

    // Sort by score (descending)
    results.sort((a, b) => b.score - a.score);

    const topResults = results.slice(0, topK);
    
    console.log(`📊 BM25 Results: ${topResults.length}/${results.length} documents`);
    if (topResults.length > 0) {
      console.log(`   Top score: ${topResults[0].score.toFixed(2)} (${topResults[0].matchedTerms.length} matched terms)`);
    }

    return topResults;
  }

  /**
   * Get statistics about the index
   */
  getStats(): {
    totalDocuments: number;
    totalTerms: number;
    averageDocLength: number;
    config: BM25Config;
  } {
    return {
      totalDocuments: this.totalDocs,
      totalTerms: this.idf.size,
      averageDocLength: this.averageDocLength,
      config: this.config,
    };
  }

  /**
   * Clear the index
   */
  clear(): void {
    this.documents.clear();
    this.idf.clear();
    this.averageDocLength = 0;
    this.totalDocs = 0;
    console.log('🗑️ BM25 index cleared');
  }
}

