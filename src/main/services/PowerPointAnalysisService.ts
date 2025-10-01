import { createClient } from '@supabase/supabase-js';

export interface PowerPointTextSection {
  id: string;
  content: string;
  slideNumber?: number;
  slideTitle?: string;
  sectionType?: string;
  metadata?: any;
}

export interface PowerPointAICommentary {
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

export interface PowerPointAnalysisResult {
  success: boolean;
  documentId?: string;
  title?: string;
  filename?: string;
  slideCount?: number;
  textSections?: PowerPointTextSection[];
  aiCommentary?: PowerPointAICommentary[];
  processingTime?: number;
  error?: string;
}

export class PowerPointAnalysisService {
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
        
        console.log('PowerPointAnalysisService: Using OAuth project:', selectedProject.name);
        console.log('PowerPointAnalysisService: Supabase URL:', supabaseUrl);
        console.log('PowerPointAnalysisService: Supabase Key present:', !!supabaseKey);
        
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.isInitialized = true;
      } else {
        // Fallback to environment variables or mock
        const supabaseUrl = process.env.SUPABASE_URL || 'https://jgrpcefpovpqovavqyfp.supabase.co';
        const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpncnBjZWZwb3ZwcW92YXZxeWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTQxMjMsImV4cCI6MjA3NDM5MDEyM30.wGIb2wtVL0ZaFOtqPy3n7WTYq4MxY3EgVwMEGdiCvQo';
        
        console.log('PowerPointAnalysisService: No OAuth project selected, using fallback');
        console.log('PowerPointAnalysisService: Supabase URL:', supabaseUrl);
        console.log('PowerPointAnalysisService: Supabase Key present:', !!supabaseKey);
        
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.isInitialized = true;
      }
    } catch (error) {
      console.error('PowerPointAnalysisService: Failed to initialize Supabase:', error);
      this.isInitialized = false;
    }
  }

  async analyzePowerPoint(
    buffer: Buffer,
    filename: string,
    options?: {
      generateCommentary?: boolean;
      commentaryTypes?: string[];
      language?: string;
      userId?: string;
    }
  ): Promise<PowerPointAnalysisResult> {
    const startTime = Date.now();
    
    try {
      console.log('PowerPointAnalysisService: Starting PowerPoint analysis for:', filename);

      // Extract text from PowerPoint (mock for now - would need a proper PPTX parser)
      const textSections = await this.extractTextSections(buffer, filename);
      console.log('PowerPointAnalysisService: Extracted', textSections.length, 'text sections');

      if (textSections.length === 0) {
        return {
          success: false,
          error: 'No text content found in PowerPoint file'
        };
      }

      // Save document to Supabase (mock for now)
      const documentId = await this.saveDocumentToSupabase(filename, textSections, options?.userId);
      console.log('PowerPointAnalysisService: Mock document saved with ID:', documentId);

      // Save text sections to Supabase (mock for now)
      await this.saveTextSectionsToSupabase(documentId, textSections);
      console.log('PowerPointAnalysisService: Mock saved', textSections.length, 'text sections');

      // Generate AI commentary if requested
      let aiCommentary: PowerPointAICommentary[] = [];
      if (options?.generateCommentary) {
        aiCommentary = await this.generateMockAICommentary(
          filename,
          textSections,
          options.commentaryTypes || ['summary', 'key_points', 'analysis'],
          options.language || 'tr'
        );
        console.log('PowerPointAnalysisService: Generated', aiCommentary.length, 'mock AI commentary entries');
        
        // Save AI commentary to Supabase
        await this.saveAICommentaryToSupabase(documentId, aiCommentary);
      }

      // Generate mock embeddings
      console.log('PowerPointAnalysisService: Mock embeddings generated');

      const processingTime = Date.now() - startTime;
      console.log('PowerPointAnalysisService: Analysis completed in', processingTime + 'ms');

      return {
        success: true,
        documentId,
        title: filename.replace(/\.(pptx|ppt)$/, ''),
        filename,
        slideCount: this.getSlideCount(textSections),
        textSections,
        aiCommentary,
        processingTime
      };

    } catch (error) {
      console.error('PowerPointAnalysisService: Analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PowerPoint analysis failed'
      };
    }
  }

  private async extractTextSections(buffer: Buffer, filename: string): Promise<PowerPointTextSection[]> {
    try {
      console.log('PowerPointAnalysisService: Extracting text from PowerPoint...');
      
      // Mock text extraction - in real implementation, would use a PPTX parser
      // For now, create mock slides with sample content
      const mockSlides = this.generateMockSlides(filename);
      
      console.log('PowerPointAnalysisService: Extracted', mockSlides.length, 'text sections from', this.getSlideCount(mockSlides), 'slides');
      return mockSlides;

    } catch (error) {
      console.error('PowerPointAnalysisService: Text extraction failed:', error);
      throw new Error(`PowerPoint text extraction failed: ${error}`);
    }
  }

  private generateMockSlides(filename: string): PowerPointTextSection[] {
    const slides: PowerPointTextSection[] = [];
    const slideCount = Math.floor(Math.random() * 10) + 5; // 5-15 slides

    for (let i = 1; i <= slideCount; i++) {
      // Title slide
      slides.push({
        id: `slide_${Date.now()}_${i}_title`,
        content: `Slide ${i} - ${filename.replace(/\.(pptx|ppt)$/, '')}`,
        slideNumber: i,
        sectionType: 'title',
        metadata: {
          slideIndex: i,
          characterCount: 50,
          wordCount: 10
        }
      });

      // Content slides
      const contentTypes = ['bullet_point', 'paragraph', 'heading'];
      const contentCount = Math.floor(Math.random() * 5) + 2; // 2-6 content items per slide

      for (let j = 0; j < contentCount; j++) {
        const contentType = contentTypes[j % contentTypes.length];
        const content = this.generateMockContent(contentType, i, j);
        
        slides.push({
          id: `slide_${Date.now()}_${i}_${j}`,
          content,
          slideNumber: i,
          sectionType: contentType,
          metadata: {
            slideIndex: i,
            contentIndex: j,
            characterCount: content.length,
            wordCount: content.split(' ').length
          }
        });
      }
    }

    return slides;
  }

  private generateMockContent(type: string, slideNumber: number, contentIndex: number): string {
    const contentTemplates = {
      title: `Slide ${slideNumber} Başlığı`,
      heading: `Başlık ${contentIndex + 1}`,
      bullet_point: `• Madde ${contentIndex + 1}: Önemli bilgi`,
      paragraph: `Bu slide ${slideNumber} için oluşturulan örnek paragraf metni. Bu metin PowerPoint analizi için kullanılmaktadır.`
    };

    return contentTemplates[type as keyof typeof contentTemplates] || `İçerik ${contentIndex + 1}`;
  }

  private getSlideCount(textSections: PowerPointTextSection[]): number {
    const uniqueSlides = new Set(textSections.map(section => section.slideNumber));
    return uniqueSlides.size;
  }

  private async saveDocumentToSupabase(
    filename: string,
    textSections: PowerPointTextSection[],
    userId?: string
  ): Promise<string> {
    try {
      if (!this.supabase) {
        console.log('PowerPointAnalysisService: No Supabase connection, using mock save');
        const mockDocumentId = `pptx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('PowerPointAnalysisService: Mock document ID generated:', mockDocumentId);
        return mockDocumentId;
      }

      console.log('PowerPointAnalysisService: Saving document to Supabase:', {
        filename,
        sectionCount: textSections.length,
        userId
      });

      const { data, error } = await this.supabase
        .from('documents')
        .insert({
          filename,
          title: filename.replace(/\.[^/.]+$/, ''),
          file_type: 'powerpoint',
          page_count: Math.max(...textSections.map(s => s.slideNumber || 1)),
          user_id: userId || 'anonymous',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.error('PowerPointAnalysisService: Supabase document save failed:', error);
        throw new Error(`Document save failed: ${error.message}`);
      }

      console.log('PowerPointAnalysisService: Document saved with ID:', data.id);
      return data.id;
    } catch (error) {
      console.error('PowerPointAnalysisService: Document save failed:', error);
      // Fallback to mock save
      const mockDocumentId = `pptx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('PowerPointAnalysisService: Using fallback mock document ID:', mockDocumentId);
      return mockDocumentId;
    }
  }

  private async saveTextSectionsToSupabase(
    documentId: string,
    textSections: PowerPointTextSection[]
  ): Promise<void> {
    try {
      if (!this.supabase) {
        console.log('PowerPointAnalysisService: No Supabase connection, skipping text sections save');
        return;
      }

      console.log('PowerPointAnalysisService: Saving text sections to Supabase:', {
        documentId,
        sectionCount: textSections.length
      });

      const sectionsToInsert = textSections.map((section, index) => ({
        id: section.id || `section_${documentId}_${index}_${Date.now()}`,
        document_id: documentId,
        page_number: section.slideNumber || 1,
        section_title: section.slideTitle,
        content: section.content,
        content_type: section.sectionType || 'slide',
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
        console.error('PowerPointAnalysisService: Supabase text sections save failed:', error);
        throw new Error(`Text sections save failed: ${error.message}`);
      }

      console.log('PowerPointAnalysisService: Text sections saved successfully');
    } catch (error) {
      console.error('PowerPointAnalysisService: Text sections save failed:', error);
      console.log('PowerPointAnalysisService: Continuing without text sections save');
    }
  }

  private async generateMockAICommentary(
    filename: string,
    textSections: PowerPointTextSection[],
    commentaryTypes: string[],
    language: string
  ): Promise<PowerPointAICommentary[]> {
    console.log('PowerPointAnalysisService: Generating mock AI commentary...');

    const mockCommentary: PowerPointAICommentary[] = [];

    // Mock summary
    if (commentaryTypes.includes('summary')) {
      mockCommentary.push({
        id: `commentary_${Date.now()}_1`,
        textSectionId: textSections[0]?.id || 'mock_section',
        documentId: `pptx_${Date.now()}`,
        commentaryType: 'summary',
        content: `Bu "${filename}" PowerPoint dosyası için oluşturulan mock özet. Dosya ${textSections.length} metin bölümü içeriyor ve ${this.getSlideCount(textSections)} slayt bulunuyor.`,
        language,
        confidenceScore: 0.95,
        aiModel: 'mock-ai',
        processingTimeMs: 100
      });
    }

    // Mock key points
    if (commentaryTypes.includes('key_points')) {
      const titleSlides = textSections.filter(s => s.sectionType === 'title').slice(0, 3);
      mockCommentary.push({
        id: `commentary_${Date.now()}_2`,
        textSectionId: textSections[0]?.id || 'mock_section',
        documentId: `pptx_${Date.now()}`,
        commentaryType: 'key_points',
        content: `Ana slaytlar: ${titleSlides.map(s => s.content).join(', ')}`,
        language,
        confidenceScore: 0.90,
        aiModel: 'mock-ai',
        processingTimeMs: 150
      });
    }

    // Mock analysis
    if (commentaryTypes.includes('analysis')) {
      const bulletPoints = textSections.filter(s => s.sectionType === 'bullet_point');
      mockCommentary.push({
        id: `commentary_${Date.now()}_3`,
        textSectionId: textSections[0]?.id || 'mock_section',
        documentId: `pptx_${Date.now()}`,
        commentaryType: 'analysis',
        content: `PowerPoint analizi: Bu sunum ${textSections.length} metin bölümü içeriyor, ${bulletPoints.length} madde bulunuyor ve ${this.getSlideCount(textSections)} slayt var.`,
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
    commentary: PowerPointAICommentary[]
  ): Promise<void> {
    try {
      if (!this.supabase) {
        console.log('PowerPointAnalysisService: No Supabase connection, skipping AI commentary save');
        return;
      }

      console.log('PowerPointAnalysisService: Saving AI commentary to Supabase:', {
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
        console.error('PowerPointAnalysisService: Supabase AI commentary save failed:', error);
        throw new Error(`AI commentary save failed: ${error.message}`);
      }

      console.log('PowerPointAnalysisService: AI commentary saved successfully');
    } catch (error) {
      console.error('PowerPointAnalysisService: AI commentary save failed:', error);
      console.log('PowerPointAnalysisService: Continuing without AI commentary save');
    }
  }
}
