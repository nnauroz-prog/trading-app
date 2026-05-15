import { describe, expect, it } from 'vitest';
import {
  buildRecommendation,
  mapScoreToAction,
  scoreCrypto,
  scoreStock
} from '@/lib/analysis/scoring';
import { AnalysisSignal } from '@/lib/types/domain';

const baselineSignal: AnalysisSignal = {
  trend: 50,
  volume: 50,
  momentum: 50,
  volatilityRisk: 50,
  macroContext: 50,
  sentiment: 50,
  fundamentals: 50,
  earningsGrowth: 50
};

describe('mapScoreToAction', () => {
  it.each([
    [85, 'BUY'],
    [80, 'BUY'],
    [79, 'WATCH'],
    [65, 'WATCH'],
    [64, 'HOLD'],
    [50, 'HOLD'],
    [49, 'AVOID'],
    [35, 'AVOID'],
    [34, 'SELL'],
    [0, 'SELL']
  ])('maps score %i to %s', (score, expected) => {
    expect(mapScoreToAction(score)).toBe(expected);
  });
});

describe('scoreCrypto', () => {
  it('returns 50 for a fully-neutral signal', () => {
    expect(scoreCrypto(baselineSignal)).toBe(50);
  });

  it('treats high volatilityRisk as a penalty (lowers score)', () => {
    const calm = scoreCrypto({ ...baselineSignal, volatilityRisk: 0 });
    const wild = scoreCrypto({ ...baselineSignal, volatilityRisk: 100 });
    expect(calm).toBeGreaterThan(wild);
  });

  it('rewards strong trend and momentum', () => {
    const bullish = scoreCrypto({ ...baselineSignal, trend: 100, momentum: 100 });
    expect(bullish).toBeGreaterThan(50);
  });

  it('clamps to 0-100', () => {
    const allMin = scoreCrypto({
      trend: 0, volume: 0, momentum: 0, volatilityRisk: 100,
      macroContext: 0, sentiment: 0
    });
    const allMax = scoreCrypto({
      trend: 100, volume: 100, momentum: 100, volatilityRisk: 0,
      macroContext: 100, sentiment: 100
    });
    expect(allMin).toBe(0);
    expect(allMax).toBe(100);
  });
});

describe('scoreStock', () => {
  it('uses fundamentals fallback (50) when not provided', () => {
    const { fundamentals: _f, earningsGrowth: _e, ...withoutOptionals } = baselineSignal;
    expect(scoreStock(withoutOptionals)).toBe(scoreStock(baselineSignal));
  });

  it('reacts to fundamentals strength', () => {
    const weak = scoreStock({ ...baselineSignal, fundamentals: 0 });
    const strong = scoreStock({ ...baselineSignal, fundamentals: 100 });
    expect(strong).toBeGreaterThan(weak);
  });
});

describe('buildRecommendation', () => {
  it('marks high-score recommendations as low risk', () => {
    const rec = buildRecommendation('btc', 85, 'strong trend');
    expect(rec.action).toBe('BUY');
    expect(rec.riskLevel).toBe('low');
  });

  it('marks mid-score recommendations as medium risk', () => {
    expect(buildRecommendation('btc', 60, '').riskLevel).toBe('medium');
  });

  it('marks low-score recommendations as high risk', () => {
    const avoid = buildRecommendation('btc', 40, 'weak');
    expect(avoid.action).toBe('AVOID');
    expect(avoid.riskLevel).toBe('high');
    const sell = buildRecommendation('btc', 20, 'very weak');
    expect(sell.action).toBe('SELL');
    expect(sell.riskLevel).toBe('high');
  });

  it('uses longer hold duration for BUY/WATCH', () => {
    expect(buildRecommendation('btc', 85, '').holdDuration).toBe('2-8 Wochen');
    expect(buildRecommendation('btc', 70, '').holdDuration).toBe('2-8 Wochen');
    expect(buildRecommendation('btc', 55, '').holdDuration).toBe('1-4 Wochen');
  });
});
