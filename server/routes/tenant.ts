import express from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';

const router = express.Router();

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE');
  process.exit(1);
}

// Create Supabase client with service role for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Middleware for CORS
router.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Replace with your production domain
    : ['http://localhost:3000', 'http://localhost:5173'], // Development origins
  credentials: true
}));

// Middleware for JSON parsing
router.use(express.json());

// Helper function to verify JWT token and get user
async function verifyToken(authHeader: string) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid authorization header');
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid token');
  }

  return user;
}

/**
 * POST /create-tenant
 * Creates a new tenant for the authenticated user
 * Body: { name?: string, plan?: string }
 * Headers: Authorization: Bearer <access_token>
 */
router.post('/create-tenant', async (req, res) => {
  try {
    const user = await verifyToken(req.headers.authorization!);
    
    const { name, plan = 'free' } = req.body;
    const tenantName = name || `${user.email?.split('@')[0] || 'user'}-tenant`;

    // Check if user already has a tenant
    const { data: existingTenant, error: checkError } = await supabase
      .from('tenants')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing tenant:', checkError);
      return res.status(500).json({ error: 'Failed to check existing tenant' });
    }

    if (existingTenant) {
      return res.status(200).json({ 
        tenant: existingTenant,
        message: 'User already has a tenant'
      });
    }

    // Create new tenant
    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert({
        owner_id: user.id,
        name: tenantName,
        plan: plan,
        settings: {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tenant:', error);
      return res.status(500).json({ error: 'Failed to create tenant' });
    }

    console.log(`✅ Created tenant ${tenant.id} for user ${user.id}`);
    return res.status(201).json({ tenant });
    
  } catch (error) {
    console.error('Create tenant error:', error);
    if (error instanceof Error && error.message === 'Invalid authorization header') {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    if (error instanceof Error && error.message === 'Invalid token') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /me/tenant
 * Gets the tenant information for the authenticated user
 * Headers: Authorization: Bearer <access_token>
 */
router.get('/me/tenant', async (req, res) => {
  try {
    const user = await verifyToken(req.headers.authorization!);
    
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return res.status(404).json({ error: 'No tenant found for user' });
      }
      console.error('Error fetching tenant:', error);
      return res.status(500).json({ error: 'Failed to fetch tenant' });
    }

    return res.status(200).json({ tenant });
    
  } catch (error) {
    console.error('Get tenant error:', error);
    if (error instanceof Error && error.message === 'Invalid authorization header') {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    if (error instanceof Error && error.message === 'Invalid token') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /tenant/:id
 * Updates tenant information (only owner can update)
 * Headers: Authorization: Bearer <access_token>
 * Body: { name?: string, plan?: string, settings?: object }
 */
router.put('/tenant/:id', async (req, res) => {
  try {
    const user = await verifyToken(req.headers.authorization!);
    const { id } = req.params;
    const { name, plan, settings } = req.body;

    // Verify ownership
    const { data: existingTenant, error: checkError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .eq('owner_id', user.id)
      .single();

    if (checkError || !existingTenant) {
      return res.status(404).json({ error: 'Tenant not found or access denied' });
    }

    // Update tenant
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (plan !== undefined) updateData.plan = plan;
    if (settings !== undefined) updateData.settings = settings;

    const { data: tenant, error } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating tenant:', error);
      return res.status(500).json({ error: 'Failed to update tenant' });
    }

    return res.status(200).json({ tenant });
    
  } catch (error) {
    console.error('Update tenant error:', error);
    if (error instanceof Error && error.message === 'Invalid authorization header') {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    if (error instanceof Error && error.message === 'Invalid token') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /tenant/:id/stats
 * Gets tenant statistics (document count, etc.)
 * Headers: Authorization: Bearer <access_token>
 */
router.get('/tenant/:id/stats', async (req, res) => {
  try {
    const user = await verifyToken(req.headers.authorization!);
    const { id } = req.params;

    // Verify ownership
    const { data: existingTenant, error: checkError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .eq('owner_id', user.id)
      .single();

    if (checkError || !existingTenant) {
      return res.status(404).json({ error: 'Tenant not found or access denied' });
    }

    // Get document count
    const { count: documentCount, error: docError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', id);

    if (docError) {
      console.error('Error counting documents:', docError);
      return res.status(500).json({ error: 'Failed to get document count' });
    }

    // Get text sections count
    const { count: textSectionsCount, error: textError } = await supabase
      .from('text_sections')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', id);

    if (textError) {
      console.error('Error counting text sections:', textError);
      return res.status(500).json({ error: 'Failed to get text sections count' });
    }

    return res.status(200).json({
      tenant_id: id,
      document_count: documentCount || 0,
      text_sections_count: textSectionsCount || 0,
      created_at: existingTenant.created_at,
      plan: existingTenant.plan
    });
    
  } catch (error) {
    console.error('Get tenant stats error:', error);
    if (error instanceof Error && error.message === 'Invalid authorization header') {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    if (error instanceof Error && error.message === 'Invalid token') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
