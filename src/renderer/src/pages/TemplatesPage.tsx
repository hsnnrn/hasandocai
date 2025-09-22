import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Layers, Plus, Edit, Trash2, Download } from 'lucide-react'

// Mock data for development
const mockTemplates = [
  {
    id: '1',
    name: 'Financial Report Template',
    description: 'Convert Excel financial reports to professional PDF format',
    inputFormat: 'xlsx',
    outputFormat: 'pdf',
    settings: {
      quality: 'high',
      preserveFormatting: true,
      ocrEnabled: false,
    },
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    usageCount: 15,
  },
  {
    id: '2',
    name: 'Document Archive',
    description: 'Convert Word documents to PDF for archival purposes',
    inputFormat: 'docx',
    outputFormat: 'pdf',
    settings: {
      quality: 'medium',
      preserveFormatting: true,
      ocrEnabled: true,
    },
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 172800000,
    usageCount: 8,
  },
  {
    id: '3',
    name: 'Data Export',
    description: 'Convert Excel sheets to CSV for data analysis',
    inputFormat: 'xlsx',
    outputFormat: 'csv',
    settings: {
      quality: 'high',
      preserveFormatting: false,
      ocrEnabled: false,
    },
    createdAt: Date.now() - 259200000,
    updatedAt: Date.now() - 259200000,
    usageCount: 23,
  },
]

export function TemplatesPage() {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getFormatColor = (format: string) => {
    switch (format.toLowerCase()) {
      case 'pdf': return 'text-red-600 bg-red-100'
      case 'docx': return 'text-blue-600 bg-blue-100'
      case 'xlsx': return 'text-green-600 bg-green-100'
      case 'csv': return 'text-orange-600 bg-orange-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Conversion Templates</h1>
          <p className="text-muted-foreground">
            Create and manage reusable conversion templates for consistent results
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              {mockTemplates.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Templates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {mockTemplates.reduce((sum, t) => sum + t.usageCount, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Uses</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {Math.max(...mockTemplates.map(t => t.usageCount))}
            </div>
            <div className="text-sm text-muted-foreground">Most Used</div>
          </CardContent>
        </Card>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <Layers className="h-6 w-6 text-primary" />
                <div className="flex space-x-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getFormatColor(template.inputFormat)}`}>
                    {template.inputFormat.toUpperCase()}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getFormatColor(template.outputFormat)}`}>
                    {template.outputFormat.toUpperCase()}
                  </span>
                </div>
              </div>
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Settings Summary */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Settings:</div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Quality: {template.settings.quality}</div>
                  <div>Preserve Formatting: {template.settings.preserveFormatting ? 'Yes' : 'No'}</div>
                  <div>OCR Enabled: {template.settings.ocrEnabled ? 'Yes' : 'No'}</div>
                </div>
              </div>

              {/* Usage Stats */}
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Used {template.usageCount} times</span>
                <span>Updated {formatDate(template.updatedAt)}</span>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <Button size="sm" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Use Template
                </Button>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State for No Templates */}
      {mockTemplates.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">No Templates Yet</CardTitle>
            <CardDescription className="mb-4">
              Create your first conversion template to save time on repeated tasks
            </CardDescription>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
