import { PriceSnapshot } from '@/lib/types/domain';
import { mockSnapshots } from '@/lib/data/mock';
import { fetchCryptoSnapshots } from '@/lib/providers/coingecko';
import { fetchStockSnapshots as fetchStockSnapshotsYahoo } from '@/lib/providers/yahoo';
import { fetchStockSnapshots as fetchStockSnapshotsFinnhub } from '@/lib/providers/finnhub';

export async function getSnapshots(): Promise<Record<string, PriceSnapshot>> {
  const [crypto, stocksFromYahoo] = await Promise.all([fetchCryptoSnapshots(), fetchStockSnapshotsYahoo()]);
  const yahooMissing = !stocksFromYahoo || Object.keys(stocksFromYahoo).length === 0;
  const stocksFromFinnhub = yahooMissing ? await fetchStockSnapshotsFinnhub() : null;
  return {
    ...mockSnapshots,
    ...(stocksFromFinnhub ?? {}),
    ...(stocksFromYahoo ?? {}),
    ...(crypto ?? {})
  };
}
