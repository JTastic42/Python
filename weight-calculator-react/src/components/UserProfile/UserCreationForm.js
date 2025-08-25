import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { UserValidators } from '../../services/userService';
import './UserProfile.css';

const UserCreationForm = React.memo(({ 
  onCreateUser, 
  onCancel, 
  isLoading = false,
  initialData = null 
}) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = useCallback(() => {
    const newErrors = {};

    try {
      UserValidators.name(formData.name);
    } catch (error) {
      newErrors.name = error.message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.name]);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  }, [errors]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (isSubmitting || isLoading) return;
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateUser({
        name: formData.name.trim(),
        ...initialData
      });
    } catch (error) {
      setErrors({ general: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onCreateUser, validateForm, isSubmitting, isLoading, initialData]);

  const handleCancel = useCallback(() => {
    if (isSubmitting || isLoading) return;
    onCancel();
  }, [onCancel, isSubmitting, isLoading]);

  return (
    <div className="user-creation-form">
      <form onSubmit={handleSubmit}>
        <div className="user-input-group">
          <label htmlFor="user-name">
            {initialData ? 'Update Name' : 'Enter Your Name'}
          </label>
          <input
            type="text"
            id="user-name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="e.g., John Smith"
            className={`user-input ${errors.name ? 'error' : ''}`}
            disabled={isSubmitting || isLoading}
            maxLength={50}
            autoComplete="name"
            autoFocus
          />
          {errors.name && (
            <div className="user-error-message">{errors.name}</div>
          )}
        </div>

        {errors.general && (
          <div className="user-error-message" style={{ textAlign: 'center' }}>
            {errors.general}
          </div>
        )}

        <div className="user-form-actions">
          <button
            type="button"
            className="user-btn user-btn-secondary"
            onClick={handleCancel}
            disabled={isSubmitting || isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="user-btn user-btn-primary"
            disabled={isSubmitting || isLoading || !formData.name.trim()}
          >
            {isSubmitting || isLoading ? (
              initialData ? 'Updating...' : 'Creating...'
            ) : (
              initialData ? 'Update Profile' : 'Create Profile'
            )}
          </button>
        </div>
      </form>
    </div>
  );
});

UserCreationForm.displayName = 'UserCreationForm';

UserCreationForm.propTypes = {
  onCreateUser: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  initialData: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string
  })
};

export default UserCreationForm;