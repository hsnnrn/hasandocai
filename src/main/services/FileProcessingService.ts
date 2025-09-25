import fs from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import * as mammoth from 'mammoth';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from 'docx';
import pdfParse from 'pdf-parse';
import * as pdfjsLib from 'pdfjs-dist';
import { ConvertAPIService } from './ConvertAPIService';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.min.js');

export interface ConversionOptions {
  outputFormat: 'pdf' | 'docx' | 'csv';
  quality?: 'low' | 'medium' | 'high';
  preserveFormatting?: boolean;
  ocrEnabled?: boolean;
  mergeFiles?: boolean;
}

export interface ConversionResult {
  success: boolean;
  outputPath?: string;
  data?: Buffer;
  error?: string;
  metadata?: {
    originalSize: number;
    outputSize: number;
    processingTime: number;
    pages?: number;
    sheets?: number;
  };
}

export class FileProcessingService {
  private tempDir: string;
  private convertAPI: ConvertAPIService;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
    // Initialize ConvertAPI with your API key
    this.convertAPI = new ConvertAPIService('w9G3Anhj1OyLztslOZmwaZcjwJhNpSbn');
    this.ensureTempDir();
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  async processFile(filePath: string, options: ConversionOptions): Promise<ConversionResult> {
    const startTime = Date.now();
    
    try {
      const fileExt = path.extname(filePath).toLowerCase();
      const fileStats = await fs.stat(filePath);
      
      let result: ConversionResult;

      switch (fileExt) {
        case '.pdf':
          result = await this.processPDF(filePath, options);
          break;
        case '.docx':
          result = await this.processWord(filePath, options);
          break;
        case '.csv':
          result = await this.processCSV(filePath, options);
          break;
        default:
          throw new Error(`Unsupported file format: ${fileExt}`);
      }

      result.metadata = {
        ...result.metadata,
        originalSize: fileStats.size,
        outputSize: result.metadata?.outputSize || 0,
        processingTime: Date.now() - startTime,
      };

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          originalSize: 0,
          outputSize: 0,
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  private async processPDF(filePath: string, options: ConversionOptions): Promise<ConversionResult> {
    const fileBuffer = await fs.readFile(filePath);
    
    switch (options.outputFormat) {
      case 'docx':
        return await this.pdfToWord(fileBuffer, options);
      case 'csv':
        return await this.pdfToCSV(fileBuffer, options);
      default:
        throw new Error(`Cannot convert PDF to ${options.outputFormat}`);
    }
  }

  private async processWord(filePath: string, options: ConversionOptions): Promise<ConversionResult> {
    const fileBuffer = await fs.readFile(filePath);
    
    switch (options.outputFormat) {
      case 'pdf':
        return await this.wordToPDF(fileBuffer, options);
      case 'csv':
        return await this.wordToCSV(fileBuffer, options);
      default:
        throw new Error(`Cannot convert Word to ${options.outputFormat}`);
    }
  }

  private async processCSV(filePath: string, options: ConversionOptions): Promise<ConversionResult> {
    const fileBuffer = await fs.readFile(filePath);
    
    switch (options.outputFormat) {
      case 'docx':
        return await this.csvToWord(fileBuffer, options);
      case 'pdf':
        return await this.csvToPDF(fileBuffer, options);
      default:
        throw new Error(`Cannot convert CSV to ${options.outputFormat}`);
    }
  }

  // PDF to Word conversion using ConvertAPI
  private async pdfToWord(buffer: Buffer, options: ConversionOptions): Promise<ConversionResult> {
    try {
      console.log('Starting PDF to Word conversion with ConvertAPI, buffer size:', buffer.length);
      
      // Use ConvertAPI for PDF to DOCX conversion
      const result = await this.convertAPI.convertPDFToDOCX(buffer);
      
      if (result.success && result.buffer) {
        console.log('ConvertAPI PDF to DOCX conversion successful');
        return {
          success: true,
          data: result.buffer,
          outputPath: result.outputPath,
          metadata: {
            originalSize: buffer.length,
            outputSize: result.buffer.length,
            processingTime: result.metadata?.processingTime || 0,
            pages: result.metadata?.pages || 1,
          },
        };
      } else {
        throw new Error(result.error || 'ConvertAPI conversion failed');
      }
    } catch (error) {
      console.error('ConvertAPI conversion failed, trying fallback:', error);
      
      // Fallback to pdf-parse
      try {
        console.log('Trying pdf-parse fallback...');
        const pdfData = await pdfParse(buffer);
        const text = pdfData.text;
        const pageCount = pdfData.numpages;
        
        console.log('pdf-parse successful, text length:', text.length);
        
        // Create a simple document with basic formatting
        const allContent: any[] = [
          new Paragraph({
            children: [new TextRun({
              text: `PDF Document (${pageCount} pages) - Fallback Mode`,
              bold: true,
              size: 16,
            })],
          }),
          new Paragraph({
            children: [new TextRun({
              text: `Converted on ${new Date().toLocaleDateString()}`,
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
            allContent.push(
              new Paragraph({
                children: [new TextRun({
                  text: paragraph.trim(),
                  size: 12,
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
        console.log('Fallback document created successfully, size:', docBuffer.length);
        
        return {
          success: true,
          data: docBuffer,
          metadata: {
            originalSize: buffer.length,
            outputSize: docBuffer.length,
            processingTime: 0,
            pages: pageCount,
          },
        };
      } catch (fallbackError) {
        console.error('Fallback conversion also failed:', fallbackError);
        throw new Error(`PDF to Word conversion failed: ${error}. Fallback also failed: ${fallbackError}`);
      }
    }
  }

  // Advanced text processing with comprehensive formatting
  private processTextItemsAdvanced(textContent: any, page: any, pageNum: number, viewport: any): any[] {
    const processedItems: any[] = [];
    
    for (const item of textContent.items) {
      const textInfo = {
        text: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height,
        fontName: item.fontName || 'Arial',
        fontSize: Math.abs(item.transform[0]) || 12,
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
  private createFormattedParagraph(block: any, options: ConversionOptions): Paragraph {
    const textRuns: TextRun[] = [];
    
    // Sort items within block by X position
    block.items.sort((a: any, b: any) => a.x - b.x);
    
    for (const item of block.items) {
      const textRunOptions: any = {
        text: item.text,
        bold: item.bold,
        italics: item.italic,
        size: Math.max(8, Math.min(72, Math.round(item.fontSize * 2))),
        font: item.fontName,
      };
      
      // Don't set any colors - let Word use default colors
      
      const textRun = new TextRun(textRunOptions);
      textRuns.push(textRun);
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

  // Advanced color extraction - disabled
  private extractAdvancedColor(item: any, page: any, viewport: any): string {
    // Always return black - no color extraction
    return '000000';
  }

  // Extract color based on position and context
  private extractColorFromPosition(item: any, viewport: any): string {
    const relativeY = item.transform[5] / viewport.height;
    const fontSize = Math.abs(item.transform[0]);
    
    // Only apply special colors for very specific cases
    // Most text should remain black (default)
    
    // Small text (likely footnotes) - gray
    if (fontSize < 8) {
      return '666666'; // Gray for very small text
    }
    
    // Default to black for all other cases
    return '000000'; // Default black
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

  // Helper method to extract color information from PDF transform matrix
  private extractColorFromTransform(transform: number[]): string {
    try {
      // Only return special colors for very extreme transformations
      // Most text should remain black
      return '000000'; // Default black
    } catch (error) {
      return '000000';
    }
  }

  // Helper method to extract color from PDF graphics state
  private extractColorFromGraphicsState(page: any, item: any): string {
    try {
      // Only return special colors for very specific cases
      // Most text should remain black (default)
      return '000000'; // Default black
    } catch (error) {
      return '000000';
    }
  }

  // PDF to CSV conversion
  private async pdfToCSV(buffer: Buffer, options: ConversionOptions): Promise<ConversionResult> {
    try {
      // Convert Buffer to Uint8Array for pdfjs-dist compatibility
      const uint8Array = new Uint8Array(buffer);
      const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
      const pageCount = pdf.numPages;
      
      let csvContent = 'Page,Line,X_Position,Y_Position,Width,Height,Font_Name,Font_Size,Bold,Italic,Color,Relative_X,Relative_Y,Content\n';
      
      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1 });
        
        const textItems = textContent.items.map((item: any) => {
          const color = this.extractColorFromTransform(item.transform);
          
          return {
            text: item.str,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width,
            height: item.height,
            fontName: item.fontName || 'Arial',
            fontSize: Math.abs(item.transform[0]) || 12,
            bold: item.fontName?.toLowerCase().includes('bold') || false,
            italic: item.fontName?.toLowerCase().includes('italic') || false,
            color: color,
            relativeX: item.transform[4] / viewport.width,
            relativeY: item.transform[5] / viewport.height,
          };
        });

        textItems.sort((a: any, b: any) => {
          const yDiff = Math.abs(a.y - b.y);
          if (yDiff > 5) {
            return b.y - a.y;
          }
          return a.x - b.x;
        });

        const lines: any[] = [];
        let currentLine = '';
        let currentY = textItems[0]?.y || 0;
        let currentX = textItems[0]?.x || 0;
        let currentRelativeX = textItems[0]?.relativeX || 0;
        let currentRelativeY = textItems[0]?.relativeY || 0;
        let currentFormatting = textItems[0] || {};

        for (const item of textItems) {
          const yDiff = Math.abs(item.y - currentY);
          
          if (yDiff > 10) {
            if (currentLine.trim()) {
              lines.push({
                text: currentLine.trim(),
                formatting: currentFormatting,
                x: currentX,
                y: currentY,
                relativeX: currentRelativeX,
                relativeY: currentRelativeY
              });
            }
            currentLine = item.text;
            currentY = item.y;
            currentX = item.x;
            currentRelativeX = item.relativeX;
            currentRelativeY = item.relativeY;
            currentFormatting = item;
          } else {
            currentLine += (currentLine ? ' ' : '') + item.text;
            currentX = Math.min(currentX, item.x);
            currentRelativeX = Math.min(currentRelativeX, item.relativeX);
          }
        }

        if (currentLine.trim()) {
          lines.push({
            text: currentLine.trim(),
            formatting: currentFormatting,
            x: currentX,
            y: currentY,
            relativeX: currentRelativeX,
            relativeY: currentRelativeY
          });
        }

        lines.forEach((line, lineIndex) => {
          const escapedText = line.text.replace(/"/g, '""');
          csvContent += `${pageNum},${lineIndex + 1},${Math.round(line.x)},${Math.round(line.y)},${Math.round(line.formatting.width || 0)},${Math.round(line.formatting.height || 0)},"${line.formatting.fontName || 'Arial'}",${Math.round(line.formatting.fontSize || 12)},${line.formatting.bold},${line.formatting.italic},"${line.formatting.color || '000000'}",${line.relativeX.toFixed(4)},${line.relativeY.toFixed(4)},"${escapedText}"\n`;
        });
      }
      
      const csvBuffer = Buffer.from(csvContent, 'utf-8');
      
      return {
        success: true,
        data: csvBuffer,
        metadata: {
          originalSize: buffer.length,
          outputSize: csvBuffer.length,
          processingTime: 0,
          pages: pageCount,
        },
      };
    } catch (error) {
      try {
        const pdfData = await pdfParse(buffer);
        const text = pdfData.text;
        const pageCount = pdfData.numpages;
        
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        let csvContent = 'Page,Line,Content,Position_Estimate\n';
        const linesPerPage = Math.max(1, Math.ceil(lines.length / pageCount));
        
        lines.forEach((line: string, index: number) => {
          const page = Math.floor(index / linesPerPage) + 1;
          const escapedLine = line.replace(/"/g, '""');
          csvContent += `${page},${index + 1},"${escapedLine}",estimated\n`;
        });
        
        const csvBuffer = Buffer.from(csvContent, 'utf-8');
        
        return {
          success: true,
          data: csvBuffer,
          metadata: {
            originalSize: buffer.length,
            outputSize: csvBuffer.length,
            processingTime: 0,
            pages: pageCount,
          },
        };
      } catch (fallbackError) {
        throw new Error(`PDF to CSV conversion failed: ${error}. Fallback also failed: ${fallbackError}`);
      }
    }
  }

  // Word to PDF conversion using ConvertAPI
  private async wordToPDF(buffer: Buffer, options: ConversionOptions): Promise<ConversionResult> {
    try {
      console.log('Starting Word to PDF conversion with ConvertAPI, buffer size:', buffer.length);
      
      // Use ConvertAPI for DOCX to PDF conversion
      const result = await this.convertAPI.convertDOCXToPDF(buffer);
      
      if (result.success && result.buffer) {
        console.log('ConvertAPI DOCX to PDF conversion successful');
        return {
          success: true,
          data: result.buffer,
          outputPath: result.outputPath,
          metadata: {
            originalSize: buffer.length,
            outputSize: result.buffer.length,
            processingTime: result.metadata?.processingTime || 0,
            pages: result.metadata?.pages || 1,
          },
        };
      } else {
        throw new Error(result.error || 'ConvertAPI conversion failed');
      }
    } catch (error) {
      console.error('ConvertAPI conversion failed, trying fallback:', error);
      
      // Fallback to manual PDF creation
      try {
        console.log('Trying manual PDF creation fallback...');
        const result = await mammoth.extractRawText({ buffer });
        const htmlResult = await mammoth.convertToHtml({ buffer });
        
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]);
        const pageSize = page.getSize();
        const width = pageSize.width;
        const height = pageSize.height;
        
        let yPosition = height - 50;
        const lineHeight = 14;
        const margin = 50;
        
        page.drawText('Word Document Conversion', {
          x: margin,
          y: yPosition,
          size: 16,
        });
        yPosition -= 30;
        
        page.drawText(`Converted on: ${new Date().toLocaleDateString()}`, {
          x: margin,
          y: yPosition,
          size: 10,
        });
        yPosition -= 20;
        
        const lines = result.value.split('\n');
        const maxLines = Math.floor((yPosition - margin) / lineHeight);
        const displayLines = lines.slice(0, maxLines);
        
        displayLines.forEach((line, index) => {
          if (yPosition > margin + lineHeight) {
            const displayLine = line.length > 80 ? line.substring(0, 77) + '...' : line;
            
            let fontSize = 12;
            let isBold = false;
            
            if (line.trim().length < 50 && line.trim().length > 0 && !line.includes('.')) {
              fontSize = 14;
              isBold = true;
            }
            
            page.drawText(displayLine, {
              x: margin,
              y: yPosition,
              size: fontSize,
            });
            yPosition -= lineHeight;
          }
        });
        
        if (lines.length > maxLines) {
          page.drawText(`... and ${lines.length - maxLines} more lines`, {
            x: margin,
            y: yPosition,
            size: 10,
          });
        }

        const pdfBytes = await pdfDoc.save();
        
        return {
          success: true,
          data: Buffer.from(pdfBytes),
          metadata: {
            originalSize: buffer.length,
            outputSize: pdfBytes.length,
            processingTime: 0,
            pages: 1,
          },
        };
      } catch (fallbackError) {
        throw new Error(`Word to PDF conversion failed: ${fallbackError}`);
      }
    }
  }

  // Word to CSV conversion
  private async wordToCSV(buffer: Buffer, options: ConversionOptions): Promise<ConversionResult> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const lines = result.value.split('\n').filter(line => line.trim());
      
      const csvContent = 'Line_Number,Content,Length,Is_Header,Estimated_Formatting,Position_Info\n' + 
        lines.map((line, index) => {
          const escapedLine = line.replace(/"/g, '""');
          const isHeader = line.trim().length < 50 && line.trim().length > 0 && !line.includes('.');
          const estimatedFormatting = isHeader ? 'Header' : 'Normal';
          const positionInfo = `Line_${index + 1}`;
          
          return `${index + 1},"${escapedLine}",${line.length},${isHeader},"${estimatedFormatting}","${positionInfo}"`;
        }).join('\n');
      
      const csvBuffer = Buffer.from(csvContent, 'utf-8');
      
      return {
        success: true,
        data: csvBuffer,
        metadata: {
          originalSize: buffer.length,
          outputSize: csvBuffer.length,
          processingTime: 0,
        },
      };
    } catch (error) {
      throw new Error(`Word to CSV conversion failed: ${error}`);
    }
  }

  // CSV to Word conversion
  private async csvToWord(buffer: Buffer, options: ConversionOptions): Promise<ConversionResult> {
    try {
      const csvData = buffer.toString('utf-8');
      const lines = csvData.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }

      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const parsedLines = lines.map(line => parseCSVLine(line));
      const maxColumns = Math.max(...parsedLines.map(row => row.length));
      
      const hasFormattingData = parsedLines[0] && parsedLines[0].length > 5 && 
        (parsedLines[0].includes('X_Position') || parsedLines[0].includes('Position'));
      
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun({
                text: 'CSV Data Conversion',
                bold: true,
                size: 16,
              })],
            }),
            new Paragraph({
              children: [new TextRun({
                text: `Converted ${parsedLines.length} rows with ${maxColumns} columns`,
                italics: true,
                size: 12,
              })],
            }),
            new Paragraph({
              children: [new TextRun({
                text: `Conversion Date: ${new Date().toLocaleDateString()}`,
                size: 10,
              })],
            }),
            new Paragraph({
              children: [new TextRun({ text: '' })],
            }),
            new Table({
              rows: parsedLines.slice(0, 50).map((row, index) => 
                new TableRow({
                  children: row.map((cell, cellIndex) => {
                    const cellText = String(cell || '').replace(/"/g, '');
                    
                    let textRun = new TextRun({ 
                      text: cellText,
                    });
                    
                    if (index === 0) {
                      textRun = new TextRun({ 
                        text: cellText,
                        bold: true,
                        size: 12,
                      });
                    }
                    else if (hasFormattingData && (cellIndex === 2 || cellIndex === 3)) {
                      textRun = new TextRun({ 
                        text: cellText,
                        size: 9,
                        color: '666666',
                      });
                    }
                    
                    return new TableCell({
                      children: [new Paragraph({ 
                        children: [textRun] 
                      })],
                    });
                  }),
                })
              ),
            }),
            ...(parsedLines.length > 50 ? [
              new Paragraph({
                children: [new TextRun({
                  text: `... (${parsedLines.length - 50} more rows)`,
                  italics: true,
                  size: 10,
                })],
              })
            ] : [])
          ],
        }],
      });

      const docBuffer = await Packer.toBuffer(doc);
      
      return {
        success: true,
        data: docBuffer,
        metadata: {
          originalSize: buffer.length,
          outputSize: docBuffer.length,
          processingTime: 0,
        },
      };
    } catch (error) {
      throw new Error(`CSV to Word conversion failed: ${error}`);
    }
  }

  // CSV to PDF conversion
  private async csvToPDF(buffer: Buffer, options: ConversionOptions): Promise<ConversionResult> {
    try {
      const csvData = buffer.toString('utf-8');
      const lines = csvData.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]);
      const pageSize = page.getSize();
      const width = pageSize.width;
      const height = pageSize.height;
      
      let yPosition = height - 50;
      const lineHeight = 12;
      const margin = 50;
      
      page.drawText('CSV Data Export', {
        x: margin,
        y: yPosition,
        size: 18,
      });
      yPosition -= 35;
      
      page.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
        x: margin,
        y: yPosition,
        size: 12,
      });
      yPosition -= 25;
      
      page.drawText(`Total Rows: ${lines.length}`, {
        x: margin,
        y: yPosition,
        size: 12,
      });
      yPosition -= 25;
      
      const hasFormattingData = lines[0] && lines[0].includes('X_Position');
      
      if (hasFormattingData) {
        page.drawText('Enhanced CSV with positioning data', {
          x: margin,
          y: yPosition,
          size: 10,
        });
        yPosition -= 20;
      }
      
      const maxLines = Math.floor((yPosition - margin) / lineHeight);
      const displayLines = lines.slice(0, maxLines);
      
      displayLines.forEach((line, index) => {
        if (yPosition > margin + lineHeight) {
          const displayLine = line.length > 80 ? line.substring(0, 77) + '...' : line;
          
          let fontSize = 9;
          if (index === 0) {
            fontSize = 10;
          }
          
          page.drawText(displayLine, {
            x: margin,
            y: yPosition,
            size: fontSize,
          });
          yPosition -= lineHeight;
        }
      });
      
      if (lines.length > maxLines) {
        page.drawText(`... and ${lines.length - maxLines} more rows`, {
          x: margin,
          y: yPosition,
          size: 9,
        });
      }

      const pdfBytes = await pdfDoc.save();
      
      return {
        success: true,
        data: Buffer.from(pdfBytes),
        metadata: {
          originalSize: buffer.length,
          outputSize: pdfBytes.length,
          processingTime: 0,
          pages: 1,
        },
      };
    } catch (error) {
      throw new Error(`CSV to PDF conversion failed: ${error}`);
    }
  }

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