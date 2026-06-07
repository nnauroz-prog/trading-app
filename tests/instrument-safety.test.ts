import { describe, expect, it } from 'vitest';
import { evaluateInstrumentSafety } from '@/lib/market/instrument-safety';
import type { PriceCandle } from '@/lib/market/yahoo-history';

// Synthesise candles that form a realistic uptrend: small daily moves with
// occasional pullbacks, so RSI stays out of the >70 zone and 52W-position is
// healthy (not at extremes). Long enough for MA200 + RSI + 52W-range.
function uptrendCandles(): PriceCandle[] {
  const candles: PriceCandle[] = [];
  let p = 100;
  let t = Date.UTC(2025, 0, 1);
  for (let i = 0; i < 260; i++) {
    const open = p;
    // Trend +0.18% mean, plus deterministic sine-wave pullbacks that drop the
    // price ~1% every 8 days to keep RSI off the ceiling.
    const drift = 0.0018;
    const wave = Math.sin(i / 8) * 0.01;
    p = p * (1 + drift + wave);
    const close = p;
    candles.push({
      time: t,
      open,
      high: Math.max(open, close) * 1.005,
      low: Math.min(open, close) * 0.995,
      close,
      volume: 1_000_000 + (i % 5) * 50_000
    });
    t += 86_400_000;
  }
  // Force the final close into the healthy 30–90% 52W-position band by
  // ending mid-pullback instead of at the absolute high.
  const last = candles[candles.length - 1];
  last.close = last.close * 0.97;
  last.low = Math.min(last.low, last.close * 0.998);
  return candles;
}

// Steep downtrend: −0.5% per day, falling volume.
function downtrendCandles(): PriceCandle[] {
  const candles: PriceCandle[] = [];
  let p = 200;
  let t = Date.UTC(2025, 0, 1);
  for (let i = 0; i < 260; i++) {
    const open = p;
    p = p * 0.995;
    const close = p;
    candles.push({ time: t, open, high: open * 1.002, low: close * 0.998, close, volume: 500_000 });
    t += 86_400_000;
  }
  return candles;
}

describe('evaluateInstrumentSafety', () => {
  it('clean uptrend with current price near recent high → at least Grade B and verdict KAUFEN or BEOBACHTEN', () => {
    const candles = uptrendCandles();
    const price = candles[candles.length - 1].close;
    const a = evaluateInstrumentSafety({ price, candles });
    // Steady +0.3%/day with no dips means RSI runs near overbought, so
    // we may lose one criterion; everything else must hold.
    expect(a.passedHard).toBeGreaterThanOrEqual(a.totalHard - 1);
    expect(['A', 'B']).toContain(a.grade);
    expect(['KAUFEN', 'BEOBACHTEN']).toContain(a.verdict);
  });

  it('downtrend → fails MA stack and momentum, low grade, NICHT KAUFEN', () => {
    const candles = downtrendCandles();
    const price = candles[candles.length - 1].close;
    const a = evaluateInstrumentSafety({ price, candles });
    expect(a.passedHard).toBeLessThanOrEqual(a.totalHard - 3);
    expect(['C', 'D']).toContain(a.grade);
    expect(a.verdict).toBe('NICHT KAUFEN');
    expect(a.criteria.find((c) => c.id === 'above-ma200')?.passed).toBe(false);
    expect(a.criteria.find((c) => c.id === 'ma-stack')?.passed).toBe(false);
    expect(a.criteria.find((c) => c.id === 'momentum-1m')?.passed).toBe(false);
  });

  it('always carries a residual-risk note (never claims guaranteed safety)', () => {
    const a = evaluateInstrumentSafety({ price: 100, candles: uptrendCandles() });
    expect(a.residualRiskNote.length).toBeGreaterThan(0);
  });

  it('grade A requires every hard criterion', () => {
    const candles = uptrendCandles();
    const price = candles[candles.length - 1].close;
    const a = evaluateInstrumentSafety({ price, candles });
    if (a.grade === 'A') {
      expect(a.passedHard).toBe(a.totalHard);
      expect(a.maxSafety).toBe(true);
      expect(a.verdict).toBe('KAUFEN');
    } else {
      expect(a.maxSafety).toBe(false);
    }
  });

  it('insufficient history → criteria honestly mark themselves as unknown but still scores', () => {
    // 30 days of candles — too few for MA200, RSI is borderline.
    const short: PriceCandle[] = [];
    let p = 100;
    let t = Date.UTC(2025, 0, 1);
    for (let i = 0; i < 30; i++) {
      const open = p;
      p = p * 1.002;
      const close = p;
      short.push({ time: t, open, high: close, low: open, close, volume: 1_000_000 });
      t += 86_400_000;
    }
    const a = evaluateInstrumentSafety({ price: short[short.length - 1].close, candles: short });
    expect(a.totalHard).toBeGreaterThan(0);
    expect(a.criteria.find((c) => c.id === 'above-ma200')?.passed).toBe(false);
    expect(a.criteria.find((c) => c.id === 'above-ma200')?.detail).toContain('Historie');
  });
});
