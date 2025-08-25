/**
 * localStorage Implementation of DataService
 * 
 * Provides persistent storage using browser localStorage with
 * JSON serialization and error handling
 */

import { 
  DataService, 
  STORAGE_KEYS, 
  DEFAULT_PREFERENCES, 
  DEFAULT_SETTINGS,
  createDefaultSettings,
  DATA_SCHEMA_VERSION,
  DataValidators,
  DataTransformers
} from './dataService.js';

export class LocalStorageService extends DataService {
  constructor(userId = null) {
    super();
    this.isAvailable = this._checkAvailability();
    this.userId = userId;
  }

  /**
   * Set the current user ID for scoped operations
   */
  setUserId(userId) {
    this.userId = userId;
  }

  /**
   * Get user-scoped storage key
   */
  _getUserScopedKey(key) {
    if (!this.userId) {
      // For backward compatibility, use original keys when no user is set
      return key;
    }
    return `${key}_user_${this.userId}`;
  }

  /**
   * Check if localStorage is available and functional
   */
  _checkAvailability() {
    try {
      const test = 'localStorage_test';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('localStorage is not available:', e);
      return false;
    }
  }

  /**
   * Safely get data from localStorage with error handling
   */
  _getItem(key, defaultValue = null) {
    if (!this.isAvailable) {
      return defaultValue;
    }

    try {
      const scopedKey = this._getUserScopedKey(key);
      const item = localStorage.getItem(scopedKey);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return defaultValue;
    }
  }

  /**
   * Safely set data to localStorage with error handling
   */
  _setItem(key, value) {
    if (!this.isAvailable) {
      throw new Error('localStorage is not available');
    }

    try {
      const scopedKey = this._getUserScopedKey(key);
      localStorage.setItem(scopedKey, JSON.stringify(value));
      return true;
    } catch (error) {
      // Handle quota exceeded error
      if (error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please clear some data or export your workouts.');
      }
      console.error(`Error writing to localStorage key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Remove item from localStorage
   */
  _removeItem(key) {
    if (!this.isAvailable) {
      return;
    }

    try {
      const scopedKey = this._getUserScopedKey(key);
      localStorage.removeItem(scopedKey);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }

  // Workout History Operations
  async getWorkoutHistory() {
    const workouts = this._getItem(STORAGE_KEYS.WORKOUT_HISTORY, []);
    
    // Get existing IDs for collision avoidance
    const existingIds = new Set(workouts.map(w => w.id).filter(Boolean));
    
    // Normalize and validate workouts
    const normalizedWorkouts = [];
    for (const workout of workouts) {
      try {
        const normalized = DataTransformers.normalizeWorkout(workout, existingIds);
        DataValidators.workout(normalized);
        existingIds.add(normalized.id); // Add to set for next iteration
        normalizedWorkouts.push(normalized);
      } catch (error) {
        console.warn('Invalid workout data found, skipping:', workout, error);
      }
    }
    
    return normalizedWorkouts;
  }

  async saveWorkout(workout) {
    try {
      const workouts = await this.getWorkoutHistory();
      const existingIds = new Set(workouts.map(w => w.id));
      
      const normalized = DataTransformers.normalizeWorkout(workout, existingIds);
      DataValidators.workout(normalized);
      
      // Check for existing workout with same ID
      const existingIndex = workouts.findIndex(w => w.id === normalized.id);
      
      if (existingIndex >= 0) {
        workouts[existingIndex] = normalized;
      } else {
        workouts.unshift(normalized); // Add to beginning for chronological order
      }

      this._setItem(STORAGE_KEYS.WORKOUT_HISTORY, workouts);
      
      // Update total workout count
      const settings = await this.getSettings();
      settings.totalWorkouts = workouts.length;
      await this.saveSettings(settings);

      return normalized;
    } catch (error) {
      console.error('Error saving workout:', error);
      throw error;
    }
  }

  async updateWorkout(workoutId, updates) {
    try {
      const workouts = await this.getWorkoutHistory();
      const workoutIndex = workouts.findIndex(w => w.id === workoutId);
      
      if (workoutIndex === -1) {
        throw new Error(`Workout with ID ${workoutId} not found`);
      }

      const updatedWorkout = {
        ...workouts[workoutIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const normalized = DataTransformers.normalizeWorkout(updatedWorkout);
      DataValidators.workout(normalized);

      workouts[workoutIndex] = normalized;
      this._setItem(STORAGE_KEYS.WORKOUT_HISTORY, workouts);

      return normalized;
    } catch (error) {
      console.error('Error updating workout:', error);
      throw error;
    }
  }

  async deleteWorkout(workoutId) {
    try {
      const workouts = await this.getWorkoutHistory();
      const filteredWorkouts = workouts.filter(w => w.id !== workoutId);
      
      if (filteredWorkouts.length === workouts.length) {
        throw new Error(`Workout with ID ${workoutId} not found`);
      }

      this._setItem(STORAGE_KEYS.WORKOUT_HISTORY, filteredWorkouts);
      
      // Update total workout count
      const settings = await this.getSettings();
      settings.totalWorkouts = filteredWorkouts.length;
      await this.saveSettings(settings);

      return true;
    } catch (error) {
      console.error('Error deleting workout:', error);
      throw error;
    }
  }

  async clearWorkoutHistory() {
    try {
      this._setItem(STORAGE_KEYS.WORKOUT_HISTORY, []);
      
      // Reset workout count
      const settings = await this.getSettings();
      settings.totalWorkouts = 0;
      await this.saveSettings(settings);

      return true;
    } catch (error) {
      console.error('Error clearing workout history:', error);
      throw error;
    }
  }

  // User Preferences Operations
  async getPreferences() {
    const preferences = this._getItem(STORAGE_KEYS.USER_PREFERENCES, DEFAULT_PREFERENCES);
    
    try {
      DataValidators.preferences(preferences);
      return { ...DEFAULT_PREFERENCES, ...preferences };
    } catch (error) {
      console.warn('Invalid preferences found, using defaults:', error);
      return DEFAULT_PREFERENCES;
    }
  }

  async savePreferences(preferences) {
    try {
      const merged = { ...DEFAULT_PREFERENCES, ...preferences };
      DataValidators.preferences(merged);
      this._setItem(STORAGE_KEYS.USER_PREFERENCES, merged);
      return merged;
    } catch (error) {
      console.error('Error saving preferences:', error);
      throw error;
    }
  }

  // App Settings Operations
  async getSettings() {
    const settings = this._getItem(STORAGE_KEYS.APP_SETTINGS, null);
    
    // If no settings exist, create new ones with current timestamp
    if (!settings) {
      const newSettings = createDefaultSettings();
      await this.saveSettings(newSettings);
      return newSettings;
    }
    
    // Merge with defaults, preserving existing firstUse
    return { ...DEFAULT_SETTINGS, ...settings };
  }

  async saveSettings(settings) {
    try {
      const currentSettings = this._getItem(STORAGE_KEYS.APP_SETTINGS, null);
      const merged = { 
        ...DEFAULT_SETTINGS, 
        ...currentSettings,
        ...settings,
        // Preserve original firstUse if it exists
        firstUse: currentSettings?.firstUse || settings.firstUse || new Date().toISOString()
      };
      this._setItem(STORAGE_KEYS.APP_SETTINGS, merged);
      return merged;
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  // Data Management Operations
  async exportData() {
    try {
      const [workouts, preferences, settings] = await Promise.all([
        this.getWorkoutHistory(),
        this.getPreferences(),
        this.getSettings()
      ]);

      return DataTransformers.prepareExportData(workouts, preferences, settings);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  async importData(data) {
    try {
      // Validate import data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid import data format');
      }

      if (!data.version) {
        throw new Error('Import data missing version information');
      }

      // Handle version compatibility
      if (data.version !== DATA_SCHEMA_VERSION) {
        console.warn(`Import data version ${data.version} differs from current ${DATA_SCHEMA_VERSION}`);
        // Future: Add migration logic here
      }

      // Import workouts with merging
      if (data.workouts && Array.isArray(data.workouts)) {
        const existingWorkouts = await this.getWorkoutHistory();
        const existingIds = new Set(existingWorkouts.map(w => w.id));
        const validWorkouts = [];
        let importedCount = 0;
        let duplicateCount = 0;
        
        for (const workout of data.workouts) {
          try {
            const normalized = DataTransformers.normalizeWorkout(workout, existingIds);
            DataValidators.workout(normalized);
            
            // Check for duplicates by ID
            if (existingIds.has(normalized.id)) {
              duplicateCount++;
              console.warn(`Duplicate workout ID ${normalized.id} found, skipping`);
              continue;
            }
            
            validWorkouts.push(normalized);
            existingIds.add(normalized.id);
            importedCount++;
          } catch (error) {
            console.warn('Skipping invalid workout during import:', workout, error);
          }
        }

        // Merge with existing workouts, sorted by date (newest first)
        const mergedWorkouts = [...existingWorkouts, ...validWorkouts]
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        this._setItem(STORAGE_KEYS.WORKOUT_HISTORY, mergedWorkouts);
        
        // Log import results
        console.log(`Import completed: ${importedCount} new workouts added, ${duplicateCount} duplicates skipped`);
      }

      // Import preferences
      if (data.preferences) {
        try {
          await this.savePreferences(data.preferences);
        } catch (error) {
          console.warn('Error importing preferences, keeping current:', error);
        }
      }

      // Import settings and update workout count
      const finalWorkouts = await this.getWorkoutHistory();
      const currentSettings = await this.getSettings();
      
      if (data.settings) {
        try {
          await this.saveSettings({
            ...data.settings,
            totalWorkouts: finalWorkouts.length
          });
        } catch (error) {
          console.warn('Error importing settings, keeping current:', error);
        }
      } else {
        // Update total workout count even if no settings in import
        await this.saveSettings({
          ...currentSettings,
          totalWorkouts: finalWorkouts.length
        });
      }

      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }

  async clearAllData() {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        this._removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }

  // Migration and Versioning
  async getDataVersion() {
    return this._getItem(STORAGE_KEYS.DATA_VERSION, DATA_SCHEMA_VERSION);
  }

  async migrateData(fromVersion, toVersion) {
    // Future: Add migration logic for schema changes
    console.log(`Migration from ${fromVersion} to ${toVersion} not yet implemented`);
    this._setItem(STORAGE_KEYS.DATA_VERSION, toVersion);
    return true;
  }

  // Health Check
  async isHealthy() {
    try {
      // Test basic localStorage functionality
      const testKey = 'health_check_test';
      const testValue = { timestamp: Date.now() };
      
      this._setItem(testKey, testValue);
      const retrieved = this._getItem(testKey);
      this._removeItem(testKey);

      // Verify data integrity
      if (!retrieved || retrieved.timestamp !== testValue.timestamp) {
        return false;
      }

      // Check available storage space
      const usage = this._getStorageUsage();
      if (usage.percentage > 95) {
        console.warn('localStorage usage is very high:', usage);
      }

      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Get storage usage information
   */
  _getStorageUsage() {
    if (!this.isAvailable) {
      return { used: 0, total: 0, percentage: 0 };
    }

    try {
      let used = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }

      // Estimate total available (usually ~5-10MB)
      const total = 5 * 1024 * 1024; // 5MB estimate
      const percentage = (used / total) * 100;

      return { used, total, percentage: Math.round(percentage) };
    } catch (error) {
      console.error('Error calculating storage usage:', error);
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * Get service information
   */
  getServiceInfo() {
    return {
      type: 'localStorage',
      available: this.isAvailable,
      usage: this._getStorageUsage(),
      version: DATA_SCHEMA_VERSION,
      userId: this.userId,
      userScoped: !!this.userId
    };
  }

  /**
   * Migrate legacy data to user-scoped storage
   */
  async migrateLegacyDataToUser(userId) {
    if (!this.isAvailable || !userId) return false;

    // Store original userId before try block
    const originalUserId = this.userId;

    try {
      // Check if legacy data exists (data without user scope)
      const legacyWorkouts = localStorage.getItem(STORAGE_KEYS.WORKOUT_HISTORY);
      const legacyPreferences = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      const legacySettings = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);

      let migrated = false;

      // Temporarily set userId to null to get legacy keys, then migrate
      this.userId = null;

      if (legacyWorkouts) {
        const workouts = this._getItem(STORAGE_KEYS.WORKOUT_HISTORY, []);
        this.userId = userId; // Set user ID for scoped storage
        this._setItem(STORAGE_KEYS.WORKOUT_HISTORY, workouts);
        this.userId = null; // Reset to remove legacy data
        this._removeItem(STORAGE_KEYS.WORKOUT_HISTORY);
        migrated = true;
        console.log(`Migrated ${workouts.length} workouts to user ${userId}`);
      }

      if (legacyPreferences) {
        const preferences = this._getItem(STORAGE_KEYS.USER_PREFERENCES, {});
        this.userId = userId;
        this._setItem(STORAGE_KEYS.USER_PREFERENCES, preferences);
        this.userId = null;
        this._removeItem(STORAGE_KEYS.USER_PREFERENCES);
        migrated = true;
        console.log(`Migrated preferences to user ${userId}`);
      }

      if (legacySettings) {
        const settings = this._getItem(STORAGE_KEYS.APP_SETTINGS, {});
        this.userId = userId;
        this._setItem(STORAGE_KEYS.APP_SETTINGS, settings);
        this.userId = null;
        this._removeItem(STORAGE_KEYS.APP_SETTINGS);
        migrated = true;
        console.log(`Migrated settings to user ${userId}`);
      }

      // Restore original userId
      this.userId = originalUserId;

      return migrated;
    } catch (error) {
      console.error('Error migrating legacy data:', error);
      this.userId = originalUserId || null; // Ensure userId is restored on error
      return false;
    }
  }

  /**
   * Check if legacy data exists (non-user-scoped)
   */
  hasLegacyData() {
    if (!this.isAvailable) return false;

    return !!(
      localStorage.getItem(STORAGE_KEYS.WORKOUT_HISTORY) ||
      localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES) ||
      localStorage.getItem(STORAGE_KEYS.APP_SETTINGS)
    );
  }

  /**
   * Get all user data (for backup/export)
   */
  async getAllUserData(userId = null) {
    const targetUserId = userId || this.userId;
    if (!targetUserId) {
      throw new Error('User ID required for scoped data export');
    }

    const originalUserId = this.userId;
    this.userId = targetUserId;

    try {
      const [workouts, preferences, settings] = await Promise.all([
        this.getWorkoutHistory(),
        this.getPreferences(), 
        this.getSettings()
      ]);

      return { workouts, preferences, settings, userId: targetUserId };
    } finally {
      this.userId = originalUserId;
    }
  }
}