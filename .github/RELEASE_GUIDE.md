# 🚀 GitHub Actions ile Otomatik Release Kılavuzu

Bu kılavuz, DocDataApp projesinde GitHub Actions kullanarak otomatik build ve release işlemlerinin nasıl yapılacağını açıklar.

## 📋 İçindekiler

- [Genel Bakış](#genel-bakış)
- [Workflow'lar](#workflowlar)
- [Release Oluşturma](#release-oluşturma)
- [Otomatik Build Test](#otomatik-build-test)
- [Sorun Giderme](#sorun-giderme)

---

## 🎯 Genel Bakış

Projeye 3 farklı GitHub Actions workflow'u eklenmiştir:

1. **build-release.yml** - Tag push'larında otomatik release oluşturur
2. **auto-build.yml** - Her push'ta build test yapar
3. **release-notes.yml** - Release notlarını otomatik günceller

---

## 🔧 Workflow'lar

### 1. Build and Release (`build-release.yml`)

**Ne zaman çalışır:**
- `v*` pattern'ine uyan tag push'larında (örn: v1.0.0, v2.1.3)
- Manuel olarak GitHub Actions sekmesinden tetiklenebilir

**Ne yapar:**
- Windows için NSIS installer (.exe) oluşturur
- macOS için DMG ve ZIP dosyaları oluşturur
- GitHub Releases sayfasına otomatik yükler
- Release notları oluşturur

**Paralel çalışma:**
- Windows ve macOS build'leri aynı anda çalışır (daha hızlı)
- Her ikisi tamamlandıktan sonra release job çalışır

### 2. Auto Build Test (`auto-build.yml`)

**Ne zaman çalışır:**
- main, master veya develop branch'lerine push
- Pull request'lerde

**Ne yapar:**
- Windows, macOS ve Linux build'lerini test eder
- Lint kontrolü yapar
- Build hatalarını erken tespit eder

**Özellik:**
- Lint hataları build'i durdurmaz (continue-on-error)
- Her platform için ayrı test

### 3. Release Notes Generator (`release-notes.yml`)

**Ne zaman çalışır:**
- Release oluşturulduğunda veya düzenlendiğinde

**Ne yapar:**
- Commit mesajlarından otomatik changelog oluşturur
- Kategorilere göre düzenler (feature, bug, docs, vb.)
- Release notlarını günceller

---

## 🎁 Release Oluşturma

### Adım 1: Versiyon Güncelle

`package.json` dosyasında version numarasını güncelleyin:

```json
{
  "version": "1.0.1"
}
```

### Adım 2: Değişiklikleri Commit Et

```bash
git add package.json
git commit -m "chore: bump version to 1.0.1"
git push origin main
```

### Adım 3: Tag Oluştur ve Push Et

```bash
# Tag oluştur
git tag -a v1.0.1 -m "Release version 1.0.1"

# Tag'i push et
git push origin v1.0.1
```

### Adım 4: Otomatik Build Başlar

Tag push'u sonrasında GitHub Actions otomatik olarak:

1. ✅ Windows build başlar (windows-latest runner)
2. ✅ macOS build başlar (macos-latest runner)
3. ✅ Build'ler tamamlanınca artifacts yüklenir
4. ✅ Release oluşturulur ve dosyalar eklenir
5. ✅ Release notları oluşturulur

### Adım 5: Release'i Kontrol Et

GitHub repo sayfasında **Releases** sekmesinden yeni release'i görebilirsiniz:
- https://github.com/turkishdeepkebab/Docdataapp/releases

---

## 📱 Manuel Workflow Tetikleme

GitHub Actions sekmesinden manuel olarak workflow çalıştırabilirsiniz:

1. GitHub'da repo sayfasına gidin
2. **Actions** sekmesine tıklayın
3. Sol menüden **Build and Release** seçin
4. **Run workflow** butonuna tıklayın
5. Branch seçin ve **Run workflow** onaylayın

---

## 🔍 Build Sonuçlarını İzleme

### GitHub Actions Sayfası

1. **Actions** sekmesine gidin
2. En son workflow run'ı seçin
3. Her job'ın durumunu görebilirsiniz:
   - ✅ Yeşil: Başarılı
   - ❌ Kırmızı: Hatalı
   - 🟡 Sarı: Çalışıyor

### Artifacts İndirme

Build tamamlandığında artifacts'i manuel olarak indirebilirsiniz:

1. Workflow run sayfasına gidin
2. Aşağı scroll edin
3. **Artifacts** bölümünden indirin:
   - `windows-installers` - Windows için
   - `macos-installers` - macOS için

⚠️ **Not:** Artifacts 5 gün sonra otomatik silinir.

---

## 🐛 Sorun Giderme

### Build Hatası: "npm ci failed"

**Sebep:** package-lock.json güncel değil veya bozuk

**Çözüm:**
```bash
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "fix: update package-lock.json"
git push
```

### Build Hatası: "electron-builder failed"

**Sebep:** Asset dosyaları eksik veya yanlış konumda

**Kontrol edin:**
- `assets/icon.svg` var mı?
- `assets/entitlements.mac.plist` var mı? (macOS için)
- `assets/installer.nsh` var mı? (Windows için)

### macOS Code Signing Hatası

**Sebep:** Code signing sertifikası yok

**Çözüm:** Workflow'da zaten `CSC_IDENTITY_AUTO_DISCOVERY: false` ayarlanmış, bu yüzden code signing devre dışı. Eğer code signing eklemek isterseniz:

1. Apple Developer hesabı oluşturun
2. Sertifika oluşturun
3. GitHub Secrets'e ekleyin:
   - `CSC_LINK` - P12 sertifika (base64)
   - `CSC_KEY_PASSWORD` - Sertifika şifresi
   - `APPLE_ID` - Apple ID
   - `APPLE_ID_PASSWORD` - App-specific password
   - `APPLE_TEAM_ID` - Team ID

### Workflow Çalışmıyor

**Kontrol edin:**
1. GitHub Actions repo için aktif mi?
   - Settings → Actions → General → "Allow all actions"
2. Branch koruması workflow'u engelliyor mu?
3. GITHUB_TOKEN izinleri yeterli mi?
   - Settings → Actions → General → Workflow permissions → "Read and write permissions"

### Release Oluşmuyor

**Sebep:** Tag pattern uyuşmuyor

**Çözüm:** Tag'in `v` ile başladığından emin olun:
```bash
# Doğru ✅
git tag v1.0.0

# Yanlış ❌
git tag 1.0.0
```

---

## 📊 Build Süreleri (Yaklaşık)

| Platform | Dependencies | Build | Package | Toplam |
|----------|--------------|-------|---------|--------|
| Windows  | 5-8 dk      | 2-3 dk | 3-5 dk | ~15 dk |
| macOS    | 5-8 dk      | 2-3 dk | 4-6 dk | ~16 dk |
| Linux    | 5-8 dk      | 2-3 dk | 2-4 dk | ~14 dk |

**Toplam paralel süre:** ~16 dakika (en yavaş platform)

---

## 🎯 Best Practices

### 1. Semantic Versioning

Versiyon numaralarını semantic versioning'e göre belirleyin:

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): Yeni özellikler (geriye uyumlu)
- **PATCH** (1.0.0 → 1.0.1): Bug fixes

### 2. Commit Messages

Conventional commits kullanın:

```bash
feat: add new document format support
fix: resolve PDF conversion issue
docs: update installation guide
perf: improve conversion speed
refactor: reorganize file structure
test: add unit tests for converter
chore: bump version to 1.0.1
```

### 3. Pre-release Testing

Büyük değişikliklerden önce pre-release oluşturun:

```bash
git tag v1.0.0-beta.1
git push origin v1.0.0-beta.1
```

### 4. Release Checklist

Her release öncesi:

- [ ] CHANGELOG.md güncelle
- [ ] README.md'de versiyon numarası güncel
- [ ] Tüm testler geçiyor
- [ ] Dokümantasyon güncel
- [ ] Breaking changes belirtilmiş
- [ ] Migration guide hazır (varsa)

---

## 🔐 GitHub Secrets (Gelecekte Eklenebilir)

### Code Signing İçin:

**macOS:**
```
CSC_LINK=<base64-encoded-p12-certificate>
CSC_KEY_PASSWORD=<certificate-password>
APPLE_ID=<your-apple-id>
APPLE_ID_PASSWORD=<app-specific-password>
APPLE_TEAM_ID=<your-team-id>
```

**Windows:**
```
WIN_CSC_LINK=<base64-encoded-pfx-certificate>
WIN_CSC_KEY_PASSWORD=<certificate-password>
```

### API Keys (Varsa):
```
CONVERTAPI_SECRET=<api-key>
SUPABASE_URL=<supabase-url>
SUPABASE_KEY=<supabase-anon-key>
```

---

## 📞 Destek

Sorularınız için:
- GitHub Issues: https://github.com/turkishdeepkebab/Docdataapp/issues
- GitHub Discussions: https://github.com/turkishdeepkebab/Docdataapp/discussions

---

## 📝 Değişiklik Geçmişi

- **2025-01-30**: İlk versiyon oluşturuldu
  - Windows ve macOS build workflow'ları eklendi
  - Otomatik release sistemi kuruldu
  - Release notes generator eklendi

---

**Son Güncelleme:** 30 Ocak 2025  
**Doküman Versiyonu:** 1.0  
**Yazar:** DocDataApp Development Team

