import { describe, expect, it } from 'vitest';
import { detectKonsensStreaks } from '@/lib/agents/konsens-streak';
import { FirmaDecision } from '@/lib/firma-memory';

function d(over: Partial<FirmaDecision>): FirmaDecision {
  return {
    date: '2026-05-01', recordedAt: 0,
    firma: 'balanced', firmaName: 'Balanciert',
    verdict: 'WAIT', coin: null,
    entry: null, stopLoss: null, takeProfit1: null, safetyGrade: null, passedCount: null,
    analystVote: 'NEUTRAL', scoutVote: 'MITTEL', riskVote: 'OK',
    ceoFinalWord: '',
    ...over
  };
}

describe('detectKonsensStreaks', () => {
  it('returns empty for fewer than 2 firms on the same coin today', () => {
    const log = [d({ date: '2026-05-01', firma: 'conservative', coin: 'ETH' })];
    expect(detectKonsensStreaks(log)).toEqual([]);
  });

  it('detects a 2-firma 1-day streak (today only, no historical)', () => {
    const log = [
      d({ date: '2026-05-01', firma: 'conservative', firmaName: 'K', coin: 'ETH' }),
      d({ date: '2026-05-01', firma: 'balanced', firmaName: 'B', coin: 'ETH' })
    ];
    const r = detectKonsensStreaks(log);
    expect(r).toEqual([]); // requires ≥ 2 days
  });

  it('detects a 2-firma streak across 3 consecutive days', () => {
    const log = [
      d({ date: '2026-05-01', firma: 'conservative', firmaName: 'K', coin: 'ETH' }),
      d({ date: '2026-05-01', firma: 'balanced', firmaName: 'B', coin: 'ETH' }),
      d({ date: '2026-05-02', firma: 'conservative', firmaName: 'K', coin: 'ETH' }),
      d({ date: '2026-05-02', firma: 'balanced', firmaName: 'B', coin: 'ETH' }),
      d({ date: '2026-05-03', firma: 'conservative', firmaName: 'K', coin: 'ETH' }),
      d({ date: '2026-05-03', firma: 'balanced', firmaName: 'B', coin: 'ETH' })
    ];
    const r = detectKonsensStreaks(log);
    expect(r).toHaveLength(1);
    expect(r[0].coin).toBe('ETH');
    expect(r[0].daysInRow).toBe(3);
    expect(r[0].firmas).toContain('conservative');
    expect(r[0].firmas).toContain('balanced');
  });

  it('breaks streak when one of the days drops below 2 firms', () => {
    const log = [
      d({ date: '2026-05-01', firma: 'conservative', firmaName: 'K', coin: 'ETH' }),
      d({ date: '2026-05-01', firma: 'balanced', firmaName: 'B', coin: 'ETH' }),
      d({ date: '2026-05-02', firma: 'conservative', firmaName: 'K', coin: 'ETH' }), // only one
      d({ date: '2026-05-03', firma: 'conservative', firmaName: 'K', coin: 'ETH' }),
      d({ date: '2026-05-03', firma: 'balanced', firmaName: 'B', coin: 'ETH' })
    ];
    const r = detectKonsensStreaks(log);
    expect(r).toEqual([]); // today's streak resets at 05-02
  });

  it('computes buy share correctly', () => {
    const log = [
      d({ date: '2026-05-01', firma: 'conservative', firmaName: 'K', coin: 'ETH', verdict: 'BUY' }),
      d({ date: '2026-05-01', firma: 'balanced', firmaName: 'B', coin: 'ETH', verdict: 'WAIT' }),
      d({ date: '2026-05-02', firma: 'conservative', firmaName: 'K', coin: 'ETH', verdict: 'BUY' }),
      d({ date: '2026-05-02', firma: 'balanced', firmaName: 'B', coin: 'ETH', verdict: 'BUY' })
    ];
    const r = detectKonsensStreaks(log);
    expect(r[0].buyShare).toBeCloseTo(3 / 4);
  });
});
