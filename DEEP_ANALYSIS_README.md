# Deep Analysis Pipeline — Mistral 7B Multi-Pass Reasoning

Bu doküman, DocDataApp için geliştirilmiş **Deep Analysis Pipeline**'ın kullanımını ve konfigürasyonunu açıklar.

## 🎯 Genel Bakış

Deep Analysis Pipeline, standart RAG (Retrieval-Augmented Generation) sürecine ek olarak şu özellikleri sunar:

1. **Deterministic Extraction**: NumericExtractor ile kesin sayısal veri çıkarımı
2. **Backend Aggregation**: Node.js'te toplam, ortalama, medyan hesaplama
3. **Duplicate Detection**: Fatura ID'lerinde otomatik tekrar tespiti
4. **Outlier Detection**: IQR yöntemiyle aykırı değer tespiti
5. **LLM Formatting**: Mistral 7B ile doğal dil formatı
6. **Critic Verification**: LLM çıktısının hesaplanan istatistiklerle tutarlılık kontrolü
7. **Self-Consistency**: Critic'in bulduğu hataları işaretleme

## 🚀 Hızlı Başlangıç

### 1. Gereksinimler

```bash
# BGE-M3 Model Server (Python)
cd model_server
pip install -r requirements.txt
python app.py

# Mistral 7B (Ollama)
ollama pull mistral
ollama serve
```

### 2. Environment Konfigürasyonu

`.env` dosyasına ekleyin:

```env
# AI Model Configuration
BGE_MODEL_SERVER_URL=http://127.0.0.1:5000
MISTRAL_SERVER_URL=http://127.0.0.1:11434

# Deep Analysis Configuration
ENABLE_CRITIC=true
CRITIC_MODEL=mistral
CRITIC_TIMEOUT=2000
DEEP_ANALYSIS_TIMEOUT=15000

# Optional: Escalate to stronger model
# ESCALATE_MODEL=mixtral

# Vector Database
VECTOR_DB=local
```

### 3. Kullanım

#### Renderer Process (React/TypeScript)

```typescript
// Deep analysis query ile çağrı
const response = await window.electron.ipcRenderer.invoke('ai:chatQueryDeep', {
  userId: 'user-123',
  query: 'Toplam fatura tutarı nedir?',
  options: {
    currency: 'TRY',
    topK: 50,
    locale: 'tr'
  },
  config: {
    enableCritic: true,
    criticModel: 'mistral',
    timeout: 15000,
    criticTimeout: 2000
  }
});

// Response yapısı
if (response.success) {
  console.log('Answer:', response.payload.answer);
  console.log('Stats:', response.payload.stats);
  console.log('Flags:', response.payload.displayFlags);
  console.log('Critic verified:', response.payload.modelMeta.criticVerified);
  
  // Check for issues
  if (response.payload.displayFlags.duplicates) {
    console.warn('Duplicate invoices detected!');
  }
  if (response.payload.displayFlags.outliers) {
    console.warn('Outliers found:', response.payload.stats.outliers);
  }
}
```

#### Main Process (Direct API)

```typescript
import { ChatController } from './ai/chatController';

const controller = new ChatController(true); // Use local storage

const response = await controller.chatQueryDeep(
  {
    userId: 'user-123',
    query: 'Son 3 ayın fatura ortalaması nedir?',
    options: {
      currency: 'TRY',
      topK: 100
    }
  },
  {
    enableCritic: true,
    timeout: 15000
  }
);
```

## 📊 Pipeline Akışı

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Query Embedding (BGE-M3)                                  │
│    "Toplam fatura tutarı?"  →  [0.23, 0.45, ...]           │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│ 2. Retrieval (pgvector/Qdrant or Local Storage)             │
│    Top-K most similar document chunks                        │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│ 3. Deterministic Extraction (numericExtractor.ts)            │
│    • Amounts: 1.234,56 TL → 1234.56                         │
│    • Dates: 01.01.2024 → Date object                        │
│    • Invoice IDs: INV-2024-001                              │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│ 4. Backend Aggregation (aggregator.ts)                       │
│    • Sum, Average, Median, Min, Max                         │
│    • Duplicate detection (invoice IDs)                      │
│    • Outlier detection (IQR method)                         │
│    • Flags: {duplicatesFound, outliersFound}                │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│ 5. Draft Generation (Mistral 7B)                             │
│    PROMPT_GENERATE:                                          │
│    "Use ONLY ComputedStats. Format Turkish answer."         │
│    → Draft answer with numbers from backend                 │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│ 6. Critic Verification (Mistral 7B) [Optional]               │
│    PROMPT_CRITIC:                                            │
│    "Check if draft matches ComputedStats."                  │
│    → {ok: boolean, issues: [...]}                           │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│ 7. Finalize Response                                         │
│    • If critic OK: return draft                             │
│    • If critic NOT OK: flag issues (or re-generate)         │
│    • Attach provenance, flags, stats                        │
└──────────────────────────────────────────────────────────────┘
```

## ⚙️ Konfigürasyon Seçenekleri

### `DeepAnalysisConfig`

| Parametre | Tip | Default | Açıklama |
|-----------|-----|---------|----------|
| `enableCritic` | `boolean` | `true` | Critic doğrulamayı aktif et |
| `criticModel` | `'mistral' \| 'local'` | `'mistral'` | Critic için kullanılacak model |
| `escalateModel` | `string?` | `undefined` | Critic başarısız olursa kullanılacak güçlü model (ör: `'mixtral'`) |
| `timeout` | `number` | `15000` | Toplam pipeline timeout (ms) |
| `criticTimeout` | `number` | `2000` | Critic için max süre (ms) |

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ENABLE_CRITIC` | Enable/disable critic globally | `true` |
| `CRITIC_MODEL` | Default critic model | `mistral` |
| `CRITIC_TIMEOUT` | Max critic duration (ms) | `2000` |
| `DEEP_ANALYSIS_TIMEOUT` | Total pipeline timeout (ms) | `15000` |
| `ESCALATE_MODEL` | Stronger model for re-generation | `mixtral` |

## 🧪 Test Örnekleri

### 1. Duplicate Detection Test

```typescript
import { aggregateAll } from './aggregator';

const invoices = [
  { id: 'INV-001', raw: 'INV-001', confidence: 0.9, pattern: 'structured' },
  { id: 'INV-001', raw: 'INV-001', confidence: 0.9, pattern: 'structured' }, // Duplicate!
];

const result = aggregateAll([], [], invoices);

console.log(result.metadata.duplicatesFound); // true
console.log(result.invoices.duplicates); // ['INV-001']
```

### 2. Outlier Detection Test

```typescript
const amounts = [
  { amount: 100, currency: 'TRY', raw: '100 TL', confidence: 0.9 },
  { amount: 110, currency: 'TRY', raw: '110 TL', confidence: 0.9 },
  { amount: 1000, currency: 'TRY', raw: '1000 TL', confidence: 0.9 }, // Outlier!
];

const result = aggregateAll(amounts, [], []);

console.log(result.metadata.outliersFound); // true
console.log(result.amounts.outliers); // [1000]
```

### 3. Critic Mismatch Simulation

```typescript
const computedStats = {
  count: 3,
  sum: 300,
  average: 100,
  median: 100,
  currency: 'TRY'
};

// LLM says: "Toplam 500 TL"
const llmSaidSum = 500;

const isMismatch = llmSaidSum !== computedStats.sum;
console.log('Critic should flag this:', isMismatch); // true
```

## 📋 Response Format

```typescript
interface ChatQueryResponse {
  success: boolean;
  payload?: {
    answer: string; // Natural language answer
    stats: {
      count: number;
      sum: number;
      average: number;
      median: number;
      min: number;
      max: number;
      currency: string | null;
      outliers?: number[]; // Detected outlier values
    };
    provenance: Array<{
      sectionId: string;
      documentId: string;
      filename: string;
      snippet: string;
      similarity: number;
    }>;
    displayFlags: {
      lowConfidence?: boolean;
      duplicates?: boolean; // Duplicate invoices detected
      outliers?: boolean;   // Outliers detected
    };
    modelMeta: {
      model: string;
      latencyMs: number;
      criticVerified?: boolean; // Was critic check performed?
      criticIssues?: string[];  // Issues found by critic
    };
    suggestedFollowUp?: string;
  };
  error?: string;
}
```

## 🎨 UI Integration Örnekleri

### Display Flags

```tsx
function ChatResponse({ response }: { response: ChatQueryResponse }) {
  const flags = response.payload?.displayFlags;
  
  return (
    <div>
      <p>{response.payload?.answer}</p>
      
      {flags?.duplicates && (
        <Warning>
          ⚠️ Duplicate invoices detected. Some invoices may be counted twice.
        </Warning>
      )}
      
      {flags?.outliers && (
        <Info>
          📊 Outliers found: {response.payload?.stats.outliers?.join(', ')}
        </Info>
      )}
      
      {response.payload?.modelMeta.criticVerified === false && (
        <Alert>
          🔍 Critic verification found inconsistencies. Please review.
          {response.payload?.modelMeta.criticIssues?.map(issue => (
            <li key={issue}>{issue}</li>
          ))}
        </Alert>
      )}
    </div>
  );
}
```

### Critic Status Badge

```tsx
function CriticBadge({ verified }: { verified?: boolean }) {
  if (verified === undefined) return null;
  
  return (
    <Badge color={verified ? 'green' : 'red'}>
      {verified ? '✓ Verified' : '⚠ Issues Found'}
    </Badge>
  );
}
```

## 🔧 Troubleshooting

### Critic Always Returns OK

**Problem**: Critic her zaman `ok: true` dönüyor.

**Çözüm**:
1. Mistral server'ın çalıştığından emin olun: `ollama list`
2. Temperature'ı düşürün: `temperature: 0.0`
3. JSON parsing başarısız oluyorsa loglara bakın

### Timeouts

**Problem**: Deep analysis timeout veriyor.

**Çözüm**:
1. `DEEP_ANALYSIS_TIMEOUT` değerini artırın (default: 15s)
2. `CRITIC_TIMEOUT` değerini azaltın (default: 2s)
3. Critic'i devre dışı bırakın: `enableCritic: false`

### Duplicate Detection Çalışmıyor

**Problem**: Tekrar eden faturalar tespit edilmiyor.

**Çözüm**:
1. Invoice ID extraction pattern'lerini kontrol edin
2. Normalization doğru çalışıyor mu? (büyük/küçük harf)
3. Test ile doğrulayın: `npm test -- deepAnalysis.test.ts`

## 📈 Performance Metrics

Tipik bir deep analysis query için beklenen süreler:

- **Embedding**: ~100-300ms (BGE-M3)
- **Retrieval**: ~50-150ms (local storage) veya ~200-500ms (pgvector)
- **Extraction**: ~10-50ms (deterministik)
- **Aggregation**: ~5-20ms (backend)
- **Generation**: ~2000-5000ms (Mistral 7B)
- **Critic**: ~1000-2000ms (Mistral 7B)

**Total**: ~3500-8000ms

## 🧑‍💻 Development

### Run Tests

```bash
# All tests
npm test

# Only deep analysis tests
npm test -- deepAnalysis.test.ts

# With coverage
npm test -- --coverage
```

### Debug Mode

```typescript
// Enable verbose logging
process.env.DEBUG = 'ai:*';

const controller = new ChatController(true);
const response = await controller.chatQueryDeep(...);
```

## 📚 Referanslar

- [MISTRAL_SETUP.md](./MISTRAL_SETUP.md) - Mistral kurulum kılavuzu
- [README-chatbot.md](./README-chatbot.md) - Genel chatbot dokümanı
- [CHANGELOG.md](./CHANGELOG.md) - Değişiklik geçmişi

## 🤝 Contributing

Yeni özellik eklemek için:

1. `feature/your-feature` branch'i oluşturun
2. Değişiklikleri yapın
3. Test ekleyin (`tests/deepAnalysis.test.ts`)
4. PR açın

## 📄 License

MIT

