# PDF Analiz ve AI Yorumlama Sistemi

Bu sistem, PDF dosyalarını analiz ederek metin bölümlerini ayırır, AI ile yorumlar oluşturur ve Supabase veritabanına kaydeder.

## 🚀 Özellikler

### PDF Analiz
- **Metin Çıkarma**: PDF'den metin bölümlerini otomatik olarak çıkarır
- **Bölüm Sınıflandırma**: Metinleri header, paragraph, list, table gibi kategorilere ayırır
- **Formatting Korunması**: Font boyutu, kalınlık, italik gibi format bilgilerini korur
- **Sayfa Pozisyonu**: Her metin bölümünün sayfa ve pozisyon bilgilerini saklar

### AI Yorumlama
- **Özet**: Metin bölümlerinin özetini çıkarır
- **Ana Noktalar**: Önemli noktaları belirler
- **Analiz**: İçerik analizi yapar
- **Sorular**: Metinle ilgili sorular oluşturur
- **Öneriler**: İyileştirme önerileri sunar
- **Çeviri**: Farklı dillere çeviri yapar

### Supabase Entegrasyonu
- **Doküman Yönetimi**: PDF dosyalarını ve metadata'larını saklar
- **Metin Bölümleri**: Çıkarılan metin bölümlerini organize eder
- **AI Yorumları**: Oluşturulan yorumları kategorize eder
- **Embedding'ler**: Semantic search için vector embedding'ler oluşturur
- **Arama**: Full-text ve semantic search desteği

## 📋 Kurulum

### 1. Gereksinimler
- Node.js 20+ (önerilen)
- Supabase hesabı
- BGE-M3 AI model servisi (opsiyonel)

### 2. Supabase Kurulumu

#### Veritabanı Şeması
```sql
-- sql/pdf_analysis_schema.sql dosyasını Supabase SQL Editor'da çalıştırın
```

#### Environment Variables
`.env` dosyasına ekleyin:
```env
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
AI_SERVER_URL=http://localhost:7861
```

### 3. AI Model Servisi (Opsiyonel)
```bash
cd model_server
pip install -r requirements.txt
python app.py
```

## 🎯 Kullanım

### 1. PDF Analiz Etme

#### Frontend'den
```typescript
// PDF dosyası seçin ve analiz edin
const result = await window.electronAPI.analyzePDF(filePath, {
  generateCommentary: true,
  commentaryTypes: ['summary', 'key_points', 'analysis'],
  language: 'tr',
  userId: 'user_123'
});
```

#### Backend'den
```typescript
import { PDFAnalysisService } from './services/PDFAnalysisService';

const pdfService = new PDFAnalysisService();
const result = await pdfService.analyzePDF(pdfBuffer, filename, options);
```

### 2. Analiz Sonuçlarını Görüntüleme

```typescript
// Doküman analizini getir
const analysis = await window.electronAPI.getDocumentAnalysis(documentId);

// Tüm dokümanları listele
const documents = await window.electronAPI.getDocuments({
  limit: 10,
  status: 'completed'
});
```

### 3. Semantic Search

```typescript
// Benzer dokümanları ara
const results = await window.electronAPI.searchDocuments(query, {
  threshold: 0.7,
  limit: 10
});
```

## 📊 Veritabanı Yapısı

### Documents Tablosu
- `id`: UUID primary key
- `title`: Doküman başlığı
- `filename`: Dosya adı
- `page_count`: Sayfa sayısı
- `processing_status`: İşlem durumu
- `metadata`: Ek bilgiler

### Text Sections Tablosu
- `id`: UUID primary key
- `document_id`: Doküman referansı
- `page_number`: Sayfa numarası
- `content`: Metin içeriği
- `content_type`: İçerik tipi (header, paragraph, etc.)
- `position_x`, `position_y`: Pozisyon bilgileri
- `font_size`, `font_family`: Format bilgileri

### AI Commentary Tablosu
- `id`: UUID primary key
- `text_section_id`: Metin bölümü referansı
- `commentary_type`: Yorum tipi (summary, analysis, etc.)
- `content`: Yorum içeriği
- `confidence_score`: Güven skoru
- `language`: Dil

### Embeddings Tablosu
- `id`: UUID primary key
- `text_section_id`: Metin bölümü referansı
- `embedding`: Vector embedding (1024 boyut)
- `embedding_type`: Embedding tipi

## 🔧 API Endpoints

### PDF Analiz
- `pdf:initializeService` - Servisi başlat
- `pdf:analyzePDF` - PDF analiz et
- `pdf:getDocumentAnalysis` - Analiz sonuçlarını getir
- `pdf:searchDocuments` - Doküman ara
- `pdf:getDocuments` - Dokümanları listele
- `pdf:deleteDocument` - Doküman sil

### Embedding
- `embedding:initializeSupabase` - Supabase'i başlat
- `embedding:generateEmbeddings` - Embedding oluştur
- `embedding:indexDocument` - Dokümanı indeksle
- `embedding:searchSimilar` - Benzer dokümanları ara

## 🎨 Frontend Komponenti

### PDFAnalysisComponent
```tsx
import { PDFAnalysisComponent } from '@/components/PDFAnalysisComponent';

<PDFAnalysisComponent 
  onAnalysisComplete={(result) => {
    console.log('Analiz tamamlandı:', result);
  }}
/>
```

## 📈 Performans

### Optimizasyonlar
- **Batch Processing**: Çoklu metin bölümlerini toplu işler
- **Caching**: Embedding'leri cache'ler
- **Lazy Loading**: Büyük dokümanları parça parça yükler
- **Background Processing**: Arka planda işlem yapar

### Sınırlar
- **Dosya Boyutu**: 100MB'a kadar PDF
- **Sayfa Sayısı**: 1000 sayfaya kadar
- **Metin Uzunluğu**: Bölüm başına 10,000 karakter
- **Embedding Boyutu**: 1024 boyut (BGE-M3)

## 🐛 Sorun Giderme

### Yaygın Hatalar

#### 1. OAuth Hatası
```
PathError: Missing parameter name at index 1: *
```
**Çözüm**: `src/main/oauth-server.ts` dosyasında `app.use('*', ...)` yerine `app.use(...)` kullanın.

#### 2. Node.js Versiyonu
```
Node.js 18 and below are deprecated
```
**Çözüm**: Node.js 20+ kullanın.

#### 3. Supabase Bağlantı Hatası
```
Failed to initialize Supabase
```
**Çözüm**: `.env` dosyasında `SUPABASE_URL` ve `SUPABASE_ANON_KEY` değerlerini kontrol edin.

#### 4. AI Servisi Hatası
```
AI server not available
```
**Çözüm**: AI servisi çalışmıyorsa mock embedding'ler kullanılır.

## 📝 Örnek Kullanım

### Basit PDF Analizi
```typescript
// 1. PDF dosyası seç
const fileInput = document.getElementById('pdf-file') as HTMLInputElement;
const file = fileInput.files[0];

// 2. Analiz et
const result = await window.electronAPI.analyzePDF(file.path, {
  generateCommentary: true,
  commentaryTypes: ['summary', 'key_points'],
  language: 'tr'
});

// 3. Sonuçları göster
console.log(`${result.textSections.length} metin bölümü`);
console.log(`${result.aiCommentary.length} AI yorumu`);
```

### Gelişmiş Arama
```typescript
// Semantic search
const searchResults = await window.electronAPI.searchDocuments(
  'makine öğrenmesi algoritmaları',
  { threshold: 0.8, limit: 5 }
);

// Full-text search
const textResults = await window.electronAPI.searchDocuments(
  'yapay zeka',
  { searchType: 'fulltext' }
);
```

## 🔮 Gelecek Özellikler

- [ ] **Çoklu Dil Desteği**: Daha fazla dil desteği
- [ ] **Görsel Analiz**: PDF'deki görselleri analiz etme
- [ ] **Tablo Tanıma**: Tabloları otomatik tanıma
- [ ] **Grafik Analizi**: Grafik ve şemaları analiz etme
- [ ] **Real-time Collaboration**: Gerçek zamanlı işbirliği
- [ ] **API Webhooks**: Dış sistemlerle entegrasyon

## 📞 Destek

Sorunlar için:
1. GitHub Issues kullanın
2. Log dosyalarını kontrol edin
3. Environment variables'ları doğrulayın
4. Supabase bağlantısını test edin

---

**Not**: Bu sistem BGE-M3 embedding modeli ve Supabase veritabanı kullanır. Performans için GPU desteği önerilir.
