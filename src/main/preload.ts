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
  fetchProjectApiKeys: (projectId: string) => ipcRenderer.invoke('supabase:fetchProjectApiKeys', projectId),
  // Supabase Configuration
  getSupabaseConfig: () => ipcRenderer.invoke('supabase:getConfig'),
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

  // BGE-M3 Embedding and Indexing Methods
  initializeSupabase: () => ipcRenderer.invoke('embedding:initializeSupabase'),
  checkModelHealth: () => ipcRenderer.invoke('embedding:checkHealth'),
  generateEmbeddings: (texts: string[], options?: any) => ipcRenderer.invoke('embedding:generateEmbeddings', texts, options),
  indexDocument: (request: any) => ipcRenderer.invoke('embedding:indexDocument', request),
  batchIndexDocuments: (projectRef: string, documents: any[]) => ipcRenderer.invoke('embedding:batchIndexDocuments', projectRef, documents),
  processAndIndexFile: (filePath: string, projectRef: string, options?: any) => ipcRenderer.invoke('embedding:processAndIndexFile', filePath, projectRef, options),
  searchSimilar: (queryText: string, projectRef?: string, options?: any) => ipcRenderer.invoke('embedding:searchSimilar', queryText, projectRef, options),
  getEmbeddingConfig: () => ipcRenderer.invoke('embedding:getConfig'),

  // PDF Analysis Methods
  initializePDFService: () => ipcRenderer.invoke('pdf:initializeService'),
  analyzePDF: (filePath: string, options?: any) => ipcRenderer.invoke('pdf:analyzePDF', filePath, options),
  analyzePDFBuffer: (buffer: Uint8Array, filename: string, options?: any) => ipcRenderer.invoke('pdf:analyzePDFBuffer', buffer, filename, options),
  analyzePDFOptimized: (filePath: string, options?: any) => ipcRenderer.invoke('pdf:analyzePDFOptimized', filePath, options),
  analyzePDFBufferOptimized: (buffer: Uint8Array, filename: string, filePath: string, options?: any) => ipcRenderer.invoke('pdf:analyzePDFBufferOptimized', buffer, filename, filePath, options),
  getDocumentAnalysis: (documentId: string) => ipcRenderer.invoke('pdf:getDocumentAnalysis', documentId),
  searchDocuments: (query: string, options?: any) => ipcRenderer.invoke('pdf:searchDocuments', query, options),
  getDocuments: (options?: any) => ipcRenderer.invoke('pdf:getDocuments', options),
  deleteDocument: (documentId: string) => ipcRenderer.invoke('pdf:deleteDocument', documentId),

  // DOCX Analysis Methods
  initializeDOCXService: () => ipcRenderer.invoke('docx:initializeService'),
  analyzeDOCXBuffer: (buffer: Uint8Array, filename: string, options?: any) => ipcRenderer.invoke('docx:analyzeDOCXBuffer', buffer, filename, options),

  // Excel Analysis Methods
  initializeExcelService: () => ipcRenderer.invoke('excel:initializeService'),
  analyzeExcelBuffer: (buffer: Uint8Array, filename: string, options?: any) => ipcRenderer.invoke('excel:analyzeExcelBuffer', buffer, filename, options),

  // PowerPoint Analysis Methods
  initializePowerPointService: () => ipcRenderer.invoke('powerpoint:initializeService'),
  analyzePowerPointBuffer: (buffer: Uint8Array, filename: string, options?: any) => ipcRenderer.invoke('powerpoint:analyzePowerPointBuffer', buffer, filename, options),

  // Supabase Upload Methods
  uploadAnalysisToSupabase: (analysisResult: any) => ipcRenderer.invoke('supabase:uploadAnalysis', analysisResult),
  
  // Auth Methods
  saveAuthInfo: (authInfo: any) => ipcRenderer.invoke('auth:saveAuthInfo', authInfo),
  getSupabaseCredentials: () => ipcRenderer.invoke('auth:getSupabaseCredentials'),
  saveSupabaseCredentials: (credentials: any) => ipcRenderer.invoke('auth:saveSupabaseCredentials', credentials),
  clearSupabaseCredentials: () => ipcRenderer.invoke('auth:clearSupabaseCredentials'),

  // Group Analysis Methods
  initializeGroupAnalysisService: () => ipcRenderer.invoke('group:initializeGroupAnalysisService'),
  analyzeGroup: (groupData: any, analysisTypes?: string[]) => ipcRenderer.invoke('group:analyzeGroup', groupData, analysisTypes),
  getGroupAnalysisResults: (groupId: string) => ipcRenderer.invoke('group:getGroupAnalysisResults', groupId),

  // Persistent Local Storage Methods (prevents data loss on PC restart)
  persistentStorage: {
    isEnabled: () => ipcRenderer.invoke('persistent-storage:is-enabled'),
    setEnabled: (enabled: boolean) => ipcRenderer.invoke('persistent-storage:set-enabled', enabled),
    saveData: (data: any) => ipcRenderer.invoke('persistent-storage:save-data', data),
    getData: (id: string) => ipcRenderer.invoke('persistent-storage:get-data', id),
    getAllData: () => ipcRenderer.invoke('persistent-storage:get-all-data'),
    getDataByType: (type: string) => ipcRenderer.invoke('persistent-storage:get-data-by-type', type),
    getDataByFilePath: (filePath: string) => ipcRenderer.invoke('persistent-storage:get-data-by-file-path', filePath),
    searchData: (query: string) => ipcRenderer.invoke('persistent-storage:search-data', query),
    deleteData: (id: string) => ipcRenderer.invoke('persistent-storage:delete-data', id),
    clearAllData: () => ipcRenderer.invoke('persistent-storage:clear-all-data'),
    getStats: () => ipcRenderer.invoke('persistent-storage:get-stats'),
    exportData: () => ipcRenderer.invoke('persistent-storage:export-data'),
    importData: (jsonData: string) => ipcRenderer.invoke('persistent-storage:import-data', jsonData),
    getPath: () => ipcRenderer.invoke('persistent-storage:get-path'),
    getLocalDocs: () => ipcRenderer.invoke('persistent-storage:get-local-docs'),
  },

  // Debug Methods
  debug: {
    checkStorage: () => ipcRenderer.invoke('debug:check-storage'),
  },

  // Ollama Management Methods (auto-start AI server)
  ollama: {
    getStatus: () => ipcRenderer.invoke('ollama:status'),
    start: () => ipcRenderer.invoke('ollama:start'),
    stop: () => ipcRenderer.invoke('ollama:stop'),
    ensureRunning: () => ipcRenderer.invoke('ollama:ensure-running'),
  },
});

// AI Chat API
contextBridge.exposeInMainWorld('aiAPI', {
  // AI Chat Query Methods
  initializeChatController: () => ipcRenderer.invoke('ai:initializeChatController'),
  chatQuery: (request: any) => ipcRenderer.invoke('ai:chatQuery', request),
  documentChatQuery: (request: any) => ipcRenderer.invoke('ai:documentChatQuery', request),
  healthCheck: () => ipcRenderer.invoke('ai:healthCheck'),
  
  // Migration Methods
  migrateExistingData: () => ipcRenderer.invoke('ai:migrateExistingData'),
  getMigrationStatus: () => ipcRenderer.invoke('ai:getMigrationStatus'),
  clearMigratedData: () => ipcRenderer.invoke('ai:clearMigratedData'),
  
  // Document Migration Methods (NEW - for semantic classification)
  migrateAllDocuments: () => ipcRenderer.invoke('migration:migrateAllDocuments'),
  getDocumentMigrationStatus: () => ipcRenderer.invoke('migration:getStatus'),
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
      getSupabaseConfig: () => Promise<{
        success: boolean;
        config?: {
          url: string;
          anonKey: string;
          oauthClientId?: string;
          oauthClientSecret?: string;
        };
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
      // BGE-M3 Embedding and Indexing Methods
      initializeSupabase: () => Promise<{ success: boolean; message?: string; error?: string }>;
      checkModelHealth: () => Promise<{ success: boolean; health?: any; isHealthy?: boolean; error?: string }>;
      generateEmbeddings: (texts: string[], options?: any) => Promise<{ success: boolean; embeddings?: number[][]; count?: number; dimension?: number; error?: string }>;
      indexDocument: (request: any) => Promise<{ success: boolean; documentId?: string; error?: string }>;
      batchIndexDocuments: (projectRef: string, documents: any[]) => Promise<{ success: boolean; documentId?: string; error?: string }>;
      processAndIndexFile: (filePath: string, projectRef: string, options?: any) => Promise<{ success: boolean; documentId?: string; error?: string; metadata?: any }>;
      searchSimilar: (queryText: string, projectRef?: string, options?: any) => Promise<{ success: boolean; results?: any[]; error?: string }>;
      getEmbeddingConfig: () => Promise<{ success: boolean; config?: any; error?: string }>;

      // PDF Analysis Methods
      initializePDFService: () => Promise<{ success: boolean; message?: string; error?: string }>;
      analyzePDF: (filePath: string, options?: any) => Promise<{
        success: boolean;
        documentId?: string;
        title?: string;
        filename?: string;
        pageCount?: number;
        textSections?: any[];
        aiCommentary?: any[];
        processingTime?: number;
        error?: string;
      }>;
      analyzePDFBuffer: (buffer: Uint8Array, filename: string, options?: any) => Promise<{
        success: boolean;
        documentId?: string;
        title?: string;
        filename?: string;
        pageCount?: number;
        textSections?: any[];
        aiCommentary?: any[];
        processingTime?: number;
        error?: string;
      }>;
      analyzePDFOptimized: (filePath: string, options?: any) => Promise<{
        documentId: string;
        title: string;
        filename: string;
        filePath: string;
        mimeType: string;
        fileSize: number;
        checksum: string;
        fileSource: 'user-upload' | 'watched-folder' | 'imported';
        createdAt: string;
        updatedAt: string;
        processed: boolean;
        processorVersion: string;
        language: string;
        ocrConfidence: number;
        structuredData: any;
        textSections: any[];
        tags: string[];
        notes: string;
        ownerUserId: string;
        sensitivity: 'public' | 'private' | 'restricted';
      }>;
      analyzePDFBufferOptimized: (buffer: Uint8Array, filename: string, filePath: string, options?: any) => Promise<{
        documentId: string;
        title: string;
        filename: string;
        filePath: string;
        mimeType: string;
        fileSize: number;
        checksum: string;
        fileSource: 'user-upload' | 'watched-folder' | 'imported';
        createdAt: string;
        updatedAt: string;
        processed: boolean;
        processorVersion: string;
        language: string;
        ocrConfidence: number;
        structuredData: any;
        textSections: any[];
        tags: string[];
        notes: string;
        ownerUserId: string;
        sensitivity: 'public' | 'private' | 'restricted';
      }>;
      getDocumentAnalysis: (documentId: string) => Promise<{ success: boolean; analysis?: any; error?: string }>;
      searchDocuments: (query: string, options?: any) => Promise<{ success: boolean; results?: any[]; error?: string }>;
      getDocuments: (options?: any) => Promise<{ success: boolean; documents?: any[]; error?: string }>;
      deleteDocument: (documentId: string) => Promise<{ success: boolean; message?: string; error?: string }>;

      // DOCX Analysis Methods
      initializeDOCXService: () => Promise<{ success: boolean; message?: string; error?: string }>;
      analyzeDOCXBuffer: (buffer: Uint8Array, filename: string, options?: any) => Promise<{
        success: boolean;
        documentId?: string;
        title?: string;
        filename?: string;
        pageCount?: number;
        textSections?: any[];
        aiCommentary?: any[];
        processingTime?: number;
        error?: string;
      }>;

      // Excel Analysis Methods
      initializeExcelService: () => Promise<{ success: boolean; message?: string; error?: string }>;
      analyzeExcelBuffer: (buffer: Uint8Array, filename: string, options?: any) => Promise<{
        success: boolean;
        documentId?: string;
        title?: string;
        filename?: string;
        sheetCount?: number;
        textSections?: any[];
        aiCommentary?: any[];
        processingTime?: number;
        error?: string;
      }>;

      // PowerPoint Analysis Methods
      initializePowerPointService: () => Promise<{ success: boolean; message?: string; error?: string }>;
      analyzePowerPointBuffer: (buffer: Uint8Array, filename: string, options?: any) => Promise<{
        success: boolean;
        documentId?: string;
        title?: string;
        filename?: string;
        slideCount?: number;
        textSections?: any[];
        aiCommentary?: any[];
        processingTime?: number;
        error?: string;
      }>;

      // Supabase Upload Methods
      uploadAnalysisToSupabase: (analysisResult: any) => Promise<{
        success: boolean;
        message?: string;
        documentId?: string;
        uploadedAt?: string;
        error?: string;
      }>;
      
      // Auth Methods
      saveAuthInfo: (authInfo: any) => Promise<{
        success: boolean;
        error?: string;
      }>;
      getSupabaseCredentials: () => Promise<any>;
      saveSupabaseCredentials: (credentials: any) => Promise<void>;
      clearSupabaseCredentials: () => Promise<void>;

      // Group Analysis Methods
      initializeGroupAnalysisService: () => Promise<{
        success: boolean;
        message?: string;
        error?: string;
      }>;
      analyzeGroup: (groupData: any, analysisTypes?: string[]) => Promise<{
        success: boolean;
        results?: any[];
        message?: string;
        error?: string;
      }>;
      getGroupAnalysisResults: (groupId: string) => Promise<{
        success: boolean;
        results?: any[];
        message?: string;
        error?: string;
      }>;
    };

    aiAPI: {
      // AI Chat Query Methods
      initializeChatController: () => Promise<{
        success: boolean;
        message?: string;
        health?: {
          llama: boolean;
        };
        error?: string;
      }>;
      
      chatQuery: (request: {
        userId: string;
        query: string;
        conversationHistory?: Array<{
          role: 'user' | 'assistant';
          content: string;
        }>;
      }) => Promise<{
        success: boolean;
        payload?: {
          answer: string;
          modelMeta: {
            model: string;
            latencyMs: number;
          };
        };
        error?: string;
      }>;

      healthCheck: () => Promise<{
        success: boolean;
        health?: {
          llama: boolean;
        };
        allHealthy?: boolean;
        error?: string;
      }>;

      addDocumentToLocalStorage: (request: any) => Promise<{
        success: boolean;
        message?: string;
        error?: string;
      }>;
      getStoredDocuments: () => Promise<{
        success: boolean;
        documents?: any[];
        error?: string;
      }>;
      clearStoredDocuments: () => Promise<{
        success: boolean;
        message?: string;
        error?: string;
      }>;

      migrateExistingData: () => Promise<{
        success: boolean;
        migratedCount: number;
        errors: string[];
        message?: string;
      }>;
      getMigrationStatus: () => Promise<{
        success: boolean;
        status?: {
          totalConversions: number;
          migratedDocuments: number;
          needsMigration: boolean;
        };
        error?: string;
      }>;
      clearMigratedData: () => Promise<{
        success: boolean;
        message?: string;
        error?: string;
      }>;
    };

    // Persistent Local Storage API (prevents data loss on PC restart)
    persistentStorage: {
      isEnabled: () => Promise<{ success: boolean; enabled: boolean; error?: string }>;
      setEnabled: (enabled: boolean) => Promise<{ success: boolean; enabled?: boolean; error?: string }>;
      saveData: (data: any) => Promise<{ success: boolean; error?: string }>;
      getData: (id: string) => Promise<{ success: boolean; data: any; error?: string }>;
      getAllData: () => Promise<{ success: boolean; data: any[]; error?: string }>;
      getDataByType: (type: string) => Promise<{ success: boolean; data: any[]; error?: string }>;
      getDataByFilePath: (filePath: string) => Promise<{ success: boolean; data: any[]; error?: string }>;
      searchData: (query: string) => Promise<{ success: boolean; data: any[]; error?: string }>;
      deleteData: (id: string) => Promise<{ success: boolean; error?: string }>;
      clearAllData: () => Promise<{ success: boolean; error?: string }>;
      getStats: () => Promise<{ success: boolean; stats: any; error?: string }>;
      exportData: () => Promise<{ success: boolean; data?: string; error?: string }>;
      importData: (jsonData: string) => Promise<{ success: boolean; imported: number; errors: string[] }>;
      getPath: () => Promise<{ success: boolean; path: string; error?: string }>;
      getLocalDocs: () => Promise<{ success: boolean; documents: any[]; count: number; error?: string }>;
    };

    // Debug API
    debug: {
      checkStorage: () => Promise<{ success: boolean; data?: any; error?: string }>;
    };
  }
}