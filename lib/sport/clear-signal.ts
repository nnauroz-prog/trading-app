// Definiert, was ein „klares Signal" ist — drei harte Kriterien
// gleichzeitig: Score ≥ 70, stabiler Markt, gute Datenlage.
// Wird in TopPredictionsRanking und BestPredictionCard als grünes
// „klares Signal"-Badge angezeigt.

import type { RankedPrediction } from '@/lib/sport/quality-ranking';

export interface ClearSignalCheck {
  isClear: boolean;
  reasons: string[];   // erfüllt
  missing: string[];   // nicht erfüllt
}

export function isClearSignal(rp: RankedPrediction): ClearSignalCheck {
  const reasons: string[] = [];
  const missing: string[] = [];

  if (rp.quality.score >= 70) reasons.push('Quality-Score ≥ 70');
  else missing.push(`Score nur ${rp.quality.score}/100`);

  if (rp.quality.recommendation.isStableMarket) reasons.push('stabiler Markt');
  else missing.push('enger / instabiler Markt');

  const dq = rp.fixture.probabilities?.dataQuality;
  if (dq === 'good') reasons.push('gute Datenlage');
  else missing.push(`Datenlage ${dq ?? 'unbekannt'}`);

  return {
    isClear: missing.length === 0,
    reasons,
    missing
  };
}
