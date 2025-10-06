import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, File, FolderOpen, Brain, Loader2, CheckSquare, Square, Plus, Users, FolderPlus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/utils/cn'
import { useToast } from '@/hooks/use-toast'
import { AnalysisProgressModal } from '@/components/AnalysisProgressModal'

const ACCEPTED_FORMATS = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/bmp': ['.bmp'],
  'image/gif': ['.gif'],
  'image/tiff': ['.tiff', '.tif'],
}

export function FileDropZone() {
  const { addFiles, files, addAnalysisResult, addDocumentGroup, updateDocumentGroup, documentGroups } = useAppStore()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzingFile, setAnalyzingFile] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [showGroupSelector, setShowGroupSelector] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()

  // Sequential analysis state
  const [isSequentialAnalysis, setIsSequentialAnalysis] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState({
    currentIndex: 0,
    totalFiles: 0,
    currentFile: '',
    completedFiles: [] as string[],
    failedFiles: [] as string[]
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Mevcut dosya isimlerini al
    const existingFileNames = files.map(f => f.name)
    
    // Sadece yeni dosyaları filtrele (aynı isimde dosya varsa atla)
    const newFiles = acceptedFiles
      .filter(file => !existingFileNames.includes(file.name))
      .map(file => ({
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      path: file.path || '',
      size: file.size,
      type: file.type,
      status: 'pending' as const,
      progress: 0,
      fileData: file, // Store the actual File object
    }))
    
    if (newFiles.length > 0) {
    addFiles(newFiles)
      toast({
        title: 'Dosyalar Yüklendi',
        description: `${newFiles.length} yeni dosya yüklendi. ${acceptedFiles.length - newFiles.length} dosya zaten mevcut.`,
      })
    } else {
      toast({
        title: 'Dosya Zaten Mevcut',
        description: 'Seçilen dosyalar zaten yüklenmiş.',
        variant: 'destructive'
      })
    }
  }, [addFiles, files, toast])

  const analyzeDocument = useCallback(async (file: File, isSequential = false) => {
    if (!isSequential) {
      setIsAnalyzing(true)
      setAnalyzingFile(file.name)
    }

    try {
      // Read file as buffer
      const fileBuffer = await file.arrayBuffer()
      const buffer = new Uint8Array(fileBuffer)

      // Create a temporary file path
      const tempFilePath = `temp_${Date.now()}_${file.name}`

      // Determine file type for analysis
      const isPDF = file.type === 'application/pdf'
      const isDOCX = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                     file.type === 'application/vnd.ms-excel'
      const isPowerPoint = file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
                          file.type === 'application/vnd.ms-powerpoint'

      if (!isPDF && !isDOCX && !isExcel && !isPowerPoint) {
        throw new Error('Desteklenmeyen dosya formatı. Sadece PDF, DOCX, Excel ve PowerPoint dosyaları desteklenir.')
      }

      let analysisResult: any

      if (isPDF) {
        // Initialize PDF service
        const initResult = await window.electronAPI.initializePDFService()
        if (!initResult.success) {
          throw new Error(initResult.error || 'PDF servisi başlatılamadı')
        }

        // Analyze PDF
             analysisResult = await window.electronAPI.analyzePDFBuffer(buffer, tempFilePath, {
               generateCommentary: true,
               commentaryTypes: ['summary', 'key_points', 'analysis', 'insights', 'relationships', 'semantic', 'patterns'],
               language: 'tr',
               userId: 'user_' + Date.now()
             })
      } else if (isDOCX) {
        // Initialize DOCX service
        const initResult = await window.electronAPI.initializeDOCXService()
        if (!initResult.success) {
          throw new Error(initResult.error || 'DOCX servisi başlatılamadı')
        }

        // Analyze DOCX
             analysisResult = await window.electronAPI.analyzeDOCXBuffer(buffer, tempFilePath, {
               generateCommentary: true,
               commentaryTypes: ['summary', 'key_points', 'analysis', 'insights', 'relationships', 'semantic', 'patterns'],
               language: 'tr',
               userId: 'user_' + Date.now()
             })
      } else if (isExcel) {
        // Initialize Excel service
        const initResult = await window.electronAPI.initializeExcelService()
        if (!initResult.success) {
          throw new Error(initResult.error || 'Excel servisi başlatılamadı')
        }

        // Analyze Excel
             analysisResult = await window.electronAPI.analyzeExcelBuffer(buffer, tempFilePath, {
               generateCommentary: true,
               commentaryTypes: ['summary', 'key_points', 'analysis', 'insights', 'relationships', 'semantic', 'patterns'],
               language: 'tr',
               userId: 'user_' + Date.now()
             })
      } else if (isPowerPoint) {
        // Initialize PowerPoint service
        const initResult = await window.electronAPI.initializePowerPointService()
        if (!initResult.success) {
          throw new Error(initResult.error || 'PowerPoint servisi başlatılamadı')
        }

        // Analyze PowerPoint
             analysisResult = await window.electronAPI.analyzePowerPointBuffer(buffer, tempFilePath, {
               generateCommentary: true,
               commentaryTypes: ['summary', 'key_points', 'analysis', 'insights', 'relationships', 'semantic', 'patterns'],
               language: 'tr',
               userId: 'user_' + Date.now()
             })
      }

      if (!analysisResult.success) {
        const errorMessage = analysisResult.error || 'Doküman analizi başarısız'
        console.error('Analysis result failed:', errorMessage)
        
        // Handle specific error cases with user-friendly messages
        if (errorMessage.includes('extractable text') || errorMessage.includes('image-based')) {
          throw new Error('Bu PDF dosyası metin içermiyor. Görüntü tabanlı veya taranmış bir PDF olabilir. Lütfen metin içeren bir PDF dosyası seçin.')
        } else if (errorMessage.includes('password-protected')) {
          throw new Error('Bu PDF dosyası şifre korumalı. Lütfen şifresiz bir PDF dosyası seçin.')
        } else if (errorMessage.includes('corrupted') || errorMessage.includes('damaged')) {
          throw new Error('Bu PDF dosyası bozuk görünüyor. Lütfen geçerli bir PDF dosyası seçin.')
        } else {
          throw new Error(errorMessage)
        }
      }

      let fileType = 'Dosya'
      if (isPDF) fileType = 'PDF'
      else if (isDOCX) fileType = 'DOCX'
      else if (isExcel) fileType = 'Excel'
      else if (isPowerPoint) fileType = 'PowerPoint'

      let additionalInfo = ''
      if (isExcel && analysisResult.sheetCount) {
        additionalInfo = ` (${analysisResult.sheetCount} sayfa)`
      } else if (isPowerPoint && analysisResult.slideCount) {
        additionalInfo = ` (${analysisResult.slideCount} slayt)`
      }

      if (!isSequential) {
        toast({
          title: 'Analiz Tamamlandı',
          description: `${fileType} "${file.name}" başarıyla analiz edildi${additionalInfo}. ${analysisResult.textSections?.length || 0} metin bölümü ve ${analysisResult.aiCommentary?.length || 0} AI yorumu oluşturuldu.`,
        })

        // Navigate to results page
        navigate(`/results?documentId=${analysisResult.documentId || `doc_${Date.now()}`}`)
      }

      console.log('Document Analysis completed:', analysisResult)

      // Create analysis result data
      const analysisResultData = {
        documentId: analysisResult.documentId || `doc_${Date.now()}`,
        title: analysisResult.title || file.name.replace(/\.[^/.]+$/, ''),
        filename: file.name,
        fileType: fileType,
        textSections: analysisResult.textSections || [],
        aiCommentary: analysisResult.aiCommentary || [],
        processingTime: analysisResult.processingTime,
        pageCount: analysisResult.pageCount,
        sheetCount: analysisResult.sheetCount,
        slideCount: analysisResult.slideCount,
        createdAt: new Date().toISOString()
      }

      // Save analysis result to store with error handling for storage quota
      try {
        addAnalysisResult(analysisResultData)
      } catch (error: any) {
        console.warn('Storage quota exceeded, analysis result not saved to localStorage:', error)
        // Continue with the analysis even if storage fails
        // The analysis result is still available in memory
      }

      return analysisResultData

    } catch (error: any) {
      console.error('Document analysis failed:', error)
      
      if (!isSequential) {
        // Provide more specific error messages based on error type
        let errorTitle = 'Analiz Hatası'
        let errorDescription = 'Doküman analizi sırasında bir hata oluştu.'
        
        if (error.message) {
          if (error.message.includes('Invalid PDF structure') || error.message.includes('corrupted')) {
            errorTitle = 'PDF Dosya Hatası'
            errorDescription = 'PDF dosyası bozuk veya geçersiz yapıda. Lütfen farklı bir PDF dosyası deneyin.'
          } else if (error.message.includes('No text content')) {
            errorTitle = 'Metin İçeriği Bulunamadı'
            errorDescription = 'PDF dosyasında çıkarılabilir metin bulunamadı. Dosya görsel tabanlı veya şifre korumalı olabilir.'
          } else if (error.message.includes('PDF loading failed')) {
            errorTitle = 'PDF Yükleme Hatası'
            errorDescription = 'PDF dosyası yüklenemedi. Dosya bozuk veya desteklenmeyen formatta olabilir.'
          } else {
            errorDescription = error.message
          }
        }
        
        toast({
          title: errorTitle,
          description: errorDescription,
          variant: 'destructive'
        })
      }
      
      throw error
    } finally {
      if (!isSequential) {
        setIsAnalyzing(false)
        setAnalyzingFile(null)
      }
    }
  }, [toast, navigate, addAnalysisResult])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    multiple: true,
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />
    if (type.includes('word')) return <FileText className="h-5 w-5 text-blue-500" />
    if (type.includes('sheet')) return <FileText className="h-5 w-5 text-green-500" />
    if (type.includes('csv')) return <FileText className="h-5 w-5 text-orange-500" />
    if (type.includes('image')) return <FileText className="h-5 w-5 text-purple-500" />
    return <File className="h-5 w-5 text-gray-500" />
  }

  const toggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId)
    } else {
      newSelected.add(fileId)
    }
    setSelectedFiles(newSelected)
  }

  const selectAllFiles = () => {
    const allFileIds = new Set(files.map(file => file.id))
    setSelectedFiles(allFileIds)
  }

  const clearSelection = () => {
    setSelectedFiles(new Set())
  }

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode)
    if (isSelectMode) {
      setSelectedFiles(new Set())
    }
  }

  const createGroupFromSelected = async () => {
    if (selectedFiles.size === 0) {
      toast({
        title: 'Dosya Seçilmedi',
        description: 'Grup oluşturmak için en az bir dosya seçin.',
        variant: 'destructive'
      })
      return
    }

    const selectedFileObjects = files.filter(file => selectedFiles.has(file.id))
    const groupName = `Grup ${Date.now()}`
    
    // Initialize sequential analysis
    setIsSequentialAnalysis(true)
    setAnalysisProgress({
      currentIndex: 0,
      totalFiles: selectedFileObjects.length,
      currentFile: '',
      completedFiles: [],
      failedFiles: []
    })

    const analysisResults = []

    try {
      // Analyze files sequentially
      for (let i = 0; i < selectedFileObjects.length; i++) {
        const file = selectedFileObjects[i]
        
        // Update progress
        setAnalysisProgress(prev => ({
          ...prev,
          currentIndex: i,
          currentFile: file.name
        }))

        if (file.fileData) {
          try {
            const result = await analyzeDocument(file.fileData, true)
            if (result) {
              analysisResults.push(result)
              setAnalysisProgress(prev => ({
                ...prev,
                completedFiles: [...prev.completedFiles, file.name]
              }))
            }
          } catch (error) {
            console.error(`Analysis failed for ${file.name}:`, error)
            setAnalysisProgress(prev => ({
              ...prev,
              failedFiles: [...prev.failedFiles, file.name]
            }))
          }
        }
      }

      // Final progress update
      setAnalysisProgress(prev => ({
        ...prev,
        currentIndex: selectedFileObjects.length,
        currentFile: ''
      }))

      // Create group with analyzed documents
      const newGroup = {
        id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: groupName,
        description: `${selectedFileObjects.length} dosyadan oluşturulan grup`,
        documents: analysisResults,
        groupAnalysisResults: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      addDocumentGroup(newGroup)
      
      toast({
        title: 'Grup Oluşturuldu',
        description: `"${groupName}" grubu ${analysisResults.length} analiz edilmiş dosya ile oluşturuldu.`,
      })

      // Navigate to group management page after a short delay
      setTimeout(() => {
        navigate(`/groups/${newGroup.id}`)
        setIsSequentialAnalysis(false)
        setSelectedFiles(new Set())
        setIsSelectMode(false)
        
        // Reset file statuses after successful group creation
        const { files, updateFile } = useAppStore.getState()
        files.forEach(file => {
          updateFile(file.id, {
            status: 'pending',
            progress: 0
          })
        })
      }, 2000)

    } catch (error) {
      console.error('Group creation failed:', error)
      toast({
        title: 'Grup Oluşturma Hatası',
        description: 'Grup oluşturulurken bir hata oluştu.',
        variant: 'destructive'
      })
      setIsSequentialAnalysis(false)
    }
  }

  const addFilesToExistingGroup = async (groupId: string) => {
    if (selectedFiles.size === 0) {
      toast({
        title: 'Dosya Seçilmedi',
        description: 'Gruba eklemek için en az bir dosya seçin.',
        variant: 'destructive'
      })
      return
    }

    const selectedFileObjects = files.filter(file => selectedFiles.has(file.id))
    const targetGroup = documentGroups.find(g => g.id === groupId)
    
    if (!targetGroup) {
      toast({
        title: 'Grup Bulunamadı',
        description: 'Seçilen grup bulunamadı.',
        variant: 'destructive'
      })
      return
    }

    // Check for duplicate files in the target group
    const existingFileNames = targetGroup.documents.map(doc => doc.filename)
    const duplicateFiles = selectedFileObjects.filter(file => existingFileNames.includes(file.name))
    
    if (duplicateFiles.length > 0) {
      toast({
        title: 'Mükerrer Dosya Tespit Edildi',
        description: `Aşağıdaki dosyalar zaten grupta mevcut: ${duplicateFiles.map(f => f.name).join(', ')}`,
        variant: 'destructive'
      })
      return
    }

    // Close the group selector modal first
    setShowGroupSelector(false)

    // Initialize sequential analysis progress
    setIsSequentialAnalysis(true)
    setAnalysisProgress({
      currentIndex: 0,
      totalFiles: selectedFileObjects.length,
      currentFile: '',
      completedFiles: [],
      failedFiles: []
    })

    const analysisResults = []

    try {
      // Analyze files sequentially with progress tracking
      for (let i = 0; i < selectedFileObjects.length; i++) {
        const file = selectedFileObjects[i]
        
        // Update progress
        setAnalysisProgress(prev => ({
          ...prev,
          currentIndex: i,
          currentFile: file.name
        }))

        if (file.fileData) {
          try {
            const result = await analyzeDocument(file.fileData, true)
            if (result) {
              analysisResults.push(result)
              setAnalysisProgress(prev => ({
                ...prev,
                completedFiles: [...prev.completedFiles, file.name]
              }))
            }
          } catch (error) {
            console.error(`Analysis failed for ${file.name}:`, error)
            setAnalysisProgress(prev => ({
              ...prev,
              failedFiles: [...prev.failedFiles, file.name]
            }))
          }
        }
      }

      // Final progress update
      setAnalysisProgress(prev => ({
        ...prev,
        currentIndex: selectedFileObjects.length,
        currentFile: ''
      }))

      // Add analyzed documents to the main analysis results store
      analysisResults.forEach(result => {
        addAnalysisResult(result)
      })

      // Add analyzed documents to the existing group
      updateDocumentGroup(groupId, {
        documents: [...targetGroup.documents, ...analysisResults],
        updatedAt: new Date().toISOString()
      })

      toast({
        title: 'Dosyalar Gruba Eklendi',
        description: `${analysisResults.length} dosya "${targetGroup.name}" grubuna eklendi ve dokümanlar listesine eklendi.`,
      })

      // Clear selection and navigate to the group page after a delay
      setTimeout(() => {
        setSelectedFiles(new Set())
        setIsSelectMode(false)
        setIsSequentialAnalysis(false)
        navigate(`/groups/${groupId}`)
      }, 2000)

    } catch (error) {
      console.error('Error adding files to group:', error)
      toast({
        title: 'Hata',
        description: 'Dosyalar gruba eklenirken bir hata oluştu.',
        variant: 'destructive'
      })
      setIsSequentialAnalysis(false)
    }
  }

  const analyzeSelectedFiles = async () => {
    if (selectedFiles.size === 0) {
      toast({
        title: 'Dosya Seçilmedi',
        description: 'Analiz etmek için en az bir dosya seçin.',
        variant: 'destructive'
      })
      return
    }

    const selectedFileObjects = files.filter(file => selectedFiles.has(file.id))
    setIsAnalyzing(true)

    try {
      // Önce her dosyayı ayrı ayrı analiz et
      const analysisResults = []
      for (const file of selectedFileObjects) {
        if (file.fileData) {
          setAnalyzingFile(file.name)
          const result = await analyzeDocument(file.fileData)
          if (result) {
            analysisResults.push(result)
          }
        }
      }

      // Eğer birden fazla dosya varsa, çapraz analiz yap
      if (analysisResults.length > 1) {
        setAnalyzingFile('Çapraz Dosya Analizi')
        
        // Grup oluştur ve çapraz analiz yap
        const groupName = `Çapraz Analiz Grubu ${Date.now()}`
        const newGroup = {
          id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: groupName,
          description: `${selectedFileObjects.length} dosya arasındaki ilişkilerin analizi`,
          documents: analysisResults,
          groupAnalysisResults: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        // Grup oluştur
        addDocumentGroup(newGroup)

        // Çapraz analiz başlat
        try {
          const initResult = await window.electronAPI.initializeGroupAnalysisService()
          if (initResult.success) {
            const analysisTypes = ['cross_document_analysis', 'group_relationships', 'group_patterns']
            const crossAnalysisResult = await window.electronAPI.analyzeGroup(newGroup, analysisTypes)
            
            if (crossAnalysisResult.success) {
              // Grup analiz sonuçlarını güncelle
              updateDocumentGroup(newGroup.id, {
                groupAnalysisResults: crossAnalysisResult.results || []
              })

              toast({
                title: 'Çapraz Analiz Tamamlandı',
                description: `${selectedFileObjects.length} dosya arasındaki ilişkiler analiz edildi.`,
              })

              // Grup sayfasına yönlendir
              navigate(`/groups/${newGroup.id}`)
            }
          }
        } catch (crossError) {
          console.error('Cross analysis failed:', crossError)
          toast({
            title: 'Çapraz Analiz Hatası',
            description: 'Dosyalar arası ilişki analizi yapılamadı.',
            variant: 'destructive'
          })
        }
      } else {
        toast({
          title: 'Toplu Analiz Tamamlandı',
          description: `${selectedFileObjects.length} dosya başarıyla analiz edildi.`,
        })
      }

      // Clear selection and exit select mode
      setSelectedFiles(new Set())
      setIsSelectMode(false)

    } catch (error) {
      console.error('Bulk analysis failed:', error)
      toast({
        title: 'Toplu Analiz Hatası',
        description: 'Bazı dosyalar analiz edilemedi.',
        variant: 'destructive'
      })
    } finally {
      setIsAnalyzing(false)
      setAnalyzingFile(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <Card
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed p-8 text-center cursor-pointer transition-colors drop-zone",
          isDragActive ? "drag-over" : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-4">
          <Upload className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse • PDF, DOCX, CSV, Images supported
            </p>
          </div>
        </div>
      </Card>


      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Yüklenen Dosyalar ({files.length})</h3>
              {!isSelectMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectMode}
                  className="h-8 px-3 text-sm font-medium border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Dosya Seç
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectMode}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  ✕
                </Button>
              )}
            </div>

            {/* Action Controls - Only show when in select mode */}
            {isSelectMode && (
              <div className="flex flex-col space-y-3">
                {/* Selection Controls Row */}
                <div className="flex items-center justify-start">
                  <div className="flex items-center space-x-1 bg-gray-50 rounded-lg p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAllFiles}
                      className="h-7 px-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-white"
                    >
                      <CheckSquare className="h-3 w-3 mr-1" />
                      Tümü
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelection}
                      className="h-7 px-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-white"
                    >
                      <Square className="h-3 w-3 mr-1" />
                      Temizle
                    </Button>
                  </div>
                </div>

                {/* Action Buttons Row */}
                {selectedFiles.size > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={createGroupFromSelected}
                      className="h-8 px-4 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Yeni Grup ({selectedFiles.size})
                    </Button>
                    {documentGroups.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowGroupSelector(true)}
                        className="h-8 px-4 text-sm font-medium border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 shadow-sm"
                      >
                        <FolderPlus className="h-4 w-4 mr-2" />
                        Mevcut Gruba Ekle ({selectedFiles.size})
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            {files.map((file) => (
              <Card 
                key={file.id} 
                className={cn(
                  "p-4 transition-all duration-200",
                  isSelectMode && "cursor-pointer hover:bg-gray-50",
                  selectedFiles.has(file.id) && "ring-2 ring-blue-500 bg-blue-50"
                )}
                onClick={() => isSelectMode && toggleFileSelection(file.id)}
              >
                <div className="flex items-center space-x-3">
                  {isSelectMode && (
                    <div className="flex items-center">
                      {selectedFiles.has(file.id) ? (
                        <CheckSquare className="h-5 w-5 text-blue-500" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  )}
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!isSelectMode && (file.type === 'application/pdf' || 
                      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                      file.type === 'application/vnd.ms-excel' ||
                      file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
                      file.type === 'application/vnd.ms-powerpoint') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async (e) => {
                          e.stopPropagation()
                          try {
                            if (file.fileData) {
                              await analyzeDocument(file.fileData)
                            } else {
                              toast({
                                title: 'Dosya Bulunamadı',
                                description: 'Dosya verisi bulunamadı. Lütfen dosyayı tekrar yükleyin.',
                                variant: 'destructive'
                              })
                            }
                          } catch (error) {
                            console.error('Error analyzing document:', error)
                            toast({
                              title: 'Analiz Hatası',
                              description: 'Doküman analizi sırasında bir hata oluştu.',
                              variant: 'destructive'
                            })
                          }
                        }}
                        disabled={isAnalyzing}
                        className="flex items-center space-x-1"
                      >
                        {isAnalyzing && analyzingFile === file.name ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Brain className="h-3 w-3" />
                        )}
                        <span className="text-xs">
                          {isAnalyzing && analyzingFile === file.name ? 'Analiz Ediliyor...' : 'AI Analiz'}
                        </span>
                      </Button>
                    )}
                    <div className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      file.status === 'pending' && "bg-yellow-100 text-yellow-800",
                      file.status === 'processing' && "bg-blue-100 text-blue-800",
                      file.status === 'completed' && "bg-green-100 text-green-800",
                      file.status === 'error' && "bg-red-100 text-red-800"
                    )}>
                      {file.status}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Sequential Analysis Progress Modal */}
      <AnalysisProgressModal
        isOpen={isSequentialAnalysis}
        currentFile={analysisProgress.currentFile}
        currentIndex={analysisProgress.currentIndex}
        totalFiles={analysisProgress.totalFiles}
        completedFiles={analysisProgress.completedFiles}
        failedFiles={analysisProgress.failedFiles}
        onClose={() => setIsSequentialAnalysis(false)}
      />

      {/* Group Selector Modal */}
      {showGroupSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96 p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Gruba Ekle</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowGroupSelector(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Seçilen {selectedFiles.size} dosyayı hangi gruba eklemek istiyorsunuz?
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {documentGroups.map((group) => (
                  <Button
                    key={group.id}
                    variant="outline"
                    className="w-full justify-start text-left"
                    onClick={() => addFilesToExistingGroup(group.id)}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    <div className="flex-1">
                      <div className="font-medium">{group.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {group.documents.length} dosya
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowGroupSelector(false)}
                >
                  İptal
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
