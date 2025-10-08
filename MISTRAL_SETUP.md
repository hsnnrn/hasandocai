# Mistral 7B Kurulum Rehberi

## Yöntem 1: Ollama (ÖNERİLEN) ⭐

### 1. Ollama'yı İndir ve Kur

**Windows için:**
1. https://ollama.ai/download adresine git
2. "Download for Windows" butonuna tıkla
3. OllamaSetup.exe dosyasını indir ve çalıştır
4. Kurulum tamamlandıktan sonra bilgisayarı yeniden başlat (gerekirse)

**Veya PowerShell ile:**
```powershell
winget install Ollama.Ollama
```

### 2. Mistral Modelini İndir

Kurulum tamamlandıktan sonra:

```bash
# Mistral 7B modelini indir (yaklaşık 4GB)
ollama pull mistral

# İndirme tamamlandığında modeli çalıştır
ollama run mistral
```

### 3. Test Et

```bash
# Yeni bir terminal aç ve test et
curl http://localhost:11434/api/tags
```

Çıktı:
```json
{
  "models": [
    {
      "name": "mistral:latest",
      ...
    }
  ]
}
```

### 4. ChatBot'ta Kullan

Mistral çalışırken DocDataApp'i aç:
```bash
npm run dev
```

AI Chat sayfasına git ve sağ üstte Mistral göstergesinin yeşil olduğunu kontrol et! 🟢

---

## Yöntem 2: Docker + Text Generation Inference

```bash
docker pull ghcr.io/huggingface/text-generation-inference:latest

docker run -p 11434:80 \
  -v $HOME/.cache/huggingface:/data \
  ghcr.io/huggingface/text-generation-inference:latest \
  --model-id mistralai/Mistral-7B-Instruct-v0.2
```

---

## Yöntem 3: llama.cpp (CPU için)

### 1. GGUF Model İndir
```bash
# Quantized model (4-bit)
curl -L https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf -o mistral-7b.gguf
```

### 2. llama.cpp Kur
```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
mkdir build
cd build
cmake ..
cmake --build . --config Release
```

### 3. Çalıştır
```bash
./llama-server -m ../mistral-7b.gguf --port 11434
```

---

## Sorun Giderme

### Ollama başlamıyor
```bash
# Servis durumunu kontrol et
ollama serve

# Port kullanımda mı?
netstat -ano | findstr :11434
```

### Model indirme yavaş
```bash
# Ollama'nın kullandığı mirror'ı değiştir
set OLLAMA_HOST=https://ollama.ai
ollama pull mistral
```

### GPU kullanılmıyor
```bash
# CUDA versiyonunu kontrol et
nvidia-smi

# Ollama GPU kullanımını kontrol et
ollama run mistral
# Çıktıda "Using GPU" yazmalı
```

---

## Model Bilgileri

| Özellik | Değer |
|---------|-------|
| Model | Mistral 7B Instruct v0.2 |
| Boyut | ~4GB (quantized) |
| Context | 8192 tokens |
| Dil | Türkçe dahil çok dilli |
| Lisans | Apache 2.0 |

---

## Alternatif Modeller

Daha hafif alternatifler:

```bash
# Mistral 7B Q4 (daha küçük)
ollama pull mistral:7b-instruct-q4_0

# Llama 3 8B (alternatif)
ollama pull llama3

# Phi-2 (çok hafif, CPU için)
ollama pull phi
```

---

## Performans İpuçları

### GPU Kullanımı
```bash
# NVIDIA GPU varsa otomatik kullanılır
# AMD GPU için ROCm gerekir
```

### RAM Gereksinimleri
- Minimum: 8GB RAM
- Önerilen: 16GB+ RAM
- Q4 quantized: ~4GB RAM
- Full FP16: ~14GB RAM

### CPU-Only Mod
```bash
# Ollama CPU kullanımı
set OLLAMA_NUM_GPU=0
ollama run mistral
```

---

## ChatBot Entegrasyonu

DocDataApp'te Mistral kullanımı:

1. ✅ Ollama çalışıyor olmalı (`http://localhost:11434`)
2. ✅ Model indirilmiş olmalı (`ollama list`)
3. ✅ `.env` dosyasında:
   ```
   MISTRAL_SERVER_URL=http://127.0.0.1:11434
   ```

Hazırsınız! 🚀

