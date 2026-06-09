// Sport Precision Desk — Kalibrierungs-Modul.
//
// Bewertet historische Trefferquote pro Probability-Bucket. Wenn ein Bucket
// historisch unter der erwarteten Trefferquote liegt, wird das Bucket als
// UEBERSCHAETZT markiert und zukuenftige Picks in diesem Bucket gedeckelt.
//
// Reine Funktionen, keine I/O, keine Fake-Historie. Wenn keine echte
// Historie vorhanden ist: Label = UNKLAR + aggressive Confidence-Deckelung.

export type CalibrationLabel = 'KALIBRIERT' | 'UNKLAR' | 'UEBERSCHAETZT';

// Probability-Bucket — wir verwenden 10-%-Schritte ab 50 %, weil unter 50 %
// Picks ohnehin nicht relevant fuer FREIGABE sind.
export type CalibrationBucket = '50-59' | '60-69' | '70-79' | '80-89' | '90-100';

export interface CalibrationRecord {
  predictedProbability: number;   // 0..1
  actualOutcome: 0 | 1;            // 1 = Treffer, 0 = Daneben
  marketType: string;              // z. B. '1X2', 'Over 2.5', 'BTTS'
  league: string;
  dataConfidence: number;          // 0..100 zum Zeitpunkt der Prognose
  qualityScore: number;            // 0..100 zum Zeitpunkt der Prognose
  timestamp: number;
}

export interface CalibrationBucketStats {
  bucket: CalibrationBucket;
  sampleSize: number;
  historicalHitRate: number | null;   // 0..1, null wenn keine Sample
  expectedHitRate: number;             // 0..1, Bucket-Mittelpunkt
  calibrationError: number | null;     // expected - historical, positiv = Ueberschaetzung
  label: CalibrationLabel;
  overconfidencePenalty: number;       // 0..30 Confidence-Punkte zu deckeln
}

// Mindest-Stichprobengroesse, ab der wir KALIBRIERT/UEBERSCHAETZT sprechen.
// Darunter immer UNKLAR — sonst kippt eine zufaellige Mini-Stichprobe das Bucket.
export const MIN_BUCKET_SAMPLE_FOR_LABEL = 10;
// Toleranz: historische Trefferquote darf max 8 Prozentpunkte unter erwartet
// liegen, sonst gilt das Bucket als UEBERSCHAETZT.
export const OVERCONFIDENCE_THRESHOLD_PCT = 8;

export function calculateBrierScore(predictedProbability: number, actualOutcome: 0 | 1): number {
  return Math.pow(predictedProbability - actualOutcome, 2);
}

export function bucketizeProbability(probability: number): CalibrationBucket | null {
  if (!Number.isFinite(probability)) return null;
  const pct = probability * 100;
  if (pct < 50) return null;
  if (pct < 60) return '50-59';
  if (pct < 70) return '60-69';
  if (pct < 80) return '70-79';
  if (pct < 90) return '80-89';
  return '90-100';
}

function bucketCenter(b: CalibrationBucket): number {
  const map: Record<CalibrationBucket, number> = {
    '50-59': 0.545,
    '60-69': 0.645,
    '70-79': 0.745,
    '80-89': 0.845,
    '90-100': 0.945
  };
  return map[b];
}

// Mean-Squared-Error gegenueber tatsaechlicher Bucket-Mitte.
// Niedriger = besser kalibriert. null wenn keine Samples.
export function calculateCalibrationError(records: CalibrationRecord[]): number | null {
  if (records.length === 0) return null;
  let sumSqErr = 0;
  let count = 0;
  for (const r of records) {
    const b = bucketizeProbability(r.predictedProbability);
    if (b === null) continue;
    sumSqErr += Math.pow(bucketCenter(b) - r.actualOutcome, 2);
    count += 1;
  }
  return count === 0 ? null : sumSqErr / count;
}

// Berechnet Penalty in Confidence-Punkten fuer ein bestimmtes Bucket.
// Wenn historische Trefferquote unter Erwartung liegt, deckeln wir
// proportional. Penalty ist 0..30.
export function calculateOverconfidencePenalty(stats: CalibrationBucketStats): number {
  if (stats.historicalHitRate === null) return 0;
  const errPct = (stats.expectedHitRate - stats.historicalHitRate) * 100;
  if (errPct <= 0) return 0;
  // 1 Punkt Penalty pro Prozentpunkt Ueberschaetzung, max 30.
  return Math.min(30, Math.round(errPct));
}

// Aggregiert eine Liste von Records nach Bucket zu Stats.
export function calculateBucketStats(records: CalibrationRecord[]): CalibrationBucketStats[] {
  const buckets: CalibrationBucket[] = ['50-59', '60-69', '70-79', '80-89', '90-100'];
  return buckets.map((b) => {
    const inBucket = records.filter((r) => bucketizeProbability(r.predictedProbability) === b);
    const sampleSize = inBucket.length;
    const hits = inBucket.filter((r) => r.actualOutcome === 1).length;
    const historicalHitRate = sampleSize > 0 ? hits / sampleSize : null;
    const expectedHitRate = bucketCenter(b);
    const calibrationError = historicalHitRate === null ? null : expectedHitRate - historicalHitRate;
    let label: CalibrationLabel = 'UNKLAR';
    if (sampleSize >= MIN_BUCKET_SAMPLE_FOR_LABEL && historicalHitRate !== null) {
      const errPct = (expectedHitRate - historicalHitRate) * 100;
      label = errPct > OVERCONFIDENCE_THRESHOLD_PCT ? 'UEBERSCHAETZT' : 'KALIBRIERT';
    }
    const intermediate: CalibrationBucketStats = {
      bucket: b,
      sampleSize,
      historicalHitRate,
      expectedHitRate,
      calibrationError,
      label,
      overconfidencePenalty: 0
    };
    intermediate.overconfidencePenalty = calculateOverconfidencePenalty(intermediate);
    return intermediate;
  });
}

export interface AdjustConfidenceInput {
  probability: number;            // 0..1, Roh-Modell-Output
  baseConfidenceCap: number;      // 0..100, vom Precision-Gate vorgegeben
  bucketStats: CalibrationBucketStats[];
  totalCalibrationSample: number; // Gesamtzahl bewerteter Picks
}

export interface AdjustConfidenceOutput {
  adjustedConfidenceCap: number;
  calibrationBucket: CalibrationBucket | null;
  label: CalibrationLabel;
  historicalHitRate: number | null;
  expectedHitRate: number | null;
  overconfidencePenalty: number;
  reason: string;
}

// Liefert den finalen, kalibrierungs-adjustierten Confidence-Cap fuer eine
// konkrete Probability. Wenn das zugehoerige Bucket UEBERSCHAETZT ist, wird
// der Cap runtergezogen. Wenn die Historie zu klein ist (UNKLAR), deckeln
// wir konservativ auf max 75 — keine aggressive Freigabe ohne Track-Record.
export function adjustConfidenceByCalibration(input: AdjustConfidenceInput): AdjustConfidenceOutput {
  const bucket = bucketizeProbability(input.probability);
  if (bucket === null) {
    return {
      adjustedConfidenceCap: input.baseConfidenceCap,
      calibrationBucket: null,
      label: 'UNKLAR',
      historicalHitRate: null,
      expectedHitRate: null,
      overconfidencePenalty: 0,
      reason: 'Probability unter 50 % — Kalibrierung nicht anwendbar.'
    };
  }
  const stats = input.bucketStats.find((s) => s.bucket === bucket) ?? null;
  if (!stats || stats.sampleSize < MIN_BUCKET_SAMPLE_FOR_LABEL || stats.historicalHitRate === null) {
    // Keine echte Historie → konservativ deckeln, nicht hoeher als 75.
    const totalTooSmall = input.totalCalibrationSample < MIN_BUCKET_SAMPLE_FOR_LABEL;
    const adjustedCap = Math.min(input.baseConfidenceCap, totalTooSmall ? 72 : 78);
    return {
      adjustedConfidenceCap: adjustedCap,
      calibrationBucket: bucket,
      label: 'UNKLAR',
      historicalHitRate: stats?.historicalHitRate ?? null,
      expectedHitRate: bucketCenter(bucket),
      overconfidencePenalty: 0,
      reason: totalTooSmall
        ? 'Noch keine ausreichende Historie — Anzeige wird konservativ gedeckelt.'
        : 'Bucket noch nicht genug Samples — kein aggressives Vertrauen.'
    };
  }
  if (stats.label === 'UEBERSCHAETZT') {
    const adjustedCap = Math.max(50, input.baseConfidenceCap - stats.overconfidencePenalty);
    return {
      adjustedConfidenceCap: adjustedCap,
      calibrationBucket: bucket,
      label: 'UEBERSCHAETZT',
      historicalHitRate: stats.historicalHitRate,
      expectedHitRate: stats.expectedHitRate,
      overconfidencePenalty: stats.overconfidencePenalty,
      reason: `Bucket ${bucket} hat historisch ${Math.round(stats.historicalHitRate * 100)} % statt erwartet ${Math.round(stats.expectedHitRate * 100)} % getroffen — Anzeige wird gedeckelt.`
    };
  }
  return {
    adjustedConfidenceCap: input.baseConfidenceCap,
    calibrationBucket: bucket,
    label: 'KALIBRIERT',
    historicalHitRate: stats.historicalHitRate,
    expectedHitRate: stats.expectedHitRate,
    overconfidencePenalty: 0,
    reason: `Bucket ${bucket} ist im Backtest kalibriert (${Math.round(stats.historicalHitRate * 100)} % von erwartet ${Math.round(stats.expectedHitRate * 100)} %).`
  };
}
