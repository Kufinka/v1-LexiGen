export interface SRSCard {
  easeFactor: number;
  interval: number;
  repetitions: number;
}

export interface SRSResult {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
}

/**
 * SRS Algorithm optimised for fast language vocabulary learning.
 * Rating: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
 *
 * Target first-review intervals (minutes-based for short ones):
 *   Again  → <1 min   (re-show almost immediately)
 *   Hard   → ~5 min
 *   Good   → ~5 hours
 *   Easy   → ~1 day
 *
 * Intervals are stored in **minutes** internally so sub-day
 * scheduling is possible. The `interval` field on the Card model
 * stays compatible: 0 means "immediate" (legacy), positive values
 * are now interpreted as minutes by the nextReview calculation below.
 */
export function calculateSRS(card: SRSCard, rating: number): SRSResult {
  const { easeFactor, interval, repetitions } = card;

  // Map 1-4 rating to SM-2's 0-5 scale for ease-factor adjustment
  const quality = Math.max(0, (rating - 1) * 1.67);
  let newEF = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEF = Math.max(1.3, newEF);

  let newIntervalMin: number; // in minutes
  let newRepetitions: number;

  if (rating === 1) {
    // Again — reset, review in <1 minute
    newIntervalMin = 1;        // 1 minute
    newRepetitions = 0;
    newEF = Math.max(1.3, easeFactor - 0.2);
  } else if (repetitions === 0) {
    // First successful review
    newRepetitions = 1;
    if (rating === 2) {
      newIntervalMin = 5;           // Hard: 5 min
    } else if (rating === 3) {
      newIntervalMin = 5 * 60;      // Good: 5 hours
    } else {
      newIntervalMin = 24 * 60;     // Easy: 1 day
    }
  } else if (repetitions === 1) {
    // Second successful review
    newRepetitions = 2;
    if (rating === 2) {
      newIntervalMin = 30;           // Hard: 30 min
    } else if (rating === 3) {
      newIntervalMin = 24 * 60;      // Good: 1 day
    } else {
      newIntervalMin = 3 * 24 * 60;  // Easy: 3 days
    }
  } else if (repetitions === 2) {
    // Third successful review
    newRepetitions = 3;
    if (rating === 2) {
      newIntervalMin = 8 * 60;       // Hard: 8 hours
    } else if (rating === 3) {
      newIntervalMin = 3 * 24 * 60;  // Good: 3 days
    } else {
      newIntervalMin = 7 * 24 * 60;  // Easy: 7 days
    }
  } else {
    // Subsequent reviews — multiply previous interval by ease factor
    newRepetitions = repetitions + 1;
    const prevMin = interval > 0 ? interval : 1;
    if (rating === 2) {
      newIntervalMin = Math.max(60, Math.round(prevMin * 1.2));        // Hard: modest growth
    } else if (rating === 3) {
      newIntervalMin = Math.round(prevMin * newEF);                    // Good: normal growth
    } else {
      newIntervalMin = Math.round(prevMin * newEF * 1.3);              // Easy: boosted growth
    }
  }

  const nextReview = new Date();
  nextReview.setMinutes(nextReview.getMinutes() + newIntervalMin);

  return {
    easeFactor: newEF,
    interval: newIntervalMin,
    repetitions: newRepetitions,
    nextReview,
  };
}
