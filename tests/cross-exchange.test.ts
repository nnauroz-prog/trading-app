import { describe, expect, it } from 'vitest';
import { checkCrossExchangePrices } from '@/lib/analysis/cross-exchange-check';
import { TickerSnapshot } from '@/lib/providers/binance-tickers';

function ticker(symbol: string, price: number): TickerSnapshot {
  return {
    symbol,
    binanceSymbol: symbol,
    price,
    priceChangePct: 0,
    high: price,
    low: price,
    volume: 0,
    quoteVolume: 0,
    source: 'binance'
  };
}

describe('checkCrossExchangePrices', () => {
  it('returns no findings when Binance is offline', () => {
    const r = checkCrossExchangePrices(null, new Map());
    expect(r.findings).toHaveLength(0);
    expect(r.summary.toLowerCase()).toContain('keine binance');
  });

  it('returns no findings when Bybit is unreachable', () => {
    const r = checkCrossExchangePrices(new Map([['BTCUSDT', ticker('BTCUSDT', 100000)]]), null);
    expect(r.findings).toHaveLength(0);
    expect(r.summary.toLowerCase()).toContain('bybit');
  });

  it('stays silent for tight alignment (< 0.5%)', () => {
    const r = checkCrossExchangePrices(
      new Map([['BTCUSDT', ticker('BTCUSDT', 100000)]]),
      new Map([['BTCUSDT', ticker('BTCUSDT', 100200)]])
    );
    expect(r.findings).toHaveLength(0);
    expect(r.okCount).toBe(1);
  });

  it('flags moderate divergence (0.5–1%) as auffällig', () => {
    const r = checkCrossExchangePrices(
      new Map([['ETHUSDT', ticker('ETHUSDT', 3000)]]),
      new Map([['ETHUSDT', ticker('ETHUSDT', 3025)]]) // ~0.83%
    );
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].severity).toBe('auffällig');
    expect(r.suspiciousCount).toBe(0);
  });

  it('flags large divergence (>1%) as verdächtig', () => {
    const r = checkCrossExchangePrices(
      new Map([['SOLUSDT', ticker('SOLUSDT', 200)]]),
      new Map([['SOLUSDT', ticker('SOLUSDT', 206)]]) // 3%
    );
    expect(r.findings[0].severity).toBe('verdächtig');
    expect(r.suspiciousCount).toBe(1);
    expect(r.summary.toLowerCase()).toContain('nicht handeln');
  });

  it('sorts findings by absolute divergence', () => {
    const r = checkCrossExchangePrices(
      new Map([['A', ticker('A', 100)], ['B', ticker('B', 100)]]),
      new Map([['A', ticker('A', 101)], ['B', ticker('B', 105)]])
    );
    expect(r.findings[0].symbol).toBe('B');
    expect(r.findings[1].symbol).toBe('A');
  });
});
