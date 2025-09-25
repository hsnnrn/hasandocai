export class ErrorHandler {
  /**
   * HTTP Status kodlarına göre hata analizi
   */
  static analyzeError(status: number, responseData: any): string {
    switch (status) {
      case 401:
        if (responseData?.error?.includes('expired') || responseData?.error?.includes('invalid token')) {
          return 'TOKEN_EXPIRED';
        }
        return 'AUTHENTICATION_FAILED';
      
      case 403:
        return 'API_KEY_INVALID';
      
      case 404:
        return 'ENDPOINT_NOT_FOUND';
      
      case 413:
        return 'FILE_TOO_LARGE';
      
      case 429:
        return 'RATE_LIMIT_EXCEEDED';
      
      case 500:
        return 'SERVER_ERROR';
      
      case 502:
      case 503:
      case 504:
        return 'SERVICE_UNAVAILABLE';
      
      default:
        return 'UNKNOWN_ERROR';
    }
  }

  /**
   * Retry mantığı ile API çağrısı
   */
  static async withRetry<T>(
    apiCall: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries}`);
        return await apiCall();
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Exponential backoff
        const delay = delayMs * Math.pow(2, attempt - 1);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * Token yenileme ile API çağrısı
   */
  static async withTokenRefresh<T>(
    apiCall: (token: string) => Promise<T>,
    getNewToken: () => Promise<string>,
    maxRetries: number = 2
  ): Promise<T> {
    let token = await getNewToken();
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall(token);
      } catch (error: any) {
        console.error(`❌ API call failed (attempt ${attempt}):`, error);
        
        // Token expired, get new one
        if (error.message?.includes('TOKEN_EXPIRED') || error.status === 401) {
          console.log('🔄 Token expired, getting new token...');
          token = await getNewToken();
          continue;
        }
        
        throw error;
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  /**
   * Detaylı hata loglama
   */
  static logError(context: string, error: any, response?: any): void {
    console.error(`❌ ${context}:`, {
      message: error.message,
      status: response?.status,
      statusText: response?.statusText,
      data: response?.data,
      stack: error.stack
    });
  }

  /**
   * Response body loglama
   */
  static logResponse(context: string, response: any): void {
    console.log(`📊 ${context}:`, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    });
  }
}

/**
 * CURL örnekleri
 */
export const curlExamples = {
  auth: `curl -X POST https://api.ilovepdf.com/v1/auth \\
  -H "Content-Type: application/json" \\
  -d '{"public_key": "YOUR_PUBLIC_KEY"}'`,

  start: `curl -X POST https://api.ilovepdf.com/v1/start/officepdf \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json"`,

  upload: `curl -X POST https://SERVER.ilovepdf.com/v1/upload \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -F "task=YOUR_TASK_ID" \\
  -F "file=@input.pdf"`,

  process: `curl -X POST https://SERVER.ilovepdf.com/v1/process \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"task": "YOUR_TASK_ID"}'`,

  download: `curl -X GET https://SERVER.ilovepdf.com/v1/download/YOUR_TASK_ID \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  --output result.docx`
};
