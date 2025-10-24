# 🍎 Mac DMG Kurulum Rehberi

## 📋 Genel Bakış

Bu rehber, DocDataApp'i Mac'te DMG formatında kurmak ve tüm bağımlılıkları otomatik olarak kurmak için hazırlanmıştır.

## 🎯 Özellikler

### ✅ Otomatik Kurulum
- **Ollama**: AI/LLM sunucusu otomatik kurulum
- **Python**: Gerekli Python paketleri otomatik kurulum
- **Homebrew**: Paket yöneticisi otomatik kurulum
- **Bağımlılıklar**: Tüm sistem bağımlılıkları otomatik kurulum

### 🚀 Tek Tıkla Kurulum
1. DMG dosyasını indir
2. Uygulamayı Applications'a sürükle
3. `install-mac.sh` script'ini çalıştır
4. DocDataApp kullanıma hazır!

## 📦 DMG İçeriği

```
DocDataApp.dmg
├── DocDataApp.app          # Ana uygulama
├── install-mac.sh            # Otomatik kurulum script'i
├── setup-ollama-mac.js       # Ollama kurulum script'i
├── setup-dependencies-mac.js # Bağımlılık kurulum script'i
└── README.txt                # Kurulum talimatları
```

## 🔧 Kurulum Adımları

### 1. DMG İndirme
```bash
# GitHub Releases'dan indirin
https://github.com/turkishdeepkebab/Docdataapp/releases

# Doğru mimariyi seçin:
# - Intel Mac: DocDataApp-x64.dmg
# - Apple Silicon: DocDataApp-arm64.dmg
```

### 2. DMG Açma
```bash
# DMG dosyasını çift tıklayın
# Veya terminal ile:
open DocDataApp-*.dmg
```

### 3. Uygulama Kurulumu
```bash
# DocDataApp.app'i Applications klasörüne sürükleyin
# Veya terminal ile:
cp -R DocDataApp.app /Applications/
```

### 4. Otomatik Bağımlılık Kurulumu
```bash
# Terminal açın ve DMG içindeki script'i çalıştırın
cd /Volumes/DocDataApp/
chmod +x install-mac.sh
./install-mac.sh
```

## 🤖 Ollama Otomatik Kurulumu

### Kurulum Süreci
```bash
1. Homebrew kontrol edilir (yoksa kurulur)
2. Ollama kurulur: brew install ollama
3. Ollama servisi başlatılır: ollama serve
4. Gerekli modeller indirilir:
   - llama3.2:3b (hızlı model)
   - llama3.2:1b (en hızlı model)
```

### Manuel Kontrol
```bash
# Ollama durumunu kontrol et
ollama --version

# Servis durumunu kontrol et
curl http://localhost:11434/api/tags

# Modelleri listele
ollama list

# Yeni model indir
ollama pull llama3.2:7b
```

## 🐍 Python Bağımlılıkları

### Otomatik Kurulum
```bash
# Script otomatik olarak kurar:
- Python 3.x
- pip, setuptools, wheel
- requests, numpy, pandas
- scikit-learn, transformers
- torch, sentence-transformers
```

### Manuel Kurulum
```bash
# Python kontrolü
python3 --version

# Paketleri kur
pip3 install requests numpy pandas scikit-learn transformers torch sentence-transformers
```

## 🛠️ Sistem Gereksinimleri

### Minimum Gereksinimler
- **macOS**: 10.15 (Catalina) veya üzeri
- **RAM**: 4GB (8GB önerilen)
- **Disk**: 2GB boş alan
- **İnternet**: İlk kurulum için gerekli

### Önerilen Gereksinimler
- **macOS**: 12.0 (Monterey) veya üzeri
- **RAM**: 8GB veya üzeri
- **Disk**: 5GB boş alan
- **GPU**: Apple Silicon M1/M2 (opsiyonel, hızlandırma için)

## 🔍 Sorun Giderme

### Ollama Kurulum Hatası
```bash
# Homebrew kontrolü
brew --version

# Ollama manuel kurulum
curl -fsSL https://ollama.ai/install.sh | sh

# Servis başlatma
ollama serve
```

### Python Hatası
```bash
# Python versiyonu
python3 --version

# pip güncelleme
python3 -m pip install --upgrade pip

# Paketleri yeniden kur
pip3 install --user requests numpy pandas
```

### İzin Hatası
```bash
# Script izinleri
chmod +x install-mac.sh
chmod +x setup-ollama-mac.js

# Terminal izinleri
# System Preferences > Security & Privacy > Privacy > Full Disk Access
```

### Port Çakışması
```bash
# Port 11434 kullanımda mı kontrol et
lsof -i :11434

# Ollama'yı durdur
pkill -f ollama

# Yeniden başlat
ollama serve
```

## 📊 Performans Optimizasyonu

### GPU Kullanımı (Apple Silicon)
```bash
# GPU modunu etkinleştir
export OLLAMA_NUM_GPU=1

# Ollama'yı yeniden başlat
ollama serve
```

### Bellek Optimizasyonu
```bash
# Küçük model kullan
ollama pull llama3.2:1b

# CPU modu
export OLLAMA_NUM_GPU=0
```

## 🎉 Kurulum Sonrası

### DocDataApp Başlatma
```bash
# Applications klasöründen başlatın
open /Applications/DocDataApp.app

# Veya terminal ile
/Applications/DocDataApp.app/Contents/MacOS/DocDataApp
```

### İlk Kullanım
1. DocDataApp'i açın
2. Ollama otomatik başlatılacak
3. Chatbot sekmesine gidin
4. İlk sorunuzu sorun
5. AI yanıtını alın!

## 🔄 Güncelleme

### Otomatik Güncelleme
```bash
# DocDataApp otomatik güncelleme kontrol eder
# GitHub Releases'dan yeni sürümü indirin
```

### Manuel Güncelleme
```bash
# Ollama modellerini güncelle
ollama pull llama3.2:3b

# Python paketlerini güncelle
pip3 install --upgrade requests numpy pandas
```

## 📝 Log Dosyaları

### Ollama Logları
```bash
# Ollama logları
tail -f ~/.ollama/logs/server.log

# Sistem logları
log show --predicate 'process == "ollama"' --last 1h
```

### DocDataApp Logları
```bash
# Uygulama logları
~/Library/Logs/DocDataApp/

# Console logları
Console.app > DocDataApp
```

## 🆘 Destek

### GitHub Issues
- [GitHub Issues](https://github.com/turkishdeepkebab/Docdataapp/issues)
- Bug raporları ve özellik istekleri

### Dokümantasyon
- [README.md](README.md) - Genel proje bilgileri
- [API.md](docs/API.md) - API dokümantasyonu
- [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Sorun giderme

## 🎯 Özet

| Adım | Açıklama | Süre |
|------|----------|------|
| 1 | DMG indirme | 2-5 dk |
| 2 | Uygulama kurulumu | 1 dk |
| 3 | Bağımlılık kurulumu | 5-10 dk |
| 4 | İlk kullanım | 1 dk |
| **Toplam** | **Tam kurulum** | **10-20 dk** |

---

## 🚀 Hızlı Başlangıç

```bash
# 1. DMG indir ve aç
open DocDataApp-*.dmg

# 2. Uygulamayı kur
cp -R DocDataApp.app /Applications/

# 3. Bağımlılıkları kur
cd /Volumes/DocDataApp/
./install-mac.sh

# 4. Uygulamayı başlat
open /Applications/DocDataApp.app
```

**🎉 Artık DocDataApp Mac'te kullanıma hazır!**
