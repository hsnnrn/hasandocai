const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('supabaseAPI', {
  // Supabase OAuth Methods
  startSupabaseAuth: (options) => ipcRenderer.invoke('supabase:startAuth', options),
  getAuthStatus: () => ipcRenderer.invoke('supabase:getAuthStatus'),
  logoutSupabase: () => ipcRenderer.invoke('supabase:logout'),
  // Supabase Management API Methods
  fetchProjects: () => ipcRenderer.invoke('supabase:fetchProjects'),
  fetchUserInfo: () => ipcRenderer.invoke('supabase:fetchUserInfo'),
  fetchProjectApiKeys: (projectId) => ipcRenderer.invoke('supabase:fetchProjectApiKeys', projectId),
  // Supabase Configuration
  getSupabaseConfig: () => ipcRenderer.invoke('supabase:getConfig'),
});

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFiles: () => ipcRenderer.invoke('file:open'),
  processFile: (filePath, options) => ipcRenderer.invoke('file:process', filePath, options),
  saveFile: (data, defaultName) => ipcRenderer.invoke('file:save', data, defaultName),
  saveFileFromPath: (tempPath, defaultName) => ipcRenderer.invoke('file:saveFromPath', tempPath, defaultName),
  selectDirectory: () => ipcRenderer.invoke('selectDirectory'),
  getDefaultDirectory: () => ipcRenderer.invoke('getDefaultDirectory'),
  
  // Advanced PDF processing
  convertPDFToDOCX: (filePath, options) => ipcRenderer.invoke('pdf:convertToDOCX', filePath, options),
  convertPDFToDOCXEnhanced: (filePath, options) => ipcRenderer.invoke('pdf:convertToDOCXEnhanced', filePath, options),

  // Data operations
  getConversionHistory: (filter) => ipcRenderer.invoke('data:getHistory', filter),
  saveConversion: (record) => ipcRenderer.invoke('data:saveConversion', record),
  getTemplates: () => ipcRenderer.invoke('data:getTemplates'),
  saveTemplate: (template) => ipcRenderer.invoke('data:saveTemplate', template),

  // Settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  getAllSettings: () => ipcRenderer.invoke('settings:getAll'),

  // App info
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),

  // BGE-M3 Embedding and Indexing Methods
  initializeSupabase: () => ipcRenderer.invoke('embedding:initializeSupabase'),
  checkModelHealth: () => ipcRenderer.invoke('embedding:checkHealth'),
  generateEmbeddings: (texts, options) => ipcRenderer.invoke('embedding:generateEmbeddings', texts, options),
  indexDocument: (request) => ipcRenderer.invoke('embedding:indexDocument', request),
  batchIndexDocuments: (projectRef, documents) => ipcRenderer.invoke('embedding:batchIndexDocuments', projectRef, documents),
  processAndIndexFile: (filePath, projectRef, options) => ipcRenderer.invoke('embedding:processAndIndexFile', filePath, projectRef, options),

  // PDF Analysis
  initializePDFService: () => ipcRenderer.invoke('pdf:initializeService'),
  analyzePDFBuffer: (buffer, options) => ipcRenderer.invoke('pdf:analyzePDFBuffer', buffer, options),
  getDocumentAnalysis: (documentId) => ipcRenderer.invoke('pdf:getDocumentAnalysis', documentId),
  searchDocuments: (query, options) => ipcRenderer.invoke('pdf:searchDocuments', query, options),
  getDocuments: (options) => ipcRenderer.invoke('pdf:getDocuments', options),
  deleteDocument: (documentId) => ipcRenderer.invoke('pdf:deleteDocument', documentId),

  // DOCX Analysis
  initializeDOCXService: () => ipcRenderer.invoke('docx:initializeService'),
  analyzeDOCXBuffer: (buffer, options) => ipcRenderer.invoke('docx:analyzeDOCXBuffer', buffer, options),

  // Excel Analysis
  initializeExcelService: () => ipcRenderer.invoke('excel:initializeService'),
  analyzeExcelBuffer: (buffer, options) => ipcRenderer.invoke('excel:analyzeExcelBuffer', buffer, options),

  // PowerPoint Analysis
  initializePowerPointService: () => ipcRenderer.invoke('powerpoint:initializeService'),
  analyzePowerPointBuffer: (buffer, options) => ipcRenderer.invoke('powerpoint:analyzePowerPointBuffer', buffer, options),

  // Supabase Upload
  uploadAnalysisToSupabase: (analysisResult) => ipcRenderer.invoke('supabase:uploadAnalysis', analysisResult),

  // Auth
  saveAuthInfo: (authInfo) => ipcRenderer.invoke('auth:saveAuthInfo', authInfo),

  // Event listeners
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update:available', callback);
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update:downloaded', callback);
  },
  onShowSettings: (callback) => {
    ipcRenderer.on('app:showSettings', callback);
  },

  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
