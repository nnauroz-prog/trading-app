import { describe, expect, it } from 'vitest';
import { impliedOdds, fmtOdds } from '@/lib/sport/implied-odds';

describe('impliedOdds', () => {
  it('returns 2.00 for 50 %', () => {
    expect(impliedOdds(0.5)).toBe(2);
  });

  it('returns ~1.43 for 70 %', () => {
    expect(impliedOdds(0.7)).toBeCloseTo(1.43, 1);
  });

  it('caps at 1 for probability >= 100 %', () => {
    expect(impliedOdds(1)).toBe(1);
    expect(impliedOdds(1.5)).toBe(1);
  });

  it('returns 0 for invalid input', () => {
    expect(impliedOdds(0)).toBe(0);
    expect(impliedOdds(-0.1)).toBe(0);
    expect(impliedOdds(Number.NaN)).toBe(0);
  });
});

describe('fmtOdds', () => {
  it('formats with German decimal comma', () => {
    expect(fmtOdds(0.5)).toBe('2,00');
    expect(fmtOdds(0.4)).toBe('2,50');
  });

  it('returns dash when probability is invalid', () => {
    expect(fmtOdds(0)).toBe('—');
  });
});
