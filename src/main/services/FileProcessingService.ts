import fs from 'fs/promises';
import path from 'path';
import * as XLSX from 'xlsx';
import { PDFDocument } from 'pdf-lib';
import * as mammoth from 'mammoth';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from 'docx';
import ExcelJS from 'exceljs';

export interface ConversionOptions {
  outputFormat: 'pdf' | 'docx' | 'xlsx' | 'csv';
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
        case '.xlsx':
          result = await this.processExcel(filePath, options);
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
      case 'xlsx':
        return await this.pdfToExcel(fileBuffer, options);
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
      case 'xlsx':
        return await this.wordToExcel(fileBuffer, options);
      case 'csv':
        return await this.wordToCSV(fileBuffer, options);
      default:
        throw new Error(`Cannot convert Word to ${options.outputFormat}`);
    }
  }

  private async processExcel(filePath: string, options: ConversionOptions): Promise<ConversionResult> {
    const fileBuffer = await fs.readFile(filePath);
    
    switch (options.outputFormat) {
      case 'pdf':
        return await this.excelToPDF(fileBuffer, options);
      case 'docx':
        return await this.excelToWord(fileBuffer, options);
      case 'csv':
        return await this.excelToCSV(fileBuffer, options);
      default:
        throw new Error(`Cannot convert Excel to ${options.outputFormat}`);
    }
  }

  private async processCSV(filePath: string, options: ConversionOptions): Promise<ConversionResult> {
    const fileBuffer = await fs.readFile(filePath);
    
    switch (options.outputFormat) {
      case 'xlsx':
        return await this.csvToExcel(fileBuffer, options);
      case 'docx':
        return await this.csvToWord(fileBuffer, options);
      case 'pdf':
        return await this.csvToPDF(fileBuffer, options);
      default:
        throw new Error(`Cannot convert CSV to ${options.outputFormat}`);
    }
  }

  // PDF Conversion Methods
  private async pdfToWord(buffer: Buffer, options: ConversionOptions): Promise<ConversionResult> {
    try {
      const pdfDoc = await PDFDocument.load(buffer);
      const pageCount = pdfDoc.getPageCount();
      
      // Simple text extraction (in real implementation, use proper PDF parsing)
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun({
                text: `Converted PDF content (${pageCount} pages)`,
              })],
            }),
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
          pages: pageCount,
        },
      };
    } catch (error) {
      throw new Error(`PDF to Word conversion failed: ${error}`);
    }
  }

  private async pdfToExcel(buffer: Buffer, options: ConversionOptions): Promise<ConversionResult> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('PDF Data');
      
      // Add header
      worksheet.addRow(['Extracted PDF Data']);
      worksheet.addRow(['Content extracted from PDF file']);
      
      const excelBuffer = await workbook.xlsx.writeBuffer();
      
      return {
        success: true,
        data: Buffer.from(excelBuffer),
        metadata: {
          originalSize: buffer.length,
          outputSize: excelBuffer.byteLength,
          processingTime: 0,
          sheets: 1,
        },
      };
    } catch (error) {
      throw new Error(`PDF to Excel conversion failed: ${error}`);
    }
  }

  private async pdfToCSV(buffer: Buffer, options: ConversionOptions): Promise<ConversionResult> {
    try {
      const csvContent = 'Extracted PDF Data\n"Content extracted from PDF file"';
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
      throw new Error(`PDF to CSV conversion failed: ${error}`);
    }
  }

  // Word Conversion Methods
  private async wordToPDF(buffer: Buffer, options: ConversionOptions): Promise<ConversionResult> {
    try {
      // Extract text from Word document
      const result = await mammoth.extractRawText({ buffer });
      
      // Create a simple PDF (in real implementation, use proper PDF generation)
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      
      page.drawText(result.value.substring(0, 1000), {
        x: 50,
        y: height - 100,
        size: 12,
      });

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
      throw new Error(`Word to PDF conversion failed: ${error}`);
    }
  }

  private async wordToExcel(buffer: Buffer, options: ConversionOptions): Promise<ConversionResult> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Word Content');
      
      const lines = result.value.split('\n').filter(line => line.trim());
      lines.forEach((line, index) => {
        worksheet.addRow([`Line ${index + 1}`, line]);
      });
      
      const excelBuffer = await workbook.xlsx.writeBuffer();
      
      return {
        success: true,
        data: Buffer.from(excelBuffer),
        metadata: {
          originalSize: buffer.length,
          outputSize: excelBuffer.byteLength,
          processingTime: 0,
          sheets: 1,
        },
      };
    } catch (error) {
      throw new Error(`Word to Excel conversion failed: ${error}`);
    }
  }

  private async wordToCSV(buffer: Buffer, options: ConversionOptions): Promise<ConversionResult> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const lines = result.value.split('\n').filter(line => line.trim());
      
      const csvContent = 'Line Number,Content\n' + 
        lines.map((line, index) => `${index + 1},"${line.replace(/"/g, '""')}"`).join('\n');
      
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

  // Excel Conversion Methods
  private async excelToPDF(buffer: Buffer, options: ConversionOptions): Promise<ConversionResult> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const csvData = XLSX.utils.sheet_to_csv(worksheet);
      
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { height } = page.getSize();
      
      page.drawText(csvData.substring(0, 1000), {
        x: 50,
        y: height - 100,
        size: 10,
      });

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
      throw new Error(`Excel to PDF conversion failed: ${error}`);
    }
  }

  private async excelToWord(buffer: Buffer, options: ConversionOptions): Promise<ConversionResult> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun({
                text: `Excel Data from ${sheetName}`,
              })],
            }),
            new Table({
              rows: jsonData.slice(0, 10).map((row: any) => 
                new TableRow({
                  children: row.map((cell: any) => 
                    new TableCell({
                      children: [new Paragraph({ text: String(cell || '') })],
                    })
                  ),
                })
              ),
            }),
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
          sheets: workbook.SheetNames.length,
        },
      };
    } catch (error) {
      throw new Error(`Excel to Word conversion failed: ${error}`);
    }
  }

  private async excelToCSV(buffer: Buffer, options: ConversionOptions): Promise<ConversionResult> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const csvData = XLSX.utils.sheet_to_csv(worksheet);
      
      const csvBuffer = Buffer.from(csvData, 'utf-8');
      
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
      throw new Error(`Excel to CSV conversion failed: ${error}`);
    }
  }

  // CSV Conversion Methods
  private async csvToExcel(buffer: Buffer, options: ConversionOptions): Promise<ConversionResult> {
    try {
      const csvData = buffer.toString('utf-8');
      const workbook = XLSX.read(csvData, { type: 'string' });
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      return {
        success: true,
        data: excelBuffer,
        metadata: {
          originalSize: buffer.length,
          outputSize: excelBuffer.length,
          processingTime: 0,
          sheets: 1,
        },
      };
    } catch (error) {
      throw new Error(`CSV to Excel conversion failed: ${error}`);
    }
  }

  private async csvToWord(buffer: Buffer, options: ConversionOptions): Promise<ConversionResult> {
    try {
      const csvData = buffer.toString('utf-8');
      const lines = csvData.split('\n').filter(line => line.trim());
      
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun({
                text: 'CSV Data Conversion',
              })],
            }),
            new Table({
              rows: lines.slice(0, 20).map(line => {
                const cells = line.split(',');
                return new TableRow({
                  children: cells.map(cell => 
                    new TableCell({
                      children: [new Paragraph({ text: cell.trim().replace(/"/g, '') })],
                    })
                  ),
                });
              }),
            }),
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

  private async csvToPDF(buffer: Buffer, options: ConversionOptions): Promise<ConversionResult> {
    try {
      const csvData = buffer.toString('utf-8');
      
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const { height } = page.getSize();
      
      page.drawText(csvData.substring(0, 2000), {
        x: 50,
        y: height - 100,
        size: 10,
      });

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
