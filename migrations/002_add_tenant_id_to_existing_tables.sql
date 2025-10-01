-- Migration: Add tenant_id to existing tables for multi-tenant support
-- Description: Adds tenant_id column to documents, text_sections, ai_commentary, and embeddings tables
-- Up: Adds tenant_id foreign key to existing tables
-- Down: Removes tenant_id column from existing tables

-- Add tenant_id to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to text_sections table
ALTER TABLE text_sections 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to ai_commentary table
ALTER TABLE ai_commentary 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to embeddings table
ALTER TABLE embeddings 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add indexes for tenant_id columns
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_text_sections_tenant_id ON text_sections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_commentary_tenant_id ON ai_commentary(tenant_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_tenant_id ON embeddings(tenant_id);

-- Add comments
COMMENT ON COLUMN documents.tenant_id IS 'Tenant ID for multi-tenant isolation';
COMMENT ON COLUMN text_sections.tenant_id IS 'Tenant ID for multi-tenant isolation';
COMMENT ON COLUMN ai_commentary.tenant_id IS 'Tenant ID for multi-tenant isolation';
COMMENT ON COLUMN embeddings.tenant_id IS 'Tenant ID for multi-tenant isolation';
