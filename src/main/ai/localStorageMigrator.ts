/**
 * Local Storage Migrator - Migrates existing local storage data to AI retrieval system
 * 
 * This utility helps migrate existing document conversion data to the new
 * local retrieval system for ChatBot functionality.
 */

import { LocalDataService } from '../services/LocalDataService';
import { ChatController } from './chatController';

export class LocalStorageMigrator {
  private localDataService: LocalDataService;
  private chatController: ChatController;

  constructor() {
    this.localDataService = new LocalDataService();
    this.chatController = new ChatController(true);
  }

  /**
   * Migrate existing conversion data to ChatBot retrieval system
   */
  async migrateExistingData(): Promise<{
    success: boolean;
    migratedCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let migratedCount = 0;

    try {
      // Get all conversion records from local storage
      const conversions = await this.localDataService.getConversionHistory({
        limit: 1000, // Get all records
      });

      console.log(`Found ${conversions.length} conversion records to migrate`);

      // Also check for analysis data from the JSON file
      const analysisData = await this.loadAnalysisDataFromJSON();
      if (analysisData.length > 0) {
        console.log(`Found ${analysisData.length} analysis records to migrate from JSON`);
        const analysisMigratedCount = await this.migrateAnalysisData(analysisData);
        migratedCount += analysisMigratedCount;
      }

      for (const conversion of conversions) {
        try {
          // Only migrate successful conversions
          if (!conversion.success) {
            continue;
          }

          // Create document ID from conversion record
          const documentId = `conv_${conversion.id}`;
          
          // Try to read the output file content
          let content = '';
          let filename = '';

          try {
            // If there's an output file, try to read it
            if (conversion.outputFile) {
              const fs = require('fs').promises;
              const path = require('path');
              
              // Check if file exists
              try {
                await fs.access(conversion.outputFile);
                const fileContent = await fs.readFile(conversion.outputFile, 'utf-8');
                content = fileContent;
                filename = path.basename(conversion.outputFile);
              } catch (fileError) {
                // File doesn't exist, use input file name and basic info
                filename = path.basename(conversion.inputFile);
                content = this.generateContentFromConversion(conversion);
              }
            } else {
              // No output file, generate content from conversion metadata
              filename = conversion.inputFile.split(/[\\\/]/).pop() || 'unknown';
              content = this.generateContentFromConversion(conversion);
            }

            // Add document to ChatBot local storage
            await this.chatController.addDocumentToLocalStorage(
              documentId,
              filename,
              content,
              {
                conversionId: conversion.id,
                inputFile: conversion.inputFile,
                outputFile: conversion.outputFile,
                inputFormat: conversion.inputFormat,
                outputFormat: conversion.outputFormat,
                processingTime: conversion.processingTime,
                timestamp: conversion.timestamp,
                fileSize: conversion.fileSize,
              }
            );

            migratedCount++;
            console.log(`Migrated: ${filename} (${conversion.id})`);

          } catch (fileError) {
            const errorMsg = `Failed to process file for conversion ${conversion.id}: ${fileError}`;
            errors.push(errorMsg);
            console.warn(errorMsg);
          }

        } catch (conversionError) {
          const errorMsg = `Failed to migrate conversion ${conversion.id}: ${conversionError}`;
          errors.push(errorMsg);
          console.warn(errorMsg);
        }
      }

      console.log(`Migration completed: ${migratedCount} documents migrated, ${errors.length} errors`);

      return {
        success: errors.length === 0,
        migratedCount,
        errors,
      };

    } catch (error) {
      const errorMsg = `Migration failed: ${error}`;
      errors.push(errorMsg);
      console.error(errorMsg);

      return {
        success: false,
        migratedCount,
        errors,
      };
    }
  }

  /**
   * Load analysis data from JSON file
   */
  private async loadAnalysisDataFromJSON(): Promise<any[]> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      // Look for the JSON file in common locations
      const possiblePaths = [
        path.join(require('os').homedir(), 'Desktop', 'local-ai-data-2025-10-08.json'),
        path.join(process.cwd(), 'local-ai-data-2025-10-08.json'),
        path.join(process.cwd(), '..', 'local-ai-data-2025-10-08.json'),
        path.join(process.cwd(), '..', '..', 'local-ai-data-2025-10-08.json'),
      ];

      for (const jsonPath of possiblePaths) {
        try {
          await fs.access(jsonPath);
          const data = await fs.readFile(jsonPath, 'utf-8');
          const jsonData = JSON.parse(data);
          
          if (jsonData.data && Array.isArray(jsonData.data)) {
            console.log(`Loaded ${jsonData.data.length} analysis records from ${jsonPath}`);
            return jsonData.data;
          }
        } catch (error) {
          // File doesn't exist at this path, try next
          continue;
        }
      }
      
      console.log('No analysis JSON file found');
      return [];
    } catch (error) {
      console.error('Error loading analysis data from JSON:', error);
      return [];
    }
  }

  /**
   * Migrate analysis data from JSON
   */
  private async migrateAnalysisData(analysisData: any[]): Promise<number> {
    let migratedCount = 0;

    for (const analysis of analysisData) {
      try {
        if (analysis.type === 'analysis' && analysis.content) {
          const content = analysis.content;
          const filename = content.filename || 'unknown';
          const documentId = analysis.id || `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Combine all text sections into one content
          let fullContent = '';
          if (content.textSections && Array.isArray(content.textSections)) {
            fullContent = content.textSections.map((section: any) => section.content).join('\n');
          }
          
          if (fullContent.trim()) {
            await this.chatController.addDocumentToLocalStorage(
              documentId,
              filename,
              fullContent,
              {
                type: 'analysis',
                originalId: analysis.id,
                fileType: content.fileType,
                pageCount: content.pageCount,
                processingTime: content.processingTime,
                createdAt: content.createdAt,
                aiCommentary: content.aiCommentary,
              }
            );

            migratedCount++;
            console.log(`Migrated analysis: ${filename} (${analysis.id})`);
            console.log(`Content preview: ${fullContent.substring(0, 100)}...`);
          }
        }
      } catch (error) {
        console.error(`Failed to migrate analysis ${analysis.id}:`, error);
      }
    }

    return migratedCount;
  }

  /**
   * Direct migration from known JSON file
   */
  async migrateFromKnownJSON(): Promise<{
    success: boolean;
    migratedCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let migratedCount = 0;

    try {
      const fs = require('fs').promises;
      const path = require('path');
      const jsonPath = path.join(require('os').homedir(), 'Desktop', 'local-ai-data-2025-10-08.json');
      
      console.log(`Attempting to load JSON from: ${jsonPath}`);
      
      const data = await fs.readFile(jsonPath, 'utf-8');
      const jsonData = JSON.parse(data);
      
      console.log(`Found ${jsonData.data?.length || 0} records in JSON`);
      
      if (jsonData.data && Array.isArray(jsonData.data)) {
        for (const analysis of jsonData.data) {
          if (analysis.type === 'analysis' && analysis.content) {
            const content = analysis.content;
            const filename = content.filename || 'unknown';
            const documentId = analysis.id || `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Combine all text sections into one content
            let fullContent = '';
            if (content.textSections && Array.isArray(content.textSections)) {
              fullContent = content.textSections.map((section: any) => section.content).join('\n');
            }
            
            if (fullContent.trim()) {
              await this.chatController.addDocumentToLocalStorage(
                documentId,
                filename,
                fullContent,
                {
                  type: 'analysis',
                  originalId: analysis.id,
                  fileType: content.fileType,
                  pageCount: content.pageCount,
                  processingTime: content.processingTime,
                  createdAt: content.createdAt,
                  aiCommentary: content.aiCommentary,
                }
              );

              migratedCount++;
              console.log(`Migrated: ${filename} (${analysis.id})`);
              console.log(`Content length: ${fullContent.length} chars`);
            }
          }
        }
      }
      
      return {
        success: true,
        migratedCount,
        errors,
      };
      
    } catch (error) {
      const errorMsg = `Direct JSON migration failed: ${error}`;
      errors.push(errorMsg);
      console.error(errorMsg);
      
      return {
        success: false,
        migratedCount,
        errors,
      };
    }
  }

  /**
   * Generate content from conversion metadata when file is not available
   */
  private generateContentFromConversion(conversion: any): string {
    const content = `
Document Information:
- Input File: ${conversion.inputFile}
- Output File: ${conversion.outputFile || 'N/A'}
- Input Format: ${conversion.inputFormat}
- Output Format: ${conversion.outputFormat}
- Processing Time: ${conversion.processingTime}ms
- File Size: ${conversion.fileSize} bytes
- Timestamp: ${new Date(conversion.timestamp).toLocaleString()}

This document was processed using DocDataApp conversion service.
The original file was converted from ${conversion.inputFormat} to ${conversion.outputFormat}.
    `.trim();

    return content;
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{
    totalConversions: number;
    migratedDocuments: number;
    needsMigration: boolean;
  }> {
    try {
      const conversions = await this.localDataService.getConversionHistory({ limit: 1000 });
      const storedDocuments = this.chatController.getStoredDocuments();
      
      const migratedDocuments = storedDocuments.filter(doc => 
        doc.id && doc.id.startsWith('conv_')
      ).length;

      return {
        totalConversions: conversions.length,
        migratedDocuments,
        needsMigration: migratedDocuments < conversions.length,
      };
    } catch (error) {
      console.error('Error getting migration status:', error);
      return {
        totalConversions: 0,
        migratedDocuments: 0,
        needsMigration: false,
      };
    }
  }

  /**
   * Clear all migrated data
   */
  clearMigratedData(): void {
    this.chatController.clearStoredDocuments();
    console.log('Cleared all migrated data');
  }
}
