import { describe, expect, it } from 'vitest';
import { bestOddsFromDrafts } from '@/lib/sport/wm-best-odds';

describe('bestOddsFromDrafts', () => {
  it('undefined -> null', () => {
    expect(bestOddsFromDrafts(undefined)).toBeNull();
  });

  it('Leeres Array -> null', () => {
    expect(bestOddsFromDrafts([])).toBeNull();
  });

  it('Nur leere Strings -> null', () => {
    expect(bestOddsFromDrafts(['', '', ''])).toBeNull();
  });

  it('Hoechste gueltige Quote gewinnt', () => {
    expect(bestOddsFromDrafts(['1.85', '2.10', '1.95'])).toBe(2.1);
  });

  it('Komma als Dezimaltrenner wird akzeptiert', () => {
    expect(bestOddsFromDrafts(['1,85', '2,30'])).toBe(2.3);
  });

  it('Quoten <= 1 werden ignoriert', () => {
    expect(bestOddsFromDrafts(['1.0', '0.5', '1.45'])).toBe(1.45);
  });

  it('Unsinn wird ignoriert', () => {
    expect(bestOddsFromDrafts(['abc', '2.05', ''])).toBe(2.05);
  });

  it('Einzelne gueltige Quote', () => {
    expect(bestOddsFromDrafts(['', '1.72', ''])).toBe(1.72);
  });
});
