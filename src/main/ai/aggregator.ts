/**
 * Aggregator - Statistical aggregation and deduplication for extracted numeric data
 * 
 * Performs backend-side calculations: sum, average, median, count, deduplication
 */

import { ExtractedAmount, ExtractedDate, ExtractedInvoiceID } from './numericExtractor';

export interface AggregationResult {
  count: number;
  sum: number;
  average: number;
  median: number;
  min: number;
  max: number;
  currency: string | null;
  variance?: number;
  stddev?: number;
  outliers?: number[]; // Outlier values detected
  outliersFound?: boolean; // Flag for UI
}

export interface DateAggregation {
  count: number;
  earliest: string; // ISO date string
  latest: string;
  range: {
    from: string;
    to: string;
  };
}

export interface InvoiceAggregation {
  count: number;
  uniqueCount: number;
  duplicates: string[];
  ids: string[];
}

export interface FullAggregation {
  amounts: AggregationResult;
  dates: DateAggregation | null;
  invoices: InvoiceAggregation | null;
  metadata: {
    totalExtractions: number;
    lowConfidence: boolean;
    confidence: number;
    duplicatesFound?: boolean;
    outliersFound?: boolean;
  };
}

/**
 * Deduplicate amounts based on heuristic similarity
 * 
 * Deduplication rules:
 * - Same amount and currency within 0.01 tolerance
 * - Same sectionId
 */
export function deduplicateAmounts(amounts: ExtractedAmount[]): ExtractedAmount[] {
  const unique: ExtractedAmount[] = [];
  const seen = new Map<string, ExtractedAmount>();

  amounts.forEach(amount => {
    // Create a key based on rounded amount, currency, and sectionId
    const roundedAmount = Math.round(amount.amount * 100) / 100;
    const key = `${roundedAmount}_${amount.currency || 'none'}_${amount.sectionId || 'global'}`;
    
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, amount);
      unique.push(amount);
    } else {
      // Keep the one with higher confidence
      if (amount.confidence > existing.confidence) {
        const index = unique.indexOf(existing);
        if (index !== -1) {
          unique[index] = amount;
          seen.set(key, amount);
        }
      }
    }
  });

  return unique;
}

/**
 * Filter amounts by currency
 */
export function filterByCurrency(amounts: ExtractedAmount[], currency: string): ExtractedAmount[] {
  const normalized = currency.toUpperCase();
  return amounts.filter(a => {
    if (!a.currency) return false;
    return a.currency.toUpperCase() === normalized;
  });
}

/**
 * Calculate median value
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
}

/**
 * Calculate variance
 */
function calculateVariance(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Detect outliers using IQR (Interquartile Range) method
 * Returns array of outlier values
 */
function detectOutliers(values: number[]): number[] {
  if (values.length < 4) return []; // Need at least 4 values for IQR
  
  const sorted = [...values].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  return values.filter(v => v < lowerBound || v > upperBound);
}

/**
 * Aggregate amounts into statistics
 */
export function aggregateAmounts(
  amounts: ExtractedAmount[],
  options: {
    deduplicate?: boolean;
    currency?: string;
    includeStats?: boolean;
  } = {}
): AggregationResult {
  const {
    deduplicate = true,
    currency = null,
    includeStats = true,
  } = options;

  let workingAmounts = [...amounts];

  // Filter by currency if specified
  if (currency) {
    workingAmounts = filterByCurrency(workingAmounts, currency);
  }

  // Deduplicate if requested
  if (deduplicate) {
    workingAmounts = deduplicateAmounts(workingAmounts);
  }

  const values = workingAmounts.map(a => a.amount);
  const count = values.length;

  if (count === 0) {
    return {
      count: 0,
      sum: 0,
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      currency: currency || null,
    };
  }

  const sum = values.reduce((acc, v) => acc + v, 0);
  const average = sum / count;
  const median = calculateMedian(values);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const result: AggregationResult = {
    count,
    sum: Math.round(sum * 100) / 100, // Round to 2 decimals
    average: Math.round(average * 100) / 100,
    median: Math.round(median * 100) / 100,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    currency: workingAmounts[0]?.currency || currency || null,
  };

  if (includeStats) {
    const variance = calculateVariance(values, average);
    result.variance = Math.round(variance * 100) / 100;
    result.stddev = Math.round(Math.sqrt(variance) * 100) / 100;
    
    // Detect outliers
    const outliers = detectOutliers(values);
    if (outliers.length > 0) {
      result.outliers = outliers.map(v => Math.round(v * 100) / 100);
      result.outliersFound = true;
    } else {
      result.outliersFound = false;
    }
  }

  return result;
}

/**
 * Aggregate dates
 */
export function aggregateDates(dates: ExtractedDate[]): DateAggregation | null {
  if (dates.length === 0) return null;

  const sortedDates = [...dates].sort((a, b) => a.date.getTime() - b.date.getTime());
  const earliest = sortedDates[0];
  const latest = sortedDates[sortedDates.length - 1];

  return {
    count: dates.length,
    earliest: earliest.dateString,
    latest: latest.dateString,
    range: {
      from: earliest.dateString,
      to: latest.dateString,
    },
  };
}

/**
 * Aggregate invoice IDs
 */
export function aggregateInvoiceIDs(invoiceIds: ExtractedInvoiceID[]): InvoiceAggregation | null {
  if (invoiceIds.length === 0) return null;

  const idCounts = new Map<string, number>();
  const allIds: string[] = [];

  invoiceIds.forEach(invoice => {
    const normalized = invoice.id.trim().toUpperCase();
    allIds.push(invoice.id);
    idCounts.set(normalized, (idCounts.get(normalized) || 0) + 1);
  });

  const duplicates = Array.from(idCounts.entries())
    .filter(([_, count]) => count > 1)
    .map(([id]) => id);

  const unique = Array.from(new Set(invoiceIds.map(i => i.id.trim().toUpperCase())));

  return {
    count: invoiceIds.length,
    uniqueCount: unique.length,
    duplicates,
    ids: allIds,
  };
}

/**
 * Full aggregation of all extracted data
 */
export function aggregateAll(
  amounts: ExtractedAmount[],
  dates: ExtractedDate[],
  invoiceIds: ExtractedInvoiceID[],
  options: {
    currency?: string;
    deduplicate?: boolean;
  } = {}
): FullAggregation {
  const amountAgg = aggregateAmounts(amounts, {
    deduplicate: options.deduplicate ?? true,
    currency: options.currency,
    includeStats: true,
  });

  const dateAgg = aggregateDates(dates);
  const invoiceAgg = aggregateInvoiceIDs(invoiceIds);

  // Calculate confidence metrics
  const totalExtractions = amounts.length + dates.length + invoiceIds.length;
  const avgConfidence = amounts.length > 0
    ? amounts.reduce((sum, a) => sum + a.confidence, 0) / amounts.length
    : 0;

  const lowConfidence = amounts.length < 3 || avgConfidence < 0.6;
  
  // Check for duplicates in invoices
  const duplicatesFound = invoiceAgg ? invoiceAgg.duplicates.length > 0 : false;
  
  // Check for outliers in amounts
  const outliersFound = amountAgg.outliersFound || false;

  return {
    amounts: amountAgg,
    dates: dateAgg,
    invoices: invoiceAgg,
    metadata: {
      totalExtractions,
      lowConfidence,
      confidence: Math.round(avgConfidence * 100) / 100,
      duplicatesFound,
      outliersFound,
    },
  };
}

/**
 * Filter amounts by date range
 */
export function filterAmountsByDateRange(
  amounts: ExtractedAmount[],
  dates: ExtractedDate[],
  range: { from: string; to: string }
): ExtractedAmount[] {
  const fromDate = new Date(range.from);
  const toDate = new Date(range.to);

  // This is a simplified version - in practice, you'd need to correlate
  // amounts with their corresponding dates in the same text section
  // For now, we'll return all amounts if any date is in range
  
  const hasDateInRange = dates.some(d => {
    return d.date >= fromDate && d.date <= toDate;
  });

  return hasDateInRange ? amounts : [];
}

/**
 * Group amounts by currency
 */
export function groupByCurrency(amounts: ExtractedAmount[]): Map<string, ExtractedAmount[]> {
  const grouped = new Map<string, ExtractedAmount[]>();

  amounts.forEach(amount => {
    const currency = amount.currency || 'UNKNOWN';
    if (!grouped.has(currency)) {
      grouped.set(currency, []);
    }
    grouped.get(currency)!.push(amount);
  });

  return grouped;
}

/**
 * Get aggregations per currency
 */
export function aggregatePerCurrency(amounts: ExtractedAmount[]): Map<string, AggregationResult> {
  const grouped = groupByCurrency(amounts);
  const results = new Map<string, AggregationResult>();

  grouped.forEach((currencyAmounts, currency) => {
    const agg = aggregateAmounts(currencyAmounts, {
      deduplicate: true,
      currency,
      includeStats: true,
    });
    results.set(currency, agg);
  });

  return results;
}

