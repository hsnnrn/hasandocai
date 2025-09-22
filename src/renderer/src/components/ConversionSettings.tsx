import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/appStore'
import { Settings2, Download } from 'lucide-react'

const outputFormats = [
  { value: 'pdf', label: 'PDF Document', description: 'Portable Document Format' },
  { value: 'docx', label: 'Word Document', description: 'Microsoft Word Format' },
  { value: 'xlsx', label: 'Excel Spreadsheet', description: 'Microsoft Excel Format' },
  { value: 'csv', label: 'CSV File', description: 'Comma Separated Values' },
]

const qualityOptions = [
  { value: 'low', label: 'Low', description: 'Faster processing, smaller file size' },
  { value: 'medium', label: 'Medium', description: 'Balanced quality and speed' },
  { value: 'high', label: 'High', description: 'Best quality, slower processing' },
]

export function ConversionSettings() {
  const { 
    conversionSettings, 
    setConversionSettings, 
    files, 
    isProcessing, 
    setIsProcessing,
    updateFile 
  } = useAppStore()

  const handleProcessFiles = async () => {
    if (files.length === 0) return

    setIsProcessing(true)

    for (const file of files) {
      try {
        updateFile(file.id, { status: 'processing', progress: 0 })

        // Simulate processing with progress updates
        for (let progress = 0; progress <= 100; progress += 20) {
          await new Promise(resolve => setTimeout(resolve, 200))
          updateFile(file.id, { progress })
        }

        // Simulate API call to electron main process
        if (window.electronAPI) {
          const result = await window.electronAPI.processFile(file.path, conversionSettings)
          
          if (result.success) {
            updateFile(file.id, { 
              status: 'completed', 
              progress: 100,
              result: result 
            })
          } else {
            updateFile(file.id, { 
              status: 'error', 
              error: result.error 
            })
          }
        } else {
          // Fallback for web development
          updateFile(file.id, { 
            status: 'completed', 
            progress: 100 
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
          {/* Output Format */}
          <div>
            <label className="text-sm font-medium mb-3 block">Output Format</label>
            <div className="grid grid-cols-2 gap-3">
              {outputFormats.map((format) => (
                <div
                  key={format.value}
                  className={`
                    p-3 border rounded-lg cursor-pointer transition-colors
                    ${conversionSettings.outputFormat === format.value 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                  onClick={() => setConversionSettings({ outputFormat: format.value as any })}
                >
                  <div className="font-medium text-sm">{format.label}</div>
                  <div className="text-xs text-muted-foreground">{format.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div>
            <label className="text-sm font-medium mb-3 block">Quality</label>
            <div className="grid grid-cols-3 gap-3">
              {qualityOptions.map((quality) => (
                <div
                  key={quality.value}
                  className={`
                    p-3 border rounded-lg cursor-pointer transition-colors text-center
                    ${conversionSettings.quality === quality.value 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                  onClick={() => setConversionSettings({ quality: quality.value as any })}
                >
                  <div className="font-medium text-sm">{quality.label}</div>
                  <div className="text-xs text-muted-foreground">{quality.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Advanced Options</label>
            
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={conversionSettings.preserveFormatting}
                  onChange={(e) => setConversionSettings({ preserveFormatting: e.target.checked })}
                  className="rounded border-border"
                />
                <div>
                  <div className="text-sm font-medium">Preserve Formatting</div>
                  <div className="text-xs text-muted-foreground">Maintain original document formatting</div>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={conversionSettings.ocrEnabled}
                  onChange={(e) => setConversionSettings({ ocrEnabled: e.target.checked })}
                  className="rounded border-border"
                />
                <div>
                  <div className="text-sm font-medium">OCR (Text Recognition)</div>
                  <div className="text-xs text-muted-foreground">Extract text from scanned documents</div>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={conversionSettings.mergeFiles}
                  onChange={(e) => setConversionSettings({ mergeFiles: e.target.checked })}
                  className="rounded border-border"
                />
                <div>
                  <div className="text-sm font-medium">Merge Similar Files</div>
                  <div className="text-xs text-muted-foreground">Combine multiple files into one</div>
                </div>
              </label>
            </div>
          </div>
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
