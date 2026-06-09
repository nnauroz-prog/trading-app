import { describe, expect, it } from 'vitest';
import { buildCalibrationFromJournal, type MinimalTipJournalEntry } from '@/lib/sport/sport-precision-bridge';

function entry(over: Partial<MinimalTipJournalEntry> & { outcome: MinimalTipJournalEntry['outcome']; modelProbabilityPct: number }): MinimalTipJournalEntry {
  return {
    market: '1X2',
    league: 'Bundesliga',
    qualityScore: 70,
    dataQuality: 'good',
    resolvedAt: 1_700_000_000_000,
    ...over
  };
}

describe('buildCalibrationFromJournal', () => {
  it('Leeres Journal → 0 total, alle Buckets 0', () => {
    const { stats, total } = buildCalibrationFromJournal([]);
    expect(total).toBe(0);
    expect(stats.every((s) => s.sampleSize === 0)).toBe(true);
  });

  it('Pending und Push werden ignoriert', () => {
    const log: MinimalTipJournalEntry[] = [
      entry({ outcome: 'pending', modelProbabilityPct: 85 }),
      entry({ outcome: 'push', modelProbabilityPct: 85 })
    ];
    const { total } = buildCalibrationFromJournal(log);
    expect(total).toBe(0);
  });

  it('Wins/Losses fuettern Bucket-Stats', () => {
    const log: MinimalTipJournalEntry[] = [
      ...Array.from({ length: 8 }, () => entry({ outcome: 'win', modelProbabilityPct: 85 })),
      ...Array.from({ length: 4 }, () => entry({ outcome: 'loss', modelProbabilityPct: 85 }))
    ];
    const { stats, total } = buildCalibrationFromJournal(log);
    expect(total).toBe(12);
    const bucket = stats.find((s) => s.bucket === '80-89')!;
    expect(bucket.sampleSize).toBe(12);
    expect(bucket.historicalHitRate).toBeCloseTo(8 / 12, 2);
  });

  it('Ueberschaetztes Bucket erkennen (80-89 trifft nur 30 %)', () => {
    const log: MinimalTipJournalEntry[] = [
      ...Array.from({ length: 3 }, () => entry({ outcome: 'win', modelProbabilityPct: 85 })),
      ...Array.from({ length: 7 }, () => entry({ outcome: 'loss', modelProbabilityPct: 85 }))
    ];
    const { stats } = buildCalibrationFromJournal(log);
    const bucket = stats.find((s) => s.bucket === '80-89')!;
    expect(bucket.label).toBe('UEBERSCHAETZT');
    expect(bucket.overconfidencePenalty).toBeGreaterThan(0);
  });

  it('Unter 50 % Probability werden ignoriert (kein FREIGABE-Bucket)', () => {
    const log: MinimalTipJournalEntry[] = [
      entry({ outcome: 'win', modelProbabilityPct: 40 }),
      entry({ outcome: 'loss', modelProbabilityPct: 30 })
    ];
    const { stats, total } = buildCalibrationFromJournal(log);
    // total zaehlt resolved Picks (egal welcher Bucket), aber kein Bucket
    // bekommt Samples weil bucketizeProbability null zurueckgibt.
    expect(total).toBe(2);
    expect(stats.every((s) => s.sampleSize === 0)).toBe(true);
  });
});
