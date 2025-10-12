declare global {
  interface Window {
    supabaseAPI: {
      // Supabase OAuth Methods
      startSupabaseAuth: (options: { method?: 'local' | 'custom'; preferExternal?: boolean }) => Promise<any>
      getAuthStatus: () => Promise<any>
      logoutSupabase: () => Promise<any>
      // Supabase Management API Methods
      fetchProjects: () => Promise<any>
      fetchUserInfo: () => Promise<any>
      fetchProjectApiKeys: (projectId: string) => Promise<any>
      // Supabase Configuration
      getSupabaseConfig: () => Promise<any>
    }

    electronAPI: {
      // File operations
      openFiles: () => Promise<any>
      processFile: (filePath: string, options: any) => Promise<any>
      saveFile: (data: Buffer, defaultName: string) => Promise<any>
      saveFileFromPath: (tempPath: string, defaultName: string) => Promise<any>
      selectDirectory: () => Promise<any>
      getDefaultDirectory: () => Promise<any>

      // Advanced PDF processing
      convertPDFToDOCX: (filePath: string, options: any) => Promise<any>
      convertPDFToDOCXEnhanced: (filePath: string, options: any) => Promise<any>

      // Data operations
      getConversionHistory: (filter?: any) => Promise<any>
      saveConversion: (record: any) => Promise<any>
      getTemplates: () => Promise<any>
      saveTemplate: (template: any) => Promise<any>

      // Settings
      getSetting: (key: string) => Promise<any>
      setSetting: (key: string, value: any) => Promise<any>
      getAllSettings: () => Promise<any>

      // App info
      getAppVersion: () => Promise<any>
      getPlatform: () => Promise<any>

      // Event listeners
      onUpdateAvailable: (callback: () => void) => void
      onUpdateDownloaded: (callback: () => void) => void
      onShowSettings: (callback: () => void) => void
      removeAllListeners: (channel: string) => void

      // BGE-M3 Embedding and Indexing Methods
      initializeSupabase: () => Promise<any>
      checkModelHealth: () => Promise<any>
      generateEmbeddings: (texts: string[], options?: any) => Promise<any>
      indexDocument: (request: any) => Promise<any>
      batchIndexDocuments: (projectRef: string, documents: any[]) => Promise<any>
      processAndIndexFile: (filePath: string, projectRef: string, options?: any) => Promise<any>
      searchSimilar: (queryText: string, projectRef?: string, options?: any) => Promise<any>
      getEmbeddingConfig: () => Promise<any>

      // PDF Analysis Methods
      initializePDFService: () => Promise<any>
      analyzePDF: (filePath: string, options?: any) => Promise<any>
      analyzePDFBuffer: (buffer: Uint8Array, filename: string, options?: any) => Promise<any>
      analyzePDFOptimized: (filePath: string, options?: any) => Promise<any>
      analyzePDFBufferOptimized: (buffer: Uint8Array, filename: string, filePath: string, options?: any) => Promise<any>
      getDocumentAnalysis: (documentId: string) => Promise<any>
      searchDocuments: (query: string, options?: any) => Promise<any>
      getDocuments: (options?: any) => Promise<any>
      deleteDocument: (documentId: string) => Promise<any>

      // DOCX Analysis Methods
      initializeDOCXService: () => Promise<any>
      analyzeDOCXBuffer: (buffer: Uint8Array, filename: string, options?: any) => Promise<any>

      // Excel Analysis Methods
      initializeExcelService: () => Promise<any>
      analyzeExcelBuffer: (buffer: Uint8Array, filename: string, options?: any) => Promise<any>

      // PowerPoint Analysis Methods
      initializePowerPointService: () => Promise<any>
      analyzePowerPointBuffer: (buffer: Uint8Array, filename: string, options?: any) => Promise<any>

      // Supabase Upload Methods
      uploadAnalysisToSupabase: (analysisResult: any) => Promise<any>
      
      // Supabase Chat Methods
      getSupabaseDocumentsForChat: (options?: any) => Promise<any>

      // Auth Methods
      saveAuthInfo: (authInfo: any) => Promise<any>
      getSupabaseCredentials: () => Promise<any>
      saveSupabaseCredentials: (credentials: any) => Promise<any>
      clearSupabaseCredentials: () => Promise<any>

      // Group Analysis Methods
      initializeGroupAnalysisService: () => Promise<any>
      analyzeGroup: (groupData: any, analysisTypes?: string[]) => Promise<any>
      getGroupAnalysisResults: (groupId: string) => Promise<any>

      // Persistent Local Storage Methods
      persistentStorage: {
        isEnabled: () => Promise<any>
        setEnabled: (enabled: boolean) => Promise<any>
        saveData: (data: any) => Promise<any>
        getData: (id: string) => Promise<any>
        getAllData: () => Promise<any>
        getDataByType: (type: string) => Promise<any>
        getDataByFilePath: (filePath: string) => Promise<any>
        searchData: (query: string) => Promise<any>
        deleteData: (id: string) => Promise<any>
        clearAllData: () => Promise<any>
        getStats: () => Promise<any>
        exportData: () => Promise<any>
        importData: (jsonData: string) => Promise<any>
        getPath: () => Promise<any>
        getLocalDocs: () => Promise<any>
      }

      // Debug Methods
      debug: {
        checkStorage: () => Promise<any>
      }

      // Ollama Management Methods
      ollama: {
        getStatus: () => Promise<any>
        start: () => Promise<any>
        stop: () => Promise<any>
        ensureRunning: () => Promise<any>
      }
    }

    aiAPI: {
      // AI Chat Query Methods
      initializeChatController: () => Promise<any>
      chatQuery: (request: any) => Promise<any>
      documentChatQuery: (request: any) => Promise<any>
      healthCheck: () => Promise<any>
      // Migration Methods
      migrateExistingData: () => Promise<any>
      getMigrationStatus: () => Promise<any>
      clearMigratedData: () => Promise<any>
    }

    gpuAPI: {
      // GPU Control Methods
      checkStatus: () => Promise<any>
      setMode: (enabled: boolean) => Promise<any>
      getMemory: () => Promise<any>
      cleanup: () => Promise<any>
      checkAndCleanup: (thresholdMB?: number) => Promise<any>
    }

    documentMigrationAPI: {
      // Document Migration Methods
      migrateAllDocuments: () => Promise<any>
      getStatus: () => Promise<any>
    }

    groupAnalysisSupabaseAPI: {
      // Group Analysis Supabase Methods
      initialize: (projectUrl: string, anonKey: string, projectId?: string) => Promise<{
        success: boolean
        error?: string
        errorCode?: string
        needsManualSetup?: boolean
        createTablesSQL?: string
        dashboardUrl?: string
      }>
      transferGroupAnalysis: (transferData: any) => Promise<{
        success: boolean
        message?: string
        groupId?: string
        documentsCount?: number
        analysisResultsCount?: number
        error?: string
      }>
      getGroupAnalysisSummary: (groupId: string) => Promise<any>
      getUserGroups: (userId?: string) => Promise<any>
      getGroupAnalysisResults: (groupId: string) => Promise<any>
      deleteGroup: (groupId: string) => Promise<any>
      getStatus: () => Promise<any>
    }
  }
}

export {}

