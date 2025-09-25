import fs from 'fs/promises';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, ImageRun, ExternalHyperlink, InternalHyperlink, HeadingLevel, AlignmentType, VerticalAlign, WidthType, BorderStyle, ShadingType, PageBreak, SectionType, Media } from 'docx';
import { PDFDocument } from 'pdf-lib';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.min.js');

export interface EnhancedPDFLayoutInfo {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
  bold: boolean;
  italic: boolean;
  color: string;
  zIndex: number;
  pageNumber: number;
  isImage?: boolean;
  imageData?: Buffer;
  imageType?: string;
  isTable?: boolean;
  tableData?: any[];
  isHeader?: boolean;
  headerLevel?: number;
  alignment?: string;
}

export interface ImageExtractionResult {
  data: Buffer;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

export interface EnhancedConversionReport {
  success: boolean;
  fontSubstitutions: Array<{
    original: string;
    substituted: string;
    reason: string;
  }>;
  layoutWarnings: string[];
  imageExtractions: number;
  vectorObjects: number;
  processingTime: number;
  extractedImages: ImageExtractionResult[];
  preservedTables: number;
  preservedHeaders: number;
  textBlocks: number;
}

export class EnhancedPDFProcessor {
  private tempDir: string;
  private fontSubstitutions: Array<{ original: string; substituted: string; reason: string }> = [];
  private layoutWarnings: string[] = [];
  private extractedImages: ImageExtractionResult[] = [];

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
   * Enhanced PDF to DOCX conversion with comprehensive layout preservation
   */
  async convertPDFToDOCX(
    pdfBuffer: Buffer, 
    options: {
      preserveLayout?: boolean;
      embedFonts?: boolean;
      highFidelityFallback?: boolean;
      extractImages?: boolean;
      extractVectorObjects?: boolean;
      preserveColors?: boolean;
      preserveFonts?: boolean;
      preserveTables?: boolean;
      preserveTextFormatting?: boolean;
      extractHeaders?: boolean;
      preserveAlignment?: boolean;
    } = {}
  ): Promise<{ buffer: Buffer; report: EnhancedConversionReport }> {
    const startTime = Date.now();
    this.fontSubstitutions = [];
    this.layoutWarnings = [];
    this.extractedImages = [];

    try {
      console.log('EnhancedPDFProcessor: Starting enhanced conversion with buffer size:', pdfBuffer.length);
      
      // Convert Buffer to Uint8Array for pdfjs-dist compatibility
      const uint8Array = new Uint8Array(pdfBuffer);
      const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
      const pageCount = pdf.numPages;
      console.log('EnhancedPDFProcessor: PDF loaded, page count:', pageCount);

      // Extract comprehensive layout information from all pages
      const allLayoutInfo: EnhancedPDFLayoutInfo[] = [];
      let preservedTables = 0;
      let preservedHeaders = 0;

      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        console.log(`EnhancedPDFProcessor: Processing page ${pageNum}/${pageCount}`);
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        
        // Extract text with enhanced positioning and formatting
        const textContent = await page.getTextContent();
        console.log(`EnhancedPDFProcessor: Page ${pageNum} has ${textContent.items.length} text items`);
        
        const pageLayoutInfo = await this.extractEnhancedTextLayout(textContent, page, pageNum, viewport, options);
        console.log(`EnhancedPDFProcessor: Page ${pageNum} extracted ${pageLayoutInfo.length} layout items`);
        allLayoutInfo.push(...pageLayoutInfo);

        // Extract images if requested
        if (options.extractImages) {
          const pageImages = await this.extractPageImagesEnhanced(page, pageNum, viewport);
          this.extractedImages.push(...pageImages);
          console.log(`EnhancedPDFProcessor: Page ${pageNum} extracted ${pageImages.length} images`);
        }

        // Count preserved elements
        preservedTables += pageLayoutInfo.filter(item => item.isTable).length;
        preservedHeaders += pageLayoutInfo.filter(item => item.isHeader).length;
      }

      console.log(`EnhancedPDFProcessor: Total layout items extracted: ${allLayoutInfo.length}`);
      console.log(`EnhancedPDFProcessor: Images extracted: ${this.extractedImages.length}`);
      console.log(`EnhancedPDFProcessor: Tables preserved: ${preservedTables}`);
      console.log(`EnhancedPDFProcessor: Headers preserved: ${preservedHeaders}`);

      // Create DOCX document with enhanced layout preservation
      console.log('EnhancedPDFProcessor: Creating enhanced DOCX document...');
      const doc = await this.createEnhancedDOCXWithLayout(
        allLayoutInfo, 
        this.extractedImages, 
        pageCount,
        options
      );

      console.log('EnhancedPDFProcessor: Converting DOCX to buffer...');
      const docBuffer = await Packer.toBuffer(doc);
      const processingTime = Date.now() - startTime;
      console.log(`EnhancedPDFProcessor: DOCX buffer created, size: ${docBuffer.length} bytes`);

      return {
        buffer: docBuffer,
        report: {
          success: true,
          fontSubstitutions: this.fontSubstitutions,
          layoutWarnings: this.layoutWarnings,
          imageExtractions: this.extractedImages.length,
          vectorObjects: 0, // Will be implemented in future versions
          processingTime,
          extractedImages: this.extractedImages,
          preservedTables,
          preservedHeaders,
          textBlocks: allLayoutInfo.length,
        }
      };

    } catch (error) {
      console.error('EnhancedPDFProcessor: Conversion failed:', error);
      console.error('EnhancedPDFProcessor: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw new Error(`Enhanced PDF to DOCX conversion failed: ${error}`);
    }
  }

  /**
   * Extract enhanced text layout information with comprehensive formatting
   */
  private async extractEnhancedTextLayout(
    textContent: any, 
    page: any, 
    pageNum: number, 
    viewport: any, 
    options: any
  ): Promise<EnhancedPDFLayoutInfo[]> {
    const layoutInfo: EnhancedPDFLayoutInfo[] = [];

    for (const item of textContent.items) {
      // Enhanced text information extraction
      const textInfo: EnhancedPDFLayoutInfo = {
        text: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height,
        fontSize: Math.abs(item.transform[0]) || 12,
        fontName: item.fontName || 'Arial',
        bold: this.detectBoldFont(item.fontName, item.transform),
        italic: this.detectItalicFont(item.fontName, item.transform),
        color: options.preserveColors ? await this.extractTextColor(item, page) : '000000',
        zIndex: this.calculateZIndex(item, page),
        pageNumber: pageNum,
        isHeader: this.detectHeaderFromText(item, viewport),
        headerLevel: this.detectHeaderLevelFromText(item, viewport),
        alignment: this.detectTextAlignment(item, viewport),
        isTable: this.detectTableContent(item, textContent.items),
      };

      // Handle font substitution
      const substitutedFont = this.getFontSubstitution(textInfo.fontName);
      if (substitutedFont !== textInfo.fontName) {
        this.fontSubstitutions.push({
          original: textInfo.fontName,
          substituted: substitutedFont,
          reason: 'Font not available in system'
        });
        textInfo.fontName = substitutedFont;
      }

      layoutInfo.push(textInfo);
    }

    // Sort by Y position (top to bottom), then by X position (left to right)
    layoutInfo.sort((a, b) => {
      const yDiff = Math.abs(a.y - b.y);
      if (yDiff > 5) {
        return b.y - a.y; // Top to bottom
      }
      return a.x - b.x; // Left to right
    });

    return layoutInfo;
  }

  /**
   * Enhanced image extraction from PDF pages
   */
  private async extractPageImagesEnhanced(page: any, pageNum: number, viewport: any): Promise<ImageExtractionResult[]> {
    const images: ImageExtractionResult[] = [];
    
    try {
      // Get the operator list to extract image data
      const operatorList = await page.getOperatorList();
      
      if (operatorList && operatorList.fnArray) {
        for (let i = 0; i < operatorList.fnArray.length; i++) {
          const fn = operatorList.fnArray[i];
          const args = operatorList.argsArray[i];
          
          // Look for image drawing operations
          if (fn === pdfjsLib.OPS.paintImageXObject && args && args.length > 0) {
            try {
              const imageName = args[0];
              const imageData = await this.extractImageData(page, imageName);
              
              if (imageData) {
                images.push({
                  data: imageData,
                  type: 'jpeg', // Default type
                  x: 0, // Will be updated with actual position
                  y: 0,
                  width: 100, // Default size
                  height: 100,
                  pageNumber: pageNum,
                });
              }
            } catch (imageError) {
              console.warn(`EnhancedPDFProcessor: Failed to extract image ${i}:`, imageError);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`EnhancedPDFProcessor: Image extraction failed for page ${pageNum}:`, error);
      this.layoutWarnings.push(`Image extraction failed for page ${pageNum}: ${error}`);
    }
    
    return images;
  }

  /**
   * Extract image data from PDF
   */
  private async extractImageData(page: any, imageName: string): Promise<Buffer | null> {
    try {
      // This is a simplified implementation
      // In a full implementation, you would extract the actual image data
      // from the PDF's XObject resources
      return null;
    } catch (error) {
      console.warn('EnhancedPDFProcessor: Image data extraction failed:', error);
      return null;
    }
  }

  /**
   * Create enhanced DOCX document with comprehensive layout preservation
   */
  private async createEnhancedDOCXWithLayout(
    layoutInfo: EnhancedPDFLayoutInfo[],
    images: ImageExtractionResult[],
    pageCount: number,
    options: any
  ): Promise<Document> {
    console.log('EnhancedPDFProcessor: createEnhancedDOCXWithLayout called with', layoutInfo.length, 'layout items');
    const children: any[] = [];

    // Group layout info by page
    const pagesLayout = this.groupLayoutByPage(layoutInfo);
    console.log('EnhancedPDFProcessor: Grouped layout by page:', Object.keys(pagesLayout).length, 'pages');

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const pageLayout = pagesLayout[pageNum] || [];
      console.log(`EnhancedPDFProcessor: Page ${pageNum} has ${pageLayout.length} layout items`);
      
      // Add page break for multi-page documents
      if (pageNum > 1) {
        children.push(new Paragraph({
          children: [new TextRun({ text: '' })],
          pageBreakBefore: true,
        }));
      }

      // Create page content with enhanced layout preservation
      const pageContent = await this.createEnhancedPageContent(pageLayout, pageNum, options);
      console.log(`EnhancedPDFProcessor: Page ${pageNum} created ${pageContent.length} content items`);
      
      // Add all content
      children.push(...pageContent);
    }

    console.log(`EnhancedPDFProcessor: Total children created: ${children.length}`);
    return new Document({
      sections: [{
        properties: {},
        children,
      }],
    });
  }

  /**
   * Create enhanced content for a single page
   */
  private async createEnhancedPageContent(
    pageLayout: EnhancedPDFLayoutInfo[], 
    pageNum: number, 
    options: any
  ): Promise<any[]> {
    console.log(`EnhancedPDFProcessor: createEnhancedPageContent for page ${pageNum} with ${pageLayout.length} items`);
    const content: any[] = [];

    // Group text into logical blocks while preserving positioning
    const textBlocks = this.groupTextIntoEnhancedBlocks(pageLayout);
    console.log(`EnhancedPDFProcessor: Page ${pageNum} grouped into ${textBlocks.length} blocks`);

    for (const block of textBlocks) {
      // Create enhanced text element
      const textElement = this.createEnhancedTextElement(block, options);
      content.push(textElement);
    }

    console.log(`EnhancedPDFProcessor: Page ${pageNum} created ${content.length} content elements`);
    return content;
  }

  /**
   * Group text items into enhanced blocks with better structure detection
   */
  private groupTextIntoEnhancedBlocks(layoutInfo: EnhancedPDFLayoutInfo[]): Array<{
    text: string;
    formatting: EnhancedPDFLayoutInfo;
    positioning: { x: number; y: number; zIndex: number };
    blockType: string;
    items: EnhancedPDFLayoutInfo[];
  }> {
    console.log(`EnhancedPDFProcessor: groupTextIntoEnhancedBlocks called with ${layoutInfo.length} items`);
    const blocks: any[] = [];
    let currentBlock: any = null;
    let currentY = layoutInfo[0]?.y || 0;

    for (const item of layoutInfo) {
      const yDiff = Math.abs(item.y - currentY);
      
      if (yDiff > 15 || !currentBlock) { // New block
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        
        currentBlock = {
          items: [item],
          text: item.text,
          formatting: item,
          positioning: {
            x: item.x,
            y: item.y,
            zIndex: item.zIndex,
          },
          blockType: this.determineBlockType([item]),
        };
        currentY = item.y;
      } else {
        // Add to current block
        currentBlock.items.push(item);
        currentBlock.text += (currentBlock.text ? ' ' : '') + item.text;
        currentBlock.x = Math.min(currentBlock.x, item.x);
      }
    }

    if (currentBlock) {
      blocks.push(currentBlock);
    }

    console.log(`EnhancedPDFProcessor: groupTextIntoEnhancedBlocks created ${blocks.length} blocks`);
    return blocks;
  }

  /**
   * Create enhanced text element with comprehensive formatting
   */
  private createEnhancedTextElement(block: any, options: any): Paragraph {
    console.log('EnhancedPDFProcessor: createEnhancedTextElement called with block:', block);
    
    const textRuns: TextRun[] = [];
    
    // Enhanced header detection
    const isHeader = block.formatting?.isHeader || false;
    const headerLevel = block.formatting?.headerLevel || 0;
    
    console.log(`EnhancedPDFProcessor: Header detection - isHeader: ${isHeader}, level: ${headerLevel}`);
    
    // Enhanced formatting based on header detection
    let paragraphStyle: any = {
      spacing: {
        after: 120, // 6pt spacing after paragraph
      },
    };

    // Apply header formatting if detected
    if (isHeader && headerLevel > 0) {
      paragraphStyle = {
        ...paragraphStyle,
        heading: `Heading${headerLevel}` as any,
        spacing: {
          before: 240, // 12pt spacing before header
          after: 120, // 6pt spacing after header
        },
      };
    }
    
    // Main text with enhanced formatting
    const textContent = block.text || '';
    const fontSize = isHeader && headerLevel > 0 
      ? Math.max(16, Math.min(72, Math.round((block.formatting?.fontSize || 12) * 2)))
      : Math.max(8, Math.min(72, Math.round((block.formatting?.fontSize || 12) * 2)));
    
    // Enhanced color handling
    const textColor = block.formatting?.color || '000000';
    
    console.log(`EnhancedPDFProcessor: Creating TextRun - text: "${textContent}", fontSize: ${fontSize}, bold: ${block.formatting?.bold}, color: ${textColor}`);
    
    // Create text run with enhanced formatting
    const textRunOptions: any = {
      text: textContent,
      bold: block.formatting?.bold || (isHeader && headerLevel <= 3),
      italics: block.formatting?.italic || false,
      size: fontSize,
      font: block.formatting?.fontName || 'Arial',
    };
    
    // Apply color if different from default
    if (textColor !== '000000') {
      textRunOptions.color = textColor;
    }
    
    const mainTextRun = new TextRun(textRunOptions);
    textRuns.push(mainTextRun);

    console.log(`EnhancedPDFProcessor: Created ${textRuns.length} text runs`);
    
    return new Paragraph({
      children: textRuns,
      ...paragraphStyle,
    });
  }

  /**
   * Determine block type based on content analysis
   */
  private determineBlockType(items: EnhancedPDFLayoutInfo[]): string {
    if (items.some(item => item.isHeader)) return 'header';
    if (items.some(item => item.isTable)) return 'table';
    if (items.some(item => item.text.match(/^\d+\./))) return 'list';
    return 'paragraph';
  }

  /**
   * Enhanced font detection methods
   */
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
    
    return false;
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
    
    return false;
  }

  /**
   * Enhanced header detection
   */
  private detectHeaderFromText(item: any, viewport: any): boolean {
    const text = item.str.trim();
    const fontSize = Math.abs(item.transform[0]);
    const relativeY = item.transform[5] / viewport.height;
    
    return (
      fontSize > 14 ||
      relativeY > 0.9 ||
      (text.length < 100 && this.hasHeaderPatterns(text)) ||
      (item.fontName?.toLowerCase().includes('bold') && relativeY > 0.8)
    );
  }

  private detectHeaderLevelFromText(item: any, viewport: any): number {
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

  /**
   * Detect table content
   */
  private detectTableContent(item: any, allItems: any[]): boolean {
    // Simple table detection based on positioning patterns
    const nearbyItems = allItems.filter(other => 
      Math.abs(other.transform[5] - item.transform[5]) < 10 &&
      other !== item
    );
    
    return nearbyItems.length > 2; // Multiple items on same line suggests table
  }

  /**
   * Detect text alignment
   */
  private detectTextAlignment(item: any, viewport: any): string {
    const relativeX = item.transform[4] / viewport.width;
    
    if (relativeX < 0.1) return 'left';
    if (relativeX > 0.9) return 'right';
    if (relativeX > 0.4 && relativeX < 0.6) return 'center';
    
    return 'left';
  }

  /**
   * Extract text color with enhanced detection
   */
  private async extractTextColor(item: any, page: any): Promise<string> {
    try {
      // Try to get graphics state from page
      if (page.getOperatorList) {
        const operatorList = await page.getOperatorList();
        if (operatorList && operatorList.fnArray) {
          // Look for color operators in the operator list
          for (let i = 0; i < operatorList.fnArray.length; i++) {
            const fn = operatorList.fnArray[i];
            const args = operatorList.argsArray[i];
            
            // Check for RGB color operators
            if (fn === pdfjsLib.OPS.setFillRGBColor && args && args.length >= 3) {
              const r = Math.round((args[0] || 0) * 255);
              const g = Math.round((args[1] || 0) * 255);
              const b = Math.round((args[2] || 0) * 255);
              const hexColor = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
              return hexColor.toUpperCase();
            }
          }
        }
      }
      
      return '000000'; // Default black
    } catch (error) {
      return '000000';
    }
  }

  /**
   * Font substitution system
   */
  private getFontSubstitution(originalFont: string): string {
    const fontMap: { [key: string]: string } = {
      'Times-Roman': 'Times New Roman',
      'Times-Bold': 'Times New Roman',
      'Times-Italic': 'Times New Roman',
      'Times-BoldItalic': 'Times New Roman',
      'Helvetica': 'Arial',
      'Helvetica-Bold': 'Arial',
      'Helvetica-Oblique': 'Arial',
      'Helvetica-BoldOblique': 'Arial',
      'Courier': 'Courier New',
      'Courier-Bold': 'Courier New',
      'Courier-Oblique': 'Courier New',
      'Courier-BoldOblique': 'Courier New',
      'Symbol': 'Arial',
      'ZapfDingbats': 'Arial',
    };
    
    return fontMap[originalFont] || 'Arial';
  }

  /**
   * Calculate z-index for layering
   */
  private calculateZIndex(item: any, page: any): number {
    return Math.round(item.transform[5] * 1000); // Use Y position as base
  }

  /**
   * Group layout information by page
   */
  private groupLayoutByPage(layoutInfo: EnhancedPDFLayoutInfo[]): { [pageNum: number]: EnhancedPDFLayoutInfo[] } {
    const pages: { [pageNum: number]: EnhancedPDFLayoutInfo[] } = {};
    
    for (const item of layoutInfo) {
      if (!pages[item.pageNumber]) {
        pages[item.pageNumber] = [];
      }
      pages[item.pageNumber].push(item);
    }
    
    return pages;
  }

  /**
   * Cleanup temporary files
   */
  async cleanup(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(this.tempDir, file)))
      );
    } catch (error) {
      console.error('EnhancedPDFProcessor: Cleanup error:', error);
    }
  }
}
