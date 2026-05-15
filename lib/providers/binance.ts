import { Candle } from '@/lib/types/domain';
import { binanceSymbolByAssetId } from '@/lib/data/mock';
import { getCoinById } from '@/lib/coin-universe';

const BASE_URL = 'https://api.binance.com/api/v3/klines';

type RawKline = [number, string, string, string, string, string, ...unknown[]];

export async function fetchKlinesBySymbol(symbol: string, interval: string, limit = 200): Promise<Candle[] | null> {
  const url = `${BASE_URL}?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const raw = (await res.json()) as RawKline[];
    return raw.map((k) => ({
      openTime: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    }));
  } catch {
    return null;
  }
}

export async function fetchCandles(assetId: string, interval: '1h' | '4h', limit = 200): Promise<Candle[] | null> {
  const fromMock = binanceSymbolByAssetId[assetId];
  if (fromMock) return fetchKlinesBySymbol(fromMock, interval, limit);
  const coin = getCoinById(assetId);
  if (!coin) return null;
  return fetchKlinesBySymbol(coin.binanceSymbol, interval, limit);
}

export async function fetchCandlesBatch(
  assetIds: string[],
  interval: '1h' | '4h',
  limit = 200
): Promise<Record<string, Candle[] | null>> {
  const entries = await Promise.all(
    assetIds.map(async (id) => [id, await fetchCandles(id, interval, limit)] as const)
  );
  return Object.fromEntries(entries);
}
