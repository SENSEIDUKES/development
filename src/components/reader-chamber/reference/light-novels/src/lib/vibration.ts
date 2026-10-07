export const VIBRATION_PATTERNS = {
  softTap: [15],
  mediumTap: [30],
  heavyTap: [50],
  success: [15, 50, 30],
  error: [50, 50, 50],
  roar: [100, 50, 200, 50, 300],
  chime: [20, 30, 20, 30],
  magical: [10, 20, 10, 40, 10, 60],
  footstep: [10],
  combatHit: [60, 20, 40],
  surge: [20, 20, 40, 20, 60, 20, 80],
  shift: [10, 100, 10, 100, 10],
};

export const vibrate = (pattern: keyof typeof VIBRATION_PATTERNS | number | number[]) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (typeof pattern === 'string' && VIBRATION_PATTERNS[pattern]) {
        navigator.vibrate(VIBRATION_PATTERNS[pattern]);
      } else {
        navigator.vibrate(pattern as number | number[]);
      }
    } catch {
      // Ignore vibration errors
    }
  }
};
