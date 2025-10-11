/**
 * Local Storage Service for AI Data
 * ✅ SADE VE BASİT: Sadece Electron persistent storage kullanır
 * - Her zaman diske kaydeder (veri kaybı olmaz)
 * - Browser localStorage kullanmaz
 * - Enabled/disabled kontrolü yok (her zaman aktif)
 */

export interface AIData {
  id: string
  type: 'embedding' | 'analysis' | 'conversion' | 'extraction'
  content: any
  metadata: {
    timestamp: string
    source?: string
    model?: string
    version?: string
  }
  filePath?: string
  fileHash?: string
}

export interface LocalStorageStats {
  totalItems: number
  totalSize: number
  lastUpdated: string
  itemsByType: Record<string, number>
}

class LocalStorageService {
  constructor() {
    console.log('✅ Local Storage Service - HER ZAMAN AKTİF')
  }

  /**
   * Check if local storage is enabled
   * ✅ HER ZAMAN TRUE - veri kaybı olmaz
   */
  isEnabled(): boolean {
    return true
  }

  /**
   * Enable or disable local storage (artık gerek yok ama uyumluluk için)
   */
  setEnabled(enabled: boolean): void {
    // Artık bir şey yapmıyor - her zaman aktif
    console.log('ℹ️ Local storage her zaman aktif - bu ayar artık kullanılmıyor')
  }

  /**
   * Save AI data to persistent storage
   * ✅ SADE VE BASİT: Sadece persistent storage'a kaydet
   */
  async saveData(data: AIData): Promise<{ 
    success: boolean
    error?: string 
  }> {
    try {
      const electronAPI = (window as any).electronAPI
      if (!electronAPI?.persistentStorage) {
        throw new Error('Persistent storage not available')
      }

      const result = await electronAPI.persistentStorage.saveData(data)
      
      if (result?.success) {
        console.log(`💾 Veri kaydedildi: ${data.id}`)
        return { success: true }
      } else {
        throw new Error(result?.error || 'Save failed')
      }
    } catch (error) {
      console.error('❌ Kaydetme hatası:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Retrieve AI data from persistent storage
   * ✅ SADE VE BASİT: Persistent storage'dan oku
   */
  async getData(id: string): Promise<AIData | null> {
    try {
      const electronAPI = (window as any).electronAPI
      if (!electronAPI?.persistentStorage) {
        return null
      }

      const result = await electronAPI.persistentStorage.getData(id)
      return result?.success ? result.data : null
    } catch (error) {
      console.error('Failed to retrieve AI data:', error)
      return null
    }
  }

  /**
   * Get all AI data of a specific type
   * ✅ SADE VE BASİT: Persistent storage'dan oku
   */
  async getDataByType(type: AIData['type']): Promise<AIData[]> {
    try {
      const electronAPI = (window as any).electronAPI
      if (!electronAPI?.persistentStorage) {
        return []
      }

      const result = await electronAPI.persistentStorage.getDataByType(type)
      return result?.success ? result.data : []
    } catch (error) {
      console.error('Failed to retrieve AI data by type:', error)
      return []
    }
  }

  /**
   * Get all stored AI data
   * ✅ SADE VE BASİT: Persistent storage'dan oku
   */
  async getAllData(): Promise<AIData[]> {
    try {
      const electronAPI = (window as any).electronAPI
      if (!electronAPI?.persistentStorage) {
        return []
      }

      const result = await electronAPI.persistentStorage.getAllData()
      return result?.success ? result.data : []
    } catch (error) {
      console.error('Failed to retrieve all AI data:', error)
      return []
    }
  }

  /**
   * Delete specific AI data
   * ✅ SADE VE BASİT: Persistent storage'dan sil
   */
  async deleteData(id: string): Promise<boolean> {
    try {
      const electronAPI = (window as any).electronAPI
      if (!electronAPI?.persistentStorage) {
        return false
      }

      const result = await electronAPI.persistentStorage.deleteData(id)
      return result?.success || false
    } catch (error) {
      console.error('Failed to delete AI data:', error)
      return false
    }
  }

  /**
   * Clear all AI data
   * ✅ SADE VE BASİT: Persistent storage'ı temizle
   */
  async clearAllData(): Promise<boolean> {
    try {
      const electronAPI = (window as any).electronAPI
      if (!electronAPI?.persistentStorage) {
        return false
      }

      const result = await electronAPI.persistentStorage.clearAllData()
      return result?.success || false
    } catch (error) {
      console.error('Failed to clear AI data:', error)
      return false
    }
  }

  /**
   * Get storage statistics
   * ✅ SADE VE BASİT: Persistent storage'dan istatistik al
   */
  async getStats(): Promise<LocalStorageStats> {
    const defaultStats: LocalStorageStats = {
      totalItems: 0,
      totalSize: 0,
      lastUpdated: '',
      itemsByType: {}
    }

    try {
      const electronAPI = (window as any).electronAPI
      if (!electronAPI?.persistentStorage) {
        return defaultStats
      }

      const result = await electronAPI.persistentStorage.getStats()
      return result?.success ? result.stats : defaultStats
    } catch (error) {
      console.error('Failed to get storage stats:', error)
      return defaultStats
    }
  }

  /**
   * Export all AI data as JSON
   * ✅ SADE VE BASİT: Persistent storage'dan export
   */
  async exportData(): Promise<string | null> {
    try {
      const electronAPI = (window as any).electronAPI
      if (!electronAPI?.persistentStorage) {
        return null
      }

      const result = await electronAPI.persistentStorage.exportData()
      return result?.success ? result.data : null
    } catch (error) {
      console.error('Failed to export AI data:', error)
      return null
    }
  }

  /**
   * Import AI data from JSON
   * ✅ SADE VE BASİT: Persistent storage'a import
   */
  async importData(jsonData: string): Promise<{ success: boolean; imported: number; errors: string[] }> {
    const defaultResult = {
      success: false,
      imported: 0,
      errors: [] as string[]
    }

    try {
      const electronAPI = (window as any).electronAPI
      if (!electronAPI?.persistentStorage) {
        defaultResult.errors.push('Persistent storage not available')
        return defaultResult
      }

      const result = await electronAPI.persistentStorage.importData(jsonData)
      return result || defaultResult
    } catch (error) {
      defaultResult.errors.push(`Import failed: ${error}`)
      return defaultResult
    }
  }

  /**
   * Get data by file path (useful for finding related data)
   * ✅ SADE VE BASİT: Persistent storage'dan ara
   */
  async getDataByFilePath(filePath: string): Promise<AIData[]> {
    try {
      const electronAPI = (window as any).electronAPI
      if (!electronAPI?.persistentStorage) {
        return []
      }

      const result = await electronAPI.persistentStorage.getDataByFilePath(filePath)
      return result?.success ? result.data : []
    } catch (error) {
      console.error('Failed to retrieve AI data by file path:', error)
      return []
    }
  }

  /**
   * Search AI data by content or metadata
   * ✅ SADE VE BASİT: Persistent storage'da ara
   */
  async searchData(query: string): Promise<AIData[]> {
    try {
      const electronAPI = (window as any).electronAPI
      if (!electronAPI?.persistentStorage) {
        return []
      }

      const result = await electronAPI.persistentStorage.searchData(query)
      return result?.success ? result.data : []
    } catch (error) {
      console.error('Failed to search AI data:', error)
      return []
    }
  }
}

// Export singleton instance
export const localStorageService = new LocalStorageService()
export default localStorageService
