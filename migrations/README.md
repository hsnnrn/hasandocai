# Database Migrations

This directory contains SQL migration files for the multi-tenant architecture implementation.

## Migration Files

### 001_create_tenants.sql
- Creates the `tenants` table for multi-tenant isolation
- Adds indexes for performance
- Creates trigger for `updated_at` timestamp

### 002_add_tenant_id_to_existing_tables.sql
- Adds `tenant_id` column to existing tables:
  - `documents`
  - `text_sections`
  - `ai_commentary`
  - `embeddings`
- Creates foreign key relationships to `tenants` table
- Adds indexes for tenant_id columns

### 003_enable_rls_and_policies.sql
- Enables Row Level Security (RLS) on all tables
- Creates tenant-specific policies for data isolation
- Removes old permissive policies
- Ensures users can only access their own tenant's data

### 004_migrate_existing_data.sql
- Migrates existing data to tenant structure
- Creates default tenants for existing users
- Assigns existing records to appropriate tenants
- Handles anonymous users with a default tenant

## Running Migrations

### Using Supabase CLI
```bash
# Apply all migrations
supabase db push

# Apply specific migration
supabase db push --file migrations/001_create_tenants.sql
```

### Using Supabase Dashboard
1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste each migration file content
4. Execute in order (001, 002, 003, 004)

### Using psql (if you have direct database access)
```bash
psql -h your-db-host -U postgres -d postgres -f migrations/001_create_tenants.sql
psql -h your-db-host -U postgres -d postgres -f migrations/002_add_tenant_id_to_existing_tables.sql
psql -h your-db-host -U postgres -d postgres -f migrations/003_enable_rls_and_policies.sql
psql -h your-db-host -U postgres -d postgres -f migrations/004_migrate_existing_data.sql
```

## Rollback Instructions

To rollback the migrations:

1. **004_migrate_existing_data.sql**: No rollback needed (data migration only)
2. **003_enable_rls_and_policies.sql**: 
   ```sql
   -- Disable RLS
   ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
   ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
   ALTER TABLE text_sections DISABLE ROW LEVEL SECURITY;
   ALTER TABLE ai_commentary DISABLE ROW LEVEL SECURITY;
   ALTER TABLE embeddings DISABLE ROW LEVEL SECURITY;
   
   -- Drop all policies (they will be recreated if needed)
   DROP POLICY IF EXISTS "select_own_tenant" ON tenants;
   -- ... (drop all other policies)
   ```
3. **002_add_tenant_id_to_existing_tables.sql**:
   ```sql
   -- Remove tenant_id columns
   ALTER TABLE documents DROP COLUMN IF EXISTS tenant_id;
   ALTER TABLE text_sections DROP COLUMN IF EXISTS tenant_id;
   ALTER TABLE ai_commentary DROP COLUMN IF EXISTS tenant_id;
   ALTER TABLE embeddings DROP COLUMN IF EXISTS tenant_id;
   ```
4. **001_create_tenants.sql**:
   ```sql
   DROP TABLE IF EXISTS tenants CASCADE;
   ```

## Testing Migrations

After applying migrations, test the following:

1. **Tenant Creation**: Create a new tenant via the API
2. **Data Isolation**: Ensure users can only see their own tenant's data
3. **RLS Policies**: Verify that cross-tenant data access is blocked
4. **Existing Data**: Confirm existing data is properly assigned to tenants

## Security Notes

- RLS policies ensure complete data isolation between tenants
- Service role key should never be exposed to frontend
- All tenant operations require proper authentication
- Anonymous access is removed in favor of tenant-based access
