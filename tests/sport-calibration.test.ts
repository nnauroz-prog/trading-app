import { describe, expect, it } from 'vitest';
import {
  adjustConfidenceByCalibration,
  bucketizeProbability,
  calculateBrierScore,
  calculateBucketStats,
  calculateCalibrationError,
  calculateOverconfidencePenalty,
  type CalibrationRecord
} from '@/lib/sport/sport-calibration';

function rec(p: number, outcome: 0 | 1, over: Partial<CalibrationRecord> = {}): CalibrationRecord {
  return {
    predictedProbability: p,
    actualOutcome: outcome,
    marketType: '1X2',
    league: 'Bundesliga',
    dataConfidence: 85,
    qualityScore: 80,
    timestamp: 1_700_000_000_000,
    ...over
  };
}

describe('calculateBrierScore', () => {
  it('Perfekter Treffer → 0', () => {
    expect(calculateBrierScore(1, 1)).toBe(0);
    expect(calculateBrierScore(0, 0)).toBe(0);
  });
  it('Halb daneben (0.5 vs 1) → 0.25', () => {
    expect(calculateBrierScore(0.5, 1)).toBe(0.25);
  });
  it('Komplett daneben → 1', () => {
    expect(calculateBrierScore(1, 0)).toBe(1);
  });
});

describe('bucketizeProbability', () => {
  it('unter 50 % → null (kein FREIGABE-Bucket)', () => {
    expect(bucketizeProbability(0.49)).toBeNull();
    expect(bucketizeProbability(0.3)).toBeNull();
  });
  it('Grenzen korrekt', () => {
    expect(bucketizeProbability(0.50)).toBe('50-59');
    expect(bucketizeProbability(0.59)).toBe('50-59');
    expect(bucketizeProbability(0.60)).toBe('60-69');
    expect(bucketizeProbability(0.78)).toBe('70-79');
    expect(bucketizeProbability(0.85)).toBe('80-89');
    expect(bucketizeProbability(0.90)).toBe('90-100');
    expect(bucketizeProbability(1.0)).toBe('90-100');
  });
});

describe('calculateCalibrationError', () => {
  it('Leere Records → null', () => {
    expect(calculateCalibrationError([])).toBeNull();
  });
  it('Perfekte Kalibrierung (alle 80 % treffen) → niedriger MSE', () => {
    const records = Array.from({ length: 10 }, () => rec(0.85, 1));
    const err = calculateCalibrationError(records);
    expect(err).not.toBeNull();
    // erwartet 0.845 (Bucket-Center), tatsaechlich 1 → MSE ~0.024
    expect(err!).toBeLessThan(0.05);
  });
  it('Schlecht kalibriert (80%-Bucket trifft nur 30 %) → hoher MSE', () => {
    const records = [
      ...Array.from({ length: 3 }, () => rec(0.85, 1)),
      ...Array.from({ length: 7 }, () => rec(0.85, 0))
    ];
    const err = calculateCalibrationError(records);
    expect(err!).toBeGreaterThan(0.3);
  });
});

describe('calculateBucketStats', () => {
  it('Leere Records → alle Buckets UNKLAR, 0 Samples', () => {
    const stats = calculateBucketStats([]);
    expect(stats.length).toBe(5);
    for (const s of stats) {
      expect(s.sampleSize).toBe(0);
      expect(s.historicalHitRate).toBeNull();
      expect(s.label).toBe('UNKLAR');
    }
  });
  it('10 von 10 im 80-89 % Bucket treffen → KALIBRIERT', () => {
    const records = Array.from({ length: 10 }, () => rec(0.85, 1));
    const stats = calculateBucketStats(records);
    const bucket = stats.find((s) => s.bucket === '80-89')!;
    expect(bucket.sampleSize).toBe(10);
    expect(bucket.historicalHitRate).toBe(1);
    expect(bucket.label).toBe('KALIBRIERT');
  });
  it('80-89-Bucket trifft nur 30 % → UEBERSCHAETZT', () => {
    const records = [
      ...Array.from({ length: 3 }, () => rec(0.85, 1)),
      ...Array.from({ length: 7 }, () => rec(0.85, 0))
    ];
    const stats = calculateBucketStats(records);
    const bucket = stats.find((s) => s.bucket === '80-89')!;
    expect(bucket.label).toBe('UEBERSCHAETZT');
    expect(bucket.overconfidencePenalty).toBeGreaterThan(0);
  });
  it('Unter Mindestgroesse (10) → UNKLAR auch bei perfekten Treffern', () => {
    const records = Array.from({ length: 9 }, () => rec(0.85, 1));
    const stats = calculateBucketStats(records);
    expect(stats.find((s) => s.bucket === '80-89')!.label).toBe('UNKLAR');
  });
});

describe('calculateOverconfidencePenalty', () => {
  it('Bucket mit null Sample → 0', () => {
    const penalty = calculateOverconfidencePenalty({
      bucket: '80-89', sampleSize: 0, historicalHitRate: null,
      expectedHitRate: 0.845, calibrationError: null, label: 'UNKLAR', overconfidencePenalty: 0
    });
    expect(penalty).toBe(0);
  });
  it('Trifft genau wie erwartet → 0', () => {
    const penalty = calculateOverconfidencePenalty({
      bucket: '80-89', sampleSize: 20, historicalHitRate: 0.845,
      expectedHitRate: 0.845, calibrationError: 0, label: 'KALIBRIERT', overconfidencePenalty: 0
    });
    expect(penalty).toBe(0);
  });
  it('Ueberschaetzung 20 Prozentpunkte → 20 Penalty', () => {
    const penalty = calculateOverconfidencePenalty({
      bucket: '80-89', sampleSize: 20, historicalHitRate: 0.645,
      expectedHitRate: 0.845, calibrationError: 0.2, label: 'UEBERSCHAETZT', overconfidencePenalty: 0
    });
    expect(penalty).toBe(20);
  });
  it('Penalty deckelt bei 30', () => {
    const penalty = calculateOverconfidencePenalty({
      bucket: '90-100', sampleSize: 20, historicalHitRate: 0.4,
      expectedHitRate: 0.945, calibrationError: 0.545, label: 'UEBERSCHAETZT', overconfidencePenalty: 0
    });
    expect(penalty).toBe(30);
  });
});

describe('adjustConfidenceByCalibration', () => {
  it('Keine Historie → konservative Deckelung (UNKLAR-Label)', () => {
    const out = adjustConfidenceByCalibration({
      probability: 0.85,
      baseConfidenceCap: 100,
      bucketStats: [],
      totalCalibrationSample: 0
    });
    expect(out.label).toBe('UNKLAR');
    expect(out.adjustedConfidenceCap).toBeLessThanOrEqual(72);
  });
  it('Bucket kalibriert → keine Verschaerfung', () => {
    const stats = calculateBucketStats(Array.from({ length: 12 }, () => rec(0.85, 1)));
    const out = adjustConfidenceByCalibration({
      probability: 0.85,
      baseConfidenceCap: 100,
      bucketStats: stats,
      totalCalibrationSample: 12
    });
    expect(out.label).toBe('KALIBRIERT');
    expect(out.adjustedConfidenceCap).toBe(100);
  });
  it('Bucket UEBERSCHAETZT → Cap deutlich runter', () => {
    const records = [
      ...Array.from({ length: 4 }, () => rec(0.85, 1)),
      ...Array.from({ length: 8 }, () => rec(0.85, 0))
    ];
    const stats = calculateBucketStats(records);
    const out = adjustConfidenceByCalibration({
      probability: 0.85,
      baseConfidenceCap: 100,
      bucketStats: stats,
      totalCalibrationSample: 12
    });
    expect(out.label).toBe('UEBERSCHAETZT');
    expect(out.adjustedConfidenceCap).toBeLessThan(100);
    expect(out.overconfidencePenalty).toBeGreaterThan(0);
  });
  it('Probability < 50 % → bucket null, kein Cap-Eingriff', () => {
    const out = adjustConfidenceByCalibration({
      probability: 0.45,
      baseConfidenceCap: 100,
      bucketStats: [],
      totalCalibrationSample: 50
    });
    expect(out.calibrationBucket).toBeNull();
    expect(out.adjustedConfidenceCap).toBe(100);
  });
});
