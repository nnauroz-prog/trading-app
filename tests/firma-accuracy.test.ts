import { describe, expect, it } from 'vitest';
import { computeFirmaAccuracy, skillMap, MIN_EVAL_FOR_SKILL } from '@/lib/firma-accuracy';
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

  it('recent enthält neueste Entscheidungen zuerst — auch ohne Preisdaten', () => {
    const log: FirmaDecision[] = [];
    for (let i = 1; i <= 13; i++) {
      log.push(d({ date: `2026-05-${String(i).padStart(2, '0')}`, firma: 'balanced', verdict: i % 2 === 0 ? 'BUY' : 'WAIT' }));
    }
    const acc = computeFirmaAccuracy(log, () => null);
    expect(acc[0].recent.length).toBe(10);
    expect(acc[0].recent[0].date).toBe('2026-05-13');
    // Ohne Preisdaten: right = null
    expect(acc[0].recent[0].right).toBeNull();
  });

  it('skillWeight bleibt 1.0, wenn zu wenig Daten (< MIN_EVAL_FOR_SKILL)', () => {
    const log: FirmaDecision[] = [
      d({ date: '2026-05-01', firma: 'aggressive', verdict: 'BUY' }),
      d({ date: '2026-05-02', firma: 'aggressive', verdict: 'BUY' }),
      d({ date: '2026-05-03', firma: 'aggressive', verdict: 'WAIT' })
    ];
    const prices: Record<string, number> = { '2026-05-01': 100, '2026-05-02': 102, '2026-05-03': 101 };
    const acc = computeFirmaAccuracy(log, (date) => prices[date] ?? null);
    // Nur 2 evaluierbare Tage (3 Einträge minus letzter ohne nächsten Tag)
    expect(acc[0].evaluated).toBeLessThan(MIN_EVAL_FOR_SKILL);
    expect(acc[0].skillWeight).toBe(1);
  });

  it('skillWeight hoch (>1.2) bei deutlich > 50 % Trefferquote und genug Daten', () => {
    const log: FirmaDecision[] = [];
    const prices: Record<string, number> = {};
    // 8 BUYs mit jeweils steigendem Markt + 2 WAITs mit fallendem Markt + 1 Schluss
    for (let i = 1; i <= 11; i++) {
      const date = `2026-05-${String(i).padStart(2, '0')}`;
      log.push(d({ date, firma: 'conservative', verdict: i <= 8 ? 'BUY' : 'WAIT' }));
      prices[date] = 100 + (i <= 8 ? i * 2 : -i);
    }
    const acc = computeFirmaAccuracy(log, (date) => prices[date] ?? null);
    expect(acc[0].evaluated).toBeGreaterThanOrEqual(MIN_EVAL_FOR_SKILL);
    expect(acc[0].skillWeight).toBeGreaterThan(1.2);
  });

  it('skillMap übergibt nur Firmen mit genug Bewertungen', () => {
    const log: FirmaDecision[] = [];
    const prices: Record<string, number> = {};
    for (let i = 1; i <= 3; i++) {
      const date = `2026-05-${String(i).padStart(2, '0')}`;
      log.push(d({ date, firma: 'conservative', verdict: 'BUY' }));
      prices[date] = 100 + i;
    }
    for (let i = 1; i <= 12; i++) {
      const date = `2026-06-${String(i).padStart(2, '0')}`;
      log.push(d({ date, firma: 'aggressive', verdict: 'BUY' }));
      prices[date] = 100 + i;
    }
    const acc = computeFirmaAccuracy(log, (date) => prices[date] ?? null);
    const m = skillMap(acc);
    expect(m.has('conservative')).toBe(false); // zu wenig Daten
    expect(m.has('aggressive')).toBe(true);
  });
});
