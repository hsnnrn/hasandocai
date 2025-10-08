# DocDataApp - Proje Yapısı ve Teknik Dokümantasyon

## 📋 Genel Bakış
DocDataApp, Electron tabanlı AI destekli bir doküman analiz ve dönüştürme uygulamasıdır. Kullanıcılar PDF, DOCX, Excel ve PowerPoint dosyalarını yükleyip analiz edebilir, AI ile sorgulayabilir ve Supabase'e kaydedebilir.

## 🏗️ Mimari Yapı

### **Ana Teknolojiler**
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: Electron Main Process (Node.js)
- **Veritabanı**: Supabase (PostgreSQL)
- **AI Model**: BGE-M3 (BAAI/bge-m3 embedding model)
- **Durum Yönetimi**: Zustand + React Query

### **Proje Klasör Yapısı**
```
DocDataApp/
├── src/
│   ├── main/                    # Electron ana süreç
│   │   ├── ai/                  # AI entegrasyonları
│   │   │   ├── embeddingClient.ts      # BGE-M3 embedding istemcisi
│   │   │   ├── vectorClient.ts         # Vektör DB (Qdrant) istemcisi
│   │   │   └── llmRunner.ts            # LLM (Llama) çalıştırıcı
│   │   ├── services/            # Dosya işleme servisleri
│   │   │   ├── PDFAnalysisService.ts   # PDF analizi
│   │   │   ├── DOCXAnalysisService.ts  # Word analizi
│   │   │   ├── ExcelAnalysisService.ts # Excel analizi
│   │   │   └── LocalDataService.ts     # Yerel veri yönetimi
│   │   ├── bgeClient.ts         # BGE-M3 model sunucu iletişimi
│   │   └── ipc-handlers.ts      # IPC event yöneticileri
│   └── renderer/                # React frontend
│       └── src/
│           ├── pages/           # Uygulama sayfaları
│           ├── components/      # UI bileşenleri
│           └── services/        # Frontend servisleri
├── model_server/                # Python AI model sunucusu
│   ├── app.py                   # Flask API
│   └── requirements.txt         # Python bağımlılıkları
└── dist/                        # Derlenmiş dosyalar
```

## 🤖 Embedded AI Kullanımı

### **BGE-M3 Embedding Model**
- **Model**: BAAI/bge-m3 (Hugging Face)
- **Embedding Boyutu**: 1024 boyutlu vektörler
- **Cihaz**: CPU/CUDA (otomatik tespit)
- **API URL**: `http://127.0.0.1:7860`

### **Model Sunucu Başlatma**
```bash
cd model_server
pip install -r requirements.txt
python app.py
```

### **Embedding Üretim Süreci**
1. Metin girişi alınır (PDF'den çıkarılan paragraflar)
2. BGE-M3 modeline HTTP POST isteği gönderilir
3. Model her metin için 1024 boyutlu float vektör döner
4. Vektörler Supabase'e `pgvector` formatında kaydedilir

### **API Endpoint'leri**
```
POST /embed
Body: {
  "texts": ["metin1", "metin2"],
  "batch_size": 64,
  "normalize": true
}
Response: {
  "embeddings": [[0.123, -0.456, ...], [0.789, ...]],
  "modelInfo": {
    "modelName": "BAAI/bge-m3",
    "device": "cuda",
    "embeddingDim": 1024,
    "processingTime": 250
  }
}

GET /health
Response: {
  "status": "healthy",
  "modelLoaded": true,
  "device": "cuda"
}
```

## 📄 Veri Akışı ve Formatlar

### **1. PDF Analiz Süreci**
```
PDF Dosyası (Buffer)
  ↓ PDF.js ile parse
Sayfa bazında metin çıkarma
  ↓ Bölümlere ayırma
Text Sections (JSON Array)
  ↓ BGE-M3 Embedding
1024 boyutlu vektörler
  ↓ Supabase
PostgreSQL + pgvector
```

### **2. Metin Bölümü Formatı** (PDFTextSection)
```json
{
  "id": "section_1234567_0",
  "pageNumber": 1,
  "sectionTitle": "Başlık",
  "content": "Metin içeriği...",
  "contentType": "paragraph",
  "position": { "x": 72, "y": 800 },
  "formatting": {
    "fontSize": 12,
    "fontFamily": "Arial",
    "isBold": false,
    "isItalic": false,
    "color": "000000"
  },
  "orderIndex": 0
}
```

### **3. AI Yorumları Formatı** (AICommentary)
```json
{
  "id": "commentary_1234567_1",
  "textSectionId": "section_1234567_0",
  "documentId": "doc_1234567",
  "commentaryType": "summary",
  "content": "Bu bölümün özeti...",
  "confidenceScore": 0.95,
  "language": "tr",
  "aiModel": "enhanced-ai-v1",
  "processingTimeMs": 120
}
```

### **4. Supabase Veritabanı Şeması**

**documents** tablosu:
- `id` (UUID, PK)
- `filename` (TEXT)
- `title` (TEXT)
- `file_type` (TEXT)
- `page_count` (INTEGER)
- `user_id` (TEXT)
- `created_at`, `updated_at` (TIMESTAMP)

**text_sections** tablosu:
- `id` (UUID, PK)
- `document_id` (UUID, FK)
- `page_number` (INTEGER)
- `content` (TEXT)
- `content_type` (TEXT)
- `position_x`, `position_y` (FLOAT)
- `font_size` (FLOAT)
- `order_index` (INTEGER)

**embeddings** tablosu:
- `id` (UUID, PK)
- `text_section_id` (UUID, FK)
- `embedding` (VECTOR(1024)) ← pgvector
- `ai_model` (TEXT)

**ai_commentary** tablosu:
- `id` (UUID, PK)
- `text_section_id` (UUID, FK)
- `commentary_type` (TEXT)
- `content` (TEXT)
- `confidence_score` (FLOAT)
- `language` (TEXT)

### **5. Yerel Veri Formatı** (LocalDataService)
Electron-store kullanarak JSON formatında kaydedilir:
```json
{
  "conversions": [
    {
      "id": "conv_123",
      "timestamp": 1728345600000,
      "inputFile": "document.pdf",
      "outputFile": "document.docx",
      "inputFormat": "pdf",
      "outputFormat": "docx",
      "fileSize": 1048576,
      "processingTime": 5000,
      "success": true
    }
  ],
  "templates": [...],
  "settings": {
    "theme": "light",
    "maxHistoryItems": 1000
  }
}
```

## 🔄 Uygulama İş Akışı

### **Tipik Kullanım Senaryosu**
1. **Dosya Yükleme**: Kullanıcı PDF sürükle-bırak ile yükler
2. **Analiz Başlatma**: `analyzePDF()` fonksiyonu çağrılır
3. **Metin Çıkarma**: PDF.js ile sayfa sayfa metin çıkarılır
4. **Bölümlere Ayırma**: Metin paragraf/başlık/liste olarak kategorize edilir
5. **Embedding Üretimi**: Her bölüm için BGE-M3'ten embedding alınır
6. **Supabase'e Kayıt**: Document → TextSections → Embeddings → AICommentary
7. **AI Yorumları**: Mock veya gerçek AI servisi ile yorumlar üretilir
8. **Sonuç Gösterimi**: React UI'da analiz sonuçları gösterilir

### **IPC Komunikasyonu**
```typescript
// Renderer → Main
ipcRenderer.invoke('pdf:analyzePDF', pdfBuffer, filename)

// Main Process
ipcMain.handle('pdf:analyzePDF', async (event, buffer, name) => {
  const service = new PDFAnalysisService()
  return await service.analyzePDF(buffer, name)
})
```

## 🚀 Başlatma ve Geliştirme

### **Geliştirme Modu**
```bash
npm install
npm run dev  # Renderer (Vite) + Main (TypeScript) paralel başlatır
```

### **Production Build**
```bash
npm run build
npm run build:windows  # Windows installer
npm run build:mac      # macOS .dmg
```

### **Environment Variables**
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
MODEL_SERVER_URL=http://127.0.0.1:7860
```

## 📦 Veri Akış Özeti

**Giriş**: PDF/DOCX dosyası (Buffer)  
**İşleme**: Text extraction → Chunking → Embedding  
**Çıkış**: 
- JSON (yerel - electron-store)
- PostgreSQL (Supabase - documents, text_sections)
- Vector DB (Supabase pgvector - embeddings)

**Embedding Formatı**: Float32Array[1024] → PostgreSQL VECTOR(1024)  
**AI Modeli**: BGE-M3 (lokal Python sunucu)  
**Sorgulama**: Cosine similarity ile vektör arama

## 🔍 Önemli Notlar

- Tüm metinler UTF-8 encoding ile kaydedilir
- Embedding normalizasyonu varsayılan olarak aktiftir
- Batch işleme maksimum 64 metin/istek
- Timeout süreleri: Model server 30s, Supabase 10s
- Mock mode: Model sunucu yoksa rastgele vektörler üretilir
- Offline çalışma: LocalDataService ile tamamen offline kullanılabilir

