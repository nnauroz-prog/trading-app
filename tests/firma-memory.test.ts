import { describe, expect, it } from 'vitest';
import { FirmaDecision, statsPerFirma } from '@/lib/firma-memory';

function decision(over: Partial<FirmaDecision>): FirmaDecision {
  return {
    date: '2026-05-01',
    recordedAt: Date.now(),
    firma: 'balanced',
    firmaName: 'Balanciert',
    verdict: 'WAIT',
    coin: null,
    entry: null,
    stopLoss: null,
    takeProfit1: null,
    safetyGrade: null,
    analystVote: 'NEUTRAL',
    scoutVote: 'SCHWACH',
    riskVote: 'VETO',
    ceoFinalWord: '',
    ...over
  };
}

describe('statsPerFirma', () => {
  it('counts buy vs wait per firma', () => {
    const log: FirmaDecision[] = [
      decision({ firma: 'conservative', firmaName: 'Konservativ', verdict: 'WAIT' }),
      decision({ firma: 'balanced', firmaName: 'Balanciert', verdict: 'BUY', coin: 'ETH' }),
      decision({ firma: 'aggressive', firmaName: 'Aggressiv', verdict: 'BUY', coin: 'SOL' }),
      decision({ date: '2026-05-02', firma: 'aggressive', firmaName: 'Aggressiv', verdict: 'BUY', coin: 'ETH' })
    ];
    const stats = statsPerFirma(log);
    expect(stats).toHaveLength(3);
    const conservative = stats.find((s) => s.firma === 'conservative')!;
    const balanced = stats.find((s) => s.firma === 'balanced')!;
    const aggressive = stats.find((s) => s.firma === 'aggressive')!;
    expect(conservative.buyDays).toBe(0);
    expect(conservative.waitDays).toBe(1);
    expect(balanced.buyDays).toBe(1);
    expect(aggressive.buyDays).toBe(2);
    expect(aggressive.uniqueCoins).toBe(2);
  });

  it('agreement counts only days where all three firmas have entries', () => {
    const log: FirmaDecision[] = [
      // Day 1: all three WAIT -> agreement
      decision({ date: '2026-05-01', firma: 'conservative', firmaName: 'K', verdict: 'WAIT' }),
      decision({ date: '2026-05-01', firma: 'balanced', firmaName: 'B', verdict: 'WAIT' }),
      decision({ date: '2026-05-01', firma: 'aggressive', firmaName: 'A', verdict: 'WAIT' }),
      // Day 2: conservative disagrees
      decision({ date: '2026-05-02', firma: 'conservative', firmaName: 'K', verdict: 'WAIT' }),
      decision({ date: '2026-05-02', firma: 'balanced', firmaName: 'B', verdict: 'BUY' }),
      decision({ date: '2026-05-02', firma: 'aggressive', firmaName: 'A', verdict: 'BUY' })
    ];
    const stats = statsPerFirma(log);
    const conservative = stats.find((s) => s.firma === 'conservative')!;
    const aggressive = stats.find((s) => s.firma === 'aggressive')!;
    // Conservative: agrees on day 1 (others both WAIT), disagrees on day 2.
    expect(conservative.agreementWithOthers).toBe(50);
    // Aggressive: agrees on day 1, disagrees on day 2 (conservative WAIT, balanced BUY → not both equal to aggressive's BUY).
    expect(aggressive.agreementWithOthers).toBe(50);
  });

  it('orders firmas conservative -> balanced -> aggressive', () => {
    const log: FirmaDecision[] = [
      decision({ firma: 'aggressive', firmaName: 'A' }),
      decision({ firma: 'conservative', firmaName: 'K' }),
      decision({ firma: 'balanced', firmaName: 'B' })
    ];
    const stats = statsPerFirma(log);
    expect(stats.map((s) => s.firma)).toEqual(['conservative', 'balanced', 'aggressive']);
  });
});
