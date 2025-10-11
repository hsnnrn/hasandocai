/**
 * Persistent Local Storage Service
 * Uses Electron Store for persistent data storage across app restarts
 * Prevents data loss when PC is restarted
 */

import Store from 'electron-store';

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

export class PersistentLocalStorage {
  private store: Store<any>
  private readonly DATA_KEY = 'ai-storage-data'
  private readonly METADATA_KEY = 'ai-storage-metadata'

  constructor() {
    // Initialize electron-store for persistent storage (WITHOUT ENCRYPTION for max performance)
    this.store = new Store({
      name: 'local-ai-storage',
      defaults: {
        [this.DATA_KEY]: {},
        [this.METADATA_KEY]: {
          enabled: true, // ✅ HER ZAMAN AKTİF
          lastUpdated: new Date().toISOString(),
          stats: {
            totalItems: 0,
            totalSize: 0,
            lastUpdated: '',
            itemsByType: {}
          }
        }
      },
      // ❌ Şifreleme KALDIRILDI - Maksimum hız için
      // Clear invalid data on error
      clearInvalidConfig: true,
      // Performans optimizasyonları
      accessPropertiesByDotNotation: false, // Daha hızlı access
    })

    console.log('✅ PersistentLocalStorage initialized at:', this.store.path)
    console.log('📦 Local storage HER ZAMAN AKTİF - veri kaybı olmaz!')
  }

  /**
   * Check if local storage is enabled
   */
  isEnabled(): boolean {
    return this.store.get(`${this.METADATA_KEY}.enabled`, false) as boolean
  }

  /**
   * Enable or disable local storage
   */
  setEnabled(enabled: boolean): void {
    this.store.set(`${this.METADATA_KEY}.enabled`, enabled)
    this.store.set(`${this.METADATA_KEY}.lastUpdated`, new Date().toISOString())
    console.log(`📝 Local storage ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Save AI data to persistent storage
   * ✅ HER ZAMAN KAYDET - enabled kontrolü yok
   */
  saveData(data: AIData): { success: boolean; error?: string } {
    try {
      const allData = this.store.get(this.DATA_KEY, {}) as Record<string, any>
      
      // Add saved timestamp
      const dataToStore = {
        ...data,
        savedAt: new Date().toISOString()
      }
      
      allData[data.id] = dataToStore
      this.store.set(this.DATA_KEY, allData)
      this.updateMetadata()
      
      console.log(`💾 AI data saved persistently: ${data.id}`)
      return { success: true }
    } catch (error) {
      console.error('Failed to save AI data to persistent storage:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Retrieve AI data from persistent storage
   * ✅ HER ZAMAN OKUYA - enabled kontrolü yok
   */
  getData(id: string): AIData | null {
    try {
      const allData = this.store.get(this.DATA_KEY, {}) as Record<string, any>
      const stored = allData[id]
      
      if (!stored) {
        return null
      }

      // Remove the savedAt field as it's not part of the AIData interface
      const { savedAt, ...data } = stored
      return data as AIData
    } catch (error) {
      console.error('Failed to retrieve AI data from persistent storage:', error)
      return null
    }
  }

  /**
   * Get all AI data of a specific type
   * ✅ HER ZAMAN OKUYA - enabled kontrolü yok
   */
  getDataByType(type: AIData['type']): AIData[] {
    const results: AIData[] = []
    
    try {
      const allData = this.store.get(this.DATA_KEY, {}) as Record<string, any>
      
      for (const [key, stored] of Object.entries(allData)) {
        try {
          const { savedAt, ...data } = stored
          
          if (data.type === type) {
            results.push(data as AIData)
          }
        } catch (parseError) {
          console.warn(`Failed to parse stored data for key ${key}:`, parseError)
        }
      }
    } catch (error) {
      console.error('Failed to retrieve AI data by type:', error)
    }

    return results
  }

  /**
   * Get all stored AI data
   * ✅ HER ZAMAN OKUYA - enabled kontrolü yok
   */
  getAllData(): AIData[] {
    const results: AIData[] = []
    
    try {
      const allData = this.store.get(this.DATA_KEY, {}) as Record<string, any>
      
      for (const [key, stored] of Object.entries(allData)) {
        try {
          const { savedAt, ...data } = stored
          results.push(data as AIData)
        } catch (parseError) {
          console.warn(`Failed to parse stored data for key ${key}:`, parseError)
        }
      }
    } catch (error) {
      console.error('Failed to retrieve all AI data:', error)
    }

    return results
  }

  /**
   * Delete specific AI data
   * ✅ HER ZAMAN SİL - enabled kontrolü yok
   */
  deleteData(id: string): { success: boolean; error?: string } {
    try {
      const allData = this.store.get(this.DATA_KEY, {}) as Record<string, any>
      delete allData[id]
      this.store.set(this.DATA_KEY, allData)
      this.updateMetadata()
      
      console.log(`🗑️ AI data deleted from persistent storage: ${id}`)
      return { success: true }
    } catch (error) {
      console.error('Failed to delete AI data from persistent storage:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Clear all AI data
   * ✅ HER ZAMAN TEMİZLE - enabled kontrolü yok
   */
  clearAllData(): { success: boolean; error?: string } {
    try {
      this.store.set(this.DATA_KEY, {})
      this.updateMetadata()
      
      console.log('🗑️ All AI data cleared from persistent storage')
      return { success: true }
    } catch (error) {
      console.error('Failed to clear AI data from persistent storage:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get storage statistics
   * ✅ HER ZAMAN İSTATİSTİK - enabled kontrolü yok
   */
  getStats(): LocalStorageStats {
    const stats: LocalStorageStats = {
      totalItems: 0,
      totalSize: 0,
      lastUpdated: '',
      itemsByType: {}
    }

    try {
      const allData = this.store.get(this.DATA_KEY, {}) as Record<string, any>
      
      for (const [key, stored] of Object.entries(allData)) {
        try {
          const { savedAt, ...data } = stored
          
          stats.totalItems++
          
          // Calculate size (approximate)
          const itemSize = JSON.stringify(stored).length
          stats.totalSize += itemSize
          
          // Count by type
          if (!stats.itemsByType[data.type]) {
            stats.itemsByType[data.type] = 0
          }
          stats.itemsByType[data.type]++
          
          // Update last updated if this is newer
          if (savedAt && (!stats.lastUpdated || savedAt > stats.lastUpdated)) {
            stats.lastUpdated = savedAt
          }
        } catch (parseError) {
          console.warn(`Failed to parse stored data for key ${key}:`, parseError)
        }
      }
      
      // Convert size to KB
      stats.totalSize = Math.round(stats.totalSize / 1024)
    } catch (error) {
      console.error('Failed to get storage stats:', error)
    }

    return stats
  }

  /**
   * Export all AI data as JSON
   * ✅ HER ZAMAN EXPORT - enabled kontrolü yok
   */
  exportData(): { success: boolean; data?: string; error?: string } {
    try {
      const allData = this.getAllData()
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        totalItems: allData.length,
        data: allData
      }
      
      return {
        success: true,
        data: JSON.stringify(exportData, null, 2)
      }
    } catch (error) {
      console.error('Failed to export AI data:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Import AI data from JSON
   * ✅ HER ZAMAN IMPORT - enabled kontrolü yok
   */
  importData(jsonData: string): { success: boolean; imported: number; errors: string[] } {
    const result = {
      success: false,
      imported: 0,
      errors: [] as string[]
    }

    try {
      const parsed = JSON.parse(jsonData)
      
      if (!parsed.data || !Array.isArray(parsed.data)) {
        result.errors.push('Invalid data format')
        return result
      }

      for (const item of parsed.data) {
        try {
          // Validate required fields
          if (!item.id || !item.type || !item.content || !item.metadata) {
            result.errors.push(`Invalid item: missing required fields`)
            continue
          }

          // Save the item
          const saveResult = this.saveData(item)
          if (saveResult.success) {
            result.imported++
          } else {
            result.errors.push(`Failed to save item: ${item.id}`)
          }
        } catch (itemError) {
          result.errors.push(`Error processing item: ${itemError}`)
        }
      }

      result.success = result.imported > 0
    } catch (error) {
      result.errors.push(`Failed to parse JSON data: ${error}`)
    }

    return result
  }

  /**
   * Update metadata about stored data
   */
  private updateMetadata(): void {
    try {
      const stats = this.getStats()
      const metadata = {
        enabled: this.isEnabled(),
        lastUpdated: new Date().toISOString(),
        stats
      }
      
      this.store.set(this.METADATA_KEY, metadata)
    } catch (error) {
      console.error('Failed to update metadata:', error)
    }
  }

  /**
   * Get data by file path (useful for finding related data)
   * ✅ HER ZAMAN ARA - enabled kontrolü yok
   */
  getDataByFilePath(filePath: string): AIData[] {
    const results: AIData[] = []
    
    try {
      const allData = this.store.get(this.DATA_KEY, {}) as Record<string, any>
      
      for (const [key, stored] of Object.entries(allData)) {
        try {
          const { savedAt, ...data } = stored
          
          if (data.filePath === filePath) {
            results.push(data as AIData)
          }
        } catch (parseError) {
          console.warn(`Failed to parse stored data for key ${key}:`, parseError)
        }
      }
    } catch (error) {
      console.error('Failed to retrieve AI data by file path:', error)
    }

    return results
  }

  /**
   * Search AI data by content or metadata
   * ✅ HER ZAMAN ARA - enabled kontrolü yok
   */
  searchData(query: string): AIData[] {
    const results: AIData[] = []
    const searchTerm = query.toLowerCase()
    
    try {
      const allData = this.store.get(this.DATA_KEY, {}) as Record<string, any>
      
      for (const [key, stored] of Object.entries(allData)) {
        try {
          const { savedAt, ...data } = stored
          
          // Search in content and metadata
          const searchableText = JSON.stringify(data).toLowerCase()
          if (searchableText.includes(searchTerm)) {
            results.push(data as AIData)
          }
        } catch (parseError) {
          console.warn(`Failed to parse stored data for key ${key}:`, parseError)
        }
      }
    } catch (error) {
      console.error('Failed to search AI data:', error)
    }

    return results
  }

  /**
   * Get the store path (for debugging)
   */
  getStorePath(): string {
    return this.store.path
  }
}

