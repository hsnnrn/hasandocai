/**
 * Semantic Classifier - BGE-M3 powered document classification
 * 
 * Classifies documents into types (fatura, teklif, fis, etc.) using:
 * 1. Filename heuristics (fast, deterministic)
 * 2. Semantic classification (BGE-M3 powered)
 * 3. Confidence scoring
 * 
 * Following Rag-workflow.md specification
 */

import { LlamaClient } from './llamaClient';
import { 
  DocumentType, 
  DOCUMENT_TYPE_KEYWORDS, 
  ClassificationConfidence,
  OCR_CORRECTIONS 
} from './canonicalSchema';

export interface ClassificationResult {
  type: DocumentType;
  confidence: ClassificationConfidence;
  method: 'heuristic' | 'semantic' | 'hybrid';
  reasoning?: string;
}

export interface DocumentContext {
  filename: string;
  content: string;  // Raw or extracted text
  metadata?: {
    invoice_no?: string;
    date?: string;
    total?: string | number;
    tax?: string | number;
    supplier?: string;
    [key: string]: any;
  };
}

export class SemanticClassifier {
  private llamaClient: LlamaClient;

  constructor() {
    this.llamaClient = new LlamaClient();
  }

  /**
   * Classify document using hybrid approach (heuristic + semantic)
   * OPTIMIZED: Skip LLM if heuristic is confident enough
   */
  async classify(context: DocumentContext): Promise<ClassificationResult> {
    console.log('🔍 Starting document classification:', context.filename);

    // STEP 1: Try heuristic classification (filename-based)
    const heuristicResult = this.classifyByHeuristics(context);
    
    // OPTIMIZATION: Skip LLM if heuristic confidence is good enough (>= 0.7)
    if (heuristicResult.confidence.heuristic_score! >= 0.7) {
      console.log('✅ High-confidence heuristic classification (skipping LLM):', heuristicResult.type);
      return heuristicResult;
    }

    // STEP 2: Semantic classification (BGE-M3 + LLM) with timeout
    try {
      console.log('🤖 Heuristic confidence low, trying semantic classification...');
      const semanticResult = await Promise.race([
        this.classifyBySemantic(context),
        new Promise<ClassificationResult>((_, reject) => 
          setTimeout(() => reject(new Error('Semantic classification timeout (10s)')), 10000)
        )
      ]);
      
      // STEP 3: Combine scores for hybrid classification
      const hybridResult = this.combineClassifications(heuristicResult, semanticResult);
      
      console.log('✅ Hybrid classification completed:', {
        type: hybridResult.type,
        confidence: hybridResult.confidence.classification,
        method: hybridResult.method,
      });

      return hybridResult;
    } catch (error) {
      console.warn('⚠️ Semantic classification failed, using heuristic only:', error);
      return heuristicResult;
    }
  }

  /**
   * Heuristic classification based on filename and keywords
   * IMPROVED: Better scoring and pattern matching
   */
  private classifyByHeuristics(context: DocumentContext): ClassificationResult {
    const filename = context.filename.toLowerCase();
    const content = context.content.toLowerCase();
    
    // Apply OCR corrections
    let correctedContent = content;
    for (const [wrong, correct] of Object.entries(OCR_CORRECTIONS)) {
      correctedContent = correctedContent.replace(new RegExp(wrong, 'gi'), correct);
    }

    const scores: Record<DocumentType, number> = {
      fatura: 0,
      teklif: 0,
      fis: 0,
      irsaliye: 0,
      sozlesme: 0,
      diger: 0,
    };

    // IMPROVED: Stronger filename scoring (most reliable)
    for (const [docType, keywords] of Object.entries(DOCUMENT_TYPE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (filename.includes(keyword.toLowerCase())) {
          scores[docType as DocumentType] += 0.7; // Increased from 0.5
        }
        // Check in content (first 500 chars)
        if (correctedContent.substring(0, 500).includes(keyword.toLowerCase())) {
          scores[docType as DocumentType] += 0.3;
        }
      }
    }

    // Check metadata for additional hints
    if (context.metadata) {
      if (context.metadata.invoice_no || context.metadata.total) {
        scores.fatura += 0.4; // Increased from 0.3
      }
    }

    // Find highest score
    const sortedTypes = (Object.entries(scores) as [DocumentType, number][])
      .sort((a, b) => b[1] - a[1]);
    
    const bestType = sortedTypes[0][0];
    const bestScore = sortedTypes[0][1];

    // Normalize score to 0-1 range (adjusted for new weights)
    const normalizedScore = Math.min(bestScore / 1.2, 1.0); // Changed from 1.5

    return {
      type: bestType,
      confidence: {
        classification: normalizedScore,
        heuristic_score: normalizedScore,
        semantic_score: 0,
      },
      method: 'heuristic',
      reasoning: `Matched keywords in filename/content (score: ${normalizedScore.toFixed(2)})`,
    };
  }

  /**
   * Semantic classification using BGE-M3 + LLM
   * Following Rag-workflow.md prompt template
   */
  private async classifyBySemantic(context: DocumentContext): Promise<ClassificationResult> {
    // Build classification prompt
    const prompt = this.buildClassificationPrompt(context);
    
    console.log('🤖 Sending semantic classification query to LLM...');
    
    // Get LLM response
    const response = await this.llamaClient.simpleChat(prompt, []);
    
    // Parse response
    const parsed = this.parseClassificationResponse(response.text);
    
    return {
      type: parsed.type,
      confidence: {
        classification: parsed.confidence,
        semantic_score: parsed.confidence,
        heuristic_score: 0,
      },
      method: 'semantic',
      reasoning: parsed.reasoning,
    };
  }

  /**
   * Build classification prompt following Rag-workflow.md template
   */
  private buildClassificationPrompt(context: DocumentContext): string {
    // Extract key fields for classification
    const metadata = context.metadata || {};
    const contentSample = context.content.substring(0, 500);

    // Build data summary
    const dataSummary = `
DOSYA ADI: ${context.filename}
${metadata.invoice_no ? `FATURA/BELGE NO: ${metadata.invoice_no}` : ''}
${metadata.date ? `TARIH: ${metadata.date}` : ''}
${metadata.total ? `TOPLAM TUTAR: ${metadata.total}` : ''}
${metadata.tax ? `KDV: ${metadata.tax}` : ''}
${metadata.supplier ? `SATICI/TEDARIKCI: ${metadata.supplier}` : ''}

İÇERİK ÖRNEĞİ (ilk 500 karakter):
${contentSample}
`.trim();

    // Classification prompt (following Rag-workflow.md)
    return `Aşağıdaki veriye bakarak belge türünü tahmin et. Sadece belirtilen türlerden birini seç:
- fatura (invoice, e-fatura)
- teklif (quotation, offer, pro forma)
- fis (receipt, makbuz)
- irsaliye (waybill, delivery note)
- sozlesme (contract, agreement)
- diger (other document types)

Ayrıca 0-1 arası bir güven (confidence) belirt.

DATA:
${dataSummary}

TALİMAT:
1) Belge türünü yukarıdaki listeden seç
2) Güven skoru belirle (0.0 - 1.0)
3) Kısa bir açıklama yaz

Cevap formatı (sadece bu formatı kullan, başka açıklama ekleme):
TIP: [tip_adi]
CONFIDENCE: [0.xx]
REASONING: [kısa açıklama]

ŞİMDİ CEVAP VER:`;
  }

  /**
   * Parse LLM classification response
   */
  private parseClassificationResponse(responseText: string): {
    type: DocumentType;
    confidence: number;
    reasoning: string;
  } {
    const lines = responseText.split('\n');
    
    let type: DocumentType = 'diger';
    let confidence = 0.5;
    let reasoning = '';

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Parse TIP
      if (trimmed.startsWith('TIP:') || trimmed.startsWith('TYPE:')) {
        const typeMatch = trimmed.match(/TIP:|TYPE:\s*(\w+)/i);
        if (typeMatch) {
          const detectedType = typeMatch[1].toLowerCase();
          // Validate type
          if (['fatura', 'teklif', 'fis', 'irsaliye', 'sozlesme', 'diger'].includes(detectedType)) {
            type = detectedType as DocumentType;
          }
        }
      }
      
      // Parse CONFIDENCE
      if (trimmed.startsWith('CONFIDENCE:') || trimmed.startsWith('GÜVEN:')) {
        const confMatch = trimmed.match(/CONFIDENCE:|GÜVEN:\s*([\d.]+)/i);
        if (confMatch) {
          const parsed = parseFloat(confMatch[1]);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
            confidence = parsed;
          }
        }
      }
      
      // Parse REASONING
      if (trimmed.startsWith('REASONING:') || trimmed.startsWith('AÇIKLAMA:')) {
        reasoning = trimmed.replace(/^(REASONING:|AÇIKLAMA:)\s*/i, '').trim();
      }
    }

    return { type, confidence, reasoning };
  }

  /**
   * Combine heuristic and semantic classifications
   */
  private combineClassifications(
    heuristic: ClassificationResult,
    semantic: ClassificationResult
  ): ClassificationResult {
    const hScore = heuristic.confidence.heuristic_score || 0;
    const sScore = semantic.confidence.semantic_score || 0;

    // If both agree, high confidence
    if (heuristic.type === semantic.type) {
      const combinedScore = Math.max(hScore, sScore);
      return {
        type: heuristic.type,
        confidence: {
          classification: combinedScore,
          heuristic_score: hScore,
          semantic_score: sScore,
        },
        method: 'hybrid',
        reasoning: `Heuristic and semantic agree (${heuristic.type})`,
      };
    }

    // If they disagree, prefer higher confidence
    if (sScore > hScore) {
      return {
        type: semantic.type,
        confidence: {
          classification: sScore * 0.9, // Slight penalty for disagreement
          heuristic_score: hScore,
          semantic_score: sScore,
        },
        method: 'hybrid',
        reasoning: `Semantic classification preferred (disagreement)`,
      };
    } else {
      return {
        type: heuristic.type,
        confidence: {
          classification: hScore * 0.9, // Slight penalty for disagreement
          heuristic_score: hScore,
          semantic_score: sScore,
        },
        method: 'hybrid',
        reasoning: `Heuristic classification preferred (disagreement)`,
      };
    }
  }

  /**
   * Batch classify multiple documents
   */
  async batchClassify(contexts: DocumentContext[]): Promise<ClassificationResult[]> {
    const results: ClassificationResult[] = [];

    for (const context of contexts) {
      try {
        const result = await this.classify(context);
        results.push(result);
      } catch (error) {
        console.error(`Failed to classify ${context.filename}:`, error);
        // Fallback to heuristic only
        results.push(this.classifyByHeuristics(context));
      }
    }

    return results;
  }
}

