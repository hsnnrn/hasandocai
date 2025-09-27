# Supabase OAuth Setup Guide

Bu kılavuz, DocDataApp uygulamanızda Supabase OAuth entegrasyonunu nasıl kuracağınızı açıklar.

## 🚀 Hızlı Kurulum

### 1. Supabase OAuth Uygulaması Oluşturun

1. [Supabase Dashboard](https://supabase.com/dashboard)'a gidin
2. Sol menüden "Settings" > "API" bölümüne gidin
3. "OAuth Applications" sekmesine tıklayın
4. "Create OAuth Application" butonuna tıklayın
5. Aşağıdaki bilgileri doldurun:
   - **Name**: `DocDataApp` (veya istediğiniz isim)
   - **Redirect URL**: `http://localhost:54321/callback` (development için)
   - **Scopes**: 
     - `read:organizations`
     - `read:projects` 
     - `read:api-keys`
     - `read:platform`
     - `read:database`
     - `write:projects`

### 2. Environment Variables Ayarlayın

Proje kök dizininde `.env` dosyası oluşturun:

```env
# Supabase OAuth Configuration
SUPABASE_OAUTH_CLIENT_ID=your_client_id_here
SUPABASE_OAUTH_CLIENT_SECRET=your_client_secret_here

# OAuth Server Configuration
OAUTH_PORT=54321
SERVICE_NAME=DocDataApp
```

### 3. Dependencies Yükleyin

```bash
npm install
```

## 🔧 Detaylı Konfigürasyon

### OAuth Scopes Açıklaması

- **read:organizations**: Kullanıcının organizasyonlarını okuma
- **read:projects**: Kullanıcının projelerini okuma
- **read:api-keys**: Proje API anahtarlarını okuma
- **read:platform**: Platform bilgilerini okuma
- **read:database**: Veritabanı bilgilerini okuma
- **write:projects**: Proje yazma izni (opsiyonel)

### Güvenlik Özellikleri

- **Keytar Integration**: Access token'lar işletim sistemi keychain'inde güvenli şekilde saklanır
- **PKCE Flow**: OAuth güvenliği için PKCE (Proof Key for Code Exchange) kullanılır
- **Cross-platform**: Windows ve macOS desteği
- **Token Refresh**: Otomatik token yenileme

## 🎯 Kullanım

### 1. Uygulamayı Başlatın

```bash
npm run dev
```

### 2. Supabase'e Giriş Yapın

1. Ana sayfada "Supabase Login" butonuna tıklayın
2. OAuth popup'ında Supabase hesabınızla giriş yapın
3. İzinleri verin
4. Projeleriniz otomatik olarak yüklenecek

### 3. Proje Seçin

1. "Supabase Project" dropdown'ından istediğiniz projeyi seçin
2. Seçilen proje tüm işlemlerde kullanılacak
3. Proje bilgileri güvenli şekilde saklanır

## 🔍 Troubleshooting

### Yaygın Sorunlar

#### 1. "OAuth client ID not configured" Hatası

**Çözüm**: `.env` dosyasında `SUPABASE_OAUTH_CLIENT_ID` değişkenini kontrol edin.

#### 2. "No projects found" Mesajı

**Nedenler**:
- Kullanıcının Supabase hesabında proje yok
- API izinleri yetersiz
- Network bağlantı sorunu

**Çözümler**:
- [Supabase Dashboard](https://supabase.com/dashboard)'da yeni proje oluşturun
- OAuth scope'larını kontrol edin
- Network bağlantınızı kontrol edin

#### 3. Token Storage Hatası

**Çözüm**: 
- macOS'ta: Keychain Access'i kontrol edin
- Windows'ta: Credential Manager'ı kontrol edin
- Fallback olarak encrypted local storage kullanılır

### Debug Modu

Detaylı loglar için:

```bash
DEBUG=* npm run dev
```

### Console Logları

Browser Developer Tools'da console'u açarak detaylı API çağrı loglarını görebilirsiniz.

## 🔒 Güvenlik Notları

1. **Client Secret**: Production'da client secret kullanmayın, PKCE-only flow yeterlidir
2. **Token Storage**: Token'lar işletim sistemi keychain'inde şifrelenmiş olarak saklanır
3. **HTTPS**: Production'da mutlaka HTTPS kullanın
4. **Scope Limitation**: Minimum gerekli scope'ları kullanın

## 📱 Cross-Platform Desteği

- **Windows**: Windows Credential Manager
- **macOS**: Keychain Access
- **Linux**: Secret Service API (keytar üzerinden)

## 🚀 Production Deployment

### Environment Variables

Production için:

```env
SUPABASE_OAUTH_CLIENT_ID=your_production_client_id
OAUTH_PORT=443
SERVICE_NAME=DocDataApp-Production
```

### Redirect URLs

Production için Supabase OAuth uygulamanızda:

- **Redirect URL**: `https://yourdomain.com/callback`
- **Development URL**: `http://localhost:54321/callback`

## 📞 Destek

Sorun yaşıyorsanız:

1. Console loglarını kontrol edin
2. Network tab'ında API çağrılarını inceleyin
3. Supabase Dashboard'da OAuth uygulama ayarlarını kontrol edin
4. Environment variables'ları doğrulayın

---

**Not**: Bu entegrasyon Lovable benzeri bir deneyim sunar. Kullanıcılar manuel olarak API anahtarı girmek zorunda kalmaz, tüm işlemler OAuth token'ları üzerinden gerçekleşir.
