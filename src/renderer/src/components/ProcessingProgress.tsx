import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/store/appStore'
import { Loader2, CheckCircle, XCircle, FileText, Download } from 'lucide-react'

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
          <div key={file.id} className="space-y-3 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-background">
                  {file.status === 'processing' && (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  )}
                  {file.status === 'completed' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {file.status === 'error' && (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium truncate max-w-xs">{file.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {file.status === 'processing' && 'Converting...'}
                    {file.status === 'completed' && 'Conversion completed'}
                    {file.status === 'error' && 'Conversion failed'}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {file.status === 'completed' && (
                  <div className="flex items-center space-x-1 text-green-600">
                    <Download className="h-4 w-4" />
                    <span className="text-sm">Saved</span>
                  </div>
                )}
                <span className="text-sm font-medium text-muted-foreground">{file.progress}%</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Progress 
                value={file.progress} 
                className="h-3"
                style={{
                  background: file.status === 'error' ? '#fef2f2' : undefined
                }}
              />
              {file.status === 'processing' && (
                <div className="text-xs text-muted-foreground text-center">
                  Processing your document...
                </div>
              )}
            </div>
            
            {file.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{file.error}</p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

