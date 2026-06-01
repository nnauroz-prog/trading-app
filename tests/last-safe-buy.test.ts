import { describe, expect, it } from 'vitest';
import { findLastSafeBuy } from '@/lib/last-safe-buy';
import type { FirmaDecision } from '@/lib/firma-memory';

function entry(overrides: Partial<FirmaDecision>): FirmaDecision {
  return {
    date: '2026-06-01',
    recordedAt: Date.now(),
    firma: 'balanced',
    firmaName: 'Balanced AG',
    verdict: 'WAIT',
    coin: null,
    entry: null,
    stopLoss: null,
    takeProfit1: null,
    safetyGrade: null,
    passedCount: null,
    analystVote: 'NEUTRAL',
    scoutVote: 'MITTEL',
    riskVote: 'OK',
    ceoFinalWord: '',
    ...overrides
  };
}

describe('findLastSafeBuy', () => {
  it('returns null when no Grade A exists', () => {
    const log = [entry({ safetyGrade: 'B' }), entry({ safetyGrade: 'C' })];
    expect(findLastSafeBuy(log, '2026-06-01')).toBeNull();
  });

  it('returns the most recent Grade A across firmas', () => {
    const log = [
      entry({ date: '2026-05-20', firmaName: 'Aggro', safetyGrade: 'A', coin: 'BTC' }),
      entry({ date: '2026-05-28', firmaName: 'Balanced AG', safetyGrade: 'A', coin: 'ETH' }),
      entry({ date: '2026-05-30', firmaName: 'Conservative GmbH', safetyGrade: 'B', coin: 'SOL' })
    ];
    const r = findLastSafeBuy(log, '2026-06-01');
    expect(r?.date).toBe('2026-05-28');
    expect(r?.firmaName).toBe('Balanced AG');
    expect(r?.coin).toBe('ETH');
    expect(r?.daysAgo).toBe(4);
  });

  it('counts daysAgo as 0 when today has a Grade A', () => {
    const log = [entry({ date: '2026-06-01', safetyGrade: 'A', coin: 'BTC' })];
    expect(findLastSafeBuy(log, '2026-06-01')?.daysAgo).toBe(0);
  });
});
