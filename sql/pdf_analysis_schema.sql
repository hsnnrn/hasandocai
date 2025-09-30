-- PDF Analysis and AI Commentary Schema for Supabase
-- This schema supports storing PDF documents, extracted text sections, and AI-generated commentary

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Documents table - stores PDF metadata and file information
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT,
    file_size BIGINT,
    page_count INTEGER,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_processed TIMESTAMP WITH TIME ZONE,
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Text sections table - stores extracted text from PDF pages/sections
CREATE TABLE IF NOT EXISTS text_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    page_number INTEGER,
    section_title TEXT,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'paragraph' CHECK (content_type IN ('paragraph', 'header', 'list', 'table', 'image_caption')),
    position_x FLOAT,
    position_y FLOAT,
    font_size FLOAT,
    font_family TEXT,
    is_bold BOOLEAN DEFAULT FALSE,
    is_italic BOOLEAN DEFAULT FALSE,
    color TEXT,
    order_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI commentary table - stores AI-generated analysis and commentary
CREATE TABLE IF NOT EXISTS ai_commentary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    text_section_id UUID REFERENCES text_sections(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    commentary_type TEXT NOT NULL CHECK (commentary_type IN ('summary', 'analysis', 'key_points', 'questions', 'suggestions', 'translation')),
    content TEXT NOT NULL,
    confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
    language TEXT DEFAULT 'tr',
    ai_model TEXT DEFAULT 'BGE-M3',
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Embeddings table - stores vector embeddings for semantic search
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    text_section_id UUID REFERENCES text_sections(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    embedding vector(1024), -- BGE-M3 embedding dimension
    embedding_type TEXT DEFAULT 'content' CHECK (embedding_type IN ('content', 'commentary', 'combined')),
    ai_model TEXT DEFAULT 'BGE-M3',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document tags for categorization
CREATE TABLE IF NOT EXISTS document_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    tag_name TEXT NOT NULL,
    tag_type TEXT DEFAULT 'user' CHECK (tag_type IN ('user', 'ai_generated', 'auto')),
    confidence_score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search and analytics views
CREATE OR REPLACE VIEW document_search_view AS
SELECT 
    d.id,
    d.title,
    d.filename,
    d.page_count,
    d.upload_date,
    d.processing_status,
    COUNT(ts.id) as section_count,
    COUNT(ac.id) as commentary_count,
    array_agg(DISTINCT dt.tag_name) as tags
FROM documents d
LEFT JOIN text_sections ts ON d.id = ts.document_id
LEFT JOIN ai_commentary ac ON d.id = ac.document_id
LEFT JOIN document_tags dt ON d.id = dt.document_id
GROUP BY d.id, d.title, d.filename, d.page_count, d.upload_date, d.processing_status;

-- Full-text search function for documents
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
    SELECT 
        d.id as document_id,
        d.title,
        d.filename,
        ts_rank(to_tsvector('turkish', d.title || ' ' || d.filename), plainto_tsquery('turkish', search_query)) as relevance_score,
        'title' as match_type
    FROM documents d
    WHERE to_tsvector('turkish', d.title || ' ' || d.filename) @@ plainto_tsquery('turkish', search_query)
    
    UNION ALL
    
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

-- Semantic search function using embeddings
CREATE OR REPLACE FUNCTION semantic_search_documents(query_embedding vector(1024), similarity_threshold FLOAT DEFAULT 0.7)
RETURNS TABLE (
    document_id UUID,
    text_section_id UUID,
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
        1 - (e.embedding <=> query_embedding) as similarity_score,
        ts.section_title,
        ts.page_number
    FROM embeddings e
    JOIN text_sections ts ON e.text_section_id = ts.id
    WHERE 1 - (e.embedding <=> query_embedding) > similarity_threshold
    ORDER BY e.embedding <=> query_embedding;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_text_sections_document_id ON text_sections(document_id);
CREATE INDEX IF NOT EXISTS idx_text_sections_page_number ON text_sections(page_number);
CREATE INDEX IF NOT EXISTS idx_ai_commentary_document_id ON ai_commentary(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_commentary_type ON ai_commentary(commentary_type);
CREATE INDEX IF NOT EXISTS idx_embeddings_document_id ON embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_embedding ON embeddings USING ivfflat (embedding vector_cosine_ops);

-- Row Level Security (RLS) policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_commentary ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_tags ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (adjust based on your auth requirements)
CREATE POLICY "Users can view their own documents" ON documents
    FOR SELECT USING (auth.uid()::text = metadata->>'user_id');

CREATE POLICY "Users can insert their own documents" ON documents
    FOR INSERT WITH CHECK (auth.uid()::text = metadata->>'user_id');

CREATE POLICY "Users can update their own documents" ON documents
    FOR UPDATE USING (auth.uid()::text = metadata->>'user_id');

-- Similar policies for other tables
CREATE POLICY "Users can view sections of their documents" ON text_sections
    FOR SELECT USING (
        document_id IN (
            SELECT id FROM documents WHERE auth.uid()::text = metadata->>'user_id'
        )
    );

CREATE POLICY "Users can view commentary of their documents" ON ai_commentary
    FOR SELECT USING (
        document_id IN (
            SELECT id FROM documents WHERE auth.uid()::text = metadata->>'user_id'
        )
    );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data insertion function
CREATE OR REPLACE FUNCTION create_sample_document(
    p_title TEXT,
    p_filename TEXT,
    p_content TEXT[]
)
RETURNS UUID AS $$
DECLARE
    doc_id UUID;
    section_id UUID;
    i INTEGER;
BEGIN
    -- Insert document
    INSERT INTO documents (title, filename, file_size, page_count, processing_status)
    VALUES (p_title, p_filename, 1024, array_length(p_content, 1), 'completed')
    RETURNING id INTO doc_id;
    
    -- Insert text sections
    FOR i IN 1..array_length(p_content, 1) LOOP
        INSERT INTO text_sections (document_id, page_number, content, order_index)
        VALUES (doc_id, i, p_content[i], i)
        RETURNING id INTO section_id;
        
        -- Insert sample AI commentary
        INSERT INTO ai_commentary (text_section_id, document_id, commentary_type, content, confidence_score)
        VALUES (
            section_id, 
            doc_id, 
            'summary', 
            'Bu bölüm ' || p_content[i] || ' hakkında önemli bilgiler içeriyor.',
            0.85
        );
    END LOOP;
    
    RETURN doc_id;
END;
$$ LANGUAGE plpgsql;
