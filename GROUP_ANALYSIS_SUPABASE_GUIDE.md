# Grup Analizi Supabase Entegrasyonu Rehberi

Bu rehber, grup analizi yapılan belgelerin ve analiz sonuçlarının Supabase'e ayrı bir şekilde aktarılması için gerekli adımları açıklar.

## 🎯 Özellikler

- **Ayrı Veri Saklama**: Grup analizi verileri tekli belge analizinden bağımsız olarak saklanır
- **Kapsamlı Aktarım**: Dokümanlar, metin bölümleri, AI yorumları ve grup analiz sonuçları birlikte aktarılır
- **Supabase Entegrasyonu**: Modern PostgreSQL tabanlı veritabanı desteği
- **Güvenli Aktarım**: OAuth kimlik doğrulama ile güvenli veri aktarımı

## 📋 Gereksinimler

1. **Supabase Projesi**: Aktif bir Supabase projesi
2. **OAuth Girişi**: Supabase'e giriş yapılmış olması
3. **SQL Schema**: Veritabanı şemasının kurulmuş olması
4. **Grup Analizi**: En az bir grup analizi yapılmış olması

## 🚀 Kurulum Adımları

### 1. SQL Schema Kurulumu

Supabase SQL Editor'da aşağıdaki dosyayı çalıştırın:

```sql
-- sql/group_analysis_supabase_schema.sql dosyasını çalıştırın
```

Bu script şunları oluşturur:
- `document_groups` tablosu (grup bilgileri)
- `documents` tablosu (doküman metadata)
- `text_sections` tablosu (metin bölümleri)
- `ai_commentary` tablosu (AI yorumları)
- `group_analysis_results` tablosu (grup analiz sonuçları)
- `group_analysis_sessions` tablosu (analiz oturumları)
- `embeddings` tablosu (vektör embeddings)
- Gerekli indeksler ve RLS politikaları

### 2. Supabase OAuth Girişi

1. Ana sayfada "Supabase Giriş" butonuna tıklayın
2. Supabase hesabınızla giriş yapın
3. Proje seçin ve API anahtarlarını alın

### 3. Grup Analizi Yapma

1. **Gruplar** sayfasına gidin
2. Yeni bir grup oluşturun veya mevcut grubu açın
3. Gruba dokümanlar ekleyin
4. **"Grup Analizini Başlat"** butonuna tıklayın
5. Analiz tamamlanana kadar bekleyin

## 📤 Supabase'e Aktarım

### Aktarım İşlemi

1. Grup analizi tamamlandıktan sonra **"Supabase'e Aktar"** butonu görünür
2. Butona tıklayın
3. Sistem otomatik olarak:
   - Supabase bağlantısını kontrol eder
   - Gerekirse bağlantıyı başlatır
   - Tüm verileri hazırlar
   - Supabase'e aktarır

### Aktarılan Veriler

- **Grup Bilgileri**: Grup adı, açıklama, oluşturulma tarihi
- **Dokümanlar**: Dosya adı, türü, boyutu, sayfa sayısı
- **Metin Bölümleri**: Çıkarılan metin içeriği, sayfa numaraları
- **AI Yorumları**: AI tarafından üretilen analiz ve yorumlar
- **Grup Analiz Sonuçları**: Çapraz doküman analizi, grup özeti, ilişkiler
- **Metadata**: Güven skorları, işlem süreleri, AI model bilgileri

## 🔧 API Kullanımı

### Backend Servisleri

```typescript
// GroupAnalysisSupabaseService kullanımı
const service = new GroupAnalysisSupabaseService()

// Başlatma
await service.initialize(projectUrl, anonKey)

// Veri aktarımı
const result = await service.transferGroupAnalysis({
  groupId: 'group-uuid',
  groupName: 'Grup Adı',
  documents: [...],
  analysisResults: [...]
})
```

### Frontend API

```typescript
// Supabase'e aktarım
const result = await window.groupAnalysisSupabaseAPI.transferGroupAnalysis({
  groupId: group.id,
  groupName: group.name,
  documents: group.documents,
  analysisResults: group.groupAnalysisResults
})

// Grup özeti alma
const summary = await window.groupAnalysisSupabaseAPI.getGroupAnalysisSummary(groupId)

// Kullanıcı grupları
const groups = await window.groupAnalysisSupabaseAPI.getUserGroups(userId)
```

## 📊 Veritabanı Yapısı

### Ana Tablolar

```sql
-- Grup bilgileri
document_groups (
  id, name, description, user_id,
  total_documents, total_text_sections, total_ai_commentary,
  analysis_status, last_analyzed
)

-- Doküman metadata
documents (
  id, group_id, filename, title, file_type,
  has_text_sections, has_ai_commentary, has_embeddings
)

-- Grup analiz sonuçları
group_analysis_results (
  id, group_id, analysis_type, content,
  confidence_score, documents_analyzed, text_sections_analyzed
)
```

### İlişkiler

- `documents.group_id` → `document_groups.id`
- `text_sections.document_id` → `documents.id`
- `ai_commentary.document_id` → `documents.id`
- `group_analysis_results.group_id` → `document_groups.id`

## 🔍 Sorgu Örnekleri

### Grup Özeti

```sql
SELECT * FROM get_group_analysis_summary('group-uuid');
```

### Analiz Sonuçları

```sql
SELECT 
  gar.analysis_type,
  gar.content,
  gar.confidence_score,
  gar.created_at
FROM group_analysis_results gar
WHERE gar.group_id = 'group-uuid'
ORDER BY gar.created_at DESC;
```

### Doküman İstatistikleri

```sql
SELECT 
  dg.name as group_name,
  COUNT(d.id) as document_count,
  COUNT(ts.id) as text_sections,
  COUNT(ac.id) as ai_commentary
FROM document_groups dg
LEFT JOIN documents d ON dg.id = d.group_id
LEFT JOIN text_sections ts ON d.id = ts.document_id
LEFT JOIN ai_commentary ac ON d.id = ac.document_id
WHERE dg.id = 'group-uuid'
GROUP BY dg.id, dg.name;
```

## ⚠️ Önemli Notlar

### Güvenlik

- Tüm tablolar Row Level Security (RLS) ile korunur
- OAuth kimlik doğrulama zorunludur
- API anahtarları güvenli şekilde saklanır

### Performans

- Büyük gruplar için aktarım süresi artabilir
- Embeddings büyük veri boyutları oluşturabilir
- İndeksler sorgu performansını optimize eder

### Sınırlamalar

- Supabase ücretsiz planında veri sınırları vardır
- Çok büyük dosyalar için chunk'lar halinde aktarım gerekebilir
- Vector embeddings boyut sınırlamaları olabilir

## 🐛 Sorun Giderme

### Yaygın Hatalar

1. **"Supabase Giriş Gerekli"**
   - Supabase'e giriş yapın
   - Proje seçtiğinizden emin olun

2. **"Service not initialized"**
   - Supabase bağlantısını kontrol edin
   - API anahtarlarının doğru olduğundan emin olun

3. **"Transfer function failed"**
   - SQL schema'nın kurulu olduğunu kontrol edin
   - Veritabanı izinlerini kontrol edin

### Debug Bilgileri

```typescript
// Servis durumunu kontrol et
const status = await window.groupAnalysisSupabaseAPI.getStatus()
console.log('Service status:', status)

// Grup analizi özetini kontrol et
const summary = await window.groupAnalysisSupabaseAPI.getGroupAnalysisSummary(groupId)
console.log('Group summary:', summary)
```

## 📈 Gelecek Geliştirmeler

- **Otomatik Senkronizasyon**: Local ve Supabase verilerini otomatik senkronize etme
- **Versiyonlama**: Analiz sonuçlarının versiyon takibi
- **Gelişmiş Arama**: Vector similarity search ile gelişmiş arama
- **Analytics Dashboard**: Grup analizi istatistikleri ve görselleştirme
- **API Webhooks**: Real-time bildirimler ve entegrasyonlar

## 📞 Destek

Sorunlar için:
1. Console loglarını kontrol edin
2. Supabase dashboard'da veritabanı durumunu kontrol edin
3. Network sekmesinde API isteklerini inceleyin
4. Hata mesajlarını not alın ve destek ekibiyle paylaşın

---

**Not**: Bu özellik grup analizi yapıldıktan sonra kullanılabilir. Önce dokümanları gruba ekleyin ve grup analizini tamamlayın.
