import { describe, expect, it } from 'vitest';
import { backtestSafetyStrategy } from '@/lib/market/instrument-safety-backtest';
import type { PriceCandle } from '@/lib/market/yahoo-history';

function buildCandles(seed: number, days: number, driftPerDay: number, waveAmp: number, volume = 1_000_000): PriceCandle[] {
  const out: PriceCandle[] = [];
  let p = 100 + seed;
  let t = Date.UTC(2025, 0, 1);
  for (let i = 0; i < days; i++) {
    const open = p;
    const wave = Math.sin(i / 9) * waveAmp;
    p = p * (1 + driftPerDay + wave);
    const close = p;
    out.push({
      time: t,
      open,
      high: Math.max(open, close) * 1.004,
      low: Math.min(open, close) * 0.996,
      close,
      volume: volume + (i % 7) * 50_000
    });
    t += 86_400_000;
  }
  return out;
}

describe('backtestSafetyStrategy', () => {
  it('zu wenig Historie → leeres Ergebnis', () => {
    const result = backtestSafetyStrategy(buildCandles(0, 100, 0.001, 0.01));
    expect(result.totalTrades).toBe(0);
    expect(result.winRatePct).toBeNull();
  });

  it('klarer Uptrend mit Pullbacks → mehrere Trades, positive Bilanz', () => {
    const candles = buildCandles(0, 400, 0.0014, 0.012);
    const result = backtestSafetyStrategy(candles);
    expect(result.totalTrades).toBeGreaterThan(0);
    expect(result.buyAndHoldReturnPct).toBeGreaterThan(0);
  });

  it('PnL pro Trade ist konsistent (entry × exit korrekt)', () => {
    const candles = buildCandles(0, 400, 0.0014, 0.012);
    const result = backtestSafetyStrategy(candles);
    for (const t of result.trades) {
      const recomputed = ((t.exit - t.entry) / t.entry) * 100;
      expect(Math.abs(recomputed - t.pnlPct)).toBeLessThan(1e-6);
      expect(t.exitTime).toBeGreaterThan(t.entryTime);
      expect(t.holdDays).toBeGreaterThan(0);
    }
  });

  it('Win-Rate ist konsistent mit den einzelnen PnL-Werten', () => {
    const candles = buildCandles(0, 400, 0.0014, 0.012);
    const result = backtestSafetyStrategy(candles);
    if (result.totalTrades > 0 && result.winRatePct !== null) {
      const wins = result.trades.filter((t) => t.pnlPct >= 0).length;
      expect(result.winRatePct).toBe(Math.round((wins / result.totalTrades) * 100));
    }
  });

  it('Buy-and-Hold-Vergleich wird auch ohne Trades gefüllt', () => {
    const candles = buildCandles(0, 300, -0.001, 0.005);
    const result = backtestSafetyStrategy(candles);
    expect(typeof result.buyAndHoldReturnPct).toBe('number');
  });
});
