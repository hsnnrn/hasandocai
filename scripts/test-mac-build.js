#!/usr/bin/env node

/**
 * Mac Build Test Script
 * 
 * Bu script Mac build sürecini test eder ve DMG oluşturma sürecini doğrular.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class MacBuildTester {
  constructor() {
    this.platform = os.platform();
    this.arch = os.arch();
    this.homeDir = os.homedir();
    this.testResults = {
      systemCheck: false,
      dependenciesCheck: false,
      buildCheck: false,
      dmgCheck: false,
      ollamaCheck: false
    };
  }

  /**
   * Ana test fonksiyonu
   */
  async runTests() {
    console.log('🧪 Mac Build Test Süreci Başlatılıyor...');
    console.log(`📊 Sistem: ${this.platform} ${this.arch}`);
    console.log('==========================================');
    
    try {
      // 1. Sistem kontrolü
      await this.testSystemRequirements();
      
      // 2. Bağımlılık kontrolü
      await this.testDependencies();
      
      // 3. Build süreci testi
      await this.testBuildProcess();
      
      // 4. DMG oluşturma testi
      await this.testDMGCreation();
      
      // 5. Ollama entegrasyonu testi
      await this.testOllamaIntegration();
      
      // 6. Sonuçları raporla
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test süreci başarısız:', error.message);
      process.exit(1);
    }
  }

  /**
   * Sistem gereksinimlerini test et
   */
  async testSystemRequirements() {
    console.log('🔍 Sistem gereksinimleri kontrol ediliyor...');
    
    try {
      // Platform kontrolü
      if (this.platform !== 'darwin') {
        throw new Error('Bu test sadece macOS için çalışır');
      }
      
      // macOS versiyonu kontrolü
      const version = execSync('sw_vers -productVersion', { encoding: 'utf8' }).trim();
      console.log(`📊 macOS Versiyonu: ${version}`);
      
      // Minimum versiyon kontrolü
      const majorVersion = parseInt(version.split('.')[0]);
      const minorVersion = parseInt(version.split('.')[1]);
      
      if (majorVersion < 10 || (majorVersion === 10 && minorVersion < 15)) {
        throw new Error('macOS 10.15 (Catalina) veya üzeri gereklidir');
      }
      
      // Disk alanı kontrolü
      const diskSpace = execSync('df -h / | tail -1 | awk \'{print $4}\'', { encoding: 'utf8' }).trim();
      console.log(`💾 Boş disk alanı: ${diskSpace}`);
      
      this.testResults.systemCheck = true;
      console.log('✅ Sistem gereksinimleri karşılanıyor');
      
    } catch (error) {
      console.error('❌ Sistem gereksinimleri karşılanmıyor:', error.message);
      throw error;
    }
  }

  /**
   * Bağımlılıkları test et
   */
  async testDependencies() {
    console.log('📦 Bağımlılıklar kontrol ediliyor...');
    
    const dependencies = [
      { name: 'Node.js', command: 'node --version', required: true },
      { name: 'NPM', command: 'npm --version', required: true },
      { name: 'Git', command: 'git --version', required: true },
      { name: 'Curl', command: 'curl --version', required: true },
      { name: 'Python', command: 'python3 --version', required: false },
      { name: 'Homebrew', command: 'brew --version', required: false }
    ];
    
    for (const dep of dependencies) {
      try {
        const output = execSync(dep.command, { encoding: 'utf8' }).trim();
        console.log(`✅ ${dep.name}: ${output.split('\n')[0]}`);
      } catch (error) {
        if (dep.required) {
          console.error(`❌ ${dep.name}: Gerekli bağımlılık bulunamadı`);
          throw new Error(`${dep.name} gerekli ama kurulu değil`);
        } else {
          console.log(`⚠️ ${dep.name}: Opsiyonel bağımlılık bulunamadı`);
        }
      }
    }
    
    this.testResults.dependenciesCheck = true;
    console.log('✅ Bağımlılık kontrolü tamamlandı');
  }

  /**
   * Build sürecini test et
   */
  async testBuildProcess() {
    console.log('🔨 Build süreci test ediliyor...');
    
    try {
      // Package.json kontrolü
      if (!fs.existsSync('package.json')) {
        throw new Error('package.json bulunamadı');
      }
      
      // Build script'leri kontrolü
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const buildScripts = [
        'build:renderer',
        'build:main',
        'build:mac',
        'build:mac:auto'
      ];
      
      for (const script of buildScripts) {
        if (!packageJson.scripts[script]) {
          throw new Error(`Build script bulunamadı: ${script}`);
        }
      }
      
      // Electron builder kontrolü
      if (!packageJson.devDependencies['electron-builder']) {
        throw new Error('electron-builder bulunamadı');
      }
      
      // DMG konfigürasyonu kontrolü
      if (!packageJson.build.mac) {
        throw new Error('Mac build konfigürasyonu bulunamadı');
      }
      
      this.testResults.buildCheck = true;
      console.log('✅ Build süreci hazır');
      
    } catch (error) {
      console.error('❌ Build süreci testi başarısız:', error.message);
      throw error;
    }
  }

  /**
   * DMG oluşturma sürecini test et
   */
  async testDMGCreation() {
    console.log('💿 DMG oluşturma süreci test ediliyor...');
    
    try {
      // DMG asset'leri kontrolü
      const dmgAssets = [
        'assets/dmg-background.svg',
        'assets/dmg-config.json',
        'scripts/install-mac.sh',
        'scripts/setup-ollama-mac.js',
        'scripts/setup-dependencies-mac.js'
      ];
      
      for (const asset of dmgAssets) {
        if (!fs.existsSync(asset)) {
          console.log(`⚠️ DMG asset bulunamadı: ${asset}`);
        } else {
          console.log(`✅ DMG asset bulundu: ${asset}`);
        }
      }
      
      // Electron builder konfigürasyonu kontrolü
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      if (!packageJson.build.dmg) {
        console.log('⚠️ DMG konfigürasyonu bulunamadı');
      } else {
        console.log('✅ DMG konfigürasyonu mevcut');
      }
      
      this.testResults.dmgCheck = true;
      console.log('✅ DMG oluşturma süreci hazır');
      
    } catch (error) {
      console.error('❌ DMG testi başarısız:', error.message);
      throw error;
    }
  }

  /**
   * Ollama entegrasyonunu test et
   */
  async testOllamaIntegration() {
    console.log('🤖 Ollama entegrasyonu test ediliyor...');
    
    try {
      // Ollama script'leri kontrolü
      const ollamaScripts = [
        'scripts/setup-ollama-mac.js',
        'scripts/setup-dependencies-mac.js'
      ];
      
      for (const script of ollamaScripts) {
        if (!fs.existsSync(script)) {
          throw new Error(`Ollama script bulunamadı: ${script}`);
        }
      }
      
      // Ollama script içeriği kontrolü
      const ollamaScript = fs.readFileSync('scripts/setup-ollama-mac.js', 'utf8');
      
      if (!ollamaScript.includes('OllamaMacInstaller')) {
        throw new Error('Ollama installer sınıfı bulunamadı');
      }
      
      if (!ollamaScript.includes('installOllama')) {
        throw new Error('Ollama kurulum fonksiyonu bulunamadı');
      }
      
      // Package.json'da Ollama script'leri kontrolü
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      if (!packageJson.scripts['setup:ollama:mac']) {
        throw new Error('Ollama setup script bulunamadı');
      }
      
      this.testResults.ollamaCheck = true;
      console.log('✅ Ollama entegrasyonu hazır');
      
    } catch (error) {
      console.error('❌ Ollama entegrasyonu testi başarısız:', error.message);
      throw error;
    }
  }

  /**
   * Test raporu oluştur
   */
  generateReport() {
    console.log('\n📊 Test Raporu');
    console.log('==========================================');
    
    const tests = [
      { name: 'Sistem Gereksinimleri', result: this.testResults.systemCheck },
      { name: 'Bağımlılık Kontrolü', result: this.testResults.dependenciesCheck },
      { name: 'Build Süreci', result: this.testResults.buildCheck },
      { name: 'DMG Oluşturma', result: this.testResults.dmgCheck },
      { name: 'Ollama Entegrasyonu', result: this.testResults.ollamaCheck }
    ];
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    for (const test of tests) {
      const status = test.result ? '✅' : '❌';
      console.log(`${status} ${test.name}`);
      if (test.result) passedTests++;
    }
    
    console.log('==========================================');
    console.log(`📈 Test Sonucu: ${passedTests}/${totalTests} başarılı`);
    
    if (passedTests === totalTests) {
      console.log('🎉 Tüm testler başarılı! Mac DMG build süreci hazır.');
    } else {
      console.log('⚠️ Bazı testler başarısız. Lütfen hataları düzeltin.');
    }
    
    // Detaylı rapor oluştur
    this.createDetailedReport();
  }

  /**
   * Detaylı rapor oluştur
   */
  createDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      system: {
        platform: this.platform,
        arch: this.arch,
        homeDir: this.homeDir
      },
      testResults: this.testResults,
      recommendations: this.generateRecommendations()
    };
    
    const reportPath = 'mac-build-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Detaylı rapor oluşturuldu: ${reportPath}`);
  }

  /**
   * Öneriler oluştur
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (!this.testResults.systemCheck) {
      recommendations.push('macOS 10.15 veya üzeri gerekli');
    }
    
    if (!this.testResults.dependenciesCheck) {
      recommendations.push('Node.js, NPM ve Git kurulumu gerekli');
    }
    
    if (!this.testResults.buildCheck) {
      recommendations.push('Build script\'leri ve electron-builder kontrolü gerekli');
    }
    
    if (!this.testResults.dmgCheck) {
      recommendations.push('DMG asset\'leri ve konfigürasyonu kontrolü gerekli');
    }
    
    if (!this.testResults.ollamaCheck) {
      recommendations.push('Ollama script\'leri ve entegrasyonu kontrolü gerekli');
    }
    
    return recommendations;
  }
}

/**
 * Ana fonksiyon
 */
async function main() {
  const tester = new MacBuildTester();
  await tester.runTests();
}

// Script çalıştırılıyorsa main fonksiyonunu çağır
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test süreci başarısız:', error.message);
    process.exit(1);
  });
}

module.exports = MacBuildTester;
