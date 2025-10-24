# 📥 DocDataApp Kurulum Kılavuzu

Bu kılavuz, DocDataApp'i farklı işletim sistemlerinde nasıl kuracağınızı adım adım açıklar.

## 🖥️ Windows Kurulumu

### Gereksinimler
- Windows 10 veya üzeri
- 4GB RAM (8GB önerilir)
- 500MB boş disk alanı
- İnternet bağlantısı

### Kurulum Adımları

1. **İndirme**
   - [GitHub Releases](https://github.com/turkishdeepkebab/Docdataapp/releases/latest) sayfasına gidin
   - `DocDataApp-Setup-x.x.x.exe` dosyasını indirin

2. **Güvenlik Kontrolü**
   ```powershell
   # PowerShell'de checksum kontrolü
   Get-FileHash "DocDataApp-Setup-x.x.x.exe" -Algorithm SHA256
   ```

3. **Kurulum**
   - İndirilen `.exe` dosyasına sağ tıklayın
   - "Yönetici olarak çalıştır" seçin
   - Kurulum sihirbazını takip edin
   - Desktop shortcut oluşturmayı seçin

4. **İlk Çalıştırma**
   - Desktop'taki DocDataApp ikonuna çift tıklayın
   - Windows Defender uyarısı çıkarsa "Daha fazla bilgi" > "Yine de çalıştır" seçin

### Windows Sorun Giderme

**Problem**: "Windows protected your PC" hatası
**Çözüm**: 
1. Dosyaya sağ tıklayın
2. "Özellikler" > "Genel" sekmesi
3. "Güvenlik" bölümünde "Engellemeyi kaldır" işaretleyin

**Problem**: Uygulama açılmıyor
**Çözüm**:
1. Windows Defender'ı geçici olarak kapatın
2. Antivirus yazılımınızı kontrol edin
3. Uygulamayı yönetici olarak çalıştırın

## 🍎 macOS Kurulumu

### Gereksinimler
- macOS 10.14 (Mojave) veya üzeri
- 4GB RAM (8GB önerilir)
- 500MB boş disk alanı
- İnternet bağlantısı

### Kurulum Adımları

1. **İndirme**
   - [GitHub Releases](https://github.com/turkishdeepkebab/Docdataapp/releases/latest) sayfasına gidin
   - `DocDataApp-x.x.x.dmg` dosyasını indirin

2. **Güvenlik Kontrolü**
   ```bash
   # Terminal'de checksum kontrolü
   shasum -a 256 DocDataApp-x.x.x.dmg
   ```

3. **Kurulum**
   - İndirilen `.dmg` dosyasına çift tıklayın
   - DMG açıldığında DocDataApp'i Applications klasörüne sürükleyin
   - Applications klasöründen DocDataApp'i çalıştırın

4. **İlk Çalıştırma**
   - "DocDataApp is damaged" uyarısı çıkarsa:
   ```bash
   # Terminal'de şu komutu çalıştırın:
   sudo xattr -rd com.apple.quarantine /Applications/DocDataApp.app
   ```

### macOS Sorun Giderme

**Problem**: "App is damaged and can't be opened"
**Çözüm**:
```bash
# Terminal'de çalıştırın:
sudo xattr -rd com.apple.quarantine /Applications/DocDataApp.app
```

**Problem**: Gatekeeper uyarısı
**Çözüm**:
1. System Preferences > Security & Privacy
2. "Open Anyway" butonuna tıklayın

**Problem**: Uygulama açılmıyor
**Çözüm**:
1. Activity Monitor'da DocDataApp sürecini sonlandırın
2. Uygulamayı tekrar başlatın
3. Console.app'te hata loglarını kontrol edin

## 🐧 Linux Kurulumu

### Gereksinimler
- Ubuntu 18.04+ veya eşdeğer dağıtım
- 4GB RAM (8GB önerilir)
- 500MB boş disk alanı
- İnternet bağlantısı

### Kurulum Adımları

1. **İndirme**
   - [GitHub Releases](https://github.com/turkishdeepkebab/Docdataapp/releases/latest) sayfasına gidin
   - `DocDataApp-x.x.x.AppImage` dosyasını indirin

2. **Güvenlik Kontrolü**
   ```bash
   # Checksum kontrolü
   sha256sum DocDataApp-x.x.x.AppImage
   ```

3. **Kurulum**
   ```bash
   # Dosyayı çalıştırılabilir yapın
   chmod +x DocDataApp-x.x.x.AppImage
   
   # Uygulamayı çalıştırın
   ./DocDataApp-x.x.x.AppImage
   ```

4. **Desktop Entegrasyonu (Opsiyonel)**
   ```bash
   # AppImageLauncher kurulumu (Ubuntu/Debian)
   sudo apt install appimagelauncher
   
   # Veya manuel desktop dosyası oluşturun
   ```

### Linux Sorun Giderme

**Problem**: "Permission denied" hatası
**Çözüm**:
```bash
chmod +x DocDataApp-x.x.x.AppImage
```

**Problem**: AppImage çalışmıyor
**Çözüm**:
```bash
# FUSE kontrolü
sudo apt install fuse libfuse2

# Veya AppImageLauncher kullanın
sudo apt install appimagelauncher
```

**Problem**: Grafik sorunları
**Çözüm**:
```bash
# GPU sürücülerini güncelleyin
sudo apt update && sudo apt upgrade

# Veya software rendering kullanın
./DocDataApp-x.x.x.AppImage --disable-gpu
```

## 🔧 Gelişmiş Yapılandırma

### Environment Variables

```bash
# .env dosyası oluşturun
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
NODE_ENV=production
```

### Proxy Ayarları

```bash
# Proxy kullanıyorsanız
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
```

### Debug Modu

```bash
# Debug modunda çalıştırma
./DocDataApp --debug
# veya
./DocDataApp --verbose
```

## 🚨 Yaygın Sorunlar ve Çözümleri

### Genel Sorunlar

**Problem**: Uygulama yavaş çalışıyor
**Çözüm**:
- RAM kullanımını kontrol edin
- Diğer uygulamaları kapatın
- Antivirus taramasını durdurun

**Problem**: AI özellikleri çalışmıyor
**Çözüm**:
- İnternet bağlantınızı kontrol edin
- Firewall ayarlarını kontrol edin
- API anahtarlarını doğrulayın

**Problem**: Doküman yüklenmiyor
**Çözüm**:
- Dosya formatını kontrol edin (PDF, DOCX, TXT desteklenir)
- Dosya boyutunu kontrol edin (max 50MB)
- Dosya izinlerini kontrol edin

### Platform Spesifik Sorunlar

#### Windows
- **Antivirus Engellemesi**: DocDataApp'i antivirus istisnalarına ekleyin
- **Windows Defender**: Real-time protection'ı geçici olarak kapatın
- **UAC Sorunları**: Uygulamayı yönetici olarak çalıştırın

#### macOS
- **Gatekeeper**: System Preferences'ten uygulamaya izin verin
- **SIP (System Integrity Protection)**: Gerekirse SIP'i geçici olarak kapatın
- **Xcode Command Line Tools**: `xcode-select --install` çalıştırın

#### Linux
- **FUSE**: `sudo apt install fuse libfuse2`
- **AppImageLauncher**: `sudo apt install appimagelauncher`
- **Desktop Entegrasyonu**: AppImageLauncher kullanın

## 📞 Destek

### Hata Bildirimi

1. [GitHub Issues](https://github.com/turkishdeepkebab/Docdataapp/issues) sayfasından yeni issue oluşturun
2. Aşağıdaki bilgileri paylaşın:
   - İşletim sistemi ve versiyonu
   - Uygulama versiyonu
   - Hata mesajı
   - Adım adım hata oluşturma süreci
   - Ekran görüntüleri

### Log Dosyaları

#### Windows
```
%APPDATA%/DocDataApp/logs/
```

#### macOS
```
~/Library/Logs/DocDataApp/
```

#### Linux
```
~/.config/DocDataApp/logs/
```

### Debug Bilgileri

```bash
# Sistem bilgilerini toplama
# Windows
systeminfo > system-info.txt

# macOS
system_profiler SPSoftwareDataType > system-info.txt

# Linux
uname -a > system-info.txt
lscpu >> system-info.txt
```

## 🔄 Güncelleme

### Otomatik Güncelleme

DocDataApp otomatik güncelleme özelliğine sahiptir:
- Yeni versiyonlar otomatik olarak kontrol edilir
- Güncelleme bildirimi gösterilir
- Tek tıkla güncelleme yapılabilir

### Manuel Güncelleme

1. [GitHub Releases](https://github.com/turkishdeepkebab/Docdataapp/releases) sayfasına gidin
2. En son versiyonu indirin
3. Eski versiyonu kaldırın (gerekirse)
4. Yeni versiyonu kurun

---

**Not**: Bu kılavuz sürekli güncellenmektedir. En son versiyon için [GitHub Repository](https://github.com/turkishdeepkebab/Docdataapp) sayfasını ziyaret edin.
