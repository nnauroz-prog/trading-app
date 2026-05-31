import { describe, expect, it } from 'vitest';
import { rankFirmas } from '@/lib/firma-ranking';
import { FirmaStats } from '@/lib/firma-memory';

function stat(over: Partial<FirmaStats>): FirmaStats {
  return {
    firma: 'balanced',
    firmaName: 'Balanciert',
    totalDays: 10,
    buyDays: 3,
    waitDays: 7,
    uniqueCoins: 2,
    lastBuyDate: '2026-05-01',
    lastCoin: 'ETH',
    agreementWithOthers: 50,
    ...over
  };
}

describe('rankFirmas', () => {
  it('returns a rank for every input and assigns 1..N in score order', () => {
    const ranking = rankFirmas([
      stat({ firma: 'conservative', firmaName: 'K', buyDays: 0, totalDays: 10, agreementWithOthers: 30 }),
      stat({ firma: 'balanced', firmaName: 'B', buyDays: 3, totalDays: 10, agreementWithOthers: 70 }),
      stat({ firma: 'aggressive', firmaName: 'A', buyDays: 9, totalDays: 10, agreementWithOthers: 20 })
    ]);
    expect(ranking).toHaveLength(3);
    expect(ranking.map((r) => r.rank)).toEqual([1, 2, 3]);
    // Sorted desc by score.
    expect(ranking[0].score).toBeGreaterThanOrEqual(ranking[1].score);
    expect(ranking[1].score).toBeGreaterThanOrEqual(ranking[2].score);
  });

  it('ranks the discipline-zone (≈30% buys) higher than 0% or 100%', () => {
    const sweet = stat({ firma: 'balanced', firmaName: 'B', buyDays: 3, totalDays: 10, agreementWithOthers: 50 });
    const never = stat({ firma: 'conservative', firmaName: 'K', buyDays: 0, totalDays: 10, agreementWithOthers: 50 });
    const always = stat({ firma: 'aggressive', firmaName: 'A', buyDays: 10, totalDays: 10, agreementWithOthers: 50 });
    const ranking = rankFirmas([sweet, never, always]);
    expect(ranking[0].firma).toBe('balanced');
  });

  it('flags too-cautious firmas in the note', () => {
    const ranking = rankFirmas([stat({ buyDays: 0, totalDays: 10 })]);
    expect(ranking[0].note).toContain('vorsichtig');
  });
});
