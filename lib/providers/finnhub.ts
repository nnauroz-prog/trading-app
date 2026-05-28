import { PriceSnapshot } from '@/lib/types/domain';
import { finnhubSymbolByAssetId } from '@/lib/data/mock';

const BASE = 'https://finnhub.io/api/v1';

interface FinnhubQuote {
  c: number;
  d: number | null;
  dp: number | null;
  pc: number;
}

interface FinnhubMetricBlock {
  '5DayPriceReturnDaily'?: number | null;
  'monthToDatePriceReturnDaily'?: number | null;
  '10DayAverageTradingVolume'?: number | null;
  '52WeekHigh'?: number | null;
  '52WeekLow'?: number | null;
  'peNormalizedAnnual'?: number | null;
  'peTTM'?: number | null;
  'pegRatio'?: number | null;
  'roeRfy'?: number | null;
  'roeTTM'?: number | null;
  'totalDebt/totalEquityAnnual'?: number | null;
  'epsGrowthQuarterlyYoy'?: number | null;
  'revenueGrowthQuarterlyYoy'?: number | null;
  'revenueGrowthTTMYoy'?: number | null;
}

interface FinnhubMetricResponse {
  metric?: FinnhubMetricBlock;
}

export interface StockMetrics {
  pe: number | null;
  peg: number | null;
  roe: number | null;
  debtToEquity: number | null;
  epsGrowthYoy: number | null;
  revenueGrowthYoy: number | null;
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

export async function fetchStockMetrics(): Promise<Record<string, StockMetrics> | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;

  const entries = Object.entries(finnhubSymbolByAssetId);
  const results = await Promise.all(entries.map(async ([assetId, symbol]) => {
    const metric = await fetchJson<FinnhubMetricResponse>(metricUrl(symbol, apiKey));
    if (!metric?.metric) return null;
    return [assetId, extractMetrics(metric.metric)] as const;
  }));

  const map: Record<string, StockMetrics> = {};
  for (const entry of results) {
    if (entry) map[entry[0]] = entry[1];
  }
  return Object.keys(map).length > 0 ? map : null;
}

function metricUrl(symbol: string, apiKey: string): string {
  return `${BASE}/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${apiKey}`;
}

function extractMetrics(m: FinnhubMetricBlock): StockMetrics {
  return {
    pe: m['peNormalizedAnnual'] ?? m['peTTM'] ?? null,
    peg: m['pegRatio'] ?? null,
    roe: m['roeRfy'] ?? m['roeTTM'] ?? null,
    debtToEquity: m['totalDebt/totalEquityAnnual'] ?? null,
    epsGrowthYoy: m['epsGrowthQuarterlyYoy'] ?? null,
    revenueGrowthYoy: m['revenueGrowthQuarterlyYoy'] ?? m['revenueGrowthTTMYoy'] ?? null
  };
}

export interface StockQuote {
  symbol: string;
  price: number;
  change24hPct: number;
  high52: number | null;
  low52: number | null;
  source: 'finnhub';
}

export async function fetchStockQuoteBySymbol(symbol: string): Promise<StockQuote | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;
  try {
    const [quote, metric] = await Promise.all([
      fetchJson<FinnhubQuote>(`${BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`),
      fetchJson<FinnhubMetricResponse>(metricUrl(symbol, apiKey))
    ]);
    if (!quote || quote.c === 0) return null;
    const m = metric?.metric ?? {};
    return {
      symbol,
      price: quote.c,
      change24hPct: quote.dp ?? 0,
      high52: m['52WeekHigh'] ?? null,
      low52: m['52WeekLow'] ?? null,
      source: 'finnhub'
    };
  } catch {
    return null;
  }
}

async function fetchOne(assetId: string, symbol: string, apiKey: string): Promise<PriceSnapshot | null> {
  try {
    const [quote, metric] = await Promise.all([
      fetchJson<FinnhubQuote>(`${BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`),
      fetchJson<FinnhubMetricResponse>(metricUrl(symbol, apiKey))
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
