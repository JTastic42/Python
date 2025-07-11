import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// Constants
const PLATE_WEIGHTS_LBS = [45, 25, 10, 5, 2.5];
const PLATE_WEIGHTS_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
const BARBELL_OPTIONS = {
  lbs: [
    { weight: 45, label: 'Olympic Barbell (45 lbs)' },
    { weight: 35, label: 'Women\'s Olympic Barbell (35 lbs)' },
    { weight: 15, label: 'Training Bar (15 lbs)' }
  ],
  kg: [
    { weight: 20, label: 'Olympic Barbell (20 kg)' },
    { weight: 15, label: 'Women\'s Olympic Barbell (15 kg)' },
    { weight: 10, label: 'Training Bar (10 kg)' }
  ]
};
const WEIGHT_INCREMENT_LBS = 2.5;
const WEIGHT_INCREMENT_KG = 1.25;
const SWIPE_THRESHOLD = 50;
const HAPTIC_DURATION = 50;

// Conversion functions
const lbsToKg = (lbs) => Math.round((lbs * 0.453592) * 100) / 100;
const kgToLbs = (kg) => Math.round((kg * 2.20462) * 100) / 100;

const formatWeight = (weight, unit) => {
  return unit === 'kg' ? weight.toFixed(2) : weight.toString();
};

const WeightCalculator = () => {
  const [targetWeight, setTargetWeight] = useState('');
  const [result, setResult] = useState(null);
  const [previousResult, setPreviousResult] = useState(null);
  const [showPrevious, setShowPrevious] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [unit, setUnit] = useState('lbs');
  const [selectedBarbell, setSelectedBarbell] = useState(BARBELL_OPTIONS.lbs[0]);

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
      setSelectedBarbell(BARBELL_OPTIONS[savedUnit][0]);
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
