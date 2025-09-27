import React, { useState, useEffect } from 'react';
import { SupabaseConnectButton } from '../components/SupabaseConnectButton';
import { OAuthStatus } from '../components/OAuthStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Building, 
  Folder, 
  Database, 
  Key, 
  RefreshCw, 
  ExternalLink,
  Loader2
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
  ref: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  status: string;
  region: string;
}

interface SupabaseOAuthExampleProps {
  className?: string;
}

export const SupabaseOAuthExample: React.FC<SupabaseOAuthExampleProps> = ({
  className
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<{ [orgId: string]: Project[] }>({});
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<any>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const status = await window.electronAPI.getAuthStatus();
      setAuthStatus(status);
      
      if (status.success && status.hasTokens && status.isTokenValid) {
        loadSupabaseData();
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
    }
  };

  const loadSupabaseData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.getAllData();
      
      if (result.success) {
        setOrganizations(result.data.organizations || []);
        setProjects(result.data.projects || {});
      } else {
        throw new Error(result.error || 'Failed to load Supabase data');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
      console.error('Load data error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = (result: any) => {
    console.log('OAuth success:', result);
    setAuthStatus({
      hasTokens: true,
      hasAuthInfo: true,
      isTokenValid: true,
      hasRefreshToken: true
    });
    loadSupabaseData();
  };

  const handleAuthError = (error: string) => {
    console.error('OAuth error:', error);
    setError(error);
  };

  const handleOrgSelect = (orgId: string) => {
    setSelectedOrg(orgId);
  };

  const getOrgProjects = (orgId: string) => {
    return projects[orgId] || [];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Supabase OAuth Integration</h1>
        <p className="mt-2 text-gray-600">
          Connect to your Supabase account and manage organizations & projects
        </p>
      </div>

      {/* OAuth Connection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SupabaseConnectButton
          onAuthSuccess={handleAuthSuccess}
          onAuthError={handleAuthError}
        />
        
        <OAuthStatus
          showDetails={true}
          onRefresh={checkAuthStatus}
        />
      </div>

      {/* Supabase Data */}
      {authStatus?.hasTokens && authStatus?.isTokenValid && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Supabase Data
              </div>
              <Button
                onClick={loadSupabaseData}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </>
                )}
              </Button>
            </CardTitle>
            <CardDescription>
              Your Supabase organizations and projects
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading Supabase data...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Organizations */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Organizations ({organizations.length})
                  </h3>
                  
                  {organizations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No organizations found
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {organizations.map((org) => (
                        <Card 
                          key={org.id} 
                          className={`cursor-pointer transition-colors ${
                            selectedOrg === org.id 
                              ? 'ring-2 ring-blue-500 bg-blue-50' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleOrgSelect(org.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900">{org.name}</h4>
                              <Badge variant="outline">{org.slug}</Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              Created: {formatDate(org.created_at)}
                            </div>
                            <div className="text-sm text-gray-600">
                              Projects: {getOrgProjects(org.id).length}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Projects */}
                {selectedOrg && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Folder className="h-5 w-5" />
                      Projects ({getOrgProjects(selectedOrg).length})
                    </h3>
                    
                    {getOrgProjects(selectedOrg).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No projects found for this organization
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {getOrgProjects(selectedOrg).map((project) => (
                          <Card key={project.id} className="hover:bg-gray-50 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-gray-900">{project.name}</h4>
                                <Badge className={getStatusColor(project.status)}>
                                  {project.status}
                                </Badge>
                              </div>
                              
                              <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Key className="h-4 w-4" />
                                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                    {project.ref}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Database className="h-4 w-4" />
                                  <span>{project.region}</span>
                                </div>
                                
                                <div className="text-xs text-gray-500">
                                  Created: {formatDate(project.created_at)}
                                </div>
                              </div>
                              
                              <div className="mt-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => {
                                    // Project details action
                                    console.log('View project details:', project);
                                  }}
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  View Details
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!authStatus?.hasTokens && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Follow these steps to connect to Supabase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Create Supabase OAuth App</h4>
                  <p className="text-sm text-gray-600">
                    Go to Supabase Dashboard → Settings → API → OAuth Apps and create a new OAuth app
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Configure Redirect URIs</h4>
                  <p className="text-sm text-gray-600">
                    Add these redirect URIs to your OAuth app:
                    <br />
                    • <code className="bg-gray-100 px-1 rounded">http://localhost:54321/callback</code>
                    <br />
                    • <code className="bg-gray-100 px-1 rounded">myapp://oauth/callback</code>
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Set Environment Variables</h4>
                  <p className="text-sm text-gray-600">
                    Copy <code className="bg-gray-100 px-1 rounded">env.example</code> to <code className="bg-gray-100 px-1 rounded">.env</code> and fill in your OAuth credentials
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Connect</h4>
                  <p className="text-sm text-gray-600">
                    Click the "Connect" button above to start the OAuth flow
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SupabaseOAuthExample;
