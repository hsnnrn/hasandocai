import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('supabaseAPI', {
  // Supabase OAuth Methods
  startSupabaseAuth: (options: { method?: 'local' | 'custom'; preferExternal?: boolean }) => 
    ipcRenderer.invoke('supabase:startAuth', options),
  getAuthStatus: () => ipcRenderer.invoke('supabase:getAuthStatus'),
  logoutSupabase: () => ipcRenderer.invoke('supabase:logout'),
  // Supabase Management API Methods
  fetchProjects: () => ipcRenderer.invoke('supabase:fetchProjects'),
  fetchUserInfo: () => ipcRenderer.invoke('supabase:fetchUserInfo'),
});

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFiles: () => ipcRenderer.invoke('file:open'),
  processFile: (filePath: string, options: any) => ipcRenderer.invoke('file:process', filePath, options),
  saveFile: (data: Buffer, defaultName: string) => ipcRenderer.invoke('file:save', data, defaultName),
  saveFileFromPath: (tempPath: string, defaultName: string) => ipcRenderer.invoke('file:saveFromPath', tempPath, defaultName),
  selectDirectory: () => ipcRenderer.invoke('selectDirectory'),
  getDefaultDirectory: () => ipcRenderer.invoke('getDefaultDirectory'),
  
  // Advanced PDF processing
  convertPDFToDOCX: (filePath: string, options: any) => ipcRenderer.invoke('pdf:convertToDOCX', filePath, options),
  convertPDFToDOCXEnhanced: (filePath: string, options: any) => ipcRenderer.invoke('pdf:convertToDOCXEnhanced', filePath, options),

  // Data operations
  getConversionHistory: (filter?: any) => ipcRenderer.invoke('data:getHistory', filter),
  saveConversion: (record: any) => ipcRenderer.invoke('data:saveConversion', record),
  getTemplates: () => ipcRenderer.invoke('data:getTemplates'),
  saveTemplate: (template: any) => ipcRenderer.invoke('data:saveTemplate', template),

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value),
  getAllSettings: () => ipcRenderer.invoke('settings:getAll'),

  // App info
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),

  // Event listeners
  onUpdateAvailable: (callback: () => void) => {
    ipcRenderer.on('update:available', callback);
  },
  onUpdateDownloaded: (callback: () => void) => {
    ipcRenderer.on('update:downloaded', callback);
  },
  onShowSettings: (callback: () => void) => {
    ipcRenderer.on('app:showSettings', callback);
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Types for TypeScript
declare global {
  interface Window {
    supabaseAPI: {
      startSupabaseAuth: (options: { method?: 'local' | 'custom'; preferExternal?: boolean }) => Promise<{
        ok: boolean;
        orgs?: any[];
        projects?: any[];
        selectedOrg?: any;
        selectedProject?: any;
        error?: string;
        reason?: string;
      }>;
      getAuthStatus: () => Promise<{
        ok: boolean;
        tokens?: any;
        authInfo?: any;
        hasTokens?: boolean;
        isTokenValid?: boolean;
        error?: string;
      }>;
      logoutSupabase: () => Promise<{
        ok: boolean;
        message?: string;
        error?: string;
      }>;
      fetchProjects: () => Promise<{
        ok: boolean;
        projects?: Array<{
          id: string;
          name: string;
          ref: string;
          project_api_url: string;
          status: string;
          organization_id?: string;
          organization_name?: string;
          organization_slug?: string;
          region?: string;
        }>;
        organizations?: any[];
        message?: string;
        error?: string;
      }>;
      fetchUserInfo: () => Promise<{
        ok: boolean;
        user?: {
          id: string;
          email: string;
          user_metadata: {
            full_name: string;
          };
          app_metadata: any;
        };
        message?: string;
        error?: string;
      }>;
    };
    electronAPI: {
      openFiles: () => Promise<Array<{ path: string; name: string; size: number; type: string }>>;
      processFile: (filePath: string, options: any) => Promise<any>;
      saveFile: (data: Buffer, defaultName: string) => Promise<string | null>;
      saveFileFromPath: (tempPath: string, defaultName: string) => Promise<string | null>;
      convertPDFToDOCX: (filePath: string, options: any) => Promise<any>;
      convertPDFToDOCXEnhanced: (filePath: string, options: any) => Promise<any>;
      getConversionHistory: (filter?: any) => Promise<any[]>;
      saveConversion: (record: any) => Promise<void>;
      getTemplates: () => Promise<any[]>;
      saveTemplate: (template: any) => Promise<void>;
      getSetting: (key: string) => Promise<any>;
      setSetting: (key: string, value: any) => Promise<void>;
      getAllSettings: () => Promise<any>;
      getAppVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;
      onUpdateAvailable: (callback: () => void) => void;
      onUpdateDownloaded: (callback: () => void) => void;
      onShowSettings: (callback: () => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}