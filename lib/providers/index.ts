import { PriceSnapshot } from '@/lib/types/domain';
import { mockSnapshots } from '@/lib/data/mock';
import { fetchCryptoSnapshots } from '@/lib/providers/coingecko';

export async function getSnapshots(): Promise<Record<string, PriceSnapshot>> {
  const crypto = await fetchCryptoSnapshots();
  return { ...mockSnapshots, ...(crypto ?? {}) };
}
