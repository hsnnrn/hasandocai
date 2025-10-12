# Supabase OAuth Authentication Setup

Bu doküman, DocDataApp uygulamasında Supabase kimlik doğrulama özelliğinin nasıl kurulduğunu ve kullanıldığını açıklar.

## Yapılan Değişiklikler

### 1. Environment Variables (.env dosyası)
`.env` dosyası oluşturuldu ve aşağıdaki bilgiler eklendi:

```env
SUPABASE_OAUTH_CLIENT_ID=16f8e0d2-e9c6-4b8a-896d-2b687551ad0a
SUPABASE_OAUTH_CLIENT_SECRET=sba_867174f18feedf9b919abb112665d0438820e161
OAUTH_PORT=54321
NODE_ENV=development
DEBUG_OAUTH=true
```

### 2. Login Sayfası
Yeni bir `LoginPage.tsx` componenti oluşturuldu:
- Supabase OAuth ile giriş yapma
- Kullanıcının projelerini listeleme
- Proje seçme fonksiyonalitesi
- Minimal ve modern UI tasarımı

### 3. Header Component
`Header.tsx` component'ine giriş/çıkış butonları eklendi:
- Giriş yapılmış kullanıcının email'ini gösterme
- Giriş yap butonu (/login sayfasına yönlendirme)
- Çıkış yap butonu
- Auth durumunu real-time takip etme

### 4. App.tsx
Yeni `/login` route'u eklendi:
- Login sayfası layout'suz (fullscreen)
- Diğer sayfalar Layout içinde

## Kullanım

### İlk Kurulum

1. Uygulamayı başlatın:
```bash
npm install
npm run dev
```

2. Tarayıcıda `http://localhost:3000` adresine gidin

3. Header'daki "Giriş" butonuna tıklayın

4. Açılan sayfada "Supabase ile Giriş Yap" butonuna tıklayın

5. Supabase OAuth sayfası açılacak, orada giriş yapın

6. Giriş yaptıktan sonra projeleriniz listelenecek

7. Bir proje seçin ve ana sayfaya yönlendirileceksiniz

### Projeye Erişim

Giriş yaptıktan ve proje seçtikten sonra:
- Ana sayfada (HomePage) seçilen proje otomatik olarak yüklenecek
- Dosya analiz sonuçları seçilen projeye yüklenebilecek
- Header'da kullanıcı bilgileri gösterilecek

## Teknik Detaylar

### OAuth Flow
1. Kullanıcı "Giriş" butonuna tıklar
2. Main process'te OAuth server başlatılır (port 54321)
3. Supabase OAuth sayfası açılır
4. Kullanıcı Supabase'e giriş yapar
5. Callback URL'e yönlendirilir
6. Authorization code alınır
7. Main process'te token exchange yapılır
8. Access token ve refresh token güvenli olarak saklanır
9. Kullanıcının projeleri Management API'den çekilir
10. Projeler localStorage'a kaydedilir

### Token Storage
- Tokenlar `electron-store` ile güvenli olarak saklanır
- Refresh token ile otomatik yenileme yapılır
- Logout yapıldığında tüm veriler temizlenir

### Güvenlik
- Client secret main process'te saklanır (renderer'a gönderilmez)
- PKCE (Proof Key for Code Exchange) kullanılır
- CSRF koruması için state parameter kullanılır
- Tokenlar güvenli şekilde encrypt edilir

## Sorun Giderme

### OAuth Server Başlamıyorsa
- Port 54321'in kullanılabilir olduğundan emin olun
- `.env` dosyasının doğru konumda olduğunu kontrol edin
- Console loglarını kontrol edin

### Giriş Yapılamıyorsa
- Client ID ve Secret'ın doğru olduğunu kontrol edin
- Supabase Dashboard'da OAuth callback URL'in tanımlı olduğundan emin olun
- `http://localhost:54321/callback` adresinin redirect URI'lere eklendiğini kontrol edin

### Projeler Görünmüyorsa
- Supabase hesabınızda proje olduğundan emin olun
- Access token'ın doğru scope'lara sahip olduğunu kontrol edin
- Network sekmesinde API çağrılarını kontrol edin

## Supabase Dashboard Ayarları

1. [Supabase Dashboard](https://supabase.com/dashboard) açın
2. Settings > OAuth Apps bölümüne gidin
3. Redirect URLs bölümüne şunları ekleyin:
   - `http://localhost:54321/callback`
   - `myapp://oauth/callback` (opsiyonel, custom protocol için)

## Notlar

- Uygulama development modda çalışıyor (`.env` dosyasında `NODE_ENV=development`)
- OAuth debug logları aktif (`DEBUG_OAUTH=true`)
- Production'a geçerken bu ayarlar değiştirilmeli

