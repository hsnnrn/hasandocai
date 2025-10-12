# 🔐 Supabase Konfigürasyon Yedekleme ve Geri Yükleme Rehberi

Bu rehber, Supabase konfigürasyonlarınızı güvenli bir şekilde yedeklemenizi ve başka bir cihazda geri yüklemenizi sağlar.

## ⚠️ Önemli Güvenlik Uyarısı

**ASLA** aşağıdaki bilgileri public Git repository'sine eklemeyin:
- `SUPABASE_OAUTH_CLIENT_ID`
- `SUPABASE_OAUTH_CLIENT_SECRET`
- `SUPABASE_ANON_KEY`
- Access Token'lar
- API Key'ler

Bu bilgileri **private** bir şekilde saklamalısınız.

---

## 📋 Yedekleme Adımları

### 1. Lokal Yedekleme (Güvenli Yöntem)

Hassas bilgilerinizi lokal olarak `.env` dosyasında saklayın:

#### a) `.env` Dosyası Oluşturun

Proje root dizininde `.env` dosyası oluşturun ve aşağıdaki bilgileri doldurun:

```env
# Supabase OAuth Configuration
SUPABASE_OAUTH_CLIENT_ID=sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_OAUTH_CLIENT_SECRET=sbp-xyz-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Supabase Database Configuration
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OAuth Server Configuration
OAUTH_PORT=54321
REDIRECT_URI_LOCAL=http://localhost:54321/callback
REDIRECT_URI_CUSTOM=myapp://oauth/callback

# Keytar Service Configuration
SERVICE_NAME=DocDataApp

# Supabase Management API Base URL
SUPABASE_API_BASE_URL=https://api.supabase.com/v1

# OAuth Scopes
OAUTH_SCOPES=read:organizations,read:projects,read:api-keys,read:storage,read:functions

# AI Model Configuration
BGE_MODEL_SERVER_URL=http://127.0.0.1:5000
LLAMA_SERVER_URL=http://127.0.0.1:11434
LLAMA_MODEL=llama3.2:3b

# GPU Configuration
GPU_MODE=auto
OLLAMA_NUM_GPU=1
GPU_WARMUP=true
MAX_CONTEXT_LENGTH=15000
GPU_MEMORY_THRESHOLD=6000
GPU_AUTO_CLEANUP=true

# Deep Analysis Configuration
ENABLE_CRITIC=true
CRITIC_MODEL=llama
CRITIC_TIMEOUT=2000
DEEP_ANALYSIS_TIMEOUT=15000

# Vector Database Configuration
VECTOR_DB=local

# Development Mode
NODE_ENV=development
DEBUG_OAUTH=true
```

#### b) `.env` Dosyasını Güvenli Bir Yere Yedekleyin

`.env` dosyanızı şu yollardan biriyle yedekleyin:

**Seçenek 1: Güvenli Bulut Depolama**
- Google Drive (private folder)
- OneDrive (private folder)
- Dropbox (private folder)
- **ŞİFRELENMİŞ** USB bellek

**Seçenek 2: Şifreli Arşiv**
```bash
# 7-Zip ile şifreli arşiv oluşturun (Windows)
7z a -p -mhe=on supabase-config-backup.7z .env

# Veya WinRAR ile şifreli arşiv
```

**Seçenek 3: Password Manager**
- 1Password
- Bitwarden
- LastPass
Gibi bir password manager'da "Secure Note" olarak saklayın.

---

### 2. Git Repository Yedekleme (Private Repo için)

Eğer **tamamen private** bir repository kullanıyorsanız:

#### a) `.env` Dosyasını Git'e Ekleyin

⚠️ **SADECE PRIVATE REPO İÇİN!**

```bash
# .gitignore'dan .env satırını kaldırın veya yorum satırı yapın
# Ardından:
git add .env
git commit -m "chore: Add private environment configuration (PRIVATE REPO ONLY)"
git push origin feature/mistral-chatbot-deep
```

#### b) Repository'yi Private Yapın

GitHub'da:
1. Repository Settings > General
2. "Danger Zone" bölümünde
3. "Change repository visibility" > "Make private"

---

## 🔄 Geri Yükleme Adımları (Başka Cihazda)

### 1. Repository'yi Clone Edin

```bash
cd C:\Users\YourUsername\Desktop
git clone https://github.com/hsnnrn/hasandocai.git DocDataApp
cd DocDataApp
```

### 2. Branch'i Checkout Edin

```bash
git checkout feature/mistral-chatbot-deep
```

### 3. `.env` Dosyasını Geri Yükleyin

#### Seçenek A: Eğer `.env` Git'te varsa
```bash
# Zaten gelmiş olmalı
```

#### Seçenek B: Yedekten Geri Yükleyin
1. Güvenli konumdan (Google Drive, USB, vb.) `.env` dosyasını kopyalayın
2. Proje root dizinine yapıştırın:
   ```
   C:\Users\YourUsername\Desktop\DocDataApp\.env
   ```

#### Seçenek C: Manuel Oluşturun
```bash
# env.example'ı kopyalayın
copy env.example .env

# Ardından .env dosyasını düzenleyin ve değerleri girin
```

### 4. Node Modules Yükleyin

```bash
npm install
```

### 5. Supabase SQL Schema'larını Uygulayın

```bash
# sql/HIZLI_KURULUM.md dosyasındaki adımları takip edin
```

Önemli SQL dosyaları:
- `sql/unified_document_analysis_schema.sql` - Ana schema
- `sql/group_analysis_supabase_schema.sql` - Grup analizi schema

### 6. Python Model Server'ı Kurun (Opsiyonel)

```bash
cd model_server
pip install -r requirements.txt
python app.py
```

### 7. Uygulamayı Çalıştırın

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

---

## 🔍 Konfigürasyonları Doğrulama

### `.env` Dosyası Kontrolü

```bash
# Windows'ta .env dosyasının varlığını kontrol edin
dir .env

# İçeriğini görüntüleyin (dikkatli olun!)
type .env
```

### Uygulama İçi Kontrol

1. Uygulamayı başlatın
2. Login sayfasına gidin
3. "Supabase ile Giriş Yap" butonuna tıklayın
4. OAuth flow başarıyla çalışıyorsa ✅

---

## 📦 Taşınabilir Yedekleme Paketi

Tüm konfigürasyonları tek bir pakette tutmak için:

### Oluşturma

```bash
# Bir backup klasörü oluşturun
mkdir supabase-backup

# Önemli dosyaları kopyalayın
copy .env supabase-backup\.env
copy env.example supabase-backup\env.example
copy package.json supabase-backup\package.json
copy SETUP_INSTRUCTIONS.md supabase-backup\
copy sql\HIZLI_KURULUM.md supabase-backup\

# Şifreli arşiv oluşturun
7z a -p -mhe=on supabase-complete-backup.7z supabase-backup\
```

### Geri Yükleme

```bash
# Arşivi açın (şifre girin)
7z x supabase-complete-backup.7z

# .env dosyasını kopyalayın
copy supabase-backup\.env .env
```

---

## 🔐 En İyi Güvenlik Pratikleri

1. **Hiçbir Zaman**:
   - Hassas bilgileri public repo'ya pushlayın
   - `.env` dosyasını screenshot olarak paylaşın
   - Discord/Slack gibi platformlarda paylaşın

2. **Her Zaman**:
   - `.env` dosyasını `.gitignore`'da tutun (public repo için)
   - Güçlü şifreler kullanın
   - 2FA (Two-Factor Authentication) aktif edin
   - Düzenli olarak access token'ları yenileyin

3. **Önerilen**:
   - Private Git repository kullanın
   - Encrypted backup'lar oluşturun
   - Password manager kullanın

---

## 📞 Yardım

Eğer konfigürasyonlarınız kaybolursa:

1. **Supabase Dashboard** > Settings > API'den yeni key'ler oluşturabilirsiniz
2. **OAuth Credentials** > Yeni client secret oluşturabilirsiniz (eski secret artık çalışmaz)
3. `SETUP_INSTRUCTIONS.md` dosyasındaki adımları tekrar takip edin

---

## 🎯 Hızlı Başlangıç Kontrol Listesi

Yeni cihazda kurulum için:

- [ ] Repository'yi clone et
- [ ] Branch'i checkout et (`feature/mistral-chatbot-deep`)
- [ ] `.env` dosyasını geri yükle
- [ ] `npm install` çalıştır
- [ ] SQL schema'larını Supabase'e yükle
- [ ] `npm run dev` ile test et
- [ ] Login işlevselliğini doğrula
- [ ] Grup analizi özelliğini test et

✅ Tamamlandı! Artık projeniz başka bir cihazda çalışır durumda.

---

## 📚 İlgili Dosyalar

- `env.example` - Tüm environment variables şablonu
- `SETUP_INSTRUCTIONS.md` - Detaylı kurulum talimatları
- `sql/HIZLI_KURULUM.md` - Supabase SQL kurulum rehberi
- `GROUP_ANALYSIS_SUPABASE_GUIDE.md` - Supabase entegrasyonu rehberi

---

**Son Güncelleme**: 12 Ekim 2025
**Proje**: DocDataApp
**Repository**: https://github.com/hsnnrn/hasandocai

