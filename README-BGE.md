# BGE-M3 Embedding Pipeline - Hızlı Başlangıç

Bu dokümantasyon, Electron + React masaüstü uygulamanızda BGE-M3 embedding pipeline'ını nasıl kuracağınızı ve kullanacağınızı açıklar.

## 🚀 Hızlı Kurulum (3-5 Adım)

### 1. Model Server Kurulumu

```bash
# Model server dizinine git
cd model_server

# Python virtual environment oluştur
python -m venv venv

# Virtual environment'ı aktifleştir
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Dependencies yükle
pip install -r requirements.txt
```

### 2. Platform-Specific Torch Kurulumu

**Windows (CUDA):**
```bash
pip install torch==2.1.0+cu118 --index-url https://download.pytorch.org/whl/cu118
```

**Windows (CPU):**
```bash
pip install torch==2.1.0+cpu --index-url https://download.pytorch.org/whl/cpu
```

**macOS (Apple Silicon):**
```bash
pip install torch==2.1.0 --index-url https://download.pytorch.org/whl/cpu
```

**Linux (CUDA):**
```bash
pip install torch==2.1.0+cu118 --index-url https://download.pytorch.org/whl/cu118
```

### 3. Model Server Başlatma

```bash
# Model server'ı başlat
python app.py

# Veya uvicorn ile:
uvicorn app:app --host 127.0.0.1 --port 7860 --workers 1
```

### 4. Supabase Schema Kurulumu

1. Supabase Dashboard → SQL Editor'a git
2. `sql/supabase_schema.sql` dosyasının içeriğini kopyala
3. Placeholder'ları değiştir:
   - `<EMBEDDING_DIMENSION>` → `1024`
   - `<INDEX_NAME>` → `documents_embedding_idx`
4. SQL'i çalıştır

### 5. Environment Variables

`.env` dosyasına ekle:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
MODEL_SERVER_URL=http://127.0.0.1:7860
```

## 🔧 Kullanım

### Belge İşleme ve Indexing

1. **Supabase'e giriş yap** (SupabaseLoginModal ile)
2. **Proje seç** (SupabaseProjectSelector ile)
3. **Belge yükle** (FileDropZone ile)
4. **"Belgeyi İşle ve Kaydet" butonuna bas** (ProcessAndIndexButton ile)

### İşlem Adımları

1. **Dosya Kontrolü** - Yüklenen dosya doğrulanır
2. **Metin Çıkarma** - PDF/DOCX'ten metin çıkarılır
3. **AI Embedding** - BGE-M3 ile embedding oluşturulur
4. **Supabase Kaydetme** - Embedding ve metadata kaydedilir

## 🛠️ Geliştirme

### Model Server Geliştirme

```bash
# Model server'ı development modunda çalıştır
cd model_server
python app.py

# Health check
curl http://127.0.0.1:7860/health

# Test embedding
curl -X POST http://127.0.0.1:7860/embed \
  -H "Content-Type: application/json" \
  -d '{"texts": ["Test document"], "batch_size": 1}'
```

### Electron App Geliştirme

```bash
# Main process'i çalıştır
npm run dev:main

# Renderer process'i çalıştır
npm run dev:renderer

# Tam uygulamayı çalıştır
npm run dev
```

## 📦 Packaging & Service Management

### macOS - LaunchAgent

`~/Library/LaunchAgents/com.docdataapp.model-server.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.docdataapp.model-server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/venv/bin/python</string>
        <string>/path/to/model_server/app.py</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

### Windows - NSSM Service

```powershell
# NSSM ile service oluştur
nssm install "DocDataModelServer" "C:\path\to\venv\Scripts\python.exe" "C:\path\to\model_server\app.py"
nssm start "DocDataModelServer"
```

## 🧪 Test Checklist

- [ ] Model server başlatıldı ve `curl http://127.0.0.1:7860/health` çalışıyor
- [ ] `curl POST /embed` ile embedding test edildi
- [ ] Electron app başlatıldı
- [ ] Supabase'e giriş yapıldı
- [ ] Proje seçildi
- [ ] Belge yüklendi
- [ ] "Belgeyi İşle ve Kaydet" butonu çalışıyor
- [ ] Supabase `documents` tablosunda yeni kayıt oluştu

## 🔒 Güvenlik Notları

- **Service Role Key**: Sadece main process'te sakla, renderer'a gönderme
- **Model Server**: Sadece localhost'ta çalıştır (127.0.0.1)
- **Environment Variables**: `.env` dosyasını git'e ekleme
- **Keytar**: Electron-rebuild gerekebilir

## ⚡ Performance Notları

- **Batch Size**: 16-64 arası önerilir
- **GPU/MPS**: Otomatik tespit edilir
- **CPU Fallback**: Yavaş olabilir, uyarı verilir
- **Memory**: Model ~2-4GB RAM kullanır
- **Disk**: Model dosyası ~2-3GB yer kaplar

## 🐛 Troubleshooting

### Model Server Başlamıyor
```bash
# Port kontrolü
netstat -an | grep 7860

# Python path kontrolü
which python
python --version

# Dependencies kontrolü
pip list | grep torch
```

### Embedding Hatası
```bash
# Model server health check
curl http://127.0.0.1:7860/health

# Log kontrolü
tail -f model_server.log
```

### Supabase Bağlantı Hatası
```bash
# Environment variables kontrolü
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Supabase connection test
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/rest/v1/"
```

## 📚 API Referansı

### Model Server Endpoints

- `GET /health` - Server durumu
- `POST /embed` - Embedding oluşturma
- `GET /` - Temel bilgiler

### Electron IPC Methods

- `embedding:initializeSupabase` - Supabase bağlantısı
- `embedding:checkHealth` - Model server durumu
- `embedding:processAndIndexFile` - Ana işlem fonksiyonu
- `embedding:generateEmbeddings` - Embedding oluşturma
- `embedding:indexDocument` - Doküman indexleme

## 🎯 Sonraki Adımlar

1. **Similarity Search**: Benzer dokümanları bulma
2. **Batch Processing**: Çoklu dosya işleme
3. **Advanced Metadata**: Zengin metadata desteği
4. **Real-time Updates**: Canlı güncellemeler
5. **Analytics**: Kullanım istatistikleri
