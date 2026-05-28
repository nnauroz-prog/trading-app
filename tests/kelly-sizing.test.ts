import { describe, expect, it } from 'vitest';
import { kellyFraction, confidenceToFactor, computeKellySuggestion } from '@/lib/kelly-sizing';

describe('kellyFraction', () => {
  it('is positive for an edge', () => {
    // p=0.55, b=1.5 → (0.825-0.45)/1.5 = 0.25
    expect(kellyFraction(0.55, 1.5)).toBeCloseTo(0.25, 5);
  });
  it('is zero/negative without edge', () => {
    // p=0.4, b=1.5 → (0.6-0.6)/1.5 = 0
    expect(kellyFraction(0.4, 1.5)).toBeCloseTo(0, 5);
    expect(kellyFraction(0.3, 1.5)).toBeLessThan(0);
  });
  it('returns 0 for invalid R:R', () => {
    expect(kellyFraction(0.6, 0)).toBe(0);
  });
});

describe('confidenceToFactor', () => {
  it('scales down for low confidence', () => {
    expect(confidenceToFactor(75)).toBe(1.0);
    expect(confidenceToFactor(45)).toBeLessThan(confidenceToFactor(70));
    expect(confidenceToFactor(30)).toBeLessThanOrEqual(0.25);
  });
});

describe('computeKellySuggestion', () => {
  it('caps recommended risk at the 2% hard cap', () => {
    const s = computeKellySuggestion(0.6, 1.5, 75, 5);
    expect(s.recommendedRiskPct).toBeLessThanOrEqual(2);
  });

  it('recommends zero and warns when no edge', () => {
    const s = computeKellySuggestion(0.35, 1.5, 75, 1);
    expect(s.recommendedRiskPct).toBe(0);
    expect(s.warning).toBeTruthy();
  });

  it('sizes down for low confidence vs high confidence', () => {
    const high = computeKellySuggestion(0.55, 1.5, 75, 1);
    const low = computeKellySuggestion(0.55, 1.5, 45, 1);
    expect(low.recommendedRiskPct).toBeLessThan(high.recommendedRiskPct);
  });

  it('never exceeds user max-risk scaled by confidence', () => {
    const s = computeKellySuggestion(0.55, 1.5, 75, 1);
    expect(s.recommendedRiskPct).toBeLessThanOrEqual(1);
  });
});
