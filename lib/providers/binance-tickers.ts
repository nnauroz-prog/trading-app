import { TOP_50 } from '@/lib/coin-universe';

const BASE_URL = 'https://api.binance.com/api/v3/ticker/24hr';

export interface TickerSnapshot {
  symbol: string;
  binanceSymbol: string;
  price: number;
  priceChangePct: number;
  high: number;
  low: number;
  volume: number;
  quoteVolume: number;
}

interface RawTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

export async function fetchAllTickers(): Promise<Map<string, TickerSnapshot> | null> {
  try {
    const url = `${BASE_URL}?symbols=${encodeURIComponent(JSON.stringify(TOP_50.map((c) => c.binanceSymbol)))}`;
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    const raw = (await res.json()) as RawTicker[];
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
    return map;
  } catch {
    return null;
  }
}
