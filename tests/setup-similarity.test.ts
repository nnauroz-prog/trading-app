import { describe, expect, it } from 'vitest';
import { computeSetupSimilarity } from '@/lib/analysis/setup-similarity';
import { SafeTradeRecord } from '@/lib/analysis/backtest-summary';

function trade(over: Partial<SafeTradeRecord>): SafeTradeRecord {
  return {
    assetId: 'btc',
    ticker: 'BTC',
    entryTime: 1,
    exitTime: 2,
    entry: 100,
    exit: 110,
    outcome: 'TP1',
    confluence: 9,
    netPnlPct: 2.5,
    holdBars: 10,
    ...over
  };
}

describe('computeSetupSimilarity', () => {
  it('null target returns null', () => {
    expect(computeSetupSimilarity([], null)).toBeNull();
  });

  it('no matching trades returns too_small', () => {
    const r = computeSetupSimilarity([trade({ assetId: 'sol' })], { coinId: 'btc', ticker: 'BTC', passedCount: 9 });
    expect(r?.matchCount).toBe(0);
    expect(r?.sampleSize).toBe('too_small');
  });

  it('filters by coinId and confluence ±1', () => {
    const trades: SafeTradeRecord[] = [
      trade({ assetId: 'btc', confluence: 9, outcome: 'TP1', netPnlPct: 3 }),
      trade({ assetId: 'btc', confluence: 10, outcome: 'TP1', netPnlPct: 3 }),
      trade({ assetId: 'btc', confluence: 8, outcome: 'SL', netPnlPct: -2 }),
      trade({ assetId: 'btc', confluence: 7, outcome: 'TP1', netPnlPct: 3 }), // too far from 9
      trade({ assetId: 'eth', confluence: 9, outcome: 'TP1', netPnlPct: 3 }) // wrong coin
    ];
    const r = computeSetupSimilarity(trades, { coinId: 'btc', ticker: 'BTC', passedCount: 9 });
    expect(r?.matchCount).toBe(3); // confluence 8/9/10 on btc
    expect(r?.tp1Hits).toBe(2);
    expect(r?.slHits).toBe(1);
  });

  it('reports hit rate and expectancy when sample is decent', () => {
    const trades: SafeTradeRecord[] = Array.from({ length: 10 }, (_, i) => trade({
      assetId: 'btc', confluence: 9, outcome: i < 7 ? 'TP1' : 'SL', netPnlPct: i < 7 ? 2.5 : -1.5
    }));
    const r = computeSetupSimilarity(trades, { coinId: 'btc', ticker: 'BTC', passedCount: 9 });
    expect(r?.matchCount).toBe(10);
    expect(r?.hitRatePct).toBe(70);
    expect(r?.expectancyPct).toBeGreaterThan(0);
    expect(r?.sampleSize).toBe('good');
    expect(r?.oneLineVerdict.toLowerCase()).toContain('trefferquote');
  });

  it('honest verdict for poor hit rate', () => {
    const trades: SafeTradeRecord[] = Array.from({ length: 10 }, (_, i) => trade({
      assetId: 'btc', confluence: 9, outcome: i < 2 ? 'TP1' : 'SL', netPnlPct: i < 2 ? 2.5 : -1.5
    }));
    const r = computeSetupSimilarity(trades, { coinId: 'btc', ticker: 'BTC', passedCount: 9 });
    expect(r?.oneLineVerdict.toLowerCase()).toContain('vorsicht');
  });
});
