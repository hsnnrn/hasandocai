# Supabase Setup Guide

Bu uygulama Supabase authentication kullanmaktadır. Gerçek Supabase authentication'ı kullanmak için aşağıdaki adımları takip edin:

## 1. Supabase Projesi Oluşturma

1. [Supabase](https://supabase.com) web sitesine gidin
2. "Start your project" butonuna tıklayın
3. GitHub ile giriş yapın veya email ile kayıt olun
4. Yeni bir proje oluşturun

## 2. Supabase Konfigürasyonu

1. Supabase dashboard'unuzda projenizi seçin
2. Sol menüden "Settings" > "API" seçin
3. Aşağıdaki bilgileri kopyalayın:
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 3. Uygulama Konfigürasyonu

`src/renderer/src/lib/supabase.ts` dosyasını açın ve aşağıdaki değerleri güncelleyin:

```typescript
const supabaseUrl = 'https://your-project-ref.supabase.co'  // Projenizin URL'si
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  // Anon key'iniz
```

## 4. Authentication Ayarları

Supabase dashboard'da:
1. "Authentication" > "Settings" bölümüne gidin
2. "Site URL" kısmına `http://localhost:3000` ekleyin (development için)
3. "Redirect URLs" kısmına `http://localhost:3000/**` ekleyin

## 5. Test Kullanıcısı Oluşturma

1. Supabase dashboard'da "Authentication" > "Users" bölümüne gidin
2. "Add user" butonuna tıklayın
3. Email ve password ile yeni bir kullanıcı oluşturun

## 6. Uygulamayı Test Etme

1. Uygulamayı çalıştırın: `npm run dev`
2. Sidebar'dan "Integrations" > "Supabase" butonuna tıklayın
3. Oluşturduğunuz test kullanıcısı ile giriş yapın

## Notlar

- Development sırasında `http://localhost:3000` URL'sini kullanın
- Production için gerçek domain'inizi Supabase ayarlarına ekleyin
- Supabase'in ücretsiz planı yeterli olacaktır

## Sorun Giderme

Eğer authentication çalışmıyorsa:
1. Supabase URL ve key'inin doğru olduğundan emin olun
2. Browser console'da hata mesajlarını kontrol edin
3. Supabase dashboard'da authentication loglarını kontrol edin
