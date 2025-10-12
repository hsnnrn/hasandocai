import React, { useState } from 'react'
import { X, Database, CheckCircle, ExternalLink, Copy, AlertCircle } from 'lucide-react'

interface GroupAnalysisSupabaseSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onRetry: () => void
}

export function GroupAnalysisSupabaseSetupModal({ isOpen, onClose, onRetry }: GroupAnalysisSupabaseSetupModalProps) {
  const [copiedStep, setCopiedStep] = useState<number | null>(null)

  if (!isOpen) return null

  const sqlScript = `-- DocDataApp - Grup Analizi için Gerekli Tablolar
-- Bu script sadece GRUP ANALİZİ için gerekli tabloları oluşturur
-- Eğer daha önce tekil belge yüklerken unified schema'yı çalıştırdıysanız,
-- bu tabloları tekrar oluşturmanıza GEREK YOK!

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ========================================
-- Document Groups table (Grup yönetimi için)
-- ========================================
CREATE TABLE IF NOT EXISTS document_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id TEXT DEFAULT 'anonymous',
  group_type TEXT DEFAULT 'manual' CHECK (group_type IN ('manual', 'auto', 'batch')),
  total_documents INTEGER DEFAULT 0,
  total_text_sections INTEGER DEFAULT 0,
  total_ai_commentary INTEGER DEFAULT 0,
  last_analyzed TIMESTAMP WITH TIME ZONE,
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- Group Analysis Results table (Grup analiz sonuçları)
-- ========================================
CREATE TABLE IF NOT EXISTS group_analysis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES document_groups(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN (
    'cross_document_analysis', 'group_summary', 'group_relationships', 
    'group_patterns', 'group_semantic_analysis', 'comparative_analysis',
    'trend_analysis', 'gap_analysis'
  )),
  content TEXT NOT NULL,
  confidence_score REAL DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  language TEXT DEFAULT 'tr',
  ai_model TEXT DEFAULT 'group-ai-model',
  processing_time_ms INTEGER DEFAULT 0,
  documents_analyzed INTEGER DEFAULT 0,
  text_sections_analyzed INTEGER DEFAULT 0,
  ai_commentary_analyzed INTEGER DEFAULT 0,
  analysis_version TEXT DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- Transfer Function (Veri aktarım fonksiyonu)
-- ========================================
CREATE OR REPLACE FUNCTION transfer_group_analysis_data(
  p_group_id UUID,
  p_group_name TEXT,
  p_group_description TEXT,
  p_documents JSONB,
  p_analysis_results JSONB,
  p_user_id TEXT DEFAULT 'anonymous'
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  doc_record JSONB;
  analysis_record JSONB;
  inserted_doc_id UUID;
  total_sections INTEGER := 0;
  total_commentary INTEGER := 0;
BEGIN
  BEGIN
    -- Insert or update document group
    INSERT INTO document_groups (id, name, description, user_id, total_documents)
    VALUES (p_group_id, p_group_name, p_group_description, p_user_id, jsonb_array_length(p_documents))
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      total_documents = EXCLUDED.total_documents,
      updated_at = NOW();

    -- Process documents
    FOR doc_record IN SELECT * FROM jsonb_array_elements(p_documents)
    LOOP
      INSERT INTO documents (
        id, group_id, filename, title, file_type, file_size, 
        page_count, user_id, has_text_sections, has_ai_commentary, processing_status
      ) VALUES (
        COALESCE((doc_record->>'documentId')::UUID, (doc_record->>'id')::UUID),
        p_group_id,
        doc_record->>'filename',
        COALESCE(doc_record->>'title', doc_record->>'filename'),
        COALESCE(doc_record->>'fileType', 'pdf'),
        (doc_record->>'fileSize')::BIGINT,
        COALESCE((doc_record->>'pageCount')::INTEGER, 1),
        p_user_id,
        (doc_record->'textSections' IS NOT NULL),
        (doc_record->'aiCommentary' IS NOT NULL),
        'completed'
      )
      ON CONFLICT (id) DO UPDATE SET
        filename = EXCLUDED.filename,
        title = EXCLUDED.title,
        group_id = EXCLUDED.group_id,
        updated_at = NOW()
      RETURNING id INTO inserted_doc_id;

      -- Insert text sections
      IF doc_record->'textSections' IS NOT NULL THEN
        INSERT INTO text_sections (
          id, document_id, page_number, section_title, content, 
          content_type, order_index
        )
        SELECT 
          (section->>'id'),
          inserted_doc_id,
          COALESCE((section->>'pageNumber')::INTEGER, 1),
          section->>'sectionTitle',
          section->>'content',
          COALESCE(section->>'contentType', section->>'sectionType', 'paragraph'),
          COALESCE((section->>'orderIndex')::INTEGER, 0)
        FROM jsonb_array_elements(doc_record->'textSections') AS section
        WHERE (section->>'id') IS NOT NULL AND (section->>'content') IS NOT NULL
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          section_title = EXCLUDED.section_title;
        
        total_sections := total_sections + jsonb_array_length(doc_record->'textSections');
      END IF;

      -- Insert AI commentary
      IF doc_record->'aiCommentary' IS NOT NULL THEN
        INSERT INTO ai_commentary (
          id, document_id, group_id, text_section_id, commentary_type, content, 
          confidence_score, language, ai_model
        )
        SELECT 
          (commentary->>'id'),
          inserted_doc_id,
          p_group_id,
          (commentary->>'textSectionId'),
          COALESCE(commentary->>'commentaryType', commentary->>'type', 'analysis'),
          commentary->>'content',
          COALESCE((commentary->>'confidenceScore')::REAL, (commentary->>'confidence')::REAL, 0.0),
          COALESCE(commentary->>'language', 'tr'),
          COALESCE(commentary->>'aiModel', 'bge-m3')
        FROM jsonb_array_elements(doc_record->'aiCommentary') AS commentary
        WHERE (commentary->>'id') IS NOT NULL AND (commentary->>'content') IS NOT NULL
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          confidence_score = EXCLUDED.confidence_score;
        
        total_commentary := total_commentary + jsonb_array_length(doc_record->'aiCommentary');
      END IF;
    END LOOP;

    -- Insert group analysis results
    FOR analysis_record IN SELECT * FROM jsonb_array_elements(p_analysis_results)
    LOOP
      INSERT INTO group_analysis_results (
        id, group_id, analysis_type, content, confidence_score, 
        language, ai_model, processing_time_ms, documents_analyzed,
        text_sections_analyzed, ai_commentary_analyzed
      ) VALUES (
        COALESCE((analysis_record->>'id')::UUID, gen_random_uuid()),
        p_group_id,
        analysis_record->>'analysisType',
        analysis_record->>'content',
        COALESCE((analysis_record->>'confidenceScore')::REAL, 0.0),
        COALESCE(analysis_record->>'language', 'tr'),
        COALESCE(analysis_record->>'aiModel', 'group-ai-model'),
        COALESCE((analysis_record->>'processingTimeMs')::INTEGER, 0),
        jsonb_array_length(p_documents),
        total_sections,
        total_commentary
      )
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        updated_at = NOW();
    END LOOP;

    -- Update group statistics
    UPDATE document_groups 
    SET 
      analysis_status = 'completed',
      last_analyzed = NOW(),
      total_text_sections = total_sections,
      total_ai_commentary = total_commentary,
      updated_at = NOW()
    WHERE id = p_group_id;

    result := jsonb_build_object(
      'success', true,
      'message', 'Grup analizi başarıyla aktarıldı',
      'group_id', p_group_id,
      'documents_count', jsonb_array_length(p_documents),
      'text_sections_count', total_sections,
      'ai_commentary_count', total_commentary,
      'analysis_results_count', jsonb_array_length(p_analysis_results)
    );

  EXCEPTION WHEN OTHERS THEN
    result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Veri aktarımı sırasında hata oluştu'
    );
  END;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Update Function (updated_at otomatik güncelleme)
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_document_groups_updated_at ON document_groups;
CREATE TRIGGER update_document_groups_updated_at
  BEFORE UPDATE ON document_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_analysis_results_updated_at ON group_analysis_results;
CREATE TRIGGER update_group_analysis_results_updated_at
  BEFORE UPDATE ON group_analysis_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Indexes (Performans için)
-- ========================================
CREATE INDEX IF NOT EXISTS idx_document_groups_user_id ON document_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_document_groups_created_at ON document_groups(created_at);
CREATE INDEX IF NOT EXISTS idx_document_groups_analysis_status ON document_groups(analysis_status);
CREATE INDEX IF NOT EXISTS idx_group_analysis_results_group_id ON group_analysis_results(group_id);
CREATE INDEX IF NOT EXISTS idx_group_analysis_results_analysis_type ON group_analysis_results(analysis_type);

-- ========================================
-- Row Level Security (RLS) - İZİN SORUNU ÇÖZÜMÜ
-- ========================================

-- Tüm tablolar için RLS'yi kapat (anon key ile çalışabilmek için)
ALTER TABLE document_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_analysis_results DISABLE ROW LEVEL SECURITY;

-- Mevcut tablolar için de RLS'yi kapat (eğer varsa)
DO $$ 
BEGIN
  -- documents tablosu için
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
    ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
  END IF;
  
  -- text_sections tablosu için
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'text_sections') THEN
    ALTER TABLE text_sections DISABLE ROW LEVEL SECURITY;
  END IF;
  
  -- ai_commentary tablosu için
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_commentary') THEN
    ALTER TABLE ai_commentary DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Tüm mevcut RLS policy'lerini temizle
DO $$ 
BEGIN
  -- document_groups policies
  DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON document_groups;
  DROP POLICY IF EXISTS "Allow anonymous access for development" ON document_groups;
  DROP POLICY IF EXISTS "Users can view their own documents" ON document_groups;
  DROP POLICY IF EXISTS "Users can insert their own documents" ON document_groups;
  DROP POLICY IF EXISTS "Users can update their own documents" ON document_groups;
  
  -- group_analysis_results policies
  DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON group_analysis_results;
  DROP POLICY IF EXISTS "Allow anonymous access for development" ON group_analysis_results;
  
  -- documents policies (eğer varsa)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
    DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON documents;
    DROP POLICY IF EXISTS "Allow anonymous access for development" ON documents;
    DROP POLICY IF EXISTS "Users can view their own documents" ON documents;
    DROP POLICY IF EXISTS "Users can insert their own documents" ON documents;
    DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
  END IF;
  
  -- text_sections policies (eğer varsa)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'text_sections') THEN
    DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON text_sections;
    DROP POLICY IF EXISTS "Allow anonymous access for development" ON text_sections;
    DROP POLICY IF EXISTS "Users can view sections of their documents" ON text_sections;
  END IF;
  
  -- ai_commentary policies (eğer varsa)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_commentary') THEN
    DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON ai_commentary;
    DROP POLICY IF EXISTS "Allow anonymous access for development" ON ai_commentary;
    DROP POLICY IF EXISTS "Users can view commentary of their documents" ON ai_commentary;
  END IF;
END $$;

-- ========================================
-- BAŞARILI! ✅
-- ========================================
-- Bu script'i çalıştırdıktan sonra:
-- 1. Modal'ı kapatın
-- 2. 30 saniye bekleyin (Supabase cache yeniliyor)
-- 3. Tekrar "Supabase'e Aktar" butonuna tıklayın
`

  const steps = [
    {
      number: 1,
      title: 'SQL Editor\'ı Aç',
      description: 'Supabase projenizde SQL Editor\'ı açın',
      action: 'SQL Editor Aç',
      url: 'https://supabase.com/dashboard/project/_/sql'
    },
    {
      number: 2,
      title: 'Script\'i Kopyala',
      description: 'Aşağıdaki script\'i kopyalayın',
      action: 'Script\'i Kopyala',
      url: null
    },
    {
      number: 3,
      title: 'Script\'i Çalıştır',
      description: 'SQL Editor\'da script\'i yapıştırıp Run butonuna tıklayın',
      action: null,
      url: null
    }
  ]

  const openUrl = (url: string) => {
    if (window.electron) {
      window.electron.shell.openExternal(url)
    } else {
      window.open(url, '_blank')
    }
  }

  const copyToClipboard = (text: string, stepNumber: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedStep(stepNumber)
      setTimeout(() => setCopiedStep(null), 2000)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Supabase Grup Analizi Kurulumu</h2>
              <p className="text-sm text-gray-600">Grup analizi için 2 tablo ve 1 fonksiyon eklenmesi gerekiyor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
            <span className="text-sm font-medium">Kapat</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 h-8 w-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                    {step.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">{step.title}</h3>
                    <p className="text-xs text-gray-600 mb-3">{step.description}</p>
                    {step.action && (
                      <button
                        onClick={() => {
                          if (step.url) {
                            openUrl(step.url)
                          } else if (step.number === 2) {
                            copyToClipboard(sqlScript, step.number)
                          }
                        }}
                        className={`w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                          step.number === 2
                            ? 'bg-blue-500 hover:bg-blue-600 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        {step.number === 2 && copiedStep === step.number ? (
                          <div className="flex items-center justify-center space-x-2">
                            <CheckCircle className="h-4 w-4" />
                            <span>Kopyalandı!</span>
                          </div>
                        ) : (
                          step.action
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Info Boxes */}
          <div className="space-y-3">
            {/* Common issues info */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 text-sm mb-1">🚨 Grup Analizi Aktarım Hatası</h4>
                <p className="text-sm text-red-800 mb-2">
                  Eğer "transfer_group_analysis_data fonksiyonu bulunamadı" hatası alıyorsanız, 
                  aşağıdaki script'i çalıştırmanız gerekiyor.
                </p>
                <p className="text-xs text-red-700">
                  💡 Bu script hem tabloları oluşturur hem de transfer fonksiyonunu ekler.
                </p>
              </div>
            </div>

            {/* RLS fix info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 text-sm mb-1">✅ İzin Sorunu Çözümü</h4>
                <p className="text-sm text-blue-800 mb-2">
                  Script <strong>RLS (Row Level Security) izin sorunlarını çözer</strong> ve 
                  "Unrestricted" etiketli tablolarınız için gerekli ayarları yapar.
                </p>
                <p className="text-xs text-blue-700">
                  💡 Tüm tablolar için RLS'yi kapatır ve policy'leri temizler. Anon key ile sorunsuz çalışır.
                </p>
              </div>
            </div>

            {/* Waiting time info */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-orange-900 text-sm mb-1">⏳ Script Çalıştırdıktan Sonra</h4>
                <p className="text-sm text-orange-800 mb-2">
                  Script'i çalıştırdıktan sonra <strong>30 saniye bekleyin.</strong> Supabase'in yeni 
                  tabloları ve fonksiyonları cache'e alması gerekiyor.
                </p>
                <p className="text-xs text-orange-700">
                  💡 Script çalıştı → Modal'ı kapat → 30 saniye bekle → Tekrar "Supabase'e Aktar" tıkla
                </p>
              </div>
            </div>
          </div>

          {/* SQL Script Preview */}
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
              <span className="text-sm font-mono text-gray-300">group_analysis_setup.sql</span>
              <button
                onClick={() => copyToClipboard(sqlScript, 2)}
                className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
              >
                <Copy className="h-3 w-3" />
                <span>Kopyala</span>
              </button>
            </div>
            <div className="p-4 overflow-x-auto max-h-64">
              <pre className="text-xs text-gray-300 font-mono whitespace-pre">
                {sqlScript}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={() => {
              onRetry()
              onClose()
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Script Çalıştırıldı, Tekrar Dene</span>
          </button>
        </div>
      </div>
    </div>
  )
}
