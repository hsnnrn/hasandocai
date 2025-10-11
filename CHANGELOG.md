# Changelog

## [Unreleased]

### Added - AI Chatbot localStorage Integration 🤖📄
- **Document Assistant Mode**: AI chatbot artık localStorage'daki belgeleri analiz edebilir
- **LOCAL_DOCS Format Converter**: PersistentLocalStorage verilerini LOCAL_DOCS formatına dönüştürme
- **IPC Handler - get-local-docs**: Belgeleri chatbot formatında getiren yeni API endpoint
- **Dual Chat Modes**: Basit Sohbet ve Doküman Asistanı modları arasında geçiş
- **Document Status UI**: Yüklenen belge sayısı ve metin bölümü sayısı göstergesi
- **Smart Document Retrieval**: Keyword, partial, n-gram ve semantic matching ile hızlı arama
- **Reference Display**: Kaynak gösterimi ve ilgililik puanı (relevance score)
- **Numeric Aggregation**: Otomatik sayısal değer çıkarımı ve hesaplama (toplam, ortalama, vb.)
- **Conversation Context**: Doküman asistanı modunda da konuşma geçmişi desteği
- **User Guide**: CHATBOT_LOCALSTORAGE_GUIDE.md ile kapsamlı kullanım rehberi

### Added - GPU & Performance
- **GPU/CPU Toggle Switch**: Settings sayfasına GPU ve CPU arasında geçiş yapabilme özelliği eklendi
- **AI Performance Settings**: GPU hızlandırma, GPU warmup ve context length ayarları
- **GPU Status Monitor**: Gerçek zamanlı GPU durumu ve bellek kullanımı izleme
- **GPU Memory Auto-Cleanup**: GPU belleği dolduğunda otomatik temizleme sistemi
- **Manual GPU Cleanup**: Settings sayfasında tek tıkla GPU belleği temizleme butonu
- **GPU Helper Utilities**: GPU kontrolü, bellek monitörü ve optimizasyon önerileri
- **Gemma2 2B Integration**: Hızlı ve hafif inference için optimize edilmiş 2B model
- **GPU Batch Files**: `start_ollama_gpu.bat` - GPU otomatik algılama ile Ollama başlatma
- **GPU Documentation**: README-chatbot.md'ye kapsamlı GPU optimizasyon ve bellek yönetimi rehberi

### Changed
- **ChatBot Component**: Tamamen yeniden yazıldı - mod geçişi, belge yükleme, metadata gösterimi
- **Document Retrieval**: retrieveRelevantSections ile optimize edilmiş belge arama
- **Error Messages**: Daha açıklayıcı hata mesajları ve çözüm önerileri
- **Gemma2 System Prompt**: TDK kurallarına uygun, öz ve profesyonel Türkçe yanıtlar için optimize edildi
- **Temperature Settings**: 0.7'den 0.25'e düşürüldü (doğruluk odaklı)
- **Repeat Penalty**: 1.1 eklendi (tekrarlayan yanıtları önlemek için)
- **App Store**: AI ayarları için yeni state yönetimi eklendi

### Performance
- **Document Loading**: localStorage'dan belge yükleme < 100ms
- **Local Retrieval**: Belge araması ve eşleştirme < 200ms (embedding olmadan)
- **Token Optimization**: Sadece ilgili metin bölümleri gönderilir (max 5 referans)
- **GPU Mode**: İlk yanıt süresi ~5-8s'den ~2-3s'ye düştü
- **GPU Warmup**: İlk yanıt süresi ~0.3s'ye kadar indi
- **Context Length**: Kullanıcı tanımlı (4000-32000 karakter arası)
- **Auto GPU Cleanup**: Bellek eşiği aşıldığında otomatik model unload (~5-6GB serbest bırakır)

### Fixed
- **Conversation History**: ChatBot'ta conversation history artık doğru şekilde gönderiliyor
- **Switch Component**: Import path düzeltildi (`@/utils/cn`)
- **TypeScript Errors**: `anonKey` type hatası giderildi

### Developer Experience
- **Type Safety**: documentRetriever.ts ile tam TypeScript desteği
- **Comprehensive Logging**: Her aşamada detaylı console.log çıktıları
- **Error Handling**: Try-catch blokları ve anlamlı error messages
- **Code Documentation**: Tüm fonksiyonlarda JSDoc comments

## [1.0.0] - 2025-01-09

### Added
- Llama 3.2:3b AI Chatbot entegrasyonu
- Local BGE-M3 embedding servisi
- Supabase OAuth entegrasyonu
- PDF, DOCX, Excel, PowerPoint analiz servisleri
- Grup analiz özellikleri
- Local storage migrator

### Features
- Deterministic numeric extraction
- Backend aggregation (sum, avg, median)
- Dual vector DB support (Supabase pgvector / Qdrant)
- Fallback mode (template-based responses)
- Turkish locale support

---

**Built with ❤️ for accurate, local-first AI document analysis**
