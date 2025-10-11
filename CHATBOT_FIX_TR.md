# Chatbot Belgelerle İlgili Cevap Veremiyor - Hızlı Çözüm

## 🔧 Hızlı Düzeltme Adımları

### 1️⃣ Belgeler Yüklü mü Kontrol Et

**Seçenek A: Developer Console ile**
```
1. Uygulamayı çalıştır: npm run dev
2. Ctrl+Shift+I (Developer Tools)
3. Console'da çalıştır:

window.electronAPI.persistentStorage.getLocalDocs().then(result => {
  console.log('Belge sayısı:', result.count);
  console.log('Belgeler:', result.documents);
});
```

**Beklenen:** `count > 0` olmalı

**Eğer 0 ise:**
- Ana sayfadan belgeler yükleyin
- Process butonuna tıklayın
- Chatbot'a geri dönün

---

### 2️⃣ Ollama Sunucusu Çalışıyor mu?

**Terminal/PowerShell'de:**
```bash
# Ollama durumunu kontrol et
ollama list

# Model yüklü mü?
ollama list | findstr "deepseek"
```

**Çalışmıyorsa:**
```bash
# CPU modunda başlat (önerilen)
.\start_ollama_cpu.bat

# VEYA manuel
ollama serve
```

**Model yoksa yükle:**
```bash
# Türkçe için en iyi
ollama pull deepseek-r1:8b-0528-qwen3-q4_K_M

# Hafif alternatif
ollama pull llama3.2:3b
```

**Test et:**
```bash
ollama run deepseek-r1:8b-0528-qwen3-q4_K_M "Merhaba"
```

---

### 3️⃣ Debug Helper Kullan

**Adımlar:**
1. Uygulamayı çalıştır: `npm run dev`
2. Ana pencerede `test-chatbot-debug.html` dosyasını aç
3. Tüm testleri sırayla çalıştır:
   - ✅ localStorage Belge Kontrolü
   - ✅ LOCAL_DOCS Format Kontrolü
   - ✅ Ollama LLM Durumu
   - ✅ AI Sorgu Testi

---

### 4️⃣ Retrieval Threshold Düzeltildi

✅ **Otomatik düzeltme uygulandı:**
- Eşik değeri 0.4'ten 0.2'ye düşürüldü
- Daha fazla eşleşme bulacak
- Değişiklik `src/main/ai/chatController.ts` dosyasında

---

## 🧪 Test Sorguları

Chatbot'u test etmek için:

### Basit Sohbet Modunda:
```
"Merhaba"
"Nasılsın?"
```

### Doküman Asistanı Modunda:
```
"Hangi belgeler var?"
"Kaç belge yüklü?"
"Tüm dosyaları listele"
"[dosya adı] dosyasında ne var?"
```

---

## 🚨 Sık Karşılaşılan Hatalar

### Hata 1: "No localDocs available"
**Sebep:** Belgeler yüklü değil
**Çözüm:** Ana sayfadan belge yükle ve process et

### Hata 2: "AI yanıt veremedi. Ollama sunucusunun çalıştığından emin olun"
**Sebep:** Ollama çalışmıyor
**Çözüm:** `start_ollama_cpu.bat` çalıştır

### Hata 3: "Henüz belge yok"
**Sebep:** localStorage boş
**Çözüm:** 
```javascript
// Console'da kontrol et
window.electronAPI.persistentStorage.getStats()
```

### Hata 4: Chatbot yanıt veriyor ama belgelerle ilgili değil
**Sebep:** Retrieval threshold çok yüksek veya belgeler text içermiyor
**Çözüm:** 
- Threshold düşürüldü (otomatik düzeltildi ✅)
- Belgeleri tekrar process et

---

## 📋 Kontrol Listesi

Sorun çözüldü mü kontrol et:

- [ ] **localStorage'da belgeler var** 
  → `getLocalDocs().count > 0` ✅

- [ ] **Ollama çalışıyor** 
  → `ollama list` komut çalışıyor ✅

- [ ] **Model yüklü** 
  → `deepseek-r1:8b-0528-qwen3-q4_K_M` veya `llama3.2:3b` listede ✅

- [ ] **Chatbot "Doküman Asistanı" modunda** 
  → Yeşil toggle açık ✅

- [ ] **Belge sayısı gösteriliyor** 
  → "X belge yüklendi" mesajı var ✅

- [ ] **Test sorusu yanıt alıyor** 
  → "Hangi belgeler var?" sorusu cevap veriyor ✅

---

## 🆘 Hala Çalışmıyor mu?

### Son Çare:

**1. Hard Reset:**
```bash
rm -rf node_modules
npm install
npm run dev
```

**2. Ollama Reset:**
```bash
# Tamamen kapat
taskkill /F /IM ollama.exe

# Yeniden başlat
.\start_ollama_cpu.bat
```

**3. localStorage Temizle:**
```javascript
// Console'da
await window.electronAPI.persistentStorage.clearAllData();
```
Sonra belgeleri tekrar yükle.

---

## 📚 Ek Kaynaklar

- **Detaylı Rehber:** `CHATBOT_DEBUG_GUIDE.md`
- **Setup Talimatları:** `README-chatbot.md`
- **Debug HTML:** `test-chatbot-debug.html`

---

**⚡ Hızlı Başlangıç:**
```bash
# 1. Ollama başlat
.\start_ollama_cpu.bat

# 2. Model yükle
ollama pull deepseek-r1:8b-0528-qwen3-q4_K_M

# 3. Uygulamayı başlat
npm run dev

# 4. Belge yükle + process et
# 5. Chatbot > Doküman Asistanı > Test et
```

**Sorun devam ederse:** Console log'larını ve `test-chatbot-debug.html` test sonuçlarını paylaşın.

