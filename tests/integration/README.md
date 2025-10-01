# Integration Tests

This directory contains integration tests for the multi-tenant functionality.

## Setup

### Prerequisites

1. **Supabase Project**: You need a Supabase project with the migrations applied
2. **Environment Variables**: Set up the following environment variables:
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE=your-service-role-key
   API_URL=http://localhost:3001
   ```

### Test Users

The tests create and use two test users:
- `testuser1@example.com` - For tenant isolation testing
- `testuser2@example.com` - For cross-tenant security testing

## Running Tests

### Run All Integration Tests
```bash
npm test -- tests/integration/
```

### Run Specific Test File
```bash
npm test -- tests/integration/tenant.test.ts
```

### Run with Coverage
```bash
npm run test:coverage -- tests/integration/
```

## Test Categories

### 1. Tenant Creation Tests
- ✅ Create tenant for authenticated user
- ✅ Prevent duplicate tenant creation
- ✅ Validate tenant ownership

### 2. Tenant Retrieval Tests
- ✅ Get current user's tenant
- ✅ Handle missing tenant gracefully
- ✅ Validate tenant ownership

### 3. Tenant Update Tests
- ✅ Update tenant information (name, plan)
- ✅ Prevent cross-tenant updates
- ✅ Validate ownership before updates

### 4. Tenant Statistics Tests
- ✅ Get tenant document counts
- ✅ Get tenant text sections counts
- ✅ Prevent cross-tenant statistics access

### 5. Data Isolation Tests
- ✅ Create documents with tenant_id
- ✅ Enforce RLS policies
- ✅ Prevent cross-tenant data access
- ✅ Validate tenant-scoped queries

### 6. Authentication Tests
- ✅ Reject requests without authorization
- ✅ Reject requests with invalid tokens
- ✅ Validate JWT token claims

## Test Data Cleanup

Tests automatically clean up after themselves:
- Delete created tenants
- Delete created documents
- Delete test users

## Debugging Tests

### Enable Verbose Logging
```bash
npm test -- tests/integration/tenant.test.ts --verbose
```

### Run Single Test
```bash
npm test -- tests/integration/tenant.test.ts -t "should create a tenant for user 1"
```

### Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest tests/integration/tenant.test.ts
```

## Troubleshooting

### Common Issues

1. **Supabase Connection Errors**
   - Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE are correct
   - Check if Supabase project is accessible
   - Ensure migrations have been applied

2. **API Server Not Running**
   - Start the backend server: `npm run dev:server`
   - Verify API_URL points to the correct server
   - Check server logs for errors

3. **Authentication Failures**
   - Verify test users exist in Supabase
   - Check if users are confirmed (email_confirm: true)
   - Ensure passwords are correct

4. **RLS Policy Issues**
   - Verify migrations were applied correctly
   - Check RLS policies in Supabase dashboard
   - Ensure policies are enabled on all tables

### Manual Testing

You can manually test the API endpoints:

```bash
# Create tenant
curl -X POST http://localhost:3001/api/tenant/create-tenant \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"name": "Test Tenant", "plan": "free"}'

# Get tenant
curl http://localhost:3001/api/tenant/me/tenant \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get tenant stats
curl http://localhost:3001/api/tenant/tenant/TENANT_ID/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Include proper cleanup in `afterAll`
3. Test both success and failure scenarios
4. Add descriptive test names
5. Include comments for complex test logic
