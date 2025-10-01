-- Migration: Migrate existing data to tenant structure
-- Description: Creates default tenant for existing users and migrates existing data
-- Up: Creates tenant for existing users and assigns data to tenant
-- Down: Removes tenant assignments and deletes default tenants

-- Create a default tenant for existing users
-- This will create one tenant per unique user_id in the documents table
INSERT INTO tenants (owner_id, name, plan)
SELECT DISTINCT 
  user_id::uuid as owner_id,
  COALESCE(user_id, 'anonymous') || '-tenant' as name,
  'free' as plan
FROM documents 
WHERE user_id IS NOT NULL 
  AND user_id != 'anonymous'
  AND NOT EXISTS (
    SELECT 1 FROM tenants t WHERE t.owner_id = user_id::uuid
  );

-- Create a default tenant for anonymous users
INSERT INTO tenants (owner_id, name, plan)
SELECT 
  gen_random_uuid() as owner_id,
  'anonymous-tenant' as name,
  'free' as plan
WHERE EXISTS (
  SELECT 1 FROM documents WHERE user_id = 'anonymous' OR user_id IS NULL
)
AND NOT EXISTS (
  SELECT 1 FROM tenants WHERE name = 'anonymous-tenant'
);

-- Update documents table with tenant_id
UPDATE documents 
SET tenant_id = (
  CASE 
    WHEN user_id = 'anonymous' OR user_id IS NULL THEN
      (SELECT id FROM tenants WHERE name = 'anonymous-tenant' LIMIT 1)
    ELSE
      (SELECT id FROM tenants WHERE owner_id = user_id::uuid LIMIT 1)
  END
)
WHERE tenant_id IS NULL;

-- Update text_sections table with tenant_id
UPDATE text_sections 
SET tenant_id = (
  SELECT d.tenant_id 
  FROM documents d 
  WHERE d.id = text_sections.document_id
)
WHERE tenant_id IS NULL;

-- Update ai_commentary table with tenant_id
UPDATE ai_commentary 
SET tenant_id = (
  SELECT d.tenant_id 
  FROM documents d 
  WHERE d.id = ai_commentary.document_id
)
WHERE tenant_id IS NULL;

-- Update embeddings table with tenant_id
UPDATE embeddings 
SET tenant_id = (
  SELECT d.tenant_id 
  FROM documents d 
  WHERE d.id = embeddings.document_id
)
WHERE tenant_id IS NULL;
