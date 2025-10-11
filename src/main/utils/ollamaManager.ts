/**
 * Ollama Manager - Otomatik başlatma ve kontrol
 */

import { spawn, ChildProcess } from 'child_process';
import { checkGPUAvailability, configureOllamaGPU } from './gpuHelper';

export interface OllamaStatus {
  running: boolean;
  url: string;
  gpuEnabled: boolean;
  error?: string;
}

let ollamaProcess: ChildProcess | null = null;
const OLLAMA_URL = process.env.LLAMA_SERVER_URL || 'http://127.0.0.1:11434';

/**
 * Ollama sunucusunun çalışıp çalışmadığını kontrol et
 */
export async function checkOllamaServer(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000) // 3 saniye timeout
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * GPU kullanılabilirliğini kontrol et ve yapılandır
 */
async function configureGPUSettings(): Promise<boolean> {
  const hasGPU = await checkGPUAvailability();
  
  if (hasGPU) {
    console.log('✅ NVIDIA GPU tespit edildi - GPU modunda başlatılacak');
    configureOllamaGPU(true);
    return true;
  } else {
    console.log('⚠️ GPU bulunamadı - CPU modunda başlatılacak');
    configureOllamaGPU(false);
    return false;
  }
}

/**
 * Ollama sunucusunu otomatik başlat
 */
export async function startOllamaServer(): Promise<{ success: boolean; gpuEnabled: boolean; error?: string }> {
  try {
    // Önce çalışıyor mu kontrol et
    const isRunning = await checkOllamaServer();
    if (isRunning) {
      console.log('ℹ️ Ollama zaten çalışıyor');
      const gpuEnabled = await checkGPUAvailability();
      return { success: true, gpuEnabled };
    }

    console.log('🚀 Ollama sunucusu başlatılıyor...');

    // GPU ayarlarını yapılandır
    const gpuEnabled = await configureGPUSettings();

    // Ollama'yı başlat
    ollamaProcess = spawn('ollama', ['serve'], {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        OLLAMA_NUM_GPU: gpuEnabled ? '1' : '0',
        CUDA_VISIBLE_DEVICES: gpuEnabled ? '0' : '-1'
      }
    });

    // Process output'u logla
    ollamaProcess.stdout?.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        console.log(`[Ollama] ${message}`);
      }
    });

    ollamaProcess.stderr?.on('data', (data) => {
      const message = data.toString().trim();
      if (message && !message.includes('Listening on')) {
        console.warn(`[Ollama] ${message}`);
      }
    });

    ollamaProcess.on('error', (error) => {
      console.error('❌ Ollama başlatma hatası:', error);
    });

    ollamaProcess.on('exit', (code) => {
      console.log(`⚠️ Ollama süreci sonlandı (kod: ${code})`);
      ollamaProcess = null;
    });

    // Sunucunun başlaması için bekle (max 10 saniye)
    let attempts = 0;
    const maxAttempts = 20; // 20 x 500ms = 10 saniye
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const running = await checkOllamaServer();
      if (running) {
        console.log(`✅ Ollama başarıyla başlatıldı (${OLLAMA_URL})`);
        console.log(`🎮 GPU Modu: ${gpuEnabled ? 'Aktif' : 'Devre Dışı'}`);
        return { success: true, gpuEnabled };
      }
      
      attempts++;
    }

    throw new Error('Ollama başlatıldı ama sunucu yanıt vermiyor');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    console.error('❌ Ollama başlatma hatası:', errorMessage);
    
    // Eğer Ollama kurulu değilse kullanıcıya bilgi ver
    if (errorMessage.includes('ENOENT') || errorMessage.includes('not found')) {
      return {
        success: false,
        gpuEnabled: false,
        error: 'Ollama kurulu değil. Lütfen https://ollama.ai adresinden Ollama\'yı indirin ve kurun.'
      };
    }
    
    return {
      success: false,
      gpuEnabled: false,
      error: errorMessage
    };
  }
}

/**
 * Ollama sunucusunu durdur
 */
export function stopOllamaServer(): void {
  if (ollamaProcess) {
    console.log('🛑 Ollama sunucusu durduruluyor...');
    ollamaProcess.kill();
    ollamaProcess = null;
  }
}

/**
 * Ollama durumunu al
 */
export async function getOllamaStatus(): Promise<OllamaStatus> {
  const running = await checkOllamaServer();
  const gpuEnabled = await checkGPUAvailability();
  
  return {
    running,
    url: OLLAMA_URL,
    gpuEnabled: gpuEnabled && running
  };
}

/**
 * Ollama'yı otomatik başlat veya kontrol et
 */
export async function ensureOllamaRunning(): Promise<OllamaStatus> {
  const status = await getOllamaStatus();
  
  if (!status.running) {
    console.log('⚠️ Ollama çalışmıyor - otomatik başlatılıyor...');
    const result = await startOllamaServer();
    
    return {
      running: result.success,
      url: OLLAMA_URL,
      gpuEnabled: result.gpuEnabled,
      error: result.error
    };
  }
  
  console.log('✅ Ollama zaten çalışıyor');
  return status;
}

