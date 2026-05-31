import { describe, expect, it } from 'vitest';
import { scoreCryptoCandidate, scoreOpportunity } from '@/lib/opportunity-score';

describe('scoreOpportunity', () => {
  it('clamps to 0..100', () => {
    expect(scoreOpportunity({ trend: -10, momentum: -5, marketEnvironment: 0, rewardRisk: 0, timing: 0, liquidity: 0, userFit: 0 }).score).toBe(0);
    expect(scoreOpportunity({ trend: 50, momentum: 50, marketEnvironment: 50, rewardRisk: 50, timing: 50, liquidity: 50, userFit: 50 }).score).toBe(100);
  });

  it('produces verdict tiers', () => {
    expect(scoreOpportunity({ trend: 0, momentum: 0, marketEnvironment: 0, rewardRisk: 0, timing: 0, liquidity: 0, userFit: 0 }).verdict).toBe('avoid');
    expect(scoreOpportunity({ trend: 20, momentum: 15, marketEnvironment: 15, rewardRisk: 20, timing: 10, liquidity: 10, userFit: 10 }).verdict).toBe('rare_high_quality');
  });
});

describe('scoreCryptoCandidate', () => {
  it('rewards a clean uptrend + good R/R + risk-on + broker available', () => {
    const r = scoreCryptoCandidate({
      passedCount: 10, totalCount: 12, structure: 'uptrend', nearSupport: true,
      rrTp1: 2.5, quoteVolume: 800_000_000, priceChangePct24h: 2,
      marketMood: 'risk-on', userBrokerAvailable: true, isOnWatchlist: true
    });
    expect(r.score).toBeGreaterThanOrEqual(80);
  });

  it('penalises chasing a pump', () => {
    const r = scoreCryptoCandidate({
      passedCount: 10, totalCount: 12, structure: 'uptrend', nearSupport: false,
      rrTp1: 2, quoteVolume: 500_000_000, priceChangePct24h: 18,
      marketMood: 'risk-on', userBrokerAvailable: true, isOnWatchlist: false
    });
    // priceChangePct24h > 15 zeros the timing component
    expect(r.score).toBeLessThan(80);
  });

  it('lowers score in risk-off market', () => {
    const on = scoreCryptoCandidate({
      passedCount: 9, totalCount: 12, structure: 'uptrend', nearSupport: true,
      rrTp1: 2, quoteVolume: 200_000_000, priceChangePct24h: 2,
      marketMood: 'risk-on', userBrokerAvailable: true, isOnWatchlist: false
    });
    const off = scoreCryptoCandidate({
      passedCount: 9, totalCount: 12, structure: 'uptrend', nearSupport: true,
      rrTp1: 2, quoteVolume: 200_000_000, priceChangePct24h: 2,
      marketMood: 'risk-off', userBrokerAvailable: true, isOnWatchlist: false
    });
    expect(on.score).toBeGreaterThan(off.score);
  });
});
