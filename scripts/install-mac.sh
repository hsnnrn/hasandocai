#!/bin/bash

# DocDataApp Kurulum Script
# Bu script DocDataApp'i Mac'te kurar ve tüm bağımlılıkları otomatik kurar

set -e

# Renkli çıktı
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Ana kurulum fonksiyonu
main() {
    log_info "DocDataApp Kurulumu Başlatılıyor..."
    
    # 1. Gerekli araçları kontrol et
    check_requirements
    
    # 2. Ollama kurulumu
    install_ollama
    
    # 3. Python bağımlılıkları
    install_python_deps
    
    # 4. Uygulamayı başlat
    start_app
    
    log_success "Kurulum tamamlandı!"
}

# Gereksinimleri kontrol et
check_requirements() {
    log_info "Gereksinimler kontrol ediliyor..."
    
    # Homebrew kontrolü
    if ! command -v brew &> /dev/null; then
        log_info "Homebrew kuruluyor..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # Python kontrolü
    if ! command -v python3 &> /dev/null; then
        log_info "Python kuruluyor..."
        brew install python
    fi
    
    log_success "Gereksinimler karşılanıyor"
}

# Ollama kurulumu
install_ollama() {
    log_info "Ollama kurulumu..."
    
    if ! command -v ollama &> /dev/null; then
        brew install ollama
    fi
    
    # Ollama servisini başlat
    ollama serve &
    
    # Servisin başlamasını bekle
    sleep 5
    
    # Gerekli modelleri indir
    log_info "Modeller indiriliyor..."
    ollama pull llama3.2:3b || true
    ollama pull llama3.2:1b || true
    
    log_success "Ollama kurulumu tamamlandı"
}

# Python bağımlılıkları
install_python_deps() {
    log_info "Python bağımlılıkları kuruluyor..."
    
    pip3 install --user requests numpy pandas scikit-learn transformers torch sentence-transformers || true
    
    log_success "Python bağımlılıkları kuruldu"
}

# Uygulamayı başlat
start_app() {
    log_info "DocDataApp başlatılıyor..."
    
    # Uygulama yolunu bul
    APP_PATH="/Applications/DocDataApp.app"
    
    if [ -d "$APP_PATH" ]; then
        open "$APP_PATH"
        log_success "DocDataApp başlatıldı"
    else
        log_warning "DocDataApp bulunamadı, manuel olarak başlatın"
    fi
}

# Script çalıştır
main "$@"
