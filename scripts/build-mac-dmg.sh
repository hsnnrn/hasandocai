#!/bin/bash

# Mac DMG Build Script
# Bu script Mac'te DocDataApp için DMG oluşturur ve tüm bağımlılıkları otomatik kurar

set -e  # Hata durumunda scripti durdur

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log fonksiyonları
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Sistem bilgilerini yazdır
print_system_info() {
    log_info "Sistem Bilgileri:"
    echo "   Platform: $(uname -s)"
    echo "   Mimari: $(uname -m)"
    echo "   macOS: $(sw_vers -productVersion)"
    echo "   Node.js: $(node --version 2>/dev/null || echo 'Kurulu değil')"
    echo "   NPM: $(npm --version 2>/dev/null || echo 'Kurulu değil')"
    echo ""
}

# Gerekli araçları kontrol et
check_requirements() {
    log_info "Gereksinimler kontrol ediliyor..."
    
    # Node.js kontrolü
    if ! command -v node &> /dev/null; then
        log_error "Node.js bulunamadı!"
        log_info "Node.js kurulumu için: https://nodejs.org"
        exit 1
    fi
    
    # NPM kontrolü
    if ! command -v npm &> /dev/null; then
        log_error "NPM bulunamadı!"
        exit 1
    fi
    
    # Git kontrolü
    if ! command -v git &> /dev/null; then
        log_warning "Git bulunamadı, kuruluyor..."
        if command -v brew &> /dev/null; then
            brew install git
        else
            log_error "Git kurulamadı! Lütfen manuel olarak kurun."
            exit 1
        fi
    fi
    
    log_success "Tüm gereksinimler karşılanıyor"
}

# Proje dizinini temizle
clean_project() {
    log_info "Proje temizleniyor..."
    
    # Eski build dosyalarını sil
    rm -rf dist/
    rm -rf release/
    rm -rf node_modules/
    
    # Cache temizle
    npm cache clean --force
    
    log_success "Proje temizlendi"
}

# Bağımlılıkları kur
install_dependencies() {
    log_info "Bağımlılıklar kuruluyor..."
    
    # NPM bağımlılıklarını kur
    npm install --production=false
    
    # Electron rebuild
    npm run electron-rebuild
    
    log_success "Bağımlılıklar kuruldu"
}

# Ollama kurulumu
setup_ollama() {
    log_info "Ollama kurulumu kontrol ediliyor..."
    
    # Ollama kurulu mu kontrol et
    if command -v ollama &> /dev/null; then
        log_success "Ollama zaten kurulu"
    else
        log_info "Ollama kuruluyor..."
        
        # Homebrew ile Ollama kur
        if command -v brew &> /dev/null; then
            brew install ollama
        else
            log_warning "Homebrew bulunamadı, Ollama manuel kurulum gerekli"
            log_info "Ollama kurulumu için: https://ollama.ai"
        fi
    fi
    
    # Ollama servisini başlat
    log_info "Ollama servisi başlatılıyor..."
    ollama serve &
    OLLAMA_PID=$!
    
    # Servisin başlamasını bekle
    sleep 5
    
    # Servis durumunu kontrol et
    if curl -s http://localhost:11434/api/tags > /dev/null; then
        log_success "Ollama servisi başlatıldı"
    else
        log_warning "Ollama servisi başlatılamadı"
    fi
}

# Projeyi build et
build_project() {
    log_info "Proje build ediliyor..."
    
    # Renderer build
    log_info "Renderer build ediliyor..."
    npm run build:renderer
    
    # Main build
    log_info "Main process build ediliyor..."
    npm run build:main
    
    log_success "Proje build edildi"
}

# DMG oluştur
create_dmg() {
    log_info "DMG oluşturuluyor..."
    
    # Electron builder ile DMG oluştur
    npm run build:mac:dmg
    
    log_success "DMG oluşturuldu"
}

# DMG'yi doğrula
verify_dmg() {
    log_info "DMG doğrulanıyor..."
    
    # DMG dosyasını bul
    DMG_FILE=$(find release/ -name "*.dmg" | head -1)
    
    if [ -f "$DMG_FILE" ]; then
        log_success "DMG dosyası bulundu: $DMG_FILE"
        
        # Dosya boyutunu göster
        FILE_SIZE=$(du -h "$DMG_FILE" | cut -f1)
        log_info "DMG boyutu: $FILE_SIZE"
        
        # DMG içeriğini listele
        log_info "DMG içeriği:"
        hdiutil info "$DMG_FILE" | grep -E "(mount-point|dev-node)"
        
    else
        log_error "DMG dosyası bulunamadı!"
        exit 1
    fi
}

# Ollama servisini durdur
cleanup() {
    log_info "Temizlik yapılıyor..."
    
    # Ollama servisini durdur
    if [ ! -z "$OLLAMA_PID" ]; then
        kill $OLLAMA_PID 2>/dev/null || true
        log_success "Ollama servisi durduruldu"
    fi
    
    # Geçici dosyaları temizle
    rm -rf /tmp/docdataapp-*
    
    log_success "Temizlik tamamlandı"
}

# Hata durumunda temizlik
trap cleanup EXIT

# Ana fonksiyon
main() {
    log_info "🍎 Mac DMG Build Script Başlatılıyor..."
    echo "=========================================="
    
    # Sistem bilgilerini yazdır
    print_system_info
    
    # Gereksinimleri kontrol et
    check_requirements
    
    # Projeyi temizle
    clean_project
    
    # Bağımlılıkları kur
    install_dependencies
    
    # Ollama kurulumu
    setup_ollama
    
    # Projeyi build et
    build_project
    
    # DMG oluştur
    create_dmg
    
    # DMG'yi doğrula
    verify_dmg
    
    echo "=========================================="
    log_success "🎉 DMG oluşturma tamamlandı!"
    log_info "DMG dosyası: $(find release/ -name "*.dmg" | head -1)"
    log_info "Kurulum için DMG dosyasını çift tıklayın"
}

# Script çalıştır
main "$@"
