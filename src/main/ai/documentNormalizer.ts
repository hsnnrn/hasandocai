/**
 * Document Normalizer - Transforms raw documents into canonical schema
 * 
 * Following Rag-workflow.md normalization rules:
 * - Date normalization (dd.mm.yyyy, yyyy-mm-dd → ISO8601)
 * - Number/currency normalization (Turkish format → decimal)
 * - Key mapping (FATURA_NO → invoice_no)
 * - OCR corrections
 * - Item normalization
 * 
 * Cursor Rule: Normalized records are immutable, versioned
 */

import {
  NormalizedDocument,
  DocumentType,
  LineItem,
  KEY_MAP,
  OCR_CORRECTIONS,
  createEmptyNormalizedDocument,
  DocumentValidator,
  ProcessingLogEntry,
  ExtractedTableMeta,
} from './canonicalSchema';
import { ClassificationResult } from './semanticClassifier';
import { TableExtractor } from './tableExtractor';

export interface RawDocument {
  id: string;
  filename: string;
  filePath: string;
  content: string;
  metadata?: Record<string, any>;
  extractedData?: Record<string, any>;
  buffer?: Buffer; // 🆕 For table extraction from binary files
}

export interface NormalizationOptions {
  strictValidation?: boolean;
  generateSummary?: boolean;
  summaryMaxLength?: number;
  extractTables?: boolean; // 🆕 Enable table extraction
}

export class DocumentNormalizer {
  private tableExtractor: TableExtractor;

  constructor() {
    this.tableExtractor = new TableExtractor();
  }
  /**
   * Normalize raw document to canonical schema
   */
  async normalize(
    raw: RawDocument,
    classification: ClassificationResult,
    options: NormalizationOptions = {}
  ): Promise<NormalizedDocument> {
    const startTime = Date.now();
    const log: ProcessingLogEntry[] = [];

    log.push({
      timestamp: new Date().toISOString(),
      stage: 'normalize',
      status: 'success',
      message: 'Starting normalization',
      details: { filename: raw.filename, type: classification.type },
    });

    // Create base document
    const doc = createEmptyNormalizedDocument(raw.id, raw.filename, raw.filePath);
    doc.type = classification.type;
    doc.confidence = classification.confidence;

    // Apply key mapping to extracted data
    const mappedData = this.applyKeyMapping(raw.extractedData || raw.metadata || {});

    // 🆕 STEP: Extract tables from document (if buffer provided)
    if (options.extractTables !== false && raw.buffer) {
      await this.extractAndProcessTables(doc, raw.buffer, raw.filename);
    }

    // Normalize fields based on document type
    if (classification.type === 'fatura') {
      this.normalizeInvoice(doc, mappedData, raw.content);
    } else {
      this.normalizeGenericDocument(doc, mappedData, raw.content);
    }

    // Generate summary (source_sample)
    if (options.generateSummary !== false) {
      doc.source_sample = this.generateSourceSample(doc, raw.content, options.summaryMaxLength);
    }

    // Set human review flag
    doc.needs_human_review = classification.confidence.classification < 0.6 || !doc.total;

    // Add processing time
    const elapsed = Date.now() - startTime;
    log.push({
      timestamp: new Date().toISOString(),
      stage: 'normalize',
      status: 'success',
      message: `Normalization completed in ${elapsed}ms`,
      details: { needs_review: doc.needs_human_review },
    });

    doc.processing_log = log;

    // Validate if strict mode
    if (options.strictValidation) {
      const validation = DocumentValidator.validate(doc);
      if (!validation.valid) {
        log.push({
          timestamp: new Date().toISOString(),
          stage: 'validate',
          status: 'error',
          message: 'Validation failed',
          details: validation,
        });
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
    }

    return doc;
  }

  /**
   * Apply key mapping to convert field names to canonical format
   */
  private applyKeyMapping(data: Record<string, any>): Record<string, any> {
    const mapped: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      const normalizedKey = KEY_MAP[key] || key.toLowerCase();
      mapped[normalizedKey] = value;
    }

    return mapped;
  }

  /**
   * Normalize invoice-specific fields
   */
  private normalizeInvoice(
    doc: NormalizedDocument,
    data: Record<string, any>,
    rawContent: string
  ): void {
    // Invoice number
    doc.invoice_no = this.extractString(data, ['invoice_no', 'number', 'no']);

    // Date
    doc.date = this.normalizeDate(
      this.extractString(data, ['date', 'invoice_date', 'tarih'])
    );

    // Supplier
    doc.supplier = this.extractString(data, ['supplier', 'vendor', 'satici', 'tedarikci', 'from']);

    // Buyer
    doc.buyer = this.extractString(data, ['buyer', 'customer', 'alici', 'musteri', 'to']);

    // Currency and amounts
    doc.currency = this.normalizeCurrency(
      this.extractString(data, ['currency', 'para_birimi', 'doviz']) || 'TRY'
    );

    const totalStr = this.extractString(data, ['total', 'amount', 'toplam', 'tutar', 'toplam_tutar']);
    doc.total = this.parseNumber(totalStr);

    const taxStr = this.extractString(data, ['tax', 'vat', 'kdv', 'tax_amount']);
    doc.tax = this.parseNumber(taxStr);

    // Items
    if (data.items && Array.isArray(data.items)) {
      doc.items = data.items.map((item: any) => this.normalizeLineItem(item));
    }

    // If no total but have items, calculate total
    if (!doc.total && doc.items.length > 0) {
      doc.total = doc.items.reduce((sum, item) => sum + item.line_total, 0);
    }
  }

  /**
   * Normalize generic document (non-invoice)
   */
  private normalizeGenericDocument(
    doc: NormalizedDocument,
    data: Record<string, any>,
    rawContent: string
  ): void {
    // Try to extract common fields
    doc.date = this.normalizeDate(
      this.extractString(data, ['date', 'tarih', 'created_date'])
    );

    doc.supplier = this.extractString(data, ['from', 'sender', 'gonderen', 'kaynak']);
    doc.buyer = this.extractString(data, ['to', 'recipient', 'alici', 'hedef']);

    // Generic document usually doesn't have total/tax
    doc.total = null;
    doc.tax = null;
    doc.items = [];
  }

  /**
   * Normalize line item
   */
  private normalizeLineItem(item: any): LineItem {
    const description = String(item.description || item.item || item.product || '');
    const qty = this.parseNumber(item.qty || item.quantity || item.adet) || 1;
    const unit_price = this.parseNumber(item.unit_price || item.price || item.birim_fiyat) || 0;
    const line_total = this.parseNumber(item.line_total || item.total || item.tutar) || (qty * unit_price);

    return {
      description,
      qty,
      unit_price,
      line_total,
      currency: item.currency,
    };
  }

  /**
   * Extract string from data with multiple possible keys
   */
  private extractString(data: Record<string, any>, keys: string[]): string | null {
    for (const key of keys) {
      if (data[key] !== undefined && data[key] !== null) {
        return String(data[key]).trim();
      }
    }
    return null;
  }

  /**
   * Normalize date to ISO8601 format
   * Supports: dd.mm.yyyy, dd/mm/yyyy, yyyy-mm-dd
   */
  private normalizeDate(dateStr: string | null): string | null {
    if (!dateStr) return null;

    const cleaned = dateStr.trim();

    // Try ISO8601 first (already normalized)
    if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
      return new Date(cleaned).toISOString();
    }

    // dd.mm.yyyy or dd/mm/yyyy
    const ddmmyyyyMatch = cleaned.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    // yyyy.mm.dd or yyyy/mm/dd
    const yyyymmddMatch = cleaned.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})/);
    if (yyyymmddMatch) {
      const [, year, month, day] = yyyymmddMatch;
      const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    console.warn('Failed to parse date:', dateStr);
    return null;
  }

  /**
   * Parse Turkish number format to decimal
   * 12.345,67 TL → 12345.67
   * 1,234.56 → 1234.56
   */
  private parseNumber(value: any): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;

    const str = String(value).trim();
    
    // Remove currency symbols and text
    let cleaned = str.replace(/[₺$€£TRY USD EUR GBP TL]/gi, '').trim();

    // Detect format based on last separator
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');

    if (lastComma > lastDot) {
      // Turkish format: 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // English format: 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    }

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Normalize currency code
   */
  private normalizeCurrency(code: string | null): string | null {
    if (!code) return null;

    const normalized = code.toUpperCase().trim();
    
    if (normalized === 'TL') return 'TRY';
    if (normalized === 'EURO') return 'EUR';
    if (['TRY', 'USD', 'EUR', 'GBP'].includes(normalized)) return normalized;

    return null;
  }

  /**
   * Generate source sample (5-8 line summary for embedding)
   */
  private generateSourceSample(
    doc: NormalizedDocument,
    rawContent: string,
    maxLength: number = 500
  ): string {
    const lines: string[] = [];

    // Add filename
    lines.push(`Dosya: ${doc.filename}`);

    // Add type
    const typeNames: Record<DocumentType, string> = {
      fatura: 'Fatura',
      teklif: 'Teklif',
      fis: 'Fiş',
      irsaliye: 'İrsaliye',
      sozlesme: 'Sözleşme',
      diger: 'Belge',
    };
    lines.push(`Tür: ${typeNames[doc.type]}`);

    // Add key fields
    if (doc.invoice_no) lines.push(`Belge No: ${doc.invoice_no}`);
    if (doc.date) lines.push(`Tarih: ${new Date(doc.date).toLocaleDateString('tr-TR')}`);
    if (doc.supplier) lines.push(`Tedarikçi: ${doc.supplier}`);
    if (doc.total) lines.push(`Toplam: ${doc.total.toFixed(2)} ${doc.currency || 'TRY'}`);
    if (doc.tax) lines.push(`KDV: ${doc.tax.toFixed(2)} ${doc.currency || 'TRY'}`);

    // Add content preview
    const contentPreview = rawContent
      .substring(0, maxLength - lines.join('\n').length)
      .trim();
    
    if (contentPreview) {
      lines.push(`\nİçerik: ${contentPreview}...`);
    }

    return lines.join('\n');
  }

  /**
   * 🆕 Extract tables from document buffer and integrate into normalized document
   */
  private async extractAndProcessTables(
    doc: NormalizedDocument,
    buffer: Buffer,
    filename: string
  ): Promise<void> {
    try {
      console.log(`📊 Extracting tables from: ${filename}`);

      // Determine file type
      const ext = filename.split('.').pop()?.toLowerCase();
      let result;

      if (ext === 'docx') {
        result = await this.tableExtractor.extractFromDOCX(buffer);
      } else if (ext === 'xlsx' || ext === 'xls') {
        result = await this.tableExtractor.extractFromExcel(buffer);
      } else {
        console.log(`⏭️ Skipping table extraction for ${ext} files`);
        return;
      }

      if (result.success && result.tables.length > 0) {
        console.log(`✅ Extracted ${result.tables.length} tables`);

        // Add tables metadata to document
        doc.tables = result.tables.map(table => ({
          id: table.id,
          type: table.type,
          headers: table.headers,
          rowCount: table.rows.length,
          confidence: table.confidence,
        }));

        // If invoice line items were extracted, merge with existing items
        if (result.lineItems && result.lineItems.length > 0) {
          console.log(`✅ Extracted ${result.lineItems.length} line items from tables`);
          
          // If no items yet, use extracted items
          if (doc.items.length === 0) {
            doc.items = result.lineItems;
          } else {
            // Merge: prefer table-extracted items for fatura documents
            if (doc.type === 'fatura') {
              doc.items = result.lineItems;
            }
          }

          // Recalculate total if missing
          if (!doc.total && doc.items.length > 0) {
            doc.total = doc.items.reduce((sum, item) => sum + item.line_total, 0);
            console.log(`💰 Calculated total from line items: ${doc.total}`);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Table extraction failed:', error);
      // Non-critical: Continue without tables
    }
  }

  /**
   * Batch normalize multiple documents
   */
  async batchNormalize(
    rawDocs: RawDocument[],
    classifications: ClassificationResult[],
    options: NormalizationOptions = {}
  ): Promise<NormalizedDocument[]> {
    if (rawDocs.length !== classifications.length) {
      throw new Error('Mismatch between raw documents and classifications');
    }

    const normalized: NormalizedDocument[] = [];

    for (let i = 0; i < rawDocs.length; i++) {
      try {
        const doc = await this.normalize(rawDocs[i], classifications[i], options);
        normalized.push(doc);
      } catch (error) {
        console.error(`Failed to normalize ${rawDocs[i].filename}:`, error);
        // Skip failed documents or handle differently
      }
    }

    return normalized;
  }
}

