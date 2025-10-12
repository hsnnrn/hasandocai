# 📁 DocDataApp - SQL Dosyaları

## ⚠️ HANGİ DOSYA KULLANILMALI?

### ✅ KULLANILACAK DOSYA

**`unified_document_analysis_schema.sql`** - TEK SEFERLİK KOMPLE KURULUM

Bu dosya **her şeyi** yapar:
- ✅ Eski yapıları temizler
- ✅ Tüm tabloları oluşturur (group_id dahil!)
- ✅ Transfer fonksiyonlarını ekler
- ✅ Index, trigger, view oluşturur
- ✅ RLS'yi yapılandırır
- ✅ Doğrulama yapar

**👉 SADECE BU DOSYAYI ÇALIŞTIRIN!**

Nasıl kullanılır: `HIZLI_KURULUM.md` dosyasına bakın.

---

## 📚 Diğer Dosyalar (Referans Amaçlı)

### `supabase_schema.sql`
❌ **KULLANMAYIN** - Eski versiyon, group_id eksik  
📝 Sadece referans için saklanıyor

### `pdf_analysis_schema.sql`
📖 Orijinal PDF analizi için tasarlanan schema  
📝 Arşiv amaçlı

### `pgvector_match_embeddings.sql`
🔍 Semantik arama fonksiyonları  
📝 unified_document_analysis_schema.sql içinde zaten var

### `group_analysis_supabase_schema.sql`
👥 Grup analizi tabloları  
📝 unified_document_analysis_schema.sql içinde zaten var

---

## 🚀 Hızlı Başlangıç

```bash
# 1. Supabase Dashboard'a gidin
https://supabase.com/dashboard

# 2. Projenizi seçin

# 3. SQL Editor → New Query

# 4. unified_document_analysis_schema.sql içeriğini kopyalayın

# 5. RUN butonuna tıklayın

# 6. Başarı mesajını bekleyin ✅
```

Detaylar için: **`HIZLI_KURULUM.md`**

---

## 📋 Oluşturulan Yapı

### Tablolar (8 adet)
1. `document_groups` - Belge grupları
2. `documents` - Belgeler (**✅ group_id sütunu ile!**)
3. `text_sections` - Belge içerikleri
4. `ai_commentary` - AI yorumları
5. `group_analysis_results` - Grup analizleri
6. `group_analysis_sessions` - Analiz oturumları
7. `embeddings` - Semantik arama vektörleri
8. `document_tags` - Etiketler

### Fonksiyonlar (5+ adet)
- `transfer_group_analysis_data()` - Grup verilerini aktar
- `get_group_analysis_summary()` - Grup özeti
- `search_documents()` - Full-text arama (Türkçe)
- `semantic_search()` - Vektör tabanlı arama
- `update_updated_at_column()` - Otomatik timestamp

### View'lar (2 adet)
- `document_search_view` - Belge arama görünümü
- `group_analysis_overview` - Grup özet görünümü

---

## ✅ Özellikler

- ✅ Hem tekil belge hem grup analizleri
- ✅ `group_id` NULL olabilir (tekil belgeler için)
- ✅ RLS DISABLED (anon key ile çalışır)
- ✅ Otomatik timestamp güncelleme
- ✅ Cascade delete (ilişkili kayıtlar otomatik silinir)
- ✅ Index'ler (hızlı sorgulama)
- ✅ Full-text search (Türkçe destekli)
- ✅ Semantik arama (pgvector)
- ✅ Doğrulama ve raporlama

---

## 🆘 Yardım

### Sorun: "column group_id does not exist"

**Çözüm:**
1. `unified_document_analysis_schema.sql` dosyasını çalıştırdığınızdan emin olun
2. **ESKİ** `supabase_schema.sql` dosyasını KULLANMAYIN
3. Script başarılı mesajında "group_id mevcut" yazmalı

### Sorun: "Permission denied" hatası

**Çözüm:**
Script otomatik olarak RLS'yi DISABLE eder. Eğer hala hata alıyorsanız:
1. Supabase Dashboard → Settings → API
2. "anon key" kullandığınızdan emin olun
3. Script'i tekrar çalıştırın

---

## 📞 İletişim

Sorun yaşıyorsanız:
1. `HIZLI_KURULUM.md` dosyasındaki adımları kontrol edin
2. Script çıktısındaki doğrulama mesajlarını okuyun
3. Supabase SQL Editor'da hata mesajlarını kontrol edin

