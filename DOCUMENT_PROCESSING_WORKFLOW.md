# 📋 Belge İşleme ve Analiz Süreci

## 🎯 Genel Bakış

Evrakların yüklenmesinden chatbot'a getirilmesine kadar tam otomatik ve optimize edilmiş süreç.

---

## 🔄 İŞLEM AKIŞI (Pipeline)

### 1️⃣ **Evrak Yükleme** (File Upload)
**Frontend:** Kullanıcı dosya yükler (DOCX/Excel/PDF)  
**IPC Call:** `docx:analyzeDOCXBuffer` | `excel:analyzeExcelBuffer` | `pdf:analyzePDFBuffer`  
**Handler:** `src/main/ipc-handlers.ts`

```
Kullanıcı → Dosya Seç → Buffer Oluştur → IPC Send
```

---

### 2️⃣ **Temel Analiz** (Basic Analysis)
**Service:** `DOCXAnalysisService` | `ExcelAnalysisService` | `PDFAnalysisService`  
**İşlemler:**
- ✅ Text extraction (metin çıkarımı)
- ✅ Section parsing (bölümlere ayırma)
- ✅ Metadata extraction (başlık, sayfa sayısı)

```
Buffer → Mammoth/XLSX/PDF.js → TextSections[]
```

---

### 3️⃣ **📊 TABLO ÇIKARIMI** (Table Extraction) 🆕
**Module:** `src/main/ai/tableExtractor.ts`  
**Desteklenen Formatlar:** DOCX ✅ | Excel ✅ | PDF ❌ (gelecek)

**İşlemler:**
- Tabloları otomatik bulma
- Header detection (sütun başlıklarını anlama)
- Line items extraction (fatura kalemleri çıkarma)
  - Açıklama (description)
  - Miktar (quantity)
  - Birim fiyat (unit_price)
  - Satır toplamı (line_total)
- Türkçe sayı formatı desteği (1.234,56 → 1234.56)

**Çıktı:**
```typescript
{
  tables: [{ id, type, headers, rowCount, confidence }],
  lineItems: [{ description, qty, unit_price, line_total }]
}
```

---

### 4️⃣ **🔍 SEMANTİK SINIFLANDIRMA** (Semantic Classification)
**Module:** `src/main/ai/semanticClassifier.ts`  
**Method:** Hybrid (Heuristic + BGE-M3 LLM)

**İşlemler:**
1. **Heuristic Classification** (hızlı, %70+ güven → LLM atla)
   - Filename kontrolü (`invoice`, `fatura`, `teklif`)
   - Metadata kontrolü
   - Keyword tarama

2. **Semantic Classification** (LLM, sadece düşük güvende)
   - Gemma 3:4B ile içerik analizi
   - 10 saniyelik timeout
   - Confidence scoring

**Çıktı:**
```typescript
{
  type: 'fatura' | 'teklif' | 'fis' | 'irsaliye' | 'sozlesme' | 'diger',
  confidence: { classification: 0.85, heuristic_score: 0.7, semantic_score: 0.9 },
  method: 'hybrid' | 'heuristic_only'
}
```

---

### 5️⃣ **📝 NORMALİZASYON** (Normalization to Canonical Schema)
**Module:** `src/main/ai/documentNormalizer.ts`  
**Schema:** `src/main/ai/canonicalSchema.ts`

**İşlemler:**
- Key mapping (`FATURA_NO` → `invoice_no`)
- Date normalization (`dd.mm.yyyy` → ISO8601)
- Number parsing (Türkçe format → decimal)
- Currency normalization (`TL` → `TRY`)
- **🆕 Tablo verilerini entegre etme**
  - Line items ekleme
  - Total hesaplama (eğer yoksa)
- Source sample generation (embedding için özet)

**Çıktı:**
```typescript
NormalizedDocument {
  schema_v: 1,
  id: "docx_1760183776160_k3jdgmrzu",
  type: "fatura",
  invoice_no: "13TVEI4D-0002",
  date: "2025-01-15T00:00:00.000Z",
  total: 12345.67,
  items: [...], // 🆕 Tablodan çıkarıldı
  tables: [...], // 🆕 Tablo metadata
  summary: {...}, // 🆕 AI özeti (sonraki adımda)
}
```

---

### 6️⃣ **📄 AI ÖZETLEME** (AI Summary Generation) 🆕
**Module:** `src/main/ai/documentSummarizer.ts`  
**LLM:** Gemma 3:4B (Türkçe destek)

**İşlemler:**
- Belge türüne özel prompt oluşturma
- LLM ile doğal dil özeti
- Anahtar noktalar çıkarımı
- Fallback: Extractive summary (LLM hata verirse)

**Çıktı:**
```typescript
{
  summary: {
    text: "Bu belge ACME Corp'tan alınan 13TVEI4D-0002 numaralı faturadır...",
    keyPoints: [
      "Toplam tutar: 12,345.67 TRY",
      "Tedarikçi: ACME Corp",
      "5 kalem ürün içeriyor"
    ],
    confidence: 0.85,
    language: "tr"
  }
}
```

---

### 7️⃣ **✅ DOĞRULAMA** (Validation)
**Module:** `DocumentValidator` (in `canonicalSchema.ts`)

**Kontroller:**
- Required fields kontrolü
- Confidence threshold (<0.6 → human review)
- Date format (ISO8601)
- Invoice-specific rules (invoice_no, total)

**Çıktı:**
```typescript
{
  valid: true,
  errors: [],
  warnings: ["Low classification confidence"],
  needs_human_review: true/false
}
```

---

### 8️⃣ **🧮 EMBEDDING GENERATION** (BGE-M3)
**Module:** `src/main/ai/embedClient.ts`  
**Model:** BGE-M3 (via model_server)

**İşlemler:**
- `source_sample` → embedding vector
- Dimension: 1024
- Storage with document

---

### 9️⃣ **💾 DEPOLAMA** (Storage)
**Module:** `src/main/ai/localRetrievalClient.ts`  
**Location:** `AppData/Roaming/Electron/local-ai-storage.json`

**Depolanan Veri:**
```json
{
  "documents": [
    {
      "documentId": "docx_1760183776160_k3jdgmrzu",
      "filename": "Invoice-13TVEI4D-0002.docx",
      "fileType": "DOCX",
      "textSections": [...],
      "metadata": {
        "model": "BGE-M3",
        "embedding_dim": 1024,
        "normalized": true, // 🆕
        "canonical_doc": {
          "type": "fatura",
          "invoice_no": "13TVEI4D-0002",
          "total": 12345.67,
          "items": [...], // 🆕 Tablodan
          "summary": {...} // 🆕 AI özeti
        }
      },
      "embedding": [0.123, 0.456, ...] // 1024 boyut
    }
  ]
}
```

---

### 🔟 **🤖 CHATBOT HAZIR** (Ready for Chatbot)
**Module:** `src/main/ai/chatController.ts`

**Chatbot Yetenekleri:**
1. **Meta Queries** (Doğrudan yanıt, LLM YOK)
   - "Hangi belgeler var?" → Belge listesi
   - "Kaç fatura var?" → Aggregate sayım

2. **🆕 Summarize Queries** (AI-powered)
   - "Invoice-13TVEI4D-0002.docx özetle" → AI özeti + anahtar noktalar
   - "özetle" (tek belge varsa)

3. **Document Queries** (Retrieval + LLM)
   - "Fatura tutarı kaç?" → Retrieval → LLM
   - "İçinde ne var?" → Retrieval → LLM

4. **Aggregate Queries** (Numeric computation)
   - "Toplam kaç fatura var?" → AggregationService
   - "Ortalama tutar nedir?" → SQL-like aggregation

---

## ⏱️ PERFORMANS OPTİMİZASYONU

### Hız İyileştirmeleri:
1. ✅ **Heuristic-first classification** → LLM atla (%70+ confidence)
2. ✅ **10 saniyelik LLM timeout** → Freeze önleme
3. ✅ **Retrieval cache** → Tekrar aramalar anında
4. ✅ **BM25 hybrid search** → Keyword relevance
5. ✅ **Conversation history filtering** → Son 5 mesaj

### LLM Modeli:
- ✅ **Gemma 3:4B** (4.0 GB) - GTX 1650 için optimize
- ❌ ~DeepSeek R1:8B~ (5.2 GB) - Çok büyük, timeout

---

## 🎯 KULLANICI DENEYİMİ

### Upload Sonrası Otomatik:
```
1. Dosya yüklendi
2. Text extraction (1-2 sn)
3. 📊 Tablo çıkarımı (0.5 sn) 🆕
4. 🔍 Sınıflandırma (0.5-2 sn)
5. 📝 Normalizasyon (0.1 sn)
6. 📄 AI özeti (2-5 sn) 🆕
7. 🧮 Embedding (1-2 sn)
8. 💾 Depolama (0.1 sn)
9. ✅ Chatbot'a hazır! (Toplam: ~5-15 sn)
```

### Chatbot'ta Örnek Senaryolar:

**Senaryo 1: Belge Listesi**
```
Kullanıcı: "Hangi belgeler var?"
Asistan: Toplam 5 belge yüklü:
• Invoice-001.docx (Fatura)
• Offer-002.xlsx (Teklif)
• Receipt-003.pdf (Fiş)
```

**Senaryo 2: 🆕 Belge Özeti**
```
Kullanıcı: "Invoice-001.docx özetle"
Asistan: 📄 Invoice-001.docx Özeti

ACME Corp'tan alınan fatura. Toplam 12,345.67 TRY tutarında 5 kalem içeriyor.

Anahtar Noktalar:
• Fatura No: 13TVEI4D-0002
• Tarih: 15.01.2025
• Tedarikçi: ACME Corp
• KDV Dahil Toplam: 12,345.67 TRY
• 5 ürün kalemi
```

**Senaryo 3: Detaylı Sorgulama**
```
Kullanıcı: "Invoice-001'de hangi ürünler var?"
Asistan: Bu faturada 5 ürün kalemi var:

• Widget Pro (10 adet × 123.45 TRY)
• Gadget Ultra (5 adet × 456.78 TRY)
...

Toplam: 12,345.67 TRY
```

**Senaryo 4: Aggregate Analiz**
```
Kullanıcı: "Toplam kaç fatura var?"
Asistan: 3 adet fatura yüklü.

Toplam tutar: 45,678.90 TRY
Ortalama: 15,226.30 TRY
```

---

## 🛠️ MODÜL YAPISI

```
src/main/
├── services/              # Temel analiz servisleri
│   ├── DOCXAnalysisService.ts   → Text extraction
│   ├── ExcelAnalysisService.ts  → Excel parsing
│   └── PDFAnalysisService.ts    → PDF parsing
│
├── ai/                    # AI ve RAG pipeline
│   ├── 📊 tableExtractor.ts          → 🆕 Tablo çıkarımı
│   ├── 📝 documentSummarizer.ts      → 🆕 AI özetleme
│   ├── semanticClassifier.ts         → Belge sınıflandırma
│   ├── documentNormalizer.ts         → Canonical schema'ya dönüştürme
│   ├── documentIngestPipeline.ts     → Tam workflow orchestration
│   ├── embedClient.ts                → BGE-M3 embeddings
│   ├── localRetrievalClient.ts       → localStorage yönetimi
│   ├── documentRetriever.ts          → Hybrid search (BM25 + semantic)
│   ├── chatController.ts             → Chatbot logic
│   ├── llamaClient.ts                → LLM API (Gemma 3:4B)
│   ├── aggregationService.ts         → SQL-like aggregation
│   └── canonicalSchema.ts            → Standart veri yapısı
│
└── ipc-handlers.ts        # IPC event handlers
```

---

## 📊 CANONICAL SCHEMA (NormalizedDocument)

```typescript
interface NormalizedDocument {
  // Core
  schema_v: 1,
  id: string,
  filename: string,
  type: 'fatura' | 'teklif' | 'fis' | 'irsaliye' | 'sozlesme' | 'diger',

  // Invoice fields
  invoice_no: string | null,
  date: string | null, // ISO8601
  supplier: string | null,
  buyer: string | null,
  currency: string | null,
  total: number | null,
  tax: number | null,
  items: LineItem[], // 🆕 Tablodan çıkarılır

  // Metadata
  confidence: { classification: 0.85, heuristic: 0.7, semantic: 0.9 },
  normalized_at: string,
  needs_human_review: boolean,

  // AI Features 🆕
  summary?: {
    text: string,
    keyPoints: string[],
    confidence: number,
    language: 'tr' | 'en'
  },
  tables?: [{
    id: string,
    type: 'data' | 'line_items' | 'summary',
    headers: string[],
    rowCount: number
  }],

  // Embedding
  embedding?: number[], // 1024 dim (BGE-M3)
  embedding_model: "bge-m3",
  source_sample: string, // Embedding için özet

  // Audit
  processing_log: ProcessingLogEntry[]
}
```

---

## 🚀 ENTEGRE ÖZELLİKLER

### ✅ Mevcut Özellikler:
- [x] Multi-format support (PDF, DOCX, Excel, PowerPoint)
- [x] Semantic classification (BGE-M3 + Heuristic)
- [x] Canonical schema normalization
- [x] Conversation memory
- [x] Hybrid search (BM25 + semantic)
- [x] SQL-like aggregation
- [x] GPU memory monitoring

### 🆕 YENİ ÖZELLİKLER (DocMind AI'den):
- [x] **Tablo Tanıma** → DOCX/Excel tablolarından otomatik line_items
- [x] **AI Özetleme** → LLM ile doğal dil özetleri + anahtar noktalar
- [ ] OCR Entegrasyonu (gelecek)
- [ ] PII Detection (gelecek)
- [ ] Veri görselleştirme (gelecek)

---

## 🎨 CHATBOT KOMUTLARI

### Meta Komutlar (Doğrudan Yanıt):
```
"Hangi belgeler var?"      → Belge listesi
"Kaç belge var?"           → Belge sayısı
"Invoice-001.docx"         → Dosya bilgisi
```

### 🆕 Özetleme Komutları:
```
"özetle"                   → Tek belge varsa özetler
"Invoice-001.docx özetle"  → Belirtilen belgeyi özetler
"summarize Invoice-001"    → İngilizce komut
```

### Döküman Sorguları (Retrieval):
```
"Invoice-001'de ne var?"   → İçerik sorgusu
"Fatura tutarı kaç?"       → Numeric extraction
"Hangi ürünler var?"       → Line items sorgusu
```

### Aggregate Sorguları:
```
"Toplam kaç fatura var?"   → COUNT
"Ortalama tutar nedir?"    → AVG
"En yüksek fatura?"        → MAX
```

---

## 🔧 KONFİGÜRASYON

### Ingest Pipeline Options:
```typescript
{
  generateSummary: true,        // source_sample oluştur
  generateAISummary: true,      // 🆕 AI özeti oluştur
  extractTables: true,          // 🆕 Tabloları çıkar
  skipEmbedding: false,         // BGE-M3 embedding
  skipValidation: false,        // Schema validation
  autoReview: true,             // Düşük güvende flag
}
```

### LLM Ayarları:
```typescript
{
  model: "gemma3:4b-it-qat",   // 4GB, hızlı
  timeout: 180000,              // 3 dakika
  temperature: 0.1,             // Deterministik
  num_predict: 800,             // Max token
}
```

---

## 📈 PERFORMANS METRİKLERİ

### Ortalama İşlem Süreleri:
- DOCX analysis: ~1-2 sn
- 📊 Table extraction: ~0.5 sn 🆕
- Semantic classification: ~0.5-2 sn (heuristic atlarsa 0.1 sn)
- Normalization: ~0.1 sn
- 📄 AI summary: ~2-5 sn 🆕
- Embedding generation: ~1-2 sn
- **TOPLAM: ~5-15 saniye** (AI özeti dahil)

### GPU Kullanımı:
- Gemma 3:4B: ~3.8 GB (GTX 1650 için optimal)
- BGE-M3: ~1.5 GB
- **Toplam:** ~4 GB (Max GPU capacity: 4 GB)

---

## 🎯 SONUÇ

**Optimize Edilmiş Süreç:**
```
Upload → Extract → 📊 Tables → 🔍 Classify → 📝 Normalize → 
📄 Summarize → 🧮 Embed → 💾 Store → 🤖 Chatbot Ready!
```

**Kullanıcı deneyimi:**
1. ✅ Tek tıkla dosya yükle
2. ✅ 5-15 saniye bekle (arka planda otomatik)
3. ✅ Chatbot'ta sor:
   - "Özetle" → Anında özet
   - "Kaç fatura var?" → Doğrudan cevap
   - "İçinde ne var?" → Akıllı yanıt

**Veri kalitesi:**
- ✅ Canonical schema (standardize)
- ✅ Tablo verisi strukturize
- ✅ AI özeti her belgede
- ✅ Validation ve review flags
- ✅ Immutable, versioned records

---

Bu doküman sisteminizin **tam organizasyon ve workflow dokümantasyonudur**.

