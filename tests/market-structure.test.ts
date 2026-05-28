import { describe, expect, it } from 'vitest';
import { Candle } from '@/lib/types/domain';
import { assessMarketStructure } from '@/lib/analysis/market-structure';

// Build candles from a list of closes; high/low straddle the close so swing
// pivots fall on the turning points.
function fromCloses(closes: number[]): Candle[] {
  return closes.map((c, i) => ({
    openTime: i * 3600_000,
    open: c,
    high: c + 1,
    low: c - 1,
    close: c,
    volume: 1000
  }));
}

// Swings spaced ~4 bars apart so lookback=3 pivots land on the turning points.
// Troughs 10->12 (higher low) and peaks 18->20 (higher high) => uptrend.
const up = fromCloses([14, 13, 12, 10, 12, 14, 16, 18, 16, 14, 13, 12, 14, 16, 18, 20, 18, 17, 16]);
// Peaks 20->16 (lower high) and troughs 12->10 (lower low) => downtrend.
const down = fromCloses([16, 17, 18, 20, 18, 16, 14, 12, 13, 14, 15, 16, 14, 12, 11, 10, 11, 12, 13]);

describe('assessMarketStructure', () => {
  it('returns unknown/range with too little data', () => {
    expect(assessMarketStructure(fromCloses([1, 2, 3])).structure).toBe('range');
  });

  it('detects an uptrend from higher highs and higher lows', () => {
    expect(assessMarketStructure(up).structure).toBe('uptrend');
  });

  it('detects a downtrend from lower highs and lower lows', () => {
    expect(assessMarketStructure(down).structure).toBe('downtrend');
  });

  it('reports support below and resistance above with a position in range', () => {
    const a = assessMarketStructure(up);
    expect(a.support).not.toBeNull();
    expect(a.resistance).not.toBeNull();
    expect(a.positionInRange).toBeGreaterThanOrEqual(0);
    expect(a.positionInRange).toBeLessThanOrEqual(1);
  });
});
