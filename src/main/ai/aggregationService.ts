/**
 * Aggregation Service - SQL-like fallback for numeric queries
 * 
 * Following Rag-workflow.md Section 10:
 * For queries like "toplam", "ortalama", "kaç tane" perform direct aggregation
 * on normalized documents instead of relying solely on LLM.
 * 
 * This provides:
 * - Reliable numeric calculations
 * - Source-traceable results
 * - Faster response for aggregate queries
 */

import { NormalizedDocument, DocumentType } from './canonicalSchema';

export interface AggregateQuery {
  operation: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' | 'GROUP_BY';
  field: 'total' | 'tax' | 'items_count';
  filters?: {
    type?: DocumentType;
    dateFrom?: string;
    dateTo?: string;
    supplier?: string;
    minTotal?: number;
    maxTotal?: number;
  };
  groupBy?: 'type' | 'supplier' | 'month' | 'year';
}

export interface AggregateResult {
  value: number | Record<string, number>;
  count: number;
  sources: string[];  // Document IDs used in calculation
  query: AggregateQuery;
  naturalLanguage: string;  // Human-readable explanation
}

export class AggregationService {
  /**
   * Execute aggregate query on normalized documents
   */
  aggregate(documents: NormalizedDocument[], query: AggregateQuery): AggregateResult {
    // STEP 1: Filter documents
    const filtered = this.filterDocuments(documents, query.filters);

    console.log(`📊 Aggregation: ${filtered.length}/${documents.length} documents match filters`);

    // STEP 2: Extract values
    const values = this.extractValues(filtered, query.field);

    // STEP 3: Perform aggregation
    let result: number | Record<string, number>;
    
    if (query.groupBy) {
      result = this.groupByAggregate(filtered, query);
    } else {
      result = this.simpleAggregate(values, query.operation);
    }

    // STEP 4: Generate natural language explanation
    const naturalLanguage = this.generateExplanation(result, filtered, query);

    return {
      value: result,
      count: filtered.length,
      sources: filtered.map(d => d.id),
      query,
      naturalLanguage,
    };
  }

  /**
   * Filter documents based on query filters
   */
  private filterDocuments(
    documents: NormalizedDocument[],
    filters?: AggregateQuery['filters']
  ): NormalizedDocument[] {
    if (!filters) return documents;

    return documents.filter(doc => {
      // Type filter
      if (filters.type && doc.type !== filters.type) {
        return false;
      }

      // Date range filter
      if (filters.dateFrom && doc.date) {
        if (new Date(doc.date) < new Date(filters.dateFrom)) {
          return false;
        }
      }
      if (filters.dateTo && doc.date) {
        if (new Date(doc.date) > new Date(filters.dateTo)) {
          return false;
        }
      }

      // Supplier filter
      if (filters.supplier && doc.supplier) {
        if (!doc.supplier.toLowerCase().includes(filters.supplier.toLowerCase())) {
          return false;
        }
      }

      // Total amount range filter
      if (filters.minTotal !== undefined && doc.total !== null) {
        if (doc.total < filters.minTotal) {
          return false;
        }
      }
      if (filters.maxTotal !== undefined && doc.total !== null) {
        if (doc.total > filters.maxTotal) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Extract numeric values from documents
   */
  private extractValues(documents: NormalizedDocument[], field: string): number[] {
    const values: number[] = [];

    for (const doc of documents) {
      let value: number | null = null;

      switch (field) {
        case 'total':
          value = doc.total;
          break;
        case 'tax':
          value = doc.tax;
          break;
        case 'items_count':
          value = doc.items.length;
          break;
        default:
          console.warn(`Unknown field: ${field}`);
      }

      if (value !== null && !isNaN(value)) {
        values.push(value);
      }
    }

    return values;
  }

  /**
   * Perform simple aggregation (SUM, AVG, COUNT, MIN, MAX)
   */
  private simpleAggregate(values: number[], operation: string): number {
    if (values.length === 0) return 0;

    switch (operation) {
      case 'SUM':
        return values.reduce((sum, val) => sum + val, 0);
      
      case 'AVG':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      
      case 'COUNT':
        return values.length;
      
      case 'MIN':
        return Math.min(...values);
      
      case 'MAX':
        return Math.max(...values);
      
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Perform GROUP_BY aggregation
   */
  private groupByAggregate(
    documents: NormalizedDocument[],
    query: AggregateQuery
  ): Record<string, number> {
    const groups: Record<string, number[]> = {};

    for (const doc of documents) {
      let groupKey: string;

      switch (query.groupBy) {
        case 'type':
          groupKey = doc.type;
          break;
        
        case 'supplier':
          groupKey = doc.supplier || 'unknown';
          break;
        
        case 'month':
          if (doc.date) {
            const date = new Date(doc.date);
            groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          } else {
            groupKey = 'unknown';
          }
          break;
        
        case 'year':
          if (doc.date) {
            const date = new Date(doc.date);
            groupKey = String(date.getFullYear());
          } else {
            groupKey = 'unknown';
          }
          break;
        
        default:
          groupKey = 'unknown';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }

      // Extract value
      const value = this.extractValues([doc], query.field)[0];
      if (value !== undefined) {
        groups[groupKey].push(value);
      }
    }

    // Aggregate each group
    const result: Record<string, number> = {};
    for (const [key, values] of Object.entries(groups)) {
      result[key] = this.simpleAggregate(values, query.operation);
    }

    return result;
  }

  /**
   * Generate natural language explanation of results
   */
  private generateExplanation(
    result: number | Record<string, number>,
    documents: NormalizedDocument[],
    query: AggregateQuery
  ): string {
    const operationNames: Record<string, string> = {
      SUM: 'Toplam',
      AVG: 'Ortalama',
      COUNT: 'Adet',
      MIN: 'Minimum',
      MAX: 'Maksimum',
      GROUP_BY: 'Gruplu',
    };

    const fieldNames: Record<string, string> = {
      total: 'tutar',
      tax: 'KDV',
      items_count: 'kalem sayısı',
    };

    const opName = operationNames[query.operation] || query.operation;
    const fieldName = fieldNames[query.field] || query.field;

    if (typeof result === 'number') {
      // Simple result
      let explanation = `${opName} ${fieldName}: ${this.formatNumber(result)}`;
      
      if (query.operation === 'SUM' || query.operation === 'AVG') {
        // Add currency if available
        const firstDoc = documents[0];
        if (firstDoc?.currency) {
          explanation += ` ${firstDoc.currency}`;
        }
      }

      explanation += ` (${documents.length} belge)`;

      // Add filter info
      if (query.filters?.type) {
        explanation += ` - Tip: ${query.filters.type}`;
      }
      if (query.filters?.dateFrom && query.filters?.dateTo) {
        explanation += ` - Tarih aralığı: ${query.filters.dateFrom} - ${query.filters.dateTo}`;
      }

      return explanation;
    } else {
      // Grouped result
      const lines = [`${opName} ${fieldName} (${query.groupBy} bazında):`];
      
      for (const [key, value] of Object.entries(result)) {
        lines.push(`  • ${key}: ${this.formatNumber(value)}`);
      }

      return lines.join('\n');
    }
  }

  /**
   * Format number for display (Turkish locale)
   */
  private formatNumber(value: number): string {
    if (Number.isInteger(value)) {
      return value.toLocaleString('tr-TR');
    } else {
      return value.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
  }

  /**
   * Detect if query is an aggregate query
   */
  static isAggregateQuery(query: string): boolean {
    const aggregateKeywords = [
      'toplam',
      'topla',
      'ortalama',
      'kaç',
      'sayı',
      'miktar',
      'minimum',
      'maksimum',
      'en düşük',
      'en yüksek',
      'grup',
    ];

    const lowerQuery = query.toLowerCase();
    return aggregateKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  /**
   * Parse natural language query into AggregateQuery
   * Simple heuristic-based parser
   */
  static parseQuery(query: string): AggregateQuery | null {
    const lowerQuery = query.toLowerCase();

    // Determine operation
    let operation: AggregateQuery['operation'] = 'SUM';
    if (lowerQuery.includes('ortalama')) operation = 'AVG';
    else if (lowerQuery.includes('kaç') || lowerQuery.includes('sayı')) operation = 'COUNT';
    else if (lowerQuery.includes('minimum') || lowerQuery.includes('en düşük')) operation = 'MIN';
    else if (lowerQuery.includes('maksimum') || lowerQuery.includes('en yüksek')) operation = 'MAX';

    // Determine field
    let field: AggregateQuery['field'] = 'total';
    if (lowerQuery.includes('kdv') || lowerQuery.includes('vergi')) field = 'tax';
    else if (lowerQuery.includes('kalem') || lowerQuery.includes('ürün')) field = 'items_count';

    // Determine filters
    const filters: AggregateQuery['filters'] = {};

    // Type filter
    if (lowerQuery.includes('fatura')) filters.type = 'fatura';
    else if (lowerQuery.includes('teklif')) filters.type = 'teklif';
    else if (lowerQuery.includes('fiş') || lowerQuery.includes('fis')) filters.type = 'fis';

    // Date filters (simple month detection)
    const monthNames = [
      'ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran',
      'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'
    ];
    
    for (let i = 0; i < monthNames.length; i++) {
      if (lowerQuery.includes(monthNames[i])) {
        const year = new Date().getFullYear();
        const month = String(i + 1).padStart(2, '0');
        filters.dateFrom = `${year}-${month}-01`;
        filters.dateTo = `${year}-${month}-31`;
        break;
      }
    }

    // Year detection
    const yearMatch = lowerQuery.match(/\b(20\d{2})\b/);
    if (yearMatch && !filters.dateFrom) {
      filters.dateFrom = `${yearMatch[1]}-01-01`;
      filters.dateTo = `${yearMatch[1]}-12-31`;
    }

    return { operation, field, filters };
  }
}

