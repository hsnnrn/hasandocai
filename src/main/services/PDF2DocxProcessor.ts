import fs from 'fs/promises';
import path from 'path';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } from 'docx';
import pdfParse from 'pdf-parse';
import * as pdfjsLib from 'pdfjs-dist';

export interface PDF2DocxResult {
  success: boolean;
  buffer?: Buffer;
  outputPath?: string;
  error?: string;
  metadata?: {
    originalSize: number;
    outputSize: number;
    processingTime: number;
    pages: number;
  };
}

export class PDF2DocxProcessor {
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
   * Convert PDF to DOCX using advanced PDF parsing
   */
  async convertPDFToDOCX(pdfBuffer: Buffer): Promise<PDF2DocxResult> {
    const startTime = Date.now();
    
    try {
      console.log('PDF2DocxProcessor: Starting advanced PDF conversion with buffer size:', pdfBuffer.length);
      
      // Convert Buffer to Uint8Array for pdfjs-dist compatibility
      const uint8Array = new Uint8Array(pdfBuffer);
      const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
      const pageCount = pdf.numPages;
      console.log('PDF loaded successfully, page count:', pageCount);
      
      const allContent: any[] = [];

      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        try {
          console.log(`Processing page ${pageNum}/${pageCount}`);
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1 });
          const textContent = await page.getTextContent();
          
          console.log(`Page ${pageNum} has ${textContent.items.length} text items`);

          // Process text items with advanced formatting
          const processedItems = this.processTextItemsAdvanced(textContent, page, pageNum, viewport);
          
          // Group into logical blocks
          const textBlocks = this.groupTextIntoBlocks(processedItems, viewport);
          
          // Create formatted paragraphs
          for (const block of textBlocks) {
            const paragraph = this.createFormattedParagraph(block);
            allContent.push(paragraph);
          }

          // Add spacing between pages
          if (pageNum < pageCount) {
            allContent.push(
              new Paragraph({
                children: [new TextRun({ text: '' })],
              }),
              new Paragraph({
                children: [new TextRun({ text: '' })],
              })
            );
          }
        } catch (pageError) {
          console.error(`Error processing page ${pageNum}:`, pageError);
          // Continue with next page
          allContent.push(
            new Paragraph({
              children: [new TextRun({
                text: `[Error processing page ${pageNum}]`,
                italics: true,
                size: 10,
                color: 'FF0000',
              })],
            })
          );
        }
      }

      console.log('Creating Word document with', allContent.length, 'content items');
      
      // Create document
      const doc = new Document({
        sections: [{
          properties: {},
          children: allContent,
        }],
      });

      const docBuffer = await Packer.toBuffer(doc);
      console.log('Word document created successfully, size:', docBuffer.length);
      
      const processingTime = Date.now() - startTime;
      
      // Create output DOCX file path for saving
      const outputDocxPath = path.join(this.tempDir, `output_${Date.now()}.docx`);
      await fs.writeFile(outputDocxPath, docBuffer);
      
      return {
        success: true,
        buffer: docBuffer,
        outputPath: outputDocxPath,
        metadata: {
          originalSize: pdfBuffer.length,
          outputSize: docBuffer.length,
          processingTime,
          pages: pageCount,
        },
      };
      
    } catch (error) {
      console.error('PDF2DocxProcessor: Advanced conversion failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Advanced PDF conversion failed',
        metadata: {
          originalSize: pdfBuffer.length,
          outputSize: 0,
          processingTime: Date.now() - startTime,
          pages: 0,
        },
      };
    }
  }

  /**
   * Convert PDF to DOCX with fallback to text extraction
   */
  async convertPDFToDOCXWithFallback(pdfBuffer: Buffer): Promise<PDF2DocxResult> {
    try {
      // Try pdf2docx first
      const result = await this.convertPDFToDOCX(pdfBuffer);
      
      if (result.success) {
        return result;
      }
      
      console.log('PDF2DocxProcessor: pdf2docx failed, trying fallback method...');
      
      // Fallback to text extraction with better formatting
      return await this.createTextExtractionDocument(pdfBuffer);
      
    } catch (error) {
      console.error('PDF2DocxProcessor: All methods failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'All conversion methods failed',
        metadata: {
          originalSize: pdfBuffer.length,
          outputSize: 0,
          processingTime: 0,
          pages: 0,
        },
      };
    }
  }

  /**
   * Create a document with extracted text as fallback
   */
  private async createTextExtractionDocument(pdfBuffer: Buffer): Promise<PDF2DocxResult> {
    const startTime = Date.now();
    
    try {
      console.log('PDF2DocxProcessor: Creating text extraction document...');
      
      // Extract text from PDF using pdf-parse
      const pdfData = await pdfParse(pdfBuffer);
      const text = pdfData.text;
      const pageCount = pdfData.numpages;
      
      console.log('PDF2DocxProcessor: Extracted text length:', text.length, 'pages:', pageCount);
      
      // Create document with extracted text
      const allContent: any[] = [
        new Paragraph({
          children: [new TextRun({
            text: 'PDF Document - Text Extraction',
            bold: true,
            size: 16,
          })],
        }),
        new Paragraph({
          children: [new TextRun({
            text: `Converted on ${new Date().toLocaleDateString()} (${pageCount} pages)`,
            italics: true,
            size: 12,
          })],
        }),
        new Paragraph({
          children: [new TextRun({ text: '' })],
        }),
      ];

      // Split text into paragraphs and create formatted content
      const paragraphs = text.split('\n').filter(p => p.trim().length > 0);
      
      for (const paragraph of paragraphs) {
        if (paragraph.trim()) {
          // Detect if it's a header (short line, no periods, etc.)
          const isHeader = paragraph.trim().length < 100 && 
                          paragraph.trim().length > 0 && 
                          !paragraph.includes('.') &&
                          !paragraph.includes(',');
          
          allContent.push(
            new Paragraph({
              children: [new TextRun({
                text: paragraph.trim(),
                size: isHeader ? 14 : 12,
                bold: isHeader,
              })],
              spacing: {
                after: 120,
              },
            })
          );
        }
      }
      
      const doc = new Document({
        sections: [{
          properties: {},
          children: allContent,
        }],
      });

      const docBuffer = await Packer.toBuffer(doc);
      
      // Create output DOCX file path for saving
      const outputDocxPath = path.join(this.tempDir, `output_${Date.now()}.docx`);
      await fs.writeFile(outputDocxPath, docBuffer);
      
      return {
        success: true,
        buffer: docBuffer,
        outputPath: outputDocxPath,
        metadata: {
          originalSize: pdfBuffer.length,
          outputSize: docBuffer.length,
          processingTime: Date.now() - startTime,
          pages: pageCount,
        },
      };
      
    } catch (error) {
      console.error('PDF2DocxProcessor: Text extraction failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Text extraction failed',
        metadata: {
          originalSize: pdfBuffer.length,
          outputSize: 0,
          processingTime: Date.now() - startTime,
          pages: 0,
        },
      };
    }
  }

  // Advanced text processing with comprehensive formatting
  private processTextItemsAdvanced(textContent: any, page: any, pageNum: number, viewport: any): any[] {
    const processedItems: any[] = [];
    
    for (const item of textContent.items) {
      // Clean and normalize text
      const cleanText = this.cleanText(item.str);
      
      // Skip empty or invalid text items
      if (!cleanText || cleanText.trim().length === 0) {
        continue;
      }
      
      const textInfo = {
        text: cleanText,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height,
        fontName: this.sanitizeFontName(item.fontName),
        fontSize: Math.max(8, Math.min(72, Math.abs(item.transform[0]) || 12)),
        bold: this.detectBoldFont(item.fontName, item.transform),
        italic: this.detectItalicFont(item.fontName, item.transform),
        color: '000000', // Always use black - no color extraction
        transform: item.transform,
        pageNumber: pageNum,
        relativeX: item.transform[4] / viewport.width,
        relativeY: item.transform[5] / viewport.height,
        isHeader: this.detectAdvancedHeader(item, viewport),
        headerLevel: this.detectAdvancedHeaderLevel(item, viewport),
        isList: this.detectList(item),
        alignment: this.detectAlignment(item, viewport),
      };
      
      processedItems.push(textInfo);
    }
    
    return processedItems;
  }

  // Clean and normalize text content
  private cleanText(text: string): string {
    if (!text) return '';
    
    // Remove control characters except newlines and tabs
    let cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Remove excessive spaces
    cleaned = cleaned.replace(/\s{3,}/g, '  ');
    
    // Fix common encoding issues
    cleaned = cleaned
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"')
      .replace(/â€"/g, '–')
      .replace(/â€"/g, '—')
      .replace(/â€¢/g, '•')
      .replace(/â€¦/g, '…')
      .replace(/Â/g, '')
      .replace(/â€/g, '€')
      .replace(/â‚¬/g, '€');
    
    return cleaned.trim();
  }

  // Sanitize font names
  private sanitizeFontName(fontName: string): string {
    if (!fontName) return 'Arial';
    
    // Remove problematic characters from font names
    const sanitized = fontName.replace(/[^\w\s-]/g, '').trim();
    
    // Fallback to common fonts if name is too short or problematic
    if (sanitized.length < 2) return 'Arial';
    
    // Map common problematic fonts to safe alternatives
    const fontMap: { [key: string]: string } = {
      'TimesNewRoman': 'Times New Roman',
      'Arial-Bold': 'Arial',
      'Arial-Italic': 'Arial',
      'Helvetica-Bold': 'Arial',
      'Helvetica-Italic': 'Arial',
      'CourierNew': 'Courier New',
      'Calibri-Bold': 'Calibri',
      'Calibri-Italic': 'Calibri'
    };
    
    return fontMap[sanitized] || sanitized;
  }

  // Group text items into logical blocks
  private groupTextIntoBlocks(textItems: any[], viewport: any): any[] {
    // Sort by Y position (top to bottom), then by X position (left to right)
    textItems.sort((a, b) => {
      const yDiff = Math.abs(a.y - b.y);
      if (yDiff > 5) {
        return b.y - a.y; // Top to bottom
      }
      return a.x - b.x; // Left to right
    });

    const blocks: any[] = [];
    let currentBlock: any = null;
    let currentY = textItems[0]?.y || 0;

    for (const item of textItems) {
      const yDiff = Math.abs(item.y - currentY);
      
      // If significant Y difference, start new block
      if (yDiff > 15 || !currentBlock) {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        
        currentBlock = {
          items: [item],
          type: this.determineBlockType([item]),
          y: item.y,
          x: item.x,
          width: item.width,
          height: item.height,
          formatting: item,
        };
        currentY = item.y;
      } else {
        // Add to current block
        currentBlock.items.push(item);
        currentBlock.width = Math.max(currentBlock.width, item.x + item.width - currentBlock.x);
        currentBlock.height = Math.max(currentBlock.height, item.y + item.height - currentBlock.y);
      }
    }

    if (currentBlock) {
      blocks.push(currentBlock);
    }

    return blocks;
  }

  // Create formatted paragraph from text block
  private createFormattedParagraph(block: any): Paragraph {
    const textRuns: TextRun[] = [];
    
    // Sort items within block by X position
    block.items.sort((a: any, b: any) => a.x - b.x);
    
    for (const item of block.items) {
      try {
        // Validate and clean text before creating TextRun
        const safeText = this.validateTextForDocx(item.text);
        if (!safeText || safeText.trim().length === 0) {
          continue;
        }
        
        const textRunOptions: any = {
          text: safeText,
          bold: item.bold || false,
          italics: item.italic || false,
          size: Math.max(8, Math.min(72, Math.round(item.fontSize * 2))),
          font: this.sanitizeFontName(item.fontName),
        };
        
        const textRun = new TextRun(textRunOptions);
        textRuns.push(textRun);
      } catch (error) {
        console.warn('Error creating TextRun for item:', item.text, error);
        // Create a safe fallback TextRun
        try {
          const fallbackRun = new TextRun({
            text: this.validateTextForDocx(item.text) || '[Text Error]',
            size: 12,
            font: 'Arial'
          });
          textRuns.push(fallbackRun);
        } catch (fallbackError) {
          console.error('Fallback TextRun creation failed:', fallbackError);
        }
      }
    }

    // If no valid text runs were created, create a placeholder
    if (textRuns.length === 0) {
      textRuns.push(new TextRun({
        text: '[Empty Content]',
        size: 10,
        italics: true,
        color: '666666'
      }));
    }

    // Determine paragraph style based on block type
    let paragraphStyle: any = {
      spacing: {
        after: 120,
      },
    };

    // Apply header formatting
    if (block.type === 'header') {
      const headerLevel = block.formatting.headerLevel || 1;
      paragraphStyle = {
        ...paragraphStyle,
        heading: `Heading${headerLevel}` as any,
        spacing: {
          before: 240,
          after: 120,
        },
      };
    }

    // Apply list formatting
    if (block.type === 'list') {
      paragraphStyle = {
        ...paragraphStyle,
        bullet: {
          level: 0,
        },
      };
    }

    return new Paragraph({
      children: textRuns,
      ...paragraphStyle,
    });
  }

  // Validate text for DOCX compatibility
  private validateTextForDocx(text: string): string {
    if (!text) return '';
    
    // Remove or replace problematic characters
    let safeText = text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\uFEFF/g, '') // Remove BOM
      .replace(/\u200B/g, '') // Remove zero-width space
      .replace(/\u200C/g, '') // Remove zero-width non-joiner
      .replace(/\u200D/g, '') // Remove zero-width joiner
      .replace(/\u200E/g, '') // Remove left-to-right mark
      .replace(/\u200F/g, '') // Remove right-to-left mark
      .replace(/\u2028/g, ' ') // Replace line separator with space
      .replace(/\u2029/g, ' ') // Replace paragraph separator with space
      .replace(/\u202A/g, '') // Remove left-to-right embedding
      .replace(/\u202B/g, '') // Remove right-to-left embedding
      .replace(/\u202C/g, '') // Remove pop directional formatting
      .replace(/\u202D/g, '') // Remove left-to-right override
      .replace(/\u202E/g, '') // Remove right-to-left override
      .replace(/\u2060/g, '') // Remove word joiner
      .replace(/\u2061/g, '') // Remove function application
      .replace(/\u2062/g, '') // Remove invisible times
      .replace(/\u2063/g, '') // Remove invisible separator
      .replace(/\u2064/g, '') // Remove invisible plus
      .replace(/\u2066/g, '') // Remove left-to-right isolate
      .replace(/\u2067/g, '') // Remove right-to-left isolate
      .replace(/\u2068/g, '') // Remove first strong isolate
      .replace(/\u2069/g, '') // Remove pop directional isolate
      .replace(/\u206A/g, '') // Remove inhibit symmetric swapping
      .replace(/\u206B/g, '') // Remove activate symmetric swapping
      .replace(/\u206C/g, '') // Remove inhibit Arabic form shaping
      .replace(/\u206D/g, '') // Remove activate Arabic form shaping
      .replace(/\u206E/g, '') // Remove national digit shapes
      .replace(/\u206F/g, ''); // Remove nominal digit shapes
    
    // Limit text length to prevent issues
    if (safeText.length > 1000) {
      safeText = safeText.substring(0, 1000) + '...';
    }
    
    return safeText.trim();
  }

  // Advanced header detection
  private detectAdvancedHeader(item: any, viewport: any): boolean {
    const text = item.str.trim();
    const relativeY = item.transform[5] / viewport.height;
    const fontSize = Math.abs(item.transform[0]);
    
    return (
      fontSize > 14 ||
      relativeY > 0.9 ||
      (text.length < 100 && this.hasHeaderPatterns(text)) ||
      (item.fontName?.toLowerCase().includes('bold') && relativeY > 0.8)
    );
  }

  // Check for header patterns
  private hasHeaderPatterns(text: string): boolean {
    const patterns = [
      /^[A-Z][A-Z\s]+$/, // ALL CAPS
      /^\d+\.?\s/, // Numbered headers
      /^[IVX]+\.?\s/, // Roman numerals
      /^[A-Z]\.?\s/, // Single letter headers
      /^[A-Z][a-z]+\s+[A-Z]/, // Title case
    ];
    
    return patterns.some(pattern => pattern.test(text));
  }

  // Advanced header level detection
  private detectAdvancedHeaderLevel(item: any, viewport: any): number {
    const fontSize = Math.abs(item.transform[0]);
    const relativeY = item.transform[5] / viewport.height;
    const isBold = item.fontName?.toLowerCase().includes('bold') || false;
    
    if (fontSize >= 20 && relativeY > 0.9) return 1;
    if (fontSize >= 18 || (fontSize >= 16 && isBold)) return 2;
    if (fontSize >= 16) return 3;
    if (fontSize >= 14 && isBold) return 4;
    if (fontSize >= 14) return 5;
    if (isBold) return 6;
    
    return 0;
  }

  // Detect list items
  private detectList(item: any): boolean {
    const text = item.str.trim();
    const listPatterns = [
      /^\d+\.\s/, // Numbered list
      /^[•\-\*]\s/, // Bullet list
      /^[a-z]\)\s/, // Letter list
      /^[ivx]+\)\s/, // Roman numeral list
    ];
    
    return listPatterns.some(pattern => pattern.test(text));
  }

  // Detect text alignment
  private detectAlignment(item: any, viewport: any): string {
    const relativeX = item.transform[4] / viewport.width;
    
    if (relativeX < 0.1) return 'left';
    if (relativeX > 0.9) return 'right';
    if (relativeX > 0.4 && relativeX < 0.6) return 'center';
    
    return 'left';
  }

  // Determine block type
  private determineBlockType(items: any[]): string {
    if (items.some(item => item.isHeader)) return 'header';
    if (items.some(item => item.isList)) return 'list';
    return 'paragraph';
  }

  // Enhanced font detection methods
  private detectBoldFont(fontName: string, transform: number[]): boolean {
    const fontLower = fontName.toLowerCase();
    
    if (fontLower.includes('bold') || fontLower.includes('black') || 
        fontLower.includes('heavy') || fontLower.includes('demibold') ||
        fontLower.includes('semibold') || fontLower.includes('extrabold')) {
      return true;
    }
    
    const scaleX = Math.abs(transform[0]);
    const scaleY = Math.abs(transform[3]);
    
    if (scaleX > 1.2 || scaleY > 1.2) {
      return true;
    }
    
    if (fontLower.includes('700') || fontLower.includes('800') || fontLower.includes('900')) {
      return true;
    }
    
    const boldPatterns = ['bold', 'black', 'heavy', 'demibold', 'semibold', 'extrabold', 'ultrabold'];
    return boldPatterns.some(pattern => fontLower.includes(pattern));
  }

  private detectItalicFont(fontName: string, transform: number[]): boolean {
    const fontLower = fontName.toLowerCase();
    
    if (fontLower.includes('italic') || fontLower.includes('oblique') || 
        fontLower.includes('slanted') || fontLower.includes('cursive') ||
        fontLower.includes('script')) {
      return true;
    }
    
    const skewX = transform[2];
    const skewY = transform[1];
    
    if (Math.abs(skewX) > 0.1 || Math.abs(skewY) > 0.1) {
      return true;
    }
    
    const italicPatterns = ['italic', 'oblique', 'slanted', 'cursive', 'script', 'italicized'];
    return italicPatterns.some(pattern => fontLower.includes(pattern));
  }

  /**
   * Cleanup temporary files
   */
  private async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('PDF2DocxProcessor: Error cleaning up file:', error);
    }
  }

  async cleanup(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(this.tempDir, file)))
      );
    } catch (error) {
      console.error('PDF2DocxProcessor: Cleanup error:', error);
    }
  }
}
