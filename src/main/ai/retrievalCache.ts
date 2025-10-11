/**
 * Retrieval Cache - LRU cache for query results
 * 
 * Provides fast caching with automatic eviction and TTL support.
 * Improves retrieval performance for repeated queries.
 */

import { RetrievalResult } from './documentRetriever';

export interface CacheEntry {
  query: string; // normalized query
  timestamp: number;
  results: RetrievalResult[];
  ttl: number; // time to live in ms
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export class RetrievalCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private defaultTTL: number;
  private hits: number;
  private misses: number;

  constructor(maxSize: number = 50, defaultTTL: number = 300000) { // 5 min default TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Normalize query for cache key generation
   */
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .trim()
      .replace(/\s+/g, ' '); // normalize whitespace
  }

  /**
   * Get cached results if available and not expired
   */
  get(query: string): RetrievalResult[] | null {
    const key = this.normalizeQuery(query);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    this.hits++;
    console.log(`✅ Cache HIT for query: "${query.substring(0, 50)}..." (hit rate: ${this.getHitRate()}%)`);
    return entry.results;
  }

  /**
   * Store results in cache
   */
  set(query: string, results: RetrievalResult[], ttl?: number): void {
    const key = this.normalizeQuery(query);
    
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      query: key,
      timestamp: Date.now(),
      results,
      ttl: ttl || this.defaultTTL,
    });

    console.log(`📦 Cached results for query: "${query.substring(0, 50)}..." (cache size: ${this.cache.size}/${this.maxSize})`);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    console.log('🗑️ Cache cleared');
  }

  /**
   * Invalidate cache (call when documents change)
   */
  invalidate(): void {
    this.clear();
    console.log('🔄 Cache invalidated due to document changes');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: parseFloat(hitRate.toFixed(2)),
    };
  }

  /**
   * Get hit rate percentage
   */
  private getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? parseFloat(((this.hits / total) * 100).toFixed(1)) : 0;
  }

  /**
   * Remove expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.cache.delete(key));
    
    if (toDelete.length > 0) {
      console.log(`🧹 Cleaned up ${toDelete.length} expired cache entries`);
    }
  }
}

