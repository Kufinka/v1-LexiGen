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
    // Again: reset
    newInterval = 0;
    newRepetitions = 0;
  } else if (repetitions === 0) {
    newInterval = 1;
    newRepetitions = 1;
  } else if (repetitions === 1) {
    newInterval = 6;
    newRepetitions = 2;
  } else {
    newInterval = Math.round(interval * newEF);
    newRepetitions = repetitions + 1;
  }

  // Adjust interval based on rating
  if (rating === 2) {
    newInterval = Math.max(1, Math.round(newInterval * 0.8));
  } else if (rating === 4) {
    newInterval = Math.round(newInterval * 1.3);
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    easeFactor: newEF,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReview,
  };
}
