import React from 'react';
import PropTypes from 'prop-types';
import { EXERCISE_OPTIONS, WEIGHT_INCREMENT_LBS, WEIGHT_INCREMENT_KG } from '../../utils/constants';
import './WorkoutLogger.css';

const WorkoutLoggerForm = React.memo(({ 
  workoutForm, 
  onFormSubmit, 
  onFormUpdate, 
  onIncrementField, 
  onDecrementField,
  unit,
  targetWeight,
  selectedBarbell 
}) => {
  return (
    <div className="workout-logger">
      <h3>Log Your Workout</h3>
      <form onSubmit={onFormSubmit} className="workout-form">
        <div className="form-row">
          <div className="input-group">
            <label htmlFor="logger-exercise">Exercise:</label>
            <select
              id="logger-exercise"
              value={workoutForm.exercise}
              onChange={(e) => onFormUpdate('exercise', e.target.value)}
              className="workout-select"
              required
            >
              <option value="">Select an exercise</option>
              {EXERCISE_OPTIONS.map(exercise => (
                <option key={exercise} value={exercise}>{exercise}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="input-group">
            <label htmlFor="logger-weight">Weight ({unit}):</label>
            <div className="input-with-controls">
              <button 
                type="button" 
                className="increment-btn decrement" 
                onClick={() => onDecrementField('weight')}
                aria-label={`Decrease weight by ${unit === 'lbs' ? WEIGHT_INCREMENT_LBS : WEIGHT_INCREMENT_KG} ${unit}`}
              >
                −
              </button>
              <input
                type="text"
                id="logger-weight"
                value={workoutForm.weight}
                onChange={(e) => onFormUpdate('weight', e.target.value)}
                placeholder={`Current: ${targetWeight || selectedBarbell.weight} ${unit}`}
                className="workout-input"
              />
              <button 
                type="button" 
                className="increment-btn increment" 
                onClick={() => onIncrementField('weight')}
                aria-label={`Increase weight by ${unit === 'lbs' ? WEIGHT_INCREMENT_LBS : WEIGHT_INCREMENT_KG} ${unit}`}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="input-group">
            <label htmlFor="logger-sets">Sets:</label>
            <div className="input-with-controls">
              <button 
                type="button" 
                className="increment-btn decrement" 
                onClick={() => onDecrementField('sets')}
                aria-label="Decrease sets"
              >
                −
              </button>
              <input
                type="number"
                id="logger-sets"
                value={workoutForm.sets}
                onChange={(e) => onFormUpdate('sets', e.target.value)}
                min="1"
                max="20"
                className="workout-input"
                required
              />
              <button 
                type="button" 
                className="increment-btn increment" 
                onClick={() => onIncrementField('sets')}
                aria-label="Increase sets"
              >
                +
              </button>
            </div>
          </div>
          <div className="input-group">
            <label htmlFor="logger-reps">Reps:</label>
            <div className="input-with-controls">
              <button 
                type="button" 
                className="increment-btn decrement" 
                onClick={() => onDecrementField('reps')}
                aria-label="Decrease reps"
              >
                −
              </button>
              <input
                type="number"
                id="logger-reps"
                value={workoutForm.reps}
                onChange={(e) => onFormUpdate('reps', e.target.value)}
                min="1"
                max="50"
                className="workout-input"
                required
              />
              <button 
                type="button" 
                className="increment-btn increment" 
                onClick={() => onIncrementField('reps')}
                aria-label="Increase reps"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="input-group">
            <label htmlFor="logger-notes">Notes (optional):</label>
            <textarea
              id="logger-notes"
              value={workoutForm.notes}
              onChange={(e) => onFormUpdate('notes', e.target.value)}
              placeholder="How did it feel? Any observations..."
              className="workout-textarea"
              rows="3"
            />
          </div>
        </div>

        <button type="submit" className="log-workout-btn">
          Log Workout
        </button>
      </form>
    </div>
  );
});

WorkoutLoggerForm.displayName = 'WorkoutLoggerForm';

WorkoutLoggerForm.propTypes = {
  workoutForm: PropTypes.shape({
    exercise: PropTypes.string.isRequired,
    weight: PropTypes.string.isRequired,
    sets: PropTypes.string.isRequired,
    reps: PropTypes.string.isRequired,
    notes: PropTypes.string.isRequired
  }).isRequired,
  onFormSubmit: PropTypes.func.isRequired,
  onFormUpdate: PropTypes.func.isRequired,
  onIncrementField: PropTypes.func.isRequired,
  onDecrementField: PropTypes.func.isRequired,
  unit: PropTypes.oneOf(['lbs', 'kg']).isRequired,
  targetWeight: PropTypes.string.isRequired,
  selectedBarbell: PropTypes.shape({
    weight: PropTypes.number.isRequired,
    label: PropTypes.string.isRequired
  }).isRequired
};

export default WorkoutLoggerForm;