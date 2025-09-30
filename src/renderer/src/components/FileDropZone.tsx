import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, File, FolderOpen, Brain, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/utils/cn'
import { useToast } from '@/hooks/use-toast'

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
  const { addFiles, files, addAnalysisResult } = useAppStore()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzingFile, setAnalyzingFile] = useState<string | null>(null)
  const { toast } = useToast()
  const navigate = useNavigate()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      path: file.path || '',
      size: file.size,
      type: file.type,
      status: 'pending' as const,
      progress: 0,
      fileData: file, // Store the actual File object
    }))
    
    addFiles(newFiles)
  }, [addFiles])

  const analyzeDocument = useCallback(async (file: File) => {
    setIsAnalyzing(true)
    setAnalyzingFile(file.name)

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
        throw new Error(analysisResult.error || 'Doküman analizi başarısız')
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

      toast({
        title: 'Analiz Tamamlandı',
        description: `${fileType} "${file.name}" başarıyla analiz edildi${additionalInfo}. ${analysisResult.textSections?.length || 0} metin bölümü ve ${analysisResult.aiCommentary?.length || 0} AI yorumu oluşturuldu.`,
      })

      console.log('Document Analysis completed:', analysisResult)

      // Save analysis result to store
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

      addAnalysisResult(analysisResultData)

      // Navigate to results page
      navigate(`/results?documentId=${analysisResultData.documentId}`)

    } catch (error: any) {
      console.error('Document analysis failed:', error)
      toast({
        title: 'Analiz Hatası',
        description: error.message || 'Doküman analizi sırasında bir hata oluştu.',
        variant: 'destructive'
      })
    } finally {
      setIsAnalyzing(false)
      setAnalyzingFile(null)
    }
  }, [toast])

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
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Selected Files ({files.length})</h3>
          <div className="space-y-2">
            {files.map((file) => (
              <Card key={file.id} className="p-4">
                <div className="flex items-center space-x-3">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {(file.type === 'application/pdf' || 
                      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                      file.type === 'application/vnd.ms-excel' ||
                      file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
                      file.type === 'application/vnd.ms-powerpoint') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
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
    </div>
  )
}
