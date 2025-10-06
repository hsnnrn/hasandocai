import { useEffect, useState } from 'react'
import { ArrowLeft, X, CheckCircle, Loader2, HardDrive, Database, Trash2, Download, Upload, Eye } from 'lucide-react'

interface LocalStorageModalProps {
  isOpen: boolean
  onClose: () => void
  onViewData?: () => void
}

export function LocalStorageModal({ isOpen, onClose, onViewData }: LocalStorageModalProps) {
  const [isEnabled, setIsEnabled] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [storageInfo, setStorageInfo] = useState<any>(null)
  const [error, setError] = useState<string>('')

  // Check localStorage status on component mount
  useEffect(() => {
    const checkLocalStorageStatus = () => {
      try {
        const stored = localStorage.getItem('local-storage-enabled')
        const enabled = stored === 'true'
        setIsEnabled(enabled)
        
        // Get storage info
        const info = {
          enabled: enabled,
          dataCount: getLocalDataCount(),
          lastUpdated: localStorage.getItem('local-storage-last-updated'),
          totalSize: getLocalStorageSize()
        }
        setStorageInfo(info)
      } catch (error) {
        console.error('Error checking local storage status:', error)
        setError('Failed to check local storage status')
      }
    }

    checkLocalStorageStatus()
  }, [])

  const getLocalDataCount = () => {
    let count = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('ai-data-') || key.startsWith('processed-'))) {
        count++
      }
    }
    return count
  }

  const getLocalStorageSize = () => {
    let totalSize = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key)
        if (value) {
          totalSize += key.length + value.length
        }
      }
    }
    return Math.round(totalSize / 1024) // Size in KB
  }

  const handleBack = () => {
    onClose()
  }

  const handleClose = () => {
    onClose()
  }

  const handleToggleLocalStorage = async () => {
    setIsLoading(true)
    setError('')

    try {
      const newEnabled = !isEnabled
      setIsEnabled(newEnabled)
      
      // Save to localStorage
      localStorage.setItem('local-storage-enabled', newEnabled.toString())
      localStorage.setItem('local-storage-last-updated', new Date().toISOString())
      
      // Update storage info
      const info = {
        enabled: newEnabled,
        dataCount: getLocalDataCount(),
        lastUpdated: new Date().toISOString(),
        totalSize: getLocalStorageSize()
      }
      setStorageInfo(info)
      
      console.log('Local storage', newEnabled ? 'enabled' : 'disabled')
    } catch (error) {
      console.error('Error toggling local storage:', error)
      setError('Failed to update local storage settings')
      setIsEnabled(!isEnabled) // Revert on error
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearLocalData = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Clear only AI-related data
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('ai-data-') || key.startsWith('processed-'))) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      // Update storage info
      const info = {
        enabled: isEnabled,
        dataCount: 0,
        lastUpdated: new Date().toISOString(),
        totalSize: getLocalStorageSize()
      }
      setStorageInfo(info)
      
      console.log('Local AI data cleared')
    } catch (error) {
      console.error('Error clearing local data:', error)
      setError('Failed to clear local data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportData = async () => {
    setIsLoading(true)
    setError('')

    try {
      const exportData: any = {}
      
      // Collect all AI-related data
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('ai-data-') || key.startsWith('processed-'))) {
          const value = localStorage.getItem(key)
          if (value) {
            exportData[key] = value
          }
        }
      }
      
      // Create and download file
      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `local-ai-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      console.log('Local data exported')
    } catch (error) {
      console.error('Error exporting data:', error)
      setError('Failed to export data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImportData = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      setIsLoading(true)
      setError('')

      try {
        const text = await file.text()
        const data = JSON.parse(text)
        
        // Import data to localStorage
        let importedCount = 0
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === 'string') {
            localStorage.setItem(key, value)
            importedCount++
          }
        }
        
        // Update storage info
        const info = {
          enabled: isEnabled,
          dataCount: getLocalDataCount(),
          lastUpdated: new Date().toISOString(),
          totalSize: getLocalStorageSize()
        }
        setStorageInfo(info)
        
        console.log(`Imported ${importedCount} items`)
      } catch (error) {
        console.error('Error importing data:', error)
        setError('Failed to import data')
      } finally {
        setIsLoading(false)
      }
    }
    
    input.click()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="w-full max-w-md mx-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20">
        {/* Custom Header with Buttons */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Geri</span>
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
              <HardDrive className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Local Storage
            </span>
          </div>
          
          <button
            onClick={handleClose}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
            <span className="text-sm font-medium">Kapat</span>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-8 text-center">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2 text-blue-600">
                <HardDrive className="h-6 w-6" />
                <h2 className="text-2xl font-bold">Local Storage Settings</h2>
              </div>
              <p className="text-gray-600 text-sm">
                Store AI-generated data locally on your device
              </p>
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            
            {/* Storage Status */}
            {storageInfo && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <div className="flex items-center space-x-2">
                    {storageInfo.enabled ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <div className="h-4 w-4 rounded-full bg-gray-300" />
                    )}
                    <span className="text-sm text-gray-600">
                      {storageInfo.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Data Items:</span>
                  <span className="text-sm text-gray-600">{storageInfo.dataCount}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Storage Size:</span>
                  <span className="text-sm text-gray-600">{storageInfo.totalSize} KB</span>
                </div>
                
                {storageInfo.lastUpdated && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Last Updated:</span>
                    <span className="text-sm text-gray-600">
                      {new Date(storageInfo.lastUpdated).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* Toggle Button */}
            <button
              onClick={handleToggleLocalStorage}
              disabled={isLoading}
              className={`w-full px-4 py-3 rounded-lg transition-colors font-medium flex items-center justify-center space-x-2 ${
                isEnabled
                  ? 'bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white'
                  : 'bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Database className="h-5 w-5" />
                  <span>{isEnabled ? 'Disable Local Storage' : 'Enable Local Storage'}</span>
                </>
              )}
            </button>
            
            {/* Data Management Buttons */}
            {isEnabled && (
              <div className="space-y-3">
                <button
                  onClick={onViewData}
                  className="w-full px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2 text-sm"
                >
                  <Eye className="h-4 w-4" />
                  <span>Verileri Görüntüle</span>
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleExportData}
                    disabled={isLoading}
                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2 text-sm"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export</span>
                  </button>
                  
                  <button
                    onClick={handleImportData}
                    disabled={isLoading}
                    className="px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2 text-sm"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Import</span>
                  </button>
                </div>
                
                <button
                  onClick={handleClearLocalData}
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2 text-sm"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Clear All Data</span>
                </button>
              </div>
            )}
            
            {/* Info Text */}
            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>Local storage keeps AI-generated data on your device</p>
              <p>Data includes processed documents, embeddings, and analysis results</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
