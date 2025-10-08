-- Supabase pgvector function for semantic search
-- This function enables vector similarity search for the RAG chatbot

-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the match_embeddings function
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.15,
  match_count INT DEFAULT 50
)
RETURNS TABLE (
  section_id TEXT,
  document_id TEXT,
  filename TEXT,
  content TEXT,
  page_number INT,
  section_title TEXT,
  content_type TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ts.id AS section_id,
    ts.document_id,
    d.filename,
    ts.content,
    ts.page_number,
    ts.section_title,
    ts.content_type,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM embeddings e
  JOIN text_sections ts ON ts.id = e.text_section_id
  JOIN documents d ON d.id = ts.document_id
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create index on embeddings for faster search (if not exists)
CREATE INDEX IF NOT EXISTS embeddings_vector_idx 
ON embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION match_embeddings TO anon, authenticated;

-- Example usage:
-- SELECT * FROM match_embeddings(
--   (SELECT embedding FROM embeddings LIMIT 1),
--   0.15,
--   10
-- );

