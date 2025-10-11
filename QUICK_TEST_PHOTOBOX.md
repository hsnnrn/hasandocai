# 🔍 PhotoBox Arama Testi - Debug Rehberi

## ⚠️ Sorun
"photobox" araması `photobox360_setup.pdf` dosyasını bulmuyor!

## 🔧 Çözüm Adımları

### 1. Electron Uygulamasını Yeniden Başlat
```bash
# Terminal'de çalışan uygulamayı kapat (Ctrl+C)
# Sonra yeniden başlat:
npm run dev
```

**VEYA**

```bash
npm start
```

### 2. Browser Console'u Aç
Electron uygulamasında:
- Windows/Linux: `Ctrl + Shift + I`
- Mac: `Cmd + Option + I`

### 3. Cache'i Temizle
Console'da şunu çalıştır:
```javascript
// LocalStorage'daki cache'i temizle
localStorage.clear();

// Sayfayı yenile
location.reload();
```

### 4. Test Yap
Chatbot'a şunu yaz:
```
photobox
```

### 5. Console Loglarını Kontrol Et

**Beklenen Loglar (✅ DOĞRU):**
```
📁 Filename match found: "photobox360_setup.pdf" (score: 0.95, prefix: "photobox" → "photobox360")
📈 Applied filename boost: +0.86 (match score: 0.95, total: 1.81) for: photobox360_setup.pdf
```

**Yanlış Loglar (❌ YANLIŞ):**
```
📁 Filename match found: "Invoice-13TVEI4D-0002.docx"...
```

### 6. Eğer Hala Çalışmıyorsa

**Terminal Console'unda şunu kontrol et:**
```bash
# Build'in gerçekten güncel olduğunu kontrol et
ls -la dist/main/main/ai/documentRetriever.js

# Değiştirilme tarihini kontrol et - SON 5 DK İÇİNDE OLMALI
```

**Veya Windows'ta:**
```powershell
Get-ChildItem dist/main/main/ai/documentRetriever.js | Select-Object LastWriteTime
```

### 7. Son Çare: Temiz Build
```bash
# dist/ klasörünü sil ve yeniden build et
rm -rf dist/
npm run build
npm run dev
```

**Windows PowerShell'de:**
```powershell
Remove-Item -Recurse -Force dist
npm run build
npm run dev
```

## 🎯 Beklenen Sonuç

**Öncesi:**
```
Kullanıcı: photobox
Chatbot: ❌ Invoice-13TVEI4D-0002.docx, Invoice-13TVEI4D-0002.pdf
```

**Sonrası:**
```
Kullanıcı: photobox
Chatbot: ✅ photobox360_setup.pdf (68 bölüm)
```

## 🔬 Debug İpuçları

### Console'da Manuel Test
```javascript
// 1. normalizeFilename test
const filename = "photobox360_setup.pdf";
const normalized = filename.replace(/\.(pdf|docx?|xlsx?|pptx?|txt)$/i, '');
console.log('Normalized:', normalized); // "photobox360_setup"

// 2. Split test
const words = normalized.split(/[\s\-_]+/).filter(w => w.length > 2);
console.log('Words:', words); // ["photobox360", "setup"]

// 3. Prefix match test
const query = "photobox";
const filenameWord = "photobox360";
console.log('Prefix match:', filenameWord.startsWith(query)); // true
console.log('Score:', 0.95); // Expected boost score
```

## 📊 Performans Metrikleri

Başarılı aramada görmemiz gerekenler:
- ⚡ Cache HIT/MISS logu
- 📁 Filename match logu (score: 0.95)
- 📈 Filename boost logu (+0.86)
- 🔍 Retrieved sections (1-3 bölüm)
- ✅ Final answer: photobox360_setup.pdf

## 🆘 Yardım

Eğer sorun devam ederse:
1. **Screenshot al:** Console loglarının screenshot'unu al
2. **Issue aç:** GitHub'da yeni issue aç ve screenshot'u ekle
3. **Versiyonu kontrol et:** `npm list` ile paket versiyonlarını kontrol et

---

**Hazırlanma Tarihi:** 11 Ekim 2025  
**Test Durumu:** Bekliyor...  
**Gerekli İşlem:** Electron app yeniden başlatma

