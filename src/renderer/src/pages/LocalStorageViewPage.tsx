import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  HardDrive, 
  FileText, 
  Brain, 
  Clock, 
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  Copy,
  CheckCircle,
  AlertCircle,
  Info,
  Database,
  Loader2,
  Users,
  Folder,
  File,
  Calendar,
  BarChart3,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { localStorageService, AIData } from '@/services/LocalStorageService'
import { useAppStore, AnalysisResult, DocumentGroup } from '@/store/appStore'
import { toast } from '@/hooks/use-toast'

export function LocalStorageViewPage() {
  const navigate = useNavigate()
  const { 
    analysisResults, 
    documentGroups, 
    clearAnalysisResults, 
    clearDocumentGroups 
  } = useAppStore()
  
  // State for different data types
  const [aiData, setAiData] = useState<AIData[]>([])
  const [filteredData, setFilteredData] = useState<AIData[]>([])
  const [groupAnalysisData, setGroupAnalysisData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedData, setSelectedData] = useState<AIData | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  
  // Dynamic stats calculation
  const dynamicStats = useMemo(() => {
    const totalDocuments = analysisResults.length
    const totalGroups = documentGroups.length
    const totalAIData = aiData.length
    const totalGroupAnalysis = groupAnalysisData.length
    const totalItems = totalDocuments + totalGroups + totalAIData + totalGroupAnalysis
    
    // Calculate storage size (approximate)
    const documentsSize = analysisResults.reduce((size, doc) => {
      return size + JSON.stringify(doc).length
    }, 0)
    
    const groupsSize = documentGroups.reduce((size, group) => {
      return size + JSON.stringify(group).length
    }, 0)
    
    const aiDataSize = aiData.reduce((size, item) => {
      return size + JSON.stringify(item).length
    }, 0)
    
    const groupAnalysisSize = groupAnalysisData.reduce((size, item) => {
      return size + JSON.stringify(item).length
    }, 0)
    
    const totalSizeKB = Math.round((documentsSize + groupsSize + aiDataSize + groupAnalysisSize) / 1024)
    
    // Get last updated time
    const allTimestamps = [
      ...analysisResults.map(doc => new Date(doc.createdAt).getTime()),
      ...documentGroups.map(group => new Date(group.createdAt).getTime()),
      ...aiData.map(item => new Date(item.metadata.timestamp).getTime()),
      ...groupAnalysisData.map(item => new Date(item.savedAt).getTime())
    ]
    
    const lastUpdated = allTimestamps.length > 0 
      ? new Date(Math.max(...allTimestamps)).toISOString()
      : null
    
    return {
      totalItems,
      totalSize: totalSizeKB,
      lastUpdated,
      totalDocuments,
      totalGroups,
      totalAIData,
      totalGroupAnalysis,
      itemsByType: {
        documents: totalDocuments,
        groups: totalGroups,
        'ai-data': totalAIData,
        'group-analysis': totalGroupAnalysis
      }
    }
  }, [analysisResults, documentGroups, aiData, groupAnalysisData])
  
  // New state for organized view
  const [activeTab, setActiveTab] = useState<'documents' | 'groups' | 'ai-data' | 'group-analysis'>('documents')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Computed values for organized data
  const sortedDocuments = useMemo(() => {
    const docs = analysisResults.filter(doc => 
      !searchTerm || 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
    )
    
    return docs.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'name':
          comparison = a.title.localeCompare(b.title)
          break
        case 'size':
          comparison = (a.textSections?.length || 0) - (b.textSections?.length || 0)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [analysisResults, searchTerm, sortBy, sortOrder])

  const sortedGroups = useMemo(() => {
    const groups = documentGroups.filter(group => 
      !searchTerm || 
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    
    return groups.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'size':
          comparison = a.documents.length - b.documents.length
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [documentGroups, searchTerm, sortBy, sortOrder])

  useEffect(() => {
    loadLocalStorageData()
  }, [])

  useEffect(() => {
    filterData()
  }, [aiData, searchTerm, filterType])

  const loadLocalStorageData = () => {
    setLoading(true)
    try {
      const data = localStorageService.getAllData()
      const storageStats = localStorageService.getStats()
      
      setAiData(data)
      setStats(storageStats)
      console.log('Loaded local storage data:', data.length, 'items')
      
      // Load group analysis data from localStorage
      loadGroupAnalysisData()
    } catch (error) {
      console.error('Failed to load local storage data:', error)
      toast({
        title: 'Yükleme Hatası',
        description: 'Local storage verileri yüklenemedi.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadGroupAnalysisData = () => {
    try {
      const groupAnalysisData: any[] = []
      
      // Scan localStorage for group analysis data
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('group-analysis-')) {
          try {
            const data = localStorage.getItem(key)
            if (data) {
              const parsedData = JSON.parse(data)
              if (parsedData.version === '2.0' && parsedData.analysisResults) {
                groupAnalysisData.push({
                  id: key,
                  groupId: parsedData.groupId,
                  groupName: parsedData.groupName,
                  savedAt: parsedData.savedAt,
                  version: parsedData.version,
                  totalDocuments: parsedData.totalDocuments || 0,
                  totalTextSections: parsedData.totalTextSections || 0,
                  totalAICommentary: parsedData.totalAICommentary || 0,
                  analysisResults: parsedData.analysisResults || [],
                  documents: parsedData.documents || []
                })
              }
            }
          } catch (parseError) {
            console.warn('Error parsing group analysis data:', key, parseError)
          }
        }
      }
      
      setGroupAnalysisData(groupAnalysisData)
      console.log('Loaded group analysis data:', groupAnalysisData.length, 'items')
    } catch (error) {
      console.error('Error loading group analysis data:', error)
    }
  }

  const filterData = () => {
    let filtered = aiData

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item => {
        const searchableText = JSON.stringify(item).toLowerCase()
        return searchableText.includes(searchTerm.toLowerCase())
      })
    }

    setFilteredData(filtered)
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(label)
      setTimeout(() => setCopiedText(null), 2000)
      toast({
        title: 'Kopyalandı',
        description: `${label} panoya kopyalandı.`,
      })
    } catch (error) {
      toast({
        title: 'Kopyalama Hatası',
        description: 'Metin kopyalanamadı.',
        variant: 'destructive'
      })
    }
  }

  const deleteDataItem = (id: string) => {
    try {
      const success = localStorageService.deleteData(id)
      if (success) {
        toast({
          title: 'Silindi',
          description: 'Veri başarıyla silindi.',
        })
        loadLocalStorageData() // Reload data
      } else {
        throw new Error('Delete failed')
      }
    } catch (error) {
      toast({
        title: 'Silme Hatası',
        description: 'Veri silinemedi.',
        variant: 'destructive'
      })
    }
  }

  const deleteGroupAnalysis = (id: string) => {
    if (window.confirm('Bu grup analizini silmek istediğinizden emin misiniz?')) {
      try {
        localStorage.removeItem(id)
        setGroupAnalysisData(prev => prev.filter(item => item.id !== id))
        toast({
          title: 'Grup Analizi Silindi',
          description: 'Seçilen grup analizi başarıyla silindi.',
        })
      } catch (error) {
        toast({
          title: 'Silme Hatası',
          description: 'Grup analizi silinirken bir hata oluştu.',
          variant: 'destructive'
        })
      }
    }
  }

  const exportAllData = () => {
    try {
      const exportData = localStorageService.exportData()
      if (exportData) {
        const dataBlob = new Blob([exportData], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        
        const link = document.createElement('a')
        link.href = url
        link.download = `local-ai-data-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
        toast({
          title: 'Dışa Aktarıldı',
          description: 'Tüm veriler JSON dosyası olarak indirildi.',
        })
      }
    } catch (error) {
      toast({
        title: 'Dışa Aktarma Hatası',
        description: 'Veriler dışa aktarılamadı.',
        variant: 'destructive'
      })
    }
  }

  const clearAllData = () => {
    if (window.confirm('Tüm local storage verilerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm dokümanlar, gruplar, AI verileri ve grup analizleri silinecektir.')) {
      try {
        // Clear AI data from localStorage
        const aiSuccess = localStorageService.clearAllData()
        
        // Clear group analysis data from localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('group-analysis-')) {
            localStorage.removeItem(key)
          }
        }
        
        // Clear app store data (documents and groups)
        clearAnalysisResults()
        clearDocumentGroups()
        
        // Clear local state
        setAiData([])
        setFilteredData([])
        setGroupAnalysisData([])
        
        if (aiSuccess) {
          toast({
            title: 'Temizlendi',
            description: 'Tüm veriler (dokümanlar, gruplar, AI verileri ve grup analizleri) başarıyla silindi.',
          })
          loadLocalStorageData() // Reload data
        } else {
          throw new Error('Clear failed')
        }
      } catch (error) {
        toast({
          title: 'Temizleme Hatası',
          description: 'Veriler temizlenemedi.',
          variant: 'destructive'
        })
      }
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'embedding':
        return <Brain className="h-4 w-4 text-purple-500" />
      case 'analysis':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'conversion':
        return <Database className="h-4 w-4 text-green-500" />
      case 'extraction':
        return <Search className="h-4 w-4 text-orange-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'embedding':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'analysis':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'conversion':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'extraction':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'embedding':
        return 'Embedding'
      case 'analysis':
        return 'Analiz'
      case 'conversion':
        return 'Dönüştürme'
      case 'extraction':
        return 'Çıkarım'
      default:
        return 'Diğer'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR')
  }

  const toggleGroupExpansion = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />
      case 'docx':
      case 'doc':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'xlsx':
      case 'xls':
        return <BarChart3 className="h-4 w-4 text-green-500" />
      case 'pptx':
      case 'ppt':
        return <FileText className="h-4 w-4 text-orange-500" />
      default:
        return <File className="h-4 w-4 text-gray-500" />
    }
  }

  const getFileTypeColor = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'docx':
      case 'doc':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'xlsx':
      case 'xls':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pptx':
      case 'ppt':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Geri</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center space-x-2">
              <HardDrive className="h-6 w-6 text-blue-500" />
              <span>Local Storage Verileri</span>
            </h1>
            <p className="text-gray-600">Cihazınızda saklanan AI verileri</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={exportAllData}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Dışa Aktar</span>
          </Button>
          <Button
            onClick={clearAllData}
            variant="outline"
            className="flex items-center space-x-2 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            <span>Temizle</span>
          </Button>
        </div>
      </div>

      {/* Dynamic Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Toplam Veri</p>
              <p className="text-2xl font-bold">{dynamicStats.totalItems}</p>
              <p className="text-xs text-gray-500">
                {dynamicStats.totalDocuments} doküman, {dynamicStats.totalGroups} grup, {dynamicStats.totalAIData} AI verisi
              </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Depolama Boyutu</p>
              <p className="text-2xl font-bold">{dynamicStats.totalSize} KB</p>
              <p className="text-xs text-gray-500">
                {dynamicStats.totalSize > 1024 ? `${(dynamicStats.totalSize / 1024).toFixed(1)} MB` : 'Yaklaşık boyut'}
              </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Son Güncelleme</p>
                <p className="text-sm font-medium">
                {dynamicStats.lastUpdated ? formatDate(dynamicStats.lastUpdated) : 'Veri yok'}
              </p>
              <p className="text-xs text-gray-500">
                {dynamicStats.lastUpdated ? 'En son eklenen veri' : 'Henüz veri eklenmemiş'}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-orange-500" />
              <div>
              <p className="text-sm text-gray-600">Aktif Tab</p>
              <p className="text-2xl font-bold">
                {activeTab === 'documents' ? sortedDocuments.length : 
                 activeTab === 'groups' ? sortedGroups.length : 
                 activeTab === 'ai-data' ? filteredData.length :
                 groupAnalysisData.length}
              </p>
              <p className="text-xs text-gray-500">
                {activeTab === 'documents' ? 'Dokümanlar' : 
                 activeTab === 'groups' ? 'Gruplar' : 
                 activeTab === 'ai-data' ? 'AI Verileri' :
                 'Grup Analizleri'}
              </p>
              </div>
            </div>
          </Card>
        </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'documents'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <File className="h-4 w-4" />
            <span>Dokümanlar ({analysisResults.length})</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'groups'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Folder className="h-4 w-4" />
            <span>Gruplar ({documentGroups.length})</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('ai-data')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'ai-data'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>AI Verileri ({aiData.length})</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('group-analysis')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'group-analysis'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Grup Analizleri ({groupAnalysisData.length})</span>
          </div>
        </button>
      </div>

      {/* Search and Filter */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Verilerde ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'size')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date">Tarihe Göre</option>
              <option value="name">İsme Göre</option>
              <option value="size">Boyuta Göre</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
            {activeTab === 'ai-data' && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tüm Türler</option>
              <option value="embedding">Embedding</option>
              <option value="analysis">Analiz</option>
              <option value="conversion">Dönüştürme</option>
              <option value="extraction">Çıkarım</option>
            </select>
            )}
          </div>
        </div>
      </Card>

      {/* Content based on active tab */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {sortedDocuments.length === 0 ? (
            <Card className="p-8 text-center">
              <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Doküman Bulunamadı</h3>
              <p className="text-gray-500">Henüz analiz edilmiş doküman bulunmuyor.</p>
            </Card>
          ) : (
            sortedDocuments.map((doc) => (
              <Card key={doc.documentId} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getFileTypeIcon(doc.fileType)}
                      <Badge className={getFileTypeColor(doc.fileType)}>
                        {doc.fileType.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {formatDate(doc.createdAt)}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-2">{doc.title}</h3>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><strong>Dosya:</strong> {doc.filename}</div>
                      <div><strong>Sayfa/Sayfa:</strong> {doc.pageCount || doc.sheetCount || doc.slideCount || 'N/A'}</div>
                      <div><strong>İşlem Süresi:</strong> {doc.processingTime ? `${doc.processingTime}ms` : 'N/A'}</div>
                    </div>

                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-700">
                        <div><strong>Metin Bölümleri:</strong> {doc.textSections?.length || 0}</div>
                        <div><strong>AI Yorumları:</strong> {doc.aiCommentary?.length || 0}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(JSON.stringify(doc, null, 2), doc.documentId)}
                      className="flex items-center space-x-1"
                    >
                      {copiedText === doc.documentId ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="space-y-4">
          {sortedGroups.length === 0 ? (
            <Card className="p-8 text-center">
              <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Grup Bulunamadı</h3>
              <p className="text-gray-500">Henüz oluşturulmuş doküman grubu bulunmuyor.</p>
            </Card>
          ) : (
            sortedGroups.map((group) => (
              <Card key={group.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Folder className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-gray-500">
                        {formatDate(group.createdAt)}
                      </span>
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                        {group.documents.length} Doküman
                      </Badge>
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-2">{group.name}</h3>
                    {group.description && (
                      <p className="text-gray-600 mb-3">{group.description}</p>
                    )}

                    <div className="flex items-center space-x-2 mb-3">
                      <button
                        onClick={() => toggleGroupExpansion(group.id)}
                        className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        {expandedGroups.has(group.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span>Dokümanları Göster</span>
                      </button>
                    </div>

                    {expandedGroups.has(group.id) && (
                      <div className="ml-4 space-y-2 border-l-2 border-gray-200 pl-4">
                        {group.documents.map((doc) => (
                          <div key={doc.documentId} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                            {getFileTypeIcon(doc.fileType)}
                            <span className="text-sm font-medium">{doc.title}</span>
                            <Badge className={getFileTypeColor(doc.fileType)}>
                              {doc.fileType.toUpperCase()}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {group.groupAnalysisResults && group.groupAnalysisResults.length > 0 && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg">
                        <div className="text-sm text-green-700">
                          <div><strong>Grup Analizleri:</strong> {group.groupAnalysisResults.length}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(JSON.stringify(group, null, 2), group.id)}
                      className="flex items-center space-x-1"
                    >
                      {copiedText === group.id ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'ai-data' && (
        <div className="space-y-4">
      {filteredData.length === 0 ? (
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {aiData.length === 0 ? 'AI Verisi Bulunamadı' : 'Filtre Sonucu Bulunamadı'}
          </h3>
          <p className="text-gray-500">
            {aiData.length === 0 
                  ? 'Local storage\'da henüz AI verisi bulunmuyor.'
              : 'Arama kriterlerinize uygun veri bulunamadı.'
            }
          </p>
        </Card>
      ) : (
            filteredData.map((item) => (
            <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getTypeIcon(item.type)}
                    <Badge className={getTypeColor(item.type)}>
                      {getTypeLabel(item.type)}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {formatDate(item.metadata.timestamp)}
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-2">
                    {item.content.title || item.content.filename || item.id}
                  </h3>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    {item.content.filename && (
                      <div><strong>Dosya:</strong> {item.content.filename}</div>
                    )}
                    {item.content.fileType && (
                      <div><strong>Tür:</strong> {item.content.fileType.toUpperCase()}</div>
                    )}
                    {item.metadata.model && (
                      <div><strong>Model:</strong> {item.metadata.model}</div>
                    )}
                    {item.filePath && (
                      <div><strong>Yol:</strong> {item.filePath}</div>
                    )}
                  </div>

                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-700">
                      {item.type === 'analysis' && item.content.textSections && (
                        <div>
                          <strong>Metin Bölümleri:</strong> {item.content.textSections.length}
                          {item.content.aiCommentary && (
                            <span className="ml-4">
                              <strong>AI Yorumları:</strong> {item.content.aiCommentary.length}
                            </span>
                          )}
                        </div>
                      )}
                      {item.type === 'embedding' && (
                        <div>
                          <strong>Embedding Boyutu:</strong> {Array.isArray(item.content) ? item.content.length : 'N/A'}
                        </div>
                      )}
                      {item.type === 'conversion' && (
                        <div>
                          <strong>Dönüştürme:</strong> {item.content.sourceFormat} → {item.content.targetFormat}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedData(item)}
                    className="flex items-center space-x-1"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Görüntüle</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(JSON.stringify(item, null, 2), item.id)}
                    className="flex items-center space-x-1"
                  >
                    {copiedText === item.id ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteDataItem(item.id)}
                    className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'group-analysis' && (
        <div className="space-y-4">
          {groupAnalysisData.length === 0 ? (
            <Card className="p-8 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Grup Analizi Bulunamadı</h3>
              <p className="text-gray-500">Henüz kaydedilmiş grup analizi bulunmuyor.</p>
            </Card>
          ) : (
            groupAnalysisData.map((analysis) => (
              <Card key={analysis.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <BarChart3 className="h-4 w-4 text-purple-500" />
                      <span className="text-sm text-gray-500">
                        {formatDate(analysis.savedAt)}
                      </span>
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                        v{analysis.version}
                      </Badge>
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-2">{analysis.groupName}</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm text-blue-600">Dokümanlar</div>
                        <div className="text-lg font-bold text-blue-800">{analysis.totalDocuments}</div>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="text-sm text-green-600">Metin Bölümleri</div>
                        <div className="text-lg font-bold text-green-800">{analysis.totalTextSections}</div>
                      </div>
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <div className="text-sm text-orange-600">AI Yorumları</div>
                        <div className="text-lg font-bold text-orange-800">{analysis.totalAICommentary}</div>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <div className="text-sm text-purple-600">Analiz Sonuçları</div>
                        <div className="text-lg font-bold text-purple-800">{analysis.analysisResults.length}</div>
                      </div>
                    </div>

                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-700">
                        <div><strong>Grup ID:</strong> {analysis.groupId}</div>
                        <div><strong>Kaydedilme Tarihi:</strong> {formatDate(analysis.savedAt)}</div>
                        <div><strong>Veri Boyutu:</strong> {Math.round(JSON.stringify(analysis).length / 1024)} KB</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(JSON.stringify(analysis, null, 2), analysis.id)}
                      className="flex items-center space-x-1"
                    >
                      {copiedText === analysis.id ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteGroupAnalysis(analysis.id)}
                      className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full max-w-4xl mx-4 bg-white rounded-2xl shadow-2xl border">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-3">
                {getTypeIcon(selectedData.type)}
                <div>
                  <h2 className="text-xl font-bold">{selectedData.content.title || selectedData.id}</h2>
                  <p className="text-sm text-gray-600">{formatDate(selectedData.metadata.timestamp)}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedData(null)}
              >
                Kapat
              </Button>
            </div>
            
            <div className="p-6 max-h-96 overflow-y-auto">
              <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(selectedData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
