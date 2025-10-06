-- Supabase Schema for Document Analysis
-- Bu dosyayı Supabase SQL Editor'da çalıştırın

-- Document Groups table
CREATE TABLE IF NOT EXISTS document_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id TEXT DEFAULT 'anonymous',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES document_groups(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  title TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'excel', 'powerpoint')),
  page_count INTEGER DEFAULT 1,
  user_id TEXT DEFAULT 'anonymous',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Text sections table
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

-- AI Commentary table
CREATE TABLE IF NOT EXISTS ai_commentary (
  id TEXT PRIMARY KEY,
  text_section_id TEXT NOT NULL REFERENCES text_sections(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  group_id UUID REFERENCES document_groups(id) ON DELETE CASCADE,
  commentary_type TEXT NOT NULL CHECK (commentary_type IN ('summary', 'analysis', 'key_points', 'questions', 'suggestions', 'translation', 'insights', 'relationships', 'semantic', 'patterns', 'cross_document_analysis', 'group_summary', 'group_relationships')),
  content TEXT NOT NULL,
  confidence_score REAL DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  language TEXT DEFAULT 'tr',
  ai_model TEXT DEFAULT 'mock-ai-model',
  processing_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group Analysis Results table
CREATE TABLE IF NOT EXISTS group_analysis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES document_groups(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('cross_document_analysis', 'group_summary', 'group_relationships', 'group_patterns', 'group_semantic_analysis')),
  content TEXT NOT NULL,
  confidence_score REAL DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  language TEXT DEFAULT 'tr',
  ai_model TEXT DEFAULT 'mock-ai-model',
  processing_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Embeddings table (for future use)
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text_section_id TEXT NOT NULL REFERENCES text_sections(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  embedding_vector VECTOR(1024), -- Adjust dimension based on your embedding model
  model_name TEXT DEFAULT 'bge-m3',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_groups_user_id ON document_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_document_groups_created_at ON document_groups(created_at);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_group_id ON documents(group_id);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

CREATE INDEX IF NOT EXISTS idx_text_sections_document_id ON text_sections(document_id);
CREATE INDEX IF NOT EXISTS idx_text_sections_page_number ON text_sections(page_number);
CREATE INDEX IF NOT EXISTS idx_text_sections_content_type ON text_sections(content_type);

CREATE INDEX IF NOT EXISTS idx_ai_commentary_document_id ON ai_commentary(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_commentary_group_id ON ai_commentary(group_id);
CREATE INDEX IF NOT EXISTS idx_ai_commentary_text_section_id ON ai_commentary(text_section_id);
CREATE INDEX IF NOT EXISTS idx_ai_commentary_type ON ai_commentary(commentary_type);

CREATE INDEX IF NOT EXISTS idx_group_analysis_results_group_id ON group_analysis_results(group_id);
CREATE INDEX IF NOT EXISTS idx_group_analysis_results_analysis_type ON group_analysis_results(analysis_type);

CREATE INDEX IF NOT EXISTS idx_embeddings_document_id ON embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_text_section_id ON embeddings(text_section_id);

-- Row Level Security (RLS) policies
ALTER TABLE document_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_commentary ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_analysis_results ENABLE ROW LEVEL SECURITY;
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

-- Sample data for testing (optional)
-- INSERT INTO documents (filename, title, file_type, page_count, user_id) VALUES
-- ('test.pdf', 'Test Document', 'pdf', 5, 'test-user');

-- Comments
COMMENT ON TABLE document_groups IS 'Stores document groups for batch analysis';
COMMENT ON TABLE documents IS 'Stores document metadata and basic information';
COMMENT ON TABLE text_sections IS 'Stores extracted text sections from documents';
COMMENT ON TABLE ai_commentary IS 'Stores AI-generated commentary and analysis';
COMMENT ON TABLE group_analysis_results IS 'Stores cross-document analysis results for groups';
COMMENT ON TABLE embeddings IS 'Stores vector embeddings for semantic search';

COMMENT ON COLUMN document_groups.name IS 'Name of the document group';
COMMENT ON COLUMN document_groups.description IS 'Description of the document group purpose';
COMMENT ON COLUMN documents.file_type IS 'Type of document: pdf, docx, excel, powerpoint';
COMMENT ON COLUMN documents.group_id IS 'Reference to document group for batch analysis';
COMMENT ON COLUMN text_sections.content_type IS 'Type of content: paragraph, header, list, table, etc.';
COMMENT ON COLUMN ai_commentary.commentary_type IS 'Type of AI commentary: summary, analysis, key_points, etc.';
COMMENT ON COLUMN ai_commentary.group_id IS 'Reference to document group for cross-document analysis';
COMMENT ON COLUMN ai_commentary.confidence_score IS 'AI confidence score between 0.0 and 1.0';
COMMENT ON COLUMN group_analysis_results.analysis_type IS 'Type of group analysis: cross_document_analysis, group_summary, etc.';