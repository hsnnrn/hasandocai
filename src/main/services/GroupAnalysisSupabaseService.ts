/**
 * Group Analysis Supabase Service
 * Handles transfer of group analysis data to Supabase separately from individual document analysis
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface GroupAnalysisTransferData {
  groupId: string;
  groupName: string;
  groupDescription?: string;
  documents: Array<{
    documentId: string;
    filename: string;
    title: string;
    fileType: string;
    fileSize?: number;
    pageCount?: number;
    createdAt: string;
    textSections?: Array<{
      id: string;
      content: string;
      pageNumber?: number;
      sectionTitle?: string;
      sectionType?: string;
      orderIndex?: number;
    }>;
    aiCommentary?: Array<{
      id: string;
      content: string;
      type: string;
      confidence?: number;
      language?: string;
      aiModel?: string;
      createdAt?: string;
    }>;
    embeddings?: any[];
    metadata?: any;
  }>;
  analysisResults: Array<{
    id: string;
    analysisType: string;
    content: string;
    confidenceScore: number;
    language?: string;
    aiModel?: string;
    processingTimeMs?: number;
    createdAt: string;
  }>;
  userId?: string;
  sessionMetadata?: any;
}

export interface TransferResult {
  success: boolean;
  message?: string;
  groupId?: string;
  documentsCount?: number;
  analysisResultsCount?: number;
  error?: string;
}

export class GroupAnalysisSupabaseService {
  private supabaseClient: SupabaseClient | null = null;
  private isInitialized = false;

  constructor() {
    console.log('GroupAnalysisSupabaseService initialized');
  }

  /**
   * Initialize the service with Supabase credentials
   */
  async initialize(projectUrl: string, anonKey: string, projectId?: string): Promise<{ success: boolean; error?: string; errorCode?: string; errorDetails?: any; errorHint?: string; needsManualSetup?: boolean; createTablesSQL?: string; dashboardUrl?: string }> {
    try {
      console.log('Initializing GroupAnalysisSupabaseService...');
      
      this.supabaseClient = createClient(projectUrl, anonKey);
      
      // Test connection
      const { data, error } = await this.supabaseClient
        .from('document_groups')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('Supabase connection test failed:', error);
        console.error('Error details:', {
          code: (error as any).code,
          message: error.message,
          details: (error as any).details,
          hint: (error as any).hint
        });
        
        // Check if table doesn't exist - same as single document upload
        if ((error as any).code === 'PGRST116' || 
            (error as any).code === 'PGRST205' || 
            error.message?.includes('relation') || 
            error.message?.includes('does not exist') ||
            error.message?.includes('Could not find the table')) {
          console.log('📋 document_groups table not found, preparing setup instructions...');
          
          // SQL script for group analysis - includes transfer function
          const createTablesSQL = `-- DocDataApp - Grup Analizi Tabloları
-- Tekil belge yüklerken unified schema çalıştırdıysanız GEREK YOK!

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Document Groups table
CREATE TABLE IF NOT EXISTS document_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id TEXT DEFAULT 'anonymous',
  group_type TEXT DEFAULT 'manual' CHECK (group_type IN ('manual', 'auto', 'batch')),
  total_documents INTEGER DEFAULT 0,
  total_text_sections INTEGER DEFAULT 0,
  total_ai_commentary INTEGER DEFAULT 0,
  last_analyzed TIMESTAMP WITH TIME ZONE,
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table (hem tekil hem grup analizleri için)
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES document_groups(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  title TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'excel', 'powerpoint', 'xlsx', 'pptx')),
  file_size BIGINT,
  file_path TEXT,
  page_count INTEGER DEFAULT 1,
  user_id TEXT DEFAULT 'anonymous',
  has_text_sections BOOLEAN DEFAULT FALSE,
  has_ai_commentary BOOLEAN DEFAULT FALSE,
  has_embeddings BOOLEAN DEFAULT FALSE,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_processed TIMESTAMP WITH TIME ZONE,
  analysis_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Text Sections table (belge içeriklerini saklar)
CREATE TABLE IF NOT EXISTS text_sections (
  id TEXT PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER DEFAULT 1,
  section_title TEXT,
  order_index INTEGER DEFAULT 0,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'paragraph' CHECK (content_type IN ('paragraph', 'header', 'list', 'table', 'image_caption', 'cell', 'slide', 'footer', 'bullet')),
  position_x REAL DEFAULT 0,
  position_y REAL DEFAULT 0,
  font_size REAL DEFAULT 12,
  font_family TEXT DEFAULT 'Arial',
  is_bold BOOLEAN DEFAULT FALSE,
  is_italic BOOLEAN DEFAULT FALSE,
  color TEXT DEFAULT '#000000',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Commentary table (AI yorumlarını saklar)
CREATE TABLE IF NOT EXISTS ai_commentary (
  id TEXT PRIMARY KEY,
  text_section_id TEXT REFERENCES text_sections(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  group_id UUID REFERENCES document_groups(id) ON DELETE CASCADE,
  commentary_type TEXT NOT NULL CHECK (commentary_type IN (
    'summary', 'analysis', 'key_points', 'questions', 'suggestions', 
    'translation', 'insights', 'relationships', 'semantic', 'patterns',
    'cross_document_analysis', 'group_summary', 'group_relationships'
  )),
  content TEXT NOT NULL,
  confidence_score REAL DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  language TEXT DEFAULT 'tr',
  ai_model TEXT DEFAULT 'bge-m3',
  processing_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group Analysis Results table
CREATE TABLE IF NOT EXISTS group_analysis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES document_groups(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN (
    'cross_document_analysis', 'group_summary', 'group_relationships', 
    'group_patterns', 'group_semantic_analysis', 'comparative_analysis',
    'trend_analysis', 'gap_analysis'
  )),
  content TEXT NOT NULL,
  confidence_score REAL DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  language TEXT DEFAULT 'tr',
  ai_model TEXT DEFAULT 'group-ai-model',
  processing_time_ms INTEGER DEFAULT 0,
  documents_analyzed INTEGER DEFAULT 0,
  text_sections_analyzed INTEGER DEFAULT 0,
  ai_commentary_analyzed INTEGER DEFAULT 0,
  analysis_version TEXT DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transfer function (IMPORTANT!)
CREATE OR REPLACE FUNCTION transfer_group_analysis_data(
  p_group_id UUID,
  p_group_name TEXT,
  p_group_description TEXT,
  p_documents JSONB,
  p_analysis_results JSONB,
  p_user_id TEXT DEFAULT 'anonymous'
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  doc_record JSONB;
  analysis_record JSONB;
  inserted_doc_id UUID;
  total_sections INTEGER := 0;
  total_commentary INTEGER := 0;
BEGIN
  BEGIN
    INSERT INTO document_groups (id, name, description, user_id, total_documents)
    VALUES (p_group_id, p_group_name, p_group_description, p_user_id, jsonb_array_length(p_documents))
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = NOW();

    FOR doc_record IN SELECT * FROM jsonb_array_elements(p_documents)
    LOOP
      INSERT INTO documents (id, group_id, filename, title, file_type, file_size, page_count, user_id, processing_status)
      VALUES (
        COALESCE((doc_record->>'documentId')::UUID, (doc_record->>'id')::UUID),
        p_group_id, doc_record->>'filename', COALESCE(doc_record->>'title', doc_record->>'filename'),
        COALESCE(doc_record->>'fileType', 'pdf'), (doc_record->>'fileSize')::BIGINT,
        COALESCE((doc_record->>'pageCount')::INTEGER, 1), p_user_id, 'completed'
      )
      ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, title = EXCLUDED.title, group_id = EXCLUDED.group_id, updated_at = NOW()
      RETURNING id INTO inserted_doc_id;

      IF doc_record->'textSections' IS NOT NULL THEN
        INSERT INTO text_sections (id, document_id, page_number, section_title, content, content_type, order_index)
        SELECT 
          (section->>'id'), inserted_doc_id, COALESCE((section->>'pageNumber')::INTEGER, 1),
          section->>'sectionTitle', section->>'content',
          COALESCE(section->>'contentType', section->>'sectionType', 'paragraph'),
          COALESCE((section->>'orderIndex')::INTEGER, 0)
        FROM jsonb_array_elements(doc_record->'textSections') AS section
        WHERE (section->>'id') IS NOT NULL AND (section->>'content') IS NOT NULL
        ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, section_title = EXCLUDED.section_title;
        total_sections := total_sections + jsonb_array_length(doc_record->'textSections');
      END IF;

      IF doc_record->'aiCommentary' IS NOT NULL THEN
        INSERT INTO ai_commentary (id, document_id, group_id, text_section_id, commentary_type, content, confidence_score, language, ai_model)
        SELECT 
          (commentary->>'id'), inserted_doc_id, p_group_id, (commentary->>'textSectionId'),
          COALESCE(commentary->>'commentaryType', commentary->>'type', 'analysis'),
          commentary->>'content', COALESCE((commentary->>'confidenceScore')::REAL, 0.0),
          COALESCE(commentary->>'language', 'tr'), COALESCE(commentary->>'aiModel', 'bge-m3')
        FROM jsonb_array_elements(doc_record->'aiCommentary') AS commentary
        WHERE (commentary->>'id') IS NOT NULL AND (commentary->>'content') IS NOT NULL
        ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, confidence_score = EXCLUDED.confidence_score;
        total_commentary := total_commentary + jsonb_array_length(doc_record->'aiCommentary');
      END IF;
    END LOOP;

    FOR analysis_record IN SELECT * FROM jsonb_array_elements(p_analysis_results)
    LOOP
      INSERT INTO group_analysis_results (id, group_id, analysis_type, content, confidence_score, language, ai_model, processing_time_ms, documents_analyzed, text_sections_analyzed, ai_commentary_analyzed)
      VALUES (
        COALESCE((analysis_record->>'id')::UUID, gen_random_uuid()), p_group_id,
        analysis_record->>'analysisType', analysis_record->>'content',
        COALESCE((analysis_record->>'confidenceScore')::REAL, 0.0),
        COALESCE(analysis_record->>'language', 'tr'),
        COALESCE(analysis_record->>'aiModel', 'group-ai-model'),
        COALESCE((analysis_record->>'processingTimeMs')::INTEGER, 0),
        jsonb_array_length(p_documents), total_sections, total_commentary
      )
      ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW();
    END LOOP;

    UPDATE document_groups SET analysis_status = 'completed', last_analyzed = NOW(), total_text_sections = total_sections, total_ai_commentary = total_commentary, updated_at = NOW() WHERE id = p_group_id;

    result := jsonb_build_object('success', true, 'message', 'Başarılı', 'group_id', p_group_id, 'documents_count', jsonb_array_length(p_documents));
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_build_object('success', false, 'error', SQLERRM);
  END;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_document_groups_updated_at ON document_groups;
CREATE TRIGGER update_document_groups_updated_at BEFORE UPDATE ON document_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_analysis_results_updated_at ON group_analysis_results;
CREATE TRIGGER update_group_analysis_results_updated_at BEFORE UPDATE ON group_analysis_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_groups_user_id ON document_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_document_groups_analysis_status ON document_groups(analysis_status);
CREATE INDEX IF NOT EXISTS idx_document_groups_created_at ON document_groups(created_at);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_group_id ON documents(group_id);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);

CREATE INDEX IF NOT EXISTS idx_text_sections_document_id ON text_sections(document_id);
CREATE INDEX IF NOT EXISTS idx_text_sections_page_number ON text_sections(page_number);
CREATE INDEX IF NOT EXISTS idx_text_sections_content_type ON text_sections(content_type);

CREATE INDEX IF NOT EXISTS idx_ai_commentary_document_id ON ai_commentary(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_commentary_group_id ON ai_commentary(group_id);
CREATE INDEX IF NOT EXISTS idx_ai_commentary_text_section_id ON ai_commentary(text_section_id);
CREATE INDEX IF NOT EXISTS idx_ai_commentary_type ON ai_commentary(commentary_type);

CREATE INDEX IF NOT EXISTS idx_group_analysis_results_group_id ON group_analysis_results(group_id);
CREATE INDEX IF NOT EXISTS idx_group_analysis_results_analysis_type ON group_analysis_results(analysis_type);

-- RLS Policies - İZİN SORUNU ÇÖZÜMÜ
-- Tüm tablolar için RLS'yi kapat (anon key ile çalışabilmek için)
ALTER TABLE document_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE text_sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_commentary DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_analysis_results DISABLE ROW LEVEL SECURITY;

-- Tüm mevcut RLS policy'lerini temizle
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON document_groups;
  DROP POLICY IF EXISTS "Allow anonymous access for development" ON document_groups;
  
  DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON documents;
  DROP POLICY IF EXISTS "Allow anonymous access for development" ON documents;
  DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
  DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;
  DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
  
  DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON text_sections;
  DROP POLICY IF EXISTS "Allow anonymous access for development" ON text_sections;
  DROP POLICY IF EXISTS "Users can view sections of their documents" ON text_sections;
  
  DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON ai_commentary;
  DROP POLICY IF EXISTS "Allow anonymous access for development" ON ai_commentary;
  DROP POLICY IF EXISTS "Users can view commentary of their documents" ON ai_commentary;
  
  DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON group_analysis_results;
  DROP POLICY IF EXISTS "Allow anonymous access for development" ON group_analysis_results;
END $$;`;
          
          const dashboardUrl = projectId 
            ? `https://supabase.com/dashboard/project/${projectId}/sql/new`
            : 'https://supabase.com/dashboard';
          
          console.log('📋 Returning SQL setup info to renderer for in-app dialog');
          
          // Return data for in-app SQL setup dialog
          return {
            success: false,
            error: `Supabase'de gerekli tablolar bulunamadı veya izin sorunu tespit edildi. Bu script tüm gerekli tabloları (documents, text_sections, ai_commentary, document_groups, group_analysis_results) oluşturacak ve izin sorunlarını çözecek. NOT: Unified schema'yı zaten çalıştırdıysanız bu script'i çalıştırmanıza gerek yok.`,
            errorCode: (error as any).code,
            needsManualSetup: true,
            createTablesSQL,
            dashboardUrl
          };
        }
        
        // Return detailed error information for other errors
        return { 
          success: false, 
          error: error.message,
          errorCode: (error as any).code,
          errorDetails: (error as any).details,
          errorHint: (error as any).hint
        };
      }
      
      this.isInitialized = true;
      console.log('GroupAnalysisSupabaseService initialized successfully');
      return { success: true };
      
    } catch (error) {
      console.error('Failed to initialize GroupAnalysisSupabaseService:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Convert string ID to UUID (deterministic using MD5-based UUID v3)
   * Same string will always produce the same UUID
   */
  private stringToUUID(str: string): string {
    // Use a simple namespace UUID (can be any valid UUID)
    const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    
    // For simplicity, we'll create a hash-based UUID
    // Using a simple deterministic approach
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(str).digest('hex');
    
    // Format as UUID v4
    return [
      hash.substring(0, 8),
      hash.substring(8, 12),
      '4' + hash.substring(13, 16), // Version 4
      hash.substring(16, 20),
      hash.substring(20, 32)
    ].join('-');
  }

  /**
   * Transfer group analysis data to Supabase
   */
  async transferGroupAnalysis(data: GroupAnalysisTransferData): Promise<TransferResult> {
    if (!this.isInitialized || !this.supabaseClient) {
      return {
        success: false,
        error: 'Service not initialized. Call initialize() first.'
      };
    }

    try {
      console.log('🚀 Starting group analysis transfer to Supabase...');
      console.log('📊 Transfer data summary:', {
        groupId: data.groupId,
        groupName: data.groupName,
        documentsCount: data.documents.length,
        analysisResultsCount: data.analysisResults.length,
        userId: data.userId || 'anonymous'
      });
      
      // Debug: Check if service is properly initialized
      console.log('🔧 Service status:', this.getStatus());
      console.log('🔗 Supabase client status:', this.supabaseClient ? 'Connected' : 'Not connected');

      // Convert group ID to UUID
      const groupUUID = this.stringToUUID(data.groupId);
      console.log('🔄 Converted group ID to UUID:', {
        original: data.groupId,
        uuid: groupUUID
      });

      // Prepare data for the transfer function
      console.log('📝 Preparing documents JSON...');
      const documentsJson = data.documents.map(doc => ({
        documentId: this.stringToUUID(doc.documentId), // Convert to UUID
        filename: doc.filename,
        title: doc.title,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        pageCount: doc.pageCount,
        textSections: doc.textSections || [],
        aiCommentary: doc.aiCommentary || [],
        embeddings: doc.embeddings || [],
        metadata: doc.metadata || {}
      }));
      console.log('📄 Documents JSON prepared:', {
        count: documentsJson.length,
        sample: documentsJson[0] ? {
          documentId: documentsJson[0].documentId,
          filename: documentsJson[0].filename,
          textSectionsCount: documentsJson[0].textSections?.length || 0,
          aiCommentaryCount: documentsJson[0].aiCommentary?.length || 0
        } : 'No documents'
      });

      console.log('📊 Preparing analysis results JSON...');
      const analysisResultsJson = data.analysisResults.map(result => ({
        id: this.stringToUUID(result.id), // Convert to UUID
        analysisType: result.analysisType,
        content: result.content,
        confidenceScore: result.confidenceScore,
        language: result.language || 'tr',
        aiModel: result.aiModel || 'group-ai-model',
        processingTimeMs: result.processingTimeMs || 0
      }));
      console.log('🔍 Analysis results JSON prepared:', {
        count: analysisResultsJson.length,
        sample: analysisResultsJson[0] ? {
          id: analysisResultsJson[0].id,
          analysisType: analysisResultsJson[0].analysisType,
          contentLength: analysisResultsJson[0].content?.length || 0
        } : 'No analysis results'
      });

      // Call the Supabase function
      console.log('🔄 Calling Supabase RPC function: transfer_group_analysis_data...');
      console.log('📋 RPC parameters:', {
        p_group_id: groupUUID,
        p_group_name: data.groupName,
        p_group_description: data.groupDescription || '',
        p_documents_count: documentsJson.length,
        p_analysis_results_count: analysisResultsJson.length,
        p_user_id: data.userId || 'anonymous'
      });
      
      const { data: functionResult, error } = await this.supabaseClient
        .rpc('transfer_group_analysis_data', {
          p_group_id: groupUUID,
          p_group_name: data.groupName,
          p_group_description: data.groupDescription || '',
          p_documents: documentsJson,
          p_analysis_results: analysisResultsJson,
          p_user_id: data.userId || 'anonymous'
        });
        
      console.log('📥 Supabase RPC response received');

      if (error) {
        console.error('❌ Supabase function call failed:', error);
        console.error('🔍 Error details:', {
          code: (error as any).code,
          message: error.message,
          details: (error as any).details,
          hint: (error as any).hint,
          status: (error as any).status
        });
        
        // Check if it's a function not found error
        if ((error as any).code === 'PGRST202' || error.message?.includes('function') || error.message?.includes('not found')) {
          return {
            success: false,
            error: `transfer_group_analysis_data fonksiyonu bulunamadı. SQL script'ini çalıştırmanız gerekiyor. Hata: ${error.message}`
          };
        }
        
        // Check if it's a table not found error
        if ((error as any).code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          return {
            success: false,
            error: `Gerekli tablolar bulunamadı. SQL script'ini çalıştırmanız gerekiyor. Hata: ${error.message}`
          };
        }
        
        return {
          success: false,
          error: `Supabase fonksiyon çağrısı başarısız: ${error.message} (Kod: ${(error as any).code})`
        };
      }

      if (!functionResult || !functionResult.success) {
        console.error('Transfer function returned error:', functionResult);
        return {
          success: false,
          error: functionResult?.error || functionResult?.message || 'Transfer function failed'
        };
      }

      console.log('✅ Group analysis transfer completed successfully');
      console.log('📊 Transfer result:', functionResult);

      return {
        success: true,
        message: functionResult.message || 'Group analysis data transferred successfully',
        groupId: groupUUID,
        documentsCount: functionResult.documents_count,
        analysisResultsCount: functionResult.analysis_results_count
      };

    } catch (error) {
      console.error('💥 Group analysis transfer failed with exception:', error);
      console.error('🔍 Exception details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during transfer'
      };
    }
  }

  /**
   * Get group analysis summary from Supabase
   */
  async getGroupAnalysisSummary(groupId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.isInitialized || !this.supabaseClient) {
      return {
        success: false,
        error: 'Service not initialized. Call initialize() first.'
      };
    }

    try {
      const { data, error } = await this.supabaseClient
        .rpc('get_group_analysis_summary', {
          group_uuid: groupId
        });

      if (error) {
        console.error('Failed to get group analysis summary:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data?.[0] || null
      };

    } catch (error) {
      console.error('Error getting group analysis summary:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all groups for a user
   */
  async getUserGroups(userId?: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    if (!this.isInitialized || !this.supabaseClient) {
      return {
        success: false,
        error: 'Service not initialized. Call initialize() first.'
      };
    }

    try {
      const { data, error } = await this.supabaseClient
        .from('document_groups')
        .select(`
          id,
          name,
          description,
          group_type,
          total_documents,
          total_text_sections,
          total_ai_commentary,
          analysis_status,
          last_analyzed,
          created_at,
          updated_at
        `)
        .eq('user_id', userId || 'anonymous')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to get user groups:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data || []
      };

    } catch (error) {
      console.error('Error getting user groups:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get group analysis results
   */
  async getGroupAnalysisResults(groupId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    if (!this.isInitialized || !this.supabaseClient) {
      return {
        success: false,
        error: 'Service not initialized. Call initialize() first.'
      };
    }

    try {
      const { data, error } = await this.supabaseClient
        .from('group_analysis_results')
        .select(`
          id,
          analysis_type,
          content,
          confidence_score,
          language,
          ai_model,
          processing_time_ms,
          documents_analyzed,
          text_sections_analyzed,
          ai_commentary_analyzed,
          created_at
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to get group analysis results:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data || []
      };

    } catch (error) {
      console.error('Error getting group analysis results:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete group and all related data
   */
  async deleteGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isInitialized || !this.supabaseClient) {
      return {
        success: false,
        error: 'Service not initialized. Call initialize() first.'
      };
    }

    try {
      const { error } = await this.supabaseClient
        .from('document_groups')
        .delete()
        .eq('id', groupId);

      if (error) {
        console.error('Failed to delete group:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true
      };

    } catch (error) {
      console.error('Error deleting group:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.supabaseClient !== null;
  }

  /**
   * Get service status
   */
  getStatus(): { initialized: boolean; ready: boolean } {
    return {
      initialized: this.isInitialized,
      ready: this.isReady()
    };
  }
}
