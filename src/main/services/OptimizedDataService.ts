import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Optimized Document Data Structure
 * Matches the target format specification
 */
export interface OptimizedDocumentData {
  documentId: string;
  title: string;
  filename: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
  fileSource: 'user-upload' | 'watched-folder' | 'imported';
  createdAt: string;
  updatedAt: string;
  processed: boolean;
  processorVersion: string;
  language: string;
  ocrConfidence: number;
  structuredData: StructuredData;
  textSections: OptimizedTextSection[];
  tags: string[];
  notes: string;
  ownerUserId: string;
  sensitivity: 'public' | 'private' | 'restricted';
}

export interface StructuredData {
  documentType: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  currency?: string;
  total?: number;
  vendor?: string;
  lineItems?: LineItem[];
  [key: string]: any; // For additional structured data
}

export interface LineItem {
  desc: string;
  qty: number;
  unit: number;
  total: number;
}

export interface OptimizedTextSection {
  id: string;
  pageNumber: number;
  sectionTitle: string;
  contentType: 'header' | 'body' | 'footer' | 'table' | 'lineitem';
  orderIndex: number;
  content: string;
  charCount: number;
  tokenCount: number;
  chunkIndex: number;
  chunkOverlapWithPrev: number;
  embeddingId: string;
}

export interface DocumentMetadata {
  originalPath: string;
  processingTime: number;
  aiModel: string;
  confidence: number;
  extractedFields: { [key: string]: any };
}

/**
 * Service for optimizing and transforming document data
 */
export class OptimizedDataService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
    this.ensureTempDir();
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  /**
   * Transform current PDF analysis result to optimized format
   */
  async transformToOptimizedFormat(
    analysisResult: any,
    filePath: string,
    options: {
      userId?: string;
      fileSource?: 'user-upload' | 'watched-folder' | 'imported';
      language?: string;
      processorVersion?: string;
    } = {}
  ): Promise<OptimizedDocumentData> {
    const {
      userId = 'anonymous',
      fileSource = 'user-upload',
      language = 'tr',
      processorVersion = 'ocr-v1.2'
    } = options;

    // Get file metadata
    const fileStats = await fs.stat(filePath);
    const fileBuffer = await fs.readFile(filePath);
    const checksum = this.calculateChecksum(fileBuffer);
    const mimeType = this.getMimeType(filePath);

    // Transform text sections
    const optimizedTextSections = this.transformTextSections(
      analysisResult.textSections || [],
      analysisResult.documentId || uuidv4()
    );

    // Extract structured data
    const structuredData = this.extractStructuredData(
      analysisResult.textSections || [],
      analysisResult.filename || path.basename(filePath)
    );

    // Generate tags
    const tags = this.generateTags(analysisResult, structuredData);

    // Calculate OCR confidence
    const ocrConfidence = this.calculateOCRConfidence(analysisResult);

    return {
      documentId: analysisResult.documentId || uuidv4(),
      title: this.generateTitle(analysisResult.filename || path.basename(filePath)),
      filename: analysisResult.filename || path.basename(filePath),
      filePath: filePath,
      mimeType,
      fileSize: fileStats.size,
      checksum,
      fileSource,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      processed: analysisResult.success || false,
      processorVersion,
      language,
      ocrConfidence,
      structuredData,
      textSections: optimizedTextSections,
      tags,
      notes: '',
      ownerUserId: userId,
      sensitivity: this.determineSensitivity(structuredData, tags)
    };
  }

  /**
   * Transform text sections to optimized format
   */
  private transformTextSections(
    textSections: any[],
    documentId: string
  ): OptimizedTextSection[] {
    return textSections.map((section, index) => ({
      id: section.id || `section_${documentId}_${index}_${Date.now()}`,
      pageNumber: section.pageNumber || 1,
      sectionTitle: section.sectionTitle || this.extractSectionTitle(section.content),
      contentType: this.mapContentType(section.contentType),
      orderIndex: section.orderIndex || index,
      content: section.content || '',
      charCount: (section.content || '').length,
      tokenCount: this.estimateTokenCount(section.content || ''),
      chunkIndex: Math.floor(index / 3), // Group every 3 sections as chunks
      chunkOverlapWithPrev: index > 0 ? this.calculateOverlap(
        section.content || '',
        textSections[index - 1]?.content || ''
      ) : 0,
      embeddingId: `emb_${documentId}_${index}_${Date.now()}`
    }));
  }

  /**
   * Extract structured data from text sections
   */
  private extractStructuredData(textSections: any[], filename: string): StructuredData {
    const content = textSections.map(s => s.content).join(' ').toLowerCase();
    
    // Detect document type
    const documentType = this.detectDocumentType(content, filename);
    
    const structuredData: StructuredData = {
      documentType
    };

    // Extract invoice-specific data
    if (documentType === 'invoice') {
      structuredData.invoiceNumber = this.extractInvoiceNumber(content);
      structuredData.invoiceDate = this.extractInvoiceDate(content);
      structuredData.currency = this.extractCurrency(content);
      structuredData.total = this.extractTotal(content);
      structuredData.vendor = this.extractVendor(content);
      structuredData.lineItems = this.extractLineItems(content);
    }

    // Extract other structured data based on document type
    this.extractAdditionalStructuredData(content, structuredData, documentType);

    return structuredData;
  }

  /**
   * Detect document type from content
   */
  private detectDocumentType(content: string, filename: string): string {
    const lowerContent = content.toLowerCase();
    const lowerFilename = filename.toLowerCase();

    // Invoice detection
    if (lowerContent.includes('fatura') || 
        lowerContent.includes('invoice') || 
        lowerContent.includes('ödeme') ||
        lowerFilename.includes('fatura') ||
        lowerFilename.includes('invoice')) {
      return 'invoice';
    }

    // Contract detection
    if (lowerContent.includes('sözleşme') || 
        lowerContent.includes('contract') || 
        lowerContent.includes('anlaşma')) {
      return 'contract';
    }

    // Report detection
    if (lowerContent.includes('rapor') || 
        lowerContent.includes('report') || 
        lowerContent.includes('analiz')) {
      return 'report';
    }

    // Manual/Guide detection
    if (lowerContent.includes('manuel') || 
        lowerContent.includes('kılavuz') || 
        lowerContent.includes('guide')) {
      return 'manual';
    }

    // Email detection
    if (lowerContent.includes('e-posta') || 
        lowerContent.includes('email') || 
        lowerContent.includes('mail')) {
      return 'email';
    }

    return 'document';
  }

  /**
   * Extract invoice number
   */
  private extractInvoiceNumber(content: string): string | undefined {
    const patterns = [
      /fatura\s*no[:\s]*([A-Z0-9\-]+)/i,
      /invoice\s*no[:\s]*([A-Z0-9\-]+)/i,
      /fatura\s*numarası[:\s]*([A-Z0-9\-]+)/i
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Extract invoice date
   */
  private extractInvoiceDate(content: string): string | undefined {
    const patterns = [
      /(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{4})/,
      /(\d{4}[.\-\/]\d{1,2}[.\-\/]\d{1,2})/
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Extract currency
   */
  private extractCurrency(content: string): string | undefined {
    const currencies = ['TL', 'TRY', 'USD', 'EUR', 'GBP', '₺', '$', '€', '£'];
    
    for (const currency of currencies) {
      if (content.includes(currency)) {
        return currency;
      }
    }

    return 'TRY'; // Default to Turkish Lira
  }

  /**
   * Extract total amount
   */
  private extractTotal(content: string): number | undefined {
    const patterns = [
      /toplam[:\s]*([0-9,.\s]+)/i,
      /total[:\s]*([0-9,.\s]+)/i,
      /tutar[:\s]*([0-9,.\s]+)/i
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(/[,\s]/g, ''));
        if (!isNaN(amount)) {
          return amount;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract vendor information
   */
  private extractVendor(content: string): string | undefined {
    // Look for company names or vendor information
    const patterns = [
      /(?:firma|şirket|company|vendor)[:\s]*([A-Za-z\s&.,]+)/i,
      /([A-Za-z\s&.,]+)\s*(?:ltd|gmbh|inc|corp|a\.ş\.|a\.ş)/i
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Extract line items
   */
  private extractLineItems(content: string): LineItem[] {
    const lineItems: LineItem[] = [];
    
    // Simple line item extraction - can be enhanced
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/(.+?)\s+(\d+)\s+([0-9,.\s]+)\s+([0-9,.\s]+)/);
      if (match) {
        lineItems.push({
          desc: match[1].trim(),
          qty: parseInt(match[2]),
          unit: parseFloat(match[3].replace(/[,\s]/g, '')),
          total: parseFloat(match[4].replace(/[,\s]/g, ''))
        });
      }
    }

    return lineItems;
  }

  /**
   * Extract additional structured data based on document type
   */
  private extractAdditionalStructuredData(
    content: string, 
    structuredData: StructuredData, 
    documentType: string
  ): void {
    switch (documentType) {
      case 'contract':
        structuredData.contractParties = this.extractContractParties(content);
        structuredData.contractDate = this.extractContractDate(content);
        structuredData.contractValue = this.extractContractValue(content);
        break;
      
      case 'report':
        structuredData.reportDate = this.extractReportDate(content);
        structuredData.reportAuthor = this.extractReportAuthor(content);
        structuredData.reportSummary = this.extractReportSummary(content);
        break;
      
      case 'email':
        structuredData.sender = this.extractEmailSender(content);
        structuredData.recipient = this.extractEmailRecipient(content);
        structuredData.subject = this.extractEmailSubject(content);
        break;
    }
  }

  /**
   * Generate tags based on content and structured data
   */
  private generateTags(analysisResult: any, structuredData: StructuredData): string[] {
    const tags: string[] = [];
    
    // Document type tag
    tags.push(structuredData.documentType);
    
    // Language tag
    if (structuredData.language) {
      tags.push(`lang:${structuredData.language}`);
    }
    
    // Vendor tag
    if (structuredData.vendor) {
      tags.push(`vendor:${structuredData.vendor}`);
    }
    
    // Currency tag
    if (structuredData.currency) {
      tags.push(`currency:${structuredData.currency}`);
    }
    
    // Date-based tags
    if (structuredData.invoiceDate) {
      const year = new Date(structuredData.invoiceDate).getFullYear();
      tags.push(`year:${year}`);
    }
    
    // Content-based tags
    const content = analysisResult.textSections?.map((s: any) => s.content).join(' ') || '';
    if (content.includes('acil') || content.includes('urgent')) {
      tags.push('urgent');
    }
    if (content.includes('gizli') || content.includes('confidential')) {
      tags.push('confidential');
    }
    
    return tags;
  }

  /**
   * Calculate OCR confidence score
   */
  private calculateOCRConfidence(analysisResult: any): number {
    // Base confidence on processing success and content quality
    let confidence = 0.5;
    
    if (analysisResult.success) {
      confidence += 0.3;
    }
    
    if (analysisResult.textSections && analysisResult.textSections.length > 0) {
      confidence += 0.2;
    }
    
    // Adjust based on content quality
    const avgContentLength = analysisResult.textSections?.reduce(
      (sum: number, section: any) => sum + (section.content?.length || 0), 0
    ) / (analysisResult.textSections?.length || 1);
    
    if (avgContentLength > 100) {
      confidence += 0.1;
    }
    
    return Math.min(0.99, Math.max(0.1, confidence));
  }

  /**
   * Determine document sensitivity
   */
  private determineSensitivity(structuredData: StructuredData, tags: string[]): 'public' | 'private' | 'restricted' {
    if (tags.includes('confidential') || structuredData.documentType === 'contract') {
      return 'restricted';
    }
    
    if (structuredData.documentType === 'invoice' || structuredData.documentType === 'email') {
      return 'private';
    }
    
    return 'public';
  }

  /**
   * Generate document title
   */
  private generateTitle(filename: string): string {
    const nameWithoutExt = path.parse(filename).name;
    const timestamp = Date.now();
    return `temp_${timestamp}_${nameWithoutExt}`;
  }

  /**
   * Map content type to optimized format
   */
  private mapContentType(contentType: string): 'header' | 'body' | 'footer' | 'table' | 'lineitem' {
    const mapping: { [key: string]: 'header' | 'body' | 'footer' | 'table' | 'lineitem' } = {
      'header': 'header',
      'paragraph': 'body',
      'list': 'body',
      'table': 'table',
      'image_caption': 'body'
    };
    
    return mapping[contentType] || 'body';
  }

  /**
   * Extract section title from content
   */
  private extractSectionTitle(content: string): string {
    const lines = content.split('\n');
    const firstLine = lines[0]?.trim();
    
    if (firstLine && firstLine.length < 100) {
      return firstLine;
    }
    
    return `Section ${Date.now()}`;
  }

  /**
   * Estimate token count
   */
  private estimateTokenCount(content: string): number {
    // Simple estimation: ~4 characters per token
    return Math.ceil(content.length / 4);
  }

  /**
   * Calculate overlap between consecutive sections
   */
  private calculateOverlap(currentContent: string, previousContent: string): number {
    const currentWords = currentContent.split(' ');
    const previousWords = previousContent.split(' ');
    
    let overlap = 0;
    const minLength = Math.min(currentWords.length, previousWords.length);
    
    for (let i = 0; i < minLength; i++) {
      if (currentWords[i] === previousWords[i]) {
        overlap++;
      } else {
        break;
      }
    }
    
    return Math.min(overlap, 10); // Cap at 10 words
  }

  /**
   * Calculate file checksum
   */
  private calculateChecksum(buffer: Buffer): string {
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    return `sha256:${hash.digest('hex')}`;
  }

  /**
   * Get MIME type from file path
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.txt': 'text/plain',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.ppt': 'application/vnd.ms-powerpoint'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  // Additional extraction methods for different document types
  private extractContractParties(content: string): string[] {
    // Implementation for contract parties extraction
    return [];
  }

  private extractContractDate(content: string): string | undefined {
    // Implementation for contract date extraction
    return undefined;
  }

  private extractContractValue(content: string): number | undefined {
    // Implementation for contract value extraction
    return undefined;
  }

  private extractReportDate(content: string): string | undefined {
    // Implementation for report date extraction
    return undefined;
  }

  private extractReportAuthor(content: string): string | undefined {
    // Implementation for report author extraction
    return undefined;
  }

  private extractReportSummary(content: string): string | undefined {
    // Implementation for report summary extraction
    return undefined;
  }

  private extractEmailSender(content: string): string | undefined {
    // Implementation for email sender extraction
    return undefined;
  }

  private extractEmailRecipient(content: string): string | undefined {
    // Implementation for email recipient extraction
    return undefined;
  }

  private extractEmailSubject(content: string): string | undefined {
    // Implementation for email subject extraction
    return undefined;
  }

  /**
   * Save optimized data to file
   */
  async saveOptimizedData(data: OptimizedDocumentData, outputPath: string): Promise<void> {
    await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
  }

  /**
   * Load optimized data from file
   */
  async loadOptimizedData(filePath: string): Promise<OptimizedDocumentData> {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }
}
