import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

export interface ExcelTextSection {
  id: string;
  content: string;
  sheetName?: string;
  sheetIndex?: number;
  cellAddress?: string;
  sectionType?: string;
  metadata?: any;
}

export interface ExcelAICommentary {
  id: string;
  textSectionId: string;
  documentId: string;
  commentaryType: string;
  content: string;
  language: string;
  confidenceScore: number;
  aiModel: string;
  processingTimeMs: number;
}

export interface ExcelAnalysisResult {
  success: boolean;
  documentId?: string;
  title?: string;
  filename?: string;
  sheetCount?: number;
  textSections?: ExcelTextSection[];
  aiCommentary?: ExcelAICommentary[];
  processingTime?: number;
  error?: string;
}

export class ExcelAnalysisService {
  private supabase: any;
  private isInitialized = false;

  constructor() {
    this.initializeSupabase();
  }

  private async initializeSupabase() {
    try {
      // OAuth flow'dan gelen seçili proje bilgilerini kullan
      const { getSelectedProject } = await import('../store');
      const selectedProject = await getSelectedProject();
      
      if (selectedProject && selectedProject.anon_key) {
        const supabaseUrl = `https://${selectedProject.ref}.supabase.co`;
        const supabaseKey = selectedProject.anon_key;
        
        console.log('ExcelAnalysisService: Using OAuth project:', selectedProject.name);
        console.log('ExcelAnalysisService: Supabase URL:', supabaseUrl);
        console.log('ExcelAnalysisService: Supabase Key present:', !!supabaseKey);
        
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.isInitialized = true;
      } else {
        // Fallback to environment variables or mock
        const supabaseUrl = process.env.SUPABASE_URL || 'https://nhkaadtyqppnmbymufky.supabase.co';
        const supabaseKey = process.env.SUPABASE_ANON_KEY || 'YOUR_REAL_SUPABASE_API_KEY_HERE';
        
        console.log('ExcelAnalysisService: No OAuth project selected, using fallback');
        console.log('ExcelAnalysisService: Supabase URL:', supabaseUrl);
        console.log('ExcelAnalysisService: Supabase Key present:', !!supabaseKey);
        
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.isInitialized = true;
      }
    } catch (error) {
      console.error('ExcelAnalysisService: Failed to initialize Supabase:', error);
      this.isInitialized = false;
    }
  }

  async analyzeExcel(
    buffer: Buffer,
    filename: string,
    options?: {
      generateCommentary?: boolean;
      commentaryTypes?: string[];
      language?: string;
      userId?: string;
    }
  ): Promise<ExcelAnalysisResult> {
    const startTime = Date.now();
    
    try {
      console.log('ExcelAnalysisService: Starting Excel analysis for:', filename);

      // Extract text from Excel
      const textSections = await this.extractTextSections(buffer, filename);
      console.log('ExcelAnalysisService: Extracted', textSections.length, 'text sections');

      if (textSections.length === 0) {
        return {
          success: false,
          error: 'No text content found in Excel file'
        };
      }

      // Save document to Supabase (mock for now)
      const documentId = await this.saveDocumentToSupabase(filename, textSections, options?.userId);
      console.log('ExcelAnalysisService: Mock document saved with ID:', documentId);

      // Save text sections to Supabase (mock for now)
      await this.saveTextSectionsToSupabase(documentId, textSections);
      console.log('ExcelAnalysisService: Mock saved', textSections.length, 'text sections');

      // Generate AI commentary if requested
      let aiCommentary: ExcelAICommentary[] = [];
      if (options?.generateCommentary) {
        aiCommentary = await this.generateMockAICommentary(
          filename,
          textSections,
          options.commentaryTypes || ['summary', 'key_points', 'analysis'],
          options.language || 'tr'
        );
        console.log('ExcelAnalysisService: Generated', aiCommentary.length, 'mock AI commentary entries');
        
        // Save AI commentary to Supabase
        await this.saveAICommentaryToSupabase(documentId, aiCommentary);
      }

      // Generate mock embeddings
      console.log('ExcelAnalysisService: Mock embeddings generated');

      const processingTime = Date.now() - startTime;
      console.log('ExcelAnalysisService: Analysis completed in', processingTime + 'ms');

      return {
        success: true,
        documentId,
        title: filename.replace(/\.(xlsx|xls)$/, ''),
        filename,
        sheetCount: this.getSheetCount(textSections),
        textSections,
        aiCommentary,
        processingTime
      };

    } catch (error) {
      console.error('ExcelAnalysisService: Analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Excel analysis failed'
      };
    }
  }

  private async extractTextSections(buffer: Buffer, filename: string): Promise<ExcelTextSection[]> {
    try {
      console.log('ExcelAnalysisService: Extracting text from Excel...');
      
      // Read Excel file
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sections: ExcelTextSection[] = [];

      // Process each sheet
      workbook.SheetNames.forEach((sheetName, sheetIndex) => {
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert sheet to JSON to get all data
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Process each row
        jsonData.forEach((row: unknown, rowIndex: number) => {
          if (Array.isArray(row)) {
            row.forEach((cell: any, colIndex: number) => {
              if (cell && typeof cell === 'string' && cell.trim().length > 0) {
                const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
                
                sections.push({
                  id: `excel_${Date.now()}_${sheetIndex}_${rowIndex}_${colIndex}`,
                  content: cell.trim(),
                  sheetName,
                  cellAddress,
                  sectionType: this.determineCellType(cell, rowIndex, colIndex),
                  metadata: {
                    sheetIndex,
                    rowIndex,
                    colIndex,
                    cellAddress,
                    characterCount: cell.length,
                    wordCount: cell.split(' ').length
                  }
                });
              }
            });
          }
        });
      });

      console.log('ExcelAnalysisService: Extracted', sections.length, 'text sections from', workbook.SheetNames.length, 'sheets');
      return sections;

    } catch (error) {
      console.error('ExcelAnalysisService: Text extraction failed:', error);
      throw new Error(`Excel text extraction failed: ${error}`);
    }
  }

  private determineCellType(content: string, rowIndex: number, colIndex: number): string {
    // Determine cell type based on content and position
    if (rowIndex === 0) {
      return 'header';
    } else if (content.match(/^\d+$/)) {
      return 'number';
    } else if (content.match(/^\d+\.\d+$/)) {
      return 'decimal';
    } else if (content.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return 'date';
    } else if (content.match(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/)) {
      return 'email';
    } else if (content.match(/^https?:\/\/.+/)) {
      return 'url';
    } else {
      return 'text';
    }
  }

  private getSheetCount(textSections: ExcelTextSection[]): number {
    const uniqueSheets = new Set(textSections.map(section => section.sheetName));
    return uniqueSheets.size;
  }

  private async saveDocumentToSupabase(
    filename: string,
    textSections: ExcelTextSection[],
    userId?: string
  ): Promise<string> {
    try {
      if (!this.supabase) {
        console.log('ExcelAnalysisService: No Supabase connection, using mock save');
        const mockDocumentId = `excel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('ExcelAnalysisService: Mock document ID generated:', mockDocumentId);
        return mockDocumentId;
      }

      console.log('ExcelAnalysisService: Saving document to Supabase:', {
        filename,
        sectionCount: textSections.length,
        userId
      });

      const { data, error } = await this.supabase
        .from('documents')
        .insert({
          filename,
          title: filename.replace(/\.[^/.]+$/, ''),
          file_type: 'excel',
          page_count: Math.max(...textSections.map(s => s.sheetIndex || 1)),
          user_id: userId || 'anonymous',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.error('ExcelAnalysisService: Supabase document save failed:', error);
        throw new Error(`Document save failed: ${error.message}`);
      }

      console.log('ExcelAnalysisService: Document saved with ID:', data.id);
      return data.id;
    } catch (error) {
      console.error('ExcelAnalysisService: Document save failed:', error);
      // Fallback to mock save
      const mockDocumentId = `excel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('ExcelAnalysisService: Using fallback mock document ID:', mockDocumentId);
      return mockDocumentId;
    }
  }

  private async saveTextSectionsToSupabase(
    documentId: string,
    textSections: ExcelTextSection[]
  ): Promise<void> {
    try {
      if (!this.supabase) {
        console.log('ExcelAnalysisService: No Supabase connection, skipping text sections save');
        return;
      }

      console.log('ExcelAnalysisService: Saving text sections to Supabase:', {
        documentId,
        sectionCount: textSections.length
      });

      const sectionsToInsert = textSections.map((section, index) => ({
        id: section.id || `section_${documentId}_${index}_${Date.now()}`,
        document_id: documentId,
        page_number: section.sheetIndex || 1,
        section_title: section.sheetName,
        content: section.content,
        content_type: section.sectionType || 'cell',
        position_x: 0,
        position_y: 0,
        font_size: 12,
        font_family: 'Arial',
        is_bold: false,
        is_italic: false,
        color: '#000000',
        order_index: index,
        created_at: new Date().toISOString()
      }));

      const { error } = await this.supabase
        .from('text_sections')
        .insert(sectionsToInsert);

      if (error) {
        console.error('ExcelAnalysisService: Supabase text sections save failed:', error);
        throw new Error(`Text sections save failed: ${error.message}`);
      }

      console.log('ExcelAnalysisService: Text sections saved successfully');
    } catch (error) {
      console.error('ExcelAnalysisService: Text sections save failed:', error);
      console.log('ExcelAnalysisService: Continuing without text sections save');
    }
  }

  private async generateMockAICommentary(
    filename: string,
    textSections: ExcelTextSection[],
    commentaryTypes: string[],
    language: string
  ): Promise<ExcelAICommentary[]> {
    console.log('ExcelAnalysisService: Generating mock AI commentary...');

    const mockCommentary: ExcelAICommentary[] = [];

    // Mock summary
    if (commentaryTypes.includes('summary')) {
      mockCommentary.push({
        id: `commentary_${Date.now()}_1`,
        textSectionId: textSections[0]?.id || 'mock_section',
        documentId: `excel_${Date.now()}`,
        commentaryType: 'summary',
        content: `Bu "${filename}" Excel dosyası için oluşturulan mock özet. Dosya ${textSections.length} hücre içeriyor ve ${this.getSheetCount(textSections)} sayfa bulunuyor.`,
        language,
        confidenceScore: 0.95,
        aiModel: 'mock-ai',
        processingTimeMs: 100
      });
    }

    // Mock key points
    if (commentaryTypes.includes('key_points')) {
      const headerCells = textSections.filter(s => s.sectionType === 'header').slice(0, 5);
      mockCommentary.push({
        id: `commentary_${Date.now()}_2`,
        textSectionId: textSections[0]?.id || 'mock_section',
        documentId: `excel_${Date.now()}`,
        commentaryType: 'key_points',
        content: `Anahtar sütunlar: ${headerCells.map(s => s.content).join(', ')}`,
        language,
        confidenceScore: 0.90,
        aiModel: 'mock-ai',
        processingTimeMs: 150
      });
    }

    // Mock analysis
    if (commentaryTypes.includes('analysis')) {
      const numericCells = textSections.filter(s => s.sectionType === 'number' || s.sectionType === 'decimal');
      mockCommentary.push({
        id: `commentary_${Date.now()}_3`,
        textSectionId: textSections[0]?.id || 'mock_section',
        documentId: `excel_${Date.now()}`,
        commentaryType: 'analysis',
        content: `Excel analizi: Bu dosya ${textSections.length} hücre içeriyor, ${numericCells.length} sayısal veri bulunuyor ve ${this.getSheetCount(textSections)} sayfa var.`,
        language,
        confidenceScore: 0.88,
        aiModel: 'mock-ai',
        processingTimeMs: 200
      });
    }

    return mockCommentary;
  }

  private async saveAICommentaryToSupabase(
    documentId: string,
    commentary: ExcelAICommentary[]
  ): Promise<void> {
    try {
      if (!this.supabase) {
        console.log('ExcelAnalysisService: No Supabase connection, skipping AI commentary save');
        return;
      }

      console.log('ExcelAnalysisService: Saving AI commentary to Supabase:', {
        documentId,
        commentaryCount: commentary.length
      });

      const commentaryToInsert = commentary.map(comment => ({
        id: comment.id,
        text_section_id: comment.textSectionId,
        document_id: documentId,
        commentary_type: comment.commentaryType,
        content: comment.content,
        confidence_score: comment.confidenceScore,
        language: comment.language,
        ai_model: comment.aiModel,
        processing_time_ms: comment.processingTimeMs,
        created_at: new Date().toISOString()
      }));

      const { error } = await this.supabase
        .from('ai_commentary')
        .insert(commentaryToInsert);

      if (error) {
        console.error('ExcelAnalysisService: Supabase AI commentary save failed:', error);
        throw new Error(`AI commentary save failed: ${error.message}`);
      }

      console.log('ExcelAnalysisService: AI commentary saved successfully');
    } catch (error) {
      console.error('ExcelAnalysisService: AI commentary save failed:', error);
      console.log('ExcelAnalysisService: Continuing without AI commentary save');
    }
  }
}
