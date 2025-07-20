/**
 * Unique ID Generator Utilities
 * 
 * Provides robust ID generation to prevent collisions
 */

/**
 * Generate a unique ID using timestamp + random component
 * Format: timestamp_randomHex
 * Example: 1703891234567_a3f7c9
 */
export const generateUniqueId = () => {
  const timestamp = Date.now();
  const randomHex = Math.random().toString(16).substr(2, 6);
  return `${timestamp}_${randomHex}`;
};

/**
 * Generate a UUID v4 (more robust but longer)
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
};

/**
 * Generate a workout-specific ID with validation
 * Ensures uniqueness against existing workout IDs
 */
export const generateWorkoutId = (existingIds = new Set()) => {
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    const id = generateUniqueId();
    
    if (!existingIds.has(id)) {
      return id;
    }
    
    attempts++;
    
    // Add small delay to ensure timestamp changes on rapid generation
    if (attempts > 10) {
      // Force a new timestamp by adding microsecond precision
      const timestamp = Date.now();
      const microseconds = performance.now() % 1;
      const randomHex = Math.random().toString(16).substr(2, 8);
      const uniqueId = `${timestamp}_${Math.floor(microseconds * 1000)}_${randomHex}`;
      
      if (!existingIds.has(uniqueId)) {
        return uniqueId;
      }
    }
  }
  
  // Fallback to UUID if all else fails
  console.warn('ID generation reached max attempts, falling back to UUID');
  return generateUUID();
};

/**
 * Validate ID format
 */
export const isValidWorkoutId = (id) => {
  if (typeof id !== 'string' || !id) return false;
  
  // Check for timestamp_random format
  const timestampRandomPattern = /^\d{13}_[a-f0-9]{6,}$/;
  if (timestampRandomPattern.test(id)) return true;
  
  // Check for UUID format
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(id)) return true;
  
  // Check for legacy numeric IDs (for backwards compatibility)
  const numericPattern = /^\d+$/;
  if (numericPattern.test(id)) return true;
  
  return false;
};

/**
 * Convert legacy numeric IDs to new format
 */
export const upgradeLegacyId = (oldId, existingIds = new Set()) => {
  // If it's already in the new format, return as is
  if (isValidWorkoutId(oldId) && !(/^\d+$/.test(oldId))) {
    return oldId;
  }
  
  // Generate new ID for legacy numeric IDs
  return generateWorkoutId(existingIds);
};