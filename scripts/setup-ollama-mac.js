#!/usr/bin/env node

/**
 * Ollama Otomatik Kurulum Script - macOS
 * 
 * Bu script Mac'te Ollama'yı otomatik olarak kurar ve yapılandırır.
 * DMG içinde çalışacak şekilde tasarlanmıştır.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class OllamaMacInstaller {
  constructor() {
    this.isInstalled = false;
    this.isRunning = false;
    this.arch = os.arch();
    this.platform = os.platform();
    this.homeDir = os.homedir();
    this.ollamaPath = '/usr/local/bin/ollama';
    this.ollamaServicePath = path.join(this.homeDir, '.ollama');
  }

  /**
   * Ana kurulum fonksiyonu
   */
  async install() {
    console.log('🍎 Mac Ollama Kurulumu Başlatılıyor...');
    console.log(`📊 Sistem: ${this.platform} ${this.arch}`);
    
    try {
      // 1. Ollama kurulu mu kontrol et
      await this.checkInstallation();
      
      if (!this.isInstalled) {
        // 2. Ollama'yı kur
        await this.installOllama();
      }
      
      // 3. Ollama servisini başlat
      await this.startOllamaService();
      
      // 4. Gerekli modelleri indir
      await this.downloadModels();
      
      // 5. Servis durumunu kontrol et
      await this.verifyInstallation();
      
      console.log('✅ Ollama kurulumu tamamlandı!');
      return true;
      
    } catch (error) {
      console.error('❌ Ollama kurulumu başarısız:', error.message);
      return false;
    }
  }

  /**
   * Ollama kurulu mu kontrol et
   */
  async checkInstallation() {
    try {
      execSync('ollama --version', { stdio: 'pipe' });
      this.isInstalled = true;
      console.log('✅ Ollama zaten kurulu');
    } catch (error) {
      this.isInstalled = false;
      console.log('⚠️ Ollama kurulu değil, kurulum başlatılıyor...');
    }
  }

  /**
   * Ollama'yı Homebrew ile kur
   */
  async installOllama() {
    console.log('📦 Ollama kurulumu başlatılıyor...');
    
    try {
      // Homebrew kurulu mu kontrol et
      try {
        execSync('brew --version', { stdio: 'pipe' });
        console.log('✅ Homebrew bulundu');
      } catch (error) {
        console.log('📦 Homebrew kurulumu...');
        execSync('/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"', 
          { stdio: 'inherit' });
      }

      // Ollama'yı kur
      console.log('📦 Ollama kurulumu...');
      execSync('brew install ollama', { stdio: 'inherit' });
      
      this.isInstalled = true;
      console.log('✅ Ollama başarıyla kuruldu');
      
    } catch (error) {
      throw new Error(`Ollama kurulumu başarısız: ${error.message}`);
    }
  }

  /**
   * Ollama servisini başlat
   */
  async startOllamaService() {
    console.log('🚀 Ollama servisi başlatılıyor...');
    
    try {
      // Ollama servisini başlat
      const ollamaProcess = spawn('ollama', ['serve'], {
        detached: true,
        stdio: 'ignore'
      });
      
      ollamaProcess.unref();
      
      // Servisin başlamasını bekle
      await this.waitForService();
      
      this.isRunning = true;
      console.log('✅ Ollama servisi başlatıldı');
      
    } catch (error) {
      throw new Error(`Ollama servisi başlatılamadı: ${error.message}`);
    }
  }

  /**
   * Servisin başlamasını bekle
   */
  async waitForService() {
    const maxAttempts = 30;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        execSync('curl -s http://localhost:11434/api/tags', { stdio: 'pipe' });
        console.log('✅ Ollama servisi hazır');
        return;
      } catch (error) {
        attempts++;
        console.log(`⏳ Servis başlatılıyor... (${attempts}/${maxAttempts})`);
        await this.sleep(1000);
      }
    }
    
    throw new Error('Ollama servisi başlatılamadı (timeout)');
  }

  /**
   * Gerekli modelleri indir
   */
  async downloadModels() {
    console.log('📥 Gerekli modeller indiriliyor...');
    
    const models = [
      'llama3.2:3b',  // Hızlı ve hafif model
      'llama3.2:1b'   // En hızlı model
    ];
    
    for (const model of models) {
      try {
        console.log(`📥 ${model} indiriliyor...`);
        execSync(`ollama pull ${model}`, { stdio: 'inherit' });
        console.log(`✅ ${model} indirildi`);
      } catch (error) {
        console.log(`⚠️ ${model} indirilemedi: ${error.message}`);
      }
    }
  }

  /**
   * Kurulumu doğrula
   */
  async verifyInstallation() {
    try {
      // Ollama versiyonunu kontrol et
      const version = execSync('ollama --version', { encoding: 'utf8' });
      console.log(`📊 Ollama versiyonu: ${version.trim()}`);
      
      // Servis durumunu kontrol et
      execSync('curl -s http://localhost:11434/api/tags', { stdio: 'pipe' });
      console.log('✅ Ollama servisi çalışıyor');
      
      // Modelleri listele
      const models = execSync('ollama list', { encoding: 'utf8' });
      console.log('📋 Kurulu modeller:');
      console.log(models);
      
      return true;
      
    } catch (error) {
      throw new Error(`Kurulum doğrulaması başarısız: ${error.message}`);
    }
  }

  /**
   * Ollama servisini durdur
   */
  async stopOllamaService() {
    try {
      execSync('pkill -f ollama', { stdio: 'pipe' });
      console.log('🛑 Ollama servisi durduruldu');
    } catch (error) {
      console.log('⚠️ Ollama servisi zaten durmuş');
    }
  }

  /**
   * Sleep fonksiyonu
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Sistem bilgilerini yazdır
   */
  printSystemInfo() {
    console.log('\n📊 Sistem Bilgileri:');
    console.log(`   Platform: ${this.platform}`);
    console.log(`   Mimari: ${this.arch}`);
    console.log(`   Home Directory: ${this.homeDir}`);
    console.log(`   Ollama Path: ${this.ollamaPath}`);
    console.log(`   Service Path: ${this.ollamaServicePath}`);
  }
}

/**
 * Ana fonksiyon
 */
async function main() {
  const installer = new OllamaMacInstaller();
  
  installer.printSystemInfo();
  
  const success = await installer.install();
  
  if (success) {
    console.log('\n🎉 Ollama kurulumu başarıyla tamamlandı!');
    console.log('📝 Kullanım:');
    console.log('   - Ollama servisi otomatik başlatıldı');
    console.log('   - Modeller hazır');
    console.log('   - DocDataApp kullanıma hazır');
  } else {
    console.log('\n❌ Ollama kurulumu başarısız!');
    console.log('📝 Manuel kurulum için:');
    console.log('   1. https://ollama.ai adresine gidin');
    console.log('   2. macOS için Ollama\'yı indirin');
    console.log('   3. Kurulum dosyasını çalıştırın');
    process.exit(1);
  }
}

// Script çalıştırılıyorsa main fonksiyonunu çağır
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  });
}

module.exports = OllamaMacInstaller;
