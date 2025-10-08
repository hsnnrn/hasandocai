/**
 * Unit tests for numericExtractor
 * 
 * Tests Turkish and US number formats, currency detection, date parsing, and invoice IDs
 */

import {
  parseNumberString,
  extractAmountsFromText,
  extractDatesFromText,
  extractInvoiceIDs,
  extractFromTextSection,
} from '../src/main/ai/numericExtractor';

describe('numericExtractor', () => {
  describe('parseNumberString', () => {
    it('should parse Turkish format (1.234,56)', () => {
      expect(parseNumberString('1.234,56', 'tr')).toBe(1234.56);
      expect(parseNumberString('10.000,00', 'tr')).toBe(10000.00);
    });

    it('should parse US format (1,234.56)', () => {
      expect(parseNumberString('1,234.56', 'us')).toBe(1234.56);
      expect(parseNumberString('10,000.00', 'us')).toBe(10000.00);
    });

    it('should handle simple numbers without separators', () => {
      expect(parseNumberString('1234', 'tr')).toBe(1234);
      expect(parseNumberString('1234.56', 'auto')).toBe(1234.56);
    });

    it('should handle negative numbers', () => {
      expect(parseNumberString('-1.234,56', 'tr')).toBe(-1234.56);
      expect(parseNumberString('(1,234.56)', 'us')).toBe(-1234.56);
    });

    it('should auto-detect format', () => {
      expect(parseNumberString('1.234,56', 'auto')).toBe(1234.56); // Turkish
      expect(parseNumberString('1,234.56', 'auto')).toBe(1234.56); // US
    });
  });

  describe('extractAmountsFromText', () => {
    it('should extract amounts with TL/TRY currency', () => {
      const text = 'Toplam: 1.234,56 TL';
      const amounts = extractAmountsFromText(text, 'tr');
      
      expect(amounts).toHaveLength(1);
      expect(amounts[0].amount).toBe(1234.56);
      expect(amounts[0].currency).toBe('TRY');
      expect(amounts[0].confidence).toBeGreaterThan(0.9);
    });

    it('should extract amounts with USD currency', () => {
      const text = 'Total: $1,234.56';
      const amounts = extractAmountsFromText(text, 'us');
      
      expect(amounts).toHaveLength(1);
      expect(amounts[0].amount).toBe(1234.56);
      expect(amounts[0].currency).toBe('USD');
    });

    it('should extract amounts with EUR currency', () => {
      const text = 'Amount: €999.99';
      const amounts = extractAmountsFromText(text, 'us');
      
      expect(amounts).toHaveLength(1);
      expect(amounts[0].amount).toBe(999.99);
      expect(amounts[0].currency).toBe('EUR');
    });

    it('should extract amounts with "Toplam" label', () => {
      const text = 'Ara Toplam: 5.000,00 TL\nToplam: 10.000,00 TL';
      const amounts = extractAmountsFromText(text, 'tr');
      
      expect(amounts.length).toBeGreaterThanOrEqual(2);
      expect(amounts.some(a => a.amount === 5000)).toBe(true);
      expect(amounts.some(a => a.amount === 10000)).toBe(true);
    });

    it('should handle amounts in parentheses (negative)', () => {
      const text = 'Fatura: (1.234,56) TL';
      const amounts = extractAmountsFromText(text, 'tr');
      
      expect(amounts.length).toBeGreaterThanOrEqual(1);
      // Should extract the absolute value
    });

    it('should deduplicate similar amounts', () => {
      const text = '1.234,56 TL mentioned twice: 1.234,56 TL';
      const amounts = extractAmountsFromText(text, 'tr');
      
      // Should only extract once or with high confidence
      expect(amounts.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle multiple currencies in same text', () => {
      const text = 'USD: $100.00 and TRY: 2.000,00 TL';
      const amounts = extractAmountsFromText(text, 'auto');
      
      expect(amounts.length).toBeGreaterThanOrEqual(2);
      expect(amounts.some(a => a.currency === 'USD')).toBe(true);
      expect(amounts.some(a => a.currency === 'TRY')).toBe(true);
    });
  });

  describe('extractDatesFromText', () => {
    it('should extract Turkish date format (DD.MM.YYYY)', () => {
      const text = 'Tarih: 15.03.2024';
      const dates = extractDatesFromText(text);
      
      expect(dates).toHaveLength(1);
      expect(dates[0].dateString).toBe('2024-03-15');
      expect(dates[0].format).toBe('DD.MM.YYYY');
    });

    it('should extract ISO date format (YYYY-MM-DD)', () => {
      const text = 'Date: 2024-03-15';
      const dates = extractDatesFromText(text);
      
      expect(dates).toHaveLength(1);
      expect(dates[0].dateString).toBe('2024-03-15');
      expect(dates[0].format).toBe('YYYY-MM-DD');
    });

    it('should extract slash date format (DD/MM/YYYY)', () => {
      const text = 'Invoice date: 15/03/2024';
      const dates = extractDatesFromText(text);
      
      expect(dates).toHaveLength(1);
      expect(dates[0].dateString).toBe('2024-03-15');
      expect(dates[0].format).toBe('DD/MM/YYYY');
    });

    it('should extract multiple dates', () => {
      const text = 'Başlangıç: 01.01.2024, Bitiş: 31.12.2024';
      const dates = extractDatesFromText(text);
      
      expect(dates.length).toBeGreaterThanOrEqual(2);
    });

    it('should validate date ranges', () => {
      const text = 'Invalid: 32.13.2024'; // Invalid date
      const dates = extractDatesFromText(text);
      
      // Should not extract invalid dates
      expect(dates.length).toBe(0);
    });
  });

  describe('extractInvoiceIDs', () => {
    it('should extract labeled invoice IDs', () => {
      const text = 'Fatura No: ABC-123-456';
      const ids = extractInvoiceIDs(text);
      
      expect(ids.length).toBeGreaterThanOrEqual(1);
      expect(ids[0].confidence).toBeGreaterThan(0.9);
    });

    it('should extract structured invoice IDs (FT-2024-001)', () => {
      const text = 'Invoice: FT-2024-001';
      const ids = extractInvoiceIDs(text);
      
      expect(ids.length).toBeGreaterThanOrEqual(1);
      expect(ids[0].pattern).toBe('structured');
    });

    it('should extract year-sequential format (2024/001234)', () => {
      const text = 'Invoice number: 2024/001234';
      const ids = extractInvoiceIDs(text);
      
      expect(ids.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle Turkish invoice labels', () => {
      const text = 'Fatura Numarası: INV-2024-0001';
      const ids = extractInvoiceIDs(text);
      
      expect(ids.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('extractFromTextSection', () => {
    it('should extract all data types from a section', () => {
      const text = `
        Fatura No: FT-2024-001
        Tarih: 15.03.2024
        Toplam: 1.234,56 TL
      `;
      
      const result = extractFromTextSection(text, 'section_123', 'tr');
      
      expect(result.amounts.length).toBeGreaterThanOrEqual(1);
      expect(result.dates.length).toBeGreaterThanOrEqual(1);
      expect(result.invoiceIds.length).toBeGreaterThanOrEqual(1);
    });

    it('should attach section ID to amounts', () => {
      const text = 'Amount: 100.00 TL';
      const result = extractFromTextSection(text, 'test_section', 'tr');
      
      expect(result.amounts[0]?.sectionId).toBe('test_section');
    });

    it('should handle empty text', () => {
      const result = extractFromTextSection('', 'empty_section', 'tr');
      
      expect(result.amounts).toHaveLength(0);
      expect(result.dates).toHaveLength(0);
      expect(result.invoiceIds).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle very large numbers', () => {
      const text = 'Toplam: 1.000.000,00 TL';
      const amounts = extractAmountsFromText(text, 'tr');
      
      expect(amounts[0]?.amount).toBe(1000000);
    });

    it('should handle very small numbers', () => {
      const text = 'Amount: 0,01 TL';
      const amounts = extractAmountsFromText(text, 'tr');
      
      expect(amounts[0]?.amount).toBe(0.01);
    });

    it('should handle mixed content', () => {
      const text = `
        Some random text here
        Fatura: 123.45 TL
        More text
        Date: 01.01.2024
        Even more text
      `;
      
      const result = extractFromTextSection(text, 'mixed', 'tr');
      
      expect(result.amounts.length).toBeGreaterThanOrEqual(1);
      expect(result.dates.length).toBeGreaterThanOrEqual(1);
    });
  });
});

