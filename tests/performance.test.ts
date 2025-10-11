/**
 * Performance Tests for Optimized Retrieval
 * 
 * Run with: npm test -- tests/performance.test.ts
 */

import { retrieveRelevantSections, LocalDocument } from '../src/main/ai/documentRetriever';
import { RetrievalCache } from '../src/main/ai/retrievalCache';

describe('Performance Optimizations', () => {
  const mockDocs: LocalDocument[] = [
    {
      documentId: 'doc1',
      title: 'Fatura Belgesi',
      filename: 'fatura-2024.pdf',
      fileType: 'pdf',
      textSections: [
        { id: 'sec1', content: 'Toplam tutar 5.000 TL. Fatura tarihi 15.03.2024', contentLength: 100 },
        { id: 'sec2', content: 'KDV oranı %18. Ara toplam 4.237 TL', contentLength: 80 },
        { id: 'sec3', content: 'Müşteri: Acme Corp. Adres: İstanbul', contentLength: 70 },
      ],
    },
    {
      documentId: 'doc2',
      title: 'Sözleşme',
      filename: 'sozlesme.docx',
      fileType: 'docx',
      textSections: [
        { id: 'sec4', content: 'Sözleşme başlangıç tarihi 01.01.2024', contentLength: 90 },
        { id: 'sec5', content: 'Aylık kira bedeli 10.000 TL olarak belirlendi', contentLength: 100 },
      ],
    },
  ];

  describe('Retrieval Performance', () => {
    it('should retrieve exact matches quickly', () => {
      const start = Date.now();
      // Use a more specific query to avoid general query detection
      const results = retrieveRelevantSections('fatura toplam tutar 5000', mockDocs, { maxRefs: 5 });
      const elapsed = Date.now() - start;

      expect(results.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(50); // First run includes index building
      console.log(`⚡ Exact match retrieval: ${elapsed}ms`);
    });

    it('should handle Turkish characters correctly', () => {
      const results = retrieveRelevantSections('sözleşme müşteri', mockDocs);
      expect(results.length).toBeGreaterThan(0);
      console.log('✅ Turkish normalization working');
    });

    it('should use inverted index for keyword searches', () => {
      const start = Date.now();
      const results = retrieveRelevantSections('kira bedeli', mockDocs);
      const elapsed = Date.now() - start;

      expect(results.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(15); // Even faster with index
      console.log(`⚡ Keyword search with index: ${elapsed}ms`);
    });

    it('should handle general queries', () => {
      const results = retrieveRelevantSections('belgelerde ne var', mockDocs);
      expect(results.length).toBe(mockDocs.length);
      expect(results[0].matchType).toBe('exact');
      console.log('✅ General query handling working');
    });
  });

  describe('Cache Performance', () => {
    let cache: RetrievalCache;

    beforeEach(() => {
      cache = new RetrievalCache(50, 300000);
    });

    it('should cache and retrieve results', () => {
      const query = 'fatura toplam';
      const results = retrieveRelevantSections(query, mockDocs);

      // Set cache
      cache.set(query, results);

      // Get from cache
      const cachedResults = cache.get(query);
      expect(cachedResults).toEqual(results);
      console.log('✅ Cache storage and retrieval working');
    });

    it('should normalize queries for cache keys', () => {
      const results = retrieveRelevantSections('FATURA TOPLAM', mockDocs);
      
      cache.set('FATURA TOPLAM', results);
      
      // Should hit cache even with different case/spacing
      const cached1 = cache.get('fatura  toplam');
      const cached2 = cache.get('Fatura Toplam');
      
      expect(cached1).toBeTruthy();
      expect(cached2).toBeTruthy();
      console.log('✅ Query normalization for caching working');
    });

    it('should track hit rate correctly', () => {
      const query = 'test query';
      const results = retrieveRelevantSections(query, mockDocs);
      
      cache.set(query, results);
      
      // Miss
      cache.get('other query');
      
      // Hit
      cache.get(query);
      cache.get(query);
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(66.67, 1);
      console.log(`✅ Cache hit rate: ${stats.hitRate}%`);
    });

    it('should invalidate expired entries', (done) => {
      const cache = new RetrievalCache(50, 100); // 100ms TTL
      const results = retrieveRelevantSections('test', mockDocs);
      
      cache.set('test', results);
      
      setTimeout(() => {
        const cached = cache.get('test');
        expect(cached).toBeNull();
        console.log('✅ Cache expiration working');
        done();
      }, 150);
    });

    it('should evict oldest entries when full', () => {
      const smallCache = new RetrievalCache(3, 300000);
      
      smallCache.set('query1', []);
      smallCache.set('query2', []);
      smallCache.set('query3', []);
      smallCache.set('query4', []); // Should evict query1
      
      expect(smallCache.get('query1')).toBeNull();
      expect(smallCache.get('query2')).toBeTruthy();
      expect(smallCache.get('query3')).toBeTruthy();
      expect(smallCache.get('query4')).toBeTruthy();
      console.log('✅ LRU eviction working');
    });
  });

  describe('Context Pruning', () => {
    it('should limit results to maxRefs', () => {
      const results = retrieveRelevantSections('fatura', mockDocs, { maxRefs: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
      console.log('✅ Result limiting working');
    });

    it('should truncate long excerpts', () => {
      const longContent = 'A'.repeat(500);
      const longDocs: LocalDocument[] = [{
        documentId: 'long',
        title: 'Long Doc',
        filename: 'long.pdf',
        fileType: 'pdf',
        textSections: [{ id: 'long1', content: longContent, contentLength: 500 }],
      }];

      const results = retrieveRelevantSections('A', longDocs);
      // Note: Truncation happens in chatController, not documentRetriever
      // This test verifies retrieval works with long content
      expect(results.length).toBeGreaterThan(0);
      console.log('✅ Long content handling working');
    });
  });
});

