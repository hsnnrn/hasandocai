import Store from 'electron-store';
import path from 'path';
import fs from 'fs/promises';

export interface ConversionRecord {
  id: string;
  timestamp: number;
  inputFile: string;
  outputFile: string;
  inputFormat: string;
  outputFormat: string;
  fileSize: number;
  processingTime: number;
  success: boolean;
  error?: string;
  metadata?: any;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  settings: any;
  createdAt: number;
  updatedAt: number;
}

export interface HistoryFilter {
  startDate?: number;
  endDate?: number;
  inputFormat?: string;
  outputFormat?: string;
  success?: boolean;
  limit?: number;
}

export class LocalDataService {
  private store: Store<any>;
  private dataDir: string;

  constructor() {
    this.store = new Store({
      name: 'document-converter-data',
      defaults: {
        conversions: [],
        templates: [],
        settings: {
          theme: 'light',
          autoCleanup: true,
          maxHistoryItems: 1000,
          cacheSize: 500, // MB
        },
      },
    });

    this.dataDir = path.join(this.store.path, '..', 'document-converter-data');
    this.ensureDataDir();
  }

  private async ensureDataDir(): Promise<void> {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  // Conversion History Management
  async saveConversion(record: ConversionRecord): Promise<void> {
    const conversions = this.getConversionsFromStore();
    
    // Add new record
    conversions.unshift(record);
    
    // Limit history size
    const maxItems = this.store.get('settings.maxHistoryItems', 1000) as number;
    if (conversions.length > maxItems) {
      conversions.splice(maxItems);
    }
    
    this.store.set('conversions', conversions);
  }

  async getConversionHistory(filter?: HistoryFilter): Promise<ConversionRecord[]> {
    let conversions = this.getConversionsFromStore();
    
    if (filter) {
      conversions = conversions.filter(conv => {
        if (filter.startDate && conv.timestamp < filter.startDate) return false;
        if (filter.endDate && conv.timestamp > filter.endDate) return false;
        if (filter.inputFormat && conv.inputFormat !== filter.inputFormat) return false;
        if (filter.outputFormat && conv.outputFormat !== filter.outputFormat) return false;
        if (filter.success !== undefined && conv.success !== filter.success) return false;
        return true;
      });
      
      if (filter.limit) {
        conversions = conversions.slice(0, filter.limit);
      }
    }
    
    return conversions;
  }

  async clearConversionHistory(): Promise<void> {
    this.store.set('conversions', []);
  }

  async deleteConversion(id: string): Promise<void> {
    const conversions = this.getConversionsFromStore();
    const filtered = conversions.filter(conv => conv.id !== id);
    this.store.set('conversions', filtered);
  }

  // Template Management
  async saveTemplate(template: Template): Promise<void> {
    const templates = this.getTemplatesFromStore();
    
    const existingIndex = templates.findIndex(t => t.id === template.id);
    if (existingIndex >= 0) {
      templates[existingIndex] = { ...template, updatedAt: Date.now() };
    } else {
      templates.push({ ...template, createdAt: Date.now(), updatedAt: Date.now() });
    }
    
    this.store.set('templates', templates);
  }

  async getTemplates(): Promise<Template[]> {
    return this.getTemplatesFromStore();
  }

  async getTemplate(id: string): Promise<Template | null> {
    const templates = this.getTemplatesFromStore();
    return templates.find(t => t.id === id) || null;
  }

  async deleteTemplate(id: string): Promise<void> {
    const templates = this.getTemplatesFromStore();
    const filtered = templates.filter(t => t.id !== id);
    this.store.set('templates', filtered);
  }

  // Cache Management
  async setCacheData(key: string, data: any): Promise<void> {
    const cacheFile = path.join(this.dataDir, `cache_${key}.json`);
    await fs.writeFile(cacheFile, JSON.stringify(data));
  }

  async getCacheData(key: string): Promise<any> {
    try {
      const cacheFile = path.join(this.dataDir, `cache_${key}.json`);
      const data = await fs.readFile(cacheFile, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async clearCache(): Promise<void> {
    try {
      const files = await fs.readdir(this.dataDir);
      const cacheFiles = files.filter(file => file.startsWith('cache_'));
      
      await Promise.all(
        cacheFiles.map(file => fs.unlink(path.join(this.dataDir, file)))
      );
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  // Statistics and Analytics
  async getConversionStats(): Promise<any> {
    const conversions = this.getConversionsFromStore();
    
    const stats = {
      totalConversions: conversions.length,
      successfulConversions: conversions.filter(c => c.success).length,
      failedConversions: conversions.filter(c => !c.success).length,
      averageProcessingTime: 0,
      totalDataProcessed: 0,
      formatStats: {} as Record<string, number>,
      recentActivity: [] as any[],
    };

    if (conversions.length > 0) {
      stats.averageProcessingTime = conversions.reduce((sum, c) => sum + c.processingTime, 0) / conversions.length;
      stats.totalDataProcessed = conversions.reduce((sum, c) => sum + c.fileSize, 0);
      
      // Format statistics
      conversions.forEach(conv => {
        const key = `${conv.inputFormat}_to_${conv.outputFormat}`;
        stats.formatStats[key] = (stats.formatStats[key] || 0) + 1;
      });
      
      // Recent activity (last 7 days)
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      stats.recentActivity = conversions
        .filter(c => c.timestamp > sevenDaysAgo)
        .slice(0, 10);
    }
    
    return stats;
  }

  // Export/Import Data
  async exportData(): Promise<string> {
    const data = {
      conversions: this.getConversionsFromStore(),
      templates: this.getTemplatesFromStore(),
      settings: this.store.get('settings'),
      exportDate: Date.now(),
      version: '1.0.0',
    };
    
    const exportFile = path.join(this.dataDir, `export_${Date.now()}.json`);
    await fs.writeFile(exportFile, JSON.stringify(data, null, 2));
    
    return exportFile;
  }

  async importData(filePath: string): Promise<void> {
    try {
      const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      
      if (data.conversions) {
        this.store.set('conversions', data.conversions);
      }
      
      if (data.templates) {
        this.store.set('templates', data.templates);
      }
      
      if (data.settings) {
        const currentSettings = this.store.get('settings') || {};
        this.store.set('settings', { ...currentSettings, ...data.settings });
      }
    } catch (error) {
      throw new Error(`Import failed: ${error}`);
    }
  }

  // Settings Management
  async getSetting(key: string): Promise<any> {
    return this.store.get(`settings.${key}`);
  }

  async setSetting(key: string, value: any): Promise<void> {
    this.store.set(`settings.${key}`, value);
  }

  async getAllSettings(): Promise<any> {
    return this.store.get('settings');
  }

  async resetSettings(): Promise<void> {
    this.store.set('settings', {
      theme: 'light',
      autoCleanup: true,
      maxHistoryItems: 1000,
      cacheSize: 500,
    });
  }

  // Cleanup and Maintenance
  async performCleanup(): Promise<void> {
    const settings = await this.getAllSettings();
    
    if (settings.autoCleanup) {
      // Clean old cache files
      await this.clearCache();
      
      // Limit conversion history
      const conversions = this.getConversionsFromStore();
      if (conversions.length > settings.maxHistoryItems) {
        const trimmed = conversions.slice(0, settings.maxHistoryItems);
        this.store.set('conversions', trimmed);
      }
      
      // Clean old files
      await this.cleanOldFiles();
    }
  }

  private async cleanOldFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.dataDir);
      const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      for (const file of files) {
        const filePath = path.join(this.dataDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < oneMonthAgo) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error('File cleanup error:', error);
    }
  }

  // Helper methods
  private getConversionsFromStore(): ConversionRecord[] {
    return this.store.get('conversions', []) as ConversionRecord[];
  }

  private getTemplatesFromStore(): Template[] {
    return this.store.get('templates', []) as Template[];
  }
}
