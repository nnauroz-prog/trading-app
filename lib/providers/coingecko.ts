import { PriceSnapshot } from '@/lib/types/domain';
import { coingeckoIdByAssetId } from '@/lib/data/mock';

interface CoinGeckoMarketRow {
  id: string;
  current_price: number;
  total_volume: number;
  price_change_percentage_24h_in_currency: number | null;
  price_change_percentage_7d_in_currency: number | null;
  price_change_percentage_30d_in_currency: number | null;
}

const PRO_BASE = 'https://pro-api.coingecko.com/api/v3';
const PUBLIC_BASE = 'https://api.coingecko.com/api/v3';

export async function fetchCryptoSnapshots(): Promise<Record<string, PriceSnapshot> | null> {
  const entries = Object.entries(coingeckoIdByAssetId);
  if (entries.length === 0) return null;

  const apiKey = process.env.COINGECKO_API_KEY;
  const base = apiKey ? PRO_BASE : PUBLIC_BASE;
  const ids = entries.map(([, cgId]) => cgId).join(',');
  const url = new URL(`${base}/coins/markets`);
  url.searchParams.set('vs_currency', 'usd');
  url.searchParams.set('ids', ids);
  url.searchParams.set('price_change_percentage', '24h,7d,30d');

  try {
    const res = await fetch(url, {
      headers: apiKey ? { 'x-cg-pro-api-key': apiKey } : undefined,
      next: { revalidate: 300 }
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as CoinGeckoMarketRow[];

    const result: Record<string, PriceSnapshot> = {};
    for (const [assetId, cgId] of entries) {
      const row = rows.find((r) => r.id === cgId);
      if (!row) continue;
      result[assetId] = {
        assetId,
        price: row.current_price,
        change24h: row.price_change_percentage_24h_in_currency ?? 0,
        change7d: row.price_change_percentage_7d_in_currency ?? 0,
        change30d: row.price_change_percentage_30d_in_currency ?? 0,
        volume: row.total_volume,
        source: 'coingecko'
      };
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}
