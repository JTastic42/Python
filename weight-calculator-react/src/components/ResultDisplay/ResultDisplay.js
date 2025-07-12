import React from 'react';
import PropTypes from 'prop-types';
import { formatWeight } from '../../utils/weightUtils';
import './ResultDisplay.css';

const ResultDisplay = React.memo(({ result, title }) => {
  const unitLabel = result.unit;
  
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

ResultDisplay.displayName = 'ResultDisplay';

ResultDisplay.propTypes = {
  result: PropTypes.shape({
    unit: PropTypes.string.isRequired,
    targetWeight: PropTypes.number.isRequired,
    actualWeight: PropTypes.number.isRequired,
    exactMatch: PropTypes.bool.isRequired,
    totalPlates: PropTypes.number.isRequired,
    plateBreakdown: PropTypes.object.isRequired,
    barbellWeight: PropTypes.number.isRequired,
    plateWeight: PropTypes.number.isRequired
  }).isRequired,
  title: PropTypes.string.isRequired
};

export default ResultDisplay;