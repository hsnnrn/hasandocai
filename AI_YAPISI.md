# 🤖 AI Yapısı ve Mimarisi

## 📋 Genel Bakış

DocDataApp'te **çift modlu AI chatbot** sistemi bulunmaktadır:

1. **Basit Sohbet Modu**: LLM (Gemma2/Llama) ile genel konuşma
2. **Doküman Asistanı Modu**: Yerel belgelerle entegre akıllı arama ve analiz

---

## 🏗️ Mimari Akış

### Basit Sohbet Modu
```
Kullanıcı Sorusu → LLM (Ollama) → Yanıt
```

### Doküman Asistanı Modu (Gelişmiş)
```
1. Kullanıcı Sorusu
   ↓
2. LOCAL_DOCS Retrieval (Anahtar Kelime + N-gram + Semantik Eşleşme)
   ↓
3. İlgi Skoru Hesaplama (0.0-1.0, eşik: 0.2)
   ↓
4. Sayısal Veri Çıkarma (Türkçe format: 1.234,56 TL)
   ↓
5. Toplama İşlemleri (Toplam, Ortalama, Medyan)
   ↓
6. LLM ile İşleme → Doğal dil yanıtı + __meta__ JSON
   ↓
7. Yanıt + Metadata (kaynaklar, sayılar, istatistikler)
```

---

## 📁 Ana Bileşenler

| Dosya | Görev |
|-------|-------|
| **chatController.ts** | Tüm AI işlemlerini yöneten ana kontrol merkezi |
| **documentRetriever.ts** | LOCAL_DOCS'tan ilgili bölümleri bulur (keyword, n-gram, semantic) |
| **llamaClient.ts** | Ollama LLM ile iletişim (Gemma2, Llama 3.2, Qwen) |
| **localRetrievalClient.ts** | Yerel dokümanlara özel retrieval mantığı |
| **numericExtractor.ts** | Türkçe sayısal değerleri ayıklar (₺1.234,56 formatı) |
| **aggregator.ts** | Toplama/ortalama/medyan hesaplama |
| **localStorageMigrator.ts** | localStorage ile çalışma |

### Dosya Konumları
```
src/main/ai/
├── chatController.ts          # Ana kontrol merkezi
├── documentRetriever.ts       # Doküman arama ve retrieval
├── llamaClient.ts            # LLM iletişimi
├── localRetrievalClient.ts   # Yerel retrieval
├── numericExtractor.ts       # Sayı çıkarma
├── aggregator.ts             # Aggregation
└── localStorageMigrator.ts   # Storage işlemleri
```

---

## 🔍 Retrieval Stratejisi (Arama)

AI, kullanıcı sorgusuna en uygun doküman bölümlerini bulmak için **4 katmanlı** bir arama stratejisi kullanır:

### 1. Tam Eşleşme (Exact Match) - Score: 1.0
- Sorgu metinde aynen geçiyorsa
- En yüksek öncelik

### 2. Kısmi Kelime Eşleşmesi (Partial Match) - Score: 0.9
- Jaccard benzerliği ile kelime kümesi karşılaştırması
- Ortak kelime sayısı / toplam benzersiz kelime sayısı

### 3. N-gram Eşleşmesi - Score: 0.7
- 3 kelimelik gruplar (trigram)
- Kelime sırası önemli

### 4. Semantik Skor - Score: 0.6
- Önek/sonek eşleşmeleri
- İlişkili terim tespiti

### Türkçe Normalizasyon
Tüm aramalar öncesinde Türkçe karakterler normalize edilir:
- ı → i
- ğ → g
- ü → u
- ş → s
- ö → o
- ç → c

### Özel Sorgu İşlemleri
**Genel Sorgular** ("belgelerde ne var", "listele", vs.):
- Tüm dokümanlardan ilk 10 bölümü birleştirir
- Relevance score: 0.95
- Her belgeden kapsamlı özet sunar

---

## 🔢 Sayısal Veri İşleme

### Desteklenen Formatlar

| Format | Örnek | Çıktı |
|--------|-------|-------|
| Türk Lirası | ₺1.234,56 | 1234.56 TRY |
| Dolar | $100.50 | 100.50 USD |
| Euro | €250,00 | 250.00 EUR |
| TL Kodu | 1.234,56 TL | 1234.56 TRY |
| USD Kodu | 500 USD | 500 USD |

### Pattern Tespiti

**Pattern 1**: Para birimi sembolü + sayı
```regex
([₺$€£])\s*([\d.,]+)
```

**Pattern 2**: Sayı + para birimi kodu
```regex
([\d.,]+)\s*(TRY|TL|USD|EUR|GBP|EURO)
```

**Pattern 3**: Bağımsız sayılar
```regex
\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\b
```

### Türkçe Sayı Formatı Parse
- **Türk Formatı**: `1.234,56` → nokta binlik ayırıcı, virgül ondalık
- **İngiliz Formatı**: `1,234.56` → virgül binlik ayırıcı, nokta ondalık
- Son ayırıcıya bakarak format otomatik tespit edilir

### Hesaplamalar (Deterministik)

```javascript
{
  count: number,      // Toplam değer sayısı
  sum: number,        // Toplam
  avg: number,        // Ortalama
  median: number,     // Medyan
  min: number,        // En küçük
  max: number,        // En büyük
  currency: string    // Baskın para birimi
}
```

---

## 🌐 AI Ulaştığı Yerler

### ✅ Yerel Sistemler

| Sistem | Port | Açıklama |
|--------|------|----------|
| **LocalStorage** | - | Tüm işlenmiş belgeler (`LOCAL_DOCS`) |
| **Ollama API** | 11434 | LLM modelleri (Gemma2, Llama, Qwen) |
| **BGE-M3 Embedding** | 7860 | Embedding hesaplamaları |
| **Renderer Process** | - | Frontend ChatBot bileşeni |
| **IPC Channels** | - | Main↔Renderer iletişimi |

### 🚫 Kullanılmayan Sistemler
- **Supabase/External DB**: HAYIR - Tamamen yerel çalışır
- **Internet API'ler**: HAYIR - Offline çalışabilir
- **Harici Servisler**: HAYIR - Kendi kendine yeterli

---

## ⚙️ Konfigürasyon ve Parametreler

### LLM Ayarları

| Parametre | Değer | Açıklama |
|-----------|-------|----------|
| **Temperature** | 0.15 | Düşük = deterministik, tutarlı yanıtlar |
| **Max References** | 5 | Maksimum doküman bölümü |
| **Min Relevance Score** | 0.2 | İlgi eşik değeri |
| **Context Window** | 8K-128K | Modele göre değişir |
| **Conversation Memory** | 5-10 mesaj | Konuşma geçmişi |

### Desteklenen Modeller

| Model | Boyut | RAM | Context | Türkçe | Önerilen |
|-------|-------|-----|---------|--------|----------|
| **Gemma2:2b** | 2B | ~1.5GB | 8K | ⭐⭐⭐⭐ | **ÖNERİLEN** |
| **Llama 3.2:3b** | 3B | ~2GB | 8K | ⭐⭐⭐ | Hızlı yanıt |
| **Qwen 2.5:7b** | 7B | ~4.5GB | 128K | ⭐⭐⭐⭐ | En iyi genel |

> 💡 **Tavsiye**: Hızlı ve hafif çalışma için **Gemma2:2b** kullanın - düşük bellek kullanımı ve iyi Türkçe desteği.

> 📦 **Gemma2 Notu**: Google'ın açık kaynaklı modeli, hızlı inference ve çok dilli destek için optimize edilmiştir.

---

## 🎯 Özellikler

### ✅ Temel Özellikler
- **Türkçe Dil Desteği**: TDK uyumlu doğal Türkçe
- **Anomali Tespiti**: Çelişkili veriler ve kalite kontrolü
- **Structured JSON Çıktı**: `__meta__` bloğu ile zengin metadata
- **Fallback Mode**: LLM çalışmasa bile temel yanıt verir
- **Çoklu Para Birimi**: TRY, USD, EUR, GBP desteği
- **Konuşma Hafızası**: Context-aware sohbet

### 🔧 İleri Seviye
- **Hybrid Retrieval**: Keyword + Semantic + N-gram
- **Deterministic Computation**: Backend'de kesin hesaplama
- **Turkish Locale**: Tam Türkçe format desteği (1.234,56)
- **Metadata Extraction**: Otomatik kaynak ve referans çıkarma
- **Quality Verification**: Veri doğrulama ve güven skoru

---

## 📊 Veri Akışı Detayı

### 1. Kullanıcı Sorgusu Gelir
```typescript
{
  userId: string,
  query: string,
  localDocs: LocalDocument[],
  conversationHistory: ChatMessage[]
}
```

### 2. Document Retrieval
```typescript
// documentRetriever.ts
retrieveRelevantSections(query, localDocs, options)
→ RetrievalResult[] // relevanceScore ile sıralı
```

### 3. Numeric Extraction
```typescript
// documentRetriever.ts
extractNumericValues(text, sectionId)
→ NumericValue[] // { rawValue, parsedValue, currency }
```

### 4. Aggregation
```typescript
// documentRetriever.ts
computeAggregates(numericValues)
→ { count, sum, avg, median, min, max, currency }
```

### 5. LLM Processing
```typescript
// llamaClient.ts
documentAwareChat(query, enrichedDocs, options, history)
→ { text, model } // Natural language + __meta__ JSON
```

### 6. Response Construction
```typescript
{
  success: true,
  payload: {
    answer: string,           // Temiz yanıt
    meta: {                   // Metadata
      references: [],
      numericValues: [],
      aggregates: {},
      confidence: number
    },
    modelMeta: {
      model: string,
      latencyMs: number
    }
  }
}
```

---

## 🔄 IPC İletişimi

### Main Process → Renderer
```typescript
// src/main/ipc-handlers.ts
ipcMain.handle('ai:chat', async (event, request) => {
  return chatController.handleChatQuery(request);
});

ipcMain.handle('ai:document-chat', async (event, request) => {
  return chatController.handleDocumentChatQuery(request);
});
```

### Renderer → Main
```typescript
// ChatBot.tsx
const response = await window.electron.ipcRenderer.invoke(
  'ai:document-chat',
  { userId, query, localDocs, options, conversationHistory }
);
```

---

## 🧪 Test ve Debug

### Health Check
```typescript
const health = await chatController.healthCheck();
// { llama: true/false }
```

### Console Logs
- `🤖` ChatController işlemleri
- `📄` Document chat işlemleri
- `🔍` Retrieval sonuçları
- `🔢` Numeric extraction
- `📊` Aggregation sonuçları
- `✅` Başarılı işlemler
- `❌` Hatalar

### Test Dosyaları
```
tests/
├── aggregator.test.ts
├── deepAnalysis.test.ts
└── numericExtractor.test.ts
```

---

## 📚 İlgili Dökümanlar

- **README-chatbot.md**: Detaylı kurulum ve kullanım kılavuzu
- **CHATBOT_DEBUG_GUIDE.md**: Debug ve sorun giderme
- **OLLAMA_AUTO_START.md**: Ollama otomatik başlatma
- **PERSISTENT_STORAGE_README.md**: LocalStorage yapısı
- **HYBRID_STORAGE_SOLUTION.md**: Hybrid storage mimarisi

---

## 🚀 Hızlı Başlangıç

### 1. Ollama Kurulumu
```bash
# https://ollama.ai/download
ollama run gemma2:2b
```

### 2. BGE-M3 Embedding Server
```bash
cd model_server
pip install -r requirements.txt
python app.py
```

### 3. Uygulamayı Başlat
```bash
npm install
npm run dev
```

### 4. Chatbot'u Test Et
1. Ayarlar sayfasından "Document Assistant Mode" seçin
2. Model olarak `gemma2:2b` seçin
3. Belge yükleyin ve analiz edin
4. Chatbot'ta sorunuzu sorun!

---

## 💡 En İyi Pratikler

1. **Hızlı ve hafif çalışma için Gemma2 kullanın** - Düşük bellek, iyi Türkçe desteği
2. **Temperature'ı düşük tutun** (0.15) - Deterministik yanıtlar
3. **Max References'ı optimize edin** - Çok fazla context token israfı yapar
4. **General queries için özel logic** - "Belgelerde ne var" gibi sorgular için
5. **Numeric extraction'ı test edin** - Farklı format desteği için
6. **Conversation history'yi sınırlayın** - 5-10 mesaj yeterli

---

## ⚠️ Bilinen Sınırlamalar

1. **Semantic Search**: Şu an basitleştirilmiş heuristic kullanıyor (embedding tabanlı değil)
2. **Multi-modal**: Sadece metin, görsel/tablo analizi yok
3. **Real-time Learning**: Model fine-tuning yok, sadece retrieval
4. **Language Detection**: Manuel mod seçimi gerekli
5. **Context Window**: Model'e göre değişiyor (8K-128K)

---

## 🔐 Güvenlik

- ✅ **Tamamen Yerel**: İnternet bağlantısı gerektirmez
- ✅ **No External API**: Veri dışarı gönderilmez
- ✅ **Privacy First**: Belgeler sadece localStorage'da
- ✅ **Offline Capable**: Tüm işlemler local

---

## 📈 Performans

| İşlem | Süre (ortalama) |
|-------|-----------------|
| Document Retrieval | 10-50ms |
| Numeric Extraction | 5-20ms |
| Aggregation | 1-5ms |
| LLM Response | 500-3000ms |
| Total Latency | 0.5-3 saniye |

**Optimizasyon İpuçları:**
- Küçük model = hızlı yanıt (Llama 3.2:3b)
- GPU kullanımı = 2-3x hızlanma
- Token limiti azaltma = daha hızlı

