import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface FileItem {
  id: string
  name: string
  path: string
  size: number
  type: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  result?: any
  error?: string
  fileData?: File // Store the actual File object
}

export interface AnalysisResult {
  documentId: string
  groupId?: string
  title: string
  filename: string
  fileType: string
  textSections: any[]
  aiCommentary: any[]
  processingTime?: number
  pageCount?: number
  sheetCount?: number
  slideCount?: number
  createdAt: string
}

export interface GroupAnalysisResult {
  id: string
  groupId: string
  analysisType: string
  content: string
  confidenceScore: number
  language: string
  aiModel: string
  processingTimeMs: number
  createdAt: string
  metadata?: any
}

export interface DocumentGroup {
  id: string
  name: string
  description?: string
  documents: AnalysisResult[]
  groupAnalysisResults?: GroupAnalysisResult[]
  createdAt: string
  updatedAt: string
}

export interface ConversionSettings {
  iLovePDFTool?: string
  outputFormat?: string
  outputDirectory?: string
}

export interface AISettings {
  gpuEnabled: boolean
  gpuWarmup: boolean
  maxContextLength: number
}

interface AppState {
  // Theme
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void

  // Files
  files: FileItem[]
  addFiles: (files: FileItem[]) => void
  removeFile: (id: string) => void
  updateFile: (id: string, updates: Partial<FileItem>) => void
  clearFiles: () => void

  // Analysis results
  analysisResults: AnalysisResult[]
  addAnalysisResult: (result: AnalysisResult) => void
  removeAnalysisResult: (documentId: string) => void
  clearAnalysisResults: () => void
  getAnalysisResult: (documentId: string) => AnalysisResult | undefined

  // Document groups
  documentGroups: DocumentGroup[]
  addDocumentGroup: (group: DocumentGroup) => void
  removeDocumentGroup: (groupId: string) => void
  updateDocumentGroup: (groupId: string, updates: Partial<DocumentGroup>) => void
  clearDocumentGroups: () => void
  getDocumentGroup: (groupId: string) => DocumentGroup | undefined
  addDocumentToGroup: (groupId: string, document: AnalysisResult) => void
  removeDocumentFromGroup: (groupId: string, documentId: string) => void

  // Group analysis results
  addGroupAnalysisResult: (groupId: string, analysisResult: GroupAnalysisResult) => void
  removeGroupAnalysisResult: (groupId: string, analysisId: string) => void
  updateGroupAnalysisResult: (groupId: string, analysisId: string, updates: Partial<GroupAnalysisResult>) => void
  getGroupAnalysisResult: (groupId: string, analysisId: string) => GroupAnalysisResult | undefined
  getAllGroupAnalysisResults: (groupId: string) => GroupAnalysisResult[]
  exportGroupAnalysisResults: (groupId: string) => string
  importGroupAnalysisResults: (groupId: string, data: string) => void

  // Conversion settings
  conversionSettings: ConversionSettings
  setConversionSettings: (settings: Partial<ConversionSettings>) => void

  // AI settings
  aiSettings: AISettings
  setAISettings: (settings: Partial<AISettings>) => void

  // Processing state
  isProcessing: boolean
  setIsProcessing: (processing: boolean) => void

  // UI state
  activeTab: string
  setActiveTab: (tab: string) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void

  // Storage management
  clearAllData: () => void
  getStorageInfo: () => { used: number; available: number; percentage: number }
}

// Helper function to compress data for storage
const compressForStorage = (data: any) => {
  try {
    // Remove large text content and keep only essential metadata
    if (data.textSections) {
      data.textSections = data.textSections.map((section: any) => ({
        id: section.id,
        pageNumber: section.pageNumber,
        sectionTitle: section.sectionTitle,
        contentType: section.contentType,
        orderIndex: section.orderIndex,
        // Keep only first 200 characters of content for preview
        content: section.content ? section.content.substring(0, 200) + '...' : '',
        contentLength: section.content ? section.content.length : 0
      }))
    }
    
    if (data.aiCommentary) {
      data.aiCommentary = data.aiCommentary.map((commentary: any) => ({
        id: commentary.id,
        commentaryType: commentary.commentaryType,
        confidenceScore: commentary.confidenceScore,
        language: commentary.language,
        aiModel: commentary.aiModel,
        processingTimeMs: commentary.processingTimeMs,
        textSectionId: commentary.textSectionId,
        // Keep only first 100 characters of content for preview
        content: commentary.content ? commentary.content.substring(0, 100) + '...' : '',
        contentLength: commentary.content ? commentary.content.length : 0
      }))
    }
    
    return data
  } catch (error) {
    console.error('Error compressing data for storage:', error)
    return data
  }
}


// Helper function to check storage quota
const checkStorageQuota = () => {
  try {
    const testKey = 'storage-quota-test'
    const testData = 'x'.repeat(1024 * 1024) // 1MB test data
    
    localStorage.setItem(testKey, testData)
    localStorage.removeItem(testKey)
    return true
  } catch (error) {
    console.warn('Storage quota exceeded, implementing cleanup...')
    return false
  }
}

// Helper function to cleanup old data
const cleanupOldData = () => {
  try {
    // Remove old analysis results (keep only last 10)
    const state = useAppStore.getState()
    if (state.analysisResults.length > 10) {
      const sortedResults = state.analysisResults
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const recentResults = sortedResults.slice(0, 10)
      
      useAppStore.setState({ analysisResults: recentResults })
      console.log('Cleaned up old analysis results, kept 10 most recent')
    }
    
    // Remove old document groups (keep only last 5)
    if (state.documentGroups.length > 5) {
      const sortedGroups = state.documentGroups
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      const recentGroups = sortedGroups.slice(0, 5)
      
      useAppStore.setState({ documentGroups: recentGroups })
      console.log('Cleaned up old document groups, kept 5 most recent')
    }
  } catch (error) {
    console.error('Error during cleanup:', error)
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Theme
      theme: 'light',
      setTheme: (theme) => set({ theme }),

      // Files
      files: [],
      addFiles: (newFiles) => set((state) => ({
        files: [...state.files, ...newFiles]
      })),
      removeFile: (id) => set((state) => ({
        files: state.files.filter(file => file.id !== id)
      })),
      updateFile: (id, updates) => set((state) => ({
        files: state.files.map(file => 
          file.id === id ? { ...file, ...updates } : file
        )
      })),
      clearFiles: () => set({ files: [] }),

      // Analysis results
      analysisResults: [],
      addAnalysisResult: (result) => set((state) => {
        // Check storage quota before adding
        if (!checkStorageQuota()) {
          cleanupOldData()
        }
        
        // Compress data before storing
        const compressedResult = compressForStorage(result)
        
        // Aynı documentId'ye sahip kayıt varsa güncelle, yoksa ekle
        const existingIndex = state.analysisResults.findIndex(r => r.documentId === result.documentId)
        if (existingIndex !== -1) {
          // Mevcut kaydı güncelle
          const updatedResults = [...state.analysisResults]
          updatedResults[existingIndex] = compressedResult
          return { analysisResults: updatedResults }
        } else {
          // Yeni kayıt ekle
          return { analysisResults: [...state.analysisResults, compressedResult] }
        }
      }),
      removeAnalysisResult: (documentId) => set((state) => ({
        analysisResults: state.analysisResults.filter(result => result.documentId !== documentId)
      })),
      clearAnalysisResults: () => set({ analysisResults: [] }),
      getAnalysisResult: (documentId) => {
        const state = get()
        return state.analysisResults.find(result => result.documentId === documentId)
      },

      // Document groups
      documentGroups: [],
      addDocumentGroup: (group) => set((state) => {
        // Check storage quota before adding
        if (!checkStorageQuota()) {
          cleanupOldData()
        }
        
        // Compress documents in the group
        const compressedGroup = {
          ...group,
          documents: group.documents.map(doc => compressForStorage(doc))
        }
        
        return { documentGroups: [...state.documentGroups, compressedGroup] }
      }),
      removeDocumentGroup: (groupId) => set((state) => ({
        documentGroups: state.documentGroups.filter(group => group.id !== groupId)
      })),
      updateDocumentGroup: (groupId, updates) => set((state) => ({
        documentGroups: state.documentGroups.map(group => 
          group.id === groupId ? { ...group, ...updates, updatedAt: new Date().toISOString() } : group
        )
      })),
      clearDocumentGroups: () => set({ documentGroups: [] }),
      getDocumentGroup: (groupId) => {
        const state = get()
        return state.documentGroups.find(group => group.id === groupId)
      },
      addDocumentToGroup: (groupId, document) => set((state) => {
        // Compress document before adding
        const compressedDocument = compressForStorage(document)
        
        return {
          documentGroups: state.documentGroups.map(group => 
            group.id === groupId 
              ? { 
                  ...group, 
                  documents: [...group.documents, { ...compressedDocument, groupId }],
                  updatedAt: new Date().toISOString()
                }
              : group
          )
        }
      }),
      removeDocumentFromGroup: (groupId, documentId) => set((state) => ({
        documentGroups: state.documentGroups.map(group => 
          group.id === groupId 
            ? { 
                ...group, 
                documents: group.documents.filter(doc => doc.documentId !== documentId),
                updatedAt: new Date().toISOString()
              }
            : group
        )
      })),

      // Group analysis results
      addGroupAnalysisResult: (groupId, analysisResult) => set((state) => ({
        documentGroups: state.documentGroups.map(group => 
          group.id === groupId 
            ? { 
                ...group, 
                groupAnalysisResults: [...(group.groupAnalysisResults || []), analysisResult],
                updatedAt: new Date().toISOString()
              }
            : group
        )
      })),
      removeGroupAnalysisResult: (groupId, analysisId) => set((state) => ({
        documentGroups: state.documentGroups.map(group => 
          group.id === groupId 
            ? { 
                ...group, 
                groupAnalysisResults: (group.groupAnalysisResults || []).filter(analysis => analysis.id !== analysisId),
                updatedAt: new Date().toISOString()
              }
            : group
        )
      })),
      updateGroupAnalysisResult: (groupId, analysisId, updates) => set((state) => ({
        documentGroups: state.documentGroups.map(group => 
          group.id === groupId 
            ? { 
                ...group, 
                groupAnalysisResults: (group.groupAnalysisResults || []).map(analysis => 
                  analysis.id === analysisId ? { ...analysis, ...updates } : analysis
                ),
                updatedAt: new Date().toISOString()
              }
            : group
        )
      })),
      getGroupAnalysisResult: (groupId, analysisId) => {
        const state = get()
        const group = state.documentGroups.find(g => g.id === groupId)
        return group?.groupAnalysisResults?.find(analysis => analysis.id === analysisId)
      },
      getAllGroupAnalysisResults: (groupId) => {
        const state = get()
        const group = state.documentGroups.find(g => g.id === groupId)
        return group?.groupAnalysisResults || []
      },
      exportGroupAnalysisResults: (groupId) => {
        const state = get()
        const group = state.documentGroups.find(g => g.id === groupId)
        const analysisResults = group?.groupAnalysisResults || []
        
        const exportData = {
          groupId,
          groupName: group?.name,
          exportDate: new Date().toISOString(),
          analysisResults
        }
        
        return JSON.stringify(exportData, null, 2)
      },
      importGroupAnalysisResults: (groupId, data) => {
        try {
          const importData = JSON.parse(data)
          const group = get().documentGroups.find(g => g.id === groupId)
          
          if (group && importData.analysisResults) {
            set((state) => ({
              documentGroups: state.documentGroups.map(g => 
                g.id === groupId 
                  ? { 
                      ...g, 
                      groupAnalysisResults: [...(g.groupAnalysisResults || []), ...importData.analysisResults],
                      updatedAt: new Date().toISOString()
                    }
                  : g
              )
            }))
          }
        } catch (error) {
          console.error('Error importing group analysis results:', error)
        }
      },

      // Conversion settings
      conversionSettings: {},
      setConversionSettings: (settings) => set((state) => ({
        conversionSettings: { ...state.conversionSettings, ...settings }
      })),

      // AI settings
      aiSettings: {
        gpuEnabled: true,
        gpuWarmup: true,
        maxContextLength: 15000,
      },
      setAISettings: (settings) => set((state) => ({
        aiSettings: { ...state.aiSettings, ...settings }
      })),

      // Processing state
      isProcessing: false,
      setIsProcessing: (processing) => set({ isProcessing: processing }),

      // UI state
      activeTab: 'converter',
      setActiveTab: (tab) => set({ activeTab: tab }),
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Storage management
      clearAllData: () => set({
        files: [],
        analysisResults: [],
        documentGroups: [],
        isProcessing: false
      }),
      getStorageInfo: () => {
        try {
          const storeData = localStorage.getItem('document-converter-store')
          const used = storeData ? new Blob([storeData]).size : 0
          const available = 5 * 1024 * 1024 // 5MB typical localStorage limit
          const percentage = (used / available) * 100
          
          return { used, available, percentage }
        } catch (error) {
          console.error('Error getting storage info:', error)
          return { used: 0, available: 0, percentage: 0 }
        }
      },
    }),
    {
      name: 'document-converter-store',
      partialize: (state) => ({
        theme: state.theme,
        conversionSettings: state.conversionSettings,
        aiSettings: state.aiSettings,
        activeTab: state.activeTab,
        sidebarOpen: state.sidebarOpen,
        // Only store essential data, not the full content
        analysisResults: state.analysisResults.map(result => ({
          documentId: result.documentId,
          title: result.title,
          filename: result.filename,
          fileType: result.fileType,
          processingTime: result.processingTime,
          pageCount: result.pageCount,
          sheetCount: result.sheetCount,
          slideCount: result.slideCount,
          createdAt: result.createdAt,
          // Store only metadata for text sections and AI commentary
          textSectionsCount: result.textSections?.length || 0,
          aiCommentaryCount: result.aiCommentary?.length || 0
        })),
        documentGroups: state.documentGroups.map(group => ({
          id: group.id,
          name: group.name,
          description: group.description,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
          // Store only document metadata, not full content
          documents: group.documents.map(doc => ({
            documentId: doc.documentId,
            title: doc.title,
            filename: doc.filename,
            fileType: doc.fileType,
            processingTime: doc.processingTime,
            pageCount: doc.pageCount,
            sheetCount: doc.sheetCount,
            slideCount: doc.slideCount,
            createdAt: doc.createdAt,
            textSectionsCount: doc.textSections?.length || 0,
            aiCommentaryCount: doc.aiCommentary?.length || 0
          })),
          groupAnalysisResults: group.groupAnalysisResults || []
        })),
      }),
    }
  )
)
