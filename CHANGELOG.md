# 📝 Changelog

Bu dosya DocDataApp'in tüm önemli değişikliklerini içerir.

Format [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) standardına uygun olarak düzenlenmiştir.

## [Unreleased]

### Added
- GitHub Actions ile otomatik build ve release sistemi
- Windows, macOS ve Linux için installer'lar
- Otomatik güncelleme sistemi
- SHA256 checksum doğrulama
- Kapsamlı kurulum ve sorun giderme dokümantasyonu

### Changed
- Package.json konfigürasyonu güncellendi
- Electron Builder ayarları optimize edildi
- README.md kapsamlı hale getirildi

### Fixed
- Build sürecinde dosya filtreleme iyileştirildi
- Platform-specific konfigürasyonlar düzeltildi

## [1.0.0] - 2024-01-15

### Added
- 🎉 İlk sürüm yayınlandı
- AI destekli doküman işleme özelliği
- Çoklu format desteği (PDF, DOCX, TXT)
- Modern ve kullanıcı dostu arayüz
- Windows, macOS ve Linux platform desteği
- Supabase entegrasyonu
- Electron tabanlı desktop uygulaması
- React + TypeScript frontend
- Vite build sistemi
- Tailwind CSS styling
- Lucide React iconları
- Zustand state management
- React Query data fetching
- PDF.js entegrasyonu
- Mammoth.js Word doküman desteği
- XLSX Excel dosya desteği
- UUID generation
- Electron Store persistent storage
- CORS desteği
- Express.js backend
- Python shell entegrasyonu
- ConvertAPI entegrasyonu
- PDF parse özelliği
- PDF-lib manipülasyonu
- DOCX oluşturma
- React Dropzone file upload
- Radix UI componentleri
- Class Variance Authority
- Tailwind Merge
- React Router DOM
- Axios HTTP client
- LowDB database
- Dotenv environment variables

### Technical Details
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Electron + Express.js
- **Database**: LowDB + Supabase
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State**: Zustand
- **HTTP**: Axios
- **Build**: Electron Builder
- **Platforms**: Windows, macOS, Linux

### Security
- SHA256 checksum doğrulama
- Secure environment variable handling
- CORS protection
- Input validation

### Performance
- Optimized build process
- Lazy loading components
- Efficient file processing
- Memory management

## [0.1.0] - 2024-01-01

### Added
- İlk geliştirme sürümü
- Temel Electron uygulaması
- React frontend
- TypeScript konfigürasyonu
- Vite build sistemi
- Temel doküman işleme

---

## 📋 Sürüm Notları

### Semantic Versioning
Bu proje [Semantic Versioning](https://semver.org/) standardını takip eder:
- **MAJOR** (X.0.0): Geriye dönük uyumsuz API değişiklikleri
- **MINOR** (X.Y.0): Geriye dönük uyumlu yeni özellikler
- **PATCH** (X.Y.Z): Geriye dönük uyumlu hata düzeltmeleri

### Release Süreci
1. **Development**: `develop` branch'inde geliştirme
2. **Testing**: `main` branch'inde test
3. **Release**: Tag oluşturma ve GitHub Actions tetikleme
4. **Distribution**: Otomatik installer oluşturma ve GitHub Releases'a yükleme

### Build Artifacts
Her release'de aşağıdaki dosyalar otomatik oluşturulur:
- **Windows**: `DocDataApp-Setup-x.x.x.exe` (NSIS installer)
- **macOS**: `DocDataApp-x.x.x.dmg` (Disk image)
- **Linux**: `DocDataApp-x.x.x.AppImage` (Portable app)
- **Checksums**: SHA256 hash dosyaları

### Güncelleme Mekanizması
- Otomatik güncelleme kontrolü
- Kullanıcı onayı ile güncelleme
- Rollback desteği
- Delta güncellemeleri (gelecek sürümlerde)

---

**Not**: Bu changelog otomatik olarak güncellenmektedir. Yeni özellikler ve düzeltmeler için [GitHub Repository](https://github.com/turkishdeepkebab/Docdataapp) sayfasını takip edin.