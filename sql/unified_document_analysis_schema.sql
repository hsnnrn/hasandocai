-- ====================================================================
-- DOCDATAAPP - Unified Document Analysis Schema for Supabase
-- ====================================================================
-- ⚠️ ÖNEMLİ: Bu script'i Supabase SQL Editor'da çalıştırın
-- 
-- 📋 Bu script şunları yapar:
--    1. Eski tabloları ve fonksiyonları temizler (DROP IF EXISTS)
--    2. Tüm tabloları sıfırdan oluşturur (group_id DAHIL!)
--    3. Transfer fonksiyonları ekler
--    4. Index'ler ve trigger'lar oluşturur
--    5. RLS'yi devre dışı bırakır
--
-- ✅ Tek seferlik komple kurulum
-- ✅ Hem tekli belge hem de grup analizleri için hazır
-- ✅ group_id NULL olabilir (tekil belgeler için)
-- ✅ RLS DISABLED - anon key ile çalışır
-- ====================================================================

-- ====================================================================
-- STEP 1: Temizlik - Eski yapıları sil
-- ====================================================================

-- Drop views first
DROP VIEW IF EXISTS group_analysis_overview CASCADE;
DROP VIEW IF EXISTS document_search_view CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS semantic_search(VECTOR, FLOAT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS search_documents(TEXT) CASCADE;
DROP FUNCTION IF EXISTS transfer_group_analysis_data(UUID, TEXT, TEXT, JSONB, JSONB, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_group_analysis_summary(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop tables (cascade ile bağlı kayıtlar da silinir)
DROP TABLE IF EXISTS embeddings CASCADE;
DROP TABLE IF EXISTS document_tags CASCADE;
DROP TABLE IF EXISTS ai_commentary CASCADE;
DROP TABLE IF EXISTS text_sections CASCADE;
DROP TABLE IF EXISTS group_analysis_sessions CASCADE;
DROP TABLE IF EXISTS group_analysis_results CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS document_groups CASCADE;

-- ====================================================================
-- STEP 2: Extensions - Gerekli uzantıları aktifleştir
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ====================================================================
-- STEP 3: Core Tables - Temel tablolar
-- ====================================================================

-- Document Groups table
-- Belgeleri gruplandırmak ve toplu analiz yapmak için
CREATE TABLE document_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id TEXT DEFAULT 'anonymous',
  group_type TEXT DEFAULT 'manual' CHECK (group_type IN ('manual', 'auto', 'batch')),
  
  -- Group statistics
  total_documents INTEGER DEFAULT 0,
  total_text_sections INTEGER DEFAULT 0,
  total_ai_commentary INTEGER DEFAULT 0,
  
  -- Analysis tracking
  last_analyzed TIMESTAMP WITH TIME ZONE,
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table
-- Hem tekli hem de gruplu belgeleri saklar
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES document_groups(id) ON DELETE SET NULL,
  
  -- File information
  filename TEXT NOT NULL,
  title TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'excel', 'powerpoint', 'xlsx', 'pptx')),
  file_size BIGINT,
  file_path TEXT,
  
  -- Document metadata
  page_count INTEGER DEFAULT 1,
  user_id TEXT DEFAULT 'anonymous',
  
  -- Analysis flags
  has_text_sections BOOLEAN DEFAULT FALSE,
  has_ai_commentary BOOLEAN DEFAULT FALSE,
  has_embeddings BOOLEAN DEFAULT FALSE,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Timestamps
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_processed TIMESTAMP WITH TIME ZONE,
  analysis_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Additional metadata (flexible JSONB field)
  metadata JSONB
);

-- ====================================================================
-- CONTENT TABLES - Text Extraction and Analysis
-- ====================================================================

-- Text sections table
-- Belgelerden çıkarılan metin bölümlerini saklar
CREATE TABLE text_sections (
  id TEXT PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Location information
  page_number INTEGER DEFAULT 1,
  section_title TEXT,
  order_index INTEGER DEFAULT 0,
  
  -- Content
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'paragraph' CHECK (content_type IN ('paragraph', 'header', 'list', 'table', 'image_caption', 'cell', 'slide', 'footer', 'bullet')),
  
  -- Formatting metadata
  position_x REAL DEFAULT 0,
  position_y REAL DEFAULT 0,
  font_size REAL DEFAULT 12,
  font_family TEXT DEFAULT 'Arial',
  is_bold BOOLEAN DEFAULT FALSE,
  is_italic BOOLEAN DEFAULT FALSE,
  color TEXT DEFAULT '#000000',
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Commentary table
-- Hem tekli belge hem de grup analiz yorumlarını saklar
CREATE TABLE ai_commentary (
  id TEXT PRIMARY KEY,
  text_section_id TEXT REFERENCES text_sections(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  group_id UUID REFERENCES document_groups(id) ON DELETE CASCADE,
  
  -- Commentary details
  commentary_type TEXT NOT NULL CHECK (commentary_type IN (
    'summary', 'analysis', 'key_points', 'questions', 'suggestions', 
    'translation', 'insights', 'relationships', 'semantic', 'patterns',
    'cross_document_analysis', 'group_summary', 'group_relationships'
  )),
  content TEXT NOT NULL,
  
  -- Quality metrics
  confidence_score REAL DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  language TEXT DEFAULT 'tr',
  
  -- AI model information
  ai_model TEXT DEFAULT 'bge-m3',
  processing_time_ms INTEGER DEFAULT 0,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- GROUP ANALYSIS TABLES
-- ====================================================================

-- Group Analysis Results table
-- Grup seviyesinde yapılan analizleri saklar (tekli belgelerden ayrı)
CREATE TABLE group_analysis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES document_groups(id) ON DELETE CASCADE,
  
  -- Analysis details
  analysis_type TEXT NOT NULL CHECK (analysis_type IN (
    'cross_document_analysis', 'group_summary', 'group_relationships', 
    'group_patterns', 'group_semantic_analysis', 'comparative_analysis',
    'trend_analysis', 'gap_analysis'
  )),
  content TEXT NOT NULL,
  
  -- Quality metrics
  confidence_score REAL DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  language TEXT DEFAULT 'tr',
  
  -- AI model information
  ai_model TEXT DEFAULT 'group-ai-model',
  processing_time_ms INTEGER DEFAULT 0,
  analysis_version TEXT DEFAULT '1.0',
  
  -- Analysis scope
  documents_analyzed INTEGER DEFAULT 0,
  text_sections_analyzed INTEGER DEFAULT 0,
  ai_commentary_analyzed INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group Analysis Sessions table
-- Analiz oturumlarını takip etmek için
CREATE TABLE group_analysis_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES document_groups(id) ON DELETE CASCADE,
  
  -- Session information
  session_name TEXT,
  analysis_types TEXT[] NOT NULL,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'partial')),
  
  -- Session statistics
  total_documents INTEGER DEFAULT 0,
  total_text_sections INTEGER DEFAULT 0,
  total_ai_commentary INTEGER DEFAULT 0,
  results_count INTEGER DEFAULT 0,
  
  -- Error handling
  error_message TEXT,
  
  -- User and metadata
  user_id TEXT DEFAULT 'anonymous',
  session_metadata JSONB,
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ====================================================================
-- EMBEDDINGS AND SEMANTIC SEARCH
-- ====================================================================

-- Embeddings table
-- Semantik arama için vektör embeddings
CREATE TABLE embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- References (can be linked to text section, document, or group)
  text_section_id TEXT REFERENCES text_sections(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  group_id UUID REFERENCES document_groups(id) ON DELETE CASCADE,
  
  -- Embedding data
  embedding_vector VECTOR(1024), -- BGE-M3 default dimension
  embedding_type TEXT DEFAULT 'content' CHECK (embedding_type IN (
    'content', 'commentary', 'group_analysis', 'combined', 'summary'
  )),
  
  -- Model information
  model_name TEXT DEFAULT 'bge-m3',
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- ADDITIONAL TABLES
-- ====================================================================

-- Document Tags table
-- Belgeleri kategorize etmek için
CREATE TABLE document_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Tag details
  tag_name TEXT NOT NULL,
  tag_type TEXT DEFAULT 'user' CHECK (tag_type IN ('user', 'ai_generated', 'auto')),
  confidence_score REAL,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- STEP 4: Indexes - Performans optimizasyonu
-- ====================================================================

-- Document Groups indexes
CREATE INDEX IF NOT EXISTS idx_document_groups_user_id ON document_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_document_groups_created_at ON document_groups(created_at);
CREATE INDEX IF NOT EXISTS idx_document_groups_analysis_status ON document_groups(analysis_status);
CREATE INDEX IF NOT EXISTS idx_document_groups_type ON document_groups(group_type);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_group_id ON documents(group_id);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_analysis_completed ON documents(analysis_completed_at);

-- Text Sections indexes
CREATE INDEX IF NOT EXISTS idx_text_sections_document_id ON text_sections(document_id);
CREATE INDEX IF NOT EXISTS idx_text_sections_page_number ON text_sections(page_number);
CREATE INDEX IF NOT EXISTS idx_text_sections_content_type ON text_sections(content_type);

-- AI Commentary indexes
CREATE INDEX IF NOT EXISTS idx_ai_commentary_document_id ON ai_commentary(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_commentary_group_id ON ai_commentary(group_id);
CREATE INDEX IF NOT EXISTS idx_ai_commentary_text_section_id ON ai_commentary(text_section_id);
CREATE INDEX IF NOT EXISTS idx_ai_commentary_type ON ai_commentary(commentary_type);

-- Group Analysis Results indexes
CREATE INDEX IF NOT EXISTS idx_group_analysis_results_group_id ON group_analysis_results(group_id);
CREATE INDEX IF NOT EXISTS idx_group_analysis_results_analysis_type ON group_analysis_results(analysis_type);
CREATE INDEX IF NOT EXISTS idx_group_analysis_results_created_at ON group_analysis_results(created_at);

-- Group Analysis Sessions indexes
CREATE INDEX IF NOT EXISTS idx_group_analysis_sessions_group_id ON group_analysis_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_group_analysis_sessions_status ON group_analysis_sessions(status);
CREATE INDEX IF NOT EXISTS idx_group_analysis_sessions_started_at ON group_analysis_sessions(started_at);

-- Embeddings indexes
CREATE INDEX IF NOT EXISTS idx_embeddings_document_id ON embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_text_section_id ON embeddings(text_section_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_group_id ON embeddings(group_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_type ON embeddings(embedding_type);
-- Vector similarity search index (IVFFlat for approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);

-- Document Tags indexes
CREATE INDEX IF NOT EXISTS idx_document_tags_document_id ON document_tags(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tags_name ON document_tags(tag_name);

-- ====================================================================
-- STEP 5: RLS Policies - Güvenlik ayarları
-- ====================================================================

-- DISABLE RLS on all tables (anon key ile çalışabilmek için)
-- Production'da authenticated user kullanıyorsanız ENABLE edip policy ekleyebilirsiniz
ALTER TABLE document_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE text_sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_commentary DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_analysis_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_analysis_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_tags DISABLE ROW LEVEL SECURITY;

-- Eski policy'leri temizle (eğer varsa)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON document_groups;
  DROP POLICY IF EXISTS "Allow anonymous access for development" ON document_groups;
  
  DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON documents;
  DROP POLICY IF EXISTS "Allow anonymous access for development" ON documents;
  
  DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON text_sections;
  DROP POLICY IF EXISTS "Allow anonymous access for development" ON text_sections;
  
  DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON ai_commentary;
  DROP POLICY IF EXISTS "Allow anonymous access for development" ON ai_commentary;
  
  DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON group_analysis_results;
  DROP POLICY IF EXISTS "Allow anonymous access for development" ON group_analysis_results;
  
  DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON group_analysis_sessions;
  DROP POLICY IF EXISTS "Allow anonymous access for development" ON group_analysis_sessions;
  
  DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON embeddings;
  DROP POLICY IF EXISTS "Allow anonymous access for development" ON embeddings;
  
  DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON document_tags;
  DROP POLICY IF EXISTS "Allow anonymous access for development" ON document_tags;
END $$;

-- ====================================================================
-- STEP 6: Functions and Triggers - Otomatik işlemler
-- ====================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
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

-- ====================================================================
-- STEP 7: Utility Functions - Yardımcı fonksiyonlar
-- ====================================================================

-- Function: Get group analysis summary
CREATE OR REPLACE FUNCTION get_group_analysis_summary(group_uuid UUID)
RETURNS TABLE (
  group_id UUID,
  group_name TEXT,
  total_documents INTEGER,
  total_text_sections INTEGER,
  total_ai_commentary INTEGER,
  analysis_results_count BIGINT,
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
    COUNT(gar.id) as analysis_results_count,
    dg.last_analyzed,
    ARRAY_AGG(DISTINCT gar.analysis_type) FILTER (WHERE gar.analysis_type IS NOT NULL) as analysis_types
  FROM document_groups dg
  LEFT JOIN group_analysis_results gar ON dg.id = gar.group_id
  WHERE dg.id = group_uuid
  GROUP BY dg.id, dg.name, dg.total_documents, dg.total_text_sections, dg.total_ai_commentary, dg.last_analyzed;
END;
$$ LANGUAGE plpgsql;

-- Function: Transfer group analysis data to Supabase
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
  total_sections INTEGER := 0;
  total_commentary INTEGER := 0;
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

    -- Insert documents and their content
    FOR doc_record IN SELECT * FROM jsonb_array_elements(p_documents)
    LOOP
      -- Insert document
      INSERT INTO documents (
        id, group_id, filename, title, file_type, file_size, 
        page_count, user_id, has_text_sections, has_ai_commentary,
        processing_status
      ) VALUES (
        COALESCE((doc_record->>'documentId')::UUID, (doc_record->>'id')::UUID),
        p_group_id,
        doc_record->>'filename',
        COALESCE(doc_record->>'title', doc_record->>'filename'),
        COALESCE(doc_record->>'fileType', 'pdf'),
        (doc_record->>'fileSize')::BIGINT,
        COALESCE((doc_record->>'pageCount')::INTEGER, 1),
        p_user_id,
        (doc_record->'textSections' IS NOT NULL AND jsonb_array_length(doc_record->'textSections') > 0),
        (doc_record->'aiCommentary' IS NOT NULL AND jsonb_array_length(doc_record->'aiCommentary') > 0),
        'completed'
      )
      ON CONFLICT (id) DO UPDATE SET
        filename = EXCLUDED.filename,
        title = EXCLUDED.title,
        group_id = EXCLUDED.group_id,
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
          COALESCE((section->>'pageNumber')::INTEGER, 1),
          section->>'sectionTitle',
          section->>'content',
          COALESCE(section->>'contentType', section->>'sectionType', 'paragraph'),
          COALESCE((section->>'orderIndex')::INTEGER, 0)
        FROM jsonb_array_elements(doc_record->'textSections') AS section
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          section_title = EXCLUDED.section_title;
        
        total_sections := total_sections + jsonb_array_length(doc_record->'textSections');
      END IF;

      -- Insert AI commentary if available
      IF doc_record->'aiCommentary' IS NOT NULL THEN
        INSERT INTO ai_commentary (
          id, document_id, group_id, text_section_id, commentary_type, content, 
          confidence_score, language, ai_model
        )
        SELECT 
          (commentary->>'id'),
          inserted_doc_id,
          p_group_id,
          (commentary->>'textSectionId'),
          COALESCE(commentary->>'commentaryType', commentary->>'type', 'analysis'),
          commentary->>'content',
          COALESCE((commentary->>'confidenceScore')::REAL, (commentary->>'confidence')::REAL, 0.0),
          COALESCE(commentary->>'language', 'tr'),
          COALESCE(commentary->>'aiModel', 'bge-m3')
        FROM jsonb_array_elements(doc_record->'aiCommentary') AS commentary
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          confidence_score = EXCLUDED.confidence_score;
        
        total_commentary := total_commentary + jsonb_array_length(doc_record->'aiCommentary');
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
        COALESCE((analysis_record->>'id')::UUID, gen_random_uuid()),
        p_group_id,
        analysis_record->>'analysisType',
        analysis_record->>'content',
        COALESCE((analysis_record->>'confidenceScore')::REAL, 0.0),
        COALESCE(analysis_record->>'language', 'tr'),
        COALESCE(analysis_record->>'aiModel', 'group-ai-model'),
        COALESCE((analysis_record->>'processingTimeMs')::INTEGER, 0),
        jsonb_array_length(p_documents),
        total_sections,
        total_commentary
      )
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        confidence_score = EXCLUDED.confidence_score,
        updated_at = NOW()
      RETURNING id INTO inserted_analysis_id;
    END LOOP;

    -- Update group statistics
    UPDATE document_groups 
    SET 
      analysis_status = 'completed',
      last_analyzed = NOW(),
      total_text_sections = total_sections,
      total_ai_commentary = total_commentary,
      updated_at = NOW()
    WHERE id = p_group_id;

    -- Return success result
    result := jsonb_build_object(
      'success', true,
      'message', 'Grup analizi başarıyla Supabase''e aktarıldı',
      'group_id', p_group_id,
      'documents_count', jsonb_array_length(p_documents),
      'text_sections_count', total_sections,
      'ai_commentary_count', total_commentary,
      'analysis_results_count', jsonb_array_length(p_analysis_results)
    );

  EXCEPTION WHEN OTHERS THEN
    -- Return error result
    result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE,
      'message', 'Grup analizi aktarımı sırasında hata oluştu'
    );
  END;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function: Full-text search across documents
CREATE OR REPLACE FUNCTION search_documents(search_query TEXT)
RETURNS TABLE (
    document_id UUID,
    title TEXT,
    filename TEXT,
    relevance_score FLOAT,
    match_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Search in document titles and filenames
    SELECT 
        d.id as document_id,
        d.title,
        d.filename,
        ts_rank(to_tsvector('turkish', d.title || ' ' || d.filename), plainto_tsquery('turkish', search_query)) as relevance_score,
        'title' as match_type
    FROM documents d
    WHERE to_tsvector('turkish', d.title || ' ' || d.filename) @@ plainto_tsquery('turkish', search_query)
    
    UNION ALL
    
    -- Search in text sections content
    SELECT 
        d.id as document_id,
        d.title,
        d.filename,
        ts_rank(to_tsvector('turkish', ts.content), plainto_tsquery('turkish', search_query)) as relevance_score,
        'content' as match_type
    FROM documents d
    JOIN text_sections ts ON d.id = ts.document_id
    WHERE to_tsvector('turkish', ts.content) @@ plainto_tsquery('turkish', search_query)
    
    ORDER BY relevance_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Semantic search using embeddings
CREATE OR REPLACE FUNCTION semantic_search(
  query_embedding VECTOR(1024), 
  similarity_threshold FLOAT DEFAULT 0.7,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
    document_id UUID,
    text_section_id TEXT,
    content TEXT,
    similarity_score FLOAT,
    section_title TEXT,
    page_number INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.document_id,
        e.text_section_id,
        ts.content,
        (1 - (e.embedding_vector <=> query_embedding))::FLOAT as similarity_score,
        ts.section_title,
        ts.page_number
    FROM embeddings e
    JOIN text_sections ts ON e.text_section_id = ts.id
    WHERE (1 - (e.embedding_vector <=> query_embedding)) > similarity_threshold
    ORDER BY e.embedding_vector <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- STEP 8: Views - Kolay veri erişimi
-- ====================================================================

-- Document search view with aggregated data
CREATE OR REPLACE VIEW document_search_view AS
SELECT 
    d.id,
    d.title,
    d.filename,
    d.file_type,
    d.page_count,
    d.upload_date,
    d.processing_status,
    d.group_id,
    dg.name as group_name,
    COUNT(DISTINCT ts.id) as section_count,
    COUNT(DISTINCT ac.id) as commentary_count,
    array_agg(DISTINCT dt.tag_name) FILTER (WHERE dt.tag_name IS NOT NULL) as tags
FROM documents d
LEFT JOIN document_groups dg ON d.group_id = dg.id
LEFT JOIN text_sections ts ON d.id = ts.document_id
LEFT JOIN ai_commentary ac ON d.id = ac.document_id
LEFT JOIN document_tags dt ON d.id = dt.document_id
GROUP BY d.id, d.title, d.filename, d.file_type, d.page_count, d.upload_date, d.processing_status, d.group_id, dg.name;

-- Group analysis overview view
CREATE OR REPLACE VIEW group_analysis_overview AS
SELECT 
    dg.id as group_id,
    dg.name as group_name,
    dg.description,
    dg.total_documents,
    dg.total_text_sections,
    dg.total_ai_commentary,
    dg.analysis_status,
    dg.last_analyzed,
    COUNT(DISTINCT gar.id) as analysis_results_count,
    array_agg(DISTINCT gar.analysis_type) FILTER (WHERE gar.analysis_type IS NOT NULL) as analysis_types,
    COUNT(DISTINCT gas.id) as session_count
FROM document_groups dg
LEFT JOIN group_analysis_results gar ON dg.id = gar.group_id
LEFT JOIN group_analysis_sessions gas ON dg.id = gas.group_id
GROUP BY dg.id, dg.name, dg.description, dg.total_documents, dg.total_text_sections, dg.total_ai_commentary, dg.analysis_status, dg.last_analyzed;

-- ====================================================================
-- STEP 9: Comments - Dokümantasyon
-- ====================================================================

COMMENT ON TABLE document_groups IS 'Belge gruplarını ve toplu analizleri yönetir';
COMMENT ON TABLE documents IS 'Hem tekli hem de gruplu belgelerin metadata bilgilerini saklar';
COMMENT ON TABLE text_sections IS 'Belgelerden çıkarılan metin bölümlerini saklar';
COMMENT ON TABLE ai_commentary IS 'AI tarafından oluşturulan yorumları ve analizleri saklar';
COMMENT ON TABLE group_analysis_results IS 'Grup seviyesinde yapılan çapraz belge analizlerini saklar';
COMMENT ON TABLE group_analysis_sessions IS 'Grup analiz oturumlarını ve durumlarını takip eder';
COMMENT ON TABLE embeddings IS 'Semantik arama için vektör embeddings saklar';
COMMENT ON TABLE document_tags IS 'Belgeleri kategorize etmek için etiketler saklar';

COMMENT ON FUNCTION transfer_group_analysis_data IS 'Grup analizi verilerini (belgeler, text sections, AI commentary ve grup analiz sonuçları) Supabase''e aktarır';
COMMENT ON FUNCTION get_group_analysis_summary IS 'Belirli bir grubun analiz özetini döndürür';
COMMENT ON FUNCTION search_documents IS 'Belgeler içinde tam metin araması yapar (Türkçe destekli)';
COMMENT ON FUNCTION semantic_search IS 'Embeddings kullanarak semantik arama yapar';

-- ====================================================================
-- STEP 10: Verification and Success Message - Doğrulama
-- ====================================================================

DO $$
DECLARE
  tables_count INTEGER;
  functions_count INTEGER;
  group_id_exists BOOLEAN;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO tables_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('document_groups', 'documents', 'text_sections', 'ai_commentary', 
                     'group_analysis_results', 'group_analysis_sessions', 'embeddings', 'document_tags');
  
  -- Count functions
  SELECT COUNT(*) INTO functions_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN ('transfer_group_analysis_data', 'get_group_analysis_summary', 
                       'search_documents', 'semantic_search', 'update_updated_at_column');
  
  -- Check if group_id exists in documents table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'group_id'
  ) INTO group_id_exists;
  
  -- Success messages
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ DocDataApp - Unified Schema Oluşturuldu!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Tablolar: % adet oluşturuldu', tables_count;
  RAISE NOTICE '⚙️  Fonksiyonlar: % adet oluşturuldu', functions_count;
  RAISE NOTICE '';
  
  IF group_id_exists THEN
    RAISE NOTICE '✅ DOĞRULANDI: documents.group_id mevcut';
  ELSE
    RAISE NOTICE '❌ HATA: documents.group_id bulunamadı!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 Özellikler:';
  RAISE NOTICE '   ✅ Hem tekil belge hem grup analizleri';
  RAISE NOTICE '   ✅ group_id NULL olabilir (tekil belgeler)';
  RAISE NOTICE '   ✅ RLS DISABLED (anon key çalışır)';
  RAISE NOTICE '   ✅ Transfer fonksiyonları hazır';
  RAISE NOTICE '   ✅ Semantik arama + Full-text search';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Sistem hazır! Artık belge ve grup analizlerinizi aktarabilirsiniz.';
  RAISE NOTICE '============================================';
  
  -- Verify all is OK
  IF tables_count < 8 OR functions_count < 5 OR NOT group_id_exists THEN
    RAISE WARNING 'UYARI: Bazı yapılar eksik olabilir. Lütfen kontrol edin.';
  END IF;
END $$;

