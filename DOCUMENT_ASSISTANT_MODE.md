# 📄 Doküman Asistanı Modu - Kullanım Kılavuzu

## 🎯 Genel Bakış

Doküman Asistanı Modu, localStorage'da saklanan belgeleri doğal dilde analiz eden ve sanki belgeleri "anlamışçasına" yanıt veren modern bir AI modudur.

---

## 🧩 Temel Özellikler

### 1. **Belge Tanıma & Analiz**
- Belgeler localStorage'dan JSON formatında yüklenir
- Her belge: `documentId`, `filename`, `fileType`, `textSections` içerir
- AI, belgelerdeki `content` alanlarını doğal dilde yorumlar

### 2. **Akıllı Arama Sistemi**

**Öncelik Sırası:**
1. **Dosya adı (tam/kısmi)** → Dosya adı verilmişse o dosyayı anında tespit eder
   - Örnek: "Invoice-13TVEI4D" → "Invoice-13TVEI4D-0002.docx" eşleşir
   - Büyük/küçük harf önemsiz, uzantı (.pdf, .docx) görmezden gelinir
   
2. **Metadata → İçerik → Fuzzy** → Dosya adı yoksa metadata ve içerik taraması yapar

3. **Excel/CSV sheet'leri** → Ayrı belge gibi ele alınır

### 3. **Doğal Yanıt Formatı**

**Yanıt Özellikleri:**
- Doğal, açıklayıcı ve kısa cümleler
- Gereksiz "kaynak listeleri" veya "benzerlik oranları" yok
- Belgelerdeki verileri sanki "okuyup anlamış" gibi özetler
- Kullanıcı sormadan dosya adı/sayfa numarası tekrarlamaz

**Format Yasağı:**
- ❌ Numaralı liste (1., 2., 3.)
- ❌ Markdown bold (**)
- ❌ Gereksiz başlık
- ❌ Uydurma yasak!

---

## 🔍 Kullanım Örnekleri

### Örnek 1: Belge Listesi
```
Kullanıcı: "Hangi belgeler var?"
AI: "3 belge mevcut: sample-invoice.pdf, Employee Data.xlsx ve Contract.docx. Hangisini inceleyeyim?"
```

### Örnek 2: Belge İçeriği
```
Kullanıcı: "sample-invoice.pdf dosyasında ne var?"
AI: "Bu dosya bir fatura örneği. İçinde CPB Software GmbH ve Musterkunde AG'ye ait müşteri bilgileri var."
```

### Örnek 3: Fatura Tutarı
```
Kullanıcı: "Fatura miktarı ne?"
AI: "Faturada belirtilen tutar 1.000,00 EUR. Ancak belgeye göre KDV bilgisi eksik olabilir."
```

### Örnek 4: Belge Sayısı
```
Kullanıcı: "Toplam kaç doküman yükledim?"
AI: "Şu anda localStorage'da 3 doküman kayıtlı. İstersen her birini özetleyebilirim."
```

---

## ⚙️ Teknik Detaylar

### Optimizasyonlar
- **Chunk Limiti:** İlgili 20 içerik içinde arama yapar
- **Fuzzy Matching:** Türkçe eşanlamlı kelimeler (fatura↔invoice)
- **Excel Desteği:** Satır/sütun bazlı sorgu
- **Sayısal Öncelik:** Parasal ve tablo benzeri ifadeleri tanımlar

### Özel Kurallar

**Fatura (Invoice):**
- `invoice_no`, `invoice_date (YYYY-MM-DD)`, `total_amount (+ currency)`, `seller`, `buyer`

**Excel:**
- Sütun adları, satır sayısı, departman özeti

**PDF:**
- Sayfa numaralı snippet

**Word:**
- Başlık + paragraf özeti

---

## 🚀 Entegrasyon

### Ollama ile Kullanım (Node.js / Electron)

```typescript
import { LlamaClient } from './ai/llamaClient';

const llamaClient = new LlamaClient();

// LOCAL_DOCS formatı
const localDocs = [
  {
    documentId: "doc-123",
    filename: "sample-invoice.pdf",
    fileType: "PDF",
    textSections: [
      { id: "sec-1", content: "Invoice No: INV-001..." },
      { id: "sec-2", content: "Total Amount: 1.000,00 EUR..." }
    ]
  }
];

// Doküman-aware chat
const response = await llamaClient.documentAwareChat(
  "Fatura tutarı ne?",
  localDocs,
  { maxRefs: 5 },
  conversationHistory
);

console.log(response.text);
// Output: "Faturada belirtilen tutar 1.000,00 EUR."
```

### Alternatif Spawn Metodu

```typescript
const { spawn } = require('child_process');
const fs = require('fs');

const systemPrompt = fs.readFileSync('./prompts/docAssistant.txt', 'utf-8');

const ollama = spawn('ollama', [
  'run',
  'deepseek-r1:8b-0528-qwen3-q4_K_M',
  '--system', systemPrompt,
  '--prompt', `${userQuestion}\n\nLOCAL_DOCS:\n${JSON.stringify(localDocs).slice(0, 10000)}`
]);
```

---

## 📊 Performans

| Metrik | Değer |
|--------|-------|
| Chunk boyutu | ~500 token |
| Max sections | 20 per belge |
| Timeout | 180 saniye |
| Temperature | 0.15 (doğruluk için) |
| Max predict | 400 token |

---

## 🐛 Hata Durumları

### Belge Bulunamadı
```
Kullanıcı: "XYZ dosyasında ne var?"
AI: "Belgelerinizde bu bilgiye rastlamadım. Deneyebileceğiniz alternatifler: 
1) daha spesifik anahtar kelime
2) dosya adını yazın (örn. Invoice-13TVEI4D-0002.docx)
3) arama kapsamını genişletin."
```

### Veri Eksik
```
Kullanıcı: "Fatura tutarı ne?"
AI: "Bu belge fatura yapısında ama tutar alanı boş olabilir, istersen kontrol edebilirim."
```

---

## 🎯 Davranış Stili

- **Akışkan:** Gerçek bir AI gibi konuşur
- **Bağlam Takibi:** Önceki soruları hatırlar
- **Sezgisel:** Kullanıcının ne istediğini anlar
- **Profesyonel:** Nazik, kısa ve öz yanıtlar

---

## 📝 Notlar

- System prompt versiyonu: **v2.0 (Professional Edition)**
- Desteklenen modeller: `deepseek-r1:8b-0528-qwen3-q4_K_M`, `llama3.2:3b`
- Optimum dil: **Türkçe**
- JSON format: Strict typing ile güvenli

---

## 🔗 İlgili Dosyalar

- `src/main/ai/llamaClient.ts` - LlamaClient implementasyonu
- `src/main/ai/chatController.ts` - Chat yönetimi
- `src/main/ai/documentRetriever.ts` - Belge arama motoru
- `LLAMA_PROMPTS.documentAssistant` - System prompt

---

**Son Güncelleme:** 2025-10-10  
**Geliştirici:** DocDataApp Team

