// Krypto-Calibration aus dem FirmaDecision-Log.
//
// Mapped historische BUY-Entscheidungen + aktuelle Preise auf
// CalibrationRecords:
//   probability = passedCount / totalCount (z. B. 9/12 = 0.75)
//   actualOutcome = 1 wenn HIT_TP, 0 wenn HIT_SL, skip OPEN/NO_DATA
//
// Dann nutzen wir die generische Bucket-Logik aus sport-calibration.ts —
// sie ist asset-agnostisch.

import type { FirmaDecision } from '@/lib/firma-memory';
import { evaluateTradePnl } from '@/lib/agents/firma-pnl';
import {
  calculateBucketStats,
  type CalibrationBucketStats,
  type CalibrationRecord
} from '@/lib/sport/sport-calibration';

const ASSUMED_TOTAL_COUNT = 12; // master-signal verwendet 12 Konfluenz-Punkte

export interface CryptoCalibrationResult {
  stats: CalibrationBucketStats[];
  totalResolvedTrades: number;
}

export function buildCryptoCalibrationFromFirmaLog(
  log: FirmaDecision[],
  currentPriceFor: (coin: string) => number | null
): CryptoCalibrationResult {
  const records: CalibrationRecord[] = [];
  for (const d of log) {
    if (d.verdict !== 'BUY') continue;
    if (typeof d.passedCount !== 'number' || d.passedCount <= 0) continue;
    const trade = evaluateTradePnl(d, d.coin ? currentPriceFor(d.coin) : null);
    if (!trade) continue;
    if (trade.outcome !== 'HIT_TP' && trade.outcome !== 'HIT_SL') continue;
    const probability = Math.max(0, Math.min(1, d.passedCount / ASSUMED_TOTAL_COUNT));
    if (probability < 0.5) continue; // sport-calibration ignoriert sub-50 % Buckets
    records.push({
      predictedProbability: probability,
      actualOutcome: trade.outcome === 'HIT_TP' ? 1 : 0,
      marketType: 'crypto-buy',
      league: 'crypto',
      dataConfidence: d.safetyGrade === 'A' ? 90 : d.safetyGrade === 'B' ? 75 : d.safetyGrade === 'C' ? 60 : 45,
      qualityScore: (d.passedCount / ASSUMED_TOTAL_COUNT) * 100,
      timestamp: d.recordedAt
    });
  }
  return { stats: calculateBucketStats(records), totalResolvedTrades: records.length };
}
