import { describe, expect, it } from 'vitest';
import { backtestAsset } from '@/lib/analysis/backtest';
import { Candle } from '@/lib/types/domain';

const HOUR = 60 * 60 * 1000;

function genCandles(count: number, startPrice: number, trendPerBar: number, step: number, volume = 1000): Candle[] {
  const out: Candle[] = [];
  let price = startPrice;
  for (let i = 0; i < count; i++) {
    const open = price;
    const close = price + trendPerBar;
    const high = Math.max(open, close) + Math.abs(trendPerBar) * 0.3 + 0.5;
    const low = Math.min(open, close) - Math.abs(trendPerBar) * 0.3 - 0.5;
    out.push({ openTime: i * step, open, high, low, close, volume });
    price = close;
  }
  return out;
}

describe('backtestAsset', () => {
  const c1h = genCandles(400, 100, 0.15, HOUR);
  const c4h = genCandles(200, 100, 0.5, 4 * HOUR);
  const stats = backtestAsset('btc', 'BTC', c1h, c4h);

  it('returns consistent win/loss/timeout counts', () => {
    expect(stats.wins + stats.losses + stats.timeouts).toBe(stats.totalSignals);
  });

  it('win-rate is null or within 0-1', () => {
    if (stats.winRate !== null) {
      expect(stats.winRate).toBeGreaterThanOrEqual(0);
      expect(stats.winRate).toBeLessThanOrEqual(1);
    }
  });

  it('equity curve starts at zero', () => {
    expect(stats.equityCurve[0]).toBe(0);
  });

  it('equity curve length is trades + 1', () => {
    expect(stats.equityCurve.length).toBe(stats.trades.length + 1);
  });

  it('netReturn matches last equity point', () => {
    const lastEquity = stats.equityCurve[stats.equityCurve.length - 1];
    expect(stats.netReturnPct).toBeCloseTo(lastEquity, 5);
  });

  it('each trade has a valid outcome', () => {
    for (const t of stats.trades) {
      expect(['TP1', 'SL', 'TIMEOUT']).toContain(t.outcome);
      expect(t.exitTime).toBeGreaterThanOrEqual(t.entryTime);
    }
  });

  it('handles insufficient data gracefully', () => {
    const tiny = backtestAsset('btc', 'BTC', genCandles(10, 100, 0.1, HOUR), genCandles(5, 100, 0.1, 4 * HOUR));
    expect(tiny.totalSignals).toBe(0);
    expect(tiny.winRate).toBeNull();
  });
});
