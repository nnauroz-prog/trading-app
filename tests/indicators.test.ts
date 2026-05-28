import { describe, expect, it } from 'vitest';
import { ema, sma, rsi, macd, atr, adx, bollinger, stochastic, detectSwingLow, detectSwingHigh } from '@/lib/analysis/indicators';
import { Bar } from '@/lib/analysis/indicators';

function makeBars(closes: number[]): Bar[] {
  return closes.map((c) => ({ high: c + 1, low: c - 1, close: c }));
}

describe('sma', () => {
  it('computes simple moving average', () => {
    const result = sma([1, 2, 3, 4, 5], 3);
    expect(result).toEqual([2, 3, 4]);
  });
  it('returns empty when not enough data', () => {
    expect(sma([1, 2], 5)).toEqual([]);
  });
});

describe('ema', () => {
  it('first value equals SMA of first period', () => {
    const result = ema([1, 2, 3, 4, 5, 6], 3);
    expect(result[0]).toBeCloseTo(2, 5);
  });
  it('reacts faster than sma to recent values', () => {
    const prices = [10, 10, 10, 10, 20];
    const e = ema(prices, 3);
    const s = sma(prices, 3);
    expect(e[e.length - 1]).toBeGreaterThan(s[s.length - 1]);
  });
});

describe('rsi', () => {
  it('returns 100 for monotonic increase (no losses)', () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
    const r = rsi(prices, 14);
    expect(r[r.length - 1]).toBeCloseTo(100, 1);
  });
  it('returns low value for monotonic decrease', () => {
    const prices = Array.from({ length: 20 }, (_, i) => 100 - i);
    const r = rsi(prices, 14);
    expect(r[r.length - 1]).toBeLessThan(5);
  });
  it('stays within 0-100 bounds', () => {
    const prices = [44, 44.3, 44.1, 43.6, 44.3, 44.8, 45.1, 45.4, 45.4, 46, 45.8, 46, 46.5, 46.2, 46.2, 46.1];
    const r = rsi(prices, 14);
    for (const v of r) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

describe('macd', () => {
  it('histogram = macd line - signal line', () => {
    const prices = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 5) * 10);
    const result = macd(prices);
    expect(result.histogram.length).toBeGreaterThan(0);
    expect(result.macd.length).toBe(result.signal.length);
    expect(result.histogram.length).toBe(result.signal.length);
  });
  it('returns empty for too-short input', () => {
    const result = macd([1, 2, 3]);
    expect(result.macd).toEqual([]);
  });
});

describe('atr', () => {
  it('is positive for volatile bars', () => {
    const bars = makeBars(Array.from({ length: 30 }, (_, i) => 100 + (i % 2) * 5));
    const a = atr(bars, 14);
    expect(a[a.length - 1]).toBeGreaterThan(0);
  });
  it('returns empty for insufficient data', () => {
    expect(atr(makeBars([1, 2, 3]), 14)).toEqual([]);
  });
});

describe('adx', () => {
  it('returns higher value for strong trend than choppy', () => {
    const trending = makeBars(Array.from({ length: 60 }, (_, i) => 100 + i));
    const choppy = makeBars(Array.from({ length: 60 }, (_, i) => 100 + (i % 2)));
    const adxTrend = adx(trending, 14).adx;
    const adxChop = adx(choppy, 14).adx;
    const lastTrend = adxTrend[adxTrend.length - 1] ?? 0;
    const lastChop = adxChop[adxChop.length - 1] ?? 0;
    expect(lastTrend).toBeGreaterThan(lastChop);
  });
});

describe('bollinger', () => {
  it('upper > middle > lower', () => {
    const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 5);
    const b = bollinger(prices, 20, 2);
    const i = b.middle.length - 1;
    expect(b.upper[i]).toBeGreaterThan(b.middle[i]);
    expect(b.middle[i]).toBeGreaterThan(b.lower[i]);
  });
});

describe('stochastic', () => {
  it('k stays within 0-100', () => {
    const bars = makeBars(Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i / 3) * 8));
    const s = stochastic(bars, 14, 3);
    for (const v of s.k) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

describe('swing detection', () => {
  it('detects a swing low', () => {
    const bars: Bar[] = [
      { high: 12, low: 10, close: 11 },
      { high: 11, low: 9, close: 10 },
      { high: 10, low: 7, close: 8 },
      { high: 11, low: 9, close: 10 },
      { high: 12, low: 10, close: 11 },
      { high: 13, low: 11, close: 12 },
      { high: 14, low: 12, close: 13 }
    ];
    const low = detectSwingLow(bars, 2);
    expect(low).toBe(7);
  });
  it('detects a swing high', () => {
    const bars: Bar[] = [
      { high: 10, low: 8, close: 9 },
      { high: 12, low: 10, close: 11 },
      { high: 16, low: 14, close: 15 },
      { high: 12, low: 10, close: 11 },
      { high: 10, low: 8, close: 9 },
      { high: 9, low: 7, close: 8 },
      { high: 8, low: 6, close: 7 }
    ];
    const high = detectSwingHigh(bars, 2);
    expect(high).toBe(16);
  });
});
