# Multi-Tenant Architecture with Row Level Security (RLS)

## 🎯 Overview

This PR transforms the Document Converter application into a multi-tenant architecture using Supabase Row Level Security (RLS) for complete data isolation between tenants. Users no longer need API keys - the system automatically provisions tenants and ensures secure data separation.

## 🚀 Key Changes

### 1. Database Migrations (`migrations/`)
- **`001_create_tenants.sql`**: Creates tenants table with owner_id linking to Supabase auth
- **`002_add_tenant_id_to_existing_tables.sql`**: Adds tenant_id column to all existing tables
- **`003_enable_rls_and_policies.sql`**: Enables RLS and creates tenant-specific security policies
- **`004_migrate_existing_data.sql`**: Migrates existing data to tenant structure

### 2. Backend API Server (`server/`)
- **Express.js API server** with TypeScript support
- **Tenant provisioning endpoints**: Create, read, update tenant information
- **JWT authentication** with Supabase token validation
- **CORS configuration** for secure cross-origin requests
- **Error handling** and input validation

#### API Endpoints:
- `POST /api/tenant/create-tenant` - Create new tenant
- `GET /api/tenant/me/tenant` - Get current user's tenant
- `PUT /api/tenant/tenant/:id` - Update tenant information
- `GET /api/tenant/tenant/:id/stats` - Get tenant statistics

### 3. Frontend Updates (`src/renderer/src/`)
- **Enhanced Supabase client** with tenant-aware operations
- **TenantManager component** for tenant creation and management
- **TenantAwareDocumentCreator** for creating tenant-scoped documents
- **New Tenant page** with tabbed interface
- **Updated navigation** with tenant management link

### 4. Security Implementation
- **Row Level Security (RLS)** policies on all database tables
- **Complete data isolation** between tenants
- **Service role key protection** (never exposed to frontend)
- **JWT token validation** on all API endpoints
- **Input sanitization** and permission validation

### 5. Testing (`tests/integration/`)
- **Comprehensive integration tests** for tenant functionality
- **Data isolation verification** tests
- **Authentication and authorization** tests
- **Cross-tenant security** validation
- **API endpoint testing** with real Supabase integration

## 📋 Implementation Details

### Database Schema Changes
```sql
-- New tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL, -- Supabase auth uid
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Updated existing tables with tenant_id
ALTER TABLE documents ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE text_sections ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE ai_commentary ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE embeddings ADD COLUMN tenant_id UUID REFERENCES tenants(id);
```

### RLS Policies
```sql
-- Example policy for documents table
CREATE POLICY "select_tenant_documents" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = documents.tenant_id
        AND t.owner_id = auth.uid()
    )
  );
```

### Frontend Tenant Operations
```typescript
// Create tenant-aware document
const document = await tenantData.createDocument({
  filename: 'test.pdf',
  title: 'Test Document',
  file_type: 'pdf',
  page_count: 1
}, tenantId);

// Get tenant-specific documents
const documents = await tenantData.getDocuments(tenantId);
```

## 🔒 Security Features

### Data Isolation
- **Complete tenant separation**: Users can only access their own tenant's data
- **Database-level security**: RLS policies enforce isolation at the database level
- **API-level validation**: All endpoints verify tenant ownership before operations

### Authentication & Authorization
- **JWT token validation**: All API requests require valid Supabase JWT tokens
- **Service role protection**: Backend service role key never exposed to frontend
- **CORS configuration**: Restricted origins for API endpoints

### Environment Security
```bash
# Required environment variables
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE=your-service-role-key  # Backend only
SUPABASE_ANON_KEY=your-anon-key             # Frontend safe
VITE_API_URL=http://localhost:3001           # Backend API URL
```

## 🧪 Testing

### Integration Tests
- **Tenant creation and management** tests
- **Data isolation verification** tests
- **Cross-tenant security** validation
- **API authentication** tests
- **RLS policy enforcement** tests

### Test Coverage
```bash
# Run integration tests
npm test -- tests/integration/

# Run specific tenant tests
npm test -- tests/integration/tenant.test.ts
```

## 📦 New Dependencies

### Backend Dependencies
- `express` - Web framework
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variable management
- `@supabase/supabase-js` - Supabase client

### Development Dependencies
- `tsx` - TypeScript execution
- `node-fetch` - HTTP client for tests
- `@types/node-fetch` - TypeScript definitions

## 🚀 Deployment Instructions

### 1. Database Setup
```bash
# Apply migrations in Supabase SQL Editor (in order):
# 1. migrations/001_create_tenants.sql
# 2. migrations/002_add_tenant_id_to_existing_tables.sql
# 3. migrations/003_enable_rls_and_policies.sql
# 4. migrations/004_migrate_existing_data.sql
```

### 2. Environment Configuration
```bash
# Copy environment template
cp env.example .env.local

# Configure required variables
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001
```

### 3. Development Setup
```bash
# Install dependencies (includes server)
npm install

# Start all services
npm run dev

# Individual services
npm run dev:renderer  # Frontend
npm run dev:main      # Electron main process
npm run dev:server    # Backend API
```

### 4. Production Build
```bash
# Build all components
npm run build

# Build specific platform
npm run build:windows
npm run build:mac
npm run build:linux
```

## 🔄 Migration Strategy

### Existing Data Migration
The `004_migrate_existing_data.sql` migration automatically:
1. Creates a default tenant for existing users
2. Assigns existing documents to appropriate tenants
3. Handles anonymous users with a default tenant
4. Preserves all existing data relationships

### Rollback Plan
If rollback is needed:
1. **Disable RLS**: `ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;`
2. **Remove tenant_id columns**: `ALTER TABLE table_name DROP COLUMN tenant_id;`
3. **Drop tenants table**: `DROP TABLE tenants CASCADE;`
4. **Restore old policies**: Re-enable previous RLS policies if needed

## 📊 Performance Impact

### Database Performance
- **Minimal impact**: Additional `tenant_id` column with proper indexing
- **Optimized queries**: RLS policies use efficient EXISTS clauses
- **Index strategy**: Composite indexes on `(tenant_id, created_at)` for common queries

### API Performance
- **Fast authentication**: JWT token validation with Supabase
- **Efficient queries**: Tenant-scoped queries reduce data transfer
- **Caching potential**: Tenant information can be cached client-side

## 🎯 User Experience

### Seamless Transition
- **Automatic tenant creation**: Users get tenants on first login
- **No API key required**: System handles tenant provisioning automatically
- **Familiar interface**: Existing UI enhanced with tenant management
- **Backward compatibility**: Existing users' data is preserved

### New Features
- **Tenant management page**: Create, update, and view tenant information
- **Tenant-aware document creation**: Documents automatically scoped to tenant
- **Usage statistics**: Per-tenant document and usage metrics
- **Plan management**: Support for different subscription plans

## 🔍 Verification Checklist

### Security Verification
- ✅ RLS policies enabled on all tables
- ✅ Service role key protected (backend only)
- ✅ Cross-tenant data access blocked
- ✅ JWT token validation working
- ✅ CORS configured correctly

### Functionality Verification
- ✅ Tenant creation working
- ✅ Document creation with tenant_id
- ✅ Data isolation enforced
- ✅ API endpoints responding
- ✅ Frontend components rendering

### Testing Verification
- ✅ Integration tests passing
- ✅ Data isolation tests passing
- ✅ Authentication tests passing
- ✅ Cross-tenant security tests passing

## 🚨 Breaking Changes

### Database Schema
- **New required column**: `tenant_id` added to all data tables
- **RLS enabled**: Previous permissive policies replaced with tenant-specific policies
- **Migration required**: Existing data must be migrated to tenant structure

### API Changes
- **New backend server**: Additional Express.js server required
- **Environment variables**: New required environment variables
- **Authentication**: All API requests now require JWT tokens

### Frontend Changes
- **New dependencies**: Additional UI components and tenant management
- **Navigation**: New tenant management page added
- **Data operations**: All data operations now tenant-aware

## 📝 Future Enhancements

### Planned Features
- **Multi-tenant admin panel**: Manage multiple tenants
- **Tenant analytics**: Advanced usage analytics and reporting
- **Plan upgrades**: Seamless plan upgrade/downgrade
- **Tenant sharing**: Collaborative features within tenants

### Scalability Considerations
- **Database partitioning**: Future partitioning by tenant_id
- **Caching layer**: Redis caching for tenant data
- **API rate limiting**: Per-tenant rate limiting
- **Background jobs**: Tenant-specific background processing

---

## 🎉 Summary

This PR successfully implements a complete multi-tenant architecture with Row Level Security, providing:

1. **Complete data isolation** between tenants
2. **Automatic tenant provisioning** for new users
3. **Secure API endpoints** with JWT authentication
4. **Comprehensive testing** with integration tests
5. **Seamless user experience** with familiar interface
6. **Production-ready security** with RLS policies

The implementation follows security best practices and provides a solid foundation for scaling the application to support multiple tenants with complete data isolation.
