import React, { useState, useEffect, useCallback } from 'react';
import ResultDisplay from './components/ResultDisplay';
import WorkoutLoggerForm from './components/WorkoutLogger';
import WorkoutHistory from './components/WorkoutHistory';
import { formatWeight, validateWeight, lbsToKg, kgToLbs } from './utils/weightUtils';
import { 
  PLATE_WEIGHTS_LBS, 
  PLATE_WEIGHTS_KG, 
  BARBELL_OPTIONS, 
  WEIGHT_INCREMENT_LBS, 
  WEIGHT_INCREMENT_KG,
  SWIPE_THRESHOLD,
  HAPTIC_DURATION 
} from './utils/constants';
import { DUMMY_WORKOUT_HISTORY } from './data/dummyData';
import './App.css';

const WeightCalculator = () => {
  const [targetWeight, setTargetWeight] = useState(BARBELL_OPTIONS.lbs[0].weight.toString());
  const [result, setResult] = useState(null);
  const [previousResult, setPreviousResult] = useState(null);
  const [showPrevious, setShowPrevious] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [unit, setUnit] = useState('lbs');
  const [selectedBarbell, setSelectedBarbell] = useState(BARBELL_OPTIONS.lbs[0]);
  const [workoutHistory, setWorkoutHistory] = useState(DUMMY_WORKOUT_HISTORY);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('calculator');
  
  // Workout logger form state
  const [workoutForm, setWorkoutForm] = useState({
    exercise: '',
    weight: '',
    sets: '',
    reps: '',
    notes: ''
  });

  // Load theme preference from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('weightCalculatorTheme');
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
  }, []);

  // Update document class and localStorage when theme changes
  useEffect(() => {
    document.documentElement.className = darkMode ? 'dark-theme' : 'light-theme';
    localStorage.setItem('weightCalculatorTheme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Load unit preference from localStorage
  useEffect(() => {
    const savedUnit = localStorage.getItem('weightCalculatorUnit');
    if (savedUnit && ['lbs', 'kg'].includes(savedUnit)) {
      setUnit(savedUnit);
      const defaultBarbell = BARBELL_OPTIONS[savedUnit][0];
      setSelectedBarbell(defaultBarbell);
      setTargetWeight(formatWeight(defaultBarbell.weight, savedUnit));
    }
  }, []);

  // Update localStorage when unit changes
  useEffect(() => {
    localStorage.setItem('weightCalculatorUnit', unit);
  }, [unit]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const toggleUnit = () => {
    const newUnit = unit === 'lbs' ? 'kg' : 'lbs';
    setUnit(newUnit);
    setSelectedBarbell(BARBELL_OPTIONS[newUnit][0]);
    
    // Convert current weight to new unit
    if (targetWeight) {
      const currentWeight = parseFloat(targetWeight);
      if (!isNaN(currentWeight)) {
        const convertedWeight = newUnit === 'kg' ? lbsToKg(currentWeight) : kgToLbs(currentWeight);
        setTargetWeight(formatWeight(convertedWeight, newUnit));
      }
    }
    
    setError('');
  };

  const handleBarbellChange = (barbell) => {
    setSelectedBarbell(barbell);
    setTargetWeight(formatWeight(barbell.weight, unit));
  };

  const incrementWeight = useCallback(() => {
    const currentWeight = parseFloat(targetWeight) || 0;
    const increment = unit === 'lbs' ? WEIGHT_INCREMENT_LBS : WEIGHT_INCREMENT_KG;
    const newWeight = currentWeight + increment;
    setTargetWeight(formatWeight(newWeight, unit));
    setError('');
  }, [targetWeight, unit]);

  const decrementWeight = useCallback(() => {
    const currentWeight = parseFloat(targetWeight) || 0;
    const increment = unit === 'lbs' ? WEIGHT_INCREMENT_LBS : WEIGHT_INCREMENT_KG;
    const newWeight = Math.max(0, currentWeight - increment);
    setTargetWeight(formatWeight(newWeight, unit));
    setError('');
  }, [targetWeight, unit]);

  // Keyboard shortcuts - moved after function definitions
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT') return; // Don't interfere with input
      
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === '+') {
        e.preventDefault();
        incrementWeight();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === '-') {
        e.preventDefault();
        decrementWeight();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [incrementWeight, decrementWeight]);

  const handleSwipe = useCallback((direction) => {
    if (direction === 'left') {
      decrementWeight();
    } else if (direction === 'right') {
      incrementWeight();
    }
    
    // Haptic feedback for mobile devices
    if (navigator.vibrate) {
      navigator.vibrate(HAPTIC_DURATION);
    }
  }, [decrementWeight, incrementWeight]);

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setTouchStart({ x: touch.clientX, y: touch.clientY });
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStart || e.changedTouches.length !== 1) {
      setTouchStart(null);
      return;
    }
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    
    // Only trigger swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
      handleSwipe(deltaX > 0 ? 'right' : 'left');
    }
    
    setTouchStart(null);
  }, [touchStart, handleSwipe]);

  const calculatePlates = useCallback((targetWeight) => {
    const plateWeights = unit === 'lbs' ? PLATE_WEIGHTS_LBS : PLATE_WEIGHTS_KG;
    const barbellWeight = selectedBarbell.weight;
    
    if (targetWeight < barbellWeight) {
      return {
        plateBreakdown: Object.fromEntries(plateWeights.map(w => [w, 0])),
        actualWeight: barbellWeight,
        targetWeight: targetWeight,
        exactMatch: false,
        totalPlates: 0,
        barbellWeight: barbellWeight,
        plateWeight: 0,
        unit: unit
      };
    }

    const plateBreakdown = Object.fromEntries(plateWeights.map(w => [w, 0]));
    let remainingWeight = targetWeight - barbellWeight;

    // Use more precise arithmetic to avoid floating point errors
    remainingWeight = Math.round(remainingWeight * 100) / 100;

    for (const plateWeight of plateWeights) {
      if (remainingWeight >= plateWeight) {
        const count = Math.floor(remainingWeight / plateWeight);
        plateBreakdown[plateWeight] = count;
        remainingWeight -= count * plateWeight;
        remainingWeight = Math.round(remainingWeight * 100) / 100;
      }
    }

    const plateWeight = Object.entries(plateBreakdown).reduce(
      (sum, [weight, count]) => sum + (parseFloat(weight) * count), 0
    );
    const actualWeight = barbellWeight + plateWeight;
    const exactMatch = Math.abs(actualWeight - targetWeight) < 0.01;
    const totalPlates = Object.values(plateBreakdown).reduce((sum, count) => sum + count, 0);

    return {
      plateBreakdown,
      actualWeight,
      targetWeight,
      exactMatch,
      totalPlates,
      barbellWeight,
      plateWeight,
      unit
    };
  }, [unit, selectedBarbell]);

  const validateWeight = (weight) => {
    const num = parseFloat(weight);
    if (isNaN(num) || num <= 0) {
      return 'Please enter a valid positive number';
    }
    
    if (weight.includes('.')) {
      const decimalPart = weight.split('.')[1];
      if (unit === 'lbs') {
        if (decimalPart.length !== 1) {
          return 'Please enter exactly one decimal place (e.g., 5.0 or 5.5)';
        }
        if (!['0', '5'].includes(decimalPart)) {
          return 'Decimal place must be .0 or .5 (e.g., 5.0 or 5.5)';
        }
      } else {
        // For kg, allow up to 2 decimal places
        if (decimalPart.length > 2) {
          return 'Please enter up to two decimal places (e.g., 5.00 or 5.25)';
        }
      }
    }
    
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationError = validateWeight(targetWeight);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    
    // Store previous result if one exists
    if (result) {
      setPreviousResult(result);
    }
    
    const newResult = calculatePlates(parseFloat(targetWeight));
    setResult(newResult);
  };

  const handleWorkoutSubmit = (e) => {
    e.preventDefault();
    if (!workoutForm.exercise || !workoutForm.sets || !workoutForm.reps || (!workoutForm.weight && !targetWeight)) {
      return; // Basic validation
    }

    const newWorkout = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      exercise: workoutForm.exercise,
      targetWeight: parseFloat(workoutForm.weight) || parseFloat(targetWeight),
      actualWeight: parseFloat(workoutForm.weight) || (result ? result.actualWeight : parseFloat(targetWeight)),
      unit: unit,
      barbell: selectedBarbell.label,
      sets: parseInt(workoutForm.sets),
      reps: parseInt(workoutForm.reps),
      completed: true,
      notes: workoutForm.notes
    };

    setWorkoutHistory([newWorkout, ...workoutHistory]);
    setWorkoutForm({ exercise: '', weight: '', sets: '', reps: '', notes: '' });
  };

  const updateWorkoutForm = (field, value) => {
    setWorkoutForm(prev => ({ ...prev, [field]: value }));
  };

  // Increment/decrement functions for workout form
  const incrementWorkoutField = (field) => {
    let newValue;
    
    if (field === 'weight') {
      const currentValue = parseFloat(workoutForm[field]) || 0;
      const increment = unit === 'lbs' ? WEIGHT_INCREMENT_LBS : WEIGHT_INCREMENT_KG;
      newValue = currentValue + increment;
      setWorkoutForm(prev => ({ ...prev, [field]: formatWeight(newValue, unit) }));
    } else {
      const currentValue = parseInt(workoutForm[field]) || 0;
      newValue = currentValue + 1;
      setWorkoutForm(prev => ({ ...prev, [field]: newValue.toString() }));
    }
  };

  const decrementWorkoutField = (field) => {
    let newValue;
    
    if (field === 'weight') {
      const currentValue = parseFloat(workoutForm[field]) || 0;
      const increment = unit === 'lbs' ? WEIGHT_INCREMENT_LBS : WEIGHT_INCREMENT_KG;
      newValue = Math.max(0, currentValue - increment);
      setWorkoutForm(prev => ({ ...prev, [field]: formatWeight(newValue, unit) }));
    } else {
      const currentValue = parseInt(workoutForm[field]) || 0;
      newValue = Math.max(1, currentValue - 1); // Don't go below 1 for sets/reps
      setWorkoutForm(prev => ({ ...prev, [field]: newValue.toString() }));
    }
  };

  const ResultDisplay = React.memo(({ result, title }) => {
    const unitLabel = result.unit || unit;
    return (
      <div className="result-container">
        <h3>{title}</h3>
        <div className="result-header">
          <p><strong>Target Weight:</strong> {formatWeight(result.targetWeight, unitLabel)} {unitLabel}</p>
          <p><strong>Actual Weight:</strong> {formatWeight(result.actualWeight, unitLabel)} {unitLabel}</p>
          {result.exactMatch ? (
            <p className="exact-match">✓ Exact match achieved!</p>
          ) : (
            <p className="difference">
              ✗ Difference: {formatWeight(Math.abs(result.actualWeight - result.targetWeight), unitLabel)} {unitLabel}
            </p>
          )}
        </div>
        
        <div className="weight-breakdown">
          <p><strong>Barbell Weight:</strong> {formatWeight(result.barbellWeight, unitLabel)} {unitLabel}</p>
          <p><strong>Plate Weight:</strong> {formatWeight(result.plateWeight, unitLabel)} {unitLabel}</p>
          <p><strong>Total Plates Needed:</strong> {result.totalPlates}</p>
        </div>

        {result.totalPlates > 0 ? (
          <div className="plate-breakdown">
            <h4>Plate Breakdown:</h4>
            <ul>
              {Object.entries(result.plateBreakdown).map(([weight, count]) => {
                if (count > 0) {
                  const totalWeight = parseFloat(weight) * count;
                  return (
                    <li key={weight}>
                      {formatWeight(parseFloat(weight), unitLabel)} {unitLabel} plates: {count} × {formatWeight(parseFloat(weight), unitLabel)} = {formatWeight(totalWeight, unitLabel)} {unitLabel}
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          </div>
        ) : (
          <p className="no-plates">No additional plates needed - barbell weight only!</p>
        )}
      </div>
    );
  });


  const WorkoutLoggerForm = React.memo(() => {
    const exerciseOptions = [
      'Bench Press',
      'Squat',
      'Deadlift',
      'Overhead Press',
      'Barbell Row',
      'Incline Bench Press',
      'Romanian Deadlift',
      'Front Squat',
      'Other'
    ];

    return (
      <div className="workout-logger">
        <h3>Log Your Workout</h3>
        <form onSubmit={handleWorkoutSubmit} className="workout-form">
          <div className="form-row">
            <div className="input-group">
              <label htmlFor="exercise">Exercise:</label>
              <select
                id="exercise"
                value={workoutForm.exercise}
                onChange={(e) => updateWorkoutForm('exercise', e.target.value)}
                className="workout-select"
                required
              >
                <option value="">Select an exercise</option>
                {exerciseOptions.map(exercise => (
                  <option key={exercise} value={exercise}>{exercise}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label htmlFor="weight">Weight ({unit}):</label>
              <div className="input-with-controls">
                <button 
                  type="button" 
                  className="increment-btn decrement" 
                  onClick={() => decrementWorkoutField('weight')}
                  aria-label={`Decrease weight by ${unit === 'lbs' ? WEIGHT_INCREMENT_LBS : WEIGHT_INCREMENT_KG} ${unit}`}
                >
                  −
                </button>
                <input
                  type="text"
                  id="weight"
                  value={workoutForm.weight}
                  onChange={(e) => updateWorkoutForm('weight', e.target.value)}
                  placeholder={`Current: ${targetWeight || selectedBarbell.weight} ${unit}`}
                  className="workout-input"
                />
                <button 
                  type="button" 
                  className="increment-btn increment" 
                  onClick={() => incrementWorkoutField('weight')}
                  aria-label={`Increase weight by ${unit === 'lbs' ? WEIGHT_INCREMENT_LBS : WEIGHT_INCREMENT_KG} ${unit}`}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label htmlFor="sets">Sets:</label>
              <div className="input-with-controls">
                <button 
                  type="button" 
                  className="increment-btn decrement" 
                  onClick={() => decrementWorkoutField('sets')}
                  aria-label="Decrease sets"
                >
                  −
                </button>
                <input
                  type="number"
                  id="sets"
                  value={workoutForm.sets}
                  onChange={(e) => updateWorkoutForm('sets', e.target.value)}
                  min="1"
                  max="20"
                  className="workout-input"
                  required
                />
                <button 
                  type="button" 
                  className="increment-btn increment" 
                  onClick={() => incrementWorkoutField('sets')}
                  aria-label="Increase sets"
                >
                  +
                </button>
              </div>
            </div>
            <div className="input-group">
              <label htmlFor="reps">Reps:</label>
              <div className="input-with-controls">
                <button 
                  type="button" 
                  className="increment-btn decrement" 
                  onClick={() => decrementWorkoutField('reps')}
                  aria-label="Decrease reps"
                >
                  −
                </button>
                <input
                  type="number"
                  id="reps"
                  value={workoutForm.reps}
                  onChange={(e) => updateWorkoutForm('reps', e.target.value)}
                  min="1"
                  max="50"
                  className="workout-input"
                  required
                />
                <button 
                  type="button" 
                  className="increment-btn increment" 
                  onClick={() => incrementWorkoutField('reps')}
                  aria-label="Increase reps"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="input-group">
              <label htmlFor="notes">Notes (optional):</label>
              <textarea
                id="notes"
                value={workoutForm.notes}
                onChange={(e) => updateWorkoutForm('notes', e.target.value)}
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

  return (
    <div className="weight-calculator">
      <header className="calculator-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Gym Plate Calculator</h1>
            <p>Find the minimum plates needed for your target weight</p>
            <p>Barbell: {selectedBarbell.label}</p>
            <p>Available plates: {unit === 'lbs' ? '45, 25, 10, 5, 2.5' : '25, 20, 15, 10, 5, 2.5, 1.25'} {unit}</p>
          </div>
          <div className="header-controls">
            <button className="unit-toggle" onClick={toggleUnit} aria-label="Toggle weight unit">
              {unit.toUpperCase()}
            </button>
            <button className="theme-toggle" onClick={toggleDarkMode} aria-label="Toggle dark mode">
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'calculator' ? 'active' : ''}`}
          onClick={() => setActiveTab('calculator')}
        >
          <span className="tab-icon">⚖️</span>
          <span className="tab-label">Plate Calculator</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'logger' ? 'active' : ''}`}
          onClick={() => setActiveTab('logger')}
        >
          <span className="tab-icon">📝</span>
          <span className="tab-label">Workout Logger</span>
        </button>
        <div className={`tab-indicator ${activeTab}`}></div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'calculator' && (
          <div className="calculator-tab">
            <form onSubmit={handleSubmit} className="calculator-form">
              <div className="input-group">
                <label htmlFor="barbell-select">
                  Select Barbell:
                </label>
                <select 
                  id="barbell-select" 
                  value={selectedBarbell.weight} 
                  onChange={(e) => handleBarbellChange(BARBELL_OPTIONS[unit].find(b => b.weight === parseFloat(e.target.value)))}
                  className="barbell-select"
                >
                  {BARBELL_OPTIONS[unit].map(barbell => (
                    <option key={barbell.weight} value={barbell.weight}>
                      {barbell.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="weight">
                  Enter desired total weight (including {formatWeight(selectedBarbell.weight, unit)} {unit} barbell):
                </label>
                <div className="input-with-controls">
                  <button 
                    type="button" 
                    className="increment-btn decrement" 
                    onClick={decrementWeight}
                    aria-label={`Decrease weight by ${unit === 'lbs' ? WEIGHT_INCREMENT_LBS : WEIGHT_INCREMENT_KG} ${unit}`}
                    title={`Decrease by ${unit === 'lbs' ? WEIGHT_INCREMENT_LBS : WEIGHT_INCREMENT_KG} ${unit}`}
                  >
                    −
                  </button>
                  <input
                    type="text"
                    id="weight"
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(e.target.value)}
                    placeholder={unit === 'lbs' ? 'e.g., 135 or 185.5' : 'e.g., 60 or 80.5'}
                    className={error ? 'error' : ''}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                  />
                  <button 
                    type="button" 
                    className="increment-btn increment" 
                    onClick={incrementWeight}
                    aria-label={`Increase weight by ${unit === 'lbs' ? WEIGHT_INCREMENT_LBS : WEIGHT_INCREMENT_KG} ${unit}`}
                    title={`Increase by ${unit === 'lbs' ? WEIGHT_INCREMENT_LBS : WEIGHT_INCREMENT_KG} ${unit}`}
                  >
                    +
                  </button>
                </div>
                {error && <p className="error-message">{error}</p>}
              </div>
              <button type="submit" className="calculate-btn">Calculate Plates</button>
            </form>

            {result && <ResultDisplay result={result} title="Current Result" />}

            {previousResult && (
              <div className="previous-result">
                <button 
                  className="toggle-previous"
                  onClick={() => setShowPrevious(!showPrevious)}
                >
                  {showPrevious ? '▼' : '▶'} Previous Result
                </button>
                
                {showPrevious && (
                  <div className="previous-result-content">
                    <ResultDisplay result={previousResult} title="Previous Result" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'logger' && (
          <div className="logger-tab">
            <WorkoutLoggerForm />
            <div className="workout-history">
              <button 
                className="toggle-history"
                onClick={() => setShowHistory(!showHistory)}
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
                          {new Date(workout.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
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
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <WeightCalculator />
    </div>
  );
}

export default App;
