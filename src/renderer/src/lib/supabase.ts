import { createClient } from '@supabase/supabase-js'

// Supabase configuration - will be loaded dynamically
let supabaseUrl = 'https://your-project-ref.supabase.co'
let supabaseAnonKey = 'your-anon-key'

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

// Function to update Supabase client with new URL and key
export const updateSupabaseConfig = async (url: string, anonKey: string) => {
  supabaseUrl = url;
  supabaseAnonKey = anonKey;
  
  // Recreate the client with new config
  const newClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
  
  // Update the exported client
  Object.assign(supabase, newClient);
  
  console.log('✅ Supabase client updated with new config:', { url, anonKey: anonKey.substring(0, 20) + '...' });
};

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
