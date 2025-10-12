# Unified Document Analysis Schema - Kullanım Kılavuzu

## 📋 İçindekiler
- [Kurulum](#kurulum)
- [Tekli Belge Yükleme](#tekli-belge-yükleme)
- [Grup Analizi Aktarımı](#grup-analizi-aktarımı)
- [Arama Fonksiyonları](#arama-fonksiyonları)
- [Veri Sorgulama](#veri-sorgulama)

---

## 🚀 Kurulum

### 1. Supabase SQL Editor'da Scripti Çalıştırın

```sql
-- sql/unified_document_analysis_schema.sql dosyasının tüm içeriğini
-- Supabase Dashboard > SQL Editor'a yapıştırın ve çalıştırın
```

### 2. Extension'ları Kontrol Edin

Script otomatik olarak gerekli extension'ları yükler:
- `uuid-ossp` - UUID oluşturma için
- `vector` - Embeddings için (pgvector)

---

## 📄 Tekli Belge Yükleme

### Belge Ekleme

```sql
-- Tek bir belge ekle
INSERT INTO documents (
  filename, 
  title, 
  file_type, 
  page_count, 
  user_id,
  processing_status
) VALUES (
  'rapor_2024.pdf',
  '2024 Yıllık Raporu',
  'pdf',
  25,
  'user123',
  'completed'
)
RETURNING id;
```

### Text Sections Ekleme

```sql
-- Belgeye metin bölümleri ekle
INSERT INTO text_sections (
  id,
  document_id,
  page_number,
  content,
  content_type,
  order_index
) VALUES (
  'section-1',
  'your-document-uuid',
  1,
  'Bu belgenin ilk bölümünün içeriği...',
  'paragraph',
  1
);
```

### AI Commentary Ekleme

```sql
-- Belgeye AI yorumu ekle
INSERT INTO ai_commentary (
  id,
  document_id,
  text_section_id,
  commentary_type,
  content,
  confidence_score,
  ai_model
) VALUES (
  'commentary-1',
  'your-document-uuid',
  'section-1',
  'summary',
  'Bu bölüm yıllık finansal sonuçları özetlemektedir.',
  0.92,
  'bge-m3'
);
```

---

## 👥 Grup Analizi Aktarımı

### Yöntem 1: transfer_group_analysis_data() Fonksiyonu (Önerilen)

```sql
SELECT transfer_group_analysis_data(
  'group-uuid-here'::UUID,                    -- Grup ID
  '2024 Q1 Raporları',                         -- Grup adı
  'İlk çeyrek finansal raporları',             -- Grup açıklaması
  '[
    {
      "documentId": "doc-uuid-1",
      "filename": "rapor1.pdf",
      "title": "Ocak Raporu",
      "fileType": "pdf",
      "fileSize": 1024000,
      "pageCount": 10,
      "textSections": [
        {
          "id": "section-1",
          "pageNumber": 1,
          "content": "İçerik...",
          "contentType": "paragraph",
          "orderIndex": 1
        }
      ],
      "aiCommentary": [
        {
          "id": "comment-1",
          "textSectionId": "section-1",
          "commentaryType": "summary",
          "content": "Özet...",
          "confidenceScore": 0.9,
          "language": "tr",
          "aiModel": "bge-m3"
        }
      ]
    }
  ]'::JSONB,                                   -- Belgeler (JSONB array)
  '[
    {
      "id": "analysis-1",
      "analysisType": "cross_document_analysis",
      "content": "Çapraz analiz sonuçları...",
      "confidenceScore": 0.85,
      "language": "tr",
      "aiModel": "group-ai-model",
      "processingTimeMs": 5000
    }
  ]'::JSONB,                                   -- Analiz sonuçları (JSONB array)
  'user123'                                     -- User ID
);
```

**Fonksiyon Yanıtı:**
```json
{
  "success": true,
  "message": "Grup analizi başarıyla Supabase'e aktarıldı",
  "group_id": "group-uuid-here",
  "documents_count": 1,
  "text_sections_count": 1,
  "ai_commentary_count": 1,
  "analysis_results_count": 1
}
```

### Yöntem 2: Manuel Insert (Daha Fazla Kontrol)

```sql
-- 1. Grup Oluştur
INSERT INTO document_groups (name, description, user_id)
VALUES ('2024 Q1 Raporları', 'İlk çeyrek finansal raporları', 'user123')
RETURNING id;

-- 2. Belgeleri Ekle
INSERT INTO documents (group_id, filename, title, file_type, ...)
VALUES ('group-uuid', 'rapor1.pdf', 'Ocak Raporu', 'pdf', ...);

-- 3. Text Sections Ekle
INSERT INTO text_sections (document_id, content, ...)
VALUES ('doc-uuid', 'İçerik...', ...);

-- 4. AI Commentary Ekle
INSERT INTO ai_commentary (document_id, group_id, content, ...)
VALUES ('doc-uuid', 'group-uuid', 'Yorum...', ...);

-- 5. Grup Analiz Sonuçları Ekle
INSERT INTO group_analysis_results (group_id, analysis_type, content, ...)
VALUES ('group-uuid', 'cross_document_analysis', 'Analiz...', ...);
```

---

## 🔍 Arama Fonksiyonları

### Full-Text Search (Türkçe)

```sql
-- Belgeler içinde arama
SELECT * FROM search_documents('finansal rapor');

-- Sonuç:
-- document_id | title | filename | relevance_score | match_type
```

### Semantic Search (Embedding Tabanlı)

```sql
-- Önce query embedding'i oluşturun (uygulamanızda)
-- Sonra semantic search yapın
SELECT * FROM semantic_search(
  '[0.123, 0.456, ...]'::VECTOR(1024),  -- Query embedding
  0.7,                                   -- Similarity threshold
  10                                     -- Max results
);

-- Sonuç:
-- document_id | text_section_id | content | similarity_score | section_title | page_number
```

---

## 📊 Veri Sorgulama

### Tüm Belgeleri Listele

```sql
SELECT * FROM document_search_view
ORDER BY upload_date DESC;
```

### Grup Analizi Özeti

```sql
-- Belirli bir grubun özeti
SELECT * FROM get_group_analysis_summary('group-uuid-here'::UUID);

-- Veya view kullanarak
SELECT * FROM group_analysis_overview
WHERE group_id = 'group-uuid-here';
```

### Grup'a Ait Tüm Belgeler

```sql
SELECT 
  d.id,
  d.title,
  d.filename,
  d.page_count,
  d.upload_date,
  COUNT(ts.id) as text_section_count,
  COUNT(ac.id) as commentary_count
FROM documents d
LEFT JOIN text_sections ts ON d.id = ts.document_id
LEFT JOIN ai_commentary ac ON d.id = ac.document_id
WHERE d.group_id = 'group-uuid-here'
GROUP BY d.id, d.title, d.filename, d.page_count, d.upload_date;
```

### Belirli Bir Belgenin Detayları

```sql
-- Belge bilgileri
SELECT * FROM documents WHERE id = 'doc-uuid';

-- Text sections
SELECT * FROM text_sections 
WHERE document_id = 'doc-uuid'
ORDER BY page_number, order_index;

-- AI Commentary
SELECT * FROM ai_commentary 
WHERE document_id = 'doc-uuid'
ORDER BY created_at;

-- Embeddings
SELECT * FROM embeddings 
WHERE document_id = 'doc-uuid';
```

### Grup Analiz Sonuçları

```sql
-- Tüm grup analiz sonuçları
SELECT * FROM group_analysis_results
WHERE group_id = 'group-uuid-here'
ORDER BY created_at DESC;

-- Belirli tipte analiz
SELECT * FROM group_analysis_results
WHERE group_id = 'group-uuid-here'
  AND analysis_type = 'cross_document_analysis';
```

### Analiz Oturumları

```sql
-- Grup analiz oturumlarını listele
SELECT * FROM group_analysis_sessions
WHERE group_id = 'group-uuid-here'
ORDER BY started_at DESC;

-- Başarılı oturumlar
SELECT * FROM group_analysis_sessions
WHERE status = 'completed'
ORDER BY completed_at DESC;
```

---

## 🏷️ Tag Yönetimi

### Belgeye Tag Ekleme

```sql
INSERT INTO document_tags (document_id, tag_name, tag_type)
VALUES 
  ('doc-uuid', 'finansal', 'user'),
  ('doc-uuid', 'rapor', 'user'),
  ('doc-uuid', '2024', 'auto');
```

### Tag'lere Göre Arama

```sql
SELECT d.* 
FROM documents d
JOIN document_tags dt ON d.id = dt.document_id
WHERE dt.tag_name = 'finansal';
```

---

## 📈 İstatistikler ve Analizler

### Genel İstatistikler

```sql
-- Toplam sayılar
SELECT 
  (SELECT COUNT(*) FROM document_groups) as total_groups,
  (SELECT COUNT(*) FROM documents) as total_documents,
  (SELECT COUNT(*) FROM text_sections) as total_sections,
  (SELECT COUNT(*) FROM ai_commentary) as total_commentary,
  (SELECT COUNT(*) FROM group_analysis_results) as total_group_analyses;
```

### Grup Bazında İstatistikler

```sql
SELECT 
  dg.name,
  dg.total_documents,
  dg.total_text_sections,
  dg.total_ai_commentary,
  dg.analysis_status,
  COUNT(DISTINCT gar.id) as analysis_count
FROM document_groups dg
LEFT JOIN group_analysis_results gar ON dg.id = gar.group_id
GROUP BY dg.id, dg.name, dg.total_documents, dg.total_text_sections, dg.total_ai_commentary, dg.analysis_status;
```

---

## 🔐 Güvenlik ve RLS

Schema, varsayılan olarak iki RLS policy içerir:

1. **Authenticated Users** - Kimlik doğrulaması yapılmış kullanıcılar için
2. **Anonymous Access** - Development için anonim erişim

### Production'da RLS Düzenleme

```sql
-- Anonymous policy'leri kaldır (production için)
DROP POLICY "Allow anonymous access for development" ON documents;
DROP POLICY "Allow anonymous access for development" ON text_sections;
-- ... diğer tablolar için de tekrarla

-- User-specific policy ekle
CREATE POLICY "Users can view their own documents" ON documents
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own documents" ON documents
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);
```

---

## 🛠️ Bakım ve Optimizasyon

### Index Durumunu Kontrol Et

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('documents', 'text_sections', 'ai_commentary', 'embeddings')
ORDER BY tablename, indexname;
```

### Tablo Boyutlarını Görüntüle

```sql
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('documents', 'text_sections', 'ai_commentary', 'group_analysis_results', 'embeddings')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Vacuum ve Analyze

```sql
-- Tabloları optimize et
VACUUM ANALYZE documents;
VACUUM ANALYZE text_sections;
VACUUM ANALYZE ai_commentary;
VACUUM ANALYZE embeddings;
```

---

## 🐛 Troubleshooting

### Grup Aktarımı Başarısız Olursa

```sql
-- Error detaylarını kontrol et
SELECT transfer_group_analysis_data(...) as result;

-- Result içinde error ve error_detail alanlarını kontrol edin
```

### Performans Sorunları

```sql
-- Slow query'leri bul
SELECT 
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
WHERE query LIKE '%documents%'
ORDER BY mean_time DESC
LIMIT 10;
```

### Index Kullanımını Kontrol Et

```sql
-- Index scan vs sequential scan
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

---

## 💡 İpuçları

1. **Batch Insert** - Çok sayıda veri eklerken transaction kullanın:
   ```sql
   BEGIN;
   -- INSERT statements here
   COMMIT;
   ```

2. **JSONB Validation** - Transfer fonksiyonuna göndermeden önce JSONB'yi validate edin

3. **Embeddings** - Vector index'i yalnızca 1000+ embedding olduktan sonra etkili olur

4. **Full-Text Search** - Türkçe karakterler için 'turkish' config kullanılıyor

5. **Performance** - Büyük belgelerde pagination kullanın:
   ```sql
   SELECT * FROM text_sections
   WHERE document_id = 'doc-uuid'
   ORDER BY page_number
   LIMIT 50 OFFSET 0;
   ```

---

## 📚 Ek Kaynaklar

- [Supabase Documentation](https://supabase.com/docs)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)

---

**Not:** Bu schema hem development hem de production ortamları için uygundur. Production'a geçmeden önce RLS policy'leri gözden geçirmeyi unutmayın!

