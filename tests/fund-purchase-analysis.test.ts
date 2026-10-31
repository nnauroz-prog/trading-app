import { describe, expect, it } from 'vitest';
import { analyzeFundPurchase } from '@/lib/finance/fund-purchase-analysis';
import type { PriceCandle, PriceHistory } from '@/lib/market/yahoo-history';
import type { MarketQuote } from '@/lib/market/yahoo-quote';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 30, 16);

function quote(overrides: Partial<MarketQuote> = {}): MarketQuote {
  return {
    symbol: 'VWCE.DE',
    name: 'Vanguard FTSE All-World UCITS ETF',
    last: 120,
    previousClose: 118,
    changeAbs: 999,
    changePct: 999,
    currency: 'EUR',
    marketState: 'CLOSED',
    ts: NOW,
    source: 'yahoo',
    ...overrides,
  };
}

function candle(time: number, close: number): PriceCandle {
  return { time, close, open: close, high: close, low: close, volume: 1 };
}

function history(candles: PriceCandle[], overrides: Partial<PriceHistory> = {}): PriceHistory {
  return { symbol: 'VWCE.DE', currency: 'EUR', candles, ...overrides };
}

function analyze(overrides: Partial<Parameters<typeof analyzeFundPurchase>[0]> = {}) {
  return analyzeFundPurchase({ budget: 800, quote: quote(), history: null, ongoingChargePct: 0.14, now: NOW, ...overrides });
}

describe('fund purchase arithmetic', () => {
  it('illustrates whole units within the budget before unknown broker fees', () => {
    const result = analyze();
    expect(result.quoteUsable).toBe(true);
    expect(result.wholeUnits).toBe(6);
    expect(result.estimatedUnitsCost).toBe(720);
    expect(result.remainder).toBe(80);
    expect(result.annualFundCost).toBe(1.12);
    expect(result.estimatedUnitsCostCents! + result.remainderCents!).toBe(result.budgetCents);
    // Annual fund charges are an expense illustration, not a cash deduction.
    expect(result.remainder).toBe(800 - 720);
  });

  it('rounds a subcent price up and a subcent budget down', () => {
    const result = analyze({ budget: 800.009, quote: quote({ last: 100.001 }) });
    expect(result.budgetEur).toBe(800);
    expect(result.unitPriceEur).toBe(100.01);
    expect(result.wholeUnits).toBe(7);
    expect(result.estimatedUnitsCost).toBe(700.07);
    expect(result.remainder).toBe(99.93);
    expect(result.estimatedUnitsCostCents! + result.remainderCents!).toBe(80_000);
  });

  it('does not create binary-float ceil/floor errors for decimal cents', () => {
    const result = analyze({ budget: 0.29, quote: quote({ last: 0.01 }) });
    expect(result.budgetCents).toBe(29);
    expect(result.wholeUnits).toBe(29);
    expect(result.remainderCents).toBe(0);
    const price = analyze({ budget: 11, quote: quote({ last: 1.1 }) });
    expect(price.unitPriceEur).toBe(1.1);
    expect(price.wholeUnits).toBe(10);
    expect(price.remainderCents).toBe(0);
  });

  it('conserves cents and never exceeds the usable budget across awkward prices', () => {
    for (const budget of [0, 0.01, 0.29, 1.009, 799.99, 800, 800.001, 12_345_678.91]) {
      for (const last of [0.01, 0.001, 1.005, 1.1, 17.39, 99.999, 120.04, 801]) {
        const result = analyze({ budget, quote: quote({ last }) });
        expect(result.wholeUnits).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(result.wholeUnits)).toBe(true);
        expect(result.estimatedUnitsCostCents!).toBeLessThanOrEqual(result.budgetCents!);
        expect(result.remainderCents!).toBeGreaterThanOrEqual(0);
        expect(result.estimatedUnitsCostCents! + result.remainderCents!).toBe(result.budgetCents);
        expect(result.estimatedUnitsCost!).toBeLessThanOrEqual(budget);
      }
    }
  });

  it('returns zero whole units when the budget is smaller than one unit', () => {
    const result = analyze({ budget: 100 });
    expect(result.wholeUnits).toBe(0);
    expect(result.estimatedUnitsCost).toBe(0);
    expect(result.remainder).toBe(100);
  });

  it.each([NaN, Infinity, -1, Number.MAX_VALUE])('rejects invalid or unsafe budget %s', (budget) => {
    const result = analyze({ budget });
    expect(result.budgetEur).toBeNull();
    expect(result.wholeUnits).toBeNull();
    expect(result.estimatedUnitsCost).toBeNull();
    expect(result.remainder).toBeNull();
    expect(result.annualFundCost).toBeNull();
    expect(result.quoteUsable).toBe(true);
  });

  it.each([NaN, Infinity, -0.14, 101])('rejects an invalid ongoing charge %s without affecting the purchase', (ongoingChargePct) => {
    const result = analyze({ ongoingChargePct });
    expect(result.annualFundCost).toBeNull();
    expect(result.wholeUnits).toBe(6);
    expect(result.remainder).toBe(80);
  });
});

describe('fund quote validation', () => {
  it.each([
    [null, 'missing-quote'],
    [quote({ symbol: 'VWRL.AS' }), 'wrong-symbol'],
    [quote({ currency: 'USD' }), 'wrong-currency'],
    [quote({ currency: '' }), 'wrong-currency'],
    [quote({ last: 0 }), 'invalid-price'],
    [quote({ last: -1 }), 'invalid-price'],
    [quote({ last: NaN }), 'invalid-price'],
    [quote({ last: Infinity }), 'invalid-price'],
    [quote({ ts: NaN }), 'invalid-timestamp'],
    [quote({ ts: 0 }), 'invalid-timestamp'],
    [quote({ ts: Infinity }), 'invalid-timestamp'],
    [quote({ ts: NOW - 4 * DAY - 1 }), 'stale-quote'],
    [quote({ ts: NOW + 5 * 60_000 + 1 }), 'future-quote'],
  ] as const)('withholds purchase math for an unusable quote: %s', (quoteValue, reason) => {
    const result = analyze({ quote: quoteValue });
    expect(result.quoteUsable).toBe(false);
    expect(result.quoteUnavailableReason).toBe(reason);
    expect(result.unitPriceEur).toBeNull();
    expect(result.wholeUnits).toBeNull();
    expect(result.estimatedUnitsCost).toBeNull();
    expect(result.remainder).toBeNull();
    expect(result.lastSessionChangePct).toBeNull();
    expect(result.annualFundCost).toBe(1.12);
  });

  it('allows the stated age and clock-skew boundaries', () => {
    expect(analyze({ quote: quote({ ts: NOW - 4 * DAY }) }).quoteUsable).toBe(true);
    expect(analyze({ quote: quote({ ts: NOW + 5 * 60_000 }) }).quoteUsable).toBe(true);
  });

  it('recomputes the Yahoo session change from a valid previous close', () => {
    const result = analyze({ quote: quote({ last: 120, previousClose: 100 }) });
    expect(result.lastSessionChangePct).toBeCloseTo(20);
    expect(result.lastSessionChangeAbs).toBe(20);
    expect(result.quoteTimestampKind).toBe('market-time');
    expect(result.quoteAsOf).toBe(NOW);
  });

  it.each([0, -1, NaN, Infinity])('withholds session changes for invalid previous close %s', (previousClose) => {
    const result = analyze({ quote: quote({ previousClose }) });
    expect(result.quoteUsable).toBe(true);
    expect(result.lastSessionChangePct).toBeNull();
    expect(result.lastSessionChangeAbs).toBeNull();
  });

  it('identifies Stooq retrieval time and does not call its opening-price change a session return', () => {
    const result = analyze({ quote: quote({ source: 'stooq', previousClose: 100 }) });
    expect(result.quoteUsable).toBe(true);
    expect(result.wholeUnits).toBe(6);
    expect(result.quoteTimestampKind).toBe('retrieved-at');
    expect(result.lastSessionChangePct).toBeNull();
    expect(result.lastSessionChangeAbs).toBeNull();
  });
});

describe('observed fund history', () => {
  it('uses the actual 1-, 3-, and 12-month observations and dates', () => {
    const start = Date.UTC(2025, 9, 30, 16);
    const threeMonths = Date.UTC(2026, 6, 30, 16);
    const oneMonth = Date.UTC(2026, 8, 30, 16);
    const result = analyze({ history: history([
      candle(start, 100), candle(threeMonths, 110), candle(oneMonth, 125), candle(NOW, 120),
    ]) }).history;
    expect(result.usable).toBe(true);
    expect(result.asOf).toBe(NOW);
    expect(result.startAt).toBe(start);
    expect(result.return1m?.returnPct).toBeCloseTo(-4);
    expect(result.return3m?.returnPct).toBeCloseTo((120 / 110 - 1) * 100);
    expect(result.return12m?.returnPct).toBeCloseTo(20);
    expect(result.return12m).toMatchObject({ startAt: start, endAt: NOW, startClose: 100, endClose: 120 });
  });

  it('uses the last observed date, rather than projecting prices to today', () => {
    const end = Date.UTC(2025, 7, 31, 16);
    const start = Date.UTC(2025, 6, 31, 16);
    const result = analyze({ history: history([candle(start, 100), candle(end, 110)]) }).history;
    expect(result.asOf).toBe(end);
    expect(result.return1m?.endAt).toBe(end);
    expect(result.return1m?.returnPct).toBeCloseTo(10);
    expect(result.points).toHaveLength(2);
    expect(result.points.every((point) => point.time <= end)).toBe(true);
    expect(result.return3m).toBeNull();
    expect(result.return12m).toBeNull();
  });

  it('clamps calendar-month cutoffs and exposes nearby actual observation dates', () => {
    const end = Date.UTC(2026, 2, 31, 16);
    const start = Date.UTC(2026, 1, 27, 16);
    const result = analyze({ history: history([candle(start, 100), candle(end, 105)]) }).history;
    expect(result.return1m).toMatchObject({ startAt: start, endAt: end });
    expect(result.return1m?.returnPct).toBeCloseTo(5);
  });

  it('does not invent a monthly return across a missing start observation', () => {
    const result = analyze({ history: history([candle(NOW - 50 * DAY, 100), candle(NOW, 120)]) }).history;
    expect(result.usable).toBe(true);
    expect(result.return1m).toBeNull();
    expect(result.return3m).toBeNull();
    expect(result.return12m).toBeNull();
  });

  it('filters invalid closes/dates, sorts observations, and deterministically deduplicates them', () => {
    const result = analyze({ history: history([
      candle(NOW, 120),
      candle(NOW - DAY, 100),
      candle(NaN, 999),
      candle(NOW - 2 * DAY, NaN),
      candle(NOW - 3 * DAY, 0),
      candle(NOW - 4 * DAY, -50),
      candle(NOW - 5 * DAY, Infinity),
      candle(NOW + DAY, 900),
      candle(0, 40),
      candle(NOW, 125),
    ]) }).history;
    expect(result.points).toEqual([{ time: NOW - DAY, close: 100 }, { time: NOW, close: 125 }]);
    expect(result.asOf).toBe(NOW);
    expect(result.maxDrawdown?.drawdownPct).toBe(0);
  });

  it.each([
    [null, 'missing-history'],
    [history([candle(NOW, 100)], { symbol: 'SPY' }), 'wrong-symbol'],
    [history([candle(NOW, 100)], { currency: 'USD' }), 'wrong-currency'],
    [history([]), 'no-valid-prices'],
    [history([candle(NOW, NaN)]), 'no-valid-prices'],
  ] as const)('withholds the EUR chart and statistics for unusable history: %s', (historyValue, reason) => {
    const result = analyze({ history: historyValue }).history;
    expect(result.usable).toBe(false);
    expect(result.unavailableReason).toBe(reason);
    expect(result.points).toEqual([]);
    expect(result.return1m).toBeNull();
    expect(result.maxDrawdown).toBeNull();
  });

  it('does not derive returns or drawdown from a single observation', () => {
    const result = analyze({ history: history([candle(NOW, 100)]) }).history;
    expect(result.usable).toBe(false);
    expect(result.unavailableReason).toBe('insufficient-prices');
    expect(result.asOf).toBe(NOW);
    expect(result.return1m).toBeNull();
    expect(result.maxDrawdown).toBeNull();
  });

  it('finds only the maximum observed peak-to-later-trough loss', () => {
    const times = [5, 4, 3, 2, 1, 0].map((daysAgo) => NOW - daysAgo * DAY);
    const closes = [80, 100, 75, 120, 90, 130];
    const result = analyze({ history: history(times.map((time, index) => candle(time, closes[index]))) }).history;
    expect(result.maxDrawdown?.drawdownPct).toBeCloseTo(25);
    expect(result.maxDrawdown).toMatchObject({ peakAt: times[1], troughAt: times[2], periodStartAt: times[0], periodEndAt: NOW });
    // A later peak does not turn an earlier low into an imagined loss.
    expect(result.maxDrawdown?.drawdownPct).not.toBeCloseTo((1 - 75 / 130) * 100);
  });

  it('keeps valid EUR history independent from an unusable quote', () => {
    const result = analyze({
      quote: quote({ currency: 'USD' }),
      history: history([candle(NOW - DAY, 100), candle(NOW, 90)]),
    });
    expect(result.quoteUsable).toBe(false);
    expect(result.wholeUnits).toBeNull();
    expect(result.history.usable).toBe(true);
    expect(result.history.maxDrawdown?.drawdownPct).toBeCloseTo(10);
  });
});
