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

export interface ConversionSettings {
  iLovePDFTool?: string
  outputFormat?: string
  outputDirectory?: string
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

  // Conversion settings
  conversionSettings: ConversionSettings
  setConversionSettings: (settings: Partial<ConversionSettings>) => void

  // Processing state
  isProcessing: boolean
  setIsProcessing: (processing: boolean) => void

  // UI state
  activeTab: string
  setActiveTab: (tab: string) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
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
      addAnalysisResult: (result) => set((state) => ({
        analysisResults: [...state.analysisResults, result]
      })),
      removeAnalysisResult: (documentId) => set((state) => ({
        analysisResults: state.analysisResults.filter(result => result.documentId !== documentId)
      })),
      clearAnalysisResults: () => set({ analysisResults: [] }),
      getAnalysisResult: (documentId) => {
        const state = get()
        return state.analysisResults.find(result => result.documentId === documentId)
      },

      // Conversion settings
      conversionSettings: {},
      setConversionSettings: (settings) => set((state) => ({
        conversionSettings: { ...state.conversionSettings, ...settings }
      })),

      // Processing state
      isProcessing: false,
      setIsProcessing: (processing) => set({ isProcessing: processing }),

      // UI state
      activeTab: 'converter',
      setActiveTab: (tab) => set({ activeTab: tab }),
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: 'document-converter-store',
      partialize: (state) => ({
        theme: state.theme,
        conversionSettings: state.conversionSettings,
        activeTab: state.activeTab,
        sidebarOpen: state.sidebarOpen,
        analysisResults: state.analysisResults,
      }),
    }
  )
)
