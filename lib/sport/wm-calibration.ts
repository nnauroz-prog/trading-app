// WM-Kalibrierung aus dem eigenen Pick-Lern-Log.
//
// Mapped die resolved WM-Picks (win/loss) auf CalibrationRecords und
// nutzt die generische Bucket-Mathe aus sport-calibration.ts. Damit
// beantwortet das System die Frage: "Wenn wir 75 % sagen — treffen
// wir dann auch ~75 %?"
//
// Push (Remis bei Sieger-Pick) wird ignoriert — kein decisive Outcome.
// Reine Funktion, keine I/O.

import {
  calculateBucketStats,
  bucketizeProbability,
  type CalibrationBucketStats,
  type CalibrationRecord
} from '@/lib/sport/sport-calibration';
import type { WmPickLogEntry } from '@/lib/sport/wm-pick-learning';

export interface WmCalibrationResult {
  stats: CalibrationBucketStats[];
  totalDecisive: number;
}

export function buildWmCalibrationFromLog(log: WmPickLogEntry[]): WmCalibrationResult {
  const records: CalibrationRecord[] = log
    .filter((e) => e.outcome === 'win' || e.outcome === 'loss')
    .map((e) => ({
      predictedProbability: Math.max(0, Math.min(1, e.modelProbabilityPct / 100)),
      actualOutcome: (e.outcome === 'win' ? 1 : 0) as 0 | 1,
      marketType: 'wm-sieger',
      league: 'WM 2026',
      dataConfidence: 90,
      qualityScore: e.proTipperConviction * 100,
      timestamp: e.resolvedAt ?? e.recordedAt
    }));
  return { stats: calculateBucketStats(records), totalDecisive: records.length };
}

// Liefert fuer eine konkrete Pick-Probability die Bucket-Warnung,
// falls das Bucket im eigenen Log UEBERSCHAETZT ist. Sonst null.
export function calibrationWarningFor(
  probabilityPct: number,
  result: WmCalibrationResult
): string | null {
  const bucket = bucketizeProbability(probabilityPct / 100);
  if (!bucket) return null;
  const stat = result.stats.find((s) => s.bucket === bucket);
  if (!stat || stat.label !== 'UEBERSCHAETZT' || stat.historicalHitRate === null) return null;
  return `Eigene WM-Historie: Bucket ${bucket} % traf bisher nur ${Math.round(stat.historicalHitRate * 100)} % statt erwartet ${Math.round(stat.expectedHitRate * 100)} % (${stat.sampleSize} Picks) — Anzeige mit Vorsicht lesen.`;
}
