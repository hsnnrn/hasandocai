
# AI-Powered Chatbot - Setup Guide

## 📋 Overview

This feature adds a local AI-powered chatbot to DocDataApp with **two modes**:

1. **Simple Chat Mode**: General AI conversation using LLM models (Gemma2, Llama, or Qwen)
2. **Document Assistant Mode** ⭐: Advanced document-aware chat with LOCAL_DOCS integration, retrieval-first approach, and deterministic numeric extraction

The Document Assistant mode uses **LLM models** for natural language understanding and **LOCAL_DOCS** (localStorage-based document storage) for semantic search. The system performs **deterministic numeric extraction** and **backend aggregation** to ensure accurate financial calculations.

### 🤖 Supported LLM Models

| Model | Size | RAM | Context | Turkish | Best For |
|-------|------|-----|---------|---------|----------|
| **Gemma2:2b** ⭐ | 2B | ~1.5GB | 8K | ⭐⭐⭐⭐ | Fast & Efficient (Recommended) |
| **Llama 3.2:3b** | 3B | ~2GB | 8K | ⭐⭐⭐ | Quick responses |
| **Qwen 2.5:7b** | 7B | ~4.5GB | 128K | ⭐⭐⭐⭐ | Best overall |

> **💡 Recommendation**: Use **Gemma2:2b** for fast inference, low memory usage, and good Turkish language support.

> **📦 Model Info**: Gemma2 is Google's efficient open model optimized for fast inference with excellent multilingual support including Turkish.

## 🏗️ Architecture

### Simple Chat Mode

```
User Query → LLM (Gemma2/Llama) → Response
```

### Document Assistant Mode (Production-Ready)

```
User Query
    ↓
1. LOCAL_DOCS Retrieval (Keyword + N-gram + Semantic)
    ↓
2. Relevance Scoring (0.0-1.0) → Filter (threshold: 0.4)
    ↓
3. Numeric Extraction (Turkish locale-aware regex)
    ↓
4. Aggregate Computation (Sum, Avg, Median, Count)
    ↓
5. LLM Processing (Gemma2) → Natural language answer + __meta__ JSON
    ↓
6. Response + Metadata (references, numeric values, statistics)
```

### Key Features

**Document Assistant Mode:**
- ✅ **LOCAL_DOCS Integration**: Direct access to localStorage documents (no external DB required)
- ✅ **Retrieval-First Approach**: Keyword → Partial → N-gram → Semantic matching
- ✅ **Deterministic Extraction**: Turkish-locale numeric extraction (1.234,56 TL format)
- ✅ **Backend Calculations**: Sum, average, median, min/max computed deterministically
- ✅ **Structured Output**: __meta__ JSON block with references, numeric values, and statistics
- ✅ **Anomaly Detection**: Contradictions and data quality verification
- ✅ **Turkish Language Optimized**: TDK-compliant, natural Turkish responses
- ✅ **Configurable Options**: compute, showRaw, maxRefs, locale
- ✅ **Low Temperature**: Deterministic responses (temp: 0.15)

**General Features:**
- ✅ **Dual Mode Support**: Switch between simple chat and document assistant
- ✅ **Conversation Memory**: Context-aware (last 5-10 messages)
- ✅ **Fallback Mode**: Works even if LLM connection fails
- ✅ **Turkish Locale Support**: Complete Turkish text normalization

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20
- Ollama (required for LLM models)
- Processed documents in localStorage (for Document Assistant mode)

### 1. Install Dependencies

```bash
npm install
```

### 2. Start BGE-M3 Embedding Server

```bash
cd model_server
pip install -r requirements.txt
python app.py
```

Server will start at `http://127.0.0.1:7860`

### 3. Start LLM with Ollama

#### Option A: Llama 3.2:3b (Lightweight)

```bash
# Install Ollama: https://ollama.ai/download
# Pull and run Llama 3.2:3b
ollama run llama3.2:3b
```

**Specs:**
- 3B parameters
- 8K context window
- ~2GB RAM
- Good for quick responses

#### Option B: Gemma2 2b (Recommended - Fast & Efficient)

```bash
# Pull and run Gemma2 2b
ollama pull gemma2:2b
ollama run gemma2:2b
```

**Specs:**
- 4B parameters
- 128K context window (16x larger!)
- ~4GB RAM (quantized version)
- Excellent Turkish language support
- 140+ languages
- Better for complex analysis
- Latest Gemma2 model with fast inference

**Optimized Parameters:**
- `temperature`: 0.25 (doğruluk odaklı)
- `top_p`: 0.9
- `repeat_penalty`: 1.1
- `context_length`: 128K
- `quantization`: q4_k_m (hız/kalite dengesi)

#### Option C: Qwen 2.5:7b (Best Performance)

```bash
# Pull and run Qwen 2.5:7b
ollama run qwen2.5:7b
```

**Specs:**
- 7B parameters
- 128K context window
- ~4.5GB RAM
- Best overall performance
- Excellent multilingual support

Ollama API will be at `http://127.0.0.1:11434`

#### 🛠️ CPU Mode (CUDA Error Fix)

If you encounter **CUDA errors** or GPU issues:

**Option 1: Use Batch File (Easiest)**
```bash
# Double-click this file to start Ollama in CPU mode
start_ollama_cpu.bat
```

**Option 2: Manual Environment Variable**
```bash
# PowerShell
$env:OLLAMA_NUM_GPU=0
ollama serve

# CMD
set OLLAMA_NUM_GPU=0
ollama serve
```

**Option 3: Permanent Fix**
Add to your `.env`:
```bash
OLLAMA_NUM_GPU=0
```

> **Note**: CPU mode is slower (~2-3x) but more stable and doesn't require GPU.

### 4. Configure Environment Variables

Create or update `.env`:

```bash
# BGE-M3 Embedding Server
MODEL_SERVER_URL=http://127.0.0.1:7860

# Llama LLM Server
LLAMA_SERVER_URL=http://127.0.0.1:11434

# LLM Model Selection (choose one)
# Options: gemma2:2b, llama3.2:3b, qwen2.5:7b
LLAMA_MODEL=gemma2:2b

# Vector Database (pgvector or qdrant)
VECTOR_DB=pgvector

# Supabase (if using pgvector)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# OR Qdrant (if using qdrant)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-api-key

# Search settings
TOP_K=50
```

### 5. Setup Vector Database

#### Option A: Supabase pgvector

1. Enable pgvector extension in Supabase:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

2. Create the `match_embeddings` function:

```sql
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding VECTOR(1024),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  section_id TEXT,
  document_id TEXT,
  filename TEXT,
  content TEXT,
  page_number INT,
  section_title TEXT,
  content_type TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ts.id AS section_id,
    ts.document_id,
    d.filename,
    ts.content,
    ts.page_number,
    ts.section_title,
    ts.content_type,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM embeddings e
  JOIN text_sections ts ON ts.id = e.text_section_id
  JOIN documents d ON d.id = ts.document_id
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

#### Option B: Qdrant

```bash
# Start Qdrant with Docker
docker run -p 6333:6333 qdrant/qdrant
```

Create collection via Qdrant API or UI.

### 6. Configure GPU/CPU Mode

GPU ve CPU modları arasında geçiş yapmak için:

**Option A: UI ile (Önerilen)**

1. Uygulamayı çalıştırın: `npm run dev`
2. **Settings** sayfasına gidin
3. **AI & Performans Ayarları** bölümünde:
   - **GPU Hızlandırma** toggle'ını açın/kapatın
   - **GPU Warmup** ile uygulama başlangıcında ısınmayı aktifleştirin
   - **Maksimum Context Uzunluğu** ile performans/kalite dengesini ayarlayın

**Option B: Environment Variables ile**

`.env` dosyasında:

```bash
# GPU modu (auto, enabled, disabled)
GPU_MODE=auto

# GPU warmup
GPU_WARMUP=true

# Max context length
MAX_CONTEXT_LENGTH=15000
```

### 7. Run the Application

```bash
npm run dev
```

Navigate to the AI Chat page or Settings page in the application.

## 🎛️ GPU/CPU Toggle Kullanımı

### Settings Sayfasında GPU Kontrolü

GPU ve CPU modları arasında kolayca geçiş yapabilirsiniz:

```
Settings > AI & Performans Ayarları
├── GPU Durumu: Kullanılabilir ✅ (NVIDIA GeForce RTX...)
├── GPU Hızlandırma: [ON/OFF Toggle]
├── GPU Warmup (Ön Isıtma): [ON/OFF Toggle]
└── Maksimum Context Uzunluğu: [4000-32000]
```

**GPU Durumu Göstergeleri:**
- 🟢 **Kullanılabilir** - GPU algılandı ve kullanıma hazır
- 🟡 **Kullanılamıyor** - GPU bulunamadı, CPU modu öneriliyor

**Toggle States:**
- **GPU Açık** 🚀 - GPU kullanılıyor (2-3x daha hızlı)
- **GPU Kapalı** 🐢 - CPU kullanılıyor (daha yavaş ama kararlı)

**Performans İpuçları:**
- GPU varsa her zaman açık tutun
- Warmup'ı aktif edin (uygulama başlangıcı biraz uzar ama ilk yanıt çok hızlı olur)
- Context uzunluğunu sisteminize göre ayarlayın:
  - CPU: 8000
  - GPU (4GB VRAM): 15000
  - GPU (8GB+ VRAM): 32000

### Runtime'da Mod Değiştirme

Ayarları değiştirdiğinizde:
1. Değişiklik anında kaydedilir
2. Yeni ayarlar bir sonraki AI sorgusundan itibaren geçerli olur
3. Uygulama yeniden başlatılmasına gerek yoktur

## 🧪 Testing

### Run Unit Tests

```bash
npm test
```

Tests cover:
- ✅ Turkish number parsing (1.234,56)
- ✅ US number parsing (1,234.56)
- ✅ Currency detection (TL, USD, EUR)
- ✅ Negative numbers
- ✅ Date extraction (DD.MM.YYYY, YYYY-MM-DD)
- ✅ Invoice ID patterns
- ✅ Aggregation (sum, avg, median, dedupe)

### Manual Testing

#### 1. Health Check

```bash
curl http://127.0.0.1:7860/health
curl http://127.0.0.1:11434/api/tags
```

#### 2. Test BGE-M3 Embedding

```bash
curl -X POST http://127.0.0.1:7860/embed \
  -H "Content-Type: application/json" \
  -d '{
    "texts": ["Fatura toplam tutarı 1.234,56 TL"],
    "normalize": true
  }'
```

Expected: 1024-dim vector array

#### 3. Test Llama Generation

```bash
curl -X POST http://127.0.0.1:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral",
    "prompt": "Merhaba, nasılsın?",
    "stream": false
  }'
```

Expected: Turkish response

#### 4. Test Chat Query (via Electron)

In the app, ask:
- "Faturalarımın toplam tutarı nedir?"
- "Kaç adet fatura var?"
- "Ortalama fatura tutarı ne kadar?"

## 📊 Benchmark

### Latency Goals

- Embedding (1 query): < 100ms
- Retrieval (50 chunks): < 500ms
- Extraction + Aggregation: < 100ms
- Llama formatting: < 2s
- **Total: < 2.5s**

### Accuracy Goals

- Numeric extraction: 95%+ precision
- Date parsing: 95%+ recall
- Invoice ID detection: 90%+ F1

## 🔧 Troubleshooting

### BGE-M3 Server Not Starting

```bash
# Check Python version
python --version  # Should be 3.9+

# Install dependencies
pip install torch transformers sentence-transformers flask flask-cors

# Try running with verbose output
python app.py --verbose
```

### Llama Server Issues

```bash
# Check Ollama is running
ollama list

# Restart Ollama
ollama serve

# Test model
ollama run mistral "Test"
```

### Vector Database Connection Failed

**Supabase:**
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Check if pgvector extension is enabled
- Verify `match_embeddings` function exists

**Qdrant:**
- Check if Qdrant is running: `curl http://localhost:6333`
- Verify collection exists

### No Results from Query

1. Check if documents are indexed:
   - Verify embeddings in database
   - Check text_sections table

2. Lower similarity threshold in `.env`:
   ```bash
   SIMILARITY_THRESHOLD=0.1
   ```

3. Increase TOP_K:
   ```bash
   TOP_K=100
   ```

## 🔐 Security Notes

- All processing is **100% local** (no data sent to cloud)
- Supabase connection uses anon key (RLS policies apply)
- Llama runs locally (no API keys needed)
- No PII is logged (only masked IDs in dev mode)

## 📈 Performance Optimization

### Caching

Enable caching for repeated queries:

```typescript
// In chatController.ts
private queryCache = new Map<string, ChatQueryResponse>();
```

### Batch Processing

Process multiple queries in parallel:

```bash
TOP_K=20  # Reduce for faster retrieval
```

### GPU Acceleration

#### BGE-M3 GPU Kullanımı

```python
# In app.py
device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = SentenceTransformer('BAAI/bge-m3', device=device)
```

#### Gemma2/Llama GPU Kullanımı

Ollama otomatik olarak GPU'yu algılar:

```bash
# GPU ile çalıştır (otomatik algılama)
ollama run gemma2:2b

# GPU kullanımını kontrol et
nvidia-smi
```

#### GPU Performans Optimizasyonları

**1. Quantizasyon Seviyeleri**

Daha düşük quantizasyon → daha hızlı ve az bellek:

```bash
# INT8 quantization (önerilen)
ollama pull gemma3:4b-it-q8_0

# INT4 quantization (en hızlı, biraz kalite kaybı)
ollama pull gemma3:4b-it-qat

# Tam precision (en yavaş, en iyi kalite)
ollama pull gemma3:4b-it
```

**Bellek Karşılaştırması:**
- `q4_k_m`: ~2.5GB VRAM (önerilen)
- `q8_0`: ~4GB VRAM
- `fp16`: ~8GB VRAM

**2. Context Window Optimizasyonu**

Büyük context = yavaş işlem:

```typescript
// llamaClient.ts içinde
const maxQueryLength = 4000; // Gemma2 2B için optimize (8K context)
const truncatedQuery = query.length > maxQueryLength 
  ? query.substring(0, maxQueryLength) + '\n\n[Mesaj kesildi]'
  : query;
```

**3. Streamed Output (Token Akışı)**

Gerçek zamanlı yanıt için:

```typescript
// llamaClient.ts
const payload = {
  model: 'gemma2:2b',
  prompt: fullPrompt,
  stream: true, // Streaming etkinleştir
  options: {
    temperature: 0.25,
    num_predict: 300,
  },
};
```

**4. Warm-up Run**

Uygulama başlangıcında model ısıtma:

```typescript
// main.ts - uygulama başlangıcında
async function warmupGPU() {
  const llamaClient = new LlamaClient();
  
  console.log('🔥 GPU warming up...');
  
  await llamaClient.generate({
    instructions: 'Merhaba',
    context: '',
    maxTokens: 10,
    temperature: 0.25,
  });
  
  console.log('✅ GPU ready');
}

// App ready event'inde çağır
app.whenReady().then(async () => {
  await warmupGPU();
  createWindow();
});
```

**5. Layer Cache (Katman Önbellekleme)**

Ollama otomatik olarak GPU belleğinde katman önbelleklemesi yapar:

```bash
# Model GPU'ya yüklendiğinde bellekte kalır
ollama run gemma2:2b

# Kapatmak için:
ollama stop gemma2:2b
```

**6. Batch Processing (Paralel İşleme)**

Birden fazla sorgu varsa:

```typescript
// chatController.ts
async handleBatchQueries(requests: ChatQueryRequest[]): Promise<ChatQueryResponse[]> {
  // Paralel işlem
  return await Promise.all(
    requests.map(req => this.handleChatQuery(req))
  );
}
```

#### DocDataApp GPU Entegrasyonu

**Adım 1: GPU Kontrolü**

`.env` dosyasına:

```bash
# GPU modu (varsayılan: auto)
GPU_MODE=auto  # auto, enabled, disabled
OLLAMA_NUM_GPU=1  # 0 = CPU only, 1+ = GPU enabled
```

**Adım 2: Startup Script**

`start_ollama_gpu.bat` oluştur:

```bash
@echo off
echo Starting Ollama with GPU...

REM GPU kontrolü
nvidia-smi >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: GPU not detected, using CPU
    set OLLAMA_NUM_GPU=0
) else (
    echo GPU detected, enabling acceleration
    set OLLAMA_NUM_GPU=1
)

REM Ollama başlat
ollama serve

pause
```

**Adım 3: Fallback Mekanizması**

```typescript
// llamaClient.ts
async generate(request: LlamaGenerateRequest): Promise<LlamaGenerateResponse> {
  try {
    // GPU ile dene
    return await this.generateWithGPU(request);
  } catch (error) {
    console.warn('⚠️ GPU failed, falling back to CPU');
    
    // CPU moduna geç
    process.env.OLLAMA_NUM_GPU = '0';
    return await this.generateWithCPU(request);
  }
}
```

**Adım 4: GPU Bellek Monitörü**

```typescript
// main.ts
import { exec } from 'child_process';

async function checkGPUMemory(): Promise<number> {
  return new Promise((resolve) => {
    exec('nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits', 
      (error, stdout) => {
        if (error) {
          resolve(0); // GPU yok
        } else {
          resolve(parseInt(stdout.trim()));
        }
      }
    );
  });
}

// Periyodik kontrol
setInterval(async () => {
  const memoryUsed = await checkGPUMemory();
  if (memoryUsed > 6000) { // 6GB üstü
    console.warn('⚠️ GPU memory high:', memoryUsed, 'MB');
  }
}, 30000); // Her 30 saniyede
```

#### Performans Karşılaştırması

| Mod | İlk Yanıt | Sonraki Yanıtlar | Bellek |
|-----|-----------|------------------|---------|
| **CPU (q4_k_m)** | ~5-8s | ~3-5s | ~2GB RAM |
| **GPU (q4_k_m)** | ~2-3s | ~0.5-1s | ~2.5GB VRAM |
| **GPU (q8_0)** | ~3-4s | ~1-2s | ~4GB VRAM |
| **GPU warm-up** | ~0.3s | ~0.3s | - |

#### Önerilen Yapılandırma

**Geliştiriciler için (GPU varsa):**
```bash
LLAMA_MODEL=gemma2:2b  # Fast 2B model
OLLAMA_NUM_GPU=1
GPU_WARMUP=true
MAX_CONTEXT_LENGTH=15000
```

**Kullanıcılar için (GPU yoksa):**
```bash
LLAMA_MODEL=gemma3:4b-it-qat
OLLAMA_NUM_GPU=0  # CPU modu
GPU_WARMUP=false
MAX_CONTEXT_LENGTH=8000  # Daha kısa context
```

### GPU Bellek Yönetimi

#### Otomatik Bellek Temizleme

Uygulama GPU belleğini otomatik olarak izler ve gerektiğinde temizler:

```typescript
// main.ts - Otomatik başlatılır
startGPUMemoryMonitor(
  30000,  // Her 30 saniyede kontrol
  6000,   // 6GB eşik değeri
  true    // Otomatik temizleme aktif
);
```

**Nasıl Çalışır:**
1. Her 30 saniyede GPU bellek kullanımı kontrol edilir
2. Kullanım 6GB'ı aşarsa otomatik temizlik başlar
3. Ollama modelleri GPU'dan kaldırılır
4. Bellek serbest bırakılır
5. Sonraki sorguda model tekrar yüklenir

**Log Çıktısı:**
```
📊 GPU Memory: 5200MB / 8192MB (63.5% used, 2992MB free)
⚠️ GPU memory HIGH: 6400MB / 8192MB (threshold: 6000MB)
🧹 Triggering automatic GPU cleanup...
✅ Unloaded model: gemma2:2b
🧹 GPU Cleanup: 6400MB → 450MB (freed: 5950MB)
✅ Cleanup successful! Freed 5950MB
```

#### Manuel Bellek Temizleme

Settings sayfasından manuel olarak temizleyebilirsiniz:

1. **Settings** → **AI & Performans Ayarları**
2. **GPU Belleğini Temizle** butonuna tıklayın
3. Onay mesajı ile kaç MB serbest bırakıldığı gösterilir

**IPC Kullanımı:**
```typescript
// Renderer process'ten
const result = await window.electron.ipcRenderer.invoke('cleanup-gpu-memory');
console.log(`Freed ${result.freedMemoryMB}MB`);
```

#### Bellek Eşik Ayarları

`.env` dosyasında yapılandırma:

```bash
# GPU bellek eşik değeri (MB)
GPU_MEMORY_THRESHOLD=6000

# Otomatik temizleme (true/false)
GPU_AUTO_CLEANUP=true
```

**Önerilen Eşik Değerleri:**
- 4GB GPU: 3000MB
- 6GB GPU: 4500MB
- 8GB GPU: 6000MB
- 12GB+ GPU: 8000MB

#### Bellek Optimizasyon İpuçları

**1. Model Seçimi**
```bash
# Düşük bellek (2.5GB)
LLAMA_MODEL=gemma2:2b  # Fast 2B model

# Orta bellek (4GB)
LLAMA_MODEL=gemma2:2b  # Fast 2B model
```

**2. Context Length Ayarı**
Daha kısa context = daha az bellek:
```bash
MAX_CONTEXT_LENGTH=8000   # ~500MB
MAX_CONTEXT_LENGTH=15000  # ~1GB
MAX_CONTEXT_LENGTH=32000  # ~2GB
```

**3. Keep-Alive Ayarı**
Model GPU'da ne kadar kalacak:
```bash
# Ollama config
OLLAMA_KEEP_ALIVE=5m  # 5 dakika sonra otomatik kaldır
OLLAMA_KEEP_ALIVE=0   # Hemen kaldır (her seferinde yeniden yükler)
```

**4. Batch Size Azaltma**
Aynı anda işlenen sorgu sayısını sınırlayın:
```typescript
// chatController.ts
const maxConcurrentRequests = 1;  // GPU belleği sınırlıysa
```

## 🛠️ Development

### File Structure

```
src/main/ai/
├── chatController.ts      # Main orchestrator
├── llamaClient.ts         # Llama API wrapper
├── embedClient.ts         # BGE-M3 wrapper
├── retrievalClient.ts     # Vector DB client
├── numericExtractor.ts    # Deterministic extraction
└── aggregator.ts          # Statistical aggregation

src/renderer/src/components/ChatBot/
└── ChatBot.tsx            # React UI

tests/
├── numericExtractor.test.ts
└── aggregator.test.ts
```

### Extending the System

#### Add New Extraction Patterns

Edit `numericExtractor.ts`:

```typescript
export function extractCustomData(text: string) {
  // Add your pattern
}
```

#### Add New Aggregation Metrics

Edit `aggregator.ts`:

```typescript
export function aggregateCustomMetric(amounts: ExtractedAmount[]) {
  // Add your metric
}
```

## 🔄 Switching Models

You can easily switch between models:

### Option 1: Environment Variable (Recommended)

Edit `.env`:
```bash
LLAMA_MODEL=gemma2:2b
```

Available models:
- `llama3.2:3b` - Lightweight, fast
- `gemma2:2b` - Fast & Efficient (Recommended) ⭐
- `qwen2.5:7b` - Best overall performance

### Option 2: Runtime Selection

The app automatically detects your `LLAMA_MODEL` environment variable. Just restart the app after changing it.

### Testing Different Models

```bash
# Test Gemma2 2b (Recommended)
ollama run gemma2:2b
# Type some Turkish text to test

# Test Qwen 2.5:7b
ollama run qwen2.5:7b
# Type some Turkish text to test

# Test Llama 3.2:3b
ollama run llama3.2:3b
# Type some Turkish text to test
```

Compare performance and choose what works best for your needs!

## 💡 Document Assistant Mode - Usage Guide

### How to Use

1. **Upload Documents**: Process your documents (PDF, DOCX, Excel, etc.) through the app
2. **Switch to Document Mode**: Click "Doküman Asistanı" button in chatbot
3. **Configure Options** (optional):
   - **Otomatik Hesaplama**: Enable automatic numeric calculations
   - **Ham Veri Göster**: Show raw extracted values
   - **Max Referans**: Set maximum number of references (1-20)
4. **Ask Questions**: Query your documents naturally in Turkish

### System Prompt Features

The Document Assistant uses a production-ready system prompt with:

- **Retrieval-First Logic**: Searches documents using keyword → partial → n-gram → semantic matching
- **Deterministic Extraction**: Extracts numbers using Turkish locale-aware regex (1.234,56 TL)
- **Structured Output**: Returns answer + `__meta__` JSON with references and statistics
- **Anomaly Detection**: Flags contradictions and data quality issues
- **Low Hallucination**: Temperature 0.15 for deterministic, fact-based responses

### Example Queries

#### Financial Queries (Document Mode)

- "Excel dosyalarındaki toplam maaş nedir?" → Extracts numbers, computes sum
- "Faturalardaki ortalama tutar nedir?" → Returns avg with references
- "En yüksek fatura tutarı hangi dosyada?" → Finds max value with source

#### Document Search

- "Employee Sample Data dosyasında kaç çalışan var?"
- "Hangi dokümanlarda 'invoice' kelimesi geçiyor?"
- "PDF'lerdeki toplam sayfa sayısı nedir?"

#### Structured Data

- "Excel'deki tüm departmanları listele"
- "PowerPoint sunumlarındaki başlıkları göster"

### Response Format

Document Assistant returns two parts:

1. **Human-Readable Answer**: Natural Turkish text (1-3 sentences)
2. **__meta__ JSON Block**: Machine-parseable metadata

Example:
```
Toplam 3 faturada 45.600,50 TRY bulundu.

__meta__:
{
  "language": "tr",
  "query": "Fatura toplamı nedir?",
  "foundReferences": [
    {
      "section_id": "excel_123_0_0_1",
      "document_id": "excel_123",
      "filename": "invoices.xlsx",
      "excerpt": "Toplam: 15.200,00 TL",
      "relevanceScore": 0.92,
      "page": 1
    }
  ],
  "numericValues": [
    {
      "section_id": "excel_123_0_0_1",
      "rawValue": "15.200,00 TL",
      "parsedValue": 15200.0,
      "currency": "TRY"
    }
  ],
  "aggregatesSuggested": {
    "count": 3,
    "sum": 45600.5,
    "avg": 15200.17
  },
  "confidence": 0.89
}
```

## 📝 Example Queries (Legacy Mode)

### Financial Queries

- "Son ay içindeki faturalarımın toplam tutarı ne kadar?"
- "Ortalama fatura tutarım nedir?"
- "En yüksek fatura tutarı ne?"
- "Kaç adet fatura var?"

### Date-Based Queries

- "Mart ayındaki faturaları göster"
- "2024 yılı toplam fatura tutarı"
- "Son 7 gündeki faturalar"

### Invoice-Specific

- "FT-2024-001 numaralı fatura tutarı nedir?"
- "Tekrar eden fatura var mı?"

## 🎯 Roadmap

- [ ] Multi-language support (English, German)
- [ ] Currency conversion
- [ ] Export results to Excel
- [ ] Voice input
- [ ] Scheduled reports

## 📚 References

- [BGE-M3 Model](https://huggingface.co/BAAI/bge-m3)
- [Llama 3.2](https://ollama.ai/library/llama3.2)
- [Ollama Documentation](https://ollama.ai/docs)
- [Supabase pgvector](https://supabase.com/docs/guides/ai/vector-columns)
- [Qdrant](https://qdrant.tech/documentation/)

## 📄 License

MIT License - see LICENSE file

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch (`feature/mistral-chatbot-rag`)
3. Write tests
4. Submit pull request

---

**Built with ❤️ for accurate, local-first AI document analysis**

