/**
 * Table Extraction Service
 * Extracts and structures table data from documents (DOCX, PDF, Excel)
 * 
 * Features:
 * - Automatic table detection
 * - Line items extraction for invoices
 * - Structured JSON output
 * - Smart column mapping
 */

import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';

/**
 * Extracted table structure
 */
export interface ExtractedTable {
  id: string;
  type: 'data' | 'line_items' | 'summary';
  headers: string[];
  rows: TableRow[];
  confidence: number;
  location?: {
    page?: number;
    section?: string;
  };
}

export interface TableRow {
  cells: string[];
  parsed?: Record<string, any>;
}

/**
 * Line item specifically for invoices
 */
export interface InvoiceLineItem {
  description: string;
  qty: number;
  unit_price: number;
  line_total: number;
  currency?: string;
  unit?: string;
  tax_rate?: number;
}

/**
 * Table extraction result
 */
export interface TableExtractionResult {
  success: boolean;
  tables: ExtractedTable[];
  lineItems?: InvoiceLineItem[];
  confidence: number;
  error?: string;
}

/**
 * Table Extractor - Extracts tables from various document formats
 */
export class TableExtractor {
  /**
   * Extract tables from DOCX buffer
   */
  async extractFromDOCX(buffer: Buffer): Promise<TableExtractionResult> {
    try {
      console.log('📊 TableExtractor: Extracting tables from DOCX...');

      // Extract HTML to capture table structure
      const result = await mammoth.convertToHtml({ buffer });
      const html = result.value;

      // Parse HTML to find tables
      const tables = this.parseTablesFromHTML(html);

      console.log(`📊 Found ${tables.length} tables in DOCX`);

      return {
        success: true,
        tables,
        lineItems: this.extractLineItemsFromTables(tables),
        confidence: tables.length > 0 ? 0.85 : 0.5,
      };
    } catch (error) {
      console.error('❌ TableExtractor DOCX error:', error);
      return {
        success: false,
        tables: [],
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract tables from Excel buffer
   */
  async extractFromExcel(buffer: Buffer): Promise<TableExtractionResult> {
    try {
      console.log('📊 TableExtractor: Extracting tables from Excel...');

      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const tables: ExtractedTable[] = [];

      // Process each sheet as a table
      workbook.SheetNames.forEach((sheetName, index) => {
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        if (jsonData.length > 0) {
          const headers = jsonData[0].map((h: any) => String(h || ''));
          const rows = jsonData.slice(1).map((row: any[]) => ({
            cells: row.map((cell: any) => String(cell || '')),
          }));

          tables.push({
            id: `excel_table_${index}`,
            type: this.detectTableType(headers, rows),
            headers,
            rows,
            confidence: 0.9,
            location: { section: sheetName },
          });
        }
      });

      console.log(`📊 Found ${tables.length} tables in Excel`);

      return {
        success: true,
        tables,
        lineItems: this.extractLineItemsFromTables(tables),
        confidence: tables.length > 0 ? 0.9 : 0.5,
      };
    } catch (error) {
      console.error('❌ TableExtractor Excel error:', error);
      return {
        success: false,
        tables: [],
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Parse tables from HTML string
   */
  private parseTablesFromHTML(html: string): ExtractedTable[] {
    const tables: ExtractedTable[] = [];
    
    // Simple regex-based HTML table parsing (can be enhanced with a proper HTML parser)
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const tableMatches = html.matchAll(tableRegex);

    let tableIndex = 0;
    for (const match of tableMatches) {
      const tableHtml = match[1];
      const table = this.parseTableHTML(tableHtml, tableIndex);
      if (table) {
        tables.push(table);
        tableIndex++;
      }
    }

    return tables;
  }

  /**
   * Parse individual table HTML
   */
  private parseTableHTML(tableHtml: string, index: number): ExtractedTable | null {
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;

    const rows: TableRow[] = [];
    const rowMatches = tableHtml.matchAll(rowRegex);

    let headers: string[] = [];
    let isFirstRow = true;

    for (const rowMatch of rowMatches) {
      const rowHtml = rowMatch[1];
      const cellMatches = rowHtml.matchAll(cellRegex);
      const cells: string[] = [];

      for (const cellMatch of cellMatches) {
        const cellText = cellMatch[1]
          .replace(/<[^>]+>/g, '') // Remove HTML tags
          .trim();
        cells.push(cellText);
      }

      if (cells.length > 0) {
        if (isFirstRow && this.looksLikeHeaders(cells)) {
          headers = cells;
          isFirstRow = false;
        } else {
          rows.push({ cells });
        }
      }
    }

    if (rows.length === 0) return null;

    // If no headers were found, use generic ones
    if (headers.length === 0 && rows.length > 0) {
      headers = rows[0].cells.map((_, i) => `Column ${i + 1}`);
    }

    return {
      id: `table_${index}`,
      type: this.detectTableType(headers, rows),
      headers,
      rows,
      confidence: 0.8,
    };
  }

  /**
   * Check if row looks like table headers
   */
  private looksLikeHeaders(cells: string[]): boolean {
    const headerKeywords = [
      'description', 'açıklama', 'tanım', 'ürün', 'hizmet',
      'quantity', 'miktar', 'adet', 'qty',
      'price', 'fiyat', 'birim fiyat', 'unit price',
      'total', 'toplam', 'tutar', 'amount',
      'item', 'kalem', 'no', 'sıra',
    ];

    const matchCount = cells.filter(cell => 
      headerKeywords.some(keyword => 
        cell.toLowerCase().includes(keyword)
      )
    ).length;

    return matchCount >= 2; // At least 2 cells match header keywords
  }

  /**
   * Detect table type based on headers and content
   */
  private detectTableType(headers: string[], rows: TableRow[]): 'data' | 'line_items' | 'summary' {
    const headersLower = headers.map(h => h.toLowerCase());

    // Check for line items table (invoice items)
    const lineItemKeywords = ['description', 'açıklama', 'miktar', 'quantity', 'fiyat', 'price', 'toplam', 'total'];
    const lineItemMatches = headersLower.filter(h => 
      lineItemKeywords.some(k => h.includes(k))
    ).length;

    if (lineItemMatches >= 3) {
      return 'line_items';
    }

    // Check for summary table (totals, tax, etc.)
    const summaryKeywords = ['toplam', 'total', 'kdv', 'tax', 'vat', 'genel toplam', 'grand total'];
    const summaryMatches = headersLower.filter(h => 
      summaryKeywords.some(k => h.includes(k))
    ).length;

    if (summaryMatches >= 2 && rows.length <= 5) {
      return 'summary';
    }

    return 'data';
  }

  /**
   * Extract line items from tables
   */
  private extractLineItemsFromTables(tables: ExtractedTable[]): InvoiceLineItem[] {
    const lineItems: InvoiceLineItem[] = [];

    const lineItemsTables = tables.filter(t => t.type === 'line_items');

    for (const table of lineItemsTables) {
      const headers = table.headers.map(h => h.toLowerCase());

      // Find column indices
      const descIdx = this.findColumnIndex(headers, ['description', 'açıklama', 'tanım', 'ürün', 'hizmet', 'item', 'malzeme']);
      const qtyIdx = this.findColumnIndex(headers, ['quantity', 'miktar', 'adet', 'qty', 'amount']);
      const priceIdx = this.findColumnIndex(headers, ['price', 'fiyat', 'birim fiyat', 'unit price', 'birim', 'unit']);
      const totalIdx = this.findColumnIndex(headers, ['total', 'toplam', 'tutar', 'line total', 'ara toplam']);

      for (const row of table.rows) {
        try {
          const description = descIdx !== -1 ? row.cells[descIdx] : '';
          const qtyStr = qtyIdx !== -1 ? row.cells[qtyIdx] : '0';
          const priceStr = priceIdx !== -1 ? row.cells[priceIdx] : '0';
          const totalStr = totalIdx !== -1 ? row.cells[totalIdx] : '0';

          const qty = this.parseNumber(qtyStr);
          const unit_price = this.parseNumber(priceStr);
          const line_total = this.parseNumber(totalStr);

          // Skip invalid rows
          if (!description || (qty === 0 && unit_price === 0 && line_total === 0)) {
            continue;
          }

          // Calculate missing values
          let finalQty = qty;
          let finalPrice = unit_price;
          let finalTotal = line_total;

          if (finalTotal === 0 && finalQty > 0 && finalPrice > 0) {
            finalTotal = finalQty * finalPrice;
          } else if (finalPrice === 0 && finalTotal > 0 && finalQty > 0) {
            finalPrice = finalTotal / finalQty;
          } else if (finalQty === 0 && finalTotal > 0 && finalPrice > 0) {
            finalQty = finalTotal / finalPrice;
          }

          lineItems.push({
            description,
            qty: finalQty,
            unit_price: finalPrice,
            line_total: finalTotal,
          });
        } catch (error) {
          console.warn('⚠️ Failed to parse line item row:', error);
        }
      }
    }

    console.log(`✅ Extracted ${lineItems.length} line items`);
    return lineItems;
  }

  /**
   * Find column index by matching keywords
   */
  private findColumnIndex(headers: string[], keywords: string[]): number {
    for (let i = 0; i < headers.length; i++) {
      for (const keyword of keywords) {
        if (headers[i].includes(keyword)) {
          return i;
        }
      }
    }
    return -1;
  }

  /**
   * Parse number from string, handling Turkish and international formats
   */
  private parseNumber(str: string): number {
    if (!str || typeof str !== 'string') return 0;

    // Remove currency symbols and whitespace
    let cleaned = str.trim()
      .replace(/[₺$€£¥]/g, '')
      .replace(/\s/g, '');

    // Handle Turkish number format (1.234,56 -> 1234.56)
    if (cleaned.includes(',') && cleaned.includes('.')) {
      // If both comma and dot exist, assume Turkish format
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
      // If only comma, check if it's decimal separator
      const parts = cleaned.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        // Likely decimal separator (e.g., "123,45")
        cleaned = cleaned.replace(',', '.');
      } else {
        // Likely thousand separator (e.g., "1,234")
        cleaned = cleaned.replace(/,/g, '');
      }
    }

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
}

/**
 * Export singleton instance
 */
export const tableExtractor = new TableExtractor();

