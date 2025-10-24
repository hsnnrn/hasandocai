# 🔐 GitHub Secrets Kurulum Kılavuzu

Bu kılavuz, DocDataApp için GitHub Actions workflow'larında kullanılacak secret'ların nasıl kurulacağını açıklar.

## 📋 Gerekli Secrets

### 1. GITHUB_TOKEN
- **Açıklama**: GitHub API erişimi için
- **Varsayılan**: Otomatik olarak sağlanır
- **Kurulum**: Gerekli değil, GitHub otomatik sağlar

### 2. CSC_LINK (Opsiyonel - macOS Code Signing)
- **Açıklama**: macOS uygulama imzalama sertifikası
- **Format**: Base64 encoded .p12 file
- **Kurulum**:
```bash
# Sertifikayı base64'e çevirin
base64 -i certificate.p12 -o certificate-base64.txt
# certificate-base64.txt içeriğini CSC_LINK secret'ına ekleyin
```

### 3. CSC_KEY_PASSWORD (Opsiyonel - macOS Code Signing)
- **Açıklama**: macOS sertifika şifresi
- **Format**: Plain text
- **Kurulum**: Sertifika oluştururken belirlediğiniz şifreyi girin

### 4. APPLE_ID (Opsiyonel - macOS Notarization)
- **Açıklama**: Apple Developer hesap email'i
- **Format**: email@example.com
- **Kurulum**: Apple Developer hesabınızın email adresini girin

### 5. APPLE_PASSWORD (Opsiyonel - macOS Notarization)
- **Açıklama**: Apple Developer hesap şifresi
- **Format**: Plain text
- **Not**: App-specific password kullanmanız önerilir

### 6. APPLE_TEAM_ID (Opsiyonel - macOS Notarization)
- **Açıklama**: Apple Developer Team ID
- **Format**: 10 karakter alfanumerik
- **Kurulum**: Apple Developer hesabınızdan Team ID'yi alın

## 🛠️ Secret Kurulum Adımları

### 1. GitHub Repository'ye Git
1. [Docdataapp Repository](https://github.com/turkishdeepkebab/Docdataapp) sayfasına gidin
2. **Settings** sekmesine tıklayın
3. Sol menüden **Secrets and variables** > **Actions** seçin

### 2. Secret Ekleme
1. **New repository secret** butonuna tıklayın
2. **Name** alanına secret adını girin (örn: `CSC_LINK`)
3. **Secret** alanına değeri girin
4. **Add secret** butonuna tıklayın

### 3. Secret Listesi
Kurulum sonrası aşağıdaki secret'larınız olmalı:

```
✅ GITHUB_TOKEN (otomatik)
🔐 CSC_LINK (opsiyonel)
🔐 CSC_KEY_PASSWORD (opsiyonel)
🔐 APPLE_ID (opsiyonel)
🔐 APPLE_PASSWORD (opsiyonel)
🔐 APPLE_TEAM_ID (opsiyonel)
```

## 🍎 macOS Code Signing Kurulumu

### 1. Apple Developer Hesabı
1. [Apple Developer](https://developer.apple.com) sayfasına gidin
2. Hesabınızla giriş yapın
3. **Certificates, Identifiers & Profiles** bölümüne gidin

### 2. Sertifika Oluşturma
1. **Certificates** > **+** butonuna tıklayın
2. **Developer ID Application** seçin
3. CSR (Certificate Signing Request) oluşturun
4. Sertifikayı indirin (.cer formatında)

### 3. P12 Sertifikası Oluşturma
1. Keychain Access'i açın
2. İndirilen sertifikayı çift tıklayın
3. Private key ile eşleştirin
4. Sertifikayı seçin ve **Export** edin
5. Format olarak **Personal Information Exchange (.p12)** seçin
6. Şifre belirleyin ve kaydedin

### 4. GitHub Secret'a Ekleme
```bash
# P12 dosyasını base64'e çevirin
base64 -i certificate.p12 -o certificate-base64.txt

# certificate-base64.txt içeriğini CSC_LINK secret'ına ekleyin
# Şifreyi CSC_KEY_PASSWORD secret'ına ekleyin
```

## 🔒 Güvenlik Best Practices

### 1. Secret Yönetimi
- Secret'ları düzenli olarak rotasyon yapın
- Eski secret'ları silin
- Sadece gerekli secret'ları ekleyin

### 2. Access Control
- Repository'ye erişimi sınırlayın
- Sadece güvenilir kişilere admin erişimi verin
- Branch protection rules kullanın

### 3. Monitoring
- GitHub Actions loglarını düzenli kontrol edin
- Failed workflow'ları takip edin
- Secret kullanımını monitor edin

## 🚨 Sorun Giderme

### Secret Bulunamıyor Hatası
```
Error: Secret 'CSC_LINK' not found
```
**Çözüm**:
1. Secret adının doğru yazıldığından emin olun
2. Repository Settings > Secrets sayfasından kontrol edin
3. Secret'ın eklenmiş olduğundan emin olun

### macOS Code Signing Hatası
```
Error: Code signing failed
```
**Çözüm**:
1. CSC_LINK secret'ının doğru base64 formatında olduğundan emin olun
2. CSC_KEY_PASSWORD'ün doğru olduğundan emin olun
3. Sertifikanın geçerli olduğundan emin olun

### Apple Notarization Hatası
```
Error: Notarization failed
```
**Çözüm**:
1. APPLE_ID ve APPLE_PASSWORD'ün doğru olduğundan emin olun
2. APPLE_TEAM_ID'nin doğru olduğundan emin olun
3. Apple Developer hesabınızın aktif olduğundan emin olun

## 📞 Destek

### GitHub Secrets Desteği
- [GitHub Docs - Encrypted secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Community](https://github.community/)

### Apple Developer Desteği
- [Apple Developer Support](https://developer.apple.com/support/)
- [Apple Developer Forums](https://developer.apple.com/forums/)

### DocDataApp Desteği
- [GitHub Issues](https://github.com/turkishdeepkebab/Docdataapp/issues)
- [GitHub Discussions](https://github.com/turkishdeepkebab/Docdataapp/discussions)

---

**Not**: Secret'lar hassas bilgilerdir. Bu bilgileri kimseyle paylaşmayın ve güvenli bir şekilde saklayın.
