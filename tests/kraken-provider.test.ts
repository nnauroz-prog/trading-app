import { afterEach, describe, expect, it, vi } from 'vitest';

const pair = (altname: string, quote = 'USDT') => ({ altname, quote, status: 'online' });
const response = (result: unknown) => ({ ok: true, json: async () => ({ error: [], result }) });
const candle = [1700000000, '100', '120', '90', '110', '105', '2', 3];
function mockKraken() {
  const fetch = vi.fn(async (url: string) => {
    if (url.includes('AssetPairs')) return response({ XBTUSDT: pair('XBTUSDT'), XDGUSDT: pair('XDGUSDT'), XBTUSD: pair('XBTUSD', 'ZUSD') });
    if (url.includes('OHLC?')) return response({ XBTUSDT: [candle], last: 1700000000 });
    if (url.includes('Ticker?')) return response({ XBTUSDT: { c: ['110'], h: ['115', '120'], l: ['95', '90'], v: ['1', '2'], p: ['105', '106'], o: '80' }, XDGUSDT: { c: ['0.1'], h: ['0.1', '0.12'], l: ['0.08', '0.08'], v: ['100', '200'], p: ['0.09', '0.095'], o: '0.09' } });
    if (url.includes('Trades?')) return response({ trades: [[url.includes('XDG') ? '0.08' : '100', '1', (Date.now() - 86400000) / 1000]], last: 'id' });
    return { ok: false, json: async () => ({}) };
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe('independent Kraken USDT provider', () => {
  it('maps aliases and uses genuine USDT quotes with true 24h reference trades', async () => {
    const fetch = mockKraken();
    const { fetchKrakenTickers } = await import('@/lib/providers/kraken');
    const result = await fetchKrakenTickers();
    expect(result?.get('BTCUSDT')).toMatchObject({ source: 'kraken', price: 110, quoteVolume: 212 });
    expect(result?.get('BTCUSDT')?.priceChangePct).toBeCloseTo(10);
    expect(result?.get('DOGEUSDT')?.price).toBe(0.1);
    expect(result?.has('BTCUSD')).toBe(false);
    expect(fetch.mock.calls.some(([url]) => url.includes('Trades?'))).toBe(true);
  });
  it('shares ticker and reference requests across repeated component calls', async () => {
    const fetch = mockKraken();
    const { fetchKrakenTickers } = await import('@/lib/providers/kraken');
    const [a, b] = await Promise.all([fetchKrakenTickers(), fetchKrakenTickers()]);
    expect(a).toBe(b);
    expect(fetch.mock.calls.filter(([url]) => url.includes('Ticker?'))).toHaveLength(1);
    expect(fetch.mock.calls.filter(([url]) => url.includes('Trades?'))).toHaveLength(2);
  });
  it('preserves native intervals, milliseconds, provenance and actual history length', async () => {
    const fetch = mockKraken();
    const { fetchKrakenCandles } = await import('@/lib/providers/kraken');
    const result = await fetchKrakenCandles('BTCUSDT', '4h', 1000);
    expect(result).toHaveLength(1);
    expect(result?.[0]).toMatchObject({ openTime: 1700000000000, open: 100, close: 110, source: 'kraken', volume: 2 });
    expect(fetch.mock.calls.some(([url]) => url.includes('interval=240'))).toBe(true);
    await fetchKrakenCandles('BTCUSDT', '4h', 100);
    expect(fetch.mock.calls.filter(([url]) => url.includes('OHLC?'))).toHaveLength(1);
  });
  it('does not substitute different intervals or different quote currencies', async () => {
    const fetch = mockKraken();
    const { fetchKrakenCandles } = await import('@/lib/providers/kraken');
    expect(await fetchKrakenCandles('BTCUSDT', '2h', 100)).toBeNull();
    expect(await fetchKrakenCandles('PEPEUSDT', '1h', 100)).toBeNull();
    expect(fetch.mock.calls.some(([url]) => url.includes('OHLC?'))).toBe(false);
  });
  it('filters malformed price candles rather than emitting NaN signals', async () => {
    const { parseKrakenCandles } = await import('@/lib/providers/kraken');
    expect(parseKrakenCandles([candle, [1700000001, 'bad', '120', '90', '110', '105', '2']])).toHaveLength(1);
    expect(parseKrakenCandles(null)).toEqual([]);
  });
  it('returns unavailable when Kraken reports a provider error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ error: ['EGeneral:Rate limit exceeded'] }) })));
    const { fetchKrakenTickers } = await import('@/lib/providers/kraken');
    expect(await fetchKrakenTickers()).toBeNull();
  });
  it('uses Kraken after Binance and Bybit both reject access', async () => {
    const krakenFetch = mockKraken();
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('api.kraken.com') ? krakenFetch(url) : { ok: false }));
    const { fetchAllTickers } = await import('@/lib/providers/binance-tickers');
    const { fetchKlinesBySymbol } = await import('@/lib/providers/binance');
    expect((await fetchAllTickers())?.get('BTCUSDT')?.source).toBe('kraken');
    expect((await fetchKlinesBySymbol('BTCUSDT', '1h', 100))?.[0].source).toBe('kraken');
  });
});
