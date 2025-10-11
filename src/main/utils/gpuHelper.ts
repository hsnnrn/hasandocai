/**
 * GPU Helper - GPU kontrolü ve optimizasyon yardımcıları
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GPUInfo {
  available: boolean;
  name?: string;
  memoryTotal?: number;
  memoryUsed?: number;
  memoryFree?: number;
}

/**
 * NVIDIA GPU varlığını kontrol et
 */
export async function checkGPUAvailability(): Promise<boolean> {
  try {
    await execAsync('nvidia-smi');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * GPU bilgilerini al
 */
export async function getGPUInfo(): Promise<GPUInfo> {
  try {
    const { stdout: name } = await execAsync(
      'nvidia-smi --query-gpu=name --format=csv,noheader'
    );
    
    const { stdout: memoryInfo } = await execAsync(
      'nvidia-smi --query-gpu=memory.total,memory.used,memory.free --format=csv,noheader,nounits'
    );
    
    const [memoryTotal, memoryUsed, memoryFree] = memoryInfo.trim().split(',').map(v => parseInt(v.trim()));
    
    return {
      available: true,
      name: name.trim(),
      memoryTotal,
      memoryUsed,
      memoryFree,
    };
  } catch (error) {
    return { available: false };
  }
}

/**
 * GPU bellek kullanımını kontrol et (MB)
 */
export async function checkGPUMemory(): Promise<number> {
  try {
    const { stdout } = await execAsync(
      'nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits'
    );
    return parseInt(stdout.trim());
  } catch (error) {
    return 0;
  }
}

/**
 * GPU bellek yeterli mi kontrol et
 */
export async function hasEnoughGPUMemory(requiredMB: number = 3000): Promise<boolean> {
  try {
    const info = await getGPUInfo();
    if (!info.available || !info.memoryFree) {
      return false;
    }
    
    return info.memoryFree >= requiredMB;
  } catch (error) {
    return false;
  }
}

/**
 * Ollama model'lerini GPU'dan kaldır (bellek temizliği)
 */
export async function unloadOllamaModels(): Promise<boolean> {
  try {
    const ollamaUrl = process.env.LLAMA_SERVER_URL || 'http://127.0.0.1:11434';
    
    // Yüklü modelleri listele
    const listResponse = await fetch(`${ollamaUrl}/api/tags`);
    if (!listResponse.ok) {
      throw new Error('Failed to list models');
    }
    
    const { models } = await listResponse.json();
    
    // Her modeli unload et
    for (const model of models) {
      try {
        await fetch(`${ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model.name,
            keep_alive: 0, // Immediately unload
          }),
        });
        console.log(`✅ Unloaded model: ${model.name}`);
      } catch (error) {
        console.warn(`⚠️ Failed to unload ${model.name}:`, error);
      }
    }
    
    console.log('🧹 GPU memory cleanup completed');
    return true;
  } catch (error) {
    console.error('❌ Failed to unload models:', error);
    return false;
  }
}

/**
 * GPU bellek temizliği yap
 */
export async function cleanupGPUMemory(): Promise<{
  success: boolean;
  freedMemoryMB?: number;
  error?: string;
}> {
  try {
    // Başlangıçta bellek kullanımını al
    const memoryBefore = await checkGPUMemory();
    
    // Ollama modellerini kaldır
    const unloaded = await unloadOllamaModels();
    
    if (!unloaded) {
      return {
        success: false,
        error: 'Model unload işlemi başarısız',
      };
    }
    
    // 2 saniye bekle (GPU'nun belleği serbest bırakması için)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Son bellek kullanımını al
    const memoryAfter = await checkGPUMemory();
    const freedMemory = memoryBefore - memoryAfter;
    
    console.log(`🧹 GPU Cleanup: ${memoryBefore}MB → ${memoryAfter}MB (freed: ${freedMemory}MB)`);
    
    return {
      success: true,
      freedMemoryMB: freedMemory,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Cleanup failed',
    };
  }
}

/**
 * GPU bellek kullanımını kontrol et ve gerekirse temizle
 */
export async function checkAndCleanupIfNeeded(thresholdMB: number = 6000): Promise<{
  cleaned: boolean;
  memoryUsed: number;
  memoryFree?: number;
}> {
  const info = await getGPUInfo();
  
  if (!info.available) {
    return { cleaned: false, memoryUsed: 0 };
  }
  
  const memoryUsed = info.memoryUsed || 0;
  const memoryFree = info.memoryFree || 0;
  
  // Eşik değeri aşıldıysa temizle
  if (memoryUsed > thresholdMB || memoryFree < 1000) {
    console.warn(`⚠️ GPU memory high: ${memoryUsed}MB used, ${memoryFree}MB free`);
    console.log('🧹 Starting automatic cleanup...');
    
    const result = await cleanupGPUMemory();
    
    return {
      cleaned: result.success,
      memoryUsed,
      memoryFree,
    };
  }
  
  return {
    cleaned: false,
    memoryUsed,
    memoryFree,
  };
}

/**
 * Ollama için GPU ayarlarını yapılandır
 */
export function configureOllamaGPU(gpuEnabled: boolean): void {
  if (gpuEnabled) {
    process.env.OLLAMA_NUM_GPU = '1';
    console.log('✅ Ollama GPU mode enabled');
  } else {
    process.env.OLLAMA_NUM_GPU = '0';
    console.log('⚠️ Ollama CPU mode enabled');
  }
}

/**
 * GPU sistem bilgisini logla
 */
export async function logGPUInfo(): Promise<void> {
  const info = await getGPUInfo();
  
  if (info.available) {
    console.log('🎮 GPU Information:');
    console.log(`   Name: ${info.name}`);
    console.log(`   Memory Total: ${info.memoryTotal} MB`);
    console.log(`   Memory Used: ${info.memoryUsed} MB`);
    console.log(`   Memory Free: ${info.memoryFree} MB`);
  } else {
    console.log('⚠️ GPU not available, using CPU mode');
  }
}

/**
 * GPU bellek monitörü başlat (periyodik kontrol ve otomatik temizleme)
 */
export function startGPUMemoryMonitor(
  intervalMs: number = 30000,
  warningThresholdMB: number = 6000,
  autoCleanup: boolean = true
): NodeJS.Timeout {
  console.log(`🔍 Starting GPU memory monitor (interval: ${intervalMs}ms, threshold: ${warningThresholdMB}MB, autoCleanup: ${autoCleanup})`);
  
  return setInterval(async () => {
    const info = await getGPUInfo();
    
    if (!info.available) {
      return;
    }
    
    const memoryUsed = info.memoryUsed || 0;
    const memoryFree = info.memoryFree || 0;
    const memoryTotal = info.memoryTotal || 0;
    const usagePercentage = memoryTotal > 0 ? (memoryUsed / memoryTotal) * 100 : 0;
    
    // Log her zaman (debug için)
    if (memoryUsed > 100) { // Sadece GPU kullanılıyorsa log
      console.log(`📊 GPU Memory: ${memoryUsed}MB / ${memoryTotal}MB (${usagePercentage.toFixed(1)}% used, ${memoryFree}MB free)`);
    }
    
    // Eşik kontrolü
    if (memoryUsed > warningThresholdMB) {
      console.warn(`⚠️ GPU memory HIGH: ${memoryUsed}MB / ${memoryTotal}MB (threshold: ${warningThresholdMB}MB)`);
      
      // Otomatik temizleme yapılsın mı?
      if (autoCleanup) {
        console.log('🧹 Triggering automatic GPU cleanup...');
        const result = await cleanupGPUMemory();
        
        if (result.success) {
          console.log(`✅ Cleanup successful! Freed ${result.freedMemoryMB}MB`);
        } else {
          console.error(`❌ Cleanup failed: ${result.error}`);
        }
      }
    }
  }, intervalMs);
}

/**
 * GPU optimizasyon önerileri
 */
export async function getGPUOptimizationRecommendations(): Promise<{
  useGPU: boolean;
  quantization: 'q4_k_m' | 'q8_0' | 'fp16';
  maxContextLength: number;
  batchSize: number;
}> {
  const info = await getGPUInfo();
  
  if (!info.available || !info.memoryFree) {
    // CPU modu önerileri
    return {
      useGPU: false,
      quantization: 'q4_k_m',
      maxContextLength: 8000,
      batchSize: 1,
    };
  }
  
  // GPU belleğine göre optimizasyonlar
  if (info.memoryFree < 3000) {
    // Düşük bellek (< 3GB)
    return {
      useGPU: false, // CPU kullan
      quantization: 'q4_k_m',
      maxContextLength: 8000,
      batchSize: 1,
    };
  } else if (info.memoryFree < 6000) {
    // Orta bellek (3-6GB)
    return {
      useGPU: true,
      quantization: 'q4_k_m',
      maxContextLength: 15000,
      batchSize: 2,
    };
  } else {
    // Yüksek bellek (> 6GB)
    return {
      useGPU: true,
      quantization: 'q8_0', // Daha yüksek kalite
      maxContextLength: 32000,
      batchSize: 4,
    };
  }
}

