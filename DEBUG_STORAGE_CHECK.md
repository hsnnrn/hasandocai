# 🔍 Storage Debug Rehberi

## Adım 1: Console Loglarını Kontrol Et

Developer Console'u açın (F12) ve "Doküman Asistanı" moduna geçtiğinizde şu logları görmelisiniz:

```
📦 PersistentLocalStorage: X items found
📦 LocalDataService: Y conversions found
📦 Combined: Z total items
📄 Document items: ...
📚 Converted ... documents to LOCAL_DOCS format
```

**Bu logları buraya yapıştırın!**

## Adım 2: Manuel Storage Kontrolü

Developer Console'da (F12) şu komutları çalıştırın:

### Test 1: PersistentLocalStorage
```javascript
const result = await window.electronAPI.persistentStorage.getAllData();
console.log('PersistentLocalStorage:', result);
```

### Test 2: LocalDataService (Conversion History)
Electron main process console'unda (terminal) bu çalışacak:
```javascript
const Store = require('electron-store');
const store = new Store({ name: 'document-converter-data' });
const conversions = store.get('conversions', []);
console.log('Conversions:', conversions.length);
console.log('Sample:', conversions[0]);
```

### Test 3: Storage Locations
```javascript
const pathResult = await window.electronAPI.persistentStorage.getPath();
console.log('Storage path:', pathResult.path);
```

## Adım 3: Belge Yükle ve İşle

Eğer hiç belge yüklemediyseniz:

1. Ana sayfaya gidin
2. "Select Files" ile bir PDF/Excel/Word dosyası seçin
3. İşlemin tamamlanmasını bekleyin
4. "Success" mesajı görün
5. AI Chat'e geri dönün
6. "Doküman Asistanı" moduna geçin

## Adım 4: File Processing Service Kontrolü

Belgeler işlenirken localStorage'a kaydediliyor mu?

```javascript
// Main process console'unda (terminal)
// FileProcessingService sonuçları kontrol et
```

## Beklenen Sonuçlar

### Eğer belgeler varsa:
- `PersistentLocalStorage: 5 items found` gibi bir şey
- `LocalDataService: 10 conversions found`
- `Combined: 15 total items`

### Eğer belgeler yoksa (ilk kullanım):
- `PersistentLocalStorage: 0 items found`
- `LocalDataService: 0 conversions found`
- `Combined: 0 total items`

## Olası Sorunlar ve Çözümler

### Sorun 1: Belgeler işlenmiyor
**Belirti:** Dosya yüklüyorsunuz ama "Success" mesajı gelmiyor

**Çözüm:**
- Terminal'deki error loglarına bakın
- File processing servislerinin çalıştığından emin olun

### Sorun 2: Belgeler işleniyor ama kaydedilmiyor
**Belirti:** "Success" mesajı var ama storage boş

**Çözüm:**
- FileProcessingService'in PersistentLocalStorage'a kaydettiğinden emin olun
- IPC handler'ların çalıştığını kontrol edin

### Sorun 3: Belgeler storage'da ama chatbot görmüyor
**Belirti:** `getAllData()` sonuç veriyor ama chatbot 0 belge görüyor

**Çözüm:**
- `content.extractedText` veya `content.textSections` var mı kontrol edin
- Veri formatını inceleyin

## Hızlı Test: Mock Data Ekle

Eğer gerçek belge olmadan test etmek isterseniz:

```javascript
// Developer Console'da çalıştırın
const mockDoc = {
  id: 'test_doc_' + Date.now(),
  type: 'conversion',
  content: {
    extractedText: 'Bu bir test belgesidir. İçinde örnek metin bulunmaktadır.',
    filename: 'test.pdf',
    title: 'Test Belgesi',
    fileType: 'PDF'
  },
  metadata: {
    timestamp: new Date().toISOString(),
    source: 'test.pdf'
  }
};

await window.electronAPI.persistentStorage.saveData(mockDoc);
console.log('Mock document saved!');

// Şimdi Doküman Asistanı modunu yeniden yükleyin
```

## Debug Output Template

Lütfen aşağıdakileri paylaşın:

```
=== CONSOLE LOGS ===
[Buraya console loglarını yapıştırın]

=== getAllData() RESULT ===
[Buraya getAllData sonucunu yapıştırın]

=== STORAGE PATH ===
[Buraya storage path'i yapıştırın]

=== CONVERSION HISTORY ===
[Buraya conversion history bilgisini yapıştırın]
```

