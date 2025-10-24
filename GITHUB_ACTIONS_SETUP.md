# GitHub Actions Setup Guide

## 🚀 Otomatik Build ve Release Sistemi

Bu dokümantasyon, DocDataApp için oluşturulan GitHub Actions CI/CD pipeline'ının nasıl çalıştığını ve nasıl kullanılacağını açıklar.

## 📁 Oluşturulan Dosyalar

### 1. GitHub Actions Workflows
- **`.github/workflows/build.yml`** - Ana build ve release workflow'u
- **`.github/workflows/release.yml`** - Release automation workflow'u
- **`.github/workflows/security.yml`** - Güvenlik taraması workflow'u

### 2. Konfigürasyon Dosyaları
- **`package.json`** - Güncellenmiş build konfigürasyonu
- **`electron-builder.yml`** - Electron Builder konfigürasyonu
- **`build/entitlements.mac.plist`** - macOS code signing

### 3. Dokümantasyon
- **`README.md`** - Güncellenmiş proje dokümantasyonu
- **`docs/INSTALLATION.md`** - Kurulum rehberi
- **`docs/TROUBLESHOOTING.md`** - Sorun giderme rehberi
- **`docs/USER_MANUAL.md`** - Kullanıcı kılavuzu
- **`docs/API.md`** - API dokümantasyonu
- **`SECURITY.md`** - Güvenlik politikası
- **`CHANGELOG.md`** - Değişiklik günlüğü

### 4. GitHub Templates
- **`.github/ISSUE_TEMPLATE/bug_report.md`** - Bug raporu şablonu
- **`.github/ISSUE_TEMPLATE/feature_request.md`** - Özellik isteği şablonu
- **`.github/ISSUE_TEMPLATE/security_vulnerability.md`** - Güvenlik açığı şablonu

## 🔧 Kurulum Adımları

### 1. GitHub Secrets Ayarlama

Repository'nizde aşağıdaki secrets'ları ekleyin:

```bash
# GitHub Actions için
GITHUB_TOKEN                    # Otomatik olarak mevcut

# macOS Code Signing (opsiyonel)
CSC_LINK                        # Apple Developer sertifikası
CSC_KEY_PASSWORD               # Sertifika şifresi
APPLE_ID                        # Apple ID
APPLE_PASSWORD                  # Apple ID şifresi
APPLE_TEAM_ID                   # Apple Team ID

# Güvenlik taraması (opsiyonel)
SNYK_TOKEN                      # Snyk API token
```

### 2. Repository Ayarları

1. **Repository Settings** → **Actions** → **General**
   - "Allow all actions and reusable workflows" seçin
   - "Allow actions created by GitHub" seçin

2. **Repository Settings** → **Actions** → **Runners**
   - Self-hosted runner ekleyebilirsiniz (opsiyonel)

### 3. İlk Release Oluşturma

```bash
# 1. Tag oluşturun
git tag v1.0.0
git push origin v1.0.0

# 2. GitHub Actions otomatik olarak çalışacak
# 3. Release sayfasından installer'ları indirebilirsiniz
```

## 🎯 Workflow Özellikleri

### Build Workflow (`.github/workflows/build.yml`)

**Tetikleyiciler:**
- Her yeni tag push'unda (v* formatında)
- Manuel tetikleme

**Platformlar:**
- Windows (x64)
- macOS (x64, ARM64)
- Linux (x64)

**Özellikler:**
- Paralel build
- Artifact upload
- Otomatik release oluşturma
- Güvenlik taraması

### Release Workflow (`.github/workflows/release.yml`)

**Tetikleyiciler:**
- Manuel tetikleme
- Version validation
- Changelog generation

**Özellikler:**
- Semantic versioning kontrolü
- Otomatik changelog oluşturma
- GitHub release oluşturma
- README güncelleme

### Security Workflow (`.github/workflows/security.yml`)

**Tetikleyiciler:**
- Her push ve PR'da
- Haftalık schedule

**Özellikler:**
- Dependency vulnerability scan
- Code security analysis
- Container security scan
- License compliance

## 📦 Build Konfigürasyonu

### Electron Builder Ayarları

**Windows:**
- NSIS installer (.exe)
- Portable version (.exe)
- Code signing desteği

**macOS:**
- DMG installer
- x64 ve ARM64 desteği
- Code signing ve notarization

**Linux:**
- AppImage format
- tar.gz archive
- x64 architecture

### Auto-Update Desteği

```javascript
// main.js içinde
const { autoUpdater } = require('electron-updater');

// Update kontrolü
autoUpdater.checkForUpdatesAndNotify();
```

## 🔐 Güvenlik Özellikleri

### Code Signing
- **Windows**: Digital certificate ile imzalama
- **macOS**: Apple Developer sertifikası ile imzalama
- **Linux**: GPG imzalama

### Güvenlik Taraması
- npm audit
- Snyk vulnerability scan
- GitHub CodeQL analysis
- License compliance

## 📊 Monitoring ve Analytics

### Build Status
- GitHub Actions dashboard
- Badge'ler README'de
- Email notifications

### Release Tracking
- GitHub Releases sayfası
- Download statistics
- User feedback

## 🚨 Sorun Giderme

### Yaygın Sorunlar

1. **Build Failures**
   ```bash
   # Log'ları kontrol edin
   # GitHub Actions → Workflow runs → Failed job
   ```

2. **Code Signing Issues**
   ```bash
   # macOS için
   # Apple Developer hesabı gerekli
   # Certificates ve provisioning profiles
   ```

3. **Permission Issues**
   ```bash
   # Repository permissions kontrol edin
   # Actions → General → Workflow permissions
   ```

### Debug Adımları

1. **Local Build Test**
   ```bash
   npm run build
   npm run dist:win    # Windows
   npm run dist:mac    # macOS
   npm run dist:linux  # Linux
   ```

2. **Workflow Debug**
   ```bash
   # GitHub Actions → Workflow runs
   # Failed job → View logs
   ```

3. **Artifact Download**
   ```bash
   # GitHub Actions → Workflow runs
   # Download artifacts
   ```

## 📈 Performans Optimizasyonu

### Build Hızlandırma
- Parallel jobs
- Caching strategies
- Dependency optimization

### Artifact Yönetimi
- Retention policies
- Compression
- Selective uploads

## 🔄 Sürekli İyileştirme

### Monitoring
- Build success rates
- Performance metrics
- User feedback

### Updates
- Workflow improvements
- Security updates
- Feature additions

## 📞 Destek

### GitHub Issues
- [Bug Reports](https://github.com/turkishdeepkebab/Docdataapp/issues/new?template=bug_report.md)
- [Feature Requests](https://github.com/turkishdeepkebab/Docdataapp/issues/new?template=feature_request.md)
- [Security Issues](https://github.com/turkishdeepkebab/Docdataapp/issues/new?template=security_vulnerability.md)

### Dokümantasyon
- [Installation Guide](docs/INSTALLATION.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [User Manual](docs/USER_MANUAL.md)
- [API Documentation](docs/API.md)

### İletişim
- 📧 Email: support@docdataapp.com
- 💬 Discord: [Join our community](https://discord.gg/docdataapp)
- 📖 Documentation: [docs.docdataapp.com](https://docs.docdataapp.com)

---

**Not**: Bu setup guide düzenli olarak güncellenir. En son bilgiler için [resmi dokümantasyonu](https://docs.docdataapp.com) ziyaret edin.
