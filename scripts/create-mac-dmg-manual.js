#!/usr/bin/env node

/**
 * Manuel Mac DMG Oluşturucu
 * 
 * Bu script Mac'te manuel olarak DMG oluşturur.
 * GitHub Actions'ın alternatifi olarak kullanılabilir.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class ManualMacDMGCreator {
  constructor() {
    this.platform = os.platform();
    this.arch = os.arch();
    this.homeDir = os.homedir();
    this.buildDir = 'dist';
    this.releaseDir = 'release';
    this.dmgName = 'DocDataApp';
  }

  /**
   * Ana DMG oluşturma fonksiyonu
   */
  async createDMG() {
    console.log('🍎 Manuel Mac DMG Oluşturucu Başlatılıyor...');
    console.log(`📊 Sistem: ${this.platform} ${this.arch}`);
    
    if (this.platform !== 'darwin') {
      throw new Error('Bu script sadece macOS\'ta çalışır');
    }
    
    try {
      // 1. Gereksinimleri kontrol et
      await this.checkRequirements();
      
      // 2. Projeyi build et
      await this.buildProject();
      
      // 3. DMG içeriğini hazırla
      await this.prepareDMGContent();
      
      // 4. DMG oluştur
      await this.createDMGFile();
      
      // 5. DMG'yi doğrula
      await this.verifyDMG();
      
      console.log('✅ DMG başarıyla oluşturuldu!');
      
    } catch (error) {
      console.error('❌ DMG oluşturma başarısız:', error.message);
      throw error;
    }
  }

  /**
   * Gereksinimleri kontrol et
   */
  async checkRequirements() {
    console.log('🔍 Gereksinimler kontrol ediliyor...');
    
    const requirements = [
      { name: 'Node.js', command: 'node --version' },
      { name: 'NPM', command: 'npm --version' },
      { name: 'Git', command: 'git --version' },
      { name: 'hdiutil', command: 'hdiutil' }
    ];
    
    for (const req of requirements) {
      try {
        const output = execSync(req.command, { encoding: 'utf8' }).trim();
        console.log(`✅ ${req.name}: ${output.split('\n')[0]}`);
      } catch (error) {
        throw new Error(`${req.name} bulunamadı: ${req.command}`);
      }
    }
  }

  /**
   * Projeyi build et
   */
  async buildProject() {
    console.log('🔨 Proje build ediliyor...');
    
    try {
      // NPM bağımlılıklarını kur
      console.log('📦 Bağımlılıklar kuruluyor...');
      execSync('npm install', { stdio: 'inherit' });
      
      // Renderer build
      console.log('🎨 Renderer build ediliyor...');
      execSync('npm run build:renderer', { stdio: 'inherit' });
      
      // Main build
      console.log('⚙️ Main process build ediliyor...');
      execSync('npm run build:main', { stdio: 'inherit' });
      
      console.log('✅ Proje build edildi');
      
    } catch (error) {
      throw new Error(`Build süreci başarısız: ${error.message}`);
    }
  }

  /**
   * DMG içeriğini hazırla
   */
  async prepareDMGContent() {
    console.log('📦 DMG içeriği hazırlanıyor...');
    
    try {
      // Release dizinini oluştur
      if (!fs.existsSync(this.releaseDir)) {
        fs.mkdirSync(this.releaseDir, { recursive: true });
      }
      
      // Electron builder ile Mac app oluştur
      console.log('📱 Mac app oluşturuluyor...');
      execSync('npx electron-builder --mac --dir', { stdio: 'inherit' });
      
      // DMG içeriğini kopyala
      const appPath = path.join(this.releaseDir, 'mac', 'DocDataApp.app');
      if (fs.existsSync(appPath)) {
        console.log('✅ Mac app oluşturuldu');
      } else {
        throw new Error('Mac app oluşturulamadı');
      }
      
    } catch (error) {
      throw new Error(`DMG içeriği hazırlanamadı: ${error.message}`);
    }
  }

  /**
   * DMG dosyasını oluştur
   */
  async createDMGFile() {
    console.log('💿 DMG dosyası oluşturuluyor...');
    
    try {
      const appPath = path.join(this.releaseDir, 'mac', 'DocDataApp.app');
      const dmgPath = path.join(this.releaseDir, `${this.dmgName}.dmg`);
      
      // DMG oluştur
      const command = `hdiutil create -volname "${this.dmgName}" -srcfolder "${appPath}" -ov -format UDZO "${dmgPath}"`;
      execSync(command, { stdio: 'inherit' });
      
      console.log(`✅ DMG oluşturuldu: ${dmgPath}`);
      
    } catch (error) {
      throw new Error(`DMG oluşturulamadı: ${error.message}`);
    }
  }

  /**
   * DMG'yi doğrula
   */
  async verifyDMG() {
    console.log('🔍 DMG doğrulanıyor...');
    
    try {
      const dmgPath = path.join(this.releaseDir, `${this.dmgName}.dmg`);
      
      if (!fs.existsSync(dmgPath)) {
        throw new Error('DMG dosyası bulunamadı');
      }
      
      // DMG boyutunu kontrol et
      const stats = fs.statSync(dmgPath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`📊 DMG boyutu: ${sizeInMB} MB`);
      
      // DMG içeriğini kontrol et
      const info = execSync(`hdiutil info "${dmgPath}"`, { encoding: 'utf8' });
      console.log('📋 DMG bilgileri:');
      console.log(info);
      
      console.log('✅ DMG doğrulandı');
      
    } catch (error) {
      throw new Error(`DMG doğrulaması başarısız: ${error.message}`);
    }
  }

  /**
   * DMG'yi test et
   */
  async testDMG() {
    console.log('🧪 DMG test ediliyor...');
    
    try {
      const dmgPath = path.join(this.releaseDir, `${this.dmgName}.dmg`);
      
      // DMG'yi mount et
      const mountPoint = '/tmp/DocDataApp-test';
      execSync(`mkdir -p "${mountPoint}"`, { stdio: 'inherit' });
      
      // DMG'yi mount et
      execSync(`hdiutil attach "${dmgPath}" -mountpoint "${mountPoint}"`, { stdio: 'inherit' });
      
      // App'i kontrol et
      const appPath = path.join(mountPoint, 'DocDataApp.app');
      if (fs.existsSync(appPath)) {
        console.log('✅ DMG içeriği doğru');
      } else {
        throw new Error('DMG içeriği hatalı');
      }
      
      // DMG'yi unmount et
      execSync(`hdiutil detach "${mountPoint}"`, { stdio: 'inherit' });
      
      console.log('✅ DMG test başarılı');
      
    } catch (error) {
      throw new Error(`DMG test başarısız: ${error.message}`);
    }
  }
}

/**
 * Ana fonksiyon
 */
async function main() {
  const creator = new ManualMacDMGCreator();
  
  try {
    await creator.createDMG();
    await creator.testDMG();
    
    console.log('\n🎉 DMG başarıyla oluşturuldu!');
    console.log('📁 DMG dosyası: release/DocDataApp.dmg');
    console.log('📝 Kullanım:');
    console.log('   1. DMG dosyasını çift tıklayın');
    console.log('   2. DocDataApp.app\'i Applications\'a sürükleyin');
    console.log('   3. Uygulamayı başlatın');
    
  } catch (error) {
    console.error('❌ DMG oluşturma başarısız:', error.message);
    process.exit(1);
  }
}

// Script çalıştırılıyorsa main fonksiyonunu çağır
if (require.main === module) {
  main();
}

module.exports = ManualMacDMGCreator;
