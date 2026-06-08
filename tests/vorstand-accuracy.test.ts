import { describe, expect, it } from 'vitest';
import { computeVorstandAccuracy, type VorstandSnapshot } from '@/lib/agents/vorstand-memory';
import type { VorstandVerdict } from '@/lib/agents/vorstand';

function snap(date: string, verdict: VorstandVerdict, coin: string | null = null): VorstandSnapshot {
  return {
    date,
    recordedAt: 0,
    verdict,
    consensusCoin: coin,
    buyCount: 0,
    conflictCount: 0,
    headline: ''
  };
}

describe('computeVorstandAccuracy', () => {
  it('leeres Log → 0 evaluated, hitRatePct null', () => {
    const acc = computeVorstandAccuracy([], () => null);
    expect(acc.evaluated).toBe(0);
    expect(acc.hitRatePct).toBeNull();
  });

  it('KLARER_KAUF mit anschliessend steigendem BTC → richtig', () => {
    const log = [snap('2026-05-01', 'KLARER_KAUF', 'BTC'), snap('2026-05-02', 'CASH_HALTEN')];
    const prices = new Map<string, number>([['2026-05-01', 100], ['2026-05-02', 103]]);
    const acc = computeVorstandAccuracy(log, (d) => prices.get(d) ?? null);
    expect(acc.evaluated).toBe(1);
    expect(acc.rightCalls).toBe(1);
    expect(acc.perVerdict.KLARER_KAUF.hitRatePct).toBe(100);
  });

  it('CASH_HALTEN bei flachem Markt → richtig', () => {
    const log = [snap('2026-05-01', 'CASH_HALTEN'), snap('2026-05-02', 'CASH_HALTEN')];
    const prices = new Map<string, number>([['2026-05-01', 100], ['2026-05-02', 100.1]]);
    const acc = computeVorstandAccuracy(log, (d) => prices.get(d) ?? null);
    expect(acc.rightCalls).toBe(1);
    expect(acc.perVerdict.CASH_HALTEN.hitRatePct).toBe(100);
  });

  it('WATCHLIST wird nicht bewertet (kein klares Aktions-Versprechen)', () => {
    const log = [snap('2026-05-01', 'WATCHLIST'), snap('2026-05-02', 'CASH_HALTEN')];
    const prices = new Map<string, number>([['2026-05-01', 100], ['2026-05-02', 105]]);
    const acc = computeVorstandAccuracy(log, (d) => prices.get(d) ?? null);
    expect(acc.evaluated).toBe(0);
    expect(acc.perVerdict.WATCHLIST.evaluated).toBe(0);
  });

  it('KAUFEN_VORSICHTIG zaehlt wie KLARER_KAUF', () => {
    const log = [snap('2026-05-01', 'KAUFEN_VORSICHTIG', 'ETH'), snap('2026-05-02', 'CASH_HALTEN')];
    const prices = new Map<string, number>([['2026-05-01', 100], ['2026-05-02', 102]]);
    const acc = computeVorstandAccuracy(log, (d) => prices.get(d) ?? null);
    expect(acc.perVerdict.KAUFEN_VORSICHTIG.hitRatePct).toBe(100);
  });

  it('mehrere Verdicts unterschiedlicher Art akkumulieren korrekt', () => {
    const log = [
      snap('2026-05-01', 'KLARER_KAUF', 'BTC'),
      snap('2026-05-02', 'CASH_HALTEN'),
      snap('2026-05-03', 'KAUFEN_VORSICHTIG', 'ETH'),
      snap('2026-05-04', 'CASH_HALTEN'),
      snap('2026-05-05', 'KLARER_KAUF', 'SOL'),
      snap('2026-05-06', 'CASH_HALTEN')
    ];
    const prices = new Map<string, number>([
      ['2026-05-01', 100],
      ['2026-05-02', 103], // +3% → KLARER_KAUF richtig
      ['2026-05-03', 102.5], // -0.5% (verglichen mit 103) → CASH richtig
      ['2026-05-04', 99],   // -3.4% → KAUFEN_VORSICHTIG falsch
      ['2026-05-05', 100],  // +1% → CASH falsch
      ['2026-05-06', 102]   // +2% → KLARER_KAUF richtig
    ]);
    const acc = computeVorstandAccuracy(log, (d) => prices.get(d) ?? null);
    expect(acc.evaluated).toBe(5); // letzter Snapshot hat kein „naechster Tag" mehr
    expect(acc.rightCalls).toBe(3); // KLARER_KAUF×1 + CASH×1 + KLARER_KAUF×1
    expect(acc.hitRatePct).toBe(60);
  });
});
