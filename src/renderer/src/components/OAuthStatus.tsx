import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  Database,
  Building,
  Folder,
  Key,
  Loader2
} from 'lucide-react';

interface AuthStatus {
  hasTokens: boolean;
  hasAuthInfo: boolean;
  isTokenValid: boolean;
  hasRefreshToken: boolean;
}

interface TokenInfo {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
  scope: string;
}

interface AuthInfo {
  organizationId?: string;
  organizationName?: string;
  projectId?: string;
  projectName?: string;
  projectRef?: string;
}

interface OAuthStatusProps {
  className?: string;
  showDetails?: boolean;
  onRefresh?: () => void;
}

export const OAuthStatus: React.FC<OAuthStatusProps> = ({
  className,
  showDetails = true,
  onRefresh
}) => {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [tokens, setTokens] = useState<TokenInfo | null>(null);
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAuthData();
  }, []);

  const loadAuthData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [statusResult, tokensResult] = await Promise.all([
        window.electronAPI.getAuthStatus(),
        window.electronAPI.getTokens()
      ]);

      if (statusResult.success) {
        setAuthStatus(statusResult);
      }

      if (tokensResult.success) {
        setTokens(tokensResult.tokens);
        setAuthInfo(tokensResult.authInfo);
      }
    } catch (error) {
      console.error('Failed to load auth data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load auth data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadAuthData();
    if (onRefresh) {
      onRefresh();
    }
  };

  const formatTokenExpiry = (expiresAt: number) => {
    const now = Date.now();
    const timeLeft = expiresAt - now;
    
    if (timeLeft <= 0) {
      return 'Expired';
    }
    
    const minutes = Math.floor(timeLeft / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h left`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m left`;
    } else {
      return `${minutes}m left`;
    }
  };

  const getStatusBadge = () => {
    if (!authStatus) {
      return <Badge variant="secondary">Unknown</Badge>;
    }

    if (authStatus.hasTokens && authStatus.isTokenValid) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>;
    } else if (authStatus.hasTokens && !authStatus.isTokenValid) {
      return <Badge variant="destructive">Token Expired</Badge>;
    } else {
      return <Badge variant="outline">Not Connected</Badge>;
    }
  };

  const getStatusIcon = () => {
    if (!authStatus) {
      return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }

    if (authStatus.hasTokens && authStatus.isTokenValid) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (authStatus.hasTokens && !authStatus.isTokenValid) {
      return <Clock className="h-5 w-5 text-yellow-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-gray-600">Loading auth status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Authentication Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600 mb-4">{error}</div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            Supabase Authentication
          </div>
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Current authentication status and token information
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Basic Status */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Tokens:</span>
              <span className={authStatus?.hasTokens ? 'text-green-600' : 'text-red-600'}>
                {authStatus?.hasTokens ? 'Available' : 'Not Available'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Refresh:</span>
              <span className={authStatus?.hasRefreshToken ? 'text-green-600' : 'text-red-600'}>
                {authStatus?.hasRefreshToken ? 'Available' : 'Not Available'}
              </span>
            </div>
          </div>

          {/* Token Details */}
          {showDetails && tokens && (
            <div className="space-y-3">
              <div className="border-t pt-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Token Information</h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Type:</span>
                    <span className="text-gray-900">{tokens.tokenType}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Expires:</span>
                    <span className={tokens.expiresAt > Date.now() ? 'text-green-600' : 'text-red-600'}>
                      {formatTokenExpiry(tokens.expiresAt)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Scopes:</span>
                    <span className="text-gray-900 text-xs bg-gray-100 px-2 py-1 rounded">
                      {tokens.scope || 'No scopes'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Auth Info */}
          {showDetails && authInfo && (
            <div className="space-y-3">
              <div className="border-t pt-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Organization & Project</h4>
                
                <div className="space-y-2 text-sm">
                  {authInfo.organizationName && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Organization:</span>
                      <span className="text-gray-900">{authInfo.organizationName}</span>
                    </div>
                  )}
                  
                  {authInfo.projectName && (
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Project:</span>
                      <span className="text-gray-900">{authInfo.projectName}</span>
                    </div>
                  )}
                  
                  {authInfo.projectRef && (
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Ref:</span>
                      <span className="text-gray-900 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {authInfo.projectRef}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="border-t pt-3">
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Status
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OAuthStatus;
