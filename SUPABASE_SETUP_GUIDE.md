# Supabase Kurulum Rehberi

Bu rehber, DocData App'in Supabase ile entegrasyonu için gerekli adımları açıklar.

## 1. Supabase Projesi Oluşturma

1. [Supabase Dashboard](https://supabase.com/dashboard)'a gidin
2. "New Project" butonuna tıklayın
3. Proje adını girin (örn: "docdata-app")
4. Veritabanı şifresini belirleyin
5. Bölge seçin (Türkiye için "Europe West" önerilir)
6. "Create new project" butonuna tıklayın

## 2. Veritabanı Şeması Kurulumu

1. Supabase Dashboard'da projenizi seçin
2. Sol menüden "SQL Editor" seçin
3. "New query" butonuna tıklayın
4. `sql/supabase_schema.sql` dosyasının içeriğini kopyalayın
5. SQL Editor'a yapıştırın
6. "Run" butonuna tıklayın

## 3. API Anahtarlarını Alma

1. Sol menüden "Settings" > "API" seçin
2. Aşağıdaki bilgileri not edin:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public key**: `eyJ...` ile başlayan uzun string

## 4. Environment Variables Ayarlama

Proje kök dizininde `.env` dosyası oluşturun:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJ...your-anon-key-here

# OAuth Configuration (Optional)
SUPABASE_OAUTH_CLIENT_ID=your_client_id_here
SUPABASE_OAUTH_CLIENT_SECRET=your_client_secret_here

# Development
NODE_ENV=development
```

## 5. Row Level Security (RLS) Ayarları

Güvenlik için RLS politikalarını kontrol edin:

1. Supabase Dashboard'da "Authentication" > "Policies" seçin
2. Tüm tablolar için politikaların aktif olduğunu kontrol edin
3. Gerekirse ek güvenlik politikaları ekleyin

## 6. Test Bağlantısı

Uygulamayı çalıştırdığınızda, konsol loglarında şu mesajları görmelisiniz:

```
PDFAnalysisService: Initializing with Supabase URL: https://your-project-id.supabase.co
PDFAnalysisService: Supabase Key present: true
```

## 7. Veri Kontrolü

Analiz yaptıktan sonra Supabase Dashboard'da:

1. "Table Editor" seçin
2. `documents`, `text_sections`, `ai_commentary` tablolarını kontrol edin
3. Yeni kayıtların oluştuğunu doğrulayın

## 8. Sorun Giderme

### Bağlantı Hatası
- `.env` dosyasının doğru konumda olduğunu kontrol edin
- Supabase URL ve key'lerin doğru olduğunu kontrol edin
- İnternet bağlantınızı kontrol edin

### RLS Hatası
- RLS politikalarının doğru ayarlandığını kontrol edin
- Anonymous access'in açık olduğunu kontrol edin

### Schema Hatası
- SQL şemasının tamamen çalıştırıldığını kontrol edin
- Tablo isimlerinin doğru olduğunu kontrol edin

## 9. Production Ayarları

Production ortamı için:

1. RLS politikalarını sıkılaştırın
2. Anonymous access'i kapatın
3. Authentication sistemi ekleyin
4. API rate limiting ekleyin

## 10. Performans Optimizasyonu

- Index'lerin doğru oluşturulduğunu kontrol edin
- Embedding'ler için vector index'leri ekleyin
- Query'leri optimize edin

## Destek

Sorunlar için:
- Supabase Documentation: https://supabase.com/docs
- GitHub Issues: Proje repository'sinde issue açın