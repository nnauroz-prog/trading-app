import { PriceSnapshot } from '@/lib/types/domain';
import { mockSnapshots } from '@/lib/data/mock';
import { fetchCryptoSnapshots } from '@/lib/providers/coingecko';
import { fetchStockSnapshots } from '@/lib/providers/finnhub';

export async function getSnapshots(): Promise<Record<string, PriceSnapshot>> {
  const [crypto, stocks] = await Promise.all([fetchCryptoSnapshots(), fetchStockSnapshots()]);
  return { ...mockSnapshots, ...(crypto ?? {}), ...(stocks ?? {}) };
}
