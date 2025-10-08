# Mistral RAG Chatbot - Setup Guide

## 📋 Overview

This feature adds a local AI-powered chatbot to DocDataApp using **Mistral 7B** for natural language formatting and **BGE-M3** for semantic search. The system performs **deterministic numeric extraction** and **backend aggregation** to ensure accurate financial calculations.

## 🏗️ Architecture

```
User Query
    ↓
1. Embed Query (BGE-M3) → 1024-dim vector
    ↓
2. Vector Search (pgvector/Qdrant) → Top-K similar chunks
    ↓
3. Numeric Extraction (JS/Regex) → Amounts, Dates, Invoice IDs
    ↓
4. Aggregation (Backend) → Sum, Avg, Median, Count
    ↓
5. Format Answer (Mistral 7B) → Natural language + provenance
    ↓
Response to User
```

### Key Features

- ✅ **Deterministic extraction**: Numbers, dates, and invoice IDs extracted via regex (no LLM hallucination)
- ✅ **Backend calculations**: Sum, average, median computed in Node.js (not by LLM)
- ✅ **Mistral for formatting only**: LLM only formats final answer with provenance
- ✅ **Dual vector DB support**: Works with Supabase pgvector OR Qdrant
- ✅ **Fallback mode**: Works even if Mistral is down (uses templates)
- ✅ **Turkish locale support**: Handles Turkish number format (1.234,56)

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20
- Python 3.9+ (for model servers)
- Docker (optional, for Mistral)
- Ollama (recommended for Mistral)

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

### 3. Start Mistral 7B

#### Option A: Ollama (Recommended)

```bash
# Install Ollama: https://ollama.ai/download
ollama pull mistral
ollama run mistral
```

Ollama API will be at `http://127.0.0.1:11434`

#### Option B: Docker + Text Generation Inference

```bash
docker run -p 11434:80 \
  -v $PWD/models:/data \
  ghcr.io/huggingface/text-generation-inference:latest \
  --model-id mistralai/Mistral-7B-Instruct-v0.2
```

#### Option C: llama.cpp (CPU, Quantized)

```bash
# Download GGUF model
wget https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf

# Run server
./llama-server -m mistral-7b-instruct-v0.2.Q4_K_M.gguf --port 11434
```

### 4. Configure Environment Variables

Create or update `.env`:

```bash
# BGE-M3 Embedding Server
MODEL_SERVER_URL=http://127.0.0.1:7860

# Mistral LLM Server
MISTRAL_SERVER_URL=http://127.0.0.1:11434

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

### 6. Run the Application

```bash
npm run dev
```

Navigate to the AI Chat page in the application.

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

#### 3. Test Mistral Generation

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
- Mistral formatting: < 2s
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

### Mistral Server Issues

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
- Mistral runs locally (no API keys needed)
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

For BGE-M3:

```python
# In app.py
device = 'cuda' if torch.cuda.is_available() else 'cpu'
```

For Mistral (with Ollama):

```bash
# GPU will be auto-detected
ollama run mistral
```

## 🛠️ Development

### File Structure

```
src/main/ai/
├── chatController.ts      # Main orchestrator
├── mistralClient.ts       # Mistral API wrapper
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

## 📝 Example Queries

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
- [Mistral 7B](https://mistral.ai/news/announcing-mistral-7b/)
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

