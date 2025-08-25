/**
 * User Service - localStorage-based User Management
 * 
 * Handles user creation, authentication, and session management
 * using browser localStorage for persistence
 */

// Storage keys for user management
export const USER_STORAGE_KEYS = {
  USERS_LIST: 'weightCalculator_users',
  CURRENT_USER: 'weightCalculator_currentUser',
  USER_SESSIONS: 'weightCalculator_userSessions'
};

// Default user preferences that can be customized per user
export const DEFAULT_USER_PREFERENCES = {
  unit: 'lbs',
  theme: 'light',
  defaultBarbell: { weight: 45, label: 'Olympic Barbell (45 lbs)' },
  autoSave: true,
  showNotifications: true
};

/**
 * User data model utilities
 */
export const UserValidators = {
  name: (name) => {
    if (!name || typeof name !== 'string') {
      throw new Error('User name is required and must be a string');
    }
    if (name.trim().length < 2) {
      throw new Error('User name must be at least 2 characters long');
    }
    if (name.trim().length > 50) {
      throw new Error('User name must be less than 50 characters');
    }
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name.trim())) {
      throw new Error('User name can only contain letters, numbers, spaces, hyphens, and underscores');
    }
    return true;
  },

  user: (user) => {
    const required = ['id', 'name', 'createdAt'];
    const missing = required.filter(field => !user[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required user fields: ${missing.join(', ')}`);
    }

    UserValidators.name(user.name);

    if (typeof user.id !== 'string' || user.id.length < 1) {
      throw new Error('User ID must be a non-empty string');
    }

    return true;
  }
};

export const UserTransformers = {
  // Generate unique user ID
  generateUserId: (existingIds = new Set()) => {
    let id;
    do {
      id = 'user_' + Date.now() + '_' + Math.random().toString(16).substring(2, 8);
    } while (existingIds.has(id));
    return id;
  },

  // Normalize user data
  normalizeUser: (userData, existingIds = new Set()) => {
    const now = new Date().toISOString();
    
    return {
      id: userData.id || UserTransformers.generateUserId(existingIds),
      name: (userData.name || '').trim(),
      createdAt: userData.createdAt || now,
      lastActive: userData.lastActive || now,
      preferences: { ...DEFAULT_USER_PREFERENCES, ...(userData.preferences || {}) },
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      metadata: {
        totalWorkouts: userData.metadata?.totalWorkouts || 0,
        firstWorkout: userData.metadata?.firstWorkout || null,
        lastWorkout: userData.metadata?.lastWorkout || null,
        ...userData.metadata
      }
    };
  }
};

/**
 * UserService Class - Manages user profiles and sessions
 */
export class UserService {
  constructor() {
    this.isAvailable = this._checkAvailability();
  }

  /**
   * Check if localStorage is available
   */
  _checkAvailability() {
    try {
      const test = 'userService_test';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('localStorage not available for UserService:', e);
      return false;
    }
  }

  /**
   * Safely get data from localStorage
   */
  _getItem(key, defaultValue = null) {
    if (!this.isAvailable) return defaultValue;
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  }

  /**
   * Safely set data to localStorage
   */
  _setItem(key, value) {
    if (!this.isAvailable) {
      throw new Error('localStorage not available');
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded');
      }
      throw error;
    }
  }

  /**
   * Get all users
   */
  async getAllUsers() {
    const users = this._getItem(USER_STORAGE_KEYS.USERS_LIST, []);
    const existingIds = new Set(users.map(u => u.id).filter(Boolean));
    
    const normalizedUsers = [];
    for (const user of users) {
      try {
        const normalized = UserTransformers.normalizeUser(user, existingIds);
        UserValidators.user(normalized);
        existingIds.add(normalized.id);
        normalizedUsers.push(normalized);
      } catch (error) {
        console.warn('Invalid user data found, skipping:', user, error);
      }
    }

    return normalizedUsers.sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    if (!userId) return null;
    
    const users = await this.getAllUsers();
    return users.find(user => user.id === userId) || null;
  }

  /**
   * Create new user
   */
  async createUser(userData) {
    try {
      const users = await this.getAllUsers();
      const existingIds = new Set(users.map(u => u.id));
      const existingNames = new Set(users.map(u => u.name.toLowerCase()));

      // Validate name uniqueness
      if (existingNames.has(userData.name.toLowerCase().trim())) {
        throw new Error('A user with this name already exists');
      }

      const newUser = UserTransformers.normalizeUser(userData, existingIds);
      UserValidators.user(newUser);

      users.push(newUser);
      this._setItem(USER_STORAGE_KEYS.USERS_LIST, users);

      console.log(`User created: ${newUser.name} (${newUser.id})`);
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(userId, updates) {
    try {
      const users = await this.getAllUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Check name uniqueness if name is being updated
      if (updates.name && updates.name !== users[userIndex].name) {
        const existingNames = new Set(
          users.filter(u => u.id !== userId).map(u => u.name.toLowerCase())
        );
        if (existingNames.has(updates.name.toLowerCase().trim())) {
          throw new Error('A user with this name already exists');
        }
      }

      const updatedUser = {
        ...users[userIndex],
        ...updates,
        lastActive: new Date().toISOString()
      };

      const normalized = UserTransformers.normalizeUser(updatedUser);
      UserValidators.user(normalized);

      users[userIndex] = normalized;
      this._setItem(USER_STORAGE_KEYS.USERS_LIST, users);

      // Update current user if this user is currently active
      const currentUser = await this.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        await this.setCurrentUser(normalized);
      }

      return normalized;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user (soft delete - mark as inactive)
   */
  async deleteUser(userId) {
    try {
      const users = await this.getAllUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Soft delete - mark as inactive
      users[userIndex].isActive = false;
      users[userIndex].lastActive = new Date().toISOString();
      
      this._setItem(USER_STORAGE_KEYS.USERS_LIST, users);

      // Clear current user if this user was active
      const currentUser = await this.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        await this.clearCurrentUser();
      }

      console.log(`User deactivated: ${userId}`);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Get current active user
   */
  async getCurrentUser() {
    const userId = this._getItem(USER_STORAGE_KEYS.CURRENT_USER);
    if (!userId) return null;
    
    return await this.getUserById(userId);
  }

  /**
   * Set current active user
   */
  async setCurrentUser(userOrId) {
    try {
      const userId = typeof userOrId === 'string' ? userOrId : userOrId.id;
      const user = await this.getUserById(userId);
      
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      if (!user.isActive) {
        throw new Error('Cannot set inactive user as current user');
      }

      // Update user's last active time
      await this.updateUser(userId, { lastActive: new Date().toISOString() });

      this._setItem(USER_STORAGE_KEYS.CURRENT_USER, userId);
      
      // Log session
      this._logSession(userId);

      console.log(`Current user set: ${user.name} (${userId})`);
      return user;
    } catch (error) {
      console.error('Error setting current user:', error);
      throw error;
    }
  }

  /**
   * Clear current user (logout)
   */
  async clearCurrentUser() {
    try {
      const currentUser = await this.getCurrentUser();
      if (currentUser) {
        this._logSession(currentUser.id, 'logout');
      }

      localStorage.removeItem(USER_STORAGE_KEYS.CURRENT_USER);
      console.log('Current user cleared');
      return true;
    } catch (error) {
      console.error('Error clearing current user:', error);
      throw error;
    }
  }

  /**
   * Check if user exists by name
   */
  async userExistsByName(name) {
    if (!name) return false;
    
    const users = await this.getAllUsers();
    return users.some(user => 
      user.isActive && 
      user.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId) {
    const user = await this.getUserById(userId);
    if (!user) return null;

    const sessions = this._getItem(USER_STORAGE_KEYS.USER_SESSIONS, []);
    const userSessions = sessions.filter(s => s.userId === userId);

    return {
      ...user.metadata,
      sessionCount: userSessions.filter(s => s.type === 'login').length,
      lastLogin: userSessions
        .filter(s => s.type === 'login')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]?.timestamp || null
    };
  }

  /**
   * Generate user-specific storage key
   */
  getUserStorageKey(userId, keyType) {
    return `weightCalculator_user_${userId}_${keyType}`;
  }

  /**
   * Log user session activity
   */
  _logSession(userId, type = 'login') {
    try {
      const sessions = this._getItem(USER_STORAGE_KEYS.USER_SESSIONS, []);
      sessions.push({
        userId,
        type,
        timestamp: new Date().toISOString()
      });

      // Keep only last 100 sessions per user
      const userSessions = sessions.filter(s => s.userId === userId).slice(-100);
      const otherSessions = sessions.filter(s => s.userId !== userId);
      
      this._setItem(USER_STORAGE_KEYS.USER_SESSIONS, [...otherSessions, ...userSessions]);
    } catch (error) {
      console.warn('Error logging session:', error);
    }
  }

  /**
   * Health check
   */
  async isHealthy() {
    try {
      const testKey = 'userService_health_test';
      const testValue = { timestamp: Date.now() };
      
      this._setItem(testKey, testValue);
      const retrieved = this._getItem(testKey);
      localStorage.removeItem(testKey);

      return retrieved && retrieved.timestamp === testValue.timestamp;
    } catch (error) {
      console.error('UserService health check failed:', error);
      return false;
    }
  }
}

// Create singleton instance
export const userService = new UserService();

// Convenience functions
export const getCurrentUser = () => userService.getCurrentUser();
export const getAllUsers = () => userService.getAllUsers();
export const createUser = (userData) => userService.createUser(userData);
export const setCurrentUser = (user) => userService.setCurrentUser(user);