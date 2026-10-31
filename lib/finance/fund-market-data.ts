import { fetchYahooHistory, type PriceCandle, type PriceHistory } from '@/lib/market/yahoo-history';
import { fetchYahooQuote, type MarketQuote } from '@/lib/market/yahoo-quote';
import { analyzeFundPurchase, FUND_PURCHASE_SYMBOL } from '@/lib/finance/fund-purchase-analysis';

export const FUND_MARKET_DATA_URL = 'https://finance.yahoo.com/quote/VWCE.DE/history/';
const FUND_NAME = 'Vanguard FTSE All-World UCITS ETF USD Accumulation';
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 6000;

export interface FundMarketData {
  quote: MarketQuote | null;
  history: PriceHistory | null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function rawNumber(value: unknown): number | null {
  const raw = typeof value === 'number' ? value : record(value)?.raw;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

function quoteFromPrice(value: unknown): MarketQuote | null {
  const price = record(value);
  if (!price || price.symbol !== FUND_PURCHASE_SYMBOL || price.currency !== 'EUR') return null;
  const last = rawNumber(price.regularMarketPrice);
  const seconds = rawNumber(price.regularMarketTime);
  if (last === null || last <= 0 || seconds === null || seconds <= 0 || !Number.isFinite(new Date(seconds * 1000).getTime())) return null;
  const previousClose = rawNumber(price.regularMarketPreviousClose);
  const previous = previousClose !== null && previousClose > 0 ? previousClose : NaN;
  return {
    symbol: FUND_PURCHASE_SYMBOL,
    name: typeof price.longName === 'string' ? price.longName : FUND_NAME,
    last,
    previousClose: previous,
    changeAbs: last - previous,
    changePct: Number.isFinite(previous) ? (last / previous - 1) * 100 : NaN,
    currency: 'EUR',
    marketState: typeof price.marketState === 'string' ? price.marketState : 'UNKNOWN',
    // The source supplies seconds since epoch; retrieval time is never substituted.
    ts: seconds * 1000,
    source: 'yahoo',
  };
}

function historyFromChart(value: unknown): PriceHistory | null {
  const result = record(value);
  const meta = record(result?.meta);
  if (!result || meta?.symbol !== FUND_PURCHASE_SYMBOL || meta.currency !== 'EUR') return null;
  if (!Array.isArray(result.timestamp)) return null;
  const indicators = record(result.indicators);
  const quoteArray = indicators?.quote;
  const prices = Array.isArray(quoteArray) ? record(quoteArray[0]) : null;
  if (!prices) return null;
  const field = (name: string, index: number): number | null => {
    const values = prices[name];
    return Array.isArray(values) ? rawNumber(values[index]) : null;
  };
  const candles: PriceCandle[] = [];
  for (let index = 0; index < result.timestamp.length; index++) {
    const seconds = rawNumber(result.timestamp[index]);
    const open = field('open', index);
    const high = field('high', index);
    const low = field('low', index);
    const close = field('close', index);
    if (seconds === null || seconds <= 0 || !Number.isFinite(new Date(seconds * 1000).getTime())) continue;
    if (open === null || open <= 0 || high === null || high <= 0 || low === null || low <= 0 || close === null || close <= 0) continue;
    const volume = field('volume', index);
    candles.push({ time: seconds * 1000, open, high, low, close, volume: volume !== null && volume >= 0 ? volume : NaN });
  }
  return candles.length ? { symbol: FUND_PURCHASE_SYMBOL, currency: 'EUR', candles } : null;
}

/**
 * Yahoo's public history page embeds the same chart and quote-summary JSON that
 * its own page uses. Read only exact VWCE.DE API envelopes, never sidebar quotes
 * or formatted page text. A markup/schema change produces unavailable data.
 */
export function parseYahooFundMarketHtml(html: string): FundMarketData {
  const output: FundMarketData = { quote: null, history: null };
  if (html.length > MAX_HTML_BYTES) return output;
  const scripts = html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi);
  for (const script of scripts) {
    const attributes = script[1];
    if (!/\btype\s*=\s*["']application\/json["']/i.test(attributes) || !/\bdata-sveltekit-fetched\b/i.test(attributes)) continue;
    const dataUrl = attributes.match(/\bdata-url\s*=\s*(["'])(.*?)\1/i)?.[2];
    if (!dataUrl) continue;
    let url: URL;
    try {
      url = new URL(dataUrl.replaceAll('&amp;', '&'));
    } catch {
      continue;
    }
    if (url.protocol !== 'https:' || !['query1.finance.yahoo.com', 'query2.finance.yahoo.com'].includes(url.hostname)) continue;
    const isQuote = url.pathname === `/v10/finance/quoteSummary/${FUND_PURCHASE_SYMBOL}`;
    const isHistory = url.pathname === `/v8/finance/chart/${FUND_PURCHASE_SYMBOL}`
      && url.searchParams.get('interval') === '1d' && url.searchParams.get('range') === '1y';
    if (!isQuote && !isHistory) continue;
    try {
      const envelope = record(JSON.parse(script[2]));
      if (envelope?.status !== 200 || typeof envelope.body !== 'string') continue;
      const body = record(JSON.parse(envelope.body));
      if (isQuote) {
        const summary = record(body?.quoteSummary);
        if (!summary || summary.error || !Array.isArray(summary.result)) continue;
        for (const result of summary.result) {
          output.quote ??= quoteFromPrice(record(result)?.price);
        }
      }
      if (isHistory) {
        const chart = record(body?.chart);
        if (!chart || chart.error || !Array.isArray(chart.result)) continue;
        for (const result of chart.result) {
          output.history ??= historyFromChart(result);
        }
      }
    } catch {
      // Consent pages, schema changes, and malformed data remain unavailable.
    }
  }
  return output;
}

async function fetchYahooFundPage(): Promise<FundMarketData> {
  const unavailable: FundMarketData = { quote: null, history: null };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(FUND_MARKET_DATA_URL, {
      next: { revalidate: 300 },
      headers: { 'User-Agent': 'Mozilla/5.0 (TradingApp Desktop) AppleWebKit/537.36', Accept: 'text/html' },
      signal: controller.signal,
    });
    if (!response.ok || !response.body) return unavailable;
    const contentLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_HTML_BYTES) {
      await response.body.cancel();
      return unavailable;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let bytes = 0;
    let html = '';
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_HTML_BYTES) {
        await reader.cancel();
        return unavailable;
      }
      html += decoder.decode(chunk.value, { stream: true });
    }
    html += decoder.decode();
    return parseYahooFundMarketHtml(html);
  } catch {
    return unavailable;
  } finally {
    clearTimeout(timer);
  }
}

/** Existing providers first, then one bounded public Yahoo page for missing data. */
export async function fetchFundMarketData(now = Date.now()): Promise<FundMarketData> {
  const settled = await Promise.allSettled([
    fetchYahooQuote(FUND_PURCHASE_SYMBOL, FUND_NAME),
    fetchYahooHistory(FUND_PURCHASE_SYMBOL),
  ]);
  const quote = settled[0].status === 'fulfilled' ? settled[0].value : null;
  const history = settled[1].status === 'fulfilled' ? settled[1].value : null;
  const primary = analyzeFundPurchase({ budget: 0, ongoingChargePct: 0, quote, history, now });
  if (primary.quoteUsable && primary.history.usable) return { quote, history };
  const fallback = await fetchYahooFundPage();
  const checked = analyzeFundPurchase({ budget: 0, ongoingChargePct: 0, ...fallback, now });
  return {
    quote: primary.quoteUsable ? quote : checked.quoteUsable ? fallback.quote : null,
    history: primary.history.usable ? history : checked.history.usable ? fallback.history : null,
  };
}
