import { describe, it, expect } from "vitest";
import { calculateSRS } from "@/lib/srs";

describe("SRS Algorithm", () => {
  const defaultCard = { easeFactor: 2.5, interval: 0, repetitions: 0 };

  it("should reset on rating 1 (Again)", () => {
    const result = calculateSRS(defaultCard, 1);
    expect(result.interval).toBe(0);
    expect(result.repetitions).toBe(0);
    expect(result.easeFactor).toBeLessThanOrEqual(2.5);
  });

  it("should set interval to 1 on first successful review", () => {
    const result = calculateSRS(defaultCard, 3);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(1);
  });

  it("should set interval to 6 on second successful review", () => {
    const card = { easeFactor: 2.5, interval: 1, repetitions: 1 };
    const result = calculateSRS(card, 3);
    expect(result.interval).toBe(6);
    expect(result.repetitions).toBe(2);
  });

  it("should increase interval on subsequent reviews", () => {
    const card = { easeFactor: 2.5, interval: 6, repetitions: 2 };
    const result = calculateSRS(card, 3);
    expect(result.interval).toBeGreaterThan(6);
    expect(result.repetitions).toBe(3);
  });

  it("should decrease ease factor on hard ratings", () => {
    const result = calculateSRS(defaultCard, 2);
    expect(result.easeFactor).toBeLessThan(2.5);
  });

  it("should increase interval more on Easy rating", () => {
    const card = { easeFactor: 2.5, interval: 6, repetitions: 2 };
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

  it("should reset progress fully on Again after multiple reviews", () => {
    const card = { easeFactor: 2.5, interval: 30, repetitions: 5 };
    const result = calculateSRS(card, 1);
    expect(result.interval).toBe(0);
    expect(result.repetitions).toBe(0);
  });
});
