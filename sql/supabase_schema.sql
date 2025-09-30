-- Supabase Schema for Document Analysis
-- Bu dosyayı Supabase SQL Editor'da çalıştırın

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
  commentary_type TEXT NOT NULL CHECK (commentary_type IN ('summary', 'analysis', 'key_points', 'questions', 'suggestions', 'translation', 'insights', 'relationships', 'semantic', 'patterns')),
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
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

CREATE INDEX IF NOT EXISTS idx_text_sections_document_id ON text_sections(document_id);
CREATE INDEX IF NOT EXISTS idx_text_sections_page_number ON text_sections(page_number);
CREATE INDEX IF NOT EXISTS idx_text_sections_content_type ON text_sections(content_type);

CREATE INDEX IF NOT EXISTS idx_ai_commentary_document_id ON ai_commentary(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_commentary_text_section_id ON ai_commentary(text_section_id);
CREATE INDEX IF NOT EXISTS idx_ai_commentary_type ON ai_commentary(commentary_type);

CREATE INDEX IF NOT EXISTS idx_embeddings_document_id ON embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_text_section_id ON embeddings(text_section_id);

-- Row Level Security (RLS) policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_commentary ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON documents
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON text_sections
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON ai_commentary
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON embeddings
  FOR ALL USING (auth.role() = 'authenticated');

-- Allow anonymous access for development
CREATE POLICY "Allow anonymous access for development" ON documents
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access for development" ON text_sections
  FOR ALL USING (true);

CREATE POLICY "Allow anonymous access for development" ON ai_commentary
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
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing (optional)
-- INSERT INTO documents (filename, title, file_type, page_count, user_id) VALUES
-- ('test.pdf', 'Test Document', 'pdf', 5, 'test-user');

-- Comments
COMMENT ON TABLE documents IS 'Stores document metadata and basic information';
COMMENT ON TABLE text_sections IS 'Stores extracted text sections from documents';
COMMENT ON TABLE ai_commentary IS 'Stores AI-generated commentary and analysis';
COMMENT ON TABLE embeddings IS 'Stores vector embeddings for semantic search';

COMMENT ON COLUMN documents.file_type IS 'Type of document: pdf, docx, excel, powerpoint';
COMMENT ON COLUMN text_sections.content_type IS 'Type of content: paragraph, header, list, table, etc.';
COMMENT ON COLUMN ai_commentary.commentary_type IS 'Type of AI commentary: summary, analysis, key_points, etc.';
COMMENT ON COLUMN ai_commentary.confidence_score IS 'AI confidence score between 0.0 and 1.0';