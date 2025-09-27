import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Loader2, CheckCircle, XCircle, ExternalLink, Database, Building2 } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface Project {
  id: string;
  name: string;
  ref: string;
  organization_id: string;
  status: string;
  region: string;
}

interface AuthStatus {
  ok: boolean;
  tokens?: any;
  authInfo?: any;
  hasTokens?: boolean;
  isTokenValid?: boolean;
  error?: string;
}

interface AuthResult {
  ok: boolean;
  orgs?: Organization[];
  projects?: Project[];
  selectedOrg?: Organization;
  selectedProject?: Project;
  error?: string;
  reason?: string;
}

export const SupabaseConnectButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [authResult, setAuthResult] = useState<AuthResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<'local' | 'custom'>('local');

  // Check auth status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const status = await window.supabaseAPI.getAuthStatus();
      setAuthStatus(status);
      
      if (status.ok && status.hasTokens && status.isTokenValid) {
        // User is already authenticated
        console.log('User is already authenticated');
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
      setError('Failed to check authentication status');
    }
  };

  const handleAuth = async () => {
    setIsLoading(true);
    setError(null);
    setAuthResult(null);

    try {
      console.log('Starting Supabase OAuth with method:', method);
      
      const result = await window.supabaseAPI.startSupabaseAuth({
        method,
        preferExternal: false
      });

      setAuthResult(result);

      if (result.ok) {
        console.log('OAuth successful:', result);
        // Refresh auth status
        await checkAuthStatus();
      } else {
        console.error('OAuth failed:', result.error);
        setError(result.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('OAuth error:', error);
      setError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await window.supabaseAPI.logoutSupabase();
      
      if (result.ok) {
        setAuthStatus(null);
        setAuthResult(null);
        console.log('Logout successful');
      } else {
        setError(result.error || 'Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      setError(error instanceof Error ? error.message : 'Logout failed');
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthenticated = authStatus?.ok && authStatus?.hasTokens && authStatus?.isTokenValid;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Supabase Connection
        </CardTitle>
        <CardDescription>
          Connect to your Supabase account to access your organizations and projects
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Method Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Authentication Method:</label>
          <div className="flex gap-2">
            <Button
              variant={method === 'local' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMethod('local')}
              disabled={isLoading}
            >
              Local Server
            </Button>
            <Button
              variant={method === 'custom' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMethod('custom')}
              disabled={isLoading}
            >
              Custom URI
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {method === 'local' 
              ? 'Uses local HTTP server for OAuth callback (recommended)'
              : 'Uses custom URI scheme for OAuth callback'
            }
          </p>
        </div>

        {/* Authentication Status */}
        {authStatus && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              {isAuthenticated ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Connected
                </Badge>
              )}
            </div>
            
            {authStatus.storageMethod && (
              <p className="text-xs text-muted-foreground">
                Storage: {authStatus.storageMethod}
              </p>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Auth Result */}
        {authResult?.ok && (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800">Authentication successful!</span>
              </div>
            </div>

            {/* Organizations */}
            {authResult.orgs && authResult.orgs.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Organizations ({authResult.orgs.length})
                </h4>
                <div className="space-y-1">
                  {authResult.orgs.map((org) => (
                    <div key={org.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{org.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {org.slug}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {authResult.projects && authResult.projects.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Projects ({authResult.projects.length})
                </h4>
                <div className="space-y-1">
                  {authResult.projects.map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{project.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {project.ref}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {project.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {project.region}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Project */}
            {authResult.selectedProject && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    Selected Project: {authResult.selectedProject.name}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isAuthenticated ? (
            <Button
              onClick={handleAuth}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect to Supabase
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleLogout}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                'Disconnect'
              )}
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <strong>Local Server:</strong> Opens OAuth in a secure popup window and uses a local HTTP server for the callback.
          </p>
          <p>
            <strong>Custom URI:</strong> Uses a custom URI scheme (myapp://) for the OAuth callback.
          </p>
          <p>
            Make sure you have configured your Supabase OAuth app with the correct redirect URIs.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SupabaseConnectButton;