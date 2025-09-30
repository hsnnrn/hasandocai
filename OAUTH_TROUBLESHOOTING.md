# Supabase OAuth Troubleshooting Guide

## Kalıcı Çözümler Uygulandı ✅

### 1. Dotenv Loading Fix
- `.env` dosyası artık hem development hem production için doğru şekilde yükleniyor
- `process.cwd()` kullanarak proje kök dizininden `.env` dosyası okunuyor

### 2. Client ID Validation
- Supabase OAuth Client ID format'ı doğrulaması eklendi: `sba_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Runtime validation ile hatalı Client ID'ler erken tespit ediliyor

### 3. Environment Variables
- Detaylı logging eklendi (🔧, ✅, ❌, ⚠️ emojileri ile)
- Client ID ve Secret validation'ı iyileştirildi

### 4. Build Scripts
- `dev:main` ve `build:main` script'lerine `.env` kopyalama eklendi
- Production build'de de `.env` dosyası otomatik kopyalanıyor

## Gerekli Ayarlar

### .env Dosyası
```env
SUPABASE_OAUTH_CLIENT_ID=sba_a9c465337ecb2684096729c20c9450539078157d
SUPABASE_OAUTH_CLIENT_SECRET=your_actual_client_secret_here
```

### Supabase Dashboard Ayarları
1. **Redirect URIs**:
   - `http://localhost:54321/callback`
   - `myapp://oauth/callback`

2. **OAuth Scopes**:
   - `read:organizations`
   - `read:projects`
   - `read:api-keys`
   - `read:storage`
   - `read:functions`

## Test Etme

1. Client Secret'i güncelleyin
2. Uygulamayı yeniden başlatın: `npm run dev`
3. Console loglarında şunları görmelisiniz:
   ```
   🔧 Loading .env from: C:\Users\...\DocDataApp\.env
   🔧 CLIENT_ID loaded: ✅ Present
   ✅ Environment validation passed
   ```

## Sorun Giderme

### "OAuth client ID not configured" Hatası
1. `.env` dosyasının proje kök dizininde olduğundan emin olun
2. Client ID'nin `sba_` ile başladığından emin olun
3. Uygulamayı tamamen yeniden başlatın

### "Invalid OAuth client ID format" Hatası
- Client ID format'ı: `sba_` + 40 karakter hexadecimal
- Örnek: `sba_a9c465337ecb2684096729c20c9450539078157d`

### Development vs Production
- Development: `.env` dosyası otomatik kopyalanır
- Production: Build script'leri `.env`'yi `dist/` klasörüne kopyalar

## Packaging Notları

### Electron Builder
Eğer uygulamayı paketleyecekseniz, `.env` dosyasını `extraResources`'a ekleyin:

```json
{
  "build": {
    "extraResources": [
      {
        "from": ".env",
        "to": ".env"
      }
    ]
  }
}
```

### Alternatif: Environment Variables
Paketlenmiş uygulamada environment variables kullanmak için:
1. Client ID'yi hardcode edin (güvenlik riski)
2. Veya kullanıcıdan runtime'da isteyin
3. Veya config dosyası kullanın

## Logging

Artık tüm OAuth işlemleri detaylı loglanıyor:
- 🔧 Environment loading
- ✅ Validation success
- ❌ Validation errors
- 🚀 OAuth flow start
- 🔗 Generated URLs
- ⚠️ Warnings

Bu sayede sorunları kolayca tespit edebilirsiniz.
