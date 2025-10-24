# 🔧 DocDataApp Sorun Giderme Kılavuzu

Bu kılavuz, DocDataApp ile karşılaşabileceğiniz yaygın sorunları ve çözümlerini içerir.

## 🚨 Kritik Sorunlar

### Uygulama Hiç Açılmıyor

#### Windows
```powershell
# 1. Event Viewer'da hata kontrolü
eventvwr.msc

# 2. Uygulamayı yönetici olarak çalıştırma
# DocDataApp.exe'ye sağ tıklayın > "Yönetici olarak çalıştır"

# 3. Antivirus istisnası ekleme
# Windows Defender > Virüs ve tehdit koruması > Ayarlar > İstisnalar
```

#### macOS
```bash
# 1. Console.app'te hata logları
# Applications > Utilities > Console.app
# "DocDataApp" araması yapın

# 2. Quarantine kaldırma
sudo xattr -rd com.apple.quarantine /Applications/DocDataApp.app

# 3. Gatekeeper bypass
sudo spctl --master-disable
```

#### Linux
```bash
# 1. Terminal'de çalıştırma
./DocDataApp-x.x.x.AppImage --verbose

# 2. FUSE kontrolü
sudo apt install fuse libfuse2

# 3. AppImageLauncher kurulumu
sudo apt install appimagelauncher
```

### AI Özellikleri Çalışmıyor

#### Bağlantı Sorunları
```bash
# 1. İnternet bağlantısı testi
ping google.com

# 2. DNS kontrolü
nslookup supabase.co

# 3. Proxy ayarları
export HTTP_PROXY=http://proxy:port
export HTTPS_PROXY=http://proxy:port
```

#### API Anahtarı Sorunları
```javascript
// .env dosyası kontrolü
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

// Uygulama içinde test
console.log(process.env.SUPABASE_URL);
```

### Doküman Yükleme Sorunları

#### Desteklenen Formatlar
- ✅ PDF (.pdf)
- ✅ Microsoft Word (.docx)
- ✅ Text (.txt)
- ✅ Excel (.xlsx)
- ❌ PowerPoint (.pptx) - Henüz desteklenmiyor
- ❌ Image files - Henüz desteklenmiyor

#### Dosya Boyutu Limitleri
- Maksimum dosya boyutu: 50MB
- Önerilen boyut: 10MB altı
- Toplu yükleme: Maksimum 5 dosya

#### Yükleme Hataları
```bash
# 1. Dosya izinleri kontrolü
ls -la document.pdf

# 2. Disk alanı kontrolü
df -h

# 3. Dosya bütünlüğü kontrolü
file document.pdf
```

## 🐛 Platform Spesifik Sorunlar

### Windows Sorunları

#### Windows Defender Engellemesi
1. **Windows Defender'ı Geçici Kapatma**:
   - Windows Security > Virus & threat protection
   - Real-time protection'ı kapatın
   - Uygulamayı çalıştırın
   - Real-time protection'ı tekrar açın

2. **İstisna Ekleme**:
   - Windows Security > Virus & threat protection
   - Manage settings > Add or remove exclusions
   - DocDataApp klasörünü ekleyin

#### UAC (User Account Control) Sorunları
```powershell
# UAC'yi geçici olarak kapatma (DİKKAT: Güvenlik riski)
# Control Panel > User Accounts > Change User Account Control settings
# Slider'ı "Never notify" seviyesine getirin
```

#### .NET Framework Sorunları
```powershell
# .NET Framework kontrolü
Get-ItemProperty "HKLM:SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full\" -Name Release

# Gerekirse .NET Framework 4.8 yükleyin
```

### macOS Sorunları

#### Gatekeeper Sorunları
```bash
# 1. Gatekeeper'ı geçici kapatma
sudo spctl --master-disable

# 2. Uygulamaya manuel izin verme
sudo xattr -rd com.apple.quarantine /Applications/DocDataApp.app

# 3. System Preferences'ten izin verme
# System Preferences > Security & Privacy > General
```

#### SIP (System Integrity Protection) Sorunları
```bash
# SIP durumunu kontrol etme
csrutil status

# Gerekirse SIP'i geçici kapatma (DİKKAT: Güvenlik riski)
# Recovery Mode'da Terminal açın
# csrutil disable
```

#### Xcode Command Line Tools
```bash
# Xcode Command Line Tools kurulumu
xcode-select --install

# Kurulum kontrolü
xcode-select -p
```

### Linux Sorunları

#### FUSE Sorunları
```bash
# FUSE kurulumu
sudo apt update
sudo apt install fuse libfuse2

# FUSE modülü kontrolü
lsmod | grep fuse

# FUSE modülünü yükleme
sudo modprobe fuse
```

#### AppImage Sorunları
```bash
# 1. AppImageLauncher kurulumu
sudo apt install appimagelauncher

# 2. Manuel desktop entegrasyonu
# ~/.local/share/applications/docdataapp.desktop dosyası oluşturun
```

#### Grafik Sorunları
```bash
# 1. GPU sürücülerini güncelleme
sudo apt update && sudo apt upgrade

# 2. Software rendering kullanma
./DocDataApp-x.x.x.AppImage --disable-gpu

# 3. Mesa sürücülerini kurma
sudo apt install mesa-utils
```

## 🔍 Debug ve Log Analizi

### Log Dosyaları Konumları

#### Windows
```
%APPDATA%\DocDataApp\logs\
%LOCALAPPDATA%\DocDataApp\logs\
```

#### macOS
```
~/Library/Logs/DocDataApp/
~/Library/Application Support/DocDataApp/logs/
```

#### Linux
```
~/.config/DocDataApp/logs/
~/.local/share/DocDataApp/logs/
```

### Debug Modu
```bash
# Debug modunda çalıştırma
./DocDataApp --debug
./DocDataApp --verbose
./DocDataApp --log-level=debug
```

### Log Analizi
```bash
# Son 100 satırı görüntüleme
tail -n 100 ~/.config/DocDataApp/logs/app.log

# Hata loglarını filtreleme
grep -i error ~/.config/DocDataApp/logs/app.log

# Belirli tarihteki loglar
grep "2024-01-15" ~/.config/DocDataApp/logs/app.log
```

## 🔧 Gelişmiş Sorun Giderme

### Bellek Sorunları
```bash
# Bellek kullanımını kontrol etme
# Windows
tasklist /fi "imagename eq DocDataApp.exe"

# macOS/Linux
ps aux | grep DocDataApp
top -p $(pgrep DocDataApp)
```

### Disk Alanı Sorunları
```bash
# Disk alanı kontrolü
# Windows
dir C:\ /s

# macOS/Linux
df -h
du -sh ~/.config/DocDataApp/
```

### Ağ Sorunları
```bash
# Bağlantı testi
ping supabase.co
telnet supabase.co 443

# DNS çözümleme
nslookup supabase.co
dig supabase.co
```

### Port Çakışmaları
```bash
# Port kullanımını kontrol etme
# Windows
netstat -an | findstr :3000

# macOS/Linux
netstat -an | grep :3000
lsof -i :3000
```

## 🚀 Performans Optimizasyonu

### Sistem Gereksinimleri
- **Minimum**: 4GB RAM, 2 çekirdek CPU
- **Önerilen**: 8GB RAM, 4 çekirdek CPU
- **Optimal**: 16GB RAM, 8 çekirdek CPU

### Optimizasyon Ayarları
```bash
# 1. Diğer uygulamaları kapatın
# 2. Antivirus taramasını durdurun
# 3. Disk temizliği yapın
# 4. RAM kullanımını optimize edin
```

### GPU Kullanımı
```bash
# GPU kullanımını kontrol etme
# Windows
nvidia-smi

# macOS
system_profiler SPDisplaysDataType

# Linux
nvidia-smi
lspci | grep VGA
```

## 📞 Destek ve İletişim

### Hata Bildirimi
1. [GitHub Issues](https://github.com/turkishdeepkebab/Docdataapp/issues) sayfasından yeni issue oluşturun
2. Aşağıdaki bilgileri paylaşın:
   - İşletim sistemi ve versiyonu
   - Uygulama versiyonu
   - Hata mesajı
   - Adım adım hata oluşturma süreci
   - Log dosyaları
   - Ekran görüntüleri

### Debug Bilgileri Toplama
```bash
# Sistem bilgilerini toplama
# Windows
systeminfo > debug-info.txt
wmic cpu get name > cpu-info.txt
wmic memorychip get capacity > memory-info.txt

# macOS
system_profiler SPSoftwareDataType > debug-info.txt
system_profiler SPHardwareDataType > hardware-info.txt

# Linux
uname -a > debug-info.txt
lscpu >> debug-info.txt
free -h >> debug-info.txt
```

### Log Dosyalarını Paylaşma
```bash
# Log dosyalarını arşivleme
tar -czf docdataapp-logs.tar.gz ~/.config/DocDataApp/logs/

# Veya sadece hata logları
grep -i error ~/.config/DocDataApp/logs/app.log > errors.log
```

---

**Not**: Bu kılavuz sürekli güncellenmektedir. Yeni sorunlar ve çözümler için [GitHub Repository](https://github.com/turkishdeepkebab/Docdataapp) sayfasını takip edin.
