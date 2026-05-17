import { Candle } from '@/lib/types/domain';
import { binanceSymbolByAssetId } from '@/lib/data/mock';
import { getCoinById } from '@/lib/coin-universe';

interface RawBinanceKline {
  0: number;
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
}

interface BybitKlineResponse {
  retCode: number;
  retMsg: string;
  result?: {
    list?: string[][];
  };
}

function intervalToBybit(interval: '1h' | '4h'): string {
  return interval === '1h' ? '60' : '240';
}

async function fetchBybit(symbol: string, interval: '1h' | '4h', limit: number): Promise<Candle[] | null> {
  try {
    const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${intervalToBybit(interval)}&limit=${Math.min(limit, 1000)}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = (await res.json()) as BybitKlineResponse;
    if (data.retCode !== 0 || !data.result?.list) return null;
    return data.result.list
      .map((k) => ({
        openTime: parseInt(k[0], 10),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5])
      }))
      .sort((a, b) => a.openTime - b.openTime);
  } catch {
    return null;
  }
}

async function fetchBinance(symbol: string, interval: '1h' | '4h', limit: number): Promise<Candle[] | null> {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const raw = (await res.json()) as RawBinanceKline[];
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

export async function fetchKlinesBySymbol(symbol: string, interval: string, limit = 200): Promise<Candle[] | null> {
  if (interval !== '1h' && interval !== '4h') {
    return fetchBinance(symbol, interval as '1h' | '4h', limit);
  }
  const bybit = await fetchBybit(symbol, interval, limit);
  if (bybit && bybit.length > 0) return bybit;
  return fetchBinance(symbol, interval, limit);
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
