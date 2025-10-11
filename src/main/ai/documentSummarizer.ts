/**
 * Document Summarization Service
 * Generates concise summaries of documents using LLM
 * 
 * Features:
 * - Automatic document summarization
 * - Context-aware summary length
 * - Multi-language support (Turkish/English)
 * - Invoice-specific summarization
 */

import { LlamaClient } from './llamaClient';

/**
 * Summary generation options
 */
export interface SummaryOptions {
  maxLength?: number; // Max summary length in words
  language?: 'tr' | 'en';
  style?: 'brief' | 'detailed';
  focus?: 'financial' | 'general' | 'technical';
}

/**
 * Summary result
 */
export interface SummaryResult {
  success: boolean;
  summary: string;
  keyPoints: string[];
  confidence: number;
  language: string;
  processingTimeMs: number;
  error?: string;
}

/**
 * Document Summarizer - Generates intelligent summaries using LLM
 */
export class DocumentSummarizer {
  private llama: LlamaClient;

  constructor() {
    this.llama = new LlamaClient();
  }

  /**
   * Generate summary from document text
   */
  async summarize(
    text: string,
    documentType: string = 'diger',
    options: SummaryOptions = {}
  ): Promise<SummaryResult> {
    const startTime = Date.now();

    try {
      console.log(`📝 DocumentSummarizer: Generating summary for ${documentType}...`);

      // Defaults
      const {
        maxLength = 100,
        language = 'tr',
        style = 'brief',
        focus = documentType === 'fatura' ? 'financial' : 'general',
      } = options;

      // Truncate text if too long (keep first 2000 chars for context)
      const truncatedText = text.length > 2000 ? text.substring(0, 2000) + '...' : text;

      // Build prompt based on document type and options
      const prompt = this.buildSummaryPrompt(truncatedText, documentType, language, style, focus, maxLength);

      // Generate summary using LLM
      const response = await this.llama.simpleChat(prompt, []);

      // Extract summary and key points
      const { summary, keyPoints } = this.parseSummaryResponse(response.text);

      console.log(`✅ Summary generated in ${Date.now() - startTime}ms`);

      return {
        success: true,
        summary,
        keyPoints,
        confidence: 0.85,
        language,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error('❌ DocumentSummarizer error:', error);
      
      // Fallback: Generate extractive summary (first few sentences)
      const fallbackSummary = this.extractiveSummary(text, options.maxLength || 100);

      return {
        success: false,
        summary: fallbackSummary,
        keyPoints: [],
        confidence: 0.3,
        language: options.language || 'tr',
        processingTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build summary prompt based on document type and options
   */
  private buildSummaryPrompt(
    text: string,
    documentType: string,
    language: string,
    style: string,
    focus: string,
    maxLength: number
  ): string {
    const isTurkish = language === 'tr';
    
    let systemPrompt = '';
    let instruction = '';

    if (isTurkish) {
      systemPrompt = `Sen bir döküman analiz asistanısın. Belgeleri özetleme konusunda uzmansın.`;
      
      if (documentType === 'fatura') {
        instruction = `Aşağıdaki fatura metnini analiz et ve ${maxLength} kelimeyi geçmeyecek şekilde özetle.

Özette şunlar olmalı:
- Fatura numarası ve tarihi (varsa)
- Alıcı ve satıcı bilgileri
- Toplam tutar ve KDV
- Önemli kalemler (varsa)

Metin:
${text}

ÖNEMLİ: Sadece özet ve 3-5 maddelik anahtar noktalar ver. Ek açıklama yapma.

Format:
ÖZET: [özetin buraya]

ANAHTAR NOKTALAR:
- [nokta 1]
- [nokta 2]
- [nokta 3]`;
      } else {
        instruction = `Aşağıdaki belge metnini ${maxLength} kelimeyi geçmeyecek şekilde özetle.

${style === 'detailed' ? 'Detaylı ve kapsamlı bir özet hazırla.' : 'Kısa ve öz bir özet hazırla.'}

Metin:
${text}

Format:
ÖZET: [özetin buraya]

ANAHTAR NOKTALAR:
- [nokta 1]
- [nokta 2]
- [nokta 3]`;
      }
    } else {
      systemPrompt = `You are a document analysis assistant. You specialize in summarizing documents.`;
      
      if (documentType === 'fatura') {
        instruction = `Analyze the following invoice text and summarize it in no more than ${maxLength} words.

The summary should include:
- Invoice number and date (if available)
- Buyer and supplier information
- Total amount and tax
- Important line items (if any)

Text:
${text}

IMPORTANT: Only provide the summary and 3-5 key points. No additional explanations.

Format:
SUMMARY: [summary here]

KEY POINTS:
- [point 1]
- [point 2]
- [point 3]`;
      } else {
        instruction = `Summarize the following document text in no more than ${maxLength} words.

${style === 'detailed' ? 'Provide a detailed and comprehensive summary.' : 'Provide a brief and concise summary.'}

Text:
${text}

Format:
SUMMARY: [summary here]

KEY POINTS:
- [point 1]
- [point 2]
- [point 3]`;
      }
    }

    return `${systemPrompt}\n\n${instruction}`;
  }

  /**
   * Parse LLM response to extract summary and key points
   */
  private parseSummaryResponse(responseText: string): { summary: string; keyPoints: string[] } {
    let summary = '';
    const keyPoints: string[] = [];

    // Extract summary
    const summaryMatch = responseText.match(/(?:ÖZET|SUMMARY):\s*(.+?)(?=\n\n|ANAHTAR|KEY POINTS|$)/is);
    if (summaryMatch) {
      summary = summaryMatch[1].trim();
    } else {
      // Fallback: use first paragraph as summary
      const firstParagraph = responseText.split('\n\n')[0];
      summary = firstParagraph.trim();
    }

    // Extract key points
    const keyPointsMatch = responseText.match(/(?:ANAHTAR NOKTALAR|KEY POINTS):\s*(.+?)$/is);
    if (keyPointsMatch) {
      const pointsText = keyPointsMatch[1];
      const points = pointsText.split('\n').filter(line => line.trim().startsWith('-'));
      keyPoints.push(...points.map(p => p.replace(/^-\s*/, '').trim()));
    }

    return { summary, keyPoints };
  }

  /**
   * Fallback extractive summarization (no LLM)
   * Returns first few sentences up to maxLength words
   */
  private extractiveSummary(text: string, maxLength: number): string {
    // Split into sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    let summary = '';
    let wordCount = 0;

    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/);
      if (wordCount + words.length > maxLength) break;
      
      summary += sentence.trim() + '. ';
      wordCount += words.length;
    }

    return summary.trim();
  }

  /**
   * Generate quick summary for a list of documents
   */
  async summarizeBatch(
    documents: Array<{ text: string; type: string; filename: string }>,
    options: SummaryOptions = {}
  ): Promise<Map<string, SummaryResult>> {
    console.log(`📝 DocumentSummarizer: Batch summarizing ${documents.length} documents...`);

    const results = new Map<string, SummaryResult>();

    for (const doc of documents) {
      const result = await this.summarize(doc.text, doc.type, options);
      results.set(doc.filename, result);
      
      // Small delay between requests to avoid overloading
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  }
}

/**
 * Export singleton instance
 */
export const documentSummarizer = new DocumentSummarizer();

