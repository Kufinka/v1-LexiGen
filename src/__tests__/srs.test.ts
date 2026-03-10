import { describe, it, expect } from "vitest";
import { calculateSRS } from "@/lib/srs";

describe("SRS Algorithm (minute-based intervals for fast vocab learning)", () => {
  const defaultCard = { easeFactor: 2.5, interval: 0, repetitions: 0 };

  it("Again should schedule ~1 minute and reset reps", () => {
    const result = calculateSRS(defaultCard, 1);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(0);
    expect(result.easeFactor).toBeLessThanOrEqual(2.5);
  });

  it("Hard first review should be 5 min", () => {
    const result = calculateSRS(defaultCard, 2);
    expect(result.interval).toBe(5);
    expect(result.repetitions).toBe(1);
  });

  it("Good first review should be 5 hours (300 min)", () => {
    const result = calculateSRS(defaultCard, 3);
    expect(result.interval).toBe(300);
    expect(result.repetitions).toBe(1);
  });

  it("Easy first review should be 1 day (1440 min)", () => {
    const result = calculateSRS(defaultCard, 4);
    expect(result.interval).toBe(1440);
    expect(result.repetitions).toBe(1);
  });

  it("Hard second review should be 7 min (gradual from 5)", () => {
    const card = { easeFactor: 2.5, interval: 5, repetitions: 1 };
    const result = calculateSRS(card, 2);
    expect(result.interval).toBe(7);
    expect(result.repetitions).toBe(2);
  });

  it("Hard third review should be 10 min (gradual from 7)", () => {
    const card = { easeFactor: 2.5, interval: 7, repetitions: 2 };
    const result = calculateSRS(card, 2);
    expect(result.interval).toBe(10);
    expect(result.repetitions).toBe(3);
  });

  it("Good second review should be 1 day", () => {
    const card = { easeFactor: 2.5, interval: 300, repetitions: 1 };
    const result = calculateSRS(card, 3);
    expect(result.interval).toBe(1440);
    expect(result.repetitions).toBe(2);
  });

  it("should increase interval on subsequent reviews", () => {
    const card = { easeFactor: 2.5, interval: 1440, repetitions: 2 };
    const result = calculateSRS(card, 3);
    expect(result.interval).toBeGreaterThan(1440);
    expect(result.repetitions).toBe(3);
  });

  it("Hard subsequent reviews should grow gradually (1.2x)", () => {
    const card = { easeFactor: 2.5, interval: 10, repetitions: 3 };
    const result = calculateSRS(card, 2);
    expect(result.interval).toBe(12);
    expect(result.repetitions).toBe(4);
  });

  it("should decrease ease factor on hard ratings", () => {
    const result = calculateSRS(defaultCard, 2);
    expect(result.easeFactor).toBeLessThan(2.5);
  });

  it("Easy interval should always be greater than Good interval for the same card", () => {
    const card = { easeFactor: 2.5, interval: 1440, repetitions: 2 };
    const goodResult = calculateSRS(card, 3);
    const easyResult = calculateSRS(card, 4);
    expect(easyResult.interval).toBeGreaterThan(goodResult.interval);
  });

  it("should never let ease factor drop below 1.3", () => {
    let card = { easeFactor: 1.3, interval: 0, repetitions: 0 };
    for (let i = 0; i < 10; i++) {
      const result = calculateSRS(card, 1);
      card = { easeFactor: result.easeFactor, interval: result.interval, repetitions: result.repetitions };
    }
    expect(card.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it("should return a future nextReview date", () => {
    const result = calculateSRS(defaultCard, 3);
    expect(result.nextReview.getTime()).toBeGreaterThanOrEqual(Date.now());
  });

  it("Again should reset progress after many reviews", () => {
    const card = { easeFactor: 2.5, interval: 10080, repetitions: 5 };
    const result = calculateSRS(card, 1);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(0);
  });
});
