import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { History, Download, Trash2, FileText } from 'lucide-react'

// Mock data for development
const mockHistory = [
  {
    id: '1',
    timestamp: Date.now() - 86400000,
    inputFile: 'document.pdf',
    outputFile: 'document.docx',
    inputFormat: 'pdf',
    outputFormat: 'docx',
    fileSize: 2048000,
    processingTime: 5200,
    success: true,
  },
  {
    id: '2',
    timestamp: Date.now() - 172800000,
    inputFile: 'spreadsheet.xlsx',
    outputFile: 'spreadsheet.csv',
    inputFormat: 'xlsx',
    outputFormat: 'csv',
    fileSize: 1024000,
    processingTime: 2100,
    success: true,
  },
  {
    id: '3',
    timestamp: Date.now() - 259200000,
    inputFile: 'report.docx',
    outputFile: 'report.pdf',
    inputFormat: 'docx',
    outputFormat: 'pdf',
    fileSize: 3072000,
    processingTime: 8500,
    success: false,
    error: 'File contains unsupported formatting',
  },
]

export function HistoryPage() {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatProcessingTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Conversion History</h1>
          <p className="text-muted-foreground">
            Track all your document conversions and download previous results
          </p>
        </div>
        <Button variant="outline">
          <Trash2 className="h-4 w-4 mr-2" />
          Clear History
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              {mockHistory.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Conversions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {mockHistory.filter(h => h.success).length}
            </div>
            <div className="text-sm text-muted-foreground">Successful</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {mockHistory.filter(h => !h.success).length}
            </div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {formatFileSize(mockHistory.reduce((sum, h) => sum + h.fileSize, 0))}
            </div>
            <div className="text-sm text-muted-foreground">Data Processed</div>
          </CardContent>
        </Card>
      </div>

      {/* History List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>Recent Conversions</span>
          </CardTitle>
          <CardDescription>
            Your conversion history with download options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockHistory.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <div className="font-medium">
                      {record.inputFile} → {record.outputFile}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {record.inputFormat.toUpperCase()} to {record.outputFormat.toUpperCase()} • 
                      {formatFileSize(record.fileSize)} • 
                      {formatProcessingTime(record.processingTime)} • 
                      {formatDate(record.timestamp)}
                    </div>
                    {!record.success && record.error && (
                      <div className="text-sm text-red-600 mt-1">
                        Error: {record.error}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${record.success 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                    }
                  `}>
                    {record.success ? 'Success' : 'Failed'}
                  </div>
                  {record.success && (
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  )}
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
