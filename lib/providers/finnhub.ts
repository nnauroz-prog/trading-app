import { PriceSnapshot } from '@/lib/types/domain';
import { finnhubSymbolByAssetId } from '@/lib/data/mock';

const BASE = 'https://finnhub.io/api/v1';

interface FinnhubQuote {
  c: number;
  d: number | null;
  dp: number | null;
  pc: number;
}

interface FinnhubMetricResponse {
  metric?: {
    '5DayPriceReturnDaily'?: number | null;
    'monthToDatePriceReturnDaily'?: number | null;
    '10DayAverageTradingVolume'?: number | null;
  };
}

export async function fetchStockSnapshots(): Promise<Record<string, PriceSnapshot> | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;

  const entries = Object.entries(finnhubSymbolByAssetId);
  const results = await Promise.all(entries.map(([assetId, symbol]) => fetchOne(assetId, symbol, apiKey)));

  const map: Record<string, PriceSnapshot> = {};
  for (const snapshot of results) {
    if (snapshot) map[snapshot.assetId] = snapshot;
  }
  return Object.keys(map).length > 0 ? map : null;
}

async function fetchOne(assetId: string, symbol: string, apiKey: string): Promise<PriceSnapshot | null> {
  try {
    const [quote, metric] = await Promise.all([
      fetchJson<FinnhubQuote>(`${BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`),
      fetchJson<FinnhubMetricResponse>(`${BASE}/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${apiKey}`)
    ]);
    if (!quote || quote.c === 0) return null;

    const m = metric?.metric ?? {};
    return {
      assetId,
      price: quote.c,
      change24h: quote.dp ?? 0,
      change7d: m['5DayPriceReturnDaily'] ?? 0,
      change30d: m['monthToDatePriceReturnDaily'] ?? 0,
      volume: m['10DayAverageTradingVolume'] ?? 0,
      source: 'finnhub'
    };
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return null;
  return (await res.json()) as T;
}
