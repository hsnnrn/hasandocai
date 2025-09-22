import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, File } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/utils/cn'

const ACCEPTED_FORMATS = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv'],
}

export function FileDropZone() {
  const { addFiles, files } = useAppStore()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      path: file.path || '',
      size: file.size,
      type: file.type,
      status: 'pending' as const,
      progress: 0,
    }))
    
    addFiles(newFiles)
  }, [addFiles])

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
              or click to browse • PDF, DOCX, XLSX, CSV supported
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
