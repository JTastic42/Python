import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { userService } from '../../services/userService';
import UserCreationForm from './UserCreationForm';
import './UserProfile.css';

const UserSelector = React.memo(({ 
  onUserSelect, 
  onClose, 
  currentUser = null 
}) => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(currentUser?.id || null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load users
  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const allUsers = await userService.getAllUsers();
      const activeUsers = allUsers.filter(user => user.isActive);
      setUsers(activeUsers);
      
      // If no active users exist, show create form
      if (activeUsers.length === 0) {
        setShowCreateForm(true);
      }
    } catch (err) {
      setError('Failed to load user profiles');
      console.error('Error loading users:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Create new user
  const handleCreateUser = useCallback(async (userData) => {
    try {
      const newUser = await userService.createUser(userData);
      await loadUsers();
      setShowCreateForm(false);
      setSelectedUserId(newUser.id);
      onUserSelect(newUser);
    } catch (err) {
      throw new Error(err.message || 'Failed to create user profile');
    }
  }, [loadUsers, onUserSelect]);

  // Update user
  const handleUpdateUser = useCallback(async (userData) => {
    try {
      if (!editingUser) return;
      
      const updatedUser = await userService.updateUser(editingUser.id, { 
        name: userData.name 
      });
      await loadUsers();
      setEditingUser(null);
      
      // Update selection if this was the selected user
      if (selectedUserId === updatedUser.id) {
        onUserSelect(updatedUser);
      }
    } catch (err) {
      throw new Error(err.message || 'Failed to update user profile');
    }
  }, [editingUser, loadUsers, selectedUserId, onUserSelect]);

  // Delete user
  const handleDeleteUser = useCallback(async (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (!window.confirm(`Are you sure you want to delete ${user.name}'s profile? This action cannot be undone.`)) {
      return;
    }

    try {
      await userService.deleteUser(userId);
      await loadUsers();
      
      // Clear selection if deleted user was selected
      if (selectedUserId === userId) {
        setSelectedUserId(null);
      }
    } catch (err) {
      setError('Failed to delete user profile');
      console.error('Error deleting user:', err);
    }
  }, [users, selectedUserId, loadUsers]);

  // Select user and proceed
  const handleProceed = useCallback(async () => {
    if (!selectedUserId) return;
    
    const selectedUser = users.find(u => u.id === selectedUserId);
    if (selectedUser) {
      onUserSelect(selectedUser);
    }
  }, [selectedUserId, users, onUserSelect]);

  // Format date for display
  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  // Get user initials for avatar
  const getUserInitials = useCallback((name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }, []);

  if (isLoading) {
    return (
      <div className="user-profile-container">
        <div className="user-profile-modal">
          <div className="user-loading">
            <h3>Loading profiles...</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile-container">
      <div className="user-profile-modal">
        <div className="user-profile-header">
          <h2>
            {showCreateForm 
              ? (editingUser ? 'Edit Profile' : 'Create Your Profile')
              : 'Select User Profile'
            }
          </h2>
          <p>
            {showCreateForm
              ? (editingUser ? 'Update your profile information' : 'Create a profile to track your workouts')
              : 'Choose a profile to continue or create a new one'
            }
          </p>
        </div>

        {error && (
          <div className="user-error-message" style={{ textAlign: 'center', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {showCreateForm ? (
          <UserCreationForm
            onCreateUser={editingUser ? handleUpdateUser : handleCreateUser}
            onCancel={() => {
              setShowCreateForm(false);
              setEditingUser(null);
            }}
            initialData={editingUser}
          />
        ) : (
          <div className="user-selection">
            {users.length > 0 ? (
              <>
                <div className="user-list">
                  {users.map(user => (
                    <div
                      key={user.id}
                      className={`user-item ${selectedUserId === user.id ? 'selected' : ''}`}
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <div className="user-info">
                        <div className="user-name">
                          <div className="user-avatar">
                            {getUserInitials(user.name)}
                          </div>
                          {user.name}
                        </div>
                        <div className="user-meta">
                          Created {formatDate(user.createdAt)} • 
                          {user.metadata.totalWorkouts} workouts
                        </div>
                      </div>
                      
                      <div className="user-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="user-action-btn user-edit-btn"
                          onClick={() => {
                            setEditingUser(user);
                            setShowCreateForm(true);
                          }}
                          title="Edit profile"
                        >
                          Edit
                        </button>
                        <button
                          className="user-action-btn user-delete-btn"
                          onClick={() => handleDeleteUser(user.id)}
                          title="Delete profile"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="user-form-actions">
                  <button
                    className="user-btn user-btn-secondary"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    className="user-btn user-btn-primary"
                    onClick={handleProceed}
                    disabled={!selectedUserId}
                  >
                    Continue as {users.find(u => u.id === selectedUserId)?.name || 'User'}
                  </button>
                </div>
              </>
            ) : (
              <div className="no-users">
                <p>No user profiles found.</p>
              </div>
            )}

            <div className="create-user-section">
              <button
                className="create-user-btn"
                onClick={() => setShowCreateForm(true)}
              >
                + Create New Profile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

UserSelector.displayName = 'UserSelector';

UserSelector.propTypes = {
  onUserSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  currentUser: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired
  })
};

export default UserSelector;