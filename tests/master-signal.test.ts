import { describe, expect, it } from 'vitest';
import { buildChecks } from '@/lib/analysis/master-signal-engine';
import { Candle } from '@/lib/types/domain';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

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

describe('buildChecks — structure', () => {
  const c1h = genCandles(100, 100, 0.2, HOUR);
  const c4h = genCandles(80, 100, 0.5, 4 * HOUR);
  const c1d = genCandles(250, 50, 0.4, DAY);
  const result = buildChecks(c1h, c4h, c1d);

  it('always returns exactly 12 checks', () => {
    expect(result.checks.length).toBe(12);
  });
  it('entry equals last 1h close', () => {
    expect(result.entry).toBeCloseTo(c1h[c1h.length - 1].close, 5);
  });
  it('atr is positive', () => {
    expect(result.atr1h).toBeGreaterThan(0);
  });
});

describe('buildChecks — uptrend vs downtrend', () => {
  // 1h ends ~150; 4h rises gently so its EMA50 stays well below the 1h entry.
  const upC1h = genCandles(100, 100, 0.5, HOUR);
  const upC4h = genCandles(80, 100, 0.3, 4 * HOUR);
  const upC1d = genCandles(250, 40, 0.5, DAY);
  const up = buildChecks(upC1h, upC4h, upC1d);

  const downC1h = genCandles(100, 150, -0.5, HOUR);
  const downC4h = genCandles(80, 150, -0.3, 4 * HOUR);
  const downC1d = genCandles(250, 200, -0.5, DAY);
  const down = buildChecks(downC1h, downC4h, downC1d);

  it('classifies steady uptrend as bull regime', () => {
    expect(up.marketRegime).toBe('bull');
  });
  it('classifies steady downtrend as bear regime', () => {
    expect(down.marketRegime).toBe('bear');
  });
  it('uptrend passes more confluences than downtrend', () => {
    const upPassed = up.checks.filter((c) => c.passed).length;
    const downPassed = down.checks.filter((c) => c.passed).length;
    expect(upPassed).toBeGreaterThan(downPassed);
  });
  it('downtrend fails the daily-trend check', () => {
    const dailyTrend = down.checks.find((c) => c.id === 'trend_1d');
    expect(dailyTrend?.passed).toBe(false);
  });
  it('uptrend passes the 4h-trend check', () => {
    const trend4h = up.checks.find((c) => c.id === 'trend_4h');
    expect(trend4h?.passed).toBe(true);
  });
});

describe('buildChecks — volume spike detection', () => {
  it('detects a volume spike on the latest bar', () => {
    const c1h = genCandles(100, 100, 0.1, HOUR, 1000);
    c1h[c1h.length - 1].volume = 5000; // 5x spike
    const c4h = genCandles(80, 100, 0.2, 4 * HOUR);
    const c1d = genCandles(250, 80, 0.2, DAY);
    const result = buildChecks(c1h, c4h, c1d);
    const volCheck = result.checks.find((c) => c.id === 'volume_spike');
    expect(volCheck?.passed).toBe(true);
  });
});
