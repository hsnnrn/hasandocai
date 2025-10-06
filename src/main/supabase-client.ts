import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client using the user's access token
 * This provides proper authentication for database operations
 */
export const getSupabaseClient = (accessToken: string, projectUrl: string): SupabaseClient => {
  // Use a placeholder anon key - you need to replace this with the real anon key from Supabase Dashboard
  // Go to Supabase Dashboard > Settings > API > Project API keys > anon public
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3ZXpneXFva255Z3BiY2ZwbmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5MDAwMDAsImV4cCI6MjA1MTQ3NjAwMH0.REPLACE_WITH_REAL_ANON_KEY';
  
  console.log('🔑 Creating Supabase client with:', {
    projectUrl,
    accessTokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : 'null',
    usingAnonKey: anonKey.includes('REPLACE_WITH_REAL_ANON_KEY') ? 'PLACEHOLDER' : 'REAL'
  });
  
  return createClient(projectUrl, anonKey, {
    global: { 
      headers: { 
        Authorization: `Bearer ${accessToken}` 
      } 
    },
    auth: {
      // Disable automatic session management since we're using manual token
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
};

/**
 * Create a Supabase client for a specific project using stored OAuth tokens
 */
export const createAuthenticatedSupabaseClient = async (projectId: string, projectUrl: string): Promise<SupabaseClient | null> => {
  try {
    const { getTokenStorage } = await import('./store');
    const tokenStorage = getTokenStorage();
    const tokens = await tokenStorage.getTokens();
    
    if (!tokens || tokens.expiresAt <= Date.now()) {
      console.error('❌ No valid access token available');
      return null;
    }
    
    // Try to get anon key from token storage first
    const authInfo = await tokenStorage.getAuthInfo();
    const anonKey = authInfo?.anonKey;
    
    if (anonKey) {
      console.log('✅ Using stored anon key for Supabase authentication');
      return createClient(projectUrl, anonKey, {
        global: { 
          headers: { 
            Authorization: `Bearer ${tokens.accessToken}` 
          } 
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      });
    } else {
      console.log('⚠️ No anon key found, using access token as anon key');
      return getSupabaseClient(tokens.accessToken, projectUrl);
    }
    
  } catch (error) {
    console.error('❌ Failed to create authenticated Supabase client:', error);
    return null;
  }
};

/**
 * Ensure project URL is properly formatted
 * Always constructs URL as https://{projectId}.supabase.co
 */
export const ensureValidProjectUrl = (projectId: string, existingUrl?: string): string => {
  // Always construct the URL properly using the project ID
  return `https://${projectId}.supabase.co`;
};
