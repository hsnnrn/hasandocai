import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  FolderPlus, 
  FolderOpen, 
  Trash2, 
  Plus, 
  FileText, 
  Brain, 
  Settings,
  Users,
  Calendar,
  BarChart3,
  Network,
  Layers,
  Target,
  Zap
} from 'lucide-react'
import { useAppStore, DocumentGroup } from '@/store/appStore'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'

export function DocumentGroupManager() {
  const { 
    documentGroups, 
    addDocumentGroup, 
    removeDocumentGroup, 
    updateDocumentGroup,
    getDocumentGroup 
  } = useAppStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')

  const createGroup = () => {
    if (!newGroupName.trim()) {
      toast({
        title: 'Grup Adı Gerekli',
        description: 'Lütfen bir grup adı girin.',
        variant: 'destructive'
      })
      return
    }

    const newGroup: DocumentGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newGroupName.trim(),
      description: newGroupDescription.trim() || undefined,
      documents: [],
      groupAnalysisResults: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    addDocumentGroup(newGroup)
    
    toast({
      title: 'Grup Oluşturuldu',
      description: `"${newGroup.name}" grubu başarıyla oluşturuldu.`,
    })

    setNewGroupName('')
    setNewGroupDescription('')
    setIsCreatingGroup(false)
  }

  const deleteGroup = (groupId: string) => {
    const group = getDocumentGroup(groupId)
    if (group) {
      removeDocumentGroup(groupId)
      toast({
        title: 'Grup Silindi',
        description: `"${group.name}" grubu silindi.`,
      })
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

  const getAnalysisIcon = (analysisType: string) => {
    switch (analysisType) {
      case 'cross_document_analysis':
        return <Network className="h-4 w-4 text-blue-500" />
      case 'group_summary':
        return <BarChart3 className="h-4 w-4 text-green-500" />
      case 'group_relationships':
        return <Layers className="h-4 w-4 text-purple-500" />
      case 'group_patterns':
        return <Target className="h-4 w-4 text-orange-500" />
      case 'group_semantic_analysis':
        return <Brain className="h-4 w-4 text-indigo-500" />
      default:
        return <Zap className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Doküman Grupları</h2>
          <p className="text-gray-600">Dosyalarınızı gruplayın ve ortak AI analizi yapın</p>
        </div>
        <Button
          onClick={() => setIsCreatingGroup(true)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <FolderPlus className="h-4 w-4" />
          <span>Yeni Grup</span>
        </Button>
      </div>

      {/* Create Group Form */}
      {isCreatingGroup && (
        <Card className="p-6 border-blue-200 bg-blue-50">
          <h3 className="text-lg font-semibold mb-4">Yeni Grup Oluştur</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grup Adı *
              </label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Örn: Proje Dokümanları, Raporlar, Sözleşmeler"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Açıklama (Opsiyonel)
              </label>
              <Input
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Bu grubun amacını açıklayın"
                className="w-full"
              />
            </div>
            <div className="flex items-center space-x-3">
              <Button onClick={createGroup} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Grup Oluştur
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreatingGroup(false)
                  setNewGroupName('')
                  setNewGroupDescription('')
                }}
              >
                İptal
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Groups List */}
      {documentGroups.length === 0 ? (
        <Card className="p-12 text-center">
          <FolderOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Henüz Grup Yok</h3>
          <p className="text-gray-500 mb-6">
            Dosyalarınızı organize etmek için bir grup oluşturun ve ortak AI analizi yapın.
          </p>
          <Button
            onClick={() => setIsCreatingGroup(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white mx-auto"
          >
            <FolderPlus className="h-4 w-4" />
            <span>İlk Grubunuzu Oluşturun</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documentGroups.map((group) => (
            <Card key={group.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                {/* Group Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {group.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/groups/${group.id}`)}
                      className="flex items-center space-x-1"
                    >
                      <Settings className="h-3 w-3" />
                      <span className="text-xs">Yönet</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteGroup(group.id)}
                      className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Group Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-gray-600">Dokümanlar</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {group.documents.length}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <Brain className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium text-gray-600">AI Analizler</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      {group.groupAnalysisResults?.length || 0}
                    </div>
                  </div>
                </div>

                {/* Documents Preview */}
                {group.documents.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Dokümanlar:</h4>
                    <div className="space-y-1">
                      {group.documents.slice(0, 3).map((doc) => (
                        <div key={doc.documentId} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                          {getFileTypeIcon(doc.fileType)}
                          <span className="text-xs text-gray-700 truncate flex-1">
                            {doc.filename}
                          </span>
                          <Badge className={`text-xs ${getFileTypeColor(doc.fileType)}`}>
                            {doc.fileType.toUpperCase()}
                          </Badge>
                        </div>
                      ))}
                      {group.documents.length > 3 && (
                        <div className="text-xs text-gray-500 text-center py-1">
                          +{group.documents.length - 3} daha fazla doküman
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Group Analysis Preview */}
                {group.groupAnalysisResults && group.groupAnalysisResults.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">AI Analizleri:</h4>
                    <div className="space-y-1">
                      {group.groupAnalysisResults.slice(0, 2).map((analysis, index) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-purple-50 rounded">
                          {getAnalysisIcon(analysis.analysisType)}
                          <span className="text-xs text-gray-700 truncate flex-1">
                            {analysis.analysisType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                      ))}
                      {group.groupAnalysisResults.length > 2 && (
                        <div className="text-xs text-gray-500 text-center py-1">
                          +{group.groupAnalysisResults.length - 2} daha fazla analiz
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(group.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {group.documents.length > 0 && (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/groups/${group.id}/analysis`)}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                      >
                        <Brain className="h-3 w-3 mr-1" />
                        AI Analiz
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/groups/${group.id}`)}
                      className="text-xs"
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Yönet
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
