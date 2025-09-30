import React, { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useToast } from '../hooks/use-toast';

interface PDFAnalysisResult {
  documentId: string;
  title: string;
  filename: string;
  pageCount: number;
  textSections: Array<{
    id: string;
    pageNumber: number;
    sectionTitle?: string;
    content: string;
    contentType: string;
    orderIndex: number;
  }>;
  aiCommentary: Array<{
    id: string;
    commentaryType: string;
    content: string;
    confidenceScore: number;
    language: string;
  }>;
  processingTime: number;
  success: boolean;
  error?: string;
}

interface PDFAnalysisComponentProps {
  onAnalysisComplete?: (result: PDFAnalysisResult) => void;
}

export const PDFAnalysisComponent: React.FC<PDFAnalysisComponentProps> = ({
  onAnalysisComplete
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [analysisResult, setAnalysisResult] = useState<PDFAnalysisResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisOptions, setAnalysisOptions] = useState({
    generateCommentary: true,
    commentaryTypes: ['summary', 'key_points', 'analysis'],
    language: 'tr',
    userId: 'user_' + Date.now()
  });
  
  const { toast } = useToast();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setAnalysisResult(null);
    } else {
      toast({
        title: 'Geçersiz Dosya',
        description: 'Lütfen bir PDF dosyası seçin.',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const handleAnalyzePDF = useCallback(async () => {
    if (!selectedFile) {
      toast({
        title: 'Dosya Seçilmedi',
        description: 'Lütfen analiz edilecek bir PDF dosyası seçin.',
        variant: 'destructive'
      });
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);
    setCurrentStep('PDF servisi başlatılıyor...');

    try {
      // Step 1: Initialize PDF service
      setProgress(10);
      const initResult = await window.electronAPI.initializePDFService();
      if (!initResult.success) {
        throw new Error(initResult.error || 'PDF servisi başlatılamadı');
      }

      // Step 2: Process PDF file
      setProgress(30);
      setCurrentStep('PDF dosyası işleniyor...');
      
      // Read file as buffer and send to backend
      const fileBuffer = await selectedFile.arrayBuffer();
      const buffer = new Uint8Array(fileBuffer);
      
      // Create a temporary file path for the backend
      const tempFilePath = `temp_${Date.now()}_${selectedFile.name}`;
      
      // Send file buffer to backend via IPC
      const analysisResult = await window.electronAPI.analyzePDFBuffer(buffer, tempFilePath, analysisOptions);
      
      if (!analysisResult.success) {
        throw new Error(analysisResult.error || 'PDF analizi başarısız');
      }

      setProgress(100);
      setCurrentStep('Analiz tamamlandı!');
      
      setAnalysisResult(analysisResult);
      onAnalysisComplete?.(analysisResult);
      
      toast({
        title: 'Analiz Tamamlandı',
        description: `${analysisResult.textSections.length} metin bölümü ve ${analysisResult.aiCommentary.length} AI yorumu oluşturuldu.`,
      });

    } catch (error) {
      console.error('PDF analysis failed:', error);
      toast({
        title: 'Analiz Hatası',
        description: error instanceof Error ? error.message : 'PDF analizi sırasında bir hata oluştu.',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
      setProgress(0);
      setCurrentStep('');
    }
  }, [selectedFile, analysisOptions, onAnalysisComplete, toast]);

  const handleOptionChange = useCallback((key: string, value: any) => {
    setAnalysisOptions(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  return (
    <div className="space-y-6">
      {/* File Selection */}
      <Card>
        <CardHeader>
          <CardTitle>PDF Dosyası Seçin</CardTitle>
          <CardDescription>
            Analiz edilecek PDF dosyasını seçin ve AI yorumları oluşturun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={isAnalyzing}
            />
            
            {selectedFile && (
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{selectedFile.name}</Badge>
                <span className="text-sm text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Analysis Options */}
      <Card>
        <CardHeader>
          <CardTitle>Analiz Seçenekleri</CardTitle>
          <CardDescription>
            AI yorumları ve analiz türlerini seçin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="generateCommentary"
                checked={analysisOptions.generateCommentary}
                onChange={(e) => handleOptionChange('generateCommentary', e.target.checked)}
                disabled={isAnalyzing}
              />
              <label htmlFor="generateCommentary" className="text-sm font-medium">
                AI Yorumları Oluştur
              </label>
            </div>

            {analysisOptions.generateCommentary && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Yorum Türleri:</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'summary', label: 'Özet' },
                    { key: 'key_points', label: 'Ana Noktalar' },
                    { key: 'analysis', label: 'Analiz' },
                    { key: 'questions', label: 'Sorular' },
                    { key: 'suggestions', label: 'Öneriler' },
                    { key: 'translation', label: 'Çeviri' }
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={analysisOptions.commentaryTypes.includes(key)}
                        onChange={(e) => {
                          const newTypes = e.target.checked
                            ? [...analysisOptions.commentaryTypes, key]
                            : analysisOptions.commentaryTypes.filter(t => t !== key);
                          handleOptionChange('commentaryTypes', newTypes);
                        }}
                        disabled={isAnalyzing}
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Dil:</label>
              <select
                value={analysisOptions.language}
                onChange={(e) => handleOptionChange('language', e.target.value)}
                disabled={isAnalyzing}
                className="w-full p-2 border rounded-md"
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <Card>
          <CardHeader>
            <CardTitle>Analiz İşlemi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{currentStep}</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analyze Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleAnalyzePDF}
          disabled={!selectedFile || isAnalyzing}
          size="lg"
          className="px-8"
        >
          {isAnalyzing ? 'Analiz Ediliyor...' : 'PDF Analiz Et'}
        </Button>
      </div>

      {/* Analysis Results */}
      {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle>Analiz Sonuçları</CardTitle>
            <CardDescription>
              {analysisResult.title} - {analysisResult.pageCount} sayfa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {analysisResult.textSections.length}
                  </div>
                  <div className="text-sm text-gray-500">Metin Bölümü</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {analysisResult.aiCommentary.length}
                  </div>
                  <div className="text-sm text-gray-500">AI Yorumu</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(analysisResult.processingTime / 1000)}s
                  </div>
                  <div className="text-sm text-gray-500">İşlem Süresi</div>
                </div>
              </div>

              {/* Text Sections Preview */}
              <div className="space-y-2">
                <h4 className="font-medium">Metin Bölümleri:</h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {analysisResult.textSections.slice(0, 5).map((section, index) => (
                    <div key={section.id} className="p-2 bg-gray-50 rounded text-sm">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">
                          Sayfa {section.pageNumber} - {section.contentType}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {section.orderIndex}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mt-1 line-clamp-2">
                        {section.content.substring(0, 100)}...
                      </p>
                    </div>
                  ))}
                  {analysisResult.textSections.length > 5 && (
                    <p className="text-sm text-gray-500 text-center">
                      +{analysisResult.textSections.length - 5} daha fazla bölüm
                    </p>
                  )}
                </div>
              </div>

              {/* AI Commentary Preview */}
              {analysisResult.aiCommentary.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">AI Yorumları:</h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {analysisResult.aiCommentary.slice(0, 3).map((commentary, index) => (
                      <div key={commentary.id} className="p-2 bg-blue-50 rounded text-sm">
                        <div className="flex justify-between items-start">
                          <Badge variant="secondary" className="text-xs">
                            {commentary.commentaryType}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {Math.round(commentary.confidenceScore * 100)}% güven
                          </span>
                        </div>
                        <p className="text-gray-700 mt-1 line-clamp-2">
                          {commentary.content.substring(0, 150)}...
                        </p>
                      </div>
                    ))}
                    {analysisResult.aiCommentary.length > 3 && (
                      <p className="text-sm text-gray-500 text-center">
                        +{analysisResult.aiCommentary.length - 3} daha fazla yorum
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
