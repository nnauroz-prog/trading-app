import { describe, expect, it } from 'vitest';
import { computeSafetyScoreHistory } from '@/lib/market/safety-score-history';
import type { PriceCandle } from '@/lib/market/yahoo-history';

function uptrend(days: number): PriceCandle[] {
  const out: PriceCandle[] = [];
  let p = 100;
  let t = Date.UTC(2024, 0, 1);
  for (let i = 0; i < days; i++) {
    const open = p;
    const drift = 0.0018;
    const wave = Math.sin(i / 8) * 0.01;
    p = p * (1 + drift + wave);
    const close = p;
    out.push({
      time: t,
      open,
      high: Math.max(open, close) * 1.005,
      low: Math.min(open, close) * 0.995,
      close,
      volume: 1_000_000
    });
    t += 86_400_000;
  }
  return out;
}

describe('computeSafetyScoreHistory', () => {
  it('zu wenig Historie → leeres Array', () => {
    const result = computeSafetyScoreHistory(uptrend(200), 60);
    expect(result).toEqual([]);
  });

  it('exakt 200 + Tage → richtige Anzahl Punkte', () => {
    const candles = uptrend(260);
    const result = computeSafetyScoreHistory(candles, 60);
    expect(result).toHaveLength(60);
  });

  it('jeder Punkt hat Zeitstempel + Score 0-100 + Grade', () => {
    const candles = uptrend(280);
    const result = computeSafetyScoreHistory(candles, 30);
    for (const p of result) {
      expect(p.time).toBeGreaterThan(0);
      expect(p.score).toBeGreaterThanOrEqual(0);
      expect(p.score).toBeLessThanOrEqual(100);
      expect(['A', 'B', 'C', 'D']).toContain(p.grade);
    }
  });

  it('Zeitstempel monoton steigend', () => {
    const candles = uptrend(280);
    const result = computeSafetyScoreHistory(candles, 30);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].time).toBeGreaterThan(result[i - 1].time);
    }
  });

  it('Default-Tage = 60', () => {
    const candles = uptrend(270);
    const result = computeSafetyScoreHistory(candles);
    expect(result.length).toBe(60);
  });

  it('letzter Punkt entspricht der heutigen Sicht', () => {
    const candles = uptrend(280);
    const result = computeSafetyScoreHistory(candles, 30);
    const last = result[result.length - 1];
    expect(last.time).toBe(candles[candles.length - 1].time);
  });
});
