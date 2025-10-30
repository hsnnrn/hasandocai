# 📚 GitHub Actions Dokümantasyon İndeksi

Bu klasör, DocDataApp projesinin GitHub Actions workflow'ları ve release süreçleri için gerekli tüm dosyaları içerir.

## 📂 Klasör Yapısı

```
.github/
├── workflows/
│   ├── build-release.yml       # Ana release workflow'u
│   ├── auto-build.yml          # Otomatik build test
│   └── release-notes.yml       # Release notları generator
├── changelog-config.json       # Changelog konfigürasyonu
├── QUICK_START_RELEASES.md     # ⚡ Hızlı başlangıç kılavuzu
├── RELEASE_GUIDE.md            # 📖 Detaylı release kılavuzu
├── SETUP_GITHUB_ACTIONS.md     # 🔧 Kurulum kılavuzu
└── README.md                   # 📚 Bu dosya
```

---

## 🚀 Hızlı Başlangıç

### Yeni kullanıcılar için:

1. **İlk önce okuyun:** [Hızlı Başlangıç](QUICK_START_RELEASES.md) ⚡
   - 3 adımda release oluşturma
   - Temel komutlar
   - Yaygın sorunlar ve çözümleri

2. **Sonra kurun:** [GitHub Actions Kurulum](SETUP_GITHUB_ACTIONS.md) 🔧
   - Repository ayarları
   - İzinlerin yapılandırılması
   - Test ve doğrulama

3. **Detayları öğrenin:** [Detaylı Release Kılavuzu](RELEASE_GUIDE.md) 📖
   - Workflow açıklamaları
   - Best practices
   - İleri seviye özellikler

---

## 📄 Dosya Açıklamaları

### Workflow Dosyaları

#### 🏗️ `workflows/build-release.yml`
**Amaç:** Tag push'larında otomatik build ve release oluşturur

**Ne zaman çalışır:**
- `v*` pattern'ine uyan tag push'larında (örn: v1.0.0)
- Manuel tetikleme ile

**Ne yapar:**
- Windows NSIS installer (.exe) oluşturur
- macOS DMG ve ZIP paketleri oluşturur
- Linux AppImage, DEB ve RPM paketleri oluşturur
- GitHub Releases'e otomatik yükler
- Release notları ekler

**Ortalama süre:** ~16 dakika (paralel)

---

#### 🧪 `workflows/auto-build.yml`
**Amaç:** Her push'ta build testleri yapar

**Ne zaman çalışır:**
- main/master/develop branch'lerine push
- Pull request'lerde

**Ne yapar:**
- Windows, macOS ve Linux build'lerini test eder
- Lint kontrolü yapar
- Build hatalarını erken tespit eder

**Özellik:**
- Lint hataları build'i durdurmaz
- Artifacts oluşturmaz (sadece test)

---

#### 📝 `workflows/release-notes.yml`
**Amaç:** Release notlarını otomatik günceller

**Ne zaman çalışır:**
- Release oluşturulduğunda
- Release düzenlendiğinde

**Ne yapar:**
- Commit mesajlarından changelog oluşturur
- Kategorilere göre düzenler
- Release açıklamasını günceller

**Bağımlılık:** `changelog-config.json`

---

### Konfigürasyon Dosyaları

#### ⚙️ `changelog-config.json`
**Amaç:** Release notları formatını belirler

**Özellikler:**
- Commit kategorileri (feature, bug, docs, vb.)
- Label pattern matching
- Türkçe kategori isimleri
- Ignore rules

**Kullanım:** `release-notes.yml` tarafından otomatik kullanılır

---

### Doküman Dosyaları

#### ⚡ `QUICK_START_RELEASES.md`
**Hedef kitle:** Yeni kullanıcılar, hızlı başlangıç isteyenler

**İçerik:**
- 3 adımda release oluşturma
- Temel komutlar
- Hızlı sorun giderme
- Pro ipuçları
- Release checklist

**Okuma süresi:** ~5 dakika

---

#### 🔧 `SETUP_GITHUB_ACTIONS.md`
**Hedef kitle:** İlk kurulum yapan kullanıcılar

**İçerik:**
- Repository ayarları
- İzin yapılandırması
- Secrets yönetimi
- Kurulum testi
- Sorun giderme
- Güvenlik best practices

**Okuma süresi:** ~10 dakika

---

#### 📖 `RELEASE_GUIDE.md`
**Hedef kitle:** Detaylı bilgi isteyen kullanıcılar

**İçerik:**
- Workflow detayları
- Release süreci
- Build izleme
- Advanced features
- Best practices
- Optimization tips

**Okuma süresi:** ~15 dakika

---

## 🎯 Kullanım Senaryoları

### Senaryo 1: İlk Release
**Durum:** Projeyi yeni kurdunuz, ilk release'i oluşturacaksınız

**Adımlar:**
1. [SETUP_GITHUB_ACTIONS.md](SETUP_GITHUB_ACTIONS.md) oku
2. Repository ayarlarını yap
3. [QUICK_START_RELEASES.md](QUICK_START_RELEASES.md) takip et
4. İlk tag'i push et

---

### Senaryo 2: Rutin Release
**Durum:** Projeyi biliyorsunuz, yeni versiyon çıkaracaksınız

**Adımlar:**
1. [QUICK_START_RELEASES.md](QUICK_START_RELEASES.md) - "3 Adımda Release"
2. Version güncelle
3. Tag oluştur ve push et

---

### Senaryo 3: Sorun Giderme
**Durum:** Build hatası aldınız veya workflow çalışmıyor

**Adımlar:**
1. [QUICK_START_RELEASES.md](QUICK_START_RELEASES.md) - "Sorun Çözümleri"
2. [SETUP_GITHUB_ACTIONS.md](SETUP_GITHUB_ACTIONS.md) - "Yaygın Sorunlar"
3. [RELEASE_GUIDE.md](RELEASE_GUIDE.md) - "Sorun Giderme"

---

### Senaryo 4: Workflow Özelleştirme
**Durum:** Workflow'ları kendi ihtiyaçlarınıza göre düzenlemek istiyorsunuz

**Adımlar:**
1. [RELEASE_GUIDE.md](RELEASE_GUIDE.md) - "Workflow'lar"
2. Workflow dosyalarını incele
3. [GitHub Actions Docs](https://docs.github.com/en/actions) oku

---

## 📊 Workflow Özeti

| Workflow | Trigger | Süre | Artifacts | Release |
|----------|---------|------|-----------|---------|
| build-release.yml | Tag push (v*) | ~16 dk | ✅ | ✅ |
| auto-build.yml | Push/PR | ~16 dk | ❌ | ❌ |
| release-notes.yml | Release event | ~1 dk | ❌ | ✅ |

---

## 🎓 Öğrenme Yolu

### Seviye 1: Başlangıç
1. ⚡ [QUICK_START_RELEASES.md](QUICK_START_RELEASES.md)
2. 🔧 [SETUP_GITHUB_ACTIONS.md](SETUP_GITHUB_ACTIONS.md)
3. İlk release'i oluştur

### Seviye 2: Orta
1. 📖 [RELEASE_GUIDE.md](RELEASE_GUIDE.md)
2. Workflow dosyalarını incele
3. Changelog konfigürasyonunu özelleştir

### Seviye 3: İleri
1. GitHub Actions dokumentasyonu
2. Workflow özelleştirme
3. Custom actions oluşturma
4. Code signing implementasyonu

---

## 🔗 Faydalı Linkler

### GitHub Actions
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)

### Electron Builder
- [Electron Builder Docs](https://www.electron.build/)
- [Code Signing Guide](https://www.electron.build/code-signing)
- [Multi Platform Build](https://www.electron.build/multi-platform-build)

### Tools
- [YAML Validator](https://www.yamllint.com/)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## 🆘 Destek

### Sorunlar için:
- 🐛 [GitHub Issues](https://github.com/turkishdeepkebab/Docdataapp/issues)
- 💬 [GitHub Discussions](https://github.com/turkishdeepkebab/Docdataapp/discussions)
- 📧 Email: support@docdataapp.com

### Katkıda bulunma:
- 🤝 [Contributing Guide](../CONTRIBUTING.md)
- 📝 [Code of Conduct](../CODE_OF_CONDUCT.md)
- 🔀 [Pull Request Template](PULL_REQUEST_TEMPLATE.md)

---

## 📋 Checklist: İlk Kurulum

Aşağıdaki adımları tamamladınız mı?

- [ ] [SETUP_GITHUB_ACTIONS.md](SETUP_GITHUB_ACTIONS.md) okudum
- [ ] Repository Settings → Actions → "Allow all actions" aktif
- [ ] Repository Settings → Actions → "Read and write permissions" aktif
- [ ] Workflow dosyaları `.github/workflows/` klasöründe
- [ ] `package.json` version numarası doğru
- [ ] Asset dosyaları hazır (icon, entitlements, vb.)
- [ ] Test workflow'u çalıştırdım
- [ ] İlk release'i oluşturdum
- [ ] Release sayfasını kontrol ettim
- [ ] Dosyaları indirip test ettim

---

## 🎉 Tebrikler!

GitHub Actions kurulumunu tamamladınız! Artık her tag push'unda otomatik olarak:

✅ Windows, macOS ve Linux build'leri oluşturulacak  
✅ GitHub Releases'e yüklenecek  
✅ Kullanıcılar tek tıkla indirebilecek  
✅ Release notları otomatik güncellenecek  

**İyi geliştirmeler!** 🚀

---

**Son Güncelleme:** 30 Ocak 2025  
**Doküman Versiyonu:** 1.0  
**Yazar:** DocDataApp Development Team

