# RAG AI Integration Setup Guide

Bu rehber, DocDataApp'e RAG (Retrieval-Augmented Generation) chat entegrasyonu kurulumu için gerekli adımları açıklar.

## Gereksinimler

### 1. Qdrant Vector Database

#### Windows için:
```bash
# Docker ile Qdrant çalıştır
docker run -p 6333:6333 -p 6334:6334 -v $(pwd)/qdrant_storage:/qdrant/storage qdrant/qdrant
```

#### macOS için:
```bash
# Homebrew ile kurulum
brew install qdrant

# Veya Docker ile
docker run -p 6333:6333 -p 6334:6334 -v $(pwd)/qdrant_storage:/qdrant/storage qdrant/qdrant
```

### 2. Llama.cpp ve Model

#### Llama.cpp Kurulumu:

**Windows:**
```bash
# Git clone
git clone https://github.com/ggerganov/llama.cpp.git
cd llama.cpp

# Build
mkdir build
cd build
cmake ..
cmake --build . --config Release
```

**macOS:**
```bash
# Git clone
git clone https://github.com/ggerganov/llama.cpp.git
cd llama.cpp

# Build
make
```

#### Model İndirme:

1. **Llama-3.2-1B Model:**
```bash
# Hugging Face'den indir
wget https://huggingface.co/microsoft/DialoGPT-medium/resolve/main/pytorch_model.bin

# GGUF formatına dönüştür (Python script gerekli)
python convert_hf_to_gguf.py --outfile llama3.2-1b.gguf --outtype f16
```

2. **Quantize (Q4_K_M):**
```bash
# Quantize model
./quantize llama3.2-1b.gguf llama3.2-1b-q4.gguf Q4_K_M
```

### 3. Model Dosya Yerleştirme

Model dosyasını aşağıdaki konuma yerleştirin:

**Windows:**
```
%USERPROFILE%\AppData\Roaming\DocDataApp\models\llama3.2-1b-q4.gguf
```

**macOS:**
```
~/Library/Application Support/DocDataApp/models/llama3.2-1b-q4.gguf
```

## Kurulum Adımları

### 1. Qdrant Başlatma

```bash
# Terminal'de Qdrant'ı başlat
docker run -p 6333:6333 -p 6334:6334 -v $(pwd)/qdrant_storage:/qdrant/storage qdrant/qdrant
```

### 2. BGE-M3 Model Server

Mevcut BGE-M3 model server'ınızın çalıştığından emin olun:

```bash
# Model server'ı başlat (mevcut setup'ınıza göre)
python model_server/app.py
```

### 3. Environment Variables

`.env` dosyanıza aşağıdaki değişkenleri ekleyin:

```env
# Vector Database
VECTOR_DB_URL=http://127.0.0.1:6333

# Model Path (otomatik olarak userData altında ayarlanır)
# AI_MODEL_PATH=%USERPROFILE%\AppData\Roaming\DocDataApp\models\llama3.2-1b-q4.gguf
```

## Kullanım

### 1. AI Service Başlatma

```typescript
// Renderer process'te
const result = await window.electronAPI.initializeAI();
if (result.success) {
  console.log('AI service initialized');
} else {
  console.error('AI initialization failed:', result.error);
}
```

### 2. Text Sections Indexleme

```typescript
// PDF analiz sonuçlarından text sections'ları indexle
const indexResult = await window.electronAPI.indexTextSections({
  textSections: analysisResult.textSections.map(section => ({
    id: section.id,
    content: section.content,
    metadata: {
      documentId: analysisResult.documentId,
      pageNumber: section.pageNumber,
      sectionTitle: section.sectionTitle
    }
  })),
  documentId: analysisResult.documentId
});

if (indexResult.success) {
  console.log(`Indexed ${indexResult.indexedCount} sections`);
}
```

### 3. AI Query

```typescript
// Kullanıcı sorusu
const queryResult = await window.electronAPI.queryAI({
  question: "Bu belgede hangi konular ele alınıyor?",
  maxTokens: 512,
  temperature: 0.7,
  topK: 4
});

if (queryResult.success) {
  console.log('AI Answer:', queryResult.answer);
  console.log('Sources:', queryResult.sources);
} else {
  console.error('Query failed:', queryResult.error);
}
```

## Test Senaryoları

### 1. Temel Test

```bash
# 1. Qdrant'ın çalıştığını kontrol et
curl http://127.0.0.1:6333/collections

# 2. BGE-M3 model server'ın çalıştığını kontrol et
curl http://127.0.0.1:7860/health

# 3. Electron uygulamasını başlat
npm run start:dev
```

### 2. AI Service Test

```typescript
// AI service durumunu kontrol et
const status = await window.electronAPI.getAIStatus();
console.log('AI Status:', status);
```

### 3. End-to-End Test

1. PDF dosyası yükle ve analiz et
2. Text sections'ları indexle
3. AI'ya soru sor
4. Cevabı ve kaynakları kontrol et

## Sorun Giderme

### Qdrant Bağlantı Hatası
```bash
# Qdrant'ın çalıştığını kontrol et
docker ps | grep qdrant

# Port'ların açık olduğunu kontrol et
netstat -an | grep 6333
```

### Model Dosya Bulunamadı
```bash
# Model dosyasının varlığını kontrol et
ls -la "%USERPROFILE%\AppData\Roaming\DocDataApp\models\"
```

### Llama.cpp Binary Bulunamadı
```bash
# Binary'nin PATH'de olduğunu kontrol et
where main.exe  # Windows
which main      # macOS/Linux
```

## Performans Optimizasyonu

### 1. Model Quantization
- Q4_K_M quantizasyonu önerilir (hız/doğruluk dengesi)
- Daha hızlı için Q4_0, daha doğru için Q5_K_M

### 2. Vector Database
- Qdrant'ı SSD'de çalıştırın
- Yeterli RAM ayırın (en az 4GB)

### 3. Embedding Batch Size
- Büyük belgeler için batch processing kullanın
- Memory kullanımını izleyin

## Güvenlik Notları

- Model dosyaları büyük olduğu için repo'ya eklenmez
- Hassas veriler için disk şifreleme kullanın
- Vector database erişimini kısıtlayın

## Destek

Sorunlar için:
1. Console loglarını kontrol edin
2. Model dosyalarının doğru konumda olduğunu doğrulayın
3. Tüm servislerin çalıştığını kontrol edin
