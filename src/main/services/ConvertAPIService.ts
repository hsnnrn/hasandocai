import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';
import ConvertAPI from 'convertapi';

export interface ConvertAPIResult {
  success: boolean;
  buffer?: Buffer;
  outputPath?: string;
  autoSavePath?: string;
  error?: string;
  metadata?: {
    originalSize: number;
    outputSize: number;
    processingTime: number;
    pages?: number;
  };
}

export interface JWTTokenRequest {
  Kid: string;
  ExpiresInSec: number;
  ClientIp: string;
}

export interface JWTTokenResponse {
  token: string;
  expires: number;
}

export class ConvertAPIService {
  private tempDir: string;
  private apiKey: string;
  private jwtToken: string | null = null;
  private jwtExpires: number = 0;

  constructor(apiKey: string) {
    this.tempDir = path.join(process.cwd(), 'temp');
    this.apiKey = apiKey;
    this.ensureTempDir();
  }

  /**
   * Get auto-save directory path
   */
  private getAutoSavePath(): string {
    return path.join(homedir(), 'Documents', 'DocData');
  }

  /**
   * Ensure DocData directory exists
   */
  private async ensureDocDataDirectory(): Promise<void> {
    const docDataPath = this.getAutoSavePath();
    try {
      await fs.mkdir(docDataPath, { recursive: true });
      console.log('DocData directory ensured:', docDataPath);
    } catch (error) {
      console.error('Failed to create DocData directory:', error);
    }
  }

  /**
   * Auto-save converted file to specified directory
   */
  private async autoSaveFile(outputPath: string, originalFileName: string, outputDirectory?: string): Promise<string> {
    try {
      const savePath = outputDirectory || this.getAutoSavePath();
      await this.ensureDirectory(savePath);
      
      const nameWithoutExt = path.parse(originalFileName).name;
      const outputExt = path.extname(outputPath);
      const autoSavePath = path.join(savePath, `${nameWithoutExt}_converted${outputExt}`);
      
      // Copy the converted file to specified directory
      const convertedFileBuffer = await fs.readFile(outputPath);
      await fs.writeFile(autoSavePath, convertedFileBuffer);
      
      console.log('File auto-saved to:', autoSavePath);
      return autoSavePath;
    } catch (error) {
      console.error('Auto-save failed:', error);
      throw error;
    }
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      console.log('Directory ensured:', dirPath);
    } catch (error) {
      console.error('Failed to create directory:', error);
    }
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  /**
   * Generate JWT token for ConvertAPI
   */
  async generateJWTToken(request: JWTTokenRequest): Promise<JWTTokenResponse> {
    try {
      console.log('🔐 Generating JWT token for ConvertAPI...');
      
      const response = await fetch('https://v2.convertapi.com/token/jwt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request)
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ JWT token generation failed:', data);
        throw new Error(`JWT token generation failed: ${data.error || 'Unknown error'}`);
      }

      this.jwtToken = data.token;
      this.jwtExpires = Date.now() + (request.ExpiresInSec * 1000);
      
      console.log('✅ JWT token generated successfully');
      return {
        token: data.token,
        expires: this.jwtExpires
      };
    } catch (error) {
      console.error('❌ JWT token generation error:', error);
      throw new Error('Failed to generate JWT token for ConvertAPI');
    }
  }

  /**
   * Get valid JWT token (generate if needed)
   */
  private async getValidJWTToken(): Promise<string> {
    if (this.jwtToken && Date.now() < this.jwtExpires) {
      return this.jwtToken;
    }

    // Generate new token with default settings
    const tokenRequest: JWTTokenRequest = {
      Kid: '1fbde8c8-df21-457d-8b8a-3e24ee42a823',
      ExpiresInSec: 3600,
      ClientIp: 'localhost,197.0.0.1'
    };

    const response = await this.generateJWTToken(tokenRequest);
    return response.token;
  }

  /**
   * Convert PDF to DOCX using ConvertAPI
   */
  async convertPDFToDOCX(pdfBuffer: Buffer, originalFileName?: string, outputDirectory?: string): Promise<ConvertAPIResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔄 Starting PDF to DOCX conversion with ConvertAPI...');
      
      // Initialize ConvertAPI with API key
      const convertApi = new ConvertAPI(this.apiKey);
      
      // Save PDF buffer to temporary file
      const tempPdfPath = path.join(this.tempDir, `temp_${Date.now()}.pdf`);
      await fs.writeFile(tempPdfPath, pdfBuffer);
      
      // Convert PDF to DOCX
      const result = await convertApi.convert('docx', { File: tempPdfPath });
      
      // Save the converted file
      const outputPath = path.join(this.tempDir, `output_${Date.now()}.docx`);
      await result.file.save(outputPath);
      
      // Read the converted file as buffer
      const resultBuffer = await fs.readFile(outputPath);
      
      // Auto-save is handled in main.ts
      
      // Clean up temporary files
      await fs.unlink(tempPdfPath);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ PDF to DOCX conversion successful, processing time: ${processingTime}ms`);
      
      return {
        success: true,
        buffer: resultBuffer,
        outputPath: outputPath,
        metadata: {
          originalSize: pdfBuffer.length,
          outputSize: resultBuffer.length,
          processingTime,
          pages: 1,
        },
      };
      
    } catch (error) {
      console.error('❌ PDF to DOCX conversion failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF to DOCX conversion failed',
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
   * Convert PDF to JPG using ConvertAPI
   */
  async convertPDFToJPG(pdfBuffer: Buffer, originalFileName?: string, outputDirectory?: string): Promise<ConvertAPIResult> {
    const startTime = Date.now();
    
    try {
      console.log('🖼️ Starting PDF to JPG conversion with ConvertAPI...');
      
      // Initialize ConvertAPI with API key
      const convertApi = new ConvertAPI(this.apiKey);
      
      // Save PDF buffer to temporary file
      const tempPdfPath = path.join(this.tempDir, `temp_${Date.now()}.pdf`);
      await fs.writeFile(tempPdfPath, pdfBuffer);
      
      // Convert PDF to JPG
      const result = await convertApi.convert('jpg', { File: tempPdfPath });
      
      // Save the converted file
      const outputPath = path.join(this.tempDir, `output_${Date.now()}.zip`);
      await result.file.save(outputPath);
      
      // Read the converted file as buffer
      const resultBuffer = await fs.readFile(outputPath);
      
      // Auto-save is handled in main.ts
      
      // Clean up temporary files
      await fs.unlink(tempPdfPath);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ PDF to JPG conversion successful, processing time: ${processingTime}ms`);
      
      return {
        success: true,
        buffer: resultBuffer,
        outputPath: outputPath,
        metadata: {
          originalSize: pdfBuffer.length,
          outputSize: resultBuffer.length,
          processingTime,
          pages: 1,
        },
      };
      
    } catch (error) {
      console.error('❌ PDF to JPG conversion failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF to JPG conversion failed',
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
   * Convert DOCX to PDF using ConvertAPI
   */
  async convertDOCXToPDF(docxBuffer: Buffer): Promise<ConvertAPIResult> {
    const startTime = Date.now();
    
    try {
      console.log('📄 Starting DOCX to PDF conversion with ConvertAPI...');
      
      // Initialize ConvertAPI with API key
      const convertApi = new ConvertAPI(this.apiKey);
      
      // Save DOCX buffer to temporary file
      const tempDocxPath = path.join(this.tempDir, `temp_${Date.now()}.docx`);
      await fs.writeFile(tempDocxPath, docxBuffer);
      
      // Convert DOCX to PDF
      const result = await convertApi.convert('pdf', { File: tempDocxPath });
      
      // Save the converted file
      const outputPath = path.join(this.tempDir, `output_${Date.now()}.pdf`);
      await result.file.save(outputPath);
      
      // Read the converted file as buffer
      const resultBuffer = await fs.readFile(outputPath);
      
      // Clean up temporary files
      await fs.unlink(tempDocxPath);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ DOCX to PDF conversion successful, processing time: ${processingTime}ms`);
      
      return {
        success: true,
        buffer: resultBuffer,
        outputPath: outputPath,
        metadata: {
          originalSize: docxBuffer.length,
          outputSize: resultBuffer.length,
          processingTime,
          pages: 1,
        },
      };
      
    } catch (error) {
      console.error('❌ DOCX to PDF conversion failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'DOCX to PDF conversion failed',
        metadata: {
          originalSize: docxBuffer.length,
          outputSize: 0,
          processingTime: Date.now() - startTime,
          pages: 0,
        },
      };
    }
  }

  /**
   * Convert JPG to PDF using ConvertAPI
   */
  async convertJPGToPDF(jpgBuffer: Buffer, originalFileName?: string, outputDirectory?: string): Promise<ConvertAPIResult> {
    const startTime = Date.now();
    
    try {
      console.log('📄 Starting JPG to PDF conversion with ConvertAPI...');
      
      // Initialize ConvertAPI with API key
      const convertApi = new ConvertAPI(this.apiKey);
      
      // Save JPG buffer to temporary file
      const tempJpgPath = path.join(this.tempDir, `temp_${Date.now()}.jpg`);
      await fs.writeFile(tempJpgPath, jpgBuffer);
      
      // Convert JPG to PDF
      const result = await convertApi.convert('pdf', { File: tempJpgPath });
      
      // Save the converted file
      const outputPath = path.join(this.tempDir, `output_${Date.now()}.pdf`);
      await result.file.save(outputPath);
      
      // Read the converted file as buffer
      const resultBuffer = await fs.readFile(outputPath);
      
      // Auto-save is handled in main.ts
      
      // Clean up temporary files
      await fs.unlink(tempJpgPath);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ JPG to PDF conversion successful, processing time: ${processingTime}ms`);
      
      return {
        success: true,
        buffer: resultBuffer,
        outputPath: outputPath,
        metadata: {
          originalSize: jpgBuffer.length,
          outputSize: resultBuffer.length,
          processingTime,
          pages: 1,
        },
      };
      
    } catch (error) {
      console.error('❌ JPG to PDF conversion failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'JPG to PDF conversion failed',
        metadata: {
          originalSize: jpgBuffer.length,
          outputSize: 0,
          processingTime: Date.now() - startTime,
          pages: 0,
        },
      };
    }
  }

  /**
   * Compress PDF using ConvertAPI
   */
  async compressPDF(pdfBuffer: Buffer, compressionLevel: 'low' | 'medium' | 'high' = 'medium'): Promise<ConvertAPIResult> {
    const startTime = Date.now();
    
    try {
      console.log('🗜️ Starting PDF compression with ConvertAPI...');
      
      // Initialize ConvertAPI with API key
      const convertApi = new ConvertAPI(this.apiKey);
      
      // Save PDF buffer to temporary file
      const tempPdfPath = path.join(this.tempDir, `temp_${Date.now()}.pdf`);
      await fs.writeFile(tempPdfPath, pdfBuffer);
      
      // Convert PDF with compression
      const result = await convertApi.convert('pdf', { 
        File: tempPdfPath,
        CompressionLevel: compressionLevel === 'high' ? 3 : compressionLevel === 'medium' ? 2 : 1
      });
      
      // Save the converted file
      const outputPath = path.join(this.tempDir, `output_${Date.now()}.pdf`);
      await result.file.save(outputPath);
      
      // Read the converted file as buffer
      const resultBuffer = await fs.readFile(outputPath);
      
      // Clean up temporary files
      await fs.unlink(tempPdfPath);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ PDF compression successful, processing time: ${processingTime}ms`);
      
      return {
        success: true,
        buffer: resultBuffer,
        outputPath: outputPath,
        metadata: {
          originalSize: pdfBuffer.length,
          outputSize: resultBuffer.length,
          processingTime,
          pages: 1,
        },
      };
      
    } catch (error) {
      console.error('❌ PDF compression failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF compression failed',
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
   * OCR: Extract text from PDF using optical character recognition
   */
  async extractTextFromPDF(pdfBuffer: Buffer): Promise<ConvertAPIResult> {
    const startTime = Date.now();
    try {
      console.log('🔄 Starting PDF OCR text extraction with ConvertAPI...');
      const convertApi = new ConvertAPI(this.apiKey);
      const tempInputPath = path.join(this.tempDir, `temp_${Date.now()}.pdf`);
      await fs.writeFile(tempInputPath, pdfBuffer);
      
      const result = await convertApi.convert('txt', { 
        File: tempInputPath,
        OcrEngine: '2' // Use OCR engine
      });
      
      const outputPath = path.join(this.tempDir, `output_${Date.now()}.txt`);
      await result.file.save(outputPath);
      const resultBuffer = await fs.readFile(outputPath);
      await fs.unlink(tempInputPath);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ PDF OCR text extraction successful, processing time: ${processingTime}ms`);
      
      return {
        success: true,
        buffer: resultBuffer,
        outputPath: outputPath,
        metadata: {
          originalSize: pdfBuffer.length,
          outputSize: resultBuffer.length,
          processingTime,
          pages: 1,
        },
      };
    } catch (error) {
      console.error('❌ PDF OCR text extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF OCR text extraction failed',
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
   * OCR: Extract text from image using optical character recognition
   */
  async extractTextFromImage(imageBuffer: Buffer, imageFormat: string = 'jpg'): Promise<ConvertAPIResult> {
    const startTime = Date.now();
    try {
      console.log(`🔄 Starting ${imageFormat.toUpperCase()} OCR text extraction with ConvertAPI...`);
      const convertApi = new ConvertAPI(this.apiKey);
      const tempInputPath = path.join(this.tempDir, `temp_${Date.now()}.${imageFormat}`);
      await fs.writeFile(tempInputPath, imageBuffer);
      
      const result = await convertApi.convert('txt', { 
        File: tempInputPath,
        OcrEngine: '2' // Use OCR engine
      });
      
      const outputPath = path.join(this.tempDir, `output_${Date.now()}.txt`);
      await result.file.save(outputPath);
      const resultBuffer = await fs.readFile(outputPath);
      await fs.unlink(tempInputPath);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ ${imageFormat.toUpperCase()} OCR text extraction successful, processing time: ${processingTime}ms`);
      
      return {
        success: true,
        buffer: resultBuffer,
        outputPath: outputPath,
        metadata: {
          originalSize: imageBuffer.length,
          outputSize: resultBuffer.length,
          processingTime,
          pages: 1,
        },
      };
    } catch (error) {
      console.error(`❌ ${imageFormat.toUpperCase()} OCR text extraction failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : `${imageFormat.toUpperCase()} OCR text extraction failed`,
        metadata: {
          originalSize: imageBuffer.length,
          outputSize: 0,
          processingTime: Date.now() - startTime,
          pages: 0,
        },
      };
    }
  }

  /**
   * OCR: Make scanned PDF searchable with OCR
   */
  async makePDFSearchable(pdfBuffer: Buffer): Promise<ConvertAPIResult> {
    const startTime = Date.now();
    try {
      console.log('🔄 Starting PDF OCR searchable conversion with ConvertAPI...');
      const convertApi = new ConvertAPI(this.apiKey);
      const tempInputPath = path.join(this.tempDir, `temp_${Date.now()}.pdf`);
      await fs.writeFile(tempInputPath, pdfBuffer);
      
      const result = await convertApi.convert('pdf', { 
        File: tempInputPath,
        OcrEngine: '2' // Use OCR engine
      });
      
      const outputPath = path.join(this.tempDir, `output_${Date.now()}.pdf`);
      await result.file.save(outputPath);
      const resultBuffer = await fs.readFile(outputPath);
      await fs.unlink(tempInputPath);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ PDF OCR searchable conversion successful, processing time: ${processingTime}ms`);
      
      return {
        success: true,
        buffer: resultBuffer,
        outputPath: outputPath,
        metadata: {
          originalSize: pdfBuffer.length,
          outputSize: resultBuffer.length,
          processingTime,
          pages: 1,
        },
      };
    } catch (error) {
      console.error('❌ PDF OCR searchable conversion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF OCR searchable conversion failed',
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
   * Generic conversion method for any format
   */
  async convertFile(inputBuffer: Buffer, fromFormat: string, toFormat: string, options?: any): Promise<ConvertAPIResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Starting ${fromFormat.toUpperCase()} to ${toFormat.toUpperCase()} conversion with ConvertAPI...`);
      
      // Initialize ConvertAPI with API key
      const convertApi = new ConvertAPI(this.apiKey);
      
      // Save input buffer to temporary file
      const tempInputPath = path.join(this.tempDir, `temp_${Date.now()}.${fromFormat}`);
      await fs.writeFile(tempInputPath, inputBuffer);
      
      // Convert file
      const result = await convertApi.convert(toFormat, { 
        File: tempInputPath,
        ...options
      });
      
      // Save the converted file
      const outputPath = path.join(this.tempDir, `output_${Date.now()}.${toFormat}`);
      await result.file.save(outputPath);
      
      // Read the converted file as buffer
      const resultBuffer = await fs.readFile(outputPath);
      
      // Clean up temporary files
      await fs.unlink(tempInputPath);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ ${fromFormat.toUpperCase()} to ${toFormat.toUpperCase()} conversion successful, processing time: ${processingTime}ms`);
      
      return {
        success: true,
        buffer: resultBuffer,
        outputPath: outputPath,
        metadata: {
          originalSize: inputBuffer.length,
          outputSize: resultBuffer.length,
          processingTime,
          pages: 1,
        },
      };
      
    } catch (error) {
      console.error(`❌ ${fromFormat.toUpperCase()} to ${toFormat.toUpperCase()} conversion failed:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : `${fromFormat.toUpperCase()} to ${toFormat.toUpperCase()} conversion failed`,
        metadata: {
          originalSize: inputBuffer.length,
          outputSize: 0,
          processingTime: Date.now() - startTime,
          pages: 0,
        },
      };
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
      console.error('❌ Cleanup error:', error);
    }
  }
}