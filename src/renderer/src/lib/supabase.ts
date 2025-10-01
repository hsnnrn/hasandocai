import { createClient } from '@supabase/supabase-js'

// Supabase configuration - will be loaded dynamically
let supabaseUrl = 'https://jgrpcefpovpqovavqyfp.supabase.co'
let supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpncnBjZWZwb3ZwcW92YXZxeWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTQxMjMsImV4cCI6MjA3NDM5MDEyM30.wGIb2wtVL0ZaFOtqPy3n7WTYq4MxY3EgVwMEGdiCvQo'

// Load configuration from main process
const loadSupabaseConfig = async () => {
  try {
    if (window.supabaseAPI && window.supabaseAPI.getSupabaseConfig) {
      const result = await window.supabaseAPI.getSupabaseConfig();
      if (result.success && result.config) {
        supabaseUrl = result.config.url;
        supabaseAnonKey = result.config.anonKey;
        console.log('✅ Supabase config loaded from main process');
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to load Supabase config from main process:', error);
  }
};

// Initialize config on module load
loadSupabaseConfig();

// For development, you can use these demo credentials:
// URL: https://demo.supabase.co
// Key: demo-key

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable automatic session refresh
    autoRefreshToken: true,
    // Persist session in localStorage
    persistSession: true,
    // Detect session in URL
    detectSessionInUrl: true
  }
})

// Auth helper functions
export const auth = {
  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  // Sign up with email and password
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })
    return { data, error }
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current session
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  // Get current user
  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Listen to auth changes
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Tenant management functions
export const tenant = {
  // Create a new tenant for the current user
  createTenant: async (name?: string, plan: string = 'free') => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No active session found')
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/tenant/create-tenant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ name, plan })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create tenant')
    }

    return await response.json()
  },

  // Get current user's tenant
  getCurrentTenant: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No active session found')
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/tenant/me/tenant`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null // No tenant found
      }
      const error = await response.json()
      throw new Error(error.error || 'Failed to get tenant')
    }

    return await response.json()
  },

  // Update tenant information
  updateTenant: async (tenantId: string, updates: { name?: string; plan?: string; settings?: any }) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No active session found')
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/tenant/tenant/${tenantId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update tenant')
    }

    return await response.json()
  },

  // Get tenant statistics
  getTenantStats: async (tenantId: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No active session found')
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/tenant/tenant/${tenantId}/stats`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to get tenant stats')
    }

    return await response.json()
  }
}

// Tenant-aware data operations
export const tenantData = {
  // Create a document with tenant_id
  createDocument: async (documentData: any, tenantId: string) => {
    const { data, error } = await supabase
      .from('documents')
      .insert([{ ...documentData, tenant_id: tenantId }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get documents for a tenant
  getDocuments: async (tenantId: string, options?: { limit?: number; offset?: number }) => {
    let query = supabase
      .from('documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (options?.limit) {
      query = query.limit(options.limit)
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  // Create text sections with tenant_id
  createTextSection: async (sectionData: any, tenantId: string) => {
    const { data, error } = await supabase
      .from('text_sections')
      .insert([{ ...sectionData, tenant_id: tenantId }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get text sections for a document (tenant-aware)
  getTextSections: async (documentId: string, tenantId: string) => {
    const { data, error } = await supabase
      .from('text_sections')
      .select('*')
      .eq('document_id', documentId)
      .eq('tenant_id', tenantId)
      .order('order_index')
    
    if (error) throw error
    return data
  },

  // Create AI commentary with tenant_id
  createAICommentary: async (commentaryData: any, tenantId: string) => {
    const { data, error } = await supabase
      .from('ai_commentary')
      .insert([{ ...commentaryData, tenant_id: tenantId }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get AI commentary for a text section (tenant-aware)
  getAICommentary: async (textSectionId: string, tenantId: string) => {
    const { data, error } = await supabase
      .from('ai_commentary')
      .select('*')
      .eq('text_section_id', textSectionId)
      .eq('tenant_id', tenantId)
      .order('created_at')
    
    if (error) throw error
    return data
  }
}
