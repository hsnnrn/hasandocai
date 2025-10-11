# ✅ Ollama Otomatik Başlatma Sistemi

## 🎯 Sorun Neydi?

- **"Llama sunucusuna bağlanılamadı"** hatası alıyordunuz
- Her seferinde manuel olarak Ollama'yı başlatmanız gerekiyordu
- `start_ollama_cpu.bat` veya `start_ollama_gpu.bat` dosyalarını manuel çalıştırmak zorundaydınız

## ✨ Yeni Çözüm: OTOMATİK BAŞLATMA

### 🔧 Yapılan Değişiklikler

#### 1. **OllamaManager Modülü Eklendi**
```typescript
// src/main/utils/ollamaManager.ts
- checkOllamaServer() - Ollama çalışıyor mu kontrol eder
- startOllamaServer() - Ollama'yı otomatik başlatır
- stopOllamaServer() - Ollama'yı durdurur
- ensureOllamaRunning() - Çalışmıyorsa başlatır
- GPU otomatik algılama
```

#### 2. **Main.ts - Uygulama Başlangıcında Otomatik Başlatma**
```typescript
// Uygulama açıldığında:
1. GPU kontrol edilir
2. Ollama durumu kontrol edilir
3. Çalışmıyorsa OTOMATIK başlatılır
4. GPU varsa GPU modunda, yoksa CPU modunda
5. Uygulama kapanırken Ollama da durdurulur
```

#### 3. **IPC Handlers - Kullanıcı Kontrolü**
```typescript
// Renderer'dan kullanılabilir:
- ollama:status - Durumu kontrol et
- ollama:start - Manuel başlat
- ollama:stop - Durdur
- ollama:ensure-running - Kontrol et ve başlat
```

#### 4. **Preload API - Kolay Erişim**
```typescript
// Renderer'da kullanım:
window.electronAPI.ollama.getStatus()
window.electronAPI.ollama.start()
window.electronAPI.ollama.stop()
window.electronAPI.ollama.ensureRunning()
```

## 🚀 Nasıl Çalışıyor?

### Uygulama Başlangıcında
```bash
1. DocDataApp açılır
2. GPU kontrol edilir (NVIDIA GPU var mı?)
3. Ollama durumu kontrol edilir
   ├─ Çalışıyor → ✅ Devam et
   └─ Çalışmıyor → 🚀 Otomatik başlat
4. GPU varsa: OLLAMA_NUM_GPU=1 (GPU mode)
   GPU yoksa: OLLAMA_NUM_GPU=0 (CPU mode)
5. Ollama başlatılır: ollama serve
6. Sunucu hazır olana kadar bekler (max 10 saniye)
7. ✅ Başarılı → Chatbot kullanıma hazır!
```

### GPU Otomatik Algılama
```bash
┌─────────────────────────────────────┐
│  NVIDIA GPU Var mı?                 │
└─────────────────────────────────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
   EVET        HAYIR
    │           │
    ▼           ▼
GPU Mode     CPU Mode
FAST 🚀      SAFE 🛡️
```

### Uygulama Kapanışında
```bash
1. Kullanıcı uygulamayı kapatır
2. app.on('before-quit') tetiklenir
3. Ollama sunucusu durdurulur
4. ✅ Temiz kapanış
```

## 📋 Yeni Dosyalar

### 1. `src/main/utils/ollamaManager.ts`
```typescript
/**
 * Ollama Manager - Otomatik başlatma ve kontrol
 * 
 * Fonksiyonlar:
 * - checkOllamaServer() - Sunucu çalışıyor mu?
 * - configureGPUSettings() - GPU ayarları
 * - startOllamaServer() - Başlatma
 * - stopOllamaServer() - Durdurma
 * - getOllamaStatus() - Durum bilgisi
 * - ensureOllamaRunning() - Kontrol + Başlat
 */
```

## 🎨 Kullanıcı Deneyimi

### Eski Sistem
```
1. ❌ DocDataApp aç
2. ❌ "Llama sunucusuna bağlanılamadı" hatası
3. ❌ start_ollama_cpu.bat veya start_ollama_gpu.bat çalıştır
4. ❌ DocDataApp'i yeniden dene
5. ✅ Chatbot çalışıyor
```

### Yeni Sistem
```
1. ✅ DocDataApp aç
2. ✅ Ollama otomatik başlatılıyor... (arka planda)
3. ✅ GPU algılandı / CPU modu aktif
4. ✅ Chatbot kullanıma hazır!
```

## 🔧 Manuel Kontrol (İsteğe Bağlı)

Settings sayfasında Ollama durumunu kontrol edebilir ve manuel olarak başlatabilirsiniz:

```typescript
// Settings sayfasında örnek kullanım:

// Durum kontrolü
const status = await window.electronAPI.ollama.getStatus()
console.log('Ollama çalışıyor mu?', status.status.running)
console.log('GPU aktif mi?', status.status.gpuEnabled)

// Manuel başlatma
const result = await window.electronAPI.ollama.start()
if (result.success) {
  console.log('Ollama başlatıldı!')
} else {
  console.error('Başlatma hatası:', result.error)
}

// Kontrol et ve başlat
const ensured = await window.electronAPI.ollama.ensureRunning()
console.log('Durum:', ensured.status.running ? 'Çalışıyor' : 'Çalışmıyor')
```

## 🎯 GPU vs CPU Modu

### GPU Modu (Eğer NVIDIA GPU varsa)
```
✅ Çok hızlı yanıtlar
✅ Daha iyi model kalitesi
✅ Büyük context window
⚠️ GPU gerektirir
📊 VRAM kullanımı: ~2-4GB
```

### CPU Modu (GPU yoksa veya hatalıysa)
```
✅ Her bilgisayarda çalışır
✅ Güvenilir
✅ GPU hatası riski yok
⚠️ Daha yavaş yanıtlar
📊 RAM kullanımı: ~2-4GB
```

## 🧪 Test Senaryoları

### Test 1: İlk Açılış
```bash
1. DocDataApp'i aç
2. Console loglarını izle
3. "🤖 Ollama sunucusu kontrol ediliyor..." görülmeli
4. "✅ Ollama çalışıyor" veya "🚀 Ollama başlatılıyor..." görülmeli
5. Chatbot'a git ve soru sor
6. ✅ Yanıt almalısın!
```

### Test 2: Ollama Kapalıyken
```bash
1. Task Manager'dan Ollama'yı kapat
2. DocDataApp'i aç
3. Otomatik olarak Ollama başlatılmalı
4. Chatbot çalışmalı
```

### Test 3: GPU Kontrolü
```bash
# GPU varsa:
1. DocDataApp'i aç
2. Console: "✅ NVIDIA GPU tespit edildi - GPU modunda başlatılacak"
3. Console: "🎮 GPU: Aktif"

# GPU yoksa:
1. DocDataApp'i aç
2. Console: "⚠️ GPU bulunamadı - CPU modunda başlatılacak"
3. Console: "🎮 GPU: Devre Dışı"
```

## 🐛 Sorun Giderme

### "Ollama kurulu değil" Hatası
```bash
Çözüm: Ollama'yı yükleyin
1. https://ollama.ai adresine gidin
2. Windows için Ollama'yı indirin ve kurun
3. DocDataApp'i yeniden başlatın
```

### Ollama Başlatılamadı
```bash
Çözüm: Manuel başlatmayı deneyin
1. CMD açın
2. ollama serve komutunu çalıştırın
3. Hata mesajını kontrol edin
4. Port 11434 kullanımda mı bakın
```

### GPU Hatası
```bash
Çözüm: CPU modunda çalıştırın
1. .env dosyasını açın
2. GPU_MODE=disabled ekleyin
3. DocDataApp'i yeniden başlatın
```

### Port 11434 Kullanımda
```bash
Çözüm: Eski Ollama'yı kapatın
1. Task Manager açın
2. Ollama.exe'yi bulun ve sonlandırın
3. DocDataApp'i yeniden başlatın
```

## 📊 Performans

### Başlatma Süresi
```
GPU Mode: ~5-10 saniye
CPU Mode: ~3-5 saniye
Zaten çalışıyorsa: <1 saniye
```

### Bellek Kullanımı
```
Ollama sunucusu: ~500MB (boşta)
Model yüklü: ~2-4GB (kullanımda)
GPU VRAM: ~2-4GB (GPU modunda)
```

## 🎉 Özet

| Özellik | Eski Sistem | Yeni Sistem |
|---------|------------|-------------|
| **Başlatma** | ❌ Manuel | ✅ Otomatik |
| **GPU Algılama** | ❌ Manuel | ✅ Otomatik |
| **Hata Mesajı** | ❌ "Bağlanılamadı" | ✅ Otomatik düzelir |
| **Kullanım** | ❌ Karmaşık | ✅ Basit |
| **Uygulama Kapanış** | ❌ Ollama çalışır durumda | ✅ Otomatik kapanır |

---

## 🚀 Artık Endişelenmeyin!

**DocDataApp'i açtığınızda:**
- ✅ Ollama otomatik başlar
- ✅ GPU varsa otomatik kullanılır
- ✅ Chatbot hemen hazır
- ✅ **Manuel işlem gerektirmez!**

**Uygulama kapandığında:**
- ✅ Ollama otomatik kapanır
- ✅ Sistem kaynakları serbest bırakılır
- ✅ Temiz kapanış

**"Llama sunucusuna bağlanılamadı" hatası artık GEÇMİŞTE KALDI! 🎉**

