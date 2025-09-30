# 🔍 Debug Adımları

## Sorun: Main Process Logları Görünmüyor

Console'da sadece renderer process logları görünüyor, main process logları görünmüyor. Bu yüzden IPC handler'ın çağrılıp çağrılmadığını bilmiyoruz.

## 🛠️ Debug Adımları

### 1. Terminal'de Main Process Loglarını Kontrol Edin

Uygulamayı çalıştırırken **terminal'de** (renderer console'da değil) şu logları arayın:

```
🚀🚀🚀 MAIN PROCESS: Application started successfully
🚀🚀🚀 MAIN PROCESS: IPC handlers registered
```

### 2. Supabase'e Aktar Butonuna Tıkladığınızda

Terminal'de şu logları arayın:

```
🚀🚀🚀 MAIN PROCESS: supabase:uploadAnalysis handler called with documentId: ...
📊 MAIN PROCESS: Analysis result keys: ...
🔍 MAIN PROCESS: Selected project: ...
```

### 3. Eğer Main Process Logları Görünmüyorsa

Bu demek oluyor ki:
- ❌ IPC handler hiç çağrılmıyor
- ❌ Preload script'te bir sorun var
- ❌ IPC channel'ı yanlış

### 4. Hızlı Test

Console'da (renderer) şu komutu çalıştırın:

```javascript
// Test if electronAPI is available
console.log('electronAPI available:', !!window.electronAPI);
console.log('uploadAnalysisToSupabase available:', !!window.electronAPI?.uploadAnalysisToSupabase);

// Test call
window.electronAPI.uploadAnalysisToSupabase({test: 'data'}).then(result => {
  console.log('Test result:', result);
}).catch(error => {
  console.error('Test error:', error);
});
```

### 5. Beklenen Sonuç

Eğer her şey çalışıyorsa:
1. **Terminal'de** main process logları görünecek
2. **Console'da** test sonucu görünecek
3. **Supabase Dashboard'da** istekler görünecek

### 6. Hala Çalışmıyorsa

1. Uygulamayı tamamen kapatın
2. `npm run dev` ile yeniden başlatın
3. Terminal'de main process loglarını kontrol edin
4. Console'da test komutunu çalıştırın

## 🎯 Ana Sorun

Muhtemelen **IPC handler hiç çağrılmıyor** çünkü:
- Preload script'te `uploadAnalysisToSupabase` fonksiyonu expose edilmemiş
- Ya da main process'te handler register edilmemiş

Bu debug adımları ile sorunu tespit edebiliriz!
