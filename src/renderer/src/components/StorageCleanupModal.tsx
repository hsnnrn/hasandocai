import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Trash2, 
  Database, 
  AlertTriangle, 
  CheckCircle,
  HardDrive,
  FileText,
  Users,
  BarChart3
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useToast } from '@/hooks/use-toast'

interface StorageCleanupModalProps {
  isOpen: boolean
  onClose: () => void
}

export function StorageCleanupModal({ isOpen, onClose }: StorageCleanupModalProps) {
  const { 
    analysisResults, 
    documentGroups, 
    clearAllData, 
    clearAnalysisResults, 
    clearDocumentGroups,
    getStorageInfo 
  } = useAppStore()
  const { toast } = useToast()
  
  const [storageInfo, setStorageInfo] = useState({ used: 0, available: 0, percentage: 0 })
  const [isClearing, setIsClearing] = useState(false)

  useEffect(() => {
    if (isOpen) {
      updateStorageInfo()
    }
  }, [isOpen])

  const updateStorageInfo = () => {
    const info = getStorageInfo()
    setStorageInfo(info)
  }

  const handleClearAllData = async () => {
    setIsClearing(true)
    try {
      clearAllData()
      updateStorageInfo()
      
      toast({
        title: 'Tüm Veriler Temizlendi',
        description: 'Tüm analiz sonuçları ve gruplar başarıyla silindi.',
      })
      
      onClose()
    } catch (error) {
      console.error('Error clearing all data:', error)
      toast({
        title: 'Temizleme Hatası',
        description: 'Veriler temizlenirken bir hata oluştu.',
        variant: 'destructive'
      })
    } finally {
      setIsClearing(false)
    }
  }

  const handleClearAnalysisResults = async () => {
    setIsClearing(true)
    try {
      clearAnalysisResults()
      updateStorageInfo()
      
      toast({
        title: 'Analiz Sonuçları Temizlendi',
        description: 'Tüm analiz sonuçları başarıyla silindi.',
      })
    } catch (error) {
      console.error('Error clearing analysis results:', error)
      toast({
        title: 'Temizleme Hatası',
        description: 'Analiz sonuçları temizlenirken bir hata oluştu.',
        variant: 'destructive'
      })
    } finally {
      setIsClearing(false)
    }
  }

  const handleClearDocumentGroups = async () => {
    setIsClearing(true)
    try {
      clearDocumentGroups()
      updateStorageInfo()
      
      toast({
        title: 'Doküman Grupları Temizlendi',
        description: 'Tüm doküman grupları başarıyla silindi.',
      })
    } catch (error) {
      console.error('Error clearing document groups:', error)
      toast({
        title: 'Temizleme Hatası',
        description: 'Doküman grupları temizlenirken bir hata oluştu.',
        variant: 'destructive'
      })
    } finally {
      setIsClearing(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStorageStatus = () => {
    if (storageInfo.percentage < 50) return { color: 'text-green-600', status: 'İyi' }
    if (storageInfo.percentage < 80) return { color: 'text-yellow-600', status: 'Dikkat' }
    return { color: 'text-red-600', status: 'Kritik' }
  }

  const status = getStorageStatus()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <HardDrive className="h-6 w-6 text-blue-500" />
              <h2 className="text-xl font-semibold">Depolama Yönetimi</h2>
            </div>
            <Button variant="ghost" onClick={onClose} size="sm">
              ✕
            </Button>
          </div>

          {/* Storage Overview */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Depolama Kullanımı</span>
              <Badge className={status.color}>
                {status.status}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{formatBytes(storageInfo.used)} kullanıldı</span>
                <span>{formatBytes(storageInfo.available)} toplam</span>
              </div>
              <Progress value={storageInfo.percentage} className="h-2" />
              <div className="text-xs text-gray-500 text-center">
                %{storageInfo.percentage.toFixed(1)} kullanıldı
              </div>
            </div>
          </div>

          {/* Data Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold text-blue-600">{analysisResults.length}</div>
                  <div className="text-sm text-gray-600">Analiz Sonucu</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold text-green-600">{documentGroups.length}</div>
                  <div className="text-sm text-gray-600">Doküman Grubu</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {documentGroups.reduce((sum, group) => sum + (group.groupAnalysisResults?.length || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600">Grup Analizi</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Cleanup Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Temizleme Seçenekleri</h3>
            
            <div className="space-y-3">
              <Card className="p-4 border-l-4 border-l-yellow-500">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Analiz Sonuçlarını Temizle</h4>
                    <p className="text-sm text-gray-600">
                      {analysisResults.length} analiz sonucu silinecek
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleClearAnalysisResults}
                    disabled={isClearing || analysisResults.length === 0}
                    className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Temizle
                  </Button>
                </div>
              </Card>

              <Card className="p-4 border-l-4 border-l-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Doküman Gruplarını Temizle</h4>
                    <p className="text-sm text-gray-600">
                      {documentGroups.length} doküman grubu silinecek
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleClearDocumentGroups}
                    disabled={isClearing || documentGroups.length === 0}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Temizle
                  </Button>
                </div>
              </Card>

              <Card className="p-4 border-l-4 border-l-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Tüm Verileri Temizle</h4>
                    <p className="text-sm text-gray-600">
                      Tüm analiz sonuçları ve gruplar silinecek
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleClearAllData}
                    disabled={isClearing}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Tümünü Temizle
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          {/* Warning */}
          {storageInfo.percentage > 80 && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-red-700">
                  Depolama alanı kritik seviyede! Verilerinizi temizlemeniz önerilir.
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={onClose}>
              İptal
            </Button>
            <Button onClick={updateStorageInfo} variant="outline">
              <Database className="h-4 w-4 mr-2" />
              Yenile
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
