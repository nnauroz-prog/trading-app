import { describe, expect, it } from 'vitest';
import { scoreEarningsGrowth, scoreFundamentals } from '@/lib/analysis/fundamentals';
import { StockMetrics } from '@/lib/providers/finnhub';

const empty: StockMetrics = {
  pe: null,
  peg: null,
  roe: null,
  debtToEquity: null,
  epsGrowthYoy: null,
  revenueGrowthYoy: null
};

describe('scoreFundamentals', () => {
  it('returns null when no metrics are available', () => {
    expect(scoreFundamentals(empty)).toBeNull();
  });

  it('rewards low PE + low PEG + high ROE + low debt', () => {
    const score = scoreFundamentals({ ...empty, pe: 12, peg: 0.8, roe: 28, debtToEquity: 0.3 });
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it('penalises loss-making companies', () => {
    const lossMaker = scoreFundamentals({ ...empty, pe: -5, roe: -10 });
    expect(lossMaker).toBeLessThanOrEqual(35);
  });

  it('averages only the metrics that are present', () => {
    const onlyPe = scoreFundamentals({ ...empty, pe: 12 });
    const peAndDebt = scoreFundamentals({ ...empty, pe: 12, debtToEquity: 0.2 });
    expect(onlyPe).toBe(70);
    expect(peAndDebt).toBe(70);
  });

  it('marks very expensive PE as a drag', () => {
    expect(scoreFundamentals({ ...empty, pe: 80 })).toBe(35);
  });
});

describe('scoreEarningsGrowth', () => {
  it('returns null when neither growth metric is available', () => {
    expect(scoreEarningsGrowth(empty)).toBeNull();
  });

  it('rewards strong growth', () => {
    expect(scoreEarningsGrowth({ ...empty, epsGrowthYoy: 30, revenueGrowthYoy: 25 })).toBeGreaterThanOrEqual(75);
  });

  it('penalises sharp contraction', () => {
    expect(scoreEarningsGrowth({ ...empty, epsGrowthYoy: -25, revenueGrowthYoy: -15 })).toBeLessThanOrEqual(30);
  });

  it('returns mid-range for modest single-digit growth', () => {
    expect(scoreEarningsGrowth({ ...empty, epsGrowthYoy: 5, revenueGrowthYoy: 6 })).toBe(55);
  });
});
