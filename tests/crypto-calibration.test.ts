import { describe, expect, it } from 'vitest';
import { buildCryptoCalibrationFromFirmaLog } from '@/lib/analysis/crypto-calibration';
import type { FirmaDecision } from '@/lib/firma-memory';

function decision(over: Partial<FirmaDecision> = {}): FirmaDecision {
  return {
    date: '2026-05-01',
    recordedAt: 1_700_000_000_000,
    firma: 'conservative',
    firmaName: 'Konservativ',
    verdict: 'BUY',
    coin: 'btc',
    entry: 100,
    stopLoss: 95,
    takeProfit1: 110,
    safetyGrade: 'A',
    passedCount: 10,
    analystVote: 'POSITIV',
    scoutVote: 'STARK',
    riskVote: 'OK',
    ceoFinalWord: 'kaufen',
    ...over
  };
}

describe('buildCryptoCalibrationFromFirmaLog', () => {
  it('Leerer Log → 0 Trades, alle Buckets 0', () => {
    const r = buildCryptoCalibrationFromFirmaLog([], () => null);
    expect(r.totalResolvedTrades).toBe(0);
    expect(r.stats.every((s) => s.sampleSize === 0)).toBe(true);
  });

  it('WAIT-Decisions werden ignoriert', () => {
    const log = [decision({ verdict: 'WAIT' })];
    const r = buildCryptoCalibrationFromFirmaLog(log, () => 105);
    expect(r.totalResolvedTrades).toBe(0);
  });

  it('OPEN-Trades (Preis zwischen SL und TP) werden ignoriert', () => {
    const log = [decision({ entry: 100, stopLoss: 95, takeProfit1: 110 })];
    const r = buildCryptoCalibrationFromFirmaLog(log, () => 102);
    expect(r.totalResolvedTrades).toBe(0);
  });

  it('HIT_TP → 1, HIT_SL → 0, Bucket 80-89 (passedCount 10/12)', () => {
    const log = [
      decision({ passedCount: 10, entry: 100, stopLoss: 95, takeProfit1: 110, coin: 'btc' }),
      decision({ passedCount: 10, entry: 100, stopLoss: 95, takeProfit1: 110, coin: 'eth', date: '2026-05-02' }),
      decision({ passedCount: 10, entry: 100, stopLoss: 95, takeProfit1: 110, coin: 'sol', date: '2026-05-03' })
    ];
    const prices: Record<string, number> = { btc: 115, eth: 90, sol: 115 };
    const r = buildCryptoCalibrationFromFirmaLog(log, (c) => prices[c] ?? null);
    expect(r.totalResolvedTrades).toBe(3);
    const bucket = r.stats.find((s) => s.bucket === '80-89')!;
    expect(bucket.sampleSize).toBe(3);
    expect(bucket.historicalHitRate).toBeCloseTo(2 / 3, 2);
  });

  it('passedCount 5/12 (sub-50 %) wird ignoriert', () => {
    const log = [decision({ passedCount: 5, entry: 100, stopLoss: 95, takeProfit1: 110 })];
    const r = buildCryptoCalibrationFromFirmaLog(log, () => 115);
    expect(r.totalResolvedTrades).toBe(0);
  });

  it('Decisions ohne passedCount werden ignoriert', () => {
    const log = [decision({ passedCount: null })];
    const r = buildCryptoCalibrationFromFirmaLog(log, () => 115);
    expect(r.totalResolvedTrades).toBe(0);
  });
});
