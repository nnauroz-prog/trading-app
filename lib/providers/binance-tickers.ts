import { TOP_50 } from '@/lib/coin-universe';

export interface TickerSnapshot {
  symbol: string;
  binanceSymbolUnused?: string;
  binanceSymbol: string;
  price: number;
  priceChangePct: number;
  high: number;
  low: number;
  volume: number;
  quoteVolume: number;
}

interface RawBinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

interface RawBybitTicker {
  symbol: string;
  lastPrice: string;
  price24hPcnt: string;
  highPrice24h: string;
  lowPrice24h: string;
  volume24h: string;
  turnover24h: string;
}

interface BybitTickerResponse {
  retCode: number;
  result?: {
    list?: RawBybitTicker[];
  };
}

async function fetchBybitTickers(): Promise<Map<string, TickerSnapshot> | null> {
  try {
    const url = 'https://api.bybit.com/v5/market/tickers?category=spot';
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    const data = (await res.json()) as BybitTickerResponse;
    if (data.retCode !== 0 || !data.result?.list) return null;
    const wantedSymbols = new Set(TOP_50.map((c) => c.binanceSymbol));
    const map = new Map<string, TickerSnapshot>();
    for (const t of data.result.list) {
      if (!wantedSymbols.has(t.symbol)) continue;
      map.set(t.symbol, {
        symbol: t.symbol,
        binanceSymbol: t.symbol,
        price: parseFloat(t.lastPrice),
        priceChangePct: parseFloat(t.price24hPcnt) * 100,
        high: parseFloat(t.highPrice24h),
        low: parseFloat(t.lowPrice24h),
        volume: parseFloat(t.volume24h),
        quoteVolume: parseFloat(t.turnover24h)
      });
    }
    return map.size > 0 ? map : null;
  } catch {
    return null;
  }
}

async function fetchBinanceTickers(): Promise<Map<string, TickerSnapshot> | null> {
  try {
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(TOP_50.map((c) => c.binanceSymbol)))}`;
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    const raw = (await res.json()) as RawBinanceTicker[];
    const map = new Map<string, TickerSnapshot>();
    for (const t of raw) {
      map.set(t.symbol, {
        symbol: t.symbol,
        binanceSymbol: t.symbol,
        price: parseFloat(t.lastPrice),
        priceChangePct: parseFloat(t.priceChangePercent),
        high: parseFloat(t.highPrice),
        low: parseFloat(t.lowPrice),
        volume: parseFloat(t.volume),
        quoteVolume: parseFloat(t.quoteVolume)
      });
    }
    return map.size > 0 ? map : null;
  } catch {
    return null;
  }
}

export async function fetchAllTickers(): Promise<Map<string, TickerSnapshot> | null> {
  const bybit = await fetchBybitTickers();
  if (bybit && bybit.size > 0) return bybit;
  return fetchBinanceTickers();
}
