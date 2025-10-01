-- Migration: Enable RLS and create tenant isolation policies
-- Description: Enables Row Level Security and creates policies for tenant isolation
-- Up: Enables RLS and creates tenant-specific policies
-- Down: Disables RLS and drops tenant policies

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_commentary ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that allow all authenticated users
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON documents;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON text_sections;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON ai_commentary;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON embeddings;

-- Drop development policies
DROP POLICY IF EXISTS "Allow anonymous access for development" ON documents;
DROP POLICY IF EXISTS "Allow anonymous access for development" ON text_sections;
DROP POLICY IF EXISTS "Allow anonymous access for development" ON ai_commentary;
DROP POLICY IF EXISTS "Allow anonymous access for development" ON embeddings;

-- TENANTS TABLE POLICIES
-- Users can only see their own tenant
CREATE POLICY "select_own_tenant" ON tenants
  FOR SELECT USING (owner_id = auth.uid());

-- Users can insert their own tenant
CREATE POLICY "insert_own_tenant" ON tenants
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Users can update their own tenant
CREATE POLICY "update_own_tenant" ON tenants
  FOR UPDATE USING (owner_id = auth.uid());

-- Users cannot delete tenants (soft delete via settings if needed)
-- CREATE POLICY "delete_own_tenant" ON tenants
--   FOR DELETE USING (owner_id = auth.uid());

-- DOCUMENTS TABLE POLICIES
-- Users can only see documents from their tenant
CREATE POLICY "select_tenant_documents" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = documents.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

-- Users can insert documents to their tenant
CREATE POLICY "insert_tenant_documents" ON documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = documents.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

-- Users can update documents from their tenant
CREATE POLICY "update_tenant_documents" ON documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = documents.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

-- Users can delete documents from their tenant
CREATE POLICY "delete_tenant_documents" ON documents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = documents.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

-- TEXT_SECTIONS TABLE POLICIES
CREATE POLICY "select_tenant_text_sections" ON text_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = text_sections.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "insert_tenant_text_sections" ON text_sections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = text_sections.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "update_tenant_text_sections" ON text_sections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = text_sections.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "delete_tenant_text_sections" ON text_sections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = text_sections.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

-- AI_COMMENTARY TABLE POLICIES
CREATE POLICY "select_tenant_ai_commentary" ON ai_commentary
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = ai_commentary.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "insert_tenant_ai_commentary" ON ai_commentary
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = ai_commentary.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "update_tenant_ai_commentary" ON ai_commentary
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = ai_commentary.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "delete_tenant_ai_commentary" ON ai_commentary
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = ai_commentary.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

-- EMBEDDINGS TABLE POLICIES
CREATE POLICY "select_tenant_embeddings" ON embeddings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = embeddings.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "insert_tenant_embeddings" ON embeddings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = embeddings.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "update_tenant_embeddings" ON embeddings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = embeddings.tenant_id
        AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "delete_tenant_embeddings" ON embeddings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = embeddings.tenant_id
        AND t.owner_id = auth.uid()
    )
  );
