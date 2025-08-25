import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import './UserProfile.css';

const UserSwitcher = React.memo(({ 
  currentUser, 
  onSwitchUser, 
  className = '' 
}) => {
  const getUserInitials = useCallback((name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }, []);

  const handleClick = useCallback(() => {
    onSwitchUser();
  }, [onSwitchUser]);

  if (!currentUser) {
    return (
      <div className={`user-switcher ${className}`} onClick={handleClick}>
        <div className="user-avatar">?</div>
        <div className="user-display-name">No User</div>
        <div className="user-switch-icon">▼</div>
      </div>
    );
  }

  return (
    <div className={`user-switcher ${className}`} onClick={handleClick}>
      <div className="user-avatar">
        {getUserInitials(currentUser.name)}
      </div>
      <div className="user-display-name" title={currentUser.name}>
        {currentUser.name}
      </div>
      <div className="user-switch-icon">▼</div>
    </div>
  );
});

UserSwitcher.displayName = 'UserSwitcher';

UserSwitcher.propTypes = {
  currentUser: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired
  }),
  onSwitchUser: PropTypes.func.isRequired,
  className: PropTypes.string
};

export default UserSwitcher;