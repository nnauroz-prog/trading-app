import { describe, expect, it } from 'vitest';
import { FirmaDecision } from '@/lib/firma-memory';
import { detectConvictionStreaks, detectTargetPersistence, summarizeConviction } from '@/lib/firma-streak';

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
    passedCount: null,
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

describe('detectTargetPersistence', () => {
  it('returns empty for empty log', () => {
    expect(detectTargetPersistence([])).toEqual([]);
  });

  it('detects a coin that stays on the candidate list across days even if verdict is WAIT', () => {
    const log: FirmaDecision[] = [
      dec({ date: '2026-05-01', firma: 'conservative', firmaName: 'K', verdict: 'WAIT', coin: 'ETH', passedCount: 8 }),
      dec({ date: '2026-05-02', firma: 'conservative', firmaName: 'K', verdict: 'WAIT', coin: 'ETH', passedCount: 8 }),
      dec({ date: '2026-05-03', firma: 'conservative', firmaName: 'K', verdict: 'WAIT', coin: 'ETH', passedCount: 9 })
    ];
    const p = detectTargetPersistence(log);
    expect(p).toHaveLength(1);
    expect(p[0].coin).toBe('ETH');
    expect(p[0].daysOnList).toBe(3);
    expect(p[0].avgPassedCount).toBeCloseTo(8.3, 1);
  });

  it('streak breaks if the coin is missing on a day in between', () => {
    const log: FirmaDecision[] = [
      dec({ date: '2026-05-01', firma: 'balanced', firmaName: 'B', verdict: 'WAIT', coin: 'BTC' }),
      dec({ date: '2026-05-02', firma: 'balanced', firmaName: 'B', verdict: 'WAIT', coin: 'SOL' }),
      dec({ date: '2026-05-03', firma: 'balanced', firmaName: 'B', verdict: 'WAIT', coin: 'BTC' })
    ];
    const p = detectTargetPersistence(log);
    // BTC appears today (05-03) and on 05-01 but not 05-02 — streak breaks
    // at 05-02 and only today counts. Today-only (1 day) is filtered out.
    expect(p.find((x) => x.coin === 'BTC')).toBeUndefined();
  });

  it('aggregates Häkchen across all firmas that mentioned the coin', () => {
    const log: FirmaDecision[] = [
      dec({ date: '2026-05-01', firma: 'conservative', firmaName: 'K', coin: 'ETH', passedCount: 7 }),
      dec({ date: '2026-05-01', firma: 'balanced', firmaName: 'B', coin: 'ETH', passedCount: 9 }),
      dec({ date: '2026-05-02', firma: 'conservative', firmaName: 'K', coin: 'ETH', passedCount: 8 }),
      dec({ date: '2026-05-02', firma: 'aggressive', firmaName: 'A', coin: 'ETH', passedCount: 8 })
    ];
    const p = detectTargetPersistence(log);
    expect(p[0].coin).toBe('ETH');
    expect(p[0].daysOnList).toBe(2);
    expect(p[0].firmasInvolved.length).toBeGreaterThanOrEqual(2);
    expect(p[0].avgPassedCount).toBe(8); // (7+9+8+8)/4
  });
});
