import React from 'react'
import { Progress } from '@/components/ui/progress'
import { Loader2, FileText, CheckCircle, XCircle, X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface AnalysisProgressModalProps {
  isOpen: boolean
  currentFile?: string
  currentIndex: number
  totalFiles: number
  completedFiles: string[]
  failedFiles: string[]
  onClose?: () => void
}

export function AnalysisProgressModal({
  isOpen,
  currentFile,
  currentIndex,
  totalFiles,
  completedFiles,
  failedFiles,
  onClose
}: AnalysisProgressModalProps) {
  const progress = totalFiles > 0 ? ((currentIndex + 1) / totalFiles) * 100 : 0
  const isCompleted = currentIndex >= totalFiles
  const hasErrors = failedFiles.length > 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="w-full max-w-md mx-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Loader2 className={cn("h-5 w-5", isCompleted ? "animate-none" : "animate-spin")} />
            <span className="text-lg font-semibold">
              {isCompleted ? 'Analiz Tamamlandı' : 'Dosyalar Analiz Ediliyor'}
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>İlerleme</span>
              <span>{currentIndex + 1} / {totalFiles}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Current File */}
          {currentFile && !isCompleted && (
            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <FileText className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-700 truncate">
                {currentFile}
              </span>
            </div>
          )}

          {/* Completed Files */}
          {completedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-green-700">
                Tamamlanan Dosyalar ({completedFiles.length})
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {completedFiles.map((filename, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                    <span className="text-green-700 truncate">{filename}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed Files */}
          {failedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-red-700">
                Başarısız Dosyalar ({failedFiles.length})
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {failedFiles.map((filename, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm">
                    <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                    <span className="text-red-700 truncate">{filename}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {isCompleted && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Toplam Dosya:</span>
                  <span className="font-medium">{totalFiles}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Başarılı:</span>
                  <span className="font-medium">{completedFiles.length}</span>
                </div>
                {failedFiles.length > 0 && (
                  <div className="flex justify-between text-red-700">
                    <span>Başarısız:</span>
                    <span className="font-medium">{failedFiles.length}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
