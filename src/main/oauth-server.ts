import express from 'express';
import cors from 'cors';
import { Server } from 'http';
import { 
  buildTokenExchangeData, 
  parseCallbackURL, 
  handleOAuthError 
} from '../utils/pkce';
import { TokenStorage } from './store';

/**
 * OAuth server interface
 */
export interface OAuthServer {
  start(port: number): Promise<void>;
  stop(): Promise<void>;
  startOAuthFlow(codeVerifier: string, state: string): Promise<{
    success: boolean;
    tokens?: any;
    error?: string;
  }>;
  isRunning(): boolean;
}

/**
 * OAuth server implementation
 */
export class OAuthServerImpl implements OAuthServer {
  private app: express.Application;
  private server: Server | null = null;
  private port: number = 54321;
  private codeVerifier: string | null = null;
  private state: string | null = null;
  private resolveCallback: ((result: any) => void) | null = null;
  private tokenStorage: TokenStorage;

  constructor(tokenStorage: TokenStorage) {
    this.app = express();
    this.tokenStorage = tokenStorage;
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // CORS middleware
    this.app.use(cors({
      origin: true,
      credentials: true
    }));

    // JSON parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Security headers
    this.app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    });
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        port: this.port 
      });
    });

    // OAuth callback endpoint
    this.app.get('/callback', async (req, res) => {
      try {
        console.log('OAuth callback received:', req.query);
        
        const { code, state: returnedState, error, error_description } = req.query;

        // Check for OAuth error
        if (error) {
          const errorMessage = handleOAuthError(error as string, error_description as string);
          console.error('OAuth error:', errorMessage);
          
          if (this.resolveCallback) {
            this.resolveCallback({
              success: false,
              error: errorMessage,
              reason: 'oauth_error'
            });
          }

          res.status(400).json({
            error: 'OAuth Error',
            error_description: errorMessage
          });
          return;
        }

        // Validate state parameter
        if (!returnedState || returnedState !== this.state) {
          const errorMessage = 'Invalid state parameter';
          console.error(errorMessage);
          
          if (this.resolveCallback) {
            this.resolveCallback({
              success: false,
              error: errorMessage,
              reason: 'invalid_state'
            });
          }

          res.status(400).json({
            error: 'Invalid State',
            error_description: errorMessage
          });
          return;
        }

        // Validate authorization code
        if (!code || !this.codeVerifier) {
          const errorMessage = 'Missing authorization code or code verifier';
          console.error(errorMessage);
          
          if (this.resolveCallback) {
            this.resolveCallback({
              success: false,
              error: errorMessage,
              reason: 'missing_code'
            });
          }

          res.status(400).json({
            error: 'Missing Code',
            error_description: errorMessage
          });
          return;
        }

        // Exchange code for tokens
        const tokenResult = await this.exchangeCodeForToken(
          code as string,
          this.codeVerifier
        );

        if (tokenResult.success) {
          // Save tokens
          await this.tokenStorage.saveTokens(tokenResult.tokens);
          
          if (this.resolveCallback) {
            this.resolveCallback({
              success: true,
              tokens: tokenResult.tokens
            });
          }

          res.json({
            success: true,
            message: 'Authorization successful! You can close this window.'
          });
        } else {
          if (this.resolveCallback) {
            this.resolveCallback({
              success: false,
              error: tokenResult.error,
              reason: 'token_exchange_failed'
            });
          }

          res.status(500).json({
            error: 'Token Exchange Failed',
            error_description: tokenResult.error
          });
        }

      } catch (error) {
        console.error('Callback error:', error);
        
        if (this.resolveCallback) {
          this.resolveCallback({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            reason: 'callback_error'
          });
        }

        res.status(500).json({
          error: 'Internal Server Error',
          error_description: 'An unexpected error occurred'
        });
      }
    });

    // Catch-all route for unknown endpoints
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist'
      });
    });

    // Error handling middleware
    this.app.use((error: any, req: any, res: any, next: any) => {
      console.error('Express error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      });
    });
  }

  /**
   * Start the OAuth server
   */
  async start(port: number = 54321): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.port = port;
        
        this.server = this.app.listen(port, 'localhost', () => {
          console.log(`OAuth server started on http://localhost:${port}`);
          resolve();
        });

        this.server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            console.error(`Port ${port} is already in use`);
            reject(new Error(`Port ${port} is already in use`));
          } else {
            console.error('Server error:', error);
            reject(error);
          }
        });

      } catch (error) {
        console.error('Failed to start OAuth server:', error);
        reject(error);
      }
    });
  }

  /**
   * Stop the OAuth server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('OAuth server stopped');
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Start OAuth flow and wait for callback
   */
  async startOAuthFlow(codeVerifier: string, state: string): Promise<{
    success: boolean;
    tokens?: any;
    error?: string;
    reason?: string;
  }> {
    return new Promise((resolve) => {
      this.codeVerifier = codeVerifier;
      this.state = state;
      this.resolveCallback = resolve;

      // Set timeout for OAuth flow (5 minutes)
      setTimeout(() => {
        if (this.resolveCallback) {
          this.resolveCallback({
            success: false,
            error: 'OAuth flow timeout',
            reason: 'timeout'
          });
          this.resolveCallback = null;
        }
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.server !== null;
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForToken(
    code: string,
    codeVerifier: string
  ): Promise<{ success: boolean; tokens?: any; error?: string }> {
    try {
      const redirectUri = `http://localhost:${this.port}/callback`;
      const clientId = process.env.SUPABASE_OAUTH_CLIENT_ID;
      if (!clientId) {
        throw new Error('SUPABASE_OAUTH_CLIENT_ID is not set');
      }
      const clientSecret = process.env.SUPABASE_OAUTH_CLIENT_SECRET || '<YOUR_CLIENT_SECRET>';

      const tokenData = buildTokenExchangeData(code, redirectUri, clientId, codeVerifier);
      
      // Add client secret if available
      if (clientSecret && clientSecret !== '<YOUR_CLIENT_SECRET>') {
        tokenData.append('client_secret', clientSecret);
      }

      console.log('Exchanging code for token...');
      
      const response = await fetch('https://api.supabase.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: tokenData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const tokenResponse = await response.json();
      console.log('Token exchange successful');

      // Prepare token data
      const tokens = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
        tokenType: tokenResponse.token_type || 'Bearer',
        scope: tokenResponse.scope || ''
      };

      return {
        success: true,
        tokens
      };

    } catch (error) {
      console.error('Token exchange error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token exchange failed'
      };
    }
  }

  /**
   * Get server port
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Get callback URL
   */
  getCallbackUrl(): string {
    return `http://localhost:${this.port}/callback`;
  }
}

/**
 * OAuth server singleton
 */
let oauthServerInstance: OAuthServerImpl | null = null;

/**
 * Get OAuth server instance
 */
export function getOAuthServer(tokenStorage?: TokenStorage): OAuthServerImpl {
  if (!oauthServerInstance) {
    if (!tokenStorage) {
      throw new Error('TokenStorage is required for OAuth server');
    }
    oauthServerInstance = new OAuthServerImpl(tokenStorage);
  }
  return oauthServerInstance;
}

/**
 * Create new OAuth server instance
 */
export function createOAuthServer(tokenStorage: TokenStorage): OAuthServerImpl {
  return new OAuthServerImpl(tokenStorage);
}