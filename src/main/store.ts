// Optional keytar import with fallback
let keytar: any = null;
try {
  keytar = require('keytar');
} catch (error) {
  console.warn('Keytar not available, using electron-store only:', error);
}

const Store = require('electron-store');

/**
 * Token storage interface
 */
export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
  scope: string;
}

/**
 * Auth info interface
 */
export interface AuthInfo {
  selectedOrg?: {
    id: string;
    name: string;
  };
  selectedProject?: {
    id: string;
    name: string;
    ref: string;
  };
  lastAuthTime?: number;
  anonKey?: string;
}

/**
 * Storage status interface
 */
export interface StorageStatus {
  hasTokens: boolean;
  isTokenValid: boolean;
  tokenExpiry?: number;
  storageMethod: 'keytar' | 'electron-store' | 'none';
}

/**
 * Token storage class with keytar and electron-store fallback
 */
export class TokenStorage {
  private store: any;
  private serviceName: string;
  private accountName: string;
  private useKeytar: boolean;

  constructor(serviceName: string = 'DocDataApp', accountName: string = 'supabase-oauth') {
    this.serviceName = serviceName;
    this.accountName = accountName;
    this.store = new Store({
      name: 'supabase-oauth',
      encryptionKey: 'supabase-oauth-key' // In production, use a more secure key
    });
    this.useKeytar = true;
  }

  /**
   * Test keytar availability
   */
  private async testKeytar(): Promise<boolean> {
    if (!keytar) {
      console.warn('Keytar module not loaded, using electron-store only');
      return false;
    }
    
    try {
      await keytar.setPassword(this.serviceName, 'test', 'test');
      await keytar.deletePassword(this.serviceName, 'test');
      return true;
    } catch (error) {
      console.warn('Keytar not available, falling back to electron-store:', error);
      return false;
    }
  }

  /**
   * Save tokens securely
   */
  async saveTokens(tokens: TokenData): Promise<void> {
    try {
      const tokenData = JSON.stringify(tokens);
      
      if (this.useKeytar) {
        const keytarAvailable = await this.testKeytar();
        if (keytarAvailable) {
          await keytar.setPassword(this.serviceName, this.accountName, tokenData);
          console.log('Tokens saved to keytar');
          return;
        } else {
          this.useKeytar = false;
        }
      }

      // Fallback to electron-store
      this.store.set('tokens', tokens);
      console.log('Tokens saved to electron-store (fallback)');
      
    } catch (error) {
      console.error('Failed to save tokens:', error);
      throw new Error('Failed to save tokens securely');
    }
  }

  /**
   * Get stored tokens
   */
  async getTokens(): Promise<TokenData | null> {
    try {
      if (this.useKeytar) {
        const keytarAvailable = await this.testKeytar();
        if (keytarAvailable) {
          const tokenData = await keytar.getPassword(this.serviceName, this.accountName);
          if (tokenData) {
            return JSON.parse(tokenData);
          }
        } else {
          this.useKeytar = false;
        }
      }

      // Fallback to electron-store
      const tokens = this.store.get('tokens') as TokenData | undefined;
      return tokens || null;
      
    } catch (error) {
      console.error('Failed to get tokens:', error);
      return null;
    }
  }

  /**
   * Delete stored tokens
   */
  async deleteTokens(): Promise<void> {
    try {
      if (this.useKeytar) {
        const keytarAvailable = await this.testKeytar();
        if (keytarAvailable) {
          await keytar.deletePassword(this.serviceName, this.accountName);
        }
      }

      // Also remove from electron-store
      this.store.delete('tokens');
      console.log('Tokens deleted');
      
    } catch (error) {
      console.error('Failed to delete tokens:', error);
      throw new Error('Failed to delete tokens');
    }
  }

  /**
   * Save auth info (org/project selection)
   */
  async saveAuthInfo(authInfo: AuthInfo): Promise<void> {
    try {
      this.store.set('authInfo', authInfo);
      console.log('Auth info saved');
    } catch (error) {
      console.error('Failed to save auth info:', error);
      throw new Error('Failed to save auth info');
    }
  }

  /**
   * Get auth info
   */
  async getAuthInfo(): Promise<AuthInfo | null> {
    try {
      const authInfo = this.store.get('authInfo') as AuthInfo | undefined;
      return authInfo || null;
    } catch (error) {
      console.error('Failed to get auth info:', error);
      return null;
    }
  }

  /**
   * Clear all stored data
   */
  async clearAll(): Promise<void> {
    try {
      await this.deleteTokens();
      this.store.delete('authInfo');
      console.log('All auth data cleared');
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw new Error('Failed to clear all data');
    }
  }

  /**
   * Get storage status
   */
  async getStorageStatus(): Promise<StorageStatus> {
    try {
      const tokens = await this.getTokens();
      const hasTokens = !!tokens;
      const isTokenValid = hasTokens && tokens.expiresAt > Date.now();
      
      return {
        hasTokens,
        isTokenValid,
        tokenExpiry: tokens?.expiresAt,
        storageMethod: this.useKeytar ? 'keytar' : 'electron-store'
      };
    } catch (error) {
      console.error('Failed to get storage status:', error);
      return {
        hasTokens: false,
        isTokenValid: false,
        storageMethod: 'none'
      };
    }
  }

  /**
   * Check if tokens are expired
   */
  async areTokensExpired(): Promise<boolean> {
    try {
      const tokens = await this.getTokens();
      if (!tokens) return true;
      return tokens.expiresAt <= Date.now();
    } catch (error) {
      console.error('Failed to check token expiry:', error);
      return true;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<TokenData | null> {
    try {
      const tokens = await this.getTokens();
      if (!tokens || !tokens.refreshToken) {
        return null;
      }

      const refreshData = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
        client_id: process.env.SUPABASE_OAUTH_CLIENT_ID || ''
      });

      const response = await fetch('https://api.supabase.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: refreshData
      });

      if (!response.ok) {
        console.error('Token refresh failed:', response.status, response.statusText);
        return null;
      }

      const tokenResponse = await response.json();
      const newTokens: TokenData = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || tokens.refreshToken,
        expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
        tokenType: tokenResponse.token_type || 'Bearer',
        scope: tokenResponse.scope || tokens.scope
      };

      await this.saveTokens(newTokens);
      console.log('Access token refreshed successfully');
      return newTokens;

    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }
}

/**
 * Create default token storage instance
 */
export function createDefaultTokenStorage(): TokenStorage {
  const serviceName = process.env.SERVICE_NAME || 'DocDataApp';
  return new TokenStorage(serviceName);
}

/**
 * Token storage singleton
 */
let tokenStorageInstance: TokenStorage | null = null;

export function getTokenStorage(): TokenStorage {
  if (!tokenStorageInstance) {
    tokenStorageInstance = createDefaultTokenStorage();
  }
  return tokenStorageInstance;
}

/**
 * Get selected project from OAuth flow
 */
export async function getSelectedProject(): Promise<any> {
  try {
    const storage = getTokenStorage();
    const authInfo = await storage.getAuthInfo();
    
    console.log('🔍 getSelectedProject - Auth info:', authInfo);
    console.log('🔍 getSelectedProject - Selected project:', authInfo?.selectedProject);
    
    if (authInfo?.selectedProject) {
      console.log('✅ Selected project from OAuth:', authInfo.selectedProject);
      return authInfo.selectedProject;
    }
    
    console.log('❌ No selected project found in OAuth flow');
    return null;
  } catch (error) {
    console.error('❌ Failed to get selected project:', error);
    return null;
  }
}