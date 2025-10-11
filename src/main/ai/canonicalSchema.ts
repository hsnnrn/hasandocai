/**
 * Canonical Schema for Normalized Documents
 * Based on Rag-workflow.md specifications
 * 
 * Every normalized document follows this standard schema for:
 * - Consistent storage format
 * - Reliable retrieval
 * - Type-safe processing
 */

/**
 * Document type classification
 */
export type DocumentType = 
  | 'fatura'      // Invoice
  | 'teklif'      // Offer/Quotation
  | 'fis'         // Receipt
  | 'irsaliye'    // Waybill
  | 'sozlesme'    // Contract
  | 'diger';      // Other

/**
 * Line item in invoice/document
 */
export interface LineItem {
  description: string;
  qty: number;
  unit_price: number;
  line_total: number;
  currency?: string;
}

/**
 * Classification confidence scores
 */
export interface ClassificationConfidence {
  classification: number;  // 0.0 - 1.0
  semantic_score?: number; // BGE-M3 semantic score
  heuristic_score?: number; // Filename/keyword heuristic score
}

/**
 * Extracted table metadata
 */
export interface ExtractedTableMeta {
  id: string;
  type: 'data' | 'line_items' | 'summary';
  headers: string[];
  rowCount: number;
  confidence: number;
}

/**
 * Document summary metadata
 */
export interface DocumentSummary {
  text: string;
  keyPoints: string[];
  generatedAt: string;  // ISO8601
  confidence: number;
  language: 'tr' | 'en';
}

/**
 * Canonical normalized document schema
 * Version 1 - Following Rag-workflow.md specification
 */
export interface NormalizedDocument {
  // Schema version for future migrations
  schema_v: number;

  // Core identification
  id: string;  // GUID
  filename: string;
  type: DocumentType;

  // Invoice-specific fields (null for non-invoices)
  invoice_no: string | null;
  date: string | null;  // ISO8601 format
  supplier: string | null;
  buyer: string | null;
  currency: string | null;  // TRY, USD, EUR, etc.
  total: number | null;
  tax: number | null;
  items: LineItem[];

  // Source and metadata
  raw_path: string;  // Original file path
  file_type: string;  // pdf, xlsx, docx, etc.
  confidence: ClassificationConfidence;
  normalized_at: string;  // ISO8601 timestamp

  // Summary for embedding and retrieval
  source_sample: string;  // 5-8 line summary for embedding

  // 🆕 AI-generated document summary
  summary?: DocumentSummary;

  // 🆕 Extracted tables metadata
  tables?: ExtractedTableMeta[];

  // Review flags
  needs_human_review: boolean;

  // Embedding data (optional, can be stored separately)
  embedding?: number[];
  embedding_model?: string;

  // Audit trail
  processing_log?: ProcessingLogEntry[];
}

/**
 * Processing log entry for audit trail
 */
export interface ProcessingLogEntry {
  timestamp: string;  // ISO8601
  stage: 'ingest' | 'classify' | 'normalize' | 'validate' | 'embed' | 'index';
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missingFields: string[];
}

/**
 * Key mapping for common field name variations
 * Used during normalization to standardize field names
 */
export const KEY_MAP: Record<string, string> = {
  // Invoice number variations
  'FATURA_NO': 'invoice_no',
  'FATURA_NUMARASI': 'invoice_no',
  'invoice_number': 'invoice_no',
  'invoice_num': 'invoice_no',
  'fatura_no': 'invoice_no',
  'invoiceNumber': 'invoice_no',

  // Date variations
  'TARIH': 'date',
  'FATURA_TARIHI': 'date',
  'invoice_date': 'date',
  'tarih': 'date',
  'invoiceDate': 'date',

  // Total variations
  'TOPLAM_TUTAR': 'total',
  'TOPLAM': 'total',
  'TUTAR': 'total',
  'amount': 'total',
  'total_amount': 'total',
  'toplam': 'total',
  'tutar': 'total',

  // Tax variations
  'KDV': 'tax',
  'KDV_TUTARI': 'tax',
  'TAX': 'tax',
  'VAT': 'tax',
  'tax_amount': 'tax',
  'kdv': 'tax',
  'vat': 'tax',

  // Supplier variations
  'SATICI': 'supplier',
  'TEDARIKCI': 'supplier',
  'FIRMA': 'supplier',
  'supplier': 'supplier',
  'vendor': 'supplier',
  'satici': 'supplier',
  'tedarikci': 'supplier',

  // Buyer variations
  'ALICI': 'buyer',
  'MUSTERI': 'buyer',
  'buyer': 'buyer',
  'customer': 'buyer',
  'alici': 'buyer',
  'musteri': 'buyer',

  // Currency variations
  'PARA_BIRIMI': 'currency',
  'DOVIZ': 'currency',
  'currency': 'currency',
  'para_birimi': 'currency',
  'doviz': 'currency',

  // Items/line items variations
  'KALEMLER': 'items',
  'URUNLER': 'items',
  'line_items': 'items',
  'items': 'items',
  'kalemler': 'items',
  'urunler': 'items',
};

/**
 * OCR correction patterns for common mistakes
 */
export const OCR_CORRECTIONS: Record<string, string> = {
  'KVÐ': 'KDV',
  'KVÞ': 'KDV',
  'KDÝ': 'KDV',
  'FATURÃ': 'FATURA',
  'TARÝH': 'TARIH',
  'TOPLAMÂ': 'TOPLAM',
};

/**
 * Document type keywords for heuristic classification
 */
export const DOCUMENT_TYPE_KEYWORDS: Record<DocumentType, string[]> = {
  fatura: ['fatura', 'invoice', 'bill', 'e-fatura', 'efatura'],
  teklif: ['teklif', 'quotation', 'quote', 'proposal', 'offer', 'pro forma'],
  fis: ['fiş', 'fis', 'receipt', 'makbuz'],
  irsaliye: ['irsaliye', 'waybill', 'delivery note', 'sevk'],
  sozlesme: ['sözleşme', 'sozlesme', 'contract', 'agreement'],
  diger: ['document', 'belge', 'döküman', 'doküman'],
};

/**
 * Validation rules for normalized documents
 */
export class DocumentValidator {
  /**
   * Validate a normalized document against the canonical schema
   */
  static validate(doc: Partial<NormalizedDocument>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingFields: string[] = [];

    // Required fields
    if (!doc.schema_v) missingFields.push('schema_v');
    if (!doc.id) missingFields.push('id');
    if (!doc.filename) missingFields.push('filename');
    if (!doc.type) missingFields.push('type');
    if (!doc.raw_path) missingFields.push('raw_path');
    if (!doc.normalized_at) missingFields.push('normalized_at');

    // Confidence validation
    if (doc.confidence) {
      if (doc.confidence.classification < 0 || doc.confidence.classification > 1) {
        errors.push('confidence.classification must be between 0 and 1');
      }
      if (doc.confidence.classification < 0.6) {
        warnings.push('Low classification confidence (<0.6) - needs human review');
      }
    } else {
      missingFields.push('confidence');
    }

    // Invoice-specific validation
    if (doc.type === 'fatura') {
      if (!doc.invoice_no) warnings.push('Invoice has no invoice_no');
      if (!doc.date) warnings.push('Invoice has no date');
      if (!doc.total && (!doc.items || doc.items.length === 0)) {
        warnings.push('Invoice has no total and no items to calculate from');
      }
    }

    // Date format validation
    if (doc.date && !this.isISO8601(doc.date)) {
      errors.push(`Invalid date format: ${doc.date} (expected ISO8601)`);
    }

    // Timestamp validation
    if (doc.normalized_at && !this.isISO8601(doc.normalized_at)) {
      errors.push(`Invalid normalized_at format: ${doc.normalized_at} (expected ISO8601)`);
    }

    // Source sample validation
    if (!doc.source_sample || doc.source_sample.length < 10) {
      warnings.push('source_sample too short or missing');
    }

    return {
      valid: errors.length === 0 && missingFields.length === 0,
      errors,
      warnings,
      missingFields,
    };
  }

  /**
   * Check if date string is ISO8601 format
   */
  private static isISO8601(dateStr: string): boolean {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return iso8601Regex.test(dateStr);
  }
}

/**
 * Helper function to create empty normalized document
 */
export function createEmptyNormalizedDocument(
  id: string,
  filename: string,
  rawPath: string
): NormalizedDocument {
  return {
    schema_v: 1,
    id,
    filename,
    type: 'diger',
    invoice_no: null,
    date: null,
    supplier: null,
    buyer: null,
    currency: null,
    total: null,
    tax: null,
    items: [],
    raw_path: rawPath,
    file_type: filename.split('.').pop() || 'unknown',
    confidence: {
      classification: 0.5,
    },
    normalized_at: new Date().toISOString(),
    source_sample: '',
    needs_human_review: false,
    processing_log: [],
  };
}

