import React from 'react'
import { FileDropZone } from '@/components/FileDropZone'
import { ConversionSettings } from '@/components/ConversionSettings'
import { ProcessingProgress } from '@/components/ProcessingProgress'
import { useAppStore } from '@/store/appStore'

export function HomePage() {
  const { files, isProcessing } = useAppStore()

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Document Converter</h1>
        <p className="text-muted-foreground">
          Convert between PDF, Word, Excel, and CSV formats with AI-powered optimization
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <FileDropZone />
          {isProcessing && <ProcessingProgress />}
        </div>
        
        <div>
          <ConversionSettings />
        </div>
      </div>

      {files.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-medium mb-2">Quick Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-2xl font-bold text-primary">{files.length}</div>
              <div className="text-muted-foreground">Total Files</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {files.filter(f => f.status === 'completed').length}
              </div>
              <div className="text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {files.filter(f => f.status === 'processing').length}
              </div>
              <div className="text-muted-foreground">Processing</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {files.filter(f => f.status === 'error').length}
              </div>
              <div className="text-muted-foreground">Errors</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
