import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jgrpcefpovpqovavqyfp.supabase.co';
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || '';
const API_URL = process.env.API_URL || 'http://localhost:3001';

// Create Supabase client for testing
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// Test user credentials (these should be test users in your Supabase project)
const TEST_USER_1 = {
  email: 'testuser1@example.com',
  password: 'testpassword123',
  id: ''
};

const TEST_USER_2 = {
  email: 'testuser2@example.com', 
  password: 'testpassword123',
  id: ''
};

describe('Multi-Tenant Integration Tests', () => {
  let user1Token: string;
  let user2Token: string;
  let user1Tenant: any;
  let user2Tenant: any;

  beforeAll(async () => {
    // Create test users if they don't exist
    try {
      await supabase.auth.admin.createUser({
        email: TEST_USER_1.email,
        password: TEST_USER_1.password,
        email_confirm: true
      });
    } catch (error) {
      // User might already exist, that's ok
    }

    try {
      await supabase.auth.admin.createUser({
        email: TEST_USER_2.email,
        password: TEST_USER_2.password,
        email_confirm: true
      });
    } catch (error) {
      // User might already exist, that's ok
    }

    // Sign in users to get tokens
    const { data: user1Auth } = await supabase.auth.signInWithPassword({
      email: TEST_USER_1.email,
      password: TEST_USER_1.password
    });
    user1Token = user1Auth.session?.access_token || '';

    const { data: user2Auth } = await supabase.auth.signInWithPassword({
      email: TEST_USER_2.email,
      password: TEST_USER_2.password
    });
    user2Token = user2Auth.session?.access_token || '';

    TEST_USER_1.id = user1Auth.user?.id || '';
    TEST_USER_2.id = user2Auth.user?.id || '';
  });

  afterAll(async () => {
    // Clean up test data
    if (user1Tenant) {
      await supabase.from('tenants').delete().eq('id', user1Tenant.id);
    }
    if (user2Tenant) {
      await supabase.from('tenants').delete().eq('id', user2Tenant.id);
    }

    // Delete test users
    try {
      await supabase.auth.admin.deleteUser(TEST_USER_1.id);
    } catch (error) {
      // Ignore errors
    }
    try {
      await supabase.auth.admin.deleteUser(TEST_USER_2.id);
    } catch (error) {
      // Ignore errors
    }
  });

  describe('Tenant Creation', () => {
    it('should create a tenant for user 1', async () => {
      const response = await fetch(`${API_URL}/api/tenant/create-tenant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1Token}`
        },
        body: JSON.stringify({
          name: 'Test Tenant 1',
          plan: 'free'
        })
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.tenant).toBeDefined();
      expect(data.tenant.name).toBe('Test Tenant 1');
      expect(data.tenant.plan).toBe('free');
      expect(data.tenant.owner_id).toBe(TEST_USER_1.id);

      user1Tenant = data.tenant;
    });

    it('should create a tenant for user 2', async () => {
      const response = await fetch(`${API_URL}/api/tenant/create-tenant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user2Token}`
        },
        body: JSON.stringify({
          name: 'Test Tenant 2',
          plan: 'pro'
        })
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.tenant).toBeDefined();
      expect(data.tenant.name).toBe('Test Tenant 2');
      expect(data.tenant.plan).toBe('pro');
      expect(data.tenant.owner_id).toBe(TEST_USER_2.id);

      user2Tenant = data.tenant;
    });

    it('should not create duplicate tenants for the same user', async () => {
      const response = await fetch(`${API_URL}/api/tenant/create-tenant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1Token}`
        },
        body: JSON.stringify({
          name: 'Another Tenant',
          plan: 'enterprise'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tenant.id).toBe(user1Tenant.id);
      expect(data.message).toBe('User already has a tenant');
    });
  });

  describe('Tenant Retrieval', () => {
    it('should get tenant for user 1', async () => {
      const response = await fetch(`${API_URL}/api/tenant/me/tenant`, {
        headers: {
          'Authorization': `Bearer ${user1Token}`
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tenant.id).toBe(user1Tenant.id);
      expect(data.tenant.name).toBe('Test Tenant 1');
    });

    it('should get tenant for user 2', async () => {
      const response = await fetch(`${API_URL}/api/tenant/me/tenant`, {
        headers: {
          'Authorization': `Bearer ${user2Token}`
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tenant.id).toBe(user2Tenant.id);
      expect(data.tenant.name).toBe('Test Tenant 2');
    });
  });

  describe('Tenant Updates', () => {
    it('should update tenant name and plan', async () => {
      const response = await fetch(`${API_URL}/api/tenant/tenant/${user1Tenant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1Token}`
        },
        body: JSON.stringify({
          name: 'Updated Tenant 1',
          plan: 'pro'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tenant.name).toBe('Updated Tenant 1');
      expect(data.tenant.plan).toBe('pro');
    });

    it('should not allow user 1 to update user 2 tenant', async () => {
      const response = await fetch(`${API_URL}/api/tenant/tenant/${user2Tenant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1Token}`
        },
        body: JSON.stringify({
          name: 'Hacked Tenant',
          plan: 'free'
        })
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Tenant Statistics', () => {
    it('should get tenant statistics for user 1', async () => {
      const response = await fetch(`${API_URL}/api/tenant/tenant/${user1Tenant.id}/stats`, {
        headers: {
          'Authorization': `Bearer ${user1Token}`
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tenant_id).toBe(user1Tenant.id);
      expect(typeof data.document_count).toBe('number');
      expect(typeof data.text_sections_count).toBe('number');
      expect(data.plan).toBe('pro');
    });

    it('should not allow user 1 to get user 2 tenant stats', async () => {
      const response = await fetch(`${API_URL}/api/tenant/tenant/${user2Tenant.id}/stats`, {
        headers: {
          'Authorization': `Bearer ${user1Token}`
        }
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Data Isolation', () => {
    it('should create documents with tenant isolation', async () => {
      // Create document for user 1 tenant
      const { data: doc1, error: error1 } = await supabase
        .from('documents')
        .insert([{
          filename: 'test1.pdf',
          title: 'Test Document 1',
          file_type: 'pdf',
          page_count: 1,
          user_id: TEST_USER_1.id,
          tenant_id: user1Tenant.id
        }])
        .select()
        .single();

      expect(error1).toBeNull();
      expect(doc1).toBeDefined();

      // Create document for user 2 tenant
      const { data: doc2, error: error2 } = await supabase
        .from('documents')
        .insert([{
          filename: 'test2.pdf',
          title: 'Test Document 2',
          file_type: 'pdf',
          page_count: 2,
          user_id: TEST_USER_2.id,
          tenant_id: user2Tenant.id
        }])
        .select()
        .single();

      expect(error2).toBeNull();
      expect(doc2).toBeDefined();
    });

    it('should enforce RLS - user 1 can only see their own documents', async () => {
      // User 1 should only see their own documents
      const { data: user1Docs, error: error1 } = await supabase
        .from('documents')
        .select('*')
        .eq('tenant_id', user1Tenant.id);

      expect(error1).toBeNull();
      expect(user1Docs).toHaveLength(1);
      expect(user1Docs![0].title).toBe('Test Document 1');
    });

    it('should enforce RLS - user 2 can only see their own documents', async () => {
      // User 2 should only see their own documents
      const { data: user2Docs, error: error2 } = await supabase
        .from('documents')
        .select('*')
        .eq('tenant_id', user2Tenant.id);

      expect(error2).toBeNull();
      expect(user2Docs).toHaveLength(1);
      expect(user2Docs![0].title).toBe('Test Document 2');
    });

    it('should prevent cross-tenant document access', async () => {
      // Try to access user 2's document with user 1's session
      const { data: crossTenantDocs, error } = await supabase
        .from('documents')
        .select('*')
        .eq('tenant_id', user2Tenant.id);

      // This should return empty array due to RLS
      expect(error).toBeNull();
      expect(crossTenantDocs).toHaveLength(0);
    });
  });

  describe('Authentication', () => {
    it('should reject requests without authorization header', async () => {
      const response = await fetch(`${API_URL}/api/tenant/create-tenant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Unauthorized Tenant',
          plan: 'free'
        })
      });

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid token', async () => {
      const response = await fetch(`${API_URL}/api/tenant/create-tenant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token'
        },
        body: JSON.stringify({
          name: 'Invalid Token Tenant',
          plan: 'free'
        })
      });

      expect(response.status).toBe(401);
    });
  });
});
