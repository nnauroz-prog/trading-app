import { describe, expect, it } from 'vitest';
import { buildWmCalibrationFromLog, calibrationWarningFor } from '@/lib/sport/wm-calibration';
import type { WmPickLogEntry } from '@/lib/sport/wm-pick-learning';

function entry(probPct: number, outcome: WmPickLogEntry['outcome'], i: number): WmPickLogEntry {
  return {
    id: `e${i}`,
    fixtureId: `fx${i}`,
    recordedAt: i,
    dateIso: '2026-06-15',
    homeTeam: 'X',
    awayTeam: 'Y',
    winnerTeam: 'X',
    winnerSide: 'home',
    modelProbabilityPct: probPct,
    eloDiff: 100,
    tier: 'modell-favorit',
    factorSnapshot: [],
    proTipperConviction: 0.9,
    outcome
  };
}

describe('buildWmCalibrationFromLog', () => {
  it('Leeres Log → 0 decisive', () => {
    const r = buildWmCalibrationFromLog([]);
    expect(r.totalDecisive).toBe(0);
  });

  it('Push und Pending werden ignoriert', () => {
    const r = buildWmCalibrationFromLog([
      entry(75, 'push', 1),
      entry(75, 'pending', 2)
    ]);
    expect(r.totalDecisive).toBe(0);
  });

  it('Wins/Losses landen im richtigen Bucket', () => {
    const log = Array.from({ length: 12 }, (_, i) => entry(75, i < 9 ? 'win' : 'loss', i));
    const r = buildWmCalibrationFromLog(log);
    expect(r.totalDecisive).toBe(12);
    const bucket = r.stats.find((s) => s.bucket === '70-79')!;
    expect(bucket.sampleSize).toBe(12);
    expect(bucket.historicalHitRate).toBeCloseTo(0.75, 2);
    expect(bucket.label).toBe('KALIBRIERT');
  });

  it('Ueberschaetztes Bucket erkannt (70er-Bucket trifft nur 33 %)', () => {
    const log = Array.from({ length: 12 }, (_, i) => entry(75, i < 4 ? 'win' : 'loss', i));
    const r = buildWmCalibrationFromLog(log);
    const bucket = r.stats.find((s) => s.bucket === '70-79')!;
    expect(bucket.label).toBe('UEBERSCHAETZT');
  });
});

describe('calibrationWarningFor', () => {
  it('Kalibriertes Bucket → keine Warnung', () => {
    const log = Array.from({ length: 12 }, (_, i) => entry(75, i < 9 ? 'win' : 'loss', i));
    const r = buildWmCalibrationFromLog(log);
    expect(calibrationWarningFor(75, r)).toBeNull();
  });

  it('Ueberschaetztes Bucket → konkrete Warnung mit Zahlen', () => {
    const log = Array.from({ length: 12 }, (_, i) => entry(75, i < 4 ? 'win' : 'loss', i));
    const r = buildWmCalibrationFromLog(log);
    const w = calibrationWarningFor(75, r);
    expect(w).not.toBeNull();
    expect(w).toContain('70-79');
    expect(w).toContain('33 %');
  });

  it('Pick in anderem Bucket bleibt unberuehrt', () => {
    const log = Array.from({ length: 12 }, (_, i) => entry(75, i < 4 ? 'win' : 'loss', i));
    const r = buildWmCalibrationFromLog(log);
    expect(calibrationWarningFor(85, r)).toBeNull(); // 80-89 Bucket leer
  });

  it('Unter 50 % → keine Warnung moeglich', () => {
    const r = buildWmCalibrationFromLog([]);
    expect(calibrationWarningFor(45, r)).toBeNull();
  });
});
