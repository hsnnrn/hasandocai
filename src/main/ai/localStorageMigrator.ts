/**
 * Local Storage Migrator - No longer needed for pure chat
 */

export class LocalStorageMigrator {
  constructor() {
    // No longer needed
  }

  async migrateExistingData(): Promise<{
    success: boolean;
    migratedCount: number;
    errors: string[];
  }> {
    return {
      success: true,
      migratedCount: 0,
      errors: [],
    };
  }

  async getMigrationStatus(): Promise<{
    needsMigration: boolean;
    totalConversions: number;
    migratedDocuments: number;
  }> {
    return {
      needsMigration: false,
      totalConversions: 0,
      migratedDocuments: 0,
    };
  }

  async clearMigratedData(): Promise<void> {
    // No-op
  }
}
