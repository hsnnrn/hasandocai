/**
 * Local Storage Service for AI Data
 * Handles saving and retrieving AI-generated data locally
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
  private readonly PREFIX = 'ai-data-'
  private readonly METADATA_KEY = 'ai-storage-metadata'

  /**
   * Check if local storage is enabled
   */
  isEnabled(): boolean {
    return localStorage.getItem('local-storage-enabled') === 'true'
  }

  /**
   * Enable or disable local storage
   */
  setEnabled(enabled: boolean): void {
    localStorage.setItem('local-storage-enabled', enabled.toString())
    localStorage.setItem('local-storage-last-updated', new Date().toISOString())
  }

  /**
   * Save AI data to local storage
   */
  saveData(data: AIData): boolean {
    if (!this.isEnabled()) {
      console.warn('Local storage is disabled')
      return false
    }

    try {
      const key = `${this.PREFIX}${data.id}`
      const dataToStore = {
        ...data,
        savedAt: new Date().toISOString()
      }
      
      localStorage.setItem(key, JSON.stringify(dataToStore))
      this.updateMetadata()
      
      console.log(`AI data saved locally: ${data.id}`)
      return true
    } catch (error) {
      console.error('Failed to save AI data to local storage:', error)
      return false
    }
  }

  /**
   * Retrieve AI data from local storage
   */
  getData(id: string): AIData | null {
    if (!this.isEnabled()) {
      return null
    }

    try {
      const key = `${this.PREFIX}${id}`
      const stored = localStorage.getItem(key)
      
      if (!stored) {
        return null
      }

      const parsed = JSON.parse(stored)
      // Remove the savedAt field as it's not part of the AIData interface
      const { savedAt, ...data } = parsed
      return data as AIData
    } catch (error) {
      console.error('Failed to retrieve AI data from local storage:', error)
      return null
    }
  }

  /**
   * Get all AI data of a specific type
   */
  getDataByType(type: AIData['type']): AIData[] {
    if (!this.isEnabled()) {
      return []
    }

    const results: AIData[] = []
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.PREFIX)) {
          const stored = localStorage.getItem(key)
          if (stored) {
            try {
              const parsed = JSON.parse(stored)
              const { savedAt, ...data } = parsed
              
              if (data.type === type) {
                results.push(data as AIData)
              }
            } catch (parseError) {
              console.warn(`Failed to parse stored data for key ${key}:`, parseError)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to retrieve AI data by type:', error)
    }

    return results
  }

  /**
   * Get all stored AI data
   */
  getAllData(): AIData[] {
    if (!this.isEnabled()) {
      return []
    }

    const results: AIData[] = []
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.PREFIX)) {
          const stored = localStorage.getItem(key)
          if (stored) {
            try {
              const parsed = JSON.parse(stored)
              const { savedAt, ...data } = parsed
              results.push(data as AIData)
            } catch (parseError) {
              console.warn(`Failed to parse stored data for key ${key}:`, parseError)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to retrieve all AI data:', error)
    }

    return results
  }

  /**
   * Delete specific AI data
   */
  deleteData(id: string): boolean {
    if (!this.isEnabled()) {
      return false
    }

    try {
      const key = `${this.PREFIX}${id}`
      localStorage.removeItem(key)
      this.updateMetadata()
      
      console.log(`AI data deleted from local storage: ${id}`)
      return true
    } catch (error) {
      console.error('Failed to delete AI data from local storage:', error)
      return false
    }
  }

  /**
   * Clear all AI data
   */
  clearAllData(): boolean {
    if (!this.isEnabled()) {
      return false
    }

    try {
      const keysToRemove: string[] = []
      
      // Collect all AI data keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.PREFIX)) {
          keysToRemove.push(key)
        }
      }
      
      // Remove all AI data keys
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      this.updateMetadata()
      
      console.log(`Cleared ${keysToRemove.length} AI data items from local storage`)
      return true
    } catch (error) {
      console.error('Failed to clear AI data from local storage:', error)
      return false
    }
  }

  /**
   * Get storage statistics
   */
  getStats(): LocalStorageStats {
    const stats: LocalStorageStats = {
      totalItems: 0,
      totalSize: 0,
      lastUpdated: '',
      itemsByType: {}
    }

    if (!this.isEnabled()) {
      return stats
    }

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.PREFIX)) {
          const stored = localStorage.getItem(key)
          if (stored) {
            try {
              const parsed = JSON.parse(stored)
              const { savedAt, ...data } = parsed
              
              stats.totalItems++
              stats.totalSize += key.length + stored.length
              
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
   */
  exportData(): string | null {
    if (!this.isEnabled()) {
      return null
    }

    try {
      const allData = this.getAllData()
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        totalItems: allData.length,
        data: allData
      }
      
      return JSON.stringify(exportData, null, 2)
    } catch (error) {
      console.error('Failed to export AI data:', error)
      return null
    }
  }

  /**
   * Import AI data from JSON
   */
  importData(jsonData: string): { success: boolean; imported: number; errors: string[] } {
    const result = {
      success: false,
      imported: 0,
      errors: [] as string[]
    }

    if (!this.isEnabled()) {
      result.errors.push('Local storage is disabled')
      return result
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
          const success = this.saveData(item)
          if (success) {
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
        lastUpdated: new Date().toISOString(),
        stats
      }
      
      localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata))
    } catch (error) {
      console.error('Failed to update metadata:', error)
    }
  }

  /**
   * Get data by file path (useful for finding related data)
   */
  getDataByFilePath(filePath: string): AIData[] {
    if (!this.isEnabled()) {
      return []
    }

    const results: AIData[] = []
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.PREFIX)) {
          const stored = localStorage.getItem(key)
          if (stored) {
            try {
              const parsed = JSON.parse(stored)
              const { savedAt, ...data } = parsed
              
              if (data.filePath === filePath) {
                results.push(data as AIData)
              }
            } catch (parseError) {
              console.warn(`Failed to parse stored data for key ${key}:`, parseError)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to retrieve AI data by file path:', error)
    }

    return results
  }

  /**
   * Search AI data by content or metadata
   */
  searchData(query: string): AIData[] {
    if (!this.isEnabled()) {
      return []
    }

    const results: AIData[] = []
    const searchTerm = query.toLowerCase()
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.PREFIX)) {
          const stored = localStorage.getItem(key)
          if (stored) {
            try {
              const parsed = JSON.parse(stored)
              const { savedAt, ...data } = parsed
              
              // Search in content and metadata
              const searchableText = JSON.stringify(data).toLowerCase()
              if (searchableText.includes(searchTerm)) {
                results.push(data as AIData)
              }
            } catch (parseError) {
              console.warn(`Failed to parse stored data for key ${key}:`, parseError)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to search AI data:', error)
    }

    return results
  }
}

// Export singleton instance
export const localStorageService = new LocalStorageService()
export default localStorageService
