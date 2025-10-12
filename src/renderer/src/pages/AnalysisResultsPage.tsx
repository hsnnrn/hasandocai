import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  FileText, 
  Brain, 
  Clock, 
  File, 
  Copy,
  CheckCircle,
  AlertCircle,
  Info,
  Network,
  BarChart3,
  TrendingUp,
  Layers,
  Target,
  Zap,
  Upload,
  Loader2,
  HardDrive
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { toast } from '@/hooks/use-toast'
import { localStorageService, AIData } from '@/services/LocalStorageService'

export function AnalysisResultsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { getAnalysisResult } = useAppStore()
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'sections' | 'commentary'>('overview')
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [isUploadingToSupabase, setIsUploadingToSupabase] = useState(false)
  const [isSavingToLocalStorage, setIsSavingToLocalStorage] = useState(false)
  const [showAnonKeyDialog, setShowAnonKeyDialog] = useState(false)
  const [anonKeyInput, setAnonKeyInput] = useState('')
  const [selectedProjectForUpload, setSelectedProjectForUpload] = useState<any>(null)
  const [showSqlSetupDialog, setShowSqlSetupDialog] = useState(false)
  const [sqlToSetup, setSqlToSetup] = useState('')
  const [dashboardUrl, setDashboardUrl] = useState('')

  const documentId = searchParams.get('documentId')

  // Otomatik kaydetme fonksiyonu
  const saveAnalysisToLocalStorage = useCallback(async (result: any) => {
    try {
      const aiData: AIData = {
        id: `analysis_${result.documentId || Date.now()}`,
        type: 'analysis',
        content: result,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'document-analysis',
          model: 'BGE-M3'
        },
        filePath: result.filePath
      }

      const saveResult = await localStorageService.saveData(aiData)
      
      if (saveResult.success) {
        console.log('✅ Analiz otomatik kaydedildi:', result.filename)
      }
    } catch (error) {
      console.error('❌ Otomatik kaydetme hatası:', error)
    }
  }, [])

  useEffect(() => {
    if (documentId) {
      const result = getAnalysisResult(documentId)
      if (result) {
        setAnalysisResult(result)
        
        // ✅ OTOMATİK KAYDET - Kullanıcı butona basmadan kaydet
        saveAnalysisToLocalStorage(result)
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

    // ✅ Local storage HER ZAMAN AKTİF - artık enable/disable yok
    console.log('💾 Local storage her zaman aktif - veri kaybı olmaz!')
  }, [documentId, getAnalysisResult, navigate, saveAnalysisToLocalStorage])

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
        throw new Error('Lütfen önce Supabase projesi seçin. Settings > Supabase bölümünden giriş yapabilirsiniz.')
      }

      const loginData = JSON.parse(storedLogin)
      const selectedProject = loginData.selectedProject
      console.log('🎯 Selected project:', selectedProject)
      
      if (!selectedProject) {
        throw new Error('Lütfen bir Supabase projesi seçin. Settings > Supabase bölümünden proje seçebilirsiniz.')
      }

      // Check if we have anon key and project URL
      let anonKey = loginData.anonKey
      let projectUrl = selectedProject.project_api_url || `https://${selectedProject.id}.supabase.co`

      console.log('🔍 Debug - anonKey from localStorage:', anonKey ? `${anonKey.substring(0, 30)}...` : 'MISSING')
      console.log('🔍 Debug - anonKey length:', anonKey ? anonKey.length : 0)
      console.log('🔍 Debug - anonKey type:', typeof anonKey)
      console.log('🔍🔍🔍 RENDERER: FULL ANON KEY (first 100 chars):', anonKey ? anonKey.substring(0, 100) : 'MISSING')
      console.log('🔍🔍🔍 RENDERER: FULL ANON KEY (last 50 chars):', anonKey ? anonKey.substring(anonKey.length - 50) : 'MISSING')
      console.log('🔍🔍🔍 RENDERER: JWT Parts:', anonKey ? anonKey.split('.').map((part: string, i: number) => `Part ${i+1}: ${part.substring(0, 20)}...`) : 'NULL')

      // If missing, ask user for credentials via dialog
      if (!anonKey || anonKey.trim().length === 0) {
        console.log('⚠️ Anon key missing or empty, opening dialog')
        setSelectedProjectForUpload(selectedProject)
        setShowAnonKeyDialog(true)
        setIsUploadingToSupabase(false)
        
        // Dialog içinde "API Keys Sayfasını Aç" butonu var, otomatik açmaya gerek yok
        console.log('📋 Anon key dialog opened - user will manually open API Keys page')
        
        return
      }

      // Validate anon key format before sending
      const jwtParts = anonKey.split('.')
      if (jwtParts.length !== 3) {
        console.error('❌ Invalid anon key format:', jwtParts.length, 'parts found')
        toast({
          title: 'Geçersiz Anon Key',
          description: `Anon Key formatı hatalı (${jwtParts.length} parça). Lütfen Settings'den anon key'i tekrar girin.`,
          variant: 'destructive'
        })
        setIsUploadingToSupabase(false)
        return
      }

      console.log('✅ Anon key validated, sending to main process')

      // Verify project URL
      if (!projectUrl || projectUrl === 'undefined') {
        projectUrl = `https://${selectedProject.id}.supabase.co`
        
        // Save the corrected URL
        selectedProject.project_api_url = projectUrl
        loginData.selectedProject = selectedProject
        localStorage.setItem('supabase-login', JSON.stringify(loginData))
        console.log('✅ Project URL corrected and saved:', projectUrl)
      }

      console.log('📤 Calling supabase:uploadAnalysis IPC with data:', {
        documentId: analysisResult.documentId,
        title: analysisResult.title,
        projectName: selectedProject.name,
        projectUrl,
        hasAnonKey: !!anonKey,
        anonKeyPreview: anonKey ? `${anonKey.substring(0, 30)}...` : 'MISSING',
        anonKeyLength: anonKey ? anonKey.length : 0
      })
      
      const trimmedKey = anonKey.trim();
      console.log('🔑🔑🔑 RENDERER: Trimmed key parts:', trimmedKey.split('.').length);
      console.log('🔑🔑🔑 RENDERER: Trimmed key length:', trimmedKey.length);
      console.log('🔑🔑🔑 RENDERER: Trimmed key first 100:', trimmedKey.substring(0, 100));
      
      const dataToSend = {
        ...analysisResult,
        selectedProject,
        anonKey: trimmedKey,
        projectUrl
      };
      
      console.log('🔑🔑🔑 RENDERER: Data to send - anonKey length:', dataToSend.anonKey.length);
      console.log('🔑🔑🔑 RENDERER: Data to send - anonKey parts:', dataToSend.anonKey.split('.').length);
      
      // Call the real IPC handler
      const result = await (window.electronAPI as any).uploadAnalysisToSupabase(dataToSend)
      
      console.log('📥 Upload result:', result)
      
      if (result.success) {
        toast({
          title: '✅ Supabase Aktarımı Başarılı',
          description: `"${analysisResult.title}" başarıyla ${result.projectName} projesine aktarıldı. ${result.textSectionsCount} metin bölümü ve ${result.commentaryCount} AI yorumu kaydedildi.`,
        })
      } else if (result.needsManualSetup && result.createTablesSQL) {
        // Special case: Tables don't exist, show SQL setup dialog
        console.log('📋 Opening SQL setup dialog');
        
        setSqlToSetup(result.createTablesSQL);
        setDashboardUrl(result.dashboardUrl);
        setShowSqlSetupDialog(true);
        
        // Also show in console for easy copying
        console.log('='.repeat(80));
        console.log('📋 SUPABASE SETUP SQL:');
        console.log('='.repeat(80));
        console.log(result.createTablesSQL);
        console.log('='.repeat(80));
        console.log(`🔗 Dashboard URL: ${result.dashboardUrl}`);
        console.log('='.repeat(80));
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('❌ Supabase upload failed:', error)
      toast({
        title: 'Aktarım Hatası',
        description: error instanceof Error ? error.message : 'Supabase\'e aktarım sırasında bir hata oluştu.',
        variant: 'destructive'
      })
    } finally {
      setIsUploadingToSupabase(false)
    }
  }

  const handleAnonKeySubmit = async () => {
    const trimmedKey = anonKeyInput.trim()
    
    if (!trimmedKey || trimmedKey.length === 0) {
      toast({
        title: 'Hata',
        description: 'Lütfen geçerli bir Anon Key girin.',
        variant: 'destructive'
      })
      return
    }

    // Validate JWT format (should have 3 parts separated by dots)
    const jwtParts = trimmedKey.split('.')
    if (jwtParts.length !== 3) {
      toast({
        title: 'Geçersiz Anon Key',
        description: `Anon Key formatı hatalı. JWT 3 parçadan oluşmalı (örn: eyJhbG...xyz.abc). Girdiğiniz değer ${jwtParts.length} parça içeriyor. Lütfen key'in tamamını kopyaladığınızdan emin olun.`,
        variant: 'destructive'
      })
      return
    }

    // Validate that it starts with "eyJ" (common JWT header)
    if (!trimmedKey.startsWith('eyJ')) {
      toast({
        title: 'Geçersiz Anon Key',
        description: 'Anon Key genellikle "eyJ" ile başlar. Lütfen doğru key\'i kopyaladığınızdan emin olun.',
        variant: 'destructive'
      })
      return
    }

    try {
      // Save anon key to localStorage
      const storedLogin = localStorage.getItem('supabase-login')
      if (storedLogin) {
        const loginData = JSON.parse(storedLogin)
        loginData.anonKey = trimmedKey
        localStorage.setItem('supabase-login', JSON.stringify(loginData))
        console.log('✅ Anon key saved to localStorage')
        console.log('🔑 Key preview:', trimmedKey.substring(0, 30) + '...')
      }

      // Close dialog and retry upload
      setShowAnonKeyDialog(false)
      setAnonKeyInput('')
      
      toast({
        title: '✅ Anon Key Kaydedildi',
        description: 'Şimdi tekrar "Supabase\'e Aktar" butonuna tıklayın.',
      })
    } catch (error) {
      console.error('Failed to save anon key:', error)
      toast({
        title: 'Kaydetme Hatası',
        description: 'Anon key kaydedilemedi.',
        variant: 'destructive'
      })
    }
  }

  const saveToLocalStorage = async () => {
    if (!analysisResult) return

    setIsSavingToLocalStorage(true)
    
    try {
      // ✅ SADE VE BASİT: Tüm veriyi olduğu gibi kaydet
      const aiData: AIData = {
        id: `analysis_${analysisResult.documentId || Date.now()}`,
        type: 'analysis',
        content: analysisResult, // TÜM VERİ OLDUĞU GİBİ KAYDEDİLİYOR
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'document-analysis'
        },
        filePath: analysisResult.filePath
      }

      // Direkt persistent storage'a kaydet
      const saveResult = await localStorageService.saveData(aiData)
      
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Kaydetme başarısız')
      }

      toast({
        title: '💾 Kaydedildi',
        description: 'Veri güvenle diske kaydedildi'
      })
    } catch (error) {
      console.error('❌ Kaydetme hatası:', error)
      toast({
        title: 'Kaydetme Hatası',
        description: error instanceof Error ? error.message : 'Bilinmeyen hata',
        variant: 'destructive'
      })
    } finally {
      setIsSavingToLocalStorage(false)
    }
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
            onClick={saveToLocalStorage}
            disabled={isSavingToLocalStorage}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSavingToLocalStorage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <HardDrive className="h-4 w-4" />
            )}
            <span>
              {isSavingToLocalStorage ? 'Kaydediliyor...' : 'Diske Kaydet'}
            </span>
          </Button>
          
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

      {/* SQL Setup Dialog */}
      {showSqlSetupDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl p-6 bg-white max-h-[90vh] overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    📋 Supabase Tabloları Kurulmalı
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Supabase projenizde <strong>documents</strong> tablosu bulunamadı. 
                    Verileri kaydedebilmek için aşağıdaki SQL'i çalıştırmanız gerekiyor.
                  </p>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-blue-900 mb-2">✨ Hızlı Kurulum Adımları</h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                          <li>
                            Aşağıdaki <strong>"SQL'i Kopyala"</strong> butonuna tıklayın
                          </li>
                          <li>
                            <strong>"Supabase SQL Editor'ı Aç"</strong> butonuna tıklayın
                          </li>
                          <li>
                            Açılan sayfada <strong>"New query"</strong> butonuna tıklayın
                          </li>
                          <li>
                            SQL editörüne <strong>Ctrl+V</strong> ile yapıştırın
                          </li>
                          <li>
                            <strong>"RUN"</strong> butonuna tıklayın (veya Ctrl+Enter)
                          </li>
                          <li>
                            Bu dialog'u kapatıp <strong>"Supabase'e Aktar"</strong> butonuna tekrar tıklayın
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        SQL Kodu (Otomatik Oluşturuldu)
                      </label>
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(sqlToSetup);
                            toast({
                              title: '✅ SQL Kopyalandı',
                              description: 'SQL panoya kopyalandı. Şimdi Supabase SQL Editor\'ı açın.',
                            });
                          } catch (error) {
                            toast({
                              title: 'Kopyalama Hatası',
                              description: 'SQL kopyalanamadı.',
                              variant: 'destructive'
                            });
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        SQL'i Kopyala
                      </Button>
                    </div>
                    
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
                      <pre className="text-xs font-mono whitespace-pre">{sqlToSetup}</pre>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <Info className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-yellow-800">
                          <strong>Not:</strong> Bu SQL, RLS (Row Level Security) politikalarını devre dışı bırakır. 
                          Üretim ortamında güvenlik politikaları eklemeyi unutmayın!
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSqlSetupDialog(false);
                    setSqlToSetup('');
                    setDashboardUrl('');
                  }}
                >
                  Kapat
                </Button>
                <Button
                  onClick={() => {
                    // Open Supabase SQL Editor
                    window.open(dashboardUrl, '_blank');
                    toast({
                      title: '🌐 SQL Editor Açıldı',
                      description: 'SQL\'i kopyalayıp yeni sekmede çalıştırın.',
                    });
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <ArrowLeft className="h-4 w-4 mr-2 transform rotate-180" />
                  Supabase SQL Editor'ı Aç
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Anon Key Dialog */}
      {showAnonKeyDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl p-6 bg-white">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Supabase Anon Key Gerekli
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Verileri Supabase'e yüklemek için projenizin <strong>Anon Key</strong>'ine ihtiyacımız var.
                    {selectedProjectForUpload && (
                      <span className="block mt-1">
                        Proje: <strong>{selectedProjectForUpload.name}</strong>
                      </span>
                    )}
                  </p>
                  

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-blue-900">📝 Anon Key'i Kopyalayın</h4>
                      <Button
                        size="sm"
                        onClick={() => {
                          const apiUrl = selectedProjectForUpload 
                            ? `https://supabase.com/dashboard/project/${selectedProjectForUpload.id}/settings/api`
                            : 'https://supabase.com/dashboard';
                          window.open(apiUrl, '_blank');
                          toast({
                            title: '🌐 API Keys Sayfası Açıldı',
                            description: 'Anon key\'i kopyalayın ve buraya yapıştırın.',
                          });
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs"
                      >
                        <ArrowLeft className="h-3 w-3 mr-1 transform rotate-180" />
                        API Keys Sayfasını Aç
                      </Button>
                    </div>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                      <li>
                        <strong>"API Keys Sayfasını Aç"</strong> butonuna tıklayın
                      </li>
                      <li>
                        Açılan sayfada <strong>"Project API keys"</strong> bölümünü bulun
                      </li>
                      <li>
                        <strong>"anon" "public"</strong> etiketli key'i kopyalayın
                        <span className="block text-xs text-blue-600 mt-1 ml-5">
                          (Genellikle "eyJhbGc..." ile başlar)
                        </span>
                      </li>
                      <li>
                        Aşağıdaki input field'a yapıştırın
                      </li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Anon Key
                    </label>
                    <textarea
                      value={anonKeyInput}
                      onChange={(e) => setAnonKeyInput(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs resize-none"
                    />
                    <div className="flex items-start space-x-2 text-xs text-gray-600">
                      <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-500" />
                      <div>
                        <p className="font-medium text-gray-700">Önemli:</p>
                        <ul className="list-disc list-inside space-y-1 mt-1">
                          <li>"anon" "public" key'i kopyalayın (service_role DEĞİL!)</li>
                          <li>Key'in tamamını kopyaladığınızdan emin olun</li>
                          <li>Key "eyJ" ile başlamalı ve 3 parçadan oluşmalı (nokta ile ayrılmış)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAnonKeyDialog(false)
                    setAnonKeyInput('')
                    setSelectedProjectForUpload(null)
                  }}
                >
                  İptal
                </Button>
                <Button
                  onClick={handleAnonKeySubmit}
                  disabled={!anonKeyInput || anonKeyInput.trim().length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Kaydet ve Devam Et
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
