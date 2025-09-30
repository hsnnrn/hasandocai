/**
 * ProcessAndIndexButton Component
 * 
 * Bu component belge yükleme, metne çevirme, AI embedding ve Supabase'e kaydetme
 * işlemlerini tek butonla gerçekleştirir.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Upload, 
  Brain, 
  Database, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertCircle,
  Settings,
  Play
} from 'lucide-react';

interface ProcessAndIndexButtonProps {
  filePath?: string;
  projectRef?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface ProcessingStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
  icon: React.ReactNode;
}

export function ProcessAndIndexButton({ 
  filePath, 
  projectRef, 
  onSuccess, 
  onError, 
  className 
}: ProcessAndIndexButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [steps, setSteps] = useState<ProcessingStep[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [modelHealth, setModelHealth] = useState<any>(null);
  const [isModelReady, setIsModelReady] = useState(false);

  // Initialize processing steps
  useEffect(() => {
    const initialSteps: ProcessingStep[] = [
      {
        id: 'file-check',
        name: 'Dosya Kontrolü',
        status: 'pending',
        icon: <FileText className="w-4 h-4" />
      },
      {
        id: 'text-extraction',
        name: 'Metin Çıkarma',
        status: 'pending',
        icon: <Upload className="w-4 h-4" />
      },
      {
        id: 'embedding-generation',
        name: 'AI Embedding',
        status: 'pending',
        icon: <Brain className="w-4 h-4" />
      },
      {
        id: 'database-save',
        name: 'Supabase Kaydetme',
        status: 'pending',
        icon: <Database className="w-4 h-4" />
      }
    ];
    setSteps(initialSteps);
  }, []);

  // Check model server health on component mount
  useEffect(() => {
    checkModelHealth();
  }, []);

  const checkModelHealth = async () => {
    try {
      const healthResult = await window.electronAPI.checkModelHealth();
      if (healthResult.success && healthResult.isHealthy) {
        setModelHealth(healthResult.health);
        setIsModelReady(true);
      } else {
        setIsModelReady(false);
        setError('Model server is not ready. Please start the BGE-M3 model server.');
      }
    } catch (err) {
      console.error('Health check failed:', err);
      setIsModelReady(false);
      setError('Cannot connect to model server.');
    }
  };

  const updateStep = (stepId: string, status: ProcessingStep['status'], message?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, message }
        : step
    ));
  };

  const processAndIndex = async () => {
    if (!filePath) {
      setError('Dosya yolu belirtilmedi.');
      return;
    }

    if (!projectRef) {
      setError('Proje referansı belirtilmedi.');
      return;
    }

    if (!isModelReady) {
      setError('Model server hazır değil. Lütfen BGE-M3 model server\'ını başlatın.');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError('');
    setResult(null);

    try {
      // Step 1: File Check
      setCurrentStep('Dosya kontrolü yapılıyor...');
      updateStep('file-check', 'processing');
      setProgress(25);

      // Step 2: Text Extraction
      setCurrentStep('Metin çıkarılıyor...');
      updateStep('text-extraction', 'processing');
      setProgress(50);

      // Step 3: AI Embedding
      setCurrentStep('AI embedding oluşturuluyor...');
      updateStep('embedding-generation', 'processing');
      setProgress(75);

      // Step 4: Database Save
      setCurrentStep('Supabase\'e kaydediliyor...');
      updateStep('database-save', 'processing');
      setProgress(90);

      // Call the main processing function
      const result = await window.electronAPI.processAndIndexFile(filePath, projectRef, {
        metadata: {
          processedAt: new Date().toISOString(),
          source: 'DocDataApp'
        }
      });

      if (result.success) {
        // Mark all steps as completed
        setSteps(prev => prev.map(step => ({ ...step, status: 'completed' })));
        setProgress(100);
        setCurrentStep('İşlem tamamlandı!');
        setResult(result);
        onSuccess?.(result);
      } else {
        throw new Error(result.error || 'İşlem başarısız oldu.');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata oluştu.';
      setError(errorMessage);
      setCurrentStep('Hata oluştu!');
      
      // Mark current step as error
      const currentStepId = steps.find(step => step.status === 'processing')?.id;
      if (currentStepId) {
        updateStep(currentStepId, 'error', errorMessage);
      }
      
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetProcess = () => {
    setIsProcessing(false);
    setProgress(0);
    setCurrentStep('');
    setResult(null);
    setError('');
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending', message: undefined })));
  };

  const getStepIcon = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return step.icon;
    }
  };

  const getStepBadge = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Tamamlandı</Badge>;
      case 'error':
        return <Badge variant="destructive">Hata</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="bg-blue-500">İşleniyor</Badge>;
      default:
        return <Badge variant="outline">Bekliyor</Badge>;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Model Health Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5" />
            Model Server Durumu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isModelReady ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <span className={isModelReady ? 'text-green-600' : 'text-red-600'}>
                {isModelReady ? 'Model Server Hazır' : 'Model Server Hazır Değil'}
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkModelHealth}
              disabled={isProcessing}
            >
              Yenile
            </Button>
          </div>
          {modelHealth && (
            <div className="mt-2 text-sm text-gray-600">
              <p>Device: {modelHealth.device}</p>
              <p>Model: {modelHealth.modelInfo?.modelName || 'Unknown'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            İşlem Adımları
          </CardTitle>
          <CardDescription>
            Belge işleme ve AI embedding süreci
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{currentStep}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Steps List */}
          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStepIcon(step)}
                  <div>
                    <p className="font-medium">{step.name}</p>
                    {step.message && (
                      <p className="text-sm text-gray-600">{step.message}</p>
                    )}
                  </div>
                </div>
                {getStepBadge(step)}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={processAndIndex}
              disabled={!filePath || !projectRef || !isModelReady || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  İşleniyor...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Belgeyi İşle ve Kaydet
                </>
              )}
            </Button>
            
            {(result || error) && (
              <Button variant="outline" onClick={resetProcess}>
                Sıfırla
              </Button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <XCircle className="w-4 h-4" />
                <span className="font-medium">Hata:</span>
              </div>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          )}

          {/* Success Display */}
          {result && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Başarılı!</span>
              </div>
              <p className="text-green-700 mt-1">
                Belge başarıyla işlendi ve Supabase'e kaydedildi.
              </p>
              {result.documentId && (
                <p className="text-sm text-green-600 mt-1">
                  Document ID: {result.documentId}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
