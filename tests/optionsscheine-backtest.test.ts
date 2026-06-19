import { describe, it, expect } from 'vitest';
import { backtestSuggestions } from '@/lib/optionsscheine/backtest';

function syntheticUpTrend(days: number, dailyReturn = 0.001, vol = 0.01): number[] {
  const closes: number[] = [100];
  for (let i = 1; i < days; i++) {
    const noise = (Math.sin(i * 0.7) + Math.cos(i * 0.3)) * vol;
    closes.push(closes[i - 1] * (1 + dailyReturn + noise));
  }
  return closes;
}

function syntheticFlat(days: number, vol = 0.01): number[] {
  return syntheticUpTrend(days, 0, vol);
}

function syntheticDownTrend(days: number, dailyReturn = -0.001, vol = 0.01): number[] {
  return syntheticUpTrend(days, dailyReturn, vol);
}

describe('backtestSuggestions', () => {
  it('liefert leeres Ergebnis bei zu wenig Daten', () => {
    const res = backtestSuggestions({ closes: [100, 101] });
    expect(res).toEqual([]);
  });

  it('liefert drei Risiko-Stufen', () => {
    const closes = syntheticUpTrend(800);
    const res = backtestSuggestions({ closes });
    expect(res).toHaveLength(3);
    expect(res.map((r) => r.risk)).toEqual(['niedrig', 'mittel', 'hoch']);
  });

  it('bei steigendem Underlying sind Call-Setups profitabel', () => {
    const closes = syntheticUpTrend(800, 0.0015);
    const res = backtestSuggestions({ closes, direction: 'call' });
    // Niedrig-Risiko-Call sollte die Aktien-Bewegung gut mitnehmen
    const low = res.find((r) => r.risk === 'niedrig')!;
    expect(low.count).toBeGreaterThan(0);
    expect(low.meanReturnPct).toBeGreaterThan(low.aktienReturnPctMean - 5);
  });

  it('bei seitwaerts Underlying verlieren Hoch-Risiko-Calls oft', () => {
    const closes = syntheticFlat(800);
    const res = backtestSuggestions({ closes, direction: 'call' });
    const high = res.find((r) => r.risk === 'hoch')!;
    // Hohe-Risiko-OTM-Calls verlieren bei seitwaerts wegen Theta + OTM-Verfall
    expect(high.winRatePct).toBeLessThan(50);
  });

  it('bei fallendem Underlying gewinnen Call-Setups selten', () => {
    const closes = syntheticDownTrend(800, -0.002);
    const res = backtestSuggestions({ closes, direction: 'call' });
    for (const r of res) {
      expect(r.winRatePct).toBeLessThan(40);
    }
  });

  it('Aktien-Return-Anker ist nahe am tatsaechlichen Sample-Drift', () => {
    const closes = syntheticUpTrend(800, 0.001);
    const res = backtestSuggestions({ closes });
    const mid = res.find((r) => r.risk === 'mittel')!;
    expect(mid.aktienReturnPctMean).toBeGreaterThan(5);
    expect(mid.aktienReturnPctMean).toBeLessThan(100);
  });

  it('count > 0 fuer niedrig-Risiko bei genug Daten', () => {
    const closes = syntheticUpTrend(800);
    const res = backtestSuggestions({ closes });
    const low = res.find((r) => r.risk === 'niedrig')!;
    expect(low.count).toBeGreaterThan(3);
  });

  it('Hoch-Risiko hat MEHR Stichproben als Niedrig-Risiko (kuerzerer Horizont)', () => {
    const closes = syntheticUpTrend(800);
    const res = backtestSuggestions({ closes });
    const low = res.find((r) => r.risk === 'niedrig')!;
    const high = res.find((r) => r.risk === 'hoch')!;
    expect(high.count).toBeGreaterThan(low.count);
  });

  it('jedes Trade-Objekt hat schluessige Felder', () => {
    const closes = syntheticUpTrend(800);
    const res = backtestSuggestions({ closes });
    const mid = res.find((r) => r.risk === 'mittel')!;
    if (mid.trades.length > 0) {
      const t = mid.trades[0];
      expect(t.underlyingAtSample).toBeGreaterThan(0);
      expect(t.strike).toBeGreaterThan(0);
      expect(t.underlyingAtExpiry).toBeGreaterThan(0);
      expect(t.premiumAtSample).toBeGreaterThan(0);
      expect(Number.isFinite(t.returnPct)).toBe(true);
    }
  });

  it('Verdict ist bei jedem Stat-Eintrag gesetzt', () => {
    const closes = syntheticUpTrend(800);
    const res = backtestSuggestions({ closes });
    for (const r of res) {
      expect(typeof r.verdict).toBe('string');
      expect(r.verdict.length).toBeGreaterThan(10);
      expect(['good', 'mixed', 'bad']).toContain(r.verdictTone);
    }
  });

  it('Steigender Trend produziert tendentiell good- oder mixed-Verdict fuer niedrig-Risiko', () => {
    const closes = syntheticUpTrend(800, 0.0015);
    const res = backtestSuggestions({ closes });
    const low = res.find((r) => r.risk === 'niedrig')!;
    expect(['good', 'mixed']).toContain(low.verdictTone);
  });

  it('Fallender Trend produziert tendentiell bad-Verdict fuer Calls', () => {
    const closes = syntheticDownTrend(800, -0.002);
    const res = backtestSuggestions({ closes, direction: 'call' });
    const tones = res.map((r) => r.verdictTone);
    expect(tones.filter((t) => t === 'bad').length).toBeGreaterThanOrEqual(1);
  });
});
