import React from 'react';
import PropTypes from 'prop-types';
import { formatWeight } from '../../utils/weightUtils';
import './WorkoutHistory.css';

const WorkoutHistory = React.memo(({ 
  workoutHistory, 
  showHistory, 
  onToggleHistory 
}) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="workout-history">
      <button 
        className="toggle-history"
        onClick={onToggleHistory}
      >
        {showHistory ? '▼' : '▶'} Workout History ({workoutHistory.length} sessions)
      </button>
      
      {showHistory && (
        <div className="history-content">
          <div className="history-list">
            {workoutHistory.map((workout) => (
              <div key={workout.id} className={`history-item ${workout.completed ? 'completed' : 'incomplete'}`}>
                <div className="history-header">
                  <h4>{workout.exercise}</h4>
                  <span className="history-date">
                    {formatDate(workout.date)}
                  </span>
                </div>
                <div className="history-details">
                  <p><strong>Weight:</strong> {formatWeight(workout.actualWeight, workout.unit)} {workout.unit}</p>
                  <p><strong>Sets × Reps:</strong> {workout.sets} × {workout.reps}</p>
                  <p><strong>Barbell:</strong> {workout.barbell}</p>
                  {workout.notes && <p><strong>Notes:</strong> {workout.notes}</p>}
                </div>
                <div className="history-status">
                  {workout.completed ? (
                    <span className="status-completed">✓ Completed</span>
                  ) : (
                    <span className="status-incomplete">⚠ Incomplete</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

WorkoutHistory.displayName = 'WorkoutHistory';

WorkoutHistory.propTypes = {
  workoutHistory: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      date: PropTypes.string.isRequired,
      exercise: PropTypes.string.isRequired,
      targetWeight: PropTypes.number.isRequired,
      actualWeight: PropTypes.number.isRequired,
      unit: PropTypes.oneOf(['lbs', 'kg']).isRequired,
      barbell: PropTypes.string.isRequired,
      sets: PropTypes.number.isRequired,
      reps: PropTypes.number.isRequired,
      completed: PropTypes.bool.isRequired,
      notes: PropTypes.string
    })
  ).isRequired,
  showHistory: PropTypes.bool.isRequired,
  onToggleHistory: PropTypes.func.isRequired
};

export default WorkoutHistory;