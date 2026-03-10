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
 * SM-2 Spaced Repetition Algorithm
 * Rating: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
 */
export function calculateSRS(card: SRSCard, rating: number): SRSResult {
  const { easeFactor, interval, repetitions } = card;

  // Map 1-4 rating to SM-2's 0-5 scale
  const quality = Math.max(0, (rating - 1) * 1.67);

  let newEF = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEF = Math.max(1.3, newEF);

  let newInterval: number;
  let newRepetitions: number;

  if (rating === 1) {
    // Again: reset completely — review again in ~10 minutes (0 days)
    newInterval = 0;
    newRepetitions = 0;
    newEF = Math.max(1.3, easeFactor - 0.2);
  } else if (repetitions === 0) {
    // First successful review — intervals differ by difficulty
    newRepetitions = 1;
    if (rating === 2) {
      newInterval = 1;       // Hard: 1 day
    } else if (rating === 3) {
      newInterval = 3;       // Good: 3 days
    } else {
      newInterval = 5;       // Easy: 5 days
    }
  } else if (repetitions === 1) {
    // Second successful review
    newRepetitions = 2;
    if (rating === 2) {
      newInterval = 4;       // Hard: 4 days
    } else if (rating === 3) {
      newInterval = 7;       // Good: 7 days
    } else {
      newInterval = 12;      // Easy: 12 days
    }
  } else {
    // Subsequent reviews — multiply by ease factor, adjust by rating
    newRepetitions = repetitions + 1;
    if (rating === 2) {
      newInterval = Math.max(1, Math.round(interval * 1.2));   // Hard: modest growth
    } else if (rating === 3) {
      newInterval = Math.round(interval * newEF);              // Good: normal growth
    } else {
      newInterval = Math.round(interval * newEF * 1.3);        // Easy: boosted growth
    }
  }

  const nextReview = new Date();
  if (newInterval === 0) {
    // "Again" — schedule ~10 minutes from now
    nextReview.setMinutes(nextReview.getMinutes() + 10);
  } else {
    nextReview.setDate(nextReview.getDate() + newInterval);
  }

  return {
    easeFactor: newEF,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReview,
  };
}
