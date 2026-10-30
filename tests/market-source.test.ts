import { expect, it } from 'vitest';
import { marketDataSource } from '@/lib/providers/market-source';
it('reports actual provider provenance without relabeling fallback data', () => {
  expect(marketDataSource(['kraken', 'kraken'])).toBe('kraken');
  expect(marketDataSource(['bybit'])).toBe('bybit');
  expect(marketDataSource(['binance', 'kraken'])).toBe('mixed');
  expect(marketDataSource([undefined])).toBe('unknown');
  expect(marketDataSource([])).toBe('offline');
});
