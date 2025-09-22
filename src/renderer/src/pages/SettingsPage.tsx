import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/appStore'
import { 
  Settings, 
  Palette, 
  Database, 
  Shield, 
  Bell,
  Download,
  Upload,
  Trash2
} from 'lucide-react'

export function SettingsPage() {
  const { theme, setTheme } = useAppStore()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your Document Converter preferences and options
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Palette className="h-5 w-5" />
              <span>Appearance</span>
            </CardTitle>
            <CardDescription>
              Customize the look and feel of the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-3 block">Theme</label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`
                    p-3 border rounded-lg cursor-pointer transition-colors text-center
                    ${theme === 'light' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                  onClick={() => setTheme('light')}
                >
                  <div className="font-medium text-sm">Light</div>
                  <div className="text-xs text-muted-foreground">Clean and bright</div>
                </div>
                <div
                  className={`
                    p-3 border rounded-lg cursor-pointer transition-colors text-center
                    ${theme === 'dark' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                  onClick={() => setTheme('dark')}
                >
                  <div className="font-medium text-sm">Dark</div>
                  <div className="text-xs text-muted-foreground">Easy on the eyes</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Processing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>File Processing</span>
            </CardTitle>
            <CardDescription>
              Default settings for file conversions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Auto-save converted files</div>
                  <div className="text-xs text-muted-foreground">Automatically save files after conversion</div>
                </div>
                <input type="checkbox" defaultChecked className="rounded border-border" />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Preserve original files</div>
                  <div className="text-xs text-muted-foreground">Keep original files after conversion</div>
                </div>
                <input type="checkbox" defaultChecked className="rounded border-border" />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Background processing</div>
                  <div className="text-xs text-muted-foreground">Process files in the background</div>
                </div>
                <input type="checkbox" defaultChecked className="rounded border-border" />
              </label>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Maximum file size (MB)</label>
              <input 
                type="number" 
                defaultValue={100} 
                className="w-full p-2 border rounded-md bg-background"
                min={1}
                max={1000}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Data Management</span>
            </CardTitle>
            <CardDescription>
              Manage your conversion history and cache
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                History retention (days)
              </label>
              <input 
                type="number" 
                defaultValue={30} 
                className="w-full p-2 border rounded-md bg-background"
                min={1}
                max={365}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Cache size limit (MB)
              </label>
              <input 
                type="number" 
                defaultValue={500} 
                className="w-full p-2 border rounded-md bg-background"
                min={100}
                max={5000}
              />
            </div>

            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Cache
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear History
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Privacy & Security</span>
            </CardTitle>
            <CardDescription>
              Control how your data is handled
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Local processing only</div>
                  <div className="text-xs text-muted-foreground">Process files locally without cloud services</div>
                </div>
                <input type="checkbox" defaultChecked className="rounded border-border" />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Auto-delete temporary files</div>
                  <div className="text-xs text-muted-foreground">Remove temporary files after processing</div>
                </div>
                <input type="checkbox" defaultChecked className="rounded border-border" />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Analytics</div>
                  <div className="text-xs text-muted-foreground">Share anonymous usage statistics</div>
                </div>
                <input type="checkbox" className="rounded border-border" />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </CardTitle>
            <CardDescription>
              Configure when to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Conversion complete</div>
                  <div className="text-xs text-muted-foreground">Notify when files finish processing</div>
                </div>
                <input type="checkbox" defaultChecked className="rounded border-border" />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Conversion errors</div>
                  <div className="text-xs text-muted-foreground">Notify when conversion fails</div>
                </div>
                <input type="checkbox" defaultChecked className="rounded border-border" />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">App updates</div>
                  <div className="text-xs text-muted-foreground">Notify when updates are available</div>
                </div>
                <input type="checkbox" defaultChecked className="rounded border-border" />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Import/Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Import/Export</span>
            </CardTitle>
            <CardDescription>
              Backup and restore your settings and data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import Data
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Export includes conversion history, templates, and settings
            </div>
          </CardContent>
        </Card>
      </div>

      {/* App Info */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-2">
            <h3 className="font-medium">Document Converter</h3>
            <p className="text-sm text-muted-foreground">
              Version 1.0.0 • Built with Electron & React
            </p>
            <p className="text-xs text-muted-foreground">
              AI-powered local document conversion tool
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
