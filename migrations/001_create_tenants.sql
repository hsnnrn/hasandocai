-- Migration: Create tenants table for multi-tenant architecture
-- Description: Adds tenants table to support multi-tenant isolation with RLS
-- Up: Creates tenants table with owner_id linking to Supabase auth
-- Down: Drops tenants table

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL, -- Supabase auth uid
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON tenants(created_at);

-- Add comments
COMMENT ON TABLE tenants IS 'Tenant information for multi-tenant isolation';
COMMENT ON COLUMN tenants.owner_id IS 'Supabase auth user ID who owns this tenant';
COMMENT ON COLUMN tenants.name IS 'Display name for the tenant';
COMMENT ON COLUMN tenants.plan IS 'Subscription plan (free, pro, enterprise)';
COMMENT ON COLUMN tenants.settings IS 'Tenant-specific configuration settings';

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_tenants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_tenants_updated_at();
