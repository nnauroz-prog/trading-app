import type { Candle } from '@/lib/types/domain';

export type MarketDataSource = NonNullable<Candle['source']> | 'mixed' | 'unknown' | 'offline';

export function marketDataSource(sources: Iterable<Candle['source']>): MarketDataSource {
  const unique = new Set<MarketDataSource>();
  for (const source of sources) unique.add(source ?? 'unknown');
  if (unique.size === 0) return 'offline';
  return unique.size === 1 ? unique.values().next().value! : 'mixed';
}
