import { describe, expect, it } from 'vitest';
import { computeFirmaAccuracy } from '@/lib/firma-accuracy';
import { FirmaDecision } from '@/lib/firma-memory';

function d(over: Partial<FirmaDecision>): FirmaDecision {
  return {
    date: '2026-05-01', recordedAt: Date.now(),
    firma: 'balanced', firmaName: 'Balanciert',
    verdict: 'BUY', coin: 'ETH',
    entry: 100, stopLoss: 95, takeProfit1: 110, safetyGrade: 'B',
    passedCount: 8,
    analystVote: 'NEUTRAL', scoutVote: 'MITTEL', riskVote: 'OK',
    ceoFinalWord: '',
    ...over
  };
}

describe('computeFirmaAccuracy', () => {
  it('returns 0 evaluated when no BTC prices available', () => {
    const log: FirmaDecision[] = [
      d({ date: '2026-05-01', verdict: 'BUY' }),
      d({ date: '2026-05-02', verdict: 'WAIT' })
    ];
    const acc = computeFirmaAccuracy(log, () => null);
    expect(acc[0].evaluated).toBe(0);
    expect(acc[0].hitRatePct).toBeNull();
  });

  it('counts BUY as right when BTC rose ≥ 0.5%', () => {
    const log: FirmaDecision[] = [
      d({ date: '2026-05-01', verdict: 'BUY' }),
      d({ date: '2026-05-02', verdict: 'WAIT' })
    ];
    const prices: Record<string, number> = { '2026-05-01': 100000, '2026-05-02': 101000 };
    const acc = computeFirmaAccuracy(log, (date) => prices[date] ?? null);
    expect(acc[0].evaluated).toBe(1);
    expect(acc[0].rightCalls).toBe(1);
    expect(acc[0].hitRatePct).toBe(100);
  });

  it('counts BUY as wrong when BTC fell', () => {
    const log: FirmaDecision[] = [
      d({ date: '2026-05-01', verdict: 'BUY' }),
      d({ date: '2026-05-02', verdict: 'WAIT' })
    ];
    const prices: Record<string, number> = { '2026-05-01': 100000, '2026-05-02': 99000 };
    const acc = computeFirmaAccuracy(log, (date) => prices[date] ?? null);
    expect(acc[0].rightCalls).toBe(0);
  });

  it('counts WAIT as right when BTC did NOT rise', () => {
    const log: FirmaDecision[] = [
      d({ date: '2026-05-01', verdict: 'WAIT' }),
      d({ date: '2026-05-02', verdict: 'WAIT' })
    ];
    const prices: Record<string, number> = { '2026-05-01': 100000, '2026-05-02': 99800 };
    const acc = computeFirmaAccuracy(log, (date) => prices[date] ?? null);
    expect(acc[0].rightCalls).toBe(1);
  });

  it('returns evaluations grouped per firma', () => {
    const log: FirmaDecision[] = [
      d({ date: '2026-05-01', firma: 'conservative', firmaName: 'K', verdict: 'BUY' }),
      d({ date: '2026-05-02', firma: 'conservative', firmaName: 'K', verdict: 'WAIT' }),
      d({ date: '2026-05-01', firma: 'aggressive', firmaName: 'A', verdict: 'BUY' }),
      d({ date: '2026-05-02', firma: 'aggressive', firmaName: 'A', verdict: 'BUY' })
    ];
    const prices: Record<string, number> = { '2026-05-01': 100000, '2026-05-02': 102000 };
    const acc = computeFirmaAccuracy(log, (date) => prices[date] ?? null);
    expect(acc).toHaveLength(2);
    expect(acc[0].firma).toBe('conservative');
    expect(acc[1].firma).toBe('aggressive');
  });
});
