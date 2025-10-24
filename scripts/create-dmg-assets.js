#!/usr/bin/env node

/**
 * DMG Assets Creator
 * 
 * Bu script DMG için gerekli asset'leri oluşturur.
 */

const fs = require('fs');
const path = require('path');

class DMGAssetsCreator {
  constructor() {
    this.assetsDir = 'assets';
    this.scriptsDir = 'scripts';
  }

  /**
   * DMG arka plan resmi oluştur
   */
  createDMGBackground() {
    console.log('🎨 DMG arka plan resmi oluşturuluyor...');
    
    // SVG arka plan oluştur
    const svgContent = `
<?xml version="1.0" encoding="UTF-8"?>
<svg width="640" height="400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Arka plan -->
  <rect width="640" height="400" fill="url(#bg)"/>
  
  <!-- Logo alanı -->
  <circle cx="320" cy="120" r="60" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
  <text x="320" y="130" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="24" font-weight="bold">DocData</text>
  
  <!-- Başlık -->
  <text x="320" y="200" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="28" font-weight="bold">DocDataApp</text>
  
  <!-- Alt başlık -->
  <text x="320" y="230" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="16">AI-Powered Document Analysis</text>
  
  <!-- Özellikler -->
  <text x="320" y="270" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="Arial, sans-serif" font-size="14">• Document Processing</text>
  <text x="320" y="290" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="Arial, sans-serif" font-size="14">• AI Chatbot</text>
  <text x="320" y="310" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="Arial, sans-serif" font-size="14">• Local LLM Support</text>
  
  <!-- Sürükleme talimatı -->
  <text x="320" y="350" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-family="Arial, sans-serif" font-size="12">Drag to Applications to install</text>
</svg>`;

    // SVG dosyasını kaydet
    const svgPath = path.join(this.assetsDir, 'dmg-background.svg');
    fs.writeFileSync(svgPath, svgContent);
    console.log('✅ SVG arka plan oluşturuldu');
    
    return svgPath;
  }

  /**
   * DMG konfigürasyon dosyası oluştur
   */
  createDMGConfig() {
    console.log('⚙️ DMG konfigürasyonu oluşturuluyor...');
    
    const config = {
      title: 'DocDataApp',
      icon: 'assets/icon.svg',
      background: 'assets/dmg-background.svg',
      contents: [
        {
          x: 140,
          y: 200,
          type: 'file'
        },
        {
          x: 500,
          y: 200,
          type: 'link',
          path: '/Applications'
        }
      ],
      window: {
        width: 640,
        height: 400
      }
    };
    
    const configPath = path.join(this.assetsDir, 'dmg-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('✅ DMG konfigürasyonu oluşturuldu');
    
    return configPath;
  }

  /**
   * Kurulum script'i oluştur
   */
  createInstallScript() {
    console.log('📦 Kurulum script\'i oluşturuluyor...');
    
    const installScript = `#!/bin/bash

# DocDataApp Kurulum Script
# Bu script DocDataApp'i Mac'te kurar ve tüm bağımlılıkları otomatik kurar

set -e

# Renkli çıktı
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m'

log_info() {
    echo -e "\${BLUE}ℹ️  \$1\${NC}"
}

log_success() {
    echo -e "\${GREEN}✅ \$1\${NC}"
}

log_warning() {
    echo -e "\${YELLOW}⚠️  \$1\${NC}"
}

log_error() {
    echo -e "\${RED}❌ \$1\${NC}"
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
        /bin/bash -c "\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
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
    
    if [ -d "\$APP_PATH" ]; then
        open "\$APP_PATH"
        log_success "DocDataApp başlatıldı"
    else
        log_warning "DocDataApp bulunamadı, manuel olarak başlatın"
    fi
}

# Script çalıştır
main "\$@"
`;

    const scriptPath = path.join(this.scriptsDir, 'install-mac.sh');
    fs.writeFileSync(scriptPath, installScript);
    
    // Script'i çalıştırılabilir yap
    try {
        require('child_process').execSync(`chmod +x ${scriptPath}`);
    } catch (error) {
        console.log('⚠️ Script izinleri ayarlanamadı (Windows)');
    }
    
    console.log('✅ Kurulum script\'i oluşturuldu');
    return scriptPath;
  }

  /**
   * Tüm asset'leri oluştur
   */
  createAll() {
    console.log('🎨 DMG Asset\'leri oluşturuluyor...');
    
    // Assets dizinini oluştur
    if (!fs.existsSync(this.assetsDir)) {
      fs.mkdirSync(this.assetsDir, { recursive: true });
    }
    
    // Scripts dizinini oluştur
    if (!fs.existsSync(this.scriptsDir)) {
      fs.mkdirSync(this.scriptsDir, { recursive: true });
    }
    
    // Asset'leri oluştur
    this.createDMGBackground();
    this.createDMGConfig();
    this.createInstallScript();
    
    console.log('✅ Tüm asset\'ler oluşturuldu');
  }
}

/**
 * Ana fonksiyon
 */
function main() {
  const creator = new DMGAssetsCreator();
  creator.createAll();
}

// Script çalıştırılıyorsa main fonksiyonunu çağır
if (require.main === module) {
  main();
}

module.exports = DMGAssetsCreator;
