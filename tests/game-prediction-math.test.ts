import { describe, expect, it } from 'vitest';
import { basketballScoreForecast, footballScoreForecast, type ScoringResult } from '@/lib/sport/game-prediction-math';

const results = (scores: number[], allowed: number[]): ScoringResult[] => scores.map((score, i) => ({ for: score, against: allowed[i] }));
const home = results([110, 120, 105, 115, 100], [95, 108, 102, 100, 110]);
const away = results([95, 102, 108, 100, 110], [110, 120, 105, 115, 100]);
const sum = (probabilities: { home: number; draw: number; away: number }) => probabilities.home + probabilities.draw + probabilities.away;

describe('source-driven football score probabilities', () => {
  it('matches the analytic independent 0:0 probability and symmetric outcomes', () => {
    const prediction = footballScoreForecast(0.5, 0.5)!;
    expect(prediction).toMatchObject({ home: 0, away: 0 });
    expect(prediction.probability).toBeCloseTo(Math.exp(-1), 10);
    expect(prediction.probabilities.home).toBeCloseTo(prediction.probabilities.away, 12);
    expect(sum(prediction.probabilities)).toBeCloseTo(1, 12);
  });

  it('retains the high-rate tail rather than truncating goals at six', () => {
    const prediction = footballScoreForecast(12, 10)!;
    expect(prediction.home).toBeGreaterThan(6);
    expect(prediction.away).toBeGreaterThan(6);
    expect(sum(prediction.probabilities)).toBeCloseTo(1, 12);
    expect(prediction.probabilities.home).toBeGreaterThan(prediction.probabilities.away);
  });

  it('conditions on the actual live score and never predicts fewer goals', () => {
    const prediction = footballScoreForecast(0.3, 0.4, 3, 1)!;
    expect(prediction).toMatchObject({ home: 3, away: 1 });
    expect(prediction.probabilities.home).toBeGreaterThan(0.9);
    expect(footballScoreForecast(0, 0, 3, 1)).toMatchObject({ home: 3, away: 1, probability: 1, probabilities: { home: 1, draw: 0, away: 0 } });
  });

  it.each([[NaN, 1], [-1, 1], [13, 1], [1, Infinity]])('declines invalid rates %s:%s', (h, a) => {
    expect(footballScoreForecast(h, a)).toBeNull();
  });

  it('declines malformed current scores', () => {
    expect(footballScoreForecast(1, 1, -1, 0)).toBeNull();
    expect(footballScoreForecast(1, 1, 1.2, 0)).toBeNull();
  });
});

describe('empirical basketball scoring model', () => {
  it('uses measured team offense and opponent defense and returns decisive outcomes', () => {
    const prediction = basketballScoreForecast(home, away)!;
    expect(prediction.home).toBe(110);
    expect(prediction.away).toBe(103);
    expect(prediction.probabilities.home).toBeGreaterThan(0.5);
    expect(prediction.probabilities.draw).toBe(0);
    expect(sum(prediction.probabilities)).toBeCloseTo(1, 12);
    expect(prediction.probability).toBeGreaterThan(0);
    expect(prediction.probability).toBeLessThan(0.1);
  });

  it('scales additional scoring with time and keeps scores above the live result', () => {
    const prediction = basketballScoreForecast(home, away, { home: 90, away: 80, remainingFraction: 0.1 })!;
    expect(prediction.home).toBeGreaterThanOrEqual(90);
    expect(prediction.away).toBeGreaterThanOrEqual(80);
    expect(prediction.home).toBeLessThan(110);
    expect(prediction.away).toBeLessThan(100);
    expect(prediction.probabilities.home).toBeGreaterThan(0.95);
  });

  it('declines a live regulation tie at zero remaining time', () => {
    expect(basketballScoreForecast(home, away, { home: 100, away: 100, remainingFraction: 0 })).toBeNull();
  });

  it('declines short histories, zero empirical variance and bad source values', () => {
    expect(basketballScoreForecast(home.slice(0, 4), away)).toBeNull();
    const identical = Array.from({ length: 5 }, () => ({ for: 100, against: 100 }));
    expect(basketballScoreForecast(identical, identical)).toBeNull();
    expect(basketballScoreForecast([{ for: NaN, against: 100 }, ...home], away)).toBeNull();
    expect(basketballScoreForecast([{ for: 250, against: 100 }, ...home], away)).toBeNull();
    expect(basketballScoreForecast(home, away, { home: 10, away: 10, remainingFraction: 2 })).toBeNull();
  });
});
