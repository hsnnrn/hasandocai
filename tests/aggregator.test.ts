/**
 * Unit tests for aggregator
 * 
 * Tests deduplication, statistical calculations, and currency grouping
 */

import {
  deduplicateAmounts,
  aggregateAmounts,
  aggregateDates,
  aggregateInvoiceIDs,
  aggregatePerCurrency,
} from '../src/main/ai/aggregator';
import { ExtractedAmount, ExtractedDate, ExtractedInvoiceID } from '../src/main/ai/numericExtractor';

describe('aggregator', () => {
  describe('deduplicateAmounts', () => {
    it('should remove exact duplicates', () => {
      const amounts: ExtractedAmount[] = [
        { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9 },
        { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9 },
      ];

      const result = deduplicateAmounts(amounts);
      expect(result).toHaveLength(1);
    });

    it('should keep amounts with different currencies', () => {
      const amounts: ExtractedAmount[] = [
        { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9 },
        { amount: 100, currency: 'USD', raw: '$100', confidence: 0.9 },
      ];

      const result = deduplicateAmounts(amounts);
      expect(result).toHaveLength(2);
    });

    it('should keep amounts from different sections', () => {
      const amounts: ExtractedAmount[] = [
        { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9, sectionId: 'section1' },
        { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9, sectionId: 'section2' },
      ];

      const result = deduplicateAmounts(amounts);
      expect(result).toHaveLength(2);
    });

    it('should keep higher confidence duplicate', () => {
      const amounts: ExtractedAmount[] = [
        { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.7 },
        { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.95 },
      ];

      const result = deduplicateAmounts(amounts);
      expect(result).toHaveLength(1);
      expect(result[0].confidence).toBe(0.95);
    });
  });

  describe('aggregateAmounts', () => {
    it('should calculate basic statistics', () => {
      const amounts: ExtractedAmount[] = [
        { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9 },
        { amount: 200, currency: 'TRY', raw: '200 TL', confidence: 0.9 },
        { amount: 300, currency: 'TRY', raw: '300 TL', confidence: 0.9 },
      ];

      const result = aggregateAmounts(amounts);

      expect(result.count).toBe(3);
      expect(result.sum).toBe(600);
      expect(result.average).toBe(200);
      expect(result.median).toBe(200);
      expect(result.min).toBe(100);
      expect(result.max).toBe(300);
    });

    it('should round to 2 decimal places', () => {
      const amounts: ExtractedAmount[] = [
        { amount: 10.555, currency: 'TRY', raw: '10.56 TL', confidence: 0.9 },
        { amount: 20.444, currency: 'TRY', raw: '20.44 TL', confidence: 0.9 },
      ];

      const result = aggregateAmounts(amounts);

      expect(result.sum).toBe(30.99);
      expect(result.average).toBe(15.5);
    });

    it('should calculate median correctly for even count', () => {
      const amounts: ExtractedAmount[] = [
        { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9 },
        { amount: 200, currency: 'TRY', raw: '200 TL', confidence: 0.9 },
        { amount: 300, currency: 'TRY', raw: '300 TL', confidence: 0.9 },
        { amount: 400, currency: 'TRY', raw: '400 TL', confidence: 0.9 },
      ];

      const result = aggregateAmounts(amounts);
      expect(result.median).toBe(250); // (200 + 300) / 2
    });

    it('should calculate median correctly for odd count', () => {
      const amounts: ExtractedAmount[] = [
        { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9 },
        { amount: 200, currency: 'TRY', raw: '200 TL', confidence: 0.9 },
        { amount: 300, currency: 'TRY', raw: '300 TL', confidence: 0.9 },
      ];

      const result = aggregateAmounts(amounts);
      expect(result.median).toBe(200);
    });

    it('should filter by currency', () => {
      const amounts: ExtractedAmount[] = [
        { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9 },
        { amount: 200, currency: 'USD', raw: '$200', confidence: 0.9 },
        { amount: 300, currency: 'TRY', raw: '300 TL', confidence: 0.9 },
      ];

      const result = aggregateAmounts(amounts, { currency: 'TRY' });

      expect(result.count).toBe(2);
      expect(result.sum).toBe(400);
    });

    it('should include variance and stddev when requested', () => {
      const amounts: ExtractedAmount[] = [
        { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9 },
        { amount: 200, currency: 'TRY', raw: '200 TL', confidence: 0.9 },
        { amount: 300, currency: 'TRY', raw: '300 TL', confidence: 0.9 },
      ];

      const result = aggregateAmounts(amounts, { includeStats: true });

      expect(result.variance).toBeDefined();
      expect(result.stddev).toBeDefined();
      expect(result.variance).toBeGreaterThan(0);
    });

    it('should handle empty amounts array', () => {
      const result = aggregateAmounts([]);

      expect(result.count).toBe(0);
      expect(result.sum).toBe(0);
      expect(result.average).toBe(0);
      expect(result.median).toBe(0);
    });
  });

  describe('aggregateDates', () => {
    it('should find earliest and latest dates', () => {
      const dates: ExtractedDate[] = [
        {
          date: new Date('2024-01-15'),
          dateString: '2024-01-15',
          raw: '15.01.2024',
          format: 'DD.MM.YYYY',
          confidence: 0.9,
        },
        {
          date: new Date('2024-03-20'),
          dateString: '2024-03-20',
          raw: '20.03.2024',
          format: 'DD.MM.YYYY',
          confidence: 0.9,
        },
        {
          date: new Date('2024-02-10'),
          dateString: '2024-02-10',
          raw: '10.02.2024',
          format: 'DD.MM.YYYY',
          confidence: 0.9,
        },
      ];

      const result = aggregateDates(dates);

      expect(result).not.toBeNull();
      expect(result?.count).toBe(3);
      expect(result?.earliest).toBe('2024-01-15');
      expect(result?.latest).toBe('2024-03-20');
      expect(result?.range.from).toBe('2024-01-15');
      expect(result?.range.to).toBe('2024-03-20');
    });

    it('should return null for empty dates', () => {
      const result = aggregateDates([]);
      expect(result).toBeNull();
    });
  });

  describe('aggregateInvoiceIDs', () => {
    it('should count total and unique IDs', () => {
      const ids: ExtractedInvoiceID[] = [
        { id: 'INV-001', raw: 'INV-001', confidence: 0.9, pattern: 'labeled' },
        { id: 'INV-002', raw: 'INV-002', confidence: 0.9, pattern: 'labeled' },
        { id: 'INV-001', raw: 'INV-001', confidence: 0.9, pattern: 'labeled' }, // Duplicate
      ];

      const result = aggregateInvoiceIDs(ids);

      expect(result).not.toBeNull();
      expect(result?.count).toBe(3);
      expect(result?.uniqueCount).toBe(2);
    });

    it('should identify duplicates', () => {
      const ids: ExtractedInvoiceID[] = [
        { id: 'INV-001', raw: 'INV-001', confidence: 0.9, pattern: 'labeled' },
        { id: 'INV-001', raw: 'INV-001', confidence: 0.9, pattern: 'labeled' },
        { id: 'INV-002', raw: 'INV-002', confidence: 0.9, pattern: 'labeled' },
      ];

      const result = aggregateInvoiceIDs(ids);

      expect(result?.duplicates).toContain('INV-001');
      expect(result?.duplicates).not.toContain('INV-002');
    });

    it('should return null for empty IDs', () => {
      const result = aggregateInvoiceIDs([]);
      expect(result).toBeNull();
    });
  });

  describe('aggregatePerCurrency', () => {
    it('should group and aggregate by currency', () => {
      const amounts: ExtractedAmount[] = [
        { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9 },
        { amount: 200, currency: 'TRY', raw: '200 TL', confidence: 0.9 },
        { amount: 50, currency: 'USD', raw: '$50', confidence: 0.9 },
        { amount: 100, currency: 'USD', raw: '$100', confidence: 0.9 },
      ];

      const result = aggregatePerCurrency(amounts);

      expect(result.size).toBe(2);
      expect(result.get('TRY')?.count).toBe(2);
      expect(result.get('TRY')?.sum).toBe(300);
      expect(result.get('USD')?.count).toBe(2);
      expect(result.get('USD')?.sum).toBe(150);
    });
  });
});

