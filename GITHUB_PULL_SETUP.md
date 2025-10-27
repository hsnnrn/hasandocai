# 🚀 GitHub'dan Pull Yapma Rehberi

Bu rehber, Supabase keylerinin artık kodda yerleşik olarak saklandığı yeni yapıyı açıklar.

## 🔐 Yerleşik Keyler

Supabase OAuth keyleri artık `src/main/main.ts` dosyasında yerleşik olarak saklanıyor:

```typescript
const BUILT_IN_SUPABASE_OAUTH_CLIENT_ID = '16f8e0d2-e9c6-4b8a-896d-2b687551ad0a';
const BUILT_IN_SUPABASE_OAUTH_CLIENT_SECRET = 'sba_867174f18feedf9b919abb112665d0438820e161';
```

## 📥 Farklı Cihazda Kurulum

### 1. Repository'yi Clone Edin
```bash
git clone https://github.com/hsnnrn/hasandocai.git
cd hasandocai
```

### 2. Branch'e Geçin
```bash
git checkout main
# veya hangi branch'te çalışıyorsanız
git checkout feature/mistral-chatbot-deep
```

### 3. Son Değişiklikleri Çekin
```bash
git pull origin main
```

### 4. Bağımlılıkları Yükleyin
```bash
npm install
```

### 5. Environment Dosyasını Oluşturun
```bash
# Windows PowerShell
Copy-Item config.private.env .env

# Windows CMD
copy config.private.env .env

# Linux/Mac
cp config.private.env .env
```

### 6. Uygulamayı Başlatın
```bash
npm run dev
```

## ✅ Avantajlar

1. **Otomatik Key Yükleme**: Supabase OAuth keyleri artık kodda yerleşik
2. **GitHub Pull Uyumlu**: Farklı cihazlarda pull yaptığınızda keyler otomatik gelir
3. **Fallback Sistemi**: Eğer .env dosyasında farklı keyler varsa onları kullanır
4. **Güvenlik**: Keyler private repository'de saklanıyor

## 🔧 Özelleştirme

Eğer farklı Supabase keyleri kullanmak istiyorsanız:

1. `.env` dosyasında keylerinizi tanımlayın:
```env
SUPABASE_OAUTH_CLIENT_ID=your_custom_client_id
SUPABASE_OAUTH_CLIENT_SECRET=your_custom_client_secret
```

2. Uygulama önce .env dosyasındaki değerleri kontrol eder, yoksa yerleşik keyleri kullanır.

## 🚨 Önemli Notlar

- Repository **MUTLAKA PRIVATE** olmalı
- Asla public yapmayın!
- Keyler kodda görünür olduğu için sadece güvenilir kişilerle paylaşın
- Production ortamında farklı keyler kullanmanız önerilir

## 🐛 Sorun Giderme

### Keyler Yüklenmiyor
```bash
# Environment dosyasının varlığını kontrol edin
ls -la .env

# Eğer yoksa oluşturun
cp config.private.env .env
```

### Uygulama Başlamıyor
```bash
# Bağımlılıkları yeniden yükleyin
rm -rf node_modules package-lock.json
npm install

# Uygulamayı başlatın
npm run dev
```

### Supabase Bağlantı Hatası
1. Keylerin doğru yüklendiğini kontrol edin
2. Supabase projenizin aktif olduğundan emin olun
3. OAuth redirect URI'larını kontrol edin

## 📞 Destek

Herhangi bir sorun yaşarsanız:
1. Console loglarını kontrol edin
2. `src/main/main.ts` dosyasındaki keylerin doğru olduğunu doğrulayın
3. Supabase Dashboard'da OAuth ayarlarını kontrol edin
