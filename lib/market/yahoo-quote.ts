// Yahoo Finance v8 Chart API Wrapper — serverseitig, ohne API-Key.
// Liefert Live-Quotes für Aktien, ETFs, Rohstoff-Futures, Indizes.
//
// Endpoint: query1.finance.yahoo.com/v8/finance/chart/{SYMBOL}
// Cache: 5 Minuten via Next.js revalidate.
//
// Wenn Yahoo eine Anfrage blockt oder timeoutet, liefern wir
// klar markiertes `null` zurück — KEINE fake-Werte.

export interface MarketQuote {
  symbol: string;
  name: string;
  last: number;
  previousClose: number;
  changeAbs: number;
  changePct: number;
  currency: string;
  marketState: 'REGULAR' | 'CLOSED' | 'PRE' | 'POST' | string;
  ts: number;
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        regularMarketPrice?: number;
        previousClose?: number;
        chartPreviousClose?: number;
        currency?: string;
        marketState?: string;
        shortName?: string;
        longName?: string;
        regularMarketTime?: number;
      };
    }>;
    error?: { code?: string; description?: string } | null;
  };
}

export async function fetchYahooQuote(symbol: string, fallbackName: string): Promise<MarketQuote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=15m`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 300 },
      headers: {
        // Yahoo blockt manche Default-Bot-UAs.
        'User-Agent': 'Mozilla/5.0 (TradingApp Desktop) AppleWebKit/537.36'
      }
    });
    if (!res.ok) return null;
    const data = (await res.json()) as YahooChartResponse;
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== 'number') return null;
    const prev = meta.previousClose ?? meta.chartPreviousClose ?? meta.regularMarketPrice;
    return {
      symbol: meta.symbol ?? symbol,
      name: meta.shortName ?? meta.longName ?? fallbackName,
      last: meta.regularMarketPrice,
      previousClose: prev,
      changeAbs: meta.regularMarketPrice - prev,
      changePct: prev > 0 ? ((meta.regularMarketPrice - prev) / prev) * 100 : 0,
      currency: meta.currency ?? 'USD',
      marketState: meta.marketState ?? 'CLOSED',
      ts: (meta.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000
    };
  } catch {
    return null;
  }
}

export async function fetchManyQuotes(items: Array<{ symbol: string; name: string }>): Promise<Array<MarketQuote | null>> {
  return Promise.all(items.map((i) => fetchYahooQuote(i.symbol, i.name)));
}

export function fmtCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency, maximumFractionDigits: value >= 100 ? 2 : 4 }).format(value);
}

export function fmtChange(pct: number): string {
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)} %`;
}
