// Conversion functions
export const lbsToKg = (lbs) => Math.round((lbs * 0.453592) * 100) / 100;
export const kgToLbs = (kg) => Math.round((kg * 2.20462) * 100) / 100;

export const formatWeight = (weight, unit) => {
  return unit === 'kg' ? weight.toFixed(2) : weight.toString();
};

// Weight validation
export const validateWeight = (weight, unit) => {
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