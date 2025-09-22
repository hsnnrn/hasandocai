import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/store/appStore'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export function ProcessingProgress() {
  const { files } = useAppStore()

  const processingFiles = files.filter(f => f.status === 'processing' || f.status === 'completed' || f.status === 'error')

  if (processingFiles.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 processing" />
          <span>Processing Progress</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {processingFiles.map((file) => (
          <div key={file.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {file.status === 'processing' && (
                  <Loader2 className="h-4 w-4 processing text-blue-500" />
                )}
                {file.status === 'completed' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {file.status === 'error' && (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm font-medium truncate">{file.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {file.progress}%
              </span>
            </div>
            <Progress value={file.progress} className="h-2" />
            {file.error && (
              <p className="text-xs text-red-600">{file.error}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
