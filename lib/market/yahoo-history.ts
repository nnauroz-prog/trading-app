// Yahoo Finance Chart API mit 1-Jahr-Tageshistorie für Profi-Indikatoren.
// Endpoint: query1.finance.yahoo.com/v8/finance/chart/{SYMBOL}?range=1y&interval=1d

export interface PriceCandle {
  time: number;     // ms epoch
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceHistory {
  symbol: string;
  candles: PriceCandle[];
  currency: string;
}

interface YahooHistoryResponse {
  chart?: {
    result?: Array<{
      meta?: { symbol?: string; currency?: string };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
          volume?: (number | null)[];
        }>;
      };
    }>;
    error?: unknown;
  };
}

export async function fetchYahooHistory(symbol: string): Promise<PriceHistory | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'Mozilla/5.0 (TradingApp Desktop) AppleWebKit/537.36' },
      signal: controller.signal
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return null;
    const data = (await res.json()) as YahooHistoryResponse;
    const result = data.chart?.result?.[0];
    if (!result?.timestamp || !result.indicators?.quote?.[0]) return null;
    const ts = result.timestamp;
    const q = result.indicators.quote[0];
    const candles: PriceCandle[] = [];
    for (let i = 0; i < ts.length; i++) {
      const o = q.open?.[i];
      const h = q.high?.[i];
      const l = q.low?.[i];
      const c = q.close?.[i];
      const v = q.volume?.[i];
      if (typeof o === 'number' && typeof h === 'number' && typeof l === 'number' && typeof c === 'number') {
        candles.push({
          time: ts[i] * 1000,
          open: o, high: h, low: l, close: c,
          volume: typeof v === 'number' ? v : 0
        });
      }
    }
    if (candles.length === 0) return null;
    return {
      symbol: result.meta?.symbol ?? symbol,
      candles,
      currency: result.meta?.currency ?? 'USD'
    };
  } catch {
    return null;
  }
}
