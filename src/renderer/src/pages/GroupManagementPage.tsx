import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft, 
  Settings, 
  Trash2, 
  Plus, 
  FileText, 
  Brain, 
  Users,
  Calendar,
  Edit3,
  Save,
  X,
  FolderOpen,
  FileCheck,
  AlertCircle
} from 'lucide-react'
import { useAppStore, DocumentGroup, AnalysisResult } from '@/store/appStore'
import { useToast } from '@/hooks/use-toast'
import { GroupAnalysisComponent } from '@/components/GroupAnalysisComponent'

export function GroupManagementPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { 
    getDocumentGroup, 
    updateDocumentGroup, 
    removeDocumentFromGroup,
    analysisResults 
  } = useAppStore()
  const { toast } = useToast()
  
  const [group, setGroup] = useState<DocumentGroup | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')

  useEffect(() => {
    if (groupId) {
      const foundGroup = getDocumentGroup(groupId)
      if (foundGroup) {
        setGroup(foundGroup)
        setEditName(foundGroup.name)
        setEditDescription(foundGroup.description || '')
        
        // Debug: Log group document data
        console.log('Group documents data:', foundGroup.documents.map(doc => ({
          filename: doc.filename,
          textSections: doc.textSections?.length || 0,
          aiCommentary: doc.aiCommentary?.length || 0,
          hasTextSections: !!doc.textSections,
          hasAiCommentary: !!doc.aiCommentary
        })))
        
      } else {
        toast({
          title: 'Grup Bulunamadı',
          description: 'Belirtilen grup bulunamadı.',
          variant: 'destructive'
        })
        navigate('/groups')
      }
    }
  }, [groupId, getDocumentGroup, analysisResults, navigate, toast])

  const handleSaveEdit = () => {
    if (!group || !editName.trim()) {
      toast({
        title: 'Grup Adı Gerekli',
        description: 'Lütfen bir grup adı girin.',
        variant: 'destructive'
      })
      return
    }

    updateDocumentGroup(group.id, {
      name: editName.trim(),
      description: editDescription.trim() || undefined
    })

    setGroup(prev => prev ? {
      ...prev,
      name: editName.trim(),
      description: editDescription.trim() || undefined
    } : null)

    setIsEditing(false)
    toast({
      title: 'Grup Güncellendi',
      description: 'Grup bilgileri başarıyla güncellendi.',
    })
  }

  const handleCancelEdit = () => {
    setEditName(group?.name || '')
    setEditDescription(group?.description || '')
    setIsEditing(false)
  }

  const handleAddDocument = (document: AnalysisResult) => {
    if (group) {
      // Check if document with same filename already exists in group
      const existingDocument = group.documents.find(doc => doc.filename === document.filename)
      
      if (existingDocument) {
        toast({
          title: 'Mükerrer Dosya Tespit Edildi',
          description: `"${document.filename}" dosyası zaten grupta mevcut.`,
          variant: 'destructive'
        })
        return
      }

      updateDocumentGroup(group.id, {
        documents: [...group.documents, { ...document, groupId: group.id }]
      })
      
      setGroup(prev => prev ? {
        ...prev,
        documents: [...prev.documents, { ...document, groupId: prev.id }]
      } : null)

      
      toast({
        title: 'Doküman Eklendi',
        description: `"${document.filename}" gruba eklendi.`,
      })
    }
  }

  const handleRemoveDocument = (documentId: string) => {
    if (group) {
      const document = group.documents.find(doc => doc.documentId === documentId)
      if (document) {
        removeDocumentFromGroup(group.id, documentId)
        
        setGroup(prev => prev ? {
          ...prev,
          documents: prev.documents.filter(doc => doc.documentId !== documentId)
        } : null)

        
        toast({
          title: 'Doküman Kaldırıldı',
          description: `"${document.filename}" gruptan kaldırıldı.`,
        })
      }
    }
  }

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />
      case 'docx':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'excel':
        return <FileText className="h-4 w-4 text-green-500" />
      case 'powerpoint':
        return <FileText className="h-4 w-4 text-orange-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
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

  if (!group) {
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
            onClick={() => navigate('/groups')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Geri</span>
          </Button>
          <div>
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-xl font-bold"
                />
                <Button size="sm" onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-700">
                  <Save className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold">{group.name}</h1>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-4 w-4" />
                </Button>
              </div>
            )}
            {isEditing ? (
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Grup açıklaması..."
                className="text-gray-600 mt-1"
              />
            ) : (
              <p className="text-gray-600">{group.description || 'Açıklama yok'}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(group.createdAt).toLocaleDateString('tr-TR')}
            </span>
          </div>
        </div>
      </div>

      {/* Group Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Dokümanlar</p>
              <p className="text-2xl font-bold">{group.documents.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <FileCheck className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">Metin Bölümleri</p>
              <p className="text-2xl font-bold">
                {group.documents.reduce((sum, doc) => sum + (doc.textSections?.length || 0), 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-sm text-gray-600">AI Yorumları</p>
              <p className="text-2xl font-bold">
                {group.documents.reduce((sum, doc) => sum + (doc.aiCommentary?.length || 0), 0)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm text-gray-600">Grup Analizleri</p>
              <p className="text-2xl font-bold">{group.groupAnalysisResults?.length || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Documents Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Grup Dokümanları</h3>
          <Badge variant="outline" className="text-sm">
            {group.documents.length} doküman
          </Badge>
        </div>
        
        {group.documents.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-600 mb-2">Bu grupta henüz doküman yok</h4>
            <p className="text-gray-500 mb-6">Doküman eklemek için ana sayfaya gidin ve dosyaları yükleyin</p>
            <Button 
              onClick={() => navigate('/')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Doküman Ekle
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.documents.map((doc) => (
              <div key={doc.documentId} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3 flex-1">
                    {getFileTypeIcon(doc.fileType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={doc.filename}>
                        {doc.filename}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={`text-xs ${getFileTypeColor(doc.fileType)}`}>
                          {doc.fileType.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveDocument(doc.documentId)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex items-center justify-between">
                    <span>Metin Bölümleri:</span>
                    <span className="font-medium">{doc.textSections?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>AI Yorumları:</span>
                    <span className="font-medium">{doc.aiCommentary?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Oluşturulma:</span>
                    <span className="font-medium">
                      {new Date(doc.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Group Analysis */}
      {group.documents.length > 0 && (
        <GroupAnalysisComponent 
          group={group} 
          onAnalysisComplete={(results) => {
            setGroup(prev => prev ? {
              ...prev,
              groupAnalysisResults: results
            } : null)
          }}
        />
      )}

      {/* Empty State for Analysis */}
      {group.documents.length === 0 && (
        <Card className="p-12 text-center">
          <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Grup Analizi İçin Doküman Gerekli</h3>
          <p className="text-gray-500 mb-6">
            Grup analizi yapmak için en az bir doküman ekleyin.
          </p>
          <div className="flex items-center justify-center space-x-2 text-amber-600 bg-amber-50 p-4 rounded-lg max-w-md mx-auto">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">Ana sayfaya giderek doküman yükleyin ve gruba ekleyin.</span>
          </div>
        </Card>
      )}
    </div>
  )
}
