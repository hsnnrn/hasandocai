# 🚀 Mac DMG Hızlı Başlangıç

## 📋 Durum

✅ **Mac DMG otomatik kurulum sistemi hazır!**
- GitHub Actions ile otomatik build
- Ollama otomatik kurulumu
- Bağımlılık otomatik yönetimi
- Tek tıkla kurulum

## 🎯 DMG Nasıl Alınır?

### Yöntem 1: GitHub Actions (Otomatik)
```bash
# 1. GitHub repository'ye gidin
https://github.com/turkishdeepkebab/Docdataapp

# 2. Actions sekmesine tıklayın
# 3. "Build and Release" workflow'unu bulun
# 4. Build tamamlandığında DMG dosyasını indirin
```

### Yöntem 2: Manuel Build (Mac'te)
```bash
# Mac'te terminal açın
cd DocDataApp

# Manuel DMG oluştur
npm run create:mac:dmg

# DMG dosyası: release/DocDataApp.dmg
```

## 📦 DMG İçeriği

```
DocDataApp.dmg
├── DocDataApp.app              # Ana uygulama
├── install-mac.sh              # Otomatik kurulum script'i
├── setup-ollama-mac.js         # Ollama kurulum script'i
├── setup-dependencies-mac.js   # Bağımlılık kurulum script'i
└── README.txt                  # Kurulum talimatları
```

## 🔧 Kurulum Adımları

### 1. DMG İndirme
- GitHub Actions'dan DMG dosyasını indirin
- Veya manuel build ile oluşturun

### 2. DMG Açma
```bash
# DMG dosyasını çift tıklayın
open DocDataApp-*.dmg
```

### 3. Uygulama Kurulumu
```bash
# DocDataApp.app'i Applications klasörüne sürükleyin
cp -R DocDataApp.app /Applications/
```

### 4. Otomatik Bağımlılık Kurulumu
```bash
# Terminal açın ve DMG içindeki script'i çalıştırın
cd /Volumes/DocDataApp/
chmod +x install-mac.sh
./install-mac.sh
```

## 🤖 Otomatik Kurulum Özellikleri

### ✅ Ollama Otomatik Kurulumu
- Homebrew ile Ollama kurulumu
- GPU/CPU otomatik algılama
- Gerekli modellerin otomatik indirilmesi
- Servis otomatik başlatma

### ✅ Bağımlılık Yönetimi
- Python otomatik kurulumu
- Python paketlerinin otomatik kurulumu
- Sistem gereksinimlerinin otomatik kontrolü

### ✅ Tek Tıkla Kurulum
1. DMG indir
2. Uygulamayı sürükle
3. Script çalıştır
4. DocDataApp kullanıma hazır!

## 🎉 Sonuç

**Mac kullanıcıları artık DocDataApp'i tek tıkla kurabilir!**

- ✅ Otomatik kurulum
- ✅ Ollama entegrasyonu
- ✅ AI/LLM desteği
- ✅ Bağımlılık yönetimi
- ✅ Tek tıkla kurulum

---

## 📞 Destek

Eğer DMG oluşturma sürecinde sorun yaşarsanız:

1. **GitHub Actions**: Actions sekmesinden build durumunu kontrol edin
2. **Manuel Build**: Mac'te `npm run create:mac:dmg` komutunu çalıştırın
3. **Destek**: GitHub Issues'dan yardım alın

**🎯 Hedef: Mac kullanıcıları için tek tıkla kurulum!**
