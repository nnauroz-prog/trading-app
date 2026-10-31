import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchFundMarketData, FUND_MARKET_DATA_URL, parseYahooFundMarketHtml } from '@/lib/finance/fund-market-data';
import { analyzeFundPurchase } from '@/lib/finance/fund-purchase-analysis';
import { fetchYahooHistory } from '@/lib/market/yahoo-history';
import { fetchYahooQuote } from '@/lib/market/yahoo-quote';

vi.mock('@/lib/market/yahoo-quote', () => ({ fetchYahooQuote: vi.fn() }));
vi.mock('@/lib/market/yahoo-history', () => ({ fetchYahooHistory: vi.fn() }));

const NOW = Date.UTC(2026, 9, 31, 12);
const CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/VWCE.DE?interval=1d&range=1y';
const QUOTE_URL = 'https://query1.finance.yahoo.com/v10/finance/quoteSummary/VWCE.DE?modules=price';

// Reduced real Yahoo history-page JSON fetched 31 October 2026 from
// https://finance.yahoo.com/quote/VWCE.DE/history/. Prices and times retain
// the source's raw values; intermediate daily rows are omitted from this fixture.
function price() {
  return {
    symbol: 'VWCE.DE', currency: 'EUR', exchangeName: 'XETRA', marketState: 'CLOSED',
    longName: 'Vanguard FTSE All-World UCITS ETF USD Accumulation',
    regularMarketPrice: { raw: 168.9, fmt: '168.90' },
    regularMarketPreviousClose: { raw: 171.44, fmt: '171.44' },
    regularMarketTime: 1793378164,
  };
}

function chart() {
  return {
    meta: { symbol: 'VWCE.DE', currency: 'EUR', fullExchangeName: 'XETRA', range: '1y', dataGranularity: '1d' },
    timestamp: [1761811200, 1761897600, 1793260800, 1793347200],
    indicators: { quote: [{
      open: [145.63999938964844, 145.83999633789062, 171.36000061035156, 169.47999572753906],
      high: [145.8800048828125, 146.10000610351562, 172.36000061035156, 169.9199981689453],
      low: [145.05999755859375, 145.27999877929688, 171.3000030517578, 168.6199951171875],
      close: [145.66000366210938, 145.5399932861328, 171.44000244140625, 168.89999389648438],
      volume: [155537, 118618, 218467, 384280],
    }] },
  };
}

function script(url: string, body: unknown, status = 200) {
  return `<script type="application/json" data-sveltekit-fetched data-url="${url.replaceAll('&', '&amp;')}">${JSON.stringify({ status, body: JSON.stringify(body) })}</script>`;
}

function fixture() {
  return script(QUOTE_URL, { quoteSummary: { result: [{ price: price() }], error: null } })
    + script(CHART_URL, { chart: { result: [chart()], error: null } });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchYahooQuote).mockResolvedValue(null);
  vi.mocked(fetchYahooHistory).mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('scoped Yahoo fund-page parser', () => {
  it('preserves the verified EUR market price, market timestamp, and actual daily candles', () => {
    const result = parseYahooFundMarketHtml(fixture());
    expect(result.quote).toMatchObject({ symbol: 'VWCE.DE', last: 168.9, previousClose: 171.44, currency: 'EUR', ts: 1793378164000, source: 'yahoo' });
    expect(result.history?.candles).toHaveLength(4);
    expect(result.history?.candles[0].time).toBe(1761811200000);
    expect(result.history?.candles[3].close).toBe(168.89999389648438);
    const purchase = analyzeFundPurchase({ budget: 800, ongoingChargePct: 0.14, ...result, now: NOW });
    expect(purchase.wholeUnits).toBe(4);
    expect(purchase.estimatedUnitsCost).toBe(675.6);
    expect(purchase.remainder).toBe(124.4);
    expect(purchase.history.asOf).toBe(1793347200000);
  });

  it('ignores unrelated sidebar instruments even when their JSON appears first', () => {
    const unrelated = script(QUOTE_URL.replace('VWCE.DE', 'SPY'), { quoteSummary: { result: [{ price: { ...price(), symbol: 'SPY', regularMarketPrice: { raw: 999 } } }] } });
    const result = parseYahooFundMarketHtml(unrelated + fixture());
    expect(result.quote?.last).toBe(168.9);
    expect(result.history?.currency).toBe('EUR');
  });

  it.each(['USD', '', 'eur'])('rejects a scoped quote and chart whose declared currency is %s', (currency) => {
    const chartValue = chart();
    chartValue.meta.currency = currency;
    const html = script(QUOTE_URL, { quoteSummary: { result: [{ price: { ...price(), currency } }] } })
      + script(CHART_URL, { chart: { result: [chartValue] } });
    expect(parseYahooFundMarketHtml(html)).toEqual({ quote: null, history: null });
  });

  it('requires the symbol inside both envelopes to match the requested fund', () => {
    const chartValue = chart();
    chartValue.meta.symbol = 'SPY';
    const html = script(QUOTE_URL, { quoteSummary: { result: [{ price: { ...price(), symbol: 'SPY' } }] } })
      + script(CHART_URL, { chart: { result: [chartValue] } });
    expect(parseYahooFundMarketHtml(html)).toEqual({ quote: null, history: null });
  });

  it.each([
    'https://example.com/v10/finance/quoteSummary/VWCE.DE',
    'http://query1.finance.yahoo.com/v10/finance/quoteSummary/VWCE.DE',
    'https://query1.finance.yahoo.com/v10/finance/quoteSummary/VWCE.DE.FAKE',
  ])('does not accept an unrecognized quote source URL: %s', (url) => {
    expect(parseYahooFundMarketHtml(script(url, { quoteSummary: { result: [{ price: price() }] } })).quote).toBeNull();
  });

  it.each(['interval=5m&range=1y', 'interval=1d&range=1d'])('does not label other chart intervals/ranges as daily one-year history: %s', (parameters) => {
    const url = CHART_URL.replace('interval=1d&range=1y', parameters);
    expect(parseYahooFundMarketHtml(script(url, { chart: { result: [chart()] } })).history).toBeNull();
  });

  it('rejects missing or invalid market timestamps rather than using retrieval time', () => {
    for (const regularMarketTime of [undefined, null, 0, -1, '1793378164']) {
      const html = script(QUOTE_URL, { quoteSummary: { result: [{ price: { ...price(), regularMarketTime } }] } });
      expect(parseYahooFundMarketHtml(html).quote).toBeNull();
    }
  });

  it('keeps a valid price but leaves an unknown previous close unavailable', () => {
    const html = script(QUOTE_URL, { quoteSummary: { result: [{ price: { ...price(), regularMarketPreviousClose: {} } }] } });
    const result = parseYahooFundMarketHtml(html);
    expect(result.quote?.last).toBe(168.9);
    expect(Number.isNaN(result.quote?.previousClose)).toBe(true);
    const purchase = analyzeFundPurchase({ budget: 800, ongoingChargePct: 0.14, ...result, now: NOW });
    expect(purchase.wholeUnits).toBe(4);
    expect(purchase.lastSessionChangePct).toBeNull();
  });

  it('skips missing or invalid candle values instead of filling observations', () => {
    const chartValue = chart();
    chartValue.indicators.quote[0].close[1] = -1;
    chartValue.timestamp[2] = 0;
    const result = parseYahooFundMarketHtml(script(CHART_URL, { chart: { result: [chartValue] } }));
    expect(result.history?.candles.map(point => point.time)).toEqual([1761811200000, 1793347200000]);
  });

  it('returns unavailable for consent markup, malformed JSON, API errors, or oversized HTML', () => {
    expect(parseYahooFundMarketHtml('<html>Consent required</html>')).toEqual({ quote: null, history: null });
    expect(parseYahooFundMarketHtml(`<script type="application/json" data-sveltekit-fetched data-url="${QUOTE_URL}">invalid</script>`).quote).toBeNull();
    expect(parseYahooFundMarketHtml(script(QUOTE_URL, { quoteSummary: { result: [{ price: price() }] } }, 429)).quote).toBeNull();
    expect(parseYahooFundMarketHtml(script(QUOTE_URL, { quoteSummary: { result: [{ price: price() }], error: { code: 'Unauthorized' } } })).quote).toBeNull();
    expect(parseYahooFundMarketHtml('x'.repeat(2 * 1024 * 1024 + 1) + fixture())).toEqual({ quote: null, history: null });
  });
});

describe('fund market-data fallback', () => {
  it('uses both valid existing providers without another page request', async () => {
    const primary = parseYahooFundMarketHtml(fixture());
    vi.mocked(fetchYahooQuote).mockResolvedValue(primary.quote);
    vi.mocked(fetchYahooHistory).mockResolvedValue(primary.history);
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const result = await fetchFundMarketData(NOW);
    expect(result.quote).toBe(primary.quote);
    expect(result.history).toBe(primary.history);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('obtains both EUR price and history from one page when API providers fail', async () => {
    vi.mocked(fetchYahooQuote).mockRejectedValue(new Error('provider unavailable'));
    const fetcher = vi.fn().mockResolvedValue(new Response(fixture()));
    vi.stubGlobal('fetch', fetcher);
    const result = await fetchFundMarketData(NOW);
    expect(result.quote?.last).toBe(168.9);
    expect(result.history?.candles).toHaveLength(4);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(FUND_MARKET_DATA_URL, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('replaces a stale primary quote while preserving valid primary history', async () => {
    const primary = parseYahooFundMarketHtml(fixture());
    vi.mocked(fetchYahooQuote).mockResolvedValue({ ...primary.quote!, ts: NOW - 5 * 86_400_000 });
    vi.mocked(fetchYahooHistory).mockResolvedValue(primary.history);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(fixture())));
    const result = await fetchFundMarketData(NOW);
    expect(result.quote?.ts).toBe(1793378164000);
    expect(result.history).toBe(primary.history);
  });

  it('does not pass through a future or stale fallback quote', async () => {
    for (const regularMarketTime of [(NOW + 600_000) / 1000, (NOW - 5 * 86_400_000) / 1000]) {
      const html = script(QUOTE_URL, { quoteSummary: { result: [{ price: { ...price(), regularMarketTime } }] } });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(html)));
      expect((await fetchFundMarketData(NOW)).quote).toBeNull();
    }
  });

  it.each(['declared-size', 'stream-size'])('rejects an oversized page using %s checks', async (method) => {
    const response = method === 'declared-size'
      ? new Response(fixture(), { headers: { 'content-length': String(2 * 1024 * 1024 + 1) } })
      : new Response('x'.repeat(2 * 1024 * 1024 + 1));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    expect(await fetchFundMarketData(NOW)).toEqual({ quote: null, history: null });
  });

  it('returns unavailable after the bounded page-fetch timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    })));
    const pending = fetchFundMarketData(NOW);
    await vi.advanceTimersByTimeAsync(6000);
    expect(await pending).toEqual({ quote: null, history: null });
  });

  it('returns unavailable when the fallback page also fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('rate limited', { status: 429 })));
    expect(await fetchFundMarketData(NOW)).toEqual({ quote: null, history: null });
  });
});
