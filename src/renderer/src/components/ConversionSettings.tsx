import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/appStore'
import { Settings2, Download, CheckCircle, FileText, Image, Shrink, Merge, Split, Droplets, FolderOpen, Database } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const convertAPITools = [
  // PDF Conversions
  { 
    value: 'pdf_to_docx', 
    label: 'PDF to DOCX', 
    description: 'Convert PDF to Word document',
    icon: FileText,
    category: 'PDF'
  },
  { 
    value: 'pdf_to_jpg', 
    label: 'PDF to JPG', 
    description: 'Convert PDF pages to JPG images',
    icon: Image,
    category: 'PDF'
  },
  { 
    value: 'pdf_to_png', 
    label: 'PDF to PNG', 
    description: 'Convert PDF pages to PNG images',
    icon: Image,
    category: 'PDF'
  },
  { 
    value: 'pdf_to_html', 
    label: 'PDF to HTML', 
    description: 'Convert PDF to HTML webpage',
    icon: FileText,
    category: 'PDF'
  },
  { 
    value: 'pdf_to_txt', 
    label: 'PDF to TXT', 
    description: 'Convert PDF to plain text',
    icon: FileText,
    category: 'PDF'
  },
  
  // Document Conversions
  { 
    value: 'docx_to_pdf', 
    label: 'DOCX to PDF', 
    description: 'Convert Word document to PDF',
    icon: FileText,
    category: 'Document'
  },
  { 
    value: 'docx_to_html', 
    label: 'DOCX to HTML', 
    description: 'Convert Word document to HTML',
    icon: FileText,
    category: 'Document'
  },
  { 
    value: 'docx_to_txt', 
    label: 'DOCX to TXT', 
    description: 'Convert Word document to text',
    icon: FileText,
    category: 'Document'
  },
  
  // Image to PDF Conversions
  { 
    value: 'jpg_to_pdf', 
    label: 'JPG to PDF', 
    description: 'Convert JPG images to PDF',
    icon: Image,
    category: 'Image'
  },
  { 
    value: 'png_to_pdf', 
    label: 'PNG to PDF', 
    description: 'Convert PNG images to PDF',
    icon: Image,
    category: 'Image'
  },
  
  // Spreadsheet Conversions
  { 
    value: 'xlsx_to_pdf', 
    label: 'XLSX to PDF', 
    description: 'Convert Excel to PDF',
    icon: FileText,
    category: 'Spreadsheet'
  },
  { 
    value: 'xlsx_to_html', 
    label: 'XLSX to HTML', 
    description: 'Convert Excel to HTML table',
    icon: FileText,
    category: 'Spreadsheet'
  },
  { 
    value: 'xlsx_to_csv', 
    label: 'XLSX to CSV', 
    description: 'Convert Excel to CSV',
    icon: FileText,
    category: 'Spreadsheet'
  },
  
  // Presentation Conversions
  { 
    value: 'pptx_to_pdf', 
    label: 'PPTX to PDF', 
    description: 'Convert PowerPoint to PDF',
    icon: FileText,
    category: 'Presentation'
  },
  { 
    value: 'pptx_to_jpg', 
    label: 'PPTX to JPG', 
    description: 'Convert PowerPoint slides to JPG',
    icon: Image,
    category: 'Presentation'
  },
  
  // OCR Tools
  { 
    value: 'pdf_to_ocr', 
    label: 'PDF to OCR', 
    description: 'Extract text from scanned PDF using OCR',
    icon: FileText,
    category: 'OCR'
  },
  { 
    value: 'image_to_ocr', 
    label: 'Image to OCR', 
    description: 'Extract text from images using OCR',
    icon: Image,
    category: 'OCR'
  },
  { 
    value: 'pdf_to_searchable', 
    label: 'PDF to Searchable', 
    description: 'Make scanned PDF searchable with OCR',
    icon: FileText,
    category: 'OCR'
  },
  
  // PDF Tools
  { 
    value: 'compress_pdf', 
    label: 'Compress PDF', 
    description: 'Reduce PDF file size',
    icon: Shrink,
    category: 'PDF Tools'
  },
  { 
    value: 'merge_pdf', 
    label: 'Merge PDF', 
    description: 'Combine multiple PDFs',
    icon: Merge,
    category: 'PDF Tools'
  },
  { 
    value: 'split_pdf', 
    label: 'Split PDF', 
    description: 'Split PDF into separate pages',
    icon: Split,
    category: 'PDF Tools'
  },
  { 
    value: 'watermark_pdf', 
    label: 'Watermark PDF', 
    description: 'Add watermark to PDF',
    icon: Droplets,
    category: 'PDF Tools'
  },
  { 
    value: 'unlock_pdf', 
    label: 'Unlock PDF', 
    description: 'Remove password from PDF',
    icon: FileText,
    category: 'PDF Tools'
  },
]

// Document conversion tools


export function ConversionSettings() {
  const { 
    conversionSettings, 
    setConversionSettings, 
    files, 
    isProcessing, 
    setIsProcessing,
    updateFile 
  } = useAppStore()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<any>(null)

  useEffect(() => {
    // Listen for project selection changes
    const handleLoginChange = (event: any) => {
      const { isLoggedIn, userInfo } = event.detail
      if (isLoggedIn && userInfo?.selectedProject) {
        setSelectedProject(userInfo.selectedProject)
      } else {
        setSelectedProject(null)
      }
    }

    window.addEventListener('supabase-login-changed', handleLoginChange)
    
    // Check for existing project selection
    const storedLogin = localStorage.getItem('supabase-login')
    if (storedLogin) {
      try {
        const loginData = JSON.parse(storedLogin)
        if (loginData.selectedProject) {
          setSelectedProject(loginData.selectedProject)
        }
      } catch (error) {
        console.error('Error parsing stored login data:', error)
      }
    }
    
    return () => {
      window.removeEventListener('supabase-login-changed', handleLoginChange)
    }
  }, [])

  // Set default output directory to Desktop
  useEffect(() => {
    if (!conversionSettings.outputDirectory) {
      // Set desktop as default (cross-platform)
      const isWindows = navigator.platform.toLowerCase().includes('win')
      const desktopPath = isWindows ? 'Desktop' : 'Desktop'
      setConversionSettings({ outputDirectory: desktopPath })
    }
  }, [])

  // Filter tools based on search and category
  const filteredTools = convertAPITools.filter(tool => {
    const matchesSearch = tool.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || tool.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = Array.from(new Set(convertAPITools.map(tool => tool.category)))

  const handleProcessFiles = async () => {
    if (files.length === 0) return

    setIsProcessing(true)

    for (const file of files) {
      try {
        updateFile(file.id, { status: 'processing', progress: 0 })

        // Start progress simulation
        let progress = 0
        const progressInterval = setInterval(() => {
          progress = Math.min(progress + 5, 90) // Max 90% until completion
          updateFile(file.id, { progress })
        }, 100)

        // Process via Electron main
        if ((window as any).electronAPI) {
          const result = await (window as any).electronAPI.processFile(file.path, conversionSettings)
          
          // Clear progress interval
          clearInterval(progressInterval)
          
          if (result.success) {
            // Complete progress
            updateFile(file.id, { progress: 100 })
            
            // Auto-save notification
            if ((result as any).autoSavePath) {
              toast({
                title: 'File converted and saved',
                description: `Saved to Desktop: ${(result as any).autoSavePath.split('\\').pop() || (result as any).autoSavePath.split('/').pop()}`,
              })
            }
            
            updateFile(file.id, { 
              status: 'completed', 
              progress: 100,
              result: result 
            })
          } else {
            updateFile(file.id, { 
              status: 'error', 
              error: result.error || 'Unknown error',
              progress: 0 
            })
          }
        } else {
          clearInterval(progressInterval)
          updateFile(file.id, { 
            status: 'error', 
            error: 'Electron API not available',
            progress: 0 
          })
        }
      } catch (error) {
        updateFile(file.id, { 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Processing failed' 
        })
      }
    }

    setIsProcessing(false)
  }

  const canProcess = files.length > 0 && !isProcessing

  return (
    <div className="space-y-6">
      {/* Supabase Project Info */}
      {selectedProject && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Database className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium text-green-800">
                  Using Supabase Project: {selectedProject.name}
                </div>
                <div className="text-sm text-green-600">
                  {selectedProject.ref} • {selectedProject.status}
                  {selectedProject.organization_name && (
                    <span> • {selectedProject.organization_name}</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings2 className="h-5 w-5" />
            <span>Conversion Settings</span>
          </CardTitle>
          <CardDescription>
            Configure how your files will be converted
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Document Conversion Tools */}
          <div>
            <label className="text-sm font-medium mb-3 block">Choose Document Conversion Tool</label>
            
            {/* Search and Category Filter */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search document conversion tools..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    !selectedCategory 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedCategory === category 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
              {filteredTools.map((tool) => {
                const IconComponent = tool.icon;
                const isSelected = conversionSettings.iLovePDFTool === tool.value;
                return (
                  <div
                    key={tool.value}
                    className={`
                      p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
                      ${isSelected 
                        ? 'border-primary bg-primary/10 shadow-md' 
                        : 'border-border hover:border-primary/50 hover:shadow-sm'
                      }
                    `}
                    onClick={() => setConversionSettings({ 
                      iLovePDFTool: tool.value
                    })}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`
                        p-2 rounded-lg
                        ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}
                      `}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-base">{tool.label}</div>
                        <div className="text-sm text-muted-foreground mt-1">{tool.description}</div>
                      </div>
                      {isSelected && (
                        <div className="text-primary">
                          <CheckCircle className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Output Directory Settings */}
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FolderOpen className="h-5 w-5" />
            <span>Save Location</span>
          </CardTitle>
          <CardDescription>
            Converted files are automatically saved to your Desktop
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <div className="font-medium text-green-800">Auto-save to Desktop</div>
              <div className="text-sm text-green-600">
                Files will be saved as: filename_converted.ext
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            No additional setup required - files are automatically saved to your Desktop folder
          </p>
        </CardContent>
      </Card>

      {/* Process Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleProcessFiles}
          disabled={!canProcess}
          size="lg"
          className="px-8"
        >
          <Download className="h-4 w-4 mr-2" />
          {isProcessing ? 'Processing...' : `Process ${files.length} File${files.length === 1 ? '' : 's'}`}
        </Button>
      </div>
    </div>
  )
}
