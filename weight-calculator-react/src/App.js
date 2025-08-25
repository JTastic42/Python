import { useState, useEffect, useCallback } from 'react';
import ResultDisplay from './components/ResultDisplay';
import WorkoutLoggerForm from './components/WorkoutLogger';
import WorkoutHistory from './components/WorkoutHistory';
import DataManager from './components/DataManager';
import { UserSelector, UserSwitcher } from './components/UserProfile';
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
import { dataServiceFactory } from './services/dataServiceFactory';
import { userService } from './services/userService';
import './App.css';

const WeightCalculator = () => {
  // Calculator state
  const [targetWeight, setTargetWeight] = useState(BARBELL_OPTIONS.lbs[0].weight.toString());
  const [result, setResult] = useState(null);
  const [previousResult, setPreviousResult] = useState(null);
  const [showPrevious, setShowPrevious] = useState(false);
  const [error, setError] = useState('');
  
  // UI state
  const [darkMode, setDarkMode] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [unit, setUnit] = useState('lbs');
  const [selectedBarbell, setSelectedBarbell] = useState(BARBELL_OPTIONS.lbs[0]);
  const [activeTab, setActiveTab] = useState('calculator');
  
  // Workout state
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [workoutForm, setWorkoutForm] = useState({
    exercise: '',
    weight: '',
    sets: '',
    reps: '',
    notes: ''
  });
  
  // Data service state
  const [dataService, setDataService] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState(null);

  // User state
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [userLoading, setUserLoading] = useState(true);

  // Initialize data service for specific user
  const initializeDataService = useCallback(async (userId) => {
    try {
      setIsLoading(true);
      setDataError(null);
      
      // Clear existing workout history and form immediately to prevent showing wrong user's data
      setWorkoutHistory([]);
      setWorkoutForm({
        exercise: '',
        weight: '',
        sets: '',
        reps: '',
        notes: ''
      });
      setResult(null);
      setPreviousResult(null);
      
      // Initialize or switch data service with user ID
      let service;
      if (dataService && dataServiceFactory.getServiceInfo().initialized) {
        // Switch existing service to new user
        service = await dataServiceFactory.switchUser(userId);
      } else {
        // Initialize new service
        service = await dataServiceFactory.initialize(null, userId);
      }
      setDataService(service);
      
      // Load user preferences
      const preferences = await service.getPreferences();
      setUnit(preferences.unit);
      setDarkMode(preferences.theme === 'dark');
      setSelectedBarbell(preferences.defaultBarbell);
      setTargetWeight(formatWeight(preferences.defaultBarbell.weight, preferences.unit));
      
      // Load workout history for new user
      const history = await service.getWorkoutHistory();
      console.log(`Loaded ${history.length} workouts for user: ${userId}`);
      setWorkoutHistory(history);
      
    } catch (error) {
      console.error('Data service initialization failed:', error);
      setDataError('Failed to load user data. Using default settings.');
      
      // Fallback to system preferences
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches || false;
      setDarkMode(prefersDark);
    } finally {
      setIsLoading(false);
    }
  }, [dataService]);

  // Initialize user service and check for current user
  useEffect(() => {
    const initializeUser = async () => {
      try {
        setUserLoading(true);
        setDataError(null);
        
        // Check for existing current user
        const existingUser = await userService.getCurrentUser();
        
        if (existingUser && existingUser.isActive) {
          setCurrentUser(existingUser);
          await initializeDataService(existingUser.id);
        } else {
          // No current user - show user selector
          setShowUserSelector(true);
          
          // Check if we have legacy data to migrate
          if (dataServiceFactory.hasLegacyData()) {
            console.log('Legacy data found - will migrate after user selection');
          }
        }
      } catch (error) {
        console.error('User initialization failed:', error);
        setDataError('Failed to initialize user system. Please refresh the page.');
      } finally {
        setUserLoading(false);
      }
    };

    initializeUser();
  }, []);

  // Update document class and save preferences when theme changes
  useEffect(() => {
    document.documentElement.className = darkMode ? 'dark-theme' : 'light-theme';
    
    if (dataService) {
      dataService.getPreferences().then(prefs => {
        dataService.savePreferences({ ...prefs, theme: darkMode ? 'dark' : 'light' })
          .catch(error => console.error('Error saving theme preference:', error));
      });
    }
  }, [darkMode, dataService]);

  // Save preferences when unit or barbell changes
  useEffect(() => {
    if (dataService) {
      dataService.getPreferences().then(prefs => {
        dataService.savePreferences({ 
          ...prefs, 
          unit,
          defaultBarbell: selectedBarbell
        }).catch(error => console.error('Error saving preferences:', error));
      });
    }
  }, [unit, selectedBarbell, dataService]);

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

  // Keyboard shortcuts
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

  // Touch/swipe handlers
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

  // Plate calculation function
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

  // Form submission handler
  const handleSubmit = (e) => {
    e.preventDefault();
    const validationError = validateWeight(targetWeight, unit);
    
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

  // Workout form handlers
  const handleWorkoutSubmit = async (e) => {
    e.preventDefault();
    if (!workoutForm.exercise || !workoutForm.sets || !workoutForm.reps || (!workoutForm.weight && !targetWeight)) {
      return; // Basic validation
    }

    if (!dataService) {
      setError('Data service not available');
      return;
    }

    if (!currentUser) {
      setError('No user selected. Please select a user first.');
      return;
    }

    try {
      const newWorkout = {
        // ID will be generated by DataTransformers.normalizeWorkout
        date: new Date().toISOString().split('T')[0],
        exercise: workoutForm.exercise,
        targetWeight: parseFloat(workoutForm.weight) || parseFloat(targetWeight),
        actualWeight: parseFloat(workoutForm.weight) || (result ? result.actualWeight : parseFloat(targetWeight)),
        unit: unit,
        barbell: selectedBarbell.label,
        sets: parseInt(workoutForm.sets),
        reps: parseInt(workoutForm.reps),
        completed: true,
        notes: workoutForm.notes,
        userId: currentUser.id // Add user ID for verification
      };
      
      console.log(`Saving workout for user: ${currentUser.name} (${currentUser.id})`);

      await dataService.saveWorkout(newWorkout);
      const updatedHistory = await dataService.getWorkoutHistory();
      setWorkoutHistory(updatedHistory);
      setWorkoutForm({ exercise: '', weight: '', sets: '', reps: '', notes: '' });
      setError('');
    } catch (error) {
      console.error('Error saving workout:', error);
      setError('Failed to save workout');
    }
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

  // User selection handler
  const handleUserSelect = useCallback(async (user) => {
    try {
      setUserLoading(true);
      
      // Set as current user in userService
      await userService.setCurrentUser(user);
      setCurrentUser(user);
      
      // Check for legacy data migration
      const hasLegacy = dataServiceFactory.hasLegacyData();
      if (hasLegacy) {
        console.log('Migrating legacy data to user:', user.name);
        const migrated = await dataServiceFactory.migrateLegacyData(user.id);
        if (migrated) {
          console.log('Legacy data migration completed');
        }
      }
      
      // Initialize data service for this user
      await initializeDataService(user.id);
      
      setShowUserSelector(false);
    } catch (error) {
      console.error('Error selecting user:', error);
      setDataError('Failed to switch user. Please try again.');
    } finally {
      setUserLoading(false);
    }
  }, [initializeDataService]);

  // User switching handler
  const handleSwitchUser = useCallback(() => {
    setShowUserSelector(true);
  }, []);

  // Close user selector handler
  const handleCloseUserSelector = useCallback(() => {
    if (!currentUser) {
      // If no user is selected, we can't close the selector
      return;
    }
    setShowUserSelector(false);
  }, [currentUser]);

  // Data change handler for when data is imported/cleared
  const handleDataChange = async () => {
    if (dataService && currentUser) {
      try {
        const history = await dataService.getWorkoutHistory();
        setWorkoutHistory(history);
        const preferences = await dataService.getPreferences();
        setUnit(preferences.unit);
        setDarkMode(preferences.theme === 'dark');
        setSelectedBarbell(preferences.defaultBarbell);
        setTargetWeight(formatWeight(preferences.defaultBarbell.weight, preferences.unit));
      } catch (error) {
        console.error('Error refreshing data after change:', error);
      }
    }
  };

  // Show loading states
  if (userLoading) {
    return (
      <div className="weight-calculator">
        <div className="loading-container">
          <h2>Loading Weight Calculator...</h2>
          <p>Initializing user system...</p>
        </div>
      </div>
    );
  }

  if (isLoading && currentUser) {
    return (
      <div className="weight-calculator">
        <div className="loading-container">
          <h2>Loading {currentUser.name}'s Data...</h2>
          <p>Setting up your workout environment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="weight-calculator">
      {dataError && (
        <div className="error-banner">
          <p>⚠️ {dataError}</p>
        </div>
      )}
      <header className="calculator-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Gym Plate Calculator</h1>
            <p>Find the minimum plates needed for your target weight</p>
            <p>Barbell: {selectedBarbell.label}</p>
            <p>Available plates: {unit === 'lbs' ? '45, 25, 10, 5, 2.5' : '25, 20, 15, 10, 5, 2.5, 1.25'} {unit}</p>
          </div>
          <div className="header-controls">
            <UserSwitcher 
              currentUser={currentUser}
              onSwitchUser={handleSwitchUser}
            />
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
        <button 
          className={`tab-button ${activeTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveTab('data')}
        >
          <span className="tab-icon">💾</span>
          <span className="tab-label">Data Manager</span>
        </button>
        <div className={`tab-indicator ${activeTab}`}></div>
      </div>

      {/* Tab Content */}
      <div className="tab-content" data-active-tab={activeTab}>
        {activeTab === 'calculator' && (
          <div className="calculator-tab">
            <form onSubmit={handleSubmit} className="calculator-form">
              <div className="input-group">
                <label htmlFor="calculator-barbell-select">
                  Select Barbell:
                </label>
                <select 
                  id="calculator-barbell-select" 
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
                <label htmlFor="calculator-weight">
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
                    id="calculator-weight"
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
            <WorkoutLoggerForm 
              workoutForm={workoutForm}
              onFormSubmit={handleWorkoutSubmit}
              onFormUpdate={updateWorkoutForm}
              onIncrementField={incrementWorkoutField}
              onDecrementField={decrementWorkoutField}
              unit={unit}
              targetWeight={targetWeight}
              selectedBarbell={selectedBarbell}
            />
            <WorkoutHistory 
              workoutHistory={workoutHistory}
              showHistory={showHistory}
              onToggleHistory={() => setShowHistory(!showHistory)}
            />
          </div>
        )}

        {activeTab === 'data' && (
          <div className="data-tab">
            <DataManager onDataChange={handleDataChange} />
          </div>
        )}
      </div>

      {/* User Selection Modal */}
      {showUserSelector && (
        <UserSelector
          onUserSelect={handleUserSelect}
          onClose={handleCloseUserSelector}
          currentUser={currentUser}
        />
      )}
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