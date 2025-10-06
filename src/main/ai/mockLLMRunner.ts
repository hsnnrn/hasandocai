/**
 * Mock LLM Runner - Development/Testing
 * 
 * Llama.cpp olmadan test için basit mock responses
 */

export interface LLMConfig {
  modelPath: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export interface GenerationOptions {
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export class MockLLMRunner {
  private config: LLMConfig;
  private isInitialized: boolean = false;

  constructor(modelPath: string) {
    this.config = {
      modelPath,
      maxTokens: 512,
      temperature: 0.7,
      timeout: 60000
    };
  }

  /**
   * Initialize mock LLM runner
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing Mock LLM Runner...');
      this.isInitialized = true;
      console.log('✅ Mock LLM Runner initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Mock LLM Runner:', error);
      throw error;
    }
  }

  /**
   * Generate mock response
   */
  async generateResponse(prompt: string, options: GenerationOptions = {}): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Mock LLM Runner not initialized');
    }

    try {
      console.log('🧠 Mock: Generating LLM response...');
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock response based on prompt
      const mockResponse = this.generateMockResponse(prompt);
      
      console.log('✅ Mock: LLM response generated');
      return mockResponse;
    } catch (error) {
      console.error('❌ Mock: Failed to generate response:', error);
      throw error;
    }
  }

  /**
   * Generate mock response based on prompt
   */
  private generateMockResponse(prompt: string): string {
    // Simple keyword-based responses
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('belge') || lowerPrompt.includes('document')) {
      return "Bu belge hakkında size yardımcı olabilirim. Belgenin içeriğine dayanarak sorularınızı yanıtlayabilirim.";
    }
    
    if (lowerPrompt.includes('ne') || lowerPrompt.includes('what')) {
      return "Belgenizdeki bilgilere göre, bu konu hakkında detaylı açıklama yapabilirim. Hangi spesifik konuda bilgi almak istiyorsunuz?";
    }
    
    if (lowerPrompt.includes('nasıl') || lowerPrompt.includes('how')) {
      return "Belgenizdeki adımları ve süreçleri açıklayabilirim. Hangi konuda yardıma ihtiyacınız var?";
    }
    
    if (lowerPrompt.includes('neden') || lowerPrompt.includes('why')) {
      return "Belgenizdeki bilgilere dayanarak neden-sonuç ilişkilerini açıklayabilirim.";
    }
    
    // Default response
    return "Belgenizdeki bilgilere dayanarak sorularınızı yanıtlayabilirim. Daha spesifik bir soru sorarsanız size daha detaylı yardım edebilirim.";
  }

  /**
   * Check if LLM runner is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get model info
   */
  getModelInfo(): { modelPath: string; isReady: boolean } {
    return {
      modelPath: this.config.modelPath,
      isReady: this.isInitialized
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      console.log('🧹 Mock: Cleaning up LLM runner...');
      this.isInitialized = false;
      console.log('✅ Mock: LLM runner cleanup completed');
    } catch (error) {
      console.error('❌ Mock: Error during cleanup:', error);
    }
  }
}
