# 🔧 GitHub Actions Kurulum Kılavuzu

Bu kılavuz, GitHub Actions workflow'larının düzgün çalışması için gerekli repository ayarlarını açıklar.

## 📋 Gerekli Ayarlar

### 1. GitHub Actions İzinlerini Aktifleştir

#### Adım 1: Actions'ı Aktifleştir

1. GitHub'da repo sayfasına git
2. **Settings** sekmesine tıkla
3. Sol menüden **Actions** → **General** seç
4. **Actions permissions** bölümünde:
   - ✅ "Allow all actions and reusable workflows" seçeneğini işaretle

#### Adım 2: Workflow İzinlerini Ayarla

Aynı sayfada aşağı scroll et:

1. **Workflow permissions** bölümünde:
   - ✅ "Read and write permissions" seçeneğini işaretle
   - ✅ "Allow GitHub Actions to create and approve pull requests" işaretle

2. **Save** butonuna tıkla

### 2. Branch Protection Rules (İsteğe Bağlı)

Eğer main/master branch'i korumalıysa:

1. **Settings** → **Branches**
2. **Branch protection rules** → **Add rule**
3. Branch name pattern: `main` veya `master`
4. Ayarlar:
   - ✅ "Require status checks to pass before merging"
   - ✅ "Require branches to be up to date before merging"
   - Status checks seç:
     - `test-build-windows`
     - `test-build-macos`
     - `test-build-linux`
5. **Create** veya **Save changes**

### 3. Releases Sayfasını Kontrol Et

1. Repo ana sayfasında sağ tarafta **Releases** bölümünü bul
2. Eğer hiç release yoksa, ilk release'i oluştur:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

---

## 🔑 GitHub Secrets (Gelecek için hazırlık)

Şu anda secrets gerekli değil, ama gelecekte eklemek isterseniz:

### macOS Code Signing için:

1. **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** tıkla
3. Aşağıdaki secrets'i ekle:

```
CSC_LINK
- Base64 encoded P12 certificate
- Apple Developer hesabından oluştur

CSC_KEY_PASSWORD
- P12 certificate şifresi

APPLE_ID
- Apple ID email adresi

APPLE_ID_PASSWORD
- App-specific password
- Apple ID hesabından oluştur

APPLE_TEAM_ID
- Apple Developer Team ID
```

### Windows Code Signing için:

```
WIN_CSC_LINK
- Base64 encoded PFX certificate

WIN_CSC_KEY_PASSWORD
- PFX certificate şifresi
```

### API Keys (İsteğe Bağlı):

```
CONVERTAPI_SECRET
- ConvertAPI key (varsa)

SUPABASE_URL
- Supabase project URL

SUPABASE_KEY
- Supabase anon/public key
```

---

## ✅ Kurulum Testi

### Test 1: Manuel Workflow Çalıştırma

1. **Actions** sekmesine git
2. Sol menüden **Build and Release** seç
3. **Run workflow** dropdown'u aç
4. Branch seç (main veya master)
5. **Run workflow** tıkla
6. Workflow'un başladığını gör
7. **❌ Cancel workflow** ile iptal et (test için)

### Test 2: Auto Build Workflow

1. Küçük bir değişiklik yap:
   ```bash
   echo "# Test" >> .github/TEST.md
   git add .
   git commit -m "test: github actions test"
   git push
   ```

2. **Actions** sekmesine git
3. **Auto Build (Test)** workflow'unun çalıştığını gör
4. Tüm job'ların başladığını kontrol et:
   - test-build-windows
   - test-build-macos
   - test-build-linux

5. Build'lerin tamamlanmasını bekle (~15 dakika)

### Test 3: Release Workflow

1. Test tag oluştur:
   ```bash
   git tag v0.0.1-test
   git push origin v0.0.1-test
   ```

2. **Actions** sekmesine git
3. **Build and Release** workflow'unun çalıştığını gör
4. Build'ler tamamlandıktan sonra **Releases** sekmesini kontrol et
5. `v0.0.1-test` release'ini gör

6. Test release'i sil:
   - Releases sayfasında release'i aç
   - **Delete** butonuna tıkla
   - Tag'i de sil:
     ```bash
     git tag -d v0.0.1-test
     git push origin :refs/tags/v0.0.1-test
     ```

---

## 🐛 Yaygın Sorunlar ve Çözümleri

### Sorun 1: "Resource not accessible by integration"

**Sebep:** Workflow izinleri yetersiz

**Çözüm:**
1. Settings → Actions → General
2. Workflow permissions → "Read and write permissions"
3. Save

### Sorun 2: "Workflow not found"

**Sebep:** Workflow dosyası yanlış konumda

**Kontrol et:**
- Dosya yolu: `.github/workflows/build-release.yml`
- YAML syntax'ı doğru mu? (yamllint.com'da kontrol et)

### Sorun 3: "No ref found for workflow"

**Sebep:** Branch veya tag bulunamıyor

**Çözüm:**
- Tag'in push edildiğinden emin ol
- Branch adı doğru mu kontrol et

### Sorun 4: Build sırasında "npm ci" hatası

**Sebep:** package-lock.json güncel değil veya bozuk

**Çözüm:**
```bash
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "fix: update package-lock.json"
git push
```

### Sorun 5: "electron-builder" hatası

**Sebep:** Asset dosyaları eksik

**Kontrol et:**
```bash
ls -la assets/
# Olması gerekenler:
# - icon.svg (veya icon.icns, icon.ico)
# - entitlements.mac.plist (macOS için)
# - installer.nsh (Windows için)
# - dmg-background.png (macOS DMG için)
```

---

## 📊 Workflow Durumunu İzleme

### GitHub Actions Badge

README.md'ye badge ekle:

```markdown
[![Build Status](https://github.com/turkishdeepkebab/Docdataapp/workflows/Build%20and%20Release/badge.svg)](https://github.com/turkishdeepkebab/Docdataapp/actions)
```

### Email Bildirimleri

1. GitHub Settings (kişisel settings)
2. Notifications
3. Actions: "Only notify failed workflows" veya "Notify for all"

### Slack Entegrasyonu (İsteğe Bağlı)

Workflow dosyasına ekle:

```yaml
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "Build failed: ${{ github.workflow }}"
      }
```

---

## 🎯 Best Practices

### 1. Cache Kullanımı

Workflow'larda cache zaten aktif:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'  # npm cache aktif
```

### 2. Paralel Build

Windows ve macOS build'leri paralel çalışır:

```yaml
jobs:
  build-windows:
    runs-on: windows-latest
  build-macos:
    runs-on: macos-latest
  # İkisi de aynı anda başlar
```

### 3. Artifact Retention

Artifacts 5 gün saklanır:

```yaml
- uses: actions/upload-artifact@v4
  with:
    retention-days: 5
```

Daha uzun süre için artırabilirsin (max 90 gün).

### 4. Conditional Execution

Release job sadece tag push'larında çalışır:

```yaml
jobs:
  release:
    if: startsWith(github.ref, 'refs/tags/')
```

---

## 📈 Workflow Optimizasyonu

### Build Süresini Azaltma

1. **Cache kullan** (zaten aktif)
2. **Dependencies'i kilitle:**
   ```bash
   npm ci  # npm install yerine
   ```
3. **Gereksiz dosyaları exclude et:**
   ```yaml
   files:
     - "!**/*.map"
     - "!**/test/**/*"
   ```

### Maliyet Optimizasyonu

GitHub Actions ücretsiz limitler:
- **Public repos:** Unlimited minutes
- **Private repos:** 2,000 minutes/month (Free plan)

Bir build yaklaşık:
- Windows: ~15 dk
- macOS: ~16 dk
- Linux: ~14 dk
- **Toplam:** ~45 dk (paralel: ~16 dk)

---

## 🔐 Güvenlik

### 1. Secrets Güvenliği

- ❌ ASLA secrets'i commit'leme
- ✅ Secrets sadece GitHub Settings'den ekle
- ✅ Secrets log'larda otomatik maskelenir

### 2. Third-party Actions

Workflow'larda kullanılan actions:
- `actions/checkout@v4` ✅ GitHub official
- `actions/setup-node@v4` ✅ GitHub official
- `actions/upload-artifact@v4` ✅ GitHub official
- `softprops/action-gh-release@v2` ✅ Trusted

### 3. Code Signing

Şu anda code signing devre dışı:
```yaml
env:
  CSC_IDENTITY_AUTO_DISCOVERY: false
```

Aktifleştirmek için secrets ekle (yukarıda anlatıldı).

---

## 📞 Destek

Sorunlar için:
- 📖 [GitHub Actions Docs](https://docs.github.com/en/actions)
- 💬 [GitHub Community](https://github.community/)
- 🐛 [Project Issues](https://github.com/turkishdeepkebab/Docdataapp/issues)

---

## ✅ Kurulum Checklist

Tüm ayarları yaptıktan sonra kontrol et:

- [ ] Actions enabled
- [ ] Workflow permissions: Read and write
- [ ] Workflow dosyaları `.github/workflows/` içinde
- [ ] package.json güncel
- [ ] Asset dosyaları mevcut
- [ ] Test workflow çalıştı
- [ ] Branch protection rules ayarlandı (varsa)
- [ ] Secrets eklendi (gerekiyorsa)

---

**Artık hazırsın!** 🎉

İlk release'ini oluştur:
```bash
git tag v1.0.0
git push origin v1.0.0
```

---

**Son Güncelleme:** 30 Ocak 2025  
**Doküman Versiyonu:** 1.0

