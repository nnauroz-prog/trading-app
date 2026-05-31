import { describe, expect, it } from 'vitest';
import { FirmaDecision } from '@/lib/firma-memory';
import { detectConvictionStreaks, summarizeConviction } from '@/lib/firma-streak';

function dec(over: Partial<FirmaDecision>): FirmaDecision {
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

describe('detectConvictionStreaks', () => {
  it('returns empty if no firma is buying today', () => {
    const log: FirmaDecision[] = [dec({ date: '2026-05-03', verdict: 'WAIT' })];
    expect(detectConvictionStreaks(log)).toEqual([]);
  });

  it('detects a streak of same coin recommendations', () => {
    const log: FirmaDecision[] = [
      dec({ date: '2026-05-01', firma: 'conservative', firmaName: 'K', verdict: 'BUY', coin: 'ETH' }),
      dec({ date: '2026-05-02', firma: 'conservative', firmaName: 'K', verdict: 'BUY', coin: 'ETH' }),
      dec({ date: '2026-05-03', firma: 'conservative', firmaName: 'K', verdict: 'BUY', coin: 'ETH' })
    ];
    const streaks = detectConvictionStreaks(log);
    expect(streaks).toHaveLength(1);
    expect(streaks[0].coin).toBe('ETH');
    expect(streaks[0].daysInRow).toBe(3);
  });

  it('streak breaks when coin changes', () => {
    const log: FirmaDecision[] = [
      dec({ date: '2026-05-01', firma: 'conservative', firmaName: 'K', verdict: 'BUY', coin: 'BTC' }),
      dec({ date: '2026-05-02', firma: 'conservative', firmaName: 'K', verdict: 'BUY', coin: 'ETH' }),
      dec({ date: '2026-05-03', firma: 'conservative', firmaName: 'K', verdict: 'BUY', coin: 'ETH' })
    ];
    const streaks = detectConvictionStreaks(log);
    expect(streaks[0].daysInRow).toBe(2);
  });

  it('only counts streaks of ≥2', () => {
    const log: FirmaDecision[] = [
      dec({ date: '2026-05-01', firma: 'conservative', firmaName: 'K', verdict: 'WAIT' }),
      dec({ date: '2026-05-02', firma: 'conservative', firmaName: 'K', verdict: 'BUY', coin: 'ETH' })
    ];
    expect(detectConvictionStreaks(log)).toEqual([]);
  });
});

describe('summarizeConviction', () => {
  it('detects a coin where two firmas agree', () => {
    const log: FirmaDecision[] = [
      dec({ date: '2026-05-01', firma: 'conservative', firmaName: 'K', verdict: 'BUY', coin: 'ETH' }),
      dec({ date: '2026-05-02', firma: 'conservative', firmaName: 'K', verdict: 'BUY', coin: 'ETH' }),
      dec({ date: '2026-05-01', firma: 'balanced', firmaName: 'B', verdict: 'BUY', coin: 'ETH' }),
      dec({ date: '2026-05-02', firma: 'balanced', firmaName: 'B', verdict: 'BUY', coin: 'ETH' })
    ];
    const summary = summarizeConviction(detectConvictionStreaks(log));
    expect(summary.agreedCoin?.coin).toBe('ETH');
    expect(summary.agreedCoin?.firmas).toHaveLength(2);
  });

  it('falls back to topStreak when only one firma streaks', () => {
    const log: FirmaDecision[] = [
      dec({ date: '2026-05-01', firma: 'aggressive', firmaName: 'A', verdict: 'BUY', coin: 'SOL' }),
      dec({ date: '2026-05-02', firma: 'aggressive', firmaName: 'A', verdict: 'BUY', coin: 'SOL' })
    ];
    const summary = summarizeConviction(detectConvictionStreaks(log));
    expect(summary.agreedCoin).toBeNull();
    expect(summary.topStreak?.coin).toBe('SOL');
  });
});
