import { describe, expect, it } from 'vitest';
import { compound, kellyFraction, positionSizing, rewardRisk } from '@/lib/calculators';

describe('positionSizing', () => {
  it('computes risk-based size for a clean setup', () => {
    const r = positionSizing({ accountBalance: 10000, riskPerTradePct: 1, entryPrice: 100, stopPrice: 95 });
    expect(r.feasible).toBe(true);
    expect(r.riskAmount).toBe(100); // 1% of 10k
    expect(r.positionSize).toBe(20); // 100 / (100-95)
    expect(r.notional).toBe(2000);
    expect(r.stopDistancePct).toBeCloseTo(5, 1);
  });

  it('rejects stop above entry', () => {
    const r = positionSizing({ accountBalance: 10000, riskPerTradePct: 1, entryPrice: 100, stopPrice: 110 });
    expect(r.feasible).toBe(false);
  });

  it('warns when stop is very wide', () => {
    const r = positionSizing({ accountBalance: 10000, riskPerTradePct: 1, entryPrice: 100, stopPrice: 80 });
    expect(r.feasible).toBe(true);
    expect(r.warning).toMatch(/Stop/);
  });
});

describe('rewardRisk', () => {
  it('returns 2:1 for symmetric target', () => {
    const r = rewardRisk({ entry: 100, stop: 95, target1: 110 });
    expect(r.rrTp1).toBe(2);
    expect(r.verdict).toBe('gut');
  });
  it('returns 3:1 as sehr gut', () => {
    const r = rewardRisk({ entry: 100, stop: 95, target1: 115 });
    expect(r.rrTp1).toBe(3);
    expect(r.verdict).toBe('sehr gut');
  });
  it('flags ungeeignet for stop below target', () => {
    const r = rewardRisk({ entry: 100, stop: 100, target1: 110 });
    expect(r.verdict).toBe('ungeeignet');
  });
  it('handles optional target 2', () => {
    const r = rewardRisk({ entry: 100, stop: 95, target1: 110, target2: 120 });
    expect(r.rrTp2).toBe(4);
  });
});

describe('compound', () => {
  it('zero years returns start amount', () => {
    const r = compound({ startAmount: 1000, annualReturnPct: 8, years: 0, yearlyContribution: 100 });
    expect(r.finalValue).toBe(1000);
  });
  it('grows by the annual return rate', () => {
    const r = compound({ startAmount: 1000, annualReturnPct: 10, years: 1, yearlyContribution: 0 });
    expect(r.finalValue).toBe(1100);
  });
  it('aggregates contributions', () => {
    const r = compound({ startAmount: 0, annualReturnPct: 0, years: 10, yearlyContribution: 1000 });
    expect(r.finalValue).toBe(10000);
    expect(r.totalContributions).toBe(10000);
    expect(r.totalGrowth).toBe(0);
  });
  it('yearlyValues array length matches years+1', () => {
    const r = compound({ startAmount: 1000, annualReturnPct: 5, years: 7, yearlyContribution: 0 });
    expect(r.yearlyValues.length).toBe(8);
  });
});

describe('kellyFraction', () => {
  it('returns positive Kelly with edge', () => {
    const r = kellyFraction({ winRatePct: 60, avgWinPct: 2, avgLossPct: 1 });
    expect(r.kellyFraction).toBeGreaterThan(0);
    expect(r.halfKelly).toBeCloseTo(r.kellyFraction / 2, 5);
  });
  it('returns 0 Kelly when no edge', () => {
    const r = kellyFraction({ winRatePct: 30, avgWinPct: 1, avgLossPct: 1 });
    expect(r.kellyFraction).toBe(0);
    expect(r.warning).toMatch(/Edge/);
  });
  it('warns at very high Kelly', () => {
    const r = kellyFraction({ winRatePct: 80, avgWinPct: 3, avgLossPct: 1 });
    expect(r.warning).toMatch(/25%/);
  });
});
