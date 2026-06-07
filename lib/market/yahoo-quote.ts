// Markt-Quote-Provider mit Multi-Source-Fallback.
//
// Reihenfolge: Yahoo Finance v8 Chart API → Stooq CSV → null.
// Yahoo blockt häufig Cloud-IPs; Stooq ist robuster ohne API-Key.
// Bei Fehler / Block: ehrliches null statt fake-Werte.
//
// Cache 5 Min via Next.js revalidate.

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
  source: 'yahoo' | 'stooq';
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

async function fetchYahoo(symbol: string, fallbackName: string): Promise<MarketQuote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=15m`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      next: { revalidate: 300 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (TradingApp Desktop) AppleWebKit/537.36'
      },
      signal: controller.signal
    }).finally(() => clearTimeout(timer));
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
      ts: (meta.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000,
      source: 'yahoo'
    };
  } catch {
    return null;
  }
}

// Stooq-Mapping. Yahoo blockt häufig Cloud-IPs; Stooq liefert CSV ohne
// API-Key und ist meist erreichbar.
function stooqMap(symbol: string): { stooq: string; currency: string } | null {
  // Indizes
  if (symbol === '^GSPC') return { stooq: '^spx', currency: 'USD' };
  if (symbol === '^NDX') return { stooq: '^ndx', currency: 'USD' };
  if (symbol === '^DJI') return { stooq: '^dji', currency: 'USD' };
  if (symbol === '^GDAXI') return { stooq: '^dax', currency: 'EUR' };
  if (symbol === '^STOXX50E') return { stooq: '^stoxx50e', currency: 'EUR' };
  // Edelmetalle als Spot (Yahoo-Futures → Stooq-Spot-Pendant)
  if (symbol === 'GC=F') return { stooq: 'xauusd', currency: 'USD' };
  if (symbol === 'SI=F') return { stooq: 'xagusd', currency: 'USD' };
  if (symbol === 'PL=F') return { stooq: 'xptusd', currency: 'USD' };
  if (symbol === 'PA=F') return { stooq: 'xpdusd', currency: 'USD' };
  // Energie / Industriemetalle / Agrar als Stooq-Futures
  if (symbol === 'CL=F') return { stooq: 'cl.f', currency: 'USD' };
  if (symbol === 'BZ=F') return { stooq: 'b.f', currency: 'USD' };
  if (symbol === 'NG=F') return { stooq: 'ng.f', currency: 'USD' };
  if (symbol === 'HG=F') return { stooq: 'hg.f', currency: 'USD' };
  if (symbol === 'ZW=F') return { stooq: 'zw.f', currency: 'USD' };
  if (symbol === 'ZC=F') return { stooq: 'zc.f', currency: 'USD' };
  if (symbol === 'ZS=F') return { stooq: 'zs.f', currency: 'USD' };
  if (symbol === 'KC=F') return { stooq: 'kc.f', currency: 'USD' };
  if (symbol === 'SB=F') return { stooq: 'sb.f', currency: 'USD' };
  if (symbol === 'RB=F') return { stooq: 'rb.f', currency: 'USD' };
  // Aktien
  if (/^[A-Z][A-Z0-9.-]*$/.test(symbol)) {
    if (symbol.endsWith('.DE')) return { stooq: symbol.toLowerCase(), currency: 'EUR' };
    if (symbol.includes('.')) return { stooq: symbol.toLowerCase(), currency: 'USD' };
    return { stooq: `${symbol.toLowerCase()}.us`, currency: 'USD' };
  }
  return null;
}

async function fetchStooq(symbol: string, fallbackName: string): Promise<MarketQuote | null> {
  const mapping = stooqMap(symbol);
  if (!mapping) return null;
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(mapping.stooq)}&f=sd2t2ohlcv&h&e=csv`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      next: { revalidate: 300 },
      headers: { 'User-Agent': 'Mozilla/5.0 (TradingApp Desktop) AppleWebKit/537.36' },
      signal: controller.signal
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return null;
    const text = await res.text();
    // CSV-Header: Symbol,Date,Time,Open,High,Low,Close,Volume
    const lines = text.trim().split('\n');
    if (lines.length < 2) return null;
    const cols = lines[1].split(',');
    if (cols.length < 7) return null;
    const close = parseFloat(cols[6]);
    const open = parseFloat(cols[3]);
    if (!Number.isFinite(close) || close <= 0) return null;
    const prev = Number.isFinite(open) && open > 0 ? open : close;
    return {
      symbol,
      name: fallbackName,
      last: close,
      previousClose: prev,
      changeAbs: close - prev,
      changePct: prev > 0 ? ((close - prev) / prev) * 100 : 0,
      currency: mapping.currency,
      marketState: 'CLOSED',
      ts: Date.now(),
      source: 'stooq'
    };
  } catch {
    return null;
  }
}

// Multi-Source-Fetch: Yahoo zuerst, dann Stooq.
export async function fetchYahooQuote(symbol: string, fallbackName: string): Promise<MarketQuote | null> {
  return (await fetchYahoo(symbol, fallbackName)) ?? (await fetchStooq(symbol, fallbackName));
}

export async function fetchManyQuotes(items: Array<{ symbol: string; name: string }>): Promise<Array<MarketQuote | null>> {
  return Promise.all(items.map((i) => fetchYahooQuote(i.symbol, i.name)));
}

export function fmtCurrency(value: number, currency: string): string {
  // Intl.NumberFormat wirft bei ungültigem Currency-Code („" oder „xxx") —
  // sicheren Fallback auf USD nutzen.
  const safe = currency && /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : 'USD';
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: safe,
      maximumFractionDigits: value >= 100 ? 2 : 4
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${safe}`;
  }
}

export function fmtChange(pct: number): string {
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)} %`;
}
