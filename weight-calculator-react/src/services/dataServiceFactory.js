/**
 * Data Service Factory
 * 
 * Creates and manages data service instances with migration capabilities
 * Provides a single entry point for data operations across the app
 */

import { LocalStorageService } from './localStorageService.js';
import { DATA_SCHEMA_VERSION } from './dataService.js';

// Future service imports (for migration path)
// import { IndexedDBService } from './indexedDBService.js';
// import { CloudSyncService } from './cloudSyncService.js';

/**
 * Available storage backends
 */
export const STORAGE_BACKENDS = {
  LOCAL_STORAGE: 'localStorage',
  INDEXED_DB: 'indexedDB',
  CLOUD_SYNC: 'cloudSync'
};

/**
 * Migration utilities for moving between storage backends
 */
export class DataMigrator {
  static async migrateToIndexedDB(currentService) {
    // Future implementation for localStorage -> IndexedDB migration
    console.log('IndexedDB migration not yet implemented');
    throw new Error('IndexedDB migration not yet available');
  }

  static async migrateToCloudSync(currentService) {
    // Future implementation for local -> cloud migration
    console.log('Cloud sync migration not yet implemented');
    throw new Error('Cloud sync migration not yet available');
  }

  static async detectOptimalBackend() {
    // Future: Detect best available storage backend
    // For now, always return localStorage
    return STORAGE_BACKENDS.LOCAL_STORAGE;
  }
}

/**
 * Data Service Factory Class
 * Manages service creation, migration, and lifecycle
 */
export class DataServiceFactory {
  constructor() {
    this.currentService = null;
    this.serviceType = null;
  }

  /**
   * Initialize the data service
   * Automatically selects best available backend and handles migrations
   */
  async initialize(preferredBackend = null) {
    try {
      // Determine which backend to use
      const backend = preferredBackend || await DataMigrator.detectOptimalBackend();
      
      // Create service instance
      this.currentService = await this._createService(backend);
      this.serviceType = backend;

      // Check service health
      const isHealthy = await this.currentService.isHealthy();
      if (!isHealthy) {
        console.warn(`${backend} service health check failed, falling back to localStorage`);
        if (backend !== STORAGE_BACKENDS.LOCAL_STORAGE) {
          this.currentService = await this._createService(STORAGE_BACKENDS.LOCAL_STORAGE);
          this.serviceType = STORAGE_BACKENDS.LOCAL_STORAGE;
        }
      }

      // Check for data version and migrate if needed
      await this._checkAndMigrateData();

      console.log(`Data service initialized with ${this.serviceType}`);
      return this.currentService;
    } catch (error) {
      console.error('Failed to initialize data service:', error);
      
      // Fallback to localStorage
      this.currentService = new LocalStorageService();
      this.serviceType = STORAGE_BACKENDS.LOCAL_STORAGE;
      
      return this.currentService;
    }
  }

  /**
   * Create service instance based on backend type
   */
  async _createService(backend) {
    switch (backend) {
      case STORAGE_BACKENDS.LOCAL_STORAGE:
        return new LocalStorageService();
      
      case STORAGE_BACKENDS.INDEXED_DB:
        // Future implementation
        throw new Error('IndexedDB service not yet implemented');
      
      case STORAGE_BACKENDS.CLOUD_SYNC:
        // Future implementation
        throw new Error('Cloud sync service not yet implemented');
      
      default:
        throw new Error(`Unknown storage backend: ${backend}`);
    }
  }

  /**
   * Check data version and perform migrations if needed
   */
  async _checkAndMigrateData() {
    try {
      const currentVersion = await this.currentService.getDataVersion();
      
      if (currentVersion !== DATA_SCHEMA_VERSION) {
        console.log(`Data migration needed: ${currentVersion} -> ${DATA_SCHEMA_VERSION}`);
        await this.currentService.migrateData(currentVersion, DATA_SCHEMA_VERSION);
        console.log('Data migration completed');
      }
    } catch (error) {
      console.error('Data migration failed:', error);
      // Continue with current version, log error for debugging
    }
  }

  /**
   * Get current service instance
   */
  getService() {
    if (!this.currentService) {
      throw new Error('Data service not initialized. Call initialize() first.');
    }
    return this.currentService;
  }

  /**
   * Get service information
   */
  getServiceInfo() {
    if (!this.currentService) {
      return { type: 'none', initialized: false };
    }

    const baseInfo = {
      type: this.serviceType,
      initialized: true,
      version: DATA_SCHEMA_VERSION
    };

    // Add service-specific info if available
    if (typeof this.currentService.getServiceInfo === 'function') {
      return { ...baseInfo, ...this.currentService.getServiceInfo() };
    }

    return baseInfo;
  }

  /**
   * Migrate to a different storage backend
   */
  async migrateToBackend(newBackend) {
    if (!this.currentService) {
      throw new Error('No current service to migrate from');
    }

    if (this.serviceType === newBackend) {
      console.log(`Already using ${newBackend}, no migration needed`);
      return this.currentService;
    }

    try {
      // Export data from current service
      const exportedData = await this.currentService.exportData();
      
      // Create new service
      const newService = await this._createService(newBackend);
      
      // Import data to new service
      await newService.importData(exportedData);
      
      // Verify migration success
      const newWorkouts = await newService.getWorkoutHistory();
      const oldWorkouts = await this.currentService.getWorkoutHistory();
      
      if (newWorkouts.length !== oldWorkouts.length) {
        throw new Error('Migration verification failed: workout count mismatch');
      }

      // Switch to new service
      this.currentService = newService;
      this.serviceType = newBackend;

      console.log(`Successfully migrated to ${newBackend}`);
      return this.currentService;
    } catch (error) {
      console.error(`Migration to ${newBackend} failed:`, error);
      throw error;
    }
  }

  /**
   * Create backup of current data
   */
  async createBackup() {
    if (!this.currentService) {
      throw new Error('No service available for backup');
    }

    try {
      const backupData = await this.currentService.exportData();
      const backupBlob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(backupBlob);
      const filename = `weight-calculator-backup-${new Date().toISOString().split('T')[0]}.json`;

      return { url, filename, data: backupData };
    } catch (error) {
      console.error('Backup creation failed:', error);
      throw error;
    }
  }

  /**
   * Restore data from backup
   */
  async restoreFromBackup(backupData) {
    if (!this.currentService) {
      throw new Error('No service available for restore');
    }

    try {
      await this.currentService.importData(backupData);
      console.log('Data restored successfully');
      return true;
    } catch (error) {
      console.error('Data restore failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const dataServiceFactory = new DataServiceFactory();

// Convenience function for getting initialized service
export const getDataService = () => dataServiceFactory.getService();