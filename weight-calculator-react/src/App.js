import React, { useState } from 'react';
import './App.css';

const WeightCalculator = () => {
  const [targetWeight, setTargetWeight] = useState('');
  const [result, setResult] = useState(null);
  const [previousResult, setPreviousResult] = useState(null);
  const [showPrevious, setShowPrevious] = useState(false);
  const [error, setError] = useState('');

  const calculatePlates = (targetWeight) => {
    const barbellWeight = 45.0;
    
    if (targetWeight < barbellWeight) {
      return {
        plateBreakdown: { 45: 0, 25: 0, 10: 0, 5: 0, 2.5: 0 },
        actualWeight: barbellWeight,
        targetWeight: targetWeight,
        exactMatch: false,
        totalPlates: 0,
        barbellWeight: barbellWeight,
        plateWeight: 0
      };
    }

    const plateWeights = [45, 25, 10, 5, 2.5];
    const plateBreakdown = { 45: 0, 25: 0, 10: 0, 5: 0, 2.5: 0 };
    let remainingWeight = targetWeight - barbellWeight;

    for (const plateWeight of plateWeights) {
      if (remainingWeight >= plateWeight) {
        const count = Math.floor(remainingWeight / plateWeight);
        plateBreakdown[plateWeight] = count;
        remainingWeight -= count * plateWeight;
        remainingWeight = Math.round(remainingWeight * 10) / 10;
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
      plateWeight
    };
  };

  const validateWeight = (weight) => {
    const num = parseFloat(weight);
    if (isNaN(num) || num <= 0) {
      return 'Please enter a valid positive number';
    }
    
    if (weight.includes('.')) {
      const decimalPart = weight.split('.')[1];
      if (decimalPart.length !== 1) {
        return 'Please enter exactly one decimal place (e.g., 5.0 or 5.5)';
      }
      if (!['0', '5'].includes(decimalPart)) {
        return 'Decimal place must be .0 or .5 (e.g., 5.0 or 5.5)';
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

  const ResultDisplay = ({ result, title }) => (
    <div className="result-container">
      <h3>{title}</h3>
      <div className="result-header">
        <p><strong>Target Weight:</strong> {result.targetWeight} lbs</p>
        <p><strong>Actual Weight:</strong> {result.actualWeight} lbs</p>
        {result.exactMatch ? (
          <p className="exact-match">✓ Exact match achieved!</p>
        ) : (
          <p className="difference">
            ✗ Difference: {(result.actualWeight - result.targetWeight).toFixed(1)} lbs
          </p>
        )}
      </div>
      
      <div className="weight-breakdown">
        <p><strong>Barbell Weight:</strong> {result.barbellWeight} lbs</p>
        <p><strong>Plate Weight:</strong> {result.plateWeight} lbs</p>
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
                    {weight} lb plates: {count} × {weight} = {totalWeight} lbs
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

  return (
    <div className="weight-calculator">
      <header className="calculator-header">
        <h1>Gym Plate Calculator</h1>
        <p>Find the minimum plates needed for your target weight</p>
        <p>Includes 45lb barbell as starting weight</p>
        <p>Available plates: 45, 25, 10, 5, and 2.5 lbs</p>
      </header>

      <form onSubmit={handleSubmit} className="calculator-form">
        <div className="input-group">
          <label htmlFor="weight">
            Enter desired total weight (including 45lb barbell):
          </label>
          <input
            type="text"
            id="weight"
            value={targetWeight}
            onChange={(e) => setTargetWeight(e.target.value)}
            placeholder="e.g., 135 or 185.5"
            className={error ? 'error' : ''}
          />
          {error && <p className="error-message">{error}</p>}
        </div>
        <button type="submit">Calculate Plates</button>
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
