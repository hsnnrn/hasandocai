import * as mammoth from 'mammoth';
import { createClient } from '@supabase/supabase-js';

export interface DOCXTextSection {
  id: string;
  content: string;
  pageNumber?: number;
  sectionType?: string;
  metadata?: any;
}

export interface DOCXAICommentary {
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

export interface DOCXAnalysisResult {
  success: boolean;
  documentId?: string;
  title?: string;
  filename?: string;
  pageCount?: number;
  textSections?: DOCXTextSection[];
  aiCommentary?: DOCXAICommentary[];
  processingTime?: number;
  error?: string;
}

export class DOCXAnalysisService {
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
        
        console.log('DOCXAnalysisService: Using OAuth project:', selectedProject.name);
        console.log('DOCXAnalysisService: Supabase URL:', supabaseUrl);
        console.log('DOCXAnalysisService: Supabase Key present:', !!supabaseKey);
        
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.isInitialized = true;
      } else {
        // Fallback to environment variables or mock
        const supabaseUrl = process.env.SUPABASE_URL || 'https://nhkaadtyqppnmbymufky.supabase.co';
        const supabaseKey = process.env.SUPABASE_ANON_KEY || 'YOUR_REAL_SUPABASE_API_KEY_HERE';
        
        console.log('DOCXAnalysisService: No OAuth project selected, using fallback');
        console.log('DOCXAnalysisService: Supabase URL:', supabaseUrl);
        console.log('DOCXAnalysisService: Supabase Key present:', !!supabaseKey);
        
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.isInitialized = true;
      }
    } catch (error) {
      console.error('DOCXAnalysisService: Failed to initialize Supabase:', error);
      this.isInitialized = false;
    }
  }

  async analyzeDOCX(
    buffer: Buffer,
    filename: string,
    options?: {
      generateCommentary?: boolean;
      commentaryTypes?: string[];
      language?: string;
      userId?: string;
    }
  ): Promise<DOCXAnalysisResult> {
    const startTime = Date.now();
    
    try {
      console.log('DOCXAnalysisService: Starting DOCX analysis for:', filename);

      // Extract text from DOCX
      const textSections = await this.extractTextSections(buffer, filename);
      console.log('DOCXAnalysisService: Extracted', textSections.length, 'text sections');

      if (textSections.length === 0) {
        return {
          success: false,
          error: 'No text content found in DOCX file'
        };
      }

      // Save document to Supabase (mock for now)
      const documentId = await this.saveDocumentToSupabase(filename, textSections, options?.userId);
      console.log('DOCXAnalysisService: Mock document saved with ID:', documentId);

      // Save text sections to Supabase (mock for now)
      await this.saveTextSectionsToSupabase(documentId, textSections);
      console.log('DOCXAnalysisService: Mock saved', textSections.length, 'text sections');

      // Generate AI commentary if requested
      let aiCommentary: DOCXAICommentary[] = [];
      if (options?.generateCommentary) {
        aiCommentary = await this.generateMockAICommentary(
          filename,
          textSections,
          options.commentaryTypes || ['summary', 'key_points', 'analysis', 'insights'],
          options.language || 'tr'
        );
        console.log('DOCXAnalysisService: Generated', aiCommentary.length, 'mock AI commentary entries');
        
        // Save AI commentary to Supabase
        await this.saveAICommentaryToSupabase(documentId, aiCommentary);
      }

      // Generate mock embeddings
      console.log('DOCXAnalysisService: Mock embeddings generated');

      const processingTime = Date.now() - startTime;
      console.log('DOCXAnalysisService: Analysis completed in', processingTime + 'ms');

      return {
        success: true,
        documentId,
        title: filename.replace('.docx', ''),
        filename,
        pageCount: 1, // DOCX doesn't have pages like PDF
        textSections,
        aiCommentary,
        processingTime
      };

    } catch (error) {
      console.error('DOCXAnalysisService: Analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'DOCX analysis failed'
      };
    }
  }

  private async extractTextSections(buffer: Buffer, filename: string): Promise<DOCXTextSection[]> {
    try {
      console.log('DOCXAnalysisService: Extracting text from DOCX...');
      
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value;

      if (!text || text.trim().length === 0) {
        console.log('DOCXAnalysisService: No text content found');
        return [];
      }

      // Split text into sections (paragraphs)
      const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
      
      const sections: DOCXTextSection[] = paragraphs.map((paragraph, index) => ({
        id: `section_${Date.now()}_${index}`,
        content: paragraph.trim(),
        pageNumber: 1, // DOCX doesn't have pages
        sectionType: 'paragraph',
        metadata: {
          wordCount: paragraph.split(' ').length,
          characterCount: paragraph.length
        }
      }));

      console.log('DOCXAnalysisService: Extracted', sections.length, 'text sections');
      return sections;

    } catch (error) {
      console.error('DOCXAnalysisService: Text extraction failed:', error);
      throw new Error(`DOCX text extraction failed: ${error}`);
    }
  }

  private async saveDocumentToSupabase(
    filename: string,
    textSections: DOCXTextSection[],
    userId?: string
  ): Promise<string> {
    try {
      if (!this.supabase) {
        console.log('DOCXAnalysisService: No Supabase connection, using mock save');
        const mockDocumentId = `docx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('DOCXAnalysisService: Mock document ID generated:', mockDocumentId);
        return mockDocumentId;
      }

      console.log('DOCXAnalysisService: Saving document to Supabase:', {
        filename,
        sectionCount: textSections.length,
        userId
      });

      const { data, error } = await this.supabase
        .from('documents')
        .insert({
          filename,
          title: filename.replace(/\.[^/.]+$/, ''),
          file_type: 'docx',
          page_count: Math.max(...textSections.map(s => s.pageNumber || 1)),
          user_id: userId || 'anonymous',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.error('DOCXAnalysisService: Supabase document save failed:', error);
        throw new Error(`Document save failed: ${error.message}`);
      }

      console.log('DOCXAnalysisService: Document saved with ID:', data.id);
      return data.id;
    } catch (error) {
      console.error('DOCXAnalysisService: Document save failed:', error);
      // Fallback to mock save
      const mockDocumentId = `docx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('DOCXAnalysisService: Using fallback mock document ID:', mockDocumentId);
      return mockDocumentId;
    }
  }

  private async saveTextSectionsToSupabase(
    documentId: string,
    textSections: DOCXTextSection[]
  ): Promise<void> {
    try {
      if (!this.supabase) {
        console.log('DOCXAnalysisService: No Supabase connection, skipping text sections save');
        return;
      }

      console.log('DOCXAnalysisService: Saving text sections to Supabase:', {
        documentId,
        sectionCount: textSections.length
      });

      const sectionsToInsert = textSections.map((section, index) => ({
        id: section.id || `section_${documentId}_${index}_${Date.now()}`,
        document_id: documentId,
        page_number: section.pageNumber || 1,
        section_title: section.sectionType,
        content: section.content,
        content_type: 'paragraph',
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
        console.error('DOCXAnalysisService: Supabase text sections save failed:', error);
        throw new Error(`Text sections save failed: ${error.message}`);
      }

      console.log('DOCXAnalysisService: Text sections saved successfully');
    } catch (error) {
      console.error('DOCXAnalysisService: Text sections save failed:', error);
      console.log('DOCXAnalysisService: Continuing without text sections save');
    }
  }

  private async generateMockAICommentary(
    filename: string,
    textSections: DOCXTextSection[],
    commentaryTypes: string[],
    language: string
  ): Promise<DOCXAICommentary[]> {
    console.log('DOCXAnalysisService: Generating mock AI commentary...');

    const mockCommentary: DOCXAICommentary[] = [];

    // Mock summary
    if (commentaryTypes.includes('summary')) {
      mockCommentary.push({
        id: `commentary_${Date.now()}_1`,
        textSectionId: textSections[0]?.id || 'mock_section',
        documentId: `docx_${Date.now()}`,
        commentaryType: 'summary',
        content: `Bu "${filename}" dosyası için oluşturulan mock özet. Dosya ${textSections.length} metin bölümü içeriyor.`,
        language,
        confidenceScore: 0.95,
        aiModel: 'mock-ai',
        processingTimeMs: 100
      });
    }

    // Mock key points
    if (commentaryTypes.includes('key_points')) {
      mockCommentary.push({
        id: `commentary_${Date.now()}_2`,
        textSectionId: textSections[0]?.id || 'mock_section',
        documentId: `docx_${Date.now()}`,
        commentaryType: 'key_points',
        content: `Anahtar noktalar: ${textSections.slice(0, 3).map(s => s.content.substring(0, 50)).join(', ')}...`,
        language,
        confidenceScore: 0.90,
        aiModel: 'mock-ai',
        processingTimeMs: 150
      });
    }

    // Mock analysis
    if (commentaryTypes.includes('analysis')) {
      mockCommentary.push({
        id: `commentary_${Date.now()}_3`,
        textSectionId: textSections[0]?.id || 'mock_section',
        documentId: `docx_${Date.now()}`,
        commentaryType: 'analysis',
        content: `Doküman analizi: Bu DOCX dosyası ${textSections.length} paragraf içeriyor ve toplam ${textSections.reduce((acc, s) => acc + (s.metadata?.wordCount || 0), 0)} kelime bulunuyor.`,
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
    commentary: DOCXAICommentary[]
  ): Promise<void> {
    try {
      if (!this.supabase) {
        console.log('DOCXAnalysisService: No Supabase connection, skipping AI commentary save');
        return;
      }

      console.log('DOCXAnalysisService: Saving AI commentary to Supabase:', {
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
        console.error('DOCXAnalysisService: Supabase AI commentary save failed:', error);
        throw new Error(`AI commentary save failed: ${error.message}`);
      }

      console.log('DOCXAnalysisService: AI commentary saved successfully');
    } catch (error) {
      console.error('DOCXAnalysisService: AI commentary save failed:', error);
      console.log('DOCXAnalysisService: Continuing without AI commentary save');
    }
  }
}
