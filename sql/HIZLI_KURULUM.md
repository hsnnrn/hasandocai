# 🚀 DocDataApp - Supabase Tek Seferlik Kurulum

## ⚠️ ÖNEMLİ: Komple Otomatik Kurulum

Bu script **her şeyi** yapar:
1. ✅ Eski yapıları temizler (DROP IF EXISTS)
2. ✅ Tüm tabloları sıfırdan oluşturur
3. ✅ Transfer fonksiyonlarını ekler
4. ✅ Index'leri ve trigger'ları kurar
5. ✅ RLS'yi devre dışı bırakır
6. ✅ Doğrulama yapar ve rapor verir

## 📋 3 Adımda Kurulum

### 1️⃣ Supabase SQL Editor'ı Açın
```
https://supabase.com/dashboard → Projeniz → SQL Editor → New Query
```

### 2️⃣ Script'i Kopyala-Yapıştır
- `sql/unified_document_analysis_schema.sql` dosyasının **tamamını** kopyalayın
- SQL Editor'a yapıştırın

### 3️⃣ RUN Butonuna Tıklayın
Script çalışacak ve şu mesajları göreceksiniz:

```
============================================
✅ DocDataApp - Unified Schema Oluşturuldu!
============================================

📋 Tablolar: 8 adet oluşturuldu
⚙️  Fonksiyonlar: 5 adet oluşturuldu

✅ DOĞRULANDI: documents.group_id mevcut

📊 Özellikler:
   ✅ Hem tekil belge hem grup analizleri
   ✅ group_id NULL olabilir (tekil belgeler)
   ✅ RLS DISABLED (anon key çalışır)
   ✅ Transfer fonksiyonları hazır
   ✅ Semantik arama + Full-text search

🚀 Sistem hazır! Artık belge ve grup analizlerinizi aktarabilirsiniz.
============================================
```

### 4️⃣ Tamamlandı! 🎉
Hepsi bu kadar! Artık sistem tamamen hazır.

## 🔧 Oluşturulan Tablolar

1. **document_groups** - Belge grupları
2. **documents** - Belgeler (✅ group_id dahil!)
3. **text_sections** - Belge içerikleri
4. **ai_commentary** - AI yorumları
5. **group_analysis_results** - Grup analiz sonuçları
6. **group_analysis_sessions** - Analiz oturumları
7. **embeddings** - Semantik arama için vektörler
8. **document_tags** - Belge etiketleri

## ✅ İçeriği

- ✅ `group_id` sütunu documents tablosunda
- ✅ NULL olabilir (tekil belgeler için)
- ✅ Foreign key ile document_groups'a bağlı
- ✅ RLS DISABLED (anon key çalışır)
- ✅ Transfer fonksiyonları hazır
- ✅ Semantik arama fonksiyonları
- ✅ Full-text search (Türkçe destekli)
- ✅ Tüm index'ler ve trigger'lar

## 📝 Notlar

- Script `CREATE TABLE IF NOT EXISTS` kullanır - güvenli
- Mevcut verileri silmez (eğer tekrar çalıştırırsanız)
- Hem tekil belgeler hem grup analizleri için aynı yapı
- Production'da RLS'yi ENABLE etmek isterseniz, script'te yorum satırları var

## 🔍 Script Ne Yapar?

### STEP 1: Temizlik
- Eski tabloları, fonksiyonları, view'ları siler
- `DROP IF EXISTS` kullanır - güvenli

### STEP 2: Extensions
- uuid-ossp (UUID oluşturma)
- vector (Semantik arama için)

### STEP 3: Tablolar
8 tablo oluşturur:
- document_groups
- **documents** (✅ group_id ile!)
- text_sections
- ai_commentary
- group_analysis_results
- group_analysis_sessions
- embeddings
- document_tags

### STEP 4-9: Diğer Yapılar
- Index'ler (performans)
- RLS policies (güvenlik)
- Trigger'lar (otomatik işlemler)
- Fonksiyonlar (transfer, arama, vb.)
- View'lar (kolay erişim)
- Comment'ler (dokümantasyon)

### STEP 10: Doğrulama
- Tablo sayısını kontrol eder
- Fonksiyon sayısını kontrol eder
- **group_id'nin varlığını doğrular**
- Detaylı rapor verir

## 🐛 Sorun Çözme

### "Column group_id does not exist" hatası alıyorsanız:

1. **Unified schema'yı çalıştırdınız mı?**
   - `sql/unified_document_analysis_schema.sql` dosyasını çalıştırın
   - Eski `supabase_schema.sql` dosyasını KULLANMAYIN

2. **Doğrulama kontrol edin:**
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'documents';
   ```
   `group_id` listede olmalı!

3. **Hala sorun varsa:**
   - Tabloları manuel silin (Supabase Dashboard → Table Editor)
   - Script'i tekrar çalıştırın

## 🎯 Test Edin

Script başarıyla çalıştıktan sonra:

1. **Tekil belge testi:**
   - Uygulamanızda 1 belge analizi yapın
   - Supabase'e aktarın
   - `documents` tablosunda `group_id = NULL` olarak görünmeli

2. **Grup analizi testi:**
   - Birden fazla belge seçip grup analizi yapın
   - Supabase'e aktarın
   - `documents` tablosunda `group_id = [UUID]` olarak görünmeli
   - `document_groups` tablosunda grup bilgisi olmalı

3. **Her ikisi de başarılı olmalı!** ✅

