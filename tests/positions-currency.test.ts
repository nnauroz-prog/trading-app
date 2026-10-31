import { describe, expect, it } from 'vitest';
import { comparableCryptoPrice } from '@/components/positions-panel';
import { computePositionStats } from '@/lib/positions';
import type { Position } from '@/lib/types/positions';

const purchase: Position = {
  id: 'euro-crypto-purchase', underlying: 'Bitcoin', ticker: 'BTC', instrumentType: 'crypto',
  broker: 'Coinbase', entryPrice: 80, entryDate: 1, positionSize: 2, investmentQuote: 160,
  currency: 'EUR', stopLossPlanned: 70, takeProfitPlanned: 100, thesis: '', notes: '', status: 'open'
};

describe('purchase price comparisons use the purchase currency', () => {
  it.each(['EUR', 'USD'] as const)('withholds a raw USDT quote from a %s purchase', currency => {
    expect(comparableCryptoPrice({ ...purchase, currency }, { btc: 110 }, 'USDT')).toBeNull();
  });

  it('accepts a genuine same-currency crypto price, with the ticker preferred over its name', () => {
    expect(comparableCryptoPrice(purchase, { btc: 95, bitcoin: 96 }, 'EUR')).toBe(95);
    expect(comparableCryptoPrice({ ...purchase, currency: 'USD' }, { btc: 105 }, 'USD')).toBe(105);
  });

  it('does not mistake a crypto ticker for a stock or use invalid prices', () => {
    expect(comparableCryptoPrice({ ...purchase, instrumentType: 'stock' }, { btc: 95 }, 'EUR')).toBeNull();
    for (const price of [null, Number.NaN, Number.POSITIVE_INFINITY, 0, -1]) {
      expect(comparableCryptoPrice(purchase, { btc: price }, 'EUR')).toBeNull();
    }
  });

  it('keeps manually entered sale results in their stored currency when current quotes are withheld', () => {
    const sale: Position = { ...purchase, id: 'sold', status: 'closed_win', closePrice: 100, realizedPnl: 40, realizedPnlPct: 25 };
    const stats = computePositionStats([purchase, sale], {});
    expect(stats.realizedByCurrency).toEqual({ EUR: 40 });
    expect(stats.unrealizedByCurrency).toEqual({});
  });
});
