import { describe, expect, it } from 'vitest';
import { deriveCoinAction } from '@/lib/coin-action';

const baseInput = {
  hasCandidate: true,
  opportunityScore: 70,
  structure: 'uptrend' as const,
  priceChange24h: 2,
  nearSupport: true,
  marketMoodRiskOff: false
};

describe('deriveCoinAction', () => {
  it('unklare_datenlage when no candidate', () => {
    expect(deriveCoinAction({ ...baseInput, hasCandidate: false }).kind).toBe('unklare_datenlage');
  });
  it('meiden when market is risk-off', () => {
    expect(deriveCoinAction({ ...baseInput, marketMoodRiskOff: true }).kind).toBe('meiden');
  });
  it('warten_pullback when coin already up > 12%', () => {
    expect(deriveCoinAction({ ...baseInput, priceChange24h: 14 }).kind).toBe('warten_pullback');
  });
  it('kaufen on high score + near-support uptrend', () => {
    expect(deriveCoinAction({ ...baseInput, opportunityScore: 85 }).kind).toBe('kaufen');
  });
  it('kleine_position when score 70-80 and not all stars aligned', () => {
    expect(deriveCoinAction({ ...baseInput, opportunityScore: 73, nearSupport: false }).kind).toBe('kleine_position');
  });
  it('watchlist for medium scores', () => {
    expect(deriveCoinAction({ ...baseInput, opportunityScore: 60 }).kind).toBe('watchlist');
  });
  it('meiden on downtrend', () => {
    expect(deriveCoinAction({ ...baseInput, opportunityScore: 50, structure: 'downtrend' }).kind).toBe('meiden');
  });
  it('meiden on score < 35', () => {
    expect(deriveCoinAction({ ...baseInput, opportunityScore: 25 }).kind).toBe('meiden');
  });
});
