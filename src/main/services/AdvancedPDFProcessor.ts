import fs from 'fs/promises';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, ImageRun, ExternalHyperlink, InternalHyperlink, HeadingLevel, AlignmentType, VerticalAlign, WidthType, BorderStyle, ShadingType, PageBreak, SectionType } from 'docx';
import { PDFDocument } from 'pdf-lib';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.min.js');

export interface PDFLayoutInfo {
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
}

export interface FontSubstitution {
  original: string;
  substituted: string;
  reason: string;
}

export interface ConversionReport {
  success: boolean;
  fontSubstitutions: FontSubstitution[];
  layoutWarnings: string[];
  imageExtractions: number;
  vectorObjects: number;
  processingTime: number;
}

export class AdvancedPDFProcessor {
  private tempDir: string;
  private fontSubstitutions: FontSubstitution[] = [];
  private layoutWarnings: string[] = [];

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
   * Convert PDF to DOCX with precise layout preservation
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
    } = {}
  ): Promise<{ buffer: Buffer; report: ConversionReport }> {
    const startTime = Date.now();
    this.fontSubstitutions = [];
    this.layoutWarnings = [];

    try {
      console.log('AdvancedPDFProcessor: Starting conversion with buffer size:', pdfBuffer.length);
      
      // Convert Buffer to Uint8Array for pdfjs-dist compatibility
      const uint8Array = new Uint8Array(pdfBuffer);
      console.log('AdvancedPDFProcessor: Converted to Uint8Array, size:', uint8Array.length);
      
      const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
      const pageCount = pdf.numPages;
      console.log('AdvancedPDFProcessor: PDF loaded, page count:', pageCount);

      // Extract layout information from all pages
      const allLayoutInfo: PDFLayoutInfo[] = [];
      const images: any[] = [];
      const vectorObjects: any[] = [];

      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        console.log(`AdvancedPDFProcessor: Processing page ${pageNum}/${pageCount}`);
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        
        // Extract text with precise positioning
        const textContent = await page.getTextContent();
        console.log(`AdvancedPDFProcessor: Page ${pageNum} has ${textContent.items.length} text items`);
        
        const pageLayoutInfo = await this.extractTextLayout(textContent, page, pageNum);
        console.log(`AdvancedPDFProcessor: Page ${pageNum} extracted ${pageLayoutInfo.length} layout items`);
        allLayoutInfo.push(...pageLayoutInfo);

        // Extract images if requested
        if (options.extractImages) {
          const pageImages = await this.extractPageImages(page, pageNum);
          images.push(...pageImages);
        }

        // Extract vector objects if requested
        if (options.extractVectorObjects) {
          const pageVectorObjects = await this.extractPageVectorObjects(page, pageNum);
          vectorObjects.push(...pageVectorObjects);
        }
      }

      console.log(`AdvancedPDFProcessor: Total layout items extracted: ${allLayoutInfo.length}`);
      console.log(`AdvancedPDFProcessor: Images extracted: ${images.length}`);
      console.log(`AdvancedPDFProcessor: Vector objects extracted: ${vectorObjects.length}`);

      // Create DOCX document with layout preservation
      console.log('AdvancedPDFProcessor: Creating DOCX document...');
      const doc = await this.createDOCXWithLayout(
        allLayoutInfo, 
        images, 
        vectorObjects, 
        pageCount,
        options
      );

      console.log('AdvancedPDFProcessor: Converting DOCX to buffer...');
      const docBuffer = await Packer.toBuffer(doc);
      const processingTime = Date.now() - startTime;
      console.log(`AdvancedPDFProcessor: DOCX buffer created, size: ${docBuffer.length} bytes`);

      return {
        buffer: docBuffer,
        report: {
          success: true,
          fontSubstitutions: this.fontSubstitutions,
          layoutWarnings: this.layoutWarnings,
          imageExtractions: images.length,
          vectorObjects: vectorObjects.length,
          processingTime,
        }
      };

    } catch (error) {
      console.error('AdvancedPDFProcessor: Conversion failed:', error);
      console.error('AdvancedPDFProcessor: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw new Error(`PDF to DOCX conversion failed: ${error}`);
    }
  }

  /**
   * Extract text layout information with precise positioning
   */
  private async extractTextLayout(textContent: any, page: any, pageNum: number): Promise<PDFLayoutInfo[]> {
    const viewport = page.getViewport({ scale: 1 });
    const layoutInfo: PDFLayoutInfo[] = [];

    for (const item of textContent.items) {
      // Extract comprehensive text information
      const textInfo: PDFLayoutInfo = {
        text: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height,
        fontSize: Math.abs(item.transform[0]) || 12,
        fontName: item.fontName || 'Arial',
        bold: this.detectBoldFont(item.fontName, item.transform),
        italic: this.detectItalicFont(item.fontName, item.transform),
        color: '000000', // Always use black - no color extraction
        zIndex: this.calculateZIndex(item, page),
        pageNumber: pageNum,
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
   * Create DOCX document with layout preservation
   */
  private async createDOCXWithLayout(
    layoutInfo: PDFLayoutInfo[],
    images: any[],
    vectorObjects: any[],
    pageCount: number,
    options: any
  ): Promise<Document> {
    console.log('AdvancedPDFProcessor: createDOCXWithLayout called with', layoutInfo.length, 'layout items');
    const children: any[] = [];

    // Group layout info by page
    const pagesLayout = this.groupLayoutByPage(layoutInfo);
    console.log('AdvancedPDFProcessor: Grouped layout by page:', Object.keys(pagesLayout).length, 'pages');

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const pageLayout = pagesLayout[pageNum] || [];
      console.log(`AdvancedPDFProcessor: Page ${pageNum} has ${pageLayout.length} layout items`);
      
      // Add page break for multi-page documents
      if (pageNum > 1) {
        children.push(new Paragraph({
          children: [new TextRun({ text: '' })],
          pageBreakBefore: true,
        }));
      }

      // Create page content with layout preservation
      const pageContent = await this.createPageContent(pageLayout, pageNum, options);
      console.log(`AdvancedPDFProcessor: Page ${pageNum} created ${pageContent.length} content items`);
      
      // Add all content without validation
      children.push(...pageContent);
    }

    console.log(`AdvancedPDFProcessor: Total children created: ${children.length}`);
    return new Document({
      sections: [{
        properties: {},
        children,
      }],
    });
  }

  /**
   * Create content for a single page with layout preservation
   */
  private async createPageContent(
    pageLayout: PDFLayoutInfo[], 
    pageNum: number, 
    options: any
  ): Promise<any[]> {
    console.log(`AdvancedPDFProcessor: createPageContent for page ${pageNum} with ${pageLayout.length} items`);
    const content: any[] = [];

    // Group text into lines while preserving positioning
    const lines = this.groupTextIntoLines(pageLayout);
    console.log(`AdvancedPDFProcessor: Page ${pageNum} grouped into ${lines.length} lines`);

    for (const line of lines) {
      // Create positioned text element
      const textElement = this.createPositionedTextElement(line, options);
      content.push(textElement);
    }

    console.log(`AdvancedPDFProcessor: Page ${pageNum} created ${content.length} content elements`);
    return content;
  }

  /**
   * Group text items into lines while preserving positioning
   */
  private groupTextIntoLines(layoutInfo: PDFLayoutInfo[]): Array<{
    text: string;
    formatting: PDFLayoutInfo;
    positioning: { x: number; y: number; zIndex: number };
  }> {
    console.log(`AdvancedPDFProcessor: groupTextIntoLines called with ${layoutInfo.length} items`);
    const lines: any[] = [];
    let currentLine = '';
    let currentY = layoutInfo[0]?.y || 0;
    let currentX = layoutInfo[0]?.x || 0;
    let currentFormatting = layoutInfo[0] || {} as PDFLayoutInfo;

    for (const item of layoutInfo) {
      const yDiff = Math.abs(item.y - currentY);
      
      if (yDiff > 10) { // New line
        if (currentLine.trim()) {
          lines.push({
            text: currentLine.trim(),
            formatting: currentFormatting,
            positioning: {
              x: currentX,
              y: currentY,
              zIndex: currentFormatting.zIndex,
            }
          });
        }
        currentLine = item.text;
        currentY = item.y;
        currentX = item.x;
        currentFormatting = item;
      } else {
        currentLine += (currentLine ? ' ' : '') + item.text;
        currentX = Math.min(currentX, item.x); // Use leftmost position
      }
    }

    if (currentLine.trim()) {
      lines.push({
        text: currentLine.trim(),
        formatting: currentFormatting,
        positioning: {
          x: currentX,
          y: currentY,
          zIndex: currentFormatting.zIndex,
        }
      });
    }

    console.log(`AdvancedPDFProcessor: groupTextIntoLines created ${lines.length} lines`);
    return lines;
  }

  /**
   * Create positioned text element with enhanced formatting
   */
  private createPositionedTextElement(line: any, options: any): Paragraph {
    console.log('AdvancedPDFProcessor: createPositionedTextElement called with line:', line);
    
    const textRuns: TextRun[] = [];
    
    // Enhanced header detection
    const isHeader = this.detectHeaderFromLine(line);
    const headerLevel = this.detectHeaderLevelFromLine(line);
    
    console.log(`AdvancedPDFProcessor: Header detection - isHeader: ${isHeader}, level: ${headerLevel}`);
    
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
    const textContent = line.text || '';
    const fontSize = isHeader && headerLevel > 0 
      ? Math.max(16, Math.min(72, Math.round((line.formatting?.fontSize || 12) * 2)))
      : Math.max(8, Math.min(72, Math.round((line.formatting?.fontSize || 12) * 2)));
    
    // Use original color from PDF data only - no color detection
    const originalColor = line.formatting?.color || '000000';
    const detectedColor = originalColor;
    
    console.log(`AdvancedPDFProcessor: Creating TextRun - text: "${textContent}", fontSize: ${fontSize}, bold: ${line.formatting?.bold}, originalColor: ${originalColor}, detectedColor: ${detectedColor}`);
    
    // Create text run with proper color handling
    const textRunOptions: any = {
      text: textContent,
      bold: line.formatting?.bold || (isHeader && headerLevel <= 3),
      italics: line.formatting?.italic || false,
      size: fontSize,
      font: line.formatting?.fontName || 'Arial',
    };
    
    // Don't set any colors - let Word use default colors
    
    const mainTextRun = new TextRun(textRunOptions);
    textRuns.push(mainTextRun);

    // Remove positioning debug text - it's cluttering the Word document
    // if (options.preserveLayout) {
    //   textRuns.push(new TextRun({
    //     text: ` [Pos: ${Math.round(line.positioning?.x || 0)},${Math.round(line.positioning?.y || 0)}]`,
    //     italics: true,
    //     size: 16, // 8pt in half-points
    //     color: '666666',
    //   }));
    // }

    console.log(`AdvancedPDFProcessor: Created ${textRuns.length} text runs`);
    
    return new Paragraph({
      children: textRuns,
      ...paragraphStyle,
    });
  }

  /**
   * Group layout information by page
   */
  private groupLayoutByPage(layoutInfo: PDFLayoutInfo[]): { [pageNum: number]: PDFLayoutInfo[] } {
    const pages: { [pageNum: number]: PDFLayoutInfo[] } = {};
    
    for (const item of layoutInfo) {
      if (!pages[item.pageNumber]) {
        pages[item.pageNumber] = [];
      }
      pages[item.pageNumber].push(item);
    }
    
    return pages;
  }

  /**
   * Extract images from PDF page
   */
  private async extractPageImages(page: any, pageNum: number): Promise<any[]> {
    try {
      // This would require more advanced PDF parsing to extract actual images
      // For now, return empty array - in a full implementation, you'd use
      // PDF.js's getOperatorList() or similar methods to extract image objects
      this.layoutWarnings.push(`Image extraction not fully implemented for page ${pageNum}`);
      return [];
    } catch (error) {
      this.layoutWarnings.push(`Failed to extract images from page ${pageNum}: ${error}`);
      return [];
    }
  }

  /**
   * Extract vector objects from PDF page
   */
  private async extractPageVectorObjects(page: any, pageNum: number): Promise<any[]> {
    try {
      // This would require parsing PDF drawing operators
      // For now, return empty array - in a full implementation, you'd extract
      // paths, shapes, and other vector graphics
      this.layoutWarnings.push(`Vector object extraction not fully implemented for page ${pageNum}`);
      return [];
    } catch (error) {
      this.layoutWarnings.push(`Failed to extract vector objects from page ${pageNum}: ${error}`);
      return [];
    }
  }

  /**
   * Enhanced font detection methods
   */
  private detectBoldFont(fontName: string, transform: number[]): boolean {
    const fontLower = fontName.toLowerCase();
    
    if (fontLower.includes('bold') || fontLower.includes('black') || fontLower.includes('heavy')) {
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
    
    if (fontLower.includes('italic') || fontLower.includes('oblique') || fontLower.includes('slanted')) {
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
   * Detect color for a specific line based on its content and formatting
   */
  private detectColorForLine(line: any): string {
    try {
      const text = (line.text || '').trim();
      const fontSize = line.formatting?.fontSize || 12;
      const isBold = line.formatting?.bold || false;
      const isHeader = this.detectHeaderFromLine(line);
      
      console.log(`AdvancedPDFProcessor: Color detection - text: "${text}", fontSize: ${fontSize}, isBold: ${isBold}, isHeader: ${isHeader}`);
      
      // Only apply special colors for very specific cases
      // Most text should remain black (default)
      
      // Very small text (footnotes) - Gray
      if (fontSize < 8) {
        console.log('AdvancedPDFProcessor: Detected as very small text - Gray');
        return '666666'; // Gray
      }
      
      // Default to black for all other cases
      console.log('AdvancedPDFProcessor: Using default color - Black');
      return '000000';
      
    } catch (error) {
      return '000000';
    }
  }

  /**
   * Extract text color with enhanced detection - disabled
   */
  private async extractTextColor(item: any, page: any): Promise<string> {
    // Always return black - no color extraction
    return '000000';
  }

  private extractColorFromTransform(transform: number[]): string {
    try {
      // Only return special colors for very extreme transformations
      // Most text should remain black (default)
      return '000000'; // Default black
    } catch (error) {
      return '000000';
    }
  }

  private async extractColorFromGraphicsState(page: any, item: any): Promise<string> {
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
              console.log(`AdvancedPDFProcessor: Graphics state RGB color found - RGB(${r},${g},${b}) -> #${hexColor}`);
              return hexColor.toUpperCase();
            }
            
            // Check for CMYK color operators
            if (fn === pdfjsLib.OPS.setFillCMYKColor && args && args.length >= 4) {
              const c = args[0] || 0;
              const m = args[1] || 0;
              const y = args[2] || 0;
              const k = args[3] || 0;
              
              // Convert CMYK to RGB
              const r = Math.round(255 * (1 - c) * (1 - k));
              const g = Math.round(255 * (1 - m) * (1 - k));
              const b = Math.round(255 * (1 - y) * (1 - k));
              const hexColor = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
              console.log(`AdvancedPDFProcessor: Graphics state CMYK color found - CMYK(${c},${m},${y},${k}) -> RGB(${r},${g},${b}) -> #${hexColor}`);
              return hexColor.toUpperCase();
            }
            
            // Check for gray color operators
            if (fn === pdfjsLib.OPS.setFillGray && args && args.length >= 1) {
              const gray = Math.round((args[0] || 0) * 255);
              const hexColor = ((1 << 24) + (gray << 16) + (gray << 8) + gray).toString(16).slice(1);
              console.log(`AdvancedPDFProcessor: Graphics state gray color found - Gray(${gray}) -> #${hexColor}`);
              return hexColor.toUpperCase();
            }
          }
        }
      }
      
      // If no color found in graphics state, return default
      return '000000';
    } catch (error) {
      console.error('AdvancedPDFProcessor: Error extracting color from graphics state:', error);
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
    // Simple z-index calculation based on position and transform
    // In a full implementation, you'd analyze the PDF's drawing order
    return Math.round(item.transform[5] * 1000); // Use Y position as base
  }

  /**
   * Detect if a line is a header based on formatting and content
   */
  private detectHeaderFromLine(line: any): boolean {
    try {
      const text = (line.text || '').trim();
      
      // Empty text is not a header
      if (!text) return false;
      
      // Check if text is short (typical for headers)
      if (text.length > 100) return false;
      
      // Check if font size is significantly larger than normal
      if ((line.formatting?.fontSize || 12) > 14) return true;
      
      // Check if text contains common header patterns
      const headerPatterns = [
        /^[A-Z][A-Z\s]+$/, // ALL CAPS
        /^\d+\.?\s/, // Numbered headers (1. 2. etc.)
        /^[IVX]+\.?\s/, // Roman numerals
        /^[A-Z]\.?\s/, // Single letter headers
      ];
      
      return headerPatterns.some(pattern => pattern.test(text));
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect header level based on formatting
   */
  private detectHeaderLevelFromLine(line: any): number {
    try {
      const fontSize = line.formatting?.fontSize || 12;
      const isBold = line.formatting?.bold || false;
      
      // Header level based on font size and boldness
      if (fontSize >= 18) return 1; // H1
      if (fontSize >= 16) return 2; // H2
      if (fontSize >= 14) return 3; // H3
      if (fontSize >= 12 && isBold) return 4; // H4
      if (fontSize >= 12) return 5; // H5
      if (isBold) return 6; // H6
      
      return 0; // Not a header
    } catch (error) {
      return 0;
    }
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
      console.error('Cleanup error:', error);
    }
  }
}
