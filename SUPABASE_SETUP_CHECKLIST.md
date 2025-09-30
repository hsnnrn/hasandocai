# Supabase Setup Checklist

## ❌ Sorun: Hiçbir istek Supabase'e gitmiyor

Bu durumun birkaç nedeni olabilir. Aşağıdaki adımları kontrol edin:

## 1. Environment Variables Kontrolü

`.env` dosyanızda şu değişkenlerin olduğundan emin olun:

```env
# Supabase Database Configuration
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Bu değeri nereden alırsınız:**
1. Supabase Dashboard'a gidin
2. Projenizi seçin
3. Settings > API'ye gidin
4. "anon public" key'i kopyalayın
5. `.env` dosyasına ekleyin

## 2. Supabase Projesi Seçimi

Uygulamada Supabase'e giriş yapıp proje seçtiğinizden emin olun:

1. Ana sayfada "Supabase'e Bağlan" butonuna tıklayın
2. Giriş yapın
3. Bir proje seçin
4. Proje seçildiğinde localStorage'da `supabase-login` anahtarı oluşur

## 3. Database Schema Kurulumu

Supabase projenizde şu SQL'i çalıştırın:

```sql
-- sql/supabase_schema.sql dosyasının içeriğini kopyalayıp Supabase SQL Editor'da çalıştırın
```

## 4. Debug Logları

Uygulamayı çalıştırırken console'da şu logları arayın:

```
🚀 uploadToSupabase called with analysisResult: ...
📦 Stored login data: ...
🎯 Selected project: ...
📤 Calling uploadAnalysisToSupabase with data: ...
🚀 supabase:uploadAnalysis handler called with documentId: ...
```

## 5. Hata Mesajları

Eğer hata alıyorsanız, muhtemelen şu durumlardan biri:

### "SUPABASE_ANON_KEY not configured"
- `.env` dosyasında `SUPABASE_ANON_KEY` eksik
- Değeri Supabase Dashboard'dan alıp ekleyin

### "No Supabase project selected"
- Supabase'e giriş yapıp proje seçin
- localStorage'da `supabase-login` anahtarı olmalı

### "Failed to connect to Supabase"
- Supabase URL'i yanlış
- Anon key yanlış
- Proje aktif değil

## 6. Test Adımları

1. `.env` dosyasını kontrol edin
2. Uygulamayı yeniden başlatın
3. Supabase'e giriş yapın ve proje seçin
4. Bir dosya analiz edin
5. "Supabase'e Aktar" butonuna tıklayın
6. Console loglarını kontrol edin

## 7. Hızlı Test

Console'da şu komutu çalıştırarak localStorage'ı kontrol edin:

```javascript
console.log('Supabase login data:', localStorage.getItem('supabase-login'))
```

Eğer `null` dönerse, Supabase'e giriş yapıp proje seçmeniz gerekiyor.
