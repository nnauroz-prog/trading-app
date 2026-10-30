import type { Candle } from '@/lib/types/domain';
import type { TickerSnapshot } from '@/lib/providers/binance-tickers';
import { TOP_50 } from '@/lib/coin-universe';

const BASE = 'https://api.kraken.com/0/public';
const INTERVALS: Record<string, number> = { '1m': 1, '5m': 5, '15m': 15, '30m': 30, '1h': 60, '4h': 240, '1d': 1440, '1w': 10080 };
type JsonRecord = Record<string, unknown>;
type Pair = { key: string; symbol: string };
const object = (value: unknown): JsonRecord => value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
const number = (value: unknown): number => (typeof value === 'string' && value.trim() !== '') || typeof value === 'number' ? Number(value) : NaN;

// Share public requests across repeated components and serialize starts to avoid
// flooding a keyless endpoint when the app evaluates many coins/timeframes.
let requestQueue: Promise<unknown> = Promise.resolve();
function request(path: string): Promise<JsonRecord | null> {
  const result = requestQueue.then(async () => {
    try {
      const response = await fetch(`${BASE}/${path}`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) return null;
      const payload = object(await response.json());
      if (!Array.isArray(payload.error) || payload.error.length > 0) return null;
      return object(payload.result);
    } catch { return null; }
  });
  requestQueue = result.then(() => new Promise<void>(resolve => setTimeout(resolve, 100)));
  return result;
}
const cache = new Map<string, { expires: number; value: Promise<unknown> }>();
function memo<T>(key: string, ttl: number, compute: () => Promise<T>): Promise<T> {
  const existing = cache.get(key);
  if (existing && existing.expires > Date.now()) return existing.value as Promise<T>;
  const value = compute();
  cache.set(key, { expires: Date.now() + ttl, value });
  void value.then(result => {
    if (result === null || (result instanceof Map && result.size === 0) || (Array.isArray(result) && result.length === 0)) {
      const entry = cache.get(key);
      if (entry?.value === value) entry.expires = Math.min(entry.expires, Date.now() + 10_000);
    }
  });
  return value;
}

async function pairs(): Promise<Map<string, Pair>> {
  return memo('pairs', 6 * 60 * 60_000, async () => {
    const result = await request('AssetPairs');
    const map = new Map<string, Pair>();
    if (!result) return map;
    for (const [key, raw] of Object.entries(result)) {
      const pair = object(raw);
      if (pair.quote !== 'USDT' || pair.status !== 'online' || typeof pair.altname !== 'string') continue;
      const symbol = pair.altname.replace(/^XBT(?=USDT$)/, 'BTC').replace(/^XDG(?=USDT$)/, 'DOGE');
      if (!TOP_50.some(coin => coin.binanceSymbol === symbol)) continue;
      map.set(symbol, { key, symbol });
    }
    return map;
  });
}

export function parseKrakenCandles(rows: unknown): Candle[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap(raw => {
    if (!Array.isArray(raw) || raw.length < 7) return [];
    const [seconds, open, high, low, close, , volume] = raw.map(number);
    if (![seconds, open, high, low, close, volume].every(Number.isFinite) || seconds <= 0 || open <= 0 || close <= 0 || low <= 0 || high < Math.max(open, close, low) || low > Math.min(open, close) || volume < 0) return [];
    return [{ openTime: seconds * 1000, open, high, low, close, volume, source: 'kraken' as const }];
  }).sort((a, b) => a.openTime - b.openTime);
}

export async function fetchKrakenCandles(symbol: string, interval: string, limit: number): Promise<Candle[] | null> {
  const minutes = INTERVALS[interval];
  if (!minutes || !Number.isFinite(limit) || limit <= 0) return null;
  const pair = (await pairs()).get(symbol);
  if (!pair) return null;
  const candles = await memo(`candles:${pair.key}:${minutes}`, 60_000, async () => {
    const result = await request(`OHLC?pair=${encodeURIComponent(pair.key)}&interval=${minutes}`);
    if (!result) return [];
    const key = Object.keys(result).find(key => key !== 'last' && Array.isArray(result[key]));
    return key ? parseKrakenCandles(result[key]) : [];
  });
  // Kraken retains at most ~720 OHLC entries. Never fabricate the remainder.
  return candles.length > 0 ? candles.slice(-Math.min(Math.floor(limit), 720)) : null;
}

async function price24HoursAgo(pair: Pair): Promise<number | null> {
  return memo(`reference:${pair.key}`, 60_000, async () => {
    const referenceMs = Date.now() - 24 * 60 * 60_000;
    const since = BigInt(Math.floor(referenceMs)) * 1_000_000n;
    const result = await request(`Trades?pair=${encodeURIComponent(pair.key)}&since=${since}&count=1`);
    if (!result) return null;
    const key = Object.keys(result).find(key => key !== 'last' && Array.isArray(result[key]));
    const trades = key ? result[key] : null;
    const trade = Array.isArray(trades) ? trades[0] : null;
    if (!Array.isArray(trade)) return null;
    const price = number(trade[0]);
    const tradeTimeMs = number(trade[2]) * 1000;
    // Sparse pairs without a trade close to the reference time are omitted.
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(tradeTimeMs) || tradeTimeMs < referenceMs - 1000 || tradeTimeMs > referenceMs + 5 * 60_000) return null;
    return price;
  });
}

export async function fetchKrakenTickers(): Promise<Map<string, TickerSnapshot> | null> {
  return memo('tickers', 15_000, async () => {
    const available = await pairs();
    if (available.size === 0) return null;
    const result = await request(`Ticker?pair=${encodeURIComponent([...available.values()].map(p => p.key).join(','))}`);
    if (!result) return null;
    const tickers = new Map<string, TickerSnapshot>();
    await Promise.all([...available.values()].map(async pair => {
      const raw = object(result[pair.key]);
      const last = Array.isArray(raw.c) ? number(raw.c[0]) : NaN;
      const high = Array.isArray(raw.h) ? number(raw.h[1]) : NaN;
      const low = Array.isArray(raw.l) ? number(raw.l[1]) : NaN;
      const volume = Array.isArray(raw.v) ? number(raw.v[1]) : NaN;
      const vwap = Array.isArray(raw.p) ? number(raw.p[1]) : NaN;
      if (![last, high, low, volume, vwap].every(Number.isFinite) || last <= 0 || low <= 0 || high < low || volume < 0 || vwap <= 0) return;
      const reference = await price24HoursAgo(pair);
      if (reference === null) return;
      tickers.set(pair.symbol, { symbol: pair.symbol, binanceSymbol: pair.symbol, price: last,
        priceChangePct: (last / reference - 1) * 100, high, low, volume,
        quoteVolume: volume * vwap, source: 'kraken' });
    }));
    return tickers.size > 0 ? tickers : null;
  });
}
