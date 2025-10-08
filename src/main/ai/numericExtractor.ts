/**
 * Numeric Extractor - Deterministic extraction of numbers, dates, and invoice IDs
 * 
 * This module provides locale-aware parsing for Turkish and US number formats,
 * date extraction, currency detection, and invoice ID pattern matching.
 */

export interface ExtractedAmount {
  amount: number;
  currency?: string | null;
  raw: string;
  sectionId?: string;
  confidence: number;
  context?: string;
}

export interface ExtractedDate {
  date: Date;
  dateString: string;
  raw: string;
  format: 'DD.MM.YYYY' | 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'other';
  confidence: number;
}

export interface ExtractedInvoiceID {
  id: string;
  raw: string;
  confidence: number;
  pattern: string;
}

export interface ExtractionResult {
  amounts: ExtractedAmount[];
  dates: ExtractedDate[];
  invoiceIds: ExtractedInvoiceID[];
  rawText: string;
}

/**
 * Parse number string with locale-aware heuristics
 * 
 * Handles:
 * - Turkish: 1.234,56 → 1234.56
 * - US: 1,234.56 → 1234.56
 * - Simple: 1234.56 or 1234,56
 */
export function parseNumberString(s: string, locale: 'tr' | 'us' | 'auto' = 'auto'): number {
  // Remove all non-numeric characters except comma, dot, and minus
  const cleaned = s.replace(/[^\d.,-]/g, '').trim();
  
  if (!cleaned) {
    return NaN;
  }

  // Handle negative numbers
  const isNegative = s.includes('-') || s.includes('(') && s.includes(')');
  const absolute = cleaned.replace(/-/g, '');

  // Determine format based on comma and dot positions
  const hasComma = absolute.includes(',');
  const hasDot = absolute.includes('.');
  
  let result: number;

  if (hasComma && hasDot) {
    const lastCommaPos = absolute.lastIndexOf(',');
    const lastDotPos = absolute.lastIndexOf('.');
    
    if (locale === 'tr' || (locale === 'auto' && lastCommaPos > lastDotPos)) {
      // Turkish format: 1.234,56
      result = parseFloat(absolute.replace(/\./g, '').replace(',', '.'));
    } else {
      // US format: 1,234.56
      result = parseFloat(absolute.replace(/,/g, ''));
    }
  } else if (hasComma && !hasDot) {
    if (locale === 'tr' || locale === 'auto') {
      // Could be Turkish decimal (1234,56) or US thousands (1,234)
      const parts = absolute.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        // Likely decimal: 1234,56
        result = parseFloat(absolute.replace(',', '.'));
      } else {
        // Likely thousands: 1,234,567
        result = parseFloat(absolute.replace(/,/g, ''));
      }
    } else {
      // US: treat comma as thousands separator
      result = parseFloat(absolute.replace(/,/g, ''));
    }
  } else if (!hasComma && hasDot) {
    // Could be decimal or thousands
    const parts = absolute.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Likely decimal: 1234.56
      result = parseFloat(absolute);
    } else {
      // Likely thousands: 1.234.567 (Turkish thousands)
      result = parseFloat(absolute.replace(/\./g, ''));
    }
  } else {
    // No separators
    result = parseFloat(absolute);
  }

  return isNegative ? -result : result;
}

/**
 * Extract monetary amounts from text
 * 
 * Detects:
 * - Currency symbols: ₺, TL, TRY, $, USD, €, EUR
 * - Labels: Toplam, Ara Toplam, Total, Tutar, Amount
 * - Parentheses for negative amounts
 * - Various number formats
 */
export function extractAmountsFromText(content: string, locale: 'tr' | 'us' | 'auto' = 'tr'): ExtractedAmount[] {
  const results: ExtractedAmount[] = [];
  
  // Enhanced regex patterns for currency detection
  const patterns = [
    // Pattern 1: Label + number + currency (e.g., "Toplam: 1.234,56 TL")
    /(?:toplam|ara\s*toplam|tutar|total|amount|subtotal|fiyat|price|bedel)[:\s]*([0-9.,()-]+)\s*(₺|TL|TRY|\$|USD|€|EUR)?/gi,
    
    // Pattern 2: Currency + number (e.g., "₺1.234,56" or "$1,234.56")
    /(₺|TL|TRY|\$|USD|€|EUR)\s*([0-9.,()-]+)/gi,
    
    // Pattern 3: Number + currency (e.g., "1.234,56 TL")
    /([0-9.,()-]+)\s*(₺|TL|TRY|\$|USD|€|EUR)/gi,
    
    // Pattern 4: Standalone numbers with specific context
    /(?:fatura|invoice|ödeme|payment|tahsilat|collection)[^\d]*([0-9.,()-]+)/gi,
  ];

  const seen = new Set<string>(); // Deduplicate

  patterns.forEach((pattern, patternIndex) => {
    let match;
    pattern.lastIndex = 0; // Reset regex state
    
    while ((match = pattern.exec(content)) !== null) {
      let numberStr: string;
      let currencyStr: string | null = null;
      let contextLabel = '';
      let confidence = 0.9;

      // Extract based on pattern structure
      if (patternIndex === 0) {
        // Label + number + currency
        contextLabel = match[0].split(':')[0].trim();
        numberStr = match[1];
        currencyStr = match[2] || null;
        confidence = 0.95; // High confidence with label
      } else if (patternIndex === 1) {
        // Currency + number
        currencyStr = match[1];
        numberStr = match[2];
        confidence = 0.9;
      } else if (patternIndex === 2) {
        // Number + currency
        numberStr = match[1];
        currencyStr = match[2];
        confidence = 0.9;
      } else {
        // Contextual number
        contextLabel = match[0].split(/\d/)[0].trim();
        numberStr = match[1];
        confidence = 0.7; // Lower confidence without currency
      }

      const amount = parseNumberString(numberStr, locale);
      
      if (!Number.isNaN(amount) && amount !== 0) {
        const raw = match[0].trim();
        const key = `${amount}_${currencyStr || 'none'}`;
        
        if (!seen.has(key)) {
          seen.add(key);
          
          // Normalize currency
          const normalizedCurrency = normalizeCurrency(currencyStr);
          
          results.push({
            amount,
            currency: normalizedCurrency,
            raw,
            confidence,
            context: contextLabel || undefined,
          });
        }
      }
    }
  });

  return results;
}

/**
 * Normalize currency symbols and codes
 */
function normalizeCurrency(currency: string | null | undefined): string | null {
  if (!currency) return null;
  
  const upper = currency.toUpperCase().trim();
  
  if (upper === '₺' || upper === 'TL' || upper === 'TRY') return 'TRY';
  if (upper === '$' || upper === 'USD') return 'USD';
  if (upper === '€' || upper === 'EUR') return 'EUR';
  
  return upper;
}

/**
 * Extract dates from text
 * 
 * Supports formats:
 * - DD.MM.YYYY (Turkish)
 * - YYYY-MM-DD (ISO)
 * - DD/MM/YYYY
 * - DD-MM-YYYY
 */
export function extractDatesFromText(content: string): ExtractedDate[] {
  const results: ExtractedDate[] = [];
  
  const patterns: Array<{
    regex: RegExp;
    format: 'DD.MM.YYYY' | 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'other';
    parse: (match: RegExpMatchArray) => Date | null;
  }> = [
    {
      regex: /\b(\d{2})\.(\d{2})\.(\d{4})\b/g,
      format: 'DD.MM.YYYY',
      parse: (m) => {
        const day = parseInt(m[1], 10);
        const month = parseInt(m[2], 10);
        const year = parseInt(m[3], 10);
        if (day > 0 && day <= 31 && month > 0 && month <= 12) {
          return new Date(year, month - 1, day);
        }
        return null;
      },
    },
    {
      regex: /\b(\d{4})-(\d{2})-(\d{2})\b/g,
      format: 'YYYY-MM-DD',
      parse: (m) => {
        const year = parseInt(m[1], 10);
        const month = parseInt(m[2], 10);
        const day = parseInt(m[3], 10);
        if (day > 0 && day <= 31 && month > 0 && month <= 12) {
          return new Date(year, month - 1, day);
        }
        return null;
      },
    },
    {
      regex: /\b(\d{2})\/(\d{2})\/(\d{4})\b/g,
      format: 'DD/MM/YYYY',
      parse: (m) => {
        const day = parseInt(m[1], 10);
        const month = parseInt(m[2], 10);
        const year = parseInt(m[3], 10);
        if (day > 0 && day <= 31 && month > 0 && month <= 12) {
          return new Date(year, month - 1, day);
        }
        return null;
      },
    },
  ];

  patterns.forEach(({ regex, format, parse }) => {
    let match;
    regex.lastIndex = 0;
    
    while ((match = regex.exec(content)) !== null) {
      const date = parse(match);
      if (date && !isNaN(date.getTime())) {
        results.push({
          date,
          dateString: date.toISOString().split('T')[0], // YYYY-MM-DD
          raw: match[0],
          format,
          confidence: 0.9,
        });
      }
    }
  });

  return results;
}

/**
 * Extract invoice IDs from text
 * 
 * Patterns:
 * - Fatura No: ABC-123
 * - Invoice ID: 2024/001234
 * - FT-20240101-001
 */
export function extractInvoiceIDs(content: string): ExtractedInvoiceID[] {
  const results: ExtractedInvoiceID[] = [];
  
  const patterns = [
    {
      regex: /(?:fatura\s*no|fatura\s*numarası|invoice\s*no|invoice\s*number|invoice\s*id)[:\s]*([A-Za-z0-9\-_/]{4,})/gi,
      pattern: 'labeled',
      confidence: 0.95,
    },
    {
      regex: /\b(FT|INV|FAT|F)-(\d{4,})-?(\d{3,})\b/gi,
      pattern: 'structured',
      confidence: 0.9,
    },
    {
      regex: /\b(\d{4})\/(\d{4,})\b/g,
      pattern: 'year-sequential',
      confidence: 0.75,
    },
  ];

  const seen = new Set<string>();

  patterns.forEach(({ regex, pattern, confidence }) => {
    let match;
    regex.lastIndex = 0;
    
    while ((match = regex.exec(content)) !== null) {
      let id: string;
      
      if (pattern === 'labeled') {
        id = match[1].trim();
      } else if (pattern === 'structured') {
        id = `${match[1]}-${match[2]}-${match[3]}`;
      } else {
        id = match[0];
      }
      
      if (id.length >= 4 && !seen.has(id)) {
        seen.add(id);
        results.push({
          id,
          raw: match[0],
          confidence,
          pattern,
        });
      }
    }
  });

  return results;
}

/**
 * Extract all numeric data from text section
 */
export function extractFromTextSection(
  content: string,
  sectionId?: string,
  locale: 'tr' | 'us' | 'auto' = 'tr'
): ExtractionResult {
  const amounts = extractAmountsFromText(content, locale);
  const dates = extractDatesFromText(content);
  const invoiceIds = extractInvoiceIDs(content);

  // Attach section ID to amounts
  amounts.forEach(amount => {
    amount.sectionId = sectionId;
  });

  return {
    amounts,
    dates,
    invoiceIds,
    rawText: content,
  };
}

/**
 * Batch extract from multiple text sections
 */
export function batchExtract(
  sections: Array<{ id: string; content: string }>,
  locale: 'tr' | 'us' | 'auto' = 'tr'
): ExtractionResult {
  const allAmounts: ExtractedAmount[] = [];
  const allDates: ExtractedDate[] = [];
  const allInvoiceIds: ExtractedInvoiceID[] = [];

  sections.forEach(section => {
    const result = extractFromTextSection(section.content, section.id, locale);
    allAmounts.push(...result.amounts);
    allDates.push(...result.dates);
    allInvoiceIds.push(...result.invoiceIds);
  });

  return {
    amounts: allAmounts,
    dates: allDates,
    invoiceIds: allInvoiceIds,
    rawText: sections.map(s => s.content).join('\n'),
  };
}

