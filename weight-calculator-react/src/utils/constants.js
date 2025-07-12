// Plate weights for different units
export const PLATE_WEIGHTS_LBS = [45, 25, 10, 5, 2.5];
export const PLATE_WEIGHTS_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

// Barbell options
export const BARBELL_OPTIONS = {
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

// Weight increments
export const WEIGHT_INCREMENT_LBS = 2.5;
export const WEIGHT_INCREMENT_KG = 1.25;

// Touch/swipe constants
export const SWIPE_THRESHOLD = 50;
export const HAPTIC_DURATION = 50;

// Exercise options for workout logger
export const EXERCISE_OPTIONS = [
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