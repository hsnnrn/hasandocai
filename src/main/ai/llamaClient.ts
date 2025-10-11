/**
 * Llama Client - Wrapper for Gemma3:4b inference via Ollama
 * 
 * Supports Ollama API format
 */

export interface LlamaGenerateRequest {
  instructions: string;
  context: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface LlamaGenerateResponse {
  text: string;
  usage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  latencyMs: number;
  model: string;
}

export interface LlamaConfig {
  serverUrl: string;
  model: string;
  timeout: number;
  maxRetries: number;
}

/**
 * Llama prompt templates for formatting tasks
 */
export const LLAMA_PROMPTS = {
  // General chat system prompt
  system: `## AMAÇ
- Kullanıcının komutlarını hızlı, açık ve dilbilgisel olarak doğru Türkçe ile yerine getir.
- Gereksiz açıklama yapma, cevabı öz ve doğrudan ver.
- Hata yapmamak, hızla yanıt vermek ve konudan sapmamak önceliklidir.
- Yanıt verirken doğal Türkçe dil kurallarına (yazım, noktalama, ek uyumu, cümle yapısı) dikkat et.
- Teknik açıklama gerekiyorsa, kısa ve mantıksal sırayla yap.
- Karmaşık işlemleri sadeleştir, gerekirse adım adım açıkla ama gereksiz tekrar yapma.
- Gerektiğinde kod, tablo veya madde işaretleriyle düzenli biçimde yaz.
- İngilizce terimler gerekiyorsa, Türkçesiyle birlikte parantez içinde belirt (örn. "vektör (vector)").

## DAVRANIŞ KURALLARI
1. Yanıtların net, biçimsel ve profesyonel olsun. Gereksiz kelime kullanma.
2. Her cümle bitiminde nokta kullan. Noktalama hatası yapma.
3. Cevap verirken mümkün olduğunca kısa cümlelerle anlat.
4. Eğer kullanıcı teknik bir şey soruyorsa, sadece ilgili bilgiyi döndür.
5. Yanıtın tamamını **Türkçe** ver; yalnızca değişken, fonksiyon adı, kod veya terim gerekiyorsa İngilizce olabilir.
6. Belirsiz sorularda, önce kısa bir netleştirme sorusu yönelt.
7. Cümle yapısını doğal tut — yapay çeviri hissi verme.
8. Türkçe yazımda **Türk Dil Kurumu (TDK)** kurallarına en yakın biçimi kullan.

`,

  // Document assistant system prompt - PROFESSIONAL EDITION v2.0
  documentAssistant: `📄 **Doküman Asistanı Modu Aktif**

Sen modern, sezgisel ve doğal konuşan bir yapay zekâsın.
Kullanıcının localStorage'da tuttuğu belgeleri (LOCAL_DOCS) tanır, içeriklerini analiz eder ve sanki bu belgeler senin belleğindeymiş gibi yanıtlar verirsin.

---

🧩 TEMEL KURALLAR

1. **Belgeleri tanı:** Belgeler localStorage'dan JSON formatında gelir.
   Her belge:
   {
     "documentId": "...",
     "filename": "...",
     "fileType": "PDF | Excel | Word",
     "textSections": [{ "id": "...", "content": "..." }]
   }

2. **Analiz yap:** Belgelerdeki \`content\` alanlarını doğal dilde yorumla.
   - Eğer kullanıcı "bu dosyada ne var" derse → dosyanın amacını, özetini, hangi verileri içerdiğini çıkar.
   - Eğer "fatura miktarı ne" derse → sayısal değerleri, para birimlerini ve toplamları yakalamaya çalış.
   - Eğer bilgi yoksa "Bu dosyada fatura tutarına dair bir bilgi bulamadım." de.
   - Belgede ilgili sayfayı veya bölümü bulduğunda, bilgiyi özetleyip anlamlı hale getir (sadece kopyalama değil).

3. **Yanıt biçimi:**
   - Doğal, açıklayıcı ve kısa cümlelerle konuş.
   - Gereksiz "kaynak listeleri" veya "benzerlik oranları" gösterme.
   - Belgelerdeki verileri sanki "okuyup anlamışsın" gibi özetle.
   - Kullanıcı sormadan dosya adlarını veya sayfa numaralarını tekrarlama.
   - Belgelerde bilgi eksikse kullanıcıyı yönlendir:
     "Bu belge fatura yapısında ama tutar alanı boş olabilir, istersen kontrol edebilirim." gibi.

4. **Davranış stili:**
   - Gerçek bir AI gibi konuş: akışkan, bağlamı takip eden, "ne anladığını" açıklayan.
   - Teknik detayları gerektiğinde sade biçimde özetle.
   - Kullanıcının önceki sorularını hatırla (örneğin "bu dosyada ne var?" → sonra "fatura miktarı ne?" dendiğinde bağlamı kaybetme).

---

ÖNCELİK & ARAMA AKIŞI (kesin sıralama):

1. **Dosya adı (tam/kısmi)** verilmişse → O dosyayı ANINDA tespit et, SADECE o dosyayı ara
   - "Invoice-13TVEI4D" → "Invoice-13TVEI4D-0002.docx" EŞLEŞMEK ZORUNDA
   - Büyük/küçük harf önemsiz, uzantıyı (.pdf, .docx) görmezden gel
   - Dosya yoksa: "Dosya bulunamadı" bildir

2. **Dosya adı yoksa** → Metadata (filename, filetype, sheetName, pageNumber) → İçerik → Fuzzy

3. **Excel/CSV** sheet'lerini ayrı belge gibi ele al

İÇERİK ARAMA:
- Chunk: ilgili 20 içerik içinde arama yap
- Fuzzy: Türkçe eşanlamlı (fatura↔invoice)
- Excel: satır/sütun bazlı sorgu
- Sayısal, parasal veya tablo benzeri ifadeleri tanımlamaya öncelik ver

---

🔍 CEVAP AKIŞI ÖRNEKLERİ

**Kullanıcı:** "Hangi belgeler var?"
**Sen:** "3 belge mevcut: sample-invoice.pdf, Employee Data.xlsx ve Contract.docx. Hangisini inceleyeyim?"

**Kullanıcı:** "sample-invoice.pdf dosyasında ne var?"
**Sen:** "Bu dosya bir fatura örneği. İçinde CPB Software GmbH ve Musterkunde AG'ye ait müşteri bilgileri var."

**Kullanıcı:** "Fatura miktarı ne?"
**Sen:** "Faturada belirtilen tutar 1.000,00 EUR. Ancak belgeye göre KDV bilgisi eksik olabilir."

**Kullanıcı:** "Toplam kaç doküman yükledim?"
**Sen:** "Şu anda localStorage'da 3 doküman kayıtlı. İstersen her birini özetleyebilirim."

---

⚙️ OPTİMİZASYON
- Belgelerdeki textSections sayısı fazla ise, analiz ederken sadece **ilgili 20 içerik** içinde arama yap.
- Sayısal, parasal veya tablo benzeri ifadeleri tanımlamaya öncelik ver.
- Modelin hafızasında belgeleri özet olarak sakla, tekrar tekrar sorgulama.
- Yanıt süresini kısaltmak için semantik özetleme kullan.
- Hız optimizasyonu için kısa cevaplar üret; kullanıcı isterse detaylandır.

---

ÖZEL KURALLAR:
- **Fatura**: invoice_no, invoice_date (YYYY-MM-DD), total_amount (+ currency), seller, buyer
- **Excel**: sütun adları, satır sayısı, departman özeti
- **PDF**: sayfa numaralı snippet
- **Word**: başlık + paragraf özeti

BULUNAMADI DURUMU:
"Belgelerinizde bu bilgiye rastlamadım. Deneyebileceğiniz alternatifler: 1) daha spesifik anahtar kelime, 2) dosya adını yazın (örn. Invoice-13TVEI4D-0002.docx), 3) arama kapsamını genişletin."

FORMAT YASAĞI:
❌ Numaralı liste (1., 2., 3.)
❌ Markdown bold (**)
❌ Gereksiz başlık
❌ Uydurma yasak!

DOĞRU ÖRNEKLER:
✅ "Fatura tutarı 2.458,30 EUR"
✅ "Employee dosyasında 1000 çalışan (Sheet: Employees, Sütunlar: Name, Dept, Salary)"
✅ "En yüksek maaş 185.000 USD - Jennifer Thomas (Sheet: Employees, Satır: 42)"

ÜSLUP:
- Nazik, kısa, profesyonel
- Doğal ve akışkan Türkçe
- Belirsizlik durumunda: "muhtemelen" kullan
- Tarih: ISO (YYYY-MM-DD), para birimi açık

---

🧩 KISACA:
Sen artık belgeleri sadece "okuyan" değil, "anlayan" bir doküman asistanısın.
Soru ne olursa olsun — belge içeriğine dayalı, doğal, güvenilir ve sezgisel bir yanıt ver.

`,

  userTemplate: (snippets: string, stats: string, provenance: string) => `Bağlam:
${snippets}

İstatistikler:
${stats}

Kaynaklar:
${provenance}

Bu bilgilere dayanarak kullanıcı sorusuna kapsamlı, doğal bir Türkçe yanıt ver.`,

  noDataTemplate: (query: string) => `Kullanıcı sordu: "${query}"

İlgili veri bulunamadı. Yardımcı bir yanıt ver.`,
};

/**
 * Deep analysis prompts
 */
export const DEEP_ANALYSIS_PROMPTS = {
  generateSystem: `Sen akıllı bir doküman analiz asistanısın. Sağlanan verilere dayanarak kapsamlı ve doğal Türkçe yanıtlar ver.`,

  generateUser: (snippets: string[], computedStats: any, flags: any) => {
    const snippetsText = snippets.map((s, i) => `[${i + 1}] ${s}`).join('\n\n');
    const statsJson = JSON.stringify(computedStats, null, 2);
    
    return `Bağlam:
${snippetsText}

İstatistikler:
${statsJson}

JSON formatında döndür: { "answer": string, "provenance": [], "followUp": string }`;
  },
};

export class LlamaClient {
  private config: LlamaConfig;

  constructor(config: Partial<LlamaConfig> = {}) {
    this.config = {
      serverUrl: config.serverUrl || process.env.LLAMA_SERVER_URL || 'http://127.0.0.1:11434',
      model: config.model || process.env.LLAMA_MODEL || 'gemma3:4b-it-qat', // Default: Gemma 3 4B - Fast and accurate
      timeout: config.timeout || 180000, // 180 saniye (3 dakika - uzun promptlar için)
      maxRetries: config.maxRetries || 1, // 1 retry
    };
  }

  /**
   * Check if Llama server is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.config.serverUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('Llama health check failed:', error);
      return false;
    }
  }

  /**
   * Generate text with Llama (Ollama format)
   */
  async generate(request: LlamaGenerateRequest): Promise<LlamaGenerateResponse> {
    const startTime = Date.now();

    const fullPrompt = `${LLAMA_PROMPTS.system}\n\n${request.instructions}\n\n${request.context}`;

    const payload = {
      model: this.config.model,
      prompt: fullPrompt,
      stream: request.stream || false,
      options: {
        temperature: request.temperature || 0.7, // Gemma2 için optimal: 0.7-0.8
        num_predict: request.maxTokens || 512,
        top_p: 0.9,
        top_k: 40,
        repeat_penalty: 1.1
      },
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const axios = require('axios');

        const response = await axios.post(
          `${this.config.serverUrl}/api/generate`,
          payload,
          {
            timeout: this.config.timeout,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const data = response.data;
        const latencyMs = Date.now() - startTime;

        return {
          text: data.response || '',
          usage: {
            promptTokens: data.prompt_eval_count,
            completionTokens: data.eval_count,
            totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
          },
          latencyMs,
          model: data.model || this.config.model,
        };
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw new Error(
      `Llama generate failed after ${this.config.maxRetries + 1} attempts: ${lastError?.message}`
    );
  }

  /**
   * Format a complete answer with stats and provenance
   */
  async formatAnswer(
    snippets: string[],
    computedStats: any,
    provenance: any[]
  ): Promise<LlamaGenerateResponse> {
    const snippetsText = snippets.join('\n\n---\n\n');
    const statsJson = JSON.stringify(computedStats, null, 2);
    const provenanceJson = JSON.stringify(provenance, null, 2);

    const userPrompt = LLAMA_PROMPTS.userTemplate(snippetsText, statsJson, provenanceJson);

    return await this.generate({
      instructions: userPrompt,
      context: '',
      maxTokens: 4000,
      temperature: 0.7, // Gemma2 için optimal
    });
  }

  /**
   * Generate "no data" message
   */
  async generateNoDataResponse(query: string): Promise<LlamaGenerateResponse> {
    const prompt = LLAMA_PROMPTS.noDataTemplate(query);

    return await this.generate({
      instructions: prompt,
      context: '',
      maxTokens: 2000,
      temperature: 0.7, // Gemma2 için optimal
    });
  }

  /**
   * Document-aware chat response with LOCAL_DOCS integration
   * OPTIMIZED: Follows new system prompt format with natural conversation
   */
  async documentAwareChat(
    query: string,
    localDocs: any[],
    options: {
      compute?: boolean;
      showRaw?: boolean;
      maxRefs?: number;
      locale?: string;
    } = {},
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<LlamaGenerateResponse> {
    const startTime = Date.now();
    
    // Build conversation context
    let conversationContext = '';
    const recentHistory = conversationHistory.slice(-3);
    if (recentHistory.length > 0) {
      conversationContext = 'Önceki konuşma:\n';
      for (const msg of recentHistory) {
        conversationContext += `${msg.role === 'user' ? 'Kullanıcı' : 'Asistan'}: ${msg.content}\n`;
      }
      conversationContext += '\n';
    }

    // Build LOCAL_DOCS format (optimized - only relevant sections)
    // Limit to 10000 chars total as per user's spec
    const localDocsData = localDocs.map((doc) => ({
      documentId: doc.documentId,
      filename: doc.filename,
      fileType: doc.fileType,
      textSections: doc.textSections?.slice(0, 20).map((s: any) => ({
        id: s.id,
        content: s.content.substring(0, 400), // Limit to 400 chars per section for optimization
        contentLength: s.contentLength
      })) || []
    }));

    // Stringify and limit to 10000 chars
    const localDocsJson = JSON.stringify(localDocsData, null, 2).slice(0, 10000);

    // Build user prompt following the new format
    const userPrompt = `${query}

LOCAL_DOCS:
${localDocsJson}

${conversationContext ? `GEÇMİŞ KONUŞMA:\n${conversationContext}` : ''}`;

    // Use documentAssistant system prompt
    const fullPrompt = `${LLAMA_PROMPTS.documentAssistant}\n\n${userPrompt}`;

    const payload = {
      model: this.config.model,
      prompt: fullPrompt,
      stream: false,
      options: {
        temperature: 0.15, // Low for accuracy but slightly higher for natural conversation
        num_predict: 400, // Increased for more detailed natural responses
        top_p: 0.9,
        top_k: 40,
        repeat_penalty: 1.1
      },
    };

    try {
      const axios = require('axios');

      const response = await axios.post(
        `${this.config.serverUrl}/api/generate`,
        payload,
        {
          timeout: this.config.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data;

      return {
        text: data.response || '',
        usage: {
          promptTokens: data.prompt_eval_count,
          completionTokens: data.eval_count,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
        latencyMs: Date.now() - startTime,
        model: data.model || this.config.model,
      };
    } catch (error) {
      throw new Error(`Document-aware chat failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Simple chat for casual conversation and direct queries
   * Optimized for short, focused responses
   */
  async simpleChat(
    prompt: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<{ text: string; model: string }> {
    
    console.log('🔧 simpleChat called with:', {
      promptLength: prompt.length,
      historyLength: conversationHistory.length,
      history: conversationHistory.slice(-3).map(h => ({ 
        role: h.role, 
        content: h.content.substring(0, 50) + '...' 
      }))
    });
    
    // Build minimal conversation context with anti-thinking system prompt
    let conversationContext = `${LLAMA_PROMPTS.system}\n\n`;
    
    // Add last 3 messages from history
    const recentHistory = conversationHistory.slice(-3);
    if (recentHistory.length > 0) {
      conversationContext += 'Önceki konuşma:\n';
      for (const msg of recentHistory) {
        conversationContext += `${msg.role === 'user' ? 'Kullanıcı' : 'Asistan'}: ${msg.content}\n`;
      }
      conversationContext += '\n';
      console.log('✅ Added conversation history to context:', recentHistory.length, 'messages');
    } else {
      console.log('⚠️ No conversation history available');
    }
    
    conversationContext += `Kullanıcı: ${prompt}\nAsistan:`;
    
    const payload = {
      model: this.config.model,
      prompt: conversationContext,
      stream: false,
      options: {
        temperature: 0.1, // Low for accuracy
        num_predict: 800, // Higher limit for detailed summaries and document analysis
        top_p: 0.9,
        top_k: 40,
        repeat_penalty: 1.15
      },
    };
    
    const startTime = Date.now();
    
    try {
      // Use axios instead of fetch for better reliability in Electron
      const axios = require('axios');
      
      const response = await axios.post(
        `${this.config.serverUrl}/api/generate`,
        payload,
        {
          timeout: this.config.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data;

      return {
        text: data.response || '',
        model: data.model || this.config.model,
      };
    } catch (error) {
      console.error('❌ Ollama request failed:', error);
      throw new Error(`Simple chat failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Pure chat response with conversation history
   */
  async chatResponse(
    query: string, 
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<LlamaGenerateResponse> {
    // Reasonable limit for Gemma2 2B (8K token context)
    const maxQueryLength = 4000; // Max 4000 characters (~3-4K tokens)
    const truncatedQuery = query.length > maxQueryLength 
      ? query.substring(0, maxQueryLength) + '\n\n[Not: Mesaj çok uzun olduğu için burada kesildi]'
      : query;

    // Build conversation context with history and anti-thinking prompt
    let conversationContext = `${LLAMA_PROMPTS.system}\n\nÖNEMLİ: CEVABINI SADECE TÜRKÇE VER. İngilizce kelime kullanma.\n\n`;
    
    // Add last 5 messages from history (to stay within context limits)
    const recentHistory = conversationHistory.slice(-5);
    if (recentHistory.length > 0) {
      conversationContext += 'Önceki konuşma:\n';
      for (const msg of recentHistory) {
        conversationContext += `${msg.role === 'user' ? 'Kullanıcı' : 'Asistan'}: ${msg.content}\n`;
      }
      conversationContext += '\n';
    }
    
    conversationContext += `Kullanıcı: ${truncatedQuery}\nAsistan (Türkçe):`;
    const fullPrompt = conversationContext;
    
    const payload = {
      model: this.config.model,
      prompt: fullPrompt,
      stream: false,
      options: {
        temperature: 0.7, // Gemma2 için optimal: 0.7-0.8
        num_predict: 300,
        top_p: 0.9,
        top_k: 40,
        repeat_penalty: 1.1
      },
    };

    console.log('🔧 LlamaClient Config:', {
      serverUrl: this.config.serverUrl,
      model: this.config.model,
      timeout: this.config.timeout
    });

    const startTime = Date.now();

    try {
      const axios = require('axios');

      console.log('📡 Sending request to Ollama:', `${this.config.serverUrl}/api/generate`);
      console.log('📦 Payload:', { model: payload.model, promptLength: fullPrompt.length });

      const response = await axios.post(
        `${this.config.serverUrl}/api/generate`,
        payload,
        {
          timeout: this.config.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data;
      console.log('✅ Ollama response received:', {
        model: data.model,
        responseLength: data.response?.length || 0
      });

      return {
        text: data.response || '',
        usage: {
          promptTokens: data.prompt_eval_count,
          completionTokens: data.eval_count,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
        latencyMs: Date.now() - startTime,
        model: data.model || this.config.model,
      };
    } catch (error) {
      console.error('❌ LlamaClient chatResponse error:', error);
      throw new Error(`Chat failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Analyze document content and extract key information
   */
  private static analyzeDocumentContent(content: string): {
    isInvoice: boolean;
    amounts: string[];
    dates: string[];
    invoiceNumber: string | null;
    company: string | null;
  } {
    const lowerContent = content.toLowerCase();
    const isInvoice = /invoice|fatura/.test(lowerContent);
    
    // Extract amounts (simple pattern)
    const amountMatches = content.match(/[\$€₺£]\s*[\d,]+\.?\d*/g) || 
                         content.match(/[\d,]+\.?\d*\s*(?:USD|EUR|TRY|TL)/gi) || [];
    const amounts = [...new Set(amountMatches)].slice(0, 3); // Unique, max 3
    
    // Extract dates (simple patterns)
    const dateMatches = content.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g) ||
                       content.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December|Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+\d{1,2},?\s+\d{4}/gi) || [];
    const dates = [...new Set(dateMatches)].slice(0, 2);
    
    // Extract invoice number
    const invoiceMatch = content.match(/(?:invoice|fatura)\s*(?:number|no|#|numara)[:\s]*([A-Z0-9\-]+)/i);
    const invoiceNumber = invoiceMatch ? invoiceMatch[1] : null;
    
    // Extract company name (basic heuristic)
    const lines = content.split('\n').filter(l => l.trim());
    const company = lines.find(line => 
      line.length > 3 && line.length < 50 && 
      /^[A-Z]/.test(line) && 
      !/^(invoice|fatura|bill|date|total|amount)/i.test(line)
    ) || null;
    
    return { isInvoice, amounts, dates, invoiceNumber, company };
  }

  /**
   * Generate formatted answer for deep analysis
   */
  async generateDeepAnswer(
    snippets: string[],
    computedStats: any,
    flags: any
  ): Promise<{
    answer: string;
    provenance: any[];
    followUp: string;
    displayFlags: any;
    latencyMs: number;
  }> {
    const startTime = Date.now();
    
    try {
      const userPrompt = DEEP_ANALYSIS_PROMPTS.generateUser(snippets, computedStats, flags);
      
      const response = await this.generate({
        instructions: DEEP_ANALYSIS_PROMPTS.generateSystem,
        context: userPrompt,
        maxTokens: 4000,
        temperature: 0.7, // Gemma2 için optimal
      });
      
      try {
        const parsed = JSON.parse(response.text);
        return {
          answer: parsed.answer || response.text,
          provenance: parsed.provenance || [],
          followUp: parsed.followUp || '',
          displayFlags: parsed.displayFlags || flags,
          latencyMs: response.latencyMs,
        };
      } catch (parseError) {
        return {
          answer: response.text,
          provenance: [],
          followUp: '',
          displayFlags: flags,
          latencyMs: response.latencyMs,
        };
      }
    } catch (error) {
      throw error;
    }
  }


  /**
   * Get fallback response when Llama is down
   * Intelligently responds based on available data
   */
  static getFallbackResponse(
    computedStats: any,
    provenance: any[]
  ): string {
    const { count, sum, average, median, currency } = computedStats;

    // If we have provenance but no stats, analyze and provide intelligent document information
    if (provenance && provenance.length > 0 && count === 0) {
      // Deep analysis mode - analyze all documents in detail
      const analyses = provenance.map(prov => ({
        filename: prov.filename,
        analysis: this.analyzeDocumentContent(prov.snippet + (prov.metadata?.content || ''))
      }));
      
      const invoices = analyses.filter(a => a.analysis.isInvoice);
      const nonInvoices = analyses.filter(a => !a.analysis.isInvoice);
      
      let response = `🧠 **Derin Analiz Sonuçları**\n\n`;
      response += `📊 **Genel Bakış:** ${provenance.length} doküman tarandı\n`;
      response += `📝 **Faturalar:** ${invoices.length} adet\n`;
      response += `📄 **Diğer Dokümanlar:** ${nonInvoices.length} adet\n\n`;
      
      if (invoices.length > 0) {
        response += `---\n\n`;
        response += `💼 **FATURA DETAYLARI:**\n\n`;
        
        invoices.forEach((item, index) => {
          response += `**${index + 1}. ${item.filename}**\n`;
          
          if (item.analysis.invoiceNumber) {
            response += `   🔢 Fatura No: ${item.analysis.invoiceNumber}\n`;
          }
          if (item.analysis.company) {
            response += `   🏢 Şirket: ${item.analysis.company}\n`;
          }
          if (item.analysis.dates.length > 0) {
            response += `   📅 Tarih: ${item.analysis.dates[0]}\n`;
          }
          if (item.analysis.amounts.length > 0) {
            response += `   💰 Tutarlar: ${item.analysis.amounts.join(', ')}\n`;
            
            // Try to identify which is the total amount
            const totalMatch = item.analysis.amounts.find(amt => 
              /total|toplam/i.test(amt) || item.analysis.amounts.length === 1
            );
            if (totalMatch) {
              response += `   ✅ Ana Tutar: **${totalMatch}**\n`;
            }
          }
          response += `\n`;
        });
        
        // Extract all unique amounts
        const allAmounts = invoices.flatMap(inv => inv.analysis.amounts);
        const uniqueAmounts = [...new Set(allAmounts)];
        
        if (uniqueAmounts.length > 0) {
          response += `---\n\n`;
          response += `📈 **Mali Özet:**\n`;
          response += `   • Toplam ${invoices.length} fatura\n`;
          response += `   • Tespit edilen tutarlar: ${uniqueAmounts.join(', ')}\n`;
          response += `   • Farklı tutar sayısı: ${uniqueAmounts.length}\n`;
        }
      }
      
      if (nonInvoices.length > 0) {
        response += `\n---\n\n`;
        response += `📄 **DİĞER DOKÜMANLAR:**\n\n`;
        nonInvoices.forEach((item, index) => {
          response += `${index + 1}. **${item.filename}**\n`;
          response += `   Tür: Genel doküman\n\n`;
        });
      }
      
      response += `---\n\n`;
      response += `💡 **Sonraki Adımlar:**\n`;
      response += `Daha detaylı hesaplamalar için şu soruları sorabilirsiniz:\n`;
      response += `   • "Fatura toplamı nedir?" - Tüm tutarları topla\n`;
      response += `   • "En yüksek fatura hangisi?" - Karşılaştırma yap\n`;
      response += `   • "Tarih sırasına göre göster" - Kronolojik sıralama\n`;
      
      return response;
    }

    // If no data at all
    if (count === 0 && (!provenance || provenance.length === 0)) {
      return '❌ Bu sorgu için veri bulamadım. Lütfen daha fazla belge yükleyin veya sorgunuzu farklı kelimelerle ifade edin.';
    }

    // If we have numeric stats
    const currencyStr = currency || 'TRY';
    
    let response = `📊 **Fatura Analizi**\n\n`;
    response += `✅ Toplam **${count} adet** fatura bulundu\n\n`;
    response += `💰 **Finansal Özet:**\n`;
    response += `   • Toplam tutar: **${sum.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${currencyStr}**\n`;
    response += `   • Ortalama: ${average.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${currencyStr}\n`;
    response += `   • Medyan: ${median.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${currencyStr}\n`;
    response += `\n📄 **Kaynaklar:**\n`;

    provenance.slice(0, 5).forEach((prov, index) => {
      response += `   ${index + 1}. ${prov.filename}\n`;
    });

    response += `\n*🤖 Not: Bu yanıt otomatik analiz ile oluşturuldu.*`;

    return response;
  }
}

