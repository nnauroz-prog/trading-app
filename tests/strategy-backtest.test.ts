import { describe, expect, it } from 'vitest';
import { backtestStrategy } from '@/lib/analysis/strategy-backtest';
import { Candle } from '@/lib/types/domain';

const HOUR = 60 * 60 * 1000;

function gen(count: number, start: number, trend: number, step: number, vol = 1000): Candle[] {
  const out: Candle[] = [];
  let p = start;
  for (let i = 0; i < count; i++) {
    const open = p;
    const close = p + trend;
    out.push({
      openTime: i * step,
      open,
      high: Math.max(open, close) + Math.abs(trend) * 0.5 + 0.5,
      low: Math.min(open, close) - Math.abs(trend) * 0.5 - 0.5,
      close,
      volume: vol
    });
    p = close;
  }
  return out;
}

describe('backtestStrategy', () => {
  it('returns empty stats for insufficient data without crashing', () => {
    const stats = backtestStrategy('btc', 'BTC', gen(50, 100, 0.1, HOUR), gen(20, 100, 0.1, 4 * HOUR), gen(20, 100, 0.1, 24 * HOUR));
    expect(stats.totalSignals).toBe(0);
    expect(stats.winRate).toBeNull();
    expect(stats.equityCurve).toEqual([0]);
  });

  it('keeps win/loss/timeout consistent and equity curve aligned', () => {
    const c1h = gen(1000, 100, 0.05, HOUR);
    const c4h = gen(300, 100, 0.2, 4 * HOUR);
    const c1d = gen(300, 60, 0.3, 24 * HOUR);
    const stats = backtestStrategy('btc', 'BTC', c1h, c4h, c1d);
    expect(stats.wins + stats.losses + stats.timeouts).toBe(stats.totalSignals);
    expect(stats.equityCurve.length).toBe(stats.trades.length + 1);
    if (stats.winRate !== null) {
      expect(stats.winRate).toBeGreaterThanOrEqual(0);
      expect(stats.winRate).toBeLessThanOrEqual(1);
    }
  });

  it('every trade requires at least the minimum confluence', () => {
    const c1h = gen(1000, 100, 0.05, HOUR);
    const c4h = gen(300, 100, 0.2, 4 * HOUR);
    const c1d = gen(300, 60, 0.3, 24 * HOUR);
    const stats = backtestStrategy('btc', 'BTC', c1h, c4h, c1d);
    for (const t of stats.trades) {
      expect(t.confluence).toBeGreaterThanOrEqual(7);
    }
  });
});
