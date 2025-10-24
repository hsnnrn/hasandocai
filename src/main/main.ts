/**
 * Electron Main Process - Supabase OAuth Integration with Crashpad Fix
 * 
 * Bu dosya Windows'ta sık görülen crashpad_client_win.cc(863) not connected
 * hatasını önlemek için crashReporter ayarları ve GPU devre dışı bırakma
 * ile optimize edilmiştir. Supabase OAuth akışını destekler.
 */

import * as dotenv from "dotenv";
import * as path from 'path';

// .env'i kökten oku
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
console.log("Loaded CLIENT_ID", process.env.SUPABASE_OAUTH_CLIENT_ID);

// Crash yakalama
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
});

import { app, BrowserWindow, ipcMain, crashReporter, shell, protocol } from 'electron';
import { readFile, writeFile, unlink, mkdir } from 'fs/promises';
import { homedir } from 'os';

// CrashReporter başlatma - Windows crashpad hatasını önlemek için
// uploadToServer: false ile crashpad'in upload denemesini engelliyoruz
crashReporter.start({
  productName: 'DocDataApp',
  companyName: 'YourCompany',
  submitURL: '', // Boş string - upload yapmayacak
  uploadToServer: false, // Bu ayar crashpad not connected uyarılarını azaltır
  ignoreSystemCrashHandler: false,
  rateLimit: false
});

// GPU ve donanım hızlandırma kontrolleri (dev için)
// Bu ayarlar app.whenReady() öncesinde yapılmalı
if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
  // Development modunda GPU'yu devre dışı bırak
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-compositing');
  app.commandLine.appendSwitch('disable-software-rasterizer');
  
  // Donanım hızlandırmayı tamamen kapatmak için
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
  
  console.log('Development mode: GPU acceleration disabled');
}

// Windows için AppUserModelId ayarlama
if (process.platform === 'win32') {
  try {
    app.setAppUserModelId('com.yourcompany.docdataapp');
    console.log('AppUserModelId set for Windows');
  } catch (error) {
    console.warn('Failed to set AppUserModelId:', error);
  }
}

// Global hata yakalama - main process hatalarını güvenli şekilde yakala
// Bu handler'lar yukarıda zaten tanımlandı, tekrar tanımlamaya gerek yok

// Global değişkenler
let mainWindow: BrowserWindow | null = null;
let oauthServer: any = null;
let tokenStorage: any = null;

// Auto-save directory path
const getAutoSavePath = () => {
  return path.join(homedir(), 'Documents', 'DocData');
};

// Ensure DocData directory exists
const ensureDocDataDirectory = async () => {
  const docDataPath = getAutoSavePath();
  try {
    await mkdir(docDataPath, { recursive: true });
    console.log('DocData directory ensured:', docDataPath);
  } catch (error) {
    console.error('Failed to create DocData directory:', error);
  }
};

// UUID validation helper
const isValidUUID = (value?: string): boolean => {
  if (!value) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

// Environment variables validation
const validateEnvironment = () => {
  const clientId = process.env.SUPABASE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.SUPABASE_OAUTH_CLIENT_SECRET;
  
  // Debug logging (masked)
  console.log('ENV CLIENT_ID present?', !!clientId);
  console.log('masked CLIENT_ID:', clientId ? clientId.slice(0,8)+'...'+clientId.slice(-4) : null);
  
  if (!isValidUUID(clientId)) {
    console.error('SUPABASE_OAUTH_CLIENT_ID is not set or invalid.');
    console.error('Expected format: UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)');
    return false;
  }
  
  if (!clientSecret || clientSecret === 'your_client_secret_here') {
    console.warn('SUPABASE_OAUTH_CLIENT_SECRET is not set or is placeholder');
    console.warn('OAuth flow will use PKCE-only mode');
  }
  
  return true;
};

// Main window oluşturma fonksiyonu
function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'), // Preload script yolu
      sandbox: false // OAuth için gerekli
    },
    icon: path.join(__dirname, '../../assets/icon.svg'),
    autoHideMenuBar: true,
    show: false // İlk yükleme tamamlanana kadar gizle
  });

  // Load the React app
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000'); // Vite dev server
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Window hazır olduğunda göster
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  // Window kapatıldığında referansı temizle
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Development modunda DevTools'u aç
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

// OAuth popup window oluşturma fonksiyonu
function createAuthWindow(authUrl: string, redirectUri: string): Promise<{ success: boolean; code?: string; state?: string; error?: string }> {
  return new Promise((resolve) => {
    // Cross-platform window configuration
    const windowOptions: any = {
      width: 900,
      height: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true
      },
      show: false,
      modal: true,
      parent: mainWindow || undefined,
      title: 'Supabase Authentication',
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
    }

    // Platform-specific adjustments
    if (process.platform === 'win32') {
      windowOptions.icon = path.join(__dirname, 'assets/icon.ico')
    } else if (process.platform === 'darwin') {
      windowOptions.icon = path.join(__dirname, 'assets/icon.icns')
    }

    const authWindow = new BrowserWindow(windowOptions);

    // Redirect yakalama - will-redirect event
    authWindow.webContents.on('will-redirect', (event, navigationUrl) => {
      console.log('OAuth redirect detected:', navigationUrl);
      
      if (navigationUrl.startsWith(redirectUri)) {
        event.preventDefault();
        authWindow.close();
        
        try {
          const url = new URL(navigationUrl);
          const code = url.searchParams.get('code');
          const state = url.searchParams.get('state');
          const error = url.searchParams.get('error');
          
          if (error) {
            console.log('OAuth error:', error);
            resolve({ success: false, error: error });
            return;
          }
          
          if (code && state) {
            // Token'ları loglamıyoruz - sadece presence gösteriyoruz
            console.log('OAuth code received: [REDACTED]');
            console.log('OAuth state received: [REDACTED]');
            resolve({ success: true, code, state });
          } else {
            resolve({ success: false, error: 'Missing code or state parameter' });
          }
        } catch (error) {
          console.error('Failed to parse OAuth callback:', error);
          resolve({ success: false, error: 'Invalid callback URL' });
        }
      }
    });

    // will-navigate event (alternatif redirect yakalama)
    authWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      if (navigationUrl.startsWith(redirectUri)) {
        event.preventDefault();
        authWindow.close();
        
        try {
          const url = new URL(navigationUrl);
          const code = url.searchParams.get('code');
          const state = url.searchParams.get('state');
          const error = url.searchParams.get('error');
          
          if (error) {
            resolve({ success: false, error: error });
            return;
          }
          
          if (code && state) {
            console.log('OAuth code received: [REDACTED]');
            console.log('OAuth state received: [REDACTED]');
            resolve({ success: true, code, state });
          } else {
            resolve({ success: false, error: 'Missing code or state parameter' });
          }
        } catch (error) {
          resolve({ success: false, error: 'Invalid callback URL' });
        }
      }
    });

    // Window kapatıldığında
    authWindow.on('closed', () => {
      resolve({ success: false, error: 'User closed the window' });
    });

    // URL'yi yükle
    authWindow.loadURL(authUrl);
    authWindow.show();
  });
}

// Token exchange fonksiyonu (main process'te güvenli)
async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<{ success: boolean; tokens?: any; anonKey?: string; error?: string }> {
  try {
    const tokenUrl = 'https://api.supabase.com/v1/oauth/token';
    const clientId = process.env.SUPABASE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.SUPABASE_OAUTH_CLIENT_SECRET;
    
    if (!clientId) {
      throw new Error('SUPABASE_OAUTH_CLIENT_ID is not set');
    }
    
    const tokenData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier
    });
    
    console.log('Exchanging code for token...');
    
    // Client ID ve Secret'ı Basic Auth header olarak gönder
    const basicAuth = Buffer.from(`${clientId}:${clientSecret || ''}`).toString('base64');
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': `Basic ${basicAuth}`
      },
      body: tokenData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const tokenResponse = await response.json();
    console.log('Token exchange successful');
    console.log('🔍 Token response:', JSON.stringify(tokenResponse, null, 2));

    // Prepare token data
    const tokens = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
      tokenType: tokenResponse.token_type || 'Bearer',
      scope: tokenResponse.scope || ''
    };
    
    console.log('🔍 Prepared tokens:', {
      hasAccessToken: !!tokens.accessToken,
      hasRefreshToken: !!tokens.refreshToken,
      accessTokenPreview: tokens.accessToken ? tokens.accessToken.substring(0, 20) + '...' : 'null'
    });

    // Try to get anon key from Management API
    let anonKey: string | undefined = undefined;
    try {
      console.log('🔑 Fetching anon key from Management API...');
      const anonKeyResponse = await fetch('https://api.supabase.com/v1/projects/' + process.env.SUPABASE_PROJECT_REF + '/api-keys', {
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (anonKeyResponse.ok) {
        const anonKeyData = await anonKeyResponse.json();
        anonKey = anonKeyData.find((key: any) => key.name === 'anon')?.api_key;
        if (anonKey) {
          console.log('✅ Anon key retrieved from Management API');
        } else {
          console.warn('⚠️ No anon key found in Management API response');
        }
      } else {
        console.warn('⚠️ Failed to fetch anon key from Management API:', anonKeyResponse.status);
      }
    } catch (error) {
      console.warn('⚠️ Error fetching anon key:', error);
    }

    return {
      success: true,
      tokens,
      anonKey
    };

  } catch (error) {
    console.error('Token exchange error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token exchange failed'
    };
  }
}

// PKCE code verifier ve challenge oluşturma
function generatePKCEPair() {
  const crypto = require('crypto');
  
  // Code verifier oluştur (43-128 karakter)
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  
  // Code challenge oluştur (SHA256 hash)
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256'
  };
}

// State parameter oluşturma (CSRF koruması)
function generateState() {
  const crypto = require('crypto');
  return crypto.randomBytes(16).toString('base64url');
}

// Custom protocol handler for OAuth callback
function registerCustomProtocol(): void {
  const protocolName = 'myapp';
  
  // Register protocol handler
  app.setAsDefaultProtocolClient(protocolName);
  
  // Handle protocol URL
  app.on('open-url', (event, url) => {
    console.log('Received protocol URL:', url);
    
    if (url.startsWith(`${protocolName}://oauth/callback`)) {
      // Parse the callback URL
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      const state = urlObj.searchParams.get('state');
      const error = urlObj.searchParams.get('error');
      
      if (error) {
        console.error('OAuth error:', error);
        return;
      }
      
      if (code && state) {
        // Handle the callback (this would be integrated with the OAuth flow)
        console.log('OAuth callback received:', { code: '[REDACTED]', state: '[REDACTED]' });
      }
    }
  });
}

// App lifecycle events
app.whenReady().then(async () => {
  console.log('App is ready, initializing...');
  
  await ensureDocDataDirectory();
  
  // Environment validation
  if (!validateEnvironment()) {
    console.error('Environment validation failed. Please check your .env file.');
    // App continues but OAuth will fail gracefully
  }
  
  // Initialize OAuth services
  try {
    console.log('Starting OAuth services initialization...');
    
    // Import and initialize token storage
    const { createDefaultTokenStorage } = await import('./store');
    tokenStorage = createDefaultTokenStorage();
    console.log('Token storage initialized');
    
    // Import and initialize OAuth server
    const { getOAuthServer } = await import('./oauth-server');
    oauthServer = getOAuthServer(tokenStorage);
    console.log('OAuth server instance created');
    
    // Start OAuth server
    const oauthPort = parseInt(process.env.OAUTH_PORT || '54321');
    console.log('Starting OAuth server on port:', oauthPort);
    await oauthServer.start(oauthPort);
    console.log('OAuth server started successfully');
    
    // Register custom protocol
    registerCustomProtocol();
    console.log('Custom protocol registered');
    
    console.log('OAuth services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize OAuth services:', error);
    console.error('❌ Error details:', error);
    // Don't exit, continue without OAuth server
    oauthServer = null;
  }
  
  // GPU kontrolü ve Ollama otomatik başlatma
  try {
    console.log('🔥 Initializing GPU and AI services...');
    
    const { 
      checkGPUAvailability, 
      configureOllamaGPU, 
      logGPUInfo,
      startGPUMemoryMonitor 
    } = await import('./utils/gpuHelper');
    
    const { ensureOllamaRunning, stopOllamaServer } = await import('./utils/ollamaManager');
    
    // GPU durumunu kontrol et ve logla
    const gpuAvailable = await checkGPUAvailability();
    await logGPUInfo();
    
    // GPU ayarlarını yapılandır (default: enabled if available)
    const gpuMode = process.env.GPU_MODE || 'auto';
    const shouldUseGPU = gpuMode === 'enabled' || (gpuMode === 'auto' && gpuAvailable);
    configureOllamaGPU(shouldUseGPU);
    
    // ✅ OLLAMA OTOMATİK BAŞLATMA
    console.log('🤖 Ollama sunucusu kontrol ediliyor...');
    const ollamaStatus = await ensureOllamaRunning();
    
    if (ollamaStatus.running) {
      console.log(`✅ Ollama çalışıyor (${ollamaStatus.url})`);
      console.log(`🎮 GPU: ${ollamaStatus.gpuEnabled ? 'Aktif' : 'Devre Dışı'}`);
    } else {
      console.error('❌ Ollama başlatılamadı:', ollamaStatus.error || 'Bilinmeyen hata');
      // Hata mesajını kullanıcıya göster (dialog ile)
      const { dialog } = await import('electron');
      dialog.showErrorBox(
        'Ollama Başlatılamadı',
        ollamaStatus.error || 'Ollama sunucusu başlatılamadı. Lütfen manuel olarak başlatın.'
      );
    }
    
    // App kapatılırken Ollama'yı durdur
    app.on('before-quit', () => {
      console.log('🛑 Uygulama kapanıyor, Ollama durduruluyor...');
      stopOllamaServer();
    });
    
    // GPU bellek monitörünü başlat (eğer GPU varsa)
    if (gpuAvailable && shouldUseGPU) {
      const monitorInterval = 30000; // 30 saniye
      const warningThreshold = 6000; // 6GB
      const autoCleanup = true; // Otomatik temizleme aktif
      
      startGPUMemoryMonitor(monitorInterval, warningThreshold, autoCleanup);
      console.log('✅ GPU memory monitor started (auto-cleanup enabled)');
    }
    
    // Warmup (eğer aktifse ve Ollama çalışıyorsa)
    const shouldWarmup = process.env.GPU_WARMUP === 'true';
    if (shouldWarmup && ollamaStatus.running) {
      const { LlamaClient } = await import('./ai/llamaClient');
      const llamaClient = new LlamaClient();
      
      const isLlamaReady = await llamaClient.healthCheck();
      if (isLlamaReady) {
        console.log('🤖 Warming up Ollama model...');
        await llamaClient.generate({
          instructions: 'Merhaba',
          context: '',
          maxTokens: 10,
          temperature: 0.25,
        });
        console.log('✅ Ollama warmup complete');
      } else {
        console.warn('⚠️ Ollama warmup failed');
      }
    }
  } catch (error) {
    console.warn('⚠️ GPU/AI initialization failed:', error instanceof Error ? error.message : 'Unknown error');
    // Continue without GPU/warmup
  }
  
  createMainWindow();
  console.log('App initialized successfully');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// Handle protocol on Windows
app.on('second-instance', (event, commandLine, workingDirectory) => {
  // Someone tried to run a second instance, focus our window instead
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
  
  // Handle protocol URL from second instance
  const url = commandLine.find(arg => arg.startsWith('myapp://'));
  if (url) {
    console.log('Received protocol URL from second instance:', url);
    // Handle the URL
  }
});

// Make sure only one instance is running
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

// Import and register IPC handlers early - synchronous import
try {
  require('./ipc-handlers');
  console.log('✅ IPC handlers registered early');
} catch (error) {
  console.error('❌ Failed to register IPC handlers early:', error);
}

// IPC Handlers
// Note: Most IPC handlers are now in ipc-handlers.ts (including supabase:fetchProjects)

// Legacy handlers below (will be moved to ipc-handlers.ts eventually)
const skipProjectsFetching = true; // Already in ipc-handlers.ts
if (!skipProjectsFetching) {
ipcMain.handle('supabase:fetchProjects', async () => {
  try {
    if (!tokenStorage) {
      return {
        ok: false,
        error: 'Token storage not initialized'
      };
    }

    const tokens = await tokenStorage.getTokens();
    if (!tokens || tokens.expiresAt <= Date.now()) {
      return {
        ok: false,
        error: 'No valid access token available'
      };
    }

    // Token formatını kontrol et
    console.log('🔍 Projects API - Token validation - Length:', tokens.accessToken.length);
    console.log('🔍 Projects API - Token validation - Preview:', tokens.accessToken.substring(0, 50) + '...');
    
    // JWT formatını kontrol et (3 parça olmalı)
    const tokenParts = tokens.accessToken.split('.');
    if (tokenParts.length !== 3) {
      console.error('❌ Projects API - Invalid JWT format - expected 3 parts, got:', tokenParts.length);
      return {
        ok: false,
        error: 'Invalid access token format'
      };
    }
    
    console.log('✅ Projects API - Token format is valid JWT');

    console.log('Fetching projects from Supabase Management API...');
    
    let projects: any[] = [];
    let organizations: any[] = [];
    
    // Try to fetch organizations first
    const orgEndpoints = [
      'https://api.supabase.com/v1/organizations',
      'https://api.supabase.com/platform/organizations',
      'https://api.supabase.com/v1/me/organizations'
    ];
    
    let orgsResponse: Response | null = null;
    let workingOrgEndpoint: string | null = null;
    
    for (const endpoint of orgEndpoints) {
      try {
        console.log(`Trying organizations endpoint: ${endpoint}`);
        orgsResponse = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        if (orgsResponse.ok) {
          workingOrgEndpoint = endpoint;
          const orgsData = await orgsResponse.json();
          organizations = orgsData.organizations || orgsData || [];
          console.log(`Successfully fetched ${organizations.length} organizations from ${endpoint}`);
          break;
        } else {
          const errorText = await orgsResponse.text();
          console.warn(`Organizations endpoint ${endpoint} failed: ${orgsResponse.status} - ${errorText}`);
        }
      } catch (error) {
        console.warn(`Error fetching from ${endpoint}:`, error);
      }
    }
    
    // Try direct projects endpoint if organizations approach fails
    if (organizations.length === 0) {
      const projectEndpoints = [
        'https://api.supabase.com/v1/projects',
        'https://api.supabase.com/platform/projects',
        'https://api.supabase.com/v1/me/projects'
      ];
      
      for (const endpoint of projectEndpoints) {
        try {
          console.log(`Trying direct projects endpoint: ${endpoint}`);
          const projectsResponse = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${tokens.accessToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });
          
          if (projectsResponse.ok) {
            const projectsData = await projectsResponse.json();
            projects = projectsData.projects || projectsData || [];
            console.log(`Successfully fetched ${projects.length} projects directly from ${endpoint}`);
            break;
          } else {
            const errorText = await projectsResponse.text();
            console.warn(`Projects endpoint ${endpoint} failed: ${projectsResponse.status} - ${errorText}`);
          }
        } catch (error) {
          console.warn(`Error fetching projects from ${endpoint}:`, error);
        }
      }
    }
    
    // If we have organizations, fetch projects for each
    if (organizations.length > 0) {
      for (const org of organizations) {
        try {
          console.log(`Fetching projects for organization: ${org.id} (${org.name})`);
          
          const orgProjectEndpoints = [
            `https://api.supabase.com/v1/organizations/${org.id}/projects`,
            `https://api.supabase.com/platform/organizations/${org.id}/projects`,
            `https://api.supabase.com/v1/projects?organization_id=${org.id}`
          ];
          
          for (const endpoint of orgProjectEndpoints) {
            try {
              const orgProjectsResponse = await fetch(endpoint, {
                headers: {
                  'Authorization': `Bearer ${tokens.accessToken}`,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                }
              });
              
              if (orgProjectsResponse.ok) {
                const orgProjectsData = await orgProjectsResponse.json();
                const orgProjects = orgProjectsData.projects || orgProjectsData || [];
                
                if (orgProjects.length > 0) {
                  // Add organization info to projects
                  const projectsWithOrg = orgProjects.map((project: any) => ({
                    id: project.id,
                    name: project.name,
                    ref: project.ref,
                    status: project.status,
                    organization_id: org.id,
                    organization_name: org.name,
                    organization_slug: org.slug,
                    region: project.region,
                    project_api_url: project.project_api_url || `https://${project.ref}.supabase.co`,
                    created_at: project.created_at,
                    updated_at: project.updated_at
                  }));
                  
                  projects = [...projects, ...projectsWithOrg];
                  console.log(`Added ${orgProjects.length} projects from organization ${org.name}`);
                  break;
                }
              } else {
                const errorText = await orgProjectsResponse.text();
                console.warn(`Organization projects endpoint ${endpoint} failed: ${orgProjectsResponse.status} - ${errorText}`);
              }
            } catch (error) {
              console.warn(`Error fetching projects for org ${org.id} from ${endpoint}:`, error);
            }
          }
        } catch (error) {
          console.warn(`Error processing organization ${org.id}:`, error);
        }
      }
    }
    
    // Format projects with required shape: { id, name, ref, project_api_url }
    const formattedProjects = projects.map(project => ({
      id: project.id,
      name: project.name,
      ref: project.ref,
      project_api_url: project.project_api_url || `https://${project.ref}.supabase.co`,
      status: project.status,
      organization_id: project.organization_id,
      organization_name: project.organization_name,
      organization_slug: project.organization_slug,
      region: project.region
    }));
    
    console.log(`Successfully fetched ${formattedProjects.length} projects`);
    
    return {
      ok: true,
      projects: formattedProjects,
      organizations: organizations,
      message: `Found ${formattedProjects.length} projects across ${organizations.length} organizations`
    };
    
  } catch (error) {
    console.error('Error fetching projects:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to fetch projects'
    };
  }
});
} // End of skip block

// OAuth başlatma handler'ı
ipcMain.handle('start-oauth', async (event, { authUrl, redirectUri }) => {
  try {
    console.log('Starting OAuth flow...');
    
    if (!authUrl || !redirectUri) {
      return { success: false, error: 'Missing authUrl or redirectUri' };
    }
    
    const result = await createAuthWindow(authUrl, redirectUri);
    
    if (result.success) {
      console.log('OAuth flow completed successfully');
      // NOTE: Token exchange burada yapılmalı (main process'te)
      // Client secret kullanılıyorsa kesinlikle renderer'a gönderilmemeli
    } else {
      console.log('OAuth flow failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('OAuth handler error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Supabase OAuth handlers
ipcMain.handle('supabase:startAuth', async (event, options) => {
  try {
    console.log('Starting Supabase OAuth flow...');
    
    const { method = 'local' } = options;
    
    // Supabase OAuth URL oluştur
    const clientId = process.env.SUPABASE_OAUTH_CLIENT_ID;
    if (!clientId) {
      console.error('SUPABASE_OAUTH_CLIENT_ID is not set in environment variables');
      return {
        ok: false,
        error: 'OAuth client ID not configured. Please set SUPABASE_OAUTH_CLIENT_ID in your environment.'
      };
    }
    if (!isValidUUID(clientId)) {
      console.error('SUPABASE_OAUTH_CLIENT_ID is invalid. Expected format: UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)');
      return {
        ok: false,
        error: 'Invalid OAuth client ID format. Please check your SUPABASE_OAUTH_CLIENT_ID configuration.'
      };
    }
    
    const redirectUri = method === 'local' 
      ? `http://localhost:${process.env.OAUTH_PORT || '54321'}/callback`
      : 'myapp://oauth/callback';
    
    // PKCE parameters oluştur
    const pkcePair = generatePKCEPair();
    const state = generateState();
    
    // Supabase'in kendi authorize sayfasını kullan - URL constructor ile güvenli
    const authUrl = new URL('https://api.supabase.com/v1/oauth/authorize');
    
    if (!clientId) {
      throw new Error("CLIENT_ID missing");
    }
    
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    // Kullanıcı bilgilerine erişim için gerekli scope'lar
    authUrl.searchParams.set('scope', 'read write user:read user:write profile:read profile:write');
    authUrl.searchParams.set('code_challenge', pkcePair.codeChallenge);
    authUrl.searchParams.set('code_challenge_method', pkcePair.codeChallengeMethod);
    authUrl.searchParams.set('state', state);
    
    console.log('Opening Supabase OAuth page:', authUrl.toString());
    
    // Supabase'in kendi OAuth sayfasını aç
    const result = await createAuthWindow(authUrl.toString(), redirectUri);
    
    if (result.success && result.code && result.state) {
      console.log('OAuth flow completed successfully');
      
      // Token exchange
      const tokenResult = await exchangeCodeForToken(
        result.code,
        pkcePair.codeVerifier,
        redirectUri
      );
      
      if (tokenResult.success) {
        // Token'ları güvenli şekilde sakla
        if (tokenStorage) {
          await tokenStorage.saveTokens(tokenResult.tokens);
          console.log('✅ Tokens saved to tokenStorage');
          
          // Anon key'i de kaydet
          if (tokenResult.anonKey) {
            const authInfo = await tokenStorage.getAuthInfo() || {};
            await tokenStorage.saveAuthInfo({
              ...authInfo,
              anonKey: tokenResult.anonKey
            });
            console.log('✅ Anon key saved to tokenStorage');
          }
        } else {
          console.warn('⚠️ tokenStorage is null, tokens not saved');
        }
        
            // JWT token'ı decode ederek gerçek kullanıcı bilgilerini al
            try {
              console.log('🔍 JWT Debug - Access token length:', tokenResult.tokens.accessToken.length);
              console.log('🔍 JWT Debug - Access token preview:', tokenResult.tokens.accessToken.substring(0, 50) + '...');
              
              const tokenParts = tokenResult.tokens.accessToken.split('.');
              console.log('🔍 JWT Debug - Token parts count:', tokenParts.length);
              
              if (tokenParts.length === 3) {
                try {
                  // Base64 decode with padding
                  let payloadBase64 = tokenParts[1];
                  while (payloadBase64.length % 4) {
                    payloadBase64 += '=';
                  }
                  const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
                  console.log('🔍 JWT Debug - Full payload:', JSON.stringify(payload, null, 2));
                  console.log('🔍 JWT Debug - Email:', payload.email);
                  console.log('🔍 JWT Debug - Name:', payload.name);
                  console.log('🔍 JWT Debug - Sub:', payload.sub);
                  console.log('🔍 JWT Debug - User metadata:', payload.user_metadata);
                  console.log('🔍 JWT Debug - App metadata:', payload.app_metadata);
                  console.log('🔍 JWT Debug - All payload keys:', Object.keys(payload));
                  console.log('🔍 JWT Debug - Email from different fields:', {
                    email: payload.email,
                    email_address: payload.email_address,
                    user_email: payload.user_email,
                    preferred_username: payload.preferred_username,
                    username: payload.username
                  });
                
                // JWT decode başarılı, şimdi gerçek kullanıcı bilgilerini Management API'den al
                const userEmail = payload.email || payload.email_address || payload.user_email || payload.preferred_username;
                if (userEmail) {
                  console.log('JWT decode successful, fetching real user data from Management API...');
                  console.log('🔍 Using email from JWT:', userEmail);
                  
                  // Önce gerçek kullanıcı bilgilerini Management API'den al
                  let realUserData: any = null;
                  let projects: any[] = [];
                  let organizations: any[] = [];
                  
                  try {
                    // Gerçek kullanıcı bilgilerini al - farklı endpoint'ler dene
                    console.log('Fetching real user data from Management API...');
                    console.log('Token preview:', tokenResult.tokens.accessToken.substring(0, 50) + '...');
                    
                    const userEndpoints = [
                      'https://api.supabase.com/v1/user',
                      'https://api.supabase.com/v1/me',
                      'https://api.supabase.com/platform/profile',
                      'https://api.supabase.com/platform/user',
                      'https://api.supabase.com/v1/profile',
                      'https://api.supabase.com/v1/account',
                      'https://api.supabase.com/platform/account'
                    ];
                    
                    for (const endpoint of userEndpoints) {
                      try {
                        console.log(`Trying user endpoint: ${endpoint}`);
                        const userResponse = await fetch(endpoint, {
                          headers: {
                            'Authorization': `Bearer ${tokenResult.tokens.accessToken}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                          }
                        });
                        
                        console.log(`User API response status for ${endpoint}: ${userResponse.status}`);
                        
                        if (userResponse.ok) {
                          realUserData = await userResponse.json();
                          console.log(`✅ Real user data retrieved from ${endpoint}:`, JSON.stringify(realUserData, null, 2));
                          break;
                        } else {
                          const errorText = await userResponse.text();
                          console.warn(`User endpoint ${endpoint} failed: ${userResponse.status} - ${errorText}`);
                        }
                      } catch (error) {
                        console.warn(`Error fetching from ${endpoint}:`, error);
                      }
                    }
                    
                    // Eğer gerçek kullanıcı bilgileri alınamazsa JWT'den fallback yap
                    if (!realUserData) {
                      console.warn('Failed to get real user data from Management API, using JWT fallback');
                      realUserData = {
                        id: payload.sub || payload.user_id || 'user_' + Date.now(),
                        email: userEmail,
                        name: payload.name || userEmail?.split('@')[0] || 'Supabase User',
                        user_metadata: payload.user_metadata || {
                          full_name: payload.name || userEmail?.split('@')[0] || 'Supabase User'
                        },
                        app_metadata: payload.app_metadata || {}
                      };
                    }
                    
                    // Şimdi organizasyonları al
                    console.log('Fetching organizations...');
                    const orgEndpoints = [
                      'https://api.supabase.com/v1/organizations',
                      'https://api.supabase.com/platform/organizations',
                      'https://api.supabase.com/v1/me/organizations'
                    ];
                    
                    let orgsResponse: Response | null = null;
                    let workingEndpoint: string | null = null;
                    
                    for (const endpoint of orgEndpoints) {
                      try {
                        console.log(`Trying organizations endpoint: ${endpoint}`);
                        orgsResponse = await fetch(endpoint, {
                          headers: {
                            'Authorization': `Bearer ${tokenResult.tokens.accessToken}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                          }
                        });
                        
                        if (orgsResponse.ok) {
                          workingEndpoint = endpoint;
                          break;
                        } else {
                          const errorText = await orgsResponse.text();
                          console.warn(`Organizations endpoint ${endpoint} failed: ${orgsResponse.status} - ${errorText}`);
                        }
                      } catch (error) {
                        console.warn(`Error fetching from ${endpoint}:`, error);
                      }
                    }
                    
                    if (orgsResponse && orgsResponse.ok) {
                      const orgsData = await orgsResponse.json();
                      organizations = orgsData.organizations || orgsData || [];
                      console.log(`✅ Organizations retrieved from ${workingEndpoint}:`, organizations.length);
                      
                      // Her organizasyon için projeleri al
                      for (const org of organizations) {
                        try {
                          console.log(`Fetching projects for organization: ${org.id} (${org.name})`);
                          
                          const projectEndpoints = [
                            `https://api.supabase.com/v1/organizations/${org.id}/projects`,
                            `https://api.supabase.com/platform/organizations/${org.id}/projects`,
                            `https://api.supabase.com/v1/projects?organization_id=${org.id}`
                          ];
                          
                          for (const endpoint of projectEndpoints) {
                            try {
                              const orgProjectsResponse = await fetch(endpoint, {
                                headers: {
                                  'Authorization': `Bearer ${tokenResult.tokens.accessToken}`,
                                  'Content-Type': 'application/json',
                                  'Accept': 'application/json'
                                }
                              });
                              
                              if (orgProjectsResponse.ok) {
                                const orgProjectsData = await orgProjectsResponse.json();
                                const orgProjects = orgProjectsData.projects || orgProjectsData || [];
                                
                                if (orgProjects.length > 0) {
                                  const projectsWithOrg = orgProjects.map((project: any) => ({
                                    ...project,
                                    organization_name: org.name,
                                    organization_slug: org.slug
                                  }));
                                  
                                  projects = [...projects, ...projectsWithOrg];
                                  console.log(`✅ Added ${orgProjects.length} projects from ${endpoint}`);
                                  break;
                                }
                              }
                            } catch (error) {
                              console.warn(`Error fetching projects from ${endpoint}:`, error);
                            }
                          }
                        } catch (error) {
                          console.warn(`Error fetching projects for org ${org.id}:`, error);
                        }
                      }
                    }
                    
                    // Format kullanıcı verilerini tutarlı hale getir
                    const formattedUserData = {
                      id: realUserData.id || realUserData.user_id || payload.sub || 'user_' + Date.now(),
                      email: realUserData.email || userEmail,
                      user_metadata: realUserData.user_metadata || {
                        full_name: realUserData.name || realUserData.full_name || payload.name || userEmail?.split('@')[0] || 'Supabase User'
                      },
                      app_metadata: realUserData.app_metadata || payload.app_metadata || {}
                    };
                    
                    console.log('🎯 Final formatted user data:', JSON.stringify(formattedUserData, null, 2));
                    
                    const oauthResult = {
                      ok: true,
                      message: 'OAuth completed successfully',
                      user: formattedUserData,
                      access_token: tokenResult.tokens.accessToken,
                      refresh_token: tokenResult.tokens.refreshToken,
                      orgs: organizations.length > 0 ? organizations : [
                        { id: 'default', name: 'Default Organization', slug: 'default-org' }
                      ],
                      projects: projects
                    };
                    
                    console.log('🔍 OAuth Result Debug:', {
                      hasAccessToken: !!oauthResult.access_token,
                      hasRefreshToken: !!oauthResult.refresh_token,
                      accessTokenPreview: oauthResult.access_token ? oauthResult.access_token.substring(0, 20) + '...' : 'null',
                      userEmail: oauthResult.user?.email,
                      userId: oauthResult.user?.id
                    });
                    
                    return oauthResult;
                    
                  } catch (error) {
                    console.warn('Error in JWT flow user data fetch:', error);
                    // Fallback to JWT data only
                    const jwtUserData = {
                      id: payload.sub || payload.user_id || 'user_' + Date.now(),
                      email: userEmail,
                      user_metadata: payload.user_metadata || {
                        full_name: payload.name || userEmail?.split('@')[0] || 'Supabase User'
                      },
                      app_metadata: payload.app_metadata || {}
                    };
                    
                    const jwtResult = {
                      ok: true,
                      message: 'OAuth completed successfully (JWT fallback)',
                      user: jwtUserData,
                      access_token: tokenResult.tokens.accessToken,
                      refresh_token: tokenResult.tokens.refreshToken,
                      orgs: [{ id: 'default', name: 'Default Organization', slug: 'default-org' }],
                      projects: []
                    };
                    
                    console.log('🔍 JWT Fallback Result Debug:', {
                      hasAccessToken: !!jwtResult.access_token,
                      hasRefreshToken: !!jwtResult.refresh_token,
                      accessTokenPreview: jwtResult.access_token ? jwtResult.access_token.substring(0, 20) + '...' : 'null',
                      userEmail: jwtResult.user?.email,
                      userId: jwtResult.user?.id
                    });
                    
                    return jwtResult;
                  }
                }
              
            } catch (jwtError) {
              console.warn('❌ JWT decode error:', jwtError);
              console.warn('❌ JWT decode failed, will try Management API');
            }
          }
          
            // JWT decode başarısızsa, Supabase Management API'den kullanıcı bilgilerini al
            console.log('JWT decode failed, trying Management API');
            console.log('Using access token for API calls:', tokenResult.tokens.accessToken.substring(0, 20) + '...');

            // Gerçek kullanıcı bilgilerini al - farklı endpoint'ler dene
            console.log('Fetching real user data from Management API...');
            console.log('Token preview:', tokenResult.tokens.accessToken.substring(0, 50) + '...');
            
            const userEndpoints = [
              'https://api.supabase.com/v1/user',
              'https://api.supabase.com/v1/me',
              'https://api.supabase.com/platform/profile',
              'https://api.supabase.com/platform/user',
              'https://api.supabase.com/v1/profile',
              'https://api.supabase.com/v1/account',
              'https://api.supabase.com/platform/account'
            ];
            
            let userResponse: Response | null = null;
            let workingUserEndpoint: string | null = null;
            let userData: any = null;
            
            for (const endpoint of userEndpoints) {
              try {
                console.log(`Trying user endpoint: ${endpoint}`);
                userResponse = await fetch(endpoint, {
                  headers: {
                    'Authorization': `Bearer ${tokenResult.tokens.accessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                  }
                });
                
                console.log(`User API response status for ${endpoint}: ${userResponse.status}`);
                
                if (userResponse.ok) {
                  userData = await userResponse.json();
                  workingUserEndpoint = endpoint;
                  console.log(`✅ Real user data retrieved from ${endpoint}:`, JSON.stringify(userData, null, 2));
                  break;
                } else {
                  const errorText = await userResponse.text();
                  console.warn(`User endpoint ${endpoint} failed: ${userResponse.status} - ${errorText}`);
                }
              } catch (error) {
                console.warn(`Error fetching from ${endpoint}:`, error);
              }
            }

            if (userData) {
              console.log('✅ Management API - User data retrieved successfully');
              console.log('✅ Management API - User email:', userData.email);
              console.log('✅ Management API - User name:', userData.name || userData.full_name);
              console.log('✅ Management API - User metadata:', userData.user_metadata);
            
            // Gerçek projeleri al - doğru Supabase Management API endpoint'lerini kullan
            let projects: any[] = [];
            let organizations: any[] = [];
            
            try {
              // Önce organizasyonları al - farklı endpoint'ler dene
              console.log('Fetching organizations...');
              console.log('Token preview:', tokenResult.tokens.accessToken.substring(0, 50) + '...');
              
              // Farklı endpoint'ler dene - Supabase Management API
              const orgEndpoints = [
                'https://api.supabase.com/v1/organizations',
                'https://api.supabase.com/platform/organizations',
                'https://api.supabase.com/v1/me/organizations',
                'https://api.supabase.com/v1/me',
                'https://api.supabase.com/platform/profile'
              ];
              
              let orgsResponse: Response | null = null;
              let workingEndpoint: string | null = null;
              
              for (const endpoint of orgEndpoints) {
                try {
                  console.log(`Trying organizations endpoint: ${endpoint}`);
                  orgsResponse = await fetch(endpoint, {
                    headers: {
                      'Authorization': `Bearer ${tokenResult.tokens.accessToken}`,
                      'Content-Type': 'application/json',
                      'Accept': 'application/json'
                    }
                  });
                  
                  console.log(`Response status for ${endpoint}: ${orgsResponse.status}`);
                  console.log(`Response headers:`, Object.fromEntries(orgsResponse.headers.entries()));
                  
                  if (orgsResponse.ok) {
                    workingEndpoint = endpoint;
                    break;
                  } else {
                    const errorText = await orgsResponse.text();
                    console.warn(`Failed to fetch from ${endpoint}, status: ${orgsResponse.status}, error: ${errorText}`);
                    console.warn(`Error response headers:`, Object.fromEntries(orgsResponse.headers.entries()));
                  }
                } catch (error) {
                  console.warn(`Error fetching from ${endpoint}:`, error);
                }
              }
              
              console.log(`Organizations API response status: ${orgsResponse?.status || 'No response'}`);
              
              if (orgsResponse && orgsResponse.ok) {
                const responseText = await orgsResponse.text();
                console.log(`Response body from ${workingEndpoint}:`, responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
                
                try {
                  const orgsData = JSON.parse(responseText);
                  organizations = orgsData.organizations || orgsData || [];
                  console.log('Organizations retrieved:', organizations);
                  console.log(`Working endpoint: ${workingEndpoint}`);
                } catch (parseError) {
                  console.warn('Failed to parse organizations response:', parseError);
                  console.warn('Raw response:', responseText);
                }
                
                // Her organizasyon için projeleri al - farklı endpoint'ler dene
                for (const org of organizations) {
                  try {
                    console.log(`Fetching projects for organization: ${org.id} (${org.name})`);
                    
                    // Farklı proje endpoint'lerini dene - Supabase Management API
            const projectEndpoints = [
                      `https://api.supabase.com/v1/organizations/${org.id}/projects`,
                      `https://api.supabase.com/platform/organizations/${org.id}/projects`,
                      `https://api.supabase.com/v1/projects?organization_id=${org.id}`,
                      `https://api.supabase.com/v1/projects`,
                      `https://api.supabase.com/platform/projects`,
                      `https://api.supabase.com/v1/me/projects`
                    ];
                    
                    let orgProjectsResponse: Response | null = null;
                    let projectsFound = false;
            
            for (const endpoint of projectEndpoints) {
              try {
                console.log(`Trying projects endpoint: ${endpoint}`);
                        orgProjectsResponse = await fetch(endpoint, {
                  headers: {
                    'Authorization': `Bearer ${tokenResult.tokens.accessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                  }
                });
                
                        console.log(`Projects API response status for ${endpoint}: ${orgProjectsResponse.status}`);
                        
                        if (orgProjectsResponse.ok) {
                          const orgProjectsData = await orgProjectsResponse.json();
                          const orgProjects = orgProjectsData.projects || orgProjectsData || [];
                          console.log(`Projects for org ${org.id} from ${endpoint}:`, orgProjects);
                          
                          if (orgProjects.length > 0) {
                            // Organizasyon bilgisini projelere ekle
                            const projectsWithOrg = orgProjects.map((project: any) => ({
                              ...project,
                              organization_name: org.name,
                              organization_slug: org.slug
                            }));
                            
                            projects = [...projects, ...projectsWithOrg];
                            projectsFound = true;
                            console.log(`Successfully fetched ${orgProjects.length} projects from ${endpoint}`);
                  break;
                          }
                } else {
                          const errorText = await orgProjectsResponse.text();
                          console.warn(`Projects API failed for ${endpoint}, status: ${orgProjectsResponse.status}, error: ${errorText}`);
                }
              } catch (error) {
                console.warn(`Error fetching projects from ${endpoint}:`, error);
              }
            }
            
                    if (!projectsFound) {
                      console.warn(`No projects found for organization ${org.id} (${org.name})`);
                    }
                  } catch (error) {
                    console.warn(`Error fetching projects for org ${org.id}:`, error);
                  }
                }
            } else {
              console.warn('All user API endpoints failed - no successful response');
            }
            } catch (error) {
              console.warn('Error fetching organizations and projects:', error);
            }
            
            // Eğer hiçbir proje bulunamazsa, kullanıcıya bilgi ver ve boş liste döndür
            if (projects.length === 0) {
              console.log('No projects found for user - this is normal for new accounts');
              console.log('User should create a project in Supabase dashboard first');
              console.log('Returning empty projects array instead of mock data');
            } else {
              console.log(`Successfully fetched ${projects.length} real projects from Supabase API`);
            }
            
            // Format kullanıcı verilerini tutarlı hale getir
            const finalUserData = {
              id: userData.id || userData.user_id || 'user_' + Date.now(),
              email: userData.email || '',
              user_metadata: userData.user_metadata || {
                full_name: userData.name || userData.full_name || userData.email?.split('@')[0] || 'Supabase User'
              },
              app_metadata: userData.app_metadata || {}
            };
            
            console.log('🎯 Final user data being returned:', JSON.stringify(finalUserData, null, 2));
            
            const managementApiResult = {
              ok: true,
              message: 'OAuth completed successfully',
              user: finalUserData,
              access_token: tokenResult.tokens.accessToken,
              refresh_token: tokenResult.tokens.refreshToken,
              orgs: organizations.length > 0 ? organizations : [
                { id: 'default', name: 'Default Organization', slug: 'default-org' }
              ],
              projects: projects
            };
            
            console.log('🔍 Management API Result Debug:', {
              hasAccessToken: !!managementApiResult.access_token,
              hasRefreshToken: !!managementApiResult.refresh_token,
              accessTokenPreview: managementApiResult.access_token ? managementApiResult.access_token.substring(0, 20) + '...' : 'null',
              userEmail: managementApiResult.user?.email,
              userId: managementApiResult.user?.id,
              projectsCount: managementApiResult.projects.length
            });
            
            return managementApiResult;
            } else {
              console.warn('Management API failed - no successful user endpoint response');
            }
        } catch (error) {
          console.warn('Error fetching user data:', error);
        }
        
        // Fallback: User API failed, but still try to get projects with the token
        console.log('User API failed, trying to get projects directly...');
        console.log('Access token that failed user API:', tokenResult.tokens.accessToken.substring(0, 50) + '...');
        
        // Try to extract user info from JWT token as fallback
        let fallbackUserInfo: any = null;
        try {
          const tokenParts = tokenResult.tokens.accessToken.split('.');
          if (tokenParts.length === 3) {
            let payloadBase64 = tokenParts[1];
            while (payloadBase64.length % 4) {
              payloadBase64 += '=';
            }
            const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
            fallbackUserInfo = {
              id: payload.sub || payload.user_id || 'user_' + Date.now(),
              email: payload.email,
              user_metadata: payload.user_metadata || {
                full_name: payload.name || payload.email?.split('@')[0] || 'Supabase User'
              },
              app_metadata: payload.app_metadata || {}
            };
            console.log('Fallback user info from JWT:', fallbackUserInfo);
          }
        } catch (jwtError) {
          console.warn('Failed to extract user info from JWT in fallback:', jwtError);
        }
        
        let projects: any[] = [];
        let organizations: any[] = [];
        
        try {
          // Önce organizasyonları al - farklı endpoint'ler dene
          console.log('Fetching organizations from fallback flow...');
          console.log('Token preview:', tokenResult.tokens.accessToken.substring(0, 50) + '...');
          
          // Farklı endpoint'ler dene - Supabase Management API
          const orgEndpoints = [
            'https://api.supabase.com/v1/organizations',
            'https://api.supabase.com/platform/organizations',
            'https://api.supabase.com/v1/me/organizations',
            'https://api.supabase.com/v1/me',
            'https://api.supabase.com/platform/profile'
          ];
          
          let orgsResponse: Response | null = null;
          let workingEndpoint: string | null = null;
          
          for (const endpoint of orgEndpoints) {
            try {
              console.log(`Trying organizations endpoint: ${endpoint}`);
              orgsResponse = await fetch(endpoint, {
                headers: {
                  'Authorization': `Bearer ${tokenResult.tokens.accessToken}`,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                }
              });
              
              console.log(`Response status for ${endpoint}: ${orgsResponse.status}`);
              console.log(`Response headers:`, Object.fromEntries(orgsResponse.headers.entries()));
              
              if (orgsResponse.ok) {
                workingEndpoint = endpoint;
                break;
              } else {
                const errorText = await orgsResponse.text();
                console.warn(`Failed to fetch from ${endpoint}, status: ${orgsResponse.status}, error: ${errorText}`);
                console.warn(`Error response headers:`, Object.fromEntries(orgsResponse.headers.entries()));
              }
            } catch (error) {
              console.warn(`Error fetching from ${endpoint}:`, error);
            }
          }
          
          console.log(`Organizations API response status: ${orgsResponse?.status || 'No response'}`);
          
          if (orgsResponse && orgsResponse.ok) {
            const responseText = await orgsResponse.text();
            console.log(`Response body from ${workingEndpoint}:`, responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
            
            try {
              const orgsData = JSON.parse(responseText);
              organizations = orgsData.organizations || orgsData || [];
              console.log('Organizations retrieved:', organizations);
              console.log(`Working endpoint: ${workingEndpoint}`);
            } catch (parseError) {
              console.warn('Failed to parse organizations response:', parseError);
              console.warn('Raw response:', responseText);
            }
            
            // Her organizasyon için projeleri al - farklı endpoint'ler dene
            for (const org of organizations) {
              try {
                console.log(`Fetching projects for organization: ${org.id} (${org.name})`);
                
                    // Farklı proje endpoint'lerini dene - Supabase Management API
                    const projectEndpoints = [
                      `https://api.supabase.com/v1/organizations/${org.id}/projects`,
                      `https://api.supabase.com/platform/organizations/${org.id}/projects`,
                      `https://api.supabase.com/v1/projects?organization_id=${org.id}`,
                      `https://api.supabase.com/v1/projects`,
                      `https://api.supabase.com/platform/projects`,
                      `https://api.supabase.com/v1/me/projects`
                    ];
                
                let orgProjectsResponse: Response | null = null;
                let projectsFound = false;
                
                for (const endpoint of projectEndpoints) {
                  try {
                    console.log(`Trying projects endpoint: ${endpoint}`);
                    orgProjectsResponse = await fetch(endpoint, {
                      headers: {
                        'Authorization': `Bearer ${tokenResult.tokens.accessToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                      }
                    });
                    
                    console.log(`Projects API response status for ${endpoint}: ${orgProjectsResponse.status}`);
                    
                    if (orgProjectsResponse.ok) {
                      const orgProjectsData = await orgProjectsResponse.json();
                      const orgProjects = orgProjectsData.projects || orgProjectsData || [];
                      console.log(`Projects for org ${org.id} from ${endpoint}:`, orgProjects);
                      
                      if (orgProjects.length > 0) {
                        // Organizasyon bilgisini projelere ekle
                        const projectsWithOrg = orgProjects.map((project: any) => ({
                          ...project,
                          organization_name: org.name,
                          organization_slug: org.slug
                        }));
                        
                        projects = [...projects, ...projectsWithOrg];
                        projectsFound = true;
                        console.log(`Successfully fetched ${orgProjects.length} projects from ${endpoint}`);
                        break;
                      }
                    } else {
                      const errorText = await orgProjectsResponse.text();
                      console.warn(`Projects API failed for ${endpoint}, status: ${orgProjectsResponse.status}, error: ${errorText}`);
                    }
                  } catch (error) {
                    console.warn(`Error fetching projects from ${endpoint}:`, error);
                  }
                }
                
                if (!projectsFound) {
                  console.warn(`No projects found for organization ${org.id} (${org.name})`);
                }
              } catch (error) {
                console.warn(`Error fetching projects for org ${org.id}:`, error);
              }
            }
          } else {
            if (orgsResponse) {
              const errorText = await orgsResponse.text();
              console.warn('All organizations API endpoints failed in fallback flow');
              console.warn('Last response status:', orgsResponse.status);
              console.warn('Last error response:', errorText);
            } else {
              console.warn('All organizations API endpoints failed in fallback flow - no successful response');
            }
          }
        } catch (error) {
          console.warn('Error fetching organizations and projects from fallback flow:', error);
        }
        
        // Eğer hiçbir proje bulunamazsa, kullanıcıya bilgi ver
        if (projects.length === 0) {
          console.log('No projects found for user - this is normal for new accounts');
          console.log('User should create a project in Supabase dashboard first');
        }
        
        // Format fallback kullanıcı verilerini tutarlı hale getir
        const fallbackUserData = fallbackUserInfo || {
          id: 'user_' + Date.now(),
          email: '',
          user_metadata: {
            full_name: 'Supabase User'
          },
          app_metadata: {}
        };
        
        console.log('🎯 Fallback user data being returned:', JSON.stringify(fallbackUserData, null, 2));
        
        return {
          ok: true,
          message: 'OAuth completed successfully (fallback)',
          user: fallbackUserData,
          orgs: organizations.length > 0 ? organizations : [
            { id: 'default', name: 'Default Organization', slug: 'default-org' }
          ],
          projects: projects
        };
      } else {
        return {
          ok: false,
          error: tokenResult.error || 'Token exchange failed'
        };
      }
    } else {
      return {
        ok: false,
        error: result.error || 'OAuth flow failed'
      };
    }
  } catch (error) {
    console.error('Supabase OAuth error:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'OAuth failed'
    };
  }
});

ipcMain.handle('supabase:getAuthStatus', async () => {
  try {
    if (!tokenStorage) {
      return {
        ok: false,
        error: 'Token storage not initialized'
      };
    }
    
    const tokens = await tokenStorage.getTokens();
    const status = await tokenStorage.getStorageStatus();
    
    return {
      ok: true,
      hasTokens: !!tokens,
      isTokenValid: tokens ? tokens.expiresAt > Date.now() : false,
      storageMethod: status.storageMethod,
      message: 'Auth status checked'
    };
  } catch (error) {
    console.error('Get auth status error:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to get auth status'
    };
  }
});

// Fetch user info handler
ipcMain.handle('supabase:fetchUserInfo', async () => {
  try {
    if (!tokenStorage) {
      return {
        ok: false,
        error: 'Token storage not initialized'
      };
    }

    const tokens = await tokenStorage.getTokens();
    if (!tokens || tokens.expiresAt <= Date.now()) {
      return {
        ok: false,
        error: 'No valid access token available'
      };
    }

    console.log('Fetching user info from Management API...');

    const userEndpoints = [
      'https://api.supabase.com/v1/profile',
      'https://api.supabase.com/v1/user',
      'https://api.supabase.com/v1/me',
    ];

    for (const endpoint of userEndpoints) {
      try {
        console.log(`Trying user endpoint: ${endpoint}`);
        const userResponse = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log(`✅ User data retrieved from ${endpoint}`);
          return {
            ok: true,
            user: userData
          };
        }
      } catch (error) {
        console.warn(`Error fetching from ${endpoint}:`, error);
      }
    }

    // Fallback to auth info
    const authInfo = await tokenStorage.getAuthInfo();
    if (authInfo) {
      return {
        ok: true,
        user: {
          email: '',
          ...authInfo
        }
      };
    }

    return {
      ok: false,
      error: 'Failed to fetch user info'
    };
  } catch (error) {
    console.error('Fetch user info error:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user info'
    };
  }
});

ipcMain.handle('supabase:logout', async () => {
  try {
    if (!tokenStorage) {
      return {
        ok: false,
        error: 'Token storage not initialized'
      };
    }
    
    // Tüm token'ları temizle
    await tokenStorage.clearAll();
    console.log('Tokens deleted');
    
    // OAuth server'ı durdur
    if (oauthServer) {
      await oauthServer.stop();
      oauthServer = null;
    }
    
    // Tüm auth verilerini temizle
    try {
      // Keytar'dan tüm kayıtları temizle
      const keytar = require('keytar');
      const serviceName = 'DocDataApp';
      
      // Tüm kayıtları al ve sil
      const credentials = await keytar.findCredentials(serviceName);
      for (const credential of credentials) {
        await keytar.deletePassword(serviceName, credential.account);
      }
      console.log('All auth data cleared');
      
      // Electron session'ından çerezleri temizle
      if (mainWindow && mainWindow.webContents) {
        const session = mainWindow.webContents.session;
        
        // Tüm çerezleri temizle
        await session.clearStorageData({
          storages: ['cookies', 'localstorage', 'indexdb', 'websql', 'cachestorage']
        });
        
        // Supabase domain'lerindeki çerezleri özellikle temizle
        const supabaseDomains = [
          'supabase.com',
          'api.supabase.com',
          'frontend-assets.supabase.com',
          'ph.supabase.com',
          'configcat.supabase.com'
        ];
        
        for (const domain of supabaseDomains) {
          try {
            await session.clearStorageData({
              origin: `https://${domain}`,
              storages: ['cookies', 'localstorage', 'indexdb', 'websql', 'cachestorage']
            });
            console.log(`Cleared storage for ${domain}`);
          } catch (domainError) {
            console.warn(`Error clearing storage for ${domain}:`, domainError);
          }
        }
        
        console.log('Electron session storage cleared');
      }
    } catch (keytarError) {
      console.warn('Keytar cleanup error:', keytarError);
    }
    
    console.log('Supabase logout successful');
    return {
      ok: true,
      message: 'Logged out successfully'
    };
  } catch (error) {
    console.error('Supabase logout error:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Logout failed'
    };
  }
});

// Auth handlers moved to ipc-handlers.ts

// NOTE: File processing handlers (file:process, file:open, file:save, etc.)
// are now implemented in ipc-handlers.ts to avoid duplicate handler errors.
// The legacy implementations below have been commented out.

/*
// LEGACY - File processing handlers (MOVED TO ipc-handlers.ts)
ipcMain.handle('file:process', async (event, filePath, options) => {
  // ... implementation moved to ipc-handlers.ts
});

// LEGACY - File operations (MOVED TO ipc-handlers.ts)
ipcMain.handle('file:open', async () => {
  // ... implementation moved to ipc-handlers.ts
});

ipcMain.handle('file:save', async (event, data, defaultName) => {
  // ... implementation moved to ipc-handlers.ts
});

// LEGACY - Directory selection (MOVED TO ipc-handlers.ts)
ipcMain.handle('selectDirectory', async () => {
  // ... implementation moved to ipc-handlers.ts
});

// LEGACY - Default directory (MOVED TO ipc-handlers.ts)
ipcMain.handle('getDefaultDirectory', async () => {
  return getAutoSavePath();
});

// LEGACY - Data handlers (MOVED TO ipc-handlers.ts)
ipcMain.handle('data:getHistory', async () => {
  return [];
});

ipcMain.handle('data:saveConversion', async (event, record) => {
  console.log('Saving conversion record:', record);
  return true;
});

ipcMain.handle('data:getTemplates', async () => {
  return [];
});

ipcMain.handle('data:saveTemplate', async (event, template) => {
  console.log('Saving template:', template);
  return true;
});

// LEGACY - Settings handlers (MOVED TO ipc-handlers.ts)
ipcMain.handle('settings:get', async (event, key) => {
  return null;
});

ipcMain.handle('settings:set', async (event, key, value) => {
  console.log('Setting:', key, value);
  return true;
});

ipcMain.handle('settings:getAll', async () => {
  return {};
});

// LEGACY - App info handlers (MOVED TO ipc-handlers.ts)
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getPlatform', () => {
  return process.platform;
});
*/

// NOTE: Safety & Packaging Notları
// 1. Keytar kullanılıyorsa: npm run electron-rebuild:keytar
// 2. Client secret kullanılıyorsa: Token exchange main process'te yapılmalı
// 3. Development sırasında detaylı log için: ELECTRON_ENABLE_LOGGING=true
// 4. Stack dump için: ELECTRON_ENABLE_STACK_DUMPING=true
// 5. Native modül hatası varsa: npm run electron-rebuild

// Test talimatları (yorum olarak):
// 1. Terminali yeniden başlat
// 2. npm run dev:main
// 3. Hala crashpad logu geliyorsa tam terminal kapatıp tekrar dene
// 4. Native modül varsa: npm run electron-rebuild