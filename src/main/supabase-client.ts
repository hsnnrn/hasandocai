import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client using the user's access token
 * This provides proper authentication for database operations
 */
export const getSupabaseClient = (accessToken: string, projectUrl: string): SupabaseClient => {
  return createClient(projectUrl, accessToken, {
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
    
    console.log('✅ Using access token for Supabase authentication');
    return getSupabaseClient(tokens.accessToken, projectUrl);
    
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
