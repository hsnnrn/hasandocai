-- Enhanced Supabase Schema for Group Analysis
-- Bu dosyayı Supabase SQL Editor'da çalıştırın
-- Group analysis verilerini tekli belge analizinden ayrı olarak saklamak için

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Document Groups table (enhanced for group analysis)
CREATE TABLE IF NOT EXISTS document_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id TEXT DEFAULT 'anonymous',
  group_type TEXT DEFAULT 'manual' CHECK (group_type IN ('manual', 'auto', 'batch')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Group metadata
  total_documents INTEGER DEFAULT 0,
  total_text_sections INTEGER DEFAULT 0,
  total_ai_commentary INTEGER DEFAULT 0,
  last_analyzed TIMESTAMP WITH TIME ZONE,
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Documents table (links to groups)
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES document_groups(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  title TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'excel', 'powerpoint')),
  file_size BIGINT,
  page_count INTEGER DEFAULT 1,
  user_id TEXT DEFAULT 'anonymous',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Document analysis metadata
  has_text_sections BOOLEAN DEFAULT FALSE,
  has_ai_commentary BOOLEAN DEFAULT FALSE,
  has_embeddings BOOLEAN DEFAULT FALSE,
  analysis_completed_at TIMESTAMP WITH TIME ZONE
);

-- Text sections table (from individual documents)
CREATE TABLE IF NOT EXISTS text_sections (
  id TEXT PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER DEFAULT 1,
  section_title TEXT,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'paragraph' CHECK (content_type IN ('paragraph', 'header', 'list', 'table', 'image_caption', 'cell', 'slide')),
  position_x REAL DEFAULT 0,
  position_y REAL DEFAULT 0,
  font_size REAL DEFAULT 12,
  font_family TEXT DEFAULT 'Arial',
  is_bold BOOLEAN DEFAULT FALSE,
  is_italic BOOLEAN DEFAULT FALSE,
  color TEXT DEFAULT '#000000',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Commentary table (from individual documents)
CREATE TABLE IF NOT EXISTS ai_commentary (
  id TEXT PRIMARY KEY,
  text_section_id TEXT NOT NULL REFERENCES text_sections(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  group_id UUID REFERENCES document_groups(id) ON DELETE CASCADE,
  commentary_type TEXT NOT NULL CHECK (commentary_type IN ('summary', 'analysis', 'key_points', 'questions', 'suggestions', 'translation', 'insights', 'relationships', 'semantic', 'patterns')),
  content TEXT NOT NULL,
  confidence_score REAL DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  language TEXT DEFAULT 'tr',
  ai_model TEXT DEFAULT 'mock-ai-model',
  processing_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group Analysis Results table (separate from individual document analysis)
CREATE TABLE IF NOT EXISTS group_analysis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES document_groups(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('cross_document_analysis', 'group_summary', 'group_relationships', 'group_patterns', 'group_semantic_analysis')),
  content TEXT NOT NULL,
  confidence_score REAL DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  language TEXT DEFAULT 'tr',
  ai_model TEXT DEFAULT 'group-ai-model',
  processing_time_ms INTEGER DEFAULT 0,
  -- Group analysis specific metadata
  documents_analyzed INTEGER DEFAULT 0,
  text_sections_analyzed INTEGER DEFAULT 0,
  ai_commentary_analyzed INTEGER DEFAULT 0,
  analysis_version TEXT DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group Analysis Metadata table (for tracking analysis sessions)
CREATE TABLE IF NOT EXISTS group_analysis_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES document_groups(id) ON DELETE CASCADE,
  session_name TEXT,
  analysis_types TEXT[] NOT NULL, -- Array of analysis types performed
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'partial')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_documents INTEGER DEFAULT 0,
  total_text_sections INTEGER DEFAULT 0,
  total_ai_commentary INTEGER DEFAULT 0,
  results_count INTEGER DEFAULT 0,
  error_message TEXT,
  -- Session metadata
  user_id TEXT DEFAULT 'anonymous',
  session_metadata JSONB
);

-- Embeddings table (for semantic search - both individual and group level)
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text_section_id TEXT REFERENCES text_sections(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  group_id UUID REFERENCES document_groups(id) ON DELETE CASCADE,
  embedding_vector VECTOR(1024), -- Adjust dimension based on your embedding model
  model_name TEXT DEFAULT 'bge-m3',
  embedding_type TEXT DEFAULT 'content' CHECK (embedding_type IN ('content', 'commentary', 'group_analysis', 'combined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_groups_user_id ON document_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_document_groups_created_at ON document_groups(created_at);
CREATE INDEX IF NOT EXISTS idx_document_groups_analysis_status ON document_groups(analysis_status);
CREATE INDEX IF NOT EXISTS idx_document_groups_type ON document_groups(group_type);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_group_id ON documents(group_id);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_analysis_completed ON documents(analysis_completed_at);

CREATE INDEX IF NOT EXISTS idx_text_sections_document_id ON text_sections(document_id);
CREATE INDEX IF NOT EXISTS idx_text_sections_page_number ON text_sections(page_number);
CREATE INDEX IF NOT EXISTS idx_text_sections_content_type ON text_sections(content_type);

CREATE INDEX IF NOT EXISTS idx_ai_commentary_document_id ON ai_commentary(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_commentary_group_id ON ai_commentary(group_id);
CREATE INDEX IF NOT EXISTS idx_ai_commentary_text_section_id ON ai_commentary(text_section_id);
CREATE INDEX IF NOT EXISTS idx_ai_commentary_type ON ai_commentary(commentary_type);

CREATE INDEX IF NOT EXISTS idx_group_analysis_results_group_id ON group_analysis_results(group_id);
CREATE INDEX IF NOT EXISTS idx_group_analysis_results_analysis_type ON group_analysis_results(analysis_type);
CREATE INDEX IF NOT EXISTS idx_group_analysis_results_created_at ON group_analysis_results(created_at);

CREATE INDEX IF NOT EXISTS idx_group_analysis_sessions_group_id ON group_analysis_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_group_analysis_sessions_status ON group_analysis_sessions(status);
CREATE INDEX IF NOT EXISTS idx_group_analysis_sessions_started_at ON group_analysis_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_embeddings_document_id ON embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_text_section_id ON embeddings(text_section_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_group_id ON embeddings(group_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_type ON embeddings(embedding_type);

-- Row Level Security (RLS) policies
ALTER TABLE document_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_commentary ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON document_groups
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON documents
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON text_sections
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON ai_commentary
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON group_analysis_results
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON group_analysis_sessions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON embeddings
  FOR ALL USING (auth.role() = 'authenticated');

-- Allow anonymous access for development
CREATE POLICY "Allow anonymous access for development" ON document_groups
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access for development" ON documents
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access for development" ON text_sections
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access for development" ON ai_commentary
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access for development" ON group_analysis_results
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access for development" ON group_analysis_sessions
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access for development" ON embeddings
  FOR ALL USING (true);

-- Functions for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updating updated_at
CREATE TRIGGER update_document_groups_updated_at
  BEFORE UPDATE ON document_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_analysis_results_updated_at
  BEFORE UPDATE ON group_analysis_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get group analysis summary
CREATE OR REPLACE FUNCTION get_group_analysis_summary(group_uuid UUID)
RETURNS TABLE (
  group_id UUID,
  group_name TEXT,
  total_documents INTEGER,
  total_text_sections INTEGER,
  total_ai_commentary INTEGER,
  analysis_results_count INTEGER,
  last_analyzed TIMESTAMP WITH TIME ZONE,
  analysis_types TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dg.id,
    dg.name,
    dg.total_documents,
    dg.total_text_sections,
    dg.total_ai_commentary,
    COUNT(gar.id)::INTEGER as analysis_results_count,
    dg.last_analyzed,
    ARRAY_AGG(DISTINCT gar.analysis_type) as analysis_types
  FROM document_groups dg
  LEFT JOIN group_analysis_results gar ON dg.id = gar.group_id
  WHERE dg.id = group_uuid
  GROUP BY dg.id, dg.name, dg.total_documents, dg.total_text_sections, dg.total_ai_commentary, dg.last_analyzed;
END;
$$ LANGUAGE plpgsql;

-- Function to transfer group analysis data
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
  inserted_analysis_id UUID;
BEGIN
  -- Start transaction
  BEGIN
    -- Insert or update document group
    INSERT INTO document_groups (id, name, description, user_id, total_documents)
    VALUES (p_group_id, p_group_name, p_group_description, p_user_id, jsonb_array_length(p_documents))
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      total_documents = EXCLUDED.total_documents,
      updated_at = NOW();

    -- Insert documents
    FOR doc_record IN SELECT * FROM jsonb_array_elements(p_documents)
    LOOP
      INSERT INTO documents (
        id, group_id, filename, title, file_type, file_size, 
        page_count, user_id, has_text_sections, has_ai_commentary
      ) VALUES (
        (doc_record->>'documentId')::UUID,
        p_group_id,
        doc_record->>'filename',
        doc_record->>'title',
        doc_record->>'fileType',
        (doc_record->>'fileSize')::BIGINT,
        (doc_record->>'pageCount')::INTEGER,
        p_user_id,
        (doc_record->'textSections' IS NOT NULL AND jsonb_array_length(doc_record->'textSections') > 0),
        (doc_record->'aiCommentary' IS NOT NULL AND jsonb_array_length(doc_record->'aiCommentary') > 0)
      )
      ON CONFLICT (id) DO UPDATE SET
        filename = EXCLUDED.filename,
        title = EXCLUDED.title,
        updated_at = NOW()
      RETURNING id INTO inserted_doc_id;

      -- Insert text sections if available
      IF doc_record->'textSections' IS NOT NULL THEN
        INSERT INTO text_sections (
          id, document_id, page_number, section_title, content, 
          content_type, order_index
        )
        SELECT 
          (section->>'id'),
          inserted_doc_id,
          (section->>'pageNumber')::INTEGER,
          section->>'sectionTitle',
          section->>'content',
          COALESCE(section->>'sectionType', 'paragraph'),
          (section->>'orderIndex')::INTEGER
        FROM jsonb_array_elements(doc_record->'textSections') AS section
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          section_title = EXCLUDED.section_title;
      END IF;

      -- Insert AI commentary if available
      IF doc_record->'aiCommentary' IS NOT NULL THEN
        INSERT INTO ai_commentary (
          id, document_id, group_id, commentary_type, content, 
          confidence_score, language, ai_model
        )
        SELECT 
          (commentary->>'id'),
          inserted_doc_id,
          p_group_id,
          commentary->>'type',
          commentary->>'content',
          (commentary->>'confidence')::REAL,
          COALESCE(commentary->>'language', 'tr'),
          COALESCE(commentary->>'aiModel', 'bge-m3')
        FROM jsonb_array_elements(doc_record->'aiCommentary') AS commentary
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          confidence_score = EXCLUDED.confidence_score;
      END IF;
    END LOOP;

    -- Insert group analysis results
    FOR analysis_record IN SELECT * FROM jsonb_array_elements(p_analysis_results)
    LOOP
      INSERT INTO group_analysis_results (
        id, group_id, analysis_type, content, confidence_score, 
        language, ai_model, processing_time_ms, documents_analyzed,
        text_sections_analyzed, ai_commentary_analyzed
      ) VALUES (
        (analysis_record->>'id')::UUID,
        p_group_id,
        analysis_record->>'analysisType',
        analysis_record->>'content',
        (analysis_record->>'confidenceScore')::REAL,
        COALESCE(analysis_record->>'language', 'tr'),
        COALESCE(analysis_record->>'aiModel', 'group-ai-model'),
        (analysis_record->>'processingTimeMs')::INTEGER,
        jsonb_array_length(p_documents),
        (SELECT SUM(jsonb_array_length(doc->'textSections')) FROM jsonb_array_elements(p_documents) AS doc),
        (SELECT SUM(jsonb_array_length(doc->'aiCommentary')) FROM jsonb_array_elements(p_documents) AS doc)
      )
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        confidence_score = EXCLUDED.confidence_score,
        updated_at = NOW()
      RETURNING id INTO inserted_analysis_id;
    END LOOP;

    -- Update group analysis status
    UPDATE document_groups 
    SET 
      analysis_status = 'completed',
      last_analyzed = NOW(),
      total_text_sections = (SELECT SUM(jsonb_array_length(doc->'textSections')) FROM jsonb_array_elements(p_documents) AS doc),
      total_ai_commentary = (SELECT SUM(jsonb_array_length(doc->'aiCommentary')) FROM jsonb_array_elements(p_documents) AS doc)
    WHERE id = p_group_id;

    -- Return success result
    result := jsonb_build_object(
      'success', true,
      'message', 'Group analysis data transferred successfully',
      'group_id', p_group_id,
      'documents_count', jsonb_array_length(p_documents),
      'analysis_results_count', jsonb_array_length(p_analysis_results)
    );

  EXCEPTION WHEN OTHERS THEN
    -- Return error result
    result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to transfer group analysis data'
    );
  END;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE document_groups IS 'Stores document groups for batch analysis with enhanced metadata';
COMMENT ON TABLE documents IS 'Stores document metadata with group relationships';
COMMENT ON TABLE text_sections IS 'Stores extracted text sections from documents';
COMMENT ON TABLE ai_commentary IS 'Stores AI-generated commentary and analysis';
COMMENT ON TABLE group_analysis_results IS 'Stores cross-document analysis results for groups (separate from individual analysis)';
COMMENT ON TABLE group_analysis_sessions IS 'Tracks group analysis sessions and their progress';
COMMENT ON TABLE embeddings IS 'Stores vector embeddings for semantic search';

COMMENT ON FUNCTION transfer_group_analysis_data IS 'Transfers complete group analysis data including documents, text sections, AI commentary, and group analysis results to Supabase';
COMMENT ON FUNCTION get_group_analysis_summary IS 'Returns a summary of group analysis data including counts and analysis types';

-- Sample usage:
-- SELECT transfer_group_analysis_data(
--   'your-group-uuid'::UUID,
--   'My Document Group',
--   'Description of the group',
--   '[{"documentId": "doc-1", "filename": "doc1.pdf", ...}]'::JSONB,
--   '[{"id": "analysis-1", "analysisType": "group_summary", ...}]'::JSONB,
--   'user123'
-- );
