# 🤖 AI Chatbot - localStorage Belge Analizi Rehberi

## 📋 Genel Bakış

DocDataApp'teki AI Chatbot artık **localStorage'daki belgelerinizi** analiz edebilir ve bu bilgilere göre akıllı yanıtlar verir. Bu özellik sayesinde:

- ✅ Yüklediğiniz belgeler anında erişilebilir
- ✅ Belgelerdeki veriler hızlıca aranır ve analiz edilir
- ✅ Doğal Türkçe sohbet deneyimi
- ✅ Sayısal değerler otomatik hesaplanır
- ✅ Kaynak gösterimi ve güvenilirlik puanı

## 🎯 İki Mod

### 1. **Basit Sohbet Modu** 💬
Genel AI asistanı gibi davranır. Belgelerle ilgili olmayan sorular sorun.

**Örnek Sorular:**
- "Python'da liste nasıl oluşturulur?"
- "Bugün hava nasıl?"
- "Bir e-posta taslağı yaz"

### 2. **Doküman Asistanı Modu** 📄
localStorage'daki belgelerinizi analiz eder ve akıllı yanıtlar verir.

**Örnek Sorular:**
- "Hangi belgeler var?"
- "Employee Sample Data dosyasında kaç kişi var?"
- "Excel dosyalarındaki toplam maaş nedir?"
- "PDF'lerdeki ana başlıkları listele"

## 🚀 Nasıl Kullanılır?

### Adım 1: Belgeleri Yükleyin
1. DocDataApp'te bir belge yükleyin (PDF, Excel, Word, vb.)
2. Belge işlendikten sonra otomatik olarak localStorage'a kaydedilir
3. Belgeler persistent storage'da saklanır (PC yeniden başlatılsa bile kaybolmaz)

### Adım 2: Chatbot'u Açın
1. Uygulamada **AI Chat** sayfasına gidin
2. Varsayılan olarak "Basit Sohbet" modunda açılır

### Adım 3: Doküman Asistanı Moduna Geçin
1. Üstteki **"Doküman Asistanı"** butonuna tıklayın
2. Belgeler otomatik olarak yüklenir
3. Yüklenen belge sayısı ve metin bölümü sayısı gösterilir

### Adım 4: Soru Sorun!
Belgeleriniz hakkında doğal Türkçe sorular sorun. AI otomatik olarak:
- İlgili belgeleri bulur
- Metinleri tarar
- Sayısal değerleri çıkarır
- İstatistikler hesaplar
- Doğal Türkçe cevap oluşturur

## 💡 Örnek Senaryolar

### Senaryo 1: Personel Verileri Analizi
```
Kullanıcı: "Employee Sample Data dosyasında kaç çalışan var?"

AI: "Employee Sample Data.xlsx dosyasında toplam 42 çalışan bulunmaktadır.

📚 Kaynaklar:
1. Employee Sample Data.xlsx (İlgililik: 95%)

💡 İstatistikler: 42 değer bulundu"
```

### Senaryo 2: Fatura Toplamı
```
Kullanıcı: "Tüm Excel dosyalarındaki toplam tutar nedir?"

AI: "Excel dosyalarınızda bulunan toplam tutar 125.450,75 TL'dir.

📚 Kaynaklar:
1. Faturalar_2024.xlsx (İlgililik: 92%)
2. Giderler.xlsx (İlgililik: 88%)

💡 İstatistikler: 15 değer, Toplam: 125,451"
```

### Senaryo 3: Genel Belge Listesi
```
Kullanıcı: "Hangi belgeler yüklü?"

AI: "Sistemde şu belgeler bulunmaktadır:

1. Employee Sample Data.xlsx (Excel)
2. Faturalar_2024.xlsx (Excel)
3. Rapor_Q1.pdf (PDF)
4. Sunum.pptx (PowerPoint)

Toplam 4 belge, 87 metin bölümü."
```

## 🔧 Sistem Detayları

### Belge Formatı (LOCAL_DOCS)
Belgeler şu yapıda saklanır:

```json
{
  "documentId": "excel_1760012637231_ngksluw29",
  "title": "Employee Sample Data",
  "filename": "Employee Sample Data.xlsx",
  "fileType": "Excel",
  "textSections": [
    {
      "id": "excel_1760012637146_0_0_0",
      "content": "EEID, Full Name, Job Title, Department...",
      "contentLength": 4000
    }
  ]
}
```

### Arama ve Eşleştirme
AI belgelerinizde şu sırayla arama yapar:

1. **Tam Eşleşme (Exact Match)**: Anahtar kelime tam olarak geçiyor mu?
2. **Kısmi Eşleşme (Partial Match)**: Kelimeler kısmen eşleşiyor mu?
3. **N-gram Eşleştirme**: 3'lü kelime grupları benziyor mu?
4. **Semantik Benzerlik**: Anlam olarak benzer mi?

Her eşleşmeye bir **ilgililik puanı (0.0-1.0)** verilir. Sadece 0.4'ün üzerindeki sonuçlar gösterilir.

### Sayısal Değer Çıkarımı
AI otomatik olarak şunları tanır:

- **Para birimleri**: ₺, $, €, £, TL, TRY, USD, EUR
- **Türkçe format**: 1.234,56 TL
- **İngilizce format**: 1,234.56 USD
- **Hesaplamalar**: Toplam, ortalama, medyan, min, max

### Optimizasyonlar

**Hız:**
- Sadece ilgili metin bölümleri işlenir
- En fazla 5 referans gösterilir (varsayılan)
- Metin bölümleri 2000 karakterle sınırlıdır
- Embedding önbellekleme (future)

**Doğruluk:**
- Düşük temperature (0.15) ile deterministik yanıtlar
- Kaynak gösterimi ile doğrulanabilirlik
- İlgililik puanı ile güvenilirlik
- Anomali tespiti (çelişkiler işaretlenir)

## ⚙️ Ayarlar ve Yapılandırma

### Ortam Değişkenleri (.env)
```bash
# AI Model (DeepSeek-R1 8B önerilir)
LLAMA_MODEL=deepseek-r1:8b-0528-qwen3-q4_K_M

# Ollama Server
LLAMA_SERVER_URL=http://127.0.0.1:11434

# BGE-M3 Embedding Server
MODEL_SERVER_URL=http://127.0.0.1:7860
```

### Chatbot Seçenekleri
Document Assistant modunda şu seçenekler otomatik ayarlanır:

```typescript
{
  compute: true,        // Sayısal hesaplamalar yap
  showRaw: false,       // Ham değerleri gösterme
  maxRefs: 5,          // En fazla 5 kaynak göster
  locale: 'tr-TR'      // Türkçe yerel ayarlar
}
```

## 🛠️ Sorun Giderme

### "Henüz belge yok" Hatası
**Çözüm:**
1. Önce bir belge yükleyin (PDF, Excel, vb.)
2. Belgenin işlenmesini bekleyin
3. Chatbot'u yeniden açın veya "Doküman Asistanı" moduna geçin

### "AI sunucusuna bağlanılamadı" Hatası
**Çözüm:**
1. Ollama'nın çalıştığından emin olun:
   ```bash
   ollama serve
   ```
2. Modeli yükleyin:
   ```bash
   ollama pull deepseek-r1:8b-0528-qwen3-q4_K_M
   ```
3. Uygulamayı yeniden başlatın

### Yavaş Yanıtlar
**Optimizasyonlar:**
1. **GPU Kullanımı**: Settings > GPU Hızlandırma (açık)
2. **Daha Küçük Model**: DeepSeek-R1 8B yerine Llama 3.2:3B
3. **Az Belge**: Sadece gerekli belgeleri yükleyin
4. **Kısa Sorular**: Uzun sorular yerine kısa ve öz sorun

### Yanlış Yanıtlar
**İpuçları:**
1. **Daha Spesifik Sorular**: "Excel dosyası" yerine "Employee Sample Data"
2. **Anahtar Kelimeler**: Belge adını veya özel terimleri kullanın
3. **Doğrulama**: Kaynak referanslarını kontrol edin
4. **Farklı Soru**: Soruyu başka şekilde sorun

## 📊 Performans İpuçları

### Belge Yönetimi
- ✅ **Düzenli Temizlik**: Gereksiz belgeleri silin
- ✅ **İsimli Belgeler**: Belgelere açıklayıcı isimler verin
- ✅ **Yapılandırılmış Veri**: Excel, CSV gibi yapılandırılmış formatlar kullanın
- ✅ **Küçük Belgeler**: Büyük PDF'leri bölümlere ayırın

### Soru Teknikleri
- ✅ **Kısa ve Öz**: "Toplam maaş?" yerine "Toplam maaş nedir?"
- ✅ **Belge Adı**: "Employee dosyasında..." diye başlayın
- ✅ **Spesifik Sorular**: "Kaç tane?" yerine "Kaç çalışan var?"
- ✅ **Tek Soruda Tek Şey**: Birden fazla soru ayrı sorun

## 🎓 İleri Seviye Kullanım

### Çoklu Belge Analizi
```
"Tüm Excel dosyalarındaki departman dağılımını göster"
"PDF ve Word dosyalarındaki toplam sayfa sayısı"
```

### Karşılaştırmalı Analiz
```
"2023 ve 2024 fatura toplamlarını karşılaştır"
"Hangi departmanda daha fazla çalışan var?"
```

### İstatistiksel Sorular
```
"Ortalama maaş nedir?"
"En yüksek fatura tutarı kaç?"
"Medyan değer nedir?"
```

### Metin Arama
```
"Hangi belgelerde 'proje' kelimesi geçiyor?"
"'Q1 2024' içeren dokümanları bul"
```

## 🔒 Güvenlik ve Gizlilik

- ✅ **100% Yerel**: Tüm işlemler bilgisayarınızda yapılır
- ✅ **Veri Transferi Yok**: Belgeleriniz internete gönderilmez
- ✅ **Persistent Storage**: Veriler güvenli şekilde diske kaydedilir
- ✅ **Şifreleme Yok**: Maksimum hız için şifreleme kapalı (yerel kullanım)

## 📞 Destek

Sorun yaşarsanız:
1. **Logları kontrol edin**: Developer Tools (F12) > Console
2. **README'yi okuyun**: Proje kökündeki README-chatbot.md
3. **GitHub Issues**: Hata bildirin veya soru sorun

## 🎉 Sonuç

DocDataApp AI Chatbot, localStorage'daki belgelerinizi anlayan, analiz eden ve Türkçe olarak doğal bir şekilde yanıt veren akıllı bir asistanıdır. 

**Başlamak için:**
1. Belge yükleyin
2. "Doküman Asistanı" moduna geçin
3. Soru sorun ve belgelerin gücünün tadını çıkarın!

---

**Built with ❤️ for intelligent local document analysis**

