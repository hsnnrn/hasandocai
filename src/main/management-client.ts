import { TokenStorage } from './store';

/**
 * Supabase Management API Client
 * Handles API calls to Supabase Management API for organizations, projects, etc.
 */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  billing_email?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  ref: string;
  organization_id: string;
  status: string;
  region: string;
  created_at: string;
  updated_at: string;
  database_url?: string;
  anon_key?: string;
  service_role_key?: string;
}

export interface APIKeys {
  anon: string;
  service_role: string;
}

export interface DatabaseInfo {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  user_metadata: Record<string, any>;
  app_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * Supabase Management API Client
 */
export class SupabaseManagementClient {
  private tokenStorage: TokenStorage;
  private baseUrl: string;

  constructor(tokenStorage: TokenStorage, baseUrl: string = 'https://api.supabase.com/v1') {
    this.tokenStorage = tokenStorage;
    this.baseUrl = baseUrl;
  }

  /**
   * Get access token, refresh if needed
   */
  private async getAccessToken(): Promise<string | null> {
    try {
      const tokens = await this.tokenStorage.getTokens();
      if (!tokens) {
        return null;
      }

      // Check if token is expired
      if (tokens.expiresAt <= Date.now()) {
        console.log('Access token expired, refreshing...');
        const refreshedTokens = await this.tokenStorage.refreshAccessToken();
        if (refreshedTokens) {
          return refreshedTokens.accessToken;
        }
        return null;
      }

      return tokens.accessToken;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        return {
          data: null,
          error: 'No valid access token available'
        };
      }

      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          data: null,
          error: `API request failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
        };
      }

      const data = await response.json();
      return {
        data,
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get list of organizations
   */
  async getOrganizations(): Promise<ApiResponse<Organization[]>> {
    try {
      const result = await this.makeRequest<Organization[]>('/organizations');
      return result;
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch organizations'
      };
    }
  }

  /**
   * Get organization details
   */
  async getOrganization(orgId: string): Promise<ApiResponse<Organization>> {
    try {
      const result = await this.makeRequest<Organization>(`/organizations/${orgId}`);
      return result;
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch organization'
      };
    }
  }

  /**
   * Get list of projects for an organization
   */
  async getProjects(orgId: string): Promise<ApiResponse<Project[]>> {
    try {
      const result = await this.makeRequest<Project[]>(`/organizations/${orgId}/projects`);
      return result;
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch projects'
      };
    }
  }

  /**
   * Get project details
   */
  async getProject(projectId: string): Promise<ApiResponse<Project>> {
    try {
      const result = await this.makeRequest<Project>(`/projects/${projectId}`);
      return result;
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch project'
      };
    }
  }

  /**
   * Get API keys for a project
   */
  async getAPIKeys(projectId: string): Promise<ApiResponse<APIKeys>> {
    try {
      const result = await this.makeRequest<APIKeys>(`/projects/${projectId}/api-keys`);
      return result;
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch API keys'
      };
    }
  }

  /**
   * Get database connection info for a project
   */
  async getDatabaseInfo(projectId: string): Promise<ApiResponse<DatabaseInfo>> {
    try {
      const result = await this.makeRequest<DatabaseInfo>(`/projects/${projectId}/database`);
      return result;
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch database info'
      };
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<ApiResponse<UserProfile>> {
    try {
      const result = await this.makeRequest<UserProfile>('/user');
      return result;
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch user profile'
      };
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<ApiResponse<boolean>> {
    try {
      const refreshedTokens = await this.tokenStorage.refreshAccessToken();
      return {
        data: !!refreshedTokens,
        error: refreshedTokens ? null : 'Failed to refresh token'
      };
    } catch (error) {
      return {
        data: false,
        error: error instanceof Error ? error.message : 'Token refresh failed'
      };
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<ApiResponse<boolean>> {
    try {
      const result = await this.getUserProfile();
      return {
        data: result.error === null,
        error: result.error
      };
    } catch (error) {
      return {
        data: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }
}

/**
 * Create management client instance
 */
export function getManagementClient(tokenStorage: TokenStorage): SupabaseManagementClient {
  const baseUrl = process.env.SUPABASE_API_BASE_URL || 'https://api.supabase.com/v1';
  return new SupabaseManagementClient(tokenStorage, baseUrl);
}

/**
 * Management client singleton
 */
let managementClientInstance: SupabaseManagementClient | null = null;

export function getManagementClientInstance(tokenStorage?: TokenStorage): SupabaseManagementClient | null {
  if (!managementClientInstance && tokenStorage) {
    managementClientInstance = getManagementClient(tokenStorage);
  }
  return managementClientInstance;
}