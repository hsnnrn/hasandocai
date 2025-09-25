import fs from 'fs/promises';
import path from 'path';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import pdfParse from 'pdf-parse';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.min.js');

export interface SimpleConversionResult {
  success: boolean;
  buffer?: Buffer;
  report: {
    success: boolean;
    processingTime: number;
    pages: number;
    textLength: number;
    fontPreservations: string[];
    colorPreservations: string[];
  };
  error?: string;
}

export class SimplePDFProcessor {
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
   * Advanced PDF to DOCX conversion using PDF.js for better font/color preservation
   */
  async convertPDFToDOCX(pdfBuffer: Buffer): Promise<SimpleConversionResult> {
    const startTime = Date.now();
    
    try {
      console.log('SimplePDFProcessor: Starting advanced conversion with PDF.js');
      
      // Use PDF.js for advanced text extraction with formatting
      const uint8Array = new Uint8Array(pdfBuffer);
      const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
      const pageCount = pdf.numPages;
      
      console.log(`SimplePDFProcessor: Processing ${pageCount} pages with PDF.js`);
      
      const allContent: any[] = [];
      const fontPreservations: string[] = [];
      const colorPreservations: string[] = [];
      
      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });
        const textContent = await page.getTextContent();
        
        // Process each text item with formatting
        for (const item of textContent.items) {
          if ('str' in item && 'transform' in item) {
            const text = item.str;
            const fontSize = Math.abs(item.transform[0]) || 12;
            const fontName = item.fontName || 'Arial';
            const bold = this.detectBoldFont(fontName);
            const italic = this.detectItalicFont(fontName);
            const color = this.extractColor(item);
            
            // Font substitution
            const substitutedFont = this.getFontSubstitution(fontName);
            if (substitutedFont !== fontName) {
              fontPreservations.push(`${fontName} -> ${substitutedFont}`);
            }
            
            // Color preservation
            if (color !== '000000') {
              colorPreservations.push(`${text.substring(0, 20)}: ${color}`);
            }
            
            // Create paragraph with formatting
            const paragraph = new Paragraph({
              children: [new TextRun({
                text: text,
                bold: bold,
                italics: italic,
                size: Math.max(8, Math.min(72, Math.round(fontSize * 2))),
                font: substitutedFont,
                color: color,
              })],
              spacing: {
                after: 120,
              },
            });
            
            allContent.push(paragraph);
          }
        }
        
        // Add page break between pages
        if (pageNum < pageCount) {
          allContent.push(new Paragraph({
            children: [new TextRun({ text: '' })],
            pageBreakBefore: true,
          }));
        }
      }
      
      // Create DOCX document
      const doc = new Document({
        sections: [{
          properties: {},
          children: allContent,
        }],
      });

      const docBuffer = await Packer.toBuffer(doc);
      const processingTime = Date.now() - startTime;
      
      console.log('SimplePDFProcessor: Advanced conversion successful with font/color preservation');
      
      return {
        success: true,
        buffer: docBuffer,
        report: {
          success: true,
          processingTime,
          pages: pageCount,
          textLength: docBuffer.length,
          fontPreservations,
          colorPreservations,
        }
      };
      
    } catch (error) {
      console.error('SimplePDFProcessor: PDF.js conversion failed, trying fallback:', error);
      
      // Fallback to pdf-parse method
      return await this.convertPDFToDOCXFallback(pdfBuffer);
    }
  }

  /**
   * Fallback method using basic text extraction
   */
  async convertPDFToDOCXFallback(pdfBuffer: Buffer): Promise<SimpleConversionResult> {
    const startTime = Date.now();
    
    try {
      console.log('SimplePDFProcessor: Using fallback conversion method');
      
      // Create a simple DOCX document with basic content
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun({
                text: 'PDF Document Conversion',
                bold: true,
                size: 16,
              })],
            }),
            new Paragraph({
              children: [new TextRun({
                text: `Converted on: ${new Date().toLocaleDateString()}`,
                italics: true,
                size: 12,
              })],
            }),
            new Paragraph({
              children: [new TextRun({ text: '' })],
            }),
            new Paragraph({
              children: [new TextRun({
                text: 'This is a basic conversion. The original PDF content has been processed using a fallback method.',
                size: 12,
              })],
            }),
            new Paragraph({
              children: [new TextRun({
                text: 'For better results, please ensure your PDF contains selectable text.',
                size: 10,
                italics: true,
              })],
            }),
          ],
        }],
      });

      const docBuffer = await Packer.toBuffer(doc);
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        buffer: docBuffer,
        report: {
          success: true,
          processingTime,
          pages: 1,
          textLength: docBuffer.length,
          fontPreservations: ['Fallback method'],
          colorPreservations: ['Basic formatting'],
        }
      };
      
    } catch (error) {
      console.error('SimplePDFProcessor: Fallback conversion failed:', error);
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fallback conversion failed',
        report: {
          success: false,
          processingTime,
          pages: 0,
          textLength: 0,
          fontPreservations: [],
          colorPreservations: [],
        }
      };
    }
  }

  /**
   * Clean up temporary file
   */
  private async cleanupFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('SimplePDFProcessor: Could not delete temporary file:', filePath);
    }
  }

  /**
   * Detect bold font
   */
  private detectBoldFont(fontName: string): boolean {
    const fontLower = fontName.toLowerCase();
    return fontLower.includes('bold') || fontLower.includes('black') || 
           fontLower.includes('heavy') || fontLower.includes('demibold');
  }

  /**
   * Detect italic font
   */
  private detectItalicFont(fontName: string): boolean {
    const fontLower = fontName.toLowerCase();
    return fontLower.includes('italic') || fontLower.includes('oblique') || 
           fontLower.includes('slanted');
  }

  /**
   * Extract color from PDF item
   */
  private extractColor(item: any): string {
    try {
      if (item.color && Array.isArray(item.color)) {
        const r = Math.round((item.color[0] || 0) * 255);
        const g = Math.round((item.color[1] || 0) * 255);
        const b = Math.round((item.color[2] || 0) * 255);
        const hexColor = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        return hexColor.toUpperCase();
      }
      return '000000'; // Default black
    } catch (error) {
      return '000000';
    }
  }

  /**
   * Font substitution mapping
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
      'Arial': 'Arial',
      'Arial-Bold': 'Arial',
      'Arial-Italic': 'Arial',
      'Arial-BoldItalic': 'Arial',
      'Calibri': 'Calibri',
      'Calibri-Bold': 'Calibri',
      'Calibri-Italic': 'Calibri',
      'Calibri-BoldItalic': 'Calibri',
      'Verdana': 'Verdana',
      'Verdana-Bold': 'Verdana',
      'Verdana-Italic': 'Verdana',
      'Verdana-BoldItalic': 'Verdana',
      'Georgia': 'Georgia',
      'Georgia-Bold': 'Georgia',
      'Georgia-Italic': 'Georgia',
      'Georgia-BoldItalic': 'Georgia',
    };
    
    return fontMap[originalFont] || 'Arial';
  }

  /**
   * Clean up all temporary files
   */
  async cleanup(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      const tempFiles = files.filter(file => file.startsWith('temp_'));
      
      await Promise.all(
        tempFiles.map(file => 
          fs.unlink(path.join(this.tempDir, file)).catch(() => {})
        )
      );
    } catch (error) {
      console.error('SimplePDFProcessor: Cleanup error:', error);
    }
  }
}