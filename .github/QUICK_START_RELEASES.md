# ⚡ Hızlı Başlangıç: GitHub Actions ile Otomatik Release

## 🎯 3 Adımda Release Oluştur

### 1️⃣ Versiyon Güncelle

`package.json` dosyasını düzenle:

```json
{
  "version": "1.0.1"  // Yeni version numarası
}
```

### 2️⃣ Tag Oluştur ve Push Et

```bash
# Commit et (isteğe bağlı)
git add package.json
git commit -m "chore: bump version to 1.0.1"
git push

# Tag oluştur
git tag v1.0.1

# Tag'i push et (bu adım release'i tetikler!)
git push origin v1.0.1
```

### 3️⃣ Bekle ve İndir! ⏳

GitHub Actions otomatik olarak:
- ✅ Windows installer oluşturur (~15 dk)
- ✅ macOS DMG oluşturur (~16 dk)
- ✅ Linux packages oluşturur (~14 dk)
- ✅ GitHub Releases'e yükler
- ✅ Release notları ekler

**Release hazır!** 🎉

👉 https://github.com/turkishdeepkebab/Docdataapp/releases/latest

---

## 📦 Oluşan Dosyalar

### Windows
- `DocDataApp-Setup-1.0.1.exe` - Installer (önerilen)
- `DocDataApp-Portable-1.0.1.exe` - Portable

### macOS
- `DocDataApp-1.0.1.dmg` - DMG installer
- `DocDataApp-1.0.1-mac.zip` - ZIP paketi

### Linux
- `DocDataApp-1.0.1.AppImage` - AppImage
- `DocDataApp-1.0.1.deb` - Debian/Ubuntu
- `DocDataApp-1.0.1.rpm` - Fedora/RHEL

---

## 🔍 İlerlemeyi İzle

1. GitHub repo'ya git
2. **Actions** sekmesine tıkla
3. En son workflow run'ı gör
4. Her platform'un build durumunu takip et

---

## 🆘 Sorun Çözümleri

### "Build failed" hatası?
```bash
# Dependencies'i temizle ve yeniden yükle
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "fix: update package-lock"
git push
```

### Tag'i yanlış oluşturdum?
```bash
# Local tag'i sil
git tag -d v1.0.1

# Remote tag'i sil
git push origin :refs/tags/v1.0.1

# Doğru tag'i oluştur
git tag v1.0.1
git push origin v1.0.1
```

### Workflow çalışmadı?
1. GitHub Settings → Actions → "Allow all actions" aktif mi?
2. Tag `v` ile başlıyor mu? (örn: `v1.0.1`)
3. GITHUB_TOKEN izinleri yeterli mi?
   - Settings → Actions → Workflow permissions → "Read and write"

---

## 💡 Pro İpuçları

### Pre-release Oluştur
Test için önce beta release oluştur:
```bash
git tag v1.0.1-beta.1
git push origin v1.0.1-beta.1
```

### Manuel Workflow Çalıştır
1. Actions → Build and Release
2. Run workflow → Select branch
3. Run workflow butonu

### Commit Message Kuralları
Release notları için özel commit formatı kullan:

```bash
feat: yeni özellik ekle          # 🚀 Yeni Özellikler
fix: hata düzelt                 # 🐛 Hata Düzeltmeleri
docs: dokümantasyon güncelle     # 📚 Dokümantasyon
perf: performans iyileştir       # ⚡ Performans
refactor: kod düzenle            # 🔧 İyileştirmeler
style: UI/UX güncelle           # 🎨 UI/UX
test: test ekle                 # 🧪 Test
chore: genel güncelleme         # 📦 Diğer
```

### Semantic Versioning
Version numaralarını doğru belirle:

- `1.0.0` → `2.0.0` = Breaking changes (MAJOR)
- `1.0.0` → `1.1.0` = Yeni özellik (MINOR)
- `1.0.0` → `1.0.1` = Bug fix (PATCH)

---

## 📚 Daha Fazla Bilgi

- 📖 [Detaylı Release Kılavuzu](.github/RELEASE_GUIDE.md)
- 🔧 [GitHub Actions Setup](https://docs.github.com/en/actions)
- 📦 [Electron Builder Docs](https://www.electron.build/)

---

## ✅ Release Checklist

Release yapmadan önce kontrol et:

- [ ] Version numarası güncellendi
- [ ] CHANGELOG.md güncellendi
- [ ] Tüm testler geçiyor
- [ ] README güncel
- [ ] Dokümantasyon güncel
- [ ] Breaking changes belirtilmiş (varsa)
- [ ] Tag doğru format (v1.0.0)

---

**Hazır mısın? Hadi başla!** 🚀

```bash
git tag v1.0.0 && git push origin v1.0.0
```

