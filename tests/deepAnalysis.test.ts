/**
 * Deep Analysis Pipeline - Unit Tests
 * 
 * Tests for:
 * 1. Duplicate detection in invoice IDs
 * 2. Outlier detection in amounts
 * 3. Critic verification (mismatch detection)
 */

import { describe, it, expect } from '@jest/globals';
import { 
  aggregateAll, 
  aggregateInvoiceIDs,
  aggregateAmounts,
} from '../src/main/ai/aggregator';
import type { 
  ExtractedAmount, 
  ExtractedDate, 
  ExtractedInvoiceID 
} from '../src/main/ai/numericExtractor';

describe('Deep Analysis Pipeline - Duplicate Detection', () => {
  it('should detect duplicate invoice IDs', () => {
    const invoices: ExtractedInvoiceID[] = [
      { id: 'INV-001', raw: 'INV-001', confidence: 0.9, pattern: 'structured' },
      { id: 'INV-002', raw: 'INV-002', confidence: 0.9, pattern: 'structured' },
      { id: 'INV-001', raw: 'INV-001', confidence: 0.9, pattern: 'structured' }, // Duplicate
      { id: 'INV-003', raw: 'INV-003', confidence: 0.9, pattern: 'structured' },
      { id: 'INV-002', raw: 'INV-002', confidence: 0.9, pattern: 'structured' }, // Duplicate
    ];

    const result = aggregateInvoiceIDs(invoices);

    expect(result).not.toBeNull();
    expect(result!.count).toBe(5);
    expect(result!.uniqueCount).toBe(3);
    expect(result!.duplicates).toContain('INV-001');
    expect(result!.duplicates).toContain('INV-002');
    expect(result!.duplicates.length).toBe(2);
  });

  it('should flag duplicatesFound when duplicates exist', () => {
    const amounts: ExtractedAmount[] = [
      { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9 },
    ];

    const dates: ExtractedDate[] = [];

    const invoices: ExtractedInvoiceID[] = [
      { id: 'INV-001', raw: 'INV-001', confidence: 0.9, pattern: 'structured' },
      { id: 'INV-001', raw: 'INV-001', confidence: 0.9, pattern: 'structured' }, // Duplicate
    ];

    const aggregation = aggregateAll(amounts, dates, invoices);

    expect(aggregation.metadata.duplicatesFound).toBe(true);
  });

  it('should not flag duplicatesFound when no duplicates', () => {
    const amounts: ExtractedAmount[] = [
      { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9 },
    ];

    const dates: ExtractedDate[] = [];

    const invoices: ExtractedInvoiceID[] = [
      { id: 'INV-001', raw: 'INV-001', confidence: 0.9, pattern: 'structured' },
      { id: 'INV-002', raw: 'INV-002', confidence: 0.9, pattern: 'structured' },
    ];

    const aggregation = aggregateAll(amounts, dates, invoices);

    expect(aggregation.metadata.duplicatesFound).toBe(false);
  });
});

describe('Deep Analysis Pipeline - Outlier Detection', () => {
  it('should detect outliers using IQR method', () => {
    // Normal distribution with one outlier
    const amounts: ExtractedAmount[] = [
      { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9 },
      { amount: 110, currency: 'TRY', raw: '110 TL', confidence: 0.9 },
      { amount: 105, currency: 'TRY', raw: '105 TL', confidence: 0.9 },
      { amount: 95, currency: 'TRY', raw: '95 TL', confidence: 0.9 },
      { amount: 102, currency: 'TRY', raw: '102 TL', confidence: 0.9 },
      { amount: 500, currency: 'TRY', raw: '500 TL', confidence: 0.9 }, // Outlier
    ];

    const result = aggregateAmounts(amounts, { includeStats: true });

    expect(result.outliers).toBeDefined();
    expect(result.outliers!.length).toBeGreaterThan(0);
    expect(result.outliers).toContain(500);
    expect(result.outliersFound).toBe(true);
  });

  it('should not detect outliers in uniform distribution', () => {
    const amounts: ExtractedAmount[] = [
      { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9 },
      { amount: 110, currency: 'TRY', raw: '110 TL', confidence: 0.9 },
      { amount: 105, currency: 'TRY', raw: '105 TL', confidence: 0.9 },
      { amount: 95, currency: 'TRY', raw: '95 TL', confidence: 0.9 },
      { amount: 102, currency: 'TRY', raw: '102 TL', confidence: 0.9 },
    ];

    const result = aggregateAmounts(amounts, { includeStats: true });

    expect(result.outliersFound).toBe(false);
  });

  it('should flag outliersFound in full aggregation', () => {
    const amounts: ExtractedAmount[] = [
      { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9 },
      { amount: 110, currency: 'TRY', raw: '110 TL', confidence: 0.9 },
      { amount: 105, currency: 'TRY', raw: '105 TL', confidence: 0.9 },
      { amount: 95, currency: 'TRY', raw: '95 TL', confidence: 0.9 },
      { amount: 1000, currency: 'TRY', raw: '1000 TL', confidence: 0.9 }, // Outlier
    ];

    const aggregation = aggregateAll(amounts, [], []);

    expect(aggregation.metadata.outliersFound).toBe(true);
    expect(aggregation.amounts.outliers).toContain(1000);
  });

  it('should handle multiple outliers correctly', () => {
    const amounts: ExtractedAmount[] = [
      { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9 },
      { amount: 110, currency: 'TRY', raw: '110 TL', confidence: 0.9 },
      { amount: 105, currency: 'TRY', raw: '105 TL', confidence: 0.9 },
      { amount: 95, currency: 'TRY', raw: '95 TL', confidence: 0.9 },
      { amount: 10, currency: 'TRY', raw: '10 TL', confidence: 0.9 }, // Low outlier
      { amount: 500, currency: 'TRY', raw: '500 TL', confidence: 0.9 }, // High outlier
    ];

    const result = aggregateAmounts(amounts, { includeStats: true });

    expect(result.outliers!.length).toBe(2);
    expect(result.outliers).toContain(10);
    expect(result.outliers).toContain(500);
  });
});

describe('Deep Analysis Pipeline - Critic Verification Simulation', () => {
  // Note: These tests simulate what the critic should detect
  // Actual critic testing would require mocking Mistral API
  
  it('should detect when sum is incorrect', () => {
    const amounts: ExtractedAmount[] = [
      { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9 },
      { amount: 200, currency: 'TRY', raw: '200 TL', confidence: 0.9 },
    ];

    const aggregation = aggregateAll(amounts, [], []);
    
    // Correct sum is 300
    expect(aggregation.amounts.sum).toBe(300);
    
    // Simulate critic checking: if LLM said "400 TL", critic should detect mismatch
    const llmSaidSum = 400;
    const isMismatch = llmSaidSum !== aggregation.amounts.sum;
    
    expect(isMismatch).toBe(true);
  });

  it('should verify when average is correct', () => {
    const amounts: ExtractedAmount[] = [
      { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9 },
      { amount: 200, currency: 'TRY', raw: '200 TL', confidence: 0.9 },
      { amount: 150, currency: 'TRY', raw: '150 TL', confidence: 0.9 },
    ];

    const aggregation = aggregateAll(amounts, [], []);
    
    expect(aggregation.amounts.average).toBe(150);
    
    // Simulate critic checking: LLM correctly said "150 TL average"
    const llmSaidAverage = 150;
    const isMismatch = Math.abs(llmSaidAverage - aggregation.amounts.average) > 0.01;
    
    expect(isMismatch).toBe(false);
  });

  it('should detect when count is incorrect', () => {
    const amounts: ExtractedAmount[] = [
      { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9 },
      { amount: 200, currency: 'TRY', raw: '200 TL', confidence: 0.9 },
      { amount: 150, currency: 'TRY', raw: '150 TL', confidence: 0.9 },
    ];

    const aggregation = aggregateAll(amounts, [], []);
    
    expect(aggregation.amounts.count).toBe(3);
    
    // Simulate critic checking: LLM said "5 invoices"
    const llmSaidCount = 5;
    const isMismatch = llmSaidCount !== aggregation.amounts.count;
    
    expect(isMismatch).toBe(true);
  });

  it('should verify median calculation', () => {
    const amounts: ExtractedAmount[] = [
      { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9 },
      { amount: 200, currency: 'TRY', raw: '200 TL', confidence: 0.9 },
      { amount: 300, currency: 'TRY', raw: '300 TL', confidence: 0.9 },
      { amount: 400, currency: 'TRY', raw: '400 TL', confidence: 0.9 },
      { amount: 500, currency: 'TRY', raw: '500 TL', confidence: 0.9 },
    ];

    const aggregation = aggregateAll(amounts, [], []);
    
    // Median should be 300
    expect(aggregation.amounts.median).toBe(300);
  });
});

describe('Deep Analysis Pipeline - Integration Tests', () => {
  it('should handle complete pipeline with all flags', () => {
    const amounts: ExtractedAmount[] = [
      { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9 },
      { amount: 110, currency: 'TRY', raw: '110 TL', confidence: 0.9 },
      { amount: 105, currency: 'TRY', raw: '105 TL', confidence: 0.9 },
      { amount: 1000, currency: 'TRY', raw: '1000 TL', confidence: 0.9 }, // Outlier
    ];

    const dates: ExtractedDate[] = [];

    const invoices: ExtractedInvoiceID[] = [
      { id: 'INV-001', raw: 'INV-001', confidence: 0.9, pattern: 'structured' },
      { id: 'INV-001', raw: 'INV-001', confidence: 0.9, pattern: 'structured' }, // Duplicate
    ];

    const aggregation = aggregateAll(amounts, dates, invoices);

    // Should detect both outliers and duplicates
    expect(aggregation.metadata.outliersFound).toBe(true);
    expect(aggregation.metadata.duplicatesFound).toBe(true);
    
    // Verify statistics
    expect(aggregation.amounts.count).toBe(4);
    expect(aggregation.amounts.outliers).toBeDefined();
    expect(aggregation.invoices?.duplicates.length).toBeGreaterThan(0);
  });

  it('should provide complete stats including min and max', () => {
    const amounts: ExtractedAmount[] = [
      { amount: 50, currency: 'TRY', raw: '50 TL', confidence: 0.9 },
      { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9 },
      { amount: 200, currency: 'TRY', raw: '200 TL', confidence: 0.9 },
    ];

    const aggregation = aggregateAll(amounts, [], []);

    expect(aggregation.amounts.min).toBe(50);
    expect(aggregation.amounts.max).toBe(200);
    expect(aggregation.amounts.sum).toBe(350);
    expect(aggregation.amounts.average).toBeCloseTo(116.67, 1);
  });
});

