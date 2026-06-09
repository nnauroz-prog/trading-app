import { describe, expect, it } from 'vitest';
import {
  aggregateOutcomes,
  deriveUserOverrideWeight,
  evaluateOverrideOutcome,
  expectedDirection,
  type CoinOverrideHistoryEntry,
  type OverrideOutcome,
  type UserOverrideAccuracy
} from '@/lib/agents/coin-override-history';

function entry(over: Partial<CoinOverrideHistoryEntry> = {}): CoinOverrideHistoryEntry {
  return {
    id: 'btc-1',
    coinId: 'btc',
    factors: ['manual-distrust'],
    priceAtSet: 50000,
    setAt: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
    ...over
  };
}

describe('expectedDirection', () => {
  it('bullische Faktoren → +1', () => {
    expect(expectedDirection(['major-event-today'])).toBe(1);
    expect(expectedDirection(['whale-accumulating', 'manual-conviction'])).toBe(1);
  });

  it('baerische Faktoren → -1', () => {
    expect(expectedDirection(['manual-distrust'])).toBe(-1);
    expect(expectedDirection(['large-unlock-today', 'regulatory-uncertainty'])).toBe(-1);
  });

  it('Mixed Faktoren saldieren', () => {
    // +1 (bullish) + -1 (bear) = 0
    expect(expectedDirection(['major-event-today', 'manual-distrust'])).toBe(0);
    // +1 +1 -1 = +1
    expect(expectedDirection(['major-event-today', 'manual-conviction', 'manual-distrust'])).toBe(1);
  });

  it('Empty → 0', () => {
    expect(expectedDirection([])).toBe(0);
  });
});

describe('evaluateOverrideOutcome', () => {
  const now = 1_700_000_000_000;
  const dayMs = 24 * 60 * 60 * 1000;

  it('Faktoren ohne klare Richtung → no-direction', () => {
    const o = evaluateOverrideOutcome(
      entry({ factors: ['major-event-today', 'manual-distrust'], setAt: now - 2 * dayMs }),
      50000,
      now
    );
    expect(o.outcome).toBe('no-direction');
  });

  it('priceNow null → no-price', () => {
    const o = evaluateOverrideOutcome(entry({ setAt: now - 2 * dayMs }), null, now);
    expect(o.outcome).toBe('no-price');
  });

  it('Zu jung (< 12 h) → too-young', () => {
    const o = evaluateOverrideOutcome(entry({ setAt: now - 1 * 60 * 60 * 1000 }), 50000, now);
    expect(o.outcome).toBe('too-young');
  });

  it('Zu alt (> 7 Tage) → too-old', () => {
    const o = evaluateOverrideOutcome(entry({ setAt: now - 10 * dayMs }), 50000, now);
    expect(o.outcome).toBe('too-old');
  });

  it('Distrust + Preis faellt → correct', () => {
    const o = evaluateOverrideOutcome(
      entry({ factors: ['manual-distrust'], priceAtSet: 50000, setAt: now - 2 * dayMs }),
      45000, // -10 %
      now
    );
    expect(o.outcome).toBe('correct');
    expect(o.priceChangePct).toBe(-10);
    expect(o.expectedDir).toBe(-1);
  });

  it('Distrust + Preis steigt → wrong', () => {
    const o = evaluateOverrideOutcome(
      entry({ factors: ['manual-distrust'], priceAtSet: 50000, setAt: now - 2 * dayMs }),
      55000, // +10 %
      now
    );
    expect(o.outcome).toBe('wrong');
  });

  it('Conviction + Preis steigt → correct', () => {
    const o = evaluateOverrideOutcome(
      entry({ factors: ['manual-conviction', 'major-event-today'], priceAtSet: 50000, setAt: now - 2 * dayMs }),
      55000,
      now
    );
    expect(o.outcome).toBe('correct');
  });

  it('Conviction + flat (< 1 %) → unclear', () => {
    const o = evaluateOverrideOutcome(
      entry({ factors: ['manual-conviction'], priceAtSet: 50000, setAt: now - 2 * dayMs }),
      50250, // +0.5 %
      now
    );
    expect(o.outcome).toBe('unclear');
  });

  it('AgeDays werden korrekt berechnet', () => {
    const o = evaluateOverrideOutcome(
      entry({ setAt: now - 3 * dayMs }),
      45000,
      now
    );
    expect(o.ageDays).toBe(3);
  });
});

describe('aggregateOutcomes', () => {
  function make(coinId: string, outcome: OverrideOutcome['outcome']): OverrideOutcome {
    return {
      entry: { id: `${coinId}-${Math.random()}`, coinId, factors: [], priceAtSet: 0, setAt: 0 },
      priceNow: 1,
      priceChangePct: outcome === 'correct' ? 5 : outcome === 'wrong' ? 5 : 0,
      expectedDir: -1,
      outcome,
      ageDays: 1
    };
  }

  it('Leeres Array → null Hit-Rate, alles 0', () => {
    const acc = aggregateOutcomes([]);
    expect(acc.hitRatePct).toBeNull();
    expect(acc.evaluable).toBe(0);
  });

  it('Nur unclear → Hit-Rate null (kein decisive Sample)', () => {
    const acc = aggregateOutcomes([make('btc', 'unclear'), make('eth', 'unclear')]);
    expect(acc.unclear).toBe(2);
    expect(acc.hitRatePct).toBeNull();
  });

  it('5 richtig, 3 falsch → 63 %', () => {
    const arr: OverrideOutcome[] = [];
    for (let i = 0; i < 5; i++) arr.push(make('btc', 'correct'));
    for (let i = 0; i < 3; i++) arr.push(make('btc', 'wrong'));
    const acc = aggregateOutcomes(arr);
    expect(acc.correct).toBe(5);
    expect(acc.wrong).toBe(3);
    expect(acc.hitRatePct).toBe(63);
  });

  it('byCoin gruppiert + sortiert nach Hit-Rate desc', () => {
    const arr: OverrideOutcome[] = [
      make('btc', 'correct'), make('btc', 'correct'), make('btc', 'wrong'),
      make('eth', 'wrong'), make('eth', 'wrong'),
      make('sol', 'correct'), make('sol', 'correct')
    ];
    const acc = aggregateOutcomes(arr);
    expect(acc.byCoin[0].coinId).toBe('sol');
    expect(acc.byCoin[0].hitRatePct).toBe(100);
    expect(acc.byCoin[acc.byCoin.length - 1].coinId).toBe('eth');
    expect(acc.byCoin[acc.byCoin.length - 1].hitRatePct).toBe(0);
  });

  it('Coin mit < 2 decisive Outcomes → byCoin.hitRatePct null', () => {
    const arr = [make('btc', 'correct')];
    const acc = aggregateOutcomes(arr);
    expect(acc.byCoin[0].hitRatePct).toBeNull();
  });
});

describe('deriveUserOverrideWeight', () => {
  function acc(correct: number, wrong: number, hitRatePct: number | null): UserOverrideAccuracy {
    return { evaluable: correct + wrong, correct, wrong, unclear: 0, hitRatePct, byCoin: [] };
  }

  it('Unter 5 decisive → 1× und reason insufficient', () => {
    const w = deriveUserOverrideWeight(acc(2, 1, 67));
    expect(w.multiplier).toBe(1);
    expect(w.reason).toBe('insufficient');
  });

  it('Hit-Rate null → insufficient (auch wenn evaluable hoch)', () => {
    const w = deriveUserOverrideWeight(acc(0, 0, null));
    expect(w.multiplier).toBe(1);
    expect(w.reason).toBe('insufficient');
  });

  it('70 % + 5+ decisive → strong 1.25', () => {
    const w = deriveUserOverrideWeight(acc(7, 3, 70));
    expect(w.multiplier).toBe(1.25);
    expect(w.reason).toBe('strong');
  });

  it('60-69 % → good 1.10', () => {
    const w = deriveUserOverrideWeight(acc(6, 4, 60));
    expect(w.multiplier).toBe(1.10);
    expect(w.reason).toBe('good');
  });

  it('45-59 % → neutral 1.0', () => {
    const w = deriveUserOverrideWeight(acc(5, 5, 50));
    expect(w.multiplier).toBe(1);
    expect(w.reason).toBe('neutral');
  });

  it('30-44 % → weak 0.80', () => {
    const w = deriveUserOverrideWeight(acc(3, 7, 30));
    expect(w.multiplier).toBe(0.80);
    expect(w.reason).toBe('weak');
  });

  it('Unter 30 % → poor 0.60', () => {
    const w = deriveUserOverrideWeight(acc(1, 9, 10));
    expect(w.multiplier).toBe(0.60);
    expect(w.reason).toBe('poor');
  });
});
