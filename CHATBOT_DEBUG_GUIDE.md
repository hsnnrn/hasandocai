# Chatbot Sorun Giderme Rehberi

## Sorun: Chatbot belgelerle ilgili cevap veremiyor

### Olası Sebepler ve Çözümler

## 1. ✅ localStorage'da Belge Kontrolü

### Adım 1: Console'u Aç
1. Uygulamayı çalıştırın: `npm run dev`
2. Electron uygulamasında `Ctrl+Shift+I` (Windows/Linux) veya `Cmd+Option+I` (Mac) ile Developer Tools'u açın
3. **Console** sekmesine gidin

### Adım 2: localStorage'ı Kontrol Et
Console'da şu komutu çalıştırın:

```javascript
// PersistentLocalStorage kontrolü
window.electronAPI.persistentStorage.getAllData().then(data => {
  console.log('📦 Persistent Storage:', data);
  console.log('📊 Toplam kayıt:', data.length);
});

// Conversion history kontrolü
window.electronAPI.persistentStorage.getStats().then(stats => {
  console.log('📊 Storage istatistikleri:', stats);
});

// LOCAL_DOCS formatında belgeleri kontrol et
window.electronAPI.persistentStorage.getLocalDocs().then(result => {
  console.log('📚 LOCAL_DOCS:', result);
  console.log('📄 Belge sayısı:', result.count);
  console.log('📋 İlk belge:', result.documents[0]);
});
```

### Beklenen Sonuç:
- `count > 0` olmalı
- `documents` array'i dolu olmalı
- Her belgede `textSections` olmalı

### ⚠️ Sorun: Belge yok
Eğer `count: 0` veya `documents: []` görüyorsanız:

**Çözüm:**
1. Ana sayfadan yeni belgeler yükleyin (PDF, DOCX, Excel, vb.)
2. "Process" butonuna tıklayın
3. İşlem tamamlandıktan sonra localStorage'a kaydedildiğinden emin olun
4. Chatbot sayfasına geri dönün ve "Yenile" butonuna tıklayın

---

## 2. 🤖 Ollama LLM Sunucusu Kontrolü

### Adım 1: Ollama Durumunu Kontrol Et

**Terminal/PowerShell'de:**
```bash
# Ollama çalışıyor mu?
ollama list

# Model yüklü mü?
ollama list | findstr "deepseek"
ollama list | findstr "llama3.2"
```

### Adım 2: Ollama Başlat

Eğer çalışmıyorsa:

**CPU Modunda (GPU olmadan):**
```bash
.\start_ollama_cpu.bat
```

**GPU Modunda (NVIDIA GPU varsa):**
```bash
.\start_ollama_gpu.bat
```

### Adım 3: Model Yükle

```bash
# DeepSeek-R1 8b (Önerilen - Türkçe için en iyi)
ollama pull deepseek-r1:8b-0528-qwen3-q4_K_M

# VEYA Llama 3.2:3b (Hafif)
ollama pull llama3.2:3b
```

### Adım 4: Model Test Et
```bash
ollama run deepseek-r1:8b-0528-qwen3-q4_K_M "Merhaba, nasılsın?"
```

### Beklenen Sonuç:
Model Türkçe yanıt vermeli.

---

## 3. 🔍 Document Retrieval Threshold Düşürme

Sistem, varsayılan olarak %40 eşleşme eşiği kullanıyor. Bu çok katı olabilir.

### Çözüm: Threshold'u Düşürün

`src/main/ai/chatController.ts` dosyasında:

```typescript
// Satır 148-155
const retrievalResults: RetrievalResult[] = retrieveRelevantSections(
  request.query,
  localDocs,
  {
    maxRefs: options.maxRefs || 5,
    minScore: 0.2,  // 0.4'ten 0.2'ye düşürüldü ✅
  }
);
```

### Test Et:
Chatbot'ta şu soruları sorun:
- "Hangi belgeler var?"
- "Kaç doküman yüklü?"
- "Tüm belgelerimi listele"

---

## 4. 📊 Debug Modu Aktifleştir

### Console'da Test Komutu:

```javascript
// Chatbot'a test sorgusu gönder
window.aiAPI.documentChatQuery({
  userId: 'test_user',
  query: 'Hangi belgeler var?',
  localDocs: [],  // Boş - sistem localStorage'dan çekecek
  options: {
    compute: true,
    showRaw: true,
    maxRefs: 10,
    locale: 'tr-TR'
  },
  conversationHistory: []
}).then(response => {
  console.log('🤖 AI Yanıtı:', response);
});
```

---

## 5. 🧪 Hızlı Test Senaryoları

### Senaryo 1: Basit Sohbet Modu Test
1. Chatbot sayfasını açın
2. **"Basit Sohbet"** modunu seçin
3. "Merhaba" yazın
4. Yanıt alıyor musunuz? → Ollama çalışıyor ✅

### Senaryo 2: Doküman Asistanı Modu Test
1. **"Doküman Asistanı"** moduna geçin
2. Durum mesajını kontrol edin:
   - ✅ "X belge yüklendi" → İyi!
   - ⚠️ "Henüz belge yok" → 1. adıma gidin

3. Test soruları:
   ```
   - "Hangi belgeler var?"
   - "Kaç belge yüklü?"
   - "Employee dosyasında ne var?"
   ```

---

## 6. 🔧 Gelişmiş Debug

### Backend Log Kontrolü

Electron Console'da şu logları arayın:

**İyi Loglar (Başarılı):**
```
📦 PersistentLocalStorage: 5 items found
📦 LocalDataService: 3 conversions found
📦 Combined: 8 total items
📄 Document items: 8
📚 Converted 8 documents to LOCAL_DOCS format
📊 Total text sections: 42

🤖 ChatController: Handling document chat query: Hangi belgeler...
📚 LOCAL_DOCS count: 8
🔍 Retrieved 5 relevant sections
✅ ChatController: Got document response from Llama
```

**Sorunlu Loglar:**
```
📦 PersistentLocalStorage: 0 items found  ❌
📚 LOCAL_DOCS count: 0  ❌
❌ No localDocs available!  ❌
❌ ChatController Document Error: ...  ❌
```

### Sorun Çözüm:

**Eğer "0 items found" görüyorsanız:**
1. Ana sayfadan belge yükleyin
2. Process edin
3. localStorage'a kaydetme ayarını kontrol edin

**Eğer Ollama hatası görüyorsanız:**
1. `start_ollama_cpu.bat` çalıştırın
2. `.env` dosyasında `LLAMA_MODEL=deepseek-r1:8b-0528-qwen3-q4_K_M` olduğundan emin olun
3. Model yüklü mü kontrol edin: `ollama list`

---

## 7. 📝 Hızlı Kontrol Listesi

✅ Adımlar:
- [ ] Electron uygulaması çalışıyor
- [ ] Developer Console açık
- [ ] localStorage'da belgeler var (count > 0)
- [ ] Ollama sunucusu çalışıyor
- [ ] Model yüklü (deepseek-r1:8b veya llama3.2:3b)
- [ ] Chatbot "Doküman Asistanı" modunda
- [ ] Belge sayısı gösteriliyor
- [ ] Test sorusu yanıt alıyor

---

## 8. 🆘 Hala Çalışmıyor?

### Son Çare Çözümleri:

**1. Hard Reset:**
```bash
# Tüm node_modules'ları sil ve yeniden yükle
rm -rf node_modules
npm install
npm run dev
```

**2. localStorage Temizle ve Yeniden Başla:**
```javascript
// Console'da
window.electronAPI.persistentStorage.clearAllData();
```
Sonra belgeleri tekrar yükleyin.

**3. Ollama Yeniden Başlat:**
```bash
# Tamamen durdur
taskkill /F /IM ollama.exe

# CPU modunda yeniden başlat
.\start_ollama_cpu.bat
```

**4. Log Dosyalarını İncele:**
```bash
# Electron logs
%APPDATA%\DocDataApp\logs\

# Ollama logs
%LOCALAPPDATA%\Ollama\logs\
```

---

## 9. 💡 İpuçları

### Performans Optimizasyonu:
- DeepSeek-R1 8b modeli Türkçe için en iyi
- CPU modunda çalışıyorsa 3-5 saniye bekleme normal
- Belge sayısı 10'dan fazlaysa, maxRefs'i artırın (5 → 10)

### Test Soruları:
```
✅ İyi sorular:
- "Hangi belgeler var?"
- "Kaç belge yüklü?"
- "[dosya adı] dosyasında ne var?"
- "Excel'deki verileri özetle"

❌ Kötü sorular:
- Çok genel: "Her şeyi anlat"
- Çok spesifik: "3. satırın 2. kolonundaki değer nedir?"
```

---

**Yardım:** Bu rehberi takip ettikten sonra hala sorun yaşıyorsanız, lütfen Console log'larını paylaşın.

