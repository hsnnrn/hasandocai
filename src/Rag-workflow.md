# RAG İş Akışı — Gemma 3:4B & bge-m3 ile Fatura Analizi

## Özet

Bu doküman, diskindeki JSON belgeleri (özellikle faturalar) güvenilir, tekrarlanabilir ve **Cursor kurallarına** uyacak şekilde analiz eden tam iş akışını açıklar. Amaç: dosya türünü (fatura/teklif/fiş/sözleşme vb.) doğru sınıflandırmak, normalize etmek, embedding üretip vektör veritabanına kaydetmek ve sonra **Gemma 3:4B** ile anlamlı analizler üretmektir. **bge-m3** embedding ve semantic sınıflandırma için kullanılır.

> **Kilit prensip:** Cursor bu kuralları *kural seti* olarak edinecek; giriş (ingest) aşamasındaki validasyon ve normalize edilmiş şema korunacak. Yapıyı bozan işlemler reddedilecek veya insan onayına gönderilecek.

---

# 1. Hedefler

* Diskteki her belgeyi otomatik olarak sınıflandırmak (fatura, teklif, fiş,...).
* Faturaları kanonik bir şemaya dönüştürmek (normalize etmek).
* Özet/summary üretip `bge-m3` ile embedding almak ve vektör DB'ye indexlemek.
* Doğal dil sorularına **Gemma 3:4B** ile güvenilir, kaynak gösterilebilir yanıtlar üretmek.
* Cursor üzerinde kurallar (validation, schema enforcement, reindex policy) oluşturmak.

---

# 2. Varsayımlar

* Belgeler JSON formatında disk üzerinde tutuluyor.
* `bge-m3` embedding/semantic modelleri yerelde veya erişilebilir API ile kullanılabiliyor.
* `Gemma 3:4B` yerel inference için mevcut (Ollama / LM Studio / Cursor üzerinden).
* Vector DB: Supabase Vector / ChromaDB / LanceDB kullanılabilir.

---

# 3. Mimarinin genel görünümü

```
[Disk JSON files]
     ↓ (ingest)
[Ingest Service]
  - filename heuristics
  - JSON schema matcher
  - semantic classifier (bge-m3)
  - normalizer
     ↓
[Normalized JSON + Metadata]
     ↓
[Embedding Service (bge-m3)] → [Vector DB]
     ↓
[Retrieval Service]
     ↓
[Prompt Composer] → [Gemma 3:4B] → [User Answer]

Audit/Logging/Versioning & Cursor Rule Enforcement (throughout)
```

---

# 4. Kanonik (Canonical) Fatura Şeması

Kayıtlı normalleştirilmiş her fatura şu alanları içermeli (zorunlu ve opsiyonel):

```json
{
  "schema_v": 1,
  "id": "GUID",
  "filename": "string",
  "type": "fatura",           // fatura / teklif / fis / diger
  "invoice_no": "string|null",
  "date": "ISO8601|null",
  "supplier": "string|null",
  "buyer": "string|null",
  "currency": "string (TRY)|null",
  "total": number|null,
  "tax": number|null,
  "items": [
    {"description":"string","qty":number,"unit_price":number,"line_total":number}
  ],
  "raw_path": "string",
  "confidence": {"classification":0.0},
  "normalized_at": "ISO8601",
  "source_sample": "short_text_summary"
}
```

`confidence.classification` — semantic classifier sonuç güveni (0-1). Eğer <0.6 ise `needs_human_review: true` ekle.

---

# 5. Ingest Aşaması — Adımlar

1. **Dosya tarama** (folder watcher veya batch job).
2. **Filename heuristics** (hızlı kontrol): anahtar kelime arama (`fatura, invoice, irsaliye, teklif, receipt...`).
3. **JSON parse & shallow key-mapping**: `KEY_MAP` ile yaygın alan isimlerini convert et.
4. **Semantic classification (bge-m3)**:

   * Kısa `to_text()` özet oluştur (örn. `invoice_no, date, toplam, kdv` alanlarını string haline getir).
   * bge-m3'e prompt gönder: "Bu belge tipini tahmin et: fatura/teklif/fiş/irsaliye/sözleşme"
   * model `type` + `confidence` döndürsün.
5. **Deterministic fallback**: Eğer heuristic ya da key-mapping kesinse ona göre ata; semantic düşük güvenliyse `needs_human_review` koy.
6. **Normalize**: `normalizeInvoice()` çalıştır → kanonik şema.
7. **Validation**: Şema zorunlu alanları check et. (eğer `total` yoksa `items` üzerinden toplam denenir).
8. **Summary (source_sample)**: Kısa bir metin özet hazırlanır (5-8 satır) → embedding için kullanılacak.
9. **Embedding**: bge-m3 embedding endpoint → vektör DB'ye kaydet (metadata ile birlikte).
10. **Audit log**: Tüm adımlar, confidence değerleri ve hata/uyarılar loglanır.

---

# 6. Semantic Classification — bge-m3 örnek kullanım

**Prompt örneği (kısa):**

```
Aşağıdaki veriye bakarak belge türünü tahmin et. Sadece 'fatura','teklif','fiş','irsaliye','sözleşme','diğer' olarak cevap ver. Ayrıca 0-1 arası bir güven (confidence) belirt.

DATA:
invoice_no: 2025/123
date: 11.10.2025
toplam_tutar: 12.345,67 TL
kdv: 2.222,67

Cevap JSON formatında olsun: {"type":"fatura","confidence":0.98}
```

**Kural:** Eğer `confidence < 0.6` ise `needs_human_review: true` olarak işaretle.

---

# 7. Normalizasyon Kuralları (Pratik mapping ve temizleme)

* Tarih: `dd.mm.yyyy`, `yyyy-mm-dd`, `dd/mm/yyyy` tümünü ISO8601'e çevir.
* Sayı/para: `12.345,67 TL` → `12345.67` (nokta decimal), currency `TRY`.
* Anahtar eşleme: `FATURA_NO|invoice_number -> invoice_no`, `TOPLAM_TUTAR|amount -> total`.
* OCR düzeltmeleri: `KVÐ` -> `KDV`, `I` yerine `1` hataları için regex düzeltmeleri.
* Items: adet/unit fiyat yoksa `qty=1`, `unit_price` hesaplanabiliyorsa doldur.

---

# 8. Embedding & Vektör DB

* **Embedding kaynağı:** `bge-m3` embedding API (yerel inference).
* **Indexleme stratejisi:** normalize edilmiş `source_sample` + `invoice_no` + `supplier` gibi kısa özetin embedding'i.
* **Metadata** ile kaydet: `{ id, filename, type, invoice_no, date, total, tax, raw_path, normalized_at }`.
* **Reindex politikası:** normalize edildiğinde `version++` yap, eskisini soft-delete et.

---

# 9. Retrieval ve Prompt Composer (Gemma 3:4B için)

1. Kullanıcı soru sorar (ör. "Bu ayki toplam fatura tutarı ne kadar?").
2. Soru embedding'i alınır (bge-m3). Vector DB'de top-N retrieval yapılır (örn. top 10, similarity thresh 0.75).
3. Retrieve edilen normalized dokümanlardan **kaynakça ile** (source paths + invoice_no) kısa bir context üretilir.
4. **Prompt Template (Gemma)**:

```
Sistem: Aşağıdaki JSON'lar normalize edilmiş faturalar. Her JSON'un sonunda 'source' alanı var (dosya adı/path).
Lütfen verilen verilerle soruyu yanıtla. Eğer hesaplama yapıyorsan kaynakları (invoice_no) belirt.

CONTEXT:
{doc1}
{doc2}
...

SORU: {user_question}

CEVAP formatı:
1) Kısa cevap (tek satır)
2) Hesaplama özeti
3) Kaynaklar: [invoice_no - filename]
```

5. Gemma çıktı üretir. Eğer Gemma `uncertain` veya `cannot answer` derse `fallback: run an exact aggregator on DB (SQL sum)` mekanizması çalışsın.

---

# 10. SQL-like Aggregation Fallback

Bazı sorular (toplam, ortalama, filtre bazlı) için doğrudan DB sorgusu daha güvenilirdir:

* Örnek: `SELECT SUM(total) FROM invoices WHERE date BETWEEN '2025-10-01' AND '2025-10-31' AND supplier='ABC'`
* Bu sorgular Retrieval sonrası otomatik üretilip çalıştırılabilir; sonuç Gemma'ya verilir ve doğal dil biçiminde raporlanır.

**Kural:** Eğer soru 'toplama, sayma, ortalama' gibi açık hesaplama içeriyorsa önce DB aggregator çalışsın; sonuçlar modelin doğal dil çıktısı için kullanılacak.

---

# 11. Cursor'a Kural Olarak Edinme (Enforcement)

Cursor üzerinde şu kuralları uygula:

1. **Ingest validation**: normalize sürecinden `schema_v` ve `confidence` çıktısı gelmeden doküman indexlenemez.
2. **Reject destructive schema changes**: Eğer normalize edilen şema zorunlu alanları kaybederse ingest reddedilir.
3. **Auto human review**: `confidence < 0.6` veya `total` boşsa doküman `needs_human_review` olarak işaretlenir ve indexlenmez.
4. **Immutable normalized records**: Normalize edilmiş kayıtlar `versioned` olur; eskisini overwrite etme, yeni version ekle.
5. **Audit trail**: Her normalize/ingest/adapt işlemi loglanır (kullanıcı, timestamp, changes).
6. **Unit / Integration tests**: Yeni mapping kuralı eklendiğinde test case eklenmeden prod'e geçiş yasak.

---

# 12. Güvenlik & Gizlilik

* Tüm kişisel / finansal veriler disk şifrelemeli olsun (at-rest encryption).
* Access control: sadece yetkili servislerin vektör DB'ye yazma/okuma hakkı olsun.
* Logging: loglar PII içermemeli veya maskelenmeli.

---

# 13. Operasyonel Notlar

* **Batch vs Stream**: Yeni dosyalar için `watcher` (inotify) önerilir; büyük yeniden indeks için batch job.
* **Büyüme planı**: 100k+ doküman için vektör DB sharding ve deduplikasyon planı yap.
* **Monitoring**: ingestion success rate, classification confidence histogram, query latency.

---

# 14. Kabul Kriterleri (Acceptance Tests)

* %95 dosyalar doğru `type: fatura` olarak sınıflanmalı (test set ile).
* Önemli alanlar (`date`, `total`, `tax`) için %98 veri tipi doğruluğu.
* Sorgularda (ör. "Bu ayın toplamı") model + aggregator sonuçları birbirine ±0.1% tutarlı.

---

# 15. Örnek Kod - Basit Node.js Ingest + Normalize (snippet)

```js
// minimal örnek: klasörü tara, parse, normalize ve out/normalized yaz
const fs = require('fs');
const path = require('path');

// (normalizeInvoice fonksiyonu burada daha önce verdiğimiz implementasyondan)
async function ingestFolder(folder) {
  const files = fs.readdirSync(folder).filter(f=>f.endsWith('.json'));
  const out = path.join(folder, 'normalized'); if(!fs.existsSync(out)) fs.mkdirSync(out);
  for(const f of files){
    const raw = JSON.parse(fs.readFileSync(path.join(folder,f),'utf8'));
    const norm = normalizeInvoice(raw);
    norm.filename = f; norm.normalized_at = new Date().toISOString();
    // TODO: call bge-m3 classifier here to get confidence
    fs.writeFileSync(path.join(out,f), JSON.stringify(norm,null,2));
  }
}

// usage: ingestFolder('/data/faturalar')
```

---

# 16. Sonraki Adımlar (Önceliklendirme)

1. Anahtar: **Ingest & normalization pipeline**'ı çalışır hale getir (lokal ortamda). ✅
2. bge-m3 ile classification + embedding entegrasyonu. ✅
3. Vector DB indexleme ve basic retrieval. ✅
4. Gemma prompt şablonları ve soru-cevap akışını kur. ✅
5. Cursor kurallarını yaz ve CI/CD ile enforce et. ✅

---

# 17. Kontrol Listesi (Checklist)

* [x] canonical schema tanımlandı ve versionlandı → `canonicalSchema.ts`
* [x] KEY_MAP oluşturuldu ve test verisiyle doğrulandı → `canonicalSchema.ts`
* [x] bge-m3 classification prompt hazır → `semanticClassifier.ts`
* [x] embedding pipeline hazır → `embedClient.ts` + `documentIngestPipeline.ts`
* [x] vector DB indexleme testi geçti → `localRetrievalClient.ts`
* [x] Gemma prompt templates hazır → `chatController.ts`
* [x] Cursor rule set eklendi ve test edildi → `documentIngestPipeline.ts` (enforcement)
* [x] Aggregation service eklendi → `aggregationService.ts`
* [x] Normalized document storage → `localRetrievalClient.storeNormalizedDocument()`

---

# 18. İmplementasyon Özeti

## ✅ Tamamlanan Modüller

### 1. `canonicalSchema.ts`
- NormalizedDocument interface (schema v1)
- DocumentType enum (fatura, teklif, fiş, irsaliye, sözleşme, diğer)
- KEY_MAP for field name normalization
- OCR_CORRECTIONS for common OCR mistakes
- DocumentValidator with strict validation rules
- DOCUMENT_TYPE_KEYWORDS for heuristic classification

### 2. `semanticClassifier.ts`
- Hybrid classification (heuristic + semantic)
- BGE-M3 powered semantic classification via LLM
- Confidence scoring (heuristic_score + semantic_score)
- Auto human review flagging (confidence < 0.6)
- Batch classification support

### 3. `documentNormalizer.ts`
- Date normalization (dd.mm.yyyy → ISO8601)
- Number/currency normalization (Turkish → decimal)
- Key mapping (FATURA_NO → invoice_no)
- Line item normalization
- Source sample generation (for embedding)
- Batch normalization support

### 4. `documentIngestPipeline.ts`
- End-to-end ingest workflow:
  1. Document context preparation
  2. Semantic classification
  3. Normalization
  4. Validation
  5. Auto human review
  6. BGE-M3 embedding generation
  7. Audit logging
- Batch ingest support
- Reindex with versioning (immutable records)
- Health check for all components

### 5. `aggregationService.ts`
- SQL-like operations (SUM, AVG, COUNT, MIN, MAX)
- Group by support (type, supplier, month, year)
- Filter support (date range, supplier, total range)
- Natural language query parsing
- Natural language result explanation
- Turkish locale number formatting

### 6. `localRetrievalClient.ts` (Updated)
- `storeNormalizedDocument()` method
- Metadata-rich storage (type, confidence, invoice_no, etc.)
- Pre-computed embedding support
- Immutable records with versioning
- Retrieval with canonical schema metadata

### 7. `chatController.ts` (Updated)
- Aggregate query detection (`isAggregateQuery`)
- `handleAggregateQuery()` handler
- NormalizedDocument metadata support
- Type-aware and confidence-aware responses
- Source-traceable answers

---

# 19. Cursor Rules Enforcement

Aşağıdaki kurallar kod içinde otomatik olarak enforce edilmektedir:

1. **Ingest validation**: 
   - `schema_v` ve `confidence` zorunlu
   - Kod: `documentIngestPipeline.ts` validation stage

2. **Reject destructive schema changes**:
   - Validation errors → throw error
   - Kod: `DocumentValidator.validate()`

3. **Auto human review**:
   - `confidence < 0.6` veya `total === null` → `needs_human_review = true`
   - Kod: `documentIngestPipeline.ts` auto review stage

4. **Immutable normalized records**:
   - Versioning with `archived` flag
   - Kod: `localRetrievalClient.storeNormalizedDocument()`

5. **Audit trail**:
   - Her stage loglanır (`processing_log`)
   - Kod: `documentIngestPipeline.ts` + `documentNormalizer.ts`

---

# 20. Kullanım Rehberi

Detaylı kullanım rehberi için bakınız: **`RAG_IMPLEMENTATION_GUIDE.md`**

Öne çıkan özellikler:
- ✅ Tek belge ve batch ingest
- ✅ Otomatik classification (heuristic + semantic)
- ✅ Turkish format normalization
- ✅ BGE-M3 embedding generation
- ✅ Aggregate queries (toplam, ortalama, vb.)
- ✅ Type-aware chatbot responses
- ✅ Source-traceable answers
- ✅ Human review workflow

---

# 18. İletişim & Notlar

Bu doküman Cursor için *kurallar seti* olarak kullanılabilir. İstersen şimdi bu dokümanı repository'ne dönüştürecek `README.md` ve `scripts/` yapısını oluşturayım veya doğrudan Electron projen için `ingest service` kodunu genişleteyim.

---

*Prepared for Hasan — ilk versiyon. İstediğin değişiklikleri yapıp genişletebilirim.*
