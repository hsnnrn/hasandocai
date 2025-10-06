/**
 * LLM Runner - Llama.cpp Integration
 * 
 * Llama-3.2 model ile entegrasyon sağlar.
 * llama.cpp binary kullanarak subprocess olarak çalıştırır.
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { app } from 'electron';

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

export class LLMRunner {
  private config: LLMConfig;
  private process: ChildProcess | null = null;
  private isInitialized: boolean = false;

  constructor(modelPath: string) {
    this.config = {
      modelPath,
      maxTokens: 512,
      temperature: 0.7,
      timeout: 60000 // 60 seconds
    };
  }

  /**
   * Initialize LLM runner
   */
  async initialize(): Promise<void> {
    try {
      console.log('🤖 Initializing LLM runner...');
      
      // Check if model file exists
      const fs = await import('fs/promises');
      try {
        await fs.access(this.config.modelPath);
        console.log('✅ Model file found:', this.config.modelPath);
      } catch (error) {
        console.warn('⚠️ Model file not found:', this.config.modelPath);
        console.warn('Please download and place the model file as instructed in README');
      }

      this.isInitialized = true;
      console.log('✅ LLM runner initialized');
    } catch (error) {
      console.error('❌ Failed to initialize LLM runner:', error);
      throw error;
    }
  }

  /**
   * Generate response using LLM
   */
  async generateResponse(prompt: string, options: GenerationOptions = {}): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('LLM runner not initialized');
    }

    const maxTokens = options.maxTokens || this.config.maxTokens;
    const temperature = options.temperature || this.config.temperature;
    const timeout = options.timeout || this.config.timeout;

    return new Promise((resolve, reject) => {
      try {
        console.log('🧠 Generating LLM response...');
        
        // Get llama.cpp binary path
        const llamaPath = this.getLlamaPath();
        
        // Prepare command arguments
        const args = [
          '-m', this.config.modelPath,
          '--temp', temperature.toString(),
          '--n-predict', maxTokens.toString(),
          '--prompt', prompt,
          '--no-display-prompt'
        ];

        console.log('🚀 Starting llama.cpp process:', llamaPath);
        console.log('📝 Args:', args);

        // Spawn llama.cpp process
        const process = spawn(llamaPath, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: path.dirname(llamaPath)
        });

        this.process = process;

        let output = '';
        let errorOutput = '';

        // Handle stdout
        process.stdout?.on('data', (data) => {
          const chunk = data.toString();
          output += chunk;
          console.log('📤 LLM output chunk:', chunk);
        });

        // Handle stderr
        process.stderr?.on('data', (data) => {
          const chunk = data.toString();
          errorOutput += chunk;
          console.log('⚠️ LLM stderr:', chunk);
        });

        // Handle process completion
        process.on('close', (code) => {
          console.log(`🏁 LLM process finished with code: ${code}`);
          
          if (code === 0) {
            // Clean up the output
            const cleanOutput = this.cleanOutput(output);
            console.log('✅ LLM response generated:', cleanOutput);
            resolve(cleanOutput);
          } else {
            console.error('❌ LLM process failed with code:', code);
            console.error('❌ Error output:', errorOutput);
            reject(new Error(`LLM process failed with code ${code}: ${errorOutput}`));
          }
        });

        // Handle process errors
        process.on('error', (error) => {
          console.error('❌ LLM process error:', error);
          reject(new Error(`LLM process error: ${error.message}`));
        });

        // Set timeout
        const timeoutId = setTimeout(() => {
          console.warn('⏰ LLM process timeout, killing process...');
          if (this.process) {
            this.process.kill('SIGTERM');
            reject(new Error('LLM process timeout'));
          }
        }, timeout);

        // Clear timeout when process completes
        process.on('close', () => {
          clearTimeout(timeoutId);
        });

      } catch (error) {
        console.error('❌ Failed to start LLM process:', error);
        reject(error);
      }
    });
  }

  /**
   * Get llama.cpp binary path
   */
  private getLlamaPath(): string {
    const platform = process.platform;
    const arch = process.arch;
    
    // Try to find llama.cpp binary in different locations
    const possiblePaths = [
      // Local build
      path.join(__dirname, '..', '..', '..', 'llama.cpp', 'main'),
      path.join(__dirname, '..', '..', '..', 'llama.cpp', 'main.exe'),
      
      // System PATH
      'main',
      'main.exe',
      
      // User data directory
      path.join(app.getPath('userData'), 'llama.cpp', 'main'),
      path.join(app.getPath('userData'), 'llama.cpp', 'main.exe'),
      
      // Common installation paths
      path.join(process.env.USERPROFILE || '', 'llama.cpp', 'main.exe'),
      path.join(process.env.HOME || '', 'llama.cpp', 'main'),
    ];

    // Filter by platform
    const filteredPaths = possiblePaths.filter(p => {
      if (platform === 'win32') {
        return p.endsWith('.exe') || p.includes('main');
      } else {
        return !p.endsWith('.exe');
      }
    });

    // Return the first path (will be checked for existence later)
    return filteredPaths[0] || 'main';
  }

  /**
   * Clean up LLM output
   */
  private cleanOutput(output: string): string {
    // Remove common llama.cpp artifacts
    let cleaned = output
      .replace(/^.*?\[INST\].*?\[/INST\]/s, '') // Remove [INST] tags
      .replace(/^.*?<s>.*?<\/s>/s, '') // Remove <s> tags
      .replace(/^.*?### Human:.*?### Assistant:/s, '') // Remove conversation markers
      .replace(/^.*?### Human:.*?### Assistant/s, '') // Remove incomplete conversation markers
      .replace(/^.*?Human:.*?Assistant:/s, '') // Remove simple conversation markers
      .replace(/^.*?Human:.*?Assistant/s, '') // Remove incomplete simple conversation markers
      .trim();

    // Remove any remaining prompt artifacts
    const lines = cleaned.split('\n');
    const filteredLines = lines.filter(line => {
      // Skip empty lines and common artifacts
      if (!line.trim()) return false;
      if (line.includes('### Human:')) return false;
      if (line.includes('### Assistant:')) return false;
      if (line.includes('[INST]')) return false;
      if (line.includes('[/INST]')) return false;
      if (line.includes('<s>')) return false;
      if (line.includes('</s>')) return false;
      return true;
    });

    return filteredLines.join('\n').trim();
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
      if (this.process) {
        console.log('🧹 Cleaning up LLM process...');
        this.process.kill('SIGTERM');
        this.process = null;
      }
      console.log('✅ LLM runner cleanup completed');
    } catch (error) {
      console.error('❌ Error during LLM cleanup:', error);
    }
  }
}
