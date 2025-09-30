# 🚨 Hızlı Düzeltme Rehberi

## Sorun: Supabase'e istek gitmiyor

Console loglarından görüyorum ki:
- ✅ Supabase'e giriş yapılmış
- ✅ Proje seçilmiş
- ✅ Fonksiyon çağrılmış
- ❌ **AMA** `project_api_url: "https://undefined.supabase.co"` - URL yanlış!

## 🔧 Hızlı Çözüm

### 1. `.env` Dosyasını Kontrol Edin

`.env` dosyanızda şu satırın olduğundan emin olun:

```env
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Bu değeri nereden alırsınız:**
1. Supabase Dashboard'a gidin: https://supabase.com/dashboard
2. Projenizi seçin (usif)
3. Settings → API'ye gidin
4. "anon public" key'i kopyalayın
5. `.env` dosyasına ekleyin

### 2. Uygulamayı Yeniden Başlatın

```bash
npm run dev
```

### 3. Test Edin

1. Bir dosya analiz edin
2. "Supabase'e Aktar" butonuna tıklayın
3. Console'da şu logları arayın:
   ```
   🔗 Using Supabase URL: https://uwezgyqoknygpbcfpncq.supabase.co
   🔑 Using Supabase Key: Present
   ```

## 🎯 Beklenen Sonuç

Başarılı olduğunda console'da şunları göreceksiniz:
```
🚀 supabase:uploadAnalysis handler called with documentId: ...
🔗 Using Supabase URL: https://uwezgyqoknygpbcfpncq.supabase.co
🔑 Using Supabase Key: Present
📊 Document inserted successfully: ...
📊 Inserted X text sections
📊 Inserted Y AI commentary entries
```

## ❌ Hala Çalışmıyorsa

1. **Supabase Dashboard'da** projenizin aktif olduğundan emin olun
2. **Database schema** kuruldu mu kontrol edin (`sql/supabase_schema.sql`)
3. **Console'da** hata mesajları var mı kontrol edin

## 🔍 Debug İçin

Console'da şu komutu çalıştırın:
```javascript
console.log('Environment check:', {
  hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
  anonKeyLength: process.env.SUPABASE_ANON_KEY?.length
});
```
