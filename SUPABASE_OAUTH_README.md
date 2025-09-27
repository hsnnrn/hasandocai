# Supabase OAuth Integration for Electron App

Bu dokümantasyon, Electron + TypeScript projenizde Supabase OAuth yetkilendirme akışını nasıl kuracağınızı adım adım açıklar.

## 📋 İçindekiler

- [Genel Bakış](#genel-bakış)
- [Ön Gereksinimler](#ön-gereksinimler)
- [Supabase Dashboard Kurulumu](#supabase-dashboard-kurulumu)
- [Proje Kurulumu](#proje-kurulumu)
- [Ortam Değişkenleri](#ortam-değişkenleri)
- [Kullanım](#kullanım)
- [Test Etme](#test-etme)
- [Güvenlik Notları](#güvenlik-notları)
- [Sorun Giderme](#sorun-giderme)
- [Paketleme Notları](#paketleme-notları)

## 🎯 Genel Bakış

Bu implementasyon, Supabase OAuth 2.0 akışını kullanarak kullanıcıların Supabase hesaplarına güvenli bir şekilde bağlanmasını sağlar. İki farklı callback yöntemi desteklenir:

1. **Local HTTP Server** (Önerilen): `http://localhost:54321/callback`
2. **Custom URI Scheme**: `myapp://oauth/callback`

### Özellikler

- ✅ PKCE (Proof Key for Code Exchange) S256 güvenliği
- ✅ CSRF koruması (state parameter)
- ✅ Güvenli token saklama (keytar + electron-store fallback)
- ✅ Otomatik token yenileme
- ✅ Management API entegrasyonu
- ✅ Organizasyon ve proje listeleme
- ✅ Güvenli BrowserWindow popup
- ✅ Hata yönetimi ve kullanıcı geri bildirimi

## 🔧 Ön Gereksinimler

- Node.js 18+ 
- Electron 27+
- Supabase hesabı
- TypeScript

## 🏗️ Supabase Dashboard Kurulumu

### 1. OAuth Uygulaması Oluşturma

1. [Supabase Dashboard](https://supabase.com/dashboard)'a gidin
2. **Settings** > **API** > **OAuth Applications** bölümüne gidin
3. **New OAuth Application** butonuna tıklayın
4. Aşağıdaki bilgileri doldurun:

```
Name: DocDataApp
Description: Document conversion application
Website URL: https://your-app.com (opsiyonel)
```

### 2. Redirect URI'ları Ekleme

OAuth uygulamanızın **Redirect URIs** bölümüne aşağıdaki URI'ları ekleyin:

```
http://localhost:54321/callback
myapp://oauth/callback
```

### 3. Scopes Ayarlama

**Management API çağrısı için gerekli OAuth scopes:**

Minimum gerekli scopes:
```
read:organizations
read:projects
```

**Önerilen tam scope listesi:**
```
read:organizations
read:projects
read:api-keys
read:storage
read:functions
```

**Önemli Not:** Management API'den projeleri çekmek için en az `projects.read` veya `orgs.read` scope'u gereklidir. Bu scope'lar olmadan API çağrıları başarısız olacaktır.

### 4. Client Bilgilerini Kaydetme

OAuth uygulamanız oluşturulduktan sonra:
- **Client ID**'yi kopyalayın
- **Client Secret**'ı kopyalayın (güvenli bir yerde saklayın)

## ⚙️ Proje Kurulumu

### 1. Bağımlılıkları Yükleme

```bash
npm install keytar electron-store express cors
npm install --save-dev @types/express @types/cors
```

### 2. Electron Rebuild (Keytar için)

```bash
npm run electron-rebuild:keytar
```

### 3. Ortam Değişkenleri

`.env` dosyası oluşturun:

```env
# Supabase OAuth Configuration
SUPABASE_OAUTH_CLIENT_ID=your_client_id_here
SUPABASE_OAUTH_CLIENT_SECRET=your_client_secret_here

# OAuth Server Configuration
OAUTH_PORT=54321
REDIRECT_URI_LOCAL=http://localhost:54321/callback
REDIRECT_URI_CUSTOM=myapp://oauth/callback

# Keytar Service Configuration
SERVICE_NAME=DocDataApp
```

## 🔐 Ortam Değişkenleri

### Gerekli Değişkenler

| Değişken | Açıklama | Örnek |
|----------|----------|-------|
| `SUPABASE_OAUTH_CLIENT_ID` | Supabase OAuth Client ID | `abc123...` |
| `SUPABASE_OAUTH_CLIENT_SECRET` | Supabase OAuth Client Secret | `def456...` |
| `OAUTH_PORT` | Local OAuth server portu | `54321` |
| `SERVICE_NAME` | Keytar service adı | `DocDataApp` |

### Opsiyonel Değişkenler

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `REDIRECT_URI_LOCAL` | Local server callback URI | `http://localhost:54321/callback` |
| `REDIRECT_URI_CUSTOM` | Custom URI scheme callback | `myapp://oauth/callback` |

## 🚀 Kullanım

### Management API Endpoints

Bu implementasyon aşağıdaki Supabase Management API endpoint'lerini kullanır:

**Organizations:**
- `GET https://api.supabase.com/v1/organizations`
- `GET https://api.supabase.com/platform/organizations`
- `GET https://api.supabase.com/v1/me/organizations`

**Projects:**
- `GET https://api.supabase.com/v1/projects`
- `GET https://api.supabase.com/platform/projects`
- `GET https://api.supabase.com/v1/organizations/{org_id}/projects`
- `GET https://api.supabase.com/v1/me/projects`

### Project Data Structure

Management API'den dönen proje verisi aşağıdaki formatta gelir:

```typescript
interface Project {
  id: string;                    // Proje ID'si
  name: string;                  // Proje adı
  ref: string;                   // Proje referansı (database URL'de kullanılır)
  project_api_url: string;       // Proje API URL'i (https://ref.supabase.co)
  status: string;                // Proje durumu (active, inactive, etc.)
  organization_id?: string;      // Organizasyon ID'si
  organization_name?: string;    // Organizasyon adı
  organization_slug?: string;    // Organizasyon slug'ı
  region?: string;               // Proje bölgesi
}
```

### 1. React Component'te Kullanım

```tsx
import { SupabaseConnectButton } from './components/SupabaseConnectButton';

function App() {
  return (
    <div>
      <SupabaseConnectButton />
    </div>
  );
}
```

### 2. Programatik Kullanım

```typescript
// OAuth akışını başlat
const result = await window.supabaseAPI.startSupabaseAuth({
  method: 'local', // veya 'custom'
  preferExternal: false
});

if (result.ok) {
  console.log('Organizations:', result.orgs);
  console.log('Projects:', result.projects);
  console.log('Selected Project:', result.selectedProject);
} else {
  console.error('OAuth failed:', result.error);
}

// Auth durumunu kontrol et
const status = await window.supabaseAPI.getAuthStatus();
console.log('Auth status:', status);

// Management API'den projeleri çek
const projectsResult = await window.supabaseAPI.fetchProjects();
if (projectsResult.ok) {
  console.log('Projects:', projectsResult.projects);
  console.log('Organizations:', projectsResult.organizations);
} else {
  console.error('Failed to fetch projects:', projectsResult.error);
}

// Çıkış yap
await window.supabaseAPI.logoutSupabase();
```

## 🧪 Test Etme

### Test Checklist

- [ ] OAuth popup açılıyor
- [ ] Supabase login sayfası yükleniyor
- [ ] Kullanıcı giriş yapabiliyor
- [ ] Organizasyon seçimi yapılabiliyor
- [ ] Proje seçimi yapılabiliyor
- [ ] Callback yakalanıyor
- [ ] Token exchange başarılı
- [ ] Token'lar güvenli şekilde saklanıyor
- [ ] Management API çağrıları çalışıyor
- [ ] Organizasyon listesi alınıyor
- [ ] Proje listesi alınıyor
- [ ] Logout çalışıyor

### Test Senaryoları

1. **Başarılı OAuth Akışı**
   - Kullanıcı butona tıklar
   - Popup açılır
   - Supabase'de giriş yapar
   - Organizasyon/proje seçer
   - Başarılı callback
   - Token'lar saklanır
   - Organizasyon/proje listesi gösterilir

2. **Kullanıcı İptali**
   - Kullanıcı popup'ı kapatır
   - `{ ok: false, reason: 'user_declined' }` döner

3. **Ağ Hatası**
   - Token exchange başarısız
   - Detaylı hata mesajı gösterilir

4. **Token Yenileme**
   - Access token süresi dolmuş
   - Otomatik refresh token kullanımı
   - Yeni token'lar saklanır

## 🔒 Güvenlik Notları

### Token Saklama

- **Keytar**: OS credential store kullanır (önerilen)
- **Electron-store**: Fallback olarak kullanılır
- **Client Secret**: Sadece main process'te saklanır

### PKCE Güvenliği

- Code verifier: 128 karakter rastgele string
- Code challenge: SHA256 hash
- State parameter: CSRF koruması

### BrowserWindow Güvenliği

```typescript
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true
}
```

### Network Güvenliği

- HTTPS kullanımı (production)
- Token'lar sadece main process'te işlenir
- Renderer process'e token gönderilmez

## 🐛 Sorun Giderme

### Yaygın Sorunlar

1. **Keytar Build Hatası**
   ```bash
   npm run electron-rebuild:keytar
   ```

2. **Port Zaten Kullanımda**
   ```bash
   # Farklı port kullanın
   OAUTH_PORT=54322
   ```

3. **OAuth Callback Yakalanmıyor**
   - Redirect URI'ları kontrol edin
   - Firewall ayarlarını kontrol edin
   - Custom protocol kayıtlarını kontrol edin

4. **Token Exchange Başarısız**
   - Client ID/Secret'ı kontrol edin
   - Scopes'ları kontrol edin
   - Network bağlantısını kontrol edin

### Debug Modu

```typescript
// Console log'ları etkinleştirin
console.log('OAuth flow started');
console.log('Authorization URL:', authUrl);
console.log('Token exchange result:', tokenResult);
```

### Log Dosyaları

- **Windows**: `%APPDATA%/DocDataApp/logs/`
- **macOS**: `~/Library/Logs/DocDataApp/`
- **Linux**: `~/.config/DocDataApp/logs/`

## 📦 Paketleme Notları

### Electron Builder Konfigürasyonu

```json
{
  "build": {
    "extraResources": [
      {
        "from": "node_modules/keytar/build/Release",
        "to": "keytar"
      }
    ]
  }
}
```

### Platform-Specific Notlar

#### Windows
- Custom protocol registry kayıtları gerekli
- Keytar Windows Credential Manager kullanır

#### macOS
- Info.plist'te custom protocol tanımlanmalı
- Keytar macOS Keychain kullanır

#### Linux
- Custom protocol desktop entry gerekli
- Keytar libsecret kullanır

### Build Scripts

```json
{
  "scripts": {
    "electron-rebuild": "electron-rebuild",
    "electron-rebuild:keytar": "electron-rebuild -f -w keytar",
    "build:all": "npm run build && electron-builder --mac --win --linux"
  }
}
```

## 🔄 Güncelleme Notları

### v1.0.0
- İlk OAuth implementasyonu
- PKCE S256 desteği
- Keytar + electron-store token saklama
- Management API entegrasyonu
- Local server + custom URI callback desteği

## 📞 Destek

Sorunlarınız için:
1. Bu README'yi kontrol edin
2. Console log'larını inceleyin
3. Supabase Dashboard ayarlarını kontrol edin
4. GitHub Issues'da sorun bildirin

## 📄 Lisans

MIT License - Detaylar için LICENSE dosyasına bakın.

---

**Not**: Bu implementasyon sadece OAuth yetkilendirme akışını sağlar. Mevcut belge işleme kodlarınıza dokunmaz.