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
 * Base intervals (minimum for each rating — never go below these):
 *   Again  → 1 min   (displayed as "<1 min")
 *   Hard   → 5 min   (displayed as "<5 min")
 *   Good   → 60 min  (1 hour)
 *   Easy   → 300 min (5 hours)
 *
 * Intervals grow proportionally to their base values.
 * Intervals are stored in **minutes** internally.
 */

const BASE_AGAIN = 1;     // 1 min
const BASE_HARD  = 5;     // 5 min
const BASE_GOOD  = 60;    // 1 hour
const BASE_EASY  = 300;   // 5 hours

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
    newIntervalMin = BASE_AGAIN;
    newRepetitions = 0;
    newEF = Math.max(1.3, easeFactor - 0.2);
  } else if (repetitions === 0) {
    // First successful review — use base intervals
    newRepetitions = 1;
    if (rating === 2) {
      newIntervalMin = BASE_HARD;          // <5 min
    } else if (rating === 3) {
      newIntervalMin = BASE_GOOD;          // 1 hour
    } else {
      newIntervalMin = BASE_EASY;          // 5 hours
    }
  } else {
    // Subsequent reviews — grow proportionally from previous interval
    newRepetitions = repetitions + 1;
    const prevMin = interval > 0 ? interval : 1;
    if (rating === 2) {
      // Hard: gradual growth — 1.2x
      newIntervalMin = Math.max(Math.round(prevMin * 1.2), prevMin + 2);
    } else if (rating === 3) {
      // Good: normal growth with ease factor
      newIntervalMin = Math.round(prevMin * newEF);
    } else {
      // Easy: boosted growth
      newIntervalMin = Math.round(prevMin * newEF * 1.3);
    }
  }

  // Enforce base floors — intervals must never go below the base for their rating
  if (rating === 2) newIntervalMin = Math.max(newIntervalMin, BASE_HARD);
  if (rating === 3) newIntervalMin = Math.max(newIntervalMin, BASE_GOOD);
  if (rating === 4) newIntervalMin = Math.max(newIntervalMin, BASE_EASY);

  const nextReview = new Date();
  nextReview.setMinutes(nextReview.getMinutes() + newIntervalMin);

  return {
    easeFactor: newEF,
    interval: newIntervalMin,
    repetitions: newRepetitions,
    nextReview,
  };
}
