/**
 * Abstract Data Service Interface
 * 
 * This service provides a consistent interface for data operations
 * that can be implemented by different storage backends (localStorage, IndexedDB, cloud)
 */

// Data schema versions for migration
export const DATA_SCHEMA_VERSION = '1.0.0';

// Storage keys
export const STORAGE_KEYS = {
  WORKOUT_HISTORY: 'weightCalculator_workoutHistory',
  USER_PREFERENCES: 'weightCalculator_preferences',
  APP_SETTINGS: 'weightCalculator_settings',
  DATA_VERSION: 'weightCalculator_dataVersion'
};

// Default user preferences
export const DEFAULT_PREFERENCES = {
  unit: 'lbs',
  theme: 'light',
  defaultBarbell: { weight: 45, label: 'Olympic Barbell (45 lbs)' },
  autoSave: true,
  showNotifications: true
};

// Default app settings factory function
export const createDefaultSettings = () => ({
  dataVersion: DATA_SCHEMA_VERSION,
  lastBackup: null,
  totalWorkouts: 0,
  firstUse: new Date().toISOString()
});

// Static default settings (without firstUse)
export const DEFAULT_SETTINGS = {
  dataVersion: DATA_SCHEMA_VERSION,
  lastBackup: null,
  totalWorkouts: 0,
  firstUse: null // Will be set dynamically when needed
};

/**
 * Abstract DataService class
 * All storage implementations should extend this class
 */
export class DataService {
  constructor() {
    if (this.constructor === DataService) {
      throw new Error('DataService is an abstract class and cannot be instantiated directly');
    }
  }

  // Workout History Operations
  async getWorkoutHistory() {
    throw new Error('getWorkoutHistory method must be implemented');
  }

  async saveWorkout(workout) {
    throw new Error('saveWorkout method must be implemented');
  }

  async updateWorkout(workoutId, updates) {
    throw new Error('updateWorkout method must be implemented');
  }

  async deleteWorkout(workoutId) {
    throw new Error('deleteWorkout method must be implemented');
  }

  async clearWorkoutHistory() {
    throw new Error('clearWorkoutHistory method must be implemented');
  }

  // User Preferences Operations
  async getPreferences() {
    throw new Error('getPreferences method must be implemented');
  }

  async savePreferences(preferences) {
    throw new Error('savePreferences method must be implemented');
  }

  // App Settings Operations
  async getSettings() {
    throw new Error('getSettings method must be implemented');
  }

  async saveSettings(settings) {
    throw new Error('saveSettings method must be implemented');
  }

  // Data Management Operations
  async exportData() {
    throw new Error('exportData method must be implemented');
  }

  async importData(data) {
    throw new Error('importData method must be implemented');
  }

  async clearAllData() {
    throw new Error('clearAllData method must be implemented');
  }

  // Migration and Versioning
  async getDataVersion() {
    throw new Error('getDataVersion method must be implemented');
  }

  async migrateData(fromVersion, toVersion) {
    throw new Error('migrateData method must be implemented');
  }

  // Health Check
  async isHealthy() {
    throw new Error('isHealthy method must be implemented');
  }
}

/**
 * Data validation utilities
 */
export const DataValidators = {
  workout: (workout) => {
    const required = ['id', 'date', 'exercise', 'targetWeight', 'actualWeight', 'unit', 'sets', 'reps'];
    const missing = required.filter(field => workout[field] === undefined || workout[field] === null);
    
    if (missing.length > 0) {
      throw new Error(`Missing required workout fields: ${missing.join(', ')}`);
    }

    if (typeof workout.targetWeight !== 'number' || workout.targetWeight <= 0) {
      throw new Error('Target weight must be a positive number');
    }

    if (typeof workout.actualWeight !== 'number' || workout.actualWeight <= 0) {
      throw new Error('Actual weight must be a positive number');
    }

    if (!['lbs', 'kg'].includes(workout.unit)) {
      throw new Error('Unit must be either "lbs" or "kg"');
    }

    if (typeof workout.sets !== 'number' || workout.sets <= 0) {
      throw new Error('Sets must be a positive number');
    }

    if (typeof workout.reps !== 'number' || workout.reps <= 0) {
      throw new Error('Reps must be a positive number');
    }

    return true;
  },

  preferences: (preferences) => {
    if (preferences.unit && !['lbs', 'kg'].includes(preferences.unit)) {
      throw new Error('Unit preference must be either "lbs" or "kg"');
    }

    if (preferences.theme && !['light', 'dark'].includes(preferences.theme)) {
      throw new Error('Theme preference must be either "light" or "dark"');
    }

    return true;
  }
};

/**
 * Data transformation utilities
 */
export const DataTransformers = {
  // Ensure workout has all required fields with defaults
  normalizeWorkout: (workout, existingIds = new Set()) => {
    // Dynamic import to avoid circular dependencies
    let generateWorkoutId, isValidWorkoutId, upgradeLegacyId;
    try {
      // Try dynamic import for browser environment
      const idGenerator = typeof require !== 'undefined' 
        ? require('../utils/idGenerator.js')
        : { 
            generateWorkoutId: () => Date.now() + '_' + Math.random().toString(16).substring(2, 8),
            isValidWorkoutId: (id) => Boolean(id),
            upgradeLegacyId: () => Date.now() + '_' + Math.random().toString(16).substring(2, 8)
          };
      ({ generateWorkoutId, isValidWorkoutId, upgradeLegacyId } = idGenerator);
    } catch (error) {
      // Fallback for Node.js testing
      generateWorkoutId = () => Date.now() + '_' + Math.random().toString(16).substring(2, 8);
      isValidWorkoutId = (id) => Boolean(id);
      upgradeLegacyId = () => Date.now() + '_' + Math.random().toString(16).substring(2, 8);
    }
    
    let workoutId = workout.id;
    
    // Generate ID if missing or invalid
    if (!workoutId || !isValidWorkoutId(workoutId)) {
      workoutId = generateWorkoutId(existingIds);
    } else if (/^\d+$/.test(workoutId)) {
      // Upgrade legacy numeric IDs
      workoutId = upgradeLegacyId(workoutId, existingIds);
    }
    
    return {
      id: workoutId,
      date: workout.date || new Date().toISOString().split('T')[0],
      exercise: workout.exercise || '',
      targetWeight: Number(workout.targetWeight) || 0,
      actualWeight: Number(workout.actualWeight) || 0,
      unit: workout.unit || 'lbs',
      barbell: workout.barbell || 'Olympic Barbell (45 lbs)',
      sets: Number(workout.sets) || 1,
      reps: Number(workout.reps) || 1,
      completed: Boolean(workout.completed),
      notes: workout.notes || '',
      createdAt: workout.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  // Prepare data for export
  prepareExportData: (workouts, preferences, settings) => {
    return {
      version: DATA_SCHEMA_VERSION,
      exportDate: new Date().toISOString(),
      workouts: workouts.map(DataTransformers.normalizeWorkout),
      preferences: { ...DEFAULT_PREFERENCES, ...preferences },
      settings: { ...DEFAULT_SETTINGS, ...settings },
      metadata: {
        totalWorkouts: workouts.length,
        dateRange: workouts.length > 0 ? {
          earliest: Math.min(...workouts.map(w => new Date(w.date).getTime())),
          latest: Math.max(...workouts.map(w => new Date(w.date).getTime()))
        } : null
      }
    };
  }
};