import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  ArrowLeft, 
  FileText, 
  Brain, 
  Clock, 
  File, 
  Download,
  Copy,
  CheckCircle,
  AlertCircle,
  Info,
  Link,
  Network,
  BarChart3,
  TrendingUp,
  Layers,
  Target,
  Zap,
  Upload,
  Database,
  Loader2
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { toast } from '@/hooks/use-toast'

export function AnalysisResultsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { getAnalysisResult } = useAppStore()
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'sections' | 'commentary'>('overview')
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [isUploadingToSupabase, setIsUploadingToSupabase] = useState(false)

  const documentId = searchParams.get('documentId')

  useEffect(() => {
    if (documentId) {
      const result = getAnalysisResult(documentId)
      if (result) {
        setAnalysisResult(result)
      } else {
        toast({
          title: 'Analiz Sonucu Bulunamadı',
          description: 'Belirtilen analiz sonucu bulunamadı.',
          variant: 'destructive'
        })
        navigate('/')
      }
      setLoading(false)
    } else {
      navigate('/')
    }
  }, [documentId, getAnalysisResult, navigate])

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

  const uploadToSupabase = async () => {
    if (!analysisResult) return

    console.log('🚀 uploadToSupabase called with analysisResult:', analysisResult)
    setIsUploadingToSupabase(true)
    
    try {
      // Get selected project from localStorage
      const storedLogin = localStorage.getItem('supabase-login')
      console.log('📦 Stored login data:', storedLogin)
      
      if (!storedLogin) {
        throw new Error('No Supabase project selected. Please login and select a project first.')
      }

      const loginData = JSON.parse(storedLogin)
      const selectedProject = loginData.selectedProject
      console.log('🎯 Selected project:', selectedProject)
      
      if (!selectedProject) {
        throw new Error('No Supabase project selected. Please select a project first.')
      }

      // Pass the selected project along with the analysis result
      console.log('📤 Calling uploadAnalysisToSupabase with data:', {
        ...analysisResult,
        selectedProject
      })
      
      const result = await window.electronAPI.uploadAnalysisToSupabase({
        ...analysisResult,
        selectedProject
      })
      
      console.log('📥 Upload result:', result)
      
      if (result.success) {
        toast({
          title: 'Supabase Aktarımı Başarılı',
          description: `"${analysisResult.title}" başarıyla ${result.projectName} projesine aktarıldı. ${result.textSectionsCount} metin bölümü ve ${result.commentaryCount} AI yorumu kaydedildi.`,
        })
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Supabase upload failed:', error)
      toast({
        title: 'Aktarım Hatası',
        description: error instanceof Error ? error.message : 'Supabase\'e aktarım sırasında bir hata oluştu.',
        variant: 'destructive'
      })
    } finally {
      setIsUploadingToSupabase(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />
      case 'docx':
        return <FileText className="h-5 w-5 text-blue-500" />
      case 'excel':
        return <FileText className="h-5 w-5 text-green-500" />
      case 'powerpoint':
        return <FileText className="h-5 w-5 text-orange-500" />
      default:
        return <File className="h-5 w-5 text-gray-500" />
    }
  }

  const getFileTypeColor = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'docx':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'excel':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'powerpoint':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCommentaryIcon = (commentaryType: string) => {
    switch (commentaryType) {
      case 'summary':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'key_points':
        return <Target className="h-4 w-4 text-green-500" />
      case 'analysis':
        return <BarChart3 className="h-4 w-4 text-purple-500" />
      case 'insights':
        return <Brain className="h-4 w-4 text-orange-500" />
      case 'relationships':
        return <Network className="h-4 w-4 text-red-500" />
      case 'semantic':
        return <Layers className="h-4 w-4 text-indigo-500" />
      case 'patterns':
        return <TrendingUp className="h-4 w-4 text-pink-500" />
      default:
        return <Zap className="h-4 w-4 text-gray-500" />
    }
  }

  const getCommentaryColor = (commentaryType: string) => {
    switch (commentaryType) {
      case 'summary':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'key_points':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'analysis':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'insights':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'relationships':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'semantic':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      case 'patterns':
        return 'bg-pink-100 text-pink-800 border-pink-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCommentaryTitle = (commentaryType: string) => {
    switch (commentaryType) {
      case 'summary':
        return '📄 Doküman Özeti'
      case 'key_points':
        return '🔑 Anahtar Noktalar'
      case 'analysis':
        return '📊 Detaylı Analiz'
      case 'insights':
        return '💡 Ek Görüşler'
      case 'relationships':
        return '🔗 Metin İlişkileri'
      case 'semantic':
        return '🧠 Semantik Analiz'
      case 'patterns':
        return '📊 İçerik Kalıpları'
      default:
        return '⚡ AI Yorumu'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!analysisResult) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold">Analiz Sonucu Bulunamadı</h2>
        <p className="text-gray-600">Belirtilen analiz sonucu bulunamadı.</p>
        <Button onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Ana Sayfaya Dön
        </Button>
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
            <h1 className="text-2xl font-bold">{analysisResult.title}</h1>
            <p className="text-gray-600">{analysisResult.filename}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={uploadToSupabase}
            disabled={isUploadingToSupabase}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
          >
            {isUploadingToSupabase ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <span>
              {isUploadingToSupabase ? 'Aktarılıyor...' : 'Supabase\'e Aktar'}
            </span>
          </Button>
          
          {/* Debug button - remove in production */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('🔍 Debug Info:');
              console.log('Analysis Result:', analysisResult);
              console.log('LocalStorage supabase-login:', localStorage.getItem('supabase-login'));
              console.log('Window electronAPI:', window.electronAPI);
            }}
            className="text-xs"
          >
            Debug
          </Button>
          <div className="flex items-center space-x-2">
            {getFileTypeIcon(analysisResult.fileType)}
            <Badge className={getFileTypeColor(analysisResult.fileType)}>
              {analysisResult.fileType.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Metin Bölümleri</p>
              <p className="text-2xl font-bold">{analysisResult.textSections?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-sm text-gray-600">AI Yorumları</p>
              <p className="text-2xl font-bold">{analysisResult.aiCommentary?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">İşlem Süresi</p>
              <p className="text-2xl font-bold">{analysisResult.processingTime || 0}ms</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Info className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm text-gray-600">
                {analysisResult.pageCount ? 'Sayfa' : 
                 analysisResult.sheetCount ? 'Sayfa' : 
                 analysisResult.slideCount ? 'Slayt' : 'Bölüm'}
              </p>
              <p className="text-2xl font-bold">
                {analysisResult.pageCount || analysisResult.sheetCount || analysisResult.slideCount || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Genel Bakış', icon: Info },
            { id: 'sections', label: 'Metin Bölümleri', icon: FileText },
            { id: 'commentary', label: 'AI Yorumları', icon: Brain }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Dosya Bilgileri</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Dosya Adı</p>
                  <p className="font-medium">{analysisResult.filename}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Dosya Tipi</p>
                  <Badge className={getFileTypeColor(analysisResult.fileType)}>
                    {analysisResult.fileType.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Analiz Tarihi</p>
                  <p className="font-medium">{new Date(analysisResult.createdAt).toLocaleString('tr-TR')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">İşlem Süresi</p>
                  <p className="font-medium">{analysisResult.processingTime || 0}ms</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Analiz Özeti</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Toplam Metin Bölümü</span>
                  <span className="font-medium">{analysisResult.textSections?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">AI Yorumu</span>
                  <span className="font-medium">{analysisResult.aiCommentary?.length || 0}</span>
                </div>
                {analysisResult.pageCount && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Sayfa Sayısı</span>
                    <span className="font-medium">{analysisResult.pageCount}</span>
                  </div>
                )}
                {analysisResult.sheetCount && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Sayfa Sayısı</span>
                    <span className="font-medium">{analysisResult.sheetCount}</span>
                  </div>
                )}
                {analysisResult.slideCount && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Slayt Sayısı</span>
                    <span className="font-medium">{analysisResult.slideCount}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'sections' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Metin Bölümleri</h3>
              <span className="text-sm text-gray-600">
                {analysisResult.textSections?.length || 0} bölüm
              </span>
            </div>
            <div className="space-y-3">
              {analysisResult.textSections?.map((section: any, index: number) => (
                <Card key={section.id || index} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline">Bölüm {index + 1}</Badge>
                        {section.sectionType && (
                          <Badge variant="secondary">{section.sectionType}</Badge>
                        )}
                        {section.sheetName && (
                          <Badge variant="outline">{section.sheetName}</Badge>
                        )}
                        {section.slideNumber && (
                          <Badge variant="outline">Slayt {section.slideNumber}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{section.content}</p>
                      {section.metadata && (
                        <div className="text-xs text-gray-500">
                          {section.metadata.characterCount && (
                            <span>{section.metadata.characterCount} karakter</span>
                          )}
                          {section.metadata.wordCount && (
                            <span className="ml-2">{section.metadata.wordCount} kelime</span>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(section.content, `Bölüm ${index + 1}`)}
                    >
                      {copiedText === `Bölüm ${index + 1}` ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'commentary' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Gelişmiş AI Yorumları</h3>
              <span className="text-sm text-gray-600">
                {analysisResult.aiCommentary?.length || 0} yorum
              </span>
            </div>
            
            {/* AI Yorumları Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {analysisResult.aiCommentary?.map((commentary: any, index: number) => (
                <Card key={commentary.id || index} className="p-6 border-l-4 border-l-blue-500">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getCommentaryIcon(commentary.commentaryType)}
                        <div>
                          <h4 className="font-semibold text-lg">
                            {getCommentaryTitle(commentary.commentaryType)}
                          </h4>
                          <Badge className={getCommentaryColor(commentary.commentaryType)}>
                            {commentary.commentaryType}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(commentary.content, `Yorum ${index + 1}`)}
                        className="flex items-center space-x-1"
                      >
                        {copiedText === `Yorum ${index + 1}` ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        <span className="text-xs">Kopyala</span>
                      </Button>
                    </div>

                    {/* Content */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {commentary.content}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-4">
                        {commentary.confidenceScore && (
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Güven: {(commentary.confidenceScore * 100).toFixed(0)}%</span>
                          </div>
                        )}
                        {commentary.language && (
                          <div className="flex items-center space-x-1">
                            <span>🌐 {commentary.language}</span>
                          </div>
                        )}
                        {commentary.processingTimeMs && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{commentary.processingTimeMs}ms</span>
                          </div>
                        )}
                      </div>
                      {commentary.aiModel && (
                        <div className="text-xs text-gray-400">
                          {commentary.aiModel}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Analiz Özeti */}
            {analysisResult.aiCommentary?.length > 0 && (
              <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <div className="flex items-center space-x-3 mb-4">
                  <Brain className="h-6 w-6 text-blue-600" />
                  <h4 className="text-lg font-semibold text-blue-900">Analiz Özeti</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {analysisResult.aiCommentary.filter((c: any) => c.commentaryType === 'summary').length}
                    </div>
                    <div className="text-sm text-blue-700">Özet</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {analysisResult.aiCommentary.filter((c: any) => c.commentaryType === 'relationships').length}
                    </div>
                    <div className="text-sm text-green-700">İlişki Analizi</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {analysisResult.aiCommentary.filter((c: any) => c.commentaryType === 'semantic').length}
                    </div>
                    <div className="text-sm text-purple-700">Semantik Analiz</div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
