#!/usr/bin/env node

/**
 * Mac Bağımlılık Kurulum Script
 * 
 * Bu script Mac'te DocDataApp için gerekli tüm bağımlılıkları kurar.
 * DMG içinde çalışacak şekilde tasarlanmıştır.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class MacDependencyInstaller {
  constructor() {
    this.homeDir = os.homedir();
    this.arch = os.arch();
    this.platform = os.platform();
    this.dependencies = {
      homebrew: false,
      node: false,
      python: false,
      git: false,
      curl: false,
      wget: false
    };
  }

  /**
   * Ana kurulum fonksiyonu
   */
  async install() {
    console.log('🍎 Mac Bağımlılık Kurulumu Başlatılıyor...');
    console.log(`📊 Sistem: ${this.platform} ${this.arch}`);
    
    try {
      // 1. Sistem güncellemelerini kontrol et
      await this.checkSystemUpdates();
      
      // 2. Xcode Command Line Tools kur
      await this.installXcodeTools();
      
      // 3. Homebrew kur
      await this.installHomebrew();
      
      // 4. Temel araçları kur
      await this.installBasicTools();
      
      // 5. Python kur
      await this.installPython();
      
      // 6. Node.js kur (eğer gerekirse)
      await this.installNodeJS();
      
      // 7. Git kur
      await this.installGit();
      
      // 8. Python paketlerini kur
      await this.installPythonPackages();
      
      // 9. Kurulumu doğrula
      await this.verifyInstallation();
      
      console.log('✅ Tüm bağımlılıklar başarıyla kuruldu!');
      return true;
      
    } catch (error) {
      console.error('❌ Bağımlılık kurulumu başarısız:', error.message);
      return false;
    }
  }

  /**
   * Sistem güncellemelerini kontrol et
   */
  async checkSystemUpdates() {
    console.log('🔄 Sistem güncellemeleri kontrol ediliyor...');
    
    try {
      // macOS versiyonunu kontrol et
      const version = execSync('sw_vers -productVersion', { encoding: 'utf8' }).trim();
      console.log(`📊 macOS Versiyonu: ${version}`);
      
      // Minimum macOS 10.15 gereksinimi
      const majorVersion = parseInt(version.split('.')[0]);
      const minorVersion = parseInt(version.split('.')[1]);
      
      if (majorVersion < 10 || (majorVersion === 10 && minorVersion < 15)) {
        throw new Error('macOS 10.15 (Catalina) veya üzeri gereklidir');
      }
      
      console.log('✅ macOS versiyonu uygun');
      
    } catch (error) {
      console.log('⚠️ Sistem güncelleme kontrolü atlandı:', error.message);
    }
  }

  /**
   * Xcode Command Line Tools kur
   */
  async installXcodeTools() {
    console.log('🔧 Xcode Command Line Tools kurulumu...');
    
    try {
      // Zaten kurulu mu kontrol et
      execSync('xcode-select -p', { stdio: 'pipe' });
      console.log('✅ Xcode Command Line Tools zaten kurulu');
    } catch (error) {
      console.log('📦 Xcode Command Line Tools kuruluyor...');
      execSync('xcode-select --install', { stdio: 'inherit' });
      
      // Kurulumun tamamlanmasını bekle
      console.log('⏳ Kurulum tamamlanana kadar bekleyin...');
      await this.sleep(30000); // 30 saniye bekle
      
      console.log('✅ Xcode Command Line Tools kuruldu');
    }
  }

  /**
   * Homebrew kur
   */
  async installHomebrew() {
    console.log('🍺 Homebrew kurulumu...');
    
    try {
      // Zaten kurulu mu kontrol et
      execSync('brew --version', { stdio: 'pipe' });
      this.dependencies.homebrew = true;
      console.log('✅ Homebrew zaten kurulu');
    } catch (error) {
      console.log('📦 Homebrew kuruluyor...');
      
      // Homebrew kurulum scriptini çalıştır
      const installScript = '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"';
      execSync(installScript, { stdio: 'inherit' });
      
      // PATH'e ekle
      const shellProfile = this.getShellProfile();
      const brewPath = this.arch === 'arm64' ? '/opt/homebrew/bin' : '/usr/local/bin';
      
      if (!this.isInPath(brewPath)) {
        this.addToPath(brewPath, shellProfile);
      }
      
      this.dependencies.homebrew = true;
      console.log('✅ Homebrew kuruldu');
    }
  }

  /**
   * Temel araçları kur
   */
  async installBasicTools() {
    console.log('🛠️ Temel araçlar kuruluyor...');
    
    const tools = ['curl', 'wget', 'unzip', 'tar'];
    
    for (const tool of tools) {
      try {
        execSync(`which ${tool}`, { stdio: 'pipe' });
        console.log(`✅ ${tool} zaten kurulu`);
      } catch (error) {
        console.log(`📦 ${tool} kuruluyor...`);
        execSync(`brew install ${tool}`, { stdio: 'inherit' });
        console.log(`✅ ${tool} kuruldu`);
      }
    }
  }

  /**
   * Python kur
   */
  async installPython() {
    console.log('🐍 Python kurulumu...');
    
    try {
      // Python versiyonunu kontrol et
      const version = execSync('python3 --version', { encoding: 'utf8' }).trim();
      console.log(`📊 ${version} zaten kurulu`);
      this.dependencies.python = true;
    } catch (error) {
      console.log('📦 Python kuruluyor...');
      execSync('brew install python', { stdio: 'inherit' });
      this.dependencies.python = true;
      console.log('✅ Python kuruldu');
    }
  }

  /**
   * Node.js kur
   */
  async installNodeJS() {
    console.log('📦 Node.js kurulumu...');
    
    try {
      // Node.js versiyonunu kontrol et
      const version = execSync('node --version', { encoding: 'utf8' }).trim();
      console.log(`📊 Node.js ${version} zaten kurulu`);
      this.dependencies.node = true;
    } catch (error) {
      console.log('📦 Node.js kuruluyor...');
      execSync('brew install node', { stdio: 'inherit' });
      this.dependencies.node = true;
      console.log('✅ Node.js kuruldu');
    }
  }

  /**
   * Git kur
   */
  async installGit() {
    console.log('📋 Git kurulumu...');
    
    try {
      // Git versiyonunu kontrol et
      const version = execSync('git --version', { encoding: 'utf8' }).trim();
      console.log(`📊 ${version} zaten kurulu`);
      this.dependencies.git = true;
    } catch (error) {
      console.log('📦 Git kuruluyor...');
      execSync('brew install git', { stdio: 'inherit' });
      this.dependencies.git = true;
      console.log('✅ Git kuruldu');
    }
  }

  /**
   * Python paketlerini kur
   */
  async installPythonPackages() {
    console.log('🐍 Python paketleri kuruluyor...');
    
    const packages = [
      'pip',
      'setuptools',
      'wheel',
      'requests',
      'numpy',
      'pandas',
      'scikit-learn',
      'transformers',
      'torch',
      'sentence-transformers'
    ];
    
    for (const package of packages) {
      try {
        console.log(`📦 ${package} kuruluyor...`);
        execSync(`pip3 install ${package}`, { stdio: 'inherit' });
        console.log(`✅ ${package} kuruldu`);
      } catch (error) {
        console.log(`⚠️ ${package} kurulamadı: ${error.message}`);
      }
    }
  }

  /**
   * Kurulumu doğrula
   */
  async verifyInstallation() {
    console.log('🔍 Kurulum doğrulanıyor...');
    
    const tools = [
      { name: 'Homebrew', command: 'brew --version' },
      { name: 'Python', command: 'python3 --version' },
      { name: 'Node.js', command: 'node --version' },
      { name: 'Git', command: 'git --version' },
      { name: 'Curl', command: 'curl --version' },
      { name: 'Wget', command: 'wget --version' }
    ];
    
    for (const tool of tools) {
      try {
        const output = execSync(tool.command, { encoding: 'utf8' }).trim();
        console.log(`✅ ${tool.name}: ${output.split('\n')[0]}`);
      } catch (error) {
        console.log(`❌ ${tool.name}: Kurulu değil`);
      }
    }
  }

  /**
   * Shell profil dosyasını bul
   */
  getShellProfile() {
    const shell = process.env.SHELL || '/bin/bash';
    
    if (shell.includes('zsh')) {
      return path.join(this.homeDir, '.zshrc');
    } else if (shell.includes('bash')) {
      return path.join(this.homeDir, '.bash_profile');
    } else {
      return path.join(this.homeDir, '.profile');
    }
  }

  /**
   * PATH'te var mı kontrol et
   */
  isInPath(pathToCheck) {
    const currentPath = process.env.PATH || '';
    return currentPath.includes(pathToCheck);
  }

  /**
   * PATH'e ekle
   */
  addToPath(pathToAdd, profileFile) {
    try {
      const exportLine = `export PATH="${pathToAdd}:$PATH"`;
      
      if (fs.existsSync(profileFile)) {
        const content = fs.readFileSync(profileFile, 'utf8');
        if (!content.includes(exportLine)) {
          fs.appendFileSync(profileFile, `\n${exportLine}\n`);
        }
      } else {
        fs.writeFileSync(profileFile, `\n${exportLine}\n`);
      }
      
      console.log(`✅ PATH'e eklendi: ${pathToAdd}`);
    } catch (error) {
      console.log(`⚠️ PATH'e eklenemedi: ${error.message}`);
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
    console.log(`   Shell: ${process.env.SHELL || '/bin/bash'}`);
  }
}

/**
 * Ana fonksiyon
 */
async function main() {
  const installer = new MacDependencyInstaller();
  
  installer.printSystemInfo();
  
  const success = await installer.install();
  
  if (success) {
    console.log('\n🎉 Tüm bağımlılıklar başarıyla kuruldu!');
    console.log('📝 Kurulum tamamlandı:');
    console.log('   - Homebrew: Paket yöneticisi');
    console.log('   - Python: AI/ML kütüphaneleri');
    console.log('   - Node.js: JavaScript runtime');
    console.log('   - Git: Versiyon kontrolü');
    console.log('   - Temel araçlar: curl, wget, vb.');
    console.log('\n🚀 DocDataApp kullanıma hazır!');
  } else {
    console.log('\n❌ Bağımlılık kurulumu başarısız!');
    console.log('📝 Manuel kurulum için:');
    console.log('   1. https://brew.sh adresine gidin');
    console.log('   2. Homebrew\'i kurun');
    console.log('   3. Gerekli paketleri manuel kurun');
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

module.exports = MacDependencyInstaller;
