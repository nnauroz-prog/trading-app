import { describe, expect, it } from 'vitest';
import { scoreStock, marketAverageChangePct, scoreUniverse } from '@/lib/market/stock-setup-score';
import type { MarketQuote } from '@/lib/market/yahoo-quote';

function q(over: Partial<MarketQuote> = {}): MarketQuote {
  return {
    symbol: 'AAPL', name: 'Apple',
    last: 200, previousClose: 198, changeAbs: 2, changePct: 1.0,
    currency: 'USD', marketState: 'REGULAR', ts: Date.now(),
    source: 'yahoo',
    ...over
  };
}

describe('scoreStock', () => {
  it('starkes Setup bei klar positivem Tag + Marktstärke', () => {
    const s = scoreStock(q({ changePct: 2.5 }), 1.0);
    expect(s.passed).toBe(6);
    expect(s.tier).toBe('strong');
  });

  it('schwaches Setup bei negativem Tag und Markt-Abschwächung', () => {
    const s = scoreStock(q({ changePct: -5.5 }), -1.0);
    expect(s.tier).toBe('weak');
    expect(s.reasoning.some((r) => r.includes('fallendes Messer'))).toBe(true);
  });

  it('FOMO-Warning bei extrem positivem Tag', () => {
    const s = scoreStock(q({ changePct: 9.0 }), 1.0);
    expect(s.reasoning.some((r) => r.includes('FOMO-Risiko'))).toBe(true);
  });

  it('relative Stärke wird erfasst', () => {
    const strong = scoreStock(q({ changePct: 3.0 }), 0.5);
    const weak = scoreStock(q({ changePct: 0.5 }), 2.0);
    expect(strong.passed).toBeGreaterThan(weak.passed);
  });

  it('Markt geschlossen reduziert Score um 1', () => {
    const open = scoreStock(q({ marketState: 'REGULAR' }), 0);
    const closed = scoreStock(q({ marketState: 'CLOSED' }), 0);
    expect(open.passed).toBeGreaterThan(closed.passed);
    expect(closed.reasoning.some((r) => r.includes('nicht live'))).toBe(true);
  });
});

describe('marketAverageChangePct', () => {
  it('berechnet Durchschnitt nur über non-null', () => {
    const avg = marketAverageChangePct([
      q({ changePct: 1.0 }),
      q({ changePct: 3.0 }),
      null,
      q({ changePct: 2.0 })
    ]);
    expect(avg).toBe(2.0);
  });

  it('liefert 0 wenn alle null', () => {
    expect(marketAverageChangePct([null, null])).toBe(0);
  });
});

describe('scoreUniverse', () => {
  it('sortiert absteigend nach passed-Count', () => {
    const universe = scoreUniverse([
      q({ symbol: 'A', changePct: -3 }),
      q({ symbol: 'B', changePct: 2 }),
      q({ symbol: 'C', changePct: 1 })
    ], 0);
    expect(universe[0].symbol).not.toBe('A');
    for (let i = 1; i < universe.length; i++) {
      expect(universe[i - 1].passed).toBeGreaterThanOrEqual(universe[i].passed);
    }
  });

  it('überspringt null-Quotes', () => {
    const universe = scoreUniverse([null, q(), null, q({ symbol: 'B' })], 0);
    expect(universe.length).toBe(2);
  });
});
