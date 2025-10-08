/**
 * Mistral Client - Wrapper for local Mistral 7B inference
 * 
 * Supports both Ollama and generic REST endpoints
 */

export interface MistralGenerateRequest {
  instructions: string;
  context: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface MistralGenerateResponse {
  text: string;
  usage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  latencyMs: number;
  model: string;
}

export interface MistralConfig {
  serverUrl: string;
  model: string;
  timeout: number;
  maxRetries: number;
}

/**
 * Mistral prompt templates for formatting tasks
 */
export const MISTRAL_PROMPTS = {
  system: `You are a formatting assistant. You MUST NOT invent or compute numeric values. Use ONLY the provided JSON 'computedStats' (that contains backend-computed numbers) and the provided 'provenance' list. Your job is to produce a Turkish natural-language answer that:
- states the computed results (count, average, sum, median) EXACTLY as given,
- provides a 1-sentence explanation of method (e.g., "X adet fatura, toplam Y TL, ortalama Z TL — hesaplama arka planda yapıldı"),
- lists up to 5 provenance lines like: "• document.pdf — page 2 — section_123 (snippet...)",
- suggests one follow-up action (e.g., "Dilersen tarih aralığı ver, döviz dönüştüreyim").
Do NOT perform arithmetic, do not change numbers, do not hallucinate sources. If 'computedStats' is empty, reply: "Bu sorgu için yeterli fatura verisi bulamadım."`,

  userTemplate: (snippets: string, stats: string, provenance: string) => `Context snippets:
${snippets}

ComputedStats (JSON):
${stats}

Provenance (JSON):
${provenance}

Return only a well-formatted Turkish answer (max 6 short sentences) containing the numeric values from ComputedStats, and the provenance lines (max 5).`,

  noDataTemplate: (query: string) => `User asked: "${query}"

No numeric data was found in the documents. Provide a helpful Turkish message (2-3 sentences) explaining that no relevant invoice data was found for this query, and suggest what the user could try instead (e.g., check date range, upload more documents, rephrase query).`,
};

/**
 * Deep analysis prompts with critic/verifier capability
 */
export const DEEP_ANALYSIS_PROMPTS = {
  // System prompt for generation phase
  generateSystem: `You are a formatting assistant. DO NOT invent numbers. Use ONLY the provided ComputedStats JSON for numeric values. Internally you may reason, but DO NOT output internal thoughts. Produce a concise Turkish answer: 1-3 short sentences stating results, then up to 5 provenance lines. Add one short follow-up suggestion. If ComputedStats.count < 1, reply 'Yeterli veri yok.'`,

  // User template for generation phase
  generateUser: (snippets: string[], computedStats: any, flags: any) => {
    const snippetsText = snippets.map((s, i) => `[${i + 1}] ${s.substring(0, 200)}`).join('\n\n');
    const statsJson = JSON.stringify(computedStats, null, 2);
    const flagsJson = JSON.stringify(flags, null, 2);
    
    return `Context snippets:
${snippetsText}

ComputedStats (JSON):
${statsJson}

Flags:
${flagsJson}

Return only JSON: { "answer": string, "provenance": [{"sectionId": string, "filename": string, "snippet": string}], "followUp": string, "displayFlags": {"lowConfidence": boolean, "duplicates": boolean, "outliers": boolean} }`;
  },

  // System prompt for critic phase
  criticSystem: `You are a critic. Check whether the provided 'draftAnswer' accurately reflects 'computedStats' and 'provenance'. Return JSON: { "ok": boolean, "issues": [string], "suggestedEdit": string }.
Do NOT compute numbers. If numbers in draft differ from computedStats, set ok=false and list mismatch.`,

  // User template for critic phase
  criticUser: (draftAnswer: string, computedStats: any, provenance: any[]) => {
    const statsJson = JSON.stringify(computedStats, null, 2);
    const provenanceJson = JSON.stringify(provenance.slice(0, 5), null, 2);
    
    return `Draft Answer:
${draftAnswer}

ComputedStats (JSON):
${statsJson}

Provenance (JSON):
${provenanceJson}

Verify that the draft answer uses ONLY the numbers from ComputedStats. Return JSON: { "ok": boolean, "issues": [string], "suggestedEdit": string }`;
  },
};

export class MistralClient {
  private config: MistralConfig;

  constructor(config: Partial<MistralConfig> = {}) {
    this.config = {
      serverUrl: config.serverUrl || process.env.MISTRAL_SERVER_URL || 'http://127.0.0.1:11434',
      model: config.model || 'mistral',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 2,
    };
  }

  /**
   * Check if Mistral server is available
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
      console.warn('Mistral health check failed:', error);
      return false;
    }
  }

  /**
   * Generate text with Mistral (Ollama format)
   */
  async generate(request: MistralGenerateRequest): Promise<MistralGenerateResponse> {
    const startTime = Date.now();

    // Combine system instructions with user context
    const fullPrompt = `${MISTRAL_PROMPTS.system}\n\n${request.instructions}\n\n${request.context}`;

    const payload = {
      model: this.config.model,
      prompt: fullPrompt,
      stream: request.stream || false,
      options: {
        temperature: request.temperature || 0.3, // Low temperature for factual responses
        num_predict: request.maxTokens || 500,
        top_p: 0.9,
        top_k: 40,
      },
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(`${this.config.serverUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Mistral server error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
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
        console.warn(`Mistral generate attempt ${attempt + 1} failed:`, error);

        if (attempt < this.config.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw new Error(
      `Mistral generate failed after ${this.config.maxRetries + 1} attempts: ${lastError?.message}`
    );
  }

  /**
   * Format a complete answer with stats and provenance
   */
  async formatAnswer(
    snippets: string[],
    computedStats: any,
    provenance: any[]
  ): Promise<MistralGenerateResponse> {
    const snippetsText = snippets.join('\n\n---\n\n');
    const statsJson = JSON.stringify(computedStats, null, 2);
    const provenanceJson = JSON.stringify(provenance, null, 2);

    const userPrompt = MISTRAL_PROMPTS.userTemplate(snippetsText, statsJson, provenanceJson);

    return await this.generate({
      instructions: userPrompt,
      context: '',
      maxTokens: 500,
      temperature: 0.3,
    });
  }

  /**
   * Generate "no data" message
   */
  async generateNoDataResponse(query: string): Promise<MistralGenerateResponse> {
    const prompt = MISTRAL_PROMPTS.noDataTemplate(query);

    return await this.generate({
      instructions: prompt,
      context: '',
      maxTokens: 200,
      temperature: 0.5,
    });
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
   * Generate formatted answer for deep analysis (with structured JSON output)
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
        maxTokens: 300,
        temperature: 0.1, // Very low for consistent output
      });
      
      // Try to parse JSON response
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
        // If JSON parsing fails, return structured fallback
        console.warn('Failed to parse JSON from Mistral deep answer, using text as-is');
        return {
          answer: response.text,
          provenance: [],
          followUp: '',
          displayFlags: flags,
          latencyMs: response.latencyMs,
        };
      }
    } catch (error) {
      console.error('Deep answer generation failed:', error);
      throw error;
    }
  }

  /**
   * Critic/verifier pass - checks if draft answer is consistent with computed stats
   */
  async criticVerify(
    draftAnswer: string,
    computedStats: any,
    provenance: any[]
  ): Promise<{
    ok: boolean;
    issues: string[];
    suggestedEdit: string;
    latencyMs: number;
  }> {
    const startTime = Date.now();
    
    try {
      const userPrompt = DEEP_ANALYSIS_PROMPTS.criticUser(draftAnswer, computedStats, provenance);
      
      const response = await this.generate({
        instructions: DEEP_ANALYSIS_PROMPTS.criticSystem,
        context: userPrompt,
        maxTokens: 200,
        temperature: 0.0, // Zero temperature for strict verification
      });
      
      // Try to parse JSON response
      try {
        const parsed = JSON.parse(response.text);
        return {
          ok: parsed.ok !== false, // Default to true if not explicitly false
          issues: parsed.issues || [],
          suggestedEdit: parsed.suggestedEdit || '',
          latencyMs: response.latencyMs,
        };
      } catch (parseError) {
        console.warn('Failed to parse JSON from Mistral critic, assuming OK');
        // If can't parse, assume it's OK (fail-open for better UX)
        return {
          ok: true,
          issues: [],
          suggestedEdit: '',
          latencyMs: response.latencyMs,
        };
      }
    } catch (error) {
      console.error('Critic verification failed:', error);
      // On error, fail-open (assume OK)
      return {
        ok: true,
        issues: [`Critic error: ${error instanceof Error ? error.message : 'Unknown'}`],
        suggestedEdit: '',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Get fallback response when Mistral is down
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

