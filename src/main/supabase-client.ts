import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client using the user's access token and anon key
 * This provides proper authentication for database operations
 */
export const getSupabaseClient = (accessToken: string, projectUrl: string, anonKey: string): SupabaseClient => {
  console.log('🔑 Creating Supabase client with:', {
    projectUrl,
    accessTokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : 'null',
    anonKeyPreview: anonKey ? anonKey.substring(0, 20) + '...' : 'null',
    hasAnonKey: !!anonKey
  });
  
  if (!anonKey || anonKey.trim().length === 0) {
    throw new Error('Anon key is required. Please provide a valid anon key from Supabase Dashboard.');
  }
  
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
export const createAuthenticatedSupabaseClient = async (
  projectId: string, 
  projectUrl: string,
  anonKey?: string
): Promise<SupabaseClient | null> => {
  try {
    const { getTokenStorage } = await import('./store');
    const tokenStorage = getTokenStorage();
    const tokens = await tokenStorage.getTokens();
    
    if (!tokens || tokens.expiresAt <= Date.now()) {
      console.error('❌ No valid access token available');
      return null;
    }
    
    // Use provided anon key, or try to get from storage
    let finalAnonKey = anonKey;
    
    if (!finalAnonKey) {
      const authInfo = await tokenStorage.getAuthInfo();
      finalAnonKey = authInfo?.anonKey;
    }
    
    if (!finalAnonKey) {
      console.error('❌ No anon key available. Please provide an anon key.');
      throw new Error('Anon key is required for Supabase authentication. Please provide your project\'s anon key.');
    }
    
    console.log('✅ Creating Supabase client with anon key for authentication');
    return createClient(projectUrl, finalAnonKey, {
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
